// Chapter 4 // THE PAINTED COUNTRY — the five marks, drawn by the same hand.
//
// docs/STORY_BIBLE.md: HAWTHORN is Mara's mark (the answer); TICKET, LANTERN
// and APPLE are the plates' large marks; ROSE is Rosa's (the decoy). The
// hawthorn is flat and open — five round petals, red anthers, thorns, two
// haws — and the rose is cupped and spiralled, so the decoy never reads as
// the answer.
//
// paintMark(sign)  the bare mark on a transparent ground (the gallery plates
//                  compose it under the archive's grey);
// paintSign(sign)  the vestibule door's plate: paper, deckle, four pins, the
//                  mark.
// These replace the old flat icons (public/assets/chapter04/icons), so the
// door, the plates and the country are drawn in one pencil-and-wash language.

import { HUE, INK, TAU, blob, hatch, handRect, makeCanvas, paperBase, pencil, rng, rule, tooth, wash, washBlob, washRect } from './pencilKit.js';

const SIZE = 256;

function sheet(size = SIZE) {
  const canvas = makeCanvas(size, size);
  const washCanvas = makeCanvas(size, size);
  return { canvas, p: canvas.getContext('2d'), w: washCanvas.getContext('2d'), washCanvas, size };
}

function finish(s) {
  tooth(s.p, s.size, s.size, 0.3);
  const out = makeCanvas(s.size, s.size);
  const c = out.getContext('2d');
  c.drawImage(s.washCanvas, 0, 0);
  c.drawImage(s.canvas, 0, 0);
  return out;
}

const LW = 3.4;

function drawHawthorn(s) {
  const { p, w } = s;
  // the twig, with thorns
  const twig = [[44, 206], [90, 178], [136, 150], [184, 112], [214, 86]];
  pencil(p, twig, { w: LW * 1.3, color: INK.lead, seed: 11 });
  [[78, 186, -1], [122, 159, 1], [166, 126, -1]].forEach(([x, y, d], i) => {
    pencil(p, [[x, y], [x + 10, y + d * 14]], { w: LW * 0.8, color: INK.lead, smooth: false, seed: 20 + i, overshoot: 0 });
  });
  // lobed leaves
  [[150, 176, 0.5], [70, 150, -0.4]].forEach(([x, y, rot], i) => {
    const leaf = blob(x, y, 30, 15, { seed: 30 + i, lobes: 9, irregular: 0.35, rot });
    wash(w, leaf, HUE.leaf, { alpha: 0.85, seed: 31 + i, bloom: 0.25 });
    pencil(p, leaf, { closed: true, w: LW * 0.8, seed: 32 + i });
    pencil(p, [[x - 26 * Math.cos(rot), y - 26 * Math.sin(rot)], [x + 22 * Math.cos(rot), y + 22 * Math.sin(rot)]], { w: LW * 0.5, alpha: 0.6, seed: 33 + i });
  });
  // the flower: five round petals, flat and open
  const fx = 112; const fy = 86;
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    const px = fx + Math.cos(a) * 25; const py = fy + Math.sin(a) * 25;
    const petal = blob(px, py, 20, 20, { seed: 40 + i, lobes: 9, irregular: 0.1 });
    wash(w, petal, '#f4eee2', { alpha: 1, seed: 41 + i, bloom: 0.15, edge: 0.4 });
    wash(w, blob(px, py, 20, 20, { seed: 40 + i, lobes: 9, irregular: 0.1 }), HUE.blush, { alpha: 0.035, seed: 47 + i, bloom: 0.5 });
    pencil(p, petal, { closed: true, w: LW * 0.8, seed: 42 + i });
  }
  washBlob(w, fx, fy, 11, 11, HUE.leafDark, { alpha: 0.7, seed: 50 });
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * TAU;
    rule(p, fx, fy, fx + Math.cos(a) * 14, fy + Math.sin(a) * 14, { w: 1.2, alpha: 0.8, overshoot: 0, seed: 51 + i });
    washBlob(w, fx + Math.cos(a) * 15, fy + Math.sin(a) * 15, 3.2, 3.2, HUE.vermilion, { alpha: 1, seed: 60 + i, blur: 0.2, bloom: 0 });
  }
  // two haws
  [[200, 120], [218, 104]].forEach(([x, y], i) => {
    const haw = blob(x, y, 13, 14, { seed: 70 + i, lobes: 9, irregular: 0.08 });
    wash(w, haw, HUE.vermilion, { alpha: 0.95, seed: 71 + i, bloom: 0.2 });
    pencil(p, haw, { closed: true, w: LW * 0.8, seed: 72 + i });
    washBlob(w, x - 4, y - 5, 3.5, 3, '#ffffff', { alpha: 0.55, seed: 73 + i, bloom: 0 });
    pencil(p, [[x, y - 14], [x + 2, y - 19]], { w: 1.4, seed: 74 + i, smooth: false });
  });
}

