// Chapter 4 // THE PAINTED TRAIN — drawn in pencil, painted part by part.
//
// The train is one drawing in six parts, by pigment id (PIGMENTS in
// chapter4ExpansionModel.js): green WHEELS, red ENGINE (the boiler and its
// smokebox), yellow WHISTLE (stack, dome and whistle), orange CAB, blue
// CARRIAGE, violet ROOF. Each part is two canvases the same size:
//   pencil  the under-drawing (graphite, hatching, rivets, panel lines);
//   wash    a neutral watercolour body (white to mid grey), which the scene
//           tints with the part's colour, so one drawing serves every colour
//           the train is ever painted (and its weathered coats).
// A chassis (frame, buffers, rods, footplate) is pencil only and always on.
//
// The geometry comes from the scene (its hit rects are the parts' rects), in
// the scene's own coordinates; `nose` says which end the smokebox is at.
// Everything is drawn at `S`× for crispness and shown at 1/S.

import { HUE, INK, TAU, blob, hatch, handRect, makeCanvas, pencil, rng, rule, tooth, wash, washRect, washBlob } from './pencilKit.js';

const NEUTRAL = '#ffffff';
const SHADE = '#b9b6b0';
const DEEP = '#8f8c86';

function sheet(rect, pad, S) {
  const x = Math.floor(rect.x - pad);
  const y = Math.floor(rect.y - pad);
  const w = Math.ceil(rect.w + pad * 2);
  const h = Math.ceil(rect.h + pad * 2);
  const pencilCanvas = makeCanvas(w * S, h * S);
  const washCanvas = makeCanvas(w * S, h * S);
  const p = pencilCanvas.getContext('2d');
  const c = washCanvas.getContext('2d');
  [p, c].forEach((ctx) => { ctx.scale(S, S); ctx.translate(-x, -y); });
  return { x, y, w, h, S, p, c, pencil: pencilCanvas, wash: washCanvas };
}

function done(part, strength = 0.32) {
  part.p.setTransform(1, 0, 0, 1, 0, 0);
  tooth(part.p, part.pencil.width, part.pencil.height, strength);
  delete part.p; delete part.c;
  return part;
}

function rivets(p, x0, x1, y, every, seed) {
  const r = rng(seed);
  p.save();
  p.fillStyle = INK.graphite;
  for (let x = x0; x <= x1; x += every) {
    p.globalAlpha = 0.45 + r() * 0.3;
    p.beginPath(); p.arc(x + (r() - 0.5) * 0.6, y, 0.9, 0, TAU); p.fill();
  }
  p.restore();
}

function roundRect(x, y, w, h, rad) {
  const pts = [];
  const corner = (cx, cy, a0) => { for (let k = 0; k <= 4; k += 1) { const a = a0 + (k / 4) * (Math.PI / 2); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } };
  corner(x + w - rad, y + rad, -Math.PI / 2);
  corner(x + w - rad, y + h - rad, 0);
  corner(x + rad, y + h - rad, Math.PI / 2);
  corner(x + rad, y + rad, Math.PI);
  return pts;
}

// ------------------------------------------------------------- the parts

