// Cutscene 8 · `ending` (after Chapter 6 with 0–4 stones, before the
// STATUS: OPEN card). docs/CUTSCENES_SPEC.md, canon v1.1: Butch outlasts the
// Conductor, reaches the Mara ahead and rides on beside her; the line keeps
// running because he never gets off. It mirrors the title scene (the bay, the
// rain window, the passing lamp's sweep) and the opening's viaduct.
//   1 the stacked worlds fold back, panel by panel, into one carriage
//   2 Butch walks the length of the train, lamp in hand
//   3 through the end door: her, by the window, the seat beside her empty
//   4 he sits down beside her; two lamps pass outside
//   5 the night service crosses the opening's viaduct and runs on into the dark

import paperUrl from '../../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import trainUrl from '../../../chapters/nightService/art/train-night.png?url';
import {
  PAL, amberGlint, brassFill, carriageCeiling, damaskWall, drawButch, drawButchBack, drawCeilingLamp, drawMaraSeatedBack, drawOilLamp, drawRain, drawViaductShot, drawWindowView, finishLayer, floorboards, glow, ink, inkRect, paintCountry, paintNightSky, paintWorld, ramp, rivet, rng, roundRectPath, seatBack, smooth, usePaintAssets, vgrad, wainscot, wood,
} from '../painters.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// shot 1: the worlds fold back into one carriage

const PANELS = Object.freeze([
  { kind: 'office', x: 70, y: 50, hinge: 'left' },
  { kind: 'rooftops', x: 815, y: 50, hinge: 'right' },
  { kind: 'square', x: 70, y: 415, hinge: 'left' },
  { kind: 'painted', x: 815, y: 415, hinge: 'right' },
]);
const PANEL_W = 715;
const PANEL_H = 335;

/** The carriage the worlds fold into: the night service's side at night, its windows lit. */
function paintCarriageOutside(c, w, h) {
  paintNightSky(c, w, h, { horizon: 520, moon: [1320, 140], seed: 9301, warm: 0.08 });
  paintCountry(c, w, h, { horizon: 520, seed: 9302 });
  c.fillStyle = vgrad(c, 640, h, [[0, '#0b1013'], [1, '#06090b']]);
  c.fillRect(-20, 640, w + 40, h - 620);
}

function paintCarriageSide(c, w, h) {
  // one carriage, close, its windows a row of warm lamps
  const x0 = 60; const x1 = 1540; const top = 210; const bottom = 610;
  // the night carriage's livery (art/train-night.png): cream over vermilion, a grey roof
  c.fillStyle = '#5c2416';
  roundRectPath(c, x0, top, x1 - x0, bottom - top, 34); c.fill();
  c.fillStyle = vgrad(c, top + 170, bottom, [[0, '#8a3a22'], [1, '#5a2214']]);
  c.fillRect(x0, top + 176, x1 - x0, bottom - top - 176);
  c.fillStyle = vgrad(c, top, top + 170, [[0, '#a8a090'], [1, '#8e8676']]);
  roundRectPath(c, x0, top, x1 - x0, 176, 34); c.fill();
  c.fillStyle = '#3a3e46';
  roundRectPath(c, x0 + 30, top - 26, x1 - x0 - 60, 34, 14); c.fill();
  // the pantograph
  c.strokeStyle = '#1a1d22'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(560, top - 26); c.lineTo(640, top - 110); c.lineTo(720, top - 26); c.moveTo(600, top - 120); c.lineTo(690, top - 120); c.stroke();
  c.fillStyle = '#7a3420';
  c.fillRect(x0, top + 150, x1 - x0, 26);
  c.fillStyle = brassFill(c, x0, top + 176, x1 - x0, 8);
  c.fillRect(x0, top + 176, x1 - x0, 6);
  // the windows, warm, with the lamps inside
  const windows = [130, 330, 530, 730, 930, 1130, 1330];
  windows.forEach((wx, i) => {
    c.fillStyle = vgrad(c, top + 34, top + 140, [[0, '#ffd98a'], [1, '#e09a4a']]);
    roundRectPath(c, wx, top + 34, 150, 110, 12); c.fill();
    c.fillStyle = 'rgba(90, 40, 20, 0.35)';
    c.fillRect(wx, top + 104, 150, 40);
    ink(c, [[wx, top + 34], [wx + 150, top + 34], [wx + 150, top + 144], [wx, top + 144]], { w: 2, closed: true, alpha: 0.6, bleed: false, seed: 9310 + i });
  });
  // a door, the number, the brass
  c.fillStyle = '#3a1812'; c.fillRect(1440, top + 190, 70, 200);
  ink(c, [[1440, top + 190], [1440, bottom], [1510, bottom], [1510, top + 190]], { w: 2, alpha: 0.6, bleed: false, seed: 9320 });
  c.fillStyle = PAL.brassLight; c.font = '700 30px "Space Mono", monospace'; c.fillText('LOST PROPERTY', 120, top + 260);
  ink(c, [[x0 + 34, top], [x1 - 34, top], [x1, top + 34], [x1, bottom], [x0, bottom], [x0, top + 34]], { w: 3, closed: true, alpha: 0.75, seed: 9321 });
  // bogies, wheels and the rail
  [[200, 420], [1180, 1400]].forEach(([a, b]) => {
    c.fillStyle = '#0c0d10'; c.fillRect(a, bottom, b - a, 34);
    [a + 40, b - 40].forEach((wx) => { c.fillStyle = '#08090c'; c.beginPath(); c.arc(wx, bottom + 40, 30, 0, TAU); c.fill(); ink(c, [[wx - 30, bottom + 40], [wx + 30, bottom + 40]], { w: 1.4, alpha: 0.3, bleed: false, seed: wx }); });
  });
  c.fillStyle = '#20262c'; c.fillRect(-20, 676, w + 40, 8);
  finishLayer(c, w, h, { grain: 0.14, vig: 0.5 });
}

