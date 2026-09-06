// Phase V READ THE BOGIE — pure-logic tests (SYSTEM ARC LOCK §5).
// The contradiction and the Gate 0 repair chain are locked here against the
// frozen bogieSnapshot, the shared airNetwork and the Phase-IV-locked motor.

import test from 'node:test';
import assert from 'node:assert/strict';

import { createAirNetwork } from '../../src/tutorial/phases/airNetwork.js';
import { createMotorAdhesion } from '../../src/tutorial/phases/motorAdhesion.js';
import { createBogieDiagnosis } from '../../src/tutorial/phases/bogieDiagnosis.js';

function rig() {
  const airNetwork = createAirNetwork();
  const motor = createMotorAdhesion();
  const phase = createBogieDiagnosis({ airNetwork, motor });
  return { airNetwork, motor, phase };
}

const LOAD = { trolleyX: 1, suspensionHealth: 1 };

function step(phase, seconds, dtMs = 50) {
  const iterations = Math.round((seconds * 1000) / dtMs);
  for (let i = 0; i < iterations; i += 1) phase.update(dtMs, LOAD);
}

function localizeFault(phase) {
  // Real test-stand grammar: prove A, return the knife switch to OFF, select
  // B, then apply the same test and inspect the non-travelling actuator.
  phase.interact('test');
  step(phase, 1.5);
  phase.interact('test');
  phase.interact('select-rear');
  phase.interact('test');
  step(phase, 1.5);
  assert.equal(phase.interact('inspect-actuator'), true);
  assert.equal(phase.snapshot().faultLocalized, true);
  phase.interact('test');
  phase.drainEvents();
}

test('the A/B selector builds one comparable observation at a time', () => {
  const { phase } = rig();
  phase.enter();
  assert.equal(phase.snapshot().selectedBogie, 'front');
  phase.interact('test');
  step(phase, 2);
  let snap = phase.snapshot();
  // Upstream evidence is genuinely normal on BOTH sides.
  assert.equal(snap.motor.energized, true);
  assert.equal(snap.motor.wheelState, 'biting'); // Phase IV load persists
  assert.equal(snap.front.contactorClosed, true);
  assert.equal(snap.rear.contactorClosed, true);
  assert.ok(snap.rear.linePressure >= 60); // the release line is charged
  assert.ok(snap.rear.axleLoad > 0.5);
  // And yet.
  assert.equal(snap.front.brakeReleased, true);
  assert.equal(snap.front.wheelTurning, true);
  assert.equal(snap.rear.brakeReleased, false); // seized piston stays clamped
  assert.equal(snap.rear.wheelTurning, false);
  assert.equal(snap.rear.fault, 'brake-actuator-seized');
  assert.equal(snap.faultLocalized, false);
  assert.ok(snap.observations.front);
  assert.equal(snap.observations.rear, null);
  assert.equal(phase.interact('inspect-actuator'), false);
  assert.equal(phase.drainEvents().find((e) => e.type === 'control-bounce').reason, 'compare-both-bogies');

  phase.interact('test');
  assert.equal(phase.interact('select-rear'), true);
  phase.interact('test');
  step(phase, 2);
  snap = phase.snapshot();
  assert.ok(snap.observations.front);
  assert.ok(snap.observations.rear);
  assert.equal(snap.observations.front.wheelTurning, true);
  assert.equal(snap.observations.rear.wheelTurning, false);
  assert.equal(phase.interact('inspect-actuator'), true);
  assert.equal(phase.snapshot().faultLocalized, true);
  assert.equal(snap.stageComplete, false);
});

test('the selector is interlocked and the actuator needs both calibrated tests', () => {
  const { phase } = rig();
  phase.enter();
  assert.equal(phase.interact('inspect-actuator'), false);
  assert.equal(phase.drainEvents().find((e) => e.type === 'control-bounce').reason, 'compare-both-bogies');
  phase.interact('test');
  step(phase, 1.5);
  assert.equal(phase.interact('select-rear'), false);
  assert.equal(phase.drainEvents().find((e) => e.type === 'control-bounce').reason, 'return-test-off');
  phase.interact('test');
  phase.interact('select-rear');
  phase.interact('test');
  step(phase, 1.5);
  assert.equal(phase.interact('inspect-actuator'), true);
  const localized = phase.drainEvents().find((e) => e.type === 'fault-localized');
  assert.deepEqual(localized.evidence, ['current-arrives', 'line-pressurized', 'piston-stationary']);
});