function boiler(rect, nose, S, seed) {
  const k = rect.h / 84; // 1 at the yard's size
  const noseR = rect.h * 0.5;
  const part = sheet({ x: rect.x - (nose < 0 ? noseR : 0), y: rect.y, w: rect.w + noseR, h: rect.h }, 10, S);
  const { p, c } = part;
  const lw = 1.5 * Math.max(0.7, k);
  const body = roundRect(rect.x, rect.y + rect.h * 0.04, rect.w, rect.h * 0.92, rect.h * 0.3);
  wash(c, body, NEUTRAL, { alpha: 1, seed, bloom: 0.18, edge: 0.4, blur: 0.4 });
  // the barrel's roundness: shade along the bottom, a highlight left along the top
  wash(c, handRect(rect.x + 4, rect.y + rect.h * 0.62, rect.w - 8, rect.h * 0.32, { seed: seed + 1 }), SHADE, { alpha: 0.75, seed: seed + 2, bloom: 0.2, blur: 1.5 });
  pencil(p, body, { closed: true, smooth: true, w: lw, seed: seed + 3 });
  // boiler bands
  for (let i = 1; i < 5; i += 1) {
    const bx = rect.x + (rect.w * i) / 5;
    pencil(p, [[bx, rect.y + rect.h * 0.06], [bx + 1, rect.y + rect.h * 0.5], [bx, rect.y + rect.h * 0.94]], { w: lw * 0.75, seed: seed + 10 + i });
    pencil(p, [[bx + 3 * k, rect.y + rect.h * 0.08], [bx + 3 * k, rect.y + rect.h * 0.92]], { w: lw * 0.4, alpha: 0.5, seed: seed + 20 + i, smooth: false });
  }
  // handrail
  rule(p, rect.x + rect.w * 0.12, rect.y + rect.h * 0.26, rect.x + rect.w * 0.9, rect.y + rect.h * 0.26, { w: lw * 0.6, alpha: 0.7, seed: seed + 30, overshoot: 0 });
  hatch(p, handRect(rect.x + 6, rect.y + rect.h * 0.7, rect.w - 12, rect.h * 0.22, { seed: seed + 31, amp: 0.4 }), { spacing: 3.2 * k + 1, alpha: 0.32, seed: seed + 32 });
  // the smokebox: a round face at the nose, its door, its rivets, a lamp
  const fx = nose < 0 ? rect.x + 4 * k : rect.x + rect.w - 4 * k;
  const fy = rect.y + rect.h / 2;
  const face = blob(fx, fy, noseR, noseR, { seed: seed + 40, lobes: 14, irregular: 0.03 });
  wash(c, face, SHADE, { alpha: 1, seed: seed + 41, bloom: 0.2 });
  wash(c, blob(fx, fy, noseR * 0.62, noseR * 0.62, { seed: seed + 42, lobes: 12, irregular: 0.03 }), DEEP, { alpha: 0.7, seed: seed + 43 });
  pencil(p, face, { closed: true, w: lw * 1.1, seed: seed + 44 });
  pencil(p, blob(fx, fy, noseR * 0.66, noseR * 0.66, { seed: seed + 45, lobes: 12, irregular: 0.02 }), { closed: true, w: lw * 0.8, seed: seed + 46 });
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU;
    p.save(); p.fillStyle = INK.graphite; p.globalAlpha = 0.6;
    p.beginPath(); p.arc(fx + Math.cos(a) * noseR * 0.82, fy + Math.sin(a) * noseR * 0.82, 0.9 * Math.max(1, k), 0, TAU); p.fill(); p.restore();
  }
  // door dogs and the handle
  rule(p, fx - noseR * 0.3, fy, fx + noseR * 0.3, fy, { w: lw * 0.9, seed: seed + 47, overshoot: 0 });
  p.save(); p.fillStyle = INK.graphite; p.beginPath(); p.arc(fx, fy, 2 * Math.max(0.8, k), 0, TAU); p.fill(); p.restore();
  // a headlamp on top of the face
  const lx = fx + (nose < 0 ? 6 : -6) * k;
  const ly = rect.y - 2 * k;
  pencil(p, handRect(lx - 5 * k, ly - 9 * k, 10 * k, 9 * k, { seed: seed + 48, amp: 0.3 }), { closed: true, smooth: false, w: lw * 0.7, seed: seed + 49 });
  hatch(p, blob(fx - noseR * 0.2, fy + noseR * 0.3, noseR * 0.8, noseR * 0.5, { seed: seed + 50 }), { spacing: 3 * k + 1, alpha: 0.3, angle: -0.5, seed: seed + 51 });
  return done(part);
}

