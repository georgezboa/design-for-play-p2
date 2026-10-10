// The painted cutscenes' kit (round 9): George's paintings as plates, and the
// few live things drawn over them — joins between a picture and its twin,
// moving views behind keyed window glass, Chapter 1's painted figures, the
// words on tags and tickets, lamplight, rain, a sweep of passing light.
//
// Everything is drawn in stage units (1600 × 800, timeline.js STAGE). Plates
// are drawn straight from their images (never through a cached layer), so a
// zoom join can fly deep into one and it stays as sharp as the painting.
// docs/CUTSCENES_PAINTED.md is the storyboard; scripts/cutscene-art/build.py
// makes the plates (plates.generated.js).

import { PLATES, LINKS } from './plates.generated.js';
import SPRITE_ATLAS from '../../../chapters/nightService/spriteAtlas.js';
import { drawRain as inkRain } from '../painters.js';
import { rng } from '../../../chapters/nightService/art/ink.js';
import { FONT_SERIF, FONT_UI } from '../../../shared/fonts.js';
import { assetUrl } from '../../../shared/assetUrl.js';
import { BEZEL, CHROME_TEXTURES, RADIUS, brassFrame } from '../../../chapters/nightService/art/wallArt.js';

export const STAGE_W = 1600;
export const STAGE_H = 800;
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const smooth = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
/** 0 → 1 as t runs from a to b (smoothstep). */
export const ramp = (t, a, b) => smooth((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------------------
// images

const images = new Map();
function load(url) {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null);
  if (images.has(url)) return images.get(url).promise;
  const entry = { image: null };
  entry.promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      entry.image = image;
      // decode now, so the first frame that shows it does not stall
      Promise.resolve(image.decode?.()).catch(() => {}).then(() => resolve(image));
    };
    image.onerror = () => resolve(null);
    image.src = assetUrl(url);
  });
  images.set(url, entry);
  return entry.promise;
}
const loaded = (url) => images.get(url)?.image ?? null;

/** A plate's entry in plates.generated.js (null when it is not built). */
export function plateInfo(id) {
  return PLATES[id] ?? null;
}

/** The rect (stage units) where close-up `child` sits in its parent, solved by the build (or its fallback). */
export function linkRect(child, fallback = null) {
  return LINKS[child]?.rect ?? fallback;
}

/** The window glass of a keyed plate (stage units), or `fallback`. */
export function glassRect(id, fallback = null) {
  const g = PLATES[id]?.glass;
  return g ? g : fallback;
}

const spriteUrl = (file) => `${SPRITE_ATLAS.urlBase}/${file}`;

/**
 * Load a cutscene's pictures: plate ids, and sprites as 'kind:frame'
 * ('butch:walk-3', 'train:lit', 'mara:turn'). Resolves when every one has
 * loaded or failed (a missing one is simply not drawn).
 */
export function usePlates(ids = []) {
  return Promise.all(ids.map((id) => {
    if (id === 'chrome:bezel') return load(CHROME_TEXTURES.bezel.url);
    if (id.includes(':')) {
      const frame = spriteFrame(id);
      return frame ? load(spriteUrl(frame.file)) : Promise.resolve(null);
    }
    return load(PLATES[id]?.url);
  }));
}

export function plateImage(id) {
  return loaded(PLATES[id]?.url);
}

// ---------------------------------------------------------------------------
// plates

/**
 * Draw a plate over the rect (default: the whole stage). `src` crops the
 * plate (stage units of the plate). `alpha`, `filter` (a canvas filter, e.g.
 * 'brightness(0.7)'), `blend` (a composite op).
 */
export function drawPlate(c, id, { x = 0, y = 0, w = STAGE_W, h = STAGE_H, alpha = 1, src = null, filter = null, blend = null } = {}) {
  const image = plateImage(id);
  if (!image) return false;
  c.save();
  if (alpha !== 1) c.globalAlpha *= alpha;
  if (filter) c.filter = filter;
  if (blend) c.globalCompositeOperation = blend;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  if (src) {
    const kx = image.naturalWidth / STAGE_W;
    const ky = image.naturalHeight / STAGE_H;
    c.drawImage(image, src[0] * kx, src[1] * ky, src[2] * kx, src[3] * ky, x, y, w, h);
  } else {
    c.drawImage(image, x, y, w, h);
  }
  c.restore();
  return true;
}

