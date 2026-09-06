// Phase II — CONTACT interlock QA fixtures (Wave 3, Agent D; three-segment
// update by relay-integration-owner).
//
// Scenario-level state fixtures built on top of the pure logic module
// `src/tutorial/phases/contactInterlock.js`. Each named fixture drives the
// state machine to a locked QA state (WAVE_3_PHASE_II_COORD_STATE_SPEC.md §6
// + relay work package §6) and returns `{ snapshot, events }`:
//
//   - snapshot: interlock.snapshot() taken AT the fixture state.
//   - events:   the cumulative list of events drained while driving from a
//               fresh instance to that state. For `reset-replay`, events are
//               the REPLAY run's events (post-reset), so they can be compared
//               1:1 against the `complete` fixture's events.
//
// Everything here is pure Node — no Phaser — so integration-owner can reuse
// `driveToState` inside a browser QA route (e.g. `?qa=phase2&state=signal-mid`)
// to replay the exact same state definitions.
//
// Three-segment update: every rig wires a REAL relay cabinet
// (src/tutorial/phases/relayCabinet.js, frozen) into the interlock's
// isRelaySolved hook, and routes that cross the cabinet bridge it through the
// cabinet's public API — never by poking internals. `relay-waiting` is the
// new fixture for the parked-at-the-cabinet state; `panel-open` is logically
// the entry state (the browser route layers the close-up open path on top).

import {
  CONTACT_INTERLOCK_DEFAULTS,
  createContactInterlock,
} from '../../src/tutorial/phases/contactInterlock.js';
import { createRelayCabinet } from '../../src/tutorial/phases/relayCabinet.js';

