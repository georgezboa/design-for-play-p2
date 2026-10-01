// Act 3 · TWO TRUE THINGS — the city room and its window, the hawthorn lane,
// the orchard house (close and from the hill), the carriage, the broken
// viaduct (whole in 1978) and the Bellwether platform. Linked edges line up:
// the lane at 0.62, the rails at 0.85, the stair at x 0.55.

import { PAL, brassFill, glow, ink, inkEllipse, rivet, rng, roundRectPath, speckle, vgrad, wood } from './ink.js';
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
  // the view: misty rooftops by the terminal at dusk (world 07; the old
  // daytime-city view did not belong to a night chapter)
  crop(c, env, 'nsv-w07-1', [3200, 60, 700, 650], gx * w, gy * h, gw * w, gh * h);
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
    ink(c, [[bx, by], [bx + (random() - 0.5) * 22, by - 6 - random() * 14], [bx + (random() - 0.5) * 30, by - 12 - random() * 18]], { w: 1.3, color: '#3a2a1c', alpha: 0.85, jitter: 0.8, bleed: false });
  }
  // may blossom, pale in the night
  for (let i = 0; i < 40; i += 1) {
    c.fillStyle = 'rgba(235, 228, 210, 0.55)';
    c.beginPath(); c.arc(x0 + random() * (w - x0), y - 58 + random() * 60, 1 + random() * 1.4, 0, Math.PI * 2); c.fill();
  }
  // the lamplit rim of the hedge where the lane runs into it
  ink(c, [[x0 - 4, y + 20], [x0 + 6, y - 40], [x0 + 30, y - 62]], { w: 2.2, color: '#3c5432', alpha: 0.8, bleed: false });
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
  // a low dry-stone wall behind the lane: rounded stones in two courses,
  // moss on the coping (painted, no outline over the picture)
  const stones = rng(314);
  const tones = PAST(env) ? ['#7a6a4c', '#6a5c42', '#8a7856'] : ['#4a4436', '#3c382e', '#57513f'];
  const wallTop = h * PATH_AT - 24;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(w * 0.36 - 2, wallTop + 2, w * 0.66, 22);
  [0, 1].forEach((row) => {
    for (let x = w * 0.36 + row * 9; x < w + 20; x += 15 + stones() * 9) {
      const sw = 14 + stones() * 9;
      const sh = 9 + stones() * 2.5;
      c.fillStyle = tones[Math.floor(stones() * tones.length)];
      roundRectPath(c, x, wallTop + row * 10 + stones() * 1.5, sw, sh, 3.5);
      c.fill();
      c.fillStyle = 'rgba(255, 230, 190, 0.08)';
      c.fillRect(x + 2, wallTop + row * 10 + 1, sw - 4, 2);
    }
  });
  speckle(c, w * 0.36, wallTop - 2, w * 0.66, 6, { count: 90, color: PAST(env) ? 'rgba(120, 140, 70, 0.5)' : 'rgba(70, 96, 52, 0.6)', size: 2.4, seed: 315 });
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
  // a lamplit highlight along the railhead (brass, not an ivory outline)
  ink(c, [[from, y - 3], [to, y - 3]], { w: 1.8, color: PAL.brassLight, alpha: 0.85, bleed: false });
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

// The viaduct is a timber trestle with a brass-strapped deck, in the same
// wood-and-brass kit as the carriage (not grey slabs): broken in the present
// (splintered deck ends, a twisted rail, planks hanging into the cut), whole
// and lamplit in 1978.
function timberDeck(c, x0, x1, y, { past, seed }) {
  const tone = past ? '#7a5634' : '#35261a';
  wood(c, x0, y + 3, x1 - x0, 16, { base: tone, seed, planks: 2, grain: 'rgba(0,0,0,0.35)', light: past ? 'rgba(255,220,170,0.12)' : 'rgba(255,220,170,0.05)' });
  // sleeper ends along the face of the deck
  c.fillStyle = past ? 'rgba(50,30,14,0.55)' : 'rgba(0,0,0,0.5)';
  for (let x = x0 + 6; x < x1 - 4; x += 20) c.fillRect(x, y + 4, 9, 4);
  // brass strap along the parapet edge, with bolts
  c.fillStyle = brassFill(c, x0, y + 17, x1 - x0, 3);
  c.fillRect(x0, y + 17, x1 - x0, 3);
  for (let x = x0 + 14; x < x1 - 6; x += 44) rivet(c, x, y + 18.5, 1.8);
  // the shadow the deck throws on the trestles
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(x0, y + 20, x1 - x0, 4);
}

