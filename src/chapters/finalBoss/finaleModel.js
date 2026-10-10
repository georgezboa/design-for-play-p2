// Chapter 6 · ALL WORLDS AT ONCE — pure rules for the four movements.
//
// No three.js, no DOM: spectacleBattle.js renders these and node tests drive
// them directly (tests/finalBoss/finaleModel.test.mjs).
//
//   Movement I   LOST PROPERTY   — the punch-hole lens and tagged cases.
//   Movement II  BORROWED LIGHT  — the 4-second bell and the one-line rule.
//   Movement III ECHO CITY       — the argument about Mara (two true things).
//   Movement IV  PAINTED COUNTRY — absorbed pigment returns as damage.
//
// Plus the shared pieces: difficulty presets and the death ledger that offers
// STORY after three deaths in one movement.

import { BELL_MS, CH2_RULES, createTimetable } from '../borrowedLight/timetableModel.js';

// ---------------------------------------------------------------------------
// Difficulty

// Round 11 (the skill fight, conductorFight.js): STORY keeps every pattern
// but slows and thins it. teleScale stretches every warning, flightScale
// every throw and travelling hazard, tempo the gaps between attacks,
// windowScale every punish window; `thin` leaves out the attacks marked
// extra; hurtScale shrinks Butch's hurt radius; jumpClear is the height a
// jump must reach to clear a ground hazard (lower clears sooner). rollback:
// what a torn last layer costs ('phase': the phase begins again, his ticket
// back at the phase's start; 'none': nothing is undone).
export const DIFFICULTIES = Object.freeze({
  story: Object.freeze({
    id: 'story', label: 'STORY', layers: 6, telegraph: 1.35, beat: 3.05, overlap: 1,
    bossWindow: 1.5, speedScale: 0.82, respawnInv: 3, beamLanes: 1, fullSweepEvery: 0,
    lampMs: 3000, bridgeMs: 6400, boardMs: 3600,
    teleScale: 1.4, flightScale: 1.3, tempo: 1.35, windowScale: 1.5, thin: true, hurtScale: 0.8, jumpClear: 0.45, rollback: 'none',
  }),
  normal: Object.freeze({
    id: 'normal', label: 'NORMAL', layers: 4, telegraph: 0.9, beat: 2.2, overlap: 2,
    bossWindow: 1.08, speedScale: 0.94, respawnInv: 2.6, beamLanes: 2, fullSweepEvery: 3,
    lampMs: 2400, bridgeMs: 5200, boardMs: 3400,
    teleScale: 1, flightScale: 1, tempo: 1, windowScale: 1, thin: false, hurtScale: 1, jumpClear: 0.6, rollback: 'phase',
  }),
});

export const DEFAULT_DIFFICULTY = 'normal';

export function difficultyPreset(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
}

// ---------------------------------------------------------------------------
// A torn last layer (round 6, item 16: one hit in Movement III put his
// ticket back where the movement began, after an answer had landed).
//
// It costs Butch his place and the chance in hand, never what he has done:
// the Conductor's ticket stays where it was, answers given and facts struck
// stand (the debate is never reset), Movement II's lessons stay learned. A
// window earned in Movement III stays open: he walks back to the front edge.
// What goes: his position, the cases on the floor (I), the queued lamps (II,
// a new arena), the colour on the brush (IV).

export function keptAfterTornLayers(movement, { echoWindow = false } = {}) {
  if (movement === 0) return 'His ticket stays where you left it. The cases on the floor are cleared; he will drop more.';
  if (movement === 1) return 'His ticket stays where you left it, and what you learned of the bell stays learned. The lamps start dark.';
  if (movement === 2) {
    return echoWindow
      ? 'His ticket stays where you left it, and your answer stands: walk back to the lit front edge.'
      : 'His ticket stays where you left it. Your answers stand, and struck cards stay struck.';
  }
  return 'His ticket stays where you left it. The colour on your brush is spilled; take more.';
}

export function tornLayerReset({ movement = 0, bossHp = 0, echoStage = 'combat', echoClock = 0, brush = 0 } = {}) {
  const keepWindow = movement === 2 && echoStage === 'window';
  return {
    bossHp,
    brush: 0,
    spilled: brush,
    clearCases: movement === 0,
    newArena: movement === 1,
    keepWindow,
    echoStage: movement === 2 && !keepWindow ? 'combat' : echoStage,
    // The next exchange never waits longer for a torn layer.
    echoClock: movement === 2 && !keepWindow ? Math.min(echoClock, 5) : echoClock,
    kept: keptAfterTornLayers(movement, { echoWindow: keepWindow }),
  };
}

// Round 11 (conductorFight.js): a torn last layer is a phase checkpoint;
// the death card says what it cost in one line.
export function checkpointLine({ rollback = 'phase', phaseName = '' } = {}) {
  if (rollback === 'phase') return `This phase starts again${phaseName ? `: ${phaseName}` : ''}. What you won before it stays won.`;
  return 'His ticket stays where you left it. Nothing is undone.';
}

// ---------------------------------------------------------------------------
// Death ledger: STORY is offered once per movement, after the third death in
// that movement, and only to a player who is not already on STORY.

export const STORY_OFFER_AFTER = 3;

