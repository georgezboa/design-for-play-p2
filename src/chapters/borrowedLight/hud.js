// Chapter 2 · BORROWED LIGHT — screen-space HUD.
//
// The bell meter sits at the top centre: a brass bell inside a ring that
// fills over the 4 s between bells (the same bell as Chapter 1), with three
// paper tags beneath it showing each line's claim. The departure countdown
// adds an outer rose ring of pips (twelve bells in v2). Where lines ring on
// bells I / II, a numeral beside the meter shows which bell is next; a small
// lantern on the left shows a light Butch is carrying. Also: world prompts,
// the caption bar (typewriter), archive / letter cards, title cards and
// toasts. Text follows the TEXT SIZE setting.

import Phaser from 'phaser';
import { DEPTH, FONTS, INK, INK_HEX, LINE_COLORS } from './art/palette.js';

const LINES_ORDER = ['amber', 'teal', 'rose'];

const CX = 960;
const TITLE_Y = 300;
const CY = 82;
const R = 40;

const textScale = () => (globalThis.NIGHTFALL_SETTINGS?.textScale ?? 100) / 100;

export class BorrowedLightHud {
  constructor(scene) {
    this.scene = scene;
    this.texts = [];
    this.bellSwing = 0;
    this.bellFlash = 0;
    this.ringFlash = 0;
    this.departureFlash = 0;

    this.meter = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    this.bell = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud + 1).setPosition(CX, CY - 22);
    this.drawBellGlyph();
    this.meterLabel = this.text(CX, CY + R + 58, '', 13, INK, { alpha: 0.7, letter: 3 });
    this.nextLabel = this.text(CX, CY + R + 58, '', 13, '#e6aab0', { alpha: 0.9, letter: 3 });
    // v2 · two-phase bells: which bell comes next (I or II), beside the meter.
    this.parityLabel = this.text(CX + R + 58, CY - 2, '', 30, '#e6dcc2', { font: FONTS.display, alpha: 0, letter: 4 });
    this.paritySub = this.text(CX + R + 58, CY + 24, 'NEXT', 11, '#b08a4a', { alpha: 0, letter: 3 });
    // v2 · the light Butch carries, left of the meter.
    this.carryLabel = this.text(CX - R - 70, CY + 24, 'LIGHT', 11, '#f6e2b4', { alpha: 0, letter: 3 });

    this.listenDim = scene.add.image(0, 0, 'bl-px').setOrigin(0).setScrollFactor(0).setDisplaySize(1920, 1080).setTint(0x0a1a20).setAlpha(0).setDepth(DEPTH.ghost - 1);
    this.listenLabel = this.text(CX, CY + R + 80, 'LISTENING · NEXT BELL', 14, '#9fd9cf', { alpha: 0, letter: 4 });

