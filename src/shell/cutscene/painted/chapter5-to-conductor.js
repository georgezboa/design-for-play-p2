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

// Where things are in George's paintings (stage units, measured round 9); the second set is for the stand-ins.
// C5C-gallery / -rails: six pendant lamps down the middle of the gallery, nearest first; Butch from behind
// (≈ 330 tall, feet at y ≈ 650) holding his lantern up at the right
const GALLERY = geometry('C5C-gallery', {
  lamps: [[800, 40, 120], [800, 106, 95], [798, 152, 75], [798, 202, 58], [798, 236, 45], [798, 265, 36]],
  butch: [858, 378], figure: { x: 790, y: 650, h: 330, painted: true },
}, {
  lamps: [[800, 120], [800, 205], [800, 262], [800, 300], [800, 326], [800, 344]].map(([x, y], i) => [x, y, 120 - i * 16]),
  butch: [800, 560], figure: { x: 800, y: 700, h: 190, painted: false },
});
// C5C-conductor: the lit doorway behind him
const CONDUCTOR = geometry('C5C-conductor', { pool: [800, 300, 280] }, { pool: [1080, 380, 260] });
// C5C-face: the warm light comes from the lower left, where the punch is
const FACE = geometry('C5C-face', { lantern: [430, 640] }, { lantern: [800, 760] });
// C5C-raise: Butch's raised lantern, the Conductor in the carriage door; `face` is the rect of the close-up's
// framing on him (his cap ≈ y 148, chin ≈ y 235) for the pull back out of it
const RAISE = geometry('C5C-raise', { lantern: [765, 215], pool: [965, 330], face: [797, 127, 336, 168] },
  { lantern: [300, 300], pool: [1100, 360], face: null });
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
  lampGlow(c, GALLERY.butch[0], GALLERY.butch[1], 140, { alpha: 0.28, env, seed: 9 });
  vignette(c, { alpha: 0.4 });
}

function shotStack(c, t, w, h, env) {
  const f = GALLERY.figure;
  drawWorldsStack(c, t * STACK_S, env, {
    backdrop: 'C5C-rails', dim: 0.55, arrivals: STACK_PAPERS.length >= 4 ? STACK_PAPERS : undefined,
    butch: f, figure: !f.painted, lantern: f.painted ? GALLERY.butch : null,
  });
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
      transition: { type: 'zoom', duration: 1.3, rect: linkRect('C5C-face', [CONDUCTOR.pool[0] - 110, CONDUCTOR.pool[1] - 110, 220, 110]), reveal: [0.2, 0.7], feather: 0.16 },
    },
    {
      id: 'close',
      draw: shotFace,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.02 }, to: { x: 0.5, y: 0.46, zoom: 1.12 } },
      transition: { type: 'pull', duration: 1.2, rect: RAISE.face ?? [RAISE.pool[0] - 120, RAISE.pool[1] - 110, 240, 120], reveal: [0.1, 0.55] },
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
