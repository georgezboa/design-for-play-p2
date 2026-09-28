// Chapter 5 · OBJECT PENDING CLASSIFICATION — the four evidence windows of
// the one-answer exhibit (acts/oneAnswer.js), painted in the Chapter 1 panel
// language: ivory ink, dark teal and walnut, amber lamps, the 1978 layer in
// sepia behind the punch-hole lens.
//
//   stub      — Terminal Row platform, Mara's punched city-line ticket stub
//   duplicate — the Echo City reservations office: M. VENN, sealed FILED,
//               the floor torn like Nika's page (whole again in 1978)
//   plate     — Plate IV on the museum wall; zoomed in, Rosa's drawing
//   tag       — the orchard at Bellwether, hidden behind the case's
//               UNCLAIMED tag until the tag is turned
//
// Linked edges line up: the platform/floor at CITY_AT (0.62) between stub and
// duplicate; the stair/lane at DOWN_AT (x 0.5) between duplicate and plate;
// the lane at ORCHARD_AT (0.40) between plate and tag.

import { PAL, brassFill, glow, ink, inkRect, paperTag, rng, roundRectPath, speckle, vgrad, wood } from './ink.js';
import { backWall, finish } from './act1Art.js';
import { cropFull } from './act2Art.js';

export const CITY_AT = 0.62;
export const DOWN_AT = 0.5;
export const ORCHARD_AT = 0.4;
/** The punched hole in the ticket stub (tile-normalised centre). */
export const STUB_HOLE = Object.freeze({ x: 0.235, y: 0.33 });
/** The reservation slip in the office: the FILED seal sits on it. */
export const SLIP_RECT = Object.freeze([0.06, 0.12, 0.3, 0.3]);
/** The framed print on the museum wall (w == h in tile terms: an even zoom). */
export const PRINT_RECT = Object.freeze([0.33, 0.2, 0.34, 0.34]);
/** Where the lens proves the office floor whole (both past edges). */
export const OFFICE_LENS_AT = Object.freeze([0.36, 0.7]);
/** The gap torn through the present office floor, in tile x. */
export const TORN_FLOOR = Object.freeze([0.22, 0.42]);
/** Rosa's lane through the drawing: top centre → left edge. */
export const DRAWING_LANE = Object.freeze([[0.5, 0], [0.48, 0.12], [0.38, 0.24], [0.2, 0.33], [0, ORCHARD_AT]]);
/** The orchard gate at the end of the lane. */
export const ORCHARD_GATE = Object.freeze({ x: 0.34, y: ORCHARD_AT });

const PAST = (env) => env.era === 'past';

function mono(c, text, x, y, size, color = PAL.ink, weight = 700) {
  c.fillStyle = color;
  c.font = `${weight} ${size}px "Space Mono", monospace`;
  c.textBaseline = 'middle';
  c.fillText(text, x, y);
}

function serif(c, text, x, y, size, color = '#2a1d14', italic = false) {
  c.fillStyle = color;
  c.font = `${italic ? 'italic ' : ''}700 ${size}px Georgia, serif`;
  c.textBaseline = 'middle';
  c.fillText(text, x, y);
}

/** A torn-paper edge between two points (jagged, deterministic). */
function tornPath(c, x0, y0, x1, y1, { seed = 1, amp = 6 } = {}) {
  const random = rng(seed);
  const n = Math.max(6, Math.round(Math.hypot(x1 - x0, y1 - y0) / 9));
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const len = Math.hypot(nx, ny) || 1;
    const k = (random() - 0.5) * 2 * amp;
    c.lineTo(x0 + (x1 - x0) * t + (nx / len) * k, y0 + (y1 - y0) * t + (ny / len) * k);
  }
}

