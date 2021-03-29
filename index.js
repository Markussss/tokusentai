import inquirer from 'inquirer';
import dotenv from 'dotenv';

import {
  createTables, query, fillMessages, fillResponses, download,
} from './database.js';
import { log, info, emptyLine } from './log.js';
import { startFake } from './bot.js';

dotenv.config();

const prompt = inquirer.createPromptModule();

const questions = [
  {
    type: 'list',
    name: 'what',
    message: 'What do you want to do?',
    choices: [
      { name: 'Create tables', value: 'create' },
      { name: 'Fill messages table from messages.csv', value: 'fill-messages' },
      { name: 'Fill messages table from API', value: 'download' },
      { name: 'Fill response table from yaml files', value: 'fill-responses' },
      { name: 'Start a fake bot', value: 'fake' },
      { name: 'Start the bot', value: 'start' },
      { name: 'Exit', value: 'exit' },
    ],
  },
];

const init = async () => {
  const answer = await prompt(questions);
  if (answer.what === 'create') {
    log('Awaiting createTables');
    await createTables();
  } else if (answer.what === 'fill-messages') {
    await fillMessages('../messages.csv');
    log(await query('select count(*) as count from messages'));
  } else if (answer.what === 'download') {
    await download();
  } else if (answer.what === 'fill-responses') {
    await Promise.all([
      fillResponses('reply', 'settings/simple-message-replies.yml'),
      fillResponses('match', 'settings/simple-messages.yml'),
      fillResponses('fuzzy', 'settings/simple-fuzzy-messages.yml'),
    ]);
  } else if (answer.what === 'fake') {
    await startFake();
  } else if (answer.what === 'start') {
    // startBot();
  } else if (answer.what === 'exit') {
    process.exit(0);
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
