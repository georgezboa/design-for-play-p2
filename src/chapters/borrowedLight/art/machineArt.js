// Chapter 2 · BORROWED LIGHT — machines, grid nodes (lamp boxes with paper
// tags) and the cables between them. Everything that can move or be powered
// is redrawn each frame from the timetable model, so what you see is always
// the model's state: dim cable = idle, pulsing = queued, steady glow =
// powered, blinking = about to switch off.

import Phaser from 'phaser';
import { DEPTH, INK_HEX, LINE_COLORS } from './palette.js';
import { makeCanvas, paintBillboard, paintSign } from './paint.js';
import { NODE_POLE, machineBounds, nodeHead } from '../level.js';

const TAU = Math.PI * 2;

function addCanvasTexture(scene, key, canvas) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  return key;
}

// Power "on" amount 0..1 with the pre-off flicker baked in.
export function powerLevel(status, t) {
  if (!status?.powered) return 0;
  if (!status.flicker) return 1;
  // 0.6 s flicker: a stuttering blink that gets faster.
  const k = Math.sin(t * 38) + Math.sin(t * 61);
  return k > 0.2 ? 1 : 0.18;
}

// ---------------------------------------------------------------------------
// Cables.
export function drawCable(g, points, line, { queued = false, powered = 0, pulse = null, t = 0, busyFlash = 0 } = {}) {
  const color = LINE_COLORS[line];
  g.clear();
  const path = () => {
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
  };
  g.lineStyle(5, 0x06080a, 0.95);
  path();
  g.lineStyle(2, color.dim, 0.9);
  path();
  const glow = Math.max(powered, queued ? 0.45 + 0.35 * Math.sin(t * 6) : 0, busyFlash);
  if (glow > 0.01) {
    g.lineStyle(9, color.hex, 0.12 * glow);
    path();
    g.lineStyle(2.4, color.glow, 0.85 * glow);
    path();
  }
  // Queued: bright beads crawl toward the machine.
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(d);
    total += d;
  }
  const at = (dist) => {
    let d = dist;
    for (let i = 0; i < lengths.length; i += 1) {
      if (d <= lengths[i]) {
        const k = lengths[i] ? d / lengths[i] : 0;
        return { x: points[i].x + (points[i + 1].x - points[i].x) * k, y: points[i].y + (points[i + 1].y - points[i].y) * k };
      }
      d -= lengths[i];
    }
    return points[points.length - 1];
  };
  if (queued) {
    const spacing = 70;
    const offset = (t * 160) % spacing;
    for (let d = offset; d < total; d += spacing) {
      const p = at(d);
      g.fillStyle(color.glow, 0.9).fillCircle(p.x, p.y, 2.6);
    }
  }
  if (pulse !== null && pulse >= 0 && pulse <= 1) {
    const p = at(total * pulse);
    g.fillStyle(0xffffff, 0.9).fillCircle(p.x, p.y, 5);
    g.fillStyle(color.glow, 0.35).fillCircle(p.x, p.y, 14);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Grid node: pole + lamp box + paper tag.
export function drawNodePole(g, node) {
  const head = nodeHead(node);
  g.fillStyle(0x0b0907, 1);
  g.fillRect(node.x - 3, head.y + 12, 6, NODE_POLE - 12);
  g.fillRect(node.x - 10, node.y - 5, 20, 5);
  g.lineStyle(1.3, INK_HEX, 0.35);
  g.lineBetween(node.x - 3, head.y + 16, node.x - 3, node.y - 10);
}

export function drawNode(g, node, view, t) {
  const color = LINE_COLORS[node.line];
  const head = nodeHead(node);
  const { status, target, hole, sealing, busyShake, cutMark, glint } = view;
  g.clear();
  const shake = busyShake > 0 ? Math.sin(t * 70) * 4 * busyShake : 0;
  const bx = head.x + shake;
  const by = head.y;
  // Box.
  g.fillStyle(0x1c130d, 1).fillRect(bx - 17, by - 20, 34, 40);
  g.fillStyle(0x0b0806, 1).fillRect(bx - 17, by + 14, 34, 6);
  g.lineStyle(2, 0xb08a4a, 0.85).strokeRect(bx - 17, by - 20, 34, 40);
  g.fillStyle(0x0b0806, 1).fillRect(bx - 20, by - 24, 40, 6);
  g.lineStyle(1.4, INK_HEX, 0.55).lineBetween(bx - 20, by - 24, bx + 20, by - 24);
  // Lens: dim idle, pulsing queued, steady powering, blinking when flickering.
  const powered = status.powering ? powerLevel({ powered: true, flicker: view.flicker }, t) : 0;
  const lens = Math.max(powered, status.queued ? 0.55 + 0.4 * Math.sin(t * 6) : 0, status.afterglow * 0.8);
  g.fillStyle(0x07090a, 1).fillCircle(bx, by - 4, 9);
  g.fillStyle(color.dim, 1).fillCircle(bx, by - 4, 7);
  if (lens > 0.02) {
    g.fillStyle(color.glow, 0.25 * lens).fillCircle(bx, by - 4, 20);
    g.fillStyle(color.hex, lens).fillCircle(bx, by - 4, 7);
    g.fillStyle(0xffffff, 0.7 * lens).fillCircle(bx - 2, by - 6, 2.2);
  }
  // Tag on a string, swinging a little in the wind.
  const swing = Math.sin(t * 1.7 + node.x * 0.01) * 0.12 + shake * 0.02;
  const px = bx;
  const py = by + 20;
  const rot = (lx, ly) => ({ x: px + lx * Math.cos(swing) - ly * Math.sin(swing), y: py + lx * Math.sin(swing) + ly * Math.cos(swing) });
  const string = rot(0, 12);
  g.lineStyle(1.2, 0x0b0907, 1).lineBetween(px, py, string.x, string.y);
  const corners = [rot(-12, 12), rot(12, 12), rot(12, 46), rot(-12, 46)];
  g.fillStyle(0xe6dcc2, 1).fillPoints(corners, true);
  g.fillStyle(0xbfae8a, 0.6).fillPoints([rot(-12, 40), rot(12, 40), rot(12, 46), rot(-12, 46)], true);
  g.fillStyle(color.hex, 0.95).fillPoints([rot(-12, 12), rot(12, 12), rot(12, 18), rot(-12, 18)], true);
  // Tiny ruled lines like a printed ticket.
  g.lineStyle(1, 0x7a6a50, 0.6);
  for (const ly of [24, 29, 34]) { const a = rot(-8, ly); const b = rot(8, ly); g.lineBetween(a.x, a.y, b.x, b.y); }
  g.lineStyle(1.3, INK_HEX, 0.7).strokePoints(corners, true);
  // The punched hole (queued / powering), sealing when cancelled.
  const holeR = hole * 5;
  if (holeR > 0.3) {
    const hc = rot(0, 31);
    g.fillStyle(0x05070a, 1).fillCircle(hc.x, hc.y, holeR);
    if (status.powering || status.queued) g.fillStyle(color.glow, 0.5 * lens).fillCircle(hc.x, hc.y, holeR * 0.6);
  }
  if (sealing > 0) {
    const hc = rot(0, 31);
    for (let i = 0; i < 6; i += 1) {
      const a = i * (TAU / 6) + t * 9;
      const d = 6 + (1 - sealing) * 18;
      g.fillStyle(color.glow, sealing).fillCircle(hc.x + Math.cos(a) * d, hc.y + Math.sin(a) * d, 1.8);
    }
  }
  if (cutMark > 0) {
    const a = rot(-11, 16);
    const b = rot(11, 44);
    g.lineStyle(2.4, 0x3a1410, 0.9 * cutMark).lineBetween(a.x, a.y, b.x, b.y);
  }
  // Amber glint: the game's one visual word for "you can act on this".
  const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + node.x);
  const gp = rot(9, 15);
  const s = (3 + tw * 3) * glint;
  g.fillStyle(0xffd08a, 0.9 * glint).fillTriangle(gp.x - s, gp.y, gp.x + s, gp.y, gp.x, gp.y - 0.4);
  g.fillStyle(0xffd08a, 0.9 * glint).fillTriangle(gp.x, gp.y - s, gp.x, gp.y + s, gp.x + 0.4, gp.y);
  g.fillStyle(0xffffff, 0.9 * glint).fillCircle(gp.x, gp.y, 1.4);
  // Targeted: ink brackets.
  if (target > 0) {
    const k = target;
    const x0 = bx - 30;
    const x1 = bx + 30;
    const y0 = by - 32;
    const y1 = by + 72;
    g.lineStyle(2.4, INK_HEX, 0.9 * k);
    const c = 12;
    g.beginPath();
    g.moveTo(x0, y0 + c); g.lineTo(x0, y0); g.lineTo(x0 + c, y0);
    g.moveTo(x1 - c, y0); g.lineTo(x1, y0); g.lineTo(x1, y0 + c);
    g.moveTo(x1, y1 - c); g.lineTo(x1, y1); g.lineTo(x1 - c, y1);
    g.moveTo(x0 + c, y1); g.lineTo(x0, y1); g.lineTo(x0, y1 - c);
    g.strokePath();
  }
}

