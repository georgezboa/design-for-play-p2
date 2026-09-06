// Chapter 3 // ECHO CITY — pure ISOMETRIC chapter model (Kimi rebuild).
//
// Authoritative spec: docs/CHAPTER_03_KIMI_ISOMETRIC_ECHO_CITY_WORK_PACKAGE.md
//
// This model replaces the horizontal world/lane assumptions of the preserved
// echoCityModel.js (kept untouched as engineering evidence) while preserving
// Qwen's deterministic contracts:
//   - ECHO_CYCLES semantic cycle data + cycleStepAt() phase lookup (imported);
//   - receiver contract: acceptedTags / installedCycleId / resultState /
//     compatible / releasable; wrong-but-eligible transplants produce visible,
//     reversible results — never silent refusals;
//   - resonance modes: idle | observing | carrying | linking | recording |
//     previewing;
//   - FIFO events via drainEvents(); deterministic reset(); JSON-safe
//     snapshot() consumed by window.render_game_to_text();
//   - no Phaser, no DOM, no performance.now()/Date.now(), no Math.random;
//     all time flows through update(dtMs, input).
//
// Spatial form: one fixed-camera civic block arranged around a central clock.
// Movement is click-to-move over an authored waypoint graph whose long authored
// legs are deterministically subdivided for faithful pointer snapping, with
// deterministic shortest-path search. Districts loop back through the clock:
// TRAIN (south) -> LIVING MARKET (west) -> CENTRAL CLOCK -> TRANSIT
// INTERSECTION (north) -> surveillance field crossing -> SILENT FOUNTAIN
// (east) -> witness gate -> Mara.

import { ECHO_CYCLES, cycleStepAt } from './echoCityModel.js';

// ---------------------------------------------------------------------------
// Waypoint graph — world units are meters; X east, Y north. The layout mirrors
// the Blender blockout (work/echo-city-isometric/blender/build_blockout.py).
// ---------------------------------------------------------------------------

export const DISTRICTS = Object.freeze({
  TRAIN: Object.freeze({ id: 'TRAIN', name: 'TRAIN THRESHOLD', checkpoint: 't_door' }),
  MARKET: Object.freeze({ id: 'MARKET', name: 'LIVING MARKET', checkpoint: 'm_entry' }),
  CLOCK: Object.freeze({ id: 'CLOCK', name: 'CENTRAL CLOCK', checkpoint: 'c_s' }),
  TRANSIT: Object.freeze({ id: 'TRANSIT', name: 'TRANSIT INTERSECTION', checkpoint: 'tr_s' }),
  FOUNTAIN: Object.freeze({ id: 'FOUNTAIN', name: 'SILENT FOUNTAIN', checkpoint: 'f_w' }),
});

// gate: edge is impassable until the named gate opens.
// field: edge crosses the surveillance field (flag risk while unsafe).
const BASE_NODES = Object.freeze([
  // central clock ring (radius 7)
  { id: 'c_n', x: 0, y: 7, d: 'CLOCK' },
  { id: 'c_ne', x: 5, y: 5, d: 'CLOCK' },
  { id: 'c_e', x: 7, y: 0, d: 'CLOCK' },
  { id: 'c_se', x: 5, y: -5, d: 'CLOCK' },
  { id: 'c_s', x: 0, y: -7, d: 'CLOCK' },
  { id: 'c_sw', x: -5, y: -5, d: 'CLOCK' },
  { id: 'c_w', x: -7, y: 0, d: 'CLOCK' },
  { id: 'c_nw', x: -5, y: 5, d: 'CLOCK' },
  // train threshold (south)
  { id: 't_door', x: 0, y: -17, d: 'TRAIN' },
  { id: 't_plat', x: 0, y: -13.5, d: 'TRAIN' },
  { id: 't_sw', x: -6.5, y: -13, d: 'TRAIN' },
  // living market (west)
  { id: 'm_entry', x: -12, y: -9.5, d: 'MARKET' },
  { id: 'm_plaza', x: -16, y: -4.5, d: 'MARKET' },
  { id: 'm_group', x: -15.8, y: -7.2, d: 'MARKET' },
  { id: 'm_stalls', x: -19.5, y: 0, d: 'MARKET' },
  { id: 'm_east', x: -15, y: 0.5, d: 'MARKET' },
  { id: 'm_gateE', x: -10.5, y: 0.5, d: 'MARKET' },
  { id: 'm_north', x: -16, y: 5, d: 'MARKET' },
  // transit intersection (north)
  { id: 'tr_s', x: 0, y: 10, d: 'TRANSIT' },
  { id: 'tr_bus', x: -2.5, y: 17.5, d: 'TRANSIT' },
  { id: 'tr_e', x: 4, y: 14.5, d: 'TRANSIT' },
  { id: 'tr_ne', x: 8, y: 12.5, d: 'TRANSIT' },
  // silent fountain (east) — ring around the basin
  { id: 'f_nw', x: 14.8, y: 5.5, d: 'FOUNTAIN' },
  { id: 'f_n', x: 20, y: 6.5, d: 'FOUNTAIN' },
  { id: 'f_ne', x: 24.5, y: 3, d: 'FOUNTAIN' },
  { id: 'f_pad', x: 25.4, y: -1.2, d: 'FOUNTAIN' },
  { id: 'f_bell', x: 23.6, y: -4.6, d: 'FOUNTAIN' },
  { id: 'f_s', x: 20, y: -6.5, d: 'FOUNTAIN' },
  { id: 'f_mark', x: 15.2, y: -5, d: 'FOUNTAIN' },
  { id: 'f_w', x: 13.8, y: -0.5, d: 'FOUNTAIN' },
]);

const BASE_EDGES = Object.freeze([
  // clock ring
  ['c_n', 'c_ne'], ['c_ne', 'c_e'], ['c_e', 'c_se'], ['c_se', 'c_s'],
  ['c_s', 'c_sw'], ['c_sw', 'c_w'], ['c_w', 'c_nw'], ['c_nw', 'c_n'],
  // train -> market (the only way in: the authored route passes the courier)
  ['t_door', 't_plat'], ['t_plat', 't_sw'], ['t_sw', 'm_entry'],
  // market
  ['m_entry', 'm_plaza'], ['m_plaza', 'm_group'], ['m_plaza', 'm_stalls'],
  ['m_stalls', 'm_north'], ['m_stalls', 'm_east'], ['m_east', 'm_group'],
  // market gate: the only route from the market to the clock ring
  { a: 'm_gateE', b: 'c_w', gate: 'market' }, ['m_east', 'm_gateE'],
  // clock -> transit
  ['c_n', 'tr_s'],
  // transit
  ['tr_s', 'tr_bus'], ['tr_s', 'tr_e'], ['tr_bus', 'tr_e'], ['tr_e', 'tr_ne'],
  // the surveillance-field crossing: the ONLY route to the fountain
  { a: 'tr_ne', b: 'f_nw', field: true },
  // fountain ring
  ['f_nw', 'f_n'], ['f_n', 'f_ne'], ['f_ne', 'f_pad'], ['f_pad', 'f_bell'],
  ['f_bell', 'f_s'], ['f_s', 'f_mark'], ['f_mark', 'f_w'], ['f_w', 'f_nw'],
]);

// Normalize the authored edges once. Pointer movement projects onto these full
// segments, so the visible paving can be continuous without changing the named
// waypoint/checkpoint contract used by reset, WASD, and the golden path.
const NODES = BASE_NODES;
const EDGES = Object.freeze(BASE_EDGES.map((raw) => Object.freeze({
  a: Array.isArray(raw) ? raw[0] : raw.a,
  b: Array.isArray(raw) ? raw[1] : raw.b,
  gate: Array.isArray(raw) ? null : (raw.gate ?? null),
  field: Array.isArray(raw) ? false : !!raw.field,
})));

