// Locks the Phase III air-network numbers (SYSTEM ARC LOCK §11):
//   - venting an UN-isolated branch can never reach the release band
//   - isolate-then-vent reaches release with a readable long-hold
//   - latch hysteresis: releases below 30, re-engages only above 45
//   - the vent floor (55) sits strictly above the re-engage threshold (45)

import test from 'node:test';
import assert from 'node:assert/strict';
import { AIR_NETWORK_DEFAULTS, createAirNetwork } from '../../src/tutorial/phases/airNetwork.js';

function step(net, seconds, dtMs = 50) {
  const iterations = Math.round((seconds * 1000) / dtMs);
  for (let i = 0; i < iterations; i += 1) net.update(dtMs);
}

test('tuning invariant: vent floor strictly above re-engage threshold', () => {
  assert.ok(AIR_NETWORK_DEFAULTS.ventOpenFloor > AIR_NETWORK_DEFAULTS.reengageThreshold);
  assert.ok(AIR_NETWORK_DEFAULTS.reengageThreshold > AIR_NETWORK_DEFAULTS.releaseThreshold);
});

test('initial state: full pressure everywhere, latch engaged, supply flow', () => {
  const net = createAirNetwork();
  const snap = net.snapshot();
  assert.equal(snap.branches.door.pressure, 100);
  assert.equal(snap.branches.door.flow, 'supply');
  assert.equal(snap.doorLatch.released, false);
});

test('venting an un-isolated branch floors above the release band, latch never releases', () => {
  const net = createAirNetwork();
  net.setVenting('door', true);
  step(net, 10); // absurdly long hold: supply still wins
  const snap = net.snapshot();
  assert.equal(snap.branches.door.pressure, AIR_NETWORK_DEFAULTS.ventOpenFloor);
  assert.equal(snap.branches.door.flow, 'vent');
  assert.equal(snap.doorLatch.released, false);
  assert.equal(net.drainEvents().some((e) => e.type === 'door-latch-released'), false);
});

test('isolate then vent: pressure reaches the release band and the latch releases', () => {
  const net = createAirNetwork();
  net.setIsolated('door', true);
  net.setVenting('door', true);
  step(net, 1.5); // 55/s from 100: ~1.27s to cross 30 — a readable long-hold
  const snap = net.snapshot();
  assert.ok(snap.branches.door.pressure < AIR_NETWORK_DEFAULTS.releaseThreshold);
  assert.equal(snap.doorLatch.released, true);
  assert.ok(net.drainEvents().some((e) => e.type === 'door-latch-released'));
});

test('isolated vent drains all the way to zero given time', () => {
  const net = createAirNetwork();
  net.setIsolated('door', true);
  net.setVenting('door', true);
  step(net, 5);
  assert.equal(net.snapshot().branches.door.pressure, 0);
});

test('sealed branch holds pressure (isolated, not venting)', () => {
  const net = createAirNetwork();
  net.setIsolated('door', true);
  net.setVenting('door', true);
  step(net, 1.5); // below the release threshold: latch released
  net.setVenting('door', false);
  const held = net.snapshot().branches.door.pressure;
  step(net, 3);
  assert.equal(net.snapshot().branches.door.pressure, held);
  assert.equal(net.snapshot().branches.door.flow, 'sealed');
  // Hysteresis: latch stays released while sealed below the band.
  assert.equal(net.snapshot().doorLatch.released, true);
});

test('hysteresis: latch re-engages only after climbing above the re-engage threshold', () => {
  const net = createAirNetwork();
  net.setIsolated('door', true);
  net.setVenting('door', true);
  step(net, 2);
  net.setVenting('door', false);
  assert.equal(net.snapshot().doorLatch.released, true);

  net.setIsolated('door', false); // supply restored: 14/s recovery
  step(net, 0.5); // +7 bar: from ~0 to 7 — still released
  assert.equal(net.snapshot().doorLatch.released, true);

  step(net, 3); // crosses 45
  const snap = net.snapshot();
  assert.ok(snap.branches.door.pressure > AIR_NETWORK_DEFAULTS.reengageThreshold);
  assert.equal(snap.doorLatch.released, false);
  const events = net.drainEvents();
  assert.ok(events.some((e) => e.type === 'branch-restored' && e.branch === 'door'));
  assert.ok(events.some((e) => e.type === 'door-latch-reengaged'));
});

