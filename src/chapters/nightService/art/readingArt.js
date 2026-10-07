// The reading view's paper (round 6 · item 14): a large, plain copy of a
// piece of evidence held up to the eye, in the shape of the thing itself —
// a ticket stub with its perforation, a reservation slip with brass pins, a
// luggage tag with its eyelet, a museum label in brass, or an archive card.
// Painted once per opening into a canvas (no Phaser here); the words are
// live Phaser text on top (readingView.js), so they stay crisp and follow
// the TEXT SIZE setting.

import { PAL, brassFill, ink, inkEllipse, paperGrain, rivet, rng, roundRectPath } from './ink.js';

/** Paper tones: today's paper, and the same paper in 1978 light. */
export const READING_PAPER = Object.freeze({ present: '#e7ddc4', past: '#f1e0b8' });
/** Ink colours a reading line may name. */
export const READING_INK = Object.freeze({ ink: '#2a1d14', red: '#8a2a1e', teal: '#23434a', faded: '#6b5640', brass: '#2a1d14' });

/** Insets (px at 1920×1080) where the words go, by shape: [left, top, right, bottom]. */
export function readingInsets(shape, s = 1) {
  const k = Math.max(0.8, s);
  switch (shape) {
    case 'ticket': return [56 * k, 30 * k, 74 * k, 44 * k];
    case 'tag': return [150 * k, 44 * k, 64 * k, 48 * k];
    case 'plate': return [70 * k, 34 * k, 70 * k, 34 * k];
    case 'slip': return [58 * k, 34 * k, 58 * k, 46 * k];
    case 'torn': return [56 * k, 50 * k, 80 * k, 50 * k];
    default: return [64 * k, 44 * k, 64 * k, 48 * k];
  }
}

/** A torn edge from (x0, y0) to (x1, y1), as path points (deterministic). */
function tornEdge(c, x0, y0, x1, y1, { seed = 3, amp = 5, step = 10 } = {}) {
  const random = rng(seed);
  const n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  const len = Math.hypot(nx, ny) || 1;
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    const k = (random() - 0.5) * 2 * amp;
    c.lineTo(x0 + (x1 - x0) * t + (nx / len) * k, y0 + (y1 - y0) * t + (ny / len) * k);
  }
}

