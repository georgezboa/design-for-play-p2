// Cutscene 6 · `chapter5-to-conductor` (Chapter 5 → Chapter 6 ALL WORLDS AT
// ONCE, 0–4 magic stones). docs/CUTSCENES_SPEC.md: the museum goes dark, the
// worlds stack round Butch, and at the far end of the line the Conductor is
// waiting. The last shots are Movement I's own view (the four worlds laid out
// as a board, rails up the middle, the Conductor at the far edge), so the
// hand-off lands on the screen the fight opens on.
//   1 the museum's lamps go out one by one; the floor's inlay becomes rails
//   2 the worlds stack up round Butch like Chapter 1's panels
//   3 at the far end of the board, the Conductor, punch in hand: "Tickets, please."
//   4 close on him: "The line runs while someone rides it." "You are the someone."
//   5 Butch raises his lamp; the light takes the frame
//   6 black, into Movement I

import paperUrl from '../../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import trainUrl from '../../../chapters/nightService/art/train-night.png?url';
import {
  PAL, brassFill, finishLayer, glow, ink, paintWorld, ramp, rng, roundRectPath, smooth, usePaintAssets, vgrad, wood,
} from '../painters.js';
import {
  HALL, drawButchStandingBack, drawConductorPose, drawHallLight, paintHallRails, paintMuseumHall,
} from '../painters-c3.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const floorY = (z) => HALL.vp[1] + (HALL.floor - HALL.vp[1]) / (1 + z);

function vignette(c, w, h, strength, cx = w / 2, cy = h / 2) {
  const g = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(4, 3, 5, ${strength})`);
  c.fillStyle = g;
  c.fillRect(-20, -20, w + 40, h + 40);
}

/** A warm pool of lamplight on the floor round (x, y), flattened by perspective. */
function floorPool(c, x, y, r, alpha, squash = 0.3) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.translate(x, y);
  c.scale(1, squash);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(255, 180, 100, ${alpha})`);
  g.addColorStop(0.5, `rgba(255, 170, 90, ${alpha * 0.35})`);
  g.addColorStop(1, 'rgba(255, 170, 90, 0)');
  c.fillStyle = g;
  c.fillRect(-r, -r, r * 2, r * 2);
  c.restore();
}

// ---------------------------------------------------------------------------
// shot 1: the lamps go out; the inlay becomes rails

const BUTCH1 = Object.freeze({ x: 800, z: 0.32, s: 1.8 });
/** When each ring of lamps goes out (ring 4 is the far end): far to near. */
const LAMP_OUT = Object.freeze([0.5, 0.42, 0.34, 0.26, 0.18]);

function shotLampsOut(c, t, w, h, env) {
  env.drawLayer(c, '@hall', (lc, lw, lh) => { paintMuseumHall(lc, lw, lh, { end: 'doors' }); finishLayer(lc, lw, lh, { grain: 0.14, vig: 0.35 }); });
  const flicker = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 8.3) * Math.sin(env.wall * 3.1);
  const dark = drawHallLight(c, w, h, (lamp) => 1 - ramp(t, LAMP_OUT[lamp.ring] + (lamp.side > 0 ? 0.025 : 0), LAMP_OUT[lamp.ring] + 0.05 + (lamp.side > 0 ? 0.025 : 0)), { flicker });
  // the rails come up out of the inlay from his feet to the far doors
  const reach = ramp(t, 0.5, 0.96);
  if (reach > 0) {
    const zTo = 0.02 + reach * (HALL.far - 0.02);
    c.save();
    c.beginPath(); c.rect(-20, floorY(zTo), w + 40, h + 40); c.clip();
    env.drawLayer(c, '@rails', (lc, lw, lh) => paintHallRails(lc, lw, lh));
    c.restore();
    // the head of the line: a glint running away down the rails
    if (reach < 1) {
      const [g0, g1] = HALL.gauge;
      [g0, g1].forEach((X) => {
        const x = HALL.vp[0] + (X - HALL.vp[0]) / (1 + zTo);
        glow(c, x, floorY(zTo), 40 / (1 + zTo) + 8, 'rgba(255, 226, 170, 1)', 0.7);
      });
    }
  }
  // Butch's lamp, the one light left
  const by = floorY(BUTCH1.z);
  floorPool(c, BUTCH1.x + 40, by, 520, 0.16 + 0.12 * dark + flicker);
  drawButchStandingBack(c, BUTCH1.x, by, BUTCH1.s, { lampSide: 1, light: 0.8 + 0.2 * dark, glowAlpha: 0.55 + 0.25 * dark, phase: env.reducedMotion ? 0 : env.wall * 0.8 });
  vignette(c, w, h, 0.35 + 0.3 * dark);
}

