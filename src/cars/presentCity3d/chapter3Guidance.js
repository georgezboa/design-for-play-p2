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
// it shows one small HOLD TAB · LOOK AROUND tag over Butch. On a walk, Tab
// (and a change of task) also shows the compass tag below.

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

// ---------------------------------------------------------------- controls
// Alpha round 4 (P1, "controls never shown in Ch3"): one paper tag under the
// task card names the three verbs from the first moment Butch can move.
// Each verb greys out once used; the tag goes once he has walked and looked
// (holding Tab is offered, not required). It hides while a line or a card
// holds the screen and comes back after.
export const CONTROLS_HINT_SEGMENTS = Object.freeze([
  Object.freeze({ id: 'walk', html: '<kbd>CLICK</kbd> TO WALK' }),
  Object.freeze({ id: 'look', html: '<kbd>E</kbd> TO LOOK' }),
  Object.freeze({ id: 'tab', html: 'HOLD <kbd>TAB</kbd> TO LOOK AROUND' }),
]);

export function controlsHintState({ used = [], locked = false } = {}) {
  const done = new Set(used);
  const dismissed = done.has('walk') && done.has('look');
  return {
    visible: !dismissed && !locked,
    dismissed,
    segments: CONTROLS_HINT_SEGMENTS.map(({ id, html }) => ({ id, html, used: done.has(id) })),
  };
}

export function controlsHintHtml(segments) {
  return segments.map(({ id, html, used }) => `<span class="c3-controls__verb${used ? ' is-used' : ''}" data-verb="${id}">${html}</span>`)
    .join('<span class="c3-controls__dot" aria-hidden="true">·</span>');
}

// ---------------------------------------------------------------- compass
// Alpha round 3 (R2 P1): the free walks had no direction. Holding Tab, or
// for COMPASS_FLASH_SECONDS after the task card changes, one paper tag names
// the walk's destination and points at it: over the target when it is on
// screen, clamped to the screen edge (with its arrow turned toward it) when
// it is not. It stands down within COMPASS_ARRIVED_METRES, where the
// target's own tag takes over.
export const COMPASS_FLASH_SECONDS = 4;
export const COMPASS_ARRIVED_METRES = 5;

// Whether the compass tag shows this frame. Alpha round 4 (P2, "the
// ministry marker disappeared mid-walk"): while the destination is off
// screen the edge tag stays (it went after the four-second flash, mid-walk);
// once the destination is in view its beacon / tag takes over again.
export function compassVisible({
  hasTarget, locked = false, tabHeld = false, flashRemaining = 0, distance = Infinity, targetTagShown = false,
  targetOnScreen = true,
}) {
  if (!hasTarget || locked) return false;
  if (!(tabHeld || flashRemaining > 0 || !targetOnScreen)) return false;
  if (distance <= COMPASS_ARRIVED_METRES) return false;
  return !targetTagShown;
}

// Where the compass tag sits. `point` is the target's projected screen point
// (it may lie outside the viewport); `insets` keep the tag off the HUD.
// Returns the tag's centre, the arrow angle in degrees (0 = right, 90 =
// down, screen convention) and whether the target is off screen.
export function compassPlacement(point, {
  width, height, tagWidth = 0, tagHeight = 0,
  insets = { top: 92, right: 24, bottom: 72, left: 24 },
  lift = 56,
}) {
  const left = insets.left + tagWidth / 2;
  const right = width - insets.right - tagWidth / 2;
  const top = insets.top + tagHeight / 2;
  const bottom = height - insets.bottom - tagHeight / 2;
  const clampTo = (value, low, high) => Math.min(Math.max(value, low), Math.max(low, high));
  const onScreen = point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
  if (onScreen) {
    // Hang the tag above the target, arrow pointing down at it.
    return { x: clampTo(point.x, left, right), y: clampTo(point.y - lift, top, bottom), angle: 90, offScreen: false };
  }
  // Walk from the middle of the playable area toward the target and stop at
  // the inset edge.
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const sx = Math.abs(dx) > 1e-6 ? (dx > 0 ? right - cx : cx - left) / Math.abs(dx) : Infinity;
  const sy = Math.abs(dy) > 1e-6 ? (dy > 0 ? bottom - cy : cy - top) / Math.abs(dy) : Infinity;
  const scale = Math.min(sx, sy, 1);
  return {
    x: clampTo(cx + dx * scale, left, right),
    y: clampTo(cy + dy * scale, top, bottom),
    angle: Math.round((Math.atan2(dy, dx) * 180) / Math.PI),
    offScreen: true,
  };
}

// ---------------------------------------------------------------- hint clock
// Lev's direction hint used to count GAME seconds, which run at a quarter of
// real time when a slow GPU draws one frame a second (MAX_FRAME_SECONDS), so
// at 1 fps his 45 s hint took three minutes. The clock keeps both: game time
// (QA's advanceTime steps it with no wall time passing) and wall time, and
// reads the larger. A wall step is capped so a background tab coming back
// does not fire a hint at once.
export function createHintClock() {
  return { game: 0, wall: 0, lastMs: null };
}

export function hintClockElapsed(clock) {
  return Math.max(clock.game, clock.wall);
}

export function tickHintClock(clock, dt, nowMs, { maxWallStep = 2 } = {}) {
  const wallStep = clock.lastMs === null ? 0 : Math.min(maxWallStep, Math.max(0, (nowMs - clock.lastMs) / 1000));
  clock.lastMs = nowMs;
  clock.game += Math.max(0, dt);
  clock.wall += wallStep;
  return hintClockElapsed(clock);
}

// Time that passes while the clock is held (dialogue, standing at the
// target) never counts later.
export function holdHintClock(clock, nowMs) {
  clock.lastMs = nowMs;
  return hintClockElapsed(clock);
}

export function capHintClock(clock, seconds) {
  clock.game = Math.min(clock.game, seconds);
  clock.wall = Math.min(clock.wall, seconds);
  return hintClockElapsed(clock);
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
