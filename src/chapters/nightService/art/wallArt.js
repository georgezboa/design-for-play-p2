// The carriage wall around the windows (spec §5): walnut, brass trim and
// screws, lamps between the windows, and a brass sill for captions. Painted
// once per layout into a 1920×1080 canvas. Also the per-window brass bezel
// and vignette canvases.
//
// Round 7 · the painted chrome. Chapter 1 (and the Museum's one-answer
// exhibit, the same PanelScene) passes `chrome` — George's painted bezel
// and walnut (art-src C-bezel.png → scripts/ch1-art/chrome-build.py →
// public/assets/ch1-painted/chrome/): matte, worn brass and dark walnut in
// the plates' own inked gouache, so the frames recede like a proscenium and
// the paintings are the stars. The bezel is a 9-slice of the painted ring
// (its corners, one seamless band strip, its four slotted screws); the wall
// tiles the seamless walnut. Until the textures are in (or if they fail to
// load) the same shapes are drawn in flat matte colours. Callers that pass
// no `chrome` (the finale's Movement I floor) keep the round-6 look.

import { PAL, brassFill, glow, ink, rivet, rng, roundRectPath, vgrad, wood, paperGrain } from './ink.js';

export const BEZEL = 13;
/** The painted band reaches this far over the picture (covers the anti-aliased join). */
export const BEZEL_LIP = 1.5;

/** The processed chrome (scripts/ch1-art/chrome-build.py), served from public/. */
export const CHROME_DIR = '/assets/ch1-painted/chrome';
export const CHROME_TEXTURES = Object.freeze({
  bezel: Object.freeze({ key: 'nsv-chrome-bezel', url: `${CHROME_DIR}/bezel.webp` }),
  walnut: Object.freeze({ key: 'nsv-chrome-walnut', url: `${CHROME_DIR}/walnut.webp` }),
});

/**
 * The bezel atlas, as chrome-build.py packs it (mirrors chrome.json; the
 * tests check they agree). Atlas px. The strip is the straight band with
 * its outer edge up, seamless end to end; each corner fades out along its
 * two straight arms (`feather`) where the strip runs in underneath.
 * Screws: top, bottom, left, right side, as painted.
 */
export const CHROME_ATLAS = Object.freeze({
  size: Object.freeze([596, 163]),
  T: 40,
  corner: Object.freeze({ size: 123, feather: 18, tl: Object.freeze([0, 0]), tr: Object.freeze([123, 0]), bl: Object.freeze([246, 0]), br: Object.freeze([369, 0]), innerRadius: 58 }),
  rivet: Object.freeze({ size: 26, at: Object.freeze([Object.freeze([492, 0]), Object.freeze([518, 0]), Object.freeze([544, 0]), Object.freeze([570, 0])]) }),
  strip: Object.freeze({ x: 0, y: 123, w: 568, h: 40 }),
  walnut: Object.freeze({ size: Object.freeze([625, 535]) }),
});

/** The window hole's corner radius (tile px): the painted ring's own inner curve. */
export const RADIUS = Math.round((CHROME_ATLAS.corner.innerRadius * (BEZEL + BEZEL_LIP)) / CHROME_ATLAS.T);
const LEGACY_RADIUS = 16;

// the matte palette (aged brass, dark walnut) the textures are graded to;
// the fallback and the small procedural bits (lamp shades, glints) use it
const MATTE = Object.freeze({
  brass: '#6e5532',
  brassDeep: '#3d2c17',
  brassLit: '#8f7244',
  inkDark: 'rgba(10, 7, 5, 0.9)',
  walnut: '#1a110b',
  walnutDeep: '#100a06',
  lamp: 'rgba(255, 196, 120, 1)',
});

// ---------------------------------------------------------------------------
// layout of the wall (shared with PanelScene's live lamps)

/**
 * Where the wall's pieces sit for a layout: the raised panel round the
 * window group (its pad grows with a large grid's bezels, so the trim keeps
 * the same breathing room), the lamps over the gutters and the outer edges,
 * and the sill (captions and the stone sockets hang off `sillY`).
 */
