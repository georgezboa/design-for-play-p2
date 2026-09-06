import Phaser from 'phaser';
import {
  REQUIRED_CELLS,
  STUDIO_PIGMENTS,
  STUDIO_SOURCES,
  createDrawingStudio,
} from './drawingStudioModel.js';
import { drawPigmentHalo, haloPointToward } from './pigmentHalo.js';
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
import { collectMagicStone, magicStoneSnapshot } from '../../shell/magicStones.js';

const VIEW = Object.freeze({ w: 960, h: 600 });
const WORLD = Object.freeze({ w: 2500, h: 600 });
const FLOOR_Y = 486;
const MOVE_SPEED = 210;
const JUMP_VELOCITY = -620;
const HOLD_SECONDS = 0.18;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const DEPTH = Object.freeze({ BACK: 0, ROOM: 6, OBJECT: 14, PAINT: 18, BOARD: 23, FIGURE: 30, PROMPT: 48, GRAIN: 70 });

const SOURCE_LAYOUT = Object.freeze(STUDIO_SOURCES.map((source, index) => {
  const compartment = Math.floor(index / 3);
  const row = Math.floor(compartment / 2);
  const side = compartment % 2;
  const slot = index % 3;
  const x = 648 + side * 170 + slot * 55;
  const y = 269 + row * 84;
  return {
    id: source.id,
    x,
    y,
    kind: source.kind,
    rect: { x: x - 22, y: y - 47, w: 44, h: 48 },
  };
}));

// Match Part I's 20px ruled-paper cells while keeping the easels themselves
// large enough to read and click: more cells, not a physically tiny canvas.
const CANVAS_CELL = 18;
const REFERENCE = Object.freeze({ x: 1050, y: 174, cell: CANVAS_CELL, cols: 9, rows: 9 });
const REQUIRED = Object.freeze({ x: 1290, y: 174, cell: CANVAS_CELL, cols: 9, rows: 9 });
const FREE = Object.freeze({ x: 1630, y: 174, cell: CANVAS_CELL, cols: 12, rows: 9 });
const EXIT_X = 2360;
const PIGMENT_STONE = Object.freeze({ x: 790, y: 426 });

const colorCss = (value) => `#${value.toString(16).padStart(6, '0')}`;
const cellKey = (col, row) => `${col},${row}`;

export class DrawingStudioScene extends Phaser.Scene {
  constructor() {
    super('DrawingStudio');
  }

  preload() {
    if (!this.cache.audio.exists('chapter4-drawing-music')) {
      this.load.audio('chapter4-drawing-music', '/assets/music/ch4/4.3_debussy_reflets_dans_leau.mp3');
    }
    if (!this.cache.audio.exists('chapter4-consequence-music')) {
      this.load.audio('chapter4-consequence-music', '/assets/music/ch4/4.2_debussy_snow_is_dancing.mp3');
    }
  }

  create() {
    this.rnd = makeRandom(0xd4a7);
    this.studio = createDrawingStudio();
    this.selected = null;
    this.currentInteraction = null;
    this.hoverSourceId = null;
    this.hold = { key: null, progress: 0 };
    this.playerFacing = 1;
    this.playerAnimation = 'idle';
    this.frameReveal = 0;
    this.transitioning = false;
    this.tutorialSeen = { extract: false, select: false, fill: false, lift: false, exit: false };

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h);