function stack(rect, nose, S, seed, { whistle = true } = {}) {
  const part = sheet(rect, 8, S);
  const { p, c } = part;
  const k = rect.h / 58;
  const lw = 1.4 * Math.max(0.7, k);
  // the chimney: a flared cap on a tapering barrel
  const chimW = whistle ? rect.w * 0.4 : rect.w * 0.8;
  const cx = whistle ? rect.x + (nose < 0 ? rect.w * 0.17 : rect.w * 0.43) + chimW / 2 : rect.x + rect.w / 2;
  const capH = rect.h * 0.27;
  const top = rect.y;
  const bot = rect.y + rect.h;
  const barrel = [[cx - chimW * 0.42, top + capH], [cx - chimW * 0.36, bot - rect.h * 0.08], [cx - chimW * 0.62, bot], [cx + chimW * 0.62, bot], [cx + chimW * 0.36, bot - rect.h * 0.08], [cx + chimW * 0.42, top + capH]];
  const cap = [[cx - chimW * 0.72, top + capH], [cx - chimW * 0.8, top + capH * 0.35], [cx - chimW * 0.62, top], [cx + chimW * 0.62, top], [cx + chimW * 0.8, top + capH * 0.35], [cx + chimW * 0.72, top + capH]];
  wash(c, barrel, NEUTRAL, { alpha: 1, seed, bloom: 0.2 });
  wash(c, cap, NEUTRAL, { alpha: 1, seed: seed + 1, bloom: 0.2 });
  wash(c, handRect(cx + chimW * 0.05, top + capH, chimW * 0.35, rect.h - capH, { seed: seed + 2 }), SHADE, { alpha: 0.7, seed: seed + 3, blur: 1.2 });
  pencil(p, barrel, { smooth: false, w: lw, seed: seed + 4 });
  pencil(p, cap, { closed: true, smooth: true, w: lw, seed: seed + 5 });
  rule(p, cx - chimW * 0.8, top + capH * 0.42, cx + chimW * 0.8, top + capH * 0.42, { w: lw * 0.6, alpha: 0.6, overshoot: 0, seed: seed + 6 });
  hatch(p, barrel, { spacing: 2.8, alpha: 0.28, angle: -1.35, seed: seed + 7 });
  if (whistle) {
    // the dome and the brass whistle beside the stack
    const dx = cx + (nose < 0 ? 1 : -1) * rect.w * 0.02 + (nose < 0 ? rect.w * 0.45 : -rect.w * 0.45);
    const dome = [];
    for (let i = 0; i <= 12; i += 1) { const a = Math.PI + (i / 12) * Math.PI; dome.push([dx + Math.cos(a) * rect.w * 0.17, bot - 2 + Math.sin(a) * rect.h * 0.38]); }
    wash(c, [...dome, [dx + rect.w * 0.22, bot], [dx - rect.w * 0.22, bot]], NEUTRAL, { alpha: 1, seed: seed + 8 });
    pencil(p, [[dx - rect.w * 0.22, bot], ...dome, [dx + rect.w * 0.22, bot]], { w: lw, seed: seed + 9 });
    hatch(p, [...dome.slice(6), [dx + rect.w * 0.17, bot], [dx, bot]], { spacing: 2.6, alpha: 0.3, seed: seed + 10 });
    const wx = dx + (nose < 0 ? 1 : -1) * rect.w * 0.02;
    const wy = bot - rect.h * 0.5;
    pencil(p, [[wx, wy - rect.h * 0.16], [wx, wy + rect.h * 0.1]], { w: lw * 0.8, seed: seed + 11, smooth: false });
    const bell = blob(wx, wy - rect.h * 0.2, rect.w * 0.05, rect.h * 0.1, { seed: seed + 12, lobes: 8, irregular: 0.05 });
    wash(c, bell, NEUTRAL, { alpha: 1, seed: seed + 13 });
    pencil(p, bell, { closed: true, w: lw * 0.8, seed: seed + 14 });
  }
  return done(part);
}

