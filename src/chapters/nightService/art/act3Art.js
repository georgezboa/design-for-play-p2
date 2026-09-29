// Act 3 · TWO TRUE THINGS — the city room and its window, the hawthorn lane,
// the orchard house (close and from the hill), the carriage, the broken
// viaduct (whole in 1978) and the Bellwether platform. Linked edges line up:
// the lane at 0.62, the rails at 0.85, the stair at x 0.55.

import { PAL, brassFill, glow, ink, inkEllipse, inkRect, rivet, rng, roundRectPath, speckle, vgrad, wood } from './ink.js';
import { backWall, finish } from './act1Art.js';
import { crop, cropFull } from './act2Art.js';

export const PATH_AT = 0.62;
export const RAIL_AT = 0.85;
export const STAIR_AT = 0.55;
/** The city room's window (outer frame) and its glass, tile-normalised. */
export const CITY_WINDOW = Object.freeze([0.44, 0.1, 0.34, 0.42]);
export const CITY_GLASS = Object.freeze([0.47, 0.14, 0.28, 0.34]);
/** Orchard house, close: the upstairs lit window lands in the city glass centre. */
export const HOUSE_CROP = Object.freeze([1428.4, 493.4, 428.8, 331.2]);
/** Orchard house from the hill (world-07 chunk-00). */
export const OVERLOOK_CROP = Object.freeze([1000.4, 352, 1072, 828]);
export const OVERLOOK_HOUSE = Object.freeze([
  (HOUSE_CROP[0] - OVERLOOK_CROP[0]) / OVERLOOK_CROP[2],
  (HOUSE_CROP[1] - OVERLOOK_CROP[1]) / OVERLOOK_CROP[3],
  HOUSE_CROP[2] / OVERLOOK_CROP[2],
  HOUSE_CROP[3] / OVERLOOK_CROP[3],
]);
export const WINDOW_CENTRE = Object.freeze({ x: CITY_GLASS[0] + CITY_GLASS[2] / 2, y: CITY_GLASS[1] + CITY_GLASS[3] / 2 });

const PAST = (env) => env.era === 'past';

function lane(c, w, h, { tone = '#2a3222', past = false, seed = 1 } = {}) {
  const y = PATH_AT * h;
  c.fillStyle = vgrad(c, y - 8, h + 20, [[0, past ? '#6a5236' : '#2c3524'], [1, past ? '#3a2a18' : '#121710']]);
  c.beginPath();
  c.moveTo(-20, y - 4);
  for (let x = -20; x <= w + 20; x += 30) c.lineTo(x, y - 4 - Math.sin(x * 0.02 + seed) * 3);
  c.lineTo(w + 20, h + 20); c.lineTo(-20, h + 20); c.closePath();
  c.fill();
  // the packed-earth lane itself, running edge to edge at PATH_AT
  c.fillStyle = past ? '#b09068' : '#6d5a44';
  c.fillRect(-20, y, w + 40, 12);
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(-20, y + 12, w + 40, 4);
  const random = rng(seed);
  for (let i = 0; i < 160; i += 1) {
    c.strokeStyle = random() > 0.5 ? 'rgba(120, 150, 90, 0.5)' : 'rgba(60, 80, 50, 0.6)';
    c.lineWidth = 1;
    const gx = random() * w;
    const gy = y + 16 + random() * (h - y);
    c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + (random() - 0.5) * 6, gy - 5 - random() * 8); c.stroke();
  }
  ink(c, [[-4, y], [w + 4, y]], { w: 2.6, alpha: 0.95 });
  void tone;
}

// ---------------------------------------------------------------------------
// TOP "city room": Mara's rented room — a window (liftable), bed, hot plate.

