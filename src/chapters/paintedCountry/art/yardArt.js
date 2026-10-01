// Chapter 4 // THE PAINTED COUNTRY — the six places that lend their colours.
//
// The yard (PigmentTrainScene) is a street of Rosa's drawing still in pencil,
// with exactly one thing in each place holding its colour: the bakery's
// awning, the station lantern, the orchard's sun flag, the mill garden, the
// public well, the family quilt. paintYardSource(index, colour) returns
//   pencil  the place, drawn (always shown);
//   live    the one coloured thing (it fades out when Butch borrows it).
// Canvas: YARD_SOURCE.w × YARD_SOURCE.h, centred on the place's x, its
// ground line at `ground` (local y).

import { HUE, INK, TAU, blob, handRect, hatch, pencil, rng, rule, scribble, wash, washBlob, washRect } from './pencilKit.js';
import { appleTree, artLayers, bush, fence } from './countryArt.js';

export const YARD_SOURCE = Object.freeze({ w: 240, h: 360, ground: 356 });

const CX = YARD_SOURCE.w / 2;
const G = YARD_SOURCE.ground;

function bakery(L, colour) {
  const { p } = L;
  const live = L.w$('live');
  const x0 = CX - 70; const x1 = CX + 70; const top = G - 168;
  pencil(p, handRect(x0, top, x1 - x0, G - top, { seed: 1, amp: 0.7 }), { closed: true, smooth: false, w: 1.8, seed: 2 });
  // a parapet with a carved board
  pencil(p, [[x0 - 6, top], [x0 - 6, top - 14], [x1 + 6, top - 14], [x1 + 6, top]], { smooth: false, w: 1.6, seed: 3 });
  pencil(p, handRect(CX - 44, top + 6, 88, 22, { seed: 4, amp: 0.5 }), { closed: true, smooth: false, w: 1.2, seed: 5 });
  // a loaf drawn on the board instead of a name
  pencil(p, blob(CX, top + 17, 18, 6, { seed: 6, lobes: 8, irregular: 0.1 }), { closed: true, w: 1.1, seed: 7 });
  [-8, 0, 8].forEach((dx, i) => rule(p, CX + dx - 3, top + 13, CX + dx + 3, top + 21, { w: 0.9, overshoot: 0, seed: 8 + i }));
  // the striped, scalloped awning
  const ay = top + 40; const ah = 34; const stripes = 7; const sw = (x1 - x0 + 20) / stripes;
  for (let i = 0; i < stripes; i += 1) {
    const sx = x0 - 10 + i * sw;
    const shape = [[sx, ay], [sx + sw, ay], [sx + sw + 3, ay + ah], [sx + sw / 2 + 1.5, ay + ah + 9], [sx + 3, ay + ah]];
    if (i % 2 === 0) wash(live, shape, colour, { alpha: 0.95, seed: 20 + i, bloom: 0.25 });
    pencil(p, shape, { closed: true, smooth: false, w: 1.2, seed: 30 + i });
  }
  hatch(p, handRect(x0 - 10, ay, x1 - x0 + 20, ah, { seed: 40, amp: 0.2 }), { spacing: 4, alpha: 0.18, seed: 41, angle: -1.4 });
  rule(p, x0 - 12, ay, x1 + 12, ay, { w: 1.8, seed: 42 });
  // shop window with loaves and a door
  const wy = ay + ah + 20;
  pencil(p, handRect(x0 + 12, wy, 64, 60, { seed: 43, amp: 0.6 }), { closed: true, smooth: false, w: 1.5, seed: 44 });
  rule(p, x0 + 44, wy, x0 + 44, wy + 60, { w: 0.9, overshoot: 0, seed: 45 });
  [[x0 + 26, wy + 46], [x0 + 58, wy + 48], [x0 + 40, wy + 34]].forEach(([x, y], i) => {
    pencil(p, blob(x, y, 10, 5, { seed: 50 + i, lobes: 7, irregular: 0.1 }), { closed: true, w: 1, seed: 51 + i });
  });
  rule(p, x0 + 12, wy + 54, x0 + 76, wy + 54, { w: 1, overshoot: 0, seed: 55 });
  const dx = x1 - 50;
  pencil(p, [[dx, G], [dx, wy - 6], [dx + 36, wy - 6], [dx + 36, G]], { smooth: false, w: 1.6, seed: 56 });
  pencil(p, handRect(dx + 6, wy, 24, 30, { seed: 57, amp: 0.4 }), { closed: true, smooth: false, w: 0.9, seed: 58 });
  hatch(p, handRect(dx + 2, wy + 36, 32, G - wy - 38, { seed: 59, amp: 0.2 }), { spacing: 3.5, alpha: 0.3, angle: -1.5, seed: 60 });
  // a bread basket on a stool by the door
  pencil(p, blob(x0 - 18, G - 30, 16, 8, { seed: 61, lobes: 8, irregular: 0.05 }), { closed: true, w: 1.1, seed: 62 });
  pencil(p, [[x0 - 30, G], [x0 - 26, G - 24]], { w: 1, smooth: false, seed: 63 });
  pencil(p, [[x0 - 6, G], [x0 - 10, G - 24]], { w: 1, smooth: false, seed: 64 });
  hatch(p, handRect(x1 - 24, top + 2, 22, G - top - 4, { seed: 65, amp: 0.2 }), { spacing: 4, alpha: 0.2, seed: 66 });
}

