// Cutscene 1 · `opening` (title → NEW GAME → Chapter 1). docs/CUTSCENES_SPEC.md:
// who Butch is, what the night service is, and the case. Six shots:
//   1 the night service crossing a viaduct in the rain
//   2 the lost-property carriage, its shelves of tagged things
//   3 the orchard case on the top shelf and its claim tag
//   4 Butch at his desk under the lamp, turning the tag over
//   5 asleep on his arms; the lamp burns low
//   6 black: Chapter 1 Act 0 opens on "Wake up, Lost Property."

import paperUrl from '../../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import trainUrl from '../../../chapters/nightService/art/train-night.png?url';
import {
  PAL, drawViaductShot, amberGlint, brassFill, carriageCeiling, damaskWall, drawButchAtDesk, drawCeilingLamp, drawClaimTag, drawOilLamp, drawOrchardCase, finishLayer, floorboards, glow, ink, inkEllipse, inkRect, paperTag, parcel, ramp, rng, roundRectPath, usePaintAssets, vgrad, wainscot, wood,
} from '../painters.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// shot 1: the viaduct

function shotViaduct(c, t, w, h, env) {
  drawViaductShot(c, w, h, env, { trainX: -1180 + 1300 * t });
}

// ---------------------------------------------------------------------------
// shot 2: the lost-property carriage

const SHELF = Object.freeze({ x0: 150, x1: 1450, rows: [270, 470, 670], top: 84 });
/** The orchard case's place on the top shelf (shot 3 pushes in on it). */
export const CASE_SPOT = Object.freeze({ x: 1215, y: SHELF.rows[0], w: 150 });

function hatBox(c, x, y, r, tone, seed) {
  c.fillStyle = tone;
  c.fillRect(x - r, y - r * 1.1, r * 2, r * 1.1);
  c.fillStyle = 'rgba(255, 220, 190, 0.1)';
  c.fillRect(x - r, y - r * 1.1, r * 2, r * 0.25);
  c.beginPath(); c.ellipse(x, y - r * 1.1, r, r * 0.22, 0, 0, TAU); c.fillStyle = '#6a3028'; c.fill();
  c.fillStyle = 'rgba(234, 223, 198, 0.5)';
  c.fillRect(x - r, y - r * 0.55, r * 2, r * 0.1);
  ink(c, [[x - r, y - r * 1.1], [x - r, y], [x + r, y], [x + r, y - r * 1.1]], { w: 2, alpha: 0.6, bleed: false, seed });
  inkEllipse(c, x, y - r * 1.1, r, r * 0.22, { w: 1.8, alpha: 0.55, bleed: false, seed: seed + 1 });
}

function umbrella(c, x, y, len, angle, seed) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = '#141a24';
  c.beginPath(); c.moveTo(-2, 0); c.quadraticCurveTo(-14, -len * 0.55, -3, -len); c.lineTo(3, -len); c.quadraticCurveTo(14, -len * 0.55, 2, 0); c.closePath(); c.fill();
  ink(c, [[0, 0], [-10, -len * 0.5], [-2, -len]], { w: 1.4, alpha: 0.45, bleed: false, seed });
  c.strokeStyle = PAL.brass; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, -len); c.lineTo(0, -len - 16); c.arc(8, -len - 16, 8, Math.PI, Math.PI * 1.9); c.stroke();
  c.restore();
}

function birdcage(c, x, y, r, seed) {
  c.strokeStyle = PAL.brass;
  c.lineWidth = 2;
  for (let i = 0; i <= 8; i += 1) {
    const bx = x - r + (i * r * 2) / 8;
    c.beginPath(); c.moveTo(bx, y); c.lineTo(bx, y - r * 1.3); c.stroke();
  }
  c.beginPath(); c.arc(x, y - r * 1.3, r, Math.PI, 0); c.stroke();
  c.fillStyle = brassFill(c, x - r - 4, y - 6, r * 2 + 8, 8);
  c.fillRect(x - r - 4, y - 6, r * 2 + 8, 8);
  c.beginPath(); c.arc(x, y - r * 2.3 - 8, 7, 0, TAU); c.strokeStyle = PAL.brassLight; c.stroke();
  // a little perch, no bird
  c.beginPath(); c.moveTo(x - r * 0.6, y - r * 0.7); c.lineTo(x + r * 0.6, y - r * 0.7); c.stroke();
  ink(c, [[x - r - 4, y], [x + r + 4, y]], { w: 1.6, alpha: 0.5, bleed: false, seed });
}