/** A ragged front for wipes: the x of the edge at height y, for progress k. */
function frontAt(y, k, { band, seed, slant }) {
  const random = rng(seed);
  const p = [random(), random(), random(), random()];
  const wob = Math.sin((y / STAGE_H) * 6.1 + p[0] * 6) * 0.45 + Math.sin((y / STAGE_H) * 15.7 + p[1] * 6) * 0.22 + Math.sin((y / STAGE_H) * 31 + p[2] * 6) * 0.08;
  return -band + k * (STAGE_W + band * 2) + wob * band * 0.6 + (y / STAGE_H - 0.5) * slant;
}

/**
 * The second plate of a pair coming in over the first by `k` (0..1).
 *  mask 'fade'  — a crossfade;
 *  mask 'wipe'  — a soft, ragged front moving along `dir` ('right' | 'left' | 'down' | 'up'),
 *                 painted like a wet edge: `band` wide (stage units);
 *  mask 'rects' — each rect [x, y, w, h, start, end] crossfades on its own
 *                 (lamps going out, cases lighting), progress k in 0..1;
 *  mask 'radial'— from `center` [x, y] outwards to `radius`.
 */
export function drawPair(c, a, b, k, { mask = 'fade', dir = 'right', band = 160, seed = 11, slant = 0, rects = [], center = [800, 400], radius = 1000, x = 0, y = 0, w = STAGE_W, h = STAGE_H } = {}) {
  const t = clamp(k, 0, 1);
  if (a) drawPlate(c, a, { x, y, w, h });
  if (t <= 0 || !b) return;
  if (mask === 'fade' || t >= 1) {
    drawPlate(c, b, { x, y, w, h, alpha: mask === 'fade' ? smooth(t) : 1 });
    return;
  }
  if (mask === 'rects') {
    rects.forEach(([rx, ry, rw, rh, s0 = 0, s1 = 1]) => {
      const kk = ramp(t, s0, s1);
      if (kk <= 0) return;
      drawPlate(c, b, { x: rx, y: ry, w: rw, h: rh, src: [rx, ry, rw, rh], alpha: kk });
    });
    return;
  }
  // feathered masks: a few nested clips at rising alpha make a soft edge
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const f = (i + 1) / steps;
    c.save();
    c.beginPath();
    if (mask === 'radial') {
      const r = Math.max(0, t * radius - band * (1 - f));
      c.arc(center[0], center[1], r, 0, TAU);
    } else {
      const horizontal = dir === 'right' || dir === 'left';
      const span = horizontal ? STAGE_W : STAGE_H;
      const along = (q) => frontAt(q, t, { band, seed, slant }) - band * (1 - f);
      if (horizontal) {
        const flip = dir === 'left';
        c.moveTo(flip ? STAGE_W + 20 : -20, -20);
        for (let yy = -20; yy <= STAGE_H + 20; yy += 20) {
          const xx = along(yy) * (span / STAGE_W);
          c.lineTo(flip ? STAGE_W - xx : xx, yy);
        }
        c.lineTo(flip ? STAGE_W + 20 : -20, STAGE_H + 20);
      } else {
        const flip = dir === 'up';
        c.moveTo(-20, flip ? STAGE_H + 20 : -20);
        for (let xx = -20; xx <= STAGE_W + 20; xx += 20) {
          const yy = along(xx * (STAGE_H / STAGE_W)) * (STAGE_H / STAGE_W);
          c.lineTo(xx, flip ? STAGE_H - yy : yy);
        }
        c.lineTo(STAGE_W + 20, flip ? STAGE_H + 20 : -20);
      }
      c.closePath();
    }
    c.clip();
    drawPlate(c, b, { x, y, w, h, alpha: 1 / (steps - i) });
    c.restore();
  }
}

/**
 * How a window plate shows its moving view: the glass rect, and where a view
 * plate laid at strip position `x` lands for a scroll. Views are drawn at the
 * glass's height (a little over, so its edges never show) and twice as wide.
 */
