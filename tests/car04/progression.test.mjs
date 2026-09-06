import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgression } from '../../src/cars/retroCyberpunk/model/progression.js';
import { BAYS, RESPAWNS, START, GOAL, HINTS } from '../../src/cars/retroCyberpunk/levelData.js';

function prog() {
  return createProgression({ bays: BAYS, respawns: RESPAWNS, start: START, goal: GOAL, hints: HINTS });
}

test('current bay follows the player across the world', () => {
  const p = prog();
  p.updatePlayer(120, 460);
  assert.equal(p.bay(), 'bay1');
  p.updatePlayer(1200, 460);
  assert.equal(p.bay(), 'bay2');
  p.updatePlayer(5000, 200);
  assert.equal(p.bay(), 'bay5');
});

test('falling respawns at the current bay and keeps completed bays', () => {
  const p = prog();
  p.updatePlayer(2200, 460);
  p.markComplete('bay1');
  p.markComplete('bay2');
  const at = p.fell();
  assert.deepEqual(at, RESPAWNS.bay3);
  const snap = p.snapshot();
  assert.deepEqual(snap.completed, ['bay1', 'bay2'], 'falls never wipe earlier bays');
  assert.equal(snap.falls, 1);
});

test('hint exists only after the failure was observed, and only once', () => {
  const p = prog();
  assert.equal(p.requestHint('bay2'), null, 'no hint before seeing the cause fail');
  p.seeFailure('bay2');
  assert.equal(p.requestHint('bay2'), HINTS.bay2);
  assert.equal(p.requestHint('bay2'), null, 'one sentence, one time');
});

test('goal opens, then crossing the balcony line completes the slice', () => {
  const p = prog();
  p.updatePlayer(5600, 200);
  assert.equal(p.isComplete(), false, 'door not open yet');
  p.openGoal();
  p.updatePlayer(5560, 200);
  assert.equal(p.isComplete(), true);
});

test('reset restores player, bays, hints and goal state', () => {
  const p = prog();
  p.updatePlayer(3000, 460);
  p.markComplete('bay3');
  p.seeFailure('bay3');
  p.requestHint('bay3');
  p.openGoal();
  const at = p.reset();
  assert.deepEqual(at, START);
  const snap = p.snapshot();
  assert.equal(snap.bay, 'bay1');
  assert.deepEqual(snap.completed, []);
  assert.deepEqual(snap.hintShown, []);
  assert.equal(snap.goalOpen, false);
  assert.equal(snap.resets, 1);
});
