// Chapter 6 world dressing for Movements III and IV, in the finale's one
// painted-card style (the same hand as Movements I and II: canvas paintings
// with inked edges, laid on the floor or stood up as cards).
//
//   III · ECHO CITY (Chapter 3's palette): a sandstone terrace at dusk over
//   the square, the paving grooves of Mara's two-line ground message, iron
//   lamps, the tram shelter, a market stall, the campfire with its
//   mismatched cups, and the old town behind the Conductor: mansard roofs,
//   the clock that runs seven minutes slow, the ministry.
//
//   IV · THE PAINTED COUNTRY (Chapter 4's paper palette): a drafted sheet
//   with Rosa's gouache on it and the archive's grey wash painted over parts
//   of it, the line ahead, the orchard, the hawthorn (Mara's mark) and the
//   orchard house at Bellwether.
//
// Every function returns a plain canvas; spectacleBattle.js makes textures.
// The floor painters are step generators (each `yield` is a point where the
// loader may hand the main thread back).

import { glow, ink, inkEllipse, rng, roundRectPath, speckle, vgrad } from '../nightService/art/ink.js';
import { PAPER } from '../paintedCountry/paperPalette.js';
import { makeCanvas } from './finaleArt.js';

const TAU = Math.PI * 2;
const hex = (n, a = 1) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;

// Chapter 3 · Echo City (cars/presentCity3d/city3dConfig.js CITY_PALETTE),
// plus the terracotta walls and slate mansards of its old town.
export const ECHO = Object.freeze({
  sky: '#1a0f10', dusk: '#3a1d1a', horizon: '#7a3e2c', fog: '#241517',
  stone: '#c8a370', stoneDusk: '#7f6445', stoneEdge: '#765332', mortar: '#35261a',
  street: '#2a2021', bronze: '#65452f', iron: '#1b2221', patina: '#2c6d67', water: '#285f65',
  amber: '#f0b45f', wine: '#71352f', terracotta: '#9a5236', terracottaDark: '#6e3a27', slate: '#56605b', slateDark: '#353d3a',
  ink: '#120a08',
});

// Chapter 4 · the paper sheet (paintedCountry/paperPalette.js PAPER).
export const PAINTED = Object.freeze({
  sheetHigh: hex(PAPER.sheetHigh), sheet: hex(PAPER.sheet), sheetMid: hex(PAPER.sheetMid), sheetLow: hex(PAPER.sheetLow),
  fold: hex(PAPER.fold), deckle: hex(PAPER.deckle),
  graphite: hex(PAPER.graphite), graphiteSoft: hex(PAPER.graphiteSoft), graphiteFaint: hex(PAPER.graphiteFaint),
  bookCloth: hex(PAPER.bookCloth), kraft: hex(PAPER.kraft), manilla: hex(PAPER.manilla),
  boneBlack: hex(PAPER.boneBlack), indigo: hex(PAPER.indigo), verdigris: hex(PAPER.verdigris),
  coral: '#e07a66', ochre: '#e3a24a', apple: '#c65a44', archiveGrey: 'rgba(150, 146, 138, 0.55)',
});

// ============================================================ helpers

function cobbles(c, x0, y0, w, h, { size = 20, base = [128, 101, 70], spread = 22, mortar = ECHO.mortar, seed = 3, rowStart = 0, rowEnd = Infinity } = {}) {
  const random = rng(seed);
  const rows = Math.ceil(h / size);
  for (let row = 0; row < rows; row += 1) {
    const y = y0 + row * size;
    const off = row % 2 ? size * 0.5 : 0;
    const draw = row >= rowStart && row < rowEnd;
    for (let x = x0 - off; x < x0 + w; x += size) {
      const k = (random() - 0.5) * spread;
      const warm = random() * 10;
      if (!draw) continue;
      c.fillStyle = `rgb(${Math.round(base[0] + k + warm)},${Math.round(base[1] + k)},${Math.round(base[2] + k - warm * 0.4)})`;
      roundRectPath(c, x + 1.2, y + 1.2, size - 2.4, size - 2.4, size * 0.28);
      c.fill();
    }
  }
  void mortar;
}

// A stand-up card: a transparent canvas, the prop drawn with its feet on the
// bottom edge.
function card(wm, hm, pxPerM = 128) {
  const canvas = makeCanvas(wm * pxPerM, hm * pxPerM);
  const c = canvas.getContext('2d');
  return { canvas, c, W: canvas.width, H: canvas.height, S: pxPerM };
}

function shadowUnder(c, x, y, rx, ry, alpha = 0.4) {
  c.save();
  c.fillStyle = `rgba(0,0,0,${alpha})`;
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
  c.restore();
}

// ============================================================ III · ECHO CITY

// The terrace floor. World → canvas: u = (x + 16) * S, v = (z + 8) * S.
export const ECHO_FLOOR = Object.freeze({ x0: -16, x1: 16, z0: -8, z1: 10, S: 64 });

