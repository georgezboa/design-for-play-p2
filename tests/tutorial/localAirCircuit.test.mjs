// Phase III local air circuit — locks the lesson flow (SYSTEM ARC LOCK §3)
// and the corrected door state chain (2026-08-02 fix):
//   LOCKED -> RELEASED ('door-release-ready', NOT complete)
//          -> OPENING (integration animation) -> OPEN (stage-complete)
//   airNetwork owns physics; this module never masks it with `|| complete`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createAirNetwork, AIR_NETWORK_DEFAULTS } from '../../src/tutorial/phases/airNetwork.js';
import {
  createLocalAirCircuit,
  LOCAL_AIR_CIRCUIT_DEFAULTS,
  LOCAL_AIR_CIRCUIT_PROMPTS,
} from '../../src/tutorial/phases/localAirCircuit.js';

function make() {
  const airNetwork = createAirNetwork();
  const phase = createLocalAirCircuit({ airNetwork });
  phase.enter();
  return { airNetwork, phase };
}

function step(phase, seconds, input = {}, dtMs = 50) {
  const iterations = Math.round((seconds * 1000) / dtMs);
  for (let i = 0; i < iterations; i += 1) phase.update(dtMs, input);
}

// Drive the room to the physical latch release (isolated bleed), no more.
function releaseLatch(phase) {
  phase.interact('isolate');
  step(phase, 2, { bleedHeld: true });
}

test('requires an injected shared airNetwork (no private pressure copies)', () => {
  assert.throws(() => createLocalAirCircuit({}));
  const { phase, airNetwork } = make();
  phase.interact('isolate');
  assert.equal(airNetwork.snapshot().branches.door.isolated, true);
});

test('bleed against live supply floors the needle, latch stays put, no completion', () => {
  const { phase } = make();
  step(phase, 3, { bleedHeld: true });
  const snap = phase.snapshot();
  assert.equal(snap.door.pressure, AIR_NETWORK_DEFAULTS.ventOpenFloor);
  assert.equal(snap.doorLatchReleased, false);
  assert.equal(snap.doorState, 'LOCKED');
  assert.equal(snap.stageComplete, false);
  assert.equal(phase.isComplete(), false);
  assert.equal(snap.stalledOnSupply, true);
});

test('stall hint fires once, after a full pulse cycle, and never repeats', () => {
  const { phase } = make();
  assert.equal(LOCAL_AIR_CIRCUIT_DEFAULTS.stallNoticeMs >= 1000, true);
  // Needle reaches the floor after ~0.82s; at 1.5s the accumulated stall
  // time (~0.68s) is still short of one pulse cycle: NO text yet.
  step(phase, 1.5, { bleedHeld: true });
  assert.equal(phase.snapshot().firstStallSeen, false);

  step(phase, 1.5, { bleedHeld: true }); // ~2.2s of stall: hint now
  assert.equal(phase.snapshot().firstStallSeen, true);
  const events = phase.drainEvents();
  assert.equal(events.filter((e) => e.type === 'supply-stall-first').length, 1);

  step(phase, 3, { bleedHeld: true });
  assert.equal(phase.drainEvents().some((e) => e.type === 'supply-stall-first'), false);
});

test('hint copy stays short and never names the answer', () => {
  assert.equal(LOCAL_AIR_CIRCUIT_PROMPTS.supplyStall, 'STILL REFILLING — TRACE THE PIPE BACK');
  assert.ok(!LOCAL_AIR_CIRCUIT_PROMPTS.supplyStall.includes('ISOLATE'));
});

test('latch release enters RELEASED with one ready event — but the stage is NOT complete', () => {
  const { phase } = make();
  releaseLatch(phase);
  const snap = phase.snapshot();
  assert.equal(snap.doorLatchReleased, true); // physics
  assert.equal(snap.doorState, 'RELEASED'); // puzzle chain
  assert.equal(snap.stageComplete, false); // door leaf has not moved
  assert.equal(phase.isComplete(), false);
  const events = phase.drainEvents();
  assert.equal(events.filter((e) => e.type === 'door-release-ready').length, 1);
  assert.equal(events.some((e) => e.type === 'stage-complete'), false);
});

test('re-pressurising while RELEASED re-bites the latch back to LOCKED', () => {
  const { phase, airNetwork } = make();
  releaseLatch(phase);
  assert.equal(phase.snapshot().doorState, 'RELEASED');

  // Player re-opens the valve before the door has moved:
  phase.interact('isolate');
  step(phase, 5, { bleedHeld: false });
  assert.ok(airNetwork.snapshot().branches.door.pressure > AIR_NETWORK_DEFAULTS.reengageThreshold);
  const snap = phase.snapshot();
  assert.equal(snap.doorLatchReleased, false); // physics really re-engaged
  assert.equal(snap.doorState, 'LOCKED'); // puzzle chain followed physics
  assert.equal(snap.stageComplete, false);
  assert.ok(phase.drainEvents().some((e) => e.type === 'door-relocked'));

  // And the room is still solvable afterwards (recover in place):
  phase.interact('isolate');
  step(phase, 2, { bleedHeld: true });
  assert.equal(phase.snapshot().doorState, 'RELEASED');
});

