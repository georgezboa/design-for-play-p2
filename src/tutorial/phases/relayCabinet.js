// Phase II — relay cabinet "THE MISSING CONTACT".
// Pure logic: no Phaser, no DOM, no rendering. The player lands two cloth
// leads inside the relay case: the AMBER coil lead energizes the coil at A1,
// which pulls the armature (NO contact closes, NC contact opens); the CYAN
// output lead must then land on the contact that still forms a safe path
// after that mechanical change. TEST classifies the wiring without ever
// clearing it; RESET is the only operation that pulls the leads back.
//
// Locked API (work package §4.1):
//   createRelayCabinet(config?) / enter(context?) / snapshot() /
//   connect(lead, terminal) / disconnect(lead) / test() / reset() /
//   drainEvents() / isSolved() / destroy()
//
// Terminal roster (small on purpose):
//   'coil-a1'  — the only correct COIL lead target; always energizes.
//   'coil-a2'  — KNOWN-BUT-DEAD. The physical coil return screw exists in
//                the close-up art, but a single lead landed there closes no
//                circuit: connect('coil','coil-a2') is rejected with the
//                dedicated reason 'coil-a2-open-return' (the return side is
//                open without a second wire). The OUTPUT lead on A2 is plain
//                cross-wiring ('wrong-lead-terminal').
//   'no-14'    — NO contact output terminal; correct OUTPUT lead target.
//   'nc-12'    — NC contact output terminal; legal OUTPUT target, drops out.
//   'gnd-lug'  — ground stud; BOTH leads may land on it (ground-fault path).
// Terminal ids outside the roster are rejected with 'unknown-terminal'.
// Ordinary player mistakes never throw; they return { accepted, reason, ... }
// structures AND queue a rejection event so the art layer can play a local
// bounce-back instead of a fake success:
//   connect()    rejects -> 'connect-rejected'    { lead, terminal, reason }
//   disconnect() rejects -> 'disconnect-rejected' { lead, terminal, reason }
// One rejection event per rejected call (never zero, never duplicated);
// payload lead/terminal echo the attempt (non-string inputs sanitized to
// null). Calls after destroy() stay silent by design.
//
// TEST classification (deterministic, in precedence order):
//   1. either lead unconnected               -> 'incomplete'   (test-incomplete)
//   2. either lead on 'gnd-lug'              -> 'ground-fault' (test-ground-fault)
//   3. OUTPUT on 'nc-12' (coil energized)    -> 'dropout'      (test-dropout)
//   4. COIL on 'coil-a1' + OUTPUT on 'no-14' -> 'passed'       (relay-bridged)
//
// Rationale notes:
// - incomplete beats ground-fault: with a dangling lead the TEST handle
//   mechanically cannot be pressed home (§2.3: handle bounces back), so no
//   current flows and the ground fault never arcs.
// - "COIL not energized while OUTPUT sits on 'no-14'" needs no extra branch:
//   the only coil terminal that passes connect() validation besides
//   'gnd-lug' is 'coil-a1', which always energizes. A de-energized coil
//   therefore means the coil lead is unconnected (case 1) or grounded
//   (case 2). There is no legal-but-unpowered coil landing.
// - dropout and ground-fault never clear leads (§2.3); only reset() pulls
//   them back.
// - testState is sticky: it records the last TEST outcome and only changes
//   on the next test() or on reset(). Rewiring alone does not erase it.
// - dropoutHint (Wave: failure feedback) is the single allowed short prompt:
//   entering the dropout result sets it to RELAY_DROPOUT_HINT, and ANY real
//   wiring change (accepted connect/disconnect that moves a lead) or any new
//   TEST outcome that is not dropout clears it. Rejected attempts and
//   idempotent same-terminal re-connects change nothing, so they keep it.
//   It is carried both on snapshot().dropoutHint (steady display) and inside
//   every event's snapshot spread, so the art layer never derives the copy.
// - Once solved, the wiring is committed (the signal has moved on to the
//   contactor): connect/disconnect are rejected with reason 'solved', and
//   re-pressing TEST is idempotent (relay-bridged is one-shot). reset()
//   unlocks the cabinet for an exact replay.
// - entered means "the cabinet close-up has been opened at least once".
//   Closing the close-up must NOT clear wiring progress, so there is
//   intentionally no exit(); reset() preserves entered.
//
// Event order guarantees (FIFO via drainEvents):
//   connect coil->'coil-a1'      : lead-connected, coil-picked
//   connect coil->'gnd-lug'      : lead-connected            (no pickup)
//   connect output-><terminal>   : lead-connected
//   connect() rejected           : connect-rejected          (exactly one)
//   disconnect energized coil    : lead-disconnected, relay-dropped
//   disconnect other lead states : lead-disconnected
//   disconnect() rejected        : disconnect-rejected       (exactly one)
//   test()                       : exactly one of test-incomplete /
//                                  test-ground-fault / test-dropout /
//                                  relay-bridged
//   reset() / destroy()          : no events; both flush the queue.

