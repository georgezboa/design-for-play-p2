import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  changedChapter3ClockDigits,
  chapter3FlipClockParts,
} from '../../src/cars/presentCity3d/Chapter3FlipClock.js';

describe('Chapter 3 mechanical flip clock', () => {
  it('derives day, four digits and period from the authored clock', () => {
    assert.deepEqual(
      chapter3FlipClockParts({ time: 'DAY 1 · 16:35', period: 'AFTERNOON' }),
      { day: 'DAY 1', digits: '1635', period: 'AFTERNOON' },
    );
    assert.equal(chapter3FlipClockParts({ time: 'invalid', period: 'NIGHT' }), null);
  });

  it('animates only digits whose value changed and skips the initial fill', () => {
    assert.deepEqual(changedChapter3ClockDigits(null, '1420'), []);
    assert.deepEqual(changedChapter3ClockDigits('1420', '1421'), [3]);
    assert.deepEqual(changedChapter3ClockDigits('1459', '1500'), [1, 2, 3]);
  });

  it('mounts one corner clock and removes the duplicate top-bar time', () => {
    const html = readFileSync(new URL('../../car03-3d.html', import.meta.url), 'utf8');
    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    assert.match(html, /id="chapter-flip-clock"/);
    assert.equal(html.includes('id="chapter-time"'), false);
    assert.match(html, /prefers-reduced-motion: reduce/);
    assert.match(runtime, /this\.flipClock\.setClock\(clock\)/);
    assert.match(runtime, /flipClock: this\.flipClock\.snapshot\(\)/);
  });
});
