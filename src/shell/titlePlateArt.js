// The title scene's painting (layout and motion: titlePlate.js).
//
// Chapter 1's ink kit (chapters/nightService/art/ink.js): flat navy and teal
// fills, warm off-white hand-inked lines, walnut and brass, amber lamplight,
// the paper tag with its amber glint. Everything is drawn in CSS px of the
// screen; `k` is the backing scale. The static layers are painted once per
// screen size; drawFrame() only composites them and draws the few live parts.

import {
  PAL, amberGlint, brassFill, brushTexture, glow, hgrad, ink, inkEllipse, inkLine, rivet, rng, roundRectPath,
  speckle, vgrad, wood,
} from '../chapters/nightService/art/ink.js';
import { GLASS_MARGIN, LAMP_EVERY, lampWorldX } from './titlePlate.js';

const TAU = Math.PI * 2;
/** The view outside is painted at this fraction of the room's resolution. */
const OUTSIDE_SCALE = 0.72;

function canvasOf(w, h) {
  const element = document.createElement('canvas');
  element.width = Math.max(1, Math.ceil(w));
  element.height = Math.max(1, Math.ceil(h));
  return element;
}

/** A canvas `w` × `h` CSS px at backing scale k, its context set to CSS px. */
function layer(w, h, k) {
  const element = canvasOf(w * k, h * k);
  const c = element.getContext('2d');
  c.setTransform(k, 0, 0, k, 0, 0);
  return [element, c];
}

/**
 * Light (or shade) only what is already painted: `paint` draws into a scratch
 * layer, which is cut to this canvas's alpha and composited with `mode`. The
 * glass hole stays clear; its half-clear beads take a little of the light.
 */
function lightPass(c, paint, mode = 'lighter') {
  const target = c.canvas;
  const scratch = canvasOf(target.width, target.height);
  const s = scratch.getContext('2d');
  s.setTransform(c.getTransform());
  paint(s);
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'destination-in';
  s.drawImage(target, 0, 0);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = mode;
  c.drawImage(scratch, 0, 0);
  c.restore();
}

function radial(c, x, y, r, stops) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}

/** Paint `fn(dx)` three times across a period P so a strip tiles seamlessly. */
function tile3(P, fn) {
  [-P, 0, P].forEach((dx) => fn(dx));
}

// ---------------------------------------------------------------------------
// outside: the sky (still)

function paintSky(c, L, w, h) {
  const { horizon } = L;
  const M = GLASS_MARGIN;
  c.fillStyle = vgrad(c, -M, horizon, [[0, '#0a1120'], [0.4, '#111c31'], [0.78, '#1d3046'], [1, '#2a4155']]);
  c.fillRect(-M, -M, w + M * 2, horizon + M + 4);
  c.fillStyle = '#151f2b';
  c.fillRect(-M, horizon, w + M * 2, h - horizon + M);
  // the village's warm haze along the far ridge, left of Butch
  glow(c, w * 0.22, horizon, h * 0.5, 'rgba(214, 138, 70, 0.9)', 0.13);
  glow(c, w * 0.6, horizon + 6, h * 0.34, 'rgba(214, 138, 70, 0.9)', 0.07);
  // the moon behind the rain, low behind his cap
  const { x: mx, y: my } = L.moon;
  glow(c, mx, my, h * 0.7, 'rgba(150, 178, 198, 0.9)', 0.2);
  glow(c, mx, my, h * 0.24, 'rgba(214, 222, 214, 0.95)', 0.34);
  c.fillStyle = 'rgba(236, 232, 214, 0.78)';
  c.beginPath(); c.arc(mx, my, Math.max(6, h * 0.034), 0, TAU); c.fill();
  inkEllipse(c, mx, my, Math.max(6, h * 0.034), Math.max(6, h * 0.034), { w: 1, alpha: 0.35, bleed: false, seed: 6011 });
  // long rain-cloud bands; the ones near the moon have a lit rim
  const random = rng(6012);
  for (let i = 0; i < 16; i += 1) {
    const y = h * (0.03 + random() * 0.58);
    const x = w * (-0.15 + random() * 1.1);
    const len = w * (0.22 + random() * 0.42);
    const thick = h * (0.014 + random() * 0.04);
    const near = Math.max(0, 1 - Math.hypot(x + len / 2 - mx, y - my) / (h * 0.7));
    c.fillStyle = `rgba(${random() > 0.5 ? '30, 44, 64' : '20, 30, 48'}, ${0.42 + random() * 0.3})`;
    c.beginPath();
    c.ellipse(x + len / 2, y, len / 2, thick / 2, 0, 0, TAU);
    c.fill();
    if (near > 0.08 || random() > 0.6) {
      ink(c, [[x + len * 0.1, y - thick * 0.3], [x + len * 0.5, y - thick * 0.52], [x + len * 0.88, y - thick * 0.25]], {
        w: 1.1, alpha: 0.1 + near * 0.4, jitter: 1.1, bleed: false, seed: 6020 + i, color: near > 0.2 ? '#dfe3d6' : PAL.ink,
      });
    }
  }
  // one thin band drifting across the moon
  c.fillStyle = 'rgba(22, 32, 50, 0.62)';
  c.beginPath(); c.ellipse(mx + h * 0.05, my + h * 0.012, h * 0.2, h * 0.012, -0.03, 0, TAU); c.fill();
  brushTexture(c, 0, 0, w, horizon, { seed: 6013, color: 'rgba(160, 182, 212, 0.022)', count: 70, len: 200 });
  // a few stars in the clear patches, away from the moon
  const stars = rng(6014);
  for (let i = 0; i < 46; i += 1) {
    const x = stars() * w;
    const y = stars() * horizon * 0.55;
    if (Math.hypot(x - mx, y - my) < h * 0.3) continue;
    c.fillStyle = `rgba(234, 223, 198, ${0.12 + stars() * 0.32})`;
    c.fillRect(x, y, 1 + stars() * 1.1, 1 + stars() * 1.1);
  }
  // the far rain falling over the country: fine slanted sheets
  c.save();
  c.strokeStyle = 'rgba(190, 206, 222, 0.035)';
  c.lineWidth = 1;
  const sheets = rng(6015);
  for (let i = 0; i < 260; i += 1) {
    const x = sheets() * (w + 80);
    const y = sheets() * horizon;
    const len = 20 + sheets() * 50;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - len * 0.3, y + len); c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// outside: the far country (slow), hedgerows (faster), trackside ground (fast)

function ridgeY(x, P, base, amp, seed) {
  const f = (2 * Math.PI) / P;
  const a = seed % 7;
  return base - amp * (0.55 + 0.42 * Math.sin(f * 2 * x + a) + 0.28 * Math.sin(f * 5 * x + a * 1.7) + 0.12 * Math.sin(f * 11 * x + a * 0.6));
}

function house(c, x, ground, size, lit, random, seed) {
  const w = size * (1 + random() * 0.6);
  const wall = size * 0.7;
  c.fillStyle = '#0d151d';
  c.beginPath();
  c.moveTo(x, ground); c.lineTo(x, ground - wall); c.lineTo(x + w / 2, ground - wall - size * 0.55); c.lineTo(x + w, ground - wall); c.lineTo(x + w, ground);
  c.closePath(); c.fill();
  if (random() > 0.5) c.fillRect(x + w * 0.7, ground - wall - size * 0.6, size * 0.16, size * 0.4);
  ink(c, [[x - 1, ground - wall], [x + w / 2, ground - wall - size * 0.55], [x + w + 1, ground - wall]], { w: 0.9, alpha: 0.32, bleed: false, jitter: 0.3, seed });
  if (lit) {
    const wx = x + w * (0.25 + random() * 0.35);
    const wy = ground - wall * 0.62;
    c.fillStyle = random() > 0.25 ? '#f2b866' : '#e6d6b0';
    c.fillRect(wx, wy, Math.max(1.6, size * 0.16), Math.max(1.6, size * 0.18));
    glow(c, wx + 1, wy + 1, size * 1.1, 'rgba(255, 186, 104, 0.95)', 0.32);
  }
}

function orchardTree(c, x, ground, r, random, seed) {
  c.fillStyle = '#0f1a20';
  c.fillRect(x - r * 0.12, ground - r * 1.1, r * 0.24, r * 1.1);
  c.beginPath();
  c.ellipse(x, ground - r * 1.35, r, r * 0.78, 0, 0, TAU);
  c.fill();
  ink(c, [[x - r * 0.9, ground - r * 1.4], [x - r * 0.4, ground - r * 2.05], [x + r * 0.45, ground - r * 2.05], [x + r * 0.92, ground - r * 1.45]], { w: 0.8, alpha: 0.26, bleed: false, jitter: 0.3, seed });
  for (let i = 0; i < 4; i += 1) {
    c.fillStyle = `rgba(234, 223, 198, ${0.14 + random() * 0.2})`;
    c.fillRect(x + (random() - 0.5) * r * 1.6, ground - r * (0.9 + random() * 0.9), 1.2, 1.2);
  }
}

/** Far hills, the village with its lit windows, an orchard on the slope. */
function paintFar(c, L, P, h) {
  const base = L.horizon + h * 0.012;
  const amp = h * 0.065;
  const M = GLASS_MARGIN;
  // a paler, further ridge
  c.fillStyle = '#1b2938';
  c.beginPath();
  c.moveTo(-P, h + M);
  for (let x = -P; x <= P * 2; x += 8) c.lineTo(x, ridgeY(x + P * 0.37, P, base - h * 0.02, amp * 0.8, 3));
  c.lineTo(P * 2, h + M); c.closePath(); c.fill();
  // the near ridge
  c.fillStyle = vgrad(c, base - amp * 1.4, h, [[0, '#172331'], [1, '#111a24']]);
  c.beginPath();
  c.moveTo(-P, h + M);
  for (let x = -P; x <= P * 2; x += 6) c.lineTo(x, ridgeY(x, P, base, amp, 5));
  c.lineTo(P * 2, h + M); c.closePath(); c.fill();
  tile3(P, (dx) => {
    const pts = [];
    for (let x = 0; x <= P; x += 24) pts.push([x + dx, ridgeY(x, P, base, amp, 5)]);
    ink(c, pts, { w: 1.3, alpha: 0.34, jitter: 0.8, bleed: false, seed: 6101 });
  });
  // villages: a few houses on the ridge, most windows lit
  const size = Math.max(8, h * 0.032);
  [[0.1, 5, true], [0.43, 3, false], [0.71, 6, true]].forEach(([at, count, spire], v) => {
    tile3(P, (dx) => {
      const random = rng(6110 + v);
      let x = P * at;
      for (let i = 0; i < count; i += 1) {
        const ground = ridgeY(x, P, base, amp, 5) + size * 0.5;
        house(c, x + dx, ground, size, random() > 0.2, random, 6120 + v * 10 + i);
        x += size * (1.6 + random() * 1.2);
      }
      if (spire) {
        const sx = P * at + size * 2.2;
        const ground = ridgeY(sx, P, base, amp, 5);
        c.fillStyle = '#0d151d';
        c.beginPath(); c.moveTo(sx + dx - size * 0.3, ground); c.lineTo(sx + dx - size * 0.3, ground - size * 1.6); c.lineTo(sx + dx, ground - size * 3); c.lineTo(sx + dx + size * 0.3, ground - size * 1.6); c.lineTo(sx + dx + size * 0.3, ground); c.closePath(); c.fill();
        ink(c, [[sx + dx - size * 0.3, ground - size * 1.6], [sx + dx, ground - size * 3], [sx + dx + size * 0.3, ground - size * 1.6]], { w: 0.9, alpha: 0.35, bleed: false, jitter: 0.2, seed: 6131 + v });
      }
      glow(c, P * at + dx + size * 3, ridgeY(P * at, P, base, amp, 5), size * 9, 'rgba(255, 170, 90, 0.9)', 0.14);
    });
  });
  // the orchard: rows of small round trees down the slope
  tile3(P, (dx) => {
    const random = rng(6140);
    for (let row = 0; row < 3; row += 1) {
      for (let i = 0; i < 9; i += 1) {
        const x = P * 0.22 + i * size * 1.9 + row * size * 0.9;
        const ground = ridgeY(x, P, base, amp, 5) + size * (1.4 + row * 1.1);
        orchardTree(c, x + dx, ground, size * (0.55 + row * 0.12), random, 6150 + row * 10 + i);
      }
    }
  });
  speckle(c, 0, base, P, h - base, { count: Math.round(P * 0.4), color: 'rgba(190, 210, 220, 0.035)', size: 1.4, seed: 6160 });
}

function hawthorn(c, x, ground, s, seed) {
  const random = rng(seed);
  c.fillStyle = '#0a1216';
  c.beginPath();
  c.moveTo(x - 3 * s, ground); c.quadraticCurveTo(x - 1 * s, ground - 18 * s, x - 6 * s, ground - 30 * s);
  c.lineTo(x - 2 * s, ground - 30 * s); c.quadraticCurveTo(x + 2 * s, ground - 18 * s, x + 3 * s, ground);
  c.closePath(); c.fill();
  c.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI + (i / 7) * Math.PI;
    const r = (15 + random() * 9) * s;
    c.ellipse(x - 2 * s + Math.cos(a) * r * 0.85, ground - 34 * s + Math.sin(a) * r * 0.55, r * 0.6, r * 0.45, 0, 0, TAU);
  }
  c.fill();
  ink(c, [[x - 26 * s, ground - 32 * s], [x - 19 * s, ground - 50 * s], [x - 2 * s, ground - 58 * s], [x + 18 * s, ground - 50 * s], [x + 24 * s, ground - 33 * s]], { w: 1.1, alpha: 0.3, jitter: 1, bleed: false, seed });
  for (let i = 0; i < 16; i += 1) {
    c.fillStyle = `rgba(236, 226, 206, ${0.16 + random() * 0.3})`;
    c.fillRect(x + (random() - 0.55) * 44 * s, ground - (28 + random() * 26) * s, 1.5, 1.5);
  }
}

