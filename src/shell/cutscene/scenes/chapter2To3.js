// Cutscene 3 · `chapter2To3` (Chapter 2 BORROWED LIGHT → Chapter 3 ECHO CITY).
// docs/CUTSCENES_SPEC.md: Chapter 2 ended with the letter on the bench,
// "Butch — … keep moving.", and the boarding.
//   1 the departing train: Butch has just made it, a corner of his coat caught in the door
//   2 in the carriage, by lamplight: the letter, KEEP MOVING. — M.
//   3 the train runs through a tunnel of filed records: drawers and pages streaming past
//   4 out into the afternoon: Echo City in warm stone, its clock at 14:20
//   5 close on the platform ticket board: two tickets, both for SEAT 43
// The last shot hands over to Chapter 3's first screen, the square by the platform.

import paperUrl from '../../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import trainUrl from '../../../chapters/nightService/art/train-night.png?url';
import {
  PAL, brassFill, drawButch, drawOilLamp, drawRain, finishLayer, glow, ink, inkRect, paintNightTrain, ramp, rng, roundRectPath, smooth, speckle, usePaintAssets, vgrad, wood,
} from '../painters.js';
import {
  drawLampPost, drawLitSign, drawPinchHand, drawStationClock, glassBeads, paintBrickFacade, paintCarriageSide, paintCityFar,
} from '../painters-c1.js';

const TAU = Math.PI * 2;

function pool(c, w, h, x, y, r, alpha, color = '255, 176, 96') {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color}, ${alpha})`);
  g.addColorStop(0.4, `rgba(${color}, ${alpha * 0.35})`);
  g.addColorStop(1, `rgba(${color}, 0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.restore();
}

