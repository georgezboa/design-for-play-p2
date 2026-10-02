import Phaser from 'phaser';
import {
  BAY_TITLES,
  CEILING_Y,
  CELL,
  DOOR,
  FLOOR_ROW,
  FLOOR_SPANS,
  FLOOR_Y,
  FOLDS,
  GRID,
  JUMP_VELOCITY,
  MOVE_SPEED,
  PAINTINGS,
  PIGMENT_ZONE,
  PLATE_GRID,
  RACK_Y,
  REACH,
  SEALED_RECTS,
  SIGN_LABELS,
  VARNISH_RECTS,
  VIEW,
  WAINSCOT_Y,
  WINDOWS,
  WORLD,
  WRONG_ANSWER_LINES,
} from './carLayout.js';
import { colOf, createPaintedCar, idx, plateCell, rectPlateCells, rowOf } from './paintedCarModel.js';
import { PAPER } from './paperPalette.js';
import { createPaintedPlayer, drawPaintedPlayer, preloadPaintedPlayer } from './paintedPlayerFigure.js';
import { addFrames, addLayers, ensureCanvasTexture } from './art/artTextures.js';
import { paintCountry } from './art/countryArt.js';
import { paintCarriage, paintDoor } from './art/carriageArt.js';
import { CELL_STAMP, cellAtlasFrames, paintCellAtlas } from './art/cellArt.js';
import { draftBlockEdges, shadePit } from './art/pencilEdges.js';
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
  ArchiveCard,
  MONO,
  PaperTag,
  RestartHold,
  SERIF,
  UI,
  drawGlintMarker,
  noteAt,
  px,
  showTitleCard,
} from './chapterUi.js';
import { PLATE_CELL, PLATE_TEX, buildPlateTexture, drawGreyCell, ensureMarkTextures, paintedPlateKey } from './platePencil.js';
import { drawMaraSilhouette } from './maraFigure.js';
import { devParam } from '../../devMode.js';
import { createFallGuard, placeBody } from './fallGuard.js';

// Chapter 4 // THE PAINTED COUNTRY — Part I, "Under the gouache".
//
// The country is Rosa's childhood drawing of the orchard, painted over by the
// archive in grey. PAINT (left mouse · SPACE · pad A) rebuilds what she
// remembered; WASH (right mouse · SHIFT · pad B) strips the archive's grey and
// shows the pencil underneath. Three plates hang too high to reach from the
// floor; washing each one reveals a large mark and, somewhere else on it,
// Mara's small hawthorn. The door asks which mark she left in all three.
//
// No persistent HUD in Chapter 4: every prompt is a paper tag beside the thing
// it is about. This file owns pixels and input only; every rule lives in
// paintedCarModel.js.

const DEPTH = {
  SHEET: 0,
  COUNTRY: 5,
  WALL: 10,
  VARNISH: 14,
  FIXTURE: 18,
  DRAWING: 22,
  PAINT: 30,
  BLOCK: 32,
  PICTURE: 36,
  DOOR: 40,
  MARA: 43,
  FIGURE: 44,
  CURSOR: 48,
  GRAIN: 60,
  AIR: 70,
  HUD: 90,
};

// The plate viewer, in screen space.
const VIEWER = Object.freeze({ x: 240, y: 104, w: PLATE_TEX.w, h: PLATE_TEX.h });
// The notes: the three plates side by side.
const NOTE_PLATE = Object.freeze({ w: 240, h: 140, y: 196, gap: 24 });

const QA_ROUTES = ['door-view', 'bay-b', 'bay-c', 'plate-1', 'plate-2', 'plate-3', 'plates-done', 'door-open', 'intro'];

export class PaintedCountryScene extends Phaser.Scene {
  constructor() {
    super('PaintedCountry');
  }

  preload() {
    // The door's signs and the plates' marks are drawn, not loaded
    // (art/marksArt.js, in create()).
    preloadPaintedPlayer(this);
    if (!this.cache.audio.exists('chapter4-drawing-music')) {
      this.load.audio('chapter4-drawing-music', '/assets/music/ch4/4.3_debussy_reflets_dans_leau.mp3');
    }
  }

  create(data = {}) {
    // A missing or undecodable score file leaves the scene silent rather than
    // throwing from sound.add (Phaser only caches audio that loaded).
    this.music = this.cache.audio.exists('chapter4-drawing-music')
      ? this.sound.add('chapter4-drawing-music', { loop: true, volume: 0.42 })
      : null;
    const playMusic = () => { if (!this.music?.isPlaying) this.music?.play(); };
    if (this.sound.locked) this.sound.once('unlocked', playMusic);
    else playMusic();
    this.input.once('pointerdown', playMusic);
    this.input.keyboard.once('keydown', playMusic);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());

