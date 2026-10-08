// Chapter 4 // THE PAINTED COUNTRY — the Mara ahead.
//
// Per docs/STORY_BIBLE.md every chapter shows Mara one step ahead, and her
// face is never seen. Here she is painted, not drawn: a wash of coat and hair
// seen from behind, walking away, with the cyan of her thread trailing from
// her hand. Cyan is used for nothing else in this chapter.
//
// Round 6 (G2, "animations look unnatural"): her stride used to tick on the
// clock while an ease slid her across the doorway, so she skated into and out
// of the walk, and her coat was a rigid wedge. Now her gait follows the
// ground she covers (residentMotion.js gait), her legs bend at the knee,
// her body bobs (lowest on contact), her arm swings against her stride, and
// the coat's hem and the ends of her hair swing a beat behind (secondary
// motion). Standing, she breathes.

import { PAPER } from './paperPalette.js';
import { gait } from './residentMotion.js';

// `t` is seconds (breathing, the thread's flutter), `distance` the ground she
// has covered (px; drives the walk), `speed` 0..1 how much she is walking,
// `feetX/feetY` the ground point, `dir` +1 walks right (away through a door),
// `alpha` fades her into the paper.
export function drawMaraSilhouette(g, { feetX, feetY, t = 0, distance = null, speed = 1, alpha = 1, scale = 1, dir = 1, thread = 60 } = {}) {
  const s = scale;
  // older callers pass only `t`: walk on the clock at her usual pace
  const walked = distance ?? t * 60;
  const step = gait(walked, { strideLength: 34 * s, bob: 1.6 * s, speed });
  const breathe = (1 - speed) * Math.sin(t * 1.7) * 0.6 * s;
  const coat = 0x3b3a48;
  const hair = 0x2a2420;
  const hipY = feetY - 26 * s + step.bob * 0.6;
  const topY = feetY - 66 * s + step.bob - breathe;
  g.fillStyle(coat, 0.18 * alpha).fillEllipse(feetX, feetY + 2, 34 * s, 6 * s);
  // legs: thigh and shin, the knee bending on the leg that swings through
  const leg = (side, swing) => {
    const footX = feetX + side * 3 * s + swing * 7 * s * dir;
    const lift = Math.max(0, -swing) * 3.2 * s; // the trailing foot lifts
    const kneeX = (feetX + side * 3 * s + footX) / 2 + Math.max(0, swing) * 2.5 * s * dir;
    const kneeY = hipY + (feetY - hipY) * 0.5 - lift * 0.5;
    g.lineStyle(5 * s, 0x2a2826, 0.9 * alpha);
    g.beginPath();
    g.moveTo(feetX + side * 3 * s, hipY);
    g.lineTo(kneeX, kneeY);
    g.lineTo(footX, feetY - lift);
    g.strokePath();
  };
  leg(-1, step.swing);
  leg(1, -step.swing);
  // the long coat: a painted wedge whose hem swings a beat behind her stride
  const hem = step.hem * 3.2 * s * dir;
  g.fillStyle(coat, 0.9 * alpha);
  g.beginPath();
  g.moveTo(feetX - 8 * s, topY);
  g.lineTo(feetX + 8 * s, topY);
  g.lineTo(feetX + 14 * s + hem, feetY - 22 * s + step.bob * 0.4);
  g.lineTo(feetX + 2 * s + hem * 1.3, feetY - 20 * s + step.bob * 0.4);
  g.lineTo(feetX - 14 * s + hem, feetY - 22 * s + step.bob * 0.4);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.4 * s, 0x24232e, 0.8 * alpha).strokePath();
  // head from behind: hair only, no face; its ends swing late
  const headY = topY - 8 * s;
  g.fillStyle(hair, 0.95 * alpha).fillCircle(feetX, headY, 8.5 * s);
  g.fillStyle(hair, 0.95 * alpha).fillEllipse(feetX - step.hem * 1.2 * s * dir, topY + 2 * s, 12 * s, 10 * s);
  // arm, swinging against the stride, and the thread running back from her hand
  const hx = feetX - dir * (10 * s - step.arm * 3 * s);
  const hy = feetY - 40 * s + step.bob + Math.abs(step.arm) * -1.5 * s;
  g.lineStyle(4 * s, coat, 0.9 * alpha).lineBetween(feetX - dir * 4 * s, topY + 6 * s, hx, hy);
  if (thread > 0) {
    g.lineStyle(2 * s, PAPER.cyan, 0.85 * alpha);
    g.beginPath();
    g.moveTo(hx, hy);
    const steps = 10;
    for (let i = 1; i <= steps; i += 1) {
      const k = i / steps;
      // the thread trails: its wave travels back along it, and it sags
      g.lineTo(hx - dir * thread * k, hy + Math.sin(t * 3 - k * 5 + walked * 0.04) * 4 * s * k + k * 16 * s);
    }
    g.strokePath();
  }
}
