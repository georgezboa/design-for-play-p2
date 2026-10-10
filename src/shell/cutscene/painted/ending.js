// The normal ending, painted (round 9; docs/CUTSCENES_PAINTED.md §8).
//
// 1 worlds-fold: the stacked worlds fold back, window by window, into one carriage.
// 2 the-walk: Butch walks the length of the train, lamp in hand.
// 3 next-carriage: one carriage ahead, a rose scarf by the window; the seat beside her empty.
// 4 beside-her: he sits down beside her; two lamps pass outside and sweep
//   their light across them. Her reflection is only lamplight.
// 5 viaduct: the night service crosses the viaduct from the opening and runs
//   on into the dark. Then the STATUS: OPEN card.

import drawn from '../scenes/ending.js';
import {
  drawFigure, drawPair, drawPlate, lampGlow, lampsDown, lerp, lightSweep, rain, ramp, smooth, sway, vignette, walkFrame,
} from './kit.js';
import { cueTimes, geometry, paintedCutscene } from './scene.js';
import { drawWorldsFold } from './worlds.js';

// Where things are in George's paintings (stage units, measured round 9); the second set is for the stand-ins.
// END-walk-a / -b side by side (b at x + 1600): the pendant lamps, and the aisle runner he walks along — in
// front of the seats, so a standing man's head is about at the windows (sill ≈ y 360, floor ≈ y 600 there)
const WALK = geometry('END-walk-a', { floor: 668, butch: 430, lamps: [[390, 108], [945, 110], [2107, 110], [2685, 110]] },
  { floor: 640, butch: 230, lamps: [[300, 160], [1000, 160], [1900, 160], [2600, 160]] });
// END-mara / -beside: the lamp's reflection in the dark window behind them, the window, his lantern on the floor
const SEATS = geometry('END-mara', { lamp: [718, 115], window: [525, 0, 570, 300], lantern: [735, 692] },
  { lamp: [520, 140], window: [900, 120, 600, 380], lantern: null });
const VIADUCT = geometry('OP-viaduct', { deckY: 288, carriage: 250 }, { deckY: 668, carriage: 300 });
const FOLD_S = drawn.shots.find((s) => s.id === 'worlds-fold').duration;
const WALK_S = drawn.shots.find((s) => s.id === 'the-walk').duration;
const BESIDE_S = drawn.shots.find((s) => s.id === 'beside-her').duration;
const PAPERS = cueTimes(drawn, 'worlds-fold', 'paper');
const SIT = cueTimes(drawn, 'beside-her', 'thud')[0] ?? 1.9;

function shotFold(c, t, w, h, env) {
  const s = t * FOLD_S;
  drawWorldsFold(c, s, env, { carriage: 'END-walk-a', departures: PAPERS.length >= 4 ? PAPERS : undefined, open: ramp(s, FOLD_S - 2.6, FOLD_S - 0.4) });
  vignette(c, { alpha: 0.35 });
}

function shotWalk(c, t, w, h, env) {
  // the two halves side by side; the camera walks with him
  const pan = smooth(t) * 1600 * 0.9;
  c.save();
  sway(c, env, { amp: 0.7 });
  drawPlate(c, 'END-walk-a', { x: -pan });
  drawPlate(c, 'END-walk-b', { x: 1600 - pan });
  WALK.lamps.forEach(([x, y], i) => lampGlow(c, x - pan, y, 200, { alpha: 0.24, env, seed: i }));
  const walked = 340 + t * 1900;
  const x = walked - pan;
  drawFigure(c, walkFrame('butch', walked, WALK.butch), x, WALK.floor, WALK.butch, { light: 0.85, glow: { alpha: 0.4, env } });
  c.restore();
  vignette(c, { alpha: 0.35 });
}

