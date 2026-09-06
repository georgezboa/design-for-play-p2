// Phase IV WEIGHT / ADHESION — pure-logic tests (SYSTEM ARC LOCK §4).
// The numbers here lock the repair chain against the frozen airNetwork and
// the Phase-IV-locked motorAdhesion constants.

import test from 'node:test';
import assert from 'node:assert/strict';

import { createAirNetwork } from '../../src/tutorial/phases/airNetwork.js';
import { createMotorAdhesion } from '../../src/tutorial/phases/motorAdhesion.js';
import { createWeightTransfer } from '../../src/tutorial/phases/weightTransfer.js';
import { validateTrace, TRACE_MARKERS } from '../../src/tutorial/phases/traceContract.js';

function rig() {
  const airNetwork = createAirNetwork();
  const motor = createMotorAdhesion();
  const phase = createWeightTransfer({ airNetwork, motor });
  return { airNetwork, motor, phase };
}

function step(phase, seconds, dtMs = 50) {
  const iterations = Math.round((seconds * 1000) / dtMs);
  for (let i = 0; i < iterations; i += 1) phase.update(dtMs);
}

function pushTrolleyHome(phase, seconds = 6) {
  phase.setTrolleyGrabbed(true);
  const dtMs = 50;
  const iterations = Math.round((seconds * 1000) / dtMs);
  for (let i = 0; i < iterations; i += 1) {
    phase.moveTrolley(1, dtMs);
    phase.update(dtMs);
    if (phase.snapshot().trolleyX >= 1) break;
  }
  phase.setTrolleyGrabbed(false);
}

test('enter: the suspension branch is found damaged — cut off, venting, flat', () => {
  const { phase } = rig();
  phase.enter();
  const snap = phase.snapshot();
  assert.equal(snap.suspension.isolated, true);
  assert.equal(snap.suspension.venting, true);
  assert.equal(snap.suspension.pressure, 0);
  assert.equal(snap.suspensionHealth, 0);
});

test('damage model does not disturb the other branches of the shared network', () => {
  const { airNetwork, phase } = rig();
  phase.enter();
  const snap = airNetwork.snapshot();
  assert.equal(snap.branches.door.pressure, 100);
  assert.equal(snap.branches.brake.pressure, 100);
  assert.equal(snap.reservoirPressure, 100);
});

test('TEST with a flat suspension only spins — even with the trolley fully home', () => {
  const { phase } = rig();
  phase.enter();
  pushTrolleyHome(phase);
  phase.interact('test');
  step(phase, 3);
  const snap = phase.snapshot();
  assert.equal(snap.motor.wheelState, 'spinning');
  assert.equal(snap.stageComplete, false);
});

test('closing the drain alone cannot charge the bags (line still cut off)', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('level-drain');
  step(phase, 6);
  assert.equal(phase.snapshot().suspension.pressure, 0);
  pushTrolleyHome(phase);
  phase.interact('test');
  step(phase, 2);
  assert.equal(phase.snapshot().motor.wheelState, 'spinning');
});

test('opening the supply with the drain still venting floors at the Phase III equilibrium and never bites', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('level-supply');
  step(phase, 8);
  // Venting against the live header floors at ventOpenFloor (55) — the
  // Phase III lesson, heard again on a different branch.
  assert.equal(Math.round(phase.snapshot().suspension.pressure), 55);
  pushTrolleyHome(phase);
  phase.interact('test');
  step(phase, 3);
  const snap = phase.snapshot();
  // 0.6 * (0.5 + 0.5*0.55) = 0.465 — below even the hysteresis floor.
  assert.equal(snap.motor.wheelState, 'spinning');
  assert.equal(snap.stageComplete, false);
});

test('full repair: close drain + open supply -> bags recharge, trolley home -> bite -> car moves -> complete', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('level-drain');
  phase.interact('level-supply');
  step(phase, 8); // 0 -> 100 at 14/s needs ~7.1s
  assert.equal(Math.round(phase.snapshot().suspension.pressure), 100);
  pushTrolleyHome(phase);
  phase.interact('test');
  step(phase, 2);
  assert.equal(phase.snapshot().motor.wheelState, 'biting');
  step(phase, 5); // displacement ramps at 0.25/s
  const snap = phase.snapshot();
  assert.equal(snap.motor.carDisplacement, 1);
  assert.equal(snap.stageComplete, true);
  const types = phase.drainEvents().map((e) => e.type);
  assert.ok(types.includes('car-move-complete'));
  assert.ok(types.includes('stage-complete'));
});

test('a failed TEST never resets the trolley (lock §4)', () => {
  const { phase } = rig();
  phase.enter();
  phase.setTrolleyGrabbed(true);
  for (let i = 0; i < 40; i += 1) {
    phase.moveTrolley(1, 50);
    phase.update(50);
  }
  phase.setTrolleyGrabbed(false);
  const before = phase.snapshot().trolleyX;
  phase.interact('test');
  step(phase, 3); // spinning the whole time
  assert.equal(phase.snapshot().trolleyX, before);
  assert.equal(phase.snapshot().motor.wheelState, 'spinning');
});

