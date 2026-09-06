// Chapter 3 // ECHO CITY ISO — greybox art layer for the isometric scene.
//
// Every function draws through Phaser.GameObjects.Graphics in SCREEN space;
// the scene supplies projected coordinates. Layer slots mirror the offline
// Blender render layers (work package §6): ground, permanent shadows,
// district mechanisms, foreground occluders, relationship masks. Rendered
// WebP/PNG derivatives replace these vector blockouts in the Gate 5 art pass
// without touching mechanics.

import { CAR } from '../../art/colors.js';

export const ISO_COL = Object.freeze({
  base: 0x24120b,
  asphalt: 0x3a271d,
  plaza: 0x7b5032,
  sidewalk: 0xb48759,
  decal: 0xd0b27a,
  building: 0x3d1b14,
  buildingHi: 0x6c3322,
  roof: 0x24110f,
  green: 0x18473f,
  cyan: 0x55d4c8,
  amber: 0xe9a84e,
  red: CAR.LAMP_ALERT,  // 0xe45a5f surveillance
  white: CAR.HERO_BASE, // 0xdfe7f2 Butch placeholder
  mara: CAR.TUNGSTEN,   // 0xffc98a Mara placeholder
  crowd: 0xb58c72,
  metal: CAR.STEEL_MID,
  metalHi: CAR.STEEL_HI,
  ink: 0x0a1015,
  water: 0x24444a,
});

export const ITXT = Object.freeze({
  white: '#f5e7ce',
  panel: 'rgba(39,18,12,0.88)',
  ok: '#55d4c8',
  warn: '#e9a84e',
  alert: '#e45a5f',
  tungsten: '#ffc98a',
});

// ---------------------------------------------------------------------------
// Ground polygons
// ---------------------------------------------------------------------------

export function fillPoly(g, pts, color, alpha = 1) {
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

export function strokePoly(g, pts, color, alpha = 1, width = 2, closed = true) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (closed) g.closePath();
  g.strokePath();
}

// flat diamond/ellipse ground marker (record mark, pads, move pings)
export function drawGroundDisc(g, x, y, rx, ry, color, alpha = 1, line = 0) {
  if (line > 0) {
    g.lineStyle(line, color, alpha);
    g.strokeEllipse(x, y, rx * 2, ry * 2);
  } else {
    g.fillStyle(color, alpha);
    g.fillEllipse(x, y, rx * 2, ry * 2);
  }
}

// ---------------------------------------------------------------------------
// Actors — greybox capsules with a facing tick and walk bob.
// (Replaced by 8-direction atlases in Gate 5; slots stay replaceable.)
// ---------------------------------------------------------------------------

export function drawActor(g, x, y, h, w, color, opts = {}) {
  const { facing = null, bob = 0, alpha = 1, ghost = false, outlined = false } = opts;
  const lift = Math.abs(Math.sin(bob)) * h * 0.04;
  const top = y - h + lift;
  if (outlined) {
    g.lineStyle(4, ISO_COL.ink, alpha * 0.85);
    g.strokeRoundedRect(x - w / 2, top, w, h * 0.72, w * 0.45);
  }
  g.fillStyle(color, ghost ? alpha * 0.45 : alpha);
  g.fillRoundedRect(x - w / 2, top, w, h * 0.72, w * 0.45);
  // head
  g.fillCircle(x, top - w * 0.18, w * 0.34);
  if (facing !== null) {
    // facing tick: project the world facing into a short screen-space mark
    const rad = (facing * Math.PI) / 180;
    const fx = Math.cos(rad) * 0.7071 + Math.sin(rad) * 0.7071; // screen x of world dir
    const fy = (Math.sin(rad) - Math.cos(rad)) * 0.58 * 0.7071; // screen y of world dir
    const len = Math.hypot(fx, fy) || 1;
    g.lineStyle(3, ghost ? color : ISO_COL.ink, alpha * 0.9);
    g.beginPath();
    g.moveTo(x, top - w * 0.18);
    g.lineTo(x + (fx / len) * w * 0.62, top - w * 0.18 + (fy / len) * w * 0.62);
    g.strokePath();
  }
  // soft contact shadow
  g.fillStyle(ISO_COL.ink, 0.35 * alpha);
  g.fillEllipse(x, y + 2, w * 1.15, w * 0.5);
}

// ---------------------------------------------------------------------------
// Mechanisms (screen space, per-district)
// ---------------------------------------------------------------------------

