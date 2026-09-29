// Act 2 · THE LUGGAGE CAR — paintings for the rack, the carriage window and
// its liftable frame, the aisle (and Butch's case, zoomed three levels deep)
// and the timetable board. Each has a 1978 layer where it matters.

import {
  PAL, amberGlint, brassFill, brushTexture, glow, hgrad, ink, inkEllipse, inkLine, inkRect,
  lightCone, parcel, rivet, rng, roundRectPath, speckle, vgrad, wood,
} from './ink.js';
import { backWall, ceiling, finish, floorboards, hangingLamp, wainscot } from './act1Art.js';

// ---------------------------------------------------------------------------
// shared geometry (tile-normalised; every Act 2 panel is 1.8 : 1)

export const RACK_Y = 0.47;
export const DROP_AT = 0.25;
export const ORCHARD_CASE = Object.freeze({ x: 0.26, w: 0.13 });
export const CITY_CASE = Object.freeze({ x: 0.6, w: 0.13 });
export const CASE_TOP = 0.315;
/** Where the Bellwether tag hangs on the orchard case (1978) — and its zoom. */
export const ORCHARD_TAG = Object.freeze({ x: 0.36, y: 0.41 });
export const TAG_ZOOM = Object.freeze([0.28, 0.31, 0.2, 0.2]);
/** The postcard's picture inside the tag close-up; zooming into it becomes the orchard. */
export const POSTCARD = Object.freeze([0.4, 0.24, 0.34, 0.34]);
/** The Bellwether orchard house in world-07 chunk-00 (source pixels, 1.8 : 1). */
export const ORCHARD_CROP = Object.freeze([1150, 330, 900, 500]);
/** Upstairs lit window inside ORCHARD_CROP (normalised). */
export const UPSTAIRS = Object.freeze({ x: 0.6, y: 0.53 });
export const AISLE_FLOOR = 0.86;
export const BUTCH_X = DROP_AT;
export const CASE_ZOOM = Object.freeze([0.17, 0.57, 0.2, 0.2]);
export const BUTCH_SCALE = 2.2;
/** Butch's raised hand with the ticket (pose 'ticket', scale BUTCH_SCALE). */
export const TICKET_AT = Object.freeze({ x: 0.315, y: 0.52 });
export const LETTER_ZOOM = Object.freeze([0.5, 0.32, 0.28, 0.28]);
export const BENEATH_ZOOM = Object.freeze([0.62, 0.56, 0.24, 0.24]);

/** Paint a panorama crop so that [0..w]×[0..h] shows exactly `rect`; the bleed extends it. */
export function cropFull(c, env, key, [sx, sy, sw, sh], w, h) {
  const b = env.bleed ?? 0;
  const kx = sw / w;
  const ky = sh / h;
  crop(c, env, key, [sx - b * kx, sy - b * ky, sw + 2 * b * kx, sh + 2 * b * ky], -b, -b, w + 2 * b, h + 2 * b);
}

export function crop(c, env, key, [sx, sy, sw, sh], dx, dy, dw, dh) {
  const img = env.images?.[key];
  if (img) c.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  else { c.fillStyle = '#5a5a7a'; c.fillRect(dx, dy, dw, dh); }
}

function caseShape(c, x, y, w, h, { seed = 1, tone = '#6d4a2c' } = {}) {
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 4;
  c.fillStyle = tone;
  roundRectPath(c, x, y, w, h, 6);
  c.fill();
  c.restore();
  wood(c, x + 2, y + 2, w - 4, h - 4, { base: tone, seed, grain: 'rgba(0,0,0,0.12)', light: 'rgba(255,220,170,0.06)' });
  c.fillStyle = 'rgba(255, 220, 170, 0.1)';
  c.fillRect(x + 4, y + 3, w - 8, h * 0.18);
  // straps, corners and handle
  c.fillStyle = '#3e2718';
  c.fillRect(x + w * 0.22, y, w * 0.07, h);
  c.fillRect(x + w * 0.71, y, w * 0.07, h);
  c.fillStyle = PAL.brass;
  [[x, y], [x + w - 9, y], [x, y + h - 9], [x + w - 9, y + h - 9]].forEach(([cx, cy]) => c.fillRect(cx, cy, 9, 9));
  c.fillRect(x + w * 0.24, y + h * 0.42, w * 0.03, h * 0.16);
  c.fillRect(x + w * 0.73, y + h * 0.42, w * 0.03, h * 0.16);
  ink(c, [[x + w * 0.4, y], [x + w * 0.42, y - 12], [x + w * 0.58, y - 12], [x + w * 0.6, y]], { w: 2.2, color: '#2a1a10', bleed: false });
  ink(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { w: 2.2, closed: true });
}