export function createDeathLedger({ offerAfter = STORY_OFFER_AFTER } = {}) {
  const deaths = new Map();
  const offered = new Set();
  return {
    record(movement, difficulty = DEFAULT_DIFFICULTY) {
      const count = (deaths.get(movement) ?? 0) + 1;
      deaths.set(movement, count);
      const offer = difficulty !== 'story' && count >= offerAfter && !offered.has(movement);
      if (offer) offered.add(movement);
      return { movement, deaths: count, offerStory: offer };
    },
    deaths: (movement) => deaths.get(movement) ?? 0,
    offered: (movement) => offered.has(movement),
    reset() { deaths.clear(); offered.clear(); },
  };
}

// ---------------------------------------------------------------------------
// Movement I · LOST PROPERTY — the lens.
//
// The arena is four painted panels in a 2×2 frame; the Conductor's trains run
// in the seams. The punch-hole lens shows the sepia 1978 layer: a case's
// claim name can only be read through it, only a case whose tag is under the
// lens can be punched back to the Conductor, and ghost trains exist only in
// 1978, so they are drawn (and can be dodged) only where the lens looks.

export const LENS_RADIUS = 2.35;
export const LENS_ORBIT = 2.6;
export const CASE_RETURN_DAMAGE = 20;
export const CASE_REACH = 2.7;

export const PANEL_SEAMS = Object.freeze({ x: 0, z: 0.4, halfWidth: 0.62 });

export function underLens(lens, x, z, radius = LENS_RADIUS) {
  if (!lens) return false;
  return Math.hypot(x - lens.x, z - lens.z) <= radius;
}

// Keyboard play: the lens circles Butch at a fixed radius, slowly, so a
// player without a mouse still sweeps the 1978 layer around themselves.
export function orbitLens(player, timeSeconds, { radius = LENS_ORBIT, speed = 0.9, facingX = 0, facingZ = -1 } = {}) {
  const lead = Math.atan2(facingZ, facingX);
  const angle = lead + Math.sin(timeSeconds * speed) * 1.05;
  return { x: player.x + Math.cos(angle) * radius, z: player.z + Math.sin(angle) * radius };
}

export function caseReturnable(item, lens, player, { reach = CASE_REACH, radius = LENS_RADIUS } = {}) {
  if (!item?.landed || item.returned) return false;
  if (player && Math.hypot(player.x - item.x, player.z - item.z) > reach) return false;
  return underLens(lens, item.tagX ?? item.x, item.tagZ ?? item.z, radius);
}

// What a punch on a landed case does: returned (damage) or refused because
// its tag is outside the lens (the claim name cannot be read).
export function punchCase(item, lens, player, options) {
  if (!item?.landed || item.returned) return { result: 'none' };
  if (player && Math.hypot(player.x - item.x, player.z - item.z) > (options?.reach ?? CASE_REACH)) return { result: 'out-of-reach' };
  if (!caseReturnable(item, lens, player, options)) return { result: 'unread' };
  return { result: 'returned', damage: CASE_RETURN_DAMAGE };
}

// Shortest distance from a point to a segment (train body in the seam).
function segmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

// A ghost train's body is the segment [tail, head]; it is revealed where it
// overlaps the lens circle.
export function ghostTrainRevealed(train, lens, radius = LENS_RADIUS) {
  if (!lens || !train) return false;
  return segmentDistance(lens.x, lens.z, train.tailX, train.tailZ, train.headX, train.headZ) <= radius + (train.halfWidth ?? 0.6);
}

// A seam train hits Butch when he stands in its seam, level with its body.
export function trainHits(train, player, { halfWidth = PANEL_SEAMS.halfWidth + 0.2 } = {}) {
  if (!train || !player) return false;
  return segmentDistance(player.x, player.z, train.tailX, train.tailZ, train.headX, train.headZ) <= halfWidth;
}

// ---------------------------------------------------------------------------
// Movement II · BORROWED LIGHT — the bell.
//
// Seven lamp nodes on three coloured lines feed six machines. The Chapter 2
// timetable model (borrowedLight/timetableModel.js) owns the bell, the queue
// and the one-line rule; this arena adds the Conductor's own timetable:
//  - on every bell he steps into the lane he announced one bell earlier;
//  - on every off-beat (half a bell later) his signal beams fire down the
//    lanes he announced for that bell;
//  - a rose signal lamp powered on a bell, in the lane he steps into, lights
//    him: the damage window. A lit Conductor cannot fire down his own lane.
// Amber bridges cross the floor gap to the front platform, where Butch
// punches a lit Conductor. Teal billboards shelter the lane behind them.

export const LANES = Object.freeze(['west', 'centre', 'east']);
export const LANE_X = Object.freeze({ west: -7, centre: 0, east: 7 });
export const LANE_EDGE = 3.5;
export const OFFBEAT_MS = BELL_MS / 2;
// A punch on a lit Conductor (movements/onTheBell.js adds ON THE BELL).
export const LIGHT_DAMAGE = 10;
// A return plank lays in RETURN_PLANK_TRAVEL_MS, stays out RETURN_PLANK_MS
// in all and folds as it came.
// A return plank lays in RETURN_PLANK_TRAVEL_MS, stays out RETURN_PLANK_MS
// in all and folds as it came.
export const RETURN_PLANK_MS = 4200;
export const RETURN_PLANK_TRAVEL_MS = 450;
// Seconds stranded on the far roof before the line lays a return plank.
export const STRANDED_GRACE_S = 1.2;

