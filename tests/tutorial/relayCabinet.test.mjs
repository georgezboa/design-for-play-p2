import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RELAY_LEADS,
  RELAY_TERMINALS,
  RELAY_TEST_STATES,
  RELAY_REJECT_REASONS,
  createRelayCabinet,
} from '../../src/tutorial/phases/relayCabinet.js';

function drainTypes(cabinet) {
  return cabinet.drainEvents().map((e) => e.type);
}

function wireSolved(cabinet) {
  cabinet.connect('coil', 'coil-a1');
  cabinet.connect('output', 'no-14');
  return cabinet.test();
}

describe('relayCabinet exports', () => {
  it('exports lead, terminal and test-state rosters plus the factory', () => {
    assert.deepEqual(RELAY_LEADS, { COIL: 'coil', OUTPUT: 'output' });
    assert.deepEqual(RELAY_TERMINALS, {
      COIL_A1: 'coil-a1',
      COIL_A2: 'coil-a2',
      NO_14: 'no-14',
      NC_12: 'nc-12',
      GND_LUG: 'gnd-lug',
    });
    assert.deepEqual(RELAY_TEST_STATES, [
      'idle',
      'incomplete',
      'dropout',
      'ground-fault',
      'passed',
    ]);
    assert.equal(typeof createRelayCabinet, 'function');
  });

  it('exports the rejection reason vocabulary', () => {
    assert.deepEqual(RELAY_REJECT_REASONS, [
      'unknown-lead',
      'invalid-terminal',
      'unknown-terminal',
      'coil-a2-open-return',
      'wrong-lead-terminal',
      'lead-already-connected',
      'lead-not-connected',
      'solved',
      'destroyed',
    ]);
  });

  it('createRelayCabinet returns the locked API surface', () => {
    const cabinet = createRelayCabinet();
    for (const method of [
      'enter',
      'snapshot',
      'connect',
      'disconnect',
      'test',
      'reset',
      'drainEvents',
      'isSolved',
      'destroy',
    ]) {
      assert.equal(typeof cabinet[method], 'function', `missing ${method}`);
    }
  });
});

describe('relayCabinet entry state', () => {
  it('starts in the expected state before enter', () => {
    const cabinet = createRelayCabinet();
    const snap = cabinet.snapshot();
    assert.equal(snap.entered, false);
    assert.equal(snap.coilLeadTerminal, null);
    assert.equal(snap.outputLeadTerminal, null);
    assert.equal(snap.coilEnergized, false);
    assert.equal(snap.noContactClosed, false);
    assert.equal(snap.ncContactClosed, true); // resting relay: NC closed
    assert.equal(snap.testState, 'idle');
    assert.equal(snap.solved, false);
    assert.equal(snap.destroyed, false);
    assert.equal(cabinet.isSolved(), false);
  });

  it('enter is idempotent and emits no events', () => {
    const cabinet = createRelayCabinet();
    cabinet.enter();
    cabinet.enter();
    cabinet.enter();
    assert.equal(cabinet.snapshot().entered, true);
    assert.deepEqual(cabinet.drainEvents(), []);
  });

  it('enter accepts an optional context without altering other state', () => {
    const cabinet = createRelayCabinet();
    cabinet.enter({ stageId: 'relay-case-2' });
    const snap = cabinet.snapshot();
    assert.equal(snap.entered, true);
    assert.equal(snap.coilLeadTerminal, null);
    assert.equal(snap.testState, 'idle');
  });

  it('config.entered seeds the entered flag', () => {
    const cabinet = createRelayCabinet({ entered: true });
    assert.equal(cabinet.snapshot().entered, true);
  });
});

