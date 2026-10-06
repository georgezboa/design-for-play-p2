// Painters shared by the 3→4 and 4→5 cutscenes (scenes/chapter3To4.js,
// scenes/chapter4To5.js): Chapter 4's paper world, Rosa's drawing, and the
// PAINTED TRAIN in its three states (pencil, wet gouache, dried to ink).
//
// Chapter 4's own hand is imported read-only, so the cutscenes draw the
// country, the hawthorn and the painted train exactly as the chapter does:
//   chapters/paintedCountry/art/pencilKit.js   graphite, hatching, washes
//   chapters/paintedCountry/art/countryArt.js  trees, houses, the hawthorn, the country
//   chapters/paintedCountry/art/trainArt.js    the painted train, part by part
// Those painters build their own canvases once; everything here is memoised
// at module level and composited into the cutscene's cached layers, so a
// shot never runs a pencil stroke per frame.

import { HUE, INK, blob, handRect, hatch, makeCanvas, pencil, rule, scribble, tinted, wash, washBlob, washRect } from '../../chapters/paintedCountry/art/pencilKit.js';
import { appleTree, artLayers, hawthorn, house } from '../../chapters/paintedCountry/art/countryArt.js';
import { TRAIN_WASH_ALPHA, paintTrain, trainTint } from '../../chapters/paintedCountry/art/trainArt.js';
import { PAL, glow, rng } from './painters.js';
import { isSoftwareRenderer } from '../framePacing.js';

export { HUE, INK };

const TAU = Math.PI * 2;

const memo = new Map();
let cpu = false;

/**
 * Build `make()` once per page (the Chapter 4 painters are not cheap). `c`
 * is the context it will be drawn into: when that is a CPU-backed canvas
 * (player.js does that on a software renderer), the Chapter 4 painters' own
 * scratch canvases are made CPU-backed too while they build. Otherwise their
 * drawing queues up on the emulated GPU and stalls the first frame that
 * reads it back, for tens of seconds.
 */
export function once(key, make, c = null) {
  if (c?.getContextAttributes?.()?.willReadFrequently) cpu = true;
  if (!memo.has(key)) memo.set(key, cpu ? onCpu(make) : make());
  return memo.get(key);
}

// player.js's own test: on a software renderer it paints into CPU canvases
let software = null;
function softwareRenderer() {
  if (software !== null) return software;
  software = false;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl') || probe.getContext('experimental-webgl');
    software = gl ? isSoftwareRenderer(gl) : true;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { software = false; }
  return software;
}

/**
 * For a scene's prepare(): build the heavy Chapter 4 art before the first
 * frame, one piece per task so the page stays responsive, instead of in the
 * middle of playback when a later shot's layers are warmed.
 */
export async function prebuild(steps) {
  if (typeof document === 'undefined') return;
  if (softwareRenderer()) cpu = true;
  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    step();
  }
}

/** Build the painted train's canvases for these states (prebuild step). */
export function buildTrain(...modes) {
  const scratch = document.createElement('canvas');
  scratch.width = 1; scratch.height = 1;
  const c = scratch.getContext('2d', cpu ? { willReadFrequently: true } : {});
  modes.forEach((mode) => { paintTrainBody(c, mode); drawTrainWheels(c, mode, 0); });
}

function onCpu(make) {
  if (typeof HTMLCanvasElement === 'undefined') return make();
  const proto = HTMLCanvasElement.prototype;
  const getContext = proto.getContext;
  proto.getContext = function cpuContext(type, options) {
    return getContext.call(this, type, type === '2d' ? { willReadFrequently: true, ...(options ?? {}) } : options);
  };
  try {
    return make();
  } finally {
    proto.getContext = getContext;
  }
}

const css = (n) => `#${n.toString(16).padStart(6, '0')}`;
function mix(a, b, k) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

