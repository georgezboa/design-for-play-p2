// The title screen's scene: "one carriage behind".
//
// The whole start page is one full-bleed painting: the inside of the night
// service at night, seen from the side, in Chapter 1's ink language. A big
// window on the left onto the rain-dark orchard country passing by, Butch the
// lost-property clerk on the bench in front of it with his lamp beside him
// and the orchard case (CLAIM 1978-0412) under his hand, the walnut wall with
// the departures plaque (the menu, titleMenu.css) and, at the right edge, the
// end door: through its little window the next carriage, and a woman in a
// rose scarf walking away from him (the Mara ahead; docs/STORY_BIBLE.md).
//
// Three stacked canvases (titleMenu.css .nf-scene):
//   outside  the view through the glass, redrawn every frame from layers
//            painted once per size: the sky (still), far hills and the
//            village (slow), hedgerows and hawthorns (faster), the trackside
//            (fastest, drawn live: telegraph poles, wires, lamps) and the rain;
//   room     the carriage, painted once per size, with the glass cut out of it
//            (beads, sheen and Butch's reflection stay on the glass);
//   fx       the live light: the trackside lamp's warm band sweeping across
//            the room (a copy of the room painted lit, revealed through the
//            band), the swaying ceiling lamp, the flicker of Butch's lamp.
//
// The art is in titlePlateArt.js. This file is the pure layout and motion
// model (no DOM, so tests can check every screen shape) and the runtime that
// mounts the canvases, runs the frame loop and stops it whenever the scene is
// hidden: the page is in the background, a dialog covers it, a chapter is
// loading. Reduce Motion (the game setting or the system's) paints one still
// frame; LOW GRAPHICS paints less rain and no reflection.

/** The largest backing store painted for the room (device pixels). */
export const MAX_PIXELS = 2560 * 1440;
/** Extra outside painting around the glass, for the carriage's sway. */
export const GLASS_MARGIN = 8;
/**
 * Butch is drawn in his own units, seated in profile facing along the train:
 * 0, 0 is where he sits on the cushion; his cap is 96 up. The bay runs from
 * his seat's back (left) to the facing seat's back (right).
 */
export const BUTCH_UNITS = Object.freeze({ left: 28, right: 114, top: 97 });

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (v) => Math.round(v * 100) / 100;

function rect(x, y, w, h) {
  return { x: round(x), y: round(y), w: round(w), h: round(h) };
}

/** Where Butch's things are, in px, from his seat (x, y) and scale s. */
function butchParts(x, y, s, sill) {
  return {
    // his bounding box: cap to boots, his back to his toes
    box: rect(x - 17 * s, y - BUTCH_UNITS.top * s, 64 * s, (BUTCH_UNITS.top + 44) * s),
    head: { x: round(x + 3 * s), y: round(y - 77 * s), r: round(13 * s) },
    // the orchard case on the seat beside him (nearer us), his hand on it
    case: rect(x - 7 * s, y - 31 * s, 42 * s, 32 * s),
    tag: { x: round(x + 24 * s), y: round(y - 21 * s) },
    // the little table under the window between the facing seats, his lamp on it
    table: rect(x + 42 * s, sill - 1, 26 * s, 6 * s),
    lamp: { x: round(x + 55 * s), y: round(sill - 1), glass: round(sill - 17 * s) },
  };
}

function wordmarkBox(x, y, maxW, maxH) {
  // the mark is about 0.36 of its width tall (NIGHTFALL, the rule, the line)
  const w = Math.max(120, Math.min(maxW, maxH / 0.36));
  return { x: round(x), y: round(y), w: round(w), h: round(w * 0.36) };
}

