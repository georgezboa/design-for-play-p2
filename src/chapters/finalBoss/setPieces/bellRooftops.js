// Movement II · ON THE BELL (round 12): a side-scrolling rooftop platformer
// in the rain, played to Chapter 2's four-second bell.
//
// The city runs on time borrowed from the train, and its machines move on
// the bell (Chapter 2's rule: punch a lamp, its machine fires on the next
// bell):
//   amber lamp  E queues it; on the bell its BRIDGE lays across the street
//               (it stays out a few seconds, flickers, folds)
//   teal lamp   on the bell its BILLBOARD rises: a step up, and shelter
//   bell planks amber planks are out from each bell, teal planks from each
//               off-beat (two seconds later), for just over two seconds:
//               jump on the beat, plank to plank
//   rose signal at the end of each stretch: on the bell it lights him, and
//               the borrowed light goes back to him
// His searchlight: from each bell he picks out where Butch is going; on the
// off-beat it stabs down there (a rose column warns). Keep moving, or stand
// under a raised billboard. Over the street he cannot find you in the rain.
//
//   S0 THE FIRST BELL  teach: an amber lamp and its bridge, a rose signal
//   S1 ON THE BELL     amber planks on the bell; the searchlight begins
//   S2 THE OFF-BEAT    amber and teal planks in turn, a billboard to climb
//                      on, a bridge that folds fast
//   S3 THE QUICKENING  Chapter 2's chase: the bell quickens to three
//                      seconds, and every plank and bridge with it
// The last rose signal lights him at the foot of his bell tower: the climb.
//
// Metres: x along the street, y up (roofs near 0, the street far below).

import { clamp, createPieceBase, pieceApi } from './kernel.js';
import { circleHitsBox, createPlatformBody, hurtBox, placeBody, stepPlatformBody } from './platformer.js';

export const BELL_S = 4; // Chapter 2's bell (borrowedLight/timetableModel.js BELL_MS)
export const OFFBEAT_S = BELL_S / 2;

export const ROOFTOP_SEGMENTS = Object.freeze([
  Object.freeze({ id: 'first-bell', name: 'THE FIRST BELL', share: 0.2, from: 0, to: 36, spawn: 2 }),
  Object.freeze({ id: 'on-the-bell', name: 'ON THE BELL', share: 0.3, from: 36, to: 94, spawn: 33 }),
  Object.freeze({ id: 'off-beat', name: 'THE OFF-BEAT', share: 0.3, from: 94, to: 160, spawn: 90 }),
  Object.freeze({ id: 'quickening', name: 'THE QUICKENING', share: 0.2, from: 160, to: 226, spawn: 159, quick: true }),
]);

