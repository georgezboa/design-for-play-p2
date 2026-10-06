// Cutscene 5 · `chapter4To5` (Ch4 THE PAINTED COUNTRY → Ch5 THE MUSEUM OF ONE
// ANSWER). docs/CUTSCENES_SPEC.md. Ch4 ended with the colours returned, the
// PAINTED TRAIN, and the Last Painted Platform. Five shots:
//   1 the painted train, still wet, runs into the dark; the paint dries into ink
//   2 a vast walnut hall with brass doors; the train stops inside it
//   3 display cases light one by one as Butch passes: the journey, filed
//   4 a typed accession card: ACC. 1978-0412 · VELEZ, M. · PENDING
//   5 the Archivist, a shadow behind a brass lamp: one clean answer
// The last frame (the desk, the green-shaded lamp) is the museum lobby's desk.

import paperUrl from '../../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import trainUrl from '../../../chapters/nightService/art/train-night.png?url';
import {
  PAL, brassFill, drawAccessionCard, drawButch, drawTicket, finishLayer, glow, ink, inkRect, lightCone, ramp, rng, roundRectPath, smooth, usePaintAssets, vgrad, wood,
} from '../painters.js';
import {
  INK, TRAIN_BOX, TRAIN_COLOURS, buildTrain, drawArt, drawRosaDrawing, drawTrainWheels, once, paintPaper, paintTrainBody, prebuild, rosaDrawing, rubberStamp,
} from '../painters-c2.js';
import { paintCountry } from '../../../chapters/paintedCountry/art/countryArt.js';

const TAU = Math.PI * 2;

