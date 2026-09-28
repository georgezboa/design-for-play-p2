// Chapter 2 · BORROWED LIGHT — procedural figures (Phaser Graphics).
//
// Butch: coat, cap and lamp, ~110 px, with idle / run / jump / fall / land /
// float poses. The rooftop mechanic and Mara share the same rig with other
// proportions and clothes. Everything is drawn around the feet at (0, 0),
// facing right, then mirrored by `facing`. A soft ink backlight around the
// silhouette keeps a dark figure readable against dark roofs.

import { INK_HEX } from './palette.js';

const TAU = Math.PI * 2;

export const BUTCH_SPEC = Object.freeze({
  height: 110,
  coat: 0x21373d,
  coatShade: 0x142428,
  trousers: 0x2a1d14,
  boots: 0x0f0a07,
  skin: 0xc2977a,
  cap: 0x18233a,
  capBand: 0xb08a4a,
  scarf: 0x6b2a22,
  lamp: true,
  coatLength: 0.72,
  build: 1,
});

export const MECHANIC_SPEC = Object.freeze({
  height: 104,
  coat: 0x4a2a20,
  coatShade: 0x2f1a14,
  trousers: 0x2c2a26,
  boots: 0x0f0a07,
  skin: 0xb88a6c,
  cap: 0x2a3a3c,
  capBand: 0x6fb7ad,
  scarf: 0x23434a,
  lamp: false,
  coatLength: 0.45,
  build: 1.18,
  goggles: true,
  wrench: true,
});

export const MARA_SPEC = Object.freeze({
  height: 104,
  coat: 0x3a2330,
  coatShade: 0x24151e,
  trousers: 0x1c1418,
  boots: 0x0c0809,
  skin: 0xb68c72,
  cap: null,
  hair: 0x1a100c,
  capBand: 0x000000,
  scarf: 0xc98088,
  lamp: false,
  coatLength: 0.78,
  build: 0.92,
  longScarf: true,
});

function limb(g, ax, ay, len1, a1, len2, a2) {
  const kx = ax + Math.sin(a1) * len1;
  const ky = ay + Math.cos(a1) * len1;
  const fx = kx + Math.sin(a1 + a2) * len2;
  const fy = ky + Math.cos(a1 + a2) * len2;
  return { kx, ky, fx, fy };
}

function stroke(g, color, width, alpha, pts) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.strokePath();
  for (let i = 0; i < pts.length; i += 2) g.fillStyle(color, alpha).fillCircle(pts[i], pts[i + 1], width / 2);
}

// Pose parameters from the controller pose + run phase.
export function poseAngles(pose, phase = 0, t = 0) {
  const s = Math.sin(phase * TAU);
  const c = Math.cos(phase * TAU);
  switch (pose) {
    case 'run':
      return {
        hipY: -50 + Math.abs(c) * -3,
        lean: 0.16,
        legA: [s * 0.85, Math.max(0.05, -c) * 1.3 + 0.1],
        legB: [-s * 0.85, Math.max(0.05, c) * 1.3 + 0.1],
        armA: [-s * 0.7, -0.6],
        armB: [s * 0.7, -0.5],
        flare: 0.35 + Math.abs(s) * 0.25,
        bob: Math.abs(c) * -3,
      };
    case 'jump':
      return { hipY: -52, lean: 0.1, legA: [-0.9, 1.35], legB: [0.5, 0.35], armA: [-1.6, -0.3], armB: [0.9, -0.8], flare: 0.55, bob: 0 };
    case 'fall':
    case 'float':
      return { hipY: -52, lean: 0.02, legA: [-0.35, 0.5], legB: [0.3, 0.25], armA: [-2.1, -0.2], armB: [1.5, -0.4], flare: pose === 'float' ? -0.4 : -0.25, bob: 0 };
    case 'land':
      return { hipY: -40, lean: 0.22, legA: [-0.75, 1.5], legB: [0.6, 1.2], armA: [-0.5, -0.9], armB: [0.7, -0.9], flare: 0.2, bob: 6 };
    case 'talk':
      return { hipY: -50, lean: 0, legA: [-0.12, 0.05], legB: [0.12, 0.05], armA: [-0.4 - Math.sin(t * 3) * 0.2, -1.1], armB: [0.2, -0.3], flare: 0, bob: Math.sin(t * 2) * 0.8 };
    case 'look':
      return { hipY: -50, lean: -0.05, legA: [-0.15, 0.05], legB: [0.18, 0.05], armA: [0.1, -0.2], armB: [-0.1, -0.2], flare: 0.1, bob: 0 };
    default: // idle
      return { hipY: -50, lean: 0.02, legA: [-0.1, 0.05], legB: [0.12, 0.06], armA: [-0.08, -0.25], armB: [0.12, -0.2], flare: 0.05 + Math.sin(t * 1.3) * 0.03, bob: Math.sin(t * 2.1) * 0.9 };
  }
}

