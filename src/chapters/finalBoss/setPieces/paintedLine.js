// Movement IV · THE PAINTED LINE (round 12): on rails, on the front of the
// speeding PAINTED TRAIN, Butch with Rosa's brush. The camera rides behind
// him, the line running away ahead into the country.
//
// Chapter 4's rule: PAINT makes a drawn thing real. The country's lines are
// drawn in pencil and painted in; where a line is only drawn, a train cannot
// run on it. The train runs on the line Butch leans to (three lines), and
// his brush reaches the line ahead:
//   drawn line   a stretch of a line that is only pencil: HOLD E to paint it
//                before the train reaches it (both hands on the brush: you
//                barely steer while you paint), or lean to another line
//   barrier      his grey wash standing on a line: lean to another line
//   wash stroke  the Conductor, huge, striding beside the line, sweeps his
//                brush: a grey shadow falls across a line ahead, and where
//                it lands the line is washed back to pencil
//   low sweep    his brush across the front of the train: JUMP
// And the line runs through every world he has been in (S2, ALL WORLDS AT
// ONCE): a 1978 tunnel where a sepia train comes the other way (its lamp
// warns), the rain city where the line crosses a street on bell planks
// (amber lines out on the bell, the teal line on the off-beat), Echo City
// where his words fall on the line.
// Behind it all his grey wash floods the country: it is what you outrun.
//
//   S0 THE DRAWN LINE     teach: paint a drawn stretch; lean round a barrier
//   S1 THE WASH           his strokes wash the line ahead; low sweeps
//   S2 ALL WORLDS AT ONCE the tunnel, the bell, the words, the wash
// Then the night service runs up alongside: JUMP ABOARD, and it rams through
// him. The ending.
//
// Metres: x across the lines, `dist` along them (the train's front at `at`).

import { BELL_S } from './bellRooftops.js';
import { approach, clamp, createPieceBase, pieceApi } from './kernel.js';

export const LINE_SEGMENTS = Object.freeze([
  Object.freeze({ id: 'drawn-line', name: 'THE DRAWN LINE', share: 0.2, from: 0, to: 300, speed: 12 }),
  Object.freeze({ id: 'the-wash', name: 'THE WASH', share: 0.4, from: 300, to: 720, speed: 15 }),
  Object.freeze({ id: 'all-worlds', name: 'ALL WORLDS AT ONCE', share: 0.4, from: 720, to: 1240, speed: 16.5 }),
]);

export const LANES = Object.freeze([-2.4, 0, 2.4]);
export const LINE = Object.freeze({
  edge: 3.3, // how far Butch can lean
  lean: 6.6, // m/s across the lines
  leanAccel: 55,
  painting: 0.22, // steering while painting
  reach: 16, // the brush reaches this far ahead
  paintSpeed: 46, // m/s the paint runs along a drawn stretch
  jumpV: 7.4,
  gravity: 22,
  strokeLead: 1.35, // a wash stroke's shadow warns this long
  sweepLead: 1.0,
  sweepH: 0.5,
  ghostSpeed: 11,
  ghostLead: 1.7,
  wordLead: 1.2,
  plankOut: 2.25,
  serviceX: -5.6, // the night service's line, beside the left one
  end: 1240,
});

export const laneOf = (x) => (x < -1.2 ? 0 : x > 1.2 ? 2 : 1);

