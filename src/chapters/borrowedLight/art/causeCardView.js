// Chapter 2 · BORROWED LIGHT — drawing the cause card (causeCard.js) and the
// next-bell dial a punched machine shows.
//
// One ivory paper card, walnut ink, the line's colour on its top strip, like
// every tag in the chapter, only large: [E] PUNCH ──▶ (bell) NEXT BELL ──▶
// (machine) BRIDGE OUT. Icons are drawn, so the idea reads before a word is
// read; the lit cell is the step the box is at. Text follows TEXT SIZE.

import { DEPTH, FONTS, LINE_COLORS } from './palette.js';
import { CARD_FONT, cardLayout, placeCard } from '../causeCard.js';

const INK = 0x2a1d14;
const PAPER = 0xe6dcc2;
const PAPER_SHADE = 0xcfc3a5;
const TAU = Math.PI * 2;

// A brass bell, hung from its top at (x, y), `s` tall. Shared by the card,
// the machine dial and the station clock.
export function drawBellGlyph(g, x, y, s, { color = 0xb08a4a, ink = 0x3a2a14, alpha = 1, swing = 0 } = {}) {
  const pts = [];
  for (let i = 0; i <= 10; i += 1) {
    const k = i / 10;
    const w = s * (0.17 + Math.pow(k, 1.8) * 0.3 + (k > 0.85 ? (k - 0.85) * 0.7 : 0));
    pts.push({ x: -w, y: s * (0.1 + k * 0.78) });
  }
  const body = [...pts, ...pts.slice().reverse().map((p) => ({ x: -p.x, y: p.y }))];
  const c = Math.cos(swing);
  const sn = Math.sin(swing);
  const at = (p) => ({ x: x + p.x * c - p.y * sn, y: y + p.x * sn + p.y * c });
  g.fillStyle(ink, alpha).fillCircle(x, y + s * 0.03, s * 0.07);
  g.fillStyle(color, alpha).fillPoints(body.map(at), true);
  const lip = [{ x: -s * 0.52, y: s * 0.86 }, { x: s * 0.52, y: s * 0.86 }, { x: s * 0.52, y: s * 0.93 }, { x: -s * 0.52, y: s * 0.93 }].map(at);
  g.fillStyle(ink, alpha).fillPoints(lip, true);
  const clapper = at({ x: 0, y: s * 1.0 });
  g.fillStyle(ink, alpha).fillCircle(clapper.x, clapper.y, s * 0.09);
}

