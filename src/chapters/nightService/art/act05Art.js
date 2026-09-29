// Act 0.5 · TWO WINDOWS — the office's stores door, its lock up close, and
// the key line under the shelf up close. The office itself is Act 1's desk
// painting (act1Art drawDesk), so the growing wall never repaints it.
//
// The key line is a brass cash-carrier wire. Zoomed out, the office's wire
// leaves the LEFT edge at WIRE_OUT and the door's arrives at the RIGHT edge
// much higher (DOOR_WIRE_OUT): they never meet. Zoomed in on both, each
// close-up carries the wire at WIRE_CLOSE — so the door must stand LEFT of
// the office, both zoomed in, for the carrier to run.

import {
  PAL, brassFill, glow, ink, inkEllipse, inkRect, rivet, roundRectPath, speckle, vgrad, wood,
} from './ink.js';
import {
  FLOOR, KEY_HOOK, WIRE_OUT, backWall, ceiling, cubbyRect, drawLockers, finish, floorboards, hangingLamp, paintTrolley, wainscot,
} from './act1Art.js';

export const WIRE_CLOSE = 0.44;
export const DOOR_WIRE_OUT = 0.24;
/** The stores door leaf, the lock on it and the carrier catch beside it. */
export const STORES = Object.freeze({ x: 0.3, w: 0.24, top: 0.12 });
export const LOCK = Object.freeze({ x: 0.515, y: 0.5 });
export const LOCK_ZOOM = Object.freeze([0.44, 0.37, 0.18, 0.18]);
export const CATCH = Object.freeze({ x: 0.56, y: LOCK_ZOOM[1] + WIRE_CLOSE * LOCK_ZOOM[3] });
/** Where Butch waits at the locked door, and where he stands once it opens. */
export const STORES_WAIT_X = 0.44;
export const STORES_ASIDE_X = 0.2;
/** The key line close-up (zoom from the office). */
export const KEY_ZOOM = Object.freeze([KEY_HOOK.x - 0.08, WIRE_OUT - WIRE_CLOSE * 0.16, 0.16, 0.16]);
/** Through the open door: the pigeonhole wall of the stores (Act 1's lockers). */
export const DOORWAY_ZOOM = Object.freeze([STORES.x, 0.33, STORES.w, STORES.w]);

const toClose = (rect, x, y) => ({ u: (x - rect[0]) / rect[2], v: (y - rect[1]) / rect[3] });

// ---------------------------------------------------------------------------
// the stores door (zoomed out)

function storesRoom(c, x, y, w, h) {
  // the stores beyond the open door: lamplit pigeonholes in a warm room,
  // framed exactly where the zoom through the doorway will land
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = vgrad(c, y, y + h, [[0, '#3a2414'], [1, '#6a4020']]);
  c.fillRect(x, y, w, h);
  const wy = ((DOORWAY_ZOOM[1] - STORES.top) / (FLOOR - STORES.top)) * h + y;
  const wh = w / 1.8;
  c.fillStyle = '#2d1d12';
  c.fillRect(x, wy, w, wh);
  const cols = 6;
  const rows = 5;
  const lw = w * 0.86;
  const lh = wh * 0.8;
  const lx = x + w * 0.07;
  const ly = wy + wh * 0.06;
  for (let r = 0; r < rows; r += 1) {
    for (let k = 0; k < cols; k += 1) {
      const cw = lw / cols;
      const ch = lh / rows;
      c.fillStyle = (r * cols + k) % 5 === 1 ? '#1c120c' : '#120b07';
      c.fillRect(lx + k * cw + 1.5, ly + r * ch + 1.5, cw - 3, ch - 3);
    }
  }
  inkRect(c, lx, ly, lw, lh, { w: 1.2, alpha: 0.7 });
  glow(c, x + w * 0.5, y + h * 0.15, w * 0.9, 'rgba(255, 200, 120, 0.9)', 0.3);
  c.fillStyle = 'rgba(40, 24, 14, 0.7)';
  c.fillRect(x, y + h * 0.84, w, h * 0.16);
  c.restore();
}

