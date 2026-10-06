// Painters for the chapter1To2 and chapter2To3 cutscenes (README.md lists
// the shared ones in painters.js; these follow the same rules: stage units,
// Chapter 1's ink language, static parts cached by the scene in layers).
//
//   drawPinchHand        Butch's hand holding a paper (a ticket, the letter) by its edge
//   glassBeads           rain beads and sheen on a window pane
//   paintBrickFacade     Chapter 2's brick fronts: arched windows, some lit
//   paintCityFar         Chapter 2's far city in the rain, teal haze, lit windows
//   drawLitSign          an amber or teal sign box, `on` 0..1 (they come on like a bell)
//   drawStationClock     a hanging platform clock showing a time
//   drawLampPost         a platform lamp on its post with its cone of light
//   drawWaterTower       a rooftop water tank on its legs
//   paintCarriageSide    the night service's carriage side, close: cream over vermilion

import {
  PAL, brassFill, glow, ink, inkEllipse, inkRect, lightCone, rivet, rng, roundRectPath, vgrad, wood,
} from './painters.js';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function radial(c, x, y, r, stops) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}

/** Warm lamp light added inside a path (as painters.js lampLit). */
export function litInside(c, path, lx, ly, r, alpha, color = '255, 176, 104') {
  c.save();
  c.clip(path);
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, lx, ly, r, [[0, `rgba(${color}, ${alpha})`], [0.45, `rgba(${color}, ${alpha * 0.45})`], [1, `rgba(${color}, 0)`]]);
  c.fillRect(lx - r, ly - r, r * 2, r * 2);
  c.restore();
}

// ---------------------------------------------------------------------------
// Butch's hand, close: holding a paper by its left edge between the thumb (in
// front) and the fingers (behind). Local units are stage px at s = 1: the
// paper's left edge is x 0, its middle y 0; the hand reaches in from the
// lower left and its sleeve leaves the frame. Butch's Chapter 1 coat teal,
// in lamplight.

const SKIN = '#b08868';
const SKIN_SHADE = '#6a4636';
const SLEEVE = '#22383f';
const CUFF = '#18282e';

function handPaths() {
  const sleeve = new Path2D();
  sleeve.moveTo(-760, -40); sleeve.lineTo(-420, -10); sleeve.quadraticCurveTo(-380, 90, -400, 250);
  sleeve.lineTo(-760, 330); sleeve.closePath();
  const cuff = new Path2D();
  cuff.moveTo(-470, -20); cuff.lineTo(-400, -12); cuff.quadraticCurveTo(-360, 90, -382, 246); cuff.lineTo(-452, 262);
  cuff.quadraticCurveTo(-432, 110, -470, -20); cuff.closePath();
  const body = new Path2D();
  body.moveTo(-420, -6); body.quadraticCurveTo(-300, -110, -150, -132); body.quadraticCurveTo(-60, -140, -24, -110);
  body.lineTo(-10, -40); body.quadraticCurveTo(-60, 30, -120, 110); body.quadraticCurveTo(-240, 210, -392, 240);
  body.quadraticCurveTo(-410, 110, -420, -6); body.closePath();
  const index = new Path2D();
  index.moveTo(-170, -132); index.quadraticCurveTo(-80, -164, 10, -128); index.lineTo(12, -70);
  index.quadraticCurveTo(-70, -80, -150, -78); index.closePath();
  const middle = new Path2D();
  middle.moveTo(-150, -82); middle.quadraticCurveTo(-70, -92, 10, -70); middle.lineTo(12, -22);
  middle.quadraticCurveTo(-60, -30, -130, -28); middle.closePath();
  const thumb = new Path2D();
  thumb.moveTo(-250, 120); thumb.quadraticCurveTo(-150, -2, -20, -18); thumb.quadraticCurveTo(40, -24, 78, -4);
  thumb.quadraticCurveTo(112, 16, 100, 46); thumb.quadraticCurveTo(84, 74, 40, 70);
  thumb.quadraticCurveTo(-60, 78, -150, 170); thumb.closePath();
  const nail = new Path2D();
  nail.moveTo(34, -6); nail.quadraticCurveTo(70, -14, 92, 6); nail.quadraticCurveTo(102, 30, 86, 50);
  nail.quadraticCurveTo(58, 58, 34, 50); nail.quadraticCurveTo(26, 22, 34, -6); nail.closePath();
  return { sleeve, cuff, body, index, middle, thumb, nail };
}

