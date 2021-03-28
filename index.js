import inquirer from 'inquirer';
import dotenv from 'dotenv';

import {
  createTables, query, fill, download,
} from './database.js';
import { log, info, emptyLine } from './log.js';

dotenv.config();

const prompt = inquirer.createPromptModule();

const questions = [
  {
    type: 'list',
    name: 'what',
    message: 'What do you want to do?',
    choices: [
      { name: 'Create tables', value: 'create' },
      { name: 'Fill the database from messages.csv', value: 'fill' },
      { name: 'Fill the database from API', value: 'download' },
      { name: 'Start the bot', value: 'start' },
    ],
  },
];

const init = async () => {
  const answer = await prompt(questions);
  if (answer.what === 'create') {
    log('Awaiting createTables');
    await createTables();
  } else if (answer.what === 'fill') {
    await fill('messages.csv');
    log(await query('select count(*) as count from messages'));
  } else if (answer.what === 'download') {
    await download();
  } else if (answer.what === 'start') {
    // startBot();
  }
  return undefined;
};

async function start() {
  info('Started');
  await init();
  info('Finished');
  emptyLine();
  setTimeout(start, 0);
}

start();