export function* echoTerraceSteps({ lamps = [] } = {}) {
  const { x0, x1, z0, z1, S } = ECHO_FLOOR;
  const W = (x1 - x0) * S;
  const H = (z1 - z0) * S;
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const u = (x) => (x - x0) * S;
  const v = (z) => (z - z0) * S;
  // mortar under everything, then the cobbles in bands
  c.fillStyle = ECHO.mortar;
  c.fillRect(0, 0, W, H);
  const bands = 4;
  const rows = Math.ceil(H / 22);
  for (let band = 0; band < bands; band += 1) {
    cobbles(c, 0, 0, W, H, { size: 22, base: [116, 92, 64], spread: 26, seed: 11, rowStart: Math.floor((rows * band) / bands), rowEnd: Math.floor((rows * (band + 1)) / bands) });
    yield;
  }
  // two pale sandstone paving bands across the terrace (the city's civic slabs)
  const random = rng(19);
  for (const z of [-2.4, 5.6]) {
    const top = v(z);
    const bandH = 1.3 * S;
    for (let x = 0; x < W; x += 0.9 * S + random() * 0.5 * S) {
      const slabW = 0.8 * S + random() * 0.4 * S;
      c.fillStyle = `rgb(${150 + random() * 16},${122 + random() * 12},${88 + random() * 10})`;
      c.fillRect(x + 2, top + 2, slabW - 4, bandH - 4);
    }
    ink(c, [[0, top], [W, top + 1]], { w: 2, color: ECHO.stoneEdge, alpha: 0.7, bleed: false, jitter: 0.8, seed: 31 });
    ink(c, [[0, top + bandH], [W, top + bandH]], { w: 2, color: ECHO.stoneEdge, alpha: 0.7, bleed: false, jitter: 0.8, seed: 32 });
  }
  yield;
  // Mara's ground message: two rows of letter channels cut into the paving
  // near the front edge. The upper row burns; the lower row is dark.
  const rowZ = [-6.55, -5.85];
  rowZ.forEach((z, rowIndex) => {
    const y = v(z);
    const r = rng(40 + rowIndex);
    let x = u(-11.5);
    while (x < u(11.5)) {
      const word = 3 + Math.floor(r() * 5);
      for (let letter = 0; letter < word && x < u(11.5); letter += 1) {
        const lw = 0.34 * S + r() * 0.18 * S;
        c.fillStyle = 'rgba(22, 14, 10, 0.9)';
        c.fillRect(x, y - 3, lw, 6);
        if (r() > 0.5) c.fillRect(x + lw * 0.5 - 2, y - 11, 4, 16);
        if (rowIndex === 0) {
          c.save();
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = 'rgba(240, 160, 70, 0.55)';
          c.fillRect(x, y - 1.5, lw, 3);
          c.restore();
          glow(c, x + lw / 2, y, 18, 'rgba(240, 170, 80, 0.8)', 0.18);
        }
        x += lw + 0.1 * S;
      }
      x += 0.45 * S;
    }
  });
  yield;
  // warm lamp pools and the long dusk shadow toward the camera
  lamps.forEach(({ x, z, r = 3.2 }) => glow(c, u(x), v(z), r * S, 'rgba(255, 190, 110, 0.9)', 0.3));
  c.fillStyle = vgrad(c, 0, H, [[0, 'rgba(40, 20, 16, 0)'], [0.7, 'rgba(20, 10, 8, 0.12)'], [1, 'rgba(12, 6, 5, 0.42)']]);
  c.fillRect(0, 0, W, H);
  // the parapet over the square: a pale ledge, inked
  c.fillStyle = '#b89468';
  c.fillRect(0, 0, W, 0.34 * S);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(0, 0.34 * S, W, 6);
  for (let x = 0; x < W; x += 1.6 * S) ink(c, [[x, 0], [x, 0.34 * S]], { w: 1.4, color: ECHO.stoneEdge, alpha: 0.8, bleed: false, seed: 50 + x });
  ink(c, [[-4, 0.34 * S], [W + 4, 0.34 * S + 1]], { w: 3.2, color: ECHO.ink, alpha: 0.85, bleed: false, jitter: 0.9, seed: 57 });
  speckle(c, 0, 0, W, H, { count: 5200, color: 'rgba(255, 230, 190, 0.05)', size: 2, seed: 58 });
  return canvas;
}

// The square below the terrace (y = -2.8): darker cobbles, tram rails and the
// fountain, seen past the parapet. World → canvas over x ±30, z -8 → -40.
export const ECHO_SQUARE = Object.freeze({ x0: -30, x1: 30, z0: -40, z1: -8, S: 24 });

export function paintEchoSquare() {
  const { x0, x1, z0, z1, S } = ECHO_SQUARE;
  const W = (x1 - x0) * S;
  const H = (z1 - z0) * S;
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const u = (x) => (x - x0) * S;
  const v = (z) => (z - z0) * S;
  c.fillStyle = '#1d1512';
  c.fillRect(0, 0, W, H);
  cobbles(c, 0, 0, W, H, { size: 12, base: [70, 55, 42], spread: 18, seed: 61 });
  // tram rails across the square
  [-19.5, -18.7].forEach((z) => { c.fillStyle = 'rgba(176, 138, 74, 0.55)'; c.fillRect(0, v(z), W, 3); });
  // the fountain: basin, water, the bronze centre
  const fx = u(7);
  const fz = v(-25);
  shadowUnder(c, fx, fz + 8, 4.2 * S, 2.6 * S, 0.35);
  c.fillStyle = '#8c7152';
  c.beginPath(); c.ellipse(fx, fz, 3.8 * S, 2.3 * S, 0, 0, TAU); c.fill();
  c.fillStyle = ECHO.water;
  c.beginPath(); c.ellipse(fx, fz, 3.2 * S, 1.9 * S, 0, 0, TAU); c.fill();
  glow(c, fx - S, fz - S * 0.5, 1.8 * S, 'rgba(160, 220, 215, 0.8)', 0.18);
  c.fillStyle = ECHO.bronze;
  c.beginPath(); c.ellipse(fx, fz, 0.7 * S, 0.45 * S, 0, 0, TAU); c.fill();
  inkEllipse(c, fx, fz, 3.8 * S, 2.3 * S, { w: 2, color: ECHO.ink, alpha: 0.8, bleed: false });
  // lamp pools along the square
  [[-20, -12], [-6, -14], [14, -13], [22, -30], [-16, -32]].forEach(([x, z]) => glow(c, u(x), v(z), 4 * S, 'rgba(255, 184, 100, 0.9)', 0.22));
  // it falls away into the dusk toward the town
  c.fillStyle = vgrad(c, 0, H, [[0, 'rgba(36, 21, 23, 0.9)'], [0.55, 'rgba(36, 21, 23, 0.25)'], [1, 'rgba(36, 21, 23, 0)']]);
  c.fillRect(0, 0, W, H);
  return canvas;
}

// The parapet's face, dropping from the terrace to the square.
export function paintEchoParapet({ width = 32, height = 2.8, S = 48 } = {}) {
  const W = width * S;
  const H = height * S;
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const random = rng(71);
  c.fillStyle = '#6d5238';
  c.fillRect(0, 0, W, H);
  const course = 0.46 * S;
  for (let y = 0, row = 0; y < H; y += course, row += 1) {
    for (let x = row % 2 ? -0.6 * S : 0; x < W; x += 1.2 * S) {
      c.fillStyle = `rgb(${120 + random() * 26},${92 + random() * 18},${62 + random() * 12})`;
      c.fillRect(x + 2, y + 2, 1.2 * S - 4, course - 4);
    }
  }
  c.fillStyle = vgrad(c, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10, 6, 5, 0.75)']]);
  c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(44, 109, 103, 0.35)';
  for (let x = 0; x < W; x += 30 + random() * 60) c.fillRect(x, H * 0.62, 4 + random() * 10, H * 0.38);
  ink(c, [[-4, 3], [W + 4, 4]], { w: 3, color: ECHO.ink, alpha: 0.9, bleed: false, jitter: 0.9, seed: 72 });
  return canvas;
}