/** Hedgerows and hawthorns along the fields, a fence, darker than the hills. */
function paintMid(c, L, P, h) {
  const M = GLASS_MARGIN;
  const line = h * 0.885;
  c.fillStyle = vgrad(c, line - h * 0.04, h + M, [[0, '#0e161c'], [1, '#0a1014']]);
  c.beginPath();
  c.moveTo(-P, h + M);
  for (let x = -P; x <= P * 2; x += 10) c.lineTo(x, line - h * 0.022 * (1 + Math.sin((x / P) * TAU * 6) * 0.5 + Math.sin((x / P) * TAU * 17) * 0.3));
  c.lineTo(P * 2, h + M); c.closePath(); c.fill();
  tile3(P, (dx) => {
    const pts = [];
    for (let x = 0; x <= P; x += 20) pts.push([x + dx, line - h * 0.022 * (1 + Math.sin((x / P) * TAU * 6) * 0.5 + Math.sin((x / P) * TAU * 17) * 0.3)]);
    ink(c, pts, { w: 1.1, alpha: 0.22, jitter: 0.8, bleed: false, seed: 6201 });
    const s = h / 210;
    [0.08, 0.31, 0.37, 0.66, 0.9].forEach((at, i) => hawthorn(c, P * at + dx, line + 2, s * (0.75 + (i % 3) * 0.18), 6210 + i));
    // fence posts along the field edge
    for (let x = 0; x < P; x += h * 0.09) {
      c.fillStyle = '#0b1215';
      c.fillRect(x + dx, line - h * 0.035, Math.max(2, h * 0.006), h * 0.05);
    }
  });
  c.strokeStyle = 'rgba(234, 223, 198, 0.1)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(-P, line - h * 0.025); c.lineTo(P * 2, line - h * 0.025); c.stroke();
}

/** The cutting beside the track: near-black, streaked with wet light. */
function paintGround(c, P, h) {
  const M = GLASS_MARGIN;
  const top = h * 0.935;
  c.fillStyle = vgrad(c, top, h + M, [[0, '#0b1013'], [1, '#06090b']]);
  c.fillRect(-P, top, P * 3, h + M - top);
  const random = rng(6301);
  c.save();
  c.lineCap = 'round';
  for (let i = 0; i < Math.round(P * 0.11); i += 1) {
    const x = random() * P;
    const y = top + 3 + random() * (h + M - top);
    const len = 30 + random() * 120;
    c.strokeStyle = `rgba(${random() > 0.7 ? '230, 180, 120' : '170, 190, 205'}, ${0.04 + random() * 0.08})`;
    c.lineWidth = 0.8 + random() * 1.4;
    tile3(P, (dx) => { c.beginPath(); c.moveTo(x + dx, y); c.lineTo(x + dx + len, y); c.stroke(); });
  }
  c.restore();
  tile3(P, (dx) => ink(c, [[dx, top], [dx + P, top]], { w: 1, alpha: 0.18, jitter: 0, bleed: false, seed: 6302 }));
}

// ---------------------------------------------------------------------------
// outside, live: telegraph poles and wires, trackside lamps, rain

function drawPoles(c, L, scroll, h, width = L.glass.w) {
  const gap = L.poleGap;
  const w = width;
  const top = L.wireY;
  const pw = Math.max(5, h * 0.016);
  const first = Math.floor((scroll - gap) / gap);
  const last = Math.ceil((scroll + w + gap) / gap);
  const tops = [];
  for (let i = first; i <= last; i += 1) tops.push(i * gap - scroll);
  // the wires, three sagging spans between each pair of poles
  c.save();
  c.strokeStyle = 'rgba(8, 12, 15, 0.9)';
  c.lineWidth = 1.4;
  for (let i = 0; i < tops.length - 1; i += 1) {
    [0, 0.018, 0.036].forEach((dy) => {
      const y = top + h * dy + h * 0.012;
      c.beginPath();
      c.moveTo(tops[i], y);
      c.quadraticCurveTo((tops[i] + tops[i + 1]) / 2, y + h * 0.05, tops[i + 1], y);
      c.stroke();
    });
  }
  c.strokeStyle = 'rgba(200, 214, 226, 0.12)';
  c.lineWidth = 0.8;
  for (let i = 0; i < tops.length - 1; i += 1) {
    const y = top + h * 0.011;
    c.beginPath(); c.moveTo(tops[i], y); c.quadraticCurveTo((tops[i] + tops[i + 1]) / 2, y + h * 0.05, tops[i + 1], y); c.stroke();
  }
  c.restore();
  // the poles, blurred a little by speed
  tops.forEach((x) => {
    if (x < -gap * 0.2 || x > w + gap * 0.2) return;
    c.fillStyle = 'rgba(6, 9, 11, 0.55)';
    c.fillRect(x - pw / 2 - 3, top - h * 0.02, pw + 6, h + GLASS_MARGIN - top + h * 0.02);
    c.fillStyle = '#070a0c';
    c.fillRect(x - pw / 2, top - h * 0.025, pw, h + GLASS_MARGIN - top + h * 0.025);
    [0, h * 0.036].forEach((dy) => {
      c.fillRect(x - h * 0.05, top + dy, h * 0.1, Math.max(2, h * 0.008));
      c.fillStyle = 'rgba(214, 206, 186, 0.45)';
      [-0.042, -0.02, 0.02, 0.042].forEach((ox) => c.fillRect(x + h * ox - 1, top + dy - 2.5, 2, 3));
      c.fillStyle = '#070a0c';
    });
    c.fillStyle = 'rgba(200, 214, 226, 0.12)';
    c.fillRect(x + pw / 2 - 1, top, 1, h - top);
  });
}

/**
 * The trackside, one lamp's period long (LAMP_EVERY poles), so it tiles: the
 * cutting, the telegraph poles and wires, the trackside lamp's post.
 */
function paintNear(c, L, P, h) {
  paintGround(c, P, h);
  drawPoles(c, L, 0, h, P);
  const r = Math.max(4, h * 0.012);
  const y = h * 0.6;
  tile3(P, (dx) => {
    const x = lampWorldX(L, 0) % P + dx;
    c.fillStyle = '#080b0d';
    c.fillRect(x - 2, y + r, 4, h + GLASS_MARGIN - y);
    c.fillRect(x - r * 1.4, y - r * 1.6, r * 2.8, r * 0.8);
  });
}

/** The trackside lamps' light: live, the only part of the trackside that is. */
function drawTrackLamps(c, L, scroll, h) {
  const w = L.glass.w;
  const span = L.poleGap * LAMP_EVERY;
  const j0 = Math.floor((scroll - L.poleGap * 3) / span) - 1;
  for (let j = j0; j <= j0 + 3; j += 1) {
    const x = lampWorldX(L, j) - scroll;
    if (x < -w * 0.4 || x > w * 1.4) continue;
    const y = h * 0.6;
    const r = Math.max(4, h * 0.012);
    // the beam it throws along the cutting, and the halo in the rain
    glow(c, x, y, h * 0.42, 'rgba(255, 176, 96, 0.9)', 0.24);
    glow(c, x, h * 0.95, h * 0.3, 'rgba(255, 170, 90, 0.9)', 0.18);
    c.fillStyle = '#ffe6b0';
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    glow(c, x, y, r * 6, 'rgba(255, 220, 160, 1)', 0.7);
    // a smear of light across the wet glass as it goes by
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = hgrad(c, x - h * 0.3, x + h * 0.3, [[0, 'rgba(255, 190, 110, 0)'], [0.5, 'rgba(255, 190, 110, 0.18)'], [1, 'rgba(255, 190, 110, 0)']]);
    c.fillRect(x - h * 0.3, y - 1.5, h * 0.6, 3);
    c.restore();
  }
}