function wideLayout(W, H) {
  if (W / H < 1.1) return null;
  const gap = clamp(W * 0.022, 14, 44);
  const doorW = clamp(W * 0.085, 64, 190);
  const doorX = W - doorW;
  const plaqueW = clamp(W * 0.27, 336, 600);
  const plaqueX = doorX - gap * 1.15 - plaqueW;
  const gx = clamp(W * 0.03, 14, 64);
  const gx1 = plaqueX - gap;
  const gw = gx1 - gx;
  if (gw < Math.max(460, W * 0.44)) return null;
  const gy = H * 0.155;
  const sill = H * 0.68;
  const gh = sill - gy;
  const cushion = H * 0.775;
  const floor = H * 0.93;
  const frame = clamp(H * 0.018, 8, 22);
  const s = Math.min(H * 0.0037, gw * 0.0042);
  const x = Math.min(gx + gw * 0.62, gx1 - gw * 0.035 - BUTCH_UNITS.right * s);
  const butch = { x: round(x), y: round(cushion), s: round(s * 1000) / 1000, ...butchParts(x, cushion, s, sill) };
  const markX = gx + gw * 0.065;
  const markY = gy + gh * 0.075;
  // beside his head, or wider when it still clears the top of his cap
  const capTop = cushion - BUTCH_UNITS.top * s;
  const beside = butch.box.x - markX - gw * 0.06;
  const above = (capTop - gh * 0.06 - markY) / 0.36;
  const mark = wordmarkBox(markX, markY, Math.min(gw * 0.52, Math.max(beside, Math.min(gw * 0.5, above))), gh * 0.29);
  return {
    mode: 'wide', W, H,
    glass: { ...rect(gx, gy, gw, gh), r: round(Math.min(gw, gh) * 0.05) },
    frame: round(frame), sill: round(sill), cushion: round(cushion), floor: round(floor),
    horizon: round(gh * 0.7),
    // the moon, glass-local, low behind Butch's cap: his profile reads against it
    moon: { x: round(butch.head.x - gx - 26 * s), y: round(butch.head.y - gy - 30 * s) },
    poleGap: round(Math.max(300, gw * 0.62)),
    wireY: round(gh * 0.39),
    bench: { x0: round(gx - frame * 0.6), x1: round(gx1 + frame * 0.6) },
    rack: { x0: round(gx - frame), x1: round(gx1 + frame), y: round(H * 0.072), h: round(H * 0.046) },
    ceilingLamp: { x: round(plaqueX + plaqueW / 2), top: round(H * 0.035), y: round(H * 0.082), size: round(clamp(H * 0.055, 34, 70)) },
    door: rect(doorX, H * 0.105, doorW, floor - H * 0.105),
    doorWindow: rect(doorX + doorW * 0.2, H * 0.215, doorW * 0.6, H * 0.255),
    plaque: rect(plaqueX, H * 0.13, plaqueW, H * 0.77),
    partition: null,
    butch,
    wordmark: mark,
  };
}

function narrowLayout(W, H) {
  const gx = clamp(W * 0.04, 12, 40);
  const gw = W - gx * 2;
  const gy = clamp(H * 0.03, 12, 36);
  const gh = clamp(Math.min(H * (W > H ? 0.36 : 0.37), gw * 0.86), 170, 520);
  const sill = gy + gh;
  const cushion = sill + gh * 0.13;
  const frame = clamp(gh * 0.035, 7, 16);
  const s = Math.min((cushion - (gy + gh * 0.4)) / 100, (gw * 0.9) / (BUTCH_UNITS.left + BUTCH_UNITS.right));
  const x = gx + gw * 0.965 - BUTCH_UNITS.right * s;
  const butch = { x: round(x), y: round(cushion), s: round(s * 1000) / 1000, ...butchParts(x, cushion, s, sill) };
  const partition = cushion + 12 * s;
  const markX = gx + gw * 0.06;
  const markY = gy + gh * 0.07;
  // across the top of the glass, clear of his cap
  const mark = wordmarkBox(markX, markY, gw * 0.88, Math.min(gh * 0.3, butch.box.y - markY - gh * 0.05));
  const plaqueW = Math.min(gw, 560);
  const top = partition + clamp(H * 0.018, 10, 22);
  return {
    mode: 'narrow', W, H,
    glass: { ...rect(gx, gy, gw, gh), r: round(Math.min(gw, gh) * 0.05) },
    frame: round(frame), sill: round(sill), cushion: round(cushion), floor: round(H),
    horizon: round(gh * 0.72),
    moon: { x: round(butch.head.x - gx - 30 * s), y: round(butch.head.y - gy - 22 * s) },
    poleGap: round(clamp(gw * 0.7, 260, 640)),
    wireY: round(Math.max(mark.y + mark.h - gy + gh * 0.04, gh * 0.4)),
    bench: { x0: round(gx - frame * 0.6), x1: round(gx + gw + frame * 0.6) },
    rack: null,
    ceilingLamp: null,
    door: null,
    doorWindow: null,
    plaque: rect((W - plaqueW) / 2, top, plaqueW, H - top - clamp(H * 0.015, 8, 18)),
    partition: round(partition),
    butch,
    wordmark: mark,
  };
}