test('repair refuses without the full Gate 0 chain, naming each missing condition', () => {
  const { phase } = rig();
  phase.enter();

  phase.interact('repair');
  let bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'fault-not-localized');
  localizeFault(phase);

  phase.interact('repair'); // nothing done at all
  bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'not-isolated');

  phase.interact('brake-isolate');
  phase.interact('repair'); // isolated but still charged
  bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'still-pressurized');

  phase.setVentHeld(true);
  step(phase, 2.5); // 100 -> 0 at 55/s
  phase.setVentHeld(false);
  phase.interact('repair'); // flat but no service pin
  bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'no-service-lock');

  assert.equal(phase.snapshot().rear.repaired, false);
});

test('the service pin refuses to seat against a live or charged line', () => {
  const { phase } = rig();
  phase.enter();
  assert.equal(phase.interact('service-lock'), false);
  let bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'line-live');

  phase.interact('brake-isolate');
  assert.equal(phase.interact('service-lock'), false); // still pressurized
  bounce = phase.drainEvents().find((e) => e.type === 'control-bounce');
  assert.equal(bounce.reason, 'line-live');
});

test('the full chain completes: isolate -> vent -> pin -> repair -> unpin -> restore -> TEST turns both bogies', () => {
  const { phase } = rig();
  phase.enter();
  localizeFault(phase);
  assert.equal(phase.snapshot().rear.wheelTurning, false);
  phase.interact('brake-isolate');
  phase.setVentHeld(true);
  step(phase, 2.5);
  phase.setVentHeld(false);
  // Fail-safe: as the line dies the clamp bites. That is the safe state.
  assert.equal(phase.snapshot().rear.brakeReleased, false);
  assert.equal(phase.snapshot().brake.pressure, 0);

  phase.interact('service-lock');
  assert.equal(phase.snapshot().rear.serviceLockEngaged, true);
  phase.interact('repair');
  assert.equal(phase.snapshot().rear.repaired, true);
  phase.interact('service-lock'); // withdraw the pin
  assert.equal(phase.snapshot().rear.serviceLockEngaged, false);
  phase.interact('brake-isolate'); // restore the supply
  step(phase, 5); // recharge to >= release pressure
  assert.ok(phase.snapshot().brake.pressure >= 60);

  phase.interact('test');
  step(phase, 2);
  const snap = phase.snapshot();
  assert.equal(snap.rear.brakeReleased, true);
  assert.equal(snap.rear.wheelTurning, true);
  assert.equal(snap.front.wheelTurning, true);
  assert.equal(snap.stageComplete, true);
  const types = phase.drainEvents().map((e) => e.type);
  assert.ok(types.includes('bogie-repaired'));
  assert.ok(types.includes('stage-complete'));
});

test('the healthy side keeps working while the faulty branch is stripped', () => {
  const { phase } = rig();
  phase.enter();
  phase.interact('test');
  step(phase, 1.5);
  phase.interact('brake-isolate');
  phase.setVentHeld(true);
  step(phase, 2.5);
  phase.setVentHeld(false);
  // Mid-repair, motor still energized: the healthy bogie reads the header,
  // not the stripped branch, so it never stops turning.
  const snap = phase.snapshot();
  assert.equal(snap.front.wheelTurning, true);
  assert.equal(snap.brake.pressure, 0);
  assert.equal(snap.stageComplete, false); // completion needs the REAR bogie
});

test('repairing without restoring the supply cannot complete (fail-safe stays clamped)', () => {
  const { phase } = rig();
  phase.enter();
  localizeFault(phase);
  phase.interact('brake-isolate');
  phase.setVentHeld(true);
  step(phase, 2.5);
  phase.setVentHeld(false);
  phase.interact('service-lock');
  phase.interact('repair');
  phase.interact('service-lock');
  // No restore: the line is flat, the brake is applied even though the
  // piston is free. A repaired actuator with no release pressure still
  // does not turn.
  phase.interact('test');
  step(phase, 2);
  assert.equal(phase.snapshot().rear.wheelTurning, false);
  assert.equal(phase.snapshot().stageComplete, false);
});

test('stage-complete is one-shot and reset restores the contradiction', () => {
  const { phase } = rig();
  phase.enter();
  localizeFault(phase);
  phase.interact('brake-isolate');
  phase.setVentHeld(true);
  step(phase, 2.5);
  phase.setVentHeld(false);
  phase.interact('service-lock');
  phase.interact('repair');
  phase.interact('service-lock');
  phase.interact('brake-isolate');
  step(phase, 5);
  phase.interact('test');
  step(phase, 2);
  assert.equal(phase.snapshot().stageComplete, true);
  step(phase, 1);
  phase.drainEvents();
  step(phase, 1);
  assert.ok(!phase.drainEvents().some((e) => e.type === 'stage-complete'));

  phase.reset();
  phase.enter();
  phase.interact('test');
  step(phase, 1.5);
  const snap = phase.snapshot();
  assert.equal(snap.rear.wheelTurning, false);
  assert.equal(snap.front.wheelTurning, true);
  assert.equal(snap.stageComplete, false);
});
