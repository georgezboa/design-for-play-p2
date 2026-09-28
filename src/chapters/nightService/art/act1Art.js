// Act 1 · LOST PROPERTY — the four windows and their zoomed states.
//
// Each export is a SceneDef `draw(ctx)` (see README.md): it paints a static
// canvas for the panel and adds a few live pieces (lamp flicker, dust, rain,
// drifting fields). Coordinates are in tile pixels; `ctx.w`/`ctx.h` are the
// panel size. No Phaser import: the painter context supplies the objects.

import {
  PAL, amberGlint, brassFill, brushTexture, glow, hgrad, ink, inkEllipse, inkLine, inkRect,
  lightCone, paperGrain, parcel, rivet, rng, roundRectPath, speckle, vgrad, vignette, wood,
} from './ink.js';

export const FLOOR = 0.78;
export const CHUTE_AT = 0.7;

// ---------------------------------------------------------------------------
// shared pieces

function backWall(c, w, h, floorY, { seed = 1, tone = ['#132328', '#1f383e'] } = {}) {
  c.fillStyle = vgrad(c, 0, floorY, [[0, tone[0]], [1, tone[1]]]);
  c.fillRect(-20, -20, w + 40, floorY + 20);
  // faint damask stripes
  c.save();
  c.globalAlpha = 0.06;
  c.fillStyle = PAL.ink;
  for (let x = -20; x < w + 20; x += 34) c.fillRect(x, 0, 12, floorY);
  c.restore();
  brushTexture(c, 0, 0, w, floorY, { seed, color: 'rgba(200,230,230,0.025)', count: 70 });
}

function wainscot(c, w, h, top, bottom, { seed = 2, x0 = -20, x1 = null } = {}) {
  const right = x1 ?? w + 20;
  wood(c, x0, top, right - x0, bottom - top, { base: '#3a2517', seed, vertical: true });
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.fillRect(x0, top, right - x0, bottom - top);
  const panelW = 92;
  for (let x = x0 + 14; x + panelW - 18 < right; x += panelW) {
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(x, top + 12, panelW - 18, bottom - top - 22);
    inkRect(c, x, top + 12, panelW - 18, bottom - top - 22, { w: 1.3, alpha: 0.45 });
  }
  // chair rail in brass
  c.fillStyle = brassFill(c, x0, top - 5, right - x0, 7);
  c.fillRect(x0, top - 5, right - x0, 7);
  inkLine(c, x0, top - 5, right, top - 5, { w: 1.4, alpha: 0.5 });
}

function floorboards(c, w, h, floorY, { seed = 4, runner = null } = {}) {
  c.fillStyle = vgrad(c, floorY, h + 20, [[0, '#3b2819'], [1, '#150d08']]);
  c.fillRect(-20, floorY, w + 40, h - floorY + 20);
  const random = rng(seed);
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  c.lineWidth = 1.2;
  let y = floorY + 6;
  let gap = 6;
  while (y < h + 20) {
    c.beginPath(); c.moveTo(-20, y); c.lineTo(w + 20, y); c.stroke();
    for (let x = -20 + random() * 120; x < w + 20; x += 90 + random() * 90) {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + gap); c.stroke();
    }
    gap *= 1.35;
    y += gap;
  }
  if (runner) {
    const [rx0, rx1] = runner;
    const ry0 = floorY + 5;
    const ry1 = floorY + (h - floorY) * 0.62;
    c.fillStyle = vgrad(c, ry0, ry1, [[0, '#7a3226'], [1, '#4a1a14']]);
    c.beginPath();
    c.moveTo(rx0 + 8, ry0); c.lineTo(rx1, ry0); c.lineTo(rx1 + 10, ry1); c.lineTo(rx0 - 6, ry1); c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(216, 204, 176, 0.45)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(rx0 + 8, ry0 + 5); c.lineTo(rx1, ry0 + 5); c.stroke();
    c.beginPath(); c.moveTo(rx0 - 4, ry1 - 6); c.lineTo(rx1 + 10, ry1 - 6); c.stroke();
    speckle(c, rx0, ry0, rx1 - rx0, ry1 - ry0, { count: 260, color: 'rgba(255,200,150,0.06)', seed });
  }
  // The floor line is the linkable edge: inked strongly all the way out.
  ink(c, [[-4, floorY], [w + 4, floorY]], { w: 2.8, alpha: 0.95, jitter: 0.5 });
}

function ceiling(c, w, depth = 22) {
  wood(c, -20, -20, w + 40, depth + 20, { base: '#1d140d', seed: 21 });
  c.fillStyle = brassFill(c, -20, depth - 3, w + 40, 5);
  c.fillRect(-20, depth - 3, w + 40, 5);
  inkLine(c, -20, depth + 2, w + 20, depth + 2, { w: 1.6, alpha: 0.55 });
}

function hangingLamp(c, x, cordTop, shadeY, { r = 22 } = {}) {
  ink(c, [[x, cordTop], [x, shadeY - 4]], { w: 1.2, alpha: 0.7, jitter: 0.2 });
  c.fillStyle = vgrad(c, shadeY - 4, shadeY + 14, [[0, '#6b4a26'], [1, '#2e2012']]);
  c.beginPath();
  c.moveTo(x - 6, shadeY - 4); c.lineTo(x + 6, shadeY - 4); c.lineTo(x + r, shadeY + 12); c.lineTo(x - r, shadeY + 12); c.closePath();
  c.fill();
  c.fillStyle = '#ffe3a8';
  c.beginPath(); c.ellipse(x, shadeY + 13, r * 0.7, 3.2, 0, 0, Math.PI * 2); c.fill();
  ink(c, [[x - 6, shadeY - 4], [x - r, shadeY + 12], [x + r, shadeY + 12], [x + 6, shadeY - 4]], { w: 1.6, closed: true });
  lightCone(c, x, shadeY + 12, r * 3.4, 260, 0.16);
}

function wallClock(c, x, y, r) {
  c.fillStyle = brassFill(c, x - r - 4, y - r - 4, (r + 4) * 2, (r + 4) * 2);
  c.beginPath(); c.arc(x, y, r + 4, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ddd0b2';
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(40,30,20,0.8)';
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    c.lineWidth = i % 3 === 0 ? 2 : 1;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
    c.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
    c.stroke();
  }
  inkEllipse(c, x, y, r + 4, r + 4, { w: 1.8 });
}

function routeMap(c, x, y, w, h) {
  c.fillStyle = '#cdbf9e';
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(120, 90, 50, 0.25)';
  c.fillRect(x, y, w, h);
  paperSpots(c, x, y, w, h);
  // the line: a meandering route with stops
  const pts = [[0.08, 0.7], [0.25, 0.62], [0.4, 0.68], [0.55, 0.42], [0.72, 0.46], [0.9, 0.24]].map(([u, v]) => [x + u * w, y + v * h]);
  ink(c, pts, { w: 2.2, color: PAL.oxblood, alpha: 0.9, jitter: 0.3, bleed: false });
  pts.forEach(([px, py], i) => {
    c.fillStyle = i === pts.length - 1 ? PAL.oxblood : '#2b221a';
    c.beginPath(); c.arc(px, py, i === pts.length - 1 ? 3.6 : 2.6, 0, Math.PI * 2); c.fill();
  });
  // a second faint branch line
  ink(c, [[x + 0.55 * w, y + 0.42 * h], [x + 0.6 * w, y + 0.85 * h]], { w: 1.2, color: '#4b3a2a', alpha: 0.5, jitter: 0.3, bleed: false });
  c.strokeStyle = PAL.walnutMid;
  c.lineWidth = 6;
  c.strokeRect(x - 3, y - 3, w + 6, h + 6);
  inkRect(c, x - 6, y - 6, w + 12, h + 12, { w: 1.5 });
}