/** A rain tile that wraps both ways: streaks slanting back as the train runs on. */
function paintRainTile(size, k, density, seed, { min = 10, max = 46, alpha = 0.22, width = 1 } = {}) {
  const [element, c] = layer(size, size, k);
  const random = rng(seed);
  c.lineCap = 'round';
  const count = Math.round(130 * density);
  for (let i = 0; i < count; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const len = min + random() * (max - min);
    const dx = -len * 0.42;
    c.strokeStyle = `rgba(228, 230, 222, ${0.04 + random() * alpha})`;
    c.lineWidth = (0.6 + random() * 0.8) * width;
    for (const ox of [0, size, -size]) {
      for (const oy of [0, -size]) {
        c.beginPath(); c.moveTo(x + ox, y + oy); c.lineTo(x + ox + dx, y + oy + len); c.stroke();
      }
    }
  }
  return element;
}

// ---------------------------------------------------------------------------
// the carriage

function walls(c, L) {
  const { W, H } = L;
  wood(c, 0, 0, W, H, { base: '#22160d', vertical: true, seed: 6401, grain: 'rgba(0,0,0,0.34)', light: 'rgba(255,214,160,0.035)' });
  const random = rng(6402);
  for (let x = random() * 40; x < W; x += W * 0.055 + random() * 24) {
    c.fillStyle = 'rgba(0, 0, 0, 0.42)';
    c.fillRect(x, 0, 2, H);
    c.fillStyle = 'rgba(255, 220, 170, 0.035)';
    c.fillRect(x + 2, 0, 1, H);
  }
  if (L.mode !== 'wide') return;
  // the ceiling's curve and its brass cornice
  const ceil = H * 0.045;
  c.fillStyle = vgrad(c, 0, ceil, [[0, '#0b0705'], [1, '#1b120b']]);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, ceil); c.quadraticCurveTo(W / 2, ceil * 1.25, 0, ceil); c.closePath(); c.fill();
  c.fillStyle = brassFill(c, 0, ceil - 2, W, 4);
  c.fillRect(0, ceil - 1, W, 3);
  ink(c, [[0, ceil + 2], [W, ceil + 2]], { w: 1, alpha: 0.4, bleed: false, jitter: 0.4, seed: 6403 });
}

/** Raised walnut panels: the wall between the window and the door, the dado. */
function panels(c, x, y, w, h, { cols = 1, seed = 6410, inset = 10 } = {}) {
  const cw = (w - inset * (cols + 1)) / cols;
  if (cw < 10 || h < inset * 3) return;
  for (let i = 0; i < cols; i += 1) {
    const px = x + inset + i * (cw + inset);
    const py = y + inset;
    const ph = h - inset * 2;
    c.fillStyle = 'rgba(0, 0, 0, 0.22)';
    c.fillRect(px, py, cw, ph);
    c.fillStyle = 'rgba(255, 210, 150, 0.035)';
    c.fillRect(px + 4, py + 4, cw - 8, ph - 8);
    ink(c, [[px, py + ph], [px, py], [px + cw, py]], { w: 1.1, alpha: 0.22, bleed: false, jitter: 0.4, seed: seed + i });
    ink(c, [[px + cw, py], [px + cw, py + ph], [px, py + ph]], { w: 1.4, color: '#0a0604', alpha: 0.6, bleed: false, jitter: 0.4, seed: seed + 20 + i });
  }
}

function rightWall(c, L) {
  if (L.mode !== 'wide') return;
  const g = L.glass;
  const x0 = g.x + g.w + L.frame + 6;
  const x1 = L.door.x - 8;
  panels(c, x0, L.H * 0.06, x1 - x0, L.sill - L.H * 0.06 - 4, { seed: 6420, inset: 14 });
  panels(c, x0, L.sill + 8, x1 - x0, L.floor - L.sill - 10, { cols: 2, seed: 6430, inset: 14 });
  // the left strip beside the window
  panels(c, -10, L.sill + 8, g.x - L.frame + 4, L.floor - L.sill - 10, { seed: 6440, inset: 8 });
}

function floorBand(c, L) {
  if (L.mode !== 'wide') return;
  const { W, H, floor } = L;
  c.fillStyle = vgrad(c, floor, H, [[0, '#120b07'], [1, '#070403']]);
  c.fillRect(0, floor, W, H - floor);
  // a worn oxblood runner down the gangway
  c.fillStyle = vgrad(c, floor + (H - floor) * 0.35, H, [[0, '#3a1612'], [1, '#22100c']]);
  c.fillRect(0, floor + (H - floor) * 0.35, W, H - floor);
  ink(c, [[0, floor], [W, floor]], { w: 1.6, alpha: 0.45, bleed: false, jitter: 0.5, seed: 6450 });
  ink(c, [[0, floor + (H - floor) * 0.35], [W, floor + (H - floor) * 0.35]], { w: 1, alpha: 0.2, bleed: false, jitter: 0.5, seed: 6451 });
}

function rack(c, L) {
  if (!L.rack) return;
  const { x0, x1, y, h } = L.rack;
  const back = y + h * 0.2;
  const front = y + h;
  // its shadow on the wall
  c.fillStyle = vgrad(c, front, front + h * 1.4, [[0, 'rgba(0,0,0,0.4)'], [1, 'rgba(0,0,0,0)']]);
  c.fillRect(x0, front, x1 - x0, h * 1.4);
  // the things on it: a hat box and a parcel in string
  const hx = x0 + (x1 - x0) * 0.16;
  const hr = h * 1.05;
  c.fillStyle = '#4e2420';
  c.fillRect(hx - hr, front - hr * 1.15, hr * 2, hr * 1.15);
  c.fillStyle = '#5f2c26';
  c.beginPath(); c.ellipse(hx, front - hr * 1.15, hr, hr * 0.22, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(234, 223, 198, 0.55)';
  c.fillRect(hx - hr, front - hr * 0.55, hr * 2, hr * 0.12);
  ink(c, [[hx - hr, front - hr * 1.15], [hx - hr, front], [hx + hr, front], [hx + hr, front - hr * 1.15]], { w: 1.2, alpha: 0.55, bleed: false, seed: 6461 });
  inkEllipse(c, hx, front - hr * 1.15, hr, hr * 0.22, { w: 1.1, alpha: 0.5, bleed: false, seed: 6462 });
  const px = x0 + (x1 - x0) * 0.58;
  const pw = h * 3.2;
  const ph = h * 1.2;
  c.fillStyle = '#6f5134';
  c.fillRect(px, front - ph, pw, ph);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(px, front - ph * 0.3, pw, ph * 0.3);
  c.strokeStyle = 'rgba(230, 210, 170, 0.6)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(px + pw * 0.5, front - ph); c.lineTo(px + pw * 0.5, front); c.moveTo(px, front - ph * 0.5); c.lineTo(px + pw, front - ph * 0.5); c.stroke();
  ink(c, [[px, front - ph], [px + pw, front - ph], [px + pw, front], [px, front]], { w: 1.2, alpha: 0.55, closed: true, bleed: false, seed: 6463 });
  // the net between the rails
  c.save();
  c.strokeStyle = 'rgba(176, 138, 74, 0.32)';
  c.lineWidth = 0.8;
  for (let x = x0; x < x1; x += 9) {
    c.beginPath(); c.moveTo(x, back); c.lineTo(x + 6, front); c.moveTo(x + 6, back); c.lineTo(x, front); c.stroke();
  }
  c.restore();
  // brackets and the two brass rails
  for (let i = 0; i <= 4; i += 1) {
    const bx = x0 + 6 + ((x1 - x0 - 12) * i) / 4;
    c.strokeStyle = brassFill(c, bx - 4, y - h * 0.5, 8, h * 2, true);
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(bx, y - h * 0.6); c.quadraticCurveTo(bx + 2, back + h * 0.5, bx + 10, front); c.stroke();
    rivet(c, bx, y - h * 0.6, 2.4);
  }
  [[back, 3], [front, 5]].forEach(([ry, t]) => {
    c.fillStyle = brassFill(c, x0, ry - t / 2, x1 - x0, t);
    c.fillRect(x0, ry - t / 2, x1 - x0, t);
    c.fillStyle = 'rgba(255, 240, 200, 0.4)';
    c.fillRect(x0, ry - t / 2, x1 - x0, 1);
  });
  ink(c, [[x0, front + 3], [x1, front + 3]], { w: 1, alpha: 0.35, bleed: false, jitter: 0.4, seed: 6464 });
}

function windowFrame(c, L) {
  const g = L.glass;
  const f = L.frame;
  // the walnut moulding round the glass
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.55)';
  c.shadowBlur = f * 1.5;
  c.shadowOffsetY = f * 0.3;
  c.fillStyle = vgrad(c, g.y - f, g.y + g.h + f, [[0, '#4a3020'], [0.5, '#3a2416'], [1, '#2a190f']]);
  roundRectPath(c, g.x - f, g.y - f, g.w + f * 2, g.h + f * 2, g.r + f);
  c.fill();
  c.restore();
  wood(c, g.x - f, g.y - f, g.w + f * 2, f, { base: '#432a1a', seed: 6471, grain: 'rgba(0,0,0,0.25)' });
  c.fillStyle = 'rgba(255, 220, 170, 0.12)';
  c.fillRect(g.x - f + g.r, g.y - f + 1, g.w + f * 2 - g.r * 2, 1.5);
  c.save();
  roundRectPath(c, g.x - f, g.y - f, g.w + f * 2, g.h + f * 2, g.r + f);
  c.lineWidth = 2; c.strokeStyle = PAL.ink; c.globalAlpha = 0.5; c.stroke();
  c.restore();
  // the brass sill strip running the length of the carriage
  c.fillStyle = brassFill(c, 0, L.sill + f * 0.4, L.W, f * 0.55);
  c.fillRect(0, L.sill + f * 0.45, L.W, Math.max(4, f * 0.5));
  c.fillStyle = 'rgba(255, 240, 200, 0.45)';
  c.fillRect(0, L.sill + f * 0.45, L.W, 1);
}

