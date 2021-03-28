import parse from 'csv-parse';
import { readFile } from 'fs/promises'; // eslint-disable-line import/no-unresolved
import { SingleBar, Presets } from 'cli-progress';
import _ from 'lodash';
import inquirer from 'inquirer';
import franc from 'franc';
import YAML from 'yaml';

import { getDb } from './db.js';
import { DEBUG } from './config.js';
import { log, info, emptyLine } from './log.js';
import { getMessages } from './bot.js';

export async function createTables() {
  const db = await getDb();
  if (!db) throw new Error('No database found');
  if (DEBUG) {
    await db.exec('drop table if exists messages');
    log('dropped message table');
    await db.exec('drop table if exists responses');
    log('dropped message responses');
  }

  await db.exec(`create table if not exists messages (
      id varchar(64) primary key,
      username varchar(255),
      author varchar(64),
      message text,
      channel varchar(64),
      length integer unsigned,
      timestamp integer unsigned,
      lang char(3),
      wordcount integer unsigned
  )`);
  info('Message table OK');

  await db.exec(`create table if not exists responses (
    trigger text,
    response text,
    type varchar(10),
    probability float unsigned,
    unique(trigger, response)
  )`);
  info('Response table OK');
  return undefined;
}

export async function query(sql) {
  const db = await getDb();
  info(`queried database: "${sql}"`);
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
    log(`Processing ${messages.length} messages split in ${Math.floor(messages.length / perChunk)} chunks with ${perChunk} in each`);
    progress = new SingleBar({}, Presets.shades_classic);
    progress.start(Math.floor(messages.length / perChunk), 0);
  } else {
    log(`Inserting ${messages.length} messages`);
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
  log('Inserted all messages');
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
  log(`Want to download messages from channel ${answer.channelId}`);

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
          trigger, responses[trigger], type, 1.0
        ]);
      }),
    ),
  ]);
}