/** All QA fixture state names, in route order. */
export const QA_STATE_NAMES = Object.freeze([
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

/** The visual states from the locked spec §2 (+ relay waiting), mapped to fixtures. */
export const QA_VISUAL_STATES = Object.freeze([
  'dormant',
  'power-fail',
  'signal-moving',
  'relay-waiting',
  'energized',
  'complete',
]);

/** Map each visual state to the fixture that produces its steady-state data. */
export const VISUAL_STATE_FIXTURE = Object.freeze({
  dormant: 'entry',
  'power-fail': 'power-fail',
  'signal-moving': 'signal-mid',
  'relay-waiting': 'relay-waiting',
  energized: 'energized',
  complete: 'complete',
});

/** Snapshot fields the spec §2 visuals must be derivable from. */
export const SNAPSHOT_DISCRIMINANT_FIELDS = Object.freeze([
  'latchClosed',
  'preRelayProgress',
  'relayWaiting',
  'postRelayProgress',
  'signalProgress',
  'circuitEnergized',
  'contactorClosed',
  'complete',
  'lastFault',
]);

/** Expected event type sequence of one full correct route. */
export const CORRECT_ROUTE_EVENTS = Object.freeze([
  'latch-reset',
  'trace-started',
  'trace-reached-relay',
  'trace-energized',
  'contactor-closed',
  'traction-enabled',
]);

// ---------------------------------------------------------------------------
// Rig: interlock instance + wired relay cabinet + cumulative event collector.
// `collect()` drains the interlock's event queue into `rig.events`.
// ---------------------------------------------------------------------------

/**
 * Create a QA rig: a fresh relay cabinet plus a fresh interlock whose
 * isRelaySolved hook reads that cabinet.
 */
export function createQaRig(config = {}) {
  const relay = createRelayCabinet();
  const interlock = createContactInterlock({
    ...config,
    isRelaySolved: () => relay.isSolved(),
  });
  const events = [];
  return {
    interlock,
    relay,
    events,
    collect() {
      events.push(...interlock.drainEvents());
      return events;
    },
  };
}

// ---------------------------------------------------------------------------
// Route step helpers (each ends by collecting drained events).
// ---------------------------------------------------------------------------

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
export function stepSolveRelay(rig) {
  const relay = rig.relay;
  if (!relay || relay.isSolved()) return;
  relay.enter();
  relay.connect('coil', 'coil-a1');
  relay.connect('output', 'no-14');
  relay.test();
  relay.drainEvents();
}

/** The full correct route from entry to complete. */
function runCorrectRoute(rig, propagationMs) {
  stepEnter(rig);
  stepCloseLatch(rig);
  stepSolveRelay(rig);
  stepAdvance(rig, propagationMs);
  stepPressPower(rig);
}

// ---------------------------------------------------------------------------
// Per-state drivers. Each receives a rig that is FRESH (nothing called yet)
// unless documented otherwise, mutates it to the target state, and collects
// events along the way.
// ---------------------------------------------------------------------------

const STATE_DRIVERS = {
  /** enter 后的初始状态（画面状态 dormant）。 */
  entry(rig) {
    stepEnter(rig);
  },

  /** 直接 interact('power') 被拒后（画面状态 power-fail）。 */
  'power-fail'(rig) {
    stepEnter(rig);
    stepPressPower(rig);
  },

  /** interact('latch') 后立即：门闩已闭合，信号尚未传播（progress === 0）。 */
  'latch-closed'(rig) {
    stepEnter(rig);
    stepCloseLatch(rig);
  },

  /** 信号传播到约一半（仍在 pre 段）：progress ∈ (0, 1)，画面状态 signal-moving。 */
  'signal-mid'(rig, propagationMs) {
    stepEnter(rig);
    stepCloseLatch(rig);
    stepAdvance(rig, propagationMs / 2);
  },

  /**
   * 信号越过 pre 段停在柜口：relayWaiting，trace-reached-relay 已发，
   * 柜未接线（POWER 此时会以 'relay-open' 本地弹回）。
   */
  'relay-waiting'(rig, propagationMs) {
    stepEnter(rig);
    stepCloseLatch(rig);
    stepAdvance(rig, propagationMs);
  },

  /** 柜已接线，传播完成（circuitEnergized），但尚未合 POWER。 */
  energized(rig, propagationMs) {
    stepEnter(rig);
    stepCloseLatch(rig);
    stepSolveRelay(rig);
    stepAdvance(rig, propagationMs);
  },

  /** 合 POWER 完成（画面状态 complete）。 */
  complete(rig, propagationMs) {
    runCorrectRoute(rig, propagationMs);
  },

  /**
   * complete 后 reset，再完整走一遍正确路线到 complete。
   * 第一遍的事件在 reset 前单独收集（reset 会清空队列），返回的 events
   * 仅为第二遍（replay）的事件序列，便于与 `complete` 夹具逐一对照。
   * 柜在第一遍已被接线并保持 solved（reset-replay 重置的是房间状态机，
   * 不是退房的清线），第二遍 stepSolveRelay 自然 no-op。
   */
  'reset-replay'(rig, propagationMs) {
    runCorrectRoute(rig, propagationMs);
    rig.collect(); // capture (and drain) first-run events before reset wipes the queue
    rig.events.length = 0; // returned events describe the replay run only
    rig.interlock.reset();
    runCorrectRoute(rig, propagationMs);
  },

  /**
   * 近景夹具的最小挂点：逻辑上等同于 entry；浏览器路由在其上运行真实的
   * openRelayCloseup() 路径（门闩节拍 + 镜头推近）。
   */
  'panel-open'(rig) {
    stepEnter(rig);
  },
};

/**
 * Drive an interlock to a named QA state and return `{ name, snapshot, events }`.
 *
 * @param {string} name  one of QA_STATE_NAMES
 * @param {object} [instance]  optional existing interlock instance. When
 *   omitted a fresh wired rig interlock is used. When provided, the instance
 *   is driven as-is (expected to be fresh / at route start) and `config.relay`
 *   should carry the cabinet its hook reads.
 * @param {object} [config]  forwarded to createContactInterlock when no
 *   instance is given (e.g. `{ propagationMs }`); `config.relay` overrides the
 *   rig's cabinet. NOTE vs the src mirror: driveToState always wires a
 *   cabinet (fresh one when `config.relay` is omitted), while
 *   src/tutorial/qa/phase2Qa.js deliberately stays legacy straight-through
 *   when no cabinet is provided at all (locked by relayChainQa.test.mjs);
 *   with `config.relay` and no instance both entries behave identically.
 */
export function driveToState(name, instance, config = {}) {
  if (!Object.prototype.hasOwnProperty.call(STATE_DRIVERS, name)) {
    throw new RangeError(
      `unknown QA state "${name}"; expected one of: ${QA_STATE_NAMES.join(', ')}`,
    );
  }
  const propagationMs =
    typeof config.propagationMs === 'number' &&
    Number.isFinite(config.propagationMs) &&
    config.propagationMs > 0
      ? config.propagationMs
      : CONTACT_INTERLOCK_DEFAULTS.propagationMs;

  const relay = config.relay ?? createRelayCabinet();
  const rig = {
    interlock: instance ?? createContactInterlock({
      ...config,
      isRelaySolved: () => relay.isSolved(),
    }),
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

/** Convenience: drive every named state on fresh instances. */
export function driveAllStates(config = {}) {
  const out = {};
  for (const name of QA_STATE_NAMES) {
    out[name] = driveToState(name, undefined, config);
  }
  return out;
}

/**
 * Reduce a fixture result to the snapshot fields the visual states must be
 * distinguishable by (spec §2 / task 1). Used by tests and by
 * integration-owner's render_game_to_text assertions.
 */
export function visualSignature(fixtureResult) {
  const snap = fixtureResult.snapshot ?? fixtureResult;
  const sig = {};
  for (const field of SNAPSHOT_DISCRIMINANT_FIELDS) {
    sig[field] = snap[field];
  }
  return sig;
}

/** Event types of a fixture result, in emission order. */
export function eventTypes(fixtureResult) {
  return fixtureResult.events.map((e) => e.type);
}