function station(L, colour) {
  const { p } = L;
  const live = L.w$('live');
  const px = CX - 6;
  // the platform edge and a bench
  pencil(p, [[CX - 110, G - 10], [CX + 110, G - 10]], { smooth: false, w: 1.4, seed: 1 });
  hatch(p, handRect(CX - 110, G - 10, 220, 10, { seed: 2, amp: 0.2 }), { spacing: 5, alpha: 0.3, seed: 3 });
  const bx = CX + 30;
  pencil(p, handRect(bx, G - 44, 70, 6, { seed: 4, amp: 0.3 }), { closed: true, smooth: false, w: 1.2, seed: 5 });
  pencil(p, handRect(bx + 2, G - 66, 66, 16, { seed: 6, amp: 0.3 }), { closed: true, smooth: false, w: 1.1, seed: 7 });
  [bx + 6, bx + 62].forEach((x, i) => rule(p, x, G - 38, x, G - 10, { w: 1.3, seed: 8 + i, overshoot: 0 }));
  // the timetable board
  pencil(p, handRect(CX - 96, G - 120, 40, 52, { seed: 10, amp: 0.5 }), { closed: true, smooth: false, w: 1.2, seed: 11 });
  for (let i = 0; i < 5; i += 1) rule(p, CX - 90, G - 110 + i * 9, CX - 64 + (i % 2) * 4, G - 110 + i * 9, { w: 0.7, alpha: 0.55, overshoot: 0, seed: 12 + i });
  rule(p, CX - 76, G - 68, CX - 76, G - 10, { w: 1.4, seed: 18, overshoot: 0 });
  // the lamp post: fluted, with a cross-arm and a lantern
  pencil(p, [[px - 6, G - 10], [px - 3, G - 30], [px - 2.5, G - 230]], { w: 1.8, seed: 20 });
  pencil(p, [[px + 6, G - 10], [px + 3, G - 30], [px + 2.5, G - 230]], { w: 1.8, seed: 21 });
  hatch(p, handRect(px, G - 230, 3, 220, { seed: 22, amp: 0.1 }), { spacing: 3, alpha: 0.3, seed: 23 });
  rule(p, px - 18, G - 214, px + 18, G - 214, { w: 1.4, seed: 24 });
  const ly = G - 272;
  const glass = [[px - 16, ly + 12], [px + 16, ly + 12], [px + 12, ly + 44], [px - 12, ly + 44]];
  washBlob(live, px, ly + 28, 44, 44, colour, { alpha: 0.28, seed: 25, blur: 8, bloom: 0 });
  wash(live, glass, colour, { alpha: 0.95, seed: 26, bloom: 0.2 });
  washBlob(live, px, ly + 30, 7, 10, HUE.lamp, { alpha: 1, seed: 27, bloom: 0 });
  pencil(p, glass, { closed: true, smooth: false, w: 1.5, seed: 28 });
  pencil(p, [[px - 22, ly + 12], [px - 10, ly - 2], [px + 10, ly - 2], [px + 22, ly + 12]], { closed: true, smooth: false, w: 1.5, seed: 29 });
  pencil(p, blob(px, ly - 7, 4, 4, { seed: 30, lobes: 6, irregular: 0.05 }), { closed: true, w: 1.1, seed: 31 });
  pencil(p, [[px - 10, ly + 44], [px - 6, ly + 52], [px + 6, ly + 52], [px + 10, ly + 44]], { smooth: false, w: 1.3, seed: 32 });
  rule(p, px, ly + 12, px, ly + 44, { w: 0.8, alpha: 0.6, overshoot: 0, seed: 33 });
}