// ---------------------------------------------------------------------------
// Machines.
export function createMachineView(scene, machine) {
  const view = { machine, g: scene.add.graphics().setDepth(DEPTH.machine), images: {}, x0: 0, x1: 0 };
  const b = machineBounds(machine, 1);
  view.x0 = Math.min(b.x, machine.x) - 200;
  view.x1 = Math.max(b.x + b.w, machine.x + (machine.w ?? 0)) + 200;
  if (machine.kind === 'billboard') {
    const on = addCanvasTexture(scene, `bl-bb-on-${machine.id}`, paintBillboard(machine.w, machine.h, machine.text ?? 'NIGHT SERVICE', true));
    const off = addCanvasTexture(scene, `bl-bb-off-${machine.id}`, paintBillboard(machine.w, machine.h, machine.text ?? 'NIGHT SERVICE', false));
    view.images.off = scene.add.image(machine.x, machine.y, off).setOrigin(0).setDepth(DEPTH.machine - 0.2);
    view.images.on = scene.add.image(machine.x, machine.y, on).setOrigin(0).setDepth(DEPTH.machine - 0.1).setAlpha(0);
    view.images.glow = scene.add.image(machine.x + machine.w / 2, machine.y + machine.h / 2, 'bl-glow').setDisplaySize(machine.w * 1.5, machine.h * 4).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.fx);
  }
  if (machine.kind === 'sign') {
    const color = LINE_COLORS.rose.css;
    const on = addCanvasTexture(scene, `bl-msign-on-${machine.id}`, paintSign(machine.text, color, { w: machine.w, h: machine.h, lit: true }));
    const off = addCanvasTexture(scene, `bl-msign-off-${machine.id}`, paintSign(machine.text, color, { w: machine.w, h: machine.h, lit: false }));
    view.images.off = scene.add.image(machine.x, machine.y, off).setOrigin(0.5, 0.2).setDepth(DEPTH.machine);
    view.images.on = scene.add.image(machine.x, machine.y, on).setOrigin(0.5, 0.2).setDepth(DEPTH.machine + 0.1).setAlpha(0);
    view.images.glow = scene.add.image(machine.x, machine.y + machine.h / 2, 'bl-glow').setDisplaySize(machine.glow * 1.6, machine.glow * 1.1).setTint(0xe6aab0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.fx);
  }
  if (machine.kind === 'lift' || machine.kind === 'bridge' || machine.kind === 'points' || machine.kind === 'drawbridge') {
    view.images.glow = scene.add.image(0, 0, 'bl-glow').setTint(LINE_COLORS.amber.hex).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.fx);
  }
  if (machine.kind === 'fan') {
    const streaks = makeCanvas(64, 256);
    const ctx = streaks.getContext('2d');
    for (let i = 0; i < 34; i += 1) {
      const x = Math.random() * 64;
      const y = Math.random() * 256;
      const l = 30 + Math.random() * 70;
      const a = 0.3 + Math.random() * 0.4;
      // Draw each streak twice, 256 px apart, so it wraps seamlessly.
      for (const oy of [0, -256]) {
        const gr = ctx.createLinearGradient(x, y + oy, x, y + oy + l);
        gr.addColorStop(0, 'rgba(220,230,232,0)');
        gr.addColorStop(0.5, `rgba(220,230,232,${a})`);
        gr.addColorStop(1, 'rgba(220,230,232,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(x, y + oy, 1.5, l);
      }
    }
    const key = addCanvasTexture(scene, `bl-updraft-${machine.id}`, streaks);
    view.images.draft = scene.add.tileSprite(machine.x, machine.yTop, machine.w, machine.yBottom - machine.yTop, key).setOrigin(0).setDepth(DEPTH.fx - 0.4).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
  }
  return view;
}