/**
 * Butch's hand holding a paper at (x, y) (the paper's left edge, middle),
 * turned by `angle`, `s` its size. part 'back' paints the sleeve, the hand
 * and the fingers behind the paper; 'front' paints the thumb over it.
 * `lamp` is the light in stage px; `light` 0..1.
 */
export function drawPinchHand(c, x, y, s, { angle = 0, part = 'back', lamp = { x: x + 600, y: y - 400 }, light = 1 } = {}) {
  const P = handPaths();
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const lx = ((lamp.x - x) * cos - (lamp.y - y) * sin) / s;
  const ly = ((lamp.x - x) * sin + (lamp.y - y) * cos) / s;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(s, s);
  const u = (px) => px / s;
  const edge = { w: u(2.2), alpha: 0.6, bleed: false, jitter: 0.4, color: '#2a1810' };
  // outlines follow the shapes: a dark ink edge, and the lamp's warm rim on the side facing it
  const dl = Math.hypot(lx + 160, ly - 40) || 1;
  const dx = (lx + 160) / dl;
  const dy = (ly - 40) / dl;
  const rimGrad = c.createLinearGradient(-160 - dx * 380, 40 - dy * 380, -160 + dx * 380, 40 + dy * 380);
  rimGrad.addColorStop(0, 'rgba(255, 207, 154, 0)');
  rimGrad.addColorStop(0.55, 'rgba(255, 207, 154, 0)');
  rimGrad.addColorStop(1, `rgba(255, 207, 154, ${0.9 * light})`);
  const outline = (path, alpha) => {
    c.save();
    c.lineJoin = 'round';
    c.lineWidth = u(2.2); c.strokeStyle = `rgba(36, 20, 12, ${alpha * 0.8})`; c.stroke(path);
    c.globalAlpha = alpha;
    c.lineWidth = u(2.8); c.strokeStyle = rimGrad; c.stroke(path);
    c.restore();
  };
  if (part === 'back') {
    // the sleeve of his coat and its cuff, the brass button
    c.fillStyle = vgrad(c, -40, 330, [[0, SLEEVE], [1, '#111d22']]);
    c.fill(P.sleeve);
    litInside(c, P.sleeve, lx, ly, 900, 0.16 * light);
    c.fillStyle = CUFF;
    c.fill(P.cuff);
    litInside(c, P.cuff, lx, ly, 800, 0.2 * light);
    outline(P.cuff, 0.45);
    c.fillStyle = brassFill(c, -446, 40, 26, 26);
    c.beginPath(); c.arc(-430, 56, 12, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255, 240, 200, 0.7)';
    c.beginPath(); c.arc(-434, 52, 3.4, 0, TAU); c.fill();
    // the hand, its fingers going behind the paper
    [P.middle, P.index].forEach((path, i) => {
      c.fillStyle = i ? SKIN : '#9a7458';
      c.fill(path);
      c.save(); c.clip(path);
      c.fillStyle = 'rgba(60, 30, 20, 0.35)';
      c.fillRect(-40, -170, 60, 160);
      c.restore();
      litInside(c, path, lx, ly, 700, 0.3 * light);
      outline(path, 0.5);
    });
    c.fillStyle = vgrad(c, -140, 240, [[0, SKIN], [0.6, '#94705a'], [1, SKIN_SHADE]]);
    c.fill(P.body);
    litInside(c, P.body, lx, ly, 820, 0.34 * light);
    // knuckles, a tendon, the shadow where the thumb will cross
    c.save(); c.clip(P.body);
    c.fillStyle = 'rgba(70, 36, 24, 0.3)';
    c.beginPath(); c.ellipse(-150, 90, 150, 70, -0.5, 0, TAU); c.fill();
    c.restore();
    ink(c, [[-150, -132], [-170, -112]], { ...edge, w: u(1.6), alpha: 0.4 });
    ink(c, [[-300, -40], [-200, -60], [-120, -70]], { ...edge, w: u(1.4), alpha: 0.22 });
    outline(P.body, 0.55);
  } else {
    // the thumb over the paper, its nail catching the lamp
    c.save();
    c.shadowColor = 'rgba(20, 10, 4, 0.45)';
    c.shadowBlur = u(26);
    c.shadowOffsetX = u(10);
    c.shadowOffsetY = u(14);
    c.fillStyle = SKIN;
    c.fill(P.thumb);
    c.restore();
    c.fillStyle = vgrad(c, -20, 170, [[0, '#c49a78'], [0.5, SKIN], [1, '#7c5644']]);
    c.fill(P.thumb);
    litInside(c, P.thumb, lx, ly, 700, 0.42 * light);
    c.fillStyle = '#d8b39a';
    c.fill(P.nail);
    litInside(c, P.nail, lx, ly, 420, 0.4 * light, '255, 214, 170');
    c.fillStyle = 'rgba(255, 246, 230, 0.5)';
    c.beginPath(); c.ellipse(70, 6, 14, 5, -0.2, 0, TAU); c.fill();
    // the knuckle's creases
    ink(c, [[-70, -2], [-62, 20], [-70, 44]], { ...edge, w: u(1.4), alpha: 0.35 });
    ink(c, [[-52, -6], [-46, 18]], { ...edge, w: u(1.2), alpha: 0.28 });
    c.lineWidth = u(1.3); c.strokeStyle = 'rgba(80, 46, 30, 0.5)'; c.stroke(P.nail);
    outline(P.thumb, 0.75);
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// glass

/** Rain beads and two sheen bands on a pane (rect in stage units), cached by the caller. */
export function glassBeads(c, glass, { seed = 9701, count = 360, sheen = 0.04 } = {}) {
  c.save();
  roundRectPath(c, glass.x, glass.y, glass.w, glass.h, glass.r ?? 16);
  c.clip();
  [[0.1, 0.2, sheen], [0.32, 0.37, sheen * 0.6], [0.66, 0.74, sheen * 0.6]].forEach(([a, b, alpha]) => {
    c.fillStyle = `rgba(200, 220, 240, ${alpha})`;
    c.beginPath(); c.moveTo(glass.x + glass.w * a, glass.y); c.lineTo(glass.x + glass.w * b, glass.y);
    c.lineTo(glass.x + glass.w * (b - 0.1), glass.y + glass.h); c.lineTo(glass.x + glass.w * (a - 0.1), glass.y + glass.h); c.closePath(); c.fill();
  });
  const random = rng(seed);
  for (let i = 0; i < count; i += 1) {
    const x = glass.x + random() * glass.w;
    const y = glass.y + random() * glass.h;
    const r = 0.9 + random() * random() * 4;
    c.fillStyle = 'rgba(10, 16, 24, 0.28)'; c.beginPath(); c.ellipse(x, y + r * 0.2, r, r * 1.15, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(214, 226, 236, 0.14)'; c.beginPath(); c.ellipse(x, y, r * 0.85, r * 0.95, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(240, 244, 248, 0.5)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, Math.max(0.5, r * 0.3), 0, TAU); c.fill();
    // a few have run: a short trail below them
    if (random() > 0.93) {
      c.strokeStyle = 'rgba(214, 226, 236, 0.12)'; c.lineWidth = r * 0.6;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + 20 + random() * 50); c.stroke();
    }
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// Chapter 2: the rain city (src/chapters/borrowedLight: brick fronts with
// arched windows, a teal night, amber light borrowed from the train)

/** One arched window, lit (warm) or dark (the night's teal in the glass). */
function archWindow(c, x, y, w, h, lit, seed, light = 1) {
  const r = w / 2;
  c.save();
  const path = new Path2D();
  path.moveTo(x, y + h); path.lineTo(x, y + r); path.arc(x + r, y + r, r, Math.PI, 0); path.lineTo(x + w, y + h); path.closePath();
  if (lit) {
    c.fillStyle = vgrad(c, y, y + h, [[0, `rgba(250, 196, 120, ${light})`], [1, `rgba(200, 120, 60, ${light})`]]);
  } else {
    c.fillStyle = vgrad(c, y, y + h, [[0, '#1c2a33'], [1, '#0e161c']]);
  }
  c.fill(path);
  if (!lit) {
    c.save(); c.clip(path);
    c.fillStyle = 'rgba(150, 190, 200, 0.08)';
    c.beginPath(); c.moveTo(x, y + h * 0.7); c.lineTo(x + w, y + h * 0.2); c.lineTo(x + w, y + h * 0.45); c.lineTo(x, y + h * 0.95); c.closePath(); c.fill();
    c.restore();
  }
  // the mullions
  c.strokeStyle = lit ? 'rgba(60, 30, 14, 0.7)' : 'rgba(5, 8, 12, 0.8)';
  c.lineWidth = Math.max(1.2, w * 0.05);
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + r, y + h); c.moveTo(x, y + r + h * 0.18); c.lineTo(x + w, y + r + h * 0.18); c.stroke();
  // the sill
  c.fillStyle = 'rgba(160, 130, 110, 0.35)';
  c.fillRect(x - 3, y + h, w + 6, Math.max(2, h * 0.05));
  ink(c, [[x, y + h], [x, y + r], ...Array.from({ length: 7 }, (_, i) => [x + r - Math.cos((Math.PI * i) / 6) * r, y + r - Math.sin((Math.PI * i) / 6) * r]), [x + w, y + r], [x + w, y + h]], { w: 1.3, alpha: 0.35, bleed: false, jitter: 0.3, seed });
  c.restore();
  if (lit) glow(c, x + r, y + h * 0.55, w * 1.5, 'rgba(255, 180, 100, 0.9)', 0.18 * light);
}

/**
 * A brick front from x0 to x1, its cornice at `top`: bays of arched windows,
 * pilasters, mortar lines; `lit` the share of windows with a lamp behind them.
 * `win` sets the window size; rows run down to `bottom`.
 */
export function paintBrickFacade(c, x0, x1, top, bottom, { seed = 9801, lit = 0.3, bay = 100, win = [44, 74], rowGap = 125, tone = ['#3b2d27', '#211916'], cornice = true, edge = true } = {}) {
  const random = rng(seed);
  c.fillStyle = vgrad(c, top, bottom, [[0, tone[0]], [1, tone[1]]]);
  c.fillRect(x0, top, x1 - x0, bottom - top);
  // mortar: courses and a few joints
  c.save();
  c.beginPath(); c.rect(x0, top, x1 - x0, bottom - top); c.clip();
  c.strokeStyle = 'rgba(0, 0, 0, 0.18)'; c.lineWidth = 1;
  for (let y = top + 22; y < bottom; y += 9) {
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
  }
  c.strokeStyle = 'rgba(255, 220, 190, 0.035)';
  for (let y = top + 26; y < bottom; y += 18) {
    for (let x = x0 + random() * 30; x < x1; x += 24 + random() * 30) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 9); c.stroke(); }
  }
  // pilasters between the bays
  for (let x = x0 + bay * 0.5 - 7; x < x1; x += bay * 2) {
    c.fillStyle = 'rgba(0, 0, 0, 0.18)'; c.fillRect(x, top + 16, 14, bottom - top);
    c.fillStyle = 'rgba(255, 220, 190, 0.04)'; c.fillRect(x, top + 16, 3, bottom - top);
  }
  // the windows, row by row
  let row = 0;
  for (let y = top + 46; y + win[1] < bottom + win[1] * 0.6; y += rowGap) {
    for (let x = x0 + bay * 0.5 + (bay - win[0]) / 2 - bay / 2; x + win[0] < x1; x += bay) {
      archWindow(c, x, y, win[0], win[1], random() < lit, seed + row * 50 + Math.round(x));
    }
    row += 1;
  }
  c.restore();
  if (cornice) {
    // the cornice: a stone ledge, its ivory ink edge where the roof begins
    c.fillStyle = '#4a3b33'; c.fillRect(x0 - 6, top, x1 - x0 + 12, 12);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x0 - 6, top + 12, x1 - x0 + 12, 5);
    if (edge) ink(c, [[x0 - 6, top], [x1 + 6, top]], { w: 2.4, alpha: 0.8, jitter: 0.5, seed: seed + 1 });
  }
  ink(c, [[x0, top], [x0, bottom]], { w: 1.4, alpha: 0.35, bleed: false, jitter: 0.4, seed: seed + 2 });
  ink(c, [[x1, top], [x1, bottom]], { w: 1.4, alpha: 0.35, bleed: false, jitter: 0.4, seed: seed + 3 });
}