function orchardFlag(L, colour) {
  const { p } = L;
  const live = L.w$('live');
  appleTree(L, CX + 52, G, 1.05, 0x0f1a, { apples: 0 });
  // the pole, its knob, the halyard
  const px = CX - 38;
  pencil(p, [[px - 2, G], [px - 1.5, G - 280]], { w: 1.6, seed: 1, smooth: false });
  pencil(p, [[px + 2, G], [px + 1.5, G - 280]], { w: 1.4, seed: 2, smooth: false });
  pencil(p, blob(px, G - 284, 5, 5, { seed: 3, lobes: 6, irregular: 0.05 }), { closed: true, w: 1.2, seed: 4 });
  // the sun flag, lifting in the wind
  const fy = G - 272;
  const flag = [[px + 2, fy], [px + 50, fy - 8], [px + 104, fy + 4], [px + 92, fy + 28], [px + 106, fy + 50], [px + 52, fy + 50], [px + 2, fy + 60]];
  wash(live, flag, colour, { alpha: 0.95, seed: 5, bloom: 0.3 });
  pencil(p, flag, { closed: true, w: 1.5, seed: 6 });
  // a sun sewn on it
  const sun = blob(px + 46, fy + 26, 13, 13, { seed: 7, lobes: 8, irregular: 0.06 });
  wash(live, sun, '#f3d36a', { alpha: 0.9, seed: 8, bloom: 0.1 });
  pencil(p, sun, { closed: true, w: 1, seed: 9 });
  for (let i = 0; i < 8; i += 1) { const a = (i / 8) * TAU; rule(p, px + 46 + Math.cos(a) * 16, fy + 26 + Math.sin(a) * 16, px + 46 + Math.cos(a) * 22, fy + 26 + Math.sin(a) * 22, { w: 0.9, overshoot: 0, seed: 10 + i }); }
  hatch(p, flag.slice(3), { spacing: 4, alpha: 0.2, seed: 20 });
  // a crate of apples at the foot
  pencil(p, handRect(CX - 96, G - 26, 44, 26, { seed: 21, amp: 0.4 }), { closed: true, smooth: false, w: 1.3, seed: 22 });
  rule(p, CX - 96, G - 13, CX - 52, G - 13, { w: 0.9, overshoot: 0, seed: 23 });
  for (let i = 0; i < 5; i += 1) pencil(p, blob(CX - 90 + i * 8, G - 29, 4.5, 4.5, { seed: 24 + i, lobes: 6 }), { closed: true, w: 0.9, seed: 30 + i });
}

