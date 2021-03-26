import inquirer from "inquirer";
import { fillDatabase, startBot } from "./bot.js";

const prompt = inquirer.createPromptModule();

const fill = "fill";
const start = "start";

const questions = [
  {
    type: "list",
    name: "what",
    message: "What do you want to do?",
    choices: [
      { name: "Fill the database", value: fill },
      { name: "Start the bot", value: start },
    ],
  },
];

const init = async () => {
  const answer = await prompt(questions);
  if (answer.what === fill) {
    await fillDatabase();
    return init();
  }
  if (answer.what === start) {
    await startBot();
    return init();
  }
};

init();
