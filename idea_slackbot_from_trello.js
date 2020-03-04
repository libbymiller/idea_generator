let RTMClient = require('@slack/client').RTMClient;
let MemoryDataStore = require('@slack/client').MemoryDataStore;
let RTM_EVENTS = require('@slack/client').RTM_EVENTS;
let RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
let WebClient = require('@slack/client').WebClient;
let querystring = require("querystring");
let fs = require('fs');
let path = require('path');
let sys = require('sys')
let exec = require('child_process').exec;
let child;
const sharp = require('sharp');
const { registerFont, createCanvas } = require('canvas');

let token = process.env.SLACK_API_TOKEN || '';
let bot;

let trello_json_url = ""; //something like https://trello.com/b/nnnnn.json" (needs to be public)
let output_dir = "_output";
let prefix = "idea_";

const request = require('sync-request');

let slack = new RTMClient(token);
let web = new WebClient(token);

// pass three arguments for the trello lists to use e.g. "data source" "user need" "general data source"
// else stop

if (process.argv.length < 4) {
  console.log("usage: node idea_slackbot_from_trello.js col_name1 col_name2 col_name3");
  process.exit()
}

// random int utility method

function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// utility method for sending an image to a channel using sharp

function send_single_image(image_file, text, message) {

  sharp(image_file)
    .resize({ width: 200 })
    .toFile('output.png')
    // 100 pixels wide, auto-scaled height
    .then(function () {

      let command = 'curl -F file=@output.png -F channels=' + message.channel + ' -F token=' + token + ' https://slack.com/api/files.upload';
      console.log(command);

      child = exec(command, function (error, stdout, stderr) {
        if (error !== null) {
          console.log('exec error: ' + error);
        } else {
          slack.sendTyping(message.channel);
          slack.sendMessage(text, message.channel);
        }
      });

    });

}

// canvas text wrap

// get the trello data and sort it out

let trello_url = "https://trello.com/b/mq64YZDi.json";

let ua = "Mozilla/5.0 (X11; Linux i686; rv:10.0) Gecko/20100101 Firefox/10.0";

let cards_by_id = {};
let lists_by_name = {};

function get_trello_data() {

  // reset everything
  cards_by_id = {};
  lists_by_name = {};

  let res = request('GET', trello_url, {
    headers: {
      'user-agent': ua,
    },
  });

  let data = JSON.parse(res.getBody('utf8'));

  let lists = data["lists"];
  let cards = data["cards"];

  for (let i = 0; i < cards.length; i++) {
    let card_list_id = cards[i]["idList"];
    if (!cards_by_id[card_list_id]) {
      cards_by_id[card_list_id] = [];
    }
    cards_by_id[card_list_id].push(cards[i]["name"]);
  }

  for (let i = 0; i < lists.length; i++) {
    if (lists[i]["closed"] == false) {
      let list_name = lists[i]["name"]
      list_name = list_name.split(' ').join('_').toLowerCase();
      lists_by_name[list_name] = lists[i]["id"];
    }
  }
  console.log("got trello data");
}


const deleteFolderContents = function (directory_path) {
  if (fs.existsSync(directory_path)) {
    fs.readdirSync(directory_path).forEach(function (file, index) {
      let currentPath = path.join(directory_path, file);
      fs.unlinkSync(currentPath); // delete file
    });
  }
};

// save the images locally

function save_images() {

  let colours = ["#e2d7fa", "#faeed7", "#effad7", "#fad7ef", "#fadad7", "#f7eade", "#fffac6", "#e0ffdb", "#d1fff5", "#e9daff"];

  deleteFolderContents(output_dir);

  console.log("deleted folders");

  for (let list_name in lists_by_name) {
    let colour = colours[getRandomIntInclusive(0, colours.length - 1)];
    let list_id = lists_by_name[list_name];
    let list_length = cards_by_id[list_id].length;

    console.log(list_name + " " + list_length);

    for (let i = 0; i < list_length; i++) {
      let text = cards_by_id[list_id][i];

      let filename = output_dir + "/" + prefix + "" + list_name + "_" + i + ".png";
      console.log("colour " + colour + " list " + list_name + " card " + text + " filename " + filename);
      const canvas = createCanvas(1000, 696);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.textAlign = "center";

      //coudl be better! https://sourcoder.blogspot.com/2012/12/text-wrapping-in-html-canvas.html
      if (text.length > 13) {
        text = text.replace(/(.{13}[^ ]* )/g, "$1\n");
      }

      let lines = text.split('\n');
      let x = canvas.width / 2;
      let y = canvas.height / (lines.length === 2 || lines.length === 1 ? 2 : lines.length === 3 ? 2.5 : 2.75);
      ctx.font = '80px sans-serif';
      for (let i = 0; i < lines.length; i++) {
        const textMetrics = ctx.measureText(lines[i]);
        ctx.fillText(lines[i], x, y);
        y = y + (textMetrics.emHeightAscent + textMetrics.emHeightDescent);
      }
      fs.writeFileSync(filename, canvas.toBuffer());
    }
  }

}