export const BELL_ARENA = Object.freeze({
  gapNearZ: -1.35,
  gapFarZ: -4.35,
  bridgeHalfWidth: 1.55,
  bridges: Object.freeze({ 'bridge-west': LANE_X.west, 'bridge-east': LANE_X.east }),
  boards: Object.freeze({ 'board-west': Object.freeze({ lane: 'west', z: 2.4 }), 'board-east': Object.freeze({ lane: 'east', z: 2.4 }) }),
  lamps: Object.freeze({ 'lamp-west': 'west', 'lamp-centre': 'centre', 'lamp-east': 'east' }),
  // Punchable lamp boxes on poles, each with a paper tag (arena metres).
  // `label` names the lamp by its line's colour (alpha round 4: "AMBER
  // lamp" and "ROSE signal" in the hints matched nothing on screen);
  // `machine` + MACHINE_NAMES name what it drives.
  nodes: Object.freeze([
    Object.freeze({ id: 'lamp-west', line: 'rose', machine: 'lamp-west', lane: 'west', x: -7, z: 0.4, label: 'ROSE SIGNAL · WEST' }),
    Object.freeze({ id: 'lamp-centre', line: 'rose', machine: 'lamp-centre', lane: 'centre', x: 0, z: 0.4, label: 'ROSE SIGNAL · CENTRE' }),
    Object.freeze({ id: 'lamp-east', line: 'rose', machine: 'lamp-east', lane: 'east', x: 7, z: 0.4, label: 'ROSE SIGNAL · EAST' }),
    Object.freeze({ id: 'bridge-west', line: 'amber', machine: 'bridge-west', lane: 'west', x: -3.6, z: 3.1, label: 'AMBER LAMP · BRIDGE WEST' }),
    Object.freeze({ id: 'bridge-east', line: 'amber', machine: 'bridge-east', lane: 'east', x: 3.6, z: 3.1, label: 'AMBER LAMP · BRIDGE EAST' }),
    Object.freeze({ id: 'board-west', line: 'teal', machine: 'board-west', lane: 'west', x: -11.2, z: 5.2, label: 'TEAL LAMP · BILLBOARD WEST' }),
    Object.freeze({ id: 'board-east', line: 'teal', machine: 'board-east', lane: 'east', x: 11.2, z: 5.2, label: 'TEAL LAMP · BILLBOARD EAST' }),
  ]),
  nodeReach: 2.3,
});

// What each machine is, for the LISTEN read-out ("LISTENING · BRIDGE WEST").
export const MACHINE_NAMES = Object.freeze({
  'bridge-west': 'BRIDGE WEST', 'bridge-east': 'BRIDGE EAST', 'board-west': 'BILLBOARD WEST', 'board-east': 'BILLBOARD EAST',
  'lamp-west': 'SIGNAL WEST', 'lamp-centre': 'SIGNAL CENTRE', 'lamp-east': 'SIGNAL EAST',
});

export function laneOf(x) {
  if (x < -LANE_EDGE) return 'west';
  if (x > LANE_EDGE) return 'east';
  return 'centre';
}

export function bellArenaTimetable(preset = difficultyPreset()) {
  return {
    nodes: BELL_ARENA.nodes.map(({ id, line, machine }) => ({ id, line, machine })),
    machines: [
      { id: 'bridge-west', kind: 'bridge', duration: preset.bridgeMs, travel: 450 },
      { id: 'bridge-east', kind: 'bridge', duration: preset.bridgeMs, travel: 450 },
      { id: 'board-west', kind: 'billboard', duration: preset.boardMs, travel: 300 },
      { id: 'board-east', kind: 'billboard', duration: preset.boardMs, travel: 300 },
      { id: 'lamp-west', kind: 'sign', duration: preset.lampMs, travel: 150 },
      { id: 'lamp-centre', kind: 'sign', duration: preset.lampMs, travel: 150 },
      { id: 'lamp-east', kind: 'sign', duration: preset.lampMs, travel: 150 },
    ],
  };
}