function letters(c, x, y, w, n, seed) {
  for (let i = 0; i < n; i += 1) {
    c.fillStyle = i % 2 ? '#d8ccb0' : '#c9b893';
    c.fillRect(x + i * 3, y - 14 - i * 11, w, 10);
    ink(c, [[x + i * 3, y - 14 - i * 11], [x + i * 3 + w, y - 14 - i * 11]], { w: 1, alpha: 0.4, bleed: false, seed: seed + i });
  }
  c.strokeStyle = PAL.oxblood; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(x + w * 0.5, y - 16 - n * 11); c.lineTo(x + w * 0.5, y - 2); c.stroke();
}

function suitcase(c, x, y, w, h, tone, seed) {
  c.fillStyle = tone;
  roundRectPath(c, x, y - h, w, h, 6); c.fill();
  c.fillStyle = 'rgba(255, 220, 170, 0.1)'; c.fillRect(x, y - h, w, h * 0.18);
  c.fillStyle = PAL.brass;
  c.fillRect(x + w * 0.2, y - h, 6, h); c.fillRect(x + w * 0.8 - 6, y - h, 6, h);
  c.fillRect(x + w * 0.45, y - h - 8, w * 0.1, 8);
  ink(c, [[x, y - h], [x + w, y - h], [x + w, y], [x, y]], { w: 2, alpha: 0.6, closed: true, bleed: false, seed });
}

function lantern(c, x, y, seed) {
  c.fillStyle = PAL.brassDark; c.fillRect(x - 14, y - 50, 28, 50);
  c.fillStyle = 'rgba(255, 215, 140, 0.3)'; c.fillRect(x - 10, y - 44, 20, 34);
  c.strokeStyle = PAL.brass; c.lineWidth = 2; c.beginPath(); c.arc(x, y - 52, 9, Math.PI, 0); c.stroke();
  inkRect(c, x - 14, y - 50, 28, 50, { w: 1.6, alpha: 0.6, bleed: false, seed });
}

function violinCase(c, x, y, seed) {
  c.fillStyle = '#2a1a14';
  c.beginPath(); c.ellipse(x + 40, y - 18, 40, 18, 0, 0, TAU); c.ellipse(x + 120, y - 14, 50, 14, 0, 0, TAU); c.fill();
  ink(c, [[x, y - 18], [x + 40, y - 36], [x + 90, y - 26], [x + 170, y - 22], [x + 170, y - 4], [x + 40, y]], { w: 1.6, alpha: 0.5, bleed: false, seed });
}

/** A paper tag tied to a thing on the shelf, hanging over the shelf edge. */
function tagOn(c, x, y, seed, angle = 0.4) {
  paperTag(c, x + 12, y + 26, { angle, scale: 1.7, glint: false, string: [x, y], seed });
}

