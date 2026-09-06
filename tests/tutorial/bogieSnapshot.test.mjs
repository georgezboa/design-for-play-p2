// Locks the bogie snapshot derivation (SYSTEM ARC LOCK §2.3):
//   - healthy bogie: pressure releases the brake, full chain turns the wheel
//   - faulty bogie: every upstream signal normal, axle still does not turn
//   - repair safety interlock: isolated AND bled, or repair() refuses
//   - after repair + re-pressurization the chain closes

import test from 'node:test';
import assert from 'node:assert/strict';
import { BOGIE_DEFAULTS, createBogie } from '../../src/tutorial/phases/bogieSnapshot.js';
import { createMotorAdhesion } from '../../src/tutorial/phases/motorAdhesion.js';

function bitingMotor() {
  const motor = createMotorAdhesion();
  motor.setAxleLoad({ front: 0.2, rear: 0.8 });
  motor.setEnergized(true);
  motor.update(50);
  return motor;
}

test('healthy bogie: line pressure releases the brake and the wheel turns', () => {
  const bogie = createBogie({ id: 'rear' });
  const motor = bitingMotor();
  const motorSnap = motor.snapshot();
  bogie.update(50, { motorSnap, brakeLinePressure: 100 });
  const snap = bogie.snapshot({ motorSnap, brakeLinePressure: 100 });
  assert.equal(snap.contactorClosed, true);
  assert.ok(snap.current > 0);
  assert.equal(snap.linePressure, 100);
  assert.equal(snap.axleLoad, 0.8);
  assert.equal(snap.brakeReleased, true);
  assert.equal(snap.wheelTurning, true);
  assert.equal(snap.fault, null);
  assert.ok(bogie.drainEvents().some((e) => e.type === 'brake-released' && e.id === 'rear'));
});

test('faulty bogie: identical upstream evidence, wheel does not turn', () => {
  const bogie = createBogie({ id: 'rear', fault: 'brake-actuator-seized' });
  const motor = bitingMotor();
  const motorSnap = motor.snapshot();
  bogie.update(50, { motorSnap, brakeLinePressure: 100 });
  const snap = bogie.snapshot({ motorSnap, brakeLinePressure: 100 });
  // Everything the player learned to check in II/III/IV reads NORMAL...
  assert.equal(snap.contactorClosed, true);
  assert.ok(snap.current > 0);
  assert.equal(snap.linePressure, 100);
  assert.ok(snap.axleLoad >= 0.55);
  // ...but the chain is broken locally.
  assert.equal(snap.brakeReleased, false);
  assert.equal(snap.wheelTurning, false);
  assert.equal(snap.fault, 'brake-actuator-seized');
});

test('all three fault kinds jam the release identically', () => {
  for (const fault of ['brake-actuator-seized', 'cutoff-valve-closed', 'mechanical-pin']) {
    const bogie = createBogie({ id: 'front', fault });
    const motorSnap = bitingMotor().snapshot();
    bogie.update(50, { motorSnap, brakeLinePressure: 100 });
    assert.equal(bogie.snapshot({ motorSnap, brakeLinePressure: 100 }).brakeReleased, false);
  }
});

test('repair refuses at every unsafe step of the chain (Gate 0)', () => {
  const bogie = createBogie({ id: 'rear', fault: 'mechanical-pin' });
  // Not isolated:
  assert.equal(bogie.repair({ branchIsolated: false, branchPressure: 0 }), false);
  // Isolated but not vented:
  assert.equal(bogie.repair({ branchIsolated: true, branchPressure: 80 }), false);
  // Isolated and vented but NO mechanical service lock:
  assert.equal(bogie.repair({ branchIsolated: true, branchPressure: 0 }), false);
  assert.equal(bogie.isRepaired(), false);
});

test('service lock refuses to seat against a live or charged actuator', () => {
  const bogie = createBogie({ id: 'rear', fault: 'brake-actuator-seized' });
  assert.equal(bogie.engageServiceLock({ branchIsolated: false, branchPressure: 0 }), false);
  assert.equal(
    bogie.engageServiceLock({ branchIsolated: true, branchPressure: BOGIE_DEFAULTS.safeRepairPressure }),
    false,
  );
  assert.equal(bogie.snapshot({}).serviceLockEngaged, false);
});

test('full safe chain: isolate -> vent -> service lock -> repair -> unlock -> re-pressurize -> TEST', () => {
  const bogie = createBogie({ id: 'rear', fault: 'cutoff-valve-closed' });
  const safe = { branchIsolated: true, branchPressure: BOGIE_DEFAULTS.safeRepairPressure - 1 };
  assert.equal(bogie.engageServiceLock(safe), true);
  assert.equal(bogie.snapshot({}).serviceLockEngaged, true);
  assert.equal(bogie.repair(safe), true);
  assert.equal(bogie.removeServiceLock(), true);
  const events = bogie.drainEvents();
  assert.ok(events.some((e) => e.type === 'service-lock-engaged'));
  assert.ok(events.some((e) => e.type === 'bogie-repaired'));
  assert.ok(events.some((e) => e.type === 'service-lock-removed'));

  const motor = bitingMotor();
  const motorSnap = motor.snapshot();
  bogie.update(50, { motorSnap, brakeLinePressure: 100 });
  const snap = bogie.snapshot({ motorSnap, brakeLinePressure: 100 });
  assert.equal(snap.repaired, true);
  assert.equal(snap.brakeReleased, true);
  assert.equal(snap.wheelTurning, true);
});

test('low line pressure keeps even a healthy brake applied (fail-safe)', () => {
  const bogie = createBogie({ id: 'front' });
  const motorSnap = bitingMotor().snapshot();
  bogie.update(50, { motorSnap, brakeLinePressure: BOGIE_DEFAULTS.brakeReleasePressure - 1 });
  const snap = bogie.snapshot({ motorSnap, brakeLinePressure: 50 });
  assert.equal(snap.brakeReleased, false);
  assert.equal(snap.wheelTurning, false);
});

test('unknown fault kinds are rejected', () => {
  const bogie = createBogie({ id: 'rear' });
  bogie.setFault('gremlins');
  assert.equal(bogie.snapshot({}).fault, null);
  bogie.setFault('mechanical-pin');
  assert.equal(bogie.snapshot({}).fault, 'mechanical-pin');
});

test('missing inputs degrade to safe zeros instead of throwing', () => {
  const bogie = createBogie({ id: 'rear' });
  bogie.update(50, {});
  const snap = bogie.snapshot({});
  assert.equal(snap.contactorClosed, false);
  assert.equal(snap.current, 0);
  assert.equal(snap.axleLoad, 0);
  assert.equal(snap.wheelTurning, false);
});

test('reset restores a defined entry state: lock, repair and release all cleared', () => {
  const bogie = createBogie({ id: 'rear', fault: 'mechanical-pin' });
  const safe = { branchIsolated: true, branchPressure: 0 };
  bogie.engageServiceLock(safe);
  bogie.repair(safe);
  bogie.drainEvents();
  bogie.reset();
  const snap = bogie.snapshot({});
  assert.equal(bogie.isRepaired(), false);
  assert.equal(snap.serviceLockEngaged, false);
  assert.equal(snap.brakeReleased, false);
  assert.deepEqual(bogie.drainEvents(), []);
});
