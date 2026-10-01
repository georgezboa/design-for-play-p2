// Chapter 4 // THE PAINTED COUNTRY — the six residents who lent their colours.
//
// Small pencil figures in Rosa's hand, each with something to know them by
// (the baker's cap, the station master's peak, the orchard girl's scarf, the
// miller's apron, the well keeper's bonnet, the quilt's shawl). Each frame is
// a pencil canvas and a neutral cloth wash the scene tints: pale while their
// colour rides on the train, their own colour once Butch washes it back.
// Frames: 0 standing, 1–4 running.

import { INK, TAU, blob, hatch, makeCanvas, pencil, rng, tooth, wash } from './pencilKit.js';

export const RESIDENT = Object.freeze({ w: 40, h: 76, frames: 5 });

function frame(type, f, seed) {
  const { w, h } = RESIDENT;
  const pc = makeCanvas(w, h);
  const wc = makeCanvas(w, h);
  const p = pc.getContext('2d');
  const c = wc.getContext('2d');
  const cx = w / 2;
  const feet = h - 3;
  const run = f > 0;
  const phase = run ? ((f - 1) / 4) * TAU : 0;
  const swing = run ? Math.sin(phase) : 0;
  const bob = run ? Math.abs(Math.cos(phase)) * 2 : 0;
  const hip = feet - 24 - bob;
  const shoulder = hip - 22;
  const head = shoulder - 9;
  const lean = run ? 3 : 0;
  // legs: thigh and shin, the knee bending on the back stroke
  [[1, swing], [-1, -swing]].forEach(([side, s], i) => {
    const kx = cx + lean * 0.5 + s * 7;
    const ky = hip + 12;
    const fx = cx + s * 10 - (s < 0 ? 3 : 0);
    const fy = feet - (run && s < -0.2 ? 5 : 0);
    pencil(p, [[cx + side * 2 + lean * 0.6, hip], [kx, ky], [fx, fy]], { w: 1.4, smooth: false, seed: seed + i, alpha: 0.9 });
    pencil(p, [[fx - 1, fy], [fx + 4, fy]], { w: 1.6, smooth: false, seed: seed + 3 + i });
  });
  // coat / skirt
  const skirt = type === 2 || type === 4 || type === 5;
  const coat = skirt
    ? [[cx - 5 + lean, shoulder], [cx + 5 + lean, shoulder], [cx + 9 + lean * 0.4, hip + 9], [cx - 9 + lean * 0.4, hip + 9]]
    : [[cx - 5 + lean, shoulder], [cx + 5 + lean, shoulder], [cx + 6 + lean * 0.5, hip + 3], [cx - 6 + lean * 0.5, hip + 3]];
  wash(c, coat, '#ffffff', { alpha: 1, seed: seed + 10, bloom: 0.1, blur: 0.3 });
  pencil(p, coat, { closed: true, smooth: false, w: 1.3, seed: seed + 11 });
  hatch(p, coat, { spacing: 2.6, alpha: 0.18, seed: seed + 12 });
  if (type === 3) { // the miller's apron
    pencil(p, [[cx - 4 + lean, shoulder + 8], [cx + 4 + lean, shoulder + 8], [cx + 5 + lean * 0.5, hip + 2], [cx - 5 + lean * 0.5, hip + 2]], { closed: true, smooth: false, w: 0.8, alpha: 0.7, seed: seed + 13 });
  }
  // arms
  [[1, -swing], [-1, swing]].forEach(([side, s], i) => {
    const hx = cx + lean + s * 9;
    const hy = shoulder + 18 - (run ? Math.abs(s) * 3 : 0);
    pencil(p, [[cx + side * 3 + lean, shoulder + 2], [cx + lean + s * 5, shoulder + 10], [hx, hy]], { w: 1.2, smooth: false, seed: seed + 20 + i, alpha: 0.85 });
  });
  // head and what they wear on it
  const hx = cx + lean + 1;
  const face = blob(hx, head, 5.2, 5.6, { seed: seed + 30, lobes: 8, irregular: 0.06 });
  c.save(); c.fillStyle = '#fdfaf3'; c.beginPath(); face.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.restore();
  pencil(p, face, { closed: true, w: 1.2, seed: seed + 31 });
  if (type === 0) pencil(p, [[hx - 5, head - 4], [hx - 6, head - 13], [hx + 1, head - 15], [hx + 6, head - 12], [hx + 5, head - 4]], { closed: true, w: 1.1, seed: seed + 32 });
  else if (type === 1) { pencil(p, [[hx - 6, head - 3], [hx - 5, head - 8], [hx + 5, head - 8], [hx + 6, head - 3]], { closed: true, smooth: false, w: 1.2, seed: seed + 33 }); pencil(p, [[hx + 3, head - 3], [hx + 10, head - 2]], { w: 1.3, smooth: false, seed: seed + 34 }); }
  else if (type === 2) { pencil(p, [[hx - 6, head - 2], [hx, head - 6], [hx + 6, head - 2]], { w: 1.4, seed: seed + 35 }); pencil(p, [[hx - 5, head - 1], [hx - 10, head + 5 + swing * 2]], { w: 1, seed: seed + 36 }); }
  else if (type === 3) pencil(p, [[hx - 7, head - 3], [hx - 4, head - 7], [hx + 4, head - 7], [hx + 8, head - 3]], { closed: true, smooth: false, w: 1.2, seed: seed + 37 });
  else if (type === 4) pencil(p, [[hx + 6, head + 4], [hx + 6, head - 4], [hx, head - 8], [hx - 6, head - 5], [hx - 7, head + 2]], { w: 1.3, seed: seed + 38 });
  else { pencil(p, [[hx - 6, head - 3], [hx, head - 7], [hx + 6, head - 3]], { w: 1.3, seed: seed + 39 }); pencil(p, [[cx - 6 + lean, shoulder + 1], [cx + 7 + lean, shoulder + 1], [cx + 9 + lean, shoulder + 7]], { w: 1.1, seed: seed + 40 }); }
  // the hat or scarf takes the cloth colour too
  if (type <= 3 || type === 4) {
    const capY = type === 0 ? head - 9 : head - 5;
    wash(c, blob(hx, capY, 6, type === 0 ? 6 : 3, { seed: seed + 41, lobes: 6 }), '#ffffff', { alpha: 0.9, seed: seed + 42, bloom: 0, blur: 0.3 });
  }
  tooth(p, w, h, 0.2);
  return { pencil: pc, wash: wc };
}

// All frames for one resident type, as two horizontal strips.
export function paintResident(type, seed = 1) {
  const { w, h, frames } = RESIDENT;
  const pencilStrip = makeCanvas(w * frames, h);
  const washStrip = makeCanvas(w * frames, h);
  for (let f = 0; f < frames; f += 1) {
    const fr = frame(type, f, seed + type * 101 + f * 7);
    pencilStrip.getContext('2d').drawImage(fr.pencil, f * w, 0);
    washStrip.getContext('2d').drawImage(fr.wash, f * w, 0);
  }
  return { pencil: pencilStrip, wash: washStrip };
}

void INK; void rng;