export function wallGeometry(layout, { painted = true } = {}) {
  const k = layout.scale ?? 1;
  const pad = painted ? Math.round(34 + BEZEL * Math.max(0, k - 1)) : 34;
  const gx = layout.x - pad;
  const gy = layout.y - pad;
  const gw = layout.w + pad * 2;
  const gh = layout.h + pad * 2;
  const lamps = [];
  for (let col = 0; col <= layout.cols; col += 1) {
    const x = col === 0 ? layout.x - pad * 0.5 : col === layout.cols ? layout.x + layout.w + pad * 0.5 : layout.slots[col].x - layout.gutter / 2;
    lamps.push({ x, y: gy - 6 });
  }
  return { k, pad, gx, gy, gw, gh, lamps, sillY: gy + gh + 22 };
}

// ---------------------------------------------------------------------------
// painted chrome helpers

const stripCache = new WeakMap();

function makeCanvas(w, h) {
  const canvas = globalThis.document?.createElement?.('canvas') ?? new OffscreenCanvas(w, h);
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  return canvas;
}

/** The band strip drawn `t` px thick (cached per atlas and thickness). */
function scaledStrip(atlas, t) {
  let byT = stripCache.get(atlas);
  if (!byT) { byT = new Map(); stripCache.set(atlas, byT); }
  const key = Math.round(t * 8) / 8;
  let canvas = byT.get(key);
  if (!canvas) {
    const { strip, T } = CHROME_ATLAS;
    canvas = makeCanvas(Math.round(strip.w * (t / T)), t);
    const x = canvas.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(atlas, strip.x, strip.y, strip.w, strip.h, 0, 0, canvas.width, t);
    byT.set(key, canvas);
  }
  return canvas;
}

/** Tile the strip along +x from 0 to `len` (outer edge at y = 0); `phase` 0..1 shifts the start. */
function bandRun(c, strip, len, t, phase = 0) {
  const sw = strip.width;
  c.save();
  c.beginPath();
  c.rect(0, 0, len, t);
  c.clip();
  // one px of overlap per repeat, so no hairline shows between them
  for (let x = -Math.floor(phase * sw); x < len; x += sw - 1) c.drawImage(strip, x, 0);
  c.restore();
}

/**
 * A painted brass frame (9-slice): a band `t` px thick whose outer edge is
 * the rect. `rivets`: 'mid' (one screw mid-side, as painted), a spacing in
 * px (a centred row along each side), or 0.
 */
export function brassFrame(c, atlas, x, y, w, h, t, { rivets = 'mid', seed = 1, rivetScale = 1, rivetAlpha = 1 } = {}) {
  const A = CHROME_ATLAS;
  const f = t / A.T;
  const cs = A.corner.size * f;
  const arm = (A.corner.size - A.corner.feather) * f;
  const strip = scaledStrip(atlas, t);
  const random = rng(seed);
  c.save();
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  const run = (ox, oy, rot, len) => {
    c.save();
    c.translate(ox, oy);
    c.rotate(rot);
    bandRun(c, strip, len, t, random());
    c.restore();
  };
  run(x + arm, y, 0, w - arm * 2);
  run(x + w - arm, y + h, Math.PI, w - arm * 2);
  run(x, y + h - arm, -Math.PI / 2, h - arm * 2);
  run(x + w, y + arm, Math.PI / 2, h - arm * 2);
  const corner = ([sx, sy], dx, dy) => c.drawImage(atlas, sx, sy, A.corner.size, A.corner.size, dx, dy, cs, cs);
  corner(A.corner.tl, x, y);
  corner(A.corner.tr, x + w - cs, y);
  corner(A.corner.bl, x, y + h - cs);
  corner(A.corner.br, x + w - cs, y + h - cs);
  // the screws
  const rs = A.rivet.size * f * rivetScale;
  const screw = (side, px, py) => {
    const [sx, sy] = A.rivet.at[side];
    c.drawImage(atlas, sx, sy, A.rivet.size, A.rivet.size, px - rs / 2, py - rs / 2, rs, rs);
  };
  c.globalAlpha = rivetAlpha;
  if (rivets === 'mid') {
    screw(0, x + w / 2, y + t / 2);
    screw(1, x + w / 2, y + h - t / 2);
    screw(2, x + t / 2, y + h / 2);
    screw(3, x + w - t / 2, y + h / 2);
  } else if (rivets > 0) {
    const row = (len) => {
      const n = Math.floor((len - cs * 2) / rivets);
      return Array.from({ length: n + 1 }, (_, i) => (i - n / 2) * rivets);
    };
    row(w).forEach((d) => { screw(Math.floor(random() * 4), x + w / 2 + d, y + t / 2); screw(Math.floor(random() * 4), x + w / 2 + d, y + h - t / 2); });
    row(h).forEach((d) => { screw(Math.floor(random() * 4), x + t / 2, y + h / 2 + d); screw(Math.floor(random() * 4), x + w - t / 2, y + h / 2 + d); });
  }
  c.restore();
}

