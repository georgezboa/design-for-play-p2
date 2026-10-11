// Chapter 6 · paintings for the round-12 set pieces, with the same ink kits
// as the rest of the finale (nightService/art/ink.js, Chapter 2's paint kit,
// Chapter 4's paper palette). Plain canvases; the views turn them into
// textures. No three.js here.

import { PAL, glow as inkGlow, ink, inkRect, rivet, rng, roundRectPath, speckle, vgrad, wood, brassFill, sepia } from '../nightService/art/ink.js';
import { makeCanvas } from './finaleArt.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// I · the night service

// The night sky behind the train: a deep blue wash, a moon low in it, stars.
export function paintNightSky({ w = 1024, h = 512, seed = 3 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  c.fillStyle = vgrad(c, 0, h, [[0, '#05070d'], [0.55, '#0e1626'], [0.85, '#2a2433'], [1, '#3b2a2a']]);
  c.fillRect(0, 0, w, h);
  const random = rng(seed);
  for (let i = 0; i < 220; i += 1) {
    c.fillStyle = `rgba(234, 223, 198, ${0.15 + random() * 0.55})`;
    const s = random() < 0.08 ? 2 : 1;
    c.fillRect(random() * w, random() * h * 0.6, s, s);
  }
  inkGlow(c, w * 0.78, h * 0.3, 160, 'rgba(234, 223, 198, 0.9)', 0.18);
  c.fillStyle = '#e9dfc8';
  c.beginPath(); c.arc(w * 0.78, h * 0.3, 22, 0, TAU); c.fill();
  c.fillStyle = 'rgba(14, 22, 38, 0.92)';
  c.beginPath(); c.arc(w * 0.78 + 9, h * 0.3 - 5, 20, 0, TAU); c.fill();
  return canvas;
}

// A signal gantry over the line: a lattice beam on two legs, its red lamp.
export function paintGantry({ w = 260, h = 520 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  const beamTop = 30;
  const beamH = 120;
  c.fillStyle = '#161b22';
  c.fillRect(0, beamTop, w, beamH);
  c.strokeStyle = 'rgba(234, 223, 198, 0.55)';
  c.lineWidth = 4;
  for (let x = 0; x < w; x += 40) { c.beginPath(); c.moveTo(x, beamTop); c.lineTo(x + 40, beamTop + beamH); c.moveTo(x + 40, beamTop); c.lineTo(x, beamTop + beamH); c.stroke(); }
  inkRect(c, 2, beamTop, w - 4, beamH, { w: 3, alpha: 0.9 });
  // legs down past the roof line
  c.fillStyle = '#10141a';
  c.fillRect(18, beamTop + beamH, 22, h - beamTop - beamH);
  c.fillRect(w - 40, beamTop + beamH, 22, h - beamTop - beamH);
  // the red lamp and its hood
  inkGlow(c, w / 2, beamTop + beamH + 24, 70, 'rgba(255, 80, 60, 0.95)', 0.65);
  c.fillStyle = '#ff5a3c';
  c.beginPath(); c.arc(w / 2, beamTop + beamH + 24, 15, 0, TAU); c.fill();
  c.fillStyle = '#fff0e0';
  c.beginPath(); c.arc(w / 2 - 4, beamTop + beamH + 20, 5, 0, TAU); c.fill();
  c.fillStyle = '#0b0e12';
  c.fillRect(w / 2 - 22, beamTop + beamH, 44, 8);
  return canvas;
}

// A steamer trunk (bigger, banded, heavier than a case).
export function paintTrunk({ seed = 5 } = {}) {
  const S = 5;
  const w = 64;
  const h = 46;
  const canvas = makeCanvas(w * S, h * S);
  const c = canvas.getContext('2d');
  c.scale(S, S);
  c.fillStyle = '#3c2a1e';
  roundRectPath(c, 3, 8, 58, 35, 3); c.fill();
  wood(c, 4, 9, 56, 33, { base: '#4a3121', seed, planks: 4 });
  c.fillStyle = PAL.brassDark;
  [10, 30, 50].forEach((x) => c.fillRect(x, 8, 4, 35));
  c.fillStyle = brassFill(c, 0, 0, 64, 6);
  c.fillRect(3, 8, 58, 3);
  c.fillRect(3, 40, 58, 3);
  [6, 58].forEach((x) => [12, 38].forEach((y) => rivet(c, x, y, 1.4)));
  c.fillStyle = PAL.brassLight;
  c.fillRect(28, 20, 8, 7);
  ink(c, [[3, 8], [61, 8], [61, 43], [3, 43]], { w: 1.4, closed: true, bleed: false, seed });
  return canvas;
}

// The tender's roof seen down its length (Movement I's duel floor).
export function paintTenderRoof({ w = 512, h = 2048, seed = 8 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  c.fillStyle = vgrad(c, 0, h, [[0, '#1d2028'], [1, '#2b2a2c']]);
  c.fillRect(0, 0, w, h);
  // the walkway planks down the middle
  wood(c, w * 0.32, 0, w * 0.36, h, { base: '#3b2a1e', seed, vertical: true, planks: 3 });
  for (let y = 0; y < h; y += 64) { c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(w * 0.32, y, w * 0.36, 3); }
  // rivet rows and seams
  for (let y = 32; y < h; y += 96) for (let x = 24; x < w; x += 58) rivet(c, x, y, 3);
  c.strokeStyle = 'rgba(234, 223, 198, 0.12)';
  c.lineWidth = 3;
  for (let y = 0; y < h; y += 192) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  // the brass edge rails
  c.fillStyle = brassFill(c, 0, 0, 18, h, true);
  c.fillRect(0, 0, 14, h);
  c.fillRect(w - 14, 0, 14, h);
  speckle(c, 0, 0, w, h, { count: 2600, color: 'rgba(234, 223, 198, 0.04)', size: 2, seed });
  return canvas;
}

// A mail sack (skids down the tender's roof).
export function paintSack() {
  const S = 4;
  const canvas = makeCanvas(90 * S, 50 * S);
  const c = canvas.getContext('2d');
  c.scale(S, S);
  c.fillStyle = '#7a6a4e';
  c.beginPath(); c.ellipse(45, 30, 40, 17, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.beginPath(); c.ellipse(45, 36, 36, 9, 0, 0, TAU); c.fill();
  c.fillStyle = PAL.oxblood;
  c.fillRect(30, 18, 30, 7);
  c.fillStyle = PAL.paper;
  c.font = '700 6px "Jost", monospace';
  c.fillText('MAIL · 1978', 32, 23.5);
  ink(c, [[6, 30], [20, 14], [70, 14], [84, 30], [70, 46], [20, 46]], { w: 1.2, closed: true, bleed: false });
  return canvas;
}

// ---------------------------------------------------------------------------
// II · the rain city and the bell tower

// A building's face below its roof: wet concrete, rows of windows.
export function paintFacade({ w = 512, h = 768, seed = 4, lit = 0.35 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  const random = rng(seed);
  c.fillStyle = vgrad(c, 0, h, [[0, '#1c262c'], [1, '#0c1215']]);
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#273239';
  c.fillRect(0, 0, w, 18);
  for (let y = 60; y < h - 40; y += 96) {
    for (let x = 28; x < w - 60; x += 86) {
      const on = random() < lit;
      c.fillStyle = on ? (random() < 0.5 ? '#e8b866' : '#d9a05a') : '#141c21';
      c.fillRect(x, y, 48, 58);
      if (on) inkGlow(c, x + 24, y + 29, 60, 'rgba(255, 196, 110, 0.7)', 0.18);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(x + 22, y, 4, 58);
    }
  }
  // rain streaks down the wall
  c.strokeStyle = 'rgba(200, 214, 220, 0.05)';
  c.lineWidth = 2;
  for (let i = 0; i < 80; i += 1) { const x = random() * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 6, h); c.stroke(); }
  ink(c, [[0, 2], [w, 2]], { w: 3, alpha: 0.6, bleed: false });
  return canvas;
}

// The bell tower's inner wall: dressed stone, a little light from below.
export function paintTowerStone({ w = 512, h = 512, seed = 9 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  const random = rng(seed);
  c.fillStyle = '#2a2f33';
  c.fillRect(0, 0, w, h);
  const rowH = 48;
  for (let y = 0; y < h; y += rowH) {
    const offset = (y / rowH) % 2 ? 0 : 60;
    for (let x = -offset; x < w; x += 120) {
      const tone = 38 + Math.floor(random() * 22);
      c.fillStyle = `rgb(${tone}, ${tone + 4}, ${tone + 9})`;
      c.fillRect(x + 3, y + 3, 114, rowH - 6);
    }
  }
  speckle(c, 0, 0, w, h, { count: 1800, color: 'rgba(234, 223, 198, 0.05)', size: 2, seed });
  return canvas;
}

// A wooden ledge (a beam end in the tower).
export function paintBeamWood({ w = 256, h = 48, seed = 12 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  wood(c, 0, 0, w, h, { base: '#4a3121', seed, planks: 1 });
  c.fillStyle = 'rgba(255, 220, 170, 0.18)';
  c.fillRect(0, 0, w, 5);
  ink(c, [[0, 2], [w, 2]], { w: 2.4, alpha: 0.85, bleed: false });
  return canvas;
}

// The great bell, bronze, its lip and a crack (shown as it cracks).
export function paintBell({ cracked = false } = {}) {
  const w = 512;
  const h = 512;
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  const body = c.createLinearGradient(80, 0, 430, 0);
  body.addColorStop(0, '#4a3418');
  body.addColorStop(0.35, '#b08a4a');
  body.addColorStop(0.55, '#e3c27e');
  body.addColorStop(1, '#3e2a14');
  c.fillStyle = body;
  c.beginPath();
  c.moveTo(196, 70); c.lineTo(316, 70);
  c.bezierCurveTo(360, 90, 372, 220, 392, 330);
  c.bezierCurveTo(404, 400, 450, 420, 470, 450);
  c.lineTo(42, 450);
  c.bezierCurveTo(62, 420, 108, 400, 120, 330);
  c.bezierCurveTo(140, 220, 152, 90, 196, 70);
  c.closePath();
  c.fill();
  c.fillStyle = PAL.brassDark;
  c.fillRect(42, 438, 428, 18);
  c.fillRect(150, 300, 212, 12);
  c.fillStyle = '#2b1d0e';
  c.fillRect(226, 30, 60, 44);
  ink(c, [[196, 70], [316, 70], [392, 330], [470, 450], [42, 450], [120, 330]], { w: 4, closed: true, alpha: 0.9, bleed: false });
  if (cracked) {
    ink(c, [[300, 120], [280, 190], [306, 250], [270, 330], [296, 400], [262, 450]], { w: 6, color: '#120c06', alpha: 0.95, bleed: false });
    inkGlow(c, 280, 300, 120, 'rgba(255, 210, 150, 0.9)', 0.3);
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// III · Echo City's words

// A word of his misreading, as a slip of the record: paper, ink, an oxblood
// edge. (The word is a shape to dodge: the claim's text is in the subtitle.)
export function paintWordSlip(word, { past = false } = {}) {
  const fontPx = 46;
  const probe = makeCanvas(8, 8).getContext('2d');
  probe.font = `700 ${fontPx}px "Jost", "Helvetica Neue", Arial, sans-serif`;
  const tw = Math.max(40, probe.measureText(word).width);
  const w = Math.ceil(tw + 46);
  const h = 82;
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  c.save();
  c.translate(w / 2, h / 2);
  c.rotate(-0.02);
  c.fillStyle = past ? '#d8c39c' : '#efe3c6';
  roundRectPath(c, -w / 2 + 4, -h / 2 + 6, w - 8, h - 12, 8); c.fill();
  c.strokeStyle = 'rgba(138, 42, 30, 0.95)';
  c.lineWidth = 5;
  roundRectPath(c, -w / 2 + 6, -h / 2 + 8, w - 12, h - 16, 7); c.stroke();
  c.fillStyle = '#2a1712';
  c.font = `700 ${fontPx}px "Jost", "Helvetica Neue", Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(word, 0, 3);
  c.restore();
  if (past) sepia(c, { amount: 0.6 });
  return canvas;
}

// ---------------------------------------------------------------------------
// IV · the Painted Country

// His grey wash standing on the line: a watercolour blot, ragged.
export function paintWashBlot({ seed = 3, w = 300, h = 260 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  const random = rng(seed);
  for (let i = 0; i < 26; i += 1) {
    const x = w / 2 + (random() - 0.5) * w * 0.6;
    const y = h * 0.55 + (random() - 0.5) * h * 0.5;
    const r = 30 + random() * 70;
    const g = c.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, `rgba(96, 98, 104, ${0.35 + random() * 0.3})`);
    g.addColorStop(1, 'rgba(96, 98, 104, 0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  c.strokeStyle = 'rgba(48, 50, 56, 0.55)';
  c.lineWidth = 3;
  c.beginPath();
  for (let i = 0; i <= 24; i += 1) {
    const a = (i / 24) * TAU;
    const r = 0.36 + random() * 0.1;
    const x = w / 2 + Math.cos(a) * w * r;
    const y = h * 0.55 + Math.sin(a) * h * r * 0.9;
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.stroke();
  return canvas;
}

// The train's front seen from behind and above: the boiler's top, the
// smokebox, the buffer beam Butch stands on, two lamps.
export function paintTrainFront({ w = 512, h = 384 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  c.fillStyle = '#2a2f3a';
  roundRectPath(c, 96, 0, w - 192, h * 0.7, 40); c.fill();
  c.fillStyle = '#383e4b';
  roundRectPath(c, 120, 0, w - 240, h * 0.55, 30); c.fill();
  c.fillStyle = PAL.brass;
  c.fillRect(110, h * 0.3, w - 220, 10);
  // the buffer beam
  c.fillStyle = '#8a2a1e';
  c.fillRect(24, h * 0.7, w - 48, h * 0.18);
  c.fillStyle = '#5e1c14';
  c.fillRect(24, h * 0.85, w - 48, h * 0.05);
  [70, w - 70].forEach((x) => {
    inkGlow(c, x, h * 0.66, 70, 'rgba(255, 230, 170, 0.9)', 0.4);
    c.fillStyle = '#fff1c8'; c.beginPath(); c.arc(x, h * 0.66, 16, 0, TAU); c.fill();
  });
  ink(c, [[24, h * 0.7], [w - 24, h * 0.7], [w - 24, h * 0.88], [24, h * 0.88]], { w: 3, closed: true, color: '#1d1f24', alpha: 0.9, bleed: false });
  return canvas;
}

// A pencil line drawn on the paper (for the drawn stretches of the line).
export function paintPencilStrip({ w = 64, h = 512, seed = 7 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  const random = rng(seed);
  c.strokeStyle = 'rgba(60, 60, 64, 0.75)';
  for (const x of [w * 0.28, w * 0.72]) {
    c.lineWidth = 2.2;
    c.beginPath();
    for (let y = 0; y <= h; y += 16) { const px = x + (random() - 0.5) * 2.4; if (y) c.lineTo(px, y); else c.moveTo(px, y); }
    c.stroke();
  }
  c.lineWidth = 1.4;
  for (let y = 8; y < h; y += 28) { c.beginPath(); c.moveTo(w * 0.18, y + (random() - 0.5) * 2); c.lineTo(w * 0.82, y + (random() - 0.5) * 2); c.stroke(); }
  return canvas;
}

// The same line painted in (sleepers, rails, Rosa's colours).
export function paintPaintedStrip({ w = 64, h = 512, seed = 11 } = {}) {
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  const random = rng(seed);
  const colours = ['#435d91', '#4f8f7c', '#b07a3a'];
  for (let y = 8; y < h; y += 28) {
    c.fillStyle = colours[Math.floor(random() * colours.length)];
    c.globalAlpha = 0.85;
    c.fillRect(w * 0.14, y, w * 0.72, 12);
  }
  c.globalAlpha = 1;
  c.fillStyle = '#2b2f3a';
  c.fillRect(w * 0.24, 0, 7, h);
  c.fillRect(w * 0.72, 0, 7, h);
  return canvas;
}
