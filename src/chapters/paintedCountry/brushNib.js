// Chapter 4 // THE PAINTED COUNTRY — the brush, at the end of the pointer.
//
// Round 6, items 11 and 12. Before the first click the player has to be able
// to see that the pointer is a brush and that a left click lays paint, and
// at the edge of its reach the brush has to say so instead of silently
// stopping a stroke halfway across a gap.
//
//   the cursor      a small brush (a CSS cursor, so it moves at the OS's own
//                   rate however slow the frame): a loaded indigo nib where a
//                   click will paint, a pale wet nib where it will wash, a
//                   hollow nib struck through where the paper is out of reach,
//                   a hand over a thing you act on (a plate, a door sign)
//   the preview     where the paint will land: a soft cell of wet gouache
//   the reach ring  round Butch, brighter as the cursor nears its edge, and
//                   named "BRUSH REACH" the first time it matters
//   GET CLOSER      a slip beside a struck nib (on a press, and for the first
//                   few seconds of hovering out of reach)
//   stop marks      where a dragged stroke hit the edge of the reach: an ink
//                   blot and a stop tick, with a soft dry-brush scratch

import Phaser from 'phaser';
import { PAPER } from './paperPalette.js';
import { MONO, UI, px } from './chapterUi.js';
import { edgeProximity, nearestOnReach } from './brushReach.js';
import { reducedMotionActive } from '../../shell/motion.js';
import { dryBrush } from './lineAudio.js';

const HOT = { x: 3, y: 29 };
let cursorCss = null;

// The cursor images, drawn once per page: 32 × 32, the nib's tip at HOT.
function brushCursor(state) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const c = canvas.getContext('2d');
  const far = state === 'far' || state === 'refuse';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // a pale halo so the brush reads on the darkest paint too
  const halo = (draw) => { c.save(); c.strokeStyle = 'rgba(253,252,248,0.95)'; c.lineWidth += 2.5; draw(); c.restore(); };
  // handle
  const handle = () => { c.beginPath(); c.moveTo(29, 3); c.lineTo(14, 18); c.stroke(); };
  c.lineWidth = 3.4;
  halo(handle);
  c.strokeStyle = far ? '#a39a8c' : '#cc785c';
  handle();
  // ferrule
  const ferrule = () => { c.beginPath(); c.moveTo(14.5, 17.5); c.lineTo(10.5, 21.5); c.stroke(); };
  c.lineWidth = 4.2;
  halo(ferrule);
  c.strokeStyle = far ? '#8d8579' : '#4a4640';
  ferrule();
  // the bristles: a teardrop to the tip
  const tuft = () => {
    c.beginPath();
    c.moveTo(12.5, 19.5);
    c.quadraticCurveTo(13.5, 25, HOT.x, HOT.y);
    c.quadraticCurveTo(7, 18.5, 12.5, 19.5);
    c.closePath();
  };
  c.save();
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(253,252,248,0.95)';
  tuft();
  c.stroke();
  c.restore();
  tuft();
  if (state === 'paint') {
    c.fillStyle = '#46618c';
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = '#24344f';
    c.stroke();
    // a bead of paint on the tip
    c.fillStyle = '#2f4566';
    c.beginPath(); c.arc(HOT.x + 1.2, HOT.y - 1.2, 1.9, 0, Math.PI * 2); c.fill();
  } else if (state === 'wash') {
    c.fillStyle = '#e8eef3';
    c.fill();
    c.lineWidth = 1.2;
    c.strokeStyle = '#cc785c';
    c.stroke();
    // a drop of clean water
    c.fillStyle = '#9fb7cc';
    c.beginPath(); c.arc(HOT.x + 1.2, HOT.y - 1.2, 1.7, 0, Math.PI * 2); c.fill();
  } else {
    // hollow: nothing loaded can reach
    c.fillStyle = 'rgba(253,252,248,0.9)';
    c.fill();
    c.lineWidth = 1.3;
    c.strokeStyle = '#8d8579';
    c.stroke();
    if (state === 'far') {
      // struck through
      c.lineWidth = 3.6;
      c.strokeStyle = 'rgba(253,252,248,0.95)';
      c.beginPath(); c.moveTo(1, 19); c.lineTo(17, 31); c.stroke();
      c.lineWidth = 1.8;
      c.strokeStyle = '#8a2a1e';
      c.beginPath(); c.moveTo(1, 19); c.lineTo(17, 31); c.stroke();
    }
  }
  return `url(${canvas.toDataURL('image/png')}) ${HOT.x} ${HOT.y}, crosshair`;
}