function cab(rect, nose, S, seed, { hawthornMark = true } = {}) {
  const part = sheet(rect, 8, S);
  const { p, c } = part;
  const k = rect.w / 102;
  const lw = 1.5 * Math.max(0.7, k);
  const body = handRect(rect.x, rect.y, rect.w, rect.h, { seed, amp: 0.6 });
  wash(c, body, NEUTRAL, { alpha: 1, seed: seed + 1, bloom: 0.25 });
  wash(c, handRect(rect.x + 2, rect.y + rect.h * 0.72, rect.w - 4, rect.h * 0.26, { seed: seed + 2 }), SHADE, { alpha: 0.7, seed: seed + 3, blur: 1.2 });
  pencil(p, body, { closed: true, smooth: false, w: lw, seed: seed + 4 });
  // the cab's spectacle window (paper-white) and its frame
  const ww = rect.w * 0.52;
  const wh = rect.h * 0.36;
  const wx = rect.x + (rect.w - ww) / 2 + (nose < 0 ? -rect.w * 0.06 : rect.w * 0.06);
  const wy = rect.y + rect.h * 0.15;
  const win = roundRect(wx, wy, ww, wh, Math.min(ww, wh) * 0.25);
  c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.beginPath(); win.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.restore();
  pencil(p, win, { closed: true, w: lw * 0.9, seed: seed + 5 });
  pencil(p, roundRect(wx - 2.5 * k, wy - 2.5 * k, ww + 5 * k, wh + 5 * k, Math.min(ww, wh) * 0.3), { closed: true, w: lw * 0.5, alpha: 0.6, seed: seed + 6 });
  rule(p, wx + ww / 2, wy, wx + ww / 2, wy + wh, { w: lw * 0.6, seed: seed + 7, overshoot: 0 });
  // the cab side's beading and handrails
  pencil(p, handRect(rect.x + 5 * k, rect.y + rect.h * 0.6, rect.w - 10 * k, rect.h * 0.34, { seed: seed + 8, amp: 0.4 }), { closed: true, smooth: false, w: lw * 0.55, alpha: 0.7, seed: seed + 9 });
  const railX = nose < 0 ? rect.x + 5 * k : rect.x + rect.w - 5 * k;
  rule(p, railX, rect.y + rect.h * 0.62, railX, rect.y + rect.h * 0.95, { w: lw * 0.8, seed: seed + 10, overshoot: 2 });
  hatch(p, handRect(rect.x + 3, rect.y + rect.h * 0.74, rect.w - 6, rect.h * 0.24, { seed: seed + 11, amp: 0.2 }), { spacing: 3.2 * k + 1, alpha: 0.28, seed: seed + 12 });
  rivets(p, rect.x + 4 * k, rect.x + rect.w - 4 * k, rect.y + 3 * k, 7 * k + 2, seed + 13);
  if (hawthornMark) {
    // Mara's hawthorn, painted small on the cab: the answer, carried, not asked.
    const hx = rect.x + rect.w * (nose < 0 ? 0.62 : 0.38);
    const hy = rect.y + rect.h * 0.77;
    const s = Math.max(0.55, k);
    pencil(p, [[hx - 9 * s, hy + 4 * s], [hx, hy], [hx + 8 * s, hy - 5 * s]], { w: 0.9 * s + 0.2, color: INK.lead, seed: seed + 14 });
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i * TAU) / 5;
      p.save(); p.fillStyle = HUE.blossom; p.globalAlpha = 1; p.beginPath(); p.arc(hx + Math.cos(a) * 3.2 * s, hy - 3 * s + Math.sin(a) * 3.2 * s, 2.3 * s, 0, TAU); p.fill();
      p.globalAlpha = 0.6; p.strokeStyle = INK.graphite; p.lineWidth = 0.5; p.stroke(); p.restore();
    }
    p.save(); p.fillStyle = HUE.vermilion; p.beginPath(); p.arc(hx, hy - 3 * s, 1.3 * s, 0, TAU); p.fill(); p.restore();
  }
  return done(part);
}

