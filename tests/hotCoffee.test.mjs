// HOT COFFEE · DLC (2026-10-12): it brews for a long time, ends as a cup of
// hot coffee, goes cold five real minutes later and stays cold; leaving
// mid-brew starts it again. The title board lists it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  BREW_LINES, BREW_MS, COFFEE_KEY, COFFEE_TEXT, COOL_MS, STALL_LINES, STALL_MS,
  brewLine, brewPercent, coffeeMenuDetail, coffeeState, writeCoffee,
} from '../src/shell/hotCoffeeState.js';

const memory = () => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};

test('a new install brews; brewed coffee is hot for five minutes, then cold for good', () => {
  const s = memory();
  assert.equal(coffeeState(s, 0).phase, 'new');
  assert.equal(coffeeMenuDetail(s, 0), COFFEE_TEXT.installed);
  writeCoffee(s, { brewedAt: 1000 });
  assert.equal(coffeeState(s, 1000 + COOL_MS - 1).phase, 'hot');
  assert.equal(coffeeState(s, 1000 + COOL_MS).phase, 'cold');
  assert.equal(coffeeState(s, 1000 + COOL_MS * 1000).phase, 'cold');
  assert.equal(coffeeMenuDetail(s, 1000 + COOL_MS), COFFEE_TEXT.coldDetail);
  assert.match(s.getItem(COFFEE_KEY), /brewedAt/);
});

test('leaving mid-brew starts it again, with the restart line first', () => {
  const s = memory();
  writeCoffee(s, { startedAt: 5 });
  const state = coffeeState(s, 10);
  assert.equal(state.phase, 'new');
  assert.equal(state.abandoned, true);
  assert.equal(brewLine(0, { abandoned: true }), COFFEE_TEXT.restart);
  assert.equal(brewLine(0), BREW_LINES[0]);
});

test('the brew takes minutes, crawls at the end and stalls at 99 %', () => {
  assert.ok(BREW_MS + STALL_MS >= 180000, 'about three minutes or more');
  let last = -1;
  for (let ms = 0; ms <= BREW_MS + STALL_MS; ms += 1000) {
    const p = brewPercent(ms);
    assert.ok(p >= last && p <= 99, `${ms}: ${p}`);
    last = p;
  }
  assert.ok(brewPercent(BREW_MS * 0.5) > 70, 'quick at first');
  assert.equal(brewPercent(BREW_MS), 99);
  assert.equal(brewLine(BREW_MS + 1), STALL_LINES[0]);
  assert.equal(brewLine(BREW_MS + STALL_MS - 1), STALL_LINES.at(-1));
  // every brewing line gets its turn
  const seen = new Set();
  for (let ms = 0; ms < BREW_MS; ms += 500) seen.add(brewLine(ms));
  assert.deepEqual([...seen], [...BREW_LINES]);
});

test('the lines only hint; the payoff is coffee', () => {
  const all = [...BREW_LINES, ...STALL_LINES, ...Object.values(COFFEE_TEXT)].join(' ').toLowerCase();
  assert.match(COFFEE_TEXT.rating, /CAFFEINE/);
  for (const word of ['sex', 'nude', 'naked', 'porn']) assert.equal(all.includes(word), false, word);
});

test('the title board lists HOT COFFEE · DLC before QUIT GAME, and ESC leaves it', () => {
  const src = fs.readFileSync(new URL('../src/shell/titleMenu.js', import.meta.url), 'utf8');
  assert.ok(src.indexOf('button(COFFEE_TEXT.title, renderCoffee') < src.indexOf("button('QUIT GAME'"));
  assert.match(src, /coffeeCleanup\(\)/);
  assert.match(fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), /hotCoffee\.css/);
});