function luggageTag(c, x, y, { text, leaf = false, lit = true, scale = 1, angle = 0.28 }) {
  ink(c, [[x - 18 * scale, y - 16 * scale], [x, y]], { w: 1.2, alpha: 0.8, bleed: false });
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(scale, scale);
  c.font = '700 11px "Space Mono", monospace';
  const textW = c.measureText(text).width;
  // the tag grows to fit its word, plus room for the hawthorn leaf
  const tw = Math.max(58, 6 + textW + (leaf ? 22 : 8));
  c.fillStyle = lit ? '#e8dcc0' : '#cbbd9c';
  c.beginPath();
  c.moveTo(0, -11); c.lineTo(tw, -11); c.lineTo(tw, 11); c.lineTo(0, 11); c.lineTo(-8, 0); c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(70, 50, 30, 0.8)'; c.lineWidth = 1; c.stroke();
  c.fillStyle = 'rgba(60, 40, 25, 0.95)';
  c.beginPath(); c.arc(-1, 0, 2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5a2218';
  c.fillText(text, 6, 4);
  if (leaf) {
    // a pressed hawthorn leaf: lobed, with a midrib
    const lx = 6 + textW + 11;
    c.fillStyle = '#4f6b3a';
    c.beginPath(); c.ellipse(lx, -1, 7, 4, -0.7, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(lx - 3, 2, 4, 2.6, 0.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(lx + 3, -5, 4, 2.4, 0.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2f4424'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(lx - 7, 6); c.lineTo(lx + 6, -6); c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// TL "rack": the high luggage rack with two identical cases.

function rackBase(c, env, w, h, { tilt = 0, past = false }) {
  backWall(c, w, h, h, { seed: 201, tone: past ? ['#2b2016', '#3a2a1c'] : ['#132126', '#1b2f35'] });
  ceiling(c, w, 26);
  // two ceiling lamps
  [0.28, 0.72].forEach((u) => hangingLamp(c, u * w, 10, 34, { r: 16 }));
  // the upper wall: a strip of carriage windows (night beyond), brass rail
  const winY = h * 0.6;
  for (let i = 0; i < 3; i += 1) {
    const x = w * (0.08 + i * 0.31);
    c.fillStyle = vgrad(c, winY, winY + h * 0.24, [[0, past ? '#6a5236' : '#1c2a44'], [1, past ? '#3a2a18' : '#0e1624']]);
    roundRectPath(c, x, winY, w * 0.24, h * 0.24, 10);
    c.fill();
    c.save();
    c.lineWidth = 6;
    c.strokeStyle = brassFill(c, x, winY, w * 0.24, h * 0.24);
    roundRectPath(c, x, winY, w * 0.24, h * 0.24, 10);
    c.stroke();
    c.restore();
    speckle(c, x + 6, winY + 6, w * 0.24 - 12, h * 0.12, { count: 30, color: 'rgba(255,240,210,0.5)', size: 1.6, seed: 210 + i });
  }
  c.fillStyle = brassFill(c, 0, winY - 16, w, 6);
  c.fillRect(-20, winY - 16, w + 40, 6);
  // seat backs peeking at the bottom
  [0.02, 0.58].forEach((u) => {
    c.fillStyle = vgrad(c, h * 0.9, h, [[0, '#7a3226'], [1, '#4a1a14']]);
    roundRectPath(c, u * w, h * 0.9, w * 0.4, h * 0.2, 16);
    c.fill();
    ink(c, [[u * w, h + 10], [u * w, h * 0.92], [u * w + w * 0.4, h * 0.92], [u * w + w * 0.4, h + 10]], { w: 1.8, alpha: 0.8 });
  });
  // the rack: brass bars with netting; hinged flap at the left end
  c.save();
  c.translate(w * 0.94, h * RACK_Y);
  c.rotate(tilt);
  c.translate(-w * 0.94, -h * RACK_Y);
  const y = h * RACK_Y;
  const x0 = w * 0.06;
  const x1 = w * 0.94;
  c.strokeStyle = 'rgba(234, 223, 198, 0.35)';
  c.lineWidth = 1;
  for (let x = x0; x < x1; x += 12) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8, y + 18); c.moveTo(x + 8, y); c.lineTo(x, y + 18); c.stroke(); }
  c.fillStyle = brassFill(c, x0, y - 3, x1 - x0, 6);
  c.fillRect(x0, y - 3, x1 - x0, 6);
  c.fillRect(x0, y + 16, x1 - x0, 5);
  ink(c, [[x0, y - 3], [x1, y - 3]], { w: 2 });
  ink(c, [[x0, y + 21], [x1, y + 21]], { w: 1.6 });
  [0.12, 0.5, 0.88].forEach((u) => {
    const bx = x0 + (x1 - x0) * u;
    c.fillStyle = brassFill(c, bx - 3, y - 40, 6, 40, true);
    c.fillRect(bx - 3, y + 21, 6, 30);
    rivet(c, bx, y + 51, 4);
  });
  if (tilt) {
    // the hinged flap has dropped open over the drop point
    c.fillStyle = '#1a120c';
    c.fillRect(w * (DROP_AT - 0.06), y - 2, w * 0.12, 24);
    ink(c, [[w * (DROP_AT - 0.06), y + 20], [w * (DROP_AT - 0.08), y + 50]], { w: 3, color: PAL.brassLight });
  }
  c.restore();
  // the city case (always), the orchard case (unless it has slid or gone)
  return { y, tilt };
}

export function drawRack(ctx, variant = 'rack') {
  const { w, h } = ctx;
  const tilt = variant === 'tilting' ? -0.05 : 0;
  ctx.paint(`act2-rack-${variant}`, (c, env) => {
    rackBase(c, env, w, h, { tilt });
    c.save();
    c.translate(w * 0.94, h * RACK_Y); c.rotate(tilt); c.translate(-w * 0.94, -h * RACK_Y);
    caseShape(c, w * CITY_CASE.x, h * CASE_TOP, w * CITY_CASE.w, h * (RACK_Y - CASE_TOP), { seed: 5 });
    if (variant === 'rack') caseShape(c, w * ORCHARD_CASE.x, h * CASE_TOP, w * ORCHARD_CASE.w, h * (RACK_Y - CASE_TOP), { seed: 5 });
    // present: the tags have worn away to bare string loops
    [ORCHARD_CASE, CITY_CASE].forEach((cs, i) => {
      if (variant !== 'rack' && i === 0) return;
      const tx = w * (cs.x + cs.w * 0.64);
      ink(c, [[tx, h * CASE_TOP + 4], [tx + 8, h * (CASE_TOP + 0.08)], [tx + 3, h * (CASE_TOP + 0.1)]], { w: 1.1, alpha: 0.6, bleed: false });
    });
    c.restore();
    brushTexture(c, 0, 0, w, h, { seed: 220, color: 'rgba(255,230,200,0.02)' });
    finish(c, env);
  });
  if (variant === 'tilting') {
    // the orchard case slides down the tilted rack to the drop point
    const caseW = w * ORCHARD_CASE.w;
    const caseH = h * (RACK_Y - CASE_TOP);
    const sprite = ctx.sprite('act2-orchard-case', caseW + 20, caseH + 30, (c) => caseShape(c, 10, 18, caseW, caseH, { seed: 5 }), w * (ORCHARD_CASE.x + ORCHARD_CASE.w / 2), h * CASE_TOP + caseH / 2 - 4);
    const start = sprite.x;
    const end = w * DROP_AT;
    let k = ctx.flag('caseAtEdge') ? 1 : 0;
    // the waiting edge: once the case is at the drop point, the rack's bottom
    // edge there glows until a pair of arms is below it
    const edge = ctx.glow(end, h, 290, { color: 0xffb860, alpha: 0 });
    const lip = ctx.glow(end, h * RACK_Y + 10, 90, { color: 0xffd9a0, alpha: 0 });
    ctx.animate((time, dt) => {
      const waiting = ctx.flag('caseAtEdge') && !ctx.flag('caseInArms') && !ctx.flag('caseFalling');
      const reduce = ctx.reduceMotion();
      const pulse = 0.5 + Math.sin(time / (reduce ? 700 : 380)) * 0.5;
      edge.setAlpha(waiting && k >= 1 ? 0.4 + pulse * (reduce ? 0.2 : 0.5) : 0);
      lip.setAlpha(waiting && k >= 1 ? 0.2 + pulse * 0.3 : 0);
      if (ctx.flag('caseInArms') || ctx.flag('caseFalling')) { sprite.setVisible(false); return; }
      if (ctx.flag('caseAtEdge')) k = Math.min(1, k + dt / 900);
      const e = k * k;
      // at the edge it teeters over the drop, rocking on the rack's lip
      const teeter = k >= 1 ? Math.sin(time / (reduce ? 520 : 210)) * (reduce ? 0.03 : 0.085) + (Math.sin(time / 1300) > 0.7 ? 0.05 : 0) : 0;
      sprite.x = start + (end - start) * e + (k >= 1 ? Math.sin(time / 210) * (reduce ? 0.5 : 2.2) : 0);
      sprite.y = h * CASE_TOP + caseH / 2 - 4 + (1 - Math.cos(e * Math.PI)) * 4 + (k >= 1 ? Math.abs(teeter) * 18 : 0);
      sprite.rotation = -0.05 - e * 0.1 - teeter - (k >= 1 ? 0.08 : 0);
    });
  }
  ctx.glow(w * 0.28, 44, 180, { color: 0xffc070, alpha: 0.2, flicker: 0.06 });
  ctx.glow(w * 0.72, 44, 180, { color: 0xffc070, alpha: 0.2, flicker: 0.05 });
  ctx.dust(w * 0.1, h * 0.1, w * 0.8, h * 0.4, { count: 10 });
}

/** 1978: the same rack, and both tags still legible. */
export function drawRackPast(ctx) {
  const { w, h } = ctx;
  ctx.paint('act2-rack-past', (c, env) => {
    rackBase(c, env, w, h, { past: true });
    caseShape(c, w * CITY_CASE.x, h * CASE_TOP, w * CITY_CASE.w, h * (RACK_Y - CASE_TOP), { seed: 5, tone: '#7d5634' });
    caseShape(c, w * ORCHARD_CASE.x, h * CASE_TOP, w * ORCHARD_CASE.w, h * (RACK_Y - CASE_TOP), { seed: 5, tone: '#7d5634' });
    luggageTag(c, w * ORCHARD_TAG.x, h * ORCHARD_TAG.y, { text: 'BELLWETHER', leaf: true, scale: 1.3 });
    luggageTag(c, w * (CITY_CASE.x + CITY_CASE.w * 0.77), h * ORCHARD_TAG.y, { text: 'CITY', scale: 1.3 });
    // a 1978 hat left on the rack, and a folded newspaper
    c.fillStyle = '#2a2020';
    c.beginPath(); c.ellipse(w * 0.87, h * RACK_Y - 4, 22, 5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(w * 0.87, h * RACK_Y - 12, 13, 10, 0, Math.PI, 0); c.fill();
    finish(c, env);
  });
}

// ---------------------------------------------------------------------------
// TL zoomed: the tag, with the postcard tucked into its string.

function postcardPicture(c, env, x, y, pw, ph, { sepiaTone = true, circle = true } = {}) {
  crop(c, env, 'nsv-w07-0', ORCHARD_CROP, x, y, pw, ph);
  if (sepiaTone) {
    c.save();
    c.globalCompositeOperation = 'color';
    c.fillStyle = 'rgba(160, 110, 60, 0.75)';
    c.fillRect(x, y, pw, ph);
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = 'rgba(255, 210, 150, 0.35)';
    c.fillRect(x, y, pw, ph);
    c.restore();
  }
  if (circle) {
    // Mara's red-pencil circle around the upstairs window
    const cx = x + pw * UPSTAIRS.x;
    const cy = y + ph * UPSTAIRS.y;
    ink(c, Array.from({ length: 26 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2 - 0.4;
      return [cx + Math.cos(a) * pw * 0.07, cy + Math.sin(a) * ph * 0.11];
    }), { w: 2, color: '#b3261e', alpha: 0.85, jitter: 0.6, bleed: false });
  }
}

export function drawCaseTag(ctx) {
  const { w, h } = ctx;
  ctx.paint('act2-tag', (c, env) => {
    // the case lid, up close: leather grain and a brass strap
    wood(c, -30, -30, w + 60, h + 60, { base: '#5e3f25', seed: 231, grain: 'rgba(0,0,0,0.2)' });
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(-30, -30, w + 60, h + 60);
    c.fillStyle = '#3e2718';
    c.fillRect(w * 0.84, -30, w * 0.08, h + 60);
    c.fillStyle = brassFill(c, w * 0.83, h * 0.45, w * 0.1, h * 0.1);
    c.fillRect(w * 0.83, h * 0.44, w * 0.1, h * 0.12);
    ink(c, [[w * 0.84, -10], [w * 0.84, h + 10]], { w: 1.6, alpha: 0.6 });
    // the big manila tag
    c.save();
    c.translate(w * 0.08, h * 0.5);
    c.rotate(-0.08);
    c.fillStyle = '#d9c9a2';
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 8;
    c.beginPath(); c.moveTo(0, -120); c.lineTo(w * 0.5, -130); c.lineTo(w * 0.52, 140); c.lineTo(0, 130); c.lineTo(-30, 0); c.closePath(); c.fill();
    c.restore();
    c.save();
    c.translate(w * 0.08, h * 0.5);
    c.rotate(-0.08);
    c.fillStyle = 'rgba(60, 40, 25, 0.95)';
    c.beginPath(); c.arc(-8, 0, 7, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6a5238'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(-8, 0, 11, 0, Math.PI * 2); c.stroke();
    ink(c, [[0, -120], [w * 0.5, -130], [w * 0.52, 140], [0, 130], [-30, 0]], { w: 2.2, closed: true, color: '#5a4630' });
    c.fillStyle = 'rgba(70, 40, 25, 0.55)';
    c.font = '700 20px "Space Mono", monospace';
    c.fillText('0412', 30, -80);
    c.restore();
    // the string runs from the eyelet up and away
    ink(c, [[w * 0.075, h * 0.5], [w * 0.2, h * 0.2], [w * 0.36, -20]], { w: 2.4, color: '#e6dcc2', alpha: 0.9 });
    // the postcard, tucked behind the string: picture exactly at POSTCARD
    const [px, py, pw, ph] = POSTCARD;
    const X = px * w;
    const Y = py * h;
    const W = pw * w;
    const H = ph * h;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 16; c.shadowOffsetX = 6; c.shadowOffsetY = 8;
    c.fillStyle = '#efe6cf';
    c.fillRect(X - 12, Y - 12, W + 24, H + 44);
    c.restore();
    postcardPicture(c, env, X, Y, W, H);
    inkRect(c, X - 12, Y - 12, W + 24, H + 44, { w: 1.6, color: '#6a5238' });
    inkRect(c, X, Y, W, H, { w: 1.2, alpha: 0.6, color: '#4b3a2a' });
    c.fillStyle = '#6b2a22';
    c.font = 'italic 17px Georgia, serif';
    c.fillText('Bellwether', X + 4, Y + H + 24);
    c.fillStyle = 'rgba(60,40,25,0.6)';
    c.font = '11px "Space Mono", monospace';
    c.fillText('PACKING CO-OP', X + W - 100, Y + H + 24);
    ink(c, [[w * 0.36, h * 0.12], [X + W * 0.3, Y - 12]], { w: 2.4, color: '#e6dcc2', alpha: 0.9 });
    finish(c, env, { vig: 0.55 });
  });
  ctx.dust(w * 0.3, h * 0.1, w * 0.5, h * 0.6, { count: 8 });
}

// ---------------------------------------------------------------------------
// TL zoomed twice: the orchard house at Bellwether, at dusk.

export function drawOrchard(ctx) {
  const { w, h } = ctx;
  ctx.paint('act2-orchard', (c, env) => {
    cropFull(c, env, 'nsv-w07-0', ORCHARD_CROP, w, h);
    // warm the dusk a little and add hand-inked hawthorn in the foreground
    c.save();
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = vgrad(c, 0, h, [[0, 'rgba(255, 170, 120, 0.4)'], [1, 'rgba(40, 30, 60, 0.3)']]);
    c.fillRect(-30, -30, w + 60, h + 60);
    c.restore();
    const random = rng(241);
    ink(c, [[-10, h * 0.1], [w * 0.1, h * 0.14], [w * 0.2, h * 0.08], [w * 0.28, h * 0.12]], { w: 5, color: '#1a1410', alpha: 0.95, bleed: false });
    ink(c, [[w * 0.1, h * 0.14], [w * 0.16, h * 0.26], [w * 0.13, h * 0.34]], { w: 3, color: '#1a1410', alpha: 0.95, bleed: false });
    for (let i = 0; i < 70; i += 1) {
      const bx = random() * w * 0.3;
      const by = h * (0.04 + random() * 0.3);
      c.fillStyle = random() > 0.3 ? 'rgba(240, 232, 220, 0.9)' : 'rgba(200, 90, 90, 0.8)';
      c.beginPath(); c.arc(bx, by, 1.6 + random() * 2.2, 0, Math.PI * 2); c.fill();
    }
    for (let i = 0; i < 26; i += 1) {
      c.fillStyle = '#26301c';
      c.beginPath(); c.ellipse(random() * w * 0.3, h * (0.06 + random() * 0.28), 5, 2.5, random() * 3, 0, Math.PI * 2); c.fill();
    }
    finish(c, env, { vig: 0.4, grain: 0.14 });
  });
  // the lit upstairs window breathes
  ctx.glow(w * UPSTAIRS.x, h * UPSTAIRS.y, 70, { color: 0xffc070, alpha: 0.35, flicker: 0.1 });
  ctx.dust(0, h * 0.2, w, h * 0.5, { count: 16, size: 2.6, color: 0xffd28a });
}

// ---------------------------------------------------------------------------
// TR "window": night fields; the brass frame is a liftable FrameDef.

export function drawCarriageView(ctx) {
  const { w, h } = ctx;
  ctx.fields(-20, -20, w + 40, h + 40, { speed: 22, crop: 0.58, zoom: 1.15, offset: 1200 });
  ctx.paint('act2-view', (c, env) => {
    c.fillStyle = 'rgba(40, 70, 90, 0.1)';
    c.fillRect(-30, -30, w + 60, h + 60);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(200, 220, 255, 0.05)';
    c.beginPath(); c.moveTo(w * 0.1, 0); c.lineTo(w * 0.24, 0); c.lineTo(w * 0.06, h); c.lineTo(-w * 0.08, h); c.closePath(); c.fill();
    c.restore();
    finish(c, env, { vig: 0.55, grain: 0.1 });
  });
  ctx.rain(0, 0, w, h, { count: 38 });
}

export function drawBrassFrame(ctx) {
  const { w, h } = ctx;
  ctx.paint('act2-frame', (c) => {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)';
    c.shadowBlur = 16;
    c.lineWidth = 30;
    c.strokeStyle = brassFill(c, 0, 0, w, h);
    roundRectPath(c, 26, 24, w - 52, h - 48, 44);
    c.stroke();
    c.restore();
    c.save();
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(255, 238, 190, 0.6)';
    roundRectPath(c, 12, 10, w - 24, h - 20, 54);
    c.stroke();
    c.strokeStyle = PAL.ink;
    c.globalAlpha = 0.85;
    roundRectPath(c, 41, 39, w - 82, h - 78, 30);
    c.stroke();
    c.restore();
    for (let i = 0; i <= 12; i += 1) {
      const x = 44 + ((w - 88) * i) / 12;
      rivet(c, x, 24, 3.2);
      rivet(c, x, h - 24, 3.2);
    }
    for (let i = 1; i < 6; i += 1) {
      rivet(c, 26, 24 + ((h - 48) * i) / 6, 3.2);
      rivet(c, w - 26, 24 + ((h - 48) * i) / 6, 3.2);
    }
    // the latch
    c.fillStyle = brassFill(c, w / 2 - 22, h - 34, 44, 16);
    roundRectPath(c, w / 2 - 22, h - 36, 44, 16, 6);
    c.fill();
    ink(c, [[w / 2 - 22, h - 36], [w / 2 + 22, h - 36], [w / 2 + 22, h - 20], [w / 2 - 22, h - 20]], { w: 1.2, closed: true });
  }, { bleed: 0 });
}

// ---------------------------------------------------------------------------
// BL "aisle": Butch below the rack, holding his ticket.

function aisleBase(c, env, w, h, { past = false }) {
  const floorY = AISLE_FLOOR * h;
  backWall(c, w, h, floorY, { seed: 251, tone: past ? ['#3a2a1a', '#4a3421'] : ['#16262b', '#1d3237'] });
  // the ceiling, with the open hatch the case will come through
  wood(c, -20, -20, w + 40, h * 0.1 + 20, { base: '#1d140d', seed: 252 });
  c.fillStyle = '#070504';
  c.fillRect(w * (DROP_AT - 0.07), -20, w * 0.14, h * 0.1 + 20);
  c.fillStyle = brassFill(c, -20, h * 0.1 - 3, w + 40, 5);
  c.fillRect(-20, h * 0.1 - 3, w + 40, 5);
  ink(c, [[w * (DROP_AT - 0.07), -6], [w * (DROP_AT - 0.07), h * 0.1]], { w: 2 });
  ink(c, [[w * (DROP_AT + 0.07), -6], [w * (DROP_AT + 0.07), h * 0.1]], { w: 2 });
  // window band
  for (let i = 0; i < 2; i += 1) {
    const x = w * (0.42 + i * 0.3);
    c.save();
    c.globalCompositeOperation = 'destination-out';
    roundRectPath(c, x, h * 0.18, w * 0.24, h * 0.3, 12);
    c.fill();
    c.restore();
    c.save();
    c.lineWidth = 8;
    c.strokeStyle = brassFill(c, x, h * 0.18, w * 0.24, h * 0.3);
    roundRectPath(c, x, h * 0.18, w * 0.24, h * 0.3, 12);
    c.stroke();
    c.restore();
  }
  wainscot(c, w, h, h * 0.55, floorY, { seed: 253 });
  // seats: a pair facing each other on the right, one on the left edge
  const seat = (x, sw, flip) => {
    c.fillStyle = vgrad(c, h * 0.5, floorY, [[0, past ? '#8a5a3a' : '#7a3226'], [1, past ? '#5a3a24' : '#4a1a14']]);
    roundRectPath(c, x, h * 0.5, sw, h * 0.26, 14);
    c.fill();
    c.fillRect(x + (flip ? 0 : sw * 0.1), h * 0.7, sw * 0.9, h * 0.08);
    if (past) {
      c.fillStyle = 'rgba(40, 25, 15, 0.25)';
      for (let yy = h * 0.52; yy < h * 0.74; yy += 12) for (let xx = x + 6; xx < x + sw - 6; xx += 12) if (((xx + yy) / 12) % 2 < 1) c.fillRect(xx, yy, 6, 6);
    }
    ink(c, [[x, h * 0.52], [x + sw, h * 0.52], [x + sw, h * 0.78], [x, h * 0.78]], { w: 1.8, closed: true, alpha: 0.85 });
    ink(c, [[x + sw * 0.1, h * 0.78], [x + sw * 0.1, floorY]], { w: 2 });
    ink(c, [[x + sw * 0.9, h * 0.78], [x + sw * 0.9, floorY]], { w: 2 });
  };
  seat(-w * 0.04, w * 0.16, false);
  seat(w * 0.44, w * 0.22, true);
  seat(w * 0.74, w * 0.22, false);
  floorboards(c, w, h, floorY, { seed: 254, runner: [w * 0.12, w * 0.42] });
  if (past) {
    // 1978: a gas mantle lamp and the day's paper on the seat
    c.fillStyle = PAL.brassDark; c.fillRect(w * 0.36, h * 0.2, 6, 30);
    c.fillStyle = '#ffe7b0'; c.beginPath(); c.arc(w * 0.36 + 3, h * 0.2, 10, 0, Math.PI * 2); c.fill();
    glow(c, w * 0.36, h * 0.2, 60, 'rgba(255,200,120,0.9)', 0.5);
    c.fillStyle = '#d8ccb0'; c.fillRect(w * 0.78, h * 0.47, 60, 14);
    c.fillStyle = 'rgba(40,30,20,0.6)'; [0, 1, 2].forEach((i) => c.fillRect(w * 0.78 + 4, h * 0.47 + 3 + i * 4, 50, 1.5));
  }
}

export function drawAisle(ctx) {
  const { w, h } = ctx;
  [0.42, 0.72].forEach((u, i) => ctx.fields(u * w, h * 0.18, w * 0.24, h * 0.3, { speed: 24, crop: 0.55, zoom: 1.3, offset: 300 + i * 500 }));
  ctx.paint('act2-aisle', (c, env) => {
    aisleBase(c, env, w, h, {});
    finish(c, env);
  });
  ctx.glow(w * 0.25, h * 0.35, 200, { color: 0xffb870, alpha: 0.12, flicker: 0.05 });
  ctx.dust(w * 0.1, h * 0.12, w * 0.3, h * 0.6, { count: 10 });
  // the ceiling hatch answers the waiting case: this is where it can come down
  const hatch = ctx.glow(w * DROP_AT, 0, 190, { color: 0xffb860, alpha: 0 });
  ctx.animate((time) => {
    const waiting = ctx.flag('caseAtEdge') && !ctx.flag('caseInArms') && !ctx.flag('caseFalling');
    const pulse = 0.5 + Math.sin(time / (ctx.reduceMotion() ? 700 : 380) + 1.2) * 0.5;
    hatch.setAlpha(waiting ? 0.18 + pulse * 0.3 : 0);
  });
}

export function drawAislePast(ctx) {
  const { w, h } = ctx;
  [0.42, 0.72].forEach((u, i) => ctx.fields(u * w, h * 0.18, w * 0.24, h * 0.3, { speed: 0, crop: 0.55, zoom: 1.3, offset: 300 + i * 500 }));
  ctx.paint('act2-aisle-past', (c, env) => {
    aisleBase(c, env, w, h, { past: true });
    finish(c, env);
  });
}

// ---------------------------------------------------------------------------
// BL zoomed: the open case → the letter → beneath the letter.

export function drawOpenCase(ctx) {
  const { w, h } = ctx;
  ctx.paint('act2-open-case', (c, env) => {
    // the case lies open on the oxblood seat
    c.fillStyle = vgrad(c, 0, h, [[0, '#6b2a22'], [1, '#3e1813']]);
    c.fillRect(-30, -30, w + 60, h + 60);
    speckle(c, 0, 0, w, h, { count: 900, color: 'rgba(0,0,0,0.12)', size: 2, seed: 261 });
    // lid (back) and body
    c.fillStyle = '#4a2f1c';
    roundRectPath(c, w * 0.1, h * 0.04, w * 0.8, h * 0.34, 14); c.fill();
    c.fillStyle = '#7a2a24';
    roundRectPath(c, w * 0.13, h * 0.07, w * 0.74, h * 0.28, 10); c.fill();
    ink(c, [[w * 0.1, h * 0.04], [w * 0.9, h * 0.04], [w * 0.9, h * 0.38], [w * 0.1, h * 0.38]], { w: 2, closed: true });
    c.fillStyle = '#5e3f25';
    roundRectPath(c, w * 0.08, h * 0.38, w * 0.84, h * 0.58, 14); c.fill();
    c.fillStyle = '#8a3a2e';
    roundRectPath(c, w * 0.11, h * 0.41, w * 0.78, h * 0.52, 10); c.fill();
    ink(c, [[w * 0.08, h * 0.38], [w * 0.92, h * 0.38], [w * 0.92, h * 0.96], [w * 0.08, h * 0.96]], { w: 2.2, closed: true });
    // the orchard coat, folded
    c.fillStyle = '#5a4a3a';
    roundRectPath(c, w * 0.14, h * 0.45, w * 0.3, h * 0.42, 12); c.fill();
    ink(c, [[w * 0.16, h * 0.6], [w * 0.42, h * 0.58]], { w: 1.4, alpha: 0.7 });
    ink(c, [[w * 0.2, h * 0.47], [w * 0.29, h * 0.56], [w * 0.38, h * 0.47]], { w: 1.4, alpha: 0.7 });
    [[0.2, 0.7], [0.2, 0.8]].forEach(([u, v]) => { c.fillStyle = PAL.brass; c.beginPath(); c.arc(w * u, h * v, 4, 0, Math.PI * 2); c.fill(); });
    // cotton thread spools
    [0.48, 0.54].forEach((u, i) => {
      c.fillStyle = '#d8ccb0'; c.fillRect(w * u, h * 0.8, 24, 30);
      c.fillStyle = PAL.walnutLight; c.fillRect(w * u - 3, h * 0.8 - 3, 30, 5); c.fillRect(w * u - 3, h * 0.8 + 28, 30, 5);
      c.strokeStyle = 'rgba(120, 100, 70, 0.5)'; for (let k = 0; k < 6; k += 1) { c.beginPath(); c.moveTo(w * u, h * 0.8 + 3 + k * 4.5); c.lineTo(w * u + 24, h * 0.8 + 3 + k * 4.5 + (i ? 1 : -1)); c.stroke(); }
    });
    // a wage envelope with a pressed hawthorn leaf
    c.save(); c.translate(w * 0.24, h * 0.18); c.rotate(-0.12);
    c.fillStyle = '#c9b893'; c.fillRect(0, 0, 90, 50);
    c.fillStyle = '#4f6b3a'; c.beginPath(); c.ellipse(60, 22, 16, 8, 0.6, 0, Math.PI * 2); c.fill();
    inkRect(c, 0, 0, 90, 50, { w: 1.2, alpha: 0.7 });
    c.restore();
    // the unfinished letter
    const [lx, ly, lw, lh] = LETTER_ZOOM;
    c.save();
    c.translate(w * (lx + lw / 2), h * (ly + lh / 2));
    c.rotate(0.06);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 12; c.shadowOffsetY = 5;
    c.fillStyle = '#ece3cc';
    c.fillRect(-70, -54, 140, 108);
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(40, 40, 80, 0.55)'; c.lineWidth = 1.2;
    for (let i = 0; i < 7; i += 1) { c.beginPath(); c.moveTo(-58, -38 + i * 13); for (let x = -58; x < (i === 6 ? 0 : 58); x += 6) c.lineTo(x, -38 + i * 13 + Math.sin(x * 0.4 + i) * 1.4); c.stroke(); }
    inkRect(c, -70, -54, 140, 108, { w: 1.4, color: '#6a5238' });
    c.restore();
    finish(c, env, { vig: 0.55 });
  });
  ctx.glow(w * 0.5, h * 0.2, 260, { color: 0xffb870, alpha: 0.12, flicker: 0.04 });
}

export function drawLetter(ctx) {
  const { w, h } = ctx;
  ctx.paint('act2-letter', (c, env) => {
    c.fillStyle = '#8a3a2e';
    c.fillRect(-30, -30, w + 60, h + 60);
    speckle(c, 0, 0, w, h, { count: 1200, color: 'rgba(0,0,0,0.14)', size: 2.4, seed: 271 });
    c.save();
    c.translate(w * 0.5, h * 0.52);
    c.rotate(0.03);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 24; c.shadowOffsetY = 10;
    c.fillStyle = '#ece3cc';
    c.fillRect(-w * 0.36, -h * 0.42, w * 0.72, h * 0.84);
    c.shadowColor = 'transparent';
    c.fillStyle = 'rgba(30, 30, 70, 0.8)';
    c.font = 'italic 26px Georgia, serif';
    c.fillText('Dear Rosa,', -w * 0.31, -h * 0.28);
    c.strokeStyle = 'rgba(30, 30, 70, 0.55)'; c.lineWidth = 1.6;
    for (let i = 0; i < 7; i += 1) {
      const y = -h * 0.18 + i * h * 0.075;
      const end = i === 6 ? -w * 0.05 : w * 0.3;
      c.beginPath(); c.moveTo(-w * 0.31, y);
      for (let x = -w * 0.31; x < end; x += 5) c.lineTo(x, y + Math.sin(x * 0.33 + i * 2) * 2);
      c.stroke();
    }
    c.fillStyle = 'rgba(30, 30, 70, 0.7)';
    c.font = 'italic 20px Georgia, serif';
    c.fillText('…home Saturday.', -w * 0.31, h * 0.34);
    // the bottom-right corner curls up — something glows beneath
    c.fillStyle = '#d8ccb0';
    c.beginPath(); c.moveTo(w * 0.36, h * 0.24); c.lineTo(w * 0.36, h * 0.42); c.lineTo(w * 0.2, h * 0.42); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255, 140, 60, 0.5)';
    c.beginPath(); c.moveTo(w * 0.36, h * 0.3); c.lineTo(w * 0.36, h * 0.42); c.lineTo(w * 0.25, h * 0.42); c.closePath(); c.fill();
    ink(c, [[-w * 0.36, -h * 0.42], [w * 0.36, -h * 0.42], [w * 0.36, h * 0.24], [w * 0.2, h * 0.42], [-w * 0.36, h * 0.42]], { w: 1.6, closed: true, color: '#6a5238' });
    c.restore();
    finish(c, env, { vig: 0.5 });
  });
  ctx.glow(w * 0.8, h * 0.84, 90, { color: 0xff7a3a, alpha: 0.35, flicker: 0.18 });
}

export function drawBeneath(ctx) {
  const { w, h } = ctx;
  ctx.paint('act2-beneath', (c, env) => {
    // the case lining, and a shallow hollow sewn into it
    c.fillStyle = vgrad(c, 0, h, [[0, '#7a2f26'], [1, '#4a1a14']]);
    c.fillRect(-30, -30, w + 60, h + 60);
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2;
    for (let x = -20; x < w + 20; x += 28) { c.beginPath(); c.moveTo(x, -20); c.lineTo(x + 40, h + 20); c.stroke(); }
    c.fillStyle = 'rgba(20, 8, 5, 0.6)';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.55, w * 0.16, h * 0.2, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(234, 223, 198, 0.55)'; c.setLineDash([6, 6]); c.lineWidth = 2;
    c.beginPath(); c.ellipse(w * 0.5, h * 0.55, w * 0.18, h * 0.23, 0, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    // the letter's edge, lifted back
    c.fillStyle = '#ece3cc';
    c.beginPath(); c.moveTo(-20, -20); c.lineTo(w * 0.62, -20); c.lineTo(w * 0.4, h * 0.2); c.lineTo(-20, h * 0.34); c.closePath(); c.fill();
    ink(c, [[w * 0.62, -20], [w * 0.4, h * 0.2], [-20, h * 0.34]], { w: 1.6, color: '#6a5238' });
    finish(c, env, { vig: 0.55 });
  });
  const stone = ctx.sprite('act2-ember', 80, 96, (c) => {
    c.save();
    c.translate(40, 48);
    const g = c.createRadialGradient(-8, -12, 2, 0, 0, 40);
    g.addColorStop(0, '#fff2c0');
    g.addColorStop(0.25, '#ffb04a');
    g.addColorStop(0.65, '#c2441c');
    g.addColorStop(1, '#4a120a');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -40); c.lineTo(28, -12); c.lineTo(20, 26); c.lineTo(0, 42); c.lineTo(-20, 26); c.lineTo(-28, -12); c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255, 230, 180, 0.8)'; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.beginPath(); c.moveTo(-12, -24); c.lineTo(-2, -32); c.lineTo(-6, -6); c.closePath(); c.fill();
    c.restore();
  }, w * 0.5, h * 0.55);
  const halo = ctx.glow(w * 0.5, h * 0.55, 220, { color: 0xff8a3a, alpha: 0.5, flicker: 0.2 });
  ctx.animate((time) => {
    const taken = ctx.flag('stone:chapter-1');
    stone.setVisible(!taken);
    halo.setVisible(!taken);
    stone.y = h * 0.55 + Math.sin(time / 600) * 3;
  });
}

// ---------------------------------------------------------------------------
// BR "board": the timetable board. BELLWETHER greyed; 1978 — a request stop.

export const STOPS = Object.freeze(['CITY TERMINAL', 'RIVER JUNCTION', 'MILL ROAD', 'HALFWAY HOUSE', 'BELLWETHER']);

/** The big REQUEST STOP plate on the timetable board (1978: punch it through the lens). */
export const REQUEST_STOP = Object.freeze([0.6, 0.57, 0.22, 0.22]);

function boardBase(c, env, w, h, { past = false, requested = false, arrived = false }) {
  backWall(c, w, h, h, { seed: 281, tone: past ? ['#2e2217', '#3a2a1c'] : ['#132126', '#1b2f35'] });
  wainscot(c, w, h, h * 0.84, h + 20, { seed: 282 });
  const bx = w * 0.14;
  const by = h * 0.08;
  const bw = w * 0.72;
  const bh = h * 0.72;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 20; c.shadowOffsetY = 8;
  wood(c, bx - 16, by - 16, bw + 32, bh + 32, { base: '#3f2819', seed: 283 });
  c.restore();
  wood(c, bx - 16, by - 16, bw + 32, bh + 32, { base: '#4a3020', seed: 283 });
  inkRect(c, bx - 16, by - 16, bw + 32, bh + 32, { w: 2.4 });
  // 1978: a cream enamel board, hand-lettered; today: a dark, dead one
  c.fillStyle = past ? '#dccca4' : '#101418';
  c.fillRect(bx, by, bw, bh);
  inkRect(c, bx, by, bw, bh, { w: 1.4, alpha: 0.6 });
  // brass header plate with a small clock
  c.fillStyle = brassFill(c, bx + bw * 0.3, by - 34, bw * 0.4, 26);
  roundRectPath(c, bx + bw * 0.3, by - 34, bw * 0.4, 26, 6); c.fill();
  c.fillStyle = '#ddd0b2'; c.beginPath(); c.arc(bx + bw * 0.5, by - 21, 9, 0, Math.PI * 2); c.fill();
  // the line down the left, a dot per stop
  const rowH = bh / (STOPS.length + 0.6);
  ink(c, [[bx + 40, by + rowH * 0.8], [bx + 40, by + rowH * (STOPS.length - 0.2)]], { w: 3, color: past ? '#2b2118' : '#8a8274', bleed: false });
  let nameEnd = 0;
  let lastY = 0;
  STOPS.forEach((stop, i) => {
    const y = by + rowH * (i + 0.8);
    const last = i === STOPS.length - 1;
    const lit = !last || past || arrived;
    const text = past ? (last ? '#8e2b1f' : '#2b2118') : last ? (arrived ? PAL.amberHot : requested ? '#b08a5a' : '#4f4a44') : '#d8ccb0';
    c.fillStyle = past ? text : last && (arrived || requested) ? PAL.amberHot : lit ? '#d8ccb0' : '#4a4640';
    c.beginPath(); c.arc(bx + 40, y, last ? 9 : 7, 0, Math.PI * 2); c.fill();
    c.font = `700 ${last ? 30 : 26}px "Space Mono", monospace`;
    c.fillStyle = text;
    c.fillText(stop, bx + 70, y + 9);
    if (last) { nameEnd = bx + 70 + c.measureText(stop).width; lastY = y; }
    if (last && arrived) glow(c, bx + 200, y, 180, 'rgba(255, 200, 110, 0.9)', 0.35);
    if (last && requested && !past) glow(c, bx + 40, y, 40, 'rgba(255, 190, 90, 0.95)', 0.7);
  });
  if (past) {
    // a pencilled tick and "Sat." beside BELLWETHER: someone got off here every week
    ink(c, [[nameEnd + 12, lastY - 6], [nameEnd + 20, lastY + 4], [nameEnd + 36, lastY - 20]], { w: 2.4, color: '#2b2118', bleed: false });
    c.font = 'italic 16px Georgia, serif';
    c.fillStyle = '#2b2118';
    c.fillText('Sat.', nameEnd + 8, lastY + 24);
  }
  // the REQUEST STOP plate: a big enamel push-plate with a brass button
  const [rx0, ry0, rw0, rh0] = REQUEST_STOP;
  const rx = rx0 * w;
  const ry = ry0 * h;
  const rw = rw0 * w;
  const rh = rh0 * h;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  c.fillStyle = past ? '#8e2b1f' : arrived ? '#5a2219' : '#221d1a';
  roundRectPath(c, rx, ry, rw, rh, 12); c.fill();
  c.restore();
  c.save();
  c.lineWidth = 4;
  c.strokeStyle = brassFill(c, rx, ry, rw, rh);
  roundRectPath(c, rx + 2, ry + 2, rw - 4, rh - 4, 10); c.stroke();
  c.restore();
  const knobX = rx + rh * 0.5;
  const knobY = ry + rh * 0.5;
  c.fillStyle = brassFill(c, knobX - 22, knobY - 22, 44, 44);
  c.beginPath(); c.arc(knobX, knobY, 21, 0, Math.PI * 2); c.fill();
  c.fillStyle = past ? '#f2e2bc' : '#4a4038';
  c.beginPath(); c.arc(knobX, knobY, 13, 0, Math.PI * 2); c.fill();
  inkEllipse(c, knobX, knobY, 21, 21, { w: 1.6 });
  c.fillStyle = past ? '#ffe6c0' : arrived ? '#d8a070' : '#4a433c';
  c.font = '700 20px "Space Mono", monospace';
  c.fillText('REQUEST', knobX + 30, knobY - 5);
  c.fillText('STOP', knobX + 30, knobY + 21);
  ink(c, [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]], { w: 1.6, closed: true, alpha: 0.7 });
  if (past && requested) {
    // punched: a clean round hole through the enamel, the paper-card board behind
    c.fillStyle = '#1a120c';
    c.beginPath(); c.arc(knobX, knobY, 8, 0, Math.PI * 2); c.fill();
    inkEllipse(c, knobX, knobY, 9, 9, { w: 1.4, color: '#3a2a1c', bleed: false });
    glow(c, knobX, knobY, 70, 'rgba(255, 200, 110, 0.9)', 0.4);
  }
  if (arrived) glow(c, rx + rw * 0.5, ry + rh * 0.5, 110, 'rgba(255, 120, 80, 0.9)', 0.3);
  if (requested && !past && !arrived) glow(c, knobX, knobY, 50, 'rgba(255, 190, 90, 0.9)', 0.35);
}

export function drawBoard(ctx, variant = 'default') {
  const { w, h } = ctx;
  ctx.paint(`act2-board-${variant}`, (c, env) => {
    boardBase(c, env, w, h, { requested: variant !== 'default', arrived: variant === 'arrived' });
    finish(c, env);
  });
  if (variant === 'arrived') ctx.glow(w * 0.5, h * 0.72, 260, { color: 0xffb060, alpha: 0.2, flicker: 0.12 });
  if (variant === 'requested') ctx.glow(w * 0.19, h * 0.7, 80, { color: 0xffb060, alpha: 0.3, flicker: 0.2 });
  ctx.dust(w * 0.1, h * 0.1, w * 0.8, h * 0.7, { count: 8 });
}

export function drawBoardPast(ctx, variant = 'default') {
  const { w, h } = ctx;
  ctx.paint(`act2-board-past-${variant}`, (c, env) => {
    boardBase(c, env, w, h, { past: true, requested: variant !== 'default' });
    finish(c, env);
  });
}

export { amberGlint, hgrad, inkEllipse, inkLine, lightCone, parcel };