// The old town behind the Conductor, at dusk.
export function paintEchoSkyline({ W = 2400, H = 1000 } = {}) {
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const random = rng(81);
  c.fillStyle = vgrad(c, 0, H, [[0, '#0f0809'], [0.42, ECHO.sky], [0.72, ECHO.dusk], [0.9, ECHO.horizon], [1, '#2a1715']]);
  c.fillRect(0, 0, W, H);
  glow(c, W * 0.7, H * 0.8, 700, 'rgba(240, 150, 90, 0.8)', 0.18);
  // far roofs, flat and cool
  c.fillStyle = '#2a1a1b';
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W; x += 60 + random() * 70) c.lineTo(x, H * (0.6 + random() * 0.06));
  c.lineTo(W, H);
  c.closePath();
  c.fill();
  const baseY = H * 0.93;
  // the mansard blocks, terracotta under slate, with dormers and lit windows
  const building = (x, w, h, { tower = false } = {}) => {
    const top = baseY - h;
    const roofH = Math.min(120, h * 0.26);
    c.fillStyle = random() > 0.5 ? ECHO.terracotta : ECHO.terracottaDark;
    c.fillRect(x, top + roofH, w, h - roofH);
    // slate mansard
    c.fillStyle = ECHO.slate;
    c.beginPath(); c.moveTo(x - 8, top + roofH); c.lineTo(x + 18, top); c.lineTo(x + w - 18, top); c.lineTo(x + w + 8, top + roofH); c.closePath(); c.fill();
    c.fillStyle = ECHO.slateDark;
    c.fillRect(x - 8, top + roofH - 6, w + 16, 8);
    // dormers
    for (let dx = x + 26; dx < x + w - 40; dx += 58) {
      c.fillStyle = ECHO.slateDark;
      c.beginPath(); c.moveTo(dx, top + roofH - 8); c.lineTo(dx + 14, top + 18); c.lineTo(dx + 28, top + roofH - 8); c.closePath(); c.fill();
      c.fillStyle = random() > 0.6 ? 'rgba(255, 196, 110, 0.9)' : '#1a1110';
      c.fillRect(dx + 9, top + roofH - 36, 10, 18);
    }
    // chimneys
    for (let k = 0; k < 2; k += 1) {
      const cx = x + 20 + random() * (w - 50);
      c.fillStyle = ECHO.terracottaDark;
      c.fillRect(cx, top - 26, 16, 30);
      c.fillStyle = '#3a2016';
      c.fillRect(cx - 3, top - 30, 22, 6);
    }
    // windows in rows, a few lit
    for (let wy = top + roofH + 26; wy < baseY - 70; wy += 58) {
      for (let wx = x + 18; wx < x + w - 26; wx += 40) {
        const lit = random() > 0.62;
        c.fillStyle = lit ? 'rgba(255, 196, 110, 0.95)' : 'rgba(26, 16, 14, 0.9)';
        c.fillRect(wx, wy, 16, 30);
        if (lit) glow(c, wx + 8, wy + 15, 26, 'rgba(255, 190, 110, 0.9)', 0.25);
        c.fillStyle = 'rgba(12, 8, 6, 0.8)';
        c.fillRect(wx - 3, wy + 30, 22, 4); // balcony rail
      }
    }
    // an arcade at street level
    for (let ax = x + 10; ax < x + w - 40; ax += 46) {
      c.fillStyle = 'rgba(18, 11, 9, 0.9)';
      c.beginPath(); c.moveTo(ax, baseY); c.lineTo(ax, baseY - 46); c.arc(ax + 18, baseY - 46, 18, Math.PI, 0); c.lineTo(ax + 36, baseY); c.closePath(); c.fill();
      if (random() > 0.55) glow(c, ax + 18, baseY - 24, 30, 'rgba(255, 184, 100, 0.9)', 0.3);
    }
    ink(c, [[x, top + roofH], [x, baseY], [x + w, baseY], [x + w, top + roofH]], { w: 2.4, color: ECHO.ink, alpha: 0.85, bleed: false, jitter: 0.6, seed: Math.round(x) });
    ink(c, [[x - 8, top + roofH], [x + 18, top], [x + w - 18, top], [x + w + 8, top + roofH]], { w: 2.4, color: ECHO.ink, alpha: 0.85, bleed: false, jitter: 0.6, seed: Math.round(x) + 1 });
    void tower;
  };
  let x = -40;
  const spans = [];
  while (x < W + 40) {
    const w = 190 + random() * 170;
    spans.push([x, w]);
    x += w + 14 + random() * 20;
  }
  spans.forEach(([bx, bw], index) => building(bx, bw, 330 + ((index * 97) % 150) + random() * 60));
  // the clock tower, left of centre: the clock that runs seven minutes slow
  const tx = W * 0.3;
  const tw = 120;
  const tTop = baseY - 690;
  c.fillStyle = '#8a4a31';
  c.fillRect(tx, tTop + 90, tw, baseY - tTop - 90);
  c.fillStyle = ECHO.slate;
  c.beginPath(); c.moveTo(tx - 12, tTop + 92); c.lineTo(tx + tw / 2, tTop - 30); c.lineTo(tx + tw + 12, tTop + 92); c.closePath(); c.fill();
  c.fillStyle = '#e8d3a6';
  c.beginPath(); c.arc(tx + tw / 2, tTop + 160, 40, 0, TAU); c.fill();
  glow(c, tx + tw / 2, tTop + 160, 90, 'rgba(255, 210, 140, 0.9)', 0.3);
  c.strokeStyle = ECHO.ink; c.lineWidth = 5; c.lineCap = 'round';
  // twelve-past-nine hands, the minute hand seven minutes behind
  const hand = (angle, length) => { c.beginPath(); c.moveTo(tx + tw / 2, tTop + 160); c.lineTo(tx + tw / 2 + Math.cos(angle) * length, tTop + 160 + Math.sin(angle) * length); c.stroke(); };
  hand(-Math.PI / 2 + TAU * (5 / 60), 32);
  hand(-Math.PI / 2 + TAU * (9.1 / 12), 22);
  inkEllipse(c, tx + tw / 2, tTop + 160, 40, 40, { w: 3, color: ECHO.ink, alpha: 0.9, bleed: false });
  ink(c, [[tx, tTop + 90], [tx, baseY], [tx + tw, baseY], [tx + tw, tTop + 90]], { w: 3, color: ECHO.ink, alpha: 0.9, bleed: false });
  // the ministry, right: pediment and columns, lamps at the steps
  const mx = W * 0.64;
  const mw = 420;
  const mTop = baseY - 380;
  c.fillStyle = '#b39067';
  c.fillRect(mx, mTop + 70, mw, baseY - mTop - 70);
  c.fillStyle = '#a2805a';
  c.beginPath(); c.moveTo(mx - 20, mTop + 72); c.lineTo(mx + mw / 2, mTop); c.lineTo(mx + mw + 20, mTop + 72); c.closePath(); c.fill();
  for (let k = 0; k < 7; k += 1) {
    const cx = mx + 30 + k * ((mw - 60) / 6);
    c.fillStyle = '#d2b489';
    c.fillRect(cx - 12, mTop + 90, 24, baseY - mTop - 110);
    c.fillStyle = 'rgba(20, 12, 8, 0.55)';
    if (k < 6) c.fillRect(cx + 12, mTop + 100, (mw - 60) / 6 - 24, baseY - mTop - 120);
  }
  c.fillStyle = 'rgba(255, 196, 110, 0.9)';
  c.fillRect(mx + mw / 2 - 26, baseY - 110, 52, 90);
  glow(c, mx + mw / 2, baseY - 60, 160, 'rgba(255, 190, 110, 0.9)', 0.3);
  ink(c, [[mx - 20, mTop + 72], [mx + mw / 2, mTop], [mx + mw + 20, mTop + 72], [mx - 20, mTop + 72]], { w: 3, color: ECHO.ink, alpha: 0.9, bleed: false });
  ink(c, [[mx, mTop + 72], [mx, baseY], [mx + mw, baseY], [mx + mw, mTop + 72]], { w: 3, color: ECHO.ink, alpha: 0.9, bleed: false });
  // the street line and a low haze
  c.fillStyle = '#140c0b';
  c.fillRect(0, baseY, W, H - baseY);
  c.fillStyle = vgrad(c, H * 0.55, H, [[0, 'rgba(36, 21, 23, 0)'], [1, 'rgba(58, 29, 26, 0.55)']]);
  c.fillRect(0, H * 0.55, W, H * 0.45);
  return canvas;
}