function paperSpots(c, x, y, w, h) {
  speckle(c, x, y, w, h, { count: Math.round((w * h) / 90), color: 'rgba(90, 60, 30, 0.12)', size: 2, seed: Math.round(x + y) });
}

function finish(c, env, { grain = 0.2, vig = 0.45 } = {}) {
  paperGrain(c, env.w, env.h, env.paper, grain);
  vignette(c, env.w, env.h, vig);
  if (env.era === 'past') sepiaWash(c, env.w, env.h);
}

export function sepiaWash(c, w, h) {
  c.save();
  c.globalCompositeOperation = 'color';
  c.fillStyle = 'rgba(150, 110, 60, 0.85)';
  c.fillRect(-40, -40, w + 80, h + 80);
  c.globalCompositeOperation = 'soft-light';
  c.fillStyle = 'rgba(255, 210, 150, 0.35)';
  c.fillRect(-40, -40, w + 80, h + 80);
  c.restore();
}

// ---------------------------------------------------------------------------
// TL "desk" — the lost-property desk.

export function drawDesk(ctx) {
  const { w, h } = ctx;
  const floorY = FLOOR * h;
  ctx.paint('act1-desk', (c, env) => {
    backWall(c, w, h, floorY, { seed: 3 });
    ceiling(c, w);
    wainscot(c, w, h, h * 0.5, floorY, { seed: 5 });
    // shelf with parcels and ledgers
    const shelfY = h * 0.3;
    wood(c, w * 0.03, shelfY, w * 0.42, 8, { base: '#4a3121', seed: 8 });
    inkRect(c, w * 0.03, shelfY, w * 0.42, 8, { w: 1.6 });
    [[0.07], [0.37]].forEach(([u]) => ink(c, [[w * u, shelfY + 8], [w * u + 8, shelfY + 22], [w * u + 14, shelfY + 8]], { w: 1.6 }));
    parcel(c, w * 0.05, shelfY - 36, 54, 36, { seed: 2, tone: '#8b6a44' });
    parcel(c, w * 0.06, shelfY - 58, 40, 22, { seed: 3, tone: '#7a5a3a' });
    parcel(c, w * 0.14, shelfY - 28, 38, 28, { seed: 4, tone: '#94744c' });
    [['#5b2620', 12], ['#23434a', 10], ['#3a2b50', 14], ['#6b4a26', 11], ['#18233a', 13], ['#5b2620', 9]].forEach(([tone, bw], i) => {
      const bx = w * 0.24 + i * 15;
      const bh = 44 + (i % 3) * 6;
      c.fillStyle = tone;
      c.fillRect(bx, shelfY - bh, bw, bh);
      c.fillStyle = 'rgba(224, 162, 74, 0.55)';
      c.fillRect(bx + 2, shelfY - bh + 8, bw - 4, 2);
      c.fillRect(bx + 2, shelfY - 12, bw - 4, 2);
      inkRect(c, bx, shelfY - bh, bw, bh, { w: 1.2, alpha: 0.75 });
    });
    // leaning ledger at the end
    c.save(); c.translate(w * 0.38 + 4, shelfY); c.rotate(0.28);
    c.fillStyle = '#4a2a1c'; c.fillRect(0, -48, 14, 48); inkRect(c, 0, -48, 14, 48, { w: 1.2 });
    c.restore();
    // wall clock and route map
    wallClock(c, w * 0.83, h * 0.22, 30);
    ink(c, [[w * 0.83, h * 0.22], [w * 0.83 - 12, h * 0.22 - 14]], { w: 2.2, color: '#2a1d14', bleed: false });
    ink(c, [[w * 0.83, h * 0.22], [w * 0.83 + 3, h * 0.22 - 22]], { w: 1.6, color: '#2a1d14', bleed: false });
    routeMap(c, w * 0.53, h * 0.12, w * 0.2, h * 0.24);
    hangingLamp(c, w * 0.62, 20, h * 0.42 - 18, { r: 18 });
    // stacked parcels on the floor, left of the desk
    parcel(c, w * -0.01, floorY - 42, 48, 42, { seed: 11, tone: '#7c5b3a' });
    parcel(c, w * 0.005, floorY - 70, 38, 28, { seed: 12, tone: '#94744c' });
    parcel(c, w * 0.015, floorY - 88, 28, 18, { seed: 13, tone: '#6d4f33' });
    // floor + runner running out of the right edge
    floorboards(c, w, h, floorY, { seed: 6, runner: [w * 0.5, w + 40] });
    // the desk itself
    const dx = w * 0.07;
    const dw = w * 0.4;
    const top = h * 0.555;
    wood(c, dx, top + 10, dw, floorY - top - 10, { base: '#3f2819', seed: 14, vertical: true });
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(dx, top + 10, dw, floorY - top - 10);
    [0, 1, 2].forEach((i) => {
      const rowH = (floorY - top - 22) / 3;
      [[dx + 10, dw * 0.3], [dx + dw - 10 - dw * 0.3, dw * 0.3]].forEach(([x, dwd]) => {
        const y = top + 16 + i * rowH;
        c.fillStyle = 'rgba(255, 210, 150, 0.05)';
        c.fillRect(x, y, dwd, rowH - 6);
        inkRect(c, x, y, dwd, rowH - 6, { w: 1.3, alpha: 0.7 });
        c.fillStyle = PAL.brassLight;
        c.fillRect(x + dwd / 2 - 6, y + rowH / 2 - 4, 12, 3);
      });
    });
    inkRect(c, dx + dw * 0.36, top + 16, dw * 0.28, floorY - top - 26, { w: 1.2, alpha: 0.45 });
    // desk top slab with brass lip
    wood(c, dx - 10, top, dw + 20, 12, { base: '#5a3a22', seed: 15 });
    c.fillStyle = brassFill(c, dx - 10, top + 10, dw + 20, 3);
    c.fillRect(dx - 10, top + 10, dw + 20, 3);
    ink(c, [[dx - 10, top], [dx + dw + 10, top], [dx + dw + 10, top + 13], [dx - 10, top + 13]], { w: 2.2, closed: true });
    ink(c, [[dx, top + 13], [dx, floorY]], { w: 2.2 });
    ink(c, [[dx + dw, top + 13], [dx + dw, floorY]], { w: 2.2 });
    // open ledger with warm light pool
    const lx = w * 0.19;
    const ly = top - 4;
    c.fillStyle = '#e9dfc4';
    c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + 52, ly - 3); c.lineTo(lx + 56, ly + 3); c.lineTo(lx - 4, ly + 4); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(lx + 52, ly - 3); c.lineTo(lx + 104, ly); c.lineTo(lx + 110, ly + 4); c.lineTo(lx + 56, ly + 3); c.closePath(); c.fill();
    ink(c, [[lx - 4, ly + 4], [lx, ly], [lx + 52, ly - 3], [lx + 104, ly], [lx + 110, ly + 4]], { w: 1.4 });
    c.fillStyle = PAL.oxblood;
    c.fillRect(lx - 6, ly + 3, 118, 3);
    // ink pot, pen, claim spike
    c.fillStyle = '#10141c'; c.fillRect(w * 0.36, top - 12, 12, 12); inkRect(c, w * 0.36, top - 12, 12, 12, { w: 1.2 });
    ink(c, [[w * 0.365, top - 12], [w * 0.39, top - 30]], { w: 1.4, color: PAL.ivory });
    ink(c, [[w * 0.43, top], [w * 0.43, top - 34]], { w: 1.4 });
    [0, 1, 2, 3].forEach((i) => {
      c.save(); c.translate(w * 0.43, top - 8 - i * 6); c.rotate(-0.25 + i * 0.18);
      c.fillStyle = i % 2 ? '#e3d6b6' : '#d4c49e'; c.fillRect(-9, -3, 18, 6);
      c.restore();
    });
    // banker's lamp
    const bx = w * 0.13;
    c.fillStyle = brassFill(c, bx - 14, top - 5, 28, 5);
    c.fillRect(bx - 14, top - 5, 28, 5);
    ink(c, [[bx, top - 5], [bx, top - 34]], { w: 2.2, color: PAL.brassLight });
    c.fillStyle = vgrad(c, top - 50, top - 32, [[0, '#2f5a44'], [1, '#18302a']]);
    c.beginPath(); c.moveTo(bx - 28, top - 32); c.quadraticCurveTo(bx, top - 58, bx + 28, top - 32); c.closePath(); c.fill();
    ink(c, [[bx - 28, top - 32], [bx - 16, top - 46], [bx, top - 50], [bx + 16, top - 46], [bx + 28, top - 32], [bx - 28, top - 32]], { w: 1.6 });
    c.fillStyle = '#ffe8b0';
    c.fillRect(bx - 22, top - 33, 44, 2.5);
    lightCone(c, bx + 8, top - 32, 60, 40, 0.28);
    glow(c, lx + 50, ly + 2, 80, 'rgba(255, 200, 120, 0.9)', 0.28);
    // stool
    const sx = w * 0.53;
    const sy = floorY - 26;
    c.fillStyle = '#4a3121';
    c.beginPath(); c.ellipse(sx, sy, 18, 4.5, 0, 0, Math.PI * 2); c.fill();
    ink(c, [[sx - 13, sy + 2], [sx - 16, floorY]], { w: 2 });
    ink(c, [[sx + 13, sy + 2], [sx + 16, floorY]], { w: 2 });
    ink(c, [[sx, sy + 3], [sx, floorY - 1]], { w: 1.6, alpha: 0.7 });
    inkEllipse(c, sx, sy, 18, 4.5, { w: 1.8 });
    finish(c, env);
  });
  const top = h * 0.555;
  ctx.glow(w * 0.13, top - 32, 120, { color: 0xffc070, alpha: 0.32, flicker: 0.08 });
  ctx.glow(w * 0.62, h * 0.42, 150, { color: 0xffc98a, alpha: 0.2, flicker: 0.05 });
  ctx.dust(w * 0.45, h * 0.3, w * 0.35, h * 0.45, { count: 16 });
}

