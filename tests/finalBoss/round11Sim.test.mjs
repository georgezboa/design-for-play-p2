// Round 11 · the whole Conductor, played by the QA bot (fightBot.js) on the
// real rules. It reads telegraphs as a player does (with a reaction time and
// limited attention), so these numbers are the shape of the fight, not a
// human's exact times: a human first run is slower (George's target for a
// competent player on NORMAL is 8–12 minutes in all).
import test from 'node:test';
import assert from 'node:assert/strict';

import { createFightRunner } from '../../src/chapters/finalBoss/conductorFight.js';
import { createDeathLedger } from '../../src/chapters/finalBoss/finaleModel.js';
import { createLostPropertyFight } from '../../src/chapters/finalBoss/movements/lostProperty.js';
import { createBellFight } from '../../src/chapters/finalBoss/movements/onTheBell.js';
import { createEchoFight } from '../../src/chapters/finalBoss/movements/echoCity.js';
import { createPaintFight } from '../../src/chapters/finalBoss/movements/paintedCountry.js';
import { createFightBot, simulateMovement } from '../../src/chapters/finalBoss/fightBot.js';

const FIGHTS = [createLostPropertyFight, createBellFight, createEchoFight, createPaintFight];
const play = (m, { difficulty = 'normal', skill = 'competent', seed = 1, maxSeconds = 420 } = {}) => simulateMovement({
  makeRunner: () => createFightRunner({ director: FIGHTS[m]({ difficulty, seed: seed * 3 + m }), difficulty, movement: m, ledger: createDeathLedger() }),
  bot: createFightBot({ skill, seed: seed * 11 + m }),
  maxSeconds,
});
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];

test('every movement can be won on NORMAL and on STORY, by a competent player and by a learner', () => {
  for (const difficulty of ['normal', 'story']) {
    for (const skill of ['competent', 'learner']) {
      for (let m = 0; m < 4; m += 1) {
        for (const seed of [1, 2]) {
          const result = play(m, { difficulty, skill, seed });
          assert.ok(result.finished, `M${m + 1} ${difficulty} ${skill} seed ${seed}: ${JSON.stringify(result)}`);
          assert.equal(result.phases.length, 3, 'all three phases were played');
        }
      }
    }
  }
});

test('the fight is short, intense and in budget: each movement a minute or two of play for a competent player', () => {
  const totals = [];
  for (let m = 0; m < 4; m += 1) {
    const times = [1, 2, 3, 4].map((seed) => play(m, { seed }).time);
    const t = median(times);
    totals.push(t);
    assert.ok(t >= 40 && t <= 150, `M${m + 1}: ${t} s`);
  }
  const total = totals.reduce((a, b) => a + b, 0);
  // The bot is quicker than a person (it never hesitates over a pattern it
  // has read); with the transitions and a human's first-run hesitations this
  // is the 8–12 minutes asked for.
  assert.ok(total >= 240 && total <= 480, `whole fight, bot time: ${total.toFixed(0)} s`);
});

test('STORY is gentler: a learner tears fewer last layers there than on NORMAL', () => {
  let normal = 0;
  let story = 0;
  for (let m = 0; m < 4; m += 1) {
    for (const seed of [1, 2, 3]) {
      normal += play(m, { difficulty: 'normal', skill: 'learner', seed }).deaths;
      story += play(m, { difficulty: 'story', skill: 'learner', seed }).deaths;
    }
  }
  assert.ok(story < normal || (story === 0 && normal === 0), `STORY ${story} vs NORMAL ${normal}`);
  assert.ok(story <= 3, `STORY deaths over twelve movement runs: ${story}`);
});

test('the skill shows: a competent player is hit less and finishes sooner than a learner', () => {
  let competent = { time: 0, hits: 0 };
  let learner = { time: 0, hits: 0 };
  for (let m = 0; m < 4; m += 1) {
    for (const seed of [1, 2]) {
      const c = play(m, { seed });
      const l = play(m, { seed, skill: 'learner' });
      competent = { time: competent.time + c.time, hits: competent.hits + c.hits };
      learner = { time: learner.time + l.time, hits: learner.hits + l.hits };
    }
  }
  assert.ok(learner.hits > competent.hits, `hits: learner ${learner.hits}, competent ${competent.hits}`);
  assert.ok(learner.time > competent.time, `time: learner ${learner.time.toFixed(0)}, competent ${competent.time.toFixed(0)}`);
});