// Deterministic "random" for the Conductor's plan (mulberry32).
function planRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createBellArena({ difficulty = DEFAULT_DIFFICULTY, seed = 7, startMs = 0, beams = true } = {}) {
  const preset = difficultyPreset(difficulty);
  // Chapter 2's re-press rule (alpha round 3, K2): punching a queued lamp
  // again is the same punch, never a silent take-back ("UNPUNCHED"). The
  // finale keeps the legacy, wider bell catch: its 3D arena runs at a few
  // frames a second on slow machines.
  const timetable = createTimetable(bellArenaTimetable(preset), { startMs, memoryMs: 0, repress: CH2_RULES.repress });
  const random = planRng(seed);
  let round = 0;
  let beamsOn = beams;
  // Round 11: each phase of Movement II sets its own pressure (setPressure):
  // how many lanes his beams take, and how often they sweep all three.
  const pressure = { beamLanes: preset.beamLanes, fullSweepEvery: preset.fullSweepEvery };
  let conductorLane = 'centre';
  let exposure = null; // { lane, bell, punched }
  let beam = null; // { lanes, firesInMs, fired }
  // Return planks (alpha A4-6): a bridge the line lays by itself for a
  // player stranded on the far roof, outside the timetable.
  const returns = new Map(); // id -> { age, left } in ms
  const planFor = (index, fromLane) => {
    // The Conductor never announces the lane he already stands in twice
    // running, so the player always has somewhere new to light.
    const choices = LANES.filter((lane) => lane !== fromLane);
    const lane = choices[Math.floor(random() * choices.length)];
    const full = beamsOn && pressure.fullSweepEvery > 0 && index > 2 && index % pressure.fullSweepEvery === 0;
    const count = !beamsOn ? 0 : full ? 3 : Math.max(0, Math.min(3, pressure.beamLanes));
    const shuffled = [...LANES].sort(() => random() - 0.5);
    const lanes = LANES.filter((candidate) => shuffled.slice(0, count).includes(candidate));
    return { lane, beamLanes: lanes, fullSweep: full };
  };
  let plan = planFor(1, conductorLane);

  const lampFor = (lane) => `lamp-${lane}`;
  const lit = (lane) => Boolean(timetable.machineStatus(lampFor(lane))?.powered);

  const onBell = (events, bellIndex) => {
    round += 1;
    const from = conductorLane;
    conductorLane = plan.lane;
    events.push({ type: 'conductor-step', from, to: conductorLane, bell: bellIndex });
    const current = plan;
    plan = planFor(round + 1, conductorLane);
    events.push({ type: 'plan', next: { ...plan } });
    if (lit(conductorLane)) {
      exposure = { lane: conductorLane, bell: bellIndex, punched: false };
      events.push({ type: 'exposed', lane: conductorLane, bell: bellIndex });
    } else if (exposure) {
      events.push({ type: 'exposure-end', lane: exposure.lane });
      exposure = null;
    }
    beam = current.beamLanes.length ? { lanes: [...current.beamLanes], firesInMs: OFFBEAT_MS, fired: false, fullSweep: current.fullSweep } : null;
    if (beam) events.push({ type: 'beam-telegraph', lanes: [...beam.lanes], fullSweep: beam.fullSweep });
  };

  // `hold`: the bell waits (Movement II's first punch is taught with the
  // clock standing still): nothing on the timetable moves, but a return
  // plank still lays itself out, and stays.
  const update = (dtMs, { hold = false } = {}) => {
    const out = [];
    if (hold) {
      const step = Math.max(0, Number(dtMs) || 0);
      for (const plank of returns.values()) plank.age += step;
      return out;
    }
    let left = Math.max(0, Number(dtMs) || 0);
    // Step up to each bell so the off-beat and the bell never blur together.
    while (left > 0) {
      const step = Math.min(left, timetable.msToBell(), beam && !beam.fired ? Math.max(1e-6, beam.firesInMs) : Infinity);
      const events = timetable.update(step);
      left -= step;
      if (beam && !beam.fired) {
        beam.firesInMs -= step;
        if (beam.firesInMs <= 1e-6) {
          beam.fired = true;
          const lanes = beam.lanes.filter((lane) => !(exposure && lane === exposure.lane && lit(lane)));
          out.push({ type: 'beam-fire', lanes, cancelled: beam.lanes.filter((lane) => !lanes.includes(lane)), fullSweep: beam.fullSweep });
        }
      }
      for (const event of events) {
        out.push(event);
        if (event.type === 'bell') onBell(out, event.index);
      }
      for (const [id, plank] of returns) {
        plank.age += step;
        plank.left -= step;
        if (plank.left <= 0) { returns.delete(id); out.push({ type: 'return-off', machineId: id }); }
      }
      if (exposure && !lit(exposure.lane)) {
        out.push({ type: 'exposure-end', lane: exposure.lane });
        exposure = null;
      }
    }
    return out;
  };

  const shelteredBy = (x, z) => {
    const lane = laneOf(x);
    for (const [id, board] of Object.entries(BELL_ARENA.boards)) {
      const status = timetable.machineStatus(id);
      if (board.lane === lane && status?.level >= 0.6 && z > board.z) return id;
    }
    return null;
  };

  // What a fired beam does to Butch at (x, z).
  const resolveBeam = (lanes, x, z) => {
    const lane = laneOf(x);
    if (!lanes.includes(lane)) return 'clear';
    return shelteredBy(x, z) ? 'sheltered' : 'hit';
  };

  const returnLevel = (id) => {
    const plank = returns.get(id);
    if (!plank) return 0;
    return Math.max(0, Math.min(1, plank.age / RETURN_PLANK_TRAVEL_MS, plank.left / RETURN_PLANK_TRAVEL_MS));
  };
  // How far a bridge is out, 0..1: its timetable machine or a return plank.
  const bridgeLevel = (id) => Math.max(timetable.machineStatus(id)?.level ?? 0, returnLevel(id));

  const bridgeUnder = (x, z) => {
    if (z > BELL_ARENA.gapNearZ || z < BELL_ARENA.gapFarZ) return null;
    for (const [id, bx] of Object.entries(BELL_ARENA.bridges)) {
      if (bridgeLevel(id) >= 0.85 && Math.abs(x - bx) <= BELL_ARENA.bridgeHalfWidth) return id;
    }
    return null;
  };
  const anyBridgeOut = () => Object.keys(BELL_ARENA.bridges).some((id) => bridgeLevel(id) >= 0.85);

  // Standing over the gap with no extended bridge underfoot: Butch falls.
  const fallsAt = (x, z) => z <= BELL_ARENA.gapNearZ && z >= BELL_ARENA.gapFarZ && !bridgeUnder(x, z);
  const onFrontPlatform = (z) => z < BELL_ARENA.gapFarZ;
  // On the far roof with no way back: no bridge out, and no lit Conductor
  // still waiting for a punch there.
  const stranded = (z) => onFrontPlatform(z) && !anyBridgeOut() && !(exposure && !exposure.punched && lit(exposure.lane));
  // The bridge closest to x (a return plank goes where the player is).
  const nearestBridge = (x) => Object.entries(BELL_ARENA.bridges).sort((a, b) => Math.abs(a[1] - x) - Math.abs(b[1] - x))[0][0];
  // `full`: laid under a rider, it is out already (no slide-out dip).
  const extendReturnBridge = (id, ms = RETURN_PLANK_MS, { full = false } = {}) => {
    if (!BELL_ARENA.bridges[id]) return false;
    returns.set(id, { age: full ? Math.max(RETURN_PLANK_TRAVEL_MS, returns.get(id)?.age ?? 0) : (returns.get(id)?.age ?? 0), left: ms });
    return true;
  };

  const nearestNode = (x, z, reach = BELL_ARENA.nodeReach) => {
    let best = null;
    for (const node of BELL_ARENA.nodes) {
      const d = Math.hypot(node.x - x, node.z - z);
      if (d <= reach && (!best || d < best.d)) best = { node, d };
    }
    return best?.node ?? null;
  };

  // E on the front platform, in the lit lane, while the Conductor is lit:
  // the borrowed light goes back to him. Once per window.
  const punchConductor = (x, z) => {
    if (!onFrontPlatform(z)) return { result: 'not-front' };
    if (!exposure || !lit(exposure.lane)) return { result: 'not-lit' };
    if (laneOf(x) !== exposure.lane) return { result: 'wrong-lane', lane: exposure.lane };
    if (exposure.punched) return { result: 'spent' };
    exposure.punched = true;
    return { result: 'hit', damage: LIGHT_DAMAGE, lane: exposure.lane };
  };

  return {
    timetable,
    update,
    punch: (nodeId) => timetable.punch(nodeId),
    preview: () => ({ machines: timetable.preview(), conductorLane: plan.lane, beamLanes: [...plan.beamLanes], fullSweep: plan.fullSweep }),
    resolveBeam,
    shelteredBy,
    bridgeUnder,
    bridgeLevel,
    anyBridgeOut,
    fallsAt,
    onFrontPlatform,
    stranded,
    nearestBridge,
    extendReturnBridge,
    returnPlanks: () => [...returns.keys()],
    // Milliseconds a return plank has left before it is gone (0: none).
    returnLeft: (id) => Math.max(0, returns.get(id)?.left ?? 0),
    nearestNode,
    punchConductor,
    clearQueue: () => timetable.clearQueue(),
    setBeams(on) {
      const was = beamsOn;
      beamsOn = Boolean(on);
      if (!beamsOn) { plan = { ...plan, beamLanes: [], fullSweep: false }; beam = null; } else if (!was) { const lane = plan.lane; plan = { ...planFor(round + 1, conductorLane), lane }; }
    },
    // Set how many lanes his beams take and how often they sweep all three
    // (0: never), from the next plan on (`replan`: the coming bell too; his
    // announced lane is kept).
    setPressure({ beamLanes = pressure.beamLanes, fullSweepEvery = pressure.fullSweepEvery, replan = false } = {}) {
      pressure.beamLanes = beamLanes;
      pressure.fullSweepEvery = fullSweepEvery;
      if (replan) { const lane = plan.lane; plan = { ...planFor(round + 1, conductorLane), lane }; }
      return { ...pressure };
    },
    get pressure() { return { ...pressure }; },
    msSinceBell: () => BELL_MS - timetable.msToBell(),
    get beamsOn() { return beamsOn; },
    get conductorLane() { return conductorLane; },
    get plan() { return { ...plan, beamLanes: [...plan.beamLanes] }; },
    get exposure() { return exposure ? { ...exposure } : null; },
    get beam() { return beam ? { ...beam, lanes: [...beam.lanes] } : null; },
    get round() { return round; },
    lit,
    msToBell: () => timetable.msToBell(),
    bellPhase: () => timetable.bellPhase(),
    snapshot: () => ({ ...timetable.snapshot(), conductorLane, plan: { ...plan }, exposure: exposure ? { ...exposure } : null, beam: beam ? { ...beam } : null, round }),
  };
}