// ---------------------------------------------------------------------------
// TR "lockers" — the pigeonhole wall.

export const LOCKER_GRID = Object.freeze({ cols: 6, rows: 5, x: 0.07, y: 0.06, w: 0.86, h: 0.8 });
export const TAGGED_CUBBY = Object.freeze({ col: 4, row: 2 });

export function cubbyRect(w, h, col, row) {
  const g = LOCKER_GRID;
  const frame = 14;
  const div = 8;
  const cw = (g.w * w - frame * 2 - div * (g.cols - 1)) / g.cols;
  const ch = (g.h * h - frame * 2 - div * (g.rows - 1)) / g.rows;
  return { x: g.x * w + frame + col * (cw + div), y: g.y * h + frame + row * (ch + div), w: cw, h: ch };
}

/** Tile-normalised zoom rect around the tagged cubby (square in normalised units = panel aspect). */
export function taggedCubbyZoomRect() {
  // computed for a 756×420 panel; normalised, so it holds for any 1.8:1 panel
  const r = cubbyRect(756, 420, TAGGED_CUBBY.col, TAGGED_CUBBY.row);
  const cx = (r.x + r.w / 2) / 756;
  const cy = (r.y + r.h / 2) / 420;
  const size = 0.19;
  return [cx - size / 2, cy - size / 2, size, size];
}

const CUBBY_CONTENTS = ['letters', 'hat', 'empty', 'scarf', 'case', 'gloves', 'umbrella', 'letters', 'maps', 'empty', 'lantern', 'bottle', 'case', 'cage', 'letters', 'empty', 'tagged', 'hat', 'gloves', 'maps', 'scarf', 'letters', 'bottle', 'empty', 'case', 'letters', 'umbrella', 'empty', 'maps', 'scarf'];

