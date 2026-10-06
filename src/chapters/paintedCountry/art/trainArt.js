// Chapter 4 // THE PAINTED TRAIN — drawn in pencil, painted part by part.
//
// The train is one drawing in six parts, by pigment id (PIGMENTS in
// chapter4ExpansionModel.js): green WHEELS, red ENGINE (the boiler and its
// smokebox), yellow WHISTLE (stack, dome and whistle), orange CAB, blue
// CARRIAGE, violet ROOF. Rosa drew the night service (Chapter 1's carriage:
// src/chapters/finalBoss/assets/paper/ch1-train-exterior-v01.png) pulled by
// the engine a child gives every train: the carriage has its paired doors,
// its window rhythm, the pale window band over a painted lower body and the
// two belt lines; the roof carries its equipment box and vents.
//
// Alpha round 4: the old washes were flat, opaque fills in the residents'
// colours, and the train read as a primary-colour toy. Each part is now
// three canvases the same size:
//   pencil  the under-drawing (graphite, hatching, rivets, panel lines,
//           shaded glass): always on, faint until the part is painted;
//   wash    a loose gouache body — blooms, granulation, brush streaks, the
//           paper left showing in the light — in white, tinted by the scene;
//   edge    the pigment that pools at a drying edge and in the shadows, in
//           grey, tinted the same: the scene brings it in after the body,
//           so a painted part blooms wet and then dries darker at its rims.
// A paper underlay (the sheet the train is drawn on) keeps the street behind
// from showing through the translucent washes, and a chassis (frame,
// buffers, bogies, rails) is pencil only and always on.
//
// The geometry comes from the scene (its hit rects are the parts' rects), in
// the scene's own coordinates; `nose` says which end the smokebox is at.
// Everything is drawn at `S`× for crispness and shown at 1/S.

import { HUE, INK, TAU, blob, dab, hatch, handRect, makeCanvas, pencil, polyPath, rng, rule, tooth, wash } from './pencilKit.js';

const BODY = '#ffffff';
const POOL = '#9d9890';
const SHADE = '#8a867f';
const GLASS = '#c9cfd2';
const PAPER_UNDER = '#fbf8f1';

// The residents' colours as Rosa's gouache, not as flat primaries: a little
// of the paper and of a warm grey mixed in, so the six sit together on the
// sheet. Pure; the scenes tint the neutral washes with it.
export function trainTint(color) {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const grey = (r + g + b) / 3;
  const paper = [244, 236, 220];
  const mix = (c, i) => Math.round(c * 0.8 + grey * 0.07 + paper[i] * 0.13);
  return (mix(r, 0) << 16) | (mix(g, 1) << 8) | mix(b, 2);
}

// The alphas a painted part settles at (the scenes tween to these).
export const TRAIN_WASH_ALPHA = Object.freeze({ body: 0.92, edge: 0.85 });

function sheet(rect, pad, S) {
  const x = Math.floor(rect.x - pad);
  const y = Math.floor(rect.y - pad);
  const w = Math.ceil(rect.w + pad * 2);
  const h = Math.ceil(rect.h + pad * 2);
  const pencilCanvas = makeCanvas(w * S, h * S);
  const washCanvas = makeCanvas(w * S, h * S);
  const edgeCanvas = makeCanvas(w * S, h * S);
  const p = pencilCanvas.getContext('2d');
  const c = washCanvas.getContext('2d');
  const e = edgeCanvas.getContext('2d');
  [p, c, e].forEach((ctx) => { ctx.scale(S, S); ctx.translate(-x, -y); });
  return { x, y, w, h, S, p, c, e, pencil: pencilCanvas, wash: washCanvas, edge: edgeCanvas, shapes: [] };
}

function done(part, strength = 0.32) {
  part.p.setTransform(1, 0, 0, 1, 0, 0);
  tooth(part.p, part.pencil.width, part.pencil.height, strength);
  part.c.setTransform(1, 0, 0, 1, 0, 0);
  tooth(part.c, part.wash.width, part.wash.height, 0.18);
  delete part.p; delete part.c; delete part.e;
  return part;
}