test('venting a re-pressurized open branch re-engages the latch (cannot cheat by bleeding)', () => {
  const net = createAirNetwork();
  net.setIsolated('door', true);
  net.setVenting('door', true);
  step(net, 2);
  net.setVenting('door', false);
  net.setIsolated('door', false);
  step(net, 4); // recovered to ~56
  net.setVenting('door', true); // bleed again WITHOUT isolating
  step(net, 2); // sinks to the 55 floor, still above 45
  assert.equal(net.snapshot().doorLatch.released, false);
});

test('branches are independent: door isolation does not starve suspension', () => {
  const net = createAirNetwork();
  net.setIsolated('door', true);
  net.setVenting('door', true);
  step(net, 2);
  assert.equal(net.snapshot().branches.suspension.pressure, 100);
  assert.equal(net.snapshot().branches.brake.pressure, 100);
});

test('recovering an un-isolated branch trends back to reservoir pressure', () => {
  const net = createAirNetwork();
  net.setVenting('door', true);
  step(net, 2); // at floor 55
  net.setVenting('door', false);
  step(net, 4); // +56 clamped at 100
  assert.equal(net.snapshot().branches.door.pressure, 100);
});

test('reset restores full pressure and clears events', () => {
  const net = createAirNetwork();
  net.setIsolated('door', true);
  net.setVenting('door', true);
  step(net, 2);
  net.drainEvents();
  net.reset();
  const snap = net.snapshot();
  assert.equal(snap.branches.door.pressure, 100);
  assert.equal(snap.branches.door.isolated, false);
  assert.equal(snap.doorLatch.released, false);
  assert.deepEqual(net.drainEvents(), []);
});

test('unknown branch ids are rejected without throwing', () => {
  const net = createAirNetwork();
  assert.equal(net.setIsolated('nope', true), false);
  assert.equal(net.setVenting('nope', true), false);
});

// ---- Gate 0: parallel-branch topology proofs -------------------------------

test('parallel: isolating the suspension branch never starves the door branch', () => {
  const net = createAirNetwork();
  net.setIsolated('suspension', true);
  step(net, 3);
  const snap = net.snapshot();
  assert.equal(snap.branches.suspension.isolated, true);
  assert.equal(snap.branches.door.pressure, 100);
  assert.equal(snap.branches.door.flow, 'supply');
  assert.equal(snap.branches.brake.pressure, 100);
});

test('parallel: venting the brake branch leaves door and suspension untouched', () => {
  const net = createAirNetwork();
  net.setIsolated('brake', true);
  net.setVenting('brake', true);
  step(net, 2);
  const snap = net.snapshot();
  assert.equal(snap.branches.brake.pressure, 0);
  assert.equal(snap.branches.door.pressure, 100);
  assert.equal(snap.branches.suspension.pressure, 100);
});

test('reservoir drop moves every un-isolated branch, sealed branches are immune', () => {
  const net = createAirNetwork();
  net.setIsolated('brake', true); // sealed: must NOT follow the header
  net.setReservoirPressure(40);
  step(net, 6); // equalise down at supply rate
  const snap = net.snapshot();
  assert.equal(snap.reservoirPressure, 40);
  assert.equal(snap.branches.door.pressure, 40);
  assert.equal(snap.branches.suspension.pressure, 40);
  assert.equal(snap.branches.brake.pressure, 100); // sealed, immune
  assert.ok(net.drainEvents().some((e) => e.type === 'reservoir-changed' && e.pressure === 40));
});

test('vent floor follows a lowered reservoir (no phantom supply)', () => {
  const net = createAirNetwork();
  net.setReservoirPressure(40);
  step(net, 6); // door now at 40
  net.setVenting('door', true);
  step(net, 5); // floor = min(55, 40) = 40
  assert.equal(net.snapshot().branches.door.pressure, 40);
});

test('reservoir write point clamps and rejects junk', () => {
  const net = createAirNetwork();
  assert.equal(net.setReservoirPressure(999), true);
  assert.equal(net.snapshot().reservoirPressure, 100); // clamped to header max
  assert.equal(net.setReservoirPressure(-5), true);
  assert.equal(net.snapshot().reservoirPressure, 0);
  assert.equal(net.setReservoirPressure('high'), false);
});

test('every branch exposes an independent read point, write points and flow feedback', () => {
  const net = createAirNetwork();
  for (const branch of ['door', 'suspension', 'brake']) {
    assert.equal(net.setIsolated(branch, true), true); // write: valve
    assert.equal(net.setVenting(branch, true), true); // write: vent
    net.update(50); // read: derived state
    const snap = net.snapshot().branches[branch];
    assert.equal(snap.isolated, true);
    assert.equal(snap.venting, true);
    assert.equal(snap.flow, 'vent'); // visible-feedback discriminator
    assert.equal(typeof snap.pressure, 'number');
  }
});