    // Title card: high in the sky band, on its own soft dark backing, so it
    // never sits on Butch, a node or a sign.
    this.titleBand = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.dialog - 1).setAlpha(0);
    this.titleBand.fillGradientStyle(0x03070b, 0x03070b, 0x03070b, 0x03070b, 0, 0, 0.66, 0.66).fillRect(0, TITLE_Y - 110, 1920, 44);
    this.titleBand.fillStyle(0x03070b, 0.66).fillRect(0, TITLE_Y - 66, 1920, 136);
    this.titleBand.fillGradientStyle(0x03070b, 0x03070b, 0x03070b, 0x03070b, 0.66, 0.66, 0, 0).fillRect(0, TITLE_Y + 70, 1920, 44);
    this.titleBig = this.text(CX, TITLE_Y - 14, '', 76, '#eadfc6', { font: FONTS.display, alpha: 0, letter: 10 });
    this.titleSmall = this.text(CX, TITLE_Y + 50, '', 18, '#e0a24a', { alpha: 0, letter: 8 });
    this.titleRule = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.dialog).setAlpha(0);
    [this.titleBig, this.titleSmall].forEach((t) => t.setDepth(DEPTH.dialog + 0.5));

    // Toast.
    this.toastText = this.text(CX, 980, '', 18, INK, { alpha: 0, letter: 4 });
    // Alpha r3 (g04): a toast over the blackout read dark on dark. It sits
    // on its own soft walnut-black band, like the title card.
    this.toastBand = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud + 1).setAlpha(0);

    // Caption bar.
    this.caption = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.dialog).setVisible(false);
    const bar = scene.add.graphics();
    bar.fillStyle(0x0b0907, 0.92).fillRect(360, 862, 1200, 150);
    bar.lineStyle(2, 0xb08a4a, 0.9).strokeRect(360, 862, 1200, 150);
    bar.lineStyle(1, INK_HEX, 0.35).strokeRect(368, 870, 1184, 134);
    this.captionSpeaker = scene.add.text(396, 884, '', { fontFamily: FONTS.mono, fontSize: '17px', color: '#e0a24a', fontStyle: 'bold' }).setLetterSpacing(4);
    this.captionBody = scene.add.text(396, 918, '', { fontFamily: FONTS.mono, fontSize: '24px', color: '#eadfc6', wordWrap: { width: 1120 }, lineSpacing: 6 });
    this.captionHint = scene.add.text(1528, 990, 'E ›', { fontFamily: FONTS.mono, fontSize: '15px', color: '#b08a4a' }).setOrigin(1, 1);
    this.caption.add([bar, this.captionSpeaker, this.captionBody, this.captionHint]);
    this.dialog = null;

    // Card (archive card / letter).
    this.card = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.dialog + 1).setVisible(false);
    this.cardShade = scene.add.image(0, 0, 'bl-px').setOrigin(0).setDisplaySize(1920, 1080).setTint(0x020406).setAlpha(0.72);
    this.cardPaper = scene.add.graphics();
    this.cardHeading = scene.add.text(CX, 300, '', { fontFamily: FONTS.mono, fontSize: '18px', color: '#6b2a22', fontStyle: 'bold' }).setOrigin(0.5, 0).setLetterSpacing(6);
    this.cardSub = scene.add.text(CX, 332, '', { fontFamily: FONTS.mono, fontSize: '14px', color: '#6d5a40' }).setOrigin(0.5, 0).setLetterSpacing(4);
    this.cardBody = scene.add.text(CX, 390, '', { fontFamily: FONTS.serif, fontSize: '28px', color: '#2a1d14', align: 'left', wordWrap: { width: 820 }, lineSpacing: 14 }).setOrigin(0.5, 0);
    this.cardHint = scene.add.text(CX, 800, 'E · CLOSE', { fontFamily: FONTS.mono, fontSize: '14px', color: '#6d5a40' }).setOrigin(0.5, 0).setLetterSpacing(4);
    this.card.add([this.cardShade, this.cardPaper, this.cardHeading, this.cardSub, this.cardBody, this.cardHint]);
    this.cardState = null;

    // Stone indicator (top right) after pickup.
    this.stoneText = this.text(1850, 60, '', 13, '#9fd9cf', { alpha: 0, letter: 3, originX: 1 });

    // Fade.
    this.fade = scene.add.image(0, 0, 'bl-px').setOrigin(0).setScrollFactor(0).setDisplaySize(1920, 1080).setTint(0x000000).setAlpha(0).setDepth(DEPTH.fade);

    this.applyTextScale();
  }

  text(x, y, value, size, color, { font = FONTS.mono, alpha = 1, letter = 0, originX = 0.5 } = {}) {
    const t = this.scene.add.text(x, y, value, { fontFamily: font, fontSize: `${size}px`, color })
      .setOrigin(originX, 0.5).setScrollFactor(0).setDepth(DEPTH.hud + 2).setAlpha(alpha).setLetterSpacing(letter);
    t.baseSize = size;
    this.texts.push(t);
    return t;
  }

  applyTextScale() {
    const k = textScale();
    this.texts.forEach((t) => t.setFontSize(`${Math.round(t.baseSize * k)}px`));
    this.captionSpeaker.setFontSize(`${Math.round(17 * k)}px`);
    this.captionBody.setFontSize(`${Math.round(24 * k)}px`);
    this.cardBody.setFontSize(`${Math.round(28 * k)}px`);
    this.cardHeading.setFontSize(`${Math.round(18 * k)}px`);
    this.cardSub.setFontSize(`${Math.round(14 * k)}px`);
  }

  drawBellGlyph() {
    const g = this.bell;
    g.clear();
    // Hanger.
    g.fillStyle(0x6d5227, 1).fillRect(-3, -4, 6, 8);
    g.lineStyle(2, 0x6d5227, 1).strokeCircle(0, -6, 4);
    // Bell body (pivot at the hanger).
    const pts = [];
    for (let i = 0; i <= 16; i += 1) {
      const t = i / 16;
      const y = 4 + t * 34;
      const w = 7 + Math.pow(t, 1.8) * 14 + (t > 0.85 ? (t - 0.85) * 30 : 0);
      pts.push({ x: -w, y });
    }
    const body = [...pts, ...pts.slice().reverse().map((p) => ({ x: -p.x, y: p.y }))];
    g.fillStyle(0xb08a4a, 1).fillPoints(body, true);
    g.fillStyle(0xd9b774, 0.8).fillPoints(pts.slice(2, 13).map((p) => ({ x: p.x * 0.55 + 3, y: p.y })).concat([{ x: 1, y: 30 }, { x: 1, y: 8 }]), true);
    g.fillStyle(0x6d5227, 1).fillRect(-23, 37, 46, 4);
    g.fillStyle(0x3a2a14, 1).fillCircle(0, 44, 4.5);
    g.lineStyle(1.4, INK_HEX, 0.8).strokePoints(body, true);
  }

  // ---- bell meter --------------------------------------------------------
  updateMeter({ phase, msToBell, lines, countdown, departure, t, dt, nextParity = null, phases = {}, quick = false, carried = false }) {
    const g = this.meter;
    g.clear();
    this.bellSwing *= Math.pow(0.02, dt / 1000);
    this.bellFlash = Math.max(0, this.bellFlash - dt / 700);
    this.ringFlash = Math.max(0, this.ringFlash - dt / 900);
    this.departureFlash = Math.max(0, this.departureFlash - dt / 1400);
    this.bell.setRotation(Math.sin(t * 16) * this.bellSwing * 0.45);

    // Backing disc.
    g.fillStyle(0x0b0907, 0.78).fillCircle(CX, CY, R + 14);
    g.lineStyle(2, 0xb08a4a, 0.85).strokeCircle(CX, CY, R + 14);
    // Track and progress (rose while the chase quickens the bell).
    g.lineStyle(6, 0x2a1d14, 1).strokeCircle(CX, CY, R);
    const start = -Math.PI / 2;
    g.lineStyle(6, quick ? 0xc98088 : 0xe0a24a, 0.95);
    g.beginPath();
    g.arc(CX, CY, R, start, start + Math.PI * 2 * Math.max(0.001, phase), false);
    g.strokePath();
    // Four second ticks.
    for (let i = 0; i < 4; i += 1) {
      const a = start + (i * Math.PI) / 2;
      g.lineStyle(2, INK_HEX, 0.6).lineBetween(CX + Math.cos(a) * (R - 6), CY + Math.sin(a) * (R - 6), CX + Math.cos(a) * (R + 6), CY + Math.sin(a) * (R + 6));
    }
    // The last half second before a bell glows.
    if (msToBell < 500) g.lineStyle(10, 0xf2c27a, 0.22 * (1 - msToBell / 500)).strokeCircle(CX, CY, R);
    if (this.ringFlash > 0) g.lineStyle(3, 0xf2c27a, this.ringFlash).strokeCircle(CX, CY, R + 14 + (1 - this.ringFlash) * 40);

    // Departure ring: one rose pip per departure bell.
    if (countdown) {
      const rr = R + 26;
      g.lineStyle(3, 0x503035, 1).strokeCircle(CX, CY, rr);
      for (let i = 0; i < countdown.total; i += 1) {
        const a = start + (i / countdown.total) * Math.PI * 2;
        const lit = i < countdown.remaining;
        g.fillStyle(lit ? 0xc98088 : 0x2a1a1d, 1).fillCircle(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, lit ? 6 : 4);
      }
      if (this.departureFlash > 0) g.lineStyle(4, 0xe6aab0, this.departureFlash).strokeCircle(CX, CY, rr + (1 - this.departureFlash) * 50);
    }

    // Line tags under the meter: empty, punched (queued), lit (powering).
    LINES_ORDER.forEach((line, i) => {
      const color = LINE_COLORS[line];
      const x = CX - 54 + i * 54;
      const y = CY + R + 22;
      const state = lines[line];
      const swing = Math.sin(t * 1.5 + i) * 0.05;
      g.fillStyle(0xe6dcc2, state === 'idle' ? 0.35 : 0.95).fillRect(x - 12, y - 4 + swing * 20, 24, 30);
      g.fillStyle(color.hex, state === 'idle' ? 0.35 : 1).fillRect(x - 12, y - 4 + swing * 20, 24, 6);
      if (state === 'queued') {
        g.fillStyle(0x05070a, 1).fillCircle(x, y + 13 + swing * 20, 4.5);
        g.fillStyle(color.glow, 0.5 + 0.4 * Math.sin(t * 6)).fillCircle(x, y + 13 + swing * 20, 2.5);
      } else if (state === 'powering') {
        g.fillStyle(color.glow, 0.25).fillCircle(x, y + 12, 18);
        g.fillStyle(color.hex, 1).fillCircle(x, y + 13 + swing * 20, 4.5);
      } else if (state === 'held') {
        g.fillStyle(color.hex, 1).fillRect(x - 8, y + 10 + swing * 20, 16, 5);
      }
      // Phase stamp: I or II, the bell this line rings on.
      if (phases[line]) {
        const bars = phases[line] === 'even' ? [-4, 4] : [0];
        g.lineStyle(2.4, 0x2a1d14, state === 'idle' ? 0.5 : 0.95);
        bars.forEach((o) => g.lineBetween(x + o, y + 20 + swing * 20, x + o, y + 25 + swing * 20));
        const on = nextParity === phases[line];
        if (on) g.lineStyle(2, color.glow, 0.5 + 0.4 * Math.sin(t * 5)).strokeRect(x - 15, y - 7 + swing * 20, 30, 36);
      }
    });
    // The next bell's number, only where lines ring on I / II.
    const phased = Object.values(phases).some(Boolean);
    const pa = phased ? 1 : 0;
    this.parityLabel.setText(nextParity === 'even' ? 'II' : 'I').setAlpha(pa);
    this.paritySub.setAlpha(pa * 0.85);
    if (phased) {
      g.fillStyle(0x0b0907, 0.78).fillRoundedRect(CX + R + 30, CY - 30, 56, 66, 8);
      g.lineStyle(1.5, 0xb08a4a, 0.85).strokeRoundedRect(CX + R + 30, CY - 30, 56, 66, 8);
    }
    // The light Butch carries: a small lantern glyph.
    this.carryLabel.setAlpha(carried ? 0.9 : 0);
    if (carried) {
      const lx = CX - R - 70;
      const ly = CY - 8;
      const flick = 0.85 + 0.15 * Math.sin(t * 9);
      g.fillStyle(0x0b0907, 0.78).fillRoundedRect(lx - 28, CY - 30, 56, 66, 8);
      g.lineStyle(1.5, 0xb08a4a, 0.85).strokeRoundedRect(lx - 28, CY - 30, 56, 66, 8);
      g.fillStyle(0xf6e2b4, 0.25 * flick).fillCircle(lx, ly, 20);
      g.fillStyle(0x0b0907, 1).fillTriangle(lx - 10, ly - 12, lx + 10, ly - 12, lx, ly - 20);
      g.fillStyle(0xf2c27a, flick).fillRect(lx - 7, ly - 12, 14, 18);
      g.fillStyle(0xfff3d6, flick).fillEllipse(lx, ly - 3, 6, 10);
      g.lineStyle(1.4, 0x0b0907, 1).strokeRect(lx - 7, ly - 12, 14, 18);
    }
    this.meterLabel.setText(departure ? '' : '');
    this.nextLabel.setText(countdown ? `DEPARTURE · ${countdown.remaining} ${countdown.remaining === 1 ? 'BELL' : 'BELLS'}${countdown.held ? ' · HELD' : ''}` : '').setY(CY + R + 72);
  }

  ring({ departure = false } = {}) {
    this.bellSwing = 1;
    this.ringFlash = 1;
    if (departure) this.departureFlash = 1;
  }

  setListen(on, dt) {
    const target = on ? 1 : 0;
    // Listening is about the playfield: a section card gets out of the way.
    if (on && !this.listenWasOn && this.titleBig.alpha > 0) this.clearTitle();
    this.listenWasOn = on;
    const a = this.listenDim.alpha / 0.42;
    const next = Phaser.Math.Linear(a, target, Math.min(1, dt / 120));
    this.listenDim.setAlpha(0.42 * next);
    // Sit under the departure count when there is one, never on it.
    this.listenLabel.setAlpha(next).setY(this.nextLabel.text ? CY + R + 98 : CY + R + 80);
  }

  // ---- title cards and toasts ---------------------------------------------
  titleCard(big, small, { hold = 2600 } = {}) {
    const scene = this.scene;
    // A card or a conversation owns the screen: no section title over it.
    if (this.cardOpen || this.dialogOpen) return;
    this.titleBig.setText(big);
    this.titleSmall.setText(small);
    const w = Math.max(this.titleBig.width, 600);
    const ry = TITLE_Y + 28;
    this.titleRule.clear();
    this.titleRule.lineStyle(2, 0xb08a4a, 0.9).lineBetween(CX - w / 2, ry, CX + w / 2, ry);
    this.titleRule.fillStyle(0xe0a24a, 1).fillCircle(CX, ry, 4);
    const parts = [this.titleBig, this.titleSmall, this.titleRule, this.titleBand];
    scene.tweens.killTweensOf(parts);
    parts.forEach((o) => o.setAlpha(0));
    scene.tweens.add({ targets: parts, alpha: 1, duration: 700, ease: 'Sine.easeOut' });
    scene.tweens.add({ targets: parts, alpha: 0, duration: 900, delay: 700 + hold, ease: 'Sine.easeIn' });
  }

  toast(message, color = INK, ms = 2200) {
    const scene = this.scene;
    this.toastText.setText(message).setColor(color);
    const w = this.toastText.width + 120;
    const h = this.toastText.height + 26;
    const band = this.toastBand;
    band.clear();
    band.fillGradientStyle(0x03070b, 0x03070b, 0x03070b, 0x03070b, 0, 0.82, 0, 0.82).fillRect(CX - w / 2 - 60, 980 - h / 2, 60, h);
    band.fillStyle(0x03070b, 0.82).fillRect(CX - w / 2, 980 - h / 2, w, h);
    band.fillGradientStyle(0x03070b, 0x03070b, 0x03070b, 0x03070b, 0.82, 0, 0.82, 0).fillRect(CX + w / 2, 980 - h / 2, 60, h);
    band.lineStyle(1, 0xb08a4a, 0.45).lineBetween(CX - w / 2, 980 - h / 2, CX + w / 2, 980 - h / 2).lineBetween(CX - w / 2, 980 + h / 2, CX + w / 2, 980 + h / 2);
    const parts = [this.toastText, band];
    scene.tweens.killTweensOf(parts);
    parts.forEach((o) => o.setAlpha(0));
    scene.tweens.add({ targets: parts, alpha: 1, duration: 220 });
    scene.tweens.add({ targets: parts, alpha: 0, duration: 600, delay: ms });
  }

  showStones(snapshot) {
    this.stoneText.setText(`MAGIC STONES · ${snapshot.count} / ${snapshot.total}`);
    this.scene.tweens.killTweensOf(this.stoneText);
    this.stoneText.setAlpha(1);
    this.scene.tweens.add({ targets: this.stoneText, alpha: 0.35, duration: 1400, delay: 4000 });
  }

  // ---- caption bar ---------------------------------------------------------
  // `instant` clears a title the moment a card opens, so the two never share
  // the screen (A2-8: the letter under EVACUATION PLATFORM).
  clearTitle({ instant = false } = {}) {
    const parts = [this.titleBig, this.titleSmall, this.titleRule, this.titleBand];
    this.scene.tweens.killTweensOf(parts);
    if (instant) parts.forEach((part) => part.setAlpha(0));
    else this.scene.tweens.add({ targets: parts, alpha: 0, duration: 200 });
  }

  // A one-line caption that takes no input and clears itself (the boarding
  // line). Never while a conversation is open.
  say(line, ms = 2600) {
    if (this.dialog) return false;
    this.clearTitle({ instant: true });
    this.caption.setVisible(true).setAlpha(1);
    this.captionSpeaker.setText(line.speaker);
    this.captionBody.setText(line.text);
    this.captionHint.setAlpha(0);
    this.scene.tweens.killTweensOf(this.caption);
    this.scene.tweens.add({
      targets: this.caption,
      alpha: 0,
      delay: ms,
      duration: 400,
      onComplete: () => { if (!this.dialog) this.caption.setVisible(false); this.caption.setAlpha(1); },
    });
    this.saying = line;
    return true;
  }

  openDialog(lines, onDone) {
    this.clearTitle({ instant: true });
    this.scene.tweens.killTweensOf(this.caption);
    this.caption.setAlpha(1);
    this.dialog = { lines, index: 0, shown: 0, onDone };
    this.caption.setVisible(true);
    this.renderDialog();
  }

  get dialogOpen() { return Boolean(this.dialog); }

  advanceDialog() {
    const d = this.dialog;
    if (!d) return;
    const now = performance.now();
    if (now - (this.lastAdvanceAt ?? -1e9) < 160) return;
    this.lastAdvanceAt = now;
    const line = d.lines[d.index];
    if (d.shown < line.text.length) { d.shown = line.text.length; this.renderDialog(); return; }
    d.index += 1;
    d.shown = 0;
    if (d.index >= d.lines.length) {
      const done = d.onDone;
      this.dialog = null;
      this.caption.setVisible(false);
      done?.();
      return;
    }
    this.renderDialog();
  }

  updateDialog(dt) {
    const d = this.dialog;
    if (!d) return;
    const line = d.lines[d.index];
    if (d.shown < line.text.length) {
      d.shown = Math.min(line.text.length, d.shown + dt * 0.055);
      this.renderDialog();
    }
    this.captionHint.setAlpha(d.shown >= line.text.length ? 0.6 + 0.4 * Math.sin(this.scene.time.now / 200) : 0.2);
  }

  renderDialog() {
    const d = this.dialog;
    const line = d.lines[d.index];
    this.captionSpeaker.setText(line.speaker);
    this.captionBody.setText(line.text.slice(0, Math.floor(d.shown)));
  }

  // ---- cards ---------------------------------------------------------------
  openCard({ heading, subheading = '', lines, kind = 'archive' }, onClose) {
    this.clearTitle({ instant: true });
    this.cardState = { onClose };
    this.cardOpenedAt = performance.now();
    const g = this.cardPaper;
    g.clear();
    const x = 500;
    const y = 250;
    const w = 920;
    const h = 600;
    g.fillStyle(0x000000, 0.4).fillRect(x + 10, y + 14, w, h);
    g.fillStyle(kind === 'letter' ? 0xe9dfc6 : 0xd8ccb0, 1).fillRect(x, y, w, h);
    // Paper grain.
    for (let i = 0; i < 400; i += 1) {
      g.fillStyle(i % 2 ? 0x8a7a5a : 0xfff6e0, 0.08).fillRect(x + ((i * 97) % w), y + ((i * 53) % h), 2, 2);
    }
    if (kind === 'archive') {
      g.lineStyle(1, 0x9a8a6a, 0.8);
      for (let ly = y + 130; ly < y + h - 60; ly += 42) g.lineBetween(x + 40, ly, x + w - 40, ly);
      g.fillStyle(0x6b2a22, 0.9).fillRect(x, y, w, 10);
      // Punched hole with a sliver of light.
      g.fillStyle(0x05070a, 1).fillCircle(x + w - 70, y + 60, 16);
      g.fillStyle(0xe0a24a, 0.5).fillCircle(x + w - 74, y + 56, 5);
    } else {
      g.lineStyle(1, 0xb0a080, 0.5);
      g.lineBetween(x + 60, y + 60, x + w - 60, y + 60);
      g.fillStyle(0xe0a24a, 0.9).fillTriangle(x + w - 60, y + 40, x + w - 44, y + 40, x + w - 52, y + 28);
    }
    g.lineStyle(2, 0x6d5227, 0.8).strokeRect(x, y, w, h);
    this.cardHeading.setText(heading).setY(y + 44).setColor(kind === 'letter' ? '#6b2a22' : '#6b2a22');
    this.cardSub.setText(subheading).setY(y + 76);
    this.cardBody.setText(lines.join('\n\n')).setY(y + 128).setFontStyle(kind === 'letter' ? 'italic' : 'normal');
    this.cardHint.setY(y + h - 42);
    this.card.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.card, alpha: 1, duration: 260 });
  }

  get cardOpen() { return Boolean(this.cardState); }

  closeCard() {
    if (!this.cardState) return;
    if (performance.now() - this.cardOpenedAt < 250) return;
    const { onClose } = this.cardState;
    this.cardState = null;
    this.scene.tweens.add({ targets: this.card, alpha: 0, duration: 200, onComplete: () => this.card.setVisible(false) });
    onClose?.();
  }
}