function cityRoomBase(c, env, w, h) {
  const floorY = PATH_AT * h;
  backWall(c, w, h, floorY, { seed: 301, tone: PAST(env) ? ['#6a5a3a', '#7a6848'] : ['#2b3a36', '#34463f'] });
  // the wall around the window, cut through to the view
  const [gx, gy, gw, gh] = CITY_GLASS;
  crop(c, env, 'nsv-w03-0', [2050, 120, 700, 650], gx * w, gy * h, gw * w, gh * h);
  c.fillStyle = PAST(env) ? 'rgba(255, 190, 120, 0.2)' : 'rgba(20, 30, 60, 0.35)';
  c.fillRect(gx * w, gy * h, gw * w, gh * h);
  // bed with a folded blanket
  c.fillStyle = '#3b2a1c'; c.fillRect(w * 0.03, h * 0.42, 10, floorY - h * 0.42);
  c.fillStyle = vgrad(c, h * 0.5, floorY, [[0, '#d8ccb0'], [1, '#a89878']]);
  roundRectPath(c, w * 0.03, h * 0.5, w * 0.32, h * 0.07, 6); c.fill();
  c.fillStyle = PAST(env) ? '#8a5a3a' : '#6b2a22';
  roundRectPath(c, w * 0.16, h * 0.49, w * 0.19, h * 0.09, 6); c.fill();
  c.fillStyle = '#3b2a1c'; c.fillRect(w * 0.03, h * 0.57, w * 0.32, 8);
  ink(c, [[w * 0.03, h * 0.42], [w * 0.03, floorY]], { w: 2 });
  ink(c, [[w * 0.03, h * 0.5], [w * 0.35, h * 0.5], [w * 0.35, floorY]], { w: 2 });
  // one chair
  const cx = w * 0.4;
  ink(c, [[cx, h * 0.4], [cx, floorY], [cx + 26, floorY]], { w: 2.4 });
  ink(c, [[cx, h * 0.52], [cx + 26, h * 0.52], [cx + 26, floorY]], { w: 2.4 });
  if (PAST(env)) {
    // 1978: Mara's coat over the chair and her case open on the bed
    c.fillStyle = '#5a4a3a';
    c.beginPath(); c.moveTo(cx - 4, h * 0.4); c.lineTo(cx + 18, h * 0.42); c.lineTo(cx + 22, h * 0.56); c.lineTo(cx - 6, h * 0.58); c.closePath(); c.fill();
    c.fillStyle = '#7d5634'; c.fillRect(w * 0.06, h * 0.44, 58, 22);
    c.fillStyle = '#e6dcc2'; c.fillRect(w * 0.07, h * 0.45, 20, 14);
  }
  // the hot plate on its little table
  const tx = w * 0.82;
  wood(c, tx, h * 0.46, w * 0.14, 8, { base: '#5a3a22', seed: 302 });
  ink(c, [[tx + 6, h * 0.46 + 8], [tx + 6, floorY]], { w: 2 });
  ink(c, [[tx + w * 0.14 - 6, h * 0.46 + 8], [tx + w * 0.14 - 6, floorY]], { w: 2 });
  c.fillStyle = '#2a2a2a'; c.fillRect(tx + 8, h * 0.43, 40, 10);
  c.fillStyle = PAST(env) ? '#ff8a4a' : '#6a2a1a';
  c.beginPath(); c.ellipse(tx + 28, h * 0.43, 14, 3, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#8a8a8a'; c.fillRect(tx + 20, h * 0.38, 18, 12);
  // the open door on the right: the stair landing and the lane beyond
  c.fillStyle = '#0c0a08';
  c.fillRect(w * 0.965, h * 0.2, w * 0.05, floorY - h * 0.2);
  ink(c, [[w * 0.965, h * 0.2], [w * 0.965, floorY]], { w: 2.2 });
  // the floor: boards, and the storey beneath (brick)
  c.fillStyle = vgrad(c, floorY, floorY + 16, [[0, '#4a3121'], [1, '#2a1a10']]);
  c.fillRect(-20, floorY, w + 40, 16);
  c.fillStyle = '#2a1c16';
  c.fillRect(-20, floorY + 16, w + 40, h - floorY);
  c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.4;
  for (let y = floorY + 26, row = 0; y < h + 20; y += 14, row += 1) {
    c.beginPath(); c.moveTo(-20, y); c.lineTo(w + 20, y); c.stroke();
    for (let x = (row % 2) * 18 - 20; x < w + 20; x += 36) { c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x, y); c.stroke(); }
  }
  // a street lamp below, and a lit window of the flat beneath
  c.fillStyle = 'rgba(255, 200, 120, 0.6)'; c.fillRect(w * 0.12, h * 0.74, w * 0.12, h * 0.12);
  glow(c, w * 0.18, h * 0.8, 90, 'rgba(255,190,110,0.9)', 0.35);
  ink(c, [[-4, floorY], [w + 4, floorY]], { w: 2.8 });
}