// ---------------------------------------------------------------------------
// shot 2: the worlds stack up round him

const PANEL = Object.freeze({ w: 500, h: 290 });
const STACK = Object.freeze([
  { kind: 'office', x: 70, y: 70, from: -1, at: 0.08 },
  { kind: 'rooftops', x: 1030, y: 70, from: 1, at: 0.24 },
  { kind: 'square', x: 70, y: 420, from: -1, at: 0.4 },
  { kind: 'painted', x: 1030, y: 420, from: 1, at: 0.56 },
]);
const LIGHT_OF = Object.freeze({ office: '255, 186, 104', rooftops: '127, 208, 200', square: '255, 214, 150', painted: '240, 232, 214' });

function paintStackSheet(c) {
  STACK.forEach((p, i) => {
    c.save();
    c.translate((i % 2) * PANEL.w, Math.floor(i / 2) * PANEL.h);
    paintWorld(c, p.kind, PANEL.w, PANEL.h, { seed: 9740 + i * 10 });
    finishLayer(c, PANEL.w, PANEL.h, { grain: 0.14, vig: 0.3 });
    c.restore();
  });
}

function shotWorlds(c, t, w, h, env) {
  // the dark hall behind, only the rails and his lamp left of it
  env.drawLayer(c, '@hall', (lc, lw, lh) => { paintMuseumHall(lc, lw, lh, { end: 'doors' }); finishLayer(lc, lw, lh, { grain: 0.14, vig: 0.35 }); });
  drawHallLight(c, w, h, () => 0);
  env.drawLayer(c, '@rails', (lc, lw, lh) => paintHallRails(lc, lw, lh));
  c.fillStyle = 'rgba(3, 3, 5, 0.5)';
  c.fillRect(-20, -20, w + 40, h + 40);
  const sheet = env.layer('stack', paintStackSheet, { w: PANEL.w * 2, h: PANEL.h * 2 });
  const res = sheet.canvas.width / sheet.w;
  STACK.forEach((p, i) => {
    const k = env.reducedMotion ? ramp(t, p.at, p.at + 0.12) : 1;
    const slide = env.reducedMotion ? 0 : 1 - smooth(clamp((t - p.at) / 0.16, 0, 1));
    if (t < p.at) return;
    const x = p.x + p.from * slide * 760;
    c.save();
    c.globalAlpha = k;
    // the world's light spills out round its frame
    glow(c, x + PANEL.w / 2, p.y + PANEL.h / 2, PANEL.w * 0.75, `rgba(${LIGHT_OF[p.kind]}, 0.9)`, 0.12 * (1 - slide));
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 30;
    c.fillStyle = '#0a0705';
    roundRectPath(c, x - 6, p.y - 6, PANEL.w + 12, PANEL.h + 12, 16); c.fill();
    c.restore();
    c.save();
    roundRectPath(c, x, p.y, PANEL.w, PANEL.h, 12); c.clip();
    c.drawImage(sheet.canvas, (i % 2) * PANEL.w * res, Math.floor(i / 2) * PANEL.h * res, PANEL.w * res, PANEL.h * res, x, p.y, PANEL.w, PANEL.h);
    c.restore();
    c.lineWidth = 9;
    c.strokeStyle = brassFill(c, x, p.y, PANEL.w, PANEL.h);
    roundRectPath(c, x, p.y, PANEL.w, PANEL.h, 12); c.stroke();
    ink(c, [[x, p.y], [x + PANEL.w, p.y], [x + PANEL.w, p.y + PANEL.h], [x, p.y + PANEL.h]], { w: 2, closed: true, alpha: 0.5, bleed: false, jitter: 0.3, seed: 9760 + i });
    c.restore();
  });
  // their light on him, from both sides
  const by = floorY(BUTCH1.z);
  const arrived = STACK.map((p) => ramp(t, p.at + 0.08, p.at + 0.2));
  floorPool(c, BUTCH1.x + 40, by, 460, 0.22);
  drawButchStandingBack(c, BUTCH1.x, by, BUTCH1.s, { lampSide: 1, light: 1, glowAlpha: 0.75, phase: env.reducedMotion ? 0 : env.wall * 0.8 });
  STACK.forEach((p, i) => {
    if (!arrived[i]) return;
    glow(c, BUTCH1.x + p.from * 120, by - 170, 220, `rgba(${LIGHT_OF[p.kind]}, 0.8)`, 0.1 * arrived[i]);
  });
  vignette(c, w, h, 0.5);
}