function carriage(rect, S, seed, { windows = 4 } = {}) {
  const part = sheet(rect, 8, S);
  const { p, c } = part;
  const k = rect.h / 84;
  const lw = 1.5 * Math.max(0.65, k);
  const body = roundRect(rect.x, rect.y, rect.w, rect.h, 6 * k + 1);
  wash(c, body, NEUTRAL, { alpha: 1, seed: seed + 1, bloom: 0.25 });
  wash(c, handRect(rect.x + 2, rect.y + rect.h * 0.7, rect.w - 4, rect.h * 0.28, { seed: seed + 2 }), SHADE, { alpha: 0.65, seed: seed + 3, blur: 1.2 });
  pencil(p, body, { closed: true, w: lw, seed: seed + 4 });
  // the waist and the belt line
  rule(p, rect.x + 3, rect.y + rect.h * 0.62, rect.x + rect.w - 3, rect.y + rect.h * 0.62, { w: lw * 0.7, seed: seed + 5, overshoot: 0 });
  rule(p, rect.x + 3, rect.y + rect.h * 0.67, rect.x + rect.w - 3, rect.y + rect.h * 0.67, { w: lw * 0.5, alpha: 0.6, seed: seed + 6, overshoot: 0 });
  // windows: arched tops, paper-white glass, a curtain tied back in each
  const margin = rect.w * 0.07;
  const doorW = rect.w * 0.09;
  const span = rect.w - margin * 2 - doorW;
  const gap = span / windows;
  const ww = gap * 0.68;
  const wh = rect.h * 0.4;
  const wy = rect.y + rect.h * 0.14;
  for (let i = 0; i < windows; i += 1) {
    const wx = rect.x + margin + i * gap + (gap - ww) / 2;
    const win = roundRect(wx, wy, ww, wh, Math.min(ww, wh) * 0.28);
    c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.beginPath(); win.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.restore();
    pencil(p, win, { closed: true, w: lw * 0.85, seed: seed + 10 + i });
    // a lamp-lit pane: a little warm wash inside, and the curtain
    const curtain = [[wx + ww * 0.08, wy + 2], [wx + ww * 0.3, wy + 2], [wx + ww * 0.18, wy + wh * 0.55], [wx + ww * 0.08, wy + wh - 2]];
    pencil(p, curtain, { w: lw * 0.5, alpha: 0.6, seed: seed + 20 + i });
    hatch(p, curtain, { spacing: 2.2, alpha: 0.35, angle: -1.4, seed: seed + 30 + i });
    pencil(p, roundRect(wx - 2.5 * k, wy - 2.5 * k, ww + 5 * k, wh + 5 * k, Math.min(ww, wh) * 0.32), { closed: true, w: lw * 0.45, alpha: 0.55, seed: seed + 40 + i });
    // panel below each window
    pencil(p, handRect(wx, rect.y + rect.h * 0.72, ww, rect.h * 0.18, { seed: seed + 50 + i, amp: 0.4 }), { closed: true, smooth: false, w: lw * 0.5, alpha: 0.6, seed: seed + 51 + i });
  }
  // the door at the far end, with its handle and droplight
  const dx = rect.x + rect.w - margin - doorW + doorW * 0.1;
  pencil(p, [[dx, rect.y + rect.h * 0.96], [dx, rect.y + rect.h * 0.08], [dx + doorW * 0.9, rect.y + rect.h * 0.08], [dx + doorW * 0.9, rect.y + rect.h * 0.96]], { smooth: false, w: lw * 0.8, seed: seed + 60 });
  pencil(p, roundRect(dx + doorW * 0.15, rect.y + rect.h * 0.15, doorW * 0.6, rect.h * 0.3, 2), { closed: true, w: lw * 0.6, seed: seed + 61 });
  p.save(); p.fillStyle = INK.graphite; p.beginPath(); p.arc(dx + doorW * 0.2, rect.y + rect.h * 0.58, 1.6 * Math.max(0.7, k), 0, TAU); p.fill(); p.restore();
  hatch(p, handRect(rect.x + 3, rect.y + rect.h * 0.82, rect.w - 6, rect.h * 0.16, { seed: seed + 62, amp: 0.2 }), { spacing: 3.2 * k + 1, alpha: 0.28, seed: seed + 63 });
  rivets(p, rect.x + 6, rect.x + rect.w - 6, rect.y + rect.h - 3 * k - 1, 8 * k + 2, seed + 64);
  return done(part);
}

