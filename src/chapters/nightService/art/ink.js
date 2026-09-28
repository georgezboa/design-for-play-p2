// Canvas-2D drawing kit for NIGHT SERVICE (spec §5).
//
// Every painted panel is drawn once into a canvas texture with these helpers:
// warm off-white ink linework with a slight hand jitter and round caps, muted
// fills, wood and brass, and the paper-tag + amber-glint language for things
// the player can act on. Nothing here imports Phaser, so act files that use it
// stay importable from node tests.

export const PAL = Object.freeze({
  ink: '#eadfc6',
  inkDim: 'rgba(234, 223, 198, 0.55)',
  navy: '#18233a',
  navyDeep: '#0d1424',
  teal: '#23434a',
  tealDeep: '#152a2f',
  amber: '#e0a24a',
  amberHot: '#ffcf7a',
  oxblood: '#6b2a22',
  oxbloodDeep: '#3e1813',
  ivory: '#d8ccb0',
  paper: '#e6dcc2',
  walnut: '#1c130d',
  walnutMid: '#2c1d13',
  walnutLight: '#4a3121',
  brass: '#b08a4a',
  brassLight: '#e3c27e',
  brassDark: '#5e4522',
  sepia: '#8a6a3a',
});

/** Deterministic PRNG (mulberry32) so a panel draws the same every time. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let inkSeed = 7;

/** Subdivide and jitter a polyline so it reads as hand-inked (±0.6 px). */
function wobble(points, { jitter = 0.6, step = 18, closed = false, random }) {
  const pts = closed ? [...points, points[0]] : points;
  const out = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k += 1) {
      const t = k / n;
      out.push([x0 + (x1 - x0) * t + (random() - 0.5) * 2 * jitter, y0 + (y1 - y0) * t + (random() - 0.5) * 2 * jitter]);
    }
  }
  const last = pts[pts.length - 1];
  out.push([last[0] + (random() - 0.5) * 2 * jitter, last[1] + (random() - 0.5) * 2 * jitter]);
  return out;
}

/** Ink a polyline: 2–3 px, warm off-white, round caps, slight jitter. */
export function ink(c, points, { w = 2.4, color = PAL.ink, alpha = 0.92, closed = false, jitter = 0.6, seed = null, fill = null, bleed = true } = {}) {
  const random = rng(seed ?? (inkSeed += 13));
  const pts = wobble(points, { jitter, closed, random });
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (closed) c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  c.globalAlpha = alpha;
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
  if (bleed) {
    c.globalAlpha = alpha * 0.22;
    c.lineWidth = w + 1.6;
    c.stroke();
  }
  c.restore();
}

export const inkLine = (c, x0, y0, x1, y1, opts) => ink(c, [[x0, y0], [x1, y1]], opts);

export function inkRect(c, x, y, w, h, opts = {}) {
  ink(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { ...opts, closed: true });
}

/** A hand-inked ellipse/circle. */
export function inkEllipse(c, cx, cy, rx, ry, opts = {}) {
  const n = Math.max(12, Math.round((rx + ry) / 3));
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  ink(c, pts, { ...opts, closed: true, jitter: opts.jitter ?? 0.45 });
}

export function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

export function vgrad(c, y0, y1, stops) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}

export function hgrad(c, x0, x1, stops) {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}

/** Soft radial light. */
export function glow(c, x, y, r, color = PAL.amber, alpha = 0.5, mode = 'lighter') {
  c.save();
  c.globalCompositeOperation = mode;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = alpha;
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}

/** A cone of lamplight falling from (x, y). */
export function lightCone(c, x, y, spread, length, alpha = 0.22, color = '255, 196, 110') {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(x, y, x, y + length);
  g.addColorStop(0, `rgba(${color}, ${alpha})`);
  g.addColorStop(1, `rgba(${color}, 0)`);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x - 10, y);
  c.lineTo(x + 10, y);
  c.lineTo(x + spread, y + length);
  c.lineTo(x - spread, y + length);
  c.closePath();
  c.fill();
  c.restore();
}