function paintWorldPanels(c, w, h) {
  wood(c, 0, 0, w, h, { base: '#1d130c', vertical: true, seed: 9330, grain: 'rgba(0,0,0,0.34)' });
  PANELS.forEach((p, i) => {
    c.save();
    c.translate(p.x, p.y);
    paintWorld(c, p.kind, PANEL_W, PANEL_H, { seed: 9340 + i * 10 });
    finishLayer(c, PANEL_W, PANEL_H, { grain: 0.14, vig: 0.35 });
    c.restore();
  });
}

/** One world panel, folding back on its hinge (0 open, 1 folded away). */
function drawFoldingPanel(c, env, index, fold) {
  if (fold >= 1) return;
  const p = PANELS[index];
  const panels = env.layer('worlds', paintWorldPanels);
  const res = panels.canvas.width / panels.w;
  const k = Math.cos((Math.PI / 2) * smooth(fold));
  const wNow = PANEL_W * k;
  const x = p.hinge === 'left' ? p.x : p.x + PANEL_W - wNow;
  c.save();
  // the panel tips away from us as it folds: narrower, a little taller at its free edge
  c.drawImage(panels.canvas, p.x * res, p.y * res, PANEL_W * res, PANEL_H * res, x, p.y, wNow, PANEL_H);
  c.fillStyle = `rgba(4, 5, 9, ${0.75 * smooth(fold)})`;
  c.fillRect(x, p.y, wNow, PANEL_H);
  // its brass frame
  c.lineWidth = 9;
  c.strokeStyle = brassFill(c, x, p.y, wNow, PANEL_H);
  roundRectPath(c, x, p.y, wNow, PANEL_H, 12);
  c.stroke();
  c.restore();
}

function shotWorlds(c, t, w, h, env) {
  env.drawLayer(c, 'outside', paintCarriageOutside, { depth: 0.4, x: -60, w: w + 120 });
  // the country runs past: the train is moving
  const drift = env.reducedMotion ? 0 : (env.wall * 40) % 400;
  c.save();
  c.globalAlpha = 0.5;
  for (let x = -drift; x < w; x += 400) { c.fillStyle = '#070a0c'; c.fillRect(x, 300, 7, 380); }
  c.restore();
  env.drawLayer(c, 'carriage', paintCarriageSide);
  // the lamps inside the windows breathe
  [130, 330, 530, 730, 930, 1130, 1330].forEach((wx, i) => glow(c, wx + 75, 300, 120, 'rgba(255, 200, 120, 0.9)', 0.2 + 0.05 * Math.sin(env.wall * 2 + i)));
  // Butch, small, in the third window, his lamp held up
  drawButch(c, 610, 352, 1.15, { pose: 'stand', phase: env.wall, facing: 1, lamp: 'hand', glowAlpha: 0.5 });
  drawRain(c, env, { alpha: 0.55 });
  // the stacked worlds over it, folding away one after another
  const panels = env.layer('worlds', paintWorldPanels);
  const res = panels.canvas.width / panels.w;
  const folds = PANELS.map((_, i) => ramp(t, 0.12 + i * 0.13, 0.32 + i * 0.13));
  if (folds.some((f) => f < 1)) {
    // the walnut between the panels goes with the last of them
    const wallAlpha = 1 - smooth(Math.max(...folds.map((f, i) => (i === 3 ? f : 0))));
    if (wallAlpha > 0) {
      c.save();
      c.globalAlpha = wallAlpha * (1 - folds.reduce((s, f) => s + f, 0) / 4 * 0.6);
      c.beginPath();
      c.rect(0, 0, w, h);
      PANELS.forEach((p, i) => { if (folds[i] < 1) c.rect(p.x + PANEL_W, p.y, -PANEL_W, PANEL_H); });
      c.clip('evenodd');
      c.drawImage(panels.canvas, 0, 0, panels.w * res, panels.h * res, 0, 0, w, h);
      c.restore();
    }
    PANELS.forEach((_, i) => drawFoldingPanel(c, env, i, folds[i]));
  }
}

// ---------------------------------------------------------------------------
// shot 2: the walk through the train

const CAR_LEN = 1320;
const GANGWAY = 90;
const FLOOR = 610;
const CEIL = 110;
const STRIP_W = CAR_LEN * 3 + GANGWAY * 2;
const WALK = Object.freeze({ from: 420, to: STRIP_W - 700 });

