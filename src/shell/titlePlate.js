// The title screen's key art: the night service waiting at Bellwether, seen
// through the carriage window (titleMenu.css .nf-window-glass).
//
// It is painted at runtime with Chapter 1's ink kit (chapters/nightService/
// art/ink.js and figures.js), in the same flat panel language as Act 0: navy
// and teal fills, warm off-white hand-inked linework, brass trim, amber lamp
// light, rain. Painting at the glass's own size keeps it crisp on any screen
// and costs no download. The scene, back to front:
//
//   - the night sky over the orchard country, clear at the top right where the
//     wordmark is gilded on the glass;
//   - the low hills, Rosa's orchard house with a lamp in the window, hawthorns;
//   - the night service standing at the platform, its tail lamp at the left and
//     its engine off to the right (its steam drifts back over the roofs);
//   - the platform: the BELLWETHER nameboard, one brass lamp post, Butch with
//     his lamp and the orchard case, and the wet flags holding every light.
//
// The live parts (the lamp's flicker and the drifting steam) are cheap CSS
// layers placed from `plateLayout`, so Reduce Motion simply stops them.
//
// `plateLayout` is pure (no DOM) so tests can check the composition at every
// window shape.

import {
  PAL, brassFill, brushTexture, glow, ink, inkEllipse, inkLine, lightCone, rivet, rng, roundRectPath, speckle,
  vgrad, vignette,
} from '../chapters/nightService/art/ink.js';
import { BUTCH_PARTS, RES } from '../chapters/nightService/art/figures.js';

/** The plate is drawn in design units: the glass is always DESIGN_H tall. */
export const DESIGN_H = 620;
/** The largest backing store painted (device pixels), whatever the screen. */
export const MAX_PIXELS = 2560 * 1600;

const TAU = Math.PI * 2;
/** Compartment windows along a carriage (design units), from its tail end. */
const WINDOW = { w: 58, h: 70, pitch: 92, top: 0.452 };
const WINDOW_FIRST = 70;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Where everything sits for a glass of `width` × `height` (any unit). Returns
 * design-unit geometry (H = DESIGN_H) plus the fractions the CSS layers use.
 */
export function plateLayout(width, height) {
  const aspect = clamp(width / Math.max(1, height), 0.6, 3.2);
  const H = DESIGN_H;
  const W = H * aspect;
  const platform = H * 0.7;
  const roof = H * 0.352;
  const body = { top: H * 0.385, bottom: H * 0.735 };
  // the train's tail end: a wide window shows open country beyond it
  const tail = W * clamp(0.3 + (aspect - 1.38) * 0.1, 0.2, 0.4);
  const board = { x: tail + 22, y: H * 0.588, w: 188, h: 46 };
  // the lamp post stands between two windows of the tail carriage
  const want = clamp(W * 0.62, board.x + board.w + 50, W - 120);
  const gap = Math.max(0, Math.round((want - tail - WINDOW_FIRST - WINDOW.w - (WINDOW.pitch - WINDOW.w) / 2) / WINDOW.pitch));
  const lampX = tail + WINDOW_FIRST + WINDOW.w + (WINDOW.pitch - WINDOW.w) / 2 + gap * WINDOW.pitch;
  const lamp = { x: lampX, top: H * 0.385, base: H * 0.925 };
  const butch = { x: lamp.x + clamp(W * 0.075, 52, 80), feet: H * 0.895, height: H * 0.175 };
  const steam = { x: W, y: roof - H * 0.03 };
  return {
    W, H, aspect, platform, roof, body, tail, lamp, butch, board, steam,
    // fractions of the glass for the CSS layers
    css: {
      lamp: { x: lamp.x / W, y: (lamp.top + 22) / H },
      steam: { x: 1, y: steam.y / H },
    },
  };
}

// ---------------------------------------------------------------------------
// sky and country

function sky(c, L) {
  const { W, H } = L;
  c.fillStyle = vgrad(c, 0, L.platform, [
    [0, '#0a1020'], [0.42, '#121b30'], [0.72, '#1b2a3b'], [0.86, '#25384a'], [1, '#2a3e4c'],
  ]);
  c.fillRect(0, 0, W, L.platform + 4);
  // a low warm glow over the village, behind everything
  glow(c, L.tail * 0.5, H * 0.56, Math.max(260, L.tail * 1.1), 'rgba(224, 162, 74, 0.55)', 0.22);
  // long rain-cloud bands, flat and soft, kept off the wordmark's corner
  const random = rng(5101);
  for (let i = 0; i < 9; i += 1) {
    const y = H * (0.07 + random() * 0.3);
    const x = W * (-0.1 + random() * 0.65);
    const len = W * (0.25 + random() * 0.35);
    const thick = 10 + random() * 22;
    c.fillStyle = `rgba(${random() > 0.5 ? '34, 48, 70' : '24, 34, 54'}, ${0.35 + random() * 0.3})`;
    c.beginPath();
    c.ellipse(x + len / 2, y, len / 2, thick / 2, 0, 0, TAU);
    c.fill();
    if (random() > 0.45) ink(c, [[x + len * 0.12, y - thick * 0.25], [x + len * 0.5, y - thick * 0.48], [x + len * 0.86, y - thick * 0.2]], { w: 1.1, alpha: 0.16, jitter: 1.2, bleed: false, seed: 5110 + i });
  }
  brushTexture(c, 0, 0, W * 0.6, H * 0.4, { seed: 5102, color: 'rgba(160, 180, 210, 0.025)', count: 60, len: 180 });
  // a few stars between the clouds
  const stars = rng(5103);
  for (let i = 0; i < 40; i += 1) {
    const x = stars() * W;
    const y = stars() * H * 0.32;
    c.fillStyle = `rgba(234, 223, 198, ${0.15 + stars() * 0.35})`;
    c.fillRect(x, y, 1.2 + stars(), 1.2 + stars());
  }
}