export function drawCityRoom(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-city', (c, env) => {
    cityRoomBase(c, env, w, h);
    finish(c, env);
  });
  ctx.glow(w * 0.89, h * 0.4, 120, { color: 0xff8a4a, alpha: ctx.era === 'past' ? 0.35 : 0.12, flicker: 0.15 });
  ctx.dust(w * 0.1, h * 0.1, w * 0.8, h * 0.45, { count: 10 });
}

/** The city window's frame: painted wood sash, curtains, a sill. Liftable. */
export function drawCityFrame(ctx) {
  const { w, h } = ctx;
  const [fx, fy, fw, fh] = CITY_WINDOW;
  const [gx, gy, gw, gh] = CITY_GLASS;
  ctx.paint('act3-city-frame', (c) => {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 14; c.shadowOffsetY = 5;
    c.fillStyle = '#d8ccb0';
    c.beginPath();
    c.rect(fx * w, fy * h, fw * w, fh * h);
    c.rect(gx * w + gw * w, gy * h, -gw * w, gh * h);
    c.fill('evenodd');
    c.restore();
    c.fillStyle = 'rgba(80, 60, 40, 0.25)';
    c.fillRect(fx * w, (gy + gh) * h, fw * w, (fy + fh - gy - gh) * h);
    // the sill and a small pot of thyme
    c.fillStyle = '#c9b893';
    c.fillRect(fx * w - 10, (fy + fh) * h - 10, fw * w + 20, 12);
    ink(c, [[fx * w - 10, (fy + fh) * h - 10], [(fx + fw) * w + 10, (fy + fh) * h - 10]], { w: 1.6 });
    c.fillStyle = '#8a4a2a';
    c.fillRect((fx + fw) * w - 36, (fy + fh) * h - 26, 18, 16);
    c.fillStyle = '#4f6b3a';
    for (let i = 0; i < 7; i += 1) { c.beginPath(); c.ellipse((fx + fw) * w - 27 + (i - 3) * 3, (fy + fh) * h - 30 - (i % 3) * 3, 3, 5, i, 0, Math.PI * 2); c.fill(); }
    // curtains, tied
    [[fx * w + 6, 1], [(fx + fw) * w - 6, -1]].forEach(([x, dir]) => {
      c.fillStyle = 'rgba(200, 170, 90, 0.9)';
      c.beginPath();
      c.moveTo(x, fy * h + 4); c.lineTo(x + dir * 26, fy * h + 4);
      c.quadraticCurveTo(x + dir * 10, (gy + gh * 0.5) * h, x + dir * 16, (gy + gh * 0.7) * h);
      c.quadraticCurveTo(x + dir * 4, (gy + gh) * h, x + dir * 8, (gy + gh) * h + 6);
      c.lineTo(x, (gy + gh) * h + 6); c.closePath(); c.fill();
      ink(c, [[x + dir * 26, fy * h + 4], [x + dir * 10, (gy + gh * 0.5) * h], [x + dir * 16, (gy + gh * 0.7) * h], [x + dir * 8, (gy + gh) * h + 6]], { w: 1.4, alpha: 0.8 });
    });
    ink(c, [[fx * w, fy * h], [(fx + fw) * w, fy * h], [(fx + fw) * w, (fy + fh) * h], [fx * w, (fy + fh) * h]], { w: 2.2, closed: true });
    ink(c, [[gx * w, gy * h], [(gx + gw) * w, gy * h], [(gx + gw) * w, (gy + gh) * h], [gx * w, (gy + gh) * h]], { w: 1.8, closed: true });
    // a glint of glass
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(220, 230, 255, 0.07)';
    c.beginPath(); c.moveTo(gx * w + 10, gy * h); c.lineTo(gx * w + 40, gy * h); c.lineTo(gx * w + 4, (gy + gh) * h); c.lineTo(gx * w - 26, (gy + gh) * h); c.closePath(); c.fill();
    c.restore();
  }, { bleed: 0 });
}

// ---------------------------------------------------------------------------
// TOP "hawthorn": the orchard lane, a hawthorn tree, the path edge to edge.