function waxSeal(c, x, y, r, { broken = false } = {}) {
  c.save();
  c.fillStyle = '#7a1f16';
  c.shadowColor = 'rgba(0,0,0,0.45)';
  c.shadowBlur = 6;
  c.shadowOffsetY = 2;
  if (!broken) {
    c.beginPath();
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      const rr = r * (0.9 + (i % 2) * 0.12);
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(255,190,160,0.35)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, r * 0.62, 0, Math.PI * 2); c.stroke();
    mono(c, 'FILED', x - r * 0.52, y + 1, Math.round(r * 0.38), '#f0c7b0');
  } else {
    // three fragments, fallen apart
    [[-0.5, 0.2, 0.5], [0.45, -0.1, -0.4], [0.1, 0.55, 0.2]].forEach(([dx, dy, rot], i) => {
      c.save();
      c.translate(x + dx * r, y + dy * r + i * 3);
      c.rotate(rot);
      c.beginPath(); c.moveTo(0, -r * 0.4); c.lineTo(r * 0.45, r * 0.1); c.lineTo(-r * 0.2, r * 0.38); c.closePath();
      c.fill();
      c.restore();
    });
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// "stub" — TERMINAL ROW. The city platform at night; Mara's ticket stub is
// pinned to the noticeboard. The platform runs off the right edge at CITY_AT.

function platformBase(c, env, w, h) {
  const past = PAST(env);
  cropFull(c, env, 'nsv-w03-0', [1960, 140, 1000, 556], w, h);
  c.fillStyle = past ? 'rgba(80, 50, 20, 0.2)' : 'rgba(10, 16, 38, 0.58)';
  c.fillRect(-30, -30, w + 60, h + 60);
  // lit windows across the far city at night
  const random = rng(501);
  for (let i = 0; i < 70; i += 1) {
    c.fillStyle = `rgba(255, ${190 + Math.floor(random() * 40)}, 120, ${0.35 + random() * 0.5})`;
    c.fillRect(random() * w, h * (0.22 + random() * 0.3), 2 + random() * 3, 2 + random() * 2);
  }
  // the canopy: iron roof and brackets
  c.fillStyle = '#141a1c';
  c.fillRect(-20, -20, w + 40, h * 0.12 + 20);
  for (let x = 30; x < w; x += 120) {
    ink(c, [[x, h * 0.12], [x + 26, h * 0.2]], { w: 3, color: '#0c1012', bleed: false });
    ink(c, [[x + 52, h * 0.12], [x + 26, h * 0.2]], { w: 3, color: '#0c1012', bleed: false });
  }
  ink(c, [[-4, h * 0.12], [w + 4, h * 0.12]], { w: 2.2, alpha: 0.8 });
  // the platform: its top is the route at CITY_AT
  const y = CITY_AT * h;
  c.fillStyle = vgrad(c, y, h * 0.8, [[0, past ? '#b89a72' : '#5a5650'], [1, past ? '#7a6042' : '#34302c']]);
  c.fillRect(-20, y, w + 40, h * 0.8 - y);
  c.fillStyle = past ? '#e8d4a0' : '#d8c070';
  c.fillRect(-20, h * 0.8 - 4, w + 40, 4);
  for (let x = -10; x < w + 20; x += 46) { c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 18, h * 0.8); c.stroke(); }
  ink(c, [[-4, y], [w + 4, y]], { w: 2.6 });
  // the track bed and rails below
  c.fillStyle = '#16120f';
  c.fillRect(-20, h * 0.8, w + 40, h * 0.2 + 20);
  speckle(c, 0, h * 0.84, w, h * 0.16, { count: 380, color: 'rgba(200,190,170,0.14)', size: 2, seed: 502 });
  c.fillStyle = brassFill(c, -20, h * 0.9, w + 40, 4);
  c.fillRect(-20, h * 0.9, w + 40, 4);
  // the station nameboard hangs from the canopy
  const nx = w * 0.46;
  const ny = h * 0.2;
  ink(c, [[nx + 20, h * 0.12], [nx + 20, ny]], { w: 2, color: '#0c1012', bleed: false });
  ink(c, [[nx + 180, h * 0.12], [nx + 180, ny]], { w: 2, color: '#0c1012', bleed: false });
  c.fillStyle = past ? '#6b2a22' : '#23434a';
  roundRectPath(c, nx, ny, 200, 34, 5); c.fill();
  mono(c, 'TERMINAL ROW', nx + 22, ny + 18, 19, '#eadfc6');
  inkRect(c, nx, ny, 200, 34, { w: 1.6 });
  // bench and lamp post on the right
  const bx = w * 0.7;
  wood(c, bx, y - 26, w * 0.16, 7, { base: '#5a3a22', seed: 503 });
  wood(c, bx, y - 44, w * 0.16, 6, { base: '#5a3a22', seed: 504 });
  ink(c, [[bx + 6, y - 19], [bx + 4, y]], { w: 2 });
  ink(c, [[bx + w * 0.16 - 6, y - 19], [bx + w * 0.16 - 4, y]], { w: 2 });
  const lx = w * 0.92;
  ink(c, [[lx, y], [lx, h * 0.26]], { w: 3, color: '#1a1410', bleed: false });
  c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(lx, h * 0.25, 7, 0, Math.PI * 2); c.fill();
  glow(c, lx, h * 0.25, 90, 'rgba(255,210,130,0.95)', 0.55);
  // the noticeboard on the left
  const bx0 = w * 0.03;
  const by0 = h * 0.17;
  wood(c, bx0, by0, w * 0.32, h * 0.36, { base: '#4a3121', seed: 505 });
  inkRect(c, bx0, by0, w * 0.32, h * 0.36, { w: 2 });
  ink(c, [[bx0 + 16, by0 + h * 0.36], [bx0 + 16, y]], { w: 3, color: '#1a1410', bleed: false });
  ink(c, [[bx0 + w * 0.32 - 16, by0 + h * 0.36], [bx0 + w * 0.32 - 16, y]], { w: 3, color: '#1a1410', bleed: false });
  if (past) {
    // 1978: a weekend-service poster beside the stub
    c.fillStyle = '#e8d4a0'; c.fillRect(bx0 + 10, by0 + 12, 62, 82);
    mono(c, 'WEEKENDS', bx0 + 14, by0 + 30, 10, '#6b2a22');
    serif(c, 'Bellwether', bx0 + 14, by0 + 52, 13, '#2a1d14', true);
    mono(c, 'SAT 07:10', bx0 + 14, by0 + 74, 10, '#2a1d14');
  }
}