function millGarden(L, colour) {
  const { p } = L;
  const live = L.w$('live');
  // the windmill behind the garden wall
  const mx = CX + 26; const mTop = G - 210;
  const tower = [[mx - 34, G - 46], [mx - 22, mTop], [mx + 22, mTop], [mx + 34, G - 46]];
  pencil(p, tower, { smooth: false, w: 1.6, seed: 1 });
  hatch(p, [[mx + 4, mTop], [mx + 22, mTop], [mx + 34, G - 46], [mx + 8, G - 46]], { spacing: 4, alpha: 0.25, seed: 2 });
  pencil(p, [[mx - 26, mTop], [mx, mTop - 26], [mx + 26, mTop]], { smooth: false, w: 1.6, seed: 3 });
  pencil(p, handRect(mx - 8, G - 120, 16, 22, { seed: 4, amp: 0.3 }), { closed: true, smooth: false, w: 1.1, seed: 5 });
  const hub = [mx - 2, mTop + 6];
  for (let i = 0; i < 4; i += 1) {
    const a = 0.5 + (i * TAU) / 4;
    const ux = Math.cos(a); const uy = Math.sin(a); const nx = -uy; const ny = ux;
    const e = [hub[0] + ux * 92, hub[1] + uy * 92];
    rule(p, hub[0], hub[1], e[0], e[1], { w: 1.4, seed: 6 + i, overshoot: 2 });
    const sail = [[hub[0] + ux * 22 + nx * 2, hub[1] + uy * 22 + ny * 2], [e[0] + nx * 2, e[1] + ny * 2], [e[0] + nx * 18, e[1] + ny * 18], [hub[0] + ux * 22 + nx * 14, hub[1] + uy * 22 + ny * 14]];
    pencil(p, sail, { closed: true, smooth: false, w: 1, seed: 10 + i });
    for (let k = 1; k < 5; k += 1) { const t = 0.2 + k * 0.17; rule(p, hub[0] + ux * 92 * t + nx * 2, hub[1] + uy * 92 * t + ny * 2, hub[0] + ux * 92 * t + nx * 16, hub[1] + uy * 92 * t + ny * 16, { w: 0.6, alpha: 0.6, overshoot: 0, seed: 20 + i * 5 + k }); }
  }
  pencil(p, blob(hub[0], hub[1], 5, 5, { seed: 40, lobes: 6 }), { closed: true, w: 1.2, seed: 41 });
  // the garden wall and the beds: this is the colour
  pencil(p, [[CX - 110, G - 46], [CX + 110, G - 46]], { smooth: false, w: 1.3, seed: 42 });
  for (let x = CX - 110; x < CX + 110; x += 22) rule(p, x, G - 46, x, G - 36, { w: 0.7, alpha: 0.5, overshoot: 0, seed: 43 + x });
  pencil(p, [[CX - 110, G - 36], [CX + 110, G - 36]], { smooth: false, w: 1, alpha: 0.7, seed: 44 });
  const r = rng(45);
  for (let i = 0; i < 9; i += 1) {
    const x = CX - 96 + i * 24 + r() * 6;
    const h = 22 + r() * 22;
    const leaf = blob(x, G - h / 2 - 4, 13, h / 2 + 3, { seed: 46 + i, lobes: 9, irregular: 0.4 });
    wash(live, leaf, colour, { alpha: 0.9, seed: 60 + i, bloom: 0.3 });
    pencil(p, leaf, { closed: true, w: 0.9, seed: 70 + i, alpha: 0.75 });
    rule(p, x, G, x, G - h, { w: 0.8, overshoot: 0, seed: 80 + i });
  }
  // a watering can
  pencil(p, handRect(CX - 128, G - 22, 22, 20, { seed: 90, amp: 0.3 }), { closed: true, smooth: false, w: 1.1, seed: 91 });
  pencil(p, [[CX - 106, G - 14], [CX - 92, G - 28]], { w: 1.1, smooth: false, seed: 92 });
}

function publicWell(L, colour) {
  const { p } = L;
  const live = L.w$('live');
  // cobbles round the square
  for (let i = 0; i < 18; i += 1) pencil(p, blob(CX - 110 + i * 13, G - 3, 6, 3, { seed: 1 + i, lobes: 6, irregular: 0.2 }), { closed: true, w: 0.7, alpha: 0.5, seed: 30 + i, passes: 1 });
  // the round stone well
  const wy = G - 70;
  pencil(p, [[CX - 58, wy], [CX - 58, G - 6]], { smooth: false, w: 1.7, seed: 50 });
  pencil(p, [[CX + 58, wy], [CX + 58, G - 6]], { smooth: false, w: 1.7, seed: 51 });
  pencil(p, blob(CX, wy, 58, 12, { seed: 52, lobes: 14, irregular: 0.03 }), { closed: true, w: 1.6, seed: 53 });
  const water = blob(CX, wy + 1, 48, 8, { seed: 54, lobes: 12, irregular: 0.04 });
  wash(live, water, colour, { alpha: 0.95, seed: 55, bloom: 0.2 });
  for (let row = 0; row < 4; row += 1) {
    const y = wy + 14 + row * 14;
    pencil(p, [[CX - 58, y], [CX, y + 6], [CX + 58, y]], { w: 0.9, alpha: 0.6, seed: 60 + row });
    for (let k = 0; k < 5; k += 1) { const x = CX - 50 + k * 24 + (row % 2) * 12; rule(p, x, y + 2, x, y + 12, { w: 0.7, alpha: 0.5, overshoot: 0, seed: 70 + row * 5 + k }); }
  }
  hatch(p, handRect(CX + 20, wy + 10, 36, 56, { seed: 90, amp: 0.2 }), { spacing: 4, alpha: 0.25, seed: 91 });
  // two posts, a winch, a slate roof
  [CX - 46, CX + 46].forEach((x, i) => { pencil(p, [[x - 3, wy], [x - 3, G - 196]], { smooth: false, w: 1.5, seed: 92 + i }); pencil(p, [[x + 3, wy], [x + 3, G - 196]], { smooth: false, w: 1.3, seed: 94 + i }); });
  rule(p, CX - 46, G - 160, CX + 46, G - 160, { w: 1.6, seed: 96 });
  pencil(p, blob(CX, G - 160, 8, 8, { seed: 97, lobes: 8 }), { closed: true, w: 1.2, seed: 98 });
  rule(p, CX + 6, G - 160, CX + 6, G - 120, { w: 0.8, alpha: 0.8, overshoot: 0, seed: 99 });
  const bucket = [[CX - 4, G - 122], [CX + 16, G - 122], [CX + 14, G - 100], [CX - 2, G - 100]];
  wash(live, bucket, colour, { alpha: 0.7, seed: 100 });
  pencil(p, bucket, { closed: true, smooth: false, w: 1.2, seed: 101 });
  const roof = [[CX - 72, G - 192], [CX, G - 236], [CX + 72, G - 192], [CX + 66, G - 186], [CX, G - 226], [CX - 66, G - 186]];
  wash(live, roof, colour, { alpha: 0.85, seed: 102, bloom: 0.3 });
  pencil(p, roof, { closed: true, smooth: false, w: 1.6, seed: 103 });
  hatch(p, roof, { spacing: 3.5, alpha: 0.3, angle: -0.45, seed: 104 });
}

