import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_INTERLOCK_DEFAULTS,
  createContactInterlock,
} from '../../src/tutorial/phases/contactInterlock.js';

const EPS = 0.0001;

function closeTo(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    assert.fail(message || `expected ${actual} to be close to ${expected} +/- ${tolerance}`);
  }
}

function drainTypes(lock) {
  return lock.drainEvents().map((e) => e.type);
}

function advanceToEnergized(lock, propagationMs = CONTACT_INTERLOCK_DEFAULTS.propagationMs) {
  lock.interact('latch');
  lock.update(propagationMs);
}

function fullRun(lock, propagationMs = CONTACT_INTERLOCK_DEFAULTS.propagationMs) {
  lock.enter();
  lock.interact('latch');
  lock.update(propagationMs);
  return lock.interact('power');
}

describe('contactInterlock exports', () => {
  it('exports defaults and factory', () => {
    assert.equal(typeof CONTACT_INTERLOCK_DEFAULTS, 'object');
    assert.equal(CONTACT_INTERLOCK_DEFAULTS.propagationMs, 550);
    assert.equal(typeof createContactInterlock, 'function');
  });

  it('createContactInterlock returns required API', () => {
    const lock = createContactInterlock();
    assert.equal(typeof lock.enter, 'function');
    assert.equal(typeof lock.update, 'function');
    assert.equal(typeof lock.interact, 'function');
    assert.equal(typeof lock.reset, 'function');
    assert.equal(typeof lock.snapshot, 'function');
    assert.equal(typeof lock.isComplete, 'function');
    assert.equal(typeof lock.destroy, 'function');
    assert.equal(typeof lock.drainEvents, 'function');
  });
});

describe('contactInterlock entry state', () => {
  it('starts in the expected state before enter', () => {
    const lock = createContactInterlock();
    const snap = lock.snapshot();
    assert.equal(snap.entered, false);
    assert.equal(snap.destroyed, false);
    assert.equal(snap.latchClosed, false);
    assert.equal(snap.signalProgress, 0);
    assert.equal(snap.circuitEnergized, false);
    assert.equal(snap.contactorClosed, false);
    assert.equal(snap.powerDelivered, false);
    assert.equal(snap.complete, false);
    assert.equal(snap.lastFault, null);
  });

  it('enter is idempotent', () => {
    const lock = createContactInterlock();
    lock.enter();
    lock.enter();
    lock.enter();
    assert.equal(lock.snapshot().entered, true);
    assert.deepEqual(lock.drainEvents(), []);
  });

  it('enter accepts an optional context without altering state', () => {
    const lock = createContactInterlock();
    lock.enter({ stageId: 'junction-2' });
    assert.equal(lock.snapshot().entered, true);
  });
});

describe('contactInterlock early power failure', () => {
  it('rejects POWER before latch with open-circuit fault', () => {
    const lock = createContactInterlock();
    const result = lock.interact('power');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'open-circuit');
    assert.equal(result.complete, false);
    assert.equal(lock.snapshot().lastFault, 'open-circuit');
    assert.equal(lock.isComplete(), false);
  });

  it('emits a contactor-bounce event on early power failure', () => {
    const lock = createContactInterlock();
    lock.interact('power');
    const events = drainTypes(lock);
    assert.deepEqual(events, ['contactor-bounce']);
  });

  it('allows immediate retry after early power failure', () => {
    const lock = createContactInterlock();
    lock.interact('power');
    lock.drainEvents();
    lock.interact('latch');
    lock.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    const result = lock.interact('power');
    assert.equal(result.accepted, true);
    assert.equal(result.complete, true);
  });
});

