// Chapter 4 // THE PAINTED COUNTRY — a stroke to paint over.
//
// Round 6, item 11: the paint tutorial came after the player's first
// reasonable click. Now the first safe ground shows a short dashed stroke
// where a step of paper would go, and a brush nib that keeps painting along
// it (and its wet trail drying off behind it), so the verb and where to use
// it are on screen before the first click. The same ghost marks the line
// ahead's first gap.

import Phaser from 'phaser';
import { PAPER } from './paperPalette.js';
import { reducedMotionActive } from '../../shell/motion.js';

const CYCLE_MS = 2200; // one pass of the nib, then a rest
const PASS = 0.62; // fraction of the cycle the nib is moving

export class GhostStroke {
  constructor(scene, { depth = 47, cell = 20 } = {}) {
    this.scene = scene;
    this.cell = cell;
    this.g = scene.add.graphics().setDepth(depth);
    this.cells = [];
    this.done = new Set();
    this.visible = false;
    this.alpha = 0;
    this.shownAt = 0;
  }

  /** `cells` is [{ c, r }] in painting order. */
  show(cells) {
    const same = this.visible && cells.length === this.cells.length && cells.every((x, i) => x.c === this.cells[i].c && x.r === this.cells[i].r);
    if (same) return;
    this.cells = cells.slice();
    this.visible = true;
    this.shownAt = this.scene.time.now;
  }

  hide() {
    this.visible = false;
  }

  /** Cells of the ghost already painted are drawn as done (no dashes). */
  markPainted(isPainted) {
    this.done = new Set(this.cells.filter(({ c, r }) => isPainted(c, r)).map(({ c, r }) => `${c},${r}`));
  }

  get remaining() {
    return this.cells.filter(({ c, r }) => !this.done.has(`${c},${r}`)).length;
  }

  update(dt) {
    const g = this.g;
    g.clear();
    this.alpha = Phaser.Math.Clamp(this.alpha + (this.visible ? dt / 0.35 : -dt / 0.25), 0, 1);
    if (this.alpha <= 0 || !this.cells.length) return;
    const a = this.alpha;
    const s = this.cell;
    const now = this.scene.time.now;
    const pts = this.cells.map(({ c, r }) => ({ x: c * s + s / 2, y: r * s + s / 2, key: `${c},${r}` }));
    const x0 = pts[0].x - s * 0.45;
    const x1 = pts[pts.length - 1].x + s * 0.45;
    const path = [{ x: x0, y: pts[0].y }, ...pts, { x: x1, y: pts[pts.length - 1].y }];
    // a pale wet band where the step goes, breathing gently, so the shape
    // reads against the drawing behind it
    const still = reducedMotionActive();
    const breathe = still ? 0.5 : 0.5 + 0.5 * Math.sin(now / 420);
    pts.forEach((p) => {
      if (this.done.has(p.key)) return;
      g.fillStyle(PAPER.indigo, (0.1 + 0.08 * breathe) * a).fillRect(p.x - s / 2, p.y - s / 2 + 1, s, s - 2);
    });
    // the dashed outline of the step to paint: top and bottom edges
    const march = still ? 0 : (now / 90) % 12;
    [-s / 2 + 1, s / 2 - 1].forEach((off) => this.dashed(g, path.map((p) => ({ x: p.x, y: p.y + off })), 6, 6, march, a));
    // end caps
    g.lineStyle(2.2, PAPER.indigo, 0.8 * a);
    [path[0], path[path.length - 1]].forEach((p) => g.lineBetween(p.x, p.y - s / 2 + 1, p.x, p.y + s / 2 - 1));
    // the nib: paints along it, its wet trail dries behind it
    const phase = still ? 0.5 * PASS : ((now - this.shownAt) % CYCLE_MS) / CYCLE_MS;
    const k = Math.min(1, phase / PASS);
    const eased = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
    const total = x1 - x0;
    const at = this.along(path, eased * total);
    if (phase < PASS + 0.12) {
      const trailFrom = Math.max(0, eased * total - total * 0.55);
      const steps = 14;
      for (let i = 0; i < steps; i += 1) {
        const d = trailFrom + ((eased * total - trailFrom) * i) / steps;
        const p = this.along(path, d);
        const fresh = i / steps;
        g.fillStyle(PAPER.indigo, (0.08 + 0.22 * fresh) * a * (phase > PASS ? 1 - (phase - PASS) / 0.12 : 1));
        g.fillCircle(p.x, p.y, s * 0.42);
      }
    }
    this.drawNib(g, at.x, at.y, a, phase < PASS);
  }

  along(path, d) {
    let left = d;
    for (let i = 0; i < path.length - 1; i += 1) {
      const len = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
      if (left <= len || i === path.length - 2) {
        const f = len ? Math.min(1, left / len) : 0;
        return { x: path[i].x + (path[i + 1].x - path[i].x) * f, y: path[i].y + (path[i + 1].y - path[i].y) * f };
      }
      left -= len;
    }
    return path[path.length - 1];
  }

  dashed(g, pts, dash, gap, offset, a) {
    g.lineStyle(2.4, PAPER.indigo, 0.9 * a);
    const period = dash + gap;
    let run = offset;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p = pts[i];
      const q = pts[i + 1];
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (!len) continue;
      const steps = Math.max(1, Math.ceil(len / 1.5));
      for (let k = 0; k < steps; k += 1) {
        const f0 = k / steps;
        const f1 = (k + 1) / steps;
        if ((run + ((f0 + f1) / 2) * len) % period < dash) {
          g.lineBetween(p.x + (q.x - p.x) * f0, p.y + (q.y - p.y) * f0, p.x + (q.x - p.x) * f1, p.y + (q.y - p.y) * f1);
        }
      }
      run += len;
    }
  }

  // A brush held over the stroke, tip down, dipping as it paints.
  drawNib(g, x, y, a, painting) {
    const lift = painting ? 0 : 6;
    const tx = x;
    const ty = y + 2 - lift;
    g.lineStyle(3.4, PAPER.bookCloth, 0.95 * a).lineBetween(tx + 24, ty - 30, tx + 9, ty - 12);
    g.lineStyle(4.4, PAPER.graphite, 0.95 * a).lineBetween(tx + 9, ty - 12, tx + 5, ty - 7);
    g.fillStyle(PAPER.indigo, 0.95 * a);
    g.fillTriangle(tx + 7, ty - 10, tx + 2, ty - 4, tx - 1, ty + 1);
    g.fillCircle(tx + 2.5, ty - 4, 3);
  }

  destroy() {
    this.g.destroy();
  }
}
