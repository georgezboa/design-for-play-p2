import Phaser from 'phaser';
import {
  STILL_LIFE_REGIONS,
  STUDIO_PIGMENTS,
  STUDIO_SOURCES,
  createDrawingStudio,
} from './drawingStudioModel.js';
import { PAPER } from './paperPalette.js';
import { drawPaintedPlayer } from './paintedPlayerFigure.js';
import {
  buildPaperGrain,
  draftLine,
  draftRect,
  hatchRect,
  makeRandom,
  paintedFill,
} from './paperSurface.js';
import { BrushInput } from './brushInput.js';
import {
  HOLD_SECONDS,
  MONO,
  PaperTag,
  RestartHold,
  UI,
  drawGlintMarker,
  noteAt,
  showTitleCard,
} from './chapterUi.js';
import { devParam } from '../../devMode.js';

// Chapter 4 // THE PAINTED COUNTRY — Part II, the still life.
//
// A short room with one real choice, made six times: which colour did Rosa
// remember here? The brush holds one colour at a time. RIGHT-HOLD an object on
// the shelf to take its colour; LEFT-HOLD a place in her drawing to paint it;
// RIGHT-HOLD a painted place to wash it off. A wrong colour is accepted and
// simply looks wrong. The door opens when the drawing is as she remembered it.

const VIEW = Object.freeze({ w: 960, h: 600 });
const WORLD = Object.freeze({ w: 1640, h: 600 });
const FLOOR_Y = 486;
const MOVE_SPEED = 210;
const JUMP_VELOCITY = -620;
const REACH = 300;
const DEPTH = Object.freeze({ BACK: 0, ROOM: 6, OBJECT: 14, PAINT: 18, BOARD: 23, FIGURE: 30, PROMPT: 48, GRAIN: 70 });

// Rosa's easel. Regions are in canvas-local pixels.
const CANVAS = Object.freeze({ x: 830, y: 140, w: 330, h: 250 });
const SHELF = Object.freeze({ x: 380, y: 356, w: 390 });
const EXIT = Object.freeze({ x: 1470, y: 300, w: 80, h: FLOOR_Y - 300 });

const SOURCE_LAYOUT = Object.freeze(STUDIO_SOURCES.map((source, index) => {
  const x = SHELF.x + 30 + index * 55;
  const y = SHELF.y;
  return { id: source.id, kind: source.kind, x, y, rect: { x: x - 24, y: y - 50, w: 48, h: 52 } };
}));

// Hit shapes, most specific first (the apple sits in the leaves, the sun in
// the sky).
const REGION_SHAPES = Object.freeze({
  apple: { type: 'circle', x: 118, y: 120, r: 17 },
  sun: { type: 'circle', x: 280, y: 44, r: 28 },
  plums: { type: 'circles', circles: [{ x: 214, y: 204, r: 14 }, { x: 240, y: 208, r: 14 }, { x: 227, y: 188, r: 14 }] },
  fox: { type: 'fox', x: 62, y: 214 },
  leaves: { type: 'circles', circles: [{ x: 96, y: 108, r: 52 }, { x: 60, y: 96, r: 30 }, { x: 136, y: 90, r: 30 }] },
  sky: { type: 'rect', x: 0, y: 0, w: CANVAS.w, h: 74 },
});
const REGION_ORDER = ['apple', 'sun', 'plums', 'fox', 'leaves', 'sky'];

const colorCss = (value) => `#${value.toString(16).padStart(6, '0')}`;

function insideRegion(id, lx, ly) {
  const s = REGION_SHAPES[id];
  if (s.type === 'circle') return Math.hypot(lx - s.x, ly - s.y) <= s.r;
  if (s.type === 'circles') return s.circles.some((c) => Math.hypot(lx - c.x, ly - c.y) <= c.r);
  if (s.type === 'rect') return lx >= s.x && lx <= s.x + s.w && ly >= s.y && ly <= s.y + s.h;
  if (s.type === 'fox') return Math.abs(lx - s.x) <= 42 && Math.abs(ly - s.y) <= 20;
  return false;
}

function regionCentre(id) {
  const s = REGION_SHAPES[id];
  if (s.type === 'circle') return { x: s.x, y: s.y };
  if (s.type === 'circles') return { x: s.circles[0].x, y: s.circles[0].y };
  if (s.type === 'rect') return { x: s.x + s.w * 0.35, y: s.y + s.h / 2 };
  return { x: s.x, y: s.y };
}

export class DrawingStudioScene extends Phaser.Scene {
  constructor() {
    super('DrawingStudio');
  }

  preload() {
    if (!this.cache.audio.exists('chapter4-drawing-music')) {
      this.load.audio('chapter4-drawing-music', '/assets/music/ch4/4.3_debussy_reflets_dans_leau.mp3');
    }
  }