/** Wood: base fill plus long grain strokes, planks optional. */
export function wood(c, x, y, w, h, { base = PAL.walnutMid, grain = 'rgba(0,0,0,0.25)', light = 'rgba(255,220,170,0.05)', seed = 3, vertical = false, planks = 0 } = {}) {
  const random = rng(seed);
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.fillStyle = base;
  c.fillRect(x, y, w, h);
  const count = Math.round((vertical ? w : h) / 3.2);
  for (let i = 0; i < count; i += 1) {
    const t = random();
    c.strokeStyle = random() > 0.7 ? light : grain;
    c.lineWidth = 0.6 + random() * 1.4;
    c.beginPath();
    if (vertical) {
      const gx = x + t * w;
      c.moveTo(gx, y);
      for (let k = 1; k <= 8; k += 1) c.lineTo(gx + Math.sin(k * 1.3 + t * 9) * 2.2 * random(), y + (h * k) / 8);
    } else {
      const gy = y + t * h;
      c.moveTo(x, gy);
      for (let k = 1; k <= 10; k += 1) c.lineTo(x + (w * k) / 10, gy + Math.sin(k * 1.1 + t * 7) * 1.8 * random());
    }
    c.stroke();
  }
  if (planks > 0) {
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.lineWidth = 2;
    for (let i = 1; i < planks; i += 1) {
      c.beginPath();
      if (vertical) { c.moveTo(x + (w * i) / planks, y); c.lineTo(x + (w * i) / planks, y + h); }
      else { c.moveTo(x, y + (h * i) / planks); c.lineTo(x + w, y + (h * i) / planks); }
      c.stroke();
    }
  }
  c.restore();
}

export function brassFill(c, x, y, w, h, vertical = false) {
  const g = vertical
    ? c.createLinearGradient(x, 0, x + w, 0)
    : c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, PAL.brassLight);
  g.addColorStop(0.35, PAL.brass);
  g.addColorStop(0.7, '#8a6934');
  g.addColorStop(1, PAL.brassDark);
  return g;
}

export function rivet(c, x, y, r = 3) {
  c.save();
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, '#f6dfa3');
  g.addColorStop(0.5, PAL.brass);
  g.addColorStop(1, '#3d2c15');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/**
 * The game's one "you can act on this" mark: a paper tag on a string with a
 * tiny amber glint. `punched` shows a real hole through it.
 */