function home(L, colour) {
  const { p } = L;
  const live = L.w$('live');
  // the orchard house's own front, the plate's hook above the door
  const x0 = CX - 86; const x1 = CX + 96; const top = G - 286;
  pencil(p, handRect(x0, top, x1 - x0, G - top, { seed: 1, amp: 0.8 }), { closed: true, smooth: false, w: 1.8, seed: 2 });
  const roof = [[x0 - 14, top], [CX + 5, top - 64], [x1 + 14, top]];
  pencil(p, roof, { smooth: false, w: 1.8, seed: 3, overshoot: 4 });
  rule(p, x0 - 14, top, x1 + 14, top, { w: 1.4, seed: 4 });
  hatch(p, [[x0 - 8, top - 1], [CX + 5, top - 60], [x1 + 8, top - 1]], { spacing: 4, alpha: 0.3, angle: -0.3, seed: 5 });
  // the door under the plate (the plate is drawn by the scene)
  const dx = CX + 34; const dw = 48;
  pencil(p, [[dx, G], [dx, G - 104], [dx + dw, G - 104], [dx + dw, G]], { smooth: false, w: 1.7, seed: 6 });
  pencil(p, [[dx + 6, G - 98], [dx + dw / 2, G - 112], [dx + dw - 6, G - 98]], { smooth: false, w: 1, alpha: 0.7, seed: 7 });
  hatch(p, handRect(dx + 3, G - 100, dw - 6, 98, { seed: 8, amp: 0.2 }), { spacing: 4, alpha: 0.25, angle: -1.5, seed: 9 });
  p.save(); p.fillStyle = INK.graphite; p.beginPath(); p.arc(dx + 8, G - 50, 2, 0, TAU); p.fill(); p.restore();
  // a step and a pot of marigolds
  pencil(p, handRect(dx - 6, G - 6, dw + 12, 6, { seed: 10, amp: 0.2 }), { closed: true, smooth: false, w: 1.1, seed: 11 });
  // upstairs window with the quilt airing over its sill
  const wx = x0 + 26; const wy = top + 40;
  pencil(p, handRect(wx, wy, 64, 56, { seed: 12, amp: 0.5 }), { closed: true, smooth: false, w: 1.5, seed: 13 });
  rule(p, wx + 32, wy, wx + 32, wy + 56, { w: 0.9, overshoot: 0, seed: 14 });
  const qTop = wy + 50;
  const cols = 4; const rows = 4; const qw = 84; const qh = 92; const qx = wx - 10;
  const quilt = [[qx, qTop], [qx + qw, qTop], [qx + qw + 3, qTop + qh], [qx + qw * 0.5, qTop + qh + 5], [qx - 2, qTop + qh]];
  const r = rng(15);
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const sx = qx + (i * qw) / cols; const sy = qTop + (j * qh) / rows;
      const tone = (i + j) % 2 ? colour : '#b294bb';
      washRect(live, sx + 1, sy + 1, qw / cols - 2, qh / rows - 2, tone, { alpha: 0.8 + r() * 0.15, seed: 16 + i * 4 + j, bloom: 0.15, amp: 0.8 });
    }
  }
  pencil(p, quilt, { closed: true, smooth: false, w: 1.4, seed: 40 });
  for (let i = 1; i < cols; i += 1) rule(p, qx + (i * qw) / cols, qTop, qx + (i * qw) / cols + 1, qTop + qh, { w: 0.8, alpha: 0.6, overshoot: 0, seed: 41 + i });
  for (let j = 1; j < rows; j += 1) rule(p, qx, qTop + (j * qh) / rows, qx + qw + 1, qTop + (j * qh) / rows, { w: 0.8, alpha: 0.6, overshoot: 0, seed: 45 + j });
  // stitches
  for (let k = 0; k < 24; k += 1) { const sx = qx + r() * qw; const sy = qTop + r() * qh; rule(p, sx, sy, sx + 3, sy + 1, { w: 0.6, alpha: 0.5, overshoot: 0, passes: 1, seed: 50 + k }); }
  // downstairs window
  pencil(p, handRect(x0 + 24, G - 92, 56, 50, { seed: 80, amp: 0.5 }), { closed: true, smooth: false, w: 1.5, seed: 81 });
  rule(p, x0 + 52, G - 92, x0 + 52, G - 42, { w: 0.9, overshoot: 0, seed: 82 });
  rule(p, x0 + 24, G - 67, x0 + 80, G - 67, { w: 0.9, overshoot: 0, seed: 83 });
  hatch(p, handRect(x1 - 26, top + 2, 24, G - top - 4, { seed: 84, amp: 0.2 }), { spacing: 4, alpha: 0.2, seed: 85 });
  bush(L, x0 - 14, G, 30, 24, 86);
}

