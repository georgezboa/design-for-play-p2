// Painters shared by the two Museum → finale cutscenes
// (scenes/chapter5ToConductor.js and scenes/chapter5ToBlackKnife.js):
// the museum hall in walnut and brass, seen down its length; Butch standing
// with his back to us (the ending's seated back view, on his feet); the five
// magic stones; the black ticket. Stage units (1600 × 800), Chapter 1's ink
// language, as painters.js.

import {
  PAL, brassFill, glow, ink, inkRect, rng, roundRectPath, vgrad, wood,
} from './painters.js';
import { CONDUCTOR_PARTS } from '../../chapters/nightService/art/figures.js';
import { CONDUCTOR_HEAD_PART, CONDUCTOR_TORSO_PART } from '../../chapters/finalBoss/conductorFigure.js';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function lit(c, path, x, y, r, alpha, color = '255, 170, 92') {
  c.save();
  c.clip(path);
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color}, ${alpha})`);
  g.addColorStop(0.45, `rgba(${color}, ${alpha * 0.45})`);
  g.addColorStop(1, `rgba(${color}, 0)`);
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}

// ---------------------------------------------------------------------------
// the museum hall, in one-point perspective down its length

/**
 * The hall's geometry. A point (X, Y) on the near picture plane at depth z
 * lands at VP + (P - VP) / (1 + z). The walls stand at X = -100 and 1700,
 * the floor at Y = 860, the ceiling at -40, the far wall at z = FAR.
 */
export const HALL = Object.freeze({
  vp: [800, 330], left: -100, right: 1700, floor: 860, ceil: -40, far: 4,
  gauge: [690, 910], // the floor's brass inlay (and then the rails), X at the near plane
  cases: [[0.22, 0.72], [0.98, 1.42], [1.68, 2.06], [2.34, 2.68], [2.96, 3.26]],
});

/** Project (X, Y) on the near plane at depth z to the stage. */
export function hallPoint(X, Y, z) {
  const k = 1 / (1 + z);
  return [HALL.vp[0] + (X - HALL.vp[0]) * k, HALL.vp[1] + (Y - HALL.vp[1]) * k];
}

/** The depth z at which the floor reaches stage row y (for y below the horizon). */
export function hallFloorDepth(y) {
  return (HALL.floor - HALL.vp[1]) / Math.max(1e-3, y - HALL.vp[1]) - 1;
}

const quad = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };

/** Each lamp of the hall: the display case it lights, its side, where its hood and glass are. */
export function hallLamps() {
  const lamps = [];
  HALL.cases.forEach(([z0, z1], i) => {
    [-1, 1].forEach((side) => {
      const X = side < 0 ? HALL.left : HALL.right;
      const zm = (z0 + z1) / 2;
      lamps.push({
        index: lamps.length, ring: i, side, z0, z1,
        hood: hallPoint(X, 300, zm),
        glass: [hallPoint(X, 380, z0), hallPoint(X, 380, z1), hallPoint(X, 640, z1), hallPoint(X, 640, z0)],
        pool: hallPoint(X + side * -260, HALL.floor, zm),
        scale: 1 / (1 + zm),
      });
    });
  });
  return lamps;
}

/** A thing on show in a case, drawn flat on the wall plane (squashed by its depth). */
function caseObject(c, kind, pts, seed) {
  const [a, b, cc, d] = pts;
  const cx = (a[0] + b[0] + cc[0] + d[0]) / 4;
  const cy = (a[1] + b[1] + cc[1] + d[1]) / 4;
  const wv = Math.abs(b[0] - a[0]);
  const hv = Math.abs(d[1] - a[1]);
  c.save();
  if (kind === 0) { // a ticket on a stand
    c.fillStyle = '#e8c27a'; c.fillRect(cx - wv * 0.3, cy - hv * 0.12, wv * 0.6, hv * 0.22);
    c.fillStyle = 'rgba(107, 42, 34, 0.9)'; c.fillRect(cx - wv * 0.3, cy - hv * 0.12, wv * 0.1, hv * 0.22);
  } else if (kind === 1) { // a letter
    c.fillStyle = '#e6dcc2'; c.fillRect(cx - wv * 0.26, cy - hv * 0.22, wv * 0.52, hv * 0.36);
    c.strokeStyle = 'rgba(60, 40, 25, 0.5)'; c.lineWidth = Math.max(0.6, hv * 0.01);
    for (let i = 0; i < 4; i += 1) { c.beginPath(); c.moveTo(cx - wv * 0.2, cy - hv * 0.14 + i * hv * 0.07); c.lineTo(cx + wv * 0.18, cy - hv * 0.14 + i * hv * 0.07); c.stroke(); }
  } else if (kind === 2) { // a framed drawing
    c.fillStyle = PAL.brassDark; c.fillRect(cx - wv * 0.34, cy - hv * 0.3, wv * 0.68, hv * 0.5);
    c.fillStyle = '#ece3cf'; c.fillRect(cx - wv * 0.28, cy - hv * 0.25, wv * 0.56, hv * 0.4);
    c.fillStyle = 'rgba(176, 52, 42, 0.6)'; c.beginPath(); c.ellipse(cx - wv * 0.06, cy + hv * 0.04, wv * 0.1, hv * 0.05, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(127, 154, 106, 0.55)'; c.beginPath(); c.ellipse(cx + wv * 0.1, cy - hv * 0.08, wv * 0.1, hv * 0.07, 0, 0, TAU); c.fill();
  } else if (kind === 3) { // a case
    c.fillStyle = '#5a3820'; c.fillRect(cx - wv * 0.3, cy - hv * 0.14, wv * 0.6, hv * 0.34);
    c.fillStyle = PAL.brass; c.fillRect(cx - wv * 0.18, cy - hv * 0.14, wv * 0.05, hv * 0.34); c.fillRect(cx + wv * 0.13, cy - hv * 0.14, wv * 0.05, hv * 0.34);
  } else { // a lantern
    c.fillStyle = PAL.brassDark; c.fillRect(cx - wv * 0.1, cy - hv * 0.2, wv * 0.2, hv * 0.36);
    c.fillStyle = 'rgba(255, 220, 150, 0.45)'; c.fillRect(cx - wv * 0.07, cy - hv * 0.15, wv * 0.14, hv * 0.24);
  }
  // a little brass label under it
  c.fillStyle = 'rgba(227, 194, 126, 0.7)';
  c.fillRect(cx - wv * 0.18, cy + hv * 0.32, wv * 0.36, Math.max(1, hv * 0.04));
  c.restore();
  void seed;
}

/**
 * The hall, static, every case lit. Live parts (the lamps' glow, the cases
 * going dark, the rails) are drawn over it by drawHallLight / the shots.
 * `end` 'doors' paints the brass doors at the far end; 'carriage' leaves
 * the far wall plain (a shot paints its own door there).
 */
export function paintMuseumHall(c, w, h, { end = 'doors', seed = 7100 } = {}) {
  const { left, right, floor, ceil, far } = HALL;
  const nearTL = hallPoint(left, ceil, 0); const nearTR = hallPoint(right, ceil, 0);
  const nearBL = hallPoint(left, floor, 0); const nearBR = hallPoint(right, floor, 0);
  const farTL = hallPoint(left, ceil, far); const farTR = hallPoint(right, ceil, far);
  const farBL = hallPoint(left, floor, far); const farBR = hallPoint(right, floor, far);
  c.fillStyle = '#0b0705';
  c.fillRect(-20, -20, w + 40, h + 40);
  // ceiling: coffered walnut
  c.fillStyle = vgrad(c, 0, farTL[1], [[0, '#120b07'], [1, '#22160e']]);
  quad(c, [nearTL, nearTR, farTR, farTL]); c.fill();
  for (let z = 0.3; z < far; z += 0.45) {
    const a = hallPoint(left, ceil, z); const b = hallPoint(right, ceil, z);
    ink(c, [a, b], { w: 2.4 / (1 + z) + 0.6, alpha: 0.35, color: '#3a2717', bleed: false, jitter: 0.2, seed: seed + Math.round(z * 10) });
  }
  [400, 800, 1200].forEach((X, i) => ink(c, [hallPoint(X, ceil, 0), hallPoint(X, ceil, far)], { w: 1.6, alpha: 0.3, color: '#3a2717', bleed: false, jitter: 0.2, seed: seed + 40 + i }));
  // walls: walnut panelling, a brass picture rail and a dado rail
  [[nearTL, farTL, farBL, nearBL, left], [nearTR, farTR, farBR, nearBR, right]].forEach(([a, b, cc, d, X], i) => {
    c.save();
    quad(c, [a, b, cc, d]); c.clip();
    wood(c, Math.min(a[0], b[0]) - 10, -20, Math.abs(b[0] - a[0]) + 20, h + 40, { base: '#2a1a10', vertical: true, seed: seed + 10 + i, grain: 'rgba(0,0,0,0.3)' });
    c.fillStyle = i ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.28)';
    c.fillRect(-20, -20, w + 40, h + 40);
    // panel seams between the cases
    for (let z = 0.1; z < far; z += 0.35) {
      const p = hallPoint(X, 140, z); const q = hallPoint(X, floor - 40, z);
      ink(c, [p, q], { w: 1.8 / (1 + z) + 0.5, alpha: 0.35, color: '#120a05', bleed: false, jitter: 0.2, seed: seed + 20 + Math.round(z * 10) + i * 50 });
    }
    // picture rail and dado: brass lines running to the far wall
    [[230, 5], [680, 4]].forEach(([Y, t], k) => {
      const p0 = hallPoint(X, Y, 0); const p1 = hallPoint(X, Y, far);
      c.strokeStyle = brassFill(c, Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.abs(p1[0] - p0[0]) + 1, Math.abs(p1[1] - p0[1]) + 1);
      c.lineWidth = t; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
      void k;
    });
    c.restore();
  });
  // the far wall, and what stands at the end of the hall
  c.fillStyle = vgrad(c, farTL[1], farBL[1], [[0, '#1d130c'], [1, '#2a1b10']]);
  quad(c, [farTL, farTR, farBR, farBL]); c.fill();
  if (end === 'doors') {
    const dw = 150; const dh = 150;
    const x0 = 800 - dw / 2; const y0 = farBL[1] - dh;
    c.fillStyle = '#120c08'; c.fillRect(x0 - 8, y0 - 8, dw + 16, dh + 8);
    [0, 1].forEach((k) => {
      c.fillStyle = brassFill(c, x0 + k * dw / 2, y0, dw / 2, dh, true);
      c.globalAlpha = 0.55; c.fillRect(x0 + k * dw / 2 + 2, y0, dw / 2 - 4, dh); c.globalAlpha = 1;
      inkRect(c, x0 + k * dw / 2 + 10, y0 + 12, dw / 2 - 20, dh * 0.4, { w: 1.2, alpha: 0.45, bleed: false, seed: seed + 60 + k });
      inkRect(c, x0 + k * dw / 2 + 10, y0 + dh * 0.5, dw / 2 - 20, dh * 0.42, { w: 1.2, alpha: 0.45, bleed: false, seed: seed + 62 + k });
    });
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(799, y0, 2, dh);
    c.fillStyle = PAL.brassLight; c.font = '700 11px "Space Mono", monospace'; c.textAlign = 'center';
    c.fillText('ACCESSIONS', 800, y0 - 16);
    c.textAlign = 'left';
  }
  // the floor: walnut boards running down the hall, the brass inlay up the middle
  c.fillStyle = vgrad(c, farBL[1], h, [[0, '#24170e'], [1, '#3a2818']]);
  quad(c, [nearBL, nearBR, farBR, farBL]); c.fill();
  c.save();
  quad(c, [nearBL, nearBR, farBR, farBL]); c.clip();
  for (let X = left; X <= right; X += 75) ink(c, [hallPoint(X, floor, 0), hallPoint(X, floor, far)], { w: 1.1, alpha: 0.32, color: '#0e0805', bleed: false, jitter: 0.1, seed: seed + 70 + X });
  const random = rng(seed + 80);
  for (let z = 0.05; z < far; z += 0.12 + z * 0.05) {
    for (let X = left; X < right; X += 75) {
      if (random() > 0.35) continue;
      ink(c, [hallPoint(X, floor, z), hallPoint(X + 75, floor, z)], { w: 0.9, alpha: 0.28, color: '#0e0805', bleed: false, jitter: 0.05, seed: seed + 90 + Math.round(X + z * 100) });
    }
  }
  // the inlay: two brass strips, light maple lozenges between them
  const [g0, g1] = HALL.gauge;
  for (let z = 0.08; z < far - 0.1; z += 0.22) {
    const a = hallPoint(g0 + 24, floor, z); const b = hallPoint(g1 - 24, floor, z);
    const cc = hallPoint(g1 - 24, floor, z + 0.09); const d = hallPoint(g0 + 24, floor, z + 0.09);
    c.fillStyle = 'rgba(176, 140, 96, 0.34)';
    quad(c, [a, b, cc, d]); c.fill();
  }
  [g0, g1].forEach((X) => {
    const p0 = hallPoint(X, floor, 0); const p1 = hallPoint(X, floor, far);
    c.strokeStyle = 'rgba(176, 138, 74, 0.75)'; c.lineWidth = 7;
    c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
  });
  c.restore();
  // the cases: lit glass, each holding something from the journey, a brass frame
  hallLamps().forEach((lamp, i) => {
    c.fillStyle = vgrad(c, Math.min(lamp.glass[0][1], lamp.glass[1][1]), Math.max(lamp.glass[2][1], lamp.glass[3][1]), [[0, '#6a4a2a'], [0.5, '#4a321c'], [1, '#2a1a0e']]);
    quad(c, lamp.glass); c.fill();
    caseObject(c, i % 5, lamp.glass, seed + 100 + i);
    c.save();
    quad(c, lamp.glass); c.clip();
    c.fillStyle = 'rgba(255, 220, 160, 0.14)';
    c.fillRect(-20, -20, w + 40, h + 40);
    c.restore();
    c.lineWidth = 5 * lamp.scale + 1;
    c.strokeStyle = brassFill(c, lamp.glass[0][0], lamp.glass[0][1], 40, 200);
    quad(c, lamp.glass); c.stroke();
    // the lamp's brass hood over the case
    const [hx, hy] = lamp.hood;
    const s = lamp.scale;
    c.fillStyle = PAL.brassDark;
    c.beginPath(); c.ellipse(hx, hy, 30 * s, 9 * s, 0, 0, TAU); c.fill();
    c.fillStyle = PAL.brass;
    c.fillRect(hx - 2 * s, hy - 40 * s, 4 * s, 40 * s);
  });
  // the edges of the hall: ink where wall meets floor and ceiling
  [[nearBL, farBL], [nearBR, farBR], [nearTL, farTL], [nearTR, farTR]].forEach(([a, b], i) => ink(c, [a, b], { w: 2.4, alpha: 0.6, bleed: false, jitter: 0.3, seed: seed + 140 + i }));
  ink(c, [farTL, farTR, farBR, farBL], { w: 1.6, closed: true, alpha: 0.5, bleed: false, jitter: 0.2, seed: seed + 150 });
}

/**
 * The hall's lamps, live: `on(lamp)` 0..1 for each lamp. A lamp that is out
 * leaves its case dark; the whole hall sinks as the lamps go.
 */
export function drawHallLight(c, w, h, on, { flicker = 0 } = {}) {
  const lamps = hallLamps();
  let sum = 0;
  lamps.forEach((lamp) => {
    const k = clamp(on(lamp), 0, 1);
    sum += k;
    if (k < 1) {
      c.fillStyle = `rgba(6, 4, 3, ${0.86 * (1 - k)})`;
      quad(c, lamp.glass); c.fill();
    }
    if (k > 0) {
      const s = lamp.scale;
      const [hx, hy] = lamp.hood;
      glow(c, hx, hy + 8 * s, 70 * s, 'rgba(255, 214, 150, 1)', 0.55 * k * (1 + flicker));
      // its light down the wall and over the floor in front of the case
      const [px, py] = lamp.pool;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.translate(px, py);
      c.scale(1, 0.32);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 380 * s);
      g.addColorStop(0, `rgba(255, 176, 96, ${0.18 * k})`);
      g.addColorStop(1, 'rgba(255, 176, 96, 0)');
      c.fillStyle = g;
      c.fillRect(-380 * s, -380 * s, 760 * s, 760 * s);
      c.restore();
    }
  });
  // the hall's shade: deeper as the lamps go out
  const dark = 1 - sum / lamps.length;
  c.fillStyle = `rgba(4, 3, 4, ${0.62 * dark})`;
  c.fillRect(-20, -20, w + 40, h + 40);
  return dark;
}

/**
 * The rails the inlay becomes: steel-capped brass rails on dark sleepers,
 * running from the near plane to depth `toZ` (painted once, revealed by the
 * shot with a clip).
 */
export function paintHallRails(c, w, h, { toZ = HALL.far, seed = 7300 } = {}) {
  const { floor } = HALL;
  const [g0, g1] = HALL.gauge;
  // sleepers, near to far
  for (let z = 0.02; z < toZ - 0.05; z += 0.11) {
    const a = hallPoint(g0 - 70, floor, z); const b = hallPoint(g1 + 70, floor, z);
    const cc = hallPoint(g1 + 70, floor, z + 0.05); const d = hallPoint(g0 - 70, floor, z + 0.05);
    c.fillStyle = '#140d09';
    quad(c, [a, b, cc, d]); c.fill();
    c.fillStyle = 'rgba(234, 223, 198, 0.08)';
    quad(c, [d, cc, hallPoint(g1 + 70, floor, z + 0.035), hallPoint(g0 - 70, floor, z + 0.035)]); c.fill();
    ink(c, [d, cc], { w: 1.6 / (1 + z) + 0.4, alpha: 0.5, bleed: false, jitter: 0.1, seed: seed + Math.round(z * 100) });
  }
  // the rails: a dark web, a bright head
  [g0, g1].forEach((X, i) => {
    const p0 = hallPoint(X, floor, 0); const p1 = hallPoint(X, floor, toZ);
    c.lineCap = 'round';
    c.strokeStyle = '#0b0806'; c.lineWidth = 16;
    c.beginPath(); c.moveTo(p0[0], p0[1] + 6); c.lineTo(p1[0], p1[1] + 1); c.stroke();
    c.strokeStyle = PAL.brass; c.lineWidth = 9;
    c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
    c.strokeStyle = 'rgba(255, 236, 196, 0.8)'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(p0[0] + (i ? -2 : 2), p0[1] - 3); c.lineTo(p1[0], p1[1] - 0.5); c.stroke();
    ink(c, [p0, p1], { w: 1.4, alpha: 0.5, bleed: false, jitter: 0.1, color: '#06080c', seed: seed + 200 + i });
  });
}

// ---------------------------------------------------------------------------
// Butch standing, seen from behind: the ending's back view (drawButchBack)
// on his feet. Units match drawButchBack: shoulders at -60, cap top at -95;
// he stands at y = 82 (feet). `arm` lifts his lamp arm (0 hanging, about
// -2 raised out and up); `lampSide` 1 carries it in his right hand.

export function drawButchStandingBack(c, x, y, s, { lampSide = 1, light = 1, arm = 0, phase = 0, glowAlpha = 0.6, flame = 1 } = {}) {
  const feet = 82;
  const sway = Math.sin(phase) * 0.03;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.translate(0, -feet);
  // shadow on the floor
  c.fillStyle = 'rgba(0, 0, 0, 0.45)';
  c.beginPath(); c.ellipse(0, feet, 26, 5, 0, 0, TAU); c.fill();
  // legs and boots under the coat's hem
  c.fillStyle = '#0d141c';
  c.fillRect(-11, 50, 8, 28); c.fillRect(3, 50, 8, 28);
  c.fillStyle = '#08090c';
  roundRectPath(c, -12.5, 75, 10.5, 7, 2); c.fill();
  roundRectPath(c, 2, 75, 10.5, 7, 2); c.fill();
  // the long coat, back view: shoulders, the vent, the hem at the shins
  const coat = new Path2D();
  coat.moveTo(-5, -60); coat.quadraticCurveTo(-14, -58, -20, -48); coat.quadraticCurveTo(-25, -24, -23, 0);
  coat.quadraticCurveTo(-25, 30, -27, 58); coat.quadraticCurveTo(0, 63, 27, 58); coat.quadraticCurveTo(25, 30, 23, 0);
  coat.quadraticCurveTo(25, -24, 20, -48); coat.quadraticCurveTo(14, -58, 5, -60); coat.closePath();
  c.fillStyle = vgrad(c, -60, 60, [[0, '#152730'], [0.6, '#0e1b22'], [1, '#0a1318']]);
  c.fill(coat);
  c.save(); c.clip(coat);
  c.fillStyle = 'rgba(0,0,0,0.32)'; c.fillRect(-1, 12, 2, 50);
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(-26, -2, 52, 3); // the half belt
  c.fillStyle = PAL.brassLight; c.beginPath(); c.arc(-9, -0.5, 1.3, 0, TAU); c.arc(9, -0.5, 1.3, 0, TAU); c.fill();
  c.strokeStyle = PAL.oxblood; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-17, -50); c.lineTo(14, 6); c.stroke();
  c.restore();
  lit(c, coat, 34 * lampSide, -20, 70, 0.3 * light);
  ink(c, [[-5, -60], [-14, -58], [-20, -48], [-25, -24], [-23, 0], [-25, 30], [-27, 58], [0, 63], [27, 58], [25, 30], [23, 0], [25, -24], [20, -48], [14, -58], [5, -60]], { w: 1.8 / s * 1.6, alpha: 0.6, bleed: false, jitter: 0.2, color: '#06080c', seed: 6710 });
  ink(c, lampSide > 0 ? [[14, -58], [20, -48], [25, -24], [23, 0], [25, 30], [27, 56]] : [[-14, -58], [-20, -48], [-25, -24], [-23, 0], [-25, 30], [-27, 56]], { w: 2.2 / s * 1.6, alpha: 0.65 * light, bleed: true, jitter: 0.15, color: '#ffc988', seed: 6711 });
  // the far arm hangs straight
  const farArm = new Path2D();
  const fx = -20 * lampSide;
  farArm.moveTo(fx - 5, -50); farArm.lineTo(fx + 5, -50); farArm.lineTo(fx + 4 * lampSide + 4, -6); farArm.lineTo(fx + 4 * lampSide - 4, -6); farArm.closePath();
  c.fillStyle = '#0d1a20'; c.fill(farArm);
  c.fillStyle = '#4e392b'; c.beginPath(); c.ellipse(fx + 4 * lampSide, -3, 3.4, 3.8, 0, 0, TAU); c.fill();
  // head, collar, cap (drawButchBack's)
  c.save();
  c.rotate(sway);
  // the nape and the ears (his skin, the title's), the short dark-brown hair over them
  c.fillStyle = '#4e392b';
  c.fillRect(-3.6, -72, 7.2, 5);
  [-1, 1].forEach((side) => { c.beginPath(); c.ellipse(side * 6.6, -76.5, 1.7, 2.8, side * 0.2, 0, TAU); c.fill(); });
  const hair = new Path2D();
  hair.moveTo(-6.4, -82); hair.quadraticCurveTo(-7.2, -74, -4.6, -70.6); hair.quadraticCurveTo(0, -69.4, 4.6, -70.6); hair.quadraticCurveTo(7.2, -74, 6.4, -82); hair.closePath();
  c.fillStyle = '#2a1b12'; c.fill(hair);
  lit(c, hair, 14 * lampSide, -76, 14, 0.5 * light);
  [-3.2, 0, 3.2].forEach((hx, i) => ink(c, [[hx - 0.6, -81], [hx, -76], [hx + 0.4, -71.4]], { w: 0.7 / s * 1.6, alpha: 0.45, bleed: false, jitter: 0.05, color: '#120b07', seed: 6720 + i }));
  ink(c, lampSide > 0 ? [[6, -81], [6.6, -76], [4.6, -71]] : [[-6, -81], [-6.6, -76], [-4.6, -71]], { w: 1 / s * 1.6, alpha: 0.6 * light, bleed: false, jitter: 0.05, color: '#ffc988', seed: 6723 });
  // the collar, turned up round his neck
  const collar = new Path2D();
  collar.moveTo(-13, -56); collar.quadraticCurveTo(-12.4, -64, -9.4, -69.6); collar.quadraticCurveTo(0, -66.6, 9.4, -69.6); collar.quadraticCurveTo(12.4, -64, 13, -56); collar.closePath();
  c.fillStyle = '#101c22'; c.fill(collar);
  lit(c, collar, 30 * lampSide, -50, 40, 0.4 * light);
  ink(c, [[-9.4, -69.6], [0, -66.6], [9.4, -69.6]], { w: 1 / s * 1.6, alpha: 0.5, bleed: false, jitter: 0.05, color: '#06080c', seed: 6724 });
  const cap = new Path2D();
  cap.moveTo(-9.5, -80); cap.quadraticCurveTo(-11, -93, 0, -95); cap.quadraticCurveTo(11, -93, 9.5, -80); cap.closePath();
  c.fillStyle = '#121a27'; c.fill(cap);
  c.save(); c.clip(cap); c.fillStyle = PAL.oxblood; c.fillRect(-12, -84.2, 24, 2.8); c.restore();
  lit(c, cap, 30 * lampSide, -86, 40, 0.4 * light);
  ink(c, [[-9.5, -80], [-10.6, -88], [-7, -93.6], [0, -95], [7, -93.6], [10.6, -88], [9.5, -80]], { w: 1.4 / s * 1.6, alpha: 0.6, bleed: false, jitter: 0.02, color: '#06080c', seed: 6712 });
  ink(c, lampSide > 0 ? [[3, -94.6], [8, -92], [10.6, -86]] : [[-3, -94.6], [-8, -92], [-10.6, -86]], { w: 1.2 / s * 1.6, alpha: 0.5 * light, bleed: false, jitter: 0.1, color: '#ffd59a', seed: 6713 });
  c.restore();
  // the lamp arm: from the shoulder, hanging (0) or raised (negative, out to his lamp side)
  // upper arm and forearm: the elbow bends as the lamp comes up
  const sx = 18 * lampSide; const sy = -52;
  const a1 = arm * 0.78 * lampSide; const a2 = arm * 1.12 * lampSide;
  const ex = sx - Math.sin(a1) * 23; const ey = sy + Math.cos(a1) * 23;
  const hx = ex - Math.sin(a2) * 21; const hy = ey + Math.cos(a2) * 21;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = '#132229'; c.lineWidth = 11.5;
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
  // the lamp lights the sleeve nearest it
  const warm = c.createRadialGradient(hx, hy + 10, 0, hx, hy + 10, 44);
  warm.addColorStop(0, `rgba(255, 170, 92, ${0.5 * light * flame})`);
  warm.addColorStop(1, 'rgba(255, 170, 92, 0)');
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = warm; c.lineWidth = 11.5;
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
  c.restore();
  ink(c, [[sx + 5 * lampSide, sy - 3], [ex + 5.4 * lampSide * Math.cos(a1), ey + 2], [hx + 4 * lampSide, hy]], { w: 1.3 / s * 1.6, alpha: 0.5 * light, bleed: false, jitter: 0.1, color: '#ffc988', seed: 6714 });
  // the cuff, then his hand round the lamp's bail
  c.fillStyle = '#0c151a';
  c.beginPath(); c.arc(hx - Math.sin(a2) * -1, hy + Math.cos(a2) * -1, 4.6, 0, TAU); c.fill();
  c.fillStyle = '#5a4234'; c.beginPath(); c.ellipse(hx, hy + 2, 3.4, 3.7, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255, 200, 140, 0.45)'; c.beginPath(); c.ellipse(hx, hy + 3, 2.2, 2.2, 0, 0, TAU); c.fill();
  // the lamp hangs from his hand: bail, cap, glass, flame
  const ly = hy + 5;
  c.strokeStyle = PAL.brass; c.lineWidth = 1.4;
  c.beginPath(); c.arc(hx, ly + 3, 3.4, Math.PI, 0); c.stroke();
  c.fillStyle = PAL.brassDark; c.fillRect(hx - 5, ly + 3, 10, 2.6);
  c.fillStyle = `rgba(255, 217, 138, ${0.5 + 0.5 * flame})`; c.fillRect(hx - 4, ly + 5.6, 8, 9);
  c.fillStyle = `rgba(255, 248, 230, ${0.6 * flame})`; c.beginPath(); c.ellipse(hx, ly + 10, 1.4, 2.8, 0, 0, TAU); c.fill();
  c.fillStyle = PAL.brassDark; c.fillRect(hx - 5, ly + 14.6, 10, 2.8);
  ink(c, [[hx - 5, ly + 3], [hx - 5, ly + 17.4], [hx + 5, ly + 17.4], [hx + 5, ly + 3]], { w: 0.9 / s * 1.6, closed: true, alpha: 0.6, bleed: false, jitter: 0.05, seed: 6715 });
  c.restore();
  const lampAt = { x: x + hx * s, y: y + (ly + 10 - feet) * s };
  if (glowAlpha > 0) glow(c, lampAt.x, lampAt.y, 60 * s, 'rgba(255, 196, 112, 0.95)', glowAlpha * flame);
  return { lamp: lampAt, head: { x, y: y + (-80 - feet) * s } };
}

// ---------------------------------------------------------------------------
// the five magic stones (shell/magicStones.js): the pause menu's amber gems,
// each with the mark of the world it came from inside it

export const MAGIC_STONE_KINDS = Object.freeze([
  Object.freeze({ id: 'chapter-1', kind: 'ember', label: 'EMBER' }),
  Object.freeze({ id: 'chapter-2', kind: 'grid', label: 'GRID' }),
  Object.freeze({ id: 'chapter-3', kind: 'echo', label: 'ECHO' }),
  Object.freeze({ id: 'chapter-4', kind: 'pigment', label: 'PIGMENT' }),
  Object.freeze({ id: 'black-knife', kind: 'black-ticket', label: 'BLACK TICKET' }),
]);

/** One stone, radius r, centred on (x, y); `on` 0..1 how brightly it glows. */
export function drawMagicStone(c, x, y, r, kind, { on = 1, wall = 0 } = {}) {
  const k = clamp(on, 0, 1);
  const dark = kind === 'black-ticket';
  c.save();
  // the stone's shadow in the palm
  c.fillStyle = 'rgba(30, 14, 6, 0.45)';
  c.beginPath(); c.ellipse(x + r * 0.15, y + r * 0.75, r * 1.05, r * 0.38, 0, 0, TAU); c.fill();
  const body = new Path2D();
  body.ellipse(x, y, r, r * 0.86, 0, 0, TAU);
  // unlit: a dull brown pebble; lit: the pause menu's gem (#ffd79a → amber → #7a4a18)
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.32, r * 0.05, x, y, r * 1.05);
  if (dark) {
    g.addColorStop(0, `rgba(${Math.round(90 + 150 * k)}, ${Math.round(70 + 110 * k)}, ${Math.round(50 + 50 * k)}, 1)`);
    g.addColorStop(0.4, '#2a1c14');
    g.addColorStop(1, '#0a0605');
  } else {
    g.addColorStop(0, k > 0.05 ? `rgba(255, 215, 154, ${0.35 + 0.65 * k})` : '#6a4a2c');
    g.addColorStop(0.6, k > 0.05 ? `rgba(224, 162, 74, ${0.5 + 0.5 * k})` : '#4a321c');
    g.addColorStop(1, '#5a3412');
  }
  c.fillStyle = dark ? g : '#3a2412';
  c.fill(body);
  if (!dark) { c.fillStyle = g; c.fill(body); }
  // the mark inside
  c.save();
  c.clip(body);
  const a = 0.25 + 0.6 * k;
  c.lineWidth = Math.max(1, r * 0.08);
  if (kind === 'ember') {
    const flick = 0.85 + 0.15 * Math.sin(wall * 7.3);
    c.fillStyle = `rgba(200, 60, 24, ${a * 0.9 * flick})`;
    c.beginPath(); c.moveTo(x, y - r * 0.55); c.quadraticCurveTo(x + r * 0.42, y - r * 0.05, x + r * 0.2, y + r * 0.4); c.quadraticCurveTo(x, y + r * 0.5, x - r * 0.2, y + r * 0.4); c.quadraticCurveTo(x - r * 0.42, y - r * 0.05, x, y - r * 0.55); c.fill();
    c.fillStyle = `rgba(255, 236, 170, ${a * flick})`;
    c.beginPath(); c.ellipse(x, y + r * 0.12, r * 0.12, r * 0.22, 0, 0, TAU); c.fill();
  } else if (kind === 'grid') {
    c.strokeStyle = `rgba(127, 208, 200, ${a})`;
    for (let i = -2; i <= 2; i += 1) {
      c.beginPath(); c.moveTo(x + i * r * 0.32, y - r); c.lineTo(x + i * r * 0.32, y + r); c.stroke();
      c.beginPath(); c.moveTo(x - r, y + i * r * 0.32); c.lineTo(x + r, y + i * r * 0.32); c.stroke();
    }
  } else if (kind === 'echo') {
    c.strokeStyle = `rgba(255, 244, 214, ${a * 0.9})`;
    [0.2, 0.42, 0.66].forEach((rr) => { c.beginPath(); c.ellipse(x, y, r * rr, r * rr * 0.86, 0, 0, TAU); c.stroke(); });
  } else if (kind === 'pigment') {
    c.fillStyle = `rgba(176, 40, 32, ${a})`;
    [[-0.2, -0.1, 0.32], [0.18, 0.06, 0.28], [-0.02, 0.26, 0.24]].forEach(([dx, dy, rr], i) => { c.beginPath(); c.ellipse(x + dx * r, y + dy * r, rr * r, rr * r * 0.8, i, 0, TAU); c.fill(); });
  } else if (dark) {
    // a tiny black ticket in the stone: its notch and an unpunched ring
    c.strokeStyle = `rgba(227, 194, 126, ${a})`;
    c.strokeRect(x - r * 0.46, y - r * 0.24, r * 0.92, r * 0.48);
    c.beginPath(); c.arc(x + r * 0.2, y, r * 0.1, 0, TAU); c.stroke();
  }
  // the gloss
  c.fillStyle = `rgba(255, 252, 240, ${0.25 + 0.45 * k})`;
  c.beginPath(); c.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.12, -0.6, 0, TAU); c.fill();
  c.restore();
  ink(c, [[x - r, y], [x - r * 0.7, y - r * 0.62], [x, y - r * 0.86], [x + r * 0.7, y - r * 0.62], [x + r, y], [x + r * 0.7, y + r * 0.62], [x, y + r * 0.86], [x - r * 0.7, y + r * 0.62]], { w: Math.max(1.2, r * 0.07), closed: true, alpha: 0.55, bleed: false, jitter: 0.1, color: '#2a1608', seed: 7400 + Math.round(x) });
  c.restore();
  if (k > 0) glow(c, x, y, r * 3.2, dark ? 'rgba(255, 196, 120, 0.9)' : 'rgba(255, 186, 96, 0.95)', (dark ? 0.32 : 0.45) * k);
}

// ---------------------------------------------------------------------------
// the black ticket: never punched

/**
 * The black ticket, `w` wide, centred on (x, y). `turn` -1..1 is its slow
 * spin about its long axis (cos of the angle: 1 face on, 0 edge on).
 */
export function drawBlackTicket(c, x, y, { w = 300, angle = 0, turn = 1, glint = 1 } = {}) {
  const h = w * 0.46;
  const sy = Math.max(0.04, Math.abs(turn));
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(1, sy);
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.7)'; c.shadowBlur = h * 0.25;
  c.fillStyle = vgrad(c, -h / 2, h / 2, [[0, '#1a1614'], [1, '#0a0807']]);
  roundRectPath(c, -w / 2, -h / 2, w, h, h * 0.06); c.fill();
  c.restore();
  if (turn > 0) {
    // the stub band and its perforation
    c.fillStyle = 'rgba(62, 24, 19, 0.95)';
    c.fillRect(-w / 2, -h / 2, w * 0.14, h);
    c.fillStyle = 'rgba(227, 194, 126, 0.35)';
    for (let i = 0; i < 9; i += 1) { c.beginPath(); c.arc(-w / 2 + w * 0.14, -h / 2 + h * (i + 0.5) / 9, h * 0.018, 0, TAU); c.fill(); }
    // gilt hairline border and lettering
    c.strokeStyle = 'rgba(227, 194, 126, 0.7)'; c.lineWidth = Math.max(1, h * 0.012);
    c.strokeRect(-w / 2 + w * 0.17, -h / 2 + h * 0.1, w * 0.79, h * 0.8);
    c.fillStyle = 'rgba(236, 206, 140, 0.92)';
    c.textBaseline = 'middle';
    c.font = `700 ${h * 0.2}px "Space Mono", monospace`;
    c.fillText('LAST CARRIAGE', -w / 2 + w * 0.22, -h * 0.14, w * 0.7);
    c.font = `700 ${h * 0.12}px "Space Mono", monospace`;
    c.fillStyle = 'rgba(236, 206, 140, 0.7)';
    c.fillText('ADMIT ONE · NO RETURN', -w / 2 + w * 0.22, h * 0.17, w * 0.7);
    // where a punch would go: a dashed ring, never punched
    c.setLineDash([h * 0.03, h * 0.03]);
    c.strokeStyle = 'rgba(227, 194, 126, 0.55)';
    c.beginPath(); c.arc(w * 0.36, -h * 0.18, h * 0.1, 0, TAU); c.stroke();
    c.setLineDash([]);
  }
  ink(c, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], { w: Math.max(1.2, h * 0.02), closed: true, alpha: 0.75, bleed: false, jitter: 0.3, color: '#e3c27e', seed: 7511 });
  c.restore();
  if (glint > 0 && turn > 0.2) glow(c, x + w * 0.42, y - h * 0.4 * sy, h * 0.3, 'rgba(255, 228, 170, 1)', 0.5 * glint);
}

// ---------------------------------------------------------------------------
// the Conductor (painters.js drawConductor, the finale's head and coat), with
// his punch arm free: `punchArm` is its angle from hanging (painters.js holds
// it at -0.55; about -1.6 holds the punch up at his chest)

function part(c, p, x, y, rot = 0, { dim = 1 } = {}) {
  c.save();
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.translate(-p.pivot[0], -p.pivot[1]);
  p.paint(c);
  if (dim < 1) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgba(6, 8, 14, ${1 - dim})`;
    c.fillRect(-2, -2, p.w + 4, p.h + 4);
  }
  c.restore();
}

