// Chapter 4 // THE PAINTED COUNTRY — a run of painted cells, drawn as one
// stroke of gouache (feedback round 6, item 13).
//
// The cells are still the collision. This draws what the hand did: the
// staircase of cell centres smoothed into one line (brushStrokes.js), a body
// of pigment along it that starts loaded and blunt and ends dry and thin,
// bristle streaks running the length of it, darker pooled rims, the paper's
// tooth showing through where the brush ran dry, a splay of hairs at the
// tail, and the hatched shadow every painted (weight-bearing) thing in this
// chapter casts. Each stroke takes a slightly different tone of the same
// indigo, the way two loads of a brush never match.
//
// Seeded, so a stroke redraws identically; runs once per changed stroke into
// small canvases that strokeLayer.js composites into world tiles.

import { makeCanvas, rng } from './pencilKit.js';
import { dryness, resample, runBounds, runPath, strokeWidth } from '../brushStrokes.js';

const PAPER_WHITE = 'rgba(253,252,248,1)';
const SHADOW_INK = '#4a4640';

// ------------------------------------------------------------------ colour
function hexToHsl(hex) {
  const v = parseInt(hex.replace('#', ''), 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToCss(h, s, l, a = 1) {
  const hh = ((h % 360) + 360) % 360;
  return `hsla(${hh.toFixed(1)}, ${(Math.max(0, Math.min(1, s)) * 100).toFixed(1)}%, ${(Math.max(0, Math.min(1, l)) * 100).toFixed(1)}%, ${a})`;
}

/** One load of the brush: the base tone nudged a little, with its dark and light. */
export function strokeTones(hex, r) {
  const [h, s, l] = hexToHsl(hex);
  const dh = (r() - 0.5) * 10;
  const ds = (r() - 0.5) * 0.1;
  const dl = (r() - 0.5) * 0.08;
  return {
    base: hslToCss(h + dh, s + ds, l + dl),
    dark: hslToCss(h + dh + 4, s + ds + 0.08, l + dl - 0.16),
    deep: hslToCss(h + dh + 6, s + ds + 0.1, l + dl - 0.24),
    light: hslToCss(h + dh - 4, s + ds - 0.12, l + dl + 0.2),
  };
}

// A slow, seeded wobble along the stroke (arc length s in px).
function wobbler(r, amp = 1) {
  const a = 0.035 + r() * 0.03;
  const b = 0.11 + r() * 0.07;
  const p1 = r() * 6.28;
  const p2 = r() * 6.28;
  return (s) => amp * (Math.sin(s * a + p1) * 0.65 + Math.sin(s * b + p2) * 0.35);
}

function polygon(c, pts) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}

function polyline(c, pts) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
}

// The outline of the stroke's body: both edges with their ragged wobble, a
// blunt, rounded start (where the loaded brush touched down) and a tapered,
// dry end.
function outline(samples, width, r) {
  const edgeL = wobbler(r, 0.9);
  const edgeR = wobbler(r, 0.9);
  const swell = wobbler(r, 0.06);
  const left = [];
  const right = [];
  samples.forEach((p) => {
    const half = strokeWidth(p.t, width, swell(p.s)) / 2;
    left.push([p.x + p.nx * (half + edgeL(p.s)), p.y + p.ny * (half + edgeL(p.s))]);
    right.push([p.x - p.nx * (half + edgeR(p.s)), p.y - p.ny * (half + edgeR(p.s))]);
  });
  const a = samples[0];
  const z = samples[samples.length - 1];
  const halfA = strokeWidth(0, width) / 2;
  const halfZ = strokeWidth(1, width) / 2;
  // the start: a round touch-down behind the first point
  const startCap = [];
  for (let i = 1; i < 8; i += 1) {
    const ang = Math.PI / 2 + (i / 8) * Math.PI;
    const ox = Math.cos(ang);
    const oy = Math.sin(ang);
    // in the stroke's own frame: x along the tangent, y along the normal
    // a squarer, blunt touch-down rather than a round capsule end
    const along = Math.sign(ox) * Math.abs(ox) ** 0.45 * halfA * 0.42;
    const across = oy * halfA;
    startCap.push([a.x + a.tx * along - a.nx * across, a.y + a.ty * along - a.ny * across]);
  }
  // the end: the hairs run out to a soft point
  const endCap = [];
  for (let i = 1; i < 6; i += 1) {
    const ang = -Math.PI / 2 + (i / 6) * Math.PI;
    const along = Math.cos(ang) * halfZ * 1.5 * (0.85 + r() * 0.3);
    const across = Math.sin(ang) * halfZ;
    endCap.push([z.x + z.tx * along + z.nx * across, z.y + z.ty * along + z.ny * across]);
  }
  // left edge forward, the end cap (left → right), the right edge back, the
  // start cap (right → left; it is generated in that order)
  return [...left, ...endCap.reverse(), ...right.reverse(), ...startCap];
}

