// Pure hold-to-skip gesture state, shared by every cinematic. Several inputs
// (Space, Enter, Escape, a mouse button) may be held at once; the hold only
// resets once all of them are released.
//
// Round 11: the hold counts time the page was responsive for, at most
// SKIP_HOLD_MAX_STEP_MS between two samples. A cutscene can now play over a
// chapter loading underneath (the 2→3 hand-off), and a long task there (a
// shader compile) used to let the completion timer fire before the key-up
// of a mere tap was handled: a tap of Space, Escape or a click skipped the
// cutscene. The hold still completes in SKIP_HOLD_MS of real holding.

export const SKIP_HOLD_MS = 1000;
export const SKIP_HOLD_MAX_STEP_MS = 250;
export const SKIP_KEY_CODES = Object.freeze(['Space', 'Enter', 'NumpadEnter', 'Escape']);

export function isSkipKey(event) {
  return SKIP_KEY_CODES.includes(event?.code) || ['Enter', 'Escape', ' '].includes(event?.key);
}

export function createHoldGesture({ holdMs = SKIP_HOLD_MS, maxStepMs = SKIP_HOLD_MAX_STEP_MS } = {}) {
  const held = new Set();
  let lastAt = null;
  let heldMs = 0;
  let completed = false;

  return {
    press(source, now) {
      if (completed) return;
      held.add(source);
      if (lastAt === null) {
        lastAt = now;
        heldMs = 0;
      }
    },
    release(source) {
      held.delete(source);
      if (!held.size) {
        lastAt = null;
        heldMs = 0;
      }
    },
    releaseAll() {
      held.clear();
      lastAt = null;
      heldMs = 0;
    },
    // Progress in [0, 1] (sampled on frames and a short timer); reaching 1
    // latches `completed`.
    progress(now) {
      if (completed) return 1;
      if (lastAt === null) return 0;
      heldMs += Math.max(0, Math.min(maxStepMs, now - lastAt));
      lastAt = Math.max(lastAt, now);
      const value = Math.max(0, Math.min(1, heldMs / holdMs));
      if (value >= 1) completed = true;
      return value;
    },
    get holding() { return held.size > 0; },
    get completed() { return completed; },
  };
}