test('confirmDoorOpened() only succeeds after the latch is physically free', () => {
  const { phase } = make();
  assert.equal(phase.confirmDoorOpened(), false); // LOCKED: no
  assert.equal(phase.beginDoorOpening(), false); // nothing to open yet
  releaseLatch(phase);
  assert.equal(phase.confirmDoorOpened(), true); // RELEASED -> OPEN
  assert.equal(phase.snapshot().doorState, 'OPEN');
  assert.equal(phase.isComplete(), true);
});

test('beginDoorOpening moves RELEASED -> OPENING; OPENING also accepts confirmation', () => {
  const { phase } = make();
  releaseLatch(phase);
  assert.equal(phase.beginDoorOpening(), true);
  assert.equal(phase.snapshot().doorState, 'OPENING');
  assert.equal(phase.isComplete(), false);
  assert.equal(phase.confirmDoorOpened(), true);
  assert.equal(phase.snapshot().doorState, 'OPEN');
});

test('once OPEN the pawl holds: re-pressurising neither closes the door nor un-completes', () => {
  const { phase, airNetwork } = make();
  releaseLatch(phase);
  phase.beginDoorOpening();
  phase.confirmDoorOpened();
  phase.drainEvents();

  phase.interact('isolate'); // restore supply
  step(phase, 5, { bleedHeld: false });
  const snap = phase.snapshot();
  assert.ok(airNetwork.snapshot().branches.door.pressure > AIR_NETWORK_DEFAULTS.reengageThreshold);
  assert.equal(snap.doorLatchReleased, false); // physics re-engaged — EXPOSED, not masked
  assert.equal(snap.doorState, 'OPEN'); // but the open door stays open
  assert.equal(snap.stageComplete, true);
  assert.equal(phase.isComplete(), true);
  assert.equal(phase.drainEvents().some((e) => e.type === 'door-relocked'), false);
});

test('repeated animation callbacks are idempotent: exactly one stage-complete event', () => {
  const { phase } = make();
  releaseLatch(phase);
  phase.beginDoorOpening();
  assert.equal(phase.confirmDoorOpened(), true);
  assert.equal(phase.confirmDoorOpened(), false); // already OPEN
  assert.equal(phase.beginDoorOpening(), false); // no way back to OPENING
  assert.equal(phase.confirmDoorOpened(), false);
  assert.equal(phase.drainEvents().filter((e) => e.type === 'stage-complete').length, 1);
});

test('no venting once OPEN (no pointless hissing after the lesson)', () => {
  const { phase, airNetwork } = make();
  releaseLatch(phase);
  phase.confirmDoorOpened();
  step(phase, 0.5, { bleedHeld: true });
  assert.equal(airNetwork.snapshot().branches.door.venting, false);
});

test('wrong operations never wipe understood state (lock §3 recovery)', () => {
  const { phase, airNetwork } = make();
  phase.interact('isolate');
  step(phase, 1, { bleedHeld: true }); // partway down
  const partial = airNetwork.snapshot().branches.door.pressure;
  assert.ok(partial < 100 && partial > 0);
  phase.update(50, { bleedHeld: false });
  phase.interact('isolate');
  phase.interact('isolate');
  assert.equal(airNetwork.snapshot().branches.door.pressure, partial);
  assert.equal(phase.isComplete(), false);
});

test('reset restores LOCKED and the shared network entry state', () => {
  const { phase, airNetwork } = make();
  releaseLatch(phase);
  phase.confirmDoorOpened();
  assert.equal(phase.isComplete(), true);
  phase.reset();
  const snap = phase.snapshot();
  assert.equal(snap.doorState, 'LOCKED');
  assert.equal(snap.stageComplete, false);
  assert.equal(snap.isolateClosed, false);
  assert.equal(snap.firstStallSeen, false);
  assert.equal(airNetwork.snapshot().branches.door.pressure, 100);
});

test('interact ignores unknown targets and pre-entry calls', () => {
  const airNetwork = createAirNetwork();
  const phase = createLocalAirCircuit({ airNetwork });
  assert.equal(phase.interact('isolate'), false); // not entered
  phase.enter();
  assert.equal(phase.interact('latch'), false); // no latch button by design
  assert.equal(phase.interact('nope'), false);
});