export function drawStoresDoor(ctx, variant = 'locked') {
  const { w, h } = ctx;
  const floorY = FLOOR * h;
  const dx = STORES.x * w;
  const dw = STORES.w * w;
  const dTop = STORES.top * h;
  const open = variant === 'open';
  ctx.paint(`act05-door-${variant}`, (c, env) => {
    backWall(c, w, h, floorY, { seed: 501 });
    ceiling(c, w);
    wainscot(c, w, h, h * 0.54, floorY, { seed: 502 });
    hangingLamp(c, w * 0.14, 20, h * 0.3, { r: 16 });
    // a coat rack by the door: Butch's scarf and a spare lamp
    const rx = w * 0.72;
    ink(c, [[rx, h * 0.2], [rx, floorY]], { w: 3, color: '#2a1a10', bleed: false });
    ink(c, [[rx - 16, floorY], [rx, floorY - 12], [rx + 16, floorY]], { w: 2.4, color: '#2a1a10', bleed: false });
    [[-1, 0.24], [1, 0.26]].forEach(([s, v]) => ink(c, [[rx, h * v], [rx + s * 14, h * v - 8], [rx + s * 16, h * v - 2]], { w: 2, color: PAL.brassLight, bleed: false }));
    c.fillStyle = PAL.oxblood;
    c.beginPath(); c.moveTo(rx + 12, h * 0.25); c.lineTo(rx + 20, h * 0.25); c.lineTo(rx + 24, h * 0.44); c.lineTo(rx + 14, h * 0.42); c.closePath(); c.fill();
    ink(c, [[rx + 12, h * 0.25], [rx + 14, h * 0.42], [rx + 24, h * 0.44], [rx + 20, h * 0.25]], { w: 1.2, alpha: 0.8 });
    c.fillStyle = PAL.brassDark; c.fillRect(rx - 22, h * 0.26, 12, 18);
    c.fillStyle = 'rgba(255, 215, 140, 0.3)'; c.fillRect(rx - 20, h * 0.27, 8, 12);
    // a framed notice (no words) and the brass fire bucket
    c.fillStyle = '#cdbf9e'; c.fillRect(w * 0.83, h * 0.2, 60, 76);
    c.fillStyle = 'rgba(60,40,25,0.5)';
    for (let i = 0; i < 6; i += 1) c.fillRect(w * 0.83 + 8, h * 0.2 + 12 + i * 10, i % 3 === 2 ? 26 : 44, 2);
    c.strokeStyle = PAL.walnutMid; c.lineWidth = 5; c.strokeRect(w * 0.83 - 2, h * 0.2 - 2, 64, 80);
    inkRect(c, w * 0.83 - 5, h * 0.2 - 5, 70, 86, { w: 1.4 });
    // the frame around the stores door
    wood(c, dx - 22, dTop - 24, dw + 44, floorY - dTop + 24, { base: '#2a1a10', seed: 503, vertical: true });
    inkRect(c, dx - 22, dTop - 24, dw + 44, floorY - dTop + 24, { w: 2.2 });
    for (let i = 0; i < 6; i += 1) {
      rivet(c, dx - 11, dTop - 10 + i * ((floorY - dTop) / 5.3), 2.4);
      rivet(c, dx + dw + 11, dTop - 10 + i * ((floorY - dTop) / 5.3), 2.4);
    }
    if (open) {
      storesRoom(c, dx, dTop, dw, floorY - dTop);
      // the leaf swung in, seen edge-on at the hinge (left)
      c.fillStyle = '#3e2718';
      c.beginPath(); c.moveTo(dx, dTop); c.lineTo(dx + 22, dTop + 12); c.lineTo(dx + 22, floorY - 8); c.lineTo(dx, floorY); c.closePath(); c.fill();
      ink(c, [[dx, dTop], [dx + 22, dTop + 12], [dx + 22, floorY - 8], [dx, floorY]], { w: 2, closed: true });
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = 'rgba(255, 180, 90, 0.16)';
      c.beginPath(); c.moveTo(dx, floorY); c.lineTo(dx + dw, floorY); c.lineTo(dx + dw + 90, h + 10); c.lineTo(dx - 60, h + 10); c.closePath(); c.fill();
      c.restore();
    } else {
      wood(c, dx, dTop, dw, floorY - dTop, { base: '#4a2f1c', seed: 504, vertical: true });
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(dx, dTop, dw, floorY - dTop);
      // frosted upper pane: the stores' lamp glows behind it
      const px = dx + dw * 0.16;
      const py = dTop + 18;
      const pw = dw * 0.68;
      const ph = (floorY - dTop) * 0.34;
      c.fillStyle = vgrad(c, py, py + ph, [[0, '#8a7a5a'], [1, '#5a4a36']]);
      roundRectPath(c, px, py, pw, ph, 8); c.fill();
      glow(c, px + pw * 0.5, py + ph * 0.4, pw * 0.8, 'rgba(255, 210, 140, 0.9)', 0.35);
      speckle(c, px, py, pw, ph, { count: 220, color: 'rgba(255, 245, 225, 0.12)', size: 2, seed: 505 });
      // the pigeonholes' grid, a blur through the frosted glass
      c.strokeStyle = 'rgba(40, 25, 15, 0.25)'; c.lineWidth = 2;
      for (let k = 1; k < 5; k += 1) { c.beginPath(); c.moveTo(px + (pw * k) / 5, py + 8); c.lineTo(px + (pw * k) / 5, py + ph - 8); c.stroke(); }
      for (let k = 1; k < 3; k += 1) { c.beginPath(); c.moveTo(px + 8, py + (ph * k) / 3); c.lineTo(px + pw - 8, py + (ph * k) / 3); c.stroke(); }
      c.save(); roundRectPath(c, px, py, pw, ph, 8); c.lineWidth = 2; c.strokeStyle = PAL.ink; c.globalAlpha = 0.8; c.stroke(); c.restore();
      inkRect(c, dx + 12, dTop + (floorY - dTop) * 0.56, dw - 24, (floorY - dTop) * 0.36, { w: 1.4, alpha: 0.6 });
      // the lock plate and handle, right side of the leaf
      const lx = LOCK.x * w;
      const ly = LOCK.y * h;
      c.fillStyle = brassFill(c, lx - 8, ly - 16, 16, 32, true);
      roundRectPath(c, lx - 8, ly - 16, 16, 32, 4); c.fill();
      c.fillStyle = '#0d0907';
      c.beginPath(); c.arc(lx, ly + 4, 2.4, 0, Math.PI * 2); c.fill();
      c.fillRect(lx - 1, ly + 4, 2, 6);
      ink(c, [[lx - 8, ly - 16], [lx + 8, ly - 16], [lx + 8, ly + 16], [lx - 8, ly + 16]], { w: 1.3, closed: true });
      c.fillStyle = brassFill(c, lx - 22, ly - 12, 16, 7);
      roundRectPath(c, lx - 24, ly - 12, 18, 6, 3); c.fill();
      ink(c, [[lx - 24, ly - 12], [lx - 6, ly - 12], [lx - 6, ly - 6], [lx - 24, ly - 6]], { w: 1.1, closed: true });
      ink(c, [[dx, dTop], [dx + dw, dTop], [dx + dw, floorY], [dx, floorY]], { w: 2.4, closed: true });
    }
    // the key line: down from the corridor wall (right edge, high), over a
    // pulley, to the brass catch beside the lock
    const cy = CATCH.y * h;
    const pulley = { x: w * 0.63, y: cy };
    ink(c, [[w + 6, DOOR_WIRE_OUT * h], [pulley.x + 4, pulley.y - 4]], { w: 1.3, color: '#cdb98a', alpha: 0.9, jitter: 0.25, bleed: false });
    ink(c, [[pulley.x, pulley.y - 4], [CATCH.x * w, cy]], { w: 1.3, color: '#cdb98a', alpha: 0.9, jitter: 0.2, bleed: false });
    c.fillStyle = brassFill(c, pulley.x - 6, pulley.y - 10, 12, 12);
    c.beginPath(); c.arc(pulley.x, pulley.y - 4, 5.5, 0, Math.PI * 2); c.fill();
    inkEllipse(c, pulley.x, pulley.y - 4, 5.5, 5.5, { w: 1.1, bleed: false });
    c.fillStyle = brassFill(c, CATCH.x * w - 4, cy - 6, 8, 12);
    c.fillRect(CATCH.x * w - 3, cy - 6, 6, 12);
    ink(c, [[CATCH.x * w - 3, cy + 6], [CATCH.x * w - 3, cy - 6], [CATCH.x * w + 3, cy - 6]], { w: 1.1, bleed: false });
    floorboards(c, w, h, floorY, { seed: 506, runner: [-40, dx - 10] });
    finish(c, env);
  });
  ctx.glow(w * 0.14, h * 0.34, 170, { color: 0xffc070, alpha: 0.22, flicker: 0.06 });
  if (open) ctx.glow(dx + dw * 0.5, h * 0.42, 220, { color: 0xffb060, alpha: 0.32, flicker: 0.06 });
  else ctx.glow(dx + dw * 0.5, dTop + (floorY - dTop) * 0.18, 120, { color: 0xffc98a, alpha: 0.18, flicker: 0.1 });
  ctx.dust(w * 0.05, h * 0.1, w * 0.6, h * 0.6, { count: 8 });
}