// Stand-up props for the terrace.
export function paintEchoProp(kind) {
  if (kind === 'lamp') {
    const { canvas, c, W, H, S } = card(1.1, 4.4);
    const x = W / 2;
    shadowUnder(c, x, H - 6, 0.4 * S, 0.08 * S);
    c.fillStyle = ECHO.iron;
    c.fillRect(x - 5, 0.6 * S, 10, H - 0.6 * S - 8);
    c.fillRect(x - 16, H - 30, 32, 22);
    c.fillStyle = '#2c3534';
    c.fillRect(x - 10, 0.66 * S, 20, 14);
    glow(c, x, 0.42 * S, 0.9 * S, 'rgba(255, 214, 150, 0.9)', 0.55);
    c.fillStyle = '#fff1d0';
    c.beginPath(); c.arc(x, 0.42 * S, 0.2 * S, 0, TAU); c.fill();
    ink(c, [[x, 0.66 * S], [x, H - 10]], { w: 2, color: '#0a0707', alpha: 0.9, bleed: false });
    inkEllipse(c, x, 0.42 * S, 0.2 * S, 0.2 * S, { w: 2, color: ECHO.ink, alpha: 0.7, bleed: false });
    return canvas;
  }
  if (kind === 'shelter') {
    const { canvas, c, W, H, S } = card(3.6, 3.2);
    shadowUnder(c, W / 2, H - 8, 1.6 * S, 0.14 * S);
    c.fillStyle = '#b89c78';
    c.fillRect(0.1 * S, H - 0.28 * S, W - 0.2 * S, 0.22 * S);
    [0.35, W / S - 0.35].forEach((px) => { c.fillStyle = ECHO.iron; c.fillRect(px * S - 5, 0.72 * S, 10, H - 1.0 * S); });
    c.fillStyle = '#6f8a8a';
    c.beginPath(); c.moveTo(0, 0.8 * S); c.lineTo(0.3 * S, 0.3 * S); c.lineTo(W - 0.3 * S, 0.3 * S); c.lineTo(W, 0.8 * S); c.closePath(); c.fill();
    c.fillStyle = 'rgba(200, 230, 225, 0.12)';
    c.fillRect(0.45 * S, 0.85 * S, W - 0.9 * S, 1.3 * S);
    // the route board, a number painted over twice
    c.fillStyle = '#e8dcc0';
    c.fillRect(W / 2 - 0.45 * S, 1.05 * S, 0.9 * S, 0.5 * S);
    c.fillStyle = ECHO.wine;
    c.font = `700 ${Math.round(0.3 * S)}px "Space Mono", monospace`;
    c.textAlign = 'center';
    c.fillText('17', W / 2, 1.43 * S);
    ink(c, [[0, 0.8 * S], [0.3 * S, 0.3 * S], [W - 0.3 * S, 0.3 * S], [W, 0.8 * S], [0, 0.8 * S]], { w: 2.6, color: ECHO.ink, alpha: 0.85, bleed: false });
    return canvas;
  }
  if (kind === 'stall') {
    const { canvas, c, W, H, S } = card(2.8, 2.6);
    shadowUnder(c, W / 2, H - 6, 1.3 * S, 0.12 * S);
    c.fillStyle = '#5a3c26';
    c.fillRect(0.2 * S, 1.3 * S, W - 0.4 * S, H - 1.36 * S);
    // the awning, wine and cream stripes
    for (let i = 0; i < 7; i += 1) {
      c.fillStyle = i % 2 ? '#e8d6b0' : ECHO.wine;
      c.beginPath();
      const x = (i * W) / 7;
      c.moveTo(x, 0.35 * S); c.lineTo(x + W / 7, 0.35 * S); c.lineTo(x + W / 7, 0.85 * S); c.quadraticCurveTo(x + W / 14, 1.02 * S, x, 0.85 * S); c.closePath(); c.fill();
    }
    // crates and produce
    for (let i = 0; i < 3; i += 1) {
      const x = 0.35 * S + i * 0.72 * S;
      c.fillStyle = '#8c6a44';
      c.fillRect(x, 1.35 * S, 0.62 * S, 0.42 * S);
      c.fillStyle = ['#c65a44', '#d9a441', '#6f9c5b'][i];
      for (let k = 0; k < 5; k += 1) { c.beginPath(); c.arc(x + 0.1 * S + k * 0.1 * S, 1.36 * S, 0.06 * S, 0, TAU); c.fill(); }
    }
    glow(c, W / 2, 1.2 * S, 1.2 * S, 'rgba(255, 190, 110, 0.9)', 0.22);
    ink(c, [[0.2 * S, 1.3 * S], [0.2 * S, H - 6], [W - 0.2 * S, H - 6], [W - 0.2 * S, 1.3 * S]], { w: 2.4, color: ECHO.ink, alpha: 0.85, bleed: false });
    return canvas;
  }
  if (kind === 'bench') {
    const { canvas, c, W, H, S } = card(2.4, 1.2);
    shadowUnder(c, W / 2, H - 6, 1.1 * S, 0.1 * S);
    c.fillStyle = '#6b4a2e';
    for (let i = 0; i < 3; i += 1) c.fillRect(0.1 * S, 0.25 * S + i * 0.14 * S, W - 0.2 * S, 0.1 * S);
    c.fillRect(0.1 * S, 0.7 * S, W - 0.2 * S, 0.12 * S);
    c.fillStyle = ECHO.iron;
    [0.25, W / S - 0.25].forEach((px) => c.fillRect(px * S - 6, 0.6 * S, 12, H - 0.66 * S));
    ink(c, [[0.1 * S, 0.7 * S], [W - 0.1 * S, 0.7 * S]], { w: 2, color: ECHO.ink, alpha: 0.8, bleed: false });
    return canvas;
  }
  if (kind === 'campfire') {
    const { canvas, c, W, H, S } = card(2, 1.3);
    const x = W / 2;
    const y = H - 0.25 * S;
    glow(c, x, y - 0.2 * S, 1.2 * S, 'rgba(255, 170, 80, 0.9)', 0.5);
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * TAU;
      c.fillStyle = '#5f5448';
      c.beginPath(); c.ellipse(x + Math.cos(a) * 0.45 * S, y + Math.sin(a) * 0.14 * S, 0.1 * S, 0.07 * S, 0, 0, TAU); c.fill();
    }
    c.fillStyle = '#ffb35a';
    c.beginPath(); c.moveTo(x - 0.2 * S, y); c.quadraticCurveTo(x - 0.05 * S, y - 0.5 * S, x, y - 0.8 * S); c.quadraticCurveTo(x + 0.08 * S, y - 0.45 * S, x + 0.22 * S, y); c.closePath(); c.fill();
    c.fillStyle = '#fff0c0';
    c.beginPath(); c.moveTo(x - 0.08 * S, y); c.quadraticCurveTo(x, y - 0.3 * S, x + 0.02 * S, y - 0.45 * S); c.quadraticCurveTo(x + 0.06 * S, y - 0.25 * S, x + 0.1 * S, y); c.closePath(); c.fill();
    // the ring of mismatched cups, and the kettle someone will come back for
    ['#e8dcc0', '#71352f', '#2c6d67', '#d9a441'].forEach((color, i) => {
      c.fillStyle = color;
      c.fillRect(0.12 * S + i * 0.16 * S, y - 0.08 * S, 0.1 * S, 0.12 * S);
    });
    c.fillStyle = '#3a3a36';
    c.beginPath(); c.ellipse(W - 0.35 * S, y - 0.1 * S, 0.16 * S, 0.12 * S, 0, 0, TAU); c.fill();
    return canvas;
  }
  // clock post
  const { canvas, c, W, H, S } = card(1.2, 4.2);
  const x = W / 2;
  shadowUnder(c, x, H - 6, 0.4 * S, 0.08 * S);
  c.fillStyle = ECHO.iron;
  c.fillRect(x - 6, 1.1 * S, 12, H - 1.16 * S);
  c.fillStyle = ECHO.bronze;
  c.beginPath(); c.arc(x, 0.6 * S, 0.45 * S, 0, TAU); c.fill();
  c.fillStyle = '#efe0bd';
  c.beginPath(); c.arc(x, 0.6 * S, 0.36 * S, 0, TAU); c.fill();
  glow(c, x, 0.6 * S, 0.7 * S, 'rgba(255, 214, 150, 0.9)', 0.25);
  c.strokeStyle = ECHO.ink; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, 0.6 * S); c.lineTo(x + Math.cos(-Math.PI / 2 + TAU * (53 / 60)) * 0.28 * S, 0.6 * S + Math.sin(-Math.PI / 2 + TAU * (53 / 60)) * 0.28 * S); c.stroke();
  c.beginPath(); c.moveTo(x, 0.6 * S); c.lineTo(x + Math.cos(-Math.PI / 2 + TAU * (8.9 / 12)) * 0.18 * S, 0.6 * S + Math.sin(-Math.PI / 2 + TAU * (8.9 / 12)) * 0.18 * S); c.stroke();
  inkEllipse(c, x, 0.6 * S, 0.45 * S, 0.45 * S, { w: 2.4, color: ECHO.ink, alpha: 0.85, bleed: false });
  return canvas;
}