// ---------------------------------------------------------------------------
// shots 3 and 5: Movement I's board, the Conductor at its far edge

// the far edge (zFar) lands at stage y 486
const BOARD = Object.freeze({ w: 1600, h: 1000, vpY: 300, nearY: 1100, zNear: 0.6, zFar: 800 / 186 - 1, halfW: 1150 });
const BOARD_EDGE = BOARD.vpY + (BOARD.nearY - BOARD.vpY) / (1 + BOARD.zFar);
const CONDUCTOR = Object.freeze({ x: 800, y: BOARD_EDGE + 6, s: 2.5 });
const GUTTER = Object.freeze({ x: 800, y: 500, half: 42 });
const BOARD_PANELS = Object.freeze([
  ['office', 40, 40], ['rooftops', 842, 40], ['square', 40, 542], ['painted', 842, 542],
]);

function track(c, x0, y0, x1, y1, seed) {
  const vertical = x0 === x1;
  const len = vertical ? y1 - y0 : x1 - x0;
  for (let d = 6; d < len; d += 22) {
    c.fillStyle = '#1a110b';
    if (vertical) c.fillRect(x0 - 34, y0 + d, 68, 10); else c.fillRect(x0 + d, y0 - 34, 10, 68);
  }
  [-17, 17].forEach((o, i) => {
    c.strokeStyle = '#0a0806'; c.lineWidth = 9;
    c.beginPath(); if (vertical) { c.moveTo(x0 + o, y0); c.lineTo(x1 + o, y1); } else { c.moveTo(x0, y0 + o); c.lineTo(x1, y1 + o); } c.stroke();
    c.strokeStyle = PAL.brass; c.lineWidth = 5;
    c.beginPath(); if (vertical) { c.moveTo(x0 + o, y0); c.lineTo(x1 + o, y1); } else { c.moveTo(x0, y0 + o); c.lineTo(x1, y1 + o); } c.stroke();
    c.strokeStyle = 'rgba(255, 236, 196, 0.7)'; c.lineWidth = 1.4;
    c.beginPath(); if (vertical) { c.moveTo(x0 + o - 1, y0); c.lineTo(x1 + o - 1, y1); } else { c.moveTo(x0, y0 + o - 1); c.lineTo(x1, y1 + o - 1); } c.stroke();
    void i;
  });
  void seed;
}

function paintBoardFlat(c, w, h) {
  wood(c, 0, 0, w, h, { base: '#24170e', vertical: true, seed: 9801, grain: 'rgba(0,0,0,0.35)' });
  BOARD_PANELS.forEach(([kind, x, y], i) => {
    const pw = 718; const ph = 418;
    c.save();
    c.translate(x, y);
    paintWorld(c, kind, pw, ph, { seed: 9810 + i * 10 });
    finishLayer(c, pw, ph, { grain: 0.12, vig: 0.3 });
    c.restore();
    c.lineWidth = 12;
    c.strokeStyle = brassFill(c, x, y, pw, ph);
    roundRectPath(c, x, y, pw, ph, 14); c.stroke();
  });
  track(c, GUTTER.x, 0, GUTTER.x, h, 9820);
  track(c, 0, GUTTER.y, w, GUTTER.y, 9821);
}