/** The wall under the window: walnut panels and a brass heating grille. */
function dado(c, L) {
  const { x0, x1 } = L.bench;
  const top = L.sill + L.frame * 0.95;
  const base = L.mode === 'wide' ? L.floor - 2 : L.partition + 4;
  if (base - top < 20) return;
  panels(c, x0, top, x1 - x0, base - top, { cols: Math.max(2, Math.round((x1 - x0) / 260)), seed: 6480, inset: 12 });
  const s = L.butch.s;
  const gx = L.butch.x + 40 * s;
  const gw = 30 * s;
  const gy = top + (base - top) * 0.42;
  const gh = Math.min(16 * s, (base - top) * 0.3);
  if (gh > 8 && L.mode === 'wide') {
    c.fillStyle = 'rgba(0, 0, 0, 0.55)';
    c.fillRect(gx, gy, gw, gh);
    c.fillStyle = brassFill(c, gx, gy, gw, gh);
    for (let x = gx + 4; x < gx + gw - 4; x += Math.max(5, 2.2 * s)) c.fillRect(x, gy + 3, Math.max(1.6, 0.7 * s), gh - 6);
    ink(c, [[gx, gy], [gx + gw, gy], [gx + gw, gy + gh], [gx, gy + gh]], { w: 1, alpha: 0.4, closed: true, bleed: false, seed: 6485 });
  }
}

/**
 * One seat of a bay, seen from the side: the high buttoned back, the cushion,
 * the base. `back` is the x of the back's outer face (units), `dir` +1 when
 * the seat faces right (its back on the left), -1 when it faces left.
 */
function seat(c, back, dir, floor, u, seed) {
  const depth = 48;
  const bw = 15;
  const bx0 = dir > 0 ? back : back - bw;
  const front = back + dir * (bw + depth);
  const cx0 = Math.min(back + dir * bw, front);
  const cx1 = Math.max(back + dir * bw, front);
  // base: a walnut block on an iron foot
  c.fillStyle = '#140c07';
  c.fillRect(Math.min(bx0, cx0) + 3, 9, Math.abs(front - back) - 6, floor - 9);
  c.fillStyle = 'rgba(255, 210, 150, 0.04)';
  c.fillRect(Math.min(bx0, cx0) + 6, 13, Math.abs(front - back) - 12, 2);
  c.fillStyle = '#0b0705';
  c.fillRect(cx0 + (cx1 - cx0) * (dir > 0 ? 0.62 : 0.1), floor - 6, (cx1 - cx0) * 0.28, 6);
  // the high back, its side seen edge on, with a rolled top
  const back0 = new Path2D();
  back0.moveTo(bx0, 6); back0.lineTo(bx0, -62); back0.bezierCurveTo(bx0, -70, bx0 + bw, -70, bx0 + bw, -62); back0.lineTo(bx0 + bw, 6); back0.closePath();
  // the brass grab handle on the roll
  c.strokeStyle = brassFill(c, bx0, -72, bw, 6);
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(bx0 + bw * 0.25, -67.5); c.quadraticCurveTo(bx0 + bw / 2, -73, bx0 + bw * 0.75, -67.5); c.stroke();
  c.fillStyle = vgrad(c, -70, 6, [[0, '#4a1d18'], [0.4, '#371410'], [1, '#1e0a08']]);
  c.fill(back0);
  c.fillStyle = 'rgba(255, 200, 160, 0.1)';
  c.fillRect(bx0 + (dir > 0 ? bw - 3 : 1), -64, 2, 66);
  [-52, -36, -20].forEach((by) => {
    c.fillStyle = 'rgba(12, 3, 2, 0.6)';
    c.beginPath(); c.arc(bx0 + bw / 2, by, 1.2, 0, TAU); c.fill();
  });
  ink(c, [[bx0, 6], [bx0, -62], [bx0 + bw * 0.2, -67.4], [bx0 + bw / 2, -68.6], [bx0 + bw * 0.8, -67.4], [bx0 + bw, -62], [bx0 + bw, 6]], { w: u(1.5), alpha: 0.36, bleed: false, jitter: 0.15, seed });
  c.fillStyle = 'rgba(255, 210, 170, 0.14)';
  c.fillRect(bx0 + 2, -66.5, bw - 4, 1.2);
  // the cushion, its rounded front edge
  const cushion = new Path2D();
  cushion.roundRect ? cushion.roundRect(cx0, -3, cx1 - cx0, 12, [dir > 0 ? 1 : 5, dir > 0 ? 5 : 1, dir > 0 ? 5 : 1, dir > 0 ? 1 : 5]) : cushion.rect(cx0, -3, cx1 - cx0, 12);
  c.fillStyle = vgrad(c, -3, 9, [[0, '#5e241d'], [0.3, '#441913'], [1, '#230c09']]);
  c.fill(cushion);
  c.fillStyle = 'rgba(255, 200, 160, 0.16)';
  c.fillRect(cx0 + 2, -3, cx1 - cx0 - 4, 1.1);
  ink(c, [[cx0, 9], [cx0, -3], [cx1, -3]], { w: u(1.3), alpha: 0.32, bleed: false, jitter: 0.15, seed: seed + 1 });
  ink(c, [[cx0 + 3, 5.5], [cx1 - 3, 5.5]], { w: u(0.9), alpha: 0.16, bleed: false, jitter: 0.1, seed: seed + 2 });
}

/** The bay: the empty seat behind his, his seat, the facing seat. */
function seats(c, L) {
  const { x, y, s } = L.butch;
  const u = (px) => px / s;
  const floor = ((L.mode === 'wide' ? L.floor : L.partition + 40) - y) / s;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  seat(c, -16, -1, floor, u, 6490);
  seat(c, -29, 1, floor, u, 6492);
  seat(c, 114, -1, floor, u, 6494);
  c.restore();
}

function windowTable(c, L) {
  const t = L.butch.table;
  const s = L.butch.s;
  // a fold-down walnut table on an angled brass bracket from the wall
  c.strokeStyle = brassFill(c, t.x, t.y, 6, 20 * s, true);
  c.lineWidth = Math.max(2, 1.4 * s);
  c.beginPath(); c.moveTo(t.x + t.w * 0.3, t.y + t.h); c.lineTo(t.x + t.w * 0.55, t.y + t.h + 14 * s); c.lineTo(t.x + t.w * 0.55, t.y + t.h + 18 * s); c.stroke();
  wood(c, t.x, t.y, t.w, t.h, { base: '#5a3a22', seed: 6491 });
  c.fillStyle = 'rgba(255, 220, 170, 0.35)';
  c.fillRect(t.x, t.y, t.w, 1.5);
  c.fillStyle = 'rgba(0, 0, 0, 0.4)';
  c.fillRect(t.x, t.y + t.h - 1.5, t.w, 1.5);
  ink(c, [[t.x, t.y], [t.x + t.w, t.y], [t.x + t.w, t.y + t.h], [t.x, t.y + t.h]], { w: 1.3, alpha: 0.6, closed: true, bleed: false, seed: 6492 });
}

// ---------------------------------------------------------------------------
// Butch (units: 0, 0 is where he sits; his cap is 96 up), the case, his lamp

function butchPaths() {
  const coat = new Path2D();
  coat.moveTo(-12, -58); coat.quadraticCurveTo(-17, -42, -15.5, -14); coat.lineTo(-14.5, 1); coat.lineTo(29, 1);
  coat.quadraticCurveTo(31.5, -4, 30.5, -9); coat.quadraticCurveTo(28, -12.5, 22, -12.5); coat.lineTo(13, -13.5);
  coat.quadraticCurveTo(16.5, -30, 13.5, -46); coat.quadraticCurveTo(11.5, -56, 4, -59.5); coat.quadraticCurveTo(-5, -61.5, -12, -58); coat.closePath();
  const head = new Path2D();
  head.moveTo(-6, -84); head.quadraticCurveTo(-8.5, -76, -5.5, -70); head.quadraticCurveTo(-2, -66.5, 4, -66);
  head.quadraticCurveTo(9, -66, 10.5, -68); head.lineTo(11.6, -70.5); head.lineTo(12.4, -72); head.lineTo(13, -74);
  head.lineTo(15.4, -76.2); head.quadraticCurveTo(14.6, -78, 13, -79.2); head.lineTo(13, -81); head.quadraticCurveTo(12.4, -84, 10.5, -86);
  head.lineTo(-5, -86.5); head.closePath();
  const cap = new Path2D();
  cap.moveTo(-8, -84.5); cap.quadraticCurveTo(-10, -94, -1, -96); cap.quadraticCurveTo(10, -97, 11.5, -88); cap.lineTo(11.4, -85.5); cap.closePath();
  const peak = new Path2D();
  peak.moveTo(8.5, -86.6); peak.quadraticCurveTo(15, -86.8, 19.4, -84.6); peak.lineTo(17.6, -83.4); peak.quadraticCurveTo(13, -84.4, 8.6, -84.6); peak.closePath();
  const collar = new Path2D();
  collar.moveTo(-9, -57); collar.lineTo(-8, -68); collar.quadraticCurveTo(-4, -64.5, -1, -64.5); collar.lineTo(5, -64.5);
  collar.quadraticCurveTo(9, -65, 11, -68); collar.lineTo(10.5, -56); collar.closePath();
  const arm = new Path2D();
  arm.moveTo(-6, -57); arm.quadraticCurveTo(4, -60, 6.5, -50); arm.lineTo(9.5, -37); arm.lineTo(20, -33.5);
  arm.lineTo(21, -27.6); arm.lineTo(6, -27.5); arm.quadraticCurveTo(1, -28, 0, -34); arm.lineTo(-3.5, -48); arm.closePath();
  const legs = new Path2D();
  // the near knee past the case, the shin down to the boot
  legs.moveTo(26, -11.5); legs.quadraticCurveTo(37, -12, 38.5, -4); legs.lineTo(40.5, 30); legs.lineTo(32.5, 30); legs.lineTo(30, 0); legs.closePath();
  return { coat, head, cap, peak, collar, arm, legs };
}

/** Light a clipped part from the lamp at (lx, ly) in units. */
function lampLit(c, path, lx, ly, r, alpha, color = '255, 170, 92') {
  c.save();
  c.clip(path);
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, lx, ly, r, [[0, `rgba(${color}, ${alpha})`], [0.45, `rgba(${color}, ${alpha * 0.45})`], [1, `rgba(${color}, 0)`]]);
  c.fillRect(lx - r, ly - r, r * 2, r * 2);
  c.restore();
}

function lampSpace(L) {
  const { x, y, s, lamp } = L.butch;
  return { lx: (lamp.x - x) / s, ly: (lamp.glass - y) / s, u: (px) => px / s };
}

