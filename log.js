import { appendFile } from 'fs';
import { LOGLEVEL } from './config.js';
import _ from 'lodash';

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
  if (!_.isString(message)) {
    message = JSON.stringify(message);
  }
  const log = `[${loglevel.toUpperCase()}]: ${message}`;
  if (console[loglevel]) {
    console[loglevel](log);
  }
  appendFile(
    'tokusentai.log',
    `[${new Date().toISOString()}] ${log}\n`,
    () => {}
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
