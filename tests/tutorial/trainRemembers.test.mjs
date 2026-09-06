import test from 'node:test';
import assert from 'node:assert/strict';

import { createTrainRemembers } from '../../src/tutorial/phases/trainRemembers.js';

function step(phase, ms, playerX = 0.5) {
  for (let t = 0; t < ms; t += 20) phase.update(20, { playerX });
}

function place(phase, x) {
  phase.interact('present-case');
  phase.update(20, { playerX: x });
  phase.interact('present-case');
}

function reachRedaction(phase) {
  phase.enter();
  step(phase, 1600);
  place(phase, 0.12);
  step(phase, 700, 0.12);
  step(phase, 950, 0.12);
  place(phase, 0.88);
  step(phase, 700, 0.88);
}

test('a valid Phase IV trace is acknowledged as the source of the past', () => {
  const phase = createTrainRemembers({ trace: [{ t: 0, x: 1 }, { t: 800, x: 0.5 }, { t: 1600, x: 0 }] });
  phase.enter();
  assert.equal(phase.snapshot().traceSource, 'player');
});

test('the canonical fallback remains playable after a QA skip', () => {
  const phase = createTrainRemembers();
  phase.enter();
  assert.equal(phase.snapshot().traceSource, 'canonical');
});

test('placing present opposite the amber past holds the first pose', () => {
  const phase = createTrainRemembers();
  phase.enter();
  step(phase, 1600);
  place(phase, 0.12);
  step(phase, 700, 0.12);
  assert.equal(phase.snapshot().poseIndex, 1);
});

test('two opposite poses lead to redaction rather than immediate completion', () => {
  const phase = createTrainRemembers();
  reachRedaction(phase);
  assert.equal(phase.snapshot().phase, 'redaction');
  assert.equal(phase.snapshot().stageComplete, false);
});

test('the player must leave the right balance and cross left to catch the record', () => {
  const phase = createTrainRemembers();
  reachRedaction(phase);
  step(phase, 950, 0.88);
  assert.equal(phase.snapshot().catchReady, true);
  phase.interact('catch');
  assert.equal(phase.snapshot().caught, false);
  phase.update(20, { playerX: 0.05 });
  phase.interact('catch');
  assert.equal(phase.snapshot().caught, true);
});

test('after the catch the train performs the missing countermovement and completes', () => {
  const phase = createTrainRemembers();
  reachRedaction(phase);
  step(phase, 950, 0.05);
  phase.interact('catch');
  step(phase, 1100, 0.05);
  const snap = phase.snapshot();
  assert.equal(snap.stageComplete, true);
  assert.ok(snap.trainCounterweightX > 0.9);
  assert.ok(phase.drainEvents().some((event) => event.type === 'train-countermovement'));
});