    this.buildRoom();
    this.buildMagicStone();
    this.buildSources();
    this.buildBoards();
    this.buildPlayer();
    this.buildPrompt();
    this.buildGrain();
    this.bindInput();
    this.startMusic();
    this.applyQaState();
    this.redrawAll();
  }

  graphics(depth) {
    return this.add.graphics().setDepth(depth);
  }

  buildRoom() {
    const g = this.graphics(DEPTH.BACK);
    g.fillStyle(PAPER.sheet, 1).fillRect(0, 0, WORLD.w, WORLD.h);
    g.fillStyle(PAPER.sheetHigh, 0.92).fillRect(0, 92, WORLD.w, 266);
    g.fillStyle(PAPER.sheetMid, 0.8).fillRect(0, 358, WORLD.w, FLOOR_Y - 358);
    g.fillStyle(PAPER.sheetLow, 1).fillRect(0, FLOOR_Y, WORLD.w, WORLD.h - FLOOR_Y);
    hatchRect(g, this.rnd, 0, FLOOR_Y, WORLD.w, 70, { spacing: 17, alpha: 0.18, flip: true });

    // Preserve Part I's strongest background: the warm paper windows and
    // folded hills continue through the studio instead of disappearing here.
    const windows = [
      { x: 54, w: 330 }, { x: 452, w: 350 }, { x: 870, w: 350 },
      { x: 1288, w: 350 }, { x: 1706, w: 360 }, { x: 2134, w: 300 },
    ];
    windows.forEach(({ x, w }, index) => {
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

    // Eighteen miniature keepsakes share six compartments. Their color is the
    // finite paint supply, while their varied silhouettes make the cabinet
    // read as a lived-in collection instead of six puzzle buttons.
    const room = this.graphics(DEPTH.ROOM);
    room.lineStyle(1.7, PAPER.graphite, 0.82);
    room.fillStyle(PAPER.sheetMid, 0.9).fillRect(610, 188, 360, 270);
    draftRect(room, this.rnd, 610, 188, 360, 270, { overshoot: 7 });
    [278, 362, 446].forEach((y) => draftLine(room, this.rnd, 620, y, 960, y, { overshoot: 4 }));
    draftLine(room, this.rnd, 790, 196, 790, 446, { overshoot: 3 });
    draftLine(room, this.rnd, 632, 458, 632, FLOOR_Y, { overshoot: 3 });
    draftLine(room, this.rnd, 948, 458, 948, FLOOR_Y, { overshoot: 3 });

    this.add.text(66, 112, 'THE OPEN SHEET  ·  COLOR ROOM', {
      fontFamily: MONO, fontSize: '13px', color: '#5c574f', letterSpacing: 2.5,
    }).setDepth(DEPTH.ROOM + 1);
    this.add.text(1035, 112, 'OBSERVE THE VASE.  BORROW COLOR FROM THE SMALL OBJECTS TO PAINT IT.', {
      fontFamily: MONO, fontSize: '10px', color: '#8d8579', letterSpacing: 1.5,
    }).setDepth(DEPTH.ROOM + 1);

    const floor = this.add.rectangle(WORLD.w / 2, FLOOR_Y + 52, WORLD.w, 104, 0xffffff, 0);
    this.physics.add.existing(floor, true);
    this.floor = floor;
  }

  buildSources() {
    this.sourceArt = new Map();
    SOURCE_LAYOUT.forEach((layout) => {
      const art = this.graphics(DEPTH.PAINT);
      this.sourceArt.set(layout.id, art);
    });
    this.sourceFocusArt = this.graphics(DEPTH.PAINT + 2);
    this.suctionArt = this.graphics(DEPTH.PROMPT - 2);
  }

  buildMagicStone() {
    this.pigmentStoneCollected = magicStoneSnapshot().collected.includes('chapter-4');
    this.magicStoneArt = this.graphics(DEPTH.OBJECT + 3);
    this.magicStoneLabel = this.add.text(PIGMENT_STONE.x - 2, PIGMENT_STONE.y - 48, 'COLOR STONE', {
      fontFamily: MONO, fontSize: '8px', color: '#8d8579', letterSpacing: 1.2,
    }).setOrigin(0.5).setDepth(DEPTH.OBJECT + 4).setVisible(false);
    this.redrawMagicStone();
  }

  redrawMagicStone(time = 0) {
    const g = this.magicStoneArt;
    g.clear();
    const unlocked = this.studio?.allSourcesExtracted();
    this.magicStoneLabel?.setVisible(Boolean(unlocked && !this.pigmentStoneCollected));
    if (this.pigmentStoneCollected || !unlocked) return;
    const { x, y } = PIGMENT_STONE;
    g.fillStyle(PAPER.graphite, 0.52).fillRect(x - 33, y - 25, 66, 36);
    g.fillStyle(PAPER.cyan, 0.13 + Math.sin(time / 420) * 0.04).fillCircle(x, y - 5, 30);
    g.fillStyle(0x7fdfe9, 1);
    g.lineStyle(1.8, PAPER.graphite, 0.82);
    g.beginPath();
    g.moveTo(x, y - 28);
    g.lineTo(x + 14, y - 12);
    g.lineTo(x + 9, y + 13);
    g.lineTo(x, y + 22);
    g.lineTo(x - 9, y + 13);
    g.lineTo(x - 14, y - 12);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.fillStyle(PAPER.sheetHigh, 0.96);
    g.fillTriangle(x - 40, y - 34, x + 34, y - 31, x + 30, y + 5);
    g.lineStyle(1.5, PAPER.graphiteSoft, 0.78);
    draftLine(g, this.rnd, x - 40, y - 34, x + 34, y - 31, { overshoot: 5 });
    draftLine(g, this.rnd, x + 34, y - 31, x + 30, y + 5, { overshoot: 3 });
  }

  tryCollectMagicStone() {
    if (this.pigmentStoneCollected || !this.studio.allSourcesExtracted()
      || Math.abs(this.walker.x - PIGMENT_STONE.x) > 48) return;
    collectMagicStone('chapter-4');
    this.pigmentStoneCollected = true;
    this.magicStoneArt.clear();
    this.magicStoneLabel.setVisible(false);
    const snapshot = magicStoneSnapshot();
    this.localFeedback(`PIGMENT STONE FOUND\n${snapshot.count} / ${snapshot.total}`, PAPER.cyan);
    this.cameras.main.flash(240, 118, 225, 235);
  }

  buildBoards() {
    const g = this.graphics(DEPTH.BOARD - 2);
    this.drawEasel(g, REFERENCE, 'STILL LIFE  ·  VASE + FLOWERS', 0.86);
    this.drawEasel(g, REQUIRED, 'YOUR PAINTING', 1);
    this.drawEasel(g, FREE, 'YOUR OWN DRAWING', 1);
    this.referenceArt = this.graphics(DEPTH.BOARD);
    this.requiredArt = this.graphics(DEPTH.BOARD);
    this.freeArt = this.graphics(DEPTH.BOARD);
    this.selectionArt = this.graphics(DEPTH.BOARD + 2);
    this.frameArt = this.graphics(DEPTH.BOARD + 3);
    this.doorArt = this.graphics(DEPTH.BOARD);
  }

  drawEasel(g, board, title, alpha) {
    const w = board.cols * board.cell;
    const h = board.rows * board.cell;
    g.fillStyle(PAPER.sheetHigh, alpha).fillRect(board.x - 12, board.y - 12, w + 24, h + 24);
    g.lineStyle(1.8, PAPER.graphite, 0.8);
    draftRect(g, this.rnd, board.x - 12, board.y - 12, w + 24, h + 24, { overshoot: 7, jitter: 0.8 });
    draftLine(g, this.rnd, board.x + w * 0.5, board.y + h + 12, board.x + w * 0.5 - 54, FLOOR_Y, { overshoot: 5 });
    draftLine(g, this.rnd, board.x + w * 0.5, board.y + h + 12, board.x + w * 0.5 + 54, FLOOR_Y, { overshoot: 5 });
    this.add.text(board.x + w / 2, board.y - 35, title, {
      fontFamily: MONO, fontSize: '9px', color: '#5c574f', letterSpacing: 1.4,
    }).setOrigin(0.5).setDepth(DEPTH.BOARD);
  }

  buildPlayer() {
    this.walker = this.add.rectangle(500, 414, 18, 62, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.physics.add.collider(this.walker, this.floor);
    this.walker.body.setCollideWorldBounds(true);
    this.figure = this.add.graphics().setDepth(DEPTH.FIGURE);
    this.heldArt = this.graphics(DEPTH.FIGURE + 1);
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(280, 190);
  }

  buildPrompt() {
    this.promptFrame = this.graphics(DEPTH.PROMPT);
    this.promptText = this.add.text(0, 0, '', {
      fontFamily: MONO,
      fontSize: '10px',
      color: '#4a4640',
      align: 'center',
      lineSpacing: 4,
      letterSpacing: 1.1,
      padding: { x: 9, y: 7 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.PROMPT + 1).setVisible(false);
  }

  buildGrain() {
    const key = buildPaperGrain(this, 'paper-grain-drawing-studio-v2');
    this.grain = this.add.tileSprite(0, 0, VIEW.w, VIEW.h, key)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.GRAIN).setAlpha(0.7);
  }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', up: 'UP', a: 'A', d: 'D', w: 'W', space: 'SPACE' });
    this.input.keyboard.addCapture(['LEFT', 'RIGHT', 'UP', 'SPACE']);
    this.input.mouse?.disableContextMenu();
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-F', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
    this.input.on('pointerdown', this.selectBoardCell, this);
  }

  startMusic() {
    this.music = this.sound.add('chapter4-drawing-music', { loop: true, volume: 0.38 });
    const play = () => { if (!this.music?.isPlaying) this.music?.play(); };
    if (this.sound.locked) this.sound.once('unlocked', play);
    else play();
    this.input.once('pointerdown', play);
    this.input.keyboard.once('keydown', play);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());
  }

  applyQaState() {
    if (!import.meta.env.DEV) return;
    const qa = new URLSearchParams(window.location.search).get('qa');
    if (!['drawing-start', 'drawing-ready', 'drawing-free', 'drawing-magic-stone'].includes(qa)) return;
    if (qa === 'drawing-start') {
      this.walker.setPosition(500, 414);
      return;
    }
    if (qa === 'drawing-magic-stone') {
      // Visual QA must be able to inspect the reveal even if this browser's
      // persistent save already collected the optional Chapter 4 stone.
      this.pigmentStoneCollected = false;
      STUDIO_SOURCES.forEach((source) => {
        this.studio.extract(source.id);
        this.studio.placeRequired(source.targetCell);
      });
      this.walker.setPosition(PIGMENT_STONE.x - 94, 414);
      this.studio.drainEvents();
      return;
    }
    if (qa === 'drawing-free') {
      STUDIO_SOURCES.forEach((source) => {
        this.studio.extract(source.id);
        this.studio.placeRequired(source.targetCell);
      });
      const last = STUDIO_SOURCES.at(-1);
      this.studio.liftRequired(last.targetCell);
      this.selected = { board: 'free', cell: '2,2' };
      this.walker.setPosition(FREE.x + 40, 414);
      this.studio.drainEvents();
      return;
    }
    STUDIO_SOURCES.slice(0, -1).forEach((source) => {
      this.studio.extract(source.id);
      this.studio.placeRequired(source.targetCell);
    });
    const last = STUDIO_SOURCES.at(-1);
    this.studio.extract(last.id);
    this.selected = { board: 'required', cell: last.targetCell };
    this.walker.setPosition(REQUIRED.x - 70, 414);
    this.studio.drainEvents();
  }

  redrawAll() {
    this.redrawSources();
    this.redrawBoards();
    this.redrawDoor();
    this.redrawMagicStone();
  }

  paintPatch(g, x, y, w, h, color, live) {
    if (!live) return;
    paintedFill(g, this.rnd, x, y, w, h, color, { alpha: 0.8, inset: 2 });
    g.lineStyle(1.1, color, 0.45);
    for (let yy = y + 6; yy < y + h - 2; yy += 7) {
      draftLine(g, this.rnd, x + 4, yy, x + w - 4, yy + (this.rnd() - 0.5) * 4, {
        overshoot: 0, jitter: 1.3, segments: 4,
      });
    }
  }

  redrawSources() {
    SOURCE_LAYOUT.forEach((layout) => {
      const g = this.sourceArt.get(layout.id);
      const item = this.studio.source(layout.id);
      const pigment = this.studio.pigment(item.pigment);
      const live = !item.drained;
      g.clear();
      if (!live) {
        g.fillStyle(PAPER.graphiteFaint, 0.11).fillEllipse(layout.x, layout.y - 2, 29, 5);
        return;
      }
      const suctionProgress = this.hold.key === `source:${layout.id}`
        ? Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1)
        : 0;
      g.setAlpha(1 - suctionProgress * 0.72);
      g.lineStyle(1.35, PAPER.graphite, 0.86);
      g.fillStyle(pigment.color, 0.84);
      const { x, y } = layout;
      if (layout.kind === 'cup') {
        g.fillRoundedRect(x - 12, y - 25, 23, 22, 3).strokeRoundedRect(x - 12, y - 25, 23, 22, 3);
        g.strokeCircle(x + 13, y - 15, 7);
      } else if (layout.kind === 'ball' || layout.kind === 'clock') {
        g.fillCircle(x, y - 17, 13).strokeCircle(x, y - 17, 13);
        if (layout.kind === 'clock') {
          g.lineBetween(x, y - 17, x, y - 25);
          g.lineBetween(x, y - 17, x + 7, y - 14);
        }
      } else if (layout.kind === 'book' || layout.kind === 'box' || layout.kind === 'cushion') {
        const h = layout.kind === 'book' ? 12 : 22;
        g.fillRoundedRect(x - 16, y - h - 3, 32, h, 3).strokeRoundedRect(x - 16, y - h - 3, 32, h, 3);
        if (layout.kind === 'book') g.lineBetween(x - 11, y - 12, x + 11, y - 12);
      } else if (layout.kind === 'spool' || layout.kind === 'tin' || layout.kind === 'jar') {
        g.fillRect(x - 11, y - 27, 22, 24).strokeRect(x - 11, y - 27, 22, 24);
        g.strokeEllipse(x, y - 27, 22, 6);
        g.strokeEllipse(x, y - 3, 22, 6);
      } else if (layout.kind === 'bottle') {
        g.fillRoundedRect(x - 9, y - 28, 18, 25, 5).strokeRoundedRect(x - 9, y - 28, 18, 25, 5);
        g.fillRect(x - 4, y - 37, 8, 10).strokeRect(x - 4, y - 37, 8, 10);
      } else if (layout.kind === 'plant' || layout.kind === 'leaf') {
        g.fillStyle(pigment.color, 0.76);
        g.fillEllipse(x - 7, y - 27, 16, 10).strokeEllipse(x - 7, y - 27, 16, 10);
        g.fillEllipse(x + 8, y - 34, 17, 11).strokeEllipse(x + 8, y - 34, 17, 11);
        g.lineBetween(x, y - 4, x, y - 31);
        if (layout.kind === 'plant') g.fillRect(x - 10, y - 13, 20, 10).strokeRect(x - 10, y - 13, 20, 10);
      } else if (layout.kind === 'phone') {
        g.fillRoundedRect(x - 15, y - 22, 30, 19, 4).strokeRoundedRect(x - 15, y - 22, 30, 19, 4);
        g.strokeCircle(x, y - 12, 6);
        g.lineBetween(x - 16, y - 27, x + 16, y - 27);
      } else if (layout.kind === 'vase' || layout.kind === 'kettle') {
        g.fillEllipse(x, y - 17, 27, 29).strokeEllipse(x, y - 17, 27, 29);
        g.lineBetween(x - 7, y - 33, x + 7, y - 33);
        if (layout.kind === 'kettle') {
          g.lineBetween(x + 13, y - 22, x + 20, y - 28);
          g.strokeCircle(x - 13, y - 20, 7);
        }
      } else if (layout.kind === 'ribbon') {
        g.fillTriangle(x, y - 17, x - 18, y - 29, x - 14, y - 9);
        g.fillTriangle(x, y - 17, x + 18, y - 29, x + 14, y - 9);
        g.strokeTriangle(x, y - 17, x - 18, y - 29, x - 14, y - 9);
        g.strokeTriangle(x, y - 17, x + 18, y - 29, x + 14, y - 9);
        g.fillCircle(x, y - 17, 6).strokeCircle(x, y - 17, 6);
      }
    });
  }

  sourceAt(x, y) {
    return SOURCE_LAYOUT.find((layout) => Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(layout.rect.x, layout.rect.y, layout.rect.w, layout.rect.h),
      x,
      y,
    )) ?? null;
  }

  pointerWorld(pointer = this.input.activePointer) {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  setHold(key, dt) {
    if (this.hold.key !== key) this.hold = { key, progress: 0 };
    this.hold.progress += dt;
    return this.hold.progress >= HOLD_SECONDS;
  }

  resetHold() {
    if (this.hold.key) {
      this.hold = { key: null, progress: 0 };
      this.redrawSources();
    }
  }

  boardInteractionAt(x, y) {
    for (const [name, board] of [['required', REQUIRED], ['free', FREE]]) {
      const cell = this.cellAt(board, x, y);
      const centre = board.x + board.cols * board.cell / 2;
      if (cell && Math.abs(this.walker.x - centre) <= 270) return { name, board, cell };
    }
    return null;
  }

  exitInteractionAt(x, y) {
    if (!this.studio.isComplete() || Math.abs(this.walker.x - EXIT_X) > 140) return null;
    const rect = new Phaser.Geom.Rectangle(EXIT_X - 55, 290, 100, FLOOR_Y - 290);
    return Phaser.Geom.Rectangle.Contains(rect, x, y) ? { rect } : null;
  }

  occupiedSourceId(boardName, cell, snapshot = this.studio.snapshot()) {
    return boardName === 'required' ? snapshot.required[cell] : snapshot.free[cell];
  }

  stepSuction(dt) {
    const pointer = this.input.activePointer;
    const world = this.pointerWorld(pointer);
    const pointed = this.sourceAt(world.x, world.y);
    const available = pointed && !this.studio.source(pointed.id).drained;
    this.hoverSourceId = available ? pointed.id : null;

    if (available && pointer.rightButtonDown()) {
      if (this.setHold(`source:${pointed.id}`, dt)) {
        if (this.studio.extract(pointed.id)) this.tutorialSeen.extract = true;
        this.hold = { key: null, progress: 0 };
        this.handleEvents();
        this.redrawAll();
      } else {
        this.redrawSources();
      }
      return;
    }

    const boardHit = this.boardInteractionAt(world.x, world.y);
    if (boardHit) {
      this.selected = { board: boardHit.name, cell: boardHit.cell };
      const snapshot = this.studio.snapshot();
      const occupied = this.occupiedSourceId(boardHit.name, boardHit.cell, snapshot);
      if (occupied && pointer.rightButtonDown()) {
        if (this.setHold(`lift:${boardHit.name}:${boardHit.cell}`, dt)) {
          const lifted = boardHit.name === 'required'
            ? this.studio.liftRequired(boardHit.cell)
            : this.studio.liftFree(boardHit.cell);
          if (lifted) this.tutorialSeen.lift = true;
          this.hold = { key: null, progress: 0 };
          this.handleEvents();
          this.redrawAll();
        }
        return;
      }
      if (!occupied && snapshot.palette.length && pointer.leftButtonDown()) {
        if (this.setHold(`fill:${boardHit.name}:${boardHit.cell}`, dt)) {
          const placed = boardHit.name === 'required'
            ? this.studio.placeRequired(boardHit.cell)
            : this.studio.placeFree(boardHit.cell);
          if (placed) this.tutorialSeen.fill = true;
          this.hold = { key: null, progress: 0 };
          this.handleEvents();
          this.redrawAll();
        }
        return;
      }
    }

    const exit = this.exitInteractionAt(world.x, world.y);
    if (exit && pointer.leftButtonDown()) {
      if (this.setHold('exit', dt)) {
        this.tutorialSeen.exit = true;
        this.hold = { key: null, progress: 0 };
        this.goToTrain();
      }
      return;
    }
    this.resetHold();
  }

  drawSuction() {
    const focus = this.sourceFocusArt;
    const stream = this.suctionArt;
    focus.clear();
    stream.clear();
    const source = SOURCE_LAYOUT.find(({ id }) => id === this.hoverSourceId);
    if (source) {
      const pigment = this.studio.pigment(this.studio.source(source.id).pigment);
      focus.lineStyle(2.2, pigment.color, 0.95);
      draftRect(focus, makeRandom(0x5157 + source.x), source.rect.x - 4, source.rect.y - 4, source.rect.w + 8, source.rect.h + 8, {
        overshoot: 4,
        jitter: 0.8,
      });
    }

    if (!this.hold.key || this.hold.key === 'exit') return;
    const progress = Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1);
    const head = { x: this.walker.x, y: this.walker.y - 50 };
    let start = null;
    let finish = null;
    let color = PAPER.cyan;

    if (this.hold.key.startsWith('source:') && source) {
      const pigment = this.studio.pigment(this.studio.source(source.id).pigment);
      color = pigment.color;
      start = { x: source.rect.x + source.rect.w / 2, y: source.rect.y + source.rect.h / 2 };
      finish = haloPointToward(head.x, head.y, start.x, start.y, 36);
    } else if (this.hold.key.startsWith('lift:') || this.hold.key.startsWith('fill:')) {
      const [, boardName, cell] = this.hold.key.split(':');
      const board = this.boardByName(boardName);
      const [col, row] = cell.split(',').map(Number);
      const cellCentre = { x: board.x + (col + 0.5) * board.cell, y: board.y + (row + 0.5) * board.cell };
      const snapshot = this.studio.snapshot();
      const sourceId = this.hold.key.startsWith('lift:')
        ? this.occupiedSourceId(boardName, cell, snapshot)
        : snapshot.held;
      if (!sourceId) return;
      color = this.studio.pigment(this.studio.source(sourceId).pigment).color;
      const edge = haloPointToward(head.x, head.y, cellCentre.x, cellCentre.y, 36);
      start = this.hold.key.startsWith('lift:') ? cellCentre : edge;
      finish = this.hold.key.startsWith('lift:') ? edge : cellCentre;
    }
    if (!start || !finish) return;
    const end = { x: Phaser.Math.Linear(start.x, finish.x, progress), y: Phaser.Math.Linear(start.y, finish.y, progress) };
    stream.lineStyle(2.4, color, 0.68);
    [-2.5, 2.5].forEach((offset) => {
      draftLine(stream, makeRandom(0x6300 + offset), start.x, start.y + offset, end.x, end.y + offset * 0.25, {
        overshoot: 0,
        jitter: 1.2,
        segments: 9,
      });
    });
  }

  boardRect(board) {
    return new Phaser.Geom.Rectangle(board.x, board.y, board.cols * board.cell, board.rows * board.cell);
  }

  cellAt(board, x, y) {
    if (!Phaser.Geom.Rectangle.Contains(this.boardRect(board), x, y)) return null;
    return cellKey(Math.floor((x - board.x) / board.cell), Math.floor((y - board.y) / board.cell));
  }

  boardByName(name) {
    return name === 'required' ? REQUIRED : FREE;
  }

  selectBoardCell(pointer) {
    if (this.transitioning) return;
    const { x, y } = this.pointerWorld(pointer);
    for (const [name, board] of [['required', REQUIRED], ['free', FREE]]) {
      const cell = this.cellAt(board, x, y);
      const centre = board.x + board.cols * board.cell / 2;
      if (!cell || Math.abs(this.walker.x - centre) > 270) continue;
      this.selected = { board: name, cell };
      this.tutorialSeen.select = true;
      this.redrawBoards();
      return;
    }
  }

  drawGrid(g, board) {
    g.lineStyle(1.15, PAPER.graphiteSoft, 0.48);
    for (let col = 0; col <= board.cols; col += 1) {
      draftLine(g, this.rnd, board.x + col * board.cell, board.y, board.x + col * board.cell, board.y + board.rows * board.cell, {
        overshoot: 1, jitter: 0.45, segments: board.rows * 2,
      });
    }
    for (let row = 0; row <= board.rows; row += 1) {
      draftLine(g, this.rnd, board.x, board.y + row * board.cell, board.x + board.cols * board.cell, board.y + row * board.cell, {
        overshoot: 1, jitter: 0.45, segments: board.cols * 2,
      });
    }
  }

  drawStillLifeGuide(g, board, alpha = 0.34) {
    const cx = (col) => board.x + (col + 0.5) * board.cell;
    const cy = (row) => board.y + (row + 0.5) * board.cell;
    g.lineStyle(1.45, PAPER.graphite, alpha);

    // Two flower heads, then four stems converging into one visible vase.
    [[2, 2], [6, 2]].forEach(([col, row]) => {
      g.strokeCircle(cx(col), cy(row), board.cell * 1.12);
      g.strokeCircle(cx(col), cy(row), board.cell * 0.42);
    });
    [[2, 2], [6, 2], [3, 3], [5, 3]].forEach(([col, row]) => {
      draftLine(g, this.rnd, cx(col), cy(row) + 5, cx(4), cy(5), {
        overshoot: 0, jitter: 0.55, segments: 6,
      });
    });
    g.strokeEllipse(cx(3), cy(3), board.cell * 1.35, board.cell * 0.62);
    g.strokeEllipse(cx(6), cy(3), board.cell * 1.35, board.cell * 0.62);

    g.beginPath();
    g.moveTo(cx(3) - 5, cy(5) - 8);
    g.lineTo(cx(5) + 5, cy(5) - 8);
    g.lineTo(cx(5) + 13, cy(7) + 5);
    g.lineTo(cx(4), cy(8) + 8);
    g.lineTo(cx(3) - 13, cy(7) + 5);
    g.closePath();
    g.strokePath();
    g.strokeEllipse(cx(4), cy(5) - 8, board.cell * 2.7, 8);
  }

  fillCell(g, board, key, pigmentId, alpha = 0.82) {
    const [col, row] = key.split(',').map(Number);
    const pigment = this.studio.pigment(pigmentId);
    if (!pigment) return;
    paintedFill(g, this.rnd, board.x + col * board.cell + 2, board.y + row * board.cell + 2, board.cell - 4, board.cell - 4, pigment.color, {
      alpha, inset: 2,
    });
    g.lineStyle(1.1, pigment.color, 0.46);
    for (let yy = 9; yy < board.cell - 5; yy += 8) {
      draftLine(g, this.rnd, board.x + col * board.cell + 7, board.y + row * board.cell + yy,
        board.x + (col + 1) * board.cell - 7, board.y + row * board.cell + yy + 2, {
          overshoot: 0, jitter: 1.2, segments: 4,
        });
    }
  }

  redrawBoards() {
    this.referenceArt.clear();
    this.requiredArt.clear();
    this.freeArt.clear();
    this.selectionArt.clear();
    this.frameArt.clear();
    this.drawStillLifeGuide(this.referenceArt, REFERENCE, 0.5);
    this.drawStillLifeGuide(this.requiredArt, REQUIRED, 0.24);
    this.drawGrid(this.referenceArt, REFERENCE);
    this.drawGrid(this.requiredArt, REQUIRED);
    this.drawGrid(this.freeArt, FREE);
    REQUIRED_CELLS.forEach(({ cell, pigment }) => this.fillCell(this.referenceArt, REFERENCE, cell, pigment, 0.68));

    const snapshot = this.studio.snapshot();
    Object.entries(snapshot.required).forEach(([cell, token]) => {
      this.fillCell(this.requiredArt, REQUIRED, cell, this.studio.source(token).pigment);
    });
    Object.entries(snapshot.free).forEach(([cell, token]) => {
      this.fillCell(this.freeArt, FREE, cell, this.studio.source(token).pigment);
    });

    if (this.selected) {
      const board = this.boardByName(this.selected.board);
      const [col, row] = this.selected.cell.split(',').map(Number);
      this.selectionArt.lineStyle(2.4, PAPER.cyan, 0.9);
      this.selectionArt.strokeRect(board.x + col * board.cell + 3, board.y + row * board.cell + 3, board.cell - 6, board.cell - 6);
    }
    if (snapshot.complete || this.frameReveal > 0.01) this.drawCompletionFrame(snapshot.complete ? Math.max(this.frameReveal, 0.2) : this.frameReveal);
  }

  drawCompletionFrame(amount) {
    const g = this.frameArt;
    const w = REQUIRED.cols * REQUIRED.cell;
    const h = REQUIRED.rows * REQUIRED.cell;
    const pad = 18 + 8 * amount;
    g.lineStyle(2.8, PAPER.bookCloth, 0.9 * amount);
    draftRect(g, makeRandom(0x5150), REQUIRED.x - pad, REQUIRED.y - pad, w + pad * 2, h + pad * 2, { overshoot: 8, jitter: 1.1 });
    g.lineStyle(1.4, PAPER.graphite, 0.72 * amount);
    draftRect(g, makeRandom(0x5151), REQUIRED.x - pad + 7, REQUIRED.y - pad + 7, w + (pad - 7) * 2, h + (pad - 7) * 2, { overshoot: 5, jitter: 0.7 });
    g.fillStyle(PAPER.bookCloth, 0.88 * amount).fillCircle(REQUIRED.x + w + pad - 10, REQUIRED.y + h + pad - 8, 20 * amount);
    g.lineStyle(3, PAPER.sheetHigh, 0.9 * amount);
    g.lineBetween(REQUIRED.x + w + pad - 20, REQUIRED.y + h + pad - 8, REQUIRED.x + w + pad - 12, REQUIRED.y + h + pad);
    g.lineBetween(REQUIRED.x + w + pad - 12, REQUIRED.y + h + pad, REQUIRED.x + w + pad + 2, REQUIRED.y + h + pad - 17);
  }

  redrawDoor() {
    const g = this.doorArt;
    g.clear();
    const complete = this.studio.isComplete();
    g.fillStyle(complete ? PAPER.cyan : PAPER.sheetMid, complete ? 0.2 : 0.72).fillRect(EXIT_X - 42, 302, 74, FLOOR_Y - 302);
    g.lineStyle(2, complete ? PAPER.cyan : PAPER.graphiteSoft, complete ? 0.9 : 0.62);
    draftRect(g, makeRandom(0x9955), EXIT_X - 42, 302, 74, FLOOR_Y - 302, { overshoot: 6, jitter: 0.8 });
    g.strokeCircle(EXIT_X + 12, 388, 4);
    this.addedDoorLabel ??= this.add.text(EXIT_X - 5, 276, 'TO THE BORROWED TRAIN', {
      fontFamily: MONO, fontSize: '9px', color: '#8d8579', letterSpacing: 1.3,
    }).setOrigin(0.5).setDepth(DEPTH.BOARD);
  }

  interactionForPlayer() {
    const source = SOURCE_LAYOUT.find(({ id }) => id === this.hoverSourceId);
    if (source) return { type: 'source', id: source.id, x: source.x, y: source.y };
    const requiredCentre = REQUIRED.x + REQUIRED.cols * REQUIRED.cell / 2;
    if (Math.abs(this.walker.x - requiredCentre) <= 260) return { type: 'board', board: 'required', x: requiredCentre, y: REQUIRED.y };
    const freeCentre = FREE.x + FREE.cols * FREE.cell / 2;
    if (Math.abs(this.walker.x - freeCentre) <= 270) return { type: 'board', board: 'free', x: freeCentre, y: FREE.y };
    if (this.studio.isComplete() && Math.abs(this.walker.x - EXIT_X) <= 105) return { type: 'exit', x: EXIT_X, y: 300 };
    return null;
  }

  promptFor(interaction) {
    if (!interaction) return null;
    if (interaction.type === 'source') {
      const item = this.studio.source(interaction.id);
      const pigment = this.studio.pigment(item.pigment);
      return {
        text: this.tutorialSeen.extract
          ? `${item.object}\nRIGHT-HOLD TO ADD ${pigment.name}`
          : 'POINT AT A SMALL OBJECT\nRIGHT-HOLD TO ADD ITS COLOR TO YOUR PALETTE',
        color: pigment.color,
        x: interaction.x,
        y: interaction.y - 115,
      };
    }
    if (interaction.type === 'exit') {
      return { text: this.tutorialSeen.exit ? 'THE NEXT ROOM OPENS' : 'POINT AT THE DOOR\nLEFT-HOLD TO CARRY THE FRAMED VASE FORWARD', color: PAPER.cyan, x: EXIT_X, y: 286 };
    }
    if (!this.selected || this.selected.board !== interaction.board) {
      return {
        text: this.tutorialSeen.select ? 'CHOOSE ANOTHER SQUARE' : 'CLICK A SQUARE\nON THIS CANVAS',
        color: PAPER.cyan,
        x: interaction.x,
        y: interaction.y - 22,
      };
    }
    const snapshot = this.studio.snapshot();
    const occupied = interaction.board === 'required'
      ? snapshot.required[this.selected.cell]
      : snapshot.free[this.selected.cell];
    if (occupied && snapshot.palette.length === 0) {
      const pigment = this.studio.pigment(this.studio.source(occupied).pigment);
      return {
        text: this.tutorialSeen.lift ? `RIGHT-HOLD TO LIFT\n${pigment.name}` : 'RIGHT-HOLD THIS SQUARE\nTO LIFT THE COLOR BACK OUT',
        color: pigment.color,
        x: interaction.x,
        y: interaction.y - 22,
      };
    }
    if (snapshot.palette.length && !occupied) {
      return {
        text: this.tutorialSeen.fill ? 'LEFT-HOLD TO PAINT\nTHE MATCHING COLOR' : 'LEFT-HOLD THIS SQUARE\nTO PAINT THE MATCHING COLOR',
        color: PAPER.cyan,
        x: interaction.x,
        y: interaction.y - 22,
      };
    }
    return { text: 'THE CHOSEN SQUARE\nIS WAITING FOR COLOR', color: PAPER.graphiteSoft, x: interaction.x, y: interaction.y - 22 };
  }

  showPrompt(spec) {
    this.promptFrame.clear();
    if (!spec) {
      this.promptText.setVisible(false);
      return;
    }
    this.promptText.setText(spec.text).setPosition(spec.x, spec.y).setColor(colorCss(spec.color)).setVisible(true);
    const bounds = this.promptText.getBounds();
    this.promptFrame.fillStyle(PAPER.sheetHigh, 0.95).fillRoundedRect(bounds.x - 5, bounds.y - 4, bounds.width + 10, bounds.height + 8, 3);
    this.promptFrame.lineStyle(1.5, PAPER.graphiteSoft, 0.82);
    draftRect(this.promptFrame, makeRandom(Math.floor(spec.x * 31 + spec.y)), bounds.x - 5, bounds.y - 4, bounds.width + 10, bounds.height + 8, {
      overshoot: 3, jitter: 0.7,
    });
    this.promptFrame.lineStyle(2.4, spec.color, 0.84);
    draftLine(this.promptFrame, makeRandom(Math.floor(spec.x * 13)), bounds.x + 8, bounds.y + bounds.height + 1, bounds.x + bounds.width - 8, bounds.y + bounds.height + 1, {
      overshoot: 0, jitter: 1, segments: 5,
    });
  }

  handleEvents() {
    this.studio.drainEvents().forEach((event) => {
      if (event.type === 'wrong-required-color') {
        const wanted = this.studio.pigment(event.wanted);
        this.localFeedback(`THE REFERENCE NEEDS\n${wanted.name} HERE`, wanted.color);
      } else if (event.type === 'copy-complete') {
        this.frameReveal = 0;
        this.tweens.add({ targets: this, frameReveal: 1, duration: 720, ease: 'Back.easeOut' });
        this.localFeedback('THE STILL LIFE IS COMPLETE.\nSOMETHING SHINES BEHIND THE EMPTY SHELF.', PAPER.bookCloth);
      } else if (event.type === 'copy-opened-again') {
        this.frameReveal = 0;
        this.localFeedback('THE FRAME OPENS.\nTHE EXIT CLOSES.', PAPER.fault);
      }
    });
  }

  localFeedback(text, color) {
    const note = this.add.text(this.walker.x, this.walker.y - 90, text, {
      fontFamily: MONO, fontSize: '10px', color: colorCss(color), align: 'center', lineSpacing: 4,
      backgroundColor: '#fdfcf8ee', padding: { x: 10, y: 8 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.PROMPT + 3);
    this.tweens.add({ targets: note, y: note.y - 12, alpha: 0, delay: 900, duration: 650, onComplete: () => note.destroy() });
  }

  drawHeld(time) {
    this.heldArt.clear();
    const snapshot = this.studio.snapshot();
    const paletteSources = snapshot.palette.map((id) => this.studio.source(id)).filter(Boolean);
    let progressId = null;
    if (this.hold.key?.startsWith('source:')) {
      const sourceId = this.hold.key.slice('source:'.length);
      progressId = this.studio.source(sourceId)?.pigment ?? null;
    } else if (this.hold.key?.startsWith('lift:')) {
      const [, boardName, cell] = this.hold.key.split(':');
      const sourceId = this.occupiedSourceId(boardName, cell, snapshot);
      progressId = sourceId ? this.studio.source(sourceId)?.pigment : null;
    }
    if (!paletteSources.length && !progressId) return;
    drawPigmentHalo(this.heldArt, {
      x: this.walker.x,
      y: this.walker.y - 50,
      pigments: STUDIO_PIGMENTS,
      activeIds: paletteSources.map((source) => source.pigment),
      selectedId: null,
      progressId,
      progress: this.hold.progress / HOLD_SECONDS,
      time,
    });
  }

  stepPlayer() {
    if (this.transitioning) {
      this.walker.body.setVelocityX(0);
      return;
    }
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    const jump = this.keys.up.isDown || this.keys.w.isDown || this.keys.space.isDown;
    this.walker.body.setVelocityX(left && !right ? -MOVE_SPEED : right && !left ? MOVE_SPEED : 0);
    if (jump && this.walker.body.blocked.down) this.walker.body.setVelocityY(JUMP_VELOCITY);
  }

  updateFigure(time) {
    const moving = Math.abs(this.walker.body.velocity.x) > 8;
    if (this.walker.body.velocity.x < -8) this.playerFacing = -1;
    if (this.walker.body.velocity.x > 8) this.playerFacing = 1;
    this.playerAnimation = moving ? 'walk' : 'idle';
    const pointer = this.input.activePointer;
    drawPaintedPlayer(this.figure, this.walker, pointer);
  }

  seedStrokes() {
    const map = { red: 'red', orange: 'orange', pink: 'red', yellow: 'yellow', green: 'green', teal: 'blue', blue: 'blue', violet: 'violet' };
    return REQUIRED_CELLS.map(({ cell, pigment }) => {
      const [col, row] = cell.split(',').map(Number);
      return {
        color: map[pigment],
        points: [
          { x: 80 + col * 125, y: 50 + row * 88 },
          { x: 150 + col * 125, y: 100 + row * 88 },
        ],
      };
    });
  }

  goToTrain() {
    this.transitioning = true;
    this.registry.set('chapter4Drawing', this.seedStrokes());
    // Part III always begins before the six world colors. The studio teaches
    // the ring, but its finite room colors do not skip the train-yard pickups.
    this.registry.set('chapter4Pigments', []);
    this.tweens.add({ targets: this.music, volume: 0, duration: 420 });
    this.cameras.main.fadeOut(420, 247, 244, 236);
    this.time.delayedCall(450, () => this.scene.start('PigmentTrain'));
  }

  objectiveText() {
    const snapshot = this.studio.snapshot();
    if (snapshot.complete && !this.pigmentStoneCollected) return 'the vase is finished; return to the empty cabinet for the revealed color stone';
    if (snapshot.complete) return 'the vase is framed and the color stone is collected; continue to the train';
    if (Object.keys(snapshot.free).length) return 'a borrowed color is on the practice canvas; lift it back to finish the vase';
    if (snapshot.palette.length) return 'the carried palette will match a collected color to each outlined square';
    return `borrow colors from the miniature objects and paint the still life (${Object.keys(snapshot.required).length} / ${REQUIRED_CELLS.length})`;
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.stepPlayer();
    this.stepSuction(dt);
    this.updateFigure(time);
    this.tryCollectMagicStone();
    this.redrawMagicStone(time);
    this.drawHeld(time);
    this.drawSuction();
    this.currentInteraction = this.interactionForPlayer();
    this.showPrompt(this.promptFor(this.currentInteraction));
    if (this.frameReveal > 0 && this.frameReveal < 1) this.redrawBoards();
    this.grain.tilePositionX = this.cameras.main.scrollX * 0.34 + Math.sin(time / 5200) * 4;
  }

  textState() {
    const snapshot = this.studio.snapshot();
    return {
      scene: 'DrawingStudio',
      coordinateSystem: 'world pixels; origin top-left; x right; y down',
      objective: this.objectiveText(),
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        onGround: this.walker.body.blocked.down,
        facing: this.playerFacing < 0 ? 'left' : 'right',
        animation: this.playerAnimation,
      },
      selected: this.selected,
      interaction: this.currentInteraction,
      pointerSelection: {
        source: this.hoverSourceId,
        suctionProgress: Number((this.hold.progress / HOLD_SECONDS).toFixed(2)),
      },
      tutorialSeen: { ...this.tutorialSeen },
      canvasGrid: {
        cell: CANVAS_CELL,
        reference: { cols: REFERENCE.cols, rows: REFERENCE.rows },
        copy: { cols: REQUIRED.cols, rows: REQUIRED.rows },
        free: { cols: FREE.cols, rows: FREE.rows },
      },
      magicStone: {
        id: 'chapter-4',
        x: PIGMENT_STONE.x,
        y: PIGMENT_STONE.y,
        collected: this.pigmentStoneCollected,
        unlocked: snapshot.allSourcesExtracted,
        visible: snapshot.allSourcesExtracted && !this.pigmentStoneCollected,
      },
      ...snapshot,
      music: { playing: Boolean(this.music?.isPlaying), volume: Number((this.music?.volume ?? 0).toFixed(2)) },
    };
  }
}