/** The far city in the rain: towers and blocks in teal haze, lit windows, from `horizon` down. */
export function paintCityFar(c, w, h, { horizon = 520, seed = 9811, layers = 3, haze = '#16303a', x0 = -20 } = {}) {
  const random = rng(seed);
  const tones = ['#18303a', '#122630', '#0d1c24', '#0a151b'];
  for (let layer = 0; layer < layers; layer += 1) {
    const base = horizon + layer * 40;
    c.fillStyle = tones[layer];
    let x = x0;
    while (x < w + 20) {
      const bw = 40 + random() * 110;
      const bh = (60 + random() * 260) * (1 - layer * 0.18);
      c.fillRect(x, base - bh, bw, h - base + bh + 20);
      if (random() > 0.75) c.fillRect(x + bw * 0.4, base - bh - 30 - random() * 40, 4, 40 + random() * 30);
      if (random() > 0.6) { c.beginPath(); c.moveTo(x, base - bh); c.lineTo(x + bw / 2, base - bh - 18); c.lineTo(x + bw, base - bh); c.fill(); }
      for (let wy = base - bh + 12; wy < base + 60; wy += 14) {
        for (let wx = x + 6; wx < x + bw - 6; wx += 11) {
          if (random() > 0.86 - layer * 0.03) {
            c.fillStyle = random() > 0.25 ? `rgba(242, 184, 102, ${0.35 + layer * 0.15})` : `rgba(127, 208, 200, ${0.3 + layer * 0.12})`;
            c.fillRect(wx, wy, 4, 6);
            c.fillStyle = tones[layer];
          }
        }
      }
      x += bw + random() * 8;
    }
    // haze between the layers: the rain in the air
    c.fillStyle = vgrad(c, base - 300, base + 80, [[0, 'rgba(22, 48, 58, 0)'], [1, `rgba(22, 48, 58, ${0.42 - layer * 0.1})`]]);
    c.fillRect(x0, base - 300, w - x0 + 20, 380);
  }
  void haze;
}

