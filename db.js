import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

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

export default {};