describe('relayCabinet coil connection and contact switching', () => {
  it('connecting COIL to coil-a1 energizes the coil and flips the contacts', () => {
    const cabinet = createRelayCabinet();
    const result = cabinet.connect('coil', 'coil-a1');
    assert.deepEqual(result, {
      accepted: true,
      reason: null,
      lead: 'coil',
      terminal: 'coil-a1',
    });
    const snap = cabinet.snapshot();
    assert.equal(snap.coilLeadTerminal, 'coil-a1');
    assert.equal(snap.coilEnergized, true);
    assert.equal(snap.noContactClosed, true);
    assert.equal(snap.ncContactClosed, false);
  });

  it('emits lead-connected then coil-picked with light payloads', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    const events = cabinet.drainEvents();
    assert.deepEqual(
      events.map((e) => e.type),
      ['lead-connected', 'coil-picked'],
    );
    assert.equal(events[0].lead, 'coil');
    assert.equal(events[0].terminal, 'coil-a1');
    assert.equal(events[1].coilEnergized, true);
    assert.equal(events[1].noContactClosed, true);
    assert.equal(events[1].ncContactClosed, false);
  });

  it('reconnecting the same lead to the same terminal is idempotent', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.drainEvents();
    const again = cabinet.connect('coil', 'coil-a1');
    assert.equal(again.accepted, true);
    assert.equal(again.reason, null);
    assert.equal(cabinet.snapshot().coilEnergized, true);
    assert.deepEqual(cabinet.drainEvents(), []); // no duplicate events
  });

  it('rejects moving a connected lead without disconnecting first', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.drainEvents();
    const move = cabinet.connect('coil', 'gnd-lug');
    assert.equal(move.accepted, false);
    assert.equal(move.reason, 'lead-already-connected');
    assert.equal(move.terminal, 'coil-a1'); // return value: current landing
    const snap = cabinet.snapshot();
    assert.equal(snap.coilLeadTerminal, 'coil-a1');
    assert.equal(snap.coilEnergized, true);
    const events = cabinet.drainEvents();
    assert.deepEqual(events, [
      {
        type: 'connect-rejected',
        lead: 'coil',
        terminal: 'gnd-lug', // event payload: the attempted terminal
        reason: 'lead-already-connected',
      },
    ]);
  });

  it('disconnecting the energized coil drops the relay back to rest', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.drainEvents();
    const result = cabinet.disconnect('coil');
    assert.deepEqual(result, {
      accepted: true,
      reason: null,
      lead: 'coil',
      terminal: 'coil-a1',
    });
    const snap = cabinet.snapshot();
    assert.equal(snap.coilLeadTerminal, null);
    assert.equal(snap.coilEnergized, false);
    assert.equal(snap.noContactClosed, false);
    assert.equal(snap.ncContactClosed, true);
    const events = cabinet.drainEvents();
    assert.deepEqual(
      events.map((e) => e.type),
      ['lead-disconnected', 'relay-dropped'],
    );
    assert.equal(events[0].lead, 'coil');
    assert.equal(events[0].terminal, 'coil-a1');
  });

  it('disconnecting the output lead leaves the relay energized', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'no-14');
    cabinet.drainEvents();
    const result = cabinet.disconnect('output');
    assert.equal(result.accepted, true);
    const snap = cabinet.snapshot();
    assert.equal(snap.outputLeadTerminal, null);
    assert.equal(snap.coilEnergized, true);
    assert.equal(snap.noContactClosed, true);
    assert.deepEqual(drainTypes(cabinet), ['lead-disconnected']);
  });

  it('repeated disconnect of a free lead is a safe no-op rejection', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.disconnect('coil');
    cabinet.drainEvents();
    const again = cabinet.disconnect('coil');
    assert.equal(again.accepted, false);
    assert.equal(again.reason, 'lead-not-connected');
    assert.equal(cabinet.snapshot().coilLeadTerminal, null);
    assert.deepEqual(cabinet.drainEvents(), [
      {
        type: 'disconnect-rejected',
        lead: 'coil',
        terminal: null,
        reason: 'lead-not-connected',
      },
    ]);
  });

  it('coil lead on gnd-lug is stored but never energizes the coil', () => {
    const cabinet = createRelayCabinet();
    const result = cabinet.connect('coil', 'gnd-lug');
    assert.equal(result.accepted, true);
    const snap = cabinet.snapshot();
    assert.equal(snap.coilLeadTerminal, 'gnd-lug');
    assert.equal(snap.coilEnergized, false);
    assert.equal(snap.ncContactClosed, true);
    assert.deepEqual(drainTypes(cabinet), ['lead-connected']);
  });
});

