// Chapter 4 // THE PAINTED COUNTRY — the shared UI chrome.
//
// The country itself is Rosa's paper, but everything the game says ABOUT it
// speaks the same language as Chapters 1 and 2 (src/shell/uiKit.css): paper
// tags with an amber glint mark what can be acted on, archive cards are
// punched manilla with an oxblood stamp, title cards sit on a walnut band
// with a brass rule, Georgia is the voice and Space Mono the label.
//
// Everything here is screen space and clamps itself inside SAFE, so no prompt
// can be clipped by the canvas edge or sit on the room's title strip.
//
// Cyan (PAPER.cyan) is reserved for Mara's thread. Nothing in this file uses it.

import Phaser from 'phaser';
import { reducedMotionActive } from '../../shell/motion.js';
import { MIN_FONT_PX, MONO, RESTART_HOLD_SECONDS, SERIF, UI, VIEW_SIZE, clampToSafe } from './chapterConstants.js';

export {
  SERIF, MONO, HOLD_SECONDS, RESTART_HOLD_SECONDS, MIN_FONT_PX, UI, VIEW_SIZE, SAFE, clampToSafe,
} from './chapterConstants.js';

export const textScale = () => Phaser.Math.Clamp((globalThis.NIGHTFALL_SETTINGS?.textScale ?? 100) / 100, 0.8, 1.6);
export const px = (size) => `${Math.round(Math.max(MIN_FONT_PX, size) * textScale())}px`;

// LOW GRAPHICS (the pause menu's checkbox). The page also draws at a lower
// internal resolution (shared/phaserRenderScale.js); here the rooms drop
// their purely decorative full-screen layers (the paper grain, the dust).
export const lowGraphicsOn = (settings = globalThis.NIGHTFALL_SETTINGS) => settings?.lowGraphics === true;

/** Hide `objects` while LOW GRAPHICS is on, following the setting live. */
export function hideUnderLowGraphics(scene, objects) {
  const list = objects.filter(Boolean);
  const sync = (settings) => list.forEach((object) => object.setVisible?.(!lowGraphicsOn(settings)));
  sync();
  const onSettings = (event) => sync(event.detail ?? globalThis.NIGHTFALL_SETTINGS);
  globalThis.addEventListener?.('nightfall:settings', onSettings);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => globalThis.removeEventListener?.('nightfall:settings', onSettings));
}

const screenOf = (scene, worldX, worldY) => {
  const cam = scene.cameras.main;
  return { x: (worldX - cam.worldView.x) * cam.zoom, y: (worldY - cam.worldView.y) * cam.zoom };
};

// ---------------------------------------------------------------- paper tag
// A manilla luggage tag with a walnut string hole and an amber glint: the one
// visual language for "you can act on this". Anchored to a world point, drawn
// in screen space, always inside SAFE.
export class PaperTag {
  constructor(scene, { depth = 120 } = {}) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth).setVisible(false);
    this.shape = scene.add.graphics();
    this.label = scene.add.text(0, 0, '', {
      fontFamily: MONO, fontSize: px(12), color: UI.ink, fontStyle: 'bold', align: 'center', lineSpacing: 3,
    }).setOrigin(0.5, 0.5);
    this.glint = scene.add.graphics();
    this.container.add([this.shape, this.label, this.glint]);
    this.visible = false;
    this.text = '';
  }

  show(text, worldX, worldY, { progress = 0, screen = false, lift = 18 } = {}) {
    if (text !== this.text) {
      this.text = text;
      this.label.setFontSize(px(12)).setText(text);
    }
    const w = Math.ceil(this.label.width) + 34;
    const h = Math.ceil(this.label.height) + 14;
    const at = screen ? { x: worldX, y: worldY } : screenOf(this.scene, worldX, worldY);
    const pos = clampToSafe(at.x, at.y - lift, w, h);
    this.container.setPosition(pos.x, pos.y - h / 2).setVisible(true);
    this.visible = true;
    this.label.setPosition(6, 0);
    const g = this.shape;
    g.clear();
    const x0 = -w / 2;
    const y0 = -h / 2;
    // soft contact shadow
    g.fillStyle(0x000000, 0.18).fillRoundedRect(x0 + 2, y0 + 4, w, h, 3);
    // the tag: a notched left end, like the uiKit clip-path
    g.fillStyle(UI.paper, 1);
    g.beginPath();
    g.moveTo(x0 + 12, y0);
    g.lineTo(x0 + w, y0);
    g.lineTo(x0 + w, y0 + h);
    g.lineTo(x0 + 12, y0 + h);
    g.lineTo(x0, y0 + h / 2);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x6b5640, 0.55).strokePath();
    g.fillStyle(UI.walnut, 1).fillCircle(x0 + 11, 0, 3);
    if (progress > 0) {
      g.fillStyle(UI.amberInk, 0.95).fillRect(x0 + 16, y0 + h - 4, (w - 22) * Phaser.Math.Clamp(progress, 0, 1), 3);
    }
    this.drawGlint(w / 2 - 2, y0 + 2);
  }

  drawGlint(x, y) {
    const t = this.scene.time.now / 2200;
    const pulse = reducedMotionActive() ? 0.8 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
    const g = this.glint;
    g.clear();
    g.fillStyle(UI.amber, 0.22 * pulse).fillCircle(x, y, 10);
    g.fillStyle(UI.amber, 0.45 * pulse).fillCircle(x, y, 6);
    g.fillStyle(0xffe2a8, 0.95).fillCircle(x, y, 3.2);
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.container.setVisible(false);
  }

  destroy() {
    this.container.destroy();
  }
}