/** A moulded brass rail `h` px tall (the band strip), rounded ends, inked. */
export function brassBar(c, atlas, x, y, w, h, { seed = 3, radius = h / 2, shade = 0 } = {}) {
  const random = rng(seed);
  c.save();
  roundRectPath(c, x, y, w, h, radius);
  c.clip();
  if (atlas) {
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.translate(x, y);
    bandRun(c, scaledStrip(atlas, h), w, h, random());
    c.translate(-x, -y);
  } else {
    c.fillStyle = vgrad(c, y, y + h, [[0, MATTE.brassLit], [0.5, MATTE.brass], [1, MATTE.brassDeep]]);
    c.fillRect(x, y, w, h);
  }
  if (shade) { c.fillStyle = `rgba(8, 5, 3, ${shade})`; c.fillRect(x, y, w, h); }
  c.restore();
  c.save();
  c.lineWidth = 1;
  c.strokeStyle = MATTE.inkDark;
  roundRectPath(c, x + 0.5, y + 0.5, w - 1, h - 1, radius);
  c.stroke();
  c.restore();
}

/** A walnut fill over a rect: the seamless tile, optionally turned (horizontal grain). */
function walnutFill(c, img, x, y, w, h, { turn = false, dx = 0, dy = 0, scale = 1 } = {}) {
  const pattern = c.createPattern(img, 'repeat');
  if (pattern?.setTransform && typeof DOMMatrix !== 'undefined') {
    let m = new DOMMatrix().translate(dx, dy);
    if (turn) m = m.rotate(90);
    if (scale !== 1) m = m.scale(scale);
    pattern.setTransform(m);
  }
  c.save();
  c.fillStyle = pattern ?? MATTE.walnut;
  c.fillRect(x, y, w, h);
  c.restore();
}