/**
 * Where everything sits on a W × H screen (CSS px). Pure: the tests check the
 * composition at every screen shape.
 */
export function sceneLayout(width, height) {
  const W = Math.max(320, Math.round(width));
  const H = Math.max(320, Math.round(height));
  return wideLayout(W, H) ?? narrowLayout(W, H);
}

// ---------------------------------------------------------------------------
// motion

/** What the scene does under the player's settings. */
export function motionConfig({ reduced = false, low = false } = {}) {
  return {
    animate: !reduced,
    sweep: !reduced,
    rainLayers: low ? 1 : 2,
    rainDensity: low ? 0.45 : 1,
    reflection: !low,
    dprCap: low ? 1 : 2,
  };
}

/** px per second for each outside layer, for a glass `gw` wide. */
export function layerSpeeds(gw) {
  return { far: gw * 0.008, mid: gw * 0.06, near: gw * 0.48 };
}

/** Trackside lamps stand between poles, one every LAMP_EVERY poles. */
export const LAMP_EVERY = 4;
const LAMP_OFFSET = 2.5;
/** A lamp throws its band into the room from SWEEP_IN glass widths out, for SWEEP_SPAN of them. */
const SWEEP_IN = 1.15;
const SWEEP_SPAN = 1.3;

/** The world x of trackside lamp `j` (near layer, glass px). */
export function lampWorldX(L, j) {
  return (j * LAMP_EVERY + LAMP_OFFSET) * L.poleGap;
}

/** The scene time at which lamp 0 is `progress` of the way across the glass. */
export function sweepTime(L, progress = 0.5) {
  const gw = L.glass.w;
  const lx = gw * SWEEP_IN - progress * gw * SWEEP_SPAN;
  return (lampWorldX(L, 0) - lx) / layerSpeeds(gw).near;
}

function sweepWidth(L) {
  return Math.max(L.W * 0.26, 220);
}

/** Where the band's foot is when its middle crosses Butch (it leans right). */
function sweepTarget(L) {
  return clamp(L.butch.x - L.H * 0.11, -sweepWidth(L) * 0.9, L.W);
}

/** How far across the glass the lamp is when it passes behind Butch. */
export function butchSweepProgress(L) {
  const gw = L.glass.w;
  return clamp((gw * SWEEP_IN - (L.butch.x - L.glass.x)) / (gw * SWEEP_SPAN), 0.15, 0.85);
}

/**
 * Everything that moves, at scene time `t` (seconds). With `cfg.animate`
 * false the scene is still: no sweep, no sway, the lamp hangs straight.
 */
