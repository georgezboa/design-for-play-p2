// Chapter 3 · which paper tags show without Tab (alpha round 2, R2-3).
//
// Pure: no THREE, no DOM. Points are plain { x, y } (screen pixels, or a
// ground point written as { x: worldX, y: worldZ }).
//
// Without Tab the city tags
//   * the hovered interactable (anywhere along a long one such as the oil
//     line, not only near its centre point);
//   * the nearest story interactable within reach: the one E would use, so
//     the tag appears exactly when E works (companions who follow Butch
//     around, such as Lev in the morning, are never auto-tagged);
// and after IDLE_LOOK_HINT_SECONDS with no input and no story tag on screen
// it shows one small HOLD TAB · LOOK AROUND tag over Butch.

export const IDLE_LOOK_HINT_SECONDS = 20;
export const IDLE_LOOK_HINT_HTML = 'HOLD <kbd>TAB</kbd> · LOOK AROUND';

// Closest point of a polyline to `p`: its distance, and where it lies
// (segment `index`, fraction `t` along that segment).
export function closestOnPolyline2D(p, points) {
  if (!points?.length) return { distance: Infinity, index: 0, t: 0 };
  if (points.length === 1) return { distance: Math.hypot(p.x - points[0].x, p.y - points[0].y), index: 0, t: 0 };
  let best = { distance: Infinity, index: 0, t: 0 };
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq)) : 0;
    const distance = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
    if (distance < best.distance) best = { distance, index, t };
  }
  return best;
}

// candidates: [{ id, ambient, follows, distance }] (distance in metres from
// Butch). Returns the ids to tag and the one E would use.
export function autoTaggedInteractions({ candidates, hoveredId = null, tabHeld = false, radius }) {
  let nearest = null;
  for (const candidate of candidates) {
    if (candidate.ambient || !(candidate.distance <= (candidate.radius ?? radius))) continue;
    if (!nearest || candidate.distance < nearest.distance) nearest = candidate;
  }
  const shown = new Set();
  for (const candidate of candidates) {
    if (candidate.id === hoveredId || (tabHeld && !candidate.ambient)) shown.add(candidate.id);
  }
  if (nearest && !nearest.follows) shown.add(nearest.id);
  return { shown, nearestId: nearest?.id ?? null };
}

// The idle nudge: only when something is there to find and nothing already
// points at it.
export function idleLookHintDue({ idleSeconds, locked = false, tabHeld = false, storyTargets = 0, storyTagShown = false }) {
  return !locked && !tabHeld && storyTargets > 0 && !storyTagShown && idleSeconds >= IDLE_LOOK_HINT_SECONDS;
}

// Counts real passes of a destination: Butch came within `near` metres and
// then walked on past `far` metres. Lev only says "twice" after two.
export function trackDestinationPass(tracker, distance, { near = 9, far = 15 } = {}) {
  if (distance <= near) tracker.near = true;
  else if (tracker.near && distance >= far) {
    tracker.near = false;
    tracker.passes += 1;
  }
  return tracker.passes;
}
