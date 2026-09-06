import { PAPER } from './paperPalette.js';

// Shared Chapter 4 protagonist: the gallery's ink-and-paper silhouette. The
// studio deliberately uses this same figure so the chapter never changes its
// player character between rooms.
export function drawPaintedPlayer(figure, walker, pointer) {
  const x = Math.round(walker.x);
  figure.clear();
  const feetY = Math.round(walker.y + 29);
  const at = (dy) => feetY - dy;
  figure.fillStyle(PAPER.figure, 1);
  figure.fillRect(x - 6, feetY - 18, 5, 18);
  figure.fillRect(x + 1, feetY - 18, 5, 18);
  figure.fillRect(x - 8, feetY - 46, 16, 28);
  figure.fillCircle(x, at(54), 8);

  const shoulderY = at(38);
  const angle = Math.atan2(pointer.worldY - shoulderY, pointer.worldX - x);
  const tipX = x + Math.cos(angle) * 30;
  const tipY = shoulderY + Math.sin(angle) * 30;
  figure.lineStyle(3.2, PAPER.bookCloth, 1);
  figure.beginPath();
  figure.moveTo(x + Math.cos(angle) * 8, shoulderY + Math.sin(angle) * 8);
  figure.lineTo(tipX, tipY);
  figure.strokePath();
  figure.fillStyle(PAPER.indigo, 0.95);
  figure.fillCircle(tipX, tipY, 4.6);
}
