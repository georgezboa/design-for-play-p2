import test from 'node:test';
import assert from 'node:assert/strict';
import { createTraffic } from '../../src/cars/retroCyberpunk/model/traffic.js';
import { CARS, STOPS, CAR_SIZE } from '../../src/cars/retroCyberpunk/levelData.js';

function traffic() {
  return createTraffic({ cars: CARS, stops: STOPS, carSize: CAR_SIZE });
}

function run(t, ms, powered, step = 50) {
  for (let i = 0; i < ms; i += step) t.tick(step, powered);
}

test('unpowered car stays dark and parked off the route', () => {
  const t = traffic();
  run(t, 5000, () => false);
  const c = t.car('car2');
  assert.equal(c.mode, 'parked');
  assert.equal(t.platform('car2'), null, 'no boardable surface while dark');
});

test('power calls the car: it docks, locks for dwell, then runs its cycle', () => {
  const t = traffic();
  const events = [];
  run(t, 4000, () => true);
  events.push(...t.drainEvents());
  assert.ok(events.some((e) => e.type === 'car-called' && e.car === 'car2'));
  assert.ok(events.some((e) => e.type === 'car-docked' && e.car === 'car2' && e.stop === 'b2near'));
  const p = t.platform('car2');
  assert.ok(p, 'boardable while docked/travelling');
  // Dwell lock: platform does not move while boarding.
  if (t.car('car2').mode === 'dwell') assert.equal(p.locked, true);
  // Eventually it carries across the chasm and docks at the far stop.
  run(t, 12000, () => true);
  events.push(...t.drainEvents());
  assert.ok(events.some((e) => e.type === 'car-docked' && e.stop === 'b2far'));
});

test('losing power mid-route sends the car back to its park slot', () => {
  const t = traffic();
  let on = true;
  run(t, 6000, () => on);
  on = false;
  run(t, 6000, () => on);
  assert.equal(t.car('car2').mode, 'parked');
  assert.ok(t.drainEvents().some((e) => e.type === 'car-parked'));
});

test('branch switching reroutes traffic in real time', () => {
  const t = traffic();
  let branch = 'S3U';
  const pow = (id) => id === (branch === 'S3U' ? 'SIG3U' : 'SIG3L');
  run(t, 8000, pow);
  assert.notEqual(t.car('tram3').mode, 'parked');
  assert.equal(t.car('car3l').mode, 'parked');
  branch = 'S3L';
  run(t, 10000, pow);
  assert.equal(t.car('tram3').mode, 'parked', 'upper branch decays');
  assert.notEqual(t.car('car3l').mode, 'parked', 'lower branch takes over');
});

test('the always-on cargo lift runs its vertical cycle without any signal', () => {
  const t = traffic();
  run(t, 20000, () => false);
  const events = t.drainEvents();
  assert.ok(events.some((e) => e.type === 'car-docked' && e.car === 'car4' && e.stop === 'b4up'));
  assert.ok(events.some((e) => e.type === 'car-docked' && e.car === 'car4' && e.stop === 'b4low'));
});

test('platform surface stays flush with the stop line while dwelling', () => {
  const t = traffic();
  run(t, 5000, () => true);
  const p = t.platform('car2');
  if (t.car('car2').mode === 'dwell') {
    assert.equal(p.yTop, STOPS.b2near.y);
    assert.equal(p.dx, 0);
    assert.equal(p.dy, 0);
  }
});

test('first-dock event fires once per stop for the finale trigger', () => {
  const t = traffic();
  run(t, 30000, (id) => id === 'SIG5');
  const firsts = t.drainEvents().filter((e) => e.type === 'car-first-dock' && e.car === 'car5');
  const balcony = firsts.filter((e) => e.stop === 'b5balcony');
  assert.equal(balcony.length, 1, 'exactly one first-dock at the balcony across cycles');
  assert.equal(t.hasDockedAt('car5', 'b5balcony'), true);
});

test('reset restores every car to its authored start', () => {
  const t = traffic();
  run(t, 15000, () => true);
  t.reset();
  assert.equal(t.car('car2').mode, 'parked');
  assert.equal(t.car('car4').mode, 'dwell');
  assert.equal(t.car('car2').x, CARS.find((c) => c.id === 'car2').parkAt.x);
});
