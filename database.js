import parse from 'csv-parse';
import { readFile } from 'fs/promises'; // eslint-disable-line import/no-unresolved
import { SingleBar, Presets } from 'cli-progress';
import _ from 'lodash';
import inquirer from 'inquirer';
import franc from 'franc';

import { getDb } from './db.js';
import { DEBUG } from './config.js';
import { log, info, emptyLine } from './log.js';
import { getMessages } from './bot.js';

export async function createTables() {
  const db = await getDb();
  if (!db) throw new Error('No database supplied');
  if (DEBUG) {
    db.exec('drop table messages');
    log('dropped message table');
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
  info('connected to database and message table exists');
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

export async function fill(filePath) {
  const fileContent = await readFile(filePath, 'utf-8');
  log(`Got file contents from ${filePath}`);

  const messages = await new Promise((resolve, reject) => {
    parse(fileContent, (parseErr, data) => {
      if (parseErr) reject(parseErr);
      resolve(data);
    });
  });

  log(`Parsed ${filePath}`);
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