const S = (id, x0, x1, y, extra = {}) => Object.freeze({ id, x0, x1, y, ...extra });
// Roofs (fixed), chimney tops (fixed), and the street below them.
export const ROOFS = Object.freeze([
  S('roof-a', -8, 12, 0),
  S('roof-b', 19, 36, 0.4),
  S('chimney-1', 46.6, 49.4, 1.8),
  S('roof-c', 60, 74, 0.2),
  S('roof-d', 81, 94, -0.2),
  S('roof-e', 118.4, 128, 0.4),
  S('roof-f', 128.5, 140, 4.0),
  S('roof-g', 147, 166, 4.0),
  S('roof-h', 186, 196, 5.0),
  S('roof-i', 203, 212, 4.6),
  S('roof-j', 211.4, 232, 8.2),
]);
// Bell planks: amber out from the bell, teal from the off-beat.
export const PLANKS = Object.freeze([
  S('plank-1', 38.2, 40.6, 0.8, { line: 'amber' }),
  S('plank-2', 42.6, 45.0, 1.4, { line: 'amber' }),
  S('plank-3', 51.4, 53.8, 1.2, { line: 'amber' }),
  S('plank-4', 55.8, 58.0, 0.8, { line: 'amber' }),
  S('plank-5', 96.4, 98.6, 0.6, { line: 'amber' }),
  S('plank-6', 100.8, 103.0, 1.3, { line: 'teal' }),
  S('plank-7', 105.2, 107.4, 1.9, { line: 'amber' }),
  S('plank-8', 109.6, 111.8, 1.3, { line: 'teal' }),
  S('plank-9', 114.0, 116.2, 0.8, { line: 'amber' }),
  S('plank-10', 168.4, 170.6, 4.6, { line: 'amber' }),
  S('plank-11', 172.8, 175.0, 5.2, { line: 'teal' }),
  S('plank-12', 177.2, 179.4, 4.8, { line: 'amber' }),
  S('plank-13', 181.6, 183.8, 5.4, { line: 'teal' }),
]);
// Lamps (E within reach): amber ones lay a bridge, teal ones raise a
// billboard, rose ones light him.
export const LAMPS = Object.freeze([
  Object.freeze({ id: 'amber-1', line: 'amber', x: 10.4, y: 0, bridge: Object.freeze({ x0: 12, x1: 19, y: 0.2, out: 3.4 }) }),
  Object.freeze({ id: 'rose-1', line: 'rose', x: 33.4, y: 0.4, segment: 0 }),
  Object.freeze({ id: 'teal-1', line: 'teal', x: 65.4, y: 0.2, board: Object.freeze({ x0: 67.6, x1: 71.8, y: 2.6, out: 6 }) }),
  Object.freeze({ id: 'amber-2', line: 'amber', x: 72.6, y: 0.2, bridge: Object.freeze({ x0: 74, x1: 81, y: 0.0, out: 3.2 }) }),
  Object.freeze({ id: 'rose-2', line: 'rose', x: 91.6, y: -0.2, segment: 1 }),
  Object.freeze({ id: 'teal-2', line: 'teal', x: 120.2, y: 0.4, board: Object.freeze({ x0: 122.6, x1: 127.4, y: 2.3, out: 6 }) }),
  Object.freeze({ id: 'amber-3', line: 'amber', x: 138.6, y: 4.0, bridge: Object.freeze({ x0: 140, x1: 147, y: 4.0, out: 2.5 }) }),
  Object.freeze({ id: 'rose-3', line: 'rose', x: 157.6, y: 4.0, segment: 2 }),
  Object.freeze({ id: 'amber-4', line: 'amber', x: 194.6, y: 5.0, bridge: Object.freeze({ x0: 196, x1: 203, y: 5.0, out: 2.4 }) }),
  Object.freeze({ id: 'teal-3', line: 'teal', x: 204.4, y: 4.6, board: Object.freeze({ x0: 206.6, x1: 210.8, y: 6.6, out: 4.5 }) }),
  Object.freeze({ id: 'rose-4', line: 'rose', x: 224.6, y: 8.2, segment: 3 }),
]);

export const ROOFTOP = Object.freeze({
  killY: -5,
  // round 13 (George stood four metres short of the rose signal, pressing
  // nothing): a lamp answers E a little further off, and one nearby but not
  // in reach says "closer" (spectacleBattle onAct 'reach').
  reach: 2.0,
  near: 6,
  // round 13, again: George walked up to the rose signal and E still did
  // nothing (short of it, past it, or in a jump). The rose signal is the
  // stretch's goal, not a timing test: it answers E from anywhere on its
  // roof within this, and from a jump.
  roseReach: 6,
  reachUp: 3.2,
  plankOut: 2.25, // seconds a bell plank stays out (×window on STORY)
  plankWarn: 0.5, // it flickers this long before folding
  travel: 0.35, // a bridge or billboard moving
  flicker: 0.7,
  beamAim: 0.6, // he aims this long after the bell (the beam fires on the off-beat)
  beamHalf: 0.9,
  beamLive: 0.3,
  beamFrom: 30, // the searchlight finds Butch from the end of the first roofs on
  towerX: 232,
  quickBell: 3, // THE QUICKENING (STORY: 3.6)
});

