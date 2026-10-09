// Chapter 4 → Chapter 5, painted (round 9; docs/CUTSCENES_PAINTED.md §5).
//
// 1 dries-to-ink: following the painted train into the dark, its wet colour
//   dries into ink.
// 2 walnut-hall: the train stands in a vast walnut hall with brass doors.
// 3 cases-light: four display cases light one by one: his journey, filed.
//   Into the fourth —
// 4 pending: the accession card types itself: ACC. 1978-0412 · VELEZ, M. · PENDING.
// 5 one-answer: the Archivist, a shadow behind a brass lamp.

import drawn from '../scenes/chapter4To5.js';
import { drawPair, drawPlate, drawWords, lampGlow, linkRect, ramp, vignette } from './kit.js';
import { cueTimes, geometry, paintedCutscene } from './scene.js';

const HALL = geometry('C45-hall', { lamps: [[230, 300], [520, 280], [1080, 280], [1370, 300]], train: [300, 520] });
// the four cases (C45-cases stage units): [x, y, w, h] and the label plate under each
const CASES = geometry('C45-cases', {
  cases: [[150, 230, 260, 330], [520, 230, 260, 330], [890, 230, 260, 330], [1260, 230, 260, 330]],
  labels: [[280, 610], [650, 610], [1020, 610], [1390, 610]],
}, {
  cases: [[110, 60, 320, 640], [480, 60, 320, 640], [850, 60, 320, 640], [1220, 60, 320, 640]],
  labels: [[270, 740], [640, 740], [1010, 740], [1380, 740]],
});
const CARD = geometry('C45-card', { at: { x: 800, y: 400, rot: -0.02 }, w: 520 }, { at: { x: 882, y: 340, rot: -0.2 }, w: 420 });
const ARCHIVIST = geometry('C45-archivist', { lamp: [800, 420] }, { lamp: [380, 300] });
const LABELS = ['TICKET · CITY LINE', 'LETTER · "KEEP MOVING"', 'TWO TICKETS · SEAT 43', 'DRAWING · R. VELEZ'];
const CASES_S = drawn.shots.find((s) => s.id === 'cases-light').duration;
const PUNCHES = cueTimes(drawn, 'cases-light', 'punch');

function shotDries(c, t, w, h) {
  // the colour dries from the engine back, as the camera follows it into the dark
  drawPair(c, 'C45-wet', 'C45-ink', ramp(t, 0.15, 0.9), { mask: 'wipe', dir: 'right', band: 300, seed: 13 });
  vignette(c, { alpha: 0.3 + 0.3 * ramp(t, 0.4, 1) });
}

function shotHall(c, t, w, h, env) {
  drawPlate(c, 'C45-hall');
  HALL.lamps.forEach(([x, y], i) => lampGlow(c, x, y, 150, { alpha: 0.22, env, seed: i }));
  lampGlow(c, HALL.train[0], HALL.train[1], 220, { alpha: 0.3 * (1 - 0.5 * ramp(t, 0.6, 1)), env, seed: 9 });
  vignette(c, { alpha: 0.4 });
}

function shotCases(c, t, w, h, env) {
  const s = t * CASES_S;
  const rects = CASES.cases.map((r, i) => {
    const at = PUNCHES[i] ?? 1 + i * 1.6;
    return [...r, (at - 0.05) / CASES_S, (at + 0.6) / CASES_S];
  });
  drawPair(c, 'C45-cases', 'C45-cases-lit', t, { mask: 'rects', rects });
  CASES.cases.forEach(([x, y, cw, ch], i) => {
    const on = ramp(s, (PUNCHES[i] ?? 1 + i * 1.6) - 0.05, (PUNCHES[i] ?? 1 + i * 1.6) + 0.6);
    if (on <= 0) return;
    lampGlow(c, x + cw / 2, y + ch * 0.35, Math.max(cw, ch) * 0.7, { alpha: 0.2 * on, env, seed: 20 + i });
    const [lx, ly] = CASES.labels[i];
    drawWords(c, LABELS[i], { x: lx, y: ly }, { face: 'print', size: 13, weight: 600, tracking: 0.16, ink: 'rgba(38, 26, 14, 0.9)', fade: on });
  });
  vignette(c, { alpha: 0.4 });
}

function shotPending(c, t, w, h, env) {
  const g = CARD;
  drawPlate(c, 'C45-card');
  const lines = ['ACC. 1978-0412', 'VELEZ, M.', 'PENDING'];
  // a typewriter: the card types itself, then PENDING
  drawWords(c, lines.slice(0, 2), { x: g.at.x, y: g.at.y - g.w * 0.05, rot: g.at.rot }, {
    face: 'print', size: g.w * 0.06, weight: 500, tracking: 0.12, leading: 1.8, ink: '#2a1c12', reveal: ramp(t, 0.06, 0.4), fade: 0.9,
  });
  drawWords(c, 'PENDING', { x: g.at.x, y: g.at.y + g.w * 0.13, rot: g.at.rot }, {
    face: 'print', size: g.w * 0.075, weight: 700, tracking: 0.3, ink: '#8a2a1e', reveal: ramp(t, 0.42, 0.56), fade: 0.9,
  });
  lampGlow(c, 800, 80, 600, { alpha: 0.14, env });
  vignette(c, { alpha: 0.38 });
}

function shotArchivist(c, t, w, h, env) {
  drawPlate(c, 'C45-archivist');
  lampGlow(c, ARCHIVIST.lamp[0], ARCHIVIST.lamp[1], 360, { alpha: 0.3, env, flicker: 0.14 });
  vignette(c, { alpha: 0.48 });
}

const PLATES = ['C45-wet', 'C45-ink', 'C45-hall', 'C45-cases', 'C45-cases-lit', 'C45-card', 'C45-archivist'];

export const chapter4To5 = paintedCutscene(drawn, {
  plates: PLATES,
  shots: [
    {
      id: 'dries-to-ink',
      draw: shotDries,
      camera: { from: { x: 0.38, y: 0.5, zoom: 1.12 }, to: { x: 0.66, y: 0.5, zoom: 1.22 }, still: { x: 0.5, y: 0.5, zoom: 1.12 } },
      transition: { type: 'ink', duration: 1.2 },
    },
    {
      id: 'walnut-hall',
      draw: shotHall,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.02 }, to: { x: 0.5, y: 0.47, zoom: 1.16 } },
      transition: { type: 'slide', duration: 1.1 },
    },
    {
      id: 'cases-light',
      draw: shotCases,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.62, y: 0.46, zoom: 1.2 }, still: { x: 0.5, y: 0.5, zoom: 1.08 } },
      transition: { type: 'zoom', duration: 1.4, rect: linkRect('C45-card', [1250, 330, 280, 140]), reveal: [0.2, 0.7] },
    },
    {
      id: 'pending',
      draw: shotPending,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.02 }, to: { x: 0.5, y: 0.52, zoom: 1.12 } },
      transition: { type: 'slide', duration: 1.1 },
    },
    {
      id: 'one-answer',
      draw: shotArchivist,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.5, y: 0.48, zoom: 1.16 } },
    },
  ],
});

export default chapter4To5;
