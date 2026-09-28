// Chapter 2 · BORROWED LIGHT — synthesized sound (WebAudio), on the SFX bus.
//
// No samples: the ticket punch clack, the bell with a long inharmonic decay
// (the same family as Chapter 1's bell), machine hum / clunk, paper fizzle,
// rain ambience that swells in the blackout, and distant thunder. Every call
// is safe before the first gesture and never throws into gameplay.

import { DEFAULT_SETTINGS, volumeForChannel } from '../../shell/saveSystem.js';

let ctx = null;
let master = null;
let rain = null;
let hum = null;
let noiseBuffer = null;
let paused = false;

const settings = () => globalThis.NIGHTFALL_SETTINGS ?? DEFAULT_SETTINGS;
const sfxLevel = () => volumeForChannel(settings(), 'sfx');

function audio() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = sfxLevel();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    master.connect(comp);
    comp.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      // Pinkish noise: white smoothed a little.
      const white = Math.random() * 2 - 1;
      last = last * 0.86 + white * 0.14;
      data[i] = white * 0.5 + last * 1.6;
    }
  } catch {
    ctx = null;
  }
  return ctx;
}

function live() {
  const c = audio();
  if (!c || paused) return null;
  if (c.state === 'suspended') c.resume().catch(() => {});
  return c;
}

export function installAudio() {
  const unlock = () => { const c = audio(); if (c?.state === 'suspended') c.resume().catch(() => {}); };
  globalThis.addEventListener?.('keydown', unlock, { once: false, passive: true });
  globalThis.addEventListener?.('pointerdown', unlock, { once: false, passive: true });
  globalThis.addEventListener?.('nightfall:settings', () => {
    if (master && ctx) master.gain.setTargetAtTime(sfxLevel(), ctx.currentTime, 0.05);
  });
  globalThis.addEventListener?.('nightfall:pause', (event) => {
    paused = Boolean(event.detail?.paused);
    if (!ctx) return;
    if (paused) ctx.suspend?.().catch(() => {});
    else ctx.resume?.().catch(() => {});
  });
}

function env(gainNode, t0, { attack = 0.004, peak = 0.3, decay = 0.2, sustain = 0 } = {}) {
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t0 + attack + decay);
}

function osc(c, type, freq, t0, dur, { peak = 0.2, attack = 0.005, to = null, dest = master, detune = 0 } = {}) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.detune.value = detune;
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  env(g, t0, { attack, peak, decay: dur });
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + attack + dur + 0.05);
}

function noise(c, t0, dur, { peak = 0.2, type = 'bandpass', freq = 2000, q = 1, attack = 0.002, to = null, dest = master } = {}) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  f.Q.value = q;
  const g = c.createGain();
  env(g, t0, { attack, peak, decay: dur });
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + attack + dur + 0.05);
}

// ---- one-shots -----------------------------------------------------------

export function punchClack() {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  noise(c, t, 0.05, { peak: 0.5, freq: 3200, q: 2.5 });
  osc(c, 'square', 1800, t, 0.03, { peak: 0.12, to: 600 });
  noise(c, t + 0.028, 0.09, { peak: 0.28, freq: 900, q: 1.4 });
  osc(c, 'triangle', 190, t + 0.02, 0.08, { peak: 0.2, to: 110 });
}

export function fizzle() {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  noise(c, t, 0.32, { peak: 0.16, type: 'highpass', freq: 5200, to: 1800, q: 0.7 });
  osc(c, 'sine', 900, t, 0.2, { peak: 0.04, to: 300 });
}

export function refused() {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  osc(c, 'triangle', 220, t, 0.14, { peak: 0.12, to: 180 });
  osc(c, 'triangle', 165, t + 0.1, 0.18, { peak: 0.1, to: 140 });
  noise(c, t, 0.18, { peak: 0.06, type: 'highpass', freq: 4000 });
}

export function cutLine() {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  noise(c, t, 0.06, { peak: 0.45, freq: 2600, q: 3 });
  osc(c, 'sawtooth', 320, t, 0.4, { peak: 0.08, to: 70 });
}

// The bell: a struck brass bell, partials at bell-like ratios with long,
// staggered decays. The departure bell is lower and rosier.
export function bell({ departure = false, soft = false } = {}) {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  const base = departure ? 392 : 523.25;
  const level = soft ? 0.45 : 1;
  const partials = [[0.5, 0.22, 3.2], [1, 0.3, 2.6], [1.19, 0.14, 1.9], [1.56, 0.1, 1.5], [2, 0.12, 1.3], [2.74, 0.06, 0.9], [3.76, 0.04, 0.6]];
  partials.forEach(([ratio, peak, dur], i) => osc(c, 'sine', base * ratio, t, dur, { peak: peak * level * 0.55, attack: 0.002 + i * 0.001, detune: (Math.random() - 0.5) * 6 }));
  noise(c, t, 0.04, { peak: 0.2 * level, freq: 5000, q: 1 });
  if (departure) osc(c, 'sine', base * 0.25, t, 3.6, { peak: 0.12 * level });
}

