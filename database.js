import parse from 'csv-parse';
import { readFile } from 'fs/promises'; // eslint-disable-line import/no-unresolved
import { SingleBar, Presets } from 'cli-progress';
import _ from 'lodash';

import { getDb } from './db.js';
import { DEBUG } from './config.js';
import { log, info, emptyLine } from './log.js';

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
      wordcount integer unsigned,
      num integer unsigned
  )`);
  info('connected to database and message table exists');
  return undefined;
}

export async function query(sql) {
  const db = await getDb();
  info(`queried database: "${sql}"`);
  return db.all(sql);
}

export async function fill(filePath = '') {
  const db = await getDb();
  if (filePath) {
    const fileContent = await readFile(filePath, 'utf-8');
    log(`Got file contents from ${filePath}`);

    const output = await new Promise((resolve, reject) => {
      parse(fileContent, (parseErr, data) => {
        if (parseErr) reject(parseErr);
        resolve(data);
      });
    });

    log(`Parsed ${filePath}`);
    const perChunk = 99;
    const statement = await db.prepare(`insert into messages (
      id, username, author, message, channel, length, timestamp, lang, wordcount, num
    ) values ${'(?, ?, ?, ?, ?, ?, ?, ?, ?, ?), '.repeat(perChunk - 1)} (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    log(`Processing ${output.length} messages split in ${Math.floor(output.length / perChunk)} chunks with ${perChunk} in each`);
    const progress = new SingleBar({}, Presets.shades_classic);
    progress.start(Math.floor(output.length / perChunk), 0);
    await db.run('begin transaction');
    await Promise.all(
      _.chunk(output, perChunk).map((rows, index) => (
        statement.run(_.flatten(rows)).then(() => progress.update(index))
      )),
    );
    await db.run('commit transaction');
    progress.update(output.length);
    progress.stop();
    emptyLine();
    log('Inserted all messages');
    return statement.finalize();
  }
}