/** His body: legs, coat, the strap; the arm and head come after the case. */
function paintButch(c, L) {
  const { x, y, s } = L.butch;
  const { lx, ly, u } = lampSpace(L);
  const floor = ((L.mode === 'wide' ? L.floor : L.partition + 40) - y) / s;
  const P = butchPaths();
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  // the far leg, in shadow, then the near one
  c.fillStyle = '#0c1118';
  c.beginPath(); c.moveTo(22, -10); c.quadraticCurveTo(32, -11, 33, -3); c.lineTo(35, floor - 5); c.lineTo(28, floor - 5); c.lineTo(25, 0); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(26, floor - 6); c.quadraticCurveTo(38, floor - 7.5, 41, floor - 1); c.lineTo(41, floor); c.lineTo(26, floor); c.closePath(); c.fill();
  const shin = new Path2D();
  shin.moveTo(26, -11.5); shin.quadraticCurveTo(37, -12, 38.5, -4); shin.lineTo(40.5, floor - 5); shin.lineTo(32.5, floor - 5); shin.lineTo(30, 0); shin.closePath();
  c.fillStyle = '#141b25';
  c.fill(shin);
  lampLit(c, shin, lx, ly, 60, 0.4);
  c.fillStyle = '#0a0705';
  c.beginPath(); c.moveTo(31.5, floor - 6.5); c.quadraticCurveTo(44, floor - 8, 47.5, floor - 1.5); c.lineTo(47.5, floor); c.lineTo(31.5, floor); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255, 210, 160, 0.25)';
  c.fillRect(36, floor - 7, 8, 0.9);
  ink(c, [[38.5, -4], [40.5, floor - 5], [47.5, floor - 1.5]], { w: u(1.6), alpha: 0.4, bleed: false, jitter: 0.12, color: '#ffcf92', seed: 6501 });
  // the coat: dark, its lamp side warm
  c.fillStyle = vgrad(c, -60, 2, [[0, '#13222a'], [1, '#0c161b']]);
  c.fill(P.coat);
  c.save();
  c.clip(P.coat);
  c.fillStyle = 'rgba(3, 6, 8, 0.45)';
  c.fillRect(-20, -64, 14, 70);
  // the satchel strap across his chest, the coat's front edge and buttons
  c.strokeStyle = PAL.oxblood;
  c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(-6, -59); c.lineTo(15, -22); c.stroke();
  c.strokeStyle = 'rgba(255, 190, 130, 0.3)';
  c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-4.4, -59.6); c.lineTo(16.4, -23.5); c.stroke();
  c.strokeStyle = 'rgba(234, 223, 198, 0.22)';
  c.lineWidth = u(1.2);
  c.beginPath(); c.moveTo(12, -50); c.quadraticCurveTo(14.5, -32, 12.5, -14); c.stroke();
  c.restore();
  lampLit(c, P.coat, lx, ly, 80, 0.3);
  c.fillStyle = PAL.brassLight;
  [-46, -38, -30].forEach((by) => { c.beginPath(); c.arc(12.6 + (by + 46) * 0.03, by, 1.1, 0, TAU); c.fill(); });
  ink(c, [[-12, -58], [-15.5, -40], [-15.5, -14], [-14.5, 1]], { w: u(1.6), alpha: 0.6, bleed: false, jitter: 0.2, color: '#06080c', seed: 6510 });
  // the warm rim along his front, from the lamp
  ink(c, [[4, -59.5], [11.5, -56], [13.5, -46], [16.5, -30], [13, -13.5], [22, -12.5], [28, -12.5], [30.5, -9]], { w: u(2), alpha: 0.75, bleed: true, jitter: 0.15, color: '#ffc988', seed: 6511 });
  c.restore();
}