/**
 * A sign box with its words: `on` 0..1 lights it (a flicker as it comes on
 * is the caller's). `tone` 'amber' or 'teal' or 'rose'.
 */
export function drawLitSign(c, x, y, w, h, text, { on = 1, tone = 'amber', font = null, frame = true } = {}) {
  const colors = { amber: ['255, 196, 110', '#ffc97a'], teal: ['127, 208, 200', '#9fe4dc'], rose: ['230, 150, 160', '#f0b4bc'] }[tone] ?? ['255, 196, 110', '#ffc97a'];
  const k = clamp(on, 0, 1);
  c.save();
  c.fillStyle = '#0b0d10';
  roundRectPath(c, x, y, w, h, Math.min(6, h * 0.12)); c.fill();
  if (frame) {
    c.strokeStyle = 'rgba(176, 138, 74, 0.6)'; c.lineWidth = Math.max(1.4, h * 0.04);
    roundRectPath(c, x, y, w, h, Math.min(6, h * 0.12)); c.stroke();
  }
  c.font = font ?? `700 ${h * 0.5}px "Space Mono", monospace`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  // the unlit letters stay faintly visible, as bulbs do
  c.fillStyle = `rgba(${colors[0]}, ${0.12 + 0.88 * k})`;
  if (k > 0.05) { c.shadowColor = `rgba(${colors[0]}, ${0.9 * k})`; c.shadowBlur = h * 0.35 * k; }
  c.fillText(text, x + w / 2, y + h * 0.54, w * 0.9);
  c.restore();
  if (k > 0.02) glow(c, x + w / 2, y + h / 2, Math.max(w, h) * 0.8, `rgba(${colors[0]}, 0.9)`, 0.22 * k);
}