// ---------------------------------------------------------------------------
// Movement II · how the bell is taught (alpha round 4: bridge, signal, his
// next lane, "both before one bell" and "cross the gap and punch" came five
// in a row, under two stacked banners, and players fell into the gap).
//
// One step per bell, each with one hint naming one action:
//   bridge      punch the AMBER lamp            → its bridge crosses on the bell
//   lamp        punch the ROSE signal in his    → he steps into its light on
//               next lane (named)                 the bell (a signal in the
//                                                 wrong lane says so at once;
//                                                 a bell that passes without
//                                                 lighting him names the new
//                                                 lane)
//   punch       he is lit: the bell WAITS        → cross (a plank is laid if
//               (the arena clock holds) until     no bridge is out) and punch
//               the punch
//   combo       the real rule, beams still off: both before one bell
//   done        the beams fire on the off-beat
// Until `done` the street gap is a railing (no falls while learning) and the
// bell runs slower (BELL_TUTORIAL_TIME_SCALE).

export const BELL_TUTORIAL_TIME_SCALE = Object.freeze({
  bridge: 0.7, 'bridge-wait': 0.7, lamp: 0.7, 'lamp-wait': 0.7, punch: 0.7, combo: 0.85, done: 1,
});
// The longest the bell waits for the first punch (it never soft-locks).
export const BELL_TUTORIAL_HOLD_S = 25;

