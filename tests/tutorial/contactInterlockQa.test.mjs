// Phase II — CONTACT interlock scenario-level QA tests (Wave 3, Agent D).
//
// Scope: everything ABOVE the unit level of contactInterlock.test.mjs:
//   1. five-visual-state distinguishability from snapshot() + events alone
//   2. event ordering on the correct route and on early POWER
//   3. one-shot guarantees under repeated interact/update
//   4. reset-replay equivalence with the first run
//   5. illegal-input robustness (bad deltas, unknown targets, post-destroy)
//
// Fixture states come from contactInterlockQa.mjs (driveToState), the same
// entry point integration-owner will reuse for browser QA routes.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_INTERLOCK_DEFAULTS,
  createContactInterlock,
} from '../../src/tutorial/phases/contactInterlock.js';
import { shouldFreezePhase2QAState } from '../../src/tutorial/qa/phase2Qa.js';
import {
  QA_STATE_NAMES,
  QA_VISUAL_STATES,
  VISUAL_STATE_FIXTURE,
  CORRECT_ROUTE_EVENTS,
  SNAPSHOT_DISCRIMINANT_FIELDS,
  createQaRig,
  driveToState,
  driveAllStates,
  stepSolveRelay,
  visualSignature,
  eventTypes,
} from './contactInterlockQa.mjs';

const EPS = 1e-9;

it('keeps the entry QA route playable and freezes screenshot fixtures', () => {
  assert.equal(shouldFreezePhase2QAState('entry'), false);
  QA_STATE_NAMES.filter((name) => name !== 'entry').forEach((name) => {
    assert.equal(shouldFreezePhase2QAState(name), true, name);
  });
});

function typesOf(events) {
  return events.map((e) => e.type);
}

// ---------------------------------------------------------------------------
// Fixture sanity: every named state drives to its locked logical values.
// ---------------------------------------------------------------------------