export const ROOFTOP_HINTS = Object.freeze({
  amber: 'AN <kbd>AMBER</kbd> LAMP · <kbd>E</kbd> · ITS BRIDGE LAYS ON THE NEXT BELL',
  wait: 'WAIT FOR THE BELL · THEN CROSS BEFORE THE BRIDGE FOLDS',
  rose: 'THE <kbd>ROSE</kbd> SIGNAL · <kbd>E</kbd> · ON THE BELL IT LIGHTS HIM',
  planks: 'BELL PLANKS · OUT ON THE BELL, FOR TWO SECONDS · JUMP ON THE BEAT',
  beam: 'HIS SEARCHLIGHT · IT STABS DOWN ON THE OFF-BEAT · KEEP MOVING, OR GET UNDER A BILLBOARD',
  teal: 'A <kbd>TEAL</kbd> LAMP · ITS BILLBOARD RISES ON THE BELL · SHELTER, AND A STEP UP',
  offbeat: 'AMBER PLANKS ON THE BELL · TEAL PLANKS ON THE OFF-BEAT',
  quick: 'THE BELL QUICKENS · THREE SECONDS NOW · EVERY PLANK WITH IT',
});

let serial = 0;

/** How far from a lamp E reaches it (the rose signal: the whole end of its roof). */
export const lampReach = (lamp) => (lamp.line === 'rose' ? ROOFTOP.roseReach : ROOFTOP.reach);
/** Is Butch at (x, y) within E's reach of a lamp? */
export const inLampReach = (lamp, x, y) => Math.abs(lamp.x - x) <= lampReach(lamp) && Math.abs(lamp.y - y) <= ROOFTOP.reachUp;