const LEARNING = new Set(['bridge', 'bridge-wait', 'lamp', 'lamp-wait']);
const upper = (lane) => String(lane ?? '').toUpperCase();

export function createBellTutorial({ stage = 'bridge' } = {}) {
  let current = BELL_TUTORIAL_TIME_SCALE[stage] ? stage : 'bridge';
  let wrongLane = null;
  let held = 0;
  return {
    get stage() { return current; },
    get wrongLane() { return wrongLane; },
    get done() { return current === 'done'; },
    // No falls while learning: the gap edge holds Butch unless a bridge is under him.
    get gapIsRailing() { return current !== 'done'; },
    get beams() { return current === 'done'; },
    // A lamp was queued (or replaced). `lane` is a rose signal's lane,
    // `nextLane` the lane he steps into on the coming bell.
    queued({ line, lane = null, nextLane = null } = {}) {
      if (current === 'bridge' && line === 'amber') current = 'bridge-wait';
      else if ((current === 'lamp' || current === 'lamp-wait') && line === 'rose') {
        if (lane === nextLane) { current = 'lamp-wait'; wrongLane = null; } else { current = 'lamp'; wrongLane = lane; }
      }
      return current;
    },
    // A bridge reached the far roof.
    bridgeOut() {
      if (current === 'bridge' || current === 'bridge-wait') current = 'lamp';
      return current;
    },
    // A bell rang; `exposed` when it lit him.
    bell({ exposed = false } = {}) {
      wrongLane = null;
      if (current === 'lamp-wait' && !exposed) current = 'lamp';
      return current;
    },
    // He is lit. Returns what the line does for the learner.
    exposed({ bridgeOut = false } = {}) {
      if (LEARNING.has(current) || current === 'punch') {
        current = 'punch';
        held = 0;
        return { hold: true, plank: !bridgeOut, missingBridge: false };
      }
      if (current === 'combo') return { hold: false, plank: false, missingBridge: !bridgeOut };
      return { hold: false, plank: false, missingBridge: false };
    },
    // Should the arena's clock stand still this frame (the bell waits for
    // the first punch)? `dt` seconds of wall time; gives up after HOLD_S.
    holding({ lit = false, dt = 0 } = {}) {
      if (current !== 'punch' || !lit) return false;
      held += Math.max(0, dt);
      return held < BELL_TUTORIAL_HOLD_S;
    },
    exposureEnd() {
      if (current === 'punch') current = 'lamp';
      return current;
    },
    hit() {
      if (current === 'combo') current = 'done';
      else if (current !== 'done') current = 'combo';
      return current;
    },
    // After a lost movement: what was learned stays learned.
    afterDeath() {
      if (current !== 'done' && current !== 'combo') current = (current === 'bridge' || current === 'bridge-wait') ? 'bridge' : 'lamp';
      wrongLane = null;
      return current;
    },
    skip() { current = 'done'; wrongLane = null; return current; },
    timeScale() { return BELL_TUTORIAL_TIME_SCALE[current] ?? 1; },
    // The one hint line for this moment ('' for none). `lane`: his next
    // lane; `litLane`: the lane he is lit in (null when dark).
    hint({ lane = 'centre', litLane = null, bridgeOut = false, onFront = false, inLitLane = false } = {}) {
      const next = upper(lane);
      if (current === 'bridge') return 'PUNCH THE <kbd>AMBER</kbd> LAMP WITH <kbd>E</kbd> · ITS BRIDGE CROSSES THE GAP ON THE BELL';
      if (current === 'bridge-wait') return 'QUEUED · WATCH THE BRIDGE CROSS ON THE NEXT BELL';
      if (current === 'lamp') {
        return wrongLane
          ? `THAT IS THE ${upper(wrongLane)} SIGNAL · HE STEPS ${next} · PUNCH THE <kbd>ROSE</kbd> SIGNAL IN THE ${next} LANE`
          : `NOW THE <kbd>ROSE</kbd> SIGNAL IN THE ${next} LANE · HE STEPS INTO ITS LIGHT ON THE NEXT BELL`;
      }
      if (current === 'lamp-wait') return `QUEUED · ON THE BELL HE STEPS ${next}, INTO THE SIGNAL'S LIGHT`;
      if (current === 'punch') {
        if (!litLane) return `NOW THE <kbd>ROSE</kbd> SIGNAL IN THE ${next} LANE · HE STEPS INTO ITS LIGHT ON THE NEXT BELL`;
        if (!onFront) return 'HE IS LIT · THE BELL WAITS FOR YOU · CROSS THE BRIDGE TO HIM';
        return inLitLane ? '<kbd>E</kbd> · PUNCH HIM · THE BORROWED LIGHT GOES BACK' : `STEP INTO THE ${upper(litLane)} LANE · THEN <kbd>E</kbd>`;
      }
      if (current === 'combo') {
        if (litLane && bridgeOut) return onFront && inLitLane ? '<kbd>E</kbd> · PUNCH HIM' : `HE IS LIT · ${upper(litLane)} LANE · CROSS AND PUNCH`;
        return `BOTH BEFORE ONE BELL · AN <kbd>AMBER</kbd> BRIDGE + THE <kbd>ROSE</kbd> SIGNAL IN HIS NEXT LANE (${next})`;
      }
      return '';
    },
  };
}

