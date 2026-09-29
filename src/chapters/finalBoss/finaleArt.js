// Chapter 6 art for Movements I and II, painted with the Chapter 1 and
// Chapter 2 canvas kits so the finale is drawn by the same hand:
//
//   Movement I · LOST PROPERTY: the Chapter 1 carriage wall laid flat as the
//   arena floor, its four Act 1 windows (desk, lockers, window, door) as the
//   2×2 panels, a sepia 1978 copy for the lens, jointed Butch / Conductor
//   figures from art/figures.js, ink seam trains and tagged cases.
//
//   Movement II · BORROWED LIGHT: wet rooftops over a street gap, Chapter 2's
//   procedural figures (drawn through a tiny Phaser-Graphics shim), lamp
//   boxes on poles, billboards and the city skyline.
//
// Everything returns plain canvases; spectacleBattle.js turns them into
// three.js textures. No three.js and no Phaser here.

import { PAL, amberGlint, glow as inkGlow, ink, inkEllipse, inkRect, paperTag, rivet, rng, roundRectPath, sepia, speckle, vgrad, wood, brassFill } from '../nightService/art/ink.js';
import { BEZEL, paintBezel, paintLensRim, paintVignette, paintWall } from '../nightService/art/wallArt.js';
import { drawConductorCar, drawDesk, drawDoor, drawLockers, drawWindow } from '../nightService/art/act1Art.js';
import { drawCarriageScene, drawCityRoom, drawHouse, drawPlatform } from '../nightService/art/act3Art.js';
import { BUTCH_PARTS, CONDUCTOR_PARTS, RES, TRAIN_PARTS } from '../nightService/art/figures.js';
import { PAPER_URL, WORLDS } from '../nightService/worldAssets.js';
import { BUTCH_SPEC, drawFigure } from '../borrowedLight/art/figures.js';
import {
  paintBillboard as paintBillboardKit, paintPuddle as paintPuddleKit, paintSkylineStrip as paintSkylineStripKit, paintWindow, withCanvasOptions,
} from '../borrowedLight/art/paint.js';

const TAU = Math.PI * 2;

// Every finale painting is a CPU (software) canvas. They are painted once and
// only ever read back as texture sources, and on a GPU-accelerated 2D canvas
// the filters, gradients and composites are rasterised later in the GPU
// process, which then stalls the next WebGL call. On software GL (SwiftShader)
// that stall was ~17 s on the first frame after load.
export const FINALE_CANVAS_OPTIONS = Object.freeze({ willReadFrequently: true });

// The Chapter 2 kit's own canvases, made on the same software backing.
const paintBillboard = (...args) => withCanvasOptions(FINALE_CANVAS_OPTIONS, () => paintBillboardKit(...args));
const paintPuddle = (...args) => withCanvasOptions(FINALE_CANVAS_OPTIONS, () => paintPuddleKit(...args));
const paintSkylineStrip = (...args) => withCanvasOptions(FINALE_CANVAS_OPTIONS, () => paintSkylineStripKit(...args));

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  // The first getContext call fixes the context's attributes; later
  // getContext('2d') calls in the art kits get this same software context.
  canvas.getContext('2d', FINALE_CANVAS_OPTIONS);
  return canvas;
}

function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

// Paper grain and the night-fields panorama the Act 1 window looks out on.
export async function loadFinaleArtSources({ worlds = ['fields'] } = {}) {
  const chunks = worlds.flatMap((name) => WORLDS[name]?.chunks ?? []);
  const [paper, ...loaded] = await Promise.all([loadImage(PAPER_URL), ...chunks.map((chunk) => loadImage(chunk.url))]);
  // Chapter 1 paintings crop the panoramas by their texture keys (nsv-w07-0 ...).
  const images = Object.fromEntries(chunks.map((chunk, index) => [chunk.key, loaded[index]]).filter(([, image]) => image));
  const fields = WORLDS.fields.chunks.map((chunk) => images[chunk.key]).filter(Boolean);
  return { paper, fields, images };
}

// ---------------------------------------------------------------------------
// A canvas stand-in for the Chapter 1 painter context (nightService/
// painter.js): static paint, sprites and glows are composited straight into
// one panel canvas; live pieces (dust, rain, animators) are dropped.

function panelContext(canvas, underlay, { w, h, era, paper, fields, images = {}, hide = [] }) {
  // Two layers, as in Phaser: live fields sit under the painted canvas, whose
  // window holes are cut with destination-out.
  const c = canvas.getContext('2d');
  const u = underlay.getContext('2d');
  const stub = new Proxy(() => stub, { get: (_, key) => (key === 'then' ? undefined : stub) });
  const hexColor = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  return {
    w, h, era, palette: PAL, animators: [], model: null,
    add: () => stub,
    reduceMotion: () => true,
    flag: () => false,
    item: () => false,
    animate: () => stub,
    dust: () => stub,
    rain: () => stub,
    image: () => stub,
    text: () => stub,
    paint(key, fn) {
      c.save();
      fn(c, { w, h, era, paper, images, bleed: 0 });
      c.restore();
      return stub;
    },
    sprite(key, sw, sh, fn, x, y, { origin = [0.5, 0.5], angle = 0, alpha = 1 } = {}) {
      if (hide.includes(key)) return stub;
      const part = makeCanvas(sw * RES, sh * RES);
      const pc = part.getContext('2d');
      pc.scale(RES, RES);
      fn(pc, { era });
      c.save();
      c.globalAlpha = alpha;
      c.translate(x, y);
      c.rotate(angle);
      c.drawImage(part, -origin[0] * sw, -origin[1] * sh, sw, sh);
      c.restore();
      return stub;
    },
    glow(x, y, size, { color = 0xffc070, alpha = 0.3 } = {}) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y, 0, x, y, size / 2);
      g.addColorStop(0, hexColor(color, alpha));
      g.addColorStop(0.35, hexColor(color, alpha * 0.45));
      g.addColorStop(1, hexColor(color, 0));
      c.fillStyle = g;
      c.fillRect(x - size / 2, y - size / 2, size, size);
      c.restore();
      return stub;
    },
    fields(x, y, fw, fh, { crop = 0.62, zoom = 1.35, offset = 0 } = {}) {
      const image = fields?.[0];
      if (!image) {
        u.fillStyle = vgrad(u, y, y + fh, [[0, '#0c1624'], [1, '#1b2a2e']]);
        u.fillRect(x, y, fw, fh);
        return stub;
      }
      const scale = (fh / image.height) * zoom;
      const visibleH = fh / scale;
      const sy = (image.height - visibleH) * crop;
      const sx = (offset / scale) % Math.max(1, image.width - fw / scale);
      u.save();
      if (era === 'past') u.filter = 'sepia(0.9) saturate(1.2) brightness(1.1)';
      u.drawImage(image, sx, sy, fw / scale, visibleH, x, y, fw, fh);
      u.restore();
      return stub;
    },
  };
}