/** The flat board laid on the floor in perspective, row by row (painted once). */
function paintBoard(c, w, h, env) {
  const flat = env.layer('@board-flat', paintBoardFlat, { w: BOARD.w, h: BOARD.h });
  const res = flat.canvas.width / flat.w;
  const zOf = (y) => (BOARD.nearY - BOARD.vpY) / (y - BOARD.vpY) - 1;
  const vOf = (z) => (BOARD.zFar - z) / (BOARD.zFar - BOARD.zNear); // 0 far edge, 1 near edge
  const step = 1.25;
  for (let y = BOARD_EDGE; y < h + step; y += step) {
    const z0 = zOf(y);
    const z1 = zOf(y + step);
    const v0 = clamp(vOf(z0), 0, 1);
    const v1 = clamp(vOf(z1), 0, 1);
    const half = BOARD.halfW / (1 + z0);
    const sy = v0 * BOARD.h * res;
    const sh = Math.max(1, (v1 - v0) * BOARD.h * res);
    c.drawImage(flat.canvas, 0, sy, flat.canvas.width, sh, 800 - half, y, half * 2, step + 0.6);
  }
  // the board's far lip, brass, and the dark beyond its near corners
  c.fillStyle = brassFill(c, 800 - BOARD.halfW / (1 + BOARD.zFar), BOARD_EDGE - 4, (BOARD.halfW * 2) / (1 + BOARD.zFar), 6);
  c.fillRect(800 - BOARD.halfW / (1 + BOARD.zFar) - 4, BOARD_EDGE - 4, (BOARD.halfW * 2) / (1 + BOARD.zFar) + 8, 5);
  // light falls off toward the far edge, except round him
  c.fillStyle = vgrad(c, BOARD_EDGE, h, [[0, 'rgba(4, 3, 5, 0.55)'], [0.4, 'rgba(4, 3, 5, 0.25)'], [1, 'rgba(4, 3, 5, 0.5)']]);
  c.fillRect(0, BOARD_EDGE, w, h - BOARD_EDGE);
}

function paintBackdrop(c, w, h) {
  // the carriage beyond the board: walnut, a great dark window, a brass rail
  wood(c, -20, -20, w + 40, BOARD_EDGE + 40, { base: '#1d130c', vertical: true, seed: 9830, grain: 'rgba(0,0,0,0.35)' });
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(-20, -20, w + 40, BOARD_EDGE + 40);
  c.fillStyle = vgrad(c, 40, 380, [[0, '#0b0f17'], [1, '#141a24']]);
  roundRectPath(c, 330, 40, 940, 330, 30); c.fill();
  const random = rng(9831);
  c.strokeStyle = 'rgba(200, 220, 240, 0.08)'; c.lineWidth = 1;
  for (let i = 0; i < 70; i += 1) { const rx = 340 + random() * 920; const ry = 50 + random() * 310; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 4, ry + 16); c.stroke(); }
  c.save(); c.lineWidth = 10; c.strokeStyle = brassFill(c, 330, 40, 940, 330); c.globalAlpha = 0.6; roundRectPath(c, 330, 40, 940, 330, 30); c.stroke(); c.restore();
  c.fillStyle = brassFill(c, -20, 420, w + 40, 6); c.fillRect(-20, 420, w + 40, 5);
  for (let x = 60; x < w; x += 46) { c.fillStyle = 'rgba(227, 194, 126, 0.35)'; c.beginPath(); c.arc(x, 440, 2, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = vgrad(c, 380, BOARD_EDGE, [[0, 'rgba(60, 20, 14, 0)'], [1, 'rgba(70, 24, 16, 0.55)']]);
  c.fillRect(-20, 380, w + 40, BOARD_EDGE - 380);
  finishLayer(c, w, h, { grain: 0.14, vig: 0 });
}

function drawBoardScene(c, w, h, env, { conductor = true, light = 1 } = {}) {
  env.drawLayer(c, '@backdrop', paintBackdrop, { depth: 0.85 });
  env.drawLayer(c, '@board', paintBoard);
  const swing = env.reducedMotion ? 0 : 0.08 * Math.sin(env.wall * 1.3);
  const flicker = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 9.1) * Math.sin(env.wall * 3.3);
  // the light he stands in, from above (Movement I's beam)
  c.save();
  c.globalCompositeOperation = 'lighter';
  const beam = c.createLinearGradient(0, 0, 0, CONDUCTOR.y + 40);
  beam.addColorStop(0, 'rgba(255, 200, 130, 0)');
  beam.addColorStop(1, `rgba(255, 196, 120, ${0.14 * light})`);
  c.fillStyle = beam;
  c.beginPath(); c.moveTo(CONDUCTOR.x - 70, 0); c.lineTo(CONDUCTOR.x + 70, 0); c.lineTo(CONDUCTOR.x + 170, CONDUCTOR.y + 30); c.lineTo(CONDUCTOR.x - 170, CONDUCTOR.y + 30); c.closePath(); c.fill();
  c.restore();
  floorPool(c, CONDUCTOR.x, CONDUCTOR.y + 30, 380, 0.24 * light + flicker, 0.22);
  if (conductor) drawConductorPose(c, CONDUCTOR.x, CONDUCTOR.y, CONDUCTOR.s, { punchArm: -0.7, swing, glowAlpha: 0.6 * light, flame: 1 + flicker });
  return { swing, flicker };
}

