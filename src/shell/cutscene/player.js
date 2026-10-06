// The cutscene runtime: one full-window canvas inside the .nf-cinematic
// overlay (gameFlow.js), a wall-clock session (timeline.js), DOM captions in
// the caption-bar look, music through the shared music director and the
// small WebAudio kit (sfx.js).
//
// Each frame: the walnut wall (painted once per window size), the shot (or
// the two shots of a join) inside the panel, the brass frame over it. A
// shot's static layers are painted once per resolution through env.layer()
// and only composited after that; its draw() adds the few live parts.

import { music } from '../../shared/musicDirector.js';
import { devRoutesEnabled } from '../../devMode.js';
import { brassFill, rivet, rng, roundRectPath, vgrad, wood } from '../../chapters/nightService/art/ink.js';
import {
  STAGE, buildTimeline, cameraAt, createSession, panelLayout, parallaxOffset, stageView,
} from './timeline.js';
import { createCutsceneSfx } from './sfx.js';
import { isSoftwareRenderer } from '../framePacing.js';
import { useSoftwareCanvas } from './painters.js';

/** The largest backing store for the window canvas (device px). */
export const MAX_PIXELS = 2560 * 1440;
/** Layers are painted at a resolution rounded up to this step (px per stage unit). */
const RES_STEP = 0.25;
const WARM_BUDGET_MS = 3000;
const ARRIVING_TEXT = 'THE NIGHT SERVICE IS ARRIVING';

function settingsNow() {
  return globalThis.NIGHTFALL_SETTINGS ?? {};
}

function osReducedMotion() {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true; } catch { return false; }
}

export function playbackOptions(settings = settingsNow(), os = false) {
  return {
    reducedMotion: Boolean(settings.reducedMotion) || os,
    lowGraphics: settings.lowGraphics === true,
    textScale: Math.max(0.8, Math.min(1.6, Number(settings.textScale ?? 100) / 100 || 1)),
  };
}

// On a software renderer (SwiftShader, llvmpipe: no usable GPU) an
// accelerated 2D canvas is drawn by an emulated GPU, which stalls for up to
// a second at a time; a CPU-backed canvas is many times faster there.
let softwareProbe = null;
export function softwareRendering() {
  if (softwareProbe !== null) return softwareProbe;
  softwareProbe = false;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl') || probe.getContext('experimental-webgl');
    softwareProbe = gl ? isSoftwareRenderer(gl) : true;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { softwareProbe = false; }
  return softwareProbe;
}
let contextOptions = {};
const ctx2d = (element) => element.getContext('2d', contextOptions);

function makeCanvas(w, h) {
  const element = document.createElement('canvas');
  element.width = Math.max(1, Math.ceil(w));
  element.height = Math.max(1, Math.ceil(h));
  return element;
}

// ---------------------------------------------------------------------------
// the carriage wall and the panel's brass frame (screen space)