function hawthorn(c, x, ground, s, seed) {
  const random = rng(seed);
  c.fillStyle = '#0f1a1f';
  c.fillRect(x - 2 * s, ground - 26 * s, 4 * s, 26 * s);
  c.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI + Math.PI;
    const r = (16 + random() * 8) * s;
    c.ellipse(x + Math.cos(a) * r * 0.7, ground - 30 * s + Math.sin(a) * r * 0.45, r * 0.62, r * 0.5, 0, 0, TAU);
  }
  c.fill();
  ink(c, [[x - 24 * s, ground - 26 * s], [x - 18 * s, ground - 42 * s], [x, ground - 50 * s], [x + 19 * s, ground - 43 * s], [x + 25 * s, ground - 27 * s]], { w: 1.2, alpha: 0.32, jitter: 1, bleed: false, seed });
  // blossom specks
  for (let i = 0; i < 12; i += 1) {
    c.fillStyle = `rgba(234, 223, 198, ${0.18 + random() * 0.25})`;
    c.fillRect(x + (random() - 0.5) * 40 * s, ground - (24 + random() * 24) * s, 1.6, 1.6);
  }
}

function country(c, L) {
  const { W, H } = L;
  const ridge = H * 0.545;
  // far hills, one flat tone with an inked crest
  const hills = [[-20, ridge + 8], [W * 0.08, ridge - 18], [W * 0.2, ridge - 30], [W * 0.34, ridge - 14], [W * 0.5, ridge - 26], [W * 0.68, ridge - 6], [W * 0.84, ridge - 22], [W + 20, ridge - 10]];
  c.fillStyle = '#16212d';
  c.beginPath();
  hills.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.lineTo(W + 20, L.platform + 4); c.lineTo(-20, L.platform + 4); c.closePath();
  c.fill();
  ink(c, hills, { w: 1.4, alpha: 0.38, jitter: 1.4, seed: 5201 });
  // the near field, a shade warmer
  c.fillStyle = '#18232a';
  c.fillRect(-20, ridge + 22, W + 40, L.platform - ridge);
  ink(c, [[-20, ridge + 22], [W + 20, ridge + 20]], { w: 1.1, alpha: 0.25, jitter: 0.8, seed: 5202 });
  // village lights along the ridge
  const random = rng(5203);
  for (let i = 0; i < 16; i += 1) {
    const x = random() * Math.max(L.tail, W * 0.3);
    const y = ridge - 6 + random() * 20;
    c.fillStyle = random() > 0.3 ? '#f0b866' : '#d8ccb0';
    c.fillRect(x, y, 2.4, 2);
    glow(c, x + 1, y + 1, 7, 'rgba(255, 190, 110, 0.9)', 0.25);
  }
  // Rosa's orchard house: a lamp in the window
  const hx = Math.max(60, L.tail * 0.5);
  const hy = ridge + 10;
  c.fillStyle = '#121b22';
  c.beginPath();
  c.moveTo(hx - 34, hy); c.lineTo(hx - 34, hy - 26); c.lineTo(hx, hy - 50); c.lineTo(hx + 34, hy - 26); c.lineTo(hx + 34, hy); c.closePath();
  c.fill();
  c.fillRect(hx + 14, hy - 52, 7, 16);
  ink(c, [[hx - 38, hy - 24], [hx, hy - 52], [hx + 38, hy - 24]], { w: 1.6, alpha: 0.6, seed: 5204 });
  ink(c, [[hx - 34, hy - 26], [hx - 34, hy], [hx + 34, hy], [hx + 34, hy - 26]], { w: 1.3, alpha: 0.45, seed: 5205 });
  c.fillStyle = '#ffcf7a';
  c.fillRect(hx - 18, hy - 20, 11, 10);
  glow(c, hx - 12, hy - 15, 34, 'rgba(255, 190, 100, 0.95)', 0.5);
  c.fillStyle = 'rgba(120, 70, 30, 0.6)';
  c.fillRect(hx - 13, hy - 20, 1, 10);
  hawthorn(c, hx - 70, ridge + 22, 0.8, 5206);
  hawthorn(c, hx + 66, ridge + 22, 0.95, 5207);
  if (L.tail > 360) hawthorn(c, hx + 150, ridge + 24, 0.7, 5208);
}

