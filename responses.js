import _ from 'lodash';
import Chain from 'easy-markov-chain';

import { getDb } from './db.js';
import { debug, log } from './log.js';

let markovChain;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function mention(id) {
  return `<@${id}>`;
}

async function getResponse(type, extraQuery = '', extraBinds = []) {
  const db = await getDb();
  const statement = await db.prepare(
    `select * from responses where type = ? ${extraQuery}`,
  );
  await statement.bind([type, ...extraBinds]);
  return statement.all();
}

function getResponseByProbability(responses) {
  if (!responses || responses.length === 0) {
    return '';
  }
  const randomNumber = random(
    0,
    responses.reduce((total, response) => (
      total + response.probability
    ), 0),
  );
  let total = 0;
  return responses.find((response) => {
    total += response.probability;
    return total >= randomNumber;
  });
}

const responseRegistry = [
  {
    name: 'Exact match',
    async responder(message) {
      return getResponseByProbability(
        await getResponse(
          'match',
          'and trigger = ?',
          [message],
        ),
      )?.response;
    },
  },
  {
    name: 'Fuzzy match',
    /**
     * @param { String } message
     * @returns { String }
     */
    async responder(message) {
      let triggers = await getResponse('fuzzy');
      if (!triggers) {
        return '';
      }
      triggers = triggers
        .map((response) => response.trigger)
        .filter((trigger) => message.includes(trigger));

      if (triggers.length === 0) {
        return '';
      }

      triggers = _.uniq(triggers);

      return getResponseByProbability(
        await getResponse(
          'fuzzy',
          `and trigger in (${'?,'.repeat(triggers.length - 1)} ?)`,
          triggers,
        ),
      )?.response;
    },
  },
  {
    name: 'Reply',
    async responder(message) {
      if (message.startsWith(mention(process.env.CLIENT_ID))) {
        return getResponseByProbability(
          await getResponse(
            'reply',
            'and trigger = ?',
            [message.replace(mention(process.env.CLIENT_ID), '').trim()],
          ),
        )?.response;
      }
      return '';
    },
  },
  {
    name: 'Markov',
    async responder(message) {
      if (message.startsWith(process.env.NAME)) {
        if (!markovChain) {
          const db = await getDb();
          const results = await db.all('select message from messages');
          markovChain = new Chain();
          results.map((result) => result.message)
            .filter((result) => !!result)
            .forEach((result) => markovChain.learn(result));
          markovChain.normalize();
        }
        let seeds = message.replace(process.env.NAME, '')
          .replace(/[^a-zA-ZæøåÆØÅ ]/g, '')
          .split(' ');
        return markovChain.generate(random(3, 30), seeds);
      }
      return '';
    },
  },
];

export default responseRegistry;