function paintCarInterior(c, x0, kind, seed) {
  const x1 = x0 + CAR_LEN;
  damaskWall(c, x0, CEIL, CAR_LEN, FLOOR - CEIL, { seed, tone: ['#0f1c21', '#16292e'] });
  // windows on the far side: the night outside
  for (let wx = x0 + 110; wx < x1 - 200; wx += 300) {
    c.fillStyle = vgrad(c, 190, 400, [[0, '#0b1424'], [1, '#1b2c40']]);
    roundRectPath(c, wx, 190, 200, 200, 14); c.fill();
    const random = rng(seed + wx);
    c.strokeStyle = 'rgba(200, 220, 240, 0.14)'; c.lineWidth = 1;
    for (let k = 0; k < 20; k += 1) { const rx = wx + random() * 200; const ry = 190 + random() * 200; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 4, ry + 14); c.stroke(); }
    c.fillStyle = 'rgba(234, 223, 198, 0.4)';
    c.fillRect(wx + 30 + random() * 120, 300 + random() * 50, 2, 2);
    c.save(); c.lineWidth = 7; c.strokeStyle = brassFill(c, wx, 190, 200, 200); roundRectPath(c, wx, 190, 200, 200, 14); c.stroke(); c.restore();
  }
  wainscot(c, x0, x1, 430, FLOOR, { seed: seed + 1, panelW: 130 });
  if (kind === 'seats') {
    // empty seats in pairs, side on, facing along the car
    for (let sx = x0 + 120; sx < x1 - 150; sx += 300) {
      [0, 1].forEach((side) => {
        const bx = sx + side * 150;
        c.fillStyle = vgrad(c, 380, FLOOR, [[0, '#5a231c'], [1, '#2a0f0b']]);
        roundRectPath(c, bx + (side ? 96 : 0), 380, 22, FLOOR - 400, 8); c.fill();
        roundRectPath(c, bx + (side ? 16 : 18), 500, 102, 26, 8); c.fill();
        ink(c, [[bx + (side ? 96 : 0), FLOOR - 20], [bx + (side ? 96 : 0), 384], [bx + (side ? 118 : 22), 384], [bx + (side ? 118 : 22), FLOOR - 20]], { w: 1.8, alpha: 0.4, bleed: false, seed: seed + bx });
      });
    }
  } else if (kind === 'luggage') {
    for (let sx = x0 + 120; sx < x1 - 150; sx += 230) {
      c.fillStyle = ['#5a3a22', '#3a2a20', '#2c4650', '#6b2a22'][Math.floor(sx / 230) % 4];
      roundRectPath(c, sx, FLOOR - 120, 160, 120, 8); c.fill();
      c.fillStyle = PAL.brass; c.fillRect(sx + 30, FLOOR - 120, 6, 120); c.fillRect(sx + 124, FLOOR - 120, 6, 120);
      ink(c, [[sx, FLOOR - 120], [sx + 160, FLOOR - 120], [sx + 160, FLOOR], [sx, FLOOR]], { w: 1.8, closed: true, alpha: 0.5, bleed: false, seed: seed + sx });
    }
  }
  // the luggage rack, a few things on it
  c.fillStyle = brassFill(c, x0, 166, CAR_LEN, 5); c.fillRect(x0 + 30, 166, CAR_LEN - 60, 4);
  for (let rx = x0 + 160; rx < x1 - 100; rx += 410) { c.fillStyle = '#4e2420'; c.fillRect(rx, 128, 70, 38); ink(c, [[rx, 128], [rx + 70, 128], [rx + 70, 166], [rx, 166]], { w: 1.4, closed: true, alpha: 0.5, bleed: false, seed: rx }); }
  carriageCeiling(c, x0, x1, CEIL, { seed: seed + 2 });
  floorboards(c, x0, x1, FLOOR, 690, { seed: seed + 3, runner: [x0, x1] });
}

function paintGangway(c, x0) {
  c.fillStyle = '#07090b';
  c.fillRect(x0, CEIL - 40, GANGWAY, FLOOR - CEIL + 80);
  for (let i = 0; i < 6; i += 1) {
    c.fillStyle = i % 2 ? '#14100d' : '#0c0a08';
    c.fillRect(x0 + i * (GANGWAY / 6), CEIL + 20, GANGWAY / 6, FLOOR - CEIL - 20);
  }
  // the end doors, open
  [x0 - 14, x0 + GANGWAY - 6].forEach((dx) => { c.fillStyle = brassFill(c, dx, CEIL, 20, FLOOR - CEIL, true); c.fillRect(dx, CEIL, 20, FLOOR - CEIL); });
  ink(c, [[x0, CEIL], [x0, FLOOR]], { w: 2.6, alpha: 0.8, seed: x0 });
  ink(c, [[x0 + GANGWAY, CEIL], [x0 + GANGWAY, FLOOR]], { w: 2.6, alpha: 0.8, seed: x0 + 1 });
}

