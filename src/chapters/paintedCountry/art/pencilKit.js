// Chapter 4 // THE PAINTED COUNTRY — the hand that draws the country.
//
// Plain canvas-2D primitives for a graphite under-drawing and the watercolour
// / gouache washes Rosa's colours come back as. Everything here runs once, at
// boot, into canvases that the scenes turn into textures (artTextures.js);
// nothing is drawn per frame. Every mark is seeded, so the country is drawn
// the same way on every boot.
//
// The language (after src/chapters/finalBoss/finaleWorldArt.js graphite() and
// gouache(), which paint the same world in Chapter 6):
//   pencil()  a graphite line: two passes, pressure taper, a draughtsman's
//             overshoot, then the paper's tooth breaks it up (tooth()).
//   hatch()   parallel graphite strokes clipped to a shape: the only shading
//             paper has.
//   wash()    a watercolour wash: a flat-ish body, pigment pooled at the edge,
//             blooms where it dried unevenly, a soft bleed.
//   dab()     a loaded gouache stroke with bristle streaks (painted cells).

export const TAU = Math.PI * 2;

// Graphite and paper, from paperPalette.js (PAPER), as CSS.
export const INK = Object.freeze({
  lead: '#34312c',
  graphite: '#4a4640',
  soft: '#8d8579',
  faint: '#b7af9f',
  sheet: '#f7f4ec',
  sheetHigh: '#fdfcf8',
  sheetMid: '#efe9dc',
  sheetLow: '#e6dfcd',
  fold: '#d8cfb9',
  deckle: '#c9bda3',
});

// Rosa's colours: the six the residents lend (chapter4ExpansionModel.js) and
// the country's own earth and leaf tones.
export const HUE = Object.freeze({
  vermilion: '#c95850',
  marigold: '#d98a3a',
  ochre: '#d7b84a',
  verdigris: '#5e9172',
  indigo: '#537ca6',
  mulberry: '#84658f',
  leaf: '#7da36f',
  leafDark: '#4f7a5c',
  sky: '#a9c1d3',
  field: '#d9c38a',
  bark: '#8a6a4a',
  roof: '#b9654f',
  brick: '#c07a5c',
  stone: '#b9ad97',
  plaster: '#ecdcb8',
  blossom: '#fdfaf3',
  blush: '#e07a66',
  lamp: '#f2c46a',
  grey: '#8f8a82',
  greyDark: '#77736c',
});

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  return canvas;
}

// ------------------------------------------------------------ geometry

const lerp = (a, b, t) => a + (b - a) * t;

// Catmull-Rom through the points, sampled every `step` px.
export function sampleCurve(points, step = 3, closed = false) {
  if (points.length < 3) return densify(points, step);
  const pts = closed ? [points[points.length - 1], ...points, points[0], points[1]] : [points[0], ...points, points[points.length - 1]];
  const out = [];
  for (let i = 1; i < pts.length - 2; i += 1) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k += 1) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(closed ? points[0] : points[points.length - 1]);
  return out;
}

export function densify(points, step = 3) {
  const out = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [a, b] = [points[i], points[i + 1]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k += 1) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  if (points.length) out.push(points[points.length - 1]);
  return out;
}

// A wobbly closed outline round an ellipse (for canopies, bushes, clouds).
export function blob(x, y, rx, ry, { seed = 1, lobes = 9, irregular = 0.22, rot = 0 } = {}) {
  const r = rng(seed);
  const radii = Array.from({ length: lobes }, () => 1 - irregular / 2 + r() * irregular);
  const pts = [];
  for (let i = 0; i < lobes; i += 1) {
    const a = rot + (i / lobes) * TAU;
    pts.push([x + Math.cos(a) * rx * radii[i], y + Math.sin(a) * ry * radii[i]]);
  }
  return sampleCurve(pts, 3, true);
}

// A rectangle drawn by hand: corners a little off, edges a little bowed.
export function handRect(x, y, w, h, { seed = 1, amp = 1.2 } = {}) {
  const r = rng(seed);
  const j = () => (r() - 0.5) * 2 * amp;
  return [[x + j(), y + j()], [x + w / 2 + j(), y + j() * 0.6], [x + w + j(), y + j()], [x + w + j() * 0.6, y + h / 2 + j()],
    [x + w + j(), y + h + j()], [x + w / 2 + j(), y + h + j() * 0.6], [x + j(), y + h + j()], [x + j() * 0.6, y + h / 2 + j()]];
}

