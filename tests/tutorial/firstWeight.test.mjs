import test from 'node:test';
import assert from 'node:assert/strict';

import { createFirstWeight } from '../../src/tutorial/phases/firstWeight.js';

function step(phase, ms, playerX) {
  for (let t = 0; t < ms; t += 20) phase.update(20, { playerX });
}

function enterAndLand(phase) {
  phase.enter();
  step(phase, 700, 0.08);
}

function carryTo(phase, x) {
  phase.interactCase();
  phase.update(16, { playerX: x });
  phase.interactCase();
}

test('entry creates one visible right-side fall and a rightward tilt', () => {
  const phase = createFirstWeight();
  phase.enter();
  step(phase, 300, 0.08);
  assert.equal(phase.snapshot().caseFalling, true);
  step(phase, 400, 0.08);
  const snap = phase.snapshot();
  assert.equal(snap.caseFallen, true);
  assert.equal(snap.caseDetent, 'right');
  assert.ok(snap.tilt > 0.5);
  assert.deepEqual(phase.drainEvents().map((event) => event.type), ['case-fell']);
});

test('middle detent settles the carriage and exposes the witness tag', () => {
  const phase = createFirstWeight();
  enterAndLand(phase);
  carryTo(phase, 0.5);
  step(phase, 500, 0.1);
  const snap = phase.snapshot();
  assert.equal(snap.caseDetent, 'middle');
  assert.equal(snap.level, true);
  assert.equal(snap.tagAvailable, true);
  assert.ok(phase.drainEvents().some((event) => event.type === 'first-balance'));
});

test('the punch records the apparent answer without completing the room', () => {
  const phase = createFirstWeight();
  enterAndLand(phase);
  carryTo(phase, 0.5);
  step(phase, 500, 0.1);
  phase.interactCase();
  const snap = phase.snapshot();
  assert.equal(snap.tagPunched, true);
  assert.equal(snap.stageComplete, false);
});

test('walking toward the exit adds player weight and spoils the middle answer', () => {
  const phase = createFirstWeight();
  enterAndLand(phase);
  carryTo(phase, 0.5);
  step(phase, 500, 0.1);
  phase.interactCase();
  step(phase, 100, 0.95);
  const snap = phase.snapshot();
  assert.equal(snap.playerWeightRevealed, true);
  assert.equal(snap.level, false);
  assert.equal(snap.stageComplete, false);
  assert.ok(phase.drainEvents().some((event) => event.type === 'latch-refused'));
});

test('case left plus player right holds level for 600ms and opens the room', () => {
  const phase = createFirstWeight();
  enterAndLand(phase);
  carryTo(phase, 0.5);
  step(phase, 500, 0.1);
  phase.interactCase(); // punch
  carryTo(phase, 0);
  step(phase, 580, 0.95);
  assert.equal(phase.snapshot().stageComplete, false);
  step(phase, 40, 0.95);
  assert.equal(phase.snapshot().stageComplete, true);
  assert.ok(phase.drainEvents().some((event) => event.type === 'stage-complete'));
});

test('wrong placements never reset prior discovery and remain recoverable', () => {
  const phase = createFirstWeight();
  enterAndLand(phase);
  carryTo(phase, 0.5);
  step(phase, 500, 0.1);
  phase.interactCase();
  carryTo(phase, 1);
  step(phase, 900, 0.95);
  assert.equal(phase.snapshot().tagPunched, true);
  assert.equal(phase.snapshot().stageComplete, false);
  carryTo(phase, 0);
  step(phase, 650, 0.95);
  assert.equal(phase.snapshot().stageComplete, true);
});

test('Phase IV exports the player case movement for the train to remember', () => {
  const phase = createFirstWeight();
  enterAndLand(phase);
  carryTo(phase, 0.5);
  step(phase, 500, 0.1);
  phase.interactCase();
  carryTo(phase, 0);
  const trace = phase.exportTrace();
  assert.ok(trace.length >= 3);
  assert.deepEqual(trace.map((sample) => sample.x), [1, 0.5, 0]);
  assert.ok(trace.at(-1).t >= 1600);
});
