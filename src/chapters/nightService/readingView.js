// Chapter 1 // NIGHT SERVICE — the reading view (round 6 · item 14).
//
// A click on a readable (a ticket stub, a reservation slip, a museum label:
// panelModel `readables`) lifts that paper up to the eye: it flies out of
// its window into a large, plain copy in the shape of the thing, with its
// words in big type that follows the TEXT SIZE setting. The paper itself
// stays in the window (outlined while it is being read). Click, E, Enter or
// Esc puts it back. Through the lens the 1978 words show, with a badge.
//
// The model holds it open like an archive card (`s.card`, `reading: true`),
// so the script waits and the hints hold still while the player reads.

import { READING_INK, paintReadingPaper, readingInsets } from './art/readingArt.js';
import { NoticeChip } from './chips.js';

const SERIF = 'Georgia, "Times New Roman", "DejaVu Serif", serif';
const MONO = '"Space Mono", ui-monospace, monospace';
const PAD = 44;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Paper width by shape (px at 1920×1080, text scale 1). */
const WIDTH = Object.freeze({ ticket: 880, slip: 1000, tag: 1080, plate: 900, paper: 920, torn: 760 });
const MIN_H = Object.freeze({ ticket: 330, slip: 400, tag: 380, plate: 150, paper: 360, torn: 260 });
/** Type sizes (px at text scale 1): [serif, mono]. */
const SIZES = Object.freeze({ xl: [80, 66], l: [56, 46], m: [38, 31], s: [28, 24] });

/** Font size of a reading line at text scale `s` (exported for tests). */
export function readingFontPx(line = {}, s = 1) {
  const [serif, mono] = SIZES[line.size ?? 'm'] ?? SIZES.m;
  return Math.round((line.font === 'mono' ? mono : serif) * clamp(s, 0.8, 1.6));
}

export class ReadingView {
  constructor(scene, layer, { view, env }) {
    this.scene = scene;
    this.layer = layer;
    this.view = view;
    this.env = env;
    this.card = null;
    this.from = null;
    this.serial = 0;
    this.root = scene.add.container(0, 0).setVisible(false);
    layer.add(this.root);
    this.scrim = scene.add.rectangle(0, 0, view.w, view.h, 0x050304, 0.64).setOrigin(0, 0).setAlpha(0);
    this.source = scene.add.graphics();
    this.sheet = scene.add.container(view.w / 2, view.h / 2);
    this.root.add([this.scrim, this.source, this.sheet]);
    this.hint = new NoticeChip(scene, this.root, { size: 17 });
    this.badge = new NoticeChip(scene, this.root, { size: 18 });
    this.clock = 0;
  }

  get isOpen() { return Boolean(this.card); }

  /** Lift `card` (a readable's words, panelModel readingCard) out of the screen rect `from`. */
  open(card, { from = null, s = 1, reduce = false } = {}) {
    this.card = card;
    this.from = from;
    this.s = s;
    this.build();
    const scene = this.scene;
    scene.tweens.killTweensOf([this.sheet, this.scrim]);
    this.root.setVisible(true);
    const end = this.rest();
    const start = from
      ? { x: from.x + from.w / 2, y: from.y + from.h / 2, scale: clamp(Math.max(from.w / this.sheetW, from.h / this.sheetH), 0.06, 0.6) }
      : { x: end.x, y: end.y + 30, scale: end.scale * 0.92 };
    this.sheet.setPosition(start.x, start.y).setScale(start.scale).setAlpha(0.15).setRotation(0.02);
    this.scrim.setAlpha(0);
    scene.tweens.add({ targets: this.scrim, alpha: 1, duration: 260, ease: 'Sine.easeOut' });
    scene.tweens.add({
      targets: this.sheet, x: end.x, y: end.y, scale: end.scale, alpha: 1, rotation: -0.008,
      duration: reduce ? 200 : 380, ease: reduce ? 'Sine.easeOut' : 'Back.easeOut', easeParams: [1.15],
    });
    this.placeChips(end, 700);
  }

  /** Where the sheet rests: centred, scaled to fit the screen. */
  rest() {
    const maxW = this.view.w - 160;
    const maxH = this.view.h - 230;
    const scale = Math.min(1, maxW / this.sheetW, maxH / this.sheetH);
    return { x: this.view.w / 2, y: this.view.h / 2 - 6, scale };
  }