// ---------------------------------------------------------------------------
// the night service at the platform

function carriageWindows(L, x0, x1) {
  const out = [];
  for (let x = x0 + WINDOW_FIRST; x + WINDOW.w < x1 - 56; x += WINDOW.pitch) out.push(x);
  return out;
}

/** Carriage spans along the platform: the tail carriage, then the next ones. */
export function carriages(L) {
  const spans = [];
  let x = L.tail;
  const length = 560;
  while (x < L.W + 40) {
    spans.push([x, x + length]);
    x += length + 22;
  }
  return spans;
}

function interior(c, x, y, w, h, kind, random) {
  // warm lamp-lit compartment: a gradient, seat backs, a hat rack, a figure
  c.fillStyle = vgrad(c, y, y + h, [[0, '#f2c27a'], [0.55, '#d9964e'], [1, '#8a5530']]);
  roundRectPath(c, x, y, w, h, 6); c.fill();
  c.save();
  roundRectPath(c, x, y, w, h, 6); c.clip();
  c.fillStyle = 'rgba(90, 44, 22, 0.55)';
  c.fillRect(x, y + h * 0.18, w, 3);
  c.fillStyle = 'rgba(110, 50, 30, 0.75)';
  c.fillRect(x - 2, y + h * 0.62, w + 4, h * 0.4);
  if (kind === 'figure') {
    c.fillStyle = 'rgba(34, 22, 16, 0.9)';
    const px = x + w * (0.3 + random() * 0.4);
    c.beginPath(); c.arc(px, y + h * 0.46, 6, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(px - 12, y + h * 0.8); c.quadraticCurveTo(px, y + h * 0.52, px + 12, y + h * 0.8); c.fill();
    c.fillRect(px - 8, y + h * 0.36, 16, 2.2);
    c.fillRect(px - 5, y + h * 0.3, 10, 6);
  } else if (kind === 'curtain') {
    c.fillStyle = vgrad(c, y, y + h, [[0, '#7a3324'], [1, '#3e1813']]);
    c.fillRect(x, y, w * 0.34, h);
    c.fillRect(x + w * 0.66, y, w * 0.34, h);
  } else if (kind === 'case') {
    c.fillStyle = '#6d4a2c';
    c.fillRect(x + w * 0.2, y + h * 0.08, w * 0.5, h * 0.12);
    c.fillStyle = PAL.brass;
    c.fillRect(x + w * 0.32, y + h * 0.08, 3, h * 0.12);
  }
  c.restore();
  // lamp-lit glass sheen
  c.fillStyle = 'rgba(255, 240, 210, 0.16)';
  c.beginPath(); c.moveTo(x + w * 0.62, y); c.lineTo(x + w * 0.82, y); c.lineTo(x + w * 0.42, y + h); c.lineTo(x + w * 0.22, y + h); c.closePath(); c.fill();
}

function carriage(c, L, x0, x1, index, lights) {
  const { H } = L;
  const top = L.body.top;
  const bottom = L.body.bottom;
  const random = rng(5300 + index * 17);
  // roof: a dark curved band with ventilators
  c.fillStyle = vgrad(c, L.roof - 8, top, [[0, '#0c1316'], [1, '#18252a']]);
  c.beginPath();
  c.moveTo(x0 + 8, top);
  c.quadraticCurveTo(x0 + 10, L.roof, x0 + 40, L.roof);
  c.lineTo(x1 - 40, L.roof);
  c.quadraticCurveTo(x1 - 10, L.roof, x1 - 8, top);
  c.closePath();
  c.fill();
  ink(c, [[x0 + 8, top], [x0 + 14, L.roof + 6], [x0 + 40, L.roof], [x1 - 40, L.roof], [x1 - 14, L.roof + 6], [x1 - 8, top]], { w: 2, alpha: 0.82, seed: 5301 + index });
  for (let vx = x0 + 90; vx < x1 - 60; vx += 140) {
    c.fillStyle = '#111a1d';
    roundRectPath(c, vx - 13, L.roof - 9, 26, 10, 3); c.fill();
    ink(c, [[vx - 13, L.roof + 1], [vx - 13, L.roof - 9], [vx + 13, L.roof - 9], [vx + 13, L.roof + 1]], { w: 1.1, alpha: 0.55, bleed: false, seed: vx });
  }
  // body: lacquered teal-black with brass lining
  c.fillStyle = vgrad(c, top, bottom, [[0, '#21393f'], [0.55, '#172b2f'], [1, '#0d1a1c']]);
  c.fillRect(x0, top, x1 - x0, bottom - top);
  brushTexture(c, x0, top, x1 - x0, bottom - top, { seed: 5302 + index, color: 'rgba(160, 210, 210, 0.03)', count: 40, len: 140 });
  [[top + 9, 3], [H * 0.6, 5], [H * 0.676, 3]].forEach(([y, t]) => {
    c.fillStyle = brassFill(c, x0, y - t / 2, x1 - x0, t);
    c.fillRect(x0 + 4, y - t / 2, x1 - x0 - 8, t);
  });
  // doors at each end with their droplight windows
  [x0 + 10, x1 - 52].forEach((dx, k) => {
    c.fillStyle = 'rgba(0, 0, 0, 0.28)';
    c.fillRect(dx, top + 14, 42, bottom - top - 14);
    ink(c, [[dx, bottom], [dx, top + 14], [dx + 42, top + 14], [dx + 42, bottom]], { w: 1.6, alpha: 0.7, seed: 5310 + index * 2 + k });
    const wy = H * WINDOW.top + 4;
    if (lights) {
      interior(c, dx + 9, wy, 24, 34, 'plain', random);
    } else {
      c.fillStyle = '#0b1422'; roundRectPath(c, dx + 9, wy, 24, 34, 4); c.fill();
    }
    c.lineWidth = 3; c.strokeStyle = brassFill(c, dx + 7, wy - 2, 28, 38);
    roundRectPath(c, dx + 7.5, wy - 1.5, 27, 37, 5); c.stroke();
    c.fillStyle = PAL.brassLight;
    c.fillRect(dx + (k ? 6 : 32), H * 0.6 + 8, 3, 9);
  });
  // compartment windows: one figure, one with curtains drawn, the rest empty
  const xs = carriageWindows(L, x0, x1);
  xs.forEach((x, i) => {
    const y = H * WINDOW.top;
    c.save();
    c.lineWidth = 6;
    c.strokeStyle = brassFill(c, x, y, WINDOW.w, WINDOW.h);
    roundRectPath(c, x - 3, y - 3, WINDOW.w + 6, WINDOW.h + 6, 8);
    c.stroke();
    c.restore();
    const kind = (index === 0 && i === 1) || (index === 1 && i === 3) ? 'figure'
      : (index === 0 && i === xs.length - 1) || (index === 1 && i === 1) ? 'curtain'
        : (index === 0 && i === 2) ? 'case' : 'plain';
    interior(c, x, y, WINDOW.w, WINDOW.h, kind, random);
    c.save();
    roundRectPath(c, x - 6.5, y - 6.5, WINDOW.w + 13, WINDOW.h + 13, 10);
    c.lineWidth = 1.5; c.strokeStyle = PAL.ink; c.globalAlpha = 0.7; c.stroke();
    c.restore();
    glow(c, x + WINDOW.w / 2, y + WINDOW.h / 2, 70, 'rgba(255, 190, 110, 0.9)', 0.22);
    lights.push([x, WINDOW.w]);
    // lamp light spilling down the wet lacquer
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = vgrad(c, y + WINDOW.h, bottom, [[0, 'rgba(255, 190, 110, 0.16)'], [1, 'rgba(255, 190, 110, 0)']]);
    c.fillRect(x - 6, y + WINDOW.h + 4, WINDOW.w + 12, bottom - y - WINDOW.h - 4);
    c.restore();
  });
  // rivets along the panel seams
  for (let sx = x0 + 60; sx < x1 - 50; sx += WINDOW.pitch) {
    c.fillStyle = 'rgba(0, 0, 0, 0.32)';
    c.fillRect(sx - 18, top + 14, 1.6, bottom - top - 18);
    for (let y = H * 0.62; y < bottom - 6; y += 16) rivet(c, sx - 14, y, 1.5);
  }
  // the service's name in brass on the first carriage
  if (index === 0 && L.lamp.x + 150 < Math.min(x1 - 60, L.W - 20)) {
    c.save();
    c.font = '700 13px "Space Mono", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = PAL.brassLight;
    c.globalAlpha = 0.85;
    // under the windows clear of the nameboard and the lamp post
    const mid = Math.max(L.board.x + L.board.w + 70, L.lamp.x + 92);
    if ('letterSpacing' in c) c.letterSpacing = '4px';
    c.fillText('NIGHT SERVICE', mid, H * 0.638);
    c.restore();
  }
  ink(c, [[x0, bottom], [x0, top], [x1, top], [x1, bottom]], { w: 2.2, alpha: 0.85, seed: 5320 + index });
  // the shine of the platform lamp along the roof edge
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = 'rgba(255, 210, 150, 0.12)';
  c.fillRect(x0 + 30, L.roof, x1 - x0 - 60, 2);
  c.restore();
}

function gangway(c, L, x) {
  c.fillStyle = '#0d1517';
  c.fillRect(x - 3, L.body.top + 12, 28, L.body.bottom - L.body.top - 20);
  for (let k = 0; k < 5; k += 1) inkLine(c, x + 2 + k * 5, L.body.top + 14, x + 2 + k * 5, L.body.bottom - 8, { w: 1, alpha: 0.35, bleed: false, seed: x + k });
}

function tailEnd(c, L) {
  const x = L.tail;
  // a red tail lamp on the last carriage's end, and its glow
  const y = L.body.top + 34;
  c.fillStyle = PAL.brassDark;
  c.fillRect(x - 6, y + 9, 10, 3);
  c.fillStyle = '#2a1410';
  roundRectPath(c, x - 9, y - 9, 13, 18, 3); c.fill();
  c.fillStyle = '#e0563c';
  c.beginPath(); c.arc(x - 2.5, y, 4, 0, TAU); c.fill();
  glow(c, x - 2.5, y, 36, 'rgba(230, 80, 50, 0.9)', 0.45);
  ink(c, [[x - 9, y - 9], [x + 4, y - 9], [x + 4, y + 9], [x - 9, y + 9]], { w: 1, alpha: 0.6, closed: true, bleed: false, seed: 5401 });
  // buffers
  [L.body.bottom - 22].forEach((by) => {
    c.fillStyle = '#121618';
    c.fillRect(x - 18, by - 5, 18, 10);
    inkEllipse(c, x - 19, by, 3, 7, { w: 1.2, alpha: 0.6, bleed: false });
  });
}

function steamBand(c, L) {
  // the engine is off to the right: its steam lies back along the roofs
  const random = rng(5501);
  for (let i = 0; i < 14; i += 1) {
    const x = L.W - random() * L.W * 0.55;
    const y = L.roof - 18 - random() * 40 + (L.W - x) * 0.02;
    const r = 26 + random() * 46;
    glow(c, x, y, r, 'rgba(200, 205, 205, 0.9)', 0.05 + random() * 0.05, 'source-over');
  }
  ink(c, [[L.W + 10, L.roof - 32], [L.W * 0.86, L.roof - 46], [L.W * 0.74, L.roof - 40]], { w: 1.2, alpha: 0.18, jitter: 2, bleed: false, seed: 5502 });
}

// ---------------------------------------------------------------------------
// the platform

function platform(c, L, lights) {
  const { W, H } = L;
  const y0 = L.platform;
  // coping stones
  c.fillStyle = vgrad(c, y0, y0 + 16, [[0, '#3b4448'], [1, '#232a2d']]);
  c.fillRect(-10, y0, W + 20, 16);
  for (let x = 0; x < W; x += 54) inkLine(c, x, y0 + 2, x, y0 + 15, { w: 1, alpha: 0.28, bleed: false, seed: 5600 + x });
  ink(c, [[-10, y0], [W + 10, y0]], { w: 2.4, alpha: 0.9, seed: 5601 });
  ink(c, [[-10, y0 + 16], [W + 10, y0 + 16]], { w: 1.3, alpha: 0.5, seed: 5602 });
  // the wet flags
  c.fillStyle = vgrad(c, y0 + 16, H, [[0, '#141d22'], [0.5, '#111a1e'], [1, '#0b1114']]);
  c.fillRect(-10, y0 + 16, W + 20, H - y0);
  let row = y0 + 16;
  let gap = 22;
  let k = 0;
  while (row < H) {
    ink(c, [[-10, row], [W + 10, row]], { w: 1, alpha: 0.16, jitter: 0.8, bleed: false, seed: 5610 + k });
    const off = (k % 2) * 40;
    for (let x = off; x < W; x += 80 + gap) inkLine(c, x, row, x - 4, row + gap, { w: 0.9, alpha: 0.12, bleed: false, seed: 5620 + k * 31 + x });
    row += gap;
    gap *= 1.28;
    k += 1;
  }
  // every lit window, broken up in the puddles
  c.save();
  c.globalCompositeOperation = 'lighter';
  const random = rng(5630);
  lights.forEach(([x, w]) => {
    for (let y = y0 + 22; y < H * 0.98; y += 5 + random() * 6) {
      const fade = 1 - (y - y0) / (H - y0);
      const wobbleX = (random() - 0.5) * 8;
      const width = w * (0.5 + random() * 0.5) * (0.6 + fade * 0.4);
      c.fillStyle = `rgba(255, 186, 104, ${0.05 + fade * 0.16 * random()})`;
      c.fillRect(x + (w - width) / 2 + wobbleX, y, width, 1.6 + random() * 2.4);
    }
  });
  c.restore();
  // puddles: flat sheets with a lit rim
  const puddles = rng(5640);
  for (let i = 0; i < 7; i += 1) {
    const px = puddles() * W;
    const py = y0 + 40 + puddles() * (H - y0 - 60);
    const rx = 40 + puddles() * 90;
    const ry = 4 + puddles() * 7;
    c.fillStyle = 'rgba(40, 60, 72, 0.35)';
    c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, TAU); c.fill();
    ink(c, [[px - rx * 0.8, py - ry * 0.4], [px, py - ry], [px + rx * 0.7, py - ry * 0.5]], { w: 0.9, alpha: 0.18, bleed: false, seed: 5650 + i });
  }
  speckle(c, 0, y0 + 16, W, H - y0, { count: 500, color: 'rgba(200, 215, 225, 0.06)', size: 2, seed: 5660 });
}

