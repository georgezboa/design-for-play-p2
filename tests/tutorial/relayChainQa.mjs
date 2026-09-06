// Phase II — relay-chain QA fixtures (Wave 4, relay-qa-owner).
//
// Scenario-level FULL-CHAIN fixtures driving REAL instances of both frozen
// logic modules together:
//   - src/tutorial/phases/contactInterlock.js (three-segment trace)
//   - src/tutorial/phases/relayCabinet.js    (THE MISSING CONTACT case)
//
// Each named driver starts from a FRESH rig (a real relay cabinet wired into
// a real interlock's isRelaySolved hook) and returns:
//
//   {
//     name,
//     contact,  // interlock.snapshot() at the fixture state
//     relay,    // cabinet.snapshot() at the fixture state
//     events,   // cumulative drain of BOTH machines while driving, in call
//               // order, each entry tagged `source: 'contact' | 'relay'`
//   }
//
// `reset-replay` additionally returns `firstRun` ({ contact, relay, events })
// so tests can prove the replay is identical to the first pass.
//
// State roster (relay work package §5 Wave 4 / §6):
//   entry                 初始（contact enter，柜未开）
//   signal-before-relay   latch 后 pre 段传播中（0 < preRelayProgress < 1）
//   relay-waiting         到柜停住（pre=1, relayWaiting, circuitEnergized=false）
//   panel-open            relay.enter() 后未接线
//   coil-only             只接 COIL→coil-a1（NO 合 / NC 开，未接 OUTPUT）
//   wrong-NC              COIL + OUTPUT→nc-12，TEST → dropout（插线保留）
//   incomplete            TEST 空按（missing 双缺）
//   ground-fault          COIL→gnd-lug 后 TEST → ground-fault
//   solved                COIL→a1 + OUTPUT→no-14 + TEST passed（bridged 已锁存）
//   signal-after-relay    solved 后 post 段传播中（0 < postRelayProgress < 1）
//   energized             post=1, circuitEnergized=true, 未合 POWER
//   complete              合 POWER 完成
//   reset-replay          complete 后双机 reset，完整重走到 complete（与第一遍全等）
//
// States 1–12 are twelve pairwise-distinguishable logical states.
// `reset-replay` is INTENTIONALLY indistinguishable from `complete` — that
// equality is the replay-equivalence property being tested, not a gap.
//
// Everything here is pure Node — no Phaser — except the exported mock-scene
// helper used by the close-up art lifecycle tests (same style as
// relayCabinetArt.test.mjs).

import {
  CONTACT_INTERLOCK_DEFAULTS,
  createContactInterlock,
} from '../../src/tutorial/phases/contactInterlock.js';
import { createRelayCabinet } from '../../src/tutorial/phases/relayCabinet.js';

/** All relay-chain fixture state names, in player-route order. */
export const RELAY_CHAIN_STATE_NAMES = Object.freeze([
  'entry',
  'signal-before-relay',
  'relay-waiting',
  'panel-open',
  'coil-only',
  'wrong-NC',
  'incomplete',
  'ground-fault',
  'solved',
  'signal-after-relay',
  'energized',
  'complete',
  'reset-replay',
]);

/** Snapshot fields the chain states must be distinguishable by. */
export const CHAIN_CONTACT_FIELDS = Object.freeze([
  'latchClosed',
  'preRelayProgress',
  'relayWaiting',
  'relayBridged',
  'postRelayProgress',
  'signalProgress',
  'circuitEnergized',
  'contactorClosed',
  'complete',
  'lastFault',
]);

export const CHAIN_RELAY_FIELDS = Object.freeze([
  'entered',
  'coilLeadTerminal',
  'outputLeadTerminal',
  'coilEnergized',
  'noContactClosed',
  'ncContactClosed',
  'testState',
  'solved',
]);

/**
 * Expected combined event type sequence of one full correct route
 * (world trace + cabinet wiring + world trace + contactor), in order.
 */
export const CORRECT_CHAIN_EVENTS = Object.freeze([
  'latch-reset', // contact: latch pressed
  'trace-started', // contact: pre segment leaves the latch
  'trace-reached-relay', // contact: signal parks at the cabinet mouth
  'lead-connected', // relay: COIL lead lands on A1
  'coil-picked', // relay: armature pulls (NO closes / NC opens)
  'lead-connected', // relay: OUTPUT lead lands on NO-14
  'relay-bridged', // relay: TEST passed, wiring committed
  'trace-energized', // contact: post segment reaches the contactor
  'contactor-closed', // contact: POWER accepted
  'traction-enabled', // contact: phase complete
]);

// ---------------------------------------------------------------------------
// Rig: real cabinet + real interlock hooked together, cumulative drain of both.
// ---------------------------------------------------------------------------

