// Act 0 · ONE WINDOW — the lost-property office through one rainy carriage
// window, and the four pictures inside it: the desk bell (the Conductor's
// lantern in its polished curve), claim stub 1978-0412, its punch hole become
// a porthole, and the whole carriage outside in the rain.
//
// Every panel is the shared carriage-window size (panelModel CARRIAGE_TILE)
// so the same office painting carries on into Act 0.5 and Act 1.

import {
  PAL, brassFill, brushTexture, glow, hgrad, ink, inkEllipse, inkLine, inkRect, rivet, rng, roundRectPath,
  speckle, vgrad, wood,
} from './ink.js';
import { CLAIM_SPIKE, DESK_BELL, drawDesk, finish } from './act1Art.js';

// ---------------------------------------------------------------------------
// geometry (tile-normalised, 1.8 : 1 panels)

const TOP = DESK_BELL.y;
/** Click targets in the office, and the squares they zoom into. */
export const BELL_HIT = Object.freeze([DESK_BELL.x - 0.03, TOP - 0.085, 0.06, 0.095]);
export const BELL_ZOOM = Object.freeze([DESK_BELL.x - 0.07, TOP - 0.1, 0.14, 0.14]);
export const SPIKE_HIT = Object.freeze([CLAIM_SPIKE.x - 0.022, TOP - 0.1, 0.044, 0.105]);
export const SPIKE_ZOOM = Object.freeze([CLAIM_SPIKE.x - 0.06, TOP - 0.1, 0.12, 0.12]);
/** In the bell close-up: the plunger. */
export const STRIKE_HIT = Object.freeze([0.43, 0.08, 0.14, 0.26]);
/** In the stub close-up: the conductor's punch hole (radius in tile px at 1.8:1, 745 wide). */
export const HOLE = Object.freeze({ x: 0.72, y: 0.4, r: 18 });
export const HOLE_ZOOM = Object.freeze([HOLE.x - 0.06, HOLE.y - 0.06, 0.12, 0.12]);
export const HOLE_HIT = Object.freeze([HOLE.x - 0.045, HOLE.y - 0.08, 0.09, 0.16]);
/** The porthole's glass (the zoom goes through it). */
export const GLASS = Object.freeze({ x: 0.5, y: 0.5, r: 150 });
export const GLASS_ZOOM = Object.freeze([0.32, 0.32, 0.36, 0.36]);
/** The carriage from outside: five windows; the office is the lit one. */
export const CAR_WINDOWS = Object.freeze([0.06, 0.25, 0.44, 0.63, 0.82]);
export const CAR_WINDOW_Y = 0.38;
export const CAR_WINDOW_SIZE = 0.13;
export const LIT_WINDOW = Object.freeze([CAR_WINDOWS[2], CAR_WINDOW_Y, CAR_WINDOW_SIZE, CAR_WINDOW_SIZE]);

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeInOut = (t) => 0.5 - Math.cos(Math.PI * clamp01(t)) / 2;

// ---------------------------------------------------------------------------
// the office, seen from outside through the rain (the panel is the glass)

function glassOverlay(ctx) {
  const { w, h } = ctx;
  ctx.paint('act0-glass', (c) => {
    // cool sheen bands across the glass
    c.save();
    c.globalCompositeOperation = 'lighter';
    [[0.08, 0.2, 0.05], [0.3, 0.36, 0.035], [0.7, 0.78, 0.03]].forEach(([a, b, alpha]) => {
      c.fillStyle = `rgba(190, 215, 255, ${alpha})`;
      c.beginPath();
      c.moveTo(w * a, -30); c.lineTo(w * b, -30); c.lineTo(w * (b - 0.22), h + 30); c.lineTo(w * (a - 0.22), h + 30); c.closePath();
      c.fill();
    });
    c.restore();
    // condensation fogging the lower corners
    const fog = c.createRadialGradient(0, h, 10, 0, h, h * 0.9);
    fog.addColorStop(0, 'rgba(170, 190, 205, 0.28)');
    fog.addColorStop(1, 'rgba(170, 190, 205, 0)');
    c.fillStyle = fog;
    c.fillRect(-30, -30, w + 60, h + 60);
    const fog2 = c.createRadialGradient(w, h, 10, w, h, h * 0.7);
    fog2.addColorStop(0, 'rgba(170, 190, 205, 0.22)');
    fog2.addColorStop(1, 'rgba(170, 190, 205, 0)');
    c.fillStyle = fog2;
    c.fillRect(-30, -30, w + 60, h + 60);
    // beads of rain resting on the glass
    const random = rng(4021);
    for (let i = 0; i < 150; i += 1) {
      const x = random() * w;
      const y = random() * h;
      const r = 0.8 + random() * random() * 3.4;
      c.fillStyle = 'rgba(20, 30, 45, 0.28)';
      c.beginPath(); c.ellipse(x, y + r * 0.2, r, r * 1.15, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(235, 240, 255, 0.55)';
      c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, Math.max(0.5, r * 0.32), 0, Math.PI * 2); c.fill();
    }
    // a few long runnels already on their way down
    for (let i = 0; i < 9; i += 1) {
      const x = random() * w;
      const y0 = random() * h * 0.5;
      const len = h * (0.2 + random() * 0.5);
      ink(c, [[x, y0], [x - 4 - random() * 6, y0 + len * 0.5], [x - 6 - random() * 10, y0 + len]], { w: 1.4, color: 'rgba(210, 225, 245, 0.35)', jitter: 1.2, bleed: false });
    }
  });
  ctx.rain(0, 0, w, h, { count: 46 });
}

