// Chapter 5 → THE LAST CARRIAGE (five stones), painted (round 9; docs/CUTSCENES_PAINTED.md §7).
//
// 1 five-stones: the five stones glow in his palm, one after another.
// 2 last-carriage: at the end of the museum, a carriage door that was never
//   on the timetable: LAST CARRIAGE. Through its little window —
// 3 one-seat: one seat, and above it a black ticket, never punched.
// 4 door-closes: he steps in; the door shuts. Black, into the fight.

import drawn from '../scenes/chapter5-to-black-knife.js';
import { drawPair, drawPlate, drawWords, lampGlow, plateInfo, ramp, signLight, vignette } from './kit.js';
import { cueTimes, geometry, paintedCutscene } from './scene.js';

// ember, grid, echo, pigment, black ticket: where they lie in the palm, and their light
const STONES = geometry('CBK-palm', {
  at: [[640, 440], [740, 400], [840, 410], [930, 450], [790, 500]],
}, {
  at: [[700, 470], [780, 430], [860, 440], [930, 480], [820, 520]],
});
const STONE_LIGHT = [[255, 110, 70], [170, 210, 150], [170, 210, 240], [255, 196, 110], [170, 120, 230]];
const DOOR = geometry('CBK-door', { plate: { x: 800, y: 300, w: 200 }, window: [740, 170, 120, 60] }, { plate: { x: 1210, y: 330, w: 150 }, window: [1150, 200, 140, 70] });
const SEAT = geometry('CBK-seat', { ticket: [800, 300, 150] });
const PALM_S = drawn.shots.find((s) => s.id === 'five-stones').duration;
const DOOR_S = drawn.shots.find((s) => s.id === 'door-closes').duration;
const GLOWS = [...cueTimes(drawn, 'five-stones', 'softBell'), ...cueTimes(drawn, 'five-stones', 'bell')].sort((a, b) => a - b);
const THUD = cueTimes(drawn, 'door-closes', 'thud')[0] ?? 5.3;

function shotStones(c, t, w, h, env) {
  const s = t * PALM_S;
  drawPlate(c, 'CBK-palm');
  STONES.at.forEach(([x, y], i) => {
    const on = ramp(s, (GLOWS[i] ?? 1 + i) - 0.1, (GLOWS[i] ?? 1 + i) + 0.5);
    lampGlow(c, x, y, 70 + 40 * on, { color: STONE_LIGHT[i], alpha: 0.12 + 0.4 * on, env, flicker: 0.08, seed: i });
  });
  vignette(c, { alpha: 0.5 });
}

function shotDoor(c, t, w, h, env) {
  drawPlate(c, 'CBK-door');
  const p = DOOR.plate;
  drawWords(c, 'LAST CARRIAGE', { x: p.x, y: p.y }, { face: 'print', size: p.w * 0.085, weight: 600, tracking: 0.26, ink: 'rgba(40, 26, 12, 0.92)', fade: 0.9 });
  const [wx, wy, ww, wh] = DOOR.window;
  signLight(c, wx, wy, ww, wh, 1, { color: [160, 190, 230], alpha: 0.18 + 0.08 * Math.sin((env.reducedMotion ? 0 : env.wall) * 2.3), env, seed: 3 });
  vignette(c, { alpha: 0.45 });
}

function shotSeat(c, t, w, h, env) {
  drawPlate(c, 'CBK-seat');
  const [x, y, tw] = SEAT.ticket;
  const size = plateInfo('CBK-ticket')?.size ?? [300, 160];
  const th = tw * (size[1] / size[0]);
  const wall = env.reducedMotion ? 0 : env.wall;
  const bob = Math.sin(wall * 1.3) * 8;
  const turn = Math.cos(wall * 0.6);
  c.save();
  c.translate(x, y + bob);
  c.scale(Math.max(0.08, Math.abs(turn)), 1);
  drawPlate(c, 'CBK-ticket', { x: -tw / 2, y: -th / 2, w: tw, h: th, alpha: ramp(t, 0.05, 0.3) });
  c.restore();
  lampGlow(c, x, y - 220, 260, { color: [190, 205, 230], alpha: 0.14, env });
  vignette(c, { alpha: 0.55 });
}

function shotCloses(c, t, w, h, env) {
  const s = t * DOOR_S;
  drawPair(c, 'CBK-door-open', 'CBK-door-shut', ramp(s, THUD - 0.5, THUD), { mask: 'fade' });
  const p = DOOR.plate;
  drawWords(c, 'LAST CARRIAGE', { x: p.x, y: p.y }, { face: 'print', size: p.w * 0.085, weight: 600, tracking: 0.26, ink: 'rgba(40, 26, 12, 0.92)', fade: 0.9 });
  vignette(c, { alpha: 0.45 + 0.3 * ramp(s, THUD, DOOR_S) });
}

function shotBlack(c, t, w, h) {
  c.fillStyle = '#020306';
  c.fillRect(0, 0, w, h);
}

const PLATES = ['CBK-palm', 'CBK-door', 'CBK-seat', 'CBK-ticket', 'CBK-door-open', 'CBK-door-shut'];

export const chapter5ToBlackKnife = paintedCutscene(drawn, {
  plates: PLATES,
  shots: [
    {
      id: 'five-stones',
      draw: shotStones,
      camera: { from: { x: 0.5, y: 0.52, zoom: 1.06 }, to: { x: 0.5, y: 0.55, zoom: 1.2 } },
      transition: { type: 'ink', duration: 1.1 },
    },
    {
      id: 'last-carriage',
      draw: shotDoor,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.02 }, to: { x: (DOOR.window[0] + DOOR.window[2] / 2) / 1600, y: (DOOR.window[1] + DOOR.window[3] / 2) / 800, zoom: 1.4 } },
      transition: { type: 'zoom', duration: 1.4, rect: DOOR.window, reveal: [0.2, 0.7], feather: 0.16 },
    },
    {
      id: 'one-seat',
      draw: shotSeat,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.5, y: 0.45, zoom: 1.14 } },
      transition: { type: 'pull', duration: 1.3, rect: DOOR.window, reveal: [0.1, 0.55] },
    },
    {
      id: 'door-closes',
      draw: shotCloses,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.1 }, to: { x: 0.5, y: 0.5, zoom: 1.04 } },
      transition: { type: 'cut' },
    },
    { id: 'black', draw: shotBlack },
  ],
});

export default chapter5ToBlackKnife;