export function drawClock(g, x, y, u, time, pulse) {
  // u = pixels per meter at the current camera
  const bw = 2.4 * u;
  const colH = 3.4 * u;
  const headH = 1.7 * u;
  // stepped base
  g.fillStyle(ISO_COL.sidewalk, 1);
  g.fillEllipse(x, y, bw * 1.6, bw * 0.8);
  g.fillStyle(ISO_COL.plaza, 1);
  g.fillEllipse(x, y - 0.3 * u, bw * 1.2, bw * 0.6);
  // column
  g.fillStyle(ISO_COL.metal, 1);
  g.fillRect(x - bw * 0.22, y - colH, bw * 0.44, colH);
  g.fillStyle(ISO_COL.metalHi, 0.6);
  g.fillRect(x - bw * 0.22, y - colH, bw * 0.12, colH);
  // clock head with four glowing faces
  const hy = y - colH - headH;
  g.fillStyle(ISO_COL.ink, 1);
  g.fillRoundedRect(x - bw * 0.5, hy, bw, headH, 3);
  g.fillStyle(ISO_COL.cyan, 0.85 + pulse * 0.15);
  g.fillRoundedRect(x - bw * 0.38, hy + headH * 0.16, bw * 0.76, headH * 0.68, 2);
  // hands
  const cx = x; const cy = hy + headH * 0.5;
  g.lineStyle(2.5, ISO_COL.ink, 0.95);
  const mAng = (time / 6000) % (Math.PI * 2);
  const hAng = (time / 72000) % (Math.PI * 2);
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(mAng) * bw * 0.26, cy - Math.cos(mAng) * bw * 0.26); g.strokePath();
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(hAng) * bw * 0.17, cy - Math.cos(hAng) * bw * 0.17); g.strokePath();
  // spire
  g.fillStyle(ISO_COL.metal, 1);
  g.fillTriangle(x - bw * 0.18, hy, x + bw * 0.18, hy, x, hy - 0.9 * u);
}

export function drawStall(g, x, y, u, open, pulse) {
  const w = 3.0 * u; const d = 1.5 * u; const h = 2.0 * u;
  g.fillStyle(ISO_COL.green, 1);
  g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(open ? ISO_COL.amber : ISO_COL.metal, open ? 0.95 : 0.9);
  g.fillRect(x - w / 2 - 0.2 * u, y - h - 0.45 * u, w + 0.4 * u, 0.5 * u);
  // counter goods glow when the stall is awake
  if (open) {
    g.fillStyle(ISO_COL.tungsten, 0.5 + pulse * 0.3);
    g.fillRect(x - w * 0.32, y - h * 0.55, w * 0.64, h * 0.2);
  }
  void d;
}

// Gate 5: shutter leaves between the two baked gate posts. (ax,ay)-(bx,by) are
// the projected screen positions of post A and post B; leaves slide up with openK.
export function drawMarketGate(g, ax, ay, bx, by, u, openK, shutters, pulse) {
  const dx = bx - ax; const dy = by - ay;
  const h = 2.35 * u;
  const closed = Math.max(0, 1 - openK);
  if (closed <= 0.02) return;
  const midX = ax + dx * 0.5; const midY = ay + dy * 0.5;
  const wobble = shutters === 'flapping' ? Math.sin(pulse * 7) * 0.055 : 0;
  const col = shutters === 'flapping' ? ISO_COL.red : ISO_COL.metalHi;

  // Two wrought-iron leaves retract into their posts. The dark translucent
  // fill preserves the painted environment; thin hot edges communicate the
  // locked/error state without four opaque debug banners.
  const leaves = [
    { x0: ax, y0: ay, x1: ax + (midX - ax) * closed, y1: ay + (midY - ay) * closed },
    { x0: bx, y0: by, x1: bx + (midX - bx) * closed, y1: by + (midY - by) * closed },
  ];
  for (let li = 0; li < leaves.length; li++) {
    const leaf = leaves[li];
    const topShift = (li === 0 ? wobble : -wobble) * u;
    g.fillStyle(ISO_COL.ink, 0.62);
    g.lineStyle(2.2, col, shutters === 'flapping' ? 0.95 : 0.72);
    g.beginPath();
    g.moveTo(leaf.x0, leaf.y0);
    g.lineTo(leaf.x1, leaf.y1);
    g.lineTo(leaf.x1 + topShift, leaf.y1 - h);
    g.lineTo(leaf.x0 + topShift, leaf.y0 - h);
    g.closePath();
    g.fillPath();
    g.strokePath();
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const x = leaf.x0 + (leaf.x1 - leaf.x0) * t;
      const y = leaf.y0 + (leaf.y1 - leaf.y0) * t;
      g.lineStyle(1.25, li === 0 ? ISO_COL.amber : col, 0.62);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + topShift, y - h); g.strokePath();
    }
  }
}

