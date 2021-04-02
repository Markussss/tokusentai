/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
import chalk from 'chalk';
import _ from 'lodash';

import { appendFile } from 'fs';
import { DateTime } from 'luxon';
import { LOGLEVEL, TIMEZONE } from './config.js';

const loglevels = {
  log: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function coloredLog(loglevel, message) {
  const colorFunctions = {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.green,
    log: chalk.blue,
  };
  console.log(
    colorFunctions[loglevel](`[${loglevel.toUpperCase()}]:`),
    _.isString(message) ? message : JSON.stringify(message),
  );
}

function _log(message, loglevel) {
  if (loglevels[loglevel] < loglevels[LOGLEVEL]) {
    return;
  }

  if (console[loglevel]) {
    coloredLog(loglevel, message);
  }

  appendFile(
    'tokusentai.log',
    `[${DateTime.now().setZone(TIMEZONE).toISO()}] ${message}\n`,
    () => {},
  );
}

export function log(message = '') {
  _log(message, 'log');
}

export function info(message = '') {
  _log(message, 'info');
}

export function warn(message = '') {
  _log(message, 'warn');
}

export function error(message = '') {
  _log(message, 'error');
}

export function emptyLine() {
  appendFile('tokusentai.log', '\n', () => {});
}

export function debug(input) {
  console.log(input);
  return input;
}
