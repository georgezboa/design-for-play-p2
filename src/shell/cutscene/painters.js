// Shared painters for the in-engine cutscenes (README.md lists them).
//
// Chapter 1's ink language, at cutscene scale: flat teal and navy fills,
// ivory hand-inked lines (chapters/nightService/art/ink.js), walnut and
// brass, amber lamplight, paper grain. Every function draws in stage units
// (timeline.js STAGE, 1600 × 800) into whatever context it is given, so a
// shot can cache it in a layer (env.layer) or draw it live each frame.
//
// Read-only imports: the Chapter 1 kit (ink.js, figures.js, act1Art.js),
// the title scene's motion model (titlePlate.js) and the finale's Conductor
// (finalBoss/conductorFigure.js). Pieces of the title painting
// (titlePlateArt.js) are copied below, not imported, because that file paints
// one fixed layout.

import {
  PAL, amberGlint, brassFill, brushTexture, glow, hgrad, ink, inkEllipse, inkRect, lightCone, paperTag, parcel, rivet, rng,
  roundRectPath, speckle, vgrad, wood,
} from '../../chapters/nightService/art/ink.js';
import { BUTCH_PARTS, CONDUCTOR_PARTS } from '../../chapters/nightService/art/figures.js';
import { CONDUCTOR_HEAD_PART, CONDUCTOR_TORSO_PART } from '../../chapters/finalBoss/conductorFigure.js';

export { PAL, amberGlint, brassFill, glow, hgrad, ink, inkEllipse, inkRect, lightCone, paperTag, parcel, rivet, rng, roundRectPath, speckle, vgrad, wood };

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const smooth = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
/** 0 → 1 as t runs from a to b (smoothstep). */
export const ramp = (t, a, b) => smooth((t - a) / (b - a));

function radial(c, x, y, r, stops) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}

// ---------------------------------------------------------------------------
// shared images: the paper grain and the Chapter 1 night carriage

const images = new Map();
function loadImage(url) {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null);
  if (images.has(url)) return images.get(url).promise;
  const entry = { image: null };
  entry.promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => { entry.image = image; resolve(image); };
    image.onerror = () => resolve(null);
    image.src = url;
  });
  images.set(url, entry);
  return entry.promise;
}
const loaded = (url) => images.get(url)?.image ?? null;

let PAPER_URL = null;
let TRAIN_URL = null;
/** Called by a scene's prepare(): the URLs come from Vite asset imports. */
export function usePaintAssets({ paper, train } = {}) {
  if (paper) PAPER_URL = paper;
  if (train) TRAIN_URL = train;
  return Promise.all([loadImage(PAPER_URL), loadImage(TRAIN_URL)]);
}