function hawthornTree(c, x, y, s, seed) {
  const random = rng(seed);
  ink(c, [[x, y], [x - 6 * s, y - 60 * s], [x + 4 * s, y - 110 * s], [x - 10 * s, y - 150 * s]], { w: 9 * s, color: '#241a12', alpha: 1, bleed: false });
  ink(c, [[x + 2 * s, y - 90 * s], [x + 50 * s, y - 130 * s]], { w: 5 * s, color: '#241a12', alpha: 1, bleed: false });
  ink(c, [[x - 4 * s, y - 70 * s], [x - 60 * s, y - 110 * s]], { w: 5 * s, color: '#241a12', alpha: 1, bleed: false });
  for (let i = 0; i < 90; i += 1) {
    const a = random() * Math.PI * 2;
    const r = random() * 70 * s;
    const bx = x + Math.cos(a) * r * 1.2;
    const by = y - 135 * s + Math.sin(a) * r * 0.6;
    c.fillStyle = random() > 0.4 ? '#3d4a2c' : '#2c3720';
    c.beginPath(); c.ellipse(bx, by, 7 * s, 4 * s, random() * 3, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < 70; i += 1) {
    const a = random() * Math.PI * 2;
    const r = random() * 70 * s;
    c.fillStyle = random() > 0.2 ? 'rgba(244, 238, 228, 0.95)' : 'rgba(210, 110, 110, 0.9)';
    c.beginPath(); c.arc(x + Math.cos(a) * r * 1.2, y - 135 * s + Math.sin(a) * r * 0.6, 1.8 * s + random() * 1.4, 0, Math.PI * 2); c.fill();
  }
}

/** Where the lane meets the next window: overgrown today, open in 1978. */
export const HEDGE = Object.freeze({ x: 0.8, lens: [0.9, PATH_AT], wait: 0.68 });

function hedge(c, w, h, seed) {
  // today the lane's far end is a hawthorn hedge grown right across it
  const random = rng(seed);
  const x0 = w * HEDGE.x;
  const y = h * PATH_AT;
  c.fillStyle = '#10180f';
  c.beginPath();
  c.moveTo(x0, y + 22);
  for (let k = 0; k <= 12; k += 1) {
    const t = k / 12;
    c.lineTo(x0 + (w + 30 - x0) * t, y - 60 - Math.sin(t * 9 + seed) * 10 - random() * 14);
  }
  c.lineTo(w + 30, y + 22);
  c.closePath();
  c.fill();
  for (let i = 0; i < 90; i += 1) {
    const bx = x0 + random() * (w - x0 + 20);
    const by = y - 62 + random() * 80;
    c.fillStyle = random() > 0.5 ? '#223320' : '#1a2818';
    c.beginPath(); c.ellipse(bx, by, 6 + random() * 9, 4 + random() * 6, random() * 3, 0, Math.PI * 2); c.fill();
  }
  // thorns and bare twigs, inked
  for (let i = 0; i < 26; i += 1) {
    const bx = x0 + random() * (w - x0 + 10);
    const by = y - 50 + random() * 60;
    ink(c, [[bx, by], [bx + (random() - 0.5) * 22, by - 6 - random() * 14], [bx + (random() - 0.5) * 30, by - 12 - random() * 18]], { w: 1.1, alpha: 0.55, jitter: 0.8, bleed: false });
  }
  // may blossom, pale in the night
  for (let i = 0; i < 40; i += 1) {
    c.fillStyle = 'rgba(235, 228, 210, 0.55)';
    c.beginPath(); c.arc(x0 + random() * (w - x0), y - 58 + random() * 60, 1 + random() * 1.4, 0, Math.PI * 2); c.fill();
  }
  ink(c, [[x0 - 4, y + 20], [x0 + 6, y - 40], [x0 + 30, y - 62]], { w: 1.8, alpha: 0.7 });
}

function openGate(c, w, h) {
  // 1978: the lane runs on through an open five-bar gate
  const gx = w * 0.86;
  const y = h * PATH_AT;
  ink(c, [[gx, y + 6], [gx, y - 58]], { w: 4, color: '#3a2a18', bleed: false });
  ink(c, [[gx, y + 6], [gx, y - 58]], { w: 1.6 });
  c.save();
  c.translate(gx, y - 52);
  c.transform(0.45, -0.18, 0, 1, 0, 0);
  for (let k = 0; k < 5; k += 1) ink(c, [[0, k * 11], [-90, k * 11]], { w: 2.4, color: '#5a4228', bleed: false });
  ink(c, [[0, 0], [-90, 44]], { w: 2, color: '#5a4228', bleed: false });
  c.restore();
  // a lamp hung on the gatepost for whoever comes home late
  c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(gx + 8, y - 62, 5, 0, Math.PI * 2); c.fill();
  glow(c, gx + 8, y - 62, 70, 'rgba(255, 210, 130, 0.95)', 0.6);
}

function hawthornBase(c, env, w, h) {
  cropFull(c, env, 'nsv-w07-1', [2130, 150, 670, 517], w, h);
  c.save();
  c.globalCompositeOperation = 'soft-light';
  c.fillStyle = 'rgba(255, 170, 120, 0.3)';
  c.fillRect(-30, -30, w + 60, h + 60);
  c.restore();
  lane(c, w, h, { seed: 311, past: PAST(env) });
  hawthornTree(c, w * 0.2, h * PATH_AT + 4, 1.25, 312);
  // a low dry-stone wall behind the lane
  c.fillStyle = '#4a4436';
  for (let x = w * 0.36; x < w + 20; x += 22) { c.fillRect(x, h * PATH_AT - 22 + (x % 3), 20, 18); }
  ink(c, [[w * 0.36, h * PATH_AT - 24], [w + 10, h * PATH_AT - 24]], { w: 1.6, alpha: 0.8 });
  if (PAST(env)) openGate(c, w, h);
  else hedge(c, w, h, 313);
}

export function drawHawthorn(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-hawthorn', (c, env) => {
    hawthornBase(c, env, w, h);
    finish(c, env, { vig: 0.45 });
  });
  ctx.dust(0, h * 0.2, w, h * 0.45, { count: 14, color: 0xffe8c0 });
}