// Paint one Chapter 1 panel (SceneDef.draw) at its native size.
export function paintChapterOnePanel(draw, { w = 820, h = 468, era = 'present', paper = null, fields = [], images = {}, hide = [] } = {}) {
  const top = makeCanvas(w, h);
  const under = makeCanvas(w, h);
  draw(panelContext(top, under, { w, h, era, paper, fields, images, hide }));
  const c = under.getContext('2d');
  c.drawImage(top, 0, 0);
  paintVignette(c, w, h);
  if (era === 'past') sepia(c);
  return under;
}

// ---------------------------------------------------------------------------
// Movement I floor. World → canvas: u = (x - x0) * S, v = (z - z0) * S
// (canvas row 0 is the far edge, toward the Conductor).

export const LOST_FLOOR = Object.freeze({ x0: -15, x1: 15, z0: -9, z1: 10, S: 80 });

const floorPx = (x, z) => [(x - LOST_FLOOR.x0) * LOST_FLOOR.S, (z - LOST_FLOOR.z0) * LOST_FLOOR.S];

export function lostFloorLayout({ arena, seams }) {
  const S = LOST_FLOOR.S;
  const W = (LOST_FLOOR.x1 - LOST_FLOOR.x0) * S;
  const H = (LOST_FLOOR.z1 - LOST_FLOOR.z0) * S;
  const [left, top] = floorPx(arena.minX, arena.minZ);
  const [right, bottom] = floorPx(arena.maxX, arena.maxZ);
  const [seamX, seamZ] = floorPx(seams.x, seams.z);
  const gutter = seams.halfWidth * 2 * S;
  const cols = [[left, seamX - gutter / 2], [seamX + gutter / 2, right]];
  const rows = [[top, seamZ - gutter / 2], [seamZ + gutter / 2, bottom]];
  const slots = [];
  rows.forEach(([y0, y1], row) => cols.forEach(([x0, x1], col) => slots.push({ index: row * 2 + col, col, row, x: x0, y: y0, w: x1 - x0, h: y1 - y0 })));
  return { view: { w: W, h: H }, cols: 2, rows: 2, gutter, x: left, y: top, w: right - left, h: bottom - top, slots, tileW: slots[0].w, tileH: slots[0].h };
}

const ACT1_PANELS = [drawDesk, drawLockers, drawWindow, (ctx) => drawDoor(ctx, 'open')];

