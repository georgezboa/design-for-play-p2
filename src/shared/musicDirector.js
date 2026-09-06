// NIGHTFALL — shared music director (V02 tracklist integration, 2026-08-12).
//
// One HTMLAudio-based singleton every chapter entry can drive. Deliberately
// independent of Phaser's sound system so it works identically in car03,
// car04, painted-country, the museum rooms and the labyrinth, and so tracks
// STREAM (the V02 recordings are 2–17 MB each — preloading them through the
// Phaser loader would stall every boot).
//
// Rules inherited from car03Audio.js:
// - never gates input, never throws into gameplay code;
// - no sound before the first real user gesture (autoplay policy): calls made
//   earlier are remembered as `pending` and start on the first
//   keydown/pointerdown;
// - everything is a crossfade, never a hard cut, unless fade: 0 is passed.
//
// Usage:
//   import { music } from '../shared/musicDirector.js';   // adjust depth
//   music.play('gnossienne', { src: 'assets/music/ch3/3.1_satie_gnossienne_no1.mp3' });
//   music.play('moonlight',  { src: '.../3.5_beethoven_moonlight_mvt1.mp3', fade: 4 });
//   music.play('wagner',     { src: '...', loop: false, then: 'pizzicato',
//                              thenOptions: { src: '...' } });
//   music.stop({ fade: 3 });

import { audioFocus } from './audioFocus.js';

const DEFAULTS = {
  volume: 0.55,
  fade: 2.5,
  outFade: 2.5,
  loop: true,
  // Dialogue must remain legible without making the score disappear. The
  // director applies this as a short attack / longer release automation.
  dialogueDuckDb: -9,
};

let unlocked = false;
let pending = null;          // play() call made before the first gesture
let current = null;          // { id, el, targetVol, loop, then, thenOptions }
const registry = new Map();  // id -> { src, ...lastOptions }
let dialogueActive = false;
let pausedForFocus = false;
let pausedForMenu = false;

const dbToGain = (db) => 10 ** (db / 20);

function musicTarget(entry) {
  if (!entry) return 0;
  const settings = globalThis.NIGHTFALL_SETTINGS;
  const mix = settings
    ? (settings.masterVolume / 100) * (settings.musicVolume / 100)
    : 1;
  return entry.baseVolume * mix * (dialogueActive ? dbToGain(entry.dialogueDuckDb) : 1);
}

function installUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    if (pending) {
      const call = pending;
      pending = null;
      play(call.id, call.options);
    }
  };
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('pointerdown', unlock, { passive: true });
}
installUnlock();
if (typeof window !== 'undefined') {
  window.addEventListener('nightfall:settings', () => {
    if (current) fadeTo(current.el, musicTarget(current), 0.08);
  });
  window.addEventListener('nightfall:pause', (event) => {
    pausedForMenu = event.detail?.paused === true;
    if (!current) return;
    if (pausedForMenu) {
      current.el.pause();
      return;
    }
    if (unlocked && audioFocus.isActive()) {
      current.el.play().catch(() => {});
    }
  });
}

// One rAF loop owns every running volume ramp (cheap: at most 2 tracks overlap).
const ramps = new Set();     // { el, to, perSec, onDone }
let rafRunning = false;

function rampPump() {
  if (ramps.size === 0) { rafRunning = false; return; }
  rafRunning = true;
  requestAnimationFrame(() => {
    const dt = 1 / 60;
    for (const r of [...ramps]) {
      const diff = r.to - r.el.volume;
      const step = r.perSec * dt;
      if (Math.abs(diff) <= step) {
        r.el.volume = Math.max(0, Math.min(1, r.to));
        ramps.delete(r);
        if (r.onDone) r.onDone();
      } else {
        r.el.volume = Math.max(0, Math.min(1, r.el.volume + Math.sign(diff) * step));
      }
    }
    rampPump();
  });
}

function fadeTo(el, to, seconds, onDone) {
  for (const r of [...ramps]) if (r.el === el) ramps.delete(r);
  if (seconds <= 0) {
    el.volume = Math.max(0, Math.min(1, to));
    if (onDone) onDone();
    return;
  }
  const perSec = Math.abs(to - el.volume) / seconds || 1;
  ramps.add({ el, to, perSec, onDone });
  if (!rafRunning) rampPump();
}

function play(id, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  if (!opts.src) return;
  registry.set(id, opts);
  if (current && current.id === id) return;   // already playing this section
  if (!unlocked) { pending = { id, options: opts }; return; }

  const prev = current;
  const el = new Audio(opts.src);
  el.dataset.nightfallAudioChannel = 'music';
  el.loop = opts.loop;
  el.volume = 0;
  el.preload = 'auto';

  current = {
    id, el,
    baseVolume: opts.volume,
    outFade: opts.outFade,
    dialogueDuckDb: opts.dialogueDuckDb,
    then: opts.then || null,
    thenOptions: opts.thenOptions || null,
    onThen: opts.onThen || null,
  };

  if (opts.then && !opts.loop) {
    el.addEventListener('ended', () => {
      // Only chain if nothing else took over in the meantime.
      if (current && current.id === id && current.then) {
        current.onThen?.();
        const follow = registry.get(current.then) || current.thenOptions;
        if (follow) play(current.then, follow);
      }
    });
  }

  const canPlay = audioFocus.isActive() && !pausedForMenu;
  const p = canPlay ? el.play() : null;
  pausedForFocus = !audioFocus.isActive();
  if (p && p.catch) p.catch(() => { /* autoplay race — next gesture re-arms */ });

  fadeTo(el, musicTarget(current), opts.fade);
  if (prev) {
    fadeTo(prev.el, 0, prev.outFade, () => {
      prev.el.pause();
      prev.el.src = '';
    });
  }
}

// Called by narrative runtimes, not by individual dialogue lines. This keeps
// the mix stable across rapid subtitle advances: voice/text causes a quick
// -9 dB focus dip, then the score returns over 700 ms rather than pumping.
function setDialogueActive(active) {
  const next = Boolean(active);
  if (next === dialogueActive) return;
  dialogueActive = next;
  if (!current) return;
  fadeTo(current.el, musicTarget(current), next ? 0.12 : 0.7);
}

function stop({ fade = 2.5 } = {}) {
  pending = null;
  if (!current) return;
  const prev = current;
  current = null;
  fadeTo(prev.el, 0, fade, () => {
    prev.el.pause();
    prev.el.src = '';
  });
}

function currentId() {
  return current ? current.id : (pending && pending.id) || null;
}

// QA hook for automated playtests: distinguishes "actually streaming" from
// "armed, waiting for the first gesture".
function qa() {
  return {
    id: currentId(),
    playing: Boolean(current && !current.el.paused),
    unlocked,
    dialogueDucked: dialogueActive,
    audioFocus: audioFocus.isActive(),
    menuPaused: pausedForMenu,
  };
}

audioFocus.subscribe({
  pause: () => {
    if (!current || current.el.paused) return;
    pausedForFocus = true;
    current.el.pause();
  },
  resume: () => {
    if (!current || !unlocked || !pausedForFocus || pausedForMenu) return;
    pausedForFocus = false;
    current.el.play().catch(() => {
      pausedForFocus = true;
    });
  },
});

// Read-only production QA surface used by the packaged-build smoke test. It
// exposes no controls and cannot change the mix.
if (typeof window !== 'undefined') window.NIGHTFALL_MUSIC_QA = qa;

export const music = { play, stop, currentId, setDialogueActive, qa };
export default music;
