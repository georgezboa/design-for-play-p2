// Chapter 3 → Chapter 4, painted (round 9; docs/CUTSCENES_PAINTED.md §4).
//
// 1 seat-43: leaving Echo City at dusk, the low sun striping the carriage;
//   seat 43 beside Butch is empty. Into the window —
// 2 colour-drains: — the West at dusk drains to pencil lines on paper.
// 3 rosas-drawing: Rosa's drawing on a table: ROSA in the corner.
// 4 filed: the archive's grey wash sweeps across it, and FILED stamps down.
// 5 still-red: the train slows into the unfinished pencil drawing, and one
//   fleck of red blooms at the hedge.

import drawn from '../scenes/chapter3To4.js';
import {
  bloom, drawPair, drawPlate, drawStamp, drawWindowView, drawWords, lampGlow, ramp, sway, vignette, windowLayout,
} from './kit.js';
import { cueTimes, geometry, paintedCutscene } from './scene.js';

const SEAT = geometry('C34-seat', { plate: { x: 1120, y: 470, w: 60 }, floor: [0, 560, 1600, 240] }, { plate: { x: 1060, y: 694, w: 60 }, floor: [0, 560, 1600, 240], glass: [380, 90, 840, 300] });
const ROSA = geometry('C34-rosa', { sign: { x: 1180, y: 620, rot: -0.08, size: 54 }, stamp: [820, 400] }, { sign: { x: 1210, y: 640, rot: -0.08, size: 48 }, stamp: [820, 400] });
const ARRIVE = geometry('C34-arrive', { hedge: [1150, 600, 110] }, { hedge: [1040, 560, 110] });
const THUD = cueTimes(drawn, 'filed', 'thud')[0] ?? 4.5;
const FILED_S = drawn.shots.find((s) => s.id === 'filed').duration;

function poleShadows(c, t, env, rect) {
  // telegraph poles going by outside throw their shadows across the sun stripes
  if (env.reducedMotion) return;
  const [x, y, w, h] = rect;
  const period = 1.1;
  const phase = (env.wall / period) % 1;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.fillStyle = 'rgba(10, 4, 2, 0.28)';
  for (let i = -1; i < 3; i++) {
    const px = x + w - ((phase + i) * w * 0.7);
    c.beginPath();
    c.moveTo(px, y);
    c.lineTo(px + 26, y);
    c.lineTo(px - 60, y + h);
    c.lineTo(px - 86, y + h);
    c.closePath();
    c.fill();
  }
  c.restore();
}

function shotSeat(c, t, w, h, env) {
  c.save();
  sway(c, env, { amp: 0.6 });
  const L = windowLayout('C34-seat', { glass: SEAT.glass });
  drawWindowView(c, 'C34-seat', [{ id: 'C34-dusk', x: 0 }, { id: 'C34-dusk', x: L.vw }], { glass: SEAT.glass, scroll: (t * 0.8 + (env.reducedMotion ? 0 : 0)) * L.vw });
  drawWords(c, '43', { x: SEAT.plate.x, y: SEAT.plate.y }, { face: 'print', size: SEAT.plate.w * 0.5, weight: 600, ink: '#2b1d12', tracking: 0.08, fade: 0.85 });
  poleShadows(c, t, env, SEAT.floor);
  c.restore();
  vignette(c, { alpha: 0.32 });
}

function insetOf(glass) {
  const [gx, gy, gw, gh] = glass;
  const wd = Math.min(gw, gh * 2) * 0.96;
  return [gx + gw / 2 - wd / 2, gy + gh / 2 - wd / 4, wd, wd / 2];
}

function shotDrains(c, t, w, h) {
  // the colour goes out of the country from the far side, leaving its lines
  drawPair(c, 'C34-dusk', 'C34-dusk-pencil', ramp(t, 0.12, 0.85), { mask: 'wipe', dir: 'left', band: 260, seed: 3 });
  vignette(c, { alpha: 0.25 * (1 - ramp(t, 0.3, 1)) });
}

function signature(c, k, fade = 1) {
  const g = ROSA.sign;
  drawWords(c, 'ROSA', { x: g.x, y: g.y, rot: g.rot }, { face: 'hand', size: g.size, weight: 700, ink: 'rgba(176, 52, 42, 0.9)', tracking: 0.12, reveal: k, fade, jitter: 3, seed: 61 });
}

function shotRosa(c, t, w, h, env) {
  drawPlate(c, 'C34-rosa');
  signature(c, ramp(t, 0.25, 0.6));
  lampGlow(c, 260, 120, 640, { alpha: 0.14, env });
  vignette(c, { alpha: 0.35 });
}

function shotFiled(c, t, w, h, env) {
  const s = t * FILED_S;
  const wash = ramp(t, 0.06, 0.52);
  drawPair(c, 'C34-rosa', 'C34-rosa-grey', wash, { mask: 'wipe', dir: 'right', band: 240, seed: 7, slant: 120 });
  signature(c, 1, 1 - 0.75 * wash);
  drawStamp(c, 'FILED', ROSA.stamp[0], ROSA.stamp[1], ramp(s, THUD - 0.25, THUD + 0.6), { size: 92, rot: -0.14 });
  lampGlow(c, 260, 120, 640, { alpha: 0.12, env });
  vignette(c, { alpha: 0.35 });
}

function shotStillRed(c, t, w, h) {
  drawPlate(c, 'C34-arrive');
  const [x, y, r] = ARRIVE.hedge;
  bloom(c, x, y, r, ramp(t, 0.42, 0.9), { seed: 77 });
  vignette(c, { alpha: 0.18 });
}

const PLATES = ['C34-seat', 'C34-dusk', 'C34-dusk-pencil', 'C34-rosa', 'C34-rosa-grey', 'C34-arrive'];

export const chapter3To4 = paintedCutscene(drawn, {
  plates: PLATES,
  shots: [
    {
      id: 'seat-43',
      draw: shotSeat,
      camera: { from: { x: 0.56, y: 0.55, zoom: 1.1 }, to: { x: 0.5, y: 0.45, zoom: 1.16 }, still: { x: 0.52, y: 0.5, zoom: 1.1 } },
      transition: { type: 'zoom', duration: 1.4, rect: insetOf(windowLayout('C34-seat', { glass: SEAT.glass }).glass), reveal: [0.15, 0.6], feather: 0.12 },
    },
    {
      id: 'colour-drains',
      draw: shotDrains,
      camera: { from: { x: 0.45, y: 0.5, zoom: 1.08 }, to: { x: 0.55, y: 0.5, zoom: 1.12 }, still: { x: 0.5, y: 0.5, zoom: 1.08 } },
      transition: { type: 'fade', duration: 1.2 },
    },
    {
      id: 'rosas-drawing',
      draw: shotRosa,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.02 }, to: { x: 0.53, y: 0.53, zoom: 1.12 } },
      transition: { type: 'cut' },
    },
    {
      id: 'filed',
      draw: shotFiled,
      camera: { from: { x: 0.53, y: 0.53, zoom: 1.12 }, to: { x: 0.52, y: 0.5, zoom: 1.2 } },
      transition: { type: 'ink', duration: 1.3 },
    },
    {
      id: 'still-red',
      draw: shotStillRed,
      camera: { from: { x: 0.42, y: 0.5, zoom: 1.06 }, to: { x: ARRIVE.hedge[0] / 1600, y: ARRIVE.hedge[1] / 800 - 0.05, zoom: 1.45 }, still: { x: 0.5, y: 0.5, zoom: 1.1 } },
    },
  ],
});

export default chapter3To4;
