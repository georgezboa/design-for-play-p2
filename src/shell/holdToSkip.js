// Pure hold-to-skip gesture state, shared by every cinematic. Several inputs
// (Space, Enter, Escape, a mouse button) may be held at once; the hold only
// resets once all of them are released.

export const SKIP_HOLD_MS = 1000;
export const SKIP_KEY_CODES = Object.freeze(['Space', 'Enter', 'NumpadEnter', 'Escape']);

export function isSkipKey(event) {
  return SKIP_KEY_CODES.includes(event?.code) || ['Enter', 'Escape', ' '].includes(event?.key);
}

export function createHoldGesture({ holdMs = SKIP_HOLD_MS } = {}) {
  const held = new Set();
  let startedAt = null;
  let completed = false;

  return {
    press(source, now) {
      if (completed) return;
      held.add(source);
      if (startedAt === null) startedAt = now;
    },
    release(source) {
      held.delete(source);
      if (!held.size) startedAt = null;
    },
    releaseAll() {
      held.clear();
      startedAt = null;
    },
    // Progress in [0, 1]; reaching 1 latches `completed`.
    progress(now) {
      if (completed) return 1;
      if (startedAt === null) return 0;
      const value = Math.max(0, Math.min(1, (now - startedAt) / holdMs));
      if (value >= 1) completed = true;
      return value;
    },
    get holding() { return held.size > 0; },
    get completed() { return completed; },
  };
}
