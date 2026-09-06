// Car 03 V2 // MOVE AS ONE — readable rebuild (pure model).
//
// Authoritative spec: docs/CAR_03_DESIGN_LOCK_V2_READABLE_PLAY.md
// Work package:      docs/CAR_03_QWEN_V2_READABLE_REBUILD_WORK_PACKAGE.md
//
// This file is the full V2 replacement of the V1 "social stealth" model.
// V1 mechanics (anchoredGroupId, exposureMs, drone cones, cadence lock,
// overlap transfer / rescue / detach priority chain, hidden duo alignment)
// are GONE. See tests/car03/SUPERSEDED-V1.md.
//
// Pure logic contract:
//   - no Phaser, no DOM, no performance.now()/Date.now(), no Math.random;
//   - all time flows through `update(dtMs, input)` — deterministic;
//   - `snapshot()` returns a deep, JSON-safe clone (Design Lock §10 fields);
//   - events are FIFO via `drainEvents()`; `reset()` restores baseline (R key).
//
// E has exactly ONE meaning: toggle matching the highlighted target.
// E never rescues, transfers, detaches, or "establishes a duo" — the
// companion is an ordinary match target; the visible three-step duo test
// is the only two-person mechanic.

import { LANE_FAR, LANE_NEAR } from '../../constants.js';

// ---------------------------------------------------------------------------
// World geometry (Design Lock §3, §5, §6 + work package fixed numbers).
// ---------------------------------------------------------------------------

const BAY_WIDTH = 960;
const BAY_COUNT = 5;
const WORLD_LENGTH = BAY_WIDTH * BAY_COUNT; // 4800

// Fixed ceiling-rail scanner gates. Scan volume = x ± scannerHalfWidth.
const SCANNER_DEFS = Object.freeze([
  Object.freeze({ id: 'SC1', kind: 'teach', x: 1560 }),
  Object.freeze({ id: 'SC2', kind: 'real', x: 2560 }),
  Object.freeze({ id: 'ARCH', kind: 'arch', x: 3520 }),
  Object.freeze({ id: 'FINAL', kind: 'real', x: 4360 }),
]);

const FINAL_DOOR_X = 4720;

// Groups (demo actors are separate and live only inside Beat 0).
//   G1  — bay 1 slow loop, the teaching group.
//   G2N — near-lane group that HALTS at the luggage obstruction (2350).
//   G2F — far-lane fast group, keeps moving (wraps back into bay 2/3).
const G1_LOOP_MIN = 1070;
const G1_LOOP_MAX = 1310;
// During Beat 2 the luggage obstruction queues G1 well behind G2N so the
// near-lane route is visibly dead and targeting near the obstruction picks
// G2N unambiguously.
const G1_BLOCK_STOP_X = 2100;
const G2N_HALT_X = 2350;
const G2F_WRAP_MIN = 2000;
const G2F_WRAP_MAX = 2900;
const SCATTER_VX = 420; // alert dispersal speed toward the outer doors

const COMPANION_START_X = 3300;
const COMPANION_ALERT_X = 4150;

// Beat crossing lines (work package): B1→B2 past 1650 matched,
// B2→B3 past 2650 matched.
const B1_CROSS_X = 1650;
const B2_CROSS_X = 2650;

const OBJECTIVES = Object.freeze({
  0: 'REACH_THE_LAST_DOOR',
  1: 'MATCH_A_GROUP_THEN_WALK_THROUGH',
  2: 'RELEASE_CHANGE_LANE_MATCH_OTHER',
  3: 'MATCH_TEAL_SCARF_PASSENGER',
  4: 'FIND_PARTNER_MATCH_THREE_STEPS',
});