    this.qa = devParam('qa');
    this.advancingToStudio = false;
    this.registry.set('chapter4Pigments', []);
    this.registry.remove('chapter4ArchiveAnswer');
    this.rnd = makeRandom(0x9a17);
    this.motes = [];
    this.boilTargets = [];
    this.car = createPaintedCar();
    this.cellBodies = new Map();
    this.paintDirty = true;
    this.platesDirty = true;
    this.lastBrushCell = null;
    this.lastPlateCell = null;
    this.hoveredPictureId = null;
    this.hoveredDoorSign = null;
    this.tutorialSeen = { move: false, bridge: false, wash: false, varnish: false, pigment: false };
    this.hasJumped = false;
    this.activeTutorial = null;
    this.noteThrottle = {};
    this.hintedSmallMark = new Set();
    this.notesPulse = false;
    this.locked = false;
    this.mara = null;
    // Falls: see fallGuard.js (alpha A3-1). Section starts sit on the
    // carriage's own floor, which no wash can remove: the cold end, just over
    // the first hole, just past the long wall, and just over the second hole.
    this.fallGuard = createFallGuard({
      start: { x: 200, y: FLOOR_Y - 30 },
      sections: [
        { x: FLOOR_SPANS[1].from * CELL + 2 * CELL, y: FLOOR_Y - 30 },
        { x: 109 * CELL + 10, y: FLOOR_Y - 30 },
        { x: FLOOR_SPANS[2].from * CELL + 2 * CELL, y: FLOOR_Y - 30 },
      ],
      bodyWidth: 16,
      fallY: VIEW.h + 120,
      isFloorAt: (x, y) => this.car.isTerrain(colOf(x), rowOf(y + 34)),
    });

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, -400, WORLD.w, WORLD.h + 900);

    this.buildSheet();
    this.buildCountry();
    this.buildCarriage();
    this.buildGrid();
    this.buildVarnish();
    this.buildSealed();
    ensureMarkTextures(this);
    PAINTINGS.forEach((plate) => buildPlateTexture(this, plate));
    this.buildGallery();
    this.buildDoor();
    this.buildSolids();
    this.buildPlayer();
    this.paintLayer = this.add.blitter(0, 0, 'ch4-cells').setDepth(DEPTH.PAINT);
    this.blockLayer = this.add.blitter(0, 0, 'ch4-cells').setDepth(DEPTH.BLOCK);
    // the grey's pencil contour, redrawn with the stamps (alpha R3 · R6)
    this.blockEdges = this.add.graphics().setDepth(DEPTH.BLOCK + 0.5);
    this.brushCursor = this.graphics(DEPTH.CURSOR);
    this.doorLayer = this.graphics(DEPTH.DOOR);
    this.markerLayer = this.graphics(DEPTH.CURSOR - 1);
    this.maraLayer = this.graphics(DEPTH.MARA);

    this.buildGrain();
    this.buildAir();
    this.buildHud();
    this.buildViewer();

    this.brush = new BrushInput(this, {
      anchor: () => ({ x: this.walker.x, y: this.walker.y }),
      // The virtual cursor never leaves the brush's reach.
      radius: REACH - 2,
    });
    this.brush.cursor.setDepth(DEPTH.CURSOR + 1);
    this.tag = new PaperTag(this, { depth: DEPTH.HUD + 4 });
    this.card = new ArchiveCard(this, { depth: DEPTH.HUD + 40 });
    this.restart = new RestartHold(this, { onRestart: () => this.scene.restart({ skipIntro: true }) });

    this.car.state.blocks.forEach((key) => this.addCellBody(key % GRID.w, Math.floor(key / GRID.w)));
    this.input.mouse?.disableContextMenu();

    this.time.addEvent({
      delay: 1000 / 12,
      loop: true,
      callback: () => this.boilTargets.forEach((redraw) => redraw()),
    });

    this.applyQaRoute();
    if (!data.skipIntro && (!this.qa || this.qa === 'intro')) this.playIntro();
  }

  graphics(depth) {
    return this.add.graphics().setDepth(depth);
  }

  // The chapter opens the way Chapter 1 opens an act: a title on the walnut
  // band, then one short archive card.
  playIntro() {
    this.locked = true;
    showTitleCard(this, {
      kicker: 'CHAPTER 4 · THE PAINTED COUNTRY',
      main: 'I · UNDER THE GOUACHE',
      onDone: () => {
        this.card.show({
          stamp: 'CLAIM 1978-0412 · SECOND CLAIM',
          title: 'Bellwether Orchard',
          lines: ['Address not on file.', 'Contents: drawings (a child\'s), painted over for the record.'],
          closeHint: `${this.brush.label('read')} · CLOSE`,
        }, () => { this.locked = false; });
      },
    });
  }

  applyQaRoute() {
    // Dev-only: devParam() is null in production, so ?qa= cannot skip a thing.
    const qa = this.qa;
    if (!QA_ROUTES.includes(qa)) return;
    const standAt = (x) => {
      this.walker.setPosition(x, FLOOR_Y - 30);
      this.cameras.main.centerOn(x, VIEW.h / 2);
    };
    if (qa === 'bay-b') standAt(1060);
    if (qa === 'bay-c') standAt(1960);
    if (qa === 'door-view') standAt(DOOR.x - 82);
    const plateMatch = qa.match(/^plate-([123])$/);
    if (plateMatch) {
      const plate = PAINTINGS[Number(plateMatch[1]) - 1];
      this.walker.setPosition(plate.x + plate.w / 2, FLOOR_Y - 30);
      this.openPicture(plate);
    }
    if (qa === 'plates-done' || qa === 'door-open') {
      PAINTINGS.forEach((plate) => this.car.developPlate(plate.id));
      this.car.drainEvents();
      this.platesDirty = true;
      standAt(DOOR.x - 82);
      this.bridgeForQa();
      if (qa === 'door-open') this.time.delayedCall(400, () => this.answerDoor(DOOR.correct));
    }
  }

  // Dev only: lay the two floor gaps so a QA run can walk to the door.
  bridgeForQa() {
    for (let i = 0; i < FLOOR_SPANS.length - 1; i += 1) {
      for (let cx = FLOOR_SPANS[i].to; cx < FLOOR_SPANS[i + 1].from; cx += 1) {
        this.car.state.painted.add(idx(cx, FLOOR_ROW));
        this.addCellBody(cx, FLOOR_ROW);
      }
    }
    this.paintDirty = true;
  }

  // =========================================================== the sheet

  buildSheet() {
    const g = this.graphics(DEPTH.SHEET);
    g.fillStyle(PAPER.sheet, 1);
    g.fillRect(0, 0, WORLD.w, WORLD.h);

    FOLDS.forEach((x, i) => {
      g.fillStyle(i === 0 ? PAPER.sheetMid : PAPER.sheetLow, 0.4);
      g.fillRect(x, 0, WORLD.w - x, WORLD.h);
      g.lineStyle(1, PAPER.fold, 0.9);
      draftLine(g, this.rnd, x, 0, x, WORLD.h, { overshoot: 0, jitter: 1.8, segments: 16 });
      g.fillStyle(PAPER.kraft, 0.3);
      g.fillRect(x - 8, WAINSCOT_Y - 34, 16, 78);
    });
  }

  // The squared paper the child ruled before she drew anything.
  buildGrid() {
    const g = this.graphics(DEPTH.WALL + 2);
    g.lineStyle(1, PAPER.graphiteFaint, 0.13);
    const top = CEILING_Y;
    for (let cx = 0; cx <= GRID.w; cx += 1) g.lineBetween(cx * CELL, top, cx * CELL, FLOOR_Y);
    for (let cy = Math.ceil(top / CELL); cy <= FLOOR_ROW; cy += 1) {
      g.lineBetween(0, cy * CELL, WORLD.w, cy * CELL);
    }
  }

  // The country through the windows: three views of Rosa's Bellwether,
  // drawn in pencil and waiting for their colour. Each window blooms when
  // its plate comes clear; all of the car does when the door opens.
  buildCountry() {
    const container = this.add.container(0, 0).setDepth(DEPTH.COUNTRY);
    const sky = this.add.graphics();
    sky.fillStyle(PAPER.sheetHigh, 1);
    WINDOWS.forEach((win) => sky.fillRect(win.x, win.y, win.w, win.h));
    container.add(sky);
    const views = [
      [{ kind: 'farm', x: 40, s: 0.85 }, { kind: 'orchard', x: 170, s: 0.6, n: 2 }],
      [{ kind: 'orchard', x: 10, s: 0.7, n: 3 }, { kind: 'hawthorn', x: 160, s: 0.9 }, { kind: 'tree', x: 220, s: 0.7 }],
      [{ kind: 'house', x: 30, s: 0.75, lit: true }, { kind: 'orchard', x: 120, s: 0.65, n: 3 }],
    ];
    this.windowViews = WINDOWS.map((win, i) => addLayers(this, `ch4-gallery-window-${i}`, () => paintCountry({
      w: win.w + 20, h: win.h + 10, seed: 0x3a1 + i * 97, horizon: 0.3, features: views[i], washScale: 0.5, density: 0.6,
    }), { x: win.x - 10, y: win.y - 5, depth: 0, washAlpha: 0, container }));

    const mask = this.add.graphics().setVisible(false);
    mask.fillStyle(0xffffff, 1);
    WINDOWS.forEach((win) => mask.fillRect(win.x, win.y, win.w, win.h));
    container.setMask(mask.createGeometryMask());
  }

  buildCarriage() {
    const g = this.graphics(DEPTH.WALL);
    g.fillStyle(PAPER.sheetLow, 1);
    g.fillRect(0, 0, WORLD.w, CEILING_Y);
    g.fillStyle(PAPER.sheetMid, 1);
    g.fillRect(0, WAINSCOT_Y, WORLD.w, FLOOR_Y - WAINSCOT_Y);

    g.fillStyle(PAPER.sheetLow, 1);
    FLOOR_SPANS.forEach((span) =>
      g.fillRect(span.from * CELL, FLOOR_Y, (span.to - span.from) * CELL, WORLD.h - FLOOR_Y),
    );
    FLOOR_SPANS.forEach((span) =>
      hatchRect(g, this.rnd, span.from * CELL, FLOOR_Y, (span.to - span.from) * CELL, 46, {
        spacing: 17,
        alpha: 0.2,
        flip: true,
      }),
    );

    // The car itself, drawn: panels, curtains, the rack, lamps, the stove.
    // Its washes bloom in when the door opens.
    this.carriageArt = addLayers(this, 'ch4-gallery-car', () => paintCarriage({
      w: WORLD.w,
      h: WORLD.h,
      ceilingY: CEILING_Y,
      rackY: RACK_Y,
      wainscotY: WAINSCOT_Y,
      floorY: FLOOR_Y,
      windows: WINDOWS,
      skip: [{ x0: 102 * CELL - 20, x1: 108 * CELL + 20 }, { x0: DOOR.x - 10, x1: WORLD.w }],
      stoveX: 330,
      railFrom: 960,
      railTo: 1900,
    }), { depth: DEPTH.WALL + 2.5, washAlpha: 0 });

    // The torn edges of the two holes.
    for (let i = 0; i < FLOOR_SPANS.length - 1; i += 1) {
      const hole = { x: FLOOR_SPANS[i].to * CELL, w: (FLOOR_SPANS[i + 1].from - FLOOR_SPANS[i].to) * CELL };
      const h = this.graphics(DEPTH.WALL + 1);
      h.fillStyle(PAPER.sheetHigh, 1);
      h.fillRect(hole.x, FLOOR_Y, hole.w, WORLD.h - FLOOR_Y);
      shadePit(h, hole.x, FLOOR_Y, hole.w, WORLD.h - FLOOR_Y, { seed: 0x9170 + i });
      h.lineStyle(1.6, PAPER.deckle, 0.95);
      [hole.x, hole.x + hole.w].forEach((x) =>
        draftLine(h, this.rnd, x, FLOOR_Y, x, WORLD.h, { overshoot: 0, jitter: 2.6, segments: 10 }),
      );
    }

    // Rosa's pencil under the long wall: an orchard row, only visible once
    // the grey over it has been washed away.
    const under = this.graphics(DEPTH.WALL + 3);
    const wall = { x: 102 * CELL, y: CEILING_Y, w: 6 * CELL, h: FLOOR_Y - CEILING_Y };
    const rnd = makeRandom(0x0dd1);
    under.lineStyle(1.6, PAPER.graphite, 0.5);
    [[wall.x + 30, 250], [wall.x + 90, 300]].forEach(([x, y]) => {
      under.strokeCircle(x, y - 60, 26);
      draftLine(under, rnd, x, y - 36, x, FLOOR_Y, { overshoot: 0, jitter: 1 });
      under.fillStyle(0xb4453a, 0.4);
      for (let i = 0; i < 4; i += 1) under.fillCircle(x - 14 + rnd() * 28, y - 74 + rnd() * 26, 3.5);
    });
    under.lineStyle(1.2, PAPER.graphiteSoft, 0.55);
    draftLine(under, rnd, wall.x, 160, wall.x + wall.w, 150, { overshoot: 0, jitter: 2 });

    const draw = this.graphics(DEPTH.DRAWING);
    const boil = () => {
      const r = makeRandom(0x5eed + Math.floor(this.time.now / 83));
      draw.clear();
      draw.lineStyle(1.9, PAPER.graphite, 0.94);
      [CEILING_Y, WAINSCOT_Y].forEach((y) =>
        draftLine(draw, r, 0, y, WORLD.w, y, { overshoot: 0, jitter: 1.1, segments: 40 }),
      );
      FLOOR_SPANS.forEach((span) =>
        draftLine(draw, r, span.from * CELL, FLOOR_Y, span.to * CELL, FLOOR_Y, {
          overshoot: 0,
          jitter: 1.2,
          segments: 12,
        }),
      );
      draw.lineStyle(1.6, PAPER.graphite, 0.9);
      WINDOWS.forEach((win) => draftRect(draw, r, win.x, win.y, win.w, win.h, { overshoot: 7, jitter: 0.8 }));
      draw.lineStyle(1.3, PAPER.graphiteSoft, 0.9);
      draftLine(draw, r, 20, RACK_Y, WORLD.w - 20, RACK_Y, { overshoot: 0, jitter: 0.8, segments: 40 });
    };
    boil();
    this.boilTargets.push(boil);
  }

  // "Official record": hard gloss over the air under the orchard plate, drawn
  // per cell so it thins and vanishes as it is washed.
  buildVarnish() {
    this.ensureCellAtlas();
    this.varnishLayer = this.add.blitter(0, 0, 'ch4-cells').setDepth(DEPTH.VARNISH);
    this.varnishStamps = VARNISH_RECTS.map((rect) => this.add
      // Low in the gloss, clear of the (lowered) orchard plate's title.
      .text((rect.col + rect.cols / 2) * CELL, (rect.row + rect.rows * 0.72) * CELL, 'OFFICIAL RECORD', {
        fontFamily: MONO, fontSize: '16px', color: '#8a2a1e', fontStyle: 'bold', letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setAngle(-8)
      .setAlpha(0.42)
      .setDepth(DEPTH.VARNISH + 1));
    this.varnishDirty = true;
  }

  redrawVarnish() {
    const b = this.varnishLayer;
    b.clear();
    this.car.state.varnish.forEach((coats, key) => {
      const x = (key % GRID.w) * CELL - CELL_STAMP.bleed;
      const y = Math.floor(key / GRID.w) * CELL - CELL_STAMP.bleed;
      b.create(x, y, `varnish-${Math.min(2, coats)}`);
    });
    VARNISH_RECTS.forEach((rect, i) => {
      let left = 0;
      for (let cx = rect.col; cx < rect.col + rect.cols; cx += 1) {
        for (let cy = rect.row; cy < rect.row + rect.rows; cy += 1) left += this.car.varnishAt(cx, cy) > 0 ? 1 : 0;
      }
      this.varnishStamps[i].setAlpha(0.42 * Math.min(1, left / (rect.cols * rect.rows) * 1.6));
    });
  }

  // The door's own face: sealed, so the signs can never be painted over.
  buildSealed() {
    const g = this.graphics(DEPTH.VARNISH);
    SEALED_RECTS.forEach((rect) => {
      const x = rect.col * CELL;
      const y = rect.row * CELL;
      g.fillStyle(PAPER.sheetHigh, 0.4).fillRect(x, y, rect.cols * CELL, rect.rows * CELL);
    });
  }

  // =========================================================== the gallery

  buildGallery() {
    const g = this.graphics(DEPTH.PICTURE);
    this.pictureViews = {};
    PAINTINGS.forEach((picture) => {
      const inset = 8;
      const plate = this.add
        .image(picture.x + inset, picture.y + inset, picture.key)
        .setOrigin(0)
        .setDepth(DEPTH.PICTURE)
        .setDisplaySize(picture.w - inset * 2, picture.h - inset * 2);
      // the same plate with Rosa's colour back in it, bloomed in on developing
      const painted = this.add
        .image(picture.x + inset, picture.y + inset, paintedPlateKey(picture))
        .setOrigin(0)
        .setDepth(DEPTH.PICTURE + 0.2)
        .setDisplaySize(picture.w - inset * 2, picture.h - inset * 2)
        .setAlpha(0);
      const cover = this.graphics(DEPTH.PICTURE + 0.5);

      g.lineStyle(3, PAPER.graphite, 0.94);
      draftRect(g, this.rnd, picture.x, picture.y, picture.w, picture.h, { overshoot: 5, jitter: 0.6 });
      // a plain wooden frame, kraft-washed
      g.fillStyle(PAPER.kraft, 0.75);
      g.fillRect(picture.x, picture.y, picture.w, inset);
      g.fillRect(picture.x, picture.y + picture.h - inset, picture.w, inset);
      g.fillRect(picture.x, picture.y, inset, picture.h);
      g.fillRect(picture.x + picture.w - inset, picture.y, inset, picture.h);
      g.lineStyle(1.2, PAPER.graphiteSoft, 0.7);
      draftRect(g, this.rnd, picture.x + inset, picture.y + inset, picture.w - inset * 2, picture.h - inset * 2, {
        overshoot: 2,
        jitter: 0.5,
      });
      g.lineStyle(1.1, PAPER.graphiteSoft, 0.8);
      g.lineBetween(picture.x + picture.w / 2, picture.y, picture.x + picture.w / 2 - 18, RACK_Y);
      g.lineBetween(picture.x + picture.w / 2, picture.y, picture.x + picture.w / 2 + 18, RACK_Y);

      this.add
        .text(picture.x + picture.w / 2, picture.y + picture.h + 8, picture.title, {
          fontFamily: MONO,
          fontSize: '11px',
          color: '#6f675c',
          letterSpacing: 1.4,
        })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.PICTURE);
      this.pictureViews[picture.id] = { plate, painted, cover, bloomed: false };
    });
  }

  redrawWallPlates() {
    const inset = 8;
    PAINTINGS.forEach((picture) => {
      const view = this.pictureViews[picture.id];
      const state = this.car.plateState(picture.id);
      const g = view.cover;
      g.clear();
      if (state.developed) {
        if (!view.bloomed) {
          view.bloomed = true;
          this.tweens.add({ targets: view.painted, alpha: 1, duration: 1400, ease: 'Sine.easeOut' });
          // its window's country takes its colour back too
          this.windowViews?.[PAINTINGS.indexOf(picture)]?.bloomAll({ duration: 1800, stagger: 140 });
        }
        return;
      }
      const w = picture.w - inset * 2;
      const h = picture.h - inset * 2;
      const cw = w / PLATE_GRID.cols;
      const ch = h / PLATE_GRID.rows;
      for (let r = 0; r < PLATE_GRID.rows; r += 1) {
        for (let c = 0; c < PLATE_GRID.cols; c += 1) {
          const cell = plateCell(c, r);
          if (!state.grey.has(cell)) continue;
          g.fillStyle(0x8f8a82, 0.97).fillRect(picture.x + inset + c * cw, picture.y + inset + r * ch, cw + 0.6, ch + 0.6);
          if (state.varnish.has(cell)) g.fillStyle(0xfffaf0, 0.35).fillRect(picture.x + inset + c * cw, picture.y + inset + r * ch, cw, ch);
        }
      }
    });
  }

  // ============================================================== the door

  buildDoor() {
    // The vestibule door, drawn (art/carriageArt.js); it fades as it opens.
    const face = addLayers(this, 'ch4-gallery-door', () => paintDoor(DOOR.w, DOOR.h), {
      x: DOOR.x, y: DOOR.y, depth: DEPTH.DOOR - 1, washAlpha: 1, groups: ['red', 'yellow'],
    });
    const base = this.graphics(DEPTH.DOOR - 1.5);
    base.fillStyle(PAPER.sheetMid, 1).fillRect(DOOR.x + 2, DOOR.y + 2, DOOR.w - 4, DOOR.h - 4);
    this.doorFace = [base, ...face.images()];

    // The opening behind the door, shown when it swings: pencil light.
    this.doorway = this.graphics(DEPTH.DOOR - 2);
    this.doorway.fillStyle(PAPER.sheetHigh, 1).fillRect(DOOR.x + 6, DOOR.y + 6, DOOR.w - 12, DOOR.h - 6);
    this.doorway.lineStyle(1.2, PAPER.graphiteFaint, 0.8);
    for (let x = DOOR.x + 20; x < DOOR.x + DOOR.w; x += 24) this.doorway.lineBetween(x, DOOR.y + 10, x - 30, DOOR.y + DOOR.h);

    this.doorPrompt = this.add
      .text(DOOR.x + DOOR.w / 2, DOOR.y - 12, DOOR.prompt.replace(' IN ALL', '\nIN ALL'), {
        fontFamily: MONO,
        fontSize: '12px',
        color: '#4a4640',
        align: 'center',
        lineSpacing: 4,
        letterSpacing: 1.2,
        wordWrap: { width: DOOR.w + 20 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.DOOR);

    this.panelArt = {};
    this.panelLabels = {};
    DOOR.panels.forEach((panel) => {
      this.panelArt[panel.sign] = this.add
        .image(panel.x + panel.w / 2, panel.y + panel.h / 2, `sign-${panel.sign}`)
        .setDepth(DEPTH.DOOR + 1)
        .setDisplaySize(panel.w - 6, panel.h - 6);
      this.panelLabels[panel.sign] = this.add
        .text(panel.x + panel.w / 2, panel.y + panel.h + 3, SIGN_LABELS[panel.sign], {
          fontFamily: MONO,
          fontSize: '11px',
          color: '#4a4640',
          letterSpacing: 0.6,
        })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.DOOR + 2);
    });
  }

  // ============================================================== physics

  buildSolids() {
    this.solids = this.add.group();
    const solid = (x, y, w, h) => {
      const object = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0);
      this.physics.add.existing(object, true);
      this.solids.add(object);
      return object;
    };
    FLOOR_SPANS.forEach((span) =>
      solid(span.from * CELL, FLOOR_Y, (span.to - span.from) * CELL, WORLD.h - FLOOR_Y),
    );
    solid(-24, -400, 24, WORLD.h + 500);
    solid(WORLD.w, -400, 24, WORLD.h + 500);
    // The ceiling: nothing climbs over the long wall.
    solid(0, CEILING_Y - 40, WORLD.w, 40);
  }

  addCellBody(cx, cy) {
    const key = idx(cx, cy);
    if (this.cellBodies.has(key)) return;
    const object = this.add.rectangle(cx * CELL + CELL / 2, cy * CELL + CELL / 2, CELL, CELL, 0xffffff, 0);
    this.physics.add.existing(object, true);
    this.solids.add(object);
    this.cellBodies.set(key, object);
  }

  removeCellBody(cx, cy) {
    const key = idx(cx, cy);
    const object = this.cellBodies.get(key);
    if (!object) return;
    this.solids.remove(object, true, true);
    this.cellBodies.delete(key);
  }

  buildPlayer() {
    this.walker = this.add.rectangle(200, 360, 16, 58, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.walker.body.setCollideWorldBounds(false);
    this.physics.add.collider(this.walker, this.solids);

    this.figure = createPaintedPlayer(this, DEPTH.FIGURE);
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(240, 160);

    this.keys = this.input.keyboard.addKeys({ a: 'A', d: 'D', w: 'W', e: 'E', enter: 'ENTER' });
    this.input.keyboard.addCapture(['SPACE', 'E', 'R', 'W']);
  }

  // ============================================================== surface

  buildGrain() {
    const key = buildPaperGrain(this);
    this.grain = this.add
      .tileSprite(0, 0, VIEW.w, VIEW.h, key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.GRAIN)
      .setAlpha(0.9);
  }

  buildAir() {
    for (let i = 0; i < 26; i += 1) {
      const mote = this.add
        .circle(this.rnd() * WORLD.w, this.rnd() * VIEW.h, this.rnd() > 0.75 ? 1.7 : 1.1, PAPER.graphiteSoft, 0.5)
        .setDepth(DEPTH.AIR);
      this.motes.push({ obj: mote, vx: 4 + this.rnd() * 9, vy: -2 + this.rnd() * 4, phase: this.rnd() * 6.28 });
    }
  }

  buildHud() {
    // No persistent HUD in Chapter 4. The mechanics are taught in place, by a
    // paper tag at the gap, the block, the varnish and the dry brush.
    this.hudBand = null;
    this.bayLabel = null;
    this.pigmentPot = this.graphics(DEPTH.FIGURE + 1);
    this.pigmentLabel = this.add.text(0, 0, '', {
      fontFamily: MONO, fontSize: '12px', color: UI.ink, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(DEPTH.FIGURE + 2).setVisible(false);

    // Bay names belong to the world, painted under the floor line.
    BAY_TITLES.forEach(({ x, title }) =>
      this.add
        .text(x + 28, FLOOR_Y + 22, title, {
          fontFamily: MONO,
          fontSize: '12px',
          color: '#8d8579',
          letterSpacing: 2,
        })
        .setDepth(DEPTH.WALL + 2),
    );
  }

  // The plate viewer: the plate, taken down and held close, under its grey.
  // The notes: the three plates side by side, as images, nothing written.
  buildViewer() {
    const D = DEPTH.HUD + 10;
    const fixed = (object) => object.setScrollFactor(0).setDepth(D);
    this.viewer = { open: false, mode: null, picture: null };
    const v = this.viewer;
    v.scrim = fixed(this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x1c130d, 0.78).setOrigin(0));
    v.card = fixed(this.add.graphics());
    v.card.fillStyle(0x000000, 0.3).fillRect(64, 36, VIEW.w - 120, VIEW.h - 64);
    v.card.fillStyle(UI.paper, 1).fillRect(58, 30, VIEW.w - 116, VIEW.h - 64);
    v.card.lineStyle(2, UI.brass, 0.9).strokeRect(58, 30, VIEW.w - 116, VIEW.h - 64);
    v.card.fillStyle(0x050403, 0.85).fillCircle(VIEW.w - 92, 60, 10);
    v.title = fixed(this.add.text(VIEW.w / 2, 52, '', {
      fontFamily: MONO, fontSize: '14px', color: UI.ink, fontStyle: 'bold', letterSpacing: 3,
    }).setOrigin(0.5, 0));
    v.plate = fixed(this.add.image(VIEWER.x, VIEWER.y, PAINTINGS[0].key).setOrigin(0).setDepth(D + 1));
    v.paint = fixed(this.add.image(VIEWER.x, VIEWER.y, paintedPlateKey(PAINTINGS[0])).setOrigin(0).setDepth(D + 1).setAlpha(0));
    v.frame = fixed(this.add.graphics().setDepth(D + 1));
    v.frame.lineStyle(3, PAPER.graphite, 0.9).strokeRect(VIEWER.x - 6, VIEWER.y - 6, VIEWER.w + 12, VIEWER.h + 12);
    v.grey = fixed(this.add.graphics().setDepth(D + 2));
    v.stamps = [0, 1].map(() => fixed(this.add.text(0, 0, 'OFFICIAL RECORD', {
      fontFamily: MONO, fontSize: '14px', color: '#8a2a1e', fontStyle: 'bold', letterSpacing: 3,
    }).setOrigin(0.5).setAngle(-9).setAlpha(0.7).setDepth(D + 3)));
    v.caption = fixed(this.add.text(VIEW.w / 2, VIEWER.y + VIEWER.h + 20, '', {
      fontFamily: SERIF, fontSize: px(15), color: '#3a2a1c', align: 'center', lineSpacing: 5,
      wordWrap: { width: 620 },
    }).setOrigin(0.5, 0));
    v.close = fixed(this.add.text(VIEW.w / 2, VIEW.h - 58, '', {
      fontFamily: MONO, fontSize: '12px', color: UI.inkSoft, letterSpacing: 2,
    }).setOrigin(0.5, 0));

    // notes
    v.notePlates = PAINTINGS.map((picture, i) => {
      const x = VIEW.w / 2 + (i - 1) * (NOTE_PLATE.w + NOTE_PLATE.gap) - NOTE_PLATE.w / 2;
      const img = fixed(this.add.image(x, NOTE_PLATE.y, picture.key).setOrigin(0).setDisplaySize(NOTE_PLATE.w, NOTE_PLATE.h).setDepth(D + 1));
      const label = fixed(this.add.text(x + NOTE_PLATE.w / 2, NOTE_PLATE.y + NOTE_PLATE.h + 12, picture.title, {
        fontFamily: MONO, fontSize: '12px', color: UI.ink, fontStyle: 'bold', letterSpacing: 1,
      }).setOrigin(0.5, 0).setDepth(D + 1));
      return { picture, img, label, x };
    });
    v.noteLayer = fixed(this.add.graphics().setDepth(D + 2));
    this.setViewerVisible(false);
  }

  viewerObjects() {
    const v = this.viewer;
    return [v.scrim, v.card, v.title, v.plate, v.paint, v.frame, v.grey, ...v.stamps, v.caption, v.close, v.noteLayer,
      ...v.notePlates.flatMap((n) => [n.img, n.label])];
  }

  setViewerVisible(on, mode = null) {
    const v = this.viewer;
    v.open = on;
    v.mode = on ? mode : null;
    this.viewerObjects().forEach((obj) => obj.setVisible(false));
    if (on) {
      [v.scrim, v.card, v.title, v.close].forEach((obj) => obj.setVisible(true));
      if (mode === 'plate') [v.plate, v.paint, v.frame, v.grey, v.caption].forEach((obj) => obj.setVisible(true));
      if (mode === 'notes') {
        v.noteLayer.setVisible(true);
        v.notePlates.forEach((n) => { n.img.setVisible(true); n.label.setVisible(true); });
      }
      this.brushCursor.clear();
      this.tag.hide();
      this.brush.setAnchor(null);
    } else {
      v.picture = null;
      this.lastPlateCell = null;
      this.brush?.setAnchor(() => ({ x: this.walker.x, y: this.walker.y }), REACH - 2);
    }
  }

  openPicture(picture) {
    const v = this.viewer;
    this.setViewerVisible(true, 'plate');
    v.picture = picture;
    v.title.setText(picture.title);
    v.plate.setTexture(picture.key).setDisplaySize(VIEWER.w, VIEWER.h);
    this.tweens.killTweensOf(v.paint);
    v.paint.setTexture(paintedPlateKey(picture)).setDisplaySize(VIEWER.w, VIEWER.h).setAlpha(this.car.plateState(picture.id).developed ? 1 : 0);
    v.close.setText(`${this.brush.label('wash')} · WASH THE GREY      ${this.brush.label('read')} · PUT IT BACK`);
    picture.varnishRects.forEach((rect, i) => {
      v.stamps[i]?.setPosition(VIEWER.x + (rect.c + rect.w / 2) * PLATE_CELL, VIEWER.y + (rect.r + rect.h / 2) * PLATE_CELL);
    });
    this.lastPlateCell = null;
    this.drawViewerPlate();
  }

  drawViewerPlate() {
    const v = this.viewer;
    const picture = v.picture;
    if (!picture) return;
    const state = this.car.plateState(picture.id);
    const g = v.grey;
    g.clear();
    for (let r = 0; r < PLATE_GRID.rows; r += 1) {
      for (let c = 0; c < PLATE_GRID.cols; c += 1) {
        const cell = plateCell(c, r);
        if (!state.grey.has(cell) && !state.varnish.has(cell)) continue;
        drawGreyCell(g, VIEWER.x + c * PLATE_CELL, VIEWER.y + r * PLATE_CELL, PLATE_CELL, 0x51a + cell * 7, {
          varnish: state.varnish.get(cell) ?? 0,
        });
      }
    }
    picture.varnishRects.forEach((rect, i) => {
      const left = rectPlateCells(rect).filter((cell) => state.varnish.has(cell)).length;
      v.stamps[i]?.setVisible(v.open && v.mode === 'plate' && left > 0).setAlpha(0.3 + 0.4 * (left / (rect.w * rect.h)));
    });
    for (let i = picture.varnishRects.length; i < v.stamps.length; i += 1) v.stamps[i].setVisible(false);
    v.caption.setText(state.developed ? picture.caption : '');
    // The plate comes clear: Rosa's colour blooms back into it.
    if (state.developed && v.paint.alpha === 0 && !this.tweens.isTweening(v.paint)) {
      this.tweens.add({ targets: v.paint, alpha: 1, duration: 1300, ease: 'Sine.easeOut' });
    }
  }

  // At the door, E lays the plates out side by side. Only pictures: the
  // comparison is the player's, not the notebook's.
  openNotes({ pulse = false } = {}) {
    const v = this.viewer;
    this.setViewerVisible(true, 'notes');
    this.notesPulse = pulse;
    v.title.setText('YOUR NOTES · THE THREE PLATES');
    v.close.setText(`${this.brush.label('read')} · CLOSE`);
    v.notePlates.forEach((n) => {
      const developed = this.car.plateState(n.picture.id).developed;
      n.img.setTexture(developed ? paintedPlateKey(n.picture) : n.picture.key).setDisplaySize(NOTE_PLATE.w, NOTE_PLATE.h).setAlpha(developed ? 1 : 0.2);
      n.label.setText(developed ? n.picture.title : `${n.picture.title}\n(STILL UNDER GREY)`);
    });
    this.drawNotes();
  }

  drawNotes() {
    const v = this.viewer;
    const g = v.noteLayer;
    g.clear();
    const scale = NOTE_PLATE.w / PLATE_TEX.w;
    v.notePlates.forEach((n) => {
      g.lineStyle(2.4, PAPER.graphite, 0.9).strokeRect(n.x - 4, NOTE_PLATE.y - 4, NOTE_PLATE.w + 8, NOTE_PLATE.h + 8);
      if (!this.car.plateState(n.picture.id).developed) {
        g.fillStyle(0x8f8a82, 0.9).fillRect(n.x, NOTE_PLATE.y, NOTE_PLATE.w, NOTE_PLATE.h);
        return;
      }
      if (!this.notesPulse) return;
      // Her mark, pulsing in her thread's cyan, after the second wrong answer.
      const rect = n.picture.hawthornRect;
      const t = this.time.now / 1000;
      const k = 0.5 + 0.5 * Math.sin(t * 4);
      const cx = n.x + (rect.c + rect.w / 2) * PLATE_CELL * scale;
      const cy = NOTE_PLATE.y + (rect.r + rect.h / 2) * PLATE_CELL * scale;
      g.lineStyle(3, PAPER.cyan, 0.5 + 0.45 * k).strokeCircle(cx, cy, 26 + k * 6);
      g.lineStyle(1.5, PAPER.cyan, 0.35).strokeCircle(cx, cy, 36 + k * 8);
    });
  }

  note(worldX, worldY, text, tone = 'info', key = text, gap = 1100) {
    const now = this.time.now;
    if (this.noteThrottle[key] && now - this.noteThrottle[key] < gap) return;
    this.noteThrottle[key] = now;
    noteAt(this, worldX, worldY, text, { tone });
  }

  // ================================================================= draw

  // The brush's indigo gouache and the archive's grey, as cell stamps
  // (art/cellArt.js) laid with blitters.
  ensureCellAtlas() {
    ensureCanvasTexture(this, 'ch4-cells', () => paintCellAtlas().canvas);
    addFrames(this, 'ch4-cells', cellAtlasFrames());
  }

  redrawPaint() {
    const g = this.paintLayer;
    const b = this.blockLayer;
    g.clear();
    b.clear();
    const off = CELL_STAMP.bleed;
    this.car.state.painted.forEach((key) => {
      const cx = key % GRID.w;
      const cy = Math.floor(key / GRID.w);
      g.create(cx * CELL - off, cy * CELL - off, `paint-${(cx * 7 + cy * 3) % CELL_STAMP.variants}`);
    });
    this.car.state.blocks.forEach((key) => {
      const cx = key % GRID.w;
      const cy = Math.floor(key / GRID.w);
      b.create(cx * CELL - off, cy * CELL - off, `grey-${(cx * 5 + cy) % CELL_STAMP.variants}`);
    });
    draftBlockEdges(this.blockEdges, this.car.state.blocks, GRID.w, CELL);
  }

  drawFigure() {
    drawPaintedPlayer(this.figure, this.walker, this.brush);
  }

  // The cursor is the whole tutorial: it shows the cell you would fill, and
  // whether the car will let you.
  drawCursor() {
    const g = this.brushCursor;
    g.clear();
    const bx = this.brush.worldX;
    const by = this.brush.worldY;
    const cx = colOf(bx);
    const cy = rowOf(by);
    if (!this.car.inBounds(cx, cy)) return;

    const inReach = this.pointerInReach();
    const panel = this.panelAt(bx, by);

    g.lineStyle(1, PAPER.graphiteFaint, inReach ? 0.18 : 0.4);
    g.strokeCircle(this.walker.x, this.walker.y, REACH);

    if (panel) {
      g.lineStyle(2.4, inReach ? UI.amberInk : PAPER.graphiteFaint, inReach ? 0.95 : 0.4);
      g.strokeRect(panel.x - 4, panel.y - 4, panel.w + 8, panel.h + 8);
      return;
    }
    if (this.pictureAt(bx, by)) return;

    const canPaint = this.car.canPaint(cx, cy);
    const canWash = this.car.canWash(cx, cy);
    const refusal = this.car.paintRefusal(cx, cy);

    let color = PAPER.graphiteFaint;
    let alpha = 0.3;
    if (inReach && canWash) {
      color = PAPER.bookCloth;
      alpha = 0.85;
    } else if (inReach && canPaint) {
      color = UI.amberInk;
      alpha = 0.95;
    } else if (inReach && (refusal === 'no-pigment' || refusal === 'sealed')) {
      color = PAPER.fault;
      alpha = 0.6;
    }
    g.lineStyle(2.2, color, alpha);
    g.strokeRect(cx * CELL, cy * CELL, CELL, CELL);
    if (inReach && canPaint) {
      g.fillStyle(UI.amberInk, 0.16);
      g.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    }
  }

  // An ink pot beside Butch in Bay C: the brush's pigment, next to the brush.
  drawPigmentPot() {
    const g = this.pigmentPot;
    g.clear();
    const inZone = colOf(this.walker.x) >= PIGMENT_ZONE.fromCol - 2;
    this.pigmentLabel.setVisible(inZone && !this.viewer.open);
    if (!inZone || this.viewer.open) return;
    const x = this.walker.x + 16;
    const y = this.walker.y - 52;
    const amount = this.car.state.pigment;
    g.fillStyle(UI.paper, 0.95).fillRoundedRect(x - 4, y - 11, 64, 22, 4);
    g.lineStyle(1, 0x6b5640, 0.5).strokeRoundedRect(x - 4, y - 11, 64, 22, 4);
    g.fillStyle(PAPER.boneBlack, 0.85).fillRoundedRect(x + 2, y - 6, 12, 13, 3);
    g.fillStyle(amount > 0 ? PAPER.indigo : 0x8f8a82, 1).fillRect(x + 4, y - 1, 8, 6);
    this.pigmentLabel.setPosition(x + 20, y).setText(`×${amount}`).setColor(amount > 0 ? UI.ink : UI.oxblood);
  }

  // ================================================================ input

  pointerInReach() {
    return Phaser.Math.Distance.Between(this.walker.x, this.walker.y, this.brush.worldX, this.brush.worldY) <= REACH;
  }

  panelAt(wx, wy) {
    return DOOR.panels.find(
      (panel) => wx >= panel.x && wx <= panel.x + panel.w && wy >= panel.y && wy <= panel.y + panel.h,
    );
  }

  pictureAt(wx, wy) {
    return PAINTINGS.find(
      (picture) => wx >= picture.x && wx <= picture.x + picture.w && wy >= picture.y && wy <= picture.y + picture.h,
    ) ?? null;
  }

  // Only the one cell the player is actually standing in is off limits.
  overlapsPlayer(cx, cy) {
    return (
      this.walker.x >= cx * CELL
      && this.walker.x < cx * CELL + CELL
      && this.walker.y >= cy * CELL
      && this.walker.y < cy * CELL + CELL
    );
  }

  applyBrush(cx, cy, wash) {
    if (!this.car.inBounds(cx, cy)) return;
    if (wash) {
      const wasBlock = this.car.isBlock(cx, cy) || this.car.isPainted(cx, cy);
      if (this.car.wash(cx, cy)) {
        if (wasBlock && !this.car.isBlock(cx, cy) && !this.car.isPainted(cx, cy)) this.removeCellBody(cx, cy);
        this.paintDirty = true;
        this.varnishDirty = true;
        if (this.activeTutorial === 'wash') this.dismissTutorial('wash');
      }
      return;
    }
    if (this.overlapsPlayer(cx, cy)) return;
    if (this.car.paint(cx, cy)) {
      this.addCellBody(cx, cy);
      this.paintDirty = true;
      if (this.activeTutorial === 'bridge') this.dismissTutorial('bridge');
    }
  }

  stepBrush() {
    const brush = this.brush;
    const bx = brush.worldX;
    const by = brush.worldY;

    // A press on a door sign is an answer; on a plate in reach, a look.
    const panel = this.panelAt(bx, by);
    if (panel) {
      this.hoveredDoorSign = panel.sign;
      if (brush.paintPressed) this.tryAnswerDoor(panel);
      this.lastBrushCell = null;
      return;
    }
    this.hoveredDoorSign = null;
    const picture = this.pictureAt(bx, by);
    this.hoveredPictureId = picture?.id ?? null;
    if (picture && (brush.paintPressed || brush.washPressed)) {
      this.tryOpenPicture(picture);
      this.lastBrushCell = null;
      return;
    }
    if (picture) return;

    const paint = brush.paintDown;
    const wash = brush.washDown;
    const samples = brush.mode === 'mouse' ? brush.samples : [];
    if (brush.paintPressed || brush.washPressed) this.lastBrushCell = null;
    samples.forEach((sample) => this.strokeTo(sample.worldX, sample.worldY, sample.wash));
    if (paint || wash) this.strokeTo(bx, by, wash);
    else this.lastBrushCell = null;
  }

  // Walk the brush from the last cell to this point, so no stroke has gaps.
  // Holding still does not scrub: varnish takes two separate passes.
  strokeTo(wx, wy, wash) {
    if (Phaser.Math.Distance.Between(this.walker.x, this.walker.y, wx, wy) > REACH) {
      this.lastBrushCell = null;
      return;
    }
    const cx = colOf(wx);
    const cy = rowOf(wy);
    const from = this.lastBrushCell;
    if (!from) {
      this.applyBrush(cx, cy, wash);
    } else if (from.cx !== cx || from.cy !== cy) {
      const steps = Math.max(Math.abs(cx - from.cx), Math.abs(cy - from.cy));
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        this.applyBrush(Math.round(from.cx + (cx - from.cx) * t), Math.round(from.cy + (cy - from.cy) * t), wash);
      }
    }
    this.lastBrushCell = { cx, cy };
  }

  // Washing inside the plate viewer. Dragging leaves no gaps.
  stepViewerBrush() {
    const v = this.viewer;
    const picture = v.picture;
    const brush = this.brush;
    if (!picture) return;
    const cellOf = (x, y) => ({ c: Math.floor((x - VIEWER.x) / PLATE_CELL), r: Math.floor((y - VIEWER.y) / PLATE_CELL) });
    const onPlate = ({ c, r }) => c >= 0 && r >= 0 && c < PLATE_GRID.cols && r < PLATE_GRID.rows;
    const here = cellOf(brush.x, brush.y);
    const state = this.car.plateState(picture.id);
    if (brush.paintPressed && onPlate(here) && !state.developed) {
      noteAt(this, brush.x, brush.y - 10, `${brush.label('wash')} · WASH`, { screen: true, depth: DEPTH.HUD + 30, hold: 900 });
    }
    if (brush.washPressed) this.lastPlateCell = null;
    let changed = false;
    const washTo = (cell) => {
      if (!onPlate(cell)) {
        this.lastPlateCell = null;
        return;
      }
      const from = this.lastPlateCell;
      if (!from) {
        changed = Boolean(this.car.washPlate(picture.id, cell.c, cell.r)) || changed;
      } else if (from.c !== cell.c || from.r !== cell.r) {
        const steps = Math.max(Math.abs(cell.c - from.c), Math.abs(cell.r - from.r));
        for (let s = 1; s <= steps; s += 1) {
          const t = s / steps;
          changed = Boolean(this.car.washPlate(picture.id, Math.round(from.c + (cell.c - from.c) * t), Math.round(from.r + (cell.r - from.r) * t))) || changed;
        }
      }
      this.lastPlateCell = { c: cell.c, r: cell.r };
    };
    (brush.mode === 'mouse' ? brush.samples : []).filter((p) => p.wash).forEach((p) => washTo(cellOf(p.x, p.y)));
    if (brush.washDown) washTo(here);
    else this.lastPlateCell = null;
    if (changed) {
      this.platesDirty = true;
      this.drawViewerPlate();
    }
  }

  tryOpenPicture(picture) {
    if (this.viewer.open) return;
    const inRange = this.car.pictureInRange(this.walker.x, this.walker.y);
    if (inRange?.id !== picture.id) {
      this.note(picture.x + picture.w / 2, picture.y + picture.h + 30, 'TOO HIGH · BUILD UP TO IT', 'warn');
      return;
    }
    this.openPicture(picture);
  }

  tryAnswerDoor(panel) {
    if (this.viewer.open || this.car.state.door.solved) return;
    if (!this.nearDoor()) {
      this.note(panel.x + panel.w / 2, panel.y - 6, 'STAND AT THE DOOR', 'warn');
      return;
    }
    this.answerDoor(panel.sign);
  }

  answerDoor(sign) {
    const result = this.car.chooseSign(sign);
    if (result.ok && result.reason === 'correct') this.playCompletion();
  }

  stepPlayer(move) {
    const body = this.walker.body;
    if (this.advancingToStudio || this.locked) {
      body.setVelocityX(0);
      return;
    }
    body.setVelocityX(move.left && !move.right ? -MOVE_SPEED : move.right && !move.left ? MOVE_SPEED : 0);
    if (move.jump && body.blocked.down) {
      body.setVelocityY(JUMP_VELOCITY);
      this.hasJumped = true;
    }
  }

  // Falling through the paper costs nothing that was drawn. Runs every frame,
  // under cards and the plate viewer too, because the physics does.
  stepFall(dt) {
    const body = this.walker.body;
    const put = this.fallGuard.step({ x: this.walker.x, y: this.walker.y, grounded: body.blocked.down, dt });
    if (!put) return;
    if (put.kind === 'respawn') this.car.fell();
    placeBody(body, put.x, put.y - 10);
  }

  // The door opens, and someone is already walking through it: Mara, painted,
  // seen from behind, her cyan thread trailing. Then the studio.
  playCompletion() {
    if (this.advancingToStudio) return;
    this.advancingToStudio = true;
    this.tag.hide();
    this.tweens.add({ targets: [...this.doorFace, ...Object.values(this.panelArt), ...Object.values(this.panelLabels)], alpha: 0, duration: 700, delay: 500 });
    // The car is finished by being seen: its colour blooms in, every window.
    this.carriageArt.bloomAll({ duration: 2200, delay: 300, stagger: 220 });
    this.windowViews.forEach((view, i) => view.bloomAll({ duration: 1800, delay: 200 + i * 150, stagger: 120 }));
    this.cameras.main.stopFollow();
    this.cameras.main.pan(DOOR.x + DOOR.w / 2 - 60, VIEW.h / 2, 900, 'Sine.easeInOut');
    this.mara = { x: DOOR.x + 30, alpha: 0, t: 0 };
    this.tweens.add({ targets: this.mara, alpha: 1, duration: 700, delay: 1100 });
    this.tweens.add({
      targets: this.mara,
      x: DOOR.x + DOOR.w - 40,
      duration: 3200,
      delay: 1300,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({ targets: this.mara, alpha: 0, duration: 900, delay: 3700 });
    this.time.delayedCall(4700, () => this.goToStudio());
  }

  drawMara(dt) {
    const g = this.maraLayer;
    g.clear();
    if (!this.mara) return;
    this.mara.t += dt;
    drawMaraSilhouette(g, {
      feetX: this.mara.x,
      feetY: DOOR.y + DOOR.h - 4,
      t: this.mara.t,
      alpha: this.mara.alpha,
      scale: 1.05,
      dir: 1,
      thread: 70,
    });
  }

  goToStudio() {
    this.registry.set('chapter4Pigments', []);
    this.registry.set('chapter4ArchiveAnswer', DOOR.correct);
    if (this.music) this.tweens.add({ targets: this.music, volume: 0, duration: 360 });
    this.cameras.main.fadeOut(420, 247, 244, 236);
    this.time.delayedCall(450, () => this.scene.start('DrawingStudio'));
  }

  bayId() {
    return this.walker.x > 1920 ? 'C' : this.walker.x > 960 ? 'B' : 'A';
  }

  objectiveText() {
    const car = this.car;
    if (car.state.complete) return 'the door is open; someone went through ahead';
    const read = car.state.seen.size;
    if (read < PAINTINGS.length) return `wash the grey off the three plates (${read} of ${PAINTINGS.length})`;
    return 'compare the plates; choose the mark she left in all three';
  }

  showTutorial(id, text, worldX, worldY) {
    if (this.tutorialSeen[id]) return false;
    if (this.activeTutorial && this.activeTutorial !== id) return false;
    this.activeTutorial = id;
    this.tag.show(text, worldX, worldY);
    return true;
  }

  dismissTutorial(id) {
    if (this.activeTutorial !== id) return;
    this.tutorialSeen[id] = true;
    this.activeTutorial = null;
    this.tag.hide();
  }

  // Spatial prompts, not global instructions: the gap, the grey block.
  updateTutorials() {
    const b = this.brush;
    // The first tag of the chapter: walking and jumping (alpha A3-4: Space
    // paints here, and testers reached for it to jump).
    if (!this.tutorialSeen.move) {
      const walked = this.walker.x >= 280 || (this.hasJumped && Math.abs(this.walker.x - 200) > 60);
      if (walked) {
        this.dismissTutorial('move');
        this.tutorialSeen.move = true;
      } else {
        const text = b.device === 'pad' ? 'LEFT STICK · WALK   ·   Y · JUMP' : `A / D · WALK   ·   ${b.jumpKeysLabel()} · JUMP`;
        if (this.showTutorial('move', text, this.walker.x, FLOOR_Y - 84)) return true;
      }
    }
    if (!this.tutorialSeen.bridge && this.walker.x >= 300 && this.walker.x < 700) {
      if (this.showTutorial('bridge', `${b.label('paint')} · DRAW PAPER ACROSS THE GAP`, 25 * CELL, FLOOR_Y - 96)) return true;
    } else if (this.activeTutorial === 'bridge' && this.walker.x >= 700) {
      this.dismissTutorial('bridge');
    }
    if (this.tutorialSeen.bridge && !this.tutorialSeen.wash && this.walker.x >= 620 && this.walker.x < 900) {
      if (this.showTutorial('wash', `${b.label('wash')} · WASH THE ARCHIVE'S GREY AWAY`, 41.5 * CELL, 17 * CELL - 6)) return true;
    }
    if (this.activeTutorial === 'wash' && !this.car.isBlock(41, 20)) this.dismissTutorial('wash');
    return Boolean(this.activeTutorial);
  }

  nearDoor() {
    return Phaser.Math.Distance.Between(this.walker.x, this.walker.y, DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h / 2) <= 280;
  }

  toggleViewer() {
    if (this.viewer.open) {
      this.setViewerVisible(false);
      this.platesDirty = true;
      return;
    }
    const picture = this.car.pictureInRange(this.walker.x, this.walker.y);
    if (picture) {
      this.openPicture(picture);
      return;
    }
    if (this.nearDoor()) {
      this.openNotes();
      return;
    }
    this.note(this.walker.x, this.walker.y - 60, 'NOTHING TO READ HERE', 'info');
  }

  // The one tag on screen: whatever the brush or Butch is nearest to.
  updateTag() {
    if (this.viewer.open || this.advancingToStudio || this.locked) {
      this.tag.hide();
      return;
    }
    if (this.updateTutorials()) return;
    const b = this.brush;
    const inRange = this.car.pictureInRange(this.walker.x, this.walker.y);
    if (inRange) {
      const developed = this.car.plateState(inRange.id).developed;
      this.tag.show(`${b.label('read')} · ${developed ? 'LOOK AGAIN' : 'TAKE THE PLATE DOWN'}`, inRange.x + inRange.w / 2, inRange.y);
      return;
    }
    const hovered = PAINTINGS.find((p) => p.id === this.hoveredPictureId);
    if (hovered) {
      this.tag.show('TOO HIGH · BUILD UP TO IT', hovered.x + hovered.w / 2, hovered.y);
      return;
    }
    if (this.nearDoor() && !this.car.state.door.solved) {
      const developed = PAINTINGS.filter((p) => this.car.plateState(p.id).developed).length;
      if (developed < PAINTINGS.length) {
        this.tag.show(`${developed} OF ${PAINTINGS.length} PLATES WASHED`, DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h - 20);
      } else if (this.hoveredDoorSign) {
        const panel = DOOR.panels.find((p) => p.sign === this.hoveredDoorSign);
        this.tag.show(`${b.label('paint')} · ${SIGN_LABELS[panel.sign]}`, panel.x + panel.w / 2, panel.y - 2);
      } else {
        this.tag.show(`${b.label('read')} · COMPARE THE PLATES`, DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h - 20);
      }
      return;
    }
    // First steps into the pigment zone: the dry brush.
    if (!this.tutorialSeen.pigment && colOf(this.walker.x) >= PIGMENT_ZONE.fromCol - 3 && this.car.state.pigment === 0) {
      this.tag.show(`THE BRUSH IS DRY · ${b.label('wash')} · WASH THE GREY FOR HER COLOUR`, 102 * CELL, 16 * CELL);
      return;
    }
    if (this.car.state.pigment > 0) this.tutorialSeen.pigment = true;
    this.tag.hide();
  }

  // Glint markers on everything that is live but not yet in reach.
  drawMarkers() {
    const g = this.markerLayer;
    g.clear();
    if (this.viewer.open || this.advancingToStudio) return;
    const t = this.time.now;
    PAINTINGS.forEach((p) => {
      if (!this.car.plateState(p.id).developed) drawGlintMarker(g, t, p.x + p.w - 6, p.y - 4);
    });
    if (!this.car.state.door.solved) drawGlintMarker(g, t, DOOR.x + DOOR.w - 6, DOOR.y - 4);
  }

  processCarEvents() {
    let events = this.car.drainEvents();
    while (events.length) {
      events.forEach((event) => this.handleCarEvent(event));
      events = this.car.drainEvents();
    }
  }

  handleCarEvent(event) {
    const b = this.brush;
    const at = (e) => ({ x: e.cx * CELL + CELL / 2, y: e.cy * CELL });
    if (event.type === 'plate-developed') {
      const v = this.viewer;
      if (v.picture?.id === event.id) {
        this.drawViewerPlate();
        noteAt(this, VIEW.w / 2, VIEWER.y - 4, 'THE PLATE COMES CLEAR · IT GOES IN YOUR NOTES', { screen: true, tone: 'good', depth: DEPTH.HUD + 30, hold: 1800 });
      }
      this.platesDirty = true;
    } else if (event.type === 'plate-mark-found') {
      const plate = this.car.plateState(event.id);
      if (!plate.hawthornFound && !this.hintedSmallMark.has(event.id)) {
        this.hintedSmallMark.add(event.id);
        noteAt(this, VIEW.w / 2, VIEWER.y + VIEWER.h + 44, 'SOMETHING SMALLER IS STILL UNDER THE GREY.', { screen: true, depth: DEPTH.HUD + 30, hold: 2200 });
      }
    } else if (event.type === 'plate-varnish-thinned') {
      const p = { x: VIEWER.x + (event.c + 0.5) * PLATE_CELL, y: VIEWER.y + event.r * PLATE_CELL };
      if (!this.noteThrottle.plateVarnish || this.time.now - this.noteThrottle.plateVarnish > 2500) {
        this.noteThrottle.plateVarnish = this.time.now;
        noteAt(this, p.x, p.y, 'OFFICIAL RECORD · ONE MORE WASH', { screen: true, tone: 'warn', depth: DEPTH.HUD + 30, hold: 1100 });
      }
    } else if (event.type === 'door-silent') {
      this.note(DOOR.x + DOOR.w / 2, DOOR.y + 30, `THE DOOR WAITS · ${event.seen} OF ${event.of} PLATES WASHED`, 'warn');
    } else if (event.type === 'door-refused') {
      const line = event.hint === 'rosa' ? WRONG_ANSWER_LINES.rosa
        : event.hint === 'gentle' ? WRONG_ANSWER_LINES.gentle(event.sign)
          : WRONG_ANSWER_LINES.first;
      // Under the door, on the floor line: beside the signs, never over them.
      noteAt(this, DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h + 56, line, { tone: event.hint === 'first' ? 'warn' : 'mara', hold: 2600 });
      if (event.hint !== 'first') this.time.delayedCall(1400, () => { if (!this.viewer.open) this.openNotes({ pulse: true }); });
    } else if (event.type === 'door-opened') {
      noteAt(this, DOOR.x + DOOR.w / 2, DOOR.y - 30, 'THE HAWTHORN. THE DOOR OPENS.', { tone: 'good', hold: 2000 });
    } else if (event.type === 'paint-refused') {
      const p = at(event);
      if (event.reason === 'varnished') {
        const first = !this.tutorialSeen.varnish;
        this.tutorialSeen.varnish = true;
        this.note(p.x, p.y, first ? `OFFICIAL RECORD · ${b.label('wash')} IT TWICE, THEN PAINT` : 'VARNISHED · WASH IT TWICE', 'warn', 'varnish', first ? 2600 : 1400);
      } else if (event.reason === 'no-pigment') {
        this.note(this.walker.x, this.walker.y - 64, `DRY BRUSH · ${b.label('wash')} · WASH THE GREY FOR COLOUR`, 'no', 'dry', 1800);
      } else if (event.reason === 'sealed') {
        this.note(p.x, p.y, "THE DOOR'S OWN FACE", 'info', 'sealed', 1800);
      }
    } else if (event.type === 'varnish-thinned') {
      const p = at(event);
      this.note(p.x, p.y, 'ONE MORE WASH', 'info', 'thinned', 2200);
    } else if (event.type === 'pigment-recovered') {
      this.tutorialSeen.pigment = true;
    }
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.brush.update(dt);
    this.restart.update(dt, this.brush.pad);
    this.stepFall(dt);
    if (this.restart.blocking) {
      this.walker.body.setVelocityX(0);
      this.drawFigure();
      return;
    }
    const move = this.brush.readMove(this.keys);

    if (this.card.open) {
      this.walker.body.setVelocityX(0);
      if (move.interactPressed || move.enterPressed || this.brush.paintPressed) this.card.dismiss();
      this.drawFigure();
      return;
    }

    if (move.interactPressed && !this.locked && !this.advancingToStudio) this.toggleViewer();

    if (this.viewer.open) {
      this.walker.body.setVelocityX(0);
      if (this.viewer.mode === 'plate') this.stepViewerBrush();
      if (this.viewer.mode === 'notes') this.drawNotes();
      this.brush.drawCursor({ screenSpace: true });
      this.brush.cursor.setDepth(DEPTH.HUD + 20);
      this.processCarEvents();
      return;
    }
    this.brush.cursor.setDepth(DEPTH.CURSOR + 1);

    if (!this.locked && !this.advancingToStudio) this.stepBrush();
    this.stepPlayer(move);

    if (this.paintDirty) {
      this.redrawPaint();
      this.paintDirty = false;
    }
    if (this.varnishDirty) {
      this.redrawVarnish();
      this.varnishDirty = false;
    }
    if (this.platesDirty) {
      this.redrawWallPlates();
      this.platesDirty = false;
    }
    this.drawFigure();
    if (!this.advancingToStudio) this.drawCursor();
    else this.brushCursor.clear();
    this.brush.drawCursor({ hidden: this.advancingToStudio || this.locked });
    this.drawDoorSigns();
    this.drawMarkers();
    this.drawPigmentPot();
    this.drawMara(dt);
    this.processCarEvents();
    this.updateTag();

    this.motes.forEach((mote) => {
      mote.obj.x += mote.vx * dt;
      mote.obj.y += (mote.vy + Math.sin(time / 900 + mote.phase) * 5) * dt;
      if (mote.obj.x > WORLD.w + 4) mote.obj.x = -4;
      if (mote.obj.y < -4) mote.obj.y = VIEW.h + 4;
      if (mote.obj.y > VIEW.h + 4) mote.obj.y = -4;
    });
    if (this.grain) {
      this.grain.tilePositionX = this.cameras.main.scrollX * 0.4 + Math.sin(time / 5200) * 6;
      this.grain.tilePositionY = Math.cos(time / 6100) * 4;
    }
  }

  drawDoorSigns() {
    const g = this.doorLayer;
    g.clear();
    const opened = this.car.state.door.solved;
    if (opened && this.advancingToStudio) return;
    const lit = this.car.platesDeveloped();

    DOOR.panels.forEach((panel) => {
      const chosen = this.car.state.door.chosen === panel.sign;
      const right = opened && panel.sign === DOOR.correct;
      g.fillStyle(right ? PAPER.verdigris : PAPER.sheetHigh, right ? 0.4 : lit ? 0.92 : 0.4);
      g.fillRect(panel.x, panel.y, panel.w, panel.h);
      g.lineStyle(right ? 2.6 : 1.6, right ? PAPER.verdigris : PAPER.graphite, lit ? 0.9 : 0.4);
      g.strokeRect(panel.x, panel.y, panel.w, panel.h);
      this.panelArt[panel.sign]?.setAlpha(lit ? 1 : 0.35);
      this.panelLabels[panel.sign]?.setAlpha(lit ? 1 : 0.5);
      if (this.hoveredDoorSign === panel.sign && lit) {
        g.lineStyle(2.6, UI.amberInk, 0.96);
        g.strokeRect(panel.x - 4, panel.y - 4, panel.w + 8, panel.h + 8);
      }
      if (chosen && !right) {
        g.lineStyle(2.4, PAPER.fault, 0.85);
        g.lineBetween(panel.x + 10, panel.y + 10, panel.x + panel.w - 10, panel.y + panel.h - 10);
        g.lineBetween(panel.x + panel.w - 10, panel.y + 10, panel.x + 10, panel.y + panel.h - 10);
      }
    });
  }

  textState() {
    const b = this.brush;
    const cx = colOf(b.worldX);
    const cy = rowOf(b.worldY);
    return {
      scene: 'PaintedCountry',
      camera: { x: Math.round(this.cameras.main.worldView.x), y: Math.round(this.cameras.main.worldView.y) },
      bay: this.bayId(),
      objective: this.objectiveText(),
      locked: this.locked,
      cardOpen: this.card.open,
      restartConfirm: this.restart.blocking,
      viewer: {
        open: Boolean(this.viewer?.open),
        mode: this.viewer?.mode ?? null,
        picture: this.viewer?.picture?.id ?? null,
        notesPulse: this.notesPulse,
      },
      ...this.car.snapshot(),
      pigmentRingVisible: false,
      advancingToStudio: this.advancingToStudio,
      maraVisible: Boolean(this.mara && this.mara.alpha > 0.05),
      tag: this.tag.visible ? this.tag.text : null,
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        onGround: this.walker.body.blocked.down,
      },
      fall: this.fallGuard.snapshot(),
      pointer: {
        mode: b.mode,
        device: b.device,
        x: Math.round(b.worldX),
        y: Math.round(b.worldY),
        screen: [Math.round(b.x), Math.round(b.y)],
        cell: [cx, cy],
        inReach: this.pointerInReach(),
        canPaint: this.car.canPaint(cx, cy),
        canWash: this.car.canWash(cx, cy),
        overPanel: this.panelAt(b.worldX, b.worldY)?.sign ?? null,
      },
    };
  }
}

export const PAINTED_COUNTRY_VIEW = VIEW;