describe('contactInterlockQa fixtures', () => {
  it('covers exactly the nine locked QA states', () => {
    assert.deepEqual([...QA_STATE_NAMES], [
      'entry',
      'power-fail',
      'latch-closed',
      'signal-mid',
      'relay-waiting',
      'energized',
      'complete',
      'reset-replay',
      'panel-open',
    ]);
  });

  it('rejects unknown state names', () => {
    assert.throws(() => driveToState('nope'), RangeError);
  });

  it('entry: entered, nothing closed, no events', () => {
    const { snapshot, events } = driveToState('entry');
    assert.equal(snapshot.entered, true);
    assert.equal(snapshot.destroyed, false);
    assert.equal(snapshot.latchClosed, false);
    assert.equal(snapshot.signalProgress, 0);
    assert.equal(snapshot.preRelayProgress, 0);
    assert.equal(snapshot.relayWaiting, false);
    assert.equal(snapshot.postRelayProgress, 0);
    assert.equal(snapshot.circuitEnergized, false);
    assert.equal(snapshot.contactorClosed, false);
    assert.equal(snapshot.complete, false);
    assert.equal(snapshot.lastFault, null);
    assert.deepEqual(events, []);
  });

  it('panel-open: logically the entry state (the close-up opens caller-side)', () => {
    const entry = driveToState('entry');
    const panel = driveToState('panel-open');
    assert.deepEqual(panel.snapshot, entry.snapshot);
    assert.deepEqual(typesOf(panel.events), typesOf(entry.events));
  });

  it('power-fail: rejected POWER, open-circuit fault, bounce event only', () => {
    const { snapshot, events } = driveToState('power-fail');
    assert.equal(snapshot.latchClosed, false);
    assert.equal(snapshot.complete, false);
    assert.equal(snapshot.lastFault, 'open-circuit');
    assert.deepEqual(typesOf(events), ['contactor-bounce']);
  });

  it('latch-closed: latch closed, signal not yet propagating', () => {
    const { snapshot, events } = driveToState('latch-closed');
    assert.equal(snapshot.latchClosed, true);
    assert.equal(snapshot.signalProgress, 0);
    assert.equal(snapshot.circuitEnergized, false);
    assert.equal(snapshot.lastFault, null);
    assert.deepEqual(typesOf(events), ['latch-reset', 'trace-started']);
  });

  it('signal-mid: progress strictly inside (0, 1), not yet energized', () => {
    const { snapshot, events } = driveToState('signal-mid');
    assert.equal(snapshot.latchClosed, true);
    assert.ok(snapshot.signalProgress > 0 + EPS, 'progress must be > 0');
    assert.ok(snapshot.signalProgress < 1 - EPS, 'progress must be < 1');
    assert.ok(snapshot.preRelayProgress > 0 && snapshot.preRelayProgress < 1);
    assert.equal(snapshot.relayWaiting, false);
    assert.equal(snapshot.circuitEnergized, false);
    assert.equal(snapshot.contactorClosed, false);
    assert.deepEqual(typesOf(events), ['latch-reset', 'trace-started']);
  });

  it('relay-waiting: signal parked at the cabinet, case unbridged', () => {
    const { snapshot, events } = driveToState('relay-waiting');
    assert.equal(snapshot.latchClosed, true);
    assert.equal(snapshot.preRelayProgress, 1);
    assert.equal(snapshot.relayWaiting, true);
    assert.equal(snapshot.relayBridged, false);
    assert.equal(snapshot.postRelayProgress, 0);
    assert.equal(snapshot.circuitEnergized, false);
    assert.equal(snapshot.complete, false);
    assert.deepEqual(typesOf(events), [
      'latch-reset',
      'trace-started',
      'trace-reached-relay',
    ]);
  });

  it('relay-waiting: POWER bounces locally with the relay-open fault', () => {
    const rig = createQaRig();
    rig.interlock.enter();
    rig.interlock.interact('latch');
    rig.interlock.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    const result = rig.interlock.interact('power');
    rig.collect();
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'relay-open');
    assert.equal(rig.interlock.snapshot().lastFault, 'relay-open');
    assert.equal(rig.interlock.snapshot().complete, false);
    assert.equal(rig.events.filter((e) => e.type === 'contactor-bounce').length, 1);
    // The parked signal is unaffected: still waiting, still retryable.
    assert.equal(rig.interlock.snapshot().relayWaiting, true);
  });

  it('energized: relay bridged, propagation done, POWER not yet closed', () => {
    const { snapshot, events } = driveToState('energized');
    assert.equal(snapshot.signalProgress, 1);
    assert.equal(snapshot.preRelayProgress, 1);
    assert.equal(snapshot.postRelayProgress, 1);
    assert.equal(snapshot.relayWaiting, false);
    assert.equal(snapshot.circuitEnergized, true);
    assert.equal(snapshot.contactorClosed, false);
    assert.equal(snapshot.powerDelivered, false);
    assert.equal(snapshot.complete, false);
    assert.deepEqual(typesOf(events), [
      'latch-reset',
      'trace-started',
      'trace-reached-relay',
      'trace-energized',
    ]);
  });

  it('complete: contactor closed, traction delivered', () => {
    const { snapshot, events } = driveToState('complete');
    assert.equal(snapshot.contactorClosed, true);
    assert.equal(snapshot.powerDelivered, true);
    assert.equal(snapshot.complete, true);
    assert.equal(snapshot.lastFault, null);
    assert.deepEqual(typesOf(events), [...CORRECT_ROUTE_EVENTS]);
  });

  it('driveAllStates returns every fixture with snapshot + events', () => {
    const all = driveAllStates();
    assert.deepEqual(Object.keys(all).sort(), [...QA_STATE_NAMES].sort());
    for (const name of QA_STATE_NAMES) {
      assert.equal(typeof all[name].snapshot, 'object');
      assert.ok(Array.isArray(all[name].events));
    }
  });
});

// ---------------------------------------------------------------------------
// Task 1 — five-visual-state distinguishability (画面可驱动性).
// Every pair of visual states must be separable using ONLY snapshot()
// discriminant fields, or — failing that — unambiguously by the most recent
// event. A pair that cannot be separated at all is a LOGIC-LAYER GAP and
// fails this suite.
// ---------------------------------------------------------------------------

