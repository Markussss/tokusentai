import Discord from 'discord.js';
import _ from 'lodash';

import { log, info } from './log.js';

let client;

export async function getClient() {
  log('Get the client...');
  if (client) {
    return client;
  }

  client = new Discord.Client();
  info('Logging client in');
  await client.login(process.env.TOKEN);
  info('Logged in');
  return client;
}

export async function getMessages(channelId, messageId, backward = false, handler = (a) => a) {
  await getClient();
  const channel = await client.channels.fetch(channelId);

  log(`Downloading messages ${backward ? 'before' : 'after'} ${messageId}`);
  let messageHistory;
  let edgeMessage;
  const searchQuery = {
    limit: 100,
  };
  if (messageId) {
    searchQuery[backward ? 'before' : 'after'] = messageId;
  }
  while (!messageHistory || messageHistory.length > 0) {
    log(`Downloading messages ${backward ? 'before' : 'after'} ${searchQuery[backward ? 'before' : 'after']}`);
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

export default getClient;