function drawStubTicket(c, w, h, { past = false } = {}) {
  // the stub itself, pinned at one corner
  const x = w * 0.1;
  const y = h * 0.21;
  const tw = w * 0.22;
  const th = h * 0.25;
  c.save();
  c.translate(x, y);
  c.rotate(-0.04);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
  c.fillStyle = past ? '#f2e2bc' : '#e6dcc2';
  c.fillRect(0, 0, tw, th);
  c.shadowColor = 'transparent';
  c.fillStyle = '#23434a';
  c.fillRect(0, 0, tw, th * 0.26);
  mono(c, 'CITY LINE', 8, th * 0.13, 12, '#eadfc6');
  mono(c, '0412', tw - 40, th * 0.13, 11, PAL.amber);
  serif(c, 'Terminal Row', 8, th * 0.46, 14);
  serif(c, '→ Bellwether', 8, th * 0.68, 14);
  mono(c, '17 OCT 1978', 8, th * 0.88, 9, '#6b2a22');
  // perforation on the torn side
  c.fillStyle = past ? '#8a6a48' : '#4a3121';
  for (let py = 4; py < th; py += 9) { c.beginPath(); c.arc(tw, py, 2.4, 0, Math.PI * 2); c.fill(); }
  ink(c, [[0, 0], [tw, 0], [tw, th], [0, th]], { w: 1.2, alpha: 0.6, closed: true, bleed: false });
  c.restore();
  // brass drawing pin
  c.fillStyle = PAL.brass; c.beginPath(); c.arc(x + 6, y + 6, 4, 0, Math.PI * 2); c.fill();
}

export function drawStub(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-stub', (c, env) => {
    platformBase(c, env, w, h);
    drawStubTicket(c, w, h);
    finish(c, env, { vig: 0.45 });
  });
  // the hole the conductor punched — dark once the lens has popped out of it
  const hole = ctx.sprite('oa-stub-hole', 30, 30, (c) => {
    c.fillStyle = 'rgba(8, 6, 4, 0.95)';
    c.beginPath(); c.arc(15, 15, 9, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(60, 40, 25, 0.9)'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(15, 15, 10, 0, Math.PI * 2); c.stroke();
  }, w * STUB_HOLE.x, h * STUB_HOLE.y);
  ctx.animate(() => hole.setVisible(ctx.flag('punched')));
  ctx.glow(w * 0.92, h * 0.25, 170, { color: 0xffc070, alpha: 0.22, flicker: 0.08 });
  ctx.rain(0, h * 0.12, w, h * 0.5, { count: 18 });
}

export function drawStubPast(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-stub-past', (c, env) => {
    platformBase(c, env, w, h);
    drawStubTicket(c, w, h, { past: true });
    // 1978: the Saturday train waits at the platform, doors open
    const ty = h * 0.8;
    c.fillStyle = '#5a2a1e';
    roundRectPath(c, w * 0.38, ty - h * 0.26, w * 0.62 + 30, h * 0.24, 8); c.fill();
    for (let x = w * 0.42; x < w; x += 58) {
      c.fillStyle = 'rgba(255, 214, 150, 0.9)';
      c.fillRect(x, ty - h * 0.22, 36, h * 0.09);
    }
    ink(c, [[w * 0.38, ty - h * 0.26], [w + 30, ty - h * 0.26]], { w: 2 });
    finish(c, env, { vig: 0.4 });
  });
}

// ---------------------------------------------------------------------------
// "duplicate" — RESERVATIONS, ECHO CITY. The office floor enters from the
// left at CITY_AT and drops down a stair through the bottom edge at DOWN_AT.