function nameboard(c, L) {
  const { x, y, w, h } = L.board;
  const ground = L.platform + 74;
  // two iron posts
  [x + 22, x + w - 26].forEach((px, i) => {
    c.fillStyle = '#10181b';
    c.fillRect(px, y + h - 4, 5, ground - y - h + 4);
    ink(c, [[px, y + h], [px, ground]], { w: 1.2, alpha: 0.7, bleed: false, seed: 5701 + i });
    ink(c, [[px + 5, y + h], [px + 5, ground]], { w: 1, alpha: 0.4, bleed: false, seed: 5703 + i });
  });
  c.fillStyle = 'rgba(0, 0, 0, 0.35)';
  c.beginPath(); c.ellipse(x + w / 2, ground + 2, w * 0.55, 5, 0, 0, TAU); c.fill();
  // the enamel board: teal with an ivory rim, like the Chapter 1 platform
  c.fillStyle = '#1f4a45';
  roundRectPath(c, x, y, w, h, 5); c.fill();
  c.lineWidth = 2.5; c.strokeStyle = 'rgba(234, 223, 198, 0.85)';
  roundRectPath(c, x + 5, y + 5, w - 10, h - 10, 3); c.stroke();
  ink(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { w: 1.8, alpha: 0.8, closed: true, seed: 5705 });
  c.save();
  c.font = '700 22px "Space Mono", monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = PAL.ink;
  if ('letterSpacing' in c) c.letterSpacing = '2px';
  let size = 22;
  while (size > 12 && c.measureText('BELLWETHER').width > w - 26) { size -= 1; c.font = `700 ${size}px "Space Mono", monospace`; }
  c.fillText('BELLWETHER', x + w / 2 + 1, y + h / 2 + 1);
  c.restore();
  // lamp light catching its top edge
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = 'rgba(255, 200, 130, 0.1)';
  c.fillRect(x + 4, y + 2, w - 8, 3);
  c.restore();
}