export function windowLayout(frameId, { glass = null } = {}) {
  const g = glass ?? glassRect(frameId, [400, 200, 800, 400]);
  // the view is a 2 : 1 strip at least as tall as the glass and at least as wide (a wide pane, a short one)
  const vh = Math.max(g[3] * 1.08, (g[2] * 1.02) / 2);
  const vy = g[1] - (vh - g[3]) / 2;
  const vw = vh * 2;
  return {
    glass: g, vh, vy, vw,
    /** The stage rect of view `v` ({ x, w? }) at this scroll. */
    place: (v, scroll = 0) => ({ x: g[0] + (v.x ?? 0) - scroll, y: vy + (v.y ?? 0), w: v.w ?? vw, h: vh }),
    /** A point (px, py) of a view plate (its own stage units) on the stage. */
    point: (v, px, py, scroll = 0) => {
      const r = { x: g[0] + (v.x ?? 0) - scroll, y: vy + (v.y ?? 0), w: v.w ?? vw, h: vh };
      return [r.x + (px / STAGE_W) * r.w, r.y + (py / STAGE_H) * r.h, r.w / STAGE_W];
    },
  };
}

/**
 * A window plate (its glass keyed out) with a moving view behind it. `views`:
 * [{ id, x }] plates laid end to end along the strip (stage units; each one
 * windowLayout().vw wide unless `w` says otherwise); `scroll` moves the strip
 * left by that much. `blur` (0..1) smears it sideways, as the view out of a
 * fast train. `over(c, layout)` draws on the view, inside the glass (lights
 * coming on, rain on the pane).
 */
export function drawWindowView(c, frameId, views, { scroll = 0, glass = null, blur = 0, tint = null, over = null } = {}) {
  const L = windowLayout(frameId, { glass });
  const [gx, gy, gw, gh] = L.glass;
  c.save();
  c.beginPath();
  c.rect(gx - 2, gy - 2, gw + 4, gh + 4);
  c.clip();
  c.fillStyle = '#05070b';
  c.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
  const smear = blur > 0 ? [0, 0.33, 0.66] : [0];
  smear.forEach((s, i) => {
    views.forEach((v) => {
      const r = L.place(v, scroll + s * blur * 60);
      if (r.x > gx + gw || r.x + r.w < gx) return;
      drawPlate(c, v.id, { ...r, alpha: (i ? 0.33 : 1) * (v.alpha ?? 1), filter: v.filter ?? null });
    });
  });
  if (tint) {
    c.fillStyle = tint;
    c.fillRect(gx, gy, gw, gh);
  }
  if (over) over(c, L);
  c.restore();
  drawPlate(c, frameId);
  return L;
}

// ---------------------------------------------------------------------------
// Chapter 1's painted figures (public/assets/ch1-painted/sprites)

/** 'butch:walk-3' → its atlas frame, or null. Kinds: butch, conductor, mara, train. */
export function spriteFrame(key) {
  const [kind, name] = key.split(':');
  if (kind === 'train') return SPRITE_ATLAS.train?.frames?.[name] ?? null;
  return SPRITE_ATLAS.characters?.[kind]?.frames?.[name] ?? null;
}

/**
 * Draw a figure frame with its pivot (the feet, the train's rails) at (x, y),
 * `height` stage units tall (the character's full standing height, as the
 * rig's; for 'train:lit' / 'train:dark' the carriage's length), facing
 * right unless `flip`. `light` (0..1) darkens it into the scene's shadow;
 * `alpha` fades it.
 */
export function drawFigure(c, key, x, y, height, { flip = false, alpha = 1, light = 1, glow = null } = {}) {
  const frame = spriteFrame(key);
  if (!frame) return null;
  const image = loaded(spriteUrl(frame.file));
  if (!image) return null;
  const [kind] = key.split(':');
  const spec = kind === 'train' ? SPRITE_ATLAS.train : SPRITE_ATLAS.characters[kind];
  // a character's `height` is its standing height; the train's is its length
  const s = height / (kind === 'train' ? spec.length : spec.frameHeight);
  c.save();
  if (alpha !== 1) c.globalAlpha *= alpha;
  c.translate(x, y);
  if (flip) c.scale(-1, 1);
  if (light < 1) c.filter = `brightness(${Math.max(0.05, light).toFixed(3)})`;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(image, -frame.pivot[0] * s, -frame.pivot[1] * s, frame.w * s, frame.h * s);
  c.restore();
  if (glow && frame.anchors?.glow) {
    const [ax, ay] = frame.anchors.glow;
    const gx = x + (flip ? -1 : 1) * (ax - frame.pivot[0]) * s;
    const gy = y + (ay - frame.pivot[1]) * s;
    lampGlow(c, gx, gy, height * 0.5, glow);
  }
  return { s, frame };
}