/**
 * Paints one run of cells as one stroke.
 * @returns {{ body: HTMLCanvasElement, shadow: HTMLCanvasElement, x: number, y: number, w: number, h: number, scale: number }}
 */
export function paintStrokeRun(run, { cell = 20, color = '#46618c', width = cell + 3, seed = 1, scale = 1, detail = 1 } = {}) {
  const box = runBounds(run, cell, 16);
  const W = Math.ceil(box.w * scale);
  const H = Math.ceil(box.h * scale);
  const body = makeCanvas(W, H);
  const shadow = makeCanvas(W, H);
  const r = rng(seed);
  const tones = strokeTones(color, r);
  const samples = resample(runPath(run, cell), 1.6);
  if (samples.length < 2) return { body, shadow, x: box.x, y: box.y, w: box.w, h: box.h, scale };
  const shape = outline(samples, width, r);

  // ------------------------------------------------ the hatched shadow
  // Every painted thing in this car casts one (the design lock's "drawn vs
  // real" tell): the body's silhouette, dropped down and right, hatched.
  const sc = shadow.getContext('2d');
  sc.scale(scale, scale);
  sc.translate(-box.x, -box.y);
  sc.save();
  sc.translate(2.5, 4.5);
  polygon(sc, shape);
  sc.clip();
  sc.fillStyle = 'rgba(74,70,64,0.07)';
  sc.fillRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
  sc.strokeStyle = SHADOW_INK;
  sc.globalAlpha = 0.34;
  sc.lineWidth = 0.9;
  for (let k = -box.h; k < box.w + box.h; k += 3.4) {
    sc.beginPath();
    sc.moveTo(box.x + k, box.y - 2);
    sc.lineTo(box.x + k - box.h - 4, box.y + box.h + 2);
    sc.stroke();
  }
  sc.restore();

  // ------------------------------------------------------- the body
  const c = body.getContext('2d');
  c.scale(scale, scale);
  c.translate(-box.x, -box.y);
  c.save();
  polygon(c, shape);
  c.fillStyle = tones.base;
  c.fill();
  c.restore();

  c.save();
  c.globalCompositeOperation = 'source-atop';
  // the load: dark and dense where the brush touched down, lighter as it ran out
  const a = samples[0];
  const z = samples[samples.length - 1];
  const grad = c.createLinearGradient(a.x, a.y, z.x, z.y);
  grad.addColorStop(0, tones.deep);
  grad.addColorStop(0.18, tones.dark);
  grad.addColorStop(0.55, tones.base);
  grad.addColorStop(1, tones.light);
  c.globalAlpha = 0.55;
  c.fillStyle = grad;
  c.fillRect(box.x, box.y, box.w, box.h);
  // gouache is never quite even: a few soft clouds of more and less pigment
  const clouds = Math.max(1, Math.round(samples.length / 18));
  for (let i = 0; i < clouds; i += 1) {
    const p = samples[Math.floor(r() * samples.length)];
    c.globalAlpha = 0.1 + r() * 0.12;
    c.fillStyle = r() > 0.5 ? tones.dark : tones.light;
    c.beginPath();
    c.ellipse(p.x + (r() - 0.5) * 6, p.y + (r() - 0.5) * 6, 6 + r() * 10, 4 + r() * 5, Math.atan2(p.ty, p.tx), 0, Math.PI * 2);
    c.fill();
  }
  // bristle streaks along the length: the ridges and valleys a brush leaves
  const streaks = Math.round((6 + r() * 3) * detail);
  for (let i = 0; i < streaks; i += 1) {
    const o = -0.42 + (i + r() * 0.8) * (0.84 / streaks);
    const jitter = wobbler(r, 0.5);
    const dark = r() > 0.45;
    c.strokeStyle = dark ? tones.deep : PAPER_WHITE;
    c.globalAlpha = dark ? 0.16 + r() * 0.2 : 0.1 + r() * 0.14;
    c.lineWidth = 0.6 + r() * 1.2;
    const start = r() * 0.12;
    let seg = [];
    samples.forEach((p, k) => {
      if (p.t < start) return;
      const half = strokeWidth(p.t, width) / 2;
      // dry near the tail: the streak breaks up
      const gap = k % 7 === 0 && r() < dryness(p.t) * 0.9;
      if (gap) {
        if (seg.length > 1) { polyline(c, seg); c.stroke(); }
        seg = [];
        return;
      }
      seg.push([p.x + p.nx * (o * half * 2 + jitter(p.s)), p.y + p.ny * (o * half * 2 + jitter(p.s))]);
    });
    if (seg.length > 1) { polyline(c, seg); c.stroke(); }
  }
  // the pooled rims: gouache dries darker where it gathered at the edges
  c.globalAlpha = 0.42;
  c.strokeStyle = tones.deep;
  c.lineWidth = 1.5;
  c.lineJoin = 'round';
  polygon(c, shape);
  c.stroke();
  c.restore();

  // ------------------------------------------- the paper showing through
  c.save();
  c.globalCompositeOperation = 'destination-out';
  // dry-brush gaps near the tail: thin runs of bare paper between bristles
  const gaps = Math.round((7 + r() * 5) * detail);
  for (let i = 0; i < gaps; i += 1) {
    const o = (r() - 0.5) * 0.85;
    const from = 0.42 + r() * 0.45;
    c.globalAlpha = 0.5 + r() * 0.45;
    c.lineWidth = 0.7 + r() * 1.3;
    c.lineCap = 'round';
    const seg = samples.filter((p) => p.t >= from && p.t <= Math.min(1, from + 0.15 + r() * 0.4));
    if (seg.length < 2) continue;
    polyline(c, seg.map((p) => {
      const half = strokeWidth(p.t, width) / 2;
      return [p.x + p.nx * o * half * 2, p.y + p.ny * o * half * 2];
    }));
    c.stroke();
  }
  // the paper's tooth: tiny specks the pigment skipped, more where it is dry
  // and along the edges
  const specks = Math.round(samples.length * 1.4 * detail);
  for (let i = 0; i < specks; i += 1) {
    const p = samples[Math.floor(r() * samples.length)];
    const half = strokeWidth(p.t, width) / 2;
    const edge = r() > 0.55;
    const o = edge ? (r() > 0.5 ? 1 : -1) * (0.75 + r() * 0.25) : (r() - 0.5) * 1.6;
    if (!edge && r() > 0.25 + dryness(p.t)) continue;
    c.globalAlpha = 0.35 + r() * 0.5;
    c.beginPath();
    c.arc(p.x + p.nx * o * half, p.y + p.ny * o * half, 0.35 + r() * 0.75, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // ------------------------------------------------- bristle hairs
  // Short hairs off the edges, and a splay off the tail where the brush lifted.
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = tones.dark;
  const hairs = Math.round(samples.length / 3 * detail);
  for (let i = 0; i < hairs; i += 1) {
    const p = samples[Math.floor(r() * samples.length)];
    const side = r() > 0.5 ? 1 : -1;
    const half = strokeWidth(p.t, width) / 2;
    const len = 1.5 + r() * 3.5 * (0.4 + dryness(p.t));
    const bx = p.x + p.nx * side * (half - 0.5);
    const by = p.y + p.ny * side * (half - 0.5);
    c.globalAlpha = 0.18 + r() * 0.22;
    c.lineWidth = 0.5 + r() * 0.5;
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + p.tx * len + p.nx * side * len * 0.35, by + p.ty * len + p.ny * side * len * 0.35);
    c.stroke();
  }
  const splay = Math.round((5 + r() * 4) * detail);
  const halfZ = strokeWidth(1, width) / 2;
  for (let i = 0; i < splay; i += 1) {
    const o = (r() - 0.5) * 1.8 * halfZ;
    const len = 4 + r() * 7;
    const bend = (r() - 0.5) * 0.5;
    const x0 = z.x - z.tx * 3 + z.nx * o;
    const y0 = z.y - z.ty * 3 + z.ny * o;
    c.globalAlpha = 0.22 + r() * 0.3;
    c.lineWidth = 0.6 + r() * 0.8;
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo(x0 + z.tx * len * 0.6, y0 + z.ty * len * 0.6, x0 + (z.tx + z.nx * bend) * len, y0 + (z.ty + z.ny * bend) * len);
    c.stroke();
  }
  c.restore();

  return { body, shadow, x: box.x, y: box.y, w: box.w, h: box.h, scale };
}