describe('visual-state distinguishability', () => {
  const fixtures = {};
  for (const visual of QA_VISUAL_STATES) {
    fixtures[visual] = driveToState(VISUAL_STATE_FIXTURE[visual]);
  }

  it('maps each of the five visual states to a fixture', () => {
    for (const visual of QA_VISUAL_STATES) {
      assert.ok(VISUAL_STATE_FIXTURE[visual], `no fixture for ${visual}`);
      assert.ok(QA_STATE_NAMES.includes(VISUAL_STATE_FIXTURE[visual]));
    }
  });

  it('all five visual states have pairwise-distinct snapshot signatures', () => {
    const gaps = [];
    for (let i = 0; i < QA_VISUAL_STATES.length; i += 1) {
      for (let j = i + 1; j < QA_VISUAL_STATES.length; j += 1) {
        const a = QA_VISUAL_STATES[i];
        const b = QA_VISUAL_STATES[j];
        const sigA = visualSignature(fixtures[a]);
        const sigB = visualSignature(fixtures[b]);
        const sameSnapshot = SNAPSHOT_DISCRIMINANT_FIELDS.every(
          (f) => Object.is(sigA[f], sigB[f]),
        );
        if (!sameSnapshot) continue;
        // Snapshot-identical: fall back to most-recent-event disambiguation.
        const lastA = fixtures[a].events.at(-1)?.type ?? null;
        const lastB = fixtures[b].events.at(-1)?.type ?? null;
        if (lastA === lastB) {
          gaps.push(`${a} vs ${b}: identical snapshot AND same last event (${lastA})`);
        }
      }
    }
    assert.deepEqual(
      gaps,
      [],
      `LOGIC-LAYER GAP — visual states indistinguishable from snapshot + events:\n${gaps.join('\n')}`,
    );
  });

  it('dormant vs power-fail differ ONLY via lastFault (known thin seam)', () => {
    const dormant = visualSignature(fixtures.dormant);
    const powerFail = visualSignature(fixtures['power-fail']);
    const differing = SNAPSHOT_DISCRIMINANT_FIELDS.filter(
      (f) => !Object.is(dormant[f], powerFail[f]),
    );
    assert.deepEqual(differing, ['lastFault']);
    assert.equal(powerFail.lastFault, 'open-circuit');
    // And the transient itself is event-driven:
    assert.equal(fixtures['power-fail'].events.at(-1).type, 'contactor-bounce');
  });

  it('signal-mid signature carries a usable propagation front position', () => {
    const sig = visualSignature(fixtures['signal-moving']);
    assert.equal(sig.latchClosed, true);
    assert.ok(sig.signalProgress > 0 && sig.signalProgress < 1);
  });

  it('each visual state carries the events its one-shot visuals need', () => {
    // power-fail visuals (衔铁弹回 / 断点红闪 / 壳顶灯单闪) hang off contactor-bounce.
    assert.ok(typesOf(fixtures['power-fail'].events).includes('contactor-bounce'));
    // signal-moving visuals (门闩压入 / 逐段点亮 / 前锋) hang off latch-reset + trace-started + progress.
    assert.deepEqual(typesOf(fixtures['signal-moving'].events), [
      'latch-reset',
      'trace-started',
    ]);
    // energized steady state reachable via trace-energized.
    assert.ok(typesOf(fixtures.energized.events).includes('trace-energized'));
    // complete visuals (衔铁吸合 / 车厢灯序列) hang off contactor-closed + traction-enabled.
    assert.ok(typesOf(fixtures.complete.events).includes('contactor-closed'));
    assert.ok(typesOf(fixtures.complete.events).includes('traction-enabled'));
  });
});

// ---------------------------------------------------------------------------
// Task 2 — event ordering.
// ---------------------------------------------------------------------------

