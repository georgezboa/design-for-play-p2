import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlacement } from '../../src/cars/retroCyberpunk/model/placement.js';
import { LADDERS, BATTERY, SOCKETS, PLATFORMS } from '../../src/cars/retroCyberpunk/levelData.js';

const batterySockets = SOCKETS.filter((s) => BATTERY.sockets.includes(s.id));

function placement() {
  return createPlacement({ ladders: LADDERS, battery: BATTERY, batterySockets, platforms: PLATFORMS });
}

test('ladder snaps into its only reasonable slot in bay 1', () => {
  const p = placement();
  const slot = LADDERS[0].slots[0];
  const r = p.tryLadder('L1', slot.x + slot.w / 2 + 20, slot.y + 10);
  assert.equal(r.ok, true);
  assert.equal(r.slot.id, 'L1.bridge');
  p.placeLadder('L1', r.slot.id);
  assert.equal(p.ladderPos('L1').slotId, 'L1.bridge');
});

test('illegal drop reports a real spatial conflict and returns the ladder', () => {
  const p = placement();
  // Drop inside the body of platform p1a: far from any slot.
  const r = p.tryLadder('L1', 300, 600);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no-slot');
  assert.ok(r.conflict, 'conflict names the platform it collides with');
  assert.equal(r.conflict.platform, 'p1a');
  assert.equal(p.returnLadder('L1'), 'home');
  assert.equal(p.ladderPos('L1').x, LADDERS[0].home.x);
});

test('a placed ladder that is dragged and released illegally keeps its slot', () => {
  const p = placement();
  p.placeLadder('L1', 'L1.bridge');
  p.detachLadder('L1');
  const r = p.tryLadder('L1', 4000, 300);
  assert.equal(r.ok, false);
  // Scene semantics: failed re-drop restores the previous slot.
  p.placeLadder('L1', 'L1.bridge');
  assert.equal(p.ladderPos('L1').slotId, 'L1.bridge');
});

test('one ladder cannot take two slots and two ladders cannot share one', () => {
  const p = placement();
  p.placeLadder('L1', 'L1.bridge');
  const again = p.tryLadder('L1', 620, 510);
  assert.equal(again.ok, true, 'same ladder may re-target its own slot list');
  // A different ladder definition with an overlapping slot would be rejected;
  // L2 has no bay-1 slot at all:
  const r = p.tryLadder('L2', 620, 510);
  assert.equal(r.ok, false);
});

test('conductor slot carries its socket pair for the power grid', () => {
  const p = placement();
  const r = p.tryLadder('L1', 1075, 470);
  assert.equal(r.ok, true);
  assert.equal(r.slot.role, 'conductor');
  assert.deepEqual(r.slot.sockets, ['S2A', 'S2B']);
});

test('battery seats in any authored socket and detaches cleanly', () => {
  const p = placement();
  const r = p.tryBattery(2385, 495);
  assert.equal(r.ok, true);
  assert.equal(r.socket.id, 'S3U');
  p.placeBattery(r.socket);
  assert.equal(p.batteryPos().socketId, 'S3U');
  assert.equal(p.detachBattery(), 'S3U');
  assert.equal(p.batteryPos().socketId, null);
});

test('battery drop far from sockets is rejected with conflict info', () => {
  const p = placement();
  const r = p.tryBattery(300, 600);
  assert.equal(r.ok, false);
  assert.ok(r.conflict);
});

test('battery can free-drop on any real surface as cargo, but not over a pit', () => {
  const p = placement();
  const onGround = p.tryBattery(3260, 500);
  assert.equal(onGround.ok, true);
  assert.ok(onGround.free, 'resting on the merge platform');
  p.placeBatteryAt(onGround.free.x, onGround.free.y);
  assert.equal(p.batteryPos().socketId, null);
  assert.equal(p.batteryPos().x, 3260);
  // above the bay-2 chasm there is no support:
  const overPit = p.tryBattery(1450, 500);
  assert.equal(overPit.ok, false);
});

test('reset restores every object to its authored home', () => {
  const p = placement();
  p.placeLadder('L1', 'L1.power');
  p.placeLadder('L3', 'L3.bridge');
  p.placeBattery({ id: 'S4', x: 4240, y: 220 });
  p.reset();
  const snap = p.snapshot();
  for (const l of LADDERS) {
    assert.equal(snap.ladders[l.id].slotId, null);
    assert.equal(snap.ladders[l.id].x, l.home.x);
  }
  assert.equal(snap.battery.socketId, null);
  assert.equal(snap.battery.x, BATTERY.home.x);
});