export function paintShelves(c, w, h) {
  // the carriage: ceiling, damask wall, the shelving end to end, the floor
  damaskWall(c, -20, 0, w + 40, h, { seed: 8901, tone: ['#0f1c21', '#182d33'] });
  carriageCeiling(c, -20, w + 20, 58, { seed: 8902 });
  // a window at each end, the rain-dark night outside
  [[-10, 150], [1490, 1620]].forEach(([x0, x1], i) => {
    c.fillStyle = vgrad(c, 120, 420, [[0, '#0e1828'], [1, '#1d3046']]);
    roundRectPath(c, x0, 120, x1 - x0, 300, 14); c.fill();
    c.strokeStyle = 'rgba(200, 220, 240, 0.12)'; c.lineWidth = 1;
    const random = rng(8903 + i);
    for (let k = 0; k < 30; k += 1) { const rx = x0 + random() * (x1 - x0); const ry = 120 + random() * 300; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 5, ry + 18); c.stroke(); }
    c.save(); c.lineWidth = 8; c.strokeStyle = brassFill(c, x0, 120, x1 - x0, 300); roundRectPath(c, x0, 120, x1 - x0, 300, 14); c.stroke(); c.restore();
  });
  wainscot(c, -20, w + 20, 690, h, { seed: 8904, panelW: 140 });
  // the shelving: walnut uprights, three shelves with brass rails
  const { x0, x1, rows, top } = SHELF;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30;
  c.fillStyle = '#1a100a';
  c.fillRect(x0, top, x1 - x0, rows[2] - top + 18);
  c.restore();
  wood(c, x0, top, x1 - x0, rows[2] - top + 18, { base: '#24170e', seed: 8905, vertical: true, grain: 'rgba(0,0,0,0.35)' });
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(x0, top, x1 - x0, rows[2] - top);
  const uprights = [x0, 580, 1010, x1 - 22];
  // the things on the shelves, back to front, each with its paper tag
  const row1 = rows[0];
  hatBox(c, 250, row1, 56, '#4e2420', 8911);
  hatBox(c, 372, row1, 44, '#2c4650', 8912);
  birdcage(c, 700, row1, 52, 8913);
  letters(c, 830, row1, 110, 4, 8914);
  parcel(c, 1080, row1 - 70, 90, 70, { seed: 8915, tone: '#8b6a44' });
  // the orchard case's place: drawn here small and dark, in close-up in shot 3
  drawOrchardCase(c, CASE_SPOT.x, row1, CASE_SPOT.w / 42);
  const row2 = rows[1];
  [0, 1, 2, 3].forEach((i) => umbrella(c, 240 + i * 34, row2, 130 + (i % 2) * 20, -0.12 + i * 0.07, 8920 + i));
  violinCase(c, 640, row2, 8925);
  lantern(c, 900, row2, 8926);
  suitcase(c, 1080, row2, 170, 96, '#3a2a20', 8927);
  hatBox(c, 1330, row2, 46, '#3a2b50', 8928);
  const row3 = rows[2];
  suitcase(c, 200, row3, 200, 120, '#5a3a22', 8930);
  parcel(c, 430, row3 - 60, 80, 60, { seed: 8931, tone: '#94744c' });
  parcel(c, 520, row3 - 90, 60, 90, { seed: 8932, tone: '#7a5a3a' });
  letters(c, 660, row3, 130, 5, 8933);
  c.fillStyle = '#6b2a22';
  c.beginPath(); c.moveTo(860, row3); c.quadraticCurveTo(930, row3 - 70, 1010, row3 - 6); c.lineTo(1000, row3); c.closePath(); c.fill();
  suitcase(c, 1090, row3, 150, 84, '#2c4650', 8934);
  birdcage(c, 1340, row3, 40, 8935);
  // shelves and rails over the things' feet
  rows.forEach((y, i) => {
    wood(c, x0 - 10, y, x1 - x0 + 20, 16, { base: '#4a3121', seed: 8940 + i });
    c.fillStyle = brassFill(c, x0 - 10, y - 26, x1 - x0 + 20, 5);
    c.fillRect(x0 - 10, y - 24, x1 - x0 + 20, 4);
    ink(c, [[x0 - 10, y], [x1 + 10, y]], { w: 2.4, alpha: 0.85, seed: 8945 + i });
    ink(c, [[x0 - 10, y + 16], [x1 + 10, y + 16]], { w: 1.6, alpha: 0.5, seed: 8948 + i });
    for (let bx = x0 + 40; bx < x1; bx += 180) { c.fillStyle = brassFill(c, bx, y - 24, 4, 24, true); c.fillRect(bx, y - 24, 3, 24); }
  });
  uprights.forEach((x, i) => {
    wood(c, x, top, 22, rows[2] - top + 16, { base: '#3a2517', seed: 8950 + i, vertical: true });
    ink(c, [[x, top], [x, rows[2] + 16]], { w: 2, alpha: 0.7, seed: 8955 + i });
    ink(c, [[x + 22, top], [x + 22, rows[2] + 16]], { w: 1.4, alpha: 0.45, seed: 8958 + i });
  });
  wood(c, x0 - 16, top - 18, x1 - x0 + 32, 20, { base: '#5a3a22', seed: 8960 });
  inkRect(c, x0 - 16, top - 18, x1 - x0 + 32, 20, { w: 2, seed: 8961 });
  // tags on everything (the case's tag is hidden behind its handle until shot 3)
  [[300, row1 - 30], [740, row1 - 60], [900, row1 - 50], [1140, row1 - 40],
    [300, row2 - 80], [700, row2 - 20], [920, row2 - 40], [1170, row2 - 50], [1370, row2 - 30],
    [280, row3 - 60], [560, row3 - 40], [720, row3 - 30], [1150, row3 - 50], [1380, row3 - 40]].forEach(([tx, ty], i) => tagOn(c, tx, ty, 8970 + i, 0.25 + (i % 3) * 0.2));
  floorboards(c, -20, w + 20, 760, h, { seed: 8980, runner: [-20, w + 20] });
  finishLayer(c, w, h, { grain: 0.16, vig: 0.42 });
  // the shelves in the dark: the lamp will bring them up
  c.fillStyle = 'rgba(6, 8, 14, 0.38)';
  c.fillRect(0, 0, w, h);
}