// Broad civic courts are intentionally walkable, not merely decorative. The
// edge graph remains the deterministic routing spine (and owns gates/field
// crossings), while these areas let ordinary point-and-click movement end at
// the exact place the player selected. Landmark footprints are cut out as
// holes so the clock and fountain remain physical obstacles.
const WALKABLE_AREAS = Object.freeze([
  Object.freeze({
    id: 'train-court', x0: -10.5, x1: 10.5, y0: -22.5, y1: -10,
    nodes: Object.freeze(['t_door', 't_plat', 't_sw']), holes: Object.freeze([]),
  }),
  Object.freeze({
    id: 'market-court', x0: -27, x1: -7.5, y0: -11.5, y1: 11,
    nodes: Object.freeze(['m_entry', 'm_plaza', 'm_group', 'm_stalls', 'm_east', 'm_gateE', 'm_north']),
    holes: Object.freeze([]),
  }),
  Object.freeze({
    id: 'clock-court', x0: -10, x1: 10, y0: -10, y1: 10,
    nodes: Object.freeze(['c_n', 'c_ne', 'c_e', 'c_se', 'c_s', 'c_sw', 'c_w', 'c_nw']),
    holes: Object.freeze([Object.freeze({ x: 0, y: 0, r: 4.15 })]),
  }),
  Object.freeze({
    id: 'transit-court', x0: -9.5, x1: 13.5, y0: 7.5, y1: 23,
    nodes: Object.freeze(['tr_s', 'tr_bus', 'tr_e', 'tr_ne']), holes: Object.freeze([]),
  }),
  Object.freeze({
    id: 'fountain-court', x0: 11.5, x1: 29, y0: -10, y1: 10,
    nodes: Object.freeze(['f_nw', 'f_n', 'f_ne', 'f_pad', 'f_bell', 'f_s', 'f_mark', 'f_w']),
    holes: Object.freeze([Object.freeze({ x: 20, y: 0, r: 4.1 })]),
  }),
]);

// ---------------------------------------------------------------------------
// Interactables — sources, receivers, record mark, bell, pads, Mara.
// ---------------------------------------------------------------------------

export const ISO_POINTS = Object.freeze({
  // sources
  courier: Object.freeze({ kind: 'source', id: 'courier', node: 'm_stalls', r: 5.0, cycleId: 'courier-loop' }),
  bus: Object.freeze({ kind: 'source', id: 'bus', x: -2.8, y: 19, r: 3.4, cycleId: 'bus-service' }),
  crosswalk: Object.freeze({ kind: 'source', id: 'crosswalk', x: 4, y: 15.5, r: 2.6, cycleId: 'crosswalk-signal' }),
  // receivers
  'market-group': Object.freeze({ kind: 'receiver', id: 'market-group', x: -16.5, y: -7, r: 2.8, acceptedTags: ['pattern'], releasable: false, district: 'MARKET' }),
  'shutter-controller': Object.freeze({ kind: 'receiver', id: 'shutter-controller', x: -13, y: 3.4, r: 3.6, acceptedTags: ['open'], releasable: true, district: 'MARKET' }),
  barrier: Object.freeze({ kind: 'receiver', id: 'barrier', x: 8.4, y: 11.4, r: 2.6, acceptedTags: ['open'], releasable: true, district: 'TRANSIT' }),
  crowd: Object.freeze({ kind: 'receiver', id: 'crowd', x: 4.2, y: 15, r: 2.8, acceptedTags: ['walk'], releasable: true, district: 'TRANSIT' }),
  // fountain instruments
  'record-mark': Object.freeze({ kind: 'record', id: 'record-mark', x: 15.2, y: -5, r: 1.6 }),
  bell: Object.freeze({ kind: 'bell', id: 'bell', x: 24.5, y: -5, r: 1.7 }),
  'pad-butch': Object.freeze({ kind: 'pad', id: 'pad-butch', x: 25.4, y: -1.2, r: 1.3 }),
  mara: Object.freeze({ kind: 'mara', id: 'mara', x: 30.5, y: 0.5, r: 5.5 }),
});

// Courier triangle around the two market stalls: home -> handoff -> return.
export const COURIER_PATH = Object.freeze({
  home: Object.freeze({ x: -16, y: -4.5 }),
  deliver: Object.freeze({ x: -19.6, y: 4.6 }),
  // east-side return vertex makes the loop visibly triangular
  via: Object.freeze({ x: -14.2, y: 0.4 }),
});

// Surveillance field: rotated rectangle, center (11.4, 9.1), rot -35 deg.
export const FIELD = Object.freeze({ cx: 11.4, cy: 9.1, rot: -35 * Math.PI / 180, hx: 4.6, hy: 3.1 });

// ---------------------------------------------------------------------------
// Tuning.
// ---------------------------------------------------------------------------

export const ISO_DEFAULTS = Object.freeze({
  playerStart: Object.freeze({ node: 't_door' }),
  walkSpeed: 3.2, // one district (~12m) in 3-5s
  interactRadius: 2.4, // how close the player must be to use an interactable
  observeSlack: 3.0, // extra source radius: a cycle is observed, not touched
  hoverRadiusPad: 0.9,
  exactLegMax: 3.2, // retained for backwards-compatible config snapshots
  walkableSnapRadius: 2.65, // rendered paving half-width plus a small pointer grace

  gateOpenDelayMs: 1400,
  fieldWarnMs: 700,
  fieldFlagMs: 1400,
  fieldFreezeMs: 350,

  recordWindowMs: 16000,
  recordMaxLegs: 3,
  recordMinLegs: 2,
  recordMinLegDist: 1.2,
  shareInteractHoldMs: 800,
  shareGateOpenMs: 700,
  reunionHoldMs: 600,
  maraCrossSpeed: 2.6,
});

// ---------------------------------------------------------------------------
// Small pure helpers.
// ---------------------------------------------------------------------------

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

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

function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

function facingFromDelta(dx, dy) {
  // 8-way facing, degrees snapped to 45; 0 = east, 90 = north.
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return null;
  const ang = Math.atan2(dy, dx) * 180 / Math.PI;
  return ((Math.round(ang / 45) * 45) % 360 + 360) % 360;
}

function pointInField(x, y) {
  const c = Math.cos(-FIELD.rot); const s = Math.sin(-FIELD.rot);
  const dx = x - FIELD.cx; const dy = y - FIELD.cy;
  const lx = dx * c - dy * s; const ly = dx * s + dy * c;
  return Math.abs(lx) <= FIELD.hx && Math.abs(ly) <= FIELD.hy;
}