// ============================================================ IV · THE PAINTED COUNTRY

export const PAINTED_FLOOR = Object.freeze({ x0: -16, x1: 16, z0: -8, z1: 10, S: 64 });

function gouache(c, x, y, rx, ry, color, { seed = 1, alpha = 0.72, lobes = 9 } = {}) {
  const random = rng(seed);
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i <= lobes; i += 1) {
    const a = (i / lobes) * TAU;
    const k = 0.78 + random() * 0.34;
    const px = x + Math.cos(a) * rx * k;
    const py = y + Math.sin(a) * ry * k;
    if (i === 0) c.moveTo(px, py); else c.quadraticCurveTo(x + Math.cos(a - 0.35) * rx * 1.12, y + Math.sin(a - 0.35) * ry * 1.12, px, py);
  }
  c.closePath();
  c.fill();
  // a dry-brush edge
  c.globalAlpha = alpha * 0.4;
  for (let i = 0; i < 26; i += 1) {
    const a = random() * TAU;
    c.fillRect(x + Math.cos(a) * rx * (0.9 + random() * 0.25), y + Math.sin(a) * ry * (0.9 + random() * 0.25), 3 + random() * 5, 2 + random() * 3);
  }
  c.restore();
}

function graphite(c, points, { w = 1.6, alpha = 0.8, color = PAINTED.graphite, seed = 1 } = {}) {
  ink(c, points, { w, color, alpha, bleed: false, jitter: 0.7, seed });
  // the draughtsman's overshoot at both ends
  if (points.length >= 2) {
    const [a, b] = [points[0], points[1]];
    const [y, z] = [points[points.length - 1], points[points.length - 2]];
    const over = (p, q) => { const dx = p[0] - q[0]; const dy = p[1] - q[1]; const l = Math.hypot(dx, dy) || 1; return [p[0] + (dx / l) * 10, p[1] + (dy / l) * 10]; };
    ink(c, [a, over(a, b)], { w: w * 0.6, color, alpha: alpha * 0.5, bleed: false, jitter: 0.2, seed: seed + 1 });
    ink(c, [y, over(y, z)], { w: w * 0.6, color, alpha: alpha * 0.5, bleed: false, jitter: 0.2, seed: seed + 2 });
  }
}