export const RELAY_LEADS = Object.freeze({
  COIL: 'coil',
  OUTPUT: 'output',
});

export const RELAY_TERMINALS = Object.freeze({
  COIL_A1: 'coil-a1',
  /** Known-but-dead coil return screw; single-lead landings are rejected. */
  COIL_A2: 'coil-a2',
  NO_14: 'no-14',
  NC_12: 'nc-12',
  GND_LUG: 'gnd-lug',
});

export const RELAY_TEST_STATES = Object.freeze([
  'idle',
  'incomplete',
  'dropout',
  'ground-fault',
  'passed',
]);

// The one short line a dropout may show (spec: exactly this copy, no more).
export const RELAY_DROPOUT_HINT = 'CONTACT DROPPED — TRACE THE LIVE ARM';

export const RELAY_REJECT_REASONS = Object.freeze([
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

const VALID_LEADS = Object.freeze(new Set([RELAY_LEADS.COIL, RELAY_LEADS.OUTPUT]));

const KNOWN_TERMINALS = Object.freeze(
  new Set([
    RELAY_TERMINALS.COIL_A1,
    RELAY_TERMINALS.COIL_A2,
    RELAY_TERMINALS.NO_14,
    RELAY_TERMINALS.NC_12,
    RELAY_TERMINALS.GND_LUG,
  ]),
);

// Terminals each lead may physically land on and have current flow. The
// ground stud accepts both leads (it exists to be misused); 'coil-a2' is
// deliberately absent everywhere — it is visible but dead for a single lead.
const CONNECTABLE_TERMINALS = Object.freeze({
  [RELAY_LEADS.COIL]: Object.freeze(
    new Set([RELAY_TERMINALS.COIL_A1, RELAY_TERMINALS.GND_LUG]),
  ),
  [RELAY_LEADS.OUTPUT]: Object.freeze(
    new Set([
      RELAY_TERMINALS.NO_14,
      RELAY_TERMINALS.NC_12,
      RELAY_TERMINALS.GND_LUG,
    ]),
  ),
});

function makeEntryState(entered) {
  return {
    entered,
    coilLeadTerminal: null,
    outputLeadTerminal: null,
    coilEnergized: false,
    noContactClosed: false,
    ncContactClosed: true, // resting relay: NC closed, NO open
    testState: 'idle',
    dropoutHint: null,
    solved: false,
    destroyed: false,
  };
}

function leadField(lead) {
  return lead === RELAY_LEADS.COIL ? 'coilLeadTerminal' : 'outputLeadTerminal';
}

// Rejection event payloads must stay JSON-safe plain data; non-string player
// input (null, numbers, objects) is echoed as null rather than leaked raw.
function asStringOrNull(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function createRelayCabinet(config = {}) {
  let state = makeEntryState(Boolean(config?.entered));
  const events = [];

  function pushEvent(type, payload = {}) {
    events.push({ type, ...payload });
  }

  function snapshotInternal() {
    return {
      entered: state.entered,
      coilLeadTerminal: state.coilLeadTerminal,
      outputLeadTerminal: state.outputLeadTerminal,
      coilEnergized: state.coilEnergized,
      noContactClosed: state.noContactClosed,
      ncContactClosed: state.ncContactClosed,
      testState: state.testState,
      dropoutHint: state.dropoutHint,
      solved: state.solved,
      destroyed: state.destroyed,
    };
  }

  // The relay is a pure function of the wiring: the coil is energized iff
  // the coil lead sits on 'coil-a1'. Energizing pulls the armature (NO
  // closes, NC opens); losing the coil drops it back to rest. Emits
  // coil-picked / relay-dropped only on actual transitions, so the lead
  // connection order is irrelevant.
  function settleRelay() {
    const shouldEnergize = state.coilLeadTerminal === RELAY_TERMINALS.COIL_A1;
    if (shouldEnergize === state.coilEnergized) return;
    state.coilEnergized = shouldEnergize;
    state.noContactClosed = shouldEnergize;
    state.ncContactClosed = !shouldEnergize;
    pushEvent(shouldEnergize ? 'coil-picked' : 'relay-dropped', snapshotInternal());
  }

  function reject(reason, extra = {}) {
    return { accepted: false, reason, ...extra };
  }

  // Every operational rejection queues exactly one event so the art layer
  // never has to guess why an optimistic snap was refused. destroyed calls
  // are the exception: the cabinet is gone, so they stay silent.
  function rejectConnect(reason, lead, terminal, extra = {}) {
    pushEvent('connect-rejected', {
      lead: asStringOrNull(lead),
      terminal: asStringOrNull(terminal),
      reason,
    });
    return reject(reason, extra);
  }

  function rejectDisconnect(reason, lead, extra = {}) {
    const field = VALID_LEADS.has(lead) ? leadField(lead) : null;
    pushEvent('disconnect-rejected', {
      lead: asStringOrNull(lead),
      terminal: field ? state[field] : null,
      reason,
    });
    return reject(reason, extra);
  }

  const api = {
    enter(context = {}) {
      if (state.destroyed) return api;
      if (state.entered) {
        // Re-entering the close-up must not stack or duplicate state.
        return api;
      }
      state.entered = true;
      return api;
    },

    connect(lead, terminal) {
      if (state.destroyed) {
        return reject('destroyed', { lead: null, terminal: null });
      }
      if (!VALID_LEADS.has(lead)) {
        return rejectConnect('unknown-lead', lead, terminal, {
          lead: null,
          terminal: null,
        });
      }
      if (typeof terminal !== 'string' || terminal.length === 0) {
        return rejectConnect('invalid-terminal', lead, terminal, {
          lead,
          terminal: null,
        });
      }
      if (!KNOWN_TERMINALS.has(terminal)) {
        return rejectConnect('unknown-terminal', lead, terminal, {
          lead,
          terminal: null,
        });
      }
      if (terminal === RELAY_TERMINALS.COIL_A2 && lead === RELAY_LEADS.COIL) {
        // A2 is the coil return screw: physically present in the art, but
        // one lead on the return side closes no circuit, so the coil can
        // never pick from here. Dedicated reason lets the art layer knock
        // the A2 screw specifically instead of a generic refusal.
        return rejectConnect('coil-a2-open-return', lead, terminal, { lead, terminal });
      }
      if (!CONNECTABLE_TERMINALS[lead].has(terminal)) {
        return rejectConnect('wrong-lead-terminal', lead, terminal, { lead, terminal });
      }
      if (state.solved) {
        return rejectConnect('solved', lead, terminal, { lead, terminal: null });
      }
      const field = leadField(lead);
      if (state[field] === terminal) {
        // Idempotent re-connect to the same terminal: accepted, but no
        // state change and no duplicate lead-connected event.
        return { accepted: true, reason: null, lead, terminal };
      }
      if (state[field] !== null) {
        // One landing per lead; moving a lead requires disconnect() first.
        return rejectConnect('lead-already-connected', lead, terminal, {
          lead,
          terminal: state[field],
        });
      }
      state[field] = terminal;
      // A real wiring change erases the dropout hint (rejected attempts and
      // idempotent same-terminal re-connects never reach this line).
      state.dropoutHint = null;
      pushEvent('lead-connected', { lead, terminal, ...snapshotInternal() });
      settleRelay();
      return { accepted: true, reason: null, lead, terminal };
    },

    disconnect(lead) {
      if (state.destroyed) {
        return reject('destroyed', { lead: null, terminal: null });
      }
      if (!VALID_LEADS.has(lead)) {
        return rejectDisconnect('unknown-lead', lead, { lead: null, terminal: null });
      }
      if (state.solved) {
        return rejectDisconnect('solved', lead, { lead, terminal: null });
      }
      const field = leadField(lead);
      if (state[field] === null) {
        return rejectDisconnect('lead-not-connected', lead, { lead, terminal: null });
      }
      const terminal = state[field];
      state[field] = null;
      // A real wiring change erases the dropout hint.
      state.dropoutHint = null;
      pushEvent('lead-disconnected', { lead, terminal, ...snapshotInternal() });
      settleRelay();
      return { accepted: true, reason: null, lead, terminal };
    },

    test() {
      if (state.destroyed) {
        return reject('destroyed', { result: null, solved: state.solved });
      }
      if (state.solved) {
        // Passed wiring is committed; re-pressing TEST is idempotent and
        // must not emit a second relay-bridged.
        return { accepted: true, reason: null, result: state.testState, solved: true };
      }

      const missing = [];
      if (state.coilLeadTerminal === null) missing.push(RELAY_LEADS.COIL);
      if (state.outputLeadTerminal === null) missing.push(RELAY_LEADS.OUTPUT);

      let result;
      let eventType;
      let payload = {};
      if (missing.length > 0) {
        // TEST handle cannot bottom out with a dangling lead; wiring kept.
        result = 'incomplete';
        eventType = 'test-incomplete';
        payload = { missing };
      } else {
        const faulted = [];
        if (state.coilLeadTerminal === RELAY_TERMINALS.GND_LUG) {
          faulted.push(RELAY_LEADS.COIL);
        }
        if (state.outputLeadTerminal === RELAY_TERMINALS.GND_LUG) {
          faulted.push(RELAY_LEADS.OUTPUT);
        }
        if (faulted.length > 0) {
          // Local fault only: one spark, no global reset, leads stay put.
          result = 'ground-fault';
          eventType = 'test-ground-fault';
          payload = { faulted, terminal: RELAY_TERMINALS.GND_LUG };
        } else if (state.outputLeadTerminal === RELAY_TERMINALS.NC_12) {
          // Both leads landed on non-ground terminals, so the coil is on
          // A1 and energized; the armature has opened NC, so the output
          // flashes briefly then drops out. Leads and coil state persist.
          result = 'dropout';
          eventType = 'test-dropout';
          payload = { lead: RELAY_LEADS.OUTPUT, terminal: RELAY_TERMINALS.NC_12 };
        } else {
          // OUTPUT on 'no-14' with the armature pulled: continuous safe path.
          result = 'passed';
          eventType = 'relay-bridged';
          state.solved = true;
        }
      }

      state.testState = result;
      // Hint lifecycle: entering dropout hands the art its one allowed line;
      // any other fresh TEST outcome clears it. Repeating TEST on unchanged
      // dropout wiring simply re-enters dropout, so the hint persists.
      state.dropoutHint = result === 'dropout' ? RELAY_DROPOUT_HINT : null;
      pushEvent(eventType, { ...payload, ...snapshotInternal() });
      return { accepted: true, reason: null, result, solved: state.solved };
    },

    reset() {
      if (state.destroyed) {
        return reject('destroyed');
      }
      // Mechanical RESET key: pulls both leads back, relay returns to rest,
      // testState returns to idle, solved clears, and the event queue is
      // flushed (including any queued rejection events). It does not move
      // the player or close the cabinet, so `entered` survives; replay
      // after reset reproduces the first run.
      const wasEntered = state.entered;
      state = makeEntryState(wasEntered);
      events.length = 0;
      return { accepted: true, reason: null };
    },

    snapshot() {
      // All fields are primitives, so a shallow copy fully isolates
      // internal state from external mutation.
      return { ...snapshotInternal() };
    },

    isSolved() {
      return state.solved;
    },

    destroy() {
      state.destroyed = true;
      events.length = 0;
      return api;
    },

    drainEvents() {
      return events.splice(0, events.length);
    },
  };

  return api;
}
