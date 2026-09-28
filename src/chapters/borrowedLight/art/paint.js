// Chapter 2 · BORROWED LIGHT — Canvas 2D painting kit.
//
// Every facade, skyline strip, sign and prop is painted once into a canvas
// at boot, then used as a texture. Painted, not pixel-drawn: gradients,
// slightly irregular ink lines (#eadfc6, jittered ±0.6 px, round caps), warm
// window light, wet sheen. The rule that keeps play readable: a bright ink
// rim on a top edge means "you can stand here"; props stay dim and unrimmed.

import { INK, PALETTE, rng } from './palette.js';

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  return canvas;
}

const rgba = (hex, a) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function inkPath(ctx, points, { width = 2, alpha = 0.8, color = INK, jitter = 0.6, r = Math.random, close = false } = {}) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const jx = x + (r() * 2 - 1) * jitter;
    const jy = y + (r() * 2 - 1) * jitter;
    if (i === 0) ctx.moveTo(jx, jy); else ctx.lineTo(jx, jy);
  });
  if (close) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// A long line drawn as short jittered segments so it looks hand-inked.
export function inkLine(ctx, x1, y1, x2, y2, opts = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(len / 26));
  const points = [];
  for (let i = 0; i <= steps; i += 1) points.push([x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps]);
  inkPath(ctx, points, opts);
}

function grain(ctx, w, h, r, { alpha = 0.05, count = null, light = '#ffffff', dark = '#000000' } = {}) {
  const n = count ?? Math.floor((w * h) / 380);
  for (let i = 0; i < n; i += 1) {
    ctx.fillStyle = r() < 0.5 ? rgba(light, alpha * r()) : rgba(dark, alpha * 1.6 * r());
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5);
  }
}

function wetStreaks(ctx, x, y, w, h, r, alpha = 0.05) {
  const n = Math.floor(w / 9);
  for (let i = 0; i < n; i += 1) {
    const sx = x + r() * w;
    const sy = y + r() * h * 0.4;
    const len = 30 + r() * h * 0.6;
    const g = ctx.createLinearGradient(sx, sy, sx, sy + len);
    g.addColorStop(0, rgba('#b8cdd3', 0));
    g.addColorStop(0.3, rgba('#b8cdd3', alpha * r()));
    g.addColorStop(1, rgba('#b8cdd3', 0));
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, 1 + r() * 1.5, len);
  }
}