describe('relayCabinet full happy path', () => {
  it('COIL -> NO-14 -> TEST passes with the exact locked event order', () => {
    const cabinet = createRelayCabinet();
    cabinet.enter();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'no-14');
    const result = cabinet.test();
    assert.equal(result.accepted, true);
    assert.equal(result.result, 'passed');
    assert.equal(result.solved, true);
    assert.equal(cabinet.isSolved(), true);
    const snap = cabinet.snapshot();
    assert.equal(snap.testState, 'passed');
    assert.equal(snap.solved, true);
    assert.equal(snap.coilEnergized, true);
    assert.equal(snap.noContactClosed, true);
    assert.deepEqual(drainTypes(cabinet), [
      'lead-connected',
      'coil-picked',
      'lead-connected',
      'relay-bridged',
    ]);
  });

  it('passes regardless of lead connection order', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('output', 'no-14');
    cabinet.connect('coil', 'coil-a1');
    const result = cabinet.test();
    assert.equal(result.result, 'passed');
    assert.equal(result.solved, true);
    assert.deepEqual(drainTypes(cabinet), [
      'lead-connected',
      'lead-connected',
      'coil-picked',
      'relay-bridged',
    ]);
  });

  it('relay-bridged is one-shot: repeated TEST after solved emits nothing', () => {
    const cabinet = createRelayCabinet();
    wireSolved(cabinet);
    cabinet.drainEvents();
    const again = cabinet.test();
    assert.equal(again.accepted, true);
    assert.equal(again.result, 'passed');
    assert.equal(again.solved, true);
    assert.deepEqual(cabinet.drainEvents(), []);
    assert.equal(cabinet.snapshot().testState, 'passed');
  });

  it('wiring is committed after solved: connect and disconnect are rejected', () => {
    const cabinet = createRelayCabinet();
    wireSolved(cabinet);
    cabinet.drainEvents();
    const reconnect = cabinet.connect('coil', 'coil-a1');
    assert.equal(reconnect.accepted, false);
    assert.equal(reconnect.reason, 'solved');
    const unplug = cabinet.disconnect('output');
    assert.equal(unplug.accepted, false);
    assert.equal(unplug.reason, 'solved');
    const snap = cabinet.snapshot();
    assert.equal(snap.coilLeadTerminal, 'coil-a1');
    assert.equal(snap.outputLeadTerminal, 'no-14');
    assert.equal(snap.solved, true);
    assert.deepEqual(cabinet.drainEvents(), [
      { type: 'connect-rejected', lead: 'coil', terminal: 'coil-a1', reason: 'solved' },
      { type: 'disconnect-rejected', lead: 'output', terminal: 'no-14', reason: 'solved' },
    ]);
  });
});

describe('relayCabinet NC dropout path', () => {
  it('OUTPUT on nc-12 with the coil energized drops out and keeps the wiring', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'nc-12');
    const result = cabinet.test();
    assert.equal(result.accepted, true);
    assert.equal(result.result, 'dropout');
    assert.equal(result.solved, false);
    assert.equal(cabinet.isSolved(), false);
    const snap = cabinet.snapshot();
    assert.equal(snap.testState, 'dropout');
    // Leads and coil state all persist; nothing is cleared.
    assert.equal(snap.coilLeadTerminal, 'coil-a1');
    assert.equal(snap.outputLeadTerminal, 'nc-12');
    assert.equal(snap.coilEnergized, true);
    assert.equal(snap.ncContactClosed, false);
    const events = cabinet.drainEvents();
    assert.equal(events.at(-1).type, 'test-dropout');
    assert.equal(events.at(-1).lead, 'output');
    assert.equal(events.at(-1).terminal, 'nc-12');
    assert.equal(events.filter((e) => e.type === 'test-dropout').length, 1);
  });

  it('repeated TEST on the dropout wiring re-emits test-dropout', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'nc-12');
    cabinet.test();
    cabinet.drainEvents();
    const again = cabinet.test();
    assert.equal(again.result, 'dropout');
    assert.equal(again.solved, false);
    assert.deepEqual(drainTypes(cabinet), ['test-dropout']);
  });

  it('recovers from dropout by moving the output lead to no-14', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'nc-12');
    cabinet.test();
    assert.equal(cabinet.snapshot().testState, 'dropout');
    cabinet.disconnect('output');
    cabinet.connect('output', 'no-14');
    const result = cabinet.test();
    assert.equal(result.result, 'passed');
    assert.equal(result.solved, true);
    assert.deepEqual(drainTypes(cabinet), [
      'lead-connected',
      'coil-picked',
      'lead-connected',
      'test-dropout',
      'lead-disconnected',
      'lead-connected',
      'relay-bridged',
    ]);
  });
});