/** A copy of `src` in one flat colour, keeping its alpha (pencil lines → ivory ink). */
export function recolor(src, color) {
  const out = makeCanvas(src.width, src.height);
  const c = out.getContext('2d');
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color;
  c.fillRect(0, 0, out.width, out.height);
  return out;
}

// ---------------------------------------------------------------------------
// Chapter 4's art layers (countryArt.artLayers): washes under the pencil

const GROUPS = ['violet', 'blue', 'yellow', 'green', 'red', 'orange'];

/**
 * Composite an ArtLayers sheet into `c` at (x, y), w × h. `wash` 0..1 is the
 * colour's strength (0: pencil on paper); `groups` limits it to some colours;
 * `grey` paints the washes through the archive's grey instead.
 */
export function drawArt(c, L, { x = 0, y = 0, w = L.w, h = L.h, wash: washAlpha = 1, groups = null, pencilAlpha = 1, grey = false } = {}) {
  if (washAlpha > 0) {
    c.save();
    c.globalAlpha *= washAlpha;
    if (grey) c.filter = 'grayscale(1) contrast(0.8) brightness(1.04)';
    GROUPS.forEach((id) => {
      const layer = L.washes[id];
      if (layer && (!groups || groups.includes(id))) c.drawImage(layer.canvas, x, y, w, h);
    });
    c.restore();
  }
  if (pencilAlpha > 0) {
    c.save();
    c.globalAlpha *= pencilAlpha;
    c.drawImage(L.pencil, x, y, w, h);
    c.restore();
  }
}

/** Warm paper: Chapter 4's sheet, a little mottled, with the faint drafting grid. */
export function paintPaper(c, x, y, w, h, { tone = INK.sheet, seed = 4101, grid = 0.05, step = 40 } = {}) {
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = tone;
  c.fillRect(x, y, w, h);
  const random = rng(seed);
  for (let i = 0; i < Math.round((w * h) / 9000); i += 1) {
    const px = x + random() * w;
    const py = y + random() * h;
    c.fillStyle = `rgba(150, 128, 96, ${0.015 + random() * 0.03})`;
    c.beginPath(); c.ellipse(px, py, 30 + random() * 90, 20 + random() * 50, random() * 3, 0, TAU); c.fill();
  }
  for (let i = 0; i < Math.round((w * h) / 260); i += 1) {
    c.fillStyle = `rgba(120, 100, 70, ${0.04 + random() * 0.08})`;
    c.fillRect(x + random() * w, y + random() * h, 1 + random() * 1.4, 0.8 + random());
  }
  if (grid > 0) {
    c.strokeStyle = `rgba(141, 133, 121, ${grid})`;
    c.lineWidth = 1;
    for (let gx = x + step; gx < x + w; gx += step) { c.beginPath(); c.moveTo(gx, y); c.lineTo(gx, y + h); c.stroke(); }
    for (let gy = y + step; gy < y + h; gy += step) { c.beginPath(); c.moveTo(x, gy); c.lineTo(x + w, gy); c.stroke(); }
  }
  c.restore();
}

