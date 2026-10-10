// Chapter 1 → Chapter 2, painted (round 9; docs/CUTSCENES_PAINTED.md §2).
//
// 1 pulls-away: in the carriage, Bellwether halt slides away behind the glass;
//   the orchard case stays on the rack.
// 2 city-ticket: in his hand, CITY LINE · ONE WAY · 1978. Pull back to —
// 3 city-ahead: — the window, where the night fields run into the rain city
//   and its five signs come on one after another, on the bells. Through the
//   glass into —
// 4 city-terminal: CITY TERMINAL. Butch steps down; on a far roof a rose scarf
//   turns away and is gone.

import drawn from '../scenes/chapter1To2.js';
import {
  drawFigure, drawPlate, drawWindowView, drawWords, lampGlow, rain, ramp, signLight, smooth, sway, vignette, walkFrame, windowLayout,
} from './kit.js';
import { cueTimes, geometry, paintedCutscene } from './scene.js';

// Where things are in George's paintings (stage units, measured round 9); the second set is for the stand-ins.
const RACK = geometry('C12-rack', { lamp: [1452, 236] }, { lamp: [1340, 250], glass: [430, 300, 740, 300] });
// C12-ticket: the blank ticket tilts up to the right (≈ 0.2 rad), its punch hole at the right end, the thumb under it
const TICKET = geometry('C12-ticket', { ticket: { x: 690, y: 211, w: 300, rot: 0.2 }, lamp: [58, 322] },
  { ticket: { x: 882, y: 340, w: 380, rot: -0.2 }, lamp: [120, 60] });
const WINDOW = geometry('C12-window', { lamp: [96, 150] }, { lamp: [160, 300], glass: [420, 160, 760, 470] });
// the city's five blank billboards, left to right as the city runs in (C12-city stage units)
const CITY = geometry('C12-city', {
  signs: [[328, 160, 94, 68], [555, 323, 90, 60], [690, 198, 162, 100], [1113, 158, 127, 77], [1337, 6, 223, 174]],
}, {
  signs: [[150, 300, 120, 60], [420, 220, 150, 70], [700, 330, 110, 50], [1210, 150, 110, 70], [1300, 280, 130, 60]],
});
// C12-terminal: the blank board under the canopy, the canopy lamp, the train's open door on the left, the wet
// platform (feet ≈ y 600; the bench, ≈ 1 m, is ≈ 115 tall there), a lit roof shed far right
const TERMINAL = geometry('C12-terminal', {
  board: { x: 700, y: 216, w: 250, rot: 0 }, lamp: [457, 158], door: [196, 598], floor: 600, butch: 235,
  mara: { x: 1362, y: 463, h: 46, exit: 1470 },
}, {
  board: { x: 1020, y: 250, w: 220, rot: 0 }, lamp: [170, 230], door: [230, 520], floor: 520, butch: 120,
  mara: { x: 1170, y: 380, h: 40, exit: 1250 },
});

const SIGN_COLORS = [[110, 214, 204], [255, 186, 110], [110, 214, 204], [255, 186, 110], [110, 214, 204]];
const BELLS = cueTimes(drawn, 'city-ahead', 'softBell');
const CITY_SECONDS = 9.4;

function shotPullsAway(c, t, w, h, env) {
  c.save();
  sway(c, env, { amp: 0.6 });
  // the halt slides away: slow at first, as the train gathers speed
  const L = windowLayout('C12-rack', { glass: RACK.glass });
  const scroll = L.vw * 0.95 * t * t;
  drawWindowView(c, 'C12-rack', [{ id: 'C12-halt-out', x: 0 }, { id: 'C12-fields', x: L.vw }], {
    glass: RACK.glass,
    scroll,
    over: (cc, layout) => rain(cc, env, { rect: { x: layout.glass[0], y: layout.glass[1], w: layout.glass[2], h: layout.glass[3] }, alpha: 0.35 }),
  });
  lampGlow(c, RACK.lamp[0], RACK.lamp[1], 280, { alpha: 0.3, env });
  c.restore();
  vignette(c, { alpha: 0.35 });
}

function shotTicket(c, t, w, h, env) {
  const g = TICKET.ticket;
  c.save();
  sway(c, env, { amp: 0.45 });
  drawPlate(c, 'C12-ticket');
  drawWords(c, ['CITY LINE', 'ONE WAY · 1978'], { x: g.x, y: g.y, rot: g.rot }, {
    face: 'print', size: g.w * 0.085, weight: 600, tracking: 0.16, leading: 1.6, ink: '#2b1d12', fade: 0.88,
  });
  lampGlow(c, TICKET.lamp[0], TICKET.lamp[1], 520, { alpha: 0.18, env });
  c.restore();
  vignette(c, { alpha: 0.4 });
}

