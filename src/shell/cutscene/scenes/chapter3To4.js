// Cutscene 4 · `chapter3To4` (Ch3 ECHO CITY → Ch4 THE PAINTED COUNTRY).
// docs/CUTSCENES_SPEC.md. Ch3 ended with seat 43 empty and still warm, and
// the scanner reading two tickets as one passenger. Five shots:
//   1 the night service leaves Echo City at dusk; seat 43 empty beside Butch
//   2 through the window the world loses its colour into pencil on paper
//   3 Rosa's drawing: the orchard, the house, the red hawthorn hedge, "ROSA"
//   4 the archive's grey wash sweeps across it; a stamp lands: FILED
//   5 the train slows into the unfinished drawing; one haw still red
// The paper world is Chapter 4's own hand (painters-c2.js imports its
// countryArt / trainArt), so the last frame leads straight into Bay A.

import paperUrl from '../../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import trainUrl from '../../../chapters/nightService/art/train-night.png?url';
import {
  PAL, amberGlint, brassFill, damaskWall, drawButchBack, drawOilLamp, finishLayer, glow, ink, inkRect, paperTag, ramp, rng, roundRectPath, seatBack, smooth, usePaintAssets, vgrad, wainscot, wood,
} from '../painters.js';
import {
  DRAWING, HUE, INK, RED_HAW, TRAIN_BOX, buildTrain, drawArt, drawRosaDrawing, drawTrainWheels, greyWash, once, paintPaper, paintTrainBody, paperSheet, prebuild, redHaw, rosaDrawing, rubberStamp,
} from '../painters-c2.js';
import { appleTree, artLayers, hawthorn, house, paintCountry } from '../../../chapters/paintedCountry/art/countryArt.js';
import { blob, hatch, pencil, rule, scribble, wash, washBlob } from '../../../chapters/paintedCountry/art/pencilKit.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// shot 1: leaving Echo City at dusk; seat 43 empty beside him

const GLASS1 = Object.freeze({ x: 140, y: 62, w: 1320, h: 420, r: 26 });
const SEATS = Object.freeze({ y: 646, left: [290, 790], right: [810, 1310] });
const BUTCH1 = Object.freeze({ x: 540, y: 772, s: 5.2 });
const SEAT43 = Object.freeze({ x: 1060, y: 694 });
const LAMP1 = Object.freeze({ x: 236, y: GLASS1.y + GLASS1.h + 16, s: 4.6 });
const CITY = Object.freeze({ w: 2000, h: 480 });

