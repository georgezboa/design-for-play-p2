import { PAPER } from './paperPalette.js';

const TAU = Math.PI * 2;

function strokeArc(g, x, y, radius, start, end, width, color, alpha) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.arc(x, y, radius, start, end, false);
  g.strokePath();
}

export function haloPointToward(cx, cy, tx, ty, radius = 34) {
  const dx = tx - cx;
  const dy = ty - cy;
  const length = Math.max(1, Math.hypot(dx, dy));
  return { x: cx + (dx / length) * radius, y: cy + (dy / length) * radius };
}

export function pigmentAtHalo(cx, cy, pigments, x, y, radius = 32) {
  const distance = Math.hypot(x - cx, y - cy);
  if (distance < radius - 11 || distance > radius + 11 || !pigments.length) return null;
  const startAt = -Math.PI / 2;
  const angle = Math.atan2(y - cy, x - cx);
  const normalized = (angle - startAt + TAU) % TAU;
  return pigments[Math.floor((normalized / TAU) * pigments.length)] ?? null;
}

export function drawPigmentHalo(g, {
  x,
  y,
  pigments,
  activeIds = [],
  selectedId = null,
  pressedId = null,
  pressProgress = 0,
  progressId = null,
  progress = 0,
  time = 0,
  radius = 32,
} = {}) {
  const active = new Set(activeIds);
  const gap = 0.11;
  const startAt = -Math.PI / 2;
  const pulse = 0.88 + Math.sin(time / 145) * 0.1;
  const pressure = Math.max(0, Math.min(1, pressProgress));
  const pressedIndex = pigments.findIndex((pigment) => pigment.id === pressedId);
  const weights = pigments.map((_, index) => {
    if (pressedIndex < 0 || pressure <= 0) return 1;
    return index === pressedIndex ? 1 + pressure * 0.65 : 1 - pressure * 0.13;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = startAt;

  pigments.forEach((pigment, index) => {
    const span = (weights[index] / totalWeight) * TAU;
    const segmentStart = cursor + gap;
    const segmentEnd = cursor + span - gap;
    cursor += span;
    const pressed = pressedId === pigment.id;
    const segmentRadius = radius + (pressed ? pressure * 6 : 0);
    strokeArc(g, x, y, segmentRadius, segmentStart, segmentEnd, 3, PAPER.graphiteFaint, 0.34);
    strokeArc(g, x, y, segmentRadius + 1.5, segmentStart + 0.02, segmentEnd - 0.02, 1, PAPER.graphiteSoft, 0.22);

    if (active.has(pigment.id)) {
      const width = pressed ? 7 + pressure * 5 : selectedId === pigment.id ? 7 : 5;
      const alpha = selectedId === pigment.id ? pulse : 0.88;
      strokeArc(g, x, y, segmentRadius, segmentStart, segmentEnd, width, pigment.color, alpha);
      strokeArc(g, x, y, segmentRadius + 4 + (pressed ? pressure * 2 : 0), segmentStart + 0.05, segmentEnd - 0.05, 1.4 + (pressed ? pressure : 0), pigment.color, alpha * 0.42);
    }

    if (progressId === pigment.id && progress > 0 && !active.has(pigment.id)) {
      const partialEnd = segmentStart + (segmentEnd - segmentStart) * Math.min(1, progress);
      strokeArc(g, x, y, segmentRadius, segmentStart, partialEnd, 7, pigment.color, 0.96);
      strokeArc(g, x, y, segmentRadius + 4, segmentStart, partialEnd, 1.6, pigment.color, 0.5);
    }
  });
}