export function polyPath(c, pts) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}

function bounds(pts) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// --------------------------------------------------------------- pencil

// A graphite line through `points`. Two passes, the second lighter and a
// hair off the first; pressure tapers in at the start and out at the end.
export function pencil(c, points, {
  w = 1.4, alpha = 0.85, color = INK.graphite, seed = 1, passes = 2, smooth = true,
  taper = true, jitter = 0.55, overshoot = 0, closed = false, step = 2.5,
} = {}) {
  if (!points || points.length < 2) return;
  let pts = smooth ? sampleCurve(points, step, closed) : densify(closed ? [...points, points[0]] : points, step);
  if (overshoot > 0 && !closed && pts.length > 2) {
    const ext = (p, q) => {
      const dx = p[0] - q[0]; const dy = p[1] - q[1]; const l = Math.hypot(dx, dy) || 1;
      return [p[0] + (dx / l) * overshoot, p[1] + (dy / l) * overshoot];
    };
    pts = [ext(pts[0], pts[Math.min(3, pts.length - 1)]), ...pts, ext(pts[pts.length - 1], pts[Math.max(0, pts.length - 4)])];
  }
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = color;
  const n = pts.length;
  for (let pass = 0; pass < passes; pass += 1) {
    const r = rng(seed * 31 + pass * 977);
    const f1 = 0.02 + r() * 0.05;
    const f2 = 0.11 + r() * 0.1;
    const p1 = r() * TAU;
    const p2 = r() * TAU;
    const off = pass === 0 ? 0 : (r() - 0.5) * w * 1.2;
    const run = 5;
    for (let i = 0; i < n - 1; i += run) {
      const t = i / (n - 1);
      const pressure = taper ? Math.min(1, Math.sin(Math.PI * Math.min(1, Math.max(0.04, t))) * 1.6 + 0.25) : 1;
      c.lineWidth = Math.max(0.35, w * pressure * (pass ? 0.7 : 1) * (0.82 + r() * 0.36));
      c.globalAlpha = alpha * (pass ? 0.5 : 1) * (0.7 + 0.3 * pressure) * (0.86 + r() * 0.14);
      c.beginPath();
      for (let k = i; k <= Math.min(n - 1, i + run); k += 1) {
        const [x, y] = pts[k];
        const [nx, ny] = pts[Math.min(n - 1, k + 1)];
        const [px, py] = pts[Math.max(0, k - 1)];
        const dx = nx - px; const dy = ny - py; const l = Math.hypot(dx, dy) || 1;
        const d = off + (Math.sin(k * f1 + p1) + Math.sin(k * f2 + p2) * 0.5) * jitter;
        const qx = x - (dy / l) * d;
        const qy = y + (dx / l) * d;
        if (k === i) c.moveTo(qx, qy); else c.lineTo(qx, qy);
      }
      c.stroke();
    }
  }
  c.restore();
}

// A straight drafted line with the overshoot at both ends.
export function rule(c, x1, y1, x2, y2, opts = {}) {
  pencil(c, [[x1, y1], [x2, y2]], { smooth: false, overshoot: 5, ...opts });
}

export function pencilShape(c, pts, opts = {}) {
  pencil(c, pts, { closed: true, smooth: false, ...opts });
}

// Parallel strokes inside `pts` (a closed outline). `angle` in radians.
export function hatch(c, pts, { angle = -0.95, spacing = 5, w = 0.8, alpha = 0.4, color = INK.graphite, seed = 1, cross = false, length = 1 } = {}) {
  const b = bounds(pts);
  c.save();
  polyPath(c, pts);
  c.clip();
  c.strokeStyle = color;
  c.lineCap = 'round';
  const r = rng(seed);
  const draw = (a) => {
    const ux = Math.cos(a); const uy = Math.sin(a);
    const nx = -uy; const ny = ux;
    const cx = b.x + b.w / 2; const cy = b.y + b.h / 2;
    const half = Math.hypot(b.w, b.h) / 2 + 4;
    for (let s = -half; s <= half; s += spacing * (0.75 + r() * 0.5)) {
      const k = length < 1 ? (0.4 + r() * 0.6) * length : 1;
      const ox = cx + nx * s; const oy = cy + ny * s;
      const start = -half * k + (r() - 0.5) * 8;
      const end = half * k + (r() - 0.5) * 8;
      c.lineWidth = w * (0.7 + r() * 0.6);
      c.globalAlpha = alpha * (0.6 + r() * 0.4);
      c.beginPath();
      c.moveTo(ox + ux * start, oy + uy * start);
      c.quadraticCurveTo(ox + (r() - 0.5) * 2, oy + (r() - 0.5) * 2, ox + ux * end, oy + uy * end);
      c.stroke();
    }
  };
  draw(angle);
  if (cross) draw(angle + 1.25);
  c.restore();
}