const boundsOf = (pts) => {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

function clipTo(ctx, shape, draw) {
  ctx.save();
  polyPath(ctx, shape);
  ctx.clip();
  draw();
  ctx.restore();
}

// One gouache body over `shape`: the loose wash, horizontal brush streaks,
// the light lifted off along the top; on the edge canvas the pooled rim and
// the shadow under the belly. `lift` lifts paint off a band (y0..y1, as
// fractions of the shape's height) to leave paper showing, like the night
// service's cream window band.
function gouache(part, shape, seed, { shade = 0.34, streaks = 7, lift = null, rim = 1 } = {}) {
  const { c, e } = part;
  const b = boundsOf(shape);
  const r = rng(seed);
  part.shapes.push(shape);
  wash(c, shape, BODY, { alpha: 0.92, seed, edge: 0, bloom: 0.42, blur: 0.5, granulate: 0.4 });
  clipTo(c, shape, () => {
    for (let i = 0; i < streaks; i += 1) {
      const yy = b.y + b.h * (0.1 + 0.8 * r());
      const x0 = b.x - 6 + r() * b.w * 0.25;
      const x1 = b.x + b.w * (0.7 + r() * 0.35);
      dab(c, x0, yy, x1, yy + (r() - 0.5) * 3, 3 + r() * Math.max(3, b.h * 0.12), r() > 0.5 ? '#ffffff' : '#ece9e4', { alpha: 0.35, seed: seed + 40 + i, streaks: 4 });
    }
    // the light falls from above: the top edge of the body is thinner paint
    c.globalCompositeOperation = 'destination-out';
    const top = c.createLinearGradient(0, b.y, 0, b.y + b.h * 0.35);
    top.addColorStop(0, 'rgba(0,0,0,0.3)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top;
    c.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h * 0.4);
    if (lift) {
      // paint lifted off with a damp brush: soft-edged, a little uneven
      const y0 = b.y + b.h * lift[0];
      const y1 = b.y + b.h * lift[1];
      const band = c.createLinearGradient(0, y0 - 2, 0, y1 + 2);
      band.addColorStop(0, 'rgba(0,0,0,0)');
      band.addColorStop(0.12, `rgba(0,0,0,${lift[2] ?? 0.78})`);
      band.addColorStop(0.88, `rgba(0,0,0,${lift[2] ?? 0.78})`);
      band.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = band;
      c.fillRect(b.x - 4, y0 - 2, b.w + 8, y1 - y0 + 4);
    }
    c.globalCompositeOperation = 'source-over';
  });
  clipTo(e, shape, () => {
    // pigment pooled at the drying edge, soft on the inside
    e.save();
    e.filter = 'blur(1.4px)';
    e.strokeStyle = POOL;
    e.globalAlpha = 0.7 * rim;
    e.lineWidth = 5;
    polyPath(e, shape);
    e.stroke();
    e.restore();
    // the shadow under the belly, where the wash ran down and settled
    const g = e.createLinearGradient(0, b.y + b.h * 0.55, 0, b.y + b.h);
    g.addColorStop(0, 'rgba(138,134,127,0)');
    g.addColorStop(1, `rgba(138,134,127,${shade})`);
    e.fillStyle = g;
    e.fillRect(b.x - 4, b.y + b.h * 0.55, b.w + 8, b.h * 0.5);
    // a few tide-marks where the wash dried unevenly
    e.save();
    e.strokeStyle = POOL;
    e.lineWidth = 0.9;
    e.globalAlpha = 0.32;
    for (let i = 0; i < 3; i += 1) {
      const cx = b.x + b.w * (0.15 + r() * 0.7);
      const cy = b.y + b.h * (0.3 + r() * 0.5);
      polyPath(e, blob(cx, cy, 8 + r() * b.w * 0.08, 5 + r() * b.h * 0.12, { seed: seed + 90 + i, lobes: 10, irregular: 0.4 }));
      e.stroke();
    }
    e.restore();
  });
}

// Shaded glass, in the pencil (it is not the residents' colour): a cool
// grey wash, a hatch of reflection and a bright slant of sky.
function glass(part, pts, seed) {
  const { p } = part;
  const b = boundsOf(pts);
  wash(p, pts, GLASS, { alpha: 0.5, seed, edge: 0.3, bloom: 0.2, blur: 0.4, granulate: 0.2 });
  hatch(p, pts, { spacing: 2.6, alpha: 0.22, angle: -1.1, seed: seed + 1 });
  clipTo(p, pts, () => {
    p.globalAlpha = 0.65;
    p.fillStyle = '#ffffff';
    p.beginPath();
    p.moveTo(b.x + b.w * 0.55, b.y);
    p.lineTo(b.x + b.w * 0.75, b.y);
    p.lineTo(b.x + b.w * 0.35, b.y + b.h);
    p.lineTo(b.x + b.w * 0.15, b.y + b.h);
    p.closePath();
    p.fill();
  });
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

const cutOut = (c, pts) => {
  c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
  polyPath(c, pts); c.fill(); c.restore();
};

// ------------------------------------------------------------- the parts

function boiler(rect, nose, S, seed) {
  const k = rect.h / 84; // 1 at the yard's size
  const noseR = rect.h * 0.5;
  const part = sheet({ x: rect.x - (nose < 0 ? noseR : 0), y: rect.y, w: rect.w + noseR, h: rect.h }, 10, S);
  const { p, e } = part;
  const lw = 1.5 * Math.max(0.7, k);
  const body = roundRect(rect.x, rect.y + rect.h * 0.04, rect.w, rect.h * 0.92, rect.h * 0.3);
  gouache(part, body, seed, { shade: 0.42, lift: [0.08, 0.26, 0.5] });
  pencil(p, body, { closed: true, smooth: true, w: lw, seed: seed + 3 });
  // boiler bands
  for (let i = 1; i < 5; i += 1) {
    const bx = rect.x + (rect.w * i) / 5;
    pencil(p, [[bx, rect.y + rect.h * 0.06], [bx + 1, rect.y + rect.h * 0.5], [bx, rect.y + rect.h * 0.94]], { w: lw * 0.75, seed: seed + 10 + i });
    pencil(p, [[bx + 3 * k, rect.y + rect.h * 0.08], [bx + 3 * k, rect.y + rect.h * 0.92]], { w: lw * 0.4, alpha: 0.5, seed: seed + 20 + i, smooth: false });
    rule(e, bx + 1.5 * k, rect.y + rect.h * 0.1, bx + 1.5 * k, rect.y + rect.h * 0.9, { w: 2.2 * k + 0.5, alpha: 0.35, color: POOL, seed: seed + 25 + i, overshoot: 0 });
  }
  // handrail
  rule(p, rect.x + rect.w * 0.12, rect.y + rect.h * 0.26, rect.x + rect.w * 0.9, rect.y + rect.h * 0.26, { w: lw * 0.6, alpha: 0.7, seed: seed + 30, overshoot: 0 });
  hatch(p, handRect(rect.x + 6, rect.y + rect.h * 0.7, rect.w - 12, rect.h * 0.22, { seed: seed + 31, amp: 0.4 }), { spacing: 3.2 * k + 1, alpha: 0.3, seed: seed + 32 });
  // the smokebox: a round face at the nose, its door, its rivets, a lamp
  const fx = nose < 0 ? rect.x + 4 * k : rect.x + rect.w - 4 * k;
  const fy = rect.y + rect.h / 2;
  const face = blob(fx, fy, noseR, noseR, { seed: seed + 40, lobes: 14, irregular: 0.03 });
  gouache(part, face, seed + 41, { shade: 0.5, streaks: 3, rim: 1.2 });
  wash(e, blob(fx, fy, noseR * 0.62, noseR * 0.62, { seed: seed + 42, lobes: 12, irregular: 0.03 }), SHADE, { alpha: 0.55, seed: seed + 43, edge: 0.4 });
  pencil(p, face, { closed: true, w: lw * 1.1, seed: seed + 44 });
  pencil(p, blob(fx, fy, noseR * 0.66, noseR * 0.66, { seed: seed + 45, lobes: 12, irregular: 0.02 }), { closed: true, w: lw * 0.8, seed: seed + 46 });
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU;
    p.save(); p.fillStyle = INK.graphite; p.globalAlpha = 0.6;
    p.beginPath(); p.arc(fx + Math.cos(a) * noseR * 0.82, fy + Math.sin(a) * noseR * 0.82, 0.9 * Math.max(1, k), 0, TAU); p.fill(); p.restore();
  }
  rule(p, fx - noseR * 0.3, fy, fx + noseR * 0.3, fy, { w: lw * 0.9, seed: seed + 47, overshoot: 0 });
  p.save(); p.fillStyle = INK.graphite; p.beginPath(); p.arc(fx, fy, 2 * Math.max(0.8, k), 0, TAU); p.fill(); p.restore();
  // a headlamp on top of the face, its glass warm
  const lx = fx + (nose < 0 ? 6 : -6) * k;
  const ly = rect.y - 2 * k;
  const lamp = handRect(lx - 5 * k, ly - 9 * k, 10 * k, 9 * k, { seed: seed + 48, amp: 0.3 });
  wash(p, lamp, HUE.lamp, { alpha: 0.55, seed: seed + 52, edge: 0.3, bloom: 0.1 });
  pencil(p, lamp, { closed: true, smooth: false, w: lw * 0.7, seed: seed + 49 });
  hatch(p, blob(fx - noseR * 0.2, fy + noseR * 0.3, noseR * 0.8, noseR * 0.5, { seed: seed + 50 }), { spacing: 3 * k + 1, alpha: 0.28, angle: -0.5, seed: seed + 51 });
  return done(part);
}

function stack(rect, nose, S, seed, { whistle = true } = {}) {
  const part = sheet(rect, 8, S);
  const { p } = part;
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
  gouache(part, barrel, seed, { shade: 0.3, streaks: 3 });
  gouache(part, cap, seed + 1, { shade: 0.25, streaks: 2 });
  pencil(p, barrel, { smooth: false, w: lw, seed: seed + 4 });
  pencil(p, cap, { closed: true, smooth: true, w: lw, seed: seed + 5 });
  rule(p, cx - chimW * 0.8, top + capH * 0.42, cx + chimW * 0.8, top + capH * 0.42, { w: lw * 0.6, alpha: 0.6, overshoot: 0, seed: seed + 6 });
  hatch(p, barrel, { spacing: 2.8, alpha: 0.26, angle: -1.35, seed: seed + 7 });
  if (whistle) {
    // the dome and the brass whistle beside the stack
    const dx = cx + (nose < 0 ? 1 : -1) * rect.w * 0.02 + (nose < 0 ? rect.w * 0.45 : -rect.w * 0.45);
    const dome = [];
    for (let i = 0; i <= 12; i += 1) { const a = Math.PI + (i / 12) * Math.PI; dome.push([dx + Math.cos(a) * rect.w * 0.17, bot - 2 + Math.sin(a) * rect.h * 0.38]); }
    gouache(part, [...dome, [dx + rect.w * 0.22, bot], [dx - rect.w * 0.22, bot]], seed + 8, { shade: 0.3, streaks: 2 });
    pencil(p, [[dx - rect.w * 0.22, bot], ...dome, [dx + rect.w * 0.22, bot]], { w: lw, seed: seed + 9 });
    hatch(p, [...dome.slice(6), [dx + rect.w * 0.17, bot], [dx, bot]], { spacing: 2.6, alpha: 0.28, seed: seed + 10 });
    const wx = dx + (nose < 0 ? 1 : -1) * rect.w * 0.02;
    const wy = bot - rect.h * 0.5;
    pencil(p, [[wx, wy - rect.h * 0.16], [wx, wy + rect.h * 0.1]], { w: lw * 0.8, seed: seed + 11, smooth: false });
    const bell = blob(wx, wy - rect.h * 0.2, rect.w * 0.05, rect.h * 0.1, { seed: seed + 12, lobes: 8, irregular: 0.05 });
    gouache(part, bell, seed + 13, { shade: 0.2, streaks: 1 });
    pencil(p, bell, { closed: true, w: lw * 0.8, seed: seed + 14 });
  }
  return done(part);
}

function cab(rect, nose, S, seed, { hawthornMark = true } = {}) {
  const part = sheet(rect, 8, S);
  const { p, c, e } = part;
  const k = rect.w / 102;
  const lw = 1.5 * Math.max(0.7, k);
  const body = handRect(rect.x, rect.y, rect.w, rect.h, { seed, amp: 0.6 });
  gouache(part, body, seed + 1, { shade: 0.36, lift: [0.08, 0.56, 0.62] });
  pencil(p, body, { closed: true, smooth: false, w: lw, seed: seed + 4 });
  // the cab's spectacle window, glazed, and its frame
  const ww = rect.w * 0.52;
  const wh = rect.h * 0.36;
  const wx = rect.x + (rect.w - ww) / 2 + (nose < 0 ? -rect.w * 0.06 : rect.w * 0.06);
  const wy = rect.y + rect.h * 0.15;
  const win = roundRect(wx, wy, ww, wh, Math.min(ww, wh) * 0.25);
  cutOut(c, win); cutOut(e, win);
  glass(part, win, seed + 15);
  pencil(p, win, { closed: true, w: lw * 0.9, seed: seed + 5 });
  pencil(p, roundRect(wx - 2.5 * k, wy - 2.5 * k, ww + 5 * k, wh + 5 * k, Math.min(ww, wh) * 0.3), { closed: true, w: lw * 0.5, alpha: 0.6, seed: seed + 6 });
  rule(p, wx + ww / 2, wy, wx + ww / 2, wy + wh, { w: lw * 0.6, seed: seed + 7, overshoot: 0 });
  // the belt line carried on from the carriage
  rule(p, rect.x + 2, rect.y + rect.h * 0.6, rect.x + rect.w - 2, rect.y + rect.h * 0.6, { w: lw * 0.7, seed: seed + 16, overshoot: 0 });
  rule(e, rect.x + 2, rect.y + rect.h * 0.63, rect.x + rect.w - 2, rect.y + rect.h * 0.63, { w: 2.5 * k + 0.6, alpha: 0.45, color: POOL, seed: seed + 17, overshoot: 0 });
  pencil(p, handRect(rect.x + 5 * k, rect.y + rect.h * 0.66, rect.w - 10 * k, rect.h * 0.28, { seed: seed + 8, amp: 0.4 }), { closed: true, smooth: false, w: lw * 0.55, alpha: 0.7, seed: seed + 9 });
  const railX = nose < 0 ? rect.x + 5 * k : rect.x + rect.w - 5 * k;
  rule(p, railX, rect.y + rect.h * 0.62, railX, rect.y + rect.h * 0.95, { w: lw * 0.8, seed: seed + 10, overshoot: 2 });
  hatch(p, handRect(rect.x + 3, rect.y + rect.h * 0.76, rect.w - 6, rect.h * 0.22, { seed: seed + 11, amp: 0.2 }), { spacing: 3.2 * k + 1, alpha: 0.26, seed: seed + 12 });
  rivets(p, rect.x + 4 * k, rect.x + rect.w - 4 * k, rect.y + 3 * k, 7 * k + 2, seed + 13);
  if (hawthornMark) {
    // Mara's hawthorn, painted small on the cab: the answer, carried, not asked.
    const hx = rect.x + rect.w * (nose < 0 ? 0.62 : 0.38);
    const hy = rect.y + rect.h * 0.8;
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

// The night service's car side, at any size: a pale window band over the
// painted lower body, two belt lines, paired doors with their own tall
// windows, and the window rhythm between them.
function carriage(rect, S, seed, { windows = 4 } = {}) {
  const part = sheet(rect, 8, S);
  const { p, c, e } = part;
  const k = rect.h / 84;
  const lw = 1.5 * Math.max(0.65, k);
  const body = roundRect(rect.x, rect.y, rect.w, rect.h, 6 * k + 1);
  // the cream band of the livery: paint lifted off above the belt
  gouache(part, body, seed + 1, { shade: 0.36, lift: [0.06, 0.55, 0.72], streaks: 9 });
  pencil(p, body, { closed: true, w: lw, seed: seed + 4 });
  // the two belt lines (and the darker paint pooled along them)
  const belt = rect.y + rect.h * 0.58;
  rule(p, rect.x + 3, belt, rect.x + rect.w - 3, belt, { w: lw * 0.7, seed: seed + 5, overshoot: 0 });
  rule(p, rect.x + 3, belt + rect.h * 0.06, rect.x + rect.w - 3, belt + rect.h * 0.06, { w: lw * 0.5, alpha: 0.6, seed: seed + 6, overshoot: 0 });
  rule(e, rect.x + 3, belt + rect.h * 0.03, rect.x + rect.w - 3, belt + rect.h * 0.03, { w: 3 * k + 0.8, alpha: 0.5, color: POOL, seed: seed + 7, overshoot: 0 });
  // doors: a pair, a third of the way in from each end, with tall windows
  const doorW = rect.w * (windows > 3 ? 0.11 : 0.14);
  const doorAt = [rect.x + rect.w * 0.2, rect.x + rect.w * 0.68];
  const doorTop = rect.y + rect.h * 0.1;
  const doorBot = rect.y + rect.h * 0.96;
  doorAt.forEach((dx, d) => {
    const leaf = doorW / 2;
    [0, 1].forEach((i) => {
      const lx = dx + i * leaf;
      pencil(p, handRect(lx, doorTop, leaf, doorBot - doorTop, { seed: seed + 60 + d * 4 + i, amp: 0.3 }), { closed: true, smooth: false, w: lw * 0.7, seed: seed + 61 + d * 4 + i });
      const gw = roundRect(lx + leaf * 0.2, doorTop + rect.h * 0.06, leaf * 0.6, rect.h * 0.36, Math.min(leaf * 0.2, 3));
      cutOut(c, gw); cutOut(e, gw);
      glass(part, gw, seed + 70 + d * 4 + i);
      pencil(p, gw, { closed: true, w: lw * 0.55, seed: seed + 72 + d * 4 + i });
    });
    // the door's brass trim and handles, a touch of lamp yellow in the pencil
    pencil(p, handRect(dx - 1.5 * k, doorTop - 1.5 * k, doorW + 3 * k, doorBot - doorTop + 1.5 * k, { seed: seed + 80 + d, amp: 0.2 }), { closed: true, smooth: false, w: lw * 0.45, alpha: 0.7, color: '#9a7a3e', seed: seed + 81 + d });
    [dx + doorW * 0.42, dx + doorW * 0.58].forEach((hx) => rule(p, hx, belt - rect.h * 0.04, hx, belt + rect.h * 0.04, { w: lw * 0.7, color: '#9a7a3e', seed: seed + 84 + d, overshoot: 0 }));
  });
  // windows in the bays between and beyond the doors
  const bays = [
    [rect.x + rect.w * 0.05, doorAt[0] - rect.w * 0.02],
    [doorAt[0] + doorW + rect.w * 0.02, doorAt[1] - rect.w * 0.02],
    [doorAt[1] + doorW + rect.w * 0.02, rect.x + rect.w * 0.95],
  ];
  const counts = windows > 3 ? [1, 3, 1] : [1, 2, 1];
  const wy = rect.y + rect.h * 0.14;
  const wh = rect.h * 0.36;
  let n = 0;
  bays.forEach(([x0, x1], bi) => {
    const span = x1 - x0;
    const gap = span / counts[bi];
    for (let i = 0; i < counts[bi]; i += 1) {
      const ww = gap * 0.78;
      const wx = x0 + i * gap + (gap - ww) / 2;
      const win = roundRect(wx, wy, ww, wh, Math.min(ww, wh) * 0.22);
      cutOut(c, win); cutOut(e, win);
      glass(part, win, seed + 10 + n);
      pencil(p, win, { closed: true, w: lw * 0.85, seed: seed + 20 + n });
      pencil(p, roundRect(wx - 2.5 * k, wy - 2.5 * k, ww + 5 * k, wh + 5 * k, Math.min(ww, wh) * 0.3), { closed: true, w: lw * 0.4, alpha: 0.5, seed: seed + 30 + n });
      // a curtain tied back, hatched
      const curtain = [[wx + ww * 0.06, wy + 2], [wx + ww * 0.24, wy + 2], [wx + ww * 0.14, wy + wh * 0.55], [wx + ww * 0.06, wy + wh - 2]];
      pencil(p, curtain, { w: lw * 0.45, alpha: 0.55, seed: seed + 40 + n });
      hatch(p, curtain, { spacing: 2.2, alpha: 0.3, angle: -1.4, seed: seed + 45 + n });
      // a ventilation grille under the window, as on the night service
      if (bi === 1) for (let g = 0; g < 3; g += 1) rule(p, wx + ww * 0.36, belt + rect.h * (0.16 + g * 0.05), wx + ww * 0.64, belt + rect.h * (0.16 + g * 0.05), { w: lw * 0.4, alpha: 0.55, seed: seed + 50 + n * 3 + g, overshoot: 0 });
      n += 1;
    }
  });
  hatch(p, handRect(rect.x + 3, rect.y + rect.h * 0.84, rect.w - 6, rect.h * 0.14, { seed: seed + 62, amp: 0.2 }), { spacing: 3.2 * k + 1, alpha: 0.26, seed: seed + 63 });
  rivets(p, rect.x + 6, rect.x + rect.w - 6, rect.y + rect.h - 3 * k - 1, 8 * k + 2, seed + 64);
  return done(part);
}

// The night service's roof: a shallow curve with deep eaves, a long
// equipment box on the crown with its louvres, and a row of low vents.
function roof(rect, S, seed) {
  const part = sheet({ x: rect.x, y: rect.y - rect.h * 0.3, w: rect.w, h: rect.h * 1.3 }, 8, S);
  const { p, e } = part;
  const k = rect.h / 40;
  const lw = 1.5 * Math.max(0.65, k);
  const pts = [];
  const eave = rect.y + rect.h;
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    const x = rect.x + t * rect.w;
    const lift = Math.pow(Math.sin(t * Math.PI), 0.25);
    pts.push([x, eave - lift * rect.h * 0.7]);
  }
  const shape = [[rect.x, eave], ...pts, [rect.x + rect.w, eave]];
  gouache(part, shape, seed, { shade: 0.45, streaks: 5 });
  pencil(p, shape, { smooth: false, w: lw, seed: seed + 3 });
  rule(p, rect.x - 3, eave, rect.x + rect.w + 3, eave, { w: lw * 1.1, seed: seed + 4 });
  rule(p, rect.x + 4, eave - rect.h * 0.24, rect.x + rect.w - 4, eave - rect.h * 0.24, { w: lw * 0.5, alpha: 0.6, seed: seed + 5, overshoot: 0 });
  rule(e, rect.x + 2, eave - 2, rect.x + rect.w - 2, eave - 2, { w: 3 * k + 0.6, alpha: 0.5, color: POOL, seed: seed + 6, overshoot: 0 });
  // the rain strip's ribs
  for (let x = rect.x + rect.w * 0.06; x < rect.x + rect.w * 0.95; x += Math.max(10, rect.w / 18)) {
    pencil(p, [[x, eave - 1], [x + 1, eave - rect.h * 0.55]], { w: lw * 0.35, alpha: 0.42, seed: seed + Math.round(x), smooth: false, passes: 1 });
  }
  // the equipment box on the crown, with louvres
  const crown = eave - rect.h * 0.7;
  const bw = rect.w * 0.3;
  const bx = rect.x + rect.w * 0.42;
  const bh = rect.h * 0.34;
  const box = handRect(bx, crown - bh, bw, bh + 2, { seed: seed + 70, amp: 0.4 });
  gouache(part, box, seed + 71, { shade: 0.5, streaks: 2 });
  pencil(p, box, { closed: true, smooth: false, w: lw * 0.8, seed: seed + 72 });
  for (let i = 0; i < 2; i += 1) {
    const lx = bx + bw * (0.12 + i * 0.5);
    for (let j = 0; j < 3; j += 1) rule(p, lx, crown - bh * (0.75 - j * 0.22), lx + bw * 0.32, crown - bh * (0.75 - j * 0.22), { w: lw * 0.4, alpha: 0.6, seed: seed + 73 + i * 3 + j, overshoot: 0 });
  }
  // low vents along the crown
  const n = Math.max(2, Math.round(rect.w / 140));
  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    const vx = rect.x + rect.w * (t < 0.42 ? t * 0.9 : 0.75 + (t - 0.42) * 0.38) - 6 * k;
    const vent = handRect(vx, crown - 5 * k, 12 * k + 2, 5 * k + 1, { seed: seed + 80 + i, amp: 0.3 });
    gouache(part, vent, seed + 81 + i, { shade: 0.4, streaks: 1, rim: 0.6 });
    pencil(p, vent, { closed: true, smooth: false, w: lw * 0.6, seed: seed + 82 + i });
  }
  hatch(p, handRect(rect.x + 2, eave - rect.h * 0.22, rect.w - 4, rect.h * 0.2, { seed: seed + 90, amp: 0.2 }), { spacing: 3 * k + 1.2, alpha: 0.28, angle: -0.4, seed: seed + 91 });
  return done(part);
}

// One wheel, centred in its canvas, so the scene can spin it.
export function paintWheel(r, S, seed = 1) {
  const pad = 4;
  const size = Math.ceil((r + pad) * 2);
  const part = { x: -size / 2, y: -size / 2, w: size, h: size, S, shapes: [] };
  part.pencil = makeCanvas(size * S, size * S);
  part.wash = makeCanvas(size * S, size * S);
  part.edge = makeCanvas(size * S, size * S);
  part.p = part.pencil.getContext('2d');
  part.c = part.wash.getContext('2d');
  part.e = part.edge.getContext('2d');
  [part.p, part.c, part.e].forEach((ctx) => { ctx.scale(S, S); ctx.translate(size / 2, size / 2); });
  const { p, e } = part;
  const k = r / 33;
  const lw = 1.5 * Math.max(0.6, k);
  const rim = blob(0, 0, r, r, { seed, lobes: 16, irregular: 0.02 });
  gouache(part, rim, seed, { shade: 0.3, streaks: 2, rim: 1.3 });
  // the counterweight, pooled darker
  const cw = [];
  for (let i = 0; i <= 10; i += 1) { const a = 0.6 + (i / 10) * 1.9; cw.push([Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78]); }
  for (let i = 10; i >= 0; i -= 1) { const a = 0.6 + (i / 10) * 1.9; cw.push([Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45]); }
  wash(e, cw, SHADE, { alpha: 0.55, seed: seed + 3, edge: 0.4 });
  wash(e, blob(0, 0, r * 0.3, r * 0.3, { seed: seed + 1, lobes: 10, irregular: 0.03 }), SHADE, { alpha: 0.5, seed: seed + 2 });
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
  done(part, 0.25);
  return { pencil: part.pencil, wash: part.wash, edge: part.edge, size, S };
}

function chassis(spec, S, seed) {
  const { frame } = spec;
  const k = frame.h / 19;
  const lw = 1.5 * Math.max(0.6, k);
  const rect = { x: frame.x0 - 30 * k, y: frame.y - 10 * k, w: frame.x1 - frame.x0 + 60 * k, h: frame.h + 40 * k };
  const part = sheet(rect, 6, S);
  const { p } = part;
  // the frame: a kraft-wrapped beam with its footplate (pencil and a little
  // kraft wash: it is the paper's own brown, not a resident's colour)
  const beam = handRect(frame.x0, frame.y, frame.x1 - frame.x0, frame.h, { seed, amp: 0.5 });
  wash(p, beam, HUE.bark, { alpha: 0.4, seed: seed + 1, bloom: 0.3, granulate: 0.4 });
  pencil(p, beam, { closed: true, smooth: false, w: lw, seed: seed + 2 });
  rivets(p, frame.x0 + 6, frame.x1 - 6, frame.y + frame.h * 0.5, 9 * k + 3, seed + 3);
  hatch(p, beam, { spacing: 3, alpha: 0.25, angle: -0.8, seed: seed + 4 });
  // the bogie frames round the wheels: a pencil truss over each wheel
  (spec.wheels ?? []).forEach((w, i) => {
    const bw = w.r * 2.5;
    const top = frame.y + frame.h * 0.6;
    pencil(p, [[w.x - bw / 2, top], [w.x - bw * 0.3, w.y - w.r * 0.15], [w.x + bw * 0.3, w.y - w.r * 0.15], [w.x + bw / 2, top]], { smooth: false, w: lw * 0.6, alpha: 0.55, seed: seed + 40 + i });
    p.save(); p.fillStyle = INK.graphite; p.globalAlpha = 0.5;
    p.beginPath(); p.arc(w.x, top + 1, 1.6 * Math.max(0.7, k), 0, TAU); p.fill(); p.restore();
  });
  // buffers at both ends
  [frame.x0, frame.x1].forEach((bx, i) => {
    const dir = i ? 1 : -1;
    const by = frame.y + frame.h * 0.5;
    rule(p, bx, by, bx + dir * 16 * k, by, { w: lw * 1.2, seed: seed + 10 + i, overshoot: 0 });
    const buffer = blob(bx + dir * 20 * k, by, 4.5 * k + 1, 7 * k + 1, { seed: seed + 12 + i, lobes: 10, irregular: 0.04 });
    wash(p, buffer, INK.soft, { alpha: 0.45, seed: seed + 18 + i });
    pencil(p, buffer, { closed: true, w: lw * 0.9, seed: seed + 14 + i });
  });
  // rails under it, and the sleepers' ends
  const ry = frame.y + frame.h + (spec.railDrop ?? 22 * k);
  rule(p, rect.x, ry, rect.x + rect.w, ry, { w: lw * 1.2, seed: seed + 30 });
  rule(p, rect.x, ry + 3 * k, rect.x + rect.w, ry + 3 * k, { w: lw * 0.6, alpha: 0.6, seed: seed + 31 });
  delete part.c; delete part.e;
  part.p.setTransform(1, 0, 0, 1, 0, 0);
  tooth(part.p, part.pencil.width, part.pencil.height, 0.28);
  delete part.p;
  return part;
}

// The sheet the train is drawn on: every part's shape in paper, so the
// street behind does not show through the washes. One canvas for the whole
// train (x, y in the scene's coordinates).
function paperUnderlay(parts, wheels, S) {
  const list = Object.values(parts);
  const x0 = Math.min(...list.map((p) => p.x), ...wheels.map((w) => w.x - w.r));
  const y0 = Math.min(...list.map((p) => p.y), ...wheels.map((w) => w.y - w.r));
  const x1 = Math.max(...list.map((p) => p.x + p.w), ...wheels.map((w) => w.x + w.r));
  const y1 = Math.max(...list.map((p) => p.y + p.h), ...wheels.map((w) => w.y + w.r));
  const canvas = makeCanvas((x1 - x0) * S, (y1 - y0) * S);
  const c = canvas.getContext('2d');
  c.scale(S, S);
  c.translate(-x0, -y0);
  c.fillStyle = PAPER_UNDER;
  list.forEach((part) => part.shapes.forEach((shape) => { polyPath(c, shape); c.fill(); }));
  wheels.forEach((w) => { c.beginPath(); c.arc(w.x, w.y, w.r, 0, TAU); c.fill(); });
  list.forEach((part) => delete part.shapes);
  return { canvas, x: x0, y: y0 };
}

// The coupling rod between the driving wheels, drawn by the scene each
// frame from these points (it has to follow the crank).
export function rodPoints(spec) {
  return spec.wheels.map(({ x, y }) => ({ x, y }));
}

// spec: { S, nose: -1 | 1, boiler, cab, stack, carriage, roof, wheels: [{x,y,r}], frame: {x0, x1, y, h}, windows, stackWhistle }
// Each part: { pencil, wash, edge, x, y }; also chassis { pencil, x, y },
// paper { canvas, x, y }, wheel { pencil, wash, edge, size }.
export function paintTrain(spec, seed = 0x7a1) {
  const S = spec.S ?? 2;
  const nose = spec.nose ?? 1;
  const parts = {
    red: boiler(spec.boiler, nose, S, seed + 100),
    yellow: stack(spec.stack, nose, S, seed + 200, { whistle: spec.stackWhistle !== false }),
    orange: cab(spec.cab, nose, S, seed + 300, { hawthornMark: spec.hawthornMark !== false }),
    blue: carriage(spec.carriage, S, seed + 400, { windows: spec.windows ?? 4 }),
    violet: roof(spec.roof, S, seed + 500),
  };
  return {
    S,
    parts,
    paper: paperUnderlay(parts, spec.wheels, S),
    chassis: chassis(spec, S, seed + 600),
    wheel: paintWheel(spec.wheels[0].r, S, seed + 700),
    wheels: spec.wheels,
  };
}
