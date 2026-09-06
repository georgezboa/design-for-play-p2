// Phase VI — echoReplay (PAST RIDES THE LOAD) contract tests.
// Locks the VI-owned numbers for Appendix A.4: riderBonus 0.1 (window at
// echoX >= 0.75 with a healed suspension), biteHoldMs 900 (fits inside one
// hysteresis-extended canonical bite), departureMs 2600, canonical loop 6000.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createEchoReplay, ECHO_REPLAY_DEFAULTS } from '../../src/tutorial/phases/echoReplay.js';

const ALL_CLEAR = { interlockComplete: true, airPathOpen: true, bogiesSynced: true, suspensionHealth: 1 };

function playerTrace() {
  return {
    version: 1,
    durationMs: 8000,
    samples: [
      { tMs: 0, normalizedX: 0.2, marker: 'left-extreme' },
      { tMs: 2500, normalizedX: 0.5, marker: 'center-cross' },
      { tMs: 5000, normalizedX: 0.95, marker: 'right-extreme' },
      { tMs: 7000, normalizedX: 0.9, marker: 'settled' },
      { tMs: 8000, normalizedX: 0.9, marker: null },
    ],
    settledX: 0.9,
    source: 'player',
  };
}

/** Advance in stepMs increments, collecting drained events. */
function run(replay, totalMs, inputs = {}, stepMs = 25) {
  const events = [];
  for (let t = 0; t < totalMs; t += stepMs) {
    replay.update(stepMs, inputs);
    events.push(...replay.drainEvents());
  }
  return events;
}

function routeToDrive(replay) {
  assert.equal(replay.interact('route'), true);
  assert.equal(replay.snapshot().loadRoute, 'rear');
  replay.drainEvents();
}

test('invalid or missing trace degrades to the canonical fallback (lock §2.4)', () => {
  const replay = createEchoReplay({ trace: { garbage: true } });
  replay.enter();
  const snap = replay.snapshot();
  assert.equal(snap.traceSource, 'canonical');
  assert.equal(snap.traceDurationMs, 6000);
  replay.drainEvents();
});

test('a valid player trace is preserved, not canonicalized', () => {
  const replay = createEchoReplay({ trace: playerTrace() });
  replay.enter();
  const snap = replay.snapshot();
  assert.equal(snap.traceSource, 'player');
  assert.equal(snap.traceDurationMs, 8000);
  assert.equal(snap.settledX, 0.9);
});

test('loop 0 is observation-only: TEST bounces without spending an attempt', () => {
  const replay = createEchoReplay({});
  replay.enter();
  replay.drainEvents();
  assert.equal(replay.interact('test'), false);
  const events = replay.drainEvents();
  assert.deepEqual(
    events.map((e) => [e.type, e.reason]),
    [['control-bounce', 'observe-first-loop']],
  );
  const snap = replay.snapshot();
  assert.equal(snap.motor.energized, false);
  assert.equal(snap.motor.wheelState, 'idle');
  assert.equal(snap.observationLoop, true);
  assert.equal(replay.interact('route'), false);
  assert.equal(replay.drainEvents()[0].reason, 'observe-first-loop');
});

test('echo position interpolates along the trace samples', () => {
  const replay = createEchoReplay({});
  replay.enter();
  replay.drainEvents();
  replay.update(400, {});
  // canonical: 0.5 @ 0ms -> 0.15 @ 800ms => 0.325 at 400ms
  assert.ok(Math.abs(replay.snapshot().echoTrolleyX - 0.325) < 0.01);
});

test('semantic markers fire in trace order, once per loop', () => {
  const replay = createEchoReplay({});
  replay.enter();
  const events = run(replay, 6000);
  const markers = events.filter((e) => e.type === 'echo-marker').map((e) => e.marker);
  assert.deepEqual(markers, [
    'left-extreme',
    'center-cross',
    'right-extreme',
    'center-cross',
    'settled',
  ]);
  // exactly one arming window per canonical loop
  assert.equal(events.filter((e) => e.type === 'window-opened').length, 1);
  assert.equal(events.filter((e) => e.type === 'window-closed').length, 1);
});

