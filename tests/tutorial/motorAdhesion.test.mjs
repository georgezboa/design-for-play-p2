// Locks the motor/adhesion shared model (SYSTEM ARC LOCK §2.2):
//   - energized + insufficient drive load -> spinning, current high
//   - sufficient load -> biting, current dips, car moves
//   - adhesion hysteresis prevents threshold flicker
//   - trolley/health load mapping is monotonic and drive-bogie aware
// IV mapping constants are PROVISIONAL until Phase IV locks them (lock §11);
// the behavioural contracts here are final.

import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTOR_ADHESION_DEFAULTS, createMotorAdhesion } from '../../src/tutorial/phases/motorAdhesion.js';

function step(motor, seconds, dtMs = 50) {
  const iterations = Math.round((seconds * 1000) / dtMs);
  for (let i = 0; i < iterations; i += 1) motor.update(dtMs);
}

test('tuning invariant: spinning (unloaded) current is strictly below biting (load) current', () => {
  assert.ok(MOTOR_ADHESION_DEFAULTS.spinningCurrent < MOTOR_ADHESION_DEFAULTS.bitingCurrent);
});

test('idle when not energized; current stays zero', () => {
  const motor = createMotorAdhesion();
  step(motor, 1);
  const snap = motor.snapshot();
  assert.equal(snap.wheelState, 'idle');
  assert.equal(snap.current, 0);
  assert.equal(snap.wheelSpeed, 0);
});

test('spinning: wheels free-rev, current abnormally LOW, car does not move', () => {
  const motor = createMotorAdhesion();
  motor.setAxleLoad({ rear: 0.3 });
  motor.setEnergized(true);
  step(motor, 0.1);
  assert.equal(motor.snapshot().wheelState, 'spinning');
  step(motor, 2);
  const snap = motor.snapshot();
  assert.equal(snap.current, MOTOR_ADHESION_DEFAULTS.spinningCurrent);
  assert.ok(snap.current < MOTOR_ADHESION_DEFAULTS.bitingCurrent);
  assert.equal(snap.wheelSpeed, 1); // free-rev
  assert.equal(snap.carDisplacement, 0);
  assert.ok(motor.drainEvents().some((e) => e.type === 'wheel-spin-start'));
});

test('biting: wheel speed re-couples to car movement, load current rises HIGH', () => {
  const motor = createMotorAdhesion();
  motor.setAxleLoad({ rear: 0.8 });
  motor.setEnergized(true);
  step(motor, 0.5);
  const snap0 = motor.snapshot();
  assert.equal(snap0.wheelState, 'biting');
  assert.equal(snap0.current, MOTOR_ADHESION_DEFAULTS.bitingCurrent);
  assert.ok(snap0.current > MOTOR_ADHESION_DEFAULTS.spinningCurrent);
  // Coupling: while the car crawls, wheel speed equals the crawl rate.
  assert.equal(snap0.wheelSpeed, MOTOR_ADHESION_DEFAULTS.movePerSec);
  assert.ok(snap0.carDisplacement > 0);
  step(motor, 5); // 0.25/s -> full displacement in 4s
  const snap = motor.snapshot();
  assert.equal(snap.carDisplacement, 1);
  assert.equal(snap.wheelSpeed, 0); // move complete: wheels stop with the car
  const events = motor.drainEvents();
  assert.ok(events.some((e) => e.type === 'wheel-bite'));
  assert.ok(events.some((e) => e.type === 'car-move-complete'));
});

test('same contactor command: spinning current strictly below steady biting current', () => {
  const spinning = createMotorAdhesion();
  spinning.setAxleLoad({ rear: 0.3 });
  spinning.setEnergized(true);
  step(spinning, 2);

  const biting = createMotorAdhesion();
  biting.setAxleLoad({ rear: 0.8 });
  biting.setEnergized(true);
  step(biting, 2);

  assert.ok(spinning.snapshot().current < biting.snapshot().current);
  assert.ok(spinning.snapshot().wheelSpeed > biting.snapshot().wheelSpeed); // free-rev vs crawl
});

test('adhesion hysteresis: biting holds inside the band, drops below it', () => {
  const motor = createMotorAdhesion();
  motor.setEnergized(true);
  motor.setAxleLoad({ rear: 0.6 }); // above limit 0.55
  step(motor, 0.1);
  assert.equal(motor.snapshot().wheelState, 'biting');

  motor.setAxleLoad({ rear: 0.5 }); // below limit but inside band (0.55 - 0.08 = 0.47)
  step(motor, 0.1);
  assert.equal(motor.snapshot().wheelState, 'biting');

  motor.setAxleLoad({ rear: 0.4 }); // outside band
  step(motor, 0.1);
  assert.equal(motor.snapshot().wheelState, 'spinning');
});

test('de-energizing idles the wheels and holds displacement', () => {
  const motor = createMotorAdhesion();
  motor.setAxleLoad({ rear: 0.8 });
  motor.setEnergized(true);
  step(motor, 1);
  const moved = motor.snapshot().carDisplacement;
  motor.setEnergized(false);
  step(motor, 1);
  const snap = motor.snapshot();
  assert.equal(snap.wheelState, 'idle');
  assert.equal(snap.carDisplacement, moved);
  assert.equal(snap.current, 0);
});

test('load input: trolley shifts weight onto the drive bogie monotonically', () => {
  const motor = createMotorAdhesion();
  motor.setLoadInput({ trolleyX: 0, suspensionHealth: 1 });
  const low = motor.snapshot().axleLoad.rear;
  motor.setLoadInput({ trolleyX: 0.5, suspensionHealth: 1 });
  const mid = motor.snapshot().axleLoad.rear;
  motor.setLoadInput({ trolleyX: 1, suspensionHealth: 1 });
  const high = motor.snapshot().axleLoad.rear;
  assert.ok(low < mid && mid < high);
  assert.equal(high, 0.6); // (0.1 + 0.5*1) * (0.5 + 0.5*1) — Phase IV locked
});

test('load input: damaged suspension scales the transfer down', () => {
  const motor = createMotorAdhesion();
  motor.setLoadInput({ trolleyX: 1, suspensionHealth: 1 });
  const healthy = motor.snapshot().axleLoad.rear;
  motor.setLoadInput({ trolleyX: 1, suspensionHealth: 0 });
  const collapsed = motor.snapshot().axleLoad.rear;
  assert.ok(collapsed < healthy);
  assert.equal(collapsed, 0.3); // (0.1 + 0.5) * 0.5 — under the adhesion limit
});

test('drive bogie is configurable', () => {
  const motor = createMotorAdhesion({ driveBogie: 'front' });
  motor.setLoadInput({ trolleyX: 1, suspensionHealth: 1 });
  const snap = motor.snapshot();
  assert.equal(snap.driveBogie, 'front');
  assert.equal(snap.axleLoad.front, 0.6);
});

test('car-move-complete fires exactly once', () => {
  const motor = createMotorAdhesion();
  motor.setAxleLoad({ rear: 0.9 });
  motor.setEnergized(true);
  step(motor, 8);
  const events = motor.drainEvents();
  assert.equal(events.filter((e) => e.type === 'car-move-complete').length, 1);
});

test('reset clears state and events', () => {
  const motor = createMotorAdhesion();
  motor.setAxleLoad({ rear: 0.9 });
  motor.setEnergized(true);
  step(motor, 1);
  motor.drainEvents();
  motor.reset();
  const snap = motor.snapshot();
  assert.equal(snap.wheelState, 'idle');
  assert.equal(snap.carDisplacement, 0);
  assert.deepEqual(motor.drainEvents(), []);
});