function drawTicket(s) {
  const { p, w } = s;
  const x = 30; const y = 74; const tw = 196; const th = 108;
  // the card with its stub notches
  const card = [[x, y + 8], [x + 8, y], [x + tw - 8, y], [x + tw, y + 8], [x + tw, y + th * 0.4], [x + tw - 9, y + th * 0.5], [x + tw, y + th * 0.6], [x + tw, y + th - 8], [x + tw - 8, y + th], [x + 8, y + th], [x, y + th - 8]];
  wash(w, card, HUE.plaster, { alpha: 0.95, seed: 1, bloom: 0.3 });
  washRect(w, x + 2, y + 2, tw - 4, 22, HUE.vermilion, { alpha: 0.82, seed: 2, bloom: 0.2 });
  pencil(p, card, { closed: true, smooth: false, w: LW, seed: 3 });
  rule(p, x, y + 24, x + tw, y + 24, { w: LW * 0.6, seed: 4, overshoot: 0 });
  // perforation and the stub
  for (let yy = y + 30; yy < y + th - 6; yy += 8) { p.save(); p.fillStyle = INK.graphite; p.beginPath(); p.arc(x + tw * 0.72, yy, 1.8, 0, TAU); p.fill(); p.restore(); }
  // printed lines, as a draughtsman's scribble (no lettering)
  [44, 62, 80].forEach((yy, i) => pencil(p, [[x + 18, y + yy], [x + 18 + (90 - i * 18) * 0.5, y + yy - 1], [x + 18 + 90 - i * 18, y + yy + 1]], { w: LW * 0.55, alpha: 0.7, seed: 10 + i }));
  // the punched hole
  const hole = blob(x + tw * 0.86, y + th * 0.62, 10, 10, { seed: 20, lobes: 10, irregular: 0.05 });
  wash(w, hole, INK.lead, { alpha: 0.9, seed: 21, bloom: 0 });
  pencil(p, hole, { closed: true, w: LW * 0.7, seed: 22 });
  hatch(p, handRect(x + 4, y + th - 26, tw * 0.66, 22, { seed: 23 }), { spacing: 5, alpha: 0.2, seed: 24 });
}

function drawLantern(s) {
  const { p, w } = s;
  const cx = 128;
  // ring and cap
  pencil(p, blob(cx, 40, 14, 14, { seed: 1, lobes: 10, irregular: 0.04 }), { closed: true, w: LW, seed: 2 });
  const cap = [[cx - 44, 86], [cx - 26, 58], [cx + 26, 58], [cx + 44, 86]];
  wash(w, cap, INK.soft, { alpha: 0.75, seed: 3 });
  pencil(p, cap, { smooth: false, w: LW, seed: 4 });
  rule(p, cx - 48, 88, cx + 48, 88, { w: LW, seed: 5 });
  // the glass: lamplight
  const glass = handRect(cx - 34, 92, 68, 98, { seed: 6, amp: 1 });
  wash(w, glass, HUE.lamp, { alpha: 0.9, seed: 7, bloom: 0.25 });
  washBlob(w, cx, 150, 26, 36, HUE.marigold, { alpha: 0.5, seed: 8, blur: 4, bloom: 0 });
  pencil(p, glass, { closed: true, smooth: false, w: LW, seed: 9 });
  rule(p, cx, 92, cx, 190, { w: LW * 0.7, seed: 10, overshoot: 0 });
  // the flame
  const flame = [[cx, 120], [cx + 12, 146], [cx + 8, 162], [cx, 168], [cx - 8, 162], [cx - 12, 146]];
  wash(w, flame, HUE.marigold, { alpha: 1, seed: 11, bloom: 0.1 });
  pencil(p, flame, { closed: true, w: LW * 0.7, seed: 12 });
  // base
  const base = [[cx - 44, 192], [cx + 44, 192], [cx + 52, 210], [cx - 52, 210]];
  wash(w, base, INK.soft, { alpha: 0.75, seed: 13 });
  pencil(p, base, { closed: true, smooth: false, w: LW, seed: 14 });
  hatch(p, base, { spacing: 4, alpha: 0.35, seed: 15 });
  hatch(p, cap, { spacing: 4, alpha: 0.35, seed: 16 });
}

function drawApple(s) {
  const { p, w } = s;
  const body = [];
  for (let i = 0; i <= 40; i += 1) {
    const a = (i / 40) * TAU;
    const r = 78 * (1 - 0.13 * Math.pow(Math.max(0, -Math.sin(a)), 6)) * (1 + 0.04 * Math.cos(a * 2));
    body.push([128 + Math.cos(a) * r * 1.02, 142 + Math.sin(a) * r * (Math.sin(a) > 0 ? 0.92 : 0.86)]);
  }
  wash(w, body, HUE.vermilion, { alpha: 0.92, seed: 1, bloom: 0.3 });
  washBlob(w, 150, 176, 46, 34, '#8a2f2a', { alpha: 0.4, seed: 2, blur: 3 });
  washBlob(w, 100, 110, 16, 12, '#ffffff', { alpha: 0.6, seed: 3, bloom: 0 });
  pencil(p, body, { closed: true, w: LW * 1.1, seed: 4 });
  hatch(p, blob(150, 172, 54, 40, { seed: 5 }), { spacing: 5, alpha: 0.3, seed: 6 });
  // stalk and leaf
  pencil(p, [[126, 76], [130, 52], [138, 36]], { w: LW, color: INK.lead, seed: 7 });
  const leaf = [[136, 52], [160, 30], [196, 32], [178, 56], [150, 62]];
  wash(w, leaf, HUE.leaf, { alpha: 0.9, seed: 8 });
  pencil(p, leaf, { closed: true, w: LW * 0.8, seed: 9 });
  pencil(p, [[140, 52], [186, 38]], { w: LW * 0.5, alpha: 0.6, seed: 10 });
}