function hazard(g, x, y, w, h, alpha = 1) {
  g.fillStyle(0x16110c, alpha).fillRect(x, y, w, h);
  g.fillStyle(0xa8702c, 0.8 * alpha);
  for (let sx = x - h; sx < x + w; sx += 22) {
    const x0 = Math.max(x, sx);
    const x1 = Math.min(x + w, sx + 11);
    if (x1 > x0) g.fillTriangle(x0, y + h, Math.min(x + w, x0 + h * 0.6), y, x1, y + h);
  }
}

export function drawMachine(view, status, t, { lineColor, ghost = false } = {}) {
  const { machine, g, images } = view;
  const color = LINE_COLORS[lineColor ?? status.line ?? 'amber'];
  const on = powerLevel(status, t);
  const level = status.level;
  g.clear();
  switch (machine.kind) {
    case 'bridge': {
      const dir = machine.dir;
      const len = machine.length * level;
      const x = machine.x;
      const y = machine.y;
      // Housing (and optional mast down to the roof below).
      if (machine.mast) {
        g.fillStyle(0x0d1012, 1).fillRect(x - 16, y, 12, 320);
        g.lineStyle(2, 0x0d1012, 1);
        for (let my = y + 20; my < y + 300; my += 40) g.lineBetween(x - 16, my, x - 4, my + 40);
      }
      // Housing: a riveted brass-trimmed box with the line's lamp.
      const hx = Math.min(x, x - dir * 44);
      g.fillStyle(0x1b1612, 1).fillRect(hx, y - 4, 44, 34);
      g.fillStyle(0x0c0a08, 1).fillRect(hx, y + 26, 44, 6);
      g.lineStyle(1.6, 0xb08a4a, 0.75).strokeRect(hx, y - 4, 44, 34);
      g.fillStyle(0x6d5227, 1).fillCircle(hx + 5, y + 1, 1.6).fillCircle(hx + 39, y + 1, 1.6).fillCircle(hx + 5, y + 24, 1.6).fillCircle(hx + 39, y + 24, 1.6);
      g.fillStyle(0x07090a, 1).fillCircle(hx + 22, y + 12, 6);
      g.fillStyle(on > 0 ? color.hex : color.dim, 1).fillCircle(hx + 22, y + 12, 4.2);
      if (len > 2) {
        const x2 = x + dir * len;
        const xa = Math.min(x, x2);
        // Telescoping deck: three sections, thicker near the housing.
        const seg = machine.length / 3;
        for (let i = 2; i >= 0; i -= 1) {
          const s0 = Math.min(len, i * seg * 0.94);
          if (s0 >= len) continue;
          const sx0 = x + dir * s0;
          const sx1 = x2;
          const th = 18 - i * 3;
          g.fillStyle([0x2a241e, 0x231e19, 0x1d1915][i], 1).fillRect(Math.min(sx0, sx1), y, Math.abs(sx1 - sx0), th);
          g.fillStyle(0x0a0908, 0.9).fillRect(Math.min(sx0, sx1), y + th - 3, Math.abs(sx1 - sx0), 3);
        }
        // Truss underside.
        g.lineStyle(2, 0x0c0b0a, 1);
        for (let tx = 0; tx < len - 20; tx += 40) {
          const a = x + dir * tx;
          const b2 = x + dir * (tx + 20);
          const c = x + dir * (tx + 40);
          g.lineBetween(a, y + 18, b2, y + 34);
          g.lineBetween(b2, y + 34, Math.min(c, x2) === c || dir < 0 ? c : x2, y + 18);
        }
        // Rail posts and hand rail.
        g.lineStyle(2, 0x0e0c0a, 1);
        for (let tx = 10; tx < len; tx += 46) g.lineBetween(x + dir * tx, y, x + dir * tx, y - 26);
        g.lineBetween(x, y - 26, x2, y - 26);
        // Walkable ink rim, and the powered edge light.
        g.lineStyle(2.6, INK_HEX, 0.9).lineBetween(xa, y + 1, xa + len, y + 1);
        if (on > 0) {
          g.lineStyle(3, color.hex, 0.85 * on).lineBetween(xa, y + 5, xa + len, y + 5);
          g.fillStyle(color.glow, on).fillCircle(x2, y + 5, 4);
        }
        images.glow?.setPosition(xa + len / 2, y + 10).setDisplaySize(len + 120, 120).setTint(color.hex).setAlpha(0.28 * on);
      } else images.glow?.setAlpha(0);
      break;
    }
    case 'lift': {
      const { x, w, y0, y1 } = machine;
      const y = y0 + (y1 - y0) * level;
      // Guide rails and head frame.
      g.fillStyle(0x0d1012, 1);
      g.fillRect(x + 6, y1 - 90, 7, y0 - y1 + 90);
      g.fillRect(x + w - 13, y1 - 90, 7, y0 - y1 + 90);
      g.fillRect(x, y1 - 96, w, 10);
      g.lineStyle(1.3, INK_HEX, 0.3);
      g.lineBetween(x + 6, y1 - 86, x + 6, y0);
      g.lineBetween(x, y1 - 96, x + w, y1 - 96);
      // Pulley + hoist cable.
      g.fillStyle(0x1b1612, 1).fillCircle(x + w / 2, y1 - 91, 12);
      g.lineStyle(2, 0x0a0908, 1).lineBetween(x + w / 2, y1 - 80, x + w / 2, y - 40);
      // Counterweight rides the other way.
      const cw = y1 - 60 + (y0 - y1) * (1 - level) * 0.8;
      g.fillStyle(0x151412, 1).fillRect(x + w - 30, cw, 14, 44);
      // Car: deck, low cage and hazard front.
      g.lineStyle(2, 0x0c0b0a, 1);
      g.lineBetween(x + 10, y, x + 10, y - 40);
      g.lineBetween(x + w - 10, y, x + w - 10, y - 40);
      g.lineBetween(x + 10, y - 40, x + w - 10, y - 40);
      g.lineBetween(x + w / 2, y - 40, x + w / 2, y);
      hazard(g, x, y, w, 26);
      g.fillStyle(0x0a0908, 1).fillRect(x, y + 22, w, 6);
      g.lineStyle(2.6, INK_HEX, 0.9).lineBetween(x - 2, y + 1, x + w + 2, y + 1);
      // Lamp on the car.
      g.fillStyle(0x07090a, 1).fillCircle(x + w - 22, y - 46, 6);
      g.fillStyle(on > 0 ? color.hex : color.dim, 1).fillCircle(x + w - 22, y - 46, 4.5);
      images.glow?.setPosition(x + w / 2, y - 10).setDisplaySize(w * 1.8, 170).setTint(color.hex).setAlpha(0.25 * on);
      break;
    }
    case 'billboard': {
      const { x, y, w, h } = machine;
      // Lattice legs down to the roofs below.
      g.lineStyle(4, 0x0c0b0a, 1);
      for (const lx of [x + 40, x + w * 0.5, x + w - 40]) g.lineBetween(lx, y + h, lx, y + h + 220);
      g.lineStyle(2, 0x0c0b0a, 1);
      for (let ly = y + h; ly < y + h + 220; ly += 40) {
        g.lineBetween(x + 40, ly, x + w * 0.5, ly + 40);
        g.lineBetween(x + w - 40, ly, x + w * 0.5, ly + 40);
      }
      // Frame.
      g.lineStyle(5, 0x14100c, 1).strokeRect(x - 3, y - 3, w + 6, h + 6);
      const lit = on * level;
      images.on.setAlpha(lit);
      images.off.setAlpha(1 - lit * 0.9);
      images.glow.setAlpha(0.45 * lit);
      // Lamp hoods along the top: they light the board.
      for (let lx = x + 60; lx < x + w; lx += 140) {
        g.fillStyle(0x0c0b0a, 1).fillRect(lx - 14, y - 14, 28, 8);
        if (lit > 0) g.fillStyle(0xffd08a, lit).fillRect(lx - 10, y - 7, 20, 3);
      }
      if (lit > 0.5) g.lineStyle(2.6, INK_HEX, 0.9).lineBetween(x - 3, y - 2, x + w + 3, y - 2);
      else {
        // Unlit: dashed outline, it is only paper.
        g.lineStyle(1.4, INK_HEX, 0.35);
        for (let dx = x; dx < x + w; dx += 24) g.lineBetween(dx, y - 2, Math.min(x + w, dx + 12), y - 2);
      }
      break;
    }
    case 'fan': {
      const { x, w, yBottom, yTop } = machine;
      const cx = x + w / 2;
      // Housing on the alley floor, just above the mist.
      g.fillStyle(0x121416, 1).fillRect(x + 10, yBottom - 50, w - 20, 60);
      g.lineStyle(2, INK_HEX, 0.35).strokeRect(x + 10, yBottom - 50, w - 20, 60);
      view.spin = (view.spin ?? 0) + level * 0.5 + 0.004;
      g.fillStyle(0x07080a, 1).fillEllipse(cx, yBottom - 50, w - 40, 22);
      g.lineStyle(3, 0x2a2e30, 1);
      for (let i = 0; i < 6; i += 1) {
        const a = view.spin + (i * TAU) / 6;
        g.lineBetween(cx, yBottom - 50, cx + Math.cos(a) * (w / 2 - 22), yBottom - 50 + Math.sin(a) * 9);
      }
      // The column of moving air: faint walls and rising chevrons.
      g.lineStyle(1.2, INK_HEX, 0.12 + 0.2 * level);
      g.lineBetween(x, yTop + 40, x, yBottom - 60);
      g.lineBetween(x + w, yTop + 40, x + w, yBottom - 60);
      if (level > 0.02) {
        const k = level * (on > 0 ? 1 : 0.4);
        g.fillStyle(color.hex, 0.06 * k).fillRect(x, yTop, w, yBottom - yTop);
        g.lineStyle(2, color.glow, 0.35 * k);
        g.lineBetween(x + 2, yTop + 20, x + 2, yBottom - 60);
        g.lineBetween(x + w - 2, yTop + 20, x + w - 2, yBottom - 60);
        g.lineStyle(3, color.glow, 0.55 * k);
        for (let c = 0; c < 7; c += 1) {
          const cy = yBottom - 80 - ((t * 360 + c * 200) % (yBottom - yTop - 100));
          const cx = x + w / 2;
          g.lineBetween(cx - 22, cy + 16, cx, cy);
          g.lineBetween(cx + 22, cy + 16, cx, cy);
        }
      }
      if (images.draft) {
        images.draft.setAlpha(0.8 * level * (on > 0 ? 1 : 0.5));
        images.draft.tilePositionY += 18 * level;
      }
      if (level > 0.05) {
        for (let i = 0; i < 10; i += 1) {
          const py = yBottom - ((t * 420 + i * 137) % (yBottom - yTop));
          const pxx = x + 30 + ((i * 53 + Math.sin(t * 2 + i) * 20) % (w - 60));
          g.fillStyle(0xd8ccb0, 0.5 * level).fillRect(pxx, py, 5, 3);
        }
      }
      break;
    }
    case 'shutter': {
      const { x, y, w, h } = machine;
      const shown = h * (1 - level);
      g.fillStyle(0x15181a, 1).fillRect(x - 4, y - 16, w + 8, 16);
      g.fillStyle(0x2b3033, 1).fillRect(x, y, w, shown);
      g.lineStyle(1, 0x0a0c0d, 1);
      for (let sy = y + 6; sy < y + shown; sy += 7) g.lineBetween(x, sy, x + w, sy);
      g.lineStyle(1.6, INK_HEX, 0.45).lineBetween(x, y + shown, x + w, y + shown);
      g.fillStyle(on > 0 ? color.hex : color.dim, 1).fillCircle(x + w / 2, y - 8, 3.5);
      break;
    }
    case 'points':
    case 'drawbridge': {
      const { x, y, length, dir } = machine;
      const raised = machine.kind === 'points' ? 0.32 : -1.35; // radians
      const a = raised * (1 - level);
      const ex = x + Math.cos(a) * length * dir;
      const ey = y + Math.sin(a) * length;
      // Pivot tower.
      g.fillStyle(0x121416, 1).fillRect(x - 22, y - (machine.kind === 'drawbridge' ? 140 : 30), 22, (machine.kind === 'drawbridge' ? 170 : 60));
      if (machine.kind === 'drawbridge') {
        g.lineStyle(2, 0x0a0b0c, 1).lineBetween(x - 11, y - 134, ex, ey);
        g.lineStyle(1, INK_HEX, 0.25).lineBetween(x - 11, y - 134, ex, ey);
      }
      // Deck / rail blade as a rotated strip.
      const nx = -Math.sin(a) * dir;
      const ny = Math.cos(a);
      const th = machine.kind === 'points' ? 16 : 22;
      g.fillStyle(0x2a241e, 1).fillPoints([
        { x, y }, { x: ex, y: ey }, { x: ex + nx * th, y: ey + ny * th }, { x: x + nx * th, y: y + ny * th },
      ], true);
      if (machine.kind === 'points') {
        // Sleepers and two rails.
        g.lineStyle(3, 0x0d0b09, 1);
        for (let k = 0.05; k < 1; k += 0.08) {
          const sx = x + (ex - x) * k;
          const sy = y + (ey - y) * k;
          g.lineBetween(sx, sy + 2, sx + nx * th, sy + ny * th);
        }
        g.lineStyle(3, 0x6d6a62, 1).lineBetween(x, y - 2, ex, ey - 2);
      }
      g.lineStyle(level > 0.97 ? 2.6 : 1.4, INK_HEX, level > 0.97 ? 0.9 : 0.4).lineBetween(x, y + 1, ex, ey + 1);
      if (on > 0) g.lineStyle(3, color.hex, 0.8 * on).lineBetween(x + nx * 6, y + ny * 6, ex + nx * 6, ey + ny * 6);
      g.fillStyle(on > 0 ? color.hex : color.dim, 1).fillCircle(x - 11, y - (machine.kind === 'drawbridge' ? 128 : 20), 5);
      images.glow?.setPosition((x + ex) / 2, (y + ey) / 2 + 8).setDisplaySize(length + 100, 130).setTint(color.hex).setAlpha(0.25 * on);
      break;
    }
    case 'sign': {
      const lit = on * level;
      images.on.setAlpha(lit);
      images.glow.setAlpha(0.55 * lit);
      g.lineStyle(2, 0x0b0907, 1);
      g.lineBetween(machine.x - machine.w * 0.3, machine.y - 10, machine.x - machine.w * 0.3, machine.y - 80);
      g.lineBetween(machine.x + machine.w * 0.3, machine.y - 10, machine.x + machine.w * 0.3, machine.y - 80);
      break;
    }
    default:
      break;
  }
  if (ghost) g.setAlpha(0.35); else g.setAlpha(1);
}