/** Standing, facing us, feet at (x, y); returns where his lantern hangs. */
export function drawConductorPose(c, x, y, s, { punchArm = -0.55, swing = 0, glowAlpha = 0.6, flame = 1 } = {}) {
  const P = CONDUCTOR_PARTS;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = 'rgba(0, 0, 0, 0.45)';
  c.beginPath(); c.ellipse(0, 0, 24, 4, 0, 0, TAU); c.fill();
  part(c, P.legs, 0, -15);
  c.save(); c.translate(-9, -76); c.rotate(0.12 + swing);
  part(c, P.arm, 0, 0, 0, { dim: 0.75 });
  c.translate(0, 35); c.rotate(-0.12 - swing); part(c, P.lantern, 0, 0, 0);
  c.restore();
  part(c, CONDUCTOR_TORSO_PART, 0, -12);
  part(c, CONDUCTOR_HEAD_PART, 0.5, -78);
  c.save(); c.translate(10, -76); c.rotate(punchArm);
  part(c, P.arm, 0, 0, 0);
  part(c, P.punch, 0, 34, 0.3);
  c.restore();
  c.restore();
  const lantern = { x: x - 9 * s - Math.sin(0.12 + swing) * 35 * s, y: y - 76 * s + 46 * s };
  if (glowAlpha > 0) glow(c, lantern.x, lantern.y, 70 * s, 'rgba(255, 184, 96, 0.95)', glowAlpha * flame);
  return { lantern, face: { x: x + 0.5 * s, y: y - 93.5 * s } };
}