// Draws one figure into `g` (cleared by the caller) at world x, y (feet).
// Returns the hand position that holds the lamp (world coords).
export function drawFigure(g, spec, { x, y, facing = 1, pose = 'idle', phase = 0, t = 0, squash = 1, alpha = 1, lampSwing = 0, silhouette = false, rim = 0.55 } = {}) {
  const scale = spec.height / 110;
  const f = facing >= 0 ? 1 : -1;
  const P = poseAngles(pose, phase, t);
  const bw = spec.build;
  // Squash widens, stretch narrows: volume is kept, roughly.
  const sx = 1 + (1 - squash) * 0.8;
  const X = (lx) => x + lx * f * scale * sx;
  const Y = (ly) => y + ly * scale * squash;

  const hipY = P.hipY + P.bob * 0.4;
  const shoulderY = hipY - 36;
  const lean = P.lean * 30;
  const hip = [0, hipY];
  const shoulder = [lean, shoulderY + P.bob * 0.3];
  const head = [lean + 3, shoulderY - 13];
  const thigh = 27;
  const shin = 26;
  const upper = 20;
  const fore = 19;

  // In limb(), angle 0 points straight down and positive swings forward.
  // Knees bend the shin backwards; elbows bend the forearm forwards.
  const LA = limb(g, hip[0], hip[1], thigh, P.legA[0], shin, -Math.abs(P.legA[1]));
  const LB = limb(g, hip[0], hip[1], thigh, P.legB[0], shin, -Math.abs(P.legB[1]));
  const armA = limb(g, shoulder[0], shoulder[1] + 2, upper, P.armA[0], fore, Math.abs(P.armA[1]));
  const armB = limb(g, shoulder[0], shoulder[1] + 2, upper, P.armB[0], fore, Math.abs(P.armB[1]));

  const colors = silhouette
    ? { coat: 0x0c0a0c, coatShade: 0x09080a, trousers: 0x09080a, boots: 0x060506, skin: 0x0f0c0c, cap: 0x0a090a, scarf: spec.scarf, hair: 0x080707 }
    : spec;

  const W = (px) => px * scale;

  // ---- backlight halo (ink), drawn first and slightly thicker ----
  const halo = rim * alpha;
  if (halo > 0) {
    const hc = INK_HEX;
    const hw = 3.2;
    const haloStroke = (pts, width) => stroke(g, hc, W(width + hw * 2), halo * 0.35, pts.flatMap(([px, py]) => [X(px), Y(py)]));
    haloStroke([[hip[0], hip[1]], [LB.kx, LB.ky], [LB.fx, LB.fy]], 8);
    haloStroke([[hip[0], hip[1]], [LA.kx, LA.ky], [LA.fx, LA.fy]], 8);
    haloStroke([[shoulder[0], shoulder[1]], [hip[0], hip[1]]], 22 * bw);
    g.fillStyle(hc, halo * 0.35).fillCircle(X(head[0]), Y(head[1]), W(10 + hw));
  }

  // ---- back leg + back arm ----
  stroke(g, colors.trousers, W(8.5 * bw), alpha * 0.9, [X(hip[0]), Y(hip[1]), X(LB.kx), Y(LB.ky), X(LB.fx), Y(LB.fy)]);
  g.fillStyle(colors.boots, alpha).fillEllipse(X(LB.fx + 4), Y(LB.fy - 2), W(15), W(7));
  stroke(g, colors.coatShade, W(7 * bw), alpha, [X(shoulder[0]), Y(shoulder[1] + 2), X(armB.kx), Y(armB.ky), X(armB.fx), Y(armB.fy)]);
  g.fillStyle(colors.skin, alpha).fillCircle(X(armB.fx), Y(armB.fy), W(3.4));

  // ---- coat ----
  const hemY = hipY + spec.coatLength * 44;
  const flare = P.flare * 14;
  const coatPts = [
    [shoulder[0] - 10 * bw, shoulder[1] - 2],
    [shoulder[0] + 9 * bw, shoulder[1] - 1],
    [shoulder[0] + 10 * bw + 1, shoulder[1] + 16],
    [hip[0] + 10 * bw, hipY],
    [hip[0] + 12 * bw - flare * 0.2, hemY],
    [hip[0] - 12 * bw - flare, hemY - (spec.longScarf ? 0 : 3) + Math.max(0, -flare) * 0.6],
    [hip[0] - 11 * bw, hipY - 4],
  ];
  g.fillStyle(colors.coat, alpha);
  g.fillPoints(coatPts.map(([px, py]) => ({ x: X(px), y: Y(py) })), true);
  // Shading down the back and a belt.
  g.fillStyle(colors.coatShade, alpha * 0.9);
  g.fillPoints([coatPts[0], coatPts[6], coatPts[5], [hip[0] - 4 * bw - flare * 0.5, hemY], [shoulder[0] - 3, shoulder[1] + 4]].map(([px, py]) => ({ x: X(px), y: Y(py) })), true);
  g.fillStyle(0x0b0907, alpha * 0.8).fillRect(Math.min(X(hip[0] - 11 * bw), X(hip[0] + 10 * bw)), Y(hipY - 6), W(21 * bw), W(3.5));
  if (!silhouette) {
    g.lineStyle(W(1.4), INK_HEX, rim * alpha * 0.9);
    g.beginPath();
    g.moveTo(X(coatPts[0][0]), Y(coatPts[0][1]));
    g.lineTo(X(coatPts[6][0]), Y(coatPts[6][1]));
    g.lineTo(X(coatPts[5][0]), Y(coatPts[5][1]));
    g.strokePath();
  }

  // Scarf.
  if (spec.scarf) {
    g.fillStyle(colors.scarf, alpha);
    g.fillEllipse(X(shoulder[0] + 1), Y(shoulder[1] - 1), W(20 * bw), W(7));
    if (spec.longScarf) {
      const tail = 10 + P.flare * 18;
      g.fillPoints([
        { x: X(shoulder[0] - 6), y: Y(shoulder[1] - 2) },
        { x: X(shoulder[0] - 6 - tail), y: Y(shoulder[1] + 6 - P.flare * 6) },
        { x: X(shoulder[0] - 8 - tail), y: Y(shoulder[1] + 12 - P.flare * 6) },
        { x: X(shoulder[0] - 2), y: Y(shoulder[1] + 4) },
      ], true);
    }
  }

  // ---- head ----
  g.fillStyle(colors.skin, alpha).fillCircle(X(head[0]), Y(head[1]), W(9.5));
  if (spec.cap) {
    g.fillStyle(colors.cap, alpha);
    g.fillRect(Math.min(X(head[0] - 10), X(head[0] + 10)), Y(head[1] - 16), W(20), W(9));
    g.fillPoints([
      { x: X(head[0] - 10), y: Y(head[1] - 7) },
      { x: X(head[0] + 19), y: Y(head[1] - 6) },
      { x: X(head[0] + 19), y: Y(head[1] - 4) },
      { x: X(head[0] - 10), y: Y(head[1] - 3.5) },
    ], true);
    if (!silhouette) g.fillStyle(spec.capBand, alpha).fillRect(Math.min(X(head[0] - 10), X(head[0] + 10)), Y(head[1] - 9.5), W(20), W(2.2));
    if (spec.goggles && !silhouette) {
      g.fillStyle(0x6fb7ad, alpha * 0.8).fillCircle(X(head[0] + 4), Y(head[1] - 12), W(3));
      g.fillStyle(0x6fb7ad, alpha * 0.8).fillCircle(X(head[0] - 3), Y(head[1] - 12), W(3));
    }
  } else if (spec.hair) {
    g.fillStyle(colors.hair ?? spec.hair, alpha);
    g.fillCircle(X(head[0] - 2), Y(head[1] - 2), W(10.5));
    g.fillPoints([
      { x: X(head[0] - 9), y: Y(head[1] - 2) },
      { x: X(head[0] - 14 - P.flare * 6), y: Y(head[1] + 14) },
      { x: X(head[0] - 4), y: Y(head[1] + 10) },
    ], true);
    g.fillStyle(colors.skin, alpha).fillCircle(X(head[0] + 3), Y(head[1] + 1), W(6.5));
  }
  // Head rim.
  g.lineStyle(W(1.3), INK_HEX, rim * alpha);
  g.beginPath();
  g.arc(X(head[0]), Y(head[1]), W(10), f > 0 ? Math.PI * 0.95 : -Math.PI * 0.05, f > 0 ? Math.PI * 1.6 : Math.PI * 0.6);
  g.strokePath();

  // ---- front leg (below the coat) ----
  stroke(g, colors.trousers, W(9 * bw), alpha, [X(hip[0]), Y(hip[1]), X(LA.kx), Y(LA.ky), X(LA.fx), Y(LA.fy)]);
  g.fillStyle(colors.boots, alpha).fillEllipse(X(LA.fx + 4), Y(LA.fy - 2), W(16), W(7.5));
  // Redraw the coat hem over the thigh so the coat reads in front.
  g.fillStyle(colors.coat, alpha);
  g.fillPoints([coatPts[3], coatPts[4], [hip[0] + 2, hemY], [hip[0] - 2, hipY]].map(([px, py]) => ({ x: X(px), y: Y(py) })), true);

  // ---- front arm ----
  stroke(g, colors.coat, W(7.5 * bw), alpha, [X(shoulder[0]), Y(shoulder[1] + 2), X(armA.kx), Y(armA.ky), X(armA.fx), Y(armA.fy)]);
  g.fillStyle(colors.skin, alpha).fillCircle(X(armA.fx), Y(armA.fy), W(3.6));
  g.lineStyle(W(1.1), INK_HEX, rim * alpha * 0.8);
  g.beginPath(); g.moveTo(X(shoulder[0] + 2), Y(shoulder[1])); g.lineTo(X(armA.kx), Y(armA.ky)); g.strokePath();

  let lampAt = null;
  if (spec.lamp) {
    // The lamp hangs from the front hand on a short bail and swings.
    const hx = armA.fx;
    const hy = armA.fy;
    const lx = hx + Math.sin(lampSwing) * 10;
    const ly = hy + Math.cos(lampSwing) * 10;
    g.lineStyle(W(1.2), 0x0b0907, alpha).beginPath();
    g.moveTo(X(hx), Y(hy)); g.lineTo(X(lx), Y(ly)); g.strokePath();
    g.fillStyle(0x1a120c, alpha).fillRect(Math.min(X(lx - 5), X(lx + 5)), Y(ly), W(10), W(3));
    g.fillStyle(silhouette ? 0x3a2a14 : 0xf2c27a, alpha).fillRect(Math.min(X(lx - 4), X(lx + 4)), Y(ly + 3), W(8), W(10));
    g.fillStyle(0x1a120c, alpha).fillRect(Math.min(X(lx - 5), X(lx + 5)), Y(ly + 12), W(10), W(3));
    lampAt = { x: X(lx), y: Y(ly + 8) };
  }
  if (spec.wrench && !silhouette) {
    g.lineStyle(W(3), 0x6d6a62, alpha).beginPath();
    g.moveTo(X(armB.fx), Y(armB.fy)); g.lineTo(X(armB.fx + 4), Y(armB.fy + 20)); g.strokePath();
    g.fillStyle(0x6d6a62, alpha).fillCircle(X(armB.fx + 4), Y(armB.fy + 22), W(4));
  }
  return lampAt;
}
