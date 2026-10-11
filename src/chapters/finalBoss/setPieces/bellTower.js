// Movement II · THE BELL TOWER (round 12): a vertical climb up the inside of
// his bell tower, the camera rising with Butch.
//
// The bell keeps Chapter 2's four seconds. On every bell it RINGS: the ring
// runs down the tower's stones (a bright band, descending). Anyone standing
// on stone when it passes is knocked off his feet: be in the air (JUMP it).
// The swinging beams hang from the bell's frame and swing with it: ride
// them across. From the second stretch the borrowed light rises from the
// street below: it must not catch you. In the last stretch he drops the
// tower's counterweights down the shaft (a shadow line rattles first).
//
//   S0 THE TOWER        teach: ledges, the first ring
//   S1 THE SWING        swinging beams; the light starts to rise
//   S2 THE RISING LIGHT faster light, counterweights
//   S3 ON THE BELL      under the bell: punch it as it strikes (twice)
// The cracked bell, then his ticket inspection, then Echo City.
//
// Metres: x across the shaft, y up.

import { clamp, createPieceBase, pieceApi } from './kernel.js';
import { circleHitsBox, createPlatformBody, hurtBox, placeBody, stepPlatformBody } from './platformer.js';
import { BELL_S } from './bellRooftops.js';

export const TOWER_SEGMENTS = Object.freeze([
  Object.freeze({ id: 'tower', name: 'THE TOWER', share: 0.2, y0: 0, y1: 16.4, light: 0 }),
  Object.freeze({ id: 'swing', name: 'THE SWING', share: 0.3, y0: 16.4, y1: 34.4, light: 0.55 }),
  Object.freeze({ id: 'rising-light', name: 'THE RISING LIGHT', share: 0.3, y0: 34.4, y1: 57.8, light: 0.85 }),
  Object.freeze({ id: 'on-the-bell', name: 'ON THE BELL', share: 0.2, y0: 57.8, y1: 57.8, light: 0 }),
]);

export const TOWER = Object.freeze({
  half: 6.5,
  bellY: 61.5,
  topY: 57.8,
  ringSpeed: 14,
  ringBand: 0.7,
  lightBelow: 6.5, // where the light starts under a stretch's floor
  weightR: 0.65,
  weightSpeed: 20,
  weightWarn: 1.1,
  weightEvery: 2.6,
  punchWindow: 0.18,
  punchReach: 1.8,
  punches: 2,
});

const ledge = (id, x0, x1, y) => Object.freeze({ id, x0, x1, y });
export const TOWER_LEDGES = Object.freeze([
  ledge('floor', -6.5, 6.5, 0),
  ledge('l1', 2, 6.5, 1.9), ledge('l2', -2.5, 1, 3.8), ledge('l3', -6.5, -3.5, 5.6), ledge('l4', -2, 2.4, 7.4),
  ledge('l5', 3.4, 6.5, 9.2), ledge('l6', -1, 2, 11.0), ledge('l7', -6.5, -3, 12.8), ledge('l8', -1.5, 3.5, 14.6),
  ledge('ringers', -6.5, 6.5, 16.4),
  ledge('m1', 4.5, 6.5, 21.8), ledge('m2', -6.5, -4.6, 25.4), ledge('m3', -1.2, 1.2, 29.0), ledge('m4', 3.5, 6.5, 30.8),
  ledge('clock-floor', -6.5, 6.5, 34.4),
  ledge('n1', -6.5, -3, 36.2), ledge('n2', -1, 2, 38.0), ledge('n3', 3.5, 6.5, 39.8), ledge('n4', -6.5, -4, 43.4),
  ledge('n5', -2, 1, 45.2), ledge('n6', 2.5, 6.5, 47.0), ledge('n7', -6.5, -3.6, 50.6), ledge('n8', -1.2, 2.2, 52.4),
  ledge('n9', 3.6, 6.5, 54.2), ledge('n10', -2, 1.5, 56.0),
  ledge('belfry', -6.5, 6.5, 57.8),
]);
// Beams hanging from the bell frame: x = cx + a · sin(2π t / BELL_S + phase).
const swing = (id, cx, a, y, phase = 0, half = 1.2) => Object.freeze({ id, cx, a, y, phase, half });
export const TOWER_SWINGS = Object.freeze([
  swing('s1', 0, 3.0, 18.2, 0), swing('s2', 0.4, 3.0, 20.0, 0.35), swing('s3', 0, 3.4, 23.6, Math.PI),
  swing('s4', 0, 3.0, 27.2, Math.PI / 2), swing('s5', -0.5, 3.2, 32.6, Math.PI),
  swing('s6', 0, 3.3, 41.6, 0), swing('s7', 0, 3.2, 48.8, Math.PI),
]);