function shotCityAhead(c, t, w, h, env) {
  c.save();
  sway(c, env, { amp: 0.5 });
  const L = windowLayout('C12-window', { glass: WINDOW.glass });
  const views = [{ id: 'C12-fields', x: 0 }, { id: 'C12-city', x: L.vw }];
  // the fields go by, then the city runs in and slows
  const scroll = L.vw * (0.05 + 1.0 * smooth(Math.min(1, t * 1.15)));
  const seconds = t * CITY_SECONDS;
  drawWindowView(c, 'C12-window', views, {
    glass: WINDOW.glass,
    scroll,
    blur: 0.15 * (1 - t),
    over: (cc, layout) => {
      CITY.signs.forEach(([x, y, sw, sh], i) => {
        const on = ramp(seconds, BELLS[i] ?? 9, (BELLS[i] ?? 9) + 0.6);
        if (on <= 0) return;
        const [sx, sy, k] = layout.point(views[1], x, y, scroll);
        signLight(cc, sx, sy, sw * k, sh * k, on, { color: SIGN_COLORS[i], env, seed: i + 3 });
      });
      rain(cc, env, { rect: { x: layout.glass[0], y: layout.glass[1], w: layout.glass[2], h: layout.glass[3] }, alpha: 0.3 });
    },
  });
  lampGlow(c, WINDOW.lamp[0], WINDOW.lamp[1], 320, { alpha: 0.24, env });
  c.restore();
  vignette(c, { alpha: 0.35 });
}

/** The 2 : 1 rect inside the window glass: the city the camera flies into. */
function glassInset() {
  const [gx, gy, gw, gh] = windowLayout('C12-window', { glass: WINDOW.glass }).glass;
  const wd = Math.min(gw, gh * 2) * 0.96;
  return [gx + gw / 2 - wd / 2, gy + gh / 2 - wd / 4, wd, wd / 2];
}

function shotTerminal(c, t, w, h, env) {
  const T = TERMINAL;
  const s = t * drawn.shots[3].duration;
  drawPlate(c, 'C12-terminal');
  lampGlow(c, T.lamp[0], T.lamp[1], 260, { alpha: 0.32, env });
  // CITY TERMINAL comes on as the train stops
  const lit = ramp(s, 0.6, 1.4);
  signLight(c, T.board.x - T.board.w / 2, T.board.y - T.board.w * 0.09, T.board.w, T.board.w * 0.18, lit, { color: [255, 214, 150], alpha: 0.4, env, seed: 9 });
  drawWords(c, 'CITY TERMINAL', { x: T.board.x, y: T.board.y, rot: T.board.rot }, {
    face: 'print', size: T.board.w * 0.085, weight: 600, tracking: 0.3, ink: `rgba(255, 228, 176, ${(0.35 + 0.6 * lit).toFixed(2)})`, blend: 'lighter',
  });
  // Butch steps down from the door and walks a few steps along the platform
  const walk = ramp(s, 2.2, 5.8);
  const x = T.door[0] + walk * T.butch * 1.6;
  const frame = walk > 0 && walk < 1 ? walkFrame('butch', walk * T.butch * 1.6, T.butch) : 'butch:stand';
  drawFigure(c, frame, x, T.floor, T.butch, { light: 0.82, alpha: ramp(s, 1.6, 2.4), glow: { alpha: 0.35, env } });
  // the rose scarf on the far roof: still, turning away, gone
  const m = T.mara;
  const turn = ramp(s, 4.4, 5.2);
  const leave = ramp(s, 5.4, 7.6);
  const mf = leave > 0 ? walkFrame('mara', leave * (m.exit - m.x), m.h) : turn > 0.5 ? 'mara:turn' : 'mara:back';
  drawFigure(c, mf, m.x + leave * (m.exit - m.x), m.y, m.h, { light: 0.7, alpha: 1 - ramp(s, 6.6, 7.8) });
  rain(c, env);
  vignette(c, { alpha: 0.3 });
}

const PLATES = [
  'C12-rack', 'C12-halt-out', 'C12-fields', 'C12-ticket', 'C12-window', 'C12-city', 'C12-terminal',
  'butch:stand', ...Array.from({ length: 8 }, (_, i) => `butch:walk-${i + 1}`),
  'mara:back', 'mara:turn', ...Array.from({ length: 6 }, (_, i) => `mara:walk-${i + 1}`),
];

export const chapter1To2 = paintedCutscene(drawn, {
  plates: PLATES,
  shots: [
    {
      id: 'pulls-away',
      draw: shotPullsAway,
      camera: { from: { x: 0.5, y: 0.52, zoom: 1.05 }, to: { x: 0.44, y: 0.44, zoom: 1.18 }, still: { x: 0.48, y: 0.48, zoom: 1.1 } },
      transition: { type: 'fade', duration: 1.1 },
    },
    {
      id: 'city-ticket',
      draw: shotTicket,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.53, y: 0.48, zoom: 1.16 } },
      transition: { type: 'pull', duration: 1.3, rect: [560, 520, 480, 240], reveal: [0.15, 0.6] },
    },
    {
      id: 'city-ahead',
      draw: shotCityAhead,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.5, y: 0.47, zoom: 1.2 }, still: { x: 0.5, y: 0.48, zoom: 1.1 } },
      transition: { type: 'zoom', duration: 1.5, rect: glassInset(), reveal: [0.15, 0.65], feather: 0.12 },
    },
    {
      id: 'city-terminal',
      draw: shotTerminal,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.02 }, to: { x: 0.58, y: 0.47, zoom: 1.2 }, still: { x: 0.52, y: 0.5, zoom: 1.1 } },
    },
  ],
});

export default chapter1To2;