describe('relayCabinet incomplete TEST', () => {
  it('reports both missing leads when nothing is connected', () => {
    const cabinet = createRelayCabinet();
    const result = cabinet.test();
    assert.equal(result.accepted, true);
    assert.equal(result.result, 'incomplete');
    assert.equal(result.solved, false);
    const snap = cabinet.snapshot();
    assert.equal(snap.testState, 'incomplete');
    assert.equal(snap.solved, false);
    const events = cabinet.drainEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'test-incomplete');
    assert.deepEqual(events[0].missing, ['coil', 'output']);
  });

  it('points at the missing output end when only the coil is wired', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.drainEvents();
    const result = cabinet.test();
    assert.equal(result.result, 'incomplete');
    const events = cabinet.drainEvents();
    assert.deepEqual(events.map((e) => e.type), ['test-incomplete']);
    assert.deepEqual(events[0].missing, ['output']);
  });

  it('points at the missing coil end when only the output is wired', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('output', 'no-14');
    cabinet.drainEvents();
    const result = cabinet.test();
    assert.equal(result.result, 'incomplete');
    const events = cabinet.drainEvents();
    assert.deepEqual(events.map((e) => e.type), ['test-incomplete']);
    assert.deepEqual(events[0].missing, ['coil']);
  });

  it('does not disturb resting contacts or wiring', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('output', 'nc-12');
    cabinet.test();
    const snap = cabinet.snapshot();
    assert.equal(snap.coilEnergized, false);
    assert.equal(snap.ncContactClosed, true);
    assert.equal(snap.outputLeadTerminal, 'nc-12');
  });
});

describe('relayCabinet ground fault', () => {
  it('classifies a grounded output lead without resetting the wiring', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'gnd-lug');
    const result = cabinet.test();
    assert.equal(result.result, 'ground-fault');
    assert.equal(result.solved, false);
    const snap = cabinet.snapshot();
    assert.equal(snap.testState, 'ground-fault');
    assert.equal(snap.coilLeadTerminal, 'coil-a1');
    assert.equal(snap.outputLeadTerminal, 'gnd-lug');
    assert.equal(snap.coilEnergized, true);
    const events = cabinet.drainEvents();
    const fault = events.at(-1);
    assert.equal(fault.type, 'test-ground-fault');
    assert.deepEqual(fault.faulted, ['output']);
    assert.equal(fault.terminal, 'gnd-lug');
  });

  it('classifies a grounded coil lead as ground-fault, never dropout', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'gnd-lug');
    cabinet.connect('output', 'nc-12');
    const result = cabinet.test();
    assert.equal(result.result, 'ground-fault');
    const events = cabinet.drainEvents();
    assert.deepEqual(events.at(-1).faulted, ['coil']);
    assert.equal(cabinet.snapshot().coilEnergized, false);
  });

  it('reports both leads when both sit on the ground stud', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'gnd-lug');
    cabinet.connect('output', 'gnd-lug');
    const result = cabinet.test();
    assert.equal(result.result, 'ground-fault');
    const events = cabinet.drainEvents();
    assert.deepEqual(events.at(-1).faulted, ['coil', 'output']);
  });

  it('incomplete beats ground-fault while a lead dangles', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('output', 'gnd-lug');
    cabinet.drainEvents();
    const result = cabinet.test();
    assert.equal(result.result, 'incomplete');
    const events = cabinet.drainEvents();
    assert.deepEqual(events.map((e) => e.type), ['test-incomplete']);
  });

  it('recovers from a ground fault by rewiring, no reset needed', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'gnd-lug');
    cabinet.connect('output', 'gnd-lug');
    cabinet.test();
    cabinet.disconnect('coil');
    cabinet.disconnect('output');
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'no-14');
    const result = cabinet.test();
    assert.equal(result.result, 'passed');
    assert.equal(result.solved, true);
  });
});

