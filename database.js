import parse from 'csv-parse';
import { readFile } from 'fs/promises'; // eslint-disable-line import/no-unresolved
import { SingleBar, Presets } from 'cli-progress';
import _ from 'lodash';
import inquirer from 'inquirer';
import franc from 'franc';
import YAML from 'yaml';

import { getDb } from './db.js';
import { log, info, emptyLine } from './log.js';
import { getMessages } from './bot.js';

export async function query(sql) {
  const db = await getDb();
  log(`Querying database: "${sql}"`);
  return db.all(sql);
}

function cleanMessage(message) {
  let str = message;
  if (str.match(/\b(\w+)\s+\1\b/)) {
    str = str.replace(/(\b(\w+))\s+\1\b/, '$1');
  }

  return str
    .replace(/<.*>/g, ' ')
    .replace(/:.*:/g, ' ')
    .replace(/[\r\n]/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
}

async function storeMessages(messages) {
  const db = await getDb();
  const perChunk = 111;
  const statement = await db.prepare(`insert or replace into messages (
    id, username, author, message, channel, length, timestamp, lang, wordcount
  ) values ${'(?, ?, ?, ?, ?, ?, ?, ?, ?), '.repeat(perChunk - 1)} (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  let progress;
  if (messages.length > 200) {
    info(`Processing ${messages.length} messages split in ${Math.floor(messages.length / perChunk)} chunks with ${perChunk} in each`);
    progress = new SingleBar({}, Presets.shades_classic);
    progress.start(Math.floor(messages.length / perChunk), 0);
  } else {
    info(`Inserting ${messages.length} messages`);
  }
  await db.run('begin transaction');
  await Promise.all(
    _.chunk(messages, perChunk).map((rows, index) => (
      statement.run(_.flatten(rows)).then(() => {
        if (messages.length > 200) {
          progress.update(index);
        }
      })
    )),
  );
  await db.run('commit transaction');
  if (messages.length > 200) {
    progress.update(messages.length);
    progress.stop();
    emptyLine();
  }
  info('Inserted all messages');
  return statement.finalize();
}

export async function fillMessages(file) {
  const fileContent = await readFile(file, 'utf-8');
  log(`Got file contents from ${file}`);

  const messages = await new Promise((resolve, reject) => {
    parse(fileContent, (parseErr, data) => {
      if (parseErr) reject(parseErr);
      resolve(data);
    });
  });

  log(`Parsed ${file}`);
  return storeMessages(messages.map((message) => message.slice(0, 9)));
}

export async function download() {
  const prompt = inquirer.createPromptModule();
  const answer = await prompt({
    type: 'input',
    name: 'channelId',
    message: 'Channel ID to download messages from (https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-)',
  });
  log(`Downloading messages from channel ${answer.channelId}`);

  const { channelId } = answer;

  const db = await getDb();
  const youngestMessage = await db.get('select max(id) id from messages where channel = ?', channelId);
  const oldestMessage = await db.get('select min(id) id from messages where channel = ?', channelId);

  const store = async (messages) => {
    await storeMessages(messages.map((message) => [
      message.id,
      message.author.username,
      message.author.id,
      cleanMessage(message.content),
      message.channel.id,
      message.content.length,
      message.createdTimestamp,
      franc(message.content.repeat(10)),
      cleanMessage(message.content).split(' ').length,
    ]));
  };
  await getMessages(channelId, oldestMessage.id, true, store);
  await getMessages(channelId, youngestMessage.id, false, store);
  info('Finished downloading messages');
}

export async function fillResponses(type, file) {
  const db = await getDb();
  const fileContent = await readFile(file, 'utf-8');
  log(`Got file contents from ${file}`);
  const responses = YAML.parse(fileContent);
  const triggers = Object.keys(responses);
  const statement = await db.prepare(`insert into responses (
    trigger, response, type, probability
  ) values (
    ?, ?, ?, ?
  )`);
  await Promise.all([
    _.flatten(
      triggers.map((trigger) => {
        if (_.isArray(responses[trigger])) {
          return responses[trigger].map((response) => statement.run([
            trigger, response, type, (1 / responses[trigger].length),
          ]));
        }
        return statement.run([
          trigger, responses[trigger], type, 1.0,
        ]);
      }),
    ),
  ]);
  info('Finished filling responses');
}