// A small pictogram of the machine a box powers, centred at (x, y), `s` wide.
function drawMachineIcon(g, kind, x, y, s, { color = INK, alpha = 1, lit = false, accent = 0xe0a24a } = {}) {
  const ink = color;
  const fill = lit ? accent : ink;
  const h = s * 0.5;
  switch (kind) {
    case 'bridge':
    case 'points':
    case 'drawbridge': {
      // A housing on the left edge of a gap, its deck run out across it to
      // the far edge, with an arrow along it.
      const lw = Math.max(1.5, s * 0.045);
      g.fillStyle(ink, alpha).fillRect(x - s * 0.5, y - h * 0.05, s * 0.16, h * 0.75);
      g.fillStyle(ink, alpha).fillRect(x + s * 0.38, y + h * 0.12, s * 0.12, h * 0.58);
      g.fillStyle(fill, alpha).fillRect(x - s * 0.36, y + h * 0.04, s * 0.74, h * 0.16);
      g.lineStyle(lw, ink, alpha).lineBetween(x - s * 0.3, y - h * 0.28, x + s * 0.18, y - h * 0.28);
      g.fillStyle(ink, alpha).fillTriangle(x + s * 0.3, y - h * 0.28, x + s * 0.16, y - h * 0.42, x + s * 0.16, y - h * 0.14);
      break;
    }
    case 'lift':
    case 'counterweight': {
      g.lineStyle(Math.max(1.5, s * 0.05), ink, alpha).strokeRect(x - s * 0.32, y - h * 0.7, s * 0.64, h * 1.3);
      g.fillStyle(fill, alpha).fillRect(x - s * 0.32, y + h * 0.42, s * 0.64, h * 0.18);
      // Up arrow.
      g.fillStyle(fill, alpha).fillTriangle(x, y - h * 0.62, x - s * 0.16, y - h * 0.22, x + s * 0.16, y - h * 0.22);
      g.fillRect(x - s * 0.05, y - h * 0.24, s * 0.1, h * 0.55);
      break;
    }
    case 'cradle': {
      g.lineStyle(Math.max(1.5, s * 0.04), ink, alpha).lineBetween(x - s * 0.42, y - h * 0.75, x + s * 0.42, y - h * 0.75);
      g.lineBetween(x - s * 0.3, y - h * 0.75, x - s * 0.3, y + h * 0.1);
      g.lineBetween(x + s * 0.3, y - h * 0.75, x + s * 0.3, y + h * 0.1);
      g.fillStyle(fill, alpha).fillRect(x - s * 0.36, y + h * 0.1, s * 0.72, h * 0.22);
      g.fillTriangle(x, y + h * 0.05, x - s * 0.12, y - h * 0.3, x + s * 0.12, y - h * 0.3);
      break;
    }
    case 'fan': {
      g.lineStyle(Math.max(2, s * 0.06), fill, alpha);
      for (let i = 0; i < 3; i += 1) {
        const cy = y + h * 0.5 - i * h * 0.45;
        g.lineBetween(x - s * 0.22, cy, x, cy - h * 0.3);
        g.lineBetween(x + s * 0.22, cy, x, cy - h * 0.3);
      }
      break;
    }
    case 'lantern': {
      g.fillStyle(ink, alpha).fillTriangle(x - s * 0.2, y - h * 0.5, x + s * 0.2, y - h * 0.5, x, y - h * 0.85);
      g.fillStyle(fill, alpha).fillRect(x - s * 0.15, y - h * 0.5, s * 0.3, h * 0.8);
      g.fillStyle(ink, alpha).fillRect(x - s * 0.04, y + h * 0.3, s * 0.08, h * 0.5);
      break;
    }
    default: {
      // Billboard, sign, shutter: a board that lights.
      g.lineStyle(Math.max(1.5, s * 0.05), ink, alpha).strokeRect(x - s * 0.42, y - h * 0.5, s * 0.84, h * 0.8);
      g.fillStyle(fill, alpha * (lit ? 1 : 0.5)).fillRect(x - s * 0.34, y - h * 0.38, s * 0.68, h * 0.56);
      break;
    }
  }
}

function arrow(g, x0, x1, y, k, color, alpha) {
  g.lineStyle(4 * k, color, alpha).lineBetween(x0, y, x1 - 10 * k, y);
  g.fillStyle(color, alpha).fillTriangle(x1, y, x1 - 14 * k, y - 9 * k, x1 - 14 * k, y + 9 * k);
}

// The next-bell dial a punched machine shows (at its ghost): a bell inside a
// ring that fills toward the bell, and the seconds left.
export function drawBellDial(g, x, y, k01, { r = 34, color = 0xe0a24a, glow = 0xf2c27a, alpha = 1, t = 0 } = {}) {
  g.fillStyle(0x0b0907, 0.82 * alpha).fillCircle(x, y, r + 8);
  g.lineStyle(6, 0x2a1d14, alpha).strokeCircle(x, y, r);
  g.lineStyle(6, color, alpha).beginPath();
  g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.001, k01), false);
  g.strokePath();
  if (k01 > 0.85) g.lineStyle(10, glow, 0.25 * alpha * (0.6 + 0.4 * Math.sin(t * 14))).strokeCircle(x, y, r);
  drawBellGlyph(g, x, y - r * 0.55, r * 0.95, { alpha });
}

