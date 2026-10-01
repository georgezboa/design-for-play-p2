// Chapter 4 // THE PAINTED COUNTRY — Part II, Rosa's studio, drawn.
//
// paintKeepsake(kind)   the seven things from the orchard house on the shelf
//                       (cup, book, tin, jar, bottle, vase, ribbon): pencil,
//                       and a neutral wash the scene tints with its colour.
// paintStillLife(shapes) "The orchard in summer", Rosa, 9: her pencil, and
//                       one neutral wash per region (sky, sun, leaves, apple,
//                       plums, fox), tinted with whatever colour the player
//                       paints there — a wrong colour simply looks wrong.
// paintEasel(w, h)      the easel the canvas stands on.

import { HUE, INK, TAU, blob, handRect, hatch, makeCanvas, pencil, rng, rule, scribble, tooth, wash, washRect } from './pencilKit.js';

const NEUTRAL = '#ffffff';
const SHADE = '#c4c0b8';

function pair(w, h) {
  const pc = makeCanvas(w, h);
  const wc = makeCanvas(w, h);
  return { p: pc.getContext('2d'), c: wc.getContext('2d'), pencil: pc, wash: wc, w, h };
}

export const KEEPSAKE = Object.freeze({ w: 60, h: 64, base: 60 });

export function paintKeepsake(kind, seed = 1) {
  const s = pair(KEEPSAKE.w, KEEPSAKE.h);
  const { p, c } = s;
  const cx = KEEPSAKE.w / 2;
  const b = KEEPSAKE.base;
  const body = (pts, shade = true) => {
    wash(c, pts, NEUTRAL, { alpha: 1, seed, bloom: 0.15, blur: 0.4 });
    if (shade) wash(c, pts.map(([x, y]) => [x + (x - cx) * 0.02 + 3, y]).filter((_, i, a) => i < a.length), SHADE, { alpha: 0.4, seed: seed + 1, blur: 2 });
    pencil(p, pts, { closed: true, w: 1.4, seed: seed + 2 });
  };
  if (kind === 'cup') {
    body([[cx - 13, b - 25], [cx + 11, b - 25], [cx + 9, b - 3], [cx - 11, b - 3]]);
    pencil(p, blob(cx + 15, b - 15, 6, 7, { seed: seed + 3, lobes: 8 }), { closed: true, w: 1.2, seed: seed + 4 });
    pencil(p, blob(cx - 1, b - 2, 15, 2.5, { seed: seed + 5, lobes: 10 }), { closed: true, w: 1, seed: seed + 6 });
    pencil(p, [[cx - 4, b - 30], [cx - 2, b - 38], [cx - 5, b - 44]], { w: 0.8, alpha: 0.4, color: INK.soft, seed: seed + 7 });
  } else if (kind === 'book') {
    body(handRect(cx - 17, b - 15, 34, 12, { seed, amp: 0.4 }));
    body(handRect(cx - 15, b - 28, 30, 12, { seed: seed + 9, amp: 0.4 }));
    [b - 7, b - 21].forEach((y, i) => rule(p, cx - 13, y, cx + 12, y, { w: 0.6, alpha: 0.5, overshoot: 0, seed: seed + 10 + i }));
  } else if (kind === 'tin' || kind === 'jar') {
    body([[cx - 12, b - 28], [cx + 12, b - 28], [cx + 12, b - 3], [cx - 12, b - 3]]);
    pencil(p, blob(cx, b - 28, 12, 3, { seed: seed + 11, lobes: 10, irregular: 0.03 }), { closed: true, w: 1.1, seed: seed + 12 });
    pencil(p, blob(cx, b - 3, 12, 3, { seed: seed + 13, lobes: 10, irregular: 0.03 }), { closed: true, w: 1.1, seed: seed + 14 });
    if (kind === 'tin') { rule(p, cx - 8, b - 16, cx + 8, b - 16, { w: 0.8, alpha: 0.6, overshoot: 0, seed: seed + 15 }); hatch(p, handRect(cx + 4, b - 27, 7, 23, { seed: seed + 16, amp: 0.1 }), { spacing: 2.4, alpha: 0.35, seed: seed + 17 }); }
    else { pencil(p, handRect(cx - 9, b - 34, 18, 6, { seed: seed + 18, amp: 0.2 }), { closed: true, smooth: false, w: 1.1, seed: seed + 19 }); washRect(c, cx - 9, b - 34, 18, 6, '#e8e2d6', { alpha: 1, seed: seed + 20, bloom: 0 }); }
  } else if (kind === 'bottle') {
    body([[cx - 9, b - 26], [cx - 4, b - 30], [cx - 4, b - 40], [cx + 4, b - 40], [cx + 4, b - 30], [cx + 9, b - 26], [cx + 9, b - 3], [cx - 9, b - 3]]);
    pencil(p, handRect(cx - 4.5, b - 44, 9, 4, { seed: seed + 21, amp: 0.2 }), { closed: true, smooth: false, w: 1, seed: seed + 22 });
  } else if (kind === 'vase') {
    const pts = [];
    for (let i = 0; i <= 16; i += 1) { const t = i / 16; const r = 6 + Math.sin(t * Math.PI) * 9; pts.push([cx + r, b - 3 - t * 30]); }
    for (let i = 16; i >= 0; i -= 1) { const t = i / 16; const r = 6 + Math.sin(t * Math.PI) * 9; pts.push([cx - r, b - 3 - t * 30]); }
    body(pts);
    // three stems and blossoms
    [[-6, -48], [0, -54], [7, -47]].forEach(([dx, dy], i) => {
      pencil(p, [[cx + dx * 0.3, b - 32], [cx + dx, b + dy]], { w: 0.9, seed: seed + 23 + i });
      pencil(p, blob(cx + dx, b + dy - 2, 4, 3.5, { seed: seed + 26 + i, lobes: 6 }), { closed: true, w: 0.9, seed: seed + 29 + i });
    });
  } else if (kind === 'ribbon') {
    body([[cx, b - 17], [cx - 19, b - 29], [cx - 15, b - 8]], false);
    body([[cx, b - 17], [cx + 19, b - 29], [cx + 15, b - 8]], false);
    body(blob(cx, b - 17, 5.5, 5.5, { seed: seed + 32, lobes: 8 }), false);
    pencil(p, [[cx - 2, b - 13], [cx - 9, b]], { w: 1.2, seed: seed + 33 });
    pencil(p, [[cx + 2, b - 13], [cx + 8, b]], { w: 1.2, seed: seed + 34 });
  }
  tooth(p, s.w, s.h, 0.25);
  return { pencil: s.pencil, wash: s.wash };
}