/** The walk (or carry) frame for a figure that has walked `distance` stage units at `height`. */
export function walkFrame(kind, distance, height, cycle = 'walk') {
  const spec = SPRITE_ATLAS.characters?.[kind];
  const cyc = spec?.cycles?.[cycle];
  if (!cyc) return `${kind}:stand`;
  // the cycle's stride is in rig units at the rig's height
  const stride = cyc.stride * (height / spec.rigHeight) * cyc.steps;
  const phase = ((distance / stride) % 1 + 1) % 1;
  let index = 0;
  cyc.at.forEach((at, i) => { if (phase >= at) index = i; });
  return `${kind}:${cyc.frames[index]}`;
}

// ---------------------------------------------------------------------------
// words on paper: tags, tickets, the letter, the card, plates and stamps

const FACES = {
  print: (size, weight = 500) => `${weight} ${size}px ${FONT_UI}`,
  serif: (size, weight = 400) => `${weight} ${size}px ${FONT_SERIF}`,
  hand: (size, weight = 400) => `italic ${weight} ${size}px ${FONT_SERIF}`,
};

/**
 * Words set onto a painted surface. `at`: { x, y, rot (radians), skewX,
 * scaleY } — the surface's centre and its lie. `lines`: strings, set from the
 * centre down by `leading`. `face`: 'print' (Jost caps, tracked), 'serif',
 * 'hand' (EB Garamond italic, a little unsteady). `ink`: the colour; `blend`
 * 'multiply' lets the paper's grain through. `reveal` (0..1) types or writes
 * it in, character by character. `fade` (0..1) for old ink.
 */
export function drawWords(c, lines, at, { face = 'print', size = 20, weight, ink = '#2a1c12', blend = 'multiply', tracking = 0.12, leading = 1.35, align = 'center', reveal = 1, fade = 1, seed = 1, jitter = 0 } = {}) {
  const list = Array.isArray(lines) ? lines : [lines];
  const total = list.reduce((n, l) => n + l.length, 0);
  let shown = Math.floor(total * clamp(reveal, 0, 1) + 1e-6);
  c.save();
  c.translate(at.x, at.y);
  if (at.rot) c.rotate(at.rot);
  if (at.skewX || at.scaleY) c.transform(1, 0, at.skewX ?? 0, at.scaleY ?? 1, 0, 0);
  if (blend) c.globalCompositeOperation = blend;
  c.globalAlpha *= clamp(fade, 0, 1);
  c.fillStyle = ink;
  c.textBaseline = 'middle';
  c.font = FACES[face](size, weight);
  const random = rng(seed);
  const lineH = size * leading;
  const y0 = -((list.length - 1) * lineH) / 2;
  list.forEach((line, li) => {
    if (shown <= 0) return;
    const text = line.slice(0, shown);
    shown -= line.length;
    const track = size * tracking;
    const widths = [...line].map((ch) => c.measureText(ch).width + track);
    const full = widths.reduce((s, v) => s + v, 0) - track;
    let x = align === 'center' ? -full / 2 : align === 'right' ? -full : 0;
    [...text].forEach((ch, i) => {
      const jx = jitter ? (random() - 0.5) * jitter : 0;
      const jy = jitter ? (random() - 0.5) * jitter : 0;
      const jr = jitter ? (random() - 0.5) * jitter * 0.02 : 0;
      c.save();
      c.translate(x + jx, y0 + li * lineH + jy);
      if (jr) c.rotate(jr);
      c.fillText(ch, 0, 0);
      c.restore();
      x += widths[i];
    });
  });
  c.restore();
}

