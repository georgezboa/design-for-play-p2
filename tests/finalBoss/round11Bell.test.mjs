// Round 11 · Movement II · BORROWED LIGHT as a skill fight
// (movements/onTheBell.js): the bell and the one-line rule, ON THE BELL,
// the bell's swing, the late call and the full sweep.
import test from 'node:test';
import assert from 'node:assert/strict';

import { INTRO_SECONDS } from '../../src/chapters/finalBoss/conductorFight.js';
import { BELL_ARENA, LANE_X, OFFBEAT_MS } from '../../src/chapters/finalBoss/finaleModel.js';
import { BELL_MS } from '../../src/chapters/borrowedLight/timetableModel.js';
import { BELL_PRESSURE, LATE_CALL_MS, ON_THE_BELL_DAMAGE, PUNCH_DAMAGE, createBellFight } from '../../src/chapters/finalBoss/movements/onTheBell.js';
import { DT, harness } from './round11Harness.mjs';
// ------------------------------------------------------------ II

const bell = (opts = {}) => {
  const h = harness(createBellFight, opts);
  const arena = () => h.director.arena;
  const punch = (id) => {
    const node = BELL_ARENA.nodes.find((n) => n.id === id);
    h.body.x = node.x + 1; h.body.z = node.z + 0.8;
    return h.step(DT, { act: true });
  };
  return { ...h, arena, punch };
};

test('II: lamps fire on the bell; lit and crossed, a punch inside the first beat is ON THE BELL', () => {
  const h = bell();
  h.step(INTRO_SECONDS + 0.1);
  const lane = h.director.announced();
  assert.ok(lane, 'phase 1 announces his lane a bell ahead');
  assert.equal(h.arena().beamsOn, false, 'no beams until the first punch lands (the lesson)');
  const bridge = Math.abs(LANE_X[lane] - BELL_ARENA.bridges['bridge-west']) <= Math.abs(LANE_X[lane] - BELL_ARENA.bridges['bridge-east']) ? 'bridge-west' : 'bridge-east';
  h.punch(`lamp-${lane}`);
  h.punch(bridge);
  // wait at the bridge head for the bell
  h.body.x = BELL_ARENA.bridges[bridge]; h.body.z = BELL_ARENA.gapNearZ + 0.4;
  h.until((ev) => ev.some((e) => e.type === 'arena' && e.event.type === 'exposed'), 5);
  assert.ok(h.director.onTheBellOpen);
  // across and along to his lane
  h.until(() => h.body.z < BELL_ARENA.gapFarZ - 0.4, 2, { dz: -1 });
  h.body.x = LANE_X[lane];
  const ev = h.step(DT, { act: true });
  const act = ev.find((e) => e.type === 'act');
  const dmg = ev.find((e) => e.type === 'damage');
  assert.ok(['on-the-bell', 'hit'].includes(act.result));
  assert.equal(dmg.amount, act.result === 'on-the-bell' ? ON_THE_BELL_DAMAGE : PUNCH_DAMAGE);
  assert.ok(ON_THE_BELL_DAMAGE >= PUNCH_DAMAGE * 1.4);
  assert.equal(h.arena().beamsOn, true, 'now he fires back');
});

test('II: the street gap is a railing, and a bridge folding under Butch holds for its rider', () => {
  const h = bell();
  h.body.x = 7; h.body.z = BELL_ARENA.gapNearZ + 0.3;
  h.step(1, { dz: -1 });
  assert.ok(h.body.z > BELL_ARENA.gapNearZ, 'no bridge: he stops at the edge');
  h.arena().extendReturnBridge('bridge-east', undefined, { full: true });
  h.step(0.2, { dz: -1 });
  assert.ok(h.body.z < BELL_ARENA.gapNearZ, 'onto the bridge');
  h.body.z = (BELL_ARENA.gapNearZ + BELL_ARENA.gapFarZ) / 2;
  h.step(1, { dx: 1 });
  assert.ok(h.body.x <= BELL_ARENA.bridges['bridge-east'] + BELL_ARENA.bridgeHalfWidth + 1e-9, 'never off its side');
  // stand on it until its plank would have folded: it never drops him
  let fell = false;
  for (let t = 0; t < 9; t += DT) { if (h.step(DT).some((e) => e.type === 'hit' && e.source === 'fall')) fell = true; }
  assert.equal(fell, false);
  assert.ok(h.arena().bridgeUnder(h.body.x, h.body.z), 'the plank is still under him');
});

test('II: phase 2 swings a brass ring out on the bell (jumpable); phase 3 calls his lane late and sweeps every fourth bell', () => {
  const h = bell();
  h.director.jumpToPhase(1);
  const waves = h.step(BELL_MS / 1000 * 2 + 0.1).filter((e) => e.type === 'telegraph' && e.attack.kind === 'wave').map((e) => e.attack);
  assert.ok(waves.length >= 1);
  waves.forEach((w) => { assert.equal(w.jumpable, true); assert.equal(w.source, 'bell-wave'); });
  const h3 = bell();
  h3.director.jumpToPhase(2);
  h3.step(DT * 3);
  h3.until(() => h3.arena().msSinceBell() < 50, 5);
  assert.equal(h3.director.announced(), null, 'just after the bell, he has not called it');
  h3.until(() => h3.arena().msSinceBell() >= LATE_CALL_MS + 20, 5);
  assert.ok(h3.director.announced(), 'then he calls it');
  assert.ok(LATE_CALL_MS < OFFBEAT_MS, 'before his beams fire');
  assert.equal(BELL_PRESSURE.normal[2].fullSweepEvery, 4);
  assert.equal(BELL_PRESSURE.story[2].fullSweepEvery, 0, 'STORY never sweeps all three lanes');
});