get_trello_data();
save_images();

slack.start();

slack.on('authenticated', function (data) {
  bot = data.self;
  console.log("Logged in as " + bot.name
    + " of " + data.team.name + ", but not yet connected");
});

slack.on('ready', function () {
  console.log('Connected');
});


slack.on('message', (message) => {
  console.log('message', message);
  // Structure of `event`: <https://api.slack.com/events/message>

  try {
    if (message.user == bot.id) return; // Ignore bot's own messages

    let channel = message.channel;
    let user = message.user;

    // don't answer messages that don't include 'bot' 
    if (message.text && (message.text.match("bot"))) {

      let m_text = message.text.replace(/[\.\,\/#!$%\^&\*;:{}=\-`~\(\)\?\"\'\“\@\<\>]/g, " ").toLowerCase();

      let col1_name = process.argv[2].split(' ').join('_').toLowerCase();
      let col2_name = process.argv[3].split(' ').join('_').toLowerCase();
      let col3_name = process.argv[4].split(' ').join('_').toLowerCase();

      console.log("lists_by_name");
      console.log(lists_by_name);
      console.log(col1_name + " " + col2_name + " " + col3_name);

      let col1_length = cards_by_id[lists_by_name[col1_name]].length - 1;
      let col2_length = cards_by_id[lists_by_name[col2_name]].length - 1;
      let col3_length = cards_by_id[lists_by_name[col3_name]].length - 1;

      let file1_int = getRandomIntInclusive(0, col1_length);
      let file2_int = getRandomIntInclusive(0, col2_length);
      let file3_int = getRandomIntInclusive(0, col3_length);

      let file1 = output_dir + "/" + prefix + "" + col1_name + "_" + file1_int + ".png";
      let file2 = output_dir + "/" + prefix + "" + col2_name + "_" + file2_int + ".png";
      let file3 = output_dir + "/" + prefix + "" + col3_name + "_" + file3_int + ".png";

      // get three cards in the order specificed when the bot ran

      if (m_text && m_text.match("cards")) {

        console.log("ok");
        slack.sendTyping(message.channel);

        let file = "random_3_cards.jpg";

        sharp({
          create: {
            width: 3000,
            height: 696,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 0.5 }
          }
        })
          .composite([{ input: file1, gravity: 'west' },{ input: file2, gravity: 'center' },{ input: file3, gravity: 'east' }])
          .toFile(file)
          .then(function () {
            let command = 'curl -F file=@' + file + ' -F channels=' + message.channel + ' -F token=' + token + ' https://slack.com/api/files.upload';
            console.log(command);

            child = exec(command, function (error, stdout, stderr) {
              if (error !== null) {
                console.log('exec error: ' + error);
              } else {
                slack.sendTyping(channel);
                slack.sendMessage('What could this be? ^^^', channel);

              }
            });
          });

      } else {

        if (m_text && m_text.match("user")) {
          //user need card
          console.log("user text match");

          slack.sendTyping(message.channel);

          let col_name = "user_need"; //hard coded
          let col_length = cards_by_id[lists_by_name[col_name]].length - 1;
          let file_int = getRandomIntInclusive(0, col_length);
          let file = output_dir + "/" + prefix + "" + col_name + "_" + file_int + ".png";
          send_single_image(file, "Think about the user need above?", message);

        } else if (m_text && m_text.match("weird")) {

          console.log("weird text match");
          slack.sendTyping(message.channel);

          let col_name = "weird_things_up"; // hardcoded
          let col_length = cards_by_id[lists_by_name[col_name]].length - 1;
          let file_int = getRandomIntInclusive(0, col_length);
          let file = output_dir + "/" + prefix + "" + col_name + "_" + file_int + ".png";
          send_single_image(file, "Make it weirder like this ^^^", message);

        } else if (m_text && m_text.match("nicer")) {

          console.log("nicer text match");
          slack.sendTyping(message.channel);
          let col_name = "positive"; // hardcoded
          let col_length = cards_by_id[lists_by_name[col_name]].length - 1;
          let file_int = getRandomIntInclusive(0, col_length);
          let file = output_dir + "/" + prefix + "" + col_name + "_" + file_int + ".png";
          send_single_image(file, "No dystopias please!", message);

        } else if (m_text && m_text.match("reload")) {
          let text = "reloading from trello!"
          slack.sendTyping(message.channel);
          get_trello_data();
          save_images();
          slack.sendMessage(text, message.channel);

        } else if (m_text && m_text.match("help")) {
          let text = "say 'bot user' to start with a user need, then 'bot cards' for a data source and an analogy. You can say 'bot weird', 'bot nicer', 'bot reload' (reload cards from trello)";
          slack.sendMessage(text, message.channel);

        } else {
          console.log("no text match");
        }
      }
    }
  } catch (err) {
    console.log(err);
  }

})



