import Phaser from 'phaser';
import {
  BARRIERS,
  BELL_MS,
  FINISH_FRONT,
  GROUND_SPANS,
  LINE,
  LINE_WORLD,
  TRAIN,
  TRAIN_COLOURS,
  createPaintedLine,
  key as lineKey,
} from './paintedLineModel.js';
import { PIGMENTS } from './chapter4ExpansionModel.js';
import { PAPER } from './paperPalette.js';
import { drawPaintedPlayer } from './paintedPlayerFigure.js';
import { buildPaperGrain, draftLine, draftRect, hatchRect, makeRandom, paintedFill } from './paperSurface.js';
import { BrushInput } from './brushInput.js';
import { HOLD_SECONDS, MONO, PaperTag, RestartHold, UI, drawGlintMarker, noteAt } from './chapterUi.js';
import { drawGreyCell } from './platePencil.js';
import { bell as ringBell, installLineAudio, whistle } from './lineAudio.js';
import { reducedMotionActive } from '../../shell/motion.js';
import { CINEMATICS, navigateAfterCinematic } from '../../shell/gameFlow.js';
import { createSaveStore } from '../../shell/saveSystem.js';
import { devParam } from '../../devMode.js';

// Chapter 4 // THE PAINTED COUNTRY — Part III, "paint the line ahead".
//
// The painted train advances on Chapter 2's four-second bell (same bell, same
// meter). The archive has broken the line ahead of it on a Part I paper grid:
// gaps in the track and grey paper barriers across it. Butch runs ahead,
// PAINTS track into the gaps and WASHES the barriers off. Nothing fails: a
// train that meets a gap waits there with its whistle blowing until a bell
// finds the way clear. At the platform he washes each borrowed colour off the
// train and back to the resident who lent it, and the pencil train that is
// left still runs — on to the Museum.

const VIEW = Object.freeze({ w: 960, h: 600 });
const CELL = LINE.cell;
const TRACK_Y = LINE.trackRow * CELL; // 440
const REACH = 180;
const MOVE_SPEED = 200;
const JUMP_VELOCITY = -560;
const TRAIN_ANIM_MS = 1500;
const DEPTH = Object.freeze({ SKY: 0, HILLS: 4, GRID: 8, TRACK: 12, BLOCK: 16, PAINT: 18, TRAIN: 24, PEOPLE: 26, FIGURE: 30, CURSOR: 34, UI: 60, GRAIN: 80 });

const PART_OF = Object.fromEntries(PIGMENTS.map((p) => [p.id, p]));

export class PaintedLineScene extends Phaser.Scene {
  constructor() {
    super('PaintedLine');
  }

  preload() {
    if (!this.cache.audio.exists('chapter4-consequence-music')) {
      this.load.audio('chapter4-consequence-music', '/assets/music/ch4/4.2_debussy_snow_is_dancing.mp3');
    }
  }

  create() {
    installLineAudio();
    this.qa = devParam('qa');
    this.line = createPaintedLine();
    this.rnd = makeRandom(0x11ae);
    this.cellBodies = new Map();
    this.bellClock = 0;
    this.bellFlash = 0;
    this.bellSwing = 0;
    this.whistleClock = 0;
    this.trainX = this.frontX(this.line.state.front);
    this.trainFrom = this.trainX;
    this.trainTo = this.trainX;
    this.trainAnim = 1;
    this.lastBrushCell = null;
    this.hold = { key: null, progress: 0 };
    this.hover = null;
    this.departing = false;
    this.departOffset = 0;
    this.finished = false;
    this.paintDirty = true;
    this.steam = [];
    this.lastSafe = { x: 460, y: 400 };
    this.startedAt = this.time.now;
    this.tutorialSeen = { gap: false, barrier: false, return: false };

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, LINE_WORLD.w, LINE_WORLD.h);
    this.physics.world.setBounds(0, -300, LINE_WORLD.w, LINE_WORLD.h + 800);

    this.buildCountry();
    this.buildTrackArt();
    this.buildSolids();
    this.paintArt = this.add.graphics().setDepth(DEPTH.PAINT);
    this.blockArt = this.add.graphics().setDepth(DEPTH.BLOCK);
    this.trainArt = this.add.graphics().setDepth(DEPTH.TRAIN);
    this.steamArt = this.add.graphics().setDepth(DEPTH.TRAIN + 1);
    this.peopleArt = this.add.graphics().setDepth(DEPTH.PEOPLE);
    this.streamArt = this.add.graphics().setDepth(DEPTH.PEOPLE + 1);
    this.cursorArt = this.add.graphics().setDepth(DEPTH.CURSOR);
    this.markerArt = this.add.graphics().setDepth(DEPTH.CURSOR - 1);
    this.buildPlayer();
    this.buildResidents();
    this.buildMeter();
    this.buildGrain();