/** A loose sheet of drawing paper lying on a desk: its shadow, a deckled edge, a crease. */
export function paperSheet(c, x, y, w, h, { seed = 4111, tone = INK.sheetHigh, shadow = 0.5, grid = 0 } = {}) {
  const random = rng(seed);
  const edge = [];
  const n = 40;
  for (let i = 0; i < n; i += 1) edge.push([x + (w * i) / n, y + (random() - 0.5) * 2.4]);
  for (let i = 0; i < n * 0.66; i += 1) edge.push([x + w + (random() - 0.5) * 2.4, y + (h * i) / (n * 0.66)]);
  for (let i = 0; i < n; i += 1) edge.push([x + w - (w * i) / n, y + h + (random() - 0.5) * 2.4]);
  for (let i = 0; i < n * 0.66; i += 1) edge.push([x + (random() - 0.5) * 2.4, y + h - (h * i) / (n * 0.66)]);
  const path = new Path2D();
  edge.forEach(([px, py], i) => (i ? path.lineTo(px, py) : path.moveTo(px, py)));
  path.closePath();
  if (shadow > 0) {
    c.save();
    c.shadowColor = `rgba(0, 0, 0, ${shadow})`;
    c.shadowBlur = Math.max(w, h) * 0.04;
    c.shadowOffsetX = w * 0.008;
    c.shadowOffsetY = h * 0.018;
    c.fillStyle = tone;
    c.fill(path);
    c.restore();
  }
  c.save();
  c.clip(path);
  paintPaper(c, x, y, w, h, { tone, seed: seed + 1, grid });
  // an old fold across the middle and soft foxing at the corners
  c.strokeStyle = 'rgba(120, 100, 70, 0.12)';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(x + w * 0.5, y); c.lineTo(x + w * 0.502, y + h); c.stroke();
  [[x, y], [x + w, y + h], [x + w, y]].forEach(([fx, fy]) => {
    const g = c.createRadialGradient(fx, fy, 0, fx, fy, Math.min(w, h) * 0.35);
    g.addColorStop(0, 'rgba(170, 130, 80, 0.16)'); g.addColorStop(1, 'rgba(170, 130, 80, 0)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
  });
  c.restore();
  c.save();
  c.strokeStyle = 'rgba(110, 92, 66, 0.45)';
  c.lineWidth = 1.2;
  c.stroke(path);
  c.restore();
  return path;
}

// ---------------------------------------------------------------------------
// handwriting: a child's capitals in pencil, and an archive rubber stamp

const LETTERS = {
  R: [[[0, 24], [0, 0], [9, 0], [13, 5], [10, 11], [0, 12]], [[5, 12], [13, 24]]],
  O: [[[6, 0], [12, 4], [13, 13], [10, 22], [5, 24], [0, 19], [0, 8], [3, 2], [7, 0]]],
  S: [[[12, 3], [6, 0], [1, 3], [1, 9], [11, 13], [13, 19], [8, 24], [1, 22]]],
  A: [[[0, 24], [6, 0], [13, 24]], [[3, 15], [10, 14]]],
};

/** Big wobbly pencil capitals, the way a child signs a drawing. */
export function childLetters(c, text, x, y, size, { seed = 4120, color = INK.lead, w = 2 } = {}) {
  const k = size / 24;
  const random = rng(seed);
  let cx = x;
  [...text].forEach((ch, i) => {
    const strokes = LETTERS[ch];
    if (!strokes) { cx += size * 0.6; return; }
    const lean = (random() - 0.5) * 0.16;
    const dy = (random() - 0.5) * size * 0.14;
    strokes.forEach((s, j) => {
      const pts = s.map(([px, py]) => [cx + (px + (py - 12) * lean) * k, y + dy + py * k]);
      pencil(c, pts, { w, color, alpha: 0.9, seed: seed + i * 7 + j, smooth: s.length > 3, jitter: 0.7 });
    });
    cx += (14 + random() * 4) * k + size * 0.18;
  });
}

/** The archive's rubber stamp: an oxblood box with its word, inked unevenly. */
export function rubberStamp(c, x, y, text, { size = 60, angle = -0.1, alpha = 0.9, seed = 4130, color = '138, 42, 30' } = {}) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.font = `700 ${size}px "Space Mono", monospace`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(text).width + size * 0.7;
  const th = size * 1.35;
  c.globalAlpha *= alpha;
  c.strokeStyle = `rgba(${color}, 0.92)`;
  c.lineWidth = size * 0.09;
  c.strokeRect(-tw / 2, -th / 2, tw, th);
  c.lineWidth = size * 0.035;
  c.strokeRect(-tw / 2 + size * 0.14, -th / 2 + size * 0.14, tw - size * 0.28, th - size * 0.28);
  c.fillStyle = `rgba(${color}, 0.92)`;
  c.fillText(text, 0, size * 0.04);
  // where the rubber took no ink
  c.globalCompositeOperation = 'destination-out';
  const random = rng(seed);
  for (let i = 0; i < 140; i += 1) {
    c.fillStyle = `rgba(0,0,0,${0.3 + random() * 0.6})`;
    c.beginPath(); c.ellipse((random() - 0.5) * tw, (random() - 0.5) * th, size * (0.01 + random() * 0.05), size * (0.01 + random() * 0.03), random() * 3, 0, TAU); c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// Rosa's drawing: the orchard, the house, the red hawthorn hedge, "ROSA"

export const DRAWING = Object.freeze({ w: 900, h: 600 });

/** The drawing as Chapter 4 draws Rosa's country (countryArt.js), memoised. */
export function rosaDrawing(ctx = null) {
  return once('rosa-drawing', () => {
    const { w, h } = DRAWING;
    const L = artLayers(w, h, { washScale: 0.75, scale: 1.6 });
    const p = L.p;
    const ground = 404;
    // the strip of sky every child paints along the top, and the crayon sun
    washRect(L.w$('blue'), -20, -20, w + 40, 108, '#8fb3cf', { alpha: 0.62, seed: 4201, bloom: 0.35, amp: 7, granulate: 0.2 });
    hatch(p, handRect(0, 0, w, 82, { seed: 4202, amp: 4 }), { angle: -0.18, spacing: 11, alpha: 0.22, w: 1.1, seed: 4203 });
    const sun = [790, 92, 44];
    pencil(p, blob(sun[0], sun[1], sun[2], sun[2], { seed: 4204, lobes: 8, irregular: 0.06 }), { closed: true, w: 1.8, seed: 4205, color: INK.graphite });
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU + 0.1;
      rule(p, sun[0] + Math.cos(a) * sun[2] * 1.25, sun[1] + Math.sin(a) * sun[2] * 1.25, sun[0] + Math.cos(a) * sun[2] * 1.85, sun[1] + Math.sin(a) * sun[2] * 1.85, { w: 1.6, alpha: 0.75, seed: 4206 + i, overshoot: 0 });
    }
    washBlob(L.w$('yellow'), sun[0], sun[1], sun[2], sun[2], HUE.ochre, { alpha: 0.9, seed: 4220, bloom: 0.2 });
    washBlob(L.w$('orange'), sun[0], sun[1], sun[2] * 1.9, sun[2] * 1.7, HUE.lamp, { alpha: 0.2, seed: 4221, blur: 6, bloom: 0 });
    // birds
    [[300, 150], [342, 128], [388, 160]].forEach(([bx, by], i) => pencil(p, [[bx - 12, by - 6], [bx, by + 2], [bx + 12, by - 7]], { w: 1.4, seed: 4230 + i, smooth: false }));
    // a far hill behind the house
    const hill = [];
    for (let x = 300; x <= 920; x += 20) hill.push([x, ground - 6 - Math.sin(((x - 300) / 620) * Math.PI) * 78]);
    pencil(p, hill, { w: 1.4, alpha: 0.7, color: INK.soft, seed: 4240 });
    wash(L.w$('violet'), [...hill, [920, ground + 2], [300, ground + 2]], HUE.mulberry, { alpha: 0.3, seed: 4241, bloom: 0.4 });
    // the ground and the grass
    const groundLine = [];
    for (let x = -10; x <= w + 10; x += 30) groundLine.push([x, ground + Math.sin(x * 0.011) * 5]);
    pencil(p, groundLine, { w: 1.8, seed: 4250 });
    wash(L.w$('green'), [...groundLine, [w + 10, h + 10], [-10, h + 10]], HUE.leaf, { alpha: 0.55, seed: 4251, bloom: 0.45 });
    const grass = rng(4252);
    for (let i = 0; i < 160; i += 1) {
      const gx = grass() * w; const gy = ground + 14 + grass() * (h - ground - 20);
      pencil(p, [[gx, gy], [gx - 2, gy - 8 - grass() * 5]], { w: 1, alpha: 0.4, passes: 1, smooth: false, seed: 4260 + i });
    }
    // the house, its path to the front
    house(L, 520, ground + 2, 196, 128, 4270, { roofH: 92, lit: false, porchLamp: false });
    const door = 520 + 196 * 0.42 + 196 * 0.085;
    pencil(p, [[door - 14, ground + 4], [door - 34, ground + 50], [door - 70, h - 120]], { w: 1.3, alpha: 0.7, seed: 4280 });
    pencil(p, [[door + 14, ground + 4], [door + 24, ground + 50], [door + 6, h - 120]], { w: 1.3, alpha: 0.7, seed: 4281 });
    wash(L.w$('yellow'), [[door - 14, ground + 4], [door + 14, ground + 4], [door + 24, ground + 50], [door + 6, h - 120], [door - 70, h - 120], [door - 34, ground + 50]], HUE.field, { alpha: 0.55, seed: 4282 });
    // the orchard
    appleTree(L, 92, ground + 6, 1.3, 4290, { apples: 9 });
    appleTree(L, 232, ground, 1.12, 4291, { apples: 8 });
    appleTree(L, 372, ground + 8, 1.24, 4292, { apples: 9 });
    // the red hawthorn hedge along the front: dark leaf, white blossom, red haws
    const top = [];
    for (let x = -10; x <= w + 10; x += 22) top.push([x, 470 + Math.sin(x * 0.07) * 7 + Math.sin(x * 0.19) * 4]);
    const hedge = [...top, [w + 10, 548], [-10, 548]];
    pencil(p, top, { w: 1.6, seed: 4300, jitter: 1 });
    pencil(p, [[-10, 548], [w + 10, 546]], { w: 1.2, alpha: 0.6, seed: 4301 });
    for (let x = 20; x < w; x += 46) scribble(p, x, 506, 26, 22, { seed: 4310 + x, loops: 5, alpha: 0.3, w: 0.9 });
    wash(L.w$('green'), hedge, HUE.leafDark, { alpha: 0.72, seed: 4302, bloom: 0.35 });
    [60, 180, 300, 430, 560, 690, 820].forEach((x, i) => hawthorn(L, x, 548, 0.85, 4320 + i * 13));
    const red = L.w$('red');
    const haws = rng(4340);
    for (let i = 0; i < 70; i += 1) {
      const hx = 10 + haws() * (w - 20);
      const hy = 482 + haws() * 56;
      const hr = 4.2 + haws() * 3.4;
      washBlob(red, hx, hy, hr, hr, haws() > 0.3 ? HUE.vermilion : '#b0342a', { alpha: 0.95, seed: 4350 + i, lobes: 6, blur: 0.3, bloom: 0.1 });
      if (haws() > 0.4) { p.save(); p.globalAlpha = 0.5; p.strokeStyle = INK.graphite; p.lineWidth = 0.8; p.beginPath(); p.arc(hx, hy, hr, 0, TAU); p.stroke(); p.restore(); }
    }
    // signed
    childLetters(p, 'ROSA', 760, 560, 26, { seed: 4400, w: 2.2 });
    return L.finish(0.32);
  }, ctx);
}

/** The haw left red under the grey (the 3→4 ending and the 4→5 case): in drawing units. */
export const RED_HAW = Object.freeze({ x: 612, y: 504, r: 8 });

/**
 * Rosa's drawing on its sheet, `w` wide, top-left at (x, y): 'pencil',
 * 'colour', or 'grey' (the archive's wash over it, and the one red haw).
 */
export function drawRosaDrawing(c, x, y, w, { mode = 'colour', washAlpha = 1, seed = 4500, shadow = 0.5, sheet = true } = {}) {
  const k = w / DRAWING.w;
  const h = DRAWING.h * k;
  if (sheet) paperSheet(c, x, y, w, h, { seed, shadow });
  const L = rosaDrawing(c);
  if (mode === 'grey') {
    drawArt(c, L, { x, y, w, h, wash: 0.75, grey: true, pencilAlpha: 0.72 });
    greyWash(c, x, y, w, h, { seed: seed + 1 });
    redHaw(c, x + RED_HAW.x * k, y + RED_HAW.y * k, RED_HAW.r * k);
  } else {
    drawArt(c, L, { x, y, w, h, wash: mode === 'pencil' ? 0 : washAlpha });
  }
  return { x, y, w, h };
}

/** The archive's grey: broad flat strokes over a drawing, the paper's warmth gone under them. */
export function greyWash(c, x, y, w, h, { seed = 4510, alpha = 1 } = {}) {
  c.save();
  c.globalAlpha *= alpha;
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = 'rgba(176, 172, 164, 0.55)';
  c.fillRect(x, y, w, h);
  c.restore();
  c.save();
  c.globalAlpha *= alpha;
  const random = rng(seed);
  const bands = 7;
  for (let i = 0; i < bands; i += 1) {
    const by = y + (h * (i + 0.5)) / bands + (random() - 0.5) * h * 0.04;
    c.fillStyle = `rgba(150, 146, 138, ${0.12 + random() * 0.1})`;
    c.beginPath();
    c.moveTo(x - 4, by - h / bands * 0.62);
    for (let k = 0; k <= 12; k += 1) c.lineTo(x + (w * k) / 12, by - h / bands * (0.55 + random() * 0.14));
    for (let k = 12; k >= 0; k -= 1) c.lineTo(x + (w * k) / 12, by + h / bands * (0.55 + random() * 0.14));
    c.closePath();
    c.fill();
    // bristle streaks along the stroke
    c.strokeStyle = 'rgba(110, 106, 100, 0.12)';
    c.lineWidth = 1.2;
    for (let s = 0; s < 6; s += 1) {
      const sy = by + (random() - 0.5) * h / bands;
      c.beginPath(); c.moveTo(x + random() * w * 0.2, sy); c.lineTo(x + w * (0.7 + random() * 0.3), sy + (random() - 0.5) * 4); c.stroke();
    }
  }
  c.restore();
}

/** One haw, still red: gouache, a pencil ring, the lamp catching its wet side. */
export function redHaw(c, x, y, r, { glowAlpha = 0 } = {}) {
  if (glowAlpha > 0) glow(c, x, y, r * 7, 'rgba(214, 70, 52, 1)', glowAlpha, 'source-over');
  c.save();
  c.fillStyle = '#c4382c';
  c.beginPath(); c.ellipse(x, y, r, r * 0.92, 0.3, 0, TAU); c.fill();
  c.fillStyle = 'rgba(120, 20, 16, 0.5)';
  c.beginPath(); c.ellipse(x + r * 0.25, y + r * 0.3, r * 0.6, r * 0.45, 0.3, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255, 220, 200, 0.6)';
  c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.35, r * 0.25, r * 0.2, 0.3, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(52, 49, 44, 0.7)';
  c.lineWidth = Math.max(0.8, r * 0.14);
  c.beginPath(); c.ellipse(x, y, r, r * 0.92, 0.3, 0, TAU); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------------------
// the PAINTED TRAIN (trainArt.js), as Chapter 4's yard draws it: the
// geometry is the yard's (PigmentTrainScene.js TRAIN_PARTS), mirrored so the
// engine leads to the right.

const TRAIN_SPEC = Object.freeze({
  S: 2,
  nose: -1,
  boiler: { x: 2288, y: 372, w: 212, h: 84 },
  cab: { x: 2496, y: 340, w: 102, h: 116 },
  stack: { x: 2350, y: 316, w: 92, h: 58 },
  carriage: { x: 2594, y: 372, w: 306, h: 84 },
  roof: { x: 2482, y: 326, w: 430, h: 40 },
  wheels: [{ x: 2358, y: 462, r: 33 }, { x: 2535, y: 462, r: 33 }, { x: 2698, y: 462, r: 33 }, { x: 2854, y: 462, r: 33 }],
  frame: { x0: 2255, x1: 2941, y: 447, h: 19 },
});
const TRAIN_ORDER = ['red', 'yellow', 'orange', 'blue', 'violet'];
const PIGMENT = { red: 0xc95850, orange: 0xd98a3a, yellow: 0xd7b84a, green: 0x5e9172, blue: 0x537ca6, violet: 0x84658f };
const X0 = 2206;
const Y0 = 294;
/** The train's box in its own units (it is about 780 × 220): the rail is at `rail`. */
export const TRAIN_BOX = Object.freeze({ w: 780, h: 220, rail: 495 - Y0 });

const trainArt = (c) => once('train-art', () => paintTrain(TRAIN_SPEC), c);
const mirrorX = (x) => TRAIN_BOX.w - (x - X0);

/** The carriage's lit windows (trainArt.js carriage() lays them out the same way), in box units. */
export function trainWindows() {
  const rect = TRAIN_SPEC.carriage;
  const doorW = rect.w * 0.11;
  const doorAt = [rect.x + rect.w * 0.2, rect.x + rect.w * 0.68];
  const bays = [
    [rect.x + rect.w * 0.05, doorAt[0] - rect.w * 0.02],
    [doorAt[0] + doorW + rect.w * 0.02, doorAt[1] - rect.w * 0.02],
    [doorAt[1] + doorW + rect.w * 0.02, rect.x + rect.w * 0.95],
  ];
  const counts = [1, 3, 1];
  const wy = rect.y + rect.h * 0.14;
  const wh = rect.h * 0.36;
  const out = [];
  bays.forEach(([x0, x1], bi) => {
    const gap = (x1 - x0) / counts[bi];
    for (let i = 0; i < counts[bi]; i += 1) {
      const ww = gap * 0.78;
      const wx = x0 + i * gap + (gap - ww) / 2;
      out.push({ x: mirrorX(wx + ww), y: wy - Y0, w: ww, h: wh });
    }
  });
  doorAt.forEach((dx) => [0, 1].forEach((i) => {
    const leaf = doorW / 2;
    const lx = dx + i * leaf + leaf * 0.2;
    out.push({ x: mirrorX(lx + leaf * 0.6), y: rect.y + rect.h * 0.16 - Y0, w: leaf * 0.6, h: rect.h * 0.36 });
  }));
  return out;
}

/** The cab's spectacle window, where the driver would be (box units). */
export const CAB_WINDOW = Object.freeze({ x: mirrorX(2584), y: 352 - Y0, w: 60, h: 44 });

const NAVY = PAL.navy;
const IVORY = PAL.ink;

/**
 * The train body (no wheels) in one state, painted into `c` with its box at
 * (0, 0): 'pencil' (Rosa's under-drawing), 'paint' (wet gouache), 'ink'
 * (dried into Chapter 1's ink: navy body, ivory lines, lit windows).
 */
export function paintTrainBody(c, mode = 'paint') {
  const art = trainArt(c);
  const S = art.S;
  const at = (canvas, x, y, alpha = 1) => {
    c.save();
    c.globalAlpha *= alpha;
    c.drawImage(canvas, x - X0, y - Y0, canvas.width / S, canvas.height / S);
    c.restore();
  };
  c.save();
  c.translate(TRAIN_BOX.w, 0);
  c.scale(-1, 1);
  const parts = TRAIN_ORDER.map((id) => [id, art.parts[id]]);
  if (mode === 'ink') {
    at(once('ink-paper', () => tinted(art.paper.canvas, NAVY), c), art.paper.x, art.paper.y);
    at(once('ink-chassis', () => recolor(art.chassis.pencil, IVORY), c), art.chassis.x, art.chassis.y, 0.75);
    parts.forEach(([id, part]) => {
      const tone = mix(css(trainTint(PIGMENT[id])), NAVY, 0.68);
      at(once(`ink-wash-${id}`, () => tinted(part.wash, tone), c), part.x, part.y, 0.9);
    });
  } else {
    at(art.paper.canvas, art.paper.x, art.paper.y);
    at(art.chassis.pencil, art.chassis.x, art.chassis.y, mode === 'pencil' ? 0.85 : 1);
    if (mode === 'paint') {
      parts.forEach(([id, part]) => {
        const tone = css(trainTint(PIGMENT[id]));
        at(once(`wash-${id}`, () => tinted(part.wash, tone), c), part.x, part.y, TRAIN_WASH_ALPHA.body);
        at(once(`edge-${id}`, () => tinted(part.edge, tone), c), part.x, part.y, TRAIN_WASH_ALPHA.edge);
      });
    }
  }
  c.restore();
  if (mode === 'ink') {
    // the windows lit from inside: the night service's lamplight
    [...trainWindows(), CAB_WINDOW].forEach((win) => {
      c.fillStyle = 'rgba(255, 196, 112, 0.92)';
      c.fillRect(win.x - win.w + 1, win.y + 1, win.w - 2, win.h - 2);
      c.fillStyle = 'rgba(255, 236, 190, 0.5)';
      c.fillRect(win.x - win.w + 2, win.y + 2, win.w * 0.3, win.h - 4);
    });
  }
  c.save();
  c.translate(TRAIN_BOX.w, 0);
  c.scale(-1, 1);
  parts.forEach(([id, part]) => {
    if (mode === 'ink') at(once(`ink-pencil-${id}`, () => recolor(part.pencil, IVORY), c), part.x, part.y, 0.9);
    else at(part.pencil, part.x, part.y, mode === 'pencil' ? 0.8 : 1);
  });
  c.restore();
}

/** The four wheels, live: `spin` radians, in the train's box units. */
export function drawTrainWheels(c, mode = 'paint', spin = 0) {
  const art = trainArt(c);
  const wheel = art.wheel;
  const size = wheel.size;
  const green = css(trainTint(PIGMENT.green));
  const layers = mode === 'ink'
    ? [[once('ink-wheel-wash', () => tinted(wheel.wash, mix(green, NAVY, 0.7)), c), 0.9], [once('ink-wheel-pencil', () => recolor(wheel.pencil, IVORY), c), 0.9]]
    : mode === 'paint'
      ? [[once('wheel-wash', () => tinted(wheel.wash, green), c), TRAIN_WASH_ALPHA.body], [once('wheel-edge', () => tinted(wheel.edge, green), c), TRAIN_WASH_ALPHA.edge], [wheel.pencil, 1]]
      : [[wheel.pencil, 0.8]];
  TRAIN_SPEC.wheels.forEach((w) => {
    c.save();
    c.translate(mirrorX(w.x), w.y - Y0);
    c.rotate(-spin);
    layers.forEach(([canvas, alpha]) => {
      c.globalAlpha = alpha;
      c.drawImage(canvas, -size / 2, -size / 2, size, size);
    });
    c.restore();
  });
}

/** Wheel centres in box units (for drips and sparks). */
export const TRAIN_WHEELS = Object.freeze(TRAIN_SPEC.wheels.map((w) => ({ x: mirrorX(w.x), y: w.y - Y0, r: w.r })));
/** The colour under each stretch of the train (box units, front at the right), for its drips. */
export const TRAIN_COLOURS = Object.freeze([
  { x0: mirrorX(2500), x1: mirrorX(2288), color: '#c95850' },
  { x0: mirrorX(2598), x1: mirrorX(2496), color: '#d98a3a' },
  { x0: mirrorX(2900), x1: mirrorX(2594), color: '#537ca6' },
]);
