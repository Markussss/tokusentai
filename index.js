import inquirer from 'inquirer';
// import { fillDatabase, startBot } from './bot.js';
import { createTables, query } from './database.js';
import { log, info, emptyLine } from './log.js';

const prompt = inquirer.createPromptModule();

const fill = 'fill';
const start = 'start';

const questions = [
  {
    type: 'list',
    name: 'what',
    message: 'What do you want to do?',
    choices: [
      { name: 'Fill the database', value: fill },
      { name: 'Start the bot', value: start },
    ],
  },
];

const init = async () => {
  info('Started');
  const answer = await prompt(questions);
  if (answer.what === fill) {
    log('Awaiting createTables');
    await createTables();
    log(await query('select count(*) as count from messages'));
  }
  if (answer.what === start) {
    await startBot();
  }
  info('Finished');
  emptyLine();
};

init();
