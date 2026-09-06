import { PAPER } from './paperPalette.js';

// Drawing primitives that make a Phaser Graphics call look like it was made on
// paper rather than in a vector editor. Every one of these is deterministic:
// the wobble comes from a seeded generator, so the car is drawn the same way on
// every boot and a screenshot diff means something.

export function makeRandom(seed = 0x5eed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

// A hand-drawn line: a few segments with sub-pixel drift, and — the detail that
// actually sells a draughtsman's sheet — an overshoot past each end.
export function draftLine(g, rnd, x1, y1, x2, y2, { overshoot = 4, jitter = 0.9, segments = 6 } = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const sx = x1 - ux * overshoot;
  const sy = y1 - uy * overshoot;
  const ex = x2 + ux * overshoot;
  const ey = y2 + uy * overshoot;

  g.beginPath();
  g.moveTo(sx, sy);
  for (let i = 1; i <= segments; i += 1) {
    const t = i / segments;
    const px = sx + (ex - sx) * t;
    const py = sy + (ey - sy) * t;
    const drift = i === segments ? 0 : (rnd() - 0.5) * jitter * 2;
    g.lineTo(px - uy * drift, py + ux * drift);
  }
  g.strokePath();
}

export function draftRect(g, rnd, x, y, w, h, options) {
  draftLine(g, rnd, x, y, x + w, y, options);
  draftLine(g, rnd, x + w, y, x + w, y + h, options);
  draftLine(g, rnd, x + w, y + h, x, y + h, options);
  draftLine(g, rnd, x, y + h, x, y, options);
}

// Parallel 45° strokes, clipped to a rectangle analytically so no mask is
// needed. This is the shading language for a folded plane: paper has no
// gradients, only more or fewer strokes.
export function hatchRect(g, rnd, x, y, w, h, { spacing = 9, alpha = 0.5, width = 1, flip = false } = {}) {
  g.lineStyle(width, PAPER.graphiteSoft, alpha);
  const dir = flip ? -1 : 1;
  const span = w + h;
  for (let offset = 0; offset <= span; offset += spacing) {
    // Line: from the top edge going down-right (or down-left when flipped).
    const startX = flip ? x + w - offset : x + offset;
    const points = clipDiagonal(startX, y, dir, x, y, w, h);
    if (!points) continue;
    const wob = (rnd() - 0.5) * 1.4;
    g.beginPath();
    g.moveTo(points.x1 + wob, points.y1);
    g.lineTo(points.x2 + wob, points.y2);
    g.strokePath();
  }
}

// Clip the 45° line through (px, py) with slope `dir` to the rect. Returns null
// when the line misses the rect entirely.
function clipDiagonal(px, py, dir, rx, ry, rw, rh) {
  // Parametrise as (px + t*dir, py + t). Solve the four edge crossings.
  const tTop = 0;
  const tBottom = rh;
  let tMin = tTop;
  let tMax = tBottom;

  if (dir > 0) {
    tMin = Math.max(tMin, rx - px);
    tMax = Math.min(tMax, rx + rw - px);
  } else {
    tMin = Math.max(tMin, px - (rx + rw));
    tMax = Math.min(tMax, px - rx);
  }
  if (tMin >= tMax) return null;
  return {
    x1: px + tMin * dir,
    y1: py + tMin,
    x2: px + tMax * dir,
    y2: py + tMax,
  };
}

// A painted region never perfectly meets its outline (art bible §11). The fill
// is inset by a hair and its edge carries a darker rim where the pigment pooled
// as it dried.
export function paintedFill(g, rnd, x, y, w, h, color, { alpha = 1, inset = 1.5, rim = true } = {}) {
  g.fillStyle(color, alpha);
  g.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  if (!rim) return;
  g.lineStyle(1.6, color, Math.min(1, alpha + 0.25));
  const wob = () => (rnd() - 0.5) * 1.6;
  g.beginPath();
  g.moveTo(x + inset + wob(), y + inset + wob());
  g.lineTo(x + w - inset + wob(), y + inset + wob());
  g.lineTo(x + w - inset + wob(), y + h - inset + wob());
  g.lineTo(x + inset + wob(), y + h - inset + wob());
  g.closePath();
  g.strokePath();
}

// The grain. Generated once into a texture and tiled, because a per-frame
// noise pass would cost more than the whole rest of the car.
export function buildPaperGrain(scene, key = 'paper-grain', size = 256) {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, size, size);
  const ctx = texture.getContext();
  const rnd = makeRandom(0x9a17);

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.16; i += 1) {
    const x = Math.floor(rnd() * size);
    const y = Math.floor(rnd() * size);
    const dark = rnd() > 0.55;
    ctx.fillStyle = dark ? 'rgba(74,70,64,0.055)' : 'rgba(255,255,255,0.09)';
    ctx.fillRect(x, y, 1, 1);
  }
  // A few longer fibres so the grain reads as pulp, not TV static.
  for (let i = 0; i < 90; i += 1) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 4 + rnd() * 16;
    const angle = rnd() * Math.PI;
    ctx.strokeStyle = 'rgba(74,70,64,0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  texture.refresh();
  return key;
}
