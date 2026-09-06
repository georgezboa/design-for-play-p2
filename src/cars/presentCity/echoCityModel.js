// Chapter 3 // ECHO CITY — pure chapter model.
//
// SUPERSEDED 2026-08-05: the chapter now runs the fixed-camera isometric
// rebuild (echoCityIsoModel.js + EchoCityIsoScene.js, see
// docs/CHAPTER_03_KIMI_ISOMETRIC_ECHO_CITY_WORK_PACKAGE.md). This lane-based
// version is kept for reference and its regression tests; it is no longer
// wired into car03.html.
//
// Authoritative spec: docs/CHAPTER_03_QWEN_ECHO_CITY_EXECUTION_WORK_PACKAGE.md
// Higher authority:   docs/COURSE_BUILD_TEAM_EXECUTION_PLAN.md
//                     docs/GAME_MASTER_V2_SIX_CHAPTERS.md
//
// This is the newest product direction for Chapter 3. The MOVE AS ONE V2
// model in socialStealthModel.js is preserved untouched as reusable
// engineering evidence; this model neither wraps nor extends it.
//
// Player-facing goal: find Mara in the contemporary city and restore a
// witness link by teaching the silent square a behavior the official
// archive erased:
//   Observe a behavior cycle -> COPY it through RESONANCE -> TRANSPLANT it
//   so a person or part of the city repeats that relationship.
//
// This is NOT a rhythm game. There are no note lanes, beat timings, combo
// scores, or music-gated inputs. Cycles are semantic step data; sound and
// animation make them easier to perceive but never decide input acceptance.
//
// Pure logic contract (same discipline as the V2 model):
//   - no Phaser, no DOM, no performance.now()/Date.now(), no Math.random;
//   - all time flows through `update(dtMs, input)` — deterministic;
//   - `snapshot()` returns a deep, JSON-safe clone;
//   - events are FIFO via `drainEvents()`; `reset()` restores baseline (R).
//
// E keeps one conceptual meaning per focus state; the focused target always
// carries the exact prompt describing what E will do.

import { LANE_FAR, LANE_NEAR } from '../../constants.js';

// ---------------------------------------------------------------------------
// World geometry — three authored outdoor spaces in one continuous street.
// ---------------------------------------------------------------------------

export const SPACES = Object.freeze({
  MARKET: Object.freeze({ id: 'MARKET', name: 'LIVING MARKET', x0: 0, x1: 1280, checkpointX: 90 }),
  TRANSIT: Object.freeze({ id: 'TRANSIT', name: 'TRANSIT SQUARE', x0: 1280, x1: 2640, checkpointX: 1360 }),
  SQUARE: Object.freeze({ id: 'SQUARE', name: 'SILENT CENTRAL SQUARE', x0: 2640, x1: 3600, checkpointX: 2700 }),
});

// Cycle step kinds: move | wait | turn | open | interact.
export const ECHO_CYCLES = Object.freeze({
  // The courier's visible loop: walk to the transit sign, pause, return.
  // Pictogram language is MOVE -> WAIT -> RETURN (three large world-space
  // icons while carried).
  'courier-loop': Object.freeze({
    id: 'courier-loop',
    sourceId: 'courier',
    label: 'MOVE - WAIT - RETURN',
    tags: Object.freeze(['pattern']),
    icons: Object.freeze(['MOVE', 'WAIT', 'RETURN']),
    loopMs: 3900,
    steps: Object.freeze([
      Object.freeze({ kind: 'move', label: 'MOVE', dir: 1, durMs: 1500 }),
      Object.freeze({ kind: 'wait', label: 'WAIT', durMs: 600 }),
      Object.freeze({ kind: 'move', label: 'RETURN', dir: -1, durMs: 1500 }),
      Object.freeze({ kind: 'wait', label: 'SETTLE', durMs: 300 }),
    ]),
  }),
  // The bus supplies a door/open phase: STOP -> OPEN -> GO. Timed so the
  // Transit Square safe window is comfortably longer than the field crossing.
  'bus-service': Object.freeze({
    id: 'bus-service',
    sourceId: 'bus',
    label: 'STOP - OPEN - GO',
    tags: Object.freeze(['open']),
    icons: Object.freeze(['STOP', 'OPEN', 'GO']),
    loopMs: 4000,
    steps: Object.freeze([
      Object.freeze({ kind: 'wait', label: 'STOP', durMs: 500 }),
      Object.freeze({ kind: 'open', label: 'OPEN', durMs: 2800 }),
      Object.freeze({ kind: 'move', label: 'GO', dir: 1, durMs: 700 }),
    ]),
  }),
  // The crosswalk supplies a movement phase: WAIT -> WALK.
  'crosswalk-signal': Object.freeze({
    id: 'crosswalk-signal',
    sourceId: 'crosswalk',
    label: 'WAIT - WALK',
    tags: Object.freeze(['walk']),
    icons: Object.freeze(['WAIT', 'WALK']),
    loopMs: 2000,
    steps: Object.freeze([
      Object.freeze({ kind: 'wait', label: 'WAIT', durMs: 300 }),
      Object.freeze({ kind: 'move', label: 'WALK', dir: 1, durMs: 1700 }),
    ]),
  }),
});

// Deterministic step lookup shared by the model, the tests, and (through
// the snapshot) the scene — animation never runs a second decorative timer.
export function cycleStepAt(cycle, tMs) {
  const loopMs = Math.max(1, cycle.loopMs);
  const phaseMs = ((tMs % loopMs) + loopMs) % loopMs;
  let acc = 0;
  for (let i = 0; i < cycle.steps.length; i++) {
    const step = cycle.steps[i];
    if (phaseMs < acc + step.durMs) {
      return {
        index: i,
        step,
        phaseMs,
        msInto: phaseMs - acc,
        progress: (phaseMs - acc) / step.durMs,
      };
    }
    acc += step.durMs;
  }
  const last = cycle.steps.length - 1;
  return { index: last, step: cycle.steps[last], phaseMs, msInto: 0, progress: 0 };
}