/** Echo City at dusk, warm stone and mansard roofs; the tower clock still says 14:20. */
function paintEchoDusk(c, w, h) {
  const horizon = h * 0.8;
  c.fillStyle = vgrad(c, 0, horizon, [[0, '#2a2340'], [0.3, '#4f3352'], [0.58, '#9c5662'], [0.8, '#dc8a5c'], [1, '#f2b874']]);
  c.fillRect(-20, -20, w + 40, horizon + 40);
  glow(c, w * 0.22, horizon, h * 1.1, 'rgba(255, 176, 104, 0.9)', 0.34);
  // long dusk cloud bands, lit gold underneath
  const sky = rng(4601);
  for (let i = 0; i < 14; i += 1) {
    const y = h * (0.06 + sky() * 0.46);
    const x = w * (-0.1 + sky() * 1.1);
    const len = w * (0.12 + sky() * 0.25);
    const th = h * (0.012 + sky() * 0.03);
    c.fillStyle = `rgba(${sky() > 0.5 ? '92, 52, 84' : '120, 64, 88'}, ${0.4 + sky() * 0.3})`;
    c.beginPath(); c.ellipse(x + len / 2, y, len / 2, th, 0, 0, TAU); c.fill();
    c.fillStyle = `rgba(255, 186, 120, ${0.18 + sky() * 0.2})`;
    c.beginPath(); c.ellipse(x + len / 2, y + th * 0.6, len * 0.42, th * 0.35, 0, 0, TAU); c.fill();
  }
  // the far roofs in haze
  const far = rng(4602);
  c.fillStyle = 'rgba(96, 56, 74, 0.75)';
  for (let x = -10; x < 1600; x += 50 + far() * 60) c.fillRect(x, horizon - 70 - far() * 90, 46 + far() * 50, 200);
  // the town: warm stone fronts, grey-green mansards, the lamps coming on
  const walls = ['#7c4434', '#8f5238', '#6e3c30', '#9a603e', '#84482f'];
  const random = rng(4603);
  const building = (x, bw, top, kind) => {
    const roofH = kind === 'house' ? bw * 0.45 : 34 + random() * 26;
    const wall = walls[Math.floor(random() * walls.length)];
    c.fillStyle = vgrad(c, top, horizon, [[0, wall], [1, '#3a2018']]);
    c.fillRect(x, top, bw, horizon - top + 2);
    c.fillStyle = '#3a3f3c';
    if (kind === 'house') {
      c.beginPath(); c.moveTo(x - 6, top); c.lineTo(x + bw / 2, top - roofH); c.lineTo(x + bw + 6, top); c.closePath(); c.fill();
    } else {
      c.beginPath(); c.moveTo(x - 4, top); c.lineTo(x + 12, top - roofH); c.lineTo(x + bw - 12, top - roofH); c.lineTo(x + bw + 4, top); c.closePath(); c.fill();
      for (let dx = x + 22; dx < x + bw - 26; dx += 34 + random() * 10) {
        c.fillStyle = '#4a4f4a';
        c.fillRect(dx, top - roofH * 0.7, 18, roofH * 0.6);
        c.beginPath(); c.moveTo(dx - 3, top - roofH * 0.7); c.lineTo(dx + 9, top - roofH * 0.98); c.lineTo(dx + 21, top - roofH * 0.7); c.fill();
        c.fillStyle = random() > 0.45 ? '#f2b866' : '#2a1a18';
        c.fillRect(dx + 5, top - roofH * 0.6, 8, roofH * 0.42);
      }
      // chimney stacks with their red pots
      c.fillStyle = '#5a3028';
      c.fillRect(x + bw * 0.7, top - roofH - 22, 16, 26);
      c.fillStyle = '#a2402c';
      c.fillRect(x + bw * 0.7 + 2, top - roofH - 30, 5, 8); c.fillRect(x + bw * 0.7 + 9, top - roofH - 28, 5, 6);
    }
    // windows: tall, in rows; a lamp in about half of them
    for (let wy = top + 18; wy < horizon - 24; wy += 34) {
      for (let wx = x + 12; wx < x + bw - 18; wx += 28) {
        const lit = random() > 0.68;
        c.fillStyle = lit ? '#e9a95e' : '#2c1a18';
        c.fillRect(wx, wy, 11, 19);
        if (lit) glow(c, wx + 5, wy + 9, 22, 'rgba(255, 190, 110, 0.9)', 0.1);
      }
    }
    ink(c, [[x, horizon], [x, top], [x + bw, top], [x + bw, horizon]], { w: 1.6, alpha: 0.6, color: '#24120c', bleed: false, jitter: 0.4, seed: 4610 + Math.round(x) });
    ink(c, [[x + 4, top + 1], [x + bw - 4, top + 1]], { w: 1.2, alpha: 0.3, color: '#ffcf92', bleed: false, jitter: 0.3, seed: 4611 + Math.round(x) });
  };
  let x = -20;
  while (x < 1360) {
    const bw = 130 + random() * 110;
    if (x > 520 && x < 640) x = 650;
    building(x, bw, horizon - 150 - random() * 120, 'block');
    x += bw + 4;
  }
  // the clock tower over the square
  const tx = 548;
  c.fillStyle = vgrad(c, horizon - 330, horizon, [[0, '#9a6440'], [1, '#4a2a1c']]);
  c.fillRect(tx, horizon - 330, 96, 340);
  c.fillStyle = '#3a4a42';
  c.beginPath(); c.moveTo(tx - 10, horizon - 330); c.lineTo(tx + 48, horizon - 400); c.lineTo(tx + 106, horizon - 330); c.closePath(); c.fill();
  ink(c, [[tx, horizon], [tx, horizon - 330], [tx + 96, horizon - 330], [tx + 96, horizon]], { w: 1.8, alpha: 0.65, color: '#24120c', bleed: false, seed: 4620 });
  const cx = tx + 48; const cy = horizon - 270;
  c.fillStyle = '#f1e2c0';
  c.beginPath(); c.arc(cx, cy, 30, 0, TAU); c.fill();
  glow(c, cx, cy, 60, 'rgba(255, 230, 180, 0.9)', 0.25);
  c.strokeStyle = '#2a1a10'; c.lineCap = 'round';
  const hour = ((2 + 20 / 60) / 12) * TAU; const minute = (20 / 60) * TAU;
  c.lineWidth = 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(hour) * 15, cy - Math.cos(hour) * 15); c.stroke();
  c.lineWidth = 2.6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(minute) * 23, cy - Math.cos(minute) * 23); c.stroke();
  ink(c, [[cx - 30, cy], [cx, cy - 30], [cx + 30, cy], [cx, cy + 30]], { w: 1.4, alpha: 0.6, color: '#3a2414', closed: true, bleed: false, seed: 4621 });
  // the outskirts: lower houses, then the dusk fields
  x = 1370;
  while (x < 1760) {
    const bw = 70 + random() * 50;
    building(x, bw, horizon - 60 - random() * 40, 'house');
    x += bw + 30 + random() * 40;
  }
  c.fillStyle = '#2a1820';
  for (let tx2 = 1700; tx2 < w + 40; tx2 += 60 + random() * 70) { c.beginPath(); c.ellipse(tx2, horizon - 18, 26 + random() * 20, 22 + random() * 10, 0, 0, TAU); c.fill(); }
  // the square and the street in shadow, the white globe lamps of Echo City
  c.fillStyle = vgrad(c, horizon, h, [[0, '#2c1a1c'], [1, '#160d10']]);
  c.fillRect(-20, horizon, w + 40, h - horizon + 20);
  for (let lx = 60; lx < 1500; lx += 150) {
    c.fillStyle = '#120a0c'; c.fillRect(lx, horizon - 46, 4, 66);
    c.fillStyle = '#fff2da'; c.beginPath(); c.arc(lx + 2, horizon - 50, 6, 0, TAU); c.fill();
    glow(c, lx + 2, horizon - 50, 36, 'rgba(255, 236, 200, 0.95)', 0.4);
  }
  // the dusk over all of it: the city is behind him now, not the subject
  c.fillStyle = 'rgba(36, 20, 40, 0.3)';
  c.fillRect(-20, -20, w + 40, h + 40);
  finishLayer(c, w, h, { grain: 0.1, vig: 0 });
}

function paintSeatRoom(c, w, h) {
  damaskWall(c, -20, -20, w + 40, h + 40, { seed: 4630, tone: ['#0d191d', '#142529'] });
  wainscot(c, -20, w + 20, SEATS.y - 30, h + 20, { seed: 4631, panelW: 170 });
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 20;
  c.fillStyle = '#3a2416';
  roundRectPath(c, GLASS1.x - 22, GLASS1.y - 22, GLASS1.w + 44, GLASS1.h + 44, GLASS1.r + 22); c.fill();
  c.restore();
  wood(c, GLASS1.x - 22, GLASS1.y - 22, GLASS1.w + 44, 22, { base: '#432a1a', seed: 4632 });
  c.globalCompositeOperation = 'destination-out';
  roundRectPath(c, GLASS1.x, GLASS1.y, GLASS1.w, GLASS1.h, GLASS1.r); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.save(); c.lineWidth = 6; c.strokeStyle = brassFill(c, GLASS1.x, GLASS1.y, GLASS1.w, GLASS1.h); roundRectPath(c, GLASS1.x, GLASS1.y, GLASS1.w, GLASS1.h, GLASS1.r); c.stroke(); c.restore();
  wood(c, GLASS1.x - 40, GLASS1.y + GLASS1.h + 14, GLASS1.w + 80, 20, { base: '#5a3a22', seed: 4633 });
  ink(c, [[GLASS1.x - 40, GLASS1.y + GLASS1.h + 14], [GLASS1.x + GLASS1.w + 40, GLASS1.y + GLASS1.h + 14]], { w: 2.4, alpha: 0.7, seed: 4634 });
}