  placeChips(end, delay = 0) {
    const scene = this.scene;
    const half = (this.sheetH * end.scale) / 2;
    const s = this.s;
    scene.time.delayedCall(delay, () => {
      if (!this.card) return;
      this.hint.show('CLICK · [E] · [ESC]  TO PUT IT BACK', end.x, Math.min(this.view.h - 40, end.y + half + 52), { s });
    });
    if (this.card.era === 'past') this.badge.show('1978 · THROUGH THE PUNCH HOLE', end.x, Math.max(36, end.y - half - 50), { s, accent: true });
    else if (this.card.kicker) this.badge.show(this.card.kicker, end.x, Math.max(36, end.y - half - 50), { s });
    else this.badge.hide();
  }

  /** Put it back where it came from. */
  close({ reduce = false } = {}) {
    if (!this.card) return;
    const scene = this.scene;
    const from = this.from;
    this.card = null;
    this.hint.hide();
    this.badge.hide();
    scene.tweens.killTweensOf([this.sheet, this.scrim]);
    const to = from ? { x: from.x + from.w / 2, y: from.y + from.h / 2, scale: clamp(Math.max(from.w / this.sheetW, from.h / this.sheetH), 0.06, 0.6) } : { x: this.sheet.x, y: this.sheet.y + 30, scale: this.sheet.scale };
    scene.tweens.add({ targets: this.scrim, alpha: 0, duration: 220, ease: 'Sine.easeIn' });
    scene.tweens.add({
      targets: this.sheet, x: to.x, y: to.y, scale: to.scale, alpha: 0, rotation: 0.02,
      duration: reduce ? 160 : 260, ease: 'Sine.easeIn',
      onComplete: () => { if (!this.card) { this.root.setVisible(false); this.source.clear(); this.dropTexture(); } },
    });
  }

  /** TEXT SIZE changed while reading: lay the words out again. */
  relayout(s) {
    if (!this.card) return;
    this.s = s;
    this.build();
    const end = this.rest();
    this.sheet.setPosition(end.x, end.y).setScale(end.scale).setAlpha(1);
    this.placeChips(end, 0);
  }

  dropTexture() {
    if (this.texKey && this.scene.textures.exists(this.texKey)) this.scene.textures.remove(this.texKey);
    this.texKey = null;
  }