/** A small matte sconce (a shade over the gutter) with a dim warm underside. */
function sconce(c, atlas, x, y, { low = false } = {}) {
  const path = () => { c.beginPath(); c.moveTo(x - 16, y); c.lineTo(x + 16, y); c.lineTo(x + 9, y - 11); c.lineTo(x - 9, y - 11); c.closePath(); };
  // its light falls on the panel below: soft and low
  glow(c, x, y + 26, 190, 'rgba(255, 178, 96, 0.9)', low ? 0.17 : 0.1);
  c.save();
  path();
  c.clip();
  if (atlas) {
    c.translate(x - 16, y - 11);
    bandRun(c, scaledStrip(atlas, 11), 32, 11, (x % 97) / 97);
  } else {
    c.fillStyle = vgrad(c, y - 11, y, [[0, MATTE.brassLit], [1, MATTE.brassDeep]]);
    c.fillRect(x - 16, y - 11, 32, 11);
  }
  c.restore();
  c.save();
  path();
  c.lineWidth = 1.2;
  c.strokeStyle = MATTE.inkDark;
  c.stroke();
  // the bulb's rim under the shade: warm, not white
  const g = c.createRadialGradient(x, y + 1, 0, x, y + 1, 12);
  g.addColorStop(0, 'rgba(255, 206, 140, 0.75)');
  g.addColorStop(1, 'rgba(255, 170, 90, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y + 1.5, 11, 2.6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// ---------------------------------------------------------------------------
// the wall

/**
 * Paint the wall for a layout. `chrome` ({ bezel, walnut } images, either
 * may be null while loading) selects the painted round-7 wall; without it
 * the round-6 procedural wall is drawn (the finale still uses that one).
 * `low` (LOW GRAPHICS): the lamps' light is painted in, no live glows.
 */
export function paintWall(c, layout, { paper = null, chrome = undefined, low = false } = {}) {
  if (chrome === undefined) return legacyWall(c, layout, { paper });
  const { w: W, h: H } = layout.view;
  const atlas = chrome?.bezel ?? null;
  const walnut = chrome?.walnut ?? null;
  const geo = wallGeometry(layout);
  const { k, gx, gy, gw, gh } = geo;

  // walnut, vertical grain, then dark toward the edges (the house lights are down)
  if (walnut) walnutFill(c, walnut, 0, 0, W, H, { dx: -137, dy: -41 });
  else wood(c, 0, 0, W, H, { base: MATTE.walnut, seed: 101, vertical: true, grain: 'rgba(0,0,0,0.3)', light: 'rgba(255,210,160,0.02)' });
  c.fillStyle = 'rgba(6, 4, 2, 0.28)';
  c.fillRect(0, 0, W, H);
  const vg = c.createRadialGradient(W / 2, H * 0.46, H * 0.25, W / 2, H * 0.46, W * 0.68);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.66)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);
  c.fillStyle = vgrad(c, 0, H, [[0, 'rgba(0,0,0,0.35)'], [0.22, 'rgba(0,0,0,0)'], [0.8, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
  c.fillRect(0, 0, W, H);

  // the raised panel the windows are set into (the proscenium): darker walnut,
  // grain across, a soft shadow on the wall
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.75)';
  c.shadowBlur = 36;
  c.shadowOffsetY = 10;
  roundRectPath(c, gx, gy, gw, gh, 20);
  c.fillStyle = MATTE.walnutDeep;
  c.fill();
  c.restore();
  c.save();
  roundRectPath(c, gx, gy, gw, gh, 20);
  c.clip();
  if (walnut) walnutFill(c, walnut, gx, gy, gw, gh, { turn: true, dx: gx + 61, dy: gy });
  else wood(c, gx, gy, gw, gh, { base: MATTE.walnut, seed: 103, vertical: false, grain: 'rgba(0,0,0,0.28)' });
  c.fillStyle = 'rgba(8, 5, 3, 0.42)';
  c.fillRect(gx, gy, gw, gh);
  // lamplight from above on the upper rail of the panel
  c.fillStyle = vgrad(c, gy, gy + gh, [[0, 'rgba(255, 190, 120, 0.05)'], [0.25, 'rgba(255, 190, 120, 0)'], [1, 'rgba(0, 0, 0, 0.18)']]);
  c.fillRect(gx, gy, gw, gh);
  // each window sits in a socket: the panel darkens close round its bezel,
  // and the socket's back (seen while a window is carried) is deep walnut
  layout.slots.forEach((slot) => {
    const b = BEZEL * k;
    c.save();
    c.shadowColor = 'rgba(0, 0, 0, 0.9)';
    c.shadowBlur = 16 * k;
    roundRectPath(c, slot.x - b, slot.y - b, slot.w + b * 2, slot.h + b * 2, 30 * k);
    c.fillStyle = '#080503';
    c.fill();
    c.restore();
    c.save();
    roundRectPath(c, slot.x - b + 3, slot.y - b + 3, slot.w + b * 2 - 6, slot.h + b * 2 - 6, 28 * k);
    c.clip();
    if (walnut) walnutFill(c, walnut, slot.x - b, slot.y - b, slot.w + b * 2, slot.h + b * 2, { dx: slot.x * 0.7, dy: 97 });
    else {
      c.fillStyle = MATTE.walnut;
      c.fillRect(slot.x - b, slot.y - b, slot.w + b * 2, slot.h + b * 2);
    }
    c.fillStyle = 'rgba(5, 3, 2, 0.38)';
    c.fillRect(slot.x - b, slot.y - b, slot.w + b * 2, slot.h + b * 2);
    // its own lip throws a shadow in
    c.shadowColor = 'rgba(0, 0, 0, 0.9)';
    c.shadowBlur = 26 * k;
    c.lineWidth = 18;
    c.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    roundRectPath(c, slot.x - b - 6, slot.y - b - 6, slot.w + b * 2 + 12, slot.h + b * 2 + 12, 32 * k);
    c.stroke();
    c.restore();
  });
  // the gutters between the windows: deep recessed channels, one run per
  // column and row gap, so they cross cleanly in a large grid
  const b = BEZEL * k;
  const inset = 10 * k;
  layout.slots.filter((slot) => slot.row === 0 && slot.col < layout.cols - 1).forEach((slot) => {
    const x = slot.x + slot.w + b - 2;
    c.fillStyle = vgrad(c, layout.y, layout.y + layout.h, [[0, '#0a0604'], [0.5, '#0e0906'], [1, '#0a0604']]);
    c.fillRect(x, layout.y + inset, layout.gutter - b * 2 + 4, layout.h - inset * 2);
  });
  layout.slots.filter((slot) => slot.col === 0 && slot.row < layout.rows - 1).forEach((slot) => {
    const y = slot.y + slot.h + b - 2;
    c.fillStyle = '#0a0604';
    c.fillRect(layout.x + inset, y, layout.w - inset * 2, layout.gutter - b * 2 + 4);
  });
  c.restore();
  // the panel's trim: a thin painted brass moulding with a few screws, and an
  // inked shadow line inside it
  if (atlas) brassFrame(c, atlas, gx, gy, gw, gh, 9, { rivets: 300, seed: 7, rivetScale: 0.9, rivetAlpha: 0.85 });
  else {
    c.save();
    c.lineWidth = 7;
    c.strokeStyle = MATTE.brass;
    roundRectPath(c, gx + 3.5, gy + 3.5, gw - 7, gh - 7, 18);
    c.stroke();
    c.restore();
  }
  c.save();
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  roundRectPath(c, gx + 10, gy + 10, gw - 20, gh - 20, 14);
  c.stroke();
  c.restore();

  // the sill under the windows (the caption rail): a matte moulded bar
  const sillY = geo.sillY;
  c.fillStyle = 'rgba(0, 0, 0, 0.45)';
  c.save();
  c.filter = 'blur(4px)';
  c.fillRect(gx - 16, sillY + 8, gw + 32, 9);
  c.restore();
  brassBar(c, atlas, gx - 20, sillY - 6, gw + 40, 15, { seed: 11, radius: 5, shade: 0.12 });
  if (atlas) {
    const rs = 9;
    const A = CHROME_ATLAS.rivet;
    c.save();
    c.globalAlpha = 0.85;
    for (let x = gx + 60; x < gx + gw - 40; x += 240) c.drawImage(atlas, A.at[0][0], A.at[0][1], A.size, A.size, x - rs / 2, sillY + 1.5 - rs / 2, rs, rs);
    c.restore();
  }
  // a luggage-rack rail across the very top, on dark posts
  brassBar(c, atlas, -4, 12, W + 8, 6, { seed: 13, radius: 3, shade: 0.28 });
  for (let x = 40; x < W; x += 180) {
    if (geo.lamps.some((lamp) => Math.abs(lamp.x - x - 2.5) < 26 && lamp.y < 60)) continue;
    c.fillStyle = MATTE.brassDeep;
    c.fillRect(x, 6, 5, 18);
    c.fillStyle = 'rgba(0, 0, 0, 0.5)';
    c.fillRect(x + 5, 8, 1.5, 16);
  }
  // the lamps over the gutters (their live flicker is PanelScene's)
  geo.lamps.forEach(({ x, y }) => sconce(c, atlas, x, y, { low }));
  if (paper) paperGrain(c, W, H, paper, 0.06);
  return { sillY };
}

/** The round-6 procedural wall (glossy brass); kept for the finale's floor. */
function legacyWall(c, layout, { paper = null } = {}) {
  const { w: W, h: H } = layout.view;
  // walnut planks, vertical
  wood(c, 0, 0, W, H, { base: PAL.walnut, seed: 101, vertical: true, grain: 'rgba(0,0,0,0.35)', light: 'rgba(255,210,160,0.035)' });
  const random = rng(102);
  for (let x = 0; x < W; x += 132 + Math.floor(random() * 30)) {
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(x, 0, 2, H);
    c.fillStyle = 'rgba(255,220,170,0.03)';
    c.fillRect(x + 2, 0, 1, H);
  }
  // darker toward the corners
  const vg = c.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, W * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);

  // raised walnut panel behind the whole window group
  const { pad, gx, gy, gw, gh, lamps } = wallGeometry(layout, { painted: false });
  void pad;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.7)';
  c.shadowBlur = 40;
  c.shadowOffsetY = 12;
  roundRectPath(c, gx, gy, gw, gh, 22);
  c.fillStyle = '#23170f';
  c.fill();
  c.restore();
  c.save();
  roundRectPath(c, gx, gy, gw, gh, 22);
  c.clip();
  wood(c, gx, gy, gw, gh, { base: '#2a1b11', seed: 103, vertical: false, grain: 'rgba(0,0,0,0.3)' });
  c.restore();
  // brass trim around the group
  c.save();
  c.lineWidth = 6;
  c.strokeStyle = brassFill(c, gx, gy, gw, gh);
  roundRectPath(c, gx + 3, gy + 3, gw - 6, gh - 6, 20);
  c.stroke();
  c.lineWidth = 1.2;
  c.strokeStyle = 'rgba(255, 230, 170, 0.35)';
  roundRectPath(c, gx + 9, gy + 9, gw - 18, gh - 18, 16);
  c.stroke();
  c.restore();
  // rivets along the trim
  const every = 46;
  for (let x = gx + 24; x < gx + gw - 20; x += every) { rivet(c, x, gy + 3, 3.4); rivet(c, x, gy + gh - 3, 3.4); }
  for (let y = gy + 24; y < gy + gh - 20; y += every) { rivet(c, gx + 3, y, 3.4); rivet(c, gx + gw - 3, y, 3.4); }

  // gutters: recessed dark channels
  layout.slots.forEach((slot) => {
    if (slot.col < layout.cols - 1) {
      const x = slot.x + slot.w;
      c.fillStyle = vgrad(c, slot.y, slot.y + slot.h, [[0, '#120c08'], [0.5, '#1a110b'], [1, '#120c08']]);
      c.fillRect(x + 4, slot.y - 6, layout.gutter - 8, slot.h + 12);
    }
    if (slot.row < layout.rows - 1) {
      const y = slot.y + slot.h;
      c.fillStyle = '#140d09';
      c.fillRect(slot.x - 6, y + 4, slot.w + 12, layout.gutter - 8);
    }
  });

  // lamps: small brass sconces above the gutters between columns, and above
  // the outer edges; warm light washes down between the windows
  lamps.forEach(({ x }) => {
    const y = gy - 6;
    glow(c, x, y + 20, 260, 'rgba(255, 180, 90, 0.9)', 0.22);
    c.fillStyle = brassFill(c, x - 18, y - 12, 36, 12);
    c.beginPath(); c.moveTo(x - 18, y); c.lineTo(x + 18, y); c.lineTo(x + 10, y - 12); c.lineTo(x - 10, y - 12); c.closePath(); c.fill();
    c.fillStyle = '#ffe3a8';
    c.beginPath(); c.ellipse(x, y + 1, 12, 3.5, 0, 0, Math.PI * 2); c.fill();
    ink(c, [[x - 18, y], [x + 18, y], [x + 10, y - 12], [x - 10, y - 12]], { w: 1.5, closed: true, alpha: 0.7 });
  });

  // brass sill under the windows: the caption rail
  const sillY = gy + gh + 22;
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.fillRect(gx - 20, sillY + 10, gw + 40, 10);
  c.fillStyle = brassFill(c, gx - 20, sillY - 6, gw + 40, 16);
  roundRectPath(c, gx - 20, sillY - 6, gw + 40, 16, 6);
  c.fill();
  ink(c, [[gx - 20, sillY - 6], [gx + gw + 20, sillY - 6]], { w: 1.2, alpha: 0.4 });
  for (let x = gx; x < gx + gw; x += 120) rivet(c, x, sillY + 2, 2.6);
  // a luggage rack rail across the very top
  c.fillStyle = brassFill(c, 0, 12, W, 8);
  c.fillRect(0, 12, W, 6);
  for (let x = 40; x < W; x += 180) { c.fillStyle = PAL.brassDark; c.fillRect(x, 6, 6, 18); }
  if (paper) paperGrain(c, W, H, paper, 0.06);
  return { sillY };
}