export function machineOn(kind = 'bridge') {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  const low = { lift: 70, bridge: 95, billboard: 140, fan: 60, shutter: 110, points: 85, drawbridge: 65, sign: 180 }[kind] ?? 90;
  osc(c, 'triangle', low * 1.6, t, 0.12, { peak: 0.28, to: low });
  noise(c, t, 0.1, { peak: 0.18, freq: 400, q: 0.8 });
  osc(c, 'sawtooth', low, t + 0.05, kind === 'fan' ? 0.9 : 0.5, { peak: 0.06, to: low * 1.4 });
  if (kind === 'billboard' || kind === 'sign') {
    for (let i = 0; i < 3; i += 1) noise(c, t + 0.05 + i * 0.07, 0.03, { peak: 0.1, freq: 6000, type: 'highpass' });
  }
}

export function machineOff(kind = 'bridge') {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  const low = { lift: 60, bridge: 80, fan: 50 }[kind] ?? 75;
  osc(c, 'triangle', low * 1.2, t, 0.22, { peak: 0.24, to: low * 0.6 });
  noise(c, t + 0.02, 0.16, { peak: 0.14, freq: 260, q: 0.7 });
}

export function flickerTick() {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  for (let i = 0; i < 4; i += 1) noise(c, t + i * 0.13, 0.03, { peak: 0.06, freq: 7000, type: 'highpass' });
}

export function lampLit() {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  osc(c, 'sine', 660, t, 0.5, { peak: 0.06 });
  osc(c, 'sine', 990, t + 0.06, 0.6, { peak: 0.04 });
  noise(c, t, 0.2, { peak: 0.05, freq: 3000 });
}

export function stoneChime() {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  [784, 988, 1175, 1568].forEach((f, i) => osc(c, 'sine', f, t + i * 0.09, 1.4, { peak: 0.08 }));
}

export function paper() {
  const c = live(); if (!c) return;
  noise(c, c.currentTime, 0.22, { peak: 0.08, freq: 2400, q: 0.6, attack: 0.03 });
}

export function land(hard = false) {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  noise(c, t, hard ? 0.14 : 0.07, { peak: hard ? 0.2 : 0.08, freq: hard ? 500 : 1400, q: 0.8 });
  if (hard) osc(c, 'sine', 90, t, 0.12, { peak: 0.12, to: 50 });
}

export function step() {
  const c = live(); if (!c) return;
  noise(c, c.currentTime, 0.035, { peak: 0.035, freq: 1800 + Math.random() * 800, q: 1.2 });
}

export function jumpSound() {
  const c = live(); if (!c) return;
  noise(c, c.currentTime, 0.08, { peak: 0.05, freq: 1200, q: 0.6, to: 2200 });
}

export function fallWhoosh() {
  const c = live(); if (!c) return;
  noise(c, c.currentTime, 0.7, { peak: 0.14, type: 'lowpass', freq: 1400, to: 300, attack: 0.1 });
}

export function thunder(distance = 0.5) {
  const c = live(); if (!c) return;
  const t = c.currentTime + 0.1 + distance * 0.8;
  noise(c, t, 2.6, { peak: 0.36 * (1 - distance * 0.5), type: 'lowpass', freq: 380, to: 90, attack: 0.08 });
  noise(c, t + 0.25, 1.8, { peak: 0.2 * (1 - distance * 0.5), type: 'lowpass', freq: 220, to: 70, attack: 0.3 });
  osc(c, 'sine', 42, t, 2.2, { peak: 0.14 });
}

export function blackoutCut() {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  osc(c, 'sawtooth', 120, t, 0.8, { peak: 0.12, to: 30 });
  noise(c, t, 0.5, { peak: 0.2, type: 'lowpass', freq: 800, to: 80 });
}

export function trainChime() {
  const c = live(); if (!c) return;
  const t = c.currentTime;
  [659.25, 523.25, 392].forEach((f, i) => osc(c, 'sine', f, t + i * 0.32, 1.2, { peak: 0.1 }));
}

// ---- loops ---------------------------------------------------------------

export function setRain(level = 0.5) {
  const c = audio(); if (!c || !noiseBuffer) return;
  if (!rain) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 7000;
    const g = c.createGain();
    g.gain.value = 0.0001;
    // A second, lower body for the roof drumming.
    const src2 = c.createBufferSource();
    src2.buffer = noiseBuffer; src2.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.6;
    const g2 = c.createGain();
    g2.gain.value = 0.0001;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
    src2.connect(bp); bp.connect(g2); g2.connect(master);
    src.start(); src2.start(0, 0.7);
    rain = { g, g2 };
  }
  const t = c.currentTime;
  rain.g.gain.setTargetAtTime(Math.max(0.0001, 0.05 * level), t, 0.6);
  rain.g2.gain.setTargetAtTime(Math.max(0.0001, 0.06 * level), t, 0.8);
}

// A low hum that follows how many powered machines are near Butch.
export function setHum(level = 0) {
  const c = audio(); if (!c) return;
  if (!hum) {
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 110.6;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
    const g = c.createGain(); g.gain.value = 0.0001;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
    o1.start(); o2.start();
    hum = { g };
  }
  hum.g.gain.setTargetAtTime(Math.max(0.0001, 0.035 * Math.min(1, level)), c.currentTime, 0.25);
}
