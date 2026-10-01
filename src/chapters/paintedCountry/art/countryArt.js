// Chapter 4 // THE PAINTED COUNTRY — Rosa's country, drawn and then painted.
//
// Every painter here draws on an ArtLayers: one graphite canvas (the
// under-drawing, always visible) and one wash canvas per colour group. The
// groups are the six colours the residents lend in Part III, by pigment id
// (chapter4ExpansionModel.js PIGMENTS), so a scene can bloom exactly the
// colour that has just been returned:
//   red     vermilion: roofs, apples, the bakery awning
//   orange  marigold: lamps, lit windows, marigolds by the doors
//   yellow  ochre: wheat fields, plaster, the child's sun
//   green   verdigris: leaves, hedges, the near hills
//   blue    indigo: sky, the river, slate
//   violet  mulberry: the far hills, evening shadow, the quilt
// The pencil is drawn at full size; washes may be drawn at half size
// (`washScale`), since a wash is soft anyway and it quarters the memory.

import { HUE, INK, TAU, blob, hatch, makeCanvas, pencil, rng, rule, scribble, tooth, wash, washBlob, washRect, handRect } from './pencilKit.js';

export const COLOUR_GROUPS = Object.freeze(['violet', 'blue', 'yellow', 'green', 'red', 'orange']);

export function artLayers(w, h, { groups = COLOUR_GROUPS, washScale = 1, scale = 1 } = {}) {
  const pencilCanvas = makeCanvas(w * scale, h * scale);
  const p = pencilCanvas.getContext('2d');
  p.scale(scale, scale);
  const washes = {};
  groups.forEach((id) => {
    const canvas = makeCanvas(w * scale * washScale, h * scale * washScale);
    const c = canvas.getContext('2d');
    c.scale(scale * washScale, scale * washScale);
    washes[id] = { canvas, c };
  });
  return {
    w, h, scale, washScale, p, pencil: pencilCanvas, washes,
    // Washes for a group not on this sheet go nowhere (an offscreen sink).
    w$(id) { return (washes[id] ?? sink()).c; },
    finish(strength = 0.42) { tooth(p, w, h, strength); return this; },
  };
}

let sinkCache = null;
function sink() {
  if (!sinkCache) { const canvas = makeCanvas(1, 1); sinkCache = { canvas, c: canvas.getContext('2d') }; }
  return sinkCache;
}

// ================================================================ trees