    this.keys = this.input.keyboard.addKeys({ a: 'A', d: 'D', w: 'W', e: 'E' });
    this.input.keyboard.addCapture(['SPACE', 'W']);
    this.input.mouse?.disableContextMenu();
    this.brush = new BrushInput(this, { anchor: () => ({ x: this.walker.x, y: this.walker.y - 10 }), radius: REACH + 30 });
    this.brush.cursor.setDepth(DEPTH.CURSOR + 1);
    this.tag = new PaperTag(this, { depth: DEPTH.UI + 4 });
    this.restart = new RestartHold(this, { onRestart: () => this.scene.restart({ skipIntro: true }) });

    this.line.state.blocks.forEach((k) => this.addCellBody(k % LINE.cols, Math.floor(k / LINE.cols)));

    this.music = this.cache.audio.exists('chapter4-consequence-music')
      ? this.sound.add('chapter4-consequence-music', { loop: true, volume: 0.36 })
      : null;
    if (this.music) {
      const play = () => { if (!this.music?.isPlaying) this.music?.play(); };
      if (this.sound.locked) this.sound.once('unlocked', play);
      else play();
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());

    this.applyQa();
    this.cameras.main.fadeIn(520, 247, 244, 236);
    noteAt(this, this.walker.x + 40, this.walker.y - 70, 'THE LINE AHEAD IS BROKEN.\nPAINT THE TRACK IN · WASH THE PAPER OFF.', { hold: 3200 });
  }

  frontX(front) {
    return (front + 1) * CELL;
  }

  applyQa() {
    const qa = this.qa;
    if (qa === 'line-clear' || qa === 'line-end') {
      this.line.obstaclesAhead().forEach(({ col, reason }) => {
        if (reason === 'gap') this.line.paint(col, LINE.trackRow);
        else for (let r = TRAIN.topRow; r < LINE.trackRow; r += 1) while (this.line.isSolid(col, r)) this.line.wash(col, r);
      });
      this.syncBodies();
      this.paintDirty = true;
    }
    if (qa === 'line-end') {
      while (!this.line.state.arrived) this.line.bell();
      this.line.drainEvents();
      this.trainX = this.frontX(this.line.state.front);
      this.trainFrom = this.trainX;
      this.trainTo = this.trainX;
      this.walker.setPosition(this.trainX - 120, TRACK_Y - 32);
      this.cameras.main.centerOn(this.trainX - 120, VIEW.h / 2);
      this.residents.forEach((p, i) => { p.x = this.frontX(this.line.state.front) - TRAIN.length * CELL - 30 - i * 26; });
      this.onArrived();
    }
  }

  // ============================================================ the country

  buildCountry() {
    const g = this.add.graphics().setDepth(DEPTH.SKY);
    const W = LINE_WORLD.w;
    g.fillStyle(PAPER.sheetHigh, 1).fillRect(0, 0, W, LINE_WORLD.h);
    g.fillStyle(PAPER.sheetLow, 1).fillRect(0, 0, W, 52);
    const hills = this.add.graphics().setDepth(DEPTH.HILLS);
    for (let x = -80; x < W; x += 340) {
      hills.fillStyle(PAPER.sheet, 1).fillTriangle(x, TRACK_Y - 10, x + 150, 230, x + 360, TRACK_Y - 10);
      hills.fillStyle(PAPER.sheetMid, 1).fillTriangle(x + 150, 230, x + 360, TRACK_Y - 10, x + 250, TRACK_Y - 10);
      hills.lineStyle(1.2, PAPER.graphiteSoft, 0.7);
      draftLine(hills, this.rnd, x, TRACK_Y - 10, x + 150, 230, { overshoot: 0, jitter: 0.8 });
    }
    // orchard trees in pencil along the way
    hills.lineStyle(1.4, PAPER.graphiteSoft, 0.7);
    for (let x = 120; x < W; x += 260) {
      const y = 330 + (x % 3) * 8;
      hills.strokeCircle(x, y - 40, 26);
      draftLine(hills, this.rnd, x, y - 14, x, TRACK_Y - 12, { overshoot: 0, jitter: 0.8 });
      hills.fillStyle(0xb4453a, 0.3);
      for (let i = 0; i < 3; i += 1) hills.fillCircle(x - 12 + this.rnd() * 24, y - 52 + this.rnd() * 22, 3);
    }
    // Part I's ruled grid, over the air the line runs through
    const grid = this.add.graphics().setDepth(DEPTH.GRID);
    grid.lineStyle(1, PAPER.graphiteFaint, 0.14);
    for (let c = 0; c <= LINE.cols; c += 1) grid.lineBetween(c * CELL, 260, c * CELL, TRACK_Y);
    for (let r = 13; r <= LINE.trackRow; r += 1) grid.lineBetween(0, r * CELL, W, r * CELL);

    this.add.text(24, 26, 'THE LINE AHEAD  ·  PAINT IT IN BEFORE THE TRAIN', {
      fontFamily: MONO, fontSize: '13px', color: '#5c574f', letterSpacing: 2.5,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.UI);
    this.add.text(this.frontX(FINISH_FRONT) + 40, 300, 'THE LAST PAINTED\nPLATFORM', {
      fontFamily: MONO, fontSize: '12px', color: '#5c574f', align: 'center', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.TRACK);
  }

  buildTrackArt() {
    const g = this.add.graphics().setDepth(DEPTH.TRACK);
    GROUND_SPANS.forEach(({ from, to }) => {
      const x = from * CELL;
      const w = (to - from) * CELL;
      g.fillStyle(PAPER.sheetLow, 1).fillRect(x, TRACK_Y, w, LINE_WORLD.h - TRACK_Y);
      hatchRect(g, this.rnd, x, TRACK_Y, w, 50, { spacing: 17, alpha: 0.2, flip: true });
      this.drawRails(g, x, w, 0.9);
    });
    // torn holes between
    for (let i = 0; i < GROUND_SPANS.length - 1; i += 1) {
      const x = GROUND_SPANS[i].to * CELL;
      const w = (GROUND_SPANS[i + 1].from - GROUND_SPANS[i].to) * CELL;
      g.lineStyle(1.6, PAPER.deckle, 0.95);
      [x, x + w].forEach((xx) => draftLine(g, this.rnd, xx, TRACK_Y, xx, LINE_WORLD.h, { overshoot: 0, jitter: 2.6, segments: 10 }));
    }
    // the platform
    const px = this.frontX(FINISH_FRONT) - 40;
    g.fillStyle(PAPER.sheetMid, 1).fillRect(px, TRACK_Y - 16, 480, 16);
    g.lineStyle(1.6, PAPER.graphite, 0.8);
    draftRect(g, this.rnd, px, TRACK_Y - 16, 480, 16, { overshoot: 4 });
  }

  drawRails(g, x, w, alpha) {
    g.lineStyle(1.2, PAPER.graphiteSoft, alpha * 0.8);
    for (let xx = x + 4; xx < x + w; xx += 14) g.lineBetween(xx, TRACK_Y + 2, xx - 3, TRACK_Y + 12);
    g.lineStyle(2, PAPER.graphite, alpha);
    g.lineBetween(x, TRACK_Y + 3, x + w, TRACK_Y + 3);
    g.lineBetween(x, TRACK_Y + 9, x + w, TRACK_Y + 9);
  }

  buildSolids() {
    this.solids = this.add.group();
    const solid = (x, y, w, h) => {
      const object = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0);
      this.physics.add.existing(object, true);
      this.solids.add(object);
    };
    GROUND_SPANS.forEach(({ from, to }) => solid(from * CELL, TRACK_Y, (to - from) * CELL, LINE_WORLD.h - TRACK_Y));
    solid(-24, -300, 24, LINE_WORLD.h + 400);
    solid(LINE_WORLD.w, -300, 24, LINE_WORLD.h + 400);
  }

  addCellBody(c, r) {
    const k = lineKey(c, r);
    if (this.cellBodies.has(k)) return;
    const object = this.add.rectangle(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL, CELL, 0xffffff, 0);
    this.physics.add.existing(object, true);
    this.solids.add(object);
    this.cellBodies.set(k, object);
  }

  removeCellBody(c, r) {
    const k = lineKey(c, r);
    const object = this.cellBodies.get(k);
    if (!object) return;
    this.solids.remove(object, true, true);
    this.cellBodies.delete(k);
  }

  syncBodies() {
    [...this.cellBodies.keys()].forEach((k) => {
      const c = k % LINE.cols;
      const r = Math.floor(k / LINE.cols);
      if (!this.line.isPainted(c, r) && !this.line.isBlock(c, r)) this.removeCellBody(c, r);
    });
    this.line.state.painted.forEach((k) => this.addCellBody(k % LINE.cols, Math.floor(k / LINE.cols)));
  }

  buildPlayer() {
    this.walker = this.add.rectangle(460, TRACK_Y - 32, 16, 58, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.physics.add.collider(this.walker, this.solids);
    this.figure = this.add.graphics().setDepth(DEPTH.FIGURE);
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(200, 160);
    this.cameras.main.setFollowOffset(-120, 0);
  }

  // The six residents who lent their colours, running behind the train.
  buildResidents() {
    this.residents = TRAIN_COLOURS.map((id, i) => ({
      id,
      color: PART_OF[id].color,
      name: PART_OF[id].source,
      x: this.trainX - TRAIN.length * CELL - 40 - i * 26,
      seed: i * 0.8,
      restored: false,
    }));
    this.shouts = [];
    this.time.delayedCall(1600, () => this.shout(0, 'WAIT FOR US!'));
    this.time.delayedCall(2600, () => this.shout(3, 'OUR COLOURS!'));
  }

  shout(index, text) {
    const p = this.residents[index];
    if (!p) return;
    const label = this.add.text(p.x, TRACK_Y - 96, text, {
      fontFamily: MONO, fontSize: '12px', color: UI.ink, fontStyle: 'bold', backgroundColor: '#fdfcf8ee', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.UI);
    this.shouts.push({ p, label });
    this.tweens.add({ targets: label, alpha: 0, delay: 1800, duration: 500, onComplete: () => label.destroy() });
  }

  buildMeter() {
    this.meter = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.UI + 2);
  }

  buildGrain() {
    const key = buildPaperGrain(this, 'paper-grain-line');
    this.add.tileSprite(0, 0, VIEW.w, VIEW.h, key).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.GRAIN).setAlpha(0.6);
  }

  // Chapter 2's bell meter, at this chapter's scale: a brass bell in a ring
  // that fills over the four seconds, four ticks, and a glow in the last half
  // second. It sits in the title strip, where no tag can land.
  drawMeter(dt) {
    const g = this.meter;
    g.clear();
    const cx = VIEW.w / 2;
    const cy = 27;
    const R = 17;
    const phase = Phaser.Math.Clamp(this.bellClock / BELL_MS, 0, 1);
    this.bellFlash = Math.max(0, this.bellFlash - dt / 0.9);
    this.bellSwing *= Math.pow(0.02, dt);
    g.fillStyle(0x0b0907, 0.82).fillCircle(cx, cy, R + 7);
    g.lineStyle(1.5, 0xb08a4a, 0.9).strokeCircle(cx, cy, R + 7);
    g.lineStyle(4, 0x2a1d14, 1).strokeCircle(cx, cy, R);
    if (!this.line.state.arrived) {
      g.lineStyle(4, 0xe0a24a, 0.95);
      g.beginPath();
      g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, phase), false);
      g.strokePath();
    }
    for (let i = 0; i < 4; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 2;
      g.lineStyle(1.4, 0xeadfc6, 0.6).lineBetween(cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), cx + Math.cos(a) * (R + 3), cy + Math.sin(a) * (R + 3));
    }
    const msToBell = BELL_MS - this.bellClock;
    if (!this.line.state.arrived && msToBell < 500) g.lineStyle(7, 0xf2c27a, 0.22 * (1 - msToBell / 500)).strokeCircle(cx, cy, R);
    if (this.bellFlash > 0) g.lineStyle(2, 0xf2c27a, this.bellFlash).strokeCircle(cx, cy, R + 7 + (1 - this.bellFlash) * 22);
    // the bell glyph
    const swing = Math.sin(this.time.now / 60) * this.bellSwing * 0.4;
    const bx = cx + Math.sin(swing) * 3;
    g.fillStyle(0xb08a4a, 1);
    g.fillTriangle(bx - 8, cy + 7, bx + 8, cy + 7, bx, cy - 9);
    g.fillCircle(bx, cy - 3, 6);
    g.fillStyle(0x6d5227, 1).fillRect(bx - 9, cy + 6, 18, 2.5);
    g.fillStyle(0x3a2a14, 1).fillCircle(bx, cy + 10, 2.2);
  }

  // ============================================================== drawing

  redrawCells() {
    const p = this.paintArt;
    const b = this.blockArt;
    p.clear();
    b.clear();
    const rnd = makeRandom(0x31a9);
    this.line.state.painted.forEach((k) => {
      const c = k % LINE.cols;
      const r = Math.floor(k / LINE.cols);
      paintedFill(p, rnd, c * CELL, r * CELL, CELL, CELL, PAPER.indigo, { alpha: 0.9 });
      if (r === LINE.trackRow) this.drawRails(p, c * CELL, CELL, 1);
    });
    this.line.state.blocks.forEach((k) => {
      const c = k % LINE.cols;
      const r = Math.floor(k / LINE.cols);
      drawGreyCell(b, c * CELL, r * CELL, CELL, k * 7, { varnish: this.line.varnishAt(c, r) });
    });
  }

  partRects(frontX) {
    const L = TRAIN.length * CELL;
    const x0 = frontX - L;
    const top = TRAIN.topRow * CELL; // 360
    return {
      green: { x: x0 + 10, y: TRACK_Y - 26, w: L - 20, h: 26 },
      blue: { x: x0 + 8, y: top + 22, w: 150, h: 46 },
      violet: { x: x0 + 4, y: top + 8, w: 196, h: 16 },
      orange: { x: x0 + 158, y: top + 8, w: 48, h: 60 },
      red: { x: x0 + 206, y: top + 30, w: L - 214, h: 38 },
      yellow: { x: x0 + 226, y: top + 6, w: 20, h: 26 },
    };
  }

  drawTrain() {
    const g = this.trainArt;
    g.clear();
    const fx = this.trainX + this.departOffset;
    const rects = this.partRects(fx);
    const returned = new Set(this.line.state.returned);
    const fill = (id) => (returned.has(id) ? [PAPER.sheetHigh, 0.9] : [PART_OF[id].color, 0.9]);
    const outline = () => g.lineStyle(2, PAPER.graphite, 0.9);
    const wheelSpin = -fx / 16;
    ['blue', 'violet', 'orange', 'red', 'yellow'].forEach((id) => {
      const r = rects[id];
      const [color, alpha] = fill(id);
      g.fillStyle(color, alpha);
      outline();
      if (id === 'red') {
        g.fillRoundedRect(r.x, r.y, r.w, r.h, 12).strokeRoundedRect(r.x, r.y, r.w, r.h, 12);
        g.fillCircle(r.x + r.w - 4, r.y + r.h / 2, r.h / 2).strokeCircle(r.x + r.w - 4, r.y + r.h / 2, r.h / 2);
      } else if (id === 'violet') {
        g.fillRect(r.x, r.y, r.w, r.h).strokeRect(r.x, r.y, r.w, r.h);
      } else {
        g.fillRoundedRect(r.x, r.y, r.w, r.h, 3).strokeRoundedRect(r.x, r.y, r.w, r.h, 3);
      }
      if (id === 'blue') {
        [16, 52, 88, 122].forEach((dx) => {
          g.fillStyle(PAPER.sheetHigh, 0.85).fillRect(r.x + dx, r.y + 8, 22, 16);
          g.strokeRect(r.x + dx, r.y + 8, 22, 16);
        });
      }
      if (id === 'orange') {
        g.fillStyle(PAPER.sheetHigh, 0.85).fillRect(r.x + 8, r.y + 8, 30, 20);
        g.strokeRect(r.x + 8, r.y + 8, 30, 20);
      }
    });
    // Mara's hawthorn, painted small on the cab: the answer, carried, not asked.
    const cab = rects.orange;
    g.fillStyle(PAPER.sheetHigh, 1);
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      g.fillCircle(cab.x + 24 + Math.cos(a) * 4, cab.y + 44 + Math.sin(a) * 4, 2.6);
    }
    g.fillStyle(0xb4453a, 1).fillCircle(cab.x + 24, cab.y + 44, 1.4);
    // wheels
    const w = rects.green;
    const [wc, wa] = fill('green');
    [w.x + 22, w.x + 80, w.x + 150, w.x + 214, w.x + w.w - 18].forEach((x) => {
      g.fillStyle(wc, wa).fillCircle(x, TRACK_Y - 12, 12);
      outline();
      g.strokeCircle(x, TRACK_Y - 12, 12);
      for (let s = 0; s < 4; s += 1) {
        const a = wheelSpin + (s * Math.PI) / 2;
        g.lineBetween(x, TRACK_Y - 12, x + Math.cos(a) * 10, TRACK_Y - 12 + Math.sin(a) * 10);
      }
    });
    g.lineStyle(3, PAPER.graphiteSoft, 0.7).lineBetween(w.x + 22, TRACK_Y - 12, w.x + w.w - 18, TRACK_Y - 12);
  }

  drawSteam(dt) {
    const g = this.steamArt;
    g.clear();
    this.steam = this.steam.filter((puff) => {
      puff.t += dt;
      puff.x -= 26 * dt;
      puff.y -= 34 * dt;
      const k = puff.t / 1.6;
      if (k >= 1) return false;
      g.fillStyle(PAPER.sheetHigh, 0.8 * (1 - k)).fillCircle(puff.x, puff.y, 6 + k * 16);
      g.lineStyle(1, PAPER.graphiteFaint, 0.6 * (1 - k)).strokeCircle(puff.x, puff.y, 6 + k * 16);
      return true;
    });
  }

  puff() {
    if (reducedMotionActive() && this.steam.length > 2) return;
    const chimney = this.partRects(this.trainX + this.departOffset).yellow;
    this.steam.push({ x: chimney.x + 10, y: chimney.y - 4, t: 0 });
  }

  drawResidents(time, dt) {
    const g = this.peopleArt;
    g.clear();
    const trainRear = this.trainX - TRAIN.length * CELL;
    this.residents.forEach((p, i) => {
      if (!this.line.state.arrived) {
        const target = trainRear - 30 - i * 26;
        p.x = Phaser.Math.Linear(p.x, target, 1 - Math.exp(-1.6 * dt));
      }
      const running = !this.line.state.arrived;
      const stride = running ? Math.sin(time / 90 + p.seed) : 0;
      const x = p.x;
      const y = TRACK_Y - 2;
      const color = p.restored ? p.color : 0xd6d0c4;
      g.lineStyle(2, PAPER.graphite, 0.85);
      g.fillStyle(PAPER.sheetHigh, 0.96).fillCircle(x, y - 60, 9);
      g.strokeCircle(x, y - 60, 9);
      g.fillStyle(color, 0.9).fillRoundedRect(x - 6, y - 50, 12, 26, 3);
      g.strokeRoundedRect(x - 6, y - 50, 12, 26, 3);
      g.lineBetween(x - 3, y - 44, x - 11 + stride * 9, y - 30);
      g.lineBetween(x + 3, y - 44, x + 11 - stride * 9, y - 30);
      g.lineBetween(x - 2, y - 24, x - 8 + stride * 8, y);
      g.lineBetween(x + 2, y - 24, x + 8 - stride * 8, y);
    });
  }

  // A glint on the first cell of each break in the line still ahead.
  drawMarkers() {
    const g = this.markerArt;
    g.clear();
    if (this.line.state.arrived) return;
    const t = this.time.now;
    const ahead = this.line.obstaclesAhead();
    const byCol = new Map(ahead.map((o) => [o.col, o.reason]));
    ahead.filter(({ col, reason }) => byCol.get(col - 1) !== reason).slice(0, 6).forEach(({ col, reason }) => {
      drawGlintMarker(g, t, col * CELL + CELL / 2 + 10, reason === 'gap' ? TRACK_Y - 8 : TRAIN.topRow * CELL - 8);
    });
  }

  // ================================================================ input

  inReach() {
    return Phaser.Math.Distance.Between(this.walker.x, this.walker.y, this.brush.worldX, this.brush.worldY) <= REACH;
  }

  overlapsPlayer(c, r) {
    return this.walker.x >= c * CELL && this.walker.x < c * CELL + CELL && this.walker.y >= r * CELL && this.walker.y < r * CELL + CELL;
  }

  applyBrush(c, r, wash) {
    if (!this.line.inBounds(c, r)) return;
    if (wash) {
      if (this.line.wash(c, r)) {
        if (!this.line.isPainted(c, r) && !this.line.isBlock(c, r)) this.removeCellBody(c, r);
        this.paintDirty = true;
      }
      return;
    }
    if (this.overlapsPlayer(c, r)) return;
    if (this.line.paint(c, r)) {
      this.addCellBody(c, r);
      this.paintDirty = true;
    }
  }

  stepBrush() {
    const b = this.brush;
    if (b.paintPressed || b.washPressed) this.lastBrushCell = null;
    (b.mode === 'mouse' ? b.samples : []).forEach((p) => this.strokeTo(p.worldX, p.worldY, p.wash));
    if (b.paintDown || b.washDown) this.strokeTo(b.worldX, b.worldY, b.washDown);
    else this.lastBrushCell = null;
  }

  strokeTo(wx, wy, wash) {
    if (Phaser.Math.Distance.Between(this.walker.x, this.walker.y, wx, wy) > REACH) {
      this.lastBrushCell = null;
      return;
    }
    const c = Math.floor(wx / CELL);
    const r = Math.floor(wy / CELL);
    const from = this.lastBrushCell;
    if (!from) {
      this.applyBrush(c, r, wash);
    } else if (from.c !== c || from.r !== r) {
      const steps = Math.max(Math.abs(c - from.c), Math.abs(r - from.r));
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        this.applyBrush(Math.round(from.c + (c - from.c) * t), Math.round(from.r + (r - from.r) * t), wash);
      }
    }
    this.lastBrushCell = { c, r };
  }

  partAt(x, y) {
    const rects = this.partRects(this.trainX);
    const order = ['yellow', 'orange', 'red', 'violet', 'blue', 'green'];
    return order.find((id) => {
      const r = rects[id];
      return x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4;
    }) ?? null;
  }

  stepReturn(dt) {
    const b = this.brush;
    const id = this.partAt(b.worldX, b.worldY);
    const live = id && !this.line.state.returned.includes(id);
    this.hover = live ? id : null;
    if (!live || !b.washDown) {
      this.hold = { key: null, progress: 0 };
      return;
    }
    if (this.hold.key !== id) this.hold = { key: id, progress: 0 };
    this.hold.progress += dt;
    if (this.hold.progress >= HOLD_SECONDS) {
      this.hold = { key: null, progress: 0 };
      this.line.returnColour(id);
      this.tutorialSeen.return = true;
      this.handleLineEvents();
    }
  }

  drawStream() {
    const g = this.streamArt;
    g.clear();
    if (!this.hold.key) return;
    const r = this.partRects(this.trainX)[this.hold.key];
    const person = this.residents.find((p) => p.id === this.hold.key);
    const from = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const to = { x: person.x, y: TRACK_Y - 40 };
    const k = Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1);
    const end = { x: Phaser.Math.Linear(from.x, to.x, k), y: Phaser.Math.Linear(from.y, to.y, k) - Math.sin(k * Math.PI) * 40 };
    g.lineStyle(3, PART_OF[this.hold.key].color, 0.8);
    [-2, 2].forEach((o) => draftLine(g, makeRandom(0x77 + o), from.x, from.y + o, end.x, end.y + o, { overshoot: 0, jitter: 1.4, segments: 10 }));
  }

  // ================================================================ flow

  onBell() {
    ringBell();
    this.bellFlash = 1;
    this.bellSwing = 1;
    const before = this.line.state.front;
    this.line.bell();
    const after = this.line.state.front;
    if (after !== before) {
      this.trainFrom = this.trainX;
      this.trainTo = this.frontX(after);
      this.trainAnim = 0;
      this.puff();
    }
    this.handleLineEvents();
  }

  handleLineEvents() {
    this.line.drainEvents().forEach((event) => {
      if (event.type === 'train-waiting') {
        const x = event.at * CELL;
        const first = event.reason === 'gap' ? !this.tutorialSeen.gap : !this.tutorialSeen.barrier;
        if (event.reason === 'gap') this.tutorialSeen.gap = true;
        else this.tutorialSeen.barrier = true;
        const text = event.reason === 'gap'
          ? (first ? `THE TRAIN WAITS AT THE GAP · ${this.brush.label('paint')} THE TRACK IN` : 'THE TRAIN WAITS AT A GAP')
          : (first ? `PAPER ON THE LINE · ${this.brush.label('wash')} IT AWAY` : 'THE TRAIN WAITS AT THE PAPER');
        noteAt(this, x, TRAIN.topRow * CELL - 30, text, { tone: 'warn', hold: 2400 });
        whistle({ long: true });
        this.whistleClock = 0;
      } else if (event.type === 'train-arrived') {
        this.onArrived();
      } else if (event.type === 'colour-returned') {
        const person = this.residents.find((p) => p.id === event.id);
        person.restored = true;
        noteAt(this, person.x, TRACK_Y - 80, `${person.name} · RETURNED`, { tone: 'good', hold: 1100 });
      } else if (event.type === 'colours-returned') {
        this.departPencilTrain();
      } else if (event.type === 'wash-refused') {
        noteAt(this, event.c * CELL, event.r * CELL, 'THE TRAIN IS ON IT', { tone: 'warn', hold: 900 });
      }
    });
  }

  onArrived() {
    whistle();
    this.walker.body.setVelocity(0, 0);
    noteAt(this, this.trainX - 140, TRAIN.topRow * CELL - 40, 'THE PLATFORM. THE COLOURS WERE ONLY BORROWED.', { hold: 2600 });
  }

  // Every colour is home; what is left is pencil, and it still runs.
  departPencilTrain() {
    if (this.departing) return;
    this.departing = true;
    this.tag.hide();
    this.time.delayedCall(900, () => {
      ringBell({ departure: true });
      this.bellFlash = 1;
      whistle({ long: true });
      noteAt(this, this.trainX - 140, TRAIN.topRow * CELL - 40, 'A PENCIL TRAIN STILL RUNS.', { tone: 'mara', hold: 2600 });
      this.tweens.add({ targets: this.walker, alpha: 0, duration: 400 });
      this.cameras.main.stopFollow();
      this.tweens.add({
        targets: this,
        departOffset: 520,
        duration: 3600,
        delay: 400,
        ease: 'Sine.easeIn',
        onUpdate: () => {
          if (Math.random() < 0.08) this.puff();
          this.cameras.main.centerOn(this.trainX + this.departOffset - 200, VIEW.h / 2);
        },
        onComplete: () => this.finishChapter(),
      });
    });
  }

  finishChapter() {
    if (this.finished) return;
    this.finished = true;
    if (this.music) this.tweens.add({ targets: this.music, volume: 0, duration: 600 });
    this.cameras.main.fadeOut(700, 247, 244, 236);
    this.time.delayedCall(760, () => {
      createSaveStore().markCheckpoint('chapter-5-start');
      navigateAfterCinematic('chapter-4-to-5', CINEMATICS.chapter4To5, '/museum-3d.html', {
        label: 'Chapter 4 to Chapter 5 transition',
        preloadChapterId: 'chapter5',
      });
    });
  }

  stepPlayer(move) {
    const body = this.walker.body;
    if (this.departing || this.restart.blocking) {
      body.setVelocityX(0);
      return;
    }
    body.setVelocityX(move.left && !move.right ? -MOVE_SPEED : move.right && !move.left ? MOVE_SPEED : 0);
    if (move.jump && body.blocked.down) body.setVelocityY(JUMP_VELOCITY);
    if (body.blocked.down && this.line.isGround(Math.floor(this.walker.x / CELL), LINE.trackRow)) {
      this.lastSafe = { x: this.walker.x, y: this.walker.y };
    }
    if (this.walker.y > VIEW.h + 100) {
      this.walker.setPosition(this.lastSafe.x, this.lastSafe.y - 10);
      body.setVelocity(0, 0);
    }
  }

  updateTag() {
    const b = this.brush;
    if (this.departing) return this.tag.hide();
    if (this.line.state.arrived) {
      if (this.hover) {
        const r = this.partRects(this.trainX)[this.hover];
        const person = PART_OF[this.hover];
        return this.tag.show(`${b.label('washHold')} · GIVE ${person.name} BACK TO THE ${person.source}`, r.x + r.w / 2, r.y - 4, {
          progress: this.hold.key ? this.hold.progress / HOLD_SECONDS : 0,
        });
      }
      if (!this.tutorialSeen.return) {
        return this.tag.show(`${b.label('washHold')} ON EACH COLOUR · WASH IT BACK TO WHOEVER LENT IT`, this.trainX - 140, TRAIN.topRow * CELL - 10);
      }
      return this.tag.hide();
    }
    const waiting = this.line.state.waiting;
    if (waiting && Math.abs(this.walker.x - waiting.at * CELL) < 420) {
      const verb = waiting.reason === 'gap' ? `${b.label('paint')} · PAINT THE TRACK` : `${b.label('wash')} · WASH THE PAPER`;
      return this.tag.show(verb, waiting.at * CELL + 10, waiting.reason === 'gap' ? TRACK_Y - 4 : TRAIN.topRow * CELL - 4);
    }
    return this.tag.hide();
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.brush.update(dt);
    this.restart.update(dt, this.brush.pad);
    const move = this.brush.readMove(this.keys);
    if (!this.restart.blocking) {
      if (!this.line.state.arrived) {
        this.bellClock += dt * 1000;
        if (this.bellClock >= BELL_MS) {
          this.bellClock -= BELL_MS;
          this.onBell();
        }
        if (this.line.state.waiting) {
          this.whistleClock += dt;
          if (this.whistleClock > 1.6) {
            this.whistleClock = 0;
            whistle();
            this.puff();
          }
        }
        this.stepBrush();
      } else if (!this.departing) {
        this.stepReturn(dt);
      }
    }
    this.stepPlayer(move);

    if (this.trainAnim < 1) {
      this.trainAnim = Math.min(1, this.trainAnim + (dt * 1000) / TRAIN_ANIM_MS);
      const k = Phaser.Math.Easing.Sine.InOut(this.trainAnim);
      this.trainX = Phaser.Math.Linear(this.trainFrom, this.trainTo, k);
    }
    if (this.paintDirty) {
      this.redrawCells();
      this.paintDirty = false;
    }
    this.drawTrain();
    this.drawSteam(dt);
    this.drawResidents(time, dt);
    this.drawStream();
    this.drawMarkers();
    this.drawMeter(dt);
    const g = this.cursorArt;
    g.clear();
    if (!this.line.state.arrived && !this.departing) {
      const c = Math.floor(this.brush.worldX / CELL);
      const r = Math.floor(this.brush.worldY / CELL);
      const ok = this.inReach();
      g.lineStyle(1, PAPER.graphiteFaint, ok ? 0.18 : 0.4).strokeCircle(this.walker.x, this.walker.y, REACH);
      if (ok && this.line.inBounds(c, r)) {
        const color = this.line.canWash(c, r) ? PAPER.bookCloth : this.line.canPaint(c, r) ? UI.amberInk : PAPER.graphiteFaint;
        g.lineStyle(2.2, color, 0.9).strokeRect(c * CELL, r * CELL, CELL, CELL);
      }
    }
    drawPaintedPlayer(this.figure, this.walker, this.brush);
    this.figure.setAlpha(this.walker.alpha);
    this.brush.drawCursor({ hidden: this.departing });
    this.updateTag();
  }

  textState() {
    const b = this.brush;
    return {
      scene: 'PaintedLine',
      camera: { x: Math.round(this.cameras.main.worldView.x), y: Math.round(this.cameras.main.worldView.y) },
      bell: { ms: Math.round(this.bellClock), period: BELL_MS },
      seconds: Math.round((this.time.now - this.startedAt) / 100) / 10,
      trainX: Math.round(this.trainX),
      departing: this.departing,
      finished: this.finished,
      player: { x: Math.round(this.walker.x), y: Math.round(this.walker.y), onGround: this.walker.body.blocked.down },
      pointer: { mode: b.mode, x: Math.round(b.worldX), y: Math.round(b.worldY) },
      hover: this.hover,
      tag: this.tag.visible ? this.tag.text : null,
      barriers: BARRIERS.length,
      parts: Object.fromEntries(Object.entries(this.partRects(this.trainX)).map(([id, r]) => [id, { x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) }])),
      ...this.line.snapshot(),
    };
  }
}