export function drawHawthornPast(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-hawthorn-past', (c, env) => {
    hawthornBase(c, env, w, h);
    finish(c, env, { vig: 0.45 });
  });
  ctx.glow(w * 0.87, h * PATH_AT - h * 0.15, 120, { color: 0xffc070, alpha: 0.3, flicker: 0.1 });
}

// ---------------------------------------------------------------------------
// TOP "orchard house": close (upstairs window) and from the hill.

export function drawHouse(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-house', (c, env) => {
    cropFull(c, env, 'nsv-w07-0', HOUSE_CROP, w, h);
    c.save();
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = 'rgba(255, 170, 120, 0.3)';
    c.fillRect(-30, -30, w + 60, h + 60);
    c.restore();
    finish(c, env, { vig: 0.45, grain: 0.12 });
  });
  ctx.glow(w * WINDOW_CENTRE.x, h * WINDOW_CENTRE.y, 110, { color: 0xffc070, alpha: 0.3, flicker: 0.1 });
}

export function drawOverlook(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-overlook', (c, env) => {
    cropFull(c, env, 'nsv-w07-0', OVERLOOK_CROP, w, h);
    c.save();
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = 'rgba(255, 170, 120, 0.3)';
    c.fillRect(-30, -30, w + 60, h + 60);
    c.restore();
    // the hill: the lane comes in from the left at PATH_AT, the stair drops
    // to the platform far below at STAIR_AT
    const y = PATH_AT * h;
    c.fillStyle = vgrad(c, h * 0.55, h, [[0, '#2c3524'], [1, '#101410']]);
    c.beginPath();
    c.moveTo(-20, y - 6); c.lineTo(w * 0.3, y - 10); c.quadraticCurveTo(w * 0.6, h * 0.53, w + 20, h * 0.56);
    c.lineTo(w + 20, h + 20); c.lineTo(-20, h + 20); c.closePath();
    c.fill();
    lane(c, w * 0.46, h, { seed: 321 });
    // the stair: from the end of the lane down to the bottom edge at STAIR_AT
    const sx0 = w * 0.47;
    const sx1 = w * STAIR_AT;
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const x = sx0 + (sx1 - sx0) * t;
      const yy = y + 8 + (h - y - 4) * t;
      c.fillStyle = '#6d5a44';
      c.fillRect(x - 22, yy, 44, 5);
      ink(c, [[x - 22, yy], [x + 22, yy]], { w: 1.2, alpha: 0.7, bleed: false });
    }
    ink(c, [[sx0 - 24, y + 6], [sx1 - 24, h + 4]], { w: 2.2 });
    ink(c, [[sx0 + 24, y + 6], [sx1 + 24, h + 4]], { w: 2.2 });
    // far below: a platform lamp and rails catch the light
    glow(c, w * 0.8, h * 0.93, 80, 'rgba(255, 200, 120, 0.9)', 0.5);
    ink(c, [[w * 0.62, h * 0.97], [w + 10, h * 0.95]], { w: 2, color: PAL.brassLight, alpha: 0.8 });
    finish(c, env, { vig: 0.45, grain: 0.12 });
  });
  ctx.glow(w * (OVERLOOK_HOUSE[0] + OVERLOOK_HOUSE[2] * 0.61), h * (OVERLOOK_HOUSE[1] + OVERLOOK_HOUSE[3] * 0.31), 50, { color: 0xffc070, alpha: 0.3, flicker: 0.1 });
  ctx.dust(0, h * 0.3, w, h * 0.5, { count: 10, color: 0xffe0a0 });
}

