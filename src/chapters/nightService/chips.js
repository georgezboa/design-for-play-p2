// Chapter 1 // NIGHT SERVICE — small notice chips (round 6).
//
// One visual language for the engine's short words on screen, matching the
// key strip on the sill: a walnut pill with a brass hairline, ivory Space
// Mono capitals, and key caps in ivory boxes. Used for
//   · the verb a hotspot's click does (RING, PUNCH, TAKE, READ) on hover / focus,
//   · the reason a click did nothing (NOT YET, DRAG TO MOVE, …),
//   · how to step back out of the first close-up (⤢ · RIGHT-CLICK · ESC),
//   · the one-time NEED A HINT? H tag.
// Chips live on the scene's top layer in screen space (1920×1080) and take
// no input themselves: the scene asks `contains(x, y)` (NEED A HINT? is clickable).

const MONO = '"Space Mono", ui-monospace, monospace';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Parse chip text into segments: `[KEY]` is a key cap, the rest plain words.
 * e.g. 'NEED A HINT? [H]' → [{ text: 'NEED A HINT?' }, { text: 'H', cap: true }]
 */
export function chipSegments(text) {
  const out = [];
  String(text ?? '').split(/(\[[^\]]+\])/).forEach((part) => {
    if (!part) return;
    const cap = /^\[[^\]]+\]$/.test(part);
    const value = cap ? part.slice(1, -1) : part.trim();
    if (value) out.push({ text: value, cap });
  });
  return out;
}

export class NoticeChip {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Container} layer  where the chip is drawn
   * @param {object} [o]
   * @param {number} [o.size]     font size in px at text scale 1
   * @param {object} [o.depthAbove] draw just above this child of `layer`
   */
  constructor(scene, layer, { size = 17, depthAbove = null, tone = 'walnut' } = {}) {
    this.scene = scene;
    this.size = size;
    this.tone = tone;
    this.root = scene.add.container(0, 0).setAlpha(0).setVisible(false);
    if (depthAbove && layer.getIndex(depthAbove) >= 0) layer.addAt(this.root, layer.getIndex(depthAbove) + 1);
    else layer.add(this.root);
    this.text = '';
    this.scale = 1;
    this.alpha = 0;
    this.want = 0;
    this.until = 0;
    this.w = 0;
    this.h = 0;
    this.pointer = null;
  }

  /** (Re)build the chip for `text` at text scale `s`. */
  build(text, s = 1, { pointer = null, accent = false } = {}) {
    const key = `${text}|${s}|${pointer}|${accent}`;
    if (key === this.key) return;
    this.key = key;
    this.text = text;
    this.pointer = pointer;
    const scene = this.scene;
    this.root.removeAll(true);
    const k = clamp(s, 0.8, 1.5);
    const fs = Math.round(this.size * k);
    const padX = 14 * k;
    const gap = 8 * k;
    const capPad = 8 * k;
    const h = Math.round(fs * 1.9);
    const parts = chipSegments(text).map((seg) => {
      const t = scene.add.text(0, 0, seg.text, {
        fontFamily: MONO, fontSize: `${seg.cap ? Math.round(fs * 0.92) : fs}px`, fontStyle: 'bold',
        color: seg.cap ? '#1c130d' : this.tone === 'paper' ? '#2a1d14' : accent ? '#ffd9a0' : '#eadfc6', letterSpacing: seg.cap ? 1 : 2,
      }).setOrigin(0, 0.5);
      const w = seg.cap ? Math.max(t.width + capPad * 2, h * 0.78) : t.width;
      return { seg, t, w };
    });
    const inner = parts.reduce((sum, p) => sum + p.w, 0) + gap * Math.max(0, parts.length - 1);
    const w = Math.round(inner + padX * 2);
    const bg = scene.add.graphics();
    const fill = this.tone === 'paper' ? 0xeadfc6 : 0x0e0906;
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, h / 2);
    bg.fillStyle(fill, 0.93);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(1.6, accent ? 0xe0a24a : 0xb08a4a, 0.95);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    // a small pointer (towards the thing the chip talks about)
    if (pointer) {
      const d = 9 * k;
      bg.fillStyle(fill, 0.93);
      bg.lineStyle(1.6, accent ? 0xe0a24a : 0xb08a4a, 0.95);
      bg.beginPath();
      if (pointer === 'right') { bg.moveTo(w / 2 - 2, -d); bg.lineTo(w / 2 + d, 0); bg.lineTo(w / 2 - 2, d); }
      else if (pointer === 'left') { bg.moveTo(-w / 2 + 2, -d); bg.lineTo(-w / 2 - d, 0); bg.lineTo(-w / 2 + 2, d); }
      else if (pointer === 'up') { bg.moveTo(-d, -h / 2 + 2); bg.lineTo(0, -h / 2 - d); bg.lineTo(d, -h / 2 + 2); }
      else { bg.moveTo(-d, h / 2 - 2); bg.lineTo(0, h / 2 + d); bg.lineTo(d, h / 2 - 2); }
      bg.closePath();
      bg.fillPath();
      bg.strokePath();
    }
    this.root.add(bg);
    let x = -inner / 2;
    parts.forEach(({ seg, t, w: pw }) => {
      if (seg.cap) {
        const cap = scene.add.graphics();
        const ch = h * 0.66;
        cap.fillStyle(0xeadfc6, 1);
        cap.fillRoundedRect(x, -ch / 2, pw, ch, 5 * k);
        cap.lineStyle(1.5, 0x0b0705, 0.9);
        cap.strokeRoundedRect(x, -ch / 2, pw, ch, 5 * k);
        this.root.add(cap);
        t.setPosition(x + (pw - t.width) / 2, 1);
      } else t.setPosition(x, 1);
      this.root.add(t);
      x += pw + gap;
    });
    this.w = w;
    this.h = h;
    this.bg = bg;
  }

  /** Is a screen point on the (visible) chip? The scene routes clicks itself. */
  contains(x, y, pad = 8) {
    if (this.alpha < 0.3 || !this.want) return false;
    return Math.abs(x - this.root.x) <= this.w / 2 + pad && Math.abs(y - this.root.y) <= this.h / 2 + pad;
  }

  /** Show `text` at (x, y) (the chip's centre) for `ms` (0 = until hidden). */
  show(text, x, y, { ms = 0, s = 1, pointer = null, accent = false, now = 0 } = {}) {
    this.build(text, s, { pointer, accent });
    this.place(x, y);
    this.want = 1;
    this.until = ms ? now + ms : 0;
    this.root.setVisible(true);
    return this;
  }

  /** Keep the chip inside the screen. */
  place(x, y, view = { w: 1920, h: 1080 }) {
    const m = 10;
    this.root.setPosition(clamp(x, this.w / 2 + m, view.w - this.w / 2 - m), clamp(y, this.h / 2 + m, view.h - this.h / 2 - m));
  }

  hide() { this.want = 0; this.until = 0; }

  get shown() { return this.want > 0 || this.alpha > 0.01; }

  update(dt, now) {
    if (this.until && now >= this.until) this.hide();
    const target = this.want;
    this.alpha = clamp(this.alpha + (target ? dt / 130 : -dt / 220), 0, 1);
    this.root.setAlpha(this.alpha);
    if (!this.alpha && !target) this.root.setVisible(false);
  }

  /** A little press: the chip dips (the click went here). */
  pulse() {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1);
    this.scene.tweens.add({ targets: this.root, scale: 1.12, duration: 90, yoyo: true, ease: 'Sine.easeOut' });
  }
}