// A tiny tag nub with the amber glint, left on an interactable while it is
// waiting to be used, so the room shows what is live before it is in reach.
export function drawGlintMarker(g, time, x, y, { alpha = 1, nub = true } = {}) {
  const pulse = reducedMotionActive() ? 0.8 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((time / 2200) * Math.PI * 2 + x * 0.01));
  if (!nub) {
    // Just the glint, for small targets inside a drawing.
    g.fillStyle(UI.amber, 0.3 * pulse * alpha).fillCircle(x, y, 7);
    g.fillStyle(0xffe2a8, 0.95 * alpha).fillCircle(x, y, 2.6);
    return;
  }
  g.fillStyle(UI.paper, 0.95 * alpha);
  g.beginPath();
  g.moveTo(x - 9, y - 5);
  g.lineTo(x + 9, y - 5);
  g.lineTo(x + 9, y + 5);
  g.lineTo(x - 9, y + 5);
  g.lineTo(x - 14, y);
  g.closePath();
  g.fillPath();
  g.lineStyle(1, 0x6b5640, 0.5 * alpha).strokePath();
  g.fillStyle(UI.walnut, alpha).fillCircle(x - 8, y, 1.8);
  g.fillStyle(UI.amber, 0.3 * pulse * alpha).fillCircle(x + 8, y - 5, 7);
  g.fillStyle(0xffe2a8, 0.95 * alpha).fillCircle(x + 8, y - 5, 2.4);
}

// ---------------------------------------------------------- feedback slips
// Feedback sits next to the thing it is about: a short paper slip that rises
// off the object and fades. `tone` picks the ink.
const TONE = { info: UI.ink, warn: '#8a5a12', no: UI.oxblood, good: '#3f6b52', mara: UI.ink };

