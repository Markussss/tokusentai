import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = open({
  filename: 'tokusentai.db',
  driver: sqlite3.Database,
});

export async function getDb() {
  return db;
}

export default db;