function shotNext(c, t, w, h, env) {
  c.save();
  sway(c, env, { amp: 0.5 });
  drawPlate(c, 'END-mara');
  lampGlow(c, SEATS.lamp[0], SEATS.lamp[1], 220, { alpha: 0.24, env });
  c.restore();
  vignette(c, { alpha: 0.4 });
}

function shotBeside(c, t, w, h, env) {
  const s = t * BESIDE_S;
  c.save();
  sway(c, env, { amp: 0.5 });
  const sat = ramp(s, SIT - 0.7, SIT + 0.2);
  drawPair(c, 'END-mara', 'END-beside', sat, { mask: 'fade' });
  lampGlow(c, SEATS.lamp[0], SEATS.lamp[1], 220, { alpha: 0.22, env });
  // his lantern, set down on the floor between them
  if (SEATS.lantern) lampGlow(c, SEATS.lantern[0], SEATS.lantern[1], 190, { alpha: 0.26 * sat, env, flicker: 0.1 });
  const [wx, wy, ww, wh] = SEATS.window;
  rain(c, env, { rect: { x: wx, y: wy, w: ww, h: wh }, alpha: 0.25 });
  // two lamps go by outside: their light sweeps across the window and over them
  [[4.2, 1.3], [6.6, 1.5]].forEach(([at, len]) => {
    const k = ramp(s, at, at + len);
    lightSweep(c, k, { angle: -0.3, width: 320, alpha: 0.3 });
  });
  c.restore();
  vignette(c, { alpha: 0.4 });
}

function shotViaduct(c, t, w, h, env) {
  drawPlate(c, 'OP-viaduct');
  const head = lerp(500, 2600, t);
  for (let i = 0; i < 4; i++) {
    const x = head - (i + 0.5) * VIADUCT.carriage;
    lampGlow(c, x, VIADUCT.deckY - VIADUCT.carriage * 0.06, VIADUCT.carriage * 0.42, { alpha: 0.16, flicker: 0.02, env, seed: i });
    drawFigure(c, 'train:lit', x, VIADUCT.deckY, VIADUCT.carriage);
  }
  rain(c, env);
  lampsDown(c, ramp(t, 0.7, 1) * 0.8);
  vignette(c, { alpha: 0.38 });
}

const PLATES = [
  'END-walk-a', 'END-walk-b', 'END-mara', 'END-beside', 'OP-viaduct', 'train:lit', 'chrome:bezel',
  'A0-office', 'C12-terminal', 'C23-echo', 'C34-arrive', ...Array.from({ length: 8 }, (_, i) => `butch:walk-${i + 1}`),
];

export const ending = paintedCutscene(drawn, {
  plates: PLATES,
  shots: [
    {
      id: 'worlds-fold',
      draw: shotFold,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.5, y: 0.5, zoom: 1 } },
      transition: { type: 'fade', duration: 0.8 },
    },
    {
      id: 'the-walk',
      draw: shotWalk,
      camera: { from: { x: 0.5, y: 0.56, zoom: 1.12 }, to: { x: 0.5, y: 0.56, zoom: 1.12 } },
      transition: { type: 'slide', duration: 1.1 },
    },
    {
      id: 'next-carriage',
      draw: shotNext,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.02 }, to: { x: 0.52, y: 0.52, zoom: 1.16 } },
      transition: { type: 'cut' },
    },
    {
      id: 'beside-her',
      draw: shotBeside,
      camera: { from: { x: 0.52, y: 0.52, zoom: 1.16 }, to: { x: 0.52, y: 0.5, zoom: 1.24 } },
      transition: { type: 'slide', duration: 1.2 },
    },
    {
      id: 'viaduct',
      draw: shotViaduct,
      camera: { from: { x: 0.45, y: (VIADUCT.deckY - VIADUCT.carriage * 0.4) / 800, zoom: 1.3 }, to: { x: 0.62, y: 0.46, zoom: 1.05 }, still: { x: 0.5, y: 0.45, zoom: 1.1 } },
    },
  ],
});

export default ending;
