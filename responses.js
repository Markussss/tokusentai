import _ from 'lodash';
import Chain from 'easy-markov-chain';
import luxon from 'luxon';
import { SingleBar, Presets } from 'cli-progress';

import { getDb } from './db.js';
import { debug, log } from './log.js';

let markovChain;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function mention(id) {
  return `<@${id}>`;
}

function timeResponse(response) {
  if (response?.extra) {
    const extra = JSON.parse(response.extra);
    const now = new luxon.DateTime('Europe/Oslo');
    const start = now.set({ hour: extra.startHour, minute: extra.startMinute });
    let end = now.set({ hour: extra.endHour, minute: extra.endMinute });
    if (extra.endHour < extra.rtHour) {
      end = end.set({ day: end.day + 1 });
    }
    if (now >= start && now <= end) {
      return response.response;
    }
    return '';
  }
  return response.response;
}

async function getResponse(type, extraQuery = '', extraBinds = []) {
  const db = await getDb();
  const statement = await db.prepare(
    `select * from responses where type = ? ${extraQuery}`,
  );
  log({ statement, type });
  await statement.bind([
    type,
    ...(Array.isArray(extraBinds) ? extraBinds : [extraBinds]),
  ]);
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
      const response = getResponseByProbability(
        await getResponse(
          'match',
          'and trigger = ?',
          message,
        ),
      );
      return timeResponse(response);
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

      const response = getResponseByProbability(
        await getResponse(
          'fuzzy',
          `and trigger in (${'?,'.repeat(triggers.length - 1)} ?)`,
          triggers,
        ),
      );
      return timeResponse(response);
    },
  },
  {
    name: 'Reply',
    async responder(message) {
      if (message.startsWith(mention(process.env.CLIENT_ID))) {
        const response = getResponseByProbability(
          await getResponse(
            'reply',
            'and trigger = ?',
            message.replace(mention(process.env.CLIENT_ID), '').trim(),
          ),
        );
        return timeResponse(response);
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
          const progress = new SingleBar({}, Presets.shades_classic);
          progress.start(results.length);
          markovChain = new Chain();
          results.map((result) => result.message)
            .filter((result) => !!result)
            .forEach((result, index) => {
              markovChain.learn(result);
              progress.update(index);
            });
          markovChain.normalize();
          progress.update(results.length);
          progress.stop();
        }
        const seeds = message.replace(process.env.NAME, '')
          .replace(/[^a-zA-ZæøåÆØÅ ]/g, '')
          .split(' ');
        return markovChain.generate(random(3, 30), seeds);
      }
      return '';
    },
  },
];

export default responseRegistry;
