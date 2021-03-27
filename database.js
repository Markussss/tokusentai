import db from './db.js';

import { DEBUG } from './config.js';
import { log, info } from './log.js';

export async function createTables() {
  if (!db) throw new Error('No database supplied');

  db.serialize(() => {
    if (DEBUG) {
      db.exec('drop table messages');
      log('dropped message table');
    }

    db.exec(`create table if not exists messages (
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
  });
}

export function query(query) {
  info(`queried database: "${query}"`);
  return new Promise((resolve, reject) => {
    db.all(query, function (error, rows) {
      if (error) reject(error);
      resolve(rows);
    });
  });
}

export async function fill(filePath = '') {
  if (filePath) {
  }
}