// Short scribbled loops: how a pencil fills a canopy or a hedge.
export function scribble(c, x, y, rx, ry, { seed = 1, loops = 18, w = 0.9, alpha = 0.5, color = INK.graphite } = {}) {
  const r = rng(seed);
  c.save();
  c.strokeStyle = color;
  c.lineCap = 'round';
  for (let i = 0; i < loops; i += 1) {
    const a = r() * TAU;
    const d = Math.sqrt(r());
    const px = x + Math.cos(a) * rx * d;
    const py = y + Math.sin(a) * ry * d;
    const s = 3 + r() * 5;
    c.lineWidth = w * (0.6 + r() * 0.7);
    c.globalAlpha = alpha * (0.5 + r() * 0.5);
    c.beginPath();
    c.arc(px, py, s, r() * TAU, r() * TAU + Math.PI * (1 + r()));
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------- textures

const patternCache = new Map();

function noiseCanvas(size, seed, fn) {
  const canvas = makeCanvas(size, size);
  const c = canvas.getContext('2d');
  const img = c.createImageData(size, size);
  const r = rng(seed);
  for (let i = 0; i < size * size; i += 1) {
    const a = fn(r);
    img.data[i * 4] = 0; img.data[i * 4 + 1] = 0; img.data[i * 4 + 2] = 0; img.data[i * 4 + 3] = a;
  }
  c.putImageData(img, 0, 0);
  return canvas;
}

// The paper's tooth, as an alpha pattern: fine, sharp specks.
function toothPattern(c) {
  if (!patternCache.has('tooth')) patternCache.set('tooth', noiseCanvas(128, 0x7007, (r) => (r() < 0.5 ? Math.round(Math.pow(r(), 2.2) * 255) : 0)));
  return c.createPattern(patternCache.get('tooth'), 'repeat');
}

// Soft cloudy blotches, for watercolour blooms.
function cloudCanvas() {
  if (!patternCache.has('cloud')) {
    const small = noiseCanvas(24, 0xc10d, (r) => Math.round(r() * 255));
    const canvas = makeCanvas(192, 192);
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(small, 0, 0, 192, 192);
    // tile seams are hidden by the bleed; a second, finer octave on top
    const fine = noiseCanvas(48, 0xc10e, (r) => Math.round(r() * 140));
    c.globalAlpha = 0.6;
    c.drawImage(fine, 0, 0, 192, 192);
    patternCache.set('cloud', canvas);
  }
  return patternCache.get('cloud');
}

// Breaks every pencil mark on the canvas with the paper's tooth.
export function tooth(c, w, h, strength = 0.45) {
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.globalAlpha = strength;
  c.fillStyle = toothPattern(c);
  c.fillRect(0, 0, w, h);
  c.restore();
}

// ----------------------------------------------------------------- wash

// A watercolour wash over the closed outline `pts`.
export function wash(c, pts, color, {
  alpha = 0.62, seed = 1, edge = 0.55, bloom = 0.35, blur = 0.7, granulate = 0.25, inset = 0,
} = {}) {
  const b = bounds(pts);
  const pad = 10;
  const T = makeCanvas(b.w + pad * 2, b.h + pad * 2);
  const t = T.getContext('2d');
  t.translate(pad - b.x, pad - b.y);
  t.fillStyle = color;
  polyPath(t, pts);
  t.fill();
  // pigment pools at the drying edge
  t.save();
  t.globalCompositeOperation = 'source-atop';
  t.strokeStyle = color;
  t.globalAlpha = edge;
  t.lineWidth = 3.2;
  t.filter = 'brightness(0.78) saturate(1.15)';
  polyPath(t, pts);
  t.stroke();
  t.restore();
  // blooms: the body dried unevenly
  if (bloom > 0) {
    const r = rng(seed);
    t.save();
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = 'destination-out';
    t.globalAlpha = bloom;
    const cloud = cloudCanvas();
    const ox = -r() * 150; const oy = -r() * 150;
    for (let x = ox; x < T.width; x += 192) for (let y = oy; y < T.height; y += 192) t.drawImage(cloud, x, y);
    t.restore();
  }
  // granulation: pigment settled in the paper's tooth
  if (granulate > 0) {
    t.save();
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = 'source-atop';
    t.globalAlpha = granulate;
    t.fillStyle = toothPattern(t);
    t.filter = 'none';
    t.fillRect(0, 0, T.width, T.height);
    t.restore();
  }
  c.save();
  c.globalAlpha = alpha;
  if (blur > 0) c.filter = `blur(${blur}px)`;
  c.drawImage(T, b.x - pad + inset, b.y - pad + inset);
  c.restore();
}

export function washBlob(c, x, y, rx, ry, color, opts = {}) {
  wash(c, blob(x, y, rx, ry, { seed: opts.seed ?? 1, lobes: opts.lobes ?? 9, irregular: opts.irregular ?? 0.25 }), color, opts);
}

export function washRect(c, x, y, w, h, color, opts = {}) {
  wash(c, handRect(x, y, w, h, { seed: opts.seed ?? 1, amp: opts.amp ?? 1.6 }), color, opts);
}

// A loaded gouache stroke from (x1,y1) to (x2,y2): opaque body, bristle
// streaks along it, a dry, broken tail.
export function dab(c, x1, y1, x2, y2, width, color, { alpha = 0.95, seed = 1, streaks = 6 } = {}) {
  const r = rng(seed);
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len; const uy = (y2 - y1) / len;
  const nx = -uy; const ny = ux;
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = color;
  c.globalAlpha = alpha;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x1 + ux * width * 0.25, y1 + uy * width * 0.25);
  c.quadraticCurveTo((x1 + x2) / 2 + nx * (r() - 0.5) * 3, (y1 + y2) / 2 + ny * (r() - 0.5) * 3, x2 - ux * width * 0.25, y2 - uy * width * 0.25);
  c.stroke();
  c.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < streaks; i += 1) {
    const o = (r() - 0.5) * width * 0.9;
    c.globalAlpha = 0.18 + r() * 0.22;
    c.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)';
    c.lineWidth = 0.6 + r() * 1.1;
    const s = r() * 0.3;
    c.beginPath();
    c.moveTo(x1 + ux * len * s + nx * o, y1 + uy * len * s + ny * o);
    c.lineTo(x1 + ux * len * (0.7 + r() * 0.3) + nx * o, y1 + uy * len * (0.7 + r() * 0.3) + ny * o);
    c.stroke();
  }
  c.restore();
}

// --------------------------------------------------------------- paper

// Warm paper with a little mottling and fibre (for plates and frames; the
// scenes lay their own grain overlay on top of everything).
export function paperBase(c, x, y, w, h, { tone = INK.sheetHigh, seed = 1, mottle = 0.025 } = {}) {
  c.save();
  c.fillStyle = tone;
  c.fillRect(x, y, w, h);
  const r = rng(seed);
  c.globalAlpha = mottle;
  const cloud = cloudCanvas();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.globalCompositeOperation = 'multiply';
  c.filter = 'sepia(1) blur(2px)';
  for (let xx = x - r() * 100; xx < x + w; xx += 192) for (let yy = y - r() * 100; yy < y + h; yy += 192) c.drawImage(cloud, xx, yy);
  c.restore();
}

// Draws a canvas `src` onto `dst` tinted to `color`, keeping src's alpha and
// value (multiply over the colour). Used to colour a neutral wash.
export function tinted(src, color) {
  const out = makeCanvas(src.width, src.height);
  const c = out.getContext('2d');
  c.fillStyle = color;
  c.fillRect(0, 0, out.width, out.height);
  c.globalCompositeOperation = 'multiply';
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(src, 0, 0);
  return out;
}