function roof(rect, S, seed) {
  const part = sheet(rect, 8, S);
  const { p, c } = part;
  const k = rect.h / 40;
  const lw = 1.5 * Math.max(0.65, k);
  // a curved carriage roof, eaves overhanging, a clerestory of vents
  const pts = [];
  const eave = rect.y + rect.h;
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    const x = rect.x + t * rect.w;
    const lift = Math.pow(Math.sin(t * Math.PI), 0.25);
    pts.push([x, eave - lift * rect.h * 0.82]);
  }
  const shape = [[rect.x, eave], ...pts, [rect.x + rect.w, eave]];
  wash(c, shape, NEUTRAL, { alpha: 1, seed, bloom: 0.2 });
  wash(c, handRect(rect.x + 4, eave - rect.h * 0.3, rect.w - 8, rect.h * 0.3, { seed: seed + 1 }), SHADE, { alpha: 0.6, seed: seed + 2, blur: 1 });
  pencil(p, shape, { smooth: false, w: lw, seed: seed + 3 });
  rule(p, rect.x - 3, eave, rect.x + rect.w + 3, eave, { w: lw * 1.1, seed: seed + 4 });
  rule(p, rect.x + 4, eave - rect.h * 0.28, rect.x + rect.w - 4, eave - rect.h * 0.28, { w: lw * 0.5, alpha: 0.6, seed: seed + 5, overshoot: 0 });
  // rain strip and ribs
  for (let x = rect.x + rect.w * 0.06; x < rect.x + rect.w * 0.95; x += Math.max(10, rect.w / 18)) {
    pencil(p, [[x, eave - 1], [x + 1, eave - rect.h * 0.66]], { w: lw * 0.35, alpha: 0.45, seed: seed + Math.round(x), smooth: false, passes: 1 });
  }
  // vents on the crown
  const n = Math.max(2, Math.round(rect.w / 110));
  for (let i = 0; i < n; i += 1) {
    const vx = rect.x + rect.w * ((i + 0.5) / n) - 6 * k;
    const vy = eave - rect.h * 0.84;
    pencil(p, handRect(vx, vy - 6 * k, 12 * k + 2, 6 * k + 1, { seed: seed + 70 + i, amp: 0.3 }), { closed: true, smooth: false, w: lw * 0.6, seed: seed + 71 + i });
  }
  hatch(p, handRect(rect.x + 2, eave - rect.h * 0.26, rect.w - 4, rect.h * 0.24, { seed: seed + 80, amp: 0.2 }), { spacing: 3 * k + 1.2, alpha: 0.3, angle: -0.4, seed: seed + 81 });
  return done(part);
}

// One wheel, centred in its canvas, so the scene can spin it.
export function paintWheel(r, S, seed = 1) {
  const pad = 4;
  const size = Math.ceil((r + pad) * 2);
  const pencilCanvas = makeCanvas(size * S, size * S);
  const washCanvas = makeCanvas(size * S, size * S);
  const p = pencilCanvas.getContext('2d');
  const c = washCanvas.getContext('2d');
  [p, c].forEach((ctx) => { ctx.scale(S, S); ctx.translate(size / 2, size / 2); });
  const k = r / 33;
  const lw = 1.5 * Math.max(0.6, k);
  wash(c, blob(0, 0, r, r, { seed, lobes: 16, irregular: 0.02 }), NEUTRAL, { alpha: 1, seed, bloom: 0.15 });
  wash(c, blob(0, 0, r * 0.32, r * 0.32, { seed: seed + 1, lobes: 10, irregular: 0.03 }), SHADE, { alpha: 0.8, seed: seed + 2 });
  // the counterweight
  const cw = [];
  for (let i = 0; i <= 10; i += 1) { const a = 0.6 + (i / 10) * 1.9; cw.push([Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78]); }
  for (let i = 10; i >= 0; i -= 1) { const a = 0.6 + (i / 10) * 1.9; cw.push([Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45]); }
  wash(c, cw, DEEP, { alpha: 0.6, seed: seed + 3 });
  pencil(p, blob(0, 0, r, r, { seed: seed + 4, lobes: 16, irregular: 0.015 }), { closed: true, w: lw * 1.2, seed: seed + 5 });
  pencil(p, blob(0, 0, r * 0.84, r * 0.84, { seed: seed + 6, lobes: 16, irregular: 0.015 }), { closed: true, w: lw * 0.7, seed: seed + 7 });
  const spokes = r > 20 ? 12 : 8;
  for (let i = 0; i < spokes; i += 1) {
    const a = (i / spokes) * TAU;
    pencil(p, [[Math.cos(a) * r * 0.24, Math.sin(a) * r * 0.24], [Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82]], { w: lw * 0.6, seed: seed + 10 + i, smooth: false, overshoot: 0 });
  }
  pencil(p, cw, { closed: true, smooth: false, w: lw * 0.5, alpha: 0.6, seed: seed + 30 });
  pencil(p, blob(0, 0, r * 0.24, r * 0.24, { seed: seed + 31, lobes: 10, irregular: 0.02 }), { closed: true, w: lw * 0.8, seed: seed + 32 });
  p.save(); p.fillStyle = INK.lead; p.beginPath(); p.arc(0, 0, Math.max(1.5, r * 0.08), 0, TAU); p.fill(); p.restore();
  p.setTransform(1, 0, 0, 1, 0, 0);
  tooth(p, pencilCanvas.width, pencilCanvas.height, 0.25);
  return { pencil: pencilCanvas, wash: washCanvas, size, S };
}