// ---------------------------------------------------------------------------
// Movement III · ECHO CITY — the argument.
//
// Each exchange is a voiced Conductor claim, four facts and two voiced Butch
// answers (echoExchanges.js). Butch answers in two steps (round 6, item 17):
//
//   facts    pick two of the four (pickFact toggles; a third pick lets the
//            oldest go), then confirmFacts(). Both true things: on to the
//            framing. A misreading: the Conductor answers it from the record
//            (`rebut`), that fact is struck, and the exchange is deflected.
//   framing  choose() one of the two answers. The one that holds both truths
//            opens a real attack window; the other is deflected.
//
// A deflected exchange goes to the back of the queue, and what was worked
// out stays worked out (round 6, item 16): a struck fact stays struck, true
// facts once found are kept (the exchange comes back straight at the
// framing) and a deflected answer stays struck. `returning` tells the stage
// not to replay the claim it has already heard. Each step resolves once: a
// second key press on a resolved exchange is ignored (the old verse-spam
// bug), and the queue never runs dry.

export const ECHO_WINDOW_SECONDS = 4.6;
export const ECHO_WINDOW_DAMAGE = 25;
export const ECHO_FACTS_TO_PICK = 2;

function checkExchange(exchange) {
  const id = exchange?.id ?? '?';
  if (exchange?.replies?.length !== 2) throw new Error(`echo debate: exchange ${id} needs two replies`);
  if (exchange.replies.filter((reply) => reply.holdsBoth).length !== 1) throw new Error(`echo debate: exchange ${id} needs one answer that holds both`);
  const facts = exchange.facts ?? [];
  if (facts.length < 3) throw new Error(`echo debate: exchange ${id} needs at least three facts`);
  if (facts.filter((entry) => entry.holds).length !== ECHO_FACTS_TO_PICK) throw new Error(`echo debate: exchange ${id} needs exactly two true things`);
  facts.filter((entry) => !entry.holds).forEach((entry) => { if (!entry.rebut) throw new Error(`echo debate: ${id}/${entry.id} needs a rebuttal`); });
}

export function createEchoDebate(exchanges) {
  if (!Array.isArray(exchanges) || !exchanges.length) throw new Error('echo debate: no exchanges');
  exchanges.forEach(checkExchange);
  const queue = exchanges.map((_, index) => index);
  // What has been worked out per exchange; nothing here is ever undone.
  const memory = new Map(exchanges.map((exchange) => [exchange.id, { seen: false, struck: new Set(), known: false, struckReplies: new Set(), landed: false }]));
  let current = null;
  let opened = 0;
  const history = [];
  const factAt = (ref) => (Number.isInteger(ref) ? current.facts[ref] : current.facts.find((entry) => entry.id === ref)) ?? null;
  const truths = (exchange) => exchange.facts.filter((entry) => entry.holds).map((entry) => entry.id);
  const deflect = () => {
    current.resolved = true;
    queue.shift();
    queue.push(current.index);
  };
  const view = () => {
    if (!current) return null;
    const m = memory.get(current.id);
    return Object.assign(current, { struck: [...m.struck], struckReplies: [...m.struckReplies] });
  };
  return {
    open() {
      if (current && !current.resolved) return current;
      // Only a debug jump past the window can empty it: deal the unlanded again.
      if (!queue.length) exchanges.forEach((exchange, index) => { if (!memory.get(exchange.id).landed) queue.push(index); });
      if (!queue.length) exchanges.forEach((_, index) => queue.push(index));
      const index = queue[0];
      const exchange = exchanges[index];
      const m = memory.get(exchange.id);
      opened += 1;
      const returning = m.seen;
      m.seen = true;
      current = {
        index, id: exchange.id, exchange, replies: exchange.replies, facts: exchange.facts,
        step: m.known ? 'framing' : 'facts', picked: m.known ? truths(exchange) : [], returning, resolved: false, choice: null,
        struck: [], struckReplies: [],
      };
      return view();
    },
    // Toggle a fact by its index (0-based) or id.
    pickFact(ref) {
      if (!current || current.resolved || current.step !== 'facts') return { result: 'ignored' };
      const entry = factAt(ref);
      if (!entry) return { result: 'ignored' };
      if (memory.get(current.id).struck.has(entry.id)) return { result: 'struck', fact: entry };
      if (current.picked.includes(entry.id)) {
        current.picked = current.picked.filter((id) => id !== entry.id);
        return { result: 'unpicked', fact: entry, picked: [...current.picked] };
      }
      let dropped = null;
      if (current.picked.length >= ECHO_FACTS_TO_PICK) [dropped] = current.picked.splice(0, 1);
      current.picked.push(entry.id);
      return { result: 'picked', fact: entry, dropped, picked: [...current.picked] };
    },
    confirmFacts() {
      if (!current || current.resolved || current.step !== 'facts') return { result: 'ignored' };
      if (current.picked.length !== ECHO_FACTS_TO_PICK) return { result: 'need-two', picked: [...current.picked] };
      const chosen = current.picked.map((id) => factAt(id));
      const wrong = chosen.find((entry) => !entry.holds);
      const m = memory.get(current.id);
      if (!wrong) {
        m.known = true;
        current.step = 'framing';
        history.push({ exchangeId: current.id, step: 'facts', facts: [...current.picked], result: 'hold' });
        return { result: 'hold', exchangeId: current.id, facts: chosen };
      }
      // The Conductor answers the first misreading; only that one is struck.
      m.struck.add(wrong.id);
      deflect();
      history.push({ exchangeId: current.id, step: 'facts', facts: [...current.picked], result: 'misread', fact: wrong.id });
      view();
      return { result: 'misread', exchangeId: current.id, fact: wrong, rebut: wrong.rebut, facts: chosen };
    },
    // The framing: which of the two answers Butch says.
    choose(choice) {
      if (!current || current.resolved || current.step !== 'framing') return { result: 'ignored' };
      const reply = current.replies[choice];
      const m = memory.get(current.id);
      if (!reply || m.struckReplies.has(choice)) return { result: 'ignored' };
      current.choice = choice;
      if (reply.holdsBoth) {
        current.resolved = true;
        queue.shift();
        m.landed = true;
      } else {
        m.struckReplies.add(choice);
        deflect();
      }
      const outcome = { result: reply.holdsBoth ? 'window' : 'deflected', exchangeId: current.id, choice, reply };
      history.push({ exchangeId: current.id, step: 'framing', choice, result: outcome.result });
      view();
      return outcome;
    },
    // The answers still open to Butch in the framing step (indices).
    openReplies() {
      if (!current) return [];
      const m = memory.get(current.id);
      return current.replies.map((_, index) => index).filter((index) => !m.struckReplies.has(index));
    },
    get current() { return current; },
    get isOpen() { return Boolean(current && !current.resolved); },
    get step() { return current && !current.resolved ? current.step : null; },
    get opened() { return opened; },
    history: () => history.map((entry) => ({ ...entry })),
    remaining: () => queue.length,
    landed: () => exchanges.filter((exchange) => memory.get(exchange.id).landed).map((exchange) => exchange.id),
    memory: (id) => {
      const m = memory.get(id);
      return m ? { seen: m.seen, struck: [...m.struck], known: m.known, struckReplies: [...m.struckReplies], landed: m.landed } : null;
    },
  };
}