// An apple tree: a drawn trunk and limbs, a scribbled canopy, a wash of leaf
// and a scatter of red apples. `s` is the scale (1 ≈ 120 px tall).
export function appleTree(L, x, ground, s = 1, seed = 1, { apples = 7, blossom = false } = {}) {
  const r = rng(seed);
  const p = L.p;
  const trunkH = 52 * s;
  const lean = (r() - 0.5) * 8 * s;
  const top = [x + lean, ground - trunkH];
  pencil(p, [[x - 3 * s, ground], [x - 2 * s + lean * 0.4, ground - trunkH * 0.5], [top[0] - 2 * s, top[1]]], { w: 1.5 * s + 0.4, seed: seed + 1 });
  pencil(p, [[x + 3.5 * s, ground], [x + 3 * s + lean * 0.4, ground - trunkH * 0.5], [top[0] + 2 * s, top[1]]], { w: 1.5 * s + 0.4, seed: seed + 2 });
  // limbs into the canopy
  for (let i = 0; i < 3; i += 1) {
    const a = -Math.PI / 2 + (i - 1) * 0.7 + (r() - 0.5) * 0.3;
    const len = (22 + r() * 14) * s;
    pencil(p, [[top[0], top[1] + 6 * s], [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len]], { w: 1.1 * s + 0.3, seed: seed + 10 + i, alpha: 0.75 });
  }
  const cx = top[0];
  const cy = top[1] - 18 * s;
  const rx = (40 + r() * 8) * s;
  const ry = (32 + r() * 6) * s;
  const crown = blob(cx, cy, rx, ry, { seed: seed + 3, lobes: 11, irregular: 0.3 });
  pencil(p, crown, { closed: true, w: 1.2 * s + 0.35, alpha: 0.8, seed: seed + 4, jitter: 0.8 });
  scribble(p, cx, cy + ry * 0.25, rx * 0.8, ry * 0.6, { seed: seed + 5, loops: Math.round(14 * s + 6), w: 0.8 * s + 0.3, alpha: 0.32 });
  hatch(p, blob(cx, cy + ry * 0.45, rx * 0.85, ry * 0.45, { seed: seed + 6 }), { spacing: 4 * s + 1.5, alpha: 0.22, w: 0.7, seed: seed + 7 });
  // the bark, under the leaves
  washRect(L.w$('red'), x - 3 * s, ground - trunkH, 7 * s, trunkH, HUE.bark, { alpha: 0.32, seed: seed + 8, bloom: 0.1 });
  const g = L.w$('green');
  wash(g, crown, blossom ? HUE.leaf : HUE.leaf, { alpha: 0.62, seed: seed + 9, bloom: 0.4 });
  washBlob(g, cx + rx * 0.1, cy + ry * 0.35, rx * 0.75, ry * 0.5, HUE.leafDark, { alpha: 0.38, seed: seed + 10 });
  const red = L.w$('red');
  for (let i = 0; i < apples; i += 1) {
    const a = r() * TAU;
    const d = Math.sqrt(r()) * 0.8;
    const ax = cx + Math.cos(a) * rx * d;
    const ay = cy + Math.sin(a) * ry * d;
    const ar = (3.2 + r() * 1.4) * s + 0.6;
    washBlob(red, ax, ay, ar, ar, HUE.vermilion, { alpha: 0.9, seed: seed + 20 + i, lobes: 6, blur: 0.3, bloom: 0.1 });
    if (s > 0.45) p.save(), (p.globalAlpha = 0.55), (p.strokeStyle = INK.graphite), (p.lineWidth = 0.7), p.beginPath(), p.arc(ax, ay, ar, 0, TAU), p.stroke(), p.restore();
  }
  if (blossom) hawthornBlossom(L, cx, cy, rx, ry, seed + 40, Math.round(10 * s + 4), s);
  // a cast shadow on the grass
  washBlob(L.w$('violet'), x + 10 * s, ground + 2, rx * 0.8, 4 * s + 1, HUE.mulberry, { alpha: 0.18, seed: seed + 50, bloom: 0 });
}

function hawthornBlossom(L, cx, cy, rx, ry, seed, count, s) {
  const r = rng(seed);
  const p = L.p;
  for (let i = 0; i < count; i += 1) {
    const a = r() * TAU;
    const d = Math.sqrt(r()) * 0.95;
    const bx = cx + Math.cos(a) * rx * d;
    const by = cy + Math.sin(a) * ry * d;
    const br = (2.2 + r() * 1.6) * Math.max(0.6, s);
    p.save();
    p.globalAlpha = 0.95;
    p.fillStyle = HUE.blossom;
    p.beginPath(); p.arc(bx, by, br, 0, TAU); p.fill();
    p.globalAlpha = 0.45; p.strokeStyle = INK.graphite; p.lineWidth = 0.6; p.stroke();
    p.restore();
    const blush = L.w$('red');
    blush.save(); blush.globalAlpha = 0.8; blush.fillStyle = HUE.blush; blush.beginPath(); blush.arc(bx, by, br * 0.35, 0, TAU); blush.fill(); blush.restore();
  }
}