/** A rubber stamp: a ragged inked box with a word, landing at `k` (0..1: drops, presses, stays). */
export function drawStamp(c, word, x, y, k, { size = 64, ink = '#9a2a1e', rot = -0.12, seed = 7 } = {}) {
  if (k <= 0) return;
  const land = ramp(k, 0, 0.35);
  const scale = lerp(1.6, 1, land);
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(scale, scale);
  c.globalAlpha *= land * 0.88;
  c.globalCompositeOperation = 'multiply';
  c.font = FACES.print(size, 700);
  const tw = c.measureText(word).width + size * 0.25 * word.length;
  const bw = tw + size * 0.7;
  const bh = size * 1.45;
  const random = rng(seed);
  c.strokeStyle = ink;
  c.lineWidth = size * 0.09;
  c.beginPath();
  const pts = [[-bw / 2, -bh / 2], [bw / 2, -bh / 2], [bw / 2, bh / 2], [-bw / 2, bh / 2]];
  pts.forEach(([px, py], i) => (i ? c.lineTo(px + (random() - 0.5) * 3, py + (random() - 0.5) * 3) : c.moveTo(px, py)));
  c.closePath();
  c.stroke();
  c.restore();
  drawWords(c, word, { x, y, rot }, { face: 'print', size: size * scale, weight: 700, ink, tracking: 0.25, fade: land * 0.88, seed, jitter: 1.2 });
  // the ink is uneven: a few dry gaps
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) {
    c.globalAlpha = 0.25 + random() * 0.4;
    c.fillStyle = '#000';
    c.beginPath();
    c.ellipse((random() - 0.5) * bw, (random() - 0.5) * bh, 2 + random() * 9, 1 + random() * 3, random() * 3, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// light, weather, time

/** A lamp's warm light, added over the plate: radius r, a slight flicker over env.wall. */
export function lampGlow(c, x, y, r, { color = [255, 196, 120], alpha = 0.5, flicker = 0.06, env = null, seed = 3 } = {}) {
  const w = env && !env.reducedMotion ? env.wall : 0;
  const f = 1 - flicker + flicker * (0.6 * Math.sin(w * 7.3 + seed) + 0.4 * Math.sin(w * 17.9 + seed * 2.1));
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  const [R, G, B] = color;
  g.addColorStop(0, `rgba(${R},${G},${B},${(alpha * f).toFixed(3)})`);
  g.addColorStop(0.35, `rgba(${R},${G},${B},${(alpha * f * 0.38).toFixed(3)})`);
  g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}

/** Darkness closing in by `k` (0..1), sparing a pool of light at `pool` [x, y, r] (a lamp burning low). */
export function lampsDown(c, k, { pool = null, color = '4, 3, 2', max = 0.82 } = {}) {
  if (k <= 0) return;
  c.save();
  if (pool) {
    const [x, y, r] = pool;
    const g = c.createRadialGradient(x, y, r * 0.15, x, y, r);
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(1, `rgba(${color},${(max * k).toFixed(3)})`);
    c.fillStyle = g;
  } else {
    c.fillStyle = `rgba(${color},${(max * k).toFixed(3)})`;
  }
  c.fillRect(-50, -50, STAGE_W + 100, STAGE_H + 100);
  c.restore();
}

/** A band of light sweeping across (a lamp passing outside a window): position k (0..1). */
export function lightSweep(c, k, { angle = -0.35, width = 260, alpha = 0.35, color = '255, 214, 160', rect = null } = {}) {
  if (k <= 0 || k >= 1) return;
  const [x0, y0, w0, h0] = rect ?? [0, 0, STAGE_W, STAGE_H];
  const cx = x0 - width + k * (w0 + width * 2);
  c.save();
  c.beginPath();
  c.rect(x0, y0, w0, h0);
  c.clip();
  c.translate(cx, y0 + h0 / 2);
  c.rotate(angle);
  const g = c.createLinearGradient(-width / 2, 0, width / 2, 0);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(0.5, `rgba(${color},${alpha})`);
  g.addColorStop(1, `rgba(${color},0)`);
  c.globalCompositeOperation = 'screen';
  c.fillStyle = g;
  c.fillRect(-width / 2, -h0 * 1.5, width, h0 * 3);
  c.restore();
}

/** Rain over the visible part of the stage (the cutscene ink rain, finer for paintings). */
export function rain(c, env, opts = {}) {
  inkRain(c, env, { alpha: 0.45, speed: 700, drift: -0.22, scale: 0.8, ...opts });
}

/** Dust motes drifting in a beam of light (Echo City's sun, a lamp's cone). */
export function motes(c, env, rect, { count = 70, seed = 21, color = '255, 236, 200', size = 1.6, alpha = 0.55 } = {}) {
  const [x, y, w, h] = rect;
  const random = rng(seed);
  const t = env.reducedMotion ? 0 : env.wall;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (env.lowGraphics ? count / 3 : count); i++) {
    const px = x + ((random() * w + t * (6 + random() * 10)) % w);
    const py = y + ((random() * h + Math.sin(t * 0.6 + i) * 6 - t * (2 + random() * 3)) % h + h) % h;
    const a = alpha * (0.4 + 0.6 * Math.sin(t * (0.8 + random()) + i) ** 2);
    c.fillStyle = `rgba(${color},${a.toFixed(3)})`;
    c.beginPath();
    c.arc(px, py, size * (0.5 + random()), 0, TAU);
    c.fill();
  }
  c.restore();
}

/** Loose pages flying past (the tunnel of records): `speed` stage units/s leftwards. */
export function pages(c, env, rect, { count = 18, seed = 31, speed = 900, tone = '233, 223, 200' } = {}) {
  const [x, y, w, h] = rect;
  const random = rng(seed);
  const t = env.reducedMotion ? 0 : env.wall;
  c.save();
  for (let i = 0; i < (env.lowGraphics ? count / 2 : count); i++) {
    const v = speed * (0.6 + random() * 0.8);
    const px = x + w - (((random() * (w + 200)) + t * v) % (w + 200)) + 100;
    const py = y + random() * h + Math.sin(t * 3 + i) * 14;
    const s = 10 + random() * 22;
    c.save();
    c.translate(px, py);
    c.rotate(Math.sin(t * (2 + random() * 3) + i) * 0.9);
    c.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(t * 4 + i)));
    c.fillStyle = `rgba(${tone},${(0.55 + random() * 0.3).toFixed(2)})`;
    c.fillRect(-s / 2, -s * 0.65, s, s * 1.3);
    c.restore();
  }
  c.restore();
}

