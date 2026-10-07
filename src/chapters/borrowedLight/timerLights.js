// Chapter 2 · BORROWED LIGHT — a machine shows the time it has left.
//
// Pure (no Phaser). Round 6 (playtest item 7): the tester punched the first
// bridge, stopped to watch it, missed the window and fell. The bell timer
// was at the top of the screen; the eye was on Butch, the bridge and the
// landing. Now the machine itself says "can I still cross":
//
// - a row of lamps along a bridge's rail (a cradle's rail, a billboard's
//   hoods) goes out one by one from the far end back toward its housing as
//   its power runs down; held by the city, they all burn;
// - in the last WARN_MS the deck's edge light blinks, faster toward the end
//   (the model's own 600 ms flicker comes after it);
// - a soft tick at each of TICKS_MS, near Butch only.

export const WARN_MS = 1000;
export const TICKS_MS = Object.freeze([2000, 1500, 1000, 750, 500, 250]);

/**
 * The machine's clock: null when off; { k: 1, held: true } when the city
 * holds it; else { k (left / total, 0..1), warn (0 → 1 over the last
 * WARN_MS), remaining }.
 */
export function timerOf(status, totalMs) {
  if (!status?.powered) return null;
  if (status.held || status.remaining == null || !Number.isFinite(status.remaining)) return { k: 1, warn: 0, held: true, remaining: Infinity };
  const total = Number(totalMs);
  if (!(total > 0)) return { k: 1, warn: 0, held: false, remaining: status.remaining };
  const remaining = Math.max(0, status.remaining);
  return {
    k: Math.max(0, Math.min(1, remaining / total)),
    warn: remaining < WARN_MS ? 1 - remaining / WARN_MS : 0,
    held: false,
    remaining,
  };
}

// How many of `n` lamps still burn at k (the far ones go first). A sliver of
// time left keeps one lamp lit.
export function litLamps(k, n) {
  if (!(n > 0)) return 0;
  if (!(k > 0)) return 0;
  return Math.max(1, Math.min(n, Math.ceil(k * n - 1e-9)));
}

// Lamp i (0 = by the housing) is lit at k.
export const lampLit = (i, k, n) => i < litLamps(k, n);

// The warning blink: steady until the last WARN_MS, then on / off, faster
// toward the end (≈ 2.5 → 7 blinks a second).
export function blinkOn(warn, t) {
  if (!(warn > 0)) return true;
  const rate = 2.5 + 4.5 * Math.min(1, warn);
  return Math.sin(t * Math.PI * 2 * rate) > -0.25;
}

// The tick thresholds a machine's remaining time crossed this step.
export function ticksCrossed(prevMs, nowMs, thresholds = TICKS_MS) {
  if (!Number.isFinite(prevMs) || !Number.isFinite(nowMs) || nowMs >= prevMs) return [];
  return thresholds.filter((th) => prevMs > th && nowMs <= th);
}

// The time a machine powers for: its duration, or the cut's window.
export function machineTotalMs(machine, cutTotal = null) {
  if (Number.isFinite(cutTotal) && cutTotal > 0) return cutTotal;
  return Number.isFinite(machine?.duration) ? machine.duration : null;
}