// Mara's hawthorn as a hedge tree: a dark thorny branching and white blossom.
export function hawthorn(L, x, ground, s = 1, seed = 1) {
  const r = rng(seed);
  const p = L.p;
  const tips = [];
  const branch = (bx, by, a, len, depth) => {
    const ex = bx + Math.cos(a) * len;
    const ey = by + Math.sin(a) * len;
    pencil(p, [[bx, by], [(bx + ex) / 2 + (r() - 0.5) * 4 * s, (by + ey) / 2], [ex, ey]], { w: Math.max(0.6, depth * 0.9 * s + 0.3), color: INK.lead, alpha: 0.9, seed: seed + depth * 13 + tips.length });
    // thorns
    if (depth <= 2 && s > 0.4) {
      const tx = (bx + ex) / 2; const ty = (by + ey) / 2;
      pencil(p, [[tx, ty], [tx + Math.cos(a + 1.2) * 4 * s, ty + Math.sin(a + 1.2) * 4 * s]], { w: 0.6, smooth: false, color: INK.lead, alpha: 0.8, passes: 1, seed: seed + 3 });
    }
    if (depth <= 0) { tips.push([ex, ey]); return; }
    branch(ex, ey, a - 0.42 + (r() - 0.5) * 0.3, len * 0.74, depth - 1);
    branch(ex, ey, a + 0.38 + (r() - 0.5) * 0.3, len * 0.7, depth - 1);
  };
  branch(x, ground, -Math.PI / 2 + (r() - 0.5) * 0.2, 34 * s, 4);
  const g = L.w$('green');
  tips.forEach(([tx, ty], i) => washBlob(g, tx, ty, 11 * s + 2, 8 * s + 2, HUE.leafDark, { alpha: 0.42, seed: seed + 60 + i, lobes: 7, bloom: 0.2 }));
  tips.forEach(([tx, ty], i) => hawthornBlossom(L, tx, ty, 10 * s + 2, 7 * s + 2, seed + 80 + i, 3, s));
  // two haws
  const red = L.w$('red');
  tips.slice(0, 3).forEach(([tx, ty], i) => washBlob(red, tx + 6 * s, ty + 5 * s, 2.4 * s + 0.6, 2.4 * s + 0.6, HUE.vermilion, { alpha: 0.95, seed: seed + 99 + i, lobes: 5, blur: 0.2 }));
}

// A low hedge or bush.
export function bush(L, x, ground, w, h, seed = 1, colour = HUE.leaf) {
  const shape = blob(x, ground - h / 2, w / 2, h / 2, { seed, lobes: 10, irregular: 0.35 });
  pencil(L.p, shape.filter(([, y]) => y < ground - 1), { w: 0.9, alpha: 0.7, seed: seed + 1, smooth: false });
  scribble(L.p, x, ground - h * 0.35, w * 0.4, h * 0.3, { seed: seed + 2, loops: 6, alpha: 0.28, w: 0.7 });
  wash(L.w$('green'), shape, colour, { alpha: 0.55, seed: seed + 3 });
}

// ================================================================ buildings