function vignette(c, w, h, strength, color = '5, 4, 8') {
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, `rgba(${color}, 0)`);
  g.addColorStop(1, `rgba(${color}, ${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// shot 1: the evacuation platform; the door shut on a corner of his coat

const DECK1 = 590;
const CAR1 = Object.freeze({ x0: -420, x1: 2100, top: 236, bottom: DECK1 });
const DOOR1 = Object.freeze({ x: 690, w: 110 });
const WINDOWS1 = [-300, -110, 80, 270, 460, 880, 1070, 1260, 1450, 1640, 1830].map((x) => ({ x, w: 150 }));
const PULL1 = 280;

function paintEvacBack(c, w, h) {
  c.fillStyle = vgrad(c, 0, h, [[0, '#0a131a'], [0.6, '#11232c'], [1, '#162b33']]);
  c.fillRect(-20, -20, w + 40, h + 40);
  paintCityFar(c, w + 40, h, { horizon: 640, seed: 10101, layers: 3, x0: -40 });
}

/** The lit inside of the carriage, seen through its windows: amber, seat backs, a lamp. */
function paintCarInside(c, w, h) {
  c.fillStyle = vgrad(c, CAR1.top, CAR1.bottom, [[0, '#f6c37a'], [0.6, '#d68a48'], [1, '#7a3a1e']]);
  c.fillRect(0, CAR1.top, w, CAR1.bottom - CAR1.top);
  for (let x = 40; x < w; x += 190) {
    c.fillStyle = 'rgba(90, 30, 20, 0.7)';
    roundRectPath(c, x, CAR1.top + 120, 70, 140, 12); c.fill();
    glow(c, x + 95, CAR1.top + 40, 70, 'rgba(255, 236, 190, 1)', 0.3);
  }
}

function paintCarriage1(c, w, h) {
  paintCarriageSide(c, 0, w, CAR1.top, CAR1.bottom, {
    windows: WINDOWS1.map(({ x, w: ww }) => ({ x: x - CAR1.x0, w: ww })),
    doors: [{ x: DOOR1.x - CAR1.x0, w: DOOR1.w }],
    seed: 10111,
    night: 0.42,
  });
  c.fillStyle = PAL.brassLight; c.font = '700 26px "Space Mono", monospace';
  c.fillText('NIGHT SERVICE', DOOR1.x - CAR1.x0 + 180, CAR1.top + 250);
}

function paintEvacFront(c, w, h) {
  // the platform deck in front of the train, then the viaduct's face and its lit arches
  c.fillStyle = vgrad(c, DECK1, DECK1 + 60, [[0, '#2c3238'], [1, '#1a1e22']]);
  c.fillRect(-20, DECK1, w + 40, 60);
  ink(c, [[-20, DECK1], [w + 20, DECK1]], { w: 2.4, alpha: 0.8, jitter: 0.5, seed: 10121 });
  c.fillStyle = 'rgba(234, 223, 198, 0.14)'; c.fillRect(-20, DECK1 + 3, w + 40, 3);
  paintBrickFacade(c, -20, w + 20, DECK1 + 60, h + 20, { seed: 10122, lit: 0, bay: 200, win: [10, 10], rowGap: 900, tone: ['#2e2420', '#1a1411'], cornice: false });
  [140, 520, 900, 1280].forEach((x, i) => {
    const aw = 190;
    const top = DECK1 + 82;
    c.fillStyle = vgrad(c, top, h, [[0, '#7a4620'], [1, '#c98a44']]);
    c.beginPath(); c.moveTo(x, h + 20); c.lineTo(x, top + aw / 2); c.arc(x + aw / 2, top + aw / 2, aw / 2, Math.PI, 0); c.lineTo(x + aw, h + 20); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(40, 20, 10, 0.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + aw / 2, top); c.lineTo(x + aw / 2, h + 20); c.moveTo(x, top + aw / 2); c.lineTo(x + aw, top + aw / 2); c.stroke();
    ink(c, [[x, h + 20], [x, top + aw / 2], [x + aw * 0.15, top + aw * 0.15], [x + aw / 2, top], [x + aw * 0.85, top + aw * 0.15], [x + aw, top + aw / 2], [x + aw, h + 20]], { w: 1.8, alpha: 0.5, bleed: false, jitter: 0.4, seed: 10123 + i });
    glow(c, x + aw / 2, h, 150, 'rgba(255, 170, 90, 0.9)', 0.2);
  });
  // the bench where the letter was: empty now
  c.fillStyle = '#20160f';
  c.fillRect(90, DECK1 + 6, 190, 10); c.fillRect(100, DECK1 + 16, 7, 30); c.fillRect(264, DECK1 + 16, 7, 30);
  c.fillRect(90, DECK1 - 30, 190, 8);
  ink(c, [[90, DECK1 + 6], [280, DECK1 + 6]], { w: 1.6, alpha: 0.5, bleed: false, seed: 10128 });
  finishLayer(c, w, h, { grain: 0.13, vig: 0 });
}

/** The corner of his coat, shut in the door seam at (x, y): it flaps in the train's wind. */
function drawCoatCorner(c, x, y, wind, wall, reduced) {
  const f = reduced ? 0 : Math.sin(wall * 11) * 0.5 + Math.sin(wall * 17 + 1) * 0.3;
  const len = 96 + wind * 34;
  const tipY = y + 34 - wind * 22 + f * 10 * (0.4 + wind);
  const path = new Path2D();
  path.moveTo(x, y - 40);
  path.quadraticCurveTo(x - len * 0.4, y - 36 + f * 6, x - len, tipY - 14);
  path.lineTo(x - len * 0.9, tipY + 12);
  path.quadraticCurveTo(x - len * 0.5, y + 40 + f * 8, x, y + 46);
  path.closePath();
  c.fillStyle = '#2c4650';
  c.fill(path);
  c.save(); c.clip(path);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x - len, y + 6, len, 40);
  c.fillStyle = PAL.oxblood; c.fillRect(x - len, tipY - 2, len * 0.5, 4);
  c.restore();
  ink(c, [[x, y - 40], [x - len * 0.4, y - 36 + f * 6], [x - len, tipY - 14], [x - len * 0.9, tipY + 12], [x - len * 0.5, y + 40 + f * 8], [x, y + 46]], { w: 2.4, alpha: 0.9, bleed: false, jitter: 0.3, seed: 10131 });
  glow(c, x - len * 0.6, y, 60, 'rgba(255, 186, 104, 0.9)', 0.12);
}

function shotMadeIt(c, t, w, h, env) {
  env.drawLayer(c, 'back', paintEvacBack, { depth: 0.5, x: -60, w: w + 120 });
  const dx = env.reducedMotion ? 0 : PULL1 * t * t;
  // the carriage, its lit inside through the glass
  const inside = env.layer('inside', paintCarInside, { w: CAR1.x1 - CAR1.x0, h });
  c.drawImage(inside.canvas, CAR1.x0 + dx, 0, inside.w, inside.h);
  // Butch at the door's glass, backlit, just in
  c.save();
  const gy = CAR1.top + (CAR1.bottom - CAR1.top) * 0.12;
  const gh = (CAR1.bottom - CAR1.top) * 0.34;
  c.beginPath();
  c.rect(DOOR1.x + dx + DOOR1.w * 0.56, gy, DOOR1.w * 0.34, gh);
  c.rect(DOOR1.x + dx + DOOR1.w * 0.1, gy, DOOR1.w * 0.34, gh);
  c.clip();
  c.fillStyle = vgrad(c, gy, gy + gh, [[0, '#ffd08a'], [1, '#d88a48']]);
  c.fillRect(DOOR1.x + dx, gy, DOOR1.w, gh);
  drawButch(c, DOOR1.x + dx + DOOR1.w * 0.5, CAR1.bottom + 46, 3.9, { pose: 'stand', phase: env.wall, facing: -1, lamp: 'hand', glowAlpha: 0 });
  c.fillStyle = 'rgba(60, 24, 12, 0.3)';
  c.fillRect(DOOR1.x + dx, gy, DOOR1.w, gh);
  c.restore();
  env.drawLayer(c, 'carriage', paintCarriage1, { x: CAR1.x0 + dx, w: CAR1.x1 - CAR1.x0, h: CAR1.bottom + 80 });
  // the window light on the platform's wet edge
  c.save(); c.globalCompositeOperation = 'lighter';
  WINDOWS1.forEach(({ x, w: ww }) => { const g = c.createRadialGradient(x + dx + ww / 2, DECK1 + 10, 0, x + dx + ww / 2, DECK1 + 10, 120); g.addColorStop(0, 'rgba(255, 186, 104, 0.16)'); g.addColorStop(1, 'rgba(255, 186, 104, 0)'); c.fillStyle = g; c.fillRect(x + dx - 120, DECK1 - 40, ww + 240, 120); });
  c.restore();
  drawCoatCorner(c, DOOR1.x + dx + DOOR1.w / 2, 486, ramp(t, 0.1, 0.8), env.wall, env.reducedMotion);
  env.drawLayer(c, 'front', paintEvacFront);
  drawLampPost(c, 1330, DECK1, 200, { on: 1, side: -1, coneAlpha: 0.16 });
  drawLitSign(c, 1120, 96, 300, 56, 'EVACUATION', { on: 1, tone: 'amber' });
  c.fillStyle = '#0a0c0f'; c.fillRect(1180, 40, 3, 56); c.fillRect(1360, 40, 3, 56);
  drawRain(c, env, { alpha: 0.62, speed: 720 });
  vignette(c, w, h, 0.42);
}

// ---------------------------------------------------------------------------
// shot 2: the letter, by lamplight

const LETTER = Object.freeze({ x: 450, y: 150, w: 700, h: 500 });
const LAMP2 = Object.freeze({ x: 1360, y: 330, s: 7 });

function paintLetterTable(c, w, h) {
  // seen from above: the walnut table by the window, the dark glass at the top
  wood(c, -20, -20, w + 40, h + 40, { base: '#4a2f1d', seed: 10201, planks: 5 });
  c.fillStyle = vgrad(c, 0, h, [[0, 'rgba(0,0,0,0.5)'], [0.35, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.45)']]);
  c.fillRect(-20, -20, w + 40, h + 40);
  c.fillStyle = vgrad(c, -20, 80, [[0, '#0a1220'], [1, '#162436']]);
  c.fillRect(-20, -20, w + 40, 100);
  c.fillStyle = brassFill(c, -20, 78, w + 40, 8); c.fillRect(-20, 78, w + 40, 7);
  ink(c, [[-20, 86], [w + 20, 86]], { w: 2.4, alpha: 0.7, seed: 10202 });
  // the letter's shadow
  c.save();
  c.filter = 'blur(12px)';
  c.fillStyle = 'rgba(10, 4, 0, 0.5)';
  c.translate(LETTER.x + LETTER.w / 2 - 26, LETTER.y + LETTER.h / 2 + 22);
  c.rotate(-0.05);
  c.fillRect(-LETTER.w / 2, -LETTER.h / 2, LETTER.w, LETTER.h);
  c.restore();
  c.filter = 'none';
  finishLayer(c, w, h, { grain: 0.16, vig: 0 });
}

function paintLetter(c, w, h) {
  const { w: lw, h: lh } = LETTER;
  const x = 20; const y = 20;
  c.fillStyle = vgrad(c, y, y + lh, [[0, '#efe5cc'], [1, '#ddd0b0']]);
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + lw, y + 4); c.lineTo(x + lw - 3, y + lh); c.lineTo(x + 2, y + lh - 3); c.closePath(); c.fill();
  // the folds it was carried in
  c.fillStyle = 'rgba(120, 90, 50, 0.12)';
  c.fillRect(x, y + lh / 3 - 2, lw, 4);
  c.fillRect(x, y + (lh * 2) / 3 - 2, lw, 4);
  c.fillStyle = 'rgba(255, 255, 240, 0.35)';
  c.fillRect(x, y + lh / 3 + 2, lw, 2);
  c.fillRect(x, y + (lh * 2) / 3 + 2, lw, 2);
  speckle(c, x, y, lw, lh, { count: 500, color: 'rgba(120, 90, 50, 0.1)', size: 1.6, seed: 10211 });
  // rain spots from the bench
  const random = rng(10212);
  for (let i = 0; i < 9; i += 1) { c.fillStyle = 'rgba(120, 100, 70, 0.12)'; c.beginPath(); c.arc(x + random() * lw, y + random() * lh, 6 + random() * 14, 0, TAU); c.fill(); }
  // her hand, in brown ink
  c.fillStyle = 'rgba(70, 44, 26, 0.78)';
  c.textBaseline = 'alphabetic';
  c.font = 'italic 400 40px Georgia, "Times New Roman", serif';
  c.fillText('Butch —', x + 56, y + 78);
  c.font = 'italic 400 30px Georgia, "Times New Roman", serif';
  c.fillStyle = 'rgba(70, 44, 26, 0.6)';
  c.fillText('I made it through this city,', x + 70, y + 140);
  c.fillText('but I could not wait here.', x + 70, y + 184);
  c.fillText('If you are following me —', x + 70, y + 250);
  c.fillStyle = 'rgba(56, 32, 18, 0.92)';
  c.font = 'italic 700 64px Georgia, "Times New Roman", serif';
  c.fillText('KEEP MOVING.', x + 90, y + 352);
  c.strokeStyle = 'rgba(56, 32, 18, 0.7)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x + 94, y + 368); c.quadraticCurveTo(x + 300, y + 360, x + 540, y + 372); c.stroke();
  c.font = 'italic 400 44px Georgia, "Times New Roman", serif';
  c.fillText('— M.', x + lw - 200, y + 440);
  ink(c, [[x, y], [x + lw, y + 4], [x + lw - 3, y + lh], [x + 2, y + lh - 3]], { w: 1.6, closed: true, alpha: 0.4, bleed: false, jitter: 0.5, color: '#6a5034', seed: 10213 });
}

function shotLetter(c, t, w, h, env) {
  env.drawLayer(c, 'table', paintLetterTable);
  const rock = env.reducedMotion ? 0 : Math.sin(env.wall * 1.2);
  const letter = env.layer('letter', paintLetter, { w: LETTER.w + 40, h: LETTER.h + 40 });
  c.save();
  c.translate(LETTER.x + LETTER.w / 2, LETTER.y + LETTER.h / 2);
  c.rotate(-0.05 + rock * 0.004);
  c.drawImage(letter.canvas, -letter.w / 2, -letter.h / 2, letter.w, letter.h);
  c.restore();
  // the lamp on the table, its light swinging a little with the carriage
  const flicker = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 9.1) * Math.sin(env.wall * 3.7 + 2);
  const glass = drawOilLamp(c, LAMP2.x, LAMP2.y, LAMP2.s, { flame: 0.95 + flicker });
  pool(c, w, h, glass.x - 300 + rock * 30, glass.y + 80, 900, 0.24 + flicker);
  // his hands, at the letter's lower corners
  const lamp = { x: glass.x, y: glass.y };
  [['back', 'front']].flat().forEach((part) => {
    drawPinchHand(c, LETTER.x + 10, LETTER.y + LETTER.h - 70, 0.62, { angle: -0.95, part, lamp, light: 0.9 });
  });
  c.save();
  c.translate(LETTER.x + LETTER.w - 10, LETTER.y + LETTER.h - 60);
  c.scale(-1, 1);
  ['back', 'front'].forEach((part) => drawPinchHand(c, 0, 0, 0.62, { angle: -0.95, part, lamp: { x: -(lamp.x - LETTER.x - LETTER.w + 10), y: lamp.y - LETTER.y - LETTER.h + 60 }, light: 0.6 }));
  c.restore();
  // a passing lamp outside: its light slides across the paper
  if (!env.reducedMotion) {
    const p = (t - 0.45) / 0.3;
    if (p > 0 && p < 1) {
      const strength = Math.sin(Math.PI * p) ** 0.8;
      const bx = w * (1.2 - p * 1.4);
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(bx - 260, 0, bx + 260, 0);
      [[0, 0], [0.5, 0.16], [1, 0]].forEach(([k, a]) => g.addColorStop(k, `rgba(255, 180, 100, ${(a * strength).toFixed(3)})`));
      c.fillStyle = g;
      c.beginPath(); c.moveTo(bx - 140, 0); c.lineTo(bx + 380, 0); c.lineTo(bx + 140, h); c.lineTo(bx - 380, h); c.closePath(); c.fill();
      c.restore();
    }
  }
  vignette(c, w, h, 0.55);
}

// ---------------------------------------------------------------------------
// shot 3: the tunnel of filed records

const DRAWER = Object.freeze({ w: 120, h: 62 });
const TILE3 = 960;
const RAIL3 = 650;
const CAR3_W = 720;

function paintDrawerWall(c, w, h) {
  c.fillStyle = '#0c0805';
  c.fillRect(0, 0, w, h);
  const random = rng(10301);
  for (let y = 4; y < h; y += DRAWER.h + 6) {
    for (let x = 4; x < w; x += DRAWER.w + 6) {
      const open = random() > 0.92;
      wood(c, x, y, DRAWER.w, DRAWER.h, { base: random() > 0.5 ? '#3a2416' : '#33200f', seed: 10302 + x + y * 3 });
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, y + DRAWER.h - 6, DRAWER.w, 6);
      // the label holder and its card, the pull
      c.fillStyle = brassFill(c, x + 38, y + 12, 44, 22); c.fillRect(x + 38, y + 12, 44, 22);
      c.fillStyle = random() > 0.2 ? '#e2d6b8' : '#c9b893'; c.fillRect(x + 41, y + 15, 38, 16);
      c.fillStyle = 'rgba(60, 40, 25, 0.6)'; c.fillRect(x + 45, y + 21, 18 + random() * 12, 2); c.fillRect(x + 45, y + 25, 12 + random() * 14, 2);
      c.strokeStyle = PAL.brass; c.lineWidth = 2.4; c.beginPath(); c.arc(x + 60, y + 44, 7, 0, Math.PI); c.stroke();
      inkRect(c, x, y, DRAWER.w, DRAWER.h, { w: 1.2, alpha: 0.35, bleed: false, jitter: 0.3, seed: 10303 + x + y });
      if (open) {
        // a drawer pulled out, its cards standing up
        c.fillStyle = '#4a2f1d'; c.fillRect(x - 6, y + DRAWER.h - 12, DRAWER.w + 12, 18);
        for (let k = 0; k < 7; k += 1) { c.fillStyle = k % 2 ? '#e6dcc2' : '#d8ccb0'; c.fillRect(x + 6 + k * 15, y + DRAWER.h - 30 - (k % 3) * 4, 12, 22); }
      }
    }
  }
  finishLayer(c, w, h, { grain: 0.14, vig: 0 });
}

function paintTunnelTrain(c, w, h) {
  c.translate(10, h - 20);
  c.filter = 'brightness(1.3)';
  paintNightTrain(c, { cars: 3, carW: CAR3_W, glowAlpha: 1 });
  c.filter = 'none';
}

/** Pages streaming past, deterministic per index: where page i is at wall time `wall`. */
function pageAt(i, wall, speed) {
  const random = rng(10320 + i * 13);
  const depth = random();
  const y = 40 + random() * 720;
  const span = 2400;
  const v = speed * (0.7 + depth * 0.9);
  const x = 1900 - (((wall * v) + random() * span) % span);
  const spin = wall * (2 + random() * 4) + random() * TAU;
  return { x, y: y + Math.sin(wall * 3 + i) * 20, depth, spin, size: 30 + depth * 50 };
}

function shotTunnel(c, t, w, h, env) {
  const run = env.reducedMotion ? 0 : env.wall * 1500;
  const wall = env.layer('drawers', paintDrawerWall, { w: TILE3, h });
  for (let x = -((run * 0.6) % TILE3); x < w; x += TILE3) c.drawImage(wall.canvas, x, 0, TILE3, h);
  // the train's window light along the drawers next to it
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = vgrad(c, 200, RAIL3 + 60, [[0, 'rgba(255, 170, 90, 0)'], [0.45, 'rgba(255, 170, 90, 0.18)'], [0.8, 'rgba(255, 170, 90, 0.18)'], [1, 'rgba(255, 170, 90, 0)']]);
  c.fillRect(0, 200, w, RAIL3 - 140);
  c.restore();
  // pages behind the train
  const pages = env.lowGraphics ? 14 : 30;
  const drawPage = (p) => {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.spin);
    c.scale(1, Math.abs(Math.cos(p.spin * 0.7)) * 0.8 + 0.2);
    c.fillStyle = `rgba(234, 223, 198, ${0.5 + p.depth * 0.4})`;
    c.fillRect(-p.size / 2, -p.size * 0.65, p.size, p.size * 1.3);
    c.fillStyle = 'rgba(80, 60, 40, 0.35)';
    for (let k = 0; k < 4; k += 1) c.fillRect(-p.size * 0.35, -p.size * 0.45 + k * p.size * 0.22, p.size * 0.7, 2);
    c.restore();
  };
  const speed = env.reducedMotion ? 0 : 900;
  const clock = env.reducedMotion ? 0 : env.wall;
  for (let i = 0; i < pages; i += 1) { const p = pageAt(i, clock, speed); if (p.depth < 0.5) drawPage(p); }
  // the train, carried with the camera; it rocks on the rails
  const bob = env.reducedMotion ? 0 : Math.sin(env.wall * 7) * 1.4;
  const train = env.layer('train', paintTunnelTrain, { w: CAR3_W * 3 + 20, h: 280 });
  c.drawImage(train.canvas, -260, RAIL3 - 260 + bob, train.w, train.h);
  // the rail bed under it
  c.fillStyle = '#070504'; c.fillRect(0, RAIL3 + 2, w, h - RAIL3);
  c.fillStyle = 'rgba(140, 150, 160, 0.16)';
  for (let rx = -((run * 1.2) % 90); rx < w; rx += 90) c.fillRect(rx, RAIL3 + 14, 50, 3);
  // pages in front, faster, a few streaked
  for (let i = 0; i < pages; i += 1) {
    const p = pageAt(i, clock, speed);
    if (p.depth >= 0.5) {
      drawPage(p);
      if (!env.reducedMotion && p.depth > 0.8) { c.fillStyle = 'rgba(234, 223, 198, 0.08)'; c.fillRect(p.x, p.y - 6, 160, 12); }
    }
  }
  // the tunnel's ribs flying by close to the lens
  if (!env.reducedMotion) {
    for (let x = -((run * 1.8) % 1300); x < w + 200; x += 1300) {
      const g = c.createLinearGradient(x - 60, 0, x + 110, 0);
      g.addColorStop(0, 'rgba(8, 5, 3, 0)'); g.addColorStop(0.35, 'rgba(8, 5, 3, 0.82)'); g.addColorStop(0.65, 'rgba(8, 5, 3, 0.82)'); g.addColorStop(1, 'rgba(8, 5, 3, 0)');
      c.fillStyle = g;
      c.fillRect(x - 60, 0, 170, h);
    }
  }
  vignette(c, w, h, 0.62);
}

// ---------------------------------------------------------------------------
// shot 4: out into the afternoon; Echo City in warm stone, 14:20

const RAIL4 = 612;
const CLOCK4 = Object.freeze({ x: 1080, y: 236, r: 50 });
const STONE_INK = '#4a2c16';

function mansardBlock(c, x, w, base, height, { seed, tone, roof = '#5d6a5a', dormers = 3 }) {
  const random = rng(seed);
  const top = base - height;
  const roofH = Math.min(70, height * 0.28);
  c.fillStyle = tone;
  c.fillRect(x, top + roofH, w, height - roofH + 200);
  // tall windows with shutters
  for (let wy = top + roofH + 26; wy < base - 30; wy += 66) {
    for (let wx = x + 22; wx < x + w - 34; wx += 52) {
      c.fillStyle = 'rgba(70, 40, 20, 0.72)'; c.fillRect(wx, wy, 22, 40);
      c.fillStyle = 'rgba(255, 236, 200, 0.18)'; c.fillRect(wx, wy, 22, 4);
      c.fillStyle = 'rgba(110, 120, 80, 0.5)'; c.fillRect(wx - 6, wy, 5, 40); c.fillRect(wx + 23, wy, 5, 40);
    }
  }
  // the light from the left: the right side of each block falls into shade
  c.fillStyle = 'rgba(90, 50, 24, 0.22)';
  c.fillRect(x + w * 0.72, top + roofH, w * 0.28, height);
  // the mansard roof, its dormers and chimneys
  c.fillStyle = roof;
  c.beginPath(); c.moveTo(x - 6, top + roofH); c.lineTo(x + 12, top); c.lineTo(x + w - 12, top); c.lineTo(x + w + 6, top + roofH); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255, 240, 210, 0.12)';
  c.beginPath(); c.moveTo(x - 6, top + roofH); c.lineTo(x + 12, top); c.lineTo(x + w * 0.4, top); c.lineTo(x + w * 0.38, top + roofH); c.closePath(); c.fill();
  for (let k = 0; k < dormers; k += 1) {
    const dx = x + (w * (k + 0.5)) / dormers - 14;
    c.fillStyle = '#e2c79a'; c.fillRect(dx, top + roofH * 0.25, 28, roofH * 0.6);
    c.fillStyle = 'rgba(70, 40, 20, 0.7)'; c.fillRect(dx + 7, top + roofH * 0.38, 14, roofH * 0.4);
    c.fillStyle = roof; c.beginPath(); c.moveTo(dx - 4, top + roofH * 0.27); c.lineTo(dx + 14, top + roofH * 0.05); c.lineTo(dx + 32, top + roofH * 0.27); c.closePath(); c.fill();
  }
  [0.2, 0.78].forEach((f, i) => {
    if (random() > 0.7 && i) return;
    const cx = x + w * f;
    c.fillStyle = '#9a6a42'; c.fillRect(cx, top - 34, 22, 36);
    c.fillStyle = '#a8442a'; c.fillRect(cx + 2, top - 44, 7, 11); c.fillRect(cx + 12, top - 44, 7, 11);
  });
  ink(c, [[x - 6, top + roofH], [x + 12, top], [x + w - 12, top], [x + w + 6, top + roofH]], { w: 1.8, alpha: 0.6, color: STONE_INK, bleed: false, jitter: 0.4, seed: seed + 1 });
  ink(c, [[x, top + roofH], [x, base + 200]], { w: 1.4, alpha: 0.4, color: STONE_INK, bleed: false, jitter: 0.4, seed: seed + 2 });
  ink(c, [[x + w, top + roofH], [x + w, base + 200]], { w: 1.4, alpha: 0.4, color: STONE_INK, bleed: false, jitter: 0.4, seed: seed + 3 });
}

function paintEchoBack(c, w, h) {
  c.translate(60, 0);
  c.fillStyle = vgrad(c, 0, h, [[0, '#f0d6a2'], [0.5, '#e9c48c'], [1, '#d9a86a']]);
  c.fillRect(-80, -20, w + 160, h + 40);
  glow(c, 220, 120, 700, 'rgba(255, 244, 214, 0.95)', 0.55);
  // the far city: a dome and towers in the afternoon haze
  c.fillStyle = 'rgba(196, 150, 100, 0.55)';
  c.beginPath(); c.arc(560, 380, 90, Math.PI, 0); c.fill(); c.fillRect(470, 380, 180, 200);
  c.fillRect(556, 250, 8, 60);
  [[200, 300, 70], [760, 320, 60], [1380, 290, 80], [1520, 340, 60]].forEach(([x, y, ww]) => c.fillRect(x, y, ww, 400));
  c.fillStyle = 'rgba(240, 214, 162, 0.35)';
  c.fillRect(-80, 300, w + 160, 300);
}

function paintEchoMid(c, w, h) {
  // the row of stone houses round the square, the clock tower among them
  [[300, 230, 260, '#c8935c'], [530, 210, 300, '#d3a06a'], [760, 200, 240, '#bf8452'], [1180, 220, 280, '#cc965e'], [1400, 250, 250, '#b97c4c']].forEach(([x, ww, height, tone], i) => {
    mansardBlock(c, x, ww, RAIL4 - 40, height, { seed: 10401 + i * 9, tone, dormers: Math.max(2, Math.round(ww / 80)) });
  });
  // the clock tower
  const tx = CLOCK4.x - 70;
  c.fillStyle = '#b07a48'; c.fillRect(tx, 150, 140, RAIL4);
  c.fillStyle = 'rgba(90, 50, 24, 0.25)'; c.fillRect(tx + 100, 150, 40, RAIL4);
  c.fillStyle = '#5d6a5a';
  c.beginPath(); c.moveTo(tx - 10, 152); c.lineTo(CLOCK4.x, 40); c.lineTo(tx + 150, 152); c.closePath(); c.fill();
  c.fillStyle = PAL.brassLight; c.fillRect(CLOCK4.x - 2, 10, 4, 34);
  c.fillStyle = '#9a6a3e'; c.fillRect(tx - 8, 148, 156, 10);
  for (let wy = 330; wy < RAIL4 - 40; wy += 80) { c.fillStyle = 'rgba(70, 40, 20, 0.72)'; c.fillRect(CLOCK4.x - 12, wy, 24, 46); }
  ink(c, [[tx - 10, 152], [CLOCK4.x, 40], [tx + 150, 152]], { w: 2, alpha: 0.6, color: STONE_INK, bleed: false, jitter: 0.3, seed: 10450 });
  ink(c, [[tx, 158], [tx, RAIL4]], { w: 1.6, alpha: 0.5, color: STONE_INK, bleed: false, jitter: 0.3, seed: 10451 });
  ink(c, [[tx + 140, 158], [tx + 140, RAIL4]], { w: 1.6, alpha: 0.5, color: STONE_INK, bleed: false, jitter: 0.3, seed: 10452 });
  drawStationClock(c, CLOCK4.x, CLOCK4.y, CLOCK4.r, { hours: 14, minutes: 20, hang: 0, light: 0, ink: '#2a1a10' });
  // the station's green glass canopy over the platform on the left
  c.fillStyle = 'rgba(143, 165, 138, 0.9)';
  c.beginPath(); c.moveTo(250, 470); c.lineTo(420, 410); c.lineTo(760, 410); c.lineTo(900, 470); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(60, 70, 50, 0.7)'; c.lineWidth = 2;
  for (let k = 0; k <= 10; k += 1) { const x = 250 + k * 65; c.beginPath(); c.moveTo(x, 470); c.lineTo(420 + k * 34, 410); c.stroke(); }
  c.fillStyle = '#3e4a3c'; c.fillRect(250, 468, 650, 8);
  [300, 480, 660, 840].forEach((x) => { c.fillStyle = '#2e3a2e'; c.fillRect(x, 476, 8, RAIL4 - 476); });
  ink(c, [[250, 470], [420, 410], [760, 410], [900, 470]], { w: 1.8, alpha: 0.6, color: '#2e3a2e', bleed: false, jitter: 0.3, seed: 10453 });
  finishLayer(c, w, h, { grain: 0.12, vig: 0 });
}

function paintEchoFront(c, w, h) {
  // the tunnel's stone portal on the left, the platform and the cobbled square
  c.fillStyle = '#8a6440';
  c.fillRect(-40, 250, 330, RAIL4 + 40);
  c.fillStyle = '#1c120a';
  c.beginPath(); c.moveTo(-40, RAIL4 + 10); c.lineTo(-40, 380); c.quadraticCurveTo(110, 300, 250, 380); c.lineTo(250, RAIL4 + 10); c.closePath(); c.fill();
  for (let k = 0; k < 9; k += 1) {
    const a = Math.PI + (k / 8) * Math.PI * 0.62;
    c.fillStyle = k % 2 ? '#a07650' : '#93693f';
    c.beginPath(); c.arc(105, 470, 190, a, a + 0.07 * Math.PI); c.arc(105, 470, 150, a + 0.07 * Math.PI, a, true); c.fill();
  }
  ink(c, [[-40, 380], [110, 300], [250, 380], [250, RAIL4]], { w: 2.2, alpha: 0.65, color: STONE_INK, bleed: false, jitter: 0.4, seed: 10461 });
  ink(c, [[290, 250], [290, RAIL4]], { w: 1.6, alpha: 0.5, color: STONE_INK, bleed: false, jitter: 0.4, seed: 10462 });
  // the platform's edge and the square
  c.fillStyle = vgrad(c, RAIL4 + 10, h, [[0, '#b88a58'], [1, '#7a5230']]);
  c.fillRect(-40, RAIL4 + 26, w + 80, h - RAIL4);
  c.fillStyle = '#d9b07a'; c.fillRect(-40, RAIL4 + 20, w + 80, 10);
  const random = rng(10463);
  for (let y = RAIL4 + 40; y < h + 10; y += 16 + (y - RAIL4) * 0.06) {
    for (let x = -40 + random() * 20; x < w + 40; x += 24 + (y - RAIL4) * 0.1) {
      c.fillStyle = random() > 0.5 ? 'rgba(90, 56, 28, 0.22)' : 'rgba(255, 230, 190, 0.12)';
      c.beginPath(); c.ellipse(x, y, 9 + (y - RAIL4) * 0.04, 4 + (y - RAIL4) * 0.015, 0, 0, TAU); c.fill();
    }
  }
  // long afternoon shadows across the square, from the left
  c.fillStyle = 'rgba(90, 50, 24, 0.2)';
  [[300, 80], [700, 60], [1100, 90]].forEach(([x, ww]) => { c.beginPath(); c.moveTo(x, RAIL4 + 30); c.lineTo(x + ww, RAIL4 + 30); c.lineTo(x + ww + 260, h); c.lineTo(x + 260, h); c.closePath(); c.fill(); });
  // white-globed lamps
  [430, 1260].forEach((x) => {
    c.fillStyle = '#2a2018'; c.fillRect(x - 3, RAIL4 - 150, 6, 182);
    c.fillStyle = '#fbf3e0'; c.beginPath(); c.arc(x, RAIL4 - 160, 13, 0, TAU); c.fill();
    ink(c, [[x - 3, RAIL4 + 30], [x - 3, RAIL4 - 148]], { w: 1.2, alpha: 0.4, color: STONE_INK, bleed: false, seed: x });
  });
  ink(c, [[-40, RAIL4 + 20], [w + 40, RAIL4 + 20]], { w: 2, alpha: 0.6, color: STONE_INK, jitter: 0.4, seed: 10464 });
  finishLayer(c, w, h, { grain: 0.12, vig: 0 });
}

function paintEchoTrain(c, w, h) {
  c.translate(0, h - 10);
  // in the afternoon: the night grade lifted, warmed
  c.filter = 'brightness(1.75) sepia(0.2) saturate(1.1)';
  paintNightTrain(c, { cars: 3, carW: 440, glowAlpha: 0 });
  c.filter = 'none';
}

function shotEcho(c, t, w, h, env) {
  env.drawLayer(c, 'back', paintEchoBack, { depth: 0.4, x: -60, w: w + 120 });
  env.drawLayer(c, 'mid', paintEchoMid);
  // the night service coming out of the tunnel, slowing into the platform
  const out = env.reducedMotion ? 0.92 : 1 - (1 - ramp(t, 0, 0.9)) ** 2;
  const train = env.layer('train', paintEchoTrain, { w: 440 * 3, h: 160 });
  const front = -400 + 1150 * out;
  c.save();
  c.beginPath(); c.rect(250, 0, w, h); c.clip();
  c.drawImage(train.canvas, front - train.w, RAIL4 + 18 - train.h, train.w, train.h);
  c.restore();
  env.drawLayer(c, 'front', paintEchoFront);
  // the afternoon light: dust in the sun, a shaft from the left
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(0, 0, 900, 700);
  g.addColorStop(0, 'rgba(255, 236, 190, 0.16)'); g.addColorStop(1, 'rgba(255, 236, 190, 0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.restore();
  const motes = env.lowGraphics ? 20 : 50;
  for (let i = 0; i < motes; i += 1) {
    const random = rng(10470 + i);
    const x = (random() * w + (env.reducedMotion ? 0 : env.wall * (8 + random() * 10))) % w;
    const y = (random() * h * 0.8 + (env.reducedMotion ? 0 : Math.sin(env.wall * 0.6 + i) * 12));
    c.fillStyle = `rgba(255, 246, 220, ${0.25 + random() * 0.35})`;
    c.fillRect(x, y, 2, 2);
  }
  vignette(c, w, h, 0.28, '80, 40, 16');
}

// ---------------------------------------------------------------------------
// shot 5: the ticket board, two tickets for seat 43

const BOARD = Object.freeze({ x: 250, y: 90, w: 1100, h: 610 });
const TICKETS5 = Object.freeze([
  { x: 640, y: 420, angle: -0.05, top: 'NIGHT SERVICE', seat: 'SEAT 43', name: 'VELEZ, M.', stamp: null, seed: 10511 },
  { x: 990, y: 440, angle: 0.06, top: 'NIGHT SERVICE', seat: 'SEAT 43', name: 'M. VENN', stamp: 'DUPLICATE', seed: 10512 },
]);

function paintBoardWall(c, w, h) {
  c.fillStyle = vgrad(c, 0, h, [[0, '#d9b47e'], [1, '#b98a58']]);
  c.fillRect(-20, -20, w + 40, h + 40);
  speckle(c, 0, 0, w, h, { count: 1400, color: 'rgba(120, 80, 40, 0.12)', size: 2, seed: 10501 });
  // the board: walnut frame, green baize, a brass plate
  const { x, y, w: bw, h: bh } = BOARD;
  c.save();
  c.shadowColor = 'rgba(60, 30, 10, 0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
  c.fillStyle = '#3a2416'; c.fillRect(x - 30, y - 30, bw + 60, bh + 60);
  c.restore();
  wood(c, x - 30, y - 30, bw + 60, bh + 60, { base: '#4a2f1d', seed: 10502 });
  c.fillStyle = vgrad(c, y, y + bh, [[0, '#4a6450'], [1, '#34483a']]);
  c.fillRect(x, y, bw, bh);
  speckle(c, x, y, bw, bh, { count: 1800, color: 'rgba(20, 30, 20, 0.2)', size: 1.6, seed: 10503 });
  inkRect(c, x, y, bw, bh, { w: 2.4, alpha: 0.7, color: '#2a1a10', bleed: false, jitter: 0.3, seed: 10504 });
  c.fillStyle = brassFill(c, x + bw / 2 - 200, y - 26, 400, 44);
  roundRectPath(c, x + bw / 2 - 200, y - 24, 400, 40, 6); c.fill();
  c.fillStyle = '#2a1a10'; c.font = '700 24px "Space Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('ECHO CITY · TICKETS HELD', x + bw / 2, y - 3);
  c.textAlign = 'left';
  // other things pinned there, older, faded by the sun
  const notes = [[300, 150, 180, 120, -0.04], [520, 130, 140, 170, 0.05], [1160, 150, 150, 110, 0.03], [320, 520, 160, 130, 0.06], [1170, 560, 140, 100, -0.05]];
  notes.forEach(([nx, ny, nw, nh, a], i) => {
    c.save(); c.translate(nx + nw / 2, ny + nh / 2); c.rotate(a);
    c.fillStyle = i % 2 ? '#e2d5b4' : '#d6c69e'; c.fillRect(-nw / 2, -nh / 2, nw, nh);
    c.fillStyle = 'rgba(80, 60, 40, 0.3)';
    for (let k = 0; k < 5; k += 1) c.fillRect(-nw / 2 + 14, -nh / 2 + 18 + k * 18, nw * (0.5 + ((k * 7 + i) % 4) * 0.1), 3);
    c.fillStyle = '#a8442a'; c.beginPath(); c.arc(0, -nh / 2 + 8, 5, 0, TAU); c.fill();
    c.restore();
  });
  // a timetable sheet
  c.fillStyle = '#eee4cc'; c.fillRect(760, 130, 230, 150);
  c.fillStyle = 'rgba(60, 40, 25, 0.75)'; c.font = '700 15px "Space Mono", monospace';
  c.fillText('DEPARTURES', 780, 156);
  c.font = '400 13px "Space Mono", monospace';
  ['07:10  NIGHT SERVICE', '09:40  CITY LINE', '14:20  —', '15:38  RESERVED'].forEach((line, i) => c.fillText(line, 780, 184 + i * 22));
  c.fillStyle = '#a8442a'; c.beginPath(); c.arc(875, 136, 5, 0, TAU); c.fill();
  finishLayer(c, w, h, { grain: 0.14, vig: 0 });
}

function paintSeatTicket(c, w, h, tk) {
  const tw = 310; const th = 150;
  c.translate(w / 2, h / 2);
  c.save();
  c.shadowColor = 'rgba(20, 10, 4, 0.45)'; c.shadowBlur = 18; c.shadowOffsetX = 8; c.shadowOffsetY = 10;
  c.fillStyle = '#ecdcb6';
  roundRectPath(c, -tw / 2, -th / 2, tw, th, 6); c.fill();
  c.restore();
  c.fillStyle = 'rgba(107, 42, 34, 0.92)'; c.fillRect(-tw / 2, -th / 2, 40, th);
  c.fillStyle = '#ecdcb6';
  for (let k = 0; k < 6; k += 1) { c.beginPath(); c.arc(-tw / 2 + 40, -th / 2 + 12 + k * 25, 3, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(42, 29, 20, 0.85)';
  c.textBaseline = 'middle';
  c.font = '700 15px "Space Mono", monospace';
  c.fillText(tk.top, -tw / 2 + 56, -th / 2 + 24);
  c.font = '700 44px "Space Mono", monospace';
  c.fillText(tk.seat, -tw / 2 + 54, -2);
  c.font = '700 20px "Space Mono", monospace';
  c.fillText(tk.name, -tw / 2 + 56, th / 2 - 26);
  if (tk.stamp) {
    c.save(); c.translate(tw * 0.2, th * 0.26); c.rotate(-0.12);
    c.font = '700 18px "Space Mono", monospace';
    const sw = c.measureText(tk.stamp).width + 16;
    c.strokeStyle = 'rgba(160, 40, 30, 0.85)'; c.lineWidth = 2.4; c.strokeRect(-sw / 2, -14, sw, 28);
    c.fillStyle = 'rgba(160, 40, 30, 0.88)'; c.textAlign = 'center'; c.fillText(tk.stamp, 0, 1);
    c.restore();
  }
  speckle(c, -tw / 2, -th / 2, tw, th, { count: 160, color: 'rgba(120, 90, 50, 0.12)', size: 1.6, seed: tk.seed });
  ink(c, [[-tw / 2, -th / 2], [tw / 2, -th / 2], [tw / 2, th / 2], [-tw / 2, th / 2]], { w: 1.6, closed: true, alpha: 0.55, bleed: false, jitter: 0.3, color: '#3a2a1a', seed: tk.seed + 1 });
}

function shotBoard(c, t, w, h, env) {
  env.drawLayer(c, 'wall', paintBoardWall);
  TICKETS5.forEach((tk, i) => {
    const layer = env.layer(`ticket-${i}`, (lc, lw, lh) => paintSeatTicket(lc, lw, lh, tk), { w: 380, h: 220 });
    const sway = env.reducedMotion ? 0 : 0.012 * Math.sin(env.wall * 1.4 + i * 2);
    c.save();
    c.translate(tk.x, tk.y - 70);
    c.rotate(tk.angle + sway);
    c.drawImage(layer.canvas, -layer.w / 2, 70 - layer.h / 2, layer.w, layer.h);
    c.restore();
    // its brass pin
    c.fillStyle = brassFill(c, tk.x - 8, tk.y - 78, 16, 16);
    c.beginPath(); c.arc(tk.x, tk.y - 70, 8, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255, 246, 220, 0.8)'; c.beginPath(); c.arc(tk.x - 2.5, tk.y - 72.5, 2.4, 0, TAU); c.fill();
  });
  // the afternoon sun through the station window: a slanted patch with the bars' shadows
  c.save(); c.globalCompositeOperation = 'lighter';
  const drift = env.reducedMotion ? 0 : t * 40;
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(255, 228, 170, 0.0)'); g.addColorStop(0.35, 'rgba(255, 228, 170, 0.16)'); g.addColorStop(0.8, 'rgba(255, 228, 170, 0.05)');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(380 + drift, 0); c.lineTo(1160 + drift, 0); c.lineTo(1500 + drift, h); c.lineTo(720 + drift, h); c.closePath(); c.fill();
  c.restore();
  c.fillStyle = 'rgba(60, 30, 10, 0.12)';
  [640, 900].forEach((bx) => { c.beginPath(); c.moveTo(bx + drift, 0); c.lineTo(bx + 30 + drift, 0); c.lineTo(bx + 30 + 340 + drift, h); c.lineTo(bx + 340 + drift, h); c.closePath(); c.fill(); });
  const motes = env.lowGraphics ? 14 : 36;
  for (let i = 0; i < motes; i += 1) {
    const random = rng(10530 + i);
    const x = 500 + random() * 900 + (env.reducedMotion ? 0 : Math.sin(env.wall * 0.4 + i) * 20);
    const y = (random() * h + (env.reducedMotion ? 0 : env.wall * (6 + random() * 8))) % h;
    c.fillStyle = `rgba(255, 246, 220, ${0.2 + random() * 0.3})`;
    c.fillRect(x, y, 2.2, 2.2);
  }
  vignette(c, w, h, 0.36, '60, 30, 12');
}

// ---------------------------------------------------------------------------

export const chapter2To3 = {
  id: 'chapter2To3',
  title: 'Echo City',
  length: [25, 40],
  music: { id: 'cutscene-2-3', src: '/assets/music/ch3/3.1_satie_gnossienne_no1.mp3', volume: 0.46, fade: 3, outFade: 3 },
  prepare: () => usePaintAssets({ paper: paperUrl, train: trainUrl }),
  shots: [
    {
      id: 'just-made-it',
      duration: 7,
      draw: shotMadeIt,
      camera: { from: { x: 0.46, y: 0.5, zoom: 1.08 }, to: { x: 0.56, y: 0.55, zoom: 1.38 }, still: { x: 0.5, y: 0.52, zoom: 1.14 } },
      transition: { type: 'ink', duration: 1.1 },
      cues: [{ at: 0, sfx: 'rain', level: 1 }, { at: 0, sfx: 'rail', level: 0.5 }, { at: 0.15, sfx: 'thud' }, { at: 0.8, sfx: 'whistle' }, { at: 3.5, sfx: 'rail', level: 0.9 }],
    },
    {
      id: 'the-letter',
      duration: 7.8,
      draw: shotLetter,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.48, y: 0.54, zoom: 1.24 } },
      transition: { type: 'slide', duration: 1.1 },
      captions: [{ text: 'The letter was a day old.\nIt read as if she had written it a minute ago.', at: 1.1, end: 6.6 }],
      cues: [{ at: 0, sfx: 'rain', level: 0.4 }, { at: 0.5, sfx: 'paper' }],
    },
    {
      id: 'filed-records',
      duration: 6.4,
      draw: shotTunnel,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.12 }, to: { x: 0.52, y: 0.5, zoom: 1.2 }, still: { x: 0.5, y: 0.5, zoom: 1.12 } },
      transition: { type: 'fade', duration: 1.2 },
      cues: [{ at: 0, stopSfx: 'rain', fade: 1 }, { at: 0, sfx: 'rail', level: 1.3 }, { at: 0.6, sfx: 'paper' }, { at: 2.2, sfx: 'paper' }, { at: 3.9, sfx: 'paper' }],
    },
    {
      id: 'echo-city',
      duration: 8.4,
      draw: shotEcho,
      camera: { from: { x: 0.4, y: 0.52, zoom: 1.14 }, to: { x: 0.58, y: 0.44, zoom: 1.26 }, still: { x: 0.5, y: 0.47, zoom: 1.14 } },
      transition: { type: 'slide', duration: 1.1 },
      captions: [{ text: 'Echo City keeps the afternoon\nits people remember.', at: 1.4, end: 6.2 }],
      cues: [{ at: 0, sfx: 'rail', level: 0.7 }, { at: 4.6, sfx: 'brake' }, { at: 6.2, sfx: 'softBell' }],
    },
    {
      id: 'seat-43',
      duration: 7.6,
      draw: shotBoard,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.51, y: 0.53, zoom: 1.24 } },
      captions: [{ text: 'Today it was keeping two tickets\nfor seat forty-three.', at: 1.0, end: 5.8 }],
      cues: [{ at: 0.4, stopSfx: 'rail', fade: 2.5 }, { at: 1.2, sfx: 'paper' }, { at: 4.4, stopMusic: true, fade: 3.2 }],
    },
  ],
};

export default chapter2To3;