/**
 * Create a chain QA rig: a fresh relay cabinet plus a fresh interlock whose
 * isRelaySolved hook reads that cabinet. `collect()` drains BOTH machines'
 * event queues into `rig.events`, tagging each entry with its source.
 */
export function createChainRig(config = {}) {
  const relay = createRelayCabinet();
  const contact = createContactInterlock({
    ...config,
    isRelaySolved: () => relay.isSolved(),
  });
  const events = [];
  return {
    contact,
    relay,
    events,
    collect() {
      for (const evt of relay.drainEvents()) events.push({ source: 'relay', ...evt });
      for (const evt of contact.drainEvents()) events.push({ source: 'contact', ...evt });
      return events;
    },
  };
}

// ---------------------------------------------------------------------------
// Route step helpers (each ends by collecting drained events from both rigs).
// ---------------------------------------------------------------------------

function stepEnter(rig) {
  rig.contact.enter();
  rig.collect();
}

function stepCloseLatch(rig) {
  rig.contact.interact('latch');
  rig.collect();
}

function stepAdvance(rig, deltaMs) {
  rig.contact.update(deltaMs);
  rig.collect();
}

function stepPressPower(rig) {
  rig.contact.interact('power');
  rig.collect();
}

function stepOpenPanel(rig) {
  rig.relay.enter();
  rig.collect();
}

function stepConnect(rig, lead, terminal) {
  rig.relay.connect(lead, terminal);
  rig.collect();
}

function stepTest(rig) {
  rig.relay.test();
  rig.collect();
}

// Bridge the cabinet exactly the way the player does in the close-up: COIL
// lead to A1, OUTPUT lead to the NO contact, TEST.
function stepSolveRelay(rig) {
  if (rig.relay.isSolved()) return;
  rig.relay.enter();
  rig.relay.connect('coil', 'coil-a1');
  rig.relay.connect('output', 'no-14');
  rig.relay.test();
  rig.collect();
}

// Segment durations derived from the locked timing defaults.
function preMs(propagationMs) {
  return propagationMs * CONTACT_INTERLOCK_DEFAULTS.relaySplit;
}

function postMs(propagationMs) {
  return propagationMs * (1 - CONTACT_INTERLOCK_DEFAULTS.relaySplit);
}

// Drive the rig to "signal parked at the cabinet, case unbridged".
function driveToRelayWaiting(rig, propagationMs) {
  stepEnter(rig);
  stepCloseLatch(rig);
  stepAdvance(rig, propagationMs);
}

// Drive the rig to "cabinet bridged, bridged fact latched into the trace,
// post segment not yet started". The zero-delta update lets the interlock
// poll the hook and latch relayBridged without moving the signal.
function driveToSolved(rig, propagationMs) {
  driveToRelayWaiting(rig, propagationMs);
  stepSolveRelay(rig);
  stepAdvance(rig, 0);
}

/**
 * The full correct route from entry to complete: states 1→12 in order.
 * Exported so restart-consistency tests can run it twice on separate rigs.
 */
export function driveCompleteRoute(rig, propagationMs = CONTACT_INTERLOCK_DEFAULTS.propagationMs) {
  driveToSolved(rig, propagationMs);
  stepAdvance(rig, propagationMs);
  stepPressPower(rig);
  rig.collect();
}

// ---------------------------------------------------------------------------
// Per-state drivers. Each receives a FRESH rig unless documented otherwise.
// ---------------------------------------------------------------------------