/** His arm and hand on the case, the collar, his head and cap. */
function paintButchHead(c, L) {
  const { x, y, s } = L.butch;
  const { lx, ly, u } = lampSpace(L);
  const P = butchPaths();
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  // the arm, the hand resting on the case's lid
  c.fillStyle = '#152329';
  c.fill(P.arm);
  lampLit(c, P.arm, lx, ly, 55, 0.42);
  ink(c, [[6.5, -50], [9.5, -37], [20, -33.5]], { w: u(1.8), alpha: 0.7, bleed: true, jitter: 0.12, color: '#ffc988', seed: 6519 });
  c.fillStyle = '#8c6a50';
  c.beginPath(); c.ellipse(23.4, -30.6, 4.2, 2.8, -0.1, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(27, -30, 2.2, 1.5, 0, 0, TAU); c.fill();
  lampLit(c, (() => { const p = new Path2D(); p.ellipse(24.5, -30.5, 6.5, 3.6, 0, 0, TAU); return p; })(), lx, ly, 40, 0.9);
  ink(c, [[19.5, -33.2], [26, -33.1], [29, -30.2]], { w: u(1.4), alpha: 0.65, bleed: false, jitter: 0.1, color: '#ffd59a', seed: 6520 });
  // neck and the collar turned up against the cold
  c.fillStyle = '#4e392b';
  c.fillRect(-3, -67, 9, 7);
  c.fillStyle = '#121e24';
  c.fill(P.collar);
  lampLit(c, P.collar, lx, ly, 70, 0.5);
  // his face in profile: in shadow, lit along its front by the lamp
  c.fillStyle = '#5a4234';
  c.fill(P.head);
  c.save();
  c.clip(P.head);
  c.fillStyle = hgrad(c, -1, 14, [[0, 'rgba(226, 170, 114, 0)'], [0.35, 'rgba(226, 170, 114, 0.55)'], [0.75, 'rgba(236, 184, 126, 0.92)'], [1, 'rgba(244, 196, 138, 1)']]);
  c.fillRect(-2, -90, 22, 28);
  c.fillStyle = vgrad(c, -86, -66, [[0, 'rgba(60, 30, 16, 0.25)'], [0.5, 'rgba(60, 30, 16, 0)'], [1, 'rgba(60, 30, 16, 0.18)']]);
  c.fillRect(-10, -90, 30, 28);
  c.fillStyle = '#1e140d';
  c.beginPath(); c.moveTo(-6.5, -84); c.quadraticCurveTo(-8.6, -76, -5.6, -71); c.lineTo(-3, -73); c.lineTo(-3.4, -84); c.closePath(); c.fill();
  c.restore();
  // ear, eye, brow, mouth
  c.fillStyle = '#6a4a36';
  c.beginPath(); c.ellipse(-0.6, -77, 1.7, 2.6, 0.1, 0, TAU); c.fill();
  c.fillStyle = '#1a110b';
  c.beginPath(); c.ellipse(9.6, -79.2, 0.85, 0.7, 0, 0, TAU); c.fill();
  ink(c, [[7.6, -81.3], [11, -81.6]], { w: u(1.3), alpha: 0.7, bleed: false, jitter: 0.05, color: '#2a1a10', seed: 6523 });
  ink(c, [[10.2, -71.2], [12, -71.5]], { w: u(1), alpha: 0.6, bleed: false, jitter: 0.05, color: '#5a3426', seed: 6524 });
  // the lamp's rim along his brow, nose and chin
  ink(c, [[12.5, -83.4], [13, -79.2], [15.4, -76.2], [13, -74], [12.4, -72], [11.6, -70.5], [10.5, -68], [7, -66.2]], {
    w: u(2.2), alpha: 0.9, bleed: true, jitter: 0.08, color: '#ffd9a0', seed: 6525,
  });
  // the cap: crown, oxblood band, the peak, the brass badge
  c.fillStyle = '#121a27';
  c.fill(P.cap);
  c.save();
  c.clip(P.cap);
  c.fillStyle = PAL.oxblood;
  c.fillRect(-12, -88.6, 26, 2.6);
  c.restore();
  lampLit(c, P.cap, lx, ly, 90, 0.42);
  c.fillStyle = '#080c14';
  c.fill(P.peak);
  c.fillStyle = PAL.brassLight;
  c.fillRect(5.4, -92.4, 2.6, 2.2);
  glow(c, 6.7, -91.3, 4, 'rgba(255, 220, 150, 0.9)', 0.35);
  ink(c, [[-8, -84.5], [-9.4, -91], [-1, -96], [7, -96.2], [11.5, -88]], { w: u(1.6), alpha: 0.7, bleed: false, jitter: 0.15, color: '#06080c', seed: 6527 });
  ink(c, [[0, -95.6], [7, -95.8], [11, -89]], { w: u(1.2), alpha: 0.4, bleed: false, jitter: 0.1, color: '#ffd59a', seed: 6530 });
  ink(c, [[11.5, -88], [11.4, -86.4], [19.4, -84.6], [17.6, -83.4], [8.6, -84.6]], { w: u(1.6), alpha: 0.75, bleed: false, jitter: 0.1, color: '#ffd59a', seed: 6528 });
  ink(c, [[-8.5, -84.6], [-8, -79], [-6, -71], [-1, -66.6]], { w: u(1.4), alpha: 0.6, bleed: false, jitter: 0.12, color: '#06080c', seed: 6529 });
  c.restore();
}

/** A paper claim tag, larger than the kit's, with the claim number typed on it. */
function claimTag(c, x, y, angle, size) {
  const w = size * 2.35;
  const h = size;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(h * 0.42, -h / 2); c.lineTo(w, -h / 2); c.lineTo(w, h / 2); c.lineTo(h * 0.42, h / 2); c.closePath();
  c.shadowColor = 'rgba(0, 0, 0, 0.5)';
  c.shadowBlur = size * 0.25;
  c.shadowOffsetY = size * 0.1;
  c.fillStyle = vgrad(c, -h / 2, h / 2, [[0, '#f1e7cd'], [1, '#d9caa6']]);
  c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(80, 56, 34, 0.7)';
  c.lineWidth = Math.max(0.8, size * 0.04);
  c.stroke();
  c.fillStyle = 'rgba(60, 40, 25, 0.9)';
  c.beginPath(); c.arc(h * 0.36, 0, size * 0.09, 0, TAU); c.fill();
  c.strokeStyle = PAL.oxblood;
  c.lineWidth = Math.max(0.6, size * 0.035);
  c.beginPath(); c.moveTo(h * 0.62, -h * 0.5); c.lineTo(h * 0.62, h * 0.5); c.stroke();
  c.fillStyle = 'rgba(110, 34, 24, 0.95)';
  c.textBaseline = 'middle';
  c.font = `700 ${Math.max(5, size * 0.23)}px "Space Mono", monospace`;
  c.fillText('CLAIM', h * 0.74, -h * 0.2);
  c.fillStyle = 'rgba(42, 29, 20, 0.95)';
  c.font = `700 ${Math.max(5, size * 0.255)}px "Space Mono", monospace`;
  c.fillText('1978-0412', h * 0.74, h * 0.2, w - h * 0.84);
  c.restore();
  amberGlint(c, x + Math.cos(angle) * w * 0.98 - Math.sin(angle) * -h * 0.55, y + Math.sin(angle) * w * 0.98 + Math.cos(angle) * -h * 0.55, size * 0.28);
}

function paintCase(c, L) {
  const { x, y, s } = L.butch;
  const { lx, ly, u } = lampSpace(L);
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  glow(c, 14, -2, 30, 'rgba(0, 0, 0, 1)', 0.4, 'source-over');
  const body = new Path2D();
  if (body.roundRect) body.roundRect(-7, -31, 42, 32, 2.6); else body.rect(-7, -31, 42, 32);
  c.fillStyle = vgrad(c, -31, 1, [[0, '#6e4627'], [0.5, '#5a3820'], [1, '#3e2614']]);
  c.fill(body);
  c.save();
  c.clip(body);
  wood(c, -7, -31, 42, 32, { base: 'rgba(0,0,0,0)', seed: 6531, grain: 'rgba(30, 16, 8, 0.25)', light: 'rgba(255, 220, 170, 0.06)' });
  c.fillStyle = 'rgba(20, 10, 4, 0.35)';
  c.fillRect(-7, -24.5, 42, 1.2);
  c.fillStyle = '#3a2213';
  c.fillRect(1, -31, 4.4, 32); c.fillRect(24.6, -31, 4.4, 32);
  c.fillStyle = 'rgba(255, 220, 170, 0.12)';
  c.fillRect(-7, -31, 42, 2.4);
  // the far end of the case in shadow
  c.fillStyle = 'rgba(8, 4, 2, 0.4)';
  c.fillRect(-7, -31, 10, 32);
  c.restore();
  lampLit(c, body, lx, ly, 70, 0.8);
  // brass: the corners, the strap buckles, the lock
  c.fillStyle = PAL.brass;
  [[-7, -31], [31, -31], [-7, -3], [31, -3]].forEach(([cx, cy]) => c.fillRect(cx, cy, 4, 4));
  [[1, -16], [24.6, -16]].forEach(([bx, by]) => { c.fillRect(bx - 0.4, by, 5.2, 3.6); c.fillStyle = '#2a1608'; c.fillRect(bx + 0.9, by + 1, 2.6, 1.6); c.fillStyle = PAL.brass; });
  c.fillStyle = PAL.brassLight;
  c.fillRect(12.4, -26.4, 3.2, 3.4);
  // the handle
  c.strokeStyle = '#2e1a0d';
  c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(9, -31); c.quadraticCurveTo(14, -38, 19, -31); c.stroke();
  c.fillStyle = PAL.brass;
  c.fillRect(7.6, -32.4, 2.6, 2); c.fillRect(18, -32.4, 2.6, 2);
  ink(c, [[-7, -31], [35, -31], [35, 1], [-7, 1]], { w: u(1.6), alpha: 0.6, closed: true, bleed: false, jitter: 0.2, seed: 6532 });
  ink(c, [[35, -31], [35, 1]], { w: u(1.8), alpha: 0.7, bleed: false, jitter: 0.1, color: '#ffc988', seed: 6533 });
  // the string from the handle to the tag
  ink(c, [[17.5, -33.5], [21.5, -28], [24.4, -21.4]], { w: u(1.1), alpha: 0.8, bleed: false, jitter: 0.1, color: '#e6d6b0', seed: 6534 });
  c.restore();
  claimTag(c, L.butch.tag.x, L.butch.tag.y, 0.3, 13 * s);
}

function paintTableLamp(c, L) {
  const { s } = L.butch;
  const { x, y } = L.butch.lamp;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  // base, oil font, chimney, cap, the bail handle
  c.fillStyle = brassFill(c, -7, -3, 14, 3);
  c.beginPath(); c.ellipse(0, -1.2, 7.5, 2, 0, 0, TAU); c.fill();
  c.fillStyle = brassFill(c, -6, -9, 12, 7);
  c.beginPath(); c.ellipse(0, -5.5, 6, 4, 0, 0, TAU); c.fill();
  c.fillStyle = vgrad(c, -24, -9, [[0, '#fff1c6'], [0.5, '#ffd27e'], [1, '#e8a650']]);
  c.beginPath(); c.moveTo(-3.6, -9); c.quadraticCurveTo(-5.4, -17, -3, -24); c.lineTo(3, -24); c.quadraticCurveTo(5.4, -17, 3.6, -9); c.closePath(); c.fill();
  c.fillStyle = '#fffaf0';
  c.beginPath(); c.ellipse(0, -15, 1.4, 3.2, 0, 0, TAU); c.fill();
  c.fillStyle = PAL.brassDark;
  c.fillRect(-3.6, -26.4, 7.2, 2.6);
  c.strokeStyle = PAL.brass;
  c.lineWidth = 0.9;
  c.beginPath(); c.arc(0, -27, 4.6, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  ink(c, [[-7.5, -1.4], [-6, -5.5], [-3.6, -9], [-5.2, -17], [-3, -24], [3, -24], [5.2, -17], [3.6, -9], [6, -5.5], [7.5, -1.4]], { w: 1.4 / s, alpha: 0.7, bleed: false, jitter: 0.08, seed: 6541 });
  c.restore();
}

// ---------------------------------------------------------------------------
// the glass (beads, sheen, his reflection) and the end door with the Mara ahead

function glassOverlay(c, L, cfg) {
  const g = L.glass;
  c.save();
  roundRectPath(c, g.x, g.y, g.w, g.h, g.r);
  c.clip();
  // a faint cool cast and sheen bands
  c.fillStyle = 'rgba(14, 22, 32, 0.08)';
  c.fillRect(g.x, g.y, g.w, g.h);
  [[0.08, 0.17, 0.04], [0.26, 0.31, 0.025], [0.62, 0.7, 0.025]].forEach(([a, b, alpha]) => {
    c.fillStyle = `rgba(200, 220, 240, ${alpha})`;
    c.beginPath();
    c.moveTo(g.x + g.w * a, g.y); c.lineTo(g.x + g.w * b, g.y); c.lineTo(g.x + g.w * (b - 0.16), g.y + g.h); c.lineTo(g.x + g.w * (a - 0.16), g.y + g.h);
    c.closePath(); c.fill();
  });
  // condensation in the lower corners
  [[g.x, g.y + g.h, g.h * 0.75], [g.x + g.w, g.y + g.h, g.h * 0.5]].forEach(([fx, fy, r]) => {
    c.fillStyle = radial(c, fx, fy, r, [[0, 'rgba(160, 182, 198, 0.2)'], [1, 'rgba(160, 182, 198, 0)']]);
    c.fillRect(fx - r, fy - r, r * 2, r * 2);
  });
  // his reflection, faint, facing back the other way; and his lamp's
  if (cfg.reflection) {
    // only the lamp-lit edges show in the glass: his profile, turned back
    const { x, y, s } = L.butch;
    c.save();
    c.translate(x - 30 * s, y - 4 * s);
    c.scale(-s * 0.96, s * 0.96);
    const P = butchPaths();
    c.globalAlpha = 0.05;
    c.fillStyle = '#d8c4a4';
    c.fill(P.head);
    c.fill(P.peak);
    c.globalAlpha = 0.03;
    c.fill(P.cap);
    c.fill(P.collar);
    c.globalAlpha = 1;
    c.restore();
    glow(c, L.butch.lamp.x - 86 * s, L.butch.lamp.glass - 6 * s, 20 * s, 'rgba(255, 200, 130, 0.9)', 0.16);
  }
  // beads of rain resting on the glass, and a few long runnels
  const random = rng(6601);
  const count = Math.round((g.w * g.h) / 2600);
  for (let i = 0; i < count; i += 1) {
    const x = g.x + random() * g.w;
    const y = g.y + random() * g.h;
    const r = 0.8 + random() * random() * 3.6;
    c.fillStyle = 'rgba(10, 16, 24, 0.3)';
    c.beginPath(); c.ellipse(x, y + r * 0.2, r, r * 1.15, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(214, 226, 236, 0.16)';
    c.beginPath(); c.ellipse(x, y, r * 0.85, r * 0.95, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(240, 244, 248, 0.6)';
    c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, Math.max(0.5, r * 0.3), 0, TAU); c.fill();
  }
  // the lamp's glare where it stands against the glass
  glow(c, L.butch.lamp.x, L.butch.lamp.glass, 54 * L.butch.s, 'rgba(255, 196, 120, 0.9)', 0.3);
  c.restore();
  // the brass bead round the glass
  c.save();
  roundRectPath(c, g.x, g.y, g.w, g.h, g.r);
  c.lineWidth = Math.max(2.5, L.frame * 0.28);
  c.strokeStyle = brassFill(c, g.x, g.y, g.w, g.h);
  c.stroke();
  c.lineWidth = 1;
  c.strokeStyle = 'rgba(20, 12, 6, 0.8)';
  roundRectPath(c, g.x - 1, g.y - 1, g.w + 2, g.h + 2, g.r + 1);
  c.stroke();
  c.restore();
  // the leather blind rolled up at the top of the frame
  const by = g.y - L.frame * 0.55;
  const bh = Math.max(6, L.frame * 0.95);
  c.fillStyle = vgrad(c, by, by + bh, [[0, '#6a4026'], [0.5, '#4a2a18'], [1, '#2a170c']]);
  roundRectPath(c, g.x + g.r * 0.6, by, g.w - g.r * 1.2, bh, bh / 2); c.fill();
  ink(c, [[g.x + g.r * 0.6, by + bh], [g.x + g.w - g.r * 0.6, by + bh]], { w: 1.1, alpha: 0.45, bleed: false, jitter: 0.3, seed: 6620 });
  [0.3, 0.7].forEach((at) => {
    c.fillStyle = PAL.brass;
    c.fillRect(g.x + g.w * at - 3, by + bh - 1, 6, Math.max(5, bh * 0.7));
  });
}

function mara(c, x, ground, h) {
  // walking away from us: dark coat, the rose scarf over her head and down her back
  const s = h / 66;
  c.save();
  c.translate(x, ground);
  c.scale(s, s);
  c.fillStyle = '#17110f';
  c.beginPath(); c.moveTo(-3.5, -22); c.lineTo(-5.5, 0); c.lineTo(-2.5, 0); c.lineTo(-0.5, -20); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(0.6, -21); c.lineTo(4.6, -2); c.lineTo(7, -2.6); c.lineTo(3.2, -22); c.closePath(); c.fill();
  c.fillStyle = '#1f1716';
  c.beginPath(); c.moveTo(-7, -46); c.quadraticCurveTo(0, -50, 7, -46); c.lineTo(9.5, -19); c.quadraticCurveTo(0, -16, -9.5, -19); c.closePath(); c.fill();
  c.fillStyle = '#c46a7a';
  c.beginPath(); c.ellipse(0, -55, 5.4, 6.4, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-6, -52); c.quadraticCurveTo(-9, -44, -5.5, -36); c.lineTo(-1.5, -37); c.quadraticCurveTo(-3, -45, -1, -50); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255, 220, 190, 0.35)';
  c.beginPath(); c.ellipse(1.8, -58, 2, 2.8, 0.4, 0, TAU); c.fill();
  c.fillStyle = '#b05a6a';
  c.beginPath(); c.moveTo(-6.5, -50); c.quadraticCurveTo(0, -47, 6.5, -50); c.lineTo(6, -47.5); c.quadraticCurveTo(0, -45, -6, -47.5); c.closePath(); c.fill();
  // the warm light of her carriage on her far edge
  c.strokeStyle = 'rgba(255, 210, 150, 0.55)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(7, -46); c.lineTo(9.5, -19); c.stroke();
  c.restore();
}

function endDoor(c, L) {
  if (!L.door) return;
  const d = L.door;
  const win = L.doorWindow;
  const { H } = L;
  // the jamb and the door leaf
  c.fillStyle = '#120b06';
  c.fillRect(d.x - 10, d.y - 10, d.w + 20, d.h + 10);
  c.fillStyle = vgrad(c, d.y, d.y + d.h, [[0, '#2e1d11'], [1, '#22150c']]);
  c.fillRect(d.x, d.y, d.w + 10, d.h);
  wood(c, d.x, d.y, d.w + 10, d.h, { base: 'rgba(0,0,0,0)', vertical: true, seed: 6701, grain: 'rgba(0,0,0,0.28)' });
  ink(c, [[d.x, d.y + d.h], [d.x, d.y], [d.x + d.w + 10, d.y]], { w: 1.8, alpha: 0.55, bleed: false, seed: 6702 });
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(d.x - 10, d.y, 6, d.h);
  // lower panel and a brass kick plate
  const lp = { x: d.x + d.w * 0.16, y: win.y + win.h + H * 0.06, w: d.w * 0.68, h: d.y + d.h - (win.y + win.h + H * 0.06) - H * 0.09 };
  panels(c, lp.x - 8, lp.y - 8, lp.w + 16, lp.h + 16, { seed: 6703, inset: 8 });
  c.fillStyle = brassFill(c, d.x, d.y + d.h - H * 0.045, d.w, H * 0.04);
  c.globalAlpha = 0.55;
  c.fillRect(d.x + 4, d.y + d.h - H * 0.045, d.w, H * 0.04);
  c.globalAlpha = 1;
  // the handle
  const hy = win.y + win.h + H * 0.03;
  c.fillStyle = brassFill(c, d.x + 6, hy - 10, 10, 20, true);
  roundRectPath(c, d.x + d.w * 0.08, hy - H * 0.02, Math.max(6, d.w * 0.07), H * 0.04, 3); c.fill();
  rivet(c, d.x + d.w * 0.08 + Math.max(3, d.w * 0.035), hy, Math.max(2.5, d.w * 0.035));
}

/**
 * Through the end door's little window: the gangway, then the next carriage,
 * lit, and the Mara ahead walking away down it. Painted after the room's
 * shade: it is a light of its own.
 */
function doorView(c, L) {
  if (!L.door) return;
  const win = L.doorWindow;
  c.save();
  roundRectPath(c, win.x, win.y, win.w, win.h, 6);
  c.clip();
  c.fillStyle = vgrad(c, win.y, win.y + win.h, [[0, '#b97336'], [0.45, '#f0b466'], [1, '#7a4420']]);
  c.fillRect(win.x, win.y, win.w, win.h);
  const vx = win.x + win.w * 0.52;
  const vy = win.y + win.h * 0.46;
  // corridor: ceiling, floor and side windows converging
  c.fillStyle = 'rgba(60, 30, 12, 0.55)';
  c.beginPath(); c.moveTo(win.x, win.y); c.lineTo(win.x + win.w, win.y); c.lineTo(vx + win.w * 0.12, vy - win.h * 0.14); c.lineTo(vx - win.w * 0.12, vy - win.h * 0.14); c.closePath(); c.fill();
  c.fillStyle = 'rgba(70, 26, 16, 0.75)';
  c.beginPath(); c.moveTo(win.x, win.y + win.h); c.lineTo(win.x + win.w, win.y + win.h); c.lineTo(vx + win.w * 0.12, vy + win.h * 0.2); c.lineTo(vx - win.w * 0.12, vy + win.h * 0.2); c.closePath(); c.fill();
  c.fillStyle = 'rgba(90, 50, 24, 0.5)';
  c.beginPath(); c.moveTo(win.x, win.y + win.h * 0.1); c.lineTo(vx - win.w * 0.12, vy - win.h * 0.14); c.lineTo(vx - win.w * 0.12, vy + win.h * 0.2); c.lineTo(win.x, win.y + win.h * 0.9); c.closePath(); c.fill();
  [0.3, 0.6].forEach((at) => {
    glow(c, win.x + win.w * (0.5 + (at - 0.45) * 0.2), win.y + win.h * (0.06 + at * 0.2), win.w * 0.22 * (1 - at * 0.5), 'rgba(255, 236, 190, 1)', 0.6);
  });
  mara(c, vx + win.w * 0.03, vy + win.h * 0.27, win.h * 0.52);
  // the gangway's dark bellows framing the view
  c.fillStyle = 'rgba(10, 7, 5, 0.92)';
  const bellows = new Path2D();
  bellows.rect(win.x, win.y, win.w, win.h);
  bellows.rect(win.x + win.w * 0.09, win.y + win.h * 0.06, win.w * 0.82, win.h * 0.9);
  c.fill(bellows, 'evenodd');
  c.strokeStyle = 'rgba(234, 223, 198, 0.12)';
  c.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    c.beginPath(); c.moveTo(win.x + win.w * 0.035 * i, win.y); c.lineTo(win.x + win.w * 0.035 * i, win.y + win.h); c.stroke();
    c.beginPath(); c.moveTo(win.x + win.w * (1 - 0.035 * i), win.y); c.lineTo(win.x + win.w * (1 - 0.035 * i), win.y + win.h); c.stroke();
  }
  // its glass: a sheen and a few beads
  c.fillStyle = 'rgba(200, 220, 240, 0.05)';
  c.beginPath(); c.moveTo(win.x + win.w * 0.2, win.y); c.lineTo(win.x + win.w * 0.4, win.y); c.lineTo(win.x + win.w * 0.1, win.y + win.h); c.lineTo(win.x - win.w * 0.1, win.y + win.h); c.closePath(); c.fill();
  c.restore();
  c.save();
  roundRectPath(c, win.x, win.y, win.w, win.h, 6);
  c.lineWidth = 3.5;
  c.strokeStyle = brassFill(c, win.x, win.y, win.w, win.h);
  c.stroke();
  c.restore();
  ink(c, [[win.x - 3, win.y - 3], [win.x + win.w + 3, win.y - 3], [win.x + win.w + 3, win.y + win.h + 3], [win.x - 3, win.y + win.h + 3]], { w: 1.2, alpha: 0.4, closed: true, bleed: false, seed: 6704 });
  // its warm light spilling onto the door round the window
  glow(c, win.x + win.w / 2, win.y + win.h / 2, win.h * 0.95, 'rgba(255, 170, 90, 0.9)', 0.12);
}

function partition(c, L) {
  if (L.partition == null) return;
  const { W, H } = L;
  const y = L.partition;
  // the back of the facing seat, in the near foreground: walnut, a brass rail
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.7)';
  c.shadowBlur = 24;
  c.shadowOffsetY = -6;
  c.fillStyle = '#1a100a';
  c.fillRect(-10, y, W + 20, H - y + 10);
  c.restore();
  wood(c, 0, y, W, H - y, { base: '#1d120b', vertical: true, seed: 6801, grain: 'rgba(0,0,0,0.32)' });
  c.fillStyle = brassFill(c, 0, y - 3, W, 7);
  c.fillRect(0, y - 3, W, 7);
  c.fillStyle = 'rgba(255, 240, 200, 0.5)';
  c.fillRect(0, y - 3, W, 1);
  c.fillStyle = vgrad(c, y, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]);
  c.fillRect(0, y, W, H - y);
}