function shotShelves(c, t, w, h, env) {
  env.drawLayer(c, 'shelves', paintShelves);
  // the hanging lamp swings with the carriage and its light swings with it
  const swing = env.reducedMotion ? 0 : 0.16 * Math.sin(env.wall * 1.15) + 0.04 * Math.sin(env.wall * 2.9);
  const pivot = { x: 800, y: 0 };
  const len = 150;
  const lampPos = { x: pivot.x - Math.sin(swing) * (len + 30), y: pivot.y + Math.cos(swing) * (len + 30) };
  const pool = { x: pivot.x - Math.sin(swing) * 1100, y: 360 };
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, 620);
  g.addColorStop(0, 'rgba(255, 176, 92, 0.32)');
  g.addColorStop(0.45, 'rgba(255, 160, 80, 0.12)');
  g.addColorStop(1, 'rgba(255, 150, 70, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.restore();
  drawCeilingLamp(c, pivot.x, pivot.y, len, 64, swing);
  glow(c, lampPos.x, lampPos.y, 160, 'rgba(255, 210, 140, 0.9)', 0.22);
  // the case's brass catches the light as the camera reaches it
  amberGlint(c, CASE_SPOT.x + CASE_SPOT.w * 0.62, CASE_SPOT.y - CASE_SPOT.w * 0.76, 9, ramp(t, 0.55, 0.9));
}

// ---------------------------------------------------------------------------
// shot 3: the orchard case and its tag

const CASE3 = Object.freeze({ x: 330, y: 650, s: 15 });

