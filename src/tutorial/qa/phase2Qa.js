// Phase II — browser QA state drivers (integration-owner wiring aid).
//
// THIN MIRROR of tests/tutorial/contactInterlockQa.mjs. The tests directory is
// read-only for the integration pass and importing it from src would invert
// the dependency direction, so the locked fixture drivers
// (WAVE_3_PHASE_II_COORD_STATE_SPEC.md §6 + relay work package §6) are
// replicated here. If the test fixture ever changes, this file must change
// with it.
//
// Used only by the dev-only browser route `?qa=phase2&state=<name>`: it drives
// the LIVE in-game interlock instance to a named state and returns the
// `{ snapshot, events }` pair, so the caller can replay the events through
// ContactInterlockArt.handleEvent and then兜底 with applySnapshot.
//
// Three-segment update (relay-integration-owner): fixture states beyond the
// cabinet ('energized', 'complete', 'reset-replay') bridge the relay cabinet
// through its public API before advancing, because the live interlock's
// isRelaySolved hook reads the real cabinet. Pass the cabinet as
// `config.relay`: with no instance given, a provided `config.relay` is ALSO
// wired into the fresh interlock's isRelaySolved hook, exactly like
// driveToState() in the mirrored fixture file. Without a cabinet at all the
// drivers behave as before (legacy straight-through, no waiting segment) —
// that no-relay divergence from the mirror is deliberate and locked by
// tests/tutorial/relayChainQa.test.mjs.
// New minimal relay挂点 (Wave 4 extends the full fixture set):
//   'relay-waiting'  signal parked at the cabinet mouth, case unbridged
//   'panel-open'     entry state + the caller runs the real close-up open path

import {
  CONTACT_INTERLOCK_DEFAULTS,
  createContactInterlock,
} from '../phases/contactInterlock.js';

/** All QA fixture state names, in route order (mirrors QA_STATE_NAMES). */
export const PHASE2_QA_STATE_NAMES = Object.freeze([
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

// The entry route is a playable shortcut, not a screenshot fixture. Every
// other named state stays frozen so visual QA can hold transient machinery at
// an exact frame.
export function shouldFreezePhase2QAState(stateName) {
  return stateName !== 'entry';
}

function stepEnter(rig) {
  rig.interlock.enter();
  rig.collect();
}

function stepCloseLatch(rig) {
  rig.interlock.interact('latch');
  rig.collect();
}

function stepAdvance(rig, deltaMs) {
  rig.interlock.update(deltaMs);
  rig.collect();
}

function stepPressPower(rig) {
  rig.interlock.interact('power');
  rig.collect();
}

// Bridge the cabinet exactly the way the player does in the close-up: COIL
// lead to A1, OUTPUT lead to the NO contact, TEST. Relay events are the
// close-up's business, not the world trace's, so they are drained and dropped.
function stepSolveRelay(rig) {
  const relay = rig.relay;
  if (!relay || relay.isSolved()) return;
  relay.enter();
  relay.connect('coil', 'coil-a1');
  relay.connect('output', 'no-14');
  relay.test();
  relay.drainEvents();
}

function runCorrectRoute(rig, propagationMs) {
  stepEnter(rig);
  stepCloseLatch(rig);
  stepSolveRelay(rig);
  stepAdvance(rig, propagationMs);
  stepPressPower(rig);
}

const STATE_DRIVERS = {
  entry(rig) {
    stepEnter(rig);
  },
  'power-fail'(rig) {
    stepEnter(rig);
    stepPressPower(rig);
  },
  'latch-closed'(rig) {
    stepEnter(rig);
    stepCloseLatch(rig);
  },
  'signal-mid'(rig, propagationMs) {
    stepEnter(rig);
    stepCloseLatch(rig);
    stepAdvance(rig, propagationMs / 2);
  },
  // The signal has crossed the pre-relay segment and now holds at the
  // cabinet mouth: relayWaiting, trace-reached-relay fired, case unbridged.
  'relay-waiting'(rig, propagationMs) {
    stepEnter(rig);
    stepCloseLatch(rig);
    stepAdvance(rig, propagationMs);
  },
  energized(rig, propagationMs) {
    stepEnter(rig);
    stepCloseLatch(rig);
    stepSolveRelay(rig);
    stepAdvance(rig, propagationMs);
  },
  complete(rig, propagationMs) {
    runCorrectRoute(rig, propagationMs);
  },
  'reset-replay'(rig, propagationMs) {
    runCorrectRoute(rig, propagationMs);
    rig.collect();
    rig.events.length = 0; // returned events describe the replay run only
    rig.interlock.reset();
    runCorrectRoute(rig, propagationMs);
  },
  // The close-up fixture. Logically identical to entry; the browser route
  // layers the real openRelayCloseup() path (door beat + camera push) on top.
  'panel-open'(rig) {
    stepEnter(rig);
  },
};

/**
 * Drive an interlock to a named QA state and return `{ name, snapshot, events }`.
 * Mirrors driveToState() from tests/tutorial/contactInterlockQa.mjs.
 *
 * @param {string} name  one of PHASE2_QA_STATE_NAMES
 * @param {object} [instance]  existing live interlock; expected fresh / at
 *   route start. When omitted a fresh instance is created.
 * @param {object} [config]  forwarded to createContactInterlock when no
 *   instance is given; `config.relay` is the cabinet the drivers bridge for
 *   states beyond the relay, and — with no instance given — is also wired
 *   into the fresh interlock's isRelaySolved hook (mirrors driveToState).
 */
export function drivePhase2State(name, instance, config = {}) {
  if (!Object.prototype.hasOwnProperty.call(STATE_DRIVERS, name)) {
    throw new RangeError(
      `unknown QA state "${name}"; expected one of: ${PHASE2_QA_STATE_NAMES.join(', ')}`,
    );
  }
  const propagationMs =
    typeof config.propagationMs === 'number' &&
    Number.isFinite(config.propagationMs) &&
    config.propagationMs > 0
      ? config.propagationMs
      : CONTACT_INTERLOCK_DEFAULTS.propagationMs;

  const relay = config.relay ?? null;
  const rig = {
    // No instance + a provided cabinet: wire the hook so the fresh interlock
    // actually waits at the cabinet the drivers bridge (previously it was
    // created hookless and silently degraded to legacy straight-through).
    interlock:
      instance ??
      createContactInterlock(
        relay ? { ...config, isRelaySolved: () => relay.isSolved() } : config,
      ),
    relay,
    events: [],
    collect() {
      this.events.push(...this.interlock.drainEvents());
      return this.events;
    },
  };

  STATE_DRIVERS[name](rig, propagationMs);
  rig.collect();

  return {
    name,
    snapshot: rig.interlock.snapshot(),
    events: rig.events.slice(),
  };
}