describe('relayCabinet cross-wiring rejection', () => {
  it('rejects the COIL lead on no-14 with an event and no state change', () => {
    const cabinet = createRelayCabinet();
    const result = cabinet.connect('coil', 'no-14');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'wrong-lead-terminal');
    assert.equal(cabinet.snapshot().coilLeadTerminal, null);
    assert.equal(cabinet.snapshot().coilEnergized, false);
    assert.deepEqual(cabinet.drainEvents(), [
      { type: 'connect-rejected', lead: 'coil', terminal: 'no-14', reason: 'wrong-lead-terminal' },
    ]);
  });

  it('rejects the COIL lead on nc-12 with an event and no state change', () => {
    const cabinet = createRelayCabinet();
    const result = cabinet.connect('coil', 'nc-12');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'wrong-lead-terminal');
    assert.equal(cabinet.snapshot().coilLeadTerminal, null);
    assert.deepEqual(cabinet.drainEvents(), [
      { type: 'connect-rejected', lead: 'coil', terminal: 'nc-12', reason: 'wrong-lead-terminal' },
    ]);
  });

  it('rejects the OUTPUT lead on the coil terminal', () => {
    const cabinet = createRelayCabinet();
    const result = cabinet.connect('output', 'coil-a1');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'wrong-lead-terminal');
    assert.equal(cabinet.snapshot().outputLeadTerminal, null);
    assert.deepEqual(cabinet.drainEvents(), [
      { type: 'connect-rejected', lead: 'output', terminal: 'coil-a1', reason: 'wrong-lead-terminal' },
    ]);
  });

  it('rejects the OUTPUT lead on the dead coil return screw', () => {
    const cabinet = createRelayCabinet();
    const result = cabinet.connect('output', 'coil-a2');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'wrong-lead-terminal');
    assert.equal(cabinet.snapshot().outputLeadTerminal, null);
    assert.deepEqual(cabinet.drainEvents(), [
      { type: 'connect-rejected', lead: 'output', terminal: 'coil-a2', reason: 'wrong-lead-terminal' },
    ]);
  });
});

describe('relayCabinet coil-a2 dead return screw', () => {
  it('rejects connect(coil, coil-a2) with the dedicated reason, not unknown-terminal', () => {
    const cabinet = createRelayCabinet();
    const result = cabinet.connect('coil', 'coil-a2');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'coil-a2-open-return');
    assert.equal(result.lead, 'coil');
    assert.equal(result.terminal, 'coil-a2');
  });

  it('emits exactly one connect-rejected with the a2 payload', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a2');
    assert.deepEqual(cabinet.drainEvents(), [
      {
        type: 'connect-rejected',
        lead: 'coil',
        terminal: 'coil-a2',
        reason: 'coil-a2-open-return',
      },
    ]);
  });

  it('leaves every state field untouched', () => {
    const cabinet = createRelayCabinet();
    cabinet.enter();
    const before = cabinet.snapshot();
    cabinet.connect('coil', 'coil-a2');
    assert.deepEqual(cabinet.snapshot(), before);
    assert.equal(cabinet.snapshot().coilEnergized, false);
    assert.equal(cabinet.snapshot().ncContactClosed, true);
  });

  it('repeated a2 attempts are idempotent in state and emit one event each', () => {
    const cabinet = createRelayCabinet();
    const first = cabinet.connect('coil', 'coil-a2');
    const second = cabinet.connect('coil', 'coil-a2');
    const third = cabinet.connect('coil', 'coil-a2');
    assert.deepEqual(first, second);
    assert.deepEqual(second, third);
    assert.equal(cabinet.snapshot().coilLeadTerminal, null);
    const events = cabinet.drainEvents();
    assert.equal(events.length, 3);
    for (const event of events) {
      assert.equal(event.type, 'connect-rejected');
      assert.equal(event.reason, 'coil-a2-open-return');
    }
  });

  it('a2 attempt does not block the correct wiring afterwards', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a2');
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'no-14');
    const result = cabinet.test();
    assert.equal(result.result, 'passed');
    assert.equal(result.solved, true);
    assert.deepEqual(drainTypes(cabinet), [
      'connect-rejected',
      'lead-connected',
      'coil-picked',
      'lead-connected',
      'relay-bridged',
    ]);
  });

  it('TEST after a lone a2 attempt is incomplete with both ends missing', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a2');
    cabinet.drainEvents();
    const result = cabinet.test();
    assert.equal(result.result, 'incomplete');
    const events = cabinet.drainEvents();
    assert.deepEqual(events[0].missing, ['coil', 'output']);
  });

  it('a2 rejection wins over the solved lock (input validation first)', () => {
    const cabinet = createRelayCabinet();
    wireSolved(cabinet);
    cabinet.drainEvents();
    const result = cabinet.connect('coil', 'coil-a2');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'coil-a2-open-return');
    assert.deepEqual(cabinet.drainEvents(), [
      {
        type: 'connect-rejected',
        lead: 'coil',
        terminal: 'coil-a2',
        reason: 'coil-a2-open-return',
      },
    ]);
    assert.equal(cabinet.snapshot().solved, true);
  });
});

