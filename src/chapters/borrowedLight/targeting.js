// Chapter 2 · BORROWED LIGHT — which node a punch (F) or the lamp (E) acts on.
//
// Pure (no Phaser). Alpha feedback "the nodes sometimes don't work" (round 3):
// the scene picked the nearest node again at the moment of the key press, so
// the node that was highlighted and the node that was punched could differ
// when two poles stand close; a press out of reach did nothing at all.
// Now one function picks the target each frame (sticky, so it does not flip
// between two near poles), the highlight shows exactly that node, and a press
// with nothing in reach reports the nearest node as OUT OF REACH.

import { NODE_POLE, PUNCH_RANGE } from './level.js';

// Butch's chest reaches a node's lamp box within PUNCH_RANGE px (level.js).
export { PUNCH_RANGE };
// The current target is kept until another node is this much closer.
export const STICKY_PX = 36;
// A node behind Butch counts as this much further away than it is.
export const BEHIND_PX = 28;
// A press with no node in reach names the nearest node up to this far.
export const NEAR_MISS_RANGE = 560;

// The point on a node Butch reaches for: the lamp box, just below its lens.
export const nodeReachPoint = (node) => ({ x: node.x, y: node.y - NODE_POLE + 20 });

export function reachOf(node, chest, facing = 1) {
  const p = nodeReachPoint(node);
  const dx = p.x - chest.x;
  const d = Math.hypot(dx, p.y - chest.y);
  const behind = Math.abs(dx) > 45 && Math.sign(dx) === -Math.sign(facing || 1);
  return { node, d, score: d + (behind ? BEHIND_PX : 0) };
}

// The node a press acts on, or null. `prevId` is last frame's target.
export function pickTarget({ chest, facing = 1, nodes, prevId = null, range = PUNCH_RANGE }) {
  let best = null;
  let prev = null;
  for (const node of nodes) {
    const reach = reachOf(node, chest, facing);
    if (reach.d > range) continue;
    if (!best || reach.score < best.score) best = reach;
    if (node.id === prevId) prev = reach;
  }
  if (prev && best && prev.score <= best.score + STICKY_PX) return prev;
  return best;
}

// The nearest node just out of reach (for the OUT OF REACH tag), or null.
export function nearestMiss({ chest, nodes, range = PUNCH_RANGE, maxRange = NEAR_MISS_RANGE }) {
  let best = null;
  for (const node of nodes) {
    const reach = reachOf(node, chest);
    if (reach.d <= range || reach.d > maxRange) continue;
    if (!best || reach.d < best.d) best = reach;
  }
  return best;
}

// A node whose lamp box or paper tag is under a world point (mouse click).
export function nodeAtPoint(nodes, x, y, pad = 30) {
  let best = null;
  for (const node of nodes) {
    const headY = node.y - NODE_POLE;
    const inside = x >= node.x - 20 - pad && x <= node.x + 20 + pad && y >= headY - 24 - pad && y <= headY + 66 + pad;
    if (!inside) continue;
    const d = Math.hypot(x - node.x, y - (headY + 20));
    if (!best || d < best.d) best = { node, d };
  }
  return best?.node ?? null;
}

// Where Butch's chest is for a given feet position.
export const CHEST_ABOVE_FEET = 64;
export const chestAt = (feetX, feetY) => ({ x: feetX, y: feetY - CHEST_ABOVE_FEET });
