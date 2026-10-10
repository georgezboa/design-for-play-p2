// Sound that starts outside a click (round 11: George plays on Safari, and
// the painted cutscenes started their score and their sounds a moment after
// the click that began them, once their paintings had loaded: Safari kept
// them silent, with no CLICK FOR SOUND tag).
//
// WebKit lets a page start sound only from inside a user gesture, and it
// remembers that per <audio> element and per AudioContext, not per page:
// a NEW element or context made later, outside a gesture, is refused again.
// So, at every key or click (capture phase, before any page handler can stop
// the event):
//
//   - a small pool of <audio> elements is unlocked by playing a silent clip
//     on each idle one; the music director takes its elements from this pool
//     (musicDirector.js), so a track started seconds later still plays;
//   - one AudioContext for the cutscenes' synthesised sounds is created and
//     resumed (cutscene/sfx.js uses it instead of a context of its own).
//
// Chrome and the desktop app allow sound after the first gesture anyway;
// for them this is a no-op.

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
export const POOL_SIZE = 3;
const GESTURES = ['pointerdown', 'mousedown', 'touchend', 'keydown', 'click'];

const pool = [];          // { el, busy, unlocked }
let context = null;
let contextHeld = false;
const gestureHooks = new Set();

function makeAudio() {
  if (typeof Audio === 'undefined') return null;
  const el = new Audio();
  el.preload = 'auto';
  return el;
}

/**
 * An <audio> element for a track: an unlocked idle one if there is one,
 * else any idle one, else a new one. Give it back with releaseAudio().
 */
export function acquireAudio() {
  let entry = pool.find((p) => !p.busy && p.unlocked) ?? pool.find((p) => !p.busy);
  if (!entry) {
    const el = makeAudio();
    if (!el) return null;
    entry = { el, busy: false, unlocked: false };
    pool.push(entry);
  }
  entry.busy = true;
  return entry.el;
}

/** Stop a pooled element and make it idle again (other elements are just stopped). */
export function releaseAudio(el) {
  if (!el) return;
  try {
    el.pause();
    el.removeAttribute?.('src');
    el.load?.();
  } catch { /* never throw into gameplay */ }
  const entry = pool.find((p) => p.el === el);
  if (entry) entry.busy = false;
}

/** Unlock every idle pooled element (call inside a gesture). */
function unlockIdle() {
  while (pool.length < POOL_SIZE) {
    const el = makeAudio();
    if (!el) break;
    pool.push({ el, busy: false, unlocked: false });
  }
  for (const entry of pool) {
    if (entry.busy || entry.unlocked) continue;
    const { el } = entry;
    try {
      el.src = SILENT_WAV;
      el.volume = 0;
      const promise = el.play();
      const done = () => {
        entry.unlocked = true;
        if (!entry.busy) {
          try { el.pause(); el.removeAttribute?.('src'); } catch { /* ignore */ }
        }
      };
      if (promise?.then) promise.then(done, () => {});
      else done();
    } catch { /* ignore */ }
  }
}

/** The cutscenes' shared AudioContext (created on first use or first gesture). */
export function sharedAudioContext() {
  if (context) return context;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try { context = new AC(); } catch { context = null; }
  return context;
}

/**
 * A paused cutscene suspends the shared context; while it is held, a gesture
 * (a click in the pause menu) does not resume it.
 */
export function holdSharedContext(on) {
  contextHeld = Boolean(on);
  const ctx = context;
  if (!ctx) return;
  if (contextHeld) ctx.suspend?.().catch(() => {});
  else ctx.resume?.().catch(() => {});
}

/** Run `fn` at every user gesture (inside it), e.g. the music director's pending track. */
export function onUserGesture(fn) {
  gestureHooks.add(fn);
  return () => gestureHooks.delete(fn);
}

function gesture(event) {
  if (event?.isTrusted === false) return;
  unlockIdle();
  const ctx = sharedAudioContext();
  if (ctx && !contextHeld && ctx.state === 'suspended') ctx.resume?.().catch(() => {});
  gestureHooks.forEach((fn) => { try { fn(event); } catch { /* never throw */ } });
}

/** Called by handlers that swallow a gesture before it reaches the window (a cutscene's skip keys). */
export function userGestureNow(event) {
  gesture(event);
}

if (typeof window !== 'undefined' && window.addEventListener) {
  GESTURES.forEach((type) => window.addEventListener(type, gesture, { capture: true, passive: true }));
}

/** For tests: the pool as it stands. */
export function audioPoolState() {
  return pool.map((p) => ({ busy: p.busy, unlocked: p.unlocked }));
}
