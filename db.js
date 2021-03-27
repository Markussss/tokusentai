import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function getDb() {
  return open({
    filename: 'tokusentai.db',
    driver: sqlite3.Database,
  });
}

export default {};