// Rosa's canvas, in canvas-local pixels (DrawingStudioScene CANVAS).
export function paintStillLife(shapes, w, h) {
  const pc = makeCanvas(w, h);
  const p = pc.getContext('2d');
  const r = rng(0x5711);
  // the horizon and the ground line, a child's ruled hand
  pencil(p, [[0, 74], [w * 0.4, 72], [w, 70]], { w: 1.8, alpha: 0.8, seed: 1, jitter: 1.2 });
  pencil(p, [[0, 228], [w * 0.5, 226], [w, 222]], { w: 1.8, alpha: 0.8, seed: 2, jitter: 1.2 });
  // the tree: trunk, canopy clusters (the leaves region), the apple in them
  pencil(p, [[93, 226], [95, 180], [97, 150]], { w: 3, alpha: 0.75, seed: 3 });
  pencil(p, [[100, 226], [100, 182], [101, 150]], { w: 2.4, alpha: 0.7, seed: 4 });
  pencil(p, [[97, 168], [74, 146]], { w: 1.6, alpha: 0.7, seed: 5 });
  pencil(p, [[99, 160], [126, 140]], { w: 1.6, alpha: 0.7, seed: 6 });
  shapes.leaves.circles.forEach((cl, i) => pencil(p, blob(cl.x, cl.y, cl.r, cl.r * 0.94, { seed: 10 + i, lobes: 11, irregular: 0.12 }), { closed: true, w: 1.8, alpha: 0.8, seed: 11 + i, jitter: 0.9 }));
  scribble(p, 96, 118, 40, 22, { seed: 15, loops: 16, w: 1, alpha: 0.3 });
  const apple = shapes.apple;
  pencil(p, blob(apple.x, apple.y, apple.r, apple.r * 0.92, { seed: 20, lobes: 10, irregular: 0.06 }), { closed: true, w: 1.8, seed: 21 });
  pencil(p, [[apple.x, apple.y - apple.r], [apple.x + 3, apple.y - apple.r - 8]], { w: 1.6, seed: 22 });
  // the sun, with its rays
  const sun = shapes.sun;
  pencil(p, blob(sun.x, sun.y, sun.r, sun.r, { seed: 23, lobes: 10, irregular: 0.05 }), { closed: true, w: 1.8, seed: 24 });
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * TAU;
    rule(p, sun.x + Math.cos(a) * (sun.r + 5), sun.y + Math.sin(a) * (sun.r + 5), sun.x + Math.cos(a) * (sun.r + 13), sun.y + Math.sin(a) * (sun.r + 13), { w: 1.6, overshoot: 0, seed: 25 + i });
  }
  // the bowl of plums
  shapes.plums.circles.forEach((cl, i) => pencil(p, blob(cl.x, cl.y, cl.r, cl.r, { seed: 40 + i, lobes: 9, irregular: 0.05 }), { closed: true, w: 1.6, seed: 41 + i }));
  const bowl = [];
  for (let i = 0; i <= 14; i += 1) { const a = 0.08 + (i / 14) * (Math.PI - 0.16); bowl.push([227 + Math.cos(a) * 36, 208 + Math.sin(a) * 24]); }
  pencil(p, bowl, { w: 1.8, seed: 45 });
  rule(p, 191, 210, 263, 210, { w: 1.4, seed: 46 });
  hatch(p, [...bowl, [191, 210]], { spacing: 3.5, alpha: 0.3, seed: 47 });
  // the fox by the gate: body, head and ears, the brush of its tail, legs
  const f = shapes.fox;
  const fox = blob(f.x, f.y, 32, 12, { seed: 50, lobes: 10, irregular: 0.08 });
  pencil(p, fox, { closed: true, w: 1.7, seed: 51 });
  pencil(p, [[f.x + 28, f.y - 6], [f.x + 34, f.y - 22], [f.x + 38, f.y - 12], [f.x + 46, f.y - 20], [f.x + 46, f.y - 6], [f.x + 52, f.y - 2], [f.x + 34, f.y + 4]], { closed: true, smooth: false, w: 1.6, seed: 52 });
  pencil(p, [[f.x - 30, f.y], [f.x - 44, f.y - 10], [f.x - 50, f.y - 22], [f.x - 40, f.y - 14], [f.x - 28, f.y - 6]], { closed: true, w: 1.5, seed: 53 });
  [-20, -8, 10, 22].forEach((dx, i) => rule(p, f.x + dx, f.y + 10, f.x + dx + (i % 2 ? 2 : -2), f.y + 24, { w: 1.5, overshoot: 0, seed: 54 + i }));
  p.save(); p.fillStyle = INK.graphite; p.beginPath(); p.arc(f.x + 42, f.y - 8, 1.4, 0, TAU); p.fill(); p.restore();
  // the gate and the path up to it
  [288, 302, 316].forEach((x, i) => rule(p, x, 190, x + (r() - 0.5) * 2, 226, { w: 1.3, alpha: 0.8, overshoot: 2, seed: 60 + i }));
  rule(p, 282, 198, 322, 198, { w: 1.3, alpha: 0.8, seed: 63 });
  rule(p, 282, 212, 322, 212, { w: 1.1, alpha: 0.7, seed: 64 });
  // grass ticks along the ground
  for (let i = 0; i < 40; i += 1) { const x = r() * w; const y = 224 + r() * 22; rule(p, x, y, x - 2, y - 6, { w: 0.8, alpha: 0.35, overshoot: 0, passes: 1, seed: 70 + i }); }
  tooth(p, w, h, 0.3);

  // one neutral wash per region, the shape the child meant to fill
  const regions = {};
  const region = (id, draw) => {
    const canvas = makeCanvas(w, h);
    draw(canvas.getContext('2d'));
    regions[id] = canvas;
  };
  region('sky', (c) => wash(c, handRect(3, 3, w - 6, 68, { seed: 80, amp: 2 }), NEUTRAL, { alpha: 1, seed: 81, bloom: 0.4, edge: 0.3 }));
  region('sun', (c) => wash(c, blob(sun.x, sun.y, sun.r - 1, sun.r - 1, { seed: 82, lobes: 10, irregular: 0.08 }), NEUTRAL, { alpha: 1, seed: 83, bloom: 0.2 }));
  region('leaves', (c) => shapes.leaves.circles.forEach((cl, i) => wash(c, blob(cl.x, cl.y, cl.r - 1, cl.r * 0.92, { seed: 84 + i, lobes: 11, irregular: 0.14 }), NEUTRAL, { alpha: 1, seed: 87 + i, bloom: 0.35 })));
  region('apple', (c) => {
    wash(c, blob(apple.x, apple.y, apple.r - 1, apple.r * 0.9, { seed: 90, lobes: 10, irregular: 0.06 }), NEUTRAL, { alpha: 1, seed: 91, bloom: 0.15 });
    c.save(); c.globalAlpha = 0.6; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(apple.x - 5, apple.y - 5, 3.5, 0, TAU); c.fill(); c.restore();
  });
  region('plums', (c) => shapes.plums.circles.forEach((cl, i) => wash(c, blob(cl.x, cl.y, cl.r - 1, cl.r - 1, { seed: 92 + i, lobes: 9, irregular: 0.06 }), NEUTRAL, { alpha: 1, seed: 95 + i, bloom: 0.2 })));
  region('fox', (c) => {
    wash(c, blob(f.x, f.y, 31, 11, { seed: 98, lobes: 10, irregular: 0.08 }), NEUTRAL, { alpha: 1, seed: 99, bloom: 0.25 });
    wash(c, [[f.x + 28, f.y - 6], [f.x + 34, f.y - 21], [f.x + 38, f.y - 12], [f.x + 45, f.y - 19], [f.x + 45, f.y - 6], [f.x + 51, f.y - 2], [f.x + 34, f.y + 3]], NEUTRAL, { alpha: 1, seed: 100, bloom: 0.2 });
    wash(c, [[f.x - 30, f.y], [f.x - 44, f.y - 10], [f.x - 49, f.y - 21], [f.x - 40, f.y - 14], [f.x - 28, f.y - 6]], NEUTRAL, { alpha: 1, seed: 101, bloom: 0.2 });
  });
  return { pencil: pc, regions };
}

