// The painted title scene (round 10): George's carriage, and the night going
// by behind its glass. Layout: titlePaintedLayout.js; motion: titlePlate.js
// (frameState), shared with the round-6 procedural painter (titlePlateArt.js),
// whose contract this module keeps: paintScene({ L, k, cfg, canvases, root })
// paints the still layers for one screen size and returns drawFrame(state).
//
//   outside  behind the big window's keyed glass: the sky (still), the far
//            hills (slow), the hedgerows and orchards (faster), the
//            embankment, telegraph poles with their wires and the trackside
//            lamps (fastest), the rain; swaying with the carriage
//   room     the carriage plate, the next carriage behind the end door's
//            glass, beads of rain on the big window; on narrow screens the
//            crop of the window and Butch in Chapter 1's brass bezel
//   fx       the passing lamp's band (the lit twin of the carriage, revealed
//            through it), the flicker of Butch's lamp and the pendant
//
// loadPlates() fetches the plates once; paintScene() is synchronous after it.

import { assetUrl } from '../shared/assetUrl.js';
import { glow, rng, roundRectPath } from '../chapters/nightService/art/ink.js';
import { CHROME_TEXTURES, brassFrame } from '../chapters/nightService/art/wallArt.js';
import { GLASS_MARGIN, LAMP_EVERY, lampWorldX } from './titlePlate.js';
import { TITLE_GEOMETRY, TITLE_PLATES } from './titlePlates.generated.js';

const TAU = Math.PI * 2;
/** The view outside is painted at this fraction of the room's resolution (it is soft behind wet glass). */
const OUTSIDE_SCALE = 0.72;
/** Where the outside layers sit, as fractions of the glass height (their source pictures are 1024 tall). */
const LAYER_HEIGHT = 1;
/**
 * The poles' feet are this far down (glass heights, below the sill); they are as tall as puts their
 * crossarm, and the wires, at `wires` down the glass. The lamps stand `h` tall, their heads below the title.
 */
const POLE = Object.freeze({ foot: 1.08, wires: 0.32 });
const LAMP = Object.freeze({ h: 0.86, foot: 1.08 });

const images = {};
let loading = null;

function load(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`[title] plate failed: ${src}`));
    img.src = assetUrl(src);
  });
}

/** Fetch every plate (and the bezel atlas) once. */
export function loadPlates(plates = TITLE_PLATES) {
  if (!loading) {
    const jobs = Object.entries(plates).map(([name, p]) => load(p.src).then((img) => { images[name] = img; }));
    jobs.push(load(CHROME_TEXTURES.bezel.url).then((img) => { images.bezel = img; }).catch(() => { images.bezel = null; }));
    loading = Promise.all(jobs).catch((error) => { loading = null; throw error; });
  }
  return loading;
}

function canvasOf(w, h) {
  const element = document.createElement('canvas');
  element.width = Math.max(1, Math.ceil(w));
  element.height = Math.max(1, Math.ceil(h));
  return element;
}

function paintRainTile(size, k, density, seed, { min = 10, max = 46, alpha = 0.22, width = 1 } = {}) {
  const element = canvasOf(size * k, size * k);
  const c = element.getContext('2d');
  c.setTransform(k, 0, 0, k, 0, 0);
  const random = rng(seed);
  c.lineCap = 'round';
  const count = Math.round(130 * density);
  for (let i = 0; i < count; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const len = min + random() * (max - min);
    const dx = -len * 0.42;
    c.strokeStyle = `rgba(228, 230, 222, ${0.04 + random() * alpha})`;
    c.lineWidth = (0.6 + random() * 0.8) * width;
    for (const ox of [0, size, -size]) {
      for (const oy of [0, -size]) {
        c.beginPath(); c.moveTo(x + ox, y + oy); c.lineTo(x + ox + dx, y + oy + len); c.stroke();
      }
    }
  }
  return element;
}