/** A platform clock hung from a bracket at (x, y) (its centre), `r` radius, showing hh:mm. */
export function drawStationClock(c, x, y, r, { hours = 2, minutes = 20, hang = 40, light = 0.5, ink: inkColor = '#1d1410' } = {}) {
  c.strokeStyle = '#0b0d10'; c.lineWidth = Math.max(2, r * 0.08);
  if (hang > 0) { c.beginPath(); c.moveTo(x, y - r - hang); c.lineTo(x, y - r); c.stroke(); }
  c.fillStyle = '#121418';
  c.beginPath(); c.arc(x, y, r * 1.12, 0, TAU); c.fill();
  c.fillStyle = vgrad(c, y - r, y + r, [[0, '#f2ead6'], [1, '#d6ccb2']]);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(40, 30, 20, 0.6)'; c.lineWidth = Math.max(1, r * 0.04);
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU;
    c.beginPath(); c.moveTo(x + Math.sin(a) * r * 0.8, y - Math.cos(a) * r * 0.8); c.lineTo(x + Math.sin(a) * r * 0.92, y - Math.cos(a) * r * 0.92); c.stroke();
  }
  const ha = ((hours % 12) + minutes / 60) / 12 * TAU;
  const ma = (minutes / 60) * TAU;
  ink(c, [[x, y], [x + Math.sin(ha) * r * 0.52, y - Math.cos(ha) * r * 0.52]], { w: Math.max(2, r * 0.11), color: inkColor, bleed: false, jitter: 0.05, alpha: 0.95, seed: 9821 });
  ink(c, [[x, y], [x + Math.sin(ma) * r * 0.78, y - Math.cos(ma) * r * 0.78]], { w: Math.max(1.6, r * 0.07), color: inkColor, bleed: false, jitter: 0.05, alpha: 0.95, seed: 9822 });
  c.fillStyle = inkColor; c.beginPath(); c.arc(x, y, Math.max(1.6, r * 0.07), 0, TAU); c.fill();
  inkEllipse(c, x, y, r * 1.12, r * 1.12, { w: Math.max(1.2, r * 0.05), alpha: 0.55, bleed: false, jitter: 0.1, seed: 9823 });
  if (light > 0) glow(c, x, y, r * 2.4, 'rgba(255, 230, 190, 0.9)', 0.12 * light);
}

