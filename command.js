import simpleGit from 'simple-git';

import { mention } from './util.js';

const commands = [
  {
    trigger: 'slå deg av',
    parameters: 0,
    async run() {
      process.exit(0);
    },
  },
  {
    trigger: 'oppdater deg',
    parameters: 0,
    async run() {
      const git = simpleGit({
        baseDir: process.cwd(),
        binary: 'git',
      });
      await git.pull();
      process.exit(0);
    },
  },
];

function getCommand(message) {
  const commandMessage = message.replace(mention(), '').trim();
  return commands.find((command) => command.trigger === commandMessage);
}

export function isCommand(message) {
  return (
    message.startsWith(mention())
    && getCommand(message)
  );
}

export function doCommand(message) {
  return getCommand(message).run();
}

export default {};