function bench(c, L) {
  // a slatted platform bench in the open end, facing the train
  const x = Math.max(24, L.tail * 0.18);
  const seat = L.H * 0.86;
  const w = Math.min(150, L.tail * 0.62);
  if (w < 70) return;
  c.fillStyle = 'rgba(0, 0, 0, 0.35)';
  c.beginPath(); c.ellipse(x + w / 2, seat + 30, w * 0.6, 5, 0, 0, TAU); c.fill();
  c.fillStyle = '#4a3121';
  [0, 9].forEach((dy) => c.fillRect(x, seat - 34 + dy, w, 5));
  c.fillRect(x - 4, seat - 3, w + 8, 6);
  c.fillStyle = '#121a1e';
  [x + 10, x + w - 16].forEach((lx) => { c.fillRect(lx, seat - 38, 6, 68); });
  ink(c, [[x, seat - 34], [x + w, seat - 34], [x + w, seat - 20], [x, seat - 20]], { w: 1.3, alpha: 0.7, closed: true, seed: 5751 });
  ink(c, [[x - 4, seat - 3], [x + w + 4, seat - 3], [x + w + 4, seat + 3], [x - 4, seat + 3]], { w: 1.3, alpha: 0.75, closed: true, seed: 5752 });
  [x + 10, x + w - 16].forEach((lx, i) => ink(c, [[lx, seat - 38], [lx, seat + 30], [lx + 6, seat + 30], [lx + 6, seat - 38]], { w: 1.1, alpha: 0.6, bleed: false, seed: 5753 + i }));
  // rain beading on the slats
  speckle(c, x, seat - 36, w, 4, { count: 30, color: 'rgba(234, 223, 198, 0.3)', size: 1.6, seed: 5755 });
}

