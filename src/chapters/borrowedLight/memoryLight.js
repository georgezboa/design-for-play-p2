// Chapter 2 · BORROWED LIGHT — what the blackout's borrowed light reveals.
//
// Pure (no Phaser). In section B the city's dark decks (level.js platforms
// with `hidden: true`) exist only in borrowed light: a powered sign or lit
// machine, or a punched node's afterglow (the memory light). Outside it they
// are invisible and not solid. Butch's own lamp is not borrowed light: inside
// its radius he sees a deck's near edge as a broken rim, never the deck.
//
// The scene renders the darkness with the same light sources this module
// scores, so "I can see it" and "I can stand on it" never disagree.

// A deck is solid from this much reveal (0..1).
export const DECK_SOLID_AT = 0.2;
// Coverage ramps from 0 at the light's edge to full this far inside it.
const EDGE_SOFTNESS = 0.35;

// The afterglow brush: node head + 40 px, radius shrinking as the glow fades.
export function afterglowLight(head, glow) {
  if (!(glow > 0)) return null;
  return {
    x: head.x,
    y: head.y + 40,
    r: 620 * (0.55 + 0.45 * Math.sqrt(glow)),
    strength: Math.min(1, 0.35 + glow),
  };
}

// A powered machine lights its own surroundings (signs by their glow radius).
// `bounds` is machineBounds(machine, level); `on` is powerLevel (0..1).
export function machineLight(machine, bounds, on) {
  if (!(on > 0)) return null;
  const r = machine.kind === 'sign' ? machine.glow : Math.min(420, Math.max(160, bounds.w * 0.6));
  return {
    x: bounds.x + bounds.w / 2,
    y: bounds.y + Math.min(bounds.h, 200) / 2,
    r,
    strength: 0.8 * on,
  };
}

// Distance from a point to the deck's walkable top edge.
function distanceToTop(platform, x, y) {
  const nx = Math.max(platform.x, Math.min(platform.x + platform.w, x));
  return Math.hypot(nx - x, platform.y - y);
}

// How much borrowed light falls on a deck: the best single source.
export function deckReveal(platform, lights = []) {
  let best = 0;
  for (const light of lights) {
    if (!light) continue;
    const d = distanceToTop(platform, light.x, light.y);
    if (d >= light.r) continue;
    const coverage = Math.min(1, (1 - d / light.r) / EDGE_SOFTNESS);
    best = Math.max(best, coverage * light.strength);
  }
  return best;
}

export const deckSolid = (reveal) => reveal >= DECK_SOLID_AT;

// The part of a deck's top edge inside Butch's lamp, nearest him first: the
// broken rim he is allowed to see. Returns null when the lamp misses it.
export function lampRim(platform, lamp, radius) {
  if (!lamp) return null;
  const dy = platform.y - lamp.y;
  if (Math.abs(dy) >= radius) return null;
  const half = Math.sqrt(radius * radius - dy * dy);
  const x0 = Math.max(platform.x, lamp.x - half);
  const x1 = Math.min(platform.x + platform.w, lamp.x + half);
  if (x1 <= x0) return null;
  // Only the near edge: at most 90 px of it, from the end facing Butch.
  const fromLeft = lamp.x <= platform.x + platform.w / 2;
  return fromLeft
    ? { x0, x1: Math.min(x1, x0 + 90), y: platform.y }
    : { x0: Math.max(x0, x1 - 90), x1, y: platform.y };
}