describe('contactInterlock signal propagation', () => {
  it('starts trace when latch is closed', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    const events = drainTypes(lock);
    assert.ok(events.includes('latch-reset'));
    assert.ok(events.includes('trace-started'));
    assert.equal(lock.snapshot().latchClosed, true);
    assert.equal(lock.snapshot().signalProgress, 0);
  });

  it('advances signal progress monotonically toward 1', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(100);
    const p1 = lock.snapshot().signalProgress;
    lock.update(200);
    const p2 = lock.snapshot().signalProgress;
    assert.ok(p1 > 0);
    assert.ok(p2 > p1);
    assert.ok(p2 < 1);
  });

  it('clamps progress at 1 and energizes circuit once', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    closeTo(lock.snapshot().signalProgress, 1, EPS);
    assert.equal(lock.snapshot().circuitEnergized, true);

    lock.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    closeTo(lock.snapshot().signalProgress, 1, EPS);
    assert.equal(lock.snapshot().circuitEnergized, true);
  });

  it('emits trace-energized exactly once', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    const events = drainTypes(lock);
    const energizedCount = events.filter((t) => t === 'trace-energized').length;
    assert.equal(energizedCount, 1);

    lock.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    const events2 = drainTypes(lock);
    assert.deepEqual(events2, []);
  });

  it('rejects POWER while signal is still in transit', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(200);
    const result = lock.interact('power');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'signal-in-transit');
    assert.equal(result.complete, false);
    assert.equal(lock.snapshot().lastFault, 'signal-in-transit');
  });

  it('emits contactor-bounce when POWER is pressed in transit', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(200);
    lock.interact('power');
    const events = drainTypes(lock);
    assert.ok(events.includes('contactor-bounce'));
    assert.equal(events.filter((t) => t === 'contactor-bounce').length, 1);
  });

  it('succeeds after full propagation', () => {
    const lock = createContactInterlock();
    const result = fullRun(lock);
    assert.equal(result.accepted, true);
    assert.equal(result.complete, true);
    const snap = lock.snapshot();
    assert.equal(snap.latchClosed, true);
    assert.equal(snap.circuitEnergized, true);
    assert.equal(snap.contactorClosed, true);
    assert.equal(snap.powerDelivered, true);
    assert.equal(snap.complete, true);
    assert.equal(snap.lastFault, null);
  });

  it('regression: in-transit failure clears when POWER later succeeds', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(100);
    const failResult = lock.interact('power');
    assert.equal(failResult.accepted, false);
    assert.equal(failResult.reason, 'signal-in-transit');
    assert.equal(lock.snapshot().lastFault, 'signal-in-transit');

    lock.update(450);
    const successResult = lock.interact('power');
    assert.equal(successResult.accepted, true);
    assert.equal(successResult.complete, true);

    const snap = lock.snapshot();
    assert.equal(snap.complete, true);
    assert.equal(snap.powerDelivered, true);
    assert.equal(snap.contactorClosed, true);
    assert.equal(snap.circuitEnergized, true);
    assert.equal(snap.lastFault, null);

    assert.deepEqual(drainTypes(lock), [
      'latch-reset',
      'trace-started',
      'contactor-bounce',
      'trace-energized',
      'contactor-closed',
      'traction-enabled',
    ]);
  });

  it('emits success events exactly once', () => {
    const lock = createContactInterlock();
    fullRun(lock);
    const events = drainTypes(lock);
    assert.deepEqual(events, [
      'latch-reset',
      'trace-started',
      'trace-energized',
      'contactor-closed',
      'traction-enabled',
    ]);
  });
});

describe('contactInterlock idempotency', () => {
  it('closing latch twice is idempotent and does not restart trace', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(300);
    const progress = lock.snapshot().signalProgress;
    lock.interact('latch');
    closeTo(lock.snapshot().signalProgress, progress, EPS);
    const events = drainTypes(lock);
    assert.equal(events.filter((t) => t === 'latch-reset').length, 1);
    assert.equal(events.filter((t) => t === 'trace-started').length, 1);
  });

  it('POWER after completion is idempotent', () => {
    const lock = createContactInterlock();
    fullRun(lock);
    lock.drainEvents();
    const result = lock.interact('power');
    assert.equal(result.accepted, true);
    assert.equal(result.complete, true);
    assert.deepEqual(drainTypes(lock), []);
  });
});