function cubbyItem(c, kind, r, seed) {
  const random = rng(seed);
  const bx = r.x + r.w * 0.5;
  const by = r.y + r.h - 3;
  switch (kind) {
    case 'letters':
      [0, 1, 2].forEach((i) => {
        c.fillStyle = i % 2 ? '#d8ccb0' : '#c9b893';
        c.fillRect(r.x + 10 + i * 3, by - 10 - i * 5, r.w * 0.55, 6);
      });
      ink(c, [[r.x + 10, by - 22], [r.x + 10 + r.w * 0.6, by - 22]], { w: 1, alpha: 0.6 });
      c.strokeStyle = PAL.oxblood; c.lineWidth = 1.2; c.beginPath(); c.moveTo(r.x + 26, by - 24); c.lineTo(r.x + 26, by - 4); c.stroke();
      break;
    case 'hat':
      c.fillStyle = '#1e1a1a';
      c.beginPath(); c.ellipse(bx, by - 3, 22, 4, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(bx, by - 12, 13, 11, 0, Math.PI, 0); c.fill();
      c.fillStyle = PAL.oxblood; c.fillRect(bx - 13, by - 9, 26, 3);
      inkEllipse(c, bx, by - 3, 22, 4, { w: 1.1, alpha: 0.7 });
      break;
    case 'scarf':
      c.fillStyle = '#6b2a22';
      c.beginPath(); c.moveTo(r.x + 8, by); c.quadraticCurveTo(bx, by - 26, r.x + r.w - 10, by - 4); c.lineTo(r.x + r.w - 12, by); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(216,204,176,0.5)'; c.lineWidth = 1.5;
      for (let i = 0; i < 4; i += 1) { c.beginPath(); c.moveTo(r.x + 16 + i * 14, by); c.lineTo(r.x + 22 + i * 14, by - 14); c.stroke(); }
      break;
    case 'case':
      c.fillStyle = '#6d4a2c';
      c.fillRect(r.x + 12, by - 26, r.w - 24, 26);
      c.fillStyle = PAL.brass; c.fillRect(bx - 5, by - 30, 10, 4);
      c.fillRect(r.x + 16, by - 26, 4, 26); c.fillRect(r.x + r.w - 20, by - 26, 4, 26);
      inkRect(c, r.x + 12, by - 26, r.w - 24, 26, { w: 1.2, alpha: 0.8 });
      break;
    case 'gloves':
      c.fillStyle = '#4a3326';
      [0, 1].forEach((i) => { c.beginPath(); c.ellipse(bx - 12 + i * 18, by - 6, 11, 6, 0.3 - i * 0.6, 0, Math.PI * 2); c.fill(); });
      break;
    case 'umbrella':
      ink(c, [[r.x + 12, by], [r.x + r.w - 16, by - r.h + 12]], { w: 3, color: '#1a1a22', bleed: false });
      ink(c, [[r.x + r.w - 16, by - r.h + 12], [r.x + r.w - 8, by - r.h + 8], [r.x + r.w - 6, by - r.h + 16]], { w: 2.2, color: PAL.brass, bleed: false });
      break;
    case 'maps':
      [0, 1, 2].forEach((i) => {
        c.fillStyle = i === 1 ? '#c9b893' : '#b8a57e';
        c.beginPath(); c.ellipse(r.x + 18 + i * 20, by - 7, 6, 6, 0, 0, Math.PI * 2); c.fill();
        c.fillRect(r.x + 18 + i * 20 - 6, by - 13, 1, 1);
        inkEllipse(c, r.x + 18 + i * 20, by - 7, 6, 6, { w: 1, alpha: 0.6 });
      });
      break;
    case 'lantern':
      c.fillStyle = PAL.brassDark; c.fillRect(bx - 7, by - 24, 14, 24);
      c.fillStyle = 'rgba(255, 215, 140, 0.35)'; c.fillRect(bx - 5, by - 20, 10, 15);
      inkRect(c, bx - 7, by - 24, 14, 24, { w: 1, alpha: 0.7 });
      break;
    case 'bottle':
      c.fillStyle = 'rgba(60, 110, 90, 0.8)';
      c.fillRect(bx - 5, by - 22, 10, 22); c.fillRect(bx - 2, by - 30, 4, 8);
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(bx - 3, by - 20, 2, 16);
      break;
    case 'cage':
      c.strokeStyle = PAL.brass; c.lineWidth = 1;
      for (let i = 0; i < 6; i += 1) { c.beginPath(); c.moveTo(bx - 14 + i * 5.6, by); c.lineTo(bx - 14 + i * 5.6, by - 22); c.stroke(); }
      c.beginPath(); c.arc(bx, by - 22, 14, Math.PI, 0); c.stroke();
      break;
    case 'tagged':
      // A tied bundle with the corner of a claim envelope showing.
      c.fillStyle = '#d8ccb0';
      c.save(); c.translate(r.x + r.w * 0.32, by - 4); c.rotate(-0.12);
      c.fillRect(0, -24, r.w * 0.44, 24);
      c.fillStyle = PAL.oxblood; c.fillRect(r.w * 0.3, -18, 9, 9);
      c.restore();
      break;
    default:
      break;
  }
  void random;
}

export function drawLockers(ctx) {
  const { w, h } = ctx;
  ctx.paint('act1-lockers', (c, env) => {
    backWall(c, w, h, h, { seed: 12, tone: ['#10181c', '#182a2e'] });
    const g = LOCKER_GRID;
    const cx = g.x * w;
    const cy = g.y * h;
    const cw = g.w * w;
    const ch = g.h * h;
    // cabinet body
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)';
    c.shadowBlur = 24;
    c.fillStyle = '#2d1d12';
    c.fillRect(cx, cy, cw, ch);
    c.restore();
    wood(c, cx, cy, cw, ch, { base: '#4a3020', seed: 31, vertical: false });
    for (let row = 0; row < g.rows; row += 1) {
      for (let col = 0; col < g.cols; col += 1) {
        const r = cubbyRect(w, h, col, row);
        const kind = CUBBY_CONTENTS[row * g.cols + col];
        // recess: dark back, lit top-left edges
        c.fillStyle = vgrad(c, r.y, r.y + r.h, [[0, '#0a0706'], [1, '#1c120c']]);
        c.fillRect(r.x, r.y, r.w, r.h);
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(r.x, r.y, r.w, 7);
        c.fillRect(r.x, r.y, 5, r.h);
        c.fillStyle = 'rgba(255, 200, 140, 0.06)';
        c.fillRect(r.x + r.w - 5, r.y, 5, r.h);
        cubbyItem(c, kind, r, row * 17 + col * 3 + 1);
        ink(c, [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]], { w: 1.6, closed: true, alpha: 0.75 });
        // brass number plate under each hole
        c.fillStyle = brassFill(c, r.x + r.w / 2 - 9, r.y + r.h + 1, 18, 5);
        c.fillRect(r.x + r.w / 2 - 9, r.y + r.h + 1, 18, 5);
      }
    }
    ink(c, [[cx, cy], [cx + cw, cy], [cx + cw, cy + ch], [cx, cy + ch]], { w: 2.6, closed: true });
    // cornice and base
    wood(c, cx - 12, cy - 12, cw + 24, 14, { base: '#5a3a22', seed: 33 });
    inkRect(c, cx - 12, cy - 12, cw + 24, 14, { w: 2 });
    wood(c, cx - 8, cy + ch, cw + 16, h - (cy + ch) + 20, { base: '#2c1c11', seed: 35 });
    inkLine(c, cx - 8, cy + ch + 1, cx + cw + 8, cy + ch + 1, { w: 2 });
    // a rolling library ladder rail across the top
    c.fillStyle = brassFill(c, cx, cy + 4, cw, 4);
    c.fillRect(cx - 4, cy - 20, cw + 8, 3);
    glow(c, w * 0.5, -40, 360, 'rgba(255, 190, 110, 0.9)', 0.16);
    finish(c, env, { vig: 0.5 });
  });
  ctx.glow(w * 0.5, 0, 260, { color: 0xffb870, alpha: 0.14, flicker: 0.04 });
  ctx.dust(w * 0.1, h * 0.05, w * 0.8, h * 0.6, { count: 12 });
}

// ---------------------------------------------------------------------------
// TR zoomed: the tagged pigeonhole, the claim envelope and the ticket.