/**
 * Colour coming back into a pencil drawing at (x, y): a faint wash, then a
 * cluster of small flecks (hawthorn berries, petals) inked in one by one as
 * `k` goes 0 → 1, the way a hand would colour them. `r` is the cluster's size.
 */
export function bloom(c, x, y, r, k, { color = [176, 52, 42], seed = 41, alpha = 0.85, count = 34 } = {}) {
  if (k <= 0) return;
  const random = rng(seed);
  const [R, G, B] = color;
  c.save();
  c.globalCompositeOperation = 'multiply';
  // the wash, light, under the flecks
  const wash = smooth(clamp(k * 1.6, 0, 1));
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${R},${G},${B},${(alpha * 0.16 * wash).toFixed(3)})`);
  g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y, r, r * 0.62, 0, 0, TAU);
  c.fill();
  // the flecks: denser in the middle, each landing a little after the one before
  for (let i = 0; i < count; i++) {
    const a = random() * TAU;
    const d = Math.sqrt(random()) * r * 0.8;
    const size = r * (0.045 + random() * 0.05);
    const on = smooth(clamp((k - (i / count) * 0.75) / 0.25, 0, 1));
    if (on <= 0) continue;
    const fx = x + Math.cos(a) * d;
    const fy = y + Math.sin(a) * d * 0.6;
    c.fillStyle = `rgba(${R},${G},${B},${(alpha * (0.55 + 0.4 * random()) * on).toFixed(3)})`;
    c.beginPath();
    c.ellipse(fx, fy, size * on, size * (0.75 + random() * 0.25) * on, random() * 3, 0, TAU);
    c.fill();
  }
  c.restore();
}

/** Clock hands on a painted face: centre (x, y), radius r, at hh:mm. */
export function clockHands(c, x, y, r, hh, mm, { ink = '#1a120c' } = {}) {
  const m = (mm / 60) * TAU;
  const h = ((hh % 12) / 12 + mm / 720) * TAU;
  c.save();
  c.translate(x, y);
  c.strokeStyle = ink;
  c.lineCap = 'round';
  [[h, r * 0.52, r * 0.09], [m, r * 0.8, r * 0.055]].forEach(([a, len, wd]) => {
    c.lineWidth = wd;
    c.beginPath();
    c.moveTo(-Math.sin(a) * len * 0.12, Math.cos(a) * len * 0.12);
    c.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
    c.stroke();
  });
  c.fillStyle = ink;
  c.beginPath();
  c.arc(0, 0, r * 0.07, 0, TAU);
  c.fill();
  c.restore();
}

/** The carriage's sway: a small offset and roll to apply around the stage centre (none under Reduce Motion). */
export function sway(c, env, { amp = 1, period = 3.4 } = {}) {
  if (env.reducedMotion) return;
  const w = env.wall;
  const dx = Math.sin(w * TAU / period) * 2.2 * amp;
  const dy = Math.sin(w * TAU / (period * 0.5) + 0.7) * 1.1 * amp;
  const rot = Math.sin(w * TAU / period + 1.3) * 0.0016 * amp;
  c.translate(STAGE_W / 2 + dx, STAGE_H / 2 + dy);
  c.rotate(rot);
  c.translate(-STAGE_W / 2, -STAGE_H / 2);
}

/** A soft vignette over the stage, to sit a plate in the frame. */
export function vignette(c, { alpha = 0.45 } = {}) {
  const g = c.createRadialGradient(STAGE_W / 2, STAGE_H / 2, STAGE_H * 0.4, STAGE_W / 2, STAGE_H / 2, STAGE_W * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${alpha})`);
  c.save();
  c.fillStyle = g;
  c.fillRect(0, 0, STAGE_W, STAGE_H);
  c.restore();
}