export function* paintedSheetSteps() {
  const { x0, x1, z0, z1, S } = PAINTED_FLOOR;
  const W = (x1 - x0) * S;
  const H = (z1 - z0) * S;
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const u = (x) => (x - x0) * S;
  const v = (z) => (z - z0) * S;
  const random = rng(101);
  c.fillStyle = vgrad(c, 0, H, [[0, PAINTED.sheet], [1, PAINTED.sheetLow]]);
  c.fillRect(0, 0, W, H);
  speckle(c, 0, 0, W, H, { count: 7000, color: 'rgba(120, 100, 70, 0.05)', size: 1.6, seed: 102 });
  yield;
  // the drafted perspective grid the child's drawing sits on
  for (let x = -16; x <= 16; x += 2) graphite(c, [[u(x), 0], [u(x * 1.08), H]], { w: 1, alpha: 0.18, color: PAINTED.graphiteFaint, seed: 110 + x });
  for (let z = -8; z <= 10; z += 2) graphite(c, [[0, v(z)], [W, v(z) + 2]], { w: 1, alpha: 0.18, color: PAINTED.graphiteFaint, seed: 140 + z });
  yield;
  // Rosa's gouache: meadow greens, the ochre path, a coral bed of flowers
  [[-9, 5, 5.5, 3.2], [8, 6.5, 6, 2.6], [-11, -3, 4, 2.4], [11, -2, 4.2, 2.6], [0, 8.6, 7, 1.6]].forEach(([x, z, rx, rz], i) => gouache(c, u(x), v(z), rx * S, rz * S, PAINTED.verdigris, { seed: 160 + i, alpha: 0.42 }));
  yield;
  c.save();
  c.globalAlpha = 0.45;
  c.strokeStyle = PAINTED.ochre;
  c.lineCap = 'round';
  c.lineWidth = 1.5 * S;
  c.beginPath(); c.moveTo(u(-2), H + 20); c.bezierCurveTo(u(-1), v(4), u(3), v(1), u(1.5), v(-5.2)); c.stroke();
  c.restore();
  [[-4.5, 2.5], [5.5, 3.8], [-7.5, 7.5]].forEach(([x, z], i) => gouache(c, u(x), v(z), 1.4 * S, 0.8 * S, PAINTED.coral, { seed: 190 + i, alpha: 0.5, lobes: 7 }));
  yield;
  // the archive's grey wash, painted over part of the drawing
  c.save();
  c.globalAlpha = 0.5;
  c.fillStyle = PAINTED.archiveGrey;
  [[-13, -1, 6, 1.2, -0.2], [9, 3, 7, 1, 0.12], [-3, 6.4, 5, 0.8, 0.05]].forEach(([x, z, len, th, rot]) => {
    c.save();
    c.translate(u(x), v(z));
    c.rotate(rot);
    for (let k = 0; k < 5; k += 1) c.fillRect(-len * S * 0.5 + random() * 20, (k - 2) * th * S * 0.34, len * S, th * S * 0.3);
    c.restore();
  });
  c.restore();
  yield;
  // grass hatching in graphite, tufts, hawthorn petals
  for (let i = 0; i < 420; i += 1) {
    const x = random() * W;
    const y = v(-5) + random() * (H - v(-5));
    c.strokeStyle = `rgba(74, 70, 64, ${0.18 + random() * 0.25})`;
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3 + random() * 2, y - 9 - random() * 8); c.moveTo(x + 4, y); c.lineTo(x + 5 + random() * 3, y - 8 - random() * 6); c.stroke();
  }
  for (let i = 0; i < 90; i += 1) {
    const x = random() * W;
    const y = random() * H;
    c.fillStyle = 'rgba(253, 252, 248, 0.95)';
    c.beginPath(); c.arc(x, y, 3 + random() * 2, 0, TAU); c.fill();
    c.fillStyle = 'rgba(224, 122, 102, 0.8)';
    c.beginPath(); c.arc(x, y, 1.1, 0, TAU); c.fill();
  }
  yield;
  // the line ahead: two graphite rails and sleepers along the back
  const railY = v(-6.3);
  for (let x = 0; x < W; x += 0.55 * S) { c.fillStyle = 'rgba(141, 133, 121, 0.55)'; c.fillRect(x, railY - 16, 10, 32); }
  graphite(c, [[0, railY - 11], [W, railY - 12]], { w: 2.4, alpha: 0.8, seed: 230 });
  graphite(c, [[0, railY + 11], [W, railY + 10]], { w: 2.4, alpha: 0.8, seed: 231 });
  // the sheet's far edge: a torn deckle and the fold's shade
  c.fillStyle = PAINTED.fold;
  c.beginPath();
  c.moveTo(0, 0);
  for (let x = 0; x <= W; x += 18) c.lineTo(x, 0.16 * S + random() * 10);
  c.lineTo(W, 0);
  c.closePath();
  c.fill();
  graphite(c, [[0, 0.2 * S], [W, 0.2 * S + 2]], { w: 1.4, alpha: 0.5, seed: 240 });
  return canvas;
}

// The field below the sheet's fold (y = -2.8), toward the orchard.
export function paintPaintedField() {
  const W = 1440;
  const H = 768;
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const random = rng(251);
  c.fillStyle = vgrad(c, 0, H, [[0, PAINTED.sheetHigh], [1, PAINTED.sheetMid]]);
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 18; i += 1) {
    const x = W * 0.5 + (i - 9) * 120;
    graphite(c, [[W * 0.5 + (i - 9) * 14, 0], [x, H]], { w: 1.2, alpha: 0.28, color: PAINTED.graphiteSoft, seed: 260 + i });
  }
  for (let i = 0; i < 6; i += 1) gouache(c, random() * W, H * (0.3 + random() * 0.6), 120 + random() * 160, 40 + random() * 40, PAINTED.verdigris, { seed: 280 + i, alpha: 0.3 });
  speckle(c, 0, 0, W, H, { count: 2500, color: 'rgba(120, 100, 70, 0.05)', size: 1.6, seed: 290 });
  return canvas;
}

// The fold where the sheet drops to the field.
export function paintPaintedFold({ width = 32, height = 2.8, S = 48 } = {}) {
  const W = width * S;
  const H = height * S;
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  c.fillStyle = vgrad(c, 0, H, [[0, PAINTED.fold], [1, PAINTED.deckle]]);
  c.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 26) graphite(c, [[x, 0], [x + 16, H]], { w: 1, alpha: 0.2, color: PAINTED.graphiteSoft, seed: 300 + x });
  graphite(c, [[0, 2], [W, 3]], { w: 2, alpha: 0.7, seed: 330 });
  return canvas;
}