// The ink.js sepia() pass, in horizontal strips so a 2400 px floor can be
// toned across several short tasks. Sepia, saturate, contrast and brightness
// are per-pixel filters, so strips give exactly the same pixels.
function* sepiaStrips(c, { amount = 1, warmth = 0.17, strips = 4 } = {}) {
  const canvas = c.canvas;
  const tmp = makeCanvas(canvas.width, canvas.height);
  tmp.getContext('2d').drawImage(canvas, 0, 0);
  const band = Math.ceil(canvas.height / strips);
  for (let y = 0; y < canvas.height; y += band) {
    const h = Math.min(band, canvas.height - y);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, y, canvas.width, h);
    c.filter = `sepia(${amount}) saturate(1.35) contrast(0.92) brightness(1.24)`;
    c.drawImage(tmp, 0, y, canvas.width, h, 0, y, canvas.width, h);
    c.filter = 'none';
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgba(255, 200, 130, ${warmth})`;
    c.fillRect(0, y, canvas.width, h);
    c.restore();
    yield;
  }
}

// Paint the Movement I floor one piece at a time: each `yield` is a point
// where the caller may hand the main thread back (see spectacleBattle.js
// runSliced). The generator's return value is { canvas, layout }.
export function* lostPropertyFloorSteps({ arena, seams, era = 'present', paper = null, fields = [] }) {
  const layout = lostFloorLayout({ arena, seams });
  const canvas = makeCanvas(layout.view.w, layout.view.h);
  const c = canvas.getContext('2d');
  paintWall(c, layout, { paper });
  yield;
  for (const [index, slot] of layout.slots.entries()) {
    const panel = paintChapterOnePanel(ACT1_PANELS[index], { era, paper, fields });
    c.drawImage(panel, slot.x, slot.y, slot.w, slot.h);
    const bezel = makeCanvas(slot.w + BEZEL * 2, slot.h + BEZEL * 2);
    paintBezel(bezel.getContext('2d'), slot.w, slot.h);
    c.drawImage(bezel, slot.x - BEZEL, slot.y - BEZEL);
    yield;
  }
  // The seams are the Conductor's rails: two brass rails and sleepers in
  // each gutter, so a train running there reads as running on track.
  const railPaint = (x0, y0, x1, y1) => {
    const horizontal = Math.abs(y1 - y0) < Math.abs(x1 - x0);
    const gutter = layout.gutter;
    c.save();
    c.fillStyle = 'rgba(8, 5, 3, 0.85)';
    if (horizontal) c.fillRect(x0, y0 - gutter * 0.36, x1 - x0, gutter * 0.72);
    else c.fillRect(x0 - gutter * 0.36, y0, gutter * 0.72, y1 - y0);
    const length = horizontal ? x1 - x0 : y1 - y0;
    for (let t = 8; t < length; t += 26) {
      c.fillStyle = '#3a2517';
      if (horizontal) c.fillRect(x0 + t, y0 - gutter * 0.3, 9, gutter * 0.6);
      else c.fillRect(x0 - gutter * 0.3, y0 + t, gutter * 0.6, 9);
    }
    [-0.2, 0.2].forEach((k) => {
      c.fillStyle = horizontal ? brassFill(c, x0, y0 + gutter * k - 2, length, 4) : brassFill(c, x0 + gutter * k - 2, y0, 4, length);
      if (horizontal) c.fillRect(x0, y0 + gutter * k - 2, length, 4);
      else c.fillRect(x0 + gutter * k - 2, y0, 4, length);
    });
    c.restore();
  };
  const [, seamY] = floorPx(0, seams.z);
  const [seamXpx] = floorPx(seams.x, 0);
  railPaint(layout.x - 30, seamY, layout.x + layout.w + 30, seamY);
  railPaint(seamXpx, layout.y - 30, seamXpx, layout.y + layout.h + 30);
  if (era === 'past') yield* sepiaStrips(c, { amount: 1, warmth: 0.12 });
  return { canvas, layout };
}

export function paintLostPropertyFloor(options) {
  const steps = lostPropertyFloorSteps(options);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

// A big framed copy of the Conductor's own car (Act 1's last panel) for the
// back of the arena.
export function paintConductorCarBackdrop({ era = 'present', paper = null, fields = [] } = {}) {
  const w = 1100;
  const h = 620;
  const panel = paintChapterOnePanel(drawConductorCar, { w, h, era, paper, fields });
  const canvas = makeCanvas(w + BEZEL * 2 + 60, h + BEZEL * 2 + 60);
  const c = canvas.getContext('2d');
  wood(c, 0, 0, canvas.width, canvas.height, { base: PAL.walnut, seed: 404, vertical: true });
  c.drawImage(panel, 30 + BEZEL, 30 + BEZEL);
  const bezel = makeCanvas(w + BEZEL * 2, h + BEZEL * 2);
  paintBezel(bezel.getContext('2d'), w, h);
  c.drawImage(bezel, 30, 30);
  for (let x = 20; x < canvas.width; x += 60) { rivet(c, x, 12, 3.2); rivet(c, x, canvas.height - 12, 3.2); }
  return canvas;
}

// The lens rim, the Chapter 1 torn-paper ring with a brass edge.
export function paintLensRimCanvas(r = 140) {
  const size = (r + 26) * 2;
  const canvas = makeCanvas(size, size);
  paintLensRim(canvas.getContext('2d'), r);
  return canvas;
}

// ---------------------------------------------------------------------------
// Jointed Chapter 1 figures, composed into single frames.

const partCache = new Map();
function partCanvas(prefix, parts, name) {
  const key = `${prefix}:${name}`;
  if (partCache.has(key)) return partCache.get(key);
  const part = parts[name];
  const canvas = makeCanvas(part.w * RES, part.h * RES);
  const c = canvas.getContext('2d');
  c.scale(RES, RES);
  part.paint(c);
  partCache.set(key, canvas);
  return canvas;
}

function drawPart(c, prefix, parts, name, x, y, rotation = 0, { dim = 0 } = {}) {
  const part = parts[name];
  c.save();
  c.translate(x, y);
  c.rotate(rotation);
  if (dim) c.filter = `brightness(${1 - dim})`;
  c.drawImage(partCanvas(prefix, parts, name), -part.pivot[0], -part.pivot[1], part.w, part.h);
  c.restore();
}

// pose: idle | walk (phase 0..1) | punch | hurt | case (carrying)
export function paintInkButch({ pose = 'idle', phase = 0, scale = 6, lampGlow = true } = {}) {
  const P = BUTCH_PARTS;
  const W = 64;
  const H = 86;
  const canvas = makeCanvas(W * scale, H * scale);
  const c = canvas.getContext('2d');
  c.scale(scale, scale);
  c.translate(W / 2, H - 4);
  const hipY = -30;
  let legF = 0.04; let kneeF = 0; let legB = -0.04; let kneeB = 0;
  let armF = 0.05; let armB = -0.05; let bodyY = 0; let torso = 0; let head = 0;
  if (pose === 'walk') {
    const a = phase * TAU;
    const s = Math.sin(a);
    const cc = Math.cos(a);
    bodyY = -Math.abs(cc) * 1.8;
    legF = s * 0.5; kneeF = Math.max(0, -Math.sin(a + 0.9)) * 0.75;
    legB = -s * 0.5; kneeB = Math.max(0, Math.sin(a + 0.9)) * 0.75;
    armF = -s * 0.45; armB = s * 0.45; torso = 0.06; head = 0.03;
  } else if (pose === 'punch') {
    legF = 0.35; legB = -0.3; kneeB = 0.2; armF = -1.62; armB = 0.4; torso = 0.14; head = 0.08;
  } else if (pose === 'hurt') {
    legF = -0.2; legB = 0.25; kneeF = 0.4; armF = 0.9; armB = 1.1; torso = -0.22; head = -0.25; bodyY = 1.5;
  } else if (pose === 'case') {
    armF = -1.15; armB = -1.0;
  }
  // soft lamp glow and floor shadow
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(0, 0, 17, 3, 0, 0, TAU); c.fill();
  c.restore();
  if (lampGlow) inkGlow(c, 9, -24 + bodyY, 34, 'rgba(255, 190, 110, 0.9)', 0.35);
  c.translate(0, bodyY);
  const leg = (x, thigh, knee, dim) => {
    c.save();
    c.translate(x, hipY);
    c.rotate(thigh);
    drawPart(c, 'b', P, 'thigh', 0, 0, 0, { dim });
    c.translate(0, 14);
    c.rotate(knee);
    drawPart(c, 'b', P, 'shin', 0, 0, 0, { dim });
    c.restore();
  };
  drawPart(c, 'b', P, 'arm', -3, -52, armB, { dim: 0.25 });
  leg(-2.5, legB, kneeB, 0.22);
  leg(2.5, legF, kneeF, 0);
  drawPart(c, 'b', P, 'torso', 0, hipY + 11, torso);
  drawPart(c, 'b', P, 'head', 1, -54, head);
  if (pose === 'case') drawPart(c, 'b', P, 'case', 8, -34);
  drawPart(c, 'b', P, 'arm', 3, -52, armF);
  drawPart(c, 'b', P, 'lamp', 9, -30, pose === 'walk' ? -Math.sin(phase * TAU) * 0.3 : 0);
  return canvas;
}

export function paintInkConductor({ scale = 6, lantern = true, era = 'present' } = {}) {
  const P = CONDUCTOR_PARTS;
  const W = 80;
  const H = 124;
  const canvas = makeCanvas(W * scale, H * scale);
  const c = canvas.getContext('2d');
  c.scale(scale, scale);
  c.translate(W / 2, H - 4);
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath(); c.ellipse(0, 0, 25, 4, 0, 0, TAU); c.fill();
  if (lantern) inkGlow(c, -12, -38, 70, 'rgba(255, 184, 96, 0.95)', 0.42);
  c.save(); c.translate(-8, -76); c.rotate(0.08);
  drawPart(c, 'c', P, 'arm', 0, 0, 0, { dim: 0.28 });
  drawPart(c, 'c', P, 'lantern', 0, 35, -0.06);
  c.restore();
  drawPart(c, 'c', P, 'legs', 0, -15);
  drawPart(c, 'c', P, 'torso', 0, -12);
  drawPart(c, 'c', P, 'head', 1, -80);
  c.save(); c.translate(9, -76); c.rotate(-0.7);
  drawPart(c, 'c', P, 'arm', 0, 0);
  drawPart(c, 'c', P, 'punch', 0, 34);
  c.restore();
  if (era === 'past') sepia(c);
  return canvas;
}

// Seam trains. Side view for trains along the horizontal seam; a front view
// (headlamp and cab) for trains running toward or away from the camera.
export function paintInkTrain({ era = 'present', scale = 7 } = {}) {
  const part = TRAIN_PARTS.body;
  const canvas = makeCanvas(part.w * scale, (part.h + 6) * scale);
  const c = canvas.getContext('2d');
  c.scale(scale, scale);
  part.paint(c);
  inkGlow(c, 146, 18, 40, 'rgba(255, 216, 144, 0.95)', era === 'past' ? 0.25 : 0.5);
  if (era === 'past') sepia(c, { amount: 1, warmth: 0.24 });
  return canvas;
}

export function paintInkTrainFront({ era = 'present', scale = 7 } = {}) {
  const w = 60;
  const h = 64;
  const canvas = makeCanvas(w * scale, h * scale);
  const c = canvas.getContext('2d');
  c.scale(scale, scale);
  c.fillStyle = PAL.oxblood;
  roundRectPath(c, 6, 12, 48, 44, 8); c.fill();
  c.fillStyle = '#2a2f3a';
  roundRectPath(c, 10, 4, 40, 14, 6); c.fill();
  c.fillStyle = '#ffd98a';
  c.fillRect(14, 18, 13, 11); c.fillRect(33, 18, 13, 11);
  c.fillStyle = 'rgba(30,22,16,0.85)';
  c.beginPath(); c.arc(38.5, 23, 2.2, 0, TAU); c.fill(); c.fillRect(35, 25, 7, 3);
  c.fillStyle = PAL.brass;
  c.fillRect(8, 36, 44, 3);
  c.fillStyle = '#fff1c8';
  c.beginPath(); c.arc(30, 45, 5.2, 0, TAU); c.fill();
  inkGlow(c, 30, 45, 34, 'rgba(255, 216, 144, 0.95)', era === 'past' ? 0.3 : 0.6);
  c.fillStyle = '#0d0f14';
  c.fillRect(8, 56, 44, 6);
  ink(c, [[6, 20], [6, 56], [54, 56], [54, 20]], { w: 1.4, bleed: false });
  ink(c, [[10, 12], [14, 4], [46, 4], [50, 12]], { w: 1.4, bleed: false });
  inkEllipse(c, 30, 45, 5.2, 5.2, { w: 1.1, bleed: false });
  // cow-catcher
  c.fillStyle = '#20252f';
  c.beginPath(); c.moveTo(8, 62); c.lineTo(52, 62); c.lineTo(46, 64); c.lineTo(14, 64); c.closePath(); c.fill();
  if (era === 'past') sepia(c, { amount: 1, warmth: 0.24 });
  return canvas;
}

// A lost-property case with its paper tag. The present tag is blank (typed
// lines and the amber glint); the 1978 tag carries the claim name.
export function paintClaimCase({ era = 'present', claim = '', seed = 1, tone = '#6d4a2c' } = {}) {
  const S = 5;
  const w = 84;
  const h = 58;
  const canvas = makeCanvas(w * S, h * S);
  const c = canvas.getContext('2d');
  c.scale(S, S);
  const random = rng(seed);
  // case body
  c.fillStyle = tone;
  roundRectPath(c, 4, 16, 44, 30, 3); c.fill();
  c.fillStyle = 'rgba(255, 220, 170, 0.12)'; c.fillRect(5, 17, 42, 6);
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(5, 38, 42, 7);
  c.fillStyle = PAL.brass;
  c.fillRect(11, 16, 4, 30); c.fillRect(37, 16, 4, 30);
  c.fillRect(20, 11, 12, 3); c.fillRect(20, 11, 2, 6); c.fillRect(30, 11, 2, 6);
  c.fillStyle = PAL.brassLight; c.fillRect(23, 20, 6, 4);
  speckle(c, 4, 16, 44, 30, { count: 90, color: 'rgba(30,18,10,0.2)', size: 1.2, seed });
  ink(c, [[4, 16], [48, 16], [48, 46], [4, 46]], { w: 1.3, closed: true, bleed: false, jitter: 0.2, seed });
  ink(c, [[20, 16], [21, 11], [31, 11], [32, 16]], { w: 1.1, bleed: false, jitter: 0.1, seed: seed + 1 });
  // tag on a string from the handle
  const tx = 44 + random() * 2;
  const ty = 26;
  paperTag(c, tx, ty, { angle: -0.35, scale: 1.45, glint: era !== 'past', string: [30, 13], seed: seed + 4 });
  if (era === 'past') {
    sepia(c, { amount: 1, warmth: 0.18 });
    // the claim name is written, not typed: legible through the lens
    c.save();
    c.translate(tx, ty);
    c.rotate(-0.35);
    c.fillStyle = 'rgba(60, 30, 18, 0.95)';
    c.font = '700 4.4px "Space Mono", monospace';
    const [first, second] = claim.split('·').map((part) => part.trim());
    c.fillText(first ?? '', 10.5, -1.2);
    c.font = 'italic 700 4.2px Georgia, serif';
    c.fillText(second ?? '', 10.5, 3.8);
    c.restore();
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Movement II · BORROWED LIGHT

// A tiny Phaser-Graphics → Canvas2D shim, enough for drawFigure().
function graphicsShim(c) {
  const rgba = (n, a = 1) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  const g = {
    fillStyle(color, alpha = 1) { c.fillStyle = rgba(color, alpha); return g; },
    lineStyle(width, color, alpha = 1) { c.lineWidth = width; c.strokeStyle = rgba(color, alpha); c.lineCap = 'round'; c.lineJoin = 'round'; return g; },
    beginPath() { c.beginPath(); return g; },
    closePath() { c.closePath(); return g; },
    moveTo(x, y) { c.moveTo(x, y); return g; },
    lineTo(x, y) { c.lineTo(x, y); return g; },
    arc(x, y, r, a0, a1, anticlockwise) { c.arc(x, y, r, a0, a1, anticlockwise); return g; },
    strokePath() { c.stroke(); return g; },
    fillPath() { c.fill(); return g; },
    fillCircle(x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill(); return g; },
    strokeCircle(x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.stroke(); return g; },
    fillEllipse(x, y, w, h) { c.beginPath(); c.ellipse(x, y, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, TAU); c.fill(); return g; },
    fillRect(x, y, w, h) { c.fillRect(x, y, w, h); return g; },
    strokeRect(x, y, w, h) { c.strokeRect(x, y, w, h); return g; },
    fillTriangle(x0, y0, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath(); c.fill(); return g; },
    fillPoints(points, close = true) {
      c.beginPath();
      points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      if (close) c.closePath();
      c.fill();
      return g;
    },
    strokePoints(points, close = false) {
      c.beginPath();
      points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      if (close) c.closePath();
      c.stroke();
      return g;
    },
  };
  return g;
}

export const CONDUCTOR_RAIN_SPEC = Object.freeze({
  height: 132, coat: 0x1f2a3a, coatShade: 0x131a26, trousers: 0x141a24, boots: 0x0c0907,
  skin: 0xcdb592, cap: 0x121a28, capBand: 0xb08a4a, scarf: 0x6b2a22, lamp: true, coatLength: 1.0, build: 1.18,
});

// Chapter 2 figure, feet at the bottom centre. pose: idle | run | jump | punch | hurt
export function paintRainFigure({ spec = BUTCH_SPEC, pose = 'idle', phase = 0, scale = 3, facing = 1, lit = false } = {}) {
  const W = 110;
  const H = spec.height * 1.3 + 20;
  const canvas = makeCanvas(W * scale, H * scale);
  const c = canvas.getContext('2d');
  c.scale(scale, scale);
  const g = graphicsShim(c);
  const drawPose = pose === 'punch' ? 'talk' : pose === 'hurt' ? 'land' : pose;
  if (lit) inkGlow(c, W / 2, H - spec.height * 0.55, spec.height * 1.4, 'rgba(201, 128, 136, 0.9)', 0.35);
  drawFigure(g, spec, { x: W / 2, y: H - 8, facing, pose: drawPose, phase, t: 1.2, rim: spec === BUTCH_SPEC ? 0.7 : 0.32 });
  return canvas;
}

// The Movement II floor, in three pieces: the near roof, the street far
// below in the gap, and the far roof. Lamp pools are painted in (Chapter 2
// lights its roofs with warm pools, not with scene lights).
export const RAIN_FLOOR = Object.freeze({ x0: -15, x1: 15, S: 64 });

export function paintRoofSection({ z0, z1, lanes, lights = [], rim = 'top', seed = 5 }) {
  const { x0, x1, S } = RAIN_FLOOR;
  const W = (x1 - x0) * S;
  const H = (z1 - z0) * S;
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const random = rng(seed);
  const u = (x) => (x - x0) * S;
  const v = (z) => (z - z0) * S;
  c.fillStyle = vgrad(c, 0, H, [[0, '#1f292e'], [1, '#172024']]);
  c.fillRect(0, 0, W, H);
  // roofing felt strips and tar seams
  for (let y = 18 + random() * 20; y < H; y += 54 + random() * 24) {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(0, y, W, 3);
    c.fillStyle = 'rgba(200,214,220,0.05)';
    c.fillRect(0, y + 3, W, 1.5);
  }
  for (let i = 0; i < 90; i += 1) {
    c.fillStyle = `rgba(${150 + random() * 40},${170 + random() * 30},180,${0.025 + random() * 0.04})`;
    c.fillRect(random() * W, random() * H, 40 + random() * 200, 2 + random() * 3);
  }
  speckle(c, 0, 0, W, H, { count: Math.round((W * H) / 900), color: 'rgba(210,224,230,0.06)', size: 2, seed });
  // warm pools under the lamps
  lights.forEach(({ x, z, color = 'rgba(255, 190, 110, 0.9)', r = 3.2, alpha = 0.45 }) => inkGlow(c, u(x), v(z), r * S, color, alpha));
  for (let i = 0; i < 8; i += 1) {
    const puddle = paintPuddle(160 + random() * 200, 20 + random() * 16);
    c.globalAlpha = 0.9;
    c.drawImage(puddle, random() * (W - 320), 30 + random() * Math.max(10, H - 90));
    c.globalAlpha = 1;
  }
  // chalked signal lanes, the rose line's colour
  Object.values(lanes).forEach((x) => {
    c.save();
    c.setLineDash([22, 30]);
    c.strokeStyle = 'rgba(201, 128, 136, 0.42)';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(u(x), rim === 'top' ? 34 : 10); c.lineTo(u(x), rim === 'top' ? H - 10 : H - 34); c.stroke();
    c.restore();
  });
  [-3.5, 3.5].forEach((x) => {
    c.save();
    c.setLineDash([6, 22]);
    c.strokeStyle = 'rgba(234,223,198,0.14)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(u(x), 0); c.lineTo(u(x), H); c.stroke();
    c.restore();
  });
  // the parapet over the gap: a bright ink rim means "you can stand here"
  const edge = rim === 'top' ? 0 : H;
  c.fillStyle = '#2b3438';
  c.fillRect(0, rim === 'top' ? 0 : H - 18, W, 18);
  ink(c, [[-4, rim === 'top' ? 18 : H - 18], [W + 4, rim === 'top' ? 19 : H - 17]], { w: 3.4, alpha: 0.95, jitter: 0.8, bleed: false, seed: seed + 9 });
  ink(c, [[-4, edge + (rim === 'top' ? 2 : -2)], [W + 4, edge + (rim === 'top' ? 3 : -1)]], { w: 1.6, alpha: 0.5, jitter: 0.6, bleed: false, seed: seed + 3 });
  return canvas;
}

// The street far below: wet cobbles, a tram line, shopfronts lit at night.
export function paintStreetBelow({ width = 30, depth = 9, S = 48 } = {}) {
  const W = width * S;
  const H = depth * S;
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const random = rng(33);
  c.fillStyle = vgrad(c, 0, H, [[0, '#0a1013'], [0.5, '#111a1e'], [1, '#0a1013']]);
  c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 10) {
    for (let x = (y / 10) % 2 ? 0 : 6; x < W; x += 13) {
      c.fillStyle = `rgba(${40 + random() * 30},${52 + random() * 30},${58 + random() * 20},0.35)`;
      c.fillRect(x, y, 11, 8);
    }
  }
  [0.42, 0.58].forEach((k) => { c.fillStyle = 'rgba(176, 138, 74, 0.55)'; c.fillRect(0, H * k, W, 3); });
  for (let i = 0; i < 26; i += 1) {
    const x = random() * W;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(240,184,101,0)');
    g.addColorStop(0.5, `rgba(240,184,101,${0.08 + random() * 0.12})`);
    g.addColorStop(1, 'rgba(240,184,101,0)');
    c.fillStyle = g;
    c.fillRect(x, 0, 14 + random() * 30, H);
  }
  for (let i = 0; i < 9; i += 1) {
    const x = random() * W;
    const y = H * (0.2 + random() * 0.6);
    c.fillStyle = ['#2a1d14', '#23434a', '#6b2a22'][i % 3];
    c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(234,223,198,0.35)'; c.lineWidth = 1; c.stroke();
  }
  return canvas;
}

// A facade dropping from a roof edge into the gap.
export function paintGapWall({ width = 30, height = 6, S = 48, seed = 4 } = {}) {
  const W = width * S;
  const H = height * S;
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const random = rng(seed);
  c.fillStyle = vgrad(c, 0, H, [[0, '#262b2d'], [1, '#0c0f10']]);
  c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 12) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y, W, 1.5); }
  for (let x = 30; x < W - 40; x += 70 + random() * 20) {
    for (let y = 30; y < H - 30; y += 62) {
      paintWindow(c, x, y, 26, 36, random, { lit: random() < 0.35, curtain: random() < 0.4, figure: false, warmth: 0.8 });
    }
  }
  const fade = c.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, 'rgba(8,12,14,0)');
  fade.addColorStop(1, 'rgba(8,12,14,0.85)');
  c.fillStyle = fade;
  c.fillRect(0, 0, W, H);
  ink(c, [[-4, 2], [W + 4, 3]], { w: 2.6, alpha: 0.85, jitter: 0.8, bleed: false, seed });
  return canvas;
}

export function paintRainSkyline() {
  const back = paintSkylineStrip({ width: 2048, height: 700, seed: 21, tone: 0.8, windows: 0.08, baseY: 0.3 });
  const front = paintSkylineStrip({ width: 2048, height: 700, seed: 7, tone: 0.3, windows: 0.14, baseY: 0.5 });
  const canvas = makeCanvas(2048, 900);
  const c = canvas.getContext('2d');
  c.fillStyle = vgrad(c, 0, 900, [[0, '#04070a'], [0.6, '#0b1418'], [1, '#101a1e']]);
  c.fillRect(0, 0, 2048, 900);
  // the moon behind cloud, as in Chapter 2
  inkGlow(c, 1500, 190, 420, 'rgba(200, 214, 220, 0.8)', 0.12);
  c.drawImage(back, 0, 80);
  c.drawImage(front, 0, 200);
  return canvas;
}

export function paintBillboardFace(lit) {
  const canvas = paintBillboard(480, 200, 'KEEP MOVING', lit);
  const c = canvas.getContext('2d');
  c.strokeStyle = 'rgba(0,0,0,0.8)';
  c.lineWidth = 8;
  c.strokeRect(0, 0, 480, 200);
  if (lit) {
    c.globalCompositeOperation = 'lighter';
    inkGlow(c, 240, 100, 520, 'rgba(111, 183, 173, 0.6)', 0.18);
  }
  return canvas;
}

// A lamp box on a pole with its paper tag, in one of the three line colours.
export function paintLampNode({ line = 'rose', state = 'idle' } = {}) {
  const colors = { amber: '#e0a24a', teal: '#6fb7ad', rose: '#c98088' };
  const color = colors[line];
  const S = 4;
  const w = 56;
  const h = 96;
  const canvas = makeCanvas(w * S, h * S);
  const c = canvas.getContext('2d');
  c.scale(S, S);
  c.fillStyle = '#1b1e20';
  c.fillRect(18, 26, 4, 68);
  ink(c, [[18, 26], [18, 94]], { w: 0.9, alpha: 0.5, bleed: false });
  c.fillStyle = '#2a2f33';
  roundRectPath(c, 8, 6, 24, 24, 3); c.fill();
  const on = state === 'powering';
  c.fillStyle = on ? color : state === 'queued' ? 'rgba(234,223,198,0.35)' : 'rgba(40,44,46,1)';
  roundRectPath(c, 11, 9, 18, 18, 2); c.fill();
  if (on) inkGlow(c, 20, 18, 60, color, 0.55);
  c.fillStyle = color;
  c.fillRect(8, 30, 24, 3);
  ink(c, [[8, 6], [32, 6], [32, 30], [8, 30]], { w: 1.1, closed: true, bleed: false });
  paperTag(c, 22, 44, { angle: 0.25, scale: 1.25, glint: state === 'idle', punched: state !== 'idle', string: [20, 32], seed: 3 });
  c.fillStyle = color;
  c.fillRect(28, 38, 8, 2);
  return canvas;
}

// A plank bridge that telescopes over the gap (top-down, drawn full length).
export function paintBridgeDeck(lengthPx = 400, widthPx = 150) {
  const canvas = makeCanvas(widthPx, lengthPx);
  const c = canvas.getContext('2d');
  wood(c, 0, 0, widthPx, lengthPx, { base: '#4a3121', seed: 61, vertical: true });
  for (let y = 0; y < lengthPx; y += 22) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y, widthPx, 2); }
  c.fillStyle = brassFill(c, 0, 0, 8, lengthPx);
  c.fillRect(0, 0, 8, lengthPx);
  c.fillRect(widthPx - 8, 0, 8, lengthPx);
  ink(c, [[4, 0], [4, lengthPx]], { w: 2, alpha: 0.9, bleed: false });
  ink(c, [[widthPx - 4, 0], [widthPx - 4, lengthPx]], { w: 2, alpha: 0.9, bleed: false });
  amberGlint(c, widthPx / 2, 14, 6, 0.8);
  return canvas;
}

// ---------------------------------------------------------------------------
// The true ending: Chapter 1 Act 3's windows, framed in a brass bezel.
// beat: carriage | city | platform | door

export const ENDING_PANEL = Object.freeze({ w: 900, h: 512 });

function orchardCaseOnStep(c, x, y, s = 1, { tagText = '' } = {}) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath(); c.ellipse(26, 36, 34, 6, 0, 0, TAU); c.fill();
  c.fillStyle = '#6d4a2c';
  roundRectPath(c, 0, 4, 52, 32, 4); c.fill();
  c.fillStyle = 'rgba(255, 220, 170, 0.14)'; c.fillRect(1, 5, 50, 6);
  c.fillStyle = PAL.brass; c.fillRect(11, 4, 5, 32); c.fillRect(37, 4, 5, 32); c.fillRect(20, -2, 12, 5);
  ink(c, [[0, 4], [52, 4], [52, 36], [0, 36]], { w: 1.4, closed: true, bleed: false, jitter: 0.2 });
  paperTag(c, 48, 18, { angle: 0.35, scale: 1.3, glint: true, string: [34, 2], seed: 7 });
  if (tagText) {
    c.save(); c.translate(48, 18); c.rotate(0.35);
    c.fillStyle = 'rgba(60, 30, 18, 0.95)'; c.font = '700 4.2px "Space Mono", monospace';
    c.fillText(tagText, 11, 1.8);
    c.restore();
  }
  c.restore();
}

export function paintEndingPanel(beat, sources) {
  const { w, h } = ENDING_PANEL;
  const draw = { carriage: drawCarriageScene, city: drawCityRoom, platform: drawPlatform, door: drawHouse }[beat] ?? drawCarriageScene;
  const panel = paintChapterOnePanel(draw, { w, h, era: beat === 'city' ? 'past' : 'present', hide: ['act3-bench-case'], ...sources });
  const c = panel.getContext('2d');
  if (beat === 'platform') {
    // Butch, off the train at Bellwether, the orchard case in his arms
    const butch = paintInkButch({ pose: 'case', scale: 3 });
    c.drawImage(butch, w * 0.56, h * 0.745 - butch.height * 0.62 + 6, butch.width * 0.62, butch.height * 0.62);
  }
  if (beat === 'door') {
    // Rosa's door: the orchard house's porch in the foreground (clapboard,
    // a lamp, the door standing open on a lit hall), the case on the step.
    const stepY = h * 0.82;
    const wx = w * 0.5;
    c.save();
    c.fillStyle = 'rgba(8, 6, 5, 0.35)';
    c.fillRect(0, 0, wx, h);
    c.restore();
    wood(c, wx, h * 0.06, w - wx + 10, stepY - h * 0.06, { base: '#4a3a2c', seed: 91, vertical: false, grain: 'rgba(0,0,0,0.3)' });
    for (let y = h * 0.06; y < stepY; y += 18) { c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(wx, y, w - wx + 10, 2); }
    ink(c, [[wx, h * 0.06], [wx, stepY]], { w: 2.6 });
    const dx = w * 0.62;
    const dw = w * 0.2;
    const dy = h * 0.26;
    c.fillStyle = vgrad(c, dy, stepY, [[0, '#ffe0a8'], [1, '#e0a24a']]);
    c.fillRect(dx, dy, dw, stepY - dy);
    // the hall inside: a coat hook and the stair rail, in warm ink
    ink(c, [[dx + dw * 0.72, dy + 20], [dx + dw * 0.72, stepY - 8]], { w: 2, color: 'rgba(120, 70, 30, 0.6)', bleed: false });
    ink(c, [[dx + dw * 0.72, dy + 60], [dx + dw, dy + 20]], { w: 2, color: 'rgba(120, 70, 30, 0.6)', bleed: false });
    // the open door leaf
    c.fillStyle = '#2a1d14';
    c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx + dw * 0.28, dy + 10); c.lineTo(dx + dw * 0.28, stepY - 6); c.lineTo(dx, stepY); c.closePath(); c.fill();
    ink(c, [[dx, dy], [dx + dw * 0.28, dy + 10], [dx + dw * 0.28, stepY - 6], [dx, stepY]], { w: 1.8, closed: true });
    c.fillStyle = PAL.brassLight; c.beginPath(); c.arc(dx + dw * 0.23, dy + (stepY - dy) * 0.55, 3, 0, TAU); c.fill();
    wood(c, dx - 12, dy - 14, dw + 24, 14, { base: '#5a3a22', seed: 92 });
    ink(c, [[dx - 12, dy - 14], [dx + dw + 12, dy - 14], [dx + dw + 12, dy], [dx - 12, dy]], { w: 2, closed: true });
    ink(c, [[dx, dy], [dx, stepY], [dx + dw, stepY], [dx + dw, dy]], { w: 2.4 });
    // a porch lamp
    const lx = dx + dw + 34;
    c.fillStyle = PAL.brassDark; c.fillRect(lx - 4, dy - 8, 8, 14);
    c.fillStyle = '#ffe3a8'; roundRectPath(c, lx - 9, dy + 6, 18, 24, 3); c.fill();
    ink(c, [[lx - 9, dy + 6], [lx + 9, dy + 6], [lx + 9, dy + 30], [lx - 9, dy + 30]], { w: 1.4, closed: true });
    inkGlow(c, lx, dy + 18, 200, 'rgba(255, 196, 110, 0.9)', 0.45);
    inkGlow(c, dx + dw * 0.5, stepY - 20, 420, 'rgba(255, 196, 110, 0.9)', 0.32);
    // the step, and the case left on it
    c.fillStyle = vgrad(c, stepY, h, [[0, '#5a5244'], [1, '#262219']]);
    c.fillRect(-10, stepY, w + 20, h - stepY + 10);
    ink(c, [[-4, stepY], [w + 4, stepY]], { w: 2.4, alpha: 0.9 });
    orchardCaseOnStep(c, dx - w * 0.2, stepY - 36, 2.2, { tagText: 'R. VELEZ' });
    // a hawthorn by the lane, Mara's mark
    ink(c, [[w * 0.12, stepY], [w * 0.14, h * 0.55], [w * 0.2, h * 0.42]], { w: 3.2, color: '#2a2016', bleed: false });
    for (let i = 0; i < 30; i += 1) {
      const a = (i / 30) * TAU;
      c.fillStyle = i % 3 ? 'rgba(90, 120, 70, 0.85)' : 'rgba(240, 228, 210, 0.9)';
      c.beginPath(); c.arc(w * 0.17 + Math.cos(a) * 52 * (0.35 + (i % 5) / 6), h * 0.45 + Math.sin(a) * 36 * (0.35 + (i % 4) / 5), 5, 0, TAU); c.fill();
    }
  }
  const framed = makeCanvas(w + BEZEL * 2, h + BEZEL * 2);
  const fc = framed.getContext('2d');
  fc.drawImage(panel, BEZEL, BEZEL);
  // the bezel punches its own window hole, so it is painted on its own sheet
  const bezel = makeCanvas(w + BEZEL * 2, h + BEZEL * 2);
  paintBezel(bezel.getContext('2d'), w, h);
  fc.drawImage(bezel, 0, 0);
  return framed;
}