function officeBase(c, env, w, h, { torn }) {
  const past = PAST(env);
  const y = CITY_AT * h;
  backWall(c, w, h, y, { seed: 511, tone: past ? ['#5a4a32', '#6a583c'] : ['#132328', '#1f383e'] });
  // pigeonholes on the right: the batch the reservation came from
  const px = w * 0.62;
  wood(c, px, h * 0.08, w * 0.34, h * 0.46, { base: '#3a2517', seed: 512 });
  const random = rng(513);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const cx = px + 10 + col * (w * 0.064);
      const cy = h * 0.1 + row * (h * 0.105);
      c.fillStyle = '#0d0907';
      c.fillRect(cx, cy, w * 0.056, h * 0.085);
      if (random() > 0.35) {
        c.fillStyle = past ? '#f2e2bc' : '#d8ccb0';
        c.fillRect(cx + 4, cy + h * 0.03, w * 0.045, h * 0.05);
      }
    }
  }
  inkRect(c, px, h * 0.08, w * 0.34, h * 0.46, { w: 1.6 });
  // the counter under a green banker's lamp
  const cx0 = w * 0.03;
  wood(c, cx0, h * 0.45, w * 0.38, 10, { base: '#6a4a2e', seed: 514 });
  c.fillStyle = '#3a2517'; c.fillRect(cx0 + 6, h * 0.45 + 10, w * 0.38 - 12, y - h * 0.45 - 10);
  inkRect(c, cx0, h * 0.45, w * 0.38, 10, { w: 1.6 });
  c.fillStyle = '#2c4a3a'; c.beginPath(); c.ellipse(w * 0.33, h * 0.43, 26, 10, 0, Math.PI, 0); c.fill();
  ink(c, [[w * 0.33, h * 0.43], [w * 0.33, h * 0.45]], { w: 3, color: PAL.brass, bleed: false });
  glow(c, w * 0.33, h * 0.46, 90, 'rgba(255,210,130,0.9)', 0.35);
  // the floor
  c.fillStyle = vgrad(c, y, h + 20, [[0, past ? '#8a6a48' : '#3b2819'], [1, past ? '#5a4028' : '#150d08']]);
  c.fillRect(-20, y, w + 40, h - y + 20);
  c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.2;
  for (let yy = y + 12; yy < h + 20; yy += 13) { c.beginPath(); c.moveTo(-20, yy); c.lineTo(w + 20, yy); c.stroke(); }
  ink(c, [[-4, y], [w + 4, y]], { w: 2.6 });
  // the stair, down through a trapdoor to the bottom edge at DOWN_AT
  const sx = w * DOWN_AT;
  c.fillStyle = '#0a0706';
  c.beginPath(); c.moveTo(sx - 46, y + 4); c.lineTo(sx + 46, y + 4); c.lineTo(sx + 40, h + 20); c.lineTo(sx - 40, h + 20); c.closePath(); c.fill();
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    const yy = y + 10 + (h - y) * t;
    c.fillStyle = past ? '#a4845c' : '#6d5a44';
    c.fillRect(sx - 36, yy, 72, 5);
    ink(c, [[sx - 36, yy], [sx + 36, yy]], { w: 1.2, alpha: 0.7, bleed: false });
  }
  ink(c, [[sx - 46, y + 4], [sx - 40, h + 6]], { w: 2.2 });
  ink(c, [[sx + 46, y + 4], [sx + 40, h + 6]], { w: 2.2 });
  if (torn) {
    // the present floor is torn through, like a page ripped out of a ledger
    const [t0, t1] = TORN_FLOOR;
    c.save();
    c.fillStyle = '#030202';
    c.beginPath();
    c.moveTo(w * t0, y - 2);
    tornPath(c, w * t0, y - 2, w * t0 - 10, h + 20, { seed: 515, amp: 7 });
    c.lineTo(w * t1 + 14, h + 20);
    tornPath(c, w * t1 + 14, h + 20, w * t1, y - 2, { seed: 516, amp: 7 });
    c.closePath();
    c.fill();
    c.restore();
    // the torn edges show paper fibre, not splintered wood: a page ripped out
    const fringe = (x0, x1, seed) => {
      const random = rng(seed);
      for (let yy = y; yy < h; yy += 7) {
        const x = x0 + (x1 - x0) * ((yy - y) / (h - y)) + (random() - 0.5) * 8;
        c.fillStyle = `rgba(230, 220, 194, ${0.35 + random() * 0.4})`;
        c.fillRect(x - 1, yy, 2 + random() * 5, 2);
      }
    };
    fringe(w * t0, w * t0 - 10, 517);
    fringe(w * t1, w * t1 + 14, 518);
    // a curl of torn paper lying across the gap
    c.fillStyle = 'rgba(214, 204, 178, 0.85)';
    c.beginPath(); c.moveTo(w * (t0 + 0.04), y + 34); c.quadraticCurveTo(w * (t0 + 0.1), y + 20, w * (t0 + 0.14), y + 44); c.lineTo(w * (t0 + 0.12), y + 50); c.quadraticCurveTo(w * (t0 + 0.08), y + 32, w * (t0 + 0.05), y + 42); c.closePath(); c.fill();
    // and the stair's top steps with it
    c.fillStyle = '#030202';
    c.beginPath(); c.moveTo(sx - 48, y + 2); c.lineTo(sx + 12, y + 2); c.lineTo(sx - 20, y + 70); c.lineTo(sx - 48, y + 80); c.closePath(); c.fill();
  }
}

