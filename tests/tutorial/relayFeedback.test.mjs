// Wave: PHASE II VISUAL CORRECTION — failure feedback owner (Agent B).
// Covers the additive dropoutHint contract on the relay cabinet logic:
// the single short prompt 'CONTACT DROPPED — TRACE THE LIVE ARM' is handed
// to the art layer when a TEST classifies dropout, and is cleared by any
// real wiring change or any fresh non-dropout TEST outcome. Nothing about
// the locked state machine, judgement rules or the correct answer changes;
// these tests also guard the failure-feedback invariants (leads retained,
// coil state retained, no global reset semantics inside dropout).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RELAY_DROPOUT_HINT,
  createRelayCabinet,
} from '../../src/tutorial/phases/relayCabinet.js';

function drainTypes(cabinet) {
  return cabinet.drainEvents().map((e) => e.type);
}

// coil -> coil-a1 (energizes), output -> nc-12 (legal but drops out).
function wireDropout(cabinet) {
  cabinet.connect('coil', 'coil-a1');
  cabinet.connect('output', 'nc-12');
  return cabinet.test();
}

describe('relayFeedback dropoutHint copy', () => {
  it('exports the exact one-line hint, never a longer string', () => {
    assert.equal(RELAY_DROPOUT_HINT, 'CONTACT DROPPED — TRACE THE LIVE ARM');
  });

  it('is null on a fresh cabinet snapshot (field present from boot)', () => {
    const cabinet = createRelayCabinet();
    assert.equal(cabinet.snapshot().dropoutHint, null);
  });
});

describe('relayFeedback dropout hint delivery', () => {
  it('entering dropout sets snapshot().dropoutHint to the exact line', () => {
    const cabinet = createRelayCabinet();
    const result = wireDropout(cabinet);
    assert.equal(result.result, 'dropout');
    assert.equal(cabinet.snapshot().dropoutHint, RELAY_DROPOUT_HINT);
  });

  it('the test-dropout event carries the hint in its snapshot spread', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    const events = cabinet.drainEvents();
    const dropout = events.find((e) => e.type === 'test-dropout');
    assert.ok(dropout, 'a test-dropout event exists');
    assert.equal(dropout.dropoutHint, RELAY_DROPOUT_HINT);
  });

  it('dropout keeps wiring and coil state: no clearing, no relay-dropped', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    const types = drainTypes(cabinet);
    assert.deepEqual(types, [
      'lead-connected',
      'coil-picked',
      'lead-connected',
      'test-dropout',
    ]);
    const snap = cabinet.snapshot();
    assert.equal(snap.coilLeadTerminal, 'coil-a1');
    assert.equal(snap.outputLeadTerminal, 'nc-12');
    assert.equal(snap.coilEnergized, true);
    assert.equal(snap.testState, 'dropout');
    assert.equal(snap.solved, false);
  });

  it('repeating TEST on unchanged dropout wiring re-gives the hint', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    cabinet.drainEvents();
    const again = cabinet.test();
    assert.equal(again.result, 'dropout');
    assert.equal(cabinet.snapshot().dropoutHint, RELAY_DROPOUT_HINT);
    assert.deepEqual(drainTypes(cabinet), ['test-dropout']);
  });
});

describe('relayFeedback dropout hint clearing', () => {
  it('a real disconnect clears the hint, and the event spread shows it cleared', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    cabinet.drainEvents();
    cabinet.disconnect('output');
    assert.equal(cabinet.snapshot().dropoutHint, null);
    const events = cabinet.drainEvents();
    const disconnected = events.find((e) => e.type === 'lead-disconnected');
    assert.ok(disconnected);
    assert.equal(disconnected.dropoutHint, null);
  });

  it('a real connect clears the hint (rewire path dropout -> passed)', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    cabinet.drainEvents();
    cabinet.disconnect('output');
    cabinet.connect('output', 'no-14');
    assert.equal(cabinet.snapshot().dropoutHint, null);
    const result = cabinet.test();
    assert.equal(result.result, 'passed');
    assert.equal(cabinet.snapshot().dropoutHint, null);
  });

  it('a fresh incomplete outcome clears the hint', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    cabinet.drainEvents();
    cabinet.disconnect('output'); // wiring change already clears
    const result = cabinet.test();
    assert.equal(result.result, 'incomplete');
    assert.equal(cabinet.snapshot().dropoutHint, null);
    const events = cabinet.drainEvents();
    assert.equal(events.at(-1).type, 'test-incomplete');
    assert.equal(events.at(-1).dropoutHint, null);
  });

  it('a fresh ground-fault outcome carries no hint', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    cabinet.drainEvents();
    cabinet.disconnect('output');
    cabinet.connect('output', 'gnd-lug');
    const result = cabinet.test();
    assert.equal(result.result, 'ground-fault');
    assert.equal(cabinet.snapshot().dropoutHint, null);
  });

  it('a rejected connect changes nothing, so the hint survives', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    cabinet.drainEvents();
    // output is still landed on nc-12: moving it without disconnect() first
    // is refused, no state change, hint must persist.
    const move = cabinet.connect('output', 'no-14');
    assert.equal(move.accepted, false);
    assert.equal(move.reason, 'lead-already-connected');
    assert.equal(cabinet.snapshot().dropoutHint, RELAY_DROPOUT_HINT);
    assert.deepEqual(drainTypes(cabinet), ['connect-rejected']);
  });

  it('an idempotent same-terminal re-connect changes nothing, hint survives', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    cabinet.drainEvents();
    const again = cabinet.connect('coil', 'coil-a1');
    assert.equal(again.accepted, true);
    assert.equal(cabinet.snapshot().dropoutHint, RELAY_DROPOUT_HINT);
    assert.deepEqual(drainTypes(cabinet), []); // no duplicate lead-connected
  });

  it('reset() clears the hint with the rest of the wiring', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    cabinet.reset();
    assert.equal(cabinet.snapshot().dropoutHint, null);
    assert.equal(cabinet.snapshot().testState, 'idle');
  });
});

describe('relayFeedback failure carries no extra payload', () => {
  it('dropout never solves, never bridges, never drops the armature in logic', () => {
    const cabinet = createRelayCabinet();
    wireDropout(cabinet);
    const types = drainTypes(cabinet);
    assert.ok(!types.includes('relay-bridged'));
    assert.ok(!types.includes('relay-dropped'));
    assert.ok(!types.includes('test-ground-fault'));
    assert.equal(cabinet.isSolved(), false);
  });

  it('passed locks the cabinet with the hint already null', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'no-14');
    const result = cabinet.test();
    assert.equal(result.result, 'passed');
    assert.equal(cabinet.snapshot().dropoutHint, null);
    // Re-pressing TEST is idempotent and never reintroduces the hint.
    cabinet.test();
    assert.equal(cabinet.snapshot().dropoutHint, null);
  });

  it('the hint survives closing/re-entering the close-up (enter keeps wiring)', () => {
    const cabinet = createRelayCabinet({ entered: true });
    wireDropout(cabinet);
    cabinet.enter(); // re-enter must not stack or clear state
    assert.equal(cabinet.snapshot().dropoutHint, RELAY_DROPOUT_HINT);
    assert.equal(cabinet.snapshot().outputLeadTerminal, 'nc-12');
  });
});