function segIntersectsField(ax, ay, bx, by) {
  // sampled segment-vs-rotated-rect (segments here are <= ~11m; 24 samples)
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    if (pointInField(ax + (bx - ax) * t, ay + (by - ay) * t)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The model.
// ---------------------------------------------------------------------------

export function createEchoCityIsoModel(config = {}) {
  const cfg = { ...ISO_DEFAULTS, ...config };

  const nodeById = {};
  for (const n of NODES) nodeById[n.id] = n;

  // adjacency: id -> [{ to, gate, field, len }]
  const adj = {};
  for (const n of NODES) adj[n.id] = [];
  for (const e of EDGES) {
    const a = Array.isArray(e) ? e[0] : e.a;
    const b = Array.isArray(e) ? e[1] : e.b;
    const gate = Array.isArray(e) ? null : (e.gate ?? null);
    const field = Array.isArray(e) ? false : !!e.field;
    const len = dist(nodeById[a].x, nodeById[a].y, nodeById[b].x, nodeById[b].y);
    adj[a].push({ to: b, gate, field, len });
    adj[b].push({ to: a, gate, field, len });
  }

  // Mutable state — everything rebuilt by initState() so reset() is exact.
  let elapsedMs = 0;
  let destroyed = false;
  let events = [];
  let lastEvent = null;

  let district = 'TRAIN';
  let checkpointNode = DISTRICTS.TRAIN.checkpoint;
  let complete = false;
  let reunion = false;
  let demoSeen = false;
  let breatherSeen = false;
  let alarmRaised = false;

  let player = null;
  let hover = null;
  let queued = null; // { action, targetId } fired on arrival
  let pendingAction = null; // press buffered during the 300ms linking flash
  let resonance = null;
  let receivers = null;
  let mara = null;
  let env = null;
  let courier = null; // visual-only lone walker replaced by courier loop trace
  let echo = null;
  let share = null;

  function pushEvent(type, payload) {
    const ev = { type, t: round(elapsedMs), payload: clone(payload ?? {}) };
    events.push(ev);
    lastEvent = ev;
  }

  function initState() {
    elapsedMs = 0;
    district = 'TRAIN';
    checkpointNode = DISTRICTS.TRAIN.checkpoint;
    complete = false;
    reunion = false;
    demoSeen = false;
    breatherSeen = false;
    alarmRaised = false;
    events = [];
    lastEvent = null;
    const start = nodeById[cfg.playerStart.node];
    player = {
      x: start.x, y: start.y,
      node: start.id,
      route: [], // node ids remaining
      exact: null, // { x, y } final off-node leg target
      facing: 90,
      moving: false,
      frozenMsLeft: 0,
      locked: false,
    };
    hover = { x: null, y: null, kind: null, id: null };
    queued = null;
    pendingAction = null;
    resonance = {
      mode: 'idle',
      sourceId: null,
      receiverId: null,
      carriedCycleId: null,
      observeMs: 0,
      observeInput: null, // 'mouse' | 'key'
      linkingMsLeft: 0,
      record: null, // { msLeft, legs: [{x1,y1,x2,y2,dist,durMs}], bell, legStart:{x,y}, legMs }
      recordedSteps: null,
      previewMs: 0,
      previewTotalMs: 0,
    };
    receivers = ['market-group', 'shutter-controller', 'barrier', 'crowd'].map((id) => {
      const p = ISO_POINTS[id];
      return {
        id, x: p.x, y: p.y, district: p.district,
        acceptedTags: [...p.acceptedTags], installedCycleId: null,
        resultState: 'idle', installedAtMs: 0, compatible: false,
        releasable: p.releasable,
      };
    });
    mara = {
      x: ISO_POINTS.mara.x, y: ISO_POINTS.mara.y, visible: false, facing: 270,
      state: 'waiting', // waiting | performing | crossing | reunited
    };
    env = {
      marketGate: 'closed', // closed | opening | open
      gateOpenedAtMs: -1,
      shutters: 'closed', // closed | flapping | open (shutter-controller result)
      witnessGate: 'closed',
      fieldWarnMs: 0,
      fieldState: 'idle', // idle | warning | flagged
      squareResonance: 'idle',
      ambientStopped: false,
    };
    echo = { visible: false, x: ISO_POINTS['record-mark'].x, y: ISO_POINTS['record-mark'].y, facing: 90, interactK: 0 };
    share = { stage: null, ms: 0, maraStart: null, performDur: 0 };
    courier = { trace: 0 };
  }

  initState();

  // -- lookups --------------------------------------------------------------

  function receiverById(id) { return receivers.find((r) => r.id === id) ?? null; }

  function sourceCycleId(sourceId) {
    const p = ISO_POINTS[sourceId];
    return p && p.kind === 'source' ? p.cycleId : null;
  }

  function carriedCycle() {
    if (!resonance.carriedCycleId) return null;
    if (resonance.carriedCycleId === 'recorded-cycle') return buildRecordedCycle();
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

  // -- gates / pathfinding ----------------------------------------------------

  function gateOpen(name) {
    if (name === 'market') return env.marketGate === 'open';
    if (name === 'witness') return env.witnessGate === 'open';
    return false;
  }

  // Dijkstra over the authored graph. Blocked gate edges are excluded; field
  // edges stay walkable (crossing unsafe is a playable mistake, not a wall).
  function findRoute(fromId, toId) {
    if (fromId === toId) return [fromId];
    const distMap = { [fromId]: 0 };
    const prev = {};
    const visited = new Set();
    const queue = [[0, fromId]];
    while (queue.length) {
      queue.sort((x, y) => x[0] - y[0] || (x[1] < y[1] ? -1 : 1));
      const [d, u] = queue.shift();
      if (visited.has(u)) continue;
      visited.add(u);
      if (u === toId) break;
      for (const e of adj[u]) {
        if (e.gate && !gateOpen(e.gate)) continue;
        const nd = d + e.len;
        if (distMap[e.to] === undefined || nd < distMap[e.to]) {
          distMap[e.to] = nd;
          prev[e.to] = u;
          queue.push([nd, e.to]);
        }
      }
    }
    if (distMap[toId] === undefined) return null;
    const path = [toId];
    let cur = toId;
    while (cur !== fromId) { cur = prev[cur]; path.unshift(cur); }
    return path;
  }

  function nearestNode(x, y, filter = null) {
    let best = null; let bd = Infinity;
    for (const n of NODES) {
      if (filter && !filter(n)) continue;
      const d = dist(x, y, n.x, n.y);
      if (d < bd) { bd = d; best = n; }
    }
    return { node: best, dist: bd };
  }

  function nearestReachableNode(x, y) {
    // candidate nodes sorted by distance; first one reachable from the
    // player's current node wins (keeps clicks across a closed gate local).
    const sorted = [...NODES].sort((a, b) => dist(x, y, a.x, a.y) - dist(x, y, b.x, b.y));
    for (const n of sorted.slice(0, 6)) {
      const route = findRoute(player.node, n.id);
      if (route) return { node: n, route };
    }
    return null;
  }

  function projectToSegment(x, y, a, b) {
    const dx = b.x - a.x; const dy = b.y - a.y;
    const denom = dx * dx + dy * dy;
    const t = denom > 1e-8 ? clamp(((x - a.x) * dx + (y - a.y) * dy) / denom, 0, 1) : 0;
    const px = a.x + dx * t; const py = a.y + dy * t;
    return { x: px, y: py, t, dist: dist(x, y, px, py) };
  }

  function routeLength(route) {
    let total = 0;
    for (let i = 1; i < route.length; i++) {
      const a = nodeById[route[i - 1]]; const b = nodeById[route[i]];
      total += dist(a.x, a.y, b.x, b.y);
    }
    return total;
  }

  // Project a pointer onto the same authored edge network the Blender scene
  // renders as pale stone paving. Candidates across a closed gate or in a
  // disconnected district are excluded. This makes visual walkability and
  // actual walkability one contract instead of two approximations.
  function nearestReachablePathPoint(x, y, maxSnap = cfg.walkableSnapRadius) {
    let best = null;
    for (const e of EDGES) {
      if (e.gate && !gateOpen(e.gate)) continue;
      const a = nodeById[e.a]; const b = nodeById[e.b];
      const p = projectToSegment(x, y, a, b);
      if (p.dist > maxSnap) continue;
      const endpoints = p.t <= 0.5 ? [a, b] : [b, a];
      for (const via of endpoints) {
        const route = findRoute(player.node, via.id);
        if (!route) continue;
        const edgeLen = dist(a.x, a.y, b.x, b.y);
        const along = via === a ? p.t * edgeLen : (1 - p.t) * edgeLen;
        const travel = routeLength(route) + along;
        const score = p.dist * 1000 + travel;
        if (!best || score < best.score) {
          best = { x: p.x, y: p.y, dist: p.dist, node: via, route, score };
        }
      }
    }
    return best;
  }

  function pointInWalkableArea(x, y, area) {
    if (x < area.x0 || x > area.x1 || y < area.y0 || y > area.y1) return false;
    return !area.holes.some((hole) => dist(x, y, hole.x, hole.y) < hole.r);
  }

  function nearestReachableAreaPoint(x, y) {
    let best = null;
    for (const area of WALKABLE_AREAS) {
      if (!pointInWalkableArea(x, y, area)) continue;
      for (const nodeId of area.nodes) {
        const node = nodeById[nodeId];
        const route = findRoute(player.node, nodeId);
        if (!route) continue;
        const approach = dist(node.x, node.y, x, y);
        const travel = routeLength(route) + approach;
        const score = approach * 1000 + travel;
        if (!best || score < best.score) {
          best = { x, y, dist: 0, node, route, score, area: area.id };
        }
      }
    }
    return best;
  }

  // -- sources: positions are pure functions of the shared model clock ---------

  function courierState() {
    const cycle = ECHO_CYCLES['courier-loop'];
    const at = cycleStepAt(cycle, elapsedMs);
    const H = COURIER_PATH.home; const D = COURIER_PATH.deliver; const V = COURIER_PATH.via;
    let x = H.x; let y = H.y; let facing = 180;
    if (at.step.label === 'MOVE') {
      // home -> deliver (west side of the stalls)
      x = H.x + (D.x - H.x) * at.progress;
      y = H.y + (D.y - H.y) * at.progress;
      facing = 135;
    } else if (at.step.label === 'WAIT') {
      x = D.x; y = D.y; facing = 90; // the handoff pause
    } else if (at.step.label === 'RETURN') {
      // deliver -> via -> home (east side), two sub-legs over the step
      const p = at.progress;
      if (p < 0.5) {
        const k = p * 2;
        x = D.x + (V.x - D.x) * k; y = D.y + (V.y - D.y) * k;
      } else {
        const k = (p - 0.5) * 2;
        x = V.x + (H.x - V.x) * k; y = V.y + (H.y - V.y) * k;
      }
      facing = -45 + 360;
    }
    return { x, y, facing, stepKind: at.step.kind, stepLabel: at.step.label, phaseMs: at.phaseMs, index: at.index };
  }

  function busState() {
    const at = cycleStepAt(ECHO_CYCLES['bus-service'], elapsedMs);
    const p = ISO_POINTS.bus;
    let x = p.x; let y = p.y;
    if (at.step.kind === 'move') {
      // GO: pull 3.5m north and glide back within the step (visual only)
      const k = at.progress < 0.5 ? at.progress * 2 : 2 - at.progress * 2;
      y = p.y + 3.5 * k;
    }
    return { x, y, stepKind: at.step.kind, stepLabel: at.step.label, phaseMs: at.phaseMs, progress: at.progress, index: at.index };
  }

  function crosswalkState() {
    const at = cycleStepAt(ECHO_CYCLES['crosswalk-signal'], elapsedMs);
    const p = ISO_POINTS.crosswalk;
    return { x: p.x, y: p.y, stepKind: at.step.kind, stepLabel: at.step.label, phaseMs: at.phaseMs, progress: at.progress, index: at.index };
  }

  function sourcePos(id) {
    if (id === 'courier') { const c = courierState(); return { x: c.x, y: c.y }; }
    if (id === 'bus') { const b = busState(); return { x: b.x, y: b.y }; }
    if (id === 'crosswalk') { const c = crosswalkState(); return { x: c.x, y: c.y }; }
    return null;
  }

  // -- receivers ----------------------------------------------------------------

  function receiverPhase(r) {
    if (!r.installedCycleId) return null;
    const cycle = ECHO_CYCLES[r.installedCycleId];
    if (!cycle) return null;
    return cycleStepAt(cycle, elapsedMs);
  }

  function barrierOpenNow() {
    const r = receiverById('barrier');
    if (!r.installedCycleId || !r.compatible) return false;
    const phase = receiverPhase(r);
    return !!phase && phase.step.kind === 'open';
  }

  function crowdCoverNow() {
    const r = receiverById('crowd');
    if (!r.installedCycleId || !r.compatible) return false;
    const phase = receiverPhase(r);
    return !!phase && phase.step.kind === 'move';
  }

  function crowdPosNow() {
    const r = receiverById('crowd');
    const home = { x: ISO_POINTS.crowd.x, y: ISO_POINTS.crowd.y };
    if (!r.installedCycleId || !r.compatible) {
      if (r.installedCycleId && !r.compatible) {
        // wrong cycle: the crowd stalls into a nervous huddle shuffle
        const tri = (elapsedMs % 800) / 800;
        const off = (tri < 0.5 ? tri * 2 : 2 - tri * 2) * 0.5 - 0.25;
        return { x: home.x + off, y: home.y };
      }
      return home;
    }
    const phase = receiverPhase(r);
    if (phase && phase.step.kind === 'move') {
      // the crowd sweeps the island -> field edge as moving cover
      const k = phase.progress < 0.5 ? phase.progress * 2 : 2 - phase.progress * 2;
      return { x: home.x + (8.6 - home.x) * k, y: home.y + (11.6 - home.y) * k };
    }
    return home;
  }

  function marketGroupPosNow() {
    const r = receiverById('market-group');
    const home = { x: ISO_POINTS['market-group'].x, y: ISO_POINTS['market-group'].y };
    if (!r.installedCycleId) return home;
    if (!r.compatible) {
      const tri = (elapsedMs % 800) / 800;
      const off = (tri < 0.5 ? tri * 2 : 2 - tri * 2) * 0.6 - 0.3;
      return { x: home.x + off, y: home.y };
    }
    // the group repeats the courier relationship around the stalls
    const c = courierState();
    return { x: c.x - 0.9, y: c.y - 1.1 };
  }

  function fieldSafeNow() { return barrierOpenNow() && crowdCoverNow(); }

  // -- hover + focus ------------------------------------------------------------

  // Interactive candidates under a world point, nearest first.
  function pickAt(x, y) {
    const cands = [];
    const pad = cfg.hoverRadiusPad;
    // sources (live positions for the courier)
    for (const id of ['courier', 'bus', 'crosswalk']) {
      const p = sourcePos(id);
      const pt = ISO_POINTS[id];
      const d = dist(x, y, p.x, p.y);
      if (d <= pt.r + pad) cands.push({ kind: 'source', id, d });
    }
    for (const r of receivers) {
      const pt = ISO_POINTS[r.id];
      const pos = r.id === 'crowd' ? crowdPosNow() : (r.id === 'market-group' ? marketGroupPosNow() : { x: r.x, y: r.y });
      const d = dist(x, y, pos.x, pos.y);
      if (d <= pt.r + pad) cands.push({ kind: 'receiver', id: r.id, d });
    }
    const rec = ISO_POINTS['record-mark'];
    {
      const d = dist(x, y, rec.x, rec.y);
      if (d <= rec.r + pad) cands.push({ kind: 'record', id: 'record-mark', d });
    }
    const bell = ISO_POINTS.bell;
    {
      const d = dist(x, y, bell.x, bell.y);
      if (d <= bell.r + pad && resonance.mode === 'recording') cands.push({ kind: 'bell', id: 'bell', d });
    }
    if (mara.visible && !reunion) {
      const d = dist(x, y, mara.x, mara.y);
      if (d <= ISO_POINTS.mara.r + pad) cands.push({ kind: 'mara', id: 'mara', d });
    }
    if (!cands.length) return null;
    cands.sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
    return cands[0];
  }

  function interactablePos(kind, id) {
    if (kind === 'source') return sourcePos(id);
    if (kind === 'receiver') {
      if (id === 'crowd') return crowdPosNow();
      if (id === 'market-group') return marketGroupPosNow();
      const r = receiverById(id);
      return r ? { x: r.x, y: r.y } : null;
    }
    if (kind === 'record') return { x: ISO_POINTS['record-mark'].x, y: ISO_POINTS['record-mark'].y };
    if (kind === 'bell') return { x: ISO_POINTS.bell.x, y: ISO_POINTS.bell.y };
    if (kind === 'mara') return { x: mara.x, y: mara.y };
    return null;
  }

  function inRange(kind, id) {
    const pos = interactablePos(kind, id);
    if (!pos) return false;
    const pt = ISO_POINTS[id];
    const rr = kind === 'mara'
      ? ISO_POINTS.mara.r
      : kind === 'source'
        ? (pt?.r ?? 1.5) + cfg.observeSlack
        : Math.max(cfg.interactRadius, (pt?.r ?? 1.5));
    return dist(player.x, player.y, pos.x, pos.y) <= rr;
  }

  // What an interaction with this target would do right now.
  function actionFor(kind, id) {
    if (kind === 'source') {
      if (resonance.mode !== 'idle') return null;
      return { action: 'copy-cycle', prompt: '[HOLD] OBSERVE CYCLE' };
    }
    if (kind === 'receiver') {
      const r = receiverById(id);
      if (!r) return null;
      if (resonance.mode === 'carrying' && !r.installedCycleId) {
        return { action: 'transplant-cycle', prompt: '[CLICK] TRANSPLANT CYCLE' };
      }
      if (resonance.mode === 'idle' && r.installedCycleId && r.releasable) {
        // release is a deliberate gesture (right-click / E), never a
        // left-click — a left click near a receiver is always a walk order
        return { action: 'release-cycle', prompt: '[R-CLICK] RELEASE CYCLE' };
      }
      return null;
    }
    if (kind === 'record') {
      if (resonance.mode === 'idle' && !reunion) {
        return { action: 'record-cycle', prompt: '[CLICK] RECORD YOUR CYCLE' };
      }
      return null;
    }
    if (kind === 'mara') {
      if (resonance.mode === 'carrying' && resonance.carriedCycleId === 'recorded-cycle' && !reunion) {
        const pad = ISO_POINTS['pad-butch'];
        if (dist(player.x, player.y, pad.x, pad.y) <= pad.r + 0.6) {
          return { action: 'share-cycle', prompt: '[CLICK] SHARE CYCLE' };
        }
        return { action: 'goto-pad', prompt: 'STAND ON THE CYAN WITNESS PAD' };
      }
      return null;
    }
    return null;
  }

  function computeFocus() {
    const none = { kind: null, id: null, eligible: false, inRange: false, action: null, prompt: null };
    if (complete || player.frozenMsLeft > 0 || player.locked) return none;
    if (resonance.mode === 'observing') {
      return {
        kind: 'source', id: resonance.sourceId, eligible: true, inRange: true,
        action: 'hold-to-copy', prompt: '[HOLD] OBSERVE CYCLE',
      };
    }
    if (resonance.mode === 'recording') {
      return { kind: 'recording', id: null, eligible: true, inRange: true, action: 'stop-recording', prompt: '[E] STOP RECORDING' };
    }
    if (resonance.mode === 'previewing' || resonance.mode === 'linking') return none;

    // hover first (pointer grammar); else nearest in-range interactable (E grammar)
    let target = null;
    if (hover.id) {
      const act = actionFor(hover.kind, hover.id);
      if (act) target = { kind: hover.kind, id: hover.id, ...act };
    }
    if (!target) {
      const all = [];
      for (const id of ['courier', 'bus', 'crosswalk']) {
        const act = actionFor('source', id);
        if (act && inRange('source', id)) {
          const p = sourcePos(id);
          all.push({ kind: 'source', id, d: dist(player.x, player.y, p.x, p.y), ...act });
        }
      }
      for (const r of receivers) {
        const act = actionFor('receiver', r.id);
        if (act && inRange('receiver', r.id)) {
          all.push({ kind: 'receiver', id: r.id, d: dist(player.x, player.y, r.x, r.y), ...act });
        }
      }
      {
        const act = actionFor('record', 'record-mark');
        if (act && inRange('record', 'record-mark')) {
          const p = ISO_POINTS['record-mark'];
          all.push({ kind: 'record', id: 'record-mark', d: dist(player.x, player.y, p.x, p.y), ...act });
        }
      }
      if (mara.visible) {
        const act = actionFor('mara', 'mara');
        if (act && inRange('mara', 'mara')) {
          all.push({ kind: 'mara', id: 'mara', d: dist(player.x, player.y, mara.x, mara.y), ...act });
        }
      }
      if (all.length) {
        all.sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
        target = all[0];
      }
    }
    if (!target) return none;
    return {
      kind: target.kind, id: target.id, eligible: true,
      inRange: inRange(target.kind, target.id),
      action: target.action, prompt: target.prompt,
    };
  }

  // -- movement -------------------------------------------------------------------

  function cancelMotion() {
    player.route = [];
    player.exact = null;
    player.moving = false;
    queued = null;
  }

  // Issue a move order toward a world point. Broad rendered courts preserve
  // the exact click; connecting lanes snap only when the click lands in their
  // narrow band. Both use the same gated graph as their routing spine.
  function orderMove(wx, wy, queuedAction = null) {
    if (player.locked || player.frozenMsLeft > 0) return false;
    // Interactables may intentionally sit beside the paving (Mara waits across
    // the witness threshold, the bus sits at the curb). A queued interaction
    // may therefore seek a wider nearest approach, while ordinary ground clicks
    // remain strictly constrained to visible paving.
    const target = queuedAction
      ? nearestReachablePathPoint(wx, wy, 8.5)
      : (nearestReachableAreaPoint(wx, wy) ?? nearestReachablePathPoint(wx, wy, cfg.walkableSnapRadius));
    if (!target) {
      pushEvent('move-rejected', { x: round(wx), y: round(wy), reason: 'not-walkable' });
      return false;
    }
    const route = target.route;
    route.shift(); // drop current node
    player.route = route;
    // Final projected leg remains on a rendered path segment. The surveillance
    // segment is intentionally still walkable while unsafe: crossing it is a
    // playable mistake that produces warning/flag/checkpoint feedback.
    player.exact = null;
    const dLast = dist(target.x, target.y, target.node.x, target.node.y);
    if (dLast > 0.15) {
      player.exact = { x: target.x, y: target.y };
    }
    queued = queuedAction;
    if (!player.route.length && !player.exact) {
      // already standing at the closest reachable spot — an interactable
      // that is still out of range from here can never be reached
      player.moving = false;
      if (queuedAction) {
        queued = null;
        pushEvent('interact-noop', { reason: 'out-of-reach', id: queuedAction.id });
      }
      return false;
    }
    player.moving = true;
    pushEvent('move-order', {
      x: round(target.x), y: round(target.y), rawX: round(wx), rawY: round(wy),
      node: target.node.id, queued: queuedAction ? queuedAction.action : null,
    });
    return true;
  }

  function stepMovement(dt) {
    const dtSec = dt / 1000;
    let tx = null; let ty = null; let arriveNode = null;
    if (player.route.length) {
      const n = nodeById[player.route[0]];
      tx = n.x; ty = n.y; arriveNode = n.id;
    } else if (player.exact) {
      tx = player.exact.x; ty = player.exact.y;
    } else {
      if (player.moving) {
        player.moving = false;
        onArrive();
      }
      return;
    }
    const dx = tx - player.x; const dy = ty - player.y;
    const d = Math.hypot(dx, dy);
    const stepLen = cfg.walkSpeed * dtSec;
    if (d <= stepLen) {
      player.x = tx; player.y = ty;
      if (arriveNode) {
        player.node = arriveNode;
        player.route.shift();
      } else {
        player.exact = null;
      }
    } else {
      player.x += (dx / d) * stepLen;
      player.y += (dy / d) * stepLen;
    }
    // the witness gate is a physical wall until the share opens it
    if (env.witnessGate !== 'open') {
      player.x = Math.min(player.x, 26.3);
    }
    const f = facingFromDelta(dx, dy);
    if (f !== null) player.facing = f;
    // recording samples each click-leg semantically
    if (resonance.mode === 'recording' && resonance.record) {
      resonance.record.legMs += dt;
    }
  }

  function onArrive() {
    if (resonance.mode === 'recording' && resonance.record) {
      closeRecordLeg();
      return;
    }
    if (queued) {
      const q = queued;
      queued = null;
      fireAction(q.kind, q.id, q.input ?? 'mouse');
    }
  }

  // -- resonance: observe / copy ---------------------------------------------------

  function startObserving(kind, id, inputKind) {
    resonance.mode = 'observing';
    resonance.sourceId = id;
    resonance.observeMs = 0;
    resonance.observeInput = inputKind;
    cancelMotionKeepQueue();
    pushEvent('observation-started', { sourceId: id, input: inputKind });
  }

  function cancelMotionKeepQueue() {
    player.route = [];
    player.exact = null;
    player.moving = false;
  }

  function abortObserving() {
    const cycle = ECHO_CYCLES[sourceCycleId(resonance.sourceId)];
    const progress = cycle ? clamp(resonance.observeMs / cycle.loopMs, 0, 1) : 0;
    pushEvent('observation-aborted', { sourceId: resonance.sourceId, progress: round(progress) });
    resonance.mode = 'idle';
    resonance.sourceId = null;
    resonance.observeMs = 0;
    resonance.observeInput = null;
  }

  function tickObserving(dt, input) {
    const held = resonance.observeInput === 'key' ? !!input.eHeld : !!input.primaryHeld;
    if (!held) {
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
      resonance.mode = 'carrying';
      resonance.carriedCycleId = cycleId;
      resonance.observeMs = 0;
      const src = resonance.sourceId;
      resonance.sourceId = null;
      resonance.observeInput = null;
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
    } else if (r.id === 'shutter-controller') {
      r.resultState = compatible ? 'cycling-open' : 'flapping';
      env.shutters = compatible ? 'open' : 'flapping';
    } else if (r.id === 'barrier') {
      r.resultState = compatible ? 'cycling-open' : 'twitching';
    } else if (r.id === 'crowd') {
      r.resultState = compatible ? 'moving-cover' : 'stalled-huddle';
    }
    resonance.carriedCycleId = null;
    resonance.mode = 'linking';
    resonance.receiverId = receiverId;
    resonance.linkingMsLeft = 300;
    pushEvent('transplant-applied', { receiverId, cycleId: cycle.id, compatible });
    if (!compatible) {
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
    if (r.id === 'shutter-controller') env.shutters = 'closed';
    pushEvent('cycle-released', { receiverId, cycleId });
  }

  function tickMarketGate() {
    if (env.marketGate === 'opening' && elapsedMs - env.gateOpenedAtMs >= cfg.gateOpenDelayMs) {
      env.marketGate = 'open';
      pushEvent('gate-opened', { gateId: 'market' });
    }
  }

  // -- recording (Silent Fountain) ------------------------------------------------

  function startRecording() {
    resonance.mode = 'recording';
    resonance.record = {
      msLeft: cfg.recordWindowMs,
      legs: [],
      bell: false,
      legStart: { x: player.x, y: player.y },
      legMs: 0,
      legActive: false,
    };
    cancelMotion();
    pushEvent('recording-started', { windowMs: cfg.recordWindowMs });
  }

  function closeRecordLeg() {
    const rec = resonance.record;
    if (!rec || !rec.legActive) return;
    const d = dist(rec.legStart.x, rec.legStart.y, player.x, player.y);
    if (d >= cfg.recordMinLegDist && rec.legs.length < cfg.recordMaxLegs) {
      rec.legs.push({
        kind: 'move', label: 'MOVE',
        x1: round(rec.legStart.x), y1: round(rec.legStart.y),
        x2: round(player.x), y2: round(player.y),
        dist: round(d), durMs: Math.round(clamp(rec.legMs, 350, 6000)),
      });
      pushEvent('recording-leg', { legs: rec.legs.length, dist: round(d) });
    }
    rec.legStart = { x: player.x, y: player.y };
    rec.legMs = 0;
    rec.legActive = false;
  }

  function tickRecording(dt) {
    const rec = resonance.record;
    if (!rec) return;
    rec.msLeft -= dt;
    // bell rings on proximity while recording (the physical interaction)
    if (!rec.bell && dist(player.x, player.y, ISO_POINTS.bell.x, ISO_POINTS.bell.y) <= ISO_POINTS.bell.r) {
      rec.bell = true;
      pushEvent('recording-interact', { target: 'witness-bell', x: round(player.x), y: round(player.y) });
    }
    if (rec.msLeft <= 0) endRecording();
  }

  function endRecording() {
    const rec = resonance.record;
    if (!rec) {
      resonance.mode = 'idle';
      return;
    }
    closeRecordLeg();
    resonance.record = null;
    const steps = clone(rec.legs);
    if (rec.bell) {
      steps.push({ kind: 'interact', label: 'RESONATE', target: 'witness-bell', durMs: cfg.shareInteractHoldMs });
    }
    const moveCount = steps.filter((s) => s.kind === 'move').length;
    if (moveCount < cfg.recordMinLegs || !rec.bell) {
      resonance.mode = 'idle';
      resonance.recordedSteps = null;
      pushEvent('recording-empty', {
        reason: moveCount < cfg.recordMinLegs ? 'too-few-legs' : 'no-bell',
      });
      return;
    }
    resonance.recordedSteps = steps;
    resonance.mode = 'previewing';
    resonance.previewMs = 0;
    resonance.previewTotalMs = steps.reduce((a, s) => a + s.durMs, 0) + 300;
    echo.visible = true;
    echo.x = steps[0].x1;
    echo.y = steps[0].y1;
    echo.interactK = 0;
    pushEvent('recording-ended', { steps: clone(steps) });
    pushEvent('preview-started', {});
  }

  function tickPreview(dt) {
    resonance.previewMs += dt;
    const steps = resonance.recordedSteps ?? [];
    let t = resonance.previewMs;
    let px = echo.x; let py = echo.y; let interactK = 0; let facing = echo.facing;
    let done = true;
    for (const s of steps) {
      if (t < s.durMs) {
        done = false;
        if (s.kind === 'move') {
          const k = s.durMs > 0 ? t / s.durMs : 1;
          px = s.x1 + (s.x2 - s.x1) * k;
          py = s.y1 + (s.y2 - s.y1) * k;
          const f = facingFromDelta(s.x2 - s.x1, s.y2 - s.y1);
          if (f !== null) facing = f;
        } else {
          px = ISO_POINTS.bell.x - 0.9; py = ISO_POINTS.bell.y + 0.4;
          interactK = clamp(t / s.durMs, 0, 1);
        }
        break;
      }
      t -= s.durMs;
    }
    if (done && steps.length) {
      const last = steps[steps.length - 1];
      if (last.kind === 'interact') {
        px = ISO_POINTS.bell.x - 0.9; py = ISO_POINTS.bell.y + 0.4;
        interactK = 1;
      } else {
        px = last.x2; py = last.y2;
      }
    }
    echo.x = px; echo.y = py; echo.interactK = interactK; echo.facing = facing;
    if (resonance.previewMs >= resonance.previewTotalMs) {
      resonance.mode = 'carrying';
      resonance.carriedCycleId = 'recorded-cycle';
      echo.visible = false;
      echo.interactK = 0;
      pushEvent('preview-complete', {});
    }
  }

  // -- share / reunion (payoff) -------------------------------------------------

  function startShare() {
    const steps = resonance.recordedSteps ?? [];
    const performDur = steps.reduce((a, s) => a + s.durMs, 0);
    share = {
      stage: 'perform',
      ms: 0,
      performDur,
      maraStart: { x: mara.x, y: mara.y },
    };
    mara.state = 'performing';
    player.locked = true;
    env.squareResonance = 'resonating';
    // The carried cycle is given away: Mara consumes the movement component,
    // the square consumes the interaction component of the SAME cycle.
    resonance.carriedCycleId = null;
    resonance.mode = 'idle';
    pushEvent('cycle-shared', { performDur });
  }

  function tickShare(dt) {
    if (!share.stage || share.stage === 'done') return;
    share.ms += dt;
    if (share.stage === 'perform') {
      // Mara performs the recorded route half a step behind: the same
      // semantic legs, replayed from her side of the gate toward her pad.
      const steps = (resonance.recordedSteps ?? []).filter((s) => s.kind === 'move');
      const padM = { x: 26.2, y: 1.1 };
      let t = Math.min(share.ms, share.performDur);
      // total recorded path length -> scaled onto her approach
      const totalDist = steps.reduce((a, s) => a + s.dist, 0) || 1;
      let walked = 0; let px = share.maraStart.x; let py = share.maraStart.y; let doneAll = true;
      // build her mirrored polyline: from her start to her pad, same leg count
      const way = [{ x: share.maraStart.x, y: share.maraStart.y }];
      for (let i = 0; i < steps.length; i++) {
        const k = (i + 1) / steps.length;
        way.push({
          x: share.maraStart.x + (padM.x - share.maraStart.x) * k,
          y: share.maraStart.y + (padM.y - share.maraStart.y) * k + Math.sin(k * Math.PI) * 1.6,
        });
      }
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (t < s.durMs) {
          doneAll = false;
          const k = s.durMs > 0 ? t / s.durMs : 1;
          px = way[i].x + (way[i + 1].x - way[i].x) * k;
          py = way[i].y + (way[i + 1].y - way[i].y) * k;
          break;
        }
        t -= s.durMs;
        walked += s.dist;
      }
      if (doneAll) { px = padM.x; py = padM.y; }
      const f = facingFromDelta(px - mara.x, py - mara.y);
      if (f !== null) mara.facing = f;
      mara.x = px; mara.y = py;
      if (share.ms >= share.performDur) {
        mara.x = padM.x; mara.y = padM.y;
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
      const pad = ISO_POINTS['pad-butch'];
      const dx = pad.x - mara.x; const dy = pad.y - mara.y;
      const d = Math.hypot(dx, dy);
      const stepLen = cfg.maraCrossSpeed * (dt / 1000);
      if (d <= stepLen) {
        mara.x = pad.x; mara.y = pad.y + 0.9;
        share.stage = 'reunion';
        share.ms = 0;
        mara.state = 'reunited';
        reunion = true;
        pushEvent('reunion', {});
        pushEvent('subtitle', { text: 'You always walked half a step ahead.' });
      } else {
        mara.x += (dx / d) * stepLen;
        mara.y += (dy / d) * stepLen;
        const f = facingFromDelta(dx, dy);
        if (f !== null) mara.facing = f;
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

  // -- surveillance field -------------------------------------------------------

  function tickField(dt) {
    const inside = pointInField(player.x, player.y);
    if (!inside || fieldSafeNow() || complete) {
      // safe windows fully reset the warning (Qwen field rule: any unsafe
      // gap is shorter than the flag timer, so a protected player always
      // survives to the next window)
      env.fieldWarnMs = 0;
      if (env.fieldState !== 'flagged') env.fieldState = 'idle';
      return;
    }
    env.fieldWarnMs += dt;
    if (env.fieldWarnMs >= cfg.fieldFlagMs) {
      env.fieldState = 'flagged';
      env.fieldWarnMs = 0;
      player.frozenMsLeft = cfg.fieldFreezeMs;
      cancelMotion();
      pushEvent('flagged', { checkpointNode, x: round(player.x), y: round(player.y) });
      return;
    }
    if (env.fieldWarnMs >= cfg.fieldWarnMs && env.fieldState !== 'warning') {
      env.fieldState = 'warning';
      pushEvent('field-warning', {});
    }
  }

  function resolveFlag() {
    const cp = nodeById[checkpointNode];
    player.x = cp.x; player.y = cp.y;
    player.node = cp.id;
    player.route = [];
    player.exact = null;
    player.moving = false;
    env.fieldWarnMs = 0;
    env.fieldState = 'idle';
    pushEvent('checkpoint-return', { checkpointNode });
  }

  // -- districts / beats ----------------------------------------------------------

  function tickDistrict() {
    const { node } = nearestNode(player.x, player.y);
    if (!node) return;
    if (node.d !== district) {
      district = node.d;
      checkpointNode = DISTRICTS[district].checkpoint;
      pushEvent('district-entered', { district, checkpointNode });
      if (district === 'FOUNTAIN' && !alarmRaised) {
        // Beat 5: the Archivist strips the living crowd from the square.
        alarmRaised = true;
        env.ambientStopped = true;
        pushEvent('alarm', {});
      }
    }
    // Beat 4: central-clock breather — both transit relationships installed
    // and the player back at the clock: Mara appears across the fountain.
    if (!breatherSeen && district === 'CLOCK'
      && receiverById('barrier').installedCycleId && receiverById('crowd').installedCycleId) {
      breatherSeen = true;
      mara.visible = true;
      pushEvent('mara-seen', {});
    }
  }

  function cameraBeat() {
    if (complete || (share.stage && share.stage !== 'done')) return 'reunion';
    if (!demoSeen) return 'entry';
    if (district === 'CLOCK' && breatherSeen && !alarmRaised) return 'breather';
    if (district === 'MARKET') return 'market';
    if (district === 'TRANSIT') return 'transit';
    if (district === 'FOUNTAIN') return 'fountain';
    return 'block';
  }

  // -- objective --------------------------------------------------------------------

  function objectiveId() {
    if (complete) return 'REUNION';
    if (district === 'TRAIN' || district === 'MARKET') {
      if (env.marketGate !== 'closed') return 'FOLLOW_THE_OPEN_ROUTE_TO_THE_CLOCK';
      if (resonance.mode === 'carrying') return 'TRANSPLANT_TO_THE_MARKET_GROUP';
      return 'OBSERVE_AND_COPY_A_CYCLE';
    }
    if (district === 'TRANSIT') {
      const both = receiverById('barrier').installedCycleId && receiverById('crowd').installedCycleId;
      return both ? 'CROSS_WHEN_BOTH_CYCLES_RUN' : 'COPY_AND_PLANT_BOTH_CYCLES';
    }
    if (district === 'FOUNTAIN') {
      if (resonance.mode === 'carrying' && resonance.carriedCycleId === 'recorded-cycle') return 'SHARE_YOUR_CYCLE_WITH_MARA';
      if (resonance.mode === 'previewing') return 'THE_ECHO_SHOWS_YOUR_CYCLE';
      if (resonance.mode === 'recording') return 'WALK_A_ROUTE_AND_RING_THE_BELL';
      return 'RECORD_YOUR_OWN_CYCLE';
    }
    // CLOCK
    const both = receiverById('barrier').installedCycleId && receiverById('crowd').installedCycleId;
    if (both) return 'CROSS_THE_FIELD_TO_THE_SILENT_FOUNTAIN';
    if (env.marketGate === 'open') return 'REACH_THE_TRANSIT_INTERSECTION';
    return 'OBSERVE_AND_COPY_A_CYCLE';
  }

  // -- action dispatch --------------------------------------------------------------

  function fireAction(kind, id, inputKind) {
    if (destroyed || complete) return;
    if (player.frozenMsLeft > 0 || player.locked) return;
    if (resonance.mode === 'recording') {
      // during recording every click is movement (handled by caller);
      // E stops the recording
      if (inputKind === 'key') endRecording();
      return;
    }
    if (resonance.mode === 'observing' || resonance.mode === 'previewing') return;
    if (resonance.mode === 'linking') {
      // a press landing inside the 300ms linking flash is buffered, not
      // swallowed — it fires the moment the hand-off settles
      pendingAction = { kind, id, inputKind };
      return;
    }

    const act = actionFor(kind, id);
    if (!act) {
      pushEvent('interact-noop', {});
      return;
    }
    if (!inRange(kind, id)) {
      // walk to the interactable, then fire the queued action on arrival
      const pos = interactablePos(kind, id);
      if (pos) {
        const ok = orderMove(pos.x, pos.y, { kind, id, action: act.action, input: inputKind });
        if (!ok) pushEvent('interact-noop', { reason: 'unreachable', id });
      }
      return;
    }
    switch (act.action) {
      case 'copy-cycle':
        startObserving(kind, id, inputKind);
        break;
      case 'transplant-cycle':
        transplantTo(id);
        break;
      case 'release-cycle':
        if (inputKind === 'mouse') {
          // a left click never releases — it walks to the receiver instead
          const pos = interactablePos(kind, id);
          if (pos) orderMove(pos.x, pos.y);
          return;
        }
        releaseReceiver(id);
        break;
      case 'record-cycle':
        startRecording();
        break;
      case 'share-cycle':
        startShare();
        break;
      case 'goto-pad': {
        const pad = ISO_POINTS['pad-butch'];
        orderMove(pad.x, pad.y, { kind: 'mara', id: 'mara', action: 'share-cycle', input: inputKind });
        break;
      }
      default:
        pushEvent('interact-noop', {});
        break;
    }
  }

  function cancelAll() {
    // right click / Esc: release the hovered installed receiver, cancel the
    // route + queued action, abort observation, or drop the carried cycle
    pendingAction = null;
    if (resonance.mode === 'observing') {
      abortObserving();
      return;
    }
    if (resonance.mode === 'recording') {
      endRecording();
      return;
    }
    if (resonance.mode === 'idle' && hover.kind === 'receiver' && hover.id) {
      const r = receiverById(hover.id);
      if (r && r.installedCycleId && r.releasable) {
        releaseReceiver(hover.id);
        return;
      }
    }
    if (queued || player.route.length || player.exact) {
      cancelMotion();
      pushEvent('move-cancelled', {});
      return;
    }
    if (resonance.mode === 'carrying' && resonance.carriedCycleId !== 'recorded-cycle') {
      const cycleId = resonance.carriedCycleId;
      resonance.carriedCycleId = null;
      resonance.mode = 'idle';
      pushEvent('cycle-released', { receiverId: null, cycleId, dropped: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function update(dtMs, input = {}) {
    if (destroyed) return;
    if (typeof dtMs !== 'number' || !(dtMs > 0)) return;
    const dt = Math.min(dtMs, 100);
    elapsedMs += dt;

    // hover tracking (pointer position in world meters, scene-computed)
    if (input.hover && typeof input.hover.x === 'number') {
      hover.x = input.hover.x;
      hover.y = input.hover.y;
      const pick = pickAt(hover.x, hover.y);
      hover.kind = pick ? pick.kind : null;
      hover.id = pick ? pick.id : null;
    } else if (input.hover === null) {
      hover.x = null; hover.y = null; hover.kind = null; hover.id = null;
    }

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
      tickDistrict();
      return;
    }

    // pointer edges
    if (input.secondaryDown) {
      cancelAll();
    } else if (input.primaryDown) {
      if (resonance.mode === 'observing' && resonance.observeInput === 'mouse') {
        // already holding on a source; ignore extra presses
      } else if (resonance.mode === 'recording') {
        // clicks during recording lay down the route
        closeRecordLeg();
        const rec = resonance.record;
        if (rec) {
          rec.legActive = true;
          rec.legStart = { x: player.x, y: player.y };
          rec.legMs = 0;
          orderMove(input.hover && typeof input.hover.x === 'number' ? input.hover.x : player.x,
            input.hover && typeof input.hover.y === 'number' ? input.hover.y : player.y);
        }
      } else if (resonance.mode === 'linking') {
        // presses during the 300ms hand-off flash are buffered, not
        // swallowed — they fire the moment the link settles
        if (hover.id) pendingAction = { kind: hover.kind, id: hover.id, inputKind: 'mouse' };
        else if (typeof hover.x === 'number') orderMove(hover.x, hover.y);
      } else if (hover.id) {
        const act = actionFor(hover.kind, hover.id);
        // release-cycle is deliberately excluded from the left click
        if (act && act.action !== 'release-cycle') {
          fireAction(hover.kind, hover.id, 'mouse');
        } else if (typeof hover.x === 'number') {
          orderMove(hover.x, hover.y);
        }
      } else if (typeof hover.x === 'number') {
        orderMove(hover.x, hover.y);
      }
    }

    // WASD accessibility fallback: walk toward the nearest node in the held
    // screen-direction cone (all movement stays on the graph)
    const wx = (input.wasd && typeof input.wasd.x === 'number') ? input.wasd.x : 0;
    const wy = (input.wasd && typeof input.wasd.y === 'number') ? input.wasd.y : 0;
    if ((wx !== 0 || wy !== 0) && resonance.mode !== 'observing' && resonance.mode !== 'previewing' && !player.locked) {
      // screen axes -> world: right = NE (0.707,0.707), up = NW (-0.707,0.707)
      const dxw = (wx - wy) * 0.7071;
      const dyw = (wx + wy) * 0.7071;
      const cur = nodeById[player.node];
      let best = null; let bestScore = -Infinity;
      for (const e of adj[player.node]) {
        if (e.gate && !gateOpen(e.gate)) continue;
        const n = nodeById[e.to];
        const ex = n.x - cur.x; const ey = n.y - cur.y;
        const el = Math.hypot(ex, ey) || 1;
        const score = (ex / el) * dxw + (ey / el) * dyw;
        if (score > bestScore) { bestScore = score; best = e.to; }
      }
      if (best && bestScore > 0.3 && !player.route.length && !player.exact) {
        if (resonance.mode === 'recording' && resonance.record && !resonance.record.legActive) {
          resonance.record.legActive = true;
          resonance.record.legStart = { x: player.x, y: player.y };
          resonance.record.legMs = 0;
        }
        player.route = [best];
        player.moving = true;
      }
    }

    if (resonance.mode === 'observing') {
      tickObserving(dt, input);
    } else if (resonance.mode === 'recording') {
      stepMovement(dt);
      tickRecording(dt);
    } else if (resonance.mode === 'previewing') {
      tickPreview(dt);
    } else if (resonance.mode === 'linking') {
      resonance.linkingMsLeft -= dt;
      if (resonance.linkingMsLeft <= 0) {
        resonance.mode = 'idle';
        resonance.receiverId = null;
        if (pendingAction) {
          const p = pendingAction;
          pendingAction = null;
          fireAction(p.kind, p.id, p.inputKind);
        }
      }
      stepMovement(dt);
    } else {
      stepMovement(dt);
    }

    tickMarketGate();
    tickField(dt);
    tickDistrict();
  }

  // E edge — the keyboard alternative for the highlighted target.
  function pressInteract() {
    if (destroyed || complete) return;
    if (player.frozenMsLeft > 0 || player.locked) return;
    if (resonance.mode === 'recording') {
      endRecording();
      return;
    }
    if (resonance.mode === 'observing' || resonance.mode === 'previewing' || resonance.mode === 'linking') return;
    const focus = computeFocus();
    if (!focus.eligible) {
      pushEvent('interact-noop', {});
      return;
    }
    fireAction(focus.kind, focus.id, 'key');
  }

  function snapshot() {
    const focus = computeFocus();
    const courierS = courierState();
    const busS = busState();
    const crossS = crosswalkState();
    const carried = carriedCycle();
    const crowdP = crowdPosNow();
    const groupP = marketGroupPosNow();
    return clone({
      chapter: 'ECHO CITY ISO',
      district,
      districtName: DISTRICTS[district].name,
      objectiveId: objectiveId(),
      cameraBeat: cameraBeat(),
      checkpointNode,
      complete,
      reunion,
      demoSeen,
      alarmRaised,
      elapsedMs: round(elapsedMs),
      player: {
        x: round(player.x), y: round(player.y),
        node: player.node,
        route: [...player.route],
        exact: player.exact ? { x: round(player.exact.x), y: round(player.exact.y) } : null,
        facing: player.facing,
        moving: player.moving,
        frozenMsLeft: round(player.frozenMsLeft),
        locked: player.locked,
      },
      hover: { x: hover.x === null ? null : round(hover.x), y: hover.y === null ? null : round(hover.y), kind: hover.kind, id: hover.id },
      queued: queued ? { kind: queued.kind, id: queued.id, action: queued.action } : null,
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
        recordLegs: resonance.record ? resonance.record.legs.length : (resonance.recordedSteps ? resonance.recordedSteps.filter((s) => s.kind === 'move').length : 0),
        recordBell: resonance.record ? resonance.record.bell : false,
        recordLegsDetail: resonance.record
          ? { legs: clone(resonance.record.legs), legStart: resonance.record.legActive ? { x: round(resonance.record.legStart.x), y: round(resonance.record.legStart.y) } : null }
          : (resonance.recordedSteps ? { legs: clone(resonance.recordedSteps.filter((s) => s.kind === 'move')), legStart: null } : null),
        previewMs: round(resonance.previewMs),
        previewTotalMs: resonance.previewTotalMs,
      },
      carriedCycle: carried
        ? { id: carried.id, sourceId: carried.sourceId, label: carried.label, icons: [...carried.icons], loopMs: carried.loopMs }
        : null,
      sources: [
        {
          id: 'courier', x: round(courierS.x), y: round(courierS.y), cycleId: 'courier-loop',
          stepKind: courierS.stepKind, stepLabel: courierS.stepLabel, phaseMs: round(courierS.phaseMs), facing: courierS.facing,
        },
        {
          id: 'bus', x: round(busS.x), y: round(busS.y), cycleId: 'bus-service',
          stepKind: busS.stepKind, stepLabel: busS.stepLabel, phaseMs: round(busS.phaseMs), progress: round(busS.progress),
        },
        {
          id: 'crosswalk', x: round(crossS.x), y: round(crossS.y), cycleId: 'crosswalk-signal',
          stepKind: crossS.stepKind, stepLabel: crossS.stepLabel, phaseMs: round(crossS.phaseMs), progress: round(crossS.progress),
        },
      ],
      receivers: receivers.map((r) => {
        const phase = receiverPhase(r);
        const pos = r.id === 'crowd' ? crowdP : (r.id === 'market-group' ? groupP : { x: r.x, y: r.y });
        return {
          id: r.id,
          district: r.district,
          x: round(pos.x), y: round(pos.y),
          acceptedTags: [...r.acceptedTags],
          installedCycleId: r.installedCycleId,
          resultState: r.resultState,
          compatible: r.compatible,
          releasable: r.releasable,
          stepKind: phase ? phase.step.kind : null,
          stepLabel: phase ? phase.step.label : null,
          phaseMs: phase ? round(phase.phaseMs) : null,
        };
      }),
      echo: { visible: echo.visible, x: round(echo.x), y: round(echo.y), facing: echo.facing, interactK: round(echo.interactK) },
      environment: {
        marketGate: env.marketGate,
        shutters: env.shutters,
        witnessGate: env.witnessGate,
        fieldSafe: fieldSafeNow(),
        fieldWarnMs: round(env.fieldWarnMs),
        fieldState: env.fieldState,
        squareResonance: env.squareResonance,
        ambientStopped: env.ambientStopped,
      },
      mara: {
        x: round(mara.x), y: round(mara.y), visible: mara.visible, facing: mara.facing, state: mara.state,
      },
      graph: {
        nodes: NODES.map((n) => ({ id: n.id, x: n.x, y: n.y, district: n.d })),
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
    cancel: cancelAll,
    snapshot,
    drainEvents,
    reset,
    destroy,
  };
}

export default createEchoCityIsoModel;
