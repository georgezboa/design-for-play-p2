// Time played, per save slot (save.playSeconds). Every chapter page installs
// the clock through the shared pause menu; the title and the films between
// chapters do not count. The clock only runs while the page is visible and
// not paused, and it adds what it measured to the active slot every
// FLUSH_EVERY_S seconds, at each checkpoint and when the page is hidden or
// left, so a closed tab loses at most a few seconds.
//
// The rules (createPlayClock) are DOM-free for node tests; installPlayClock
// wires them to the page.

import { createSaveStore } from './saveSystem.js';

export const TICK_MS = 1000;
export const FLUSH_EVERY_S = 15;
// A tick longer than this is the machine sleeping or the tab frozen, not play.
export const MAX_TICK_S = 5;

export function createPlayClock({ now, running, commit }) {
  let last = now();
  let pending = 0;
  return {
    /** Measure since the last tick; returns the seconds counted. */
    tick() {
      const at = now();
      const step = Math.max(0, (at - last) / 1000);
      last = at;
      if (!running() || step > MAX_TICK_S) return 0;
      pending += step;
      if (pending >= FLUSH_EVERY_S) this.flush();
      return step;
    },
    /** Hand the measured time to the save (commit) and start again. */
    flush() {
      if (pending <= 0) return 0;
      const seconds = pending;
      pending = 0;
      commit(seconds);
      return seconds;
    },
    /** Forget the gap since the last tick (the page was hidden). */
    resync() { last = now(); },
    get pending() { return pending; },
  };
}

let installed = null;

export function installPlayClock({ win = globalThis.window, storage = globalThis.localStorage } = {}) {
  if (installed || !win?.document) return installed;
  const doc = win.document;
  const clock = createPlayClock({
    now: () => win.performance.now(),
    running: () => doc.visibilityState !== 'hidden' && !globalThis.NIGHTFALL_PAUSED,
    commit: (seconds) => {
      try { createSaveStore(storage).addPlaySeconds(seconds); } catch { /* storage unavailable */ }
    },
  });
  const timer = win.setInterval(() => clock.tick(), TICK_MS);
  const settle = () => { clock.tick(); clock.flush(); };
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') settle();
    else clock.resync();
  });
  win.addEventListener('pagehide', settle);
  win.addEventListener('nightfall:checkpoint', settle);
  installed = { clock, stop() { win.clearInterval(timer); settle(); installed = null; } };
  return installed;
}