/** Draw the carriage plate (or its lit twin) as the layout places it. */
function drawCarriage(c, img, L) {
  const v = L.view;
  c.save();
  if (v.crop) {
    roundRectPath(c, v.crop.x, v.crop.y, v.crop.w, v.crop.h, Math.min(v.crop.w, v.crop.h) * 0.03);
    c.clip();
  }
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, v.ox, v.oy, v.pw * v.s, v.ph * v.s);
  c.restore();
}

/** The next carriage, behind the end door's little window (cover-fitted, a little dim through the glass). */
function drawDoorView(c, L) {
  const d = L.door;
  const img = images['next-carriage'];
  if (!d || !img) return;
  const s = Math.max(d.w / img.width, d.h / img.height) * 1.04;
  const w = img.width * s;
  const h = img.height * s;
  c.save();
  c.beginPath();
  c.rect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
  c.clip();
  c.drawImage(img, d.x + (d.w - w) / 2, d.y + (d.h - h) / 2, w, h);
  c.fillStyle = 'rgba(8, 12, 18, 0.22)';
  c.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
  c.restore();
}

/** Rain resting on the big window: beads and a cool sheen, inside the glass. */
function glassOverlay(c, L) {
  const g = L.glass;
  c.save();
  roundRectPath(c, g.x, g.y, g.w, g.h, g.r);
  c.clip();
  c.fillStyle = 'rgba(14, 22, 32, 0.06)';
  c.fillRect(g.x, g.y, g.w, g.h);
  [[0.08, 0.17, 0.035], [0.62, 0.7, 0.022]].forEach(([a, b, alpha]) => {
    c.fillStyle = `rgba(200, 220, 240, ${alpha})`;
    c.beginPath();
    c.moveTo(g.x + g.w * a, g.y); c.lineTo(g.x + g.w * b, g.y); c.lineTo(g.x + g.w * (b - 0.16), g.y + g.h); c.lineTo(g.x + g.w * (a - 0.16), g.y + g.h);
    c.closePath(); c.fill();
  });
  const random = rng(6601);
  const count = Math.round((g.w * g.h) / 2600);
  for (let i = 0; i < count; i += 1) {
    const x = g.x + random() * g.w;
    const y = g.y + random() * g.h;
    const r = 0.8 + random() * random() * 3.4;
    c.fillStyle = 'rgba(10, 16, 24, 0.28)';
    c.beginPath(); c.ellipse(x, y + r * 0.2, r, r * 1.15, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(214, 226, 236, 0.14)';
    c.beginPath(); c.ellipse(x, y, r * 0.85, r * 0.95, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(240, 244, 248, 0.55)';
    c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, Math.max(0.5, r * 0.3), 0, TAU); c.fill();
  }
  c.restore();
}

/** The narrow layout's frame: Chapter 1's painted bezel round the crop. */
function cropFrame(c, L) {
  const f = L.frame;
  if (!f) return;
  const t = Math.max(9, Math.min(f.w, f.h) * 0.035);
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.6)';
  c.shadowBlur = t * 1.6;
  c.shadowOffsetY = t * 0.4;
  c.fillStyle = 'rgba(0, 0, 0, 0.01)';
  c.fillRect(f.x, f.y, f.w, f.h);
  c.restore();
  if (images.bezel) brassFrame(c, images.bezel, f.x - t * 0.6, f.y - t * 0.6, f.w + t * 1.2, f.h + t * 1.2, t, { rivets: 'mid', seed: 11 });
  else {
    c.strokeStyle = '#6e5532';
    c.lineWidth = t * 0.6;
    roundRectPath(c, f.x, f.y, f.w, f.h, t);
    c.stroke();
  }
}

/**
 * The departures board (the menu, titleMenu.css .nf-menu) hangs in Chapter 1's
 * painted bezel: the frame is painted at the board's own size into an image
 * the CSS lays behind it, and repainted when the board changes size (text
 * size, a new screen size).
 */