// ---------------------------------------------------------------------------
// the bezel

/**
 * A window's bezel ring: (w + BEZEL·2) × (h + BEZEL·2) tile px, the hole
 * (w × h) transparent but for a soft inner shadow on the picture's edge.
 * `chrome` selects the painted ring (see paintWall); `res` paints it at
 * that many canvas px per tile px (a window shown larger stays crisp: the
 * canvas must be sized to match). Without `chrome`: the round-6 ring.
 */
export function paintBezel(c, w, h, { chrome = undefined, res = 1 } = {}) {
  if (chrome === undefined) return legacyBezel(c, w, h);
  const W = w + BEZEL * 2;
  const H = h + BEZEL * 2;
  const atlas = chrome?.bezel ?? null;
  c.save();
  c.scale(res, res);
  // the picture sits back from the bezel: a soft shadow round its edge
  c.save();
  roundRectPath(c, BEZEL, BEZEL, w, h, RADIUS);
  c.clip();
  c.shadowColor = 'rgba(0, 0, 0, 0.78)';
  c.shadowBlur = 16 * res;
  c.lineWidth = 16;
  c.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  roundRectPath(c, BEZEL - 8, BEZEL - 8, w + 16, h + 16, RADIUS + 8);
  c.stroke();
  c.restore();
  const t = BEZEL + BEZEL_LIP;
  if (atlas) brassFrame(c, atlas, 0, 0, W, H, t, { rivets: 'mid', seed: 5 });
  else {
    // matte stand-in until the painted ring is in
    c.save();
    roundRectPath(c, 0, 0, W, H, RADIUS + t);
    roundRectPath(c, t, t, W - t * 2, H - t * 2, RADIUS);
    c.fillStyle = MATTE.brass;
    c.fill('evenodd');
    c.lineWidth = 1.2;
    c.strokeStyle = MATTE.inkDark;
    roundRectPath(c, 0.6, 0.6, W - 1.2, H - 1.2, RADIUS + t);
    c.stroke();
    roundRectPath(c, t, t, W - t * 2, H - t * 2, RADIUS);
    c.stroke();
    c.restore();
  }
  c.restore();
  return undefined;
}

