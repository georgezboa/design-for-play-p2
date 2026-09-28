// Chapter 2 · BORROWED LIGHT — small game-feel effects, drawn into one
// Graphics each frame: landing dust, the punched paper disc popping out of a
// tag, bell ripples round the nodes that fire, and sparks.

import { DEPTH } from './palette.js';

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(DEPTH.fx + 0.5);
    this.items = [];
  }

  // Soft dust / spray puffs from Butch's boots.
  dust(x, y, { hard = false, dir = 0 } = {}) {
    const n = hard ? 9 : 4;
    for (let i = 0; i < n; i += 1) {
      const side = i % 2 ? 1 : -1;
      this.items.push({
        kind: 'dust',
        x: x + side * (4 + Math.random() * 10),
        y: y - 2,
        vx: side * (40 + Math.random() * (hard ? 140 : 70)) + dir * 30,
        vy: -(10 + Math.random() * (hard ? 70 : 30)),
        r: 5 + Math.random() * 6,
        life: 1,
        decay: 1.8 + Math.random() * 0.8,
      });
    }
  }

  // The punched paper disc: pops out of the tag, tumbles and falls.
  pop(x, y, color) {
    this.items.push({ kind: 'disc', x, y, vx: 60 + Math.random() * 80, vy: -170 - Math.random() * 60, spin: Math.random() * 6, life: 1, decay: 0.9, color });
    this.items.push({ kind: 'ring', x, y, r: 6, grow: 110, life: 1, decay: 3.2, color, width: 2.4 });
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      this.items.push({ kind: 'spark', x, y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 1, decay: 3.5, color });
    }
  }

  // A bell ripple around a node that fires.
  ripple(x, y, color, { max = 180, width = 3 } = {}) {
    this.items.push({ kind: 'ring', x, y, r: 12, grow: max, life: 1, decay: 1.4, color, width });
    this.items.push({ kind: 'ring', x, y, r: 6, grow: max * 0.6, life: 1, decay: 1.9, color, width: width * 0.6 });
  }

  update(dt) {
    const s = dt / 1000;
    const g = this.g;
    g.clear();
    this.items = this.items.filter((it) => {
      it.life -= it.decay * s;
      if (it.life <= 0) return false;
      switch (it.kind) {
        case 'dust':
          it.x += it.vx * s;
          it.y += it.vy * s;
          it.vx *= 0.9;
          it.vy += 60 * s;
          it.r += 18 * s;
          g.fillStyle(0xb9c3c6, 0.28 * it.life).fillCircle(it.x, it.y, it.r);
          break;
        case 'disc':
          it.x += it.vx * s;
          it.y += it.vy * s;
          it.vy += 620 * s;
          it.spin += 12 * s;
          g.fillStyle(0xe6dcc2, Math.min(1, it.life * 1.4)).fillEllipse(it.x, it.y, 9 * Math.abs(Math.cos(it.spin)) + 2, 9);
          break;
        case 'spark':
          it.x += it.vx * s;
          it.y += it.vy * s;
          it.vx *= 0.86;
          it.vy *= 0.86;
          g.fillStyle(it.color, it.life).fillCircle(it.x, it.y, 2);
          break;
        case 'ring':
          it.r += it.grow * s;
          g.lineStyle(it.width, it.color, 0.8 * it.life).strokeCircle(it.x, it.y, it.r);
          break;
        default:
          break;
      }
      return true;
    });
  }
}