let board = null;
function dressBoard(el) {
  if (!el || !images.bezel || typeof document === 'undefined') return;
  if (board?.el !== el) {
    board?.observer?.disconnect();
    board = { el, url: null, key: '', observer: null };
  }
  const paintFrame = () => {
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    const key = `${Math.round(r.width / 6)}x${Math.round(r.height / 6)}`;
    if (key === board.key) return;
    board.key = key;
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    const t = Math.max(8, Math.min(17, Math.min(w, h) * 0.026));
    const k = Math.min(2, window.devicePixelRatio || 1);
    const cv = canvasOf(w * k, h * k);
    const c = cv.getContext('2d');
    c.setTransform(k, 0, 0, k, 0, 0);
    brassFrame(c, images.bezel, 0, 0, w, h, t, { rivets: 'mid', seed: 21 });
    cv.toBlob((blob) => {
      if (!blob || board?.el !== el) return;
      const url = URL.createObjectURL(blob);
      el.style.setProperty('--nf-board-frame', `url("${url}")`);
      el.style.setProperty('--nf-bezel', `${t.toFixed(1)}px`);
      el.dataset.frame = 'painted';
      if (board.url) URL.revokeObjectURL(board.url);
      board.url = url;
    });
  };
  paintFrame();
  if (!board.observer && typeof ResizeObserver === 'function') {
    board.observer = new ResizeObserver(paintFrame);
    board.observer.observe(el);
  }
}

/** A strip of the view (an outside layer), tiled across the glass at `offset`. */
function stripOf(img, plate, gh) {
  const k = (gh * LAYER_HEIGHT) / plate.sourceSize[1];
  return { img, w: img.width * k, h: img.height * k, y: plate.top * gh * LAYER_HEIGHT + gh * (1 - LAYER_HEIGHT) };
}

function drawStrip(c, strip, offset, gw) {
  const P = strip.w;
  let x = -(((offset % P) + P) % P);
  for (; x < gw + 2; x += P) c.drawImage(strip.img, x, strip.y, P + 0.5, strip.h);
}