describe('relayCabinet unknown input rejection', () => {
  it('rejects unknown leads on connect with a sanitized event payload', () => {
    const cabinet = createRelayCabinet();
    for (const lead of ['amber', 'cyan', '', null, undefined, 123, {}]) {
      const connected = cabinet.connect(lead, 'coil-a1');
      assert.equal(connected.accepted, false, `lead ${String(lead)}`);
      assert.equal(connected.reason, 'unknown-lead');
    }
    const events = cabinet.drainEvents();
    assert.equal(events.length, 7);
    for (const event of events) {
      assert.equal(event.type, 'connect-rejected');
      assert.equal(event.reason, 'unknown-lead');
      assert.equal(event.terminal, 'coil-a1');
    }
    assert.equal(events[0].lead, 'amber');
    assert.equal(events[3].lead, null); // non-string sanitized
    assert.equal(events[5].lead, null); // numeric sanitized
  });

  it('rejects unknown leads on disconnect with a sanitized event payload', () => {
    const cabinet = createRelayCabinet();
    for (const lead of ['amber', '', null, 123]) {
      const disconnected = cabinet.disconnect(lead);
      assert.equal(disconnected.accepted, false, `lead ${String(lead)}`);
      assert.equal(disconnected.reason, 'unknown-lead');
    }
    const events = cabinet.drainEvents();
    assert.equal(events.length, 4);
    for (const event of events) {
      assert.equal(event.type, 'disconnect-rejected');
      assert.equal(event.reason, 'unknown-lead');
      assert.equal(event.terminal, null);
    }
    assert.equal(events[0].lead, 'amber');
    assert.equal(events[2].lead, null);
  });

  it('rejects terminal ids outside the roster', () => {
    const cabinet = createRelayCabinet();
    for (const terminal of ['coil-a3', 'no-13', 'x9', 'COIL-A1']) {
      const result = cabinet.connect('coil', terminal);
      assert.equal(result.accepted, false, `terminal ${terminal}`);
      assert.equal(result.reason, 'unknown-terminal');
      assert.equal(cabinet.snapshot().coilLeadTerminal, null);
    }
    const events = cabinet.drainEvents();
    assert.equal(events.length, 4);
    for (const event of events) {
      assert.equal(event.type, 'connect-rejected');
      assert.equal(event.reason, 'unknown-terminal');
    }
    assert.equal(events[0].terminal, 'coil-a3');
  });

  it('rejects non-string and empty terminals', () => {
    const cabinet = createRelayCabinet();
    for (const terminal of ['', null, undefined, 14, {}, []]) {
      const result = cabinet.connect('coil', terminal);
      assert.equal(result.accepted, false, `terminal ${String(terminal)}`);
      assert.equal(result.reason, 'invalid-terminal');
    }
    const events = cabinet.drainEvents();
    assert.equal(events.length, 6);
    for (const event of events) {
      assert.equal(event.type, 'connect-rejected');
      assert.equal(event.reason, 'invalid-terminal');
      assert.equal(event.lead, 'coil');
      assert.equal(event.terminal, null);
    }
  });
});

describe('relayCabinet connect-rejected contract', () => {
  it('emits exactly one event per rejected call, never zero, never two', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'x9');
    cabinet.connect('coil', 'x9');
    cabinet.connect('output', 'coil-a1');
    const events = cabinet.drainEvents();
    assert.equal(events.length, 3);
    assert.deepEqual(
      events.map((e) => e.type),
      ['connect-rejected', 'connect-rejected', 'connect-rejected'],
    );
    assert.deepEqual(cabinet.drainEvents(), []);
  });

  it('carries exactly { type, lead, terminal, reason } and nothing else', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a2');
    const [event] = cabinet.drainEvents();
    assert.deepEqual(Object.keys(event).sort(), ['lead', 'reason', 'terminal', 'type']);
  });

  it('rejection events are JSON-safe plain data', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a2');
    cabinet.connect('coil', 'nope');
    cabinet.disconnect('output');
    const events = cabinet.drainEvents();
    for (const event of events) {
      assert.deepEqual(JSON.parse(JSON.stringify(event)), event);
    }
  });

  it('reset flushes queued rejection events', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a2');
    cabinet.connect('output', 'coil-a1');
    cabinet.reset();
    assert.deepEqual(cabinet.drainEvents(), []);
  });

  it('a rejected connect does not touch the relay or test outcome', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.test(); // incomplete: output missing
    cabinet.drainEvents();
    const before = cabinet.snapshot();
    cabinet.connect('output', 'coil-a1'); // cross-wired, rejected
    assert.deepEqual(cabinet.snapshot(), before);
    assert.deepEqual(drainTypes(cabinet), ['connect-rejected']);
  });
});