function lampPost(c, L) {
  const { x, top, base } = L.lamp;
  // the pool of light on the flags, and the cone through the rain
  lightCone(c, x, top + 28, 150, base - top - 10, 0.16);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const pool = c.createRadialGradient(x, base - 6, 4, x, base - 6, 180);
  pool.addColorStop(0, 'rgba(255, 196, 110, 0.32)');
  pool.addColorStop(1, 'rgba(255, 196, 110, 0)');
  c.fillStyle = pool;
  c.beginPath(); c.ellipse(x, base - 6, 180, 30, 0, 0, TAU); c.fill();
  c.restore();
  // the post: a fluted iron column on a stepped base, a ladder bar, the lantern
  c.fillStyle = '#121a1e';
  c.fillRect(x - 3.5, top + 40, 7, base - top - 54);
  c.beginPath(); c.moveTo(x - 12, base); c.lineTo(x - 8, base - 22); c.lineTo(x + 8, base - 22); c.lineTo(x + 12, base); c.closePath(); c.fill();
  ink(c, [[x - 3.5, top + 40], [x - 3.5, base - 22]], { w: 1.4, alpha: 0.75, bleed: false, seed: 5801 });
  ink(c, [[x + 3.5, top + 40], [x + 3.5, base - 22]], { w: 1.1, alpha: 0.5, bleed: false, seed: 5802 });
  ink(c, [[x - 12, base], [x - 8, base - 22], [x + 8, base - 22], [x + 12, base]], { w: 1.5, alpha: 0.75, seed: 5803 });
  c.fillStyle = brassFill(c, x - 18, top + 44, 36, 4);
  c.fillRect(x - 18, top + 44, 36, 4);
  ink(c, [[x - 18, top + 44], [x + 18, top + 44]], { w: 1, alpha: 0.6, bleed: false, seed: 5804 });
  // lantern: brass cap, four amber panes, a finial
  const lt = top;
  c.fillStyle = brassFill(c, x - 15, lt + 4, 30, 8);
  c.beginPath(); c.moveTo(x - 17, lt + 12); c.lineTo(x, lt); c.lineTo(x + 17, lt + 12); c.closePath(); c.fill();
  c.fillStyle = PAL.brassDark;
  c.fillRect(x - 1.5, lt - 7, 3, 7);
  c.fillStyle = vgrad(c, lt + 12, lt + 36, [[0, '#fff0c4'], [0.6, '#ffcf7a'], [1, '#e0a24a']]);
  c.beginPath(); c.moveTo(x - 13, lt + 12); c.lineTo(x + 13, lt + 12); c.lineTo(x + 9, lt + 36); c.lineTo(x - 9, lt + 36); c.closePath(); c.fill();
  c.fillStyle = PAL.brassDark;
  c.fillRect(x - 1, lt + 12, 2, 24);
  c.fillRect(x - 10, lt + 36, 20, 4);
  ink(c, [[x - 17, lt + 12], [x, lt], [x + 17, lt + 12], [x + 13, lt + 12], [x + 9, lt + 36], [x - 9, lt + 36], [x - 13, lt + 12]], { w: 1.4, alpha: 0.8, closed: true, seed: 5805 });
  glow(c, x, lt + 24, 90, 'rgba(255, 196, 110, 0.95)', 0.55);
  glow(c, x, lt + 24, 220, 'rgba(255, 180, 90, 0.8)', 0.18);
  // its long reflection
  c.save();
  c.globalCompositeOperation = 'lighter';
  const random = rng(5806);
  for (let y = base + 4; y < L.H; y += 4 + random() * 4) {
    const w = 8 + random() * 22;
    c.fillStyle = `rgba(255, 200, 120, ${0.08 + random() * 0.14})`;
    c.fillRect(x - w / 2 + (random() - 0.5) * 6, y, w, 1.6);
  }
  c.restore();
}