export function paintScene({ L, k, cfg, canvases, root }) {
  if (!images.carriage) throw new Error('[title] plates not loaded');
  const { outside, room, fx } = canvases;
  const M = GLASS_MARGIN;
  const g = L.glass;
  const gw = g.w + M * 2;
  const gh = g.h + M * 2;
  const ko = k * OUTSIDE_SCALE;
  const size = (element, x, y, w, h, scale) => {
    element.width = Math.max(1, Math.round(w * scale));
    element.height = Math.max(1, Math.round(h * scale));
    Object.assign(element.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  };
  size(outside, g.x - M, g.y - M, gw, gh, ko);
  size(room, 0, 0, L.W, L.H, k);
  size(fx, 0, 0, L.W, L.H, k);
  if (L.view.crop) {
    // narrow: the outside stays inside the frame
    const f = L.view.crop;
    outside.style.clipPath = `inset(${Math.max(0, f.y - (g.y - M))}px ${Math.max(0, g.x - M + gw - (f.x + f.w))}px ${Math.max(0, g.y - M + gh - (f.y + f.h))}px ${Math.max(0, f.x - (g.x - M))}px)`;
  } else outside.style.clipPath = '';

  // the room
  const rc = room.getContext('2d');
  rc.setTransform(k, 0, 0, k, 0, 0);
  rc.clearRect(0, 0, L.W, L.H);
  drawDoorView(rc, L);
  drawCarriage(rc, images.carriage, L);
  glassOverlay(rc, L);
  cropFrame(rc, L);
  // the lit twin, for the passing lamp's band
  let lit = null;
  if (cfg.sweep && images['carriage-lit']) {
    lit = canvasOf(L.W * k, L.H * k);
    const lc = lit.getContext('2d');
    lc.setTransform(k, 0, 0, k, 0, 0);
    drawCarriage(lc, images['carriage-lit'], L);
  }

  // outside, glass-local (0, 0 is the glass's top left)
  const sky = images.sky;
  const moon = TITLE_GEOMETRY.moon ?? [0.32, 0.4];
  // the sky covers the glass, its moon behind Butch's cap where it can be
  const ss = Math.max(gw / sky.width, gh / sky.height) * 1.08;
  const sw = sky.width * ss;
  const sh = sky.height * ss;
  const skyX = Math.min(0, Math.max(gw - sw, L.moon.x + M - moon[0] * sw));
  const skyY = Math.min(0, Math.max(gh - sh, L.moon.y + M - moon[1] * sh));
  const far = stripOf(images.hills, TITLE_PLATES.hills, g.h);
  const mid = stripOf(images.orchard, TITLE_PLATES.orchard, g.h);
  const near = stripOf(images.trackside, TITLE_PLATES.trackside, g.h);
  const pole = images.pole;
  const arm = TITLE_PLATES.pole.arm ?? 0.05;
  const poleH = (g.h * (POLE.foot - POLE.wires)) / (1 - arm);
  const poleW = (pole.width / pole.height) * poleH;
  const armY = g.h * POLE.wires + poleH * 0.012;
  const lampImg = images.lamp;
  const lampH = g.h * LAMP.h;
  const lampW = (lampImg.width / lampImg.height) * lampH;
  const flame = TITLE_PLATES.lamp.flame ?? [0.5, 0.05];
  const rainTiles = [
    paintRainTile(256, ko, cfg.rainDensity, 6951, { min: 8, max: 30, alpha: 0.18 }),
    cfg.rainLayers > 1 ? paintRainTile(384, ko, cfg.rainDensity * 0.3, 6952, { min: 14, max: 40, alpha: 0.12, width: 1.4 }) : null,
  ].filter(Boolean);
  const oc = outside.getContext('2d');
  const fc = fx.getContext('2d');
  const patterns = rainTiles.map((tile) => oc.createPattern(tile, 'repeat'));
  const speedsRain = [[-150, 360], [-40, 70]];
  const plaque = root?.querySelector('.nf-menu');
  dressBoard(plaque);
  let plaqueLight = '';
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.clearRect(0, 0, fx.width, fx.height);
  const dirty = [];
  const scale = L.view.s;

  function drawNear(scroll) {
    // the embankment, then the poles with their wires, then the lamps
    drawStrip(oc, near, scroll, g.w);
    const gap = L.poleGap;
    const first = Math.floor((scroll - poleW) / gap);
    const xs = [];
    for (let j = first; j * gap - scroll < g.w + poleW + gap; j += 1) xs.push(j * gap - scroll);
    oc.strokeStyle = 'rgba(8, 10, 14, 0.55)';
    oc.lineWidth = Math.max(0.8, g.h * 0.0024);
    for (let i = 0; i + 1 < xs.length; i += 1) {
      // two wires off the crossarm's ends, sagging between the poles
      [-0.3, 0.3].forEach((d) => {
        const y = armY + poleW * 0.02;
        const xa = xs[i] + d * poleW;
        const xb = xs[i + 1] + d * poleW;
        oc.beginPath();
        oc.moveTo(xa, y);
        oc.quadraticCurveTo((xa + xb) / 2, y + gap * 0.05, xb, y);
        oc.stroke();
      });
    }
    xs.forEach((x) => oc.drawImage(pole, x - poleW / 2, g.h * POLE.foot - poleH, poleW, poleH));
    for (let j = Math.floor((scroll - g.w) / (gap * LAMP_EVERY)) - 1; ; j += 1) {
      const x = lampWorldX(L, j) - scroll;
      if (x > g.w + lampW) break;
      if (x < -lampW) continue;
      const top = g.h * LAMP.foot - lampH;
      oc.drawImage(lampImg, x - lampW / 2, top, lampW, lampH);
      glow(oc, x - lampW / 2 + flame[0] * lampW, top + flame[1] * lampH, g.h * 0.16, 'rgba(255, 196, 120, 0.9)', 0.45);
    }
  }

  function drawFrame(state) {
    oc.setTransform(ko, 0, 0, ko, 0, 0);
    oc.clearRect(0, 0, gw, gh);
    oc.drawImage(sky, skyX, skyY, sw, sh);
    oc.translate(M, M + state.bob);
    drawStrip(oc, far, state.scroll.far, g.w);
    drawStrip(oc, mid, state.scroll.mid, g.w);
    drawNear(state.scroll.near);
    oc.setTransform(ko, 0, 0, ko, 0, 0);
    patterns.forEach((pattern, i) => {
      if (!pattern) return;
      const [vx, vy] = speedsRain[i];
      const span = i ? 384 : 256;
      const ox = ((state.t * vx) % span + span) % span;
      const oy = ((state.t * vy) % span + span) % span;
      if (pattern.setTransform && typeof DOMMatrix === 'function') pattern.setTransform(new DOMMatrix([1 / ko, 0, 0, 1 / ko, ox, oy]));
      oc.globalAlpha = i ? 0.55 : 0.75;
      oc.fillStyle = pattern;
      oc.fillRect(0, 0, gw, gh);
    });
    oc.globalAlpha = 1;

    fc.setTransform(k, 0, 0, k, 0, 0);
    dirty.forEach(([x, y, w, h]) => fc.clearRect(x - 2, y - 2, w + 4, h + 4));
    dirty.length = 0;
    const sweep = state.sweep;
    if (sweep && lit) {
      const skew = L.H * 0.22;
      const x0 = sweep.x - sweep.width / 2;
      const x1 = sweep.x + sweep.width / 2;
      const grad = fc.createLinearGradient(x0, 0, x1 + skew, 0);
      [[0, 0], [0.18, 0.08], [0.34, 0.45], [0.5, 1], [0.64, 0.6], [0.82, 0.12], [1, 0]].forEach(([at, a]) => {
        grad.addColorStop(at, `rgba(255,255,255,${(a * sweep.strength).toFixed(3)})`);
      });
      fc.fillStyle = grad;
      fc.beginPath();
      fc.moveTo(x0 + skew, 0); fc.lineTo(x1 + skew, 0); fc.lineTo(x1, L.H); fc.lineTo(x0, L.H); fc.closePath();
      fc.fill();
      fc.globalCompositeOperation = 'source-in';
      const sx = Math.max(0, x0);
      const sw2 = Math.min(L.W, x1 + skew) - sx;
      if (sw2 > 0) fc.drawImage(lit, sx * k, 0, sw2 * k, lit.height, sx, 0, sw2, L.H);
      fc.globalCompositeOperation = 'source-over';
      dirty.push([x0, 0, x1 + skew - x0, L.H]);
    }
    // his lamp's flame, and the pendant above the board
    const lamp = L.butch.lamp;
    const r = 70 * scale;
    glow(fc, lamp.x, lamp.glass, r, 'rgba(255, 200, 120, 0.9)', 0.08 + state.flicker * 0.07);
    dirty.push([lamp.x - r, lamp.glass - r, r * 2, r * 2]);
    if (L.pendant) {
      const p = L.pendant;
      const pr = p.size * 2.2;
      glow(fc, p.x, p.y, pr, 'rgba(255, 210, 140, 0.9)', 0.1 + 0.04 * Math.sin(state.t * 1.21));
      dirty.push([p.x - pr, p.y - pr, pr * 2, pr * 2]);
    }
    if (plaque) {
      let value = '';
      if (sweep) {
        const p = L.plaque;
        const rel = (sweep.x + L.H * 0.11 - p.x) / p.w;
        if (rel > -0.6 && rel < 1.6) value = `${(rel * 100).toFixed(1)}% ${(sweep.strength * 0.5).toFixed(3)}`;
      }
      if (value !== plaqueLight) {
        plaqueLight = value;
        const [at, strength] = value ? value.split(' ') : ['-50%', '0'];
        plaque.style.setProperty('--nf-sweep-x', at);
        plaque.style.setProperty('--nf-sweep', strength);
      }
    }
  }
  return { drawFrame };
}