// Behind the Conductor: Rosa's orchard at Bellwether, drafted and painted, and
// the archive's grey painted over part of it.
export function paintPaintedCountryBackdrop({ W = 2400, H = 1000 } = {}) {
  const canvas = makeCanvas(W, H);
  const c = canvas.getContext('2d');
  const random = rng(401);
  c.fillStyle = vgrad(c, 0, H, [[0, PAINTED.sheetHigh], [0.7, PAINTED.sheet], [1, PAINTED.sheetMid]]);
  c.fillRect(0, 0, W, H);
  speckle(c, 0, 0, W, H, { count: 5000, color: 'rgba(120, 100, 70, 0.05)', size: 1.6, seed: 402 });
  // a child's sun, in ochre crayon
  c.save();
  c.strokeStyle = PAINTED.ochre;
  c.lineWidth = 7;
  c.globalAlpha = 0.75;
  c.beginPath(); c.arc(W * 0.86, H * 0.2, 70, 0, TAU); c.stroke();
  for (let i = 0; i < 12; i += 1) { const a = (i / 12) * TAU; c.beginPath(); c.moveTo(W * 0.86 + Math.cos(a) * 90, H * 0.2 + Math.sin(a) * 90); c.lineTo(W * 0.86 + Math.cos(a) * 130, H * 0.2 + Math.sin(a) * 130); c.stroke(); }
  c.restore();
  // drafted cloud spirals
  for (let i = 0; i < 5; i += 1) {
    const cx = 200 + i * 430 + random() * 80;
    const cy = 120 + random() * 110;
    const pts = [];
    for (let k = 0; k < 40; k += 1) { const a = k * 0.35; pts.push([cx + Math.cos(a) * (20 + k * 2.4), cy + Math.sin(a) * (10 + k * 1.1)]); }
    graphite(c, pts, { w: 1.2, alpha: 0.28, color: PAINTED.graphiteSoft, seed: 410 + i });
  }
  // two ranges of hills: contour, hatching and a wash
  const hill = (baseY, amp, seed, wash) => {
    const r = rng(seed);
    const pts = [];
    for (let x = -40; x <= W + 40; x += 60) pts.push([x, baseY - Math.sin(x * 0.0021 + seed) * amp - r() * 20]);
    c.save();
    c.globalAlpha = 0.35;
    c.fillStyle = wash;
    c.beginPath(); c.moveTo(-40, H); pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(W + 40, H); c.closePath(); c.fill();
    c.restore();
    graphite(c, pts, { w: 2, alpha: 0.75, seed });
    for (let x = 0; x < W; x += 16) {
      const y = baseY - Math.sin(x * 0.0021 + seed) * amp + 12;
      c.strokeStyle = 'rgba(74, 70, 64, 0.16)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 10, y + 26); c.stroke();
    }
  };
  hill(H * 0.52, 60, 5, PAINTED.verdigris);
  hill(H * 0.66, 40, 9, PAINTED.ochre);
  // the orchard: rows of apple trees, drafted with their construction lines
  const tree = (x, y, s, seed) => {
    const r = rng(seed);
    graphite(c, [[x, y], [x + r() * 4 - 2, y - 60 * s]], { w: 4 * s, alpha: 0.85, seed });
    c.save();
    c.globalAlpha = 0.55;
    c.fillStyle = PAINTED.verdigris;
    c.beginPath(); c.ellipse(x, y - 80 * s, 46 * s, 38 * s, 0, 0, TAU); c.fill();
    c.restore();
    inkEllipse(c, x, y - 80 * s, 46 * s, 38 * s, { w: 1.6, color: PAINTED.graphite, alpha: 0.7, bleed: false });
    graphite(c, [[x - 50 * s, y - 80 * s], [x + 50 * s, y - 80 * s]], { w: 0.8, alpha: 0.25, color: PAINTED.graphiteSoft, seed: seed + 3 });
    for (let k = 0; k < 6; k += 1) { c.fillStyle = PAINTED.apple; c.beginPath(); c.arc(x + (r() - 0.5) * 70 * s, y - 80 * s + (r() - 0.5) * 50 * s, 5 * s, 0, TAU); c.fill(); }
  };
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 9; i += 1) tree(W * 0.42 + i * 130 + row * 60, H * (0.74 + row * 0.1), 0.75 + row * 0.2, 430 + row * 20 + i);
  }
  // the orchard house at Bellwether, a lamp in the window
  const hx = W * 0.2;
  const hy = H * 0.78;
  c.fillStyle = PAINTED.manilla;
  c.fillRect(hx, hy - 150, 230, 150);
  c.fillStyle = PAINTED.bookCloth;
  c.beginPath(); c.moveTo(hx - 20, hy - 150); c.lineTo(hx + 115, hy - 250); c.lineTo(hx + 250, hy - 150); c.closePath(); c.fill();
  c.fillStyle = '#ffd98a';
  c.fillRect(hx + 40, hy - 110, 44, 48);
  glow(c, hx + 62, hy - 86, 90, 'rgba(255, 200, 120, 0.9)', 0.35);
  c.fillStyle = PAINTED.boneBlack;
  c.fillRect(hx + 140, hy - 90, 40, 90);
  graphite(c, [[hx, hy - 150], [hx, hy], [hx + 230, hy], [hx + 230, hy - 150]], { w: 2.2, alpha: 0.85, seed: 470 });
  graphite(c, [[hx - 20, hy - 150], [hx + 115, hy - 250], [hx + 250, hy - 150]], { w: 2.2, alpha: 0.85, seed: 471 });
  graphite(c, [[hx + 180, hy - 215], [hx + 180, hy - 260], [hx + 200, hy - 260], [hx + 200, hy - 200]], { w: 1.8, alpha: 0.8, seed: 472 });
  // smoke from the chimney, a drafted curl
  const smoke = [];
  for (let k = 0; k < 24; k += 1) smoke.push([hx + 190 + Math.sin(k * 0.5) * 16 + k * 3, hy - 270 - k * 9]);
  graphite(c, smoke, { w: 1.2, alpha: 0.35, color: PAINTED.graphiteSoft, seed: 473 });
  // the hawthorn, Mara's mark: dark branches, white blossom
  const bx = W * 0.08;
  const by = H * 0.92;
  const branch = (x, y, a, len, depth, seed) => {
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    graphite(c, [[x, y], [x2, y2]], { w: Math.max(1.2, depth * 2.2), alpha: 0.9, color: PAINTED.boneBlack, seed });
    if (depth <= 0) {
      for (let k = 0; k < 7; k += 1) {
        c.fillStyle = 'rgba(253, 252, 248, 0.97)';
        c.beginPath(); c.arc(x2 + (random() - 0.5) * 30, y2 + (random() - 0.5) * 24, 5 + random() * 4, 0, TAU); c.fill();
        c.fillStyle = 'rgba(224, 122, 102, 0.85)';
        c.beginPath(); c.arc(x2 + (random() - 0.5) * 20, y2 + (random() - 0.5) * 16, 1.6, 0, TAU); c.fill();
      }
      return;
    }
    branch(x2, y2, a - 0.45 + random() * 0.2, len * 0.72, depth - 1, seed + 1);
    branch(x2, y2, a + 0.4 + random() * 0.2, len * 0.7, depth - 1, seed + 2);
  };
  branch(bx, by, -Math.PI / 2 + 0.1, 150, 4, 480);
  // the painted train on the line in the middle distance
  const ty = H * 0.6;
  for (let k = 0; k < 3; k += 1) {
    const x = W * 0.5 + k * 150;
    c.fillStyle = k === 0 ? PAINTED.bookCloth : PAINTED.kraft;
    c.fillRect(x, ty - 40, 136, 40);
    c.fillStyle = '#ffd98a';
    for (let wdx = 12; wdx < 124; wdx += 30) c.fillRect(x + wdx, ty - 32, 16, 12);
    graphite(c, [[x, ty - 40], [x + 136, ty - 40], [x + 136, ty], [x, ty], [x, ty - 40]], { w: 1.6, alpha: 0.8, seed: 490 + k });
  }
  graphite(c, [[W * 0.3, ty + 4], [W * 0.98, ty + 2]], { w: 1.6, alpha: 0.6, seed: 495 });
  // the archive's grey, painted over a band of the drawing
  c.save();
  c.globalAlpha = 0.55;
  c.fillStyle = PAINTED.archiveGrey;
  for (let k = 0; k < 7; k += 1) c.fillRect(W * 0.52 + k * 12, H * 0.28 + k * 40, W * 0.3, 34);
  c.fillRect(W * 0.02, H * 0.38, W * 0.16, 30);
  c.fillRect(W * 0.04, H * 0.43, W * 0.12, 26);
  c.restore();
  return canvas;
}