function paintTrainStrip(c, w, h) {
  // the outside below and above the cutaway: dark, the track running
  c.fillStyle = '#05070a';
  c.fillRect(0, 0, w, h);
  ['seats', 'luggage', 'seats'].forEach((kind, i) => {
    const x0 = i * (CAR_LEN + GANGWAY);
    paintCarInterior(c, x0, kind, 9400 + i * 20);
    if (i < 2) paintGangway(c, x0 + CAR_LEN);
    // the carriage's shell round the cutaway: roof and underframe, inked
    c.fillStyle = '#2a1410';
    c.fillRect(x0, CEIL - 60, CAR_LEN, 22);
    c.fillStyle = '#120c0a';
    c.fillRect(x0, FLOOR + 80, CAR_LEN, 40);
    [x0 + 200, x0 + CAR_LEN - 200].forEach((bx) => {
      [bx - 60, bx + 60].forEach((wx) => { c.fillStyle = '#0a0b0e'; c.beginPath(); c.arc(wx, FLOOR + 130, 34, 0, TAU); c.fill(); });
      c.fillStyle = '#101216'; c.fillRect(bx - 100, FLOOR + 112, 200, 22);
    });
    ink(c, [[x0, CEIL - 60], [x0 + CAR_LEN, CEIL - 60]], { w: 2.6, alpha: 0.6, seed: 9460 + i });
    ink(c, [[x0, FLOOR + 120], [x0 + CAR_LEN, FLOOR + 120]], { w: 2.2, alpha: 0.5, seed: 9465 + i });
  });
  c.fillStyle = '#1c2228'; c.fillRect(0, FLOOR + 162, w, 8);
  finishLayer(c, w, h, { grain: 0.14, vig: 0 });
  c.fillStyle = 'rgba(5, 6, 12, 0.45)';
  c.fillRect(0, 0, w, h);
}

function shotWalk(c, t, w, h, env) {
  const walkT = smooth(Math.min(1, t * 1.02));
  const bx = WALK.from + (WALK.to - WALK.from) * (env.reducedMotion ? 0.5 : (0.08 * t + 0.92 * walkT));
  const scroll = Math.max(0, Math.min(STRIP_W - w, bx - 620));
  const strip = env.layer('strip', paintTrainStrip, { w: STRIP_W, h });
  const res = strip.canvas.width / strip.w;
  const sx = Math.max(0, Math.min(strip.canvas.width - w * res, scroll * res));
  c.drawImage(strip.canvas, sx, 0, w * res, h * res, 0, 0, w, h);
  // the ceiling lamps, dim, a pool under each
  for (let lx = 330; lx < STRIP_W; lx += 660) {
    const x = lx - scroll;
    if (x < -200 || x > w + 200) continue;
    drawCeilingLamp(c, x, CEIL - 6, 28, 46, 0, { lit: 0.6 });
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, CEIL + 60, 0, x, CEIL + 60, 360);
    g.addColorStop(0, 'rgba(255, 180, 100, 0.12)'); g.addColorStop(1, 'rgba(255, 180, 100, 0)');
    c.fillStyle = g; c.fillRect(x - 360, CEIL, 720, FLOOR - CEIL + 20);
    c.restore();
  }
  // Butch and his lamp, the light going with him
  const x = bx - scroll;
  const phase = env.reducedMotion ? 0 : (bx - WALK.from) / 9.5;
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x + 20, FLOOR - 110, 0, x + 20, FLOOR - 110, 420);
  g.addColorStop(0, 'rgba(255, 186, 104, 0.34)'); g.addColorStop(0.5, 'rgba(255, 170, 90, 0.1)'); g.addColorStop(1, 'rgba(255, 170, 90, 0)');
  c.fillStyle = g; c.fillRect(x - 420, CEIL, 840, FLOOR - CEIL + 40);
  c.restore();
  drawButch(c, x, FLOOR + 4, 2.7, { pose: env.reducedMotion ? 'stand' : 'walk', phase, facing: 1, lamp: 'hand', glowAlpha: 0.7 });
  // the track under the train streams by
  const run = env.reducedMotion ? 0 : (env.wall * 900) % 120;
  c.fillStyle = 'rgba(140, 150, 160, 0.12)';
  for (let rx = -run; rx < w; rx += 120) c.fillRect(rx, FLOOR + 168, 60, 2);
}

// ---------------------------------------------------------------------------
// shot 3: the end door, and through its window the next carriage

const DOOR = Object.freeze({ x: 470, y: 20, w: 660, win: { x: 560, y: 110, w: 480, h: 380 } });