export { FONT_SERIF, FONT_UI };

/**
 * A sign or a window coming on: a soft glow over the rect, and the rect's
 * own light, `k` 0..1 (it stutters on, as an old tube does, over the first
 * fifth). `color` [r, g, b].
 */
export function signLight(c, x, y, w, h, k, { color = [110, 214, 204], alpha = 0.55, env = null, seed = 5 } = {}) {
  if (k <= 0) return;
  const random = rng(seed);
  const flick = k < 0.2 ? (Math.sin(k * 120 + random() * 6) > -0.2 ? 1 : 0.25) * (k / 0.2) : 1;
  const hum = env && !env.reducedMotion ? 0.94 + 0.06 * Math.sin(env.wall * 9 + seed) : 1;
  const a = alpha * flick * hum;
  const [R, G, B] = color;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const r = Math.max(w, h) * 1.1;
  const g = c.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, r);
  g.addColorStop(0, `rgba(${R},${G},${B},${(a * 0.6).toFixed(3)})`);
  g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  c.fillStyle = g;
  c.fillRect(x + w / 2 - r, y + h / 2 - r, r * 2, r * 2);
  c.fillStyle = `rgba(${R},${G},${B},${(a * 0.5).toFixed(3)})`;
  c.fillRect(x, y, w, h);
  c.restore();
}

/**
 * A plate hung as one of Chapter 1's windows inside the picture (the worlds
 * stacked around Butch, folding back into one carriage): the plate in the
 * rect, its corners rounded, George's painted bezel round it, its shadow on
 * whatever is behind. `t` is the bezel's thickness (stage units).
 */
export function drawFramedPlate(c, id, rect, { alpha = 1, t = 14, shadow = 0.6, light = 1 } = {}) {
  const [x, y, w, h] = rect;
  if (alpha <= 0 || w < 2 || h < 2) return;
  const r = Math.min(w, h) * 0.06;
  const bezel = loaded(CHROME_TEXTURES.bezel.url);
  c.save();
  c.globalAlpha *= alpha;
  c.save();
  c.shadowColor = `rgba(0,0,0,${shadow})`;
  c.shadowBlur = t * 2.2;
  c.shadowOffsetY = t * 0.5;
  c.fillStyle = '#120c07';
  c.beginPath();
  c.roundRect?.(x - t, y - t, w + t * 2, h + t * 2, r + t);
  c.fill();
  c.restore();
  c.save();
  c.beginPath();
  c.roundRect?.(x, y, w, h, r);
  c.clip();
  // cover-fit the 2 : 1 plate into the window
  const k = Math.max(w / STAGE_W, h / STAGE_H);
  const pw = STAGE_W * k;
  const ph = STAGE_H * k;
  drawPlate(c, id, { x: x + (w - pw) / 2, y: y + (h - ph) / 2, w: pw, h: ph, filter: light < 1 ? `brightness(${light.toFixed(3)})` : null });
  c.restore();
  if (bezel) brassFrame(c, bezel, x - t, y - t, w + t * 2, h + t * 2, t * 1.1, { rivets: 'mid', seed: 5 });
  else {
    c.strokeStyle = '#6e5532';
    c.lineWidth = t;
    c.beginPath();
    c.roundRect?.(x - t / 2, y - t / 2, w + t, h + t, r + t / 2);
    c.stroke();
  }
  c.restore();
}
export { BEZEL, RADIUS };