describe('contactInterlock update tolerance', () => {
  it('ignores negative delta', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(-100);
    assert.equal(lock.snapshot().signalProgress, 0);
  });

  it('ignores NaN delta', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(NaN);
    assert.equal(lock.snapshot().signalProgress, 0);
  });

  it('ignores Infinity delta', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update(Infinity);
    assert.equal(lock.snapshot().signalProgress, 0);
  });

  it('ignores non-number delta', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    lock.update('a lot');
    lock.update(null);
    lock.update({});
    assert.equal(lock.snapshot().signalProgress, 0);
  });
});

describe('contactInterlock reset', () => {
  it('reset returns to first-entry state and clears events', () => {
    const lock = createContactInterlock();
    lock.interact('power');
    lock.interact('latch');
    lock.update(200);
    lock.reset();
    const snap = lock.snapshot();
    assert.equal(snap.latchClosed, false);
    assert.equal(snap.signalProgress, 0);
    assert.equal(snap.circuitEnergized, false);
    assert.equal(snap.contactorClosed, false);
    assert.equal(snap.powerDelivered, false);
    assert.equal(snap.complete, false);
    assert.equal(snap.lastFault, null);
    assert.deepEqual(lock.drainEvents(), []);
  });

  it('second complete run after reset matches the first', () => {
    const lock = createContactInterlock();
    const first = fullRun(lock);
    const firstEvents = drainTypes(lock);
    lock.reset();
    const second = fullRun(lock);
    const secondEvents = drainTypes(lock);
    assert.deepEqual(first, second);
    assert.deepEqual(firstEvents, secondEvents);
  });
});

describe('contactInterlock destroy', () => {
  it('destroy prevents state changes and event creation', () => {
    const lock = createContactInterlock();
    lock.destroy();
    assert.equal(lock.snapshot().destroyed, true);
    lock.interact('latch');
    lock.update(CONTACT_INTERLOCK_DEFAULTS.propagationMs);
    lock.interact('power');
    const snap = lock.snapshot();
    assert.equal(snap.latchClosed, false);
    assert.equal(snap.complete, false);
    assert.deepEqual(lock.drainEvents(), []);
  });

  it('destroy is idempotent', () => {
    const lock = createContactInterlock();
    lock.destroy();
    lock.destroy();
    assert.equal(lock.snapshot().destroyed, true);
  });

  it('reset after destroy keeps destroyed flag', () => {
    const lock = createContactInterlock();
    lock.destroy();
    lock.reset();
    assert.equal(lock.snapshot().destroyed, true);
  });
});

describe('contactInterlock unknown targets', () => {
  it('rejects unknown targets safely', () => {
    const lock = createContactInterlock();
    for (const target of ['brake', 'vent', 'door', '', null, undefined, 123]) {
      const result = lock.interact(target);
      assert.equal(result.accepted, false, `target ${target} should be rejected`);
      assert.equal(result.complete, false);
      assert.equal(lock.isComplete(), false);
    }
  });
});

describe('contactInterlock snapshot isolation', () => {
  it('snapshot is a deep copy that cannot mutate internal state', () => {
    const lock = createContactInterlock();
    lock.interact('latch');
    const snap = lock.snapshot();
    snap.signalProgress = 0.99;
    snap.circuitEnergized = true;
    snap.lastFault = 'tampered';
    const fresh = lock.snapshot();
    assert.equal(fresh.signalProgress, 0);
    assert.equal(fresh.circuitEnergized, false);
    assert.equal(fresh.lastFault, null);
  });
});