// Butch, assembled from Chapter 1's own rig parts (figures.js), standing.
const partCache = new Map();
function partCanvas(name) {
  if (partCache.has(name)) return partCache.get(name);
  const part = BUTCH_PARTS[name];
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(part.w * RES);
  canvas.height = Math.ceil(part.h * RES);
  const pc = canvas.getContext('2d');
  pc.scale(RES, RES);
  part.paint(pc);
  partCache.set(name, canvas);
  return canvas;
}

function drawPart(c, name, x, y, rotation = 0, dim = 0) {
  const part = BUTCH_PARTS[name];
  c.save();
  c.translate(x, y);
  c.rotate(rotation);
  if (dim) c.filter = `brightness(${1 - dim})`;
  c.drawImage(partCanvas(name), -part.pivot[0], -part.pivot[1], part.w, part.h);
  c.restore();
}

function butch(c, L) {
  const { x, feet, height } = L.butch;
  const s = height / 70;
  c.save();
  c.translate(x, feet);
  c.scale(s, s);
  c.fillStyle = 'rgba(0, 0, 0, 0.4)';
  c.beginPath(); c.ellipse(0, 0, 18, 3, 0, 0, TAU); c.fill();
  // the orchard case set down at his feet
  c.save();
  c.translate(-30, 0);
  c.fillStyle = '#6d4a2c'; roundRectPath(c, 0, -18, 24, 17, 2); c.fill();
  c.fillStyle = PAL.brass; c.fillRect(5, -18, 2.4, 17); c.fillRect(16, -18, 2.4, 17); c.fillRect(9, -21, 6, 3);
  c.fillStyle = 'rgba(255, 220, 170, 0.12)'; c.fillRect(0, -18, 24, 4);
  ink(c, [[0, -18], [24, -18], [24, -1], [0, -1]], { w: 0.9, closed: true, bleed: false, jitter: 0.15, seed: 5901 });
  c.restore();
  const hipY = -30;
  const leg = (lx, thigh, dim) => {
    c.save();
    c.translate(lx, hipY);
    c.rotate(thigh);
    drawPart(c, 'thigh', 0, 0, 0, dim);
    c.translate(0, 14);
    drawPart(c, 'shin', 0, 0, 0, dim);
    c.restore();
  };
  drawPart(c, 'arm', -3, -52, -0.05, 0.25);
  leg(-2.5, -0.04, 0.22);
  leg(2.5, 0.05, 0);
  drawPart(c, 'torso', 0, hipY + 11, 0);
  drawPart(c, 'head', 1, -54, -0.06);
  // the lamp held out a little towards the train
  drawPart(c, 'arm', 3, -52, -0.55);
  drawPart(c, 'lamp', 13, -32, 0.1);
  c.restore();
  glow(c, x + 13.5 * s, feet - 26 * s, 50 * s, 'rgba(255, 196, 110, 0.95)', 0.42);
  // his lamp in the puddle under him
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = 'rgba(255, 200, 120, 0.16)';
  c.fillRect(x + 9 * s, feet + 4, 9 * s, 2);
  c.fillRect(x + 10 * s, feet + 10, 7 * s, 1.6);
  c.restore();
}

