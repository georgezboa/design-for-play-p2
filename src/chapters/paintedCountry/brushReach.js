// Chapter 4 // THE PAINTED COUNTRY — how far the brush reaches, as rules.
//
// Round 6, item 12: a stroke dragged across the gap stopped halfway at the
// edge of the brush's reach and said nothing; the faint ring around Butch
// had no name. The scenes now put the boundary on the cursor and mark where
// a stroke stopped. This file is the arithmetic (no Phaser), so it is tested.

/** Is (x, y) within reach R of the brush hand at (cx, cy)? */
export const withinReach = (cx, cy, x, y, R) => Math.hypot(x - cx, y - cy) <= R;

/**
 * Where a drag from `a` (inside the reach) to `b` (outside it) crosses the
 * boundary circle of radius R round `c`. Returns null unless the segment
 * actually leaves the circle.
 */
export function reachExit(a, b, c, R) {
  const ax = a.x - c.x;
  const ay = a.y - c.y;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const inA = ax * ax + ay * ay <= R * R;
  const inB = (b.x - c.x) ** 2 + (b.y - c.y) ** 2 <= R * R;
  if (!inA || inB) return null;
  // |a + t d - c| = R, the root in (0, 1]
  const A = dx * dx + dy * dy;
  if (A === 0) return null;
  const B = 2 * (ax * dx + ay * dy);
  const C = ax * ax + ay * ay - R * R;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const t = (-B + Math.sqrt(disc)) / (2 * A);
  const k = Math.min(1, Math.max(0, t));
  return { x: a.x + dx * k, y: a.y + dy * k, t: k, dirX: dx / Math.sqrt(A), dirY: dy / Math.sqrt(A) };
}

/** The point of the reach circle nearest to (x, y): where its label goes. */
export function nearestOnReach(c, x, y, R) {
  const d = Math.hypot(x - c.x, y - c.y) || 1;
  return { x: c.x + ((x - c.x) / d) * R, y: c.y + ((y - c.y) / d) * R };
}

/**
 * What the cursor should say about the paper under it.
 *   look    a thing you act on rather than paint (a plate, a door sign)
 *   far     out of reach: hollow, struck-through nib
 *   paint   in reach, and the brush will lay paper here: solid nib
 *   wash    in reach, nothing to paint, but something to wash off
 *   refuse  in reach, and the paper will not take paint (varnish, sealed,
 *           a dry brush); the scene says why on the press
 */
export function nibState({ overObject = false, inReach = true, canPaint = false, canWash = false } = {}) {
  if (overObject) return 'look';
  if (!inReach) return 'far';
  if (canPaint) return 'paint';
  if (canWash) return 'wash';
  return 'refuse';
}

/** How close (0..1) the cursor is to the edge of the reach, for the ring. */
export function edgeProximity(c, x, y, R, band = 48) {
  const d = Math.hypot(x - c.x, y - c.y);
  if (d >= R) return 1;
  return Math.max(0, 1 - (R - d) / band);
}
