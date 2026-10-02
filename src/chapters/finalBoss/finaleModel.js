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

export const DIFFICULTIES = Object.freeze({
  story: Object.freeze({
    id: 'story', label: 'STORY', layers: 6, telegraph: 1.35, beat: 3.05, overlap: 1,
    bossWindow: 1.5, speedScale: 0.82, respawnInv: 3, beamLanes: 1, fullSweepEvery: 0,
    lampMs: 3000, bridgeMs: 6400, boardMs: 3600,
  }),
  normal: Object.freeze({
    id: 'normal', label: 'NORMAL', layers: 4, telegraph: 0.9, beat: 2.2, overlap: 2,
    bossWindow: 1.08, speedScale: 0.94, respawnInv: 2.6, beamLanes: 2, fullSweepEvery: 3,
    lampMs: 2400, bridgeMs: 5200, boardMs: 3400,
  }),
});

export const DEFAULT_DIFFICULTY = 'normal';

export function difficultyPreset(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
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
export const LIGHT_DAMAGE = 25;
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
  nodes: Object.freeze([
    Object.freeze({ id: 'lamp-west', line: 'rose', machine: 'lamp-west', x: -7, z: 0.4, label: 'SIGNAL · WEST' }),
    Object.freeze({ id: 'lamp-centre', line: 'rose', machine: 'lamp-centre', x: 0, z: 0.4, label: 'SIGNAL · CENTRE' }),
    Object.freeze({ id: 'lamp-east', line: 'rose', machine: 'lamp-east', x: 7, z: 0.4, label: 'SIGNAL · EAST' }),
    Object.freeze({ id: 'bridge-west', line: 'amber', machine: 'bridge-west', x: -3.6, z: 3.1, label: 'BRIDGE · WEST' }),
    Object.freeze({ id: 'bridge-east', line: 'amber', machine: 'bridge-east', x: 3.6, z: 3.1, label: 'BRIDGE · EAST' }),
    Object.freeze({ id: 'board-west', line: 'teal', machine: 'board-west', x: -11.2, z: 5.2, label: 'BILLBOARD · WEST' }),
    Object.freeze({ id: 'board-east', line: 'teal', machine: 'board-east', x: 11.2, z: 5.2, label: 'BILLBOARD · EAST' }),
  ]),
  nodeReach: 2.3,
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
    const full = beamsOn && preset.fullSweepEvery > 0 && index > 2 && index % preset.fullSweepEvery === 0;
    const count = !beamsOn ? 0 : full ? 3 : preset.beamLanes;
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

  const update = (dtMs) => {
    const out = [];
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
  const extendReturnBridge = (id, ms = RETURN_PLANK_MS) => {
    if (!BELL_ARENA.bridges[id]) return false;
    returns.set(id, { age: returns.get(id)?.age ?? 0, left: ms });
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

  // Space on the front platform, in the lit lane, while the Conductor is lit:
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
    nearestNode,
    punchConductor,
    clearQueue: () => timetable.clearQueue(),
    setBeams(on) { beamsOn = Boolean(on); if (!beamsOn) { plan = { ...plan, beamLanes: [], fullSweep: false }; beam = null; } },
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
// Movement III · ECHO CITY — the argument.
//
// Each exchange is a voiced Conductor claim and two voiced Butch answers. The
// answer that holds two true things at once opens a real attack window; the
// other is deflected by the Conductor's rebuttal and the exchange goes to the
// back of the queue. choose() resolves an exchange exactly once: a second key
// press on the same exchange is ignored (the old verse-spam bug).

export const ECHO_WINDOW_SECONDS = 4.6;
export const ECHO_WINDOW_DAMAGE = 25;

export function createEchoDebate(exchanges) {
  if (!Array.isArray(exchanges) || !exchanges.length) throw new Error('echo debate: no exchanges');
  const queue = exchanges.map((_, index) => index);
  let current = null;
  let opened = 0;
  const history = [];
  return {
    open() {
      if (current && !current.resolved) return current;
      const index = queue[0];
      const exchange = exchanges[index];
      if (exchange.replies?.length !== 2) throw new Error(`echo debate: exchange ${exchange.id} needs two replies`);
      opened += 1;
      current = { index, id: exchange.id, exchange, replies: exchange.replies, resolved: false, choice: null };
      return current;
    },
    choose(choice) {
      if (!current || current.resolved) return { result: 'ignored' };
      const reply = current.replies[choice];
      if (!reply) return { result: 'ignored' };
      current.resolved = true;
      current.choice = choice;
      queue.shift();
      if (!reply.holdsBoth) queue.push(current.index);
      const outcome = { result: reply.holdsBoth ? 'window' : 'deflected', exchangeId: current.id, choice, reply };
      history.push({ exchangeId: current.id, choice, result: outcome.result });
      return outcome;
    },
    get current() { return current; },
    get isOpen() { return Boolean(current && !current.resolved); },
    get opened() { return opened; },
    history: () => history.map((entry) => ({ ...entry })),
    remaining: () => queue.length,
  };
}

// ---------------------------------------------------------------------------
// Movement IV · PAINTED COUNTRY — a returned colour scales with its charge.
//
// The movement drains 88 of his ticket (100 → 12, where the night service
// arrives). At 8 a colour that took ~11 single returns, ~10 minutes for a
// first-time player (alpha R4-5). Now one colour is 16 (six single returns),
// a full brush 52 (two), so a first run lands in 5–8 minutes and holding a
// fuller brush still pays: 3 colours cut deeper than three single returns.
export const PAINT_MOVEMENT_DRAIN = 88;
export const PAINT_DAMAGE_BY_CHARGE = Object.freeze([0, 16, 34, 52]);

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
