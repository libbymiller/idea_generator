# idea_generator

A slack bot for generating ideas - adds three cards to the channel - an 
example is described here: 
https://www.bbc.co.uk/rd/blog/2019-10-ideas-generation-slack-slackbot

It uses a public trello for the cards and downloads and processes them 
into images at the start (a csv file could be used instead)

## Get a bot ID

From https://my.slack.com/services/new/bot

## Bot installation 

Use a recent version of node - https://nodejs.org/en/

```
npm install
```

## Running it

    you can use `ideabot.service` with systemd

    SLACK_API_TOKEN="yourkey" idea_slackbot_from_trello.js col_name1 col_name2 col_name3

Then from within slack, invite it to a channel and then mention it

```/invite @idea_generator```

```hello @idea_generator```

## Using it

```say 'bot cards' to start, then you can say 'bot user', 'bot weird', 'bot nicer', 'bot reload'```

(these are hardcoded to particular columns)

## Links

Slack official node client: https://github.com/slackhq/node-slack-client

https://github.com/libbymiller/hackspace_inventing_slackbot

https://github.com/libbymiller/inventotron-3000