// ---------------------------------------------------------------------------
// Tuning.
// ---------------------------------------------------------------------------

export const ECHO_CITY_DEFAULTS = Object.freeze({
  playerStartX: 90,
  playerMinX: 60,
  playerWalkVx: 200,
  laneChangeMs: 250,
  focusRadius: 130, // nearest eligible target within this distance

  // Space A — LIVING MARKET.
  courierHomeX: 340,
  courierSignX: 700, // courier walks 340 -> 700 -> 340 (matches cycle steps)
  marketGroupX: 880,
  inspectionStripX: 1000,
  marketGateX: 1060,
  marketBlockX: 1000, // closed gate keeps the player at or left of this x
  gateOpenDelayMs: 1400, // strip recognizes the transplanted pattern, then opens
  loneWalkerStartX: 620,
  loneWalkerVx: 140,

  // Space B — TRANSIT SQUARE.
  busX: 1500,
  crosswalkX: 1700,
  crowdBaseX: 1960,
  barrierX: 2200,
  // Field is wider than flagMs*walkVx so an unprotected player cannot dash
  // across before being flagged, yet any unsafe gap (<=1200ms) is shorter
  // than flagMs so a protected player always survives to the next window.
  fieldX0: 2300,
  fieldX1: 2620,
  fieldWarnMs: 700,
  fieldFlagMs: 1400,
  fieldFreezeMs: 350,
  fieldCoverRadius: 95, // art-only since the crowd masks the whole field
  crowdPatrolPad: 40, // crowd sweeps [fieldX0+pad, fieldX1-pad] visually

  // Space C — SILENT CENTRAL SQUARE.
  recordMarkX: 2820,
  recordMarkRadius: 44,
  recordWindowMs: 4000, // forgiving recording window
  recordMinMove: 60, // net displacement below this yields no movement step
  recordMaxMove: 320,
  bellX: 3060,
  bellRadius: 48,
  witnessGateX: 3300,
  playerSquareMaxX: 3220, // the closed witness gate is a physical wall
  maraStartX: 3420,
  maraApproachMax: 220, // Mara performs the recorded movement toward the gate
  maraCrossToX: 3100,
  maraCrossVx: 150,
  shareInteractHoldMs: 800, // the square performs the interaction component
  shareGateOpenMs: 700,
  reunionHoldMs: 600,

  // Space transitions.
  marketExitX: 1240, // where the redeemed lone walker exits the market
});

// ---------------------------------------------------------------------------
// Small pure helpers.
// ---------------------------------------------------------------------------

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function round(n) {
  if (typeof n !== 'number' || !isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function clone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const key of Object.keys(value)) out[key] = clone(value[key]);
  return out;
}

function spaceForX(x) {
  if (x < SPACES.TRANSIT.x0) return SPACES.MARKET;
  if (x < SPACES.SQUARE.x0) return SPACES.TRANSIT;
  return SPACES.SQUARE;
}

// ---------------------------------------------------------------------------
// The model.
// ---------------------------------------------------------------------------

