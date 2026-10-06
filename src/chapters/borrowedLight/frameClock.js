// Chapter 2 · BORROWED LIGHT — game time follows the wall clock.
//
// Pure (no Phaser import). Alpha round 4: on a weak laptop (15–25 fps) the
// chapter ran in slow motion. Phaser's TimeStep smooths each frame's delta:
// for the first `panicMax` (120) frames after boot or a focus change, and
// whenever the window is not focused, it clamps the delta to one 60 Hz frame
// (16.7 ms), and it swaps any frame longer than 1000 / fps.min for an old
// one. At 15 fps that is a quarter-speed game for eight seconds after every
// load, and for as long as another window has focus.
//
// installWallClock replaces that smoothing on the game's loop with a plain
// cap: a frame passes its real duration, up to MAX_FRAME_MS. Everything the
// scene and Arcade physics do is driven by that delta (physics substeps at a
// fixed 60 Hz, so nothing tunnels), so bells, walks, lifts, tweens and hint
// timers keep wall-clock time down to ~8 fps; only below that does the game
// slow down instead of jumping.

// A 10 fps frame lands on 100–117 ms on a 60 Hz display.
export const MAX_FRAME_MS = 120;
// Dev QA with ?timescale= on a software renderer: long frames pass whole.
export const QA_MAX_FRAME_MS = 1000;

/** The delta one frame advances the game by (ms). */
export function frameDelta(rawMs, maxMs = MAX_FRAME_MS) {
  const ms = Number(rawMs);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(ms, maxMs);
}

/**
 * Make a Phaser TimeStep (`game.loop`) pass wall-clock deltas, capped.
 * Returns the cap in use.
 */
export function installWallClock(loop, { maxMs = MAX_FRAME_MS } = {}) {
  if (!loop) return null;
  loop.smoothStep = true;
  loop.panicMax = 0;
  loop.smoothDelta = (raw) => frameDelta(raw, maxMs);
  return maxMs;
}
