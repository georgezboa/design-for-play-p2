// Plain rules for the Labyrinth's release pass — no Phaser, so node tests
// can prove them (tests/chapter05/labyrinthRules.test.mjs).
//
//   aim-to-face   Butch faces where the mouse aims (or, keyboard-only, where
//                 he walks; holding Q keeps the current facing). The statues
//                 already freeze inside that facing's cone.
//   vision cone   the cone the statues test, clipped by walls, for drawing
//   fog of war    the survey map only marks keys / the exit on seen cells
//   game over     costs the keys found in the current wing
//   restart       R rebuilds the maze only from game over, or after a 1.5 s
//                 hold and a confirm

import { CELL, GRID_H, GRID_W, TUNING } from './labyrinthData.js';

export const RESTART_HOLD_MS = 1500;

export function pacesLabel(paces) {
  return `${paces} ${paces === 1 ? 'PACE' : 'PACES'}`;
}

function unit(x, y) {
  const len = Math.hypot(x, y);
  return len > 1e-6 ? { x: x / len, y: y / len } : null;
}

/**
 * The direction Butch faces this frame.
 * @param {object} o
 * @param {{x:number,y:number}} o.facing   last facing (unit)
 * @param {{x:number,y:number}} o.move     movement input this frame
 * @param {{x:number,y:number}|null} o.aim world point the mouse aims at (null: keyboard play)
 * @param {{x:number,y:number}} o.player   Butch's world position
 * @param {boolean} o.hold                 Q held: keep facing where it is
 */
export function resolveFacing({ facing, move, aim = null, player, hold = false }) {
  if (hold) return facing;
  if (aim) {
    const toAim = unit(aim.x - player.x, aim.y - player.y);
    // right on top of Butch the aim has no direction: keep the last one
    if (toAim && Math.hypot(aim.x - player.x, aim.y - player.y) > 18) return toAim;
    return facing;
  }
  const moving = unit(move.x, move.y);
  return moving ?? facing;
}

/** True when a statue at `target` is inside Butch's facing cone (no LOS test). */
export function inFacingCone(player, facing, target, coneDeg = TUNING.visionConeDeg) {
  const to = unit(target.x - player.x, target.y - player.y);
  if (!to) return true;
  return to.x * facing.x + to.y * facing.y >= Math.cos((coneDeg * Math.PI) / 180);
}

/**
 * The visible vision cone as a fan of points from Butch outwards, each ray
 * stopped by the first wall it meets (walls[y][x] true = solid).
 */
export function visionConePoints(walls, player, facing, { range, coneDeg = TUNING.visionConeDeg, rays = 26, step = 12 } = {}) {
  const base = Math.atan2(facing.y, facing.x);
  const half = (coneDeg * Math.PI) / 180;
  const points = [{ x: player.x, y: player.y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = base - half + (2 * half * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let d = step;
    for (; d < range; d += step) {
      const cx = Math.floor((player.x + dx * d) / CELL);
      const cy = Math.floor((player.y + dy * d) / CELL);
      if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H || walls[cy]?.[cx]) break;
    }
    const reach = Math.min(d, range);
    points.push({ x: player.x + dx * reach, y: player.y + dy * reach });
  }
  return points;
}

export const cellKey = (x, y) => `${x},${y}`;

/** Mark every cell whose centre lies inside Butch's light as seen. */
export function markSeen(seen, player, radius) {
  const r = Math.ceil(radius / CELL);
  const px = Math.floor(player.x / CELL);
  const py = Math.floor(player.y / CELL);
  let added = 0;
  for (let y = py - r; y <= py + r; y += 1) {
    for (let x = px - r; x <= px + r; x += 1) {
      if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue;
      const cx = x * CELL + CELL / 2;
      const cy = y * CELL + CELL / 2;
      if (Math.hypot(cx - player.x, cy - player.y) > radius) continue;
      const key = cellKey(x, y);
      if (!seen.has(key)) { seen.add(key); added += 1; }
    }
  }
  return added;
}

export function seenAt(seen, x, y) {
  return seen.has(cellKey(Math.floor(x / CELL), Math.floor(y / CELL)));
}

/** The keys a game over takes back: the ones found in the wing you fell in. */
export function keysLostOnGameOver(keys, wingId) {
  return keys.filter((key) => key.collected && key.wing === wingId);
}

/**
 * R while playing: nothing happens until it has been held RESTART_HOLD_MS,
 * then the player must confirm. Returns the UI phase for a hold length.
 */
export function restartHoldPhase(heldMs) {
  if (heldMs <= 0) return { phase: 'idle', progress: 0 };
  if (heldMs < RESTART_HOLD_MS) return { phase: 'holding', progress: heldMs / RESTART_HOLD_MS };
  return { phase: 'confirm', progress: 1 };
}