export class CauseCardView {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(DEPTH.ghost + 2.2);
    const text = (size, { font = FONTS.mono, color = '#2a1d14', bold = true, spacing = 2 } = {}) => {
      const t = scene.add.text(0, 0, '', { fontFamily: font, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color })
        .setOrigin(0.5).setDepth(DEPTH.ghost + 2.4).setLetterSpacing(spacing);
      t.baseSize = size;
      return t;
    };
    this.labels = [0, 1, 2].map(() => text(CARD_FONT));
    this.key = text(34, { color: '#e6dcc2', spacing: 0 });
    this.key.setText('E');
    this.seconds = text(30, { font: FONTS.display, color: '#e6dcc2', bold: false, spacing: 0 });
    this.rule = text(27);
    this.note = text(27, { bold: false });
    this.texts = [...this.labels, this.key, this.seconds, this.rule, this.note];
    this.alpha = 0;
    this.k = 1;
    this.shown = null;
    this.setVisible(false);
  }

  setTextScale(k) {
    this.k = k;
    this.texts.forEach((t) => t.setFontSize(`${Math.round(t.baseSize * k)}px`));
  }

  setVisible(on) {
    this.g.setVisible(on);
    this.texts.forEach((t) => t.setVisible(on));
  }

  get visible() { return this.alpha > 0.02; }

  // The rectangle the card covers (world), for keeping other tags off it.
  get rect() { return this.shown && this.visible ? this.shown : null; }

  /**
   * card: causeCard() model or null (hide). at: { headX, headY, side, view }.
   */
  update(card, at, t, dt) {
    const target = card ? 1 : 0;
    this.alpha += (target - this.alpha) * Math.min(1, dt / 120);
    if (this.alpha < 0.02 && !card) { this.alpha = 0; this.setVisible(false); this.shown = null; return; }
    if (card) this.card = card;
    const c = this.card;
    if (!c) return;
    if (card) this.at = at;
    const { headX, headY, side, view } = this.at;
    const k = this.k;
    const a = this.alpha;
    this.setVisible(true);
    const color = LINE_COLORS[c.line] ?? LINE_COLORS.amber;
    c.cells.forEach((cell, i) => this.labels[i].setText(cell.label));
    this.rule.setText(c.rule ?? '').setVisible(Boolean(c.rule));
    this.note.setText(c.note ?? '').setVisible(Boolean(c.note));
    const L = cardLayout({
      labelW: this.labels.map((l) => l.width),
      ruleW: c.rule ? this.rule.width + 70 * k : 0,
      noteW: c.note ? this.note.width : 0,
      k,
    });
    const box = placeCard({ headX, headY, w: L.w, h: L.h, side, view });
    this.shown = box;
    const { x0, y0 } = box;
    const g = this.g;
    g.clear();
    // Paper, shadow, line strip, ink rule.
    g.fillStyle(0x000000, 0.35 * a).fillRect(x0 + 8 * k, y0 + 10 * k, L.w, L.h);
    g.fillStyle(PAPER, 0.97 * a).fillRect(x0, y0, L.w, L.h);
    g.fillStyle(PAPER_SHADE, 0.6 * a).fillRect(x0, y0 + L.h - 8 * k, L.w, 8 * k);
    g.fillStyle(color.hex, a).fillRect(x0, y0, L.w, 8 * k);
    g.lineStyle(2, INK, 0.85 * a).strokeRect(x0, y0, L.w, L.h);
    // The pointer down to the box.
    const px = Math.max(x0 + 26 * k, Math.min(x0 + L.w - 26 * k, headX));
    g.fillStyle(PAPER, 0.97 * a).fillTriangle(px - 16 * k, y0 + L.h - 1, px + 16 * k, y0 + L.h - 1, px, y0 + L.h + 22 * k);
    g.lineStyle(2, INK, 0.85 * a).lineBetween(px - 16 * k, y0 + L.h, px, y0 + L.h + 22 * k).lineBetween(px + 16 * k, y0 + L.h, px, y0 + L.h + 22 * k);
    // Cells.
    const iy = y0 + L.iconY;
    const ly = y0 + L.labelY;
    L.cells.forEach((cell, i) => {
      const on = c.active === i;
      const done = c.active > i;
      const cx = x0 + cell.cx;
      if (on) {
        g.fillStyle(color.hex, 0.26 * a).fillRoundedRect(x0 + cell.x + 4 * k, y0 + 14 * k, cell.w - 8 * k, L.h - (c.rule ? 44 * k : 0) - (c.note ? 40 * k : 0) - 24 * k, 8 * k);
        g.lineStyle(3, color.hex, 0.9 * a).strokeRoundedRect(x0 + cell.x + 4 * k, y0 + 14 * k, cell.w - 8 * k, L.h - (c.rule ? 44 * k : 0) - (c.note ? 40 * k : 0) - 24 * k, 8 * k);
      }
      const ink = on || done ? 1 : 0.42;
      this.labels[i].setPosition(cx, ly).setAlpha(ink * a);
      if (i === 0) {
        // The key: a dark keycap with an ivory E, pulsing while it is the step.
        const pulse = on ? 1 + 0.06 * Math.sin(t * 6) : 1;
        const s = 48 * k * pulse;
        g.fillStyle(0x000000, 0.3 * a).fillRoundedRect(cx - s / 2 + 3 * k, iy - s / 2 + 5 * k, s, s, 8 * k);
        g.fillStyle(INK, (on || done ? 1 : 0.6) * a).fillRoundedRect(cx - s / 2, iy - s / 2, s, s, 8 * k);
        g.lineStyle(2, on ? color.glow : 0x6d5227, a).strokeRoundedRect(cx - s / 2, iy - s / 2, s, s, 8 * k);
        this.key.setPosition(cx, iy - 1).setAlpha(a).setScale(pulse);
      } else if (i === 1) {
        // The bell, and while punched, its countdown ring and seconds.
        const r = 24 * k;
        if (on) {
          g.lineStyle(6 * k, PAPER_SHADE, a).strokeCircle(cx, iy, r);
          g.lineStyle(6 * k, color.hex, a).beginPath();
          g.arc(cx, iy, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.001, c.bellK), false);
          g.strokePath();
        }
        drawBellGlyph(g, cx, iy - r * 0.62, r * 1.15, { alpha: (on || done ? 1 : 0.5) * a, swing: on && c.bellK > 0.9 ? Math.sin(t * 20) * 0.2 : 0 });
        if (on && c.seconds != null) {
          const bx = cx + r + 24 * k;
          const by = iy - r * 0.55;
          g.fillStyle(INK, a).fillCircle(bx, by, 19 * k);
          this.seconds.setText(String(c.seconds)).setPosition(bx, by).setAlpha(a).setVisible(true);
        }
      } else {
        drawMachineIcon(g, c.kind, cx, iy, 66 * k, { color: INK, alpha: (on ? 1 : 0.5) * a, lit: on, accent: color.hex });
        if (on && c.machineK != null) {
          // The time the machine has left, as a bar under its icon.
          const bw = 70 * k;
          g.fillStyle(PAPER_SHADE, a).fillRect(cx - bw / 2, iy + 24 * k, bw, 6 * k);
          g.fillStyle(color.hex, a).fillRect(cx - bw / 2, iy + 24 * k, bw * c.machineK, 6 * k);
        }
      }
      if (i < L.cells.length - 1) {
        const ax0 = x0 + cell.x + cell.w + 4 * k;
        arrow(g, ax0, ax0 + L.arrow - 8 * k, iy, k, done ? color.hex : INK, (done ? 1 : 0.55) * a);
      }
    });
    if (!(c.active === 1 && c.seconds != null)) this.seconds.setVisible(false);
    // The rule, once taught: two tags of one colour, the first struck out.
    if (c.rule) {
      const ry = y0 + L.ruleY;
      g.lineStyle(1.5, INK, 0.35 * a).lineBetween(x0 + 14 * k, ry - 22 * k, x0 + L.w - 14 * k, ry - 22 * k);
      const tx = x0 + 24 * k;
      for (let j = 0; j < 2; j += 1) {
        const x = tx + j * 24 * k;
        g.fillStyle(PAPER_SHADE, a).fillRect(x, ry - 14 * k, 18 * k, 26 * k);
        g.fillStyle(color.hex, a).fillRect(x, ry - 14 * k, 18 * k, 5 * k);
        g.lineStyle(1.5, INK, 0.8 * a).strokeRect(x, ry - 14 * k, 18 * k, 26 * k);
      }
      g.lineStyle(3 * k, 0x6b2a22, a).lineBetween(tx - 3 * k, ry + 14 * k, tx + 21 * k, ry - 16 * k);
      this.rule.setPosition(tx + 52 * k + this.rule.width / 2, ry).setAlpha(a);
    }
    if (c.note) this.note.setPosition(x0 + L.w / 2, y0 + L.noteY).setAlpha(0.85 * a);
  }
}
