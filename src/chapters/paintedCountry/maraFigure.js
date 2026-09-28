// Chapter 4 // THE PAINTED COUNTRY — the Mara ahead.
//
// Per docs/STORY_BIBLE.md every chapter shows Mara one step ahead, and her
// face is never seen. Here she is painted, not drawn: a wash of coat and hair
// seen from behind, walking away, with the cyan of her thread trailing from
// her hand. Cyan is used for nothing else in this chapter.

import { PAPER } from './paperPalette.js';

// `t` is seconds (walk cycle), `feetX/feetY` the ground point, `dir` +1 walks
// right (away through a door), `alpha` fades her into the paper.
export function drawMaraSilhouette(g, { feetX, feetY, t = 0, alpha = 1, scale = 1, dir = 1, thread = 60 } = {}) {
  const s = scale;
  const stride = Math.sin(t * 6.2);
  const coat = 0x3b3a48;
  const hair = 0x2a2420;
  g.fillStyle(coat, 0.18 * alpha).fillEllipse(feetX, feetY + 2, 34 * s, 6 * s);
  // legs
  g.lineStyle(5 * s, 0x2a2826, 0.9 * alpha);
  g.lineBetween(feetX - 3 * s, feetY - 26 * s, feetX - 3 * s + stride * 6 * s, feetY);
  g.lineBetween(feetX + 3 * s, feetY - 26 * s, feetX + 3 * s - stride * 6 * s, feetY);
  // the long coat, a painted wedge with a pooled rim
  g.fillStyle(coat, 0.9 * alpha);
  g.beginPath();
  g.moveTo(feetX - 8 * s, feetY - 66 * s);
  g.lineTo(feetX + 8 * s, feetY - 66 * s);
  g.lineTo(feetX + 14 * s, feetY - 22 * s);
  g.lineTo(feetX - 14 * s, feetY - 22 * s);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.4 * s, 0x24232e, 0.8 * alpha).strokePath();
  // head from behind: hair only, no face
  g.fillStyle(hair, 0.95 * alpha).fillCircle(feetX, feetY - 74 * s, 8.5 * s);
  g.fillStyle(hair, 0.95 * alpha).fillEllipse(feetX, feetY - 64 * s, 12 * s, 10 * s);
  // arm, and the thread running back from her hand
  const hx = feetX - dir * 10 * s;
  const hy = feetY - 40 * s + stride * 2 * s;
  g.lineStyle(4 * s, coat, 0.9 * alpha).lineBetween(feetX - dir * 4 * s, feetY - 60 * s, hx, hy);
  if (thread > 0) {
    g.lineStyle(2 * s, PAPER.cyan, 0.85 * alpha);
    g.beginPath();
    g.moveTo(hx, hy);
    const steps = 10;
    for (let i = 1; i <= steps; i += 1) {
      const k = i / steps;
      g.lineTo(hx - dir * thread * k, hy + Math.sin(t * 3 + k * 5) * 4 * s + k * 16 * s);
    }
    g.strokePath();
  }
}