export function frameState(t, L, cfg = motionConfig()) {
  const time = cfg.animate ? t : 0;
  const speeds = layerSpeeds(L.glass.w);
  const scroll = { far: time * speeds.far, mid: time * speeds.mid, near: time * speeds.near };
  const bob = cfg.animate ? 1.1 * Math.sin(time * 2.3) + 0.45 * Math.sin(time * 5.9 + 1.3) : 0;
  const lampAngle = cfg.animate ? 0.024 * Math.sin(time * 1.21) + 0.006 * Math.sin(time * 3.4 + 0.7) : 0;
  const flicker = cfg.animate ? 0.5 + 0.5 * Math.sin(time * 9.1) * Math.sin(time * 3.7 + 2) : 0.5;
  let sweep = null;
  if (cfg.sweep) {
    const gw = L.glass.w;
    const j = Math.round((scroll.near + gw * 0.5 - LAMP_OFFSET * L.poleGap) / (LAMP_EVERY * L.poleGap));
    const lx = lampWorldX(L, j) - scroll.near;
    const progress = (gw * SWEEP_IN - lx) / (gw * SWEEP_SPAN);
    if (progress > 0 && progress < 1) {
      const width = sweepWidth(L);
      const from = L.W + width;
      const to = -width;
      // the band crosses the whole room, right to left, and falls on Butch
      // as the lamp goes past him outside
      const f = (from - sweepTarget(L)) / (from - to);
      const gamma = Math.log(f) / Math.log(butchSweepProgress(L));
      sweep = {
        progress,
        x: from + (to - from) * progress ** gamma,
        width,
        strength: Math.sin(Math.PI * progress) ** 0.8,
      };
    }
  }
  return { t: time, scroll, bob, lampAngle, flicker, sweep };
}

// ---------------------------------------------------------------------------
// runtime

/** Backing scale for a W × H scene: the device ratio, capped by MAX_PIXELS. */
export function backingScale(W, H, dpr = 1, cap = 2) {
  const want = Math.min(Math.max(1, dpr), cap);
  return Math.min(want, Math.sqrt(MAX_PIXELS / Math.max(1, W * H)));
}

function osReducedMotion() {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true; } catch { return false; }
}

function settingsNow() {
  return globalThis.NIGHTFALL_SETTINGS ?? {};
}

function currentConfig() {
  const settings = settingsNow();
  return motionConfig({ reduced: Boolean(settings.reducedMotion) || osReducedMotion(), low: settings.lowGraphics === true });
}

function setVars(root, L) {
  const px = (v) => `${round(v)}px`;
  const vars = {
    '--nf-glass-x': px(L.glass.x), '--nf-glass-y': px(L.glass.y), '--nf-glass-w': px(L.glass.w), '--nf-glass-h': px(L.glass.h),
    '--nf-mark-x': px(L.wordmark.x), '--nf-mark-y': px(L.wordmark.y), '--nf-mark-w': px(L.wordmark.w),
    '--nf-plaque-x': px(L.plaque.x), '--nf-plaque-y': px(L.plaque.y), '--nf-plaque-w': px(L.plaque.w), '--nf-plaque-h': px(L.plaque.h),
    '--nf-board': px(L.plaque.w),
  };
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  root.dataset.layout = L.mode;
  // a short plaque drops the header and the line details (titleMenu.css)
  root.dataset.plaque = L.plaque.h < 400 ? 'compact' : 'full';
}

/**
 * Mount the scene into `root` (#nightfall-title, which holds a .nf-scene
 * host). Returns a controller: hold(reason, on) pauses the loop while any
 * reason is held ('dialog', 'hidden', 'loading'), relayout(), freeze(t | 'sweep')
 * for screenshots, stats() for the frame cost, destroy().
 */