export function createEchoCityModel(config = {}) {
  const cfg = { ...ECHO_CITY_DEFAULTS, ...config };

  // Mutable state — everything rebuilt by initState() so reset() is exact.
  let elapsedMs = 0;
  let destroyed = false;
  let events = [];
  let lastEvent = null;

  let spaceId = 'MARKET';
  let checkpointX = SPACES.MARKET.checkpointX;
  let complete = false;
  let reunion = false;
  let demoSeen = false; // courier finished one full visible loop

  let player = null;
  let resonance = null; // { mode, sourceId, receiverId, carriedCycleId, observeMs, record, previewMs, previewTotalMs, recordedSteps }
  let receivers = null;
  let mara = null;
  let env = null; // market gate, witness gate, field, square resonance
  let loneWalker = null;
  let echo = null; // authored Butch echo previewing the recorded cycle
  let share = null; // final share/reunion sequence state

  function pushEvent(type, payload) {
    const ev = { type, t: round(elapsedMs), payload: clone(payload ?? {}) };
    events.push(ev);
    lastEvent = ev;
  }

  function initState() {
    elapsedMs = 0;
    spaceId = 'MARKET';
    checkpointX = SPACES.MARKET.checkpointX;
    complete = false;
    reunion = false;
    demoSeen = false;
    events = [];
    lastEvent = null;
    player = {
      x: cfg.playerStartX,
      lane: LANE_NEAR,
      vx: 0,
      facing: 1,
      laneTransition: null, // { from, to, msLeft, msTotal }
      frozenMsLeft: 0,
      locked: false, // share sequence locks the player without punishment
    };
    resonance = {
      mode: 'idle', // idle | observing | carrying | linking | recording | previewing
      sourceId: null,
      receiverId: null,
      carriedCycleId: null,
      observeMs: 0,
      linkingMsLeft: 0,
      record: null, // { msLeft, startX, dx, moveMs, bell }
      recordedSteps: null,
      previewStartX: null,
      previewMs: 0,
      previewTotalMs: 0,
    };
    receivers = [
      {
        id: 'market-group', space: 'MARKET', x: cfg.marketGroupX, lane: LANE_NEAR,
        acceptedTags: ['pattern'], installedCycleId: null, resultState: 'idle',
        installedAtMs: 0, compatible: false,
        // Once the inspection strip recognizes the pattern the gate stays
        // open; releasing here would close a gate the player may have
        // already crossed, so this receiver is not reversible in play.
        releasable: false,
      },
      {
        id: 'barrier', space: 'TRANSIT', x: cfg.barrierX, lane: LANE_NEAR,
        acceptedTags: ['open'], installedCycleId: null, resultState: 'idle',
        installedAtMs: 0, compatible: false, releasable: true,
      },
      {
        id: 'crowd', space: 'TRANSIT', x: cfg.crowdBaseX, lane: LANE_NEAR,
        acceptedTags: ['walk'], installedCycleId: null, resultState: 'idle',
        installedAtMs: 0, compatible: false, releasable: true,
      },
    ];
    mara = {
      x: cfg.maraStartX, lane: LANE_NEAR, visible: false, facing: -1,
      state: 'waiting', // waiting | performing | crossing | reunited
    };
    env = {
      marketGate: 'closed', // closed | opening | open
      gateOpenedAtMs: -1,
      stripRecognizes: false,
      witnessGate: 'closed', // closed | opening | open
      fieldWarnMs: 0,
      fieldState: 'idle', // idle | warning | flagged
      squareResonance: 'idle', // idle | resonating | resonated
      ambientStopped: false,
    };
    loneWalker = {
      x: cfg.loneWalkerStartX, state: 'walking', facing: 1, waitMs: 0,
    };
    echo = { visible: false, x: cfg.recordMarkX, facing: 1, interactK: 0 };
    share = { stage: null, ms: 0, performDur: 0, maraStartX: cfg.maraStartX, moveDist: 0 };
  }

  initState();

  // -- lookups --------------------------------------------------------------

  function receiverById(id) {
    return receivers.find((r) => r.id === id) ?? null;
  }

  function carriedCycle() {
    if (!resonance.carriedCycleId) return null;
    if (resonance.carriedCycleId === 'recorded-cycle') {
      return buildRecordedCycle();
    }
    return ECHO_CYCLES[resonance.carriedCycleId] ?? null;
  }

  function buildRecordedCycle() {
    const steps = resonance.recordedSteps ?? [];
    return {
      id: 'recorded-cycle',
      sourceId: 'butch',
      label: steps.map((s) => (s.kind === 'interact' ? 'RESONATE' : 'MOVE')).join(' - ') || 'EMPTY',
      tags: ['witness'],
      icons: steps.map((s) => (s.kind === 'interact' ? 'RESONATE' : 'MOVE')),
      loopMs: steps.reduce((a, s) => a + s.durMs, 0),
      steps,
    };
  }

  // -- sources --------------------------------------------------------------
  // Source motion/phase is a pure function of the shared model clock, so the
  // scene animates exactly the state gameplay checks against.

  function courierState() {
    const cycle = ECHO_CYCLES['courier-loop'];
    const at = cycleStepAt(cycle, elapsedMs);
    const span = cfg.courierSignX - cfg.courierHomeX;
    let x = cfg.courierHomeX;
    let facing = 1;
    if (at.step.label === 'MOVE') {
      x = cfg.courierHomeX + at.progress * span;
      facing = 1;
    } else if (at.step.label === 'WAIT') {
      x = cfg.courierSignX;
      facing = -1; // turns at the sign
    } else if (at.step.label === 'RETURN') {
      x = cfg.courierSignX - at.progress * span;
      facing = -1;
    } else {
      x = cfg.courierHomeX;
      facing = 1;
    }
    return { x, facing, stepKind: at.step.kind, stepLabel: at.step.label, phaseMs: at.phaseMs, index: at.index };
  }

  function busState() {
    const at = cycleStepAt(ECHO_CYCLES['bus-service'], elapsedMs);
    return { stepKind: at.step.kind, stepLabel: at.step.label, phaseMs: at.phaseMs, progress: at.progress, index: at.index };
  }

  function crosswalkState() {
    const at = cycleStepAt(ECHO_CYCLES['crosswalk-signal'], elapsedMs);
    return { stepKind: at.step.kind, stepLabel: at.step.label, phaseMs: at.phaseMs, progress: at.progress, index: at.index };
  }

  // -- receivers --------------------------------------------------------------

  function receiverPhase(r) {
    if (!r.installedCycleId) return null;
    const cycle = ECHO_CYCLES[r.installedCycleId];
    if (!cycle) return null;
    // Receivers run on the shared world clock so the two Transit Square
    // relationships align in one readable rhythm.
    return cycleStepAt(cycle, elapsedMs);
  }

  function barrierOpenNow() {
    const r = receiverById('barrier');
    if (!r.installedCycleId || !r.compatible) return false;
    const phase = receiverPhase(r);
    return !!phase && phase.step.kind === 'open';
  }

  function crowdXNow() {
    const r = receiverById('crowd');
    if (!r.installedCycleId || !r.compatible) return cfg.crowdBaseX;
    const phase = receiverPhase(r);
    if (phase && phase.step.kind === 'move') {
      // The crowd sweeps across the field as moving cover (art position).
      const lo = cfg.fieldX0 + cfg.crowdPatrolPad;
      const hi = cfg.fieldX1 - cfg.crowdPatrolPad;
      return lo + phase.progress * (hi - lo);
    }
    return cfg.crowdBaseX;
  }

  function marketGroupXNow() {
    const r = receiverById('market-group');
    if (!r.installedCycleId) return cfg.marketGroupX;
    const phase = receiverPhase(r);
    if (!phase) return cfg.marketGroupX;
    if (!r.compatible) {
      // Confused milling: a deterministic nervous shuffle, never the loop.
      const tri = (phase.phaseMs % 800) / 800;
      const off = (tri < 0.5 ? tri * 2 : 2 - tri * 2) * 26 - 13;
      return cfg.marketGroupX + off;
    }
    // The group performs the courier relationship: MOVE to the transit sign,
    // WAIT, RETURN home — driven by the SAME cycle phase data gameplay uses.
    const at = cycleStepAt(ECHO_CYCLES['courier-loop'], elapsedMs);
    const home = cfg.marketGroupX;
    const sign = cfg.courierSignX;
    if (at.step.label === 'MOVE') return home + (sign - home) * at.progress;
    if (at.step.label === 'WAIT') return sign;
    if (at.step.label === 'RETURN') return sign + (home - sign) * at.progress;
    return home;
  }

  function crowdCoverNow() {
    // While the crowd runs its walk phase it masks the entire surveillance
    // field. Position-independent on purpose: the readable rule is "cross
    // while the crowd moves", not a pixel-perfect formation match.
    const r = receiverById('crowd');
    if (!r.installedCycleId || !r.compatible) return false;
    const phase = receiverPhase(r);
    return !!phase && phase.step.kind === 'move';
  }

  function fieldSafeNow() {
    return barrierOpenNow() && crowdCoverNow();
  }

  // -- focus / targeting ------------------------------------------------------
  // Exactly one highlighted target at a time; its prompt states exactly what
  // E will do.

  function computeFocus() {
    const none = { kind: null, id: null, eligible: false, action: null, prompt: null };
    if (complete || player.frozenMsLeft > 0 || player.locked) return none;

    if (resonance.mode === 'observing') {
      return {
        kind: 'source', id: resonance.sourceId, eligible: true,
        action: 'hold-to-copy', prompt: '[HOLD E] COPY CYCLE',
      };
    }
    if (resonance.mode === 'recording') {
      return {
        kind: 'recording', id: null, eligible: true,
        action: 'stop-recording', prompt: '[E] STOP RECORDING',
      };
    }
    if (resonance.mode === 'previewing' || resonance.mode === 'linking') return none;

    const candidates = [];
    const add = (kind, id, dist, action, prompt) => {
      if (dist <= cfg.focusRadius) candidates.push({ kind, id, dist, action, prompt });
    };

    // Installed receivers are releasable — visible, local reversal.
    for (const r of receivers) {
      if (r.space !== spaceId) continue;
      if (!r.installedCycleId || !r.releasable) continue;
      if (r.lane !== player.lane) continue;
      add('receiver', r.id, Math.abs(r.x - player.x), 'release-cycle', '[E] RELEASE CYCLE');
    }

    if (resonance.mode === 'idle') {
      if (spaceId === 'MARKET') {
        add('source', 'courier', Math.abs(courierState().x - player.x), 'copy-cycle', '[HOLD E] COPY CYCLE');
      } else if (spaceId === 'TRANSIT') {
        if (player.lane === LANE_FAR) {
          add('source', 'bus', Math.abs(cfg.busX - player.x), 'copy-cycle', '[HOLD E] COPY CYCLE');
        } else {
          add('source', 'crosswalk', Math.abs(cfg.crosswalkX - player.x), 'copy-cycle', '[HOLD E] COPY CYCLE');
        }
      } else if (spaceId === 'SQUARE') {
        // Standing ON the amber record mark (its own tighter radius).
        const recDist = Math.abs(cfg.recordMarkX - player.x);
        if (recDist <= cfg.recordMarkRadius) {
          candidates.push({
            kind: 'record', id: 'record-mark', dist: recDist,
            action: 'record-cycle', prompt: '[E] RECORD YOUR CYCLE',
          });
        }
      }
    } else if (resonance.mode === 'carrying') {
      for (const r of receivers) {
        if (r.space !== spaceId) continue;
        if (r.installedCycleId) continue;
        if (r.lane !== player.lane) continue;
        add('receiver', r.id, Math.abs(r.x - player.x), 'transplant-cycle', '[E] TRANSPLANT CYCLE');
      }
      if (
        spaceId === 'SQUARE'
        && resonance.carriedCycleId === 'recorded-cycle'
        && !reunion
      ) {
        add('mara', 'mara', Math.abs(cfg.witnessGateX - player.x), 'share-cycle', '[E] SHARE CYCLE');
      }
    }

    if (candidates.length === 0) return none;
    candidates.sort((a, b) => a.dist - b.dist || (a.id < b.id ? -1 : 1));
    const best = candidates[0];
    return { kind: best.kind, id: best.id, eligible: true, action: best.action, prompt: best.prompt };
  }

  // -- demo actors -------------------------------------------------------------

  function tickLoneWalker(dt) {
    if (env.marketGate === 'open') {
      if (loneWalker.state === 'gone') return;
      loneWalker.state = 'crossing';
      loneWalker.facing = 1;
      loneWalker.x += cfg.loneWalkerVx * (dt / 1000);
      if (loneWalker.x >= cfg.marketExitX) loneWalker.state = 'gone';
      return;
    }
    const dtSec = dt / 1000;
    if (loneWalker.state === 'walking') {
      loneWalker.facing = 1;
      loneWalker.x += cfg.loneWalkerVx * dtSec;
      if (loneWalker.x >= cfg.inspectionStripX - 20) {
        // No recognized cycle: the strip redirects locally. No damage.
        loneWalker.state = 'redirected';
        loneWalker.waitMs = 500;
        pushEvent('walker-redirected', { x: round(loneWalker.x) });
      }
    } else if (loneWalker.state === 'redirected') {
      loneWalker.facing = -1;
      loneWalker.x -= cfg.loneWalkerVx * dtSec;
      if (loneWalker.x <= 700) {
        loneWalker.state = 'waiting';
        loneWalker.waitMs = 900;
      }
    } else if (loneWalker.state === 'waiting') {
      loneWalker.waitMs = Math.max(0, loneWalker.waitMs - dt);
      if (loneWalker.waitMs === 0) loneWalker.state = 'walking';
    }
  }

  // -- lane transitions ---------------------------------------------------------

  function tickLaneTransition(dt) {
    const lt = player.laneTransition;
    if (!lt) return;
    lt.msLeft -= dt;
    if (lt.msLeft <= 0) {
      player.lane = lt.to;
      player.laneTransition = null;
    }
  }

  function startLaneChange(input) {
    if (player.laneTransition) return;
    const wantFar = !!input.laneFar;
    const wantNear = !!input.laneNear;
    if (wantFar === wantNear) return;
    const to = wantFar ? LANE_FAR : LANE_NEAR;
    if (to === player.lane) return;
    player.laneTransition = {
      from: player.lane, to, msLeft: cfg.laneChangeMs, msTotal: cfg.laneChangeMs,
    };
  }

  // -- player movement -----------------------------------------------------------

  function movePlayer(dt, input) {
    const dtSec = dt / 1000;
    const left = !!input.left;
    const right = !!input.right;

    // Rooted while observing a source; locked during the share sequence.
    if (resonance.mode === 'observing' || resonance.mode === 'previewing' || player.locked) {
      player.vx = 0;
      return;
    }

    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir === 0) {
      player.vx = 0;
      return;
    }
    player.facing = dir;
    let nx = player.x + dir * cfg.playerWalkVx * dtSec;

    // Physical gates.
    if (spaceId === 'MARKET' && env.marketGate !== 'open') {
      nx = Math.min(nx, cfg.marketBlockX);
    }
    if (spaceId === 'SQUARE') {
      nx = Math.min(nx, cfg.playerSquareMaxX);
    }
    if (resonance.mode === 'recording') {
      // The authored recording path stays inside the silent square.
      nx = clamp(nx, SPACES.SQUARE.x0 + 20, cfg.playerSquareMaxX);
    }
    nx = clamp(nx, cfg.playerMinX, SPACES.SQUARE.x1);

    const actual = nx - player.x;
    player.x = nx;
    player.vx = dtSec > 0 ? actual / dtSec : 0;

    // Recording samples ordinary movement semantically.
    if (resonance.mode === 'recording' && resonance.record) {
      resonance.record.dx += actual;
      if (actual !== 0) resonance.record.moveMs += dt;
      if (!resonance.record.bell && Math.abs(player.x - cfg.bellX) <= cfg.bellRadius) {
        resonance.record.bell = true;
        pushEvent('recording-interact', { target: 'resonance-bell', x: round(player.x) });
      }
    }
  }

  // -- resonance: observe / copy ---------------------------------------------------

  function startObserving(focus) {
    resonance.mode = 'observing';
    resonance.sourceId = focus.id;
    resonance.observeMs = 0;
    pushEvent('observation-started', { sourceId: focus.id });
  }

  function abortObserving() {
    const cycle = ECHO_CYCLES[sourceCycleId(resonance.sourceId)];
    const progress = cycle ? clamp(resonance.observeMs / cycle.loopMs, 0, 1) : 0;
    pushEvent('observation-aborted', { sourceId: resonance.sourceId, progress: round(progress) });
    resonance.mode = 'idle';
    resonance.sourceId = null;
    resonance.observeMs = 0;
  }

  function sourceCycleId(sourceId) {
    if (sourceId === 'courier') return 'courier-loop';
    if (sourceId === 'bus') return 'bus-service';
    if (sourceId === 'crosswalk') return 'crosswalk-signal';
    return null;
  }

  function tickObserving(dt, input) {
    if (!input.eHeld) {
      abortObserving();
      return;
    }
    const cycleId = sourceCycleId(resonance.sourceId);
    const cycle = ECHO_CYCLES[cycleId];
    if (!cycle) {
      resonance.mode = 'idle';
      return;
    }
    resonance.observeMs += dt;
    if (resonance.observeMs >= cycle.loopMs) {
      // One complete observed loop -> the cycle is carried.
      resonance.mode = 'carrying';
      resonance.carriedCycleId = cycleId;
      resonance.observeMs = 0;
      const src = resonance.sourceId;
      resonance.sourceId = null;
      pushEvent('cycle-copied', { cycleId, sourceId: src, label: cycle.label });
    }
  }

  // -- resonance: transplant / release ----------------------------------------------

  function transplantTo(receiverId) {
    const r = receiverById(receiverId);
    const cycle = carriedCycle();
    if (!r || !cycle || r.installedCycleId) return;
    const compatible = cycle.tags.some((t) => r.acceptedTags.includes(t));
    r.installedCycleId = cycle.id;
    r.installedAtMs = elapsedMs;
    r.compatible = compatible;
    if (r.id === 'market-group') {
      r.resultState = compatible ? 'performing-loop' : 'confused-milling';
    } else if (r.id === 'barrier') {
      r.resultState = compatible ? 'cycling-open' : 'stalled-stop';
    } else if (r.id === 'crowd') {
      r.resultState = compatible ? 'moving-cover' : 'stalled-huddle';
    }
    resonance.carriedCycleId = null;
    // One carried cycle at a time: the transplant consumes it. The brief
    // 'linking' mode is the visible amber hand-off before focus returns.
    resonance.mode = 'linking';
    resonance.receiverId = receiverId;
    resonance.linkingMsLeft = 300;
    pushEvent('transplant-applied', { receiverId, cycleId: cycle.id, compatible });
    if (!compatible) {
      // A wrong-but-eligible transplant is deterministic, visible, and
      // reversible — never a silent no-op.
      pushEvent('transplant-wrong', { receiverId, cycleId: cycle.id, result: r.resultState });
    }
    if (r.id === 'market-group' && compatible) {
      env.marketGate = 'opening';
      env.gateOpenedAtMs = elapsedMs;
    }
  }

  function releaseReceiver(receiverId) {
    const r = receiverById(receiverId);
    if (!r || !r.installedCycleId || !r.releasable) return;
    const cycleId = r.installedCycleId;
    r.installedCycleId = null;
    r.installedAtMs = 0;
    r.compatible = false;
    r.resultState = 'idle';
    pushEvent('cycle-released', { receiverId, cycleId });
  }

  function tickMarketGate() {
    if (env.marketGate === 'opening' && elapsedMs - env.gateOpenedAtMs >= cfg.gateOpenDelayMs) {
      env.marketGate = 'open';
      env.stripRecognizes = true;
      pushEvent('gate-opened', { gateId: 'market' });
    }
  }

  // -- recording (Space C) ------------------------------------------------------------

  function startRecording() {
    resonance.mode = 'recording';
    resonance.record = {
      msLeft: cfg.recordWindowMs,
      startX: player.x,
      dx: 0,
      moveMs: 0,
      bell: false,
    };
    pushEvent('recording-started', { windowMs: cfg.recordWindowMs });
  }

  function endRecording() {
    const rec = resonance.record;
    resonance.record = null;
    if (!rec) {
      resonance.mode = 'idle';
      return;
    }
    const steps = [];
    const dist = Math.abs(rec.dx);
    if (dist >= cfg.recordMinMove) {
      steps.push({
        kind: 'move',
        label: 'MOVE',
        dir: rec.dx > 0 ? 1 : -1,
        dist: round(clamp(dist, cfg.recordMinMove, cfg.recordMaxMove)),
        durMs: Math.round(clamp(rec.moveMs, 400, 3000)),
      });
    }
    if (rec.bell) {
      steps.push({
        kind: 'interact',
        label: 'RESONATE',
        target: 'resonance-bell',
        durMs: cfg.shareInteractHoldMs,
      });
    }
    if (steps.length === 0 || !steps.some((s) => s.kind === 'move') || !steps.some((s) => s.kind === 'interact')) {
      // Semantic sampling requires one movement leg AND one physical
      // interaction; otherwise the trace drains and the mark stays live.
      resonance.mode = 'idle';
      resonance.recordedSteps = null;
      pushEvent('recording-empty', {
        reason: steps.length === 0 ? 'no-steps' : (!steps.some((s) => s.kind === 'move') ? 'no-movement' : 'no-interaction'),
      });
      return;
    }
    resonance.recordedSteps = steps;
    resonance.previewStartX = rec.startX;
    resonance.mode = 'previewing';
    resonance.previewMs = 0;
    const moveStep = steps.find((s) => s.kind === 'move');
    resonance.previewTotalMs = (moveStep ? moveStep.durMs : 0) + cfg.shareInteractHoldMs + 300;
    echo.visible = true;
    echo.x = rec.startX;
    echo.facing = moveStep ? moveStep.dir : 1;
    echo.interactK = 0;
    pushEvent('recording-ended', { steps: clone(steps) });
    pushEvent('preview-started', {});
  }

  function tickRecording(dt) {
    const rec = resonance.record;
    if (!rec) return;
    rec.msLeft -= dt;
    // Early stop is the E edge in pressInteract; the window closes here.
    if (rec.msLeft <= 0) endRecording();
  }

  function tickPreview(dt) {
    resonance.previewMs += dt;
    const steps = resonance.recordedSteps ?? [];
    const moveStep = steps.find((s) => s.kind === 'move');
    const moveDur = moveStep ? moveStep.durMs : 0;
    const t = resonance.previewMs;
    if (moveStep && t < moveDur) {
      const speed = moveStep.dist / moveDur;
      echo.facing = moveStep.dir;
      // The authored Butch echo replays from the recorded start position.
      echo.x = previewStartX() + moveStep.dir * speed * t;
      echo.interactK = 0;
    } else if (t < moveDur + cfg.shareInteractHoldMs) {
      echo.x = cfg.bellX;
      echo.interactK = clamp((t - moveDur) / cfg.shareInteractHoldMs, 0, 1);
    } else {
      echo.x = cfg.bellX;
      echo.interactK = 1;
    }
    if (t >= resonance.previewTotalMs) {
      resonance.mode = 'carrying';
      resonance.carriedCycleId = 'recorded-cycle';
      echo.visible = false;
      echo.interactK = 0;
      pushEvent('preview-complete', {});
    }
  }

  function previewStartX() {
    // The echo replays the recorded path from where the recording started.
    return resonance.previewStartX ?? cfg.recordMarkX;
  }

  // -- share / reunion (Space C payoff) -------------------------------------------------

  function startShare() {
    const steps = resonance.recordedSteps ?? [];
    const moveStep = steps.find((s) => s.kind === 'move');
    const moveDist = Math.min(moveStep ? moveStep.dist : 0, cfg.maraApproachMax);
    const performDur = (moveStep ? moveStep.durMs : 0) + cfg.shareInteractHoldMs;
    share = {
      stage: 'perform',
      ms: 0,
      performDur,
      maraStartX: mara.x,
      moveDist,
    };
    mara.state = 'performing';
    player.locked = true;
    env.squareResonance = 'resonating';
    // The carried cycle is given away: Mara consumes the movement component,
    // the square consumes the interaction component of the SAME recorded
    // cycle. Nothing goes into a hidden inventory.
    resonance.carriedCycleId = null;
    resonance.mode = 'idle';
    pushEvent('cycle-shared', { moveDist: round(moveDist), performDur });
  }

  function tickShare(dt) {
    if (!share.stage) return;
    share.ms += dt;
    if (share.stage === 'perform') {
      const moveStep = (resonance.recordedSteps ?? []).find((s) => s.kind === 'move');
      const moveDur = moveStep ? moveStep.durMs : 0;
      if (moveDur > 0 && share.ms <= moveDur) {
        mara.x = share.maraStartX - share.moveDist * clamp(share.ms / moveDur, 0, 1);
        mara.facing = -1;
      } else {
        mara.x = share.maraStartX - share.moveDist;
      }
      if (share.ms >= share.performDur) {
        share.stage = 'gate';
        share.ms = 0;
        env.squareResonance = 'resonated';
        pushEvent('square-resonated', {});
      }
    } else if (share.stage === 'gate') {
      env.witnessGate = 'opening';
      if (share.ms >= cfg.shareGateOpenMs) {
        env.witnessGate = 'open';
        share.stage = 'cross';
        share.ms = 0;
        mara.state = 'crossing';
        pushEvent('gate-opened', { gateId: 'witness' });
      }
    } else if (share.stage === 'cross') {
      mara.facing = -1;
      mara.x -= cfg.maraCrossVx * (dt / 1000);
      if (mara.x <= cfg.maraCrossToX) {
        mara.x = cfg.maraCrossToX;
        share.stage = 'reunion';
        share.ms = 0;
        mara.state = 'reunited';
        reunion = true;
        pushEvent('reunion', {});
        pushEvent('subtitle', { text: 'You always walked half a step ahead.' });
      }
    } else if (share.stage === 'reunion') {
      if (share.ms >= cfg.reunionHoldMs) {
        share.stage = 'done';
        complete = true;
        player.locked = false;
        pushEvent('complete', { reunion: true });
      }
    }
  }

  // -- surveillance field (Space B) -------------------------------------------------------

  function tickField(dt) {
    if (spaceId !== 'TRANSIT') {
      env.fieldWarnMs = 0;
      env.fieldState = 'idle';
      return;
    }
    const inside = player.x >= cfg.fieldX0 && player.x <= cfg.fieldX1;
    if (!inside) {
      env.fieldWarnMs = 0;
      env.fieldState = 'idle';
      return;
    }
    if (fieldSafeNow()) {
      env.fieldWarnMs = 0;
      env.fieldState = 'idle';
      return;
    }
    env.fieldWarnMs += dt;
    if (env.fieldWarnMs >= cfg.fieldFlagMs) {
      env.fieldState = 'flagged';
      player.frozenMsLeft = cfg.fieldFreezeMs;
      player.vx = 0;
      pushEvent('flagged', { checkpointX, x: round(player.x) });
      return;
    }
    if (env.fieldWarnMs >= cfg.fieldWarnMs) {
      if (env.fieldState !== 'warning') pushEvent('field-warning', {});
      env.fieldState = 'warning';
    }
  }

  function resolveFlag() {
    player.x = checkpointX;
    player.vx = 0;
    env.fieldWarnMs = 0;
    env.fieldState = 'idle';
    pushEvent('checkpoint-return', { checkpointX });
  }

  // -- space transitions --------------------------------------------------------------------

  function tickSpaces() {
    const next = spaceForX(player.x);
    if (next.id !== spaceId) {
      spaceId = next.id;
      checkpointX = next.checkpointX;
      env.ambientStopped = spaceId === 'SQUARE';
      mara.visible = spaceId === 'SQUARE';
      pushEvent('space-entered', { space: spaceId, checkpointX });
    }
  }

  // -- objective ------------------------------------------------------------------------------

  function objectiveId() {
    if (spaceId === 'MARKET') {
      if (env.marketGate === 'open') return 'CROSS_THE_OPEN_GATE';
      if (resonance.mode === 'carrying') return 'TRANSPLANT_TO_THE_MARKET_GROUP';
      return 'OBSERVE_AND_COPY_A_CYCLE';
    }
    if (spaceId === 'TRANSIT') {
      const both = receiverById('barrier').installedCycleId && receiverById('crowd').installedCycleId;
      return both ? 'CROSS_WHEN_BOTH_CYCLES_RUN' : 'COPY_AND_PLANT_BOTH_CYCLES';
    }
    if (complete) return 'REUNION';
    if (resonance.mode === 'carrying' && resonance.carriedCycleId === 'recorded-cycle') return 'SHARE_YOUR_CYCLE_WITH_MARA';
    if (resonance.mode === 'previewing') return 'THE_ECHO_SHOWS_YOUR_CYCLE';
    return 'RECORD_YOUR_OWN_CYCLE';
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function update(dtMs, input = {}) {
    if (destroyed) return;
    if (typeof dtMs !== 'number' || !(dtMs > 0)) return;
    const dt = Math.min(dtMs, 100);
    elapsedMs += dt;
    if (complete) return;

    if (!demoSeen && elapsedMs >= ECHO_CYCLES['courier-loop'].loopMs) {
      demoSeen = true;
      pushEvent('demo-seen', {});
    }

    if (player.frozenMsLeft > 0) {
      player.frozenMsLeft = Math.max(0, player.frozenMsLeft - dt);
      if (player.frozenMsLeft === 0) resolveFlag();
      return;
    }

    if (share.stage && share.stage !== 'done') {
      tickShare(dt);
      tickSpaces();
      return;
    }

    tickLaneTransition(dt);
    // Lane changes only while free (idle/carrying). Observing, recording,
    // previewing and linking each hold the player on their authored plane.
    if (resonance.mode === 'idle' || resonance.mode === 'carrying') {
      startLaneChange(input);
    }

    if (resonance.mode === 'observing') {
      tickObserving(dt, input);
    } else if (resonance.mode === 'recording') {
      movePlayer(dt, input);
      tickRecording(dt);
    } else if (resonance.mode === 'previewing') {
      tickPreview(dt);
    } else if (resonance.mode === 'linking') {
      resonance.linkingMsLeft -= dt;
      if (resonance.linkingMsLeft <= 0) {
        resonance.mode = 'idle';
        resonance.receiverId = null;
      }
    } else {
      movePlayer(dt, input);
    }

    tickLoneWalker(dt);
    tickMarketGate();
    tickField(dt);
    tickSpaces();
  }

  // E edge — the single interact entry point. What it does is exactly what
  // the current focus prompt says.
  function pressInteract() {
    if (destroyed || complete) return;
    if (player.frozenMsLeft > 0 || player.locked) return;

    if (resonance.mode === 'recording') {
      endRecording();
      return;
    }
    if (resonance.mode === 'observing' || resonance.mode === 'previewing' || resonance.mode === 'linking') {
      return;
    }

    const focus = computeFocus();
    if (!focus.eligible) {
      pushEvent('interact-noop', {});
      return;
    }
    switch (focus.action) {
      case 'copy-cycle':
        startObserving(focus);
        break;
      case 'transplant-cycle':
        transplantTo(focus.id);
        break;
      case 'release-cycle':
        releaseReceiver(focus.id);
        break;
      case 'record-cycle':
        startRecording();
        break;
      case 'share-cycle':
        startShare();
        break;
      default:
        pushEvent('interact-noop', {});
        break;
    }
  }

  // Snapshot — the single surface the scene renders from (work package §5).
  function snapshot() {
    const focus = computeFocus();
    const courier = courierState();
    const bus = busState();
    const cross = crosswalkState();
    const carried = carriedCycle();
    const lt = player.laneTransition;
    return clone({
      chapter: 'ECHO CITY',
      space: spaceId,
      spaceName: SPACES[spaceId].name,
      objectiveId: objectiveId(),
      checkpointX,
      complete,
      reunion,
      demoSeen,
      elapsedMs: round(elapsedMs),
      player: {
        x: round(player.x),
        lane: player.lane,
        laneTransition: lt
          ? { from: lt.from, to: lt.to, msLeft: round(Math.max(0, lt.msLeft)), msTotal: lt.msTotal }
          : null,
        vx: round(player.vx),
        facing: player.facing,
        frozenMsLeft: round(player.frozenMsLeft),
        locked: player.locked,
      },
      focus,
      resonance: {
        mode: resonance.mode,
        sourceId: resonance.sourceId,
        receiverId: resonance.receiverId,
        carriedCycleId: resonance.carriedCycleId,
        observeMs: round(resonance.observeMs),
        observeNeedMs: resonance.mode === 'observing' && sourceCycleId(resonance.sourceId)
          ? ECHO_CYCLES[sourceCycleId(resonance.sourceId)].loopMs
          : 0,
        recordMsLeft: resonance.record ? round(Math.max(0, resonance.record.msLeft)) : 0,
        previewMs: round(resonance.previewMs),
        previewTotalMs: resonance.previewTotalMs,
      },
      carriedCycle: carried
        ? { id: carried.id, sourceId: carried.sourceId, label: carried.label, icons: [...carried.icons], loopMs: carried.loopMs, steps: carried.steps }
        : null,
      sources: [
        {
          id: 'courier', x: round(courier.x), lane: LANE_NEAR, cycleId: 'courier-loop',
          stepKind: courier.stepKind, stepLabel: courier.stepLabel, phaseMs: round(courier.phaseMs), facing: courier.facing,
        },
        {
          id: 'bus', x: cfg.busX, lane: LANE_FAR, cycleId: 'bus-service',
          stepKind: bus.stepKind, stepLabel: bus.stepLabel, phaseMs: round(bus.phaseMs), progress: round(bus.progress),
        },
        {
          id: 'crosswalk', x: cfg.crosswalkX, lane: LANE_NEAR, cycleId: 'crosswalk-signal',
          stepKind: cross.stepKind, stepLabel: cross.stepLabel, phaseMs: round(cross.phaseMs), progress: round(cross.progress),
        },
      ],
      receivers: receivers.map((r) => {
        const phase = receiverPhase(r);
        const x = r.id === 'crowd' ? crowdXNow() : (r.id === 'market-group' ? marketGroupXNow() : r.x);
        return {
          id: r.id,
          space: r.space,
          x: round(x),
          lane: r.lane,
          acceptedTags: [...r.acceptedTags],
          installedCycleId: r.installedCycleId,
          resultState: r.resultState,
          compatible: r.compatible,
          stepKind: phase ? phase.step.kind : null,
          stepLabel: phase ? phase.step.label : null,
          phaseMs: phase ? round(phase.phaseMs) : null,
        };
      }),
      loneWalker: {
        x: round(loneWalker.x), state: loneWalker.state, facing: loneWalker.facing,
      },
      echo: { visible: echo.visible, x: round(echo.x), facing: echo.facing, interactK: round(echo.interactK) },
      environment: {
        marketGate: env.marketGate,
        stripRecognizes: env.stripRecognizes,
        inspectionStripX: cfg.inspectionStripX,
        marketGateX: cfg.marketGateX,
        witnessGate: env.witnessGate,
        witnessGateX: cfg.witnessGateX,
        fieldX0: cfg.fieldX0,
        fieldX1: cfg.fieldX1,
        fieldSafe: fieldSafeNow(),
        fieldWarnMs: round(env.fieldWarnMs),
        fieldState: env.fieldState,
        squareResonance: env.squareResonance,
        ambientStopped: env.ambientStopped,
      },
      mara: {
        x: round(mara.x), lane: mara.lane, visible: mara.visible, facing: mara.facing, state: mara.state,
      },
      lastEvent: lastEvent ? { type: lastEvent.type, t: lastEvent.t } : null,
    });
  }

  function drainEvents() {
    const out = events;
    events = [];
    return clone(out);
  }

  // R key: full reset to the entry baseline. Deterministic — ten resets
  // produce ten identical snapshots.
  function reset() {
    initState();
    pushEvent('reset', {});
  }

  function destroy() {
    destroyed = true;
    events = [];
  }

  return {
    update,
    pressInteract,
    snapshot,
    drainEvents,
    reset,
    destroy,
  };
}

export default createEchoCityModel;