export function nibCursorCss(state) {
  if (typeof document === 'undefined') return 'crosshair';
  if (!cursorCss) {
    try {
      cursorCss = Object.fromEntries(['paint', 'wash', 'far', 'refuse'].map((s) => [s, brushCursor(s)]));
    } catch {
      cursorCss = { paint: 'crosshair', wash: 'crosshair', far: 'not-allowed', refuse: 'not-allowed' };
    }
  }
  if (state === 'look') return 'pointer';
  if (state === 'none') return 'default';
  return cursorCss[state] ?? cursorCss.paint;
}

export class BrushNib {
  constructor(scene, { depth = 48, reach = 180, cell = 20 } = {}) {
    this.scene = scene;
    this.reach = reach;
    this.cell = cell;
    this.ring = scene.add.graphics().setDepth(depth - 2);
    this.preview = scene.add.graphics().setDepth(depth - 1);
    this.marks = scene.add.graphics().setDepth(depth + 0.5);
    this.virtualNib = scene.add.graphics().setDepth(depth + 1);
    this.ringLabel = scene.add.text(0, 0, 'BRUSH REACH', {
      fontFamily: MONO, fontSize: px(11), color: '#4a4640', fontStyle: 'bold', letterSpacing: 2,
      backgroundColor: '#f7f4ecdd', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(depth + 2).setVisible(false);
    this.farLabel = scene.add.text(0, 0, 'GET CLOSER', {
      fontFamily: MONO, fontSize: px(11), color: UI.oxblood, fontStyle: 'bold', letterSpacing: 1.5,
      backgroundColor: '#f7f4ecee', padding: { x: 6, y: 3 },
    }).setOrigin(0, 0.5).setDepth(depth + 2).setVisible(false);
    // "LEFT CLICK · PAINT": the first few strokes carry their key beside the nib
    this.keyLabel = scene.add.text(0, 0, '', {
      fontFamily: MONO, fontSize: px(11), color: UI.ink, fontStyle: 'bold', letterSpacing: 1.5,
      backgroundColor: '#efe4ccee', padding: { x: 6, y: 3 },
    }).setOrigin(0, 0.5).setDepth(depth + 2).setVisible(false);
    this.state = null;
    this.stops = [];
    this.ringTaughtAt = null;
    this.ringTaught = false;
    this.farHover = 0;
    this.lastDry = -Infinity;
    this.enabled = true;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.setCursor('none'));
  }

  setCursor(state) {
    if (state === this.state) return;
    this.state = state;
    try { this.scene.input.setDefaultCursor(nibCursorCss(state)); } catch { /* headless */ }
  }

  /** The ring is named the first time it matters (a refused press, a cut stroke). */
  teachRing(now = this.scene.time.now) {
    if (this.ringTaught) return false;
    this.ringTaught = true;
    this.ringTaughtAt = now;
    return true;
  }

  /** A stroke ran into the edge of the reach at (x, y), heading (dirX, dirY). */
  stop(x, y, dirX = 1, dirY = 0) {
    const now = this.scene.time.now;
    this.stops.push({ x, y, dirX, dirY, at: now, seed: (x * 31 + y * 17) | 0 });
    if (this.stops.length > 6) this.stops.shift();
    this.teachRing(now);
    if (now - this.lastDry > 240) {
      this.lastDry = now;
      dryBrush();
    }
  }

  /** A press out of reach: the dry scratch and the named ring, no mark. */
  refuseFar() {
    const now = this.scene.time.now;
    this.refusedAt = now;
    this.teachRing(now);
    if (now - this.lastDry > 240) {
      this.lastDry = now;
      dryBrush({ soft: true });
    }
  }

  hide() {
    [this.ring, this.preview, this.virtualNib].forEach((g) => g.clear());
    [this.ringLabel, this.farLabel, this.keyLabel].forEach((t) => t.setVisible(false));
  }

  /**
   * Draw for this frame. `anchor` is the brush hand's centre (Butch), `x, y`
   * the brush in world px, `state` a nibState(), `cell` the cell the paint
   * would land in, `pressing` whether a button is held, `keyHint` the
   * "LEFT CLICK · PAINT" text while it is still being taught (or null).
   */
  draw({ anchor, x, y, state, cell = null, pressing = false, virtual = false, keyHint = null, dt = 1 / 60 }) {
    const now = this.scene.time.now;
    const R = this.reach;
    this.setCursor(state);
    const g = this.ring;
    g.clear();
    const near = edgeProximity(anchor, x, y, R);
    const teaching = this.ringTaughtAt !== null && now - this.ringTaughtAt < 3600;
    const pulse = teaching && !reducedMotionActive() ? 0.5 + 0.5 * Math.sin((now - this.ringTaughtAt) / 140) : 0;
    const alpha = 0.16 + near * 0.32 + (teaching ? 0.3 + pulse * 0.2 : 0);
    // a dashed graphite ring: drawn, not a UI circle
    const dashes = 64;
    g.lineStyle(teaching ? 2 : 1.3, state === 'far' || teaching ? PAPER.graphite : PAPER.graphiteSoft, Math.min(0.9, alpha));
    for (let i = 0; i < dashes; i += 1) {
      const a0 = (i / dashes) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / dashes * 0.55;
      g.beginPath();
      g.arc(anchor.x, anchor.y, R, a0, a1, false);
      g.strokePath();
    }
    if (teaching) {
      const at = nearestOnReach(anchor, x, y, R);
      this.ringLabel.setPosition(at.x, at.y).setVisible(true).setAlpha(Math.min(1, (3600 - (now - this.ringTaughtAt)) / 500));
    } else {
      this.ringLabel.setVisible(false);
    }

    // the cell the paint will land in
    const p = this.preview;
    p.clear();
    if (cell && state === 'paint') {
      const size = this.cell;
      const cx = cell.cx * size;
      const cy = cell.cy * size;
      p.fillStyle(PAPER.indigo, pressing ? 0.32 : 0.2).fillRoundedRect(cx + 1, cy + 2, size - 2, size - 4, 6);
      p.lineStyle(1.4, PAPER.indigo, 0.55).strokeRoundedRect(cx + 1, cy + 2, size - 2, size - 4, 6);
    } else if (cell && state === 'wash') {
      const size = this.cell;
      p.lineStyle(2, PAPER.bookCloth, 0.85).strokeRect(cell.cx * size, cell.cy * size, size, size);
    } else if (cell && state === 'refuse') {
      const size = this.cell;
      p.lineStyle(1.4, PAPER.graphiteFaint, 0.7).strokeRect(cell.cx * size, cell.cy * size, size, size);
    }

    // keyboard / pad: there is no OS cursor, so the nib is drawn in the world
    const v = this.virtualNib;
    v.clear();
    if (virtual) this.drawWorldNib(v, x, y, state);

    // GET CLOSER beside a struck nib: on a press, just after a stroke was
    // cut, and for the first few seconds the player hovers out of reach (the
    // budget only runs while the pointer is moving, not under a card)
    const moved = this.lastAt ? Math.hypot(x - this.lastAt.x, y - this.lastAt.y) > 0.5 : false;
    this.lastAt = { x, y };
    if (state === 'far' && moved) this.farHover += dt;
    const justCut = this.stops.length && now - this.stops[this.stops.length - 1].at < 2200;
    const showFar = state === 'far' && (pressing || justCut || now - (this.refusedAt ?? -Infinity) < 2000 || this.farHover < 6);
    // to the right of the brush's handle, clear of the paint under the tip
    this.farLabel.setVisible(showFar).setPosition(x + 30, y - 16);
    // the verb's key, beside the nib, for the first strokes
    const showKey = Boolean(keyHint) && (state === 'paint' || state === 'wash') && !showFar;
    this.keyLabel.setVisible(showKey);
    if (showKey) this.keyLabel.setText(keyHint).setPosition(x + 30, y - 16);

    this.drawStops(now);
  }

  drawWorldNib(g, x, y, state) {
    const far = state === 'far' || state === 'refuse';
    g.lineStyle(3.2, far ? 0xa39a8c : PAPER.bookCloth, 1).lineBetween(x + 26, y - 26, x + 11, y - 11);
    g.lineStyle(4, far ? PAPER.graphiteSoft : PAPER.graphite, 1).lineBetween(x + 11, y - 11, x + 7, y - 7);
    if (state === 'paint') g.fillStyle(PAPER.indigo, 1).fillTriangle(x + 9, y - 10, x + 4, y - 4, x, y);
    else if (state === 'wash') g.fillStyle(0xe8eef3, 1).fillTriangle(x + 9, y - 10, x + 4, y - 4, x, y);
    else {
      g.lineStyle(1.3, PAPER.graphiteSoft, 1).strokeTriangle(x + 9, y - 10, x + 4, y - 4, x, y);
      if (state === 'far') g.lineStyle(2, 0x8a2a1e, 1).lineBetween(x - 2, y - 10, x + 12, y + 2);
    }
    g.lineStyle(1.5, UI.amber, 0.9).strokeCircle(x, y, 7);
  }

  // Ink blots where strokes stopped: a pooled drop, a few spatters, and a
  // short tick across the stroke's direction. They dry and fade.
  drawStops(now) {
    const g = this.marks;
    g.clear();
    this.stops = this.stops.filter((s) => now - s.at < 2800);
    this.stops.forEach((s) => {
      const age = (now - s.at) / 2800;
      const a = age < 0.75 ? 1 : 1 - (age - 0.75) / 0.25;
      const grow = Math.min(1, (now - s.at) / 140);
      let seed = s.seed >>> 0;
      const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      // the blot
      g.fillStyle(PAPER.indigo, 0.85 * a);
      g.fillCircle(s.x, s.y, 5.5 * grow);
      g.fillStyle(0x2f4566, 0.7 * a).fillCircle(s.x + s.dirX * 1.5, s.y + s.dirY * 1.5, 3.4 * grow);
      for (let i = 0; i < 5; i += 1) {
        const ang = Math.atan2(s.dirY, s.dirX) + (rnd() - 0.5) * 1.6;
        const d = (7 + rnd() * 8) * grow;
        g.fillStyle(PAPER.indigo, 0.7 * a).fillCircle(s.x + Math.cos(ang) * d, s.y + Math.sin(ang) * d, 0.8 + rnd() * 1.6);
      }
      // the stop tick, across the direction of the stroke
      const nx = -s.dirY;
      const ny = s.dirX;
      g.lineStyle(2.4, 0x8a2a1e, 0.85 * a);
      g.lineBetween(s.x + s.dirX * 9 + nx * 9, s.y + s.dirY * 9 + ny * 9, s.x + s.dirX * 9 - nx * 9, s.y + s.dirY * 9 - ny * 9);
    });
  }

  destroy() {
    this.setCursor('none');
    [this.ring, this.preview, this.marks, this.virtualNib, this.ringLabel, this.farLabel, this.keyLabel].forEach((o) => o.destroy());
  }
}