  /** Lay out the words, size the paper to them, paint it. */
  build() {
    const scene = this.scene;
    const card = this.card;
    const s = clamp(this.s ?? 1, 0.8, 1.6);
    const shape = card.shape ?? 'paper';
    this.sheet.removeAll(true);
    const W = Math.round(clamp((WIDTH[shape] ?? WIDTH.paper) * (0.9 + 0.1 * s), 600, 1640));
    const [il, it, ir, ib] = readingInsets(shape, s);
    // a seal or a stamp keeps the right of the paper for itself
    const reserve = card.seal ? W * 0.3 : 0;
    const textW = W - il - ir - reserve;
    const objects = [];
    let y = it;
    if (card.header) {
      const band = Boolean(card.header.band);
      const size = Math.round(26 * s);
      const color = band ? '#eadfc6' : READING_INK.ink;
      const bandH = Math.round(64 * s);
      const hy = band ? bandH / 2 : y + size * 0.6;
      if (card.header.left) objects.push(scene.add.text(il, hy, card.header.left, { fontFamily: MONO, fontSize: `${size}px`, fontStyle: 'bold', color, letterSpacing: 2 }).setOrigin(0, 0.5));
      if (card.header.right) objects.push(scene.add.text(W - ir, hy, card.header.right, { fontFamily: MONO, fontSize: `${size}px`, fontStyle: 'bold', color: band ? '#ffcf7a' : READING_INK.red, letterSpacing: 2 }).setOrigin(1, 0.5));
      y = band ? bandH + it * 0.9 : y + size * 1.2 + 26 * s;
      if (!band) {
        const rule = scene.add.graphics();
        rule.lineStyle(2, 0x2a1d14, 0.45);
        rule.lineBetween(il, y - 14 * s, W - ir, y - 14 * s);
        objects.push(rule);
      }
    }
    (card.lines ?? []).forEach((line, i) => {
      const spec = typeof line === 'string' ? { text: line } : line;
      const px = readingFontPx(spec, s);
      const t = scene.add.text(il, y, spec.text ?? '', {
        fontFamily: spec.font === 'mono' ? MONO : SERIF,
        fontSize: `${px}px`,
        fontStyle: `${spec.italic || spec.font === 'hand' ? 'italic ' : ''}${spec.bold === false ? 'normal' : 'bold'}`,
        color: READING_INK[spec.color ?? 'ink'] ?? spec.color ?? READING_INK.ink,
        letterSpacing: spec.font === 'mono' ? 2 : 0,
        wordWrap: { width: textW, useAdvancedWrap: true },
        lineSpacing: Math.round(px * 0.12),
      }).setOrigin(0, 0);
      objects.push(t);
      y += t.height + (i < card.lines.length - 1 ? px * 0.32 : 0);
    });
    // a rubber stamp takes the next row (unless it names where it goes)
    let stampAt = null;
    if (card.stamp) {
      const spec = typeof card.stamp === 'string' ? { text: card.stamp } : card.stamp;
      const sh = Math.round((spec.size ?? 46) * s * 1.6);
      stampAt = { x: spec.x ?? null, y: spec.y ?? null, row: y + 18 * s + sh / 2 };
      y += 18 * s + sh;
    }
    const H = Math.max(Math.round((MIN_H[shape] ?? MIN_H.paper) * (0.85 + 0.15 * s)), Math.round(y + ib));
    // a plate's words sit centred on the brass
    if (shape === 'plate') {
      objects.forEach((obj) => { if (obj.type === 'Text') { obj.setOrigin(0.5, 0.5).setPosition(W / 2, H / 2); } });
    }
    this.sheetW = W;
    this.sheetH = H;
    // the paper
    this.dropTexture();
    this.serial += 1;
    const key = `nsv-reading-${this.serial}`;
    const tex = scene.textures.createCanvas(key, W + PAD * 2, H + PAD * 2);
    paintReadingPaper(tex.getContext(), W, H, { ...card, shape }, { pad: PAD, paper: this.env?.paper ?? null, s });
    tex.refresh();
    this.texKey = key;
    const paperImage = scene.add.image(-W / 2 - PAD, -H / 2 - PAD, key).setOrigin(0, 0);
    this.sheet.add(paperImage);
    objects.forEach((obj) => { obj.x -= W / 2; obj.y -= H / 2; this.sheet.add(obj); });
    if (card.stamp) this.sheet.add(this.makeStamp(card.stamp, W, H, s, stampAt, il));
  }

  /** A rubber stamp (DUPLICATE, UNCLAIMED) across the lower right. */
  makeStamp(stamp, W, H, s, at = null, left = 60) {
    const scene = this.scene;
    const spec = typeof stamp === 'string' ? { text: stamp } : stamp;
    const size = Math.round((spec.size ?? 46) * s);
    const t = scene.add.text(0, 0, spec.text, { fontFamily: MONO, fontSize: `${size}px`, fontStyle: 'bold', color: READING_INK.red, letterSpacing: 4 }).setOrigin(0.5);
    // by default in its own row, set in a little from the text's left edge
    const cx = spec.x !== undefined ? W * spec.x : left + 26 * s + t.width / 2;
    const cy = spec.y !== undefined ? H * spec.y : at?.row ?? H * 0.76;
    const holder = scene.add.container(cx - W / 2, cy - H / 2);
    const box = scene.add.graphics();
    box.lineStyle(Math.max(3, 4 * s), 0x8a2a1e, 0.9);
    box.strokeRect(-t.width / 2 - 18 * s, -t.height / 2 - 8 * s, t.width + 36 * s, t.height + 16 * s);
    holder.add([box, t]);
    holder.setRotation(spec.angle ?? -0.12).setAlpha(0.88);
    return holder;
  }

  update(dt) {
    this.clock += dt;
    this.hint.update(dt, this.clock);
    this.badge.update(dt, this.clock);
    const g = this.source;
    g.clear();
    if (!this.card || !this.from) return;
    // the paper in its window, outlined while it is being read
    const k = 0.5 + Math.sin(this.clock / 300) * 0.5;
    const { x, y, w, h } = this.from;
    g.lineStyle(8, 0xffb050, 0.18 + k * 0.12);
    g.strokeRoundedRect(x - 8, y - 8, w + 16, h + 16, 10);
    g.lineStyle(2.5, 0xffd9a0, 0.65 + k * 0.3);
    g.strokeRoundedRect(x - 5, y - 5, w + 10, h + 10, 8);
  }
}