/** A platform lamp: a post from `ground` up to its bracket lamp at (x, ground - height), its cone to the ground. */
export function drawLampPost(c, x, ground, height, { on = 1, cone = true, side = 1, coneAlpha = 0.2 } = {}) {
  c.fillStyle = '#0a0c0f';
  c.fillRect(x - 3, ground - height, 6, height);
  c.fillRect(x - 8, ground - 8, 16, 8);
  c.fillRect(x, ground - height, side * 26, 4);
  const lx = x + side * 26;
  const ly = ground - height + 10;
  c.fillStyle = '#14161a';
  c.beginPath(); c.moveTo(lx - 10, ly - 2); c.lineTo(lx + 10, ly - 2); c.lineTo(lx + 6, ly + 6); c.lineTo(lx - 6, ly + 6); c.closePath(); c.fill();
  c.fillStyle = `rgba(255, 226, 160, ${0.4 + 0.6 * on})`;
  c.fillRect(lx - 6, ly + 4, 12, 7);
  if (on > 0) {
    if (cone) lightCone(c, lx, ly + 10, height * 0.38, height - 18, coneAlpha * on);
    glow(c, lx, ly + 8, 70, 'rgba(255, 214, 140, 0.95)', 0.45 * on);
  }
  ink(c, [[x - 3, ground], [x - 3, ground - height], [lx + 10, ground - height]], { w: 1.2, alpha: 0.35, bleed: false, jitter: 0.2, seed: 9831 + Math.round(x) });
}

