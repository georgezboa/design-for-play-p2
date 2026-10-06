// NIGHTFALL — shared music director (V02 tracklist integration, 2026-08-12).
//
// One HTMLAudio-based singleton every chapter entry can drive. Deliberately
// independent of Phaser's sound system so it works identically in Echo City,
// Borrowed Light, the painted country, the museum rooms and the labyrinth, and so tracks
// STREAM (the V02 recordings are 2–17 MB each — preloading them through the
// Phaser loader would stall every boot).
//
// Rules inherited from car03Audio.js:
// - never gates input, never throws into gameplay code;
// - a page's music is TRIED at once (alpha round 4: the true ending and
//   Chapter 2's opening played in silence, waiting for a key they never ask
//   for). Only when the browser refuses autoplay is the call remembered as
//   `pending`, started on the first keydown/pointerdown, and a small
//   "♪ CLICK FOR SOUND" tag shown meanwhile (autoplayGate.js);
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
import { SOUND_TAG_TEXT, createAutoplayGate } from './autoplayGate.js';

const DEFAULTS = {
  volume: 0.55,
  fade: 2.5,
  outFade: 2.5,
  loop: true,
  // Dialogue must remain legible without making the score disappear. The
  // director applies this as a short attack / longer release automation.
  dialogueDuckDb: -9,
};

let pending = null;          // play() call waiting for the first gesture
let current = null;          // { id, el, targetVol, loop, then, thenOptions }
const registry = new Map();  // id -> { src, ...lastOptions }
let dialogueActive = false;
let pausedForFocus = false;
let pausedForMenu = false;

const dbToGain = (db) => 10 ** (db / 20);

// "♪ CLICK FOR SOUND": shown only while the browser refused autoplay and a
// track waits for the first gesture. Small, bottom centre, in the finale
// palette; any key or click anywhere unlocks (the tag itself included).
let soundTag = null;
let soundTagWanted = false;
function setSoundTag(visible) {
  soundTagWanted = visible;
  if (typeof document === 'undefined' || !document.body) return;
  if (!visible && !soundTag) return;
  if (!soundTag) {
    soundTag = document.createElement('button');
    soundTag.type = 'button';
    soundTag.className = 'nf-sound-tag';
    soundTag.textContent = SOUND_TAG_TEXT;
    soundTag.setAttribute('aria-label', 'Click for sound');
    soundTag.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:14px', 'transform:translateX(-50%)', 'z-index:40',
      'padding:6px 12px', 'border-radius:5px', 'cursor:pointer', 'pointer-events:auto',
      'font:700 11px/1.2 var(--nf-mono, ui-monospace, monospace)', 'letter-spacing:0.16em',
      'color:#eadfc6', 'background:rgba(22, 15, 10, 0.82)', 'border:1px solid rgba(176, 138, 74, 0.75)',
      'box-shadow:0 2px 10px rgba(0, 0, 0, 0.4)', 'transition:opacity 0.4s ease', 'opacity:0',
    ].join(';');
    document.body.append(soundTag);
  }
  if (visible) soundTag.hidden = false;
  soundTag.style.opacity = visible ? '0.92' : '0';
  if (!visible) setTimeout(() => { if (soundTag && !soundTagWanted) soundTag.hidden = true; }, 450);
}

const gate = createAutoplayGate({
  onUnlocked: () => setSoundTag(false),
});

// Alpha round 4 fix round (P2): a page with its own sound engine (Chapter
// 1's synthesised bus and loop, nightService/audio.js) shows the same tag
// while the browser refuses to start it. Any key or click anywhere still
// hides it (installUnlock below); the page starts its own sound on that
// gesture.
export function setSoundTagVisible(visible) {
  setSoundTag(Boolean(visible));
}

function musicTarget(entry) {
  if (!entry) return 0;
  const settings = globalThis.NIGHTFALL_SETTINGS;
  const mix = settings
    ? (settings.masterVolume / 100) * (settings.musicVolume / 100)
    : 1;
  return entry.baseVolume * mix * (dialogueActive ? dbToGain(entry.dialogueDuckDb) : 1);
}

// Start (or resume) an entry's element. An autoplay refusal hands the call
// back as `pending` for the first gesture; other errors (an abort when the
// source changes) are ignored, as before.
function startElement(entry) {
  let promise;
  try { promise = entry.el.play(); } catch (error) { promise = Promise.reject(error); }
  if (!promise?.then) { gate.played(); return; }
  promise.then(() => {
    gate.played();
    setSoundTag(false);
  }, (error) => {
    if (!gate.rejected(error) || current !== entry) return;
    for (const r of [...ramps]) if (r.el === entry.el) ramps.delete(r);
    current = null;
    entry.el.src = '';
    pending = { id: entry.id, options: registry.get(entry.id) };
    setSoundTag(true);
  });
}

function installUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    gate.gesture();
    setSoundTag(false);
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
    if (gate.canAttempt() && audioFocus.isActive()) startElement(current);
  });
}

// One rAF loop owns every running volume ramp (cheap: at most 2 tracks overlap).
// Ramps follow the wall clock, not the frame count: on a 15 fps laptop a
// 2.5 s crossfade still takes 2.5 s.
const ramps = new Set();     // { el, to, perSec, onDone }
let rafRunning = false;
let lastRampAt = 0;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function rampPump() {
  if (ramps.size === 0) { rafRunning = false; return; }
  if (!rafRunning) lastRampAt = nowMs();
  rafRunning = true;
  requestAnimationFrame(() => {
    const now = nowMs();
    const dt = Math.min(0.25, Math.max(0, (now - lastRampAt) / 1000));
    lastRampAt = now;
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
  if (!gate.canAttempt()) { pending = { id, options: opts }; setSoundTag(true); return; }
  pending = null;

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
  pausedForFocus = !audioFocus.isActive();
  if (canPlay) startElement(current);

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
  setSoundTag(false);
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
    unlocked: gate.state === 'allowed',
    autoplay: gate.state,
    waitingForGesture: Boolean(pending) && gate.state === 'blocked',
    soundTag: Boolean(soundTag && !soundTag.hidden && soundTag.style.opacity !== '0'),
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
    if (!current || !gate.canAttempt() || !pausedForFocus || pausedForMenu) return;
    pausedForFocus = false;
    startElement(current);
  },
});

// Read-only production QA surface used by the packaged-build smoke test. It
// exposes no controls and cannot change the mix.
if (typeof window !== 'undefined') window.NIGHTFALL_MUSIC_QA = qa;

export const music = { play, stop, currentId, setDialogueActive, qa, setSoundTagVisible };
export default music;