const STATE_DRIVERS = {
  /** 1 — 初始：contact entered，门闩未压，柜未开。 */
  entry(rig) {
    stepEnter(rig);
  },

  /** 2 — latch 后 pre 段传播中：0 < preRelayProgress < 1。 */
  'signal-before-relay'(rig, propagationMs) {
    stepEnter(rig);
    stepCloseLatch(rig);
    stepAdvance(rig, preMs(propagationMs) / 2);
  },

  /** 3 — 到柜停住：pre=1、relayWaiting=true、circuitEnergized=false。 */
  'relay-waiting'(rig, propagationMs) {
    driveToRelayWaiting(rig, propagationMs);
  },

  /** 4 — relay.enter() 后未接线（信号仍停在柜口）。 */
  'panel-open'(rig, propagationMs) {
    driveToRelayWaiting(rig, propagationMs);
    stepOpenPanel(rig);
  },

  /** 5 — 只接 COIL→coil-a1：线圈通电，NO 合 / NC 开，OUTPUT 未接。 */
  'coil-only'(rig, propagationMs) {
    driveToRelayWaiting(rig, propagationMs);
    stepOpenPanel(rig);
    stepConnect(rig, 'coil', 'coil-a1');
  },

  /** 6 — COIL + OUTPUT→nc-12，TEST → dropout；插线保留。 */
  'wrong-NC'(rig, propagationMs) {
    driveToRelayWaiting(rig, propagationMs);
    stepOpenPanel(rig);
    stepConnect(rig, 'coil', 'coil-a1');
    stepConnect(rig, 'output', 'nc-12');
    stepTest(rig);
  },

  /** 7 — TEST 空按：双缺 → incomplete。 */
  incomplete(rig, propagationMs) {
    driveToRelayWaiting(rig, propagationMs);
    stepOpenPanel(rig);
    stepTest(rig);
  },

  /** 8 — COIL→gnd-lug、OUTPUT→no-14，TEST → ground-fault。 */
  'ground-fault'(rig, propagationMs) {
    driveToRelayWaiting(rig, propagationMs);
    stepOpenPanel(rig);
    stepConnect(rig, 'coil', 'gnd-lug');
    stepConnect(rig, 'output', 'no-14');
    stepTest(rig);
  },

  /** 9 — COIL→a1 + OUTPUT→no-14 + TEST passed；bridged 已锁存进 trace。 */
  solved(rig, propagationMs) {
    driveToSolved(rig, propagationMs);
  },

  /** 10 — solved 后 post 段传播中：0 < postRelayProgress < 1。 */
  'signal-after-relay'(rig, propagationMs) {
    driveToSolved(rig, propagationMs);
    stepAdvance(rig, postMs(propagationMs) / 2);
  },

  /** 11 — post=1、circuitEnergized=true、未合 POWER。 */
  energized(rig, propagationMs) {
    driveToSolved(rig, propagationMs);
    stepAdvance(rig, propagationMs);
  },

  /** 12 — 合 POWER 完成。 */
  complete(rig, propagationMs) {
    driveCompleteRoute(rig, propagationMs);
  },

  /**
   * 13 — complete 后双机一起 reset（contact.reset + relay.reset，对应 §4.2
   * 的房间级复位：门闩、电流、柜内布线、接触器一起回入口），再完整重走到
   *  complete。返回的 events/snapshots 描述第二遍；`firstRun` 携带第一遍
   * 的完整记录，供全等断言。relay.reset() 保留 entered，contact.reset()
   * 清 entered——两遍都以 enter() 起步，终态因此一致。
   */
  'reset-replay'(rig, propagationMs) {
    driveCompleteRoute(rig, propagationMs);
    rig.collect();
    const firstRun = {
      contact: rig.contact.snapshot(),
      relay: rig.relay.snapshot(),
      events: rig.events.slice(),
    };
    rig.events.length = 0; // returned events describe the replay run only
    rig.contact.reset();
    rig.relay.reset();
    driveCompleteRoute(rig, propagationMs);
    rig.collect();
    return firstRun;
  },
};

/**
 * Drive a fresh (or supplied) rig to a named chain state.
 *
 * @param {string} name  one of RELAY_CHAIN_STATE_NAMES
 * @param {object} [rig]  optional existing chain rig (from createChainRig),
 *   expected fresh / at route start. When omitted a fresh rig is created.
 * @param {object} [config]  `{ propagationMs }` override for fresh rigs.
 * @returns {{ name, contact, relay, events, firstRun? }}
 */
export function driveChainState(name, rig, config = {}) {
  if (!Object.prototype.hasOwnProperty.call(STATE_DRIVERS, name)) {
    throw new RangeError(
      `unknown relay-chain state "${name}"; expected one of: ${RELAY_CHAIN_STATE_NAMES.join(', ')}`,
    );
  }
  const propagationMs =
    typeof config.propagationMs === 'number' &&
    Number.isFinite(config.propagationMs) &&
    config.propagationMs > 0
      ? config.propagationMs
      : CONTACT_INTERLOCK_DEFAULTS.propagationMs;

  const target = rig ?? createChainRig({ propagationMs });
  const firstRun = STATE_DRIVERS[name](target, propagationMs) ?? undefined;
  target.collect();

  const result = {
    name,
    contact: target.contact.snapshot(),
    relay: target.relay.snapshot(),
    events: target.events.slice(),
  };
  if (firstRun) result.firstRun = firstRun;
  return result;
}

/** Convenience: drive every named chain state on fresh rigs. */
export function driveAllChainStates(config = {}) {
  const out = {};
  for (const name of RELAY_CHAIN_STATE_NAMES) {
    out[name] = driveChainState(name, undefined, config);
  }
  return out;
}

/**
 * Reduce a chain fixture result to the discriminant signature used by the
 * pairwise-distinguishability test: every locked contact field (prefixed
 * `contact.`) plus every locked relay field (prefixed `relay.`).
 */
export function chainSignature(result) {
  const sig = {};
  for (const field of CHAIN_CONTACT_FIELDS) sig[`contact.${field}`] = result.contact[field];
  for (const field of CHAIN_RELAY_FIELDS) sig[`relay.${field}`] = result.relay[field];
  return sig;
}