/** A rooftop water tank: legs on `roof` at x, a wooden tank with its cone roof, `w` wide. */
export function drawWaterTower(c, x, roof, w, { seed = 9841, rim = 1 } = {}) {
  const legH = w * 0.55;
  const tankH = w * 0.8;
  c.strokeStyle = '#0a0d10'; c.lineWidth = Math.max(2, w * 0.05);
  c.beginPath();
  c.moveTo(x + w * 0.1, roof); c.lineTo(x + w * 0.18, roof - legH);
  c.moveTo(x + w * 0.9, roof); c.lineTo(x + w * 0.82, roof - legH);
  c.moveTo(x + w * 0.12, roof - legH * 0.4); c.lineTo(x + w * 0.88, roof - legH * 0.8);
  c.moveTo(x + w * 0.12, roof - legH * 0.8); c.lineTo(x + w * 0.88, roof - legH * 0.4);
  c.stroke();
  wood(c, x + w * 0.08, roof - legH - tankH, w * 0.84, tankH, { base: '#2a2019', seed, vertical: true, grain: 'rgba(0,0,0,0.35)' });
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + w * 0.08, roof - legH - tankH, w * 0.84, tankH);
  c.strokeStyle = '#121010'; c.lineWidth = Math.max(1.4, w * 0.025);
  [0.25, 0.6, 0.9].forEach((f) => { c.beginPath(); c.moveTo(x + w * 0.08, roof - legH - tankH * f); c.lineTo(x + w * 0.92, roof - legH - tankH * f); c.stroke(); });
  c.fillStyle = '#16120f';
  c.beginPath(); c.moveTo(x, roof - legH - tankH); c.lineTo(x + w / 2, roof - legH - tankH - w * 0.32); c.lineTo(x + w, roof - legH - tankH); c.closePath(); c.fill();
  ink(c, [[x, roof - legH - tankH], [x + w / 2, roof - legH - tankH - w * 0.32], [x + w, roof - legH - tankH]], { w: 1.6, alpha: 0.4 * rim, bleed: false, jitter: 0.3, seed: seed + 1 });
  ink(c, [[x + w * 0.08, roof - legH], [x + w * 0.08, roof - legH - tankH]], { w: 1.4, alpha: 0.3 * rim, bleed: false, jitter: 0.3, seed: seed + 2 });
}

// ---------------------------------------------------------------------------
// the night service, close (chapter2To3's door): Chapter 1's night carriage
// (art/train-night.png) in vector at full size — cream over vermilion, a grey
// roof, oxblood doors with their own windows, warm windows.

export const CARRIAGE = Object.freeze({ cream: ['#d9d0bb', '#b9b09c'], red: ['#a44a2c', '#6e2a1a'], door: '#5a2236', roof: '#2e3138' });

/**
 * The carriage side from x0 to x1 between `top` (the roof line) and `bottom`
 * (the floor line). `windows` [{ x, w }], `doors` [{ x, w }] in stage units.
 * Window and door glass are cut clear (destination-out) when `cutGlass`, so
 * the caller paints the lit inside behind the layer.
 */