function rainLines(c, L) {
  const random = rng(5951);
  for (let i = 0; i < 120; i += 1) {
    const x = random() * L.W;
    const y = random() * L.H;
    const len = 14 + random() * 30;
    c.strokeStyle = `rgba(214, 224, 236, ${0.05 + random() * 0.12})`;
    c.lineWidth = 0.8 + random() * 0.6;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - len * 0.14, y + len); c.stroke();
  }
}

/** Paint the whole scene into `canvas` (its backing size), for a glass of cssW × cssH. */
export function paintTitlePlate(canvas, cssW, cssH) {
  const L = plateLayout(cssW, cssH);
  const c = canvas.getContext('2d');
  const k = canvas.height / L.H;
  c.save();
  c.setTransform(k, 0, 0, k, 0, 0);
  c.clearRect(0, 0, L.W, L.H);
  sky(c, L);
  country(c, L);
  const lights = [];
  const spans = carriages(L);
  spans.forEach(([x0, x1], i) => carriage(c, L, x0, x1, i, lights));
  spans.slice(0, -1).forEach(([, x1]) => gangway(c, L, x1));
  tailEnd(c, L);
  steamBand(c, L);
  platform(c, L, lights);
  nameboard(c, L);
  bench(c, L);
  lampPost(c, L);
  butch(c, L);
  rainLines(c, L);
  vignette(c, L.W, L.H, 0.5);
  speckle(c, 0, 0, L.W, L.H, { count: 900, color: 'rgba(255, 240, 210, 0.035)', size: 1.6, seed: 5990 });
  c.restore();
  return L;
}

/** Backing-store size for a glass of cssW × cssH at device ratio `dpr`. */
export function backingSize(cssW, cssH, dpr = 1) {
  let w = Math.max(1, Math.round(cssW * dpr));
  let h = Math.max(1, Math.round(cssH * dpr));
  const over = Math.sqrt((w * h) / MAX_PIXELS);
  if (over > 1) { w = Math.round(w / over); h = Math.round(h / over); }
  return { w, h };
}

/**
 * Mount the plate in `glass` (the .nf-window-glass element): a canvas painted
 * to its size (again whenever it is resized) plus the lamp and steam layers.
 * Returns a cleanup function.
 */
export function mountTitlePlate(glass) {
  if (typeof document === 'undefined' || !glass) return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = 'nf-title-backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  const lampGlow = document.createElement('div');
  lampGlow.className = 'nf-plate-lamp';
  lampGlow.setAttribute('aria-hidden', 'true');
  const steam = document.createElement('div');
  steam.className = 'nf-plate-steam';
  steam.setAttribute('aria-hidden', 'true');
  steam.innerHTML = '<i></i><i></i><i></i>';
  glass.prepend(canvas, lampGlow, steam);
  let painted = '';
  let timer = null;
  const paint = () => {
    const rect = glass.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const { w, h } = backingSize(rect.width, rect.height, window.devicePixelRatio || 1);
    const key = `${w}x${h}`;
    if (key === painted) return;
    painted = key;
    canvas.width = w;
    canvas.height = h;
    try {
      const L = paintTitlePlate(canvas, rect.width, rect.height);
      glass.style.setProperty('--nf-plate-lamp-x', `${(L.css.lamp.x * 100).toFixed(2)}%`);
      glass.style.setProperty('--nf-plate-lamp-y', `${(L.css.lamp.y * 100).toFixed(2)}%`);
      glass.style.setProperty('--nf-plate-steam-y', `${(L.css.steam.y * 100).toFixed(2)}%`);
      glass.dataset.plate = 'painted';
    } catch {
      glass.dataset.plate = 'failed';
    }
  };
  const schedule = (delay) => {
    clearTimeout(timer);
    timer = setTimeout(paint, delay);
  };
  // The nameboard's lettering is Space Mono: give the font a moment, then
  // repaint once it has arrived if it was late.
  const fontSpec = '700 22px "Space Mono"';
  const fontLate = document.fonts?.check ? !document.fonts.check(fontSpec) : false;
  requestAnimationFrame(() => paint());
  if (fontLate) document.fonts.load(fontSpec).then(() => { painted = ''; paint(); }).catch(() => {});
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule(140)) : null;
  observer?.observe(glass);
  return () => {
    clearTimeout(timer);
    observer?.disconnect();
  };
}