/** The round-6 glossy ring; kept for the finale's floor. */
function legacyBezel(c, w, h) {
  const W = w + BEZEL * 2;
  const H = h + BEZEL * 2;
  c.save();
  roundRectPath(c, 0, 0, W, H, LEGACY_RADIUS + BEZEL * 0.6);
  c.fillStyle = brassFill(c, 0, 0, W, H);
  c.fill();
  // bevel highlights
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(255, 238, 190, 0.55)';
  roundRectPath(c, 1.5, 1.5, W - 3, H - 3, LEGACY_RADIUS + BEZEL * 0.6);
  c.stroke();
  c.strokeStyle = 'rgba(40, 25, 10, 0.7)';
  roundRectPath(c, BEZEL - 3, BEZEL - 3, w + 6, h + 6, LEGACY_RADIUS + 2);
  c.stroke();
  // punch the window hole
  c.globalCompositeOperation = 'destination-out';
  roundRectPath(c, BEZEL, BEZEL, w, h, LEGACY_RADIUS);
  c.fill();
  c.restore();
  // inner shadow onto the painting
  c.save();
  roundRectPath(c, BEZEL, BEZEL, w, h, LEGACY_RADIUS);
  c.clip();
  c.shadowColor = 'rgba(0,0,0,0.85)';
  c.shadowBlur = 18;
  c.lineWidth = 16;
  c.strokeStyle = 'rgba(0,0,0,0.9)';
  roundRectPath(c, BEZEL - 8, BEZEL - 8, w + 16, h + 16, LEGACY_RADIUS + 6);
  c.stroke();
  c.restore();
  // corner rivets
  [[BEZEL * 0.5, BEZEL * 0.5], [W - BEZEL * 0.5, BEZEL * 0.5], [BEZEL * 0.5, H - BEZEL * 0.5], [W - BEZEL * 0.5, H - BEZEL * 0.5]].forEach(([x, y]) => rivet(c, x + (x < W / 2 ? 6 : -6), y + (y < H / 2 ? 6 : -6), 2.6));
  // ink outline, faint
  c.save();
  c.globalAlpha = 0.35;
  c.strokeStyle = PAL.ink;
  c.lineWidth = 1.2;
  roundRectPath(c, 0.5, 0.5, W - 1, H - 1, LEGACY_RADIUS + BEZEL * 0.6);
  c.stroke();
  c.restore();
}