describe('event ordering', () => {
  it('correct route emits the locked six-event sequence in order', () => {
    const { events } = driveToState('complete');
    assert.deepEqual(typesOf(events), [...CORRECT_ROUTE_EVENTS]);
  });

  it('event payloads carry snapshot data but no Phaser objects', () => {
    const { events } = driveToState('complete');
    for (const evt of events) {
      assert.equal(typeof evt.type, 'string');
      // Payloads must be JSON-serializable plain data (renderer-safe).
      assert.doesNotThrow(() => JSON.stringify(evt));
      if (evt.type !== 'contactor-bounce') {
        assert.equal(typeof evt.signalProgress, 'number');
      }
    }
  });

  it('early POWER produces exactly one contactor-bounce and nothing else', () => {
    const { events } = driveToState('power-fail');
    assert.deepEqual(typesOf(events), ['contactor-bounce']);
    assert.equal(events[0].lastFault, 'open-circuit');
  });

  it('POWER during transit produces contactor-bounce, correct route resumes cleanly', () => {
    const rig = createQaRig();
    rig.interlock.enter();
    rig.interlock.interact('latch');
    rig.interlock.update(200);
    rig.interlock.interact('power'); // rejected: signal-in-transit
    stepSolveRelay(rig); // player bridges the cabinet while the signal is in transit
    rig.interlock.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    rig.interlock.interact('power'); // accepted
    rig.collect();
    assert.deepEqual(typesOf(rig.events), [
      'latch-reset',
      'trace-started',
      'contactor-bounce',
      'trace-reached-relay',
      'trace-energized',
      'contactor-closed',
      'traction-enabled',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Task 3 — one-shot guarantees.
// ---------------------------------------------------------------------------

describe('one-shot guarantees', () => {
  it('repeated latch interact does not re-emit latch-reset / trace-started', () => {
    const rig = createQaRig();
    rig.interlock.enter();
    rig.interlock.interact('latch');
    rig.interlock.update(100);
    rig.interlock.interact('latch');
    rig.interlock.interact('latch');
    rig.collect();
    assert.equal(rig.events.filter((e) => e.type === 'latch-reset').length, 1);
    assert.equal(rig.events.filter((e) => e.type === 'trace-started').length, 1);
  });

  it('repeated update past progress=1 does not re-emit trace-energized', () => {
    const rig = createQaRig();
    rig.interlock.enter();
    rig.interlock.interact('latch');
    stepSolveRelay(rig); // bridged cabinet lets the signal run the full route
    for (let i = 0; i < 10; i += 1) {
      rig.interlock.update(550); // each alone is enough to finish propagation
    }
    rig.collect();
    assert.equal(rig.events.filter((e) => e.type === 'trace-energized').length, 1);
    assert.equal(rig.events.filter((e) => e.type === 'trace-reached-relay').length, 1);
    assert.equal(rig.interlock.snapshot().signalProgress, 1);
  });

  it('repeated POWER after completion does not re-emit success events', () => {
    const rig = createQaRig();
    rig.interlock.enter();
    rig.interlock.interact('latch');
    stepSolveRelay(rig);
    rig.interlock.update(550);
    for (let i = 0; i < 5; i += 1) {
      rig.interlock.interact('power');
    }
    rig.collect();
    assert.equal(rig.events.filter((e) => e.type === 'contactor-closed').length, 1);
    assert.equal(rig.events.filter((e) => e.type === 'traction-enabled').length, 1);
  });

  it('drainEvents after fixture driving leaves the queue empty', () => {
    const rig = createQaRig();
    driveToState('complete', rig.interlock);
    assert.deepEqual(rig.interlock.drainEvents(), []);
  });
});

// ---------------------------------------------------------------------------
// Task 4 — reset-replay equivalence.
// ---------------------------------------------------------------------------

describe('reset-replay', () => {
  it('replay terminal snapshot deep-equals the first complete run', () => {
    const first = driveToState('complete');
    const replay = driveToState('reset-replay');
    assert.deepEqual(replay.snapshot, first.snapshot);
  });

  it('replay event sequence deep-equals the first correct route', () => {
    const first = driveToState('complete');
    const replay = driveToState('reset-replay');
    assert.deepEqual(typesOf(replay.events), typesOf(first.events));
    assert.deepEqual(typesOf(replay.events), [...CORRECT_ROUTE_EVENTS]);
  });

  it('reset clears fault, progress, and queued events before the replay', () => {
    const lock = createContactInterlock();
    lock.enter();
    lock.interact('power'); // fault: open-circuit
    lock.interact('latch');
    lock.update(200);
    lock.interact('power'); // fault: signal-in-transit
    lock.reset();
    const snap = lock.snapshot();
    assert.equal(snap.lastFault, null);
    assert.equal(snap.signalProgress, 0);
    assert.equal(snap.latchClosed, false);
    assert.deepEqual(lock.drainEvents(), []);
    // And a full correct route works identically afterwards.
    lock.interact('latch');
    lock.update(550);
    const result = lock.interact('power');
    assert.equal(result.accepted, true);
    assert.equal(result.complete, true);
  });
});

// ---------------------------------------------------------------------------
// Task 5 — illegal inputs must not corrupt the state machine.
// ---------------------------------------------------------------------------

describe('illegal-input robustness', () => {
  it('negative / NaN / Infinity / non-number deltas never move the signal', () => {
    const rig = createQaRig();
    rig.interlock.enter();
    rig.interlock.interact('latch');
    rig.collect();
    for (const bad of [-1, -550, NaN, Infinity, -Infinity, 'fast', null, undefined, {}, []]) {
      rig.interlock.update(bad);
    }
    rig.collect();
    assert.equal(rig.interlock.snapshot().signalProgress, 0);
    assert.deepEqual(rig.events.filter((e) => e.type === 'trace-energized'), []);
    // Machine still works afterwards.
    stepSolveRelay(rig);
    rig.interlock.update(550);
    assert.equal(rig.interlock.snapshot().circuitEnergized, true);
  });

  it('unknown targets are rejected without state change or events', () => {
    const rig = createQaRig();
    rig.interlock.enter();
    rig.interlock.interact('latch');
    rig.interlock.update(200);
    rig.collect();
    const before = rig.interlock.snapshot();
    const eventCountBefore = rig.events.length;
    for (const target of ['brake', 'door', '', null, undefined, 0, 123, {}, ['power']]) {
      const result = rig.interlock.interact(target);
      assert.equal(result.accepted, false, `target ${String(target)} must be rejected`);
      assert.equal(result.reason, 'unknown-target');
      assert.equal(result.complete, false);
    }
    rig.collect();
    assert.deepEqual(rig.interlock.snapshot(), before);
    assert.equal(rig.events.length, eventCountBefore);
  });

  it('calls after destroy change nothing and emit nothing', () => {
    const rig = createQaRig();
    rig.interlock.enter();
    rig.interlock.interact('latch');
    rig.interlock.update(550);
    rig.interlock.interact('power');
    rig.collect();
    const before = rig.interlock.snapshot();
    rig.interlock.destroy();
    const destroyedResult = rig.interlock.interact('power');
    assert.equal(destroyedResult.accepted, false);
    assert.equal(destroyedResult.reason, 'destroyed');
    rig.interlock.interact('latch');
    rig.interlock.interact('brake');
    rig.interlock.update(550);
    rig.interlock.enter();
    rig.collect();
    const after = rig.interlock.snapshot();
    assert.equal(after.destroyed, true);
    assert.deepEqual(
      { ...after, destroyed: before.destroyed },
      { ...before },
      'post-destroy calls must not alter pre-destroy state',
    );
    assert.deepEqual(rig.interlock.drainEvents(), []);
    // Repeated destroy stays safe.
    rig.interlock.destroy();
    assert.equal(rig.interlock.snapshot().destroyed, true);
  });

  it('fixtures still drive cleanly on an instance reused via driveToState', () => {
    const lock = createContactInterlock();
    const mid = driveToState('signal-mid', lock);
    assert.ok(mid.snapshot.signalProgress > 0 && mid.snapshot.signalProgress < 1);
  });
});
