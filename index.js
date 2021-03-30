import inquirer from 'inquirer';
import fs from 'fs/promises';
import dotenv from 'dotenv';

import {
  createTables, query, fillMessages, fillResponses, download,
} from './database.js';
import { log, info, emptyLine } from './log.js';
import { startFake, startBot } from './bot.js';

dotenv.config();

const prompt = inquirer.createPromptModule();

async function importMessages(choice) {
  try {
    await fs.stat('./import/messages.csv');
    return choice;
  } catch {
    return undefined;
  }
}

async function importYaml(choice) {
  try {
    await Promise.all([
      fs.stat('./import/simple-messages.yml'),
      fs.stat('./import/simple-message-replies.yml'),
      fs.stat('./import/simple-fuzzy-messages.yml'),
    ]);
    return choice;
  } catch {
    return undefined;
  }
}

const init = async () => {
  const questions = [
    {
      type: 'list',
      name: 'what',
      message: 'What do you want to do?',
      choices: [
        { name: 'Create tables', value: 'create' },
        await importMessages({ name: 'Fill messages table from messages.csv', value: 'fill-messages' }),
        { name: 'Fill messages table from API', value: 'download' },
        await importYaml({ name: 'Fill response table from yaml files', value: 'fill-responses' }),
        { name: 'Start a fake bot', value: 'fake' },
        { name: 'Start the bot', value: 'start' },
        { name: 'Exit', value: 'exit' },
      ].filter((choice) => !!choice),
    },
  ];
  const answer = await prompt(questions);
  if (answer.what === 'create') {
    log('Awaiting createTables');
    await createTables();
  } else if (answer.what === 'fill-messages') {
    await fillMessages('import/messages.csv');
    log(await query('select count(*) as count from messages'));
  } else if (answer.what === 'download') {
    await download();
  } else if (answer.what === 'fill-responses') {
    await Promise.all([
      fillResponses('reply', 'import/simple-message-replies.yml'),
      fillResponses('match', 'import/simple-messages.yml'),
      fillResponses('fuzzy', 'import/simple-fuzzy-messages.yml'),
    ]);
  } else if (answer.what === 'fake') {
    await startFake();
  } else if (answer.what === 'start') {
    await startBot();
  } else if (answer.what === 'exit') {
    process.exit(0);
  }
  return undefined;
};

async function start() {
  const skip = process.argv[2];
  if (skip) {
    if (skip === 'start') {
      await startBot();
    } else if (skip === 'fake') {
      await startFake();
    }
    process.exit(0);
  }
  info('Started');
  await init();
  info('Finished');
  emptyLine();
  setTimeout(start, 0);
}

start();
