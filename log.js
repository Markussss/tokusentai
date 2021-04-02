/* eslint-disable no-console */
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

function realLog(message, loglevel) {
  if (loglevels[loglevel] < loglevels[LOGLEVEL]) {
    return;
  }

  const logMessage = `[${loglevel.toUpperCase()}]: ${JSON.stringify(message)}`;
  if (console[loglevel]) {
    console[loglevel](logMessage);
  }

  appendFile(
    'tokusentai.log',
    `[${DateTime.now().setZone(TIMEZONE).toISO()}] ${logMessage}\n`,
    () => {},
  );
}

export function log(message = '') {
  realLog(message, 'log');
}

export function info(message = '') {
  realLog(message, 'info');
}

export function warn(message = '') {
  realLog(message, 'warn');
}

export function error(message = '') {
  realLog(message, 'error');
}

export function emptyLine() {
  appendFile('tokusentai.log', '\n', () => {});
}

export function debug(input) {
  console.log(input);
  return input;
}