describe('relayCabinet disconnect-rejected contract', () => {
  it('reports lead-not-connected with a null terminal', () => {
    const cabinet = createRelayCabinet();
    cabinet.disconnect('output');
    assert.deepEqual(cabinet.drainEvents(), [
      {
        type: 'disconnect-rejected',
        lead: 'output',
        terminal: null,
        reason: 'lead-not-connected',
      },
    ]);
  });

  it('echoes the wired terminal when disconnect is blocked by the solved lock', () => {
    const cabinet = createRelayCabinet();
    wireSolved(cabinet);
    cabinet.drainEvents();
    cabinet.disconnect('coil');
    assert.deepEqual(cabinet.drainEvents(), [
      { type: 'disconnect-rejected', lead: 'coil', terminal: 'coil-a1', reason: 'solved' },
    ]);
  });

  it('emits one event per rejected disconnect call', () => {
    const cabinet = createRelayCabinet();
    cabinet.disconnect('coil');
    cabinet.disconnect('coil');
    assert.equal(cabinet.drainEvents().length, 2);
  });
});

describe('relayCabinet testState stickiness', () => {
  it('keeps the last TEST outcome until the next TEST or reset', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'nc-12');
    cabinet.test();
    assert.equal(cabinet.snapshot().testState, 'dropout');
    // Rewiring alone does not erase the recorded outcome.
    cabinet.disconnect('output');
    cabinet.connect('output', 'no-14');
    assert.equal(cabinet.snapshot().testState, 'dropout');
    cabinet.test();
    assert.equal(cabinet.snapshot().testState, 'passed');
  });
});

describe('relayCabinet reset and replay', () => {
  it('reset pulls both leads, rests the relay and clears events', () => {
    const cabinet = createRelayCabinet();
    cabinet.enter();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('output', 'nc-12');
    cabinet.test();
    const result = cabinet.reset();
    assert.deepEqual(result, { accepted: true, reason: null });
    const snap = cabinet.snapshot();
    assert.equal(snap.entered, true); // cabinet stays open
    assert.equal(snap.coilLeadTerminal, null);
    assert.equal(snap.outputLeadTerminal, null);
    assert.equal(snap.coilEnergized, false);
    assert.equal(snap.noContactClosed, false);
    assert.equal(snap.ncContactClosed, true);
    assert.equal(snap.testState, 'idle');
    assert.equal(snap.solved, false);
    assert.deepEqual(cabinet.drainEvents(), []);
    assert.equal(cabinet.isSolved(), false);
  });

  it('reset unlocks a solved cabinet', () => {
    const cabinet = createRelayCabinet();
    wireSolved(cabinet);
    cabinet.reset();
    assert.equal(cabinet.snapshot().solved, false);
    const reconnect = cabinet.connect('coil', 'coil-a1');
    assert.equal(reconnect.accepted, true);
  });

  it('second full run after reset matches the first exactly', () => {
    const cabinet = createRelayCabinet();
    cabinet.enter();
    const first = wireSolved(cabinet);
    const firstSnap = cabinet.snapshot();
    const firstEvents = cabinet.drainEvents();
    cabinet.reset();
    cabinet.enter(); // idempotent: entered survived reset
    const second = wireSolved(cabinet);
    const secondSnap = cabinet.snapshot();
    const secondEvents = cabinet.drainEvents();
    assert.deepEqual(first, second);
    assert.deepEqual(firstEvents, secondEvents);
    assert.deepEqual(firstSnap, secondSnap);
  });

  it('second dropout run after reset matches the first exactly', () => {
    const run = (cabinet) => {
      cabinet.connect('coil', 'coil-a1');
      cabinet.connect('output', 'nc-12');
      return cabinet.test();
    };
    const cabinet = createRelayCabinet();
    const first = run(cabinet);
    const firstEvents = drainTypes(cabinet);
    cabinet.reset();
    const second = run(cabinet);
    const secondEvents = drainTypes(cabinet);
    assert.deepEqual(first, second);
    assert.deepEqual(firstEvents, secondEvents);
  });
});

