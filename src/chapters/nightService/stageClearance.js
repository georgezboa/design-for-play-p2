// Chapter 1 // NIGHT SERVICE — where a painted figure may stand on a painted plate.
//
// Round 11 (George: the figure "walked into the furniture"). The figures are
// cut-outs drawn over the plate, so nothing in the painting can pass in front
// of them: a figure must never stand where a painted thing nearer the viewer
// would hide part of him. Two kinds of painted obstacle, in tile coordinates:
//
//   block  { x0, x1, front }  furniture on the boards (a desk): its silhouette
//          spans x0..x1 and its nearest foot is at row `front`. Feet nearer
//          than that (y >= front) stand in front of it, and may overlap it;
//          feet deeper must keep the whole figure clear of x0..x1.
//   walls  { left: [near, far], right: [near, far] }  a corridor's floor lines
//          ([x, y] points): feet deeper than the near row must fit between
//          them (nearer, the figure stands in front of where they begin).
//   door   { x0, x1, row }  an opening in a wall whose threshold is at `row`:
//          feet beyond it (y < row) must fit between its jambs.
//
// A figure's width is its painted frames' (spriteAtlas.js): pivot to padded
// edge, per frame, at its scale. Pure: tests/nightService/round11.test.mjs.

import ATLAS from './spriteAtlas.js';

/** A frame's extents in tile px at scale 1, facing right: `back` behind the feet, `front` ahead, `height`. */
export function frameExtent(kind, frame) {
  const sheet = ATLAS.characters[kind];
  const f = sheet?.frames[frame];
  if (!f) throw new Error(`[stageClearance] no frame ${kind}/${frame}`);
  const pad = ATLAS.pad ?? 0;
  return {
    back: (f.pivot[0] - pad) * sheet.unit,
    front: (f.w - f.pivot[0] - pad) * sheet.unit,
    height: (f.pivot[1] - pad) * sheet.unit,
  };
}

/** The frames a walking figure shows (its walk cycle), or `[idle]` for one that only stands. */
export function walkFrames(kind) {
  return [...(ATLAS.characters[kind]?.cycles?.walk?.frames ?? [])];
}

/**
 * The span [x0, x1] (tile-normalised) a figure covers with its feet at `x`,
 * over every frame in `frames`, facing ±1, drawn at `scale` (actor scale ×
 * the state's actorScale) in a tile `tileW` px wide.
 */
export function figureSpan({ kind, frames, x, facing = 1, scale, tileW }) {
  let back = 0;
  let front = 0;
  frames.forEach((frame) => {
    const e = frameExtent(kind, frame);
    back = Math.max(back, e.back);
    front = Math.max(front, e.front);
  });
  const left = (facing >= 0 ? back : front) * scale / tileW;
  const right = (facing >= 0 ? front : back) * scale / tileW;
  return [x - left, x + right];
}

const lerpLine = ([[xa, ya], [xb, yb]], y) => xa + ((xb - xa) * (y - ya)) / (yb - ya);

/** Why a figure standing at (x, y) is in a painted obstacle, or null when it is clear. */
export function obstacleHit(obstacle, span, y) {
  const [x0, x1] = span;
  if (obstacle.front !== undefined) {
    if (y >= obstacle.front) return null;
    return x1 > obstacle.x0 && x0 < obstacle.x1 ? `in the block ${obstacle.x0}..${obstacle.x1} (front ${obstacle.front})` : null;
  }
  if (obstacle.left) {
    const near = Math.min(obstacle.left[0][1], obstacle.right[0][1]);
    if (y >= near) return null;
    const left = lerpLine(obstacle.left, y);
    const right = lerpLine(obstacle.right, y);
    if (x0 < left) return `${(left - x0).toFixed(3)} into the left wall`;
    if (x1 > right) return `${(x1 - right).toFixed(3)} into the right wall`;
    return null;
  }
  if (obstacle.row !== undefined) {
    if (y >= obstacle.row) return null;
    if (x0 < obstacle.x0) return `${(obstacle.x0 - x0).toFixed(3)} into the left jamb`;
    if (x1 > obstacle.x1) return `${(x1 - obstacle.x1).toFixed(3)} into the right jamb`;
  }
  return null;
}

/**
 * Every place along a walk (from `start`, through the waypoints `path` on the
 * same tile) where the figure stands in an obstacle: sampled every `step` of
 * tile width, facing the way it walks (as panelModel turns it). Returns
 * `[{ x, y, why }]`, empty when the walk is clear.
 */
export function walkViolations({ kind, start, path, obstacles, scale, tileW, frames = walkFrames(kind), step = 0.004 }) {
  const out = [];
  let from = start;
  let facing = start.facing ?? 1;
  path.forEach((to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx * tileW) > 0.5) facing = dx > 0 ? 1 : -1;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
    for (let i = 0; i <= n; i += 1) {
      const x = from.x + (dx * i) / n;
      const y = from.y + (dy * i) / n;
      const span = figureSpan({ kind, frames, x, facing, scale, tileW });
      obstacles.forEach((obstacle) => {
        const why = obstacleHit(obstacle, span, y);
        if (why) out.push({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)), why });
      });
    }
    from = to;
  });
  return out;
}