function paintCaseShelf(c, w, h) {
  // the shelf's dark back, the hat box beside it, letters on the other side
  wood(c, -20, -20, w + 40, h + 40, { base: '#1c120b', seed: 9001, vertical: true, grain: 'rgba(0,0,0,0.4)' });
  c.fillStyle = vgrad(c, 0, h, [[0, 'rgba(0,0,0,0.6)'], [0.7, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.5)']]);
  c.fillRect(0, 0, w, h);
  hatBox(c, 60, 650, 150, '#3e1d19', 9002);
  letters(c, 1390, 650, 260, 7, 9003);
  // the shelf board and its brass rail
  wood(c, -20, 650, w + 40, 60, { base: '#4a3121', seed: 9004 });
  c.fillStyle = brassFill(c, -20, 590, w + 40, 12);
  c.fillRect(-20, 594, w + 40, 10);
  c.fillStyle = 'rgba(255, 240, 200, 0.4)'; c.fillRect(-20, 594, w + 40, 2);
  for (let bx = 100; bx < w; bx += 420) { c.fillStyle = brassFill(c, bx, 594, 8, 56, true); c.fillRect(bx, 594, 7, 56); }
  ink(c, [[-20, 650], [w + 20, 650]], { w: 3.2, alpha: 0.85, seed: 9005 });
  wood(c, -20, 710, w + 40, 120, { base: '#24170e', seed: 9006 });
  ink(c, [[-20, 710], [w + 20, 710]], { w: 2, alpha: 0.5, seed: 9007 });
  // the case, big
  drawOrchardCase(c, CASE3.x, CASE3.y, CASE3.s, { lamp: { x: 1300, y: -200 }, light: 0.32 });
  c.fillStyle = 'rgba(10, 6, 4, 0.18)';
  c.fillRect(CASE3.x, CASE3.y - 32 * CASE3.s, 42 * CASE3.s, 32 * CASE3.s);
  finishLayer(c, w, h, { grain: 0.16, vig: 0.6 });
}

function shotCase(c, t, w, h, env) {
  env.drawLayer(c, 'case', paintCaseShelf);
  const handle = { x: CASE3.x + 21 * CASE3.s, y: CASE3.y - 36 * CASE3.s + 6 };
  const sway = env.reducedMotion ? 0 : 0.035 * Math.sin(env.wall * 1.3);
  const tag = { x: handle.x + 300 + Math.sin(sway) * 40, y: handle.y + 330 };
  // the string from the handle to the tag's eyelet
  const eyelet = { x: tag.x - 215 + 30, y: tag.y };
  ink(c, [[handle.x, handle.y], [handle.x + 70, handle.y + 140], [eyelet.x, eyelet.y]], { w: 2.6, alpha: 0.85, bleed: false, jitter: 1, color: '#e6d6b0', seed: 9010 });
  drawClaimTag(c, tag.x, tag.y, { w: 430, angle: 0.06 + sway, string: false });
  // the lamp's light drifting over the case, warm, from the right
  const pool = { x: 640 + 520 * t + (env.reducedMotion ? 0 : 60 * Math.sin(env.wall * 1.15)), y: 330 };
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, 700);
  g.addColorStop(0, 'rgba(255, 176, 92, 0.2)');
  g.addColorStop(0.5, 'rgba(255, 160, 80, 0.06)');
  g.addColorStop(1, 'rgba(255, 150, 70, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.restore();
}

// ---------------------------------------------------------------------------
// shots 4 and 5: Butch at his desk

const DESK = Object.freeze({ seatX: 560, seatY: 600, s: 4.6, floor: 784 });
const deskTop = DESK.seatY - 29.5 * DESK.s;
const LAMP = Object.freeze({ x: 1110, y: deskTop, s: 5.6 });
const lampGlass = { x: LAMP.x, y: LAMP.y - 15 * LAMP.s };

export function paintOffice(c, w, h) {
  damaskWall(c, -20, 0, w + 40, h, { seed: 9101, tone: ['#0c171b', '#15272c'] });
  carriageCeiling(c, -20, w + 20, 46, { seed: 9102 });
  // the pigeonhole wall behind him, in shadow
  const gx = 40; const gy = 90; const gw = 380; const gh = 470;
  wood(c, gx, gy, gw, gh, { base: '#2a1a10', seed: 9103 });
  for (let r = 0; r < 5; r += 1) {
    for (let col = 0; col < 3; col += 1) {
      const cx = gx + 14 + col * ((gw - 28) / 3);
      const cy = gy + 14 + r * ((gh - 28) / 5);
      c.fillStyle = '#0a0706';
      c.fillRect(cx + 4, cy + 4, (gw - 28) / 3 - 8, (gh - 28) / 5 - 8);
      if ((r + col) % 2) { c.fillStyle = '#c9b893'; c.fillRect(cx + 14, cy + (gh - 28) / 5 - 26, 50, 14); }
      inkRect(c, cx + 4, cy + 4, (gw - 28) / 3 - 8, (gh - 28) / 5 - 8, { w: 1.4, alpha: 0.4, seed: 9104 + r * 3 + col });
    }
  }
  // the route map and the clock on the wall over the desk
  c.fillStyle = '#a8987a'; c.fillRect(1180, 120, 240, 170);
  c.strokeStyle = PAL.walnutMid; c.lineWidth = 8; c.strokeRect(1176, 116, 248, 178);
  ink(c, [[1200, 250], [1260, 230], [1300, 200], [1350, 190], [1400, 150]], { w: 3, color: '#2b221a', alpha: 0.8, bleed: false, seed: 9110 });
  [[1200, 250], [1300, 200], [1400, 150]].forEach(([px, py], i) => { c.fillStyle = i === 2 ? PAL.oxblood : '#f1e6c8'; c.beginPath(); c.arc(px, py, 6, 0, TAU); c.fill(); });
  c.fillStyle = brassFill(c, 860, 140, 100, 100); c.beginPath(); c.arc(910, 190, 52, 0, TAU); c.fill();
  c.fillStyle = '#ddd0b2'; c.beginPath(); c.arc(910, 190, 44, 0, TAU); c.fill();
  ink(c, [[910, 190], [893, 172]], { w: 3, color: '#2a1d14', bleed: false, seed: 9111 });
  ink(c, [[910, 190], [913, 158]], { w: 2.2, color: '#2a1d14', bleed: false, seed: 9112 });
  inkEllipse(c, 910, 190, 52, 52, { w: 2.2, seed: 9113 });
  wainscot(c, -20, w + 20, 470, DESK.floor, { seed: 9114, panelW: 150 });
  floorboards(c, -20, w + 20, DESK.floor, h, { seed: 9115 });
  // his chair, a bentwood one
  const sx = DESK.seatX; const sy = DESK.seatY;
  c.strokeStyle = '#2a1a10'; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(sx - 110, sy + 6); c.lineTo(sx - 120, DESK.floor); c.moveTo(sx + 60, sy + 6); c.lineTo(sx + 70, DESK.floor); c.stroke();
  c.beginPath(); c.moveTo(sx - 104, sy - 2); c.quadraticCurveTo(sx - 130, sy - 200, sx - 90, sy - 250); c.stroke();
  c.fillStyle = '#3a2517'; c.fillRect(sx - 120, sy - 4, 190, 16);
  ink(c, [[sx - 120, sy - 4], [sx + 70, sy - 4]], { w: 2, alpha: 0.6, seed: 9116 });
  finishLayer(c, w, h, { grain: 0.14, vig: 0 });
}

export function paintDesk(c, w, h) {
  const top = deskTop;
  const x0 = DESK.seatX + 16 * DESK.s;
  const x1 = 1560;
  // a pedestal of drawers on the right, the knee space on the left
  wood(c, 1240, top + 26, x1 - 1240, DESK.floor - top - 26, { base: '#3f2819', seed: 9201, vertical: true });
  for (let i = 0; i < 3; i += 1) {
    const y = top + 40 + i * ((DESK.floor - top - 50) / 3);
    c.fillStyle = 'rgba(255, 210, 150, 0.05)'; c.fillRect(1260, y, x1 - 1280, (DESK.floor - top - 50) / 3 - 10);
    inkRect(c, 1260, y, x1 - 1280, (DESK.floor - top - 50) / 3 - 10, { w: 1.6, alpha: 0.6, seed: 9202 + i });
    c.fillStyle = PAL.brassLight; c.fillRect(1380, y + 30, 40, 6);
  }
  c.fillStyle = '#24170e'; c.fillRect(x0 + 10, top + 26, 18, DESK.floor - top - 26);
  ink(c, [[x0 + 10, top + 26], [x0 + 10, DESK.floor]], { w: 2, alpha: 0.7, seed: 9205 });
  // the desk top, its brass lip
  wood(c, x0 - 10, top, x1 - x0 + 30, 28, { base: '#5a3a22', seed: 9206 });
  c.fillStyle = brassFill(c, x0 - 10, top + 24, x1 - x0 + 30, 4);
  c.fillRect(x0 - 10, top + 24, x1 - x0 + 30, 4);
  c.fillStyle = 'rgba(255, 220, 170, 0.3)'; c.fillRect(x0 - 10, top, x1 - x0 + 30, 2);
  ink(c, [[x0 - 10, top], [x1 + 20, top], [x1 + 20, top + 28], [x0 - 10, top + 28]], { w: 2.6, closed: true, seed: 9207 });
  // the case on the desk at his elbow, the ledger, the ink pot
  drawOrchardCase(c, 1300, top, 5.2, { lamp: lampGlass, light: 0.45 });
  c.fillStyle = '#e9dfc4';
  c.beginPath(); c.moveTo(830, top - 4); c.lineTo(960, top - 12); c.lineTo(1000, top - 2); c.lineTo(840, top); c.closePath(); c.fill();
  c.fillStyle = PAL.oxblood; c.fillRect(826, top - 4, 176, 5);
  c.fillStyle = '#10141c'; c.fillRect(1010, top - 30, 26, 30); inkRect(c, 1010, top - 30, 26, 30, { w: 1.6, seed: 9208 });
  ink(c, [[1018, top - 30], [1050, top - 80]], { w: 2, color: PAL.ivory, seed: 9209 });
  finishLayer(c, w, h, { grain: 0.12, vig: 0 });
}

/** The lamp's warm pool over the room (live: it flickers, and burns low in shot 5). */
function lampPool(c, w, h, strength) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(lampGlass.x, lampGlass.y, 0, lampGlass.x, lampGlass.y, 900);
  g.addColorStop(0, `rgba(255, 176, 96, ${0.5 * strength})`);
  g.addColorStop(0.22, `rgba(255, 160, 80, ${0.2 * strength})`);
  g.addColorStop(0.6, `rgba(255, 150, 70, ${0.06 * strength})`);
  g.addColorStop(1, 'rgba(255, 150, 70, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.restore();
  // the room's shade, deepest away from the lamp
  c.save();
  const shade = c.createRadialGradient(lampGlass.x - 200, lampGlass.y, 200, lampGlass.x - 200, lampGlass.y, 1300);
  shade.addColorStop(0, 'rgba(4, 5, 10, 0)');
  shade.addColorStop(1, `rgba(4, 5, 10, ${Math.min(0.92, 1.05 - strength * 0.55)})`);
  c.fillStyle = shade;
  c.fillRect(0, 0, w, h);
  // the whole room sinks as the flame goes down
  c.fillStyle = `rgba(4, 5, 10, ${Math.max(0, 0.62 * (1 - strength))})`;
  c.fillRect(0, 0, w, h);
  c.restore();
}

function deskScene(c, w, h, env, { pose, nod = 0, flame = 1, flip = 0, tagShown = true }) {
  const flicker = env.reducedMotion ? 0 : 0.04 * Math.sin(env.wall * 9.1) * Math.sin(env.wall * 3.7 + 2);
  const sway = env.reducedMotion ? 0 : 0.0035 * Math.sin(env.wall * 0.9);
  c.save();
  c.translate(w / 2, h);
  c.rotate(sway);
  c.translate(-w / 2, -h);
  env.drawLayer(c, '@office', paintOffice);
  const breath = env.reducedMotion ? 0 : Math.sin(env.wall * 1.1);
  const light = flame;
  const drawn = drawButchAtDesk(c, DESK.seatX, DESK.seatY, DESK.s, { pose, nod, lamp: lampGlass, light, breath: pose === 'asleep' ? breath * nod : 0, floor: (DESK.floor - DESK.seatY) / DESK.s });
  env.drawLayer(c, '@desk', paintDesk);
  if (pose === 'asleep' && tagShown) {
    // the tag under his hand on the desk, its handwriting up
    c.save();
    c.translate(DESK.seatX + 40 * DESK.s, deskTop - 6);
    c.scale(1, 0.32);
    drawClaimTag(c, 0, 0, { w: 150, angle: -0.08, flip: 1, glint: false, string: false });
    c.restore();
  }
  drawOilLamp(c, LAMP.x, LAMP.y, LAMP.s, { flame: flame + flicker });
  lampPool(c, w, h, flame + flicker);
  if (drawn.tag) {
    const tx = drawn.tag.x + 120;
    const ty = drawn.tag.y + 10;
    drawClaimTag(c, tx, ty, { w: 270, angle: -0.06, flip, glint: flip < 0.2, string: false });
    drawn.hands(c);
  }
  c.restore();
}

/** Where the tag is in shot 4 (for its camera): the hands are at (31, -47) of his units. */
const TAG4 = { x: (DESK.seatX + 31 * DESK.s + 120) / 1600, y: (DESK.seatY - 47 * DESK.s + 10) / 800 };

function shotDesk(c, t, w, h, env) {
  deskScene(c, w, h, env, { pose: 'tag', flip: ramp(t, 0.36, 0.56) });
}

function shotAsleep(c, t, w, h, env) {
  deskScene(c, w, h, env, { pose: 'asleep', nod: ramp(t, 0.1, 0.62), flame: 1 - 0.7 * ramp(t, 0.35, 1) });
}

function shotBlack(c, t, w, h) {
  c.fillStyle = '#020306';
  c.fillRect(-10, -10, w + 20, h + 20);
}

// ---------------------------------------------------------------------------

export const opening = {
  id: 'opening',
  title: 'The night service',
  length: [25, 40],
  music: { id: 'cutscene-opening', src: '/assets/music/ch1/1.1_train_undertow.mp3', volume: 0.42, fade: 3, outFade: 3 },
  prepare: () => usePaintAssets({ paper: paperUrl, train: trainUrl }),
  shots: [
    {
      id: 'viaduct',
      duration: 8.5,
      draw: shotViaduct,
      camera: { from: { x: 0.36, y: 0.47, zoom: 1.3 }, to: { x: 0.6, y: 0.46, zoom: 1.4 }, still: { x: 0.5, y: 0.47, zoom: 1.3 } },
      transition: { type: 'slide', duration: 1.1 },
      captions: [{ text: 'The night service runs between stored places.\nThe archive calls it the last line.', at: 0.9, end: 6.2 }],
      cues: [{ at: 0, sfx: 'rail', level: 1 }, { at: 0, sfx: 'rain', level: 0.9 }],
    },
    {
      id: 'lost-property',
      duration: 7.2,
      draw: shotShelves,
      camera: { from: { x: 0.46, y: 0.56, zoom: 1.04 }, to: { x: 0.7, y: 0.36, zoom: 1.3 }, still: { x: 0.5, y: 0.5, zoom: 1.04 } },
      transition: { type: 'fade', duration: 1.1 },
      captions: [{ text: 'Everything left on board comes here, to Lost Property.', at: 0.9, end: 5.2 }],
      cues: [{ at: 0, sfx: 'rain', level: 0.45 }],
    },
    {
      id: 'orchard-case',
      duration: 6,
      draw: shotCase,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.0 }, to: { x: 0.62, y: 0.55, zoom: 1.2 } },
      transition: { type: 'ink', duration: 1.1 },
      cues: [{ at: 1.4, sfx: 'paper' }],
    },
    {
      id: 'the-tag',
      duration: 8.2,
      draw: shotDesk,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.0 }, to: { x: TAG4.x, y: TAG4.y, zoom: 1.42 }, still: { x: 0.52, y: 0.5, zoom: 1.12 } },
      transition: { type: 'fade', duration: 1.2 },
      captions: [{ text: 'The clerk, Butch, had filed it a hundred times.\nHe could not leave it alone.', at: 3.3, end: 7.9 }],
      cues: [{ at: 2.9, sfx: 'paper' }],
    },
    {
      id: 'asleep',
      duration: 7.6,
      draw: shotAsleep,
      camera: { from: { x: 0.5, y: 0.52, zoom: 1.12 }, to: { x: 0.48, y: 0.56, zoom: 1.24 } },
      transition: { type: 'cut' },
      captions: [{ text: 'The line keeps running while someone rides it.', at: 1.4, end: 6.1 }],
      cues: [{ at: 0, sfx: 'rail', level: 1.25 }, { at: 4.4, stopMusic: true, fade: 4 }],
    },
    {
      id: 'black',
      duration: 2.2,
      draw: shotBlack,
      // the whole screen goes black, frame and all: Act 0 opens on black
      blackout: true,
      cues: [{ at: 0, stopSfx: 'rail', fade: 1.6 }, { at: 0.4, stopSfx: 'rain', fade: 1.6 }],
    },
  ],
};

export default opening;