// ---------------------------------------------------------------------------

/**
 * Paint `draw(oc)` into a scratch canvas the size of `rect` (stage units, at
 * `res` px per unit), shade it (backlit: a dark fill over the figure, an amber
 * rim kept) and draw it back. For a figure in a lit doorway.
 */
const scratch = { canvas: null, ctx: null };
export function drawBacklit(c, rect, res, draw, { shade = 0.85, color = '6, 5, 6' } = {}) {
  if (typeof document === 'undefined') return;
  const W = Math.max(2, Math.ceil(rect.w * res)); const H = Math.max(2, Math.ceil(rect.h * res));
  if (!scratch.canvas || scratch.canvas.width < W || scratch.canvas.height < H) {
    scratch.canvas = document.createElement('canvas');
    scratch.canvas.width = Math.max(W, scratch.canvas?.width ?? 0);
    scratch.canvas.height = Math.max(H, scratch.canvas?.height ?? 0);
    scratch.ctx = scratch.canvas.getContext('2d');
  }
  const oc = scratch.ctx;
  oc.setTransform(1, 0, 0, 1, 0, 0);
  oc.clearRect(0, 0, W, H);
  oc.setTransform(res, 0, 0, res, -rect.x * res, -rect.y * res);
  draw(oc);
  oc.setTransform(1, 0, 0, 1, 0, 0);
  oc.globalCompositeOperation = 'source-atop';
  oc.fillStyle = `rgba(${color}, ${shade})`;
  oc.fillRect(0, 0, W, H);
  oc.globalCompositeOperation = 'source-over';
  c.drawImage(scratch.canvas, 0, 0, W, H, rect.x, rect.y, rect.w, rect.h);
}