describe('relayCabinet destroy', () => {
  it('blocks every mutation after destroy and creates no events', () => {
    const cabinet = createRelayCabinet();
    cabinet.destroy();
    assert.equal(cabinet.snapshot().destroyed, true);
    cabinet.enter();
    const connected = cabinet.connect('coil', 'coil-a1');
    assert.equal(connected.accepted, false);
    assert.equal(connected.reason, 'destroyed');
    const disconnected = cabinet.disconnect('coil');
    assert.equal(disconnected.accepted, false);
    assert.equal(disconnected.reason, 'destroyed');
    const tested = cabinet.test();
    assert.equal(tested.accepted, false);
    assert.equal(tested.reason, 'destroyed');
    const reset = cabinet.reset();
    assert.equal(reset.accepted, false);
    assert.equal(reset.reason, 'destroyed');
    const snap = cabinet.snapshot();
    assert.equal(snap.entered, false);
    assert.equal(snap.coilLeadTerminal, null);
    assert.equal(snap.testState, 'idle');
    assert.equal(snap.solved, false);
    assert.deepEqual(cabinet.drainEvents(), []);
  });

  it('rejected calls after destroy stay silent (no rejection events)', () => {
    const cabinet = createRelayCabinet();
    cabinet.destroy();
    cabinet.connect('coil', 'coil-a2');
    cabinet.connect('bogus', 'x9');
    cabinet.disconnect('coil');
    assert.deepEqual(cabinet.drainEvents(), []);
  });

  it('destroy flushes pending events', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    cabinet.connect('coil', 'coil-a2'); // rejected, queues connect-rejected
    cabinet.destroy();
    assert.deepEqual(cabinet.drainEvents(), []);
  });

  it('destroy is idempotent', () => {
    const cabinet = createRelayCabinet();
    cabinet.destroy();
    cabinet.destroy();
    assert.equal(cabinet.snapshot().destroyed, true);
  });

  it('destroy after solved keeps both flags without leaking events', () => {
    const cabinet = createRelayCabinet();
    wireSolved(cabinet);
    cabinet.destroy();
    const snap = cabinet.snapshot();
    assert.equal(snap.destroyed, true);
    assert.equal(snap.solved, true);
    assert.equal(cabinet.isSolved(), true);
    assert.deepEqual(cabinet.drainEvents(), []);
  });
});

describe('relayCabinet snapshot isolation', () => {
  it('external mutation of a snapshot cannot pollute internal state', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    const snap = cabinet.snapshot();
    snap.coilLeadTerminal = 'gnd-lug';
    snap.outputLeadTerminal = 'no-14';
    snap.coilEnergized = false;
    snap.ncContactClosed = true;
    snap.testState = 'passed';
    snap.solved = true;
    snap.destroyed = true;
    const fresh = cabinet.snapshot();
    assert.equal(fresh.coilLeadTerminal, 'coil-a1');
    assert.equal(fresh.outputLeadTerminal, null);
    assert.equal(fresh.coilEnergized, true);
    assert.equal(fresh.ncContactClosed, false);
    assert.equal(fresh.testState, 'idle');
    assert.equal(fresh.solved, false);
    assert.equal(fresh.destroyed, false);
  });
});

describe('relayCabinet drainEvents', () => {
  it('returns a fresh array and clears the queue', () => {
    const cabinet = createRelayCabinet();
    cabinet.connect('coil', 'coil-a1');
    const first = cabinet.drainEvents();
    assert.equal(first.length, 2);
    first.push({ type: 'tampered' });
    assert.deepEqual(cabinet.drainEvents(), []);
    cabinet.connect('output', 'no-14');
    const second = cabinet.drainEvents();
    assert.deepEqual(
      second.map((e) => e.type),
      ['lead-connected'],
    );
  });

  it('events carry no Phaser or DOM objects, only plain data', () => {
    const cabinet = createRelayCabinet();
    wireSolved(cabinet);
    const events = cabinet.drainEvents();
    for (const event of events) {
      const roundTripped = JSON.parse(JSON.stringify(event));
      assert.deepEqual(roundTripped, event, `event ${event.type} must be JSON-safe`);
    }
  });
});