function paintNextCarriage(c, win) {
  const { x, y, w, h } = win;
  const vx = x + w * 0.46;
  const vy = y + h * 0.42;
  c.fillStyle = vgrad(c, y, y + h, [[0, '#b97336'], [0.45, '#f0b466'], [1, '#7a4420']]);
  c.fillRect(x, y, w, h);
  // ceiling, floor, the far end of the car: one-point perspective
  c.fillStyle = 'rgba(60, 30, 12, 0.6)';
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(vx + w * 0.1, vy - h * 0.12); c.lineTo(vx - w * 0.1, vy - h * 0.12); c.closePath(); c.fill();
  c.fillStyle = 'rgba(80, 26, 16, 0.8)';
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + w, y + h); c.lineTo(vx + w * 0.1, vy + h * 0.16); c.lineTo(vx - w * 0.1, vy + h * 0.16); c.closePath(); c.fill();
  // the left wall with its windows on the night
  c.fillStyle = 'rgba(70, 40, 20, 0.55)';
  c.beginPath(); c.moveTo(x, y); c.lineTo(vx - w * 0.1, vy - h * 0.12); c.lineTo(vx - w * 0.1, vy + h * 0.16); c.lineTo(x, y + h); c.closePath(); c.fill();
  // the right wall: the windows she looks out of, dark blue between brass
  c.fillStyle = 'rgba(90, 50, 24, 0.5)';
  c.beginPath(); c.moveTo(x + w, y); c.lineTo(vx + w * 0.1, vy - h * 0.12); c.lineTo(vx + w * 0.1, vy + h * 0.16); c.lineTo(x + w, y + h); c.closePath(); c.fill();
  [[0.12, 0.42], [0.5, 0.68], [0.76, 0.86]].forEach(([a, b]) => {
    const p = (f) => [x + w + (vx + w * 0.1 - (x + w)) * f, y + (vy - h * 0.12 - y) * f];
    const q = (f) => [x + w + (vx + w * 0.1 - (x + w)) * f, y + h * 0.62 + (vy + h * 0.02 - (y + h * 0.62)) * f];
    const [ax, ay] = p(a); const [bx, by] = p(b); const [cx, cy] = q(b); const [dx, dy] = q(a);
    c.fillStyle = '#16233a';
    c.beginPath(); c.moveTo(ax, ay + h * 0.12 * (1 - a)); c.lineTo(bx, by + h * 0.12 * (1 - b)); c.lineTo(cx, cy); c.lineTo(dx, dy); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(227, 194, 126, 0.7)'; c.lineWidth = 2; c.stroke();
  });
  // the far end of the car: its own end door, closed, darker than the lit car
  const ex0 = vx - w * 0.1; const ey0 = vy - h * 0.12; const ew = w * 0.2; const eh = h * 0.28;
  c.fillStyle = '#4a2814';
  c.fillRect(ex0, ey0, ew, eh);
  c.fillStyle = '#2a160c';
  c.fillRect(ex0 + ew * 0.32, ey0 + eh * 0.12, ew * 0.36, eh * 0.88);
  c.fillStyle = '#16233a';
  c.fillRect(ex0 + ew * 0.38, ey0 + eh * 0.2, ew * 0.24, eh * 0.26);
  ink(c, [[ex0, ey0], [ex0 + ew, ey0], [ex0 + ew, ey0 + eh], [ex0, ey0 + eh]], { w: 1.4, closed: true, alpha: 0.5, bleed: false, seed: 9512 });
  // the left wall's windows on the night, as the right's
  [[0.1, 0.36], [0.46, 0.64], [0.74, 0.84]].forEach(([a, b]) => {
    const top = (f) => [x + (vx - w * 0.1 - x) * f, y + h * 0.16 + (vy - h * 0.08 - (y + h * 0.16)) * f];
    const bot = (f) => [x + (vx - w * 0.1 - x) * f, y + h * 0.6 + (vy + h * 0.04 - (y + h * 0.6)) * f];
    const [ax, ay] = top(a); const [bx, by] = top(b); const [cx, cy] = bot(b); const [dx, dy] = bot(a);
    c.fillStyle = '#16233a';
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(cx, cy); c.lineTo(dx, dy); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(227, 194, 126, 0.7)'; c.lineWidth = 2; c.stroke();
  });
  [0.3, 0.62].forEach((at) => glow(c, x + w * (0.48 + (at - 0.45) * 0.1), y + h * (0.05 + at * 0.12), w * 0.2 * (1 - at * 0.5), 'rgba(255, 236, 190, 1)', 0.55));
  // the bench along the right-hand windows, its back to the aisle; the empty place nearer us
  c.fillStyle = '#5a231c';
  c.beginPath(); c.moveTo(x + w * 0.62, y + h * 0.66); c.lineTo(x + w * 1.02, y + h * 0.74); c.lineTo(x + w * 1.02, y + h * 0.9); c.lineTo(x + w * 0.6, y + h * 0.76); c.closePath(); c.fill();
  ink(c, [[x + w * 0.62, y + h * 0.66], [x + w * 1.02, y + h * 0.74]], { w: 1.8, alpha: 0.5, bleed: false, seed: 9511 });
  // her, at the far end of the bench, by the window, turned away
  drawMaraSeatedBack(c, x + w * 0.66, y + h * 0.69, 1.75, { windowSide: 1, light: 1, lampSide: -1 });
  // an empty place beside her: its seat back and cushion, lit, nobody on it
  c.fillStyle = '#6a2a20';
  c.beginPath(); c.moveTo(x + w * 0.76, y + h * 0.52); c.lineTo(x + w * 0.96, y + h * 0.5); c.lineTo(x + w * 0.98, y + h * 0.74); c.lineTo(x + w * 0.76, y + h * 0.7); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255, 214, 160, 0.28)';
  c.beginPath(); c.moveTo(x + w * 0.76, y + h * 0.52); c.lineTo(x + w * 0.96, y + h * 0.5); c.lineTo(x + w * 0.96, y + h * 0.53); c.lineTo(x + w * 0.76, y + h * 0.55); c.closePath(); c.fill();
  ink(c, [[x + w * 0.76, y + h * 0.7], [x + w * 0.76, y + h * 0.52], [x + w * 0.96, y + h * 0.5]], { w: 1.6, alpha: 0.5, bleed: false, seed: 9513 });
  amberGlint(c, x + w * 0.86, y + h * 0.56, 7, 0.8);
}

