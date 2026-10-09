// Chapter 2 → Chapter 3, painted (round 9; docs/CUTSCENES_PAINTED.md §3).
//
// 1 just-made-it: the train pulls out in the rain, his coat caught in the
//   door; through the door's little window —
// 2 the-letter: — the letter by lantern light: Butch — … KEEP MOVING. — M.
// 3 filed-records: out of the window, a tunnel of filed records streams past;
//   the light grows at its end, white —
// 4 echo-city: — Echo City at 14:20, hard sun and dust; drift to the board,
//   and into it —
// 5 seat-43: two tickets, both for seat 43.

import drawn from '../scenes/chapter2To3.js';
import {
  clockHands, drawPlate, drawWindowView, drawWords, lampGlow, lightSweep, linkRect, motes, pages, rain, ramp, sway, vignette, windowLayout,
} from './kit.js';
import { geometry, paintedCutscene } from './scene.js';

const DOOR = geometry('C23-door', { window: [700, 250, 220, 110], lamp: [300, 160] }, { window: [1140, 240, 200, 100], lamp: [180, 120] });
const LETTER = geometry('C23-letter', { at: { x: 800, y: 400, rot: -0.03 }, w: 520, lamp: [1260, 560] }, { at: { x: 820, y: 360, rot: -0.04 }, w: 460, lamp: [1360, 640] });
const WINDOW = geometry('C12-window', {}, { glass: [420, 160, 760, 470] });
const ECHO = geometry('C23-echo', { clock: { x: 1060, y: 250, r: 46 }, sun: [0, 0, 1600, 520] }, { clock: { x: 1160, y: 238, r: 22 }, sun: [0, 0, 1600, 560] });
const BOARD = geometry('C23-board', {
  tickets: [{ x: 640, y: 420, rot: -0.05, w: 260, name: 'VELEZ, M.' }, { x: 990, y: 440, rot: 0.06, w: 260, name: 'M. VENN', stamp: 'DUPLICATE' }],
});

function shotJustMadeIt(c, t, w, h, env) {
  c.save();
  sway(c, env, { amp: 0.9, period: 2.6 });
  drawPlate(c, 'C23-door');
  lampGlow(c, DOOR.lamp[0] - t * 260, DOOR.lamp[1], 300, { alpha: 0.34, env });
  // the platform's lamps slide away behind as the train gathers speed
  lightSweep(c, 1 - ramp(t, 0.05, 0.6), { alpha: 0.18, width: 300, angle: -0.2 });
  lightSweep(c, 1 - ramp(t, 0.4, 0.95), { alpha: 0.14, width: 260, angle: -0.2 });
  c.restore();
  rain(c, env, { alpha: 0.55 });
  vignette(c, { alpha: 0.35 });
}

const LINES = [
  { text: 'Butch —', size: 0.075, ink: 'rgba(56, 32, 18, 0.85)', dy: -0.36, dx: -0.3 },
  { text: 'I made it through this city,', size: 0.052, ink: 'rgba(70, 44, 26, 0.62)', dy: -0.2, dx: -0.06 },
  { text: 'but I could not wait here.', size: 0.052, ink: 'rgba(70, 44, 26, 0.62)', dy: -0.1, dx: -0.08 },
  { text: 'If you are following me —', size: 0.052, ink: 'rgba(70, 44, 26, 0.62)', dy: 0.04, dx: -0.06 },
  { text: 'KEEP MOVING.', size: 0.11, ink: 'rgba(56, 32, 18, 0.92)', dy: 0.2, dx: 0, weight: 700 },
  { text: '— M.', size: 0.07, ink: 'rgba(56, 32, 18, 0.8)', dy: 0.36, dx: 0.3 },
];

function shotLetter(c, t, w, h, env) {
  const g = LETTER;
  c.save();
  sway(c, env, { amp: 0.4 });
  drawPlate(c, 'C23-letter');
  // the eye reads it down the page
  LINES.forEach((line, i) => {
    const reveal = ramp(t, 0.06 + i * 0.09, 0.16 + i * 0.09);
    if (reveal <= 0) return;
    const at = { x: g.at.x + line.dx * g.w, y: g.at.y + line.dy * g.w * 0.62, rot: g.at.rot };
    drawWords(c, line.text, at, { face: 'hand', size: g.w * line.size, weight: line.weight, ink: line.ink, tracking: 0.01, reveal, jitter: 1.1, seed: 20 + i });
  });
  lampGlow(c, g.lamp[0], g.lamp[1], 520, { alpha: 0.3, env, flicker: 0.1 });
  c.restore();
  vignette(c, { alpha: 0.45 });
}