function trestle(c, x, y, h, { past, seed }) {
  const tone = past ? '#6a4a2c' : '#2b2017';
  const top = y + 22;
  const len = h + 30 - top;
  const leg = (lx, angle, s) => {
    c.save();
    c.translate(lx, top);
    c.rotate(angle);
    wood(c, -5, 0, 10, len, { base: tone, seed: s, vertical: true, grain: 'rgba(0,0,0,0.4)' });
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(3, 0, 2, len);
    c.restore();
  };
  leg(x, 0.1, seed);
  leg(x + 52, -0.1, seed + 1);
  // X bracing and a cap beam, bolted with brass
  const braceY = top + Math.min(36, len * 0.5);
  const brace = past ? '#4a3220' : '#1c140d';
  ink(c, [[x + 2, top + 4], [x + 50, braceY]], { w: 3.2, color: brace, alpha: 0.95, bleed: false, jitter: 0.3 });
  ink(c, [[x + 50, top + 4], [x + 2, braceY]], { w: 3.2, color: brace, alpha: 0.95, bleed: false, jitter: 0.3 });
  wood(c, x - 8, top - 2, 68, 7, { base: tone, seed: seed + 2 });
  [[x, top + 1], [x + 52, top + 1], [x + 26, (top + braceY) / 2 + 2]].forEach(([bx, by]) => rivet(c, bx, by, 2.2));
}

function splinteredEnd(c, x, y, dir, { seed }) {
  // the broken deck end: jagged timber, one plank hanging into the cut
  const random = rng(seed);
  c.fillStyle = '#35261a';
  c.beginPath();
  c.moveTo(x, y + 3);
  for (let i = 0; i <= 5; i += 1) c.lineTo(x + dir * (4 + random() * 14), y + 3 + (16 * i) / 5);
  c.lineTo(x, y + 20);
  c.closePath();
  c.fill();
  ink(c, [[x, y + 3], [x + dir * 12, y + 8], [x + dir * 6, y + 13], [x + dir * 14, y + 19]], { w: 1.2, color: '#1a120c', alpha: 0.9, bleed: false });
  c.save();
  c.translate(x + dir * 6, y + 12);
  c.rotate(dir * (0.9 + random() * 0.3));
  wood(c, -3, 0, 7, 44, { base: '#3e2c1d', seed: seed + 3, vertical: true, grain: 'rgba(0,0,0,0.4)' });
  c.restore();
}