export const CAR03_V2_DEFAULTS = Object.freeze({
  playerStartX: 120,
  playerWalkVx: 200,
  scannerHalfWidth: 90,
  warnMs: 600, // amber WARNING threshold for unmatched exposure
  flagMs: 1500, // flag threshold for unmatched exposure
  freezeMs: 350, // scene freeze on flag before checkpoint return
  laneChangeMs: 250, // diagonal lane change duration
  stepInMs: 250, // visible step-in when a match starts
  matchRadius: 100, // nearest eligible target in same lane within this
  groupOffsetMax: 40, // formation micro-adjust clamp while group-matched
  groupOffsetVx: 160, // how fast A/D slides the offset inside the formation
  duoVx: 140, // pair speed while companion-matched
  duoStepPx: 60, // distance per synchronized duo step
  duoStepsMax: 3,
  duoFollowDx: 36, // companion trails the player by this much when matched
  // Beat 0 environmental demonstration timing (model time, not wall time).
  demoLoneStartX: 1320, // crosses SC1 (1560) at ~1.5s at 160 px/s
  demoLoneVx: 160,
  demoGroupSpawnMs: 3000,
  demoGroupStartX: 1080, // crosses SC1 at ~6s at 160 px/s
  demoGroupVx: 160,
  demoGroupStopX: 1800,
  demoCompleteMs: 10000, // demo.complete ~10s → Beat 1
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

function bayIndexForX(x) {
  return clamp(Math.floor(x / BAY_WIDTH), 0, BAY_COUNT - 1);
}

// Checkpoint safe line per bay (work package): bay*960 + 120.
function checkpointForX(x) {
  return bayIndexForX(x) * BAY_WIDTH + 120;
}

// ---------------------------------------------------------------------------
// The model.
// ---------------------------------------------------------------------------

export function createCar03V2Model(config = {}) {
  const cfg = { ...CAR03_V2_DEFAULTS, ...config };

  // Mutable state — everything rebuilt by initState() so reset() is exact.
  let elapsedMs = 0;
  let beatId = 0;
  let alertActive = false;
  let doorOpen = false;
  let finalCrossedSafe = false;
  let archAccepted = false;
  let complete = false;
  let destroyed = false;
  let events = [];

  let demo = null;
  let player = null;
  let match = null;
  let duo = null;
  let groups = null;
  let companion = null;
  let scanners = null;

  function pushEvent(type, payload) {
    events.push({ type, t: round(elapsedMs), payload: clone(payload ?? {}) });
  }

  function initState() {
    elapsedMs = 0;
    beatId = 0;
    alertActive = false;
    doorOpen = false;
    finalCrossedSafe = false;
    archAccepted = false;
    complete = false;
    events = [];
    demo = {
      played: false,
      complete: false,
      lone: { x: cfg.demoLoneStartX, redirected: false, flagMsLeft: 0 },
      group: { x: cfg.demoGroupStartX, stopped: false },
    };
    player = {
      x: cfg.playerStartX,
      lane: LANE_NEAR,
      vx: 0,
      facing: 1,
      checkpointX: checkpointForX(cfg.playerStartX),
      frozenMsLeft: 0,
      laneTransition: null, // { from, to, msLeft, msTotal }
      offset: 0, // formation offset while group-matched (±groupOffsetMax)
    };
    match = { active: false, targetId: null, kind: null, stepInMsLeft: 0 };
    duo = { steps: 0, stepDist: 0 };
    groups = [
      {
        id: 'G1', lane: LANE_NEAR, vx: 60, x: G1_LOOP_MIN, members: 3,
        scattered: false, scatterDir: -1, dir: 1, march: false,
      },
      {
        id: 'G2N', lane: LANE_NEAR, vx: 60, x: 2150, members: 4,
        scattered: false, scatterDir: -1,
      },
      {
        id: 'G2F', lane: LANE_FAR, vx: 110, x: 2200, members: 3,
        scattered: false, scatterDir: 1,
      },
    ];
    companion = { x: COMPANION_START_X, lane: LANE_NEAR, state: 'waiting', facing: -1, vx: 0 };
    scanners = SCANNER_DEFS.map((s) => ({
      id: s.id, kind: s.kind, x: s.x, state: 'idle', panelText: '', warnMs: 0,
    }));
  }

  initState();

  // -- lookups --------------------------------------------------------------

  function groupById(id) {
    return groups.find((g) => g.id === id) ?? null;
  }
  function scannerById(id) {
    return scanners.find((s) => s.id === id) ?? null;
  }
  function nearRouteBlocked() {
    // The luggage obstruction makes the near route unsuitable during Beat 2.
    return beatId === 2;
  }

  // -- events ---------------------------------------------------------------

  function setBeat(next) {
    beatId = next;
    pushEvent('beat-advance', { beat: next, objectiveId: OBJECTIVES[next] });
  }

  function releaseMatch(reason) {
    if (!match.active) return;
    const wasCompanion = match.kind === 'companion';
    match.active = false;
    match.targetId = null;
    match.kind = null;
    match.stepInMsLeft = 0;
    player.offset = 0;
    if (wasCompanion) {
      companion.state = alertActive ? 'separated' : 'waiting';
      companion.vx = 0;
      resetDuo('release');
    }
    pushEvent('match-released', { reason });
  }

  function resetDuo(reason) {
    const had = duo.steps > 0 || duo.stepDist > 0;
    duo.steps = 0;
    duo.stepDist = 0;
    if (had) pushEvent('duo-reset', { reason });
  }

  // -- targeting ------------------------------------------------------------
  // Nearest eligible target in the same lane within matchRadius.
  // Eligible: a non-scattered group, or the companion while waiting/separated.

  function computeTarget() {
    let best = null;
    let bestDist = Infinity;
    for (const g of groups) {
      if (g.scattered) continue;
      if (g.lane !== player.lane) continue;
      const d = Math.abs(g.x - player.x);
      if (d <= cfg.matchRadius && d < bestDist) {
        best = { kind: 'group', id: g.id };
        bestDist = d;
      }
    }
    if (companion.state === 'waiting' || companion.state === 'separated') {
      if (companion.lane === player.lane) {
        const d = Math.abs(companion.x - player.x);
        if (d <= cfg.matchRadius && d < bestDist) {
          best = { kind: 'companion', id: 'companion' };
        }
      }
    }
    if (!best) return { kind: null, id: null, eligible: false };
    return { kind: best.kind, id: best.id, eligible: true };
  }

  // -- Beat 0 environmental demonstration ------------------------------------

  function tickDemo(dt) {
    if (demo.complete) return;
    demo.played = true;
    const dtSec = dt / 1000;
    const sc1 = scannerById('SC1');
    // Lone commuter: crosses SC1 at ~1.5s and is gently redirected.
    if (!demo.lone.redirected) {
      demo.lone.x += cfg.demoLoneVx * dtSec;
      if (demo.lone.x >= sc1.x) {
        demo.lone.redirected = true;
        demo.lone.flagMsLeft = 700; // SC1 shows the red beat briefly
        demo.lone.x = checkpointForX(sc1.x - cfg.scannerHalfWidth); // bay 1 safe line
      }
    } else if (demo.lone.flagMsLeft > 0) {
      demo.lone.flagMsLeft = Math.max(0, demo.lone.flagMsLeft - dt);
    }
    // Three-person group: crosses SC1 at ~6s and makes it say PATTERN OK.
    if (elapsedMs >= cfg.demoGroupSpawnMs && !demo.group.stopped) {
      demo.group.x += cfg.demoGroupVx * dtSec;
      if (demo.group.x >= cfg.demoGroupStopX) demo.group.stopped = true;
    }
    if (elapsedMs >= cfg.demoCompleteMs) {
      demo.complete = true;
      pushEvent('demo-complete', {});
      setBeat(1);
    }
  }

  // -- lane change ------------------------------------------------------------

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
    if (player.laneTransition) return; // already transitioning
    const wantFar = !!input.laneFar;
    const wantNear = !!input.laneNear;
    if (wantFar === wantNear) return; // neither, or ambiguous both
    const to = wantFar ? LANE_FAR : LANE_NEAR;
    if (to === player.lane) return; // must be opposite of current lane
    player.laneTransition = {
      from: player.lane,
      to,
      msLeft: cfg.laneChangeMs,
      msTotal: cfg.laneChangeMs,
    };
    // A diagonal lane change breaks the match: the target is on the other
    // lane by construction.
    if (match.active) releaseMatch('lane-change');
  }

  // -- groups -----------------------------------------------------------------

  function tickGroups(dt) {
    const dtSec = dt / 1000;
    for (const g of groups) {
      if (g.scattered) {
        g.x = clamp(g.x + g.scatterDir * SCATTER_VX * dtSec, 0, WORLD_LENGTH);
        continue;
      }
      if (g.id === 'G1') {
        const matchedByPlayer = match.active && match.kind === 'group' && match.targetId === 'G1';
        if (matchedByPlayer) g.march = true;
        if (g.march || g.x > G1_LOOP_MAX) {
          // March steadily right (the loop is a waiting behaviour only).
          let nx = g.x + g.vx * dtSec;
          if (nearRouteBlocked()) nx = Math.min(nx, G1_BLOCK_STOP_X);
          g.x = nx;
        } else {
          g.x += g.dir * g.vx * dtSec;
          if (g.x >= G1_LOOP_MAX) { g.x = G1_LOOP_MAX; g.dir = -1; }
          if (g.x <= G1_LOOP_MIN) { g.x = G1_LOOP_MIN; g.dir = 1; }
        }
      } else if (g.id === 'G2N') {
        // Halts at the luggage obstruction and stays there.
        if (g.x < G2N_HALT_X) g.x = Math.min(G2N_HALT_X, g.x + g.vx * dtSec);
      } else if (g.id === 'G2F') {
        // Keeps moving; wraps back so it keeps serving the bay 2/3 far route.
        g.x += g.vx * dtSec;
        if (g.x > G2F_WRAP_MAX) g.x = G2F_WRAP_MIN;
      }
    }
  }

  // -- player movement ----------------------------------------------------------

  function movePlayer(dt, input) {
    const dtSec = dt / 1000;
    const left = !!input.left;
    const right = !!input.right;
    const prevX = player.x;

    // Step-in animation: hold position for stepInMs after E.
    if (match.active && match.stepInMsLeft > 0) {
      player.vx = 0;
      return;
    }

    if (match.active && match.kind === 'group') {
      const g = groupById(match.targetId);
      if (!g || g.scattered) {
        releaseMatch('group-scattered');
        // fall through to free movement for this frame
      } else {
        if (right) {
          player.offset = clamp(player.offset + cfg.groupOffsetVx * dtSec, -cfg.groupOffsetMax, cfg.groupOffsetMax);
        } else if (left) {
          player.offset = clamp(player.offset - cfg.groupOffsetVx * dtSec, -cfg.groupOffsetMax, cfg.groupOffsetMax);
        }
        player.x = g.x + player.offset;
        player.facing = 1; // groups only ever move right
        player.vx = dtSec > 0 ? (player.x - prevX) / dtSec : 0;
        player.x = clamp(player.x, 0, WORLD_LENGTH);
        // Without right the player stays put; if the group drifts more than
        // matchRadius away, the match snaps.
        if (!right && Math.abs(player.x - g.x) > cfg.matchRadius) {
          releaseMatch('distance');
        }
        return;
      }
    }

    if (match.active && match.kind === 'companion') {
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      if (dir !== 0) {
        player.x = clamp(player.x + dir * cfg.duoVx * dtSec, 0, WORLD_LENGTH);
        player.facing = dir;
        companion.x = clamp(player.x - cfg.duoFollowDx, 0, WORLD_LENGTH);
        companion.lane = player.lane;
        companion.facing = dir;
        companion.vx = dir * cfg.duoVx;
      } else {
        player.vx = 0;
        companion.vx = 0;
      }
      player.vx = dir * cfg.duoVx;
      return;
    }

    // Free movement.
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0) {
      player.facing = dir;
      player.x = clamp(player.x + dir * cfg.playerWalkVx * dtSec, 0, WORLD_LENGTH);
      player.vx = dir * cfg.playerWalkVx;
    } else {
      player.vx = 0;
    }
  }

  function tickStepIn(dt) {
    if (!match.active || match.stepInMsLeft <= 0) return;
    match.stepInMsLeft = Math.max(0, match.stepInMsLeft - dt);
    if (match.stepInMsLeft === 0 && match.kind === 'group') {
      const g = groupById(match.targetId);
      if (g && !g.scattered) {
        // Land in the formation so the post-step-in distance check starts
        // from inside the group, not from wherever the press happened.
        player.offset = 0;
        player.x = clamp(g.x, 0, WORLD_LENGTH);
      }
    }
  }

  function tickCompanionIdle() {
    if (companion.state === 'matched') return; // driven by movePlayer
    companion.vx = 0;
    companion.facing = player.x >= companion.x ? 1 : -1;
  }

  // -- duo steps -----------------------------------------------------------------
  // Only while companion-matched: rightward movement accumulates stepDist;
  // every duoStepPx fills one pip (max 3). Stopping pauses; reversing or
  // separating resets the pips.

  function tickDuoSteps(dt) {
    if (!(match.active && match.kind === 'companion')) return;
    if (match.stepInMsLeft > 0) return;
    if (player.vx > 0) {
      if (duo.steps >= cfg.duoStepsMax) {
        duo.stepDist = 0;
        return;
      }
      duo.stepDist += player.vx * (dt / 1000);
      while (duo.stepDist >= cfg.duoStepPx && duo.steps < cfg.duoStepsMax) {
        duo.stepDist -= cfg.duoStepPx;
        duo.steps += 1;
        pushEvent('duo-step', { steps: duo.steps });
      }
      if (duo.steps >= cfg.duoStepsMax) duo.stepDist = 0;
    } else if (player.vx < 0) {
      resetDuo('reverse');
    }
    // vx === 0 → pause, keep partial progress.
  }

  // -- beat transitions, alert, final door, completion ----------------------------

  function triggerAlert() {
    alertActive = true;
    pushEvent('alert', {});
    for (const g of groups) {
      g.scattered = true;
      g.scatterDir = g.x < WORLD_LENGTH / 2 ? -1 : 1;
    }
    // The dispersal separates the pair: companion ends up near the final
    // scanner, waiting to be found again.
    if (match.active) releaseMatch('alert');
    companion.x = COMPANION_ALERT_X;
    companion.lane = LANE_NEAR;
    companion.state = 'separated';
    companion.vx = 0;
    companion.facing = -1;
    resetDuo('alert'); // the three steps must be re-earned in Beat 4
    setBeat(4);
  }

  function beatAndCompletionChecks() {
    if (beatId === 1 && match.active && player.x > B1_CROSS_X) {
      setBeat(2);
    } else if (beatId === 2 && match.active && player.x > B2_CROSS_X) {
      setBeat(3);
    }

    // B3→B4: at the calibration ARCH, companion match active AND 3 duo steps.
    const arch = scannerById('ARCH');
    if (
      beatId === 3
      && !archAccepted
      && match.active
      && match.kind === 'companion'
      && duo.steps === cfg.duoStepsMax
      && Math.abs(player.x - arch.x) <= cfg.scannerHalfWidth
    ) {
      archAccepted = true;
      arch.state = 'safe';
      arch.panelText = '2-PERSON PATTERN ACCEPTED';
      pushEvent('arch-accepted', {});
      triggerAlert();
    }

    // FINAL only turns safe via the matched companion crossing in Beat 4.
    const fin = scannerById('FINAL');
    if (
      beatId === 4
      && !finalCrossedSafe
      && match.active
      && match.kind === 'companion'
      && duo.steps === cfg.duoStepsMax
      && Math.abs(player.x - fin.x) <= cfg.scannerHalfWidth
      && player.x >= fin.x
    ) {
      finalCrossedSafe = true;
      doorOpen = true; // the door opens only after the safe crossing with steps done
      pushEvent('door-open', {});
    }

    if (
      beatId === 4
      && doorOpen
      && !complete
      && player.x >= FINAL_DOOR_X
      && match.active
      && match.kind === 'companion'
      && duo.steps === cfg.duoStepsMax
    ) {
      complete = true;
      fin.panelText = 'COORDINATED PATTERN ACCEPTED';
      pushEvent('complete', {});
    }
  }

  // -- scanners ---------------------------------------------------------------------

  function scannerSafeQualified(sc) {
    if (sc.id === 'FINAL') {
      return beatId === 4 && match.kind === 'companion' && duo.steps === cfg.duoStepsMax;
    }
    return true;
  }

  function flagPlayer(sc) {
    sc.state = 'flagged';
    sc.panelText = 'ALONE — MATCH SOMEONE';
    player.frozenMsLeft = cfg.freezeMs;
    player.vx = 0;
    player.checkpointX = checkpointForX(player.x);
    pushEvent('flagged', { scanner: sc.id, checkpointX: player.checkpointX });
  }

  function resolveFlag() {
    player.x = player.checkpointX;
    player.vx = 0;
    pushEvent('checkpoint-return', { checkpointX: player.checkpointX });
    for (const sc of scanners) {
      if (sc.state === 'flagged') {
        sc.state = 'idle';
        sc.panelText = '';
      }
      sc.warnMs = 0;
    }
  }

  function tickScanners(dt) {
    for (const sc of scanners) {
      // ARCH: non-punishing calibration gate.
      if (sc.kind === 'arch') {
        if (!archAccepted) {
          sc.state = 'idle';
          sc.panelText = '';
        }
        sc.warnMs = 0;
        continue;
      }

      // While Beat 0 runs, SC1's display belongs to the demonstration.
      if (!demo.complete && sc.id === 'SC1') {
        const groupInVolume = Math.abs(demo.group.x - sc.x) <= cfg.scannerHalfWidth
          && elapsedMs >= cfg.demoGroupSpawnMs;
        if (groupInVolume) {
          sc.state = 'safe';
          sc.panelText = 'PATTERN OK';
        } else if (demo.lone.flagMsLeft > 0) {
          sc.state = 'flagged';
          sc.panelText = 'ALONE';
        } else if (
          !demo.lone.redirected
          && Math.abs(demo.lone.x - sc.x) <= cfg.scannerHalfWidth
        ) {
          sc.state = 'warning';
          sc.panelText = 'WARNING';
        } else {
          sc.state = 'idle';
          sc.panelText = '';
        }
        sc.warnMs = 0;
        continue;
      }

      const inVolume = Math.abs(player.x - sc.x) <= cfg.scannerHalfWidth;

      if (inVolume && match.active && scannerSafeQualified(sc)) {
        sc.state = 'safe';
        sc.panelText = 'PATTERN OK';
        sc.warnMs = 0;
        continue;
      }

      if (inVolume && match.active && !scannerSafeQualified(sc)) {
        // Matched, but the pattern is not accepted here (e.g. FINAL before
        // the Beat 4 three-step test). Amber only — never punishes a pair.
        sc.state = 'warning';
        sc.panelText = 'WARNING';
        sc.warnMs = 0;
        continue;
      }

      if (inVolume && !match.active && demo.complete) {
        if (sc.kind === 'teach') {
          // Scanner 1 is lenient forever: amber at the warning threshold,
          // never flags.
          sc.warnMs += dt;
          sc.state = sc.warnMs >= cfg.warnMs ? 'warning' : 'idle';
          sc.panelText = sc.state === 'warning' ? 'WARNING' : '';
          continue;
        }
        // Real rules: warn at warnMs, flag at flagMs.
        sc.warnMs += dt;
        if (sc.warnMs >= cfg.flagMs) {
          flagPlayer(sc);
          continue;
        }
        sc.state = sc.warnMs >= cfg.warnMs ? 'warning' : 'idle';
        sc.panelText = sc.state === 'warning' ? 'WARNING' : '';
        continue;
      }

      // Outside the volume (or before the teaching demo completes — the
      // player can never be punished during Beat 0).
      sc.state = 'idle';
      sc.panelText = '';
      sc.warnMs = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function update(dtMs, input = {}) {
    if (destroyed) return;
    if (typeof dtMs !== 'number' || !(dtMs > 0)) return;
    const dt = Math.min(dtMs, 100); // clamp pathological frame gaps
    elapsedMs += dt;
    if (complete) return; // the scene plays the outro; the model is done

    if (player.frozenMsLeft > 0) {
      // Flag freeze: the whole scene holds for freezeMs, then the player is
      // returned to the active bay checkpoint.
      player.frozenMsLeft = Math.max(0, player.frozenMsLeft - dt);
      if (player.frozenMsLeft === 0) resolveFlag();
      return;
    }

    tickDemo(dt);
    tickLaneTransition(dt);
    startLaneChange(input);
    tickGroups(dt);
    movePlayer(dt, input);
    tickStepIn(dt);
    tickCompanionIdle();
    tickDuoSteps(dt);
    beatAndCompletionChecks();
    if (complete) return; // final scanner panel set; keep it for the snapshot
    tickScanners(dt);
  }

  // E: exactly one meaning — toggle the match on the highlighted target.
  function pressInteract() {
    if (destroyed || complete) return;
    if (player.frozenMsLeft > 0) return;
    if (match.active) {
      releaseMatch('player');
      return;
    }
    const target = computeTarget();
    if (!target.eligible) {
      pushEvent('interact-noop', {});
      return;
    }
    match.active = true;
    match.targetId = target.id;
    match.kind = target.kind;
    match.stepInMsLeft = cfg.stepInMs;
    player.offset = 0;
    if (target.kind === 'companion') {
      companion.state = 'matched';
      companion.facing = player.x >= companion.x ? 1 : -1;
    }
    pushEvent('match-started', { kind: target.kind, targetId: target.id });
  }

  function snapshot() {
    const lt = player.laneTransition;
    return clone({
      beatId,
      objectiveId: OBJECTIVES[beatId],
      complete,
      alertActive,
      doorOpen,
      demo: { played: demo.played, complete: demo.complete },
      bayIndex: bayIndexForX(player.x),
      elapsedMs: round(elapsedMs),
      player: {
        x: round(player.x),
        lane: player.lane,
        laneTransition: lt
          ? { from: lt.from, to: lt.to, msLeft: round(Math.max(0, lt.msLeft)), msTotal: lt.msTotal }
          : null,
        vx: round(player.vx),
        facing: player.facing,
        checkpointX: player.checkpointX,
        frozenMsLeft: round(player.frozenMsLeft),
      },
      target: computeTarget(),
      match: {
        active: match.active,
        targetId: match.targetId,
        kind: match.kind,
        stepInMsLeft: round(match.stepInMsLeft),
      },
      duoSteps: duo.steps,
      duoStepDist: round(duo.stepDist),
      groups: groups.map((g) => ({
        id: g.id,
        lane: g.lane,
        x: round(g.x),
        vx: g.vx,
        members: g.members,
        scattered: !!g.scattered,
      })),
      companion: {
        x: round(companion.x),
        lane: companion.lane,
        state: companion.state,
        facing: companion.facing,
      },
      scanners: scanners.map((sc) => ({
        id: sc.id,
        kind: sc.kind,
        x: sc.x,
        state: sc.state,
        panelText: sc.panelText,
        warnMs: round(sc.warnMs),
      })),
      nearRouteBlocked: nearRouteBlocked(),
      finalDoorX: FINAL_DOOR_X,
    });
  }

  function drainEvents() {
    const out = events;
    events = [];
    return clone(out);
  }

  // R key: full reset to the entry baseline.
  function reset() {
    initState();
    pushEvent('reset', {});
  }

  function destroy() {
    destroyed = true;
    events = [];
  }

  // Compatibility shims for the still-V1 PresentCityScene.js (which cannot
  // be modified in this work package). V2 has NO QA warp states: the work
  // package forbids model mutation from QA/browser scripts, so applyQaWarp
  // is a read-only no-op that simply returns the current snapshot.
  function applyQaWarp() {
    return snapshot();
  }

  return {
    update,
    pressInteract,
    snapshot,
    drainEvents,
    reset,
    destroy,
    applyQaWarp,
  };
}

// Stable export name: the unmodified V1 scene imports the factory under its
// old name. V2 scene integration re-wires this in a later phase.
export const createSocialStealthModel = createCar03V2Model;