test('canonical window opens around the right extreme and is wide enough to read', () => {
  const replay = createEchoReplay({});
  replay.enter();
  replay.drainEvents();
  let openedAt = null;
  let closedAt = null;
  for (let t = 0; t < 6000; t += 25) {
    replay.update(25, {});
    for (const e of replay.drainEvents()) {
      if (e.type === 'window-opened') openedAt = t + 25;
      if (e.type === 'window-closed') closedAt = t + 25;
    }
  }
  // echoX >= 0.75 between center-cross (2000) and right-extreme (3200): ~2857ms
  assert.ok(openedAt >= 2800 && openedAt <= 2950, `openedAt ${openedAt}`);
  // closes on the way back to centre: ~3714ms -> width ~850ms, no ms-QTE
  assert.ok(closedAt >= 3650 && closedAt <= 3800, `closedAt ${closedAt}`);
  assert.ok(closedAt - openedAt >= 800, 'window must be readable, not a flicker');
});

test('the loop wraps and loop 1 accepts input', () => {
  const replay = createEchoReplay({});
  replay.enter();
  replay.drainEvents(); // discard the loop-0 entry event
  const events = run(replay, 6000);
  const wraps = events.filter((e) => e.type === 'loop-start');
  assert.equal(wraps.length, 1);
  assert.equal(wraps[0].loopIndex, 1);
  assert.equal(replay.snapshot().loopIndex, 1);
});

test('stale rule: energizing outside the window cannot re-grip when load arrives', () => {
  const replay = createEchoReplay({});
  replay.enter();
  run(replay, 6000); // observation loop done
  routeToDrive(replay);
  // energize early in loop 1, far outside the window
  replay.update(100, ALL_CLEAR);
  replay.drainEvents();
  assert.equal(replay.interact('test'), true);
  let events = replay.drainEvents();
  assert.deepEqual(events.filter((e) => e.type === 'test-energized').map((e) => e.inWindow), [false]);
  assert.equal(replay.snapshot().attempt, 'stale');
  // run through the whole window: the chance visibly passes, wheels keep spinning
  events = run(replay, 4200, ALL_CLEAR);
  assert.equal(events.filter((e) => e.type === 'spinning-stale').length, 1);
  assert.equal(events.filter((e) => e.type === 'bite-started').length, 0);
  assert.equal(replay.snapshot().motor.wheelState, 'spinning');
  // the motor draws the abnormal LOW spinning current, not traction current
  assert.ok(replay.snapshot().motor.current <= 0.35);
});

test('wrong load route is a readable local failure, not a timing failure', () => {
  const replay = createEchoReplay({});
  replay.enter();
  run(replay, 6000);
  run(replay, 2950, ALL_CLEAR);
  assert.equal(replay.snapshot().windowActive, true);
  assert.equal(replay.snapshot().loadRoute, 'front');
  replay.interact('test');
  const types = replay.drainEvents().map((event) => event.type);
  assert.ok(types.includes('load-misrouted'));
  run(replay, 1400, ALL_CLEAR);
  assert.equal(replay.snapshot().stageComplete, false);
  assert.equal(replay.snapshot().motor.wheelState, 'spinning');
  replay.interact('test');
  routeToDrive(replay);
});

test('aligned run: energize inside the window -> bite -> departure -> complete', () => {
  const replay = createEchoReplay({});
  replay.enter();
  run(replay, 6000); // observation
  routeToDrive(replay);
  // advance into the arming window (opens ~2857)
  run(replay, 2950, ALL_CLEAR);
  assert.equal(replay.snapshot().windowActive, true);
  assert.equal(replay.interact('test'), true);
  const energizeEvents = replay.drainEvents();
  assert.deepEqual(energizeEvents.filter((e) => e.type === 'test-energized').map((e) => e.inWindow), [true]);
  // bite starts on the next tick; hold completes at ~+900ms, well inside the
  // hysteresis tail (~1540ms), then the departure clock runs out.
  let maxBitingCurrent = 0;
  const events = [];
  for (let t = 0; t < 5000; t += 25) {
    replay.update(25, ALL_CLEAR);
    events.push(...replay.drainEvents());
    const s = replay.snapshot();
    if (s.motor.wheelState === 'biting') {
      maxBitingCurrent = Math.max(maxBitingCurrent, s.motor.current);
    }
  }
  const order = events.map((e) => e.type);
  assert.ok(order.includes('bite-started'), 'must bite');
  assert.ok(order.includes('departure-started'), 'must depart');
  assert.ok(order.includes('stage-complete'), 'must complete');
  assert.ok(
    order.indexOf('bite-started') < order.indexOf('departure-started')
      && order.indexOf('departure-started') < order.indexOf('stage-complete'),
    'event order must be bite -> departure -> complete',
  );
  const snap = replay.snapshot();
  assert.equal(snap.stageComplete, true);
  assert.equal(snap.conditions.departed, true);
  // traction current is HIGH while biting (Gate 0 semantics)
  assert.ok(maxBitingCurrent > 0.35, `peak biting current ${maxBitingCurrent}`);
});