export const TOWER_HINTS = Object.freeze({
  climb: '<kbd>SPACE</kbd> · JUMP · HOLD FOR HIGHER · CLIMB',
  ring: 'THE BELL RINGS DOWN THE STONES · <kbd>SPACE</kbd> · JUMP IT AS IT PASSES',
  swing: 'THE BEAMS SWING WITH THE BELL · RIDE THEM ACROSS',
  light: 'THE BORROWED LIGHT IS RISING · KEEP CLIMBING',
  weights: 'HIS COUNTERWEIGHTS · A SHADOW RATTLES DOWN THE SHAFT FIRST · STEP ASIDE',
  bell: 'UNDER THE BELL · <kbd>E</kbd> AS IT STRIKES · ON THE BELL',
});

let serial = 0;

export function createBellTower({ difficulty, seed = 19, startSegment = 0 } = {}) {
  const d = createPieceBase({ id: 'bell-tower', movement: 1, name: 'THE BELL TOWER', view: 'tower', segments: TOWER_SEGMENTS, difficulty, seed, startSegment });
  const start = TOWER_SEGMENTS[startSegment];
  const body = createPlatformBody({ x: -3, y: start.y0 });
  let clock = 0; // tower time (the swing's phase)
  let bellClock = 2.2;
  let bells = 0;
  const rings = []; // { y, prevY }
  const weights = [];
  let light = start.y0 - TOWER.lightBelow;
  let weightClock = 3;
  let punches = 0;
  const punched = new Set(); // the bells punched on
  let teach = null;
  const taught = new Set();
  const hint = (kind) => { if (!taught.has(kind)) { taught.add(kind); teach = { kind, until: d.clock + 4.5 }; } };

  const seg = () => d.seg.current;
  const swingX = (s, t = clock) => s.cx + s.a * Math.sin((2 * Math.PI * t) / BELL_S + s.phase);
  const surfaces = (ahead = 0, dt = 1 / 60) => [
    ...TOWER_LEDGES,
    ...TOWER_SWINGS.map((s) => {
      const x = swingX(s, clock + ahead);
      const prev = swingX(s, clock + ahead - dt);
      return { id: s.id, x0: x - s.half, x1: x + s.half, y: s.y, dx: x - prev, temp: true };
    }),
  ];
  const world = (ahead = 0, dt = 1 / 60) => ({ surfaces: surfaces(ahead, dt), solids: [], minX: -TOWER.half + 0.3, maxX: TOWER.half - 0.3, killY: -20 });
  const ringSpeed = () => d.pace(TOWER.ringSpeed);
  const lightRate = () => d.pace(seg().light);

  const ring = () => {
    bells += 1;
    d.emit({ type: 'bell', index: bells });
    if (seg().id === 'on-the-bell') {
      // The bell strikes right over the belfry floor: punched on the bell
      // it rings back up into him; otherwise its ring knocks a standing
      // Butch down (a punch may land a moment after the strike).
      const index = bells;
      d.after(d.win(TOWER.punchWindow) + 0.02, () => {
        if (!punched.has(index) && body.grounded && seg().id === 'on-the-bell' && d.state === 'play') d.emit({ type: 'hit', source: 'bell', from: { x: 0, y: TOWER.bellY } });
      });
      return;
    }
    // From the tower's second bell, each bell rings down the stones.
    if (bells >= 2 || seg().id !== 'tower') { rings.push({ id: `ring-${(serial += 1)}`, y: TOWER.bellY, prevY: TOWER.bellY, age: 0 }); hint('ring'); }
  };

  const dropWeight = () => {
    const x = clamp(body.x + body.vx * 0.5, -TOWER.half + 0.8, TOWER.half - 0.8);
    weights.push({ id: `weight-${(serial += 1)}`, x, y: body.y + 13, warn: d.tele(TOWER.weightWarn), age: 0, falling: false });
    hint('weights');
    d.emit({ type: 'weight-warn', x });
  };

  const punch = () => {
    body.punch = 0.24;
    if (seg().id !== 'on-the-bell') { d.emit({ type: 'act', result: 'none' }); return; }
    const toBell = Math.min(bellClock, BELL_S - bellClock); // seconds from the strike
    const win = d.win(TOWER.punchWindow);
    if (Math.abs(body.x) > TOWER.punchReach || body.y < TOWER.topY - 0.2) { d.emit({ type: 'act', result: 'far' }); return; }
    if (toBell > win) { d.emit({ type: 'act', result: bellClock < BELL_S / 2 ? 'late' : 'early' }); return; }
    const index = bellClock < BELL_S / 2 ? bells : bells + 1;
    if (punched.has(index)) return;
    punched.add(index);
    punches += 1;
    d.stats.returns += 1;
    d.emit({ type: 'act', result: 'on-the-bell', punches });
    d.emit({ type: 'damage', cause: 'on-the-bell' });
    d.seg.setProgress(punches / TOWER.punches);
    if (punches >= TOWER.punches) { d.completeSegment(); d.emit({ type: 'finisher', kind: 'bell-cracks' }); }
  };

  const update = (dt, input = {}, vitals = { inv: 0 }) => {
    d.stepClock(dt);
    clock += dt;
    if (d.state === 'intro' && d.stateAge >= 0.9) { d.setState('play'); d.emit({ type: 'segment', index: d.seg.index, name: seg().name, id: seg().id, checkpoint: true }); hint('climb'); }
    const playing = d.state === 'play';
    bellClock += dt;
    if (bellClock >= BELL_S) { bellClock -= BELL_S; if (playing) ring(); }
    const events = stepPlatformBody(body, { x: input.x, jump: input.jump, jumpHeld: input.jumpHeld, dash: input.dash, duck: input.duck }, dt, world(0, dt));
    for (const e of events) {
      if (e.type === 'fell') { placeBody(body, body.lastSafe.x, body.lastSafe.y, 1); d.emit({ type: 'fall', source: 'fall' }); } else d.emit(e);
    }
    if (input.act && playing) punch();
    const box = hurtBox(body, d.tuning.hurt);
    // The rings run down the stones.
    for (const r of rings) {
      r.prevY = r.y;
      r.y -= ringSpeed() * dt;
      r.age += dt;
      const feet = body.y + 0.05;
      if (r.prevY > feet && r.y <= feet && body.grounded && vitals.inv <= 0 && body.dashInv <= 0 && playing) d.emit({ type: 'hit', source: 'bell-ring', from: { x: body.x, y: r.y } });
    }
    for (let i = rings.length - 1; i >= 0; i -= 1) if (rings[i].y < -4) rings.splice(i, 1);
    // The light rises (never more than a stretch below Butch's floor).
    if (playing && seg().light > 0 && d.segClock > 3) {
      hint('light');
      light += lightRate() * dt;
      if (body.y < light + 0.25) {
        if (vitals.inv <= 0) d.emit({ type: 'hit', source: 'light', from: { x: body.x, y: light } });
        // Lifted out of it onto the next ledge above.
        const above = TOWER_LEDGES.filter((l) => l.y > light + 1.5).sort((a, b) => a.y - b.y)[0];
        if (above) placeBody(body, clamp(body.x, above.x0 + 0.6, above.x1 - 0.6), above.y, body.facing);
        light = Math.min(light, body.y - 3);
      }
    }
    // Counterweights.
    if (playing && seg().id === 'rising-light') {
      weightClock -= dt;
      if (weightClock <= 0) { weightClock = d.tele(TOWER.weightEvery) * (d.tuning.thin ? 1.4 : 1); dropWeight(); }
    }
    for (const w of weights) {
      w.age += dt;
      if (!w.falling && w.age >= w.warn) { w.falling = true; w.y = body.y + 11; d.emit({ type: 'weight-drop', x: w.x }); }
      if (w.falling) {
        w.y -= d.pace(TOWER.weightSpeed) * dt;
        if (!w.spent && vitals.inv <= 0 && body.dashInv <= 0 && circleHitsBox(w.x, w.y, TOWER.weightR * 0.9, box)) { w.spent = true; d.emit({ type: 'hit', source: 'counterweight', from: { x: w.x, y: w.y } }); }
      }
    }
    for (let i = weights.length - 1; i >= 0; i -= 1) if (weights[i].falling && weights[i].y < body.y - 14) weights.splice(i, 1);
    // A stretch is climbed when Butch stands on its top floor.
    const s = seg();
    if (playing && s.id !== 'on-the-bell') {
      d.seg.setProgress(Math.min(0.99, clamp((body.y - s.y0) / (s.y1 - s.y0), 0, 1)));
      if (body.grounded && body.y >= s.y1 - 0.01) {
        d.completeSegment();
        if (seg().id === 'swing') hint('swing');
        if (seg().id === 'on-the-bell') { hint('bell'); rings.length = 0; weights.length = 0; }
        light = Math.min(light, seg().y0 - TOWER.lightBelow);
      }
    }
    if (d.state === 'finisher' && d.stateAge >= 1.8) { d.setState('done'); d.emit({ type: 'finished', piece: d.id }); }
    if (teach && d.clock > teach.until) teach = null;
    return d.flush();
  };

  const checkpoint = (rollback) => {
    rings.length = 0;
    weights.length = 0;
    d.cancelTimers();
    if (rollback === 'segment') {
      d.seg.restart();
      punches = 0;
      const s = seg();
      placeBody(body, -3, s.y0, 1);
      light = s.y0 - TOWER.lightBelow;
      return { x: body.x, y: body.y, rolledBack: true };
    }
    placeBody(body, body.lastSafe.x, Math.max(body.lastSafe.y, seg().y0), 1);
    light = Math.min(light, body.y - 5);
    return { x: body.x, y: body.y, rolledBack: false };
  };

  return pieceApi(d, {
    body,
    get hazards() { return [...rings.map((r) => ({ ...r, kind: 'ring' })), ...weights.map((w) => ({ ...w, kind: 'weight' }))]; },
    rings,
    weights,
    get light() { return light; },
    get bellClock() { return bellClock; },
    get bells() { return bells; },
    get punches() { return punches; },
    swingX: (id, ahead = 0) => swingX(TOWER_SWINGS.find((s) => s.id === id), clock + ahead),
    update,
    checkpoint,
    onHurt() { body.punch = 0; },
    jumpToSegment(i) {
      d.seg.jump(i);
      rings.length = 0; weights.length = 0; punches = 0;
      const s = seg();
      placeBody(body, -3, s.y0, 1);
      light = s.y0 - TOWER.lightBelow;
      if (d.state === 'intro') d.setState('play');
    },
    forecast(seen) {
      const rs = rings.map((r) => ({ ...r }));
      const ws = (seen ?? weights).filter((w) => w.kind === 'weight' || w.warn !== undefined).map((w) => ({ ...w }));
      const toBell = BELL_S - bellClock;
      const willRing = seg().id !== 'on-the-bell' && (bells >= 1 || seg().id !== 'tower');
      return {
        world: (t) => world(t, 1 / 30),
        hits(b, t) {
          const feet = b.y + 0.05;
          for (const r of rs) {
            const y0 = r.y - ringSpeed() * Math.max(0, t - 1 / 30);
            const y1 = r.y - ringSpeed() * t;
            if (y0 > feet && y1 <= feet + 0.1 && b.grounded) return 'bell-ring';
          }
          if (willRing && t > toBell) {
            const y1 = TOWER.bellY - ringSpeed() * (t - toBell);
            const y0 = TOWER.bellY - ringSpeed() * Math.max(0, t - toBell - 1 / 30);
            if (y0 > feet && y1 <= feet + 0.1 && b.grounded) return 'bell-ring';
          }
          if (lightRate() > 0 && b.y < light + lightRate() * t + 0.4) return 'light';
          const box = hurtBox(b, 1);
          for (const w of ws) {
            const fallT = t - (w.warn - w.age);
            if (fallT < 0) continue;
            const y = (w.falling ? w.y : b.y + 11) - d.pace(TOWER.weightSpeed) * (w.falling ? t : fallT);
            if (b.dashInv <= 0 && circleHitsBox(w.x, y, TOWER.weightR + 0.15, box)) return 'counterweight';
          }
          return null;
        },
      };
    },
    // What to do now, in a line (the plaque): under the bell, the strike's count-down.
    objective() {
      if (d.state !== 'play' || seg().id !== 'on-the-bell') return null;
      const next = Math.max(0, BELL_S - bellClock).toFixed(1);
      const count = `${punches} / ${TOWER.punches}`;
      if (Math.abs(body.x) > TOWER.punchReach) return `Walk under the bell, to the middle of the belfry. Then E as it strikes · ${count}`;
      return `Under the bell: E as it strikes · ${next} s · ${count}`;
    },
    hint() {
      if (d.state === 'intro' || d.state === 'done') return '';
      return teach ? TOWER_HINTS[teach.kind] ?? '' : '';
    },
    snapshot() {
      return {
        ...d.snapshotBase(), bell: +bellClock.toFixed(2), bells, light: +light.toFixed(2), punches,
        body: { x: +body.x.toFixed(2), y: +body.y.toFixed(2), grounded: body.grounded },
        rings: rings.map((r) => +r.y.toFixed(1)), weights: weights.length,
      };
    },
  });
}