// A house drawn from the side: walls, a gable roof with its tiles hatched,
// windows with their glazing bars, a door, a chimney. `lit` puts a lamp in a
// window (orange group).
export function house(L, x, ground, w, h, seed = 1, { roofH = h * 0.6, chimney = true, lit = false, door = true, wall = HUE.plaster, roof = HUE.roof, porchLamp = false } = {}) {
  const r = rng(seed);
  const p = L.p;
  const wallTop = ground - h;
  const lw = Math.max(0.8, Math.min(1.8, w / 70));
  const body = handRect(x, wallTop, w, h, { seed, amp: 0.8 });
  pencil(p, body, { closed: true, smooth: false, w: lw, seed: seed + 1, overshoot: 0 });
  rule(p, x - 2, ground, x + w + 2, ground, { w: lw, seed: seed + 2 });
  const over = w * 0.08;
  const roofPts = [[x - over, wallTop], [x + w / 2, wallTop - roofH], [x + w + over, wallTop]];
  pencil(p, roofPts, { smooth: false, w: lw * 1.05, seed: seed + 3, overshoot: 4 });
  rule(p, x - over, wallTop, x + w + over, wallTop, { w: lw * 0.8, seed: seed + 4 });
  hatch(p, [[x - over + 3, wallTop - 1], [x + w / 2, wallTop - roofH + 3], [x + w + over - 3, wallTop - 1]], { spacing: Math.max(2.5, w / 26), angle: -0.3, alpha: 0.3, seed: seed + 5 });
  // tile courses
  for (let k = 1; k < 4; k += 1) {
    const yy = wallTop - (roofH * k) / 4;
    const half = (w / 2 + over) * (1 - k / 4);
    pencil(p, [[x + w / 2 - half + 2, yy], [x + w / 2 + half - 2, yy]], { smooth: false, w: 0.6, alpha: 0.4, passes: 1, seed: seed + 6 + k });
  }
  if (chimney) {
    const cx = x + w * (0.65 + r() * 0.1);
    const cTop = wallTop - roofH * 0.95;
    pencil(p, [[cx, wallTop - roofH * 0.42], [cx, cTop], [cx + w * 0.09, cTop], [cx + w * 0.09, wallTop - roofH * 0.3]], { smooth: false, w: lw * 0.9, seed: seed + 9 });
    washRect(L.w$('red'), cx, cTop, w * 0.09, roofH * 0.55, HUE.brick, { alpha: 0.6, seed: seed + 10, bloom: 0.1 });
    // smoke, a drafted curl
    const smoke = [];
    for (let k = 0; k < 9; k += 1) smoke.push([cx + w * 0.045 + Math.sin(k * 0.8) * 4 + k * 2.2, cTop - 4 - k * 5]);
    pencil(p, smoke, { w: 0.8, alpha: 0.32, color: INK.soft, seed: seed + 11 });
  }
  // windows and door
  const winW = Math.max(8, w * 0.18);
  const winH = Math.max(9, h * 0.32);
  const wy = wallTop + h * 0.2;
  const spots = door ? [x + w * 0.14, x + w * 0.66] : [x + w * 0.16, x + w * 0.42, x + w * 0.68];
  spots.forEach((wx, i) => {
    const win = handRect(wx, wy, winW, winH, { seed: seed + 20 + i, amp: 0.5 });
    pencil(p, win, { closed: true, smooth: false, w: lw * 0.75, seed: seed + 21 + i });
    rule(p, wx + winW / 2, wy, wx + winW / 2, wy + winH, { w: 0.6, alpha: 0.6, seed: seed + 22 + i, overshoot: 0 });
    rule(p, wx, wy + winH / 2, wx + winW, wy + winH / 2, { w: 0.6, alpha: 0.6, seed: seed + 23 + i, overshoot: 0 });
    if (lit && i === 0) {
      washRect(L.w$('orange'), wx, wy, winW, winH, HUE.lamp, { alpha: 0.95, seed: seed + 24, bloom: 0.05 });
      washBlob(L.w$('orange'), wx + winW / 2, wy + winH / 2, winW * 1.1, winH * 0.9, HUE.marigold, { alpha: 0.18, seed: seed + 25, bloom: 0, blur: 4 });
    } else {
      washRect(L.w$('blue'), wx, wy, winW, winH, HUE.indigo, { alpha: 0.35, seed: seed + 26 + i, bloom: 0.3 });
    }
  });
  if (door) {
    const dw = w * 0.17;
    const dh = h * 0.55;
    const dx = x + w * 0.42;
    pencil(p, [[dx, ground], [dx, ground - dh], [dx + dw, ground - dh], [dx + dw, ground]], { smooth: false, w: lw * 0.85, seed: seed + 30 });
    hatch(p, handRect(dx, ground - dh, dw, dh, { seed: seed + 31, amp: 0.3 }), { spacing: 3, alpha: 0.28, angle: -1.5, seed: seed + 32 });
    washRect(L.w$('green'), dx, ground - dh, dw, dh, HUE.verdigris, { alpha: 0.55, seed: seed + 33, bloom: 0.2 });
    if (porchLamp) {
      const lx = dx + dw + 5;
      const ly = ground - dh + 4;
      pencil(p, [[lx - 3, ly], [lx + 3, ly], [lx + 3, ly + 8], [lx - 3, ly + 8]], { closed: true, smooth: false, w: 0.8, seed: seed + 34 });
      washBlob(L.w$('orange'), lx, ly + 4, 9, 9, HUE.lamp, { alpha: 0.5, seed: seed + 35, blur: 3, bloom: 0 });
      washRect(L.w$('orange'), lx - 3, ly, 6, 8, HUE.marigold, { alpha: 0.95, seed: seed + 36, bloom: 0 });
    }
  }
  // walls and roof washes
  wash(L.w$('yellow'), body, wall, { alpha: 0.5, seed: seed + 40, bloom: 0.3 });
  wash(L.w$('red'), roofPts, roof, { alpha: 0.72, seed: seed + 41, bloom: 0.35 });
  hatch(p, handRect(x + w * 0.78, wallTop + 2, w * 0.22 - 2, h - 3, { seed: seed + 42, amp: 0.2 }), { spacing: 3.2, angle: -1.1, alpha: 0.22, seed: seed + 43 });
}

