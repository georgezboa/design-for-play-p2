// The carriage wall around the windows (spec §5): deep walnut, brass trim and
// rivets, lamps between the windows, and a brass sill for captions. Painted
// once per layout into a 1920×1080 canvas. Also the per-window brass bezel
// and vignette canvases.

import { PAL, brassFill, glow, ink, rivet, rng, roundRectPath, vgrad, wood, paperGrain } from './ink.js';

export const BEZEL = 13;
export const RADIUS = 16;

export function paintWall(c, layout, { paper = null } = {}) {
  const { w: W, h: H } = layout.view;
  // walnut planks, vertical
  wood(c, 0, 0, W, H, { base: PAL.walnut, seed: 101, vertical: true, grain: 'rgba(0,0,0,0.35)', light: 'rgba(255,210,160,0.035)' });
  const random = rng(102);
  for (let x = 0; x < W; x += 132 + Math.floor(random() * 30)) {
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(x, 0, 2, H);
    c.fillStyle = 'rgba(255,220,170,0.03)';
    c.fillRect(x + 2, 0, 1, H);
  }
  // darker toward the corners
  const vg = c.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, W * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);

  // raised walnut panel behind the whole window group
  const pad = 34;
  const gx = layout.x - pad;
  const gy = layout.y - pad;
  const gw = layout.w + pad * 2;
  const gh = layout.h + pad * 2;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.7)';
  c.shadowBlur = 40;
  c.shadowOffsetY = 12;
  roundRectPath(c, gx, gy, gw, gh, 22);
  c.fillStyle = '#23170f';
  c.fill();
  c.restore();
  c.save();
  roundRectPath(c, gx, gy, gw, gh, 22);
  c.clip();
  wood(c, gx, gy, gw, gh, { base: '#2a1b11', seed: 103, vertical: false, grain: 'rgba(0,0,0,0.3)' });
  c.restore();
  // brass trim around the group
  c.save();
  c.lineWidth = 6;
  c.strokeStyle = brassFill(c, gx, gy, gw, gh);
  roundRectPath(c, gx + 3, gy + 3, gw - 6, gh - 6, 20);
  c.stroke();
  c.lineWidth = 1.2;
  c.strokeStyle = 'rgba(255, 230, 170, 0.35)';
  roundRectPath(c, gx + 9, gy + 9, gw - 18, gh - 18, 16);
  c.stroke();
  c.restore();
  // rivets along the trim
  const every = 46;
  for (let x = gx + 24; x < gx + gw - 20; x += every) { rivet(c, x, gy + 3, 3.4); rivet(c, x, gy + gh - 3, 3.4); }
  for (let y = gy + 24; y < gy + gh - 20; y += every) { rivet(c, gx + 3, y, 3.4); rivet(c, gx + gw - 3, y, 3.4); }

  // gutters: recessed dark channels with a brass cross-strap at each joint
  layout.slots.forEach((slot) => {
    if (slot.col < layout.cols - 1) {
      const x = slot.x + slot.w;
      c.fillStyle = vgrad(c, slot.y, slot.y + slot.h, [[0, '#120c08'], [0.5, '#1a110b'], [1, '#120c08']]);
      c.fillRect(x + 4, slot.y - 6, layout.gutter - 8, slot.h + 12);
    }
    if (slot.row < layout.rows - 1) {
      const y = slot.y + slot.h;
      c.fillStyle = '#140d09';
      c.fillRect(slot.x - 6, y + 4, slot.w + 12, layout.gutter - 8);
    }
  });

  // lamps: small brass sconces above the gutters between columns, and above
  // the outer edges; warm light washes down between the windows
  const lampXs = [];
  for (let col = 0; col <= layout.cols; col += 1) {
    const x = col === 0 ? layout.x - pad * 0.5 : col === layout.cols ? layout.x + layout.w + pad * 0.5 : layout.slots[col].x - layout.gutter / 2;
    lampXs.push(x);
  }
  lampXs.forEach((x) => {
    const y = gy - 6;
    glow(c, x, y + 20, 260, 'rgba(255, 180, 90, 0.9)', 0.22);
    c.fillStyle = brassFill(c, x - 18, y - 12, 36, 12);
    c.beginPath(); c.moveTo(x - 18, y); c.lineTo(x + 18, y); c.lineTo(x + 10, y - 12); c.lineTo(x - 10, y - 12); c.closePath(); c.fill();
    c.fillStyle = '#ffe3a8';
    c.beginPath(); c.ellipse(x, y + 1, 12, 3.5, 0, 0, Math.PI * 2); c.fill();
    ink(c, [[x - 18, y], [x + 18, y], [x + 10, y - 12], [x - 10, y - 12]], { w: 1.5, closed: true, alpha: 0.7 });
  });

  // brass sill under the windows: the caption rail
  const sillY = gy + gh + 22;
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.fillRect(gx - 20, sillY + 10, gw + 40, 10);
  c.fillStyle = brassFill(c, gx - 20, sillY - 6, gw + 40, 16);
  roundRectPath(c, gx - 20, sillY - 6, gw + 40, 16, 6);
  c.fill();
  ink(c, [[gx - 20, sillY - 6], [gx + gw + 20, sillY - 6]], { w: 1.2, alpha: 0.4 });
  for (let x = gx; x < gx + gw; x += 120) rivet(c, x, sillY + 2, 2.6);
  // a luggage rack rail across the very top
  c.fillStyle = brassFill(c, 0, 12, W, 8);
  c.fillRect(0, 12, W, 6);
  for (let x = 40; x < W; x += 180) { c.fillStyle = PAL.brassDark; c.fillRect(x, 6, 6, 18); }
  if (paper) paperGrain(c, W, H, paper, 0.06);
  return { sillY };
}