describe('contactInterlock configuration', () => {
  it('accepts a custom propagationMs', () => {
    const lock = createContactInterlock({ propagationMs: 1000 });
    lock.interact('latch');
    lock.update(500);
    closeTo(lock.snapshot().signalProgress, 0.5, EPS);
    lock.update(500);
    assert.equal(lock.snapshot().circuitEnergized, true);
  });

  it('falls back to default for invalid propagationMs values', () => {
    for (const bad of [-100, 0, NaN, Infinity, 'fast', null, undefined]) {
      const lock = createContactInterlock({ propagationMs: bad });
      lock.interact('latch');
      lock.update(275);
      closeTo(
        lock.snapshot().signalProgress,
        275 / CONTACT_INTERLOCK_DEFAULTS.propagationMs,
        EPS,
        `failed for propagationMs=${bad}`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Three-segment relay mode (Wave 3): isRelaySolved hook wired -> the trace
// splits into pre-relay / waiting-at-cabinet / post-relay. Legacy single-segment
// behavior above is untouched (no hook = straight-through).
// ---------------------------------------------------------------------------

describe('contactInterlock three-segment relay mode', () => {
  const PROP = CONTACT_INTERLOCK_DEFAULTS.propagationMs; // 550
  const SPLIT = CONTACT_INTERLOCK_DEFAULTS.relaySplit; // 345/590

  function makeRelayRig() {
    let solved = false;
    const lock = createContactInterlock({
      propagationMs: PROP,
      isRelaySolved: () => solved,
    });
    return {
      lock,
      solve() {
        solved = true;
      },
      unsolve() {
        solved = false;
      },
    };
  }

  it('defaults relaySplit to 345/590', () => {
    closeTo(CONTACT_INTERLOCK_DEFAULTS.relaySplit, 345 / 590, 1e-12);
  });

  it('signal parks at the cabinet when the relay is not bridged', () => {
    const { lock } = makeRelayRig();
    lock.enter();
    lock.interact('latch');
    lock.update(PROP); // enough for the whole legacy run; parks instead
    const snap = lock.snapshot();
    assert.equal(snap.preRelayProgress, 1);
    assert.equal(snap.postRelayProgress, 0);
    assert.equal(snap.relayWaiting, true);
    assert.equal(snap.relayBridged, false);
    assert.equal(snap.circuitEnergized, false);
    closeTo(snap.signalProgress, SPLIT, EPS, 'parked progress must equal the split fraction');
  });

  it('trace-reached-relay fires exactly once when the front reaches the cabinet', () => {
    const { lock } = makeRelayRig();
    lock.enter();
    lock.interact('latch');
    lock.update(PROP * SPLIT); // land exactly on the cabinet
    lock.update(100); // parked; no re-fire
    lock.update(100);
    const events = lock.drainEvents();
    assert.deepEqual(
      events.map((e) => e.type),
      ['latch-reset', 'trace-started', 'trace-reached-relay'],
    );
  });

  it('POWER while parked at the cabinet bounces with the relay-open fault', () => {
    const { lock } = makeRelayRig();
    lock.enter();
    lock.interact('latch');
    lock.update(PROP);
    lock.drainEvents();
    const result = lock.interact('power');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'relay-open');
    assert.equal(lock.snapshot().lastFault, 'relay-open');
    assert.deepEqual(
      lock.drainEvents().map((e) => e.type),
      ['contactor-bounce'],
    );
    // Parked signal is unaffected and still retryable.
    assert.equal(lock.snapshot().relayWaiting, true);
  });

  it('bridging the relay lets the post-relay segment run to energized', () => {
    const rig = makeRelayRig();
    rig.lock.enter();
    rig.lock.interact('latch');
    rig.lock.update(PROP); // parked
    assert.equal(rig.lock.snapshot().relayWaiting, true);
    rig.solve();
    rig.lock.update(PROP); // leftover-scale delta finishes the post segment
    const snap = rig.lock.snapshot();
    assert.equal(snap.relayWaiting, false);
    assert.equal(snap.relayBridged, true);
    assert.equal(snap.preRelayProgress, 1);
    assert.equal(snap.postRelayProgress, 1);
    assert.equal(snap.signalProgress, 1);
    assert.equal(snap.circuitEnergized, true);
  });

  it('a solved-before-arrival relay never parks and never waits', () => {
    const rig = makeRelayRig();
    rig.lock.enter();
    rig.lock.interact('latch');
    rig.solve(); // bridged before the signal even starts
    rig.lock.update(PROP);
    const snap = rig.lock.snapshot();
    assert.equal(snap.relayWaiting, false);
    assert.equal(snap.relayBridged, true);
    assert.equal(snap.circuitEnergized, true);
  });

  it('full relay route emits the locked six-event sequence', () => {
    const rig = makeRelayRig();
    rig.lock.enter();
    rig.lock.interact('latch');
    rig.lock.update(PROP); // parks, trace-reached-relay
    rig.solve();
    rig.lock.update(PROP); // post segment, trace-energized
    rig.lock.interact('power');
    assert.deepEqual(drainTypes(rig.lock), [
      'latch-reset',
      'trace-started',
      'trace-reached-relay',
      'trace-energized',
      'contactor-closed',
      'traction-enabled',
    ]);
  });

  it('relayBridged latches: a later unsolve cannot rewind the trace', () => {
    const rig = makeRelayRig();
    rig.lock.enter();
    rig.lock.interact('latch');
    rig.lock.update(PROP); // parked
    rig.solve();
    rig.lock.update(1); // bridge observed -> relayBridged latches
    assert.equal(rig.lock.snapshot().relayBridged, true);
    rig.unsolve();
    rig.lock.update(PROP); // keeps flowing despite hook now false
    const snap = rig.lock.snapshot();
    assert.equal(snap.relayBridged, true);
    assert.equal(snap.circuitEnergized, true);
  });

  it('reset re-arms the one-shot trace-reached-relay and clears the bridge latch', () => {
    const rig = makeRelayRig();
    rig.lock.enter();
    rig.lock.interact('latch');
    rig.solve();
    rig.lock.update(PROP);
    rig.lock.drainEvents();
    rig.lock.reset();
    rig.unsolve();
    const cleared = rig.lock.snapshot();
    assert.equal(cleared.relayBridged, false);
    assert.equal(cleared.relayWaiting, false);
    assert.equal(cleared.preRelayProgress, 0);
    assert.equal(cleared.postRelayProgress, 0);
    rig.lock.interact('latch');
    rig.lock.update(PROP);
    const fired = rig.lock.drainEvents().filter((e) => e.type === 'trace-reached-relay');
    assert.equal(fired.length, 1, 'trace-reached-relay must fire again after reset');
  });

  it('pre/post segment durations split propagationMs by relaySplit', () => {
    const rig = makeRelayRig();
    rig.lock.enter();
    rig.lock.interact('latch');
    const preMs = PROP * SPLIT;
    rig.lock.update(preMs / 2);
    closeTo(rig.lock.snapshot().preRelayProgress, 0.5, EPS);
    rig.lock.update(preMs / 2); // arrives exactly at the cabinet (FP tolerance)
    assert.equal(rig.lock.snapshot().preRelayProgress, 1);
    assert.equal(rig.lock.snapshot().relayWaiting, true);
    rig.solve();
    const postMs = PROP * (1 - SPLIT);
    rig.lock.update(postMs / 2);
    closeTo(rig.lock.snapshot().postRelayProgress, 0.5, EPS);
    rig.lock.update(postMs / 2);
    assert.equal(rig.lock.snapshot().postRelayProgress, 1);
    assert.equal(rig.lock.snapshot().circuitEnergized, true);
  });

  it('legacy mode (no hook) never waits and never emits trace-reached-relay', () => {
    const lock = createContactInterlock({ propagationMs: PROP });
    lock.enter();
    lock.interact('latch');
    lock.update(PROP);
    const snap = lock.snapshot();
    assert.equal(snap.relayWaiting, false);
    assert.equal(snap.circuitEnergized, true);
    assert.equal(
      lock.drainEvents().some((e) => e.type === 'trace-reached-relay'),
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// Progress-hold gating (Wave 5, P2): the optional isProgressHeld hook lets the
// integration layer freeze the bridge latch + post-relay segment during the
// close-up exit beat, so trace-energized can only fire in world view. The pre
// segment is explicitly NOT gated.
// ---------------------------------------------------------------------------

describe('contactInterlock progress-hold gating', () => {
  const PROP = CONTACT_INTERLOCK_DEFAULTS.propagationMs; // 550

  function makeHoldRig() {
    let solved = false;
    let held = false;
    const lock = createContactInterlock({
      propagationMs: PROP,
      isRelaySolved: () => solved,
      isProgressHeld: () => held,
    });
    return {
      lock,
      solve() { solved = true; },
      hold() { held = true; },
      release() { held = false; },
    };
  }

  it('held: solved relay does not latch bridged and post stays 0', () => {
    const rig = makeHoldRig();
    rig.lock.enter();
    rig.lock.interact('latch');
    rig.lock.update(PROP); // parks at the cabinet
    rig.hold(); // close-up opens (simulated)
    rig.solve(); // player bridges the case mid-hold
    rig.lock.update(PROP * 4); // far more than the whole post segment
    const snap = rig.lock.snapshot();
    assert.equal(snap.relayBridged, false, 'bridge latch must wait out the hold');
    assert.equal(snap.postRelayProgress, 0);
    assert.equal(snap.relayWaiting, true, 'front stays parked at the cabinet');
    assert.equal(snap.circuitEnergized, false);
    assert.equal(
      rig.lock.drainEvents().some((e) => e.type === 'trace-energized'),
      false,
      'trace-energized must never fire inside the hold',
    );
  });

  it('held: pre segment keeps its existing semantics (advances normally)', () => {
    const rig = makeHoldRig();
    rig.lock.enter();
    rig.hold(); // held from before the latch: pre must be unaffected
    rig.lock.interact('latch');
    rig.lock.update(PROP / 2);
    closeTo(rig.lock.snapshot().preRelayProgress, 0.5 / (345 / 590), EPS);
    rig.lock.update(PROP); // finishes pre, parks
    const snap = rig.lock.snapshot();
    assert.equal(snap.preRelayProgress, 1);
    assert.equal(snap.relayWaiting, true);
    assert.deepEqual(
      rig.lock.drainEvents().map((e) => e.type),
      ['latch-reset', 'trace-started', 'trace-reached-relay'],
      'pre events fire exactly as unheld',
    );
  });

  it('release: next update latches the bridge and runs the post segment', () => {
    const rig = makeHoldRig();
    rig.lock.enter();
    rig.lock.interact('latch');
    rig.lock.update(PROP);
    rig.hold();
    rig.solve();
    rig.lock.update(PROP * 4); // nothing moves
    rig.release(); // camera back on the player
    rig.lock.update(1); // first frame back: latch observed, post starts
    assert.equal(rig.lock.snapshot().relayBridged, true);
    rig.lock.update(PROP);
    const snap = rig.lock.snapshot();
    assert.equal(snap.postRelayProgress, 1);
    assert.equal(snap.circuitEnergized, true);
    assert.deepEqual(
      rig.lock.drainEvents().map((e) => e.type),
      ['latch-reset', 'trace-started', 'trace-reached-relay', 'trace-energized'],
    );
  });

  it('held: the pre-latch bridge latch (else branch) is gated too', () => {
    const rig = makeHoldRig();
    rig.lock.enter();
    rig.hold();
    rig.solve(); // case bridged before the latch ever closed, during a hold
    rig.lock.update(PROP);
    assert.equal(rig.lock.snapshot().relayBridged, false);
    rig.release();
    rig.lock.update(1);
    assert.equal(rig.lock.snapshot().relayBridged, true);
  });

  it('no hold hook wired: every number is the legacy/default behaviour', () => {
    let solved = false;
    const lock = createContactInterlock({
      propagationMs: PROP,
      isRelaySolved: () => solved,
    });
    lock.enter();
    lock.interact('latch');
    lock.update(PROP); // parks
    solved = true;
    lock.update(PROP); // unheld: bridges and finishes immediately
    assert.equal(lock.snapshot().circuitEnergized, true);
  });
});