// The easel: two splayed legs, a back leg, the ledge the canvas sits on.
export function paintEasel(w, h, canvasRect) {
  const pc = makeCanvas(w, h);
  const p = pc.getContext('2d');
  const { x, y, w: cw, h: ch } = canvasRect;
  const mid = x + cw / 2;
  const foot = h - 4;
  pencil(p, [[mid - 12, y - 30], [mid - 96, foot]], { w: 2.6, seed: 1, overshoot: 4 });
  pencil(p, [[mid + 12, y - 30], [mid + 96, foot]], { w: 2.6, seed: 2, overshoot: 4 });
  pencil(p, [[mid, y - 40], [mid, foot - 20]], { w: 2, alpha: 0.6, seed: 3 });
  pencil(p, handRect(x - 24, y + ch + 14, cw + 48, 9, { seed: 4, amp: 0.4 }), { closed: true, smooth: false, w: 1.6, seed: 5 });
  hatch(p, handRect(x - 24, y + ch + 14, cw + 48, 9, { seed: 6, amp: 0.2 }), { spacing: 3, alpha: 0.3, seed: 7 });
  const wc = makeCanvas(w, h);
  const c = wc.getContext('2d');
  washRect(c, x - 24, y + ch + 14, cw + 48, 9, HUE.bark, { alpha: 0.7, seed: 8 });
  wash(c, [[mid - 14, y - 30], [mid - 10, y - 30], [mid - 92, foot], [mid - 99, foot]], HUE.bark, { alpha: 0.5, seed: 9 });
  wash(c, [[mid + 10, y - 30], [mid + 14, y - 30], [mid + 99, foot], [mid + 92, foot]], HUE.bark, { alpha: 0.5, seed: 10 });
  tooth(p, w, h, 0.3);
  return { pencil: pc, wash: wc };
}