/** A brass bezel ring (tile + BEZEL on each side, hole with rounded corners). */
export function paintBezel(c, w, h) {
  const W = w + BEZEL * 2;
  const H = h + BEZEL * 2;
  c.save();
  roundRectPath(c, 0, 0, W, H, RADIUS + BEZEL * 0.6);
  c.fillStyle = brassFill(c, 0, 0, W, H);
  c.fill();
  // bevel highlights
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(255, 238, 190, 0.55)';
  roundRectPath(c, 1.5, 1.5, W - 3, H - 3, RADIUS + BEZEL * 0.6);
  c.stroke();
  c.strokeStyle = 'rgba(40, 25, 10, 0.7)';
  roundRectPath(c, BEZEL - 3, BEZEL - 3, w + 6, h + 6, RADIUS + 2);
  c.stroke();
  // punch the window hole
  c.globalCompositeOperation = 'destination-out';
  roundRectPath(c, BEZEL, BEZEL, w, h, RADIUS);
  c.fill();
  c.restore();
  // inner shadow onto the painting
  c.save();
  roundRectPath(c, BEZEL, BEZEL, w, h, RADIUS);
  c.clip();
  c.shadowColor = 'rgba(0,0,0,0.85)';
  c.shadowBlur = 18;
  c.lineWidth = 16;
  c.strokeStyle = 'rgba(0,0,0,0.9)';
  roundRectPath(c, BEZEL - 8, BEZEL - 8, w + 16, h + 16, RADIUS + 6);
  c.stroke();
  c.restore();
  // corner rivets
  [[BEZEL * 0.5, BEZEL * 0.5], [W - BEZEL * 0.5, BEZEL * 0.5], [BEZEL * 0.5, H - BEZEL * 0.5], [W - BEZEL * 0.5, H - BEZEL * 0.5]].forEach(([x, y]) => rivet(c, x + (x < W / 2 ? 6 : -6), y + (y < H / 2 ? 6 : -6), 2.6));
  // ink outline, faint
  c.save();
  c.globalAlpha = 0.35;
  c.strokeStyle = PAL.ink;
  c.lineWidth = 1.2;
  roundRectPath(c, 0.5, 0.5, W - 1, H - 1, RADIUS + BEZEL * 0.6);
  c.stroke();
  c.restore();
}

export function paintVignette(c, w, h) {
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.75, 'rgba(8,5,4,0.2)');
  g.addColorStop(1, 'rgba(8,5,4,0.62)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // a fine film of paper grain over the whole window (fields included)
  const random = rng(303);
  for (let i = 0; i < (w * h) / 60; i += 1) {
    c.fillStyle = random() > 0.5 ? 'rgba(20, 12, 6, 0.10)' : 'rgba(255, 236, 200, 0.045)';
    c.fillRect(random() * w, random() * h, 1 + random() * 1.4, 1 + random() * 1.4);
  }
}

/** Soft radial dot used for glows, dust, and light runs. */
export function paintRadial(c, size, stops = [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]) {
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
}

/** The punched-hole lens rim: a torn paper ring with a brass edge. */
export function paintLensRim(c, r) {
  const size = (r + 26) * 2;
  const cx = size / 2;
  const random = rng(201);
  c.save();
  c.beginPath();
  const n = 90;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + 14 + (random() - 0.5) * 5;
    const x = cx + Math.cos(a) * rr;
    const y = cx + Math.sin(a) * rr;
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.closePath();
  c.arc(cx, cx, r, 0, Math.PI * 2, true);
  c.fillStyle = 'rgba(226, 212, 180, 0.95)';
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 12;
  c.fill();
  c.restore();
  c.save();
  c.lineWidth = 3;
  c.strokeStyle = PAL.brass;
  c.beginPath(); c.arc(cx, cx, r + 1.5, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 1.2;
  c.strokeStyle = PAL.ink;
  c.globalAlpha = 0.8;
  c.beginPath(); c.arc(cx, cx, r + 13, 0, Math.PI * 2); c.stroke();
  c.restore();
}