function drawRose(s) {
  const { p, w } = s;
  const cx = 124; const cy = 92;
  const cup = blob(cx, cy, 58, 50, { seed: 1, lobes: 8, irregular: 0.2 });
  wash(w, cup, HUE.mulberry, { alpha: 0.5, seed: 2, bloom: 0.3 });
  wash(w, blob(cx, cy, 58, 50, { seed: 1, lobes: 8, irregular: 0.2 }), HUE.blush, { alpha: 0.55, seed: 3, bloom: 0.4 });
  pencil(p, cup, { closed: true, w: LW, seed: 4 });
  // the spiral of the cupped petals
  const spiral = [];
  for (let k = 0; k < 60; k += 1) { const a = k * 0.32; const r = 4 + k * 0.72; spiral.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85]); }
  pencil(p, spiral, { w: LW * 0.8, seed: 5 });
  hatch(p, blob(cx + 14, cy + 20, 40, 24, { seed: 6 }), { spacing: 5, alpha: 0.3, seed: 7 });
  // stem, thorns and a leaf
  pencil(p, [[cx + 4, cy + 48], [cx + 8, 170], [cx + 2, 230]], { w: LW, color: INK.lead, seed: 8 });
  [[cx + 7, 160, 1], [cx + 5, 196, -1]].forEach(([x, y, d], i) => pencil(p, [[x, y], [x + d * 11, y - 7]], { w: LW * 0.7, color: INK.lead, smooth: false, seed: 9 + i, overshoot: 0 }));
  const leaf = blob(cx - 30, 190, 28, 11, { seed: 12, lobes: 8, irregular: 0.15, rot: -0.3 });
  wash(w, leaf, HUE.leaf, { alpha: 0.85, seed: 13 });
  pencil(p, leaf, { closed: true, w: LW * 0.8, seed: 14 });
}

const MARKS = { hawthorn: drawHawthorn, ticket: drawTicket, lantern: drawLantern, apple: drawApple, rose: drawRose };

export function paintMark(sign) {
  const s = sheet();
  MARKS[sign]?.(s);
  return finish(s);
}

// The door plate: a pinned paper card with a torn edge.
export function paintSign(sign, seed = 1) {
  const out = makeCanvas(SIZE, SIZE);
  const c = out.getContext('2d');
  const r = rng(seed + sign.length * 17);
  const edge = [];
  const m = 10;
  for (let i = 0; i <= 24; i += 1) edge.push([m + (i / 24) * (SIZE - m * 2), m + (r() - 0.5) * 3]);
  for (let i = 0; i <= 24; i += 1) edge.push([SIZE - m + (r() - 0.5) * 3, m + (i / 24) * (SIZE - m * 2)]);
  for (let i = 0; i <= 24; i += 1) edge.push([SIZE - m - (i / 24) * (SIZE - m * 2), SIZE - m + (r() - 0.5) * 4]);
  for (let i = 0; i <= 24; i += 1) edge.push([m + (r() - 0.5) * 3, SIZE - m - (i / 24) * (SIZE - m * 2)]);
  c.save();
  c.shadowColor = 'rgba(60, 45, 30, 0.35)';
  c.shadowBlur = 8;
  c.shadowOffsetY = 3;
  c.fillStyle = INK.sheetHigh;
  c.beginPath(); edge.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
  c.restore();
  c.save();
  c.beginPath(); edge.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
  paperBase(c, 0, 0, SIZE, SIZE, { tone: INK.sheetHigh, seed: seed + 5, mottle: 0.05 });
  c.restore();
  pencil(c, edge, { closed: true, smooth: false, w: 1.4, alpha: 0.55, color: INK.soft, seed: seed + 6 });
  c.drawImage(paintMark(sign), 20, 20, SIZE - 40, SIZE - 40);
  // four brass pins
  [[24, 24], [SIZE - 24, 24], [24, SIZE - 24], [SIZE - 24, SIZE - 24]].forEach(([x, y]) => {
    c.save(); c.fillStyle = '#b08a4a'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
    c.strokeStyle = INK.graphite; c.globalAlpha = 0.7; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#e8cf95'; c.globalAlpha = 0.8; c.beginPath(); c.arc(x - 1.5, y - 1.5, 1.6, 0, TAU); c.fill(); c.restore();
  });
  return out;
}

export const MARK_SIGNS = Object.freeze(Object.keys(MARKS));
