import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('tokusentai.db', (err) => {
  if (err) throw new Error(err);
});

export default db;