/** Event types of a chain fixture result (or raw event array), in order. */
export function chainEventTypes(result) {
  const events = Array.isArray(result) ? result : result.events;
  return events.map((e) => e.type);
}

// ---------------------------------------------------------------------------
// Minimal Phaser-scene mock for the close-up art lifecycle tests (Wave 4 B/C).
// Same proven style as relayCabinetArt.test.mjs: GameObjects record property
// writes; tweens apply final values synchronously and fire onComplete, so
// chained one-shots resolve inside the test. NOTE: the mock never reaps a
// completed tween by itself (real Phaser's tween manager does), so
// getState().liveTweens here is a CONSERVATIVE upper bound — only tweens
// killed via killTweensOf (as open/close do for the door and bolt) leave the
// live set.
// ---------------------------------------------------------------------------

export function createMockScene() {
  const objects = [];
  const tweenList = [];

  function base(kind) {
    const go = {
      kind,
      depth: 0,
      scrollFactor: 1,
      visible: true,
      alpha: 1,
      x: 0,
      y: 0,
      angle: 0,
      scale: 1,
      fillColor: null,
      fillAlpha: null,
      text: '',
      destroyed: false,
      setDepth(n) { this.depth = n; return this; },
      setScrollFactor(n) { this.scrollFactor = n; return this; },
      setVisible(v) { this.visible = v; return this; },
      setAlpha(a) { this.alpha = a; return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      setX(x) { this.x = x; return this; },
      setY(y) { this.y = y; return this; },
      setAngle(a) { this.angle = a; return this; },
      setScale(s) { this.scale = s; return this; },
      setBlendMode(m) { this.blendMode = m; return this; },
      setOrigin() { return this; },
      setFillStyle(c, a) { this.fillColor = c; this.fillAlpha = a; return this; },
      setStrokeStyle(w, c, a) { this.stroke = { w, c, a }; return this; },
      setText(t) { this.text = t; return this; },
      destroy() { this.destroyed = true; return this; },
    };
    objects.push(go);
    return go;
  }

  function graphics() {
    const g = base('graphics');
    g.ops = [];
    const methods = [
      'clear', 'beginPath', 'strokePath', 'moveTo', 'lineTo',
      'fillStyle', 'lineStyle', 'fillRect', 'fillRoundedRect',
      'strokeRoundedRect', 'strokeRect', 'fillTriangle', 'fillCircle',
      'strokeCircle', 'lineBetween',
    ];
    methods.forEach((name) => {
      g[name] = (...args) => { g.ops.push([name, ...args]); return g; };
    });
    return g;
  }

  return {
    objects,
    tweenList,
    add: {
      graphics,
      rectangle(x, y, w, h, c, a) {
        const o = base('rect');
        Object.assign(o, { x, y, w, h, fillColor: c, fillAlpha: a, alpha: a ?? 1 });
        return o;
      },
      circle(x, y, r, c, a) {
        const o = base('circle');
        Object.assign(o, { x, y, r, fillColor: c, fillAlpha: a ?? 1, alpha: a ?? 1 });
        return o;
      },
      ellipse(x, y, w, h, c, a) {
        const o = base('ellipse');
        Object.assign(o, { x, y, w, h, fillColor: c, fillAlpha: a, alpha: a ?? 1 });
        return o;
      },
      text(x, y, t, style) {
        const o = base('text');
        Object.assign(o, { x, y, text: t, style });
        return o;
      },
    },
    tweens: {
      add(cfg) {
        const tween = {
          cfg,
          removed: false,
          remove() { this.removed = true; },
          stop() { this.removed = true; },
        };
        tweenList.push(tween);
        const targets = Array.isArray(cfg.targets) ? cfg.targets : [cfg.targets];
        for (const target of targets) {
          for (const key of ['x', 'y', 'alpha', 'angle', 'scale', 'scaleX', 'scaleY']) {
            const v = cfg[key];
            if (v === undefined) continue;
            const final = v && typeof v === 'object' ? v.to : v;
            if (typeof final === 'number') target[key] = final;
          }
        }
        if (cfg.repeat !== -1 && typeof cfg.onComplete === 'function') cfg.onComplete();
        return tween;
      },
      killTweensOf(targets) {
        const list = Array.isArray(targets) ? targets : [targets];
        let killed = 0;
        for (const tween of tweenList) {
          if (tween.removed) continue;
          const tt = Array.isArray(tween.cfg.targets) ? tween.cfg.targets : [tween.cfg.targets];
          if (tt.some((t) => list.includes(t))) {
            tween.removed = true;
            killed += 1;
          }
        }
        return killed;
      },
    },
  };
}
