// Alpha round 4 · Chapter 6, the Black Ticket and the true ending (M5).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { MAX_FRAME_SECONDS, MAX_STEP_SECONDS, frameSteps } from '../../src/chapters/finalBoss/finaleQuality.js';

const source = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const sum = (steps) => steps.reduce((total, step) => total + step, 0);

describe('frame-rate independence', () => {
  it('plays a 12 fps frame at wall-clock speed, in substeps of at most 1/30 s', () => {
    const steps = frameSteps(1 / 12);
    assert.ok(Math.abs(sum(steps) - 1 / 12) < 1e-9);
    assert.ok(steps.every((step) => step <= MAX_STEP_SECONDS + 1e-9));
    assert.equal(steps.length, 3);
  });

  it('keeps 60 fps as one step and caps a stall at 0.1 s', () => {
    assert.deepEqual(frameSteps(1 / 60), [1 / 60]);
    assert.ok(Math.abs(sum(frameSteps(2.5)) - MAX_FRAME_SECONDS) < 1e-9);
    assert.deepEqual(frameSteps(0), []);
    assert.deepEqual(frameSteps(-1), []);
  });

  it('ten seconds at 15 fps advance ten seconds of game time (the old cap gave five)', () => {
    let game = 0;
    for (let frame = 0; frame < 150; frame += 1) game += sum(frameSteps(1 / 15));
    assert.ok(Math.abs(game - 10) < 1e-6);
    assert.ok(Math.abs(150 * Math.min(0.033, 1 / 15) - 4.95) < 1e-9, 'what the 33 ms cap used to play');
  });

  it('the Conductor and the Black Ticket both step their frames through frameSteps', async () => {
    assert.match(await source('src/chapters/finalBoss/spectacleBattle.js'), /frameSteps\(wall\)/);
    assert.doesNotMatch(await source('src/chapters/finalBoss/spectacleBattle.js'), /Math\.min\(0\.033/);
  });
});