export function paperTag(c, x, y, { angle = -0.18, scale = 1, glint = true, punched = false, string = null, text = null, color = PAL.paper, seed = 11 } = {}) {
  if (string) ink(c, [string, [x, y]], { w: 1.2, alpha: 0.7, jitter: 0.3, bleed: false, seed });
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(scale, scale);
  const w = 26;
  const h = 15;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(6, -h / 2);
  c.lineTo(w, -h / 2);
  c.lineTo(w, h / 2);
  c.lineTo(6, h / 2);
  c.closePath();
  c.fillStyle = color;
  c.shadowColor = 'rgba(0,0,0,0.45)';
  c.shadowBlur = 4;
  c.shadowOffsetY = 1.5;
  c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(80, 60, 40, 0.6)';
  c.lineWidth = 0.8;
  c.stroke();
  // eyelet
  c.fillStyle = 'rgba(60, 40, 25, 0.9)';
  c.beginPath();
  c.arc(5.5, 0, 1.6, 0, Math.PI * 2);
  c.fill();
  // typed lines
  c.strokeStyle = 'rgba(70, 50, 35, 0.55)';
  c.lineWidth = 0.8;
  [-3, 0.5, 4].forEach((ly, i) => {
    c.beginPath();
    c.moveTo(10, ly);
    c.lineTo(10 + (i === 1 ? 9 : 13), ly);
    c.stroke();
  });
  if (text) {
    c.fillStyle = 'rgba(70, 40, 25, 0.9)';
    c.font = '700 6px "Space Mono", monospace';
    c.fillText(text, 9, 2);
  }
  if (punched) {
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(18, 0, 3.2, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(60,40,25,0.7)';
    c.beginPath();
    c.arc(18, 0, 3.4, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  if (glint) amberGlint(c, x + Math.cos(angle) * 24 * scale, y + Math.sin(angle) * 24 * scale - 7 * scale, 5 * scale);
}

/** A tiny four-point amber star. */
export function amberGlint(c, x, y, r = 5, alpha = 1) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = alpha;
  glow(c, x, y, r * 3.2, 'rgba(255, 190, 90, 0.9)', 0.55);
  c.fillStyle = PAL.amberHot;
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
  c.restore();
}

/** Multiply the ivory paper texture over a painting (spec: ~10%). */
export function paperGrain(c, w, h, paper, alpha = 0.16) {
  if (!paper) return;
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha = alpha;
  const pw = paper.width || 1254;
  const ph = paper.height || 1254;
  for (let y = 0; y < h; y += ph) for (let x = 0; x < w; x += pw) c.drawImage(paper, x, y);
  c.restore();
}

/**
 * The 1978 look (spec §5): a warm sepia grade applied to everything painted
 * so far on this canvas, keeping its transparency (so live layers such as
 * the drifting fields still show through the holes).
 */
export function sepia(c, { amount = 0.92, warmth = 0.1 } = {}) {
  const canvas = c.canvas;
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  tmp.getContext('2d').drawImage(canvas, 0, 0);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.filter = `sepia(${amount}) saturate(0.8) contrast(0.94) brightness(1.04)`;
  c.drawImage(tmp, 0, 0);
  c.filter = 'none';
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = `rgba(255, 200, 130, ${warmth})`;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.restore();
}

/** Per-panel vignette baked into a painting. */
export function vignette(c, w, h, strength = 0.5) {
  c.save();
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(5, 4, 8, ${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.restore();
}

/** Speckled noise for texture on flat fills. */
export function speckle(c, x, y, w, h, { count = 400, color = 'rgba(255,240,210,0.05)', size = 1.4, seed = 5 } = {}) {
  const random = rng(seed);
  c.save();
  c.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    c.fillRect(x + random() * w, y + random() * h, size * random() + 0.4, size * random() + 0.4);
  }
  c.restore();
}

/** Parcel wrapped in brown paper and string. */
export function parcel(c, x, y, w, h, { seed = 1, tone = '#8b6a44', tag = false, stringColor = 'rgba(230, 210, 170, 0.8)' } = {}) {
  const random = rng(seed);
  c.save();
  c.fillStyle = tone;
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(255,230,190,0.10)';
  c.fillRect(x, y, w, h * 0.22);
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(x, y + h * 0.78, w, h * 0.22);
  // crumple creases
  c.strokeStyle = 'rgba(40, 25, 15, 0.35)';
  c.lineWidth = 0.8;
  for (let i = 0; i < 4; i += 1) {
    const px = x + random() * w;
    c.beginPath();
    c.moveTo(px, y + random() * h);
    c.lineTo(px + (random() - 0.5) * w * 0.4, y + random() * h);
    c.stroke();
  }
  // string
  c.strokeStyle = stringColor;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(x + w * 0.5, y);
  c.lineTo(x + w * 0.5, y + h);
  c.moveTo(x, y + h * 0.5);
  c.lineTo(x + w, y + h * 0.5);
  c.stroke();
  c.restore();
  inkRect(c, x, y, w, h, { w: 1.8, alpha: 0.8, seed: seed + 3 });
  if (tag) paperTag(c, x + w * 0.5, y + h * 0.5, { angle: 0.5, scale: 0.7, glint: false, seed });
}

/** Faint painted-texture brush noise across a region (adds hand-made feel). */
export function brushTexture(c, x, y, w, h, { color = 'rgba(255,255,255,0.025)', count = 90, seed = 9, len = 60 } = {}) {
  const random = rng(seed);
  c.save();
  c.strokeStyle = color;
  c.lineCap = 'round';
  for (let i = 0; i < count; i += 1) {
    c.lineWidth = 2 + random() * 6;
    const sx = x + random() * w;
    const sy = y + random() * h;
    c.beginPath();
    c.moveTo(sx, sy);
    c.quadraticCurveTo(sx + len * 0.5, sy + (random() - 0.5) * 8, sx + len * (0.6 + random()), sy + (random() - 0.5) * 6);
    c.stroke();
  }
  c.restore();
}
