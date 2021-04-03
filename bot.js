import Discord from 'discord.js';
import _ from 'lodash';
import inquirer from 'inquirer';

import { log, info, warn } from './log.js';
import responseRegistry from './responses.js';
import { isCommand, doCommand } from './command.js';
import { mention } from './util.js';

let DiscordClient;

export async function getClient() {
  log('Getting the mainClient');
  if (DiscordClient) {
    log('Client already created');
    return DiscordClient;
  }

  if (!process.env.TOKEN) {
    warn('There is no TOKEN defined in .env');
  }

  DiscordClient = new Discord.Client();
  info('Logging in...');
  await DiscordClient.login(process.env.TOKEN);
  info('Logged in');
  return DiscordClient;
}

export async function getMessages(channelId, messageId, backward = false, handler = (a) => a) {
  const client = await getClient();
  const channel = await client.channels.fetch(channelId);

  info(`Downloading messages ${backward ? 'before' : 'after'} ${messageId ?? '[idk lmao]'}`);
  let messageHistory;
  let edgeMessage;
  const searchQuery = {
    limit: 100,
  };
  if (messageId) {
    searchQuery[backward ? 'before' : 'after'] = messageId;
  }
  while (!messageHistory || messageHistory.length > 0) {
    info(`Downloading messages ${backward ? 'before' : 'after'} ${searchQuery[backward ? 'before' : 'after']}`);
    messageHistory = Array.from(
      await channel.messages.fetch(searchQuery), // eslint-disable-line no-await-in-loop
    ).map((message) => message[1]);
    await handler(messageHistory);// eslint-disable-line no-await-in-loop
    if (messageHistory.length === 0) {
      info(`Finished getting message history ${backward ? 'before' : 'after'}`);
      return;
    }

    if (backward) {
      edgeMessage = _.minBy(messageHistory, 'id');
    } else {
      edgeMessage = _.maxBy(messageHistory, 'id');
    }
    searchQuery[backward ? 'before' : 'after'] = edgeMessage.id;
  }
}

const sentResponses = {
  responses: [],
  push(message) {
    if (!message) return;
    this.responses.push(message);
    this.responses = this.responses.slice(0, 10);
    log(`Added ${message} to sentResponses`);
  },
  includes(message) {
    return this.responses.includes(message);
  },
};

async function getResponse(message) {
  log(`Finding a response for ${message.content}`);

  if (isCommand(message.content)) {
    return doCommand(message.content);
  }

  const responses = await Promise.all(
    responseRegistry.map((response) => response.responder(message.content)),
  );
  const selectedResponse = _.sample(responses.filter((response) => (
    !!response && !sentResponses.includes(response)
  )));
  sentResponses.push(selectedResponse);
  return selectedResponse;
}

export async function startFake() {
  log('Starting a fake bot');
  const prompt = inquirer.createPromptModule();
  let input;
  let response;
  while (!input || input.content !== 'exit') {
    input = await prompt({ // eslint-disable-line no-await-in-loop
      type: 'input',
      name: 'content',
      message: '>',
    });

    if (input.content) {
      input.content = input.content.replace(/^at/, mention());
      response = await getResponse(input); // eslint-disable-line no-await-in-loop
      if (response) {
        info(response);
      }
    }
  }
}

export async function startBot() {
  log('Starting a real bot');
  let response;
  let lastChannel;
  const discordClient = await getClient();
  const prompt = inquirer.createPromptModule();
  discordClient.on('message', async (message) => {
    lastChannel = message.channel;
    if (message.content) {
      response = await getResponse(message);
      if (response) {
        message.channel.send(response);
      }
    }
  });

  let input;
  while (!input || input.message !== 'exit') {
    input = await prompt({ // eslint-disable-line no-await-in-loop
      type: 'input',
      name: 'message',
      message: '>',
    });

    if (input.message) {
      lastChannel.send(input.message);
    }
  }
  return new Promise();
}

export default getClient;
