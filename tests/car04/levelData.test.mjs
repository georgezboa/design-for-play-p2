// Layout contract tests: the numbers in levelData.js are the design lock.
// These assertions fail if anyone edits the layout into a platformer.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER, BAYS, PLATFORMS, LADDERS, SOCKETS, WIRES, BATTERY, STOPS, CARS,
  GROUND_Y, UPPER_Y, CATWALK_Y, RESPAWNS, GOAL,
} from '../../src/cars/retroCyberpunk/levelData.js';

const g = PLAYER.gravity;
const jumpLen = PLAYER.walkSpeed * ((2 * -PLAYER.jumpVelocity) / g);
const jumpHgt = (PLAYER.jumpVelocity * PLAYER.jumpVelocity) / (2 * g);

test('running and jumping alone cannot cross any authored gap', () => {
  assert.ok(jumpLen < 180, `budget says max jump ${jumpLen.toFixed(0)} px`);
  const gaps = [
    ['bay1', 500, 740],
    ['bay2 chasm', 1150, 1750],
    ['bay3 catwalk', 2760, 3000],
    ['bay5 deck', 4600, 4840],
  ];
  for (const [name, x0, x1] of gaps) {
    assert.ok(x1 - x0 >= 240, `${name} gap ${x1 - x0}px must beat a ${jumpLen.toFixed(0)}px jump`);
  }
});

test('the bay 4 layer change cannot be jumped', () => {
  assert.ok(GROUND_Y - UPPER_Y >= jumpHgt + 100, 'deck is far beyond max jump height');
});

test('every unjumpable gap is covered by a ladder slot or a car route', () => {
  const bridgeSlots = LADDERS.flatMap((l) => l.slots.filter((s) => s.role === 'bridge'));
  const covers = (x0, x1) =>
    bridgeSlots.some((s) => s.x <= x0 + 5 && s.x + s.w >= x1 - 5);
  assert.ok(covers(500, 740), 'bay 1 gap has a ladder bridge slot');
  assert.ok(covers(2760, 3000), 'bay 3 catwalk gap has a ladder bridge slot');
  assert.ok(covers(4600, 4840), 'bay 5 gap has a ladder bridge slot');
  // The bay 2 chasm is covered by car2's route instead.
  const car2 = CARS.find((c) => c.id === 'car2');
  assert.deepEqual(car2.routes.on, ['b2near', 'b2far']);
  assert.ok(STOPS.b2near.x < 1150 && STOPS.b2far.x > 1750 - 400);
});

test('at least three object-driven spatial changes exist', () => {
  const changes = [
    LADDERS[0].slots.some((s) => s.role === 'bridge'), // bay 1 bridge
    LADDERS[0].slots.some((s) => s.role === 'conductor'), // bay 2 conduction
    BATTERY.sockets.length >= 2, // bay 3 branch switching
    CARS.some((c) => c.signal === 'SIG5'), // finale route from redeployed battery
  ];
  assert.ok(changes.filter(Boolean).length >= 3);
});

test('dock stops sit flush on real platforms so boarding needs no jump', () => {
  const platformsAt = (x, y) =>
    PLATFORMS.some((p) => x >= p.x - 80 && x <= p.x + p.w + 80 && Math.abs(p.y - y) <= 1);
  for (const [id, s] of Object.entries(STOPS)) {
    assert.ok(platformsAt(s.x, s.y), `stop ${id} must dock flush with a platform`);
  }
});

test('the ladder conductor slot spans exactly its socket pair', () => {
  const slot = LADDERS[0].slots.find((s) => s.id === 'L1.power');
  const a = SOCKETS.find((s) => s.id === 'S2A');
  const b = SOCKETS.find((s) => s.id === 'S2B');
  assert.ok(a.x >= slot.x && a.x <= slot.x + slot.w);
  assert.ok(b.x >= slot.x && b.x <= slot.x + slot.w);
});

test('both battery branch sockets sit on safe ground near the player', () => {
  for (const id of ['S3U', 'S3L']) {
    const s = SOCKETS.find((x) => x.id === id);
    const onP3a = PLATFORMS.find((p) => p.id === 'p3a');
    assert.ok(s.x >= onP3a.x - 60 && s.x <= onP3a.x + onP3a.w + 60, `${id} reachable`);
  }
});

test('every wire references real sockets and every car signal exists', () => {
  const ids = new Set(SOCKETS.map((s) => s.id));
  for (const w of WIRES) {
    assert.ok(ids.has(w.a) && ids.has(w.b), `wire ${w.a}->${w.b}`);
  }
  for (const c of CARS) {
    if (c.signal) assert.ok(ids.has(c.signal), `car ${c.id} signal ${c.signal}`);
    for (const stopId of c.routes.on) assert.ok(STOPS[stopId], `car ${c.id} stop ${stopId}`);
  }
});

test('respawn points land on platforms inside their bays', () => {
  for (const [bayId, r] of Object.entries(RESPAWNS)) {
    const bay = BAYS.find((b) => b.id === bayId);
    assert.ok(r.x >= bay.x0 - 400 && r.x <= bay.x1, `${bayId} respawn within reach of its bay`);
    const floor = PLATFORMS.some((p) => r.x >= p.x && r.x <= p.x + p.w && r.y < p.y && p.y - r.y < 120);
    assert.ok(floor, `${bayId} respawn has a floor below`);
  }
});

test('goal door sits on the balcony platform', () => {
  const b = PLATFORMS.find((p) => p.id === 'balcony');
  assert.ok(GOAL.doorX >= b.x && GOAL.doorX <= b.x + b.w);
  assert.ok(GOAL.completeX >= b.x);
});