function viaduct(c, w, h, { broken, past }) {
  const y = RAIL_AT * h;
  if (broken) {
    [0.06, 0.74].forEach((u, i) => trestle(c, w * u, y, h, { past, seed: 360 + i * 5 }));
    timberDeck(c, -20, w * 0.36, y, { past, seed: 351 });
    timberDeck(c, w * 0.64, w + 20, y, { past, seed: 352 });
    splinteredEnd(c, w * 0.36, y, 1, { seed: 353 });
    splinteredEnd(c, w * 0.64, y, -1, { seed: 354 });
    rails(c, w, h, -20, w * 0.34);
    rails(c, w, h, w * 0.66, w + 20);
    // the rails' broken ends twist down into the cut
    ink(c, [[w * 0.34, y - 3], [w * 0.36, y + 4], [w * 0.372, y + 18], [w * 0.366, y + 30]], { w: 2.2, color: PAL.brass, alpha: 0.85, bleed: false });
    ink(c, [[w * 0.66, y - 3], [w * 0.642, y + 8], [w * 0.646, y + 22]], { w: 2.2, color: PAL.brass, alpha: 0.85, bleed: false });
    // fallen timbers in the channel, in shadow
    const random = rng(341);
    for (let i = 0; i < 5; i += 1) {
      c.save();
      c.globalAlpha = 0.85;
      c.translate(w * (0.4 + random() * 0.2), h - 10 - random() * 22);
      c.rotate((random() - 0.5) * 1.4);
      wood(c, -16, -3, 32 + random() * 18, 6, { base: '#2c2017', seed: 370 + i });
      c.restore();
    }
  } else {
    [0.06, 0.4, 0.74].forEach((u, i) => trestle(c, w * u, y, h, { past, seed: 380 + i * 5 }));
    timberDeck(c, -20, w + 20, y, { past, seed: 351 });
    rails(c, w, h, -20, w + 20, { past });
    // 1978: lamps on brass posts along the parapet
    [0.2, 0.5, 0.8].forEach((u) => {
      const px = w * u;
      c.fillStyle = brassFill(c, px - 2, y - 46, 4, 50, true);
      c.fillRect(px - 2, y - 46, 4, 50);
      c.fillStyle = PAL.brassDark;
      c.fillRect(px - 6, y - 58, 12, 4);
      c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(px, y - 50, 6, 0, Math.PI * 2); c.fill();
      glow(c, px, y - 50, 70, 'rgba(255,210,130,0.95)', 0.6);
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
  // the platform between the tracks: wet stone flags lit by the lamp (painted
  // into the scene, no ink outline over the painting)
  const top = h * 0.7;
  const pw = w * 0.94 + 20;
  c.fillStyle = vgrad(c, top, h * 0.83, [[0, past ? '#a89068' : '#4a443d'], [1, past ? '#7a6244' : '#2c2823']]);
  c.fillRect(-20, top, pw, h * 0.13);
  c.save();
  c.beginPath(); c.rect(-20, top, pw, h * 0.13); c.clip();
  speckle(c, -20, top, pw, h * 0.13, { count: 260, color: past ? 'rgba(60,40,20,0.18)' : 'rgba(0,0,0,0.22)', size: 2.2, seed: 345 });
  c.strokeStyle = past ? 'rgba(60,40,20,0.35)' : 'rgba(0,0,0,0.38)';
  c.lineWidth = 1.2;
  for (let x = 18; x < pw; x += 46) { c.beginPath(); c.moveTo(x, top + 6); c.lineTo(x - 6, h * 0.83); c.stroke(); }
  c.beginPath(); c.moveTo(-20, top + h * 0.065); c.lineTo(pw, top + h * 0.065); c.stroke();
  // the lamp's pool of light on the wet stone
  const pool = c.createRadialGradient(w * 0.82, top + 20, 4, w * 0.82, top + 20, w * 0.32);
  pool.addColorStop(0, 'rgba(255, 200, 120, 0.32)');
  pool.addColorStop(1, 'rgba(255, 200, 120, 0)');
  c.fillStyle = pool;
  c.fillRect(-20, top, pw, h * 0.13);
  c.restore();
  // a worn coping along the platform's edge, and its shadow
  c.fillStyle = past ? 'rgba(232, 212, 160, 0.75)' : 'rgba(200, 176, 120, 0.5)';
  c.fillRect(-20, h * 0.822, pw, 3);
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.fillRect(-20, top - 2, pw, 3);
  c.fillRect(w * 0.94 - 3, top, 3, h * 0.13);
  // the stair from the hill arrives at the top edge, x = STAIR_AT
  // (a timber stair between brass-capped stringers, like the carriage)
  const sx = w * STAIR_AT;
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    const yy = -4 + (h * 0.7 + 4) * t;
    wood(c, sx - 22 + t * 30, yy, 44, 6, { base: past ? '#8a6640' : '#4e3a28', seed: 390 + i });
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(sx - 22 + t * 30, yy + 6, 44, 2);
  }
  [[-24, 6], [24, 54]].forEach(([a, b], i) => {
    c.save();
    c.beginPath(); c.moveTo(sx + a - 3, -6); c.lineTo(sx + a + 3, -6); c.lineTo(sx + b + 3, h * 0.7); c.lineTo(sx + b - 3, h * 0.7); c.closePath();
    c.fillStyle = past ? '#6a4a2c' : '#2e2218';
    c.fill();
    c.restore();
    ink(c, [[sx + a, -6], [sx + b, h * 0.7]], { w: 1.6, color: PAL.brassLight, alpha: 0.6, bleed: false, seed: 395 + i });
  });
  // bench, lamp and the station nameboard
  const bx = w * 0.12;
  wood(c, bx, h * 0.745, w * 0.2, 8, { base: '#5a3a22', seed: 351 });
  wood(c, bx, h * 0.71, w * 0.2, 6, { base: '#5a3a22', seed: 352 });
  ink(c, [[bx + 6, h * 0.753], [bx + 4, h * 0.8]], { w: 2.4, color: '#1a1410', bleed: false });
  ink(c, [[bx + w * 0.2 - 6, h * 0.753], [bx + w * 0.2 - 4, h * 0.8]], { w: 2.4, color: '#1a1410', bleed: false });
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(bx + 4, h * 0.8, w * 0.2 - 4, 3);
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
  c.save();
  c.lineWidth = 2;
  c.strokeStyle = brassFill(c, nx, ny - 8, 160, 32);
  roundRectPath(c, nx, ny - 8, 160, 32, 5); c.stroke();
  c.restore();
  if (past) {
    c.fillStyle = '#e8d4a0'; roundRectPath(c, nx + 30, ny + 28, 100, 16, 3); c.fill();
    c.fillStyle = '#6b2a22'; c.font = '700 10px "Space Mono", monospace'; c.fillText('REQUEST STOP', nx + 38, ny + 40);
  }
  // near track: our rail enters from the left edge at RAIL_AT, buffer at the end
  const y = RAIL_AT * h;
  c.fillStyle = '#1a1612'; c.fillRect(-20, y + 2, w + 40, h - y);
  rails(c, w, h, -20, w * 0.92, { past });
  c.fillStyle = '#6b2a22'; c.fillRect(w * 0.92, y - 24, 14, 24);
  c.fillStyle = brassFill(c, w * 0.92, y - 24, 14, 4); c.fillRect(w * 0.92, y - 24, 14, 4);
  ink(c, [[w * 0.92, y - 24], [w * 0.92 + 14, y - 24], [w * 0.92 + 14, y], [w * 0.92, y]], { w: 1.4, closed: true, color: '#1a1410', bleed: false });
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
