// Wall-grid geometry queries for the Labyrinth Wing.
//
// Movement collision itself is no longer hand-rolled here — LabyrinthScene
// builds the maze as a real Phaser Tilemap and uses Arcade Physics bodies +
// `this.physics.add.collider(sprite, wallLayer)` for the player and every
// statue, so wall-vs-circle resolution is Phaser's own job. What's left in
// this module is the one thing Arcade Physics has no opinion on: "can A see
// B through the maze" — a straight-line raycast against the same wall grid,
// used by StatueNPC's vision-cone check.

import { CELL, GRID_W, GRID_H } from './labyrinthData.js';

export function hasLineOfSight(walls, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.floor(dist / 10));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + dx * t;
    const y = ay + dy * t;
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) return false;
    if (walls[cy][cx]) return false;
  }
  return true;
}