// ---------------------------------------------------------------------------
// BOTTOM "carriage", "gap" (viaduct), "platform".

function rails(c, w, h, from, to, { past = false } = {}) {
  const y = RAIL_AT * h;
  for (let x = from + 4; x < to; x += 20) { c.fillStyle = past ? '#5a4028' : '#2a1d14'; c.fillRect(x, y + 2, 10, 14); }
  c.fillStyle = brassFill(c, from, y - 3, to - from, 5);
  c.fillRect(from, y - 3, to - from, 4);
  ink(c, [[from, y - 3], [to, y - 3]], { w: 2.4, bleed: false });
}

export function drawCarriageScene(ctx) {
  const { w, h } = ctx;
  ctx.fields(-20, -20, w + 40, h * 0.8, { speed: 0, crop: 0.55, zoom: 1.2, offset: 2200 });
  ctx.paint('act3-carriage', (c, env) => {
    c.fillStyle = vgrad(c, h * 0.72, h, [[0, '#1d2a2a'], [1, '#0a0f10']]);
    c.fillRect(-20, h * 0.72, w + 40, h * 0.3);
    // embankment and ballast
    c.fillStyle = '#2a2622';
    c.beginPath(); c.moveTo(-20, h * 0.86); c.lineTo(w + 20, h * 0.86); c.lineTo(w + 20, h + 20); c.lineTo(-20, h + 20); c.closePath(); c.fill();
    speckle(c, 0, h * 0.86, w, h * 0.14, { count: 500, color: 'rgba(200,190,170,0.18)', size: 2, seed: 331 });
    rails(c, w, h, w * 0.02, w + 20);
    // buffer stop at the left end and a signal lamp
    c.fillStyle = '#6b2a22'; c.fillRect(w * 0.02 - 6, h * RAIL_AT - 22, 12, 22);
    ink(c, [[w * 0.9, h * RAIL_AT], [w * 0.9, h * 0.5]], { w: 3, color: '#1a1410', bleed: false });
    c.fillStyle = '#1a1410'; c.fillRect(w * 0.9 - 10, h * 0.44, 20, 26);
    c.fillStyle = '#ffcf7a'; c.beginPath(); c.arc(w * 0.9, h * 0.5, 5, 0, Math.PI * 2); c.fill();
    glow(c, w * 0.9, h * 0.5, 50, 'rgba(255,200,110,0.9)', 0.6);
    ink(c, [[-4, h * 0.86], [w + 4, h * 0.86]], { w: 1.4, alpha: 0.5 });
    finish(c, env, { vig: 0.5 });
  });
}