function drawSlip(c, w, h, { past, seal }) {
  const [sx, sy, sw, sh] = SLIP_RECT;
  const x = sx * w;
  const y = sy * h;
  const ww = sw * w;
  const hh = sh * h;
  // Nika's torn page, pinned behind the slip at an angle (not yet torn in 1978)
  if (!past) {
    c.save();
    c.translate(x + ww * 0.78, y + hh * 0.06);
    c.rotate(0.16);
    c.fillStyle = '#d8ccb0';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(ww * 0.42, 0);
    tornPath(c, ww * 0.42, 0, ww * 0.34, hh * 1.1, { seed: 521, amp: 5 });
    c.lineTo(0, hh * 1.1); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(42,29,20,0.3)'; c.lineWidth = 1;
    for (let yy = 14; yy < hh; yy += 12) { c.beginPath(); c.moveTo(6, yy); c.lineTo(ww * 0.3, yy); c.stroke(); }
    mono(c, 'RES 43 · M. VE', 6, 10, 9, '#2a1d14');
    c.restore();
  }
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
  c.fillStyle = past ? '#f2e2bc' : '#e6dcc2';
  c.fillRect(x, y, ww, hh);
  c.restore();
  c.strokeStyle = 'rgba(42,29,20,0.28)'; c.lineWidth = 1;
  for (let yy = y + 34; yy < y + hh - 8; yy += 15) { c.beginPath(); c.moveTo(x + 10, yy); c.lineTo(x + ww - 10, yy); c.stroke(); }
  mono(c, 'RESERVATIONS · ECHO CITY', x + 10, y + 14, 9, '#2a1d14');
  mono(c, 'No 43', x + ww - 44, y + 14, 9, '#6b2a22');
  if (past) {
    serif(c, 'Mara Velez', x + 12, y + hh * 0.42, 19);
    mono(c, '07:10 EASTBOUND', x + 12, y + hh * 0.64, 10, '#2a1d14');
    mono(c, '→ BELLWETHER', x + 12, y + hh * 0.8, 10, '#6b2a22');
  } else {
    mono(c, 'M. VENN', x + 12, y + hh * 0.44, 18, '#2a1d14');
    mono(c, '07:10 EASTBOUND · CASH', x + 12, y + hh * 0.66, 9, '#2a1d14');
    c.save();
    c.translate(x + ww * 0.62, y + hh * 0.84);
    c.rotate(-0.14);
    c.strokeStyle = '#8a2a1e'; c.lineWidth = 2.4;
    c.strokeRect(-48, -11, 96, 22);
    mono(c, 'DUPLICATE', -40, 1, 12, '#8a2a1e');
    c.restore();
  }
  // brass pins
  c.fillStyle = PAL.brass;
  c.beginPath(); c.arc(x + 6, y + 6, 3.5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x + ww - 6, y + 6, 3.5, 0, Math.PI * 2); c.fill();
  if (seal) waxSeal(c, x + ww * 0.78, y + hh * 0.5, 22, { broken: seal === 'broken' });
}

export function drawOfficeFiled(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-office-filed', (c, env) => {
    officeBase(c, env, w, h, { torn: true });
    drawSlip(c, w, h, { past: false, seal: 'whole' });
    finish(c, env, { vig: 0.5 });
  });
  ctx.glow(w * 0.33, h * 0.46, 150, { color: 0xffc070, alpha: 0.2, flicker: 0.1 });
  ctx.dust(0, h * 0.1, w, h * 0.5, { count: 10 });
}

export function drawOfficeOpen(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-office-open', (c, env) => {
    officeBase(c, env, w, h, { torn: true });
    drawSlip(c, w, h, { past: false, seal: 'broken' });
    finish(c, env, { vig: 0.5 });
  });
  ctx.glow(w * 0.33, h * 0.46, 150, { color: 0xffc070, alpha: 0.2, flicker: 0.1 });
  ctx.dust(0, h * 0.1, w, h * 0.5, { count: 10 });
}

export function drawOfficePast(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-office-past', (c, env) => {
    officeBase(c, env, w, h, { torn: false });
    drawSlip(c, w, h, { past: true, seal: null });
    finish(c, env, { vig: 0.45 });
  });
}

// ---------------------------------------------------------------------------
// "plate" — Plate IV on the museum wall; zoomed in, Rosa's drawing.