export function drawBus(g, x, y, u, stepKind, pulse) {
  const w = 3.2 * u; const h = 2.6 * u; const L = 7.2 * u;
  g.fillStyle(ISO_COL.green, 1);
  g.fillRoundedRect(x - w / 2, y - h - L * 0.0, w, h, 4);
  g.fillStyle(ISO_COL.cyan, stepKind === 'open' ? 0.95 : 0.45 + pulse * 0.1);
  g.fillRoundedRect(x - w / 2 + 0.25 * u, y - h + 0.3 * u, w - 0.5 * u, h * 0.42, 3);
  // open door glow
  if (stepKind === 'open') {
    g.fillStyle(ISO_COL.amber, 0.85);
    g.fillRect(x + w / 2 - 0.5 * u, y - h * 0.5, 0.4 * u, h * 0.5);
  }
  void L;
}

export function drawCrosswalkSignal(g, x, y, u, stepKind, pulse) {
  const h = 2.6 * u;
  g.fillStyle(ISO_COL.metal, 1);
  g.fillRect(x - 0.15 * u, y - h, 0.3 * u, h);
  g.fillStyle(ISO_COL.ink, 1);
  g.fillRoundedRect(x - 0.5 * u, y - h - 1.0 * u, 1.0 * u, 1.1 * u, 3);
  const walk = stepKind === 'move';
  g.fillStyle(walk ? ISO_COL.cyan : ISO_COL.red, 0.75 + pulse * 0.25);
  g.fillCircle(x, y - h - 0.45 * u, 0.3 * u);
}

export function drawBarrier(g, x, y, u, resultState, openK, pulse) {
  // Gate 5: the post is baked into the transit layer; only the arm is dynamic.
  let ang = -85 * openK;
  if (resultState === 'twitching') ang = -28 - Math.sin(pulse * 7) * 12;
  const len = 3.4 * u;
  const rad = (ang * Math.PI) / 180;
  const ax = x; const ay = y - 1.7 * u; // pivot at the baked post head
  g.lineStyle(7, ISO_COL.ink, 0.7);
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(ax + Math.cos(rad) * len * 0.9, ay + Math.sin(rad) * len * 0.9);
  g.strokePath();
  g.lineStyle(4, resultState === 'twitching' ? ISO_COL.red : ISO_COL.amber, 0.95);
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(ax + Math.cos(rad) * len * 0.9, ay + Math.sin(rad) * len * 0.9);
  g.strokePath();
}

export function drawField(g, corners, state, safe, pulse) {
  // Surveillance reads as a moving shaft of light between physical pylons,
  // never as a debug polygon painted over the square.
  if (!safe) {
    const t = pulse;
    const a = corners[0]; const b = corners[1]; const d = corners[2]; const c = corners[3];
    const x1 = a.x + (b.x - a.x) * t; const y1 = a.y + (b.y - a.y) * t;
    const x2 = d.x + (c.x - d.x) * t; const y2 = d.y + (c.y - d.y) * t;
    const alpha = state === 'warning' ? 0.68 : 0.34;
    g.lineStyle(state === 'warning' ? 4 : 2, ISO_COL.red, alpha);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    g.lineStyle(1, ISO_COL.amber, alpha * 0.45);
    g.beginPath(); g.moveTo(x1 + 5, y1); g.lineTo(x2 + 5, y2); g.strokePath();
  }
}

export function drawFountain(g, x, y, u, resonating, pulse) {
  const r = 4.2 * u; const ry = r * 0.5;
  g.fillStyle(ISO_COL.sidewalk, 1);
  g.fillEllipse(x, y, r * 2, ry * 2);
  g.fillStyle(ISO_COL.water, 1);
  g.fillEllipse(x, y - 0.25 * u, r * 1.7, ry * 1.7);
  // silent water: still arcs unless resonating
  g.lineStyle(2, resonating ? ISO_COL.amber : ISO_COL.metalHi, resonating ? 0.9 : 0.35);
  for (let i = 1; i <= 3; i++) {
    const rr = (r * 0.28 * i) + (resonating ? Math.sin(pulse * 4 + i) * u * 0.2 : 0);
    g.strokeEllipse(x, y - 0.25 * u, rr * 2, rr);
  }
  // core
  g.fillStyle(ISO_COL.metal, 1);
  g.fillRect(x - 0.5 * u, y - 2.2 * u, 1.0 * u, 2.0 * u);
  g.fillStyle(ISO_COL.metalHi, 0.7);
  g.fillEllipse(x, y - 2.2 * u, 1.0 * u, 0.5 * u);
}