function waxSeal(c, x, y, r, broken) {
  c.save();
  c.fillStyle = '#7a1f16';
  c.shadowColor = 'rgba(0,0,0,0.4)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 4;
  if (!broken) {
    c.beginPath();
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      const rr = r * (0.9 + (i % 2) * 0.12);
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(255,190,160,0.35)';
    c.lineWidth = 3;
    c.beginPath(); c.arc(x, y, r * 0.64, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#f0c7b0';
    c.font = `700 ${Math.round(r * 0.36)}px "Space Mono", monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('FILED', x, y + 1);
  } else {
    [[-0.55, 0.15, 0.5], [0.5, -0.2, -0.4], [0.05, 0.6, 0.2]].forEach(([dx, dy, rot], i) => {
      c.save();
      c.translate(x + dx * r, y + dy * r + i * 4);
      c.rotate(rot);
      c.beginPath(); c.moveTo(0, -r * 0.42); c.lineTo(r * 0.46, r * 0.1); c.lineTo(-r * 0.22, r * 0.4); c.closePath();
      c.fill();
      c.restore();
    });
  }
  c.restore();
}

function brassPin(c, x, y, r = 7) {
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.45)';
  c.shadowBlur = 4;
  c.shadowOffsetY = 2;
  c.fillStyle = brassFill(c, x - r, y - r, r * 2, r * 2);
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.restore();
  c.fillStyle = 'rgba(255, 245, 210, 0.55)';
  c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); c.fill();
}

/**
 * Paint the reading paper into `c` (w×h, with `pad` px of margin all round
 * for the shadow). `spec`: { shape, era, header?, seal?, hole?, aside? }.
 */
export function paintReadingPaper(c, w, h, spec = {}, { pad = 40, paper = null, s = 1 } = {}) {
  const shape = spec.shape ?? 'paper';
  const past = spec.era === 'past';
  const tone = READING_PAPER[past ? 'past' : 'present'];
  const x = pad;
  const y = pad;
  c.save();
  // the torn page pinned behind a slip (Nika's ledger page in the exhibit)
  if (spec.aside) {
    c.save();
    c.translate(x + w * 0.68, y - 14);
    c.rotate(0.12);
    const aw = w * 0.36;
    const ah = h * 0.78;
    c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    c.fillStyle = '#d8ccb0';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(aw, 0);
    tornEdge(c, aw, 0, aw * 0.86, ah, { seed: 41, amp: 7 });
    c.lineTo(0, ah); c.closePath(); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(42,29,20,0.25)'; c.lineWidth = 1.2;
    for (let yy = 40; yy < ah - 10; yy += 22) { c.beginPath(); c.moveTo(14, yy); c.lineTo(aw * 0.78, yy); c.stroke(); }
    c.restore();
  }
  // the body, in the shape of the thing
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.55)';
  c.shadowBlur = 34;
  c.shadowOffsetY = 16;
  c.beginPath();
  if (shape === 'tag') {
    const notch = Math.min(110, h * 0.5);
    c.moveTo(x + notch, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h); c.lineTo(x + notch, y + h); c.lineTo(x, y + h / 2); c.closePath();
  } else if (shape === 'plate') {
    roundRectPath(c, x, y, w, h, 14);
  } else if (shape === 'torn') {
    // a ledger page torn down its right side
    c.moveTo(x, y); c.lineTo(x + w, y);
    tornEdge(c, x + w, y, x + w - 26, y + h, { seed: 43, amp: 9, step: 12 });
    c.lineTo(x, y + h); c.closePath();
  } else if (shape === 'ticket') {
    // the torn, perforated right edge
    c.moveTo(x, y); c.lineTo(x + w - 10, y);
    const r = 6;
    for (let yy = y + 14; yy < y + h - 8; yy += 22) { c.lineTo(x + w - 10, yy - r); c.arc(x + w - 10, yy, r, -Math.PI / 2, Math.PI / 2, true); }
    c.lineTo(x + w - 10, y + h); c.lineTo(x, y + h); c.closePath();
  } else {
    c.rect(x, y, w, h);
  }
  if (shape === 'plate') {
    c.fillStyle = brassFill(c, x, y, w, h, true);
  } else c.fillStyle = tone;
  c.fill();
  c.restore();
  // grain, warmth and wear inside the shape
  c.save();
  c.clip();
  if (shape !== 'plate') {
    if (paper) {
      c.save(); c.translate(x, y); paperGrain(c, w, h, paper, 0.32); c.restore();
    }
    const g = c.createRadialGradient(x + w * 0.3, y + h * 0.2, 10, x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(255, 255, 250, 0.28)');
    g.addColorStop(1, past ? 'rgba(150, 100, 40, 0.22)' : 'rgba(90, 70, 40, 0.18)');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
  } else {
    c.fillStyle = 'rgba(255, 240, 200, 0.18)';
    c.fillRect(x, y, w, h * 0.12);
    c.fillStyle = 'rgba(40, 25, 10, 0.18)';
    c.fillRect(x, y + h * 0.86, w, h * 0.14);
  }
  // ruled lines (a card, a slip)
  if (shape === 'paper' || shape === 'slip' || shape === 'torn') {
    c.strokeStyle = 'rgba(107, 42, 34, 0.16)';
    c.lineWidth = 1.4;
    const top = y + (spec.header ? 96 * s : 70 * s);
    for (let yy = top; yy < y + h - 24; yy += 46 * s) { c.beginPath(); c.moveTo(x + 30, yy); c.lineTo(x + w - 30, yy); c.stroke(); }
  }
  // a ticket's coloured band (the line it is for)
  if (spec.header?.band) {
    c.fillStyle = spec.header.band;
    c.fillRect(x, y, w, Math.round(64 * s));
  }
  c.restore();
  // outline, holes, pins, seals
  if (shape === 'tag') {
    const notch = Math.min(110, h * 0.5);
    ink(c, [[x + notch, y], [x + w, y], [x + w, y + h], [x + notch, y + h], [x, y + h / 2]], { w: 2, closed: true, color: '#5a4430', alpha: 0.55, bleed: false });
    // the eyelet: a punched hole with a brass ring, and the string
    const ex = x + notch * 0.62;
    const ey = y + h / 2;
    c.strokeStyle = 'rgba(216, 200, 160, 0.9)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(ex, ey); c.quadraticCurveTo(ex - 60, ey - 40, x - pad + 6, y - pad + 18); c.stroke();
    c.fillStyle = 'rgba(12, 8, 5, 0.92)';
    c.beginPath(); c.arc(ex, ey, 15, 0, Math.PI * 2); c.fill();
    c.strokeStyle = PAL.brass; c.lineWidth = 5; c.beginPath(); c.arc(ex, ey, 19, 0, Math.PI * 2); c.stroke();
  } else if (shape === 'plate') {
    c.save();
    roundRectPath(c, x + 1, y + 1, w - 2, h - 2, 14);
    c.lineWidth = 2; c.strokeStyle = 'rgba(40, 25, 10, 0.6)'; c.stroke();
    roundRectPath(c, x + 9, y + 9, w - 18, h - 18, 8);
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(255, 240, 200, 0.45)'; c.stroke();
    c.restore();
    [[x + 24, y + h / 2], [x + w - 24, y + h / 2]].forEach(([sx, sy]) => rivet(c, sx, sy, 6));
  } else {
    c.save();
    c.strokeStyle = 'rgba(90, 68, 48, 0.45)';
    c.lineWidth = 1.6;
    if (shape === 'ticket') {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + w - 10, y); c.moveTo(x, y + h); c.lineTo(x + w - 10, y + h); c.moveTo(x, y); c.lineTo(x, y + h); c.stroke();
    } else if (shape === 'torn') {
      c.beginPath(); c.moveTo(x + w, y); c.lineTo(x, y); c.lineTo(x, y + h); c.lineTo(x + w - 26, y + h); c.stroke();
    } else c.strokeRect(x, y, w, h);
    c.restore();
  }
  if (spec.hole) {
    // the conductor's punch: a clean round hole through the paper
    const [hx, hy] = shape === 'ticket' ? [x + w * 0.62, y + h * 0.3] : [x + w - 56, y + 56];
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(hx, hy, 17, 0, Math.PI * 2); c.fill();
    c.restore();
    inkEllipse(c, hx, hy, 18, 18, { w: 1.4, color: '#5a4430', alpha: 0.6, bleed: false });
  }
  if (shape === 'slip' || shape === 'ticket') brassPin(c, x + 16, y + 16, shape === 'ticket' ? 6 : 8);
  if (shape === 'slip') brassPin(c, x + w - 16, y + 16, 8);
  if (spec.seal) waxSeal(c, x + w * 0.8, y + h * 0.56, 54 * s, spec.seal === 'broken');
  c.restore();
}