// ---------------------------------------------------------------------------
// Movement IV · PAINTED COUNTRY — a returned colour scales with its charge.
//
// The movement drains 88 of his ticket (100 → 12, where the night service
// arrives). Round 11: a return lands only in the open beat after a wash
// (movements/paintedCountry.js), and each of the three phases stops at its
// floor, so one return can no longer end a phase: one colour is 7, a full
// brush 24 (more than three single colours: holding a heavier brush pays),
// and a phase takes about two open windows.
export const PAINT_MOVEMENT_DRAIN = 88;
export const PAINT_DAMAGE_BY_CHARGE = Object.freeze([0, 7, 15, 24]);

export function paintReturnDamage(charge) {
  const index = Math.max(0, Math.min(PAINT_DAMAGE_BY_CHARGE.length - 1, Math.floor(Number(charge) || 0)));
  return PAINT_DAMAGE_BY_CHARGE[index];
}

// ---------------------------------------------------------------------------
// HUD · world-anchored tags never sit on one another (alpha round 2: in
// Movement I a case's claim tag covered the SPACE · RETURN prompt beside it).
//
// A tag is drawn centred on x with its bottom edge on y (.nf-tag). Its box
// is estimated from the text (13 px mono, 0.12em tracking, 34 px of padding
// and point). Tags are placed in priority order; one that would overlap a
// placed tag is lifted a row at a time until it is clear.

export const TAG_ROW_PX = 30;
const TAG_CHAR_PX = 9.4;
const TAG_PAD_PX = 34;
const TAG_HEIGHT_PX = 26;

export function tagWidth(text) {
  const visible = String(text).replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, '_');
  return TAG_PAD_PX + visible.length * TAG_CHAR_PX;
}

export function spreadWorldTags(tags, { rowPx = TAG_ROW_PX, maxLift = 6, gap = 4 } = {}) {
  const order = tags.map((tag, index) => ({ ...tag, index, priority: tag.priority ?? 0 }))
    .sort((a, b) => (b.priority - a.priority) || (b.y - a.y) || (a.index - b.index));
  const placed = [];
  const boxOf = (tag, y) => {
    const half = tagWidth(tag.text) / 2;
    return { left: tag.x - half, right: tag.x + half, top: y - TAG_HEIGHT_PX, bottom: y };
  };
  const hits = (a, b) => a.left < b.right + gap && b.left < a.right + gap && a.top < b.bottom + gap && b.top < a.bottom + gap;
  for (const tag of order) {
    let y = tag.y;
    for (let lift = 0; lift < maxLift && placed.some((other) => hits(boxOf(tag, y), other.box)); lift += 1) y -= rowPx;
    placed.push({ ...tag, y, box: boxOf(tag, y) });
  }
  return placed.sort((a, b) => a.index - b.index).map(({ box, index, ...tag }) => tag);
}