// ---------------------------------------------------------------------------
// Windows.
export function paintWindow(ctx, x, y, w, h, r, { lit = r() < 0.4, arch = false, warmth = 1, curtain = r() < 0.45, figure = r() < 0.08 } = {}) {
  ctx.save();
  const path = () => {
    ctx.beginPath();
    if (arch) {
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + w / 2);
      ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
    } else ctx.rect(x, y, w, h);
  };
  // Reveal / frame shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 7);
  path();
  if (lit) {
    const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.55, 2, x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.8);
    g.addColorStop(0, rgba('#f7d29a', 0.9 * warmth));
    g.addColorStop(0.5, rgba('#d99a52', 0.85 * warmth));
    g.addColorStop(1, rgba('#5e3217', 0.95));
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#16242a');
    g.addColorStop(0.55, '#0b1216');
    g.addColorStop(1, '#101a1f');
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.clip();
  if (lit && r() < 0.3) {
    // A blind half down.
    ctx.fillStyle = 'rgba(70,40,18,0.55)';
    ctx.fillRect(x, y, w, h * (0.25 + r() * 0.35));
  }
  if (lit && curtain) {
    ctx.fillStyle = rgba('#6b2a22', 0.45);
    ctx.fillRect(x, y, w * (0.22 + r() * 0.2), h);
    ctx.fillRect(x + w * (0.72 + r() * 0.1), y, w, h);
  }
  if (lit && figure) {
    ctx.fillStyle = 'rgba(24,14,10,0.75)';
    const fx = x + w * (0.3 + r() * 0.4);
    ctx.beginPath();
    ctx.arc(fx, y + h * 0.42, w * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(fx - w * 0.17, y + h * 0.52, w * 0.34, h * 0.6);
  }
  if (!lit) {
    // Cold sky reflection.
    ctx.fillStyle = 'rgba(111,183,173,0.07)';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.7);
    ctx.lineTo(x + w * 0.6, y);
    ctx.lineTo(x + w * 0.85, y);
    ctx.lineTo(x, y + h);
    ctx.fill();
  }
  // Mullions.
  ctx.strokeStyle = lit ? 'rgba(60,32,14,0.75)' : 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h * 0.45);
  ctx.lineTo(x + w, y + h * 0.45);
  ctx.stroke();
  ctx.restore();
  // Sill with a thin wet highlight.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 5, y + h + 1, w + 10, 5);
  ctx.fillStyle = rgba(INK, 0.16);
  ctx.fillRect(x - 5, y + h + 1, w + 10, 1);
  if (lit) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 1.25);
    halo.addColorStop(0, rgba(PALETTE.window, 0.09 * warmth));
    halo.addColorStop(1, rgba(PALETTE.window, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(x - w, y - h, w * 3, h * 3);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Rooftop props (painted into the headroom above a roof).
function waterTower(ctx, cx, base, r, scale = 1) {
  const tw = 120 * scale;
  const th = 110 * scale;
  const legH = 70 * scale;
  const top = base - legH - th;
  ctx.save();
  ctx.fillStyle = '#120c09';
  ctx.strokeStyle = 'rgba(20,14,10,1)';
  ctx.lineWidth = 5 * scale;
  // Legs + bracing.
  ctx.beginPath();
  for (const lx of [-0.42, -0.14, 0.14, 0.42]) {
    ctx.moveTo(cx + lx * tw, base);
    ctx.lineTo(cx + lx * tw * 0.9, base - legH);
  }
  ctx.moveTo(cx - 0.42 * tw, base - 6); ctx.lineTo(cx + 0.14 * tw, base - legH);
  ctx.moveTo(cx + 0.42 * tw, base - 6); ctx.lineTo(cx - 0.14 * tw, base - legH);
  ctx.stroke();
  // Tank: wooden staves.
  const g = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
  g.addColorStop(0, '#2c1c12');
  g.addColorStop(0.35, '#4a2f1c');
  g.addColorStop(1, '#1a110b');
  ctx.fillStyle = g;
  ctx.fillRect(cx - tw / 2, top, tw, th);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  for (let sx = cx - tw / 2 + 8; sx < cx + tw / 2; sx += 9 * scale) {
    ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx, top + th); ctx.stroke();
  }
  ctx.strokeStyle = '#0d0907';
  ctx.lineWidth = 3;
  for (const hy of [0.2, 0.55, 0.88]) {
    ctx.beginPath(); ctx.moveTo(cx - tw / 2, top + th * hy); ctx.lineTo(cx + tw / 2, top + th * hy); ctx.stroke();
  }
  // Conical cap.
  ctx.fillStyle = '#1b120c';
  ctx.beginPath();
  ctx.moveTo(cx - tw / 2 - 6, top + 2);
  ctx.lineTo(cx, top - 44 * scale);
  ctx.lineTo(cx + tw / 2 + 6, top + 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  inkPath(ctx, [[cx - tw / 2 - 6, top + 2], [cx, top - 44 * scale], [cx + tw / 2 + 6, top + 2]], { width: 1.6, alpha: 0.32, r });
  inkLine(ctx, cx - tw / 2, top + 4, cx - tw / 2, top + th, { width: 1.4, alpha: 0.2, r });
}

function antenna(ctx, x, base, r, h = 120 + r() * 120) {
  ctx.save();
  ctx.strokeStyle = '#0f0c0a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, base - h);
  for (let i = 1; i < 4; i += 1) {
    const yy = base - h * (0.35 + i * 0.16);
    const span = 34 - i * 7;
    ctx.moveTo(x - span, yy); ctx.lineTo(x + span, yy);
  }
  ctx.moveTo(x, base - h * 0.5); ctx.lineTo(x - 40, base);
  ctx.stroke();
  ctx.restore();
  inkLine(ctx, x + 1, base - h, x + 1, base - h * 0.4, { width: 1.1, alpha: 0.22, r, jitter: 0.3 });
  // Tiny amber obstruction light.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, base - h, 0, x, base - h, 16);
  g.addColorStop(0, 'rgba(240,184,101,0.75)');
  g.addColorStop(1, 'rgba(240,184,101,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 16, base - h - 16, 32, 32);
  ctx.restore();
}

function acUnit(ctx, x, base, r, w = 70 + r() * 30) {
  const h = w * 0.62;
  ctx.fillStyle = '#1a2226';
  ctx.fillRect(x, base - h, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.arc(x + w * 0.62, base - h * 0.5, h * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(160,180,180,0.18)';
  ctx.lineWidth = 1;
  for (let gy = base - h + 6; gy < base - 4; gy += 5) {
    ctx.beginPath(); ctx.moveTo(x + 5, gy); ctx.lineTo(x + w * 0.3, gy); ctx.stroke();
  }
  ctx.fillStyle = rgba(INK, 0.12);
  ctx.fillRect(x, base - h, w, 2);
}

function chimney(ctx, x, base, r) {
  const w = 30 + r() * 26;
  const h = 50 + r() * 60;
  ctx.fillStyle = '#24160f';
  ctx.fillRect(x, base - h, w, h);
  ctx.fillStyle = '#140c08';
  ctx.fillRect(x - 4, base - h - 8, w + 8, 10);
  for (let i = 0; i < 2; i += 1) {
    ctx.fillStyle = '#1b110c';
    ctx.fillRect(x + 4 + i * (w / 2 - 2), base - h - 22, w / 2 - 8, 16);
  }
}

function skylight(ctx, x, base, r) {
  const w = 90 + r() * 50;
  const h = 34;
  ctx.fillStyle = '#16100c';
  ctx.fillRect(x, base - 12, w, 12);
  const g = ctx.createLinearGradient(0, base - h, 0, base - 10);
  g.addColorStop(0, 'rgba(240,184,101,0.25)');
  g.addColorStop(1, 'rgba(240,184,101,0.55)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + 6, base - 12);
  ctx.lineTo(x + 18, base - h);
  ctx.lineTo(x + w - 18, base - h);
  ctx.lineTo(x + w - 6, base - 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,12,8,0.9)';
  ctx.lineWidth = 2;
  for (let sx = x + 26; sx < x + w - 20; sx += 18) {
    ctx.beginPath(); ctx.moveTo(sx, base - h); ctx.lineTo(sx - 4, base - 12); ctx.stroke();
  }
}

export function laundryLine(ctx, x1, x2, y, r) {
  const sag = 26 + r() * 20;
  ctx.save();
  ctx.strokeStyle = 'rgba(20,14,10,0.95)';
  ctx.lineWidth = 3;
  for (const px of [x1, x2]) { ctx.beginPath(); ctx.moveTo(px, y + 90); ctx.lineTo(px, y - 6); ctx.stroke(); }
  ctx.strokeStyle = rgba(INK, 0.28);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.quadraticCurveTo((x1 + x2) / 2, y + sag * 2, x2, y);
  ctx.stroke();
  const colors = ['#b9ab8c', '#6b2a22', '#2c4a4f', '#8a6a3a', '#a89c86'];
  const n = Math.floor((x2 - x1) / 40);
  for (let i = 1; i < n; i += 1) {
    if (r() < 0.25) continue;
    const t = i / n;
    const cx = x1 + (x2 - x1) * t;
    const cy = y + sag * 2 * 2 * t * (1 - t) * 0.5 * 2;
    const cw = 18 + r() * 16;
    const ch = 22 + r() * 26;
    ctx.fillStyle = r.pick(colors);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - cw / 2, cy);
    ctx.lineTo(cx + cw / 2, cy);
    ctx.lineTo(cx + cw / 2 - 2, cy + ch);
    ctx.lineTo(cx - cw / 2 + 3, cy + ch - 3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Facades.
export const HEADROOM = 320;   // painted space above the roof for props
export const FACADE_DEPTH = 620; // painted facade below the roof; a tiled wall continues

const STYLE = {
  tenement: { top: '#2a1e16', bottom: '#100a07', trim: '#1a120d', win: [38, 54], cols: 64, rows: 88, lit: 0.26 },
  brick: { top: '#2e1a14', bottom: '#110a08', trim: '#1e110d', win: [34, 56], cols: 70, rows: 96, lit: 0.22, arch: true },
  office: { top: '#15272c', bottom: '#081013', trim: '#0c181b', win: [58, 34], cols: 78, rows: 70, lit: 0.2, ribbon: true },
  terminal: { top: '#241f19', bottom: '#0c0a08', trim: '#17130f', win: [44, 84], cols: 120, rows: 150, lit: 0.34, arch: true },
  hotel: { top: '#1a1f2b', bottom: '#090b11', trim: '#11141e', win: [44, 74], cols: 96, rows: 118, lit: 0.0, arch: true },
  watertower: { top: '#261b14', bottom: '#0f0a07', trim: '#18110c', win: [30, 46], cols: 60, rows: 90, lit: 0.22 },
  stairhead: { top: '#2e2119', bottom: '#1a120d', trim: '#1f160f', win: [0, 0], cols: 0, rows: 0, lit: 0 },
  plantroom: { top: '#1e2a2d', bottom: '#11191b', trim: '#0f1618', win: [0, 0], cols: 0, rows: 0, lit: 0 },
  concourse: { top: '#26221d', bottom: '#0d0b09', trim: '#17130f', win: [0, 0], cols: 0, rows: 0, lit: 0 },
  platform: { top: '#2e2822', bottom: '#110e0b', trim: '#1b1713', win: [0, 0], cols: 0, rows: 0, lit: 0 },
  gantry: { top: '#1b2226', bottom: '#0d1114', trim: '#0d1114', win: [0, 0], cols: 0, rows: 0, lit: 0 },
};

export function styleOf(name) { return STYLE[name] ?? STYLE.tenement; }

// Paint the top of a building: HEADROOM px of sky with props, then the roof
// edge at y = HEADROOM, then FACADE_DEPTH px of wall with windows.
export function paintFacade(platform, { seed = 1, props = true, blackout = false, exclude = [] } = {}) {
  const r = rng(seed);
  const st = styleOf(platform.style);
  const w = platform.w;
  const facadeH = platform.bottom ? Math.min(FACADE_DEPTH, platform.bottom - platform.y) : FACADE_DEPTH;
  const pad = 14;
  const canvas = makeCanvas(w + pad * 2, HEADROOM + facadeH);
  const ctx = canvas.getContext('2d');
  const top = HEADROOM;
  const x0 = pad;

  if (props && !['stairhead', 'plantroom', 'gantry', 'terminal', 'platform', 'concourse', 'hotel'].includes(platform.style)) paintRoofProps(ctx, platform, x0, top, r, exclude);

  // Wall.
  const wall = ctx.createLinearGradient(0, top, 0, top + facadeH);
  wall.addColorStop(0, st.top);
  wall.addColorStop(1, st.bottom);
  ctx.fillStyle = wall;
  ctx.fillRect(x0, top, w, facadeH);
  // Side light: a cold edge on the left, warm bounce on the right.
  const side = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  side.addColorStop(0, 'rgba(111,183,173,0.10)');
  side.addColorStop(0.12, 'rgba(111,183,173,0)');
  side.addColorStop(0.88, 'rgba(224,162,74,0)');
  side.addColorStop(1, 'rgba(224,162,74,0.06)');
  ctx.fillStyle = side;
  ctx.fillRect(x0, top, w, facadeH);

  // Masonry courses.
  if (['tenement', 'brick', 'watertower', 'terminal', 'concourse', 'hotel'].includes(platform.style)) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let yy = top + 20; yy < top + facadeH; yy += 14 + r() * 6) ctx.fillRect(x0, yy, w, 1);
  } else if (platform.style === 'office') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let yy = top + 40; yy < top + facadeH; yy += st.rows) ctx.fillRect(x0, yy, w, 8);
  }
  grain(ctx, w + pad, facadeH, r, { alpha: 0.05 });

  // Windows.
  if (st.cols) {
    const [ww, wh] = st.win;
    const cols = Math.max(1, Math.floor((w - 50) / st.cols));
    const offset = x0 + (w - cols * st.cols) / 2 + (st.cols - ww) / 2;
    for (let row = 0; row < 7; row += 1) {
      const wy = top + 60 + row * st.rows;
      if (wy + wh > top + facadeH - 10) break;
      // Floors are lived in unevenly: some rows mostly lit, some asleep.
      const rowMood = r() < 0.35 ? 1.8 : r() < 0.5 ? 0.35 : 1;
      for (let c = 0; c < cols; c += 1) {
        if (r() < 0.07) continue;
        const wx = offset + c * st.cols;
        const litChance = blackout ? 0 : Math.min(0.85, st.lit * rowMood * (1 - row * 0.08));
        const warmth = 0.55 + r() * 0.45;
        if (st.ribbon) {
          paintWindow(ctx, wx - 8, wy, st.cols - 6, wh, r, { lit: r() < litChance, curtain: false, figure: false, warmth: warmth * 0.8 });
        } else {
          paintWindow(ctx, wx, wy, ww, wh, r, { lit: r() < litChance, arch: st.arch && row % 2 === 0, warmth });
          if (r() < 0.12) {
            // A window unit dripping in the rain.
            ctx.fillStyle = '#1a2226';
            ctx.fillRect(wx + ww * 0.15, wy + wh + 6, ww * 0.7, 16);
            ctx.fillStyle = 'rgba(234,223,198,0.12)';
            ctx.fillRect(wx + ww * 0.15, wy + wh + 6, ww * 0.7, 1.5);
          }
        }
      }
    }
    // Pilasters between bays give the wall depth.
    if (!st.ribbon && w > 300) {
      for (let px = offset - (st.cols - ww) / 2; px < x0 + w; px += st.cols * 2) {
        const g = ctx.createLinearGradient(px - 7, 0, px + 7, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.28)');
        g.addColorStop(0.5, 'rgba(255,235,200,0.04)');
        g.addColorStop(1, 'rgba(0,0,0,0.28)');
        ctx.fillStyle = g;
        ctx.fillRect(px - 7, top + 24, 14, facadeH);
      }
    }
  }

  // Style details.
  if (platform.style === 'tenement' || platform.style === 'brick') {
    // Fire escape on one side.
    const fx = x0 + (r() < 0.5 ? 40 : w - 190);
    if (w > 420) fireEscape(ctx, fx, top + 50, 150, facadeH - 60, r, st.rows);
    drainpipe(ctx, x0 + (r() < 0.5 ? 14 : w - 20), top, facadeH, r);
  }
  if (platform.style === 'terminal') terminalCanopy(ctx, x0, top, w, r);
  if (platform.style === 'concourse' || platform.style === 'platform') stationEdge(ctx, x0, top, w, facadeH, r, platform.style);
  if (platform.style === 'gantry') gantryTruss(ctx, x0, top, w, facadeH, r);
  if (platform.style === 'stairhead') stairheadDoor(ctx, x0, top, w, facadeH, r);
  if (platform.style === 'plantroom') plantLouvres(ctx, x0, top, w, facadeH, r);
  if (platform.style === 'hotel') hotelDetails(ctx, x0, top, w, facadeH, r);

  wetStreaks(ctx, x0, top, w, facadeH, r, 0.06);

  // Fade the lowest floors into the plain wall below (and the mist).
  if (!platform.bottom) {
    const fade = ctx.createLinearGradient(0, top + facadeH - 200, 0, top + facadeH);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, st.bottom);
    ctx.fillStyle = fade;
    ctx.fillRect(x0 - 8, top + facadeH - 200, w + 16, 200);
  }

  // Cornice / parapet.
  const corniceH = ['gantry', 'platform', 'concourse'].includes(platform.style) ? 10 : 18;
  ctx.fillStyle = st.trim;
  ctx.fillRect(x0 - 8, top, w + 16, corniceH);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x0 - 8, top + corniceH, w + 16, 8);
  // Wet top sheen.
  const sheen = ctx.createLinearGradient(0, top, 0, top + corniceH);
  sheen.addColorStop(0, 'rgba(234,223,198,0.20)');
  sheen.addColorStop(1, 'rgba(234,223,198,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x0 - 8, top, w + 16, corniceH);

  // Ink rim: bright along the walkable top, fading down the sides.
  inkLine(ctx, x0 - 8, top + 1, x0 + w + 8, top + 1, { width: 2.6, alpha: 0.85, r });
  for (const [sx, dir] of [[x0 - 8, 1], [x0 + w + 8, -1]]) {
    for (let i = 0; i < 6; i += 1) {
      const y1 = top + 2 + i * 34;
      inkLine(ctx, sx + dir * 0.5, y1, sx + dir * 0.5, y1 + 34, { width: 1.8, alpha: 0.55 * (1 - i / 6), r });
    }
  }
  return { canvas, originX: pad, originY: HEADROOM, facadeH };
}

function paintRoofProps(ctx, platform, x0, top, r, exclude = []) {
  const w = platform.w;
  // Keep props clear of machines, nodes and lamps (world x → canvas x).
  const occupied = exclude.map(([a, b]) => [a - platform.x + x0, b - platform.x + x0]);
  const free = (x, width) => !occupied.some(([a, b]) => x < b + 20 && x + width > a - 20);
  const place = (x, width) => { occupied.push([x, x + width]); };
  // Keep props dim: they sit behind the roof edge and are never walkable.
  ctx.save();
  ctx.globalAlpha = 0.9;
  const count = Math.floor(w / 260);
  for (let i = 0; i < count; i += 1) {
    const kind = r.pick(['tower', 'antenna', 'ac', 'chimney', 'skylight', 'laundry', 'antenna', 'ac']);
    const width = { tower: 160, antenna: 60, ac: 100, chimney: 60, skylight: 150, laundry: 230 }[kind];
    const x = x0 + 30 + r() * Math.max(10, w - width - 60);
    if (!free(x, width)) continue;
    place(x, width);
    if (kind === 'tower' && w > 500) waterTower(ctx, x + 80, top, r, 0.85 + r() * 0.3);
    else if (kind === 'antenna') antenna(ctx, x + 30, top, r);
    else if (kind === 'ac') acUnit(ctx, x, top, r);
    else if (kind === 'chimney') chimney(ctx, x, top, r);
    else if (kind === 'skylight') skylight(ctx, x, top, r);
    else if (kind === 'laundry' && w > 500) laundryLine(ctx, x, x + width, top - 96, r);
  }
  if (platform.style === 'watertower') waterTower(ctx, x0 + w / 2 + 10, top, r, 1.15);
  ctx.restore();
  // A thin shadow band where props meet the roof.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x0, top - 4, w, 4);
}

function fireEscape(ctx, x, y, w, h, r, step) {
  ctx.save();
  ctx.strokeStyle = 'rgba(10,8,6,0.95)';
  ctx.lineWidth = 3;
  for (let yy = y + step - 12; yy < y + h; yy += step) {
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
    ctx.lineWidth = 1.4;
    for (let bx = x; bx <= x + w; bx += 12) { ctx.beginPath(); ctx.moveTo(bx, yy); ctx.lineTo(bx, yy - 22); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x, yy - 22); ctx.lineTo(x + w, yy - 22); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 14, yy); ctx.lineTo(x + w - 14, yy + step - 2); ctx.stroke();
  }
  ctx.restore();
  for (let yy = y + step - 12; yy < y + h; yy += step) inkLine(ctx, x, yy - 1, x + w, yy - 1, { width: 1, alpha: 0.2, r, jitter: 0.3 });
}

function drainpipe(ctx, x, top, h, r) {
  ctx.fillStyle = '#0c0907';
  ctx.fillRect(x, top + 10, 6, h);
  for (let yy = top + 40; yy < top + h; yy += 70) ctx.fillRect(x - 3, yy, 12, 4);
  inkLine(ctx, x + 1, top + 12, x + 1, top + h, { width: 0.8, alpha: 0.18, r, jitter: 0.2 });
}

function terminalCanopy(ctx, x0, top, w, r) {
  // Iron station canopy over the terminal roof: columns and a glazed roof,
  // drawn in the headroom so the platform reads as a station.
  ctx.save();
  const canopyY = top - 250;
  ctx.fillStyle = 'rgba(12,10,8,0.95)';
  for (let cx = x0 + 60; cx < x0 + w - 20; cx += 240) {
    ctx.fillRect(cx, canopyY + 20, 12, 250);
    ctx.fillRect(cx - 10, canopyY + 20, 32, 10);
  }
  const glass = ctx.createLinearGradient(0, canopyY - 30, 0, canopyY + 30);
  glass.addColorStop(0, 'rgba(111,183,173,0.10)');
  glass.addColorStop(1, 'rgba(234,223,198,0.05)');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(x0 + 20, canopyY + 26);
  ctx.quadraticCurveTo(x0 + w / 2, canopyY - 60, x0 + w - 20, canopyY + 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(12,10,8,0.95)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let gx = x0 + 60; gx < x0 + w - 40; gx += 60) {
    ctx.beginPath(); ctx.moveTo(gx, canopyY + 26); ctx.lineTo(gx + 20, canopyY - 30); ctx.stroke();
  }
  ctx.restore();
  inkPath(ctx, Array.from({ length: 24 }, (_, i) => {
    const t = i / 23;
    const px = x0 + 20 + (w - 40) * t;
    const py = canopyY + 26 - 86 * 4 * t * (1 - t) * 0.5 * 2 * 0.5;
    return [px, py];
  }), { width: 1.6, alpha: 0.35, r });
  // Hanging clock.
  const cx = x0 + w * 0.62;
  ctx.fillStyle = '#0d0a08';
  ctx.fillRect(cx - 2, canopyY + 4, 4, 60);
  ctx.beginPath(); ctx.arc(cx, canopyY + 90, 28, 0, Math.PI * 2); ctx.fillStyle = '#1b1510'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, canopyY + 90, 22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(230,220,194,0.8)'; ctx.fill();
  ctx.strokeStyle = '#1b1510'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, canopyY + 90); ctx.lineTo(cx + 2, canopyY + 74); ctx.moveTo(cx, canopyY + 90); ctx.lineTo(cx + 12, canopyY + 94); ctx.stroke();
}

function stationEdge(ctx, x0, top, w, h, r, style) {
  // Amber safety line and tiled edge.
  ctx.fillStyle = 'rgba(224,162,74,0.55)';
  ctx.fillRect(x0, top + 12, w, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (let tx = x0; tx < x0 + w; tx += 36) ctx.fillRect(tx, top + 16, 1, 18);
  if (style === 'concourse' || style === 'platform') {
    // Station arcade below: tall arches with warm waiting-room light.
    for (let ax = x0 + 40; ax < x0 + w - 150; ax += 210) {
      const arch = () => {
        ctx.beginPath();
        ctx.moveTo(ax, top + h);
        ctx.lineTo(ax, top + 190);
        ctx.arc(ax + 75, top + 190, 75, Math.PI, 0);
        ctx.lineTo(ax + 150, top + h);
        ctx.closePath();
      };
      ctx.save();
      arch();
      ctx.clip();
      const g = ctx.createLinearGradient(0, top + 110, 0, top + h);
      g.addColorStop(0, 'rgba(12,9,7,1)');
      g.addColorStop(0.35, 'rgba(90,56,26,0.9)');
      g.addColorStop(1, 'rgba(20,14,10,1)');
      ctx.fillStyle = g;
      ctx.fillRect(ax, top + 100, 150, h);
      // Mullioned fanlight.
      ctx.strokeStyle = 'rgba(12,9,7,0.95)';
      ctx.lineWidth = 3;
      for (let k = 0; k < 5; k += 1) {
        const a = Math.PI + (k / 4) * Math.PI;
        ctx.beginPath(); ctx.moveTo(ax + 75, top + 190); ctx.lineTo(ax + 75 + Math.cos(a) * 75, top + 190 + Math.sin(a) * 75); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(ax, top + 190); ctx.lineTo(ax + 150, top + 190); ctx.stroke();
      // A figure or two waiting.
      if (r() < 0.6) {
        ctx.fillStyle = 'rgba(14,10,8,0.9)';
        const fx = ax + 40 + r() * 70;
        ctx.beginPath(); ctx.arc(fx, top + 300, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(fx - 12, top + 310, 24, 70);
      }
      ctx.restore();
      inkPath(ctx, Array.from({ length: 13 }, (_, i) => [ax + 75 + Math.cos(Math.PI + (i / 12) * Math.PI) * 76, top + 190 + Math.sin(Math.PI + (i / 12) * Math.PI) * 76]), { width: 1.4, alpha: 0.3, r });
    }
  }
  if (style === 'platform') {
    // Platform: canopy columns in the headroom.
    ctx.fillStyle = 'rgba(12,10,8,0.9)';
    for (let cx = x0 + 120; cx < x0 + w; cx += 300) {
      ctx.fillRect(cx, top - 250, 10, 250);
    }
    ctx.fillRect(x0, top - 260, w, 12);
    inkLine(ctx, x0, top - 261, x0 + w, top - 261, { width: 1.5, alpha: 0.3, r });
  }
}

function gantryTruss(ctx, x0, top, w, h, r) {
  ctx.clearRect(x0 - 20, top + 16, w + 40, h);
  ctx.strokeStyle = 'rgba(14,18,20,1)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x0, top + 60); ctx.lineTo(x0 + w, top + 60);
  for (let tx = x0; tx < x0 + w; tx += 60) {
    ctx.moveTo(tx, top + 16); ctx.lineTo(tx + 30, top + 60); ctx.lineTo(tx + 60, top + 16);
  }
  ctx.stroke();
  // Legs.
  ctx.lineWidth = 10;
  for (const lx of [x0 + 20, x0 + w - 30]) { ctx.beginPath(); ctx.moveTo(lx, top + 60); ctx.lineTo(lx, top + h); ctx.stroke(); }
  inkLine(ctx, x0, top + 59, x0 + w, top + 59, { width: 1, alpha: 0.2, r });
}

function stairheadDoor(ctx, x0, top, w, h, r) {
  ctx.fillStyle = '#0e0907';
  ctx.fillRect(x0 + w * 0.3, top + h - 110, 56, 110);
  ctx.fillStyle = 'rgba(240,184,101,0.5)';
  ctx.fillRect(x0 + w * 0.3 + 6, top + h - 104, 44, 8);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x0 + w * 0.3 + 28, top + h - 124, 0, x0 + w * 0.3 + 28, top + h - 124, 60);
  g.addColorStop(0, 'rgba(240,184,101,0.35)');
  g.addColorStop(1, 'rgba(240,184,101,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, top, w, h);
  ctx.restore();
}

function plantLouvres(ctx, x0, top, w, h, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let ly = top + 26; ly < top + h - 12; ly += 10) ctx.fillRect(x0 + w * 0.45, ly, w * 0.4, 4);
}

function hotelDetails(ctx, x0, top, w, h, r) {
  // Balconies with ironwork.
  ctx.strokeStyle = 'rgba(6,6,10,0.95)';
  ctx.lineWidth = 2;
  for (let by = top + 150; by < top + h; by += 236) {
    ctx.fillStyle = 'rgba(6,6,10,0.8)';
    ctx.fillRect(x0 + 20, by, w - 40, 8);
    for (let bx = x0 + 24; bx < x0 + w - 20; bx += 10) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 30); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x0 + 20, by - 30); ctx.lineTo(x0 + w - 20, by - 30); ctx.stroke();
  }
}

// A plain dark wall tile for the facade below FACADE_DEPTH (TileSprite).
export function paintWallTile(style, seed = 3) {
  const r = rng(seed);
  const st = styleOf(style);
  const canvas = makeCanvas(256, 256);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = st.bottom;
  ctx.fillRect(0, 0, 256, 256);
  grain(ctx, 256, 256, r, { alpha: 0.06 });
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let yy = 8; yy < 256; yy += 16) ctx.fillRect(0, yy, 256, 1);
  // Very faint window ghosts: the wall keeps a rhythm without a seam.
  for (let wx = 26; wx < 256; wx += 64) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(wx, 80, 30, 46);
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Skyline strips for the parallax layers. `tone` 0 (near/dark) → 1 (far/mist).
export function paintSkylineStrip({ width = 2048, height = 900, seed = 1, tone = 0.5, windows = 0.12, baseY = 0.42 } = {}) {
  const r = rng(seed);
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const near = [16, 13, 12];
  const far = [30, 42, 50];
  const base = mix(near, far, tone);
  const col = (k = 0, a = 1) => `rgba(${Math.round(base[0] + k)},${Math.round(base[1] + k)},${Math.round(base[2] + k * 1.1)},${a})`;
  const building = (x, bw, bh) => {
    const by = height - bh;
    // Body with a faint vertical falloff and a cold lit edge.
    const g = ctx.createLinearGradient(0, by, 0, height);
    g.addColorStop(0, col(4));
    g.addColorStop(1, col(-4));
    ctx.fillStyle = g;
    ctx.fillRect(x, by, bw, bh);
    ctx.fillStyle = `rgba(111,183,173,${0.05 * (1 - tone * 0.4)})`;
    ctx.fillRect(x, by, 3, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + bw - 10, by, 10, bh);
    // Setback crown.
    if (r() < 0.45 && bw > 110) {
      const cw = bw * (0.4 + r() * 0.35);
      const ch = 30 + r() * 70;
      ctx.fillStyle = col(2);
      ctx.fillRect(x + (bw - cw) / 2, by - ch, cw, ch);
      ctx.fillStyle = `rgba(234,223,198,${0.12 * (1 - tone * 0.6)})`;
      ctx.fillRect(x + (bw - cw) / 2, by - ch, cw, 1.5);
    }
    // Roof furniture silhouettes.
    ctx.fillStyle = col(0);
    const kind = r();
    if (kind < 0.3) {
      const tx = x + bw * (0.2 + r() * 0.5);
      ctx.fillRect(tx, by - 50, 46, 38);
      ctx.fillRect(tx + 6, by - 14, 4, 14); ctx.fillRect(tx + 36, by - 14, 4, 14);
      ctx.beginPath(); ctx.moveTo(tx - 4, by - 50); ctx.lineTo(tx + 23, by - 72); ctx.lineTo(tx + 50, by - 50); ctx.fill();
    } else if (kind < 0.6) {
      const ax = x + bw * (0.3 + r() * 0.5);
      const ah = 60 + r() * 110;
      ctx.fillRect(ax, by - ah, 3, ah);
      ctx.fillRect(ax - 14, by - ah * 0.7, 31, 2);
      ctx.fillStyle = `rgba(240,184,101,${0.55 * (1 - tone * 0.5)})`;
      ctx.fillRect(ax - 1, by - ah - 3, 5, 5);
    } else if (kind < 0.75) {
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + bw / 2, by - 40 - r() * 30); ctx.lineTo(x + bw, by); ctx.fill();
    }
    // Windows: rows of small panes, a few floors awake.
    const pw = 7 - tone * 2.5;
    const ph = 10 - tone * 3.5;
    const sx = 18 - tone * 4;
    const sy = 24 - tone * 6;
    for (let wy = by + 16; wy < height - 8; wy += sy) {
      const rowLit = r() < 0.3 ? 2.2 : 0.6;
      for (let wx = x + 8; wx < x + bw - 10; wx += sx) {
        const roll = r();
        if (roll < windows * rowLit) {
          const a = (0.35 + r() * 0.45) * (1 - tone * 0.5);
          ctx.fillStyle = r() < 0.88 ? `rgba(240,184,101,${a})` : `rgba(159,217,207,${a * 0.7})`;
          ctx.fillRect(wx, wy, pw, ph);
        } else if (roll < 0.5) {
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(wx, wy, pw, ph);
        }
      }
    }
    // Faint ink rim on the roofline.
    ctx.fillStyle = `rgba(234,223,198,${0.18 * (1 - tone * 0.7)})`;
    ctx.fillRect(x, by, bw, 1.5);
  };
  let x = -40;
  while (x < width + 40) {
    const bw = 90 + r() * 220;
    const bh = height * (1 - baseY) * (0.35 + r() * 0.75);
    building(x, bw, bh);
    x += bw + (r() < 0.3 ? r() * 40 : -4);
  }
  // Atmospheric haze toward the bottom (the rain mist below the roofs).
  const haze = ctx.createLinearGradient(0, height * 0.5, 0, height);
  haze.addColorStop(0, 'rgba(56,72,82,0)');
  haze.addColorStop(1, `rgba(56,72,82,${0.22 + tone * 0.3})`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

// ---------------------------------------------------------------------------
// Small textures.
export function paintRadial(size, stops) {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function paintRain({ size = 512, count = 220, len = [18, 42], alpha = [0.08, 0.28], width = 1, slant = 0.18, seed = 5 } = {}) {
  const r = rng(seed);
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i += 1) {
    const x = r() * size;
    const y = r() * size;
    const l = len[0] + r() * (len[1] - len[0]);
    const a = alpha[0] + r() * (alpha[1] - alpha[0]);
    ctx.strokeStyle = `rgba(200,214,220,${a})`;
    ctx.lineWidth = width * (0.7 + r() * 0.6);
    for (const [ox, oy] of [[0, 0], [-size, 0], [0, -size], [-size, -size], [size, 0], [0, size]]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + oy);
      ctx.lineTo(x + ox - l * slant, y + oy + l);
      ctx.stroke();
    }
  }
  return canvas;
}

export function paintFog({ width = 1024, height = 256, seed = 9 } = {}) {
  const r = rng(seed);
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  // A soft base that thickens downward, so the mist has no hard top.
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, 'rgba(120,142,152,0)');
  base.addColorStop(1, 'rgba(120,142,152,0.35)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 70; i += 1) {
    const x = r() * width;
    const y = height * (0.3 + r() * 0.7);
    const rad = 60 + r() * 160;
    for (const ox of [-width, 0, width]) {
      const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
      g.addColorStop(0, `rgba(120,142,152,${0.12 + r() * 0.12})`);
      g.addColorStop(1, 'rgba(120,142,152,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
    }
  }
  // Feather the top edge.
  ctx.globalCompositeOperation = 'destination-in';
  const feather = ctx.createLinearGradient(0, 0, 0, height);
  feather.addColorStop(0, 'rgba(0,0,0,0)');
  feather.addColorStop(0.45, 'rgba(0,0,0,1)');
  ctx.fillStyle = feather;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

export function paintPuddle(w = 160, h = 18) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(10,20,26,0.9)');
  g.addColorStop(0.5, 'rgba(24,40,48,0.9)');
  g.addColorStop(1, 'rgba(10,20,26,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Reflected warm window and sky streak.
  ctx.fillStyle = 'rgba(240,184,101,0.35)';
  ctx.fillRect(w * 0.3, 0, w * 0.08, h);
  ctx.fillStyle = 'rgba(111,183,173,0.25)';
  ctx.fillRect(w * 0.62, 0, w * 0.05, h);
  ctx.fillStyle = 'rgba(234,223,198,0.18)';
  ctx.fillRect(0, h * 0.35, w, 1);
  ctx.restore();
  return canvas;
}

export function paintSplash() {
  const canvas = makeCanvas(24, 12);
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(210,222,226,0.8)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(4, 11); ctx.lineTo(2, 4);
  ctx.moveTo(12, 11); ctx.lineTo(12, 2);
  ctx.moveTo(20, 11); ctx.lineTo(22, 4);
  ctx.stroke();
  return canvas;
}

// Neon sign on a dark board. Low saturation, one of the three line colours.
export function paintSign(text, color, { w = 220, h = 64, lit = true, font = '"Space Mono", monospace' } = {}) {
  const pad = 30;
  const canvas = makeCanvas(w + pad * 2, h + pad * 2);
  const ctx = canvas.getContext('2d');
  const r = rng(text.length * 13 + 7);
  ctx.fillStyle = 'rgba(8,8,9,0.92)';
  ctx.fillRect(pad, pad, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 3;
  ctx.strokeRect(pad, pad, w, h);
  inkPath(ctx, [[pad, pad], [pad + w, pad], [pad + w, pad + h], [pad, pad + h]], { width: 1.4, alpha: 0.35, r, close: true });
  ctx.font = `700 ${Math.round(h * 0.46)}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = pad + w / 2;
  const cy = pad + h / 2 + 1;
  if (lit) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fillText(text, cx, cy, w - 24);
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f6ecd8';
    ctx.globalAlpha = 0.55;
    ctx.fillText(text, cx, cy, w - 24);
  } else {
    ctx.fillStyle = 'rgba(70,64,58,0.55)';
    ctx.fillText(text, cx, cy, w - 24);
  }
  return canvas;
}

// Butch's lamp and other light brushes for the blackout overlay: white core,
// soft falloff.
export function paintLightBrush(size = 256) {
  return paintRadial(size, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.85)'], [0.7, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0)']]);
}

// A train car in the title-screen livery: cream upper, rust-orange skirt,
// dark roof, warm windows.
export function paintTrainCar({ w = 760, h = 250, seed = 4, lead = false, door = true } = {}) {
  const r = rng(seed);
  const canvas = makeCanvas(w + 20, h + 40);
  const ctx = canvas.getContext('2d');
  const x0 = 10;
  const y0 = 20;
  // Roof.
  ctx.fillStyle = '#1b1c1d';
  ctx.beginPath();
  ctx.moveTo(x0 + 10, y0 + 40);
  ctx.quadraticCurveTo(x0 + 20, y0, x0 + 80, y0 + 2);
  ctx.lineTo(x0 + w - (lead ? 140 : 80), y0 + 2);
  ctx.quadraticCurveTo(x0 + w - (lead ? 20 : 20), y0, x0 + w - 10, y0 + 40);
  ctx.closePath();
  ctx.fill();
  // Body.
  const body = ctx.createLinearGradient(0, y0 + 36, 0, y0 + h);
  body.addColorStop(0, '#d9ccad');
  body.addColorStop(0.55, '#c3b491');
  body.addColorStop(0.56, '#a2482a');
  body.addColorStop(1, '#6a2c19');
  ctx.fillStyle = body;
  ctx.beginPath();
  if (lead) {
    ctx.moveTo(x0 + 8, y0 + 36);
    ctx.lineTo(x0 + w - 60, y0 + 36);
    ctx.quadraticCurveTo(x0 + w, y0 + 50, x0 + w - 4, y0 + h - 30);
    ctx.lineTo(x0 + w - 10, y0 + h - 16);
    ctx.lineTo(x0 + 8, y0 + h - 16);
  } else {
    ctx.rect(x0 + 8, y0 + 36, w - 16, h - 52);
  }
  ctx.closePath();
  ctx.fill();
  // Dirt and grain.
  grain(ctx, w, h, r, { alpha: 0.08 });
  ctx.fillStyle = 'rgba(40,28,18,0.25)';
  ctx.fillRect(x0 + 8, y0 + h - 60, w - 16, 44);
  // Windows.
  const winY = y0 + 64;
  for (let wx = x0 + 60; wx < x0 + w - 100; wx += 92) {
    if (door && Math.abs(wx - (x0 + w * 0.5)) < 60) continue;
    paintWindow(ctx, wx, winY, 62, 66, r, { lit: true, curtain: r() < 0.3, figure: false, warmth: 1 });
  }
  if (lead) paintWindow(ctx, x0 + w - 100, winY - 4, 70, 72, r, { lit: true, curtain: false, figure: false, warmth: 0.8 });
  // Door.
  if (door) {
    const dx = x0 + w * 0.5 - 34;
    ctx.fillStyle = '#6a2c19';
    ctx.fillRect(dx, y0 + 50, 68, h - 66);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(dx, y0 + 50, 2, h - 66);
    ctx.fillRect(dx + 66, y0 + 50, 2, h - 66);
    paintWindow(ctx, dx + 12, y0 + 64, 44, 60, r, { lit: true, curtain: false, figure: false });
  }
  // Bogies.
  ctx.fillStyle = '#0d0d0e';
  for (const bx of [x0 + 90, x0 + w - 170]) {
    ctx.fillRect(bx, y0 + h - 18, 110, 20);
    ctx.beginPath(); ctx.arc(bx + 22, y0 + h + 6, 14, 0, Math.PI * 2); ctx.arc(bx + 88, y0 + h + 6, 14, 0, Math.PI * 2); ctx.fill();
  }
  // Rim.
  inkLine(ctx, x0 + 60, y0 + 3, x0 + w - 80, y0 + 3, { width: 1.8, alpha: 0.5, r });
  inkLine(ctx, x0 + 8, y0 + 37, x0 + w - 20, y0 + 37, { width: 1.2, alpha: 0.35, r });
  // Amber light line along the car (the train's own borrowed light).
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(240,184,101,0.45)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(240,184,101,0.9)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let i = 0; i <= 40; i += 1) {
    const px = x0 + 10 + (w - 20) * (i / 40);
    const py = y0 + 140 + Math.sin(i * 0.7 + seed) * 6;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
  return canvas;
}

// A billboard face, dark (paper ghost) or lit (solid, glowing).
export function paintBillboard(w, h, text, lit) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const r = rng(w + h);
  if (lit) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e8d4a6');
    g.addColorStop(1, '#c79a5a');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = 'rgba(40,36,32,0.55)';
  }
  ctx.fillRect(0, 0, w, h);
  // Torn paper poster panels.
  ctx.strokeStyle = lit ? 'rgba(90,50,20,0.35)' : 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (let px = 90; px < w; px += 96 + r() * 20) { ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px + (r() - 0.5) * 6, h); ctx.stroke(); }
  ctx.font = `700 ${Math.round(h * 0.34)}px "Space Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = lit ? 'rgba(70,32,16,0.9)' : 'rgba(120,110,96,0.35)';
  ctx.fillText(text, w / 2, h * 0.46, w - 40);
  ctx.font = `400 ${Math.round(h * 0.15)}px "Space Mono", monospace`;
  ctx.fillText('THE LAST ARCHIVE LINE · EVERY STOP BY NIGHT', w / 2, h * 0.8, w - 60);
  return canvas;
}