function shotRecords(c, t, w, h, env) {
  c.save();
  sway(c, env, { amp: 1.2, period: 1.8 });
  const L = windowLayout('C12-window', { glass: WINDOW.glass });
  const views = [0, 1, 2, 3].map((i) => ({ id: 'C23-records', x: i * L.vw }));
  drawWindowView(c, 'C12-window', views, {
    glass: WINDOW.glass,
    scroll: t * L.vw * 2.6,
    blur: 0.7,
    over: (cc, layout) => {
      const [gx, gy, gw, gh] = layout.glass;
      pages(cc, env, [gx, gy, gw, gh], { count: 22, speed: 1400 });
      // the end of the tunnel: sunlight
      const sun = ramp(t, 0.55, 1);
      if (sun > 0) {
        const g = cc.createLinearGradient(gx + gw, 0, gx, 0);
        g.addColorStop(0, `rgba(255, 246, 222, ${(0.95 * sun).toFixed(3)})`);
        g.addColorStop(1, `rgba(255, 236, 200, ${(0.35 * sun * sun).toFixed(3)})`);
        cc.fillStyle = g;
        cc.fillRect(gx, gy, gw, gh);
      }
    },
  });
  c.restore();
  vignette(c, { alpha: 0.4 });
}

function shotEcho(c, t, w, h, env) {
  drawPlate(c, 'C23-echo');
  clockHands(c, ECHO.clock.x, ECHO.clock.y, ECHO.clock.r, 14, 20);
  motes(c, env, ECHO.sun, { count: 90, alpha: 0.4 });
  // the heat: the sun's glare settles as the eyes adjust
  c.save();
  c.fillStyle = `rgba(255, 248, 230, ${(0.35 * (1 - ramp(t, 0, 0.3))).toFixed(3)})`;
  c.fillRect(0, 0, w, h);
  c.restore();
  vignette(c, { alpha: 0.22 });
}

function shotSeat43(c, t, w, h, env) {
  drawPlate(c, 'C23-board');
  BOARD.tickets.forEach((tk, i) => {
    const on = ramp(t, 0.12 + i * 0.12, 0.3 + i * 0.12);
    drawWords(c, ['NIGHT SERVICE', 'SEAT 43', tk.name], { x: tk.x, y: tk.y, rot: tk.rot }, {
      face: 'print', size: tk.w * 0.075, weight: 600, tracking: 0.14, leading: 1.75, ink: '#2b1d12', fade: 0.9 * on, seed: 30 + i,
    });
  });
  motes(c, env, [0, 0, w, h], { count: 40, alpha: 0.3, seed: 44 });
  vignette(c, { alpha: 0.25 });
}

const PLATES = ['C23-door', 'C23-letter', 'C12-window', 'C23-records', 'C23-echo', 'C23-board'];

export const chapter2To3 = paintedCutscene(drawn, {
  plates: PLATES,
  shots: [
    {
      id: 'just-made-it',
      draw: shotJustMadeIt,
      camera: { from: { x: 0.46, y: 0.5, zoom: 1.08 }, to: { x: 0.54, y: 0.46, zoom: 1.2 }, still: { x: 0.5, y: 0.48, zoom: 1.1 } },
      transition: { type: 'zoom', duration: 1.4, rect: DOOR.window, reveal: [0.15, 0.65], feather: 0.15 },
    },
    {
      id: 'the-letter',
      draw: shotLetter,
      camera: { from: { x: 0.5, y: 0.48, zoom: 1.04 }, to: { x: 0.5, y: 0.52, zoom: 1.14 } },
      transition: { type: 'fade', duration: 1.1 },
    },
    {
      id: 'filed-records',
      draw: shotRecords,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.06 }, to: { x: 0.52, y: 0.5, zoom: 1.24 }, still: { x: 0.5, y: 0.5, zoom: 1.1 } },
      transition: { type: 'white', duration: 1.2 },
    },
    {
      id: 'echo-city',
      draw: shotEcho,
      camera: { from: { x: 0.42, y: 0.46, zoom: 1.04 }, to: { x: 0.6, y: 0.5, zoom: 1.18 }, still: { x: 0.5, y: 0.48, zoom: 1.08 } },
      transition: { type: 'zoom', duration: 1.4, rect: linkRect('C23-board', [1060, 300, 420, 210]), reveal: [0.2, 0.7] },
    },
    {
      id: 'seat-43',
      draw: shotSeat43,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1 }, to: { x: 0.52, y: 0.52, zoom: 1.14 } },
    },
  ],
});

export default chapter2To3;