const PAINTERS = [bakery, station, orchardFlag, millGarden, publicWell, home];

export function paintYardSource(index, colour) {
  const { w, h } = YARD_SOURCE;
  const L = artLayers(w, h, { groups: ['live', 'green', 'red'], washScale: 1 });
  PAINTERS[index]?.(L, colour);
  L.finish(0.34);
  // Washes other than the lent colour stay unpainted in the yard: it is still
  // pencil until the line returns the colours.
  return { pencil: L.pencil, live: L.washes.live.canvas };
}

// A distant street behind the six places: pencil roofs and chimneys.
export function paintYardBackdrop(w, h, seed = 0x7a2d) {
  const L = artLayers(w, h, { washScale: 0.5 });
  const { p } = L;
  const r = rng(seed);
  let x = -20;
  while (x < w) {
    const bw = 70 + r() * 90; const bh = 60 + r() * 70; const base = h - 4;
    pencil(p, handRect(x, base - bh, bw, bh, { seed: Math.round(x) + 1, amp: 0.8 }), { closed: true, smooth: false, w: 0.9, alpha: 0.45, color: INK.soft, seed: Math.round(x) + 2 });
    const peak = base - bh - 20 - r() * 24;
    pencil(p, [[x - 4, base - bh], [x + bw / 2, peak], [x + bw + 4, base - bh]], { smooth: false, w: 0.9, alpha: 0.45, color: INK.soft, seed: Math.round(x) + 3 });
    hatch(p, [[x, base - bh], [x + bw / 2, peak + 2], [x + bw, base - bh]], { spacing: 4, alpha: 0.12, seed: Math.round(x) + 4, angle: -0.3 });
    for (let k = 0; k < Math.floor(bw / 30); k += 1) pencil(p, handRect(x + 10 + k * 30, base - bh + 16, 12, 16, { seed: Math.round(x) + 5 + k, amp: 0.3 }), { closed: true, smooth: false, w: 0.7, alpha: 0.35, color: INK.soft, seed: Math.round(x) + 9 + k });
    wash(L.w$('red'), [[x - 4, base - bh], [x + bw / 2, peak], [x + bw + 4, base - bh]], HUE.roof, { alpha: 0.4, seed: Math.round(x) + 20 });
    wash(L.w$('yellow'), handRect(x, base - bh, bw, bh, { seed: Math.round(x) + 1, amp: 0.8 }), HUE.plaster, { alpha: 0.35, seed: Math.round(x) + 21 });
    x += bw + 30 + r() * 90;
    if (r() < 0.4) { appleTree(L, x - 20, h - 2, 0.6, Math.round(x) + 40, { apples: 4 }); x += 40; }
  }
  return L.finish(0.3);
}

export { fence, scribble };
