import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import luxon from 'luxon';
import slugify from 'slugify';
import fs from 'fs/promises';
import path from 'path';

let db;

export async function getDb() {
  if (db) {
    return db;
  }
  db = open({
    filename: 'tokusentai.db',
    driver: sqlite3.Database,
  });
  return db;
}

export async function createMigration(name) {
  const now = new luxon.DateTime('Europe/Oslo');
  const filename = `${now.toMillis()}-${slugify(name.toLowerCase())}.sql`;
  const fileContent = `--------------------------------------------------------------------------------
-- ${name} - ${now.toISODate()}
--------------------------------------------------------------------------------


-- Up
--------------------------------------------------------------------------------



--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

`;
  return fs.writeFile(path.join(process.cwd(), 'migrations', filename), fileContent);
}

export default {};