function paintSeats(c, w, h) {
  seatBack(c, SEATS.left[0], SEATS.y, SEATS.left[1] - SEATS.left[0], 150, { seed: 4640 });
  seatBack(c, SEATS.right[0], SEATS.y, SEATS.right[1] - SEATS.right[0], 150, { seed: 4641 });
  // the walnut armrest between the two places
  wood(c, 786, SEATS.y - 6, 28, h - SEATS.y + 10, { base: '#3a2517', seed: 4642, vertical: true });
  c.fillStyle = brassFill(c, 782, SEATS.y - 12, 36, 8); c.fillRect(782, SEATS.y - 12, 36, 8);
  ink(c, [[786, h], [786, SEATS.y - 6], [814, SEATS.y - 6], [814, h]], { w: 1.8, alpha: 0.6, seed: 4643 });
  // the white antimacassars over the headrests: his straight, hers pulled askew
  antimacassar(c, 540, SEATS.y - 6, 0, 4645);
  antimacassar(c, SEAT43.x + 14, SEATS.y - 4, 0.07, 4646);
  // the seat numbers, brass plates on the backs
  [['42', 540], ['43', SEAT43.x]].forEach(([n, x], i) => {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
    c.fillStyle = brassFill(c, x - 34, SEAT43.y - 15, 68, 30);
    roundRectPath(c, x - 34, SEAT43.y - 15, 68, 30, 6); c.fill();
    c.restore();
    c.fillStyle = 'rgba(40, 24, 10, 0.92)';
    c.font = '700 22px "Space Mono", monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(n, x, SEAT43.y + 1);
    inkRect(c, x - 34, SEAT43.y - 15, 68, 30, { w: 1.4, alpha: 0.5, bleed: false, seed: 4644 + i });
  });
  c.textAlign = 'left';
}

/** A lace cloth over the top of a seat back, scalloped along its hem. */
function antimacassar(c, x, y, angle, seed) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  const w2 = 96;
  const path = new Path2D();
  path.moveTo(-w2, 0); path.lineTo(w2, 0); path.lineTo(w2, 22);
  for (let k = 0; k < 12; k += 1) {
    const x0 = w2 - (k * 2 * w2) / 12;
    path.quadraticCurveTo(x0 - w2 / 12, 34, x0 - (2 * w2) / 12, 22);
  }
  path.closePath();
  c.fillStyle = 'rgba(226, 214, 190, 0.92)';
  c.fill(path);
  c.fillStyle = 'rgba(120, 96, 70, 0.22)';
  const r = rng(seed);
  for (let i = 0; i < 40; i += 1) { c.beginPath(); c.arc(-w2 + 8 + r() * (w2 * 2 - 16), 6 + r() * 16, 1.6, 0, TAU); c.fill(); }
  ink(c, [[-w2, 0], [w2, 0], [w2, 22]], { w: 1.2, alpha: 0.4, bleed: false, color: '#3a2a1a', seed });
  c.restore();
}

function shotSeat43(c, t, w, h, env) {
  const run = env.reducedMotion ? 0 : 620 * t * t;
  env.drawLayer(c, 'room', paintSeatRoom);
  c.save();
  roundRectPath(c, GLASS1.x, GLASS1.y, GLASS1.w, GLASS1.h, GLASS1.r);
  c.clip();
  env.drawLayer(c, 'city', paintEchoDusk, { x: GLASS1.x - 60 - run, y: GLASS1.y - 30, w: CITY.w, h: CITY.h, depth: 0.7 });
  // the platform's lamp posts going by faster as the train gathers speed
  const posts = env.reducedMotion ? 0 : 2400 * t * t;
  for (let k = 0; k < 4; k += 1) {
    const px = GLASS1.x + 300 + k * 520 - posts;
    if (px < GLASS1.x - 40 || px > GLASS1.x + GLASS1.w + 40) continue;
    c.fillStyle = '#0c0709';
    c.fillRect(px, GLASS1.y + 168, 10, GLASS1.h);
    c.fillStyle = '#efe0c4';
    c.beginPath(); c.arc(px + 5, GLASS1.y + 160, 10, 0, TAU); c.fill();
    glow(c, px + 5, GLASS1.y + 160, 70, 'rgba(255, 230, 190, 0.95)', 0.22);
  }
  // dusk deepening as the city falls behind
  c.fillStyle = `rgba(26, 16, 34, ${0.06 + 0.3 * ramp(t, 0.2, 1)})`;
  c.fillRect(GLASS1.x, GLASS1.y, GLASS1.w, GLASS1.h);
  c.restore();
  // his lamp on the sill, his back to us; he looks at the empty place once
  const flicker = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 9.1) * Math.sin(env.wall * 3.7 + 2);
  drawOilLamp(c, LAMP1.x, LAMP1.y, LAMP1.s, { flame: 0.9 + flicker });
  drawButchBack(c, BUTCH1.x, BUTCH1.y, BUTCH1.s, { lampSide: -1, light: 0.9, turn: 0.9 * ramp(t, 0.42, 0.66) });
  env.drawLayer(c, 'seats', paintSeats);
  c.save();
  c.globalCompositeOperation = 'lighter';
  // the dusk through the window, rose on both backs
  c.fillStyle = vgrad(c, GLASS1.y + GLASS1.h, h, [[0, `rgba(232, 140, 100, ${0.1 * (1 - 0.5 * t)})`], [1, 'rgba(232, 140, 100, 0)']]);
  c.fillRect(0, GLASS1.y + GLASS1.h, w, h);
  // the lamp's pool, on him
  const g = c.createRadialGradient(LAMP1.x, LAMP1.y - 70, 0, LAMP1.x, LAMP1.y - 70, 560);
  g.addColorStop(0, `rgba(255, 176, 96, ${0.26 + flicker})`); g.addColorStop(0.45, 'rgba(255, 160, 80, 0.07)'); g.addColorStop(1, 'rgba(255, 160, 80, 0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // seat 43: empty, and still warm
  const warm = 0.3 + (env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 1.3));
  const s = c.createRadialGradient(SEAT43.x, SEAT43.y - 20, 0, SEAT43.x, SEAT43.y - 20, 260);
  s.addColorStop(0, `rgba(255, 160, 110, ${warm})`); s.addColorStop(0.5, `rgba(255, 150, 100, ${warm * 0.35})`); s.addColorStop(1, 'rgba(255, 150, 100, 0)');
  c.fillStyle = s; c.fillRect(SEAT43.x - 300, SEAT43.y - 300, 600, 600);
  c.restore();
  amberGlint(c, SEAT43.x + 26, SEAT43.y - 12, 8, 0.4 + 0.6 * ramp(t, 0.5, 0.8));
  vignette(c, w, h, 0.5);
}