/** Paper grain (multiplied) and a soft vignette over a finished layer: Chapter 1's finish(). */
export function finishLayer(c, w, h, { grain = 0.18, vig = 0.5 } = {}) {
  const paper = loaded(PAPER_URL);
  if (paper) {
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = grain;
    const size = 900;
    for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) c.drawImage(paper, x, y, size, size);
    c.restore();
  } else {
    speckle(c, 0, 0, w, h, { count: Math.round((w * h) / 700), color: 'rgba(40, 26, 14, 0.12)', size: 1.6, seed: 9001 });
  }
  if (vig > 0) {
    const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(5, 4, 8, ${vig})`);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
}

// ---------------------------------------------------------------------------
// night sky, the orchard country, rain

/** The title's rain sky, for a stage: deep navy, a moon behind cloud bands, a few stars. */
export function paintNightSky(c, w, h, { horizon = h * 0.62, moon = [w * 0.24, h * 0.2], seed = 8001, warm = 0.12 } = {}) {
  c.fillStyle = vgrad(c, 0, horizon, [[0, '#0a1120'], [0.4, '#111c31'], [0.78, '#1d3046'], [1, '#2a4155']]);
  c.fillRect(-20, -20, w + 40, horizon + 24);
  c.fillStyle = '#131d29';
  c.fillRect(-20, horizon, w + 40, h - horizon + 20);
  glow(c, w * 0.7, horizon, h * 0.6, 'rgba(214, 138, 70, 0.9)', warm);
  const [mx, my] = moon;
  if (mx != null) {
    glow(c, mx, my, h * 0.55, 'rgba(150, 178, 198, 0.9)', 0.2);
    glow(c, mx, my, h * 0.18, 'rgba(214, 222, 214, 0.95)', 0.34);
    c.fillStyle = 'rgba(236, 232, 214, 0.8)';
    c.beginPath(); c.arc(mx, my, h * 0.03, 0, TAU); c.fill();
    inkEllipse(c, mx, my, h * 0.03, h * 0.03, { w: 1.2, alpha: 0.35, bleed: false, seed: seed + 1 });
  }
  const random = rng(seed + 2);
  for (let i = 0; i < 22; i += 1) {
    const y = h * (0.03 + random() * 0.5);
    const x = w * (-0.15 + random() * 1.1);
    const len = w * (0.15 + random() * 0.35);
    const thick = h * (0.012 + random() * 0.035);
    const near = mx == null ? 0 : Math.max(0, 1 - Math.hypot(x + len / 2 - mx, y - my) / (h * 0.6));
    c.fillStyle = `rgba(${random() > 0.5 ? '30, 44, 64' : '20, 30, 48'}, ${0.42 + random() * 0.3})`;
    c.beginPath(); c.ellipse(x + len / 2, y, len / 2, thick / 2, 0, 0, TAU); c.fill();
    if (near > 0.08 || random() > 0.6) {
      ink(c, [[x + len * 0.1, y - thick * 0.3], [x + len * 0.5, y - thick * 0.52], [x + len * 0.88, y - thick * 0.25]], {
        w: 1.3, alpha: 0.1 + near * 0.4, jitter: 1.1, bleed: false, seed: seed + 20 + i, color: near > 0.2 ? '#dfe3d6' : PAL.ink,
      });
    }
  }
  brushTexture(c, 0, 0, w, horizon, { seed: seed + 3, color: 'rgba(160, 182, 212, 0.022)', count: 90, len: 220 });
  const stars = rng(seed + 4);
  for (let i = 0; i < 70; i += 1) {
    const x = stars() * w;
    const y = stars() * horizon * 0.55;
    if (mx != null && Math.hypot(x - mx, y - my) < h * 0.25) continue;
    c.fillStyle = `rgba(234, 223, 198, ${0.12 + stars() * 0.3})`;
    c.fillRect(x, y, 1.2 + stars() * 1.2, 1.2 + stars() * 1.2);
  }
}

function ridgeY(x, w, base, amp, seed) {
  const f = TAU / w;
  const a = seed % 7;
  return base - amp * (0.55 + 0.42 * Math.sin(f * 2 * x + a) + 0.28 * Math.sin(f * 5 * x + a * 1.7) + 0.12 * Math.sin(f * 11 * x + a * 0.6));
}

/** The far orchard country on the horizon: two ridges, a village with lit windows. */
export function paintCountry(c, w, h, { horizon = h * 0.62, seed = 8101, lights = true } = {}) {
  const amp = h * 0.06;
  c.fillStyle = '#1b2938';
  c.beginPath(); c.moveTo(-20, h + 20);
  for (let x = -20; x <= w + 20; x += 8) c.lineTo(x, ridgeY(x + 300, w, horizon - h * 0.02, amp * 0.8, 3));
  c.lineTo(w + 20, h + 20); c.closePath(); c.fill();
  c.fillStyle = vgrad(c, horizon - amp * 1.4, h, [[0, '#172331'], [1, '#0e161f']]);
  c.beginPath(); c.moveTo(-20, h + 20);
  for (let x = -20; x <= w + 20; x += 6) c.lineTo(x, ridgeY(x, w, horizon, amp, 5));
  c.lineTo(w + 20, h + 20); c.closePath(); c.fill();
  const pts = [];
  for (let x = -20; x <= w + 20; x += 24) pts.push([x, ridgeY(x, w, horizon, amp, 5)]);
  ink(c, pts, { w: 1.4, alpha: 0.32, jitter: 0.8, bleed: false, seed });
  if (!lights) return;
  const random = rng(seed + 1);
  [0.08, 0.31, 0.62, 0.86].forEach((at, v) => {
    const size = h * 0.022;
    let x = w * at;
    for (let i = 0; i < 4 + v % 2; i += 1) {
      const ground = ridgeY(x, w, horizon, amp, 5) + size * 0.4;
      c.fillStyle = '#0d151d';
      c.beginPath(); c.moveTo(x, ground); c.lineTo(x, ground - size * 0.7); c.lineTo(x + size * 0.7, ground - size * 1.25); c.lineTo(x + size * 1.4, ground - size * 0.7); c.lineTo(x + size * 1.4, ground); c.closePath(); c.fill();
      if (random() > 0.3) {
        c.fillStyle = random() > 0.3 ? '#f2b866' : '#e6d6b0';
        c.fillRect(x + size * 0.45, ground - size * 0.5, 2.4, 2.6);
        glow(c, x + size * 0.5, ground - size * 0.4, size * 1.6, 'rgba(255, 186, 104, 0.95)', 0.3);
      }
      x += size * (1.8 + random());
    }
    glow(c, w * at + size * 3, ridgeY(w * at, w, horizon, amp, 5), size * 8, 'rgba(255, 170, 90, 0.9)', 0.12);
  });
}

const rainTiles = new Map();
function rainTile(res, density, seed) {
  const key = `${res}:${density}:${seed}`;
  if (rainTiles.has(key)) return rainTiles.get(key);
  const size = 320;
  const element = document.createElement('canvas');
  element.width = Math.ceil(size * res);
  element.height = Math.ceil(size * res);
  const c = element.getContext('2d');
  c.setTransform(res, 0, 0, res, 0, 0);
  const random = rng(seed);
  c.lineCap = 'round';
  const count = Math.round(140 * density);
  for (let i = 0; i < count; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const len = 12 + random() * 40;
    const dx = -len * 0.32;
    c.strokeStyle = `rgba(228, 230, 222, ${0.05 + random() * 0.22})`;
    c.lineWidth = 0.7 + random() * 0.9;
    for (const ox of [0, size, -size]) {
      for (const oy of [0, -size, size]) {
        c.beginPath(); c.moveTo(x + ox, y + oy); c.lineTo(x + ox + dx, y + oy + len); c.stroke();
      }
    }
  }
  const entry = { element, size };
  rainTiles.set(key, entry);
  return entry;
}

/**
 * Falling rain over the visible part of the stage, drawn live from a cached
 * tile. `speed` in stage units per second; LOW GRAPHICS draws one sheet.
 */
export function drawRain(c, env, { alpha = 0.7, speed = 620, drift = -0.32, seed = 8201, scale = 1, rect = null } = {}) {
  if (typeof document === 'undefined') return;
  const res = Math.min(2, env.res);
  const sheets = env.lowGraphics ? [[1, 1]] : [[1, 1], [1.7, 0.55]];
  const v = rect ?? env.view ?? { x: 0, y: 0, w: env.stage.w, h: env.stage.h };
  const time = env.reducedMotion ? 0 : env.wall;
  sheets.forEach(([size, a], i) => {
    const tile = rainTile(res, env.lowGraphics ? 0.5 : 1, seed + i);
    const pattern = c.createPattern(tile.element, 'repeat');
    if (!pattern) return;
    const span = tile.size * size * scale;
    const oy = ((time * speed * (i ? 0.8 : 1)) % span + span) % span;
    const ox = ((time * speed * drift) % span + span) % span;
    if (pattern.setTransform && typeof DOMMatrix === 'function') {
      pattern.setTransform(new DOMMatrix([size * scale / res, 0, 0, size * scale / res, ox, oy]));
    }
    c.save();
    c.globalAlpha *= alpha * a;
    c.fillStyle = pattern;
    c.fillRect(v.x, v.y, v.w, v.h);
    c.restore();
  });
}

// ---------------------------------------------------------------------------
// the viaduct and the night service on it (opening shot 1, ending shot 5)

export const VIADUCT = Object.freeze({ deck: 450, span: 250, pier: 54 });

/** A stone viaduct across the valley at `deck` (the rail level), arches down into mist. */
export function paintViaduct(c, w, h, { deck = VIADUCT.deck, span = VIADUCT.span, x0 = -120, seed = 8301 } = {}) {
  const pier = VIADUCT.pier;
  const top = deck - 4;
  const parapet = deck - 24;
  const base = h + 40;
  // the stone: one dark mass with the arches cut out of it
  c.save();
  const body = new Path2D();
  body.rect(-40, top, w + 80, base - top);
  const arches = new Path2D();
  for (let x = x0; x < w + span; x += span) {
    const l = x + pier / 2;
    const r = x + span - pier / 2;
    const spring = deck + 110;
    arches.moveTo(l, base);
    arches.lineTo(l, spring);
    arches.bezierCurveTo(l, spring - (r - l) * 0.62, r, spring - (r - l) * 0.62, r, spring);
    arches.lineTo(r, base);
    arches.closePath();
  }
  c.fillStyle = vgrad(c, top, base, [[0, '#141e25'], [0.3, '#0f171d'], [1, '#090e12']]);
  c.fill(body);
  c.globalCompositeOperation = 'destination-out';
  c.fill(arches);
  c.restore();
  // stone courses on the spandrels and piers
  c.save();
  c.clip(body);
  const random = rng(seed + 1);
  c.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  c.lineWidth = 1;
  for (let y = top + 18; y < base; y += 16) {
    c.beginPath(); c.moveTo(-40, y); c.lineTo(w + 40, y); c.stroke();
    for (let x = -40 + random() * 40; x < w + 40; x += 34 + random() * 30) {
      c.beginPath(); c.moveTo(x, y - 16); c.lineTo(x, y); c.stroke();
    }
  }
  c.restore();
  // keep the arches clear after the courses, then the dark valley seen through them
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.fill(arches);
  c.restore();
  c.fillStyle = vgrad(c, deck + 60, h, [[0, 'rgba(6, 10, 14, 0.62)'], [1, 'rgba(10, 16, 22, 0.4)']]);
  c.fill(arches);
  // a cool rim of moonlight along each arch, ivory ink round it
  for (let x = x0; x < w + span; x += span) {
    const l = x + pier / 2;
    const r = x + span - pier / 2;
    const spring = deck + 110;
    const pts = [];
    for (let i = 0; i <= 16; i += 1) {
      const t = i / 16;
      const bx = (1 - t) ** 3 * l + 3 * (1 - t) ** 2 * t * l + 3 * (1 - t) * t * t * r + t ** 3 * r;
      const by = (1 - t) ** 3 * spring + 3 * (1 - t) ** 2 * t * (spring - (r - l) * 0.62) + 3 * (1 - t) * t * t * (spring - (r - l) * 0.62) + t ** 3 * spring;
      pts.push([bx, by]);
    }
    ink(c, [[l, base], [l, spring], ...pts, [r, spring], [r, base]], { w: 1.6, alpha: 0.3, jitter: 0.6, bleed: false, seed: seed + 10 + Math.round(x) });
    // the pier's lit edge
    c.fillStyle = 'rgba(150, 178, 198, 0.06)';
    c.fillRect(r, spring, 4, base - spring);
  }
  // the mist in the valley, over the piers' feet and through the arches
  c.fillStyle = vgrad(c, deck + 60, h, [[0, 'rgba(30, 44, 58, 0)'], [0.6, 'rgba(32, 46, 60, 0.3)'], [1, 'rgba(24, 36, 48, 0.7)']]);
  c.fillRect(-20, deck + 60, w + 40, h - deck);
  // the river far below, a thin glint
  c.fillStyle = 'rgba(150, 178, 198, 0.16)';
  c.fillRect(-20, h - 34, w + 40, 3);
  ink(c, [[-20, h - 33], [w * 0.3, h - 35], [w * 0.7, h - 32], [w + 20, h - 34]], { w: 1.1, alpha: 0.25, color: '#dfe3d6', bleed: false, seed: seed + 9 });
  // the deck: a cornice, the parapet, the rails' ballast
  c.fillStyle = '#25333d';
  c.fillRect(-40, top - 3, w + 80, 9);
  c.fillStyle = '#141e25';
  c.fillRect(-40, parapet, w + 80, top - parapet);
  c.fillStyle = 'rgba(150, 178, 198, 0.14)';
  c.fillRect(-40, parapet, w + 80, 2);
  for (let x = -40; x < w + 40; x += 26) {
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x, parapet + 3, 1.5, top - parapet - 3);
  }
  ink(c, [[-40, parapet], [w + 40, parapet]], { w: 1.8, alpha: 0.6, jitter: 0.5, bleed: false, seed: seed + 2 });
  ink(c, [[-40, top + 6], [w + 40, top + 6]], { w: 1.4, alpha: 0.4, jitter: 0.5, bleed: false, seed: seed + 3 });
}

/** The catenary masts and wire along the viaduct (the night service is electric). */
export function paintCatenary(c, w, { deck = VIADUCT.deck, every = 230, x0 = -20, seed = 8401 } = {}) {
  const wireY = deck - 150;
  const tops = [];
  for (let x = x0; x < w + every; x += every) tops.push(x);
  c.save();
  c.strokeStyle = 'rgba(8, 12, 16, 0.95)';
  c.lineWidth = 1.6;
  for (let i = 0; i < tops.length - 1; i += 1) {
    c.beginPath(); c.moveTo(tops[i], wireY); c.quadraticCurveTo((tops[i] + tops[i + 1]) / 2, wireY + 10, tops[i + 1], wireY); c.stroke();
  }
  c.strokeStyle = 'rgba(200, 214, 226, 0.14)';
  c.lineWidth = 0.9;
  for (let i = 0; i < tops.length - 1; i += 1) {
    c.beginPath(); c.moveTo(tops[i], wireY - 1); c.quadraticCurveTo((tops[i] + tops[i + 1]) / 2, wireY + 9, tops[i + 1], wireY - 1); c.stroke();
  }
  c.restore();
  tops.forEach((x, i) => {
    c.fillStyle = '#0a1015';
    c.fillRect(x - 3, wireY - 14, 6, deck - 22 - wireY + 14);
    c.fillRect(x - 3, wireY - 4, 30, 4);
    ink(c, [[x - 3, deck - 22], [x - 3, wireY - 14], [x + 3, wireY - 14]], { w: 1, alpha: 0.3, bleed: false, jitter: 0.2, seed: seed + i });
  });
}

/** Where a car's lit windows are on the night carriage picture (fractions of its width). */
const TRAIN_WINDOWS = [0.04, 0.085, 0.13, 0.2, 0.3, 0.45, 0.52, 0.6, 0.68, 0.74, 0.86, 0.94];

/**
 * The night service: `cars` of Chapter 1's night carriage (art/train-night.png)
 * coupled end to end, standing on the rail at y 0, its rear at x 0, scaled to
 * `carW` stage units a car. Falls back to an inked silhouette when the
 * picture is not loaded. Returns the train's length.
 */
export function paintNightTrain(c, { cars = 4, carW = 300, glowAlpha = 1 } = {}) {
  const image = loaded(TRAIN_URL);
  const carH = carW * (196 / 600);
  for (let i = 0; i < cars; i += 1) {
    const x = i * (carW - carW * 0.012);
    if (image) {
      c.drawImage(image, x, -carH, carW, carH);
      // only one Butch rides in the picture: the other cars get an empty window there
      if (i !== cars - 2) c.drawImage(image, 135, 70, 40, 42, x + (178 / 600) * carW, -carH + (70 / 196) * carH, (40 / 600) * carW, (42 / 196) * carH);
    } else {
      c.fillStyle = '#5a2a22';
      roundRectPath(c, x + 4, -carH * 0.86, carW - 8, carH * 0.66, 8); c.fill();
      c.fillStyle = '#d8ccb0';
      c.fillRect(x + 4, -carH * 0.86, carW - 8, carH * 0.32);
      inkRect(c, x + 4, -carH * 0.86, carW - 8, carH * 0.66, { w: 1.6, alpha: 0.7, bleed: false, seed: 8500 + i });
      TRAIN_WINDOWS.forEach((at) => { c.fillStyle = '#ffd98a'; c.fillRect(x + at * carW, -carH * 0.8, carW * 0.035, carH * 0.2); });
    }
    // the night grade over the picture: cool, with the windows left warm
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(14, 22, 40, 0.42)';
    c.fillRect(x, -carH, carW, carH);
    c.restore();
  }
  if (glowAlpha > 0) {
    // window light: a warm halo in the rain round each lit window
    for (let i = 0; i < cars; i += 1) {
      const x = i * (carW - carW * 0.012);
      TRAIN_WINDOWS.forEach((at) => glow(c, x + at * carW + carW * 0.02, -carH * 0.58, carW * 0.06, 'rgba(255, 196, 110, 0.95)', 0.2 * glowAlpha));
    }
  }
  return cars * (carW - carW * 0.012);
}

/** The train's window light falling on the parapet and the rain beside it (live). */
export function drawTrainLight(c, x, deck, length, carW, alpha = 1) {
  const carH = carW * (196 / 600);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = hgrad(c, x, x + length, [[0, 'rgba(255, 180, 100, 0)'], [0.06, `rgba(255, 180, 100, ${0.16 * alpha})`], [0.94, `rgba(255, 180, 100, ${0.16 * alpha})`], [1, 'rgba(255, 180, 100, 0)']]);
  c.fillRect(x, deck - carH * 0.7, length, carH * 0.5);
  c.fillStyle = hgrad(c, x, x + length, [[0, 'rgba(255, 170, 90, 0)'], [0.1, `rgba(255, 170, 90, ${0.1 * alpha})`], [0.9, `rgba(255, 170, 90, ${0.1 * alpha})`], [1, 'rgba(255, 170, 90, 0)']]);
  c.fillRect(x, deck - 26, length, 30);
  c.restore();
}

// ---------------------------------------------------------------------------
// interiors

/** Chapter 1's teal damask wall. */
export function damaskWall(c, x, y, w, h, { seed = 8601, tone = ['#132328', '#1f383e'] } = {}) {
  c.fillStyle = vgrad(c, y, y + h, [[0, tone[0]], [1, tone[1]]]);
  c.fillRect(x, y, w, h);
  c.save();
  c.globalAlpha = 0.06;
  c.fillStyle = PAL.ink;
  for (let sx = x; sx < x + w; sx += 34) c.fillRect(sx, y, 12, h);
  c.restore();
  brushTexture(c, x, y, w, h, { seed, color: 'rgba(200,230,230,0.025)', count: Math.round(w * h / 9000) + 20 });
}

/** Walnut panelling with inked panels and a brass chair rail. */
export function wainscot(c, x0, x1, top, bottom, { seed = 8611, panelW = 120 } = {}) {
  wood(c, x0, top, x1 - x0, bottom - top, { base: '#3a2517', seed, vertical: true });
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.fillRect(x0, top, x1 - x0, bottom - top);
  for (let x = x0 + 16; x + panelW - 22 < x1; x += panelW) {
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(x, top + 14, panelW - 22, bottom - top - 26);
    inkRect(c, x, top + 14, panelW - 22, bottom - top - 26, { w: 1.5, alpha: 0.42, seed: seed + x });
  }
  c.fillStyle = brassFill(c, x0, top - 6, x1 - x0, 8);
  c.fillRect(x0, top - 6, x1 - x0, 8);
  ink(c, [[x0, top - 6], [x1, top - 6]], { w: 1.6, alpha: 0.5, seed: seed + 1 });
}

export function floorboards(c, x0, x1, floorY, h, { seed = 8621, runner = null } = {}) {
  c.fillStyle = vgrad(c, floorY, h, [[0, '#3b2819'], [1, '#150d08']]);
  c.fillRect(x0, floorY, x1 - x0, h - floorY + 20);
  const random = rng(seed);
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  c.lineWidth = 1.2;
  let y = floorY + 7;
  let gap = 7;
  while (y < h + 20) {
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
    for (let x = x0 + random() * 140; x < x1; x += 110 + random() * 110) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + gap); c.stroke(); }
    gap *= 1.35;
    y += gap;
  }
  if (runner) {
    const [rx0, rx1] = runner;
    c.fillStyle = vgrad(c, floorY + 6, h, [[0, '#7a3226'], [1, '#3a140f']]);
    c.fillRect(rx0, floorY + 8, rx1 - rx0, (h - floorY) * 0.6);
    c.strokeStyle = 'rgba(216, 204, 176, 0.4)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(rx0, floorY + 14); c.lineTo(rx1, floorY + 14); c.stroke();
  }
  ink(c, [[x0, floorY], [x1, floorY]], { w: 2.8, alpha: 0.9, jitter: 0.5, seed: seed + 1 });
}

/** The ceiling's curve and brass cornice across the top of a carriage. */
export function carriageCeiling(c, x0, x1, depth, { seed = 8631 } = {}) {
  c.fillStyle = vgrad(c, 0, depth, [[0, '#0b0705'], [1, '#1d140d']]);
  c.beginPath(); c.moveTo(x0, -20); c.lineTo(x1, -20); c.lineTo(x1, depth); c.quadraticCurveTo((x0 + x1) / 2, depth * 1.3, x0, depth); c.closePath(); c.fill();
  c.fillStyle = brassFill(c, x0, depth - 3, x1 - x0, 6);
  c.fillRect(x0, depth - 2, x1 - x0, 5);
  ink(c, [[x0, depth + 4], [x1, depth + 4]], { w: 1.4, alpha: 0.5, jitter: 0.4, seed });
}

/** A brass ceiling lamp with its frosted amber bowl; `angle` swings it from its rose at (x, top). */
export function drawCeilingLamp(c, x, top, len, size, angle = 0, { lit = 1 } = {}) {
  c.save();
  c.translate(x, top);
  c.rotate(angle);
  c.strokeStyle = brassFill(c, -2, 0, 4, len, true);
  c.lineWidth = Math.max(2, size * 0.06);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, len); c.stroke();
  c.fillStyle = brassFill(c, -size * 0.5, len, size, size * 0.2);
  c.beginPath(); c.moveTo(-size * 0.18, len); c.lineTo(size * 0.18, len); c.lineTo(size * 0.5, len + size * 0.2); c.lineTo(-size * 0.5, len + size * 0.2); c.closePath(); c.fill();
  c.fillStyle = vgrad(c, len + size * 0.2, len + size * 0.7, [[0, '#ffe8b4'], [0.6, '#f2b866'], [1, '#c98a46']]);
  c.beginPath(); c.moveTo(-size * 0.46, len + size * 0.2); c.quadraticCurveTo(-size * 0.44, len + size * 0.72, 0, len + size * 0.74); c.quadraticCurveTo(size * 0.44, len + size * 0.72, size * 0.46, len + size * 0.2); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255, 252, 235, 0.7)';
  c.beginPath(); c.ellipse(-size * 0.14, len + size * 0.36, size * 0.08, size * 0.14, 0.4, 0, TAU); c.fill();
  ink(c, [[-size * 0.5, len + size * 0.2], [-size * 0.44, len + size * 0.6], [0, len + size * 0.74], [size * 0.44, len + size * 0.6], [size * 0.5, len + size * 0.2], [-size * 0.5, len + size * 0.2]], { w: 1.5, alpha: 0.7, bleed: false, jitter: 0.15, seed: 8641 });
  c.restore();
  const bx = x - Math.sin(angle) * (len + size * 0.45);
  const by = top + Math.cos(angle) * (len + size * 0.45);
  glow(c, bx, by, size * 2.2, 'rgba(255, 210, 140, 0.9)', 0.36 * lit);
  return { x: bx, y: by };
}

/** The title's oil lamp (base, font, chimney, flame), standing at (x, y), `s` stage units per lamp unit. */
export function drawOilLamp(c, x, y, s, { flame = 1 } = {}) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = brassFill(c, -7, -3, 14, 3);
  c.beginPath(); c.ellipse(0, -1.2, 7.5, 2, 0, 0, TAU); c.fill();
  c.fillStyle = brassFill(c, -6, -9, 12, 7);
  c.beginPath(); c.ellipse(0, -5.5, 6, 4, 0, 0, TAU); c.fill();
  const lit = clamp(flame, 0, 1);
  c.fillStyle = vgrad(c, -24, -9, [[0, `rgba(255, 241, 198, ${0.35 + lit * 0.65})`], [0.5, `rgba(255, 210, 126, ${0.3 + lit * 0.7})`], [1, `rgba(232, 166, 80, ${0.4 + lit * 0.6})`]]);
  c.beginPath(); c.moveTo(-3.6, -9); c.quadraticCurveTo(-5.4, -17, -3, -24); c.lineTo(3, -24); c.quadraticCurveTo(5.4, -17, 3.6, -9); c.closePath(); c.fill();
  c.fillStyle = `rgba(255, 250, 240, ${0.4 + lit * 0.6})`;
  c.beginPath(); c.ellipse(0, -14 - lit, 0.8 + lit * 0.7, 1.4 + lit * 2, 0, 0, TAU); c.fill();
  c.fillStyle = PAL.brassDark;
  c.fillRect(-3.6, -26.4, 7.2, 2.6);
  c.strokeStyle = PAL.brass;
  c.lineWidth = 0.9;
  c.beginPath(); c.arc(0, -27, 4.6, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  ink(c, [[-7.5, -1.4], [-6, -5.5], [-3.6, -9], [-5.2, -17], [-3, -24], [3, -24], [5.2, -17], [3.6, -9], [6, -5.5], [7.5, -1.4]], { w: 1.4 / s * 1.4, alpha: 0.7, bleed: false, jitter: 0.08, seed: 8651 });
  c.restore();
  glow(c, x, y - 15 * s, 30 * s, 'rgba(255, 214, 140, 1)', 0.55 * lit);
  return { x, y: y - 15 * s };
}

/** A high-backed oxblood carriage seat seen from behind (its back, the brass grab rail). */
export function seatBack(c, x, y, w, h, { seed = 8661 } = {}) {
  c.save();
  c.fillStyle = vgrad(c, y, y + h, [[0, '#5a231c'], [0.35, '#441913'], [1, '#230c09']]);
  roundRectPath(c, x, y, w, h + 40, Math.min(26, w * 0.08));
  c.fill();
  c.fillStyle = 'rgba(255, 200, 160, 0.12)';
  c.fillRect(x + 14, y + 6, w - 28, 3);
  // buttons in rows
  for (let row = 0; row < 3; row += 1) {
    for (let col = 1; col < 6; col += 1) {
      c.fillStyle = 'rgba(12, 3, 2, 0.55)';
      c.beginPath(); c.arc(x + (w * col) / 6, y + h * (0.32 + row * 0.22), 2.2, 0, TAU); c.fill();
    }
  }
  ink(c, [[x, y + h + 40], [x, y + 18], [x + 18, y], [x + w - 18, y], [x + w, y + 18], [x + w, y + h + 40]], { w: 2, alpha: 0.42, bleed: false, jitter: 0.3, seed });
  // the brass grab rail along the top
  c.strokeStyle = brassFill(c, x, y - 12, w, 12);
  c.lineWidth = 4;
  c.beginPath(); c.moveTo(x + w * 0.2, y + 4); c.quadraticCurveTo(x + w * 0.5, y - 14, x + w * 0.8, y + 4); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------------------
// Butch, the Chapter 1 rig (art/figures.js), drawn as vectors at any scale.
// Units: Butch is about 70 tall, feet at y 0, facing right at facing 1.

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

/** Joint angles for a pose (the walk cycle and the idle stand of actorRig.js). */
export function butchPose(pose = 'stand', phase = 0) {
  if (pose === 'walk') {
    const s = Math.sin(phase);
    return {
      bodyY: -Math.abs(Math.cos(phase)) * 1.8, torso: 0.06, head: 0.03,
      legFront: s * 0.5, kneeFront: Math.max(0, -Math.sin(phase + 0.9)) * 0.75,
      legBack: -s * 0.5, kneeBack: Math.max(0, Math.sin(phase + 0.9)) * 0.75,
      armFront: -s * 0.4 - 0.15, armBack: s * 0.45, lampSwing: s * 0.18,
    };
  }
  if (pose === 'sit') {
    return { bodyY: 7, torso: -0.05, head: -0.06, legFront: -1.35, kneeFront: 1.3, legBack: -1.25, kneeBack: 1.25, armFront: -0.9, armBack: -0.7, lampSwing: 0 };
  }
  const b = Math.sin(phase);
  return { bodyY: 0, torso: 0, head: Math.sin(phase * 0.25) * 0.03, legFront: 0.04, kneeFront: 0, legBack: -0.04, kneeBack: 0, armFront: 0.05 + b * 0.02 - 0.12, armBack: -0.05 - b * 0.02, lampSwing: b * 0.05 };
}

/**
 * Butch at (x, y) (his feet), `s` stage units per rig unit, `facing` 1 right.
 * `lamp` 'hand' carries his lamp in the front hand (the ending's walk);
 * 'belt' hangs it at his belt as in Chapter 1.
 */
export function drawButch(c, x, y, s, { pose = 'stand', phase = 0, facing = 1, lamp = 'hand', glowAlpha = 0.5 } = {}) {
  const P = BUTCH_PARTS;
  const q = butchPose(pose, phase);
  c.save();
  c.translate(x, y);
  c.scale(s * facing, s);
  // shadow
  c.fillStyle = 'rgba(0, 0, 0, 0.35)';
  c.beginPath(); c.ellipse(0, 0, 17, 3, 0, 0, TAU); c.fill();
  c.translate(0, q.bodyY);
  const hipY = -30;
  const leg = (lx, rot, knee, dim) => {
    c.save();
    c.translate(lx, hipY);
    c.rotate(rot);
    part(c, P.thigh, 0, 0, 0, { dim });
    c.translate(0, 14);
    c.rotate(knee);
    part(c, P.shin, 0, 0, 0, { dim });
    c.restore();
  };
  const lampAt = (lx, ly, rot) => {
    part(c, P.lamp, lx, ly, rot);
  };
  // back arm, legs, torso, head
  c.save(); c.translate(-3, -52); part(c, P.arm, 0, 0, q.armBack, { dim: 0.7 }); c.restore();
  leg(-2.5, q.legBack, q.kneeBack, 0.72);
  leg(2.5, q.legFront, q.kneeFront, 1);
  part(c, P.torso, 0, hipY + 11, q.torso);
  part(c, P.head, 1, -54, q.head);
  // front arm, the lamp in its hand (hanging straight down) or at the belt
  c.save();
  c.translate(3, -52);
  c.rotate(q.armFront);
  part(c, P.arm, 0, 0, 0);
  if (lamp === 'hand') {
    c.translate(0, 23.5);
    c.rotate(-q.armFront + q.lampSwing);
    part(c, P.lamp, 0, 0, 0);
  }
  c.restore();
  if (lamp === 'belt') lampAt(9, -30, q.lampSwing);
  c.restore();
  // the lamp's glow, in stage space
  if (glowAlpha > 0 && lamp) {
    const handX = lamp === 'hand' ? 3 + Math.sin(-q.armFront) * 23.5 : 9;
    const handY = lamp === 'hand' ? -52 + Math.cos(q.armFront) * 23.5 + 7 : -24;
    glow(c, x + handX * s * facing, y + (handY + q.bodyY) * s, 46 * s, 'rgba(255, 196, 112, 0.95)', glowAlpha);
  }
}

// ---------------------------------------------------------------------------
// Butch seated in profile: the title scene's painting (titlePlateArt.js),
// in units where 0, 0 is his seat and his cap is 96 up. `lamp` is the light's
// position in the same units (it lights his front edges).

function butchPaths() {
  const coat = new Path2D();
  coat.moveTo(-12, -58); coat.quadraticCurveTo(-17, -42, -15.5, -14); coat.lineTo(-14.5, 1); coat.lineTo(29, 1);
  coat.quadraticCurveTo(31.5, -4, 30.5, -9); coat.quadraticCurveTo(28, -12.5, 22, -12.5); coat.lineTo(13, -13.5);
  coat.quadraticCurveTo(16.5, -30, 13.5, -46); coat.quadraticCurveTo(11.5, -56, 4, -59.5); coat.quadraticCurveTo(-5, -61.5, -12, -58); coat.closePath();
  const head = new Path2D();
  head.moveTo(-6, -84); head.quadraticCurveTo(-8.5, -76, -5.5, -70); head.quadraticCurveTo(-2, -66.5, 4, -66);
  head.quadraticCurveTo(9, -66, 10.5, -68); head.lineTo(11.6, -70.5); head.lineTo(12.4, -72); head.lineTo(13, -74);
  head.lineTo(15.4, -76.2); head.quadraticCurveTo(14.6, -78, 13, -79.2); head.lineTo(13, -81); head.quadraticCurveTo(12.4, -84, 10.5, -86);
  head.lineTo(-5, -86.5); head.closePath();
  const cap = new Path2D();
  cap.moveTo(-8, -84.5); cap.quadraticCurveTo(-10, -94, -1, -96); cap.quadraticCurveTo(10, -97, 11.5, -88); cap.lineTo(11.4, -85.5); cap.closePath();
  const peak = new Path2D();
  peak.moveTo(8.5, -86.6); peak.quadraticCurveTo(15, -86.8, 19.4, -84.6); peak.lineTo(17.6, -83.4); peak.quadraticCurveTo(13, -84.4, 8.6, -84.6); peak.closePath();
  const collar = new Path2D();
  collar.moveTo(-9, -57); collar.lineTo(-8, -68); collar.quadraticCurveTo(-4, -64.5, -1, -64.5); collar.lineTo(5, -64.5);
  collar.quadraticCurveTo(9, -65, 11, -68); collar.lineTo(10.5, -56); collar.closePath();
  return { coat, head, cap, peak, collar };
}

function lampLit(c, path, lx, ly, r, alpha, color = '255, 170, 92') {
  c.save();
  c.clip(path);
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, lx, ly, r, [[0, `rgba(${color}, ${alpha})`], [0.45, `rgba(${color}, ${alpha * 0.45})`], [1, `rgba(${color}, 0)`]]);
  c.fillRect(lx - r, ly - r, r * 2, r * 2);
  c.restore();
}

/** His legs, seated: the far one tucked back, the near one planted forward (the title's). */
function seatedLegs(c, s, lx, ly, light, floor) {
  const u = (px) => px / s;
  const leg = (knee, ankle, top, width) => {
    const p = new Path2D();
    const [kx, ky] = knee;
    const [ax, ay] = ankle;
    p.moveTo(top[0], top[1]);
    p.quadraticCurveTo(kx + width * 0.4, ky - width * 0.55, kx + width * 0.5, ky + width * 0.25);
    p.quadraticCurveTo(ax + width * 0.55, (ky + ay) / 2, ax + width * 0.42, ay);
    p.lineTo(ax - width * 0.42, ay);
    p.quadraticCurveTo(ax - width * 0.5, (ky + ay) / 2, kx - width * 0.5, ky + width * 0.6);
    p.lineTo(top[0] - 2, top[1] + width);
    p.closePath();
    return p;
  };
  const boot = (ax, toe, color, rim, seed) => {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(ax - 4.6, floor - 6.5); c.lineTo(ax + 3.8, floor - 6.8); c.quadraticCurveTo(toe - 1, floor - 6, toe, floor - 1.6);
    c.lineTo(toe, floor); c.lineTo(ax - 5.4, floor); c.closePath(); c.fill();
    ink(c, [[ax - 4.6, floor - 6.5], [ax + 3.8, floor - 6.8], [toe - 1, floor - 5.6], [toe, floor - 1.6]], { w: u(1.3), alpha: rim * light, bleed: false, jitter: 0.08, color: '#ffcf92', seed });
  };
  const farLeg = leg([31, -5], [26.5, floor - 6], [18, -11], 8.2);
  c.fillStyle = '#101823';
  c.fill(farLeg);
  lampLit(c, farLeg, lx, ly, 46, 0.18 * light);
  boot(26.5, 35, '#08090c', 0.22, 6503);
  const shin = leg([38.5, -6], [43.5, floor - 6], [24, -12.5], 9.2);
  c.fillStyle = '#16202b';
  c.fill(shin);
  lampLit(c, shin, lx, ly, 60, 0.4 * light);
  ink(c, [[35.4, -1.5], [37.6, 1.2], [38.6, 4.5]], { w: u(1), alpha: 0.5, bleed: false, jitter: 0.1, color: '#05070a', seed: 6502 });
  boot(43.5, 53.5, '#0a0705', 0.5, 6504);
  ink(c, [[42.7, -4.6], [46.6, floor * 0.5], [47.6, floor - 6], [53.5, floor - 1.6]], { w: u(1.6), alpha: 0.42 * light, bleed: false, jitter: 0.12, color: '#ffcf92', seed: 6501 });
}

/** His coat and body, seated (no legs: the desk hides them). `lean` tips him forward about his seat. */
function seatedCoat(c, s, lx, ly, light) {
  const P = butchPaths();
  const u = (px) => px / s;
  c.fillStyle = vgrad(c, -60, 2, [[0, '#13222a'], [1, '#0c161b']]);
  c.fill(P.coat);
  c.save();
  c.clip(P.coat);
  c.fillStyle = 'rgba(3, 6, 8, 0.45)';
  c.fillRect(-20, -64, 14, 70);
  c.strokeStyle = PAL.oxblood;
  c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(-6, -59); c.lineTo(15, -22); c.stroke();
  c.strokeStyle = 'rgba(255, 190, 130, 0.3)';
  c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-4.4, -59.6); c.lineTo(16.4, -23.5); c.stroke();
  c.strokeStyle = 'rgba(234, 223, 198, 0.22)';
  c.lineWidth = u(1.2);
  c.beginPath(); c.moveTo(12, -50); c.quadraticCurveTo(14.5, -32, 12.5, -14); c.stroke();
  c.restore();
  lampLit(c, P.coat, lx, ly, 80, 0.3 * light);
  c.fillStyle = PAL.brassLight;
  [-46, -38, -30].forEach((by) => { c.beginPath(); c.arc(12.6 + (by + 46) * 0.03, by, 1.1, 0, TAU); c.fill(); });
  ink(c, [[-12, -58], [-15.5, -40], [-15.5, -14], [-14.5, 1]], { w: u(1.6), alpha: 0.6, bleed: false, jitter: 0.2, color: '#06080c', seed: 6510 });
  ink(c, [[4, -59.5], [11.5, -56], [13.5, -46], [16.5, -30], [13, -13.5], [22, -12.5]], { w: u(2), alpha: 0.75 * light, bleed: true, jitter: 0.15, color: '#ffc988', seed: 6511 });
}

/** His head and cap (the title's), lit from (lx, ly). Pivot for a nod: the neck at (2, -64). */
function seatedHead(c, s, lx, ly, light) {
  const P = butchPaths();
  const u = (px) => px / s;
  c.fillStyle = '#4e392b';
  c.fillRect(-3, -67, 9, 7);
  c.fillStyle = '#121e24';
  c.fill(P.collar);
  lampLit(c, P.collar, lx, ly, 70, 0.5 * light);
  c.fillStyle = '#5a4234';
  c.fill(P.head);
  c.save();
  c.clip(P.head);
  c.fillStyle = hgrad(c, -1, 14, [[0, 'rgba(226, 170, 114, 0)'], [0.35, `rgba(226, 170, 114, ${0.55 * light})`], [0.75, `rgba(236, 184, 126, ${0.92 * light})`], [1, `rgba(244, 196, 138, ${light})`]]);
  c.fillRect(-2, -90, 22, 28);
  c.fillStyle = vgrad(c, -86, -66, [[0, 'rgba(60, 30, 16, 0.25)'], [0.5, 'rgba(60, 30, 16, 0)'], [1, 'rgba(60, 30, 16, 0.18)']]);
  c.fillRect(-10, -90, 30, 28);
  c.fillStyle = '#1e140d';
  c.beginPath(); c.moveTo(-6.5, -84); c.quadraticCurveTo(-8.6, -76, -5.6, -71); c.lineTo(-3, -73); c.lineTo(-3.4, -84); c.closePath(); c.fill();
  c.restore();
  c.fillStyle = '#6a4a36';
  c.beginPath(); c.ellipse(-0.6, -77, 1.7, 2.6, 0.1, 0, TAU); c.fill();
  c.fillStyle = '#1a110b';
  c.beginPath(); c.ellipse(9.6, -79.2, 0.85, 0.7, 0, 0, TAU); c.fill();
  ink(c, [[7.6, -81.3], [11, -81.6]], { w: u(1.3), alpha: 0.7, bleed: false, jitter: 0.05, color: '#2a1a10', seed: 6523 });
  ink(c, [[10.2, -71.2], [12, -71.5]], { w: u(1), alpha: 0.6, bleed: false, jitter: 0.05, color: '#5a3426', seed: 6524 });
  ink(c, [[12.5, -83.4], [13, -79.2], [15.4, -76.2], [13, -74], [12.4, -72], [11.6, -70.5], [10.5, -68], [7, -66.2]], {
    w: u(2.2), alpha: 0.9 * light, bleed: true, jitter: 0.08, color: '#ffd9a0', seed: 6525,
  });
  c.fillStyle = '#121a27';
  c.fill(P.cap);
  c.save();
  c.clip(P.cap);
  c.fillStyle = PAL.oxblood;
  c.fillRect(-12, -88.6, 26, 2.6);
  c.restore();
  lampLit(c, P.cap, lx, ly, 90, 0.42 * light);
  c.fillStyle = '#080c14';
  c.fill(P.peak);
  c.fillStyle = PAL.brassLight;
  c.fillRect(5.4, -92.4, 2.6, 2.2);
  glow(c, 6.7, -91.3, 4, 'rgba(255, 220, 150, 0.9)', 0.35 * light);
  ink(c, [[-8, -84.5], [-9.4, -91], [-1, -96], [7, -96.2], [11.5, -88]], { w: u(1.6), alpha: 0.7, bleed: false, jitter: 0.15, color: '#06080c', seed: 6527 });
  ink(c, [[0, -95.6], [7, -95.8], [11, -89]], { w: u(1.2), alpha: 0.4 * light, bleed: false, jitter: 0.1, color: '#ffd59a', seed: 6530 });
  ink(c, [[11.5, -88], [11.4, -86.4], [19.4, -84.6], [17.6, -83.4], [8.6, -84.6]], { w: u(1.6), alpha: 0.75 * light, bleed: false, jitter: 0.1, color: '#ffd59a', seed: 6528 });
  ink(c, [[-8.5, -84.6], [-8, -79], [-6, -71], [-1, -66.6]], { w: u(1.4), alpha: 0.6, bleed: false, jitter: 0.12, color: '#06080c', seed: 6529 });
}

function sleeve(c, s, lx, ly, light, path, seed) {
  const u = (px) => px / s;
  c.fillStyle = '#152329';
  c.fill(path);
  lampLit(c, path, lx, ly, 55, 0.42 * light);
  return u;
}

function hand(c, x, y, angle, lx, ly, light, s) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = '#8c6a50';
  c.beginPath(); c.ellipse(0, 0, 4, 2.7, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(3.6, 0.4, 2.2, 1.5, 0, 0, TAU); c.fill();
  c.restore();
  const p = new Path2D(); p.ellipse(x + 1.5, y, 6.5, 4, angle, 0, TAU);
  lampLit(c, p, lx, ly, 40, 0.9 * light);
  void s;
}

/**
 * Butch seated at a desk in profile, facing right: `pose` 'tag' (holding a
 * claim tag up in both hands; returns where the tag is), 'asleep' (arms
 * folded on the desk, `nod` 0..1 lowering his head onto them). (x, y) is his
 * seat, s stage units per unit, `lamp` the light in stage px, `light` 0..1.
 */
export function drawButchAtDesk(c, x, y, s, { pose = 'tag', nod = 0, lamp = { x: x + 70 * s, y: y - 45 * s }, light = 1, breath = 0, floor = 40 } = {}) {
  const lx = (lamp.x - x) / s;
  const ly = (lamp.y - y) / s;
  const n = smooth(nod);
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  seatedLegs(c, s, lx, ly, light, floor);
  // asleep: the whole body leans forward over the desk about his seat
  const lean = pose === 'asleep' ? 0.08 + n * 0.32 : 0.04;
  c.save();
  c.translate(-4, 0);
  c.rotate(lean);
  c.translate(4, 0);
  c.translate(0, breath * 0.6);
  seatedCoat(c, s, lx, ly, light);
  let tagAt = null;
  if (pose === 'tag') {
    // upper arm down to an elbow on the desk edge, forearm up to the hands
    const arm = new Path2D();
    arm.moveTo(-6, -57); arm.quadraticCurveTo(4, -60, 6.5, -50); arm.lineTo(10, -36);
    arm.quadraticCurveTo(18, -40, 26, -46); arm.lineTo(28, -40.5); arm.quadraticCurveTo(18, -33, 9, -29);
    arm.quadraticCurveTo(2, -29, 0, -35); arm.lineTo(-3.5, -48); arm.closePath();
    sleeve(c, s, lx, ly, light, arm);
    ink(c, [[6.5, -50], [10, -36], [18, -40], [26, -46]], { w: 1.8 / s, alpha: 0.7 * light, bleed: true, jitter: 0.12, color: '#ffc988', seed: 6519 });
    tagAt = { x: 31, y: -47 };
  } else {
    // forearms folded flat on the desk top, hands meeting in front
    const arm = new Path2D();
    arm.moveTo(-6, -57); arm.quadraticCurveTo(4, -60, 6.5, -50); arm.lineTo(9.5, -36); arm.lineTo(30, -35.5);
    arm.lineTo(31, -29.6); arm.lineTo(6, -29.5); arm.quadraticCurveTo(1, -30, 0, -36); arm.lineTo(-3.5, -48); arm.closePath();
    sleeve(c, s, lx, ly, light, arm);
    ink(c, [[6.5, -50], [9.5, -36], [30, -35.5]], { w: 1.8 / s, alpha: 0.6 * light, bleed: true, jitter: 0.12, color: '#ffc988', seed: 6519 });
    hand(c, 32, -32.5, 0.1, lx, ly, light, s);
  }
  // the head: upright, or nodding down onto the folded arms
  c.save();
  if (pose === 'asleep') {
    c.translate(2, -64);
    c.rotate(n * 1.05);
    c.translate(n * 9, n * 6);
    c.translate(-2, 64);
  } else {
    c.translate(2, -64); c.rotate(0.12); c.translate(-2, 64);
  }
  seatedHead(c, s, lx, ly, light);
  c.restore();
  c.restore();
  c.restore();
  if (tagAt) {
    // tagAt is in his leaning frame: lean is small, so map it straight through
    const ax = x + (tagAt.x * Math.cos(lean) - tagAt.y * Math.sin(lean)) * s;
    const ay = y + (tagAt.x * Math.sin(lean) + tagAt.y * Math.cos(lean)) * s;
    return { tag: { x: ax, y: ay }, hands: (cc) => {
      cc.save(); cc.translate(x, y); cc.scale(s, s); cc.rotate(lean);
      hand(cc, 27, -44, -0.7, lx, ly, light, s);
      hand(cc, 33.5, -48.5, -0.5, lx, ly, light, s);
      cc.restore();
    } };
  }
  return { tag: null, hands: null };
}

/**
 * Butch seated, seen from behind (the ending: beside the Mara ahead at the
 * window). (x, y) is the middle of his seat; s stage units per unit, about
 * the scale of drawButchAtDesk. `lampSide` -1/1: which side his lamp lights.
 */
export function drawButchBack(c, x, y, s, { lampSide = 1, light = 1, turn = 0 } = {}) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  // shoulders and back of the coat, the collar turned up
  const coat = new Path2D();
  coat.moveTo(-22, 0); coat.quadraticCurveTo(-25, -30, -20, -48); coat.quadraticCurveTo(-14, -58, -5, -60);
  coat.lineTo(5, -60); coat.quadraticCurveTo(14, -58, 20, -48); coat.quadraticCurveTo(25, -30, 22, 0); coat.closePath();
  c.fillStyle = vgrad(c, -60, 0, [[0, '#152730'], [1, '#0b151a']]);
  c.fill(coat);
  c.save(); c.clip(coat);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-1, -58, 2, 60);
  c.strokeStyle = PAL.oxblood; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-17, -50); c.lineTo(12, -16); c.stroke();
  c.restore();
  lampLit(c, coat, 30 * lampSide, -40, 46, 0.32 * light);
  ink(c, [[-22, 0], [-25, -30], [-20, -48], [-14, -58], [-5, -60], [5, -60], [14, -58], [20, -48], [25, -30], [22, 0]], { w: 1.6 / s * 1.6, alpha: 0.55, bleed: false, jitter: 0.2, color: '#06080c', seed: 6610 });
  ink(c, lampSide > 0 ? [[14, -58], [20, -48], [25, -30], [23, -6]] : [[-14, -58], [-20, -48], [-25, -30], [-23, -6]], { w: 2.2 / s * 1.6, alpha: 0.7 * light, bleed: true, jitter: 0.15, color: '#ffc988', seed: 6611 });
  // the back of his head and the cap, turned a little toward the window
  c.save();
  c.translate(turn * 3, 0);
  c.fillStyle = '#0b0a0d';
  c.beginPath(); c.ellipse(0, -76, 6.6, 7.4, 0, 0, TAU); c.fill();
  // the short hair at the nape, under the cap
  c.fillStyle = '#17100b';
  c.beginPath(); c.ellipse(0, -77, 6.6, 5.6, 0, Math.PI, 0); c.fill();
  // the hair seen from behind: a few dark strokes, the lamp's rim on the near side
  [-3.5, 0, 3.5].forEach((hx, i) => ink(c, [[hx - 1, -81], [hx, -76], [hx + 0.6, -71]], { w: 0.8 / s * 1.6, alpha: 0.5, bleed: false, jitter: 0.05, color: '#2a2024', seed: 6620 + i }));
  ink(c, lampSide > 0 ? [[5.6, -80], [6.6, -75], [5.4, -70]] : [[-5.6, -80], [-6.6, -75], [-5.4, -70]], { w: 1.2 / s * 1.6, alpha: 0.55 * light, bleed: false, jitter: 0.05, color: '#ffc988', seed: 6623 });
  // collar
  const collar = new Path2D();
  collar.moveTo(-12, -56); collar.lineTo(-11, -72); collar.quadraticCurveTo(0, -68.5, 11, -72); collar.lineTo(12, -56); collar.closePath();
  c.fillStyle = '#101c22'; c.fill(collar);
  lampLit(c, collar, 30 * lampSide, -50, 40, 0.4 * light);
  // the cap: crown, the oxblood band all the way round, the peak's edge just showing
  const cap = new Path2D();
  cap.moveTo(-9.5, -80); cap.quadraticCurveTo(-11, -93, 0, -95); cap.quadraticCurveTo(11, -93, 9.5, -80); cap.closePath();
  c.fillStyle = '#121a27'; c.fill(cap);
  c.save(); c.clip(cap); c.fillStyle = PAL.oxblood; c.fillRect(-12, -84.2, 24, 2.8); c.restore();
  lampLit(c, cap, 30 * lampSide, -86, 40, 0.4 * light);
  const crown = [];
  for (let i = 0; i <= 12; i += 1) {
    const k = i / 12;
    const q = (a, b, cc) => (1 - k) ** 2 * a + 2 * (1 - k) * k * b + k * k * cc;
    crown.push([q(-9.5, -11, 0), q(-80, -93, -95)]);
  }
  for (let i = 1; i <= 12; i += 1) {
    const k = i / 12;
    const q = (a, b, cc) => (1 - k) ** 2 * a + 2 * (1 - k) * k * b + k * k * cc;
    crown.push([q(0, 11, 9.5), q(-95, -93, -80)]);
  }
  ink(c, crown, { w: 1.4 / s * 1.6, alpha: 0.6, bleed: false, jitter: 0.02, color: '#06080c', seed: 6612 });
  ink(c, lampSide > 0 ? [[3, -94.6], [8, -92], [10.6, -86]] : [[-3, -94.6], [-8, -92], [-10.6, -86]], { w: 1.2 / s * 1.6, alpha: 0.5 * light, bleed: false, jitter: 0.1, color: '#ffd59a', seed: 6613 });
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------------------
// the Mara ahead: always the rose scarf, always turned away. Her face is never drawn.

export const ROSE = '#c46a7a';

/** Walking away from us (the title's door view), feet at (x, ground), `h` tall. */
export function drawMaraWalking(c, x, ground, h, { phase = 0, light = 1 } = {}) {
  const s = h / 66;
  const step = Math.sin(phase) * 2.2;
  c.save();
  c.translate(x, ground);
  c.scale(s, s);
  c.fillStyle = '#17110f';
  c.beginPath(); c.moveTo(-3.5, -22); c.lineTo(-5.5 - step * 0.4, 0); c.lineTo(-2.5 - step * 0.4, 0); c.lineTo(-0.5, -20); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(0.6, -21); c.lineTo(4.6 + step * 0.4, -2 + Math.abs(step) * 0.3); c.lineTo(7 + step * 0.4, -2.6); c.lineTo(3.2, -22); c.closePath(); c.fill();
  c.fillStyle = '#1f1716';
  c.beginPath(); c.moveTo(-7, -46); c.quadraticCurveTo(0, -50, 7, -46); c.lineTo(9.5, -19); c.quadraticCurveTo(0, -16, -9.5, -19); c.closePath(); c.fill();
  c.fillStyle = ROSE;
  c.beginPath(); c.ellipse(0, -55, 5.4, 6.4, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-6, -52); c.quadraticCurveTo(-9, -44, -5.5, -36); c.lineTo(-1.5, -37); c.quadraticCurveTo(-3, -45, -1, -50); c.closePath(); c.fill();
  c.fillStyle = `rgba(255, 220, 190, ${0.35 * light})`;
  c.beginPath(); c.ellipse(1.8, -58, 2, 2.8, 0.4, 0, TAU); c.fill();
  c.fillStyle = '#b05a6a';
  c.beginPath(); c.moveTo(-6.5, -50); c.quadraticCurveTo(0, -47, 6.5, -50); c.lineTo(6, -47.5); c.quadraticCurveTo(0, -45, -6, -47.5); c.closePath(); c.fill();
  c.strokeStyle = `rgba(255, 210, 150, ${0.55 * light})`;
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(7, -46); c.lineTo(9.5, -19); c.stroke();
  c.restore();
}

/**
 * Seated, seen from behind, her scarfed head turned toward the window on
 * her `windowSide` (1 right): we see the back of the scarf, never a face.
 * (x, y) the middle of her seat, s stage units per unit (Butch's scale).
 */
export function drawMaraSeatedBack(c, x, y, s, { windowSide = 1, light = 1, lampSide = -1 } = {}) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const coat = new Path2D();
  coat.moveTo(-19, 0); coat.quadraticCurveTo(-22, -28, -17, -44); coat.quadraticCurveTo(-11, -53, -4, -54);
  coat.lineTo(4, -54); coat.quadraticCurveTo(11, -53, 17, -44); coat.quadraticCurveTo(22, -28, 19, 0); coat.closePath();
  c.fillStyle = vgrad(c, -54, 0, [[0, '#2a1d1c'], [1, '#160f0f']]);
  c.fill(coat);
  lampLit(c, coat, 34 * lampSide, -36, 46, 0.36 * light);
  ink(c, [[-19, 0], [-22, -28], [-17, -44], [-11, -53], [-4, -54], [4, -54], [11, -53], [17, -44], [22, -28], [19, 0]], { w: 1.6 / s * 1.6, alpha: 0.5, bleed: false, jitter: 0.2, color: '#06080c', seed: 6710 });
  // the scarf: over her head and down her back, its tail on one shoulder
  c.save();
  c.translate(windowSide * 2.5, 0);
  const scarf = new Path2D();
  scarf.ellipse(0, -66, 8.4, 10, windowSide * 0.12, 0, TAU);
  c.fillStyle = ROSE;
  c.fill(scarf);
  const tail = new Path2D();
  tail.moveTo(-windowSide * 5, -60); tail.quadraticCurveTo(-windowSide * 10, -48, -windowSide * 7, -30);
  tail.lineTo(-windowSide * 1.5, -32); tail.quadraticCurveTo(-windowSide * 3, -46, -windowSide * 0.5, -57); tail.closePath();
  c.fill(tail);
  c.fillStyle = '#a8566a';
  c.beginPath(); c.moveTo(-8, -58); c.quadraticCurveTo(0, -54.5, 8, -58); c.lineTo(7.6, -55); c.quadraticCurveTo(0, -52, -7.6, -55); c.closePath(); c.fill();
  // folds in the cloth
  ink(c, [[-3, -74], [-1, -66], [-3.5, -58]], { w: 1 / s * 1.6, alpha: 0.35, bleed: false, jitter: 0.1, color: '#6e2c3a', seed: 6711 });
  ink(c, [[3.5, -73], [4.8, -65], [3, -58]], { w: 1 / s * 1.6, alpha: 0.3, bleed: false, jitter: 0.1, color: '#6e2c3a', seed: 6712 });
  lampLit(c, scarf, 30 * lampSide, -66, 34, 0.55 * light, '255, 196, 150');
  ink(c, lampSide < 0 ? [[-6, -74], [-8.4, -66], [-6.4, -58]] : [[6, -74], [8.4, -66], [6.4, -58]], { w: 1.8 / s * 1.6, alpha: 0.6 * light, bleed: true, jitter: 0.1, color: '#ffd2b0', seed: 6713 });
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------------------
// the Conductor: the finale's design (cap and badge, the brim's shadow over
// lamp-lit eyes, grey moustache, watch chain), Chapter 1's arms and lantern

/** Standing, facing us, feet at (x, y), `s` stage units per rig unit (he is about 105 tall). */
export function drawConductor(c, x, y, s, { punch = true, lantern = true, swing = 0, glowAlpha = 0.6 } = {}) {
  const P = CONDUCTOR_PARTS;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = 'rgba(0, 0, 0, 0.4)';
  c.beginPath(); c.ellipse(0, 0, 24, 4, 0, 0, TAU); c.fill();
  part(c, P.legs, 0, -15);
  // his lantern arm behind, his punch arm in front
  c.save(); c.translate(-9, -76); c.rotate(0.12 + swing);
  part(c, P.arm, 0, 0, 0, { dim: 0.75 });
  if (lantern) { c.translate(0, 35); c.rotate(-0.12 - swing); part(c, P.lantern, 0, 0, 0); }
  c.restore();
  part(c, CONDUCTOR_TORSO_PART, 0, -12);
  part(c, CONDUCTOR_HEAD_PART, 0.5, -78);
  c.save(); c.translate(10, -76); c.rotate(-0.55);
  part(c, P.arm, 0, 0, 0);
  if (punch) part(c, P.punch, 0, 34, 0.3);
  c.restore();
  c.restore();
  if (lantern && glowAlpha > 0) glow(c, x - 9 * s - Math.sin(0.12 + swing) * 35 * s, y - 76 * s + 46 * s, 70 * s, 'rgba(255, 184, 96, 0.95)', glowAlpha);
}

// ---------------------------------------------------------------------------
// close-ups: the claim tag (front and back), a ticket, an accession card, the case

/**
 * The paper claim tag, big: `w` stage units wide, centred on (x, y). `flip`
 * 0..1 turns it over about its long axis (0 front, 1 back): `front` and
 * `back` are each a list of lines, the first one the large one.
 */
export function drawClaimTag(c, x, y, { w = 300, angle = 0, flip = 0, front = ['CLAIM 1978-0412', 'ORCHARD CASE', 'UNCLAIMED'], back = ['M. VELEZ', 'BELLWETHER'], glint = true, string = true } = {}) {
  const h = w * 0.43;
  const turn = Math.cos(Math.PI * clamp(flip, 0, 1));
  const showBack = turn < 0;
  const sy = Math.max(0.02, Math.abs(turn));
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  if (string) ink(c, [[-w * 0.5 + h * 0.36, 0], [-w * 0.62, -h * 0.9], [-w * 0.7, -h * 1.6]], { w: Math.max(1.2, w * 0.006), alpha: 0.8, bleed: false, jitter: 0.6, color: '#e6d6b0', seed: 8701 });
  // turned over in the fingers: about its long axis
  c.scale(1, sy);
  c.translate(-w / 2, 0);
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(h * 0.42, -h / 2); c.lineTo(w, -h / 2); c.lineTo(w, h / 2); c.lineTo(h * 0.42, h / 2); c.closePath();
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.55)';
  c.shadowBlur = h * 0.25;
  c.shadowOffsetY = h * 0.1;
  c.fillStyle = showBack ? vgrad(c, -h / 2, h / 2, [[0, '#e6dbc0'], [1, '#cdbd98']]) : vgrad(c, -h / 2, h / 2, [[0, '#f1e7cd'], [1, '#d9caa6']]);
  c.fill();
  c.restore();
  c.strokeStyle = 'rgba(80, 56, 34, 0.75)';
  c.lineWidth = Math.max(1, h * 0.02);
  c.stroke();
  // the eyelet, the oxblood margin line
  c.fillStyle = 'rgba(60, 40, 25, 0.9)';
  c.beginPath(); c.arc(h * 0.3, 0, h * 0.075, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(184, 160, 120, 0.9)';
  c.lineWidth = h * 0.03;
  c.beginPath(); c.arc(h * 0.3, 0, h * 0.1, 0, TAU); c.stroke();
  // paper fibres and foxing
  speckle(c, h * 0.2, -h / 2, w - h * 0.2, h, { count: Math.round(w * 0.6), color: 'rgba(120, 90, 50, 0.12)', size: Math.max(1.2, h * 0.02), seed: showBack ? 8703 : 8702 });
  const text = showBack ? back : front;
  const left = h * 0.62;
  const room = w - left - h * 0.12;
  c.textBaseline = 'middle';
  if (!showBack) {
    c.strokeStyle = PAL.oxblood;
    c.lineWidth = Math.max(1, h * 0.025);
    c.beginPath(); c.moveTo(h * 0.52, -h * 0.5); c.lineTo(h * 0.52, h * 0.5); c.stroke();
    const [first, second, third] = text;
    c.fillStyle = 'rgba(42, 29, 20, 0.95)';
    c.font = `700 ${h * 0.2}px "Space Mono", monospace`;
    c.fillText(first ?? '', left, -h * 0.24, room);
    c.font = `700 ${h * 0.15}px "Space Mono", monospace`;
    c.fillStyle = 'rgba(60, 42, 28, 0.9)';
    c.fillText(second ?? '', left, h * 0.02, room);
    if (third) {
      // an oxblood stamp, slightly askew
      c.save();
      c.translate(left + room * 0.5, h * 0.29);
      c.rotate(-0.05);
      c.font = `700 ${h * 0.14}px "Space Mono", monospace`;
      const tw = Math.min(room, c.measureText(third).width + h * 0.16);
      c.strokeStyle = 'rgba(138, 42, 30, 0.85)';
      c.lineWidth = Math.max(1, h * 0.022);
      c.strokeRect(-tw / 2, -h * 0.1, tw, h * 0.2);
      c.fillStyle = 'rgba(138, 42, 30, 0.88)';
      c.textAlign = 'center';
      c.fillText(third, 0, h * 0.005, room);
      c.restore();
    }
  } else {
    // the back: written by hand long ago, in faded brown ink
    const [first, second] = text;
    c.fillStyle = 'rgba(96, 66, 40, 0.78)';
    c.font = `italic 400 ${h * 0.26}px Georgia, "Times New Roman", serif`;
    c.fillText(first ?? '', left, -h * 0.13, room);
    c.font = `italic 400 ${h * 0.2}px Georgia, "Times New Roman", serif`;
    c.fillStyle = 'rgba(96, 66, 40, 0.66)';
    c.fillText(second ?? '', left + h * 0.1, h * 0.22, room);
    c.strokeStyle = 'rgba(96, 66, 40, 0.3)';
    c.lineWidth = Math.max(1, h * 0.012);
    c.beginPath(); c.moveTo(left, h * 0.38); c.lineTo(w - h * 0.2, h * 0.36); c.stroke();
  }
  c.restore();
  if (glint && !showBack) amberGlint(c, x + Math.cos(angle) * w * 0.47 - Math.sin(angle) * -h * 0.52 * sy, y + Math.sin(angle) * w * 0.47 + Math.cos(angle) * -h * 0.52 * sy, h * 0.16);
}

/** A punched paper ticket, `w` wide, centred on (x, y): lines of text, a real hole if punched. */
export function drawTicket(c, x, y, { w = 260, angle = 0, lines = ['CITY LINE', 'ONE WAY · 1978'], punched = true, tone = '#e8c27a' } = {}) {
  const h = w * 0.46;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = h * 0.2; c.shadowOffsetY = h * 0.08;
  c.fillStyle = tone;
  roundRectPath(c, -w / 2, -h / 2, w, h, h * 0.06); c.fill();
  c.restore();
  c.fillStyle = 'rgba(107, 42, 34, 0.92)';
  c.fillRect(-w / 2, -h / 2, w * 0.14, h);
  c.fillStyle = 'rgba(42, 29, 20, 0.92)';
  c.textBaseline = 'middle';
  c.font = `700 ${h * 0.22}px "Space Mono", monospace`;
  c.fillText(lines[0] ?? '', -w / 2 + w * 0.2, -h * 0.16, w * 0.74);
  c.font = `700 ${h * 0.15}px "Space Mono", monospace`;
  c.fillText(lines[1] ?? '', -w / 2 + w * 0.2, h * 0.16, w * 0.74);
  ink(c, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], { w: Math.max(1.2, h * 0.02), closed: true, alpha: 0.7, bleed: false, jitter: 0.3, color: '#3a2a1a', seed: 8711 });
  if (punched) {
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(w * 0.36, -h * 0.18, h * 0.1, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(60,40,25,0.7)'; c.lineWidth = Math.max(1, h * 0.015);
    c.beginPath(); c.arc(w * 0.36, -h * 0.18, h * 0.105, 0, TAU); c.stroke();
  }
  c.restore();
}

/** A typed museum accession card, `w` wide, centred on (x, y). */
export function drawAccessionCard(c, x, y, { w = 420, angle = -0.02, lines = ['ACC. 1978-0412', 'VELEZ, M.', 'PENDING'] } = {}) {
  const h = w * 0.6;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = h * 0.12; c.shadowOffsetY = h * 0.05;
  c.fillStyle = vgrad(c, -h / 2, h / 2, [[0, '#efe4cc'], [1, '#dccfb0']]);
  c.fillRect(-w / 2, -h / 2, w, h);
  c.restore();
  c.strokeStyle = 'rgba(138, 42, 30, 0.55)'; c.lineWidth = Math.max(1, h * 0.008);
  for (let i = 0; i < 6; i += 1) { c.beginPath(); c.moveTo(-w / 2 + w * 0.06, -h * 0.2 + i * h * 0.12); c.lineTo(w / 2 - w * 0.06, -h * 0.2 + i * h * 0.12); c.stroke(); }
  c.fillStyle = 'rgba(42, 29, 20, 0.92)';
  c.textBaseline = 'alphabetic';
  c.font = `700 ${h * 0.11}px "Space Mono", monospace`;
  c.fillText(lines[0] ?? '', -w / 2 + w * 0.07, -h * 0.26, w * 0.86);
  c.font = `400 ${h * 0.1}px "Space Mono", monospace`;
  c.fillText(lines[1] ?? '', -w / 2 + w * 0.07, -h * 0.02, w * 0.86);
  if (lines[2]) {
    c.save(); c.translate(w * 0.18, h * 0.24); c.rotate(-0.08);
    c.font = `700 ${h * 0.12}px "Space Mono", monospace`;
    const tw = c.measureText(lines[2]).width + h * 0.1;
    c.strokeStyle = 'rgba(138, 42, 30, 0.85)'; c.lineWidth = Math.max(1, h * 0.012);
    c.strokeRect(-tw / 2, -h * 0.1, tw, h * 0.17);
    c.fillStyle = 'rgba(138, 42, 30, 0.88)'; c.textAlign = 'center';
    c.fillText(lines[2], 0, h * 0.035);
    c.restore();
  }
  c.restore();
}

/**
 * The orchard case (the title's, after titlePlateArt paintCase): a battered
 * case with brass corners and buckles. Bottom-left at (x, y), `s` stage units
 * per case unit (the case is 42 × 32). Returns where its handle is.
 */
export function drawOrchardCase(c, x, y, s, { lamp = null, light = 1 } = {}) {
  c.save();
  c.translate(x + 7 * s, y);
  c.scale(s, s);
  const body = new Path2D();
  if (body.roundRect) body.roundRect(-7, -31, 42, 32, 2.6); else body.rect(-7, -31, 42, 32);
  glow(c, 14, -2, 34, 'rgba(0, 0, 0, 1)', 0.45, 'source-over');
  c.fillStyle = vgrad(c, -31, 1, [[0, '#6e4627'], [0.5, '#5a3820'], [1, '#3e2614']]);
  c.fill(body);
  c.save();
  c.clip(body);
  wood(c, -7, -31, 42, 32, { base: 'rgba(0,0,0,0)', seed: 6531, grain: 'rgba(30, 16, 8, 0.25)', light: 'rgba(255, 220, 170, 0.06)' });
  c.fillStyle = 'rgba(20, 10, 4, 0.35)'; c.fillRect(-7, -24.5, 42, 1.2);
  c.fillStyle = '#3a2213'; c.fillRect(1, -31, 4.4, 32); c.fillRect(24.6, -31, 4.4, 32);
  c.fillStyle = 'rgba(255, 220, 170, 0.12)'; c.fillRect(-7, -31, 42, 2.4);
  // scuffs: it has been on the train since 1978
  const random = rng(8721);
  for (let i = 0; i < 14; i += 1) { c.fillStyle = `rgba(${random() > 0.5 ? '255, 220, 170' : '20, 10, 4'}, ${0.06 + random() * 0.1})`; c.fillRect(-6 + random() * 40, -30 + random() * 30, 1 + random() * 4, 0.6 + random() * 1.4); }
  c.restore();
  if (lamp) lampLit(c, body, (lamp.x - x - 7 * s) / s, (lamp.y - y) / s, 70, 0.8 * light);
  c.fillStyle = PAL.brass;
  [[-7, -31], [31, -31], [-7, -3], [31, -3]].forEach(([cx, cy]) => c.fillRect(cx, cy, 4, 4));
  [[1, -16], [24.6, -16]].forEach(([bx, by]) => { c.fillRect(bx - 0.4, by, 5.2, 3.6); c.fillStyle = '#2a1608'; c.fillRect(bx + 0.9, by + 1, 2.6, 1.6); c.fillStyle = PAL.brass; });
  c.fillStyle = PAL.brassLight; c.fillRect(12.4, -26.4, 3.2, 3.4);
  c.strokeStyle = '#2e1a0d'; c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(9, -31); c.quadraticCurveTo(14, -38, 19, -31); c.stroke();
  c.fillStyle = PAL.brass; c.fillRect(7.6, -32.4, 2.6, 2); c.fillRect(18, -32.4, 2.6, 2);
  ink(c, [[-7, -31], [35, -31], [35, 1], [-7, 1]], { w: 1.6 / s * 1.8, alpha: 0.65, closed: true, bleed: false, jitter: 0.2, seed: 6532 });
  ink(c, [[35, -31], [35, 1]], { w: 1.8 / s * 1.8, alpha: 0.7 * light, bleed: false, jitter: 0.1, color: '#ffc988', seed: 6533 });
  c.restore();
  return { handle: { x: x + 7 * s + 14 * s, y: y - 36 * s } };
}

// ---------------------------------------------------------------------------
// the worlds, each a small painting (the ending's folding panels; the 5→6
// cutscene stacks them round Butch): 'office', 'rooftops', 'square',
// 'painted', 'museum', painted into w × h at the context's origin.

export function paintWorld(c, kind, w, h, { seed = 8800 } = {}) {
  const random = rng(seed + kind.length * 31);
  c.save();
  c.beginPath(); c.rect(0, 0, w, h); c.clip();
  if (kind === 'office') {
    damaskWall(c, 0, 0, w, h * 0.78, { seed });
    wainscot(c, 0, w, h * 0.5, h * 0.78, { seed: seed + 1, panelW: w * 0.16 });
    floorboards(c, 0, w, h * 0.78, h, { seed: seed + 2, runner: [w * 0.45, w] });
    // the desk, the banker's lamp, the sign
    wood(c, w * 0.08, h * 0.56, w * 0.42, h * 0.22, { base: '#3f2819', seed: seed + 3, vertical: true });
    wood(c, w * 0.06, h * 0.54, w * 0.46, h * 0.035, { base: '#5a3a22', seed: seed + 4 });
    inkRect(c, w * 0.06, h * 0.54, w * 0.46, h * 0.035, { w: 2, seed: seed + 5 });
    c.fillStyle = vgrad(c, h * 0.42, h * 0.5, [[0, '#2f5a44'], [1, '#18302a']]);
    c.beginPath(); c.moveTo(w * 0.12, h * 0.5); c.quadraticCurveTo(w * 0.16, h * 0.42, w * 0.2, h * 0.5); c.closePath(); c.fill();
    lightCone(c, w * 0.16, h * 0.5, w * 0.08, h * 0.08, 0.3);
    c.fillStyle = '#5a2019';
    roundRectPath(c, w * 0.6, h * 0.55, w * 0.3, h * 0.12, 6); c.fill();
    c.fillStyle = '#efe4cc'; c.font = `700 ${h * 0.05}px "Space Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('LOST PROPERTY', w * 0.75, h * 0.61, w * 0.27);
    c.textAlign = 'left';
    for (let i = 0; i < 5; i += 1) parcel(c, w * (0.08 + i * 0.06), h * 0.24 - (i % 2) * h * 0.04, w * 0.05, h * 0.06 + (i % 2) * h * 0.04, { seed: seed + 10 + i });
    glow(c, w * 0.16, h * 0.52, w * 0.3, 'rgba(255, 196, 110, 0.9)', 0.25);
  } else if (kind === 'rooftops') {
    // Chapter 2: rain rooftops, teal and amber, a signal lit like a bell
    c.fillStyle = vgrad(c, 0, h, [[0, '#0b1a22'], [0.6, '#163039'], [1, '#0a1418']]);
    c.fillRect(0, 0, w, h);
    for (let layer = 0; layer < 3; layer += 1) {
      const base = h * (0.5 + layer * 0.15);
      c.fillStyle = ['#12262e', '#0e1e25', '#09151a'][layer];
      let x = -10;
      while (x < w + 10) {
        const bw = w * (0.08 + random() * 0.1);
        const bh = h * (0.15 + random() * 0.25) * (1 - layer * 0.2);
        c.fillRect(x, base - bh, bw, h);
        if (random() > 0.4) { c.beginPath(); c.moveTo(x, base - bh); c.lineTo(x + bw / 2, base - bh - h * 0.06); c.lineTo(x + bw, base - bh); c.fill(); }
        for (let wy = base - bh + h * 0.04; wy < base; wy += h * 0.06) {
          for (let wx = x + bw * 0.15; wx < x + bw * 0.85; wx += bw * 0.25) {
            if (random() > 0.55) { c.fillStyle = random() > 0.3 ? '#f2b866' : '#7fd0c8'; c.fillRect(wx, wy, bw * 0.1, h * 0.025); c.fillStyle = ['#12262e', '#0e1e25', '#09151a'][layer]; }
          }
        }
        ink(c, [[x, h], [x, base - bh], [x + bw, base - bh], [x + bw, h]], { w: 1.4, alpha: 0.3 + layer * 0.15, bleed: false, jitter: 0.4, seed: seed + Math.round(x) });
        x += bw + w * 0.01;
      }
    }
    // the signs coming on along the street, and the rain
    [0.2, 0.42, 0.66, 0.84].forEach((at, i) => { c.fillStyle = i % 2 ? '#e0a24a' : '#7fd0c8'; c.fillRect(w * at, h * 0.36 + i * h * 0.05, w * 0.05, h * 0.03); glow(c, w * at + w * 0.025, h * 0.375 + i * h * 0.05, w * 0.07, i % 2 ? 'rgba(255, 180, 90, 0.9)' : 'rgba(127, 208, 200, 0.9)', 0.4); });
    c.strokeStyle = 'rgba(220, 230, 235, 0.16)'; c.lineWidth = 1;
    for (let i = 0; i < 90; i += 1) { const rx = random() * w; const ry = random() * h; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 4, ry + 16); c.stroke(); }
  } else if (kind === 'square') {
    // Chapter 3: Echo City, warm afternoon stone, the clock at 14:20
    c.fillStyle = vgrad(c, 0, h, [[0, '#e9c48c'], [0.5, '#d9a86a'], [1, '#8a5e36']]);
    c.fillRect(0, 0, w, h);
    glow(c, w * 0.8, h * 0.15, w * 0.5, 'rgba(255, 236, 190, 0.9)', 0.5);
    const stone = ['#c48e5a', '#b27c4c', '#a06c40'];
    [[0, 0.3, 0.32], [0.3, 0.42, 0.4], [0.7, 0.3, 0.35]].forEach(([x0, bw, top], i) => {
      c.fillStyle = stone[i];
      c.fillRect(w * x0, h * top, w * bw, h);
      for (let wy = h * (top + 0.06); wy < h * 0.7; wy += h * 0.09) for (let wx = w * (x0 + 0.03); wx < w * (x0 + bw - 0.04); wx += w * 0.06) { c.fillStyle = 'rgba(70, 40, 20, 0.55)'; c.fillRect(wx, wy, w * 0.025, h * 0.05); }
      ink(c, [[w * x0, h], [w * x0, h * top], [w * (x0 + bw), h * top], [w * (x0 + bw), h]], { w: 1.8, alpha: 0.6, color: '#4a2c16', bleed: false, seed: seed + 20 + i });
    });
    // the clock tower in the middle
    c.fillStyle = '#9a6a3e'; c.fillRect(w * 0.45, h * 0.08, w * 0.1, h * 0.4);
    c.fillStyle = '#f1e2c0'; c.beginPath(); c.arc(w * 0.5, h * 0.2, h * 0.07, 0, TAU); c.fill();
    inkEllipse(c, w * 0.5, h * 0.2, h * 0.07, h * 0.07, { w: 1.8, color: '#4a2c16', bleed: false, seed: seed + 30 });
    ink(c, [[w * 0.5, h * 0.2], [w * 0.5 + h * 0.035, h * 0.2 + h * 0.015]], { w: 2.4, color: '#2a1a10', bleed: false, seed: seed + 31 });
    ink(c, [[w * 0.5, h * 0.2], [w * 0.5, h * 0.2 + h * 0.055]], { w: 1.8, color: '#2a1a10', bleed: false, seed: seed + 32 });
    c.fillStyle = vgrad(c, h * 0.7, h, [[0, '#b88a58'], [1, '#7a5230']]);
    c.fillRect(0, h * 0.7, w, h * 0.3);
    for (let i = 0; i < 12; i += 1) ink(c, [[w * i / 12 - w * 0.1, h], [w * 0.5 + (i - 6) * w * 0.02, h * 0.7]], { w: 1, alpha: 0.25, color: '#4a2c16', bleed: false, seed: seed + 40 + i });
  } else if (kind === 'painted') {
    // Chapter 4: pencil on paper, gouache blooms, the red hawthorn hedge
    c.fillStyle = '#ece3cf';
    c.fillRect(0, 0, w, h);
    speckle(c, 0, 0, w, h, { count: Math.round(w * h / 300), color: 'rgba(120, 100, 70, 0.1)', size: 1.6, seed: seed + 50 });
    const bloom = (x, y, r, color, a) => { c.save(); c.globalAlpha = a; c.fillStyle = color; for (let i = 0; i < 6; i += 1) { c.beginPath(); c.ellipse(x + (random() - 0.5) * r * 0.6, y + (random() - 0.5) * r * 0.4, r * (0.5 + random() * 0.5), r * (0.35 + random() * 0.4), random(), 0, TAU); c.fill(); } c.restore(); };
    bloom(w * 0.2, h * 0.45, w * 0.1, '#7f9a6a', 0.35);
    bloom(w * 0.42, h * 0.42, w * 0.09, '#8aa676', 0.3);
    bloom(w * 0.75, h * 0.25, w * 0.12, '#9ab8c8', 0.3);
    // the house and the orchard in pencil
    const pencil = { w: 1.4, color: '#4a4440', alpha: 0.75, bleed: false, jitter: 0.8 };
    ink(c, [[w * 0.55, h * 0.62], [w * 0.55, h * 0.4], [w * 0.65, h * 0.3], [w * 0.75, h * 0.4], [w * 0.75, h * 0.62]], { ...pencil, seed: seed + 51 });
    ink(c, [[w * 0.6, h * 0.62], [w * 0.6, h * 0.5], [w * 0.64, h * 0.5], [w * 0.64, h * 0.62]], { ...pencil, seed: seed + 52 });
    [0.12, 0.24, 0.36].forEach((at, i) => { inkEllipse(c, w * at, h * 0.42, w * 0.05, h * 0.08, { ...pencil, seed: seed + 53 + i }); ink(c, [[w * at, h * 0.5], [w * at, h * 0.62]], { ...pencil, seed: seed + 60 + i }); });
    ink(c, [[0, h * 0.62], [w, h * 0.6]], { ...pencil, seed: seed + 63 });
    // the hawthorn hedge in red gouache
    bloom(w * 0.3, h * 0.66, w * 0.08, '#b0342a', 0.55);
    bloom(w * 0.45, h * 0.67, w * 0.07, '#a02c24', 0.5);
    c.fillStyle = 'rgba(80, 60, 40, 0.55)'; c.font = `italic ${h * 0.06}px Georgia, serif`;
    c.fillText('ROSA', w * 0.82, h * 0.9);
  } else if (kind === 'museum') {
    // Chapter 5: walnut and brass in the dark, a lit case
    wood(c, 0, 0, w, h, { base: '#1c120b', vertical: true, seed: seed + 70, grain: 'rgba(0,0,0,0.4)' });
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, w, h);
    [0.2, 0.5, 0.8].forEach((at, i) => {
      c.fillStyle = 'rgba(255, 220, 160, 0.12)';
      c.fillRect(w * at - w * 0.08, h * 0.35, w * 0.16, h * 0.32);
      c.strokeStyle = brassFill(c, w * at - w * 0.08, h * 0.35, w * 0.16, h * 0.32); c.lineWidth = 3;
      c.strokeRect(w * at - w * 0.08, h * 0.35, w * 0.16, h * 0.32);
      glow(c, w * at, h * 0.45, w * 0.12, 'rgba(255, 210, 140, 0.9)', 0.3 + i * 0.05);
    });
    c.fillStyle = brassFill(c, 0, h * 0.8, w, 6); c.fillRect(0, h * 0.8, w, 6);
  } else {
    c.fillStyle = '#0d1424';
    c.fillRect(0, 0, w, h);
  }
  c.restore();
}