/**
 * The window's vignette and a fine film of paper grain. `painted` (round 7,
 * over the painted plates): lighter, so the picture keeps its own darks.
 */
export function paintVignette(c, w, h, { painted = false } = {}) {
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.75, painted ? 'rgba(8,5,4,0.14)' : 'rgba(8,5,4,0.2)');
  g.addColorStop(1, painted ? 'rgba(8,5,4,0.48)' : 'rgba(8,5,4,0.62)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // a fine film of paper grain over the whole window (fields included)
  const random = rng(303);
  const dark = painted ? 'rgba(20, 12, 6, 0.07)' : 'rgba(20, 12, 6, 0.10)';
  const light = painted ? 'rgba(255, 236, 200, 0.025)' : 'rgba(255, 236, 200, 0.045)';
  for (let i = 0; i < (w * h) / 60; i += 1) {
    c.fillStyle = random() > 0.5 ? dark : light;
    c.fillRect(random() * w, random() * h, 1 + random() * 1.4, 1 + random() * 1.4);
  }
}

/** Soft radial dot used for glows, dust, and light runs. */
export function paintRadial(c, size, stops = [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]) {
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
}

/** The punched-hole lens rim: a torn paper ring with a brass edge. */
export function paintLensRim(c, r) {
  const size = (r + 26) * 2;
  const cx = size / 2;
  const random = rng(201);
  c.save();
  c.beginPath();
  const n = 90;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + 14 + (random() - 0.5) * 5;
    const x = cx + Math.cos(a) * rr;
    const y = cx + Math.sin(a) * rr;
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.closePath();
  c.arc(cx, cx, r, 0, Math.PI * 2, true);
  c.fillStyle = 'rgba(226, 212, 180, 0.95)';
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 12;
  c.fill();
  c.restore();
  c.save();
  c.lineWidth = 3;
  c.strokeStyle = PAL.brass;
  c.beginPath(); c.arc(cx, cx, r + 1.5, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 1.2;
  c.strokeStyle = PAL.ink;
  c.globalAlpha = 0.8;
  c.beginPath(); c.arc(cx, cx, r + 13, 0, Math.PI * 2); c.stroke();
  c.restore();
}