function vignette(c, w, h, strength) {
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(5, 4, 8, ${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// shot 2: the world outside loses its colour into pencil on paper

const GLASS2 = Object.freeze({ x: 70, y: 44, w: 1460, h: 566, r: 30 });
const PANO = Object.freeze({ w: 2400, h: 600 });
const PANO_STAGE = Object.freeze({ w: PANO.w * (GLASS2.h / PANO.h), h: GLASS2.h });

/** The country beyond Echo City, drawn by Chapter 4's hand (countryArt.paintCountry). */
const panorama = (c) => once('pano-3-4', () => paintCountry({
  w: PANO.w,
  h: PANO.h,
  seed: 4702,
  horizon: 0.36,
  sun: false,
  washScale: 0.5,
  features: [
    { kind: 'orchard', x: 90, s: 1.5, n: 3 },
    { kind: 'house', x: 430, s: 1.9, lit: true },
    { kind: 'hawthorn', x: 720, s: 1.6 },
    { kind: 'farm', x: 880, s: 1.7 },
    { kind: 'tree', x: 1300, s: 1.6 },
    { kind: 'orchard', x: 1440, s: 1.45, n: 4 },
    { kind: 'hawthorn', x: 1790, s: 1.6 },
    { kind: 'house', x: 1900, s: 1.8 },
    { kind: 'orchard', x: 2150, s: 1.4, n: 3 },
  ],
}), c);

function paintPanoColour(c, w, h) {
  const k = h / PANO.h;
  c.save();
  c.scale(k, k);
  paintPaper(c, 0, 0, PANO.w, PANO.h, { tone: INK.sheetHigh, seed: 4710, grid: 0 });
  drawArt(c, panorama(c), { wash: 1 });
  // the last of the dusk on it, warm
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = vgrad(c, 0, PANO.h, [[0, '#f0cbb8'], [0.45, '#f8e2c6'], [1, '#f2dcc0']]);
  c.fillRect(0, 0, PANO.w, PANO.h);
  c.restore();
}

function paintPanoPencil(c, w, h) {
  const k = h / PANO.h;
  c.save();
  c.scale(k, k);
  paintPaper(c, 0, 0, PANO.w, PANO.h, { tone: INK.sheetHigh, seed: 4711, grid: 0.06 });
  drawArt(c, panorama(c), { wash: 0 });
  c.restore();
}

function paintWindowFrame(c, w, h) {
  damaskWall(c, -20, -20, w + 40, h + 40, { seed: 4720, tone: ['#0d191d', '#132428'] });
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 24;
  c.fillStyle = '#3a2416';
  roundRectPath(c, GLASS2.x - 26, GLASS2.y - 26, GLASS2.w + 52, GLASS2.h + 52, GLASS2.r + 24); c.fill();
  c.restore();
  wood(c, GLASS2.x - 26, GLASS2.y - 26, GLASS2.w + 52, GLASS2.h + 52, { base: '#3e2818', seed: 4721 });
  c.globalCompositeOperation = 'destination-out';
  roundRectPath(c, GLASS2.x, GLASS2.y, GLASS2.w, GLASS2.h, GLASS2.r); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.save(); c.lineWidth = 7; c.strokeStyle = brassFill(c, GLASS2.x, GLASS2.y, GLASS2.w, GLASS2.h); roundRectPath(c, GLASS2.x, GLASS2.y, GLASS2.w, GLASS2.h, GLASS2.r); c.stroke(); c.restore();
  wood(c, -20, GLASS2.y + GLASS2.h + 24, w + 40, h, { base: '#5a3a22', seed: 4722 });
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-20, GLASS2.y + GLASS2.h + 44, w + 40, h);
  ink(c, [[-20, GLASS2.y + GLASS2.h + 24], [w + 20, GLASS2.y + GLASS2.h + 24]], { w: 2.6, alpha: 0.8, seed: 4723 });
}

/** The front where the colour gives out: ragged, wet, a little slanted. */
function frontPath(x, y0, y1, seed, amp = 26) {
  const pts = [];
  for (let y = y0 - 10; y <= y1 + 10; y += 20) {
    pts.push([x + (y - (y0 + y1) / 2) * 0.12 + amp * Math.sin(y * 0.021 + seed) + amp * 0.45 * Math.sin(y * 0.077 + seed * 2), y]);
  }
  return pts;
}

function shotColourDrains(c, t, w, h, env) {
  const run = env.reducedMotion ? 0 : (PANO_STAGE.w - GLASS2.w - 20) * t;
  const pencilLayer = env.layer('pano-pencil', paintPanoPencil, PANO_STAGE);
  const colourLayer = env.layer('pano-colour', paintPanoColour, PANO_STAGE);
  env.drawLayer(c, 'frame', paintWindowFrame);
  c.save();
  roundRectPath(c, GLASS2.x, GLASS2.y, GLASS2.w, GLASS2.h, GLASS2.r);
  c.clip();
  const px = GLASS2.x - run;
  c.drawImage(colourLayer.canvas, px, GLASS2.y, colourLayer.w, colourLayer.h);
  // the pencil country comes in from ahead and spreads back over the colour
  const fx = GLASS2.x + GLASS2.w + 120 - (GLASS2.w + 300) * smooth(ramp(t, 0.06, 0.86));
  const front = frontPath(fx, GLASS2.y, GLASS2.y + GLASS2.h, 2.3);
  c.save();
  c.beginPath();
  front.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.lineTo(GLASS2.x + GLASS2.w + 400, GLASS2.y + GLASS2.h + 20);
  c.lineTo(GLASS2.x + GLASS2.w + 400, GLASS2.y - 20);
  c.closePath();
  c.clip();
  c.drawImage(pencilLayer.canvas, px, GLASS2.y, pencilLayer.w, pencilLayer.h);
  // the colour lifting off just behind the front: pale, bleached paper
  const lift = c.createLinearGradient(fx - 30, 0, fx + 160, 0);
  lift.addColorStop(0, 'rgba(253, 252, 248, 0.55)');
  lift.addColorStop(1, 'rgba(253, 252, 248, 0)');
  c.fillStyle = lift;
  c.fillRect(fx - 60, GLASS2.y, 260, GLASS2.h);
  c.restore();
  // the drying edge itself: pigment pooled where it stopped
  c.save();
  c.strokeStyle = 'rgba(118, 112, 126, 0.42)';
  c.lineWidth = 4;
  c.lineJoin = 'round';
  c.beginPath();
  front.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  c.strokeStyle = 'rgba(74, 70, 64, 0.35)';
  c.lineWidth = 1.2;
  c.stroke();
  c.restore();
  // telegraph poles running by, drafted in pencil
  const poleRun = env.reducedMotion ? 0 : env.wall * 520;
  const span = 560;
  const base = GLASS2.x - ((poleRun % span) + span) % span;
  const tops = [];
  for (let x = base; x < GLASS2.x + GLASS2.w + span; x += span) tops.push(x);
  c.strokeStyle = 'rgba(52, 49, 44, 0.85)';
  c.lineCap = 'round';
  tops.forEach((x) => {
    c.lineWidth = 7; c.beginPath(); c.moveTo(x, GLASS2.y + 70); c.lineTo(x + 4, GLASS2.y + GLASS2.h + 10); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(x - 30, GLASS2.y + 96); c.lineTo(x + 34, GLASS2.y + 94); c.stroke();
  });
  c.lineWidth = 1.3;
  c.strokeStyle = 'rgba(52, 49, 44, 0.6)';
  for (let i = 0; i < tops.length - 1; i += 1) {
    [-26, 28].forEach((o) => { c.beginPath(); c.moveTo(tops[i] + o, GLASS2.y + 92); c.quadraticCurveTo((tops[i] + tops[i + 1]) / 2, GLASS2.y + 130, tops[i + 1] + o, GLASS2.y + 92); c.stroke(); });
  }
  // glass: one soft sheen
  c.fillStyle = 'rgba(220, 230, 240, 0.06)';
  c.beginPath(); c.moveTo(GLASS2.x + 200, GLASS2.y); c.lineTo(GLASS2.x + 420, GLASS2.y); c.lineTo(GLASS2.x + 180, GLASS2.y + GLASS2.h); c.lineTo(GLASS2.x - 40, GLASS2.y + GLASS2.h); c.closePath(); c.fill();
  c.restore();
  // his lamp on the sill, and its small warm reflection in the glass
  const flicker = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 9.1) * Math.sin(env.wall * 3.7 + 2);
  drawOilLamp(c, 170, GLASS2.y + GLASS2.h + 30, 4.4, { flame: 0.9 + flicker });
  glow(c, 170, GLASS2.y + GLASS2.h - 60, 120, 'rgba(255, 190, 120, 0.9)', 0.12);
  vignette(c, w, h, 0.42);
}

// ---------------------------------------------------------------------------
// shots 3 and 4: Rosa's drawing on the archive's desk; the grey; FILED

const SHEET = Object.freeze({ x: 330, y: 86, w: 940, angle: -0.022 });
const SHEET_H = SHEET.w * (DRAWING.h / DRAWING.w);
const PAD = 24;
const SHEET_BOX = Object.freeze({ w: SHEET.w + PAD * 2, h: SHEET_H + PAD * 2 });

function paintDesk(c, w, h) {
  wood(c, -20, -20, w + 40, h + 40, { base: '#2c1d13', seed: 4801, planks: 5, grain: 'rgba(0,0,0,0.3)' });
  // the summers underneath: older drawings, squared up by a clerk
  [[-0.05, -46, 30, 4810], [0.035, 34, -24, 4811], [-0.012, -16, 18, 4812]].forEach(([a, dx, dy, seed]) => {
    c.save();
    c.translate(SHEET.x + SHEET.w / 2 + dx, SHEET.y + SHEET_H / 2 + dy);
    c.rotate(a);
    paperSheet(c, -SHEET.w / 2, -SHEET_H / 2, SHEET.w, SHEET_H, { seed, tone: '#f1ebdc', shadow: 0.45 });
    const r = rng(seed);
    for (let i = 0; i < 5; i += 1) {
      const ex = (r() > 0.5 ? 1 : -1) * SHEET.w * (0.42 + r() * 0.05);
      const ey = (r() - 0.5) * SHEET_H * 0.8;
      c.fillStyle = ['rgba(125, 163, 111, 0.35)', 'rgba(201, 88, 80, 0.3)', 'rgba(143, 179, 207, 0.32)'][i % 3];
      c.beginPath(); c.ellipse(ex, ey, 22 + r() * 30, 14 + r() * 20, r() * 3, 0, TAU); c.fill();
    }
    c.restore();
  });
  // the archive's tag on the bundle, and a child's paintbox left beside it
  paperTag(c, SHEET.x - 120, SHEET.y + SHEET_H - 150, { angle: 0.32, scale: 3.2, glint: false, string: [SHEET.x + 26, SHEET.y + SHEET_H - 110], text: 'VELEZ, R.', seed: 4820 });
  paintbox(c, 1330, 600);
  finishLayer(c, w, h, { grain: 0.14, vig: 0 });
}

/** A tin paintbox: six pans, Rosa's six colours, one brush. */
function paintbox(c, x, y) {
  c.save();
  c.translate(x, y);
  c.rotate(0.12);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16; c.shadowOffsetY = 6;
  c.fillStyle = '#2b3a44';
  roundRectPath(c, 0, 0, 230, 96, 10); c.fill();
  c.restore();
  c.save();
  c.translate(x, y);
  c.rotate(0.12);
  c.fillStyle = '#d9d2c2';
  roundRectPath(c, 8, 8, 214, 80, 6); c.fill();
  ['#c95850', '#d98a3a', '#d7b84a', '#5e9172', '#537ca6', '#84658f'].forEach((col, i) => {
    const px = 16 + (i % 3) * 68;
    const py = 14 + Math.floor(i / 3) * 36;
    c.fillStyle = '#efe9dc'; c.fillRect(px, py, 60, 30);
    c.fillStyle = col; c.beginPath(); c.ellipse(px + 30, py + 15, 24, 10, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(px + 24, py + 11, 10, 3, 0, 0, TAU); c.fill();
  });
  ink(c, [[0, 0], [230, 0], [230, 96], [0, 96]], { w: 1.6, alpha: 0.5, closed: true, bleed: false, color: '#0b1014', seed: 4830 });
  // the brush across the lid
  c.strokeStyle = '#cc785c'; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-30, 124); c.lineTo(190, 116); c.stroke();
  c.strokeStyle = '#8a8a86'; c.lineWidth = 10; c.beginPath(); c.moveTo(190, 116); c.lineTo(214, 115); c.stroke();
  c.fillStyle = '#3a2a1e'; c.beginPath(); c.moveTo(214, 110); c.quadraticCurveTo(250, 114, 214, 121); c.closePath(); c.fill();
  c.restore();
}

// The sheet's layers, in its own frame (PAD round it for the deckle and shadow).
function paintSheetPaper(c) { paperSheet(c, PAD, PAD, SHEET.w, SHEET_H, { seed: 4840, shadow: 0.55 }); }
function sheetArt(groups, wash = 1, pencilAlpha = 0) {
  return (c) => drawArt(c, rosaDrawing(c), { x: PAD, y: PAD, w: SHEET.w, h: SHEET_H, wash, groups, pencilAlpha });
}
function paintSheetDone(c) {
  paintSheetPaper(c);
  drawArt(c, rosaDrawing(c), { x: PAD, y: PAD, w: SHEET.w, h: SHEET_H });
}
function paintSheetGrey(c) {
  paintSheetPaper(c);
  drawRosaDrawing(c, PAD, PAD, SHEET.w, { mode: 'grey', sheet: false });
}
function paintStamp(c, w, h) { rubberStamp(c, w / 2, h / 2, 'FILED', { size: 92, angle: 0, alpha: 0.88, seed: 4850 }); }

/** Into the sheet's frame (rotated a little on the desk). */
function onSheet(c, draw) {
  c.save();
  c.translate(SHEET.x + SHEET.w / 2, SHEET.y + SHEET_H / 2);
  c.rotate(SHEET.angle);
  c.translate(-SHEET.w / 2 - PAD, -SHEET_H / 2 - PAD);
  draw();
  c.restore();
}

function deskLight(c, w, h, strength = 1) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(1180, 120, 0, 1180, 120, 1100);
  g.addColorStop(0, `rgba(255, 190, 110, ${0.14 * strength})`);
  g.addColorStop(0.5, `rgba(255, 170, 90, ${0.05 * strength})`);
  g.addColorStop(1, 'rgba(255, 170, 90, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.restore();
  vignette(c, w, h, 0.55);
}

function shotDrawing(c, t, w, h, env) {
  env.drawLayer(c, '@desk', paintDesk);
  const paper = env.layer('@sheet-paper', paintSheetPaper, SHEET_BOX);
  const cool = env.layer('sheet-cool', sheetArt(['blue', 'violet', 'green']), SHEET_BOX);
  const warm = env.layer('sheet-warm', sheetArt(['yellow', 'red', 'orange']), SHEET_BOX);
  const lines = env.layer('@sheet-pencil', sheetArt(null, 0, 1), SHEET_BOX);
  // her colours bloom into the pencil, the leaves first, the haws last
  const a = env.reducedMotion ? 1 : ramp(t, 0.08, 0.46);
  const b = env.reducedMotion ? 1 : ramp(t, 0.24, 0.64);
  onSheet(c, () => {
    c.drawImage(paper.canvas, 0, 0, paper.w, paper.h);
    if (a > 0) { c.globalAlpha = a; c.drawImage(cool.canvas, 0, 0, cool.w, cool.h); }
    if (b > 0) { c.globalAlpha = b; c.drawImage(warm.canvas, 0, 0, warm.w, warm.h); }
    c.globalAlpha = 1;
    c.drawImage(lines.canvas, 0, 0, lines.w, lines.h);
  });
  deskLight(c, w, h);
}

function shotFiled(c, t, w, h, env) {
  env.drawLayer(c, '@desk', paintDesk);
  const done = env.layer('sheet-done', paintSheetDone, SHEET_BOX);
  const grey = env.layer('sheet-grey', paintSheetGrey, SHEET_BOX);
  const stamp = env.layer('stamp', paintStamp, { w: 520, h: 240 });
  // the stamp's knock: a short jolt of the desk
  const hit = ramp(t, 0.6, 0.62) - ramp(t, 0.62, 0.68);
  if (!env.reducedMotion && hit > 0) c.translate(0, 3 * hit);
  onSheet(c, () => {
    c.drawImage(done.canvas, 0, 0, done.w, done.h);
    // the archive's grey, dragged across in one broad stroke, left to right
    const p = env.reducedMotion ? ramp(t, 0.1, 0.4) : smooth(ramp(t, 0.06, 0.5));
    const fx = -60 + (SHEET_BOX.w + 140) * p;
    const front = frontPath(fx, 0, SHEET_BOX.h, 5.1, 14);
    if (p > 0) {
      c.save();
      c.beginPath();
      c.moveTo(-40, -40);
      front.forEach(([x, y]) => c.lineTo(x, y));
      c.lineTo(-40, SHEET_BOX.h + 40);
      c.closePath();
      c.clip();
      if (env.reducedMotion && p < 1) c.globalAlpha = p;
      c.drawImage(grey.canvas, 0, 0, grey.w, grey.h);
      c.restore();
      if (p < 1 && !env.reducedMotion) {
        // the wet edge of the stroke and its bristle streaks
        c.save();
        c.beginPath(); c.rect(PAD, PAD, SHEET.w, SHEET_H); c.clip();
        c.strokeStyle = 'rgba(120, 116, 108, 0.55)';
        c.lineWidth = 7;
        c.lineJoin = 'round';
        c.beginPath();
        front.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
        const r = rng(4860);
        c.strokeStyle = 'rgba(96, 92, 86, 0.22)';
        c.lineWidth = 1.6;
        for (let i = 0; i < 26; i += 1) {
          const y = PAD + r() * SHEET_H;
          c.beginPath(); c.moveTo(fx - 120 - r() * 160, y); c.lineTo(fx - 6, y + (r() - 0.5) * 4); c.stroke();
        }
        c.restore();
      }
    }
    // FILED
    const land = ramp(t, 0.58, 0.61);
    if (land > 0) {
      const s = 1 + 0.4 * (1 - ramp(t, 0.58, 0.62));
      c.save();
      c.translate(PAD + SHEET.w * 0.63, PAD + SHEET_H * 0.44);
      c.rotate(-0.13);
      c.scale(s, s);
      c.globalAlpha = land;
      c.drawImage(stamp.canvas, -stamp.w / 2, -stamp.h / 2, stamp.w, stamp.h);
      c.restore();
    }
  });
  deskLight(c, w, h, 1 - 0.25 * ramp(t, 0.1, 0.5));
}

// ---------------------------------------------------------------------------
// shot 5: the train slows into the unfinished drawing; a hawthorn still red

const RAIL5 = 548;
const TRAIN5 = Object.freeze({ s: 0.96 });
const HAW5 = Object.freeze({ x: 1158, y: 640, r: 13 });

/** The unfinished drawing as a country: Rosa's orchard and house, the rails, the hedge; on the right only guide lines. */
const world5 = (c) => once('world-3-4', () => {
  const W = 1600; const H = 800;
  const L = artLayers(W, H, { washScale: 0.5, scale: 1.25 });
  const p = L.p;
  // the far hills and the ground, finished only as far as she got
  const ridge = [];
  for (let x = -20; x <= 1100; x += 30) ridge.push([x, 330 - Math.sin(x * 0.004 + 1) * 46 - Math.sin(x * 0.011) * 14]);
  pencil(p, ridge, { w: 1.4, alpha: 0.6, seed: 4901, color: INK.soft });
  wash(L.w$('violet'), [...ridge, [1100, 520], [-20, 520]], HUE.mulberry, { alpha: 0.3, seed: 4902, bloom: 0.4 });
  hatch(p, [...ridge.map(([x, y]) => [x, y + 4]), [1100, 400], [-20, 400]], { spacing: 7, alpha: 0.16, angle: -0.6, seed: 4903, length: 0.6 });
  const ground = [];
  for (let x = -20; x <= 1620; x += 40) ground.push([x, 470 + Math.sin(x * 0.006) * 8]);
  pencil(p, ground.filter(([x]) => x < 1260), { w: 1.6, alpha: 0.8, seed: 4904 });
  wash(L.w$('green'), [...ground.filter(([x]) => x < 1240), [1300, 520], [1340, 800], [-20, 800]], HUE.leaf, { alpha: 0.4, seed: 4905, bloom: 0.45 });
  // the orchard on the left, the house beyond the line
  appleTree(L, 90, 478, 1.5, 4910, { apples: 9 });
  appleTree(L, 250, 472, 1.25, 4911, { apples: 8 });
  appleTree(L, 400, 476, 1.4, 4912, { apples: 9 });
  house(L, 760, 470, 230, 150, 4913, { roofH: 104, lit: false });
  appleTree(L, 1060, 470, 1.1, 4914, { apples: 6 });
  // the line through the drawing: two rails, the sleepers hatched in
  rule(p, -20, RAIL5, 1620, RAIL5 - 2, { w: 2, seed: 4920 });
  rule(p, -20, RAIL5 + 12, 1620, RAIL5 + 10, { w: 1.4, alpha: 0.7, seed: 4921 });
  for (let x = -10; x < 1620; x += 34) rule(p, x, RAIL5 + 14, x + 12, RAIL5 - 2, { w: 1, alpha: 0.45, seed: 4922 + x, overshoot: 0 });
  // the hedge in front, the hawthorn on its right
  const top = [];
  for (let x = -20; x <= 1620; x += 22) top.push([x, 620 + Math.sin(x * 0.06) * 8 + Math.sin(x * 0.17) * 4]);
  pencil(p, top, { w: 1.8, seed: 4930, jitter: 1 });
  for (let x = 0; x < 1600; x += 50) scribble(p, x, 660, 30, 26, { seed: 4931 + x, loops: 5, alpha: 0.3, w: 1 });
  const hem = [];
  for (let x = 1620; x >= -20; x -= 26) hem.push([x, 714 + Math.sin(x * 0.09) * 6 + Math.sin(x * 0.23) * 4]);
  wash(L.w$('green'), [...top, ...hem], HUE.leafDark, { alpha: 0.7, seed: 4932, bloom: 0.35 });
  [60, 230, 390, 550, 700, 860, 1010, 1160, 1320, 1480].forEach((x, i) => hawthorn(L, x, 722, 1.05, 4940 + i * 11));
  const red = L.w$('red');
  const haws = rng(4960);
  for (let i = 0; i < 90; i += 1) washBlob(red, haws() * 1600, 634 + haws() * 70, 5 + haws() * 3, 5 + haws() * 3, HUE.vermilion, { alpha: 0.9, seed: 4961 + i, lobes: 6, blur: 0.3 });
  // where she stopped: guide lines, a house and a tree begun and left
  const guide = { w: 1, alpha: 0.32, color: INK.soft };
  rule(p, 1240, 470, 1620, 466, { ...guide, seed: 4980 });
  rule(p, 1100, 300, 1620, 290, { ...guide, seed: 4981 });
  pencil(p, [[1330, 470], [1330, 380], [1420, 330], [1510, 380], [1510, 470]], { ...guide, smooth: false, seed: 4982 });
  pencil(p, blob(1460, 240, 60, 46, { seed: 4983 }), { ...guide, closed: true, seed: 4984 });
  rule(p, 1460, 286, 1462, 470, { ...guide, seed: 4985 });
  return L.finish(0.36);
}, c);

function paintWorld5(c, w, h) {
  paintPaper(c, 0, 0, w, h, { tone: INK.sheet, seed: 4990, grid: 0.07 });
  drawArt(c, world5(c), { wash: 0.7, grey: true, pencilAlpha: 0.85 });
  // the archive's grey over all of it, thinning where she stopped drawing
  const grey = document.createElement('canvas');
  grey.width = Math.ceil(w / 2); grey.height = Math.ceil(h / 2);
  const g = grey.getContext('2d', c.getContextAttributes?.() ?? {});
  g.scale(0.5, 0.5);
  greyWash(g, 0, 0, w, h, { seed: 4991 });
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = (() => { const fade = g.createLinearGradient(1100, 0, 1500, 0); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.75)'); return fade; })();
  g.fillRect(0, 0, w, h);
  c.drawImage(grey, 0, 0, w, h);
  finishLayer(c, w, h, { grain: 0.08, vig: 0.18 });
}

function shotStillRed(c, t, w, h, env) {
  env.drawLayer(c, 'world', paintWorld5);
  const body = env.layer('@train-pencil', (lc) => paintTrainBody(lc, 'pencil'), { w: TRAIN_BOX.w, h: TRAIN_BOX.h });
  const greyBody = env.layer('train-grey', (lc) => {
    paintTrainBody(lc, 'pencil');
    lc.globalCompositeOperation = 'source-atop';
    lc.fillStyle = 'rgba(150, 146, 138, 0.42)';
    lc.fillRect(0, 0, TRAIN_BOX.w, TRAIN_BOX.h);
  }, { w: TRAIN_BOX.w, h: TRAIN_BOX.h });
  // the train runs in from the left and slows to a stop by the hedge
  const u = env.reducedMotion ? 1 : ramp(t, 0, 0.74);
  const travel = 1 - (1 - u) ** 2.4;
  const s = TRAIN5.s;
  const front = -60 + 1000 * travel;
  const x = front - TRAIN_BOX.w * s;
  const y = RAIL5 - TRAIN_BOX.rail * s;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.drawImage(body.canvas, 0, 0, body.w, body.h);
  // as it slows it takes on the drawing's grey
  const settle = ramp(t, 0.3, 0.85);
  if (settle > 0) { c.globalAlpha = settle; c.drawImage(greyBody.canvas, 0, 0, greyBody.w, greyBody.h); c.globalAlpha = 1; }
  drawTrainWheels(c, 'pencil', (1000 * travel) / (33 * s));
  c.restore();
  // one haw, red under the grey
  const pulse = env.reducedMotion ? 0 : 0.04 * Math.sin(env.wall * 2.1);
  const show = 0.35 + 0.65 * ramp(t, 0.3, 0.6);
  c.save();
  c.globalAlpha = show;
  redHaw(c, HAW5.x, HAW5.y, HAW5.r, { glowAlpha: (0.1 + pulse) * show });
  redHaw(c, HAW5.x + 16, HAW5.y + 8, HAW5.r * 0.72);
  c.restore();
}

// ---------------------------------------------------------------------------

export const chapter3To4 = {
  id: 'chapter3To4',
  title: 'The painted country',
  length: [25, 40],
  // Ch3's dusk cue (Ivan Ilić, CC BY 3.0, credited in public/CREDITS.md)
  music: { id: 'cutscene-3-4', src: '/assets/music/ch3/3.6_chopin_prelude_op28_no4.mp3', volume: 0.46, fade: 2.5, outFade: 3 },
  prepare: () => Promise.all([
    usePaintAssets({ paper: paperUrl, train: trainUrl }),
    prebuild([() => panorama(), () => rosaDrawing(), () => world5(), () => buildTrain('pencil')]),
  ]),
  shots: [
    {
      id: 'seat-43',
      duration: 7.4,
      draw: shotSeat43,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.6, y: 0.64, zoom: 1.3 }, still: { x: 0.55, y: 0.56, zoom: 1.12 } },
      transition: { type: 'slide', duration: 1.1 },
      cues: [{ at: 0, sfx: 'rail', level: 0.8 }, { at: 0.7, sfx: 'whistle' }],
    },
    {
      id: 'colour-drains',
      duration: 7.2,
      draw: shotColourDrains,
      camera: { from: { x: 0.52, y: 0.44, zoom: 1.12 }, to: { x: 0.46, y: 0.44, zoom: 1.2 }, still: { x: 0.5, y: 0.44, zoom: 1.14 } },
      transition: { type: 'fade', duration: 1.2 },
      cues: [{ at: 0, sfx: 'rail', level: 1.1 }],
    },
    {
      id: 'rosas-drawing',
      duration: 6.6,
      draw: shotDrawing,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.0 }, to: { x: 0.5, y: 0.5, zoom: 1.12 }, still: { x: 0.5, y: 0.5, zoom: 1.08 } },
      transition: { type: 'cut' },
      captions: [{ text: 'Rosa Velez drew the orchard every summer.', at: 0.9, end: 5.3 }],
      cues: [{ at: 0, sfx: 'rail', level: 0.45 }, { at: 0.5, sfx: 'paper' }],
    },
    {
      id: 'filed',
      duration: 7.6,
      draw: shotFiled,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.12 }, to: { x: 0.53, y: 0.48, zoom: 1.2 }, still: { x: 0.5, y: 0.5, zoom: 1.08 } },
      transition: { type: 'fade', duration: 1.3 },
      captions: [{ text: 'The archive kept her drawings, and painted the colour out.\nColour is hard to file.', at: 0.7, end: 6.5 }],
      cues: [{ at: 0.45, sfx: 'paper' }, { at: 4.5, sfx: 'thud' }],
    },
    {
      id: 'still-red',
      duration: 8.6,
      draw: shotStillRed,
      camera: { from: { x: 0.4, y: 0.5, zoom: 1.1 }, to: { x: 0.68, y: 0.66, zoom: 1.45 }, still: { x: 0.6, y: 0.6, zoom: 1.2 } },
      captions: [{ text: 'Under the grey, a hawthorn was still red.', at: 2.3, end: 7 }],
      cues: [
        { at: 0, sfx: 'rail', level: 0.8 }, { at: 1.6, sfx: 'brake' }, { at: 4.4, stopSfx: 'rail', fade: 2.4 },
        { at: 4.9, sfx: 'softBell' }, { at: 5.2, stopMusic: true, fade: 3.4 },
      ],
    },
  ],
};

export default chapter3To4;