/** State `office`: Butch asleep at the desk, seen through the rainy carriage glass. */
export function drawOfficeOutside(ctx) {
  drawDesk(ctx, { key: true });
  glassOverlay(ctx);
}

/** State `inside`: the same office once the zoom has come back in through the window. */
export function drawOfficeInside(ctx) {
  drawDesk(ctx, { key: true });
}

// ---------------------------------------------------------------------------
// the desk bell, up close: its polished curve holds the room — and a lantern

function bokeh(c, w, h, seed) {
  const random = rng(seed);
  for (let i = 0; i < 14; i += 1) {
    const x = random() * w;
    const y = random() * h * 0.5;
    const r = 14 + random() * 40;
    glow(c, x, y, r, random() > 0.5 ? 'rgba(255, 196, 120, 0.9)' : 'rgba(150, 190, 190, 0.8)', 0.12 + random() * 0.16);
  }
}

function domePath(c, cx, baseY, rx, ry) {
  c.beginPath();
  c.moveTo(cx - rx, baseY);
  c.bezierCurveTo(cx - rx, baseY - ry * 0.9, cx - rx * 0.55, baseY - ry, cx, baseY - ry);
  c.bezierCurveTo(cx + rx * 0.55, baseY - ry, cx + rx, baseY - ry * 0.9, cx + rx, baseY);
  c.closePath();
}