// ---------------------------------------------------------------------------
// light and shade over the whole room

function roomLight(c, L) {
  const { W, H } = L;
  const b = L.butch;
  const lamp = b.lamp;
  // Butch's lamp: the warm pool on the bench, the case, his coat, the wall
  lightPass(c, (t) => {
    t.fillStyle = radial(t, lamp.x, lamp.glass, 260 * b.s, [[0, 'rgba(255, 176, 96, 0.55)'], [0.25, 'rgba(255, 160, 80, 0.22)'], [0.6, 'rgba(255, 150, 70, 0.07)'], [1, 'rgba(255, 150, 70, 0)']]);
    t.fillRect(0, 0, W, H);
    if (L.ceilingLamp) {
      const cl = L.ceilingLamp;
      t.fillStyle = radial(t, cl.x, cl.y + cl.size * 0.5, H * 0.62, [[0, 'rgba(255, 190, 110, 0.32)'], [0.4, 'rgba(255, 170, 90, 0.1)'], [1, 'rgba(255, 170, 90, 0)']]);
      t.fillRect(0, 0, W, H);
    }
  }, 'lighter');
  // shade: the far corners, the floor, the left of the room, under the bench
  lightPass(c, (t) => {
    t.fillStyle = '#ffffff';
    t.fillRect(0, 0, W, H);
    t.fillStyle = radial(t, b.x + 30 * b.s, b.y - 40 * b.s, Math.max(W, H) * 0.85, [[0, 'rgba(255,255,255,0)'], [0.45, 'rgba(120, 110, 120, 0.35)'], [1, 'rgba(30, 26, 34, 0.9)']]);
    t.fillRect(0, 0, W, H);
    t.fillStyle = vgrad(t, L.cushion, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(20, 14, 12, 0.7)']]);
    t.fillRect(0, L.cushion, W, H - L.cushion);
  }, 'multiply');
}

function ceilingLampSprite(L, k) {
  const cl = L.ceilingLamp;
  const size = cl.size;
  const len = cl.y - cl.top;
  const w = size * 1.4;
  const h = len + size * 0.9;
  const [element, c] = layer(w, h, k);
  const cx = w / 2;
  // the drop rod and its rose, the brass gallery, the frosted amber bowl
  c.strokeStyle = brassFill(c, cx - 2, 0, 4, len, true);
  c.lineWidth = Math.max(2, size * 0.05);
  c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, len); c.stroke();
  c.fillStyle = PAL.brassDark;
  c.fillRect(cx - size * 0.12, len - size * 0.06, size * 0.24, size * 0.1);
  c.fillStyle = brassFill(c, cx - size * 0.5, len, size, size * 0.18);
  c.beginPath(); c.moveTo(cx - size * 0.18, len); c.lineTo(cx + size * 0.18, len); c.lineTo(cx + size * 0.5, len + size * 0.2); c.lineTo(cx - size * 0.5, len + size * 0.2); c.closePath(); c.fill();
  c.fillStyle = vgrad(c, len + size * 0.2, len + size * 0.7, [[0, '#ffe8b4'], [0.6, '#f2b866'], [1, '#c98a46']]);
  c.beginPath(); c.moveTo(cx - size * 0.46, len + size * 0.2); c.quadraticCurveTo(cx - size * 0.44, len + size * 0.72, cx, len + size * 0.74); c.quadraticCurveTo(cx + size * 0.44, len + size * 0.72, cx + size * 0.46, len + size * 0.2); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255, 252, 235, 0.7)';
  c.beginPath(); c.ellipse(cx - size * 0.14, len + size * 0.36, size * 0.08, size * 0.14, 0.4, 0, TAU); c.fill();
  c.fillStyle = PAL.brass;
  c.beginPath(); c.arc(cx, len + size * 0.77, size * 0.05, 0, TAU); c.fill();
  ink(c, [[cx - size * 0.5, len + size * 0.2], [cx - size * 0.44, len + size * 0.6], [cx, len + size * 0.74], [cx + size * 0.44, len + size * 0.6], [cx + size * 0.5, len + size * 0.2], [cx - size * 0.5, len + size * 0.2]], { w: 1.3, alpha: 0.7, bleed: false, jitter: 0.15, seed: 6901 });
  return { element, w, h, pivot: [cx, 0] };
}