function paintWall(L, k) {
  const canvas = makeCanvas(L.W * k, L.H * k);
  const c = ctx2d(canvas);
  c.setTransform(k, 0, 0, k, 0, 0);
  wood(c, 0, 0, L.W, L.H, { base: '#1d130c', vertical: true, seed: 7101, grain: 'rgba(0,0,0,0.34)', light: 'rgba(255,214,160,0.03)' });
  const random = rng(7102);
  for (let x = random() * 30; x < L.W; x += L.W * 0.06 + random() * 20) {
    c.fillStyle = 'rgba(0, 0, 0, 0.4)';
    c.fillRect(x, 0, 2, L.H);
  }
  // the lamps over the window throw a little light down the wall
  const p = L.panel;
  [0.18, 0.82].forEach((at) => {
    const g = c.createRadialGradient(p.x + p.w * at, p.y - 4, 0, p.x + p.w * at, p.y - 4, p.h * 0.5);
    g.addColorStop(0, 'rgba(255, 190, 110, 0.16)');
    g.addColorStop(1, 'rgba(255, 190, 110, 0)');
    c.fillStyle = g;
    c.fillRect(0, 0, L.W, L.H);
  });
  c.fillStyle = vgrad(c, 0, L.H, [[0, 'rgba(0,0,0,0.35)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]);
  c.fillRect(0, 0, L.W, L.H);
  return canvas;
}

/** The brass window frame for a panel w × h, transparent inside (screen px). */
function paintFrame(L, k) {
  const { w, h, r } = L.panel;
  const f = L.frame;
  const pad = f * 2.2;
  const canvas = makeCanvas((w + pad * 2) * k, (h + pad * 2) * k);
  const c = ctx2d(canvas);
  c.setTransform(k, 0, 0, k, 0, 0);
  c.translate(pad, pad);
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.6)';
  c.shadowBlur = f * 1.6;
  c.shadowOffsetY = f * 0.4;
  c.fillStyle = brassFill(c, -f, -f, w + f * 2, h + f * 2);
  roundRectPath(c, -f, -f, w + f * 2, h + f * 2, r + f);
  c.fill();
  c.restore();
  c.fillStyle = vgrad(c, -f, h + f, [[0, '#e3c27e'], [0.12, '#b08a4a'], [0.6, '#8a6934'], [1, '#5e4522']]);
  roundRectPath(c, -f, -f, w + f * 2, h + f * 2, r + f);
  c.fill();
  // the walnut inner moulding, then the hole
  c.fillStyle = '#2a190f';
  roundRectPath(c, -f * 0.35, -f * 0.35, w + f * 0.7, h + f * 0.7, r + f * 0.35);
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  roundRectPath(c, 0, 0, w, h, r);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.lineWidth = 1.2;
  c.strokeStyle = 'rgba(255, 240, 200, 0.5)';
  roundRectPath(c, -f + 1, -f + 1, w + f * 2 - 2, h + f * 2 - 2, r + f - 1);
  c.stroke();
  c.strokeStyle = 'rgba(20, 12, 6, 0.85)';
  roundRectPath(c, -0.5, -0.5, w + 1, h + 1, r);
  c.stroke();
  // rivets along the frame
  const step = Math.max(60, w / 18);
  for (let x = r + f; x < w - r; x += step) {
    rivet(c, x, -f * 0.62, Math.max(1.6, f * 0.18));
    rivet(c, x, h + f * 0.62, Math.max(1.6, f * 0.18));
  }
  return { canvas, pad };
}

// ---------------------------------------------------------------------------

/**
 * Mount a cutscene definition into `root`. Returns the controller gameFlow.js
 * drives: start(), pause(reason) / resume(reason), skip(), hold(on, text),
 * markReady(), destroy(); `onEnd` runs once when the last shot has played.
 */
export function mountCutscene(def, { root, onEnd = () => {}, ready = true } = {}) {
  const options = playbackOptions(settingsNow(), osReducedMotion());
  const timeline = buildTimeline(def, { reducedMotion: options.reducedMotion });
  const session = createSession(timeline, { ready });
  const sfx = createCutsceneSfx();
  const canvas = document.createElement('canvas');
  canvas.className = 'nf-cinematic-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const caption = document.createElement('div');
  caption.className = 'nf-cinematic-caption';
  caption.setAttribute('role', 'status');
  caption.setAttribute('aria-live', 'polite');
  caption.innerHTML = '<p class="nf-cinematic-caption__speaker"></p><p class="nf-cinematic-caption__text"></p>';
  const arriving = document.createElement('div');
  arriving.className = 'nf-cinematic-arriving';
  arriving.textContent = ARRIVING_TEXT;
  root.prepend(canvas);
  root.append(caption, arriving);
  root.classList.add('is-cutscene');

  contextOptions = softwareRendering() ? { willReadFrequently: true } : {};
  useSoftwareCanvas(Boolean(contextOptions.willReadFrequently));
  const ctx = ctx2d(canvas);
  const buffer = { canvas: null, ctx: null };
  let L = null;
  let k = 1;
  let wall = null;
  let frame = null;
  const layers = new Map();
  let raf = 0;
  let started = false;
  let ended = false;
  let destroyed = false;
  let holding = false;
  let wallTime = 0;
  let lastWall = null;
  let shownCaption = null;
  let musicStarted = false;
  const stats = { frames: 0, samples: [], ticks: 0, longTicks: 0, maxStep: 0 };

  const layout = () => {
    L = panelLayout(window.innerWidth, window.innerHeight, { textScale: options.textScale });
    const want = Math.min(Math.max(1, window.devicePixelRatio || 1), options.lowGraphics ? 1 : 2);
    k = Math.min(want, Math.sqrt(MAX_PIXELS / Math.max(1, L.W * L.H)));
    canvas.width = Math.round(L.W * k);
    canvas.height = Math.round(L.H * k);
    canvas.style.width = `${L.W}px`;
    canvas.style.height = `${L.H}px`;
    wall = paintWall(L, k);
    frame = paintFrame(L, k);
    buffer.canvas = makeCanvas(L.panel.w * k, L.panel.h * k);
    buffer.ctx = ctx2d(buffer.canvas);
    root.style.setProperty('--nf-cap-top', `${L.captionTop + Math.min((L.H - L.captionTop) / 2, 70)}px`);
    root.style.setProperty('--nf-cap-w', `${L.captionWidth}px`);
    root.style.setProperty('--nf-arriving-top', `${L.panel.y + L.panel.h - 16}px`);
  };

  /** Device px per stage unit a shot needs at its closest framing. */
  const shotRes = (shot) => {
    const cam = shot.camera;
    const zoom = options.reducedMotion ? (cam?.still?.zoom ?? cam?.from?.zoom ?? cam?.zoom ?? 1)
      : Math.max(cam?.from?.zoom ?? cam?.zoom ?? 1, cam?.to?.zoom ?? 1);
    const cover = Math.max(L.panel.w / STAGE.w, L.panel.h / STAGE.h);
    const res = cover * Math.max(1, zoom) * k * (options.lowGraphics ? 0.8 : 1);
    return Math.max(RES_STEP, Math.ceil(res / RES_STEP) * RES_STEP);
  };

  const envFor = (shotIndex, layer, cam, view) => {
    const shot = def.shots[shotIndex];
    const res = shotRes(shot);
    return {
      time: session.time,
      wall: wallTime,
      seconds: layer.seconds,
      local: layer.local,
      duration: shot.duration,
      reducedMotion: options.reducedMotion,
      lowGraphics: options.lowGraphics,
      textScale: options.textScale,
      camera: cam,
      view: view.view,
      stage: STAGE,
      res,
      /** A static layer of this shot, painted once at its resolution: { canvas, w, h }. */
      layer(key, paint, { w = STAGE.w, h = STAGE.h } = {}) {
        // '@name' layers are shared by every shot of the cutscene that paints them
        const id = key.startsWith('@') ? `${key}@${res}` : `${shotIndex}:${key}@${res}`;
        let entry = layers.get(id);
        if (!entry) {
          const element = makeCanvas(w * res, h * res);
          const c = ctx2d(element);
          c.setTransform(res, 0, 0, res, 0, 0);
          paint(c, w, h, this);
          entry = { canvas: element, w, h };
          layers.set(id, entry);
        }
        return entry;
      },
      /** Draw a cached layer at (x, y), moved by parallax for `depth` < 1. */
      drawLayer(c, key, paint, { x = 0, y = 0, w = STAGE.w, h = STAGE.h, depth = 1, alpha = 1 } = {}) {
        const entry = this.layer(key, paint, { w, h });
        const off = parallaxOffset(cam, depth);
        c.save();
        if (alpha !== 1) c.globalAlpha *= alpha;
        c.drawImage(entry.canvas, x + off.x, y + off.y, entry.w, entry.h);
        c.restore();
        return entry;
      },
      parallax: (depth) => parallaxOffset(cam, depth),
      rng,
    };
  };

  /** Paint one shot into `c`, in panel space (0, 0 is the panel's corner). */
  const drawShot = (c, layer) => {
    const shot = def.shots[layer.index];
    const cam = cameraAt(shot.camera, layer.local, { reducedMotion: options.reducedMotion });
    const view = stageView(L.panel.w, L.panel.h, cam);
    c.save();
    c.translate(view.tx, view.ty);
    c.scale(view.scale, view.scale);
    try {
      shot.draw(c, layer.local, STAGE.w, STAGE.h, envFor(layer.index, layer, cam, view));
    } catch (error) {
      if (!drawShot.warned) console.warn('[cutscene] shot failed', shot.id, error);
      drawShot.warned = true;
    }
    c.restore();
  };

  const clipPanel = (c, x, y) => {
    roundRectPath(c, x, y, L.panel.w, L.panel.h, L.panel.r);
    c.clip();
  };

  const panelAt = (c, layer, dx = 0, dy = 0, scale = 1) => {
    const p = L.panel;
    c.save();
    c.translate(p.x + dx + (p.w * (1 - scale)) / 2, p.y + dy + (p.h * (1 - scale)) / 2);
    c.scale(scale, scale);
    c.fillStyle = '#05070b';
    c.fillRect(0, 0, p.w, p.h);
    clipPanel(c, 0, 0);
    if (layer) drawShot(c, layer);
    c.restore();
    c.save();
    c.translate(p.x + dx + (p.w * (1 - scale)) / 2, p.y + dy + (p.h * (1 - scale)) / 2);
    c.scale(scale, scale);
    c.drawImage(frame.canvas, -frame.pad, -frame.pad, p.w + frame.pad * 2, p.h + frame.pad * 2);
    c.restore();
  };

  const drawIncomingToBuffer = (layer) => {
    const b = buffer.ctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, buffer.canvas.width, buffer.canvas.height);
    b.setTransform(k, 0, 0, k, 0, 0);
    b.fillStyle = '#05070b';
    b.fillRect(0, 0, L.panel.w, L.panel.h);
    drawShot(b, layer);
  };

  /** The ink wipe: a ragged front sweeps left to right, a band of ink at its edge. */
  const inkFront = (c, progress, w, h, seed) => {
    const band = w * 0.08;
    const head = -band + progress * (w + band * 2.2);
    const random = rng(seed);
    const wobble = Array.from({ length: 9 }, () => random());
    const xAt = (y) => head + (Math.sin((y / h) * 7.1 + wobble[0] * 6) * 0.5 + Math.sin((y / h) * 17.3 + wobble[1] * 6) * 0.25 + (wobble[2 + Math.floor((y / h) * 6.99)] - 0.5) * 0.35) * band * 0.9 - (y / h) * band * 0.8;
    c.beginPath();
    c.moveTo(-10, -10);
    for (let y = -10; y <= h + 10; y += h / 40) c.lineTo(xAt(y), y);
    c.lineTo(-10, h + 10);
    c.closePath();
    return { xAt, band };
  };

  const render = () => {
    if (!L) return;
    const start = performance.now();
    const f = session.frame();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(wall, 0, 0);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const p = L.panel;
    const [a, b] = f.layers;
    const tr = f.transition;
    if (!tr || !b) {
      panelAt(ctx, a);
    } else if (tr.type === 'slide') {
      // Chapter 1's window swap: the panels slide along the wall, a little
      // smaller while they travel, the next one taking the frame
      const e = 0.5 - Math.cos(Math.PI * tr.progress) / 2;
      const gap = p.w + L.frame * 6 + L.margin;
      const scale = 1 - 0.07 * Math.sin(Math.PI * tr.progress);
      panelAt(ctx, a, -gap * e * scale, 0, scale);
      panelAt(ctx, b, gap * (1 - e) * scale, 0, scale);
    } else if (tr.type === 'black') {
      const first = tr.progress < 0.5;
      panelAt(ctx, first ? a : b);
      ctx.save();
      clipPanel(ctx, p.x, p.y);
      ctx.fillStyle = `rgba(3, 4, 7, ${first ? tr.progress * 2 : (1 - tr.progress) * 2})`;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.restore();
    } else if (tr.type === 'cut') {
      panelAt(ctx, b);
    } else {
      panelAt(ctx, a);
      drawIncomingToBuffer(b);
      const bc = buffer.ctx;
      if (tr.type === 'ink') {
        bc.save();
        bc.setTransform(k, 0, 0, k, 0, 0);
        bc.globalCompositeOperation = 'destination-in';
        bc.fillStyle = '#000';
        inkFront(bc, tr.progress, p.w, p.h, 7301);
        bc.fill();
        bc.restore();
      }
      ctx.save();
      clipPanel(ctx, p.x, p.y);
      if (tr.type === 'fade') ctx.globalAlpha = 0.5 - Math.cos(Math.PI * tr.progress) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(buffer.canvas, Math.round(p.x * k), Math.round(p.y * k));
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalAlpha = 1;
      if (tr.type === 'ink') {
        // the wet edge: a navy-black band and a fine ivory rim
        ctx.translate(p.x, p.y);
        const { xAt, band } = inkFront({ beginPath() {}, moveTo() {}, lineTo() {}, closePath() {} }, tr.progress, p.w, p.h, 7301);
        ctx.beginPath();
        for (let y = -10; y <= p.h + 10; y += p.h / 40) ctx.lineTo(xAt(y), y);
        for (let y = p.h + 10; y >= -10; y -= p.h / 40) ctx.lineTo(xAt(y) - band * (0.55 + 0.25 * Math.sin(y * 0.05)), y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(8, 11, 20, 0.96)';
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(234, 223, 198, 0.45)';
        ctx.beginPath();
        for (let y = -10; y <= p.h + 10; y += p.h / 40) ctx.lineTo(xAt(y), y);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.drawImage(frame.canvas, -frame.pad, -frame.pad, p.w + frame.pad * 2, p.h + frame.pad * 2);
      ctx.restore();
    }
    // a `blackout` shot takes the whole screen to black, frame and wall too
    const lastShot = def.shots[f.layers[f.layers.length - 1]?.index ?? 0];
    if (lastShot?.blackout) {
      const join = tr && b ? tr.progress : 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(2, 3, 6, ${join})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    updateCaption(f.captions[0] ?? null);
    const ms = performance.now() - start;
    stats.frames += 1;
    stats.samples.push(ms);
    if (stats.samples.length > 90) stats.samples.shift();
    root.dataset.shot = String(f.shot);
  };

  const captionText = caption.querySelector('.nf-cinematic-caption__text');
  const captionSpeaker = caption.querySelector('.nf-cinematic-caption__speaker');
  function updateCaption(next) {
    const key = next ? `${next.start}:${next.text}` : null;
    if (key === shownCaption) return;
    shownCaption = key;
    if (!next) { caption.classList.remove('is-visible'); return; }
    captionText.textContent = next.text;
    captionSpeaker.textContent = next.speaker ?? '';
    captionSpeaker.hidden = !next.speaker;
    caption.classList.add('is-visible');
  }

  const fire = (cues) => {
    cues.forEach((cue) => {
      if (cue.sfx) sfx.play(cue.sfx, cue);
      if (cue.stopSfx) sfx.stop(cue.stopSfx, cue.fade);
      if (cue.music) music.play(cue.music.id, cue.music);
      if (cue.stopMusic) music.stop({ fade: cue.fade ?? 2.5 });
    });
  };

  const startMusic = () => {
    if (musicStarted || !def.music?.src) return;
    musicStarted = true;
    music.play(def.music.id ?? `cutscene-${def.id}`, { loop: true, fade: 2, ...def.music });
  };

  const tick = (now) => {
    raf = 0;
    if (destroyed) return;
    const paused = session.paused;
    if (lastWall !== null && !paused) {
      const step = Math.max(0, (now - lastWall) / 1000);
      wallTime += Math.min(0.25, step);
      stats.ticks += 1;
      if (step > 0.25) stats.longTicks += 1;
      stats.maxStep = Math.max(stats.maxStep, step);
    }
    lastWall = paused ? null : now;
    const before = session.status;
    fire(session.tick(now));
    render();
    if (before === 'playing' && session.status !== 'playing') reachEnd();
    if (!paused) raf = requestAnimationFrame(tick);
  };

  const reachEnd = () => {
    if (ended) return;
    ended = true;
    music.stop({ fade: def.music?.outFade ?? 2.2 });
    sfx.close();
    onEnd({ skipped: session.skipped });
  };

  const schedule = () => { if (!raf && !destroyed && !session.paused) raf = requestAnimationFrame(tick); };

  const onPause = (event) => {
    if (event.detail?.paused) controller.pause('menu');
    else controller.resume('menu');
  };
  const onVisibility = () => {
    if (document.hidden) controller.pause('hidden');
    else controller.resume('hidden');
  };
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layout(); render(); }, 120);
  };

  // Warm every shot's layers before (shots 1–2) or during playback (the
  // rest, one per idle moment), so a shot never paints itself on screen.
  const warm = (index) => {
    const shot = def.shots[index];
    if (!shot || !L) return;
    const scratch = ctx2d(makeCanvas(2, 2));
    [0, 1].forEach((local) => {
      const layer = { index, local, seconds: local * shot.duration };
      const cam = cameraAt(shot.camera, local, { reducedMotion: options.reducedMotion });
      const view = stageView(L.panel.w, L.panel.h, cam);
      try { shot.draw(scratch, local, STAGE.w, STAGE.h, envFor(index, layer, cam, view)); } catch { /* drawn again on screen */ }
    });
  };
  const warmRest = (index) => {
    if (destroyed || index >= def.shots.length) return;
    const idle = globalThis.requestIdleCallback ?? ((fn) => setTimeout(fn, 60));
    idle(() => { warm(index); warmRest(index + 1); }, { timeout: 500 });
  };

  const debug = devRoutesEnabled();
  const previousText = debug ? window.render_game_to_text : undefined;
  const state = () => {
    const f = session.frame();
    return {
      cutscene: def.id,
      status: holding ? 'holding' : session.status,
      time: f.time,
      duration: timeline.duration,
      shot: def.shots[f.shot]?.id ?? f.shot,
      shotIndex: f.shot,
      transition: f.transition,
      caption: f.captions[0]?.text ?? null,
      paused: session.paused,
      pauseReasons: session.pauseReasons,
      skipped: session.skipped,
      reducedMotion: options.reducedMotion,
      lowGraphics: options.lowGraphics,
      textScale: options.textScale,
      softwareCanvas: Boolean(contextOptions.willReadFrequently),
      panel: L?.panel ?? null,
      layersCached: layers.size,
      warmMs: stats.warmMs ?? null,
      ticks: stats.ticks,
      longTicks: stats.longTicks,
      maxStepMs: Math.round(stats.maxStep * 1000),
      frameMs: stats.samples.length ? Math.round((stats.samples.reduce((s, v) => s + v, 0) / stats.samples.length) * 10) / 10 : null,
    };
  };

  const controller = {
    id: def.id,
    timeline,
    session,
    async start() {
      if (started || destroyed) return;
      started = true;
      layout();
      // the plates and tags are lettered in Space Mono: wait for it briefly
      if (document.fonts?.load) {
        await Promise.race([
          document.fonts.load('700 12px "Space Mono"').catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 900)),
        ]);
      }
      if (destroyed) return;
      // the scene's pictures (paper grain, the night carriage): briefly
      if (typeof def.prepare === 'function') {
        await Promise.race([
          Promise.resolve().then(() => def.prepare()).catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
      if (destroyed) return;
      // Paint every shot's layers behind the black overlay before the first
      // frame, a shot per frame, so nothing paints itself mid-playback; past
      // WARM_BUDGET_MS the rest are painted in idle moments as it plays.
      const warmStart = performance.now();
      let warmed = 0;
      while (warmed < def.shots.length && (warmed < 2 || performance.now() - warmStart < WARM_BUDGET_MS)) {
        warm(warmed);
        warmed += 1;
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (destroyed) return;
      }
      stats.warmMs = Math.round(performance.now() - warmStart);
      startMusic();
      sfx.resume();
      if (document.hidden) session.pause('hidden');
      root.classList.add('is-ready');
      render();
      schedule();
      warmRest(warmed);
    },
    pause(reason = 'menu') {
      if (destroyed) return;
      session.pause(reason);
      sfx.pause();
      root.dataset.paused = 'true';
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      lastWall = null;
    },
    resume(reason = 'menu') {
      if (destroyed) return;
      session.resume(reason);
      if (!session.paused) {
        delete root.dataset.paused;
        sfx.resume();
        schedule();
      }
    },
    skip() {
      if (destroyed) return;
      session.skip();
      render();
      reachEnd();
    },
    /** Keep the last frame up while the next chapter loads, with the small "arriving" line. */
    hold(on) {
      holding = Boolean(on);
      root.classList.toggle('is-holding', holding);
      if (holding) schedule();
    },
    markReady() { session.markReady(); },
    // dev / QA: show the frame at `t` seconds and stop the clock there
    freeze(t) {
      if (!L) layout();
      session.seek(Number(t) || 0);
      session.pause('freeze');
      render();
      return state();
    },
    seek(t) { session.seek(Number(t) || 0); render(); return state(); },
    state,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('nightfall:pause', onPause);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      if (!ended) { music.stop({ fade: 1.2 }); sfx.close(); }
      layers.clear();
      if (debug) {
        if (window.NIGHTFALL_CUTSCENE === controller) delete window.NIGHTFALL_CUTSCENE;
        window.render_game_to_text = previousText;
      }
    },
  };

  window.addEventListener('nightfall:pause', onPause);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);
  if (debug) {
    window.NIGHTFALL_CUTSCENE = controller;
    window.render_game_to_text = () => JSON.stringify(state());
  }
  return controller;
}

export { ARRIVING_TEXT };