function chassis(spec, S, seed) {
  const { frame } = spec;
  const k = frame.h / 19;
  const lw = 1.5 * Math.max(0.6, k);
  const rect = { x: frame.x0 - 30 * k, y: frame.y - 10 * k, w: frame.x1 - frame.x0 + 60 * k, h: frame.h + 40 * k };
  const part = sheet(rect, 6, S);
  const { p, c } = part;
  // the frame: a kraft-wrapped beam with its footplate
  const beam = handRect(frame.x0, frame.y, frame.x1 - frame.x0, frame.h, { seed, amp: 0.5 });
  wash(c, beam, HUE.bark, { alpha: 0.5, seed: seed + 1, bloom: 0.2 });
  pencil(p, beam, { closed: true, smooth: false, w: lw, seed: seed + 2 });
  rivets(p, frame.x0 + 6, frame.x1 - 6, frame.y + frame.h * 0.5, 9 * k + 3, seed + 3);
  hatch(p, beam, { spacing: 3, alpha: 0.25, angle: -0.8, seed: seed + 4 });
  // buffers at both ends
  [frame.x0, frame.x1].forEach((bx, i) => {
    const dir = i ? 1 : -1;
    const by = frame.y + frame.h * 0.5;
    rule(p, bx, by, bx + dir * 16 * k, by, { w: lw * 1.2, seed: seed + 10 + i, overshoot: 0 });
    pencil(p, blob(bx + dir * 20 * k, by, 4.5 * k + 1, 7 * k + 1, { seed: seed + 12 + i, lobes: 10, irregular: 0.04 }), { closed: true, w: lw * 0.9, seed: seed + 14 + i });
    wash(c, blob(bx + dir * 20 * k, by, 4.5 * k + 1, 7 * k + 1, { seed: seed + 16 + i }), DEEP, { alpha: 0.6, seed: seed + 18 + i });
  });
  // rails under it, and the sleepers' ends
  const ry = frame.y + frame.h + (spec.railDrop ?? 22 * k);
  rule(p, rect.x, ry, rect.x + rect.w, ry, { w: lw * 1.2, seed: seed + 30 });
  rule(p, rect.x, ry + 3 * k, rect.x + rect.w, ry + 3 * k, { w: lw * 0.6, alpha: 0.6, seed: seed + 31 });
  return done(part, 0.28);
}

// The coupling rod between the driving wheels, drawn by the scene each
// frame from these points (it has to follow the crank).
export function rodPoints(spec) {
  return spec.wheels.map(({ x, y }) => ({ x, y }));
}

// spec: { S, nose: -1 | 1, boiler, cab, stack, carriage, roof, wheels: [{x,y,r}], frame: {x0, x1, y, h}, windows, stackWhistle }
export function paintTrain(spec, seed = 0x7a1) {
  const S = spec.S ?? 2;
  const nose = spec.nose ?? 1;
  return {
    S,
    parts: {
      red: boiler(spec.boiler, nose, S, seed + 100),
      yellow: stack(spec.stack, nose, S, seed + 200, { whistle: spec.stackWhistle !== false }),
      orange: cab(spec.cab, nose, S, seed + 300, { hawthornMark: spec.hawthornMark !== false }),
      blue: carriage(spec.carriage, S, seed + 400, { windows: spec.windows ?? 4 }),
      violet: roof(spec.roof, S, seed + 500),
    },
    chassis: chassis(spec, S, seed + 600),
    wheel: paintWheel(spec.wheels[0].r, S, seed + 700),
    wheels: spec.wheels,
  };
}
