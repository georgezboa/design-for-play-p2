// Chapter 1 // NIGHT SERVICE — the frame clock (pure, no Phaser).
//
// Game time follows the wall clock down to ~10 fps (alpha R4 · P1): a frame's
// delta is capped here (a stall or a background tab never jumps the script),
// and the model steps in slices of at most MODEL_STEP_MS, so walks, waits,
// links and arrivals resolve exactly as they do at 60 fps. Phaser's own
// tweens and timers already run on real time at these frame rates.

export const FRAME_DT_CAP_MS = 100;
export const MODEL_STEP_MS = 50;

/** The game time a frame advances (ms): real time, capped. */
export function frameDt(delta, maxDt = FRAME_DT_CAP_MS) {
  return Math.max(0, Math.min(Number(delta) || 0, maxDt));
}

/** Advance a model by `dt` in slices of at most `step` ms. */
export function stepModel(model, dt, step = MODEL_STEP_MS) {
  let left = dt;
  let slices = 0;
  while (left > 1e-6 && slices < 64) {
    const slice = Math.min(step, left);
    model.update(slice);
    left -= slice;
    slices += 1;
  }
  return slices;
}