export function drawBellClose(ctx) {
  const { w, h } = ctx;
  const cx = w * 0.5;
  const baseY = h * 0.8;
  const rx = w * 0.225;
  const ry = h * 0.44;
  ctx.paint('act0-bell', (c, env) => {
    // the office behind, out of focus
    c.fillStyle = vgrad(c, -30, h * 0.6, [[0, '#0f1b1f'], [1, '#1d3338']]);
    c.fillRect(-30, -30, w + 60, h * 0.6 + 30);
    brushTexture(c, 0, 0, w, h * 0.6, { seed: 4101, color: 'rgba(200, 230, 230, 0.03)', count: 60, len: 120 });
    bokeh(c, w, h, 4102);
    // the desk top in close-up: walnut, the ledger's page edge, lamplight
    wood(c, -30, h * 0.6, w + 60, h * 0.4 + 30, { base: '#5a3a22', seed: 4103, grain: 'rgba(0,0,0,0.22)' });
    c.fillStyle = vgrad(c, h * 0.6, h, [[0, 'rgba(255, 210, 150, 0.12)'], [1, 'rgba(0,0,0,0.35)']]);
    c.fillRect(-30, h * 0.6, w + 60, h * 0.4 + 30);
    c.fillStyle = '#e9dfc4';
    c.beginPath(); c.moveTo(-30, h * 0.66); c.lineTo(w * 0.16, h * 0.64); c.lineTo(w * 0.2, h + 30); c.lineTo(-30, h + 30); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(60, 45, 30, 0.35)'; c.lineWidth = 1.2;
    for (let i = 0; i < 6; i += 1) { c.beginPath(); c.moveTo(-10, h * (0.72 + i * 0.05)); c.lineTo(w * 0.16, h * (0.7 + i * 0.05)); c.stroke(); }
    ink(c, [[-30, h * 0.66], [w * 0.16, h * 0.64], [w * 0.2, h + 30]], { w: 2 });
    ink(c, [[-20, h * 0.6], [w + 20, h * 0.6]], { w: 2.2, alpha: 0.7 });
    glow(c, w * 0.18, h * 0.3, w * 0.5, 'rgba(255, 200, 120, 0.9)', 0.18);
    // the bell's walnut base
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30; c.shadowOffsetY = 14;
    c.fillStyle = '#2c1a0f';
    c.beginPath(); c.ellipse(cx, baseY + 16, rx * 1.16, 30, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    wood(c, cx - rx * 1.16, baseY - 4, rx * 2.32, 34, { base: '#3a2416', seed: 4104 });
    c.fillStyle = '#3a2416';
    c.beginPath(); c.ellipse(cx, baseY + 30, rx * 1.16, 14, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#4e321e';
    c.beginPath(); c.ellipse(cx, baseY - 2, rx * 1.16, 16, 0, 0, Math.PI * 2); c.fill();
    inkEllipse(c, cx, baseY - 2, rx * 1.16, 16, { w: 2 });
    ink(c, [[cx - rx * 1.16, baseY - 2], [cx - rx * 1.16, baseY + 28]], { w: 2 });
    ink(c, [[cx + rx * 1.16, baseY - 2], [cx + rx * 1.16, baseY + 28]], { w: 2 });
    // the dome: polished brass
    c.save();
    domePath(c, cx, baseY, rx, ry);
    const g = c.createRadialGradient(cx - rx * 0.35, baseY - ry * 0.75, 10, cx, baseY - ry * 0.3, rx * 1.2);
    g.addColorStop(0, '#fff1c4');
    g.addColorStop(0.18, PAL.brassLight);
    g.addColorStop(0.55, PAL.brass);
    g.addColorStop(0.85, '#6e5128');
    g.addColorStop(1, '#3d2c15');
    c.fillStyle = g;
    c.fill();
    c.clip();
    // the room, bent around the curve: the dark carriage, a window band, a lamp
    c.globalAlpha = 0.55;
    c.fillStyle = '#1b2c2c';
    c.beginPath(); c.ellipse(cx + rx * 0.1, baseY - ry * 0.28, rx * 0.95, ry * 0.36, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.5;
    c.strokeStyle = '#e6c88a';
    c.lineWidth = 7;
    c.beginPath(); c.ellipse(cx + rx * 0.1, baseY - ry * 0.16, rx * 0.86, ry * 0.3, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    c.globalAlpha = 0.35;
    c.fillStyle = '#9fb7b4';
    c.beginPath(); c.ellipse(cx - rx * 0.4, baseY - ry * 0.45, rx * 0.16, ry * 0.12, -0.5, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    glow(c, cx - rx * 0.1, baseY - ry * 0.62, 26, 'rgba(255, 230, 170, 0.95)', 0.8);
    // a warped doorway on the right of the reflection: where the lantern comes from
    c.fillStyle = 'rgba(8, 10, 12, 0.55)';
    c.beginPath(); c.moveTo(cx + rx * 0.55, baseY - ry * 0.62); c.quadraticCurveTo(cx + rx * 0.72, baseY - ry * 0.4, cx + rx * 0.66, baseY - ry * 0.08); c.lineTo(cx + rx * 0.46, baseY - ry * 0.1); c.quadraticCurveTo(cx + rx * 0.5, baseY - ry * 0.4, cx + rx * 0.4, baseY - ry * 0.6); c.closePath(); c.fill();
    // polish: a soft specular streak and a rim of shadow
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(255, 250, 225, 0.42)';
    c.beginPath(); c.ellipse(cx - rx * 0.46, baseY - ry * 0.6, rx * 0.07, ry * 0.26, 0.55, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.restore();
    c.save();
    domePath(c, cx, baseY, rx, ry);
    c.lineWidth = 16;
    c.strokeStyle = 'rgba(40, 25, 10, 0.35)';
    c.stroke();
    c.restore();
    ink(c, [[cx - rx, baseY], [cx - rx * 0.98, baseY - ry * 0.5], [cx - rx * 0.6, baseY - ry * 0.93], [cx, baseY - ry], [cx + rx * 0.6, baseY - ry * 0.93], [cx + rx * 0.98, baseY - ry * 0.5], [cx + rx, baseY]], { w: 2.6 });
    // the plunger
    const stemTop = baseY - ry - h * 0.1;
    c.fillStyle = brassFill(c, cx - 7, stemTop, 14, h * 0.1, true);
    c.fillRect(cx - 6, stemTop, 12, h * 0.1 + 4);
    c.fillStyle = brassFill(c, cx - 24, stemTop - 20, 48, 26);
    c.beginPath(); c.ellipse(cx, stemTop - 6, 24, 14, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255, 245, 210, 0.6)';
    c.beginPath(); c.ellipse(cx - 8, stemTop - 12, 7, 3.5, -0.2, 0, Math.PI * 2); c.fill();
    inkEllipse(c, cx, stemTop - 6, 24, 14, { w: 2 });
    ink(c, [[cx - 6, stemTop + 4], [cx - 6, baseY - ry + 2]], { w: 1.8 });
    ink(c, [[cx + 6, stemTop + 4], [cx + 6, baseY - ry + 2]], { w: 1.8 });
    finish(c, env, { vig: 0.55, grain: 0.14 });
  });
  // The Conductor's lantern in the curve: far at first, then near. Starts
  // when the close-up is built (when the zoom arrives).
  const figure = ctx.sprite('act0-reflect-figure', 60, 120, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, 'rgba(10, 8, 6, 0)');
    g.addColorStop(0.2, 'rgba(10, 8, 6, 0.8)');
    g.addColorStop(1, 'rgba(10, 8, 6, 0.1)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(30, 22, 9, 11, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(14, 34); c.quadraticCurveTo(30, 26, 46, 34); c.lineTo(52, 118); c.lineTo(8, 118); c.closePath(); c.fill();
    c.fillRect(17, 14, 26, 5);
  }, cx + rx * 0.6, baseY - ry * 0.4, { origin: [0.5, 0.5], alpha: 0 });
  const lantern = ctx.glow(cx + rx * 0.6, baseY - ry * 0.34, 20, { color: 0xffb860, alpha: 0 });
  const core = ctx.glow(cx + rx * 0.6, baseY - ry * 0.34, 8, { color: 0xfff0c0, alpha: 0 });
  let t0 = null;
  let flare = 0;
  ctx.animate((time, dt) => {
    if (t0 === null) t0 = time;
    const k = easeInOut((time - t0 - 500) / 3400);
    const x = cx + rx * (0.62 - k * 0.32);
    const y = baseY - ry * (0.36 + k * 0.06);
    const sway = Math.sin(time / 380) * (ctx.reduceMotion() ? 1 : 4) * k;
    figure.setPosition(x + 8, y - 10 + k * 6).setScale((0.28 + k * 0.62) / 3).setAlpha(0.15 + k * 0.5);
    if (ctx.flag('rung')) flare = Math.min(1, flare + dt / 500);
    const size = 22 + k * 70 + flare * 40;
    lantern.setPosition(x - 10 + sway, y + 8).setDisplaySize(size, size).setAlpha((0.25 + k * 0.6) * (0.9 + Math.sin(time / 90) * 0.05));
    core.setPosition(x - 10 + sway, y + 8).setDisplaySize(8 + k * 18, 8 + k * 18).setAlpha(0.3 + k * 0.6);
  });
  ctx.glow(cx - rx * 0.1, baseY - ry * 0.62, 70, { color: 0xffe0a0, alpha: 0.25, flicker: 0.06 });
}

// ---------------------------------------------------------------------------
// the claim stub on the spike: 1978-0412, and its punch hole

function stubCard(c, x, y, w, h, { tone = '#e8dcc0', seed = 1, angle = 0 } = {}) {
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.rotate(angle);
  c.translate(-w / 2, -h / 2);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 8;
  c.fillStyle = tone;
  c.fillRect(0, 0, w, h);
  c.shadowColor = 'transparent';
  speckle(c, 0, 0, w, h, { count: Math.round(w * h / 60), color: 'rgba(110, 80, 40, 0.1)', size: 2, seed });
  c.restore();
}

export function drawTicketClose(ctx) {
  const { w, h } = ctx;
  const hx = HOLE.x * w;
  const hy = HOLE.y * h;
  ctx.paint('act0-ticket', (c, env) => {
    wood(c, -30, -30, w + 60, h + 60, { base: '#4a3020', seed: 4201, grain: 'rgba(0,0,0,0.2)' });
    glow(c, w * 0.12, h * 0.05, w * 0.6, 'rgba(255, 200, 120, 0.9)', 0.2);
    // older stubs beneath, yellowed
    stubCard(c, w * 0.08, h * 0.2, w * 0.8, h * 0.62, { tone: '#cdbb92', seed: 4202, angle: 0.05 });
    stubCard(c, w * 0.1, h * 0.17, w * 0.8, h * 0.64, { tone: '#d9c9a2', seed: 4203, angle: -0.035 });
    // the top stub
    const sx = w * 0.1;
    const sy = h * 0.15;
    const sw = w * 0.82;
    const sh = h * 0.68;
    stubCard(c, sx, sy, sw, sh, { tone: '#ece1c6', seed: 4204, angle: -0.012 });
    c.save();
    c.translate(sx + sw / 2, sy + sh / 2); c.rotate(-0.012); c.translate(-sw / 2, -sh / 2);
    // perforation, stub half and claim half
    c.fillStyle = 'rgba(80, 60, 40, 0.55)';
    for (let y = 8; y < sh - 6; y += 11) { c.beginPath(); c.arc(sw * 0.2, y, 2.1, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(107, 42, 34, 0.85)';
    c.fillRect(0, 0, sw, 14);
    c.fillRect(0, sh - 10, sw, 10);
    // CLAIM stamp and the number
    c.strokeStyle = 'rgba(150, 40, 30, 0.85)'; c.lineWidth = 3;
    c.strokeRect(sw * 0.27, sh * 0.16, sw * 0.2, sh * 0.16);
    c.fillStyle = 'rgba(150, 40, 30, 0.9)';
    c.font = '700 26px "Space Mono", monospace';
    c.fillText('CLAIM', sw * 0.285, sh * 0.285);
    c.fillStyle = '#2a1d14';
    c.font = '700 58px "Space Mono", monospace';
    c.fillText('1978-0412', sw * 0.27, sh * 0.62);
    c.fillStyle = 'rgba(60, 45, 30, 0.5)';
    [0.72, 0.8, 0.88].forEach((v, i) => c.fillRect(sw * 0.27, sh * v, sw * (i === 2 ? 0.2 : 0.36), 3));
    // the stub half: a printed night-service locomotive and the same number, small
    c.fillStyle = 'rgba(42, 29, 20, 0.8)';
    c.font = '700 15px "Space Mono", monospace';
    c.save(); c.translate(sw * 0.1, sh * 0.82); c.rotate(-Math.PI / 2); c.fillText('1978-0412', 0, 0); c.restore();
    ink(c, [[sw * 0.05, sh * 0.2], [sw * 0.15, sh * 0.2], [sw * 0.15, sh * 0.3], [sw * 0.05, sh * 0.3]], { w: 1.3, closed: true, color: '#3a2a1c', bleed: false });
    c.restore();
    // the spike through the stub, and its brass base
    const kx = w * 0.16;
    c.fillStyle = brassFill(c, kx - 4, -30, 8, h + 60, true);
    c.fillRect(kx - 3, -30, 6, h * 0.5 + 30);
    c.fillStyle = 'rgba(40, 25, 15, 0.7)';
    c.beginPath(); c.arc(kx, h * 0.5, 7, 0, Math.PI * 2); c.fill();
    ink(c, [[kx - 9, h * 0.47], [kx - 3, h * 0.5], [kx - 8, h * 0.54]], { w: 1.2, color: '#6a5238', bleed: false });
    c.fillStyle = brassFill(c, kx - 4, h * 0.5, 8, h * 0.5, true);
    c.fillRect(kx - 3, h * 0.5 + 6, 6, h * 0.5);
    ink(c, [[kx - 3, -30], [kx - 3, h * 0.49]], { w: 1.2, alpha: 0.7 });
    // the conductor's punch hole: through it, the night outside
    const hole = c.createRadialGradient(hx - 4, hy - 4, 1, hx, hy, HOLE.r);
    hole.addColorStop(0, '#2b3c5c');
    hole.addColorStop(1, '#0a1020');
    c.fillStyle = hole;
    c.beginPath(); c.arc(hx, hy, HOLE.r, 0, Math.PI * 2); c.fill();
    glow(c, hx + 5, hy + 3, 7, 'rgba(255, 210, 140, 0.95)', 0.9);
    inkLine(c, hx - 8, hy - 10, hx - 11, hy + 2, { w: 1, color: 'rgba(200, 220, 255, 0.6)', bleed: false });
    // the torn paper rim
    const random = rng(4205);
    for (let i = 0; i < 28; i += 1) {
      const a = (i / 28) * Math.PI * 2;
      c.strokeStyle = 'rgba(210, 195, 160, 0.9)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(hx + Math.cos(a) * HOLE.r, hy + Math.sin(a) * HOLE.r);
      c.lineTo(hx + Math.cos(a) * (HOLE.r - 2 - random() * 3), hy + Math.sin(a) * (HOLE.r - 2 - random() * 3));
      c.stroke();
    }
    inkEllipse(c, hx, hy, HOLE.r + 1, HOLE.r + 1, { w: 1.8, color: '#5a4430' });
    finish(c, env, { vig: 0.5, grain: 0.16 });
  });
  ctx.glow(w * 0.12, h * 0.05, 300, { color: 0xffc070, alpha: 0.12, flicker: 0.05 });
  ctx.glow(hx, hy, 60, { color: 0x88a8ff, alpha: 0.18, flicker: 0.2 });
}

// ---------------------------------------------------------------------------
// the punch hole as a porthole: paper fibre becomes a brass rim; rain; night

export function drawPorthole(ctx) {
  const { w, h } = ctx;
  const cx = GLASS.x * w;
  const cy = GLASS.y * h;
  const r = GLASS.r;
  ctx.fields(cx - r, cy - r, r * 2, r * 2, { speed: 22, crop: 0.58, zoom: 1.2, offset: 400 });
  ctx.rain(cx - r, cy - r, r * 2, r * 2, { count: 26 });
  ctx.paint('act0-porthole', (c, env) => {
    // the card, magnified: long paper fibres
    c.fillStyle = '#e4d7b8';
    c.fillRect(-30, -30, w + 60, h + 60);
    brushTexture(c, -30, -30, w + 60, h + 60, { seed: 4301, color: 'rgba(120, 90, 50, 0.06)', count: 220, len: 140 });
    brushTexture(c, -30, -30, w + 60, h + 60, { seed: 4302, color: 'rgba(255, 250, 235, 0.08)', count: 120, len: 90 });
    speckle(c, 0, 0, w, h, { count: 900, color: 'rgba(90, 60, 30, 0.12)', size: 2.4, seed: 4303 });
    // the printed number, huge and out of focus at the card's edge
    c.save();
    c.globalAlpha = 0.18;
    c.fillStyle = '#2a1d14';
    c.font = '700 150px "Space Mono", monospace';
    c.fillText('04', -40, h * 0.98);
    c.fillStyle = 'rgba(107, 42, 34, 1)';
    c.fillRect(-30, -30, w + 60, 46);
    c.restore();
    // torn fibres curl into the rim
    const random = rng(4304);
    for (let i = 0; i < 70; i += 1) {
      const a = random() * Math.PI * 2;
      const r0 = r + 30 + random() * 26;
      ink(c, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a + 0.08) * (r + 22), cy + Math.sin(a + 0.08) * (r + 22)]], { w: 1.2, color: 'rgba(150, 120, 80, 0.5)', jitter: 1, bleed: false });
    }
    // brass rim, rivets, dark lip
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 26; c.shadowOffsetY = 10;
    c.fillStyle = brassFill(c, cx - r - 30, cy - r - 30, (r + 30) * 2, (r + 30) * 2);
    c.beginPath(); c.arc(cx, cy, r + 30, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = '#3d2c15';
    c.beginPath(); c.arc(cx, cy, r + 6, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 + 0.13;
      rivet(c, cx + Math.cos(a) * (r + 18), cy + Math.sin(a) * (r + 18), 5);
    }
    inkEllipse(c, cx, cy, r + 30, r + 30, { w: 2.6 });
    inkEllipse(c, cx, cy, r + 6, r + 6, { w: 1.6, alpha: 0.8 });
    // the glass itself is a hole in this painting
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
    finish(c, env, { vig: 0.5, grain: 0.14 });
  });
  ctx.paint('act0-porthole-glass', (c) => {
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
    c.fillStyle = 'rgba(20, 35, 60, 0.28)';
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(200, 220, 255, 0.08)';
    c.beginPath(); c.moveTo(cx - r * 0.7, cy - r); c.lineTo(cx - r * 0.3, cy - r); c.lineTo(cx - r * 0.9, cy + r); c.lineTo(cx - r * 1.3, cy + r); c.closePath(); c.fill();
    const random = rng(4305);
    for (let i = 0; i < 40; i += 1) {
      const x = cx + (random() - 0.5) * r * 1.9;
      const y = cy + (random() - 0.5) * r * 1.9;
      c.fillStyle = 'rgba(230, 240, 255, 0.35)';
      c.beginPath(); c.arc(x, y, 0.8 + random() * 2.2, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  });
}

// ---------------------------------------------------------------------------
// the whole carriage, from outside in the rain: the office is one lit window

function miniOffice(c, x, y, w, h) {
  c.save();
  roundRectPath(c, x, y, w, h, 6);
  c.clip();
  c.fillStyle = vgrad(c, y, y + h, [[0, '#1d3a3e'], [1, '#2c4f52']]);
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, y + h * 0.78, w, h * 0.22);
  // desk, lamps, the shelf and a small seated figure
  c.fillStyle = '#3f2819'; c.fillRect(x + w * 0.07, y + h * 0.55, w * 0.4, h * 0.23);
  c.fillStyle = '#5a3a22'; c.fillRect(x + w * 0.05, y + h * 0.53, w * 0.44, 3);
  c.fillStyle = '#4a3121'; c.fillRect(x + w * 0.03, y + h * 0.3, w * 0.42, 2);
  glow(c, x + w * 0.13, y + h * 0.48, 18, 'rgba(255, 210, 130, 0.95)', 0.9);
  glow(c, x + w * 0.5, y + h * 0.38, 26, 'rgba(255, 200, 120, 0.9)', 0.6);
  c.fillStyle = '#18282e';
  c.beginPath(); c.ellipse(x + w * 0.53, y + h * 0.6, 3, 3.4, 0, 0, Math.PI * 2); c.fill();
  c.fillRect(x + w * 0.515, y + h * 0.63, 7, 11);
  c.restore();
}

export function drawCarriageOutside(ctx) {
  const { w, h } = ctx;
  ctx.fields(0, 0, w, h, { speed: 10, crop: 0.5, zoom: 1.05, offset: 1200 });
  ctx.paint('act0-carriage', (c, env) => {
    // wet night air over the far fields
    c.fillStyle = 'rgba(10, 16, 30, 0.35)';
    c.fillRect(-30, -30, w + 60, h + 60);
    const bodyTop = h * 0.27;
    const bodyBottom = h * 0.8;
    // roof: a dark curved band with ventilators
    c.fillStyle = vgrad(c, h * 0.17, bodyTop, [[0, '#0d1417'], [1, '#1a2629']]);
    c.beginPath(); c.moveTo(-30, bodyTop); c.quadraticCurveTo(w * 0.5, h * 0.13, w + 30, bodyTop); c.closePath(); c.fill();
    [0.14, 0.38, 0.62, 0.86].forEach((u) => {
      c.fillStyle = '#121b1e';
      roundRectPath(c, w * u - 16, h * 0.17, 32, 12, 4); c.fill();
      ink(c, [[w * u - 16, h * 0.17 + 12], [w * u - 16, h * 0.17], [w * u + 16, h * 0.17], [w * u + 16, h * 0.17 + 12]], { w: 1.2, alpha: 0.6 });
    });
    ink(c, [[-30, bodyTop], [w * 0.25, h * 0.19], [w * 0.5, h * 0.17], [w * 0.75, h * 0.19], [w + 30, bodyTop]], { w: 2, alpha: 0.8 });
    // body: lacquered teal-black with brass lining
    c.fillStyle = vgrad(c, bodyTop, bodyBottom, [[0, '#20393e'], [0.5, '#172b2e'], [1, '#0d1a1c']]);
    c.fillRect(-30, bodyTop, w + 60, bodyBottom - bodyTop);
    brushTexture(c, 0, bodyTop, w, bodyBottom - bodyTop, { seed: 4401, color: 'rgba(160, 210, 210, 0.03)', count: 80, len: 160 });
    const lineY = [bodyTop + 10, h * 0.62, bodyBottom - 10];
    lineY.forEach((y, i) => {
      c.fillStyle = brassFill(c, -30, y - 2, w + 60, i === 1 ? 6 : 4);
      c.fillRect(-30, y - 2, w + 60, i === 1 ? 6 : 4);
    });
    for (let x = 0; x < w + 30; x += 96) {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x, bodyTop + 12, 2, bodyBottom - bodyTop - 22);
      for (let y = bodyTop + 22; y < bodyBottom - 14; y += 26) rivet(c, x + 6, y, 1.8);
    }
    // the windows; the office is the lit one
    CAR_WINDOWS.forEach((u, i) => {
      const x = w * u;
      const y = h * CAR_WINDOW_Y;
      const ww = w * CAR_WINDOW_SIZE;
      const wh = h * CAR_WINDOW_SIZE;
      c.save();
      c.lineWidth = 7;
      c.strokeStyle = brassFill(c, x, y, ww, wh);
      roundRectPath(c, x - 3, y - 3, ww + 6, wh + 6, 8);
      c.stroke();
      c.restore();
      if (i === 2) {
        miniOffice(c, x, y, ww, wh);
      } else if (i === 4) {
        // drawn curtains, a low lamp behind
        c.fillStyle = vgrad(c, y, y + wh, [[0, '#5a2a20'], [1, '#2e140f']]);
        roundRectPath(c, x, y, ww, wh, 6); c.fill();
        glow(c, x + ww * 0.5, y + wh * 0.5, 30, 'rgba(255, 160, 90, 0.8)', 0.3);
        for (let k = 1; k < 6; k += 1) inkLine(c, x + (ww * k) / 6, y + 2, x + (ww * k) / 6 + 2, y + wh - 2, { w: 1, alpha: 0.35, bleed: false });
      } else {
        c.fillStyle = vgrad(c, y, y + wh, [[0, '#0b1422'], [1, '#162336']]);
        roundRectPath(c, x, y, ww, wh, 6); c.fill();
        c.fillStyle = 'rgba(160, 190, 230, 0.12)';
        c.beginPath(); c.moveTo(x + ww * 0.2, y); c.lineTo(x + ww * 0.4, y); c.lineTo(x + ww * 0.15, y + wh); c.lineTo(x - ww * 0.05, y + wh); c.closePath(); c.fill();
      }
      c.save();
      roundRectPath(c, x - 7, y - 7, ww + 14, wh + 14, 11);
      c.lineWidth = 1.6; c.strokeStyle = PAL.ink; c.globalAlpha = 0.75; c.stroke();
      c.restore();
    });
    // the end door with its small window, and a lantern on the step
    const dx = w * 0.965;
    c.fillStyle = '#0f1c1e'; c.fillRect(dx, bodyTop + 16, w * 0.05, bodyBottom - bodyTop - 20);
    ink(c, [[dx, bodyTop + 16], [dx, bodyBottom - 4]], { w: 2 });
    // underframe, bogies and wheels on the rail
    c.fillStyle = '#0a0f10';
    c.fillRect(-30, bodyBottom, w + 60, h * 0.06);
    [0.2, 0.78].forEach((u) => {
      const bx = w * u;
      c.fillStyle = '#121416';
      c.fillRect(bx - 70, bodyBottom + 6, 140, 18);
      [-40, 40].forEach((dx2) => {
        c.fillStyle = '#16191b';
        c.beginPath(); c.arc(bx + dx2, h * 0.9, 24, 0, Math.PI * 2); c.fill();
        inkEllipse(c, bx + dx2, h * 0.9, 24, 24, { w: 1.8, alpha: 0.8 });
        inkEllipse(c, bx + dx2, h * 0.9, 6, 6, { w: 1.4, alpha: 0.7 });
      });
      ink(c, [[bx - 70, bodyBottom + 6], [bx + 70, bodyBottom + 6]], { w: 1.4, alpha: 0.6 });
    });
    c.fillStyle = '#0c0d0e'; c.fillRect(-30, h * 0.955, w + 60, h * 0.1);
    ink(c, [[-10, h * 0.955], [w + 10, h * 0.955]], { w: 2.4, color: PAL.brassLight, alpha: 0.85, bleed: false });
    speckle(c, 0, h * 0.96, w, h * 0.06, { count: 200, color: 'rgba(200, 200, 200, 0.12)', size: 2, seed: 4402 });
    // wet shine: lamp light on the lacquer under each window
    CAR_WINDOWS.forEach((u, i) => {
      if (i !== 2) return;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, h * 0.52, 0, bodyBottom);
      g.addColorStop(0, 'rgba(255, 190, 110, 0.22)');
      g.addColorStop(1, 'rgba(255, 190, 110, 0)');
      c.fillStyle = g;
      c.fillRect(w * u - 10, h * 0.52, w * CAR_WINDOW_SIZE + 20, bodyBottom - h * 0.52);
      c.restore();
    });
    speckle(c, 0, bodyTop, w, bodyBottom - bodyTop, { count: 260, color: 'rgba(220, 235, 255, 0.12)', size: 1.8, seed: 4403 });
    finish(c, env, { vig: 0.55, grain: 0.14 });
  });
  const lit = LIT_WINDOW;
  ctx.glow(w * (lit[0] + lit[2] / 2), h * (lit[1] + lit[3] / 2), 170, { color: 0xffc070, alpha: 0.35, flicker: 0.08 });
  ctx.glow(w * 0.985, h * 0.62, 90, { color: 0xffb860, alpha: 0.5, flicker: 0.12 });
  ctx.rain(0, 0, w, h, { count: 70 });
}

export { hgrad, inkRect };