function rosaDrawing(c, w, h, { past = false, seed = 531 } = {}) {
  const random = rng(seed);
  c.fillStyle = past ? '#efe2c2' : '#d8caa6';
  c.fillRect(-30, -30, w + 60, h + 60);
  // paper tooth
  for (let i = 0; i < (w * h) / 260; i += 1) {
    c.fillStyle = random() > 0.5 ? 'rgba(120, 90, 50, 0.05)' : 'rgba(255, 255, 240, 0.08)';
    c.fillRect(random() * w, random() * h, 2, 2);
  }
  const crayon = (color, width, pts, alpha = 0.85) => {
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass += 1) {
      c.beginPath();
      pts.forEach(([x, y], i) => {
        const jx = (random() - 0.5) * 2.2;
        const jy = (random() - 0.5) * 2.2;
        if (i) c.lineTo(x * w + jx, y * h + jy); else c.moveTo(x * w + jx, y * h + jy);
      });
      c.stroke();
    }
    c.restore();
  };
  const scribble = (color, x0, y0, x1, y1, step = 7, width = 6, alpha = 0.55) => {
    const pts = [];
    for (let x = x0; x <= x1; x += step / w) pts.push([x, (pts.length % 2 ? y0 : y1)]);
    crayon(color, width, pts, alpha);
  };
  // sky scribble and a big sun
  scribble('#8fb4d8', 0.02, 0.02, 0.98, 0.16, 11, 9, 0.35);
  c.fillStyle = 'rgba(224, 162, 74, 0.85)';
  c.beginPath(); c.arc(w * 0.86, h * 0.14, h * 0.07, 0, Math.PI * 2); c.fill();
  for (let k = 0; k < 9; k += 1) {
    const a = (k / 9) * Math.PI * 2;
    crayon('#e0a24a', 4, [[0.86 + Math.cos(a) * 0.05, 0.14 + Math.sin(a) * 0.09], [0.86 + Math.cos(a) * 0.075, 0.14 + Math.sin(a) * 0.135]]);
  }
  // green hills, coloured in
  c.fillStyle = past ? 'rgba(110, 150, 80, 0.62)' : 'rgba(96, 126, 70, 0.5)';
  c.beginPath(); c.moveTo(-20, h * 0.3); c.quadraticCurveTo(w * 0.35, h * 0.2, w * 0.62, h * 0.34); c.quadraticCurveTo(w * 0.85, h * 0.42, w + 20, h * 0.32); c.lineTo(w + 20, h + 20); c.lineTo(-20, h + 20); c.fill();
  scribble('#5d7a44', 0.0, 0.5, 1.0, 0.95, 13, 7, 0.28);
  // orchard trees in rows, with fruit dots
  for (const [tx, ty, s] of [[0.66, 0.5, 1], [0.8, 0.58, 0.9], [0.92, 0.48, 0.8], [0.6, 0.76, 1.1], [0.78, 0.82, 1], [0.36, 0.7, 0.9], [0.2, 0.62, 0.85]]) {
    crayon('#5a3a22', 5 * s, [[tx, ty + 0.1 * s], [tx, ty]]);
    c.fillStyle = 'rgba(79, 120, 58, 0.85)';
    c.beginPath(); c.ellipse(tx * w, ty * h - 14 * s, 26 * s, 18 * s, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c44a3a';
    for (let k = 0; k < 4; k += 1) { c.beginPath(); c.arc(tx * w + (k - 1.5) * 10 * s, ty * h - 12 * s + (k % 2) * 7, 3, 0, Math.PI * 2); c.fill(); }
  }
  // the lane: from the top of the page down to the left edge at ORCHARD_AT
  crayon('#9a7448', 22, DRAWING_LANE, 0.8);
  crayon('#6b4a2e', 4, DRAWING_LANE.map(([x, y]) => [x - 0.018, y]), 0.7);
  crayon('#6b4a2e', 4, DRAWING_LANE.map(([x, y]) => [x + 0.018, y + 0.02]), 0.7);
  // the hawthorn beside the lane: Mara's mark (white blossom)
  crayon('#4a3121', 7, [[0.3, 0.34], [0.29, 0.2], [0.31, 0.1]]);
  c.fillStyle = 'rgba(70, 100, 52, 0.9)';
  c.beginPath(); c.ellipse(w * 0.3, h * 0.12, w * 0.065, h * 0.1, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fbf6ec';
  for (let k = 0; k < 22; k += 1) { c.beginPath(); c.arc(w * (0.25 + random() * 0.1), h * (0.05 + random() * 0.15), 3.2, 0, Math.PI * 2); c.fill(); }
  // two figures, drawn the way a nine-year-old draws her sister and herself
  const figure = (x, y, s, dress) => {
    crayon('#2a1d14', 3, [[x, y - 0.05 * s], [x, y - 0.02 * s]]);
    c.fillStyle = dress;
    c.beginPath(); c.moveTo(x * w, y * h - 0.05 * s * h); c.lineTo(x * w - 10 * s, y * h); c.lineTo(x * w + 10 * s, y * h); c.closePath(); c.fill();
    c.fillStyle = '#2a1d14'; c.beginPath(); c.arc(x * w, y * h - 0.07 * s * h, 5 * s, 0, Math.PI * 2); c.fill();
  };
  figure(0.12, 0.62, 1.1, '#6b2a22');
  figure(0.16, 0.66, 0.8, '#e0a24a');
  if (past) {
    c.save();
    c.translate(w * 0.72, h * 0.93);
    c.rotate(-0.05);
    c.fillStyle = '#6b2a22';
    c.font = 'italic 700 24px Georgia, serif';
    c.fillText('Rosa, age 9', 0, 0);
    c.restore();
  }
}

export function drawPlateWall(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-plate-wall', (c, env) => {
    // a museum wall: graphite panels, a picture rail, a spotlight
    c.fillStyle = vgrad(c, 0, h, [[0, PAST(env) ? '#5a4a36' : '#1e2226'], [1, PAST(env) ? '#3a2e20' : '#101315']]);
    c.fillRect(-30, -30, w + 60, h + 60);
    for (let x = -10; x < w + 20; x += 150) inkRect(c, x + 10, h * 0.06, 130, h * 0.66, { w: 1.2, alpha: 0.18 });
    c.fillStyle = brassFill(c, -20, h * 0.05, w + 40, 5);
    c.fillRect(-20, h * 0.05, w + 40, 5);
    wood(c, -20, h * 0.78, w + 40, h * 0.22 + 20, { base: '#2c1d13', seed: 541, vertical: true, planks: 9 });
    ink(c, [[-4, h * 0.78], [w + 4, h * 0.78]], { w: 2 });
    // the frame, the mount, and the print (a miniature of the drawing)
    const [px, py, pw, ph] = PRINT_RECT;
    const x = px * w;
    const y = py * h;
    const fw = pw * w;
    const fh = ph * h;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 16; c.shadowOffsetY = 6;
    c.fillStyle = '#2c1d13';
    c.fillRect(x - 26, y - 26, fw + 52, fh + 52);
    c.restore();
    c.fillStyle = '#e6dcc2';
    c.fillRect(x - 14, y - 14, fw + 28, fh + 28);
    c.save();
    c.beginPath(); c.rect(x, y, fw, fh); c.clip();
    c.translate(x, y);
    c.scale(fw / w, fh / h);
    rosaDrawing(c, w, h, { past: PAST(env) });
    c.restore();
    inkRect(c, x - 26, y - 26, fw + 52, fh + 52, { w: 2 });
    inkRect(c, x, y, fw, fh, { w: 1.2, alpha: 0.6 });
    // the nameplate
    const plateText = PAST(env) ? 'ROSA VELEZ · AGE 9' : 'PLATE IV · ARTIST UNKNOWN';
    c.font = '700 11px "Space Mono", monospace';
    const plateW = Math.ceil(c.measureText(plateText).width) + 32;
    c.fillStyle = brassFill(c, x + fw / 2 - plateW / 2, y + fh + 44, plateW, 22);
    roundRectPath(c, x + fw / 2 - plateW / 2, y + fh + 40, plateW, 24, 3); c.fill();
    c.textAlign = 'center';
    mono(c, plateText, x + fw / 2, y + fh + 52, 11, '#2a1d14');
    c.textAlign = 'left';
    finish(c, env, { vig: 0.5 });
  });
  ctx.glow(w * 0.5, h * 0.3, 360, { color: 0xffd7a0, alpha: 0.18 });
}

