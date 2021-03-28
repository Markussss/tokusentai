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

export async function getMessages(channelId, messageId, forward = false, handler = (a) => a) {
  await getClient();
  const channel = await client.channels.fetch(channelId);

  log(`Downloading messages ${forward ? 'before' : 'after'} ${messageId}`);
  let messageHistory;
  let edgeMessage;
  const searchQuery = {
    limit: 100,
  };
  if (messageId) {
    searchQuery[forward ? 'before' : 'after'] = messageId;
  }
  while (!messageHistory || messageHistory.length > 0) {
    log(`Downloading messages ${forward ? 'before' : 'after'} ${searchQuery[forward ? 'before' : 'after']}`);
    messageHistory = Array.from(
      await channel.messages.fetch(searchQuery), // eslint-disable-line no-await-in-loop
    ).map((message) => message[1]);
    await handler(messageHistory);// eslint-disable-line no-await-in-loop
    if (messageHistory.length === 0) {
      info(`Finished getting message history ${forward ? 'before' : 'after'}`);
      return;
    }

    if (forward) {
      edgeMessage = _.minBy(messageHistory, 'id');
    } else {
      edgeMessage = _.maxBy(messageHistory, 'id');
    }
    searchQuery[forward ? 'before' : 'after'] = edgeMessage.id;
  }
}

export default getClient;