export function createBellRooftops({ difficulty, seed = 17, startSegment = 0 } = {}) {
  const d = createPieceBase({ id: 'on-the-bell', movement: 1, name: 'ON THE BELL', view: 'rooftops', segments: ROOFTOP_SEGMENTS, difficulty, seed, startSegment });
  const body = createPlatformBody({ x: ROOFTOP_SEGMENTS[startSegment].spawn, y: ROOFS.find((r) => ROOFTOP_SEGMENTS[startSegment].spawn >= r.x0 && ROOFTOP_SEGMENTS[startSegment].spawn <= r.x1)?.y ?? 0 });
  let bellClock = 1.2; // seconds into the current bell cycle (first bell soon)
  let bells = 0;
  const lamps = new Map(LAMPS.map((l) => [l.id, { ...l, queued: false, outAt: null, level: 0, lit: false }]));
  const hazards = []; // searchlight beams
  let lastSignal = null;
  let teach = null;
  const taught = new Set();
  const hint = (kind) => { if (!taught.has(kind)) { taught.add(kind); teach = { kind, until: d.clock + 4.5 }; } };

  const seg = () => d.seg.current;
  // The bell's period: four seconds, quickened in the last stretch.
  const period = () => (seg().quick ? (d.tuning.thin ? 3.6 : ROOFTOP.quickBell) : BELL_S);
  const plankOut = () => d.win(ROOFTOP.plankOut) * (period() / BELL_S);

  // Is a plank out at bell phase p (and how long has it left)?
  const plankLeft = (plank, p = bellClock) => {
    const P = period();
    const start = plank.line === 'amber' ? 0 : P / 2;
    const since = ((p - start) % P + P) % P;
    return since < plankOut() ? plankOut() - since : 0;
  };
  // A lamp's machine out at time offset `ahead` (for the forecast too).
  const machineLevel = (lamp, ahead = 0) => {
    if (lamp.outAt === null) {
      if (!lamp.queued) return 0;
      // Queued: it fires on the next bell.
      const toBell = period() - bellClock;
      const t = ahead - toBell;
      return t <= 0 ? 0 : clamp(t / ROOFTOP.travel, 0, 1);
    }
    const age = d.clock + ahead - lamp.outAt;
    const out = d.win((lamp.bridge ?? lamp.board).out) * (seg().quick ? period() / BELL_S : 1);
    if (age < 0) return 0;
    if (age < ROOFTOP.travel) return age / ROOFTOP.travel;
    if (age < out) return 1;
    return clamp(1 - (age - out) / ROOFTOP.travel, 0, 1);
  };

  // The surfaces at a time `ahead` seconds from now.
  const surfaces = (ahead = 0) => {
    const list = [...ROOFS];
    const p = (bellClock + ahead) % period();
    for (const plank of PLANKS) if (plankLeft(plank, p) > 0) list.push({ ...plank, temp: true });
    for (const lamp of lamps.values()) {
      const level = machineLevel(lamp, ahead);
      if (lamp.bridge && level >= 0.95) list.push({ id: `bridge-${lamp.id}`, ...lamp.bridge, temp: true });
      if (lamp.board && level >= 0.9) list.push({ id: `board-${lamp.id}`, ...lamp.board, temp: true });
    }
    return list;
  };
  const world = (ahead = 0) => ({ surfaces: surfaces(ahead), solids: [], minX: -7.5, maxX: ROOFTOP.towerX + 3, killY: ROOFTOP.killY });

  const onRoof = (x) => ROOFS.some((r) => x >= r.x0 && x <= r.x1);
  const sheltered = (x, y, ahead = 0) => [...lamps.values()].some((l) => l.board && machineLevel(l, ahead) > 0.6 && x > l.board.x0 && x < l.board.x1 && y < l.board.y - 0.2);

  // ---------------------------------------------------------------- the bell
  const ring = () => {
    bells += 1;
    d.emit({ type: 'bell', index: bells });
    for (const lamp of lamps.values()) {
      if (!lamp.queued) continue;
      lamp.queued = false;
      if (lamp.line === 'rose') {
        lamp.lit = true;
        d.emit({ type: 'lit', lamp: lamp.id });
        d.emit({ type: 'damage', cause: 'borrowed-light', segment: lamp.segment });
        lastSignal = lamp.id;
        // A rose signal of a later stretch (one walked past) clears every
        // stretch up to its own: it is never spent out of turn.
        while (d.state === 'play' && lamp.segment >= d.seg.index) {
          d.seg.setProgress(1);
          d.completeSegment({ via: 'rose' });
          if (d.state === 'finisher') d.emit({ type: 'finisher', kind: 'tower' });
        }
      } else {
        lamp.outAt = d.clock;
        d.emit({ type: 'machine', lamp: lamp.id, line: lamp.line, on: true });
      }
    }
  };
  const offbeat = () => {
    d.emit({ type: 'offbeat', index: bells });
  };
  // His searchlight: one column where Butch is heading; from THE OFF-BEAT
  // a second where he stands (stop between them, or get under a board).
  const aimBeam = () => {
    if (seg().id === 'first-bell' || body.x < ROOFTOP.beamFrom || d.state !== 'play') return;
    const lead = clamp(body.x + body.vx * 1.1, body.x - 4, body.x + 5);
    if (!onRoof(lead) && !onRoof(body.x)) return;
    hint('beam');
    const fireIn = period() / 2 - bellClock;
    const columns = [lead];
    if ((seg().id === 'off-beat' || seg().id === 'quickening') && !d.tuning.thin && Math.abs(lead - body.x) > 2.6) columns.push(body.x);
    for (const x of columns) {
      const h = { id: `beam-${(serial += 1)}`, kind: 'beam', x, half: ROOFTOP.beamHalf, fireIn, age: 0, T: fireIn, live: ROOFTOP.beamLive, done: false };
      hazards.push(h);
      d.emit({ type: 'spawn', hazard: h });
    }
  };

  const stepBell = (dt) => {
    const P = period();
    const before = bellClock;
    bellClock += dt;
    const half = P / 2;
    const lead = d.tele(half - ROOFTOP.beamAim * (P / BELL_S));
    const aimAt = Math.max(0.05, half - lead);
    if (before < aimAt && bellClock >= aimAt) aimBeam();
    if (before < half && bellClock >= half) offbeat();
    if (bellClock >= P) { bellClock -= P; ring(); }
  };

  // ---------------------------------------------------------------- Butch
  const punch = () => {
    body.punch = 0.24;
    let best = null;
    for (const lamp of lamps.values()) {
      const dx = Math.abs(lamp.x - body.x);
      if (!inLampReach(lamp, body.x, body.y)) continue;
      if (!best || dx < best.dx) best = { lamp, dx };
    }
    if (!best) {
      const near = [...lamps.values()].find((l) => Math.abs(l.x - body.x) <= ROOFTOP.near && Math.abs(l.y - body.y) <= ROOFTOP.reachUp && !(l.line === 'rose' && l.lit));
      d.emit({ type: 'act', result: near ? 'reach' : 'none', lamp: near?.id ?? null, line: near?.line ?? null });
      return;
    }
    const { lamp } = best;
    if (lamp.line === 'rose' && lamp.lit && lamp.segment < d.seg.index) { d.emit({ type: 'act', result: 'spent', lamp: lamp.id }); return; }
    if (lamp.queued) { d.emit({ type: 'act', result: 'already', lamp: lamp.id }); return; }
    if (machineLevel(lamp) > 0.05) { d.emit({ type: 'act', result: 'busy', lamp: lamp.id }); return; }
    lamp.queued = true;
    d.emit({ type: 'act', result: 'queued', lamp: lamp.id, line: lamp.line, toBell: BELL_S - bellClock });
    if (lamp.line === 'amber') hint('wait');
  };

  const stepHazards = (dt, vitals) => {
    const box = hurtBox(body, d.tuning.hurt);
    for (const h of hazards) {
      h.age += dt;
      if (!h.fired && h.age >= h.T) {
        h.fired = true;
        d.emit({ type: 'beam', hazard: h });
        const inside = Math.abs(body.x - h.x) < h.half + 0.3 * d.tuning.hurt;
        if (inside && !sheltered(body.x, body.y) && vitals.inv <= 0 && body.dashInv <= 0) d.emit({ type: 'hit', source: 'beam', from: { x: h.x, y: body.y + 3 } });
      }
      if (h.age >= h.T + h.live) h.done = true;
    }
    for (let i = hazards.length - 1; i >= 0; i -= 1) if (hazards[i].done) { d.emit({ type: 'despawn', hazard: hazards[i] }); hazards.splice(i, 1); }
    void box;
  };

  const update = (dt, input = {}, vitals = { inv: 0 }) => {
    d.stepClock(dt);
    if (d.state === 'intro' && d.stateAge >= 1.0) { d.setState('play'); d.emit({ type: 'segment', index: d.seg.index, name: seg().name, id: seg().id, checkpoint: true }); hint('amber'); }
    stepBell(dt);
    // A machine done folding goes back to idle.
    for (const lamp of lamps.values()) {
      if (lamp.outAt !== null && machineLevel(lamp) <= 0 && d.clock - lamp.outAt > ROOFTOP.travel * 2) { lamp.outAt = null; d.emit({ type: 'machine', lamp: lamp.id, line: lamp.line, on: false }); }
    }
    const events = stepPlatformBody(body, { x: input.x, jump: input.jump, jumpHeld: input.jumpHeld, dash: input.dash, duck: input.duck }, dt, world());
    for (const e of events) {
      if (e.type === 'fell') {
        placeBody(body, body.lastSafe.x, body.lastSafe.y, 1);
        d.emit({ type: 'fall', source: 'fall', x: body.x });
      } else d.emit(e);
    }
    if (input.act && d.state === 'play') punch();
    stepHazards(dt, vitals);
    // Teaching hints as Butch reaches each new thing.
    if (body.x > 24) hint('rose');
    if (body.x > 35 && seg().id === 'on-the-bell') hint('planks');
    if (body.x > 62) hint('teal');
    if (body.x > 93 && seg().id === 'off-beat') hint('offbeat');
    if (seg().id === 'quickening') hint('quick');
    // Progress along the stretch (the rose signal finishes it).
    const s = seg();
    if (d.state === 'play') d.seg.setProgress(Math.min(0.85, clamp((body.x - s.from) / (s.to - s.from), 0, 1) * 0.85));
    if (d.state === 'finisher' && d.stateAge >= 1.6) { d.setState('done'); d.emit({ type: 'finished', piece: d.id }); }
    if (teach && d.clock > teach.until) teach = null;
    return d.flush();
  };

  const resetMachines = () => {
    for (const lamp of lamps.values()) { lamp.queued = false; lamp.outAt = null; if (lamp.segment !== undefined && lamp.segment >= d.seg.index) lamp.lit = false; }
  };
  const checkpoint = (rollback) => {
    hazards.length = 0;
    d.cancelTimers();
    if (rollback === 'segment') {
      d.seg.restart();
      resetMachines();
      const x = seg().spawn;
      const roof = ROOFS.find((r) => x >= r.x0 && x <= r.x1);
      placeBody(body, x, roof?.y ?? 0, 1);
      return { x, y: body.y, rolledBack: true };
    }
    placeBody(body, body.lastSafe.x, body.lastSafe.y, 1);
    return { x: body.x, y: body.y, rolledBack: false };
  };

  return pieceApi(d, {
    body,
    hazards,
    get bellPhase() { return bellClock / period(); },
    get period() { return period(); },
    get bellClock() { return bellClock; },
    get bells() { return bells; },
    lamps: () => [...lamps.values()],
    machineLevel: (id, ahead = 0) => machineLevel(lamps.get(id), ahead),
    plankLeft: (id) => plankLeft(PLANKS.find((p) => p.id === id)),
    surfaces,
    sheltered,
    update,
    checkpoint,
    onHurt() { body.punch = 0; },
    jumpToSegment(i) {
      d.seg.jump(i);
      hazards.length = 0;
      resetMachines();
      const x = seg().spawn;
      placeBody(body, x, ROOFS.find((r) => x >= r.x0 && x <= r.x1)?.y ?? 0, 1);
      if (d.state === 'intro') d.setState('play');
    },
    forecast(seen = hazards) {
      const beams = seen.map((h) => ({ ...h }));
      return {
        world: (t) => world(t),
        hits(b, t) {
          for (const h of beams) {
            const fire = h.T - h.age;
            if (Math.abs(t - fire) < 0.06 && Math.abs(b.x - h.x) < h.half + 0.45 && !sheltered(b.x, b.y, t) && b.dashInv <= 0) return 'beam';
          }
          return null;
        },
        // Standing on a plank or a bridge that is about to fold is a trap.
        risk(b, t) {
          if (!b.grounded || !b.ground) return 0;
          if (b.ground.startsWith('plank-')) {
            const plank = PLANKS.find((p) => p.id === b.ground);
            const left = plankLeft(plank, (bellClock + t) % period());
            return left < 0.55 ? 30 : 0;
          }
          if (b.ground.startsWith('bridge-')) {
            const lamp = lamps.get(b.ground.slice(7));
            return machineLevel(lamp, t + 0.6) < 0.95 ? 30 : 0;
          }
          return 0;
        },
      };
    },
    // What to do now, in a line (the plaque, bottom right).
    objective() {
      if (d.state !== 'play') return null;
      const toBell = Math.max(0, period() - bellClock).toFixed(1);
      const rose = [...lamps.values()].find((l) => l.line === 'rose' && l.segment === d.seg.index);
      if (rose?.queued) return `The rose signal is set: it lights him on the next bell · ${toBell} s`;
      const dx = rose ? rose.x - body.x : Infinity;
      if (rose && !rose.lit && dx > -4 && dx < 16) {
        if (inLampReach(rose, body.x, body.y)) return 'At the rose signal: E. It lights him on the next bell, and the stretch is done.';
        return `The rose signal ends this stretch, ${Math.max(1, Math.round(Math.abs(dx)))} m ${dx < 0 ? 'back' : 'ahead'}: walk up to it and press E.`;
      }
      const lamp = [...lamps.values()].filter((l) => l.line !== 'rose' && l.x - body.x > -ROOFTOP.reach && l.x - body.x < ROOFTOP.near && Math.abs(l.y - body.y) <= 2.2).sort((a, b) => Math.abs(a.x - body.x) - Math.abs(b.x - body.x))[0];
      if (lamp) {
        const what = lamp.line === 'amber' ? 'its bridge lays across' : 'its billboard rises';
        if (lamp.queued) return `Set: on the next bell ${what} · ${toBell} s`;
        if (machineLevel(lamp) <= 0.05) return `${lamp.line === 'amber' ? 'An amber' : 'A teal'} lamp: E beside it, and on the next bell ${what}.`;
      }
      return null;
    },
    hint() {
      if (d.state === 'intro' || d.state === 'done') return '';
      return teach ? ROOFTOP_HINTS[teach.kind] ?? '' : '';
    },
    snapshot() {
      return {
        ...d.snapshotBase(), bell: +bellClock.toFixed(2), bells, lastSignal,
        body: { x: +body.x.toFixed(2), y: +body.y.toFixed(2), grounded: body.grounded },
        lamps: [...lamps.values()].map((l) => ({ id: l.id, queued: l.queued, level: +machineLevel(l).toFixed(2), lit: l.lit })),
        beams: hazards.map((h) => ({ x: +h.x.toFixed(2), t: +(h.T - h.age).toFixed(2) })),
      };
    },
  });
}

export { circleHitsBox };
