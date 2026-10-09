// Chapter 5 → the finale (0–4 stones), painted (round 9; docs/CUTSCENES_PAINTED.md §6).
//
// 1 lamps-out: the gallery's six lamps go out one by one; the floor's brass
//   inlay surfaces as rails.
// 2 worlds-stack: the worlds come in round Butch as Chapter 1's windows.
// 3 the-conductor: at the far end, the Conductor: "Tickets, please." Into his face —
// 4 close: "The line runs while someone rides it. You are the someone."
// 5 raises-lamp: Butch raises his lantern. Black, into Movement I.

import drawn from '../scenes/chapter5-to-conductor.js';
import { drawPair, drawPlate, lampGlow, linkRect, ramp, vignette } from './kit.js';
import { cueTimes, geometry, paintedCutscene } from './scene.js';
import { drawWorldsStack } from './worlds.js';

const GALLERY = geometry('C5C-gallery', {
  lamps: [[800, 120], [800, 205], [800, 262], [800, 300], [800, 326], [800, 344]].map(([x, y], i) => [x, y, 120 - i * 16]),
  butch: [800, 560],
});
const CONDUCTOR = geometry('C5C-conductor', { pool: [800, 330, 260] }, { pool: [1080, 380, 260] });
const FACE = geometry('C5C-face', { lantern: [800, 760] });
const RAISE = geometry('C5C-raise', { lantern: [420, 230], pool: [1000, 330] }, { lantern: [300, 300], pool: [1100, 360] });
const PUNCHES = cueTimes(drawn, 'lamps-out', 'punch');
const LAMPS_S = drawn.shots.find((s) => s.id === 'lamps-out').duration;
const STACK_PAPERS = cueTimes(drawn, 'worlds-stack', 'paper');
const STACK_S = drawn.shots.find((s) => s.id === 'worlds-stack').duration;

/** When lamp i goes out (shot seconds): one per punch, the last two together. */
const outAt = (i) => PUNCHES[Math.min(i, PUNCHES.length - 1)] ?? 1 + i;

function shotLampsOut(c, t, w, h, env) {
  const s = t * LAMPS_S;
  const out = GALLERY.lamps.reduce((n, _, i) => n + ramp(s, outAt(i), outAt(i) + 0.35), 0);
  drawPair(c, 'C5C-gallery', 'C5C-rails', out / GALLERY.lamps.length, { mask: 'fade' });
  GALLERY.lamps.forEach(([x, y, r], i) => lampGlow(c, x, y, r, { alpha: 0.32 * (1 - ramp(s, outAt(i), outAt(i) + 0.25)), env, seed: i }));
  lampGlow(c, GALLERY.butch[0], GALLERY.butch[1], 160, { alpha: 0.28, env, seed: 9 });
  vignette(c, { alpha: 0.4 });
}

function shotStack(c, t, w, h, env) {
  drawWorldsStack(c, t * STACK_S, env, { backdrop: 'C5C-rails', dim: 0.55, arrivals: STACK_PAPERS.length >= 4 ? STACK_PAPERS : undefined });
  vignette(c, { alpha: 0.4 });
}

function shotConductor(c, t, w, h, env) {
  drawPlate(c, 'C5C-conductor');
  const [x, y, r] = CONDUCTOR.pool;
  lampGlow(c, x, y, r, { alpha: 0.22, env, flicker: 0.04 });
  vignette(c, { alpha: 0.42 });
}

function shotFace(c, t, w, h, env) {
  drawPlate(c, 'C5C-face');
  lampGlow(c, FACE.lantern[0], FACE.lantern[1], 520, { alpha: 0.16, env, flicker: 0.12 });
  vignette(c, { alpha: 0.5 });
}

function shotRaise(c, t, w, h, env) {
  drawPlate(c, 'C5C-raise');
  const flare = ramp(t, 0.1, 0.45);
  lampGlow(c, RAISE.lantern[0], RAISE.lantern[1], 260 + 260 * flare, { alpha: 0.3 + 0.3 * flare, env });
  lampGlow(c, RAISE.pool[0], RAISE.pool[1], 200, { alpha: 0.15, env });
  vignette(c, { alpha: 0.45 });
}

function shotBlack(c, t, w, h) {
  c.fillStyle = '#020306';
  c.fillRect(0, 0, w, h);
}

const PLATES = [
  'C5C-gallery', 'C5C-rails', 'C5C-conductor', 'C5C-face', 'C5C-raise',
  'A0-office', 'C12-terminal', 'C23-echo', 'C34-arrive', 'butch:lantern', 'chrome:bezel',
];

export const chapter5ToConductor = paintedCutscene(drawn, {
  plates: PLATES,
  shots: [
    {
      id: 'lamps-out',
      draw: shotLampsOut,
      camera: { from: { x: 0.5, y: 0.45, zoom: 1.08 }, to: { x: 0.5, y: 0.5, zoom: 1.2 } },
      transition: { type: 'ink', duration: 1.1 },
    },
    {
      id: 'worlds-stack',
      draw: shotStack,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1 }, to: { x: 0.5, y: 0.5, zoom: 1.06 } },
      transition: { type: 'fade', duration: 1.1 },
    },
    {
      id: 'the-conductor',
      draw: shotConductor,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.02 }, to: { x: CONDUCTOR.pool[0] / 1600, y: CONDUCTOR.pool[1] / 800, zoom: 1.3 }, still: { x: 0.5, y: 0.5, zoom: 1.1 } },
      transition: { type: 'zoom', duration: 1.3, rect: linkRect('C5C-face', [CONDUCTOR.pool[0] - 110, CONDUCTOR.pool[1] - 110, 220, 110]), reveal: [0.2, 0.7] },
    },
    {
      id: 'close',
      draw: shotFace,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.02 }, to: { x: 0.5, y: 0.46, zoom: 1.12 } },
      transition: { type: 'pull', duration: 1.2, rect: [RAISE.pool[0] - 120, RAISE.pool[1] - 110, 240, 120], reveal: [0.1, 0.55] },
    },
    {
      id: 'raises-lamp',
      draw: shotRaise,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.06 }, to: { x: 0.48, y: 0.46, zoom: 1.16 } },
      transition: { type: 'cut' },
    },
    { id: 'black', draw: shotBlack },
  ],
});

export default chapter5ToConductor;
