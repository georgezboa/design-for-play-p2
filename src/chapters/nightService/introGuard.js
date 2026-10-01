// Chapter 1 // NIGHT SERVICE — the act intro's wall-clock fail-safe.
//
// The intro (the act's title card, the blackout and the window covers) runs
// on Phaser tweens. Tweens advance on Phaser's lag-smoothed clock: on a very
// slow renderer (~1 fps software GL) every frame moves them by only ~33 ms, so
// a 3 s intro can take minutes, and a scene clock that runs ahead of the tween
// clock can leave the title card stranded at full opacity (alpha round 2, N1).
// This guard keeps a real-time deadline (performance.now) beside the tweens:
// once it passes, PanelScene snaps whatever is left of the intro away, at any
// frame rate. Pure logic, so node tests can drive it with a fake clock.

/** Real-time slack after the intro's own schedule before the fail-safe acts. */
export const INTRO_FAILSAFE_SLACK_MS = 900;

/**
 * When the plain intro (`PanelScene.introduce`) is over, in ms after it starts:
 * the title fades in (200 + 700), holds, then fades out for 700; the covers
 * finish at hold + 300 + n·170 + 950.
 */
export function introScheduleMs({ hold, tiles = 1, reduce = false }) {
  const titleOut = 200 + 700 + Math.max(200, hold - 500) + 700;
  const coversOut = hold + 300 + Math.max(0, tiles - 1) * 170 + (reduce ? 300 : 950);
  const blackoutOut = hold + 800;
  return Math.max(titleOut, coversOut, blackoutOut);
}

/** When the grown-wall intro (`PanelScene.growIntro`) is over, in ms after it starts. */
export function growScheduleMs({ openDelay, openMs }) {
  // the sill title: in at openDelay + openMs/2 (600), out 2600 later (700)
  return Math.max(openDelay + openMs * 0.5 + 2600 + 700, openDelay + openMs + 120);
}

/**
 * A one-shot real-time deadline.
 * @param {() => number} [now]  a millisecond clock (default performance.now)
 */
export function createIntroGuard(now = () => globalThis.performance?.now?.() ?? Date.now()) {
  let at = null;
  return {
    /** Arm (or re-arm) the deadline `ms` from now. */
    arm(ms) { at = now() + Math.max(0, ms); },
    disarm() { at = null; },
    get armed() { return at !== null; },
    /** Milliseconds left (0 when due, null when not armed). */
    get remaining() { return at === null ? null : Math.max(0, at - now()); },
    /** True exactly once, the first time it is asked after the deadline. */
    due() {
      if (at === null || now() < at) return false;
      at = null;
      return true;
    },
  };
}