function paintDoorScene(c, w, h) {
  // the carriage end wall, walnut, and the gangway's bellows round the door
  wood(c, -20, -20, w + 40, h + 40, { base: '#1d130c', vertical: true, seed: 9520, grain: 'rgba(0,0,0,0.34)' });
  c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(0, 0, w, h);
  const { x, y, w: dw, win } = DOOR;
  c.fillStyle = '#0d0907'; c.fillRect(x - 40, y - 10, dw + 80, h);
  wood(c, x, y, dw, h, { base: '#2e1d11', vertical: true, seed: 9521, grain: 'rgba(0,0,0,0.3)' });
  ink(c, [[x, h], [x, y], [x + dw, y], [x + dw, h]], { w: 3, alpha: 0.6, seed: 9522 });
  // lower panel and kick plate
  inkRect(c, x + 60, win.y + win.h + 70, dw - 120, h - win.y - win.h - 110, { w: 2, alpha: 0.4, seed: 9523 });
  c.fillStyle = brassFill(c, x, h - 60, dw, 50); c.globalAlpha = 0.55; c.fillRect(x + 6, h - 56, dw - 12, 46); c.globalAlpha = 1;
  // the handle
  c.fillStyle = brassFill(c, x + 30, win.y + win.h + 30, 26, 80, true);
  roundRectPath(c, x + 30, win.y + win.h + 30, 26, 80, 8); c.fill();
  rivet(c, x + 43, win.y + win.h + 70, 7);
  // the window onto the next carriage, painted after the wood: it is a light of its own
  c.save();
  roundRectPath(c, win.x, win.y, win.w, win.h, 14); c.clip();
  paintNextCarriage(c, win);
  // its glass: a sheen and a few beads
  c.fillStyle = 'rgba(200, 220, 240, 0.06)';
  c.beginPath(); c.moveTo(win.x + win.w * 0.2, win.y); c.lineTo(win.x + win.w * 0.4, win.y); c.lineTo(win.x + win.w * 0.1, win.y + win.h); c.lineTo(win.x - win.w * 0.1, win.y + win.h); c.closePath(); c.fill();
  c.restore();
  c.save(); c.lineWidth = 10; c.strokeStyle = brassFill(c, win.x, win.y, win.w, win.h); roundRectPath(c, win.x, win.y, win.w, win.h, 14); c.stroke(); c.restore();
  glow(c, win.x + win.w / 2, win.y + win.h / 2, win.h * 0.95, 'rgba(255, 170, 90, 0.9)', 0.14);
  finishLayer(c, w, h, { grain: 0.14, vig: 0.55 });
}

