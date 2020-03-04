# idea_generator

A slack bot for generating ideas - adds three cards to the channel.

It uses a public trello for the cards and downloads and processes them into images at the start (a 
csv file could be used instead)

## Get a bot ID

From https://my.slack.com/services/new/bot

## Bot installation 

on Mac os X

```brew install nvm
nvm install 8.16.0
nvm use 8.16.0
npm install
```

on Ubuntu

```sudo apt-get update
sudo apt-get install build-essential libssl-dev

curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh -o install_nvm.sh

bash install_nvm.sh

source ~/.profile
```

```
nvm install 8.16.0
nvm use 8.16.0
npm install
```

## Running it

    you can use `ideabot.service`

    SLACK_API_TOKEN="yourkey" idea_slackbot_from_trello.js col_name1 col_name2 col_name3

Then from within slack, invite it to a channel and then mention it

```/invite @idea_generator```

```hello @idea_generator```

## Using it

```say 'bot cards' to start, then you can say 'bot user', 'bot weird', 'bot nicer', 'bot reload'```

(these are hardcoded to particular columns)

## Links

slack official node client: https://github.com/slackhq/node-slack-client

https://github.com/libbymiller/hackspace_inventing_slackbot

https://github.com/libbymiller/inventotron-3000