function viaduct(c, w, h, { broken, past }) {
  const y = RAIL_AT * h;
  const deck = (x0, x1) => {
    c.fillStyle = past ? '#8a6a48' : '#3a3530';
    c.fillRect(x0, y + 4, x1 - x0, 16);
    ink(c, [[x0, y + 20], [x1, y + 20]], { w: 1.6, alpha: 0.8 });
  };
  const arch = (x) => {
    c.fillStyle = past ? '#7a5a3a' : '#322d28';
    c.beginPath();
    c.moveTo(x, h + 20); c.lineTo(x, y + 20); c.lineTo(x + w * 0.2, y + 20); c.lineTo(x + w * 0.2, h + 20);
    c.lineTo(x + w * 0.16, h + 20); c.quadraticCurveTo(x + w * 0.1, y + 36, x + w * 0.04, h + 20); c.closePath();
    c.fill();
    ink(c, [[x, h + 10], [x, y + 20], [x + w * 0.2, y + 20], [x + w * 0.2, h + 10]], { w: 1.6, alpha: 0.7 });
  };
  if (broken) {
    deck(-20, w * 0.36);
    deck(w * 0.64, w + 20);
    arch(w * 0.08);
    arch(w * 0.72);
    rails(c, w, h, -20, w * 0.34);
    rails(c, w, h, w * 0.66, w + 20);
    // broken ends: rubble and twisted rail
    ink(c, [[w * 0.34, y - 3], [w * 0.38, y + 10], [w * 0.37, y + 24]], { w: 2.6, color: PAL.brassLight, bleed: false });
    ink(c, [[w * 0.66, y - 3], [w * 0.62, y + 14]], { w: 2.6, color: PAL.brassLight, bleed: false });
    const random = rng(341);
    for (let i = 0; i < 24; i += 1) { c.fillStyle = '#3a3530'; c.fillRect(w * (0.34 + random() * 0.32), y + 30 + random() * (h - y), 6 + random() * 10, 4 + random() * 6); }
  } else {
    deck(-20, w + 20);
    [0.08, 0.4, 0.72].forEach(arch);
    rails(c, w, h, -20, w + 20, { past });
    // 1978: lamps along the parapet
    [0.2, 0.5, 0.8].forEach((u) => {
      ink(c, [[w * u, y + 4], [w * u, y - 46]], { w: 2.4, color: '#2a1d14', bleed: false });
      c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(w * u, y - 50, 6, 0, Math.PI * 2); c.fill();
      glow(c, w * u, y - 50, 70, 'rgba(255,210,130,0.95)', 0.6);
    });
  }
}

export function drawGap(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-gap', (c, env) => {
    cropFull(c, env, 'nsv-w01-2', [972, 267, 596, 460], w, h);
    viaduct(c, w, h, { broken: true, past: false });
    finish(c, env, { vig: 0.5 });
  });
}

export function drawGapPast(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-gap-past', (c, env) => {
    cropFull(c, env, 'nsv-w01-2', [972, 267, 596, 460], w, h);
    viaduct(c, w, h, { broken: false, past: true });
    finish(c, env, { vig: 0.45 });
  });
}