// The authored line. g: a drawn stretch; b: a barrier; s: a wash stroke
// (lanes 'butch' = the line he is on); w: a low sweep; t: a 1978 train;
// p: a bell-plank crossing; x: a falling word. `at` is the train front's
// distance at which it is set (strokes, sweeps, trains and words are
// thrown then; g, b and p are simply there, at `d`).
const G = (d, lane, len, extra = {}) => Object.freeze({ k: 'g', d, lane, len, ...extra });
const B = (d, lane, len = 3, extra = {}) => Object.freeze({ k: 'b', d, lane, len, ...extra });
const S = (at, lanes, len = 11, extra = {}) => Object.freeze({ k: 's', at, lanes, len, ...extra });
const W = (at, extra = {}) => Object.freeze({ k: 'w', at, ...extra });
const T = (at, lane, extra = {}) => Object.freeze({ k: 't', at, lane, ...extra });
const P = (d, len = 8, extra = {}) => Object.freeze({ k: 'p', d, len, ...extra });
const X = (at, lane, extra = {}) => Object.freeze({ k: 'x', at, lane, ...extra });
export const LINE_LAYOUT = Object.freeze([
  // S0 THE DRAWN LINE
  G(44, 1, 8, { teach: 'paint' }),
  B(96, 1, 3, { teach: 'barrier' }),
  G(136, 0, 9), B(138, 2),
  G(176, 2, 8), G(184, 1, 8),
  B(214, 0), G(216, 1, 11),
  B(252, 1), B(252, 2), G(264, 0, 6),
  // S1 THE WASH
  S(318, ['butch'], 11, { teach: 'stroke' }),
  W(372, { teach: 'sweep' }),
  B(424, 0), B(424, 1),
  S(444, ['butch', 'next']),
  W(500),
  G(540, 1, 10), B(542, 0),
  S(566, ['butch']), W(606), S(624, ['butch', 'next'], 12, { extra: true }),
  B(676, 2), B(676, 1), G(690, 0, 8),
  // S2 ALL WORLDS AT ONCE: the 1978 tunnel …
  T(742, 'butch', { teach: 'ghost' }), B(790, 1, 3, { world: 'tunnel' }), T(802, 'other'), T(842, 'butch'),
  // … the rain city's bell planks …
  P(906, 8, { teach: 'planks' }), P(962, 8), W(986), P(1010, 8),
  // … Echo City's words …
  X(1032, 'butch', { teach: 'words' }), X(1052, 'other'), X(1076, 'butch'), X(1078, 'next', { extra: true }), S(1100, ['butch']),
  // … the painted country, the wash closing in.
  S(1150, ['butch', 'next']), W(1176), B(1206, 1), B(1206, 0), S(1214, ['butch'], 9, { extra: true }),
]);

export const LINE_WORLDS = Object.freeze([
  Object.freeze({ id: 'painted', from: 0, to: 730 }),
  Object.freeze({ id: 'tunnel', from: 730, to: 870 }),
  Object.freeze({ id: 'rain', from: 870, to: 1022 }),
  Object.freeze({ id: 'echo', from: 1022, to: 1132 }),
  Object.freeze({ id: 'painted', from: 1132, to: 1500 }),
]);
export const worldAt = (dist) => (LINE_WORLDS.find((w) => dist >= w.from && dist < w.to) ?? LINE_WORLDS.at(-1)).id;

export const LINE_HINTS = Object.freeze({
  paint: 'A DRAWN LINE · ONLY PENCIL · HOLD <kbd>E</kbd> · PAINT IT BEFORE THE TRAIN GETS THERE',
  barrier: 'HIS WASH STANDS ON THE LINE · <kbd>A</kbd> / <kbd>D</kbd> · LEAN TO ANOTHER LINE',
  stroke: 'HIS BRUSH · WHERE ITS SHADOW FALLS, THE LINE GOES BACK TO PENCIL',
  sweep: 'HIS BRUSH ACROSS THE FRONT · <kbd>SPACE</kbd> · JUMP',
  ghost: 'A 1978 TRAIN ON THE LINE · ITS LAMP · LEAN AWAY FROM IT',
  planks: 'BELL PLANKS · AMBER LINES ON THE BELL · THE TEAL LINE ON THE OFF-BEAT',
  words: 'HIS WORDS FALL ON THE LINE · LEAN AWAY',
  board: 'THE NIGHT SERVICE · LEAN LEFT · <kbd>SPACE</kbd> · JUMP ABOARD',
});