// A picket fence along the ground.
export function fence(L, x0, x1, ground, h = 14, seed = 1) {
  const p = L.p;
  const r = rng(seed);
  for (let x = x0; x <= x1; x += h * 0.55 + r() * 2) {
    pencil(p, [[x, ground], [x, ground - h], [x + 1.6, ground - h - 2.4], [x + 3.2, ground - h], [x + 3.2, ground]], { smooth: false, w: 0.7, alpha: 0.7, passes: 1, seed: seed + Math.round(x) });
  }
  [0.35, 0.75].forEach((k, i) => rule(p, x0 - 2, ground - h * k, x1 + 5, ground - h * k, { w: 0.7, alpha: 0.6, seed: seed + 900 + i }));
  washRect(L.w$('yellow'), x0, ground - h - 2, x1 - x0 + 4, h + 2, HUE.plaster, { alpha: 0.4, seed: seed + 950, bloom: 0.2 });
}

// =========================================================== the country

// Rolling ground as a polyline across [x0, x1].
function ridge(x0, x1, base, amp, seed, step = 40) {
  const r = rng(seed);
  const f = 0.004 + r() * 0.004;
  const ph = r() * TAU;
  const pts = [];
  for (let x = x0; x <= x1 + step; x += step) pts.push([x, base - Math.sin(x * f + ph) * amp - Math.sin(x * f * 2.7 + ph * 2) * amp * 0.35 - r() * amp * 0.12]);
  return pts;
}

function fillUnder(pts, bottom) {
  return [...pts, [pts[pts.length - 1][0], bottom], [pts[0][0], bottom]];
}

function yAt(pts, x) {
  for (let i = 0; i < pts.length - 1; i += 1) {
    if (x >= pts[i][0] && x <= pts[i + 1][0]) {
      const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0] || 1);
      return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
    }
  }
  return pts[pts.length - 1][1];
}