export function mountTitleScene(root) {
  const noop = { hold() {}, relayout() {}, freeze() {}, stats: () => null, destroy() {} };
  if (typeof document === 'undefined' || !root) return noop;
  const host = root.querySelector('.nf-scene');
  if (!host) return noop;
  const make = (name) => {
    const element = document.createElement('canvas');
    element.className = `nf-scene-${name}`;
    element.setAttribute('aria-hidden', 'true');
    host.append(element);
    return element;
  };
  const outside = make('outside');
  const room = make('room');
  const fx = make('fx');
  const holds = new Set();
  let art = null;
  let L = sceneLayout(window.innerWidth, window.innerHeight);
  let cfg = currentConfig();
  let painted = null;
  let frame = 0;
  let elapsed = 0;
  let last = 0;
  let frozen = null;
  let resizeTimer = null;
  const cost = { samples: [], frames: 0 };
  setVars(root, L);

  const draw = (t) => {
    if (!painted) return;
    const state = frameState(t, L, cfg);
    const start = performance.now();
    painted.drawFrame(state);
    const ms = performance.now() - start;
    cost.samples.push(ms);
    if (cost.samples.length > 120) cost.samples.shift();
    cost.frames += 1;
  };

  const paint = () => {
    if (!art) return;
    cfg = currentConfig();
    const k = backingScale(L.W, L.H, window.devicePixelRatio || 1, cfg.dprCap);
    try {
      painted = art.paintScene({ L, k, cfg, canvases: { outside, room, fx }, root });
      root.dataset.scene = 'painted';
    } catch (error) {
      painted = null;
      root.dataset.scene = 'failed';
      console.warn('[title] scene paint failed', error);
      return;
    }
    draw(frozen ?? elapsed);
    schedule();
  };

  const running = () => cfg.animate && frozen === null && holds.size === 0 && outside.isConnected && painted;

  const tick = (now) => {
    frame = 0;
    if (!running()) { last = 0; return; }
    if (last) elapsed += Math.min(0.1, (now - last) / 1000);
    last = now;
    draw(elapsed);
    frame = requestAnimationFrame(tick);
  };

  function schedule() {
    root.dataset.sceneMotion = running() ? 'running' : 'still';
    if (running() && !frame) { last = 0; frame = requestAnimationFrame(tick); }
    if (!running() && frame) { cancelAnimationFrame(frame); frame = 0; }
  }

  const relayout = () => {
    L = sceneLayout(window.innerWidth, window.innerHeight);
    setVars(root, L);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(paint, 160);
  };

  const onVisibility = () => { controller.hold('hidden', document.hidden); };
  const onPageHide = () => { controller.hold('loading', true); };
  const onSettings = () => {
    const next = currentConfig();
    const repaint = next.reflection !== cfg.reflection || next.rainLayers !== cfg.rainLayers || next.dprCap !== cfg.dprCap;
    cfg = next;
    if (repaint) paint(); else { draw(frozen ?? elapsed); schedule(); }
  };
  let media = null;
  try { media = window.matchMedia?.('(prefers-reduced-motion: reduce)'); } catch { media = null; }

  const controller = {
    hold(reason, on) {
      const had = holds.has(reason);
      if (on) holds.add(reason); else holds.delete(reason);
      root.dataset.sceneHold = [...holds].join(' ');
      // One last still frame as the loop stops: the page always has a fresh
      // frame to commit, so a dialog's opening animation starts at once even
      // where nothing else on the page is moving.
      if (on && !had && outside.isConnected) draw(frozen ?? elapsed);
      schedule();
    },
    relayout,
    freeze(at) {
      frozen = at === 'sweep' ? sweepTime(L, butchSweepProgress(L)) : typeof at === 'number' ? at : null;
      draw(frozen ?? elapsed);
      schedule();
    },
    stats() {
      const list = [...cost.samples].sort((a, b) => a - b);
      const mean = list.reduce((sum, v) => sum + v, 0) / Math.max(1, list.length);
      return { frames: cost.frames, meanMs: round(mean), p95Ms: round(list[Math.floor(list.length * 0.95)] ?? 0), layout: L.mode, running: Boolean(running()) };
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', relayout);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('nightfall:settings', onSettings);
      media?.removeEventListener?.('change', onSettings);
    },
  };

  window.addEventListener('resize', relayout);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('nightfall:settings', onSettings);
  media?.addEventListener?.('change', onSettings);
  if (document.hidden) holds.add('hidden');

  // The painter is its own chunk: the title's markup and menu are up first.
  import('./titlePlateArt.js').then((module) => {
    art = module;
    // the plaque and the claim tag letter in Space Mono: wait for it briefly
    const fonts = document.fonts?.load ? Promise.race([
      Promise.all([document.fonts.load('700 12px "Space Mono"'), document.fonts.load('400 12px "Anton"')]),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ]).catch(() => {}) : Promise.resolve();
    return fonts.then(() => requestAnimationFrame(paint));
  }).catch((error) => {
    root.dataset.scene = 'failed';
    console.warn('[title] scene unavailable', error);
  });
  return controller;
}