export function drawBell(g, x, y, u, state, ringK, pulse) {
  const h = 2.6 * u;
  g.lineStyle(4, ISO_COL.metal, 1);
  g.beginPath(); g.moveTo(x - 0.8 * u, y); g.lineTo(x - 0.8 * u, y - h); g.strokePath();
  g.beginPath(); g.moveTo(x + 0.8 * u, y); g.lineTo(x + 0.8 * u, y - h); g.strokePath();
  g.beginPath(); g.moveTo(x - 1.0 * u, y - h); g.lineTo(x + 1.0 * u, y - h); g.strokePath();
  const sway = state === 'resonating' ? Math.sin(pulse * 9) * 0.12 * u : 0;
  g.fillStyle(ISO_COL.amber, state === 'idle' ? 0.75 : 0.95);
  g.fillCircle(x + sway, y - h + 0.55 * u, 0.42 * u);
  if (ringK > 0) {
    g.lineStyle(2.5, ISO_COL.amber, ringK * 0.8);
    g.strokeCircle(x, y - h + 0.55 * u, (0.6 + (1 - ringK) * 1.6) * u);
  }
}

// Gate 5: posts are baked into the fountain layer; only the red denial field
// between them is dynamic. (ax,ay)-(bx,by) = projected post positions.
export function drawWitnessGate(g, ax, ay, bx, by, u, state, pulse) {
  if (state === 'open') return;
  const k = state === 'opening' ? 0.5 : 1;
  const dx = bx - ax; const dy = by - ay;
  const h = 2.9 * u * k;
  g.fillStyle(ISO_COL.red, 0.26 * k);
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(bx, by);
  g.lineTo(bx, by - h);
  g.lineTo(ax, ay - h);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, ISO_COL.red, 0.5 + pulse * 0.25);
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const x = ax + dx * t; const y = ay + dy * t;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y - h);
    g.strokePath();
  }
  g.beginPath();
  g.moveTo(ax, ay - h);
  g.lineTo(bx, by - h);
  g.strokePath();
}

export function drawTrainThreshold(g, x, y, u) {
  // platform edge + carriage silhouette to the south
  g.fillStyle(ISO_COL.amber, 0.8);
  g.fillRect(x - 7 * u, y, 14 * u, 0.22 * u);
  g.fillStyle(ISO_COL.ink, 0.95);
  g.fillRect(x - 8 * u, y + 1.2 * u, 16 * u, 3.2 * u);
  g.fillStyle(ISO_COL.cyan, 0.25);
  for (let i = 0; i < 5; i++) g.fillRect(x - 7 * u + i * 3 * u, y + 1.8 * u, 1.6 * u, 1.0 * u);
}

// ---------------------------------------------------------------------------
// Relationship FX
// ---------------------------------------------------------------------------

export function drawFocusOutline(g, x, y, rx, ry, color, pulse) {
  g.lineStyle(2.5, color, 0.65 + pulse * 0.35);
  g.strokeEllipse(x, y, rx * 2, ry * 2);
  // corner ticks (shape language: focus = diamond ticks, not just colour)
  g.lineStyle(3.5, color, 0.9);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const px = x + Math.cos(a) * rx * 1.25;
    const py = y + Math.sin(a) * ry * 1.25;
    g.beginPath();
    g.moveTo(px - Math.cos(a) * 6, py - Math.sin(a) * 4);
    g.lineTo(px, py);
    g.strokePath();
  }
}

export function drawProgressRing(g, x, y, r, k, color, alpha = 1) {
  g.lineStyle(5, ISO_COL.ink, alpha * 0.6);
  g.strokeCircle(x, y, r);
  if (k > 0) {
    g.lineStyle(4, color, alpha);
    g.beginPath();
    g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, k));
    g.strokePath();
  }
}

export function drawTracePath(g, pts, color, alpha, t) {
  // dotted looping trace: dots travel along the polyline with time t
  strokePoly(g, pts, color, alpha * 0.35, 2, false);
  const segLens = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const L = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(L); total += L;
  }
  const dots = 14;
  g.fillStyle(color, alpha);
  for (let i = 0; i < dots; i++) {
    let d = (((i / dots) + t) % 1) * total;
    for (let s = 0; s < segLens.length; s++) {
      if (d <= segLens[s]) {
        const k = segLens[s] > 0 ? d / segLens[s] : 0;
        g.fillCircle(
          pts[s].x + (pts[s + 1].x - pts[s].x) * k,
          pts[s].y + (pts[s + 1].y - pts[s].y) * k,
          2.6,
        );
        break;
      }
      d -= segLens[s];
    }
  }
}

export function drawMovePing(g, x, y, k, color) {
  drawGroundDisc(g, x, y, 10 + (1 - k) * 22, 5 + (1 - k) * 11, color, k * 0.8, 2.5);
  drawGroundDisc(g, x, y, 4, 2, color, k, 0);
}

// pictogram chip: rounded box + short label drawn by the scene's text pool
export function chipFrame(g, x, y, w, h, color, alpha) {
  g.fillStyle(ISO_COL.ink, alpha * 0.85);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 5);
  g.lineStyle(2, color, alpha);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 5);
}