// The country seen from the train: sky, the far hills, fields and hedges, the
// orchard, farmhouses, the line, a river. `ground` is where the near field
// meets the bottom of the sheet. `sun` draws the child's crayon sun.
// `features`: an array of { kind, x, s } placed on the near ridge
// (kind: 'house' | 'orchard' | 'hawthorn' | 'tree' | 'mill' | 'station').
export function paintCountry({ w, h, seed = 1, horizon = 0.46, sun = true, features = null, washScale = 0.5, sky = true, density = 1 } = {}) {
  const L = artLayers(w, h, { washScale });
  const r = rng(seed);
  const p = L.p;
  // sky
  if (sky) {
    const bc = L.w$('blue');
    for (let i = 0; i < 3; i += 1) {
      washRect(bc, -20, h * (0.02 + i * 0.1), w + 40, h * 0.12, '#bcd0de', { alpha: 0.24 - i * 0.05, seed: seed + 100 + i, bloom: 0.2, blur: 4, amp: 6, granulate: 0.1 });
    }
    // drafted clouds: loose spirals
    for (let i = 0; i < Math.max(1, Math.round((w / 420) * density)); i += 1) {
      const cx = (i + 0.3 + r() * 0.4) * (w / Math.max(1, Math.round((w / 420) * density)));
      const cy = h * (0.12 + r() * 0.14);
      const pts = [];
      for (let k = 0; k < 26; k += 1) { const a = k * 0.42; pts.push([cx + Math.cos(a) * (8 + k * 1.8), cy + Math.sin(a) * (4 + k * 0.7)]); }
      pencil(p, pts, { w: 0.9, alpha: 0.26, color: INK.soft, seed: seed + 120 + i });
      washBlob(bc, cx, cy, 52, 14, '#ffffff', { alpha: 0.5, seed: seed + 130 + i, bloom: 0.2, blur: 2 });
    }
  }
  if (sun) {
    const sx = w * (0.78 + r() * 0.12);
    const sy = h * 0.16;
    const sr = Math.min(26, h * 0.07);
    p.save();
    p.globalAlpha = 0.55;
    pencil(p, blob(sx, sy, sr, sr, { seed: seed + 140, lobes: 8, irregular: 0.08 }), { closed: true, w: 1, seed: seed + 141, color: INK.soft });
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * TAU;
      rule(p, sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3, sx + Math.cos(a) * sr * 1.8, sy + Math.sin(a) * sr * 1.8, { w: 0.9, alpha: 0.6, color: INK.soft, seed: seed + 142 + i, overshoot: 0 });
    }
    p.restore();
    washBlob(L.w$('yellow'), sx, sy, sr, sr, HUE.ochre, { alpha: 0.8, seed: seed + 150, bloom: 0.2 });
    washBlob(L.w$('orange'), sx, sy, sr * 2.4, sr * 2.2, HUE.lamp, { alpha: 0.18, seed: seed + 151, blur: 6, bloom: 0 });
  }
  // far hills: contour, hatch, mulberry
  const far = ridge(-40, w + 40, h * horizon, h * 0.08, seed + 200, 30);
  pencil(p, far, { w: 1.1, alpha: 0.55, color: INK.soft, seed: seed + 201 });
  hatch(p, fillUnder(far.map(([x, y]) => [x, y + 3]), h * horizon + h * 0.12), { spacing: 5, alpha: 0.18, angle: -0.6, seed: seed + 202, length: 0.6 });
  wash(L.w$('violet'), fillUnder(far, h), HUE.mulberry, { alpha: 0.28, seed: seed + 203, bloom: 0.4, blur: 2 });
  // mid ridge: fields in patches with hedges between
  const mid = ridge(-40, w + 40, h * (horizon + 0.12), h * 0.06, seed + 210, 36);
  pencil(p, mid, { w: 1.3, alpha: 0.75, seed: seed + 211 });
  wash(L.w$('green'), fillUnder(mid, h), HUE.leaf, { alpha: 0.32, seed: seed + 212, bloom: 0.45, blur: 1.5 });
  let fx = -20;
  let fi = 0;
  while (fx < w + 20) {
    const fw = 90 + r() * 160;
    const top = yAt(mid, fx + fw / 2) + 4;
    const bot = top + h * (0.05 + r() * 0.05);
    const quad = [[fx, yAt(mid, fx) + 4], [fx + fw, yAt(mid, fx + fw) + 4], [fx + fw + 14, bot], [fx + 10, bot]];
    const kind = r();
    if (kind < 0.45) wash(L.w$('yellow'), quad, HUE.field, { alpha: 0.6, seed: seed + 220 + fi, bloom: 0.3 });
    else if (kind < 0.7) wash(L.w$('green'), quad, HUE.verdigris, { alpha: 0.35, seed: seed + 220 + fi, bloom: 0.3 });
    // furrows
    for (let k = 0; k < 4; k += 1) {
      const t = (k + 1) / 5;
      pencil(p, [[lerp(quad[0][0], quad[3][0], t), lerp(quad[0][1], quad[3][1], t)], [lerp(quad[1][0], quad[2][0], t), lerp(quad[1][1], quad[2][1], t)]], { smooth: false, w: 0.6, alpha: 0.22, passes: 1, seed: seed + 260 + fi * 5 + k });
    }
    // hedge at the field's edge
    if (r() < 0.6) for (let k = 0; k < fw / 16; k += 1) bush(L, fx + 14 + k * 16 + r() * 4, bot + 2 - (k / (fw / 16)) * 4, 18, 7 + r() * 3, seed + 300 + fi * 17 + k, HUE.leafDark);
    fx += fw + 16;
    fi += 1;
  }
  // a river in the valley, if wide enough
  if (w > 700) {
    const rx = w * (0.2 + r() * 0.5);
    const river = [];
    for (let k = 0; k < 10; k += 1) river.push([rx + Math.sin(k * 0.9) * 30 + k * 18, yAt(mid, rx) + 6 + k * h * 0.035]);
    const left = river.map(([x, y], k) => [x - 2 - k * 1.6, y]);
    const right = river.map(([x, y], k) => [x + 2 + k * 1.6, y]).reverse();
    pencil(p, left, { w: 0.8, alpha: 0.5, seed: seed + 400 });
    pencil(p, [...right].reverse(), { w: 0.8, alpha: 0.5, seed: seed + 401 });
    wash(L.w$('blue'), [...left, ...right], HUE.indigo, { alpha: 0.5, seed: seed + 402, bloom: 0.2 });
  }
  // near ridge, where the orchard and the houses stand
  const near = ridge(-40, w + 40, h * (horizon + 0.3), h * 0.045, seed + 500, 40);
  pencil(p, near, { w: 1.5, alpha: 0.85, seed: seed + 501 });
  wash(L.w$('green'), fillUnder(near, h), HUE.leaf, { alpha: 0.42, seed: seed + 502, bloom: 0.35 });
  hatch(p, fillUnder(near.map(([x, y]) => [x, y + 6]), h), { spacing: 7, alpha: 0.14, angle: -1.2, seed: seed + 503, length: 0.35 });
  // grass ticks
  for (let i = 0; i < w / 6; i += 1) {
    const gx = r() * w;
    const gy = yAt(near, gx) + 4 + r() * (h - yAt(near, gx));
    p.save(); p.globalAlpha = 0.18 + r() * 0.2; p.strokeStyle = INK.graphite; p.lineWidth = 0.7;
    p.beginPath(); p.moveTo(gx, gy); p.lineTo(gx - 1.5, gy - 5 - r() * 3); p.moveTo(gx + 2, gy); p.lineTo(gx + 3.5, gy - 4 - r() * 3); p.stroke(); p.restore();
  }
  // features on the near ridge
  const list = features ?? defaultFeatures(w, r);
  list.forEach((f, i) => {
    const gy = yAt(near, f.x) + 2;
    const s = f.s ?? 0.6;
    const fs = seed + 600 + i * 37;
    if (f.kind === 'house') house(L, f.x, gy, 70 * s, 46 * s, fs, { lit: f.lit, porchLamp: f.lit });
    else if (f.kind === 'orchard') {
      for (let k = 0; k < (f.n ?? 4); k += 1) appleTree(L, f.x + k * 46 * s, yAt(near, f.x + k * 46 * s) + 2 - (k % 2) * 3, s * 0.7, fs + k * 11, { apples: 5 });
    } else if (f.kind === 'hawthorn') hawthorn(L, f.x, gy, s, fs);
    else if (f.kind === 'tree') appleTree(L, f.x, gy, s, fs);
    else if (f.kind === 'farm') {
      house(L, f.x, gy, 80 * s, 50 * s, fs, { lit: true, porchLamp: true });
      fence(L, f.x + 84 * s, f.x + 150 * s, gy, 12 * s, fs + 5);
    }
  });
  return L.finish(0.38);
}

function defaultFeatures(w, r) {
  const out = [];
  for (let x = 40 + r() * 60; x < w - 40; x += 150 + r() * 160) {
    const k = r();
    out.push({ kind: k < 0.35 ? 'orchard' : k < 0.55 ? 'house' : k < 0.75 ? 'hawthorn' : 'tree', x, s: 0.45 + r() * 0.25, lit: r() > 0.5, n: 3 + Math.floor(r() * 3) });
  }
  return out;
}

const lerp = (a, b, t) => a + (b - a) * t;