test('an early live TEST cannot silently pass when D moves the counterweight into position', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('level-drain');
  phase.interact('level-supply');
  step(phase, 8);

  // This is the human-reported failure mode: TEST first, then hold D while
  // carrying the trolley.  The old implementation crossed a hidden load
  // threshold and completed without another decision.
  phase.interact('test');
  assert.equal(phase.snapshot().testAttempt, 'stale');
  pushTrolleyHome(phase);
  step(phase, 6);
  let snap = phase.snapshot();
  assert.equal(snap.readyForTest, true);
  assert.equal(snap.motor.wheelState, 'spinning');
  assert.equal(snap.stageComplete, false);
  assert.ok(phase.drainEvents().some((event) => event.type === 'test-reset-required'));

  // Return the real handle to OFF, then deliberately TEST the now-ready rig.
  phase.interact('test');
  assert.equal(phase.snapshot().testAttempt, 'idle');
  phase.interact('test');
  assert.equal(phase.snapshot().testAttempt, 'armed');
  step(phase, 6);
  snap = phase.snapshot();
  assert.equal(snap.stageComplete, true);
});

test('hysteresis: pulling the trolley back off the bogie drops the bite only below the floor', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('level-drain');
  phase.interact('level-supply');
  step(phase, 8);
  pushTrolleyHome(phase);
  phase.interact('test');
  step(phase, 2);
  assert.equal(phase.snapshot().motor.wheelState, 'biting');

  // Small retreat: load 0.1 + 0.5*0.8 = 0.50 — above the 0.47 floor, still biting.
  phase.setTrolleyGrabbed(true);
  for (let i = 0; i < 20; i += 1) {
    phase.moveTrolley(-1, 50);
    phase.update(50);
  }
  phase.setTrolleyGrabbed(false);
  assert.ok(phase.snapshot().trolleyX > 0.74);
  assert.equal(phase.snapshot().motor.wheelState, 'biting');

  // Long retreat: well under the floor — the wheels break loose again.
  phase.setTrolleyGrabbed(true);
  for (let i = 0; i < 60; i += 1) {
    phase.moveTrolley(-1, 50);
    phase.update(50);
  }
  phase.setTrolleyGrabbed(false);
  step(phase, 0.5);
  assert.equal(phase.snapshot().motor.wheelState, 'spinning');
});

test('a natural solve records a contract-valid player trace with all four markers', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('level-drain');
  phase.interact('level-supply');
  step(phase, 8);
  pushTrolleyHome(phase);
  phase.interact('test');
  step(phase, 6);
  assert.equal(phase.snapshot().stageComplete, true);

  const trace = phase.buildTrace();
  assert.equal(trace.source, 'player');
  const validation = validateTrace(trace);
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.valid, true);
  const markers = trace.samples.filter((s) => s.marker).map((s) => s.marker);
  for (const required of Object.values(TRACE_MARKERS)) {
    assert.ok(markers.includes(required), `missing ${required}`);
  }
  // Left extreme comes first by construction: the trolley was parked there.
  assert.equal(trace.samples[0].marker, TRACE_MARKERS.LEFT_EXTREME);
  // Settled is the last word, and it sits over the drive bogie.
  assert.equal(trace.samples[trace.samples.length - 1].marker, TRACE_MARKERS.SETTLED);
  assert.ok(trace.settledX >= 0.85);
});

test('the recorded trace is rebased to the first grab, not the first footstep', () => {
  const { phase } = rig();
  phase.enter();
  // Ten seconds of reading the room before touching anything — none of this
  // is choreography Phase VI should replay.
  step(phase, 10);
  phase.interact('level-drain');
  phase.interact('level-supply');
  step(phase, 8);
  pushTrolleyHome(phase);
  phase.interact('test');
  step(phase, 6);
  const trace = phase.buildTrace();
  const validation = validateTrace(trace);
  assert.deepEqual(validation.errors, []);
  assert.equal(trace.samples[0].tMs, 0);
  assert.equal(trace.samples[0].marker, TRACE_MARKERS.LEFT_EXTREME);
  // Active manipulation plus the car's crawl is ~11s; the 18s of loitering
  // and charging before the grab must not inflate the loop.
  assert.ok(trace.durationMs < 16000, `durationMs ${trace.durationMs} should exclude pre-grab idle`);
});

test('devices bounce locally in states where they have nothing to do', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('level-drain');
  phase.interact('level-drain'); // already closed
  phase.interact('level-supply');
  phase.interact('level-supply'); // already open
  const bounces = phase.drainEvents().filter((e) => e.type === 'control-bounce');
  assert.equal(bounces.length, 2);
  // Nothing was reset: the repair is exactly where the player left it.
  step(phase, 8);
  assert.equal(Math.round(phase.snapshot().suspension.pressure), 100);
});

test('completion is one-shot even if update keeps running', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('level-drain');
  phase.interact('level-supply');
  step(phase, 8);
  pushTrolleyHome(phase);
  phase.interact('test');
  step(phase, 6);
  step(phase, 2);
  phase.drainEvents();
  step(phase, 1);
  const types = phase.drainEvents().map((e) => e.type);
  assert.ok(!types.includes('stage-complete'));
  assert.ok(!types.includes('car-move-complete'));
});

test('reset restores the unentered state and clears the recorded trace', () => {
  const { phase } = rig();
  phase.enter();
  pushTrolleyHome(phase);
  phase.reset();
  const snap = phase.snapshot();
  assert.equal(snap.entered, false);
  assert.equal(snap.trolleyX, 0);
  assert.equal(snap.stageComplete, false);
  assert.equal(snap.trace.sampleCount, 0);
  assert.equal(snap.motor.wheelState, 'idle');
});