function platformBase(c, env, w, h) {
  const past = PAST(env);
  cropFull(c, env, 'nsv-w07-1', [20, 412, 536, 414], w, h);
  // far track (the other train stands on it)
  const far = 0.66 * h;
  c.fillStyle = past ? '#6a5236' : '#1d2226';
  c.fillRect(-20, far - 2, w + 40, h * 0.06);
  ink(c, [[-4, far], [w + 4, far]], { w: 2, color: PAL.brassLight, alpha: 0.9, bleed: false });
  // the platform between the tracks
  c.fillStyle = vgrad(c, h * 0.7, h * 0.83, [[0, past ? '#b8a07a' : '#5a534a'], [1, past ? '#8a7050' : '#3a342e']]);
  c.fillRect(-20, h * 0.7, w * 0.94 + 20, h * 0.13);
  c.fillStyle = past ? '#e8d4a0' : '#d8c070';
  c.fillRect(-20, h * 0.825, w * 0.94 + 20, 4);
  ink(c, [[-4, h * 0.7], [w * 0.94, h * 0.7], [w * 0.94, h * 0.83]], { w: 2 });
  // the stair from the hill arrives at the top edge, x = STAIR_AT
  const sx = w * STAIR_AT;
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    const yy = -4 + (h * 0.7 + 4) * t;
    c.fillStyle = '#6d5a44';
    c.fillRect(sx - 22 + t * 30, yy, 44, 5);
  }
  ink(c, [[sx - 24, -6], [sx + 6, h * 0.7]], { w: 2.2 });
  ink(c, [[sx + 24, -6], [sx + 54, h * 0.7]], { w: 2.2 });
  // bench, lamp and the station nameboard
  const bx = w * 0.12;
  wood(c, bx, h * 0.745, w * 0.2, 8, { base: '#5a3a22', seed: 351 });
  wood(c, bx, h * 0.71, w * 0.2, 6, { base: '#5a3a22', seed: 352 });
  ink(c, [[bx + 6, h * 0.753], [bx + 4, h * 0.8]], { w: 2 });
  ink(c, [[bx + w * 0.2 - 6, h * 0.753], [bx + w * 0.2 - 4, h * 0.8]], { w: 2 });
  inkRect(c, bx, h * 0.745, w * 0.2, 8, { w: 1.6 });
  const lx = w * 0.82;
  ink(c, [[lx, h * 0.72], [lx, h * 0.36]], { w: 3, color: '#1a1410', bleed: false });
  c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(lx, h * 0.34, 7, 0, Math.PI * 2); c.fill();
  glow(c, lx, h * 0.34, 90, 'rgba(255,210,130,0.95)', 0.55);
  const nx = w * 0.3;
  const ny = h * 0.5;
  ink(c, [[nx + 10, ny + 20], [nx + 10, h * 0.71]], { w: 2.4, color: '#1a1410', bleed: false });
  ink(c, [[nx + 150, ny + 20], [nx + 150, h * 0.71]], { w: 2.4, color: '#1a1410', bleed: false });
  c.fillStyle = past ? '#6b2a22' : '#23434a';
  roundRectPath(c, nx, ny - 8, 160, 32, 5); c.fill();
  c.fillStyle = '#eadfc6';
  c.font = '700 19px "Space Mono", monospace';
  c.fillText('BELLWETHER', nx + 20, ny + 15);
  inkRect(c, nx, ny - 8, 160, 32, { w: 1.6 });
  if (past) {
    c.fillStyle = '#e8d4a0'; roundRectPath(c, nx + 30, ny + 28, 100, 16, 3); c.fill();
    c.fillStyle = '#6b2a22'; c.font = '700 10px "Space Mono", monospace'; c.fillText('REQUEST STOP', nx + 38, ny + 40);
  }
  // near track: our rail enters from the left edge at RAIL_AT, buffer at the end
  const y = RAIL_AT * h;
  c.fillStyle = '#1a1612'; c.fillRect(-20, y + 2, w + 40, h - y);
  rails(c, w, h, -20, w * 0.92, { past });
  c.fillStyle = '#6b2a22'; c.fillRect(w * 0.92, y - 24, 14, 24);
  ink(c, [[w * 0.92, y - 24], [w * 0.92 + 14, y - 24], [w * 0.92 + 14, y], [w * 0.92, y]], { w: 1.4, closed: true });
}

export function drawPlatform(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-platform', (c, env) => {
    platformBase(c, env, w, h);
    finish(c, env, { vig: 0.45 });
  });
  // the orchard case, set down on the bench at the end
  const caseSprite = ctx.sprite('act3-bench-case', 60, 40, (c) => {
    c.fillStyle = '#6d4a2c'; roundRectPath(c, 4, 8, 52, 30, 4); c.fill();
    c.fillStyle = PAL.brass; c.fillRect(14, 8, 5, 30); c.fillRect(41, 8, 5, 30); c.fillRect(24, 3, 12, 5);
    c.fillStyle = '#e6dcc2'; c.beginPath(); c.moveTo(48, 20); c.lineTo(56, 16); c.lineTo(59, 24); c.lineTo(51, 28); c.closePath(); c.fill();
    ink(c, [[4, 8], [56, 8], [56, 38], [4, 38]], { w: 1.4, closed: true, bleed: false });
  }, w * 0.22, h * 0.745 - 18);
  ctx.animate(() => caseSprite.setVisible(ctx.flag('caseOnBench')));
  ctx.glow(w * 0.82, h * 0.34, 160, { color: 0xffc070, alpha: 0.2, flicker: 0.08 });
}

export function drawPlatformPast(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-platform-past', (c, env) => {
    platformBase(c, env, w, h);
    finish(c, env, { vig: 0.45 });
  });
}

export function drawCityRoomPast(ctx) {
  const { w, h } = ctx;
  ctx.paint('act3-city-past', (c, env) => {
    cityRoomBase(c, env, w, h);
    finish(c, env);
  });
}

export { inkEllipse, rivet, speckle };