export function drawCubby(ctx) {
  const { w, h } = ctx;
  const floorY = h * 0.74;
  const chuteX = CHUTE_AT * w;
  ctx.paint('act1-cubby', (c, env) => {
    // interior box in one-point perspective
    const back = { x: w * 0.16, y: h * 0.14, w: w * 0.68, h: h * 0.5 };
    wood(c, -30, -30, w + 60, h + 60, { base: '#3a2517', seed: 41 });
    // ceiling of the hole
    c.fillStyle = '#120b07';
    c.beginPath(); c.moveTo(-20, -20); c.lineTo(w + 20, -20); c.lineTo(back.x + back.w, back.y); c.lineTo(back.x, back.y); c.closePath(); c.fill();
    // side walls
    c.fillStyle = hgrad(c, 0, back.x, [[0, '#2a1a10'], [1, '#170e08']]);
    c.beginPath(); c.moveTo(-20, -20); c.lineTo(back.x, back.y); c.lineTo(back.x, back.y + back.h); c.lineTo(-20, h + 20); c.closePath(); c.fill();
    c.fillStyle = hgrad(c, back.x + back.w, w, [[0, '#1c120b'], [1, '#3b271a']]);
    c.beginPath(); c.moveTo(w + 20, -20); c.lineTo(back.x + back.w, back.y); c.lineTo(back.x + back.w, back.y + back.h); c.lineTo(w + 20, h + 20); c.closePath(); c.fill();
    // back panel, grain
    wood(c, back.x, back.y, back.w, back.h, { base: '#2a1b11', seed: 42, vertical: true, planks: 4 });
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(back.x, back.y, back.w, back.h);
    // floor of the hole
    c.fillStyle = vgrad(c, back.y + back.h, h, [[0, '#2d1d12'], [1, '#553722']]);
    c.beginPath(); c.moveTo(back.x, back.y + back.h); c.lineTo(back.x + back.w, back.y + back.h); c.lineTo(w + 20, h + 20); c.lineTo(-20, h + 20); c.closePath(); c.fill();
    ink(c, [[back.x, back.y], [back.x + back.w, back.y], [back.x + back.w, back.y + back.h], [back.x, back.y + back.h]], { w: 2.2, closed: true, alpha: 0.8 });
    ink(c, [[-6, -6], [back.x, back.y]], { w: 2, alpha: 0.7 });
    ink(c, [[w + 6, -6], [back.x + back.w, back.y]], { w: 2, alpha: 0.7 });
    ink(c, [[-6, h + 6], [back.x, back.y + back.h]], { w: 2, alpha: 0.7 });
    ink(c, [[w + 6, h + 6], [back.x + back.w, back.y + back.h]], { w: 2, alpha: 0.7 });
    // warm spill from the carriage lamp, top-left
    glow(c, w * 0.2, h * 0.1, w * 0.6, 'rgba(255, 190, 110, 0.9)', 0.18);
    // the chute: a brass funnel in the floor, pipe dropping out of the bottom edge
    const pipeW = 34;
    c.fillStyle = brassFill(c, chuteX - pipeW / 2, floorY, pipeW, h - floorY + 20, true);
    c.fillRect(chuteX - pipeW / 2, floorY + 8, pipeW, h - floorY + 20);
    [floorY + 34, h - 18].forEach((y) => {
      c.fillStyle = brassFill(c, chuteX - pipeW / 2 - 5, y, pipeW + 10, 8);
      c.fillRect(chuteX - pipeW / 2 - 5, y, pipeW + 10, 8);
      rivet(c, chuteX - pipeW / 2 - 1, y + 4, 2.2);
      rivet(c, chuteX + pipeW / 2 + 1, y + 4, 2.2);
    });
    ink(c, [[chuteX - pipeW / 2, floorY + 8], [chuteX - pipeW / 2, h + 6]], { w: 2.2 });
    ink(c, [[chuteX + pipeW / 2, floorY + 8], [chuteX + pipeW / 2, h + 6]], { w: 2.2 });
    // funnel mouth
    c.fillStyle = brassFill(c, chuteX - 46, floorY - 6, 92, 16);
    c.beginPath(); c.ellipse(chuteX, floorY + 2, 46, 11, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0b0705';
    c.beginPath(); c.ellipse(chuteX, floorY + 2, 30, 6.5, 0, 0, Math.PI * 2); c.fill();
    inkEllipse(c, chuteX, floorY + 2, 46, 11, { w: 2 });
    inkEllipse(c, chuteX, floorY + 2, 30, 6.5, { w: 1.4, alpha: 0.7 });
    // the claim envelope leaning on the back wall
    c.save();
    c.translate(w * 0.24, floorY - 4);
    c.rotate(-0.1);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 16; c.shadowOffsetX = 8;
    c.fillStyle = '#ddd0b0';
    c.fillRect(0, -150, 230, 150);
    c.shadowColor = 'transparent';
    c.fillStyle = 'rgba(120, 90, 50, 0.18)';
    c.beginPath(); c.moveTo(0, -150); c.lineTo(115, -80); c.lineTo(230, -150); c.closePath(); c.fill();
    ink(c, [[0, -150], [115, -80], [230, -150]], { w: 1.6, alpha: 0.6, color: '#6a5238' });
    // red depot stamp + string-and-button closure
    c.strokeStyle = 'rgba(140, 40, 30, 0.8)'; c.lineWidth = 3;
    c.strokeRect(24, -56, 76, 36);
    c.fillStyle = 'rgba(140, 40, 30, 0.8)';
    c.font = '700 20px "Space Mono", monospace';
    c.fillText('0412', 30, -31);
    c.fillStyle = '#8a6a40'; c.beginPath(); c.arc(115, -80, 7, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(234,223,198,0.7)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(115, -80); c.bezierCurveTo(140, -60, 150, -100, 170, -70); c.stroke();
    c.strokeStyle = 'rgba(60, 45, 30, 0.45)'; c.lineWidth = 1.2;
    [-120, -110, -100].forEach((y, i) => { c.beginPath(); c.moveTo(140, y + 60); c.lineTo(210 - i * 12, y + 60); c.stroke(); });
    ink(c, [[0, -150], [230, -150], [230, 0], [0, 0]], { w: 2.2, closed: true });
    c.restore();
    speckle(c, 0, 0, w, h, { count: 500, color: 'rgba(255, 220, 170, 0.035)', seed: 45 });
    finish(c, env, { vig: 0.55 });
  });
  // the ticket rests on the funnel lip until it drops
  const ticket = ctx.sprite('act1-ticket', 60, 30, (c) => {
    c.fillStyle = '#e8c27a';
    c.fillRect(2, 2, 56, 26);
    c.fillStyle = 'rgba(107, 42, 34, 0.9)';
    c.fillRect(2, 2, 10, 26);
    c.strokeStyle = 'rgba(60, 40, 20, 0.6)'; c.lineWidth = 1;
    [9, 15, 21].forEach((y) => { c.beginPath(); c.moveTo(18, y); c.lineTo(50, y); c.stroke(); });
    ink(c, [[2, 2], [58, 2], [58, 28], [2, 28]], { w: 1.6, closed: true, bleed: false });
  }, chuteX + 6, floorY - 12, { angle: -0.22 });
  ctx.animate(() => { ticket.setVisible(!ctx.flag('ticketDropped')); });
  ctx.glow(w * 0.2, h * 0.1, 240, { color: 0xffc070, alpha: 0.12, flicker: 0.05 });
  ctx.dust(w * 0.15, h * 0.1, w * 0.7, h * 0.6, { count: 10, size: 2.2 });
}

// ---------------------------------------------------------------------------
// BL "window" — the carriage window with the night fields drifting past.

export function windowGlass(w, h) {
  return { x: w * 0.12, y: h * 0.1, w: w * 0.76, h: h * 0.55 };
}

export function drawWindow(ctx) {
  const { w, h } = ctx;
  const glass = windowGlass(w, h);
  // painted night fields behind the glass (live, drifting)
  ctx.fields(glass.x, glass.y, glass.w, glass.h, { speed: 18 });
  ctx.paint('act1-window', (c, env) => {
    // wall with a window-shaped hole (glass is transparent here)
    c.save();
    backWall(c, w, h, h, { seed: 51, tone: ['#16262b', '#1d3237'] });
    wainscot(c, w, h, h * 0.8, h + 20, { seed: 52 });
    c.globalCompositeOperation = 'destination-out';
    roundRectPath(c, glass.x, glass.y, glass.w, glass.h, 26);
    c.fill();
    c.restore();
    // glass: cool reflection streaks + condensation
    c.save();
    roundRectPath(c, glass.x, glass.y, glass.w, glass.h, 26);
    c.clip();
    c.fillStyle = 'rgba(40, 70, 90, 0.12)';
    c.fillRect(glass.x, glass.y, glass.w, glass.h);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(200, 220, 255, 0.05)';
    c.beginPath(); c.moveTo(glass.x + glass.w * 0.1, glass.y); c.lineTo(glass.x + glass.w * 0.28, glass.y); c.lineTo(glass.x + glass.w * 0.08, glass.y + glass.h); c.lineTo(glass.x - glass.w * 0.1, glass.y + glass.h); c.closePath(); c.fill();
    c.fillStyle = 'rgba(200, 220, 255, 0.035)';
    c.beginPath(); c.moveTo(glass.x + glass.w * 0.36, glass.y); c.lineTo(glass.x + glass.w * 0.42, glass.y); c.lineTo(glass.x + glass.w * 0.22, glass.y + glass.h); c.lineTo(glass.x + glass.w * 0.16, glass.y + glass.h); c.closePath(); c.fill();
    c.restore();
    // brass window frame with sash bar and rivets
    c.save();
    c.lineWidth = 14;
    c.strokeStyle = brassFill(c, glass.x - 7, glass.y - 7, glass.w + 14, glass.h + 14);
    roundRectPath(c, glass.x - 4, glass.y - 4, glass.w + 8, glass.h + 8, 28);
    c.stroke();
    c.restore();
    c.fillStyle = brassFill(c, glass.x, glass.y + glass.h * 0.34, glass.w, 7);
    c.fillRect(glass.x, glass.y + glass.h * 0.34, glass.w, 7);
    ink(c, [[glass.x, glass.y + glass.h * 0.34], [glass.x + glass.w, glass.y + glass.h * 0.34]], { w: 1.2, alpha: 0.6 });
    for (let i = 0; i <= 10; i += 1) {
      rivet(c, glass.x - 4 + (glass.w + 8) * (i / 10), glass.y - 5, 2.4);
      rivet(c, glass.x - 4 + (glass.w + 8) * (i / 10), glass.y + glass.h + 5, 2.4);
    }
    c.save();
    roundRectPath(c, glass.x - 11, glass.y - 11, glass.w + 22, glass.h + 22, 32);
    c.lineWidth = 1.8;
    c.strokeStyle = PAL.ink;
    c.globalAlpha = 0.8;
    c.stroke();
    roundRectPath(c, glass.x + 2, glass.y + 2, glass.w - 4, glass.h - 4, 24);
    c.stroke();
    c.restore();
    // curtains, tied back
    [[glass.x - 26, 1], [glass.x + glass.w + 26, -1]].forEach(([x, dir]) => {
      c.fillStyle = vgrad(c, glass.y - 20, glass.y + glass.h + 30, [[0, '#7a3226'], [1, '#3e1813']]);
      c.beginPath();
      c.moveTo(x - 20 * dir, glass.y - 24);
      c.lineTo(x + 34 * dir, glass.y - 24);
      c.quadraticCurveTo(x + 10 * dir, glass.y + glass.h * 0.5, x + 26 * dir, glass.y + glass.h * 0.62);
      c.quadraticCurveTo(x + 4 * dir, glass.y + glass.h * 0.8, x + 10 * dir, glass.y + glass.h + 34);
      c.lineTo(x - 22 * dir, glass.y + glass.h + 34);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2;
      [0, 1, 2].forEach((k) => { c.beginPath(); c.moveTo(x - 8 * dir + k * 9 * dir, glass.y - 20); c.quadraticCurveTo(x + k * 6 * dir, glass.y + glass.h * 0.4, x + 14 * dir, glass.y + glass.h * 0.6); c.stroke(); });
      ink(c, [[x - 20 * dir, glass.y - 24], [x - 22 * dir, glass.y + glass.h + 34]], { w: 1.6, alpha: 0.7 });
      ink(c, [[x + 34 * dir, glass.y - 24], [x + 10 * dir, glass.y + glass.h * 0.5], [x + 26 * dir, glass.y + glass.h * 0.62], [x + 10 * dir, glass.y + glass.h + 34]], { w: 1.6, alpha: 0.75 });
      c.fillStyle = PAL.amber;
      c.fillRect(x + 6 * dir - 12, glass.y + glass.h * 0.6, 24, 5);
    });
    // curtain rod
    c.fillStyle = brassFill(c, glass.x - 60, glass.y - 30, glass.w + 120, 6);
    c.fillRect(glass.x - 60, glass.y - 30, glass.w + 120, 6);
    rivet(c, glass.x - 62, glass.y - 27, 5);
    rivet(c, glass.x + glass.w + 62, glass.y - 27, 5);
    // window table with a tea glass in a holder and a folded timetable
    const ty = h * 0.74;
    wood(c, glass.x + glass.w * 0.12, ty, glass.w * 0.76, 12, { base: '#5a3a22', seed: 55 });
    inkRect(c, glass.x + glass.w * 0.12, ty, glass.w * 0.76, 12, { w: 2 });
    ink(c, [[w * 0.5, ty + 12], [w * 0.5, ty + 40], [w * 0.44, ty + 56]], { w: 2 });
    c.fillStyle = 'rgba(255, 220, 160, 0.35)';
    c.fillRect(w * 0.6, ty - 26, 16, 24);
    c.fillStyle = 'rgba(120, 50, 20, 0.7)';
    c.fillRect(w * 0.6 + 1, ty - 16, 14, 13);
    c.fillStyle = brassFill(c, w * 0.6 - 3, ty - 14, 22, 14);
    c.fillRect(w * 0.6 - 3, ty - 14, 22, 12);
    ink(c, [[w * 0.6 - 3, ty - 14], [w * 0.6 - 3, ty - 2], [w * 0.6 + 19, ty - 2], [w * 0.6 + 19, ty - 14]], { w: 1.2 });
    ink(c, [[w * 0.6 + 19, ty - 12], [w * 0.6 + 26, ty - 10], [w * 0.6 + 19, ty - 5]], { w: 1.2 });
    c.save(); c.translate(w * 0.36, ty - 3); c.rotate(-0.06);
    c.fillStyle = '#d8ccb0'; c.fillRect(0, -6, 64, 6);
    c.fillStyle = 'rgba(40,30,20,0.5)'; c.fillRect(6, -4, 40, 1.4);
    c.restore();
    // a low floor strip (sits lower than the corridor floor)
    ink(c, [[-4, h * 0.93], [w + 4, h * 0.93]], { w: 2.4, alpha: 0.8 });
    finish(c, env, { vig: 0.5 });
  });
  ctx.rain(glass.x, glass.y, glass.w, glass.h, { count: 34 });
  ctx.glow(w * 0.6, h * 0.7, 90, { color: 0xffc070, alpha: 0.12, flicker: 0.05 });
}

// ---------------------------------------------------------------------------
// BR "door" — the door to the Conductor's car, its ticket slot and chute.

export const DOOR = Object.freeze({ x: 0.56, w: 0.28, top: 0.14 });
export const SLOT_Y = 0.44;

export function drawDoor(ctx, variant = 'locked') {
  const { w, h } = ctx;
  const floorY = FLOOR * h;
  const dx = DOOR.x * w;
  const dw = DOOR.w * w;
  const dTop = DOOR.top * h;
  const chuteX = CHUTE_AT * w;
  const slotY = SLOT_Y * h;
  ctx.paint(`act1-door-${variant}`, (c, env) => {
    backWall(c, w, h, floorY, { seed: 61 });
    wainscot(c, w, h, h * 0.5, floorY, { seed: 62, x1: dx - 12 });
    // wall sconce and a fire bucket
    const sx = w * 0.26;
    c.fillStyle = brassFill(c, sx - 8, h * 0.2, 16, 30);
    c.fillRect(sx - 3, h * 0.22, 6, 26);
    c.fillStyle = '#ffe1a0';
    c.beginPath(); c.moveTo(sx - 14, h * 0.2); c.lineTo(sx + 14, h * 0.2); c.lineTo(sx + 9, h * 0.13); c.lineTo(sx - 9, h * 0.13); c.closePath(); c.fill();
    ink(c, [[sx - 14, h * 0.2], [sx + 14, h * 0.2], [sx + 9, h * 0.13], [sx - 9, h * 0.13]], { w: 1.6, closed: true });
    glow(c, sx, h * 0.17, 120, 'rgba(255, 190, 110, 0.9)', 0.28);
    const bx = w * 0.1;
    c.fillStyle = vgrad(c, h * 0.3, h * 0.42, [[0, '#8a3326'], [1, '#4a1a14']]);
    c.beginPath(); c.moveTo(bx - 16, h * 0.3); c.lineTo(bx + 16, h * 0.3); c.lineTo(bx + 12, h * 0.42); c.lineTo(bx - 12, h * 0.42); c.closePath(); c.fill();
    ink(c, [[bx - 16, h * 0.3], [bx + 16, h * 0.3], [bx + 12, h * 0.42], [bx - 12, h * 0.42]], { w: 1.6, closed: true });
    ink(c, [[bx - 16, h * 0.3], [bx, h * 0.25], [bx + 16, h * 0.3]], { w: 1.2, alpha: 0.7 });
    // bulkhead around the door: a heavier walnut frame
    wood(c, dx - 26, dTop - 30, dw + 52, floorY - dTop + 30, { base: '#2a1a10', seed: 63, vertical: true });
    inkRect(c, dx - 26, dTop - 30, dw + 52, floorY - dTop + 30, { w: 2.2 });
    for (let i = 0; i < 6; i += 1) {
      rivet(c, dx - 16, dTop - 18 + i * ((floorY - dTop) / 5.2), 2.6);
      rivet(c, dx + dw + 16, dTop - 18 + i * ((floorY - dTop) / 5.2), 2.6);
    }
    if (variant === 'open') {
      // doorway into the Conductor's car: warm lamplight, a tall silhouette
      c.fillStyle = vgrad(c, dTop, floorY, [[0, '#5a3218'], [0.55, '#b4722e'], [1, '#6a3a18']]);
      c.fillRect(dx, dTop, dw, floorY - dTop);
      glow(c, dx + dw * 0.55, dTop + (floorY - dTop) * 0.4, dw * 1.1, 'rgba(255, 200, 120, 0.9)', 0.5);
      c.fillStyle = 'rgba(20, 12, 8, 0.85)';
      const fx = dx + dw * 0.64;
      c.beginPath(); c.ellipse(fx, dTop + 56, 7, 8, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(fx - 12, dTop + 66); c.lineTo(fx + 12, dTop + 66); c.lineTo(fx + 15, floorY - 30); c.lineTo(fx - 15, floorY - 30); c.closePath(); c.fill();
      c.fillRect(fx - 20, dTop + 44, 40, 5);
      glow(c, fx + 20, floorY - 60, 40, 'rgba(255, 220, 140, 0.95)', 0.9);
      // door leaf swung inward, seen edge-on
      c.fillStyle = '#3e2718';
      c.beginPath(); c.moveTo(dx, dTop); c.lineTo(dx + 22, dTop + 12); c.lineTo(dx + 22, floorY - 8); c.lineTo(dx, floorY); c.closePath(); c.fill();
      ink(c, [[dx, dTop], [dx + 22, dTop + 12], [dx + 22, floorY - 8], [dx, floorY]], { w: 2, closed: true });
      // spill of light on the floor outside
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = 'rgba(255, 180, 90, 0.18)';
      c.beginPath(); c.moveTo(dx, floorY); c.lineTo(dx + dw, floorY); c.lineTo(dx + dw + 60, h); c.lineTo(dx - 90, h); c.closePath(); c.fill();
      c.restore();
    } else {
      // the closed door leaf
      wood(c, dx, dTop, dw, floorY - dTop, { base: '#4a2f1c', seed: 64, vertical: true });
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(dx, dTop, dw, floorY - dTop);
      inkRect(c, dx + 14, dTop + (floorY - dTop) * 0.56, dw - 28, (floorY - dTop) * 0.36, { w: 1.4, alpha: 0.6 });
      // porthole with the warm car beyond
      const px = dx + dw / 2;
      const py = dTop + 52;
      c.fillStyle = brassFill(c, px - 32, py - 32, 64, 64);
      c.beginPath(); c.arc(px, py, 31, 0, Math.PI * 2); c.fill();
      c.fillStyle = vgrad(c, py - 24, py + 24, [[0, '#6a3a18'], [1, '#c4843a']]);
      c.beginPath(); c.arc(px, py, 24, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(20,12,8,0.75)';
      c.beginPath(); c.ellipse(px + 8, py - 2, 5, 5.5, 0, 0, Math.PI * 2); c.fill();
      c.fillRect(px + 1, py + 4, 14, 22);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath(); c.moveTo(px - 16, py - 12); c.lineTo(px - 6, py - 20); c.lineTo(px - 10, py - 4); c.closePath(); c.fill();
      inkEllipse(c, px, py, 31, 31, { w: 2 });
      inkEllipse(c, px, py, 24, 24, { w: 1.4, alpha: 0.7 });
      for (let i = 0; i < 8; i += 1) rivet(c, px + Math.cos((i / 8) * Math.PI * 2) * 27.5, py + Math.sin((i / 8) * Math.PI * 2) * 27.5, 1.8);
      // brass handle
      const hx = dx + dw - 22;
      const hy = h * 0.54;
      c.fillStyle = brassFill(c, hx - 6, hy - 22, 12, 44);
      roundRectPath(c, hx - 5, hy - 22, 10, 44, 4); c.fill();
      c.fillStyle = brassFill(c, hx - 20, hy - 5, 24, 10);
      roundRectPath(c, hx - 20, hy - 4, 22, 8, 4); c.fill();
      ink(c, [[hx - 5, hy - 22], [hx + 5, hy - 22], [hx + 5, hy + 22], [hx - 5, hy + 22]], { w: 1.4, closed: true });
      ink(c, [[hx - 20, hy - 4], [hx, hy - 4], [hx, hy + 4], [hx - 20, hy + 4]], { w: 1.4, closed: true });
      c.fillStyle = '#0d0907'; c.fillRect(hx - 2, hy + 10, 4, 7);
      // lock light above the door
      const lampColor = variant === 'unlocked' ? '#ffcf7a' : '#c0392b';
      c.fillStyle = '#1a1210'; c.fillRect(dx + dw / 2 - 10, dTop - 26, 20, 14);
      c.fillStyle = lampColor;
      c.beginPath(); c.arc(dx + dw / 2, dTop - 19, 5, 0, Math.PI * 2); c.fill();
      glow(c, dx + dw / 2, dTop - 19, 26, variant === 'unlocked' ? 'rgba(255,200,110,0.9)' : 'rgba(220,60,40,0.9)', 0.6);
      ink(c, [[dx, dTop], [dx + dw, dTop], [dx + dw, floorY], [dx, floorY]], { w: 2.4, closed: true });
    }
    // floor with runner coming in from the left edge
    floorboards(c, w, h, floorY, { seed: 66, runner: [-40, dx - 10] });
    // the chute: pipe from the top edge down into the ticket slot plate
    const pipeW = 26;
    c.fillStyle = brassFill(c, chuteX - pipeW / 2, -20, pipeW, slotY, true);
    c.fillRect(chuteX - pipeW / 2, -20, pipeW, slotY - 14 + 20);
    [h * 0.02, h * 0.2].forEach((y) => {
      c.fillStyle = brassFill(c, chuteX - pipeW / 2 - 5, y, pipeW + 10, 8);
      c.fillRect(chuteX - pipeW / 2 - 5, y, pipeW + 10, 8);
      rivet(c, chuteX - pipeW / 2 - 1, y + 4, 2);
      rivet(c, chuteX + pipeW / 2 + 1, y + 4, 2);
    });
    ink(c, [[chuteX - pipeW / 2, -8], [chuteX - pipeW / 2, slotY - 14]], { w: 2.2 });
    ink(c, [[chuteX + pipeW / 2, -8], [chuteX + pipeW / 2, slotY - 14]], { w: 2.2 });
    // the slot plate
    const lit = variant !== 'locked';
    c.fillStyle = brassFill(c, chuteX - 26, slotY - 16, 52, 32);
    roundRectPath(c, chuteX - 26, slotY - 16, 52, 32, 5); c.fill();
    c.fillStyle = lit ? '#ffd27e' : '#0b0806';
    c.fillRect(chuteX - 16, slotY - 3, 32, 6);
    if (lit) glow(c, chuteX, slotY, 50, 'rgba(255, 200, 110, 0.9)', 0.55);
    ink(c, [[chuteX - 26, slotY - 16], [chuteX + 26, slotY - 16], [chuteX + 26, slotY + 16], [chuteX - 26, slotY + 16]], { w: 1.8, closed: true });
    rivet(c, chuteX - 21, slotY - 11, 1.8); rivet(c, chuteX + 21, slotY - 11, 1.8);
    rivet(c, chuteX - 21, slotY + 11, 1.8); rivet(c, chuteX + 21, slotY + 11, 1.8);
    finish(c, env);
  });
  ctx.glow(w * 0.26, h * 0.17, 140, { color: 0xffc070, alpha: 0.2, flicker: 0.07 });
  if (variant === 'open') ctx.glow(dx + dw * 0.55, h * 0.5, 220, { color: 0xffb060, alpha: 0.35, flicker: 0.06 });
  ctx.dust(w * 0.05, h * 0.1, w * 0.45, h * 0.6, { count: 8 });
}

// ---------------------------------------------------------------------------
// BR zoomed: inside the Conductor's car.

export function drawConductorCar(ctx) {
  const { w, h } = ctx;
  const floorY = h * 0.84;
  const win = { x: w * 0.3, y: h * 0.14, w: w * 0.3, h: h * 0.34 };
  ctx.fields(win.x, win.y, win.w, win.h, { speed: 26, zoom: 0.55, offset: 900 });
  ctx.paint('act1-conductor', (c, env) => {
    c.save();
    c.fillStyle = vgrad(c, 0, floorY, [[0, '#3a1f14'], [1, '#6b3a1e']]);
    c.fillRect(-30, -30, w + 60, floorY + 30);
    brushTexture(c, 0, 0, w, floorY, { seed: 71, color: 'rgba(255, 200, 140, 0.04)', count: 90 });
    wainscot(c, w, h, h * 0.58, floorY, { seed: 72 });
    c.globalCompositeOperation = 'destination-out';
    roundRectPath(c, win.x, win.y, win.w, win.h, 14);
    c.fill();
    c.restore();
    c.save();
    c.lineWidth = 10;
    c.strokeStyle = brassFill(c, win.x, win.y, win.w, win.h);
    roundRectPath(c, win.x - 3, win.y - 3, win.w + 6, win.h + 6, 16);
    c.stroke();
    c.restore();
    c.save();
    roundRectPath(c, win.x - 8, win.y - 8, win.w + 16, win.h + 16, 20);
    c.lineWidth = 1.8; c.strokeStyle = PAL.ink; c.globalAlpha = 0.8; c.stroke();
    c.restore();
    // pegboard timetable (no words, just brass pegs and route cards)
    const bx = w * 0.7;
    const by = h * 0.14;
    wood(c, bx, by, w * 0.24, h * 0.38, { base: '#2a1a10', seed: 73 });
    inkRect(c, bx, by, w * 0.24, h * 0.38, { w: 2 });
    const random = rng(74);
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const cx = bx + 16 + col * (w * 0.24 - 32) / 3;
        const cy = by + 18 + row * (h * 0.38 - 36) / 4;
        if (random() > 0.35) {
          c.fillStyle = random() > 0.5 ? '#d8ccb0' : '#c9b893';
          c.fillRect(cx - 12, cy - 5, 24, 14);
        }
        rivet(c, cx, cy - 5, 2);
      }
    }
    // a ceiling lamp and a coat hook with a spare cap
    hangingLamp(c, w * 0.45, -10, h * 0.06, { r: 24 });
    ink(c, [[w * 0.12, h * 0.3], [w * 0.14, h * 0.34], [w * 0.16, h * 0.3]], { w: 2, color: PAL.brassLight });
    c.fillStyle = '#121a28';
    c.beginPath(); c.ellipse(w * 0.14, h * 0.37, 20, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = PAL.brass; c.fillRect(w * 0.14 - 18, h * 0.38, 36, 3);
    // a small desk with the timetable ledger
    const dx = w * 0.68;
    const dTop = h * 0.64;
    wood(c, dx, dTop, w * 0.28, floorY - dTop, { base: '#3f2819', seed: 75, vertical: true });
    inkRect(c, dx, dTop, w * 0.28, floorY - dTop, { w: 2 });
    wood(c, dx - 8, dTop - 8, w * 0.28 + 16, 10, { base: '#5a3a22', seed: 76 });
    inkRect(c, dx - 8, dTop - 8, w * 0.28 + 16, 10, { w: 2 });
    c.fillStyle = '#e3d6b6';
    c.fillRect(dx + 30, dTop - 14, 70, 6);
    floorboards(c, w, h, floorY, { seed: 77, runner: [-40, w + 40] });
    glow(c, w * 0.45, h * 0.2, w * 0.5, 'rgba(255, 190, 110, 0.9)', 0.22);
    finish(c, env, { vig: 0.5 });
  });
  ctx.glow(w * 0.45, h * 0.12, 300, { color: 0xffb870, alpha: 0.25, flicker: 0.06 });
  ctx.dust(w * 0.25, h * 0.1, w * 0.45, h * 0.6, { count: 18, size: 2.4 });
}

export { amberGlint };