export function noteAt(scene, worldX, worldY, text, { tone = 'info', hold = 1500, screen = false, depth = 125 } = {}) {
  const at = screen ? { x: worldX, y: worldY } : screenOf(scene, worldX, worldY);
  const label = scene.add.text(0, 0, text, {
    fontFamily: tone === 'mara' ? SERIF : MONO,
    fontSize: px(tone === 'mara' ? 15 : 12),
    color: TONE[tone] ?? UI.ink,
    align: 'center',
    lineSpacing: 4,
    fontStyle: tone === 'mara' ? 'italic' : 'bold',
    backgroundColor: '#efe4ccf2',
    padding: { x: 10, y: 6 },
    wordWrap: { width: 440 },
  }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(depth);
  const pos = clampToSafe(at.x, at.y - 12, label.width, label.height);
  label.setPosition(pos.x, pos.y);
  const rise = reducedMotionActive() ? 0 : 10;
  scene.tweens.add({ targets: label, y: label.y - rise, alpha: 0, delay: hold, duration: 600, onComplete: () => label.destroy() });
  return label;
}

// ---------------------------------------------------------------- title card
// Chapter 1's act title (Space Mono amber kicker over a Georgia ivory line),
// laid on a walnut band because this chapter's ground is pale paper.
export function showTitleCard(scene, { kicker, main, hold = 2200, depth = 300, onDone = null } = {}) {
  const { w, h } = VIEW_SIZE;
  const box = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth).setAlpha(0);
  const band = scene.add.graphics();
  band.fillStyle(UI.walnut, 0.9).fillRect(0, h / 2 - 70, w, 140);
  band.fillStyle(UI.walnut, 0.5).fillRect(0, h / 2 - 84, w, 14).fillRect(0, h / 2 + 70, w, 14);
  band.lineStyle(2, UI.brass, 0.9).lineBetween(w / 2 - 200, h / 2 + 34, w / 2 + 200, h / 2 + 34);
  band.fillStyle(UI.amber, 1).fillCircle(w / 2, h / 2 + 34, 3.5);
  const k = scene.add.text(w / 2, h / 2 - 34, kicker, {
    fontFamily: MONO, fontSize: px(14), color: '#e0a24a', letterSpacing: 5,
  }).setOrigin(0.5);
  const m = scene.add.text(w / 2, h / 2 + 4, main, {
    fontFamily: SERIF, fontSize: px(34), color: UI.ivory, letterSpacing: 2,
  }).setOrigin(0.5);
  box.add([band, k, m]);
  scene.tweens.add({ targets: box, alpha: 1, duration: 600, ease: 'Sine.easeOut' });
  scene.time.delayedCall(600 + hold, () => {
    scene.tweens.add({
      targets: box,
      alpha: 0,
      duration: 700,
      ease: 'Sine.easeIn',
      onComplete: () => { box.destroy(); onDone?.(); },
    });
  });
  return box;
}

// -------------------------------------------------------------- archive card
// The Phaser twin of .nf-card: manilla, a real punch hole, an oxblood stamp,
// a Georgia title and two or three short lines.
export class ArchiveCard {
  constructor(scene, { depth = 320 } = {}) {
    this.scene = scene;
    const { w, h } = VIEW_SIZE;
    this.open = false;
    this.onClose = null;
    this.box = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth).setVisible(false);
    this.scrim = scene.add.rectangle(0, 0, w, h, 0x050403, 0.62).setOrigin(0);
    this.card = scene.add.container(w / 2, h / 2);
    this.paper = scene.add.graphics();
    this.stamp = scene.add.text(-200, -92, '', { fontFamily: MONO, fontSize: px(12), color: UI.oxblood, fontStyle: 'bold', letterSpacing: 2 });
    this.title = scene.add.text(-200, -64, '', { fontFamily: SERIF, fontSize: px(24), color: UI.ink, fontStyle: 'bold', wordWrap: { width: 400 } });
    this.lines = scene.add.text(-200, -22, '', { fontFamily: SERIF, fontSize: px(16), color: '#3a2a1c', lineSpacing: 6, wordWrap: { width: 400 } });
    this.close = scene.add.text(-200, 78, '', { fontFamily: MONO, fontSize: px(11), color: UI.inkSoft, letterSpacing: 2, lineSpacing: 4 });
    this.card.add([this.paper, this.stamp, this.title, this.lines, this.close]);
    this.box.add([this.scrim, this.card]);
  }

  show({ stamp = '', title = '', lines = [], closeHint = 'E · CLOSE' } = {}, onClose = null) {
    this.onClose = onClose;
    this.stamp.setText(stamp);
    this.title.setText(title);
    this.lines.setText(lines.join('\n'));
    this.close.setText(closeHint);
    const bodyH = 70 + this.title.height + this.lines.height + this.close.height;
    const cardH = Math.max(210, bodyH + 40);
    const cardW = 480;
    this.stamp.setY(-cardH / 2 + 30);
    this.title.setY(this.stamp.y + 26);
    this.lines.setY(this.title.y + this.title.height + 10);
    this.close.setY(cardH / 2 - 20 - this.close.height);
    const g = this.paper;
    g.clear();
    g.fillStyle(0x000000, 0.35).fillRect(-cardW / 2 + 6, -cardH / 2 + 10, cardW, cardH);
    g.fillStyle(UI.paper, 1).fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
    g.lineStyle(1, 0x2a1d14, 0.18).strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);
    // the ticket punch hole every archive card carries
    g.fillStyle(0x050403, 0.85).fillCircle(cardW / 2 - 34, -cardH / 2 + 30, 11);
    g.lineStyle(2, 0x2a1d14, 0.15).strokeCircle(cardW / 2 - 34, -cardH / 2 + 30, 13);
    this.card.setAngle(-0.6);
    this.box.setVisible(true).setAlpha(0);
    this.card.y = VIEW_SIZE.h / 2 + 10;
    this.scene.tweens.add({ targets: this.box, alpha: 1, duration: 260 });
    this.scene.tweens.add({ targets: this.card, y: VIEW_SIZE.h / 2, duration: 320, ease: 'Back.easeOut' });
    this.open = true;
    this.openedAt = this.scene.time.now;
  }

  // Returns true when it consumed the press.
  dismiss() {
    if (!this.open || this.scene.time.now - this.openedAt < 350) return this.open;
    this.open = false;
    this.scene.tweens.add({
      targets: this.box,
      alpha: 0,
      duration: 220,
      onComplete: () => this.box.setVisible(false),
    });
    const done = this.onClose;
    this.onClose = null;
    done?.();
    return true;
  }
}