let serial = 0;

export function createPaintedLine({ difficulty, seed = 31, startSegment = 0 } = {}) {
  const d = createPieceBase({ id: 'painted-line', movement: 3, name: 'THE PAINTED LINE', view: 'rail', segments: LINE_SEGMENTS, difficulty, seed, startSegment });
  const body = { x: 0, y: 0, vx: 0, vy: 0, grounded: true, painting: false, punch: 0, moving: false, facingX: 1 };
  let at = LINE_SEGMENTS[startSegment].from; // the train front's distance
  let trainLane = 1;
  let trainX = 0;
  let bellClock = 1.0;
  let cursor = 0;
  let gaps = [];
  let barriers = [];
  let crossings = [];
  const strokes = [];
  const sweeps = [];
  const ghosts = [];
  const words = [];
  let service = null; // the night service, alongside, at the end
  let boarded = false;
  let jolt = 0;
  let teach = null;
  const taught = new Set();
  const hint = (kind) => { if (kind && !taught.has(kind)) { taught.add(kind); teach = { kind, until: d.clock + 4.5 }; } };

  const seg = () => d.seg.current;
  const speed = () => d.pace(seg().speed);
  const lanePick = (which) => {
    if (which === 'butch') return trainLane;
    if (which === 'other') return [0, 1, 2].filter((l) => l !== trainLane)[Math.floor(d.rng() * 2)];
    if (which === 'next') return trainLane === 1 ? (d.rng() < 0.5 ? 0 : 2) : 1;
    return which;
  };

  // The fixed pieces of the line (drawn stretches, barriers, crossings) are
  // laid out from the start of the current segment.
  const layFixed = (from = seg().from) => {
    gaps = LINE_LAYOUT.filter((e) => e.k === 'g' && e.d >= from && !(e.extra && d.tuning.thin)).map((e) => ({ id: `g-${(serial += 1)}`, lane: e.lane, d0: e.d, d1: e.d + e.len, painted: 0, teach: e.teach ?? null }));
    barriers = LINE_LAYOUT.filter((e) => e.k === 'b' && e.d >= from).map((e) => ({ id: `b-${(serial += 1)}`, lane: e.lane, d0: e.d, d1: e.d + e.len, teach: e.teach ?? null }));
    crossings = LINE_LAYOUT.filter((e) => e.k === 'p' && e.d >= from).map((e) => ({ id: `p-${(serial += 1)}`, d0: e.d, d1: e.d + e.len, teach: e.teach ?? null }));
    cursor = LINE_LAYOUT.findIndex((e) => (e.at ?? -1) >= from && 'at' in e);
    if (cursor < 0) cursor = LINE_LAYOUT.length;
  };
  layFixed();

  // A plank lane is out at bell phase p: lines 0 and 2 amber (from the
  // bell), line 1 teal (from the off-beat).
  const plankOut = (lane, p) => {
    const start = lane === 1 ? BELL_S / 2 : 0;
    const since = ((p - start) % BELL_S + BELL_S) % BELL_S;
    return since < d.win(LINE.plankOut);
  };

  // ---------------------------------------------------------------- throws
  const throwEntry = (e) => {
    if (e.extra && d.tuning.thin) return;
    hint(e.teach);
    if (e.k === 's') {
      const lanes = [...new Set(e.lanes.map(lanePick))];
      const lead = d.tele(LINE.strokeLead);
      const dLand = at + speed() * lead + 9;
      strokes.push({ id: `s-${(serial += 1)}`, lanes, d0: dLand, d1: dLand + e.len, left: lead, lead });
      d.emit({ type: 'stroke-warn', lanes, d0: dLand });
    } else if (e.k === 'w') {
      const lead = d.tele(LINE.sweepLead);
      sweeps.push({ id: `w-${(serial += 1)}`, left: lead, lead });
      d.emit({ type: 'sweep-warn' });
    } else if (e.k === 't') {
      const lane = lanePick(e.lane);
      const lead = d.tele(LINE.ghostLead);
      const close = speed() + d.pace(LINE.ghostSpeed);
      ghosts.push({ id: `t-${(serial += 1)}`, lane, dist: at + close * lead, left: lead, lead, passed: false });
      d.emit({ type: 'ghost-warn', lane });
    } else if (e.k === 'x') {
      const lane = lanePick(e.lane);
      const lead = d.tele(LINE.wordLead);
      const dLand = at + speed() * lead + 7;
      words.push({ id: `x-${(serial += 1)}`, lane, d0: dLand, d1: dLand + 2.4, left: lead, lead, landed: false, word: d.rng.pick(['CASES', 'STAY', 'ABOARD', 'NOBODY', 'LEAVES', 'FORGED', 'HIDING', 'MADE']) });
      d.emit({ type: 'word-warn', lane });
    }
  };

  // ---------------------------------------------------------------- update
  const crash = (source, x = trainX) => d.emit({ type: 'hit', source, from: { x, y: 0.6 } });

  const update = (dt, input = {}, vitals = { inv: 0 }) => {
    d.stepClock(dt);
    jolt = Math.max(0, jolt - dt);
    body.punch = Math.max(0, body.punch - dt);
    bellClock = (bellClock + dt) % BELL_S;
    if (d.state === 'intro' && d.stateAge >= 1.4) { d.setState('play'); d.emit({ type: 'segment', index: d.seg.index, name: seg().name, id: seg().id, checkpoint: true }); }
    const playing = d.state === 'play';
    const running = playing || d.state === 'finisher';
    // Butch leans; painting holds him almost still.
    body.painting = Boolean(input.actHeld) && playing && !service;
    const ix = clamp(Number(input.x) || 0, -1, 1);
    const top = LINE.lean * (body.painting ? LINE.painting : 1);
    body.vx = approach(body.vx, ix * top, LINE.leanAccel * dt);
    const edge = service ? LINE.edge + 0.6 : LINE.edge;
    body.x = clamp(body.x + body.vx * dt, -edge, LINE.edge);
    body.moving = Math.abs(body.vx) > 0.3;
    if (ix) body.facingX = Math.sign(ix);
    if (input.jump && body.grounded && running) { body.vy = LINE.jumpV; body.grounded = false; d.emit({ type: 'jump' }); }
    if (!body.grounded) {
      body.vy -= LINE.gravity * (input.jumpHeld || body.vy < 0 ? 1 : 1.6) * dt;
      body.y += body.vy * dt;
      if (body.y <= 0) { body.y = 0; body.vy = 0; body.grounded = true; d.emit({ type: 'land' }); }
    }
    // The train follows the line he leans to.
    const lane = laneOf(body.x);
    if (lane !== trainLane && running) { trainLane = lane; d.emit({ type: 'switch', lane }); }
    trainX = approach(trainX, LANES[trainLane], 9 * dt);
    if (running) at += speed() * dt;
    // His throws, when the train front reaches them.
    while (playing && cursor < LINE_LAYOUT.length && 'at' in LINE_LAYOUT[cursor] && LINE_LAYOUT[cursor].at <= at) { throwEntry(LINE_LAYOUT[cursor]); cursor += 1; }
    while (cursor < LINE_LAYOUT.length && !('at' in LINE_LAYOUT[cursor])) cursor += 1;
    // Teach as the fixed pieces come into view.
    for (const g of gaps) if (g.teach && g.d0 - at < 30) hint(g.teach);
    for (const b of barriers) if (b.teach && b.d0 - at < 30) hint(b.teach);
    for (const c of crossings) if (c.teach && c.d0 - at < 45) hint(c.teach);
    // The brush.
    if (body.painting) {
      body.punch = 0.2;
      for (const g of gaps) {
        if (g.lane !== trainLane || g.painted >= g.d1 - g.d0) continue;
        if (g.d0 + g.painted > at + LINE.reach || g.d1 < at - 1) continue;
        const before = g.painted;
        g.painted = Math.min(g.d1 - g.d0, g.painted + LINE.paintSpeed * dt);
        if (before < g.d1 - g.d0 && g.painted >= g.d1 - g.d0) d.emit({ type: 'painted', gap: g });
      }
    }
    // Wash strokes land: the line under them is pencil again.
    for (let i = strokes.length - 1; i >= 0; i -= 1) {
      const s = strokes[i];
      s.left -= dt;
      if (s.left <= 0) {
        strokes.splice(i, 1);
        for (const l of s.lanes) gaps.push({ id: `g-${(serial += 1)}`, lane: l, d0: s.d0, d1: s.d1, painted: 0, washed: true });
        d.emit({ type: 'stroke', lanes: s.lanes, d0: s.d0, d1: s.d1 });
      }
    }
    // Low sweeps across the front.
    for (let i = sweeps.length - 1; i >= 0; i -= 1) {
      const w = sweeps[i];
      w.left -= dt;
      if (w.left <= 0) {
        sweeps.splice(i, 1);
        d.emit({ type: 'sweep' });
        if (body.y < LINE.sweepH && vitals.inv <= 0) d.emit({ type: 'hit', source: 'brush-sweep', from: { x: -6, y: 0.4 } });
      }
    }
    // 1978 trains, coming the other way.
    for (const g of ghosts) {
      g.left -= dt;
      g.dist -= d.pace(LINE.ghostSpeed) * dt;
      if (!g.passed && g.dist <= at) {
        g.passed = true;
        if (g.lane === trainLane && vitals.inv <= 0) crash('ghost-train', LANES[g.lane]);
        d.emit({ type: 'ghost-pass', lane: g.lane, hit: g.lane === trainLane });
      }
    }
    for (let i = ghosts.length - 1; i >= 0; i -= 1) if (ghosts[i].dist < at - 30) ghosts.splice(i, 1);
    // Words land on the line.
    for (const w of words) {
      w.left -= dt;
      if (!w.landed && w.left <= 0) { w.landed = true; d.emit({ type: 'word-lands', word: w }); }
    }
    for (let i = words.length - 1; i >= 0; i -= 1) if (words[i].d1 < at - 10) words.splice(i, 1);
    // What the front of the train runs onto.
    if (playing) {
      for (const g of gaps) {
        if (g.lane !== trainLane || g.hit) continue;
        const unpainted = g.d0 + g.painted;
        if (at >= unpainted && at < g.d1 && g.painted < g.d1 - g.d0) {
          g.hit = true;
          g.painted = g.d1 - g.d0; // the line forgives: it fills in as the train jolts over
          jolt = 0.6;
          if (vitals.inv <= 0) crash('drawn-line');
          d.emit({ type: 'derail', gap: g });
        }
      }
      for (const b of barriers) {
        if (b.lane !== trainLane || b.hit) continue;
        if (at >= b.d0 && at < b.d1) { b.hit = true; jolt = 0.6; if (vitals.inv <= 0) crash('wash-barrier'); d.emit({ type: 'smash', barrier: b }); }
      }
      for (const w of words) {
        if (!w.landed || w.lane !== trainLane || w.hit) continue;
        if (at >= w.d0 && at < w.d1) { w.hit = true; jolt = 0.6; if (vitals.inv <= 0) crash('falling-word'); d.emit({ type: 'smash', word: w }); }
      }
      for (const c of crossings) {
        if (c.hit || at < c.d0 || at >= c.d1) continue;
        if (!plankOut(trainLane, bellClock)) { c.hit = true; jolt = 0.6; if (vitals.inv <= 0) crash('bell-plank'); d.emit({ type: 'derail', crossing: c }); }
      }
    }
    // Progress, segments, and the night service.
    const s = seg();
    if (playing) {
      d.seg.setProgress(Math.min(0.999, clamp((at - s.from) / (s.to - s.from), 0, 1)));
      if (at >= s.to) {
        d.completeSegment();
        if (d.state === 'finisher') {
          service = { x: LINE.serviceX, alongside: 0, ready: false };
          gaps = gaps.filter((g) => g.d0 < at); barriers = []; words.length = 0; strokes.length = 0; sweeps.length = 0; ghosts.length = 0;
          hint('board');
          d.emit({ type: 'finisher', kind: 'night-service' });
        }
      }
    }
    if (service && !boarded) {
      service.alongside += dt;
      service.ready = service.alongside > d.tele(1.6);
      // Lean to the left edge and jump across.
      if (service.ready && body.y > 0.35 && body.x < -2.55) {
        boarded = true;
        d.emit({ type: 'boarded' });
        d.emit({ type: 'damage', cause: 'night-service' });
      }
    }
    if (boarded && d.state === 'finisher' && d.stateAge > 0.5) { d.setState('done'); d.emit({ type: 'finished', piece: d.id }); }
    if (teach && d.clock > teach.until) teach = null;
    return d.flush();
  };

  const checkpoint = (rollback) => {
    strokes.length = 0; sweeps.length = 0; ghosts.length = 0; words.length = 0;
    d.cancelTimers();
    if (rollback === 'segment') {
      d.seg.restart();
      at = seg().from;
      layFixed(at);
    } else {
      // Clear the line just ahead so he can find his feet.
      gaps.forEach((g) => { if (g.d0 < at + 25 && g.d1 > at) g.painted = g.d1 - g.d0; });
      barriers = barriers.filter((b) => b.d0 > at + 25);
    }
    Object.assign(body, { x: LANES[1], y: 0, vx: 0, vy: 0, grounded: true });
    trainLane = 1;
    return { x: 0, y: 0, rolledBack: rollback === 'segment' };
  };

  return pieceApi(d, {
    body,
    get hazards() { return [...gaps, ...barriers, ...words]; },
    get at() { return at; },
    get speed() { return speed(); },
    get trainLane() { return trainLane; },
    get trainX() { return trainX; },
    get gaps() { return gaps; },
    get barriers() { return barriers; },
    get crossings() { return crossings; },
    strokes,
    sweeps,
    ghosts,
    words,
    get service() { return service; },
    get boarded() { return boarded; },
    get bellClock() { return bellClock; },
    get jolt() { return jolt; },
    world: () => worldAt(at),
    plankOut: (lane, ahead = 0) => plankOut(lane, (bellClock + ahead) % BELL_S),
    update,
    checkpoint,
    jumpToSegment(i) {
      d.seg.jump(i);
      at = seg().from;
      layFixed(at);
      strokes.length = 0; sweeps.length = 0; ghosts.length = 0; words.length = 0;
      if (d.state === 'intro') d.setState('play');
    },
    hint() {
      if (d.state === 'intro' || d.state === 'done') return '';
      if (service && !boarded) return LINE_HINTS.board;
      return teach ? LINE_HINTS[teach.kind] ?? '' : '';
    },
    snapshot() {
      return {
        ...d.snapshotBase(), at: +at.toFixed(1), world: worldAt(at), lane: trainLane, painting: body.painting, bell: +bellClock.toFixed(2),
        body: { x: +body.x.toFixed(2), y: +body.y.toFixed(2) }, service: service ? { ready: service.ready } : null, boarded,
        ahead: [...gaps.filter((g) => g.d1 > at && g.d0 < at + 60).map((g) => ({ k: 'g', lane: g.lane, d: +(g.d0 - at).toFixed(1), left: +(g.d1 - g.d0 - g.painted).toFixed(1) })),
          ...barriers.filter((b) => b.d1 > at && b.d0 < at + 60).map((b) => ({ k: 'b', lane: b.lane, d: +(b.d0 - at).toFixed(1) }))],
      };
    },
  });
}