/** A copy of the room under the passing trackside lamp: warmer and brighter. */
function litCopy(room) {
  const lit = canvasOf(room.width, room.height);
  const c = lit.getContext('2d');
  c.drawImage(room, 0, 0);
  const warm = canvasOf(room.width, room.height);
  const w = warm.getContext('2d');
  w.fillStyle = 'rgba(255, 150, 70, 1)';
  w.fillRect(0, 0, warm.width, warm.height);
  w.globalCompositeOperation = 'destination-in';
  w.drawImage(room, 0, 0);
  c.globalCompositeOperation = 'screen';
  c.globalAlpha = 0.34;
  c.drawImage(warm, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  return lit;
}

// ---------------------------------------------------------------------------

/**
 * Paint every still layer for layout `L` at backing scale `k` and return the
 * frame drawer. The canvases are sized and placed here.
 */
export function paintScene({ L, k, cfg, canvases, root }) {
  const { outside, room, fx } = canvases;
  const M = GLASS_MARGIN;
  const g = L.glass;
  const gw = g.w + M * 2;
  const gh = g.h + M * 2;
  // the view outside is soft behind the wet glass: it is painted, and
  // redrawn every frame, at a lower resolution than the room
  const ko = k * OUTSIDE_SCALE;
  const size = (element, x, y, w, h, scale) => {
    element.width = Math.max(1, Math.round(w * scale));
    element.height = Math.max(1, Math.round(h * scale));
    Object.assign(element.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  };
  size(outside, g.x - M, g.y - M, gw, gh, ko);
  size(room, 0, 0, L.W, L.H, k);
  size(fx, 0, 0, L.W, L.H, k);

  // outside layers, glass-local (0, 0 is the glass's top left)
  const strip = (P, paint, scale = 1) => {
    const [element, c] = layer(P, gh, ko * scale);
    c.translate(0, M);
    paint(c, P);
    return { element, P };
  };
  const [sky, skyC] = layer(gw, gh, ko);
  skyC.translate(M, M);
  paintSky(skyC, L, g.w, g.h);
  const far = strip(Math.ceil(Math.max(gw * 1.4, 900)), (c, P) => paintFar(c, L, P, g.h), 0.75);
  const mid = strip(Math.ceil(Math.max(gw * 1.25, 900)), (c, P) => paintMid(c, L, P, g.h), 0.85);
  const near = strip(L.poleGap * LAMP_EVERY, (c, P) => paintNear(c, L, P, g.h));
  const rainTiles = [
    paintRainTile(256, ko, cfg.rainDensity, 6951, { min: 8, max: 30, alpha: 0.18 }),
    cfg.rainLayers > 1 ? paintRainTile(384, ko, cfg.rainDensity * 0.3, 6952, { min: 14, max: 40, alpha: 0.12, width: 1.4 }) : null,
  ].filter(Boolean);

  // the room
  const rc = room.getContext('2d');
  rc.setTransform(k, 0, 0, k, 0, 0);
  rc.clearRect(0, 0, L.W, L.H);
  walls(rc, L);
  rightWall(rc, L);
  floorBand(rc, L);
  rack(rc, L);
  endDoor(rc, L);
  windowFrame(rc, L);
  dado(rc, L);
  // the glass: cut it out, then put the water and the reflection back on it
  rc.save();
  rc.globalCompositeOperation = 'destination-out';
  rc.globalAlpha = 1;
  rc.fillStyle = '#000';
  roundRectPath(rc, g.x, g.y, g.w, g.h, g.r);
  rc.fill();
  rc.restore();
  glassOverlay(rc, L, cfg);
  seats(rc, L);
  windowTable(rc, L);
  paintButch(rc, L);
  paintCase(rc, L);
  paintButchHead(rc, L);
  paintTableLamp(rc, L);
  partition(rc, L);
  roomLight(rc, L);
  doorView(rc, L);
  // the lamp itself, bright on top of the light pass
  glow(rc, L.butch.lamp.x, L.butch.lamp.glass, 34 * L.butch.s, 'rgba(255, 214, 140, 1)', 0.55);
  speckle(rc, 0, 0, L.W, L.H, { count: Math.round((L.W * L.H) / 1500), color: 'rgba(255, 240, 210, 0.03)', size: 1.6, seed: 6990 });
  const lit = cfg.sweep ? litCopy(room) : null;
  const lampSprite = L.ceilingLamp ? ceilingLampSprite(L, k) : null;

  const oc = outside.getContext('2d');
  const fc = fx.getContext('2d');
  const patterns = rainTiles.map((tile) => oc.createPattern(tile, 'repeat'));
  const speedsRain = [[-150, 360], [-40, 70]];
  const plaque = root?.querySelector('.nf-menu');
  let plaqueLight = '';
  // the fx canvas starts clear; each frame clears only what the last one drew
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.clearRect(0, 0, fx.width, fx.height);
  const dirty = [];

  const drawStrip = (c, { element, P }, offset) => {
    const x = -(((offset % P) + P) % P);
    c.drawImage(element, x, -M, P, gh);
    if (x + P < gw) c.drawImage(element, x + P, -M, P, gh);
  };

  function drawFrame(state) {
    // outside, glass-local, swaying with the carriage
    oc.setTransform(ko, 0, 0, ko, 0, 0);
    oc.drawImage(sky, 0, 0, gw, gh);
    oc.translate(M, M + state.bob);
    drawStrip(oc, far, state.scroll.far);
    drawStrip(oc, mid, state.scroll.mid);
    drawStrip(oc, near, state.scroll.near);
    drawTrackLamps(oc, L, state.scroll.near, g.h);
    oc.setTransform(ko, 0, 0, ko, 0, 0);
    patterns.forEach((pattern, i) => {
      if (!pattern) return;
      const [vx, vy] = speedsRain[i];
      const span = i ? 384 : 256;
      const ox = ((state.t * vx) % span + span) % span;
      const oy = ((state.t * vy) % span + span) % span;
      if (pattern.setTransform && typeof DOMMatrix === 'function') pattern.setTransform(new DOMMatrix([1 / ko, 0, 0, 1 / ko, ox, oy]));
      oc.globalAlpha = i ? 0.55 : 0.75;
      oc.fillStyle = pattern;
      oc.fillRect(0, 0, gw, gh);
    });
    oc.globalAlpha = 1;

    // fx: the passing lamp's band of light, the ceiling lamp, his lamp's
    // flame. Only what was drawn last frame is cleared.
    fc.setTransform(k, 0, 0, k, 0, 0);
    dirty.forEach(([x, y, w, h]) => fc.clearRect(x - 2, y - 2, w + 4, h + 4));
    dirty.length = 0;
    const sweep = state.sweep;
    if (sweep && lit) {
      const skew = L.H * 0.22;
      const x0 = sweep.x - sweep.width / 2;
      const x1 = sweep.x + sweep.width / 2;
      const grad = fc.createLinearGradient(x0, 0, x1 + skew, 0);
      // a soft-edged band: smooth falloff either side of its bright core
      [[0, 0], [0.18, 0.08], [0.34, 0.45], [0.5, 1], [0.64, 0.6], [0.82, 0.12], [1, 0]].forEach(([at, a]) => {
        grad.addColorStop(at, `rgba(255,255,255,${(a * sweep.strength).toFixed(3)})`);
      });
      fc.fillStyle = grad;
      fc.beginPath();
      fc.moveTo(x0 + skew, 0); fc.lineTo(x1 + skew, 0); fc.lineTo(x1, L.H); fc.lineTo(x0, L.H); fc.closePath();
      fc.fill();
      fc.globalCompositeOperation = 'source-in';
      const sx = Math.max(0, x0);
      const sw = Math.min(L.W, x1 + skew) - sx;
      if (sw > 0) fc.drawImage(lit, sx * k, 0, sw * k, lit.height, sx, 0, sw, L.H);
      fc.globalCompositeOperation = 'source-over';
      dirty.push([x0, 0, x1 + skew - x0, L.H]);
    }
    if (lampSprite) {
      const cl = L.ceilingLamp;
      fc.save();
      fc.translate(cl.x, cl.top);
      fc.rotate(state.lampAngle);
      fc.drawImage(lampSprite.element, -lampSprite.pivot[0], 0, lampSprite.w, lampSprite.h);
      fc.restore();
      const bx = cl.x + Math.sin(state.lampAngle) * (cl.y - cl.top + cl.size * 0.45);
      const by = cl.y + cl.size * 0.45;
      glow(fc, bx, by, cl.size * 1.6, 'rgba(255, 210, 140, 0.9)', 0.32);
      const reach = Math.max(cl.size * 1.6, lampSprite.h);
      dirty.push([cl.x - reach, cl.top - 2, reach * 2, Math.max(lampSprite.h, by + cl.size * 1.6 - cl.top) + 4]);
    }
    const lamp = L.butch.lamp;
    const flame = 46 * L.butch.s;
    glow(fc, lamp.x, lamp.glass, flame, 'rgba(255, 200, 120, 0.9)', 0.1 + state.flicker * 0.08);
    dirty.push([lamp.x - flame, lamp.glass - flame, flame * 2, flame * 2]);
    // the plaque catches the band too
    if (plaque) {
      let value = '';
      if (sweep) {
        const p = L.plaque;
        const rel = (sweep.x + L.H * 0.11 - p.x) / p.w;
        if (rel > -0.6 && rel < 1.6) value = `${(rel * 100).toFixed(1)}% ${(sweep.strength * 0.5).toFixed(3)}`;
      }
      if (value !== plaqueLight) {
        plaqueLight = value;
        const [at, strength] = value ? value.split(' ') : ['-50%', '0'];
        plaque.style.setProperty('--nf-sweep-x', at);
        plaque.style.setProperty('--nf-sweep', strength);
      }
    }
  }
  return { drawFrame };
}