function shotConductor(c, t, w, h, env) {
  drawBoardScene(c, w, h, env);
  vignette(c, w, h, 0.55, 800, 380);
}

// ---------------------------------------------------------------------------
// shot 4: close on him

function paintCloseBack(c, w, h) {
  c.fillStyle = vgrad(c, 0, h, [[0, '#0a0708'], [1, '#160e0a']]);
  c.fillRect(-20, -20, w + 40, h + 40);
  // the worlds behind him, out of focus: warm and teal lights
  const random = rng(9850);
  c.save();
  c.filter = 'blur(10px)';
  for (let i = 0; i < 26; i += 1) {
    const x = random() * w;
    const y = 80 + random() * 520;
    const r = 18 + random() * 46;
    const teal = random() > 0.7;
    c.fillStyle = teal ? `rgba(127, 208, 200, ${0.06 + random() * 0.08})` : `rgba(255, 190, 110, ${0.06 + random() * 0.1})`;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.filter = 'none';
  c.restore();
  wood(c, -20, 640, w + 40, 200, { base: '#1d130c', seed: 9851 });
  c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(-20, 640, w + 40, 200);
  finishLayer(c, w, h, { grain: 0.14, vig: 0.55 });
}

function shotClose(c, t, w, h, env) {
  env.drawLayer(c, 'close-back', paintCloseBack, { depth: 0.7 });
  const swing = env.reducedMotion ? 0 : 0.06 * Math.sin(env.wall * 1.3);
  const flicker = env.reducedMotion ? 0 : 0.05 * Math.sin(env.wall * 9.1) * Math.sin(env.wall * 3.3);
  // his punch, held ready at his side
  const arm = -0.3 - 0.12 * ramp(t, 0.4, 0.6);
  const s = 8.4;
  const feet = 1110;
  const at = drawConductorPose(c, 820, feet, s, { punchArm: arm, swing, glowAlpha: 0, flame: 1 + flicker });
  // his lantern, low and to our left, lights him from below
  glow(c, at.lantern.x, at.lantern.y, 520, 'rgba(255, 176, 92, 0.95)', 0.32 + flicker);
  glow(c, at.lantern.x, at.lantern.y, 120, 'rgba(255, 226, 170, 1)', 0.5 + flicker);
  // the eyes catch the lamp inside the brim's shadow
  const k = s * 1;
  [-3.2, 3.2].forEach((dx) => glow(c, at.face.x + dx * k - 0.5 * k, at.face.y - 0.2 * k, 14, 'rgba(255, 220, 160, 1)', 0.35 + flicker));
  vignette(c, w, h, 0.6, 820, 380);
}

// ---------------------------------------------------------------------------
// shot 5: Butch raises his lamp

function shotRaise(c, t, w, h, env) {
  const flare = ramp(t, 0.5, 0.95);
  drawBoardScene(c, w, h, env, { light: 1 - flare * 0.4 });
  vignette(c, w, h, 0.5, 800, 380);
  // over his shoulder: Butch, big, his back to us, on the near board
  const raise = ramp(t, 0.1, 0.48);
  const flame = 1 + 1.6 * flare;
  const drawn = drawButchStandingBack(c, 500, 1110, 4.1, { lampSide: 1, arm: -2.5 * raise, light: 1, glowAlpha: 0.7 + 0.3 * raise, phase: env.reducedMotion ? 0 : env.wall * 0.7, flame: Math.min(1, flame) });
  floorPool(c, drawn.lamp.x, BOARD_EDGE + 180, 700, 0.12 + 0.2 * raise, 0.25);
  // the lamp's light takes the frame
  if (flare > 0) {
    glow(c, drawn.lamp.x, drawn.lamp.y, 900 * (0.4 + flare), 'rgba(255, 214, 150, 1)', 0.85 * flare);
    c.fillStyle = `rgba(255, 228, 184, ${0.85 * smooth(ramp(t, 0.72, 1))})`;
    c.fillRect(-20, -20, w + 40, h + 40);
  }
}

function shotBlack(c, t, w, h) {
  c.fillStyle = '#020306';
  c.fillRect(-10, -10, w + 10 * 2, h + 20);
}

// ---------------------------------------------------------------------------

export const chapter5ToConductor = {
  id: 'chapter5-to-conductor',
  title: 'Tickets, please',
  length: [25, 40],
  music: { id: 'cutscene-5-6-conductor', src: '/assets/music/ch1/1.2_train_resonance.mp3', volume: 0.42, fade: 3, outFade: 2.5 },
  prepare: () => usePaintAssets({ paper: paperUrl, train: trainUrl }),
  shots: [
    {
      id: 'lamps-out',
      duration: 7.6,
      draw: shotLampsOut,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.5, y: 0.46, zoom: 1.2 }, still: { x: 0.5, y: 0.48, zoom: 1.08 } },
      transition: { type: 'fade', duration: 1.1 },
      cues: [
        { at: 1.4, sfx: 'punch' }, { at: 2.0, sfx: 'punch' }, { at: 2.6, sfx: 'punch' }, { at: 3.2, sfx: 'punch' }, { at: 3.8, sfx: 'punch' },
        { at: 4.0, sfx: 'rail', level: 0.45 },
      ],
    },
    {
      id: 'worlds-stack',
      duration: 7.4,
      draw: shotWorlds,
      camera: { from: { x: 0.5, y: 0.52, zoom: 1.14 }, to: { x: 0.5, y: 0.5, zoom: 1.02 }, still: { x: 0.5, y: 0.5, zoom: 1.02 } },
      transition: { type: 'ink', duration: 1.1 },
      cues: [{ at: 0.7, sfx: 'paper' }, { at: 1.9, sfx: 'paper' }, { at: 3.1, sfx: 'paper' }, { at: 4.2, sfx: 'paper' }, { at: 4.4, sfx: 'rail', level: 0.8 }],
    },
    {
      id: 'the-conductor',
      duration: 6.6,
      draw: shotConductor,
      camera: { from: { x: 0.5, y: 0.56, zoom: 1.0 }, to: { x: 0.5, y: 0.5, zoom: 1.36 }, still: { x: 0.5, y: 0.52, zoom: 1.12 } },
      transition: { type: 'fade', duration: 1.0 },
      captions: [{ speaker: 'THE CONDUCTOR', text: 'Tickets, please.', at: 1.5, end: 5.0 }],
      cues: [{ at: 1.3, sfx: 'punch' }],
    },
    {
      id: 'close',
      duration: 8.4,
      draw: shotClose,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.0 }, to: { x: 0.51, y: 0.47, zoom: 1.12 } },
      transition: { type: 'slide', duration: 1.0 },
      captions: [
        { speaker: 'THE CONDUCTOR', text: 'The line runs while someone rides it.', at: 0.6, end: 4.3 },
        { speaker: 'THE CONDUCTOR', text: 'You are the someone.', at: 4.6, end: 7.6 },
      ],
      cues: [{ at: 4.5, sfx: 'softBell' }],
    },
    {
      id: 'raises-lamp',
      duration: 5.4,
      draw: shotRaise,
      camera: { from: { x: 0.5, y: 0.5, zoom: 1.04 }, to: { x: 0.52, y: 0.47, zoom: 1.14 }, still: { x: 0.5, y: 0.5, zoom: 1.06 } },
      transition: { type: 'cut' },
      cues: [{ at: 0.6, sfx: 'whistle' }, { at: 2.6, stopMusic: true, fade: 2.6 }],
    },
    {
      id: 'black',
      duration: 2.0,
      draw: shotBlack,
      blackout: true,
      cues: [{ at: 0, stopSfx: 'rail', fade: 1.4 }],
    },
  ],
};

export default chapter5ToConductor;