export function paintPaintedProp(kind) {
  if (kind === 'hawthorn') {
    const { canvas, c, W, H, S } = card(2.6, 3.0);
    const random = rng(510);
    shadowUnder(c, W / 2, H - 6, 1 * S, 0.1 * S, 0.18);
    const branch = (x, y, a, len, depth) => {
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      graphite(c, [[x, y], [x2, y2]], { w: Math.max(1.6, depth * 3), alpha: 0.95, color: PAINTED.boneBlack, seed: 511 + depth });
      if (depth <= 0) {
        for (let k = 0; k < 8; k += 1) {
          c.fillStyle = 'rgba(253, 252, 248, 0.98)';
          c.beginPath(); c.arc(x2 + (random() - 0.5) * 0.4 * S, y2 + (random() - 0.5) * 0.3 * S, 0.06 * S + random() * 0.04 * S, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(74, 70, 64, 0.4)'; c.lineWidth = 1; c.stroke();
          c.fillStyle = 'rgba(224, 122, 102, 0.9)';
          c.beginPath(); c.arc(x2 + (random() - 0.5) * 0.3 * S, y2 + (random() - 0.5) * 0.2 * S, 3, 0, TAU); c.fill();
        }
        return;
      }
      branch(x2, y2, a - 0.5 + random() * 0.25, len * 0.72, depth - 1);
      branch(x2, y2, a + 0.45 + random() * 0.25, len * 0.7, depth - 1);
    };
    branch(W / 2, H - 8, -Math.PI / 2, 0.9 * S, 4);
    return canvas;
  }
  if (kind === 'fence') {
    const { canvas, c, W, H, S } = card(4.2, 1.3);
    for (let x = 0.15 * S; x < W; x += 0.55 * S) {
      c.fillStyle = PAINTED.manilla;
      c.beginPath(); c.moveTo(x, H - 4); c.lineTo(x, 0.25 * S); c.lineTo(x + 0.1 * S, 0.12 * S); c.lineTo(x + 0.2 * S, 0.25 * S); c.lineTo(x + 0.2 * S, H - 4); c.closePath(); c.fill();
      graphite(c, [[x, H - 4], [x, 0.25 * S], [x + 0.1 * S, 0.12 * S], [x + 0.2 * S, 0.25 * S], [x + 0.2 * S, H - 4]], { w: 1.4, alpha: 0.8, seed: 520 + x });
    }
    [0.45, 0.85].forEach((k) => { c.fillStyle = PAINTED.kraft; c.fillRect(0, k * S, W, 0.1 * S); graphite(c, [[0, k * S], [W, k * S]], { w: 1.2, alpha: 0.7, seed: 540 + k * 10 }); });
    return canvas;
  }
  if (kind === 'easel') {
    const { canvas, c, W, H, S } = card(1.8, 2.8);
    graphite(c, [[0.3 * S, H - 4], [0.9 * S, 0.2 * S], [1.5 * S, H - 4]], { w: 3, alpha: 0.9, color: PAINTED.boneBlack, seed: 550 });
    graphite(c, [[0.9 * S, 0.2 * S], [0.9 * S, H - 0.2 * S]], { w: 2.4, alpha: 0.85, color: PAINTED.boneBlack, seed: 551 });
    // Rosa's drawing: the orchard house under a crayon sun
    const x = 0.25 * S;
    const y = 0.5 * S;
    const w = 1.3 * S;
    const h = 1.05 * S;
    c.fillStyle = PAINTED.sheetHigh;
    c.fillRect(x, y, w, h);
    c.fillStyle = PAINTED.bookCloth;
    c.beginPath(); c.moveTo(x + 0.3 * S, y + 0.55 * S); c.lineTo(x + 0.65 * S, y + 0.25 * S); c.lineTo(x + 1.0 * S, y + 0.55 * S); c.closePath(); c.fill();
    c.fillStyle = PAINTED.manilla;
    c.fillRect(x + 0.35 * S, y + 0.55 * S, 0.6 * S, 0.38 * S);
    c.strokeStyle = PAINTED.ochre; c.lineWidth = 4;
    c.beginPath(); c.arc(x + 1.1 * S, y + 0.18 * S, 0.1 * S, 0, TAU); c.stroke();
    c.fillStyle = PAINTED.verdigris;
    c.fillRect(x, y + h - 0.12 * S, w, 0.12 * S);
    c.save(); c.globalAlpha = 0.55; c.fillStyle = PAINTED.archiveGrey; c.fillRect(x, y + 0.6 * S, w * 0.55, 0.2 * S); c.restore();
    graphite(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], { w: 1.8, alpha: 0.85, seed: 552 });
    return canvas;
  }
  // an apple tree
  const { canvas, c, W, H, S } = card(3.0, 4.4);
  const random = rng(560);
  shadowUnder(c, W / 2, H - 6, 1.1 * S, 0.12 * S, 0.16);
  c.fillStyle = PAINTED.kraft;
  c.fillRect(W / 2 - 0.12 * S, 1.9 * S, 0.24 * S, H - 1.95 * S);
  graphite(c, [[W / 2 - 0.12 * S, H - 4], [W / 2 - 0.1 * S, 1.9 * S]], { w: 2, alpha: 0.85, seed: 561 });
  graphite(c, [[W / 2 + 0.12 * S, H - 4], [W / 2 + 0.1 * S, 1.9 * S]], { w: 2, alpha: 0.85, seed: 562 });
  gouache(c, W / 2, 1.5 * S, 1.3 * S, 1.2 * S, PAINTED.verdigris, { seed: 563, alpha: 0.7 });
  inkEllipse(c, W / 2, 1.5 * S, 1.25 * S, 1.15 * S, { w: 2, color: PAINTED.graphite, alpha: 0.7, bleed: false });
  graphite(c, [[W / 2 - 1.35 * S, 1.5 * S], [W / 2 + 1.35 * S, 1.5 * S]], { w: 0.9, alpha: 0.25, color: PAINTED.graphiteSoft, seed: 564 });
  for (let k = 0; k < 11; k += 1) { c.fillStyle = PAINTED.apple; c.beginPath(); c.arc(W / 2 + (random() - 0.5) * 2 * S, 1.5 * S + (random() - 0.5) * 1.6 * S, 0.08 * S, 0, TAU); c.fill(); }
  return canvas;
}