// Listen: a dashed ghost outline of where a machine will be after the bell.
export function drawGhost(g, machine, to, line, t) {
  const color = LINE_COLORS[line];
  const level = to === 'on' ? 1 : 0;
  const b = machineBounds(machine, machine.kind === 'bridge' ? Math.max(0.02, level) : level);
  const pulse = 0.55 + 0.35 * Math.sin(t * 7);
  const dash = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.floor(len / 18));
    for (let i = 0; i < n; i += 2) {
      const a = i / n;
      const c = Math.min(1, (i + 1) / n);
      g.lineBetween(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * c, y1 + (y2 - y1) * c);
    }
  };
  g.lineStyle(3, color.glow, pulse);
  if (machine.kind === 'points' || machine.kind === 'drawbridge') {
    const raised = machine.kind === 'points' ? 0.32 : -1.35;
    const a = raised * (1 - level);
    const ex = machine.x + Math.cos(a) * machine.length * machine.dir;
    const ey = machine.y + Math.sin(a) * machine.length;
    dash(machine.x, machine.y, ex, ey);
    dash(machine.x, machine.y + 20, ex, ey + 20);
  } else if (machine.kind === 'fan') {
    dash(b.x, b.y, b.x, b.y + b.h);
    dash(b.x + b.w, b.y, b.x + b.w, b.y + b.h);
    for (let k = 0; k < 5; k += 1) {
      const yy = b.y + b.h - ((t * 300 + k * 200) % b.h);
      g.lineBetween(b.x + b.w / 2 - 10, yy + 16, b.x + b.w / 2, yy);
      g.lineBetween(b.x + b.w / 2 + 10, yy + 16, b.x + b.w / 2, yy);
    }
  } else if (machine.kind === 'shutter') {
    const h = to === 'on' ? 0 : machine.h;
    dash(machine.x, machine.y, machine.x, machine.y + machine.h);
    dash(machine.x + machine.w, machine.y, machine.x + machine.w, machine.y + machine.h);
    if (h) dash(machine.x, machine.y + h, machine.x + machine.w, machine.y + h);
  } else {
    const h = Math.max(b.h, 18);
    dash(b.x, b.y, b.x + b.w, b.y);
    dash(b.x + b.w, b.y, b.x + b.w, b.y + h);
    dash(b.x + b.w, b.y + h, b.x, b.y + h);
    dash(b.x, b.y + h, b.x, b.y);
  }
}