function shotDoor(c, t, w, h, env) {
  env.drawLayer(c, 'door', paintDoorScene);
  // his lamp, just out of frame at the bottom left: its light on the door, swaying
  const sway = env.reducedMotion ? 0 : Math.sin(env.wall * 1.4) * 30;
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(300 + sway, 860, 0, 300 + sway, 860, 760);
  g.addColorStop(0, 'rgba(255, 176, 96, 0.22)'); g.addColorStop(1, 'rgba(255, 176, 96, 0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.restore();
  void t;
}

// ---------------------------------------------------------------------------
// shot 4: beside her, at the window; two lamps pass outside

const GLASS = Object.freeze({ x: 150, y: 60, w: 1300, h: 470, r: 26 });
const SEAT = Object.freeze({ y: 560 });
const BUTCH4 = Object.freeze({ x: 610, y: 770, s: 5.2 });
const MARA4 = Object.freeze({ x: 1000, y: 770, s: 5.2 });
const LAMP4 = Object.freeze({ x: 806, y: 548, s: 5 });

function paintWindowRoom(c, w, h) {
  // the wall round the window and the window itself cut clear
  damaskWall(c, -20, -20, w + 40, h + 40, { seed: 9610, tone: ['#0d191d', '#132428'] });
  wainscot(c, -20, w + 20, SEAT.y + 4, h + 20, { seed: 9611, panelW: 170 });
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 20;
  c.fillStyle = '#3a2416';
  roundRectPath(c, GLASS.x - 22, GLASS.y - 22, GLASS.w + 44, GLASS.h + 44, GLASS.r + 22); c.fill();
  c.restore();
  wood(c, GLASS.x - 22, GLASS.y - 22, GLASS.w + 44, 22, { base: '#432a1a', seed: 9612 });
  c.globalCompositeOperation = 'destination-out';
  roundRectPath(c, GLASS.x, GLASS.y, GLASS.w, GLASS.h, GLASS.r); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.save(); c.lineWidth = 6; c.strokeStyle = brassFill(c, GLASS.x, GLASS.y, GLASS.w, GLASS.h); roundRectPath(c, GLASS.x, GLASS.y, GLASS.w, GLASS.h, GLASS.r); c.stroke(); c.restore();
  // the sill
  wood(c, GLASS.x - 40, GLASS.y + GLASS.h + 14, GLASS.w + 80, 20, { base: '#5a3a22', seed: 9613 });
  c.fillStyle = brassFill(c, -20, SEAT.y - 2, w + 40, 6); c.fillRect(-20, SEAT.y - 2, w + 40, 5);
  ink(c, [[GLASS.x - 40, GLASS.y + GLASS.h + 14], [GLASS.x + GLASS.w + 40, GLASS.y + GLASS.h + 14]], { w: 2.4, alpha: 0.7, seed: 9614 });
}

function paintGlassBeads(c, w, h) {
  c.save();
  roundRectPath(c, GLASS.x, GLASS.y, GLASS.w, GLASS.h, GLASS.r); c.clip();
  [[0.08, 0.17, 0.04], [0.26, 0.31, 0.025], [0.62, 0.7, 0.025]].forEach(([a, b, alpha]) => {
    c.fillStyle = `rgba(200, 220, 240, ${alpha})`;
    c.beginPath(); c.moveTo(GLASS.x + GLASS.w * a, GLASS.y); c.lineTo(GLASS.x + GLASS.w * b, GLASS.y); c.lineTo(GLASS.x + GLASS.w * (b - 0.12), GLASS.y + GLASS.h); c.lineTo(GLASS.x + GLASS.w * (a - 0.12), GLASS.y + GLASS.h); c.closePath(); c.fill();
  });
  const random = rng(9620);
  for (let i = 0; i < 420; i += 1) {
    const x = GLASS.x + random() * GLASS.w;
    const y = GLASS.y + random() * GLASS.h;
    const r = 0.9 + random() * random() * 4.2;
    c.fillStyle = 'rgba(10, 16, 24, 0.3)'; c.beginPath(); c.ellipse(x, y + r * 0.2, r, r * 1.15, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(214, 226, 236, 0.16)'; c.beginPath(); c.ellipse(x, y, r * 0.85, r * 0.95, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(240, 244, 248, 0.55)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, Math.max(0.5, r * 0.3), 0, TAU); c.fill();
  }
  // their reflections: lamplight blurs where their heads are, no faces in them
  c.filter = 'blur(14px)';
  [[BUTCH4.x, 0.12], [MARA4.x, 0.12]].forEach(([x, a]) => {
    c.fillStyle = `rgba(255, 196, 140, ${a})`;
    c.beginPath(); c.ellipse(x + 10, 420, 70, 90, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(8, 10, 16, 0.22)';
    c.beginPath(); c.ellipse(x + 10, 360, 44, 34, 0, 0, TAU); c.fill();
  });
  c.fillStyle = 'rgba(255, 214, 150, 0.4)';
  c.beginPath(); c.ellipse(LAMP4.x, 470, 30, 44, 0, 0, TAU); c.fill();
  c.filter = 'none';
  c.restore();
}

function paintSeatBack(c, w, h) {
  seatBack(c, 300, 690, 1000, 140, { seed: 9630 });
}

/** A trackside lamp passing outside: where it is (stage x) and how bright its sweep is. */
function passingLamp(t, at) {
  const p = (t - at) / 0.2;
  if (p <= 0 || p >= 1) return null;
  return { x: GLASS.x + GLASS.w * (1.1 - p * 1.2), p, strength: Math.sin(Math.PI * p) ** 0.8 };
}

function shotBeside(c, t, w, h, env) {
  const lamps = env.reducedMotion ? [] : [passingLamp(t, 0.3), passingLamp(t, 0.62)].filter(Boolean);
  drawWindowView(c, env, GLASS, {
    extra: (cc) => lamps.forEach((lamp) => {
      glow(cc, lamp.x, GLASS.y + 250, 240, 'rgba(255, 176, 96, 0.9)', 0.3);
      cc.fillStyle = '#ffe6b0'; cc.beginPath(); cc.arc(lamp.x, GLASS.y + 250, 6, 0, TAU); cc.fill();
      glow(cc, lamp.x, GLASS.y + 250, 40, 'rgba(255, 220, 160, 1)', 0.8);
    }),
  });
  env.drawLayer(c, 'room', paintWindowRoom);
  env.drawLayer(c, 'beads', paintGlassBeads);
  // his lamp on the sill between them
  const flicker = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 9.1) * Math.sin(env.wall * 3.7 + 2);
  drawOilLamp(c, LAMP4.x, LAMP4.y, LAMP4.s, { flame: 0.95 + flicker });
  // her, already there; him, sitting down beside her
  drawMaraSeatedBack(c, MARA4.x, MARA4.y, MARA4.s, { windowSide: 1, light: 1, lampSide: -1 });
  const sit = env.reducedMotion ? 1 : ramp(t, 0.02, 0.2);
  drawButchBack(c, BUTCH4.x, BUTCH4.y - (1 - sit) * 150, BUTCH4.s, { lampSide: 1, light: 1, turn: 0.4 * ramp(t, 0.5, 0.75) });
  env.drawLayer(c, 'seat', paintSeatBack);
  // the warm pool of his lamp on both of them
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(LAMP4.x, LAMP4.y - 70, 0, LAMP4.x, LAMP4.y - 70, 620);
  g.addColorStop(0, `rgba(255, 176, 96, ${0.3 + flicker})`); g.addColorStop(0.4, 'rgba(255, 160, 80, 0.1)'); g.addColorStop(1, 'rgba(255, 160, 80, 0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // the passing lamp's band of light across them (the title's sweep), right to left
  lamps.forEach((lamp) => {
    const bandX = w * (1.15 - lamp.p * 1.3);
    const bw = 360;
    const grad = c.createLinearGradient(bandX - bw / 2, 0, bandX + bw / 2 + 160, 0);
    [[0, 0], [0.2, 0.07], [0.5, 0.26], [0.8, 0.07], [1, 0]].forEach(([at, a]) => grad.addColorStop(at, `rgba(255, 170, 90, ${(a * lamp.strength).toFixed(3)})`));
    c.fillStyle = grad;
    c.beginPath(); c.moveTo(bandX - bw / 2 + 160, 0); c.lineTo(bandX + bw / 2 + 160, 0); c.lineTo(bandX + bw / 2, h); c.lineTo(bandX - bw / 2, h); c.closePath(); c.fill();
  });
  c.restore();
  finishVignette(c, w, h, 0.45);
}

function finishVignette(c, w, h, strength) {
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(5, 4, 8, ${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// shot 5: the viaduct again, and on into the dark

function shotViaduct(c, t, w, h, env) {
  drawViaductShot(c, w, h, env, { trainX: -1300 + 2600 * t, dark: ramp(t, 0.72, 1) * 0.96, trainGlow: 1 - ramp(t, 0.85, 1) * 0.6 });
}

// ---------------------------------------------------------------------------

export const ending = {
  id: 'ending',
  title: 'The night service kept running',
  length: [40, 55],
  music: { id: 'cutscene-ending', src: '/assets/music/ch6/6.5_night_train_departure.mp3', volume: 0.5, fade: 2.5, outFade: 3.5 },
  prepare: () => usePaintAssets({ paper: paperUrl, train: trainUrl }),
  shots: [
    {
      id: 'worlds-fold',
      duration: 8.6,
      draw: shotWorlds,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.0 }, to: { x: 0.42, y: 0.48, zoom: 1.12 } },
      transition: { type: 'ink', duration: 1.1 },
      captions: [{ text: 'The Conductor did not stop the train. Nobody could.', at: 0.9, end: 5.4 }],
      cues: [
        { at: 0, sfx: 'rail', level: 0.9 },
        { at: 1.1, sfx: 'paper' }, { at: 2.2, sfx: 'paper' }, { at: 3.3, sfx: 'paper' }, { at: 4.4, sfx: 'paper' },
      ],
    },
    {
      id: 'the-walk',
      duration: 9,
      draw: shotWalk,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.5, y: 0.48, zoom: 1.1 } },
      transition: { type: 'slide', duration: 1.1 },
      cues: [{ at: 0, sfx: 'rail', level: 1.15 }],
    },
    {
      id: 'next-carriage',
      duration: 8,
      draw: shotDoor,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.0 }, to: { x: 0.53, y: 0.36, zoom: 1.75 }, still: { x: 0.5, y: 0.45, zoom: 1.2 } },
      transition: { type: 'fade', duration: 1.1 },
      captions: [{ text: 'One carriage ahead, the seat beside her was empty at last.', at: 0.9, end: 5.6 }],
      cues: [{ at: 0, sfx: 'rail', level: 0.6 }],
    },
    {
      id: 'beside-her',
      duration: 11,
      draw: shotBeside,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.12 }, to: { x: 0.52, y: 0.5, zoom: 1.2 } },
      transition: { type: 'slide', duration: 1.2 },
      captions: [{ text: 'He did not look for her reflection.', at: 4.2, end: 8.6 }],
      cues: [{ at: 1.9, sfx: 'thud' }, { at: 0, sfx: 'rain', level: 0.7 }],
    },
    {
      id: 'viaduct',
      duration: 10,
      draw: shotViaduct,
      camera: { from: { x: 0.5, y: 0.46, zoom: 1.4 }, to: { x: 0.5, y: 0.5, zoom: 1.04 }, still: { x: 0.5, y: 0.47, zoom: 1.3 } },
      captions: [{ text: 'The night service kept running.', at: 1.0, end: 5.6 }],
      cues: [{ at: 0, sfx: 'rain', level: 1 }, { at: 5.6, stopMusic: true, fade: 4.2 }, { at: 7, stopSfx: 'rail', fade: 2.5 }, { at: 8, stopSfx: 'rain', fade: 2 }],
    },
  ],
};


export default ending;