export function drawPlateDrawing(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-plate-drawing', (c, env) => {
    rosaDrawing(c, w, h, { past: PAST(env) });
    // under the museum's glass: a cool reflection, the paper's age
    c.fillStyle = PAST(env) ? 'rgba(80, 50, 20, 0.08)' : 'rgba(20, 30, 50, 0.16)';
    c.fillRect(-30, -30, w + 60, h + 60);
    finish(c, env, { vig: 0.5, grain: 0.24 });
  });
}

// ---------------------------------------------------------------------------
// "tag" — the orchard at Bellwether. The lane runs along the hill crest from
// the right edge (ORCHARD_AT) to the gate; the house is lit. Filed, the whole
// window is hidden behind the orchard case's tag, turned face-down.

function orchardBase(c, env, w, h) {
  const past = PAST(env);
  cropFull(c, env, 'nsv-w07-0', [880, 330, 1300, 722], w, h);
  c.save();
  c.globalCompositeOperation = 'soft-light';
  c.fillStyle = 'rgba(255, 170, 120, 0.3)';
  c.fillRect(-30, -30, w + 60, h + 60);
  c.restore();
  // the hill: its crest is the lane
  const y = ORCHARD_AT * h;
  c.fillStyle = vgrad(c, y - 10, h + 20, [[0, past ? '#6a7a44' : '#2c3524'], [1, past ? '#3a4424' : '#0e120c']]);
  c.beginPath();
  c.moveTo(-20, y + 6); c.lineTo(w * 0.2, y + 2); c.lineTo(w + 20, y);
  c.lineTo(w + 20, h + 20); c.lineTo(-20, h + 20); c.closePath(); c.fill();
  c.fillStyle = past ? '#b09068' : '#6d5a44';
  c.fillRect(w * ORCHARD_GATE.x - 10, y, w * (1 - ORCHARD_GATE.x) + 30, 9);
  ink(c, [[w * ORCHARD_GATE.x - 12, y], [w + 4, y]], { w: 2.4 });
  // orchard rows down the slope
  const random = rng(551);
  for (let row = 0; row < 3; row += 1) {
    for (let i = 0; i < 9; i += 1) {
      const tx = w * (0.08 + i * 0.11 + row * 0.03);
      const ty = h * (0.56 + row * 0.15);
      ink(c, [[tx, ty], [tx, ty - 16]], { w: 3, color: '#1a1410', alpha: 1, bleed: false });
      c.fillStyle = past ? 'rgba(120, 150, 80, 0.95)' : 'rgba(40, 56, 34, 0.95)';
      c.beginPath(); c.ellipse(tx, ty - 22, 20, 13, 0, 0, Math.PI * 2); c.fill();
      if (past) {
        c.fillStyle = '#fbf2ea';
        for (let k = 0; k < 6; k += 1) c.fillRect(tx - 16 + random() * 32, ty - 30 + random() * 14, 3, 3);
      }
    }
  }
  // the orchard house at the end of the lane, lit
  const hx = w * 0.06;
  const hy = y - h * 0.26;
  c.fillStyle = past ? '#a88a64' : '#2e2a26';
  c.fillRect(hx, hy, w * 0.22, h * 0.26);
  c.fillStyle = past ? '#6b2a22' : '#3a2320';
  c.beginPath(); c.moveTo(hx - 12, hy + 2); c.lineTo(hx + w * 0.11, hy - h * 0.12); c.lineTo(hx + w * 0.22 + 12, hy + 2); c.closePath(); c.fill();
  ink(c, [[hx - 12, hy + 2], [hx + w * 0.11, hy - h * 0.12], [hx + w * 0.22 + 12, hy + 2]], { w: 2 });
  for (const [wx, wy] of [[0.035, 0.06], [0.135, 0.06]]) {
    c.fillStyle = 'rgba(255, 206, 130, 0.95)';
    c.fillRect(hx + w * wx, hy + h * wy, w * 0.045, h * 0.07);
    glow(c, hx + w * wx + w * 0.022, hy + h * wy + h * 0.035, 40, 'rgba(255,200,120,0.9)', 0.5);
  }
  c.fillStyle = '#1a120c'; c.fillRect(hx + w * 0.09, hy + h * 0.15, w * 0.04, h * 0.11);
  inkRect(c, hx, hy, w * 0.22, h * 0.26, { w: 2 });
  // the gate and the hawthorn beside it
  const gx = w * ORCHARD_GATE.x;
  ink(c, [[gx - 4, y], [gx - 4, y - 30]], { w: 3, bleed: false });
  ink(c, [[gx + 16, y], [gx + 16, y - 30]], { w: 3, bleed: false });
  ink(c, [[gx - 4, y - 22], [gx + 16, y - 12]], { w: 2, bleed: false });
  ink(c, [[gx + 40, y], [gx + 38, y - 50], [gx + 44, y - 80]], { w: 6, color: '#241a12', alpha: 1, bleed: false });
  c.fillStyle = past ? '#556b3a' : '#34422a';
  c.beginPath(); c.ellipse(gx + 44, y - 92, 38, 26, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(244, 238, 228, 0.95)';
  for (let k = 0; k < 30; k += 1) { c.beginPath(); c.arc(gx + 12 + random() * 64, y - 110 + random() * 36, 2.2, 0, Math.PI * 2); c.fill(); }
}

function bigTagBack(c, w, h, { past = false } = {}) {
  // the case's luggage tag, face-down, hanging over the whole window
  c.fillStyle = 'rgba(5, 4, 3, 0.55)';
  c.fillRect(-30, -30, w + 60, h + 60);
  const x = w * 0.14;
  const y = h * 0.12;
  const tw = w * 0.72;
  const th = h * 0.76;
  ink(c, [[w * 0.5, -10], [x + 30, y + th / 2]], { w: 2, color: '#d8c8a0', alpha: 0.8, bleed: false });
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 18; c.shadowOffsetY = 8;
  c.fillStyle = past ? '#f2e2bc' : '#d6ccb2';
  c.beginPath();
  c.moveTo(x + 60, y); c.lineTo(x + tw, y); c.lineTo(x + tw, y + th); c.lineTo(x + 60, y + th); c.lineTo(x, y + th / 2); c.closePath();
  c.fill();
  c.restore();
  c.fillStyle = 'rgba(30, 20, 12, 0.9)';
  c.beginPath(); c.arc(x + 44, y + th / 2, 12, 0, Math.PI * 2); c.fill();
  c.strokeStyle = PAL.brass; c.lineWidth = 3; c.beginPath(); c.arc(x + 44, y + th / 2, 15, 0, Math.PI * 2); c.stroke();
  if (past) {
    // in 1978 the tag had been written the right way round
    serif(c, 'Bellwether', x + 110, y + th * 0.38, 54, '#2a1d14', true);
    mono(c, 'THE ORCHARD HOUSE · M. VELEZ', x + 114, y + th * 0.62, 18, '#6b2a22');
  } else {
    c.save();
    c.translate(x + tw * 0.56, y + th * 0.46);
    c.rotate(-0.08);
    c.strokeStyle = '#8a2a1e'; c.lineWidth = 5;
    c.strokeRect(-190, -40, 380, 80);
    mono(c, 'UNCLAIMED', -150, 2, 42, '#8a2a1e');
    c.restore();
    mono(c, 'NO FORWARDING ADDRESS · CLAIM 1978-0412', x + 100, y + th * 0.8, 15, '#3a2a1c');
  }
  ink(c, [[x + 60, y], [x + tw, y], [x + tw, y + th], [x + 60, y + th], [x, y + th / 2]], { w: 2, closed: true, color: '#2a1d14', alpha: 0.6 });
}

export function drawTagFiled(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-tag-filed', (c, env) => {
    orchardBase(c, env, w, h);
    bigTagBack(c, w, h, { past: PAST(env) });
    finish(c, env, { vig: 0.5 });
  });
}

export function drawTagFace(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-tag-face', (c, env) => {
    orchardBase(c, env, w, h);
    // the tag, turned: now small, hung on a nail at the top right
    paperTag(c, w * 0.8, h * 0.14, { angle: 0.25, scale: 2.6, glint: false, text: 'BELLWETHER', string: [w * 0.76, -10], seed: 561 });
    finish(c, env, { vig: 0.45 });
  });
  ctx.glow(w * 0.13, h * 0.24, 140, { color: 0xffc070, alpha: 0.3, flicker: 0.1 });
  ctx.dust(0, h * 0.1, w, h * 0.5, { count: 10, color: 0xffe8c0 });
}

export function drawTagPast(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-tag-past', (c, env) => {
    orchardBase(c, env, w, h);
    finish(c, env, { vig: 0.4 });
  });
}

export function drawTagFiledPast(ctx) {
  const { w, h } = ctx;
  ctx.paint('oa-tag-filed-past', (c, env) => {
    orchardBase(c, env, w, h);
    bigTagBack(c, w, h, { past: true });
    finish(c, env, { vig: 0.45 });
  });
}