test('no departure while the Phase V branch is not synced (condition 5)', () => {
  const replay = createEchoReplay({});
  replay.enter();
  run(replay, 6000);
  routeToDrive(replay);
  run(replay, 2950, ALL_CLEAR);
  replay.interact('test');
  const events = run(replay, 2000, { ...ALL_CLEAR, bogiesSynced: false });
  assert.equal(events.filter((e) => e.type === 'bite-started').length, 1);
  assert.equal(events.filter((e) => e.type === 'departure-started').length, 0);
  assert.equal(replay.snapshot().stageComplete, false);
});

test('a late grab bites but breaks when the rhythm outruns the hold', () => {
  const replay = createEchoReplay({});
  replay.enter();
  run(replay, 6000);
  routeToDrive(replay);
  // energize near the END of the arming window (~3600ms): bites, but the
  // hysteresis tail ends (~4398ms) before the 900ms hold completes.
  run(replay, 3600, ALL_CLEAR);
  assert.equal(replay.snapshot().windowActive, true);
  replay.interact('test');
  replay.drainEvents();
  const events = run(replay, 1500, ALL_CLEAR);
  const types = events.map((e) => e.type);
  assert.ok(types.includes('bite-started'));
  assert.ok(types.includes('bite-broken'), 'hold must break at the hysteresis edge');
  assert.ok(!types.includes('departure-started'));
  const snap = replay.snapshot();
  assert.equal(snap.attempt, 'stale');
  assert.equal(snap.biteHeldMs, 0);
  assert.equal(snap.stageComplete, false);
});

test('local progress survives failures across loops; retry completes', () => {
  const replay = createEchoReplay({});
  replay.enter();
  run(replay, 6000);
  routeToDrive(replay);
  run(replay, 3600, ALL_CLEAR);
  replay.interact('test'); // late grab, will break
  run(replay, 1500, ALL_CLEAR);
  assert.equal(replay.snapshot().attempt, 'stale');
  // release, wait for the next loop's window, re-engage: must still complete
  replay.interact('test');
  run(replay, 6000 - 5100 + 2950, ALL_CLEAR); // finish this loop, into next window
  assert.equal(replay.snapshot().windowActive, true);
  assert.equal(replay.interact('test'), true);
  const events = run(replay, 5000, ALL_CLEAR);
  assert.ok(events.map((e) => e.type).includes('stage-complete'));
});

test('reset restores the pre-entry state', () => {
  const replay = createEchoReplay({});
  replay.enter();
  run(replay, 6000);
  routeToDrive(replay);
  run(replay, 2950, ALL_CLEAR);
  replay.interact('test');
  run(replay, 5000, ALL_CLEAR);
  assert.equal(replay.snapshot().stageComplete, true);
  replay.reset();
  const snap = replay.snapshot();
  assert.equal(snap.entered, false);
  assert.equal(snap.stageComplete, false);
  assert.equal(snap.loopIndex, 0);
  assert.equal(snap.motor.wheelState, 'idle');
  assert.equal(snap.motor.energized, false);
});

test('locked VI constants match Appendix A.4 expectations', () => {
  assert.equal(ECHO_REPLAY_DEFAULTS.riderBonus, 0.1);
  assert.equal(ECHO_REPLAY_DEFAULTS.biteHoldMs, 900);
  assert.equal(ECHO_REPLAY_DEFAULTS.departureMs, 2600);
});