export function paintCarriageSide(c, x0, x1, top, bottom, { windows = [], doors = [], seed = 9851, cutGlass = true, night = 0.35 } = {}) {
  const h = bottom - top;
  const belt = top + h * 0.56;
  // roof and gutter
  c.fillStyle = vgrad(c, top - 34, top + 6, [[0, '#3c3f47'], [1, CARRIAGE.roof]]);
  roundRectPath(c, x0, top - 34, x1 - x0, 44, 18); c.fill();
  c.fillStyle = '#1a1c21'; c.fillRect(x0, top + 4, x1 - x0, 8);
  // cream upper, vermilion lower, the brass beading between
  c.fillStyle = vgrad(c, top + 12, belt, [[0, CARRIAGE.cream[0]], [1, CARRIAGE.cream[1]]]);
  c.fillRect(x0, top + 12, x1 - x0, belt - top - 12);
  c.fillStyle = vgrad(c, belt, bottom, [[0, CARRIAGE.red[0]], [1, CARRIAGE.red[1]]]);
  c.fillRect(x0, belt, x1 - x0, bottom - belt);
  c.fillStyle = brassFill(c, x0, belt - 4, x1 - x0, 8);
  c.fillRect(x0, belt - 3, x1 - x0, 6);
  // panel seams and rivets
  for (let x = x0 + 30; x < x1; x += 160) {
    c.fillStyle = 'rgba(0, 0, 0, 0.12)'; c.fillRect(x, top + 12, 2, h - 12);
    for (let y = belt + 20; y < bottom - 10; y += 34) rivet(c, x + 10, y, 2.4);
  }
  // the windows: frames, glass cut out
  windows.forEach(({ x, w }, i) => {
    const wy = top + h * 0.12;
    const wh = h * 0.36;
    c.fillStyle = '#2b2a2c';
    roundRectPath(c, x - 8, wy - 8, w + 16, wh + 16, 10); c.fill();
    if (cutGlass) {
      c.save(); c.globalCompositeOperation = 'destination-out';
      roundRectPath(c, x, wy, w, wh, 6); c.fill();
      c.restore();
    }
    ink(c, [[x - 8, wy - 8], [x + w + 8, wy - 8], [x + w + 8, wy + wh + 8], [x - 8, wy + wh + 8]], { w: 1.6, closed: true, alpha: 0.5, bleed: false, jitter: 0.3, seed: seed + 10 + i });
  });
  // the doors: oxblood, a window, grab rails
  doors.forEach(({ x, w }, i) => {
    c.fillStyle = vgrad(c, top + 14, bottom, [[0, '#6a2a40'], [1, '#3e1424']]);
    c.fillRect(x, top + 14, w, bottom - top - 14);
    c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(x + w / 2 - 1.5, top + 14, 3, bottom - top - 14);
    const gy = top + h * 0.12;
    const gh = h * 0.34;
    [[x + w * 0.1, w * 0.34], [x + w * 0.56, w * 0.34]].forEach(([gx, gw]) => {
      c.fillStyle = '#2a0e18'; roundRectPath(c, gx - 4, gy - 4, gw + 8, gh + 8, 6); c.fill();
      if (cutGlass) { c.save(); c.globalCompositeOperation = 'destination-out'; roundRectPath(c, gx, gy, gw, gh, 4); c.fill(); c.restore(); }
    });
    [x - 14, x + w + 6].forEach((rx) => { c.fillStyle = brassFill(c, rx, top + h * 0.3, 8, h * 0.5, true); roundRectPath(c, rx, top + h * 0.3, 8, h * 0.5, 4); c.fill(); });
    ink(c, [[x, bottom], [x, top + 14], [x + w, top + 14], [x + w, bottom]], { w: 2, alpha: 0.6, bleed: false, jitter: 0.3, seed: seed + 30 + i });
  });
  // the step and underframe
  c.fillStyle = '#121316'; c.fillRect(x0, bottom, x1 - x0, 26);
  c.fillStyle = '#0a0b0d'; c.fillRect(x0 + 40, bottom + 26, x1 - x0 - 80, 40);
  ink(c, [[x0, top + 12], [x1, top + 12]], { w: 2, alpha: 0.6, jitter: 0.4, seed: seed + 1 });
  ink(c, [[x0, bottom], [x1, bottom]], { w: 2.2, alpha: 0.6, jitter: 0.4, seed: seed + 2 });
  // the night over it
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = `rgba(14, 22, 40, ${night})`;
  c.fillRect(x0, top - 40, x1 - x0, bottom - top + 110);
  c.restore();
}

export { inkRect };