function vignette(c, w, h, strength) {
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(4, 3, 6, ${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

/** A ragged, slightly slanted vertical front (where paint meets the dark). */
function edgePoints(x, y0, y1, seed, amp = 24) {
  const pts = [];
  for (let y = y0 - 20; y <= y1 + 20; y += 16) pts.push([x + (y - (y0 + y1) / 2) * 0.1 + amp * Math.sin(y * 0.023 + seed) + amp * 0.5 * Math.sin(y * 0.071 + seed * 3), y]);
  return pts;
}

function clipLeftOf(c, pts) {
  c.beginPath();
  c.moveTo(-400, pts[0][1]);
  pts.forEach(([x, y]) => c.lineTo(x, y));
  c.lineTo(-400, pts[pts.length - 1][1]);
  c.closePath();
  c.clip();
}

function clipRightOf(c, pts) {
  c.beginPath();
  c.moveTo(2400, pts[0][1]);
  pts.forEach(([x, y]) => c.lineTo(x, y));
  c.lineTo(2400, pts[pts.length - 1][1]);
  c.closePath();
  c.clip();
}

// ---------------------------------------------------------------------------
// shot 1: the painted train runs into the dark and dries into ink

const RAIL1 = 610;
const EDGE1 = 780;
const TRAIN1 = Object.freeze({ s: 1 });
const EDGE_PTS = edgePoints(EDGE1, 0, 800, 1.3, 30);

/** The Last Painted Platform's country, its colours back (countryArt.paintCountry). */
const platformCountry = (c) => once('country-4-5', () => paintCountry({
  w: 1100,
  h: 560,
  seed: 5102,
  horizon: 0.4,
  sun: true,
  washScale: 0.6,
  features: [
    { kind: 'orchard', x: 60, s: 1.2, n: 3 },
    { kind: 'house', x: 340, s: 1.5, lit: true },
    { kind: 'hawthorn', x: 560, s: 1.4 },
    { kind: 'tree', x: 700, s: 1.2 },
    { kind: 'farm', x: 820, s: 1.3 },
  ],
}), c);

function paintPaperAndDark(c, w, h) {
  // the paper country on the left, colour back in it
  paintPaper(c, 0, 0, 1240, h, { tone: INK.sheetHigh, seed: 5110, grid: 0.05 });
  drawArt(c, platformCountry(c), { x: 0, y: 70, w: 1100, h: 560, wash: 1 });
  // the line, drafted in pencil across the paper
  c.save();
  c.strokeStyle = 'rgba(74, 70, 64, 0.85)';
  c.lineWidth = 2.2;
  [RAIL1, RAIL1 + 14].forEach((y) => { c.beginPath(); c.moveTo(-20, y); c.lineTo(1240, y - 1); c.stroke(); });
  c.lineWidth = 1.2;
  c.strokeStyle = 'rgba(74, 70, 64, 0.45)';
  for (let x = 0; x < 1240; x += 34) { c.beginPath(); c.moveTo(x, RAIL1 + 18); c.lineTo(x + 12, RAIL1 - 3); c.stroke(); }
  c.restore();
  // the ink's front soaking into the paper: a soft bleed, then fibres of it
  c.save();
  c.filter = 'blur(26px)';
  c.globalAlpha = 0.6;
  c.translate(-10, 0);
  clipRightOf(c, EDGE_PTS);
  c.fillStyle = '#0a0d18';
  c.fillRect(0, 0, w + 40, h);
  c.restore();
  c.save();
  clipRightOf(c, EDGE_PTS);
  c.fillStyle = vgrad(c, 0, h, [[0, '#06080e'], [0.6, '#0c1220'], [1, '#080a10']]);
  c.fillRect(0, 0, w + 20, h);
  c.restore();
  const random = rng(5120);
  EDGE_PTS.forEach(([x, y]) => {
    if (random() > 0.5) return;
    c.strokeStyle = `rgba(10, 13, 24, ${0.25 + random() * 0.4})`;
    c.lineWidth = 0.8 + random();
    c.beginPath(); c.moveTo(x - 4, y); c.quadraticCurveTo(x - 20, y + (random() - 0.5) * 20, x - 24 - random() * 50, y + (random() - 0.5) * 16); c.stroke();
  });
  // in the dark the line goes on in ivory ink, toward one far lamp
  ink(c, [[EDGE1 - 20, RAIL1], [1300, RAIL1 - 2], [w + 20, RAIL1 - 3]], { w: 2.2, alpha: 0.6, bleed: false, jitter: 0.6, seed: 5121 });
  ink(c, [[EDGE1 - 20, RAIL1 + 14], [1300, RAIL1 + 12], [w + 20, RAIL1 + 11]], { w: 1.6, alpha: 0.4, bleed: false, jitter: 0.6, seed: 5122 });
  glow(c, 1520, RAIL1 - 120, 160, 'rgba(255, 196, 120, 0.9)', 0.12);
  c.fillStyle = 'rgba(227, 194, 126, 0.55)';
  c.fillRect(1516, RAIL1 - 150, 6, 60);
  finishLayer(c, w, h, { grain: 0.1, vig: 0.3 });
}

/** The trail of wet paint the train leaves along the rails on the paper side. */
function wetTrail(c, rear) {
  const end = Math.min(rear, EDGE1 - 30);
  if (end <= 0) return;
  TRAIN_COLOURS.forEach(({ color }, i) => {
    const g = c.createLinearGradient(0, 0, end, 0);
    g.addColorStop(0, `${color}00`);
    g.addColorStop(1, `${color}66`);
    c.fillStyle = g;
    c.fillRect(0, RAIL1 - 3 + i * 6, end, 3);
  });
}

function shotDriesToInk(c, t, w, h, env) {
  env.drawLayer(c, 'paper-dark', paintPaperAndDark);
  const paint = env.layer('@train-paint', (lc) => paintTrainBody(lc, 'paint'), { w: TRAIN_BOX.w, h: TRAIN_BOX.h });
  const inked = env.layer('@train-ink', (lc) => paintTrainBody(lc, 'ink'), { w: TRAIN_BOX.w, h: TRAIN_BOX.h });
  const s = TRAIN1.s;
  const front = 430 + 1300 * (env.reducedMotion ? 0.5 : t);
  const x = front - TRAIN_BOX.w * s;
  const y = RAIL1 - TRAIN_BOX.rail * s;
  const spin = front / (33 * s);
  wetTrail(c, x + 20);
  const train = (mode, canvas) => {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.drawImage(canvas.canvas, 0, 0, canvas.w, canvas.h);
    drawTrainWheels(c, mode, spin);
    c.restore();
  };
  c.save(); clipLeftOf(c, EDGE_PTS); train('paint', paint); c.restore();
  c.save(); clipRightOf(c, EDGE_PTS); train('ink', inked);
  // the inked carriage's windows light the dark round it
  c.globalCompositeOperation = 'lighter';
  glow(c, x + TRAIN_BOX.w * 0.3 * s, y + 60 * s, 260 * s, 'rgba(255, 186, 104, 0.9)', 0.16);
  c.restore();
  // drips: the paint is still wet on the paper side
  if (!env.reducedMotion) {
    const random = rng(5130);
    TRAIN_COLOURS.forEach(({ x0, x1, color }) => {
      for (let k = 0; k < 4; k += 1) {
        const dx = x + (x0 + random() * (x1 - x0)) * s;
        const phase = (env.wall * (0.8 + random() * 0.5) + random()) % 1;
        const dy = y + 168 * s + phase * phase * 34;
        if (dx > EDGE1 - 40) continue;
        c.fillStyle = color;
        c.globalAlpha = 0.75 * (1 - phase);
        c.beginPath(); c.ellipse(dx, dy, 2.6, 3.6 + phase * 2, 0, 0, TAU); c.fill();
      }
    });
    c.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// shot 2: the walnut hall, brass doors; the train stops inside it

const HALL = Object.freeze({ floor: 640, cornice: 150, doorX: 970, doorW: 330, doorTop: 196, rail: 668 });
const TRAIN2 = Object.freeze({ s: 0.62, stop: 912 });

function paintHall(c, w, h) {
  // the vault, lost in the dark above the cornice
  c.fillStyle = vgrad(c, 0, HALL.cornice, [[0, '#030304'], [1, '#120c08']]);
  c.fillRect(-20, -20, w + 40, HALL.cornice + 20);
  // walnut panelling between pilasters
  wood(c, -20, HALL.cornice, w + 40, HALL.floor - HALL.cornice, { base: '#21160d', vertical: true, seed: 5201, grain: 'rgba(0,0,0,0.32)' });
  c.fillStyle = 'rgba(0, 0, 0, 0.35)';
  c.fillRect(-20, HALL.cornice, w + 40, HALL.floor - HALL.cornice);
  for (let x = 40; x < w; x += 300) {
    if (x > HALL.doorX - 120 && x < HALL.doorX + HALL.doorW + 60) continue;
    inkRect(c, x + 34, HALL.cornice + 70, 230, 300, { w: 1.6, alpha: 0.35, seed: 5202 + x });
    inkRect(c, x + 46, HALL.cornice + 82, 206, 276, { w: 1, alpha: 0.2, seed: 5203 + x });
    // a dark vitrine in each bay, waiting
    c.fillStyle = 'rgba(30, 40, 46, 0.5)';
    c.fillRect(x + 90, HALL.cornice + 140, 118, 150);
    c.strokeStyle = 'rgba(176, 138, 74, 0.35)'; c.lineWidth = 2;
    c.strokeRect(x + 90, HALL.cornice + 140, 118, 150);
  }
  for (let x = 20; x < w + 40; x += 300) {
    if (x > HALL.doorX - 60 && x < HALL.doorX + HALL.doorW + 40) continue;
    wood(c, x - 14, HALL.cornice, 28, HALL.floor - HALL.cornice, { base: '#2e1f13', vertical: true, seed: 5210 + x });
    c.fillStyle = brassFill(c, x - 20, HALL.cornice + 2, 40, 14); c.fillRect(x - 20, HALL.cornice + 2, 40, 12);
    c.fillStyle = brassFill(c, x - 20, HALL.floor - 18, 40, 14); c.fillRect(x - 20, HALL.floor - 16, 40, 14);
    ink(c, [[x - 14, HALL.cornice], [x - 14, HALL.floor]], { w: 1.4, alpha: 0.5, seed: 5211 + x });
  }
  // the cornice
  wood(c, -20, HALL.cornice - 20, w + 40, 22, { base: '#3a2616', seed: 5220 });
  c.fillStyle = brassFill(c, -20, HALL.cornice, w + 40, 5); c.fillRect(-20, HALL.cornice, w + 40, 4);
  ink(c, [[-20, HALL.cornice + 4], [w + 20, HALL.cornice + 4]], { w: 1.6, alpha: 0.6, seed: 5221 });
  // the brass doors and their walnut architrave
  const { doorX: dx, doorW: dw, doorTop: dt } = HALL;
  wood(c, dx - 40, dt - 50, dw + 80, HALL.floor - dt + 50, { base: '#3a2616', vertical: true, seed: 5230 });
  inkRect(c, dx - 40, dt - 50, dw + 80, HALL.floor - dt + 50, { w: 2, alpha: 0.6, seed: 5231 });
  [0, 1].forEach((i) => {
    const lx = dx + (i * dw) / 2;
    c.fillStyle = brassFill(c, lx, dt, dw / 2, HALL.floor - dt, true);
    c.fillRect(lx + 2, dt, dw / 2 - 4, HALL.floor - dt);
    c.fillStyle = 'rgba(40, 24, 8, 0.5)';
    c.fillRect(lx + 2, dt, dw / 2 - 4, HALL.floor - dt);
    [[dt + 30, 180], [dt + 240, 170]].forEach(([py, ph]) => {
      c.fillStyle = brassFill(c, lx + 24, py, dw / 2 - 48, ph);
      c.globalAlpha = 0.55; c.fillRect(lx + 24, py, dw / 2 - 48, ph); c.globalAlpha = 1;
      inkRect(c, lx + 24, py, dw / 2 - 48, ph, { w: 1.4, alpha: 0.5, color: '#2a1a08', bleed: false, seed: 5232 + i + py });
    });
    c.fillStyle = PAL.brassLight;
    c.beginPath(); c.arc(lx + (i ? 26 : dw / 2 - 26), dt + 230, 9, 0, TAU); c.fill();
  });
  c.fillStyle = 'rgba(255, 200, 120, 0.5)';
  c.fillRect(dx + dw / 2 - 1, dt + 4, 2, HALL.floor - dt - 8);
  // the museum's name over the doors
  c.save();
  c.font = '700 26px "Space Mono", monospace';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = PAL.brass;
  c.fillText('THE MUSEUM OF ONE ANSWER', dx + dw / 2, dt - 25, dw + 60);
  c.restore();
  // the floor: dark boards, two brass inlay lines the train runs on
  c.fillStyle = vgrad(c, HALL.floor, h, [[0, '#24170e'], [1, '#0c0805']]);
  c.fillRect(-20, HALL.floor, w + 40, h - HALL.floor + 20);
  c.strokeStyle = 'rgba(0, 0, 0, 0.5)'; c.lineWidth = 1;
  for (let y = HALL.floor + 10, gap = 10; y < h; gap *= 1.3, y += gap) { c.beginPath(); c.moveTo(-20, y); c.lineTo(w + 20, y); c.stroke(); }
  [HALL.rail - 6, HALL.rail + 6].forEach((y) => { c.fillStyle = brassFill(c, -20, y - 2, w + 40, 4); c.fillRect(-20, y - 2, HALL.doorX + 20, 3); });
  ink(c, [[-20, HALL.floor], [w + 20, HALL.floor]], { w: 2.4, alpha: 0.8, seed: 5240 });
  finishLayer(c, w, h, { grain: 0.12, vig: 0 });
}

function shotHall(c, t, w, h, env) {
  env.drawLayer(c, 'hall', paintHall);
  const inked = env.layer('@train-ink', (lc) => paintTrainBody(lc, 'ink'), { w: TRAIN_BOX.w, h: TRAIN_BOX.h });
  const u = env.reducedMotion ? 1 : ramp(t, 0, 0.7);
  const travel = 1 - (1 - u) ** 2.2;
  const s = TRAIN2.s;
  const front = -60 + (TRAIN2.stop + 60) * travel;
  const x = front - TRAIN_BOX.w * s;
  const y = HALL.rail - TRAIN_BOX.rail * s;
  // its lamplight on the floor and, as it comes near, on the brass doors
  c.save();
  c.globalCompositeOperation = 'lighter';
  const pool = c.createRadialGradient(x + TRAIN_BOX.w * s * 0.5, HALL.rail, 0, x + TRAIN_BOX.w * s * 0.5, HALL.rail, 420);
  pool.addColorStop(0, 'rgba(255, 180, 100, 0.22)'); pool.addColorStop(1, 'rgba(255, 180, 100, 0)');
  c.fillStyle = pool; c.fillRect(x - 400, HALL.floor - 300, TRAIN_BOX.w * s + 800, 500);
  const near = ramp(front, 600, TRAIN2.stop);
  glow(c, HALL.doorX + 40, HALL.floor - 200, 340, 'rgba(255, 196, 120, 0.9)', 0.2 * near);
  c.restore();
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.drawImage(inked.canvas, 0, 0, inked.w, inked.h);
  drawTrainWheels(c, 'ink', (front + 60) / (33 * s));
  c.restore();
  glow(c, x + TRAIN_BOX.w * 0.3 * s, y + 60 * s, 200 * s, 'rgba(255, 196, 112, 0.9)', 0.22);
  vignette(c, w, h, 0.62);
}

// ---------------------------------------------------------------------------
// shot 3: the cases light one by one as he passes

const CASES = Object.freeze([260, 620, 980, 1340]);
const CASE = Object.freeze({ top: 236, glassBottom: 496, plinthBottom: 704, half: 124 });
const LABELS = ['TICKET · CITY LINE', 'LETTER · "KEEP MOVING"', 'TWO TICKETS · SEAT 43', 'DRAWING · R. VELEZ'];
const WALK3 = Object.freeze({ from: 40, to: 1560, floor: 772, s: 2.5 });

function paintLetter(c, x, y) {
  c.save();
  c.translate(x, y);
  c.rotate(0.05);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  c.fillStyle = '#e9dfc6';
  c.fillRect(-74, -96, 148, 192);
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(120, 100, 70, 0.25)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-74, -32); c.lineTo(74, -32); c.moveTo(-74, 32); c.lineTo(74, 32); c.stroke();
  c.fillStyle = 'rgba(70, 44, 26, 0.85)';
  c.font = 'italic 400 22px Georgia, "Times New Roman", serif';
  c.fillText('Butch —', -58, -52);
  c.font = 'italic 400 19px Georgia, "Times New Roman", serif';
  c.fillText('… keep', -50, 0);
  c.fillText('moving.', -40, 24);
  c.font = 'italic 400 22px Georgia, "Times New Roman", serif';
  c.fillText('— M.', 10, 70);
  c.restore();
}

function paintCases(lit) {
  return (c, w, h) => {
    wood(c, -20, -20, w + 40, h + 40, { base: '#1f150d', vertical: true, seed: 5301, grain: 'rgba(0,0,0,0.3)' });
    c.fillStyle = 'rgba(0, 0, 0, 0.45)'; c.fillRect(0, 0, w, h);
    c.fillStyle = brassFill(c, -20, 120, w + 40, 5); c.fillRect(-20, 120, w + 40, 4);
    c.fillStyle = vgrad(c, CASE.plinthBottom, h, [[0, '#23170e'], [1, '#0b0805']]);
    c.fillRect(-20, CASE.plinthBottom, w + 40, h);
    ink(c, [[-20, CASE.plinthBottom], [w + 20, CASE.plinthBottom]], { w: 2.2, alpha: 0.7, seed: 5302 });
    CASES.forEach((cx, i) => {
      const x0 = cx - CASE.half;
      const cw = CASE.half * 2;
      if (lit) {
        // the floor pool in front of a lit case
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(cx, CASE.plinthBottom + 20, 0, cx, CASE.plinthBottom + 20, 260);
        g.addColorStop(0, 'rgba(255, 190, 110, 0.22)'); g.addColorStop(1, 'rgba(255, 190, 110, 0)');
        c.fillStyle = g; c.fillRect(cx - 260, CASE.plinthBottom - 40, 520, 200);
        c.restore();
      }
      // the plinth and its label plate
      wood(c, x0 - 8, CASE.glassBottom, cw + 16, CASE.plinthBottom - CASE.glassBottom, { base: '#3a2617', vertical: true, seed: 5310 + i });
      c.fillStyle = brassFill(c, x0 - 12, CASE.glassBottom - 4, cw + 24, 10); c.fillRect(x0 - 12, CASE.glassBottom - 4, cw + 24, 10);
      inkRect(c, x0 - 8, CASE.glassBottom, cw + 16, CASE.plinthBottom - CASE.glassBottom, { w: 1.8, alpha: 0.6, seed: 5315 + i });
      c.fillStyle = brassFill(c, cx - 100, 570, 200, 34);
      roundRectPath(c, cx - 100, 570, 200, 34, 4); c.fill();
      c.fillStyle = 'rgba(40, 24, 10, 0.92)';
      c.font = '700 12px "Space Mono", monospace';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(LABELS[i], cx, 587, 186);
      c.textAlign = 'left';
      // inside the glass: velvet, the object
      c.fillStyle = vgrad(c, CASE.top, CASE.glassBottom, [[0, '#0d1114'], [1, '#141a1e']]);
      c.fillRect(x0, CASE.top, cw, CASE.glassBottom - CASE.top);
      c.fillStyle = vgrad(c, CASE.glassBottom - 40, CASE.glassBottom, [[0, '#5a1f1a'], [1, '#2e0e0b']]);
      c.fillRect(x0, CASE.glassBottom - 40, cw, 40);
      const oy = 372;
      if (i === 0) drawTicket(c, cx, oy, { w: 176, angle: -0.08 });
      if (i === 1) paintLetter(c, cx, oy - 6);
      if (i === 2) {
        drawTicket(c, cx - 14, oy - 30, { w: 156, angle: -0.12, lines: ['SEAT 43', 'M. VELEZ'] });
        drawTicket(c, cx + 14, oy + 30, { w: 156, angle: 0.07, lines: ['SEAT 43', 'M. VENN'], tone: '#ddd0ae' });
      }
      if (i === 3) {
        c.save(); c.translate(cx, oy); c.rotate(-0.04);
        drawRosaDrawing(c, -100, -67, 200, { mode: 'grey', seed: 5320, shadow: 0.6 });
        rubberStamp(c, 34, 10, 'FILED', { size: 18, angle: -0.14, seed: 5321 });
        c.restore();
      }
      if (lit) {
        // the case's own lamp, high inside the glass
        c.save(); c.globalCompositeOperation = 'lighter';
        lightCone(c, cx, CASE.top + 6, cw * 0.42, CASE.glassBottom - CASE.top, 0.18, '255, 214, 150');
        c.restore();
        glow(c, cx, CASE.top + 14, 120, 'rgba(255, 220, 160, 0.9)', 0.4);
      } else {
        c.fillStyle = 'rgba(4, 6, 9, 0.72)';
        c.fillRect(x0, CASE.top, cw, CASE.glassBottom - CASE.top);
      }
      // the glass: brass frame, a sheen
      c.fillStyle = lit ? 'rgba(220, 230, 240, 0.08)' : 'rgba(200, 220, 240, 0.03)';
      c.beginPath(); c.moveTo(x0 + 30, CASE.top); c.lineTo(x0 + 80, CASE.top); c.lineTo(x0 + 20, CASE.glassBottom); c.lineTo(x0 - 30, CASE.glassBottom); c.closePath(); c.fill();
      c.save(); c.lineWidth = 5; c.strokeStyle = brassFill(c, x0, CASE.top, cw, CASE.glassBottom - CASE.top); c.strokeRect(x0, CASE.top, cw, CASE.glassBottom - CASE.top); c.restore();
      c.fillStyle = brassFill(c, x0 - 10, CASE.top - 14, cw + 20, 16); c.fillRect(x0 - 10, CASE.top - 14, cw + 20, 14);
    });
    finishLayer(c, w, h, { grain: 0.12, vig: 0 });
    if (!lit) { c.fillStyle = 'rgba(3, 3, 6, 0.42)'; c.fillRect(0, 0, w, h); }
  };
}

/** When each case lights: as his lamp reaches it. */
const lightAt = CASES.map((cx) => (cx - 70 - WALK3.from) / (WALK3.to - WALK3.from));

function shotCases(c, t, w, h, env) {
  env.drawLayer(c, 'cases-dark', paintCases(false));
  const lit = env.layer('cases-lit', paintCases(true));
  CASES.forEach((cx, i) => {
    const a0 = env.reducedMotion ? (i + 0.6) / 5 : lightAt[i];
    // a museum lamp coming on: up, a stutter, then steady
    const on = ramp(t, a0, a0 + 0.025) * (1 - 0.45 * (ramp(t, a0 + 0.03, a0 + 0.04) - ramp(t, a0 + 0.04, a0 + 0.06)));
    if (on <= 0) return;
    c.save();
    c.beginPath(); c.rect(cx - 170, 100, 340, 700); c.clip();
    c.globalAlpha = on;
    c.drawImage(lit.canvas, 0, 0, lit.w, lit.h);
    c.restore();
  });
  // Butch walking the row, lamp in hand
  // (Reduce Motion: he stands in the middle of the row while it lights)
  const bx = env.reducedMotion ? 800 : WALK3.from + (WALK3.to - WALK3.from) * t;
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(bx + 20, WALK3.floor - 90, 0, bx + 20, WALK3.floor - 90, 380);
  g.addColorStop(0, 'rgba(255, 186, 104, 0.24)'); g.addColorStop(1, 'rgba(255, 170, 90, 0)');
  c.fillStyle = g; c.fillRect(bx - 380, 300, 800, 520);
  c.restore();
  drawButch(c, bx, WALK3.floor, WALK3.s, { pose: env.reducedMotion ? 'stand' : 'walk', phase: (bx - WALK3.from) / 9.5, facing: 1, lamp: 'hand', glowAlpha: 0.6 });
  vignette(c, w, h, 0.55);
}

// ---------------------------------------------------------------------------
// shot 4: the accession card, PENDING

const CARD = Object.freeze({ x: 800, y: 600, w: 470 });

function paintPlinth(c, w, h) {
  c.fillStyle = '#07060a';
  c.fillRect(-20, -20, w + 40, h + 40);
  wood(c, -20, -20, w + 40, 420, { base: '#140e09', vertical: true, seed: 5401, grain: 'rgba(0,0,0,0.4)' });
  c.fillStyle = 'rgba(0, 0, 0, 0.5)'; c.fillRect(-20, -20, w + 40, 420);
  // the plinth: its top, then its front, walnut with a brass edge
  wood(c, 200, 384, 1200, 40, { base: '#4a3121', seed: 5402 });
  c.fillStyle = brassFill(c, 196, 420, 1208, 8); c.fillRect(196, 420, 1208, 7);
  wood(c, 210, 427, 1180, h - 427 + 20, { base: '#2c1d12', vertical: true, seed: 5403 });
  inkRect(c, 210, 427, 1180, h, { w: 2.2, alpha: 0.6, seed: 5404 });
  inkRect(c, 250, 460, 1100, h, { w: 1.2, alpha: 0.3, seed: 5405 });
  // the velvet bed on top, an empty hollow in it the size of a case
  c.fillStyle = vgrad(c, 330, 394, [[0, '#4a1c18'], [1, '#2a0d0a']]);
  roundRectPath(c, 500, 330, 600, 64, 14); c.fill();
  c.fillStyle = vgrad(c, 344, 384, [[0, '#1e0806'], [1, '#3a1410']]);
  roundRectPath(c, 580, 344, 440, 38, 8); c.fill();
  ink(c, [[580, 382], [580, 344], [1020, 344]], { w: 1.4, alpha: 0.4, color: '#1a0604', bleed: false, seed: 5406 });
  // the card's brass holder on the plinth's face
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
  c.fillStyle = brassFill(c, CARD.x - CARD.w / 2 - 18, CARD.y - CARD.w * 0.3 - 18, CARD.w + 36, CARD.w * 0.6 + 36);
  roundRectPath(c, CARD.x - CARD.w / 2 - 18, CARD.y - CARD.w * 0.3 - 18, CARD.w + 36, CARD.w * 0.6 + 36, 8); c.fill();
  c.restore();
  drawAccessionCard(c, CARD.x, CARD.y, { w: CARD.w, angle: 0 });
  finishLayer(c, w, h, { grain: 0.12, vig: 0 });
}

function shotPending(c, t, w, h, env) {
  env.drawLayer(c, 'plinth', paintPlinth);
  const up = 0.45 + 0.55 * smooth(ramp(t, 0, 0.35));
  // the museum's spot from above, and the dark round it
  c.save();
  c.globalCompositeOperation = 'lighter';
  lightCone(c, 800, -40, 520, 820, 0.14 * up, '255, 214, 150');
  const g = c.createRadialGradient(CARD.x, CARD.y - 120, 0, CARD.x, CARD.y - 120, 520);
  g.addColorStop(0, `rgba(255, 196, 120, ${0.2 * up})`); g.addColorStop(1, 'rgba(255, 196, 120, 0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.restore();
  c.fillStyle = `rgba(3, 3, 6, ${0.5 * (1 - up)})`;
  c.fillRect(0, 0, w, h);
  // dust turning in the beam
  const n = env.lowGraphics ? 14 : 36;
  const random = rng(5410);
  c.fillStyle = 'rgba(255, 236, 200, 0.5)';
  for (let i = 0; i < n; i += 1) {
    const sx = 800 + (random() - 0.5) * 760;
    const sy = random() * 700;
    const drift = env.reducedMotion ? 0 : env.wall * (6 + random() * 10);
    const px = sx + Math.sin(drift * 0.15 + i) * 20;
    const py = (sy + drift) % 720;
    const inside = Math.abs(px - 800) < 120 + py * 0.32;
    if (!inside) continue;
    c.globalAlpha = (0.2 + random() * 0.5) * up;
    c.fillRect(px, py, 2.2, 2.2);
  }
  c.globalAlpha = 1;
  vignette(c, w, h, 0.6);
}

// ---------------------------------------------------------------------------
// shot 5: the Archivist behind the brass lamp

const DESK5 = Object.freeze({ top: 560 });
const LAMP5 = Object.freeze({ x: 905, shadeY: 404, shadeW: 236 });
const LEDGER = Object.freeze({ spine: 640, y: 548, pageW: 170 });
const FIGURE = Object.freeze({ x: 700, top: 112 });

/** The Archivist: a tall, narrow shadow with a high collar, leaning over the ledger. No face. */
function archivistPath() {
  const p = new Path2D();
  const { x, top } = FIGURE;
  // the head, tipped a little forward over the ledger
  p.moveTo(x - 30, top + 74);
  p.bezierCurveTo(x - 36, top + 22, x - 16, top, x + 4, top);
  p.bezierCurveTo(x + 26, top, x + 38, top + 24, x + 32, top + 70);
  // the high stiff collar, then long sloping shoulders
  p.lineTo(x + 44, top + 92);
  p.lineTo(x + 52, top + 128);
  p.bezierCurveTo(x + 104, top + 140, x + 138, top + 164, x + 146, top + 214);
  // the right sleeve down to the elbow on the desk, the forearm in to the page
  p.bezierCurveTo(x + 158, top + 300, x + 176, top + 380, x + 168, DESK5.top - 30);
  p.lineTo(LEDGER.spine + LEDGER.pageW - 8, DESK5.top - 24);
  p.lineTo(LEDGER.spine + LEDGER.pageW - 14, DESK5.top - 4);
  p.lineTo(x + 96, DESK5.top + 30);
  // across the coat behind the desk to the left sleeve
  p.lineTo(x - 96, DESK5.top + 30);
  p.lineTo(LEDGER.spine - LEDGER.pageW + 14, DESK5.top - 4);
  p.lineTo(LEDGER.spine - LEDGER.pageW + 8, DESK5.top - 24);
  p.lineTo(x - 168, DESK5.top - 30);
  p.bezierCurveTo(x - 176, top + 380, x - 158, top + 300, x - 146, top + 214);
  p.bezierCurveTo(x - 138, top + 164, x - 104, top + 140, x - 52, top + 128);
  p.lineTo(x - 44, top + 92);
  p.closePath();
  return p;
}

function paintArchive(c, w, h) {
  wood(c, -20, -20, w + 40, h + 40, { base: '#1a120b', vertical: true, seed: 5501, grain: 'rgba(0,0,0,0.35)' });
  c.fillStyle = 'rgba(0, 0, 0, 0.5)'; c.fillRect(0, 0, w, h);
  // card-catalogue drawers on the wall behind, brass pulls and label frames
  for (let col = 0; col < 12; col += 1) {
    for (let row = 0; row < 7; row += 1) {
      const x = 20 + col * 132;
      const y = 40 + row * 70;
      c.fillStyle = 'rgba(58, 38, 23, 0.7)';
      c.fillRect(x, y, 122, 62);
      inkRect(c, x, y, 122, 62, { w: 1, alpha: 0.25, seed: 5510 + col * 7 + row });
      c.fillStyle = 'rgba(176, 138, 74, 0.55)';
      c.fillRect(x + 46, y + 36, 30, 6);
      c.fillStyle = 'rgba(216, 204, 176, 0.35)';
      c.fillRect(x + 44, y + 14, 34, 14);
    }
  }
  // the desk, walnut and brass, across the front
  wood(c, -20, DESK5.top, w + 40, h - DESK5.top + 20, { base: '#3a2617', vertical: true, seed: 5520 });
  wood(c, -20, DESK5.top - 18, w + 40, 22, { base: '#5a3a22', seed: 5521 });
  c.fillStyle = brassFill(c, -20, DESK5.top, w + 40, 6); c.fillRect(-20, DESK5.top + 2, w + 40, 5);
  ink(c, [[-20, DESK5.top - 18], [w + 20, DESK5.top - 18]], { w: 2, alpha: 0.6, seed: 5522 });
  for (let x = 60; x < w; x += 300) inkRect(c, x, DESK5.top + 50, 240, h - DESK5.top - 70, { w: 1.4, alpha: 0.35, seed: 5523 + x });
  finishLayer(c, w, h, { grain: 0.12, vig: 0 });
}

function paintLamp(c) {
  const { x, shadeY, shadeW } = LAMP5;
  // base on the desk, the stem, the green glass shade (the lobby's lamp)
  c.fillStyle = brassFill(c, x - 70, DESK5.top - 40, 140, 24);
  c.beginPath(); c.ellipse(x, DESK5.top - 22, 70, 14, 0, 0, TAU); c.fill();
  c.fillStyle = brassFill(c, x - 8, shadeY + 30, 16, DESK5.top - shadeY - 50, true);
  c.fillRect(x - 6, shadeY + 30, 12, DESK5.top - shadeY - 50);
  c.fillStyle = vgrad(c, shadeY - 20, shadeY + 44, [[0, '#2e5a44'], [0.6, '#1f4232'], [1, '#14281f']]);
  c.beginPath();
  c.moveTo(x - shadeW / 2, shadeY + 44);
  c.quadraticCurveTo(x - shadeW * 0.42, shadeY - 24, x, shadeY - 26);
  c.quadraticCurveTo(x + shadeW * 0.42, shadeY - 24, x + shadeW / 2, shadeY + 44);
  c.closePath(); c.fill();
  c.fillStyle = 'rgba(160, 220, 180, 0.25)';
  c.beginPath(); c.ellipse(x - shadeW * 0.18, shadeY + 2, shadeW * 0.16, 10, -0.2, 0, TAU); c.fill();
  c.fillStyle = brassFill(c, x - shadeW / 2, shadeY + 40, shadeW, 8);
  c.fillRect(x - shadeW / 2, shadeY + 40, shadeW, 7);
  ink(c, [[x - shadeW / 2, shadeY + 44], [x - shadeW * 0.3, shadeY - 16], [x, shadeY - 26], [x + shadeW * 0.3, shadeY - 16], [x + shadeW / 2, shadeY + 44]], { w: 1.6, alpha: 0.5, bleed: false, seed: 5530 });
}

function shotArchivist(c, t, w, h, env) {
  env.drawLayer(c, 'archive', paintArchive);
  const flicker = env.reducedMotion ? 0 : 0.04 * Math.sin(env.wall * 7.3) * Math.sin(env.wall * 2.9 + 1);
  const figure = archivistPath();
  // the lamp, low and in front, throws the Archivist's shadow up the drawers, huge
  c.save();
  c.translate(FIGURE.x, DESK5.top);
  c.scale(1.7 + flicker * 2, 1.45 + flicker);
  c.translate(-FIGURE.x - 90, -DESK5.top - 10);
  c.fillStyle = 'rgba(3, 2, 4, 0.58)';
  c.fill(figure);
  c.restore();
  // the Archivist: a shadow, lit only from below by the lamp, no face
  c.fillStyle = '#08080b';
  c.fill(figure);
  c.save();
  c.clip(figure);
  const under = c.createLinearGradient(0, DESK5.top + 10, 0, FIGURE.top + 260);
  under.addColorStop(0, `rgba(255, 186, 104, ${0.26 + flicker})`);
  under.addColorStop(1, 'rgba(255, 186, 104, 0)');
  c.fillStyle = under;
  c.fillRect(FIGURE.x - 220, FIGURE.top, 440, DESK5.top);
  c.restore();
  ink(c, [[FIGURE.x + 52, FIGURE.top + 128], [FIGURE.x + 138, FIGURE.top + 164], [FIGURE.x + 150, FIGURE.top + 260], [FIGURE.x + 170, DESK5.top - 30]], { w: 2, alpha: 0.4 + flicker, color: '#ffc988', bleed: true, jitter: 0.3, seed: 5540 });
  ink(c, [[FIGURE.x - 52, FIGURE.top + 128], [FIGURE.x - 138, FIGURE.top + 164], [FIGURE.x - 150, FIGURE.top + 260], [FIGURE.x - 170, DESK5.top - 30]], { w: 1.4, alpha: 0.18, color: '#ffc988', bleed: false, jitter: 0.3, seed: 5541 });
  env.drawLayer(c, 'desk-front', (lc, lw, lh) => {
    lc.beginPath(); lc.rect(0, DESK5.top - 20, lw, lh); lc.clip();
    paintArchive(lc, lw, lh);
  });
  // the ledger open on the desk; a page turns over
  ledger(c, env.reducedMotion ? 0 : ramp(t, 0.22, 0.42));
  // gloved hands at the ledger's edges, the lamp on their knuckles
  [[LEDGER.spine - LEDGER.pageW + 4, 0.2], [LEDGER.spine + LEDGER.pageW - 4, -0.2]].forEach(([hx, a]) => {
    c.fillStyle = '#0b0b0e';
    c.beginPath(); c.ellipse(hx, LEDGER.y - 10, 30, 13, a, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255, 190, 110, 0.22)';
    c.beginPath(); c.ellipse(hx + 4, LEDGER.y - 18, 20, 4, a, 0, TAU); c.fill();
  });
  paintLamp(c);
  // the lamp's light: a pool on the desk under the shade, the glow of the green glass
  c.save();
  c.globalCompositeOperation = 'lighter';
  const pool = c.createRadialGradient(LAMP5.x - 80, DESK5.top - 10, 0, LAMP5.x - 80, DESK5.top - 10, 460);
  pool.addColorStop(0, `rgba(255, 200, 120, ${0.3 + flicker})`); pool.addColorStop(0.5, 'rgba(255, 180, 100, 0.08)'); pool.addColorStop(1, 'rgba(255, 180, 100, 0)');
  c.fillStyle = pool; c.fillRect(0, 0, w, h);
  c.restore();
  glow(c, LAMP5.x, LAMP5.shadeY + 46, 120, 'rgba(255, 230, 170, 0.95)', 0.5 + flicker);
  vignette(c, w, h, 0.62);
}

function ledger(c, turn) {
  const { spine, y, pageW } = LEDGER;
  const page = (x0, x1, lift, shade) => {
    c.fillStyle = shade;
    c.beginPath();
    c.moveTo(spine, y);
    c.quadraticCurveTo((spine + x1) / 2, y - 14 - lift, x1, y - 4 - lift * 0.6);
    c.lineTo(x1, y + 6 - lift * 0.6);
    c.quadraticCurveTo((spine + x1) / 2, y - 2 - lift, spine, y + 10);
    c.closePath();
    c.fill();
    void x0;
  };
  page(spine, spine - pageW, 0, '#d9cdb0');
  page(spine, spine + pageW, 0, '#e3d8bd');
  // the ruled lines of entries
  c.strokeStyle = 'rgba(90, 60, 40, 0.35)'; c.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) { c.beginPath(); c.moveTo(spine + 20, y - 8 + i * 1.6); c.lineTo(spine + pageW - 16, y - 6 + i * 1.6); c.stroke(); }
  if (turn > 0 && turn < 1) {
    const x1 = spine + pageW * Math.cos(Math.PI * turn);
    page(spine, x1, Math.sin(Math.PI * turn) * 60, turn < 0.5 ? '#efe5cc' : '#d6caae');
  }
  ink(c, [[spine - pageW, y - 4], [spine, y + 8], [spine + pageW, y - 4]], { w: 1.4, alpha: 0.5, bleed: false, color: '#3a2a1a', seed: 5550 });
}

// ---------------------------------------------------------------------------

export const chapter4To5 = {
  id: 'chapter4To5',
  title: 'The museum of one answer',
  length: [25, 40],
  // Ch3's archive cue (Paul Pitman / Musopen, public domain dedication)
  music: { id: 'cutscene-4-5', src: '/assets/music/ch3/3.5_beethoven_moonlight_mvt1.mp3', volume: 0.46, fade: 2.5, outFade: 3 },
  prepare: () => Promise.all([
    usePaintAssets({ paper: paperUrl, train: trainUrl }),
    prebuild([() => platformCountry(), () => buildTrain('paint', 'ink'), () => rosaDrawing()]),
  ]),
  shots: [
    {
      id: 'dries-to-ink',
      duration: 7.6,
      draw: shotDriesToInk,
      camera: { from: { x: 0.34, y: 0.54, zoom: 1.25 }, to: { x: 0.66, y: 0.54, zoom: 1.25 }, still: { x: 0.52, y: 0.54, zoom: 1.12 } },
      transition: { type: 'ink', duration: 1.1 },
      cues: [{ at: 0, sfx: 'rail', level: 1 }],
    },
    {
      id: 'walnut-hall',
      duration: 7.2,
      draw: shotHall,
      camera: { from: { x: 0.46, y: 0.5, zoom: 1.08 }, to: { x: 0.56, y: 0.52, zoom: 1.2 }, still: { x: 0.52, y: 0.5, zoom: 1.1 } },
      transition: { type: 'slide', duration: 1.1 },
      cues: [{ at: 0, sfx: 'rail', level: 0.8 }, { at: 2.2, sfx: 'brake' }, { at: 4.2, stopSfx: 'rail', fade: 2 }],
    },
    {
      id: 'cases-light',
      duration: 8.8,
      draw: shotCases,
      camera: { from: { x: 0.34, y: 0.56, zoom: 1.28 }, to: { x: 0.66, y: 0.56, zoom: 1.28 }, still: { x: 0.5, y: 0.52, zoom: 1.04 } },
      transition: { type: 'fade', duration: 1.1 },
      captions: [{ text: 'The archive had filed his journey already.', at: 2.2, end: 6.8 }],
      cues: lightAt.map((at) => ({ at: +(at * 8.8).toFixed(2), sfx: 'punch' })),
    },
    {
      id: 'pending',
      duration: 6.8,
      draw: shotPending,
      camera: { from: { x: 0.5, y: 0.6, zoom: 1.1 }, to: { x: 0.5, y: 0.7, zoom: 1.45 }, still: { x: 0.5, y: 0.66, zoom: 1.25 } },
      transition: { type: 'slide', duration: 1.1 },
      captions: [{ text: 'One object was still pending.', at: 1.1, end: 5.4 }],
      cues: [{ at: 0.3, sfx: 'softBell' }],
    },
    {
      id: 'one-answer',
      duration: 7.6,
      draw: shotArchivist,
      camera: { from: { x: 0.5, y: 0.46, zoom: 1.04 }, to: { x: 0.52, y: 0.44, zoom: 1.16 } },
      captions: [{ text: 'The museum will need one clean answer.', speaker: 'THE ARCHIVIST', at: 2, end: 6.6 }],
      cues: [{ at: 2.1, sfx: 'paper' }, { at: 5.4, stopMusic: true, fade: 3.4 }],
    },
  ],
};

export default chapter4To5;