// ------------------------------------------------------------ restart hold
// R used to restart instantly and wipe three plates of washing. Now it is a
// one-second hold (or holding the pad's BACK button) that raises a confirm
// card; ENTER / pad A restarts, anything else keeps painting.
export class RestartHold {
  constructor(scene, { onRestart }) {
    this.scene = scene;
    this.onRestart = onRestart;
    this.progress = 0;
    this.confirming = false;
    this.key = scene.input.keyboard.addKey('R', false);
    this.enter = scene.input.keyboard.addKey('ENTER', false);
    this.tag = new PaperTag(scene, { depth: 330 });
    this.card = new ArchiveCard(scene, { depth: 340 });
    this.onKey = (event) => {
      if (!this.confirming) return;
      if (event.code === 'KeyR' || event.repeat) return;
      if (event.code === 'Enter') this.confirm();
      else this.cancel();
    };
    scene.input.keyboard.on('keydown', this.onKey);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.input.keyboard?.off('keydown', this.onKey));
    this.padPrev = { a: false, b: false };
  }

  get blocking() {
    return this.confirming;
  }

  update(dt, pad = null) {
    if (this.confirming) {
      this.lastTick = null;
      const a = Boolean(pad?.A);
      const b = Boolean(pad?.B);
      if (a && !this.padPrev.a) this.confirm();
      else if (b && !this.padPrev.b) this.cancel();
      this.padPrev = { a, b };
      return;
    }
    // Wall-clock time, not the frame's clamped dt: at 1 fps a one-second hold
    // took twenty seconds and the card never came (alpha A3-1).
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const realDt = this.lastTick == null ? dt : Math.min(0.5, Math.max(0, (now - this.lastTick) / 1000));
    this.lastTick = now;
    const held = this.key.isDown || Boolean(pad?.buttons?.[8]?.pressed);
    this.progress = held ? this.progress + Math.max(dt, realDt) : 0;
    if (this.progress > 0.12) {
      this.tag.show('HOLD R · RESTART ROOM', VIEW_SIZE.w - 120, 86, { progress: this.progress / RESTART_HOLD_SECONDS, screen: true });
    } else {
      this.tag.hide();
    }
    if (this.progress >= RESTART_HOLD_SECONDS) {
      this.progress = 0;
      this.tag.hide();
      this.confirming = true;
      this.padPrev = { a: Boolean(pad?.A), b: Boolean(pad?.B) };
      this.card.show({
        stamp: 'RESTART THIS ROOM?',
        title: 'Start the room over',
        lines: ['Everything painted and washed in this room is cleared.', 'Earlier rooms are kept.'],
        closeHint: 'ENTER / A · RESTART\nANY OTHER KEY / B · KEEP GOING',
      });
    }
  }

  confirm() {
    if (!this.confirming) return;
    this.confirming = false;
    this.card.open = false;
    this.onRestart?.();
  }

  cancel() {
    if (!this.confirming) return;
    this.confirming = false;
    this.card.openedAt = -Infinity;
    this.card.dismiss();
  }
}