/** Zoom through the open door: the stores' pigeonhole wall (Act 1's lockers). */
export function drawStores(ctx) {
  drawLockers(ctx);
}

// ---------------------------------------------------------------------------
// the lock, up close: the carrier catch waits beside the keyhole

export function drawLockClose(ctx) {
  const { w, h } = ctx;
  const leafEdge = toClose(LOCK_ZOOM, STORES.x + STORES.w, 0).u * w;
  const lock = toClose(LOCK_ZOOM, LOCK.x, LOCK.y);
  const catchPt = toClose(LOCK_ZOOM, CATCH.x, CATCH.y);
  const lx = lock.u * w;
  const ly = lock.v * h;
  const kx = catchPt.u * w;
  const ky = WIRE_CLOSE * h;
  ctx.paint('act05-lock', (c, env) => {
    // the door leaf (left) and the walnut frame (right), grain up close
    wood(c, -30, -30, leafEdge + 30, h + 60, { base: '#4a2f1c', seed: 511, vertical: true, grain: 'rgba(0,0,0,0.2)' });
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-30, -30, leafEdge + 30, h + 60);
    wood(c, leafEdge, -30, w - leafEdge + 30, h + 60, { base: '#2a1a10', seed: 512, vertical: true });
    ink(c, [[leafEdge, -10], [leafEdge, h + 10]], { w: 2.6 });
    for (let i = 0; i < 4; i += 1) rivet(c, leafEdge + 40, h * (0.12 + i * 0.27), 5);
    // the lower edge of the frosted pane
    c.fillStyle = vgrad(c, -30, h * 0.08, [[0, '#8a7a5a'], [1, '#5a4a36']]);
    c.fillRect(-30, -30, leafEdge - 60, h * 0.08 + 30);
    ink(c, [[-10, h * 0.08], [leafEdge - 60, h * 0.08], [leafEdge - 60, -10]], { w: 2 });
    glow(c, w * 0.2, -20, w * 0.5, 'rgba(255, 200, 120, 0.9)', 0.2);
    // lock plate with the keyhole
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16; c.shadowOffsetX = 6; c.shadowOffsetY = 6;
    c.fillStyle = brassFill(c, lx - 44, ly - 86, 88, 172, true);
    roundRectPath(c, lx - 44, ly - 86, 88, 172, 18); c.fill();
    c.restore();
    c.fillStyle = 'rgba(255, 245, 210, 0.3)';
    roundRectPath(c, lx - 34, ly - 76, 18, 150, 8); c.fill();
    [[lx, ly - 66], [lx, ly + 70]].forEach(([x, y]) => rivet(c, x, y, 6));
    c.fillStyle = '#0d0907';
    c.beginPath(); c.arc(lx, ly + 2, 13, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(lx - 7, ly + 6); c.lineTo(lx + 7, ly + 6); c.lineTo(lx + 4, ly + 38); c.lineTo(lx - 4, ly + 38); c.closePath(); c.fill();
    ink(c, [[lx - 44, ly - 70], [lx - 44, ly + 70], [lx - 28, ly + 86], [lx + 28, ly + 86], [lx + 44, ly + 70], [lx + 44, ly - 70], [lx + 28, ly - 86], [lx - 28, ly - 86]], { w: 2.2, closed: true });
    // the handle lever
    c.fillStyle = brassFill(c, lx - 150, ly - 64, 110, 28);
    roundRectPath(c, lx - 150, ly - 62, 110, 24, 12); c.fill();
    ink(c, [[lx - 150, ly - 62], [lx - 40, ly - 62], [lx - 40, ly - 38], [lx - 150, ly - 38]], { w: 2, closed: true });
    // the wire from the right edge, and the catch that will hold the carrier
    ink(c, [[w + 8, ky], [kx + 6, ky]], { w: 2.6, color: '#cdb98a', alpha: 0.95, jitter: 0.3, bleed: false });
    ink(c, [[w + 8, ky + 1.5], [kx + 6, ky + 1.5]], { w: 1, color: 'rgba(40, 30, 20, 0.6)', jitter: 0.3, bleed: false });
    c.fillStyle = brassFill(c, kx - 14, ky - 34, 28, 68, true);
    roundRectPath(c, kx - 12, ky - 34, 24, 68, 6); c.fill();
    c.fillStyle = PAL.brassDark;
    c.beginPath(); c.moveTo(kx + 12, ky - 12); c.lineTo(kx + 30, ky - 4); c.lineTo(kx + 12, ky + 4); c.closePath(); c.fill();
    ink(c, [[kx - 12, ky - 34], [kx + 12, ky - 34], [kx + 12, ky + 34], [kx - 12, ky + 34]], { w: 1.8, closed: true });
    rivet(c, kx, ky - 24, 4); rivet(c, kx, ky + 24, 4);
    speckle(c, 0, 0, w, h, { count: 400, color: 'rgba(255, 220, 170, 0.035)', seed: 513 });
    finish(c, env, { vig: 0.5 });
  });
  // once the carrier has run: the trolley rests on the catch and the key is in the lock
  const trolley = ctx.sprite('act05-trolley', 30 * 2.4, 52 * 2.4, (c) => paintTrolley(c, 36, 12, 2.4), kx - 26, ky, { origin: [0.5, 0.1] });
  const key = ctx.sprite('act05-key', 90, 40, (c) => {
    c.fillStyle = brassFill(c, 0, 0, 90, 40);
    c.beginPath(); c.arc(20, 20, 16, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(20, 20, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = PAL.brass; c.fillRect(34, 16, 50, 8);
    inkEllipse(c, 20, 20, 16, 16, { w: 1.6, bleed: false });
    ink(c, [[34, 16], [84, 16], [84, 24], [34, 24]], { w: 1.4, closed: true, bleed: false });
  }, lx, ly + 2, { origin: [0.92, 0.5] });
  let turn = 0;
  ctx.animate((time, dt) => {
    const sent = ctx.flag('keySent');
    trolley.setVisible(sent);
    key.setVisible(sent);
    if (ctx.flag('unlocked')) turn = Math.min(1, turn + dt / 500);
    key.setRotation(-Math.PI / 2 + turn * (Math.PI / 2));
  });
  ctx.glow(w * 0.2, 0, 300, { color: 0xffc070, alpha: 0.14, flicker: 0.05 });
}

// ---------------------------------------------------------------------------
// the key line under the office shelf, up close

export function drawKeyLine(ctx) {
  const { w, h } = ctx;
  const ky = WIRE_CLOSE * h;
  const hook = toClose(KEY_ZOOM, KEY_HOOK.x, WIRE_OUT);
  const pulleyU = toClose(KEY_ZOOM, 0.348, 0).u;
  const rail = toClose(KEY_ZOOM, 0, 0.337).v;
  ctx.paint('act05-keyline', (c, env) => {
    backWall(c, w, h, h, { seed: 3, tone: ['#132328', '#1f383e'] });
    // the shelf's underside, a bracket, parcels' shadows
    wood(c, -30, -30, w + 60, rail * h + 30 - 8, { base: '#4a3121', seed: 521 });
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-30, rail * h - 18, w + 60, 12);
    ink(c, [[-10, rail * h - 8], [w + 10, rail * h - 8]], { w: 2.6 });
    const bx = toClose(KEY_ZOOM, 0.37, 0).u * w;
    ink(c, [[bx - 30, rail * h - 8], [bx, h * 0.3], [bx + 30, rail * h - 8]], { w: 3.2 });
    // the hook rail and two ordinary keys
    c.fillStyle = brassFill(c, toClose(KEY_ZOOM, 0.25, 0).u * w, rail * h, 0.075 / KEY_ZOOM[2] * w, 22);
    c.fillRect(toClose(KEY_ZOOM, 0.25, 0).u * w, rail * h, (0.075 / KEY_ZOOM[2]) * w, 22);
    ink(c, [[toClose(KEY_ZOOM, 0.25, 0).u * w, rail * h + 22], [toClose(KEY_ZOOM, 0.325, 0).u * w, rail * h + 22]], { w: 1.6 });
    [[0.262, '#8a6934'], [0.29, '#6b5530']].forEach(([u, tone]) => {
      const x = toClose(KEY_ZOOM, u, 0).u * w;
      ink(c, [[x, rail * h + 22], [x, rail * h + 48], [x + 14, rail * h + 60]], { w: 5, color: PAL.brassLight, bleed: false });
      c.fillStyle = tone;
      c.beginPath(); c.arc(x + 10, rail * h + 78, 13, 0, Math.PI * 2); c.fill();
      c.fillRect(x + 6, rail * h + 78, 8, 60);
      c.fillRect(x + 14, rail * h + 122, 12, 7);
      c.fillStyle = '#1c130d'; c.beginPath(); c.arc(x + 10, rail * h + 78, 5, 0, Math.PI * 2); c.fill();
      inkEllipse(c, x + 10, rail * h + 78, 13, 13, { w: 1.4, bleed: false });
    });
    // the wire: out through the left wall, to the pulley on the right
    const px = pulleyU * w;
    ink(c, [[-8, ky], [px, ky]], { w: 2.6, color: '#cdb98a', alpha: 0.95, jitter: 0.3, bleed: false });
    ink(c, [[-8, ky + 1.5], [px, ky + 1.5]], { w: 1, color: 'rgba(20, 20, 20, 0.5)', jitter: 0.3, bleed: false });
    c.fillStyle = brassFill(c, px - 24, ky - 24, 48, 48);
    c.beginPath(); c.arc(px, ky, 22, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3d2c15'; c.beginPath(); c.arc(px, ky, 7, 0, Math.PI * 2); c.fill();
    inkEllipse(c, px, ky, 22, 22, { w: 1.8 });
    ink(c, [[px, ky - 22], [px, rail * h - 8]], { w: 4, color: PAL.brassLight, bleed: false });
    // a hole in the wall where the line leaves
    c.fillStyle = '#060606';
    c.beginPath(); c.ellipse(4, ky, 7, 12, 0, 0, Math.PI * 2); c.fill();
    glow(c, w * 0.5, -40, w * 0.7, 'rgba(255, 196, 120, 0.9)', 0.16);
    finish(c, env, { vig: 0.5 });
  });
  const trolley = ctx.sprite('act05-trolley', 30 * 2.4, 52 * 2.4, (c) => paintTrolley(c, 36, 12, 2.4), hook.u * w, ky, { origin: [0.5, 0.1] });
  ctx.animate(() => trolley.setVisible(!ctx.flag('keyInFlight') && !ctx.flag('keySent')));
  ctx.glow(w * 0.5, 0, 320, { color: 0xffc070, alpha: 0.14, flicker: 0.05 });
  ctx.dust(0, h * 0.2, w, h * 0.6, { count: 10, size: 2.2 });
}

export { cubbyRect };