  create(data = {}) {
    this.rnd = makeRandom(0xd4a7);
    this.studio = createDrawingStudio();
    this.hold = { key: null, progress: 0 };
    this.hoverSourceId = null;
    this.hoverRegionId = null;
    this.playerFacing = 1;
    this.playerAnimation = 'idle';
    this.frameReveal = 0;
    this.transitioning = false;
    this.locked = false;
    this.tutorialSeen = { take: false, apply: false, wash: false, exit: false };
    this.qa = devParam('qa');

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h);

    this.buildRoom();
    this.buildSources();
    this.buildCanvas();
    this.buildPlayer();
    this.buildGrain();
    this.bindInput();
    this.startMusic();
    this.applyQaState();
    this.redrawAll();

    if (!data.skipIntro && (!this.qa || this.qa === 'drawing')) {
      this.locked = true;
      showTitleCard(this, {
        kicker: 'CHAPTER 4 · THE PAINTED COUNTRY',
        main: 'II · THE STILL LIFE',
        hold: 1600,
        onDone: () => { this.locked = false; },
      });
    }
  }

  graphics(depth) {
    return this.add.graphics().setDepth(depth);
  }

  buildRoom() {
    const g = this.graphics(DEPTH.BACK);
    g.fillStyle(PAPER.sheet, 1).fillRect(0, 0, WORLD.w, WORLD.h);
    g.fillStyle(PAPER.sheetLow, 1).fillRect(0, 0, WORLD.w, 52);
    g.fillStyle(PAPER.sheetHigh, 0.92).fillRect(0, 92, WORLD.w, 266);
    g.fillStyle(PAPER.sheetMid, 0.8).fillRect(0, 358, WORLD.w, FLOOR_Y - 358);
    g.fillStyle(PAPER.sheetLow, 1).fillRect(0, FLOOR_Y, WORLD.w, WORLD.h - FLOOR_Y);
    hatchRect(g, this.rnd, 0, FLOOR_Y, WORLD.w, 70, { spacing: 17, alpha: 0.18, flip: true });

    // Part I's warm paper windows and folded hills continue through the room.
    [{ x: 54, w: 280 }, { x: 1230, w: 200 }].forEach(({ x, w }, index) => {
      g.fillStyle(PAPER.sheetHigh, 0.96).fillRect(x, 118, w, 196);
      g.lineStyle(1.5, PAPER.graphiteSoft, 0.72);
      draftRect(g, this.rnd, x, 118, w, 196, { overshoot: 7, jitter: 0.7 });
      const hillY = 234 + (index % 2) * 12;
      g.fillStyle(PAPER.sheetMid, 0.82).fillTriangle(x, 314, x + w * 0.42, hillY, x + w * 0.7, 314);
      g.fillStyle(PAPER.sheetLow, 0.66).fillTriangle(x + w * 0.42, hillY, x + w, 282, x + w, 314);
      g.lineStyle(1.1, PAPER.graphiteFaint, 0.48);
      draftLine(g, this.rnd, x, 294, x + w, 276, { overshoot: 0, jitter: 1.8, segments: 12 });
    });
    g.lineStyle(1.8, PAPER.graphite, 0.82);
    draftLine(g, this.rnd, 0, 92, WORLD.w, 92, { overshoot: 0, jitter: 0.8, segments: 50 });
    draftLine(g, this.rnd, 0, 358, WORLD.w, 358, { overshoot: 0, jitter: 0.8, segments: 50 });
    draftLine(g, this.rnd, 0, FLOOR_Y, WORLD.w, FLOOR_Y, { overshoot: 0, jitter: 0.9, segments: 55 });

    // The shelf.
    const room = this.graphics(DEPTH.ROOM);
    room.fillStyle(PAPER.kraft, 0.5).fillRect(SHELF.x, SHELF.y, SHELF.w, 12);
    room.lineStyle(1.7, PAPER.graphite, 0.82);
    draftRect(room, this.rnd, SHELF.x, SHELF.y, SHELF.w, 12, { overshoot: 5 });
    draftLine(room, this.rnd, SHELF.x + 20, SHELF.y + 12, SHELF.x + 20, FLOOR_Y, { overshoot: 2 });
    draftLine(room, this.rnd, SHELF.x + SHELF.w - 20, SHELF.y + 12, SHELF.x + SHELF.w - 20, FLOOR_Y, { overshoot: 2 });

    // The title strip: the room's name lives up here, where no tag can land.
    this.add.text(24, 26, "THE STUDIO  ·  ROSA'S STILL LIFE", {
      fontFamily: MONO, fontSize: '13px', color: '#5c574f', letterSpacing: 2.5,
    }).setOrigin(0, 0.5).setDepth(DEPTH.ROOM + 1);
    this.add.text(SHELF.x + SHELF.w / 2, SHELF.y + 26, 'THINGS FROM THE ORCHARD HOUSE', {
      fontFamily: MONO, fontSize: '11px', color: '#8d8579', letterSpacing: 1.4,
    }).setOrigin(0.5, 0).setDepth(DEPTH.ROOM + 1);

    const floor = this.add.rectangle(WORLD.w / 2, FLOOR_Y + 52, WORLD.w, 104, 0xffffff, 0);
    this.physics.add.existing(floor, true);
    this.floor = floor;
  }

  buildSources() {
    this.sourceArt = this.graphics(DEPTH.PAINT);
    this.focusArt = this.graphics(DEPTH.PAINT + 2);
    this.streamArt = this.graphics(DEPTH.PROMPT - 2);
    this.markerArt = this.graphics(DEPTH.PROMPT - 3);
  }

  buildCanvas() {
    const g = this.graphics(DEPTH.BOARD - 2);
    const { x, y, w, h } = CANVAS;
    g.fillStyle(PAPER.sheetHigh, 1).fillRect(x - 14, y - 14, w + 28, h + 28);
    g.lineStyle(1.8, PAPER.graphite, 0.8);
    draftRect(g, this.rnd, x - 14, y - 14, w + 28, h + 28, { overshoot: 7, jitter: 0.8 });
    draftLine(g, this.rnd, x + w * 0.5, y + h + 14, x + w * 0.5 - 70, FLOOR_Y, { overshoot: 5 });
    draftLine(g, this.rnd, x + w * 0.5, y + h + 14, x + w * 0.5 + 70, FLOOR_Y, { overshoot: 5 });
    this.add.text(x + w / 2, y + h + 22, '"THE ORCHARD IN SUMMER" · ROSA, 9', {
      fontFamily: MONO, fontSize: '11px', color: '#5c574f', letterSpacing: 1.2,
    }).setOrigin(0.5, 0).setDepth(DEPTH.BOARD);
    this.fillArt = this.graphics(DEPTH.BOARD);
    this.pencilArt = this.graphics(DEPTH.BOARD + 1);
    this.selectionArt = this.graphics(DEPTH.BOARD + 2);
    this.frameArt = this.graphics(DEPTH.BOARD + 3);
    this.doorArt = this.graphics(DEPTH.BOARD);
    this.doorLabel = this.add.text(EXIT.x + EXIT.w / 2, EXIT.y - 18, 'TO THE PAINTED TRAIN', {
      fontFamily: MONO, fontSize: '11px', color: '#8d8579', letterSpacing: 1.3,
    }).setOrigin(0.5, 1).setDepth(DEPTH.BOARD);
    this.drawPencil();
  }

  buildPlayer() {
    this.walker = this.add.rectangle(220, 414, 18, 62, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.physics.add.collider(this.walker, this.floor);
    this.walker.body.setCollideWorldBounds(true);
    this.figure = this.add.graphics().setDepth(DEPTH.FIGURE);
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(280, 190);
  }

  buildGrain() {
    const key = buildPaperGrain(this, 'paper-grain-drawing-studio-v2');
    this.grain = this.add.tileSprite(0, 0, VIEW.w, VIEW.h, key)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.GRAIN).setAlpha(0.7);
  }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({ a: 'A', d: 'D', w: 'W', e: 'E' });
    this.input.keyboard.addCapture(['SPACE', 'W']);
    this.input.mouse?.disableContextMenu();
    this.input.keyboard.on('keydown-F', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
    this.brush = new BrushInput(this, { anchor: null });
    this.brush.cursor.setDepth(DEPTH.PROMPT + 5);
    this.tag = new PaperTag(this, { depth: DEPTH.PROMPT + 4 });
    this.restart = new RestartHold(this, { onRestart: () => this.scene.restart({ skipIntro: true }) });
  }

  startMusic() {
    this.music = this.cache.audio.exists('chapter4-drawing-music')
      ? this.sound.add('chapter4-drawing-music', { loop: true, volume: 0.38 })
      : null;
    const play = () => { if (!this.music?.isPlaying) this.music?.play(); };
    if (this.sound.locked) this.sound.once('unlocked', play);
    else play();
    this.input.once('pointerdown', play);
    this.input.keyboard.once('keydown', play);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());
  }

  applyQaState() {
    // Dev-only: devParam() is null in production.
    const qa = this.qa;
    if (qa === 'drawing-start') return;
    if (qa === 'drawing-wrong') {
      STILL_LIFE_REGIONS.forEach((region, i) => {
        this.studio.take(STUDIO_SOURCES.find((s) => s.pigment === (i === 3 ? 'blue' : region.wants)).id);
        this.studio.apply(region.id);
      });
      this.walker.setPosition(CANVAS.x - 60, 414);
    } else if (qa === 'drawing-ready') {
      STILL_LIFE_REGIONS.slice(0, -1).forEach((region) => {
        this.studio.take(STUDIO_SOURCES.find((s) => s.pigment === region.wants).id);
        this.studio.apply(region.id);
      });
      this.studio.take('marigold-jar');
      this.walker.setPosition(CANVAS.x - 60, 414);
    } else if (qa === 'drawing-done') {
      STILL_LIFE_REGIONS.forEach((region) => {
        this.studio.take(STUDIO_SOURCES.find((s) => s.pigment === region.wants).id);
        this.studio.apply(region.id);
      });
      this.frameReveal = 1;
      this.walker.setPosition(EXIT.x - 60, 414);
    }
    this.studio.drainEvents();
  }

  redrawAll() {
    this.redrawSources();
    this.redrawCanvas();
    this.redrawDoor();
  }

  // Seven keepsakes from the orchard house, one per colour. Taking a colour
  // does not use the object up.
  redrawSources() {
    const g = this.sourceArt;
    g.clear();
    SOURCE_LAYOUT.forEach((layout) => {
      const item = this.studio.source(layout.id);
      const pigment = this.studio.pigment(item.pigment);
      const pulling = this.hold.key === `take:${layout.id}` ? Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1) : 0;
      const { x, y } = layout;
      g.lineStyle(1.5, PAPER.graphite, 0.86);
      g.fillStyle(pigment.color, 0.88 - pulling * 0.3);
      if (layout.kind === 'cup') {
        g.fillRoundedRect(x - 12, y - 25, 23, 22, 3).strokeRoundedRect(x - 12, y - 25, 23, 22, 3);
        g.strokeCircle(x + 13, y - 15, 7);
      } else if (layout.kind === 'book') {
        g.fillRoundedRect(x - 16, y - 16, 32, 13, 3).strokeRoundedRect(x - 16, y - 16, 32, 13, 3);
        g.fillRoundedRect(x - 14, y - 28, 28, 12, 3).strokeRoundedRect(x - 14, y - 28, 28, 12, 3);
      } else if (layout.kind === 'tin' || layout.kind === 'jar') {
        g.fillRect(x - 11, y - 27, 22, 24).strokeRect(x - 11, y - 27, 22, 24);
        g.strokeEllipse(x, y - 27, 22, 6);
        g.strokeEllipse(x, y - 3, 22, 6);
        if (layout.kind === 'tin') {
          g.lineStyle(1, PAPER.graphite, 0.6).lineBetween(x - 7, y - 16, x + 7, y - 16);
        }
      } else if (layout.kind === 'bottle') {
        g.fillRoundedRect(x - 9, y - 28, 18, 25, 5).strokeRoundedRect(x - 9, y - 28, 18, 25, 5);
        g.fillRect(x - 4, y - 37, 8, 10).strokeRect(x - 4, y - 37, 8, 10);
      } else if (layout.kind === 'vase') {
        g.fillEllipse(x, y - 17, 27, 29).strokeEllipse(x, y - 17, 27, 29);
        g.lineBetween(x - 7, y - 33, x + 7, y - 33);
        g.strokeCircle(x + 15, y - 20, 6);
      } else if (layout.kind === 'ribbon') {
        g.fillTriangle(x, y - 17, x - 18, y - 29, x - 14, y - 9);
        g.fillTriangle(x, y - 17, x + 18, y - 29, x + 14, y - 9);
        g.strokeTriangle(x, y - 17, x - 18, y - 29, x - 14, y - 9);
        g.strokeTriangle(x, y - 17, x + 18, y - 29, x + 14, y - 9);
        g.fillCircle(x, y - 17, 6).strokeCircle(x, y - 17, 6);
      }
    });
  }

  // Rosa's pencil: always on top, whatever colour is under it.
  drawPencil() {
    const g = this.pencilArt;
    const ox = CANVAS.x;
    const oy = CANVAS.y;
    const rnd = makeRandom(0x5711);
    g.clear();
    g.lineStyle(2, PAPER.graphite, 0.78);
    draftLine(g, rnd, ox, oy + 74, ox + CANVAS.w, oy + 70, { overshoot: 0, jitter: 1.4, segments: 10 });
    draftLine(g, rnd, ox, oy + 228, ox + CANVAS.w, oy + 222, { overshoot: 0, jitter: 1.6, segments: 10 });
    // the tree
    REGION_SHAPES.leaves.circles.forEach((c) => g.strokeCircle(ox + c.x, oy + c.y, c.r));
    g.lineStyle(3, PAPER.graphite, 0.7);
    draftLine(g, rnd, ox + 96, oy + 150, ox + 96, oy + 226, { overshoot: 0, jitter: 1 });
    g.lineStyle(2, PAPER.graphite, 0.8);
    const apple = REGION_SHAPES.apple;
    g.strokeCircle(ox + apple.x, oy + apple.y, apple.r);
    g.lineBetween(ox + apple.x, oy + apple.y - apple.r, ox + apple.x + 3, oy + apple.y - apple.r - 7);
    const sun = REGION_SHAPES.sun;
    g.strokeCircle(ox + sun.x, oy + sun.y, sun.r);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(ox + sun.x + Math.cos(a) * (sun.r + 5), oy + sun.y + Math.sin(a) * (sun.r + 5), ox + sun.x + Math.cos(a) * (sun.r + 13), oy + sun.y + Math.sin(a) * (sun.r + 13));
    }
    // the bowl of plums
    REGION_SHAPES.plums.circles.forEach((c) => g.strokeCircle(ox + c.x, oy + c.y, c.r));
    g.beginPath();
    g.arc(ox + 227, oy + 208, 34, 0.1, Math.PI - 0.1, false);
    g.strokePath();
    g.lineBetween(ox + 193, oy + 212, ox + 261, oy + 212);
    // the fox by the gate
    const fox = REGION_SHAPES.fox;
    g.strokeEllipse(ox + fox.x, oy + fox.y, 64, 26);
    g.strokeTriangle(ox + fox.x + 30, oy + fox.y - 20, ox + fox.x + 48, oy + fox.y - 8, ox + fox.x + 30, oy + fox.y + 2);
    g.lineBetween(ox + fox.x + 34, oy + fox.y - 20, ox + fox.x + 38, oy + fox.y - 30);
    g.lineBetween(ox + fox.x - 32, oy + fox.y, ox + fox.x - 46, oy + fox.y - 16);
    [-20, -8, 10, 22].forEach((dx) => g.lineBetween(ox + fox.x + dx, oy + fox.y + 12, ox + fox.x + dx, oy + fox.y + 24));
    // a gate, and the path up to it
    g.lineStyle(1.4, PAPER.graphiteSoft, 0.8);
    [288, 302, 316].forEach((xx) => g.lineBetween(ox + xx, oy + 190, ox + xx, oy + 226));
    g.lineBetween(ox + 282, oy + 198, ox + 322, oy + 198);
  }

  paintRegion(g, id, pigmentId, alpha = 0.82) {
    const pigment = this.studio.pigment(pigmentId);
    if (!pigment) return;
    const s = REGION_SHAPES[id];
    const ox = CANVAS.x;
    const oy = CANVAS.y;
    g.fillStyle(pigment.color, alpha);
    if (s.type === 'circle') g.fillCircle(ox + s.x, oy + s.y, s.r - 1);
    else if (s.type === 'circles') s.circles.forEach((c) => g.fillCircle(ox + c.x, oy + c.y, c.r - 1));
    else if (s.type === 'rect') paintedFill(g, this.rnd, ox + s.x + 2, oy + s.y + 2, s.w - 4, s.h - 4, pigment.color, { alpha, inset: 1 });
    else if (s.type === 'fox') {
      g.fillEllipse(ox + s.x, oy + s.y, 62, 24);
      g.fillTriangle(ox + s.x + 30, oy + s.y - 20, ox + s.x + 48, oy + s.y - 8, ox + s.x + 30, oy + s.y + 2);
    }
  }

  redrawCanvas() {
    const g = this.fillArt;
    g.clear();
    this.selectionArt.clear();
    this.frameArt.clear();
    const snapshot = this.studio.snapshot();
    // the sky first, so the sun sits in it; the leaves before the apple
    ['sky', 'sun', 'leaves', 'apple', 'plums', 'fox'].forEach((id) => {
      if (snapshot.fills[id]) this.paintRegion(g, id, snapshot.fills[id]);
    });
    if (this.hoverRegionId) {
      const c = regionCentre(this.hoverRegionId);
      this.selectionArt.lineStyle(2.4, UI.amberInk, 0.9).strokeCircle(CANVAS.x + c.x, CANVAS.y + c.y, 12);
    }
    if (snapshot.complete || this.frameReveal > 0.01) this.drawCompletionFrame(snapshot.complete ? Math.max(this.frameReveal, 0.2) : this.frameReveal);
  }

  drawCompletionFrame(amount) {
    const g = this.frameArt;
    const { x, y, w, h } = CANVAS;
    const pad = 20 + 8 * amount;
    g.lineStyle(2.8, PAPER.bookCloth, 0.9 * amount);
    draftRect(g, makeRandom(0x5150), x - pad, y - pad, w + pad * 2, h + pad * 2, { overshoot: 8, jitter: 1.1 });
    g.lineStyle(1.4, PAPER.graphite, 0.72 * amount);
    draftRect(g, makeRandom(0x5151), x - pad + 7, y - pad + 7, w + (pad - 7) * 2, h + (pad - 7) * 2, { overshoot: 5, jitter: 0.7 });
  }

  redrawDoor() {
    const g = this.doorArt;
    g.clear();
    const complete = this.studio.isComplete();
    g.fillStyle(complete ? PAPER.sheetHigh : PAPER.sheetMid, complete ? 1 : 0.72).fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    g.lineStyle(2, complete ? PAPER.graphite : PAPER.graphiteSoft, complete ? 0.9 : 0.62);
    draftRect(g, makeRandom(0x9955), EXIT.x, EXIT.y, EXIT.w, EXIT.h, { overshoot: 6, jitter: 0.8 });
    g.strokeCircle(EXIT.x + EXIT.w - 14, EXIT.y + 88, 4);
    if (complete) {
      g.lineStyle(1.2, PAPER.graphiteFaint, 0.8);
      for (let x = EXIT.x + 14; x < EXIT.x + EXIT.w; x += 18) g.lineBetween(x, EXIT.y + 6, x - 24, EXIT.y + EXIT.h);
    }
  }

  sourceAt(x, y) {
    return SOURCE_LAYOUT.find((l) => x >= l.rect.x && x <= l.rect.x + l.rect.w && y >= l.rect.y && y <= l.rect.y + l.rect.h) ?? null;
  }

  regionAt(x, y) {
    const lx = x - CANVAS.x;
    const ly = y - CANVAS.y;
    if (lx < 0 || ly < 0 || lx > CANVAS.w || ly > CANVAS.h) return null;
    return REGION_ORDER.find((id) => insideRegion(id, lx, ly)) ?? null;
  }

  inReach(x) {
    return Math.abs(this.walker.x - x) <= REACH;
  }

  atExit(x, y) {
    return this.studio.isComplete() && x >= EXIT.x - 10 && x <= EXIT.x + EXIT.w + 10 && y >= EXIT.y - 10 && y <= FLOOR_Y
      && Math.abs(this.walker.x - (EXIT.x + EXIT.w / 2)) <= 160;
  }

  setHold(key, dt) {
    if (this.hold.key !== key) this.hold = { key, progress: 0 };
    this.hold.progress += dt;
    return this.hold.progress >= HOLD_SECONDS;
  }

  resetHold() {
    if (this.hold.key) this.hold = { key: null, progress: 0 };
  }

  stepInteraction(dt, move) {
    const b = this.brush;
    const x = b.worldX;
    const y = b.worldY;
    const source = this.sourceAt(x, y);
    const region = source ? null : this.regionAt(x, y);
    this.hoverSourceId = source && this.inReach(source.x) ? source.id : null;
    this.hoverRegionId = region && this.inReach(CANVAS.x + CANVAS.w / 2) ? region : null;

    if (this.hoverSourceId && b.washDown) {
      if (this.setHold(`take:${source.id}`, dt)) {
        this.studio.take(source.id);
        this.tutorialSeen.take = true;
        this.resetHold();
        this.handleEvents();
      }
      this.redrawSources();
      return;
    }
    if (this.hoverRegionId && b.paintDown) {
      if (this.setHold(`apply:${region}`, dt)) {
        this.studio.apply(region);
        this.resetHold();
        this.handleEvents();
      }
      return;
    }
    if (this.hoverRegionId && b.washDown && this.studio.state.fills[region]) {
      if (this.setHold(`wash:${region}`, dt)) {
        this.studio.wash(region);
        this.tutorialSeen.wash = true;
        this.resetHold();
        this.handleEvents();
      }
      return;
    }
    const nearExit = this.studio.isComplete() && Math.abs(this.walker.x - (EXIT.x + EXIT.w / 2)) <= 160;
    if ((this.atExit(x, y) && b.paintDown) || (nearExit && move.interactPressed)) {
      if (move.interactPressed || this.setHold('exit', dt)) {
        this.tutorialSeen.exit = true;
        this.resetHold();
        this.goToTrain();
      }
      return;
    }
    if (this.hold.key) {
      this.resetHold();
      this.redrawSources();
    }
  }

  handleEvents() {
    const cx = CANVAS.x + CANVAS.w / 2;
    this.studio.drainEvents().forEach((event) => {
      if (event.type === 'color-taken') {
        const pigment = this.studio.pigment(event.pigment);
        const layout = SOURCE_LAYOUT.find((l) => l.id === event.source);
        noteAt(this, layout.x, layout.rect.y - 4, pigment.name, { tone: 'info', hold: 700 });
      } else if (event.type === 'region-painted') {
        this.tutorialSeen.apply = true;
      } else if (event.type === 'apply-refused' && event.reason === 'dry-brush') {
        noteAt(this, cx, CANVAS.y - 20, `THE BRUSH IS DRY · ${this.brush.label('washHold')} A THING ON THE SHELF`, { tone: 'warn' });
      } else if (event.type === 'apply-refused' && event.reason === 'already-painted') {
        noteAt(this, cx, CANVAS.y - 20, `ALREADY PAINTED · ${this.brush.label('washHold')} TO WASH IT OFF`, { tone: 'warn' });
      } else if (event.type === 'still-life-complete') {
        this.frameReveal = 0;
        this.tweens.add({ targets: this, frameReveal: 1, duration: 720, ease: 'Back.easeOut' });
        noteAt(this, cx, CANVAS.y - 26, 'AS SHE REMEMBERED IT. THE DOOR IS OPEN.', { tone: 'good', hold: 2200 });
      } else if (event.type === 'still-life-looks-wrong') {
        noteAt(this, cx, CANVAS.y - 26, "IT ISN'T AS ROSA REMEMBERED IT.\nWASH OFF WHAT LOOKS WRONG.", { tone: 'warn', hold: 2600 });
      } else if (event.type === 'still-life-opened-again') {
        this.frameReveal = 0;
      }
    });
    this.redrawAll();
  }

  // One tag, beside whatever the brush is on; glints on what is still waiting.
  updateTag() {
    const b = this.brush;
    const snapshot = this.studio.snapshot();
    const progress = this.hold.key ? this.hold.progress / HOLD_SECONDS : 0;
    if (this.locked || this.transitioning) {
      this.tag.hide();
      return;
    }
    if (this.hoverSourceId) {
      const layout = SOURCE_LAYOUT.find((l) => l.id === this.hoverSourceId);
      const item = this.studio.source(layout.id);
      this.tag.show(`${b.label('washHold')} · TAKE ${this.studio.pigment(item.pigment).name}`, layout.x, layout.rect.y - 4, { progress });
      return;
    }
    if (this.hoverRegionId) {
      const region = this.studio.region(this.hoverRegionId);
      const c = regionCentre(region.id);
      const filled = snapshot.fills[region.id];
      const text = filled
        ? `${b.label('washHold')} · WASH ${region.label} OFF`
        : snapshot.brush
          ? `${b.label('paintHold')} · PAINT ${region.label} ${this.studio.pigment(snapshot.brush).name}`
          : `${region.label} · TAKE A COLOUR FROM THE SHELF`;
      this.tag.show(text, CANVAS.x + c.x, CANVAS.y + c.y - 16, { progress });
      return;
    }
    const exitCentre = EXIT.x + EXIT.w / 2;
    if (snapshot.complete && Math.abs(this.walker.x - exitCentre) <= 200) {
      this.tag.show(`${b.label('read')} · THROUGH TO THE PAINTED TRAIN`, exitCentre, EXIT.y - 30, { progress: this.hold.key === 'exit' ? progress : 0 });
      return;
    }
    if (!this.tutorialSeen.take && this.walker.x < SHELF.x + SHELF.w + 60) {
      this.tag.show(`AIM WITH THE ${b.label('aim')} · ${b.label('washHold')} A THING TO TAKE ITS COLOUR`, SHELF.x + SHELF.w / 2, SHELF.y - 60);
      return;
    }
    this.tag.hide();
  }

  drawMarkers() {
    const g = this.markerArt;
    g.clear();
    const t = this.time.now;
    const snapshot = this.studio.snapshot();
    STILL_LIFE_REGIONS.forEach((region) => {
      if (snapshot.fills[region.id] && this.studio.isRight(region.id)) return;
      const c = regionCentre(region.id);
      drawGlintMarker(g, t, CANVAS.x + c.x + 14, CANVAS.y + c.y - 12, { alpha: snapshot.fills[region.id] ? 0.5 : 1 });
    });
    if (snapshot.complete) drawGlintMarker(g, t, EXIT.x + EXIT.w - 4, EXIT.y - 6);
  }

  drawStream() {
    const g = this.streamArt;
    g.clear();
    if (!this.hold.key) return;
    const progress = Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1);
    const [kind, id] = this.hold.key.split(':');
    const tip = { x: this.walker.x, y: this.walker.y - 20 };
    let from = null;
    let color = UI.amberInk;
    if (kind === 'take') {
      const layout = SOURCE_LAYOUT.find((l) => l.id === id);
      from = { x: layout.x, y: layout.y - 18 };
      color = this.studio.pigment(this.studio.source(id).pigment).color;
    } else if (kind === 'apply' || kind === 'wash') {
      const c = regionCentre(id);
      from = { x: CANVAS.x + c.x, y: CANVAS.y + c.y };
      const pid = kind === 'apply' ? this.studio.state.brush : this.studio.state.fills[id];
      color = this.studio.pigment(pid)?.color ?? UI.amberInk;
    }
    if (!from) return;
    const start = kind === 'apply' ? tip : from;
    const finish = kind === 'apply' ? from : tip;
    const end = { x: Phaser.Math.Linear(start.x, finish.x, progress), y: Phaser.Math.Linear(start.y, finish.y, progress) };
    g.lineStyle(2.6, color, 0.72);
    [-2.5, 2.5].forEach((o) => draftLine(g, makeRandom(0x6300 + o), start.x, start.y + o, end.x, end.y + o * 0.25, { overshoot: 0, jitter: 1.2, segments: 9 }));
  }

  stepPlayer(move) {
    if (this.transitioning || this.locked) {
      this.walker.body.setVelocityX(0);
      return;
    }
    this.walker.body.setVelocityX(move.left && !move.right ? -MOVE_SPEED : move.right && !move.left ? MOVE_SPEED : 0);
    if (move.jump && this.walker.body.blocked.down) this.walker.body.setVelocityY(JUMP_VELOCITY);
  }

  updateFigure() {
    const moving = Math.abs(this.walker.body.velocity.x) > 8;
    if (this.walker.body.velocity.x < -8) this.playerFacing = -1;
    if (this.walker.body.velocity.x > 8) this.playerFacing = 1;
    this.playerAnimation = moving ? 'walk' : 'idle';
    const held = this.studio.pigment(this.studio.state.brush);
    drawPaintedPlayer(this.figure, this.walker, this.brush, held?.color ?? PAPER.indigo);
  }

  goToTrain() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.registry.set('chapter4Pigments', []);
    if (this.music) this.tweens.add({ targets: this.music, volume: 0, duration: 420 });
    this.cameras.main.fadeOut(420, 247, 244, 236);
    this.time.delayedCall(450, () => this.scene.start('PigmentTrain'));
  }

  objectiveText() {
    const s = this.studio.snapshot();
    if (s.complete) return 'the still life is as Rosa remembered it; the door to the painted train is open';
    if (s.filled === STILL_LIFE_REGIONS.length) return 'every place is painted but something looks wrong; wash it off and repaint';
    return `take colours from the shelf and paint Rosa's still life (${s.filled} / ${STILL_LIFE_REGIONS.length})`;
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.brush.update(dt);
    this.restart.update(dt, this.brush.pad);
    if (this.restart.blocking) {
      this.walker.body.setVelocityX(0);
      return;
    }
    const move = this.brush.readMove(this.keys);
    this.stepPlayer(move);
    if (!this.locked && !this.transitioning) this.stepInteraction(dt, move);
    this.updateFigure();
    this.drawStream();
    this.drawMarkers();
    this.updateTag();
    this.brush.drawCursor({ hidden: this.transitioning });
    if (this.frameReveal > 0 && this.frameReveal < 1) this.redrawCanvas();
    else if (this.hoverRegionId !== this.lastHoverRegion) this.redrawCanvas();
    this.lastHoverRegion = this.hoverRegionId;
    this.grain.tilePositionX = this.cameras.main.scrollX * 0.34 + Math.sin(time / 5200) * 4;
  }

  textState() {
    const snapshot = this.studio.snapshot();
    return {
      scene: 'DrawingStudio',
      camera: { x: Math.round(this.cameras.main.worldView.x), y: Math.round(this.cameras.main.worldView.y) },
      coordinateSystem: 'world pixels; origin top-left; x right; y down',
      objective: this.objectiveText(),
      locked: this.locked,
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        onGround: this.walker.body.blocked.down,
        facing: this.playerFacing < 0 ? 'left' : 'right',
        animation: this.playerAnimation,
      },
      pointer: { mode: this.brush.mode, x: Math.round(this.brush.worldX), y: Math.round(this.brush.worldY) },
      hover: { source: this.hoverSourceId, region: this.hoverRegionId },
      hold: { key: this.hold.key, progress: Number((this.hold.progress / HOLD_SECONDS).toFixed(2)) },
      holdSeconds: HOLD_SECONDS,
      tag: this.tag.visible ? this.tag.text : null,
      tutorialSeen: { ...this.tutorialSeen },
      regions: Object.fromEntries(STILL_LIFE_REGIONS.map((r) => [r.id, {
        centre: { x: CANVAS.x + regionCentre(r.id).x, y: CANVAS.y + regionCentre(r.id).y },
        wants: r.wants,
      }])),
      sources: Object.fromEntries(SOURCE_LAYOUT.map((l) => [l.id, { x: l.x, y: l.y - 20 }])),
      exit: { x: EXIT.x + EXIT.w / 2, y: EXIT.y + 60 },
      freeCanvas: false,
      ...snapshot,
      palette: STUDIO_PIGMENTS.map((p) => p.id),
      music: { playing: Boolean(this.music?.isPlaying), volume: Number((this.music?.volume ?? 0).toFixed(2)) },
    };
  }
}
