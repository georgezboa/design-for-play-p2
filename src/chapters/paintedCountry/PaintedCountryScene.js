import Phaser from 'phaser';
import {
  BAY_TITLES,
  CEILING_Y,
  CELL,
  CORD_COLOURS,
  DOOR,
  FLOOR_ROW,
  FLOOR_SPANS,
  FLOOR_Y,
  FOLDS,
  GLAZE_RECTS,
  GRID,
  JUMP_VELOCITY,
  MOVE_SPEED,
  PAINTINGS,
  RACK_Y,
  READ_RADIUS,
  REACH,
  SIGN_ART,
  VIEW,
  WAINSCOT_Y,
  WINDOWS,
  WORLD,
} from './carLayout.js';
import { colOf, createPaintedCar, idx, rowOf } from './paintedCarModel.js';
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

// Chapter 4 // THE PAINTED COUNTRY — draw your own way through.
//
// The player paints and washes anywhere they can reach. A tap places one paper
// cell immediately; holding and dragging lays a continuous path. Three pictures are hung too high to
// read from the floor, and the door at the end wants to know which sign was in
// all of them.
//
// This file owns pixels and input only. Every rule lives in paintedCarModel.js.

const DEPTH = {
  SHEET: 0,
  COUNTRY: 5,
  WALL: 10,
  GLAZE: 14,
  FIXTURE: 18,
  DRAWING: 22,
  PAINT: 30,
  BLOCK: 32,
  PICTURE: 36,
  BOARD: 37,
  CORD: 39,
  DOOR: 40,
  FIGURE: 44,
  CURSOR: 48,
  GRAIN: 60,
  AIR: 70,
  HUD: 90,
};

export class PaintedCountryScene extends Phaser.Scene {
  constructor() {
    super('PaintedCountry');
  }

  preload() {
    Object.entries(SIGN_ART).forEach(([sign, file]) => this.load.image(`sign-${sign}`, file));
    if (!this.cache.audio.exists('chapter4-drawing-music')) {
      this.load.audio('chapter4-drawing-music', '/assets/music/ch4/4.3_debussy_reflets_dans_leau.mp3');
    }
  }

  create() {
    this.music = this.sound.add('chapter4-drawing-music', { loop: true, volume: 0.42 });
    const playMusic = () => { if (!this.music?.isPlaying) this.music?.play(); };
    if (this.sound.locked) this.sound.once('unlocked', playMusic);
    else playMusic();
    this.input.once('pointerdown', playMusic);
    this.input.keyboard.once('keydown', playMusic);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());
    this.advancingToStudio = false;
    this.registry.set('chapter4Pigments', []);
    this.registry.remove('chapter4ArchiveAnswer');
    this.rnd = makeRandom(0x9a17);
    this.motes = [];
    this.boilTargets = [];
    this.car = createPaintedCar();
    this.cellBodies = new Map();
    this.paintDirty = true;
    this.lastBrushCell = null;
    this.wasLeftDown = false;
    this.hoveredPictureId = null;
    this.hoveredDoorSign = null;
    this.tutorialSeen = { bridge: false, wash: false };
    this.activeTutorial = null;

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, -400, WORLD.w, WORLD.h + 900);

    this.buildSheet();
    this.buildCountry();
    this.buildCarriage();
    this.buildGrid();
    this.buildGlaze();
    this.buildArchiveSymbolTextures();
    this.buildGallery();
    this.buildDoor();
    this.buildSolids();
    this.buildPlayer();
    this.paintLayer = this.graphics(DEPTH.PAINT);
    this.blockLayer = this.graphics(DEPTH.BLOCK);
    this.brushCursor = this.graphics(DEPTH.CURSOR);
    this.doorLayer = this.graphics(DEPTH.DOOR);

    this.buildGrain();
    this.buildAir();
    this.buildHud();
    this.buildViewer();
    this.applyQaRoute();

    this.car.state.blocks.forEach((key) => this.addCellBody(key % GRID.w, Math.floor(key / GRID.w)));
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handleViewerPointerMove, this);
    this.input.on('pointerup', this.handleViewerPointerUp, this);

    this.time.addEvent({
      delay: 1000 / 12,
      loop: true,
      callback: () => this.boilTargets.forEach((redraw) => redraw()),
    });
  }

  graphics(depth) {
    return this.add.graphics().setDepth(depth);
  }

  applyQaRoute() {
    const qa = new URLSearchParams(window.location.search).get('qa');
    if (qa === 'door-view') {
      this.walker.setPosition(DOOR.x - 82, FLOOR_Y - 30);
      this.cameras.main.centerOn(DOOR.x + DOOR.w / 2, VIEW.h / 2);
      return;
    }
    const match = qa?.match(/^archive-([123])(-solved)?$/);
    if (!match) return;
    const picture = PAINTINGS[Number(match[1]) - 1];
    if (!picture) return;
    if (match[2]) {
      const board = this.car.boardSpec(picture.id);
      const state = this.car.boardState(picture.id);
      board.pairs.forEach((pair) => { state.cords[pair.id] = [pair.a, pair.b]; });
    }
    this.openPicture(picture);
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

  // The squared paper the child ruled before she drew anything. It sits above
  // the carriage fills so it reads everywhere the player can actually build,
  // and it is faint enough to be a guide rather than graph paper.
  buildGrid() {
    const g = this.graphics(DEPTH.WALL + 2);
    g.lineStyle(1, PAPER.graphiteFaint, 0.13);
    const top = CEILING_Y;
    for (let cx = 0; cx <= GRID.w; cx += 1) g.lineBetween(cx * CELL, top, cx * CELL, FLOOR_Y);
    for (let cy = Math.ceil(top / CELL); cy <= FLOOR_ROW; cy += 1) {
      g.lineBetween(0, cy * CELL, WORLD.w, cy * CELL);
    }
  }

  buildCountry() {
    const container = this.add.container(0, 0).setDepth(DEPTH.COUNTRY);
    const g = this.add.graphics();
    container.add(g);

    g.fillStyle(PAPER.sheetHigh, 1);
    g.fillRect(0, 100, WORLD.w, 230);
    for (let x = -60; x < WORLD.w; x += 330) this.foldedHill(g, x, 190, 380, 130, PAPER.sheet, PAPER.sheetMid);
    for (let x = 140; x < WORLD.w; x += 300) this.foldedHill(g, x, 220, 320, 106, PAPER.sheetMid, PAPER.sheetLow);

    g.lineStyle(1.5, PAPER.graphiteFaint, 0.95);
    for (let x = 0; x < WORLD.w; x += 420) {
      draftLine(g, this.rnd, x, 300, x + 420, 284, { overshoot: 0, jitter: 2.6, segments: 12 });
    }

    const mask = this.add.graphics().setVisible(false);
    mask.fillStyle(0xffffff, 1);
    WINDOWS.forEach((win) => mask.fillRect(win.x, win.y, win.w, win.h));
    container.setMask(mask.createGeometryMask());
  }

  foldedHill(g, x, y, w, h, faceColor, shadeColor) {
    const peak = x + w * 0.4;
    g.fillStyle(faceColor, 1);
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(peak, y);
    g.lineTo(peak + w * 0.14, y + h);
    g.closePath();
    g.fillPath();
    g.fillStyle(shadeColor, 1);
    g.beginPath();
    g.moveTo(peak, y);
    g.lineTo(x + w, y + h * 0.78);
    g.lineTo(x + w, y + h);
    g.lineTo(peak + w * 0.14, y + h);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.2, PAPER.graphiteSoft, 0.85);
    draftLine(g, this.rnd, x, y + h, peak, y, { overshoot: 0, jitter: 0.8 });
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

    // The torn edges of the two holes.
    const holes = [];
    for (let i = 0; i < FLOOR_SPANS.length - 1; i += 1) {
      holes.push({ x: FLOOR_SPANS[i].to * CELL, w: (FLOOR_SPANS[i + 1].from - FLOOR_SPANS[i].to) * CELL });
    }
    holes.forEach((hole) => {
      const h = this.graphics(DEPTH.WALL + 1);
      h.fillStyle(PAPER.sheetHigh, 1);
      h.fillRect(hole.x, FLOOR_Y, hole.w, WORLD.h - FLOOR_Y);
      h.lineStyle(1.6, PAPER.deckle, 0.95);
      [hole.x, hole.x + hole.w].forEach((x) =>
        draftLine(h, this.rnd, x, FLOOR_Y, x, WORLD.h, { overshoot: 0, jitter: 2.6, segments: 10 }),
      );
    });

    const draw = this.graphics(DEPTH.DRAWING);
    const boil = () => {
      const rnd = makeRandom(0x5eed + Math.floor(this.time.now / 83));
      draw.clear();
      draw.lineStyle(1.9, PAPER.graphite, 0.94);
      [CEILING_Y, WAINSCOT_Y].forEach((y) =>
        draftLine(draw, rnd, 0, y, WORLD.w, y, { overshoot: 0, jitter: 1.1, segments: 40 }),
      );
      FLOOR_SPANS.forEach((span) =>
        draftLine(draw, rnd, span.from * CELL, FLOOR_Y, span.to * CELL, FLOOR_Y, {
          overshoot: 0,
          jitter: 1.2,
          segments: 12,
        }),
      );
      draw.lineStyle(1.6, PAPER.graphite, 0.9);
      WINDOWS.forEach((win) => draftRect(draw, rnd, win.x, win.y, win.w, win.h, { overshoot: 7, jitter: 0.8 }));
      draw.lineStyle(1.3, PAPER.graphiteSoft, 0.9);
      draftLine(draw, rnd, 20, RACK_Y, WORLD.w - 20, RACK_Y, { overshoot: 0, jitter: 0.8, segments: 40 });
    };
    boil();
    this.boilTargets.push(boil);
  }

  // Varnished paper: visibly glossy, and paint slides off it.
  buildGlaze() {
    const g = this.graphics(DEPTH.GLAZE);
    GLAZE_RECTS.forEach((rect) => {
      const x = rect.col * CELL;
      const y = rect.row * CELL;
      const w = rect.cols * CELL;
      const h = rect.rows * CELL;
      g.fillStyle(PAPER.sheetHigh, 0.55);
      g.fillRect(x, y, w, h);
      g.lineStyle(1.3, PAPER.deckle, 0.75);
      draftRect(g, this.rnd, x, y, w, h, { overshoot: 4, jitter: 1.2 });
      // Diagonal sheen, so it reads as varnish rather than as a wall.
      g.lineStyle(2, PAPER.sheetHigh, 0.85);
      for (let i = -h; i < w; i += 26) {
        g.lineBetween(x + i, y + h, x + i + h, y);
      }
      g.lineStyle(1, PAPER.graphiteFaint, 0.3);
      for (let i = -h; i < w; i += 26) {
        g.lineBetween(x + i + 2, y + h, x + i + h + 2, y);
      }
    });
  }

  // =========================================================== the gallery

  // The archive photographs came from a photorealistic visual language that
  // fought the hand-drawn carriage. Redraw the clue as three distinct graphite
  // marks, each carrying the same small moon seal. The final door asks for the
  // repeated small seal, so the visual and narrative deductions agree.
  buildArchiveSymbolTextures() {
    const accents = [PAPER.bookCloth, PAPER.graphiteSoft, PAPER.cyan];
    PAINTINGS.forEach((picture, index) => {
      if (this.textures.exists(picture.key)) this.textures.remove(picture.key);
      const g = this.add.graphics();
      const w = 1200;
      const h = 672;
      const cx = w / 2;
      const cy = h / 2;
      const accent = accents[index] ?? PAPER.graphite;
      g.fillStyle(PAPER.sheetHigh, 1).fillRect(0, 0, w, h);
      g.lineStyle(9, PAPER.graphiteFaint, 0.2);
      for (let y = 70; y < h; y += 86) g.lineBetween(76, y, w - 76, y + (index - 1) * 5);

      g.lineStyle(18, accent, 0.92);
      if (picture.primarySign === 'eye') {
        // NAVE — a broad eye and pupil.
        g.strokeEllipse(cx - 50, cy - 24, 500, 238);
        g.lineStyle(13, PAPER.graphite, 0.94);
        g.strokeEllipse(cx - 50, cy - 24, 205, 142);
        g.fillStyle(accent, 0.96).fillCircle(cx - 50, cy - 24, 46);
        g.lineStyle(7, PAPER.sheetHigh, 0.92).strokeCircle(cx - 64, cy - 38, 13);
      } else if (picture.primarySign === 'heir') {
        // LISTENING FIELD — a crowned heir, reduced to head, shoulders and crown.
        g.strokeCircle(cx - 50, cy + 12, 86);
        g.beginPath();
        g.moveTo(cx - 225, cy + 190);
        g.lineTo(cx - 174, cy + 102);
        g.lineTo(cx - 50, cy + 82);
        g.lineTo(cx + 74, cy + 102);
        g.lineTo(cx + 125, cy + 190);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx - 155, cy - 100);
        g.lineTo(cx - 120, cy - 205);
        g.lineTo(cx - 52, cy - 132);
        g.lineTo(cx + 12, cy - 215);
        g.lineTo(cx + 58, cy - 100);
        g.closePath().strokePath();
      } else {
        // LAST CITY — the rapture mark: a falling drop inside a radiating burst.
        g.beginPath();
        g.moveTo(cx - 50, cy - 190);
        g.lineTo(cx - 145, cy + 10);
        g.lineTo(cx - 50, cy + 125);
        g.lineTo(cx + 45, cy + 10);
        g.closePath().strokePath();
        g.lineStyle(13, PAPER.graphite, 0.9);
        for (let ray = 0; ray < 8; ray += 1) {
          const a = (Math.PI * 2 * ray) / 8;
          g.lineBetween(
            cx - 50 + Math.cos(a) * 165,
            cy - 25 + Math.sin(a) * 165,
            cx - 50 + Math.cos(a) * 235,
            cy - 25 + Math.sin(a) * 235,
          );
        }
      }

      // The shared clue is deliberately smaller and placed like an accession
      // stamp, so it can repeat without making the three main images identical.
      const sealX = w - 150;
      const sealY = h - 136;
      g.lineStyle(9, PAPER.graphiteSoft, 0.78).strokeCircle(sealX, sealY, 76);
      g.fillStyle(PAPER.graphite, 0.9).fillCircle(sealX - 4, sealY, 48);
      g.fillStyle(PAPER.sheetHigh, 1).fillCircle(sealX + 19, sealY - 12, 45);
      g.generateTexture(picture.key, w, h);
      g.destroy();
    });
  }

  buildGallery() {
    const g = this.graphics(DEPTH.PICTURE);
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    this.pictureLabels = {};

    PAINTINGS.forEach((picture) => {
      const inset = 8;
      // The plate itself, cropped to sit inside its frame.
      const plate = this.add
        .image(picture.x + picture.w / 2, picture.y + picture.h / 2, picture.key)
        .setDepth(DEPTH.PICTURE)
        .setDisplaySize(picture.w - inset * 2, picture.h - inset * 2)
        .setVisible(false);
      const cover = this.add
        .rectangle(
          picture.x + picture.w / 2,
          picture.y + picture.h / 2,
          picture.w - inset * 2,
          picture.h - inset * 2,
          PAPER.sheetHigh,
          1,
        )
        .setStrokeStyle(1, PAPER.deckle, 0.8)
        .setDepth(DEPTH.PICTURE + 0.5);

      const makeInteractive = (object) => object
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => { this.hoveredPictureId = picture.id; })
        .on('pointerout', () => {
          if (this.hoveredPictureId === picture.id) this.hoveredPictureId = null;
        })
        .on('pointerdown', (_pointer, _localX, _localY, event) => this.tryOpenPicture(picture, event));
      makeInteractive(plate);
      makeInteractive(cover);

      // Frame over the top of it.
      g.lineStyle(3, PAPER.graphite, 0.94);
      draftRect(g, this.rnd, picture.x, picture.y, picture.w, picture.h, { overshoot: 5, jitter: 0.6 });
      g.lineStyle(1.2, PAPER.graphiteSoft, 0.7);
      draftRect(g, this.rnd, picture.x + inset, picture.y + inset, picture.w - inset * 2, picture.h - inset * 2, {
        overshoot: 2,
        jitter: 0.5,
      });
      // Mount board around the plate.
      g.fillStyle(PAPER.sheetHigh, 1);
      g.fillRect(picture.x, picture.y, picture.w, inset);
      g.fillRect(picture.x, picture.y + picture.h - inset, picture.w, inset);
      g.fillRect(picture.x, picture.y, inset, picture.h);
      g.fillRect(picture.x + picture.w - inset, picture.y, inset, picture.h);

      // The hanging wire.
      g.lineStyle(1.1, PAPER.graphiteSoft, 0.8);
      g.lineBetween(picture.x + picture.w / 2, picture.y, picture.x + picture.w / 2 - 18, RACK_Y);
      g.lineBetween(picture.x + picture.w / 2, picture.y, picture.x + picture.w / 2 + 18, RACK_Y);

      this.add
        .text(picture.x + picture.w / 2, picture.y + picture.h + 8, picture.title, {
          fontFamily: mono,
          fontSize: '10px',
          color: '#8d8579',
          letterSpacing: 1.4,
        })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.PICTURE);

      // The prompt that appears when the player has climbed close enough.
      const hint = this.add
        .text(picture.x + picture.w / 2, picture.y - 12, '', {
          fontFamily: mono,
          fontSize: '11px',
          color: '#2f8c9e',
          align: 'center',
          letterSpacing: 1.4,
        })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.PICTURE + 1);
      hint.setPadding(6, 4, 6, 4).setBackgroundColor('#f7f4ec');
      this.pictureLabels[picture.id] = { hint, plate, cover };
    });
  }

  // ======================================================= the color-link board

  cordColor(pairId) {
    return CORD_COLOURS[pairId] ?? PAPER.fault;
  }

  boardLayout(pictureId) {
    const board = this.car.boardSpec(pictureId);
    const x = 584;
    const y = 150;
    const availableW = 276;
    const availableH = 258;
    const pad = 22;
    const pitch = Math.min(
      38,
      (availableW - pad * 2) / Math.max(1, board.cols - 1),
      (availableH - pad * 2) / Math.max(1, board.rows - 1),
    );
    const w = pad * 2 + (board.cols - 1) * pitch;
    const h = pad * 2 + (board.rows - 1) * pitch;
    return {
      board,
      x: x + (availableW - w) / 2,
      y: y + (availableH - h) / 2,
      w,
      h,
      pad,
      pitch,
    };
  }

  boardEyeletAt(layout, c, r) {
    return {
      x: layout.x + layout.pad + c * layout.pitch,
      y: layout.y + layout.pad + r * layout.pitch,
    };
  }

  boardCellAt(wx, wy) {
    const picture = this.viewer?.picture;
    if (!picture) return null;
    const layout = this.boardLayout(picture.id);
    if (wx < layout.x - 18 || wx > layout.x + layout.w + 18 || wy < layout.y - 18 || wy > layout.y + layout.h + 18) {
      return null;
    }
    const c = Math.round((wx - layout.x - layout.pad) / layout.pitch);
    const r = Math.round((wy - layout.y - layout.pad) / layout.pitch);
    if (!this.car.inBoard(picture.id, c, r)) return null;
    const at = this.boardEyeletAt(layout, c, r);
    if (Phaser.Math.Distance.Between(wx, wy, at.x, at.y) > layout.pitch * 0.62) return null;
    return { c, r };
  }

  drawViewerBoard() {
    if (!this.viewer?.boardLayer || !this.viewer?.cordLayer) return;
    const base = this.viewer.boardLayer;
    const cords = this.viewer.cordLayer;
    base.clear();
    cords.clear();
    const picture = this.viewer.picture;
    if (!this.viewer.open || !picture) return;

    const layout = this.boardLayout(picture.id);
    const { board } = layout;
    const current = this.car.boardState(picture.id);
    const solved = this.car.boardSolved(picture.id);

    base.fillStyle(PAPER.manilla, 0.98);
    base.fillRect(layout.x - 18, layout.y - 18, layout.w + 36, layout.h + 36);
    base.lineStyle(2, PAPER.graphite, 0.9);
    draftRect(base, this.rnd, layout.x - 18, layout.y - 18, layout.w + 36, layout.h + 36, {
      overshoot: 4,
      jitter: 0.6,
    });

    for (let c = 0; c < board.cols; c += 1) {
      for (let r = 0; r < board.rows; r += 1) {
        const at = this.boardEyeletAt(layout, c, r);
        if (this.car.isTorn(picture.id, c, r)) {
          base.fillStyle(PAPER.sheetHigh, 1);
          base.fillCircle(at.x, at.y, Math.max(7, layout.pitch * 0.27));
          base.lineStyle(1.2, PAPER.deckle, 0.9);
          for (let i = 0; i < 8; i += 1) {
            const a0 = (i / 8) * Math.PI * 2;
            const a1 = ((i + 1) / 8) * Math.PI * 2;
            base.lineBetween(
              at.x + Math.cos(a0) * layout.pitch * 0.25,
              at.y + Math.sin(a0) * layout.pitch * 0.25,
              at.x + Math.cos(a1) * layout.pitch * 0.25,
              at.y + Math.sin(a1) * layout.pitch * 0.25,
            );
          }
        } else {
          base.lineStyle(1.2, PAPER.graphiteSoft, 0.8);
          base.strokeCircle(at.x, at.y, Math.max(4.5, layout.pitch * 0.16));
        }
      }
    }

    board.pairs.forEach((pair) => {
      [pair.a, pair.b].forEach(([c, r]) => {
        const at = this.boardEyeletAt(layout, c, r);
        base.fillStyle(this.cordColor(pair.id), 0.96);
        base.fillCircle(at.x, at.y, Math.max(7, layout.pitch * 0.25));
        base.lineStyle(1.2, PAPER.graphite, 0.85);
        base.strokeCircle(at.x, at.y, Math.max(7, layout.pitch * 0.25));
        base.fillStyle(PAPER.manilla, 1);
        base.fillCircle(at.x, at.y, 2.2);
      });
    });

    board.pairs.forEach((pair) => {
      const cord = current.cords[pair.id];
      if (!cord || cord.length < 2) return;
      const done = this.car.cordComplete(picture.id, pair.id);
      const color = this.cordColor(pair.id);
      cords.lineStyle(7, PAPER.graphite, 0.14);
      cords.beginPath();
      cord.forEach(([c, r], i) => {
        const at = this.boardEyeletAt(layout, c, r);
        if (i === 0) cords.moveTo(at.x, at.y + 2);
        else cords.lineTo(at.x, at.y + 2);
      });
      cords.strokePath();
      cords.lineStyle(done ? 5.5 : 4, color, done ? 0.95 : 0.76);
      cords.beginPath();
      cord.forEach(([c, r], i) => {
        const at = this.boardEyeletAt(layout, c, r);
        if (i === 0) cords.moveTo(at.x, at.y);
        else cords.lineTo(at.x, at.y);
      });
      cords.strokePath();
    });

    if (solved) {
      cords.lineStyle(2, PAPER.verdigris, 0.85);
      draftRect(cords, makeRandom(0x77aa), layout.x - 12, layout.y - 12, layout.w + 24, layout.h + 24, {
        overshoot: 3,
        jitter: 0.8,
      });
    }
  }

  // ============================================================== the door

  buildDoor() {
    const g = this.graphics(DEPTH.DOOR - 1);
    g.fillStyle(PAPER.sheetMid, 1);
    g.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
    g.lineStyle(2.6, PAPER.graphite, 0.94);
    draftRect(g, this.rnd, DOOR.x, DOOR.y, DOOR.w, DOOR.h, { overshoot: 6, jitter: 0.7 });
    hatchRect(g, this.rnd, DOOR.x + 8, DOOR.y + 8, DOOR.w - 16, DOOR.h - 16, {
      spacing: 15,
      alpha: 0.12,
    });

    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    this.add
      .text(DOOR.x + DOOR.w / 2, DOOR.y - 12, DOOR.prompt, {
        fontFamily: mono,
        fontSize: '11px',
        color: '#5c574f',
        align: 'center',
        lineSpacing: 4,
        letterSpacing: 1.4,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.DOOR);

    // The five signs, as real plates screwed to the door.
    this.panelArt = {};
    this.panelLabels = {};
    DOOR.panels.forEach((panel) => {
      const art = this.add
        .image(panel.x + panel.w / 2, panel.y + panel.h / 2, `sign-${panel.sign}`)
        .setDepth(DEPTH.DOOR + 1)
        .setDisplaySize(panel.w - 10, panel.h - 10)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => { this.hoveredDoorSign = panel.sign; })
        .on('pointerout', () => {
          if (this.hoveredDoorSign === panel.sign) this.hoveredDoorSign = null;
        })
        .on('pointerdown', (_pointer, _localX, _localY, event) => this.tryAnswerDoor(panel, event));
      this.panelArt[panel.sign] = art;
      this.panelLabels[panel.sign] = this.add
        .text(panel.x + panel.w / 2, panel.y + panel.h - 2, panel.sign.toUpperCase(), {
          fontFamily: mono,
          fontSize: '7px',
          color: '#5c574f',
          backgroundColor: '#f7f4ecdd',
          padding: { x: 3, y: 1 },
          letterSpacing: 0.8,
        })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.DOOR + 2);
    });

    this.doorHint = this.add
      .text(DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h - 32, '', {
        fontFamily: mono,
        fontSize: '10px',
        color: '#2f8c9e',
        align: 'center',
        lineSpacing: 3,
        letterSpacing: 1.2,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.DOOR + 2);
    this.doorHint.setPadding(6, 4, 6, 4).setBackgroundColor('#f7f4ec');
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
    // The ends of the sheet are walls, not cliffs.
    solid(-24, -400, 24, WORLD.h + 500);
    solid(WORLD.w, -400, 24, WORLD.h + 500);
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

    this.figure = this.graphics(DEPTH.FIGURE);
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(240, 160);

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      up: 'UP',
      w: 'W',
      space: 'SPACE',
      read: 'E',
      restart: 'R',
    });
    this.input.keyboard.addCapture(['LEFT', 'RIGHT', 'UP', 'DOWN', 'SPACE', 'E', 'R']);
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
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const fixed = (x, y, text, color, size = 11, originX = 0, originY = 0) =>
      this.add
        .text(x, y, text, { fontFamily: mono, fontSize: `${size}px`, color, letterSpacing: 2 })
        .setOrigin(originX, originY)
        .setScrollFactor(0)
        .setDepth(DEPTH.HUD);

    // No persistent HUD in Chapter 4. The two mechanics are taught in place,
    // exactly where the player first needs them.
    this.hudBand = null;
    this.controlLines = [];
    this.objective = null;
    this.bayLabel = null;
    this.flash = fixed(24, 86, '', '#b4453a', 12);
    this.flash.setPadding(8, 5, 8, 5).setBackgroundColor('#f7f4ec').setAlpha(0);
    this.notebook = null;
    this.tutorialPrompt = fixed(VIEW.w / 2, VIEW.h - 74, '', '#35312c', 15, 0.5, 0.5);
    this.tutorialPrompt.setPadding(14, 9, 14, 9).setBackgroundColor('#f7f4ec').setAlpha(0);

    // Bay names belong to the world, painted under the floor line where there
    // is nothing else to collide with.
    BAY_TITLES.forEach(({ x, title }) =>
      this.add
        .text(x + 28, FLOOR_Y + 22, title, {
          fontFamily: mono,
          fontSize: '11px',
          color: '#a49c8d',
          letterSpacing: 2,
        })
        .setDepth(DEPTH.WALL + 2),
    );
  }

  // The archive viewer: the image stays large on the left while its color-link
  // card stays live on the right. The signs in the supplied artwork are the
  // clue, so the puzzle never covers or shrinks the image into a thumbnail.
  buildViewer() {
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const D = DEPTH.HUD + 10;
    this.viewer = { open: false, picture: null, wasLeftDown: false };

    this.viewer.scrim = this.add
      .rectangle(0, 0, VIEW.w, VIEW.h, 0x2c2823, 0.72)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(D);

    this.viewer.card = this.add
      .rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w - 84, VIEW.h - 62, 0xf3efe4, 1)
      .setScrollFactor(0)
      .setDepth(D + 1);

    this.viewer.imageFrame = this.add
      .rectangle(306, 226, 506, 292)
      .setStrokeStyle(1.5, 0xd8cfb9, 1)
      .setFillStyle(0xf7f4ec, 1)
      .setScrollFactor(0)
      .setDepth(D + 2);
    this.viewer.plate = this.add.image(306, 226, PAINTINGS[0].key).setScrollFactor(0).setDepth(D + 3);
    this.viewer.imageCover = this.add
      .rectangle(306, 226, 490, 276, PAPER.sheetHigh, 1)
      .setStrokeStyle(1, PAPER.deckle, 0.8)
      .setScrollFactor(0)
      .setDepth(D + 4);
    this.viewer.coverText = this.add
      .text(306, 226, 'ARCHIVE SEALED\nSOLVE THE COLOR LINK TO REVEAL IT', {
        fontFamily: mono,
        fontSize: '12px',
        color: '#8d8579',
        align: 'center',
        lineSpacing: 5,
        letterSpacing: 1.4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(D + 5);
    this.viewer.frame = this.add
      .rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w - 84, VIEW.h - 62)
      .setStrokeStyle(1.5, 0xd8cfb9, 1)
      .setScrollFactor(0)
      .setDepth(D + 5);

    this.viewer.title = this.add
      .text(VIEW.w / 2, 44, '', {
        fontFamily: mono,
        fontSize: '14px',
        color: '#4a4640',
        align: 'center',
        letterSpacing: 2.4,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(D + 4);

    this.viewer.caption = this.add
      .text(62, 386, '', {
        fontFamily: mono,
        fontSize: '10px',
        color: '#4a4640',
        align: 'left',
        lineSpacing: 4,
        wordWrap: { width: 490 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(D + 4);

    this.viewer.boardCard = this.add
      .rectangle(734, 294, 330, 420, PAPER.manilla, 0.96)
      .setStrokeStyle(1.5, 0xd8cfb9, 1)
      .setScrollFactor(0)
      .setDepth(D + 2);
    this.viewer.boardTitle = this.add
      .text(734, 104, 'COLOR LINK', {
        fontFamily: mono,
        fontSize: '12px',
        color: '#4a4640',
        align: 'center',
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(D + 4);
    this.viewer.boardStatus = this.add
      .text(734, 484, '', {
        fontFamily: mono,
        fontSize: '9px',
        color: '#2f8c9e',
        align: 'center',
        lineSpacing: 3,
        letterSpacing: 1,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(D + 4);
    this.viewer.boardLayer = this.add.graphics().setScrollFactor(0).setDepth(D + 3);
    this.viewer.cordLayer = this.add.graphics().setScrollFactor(0).setDepth(D + 4);

    this.viewer.close = this.add
      .text(VIEW.w / 2, VIEW.h - 30, 'PRESS  E  TO PUT IT BACK', {
        fontFamily: mono,
        fontSize: '11px',
        color: '#8d8579',
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(D + 4);

    this.setViewerVisible(false);
  }

  setViewerVisible(on) {
    this.viewer.open = on;
    [
      this.viewer.scrim,
      this.viewer.card,
      this.viewer.imageFrame,
      this.viewer.frame,
      this.viewer.plate,
      this.viewer.imageCover,
      this.viewer.coverText,
      this.viewer.title,
      this.viewer.caption,
      this.viewer.boardCard,
      this.viewer.boardTitle,
      this.viewer.boardStatus,
      this.viewer.close,
    ].forEach((obj) => obj.setVisible(on));
    this.viewer.boardLayer.setVisible(on && Boolean(this.viewer.picture));
    this.viewer.cordLayer.setVisible(on && Boolean(this.viewer.picture));
    // Everything else gets out of the way, so nothing shows through the sheet.
    [this.objective, this.notebook, this.flash, this.bayLabel, this.hudBand, this.doorHint].forEach(
      (obj) => obj && obj.setVisible(!on),
    );
    this.controlLines.forEach((obj) => obj.setVisible(!on));
    Object.values(this.pictureLabels).forEach((entry) => entry.hint.setVisible(false));
    if (on) this.brushCursor.clear();
    if (!on) {
      this.viewer.wasLeftDown = false;
      this.viewer.boardLayer.clear();
      this.viewer.cordLayer.clear();
    }
  }

  openPicture(picture) {
    this.viewer.picture = picture;
    this.viewer.wasLeftDown = false;
    const archiveNumber = PAINTINGS.findIndex((candidate) => candidate.id === picture.id) + 1;
    this.viewer.title.setText(`${picture.title}  ·  ${picture.primarySign.toUpperCase()} + SMALL SEAL`);
    this.viewer.caption.setPosition(62, 386);

    // Fit the full artwork into a deliberately generous image well without
    // distorting it. At 1672×941 this renders at roughly 490×276 in the 960px
    // game view, so the signs remain legible while the board stays visible.
    const tex = this.textures.get(picture.key).getSourceImage();
    const maxW = 490;
    const maxH = 276;
    const scale = Math.min(maxW / tex.width, maxH / tex.height);
    this.viewer.plate
      .setTexture(picture.key)
      .setDisplaySize(tex.width * scale, tex.height * scale)
      .setPosition(306, 82 + (tex.height * scale) / 2);

    this.setViewerVisible(true);
    this.viewer.imageFrame.setVisible(true);
    this.viewer.boardTitle.setText(`COLOR LINK  ·  ${this.car.boardSpec(picture.id).pairs.length} PAIRS`);
    this.updateViewerArchive();
    this.drawViewerBoard();
  }

  updateViewerArchive() {
    const picture = this.viewer.picture;
    if (!picture) return;
    const solved = this.car.boardSolved(picture.id);
    this.viewer.plate.setVisible(solved);
    this.viewer.imageCover.setVisible(!solved);
    this.viewer.coverText.setVisible(!solved);
    this.viewer.caption.setText(
      solved
        ? picture.caption
        : 'THE ARCHIVE IS SEALED.\nSOLVE THE COLOR LINK TO REVEAL THE IMAGE.',
    );
    this.viewer.boardStatus.setText(
      solved
        ? 'ARCHIVE DEVELOPED\nTHE CAPTION IS NOW IN YOUR NOTES.'
        : picture.id === 'nave'
          ? 'DRAG EACH COLOR STRAIGHT ACROSS\nTO ITS MATCH. THREE SEPARATE LINES.'
          : 'DRAG FROM ONE COLORED DOT\nTO ITS MATCH. DO NOT SHARE A HOLE.',
    ).setColor(solved ? '#6f9c8b' : '#8d8579');
  }

  // At the door, E brings up everything already read, so the answer is a matter
  // of comparing rather than of remembering.
  openNotes() {
    const read = this.car.picturesRead();
    this.viewer.picture = null;
    this.viewer.wasLeftDown = false;
    this.viewer.title.setText('COMPARE THE THREE SMALL SEALS');
    this.viewer.plate.setVisible(false);
    this.viewer.caption
      .setText(
        read.length
          ? read.map((p) => `${p.title}\nLARGE ${p.primarySign.toUpperCase()}  +  SMALL ${p.sharedSign.toUpperCase()}`).join('\n\n')
          : 'YOU HAVE NOT READ ANY OF THEM YET.',
      )
      .setPosition(62, 110);
    this.setViewerVisible(true);
    this.viewer.imageFrame.setVisible(false);
    this.viewer.plate.setVisible(false);
    this.viewer.imageCover.setVisible(false);
    this.viewer.coverText.setVisible(false);
    this.viewer.boardCard.setVisible(false);
    this.viewer.boardTitle.setVisible(false);
    this.viewer.boardStatus.setVisible(false);
    this.viewer.boardLayer.setVisible(false);
    this.viewer.cordLayer.setVisible(false);
  }

  flashMessage(text, color = '#b4453a') {
    if (!this.flash) return;
    this.tweens.killTweensOf(this.flash);
    this.flash.setText(text).setColor(color).setAlpha(1);
    this.tweens.add({ targets: this.flash, alpha: 0, delay: 1700, duration: 800 });
  }

  // ================================================================= draw

  redrawPaint() {
    const g = this.paintLayer;
    const b = this.blockLayer;
    g.clear();
    b.clear();
    const rnd = makeRandom(0x31a9);

    this.car.state.painted.forEach((key) => {
      const cx = (key % GRID.w) * CELL;
      const cy = Math.floor(key / GRID.w) * CELL;
      paintedFill(g, rnd, cx, cy, CELL, CELL, PAPER.indigo, { alpha: 0.92 });
    });
    // One pass of edge ink so a drawn shape reads as a made thing, not a blob.
    g.lineStyle(1.4, PAPER.boneBlack, 0.4);
    this.car.state.painted.forEach((key) => {
      const cx = (key % GRID.w);
      const cy = Math.floor(key / GRID.w);
      if (!this.car.isPainted(cx, cy - 1)) g.lineBetween(cx * CELL, cy * CELL, cx * CELL + CELL, cy * CELL);
      if (!this.car.isPainted(cx, cy + 1)) {
        g.lineBetween(cx * CELL, cy * CELL + CELL, cx * CELL + CELL, cy * CELL + CELL);
      }
      if (!this.car.isPainted(cx - 1, cy)) g.lineBetween(cx * CELL, cy * CELL, cx * CELL, cy * CELL + CELL);
      if (!this.car.isPainted(cx + 1, cy)) {
        g.lineBetween(cx * CELL + CELL, cy * CELL, cx * CELL + CELL, cy * CELL + CELL);
      }
    });

    this.car.state.blocks.forEach((key) => {
      const cx = (key % GRID.w) * CELL;
      const cy = Math.floor(key / GRID.w) * CELL;
      paintedFill(b, rnd, cx, cy, CELL, CELL, PAPER.boneBlack, { alpha: 0.88 });
      b.lineStyle(1, PAPER.graphite, 0.5);
      b.strokeRect(cx, cy, CELL, CELL);
    });
  }

  drawFigure() {
    drawPaintedPlayer(this.figure, this.walker, this.input.activePointer);
  }

  // The cursor is the whole tutorial: it shows the cell you would fill, and
  // whether the car will let you.
  drawCursor() {
    const g = this.brushCursor;
    g.clear();
    const pointer = this.input.activePointer;
    const cx = colOf(pointer.worldX);
    const cy = rowOf(pointer.worldY);
    if (!this.car.inBounds(cx, cy)) return;

    const inReach = this.pointerInReach();
    const panel = this.panelAt(pointer.worldX, pointer.worldY);

    // Always show the arm's limit, so "too far" is never a mystery.
    g.lineStyle(1, PAPER.graphiteFaint, inReach ? 0.18 : 0.4);
    g.strokeCircle(this.walker.x, this.walker.y, REACH);

    if (panel) {
      g.lineStyle(2.4, inReach ? PAPER.cyan : PAPER.graphiteFaint, inReach ? 0.95 : 0.4);
      g.strokeRect(panel.x - 4, panel.y - 4, panel.w + 8, panel.h + 8);
      return;
    }

    const canPaint = this.car.canPaint(cx, cy);
    const canWash = this.car.canWash(cx, cy);
    const refusal = this.car.paintRefusal(cx, cy);

    let color = PAPER.graphiteFaint;
    let alpha = 0.35;
    if (!inReach) {
      color = PAPER.graphiteFaint;
      alpha = 0.3;
    } else if (canWash) {
      color = PAPER.bookCloth;
      alpha = 0.85;
    } else if (canPaint) {
      color = PAPER.cyan;
      alpha = 0.95;
    } else if (refusal === 'varnished') {
      color = PAPER.fault;
      alpha = 0.7;
    }

    g.lineStyle(2.2, color, alpha);
    g.strokeRect(cx * CELL, cy * CELL, CELL, CELL);
    if (inReach && canPaint) {
      g.fillStyle(PAPER.cyan, 0.16);
      g.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    }
  }

  // ================================================================ input

  pointerInReach() {
    const pointer = this.input.activePointer;
    return (
      Phaser.Math.Distance.Between(this.walker.x, this.walker.y, pointer.worldX, pointer.worldY) <= REACH
    );
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

  tryOpenPicture(picture, event) {
    event?.stopPropagation?.();
    if (this.viewer?.open) return;
    const inRange = this.car.pictureInRange(this.walker.x, this.walker.y);
    if (inRange?.id !== picture.id) {
      this.flashMessage('BUILD CLOSER — THEN CLICK OR PRESS E TO OPEN THIS ARCHIVE.', '#c8892f');
      return;
    }
    this.openPicture(picture);
  }

  tryAnswerDoor(panel, event) {
    event?.stopPropagation?.();
    if (this.viewer?.open) return;
    if (!this.nearDoor()) {
      this.flashMessage('STAND CLOSER TO THE SIGN WALL.', '#c8892f');
      return;
    }
    this.answerDoor(panel.sign);
  }

  // Only the one cell the player is actually standing in is off limits. Being
  // stricter than this meant a player at the very lip of a hole could not draw
  // the first plank of their own bridge, because their toes were grazing it.
  overlapsPlayer(cx, cy) {
    return (
      this.walker.x >= cx * CELL &&
      this.walker.x < cx * CELL + CELL &&
      this.walker.y >= cy * CELL &&
      this.walker.y < cy * CELL + CELL
    );
  }

  applyBrush(cx, cy, wash) {
    if (!this.car.inBounds(cx, cy)) return;
    if (wash) {
      if (this.car.wash(cx, cy)) {
        this.removeCellBody(cx, cy);
        this.paintDirty = true;
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
    const pointer = this.input.activePointer;
    const left = pointer.leftButtonDown();
    const right = pointer.rightButtonDown();
    const freshLeft = left && !this.wasLeftDown;
    const inReach = this.pointerInReach();

    // A left click on a door sign is an answer, never a brush stroke — and
    // holding the button there must not nag about varnish either.
    const panel = this.panelAt(pointer.worldX, pointer.worldY);
    if (panel) {
      if (freshLeft && inReach) this.answerDoor(panel.sign);
      this.wasLeftDown = left;
      this.lastBrushCell = null;
      return;
    }
    this.wasLeftDown = left;

    if (!left && !right) {
      this.lastBrushCell = null;
      return;
    }
    if (!inReach) {
      this.lastBrushCell = null;
      return;
    }

    const cx = colOf(pointer.worldX);
    const cy = rowOf(pointer.worldY);

    // Walk the line from the last cell so a fast drag leaves no gaps.
    const from = this.lastBrushCell;
    if (from && (from.cx !== cx || from.cy !== cy)) {
      const steps = Math.max(Math.abs(cx - from.cx), Math.abs(cy - from.cy));
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        this.applyBrush(
          Math.round(from.cx + (cx - from.cx) * t),
          Math.round(from.cy + (cy - from.cy) * t),
          right,
        );
      }
    } else {
      this.applyBrush(cx, cy, right);
    }
    this.lastBrushCell = { cx, cy };
  }

  stepViewerBoard() {
    const picture = this.viewer.picture;
    if (!picture) return;
    const pointer = this.input.activePointer;
    const left = pointer.leftButtonDown();

    if (!left && this.car.boardState(picture.id).drawing) this.car.boardRelease(picture.id);
    this.viewer.wasLeftDown = left;
  }

  handlePointerDown(pointer) {
    const picture = this.viewer?.picture;
    if (this.viewer?.open) {
      if (!picture) return;
      const hole = this.boardCellAt(pointer.x, pointer.y);
      if (!hole) return;
      if (pointer.rightButtonDown()) this.car.boardClearAt(picture.id, hole.c, hole.r);
      else this.car.boardBegin(picture.id, hole.c, hole.r);
      this.viewer.wasLeftDown = pointer.leftButtonDown();
      return;
    }

    // A quick click can begin and end between two update frames. Applying the
    // first cell from the actual pointer-down event makes a tap just as reliable
    // as a held stroke; stepBrush continues the same stroke while it is held.
    const left = pointer.leftButtonDown();
    const right = pointer.rightButtonDown();
    if ((!left && !right) || this.advancingToStudio) return;
    if (this.panelAt(pointer.worldX, pointer.worldY) || this.pictureAt(pointer.worldX, pointer.worldY)) return;
    if (Phaser.Math.Distance.Between(this.walker.x, this.walker.y, pointer.worldX, pointer.worldY) > REACH) return;
    const cx = colOf(pointer.worldX);
    const cy = rowOf(pointer.worldY);
    this.applyBrush(cx, cy, right);
    this.lastBrushCell = { cx, cy };
    this.wasLeftDown = left;
  }

  handleViewerPointerMove(pointer) {
    const picture = this.viewer?.picture;
    if (!this.viewer?.open || !picture || !pointer.leftButtonDown()) return;
    const hole = this.boardCellAt(pointer.x, pointer.y);
    if (hole) this.car.boardExtend(picture.id, hole.c, hole.r);
  }

  handleViewerPointerUp(pointer) {
    const picture = this.viewer?.picture;
    if (!picture) {
      this.lastBrushCell = null;
      this.wasLeftDown = false;
      return;
    }
    this.car.boardRelease(picture.id);
    this.viewer.wasLeftDown = false;
  }

  answerDoor(sign) {
    const result = this.car.chooseSign(sign);
    if (result.ok && result.reason === 'correct') this.playCompletion();
  }

  stepPlayer() {
    if (this.advancingToStudio) {
      this.walker.body.setVelocityX(0);
      return;
    }
    const k = this.keys;
    const body = this.walker.body;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const jump = k.up.isDown || k.w.isDown || k.space.isDown;

    body.setVelocityX(left && !right ? -MOVE_SPEED : right && !left ? MOVE_SPEED : 0);
    if (jump && body.blocked.down) body.setVelocityY(JUMP_VELOCITY);

    // Falling through the paper costs nothing that was drawn.
    if (this.walker.y > VIEW.h + 120) {
      this.car.fell();
      const bay = this.walker.x > 1920 ? 2120 : this.walker.x > 960 ? 1000 : 200;
      this.walker.setPosition(bay, 360);
      body.setVelocity(0, 0);
    }
  }

  // Retained for old QA routes. Normal fused play gives a recoverable refusal
  // instead of erasing three archive puzzles.
  playDeath(sign) {
    if (this.dying) return;
    this.dying = true;
    this.flashMessage(`${String(sign).toUpperCase()} WAS NOT IT. THE INK TAKES THE CAR.`, '#b4453a');
    // The flood is decoration; the restart is driven from update() on the
    // scene clock, so it cannot be lost if a tween callback never lands.
    this.deathFlood = this.add
      .rectangle(0, 0, VIEW.w, VIEW.h, PAPER.boneBlack, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 30);
    this.deathStartedAt = this.time.now;
  }

  stepDeath(time) {
    if (!this.dying) return false;
    const elapsed = time - this.deathStartedAt;
    const k = Phaser.Math.Clamp(elapsed / 900, 0, 1);
    if (this.deathFlood) this.deathFlood.setFillStyle(PAPER.boneBlack, k * k);
    this.walker.body.setVelocityX(0);
    if (elapsed >= 1100) {
      this.dying = false;
      this.scene.restart();
      return true;
    }
    return true;
  }

  playCompletion() {
    if (this.advancingToStudio) return;
    this.advancingToStudio = true;
    const bloom = this.add
      .rectangle(0, 0, VIEW.w, VIEW.h, PAPER.bookCloth, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.AIR + 1);
    this.tweens.add({
      targets: bloom,
      fillAlpha: { from: 0, to: 0.26 },
      duration: 520,
      yoyo: true,
      hold: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        bloom.destroy();
        this.goToStudio();
      },
    });
  }

  goToStudio() {
    // The gallery carries only the archive answer forward. Color begins in the
    // second scene, so the first scene never draws or pre-fills the HUE ring.
    this.registry.set('chapter4Pigments', []);
    this.registry.set('chapter4ArchiveAnswer', 'moon');
    this.tweens.add({ targets: this.music, volume: 0, duration: 360 });
    this.cameras.main.fadeOut(420, 247, 244, 236);
    this.time.delayedCall(450, () => this.scene.start('DrawingStudio'));
  }

  bayId() {
    return this.walker.x > 1920 ? 'C' : this.walker.x > 960 ? 'B' : 'A';
  }

  objectiveText() {
    const car = this.car;
    if (car.state.complete) return 'THE DOOR IS OPEN. IT WAS THE MOON.';
    const read = car.state.seen.size;
    if (read < PAINTINGS.length) {
      if (this.bayId() === 'A') return 'CLICK OR DRAG — PAPER APPEARS ANYWHERE WITHIN THE BRUSH CIRCLE.';
      const nearby = car.pictureInRange(this.walker.x, this.walker.y);
      if (nearby && !car.boardSolved(nearby.id)) return 'PRESS E — COLOR-LINK THE ARCHIVE BESIDE ITS IMAGE.';
      return `BUILD UP TO THE PICTURES AND READ THEM — ${read} OF ${PAINTINGS.length} SO FAR.`;
    }
    if (!car.boardsSolved()) return 'FINISH THE COLOR LINKS — EACH ARCHIVE HAS ITS OWN CARD.';
    return 'THE LARGE MARKS DIFFER — CHOOSE THE SMALL SEAL REPEATED IN ALL THREE.';
  }

  updateNotebook() {
    if (!this.notebook) return;
    const lines = PAINTINGS.map((p) => {
      const seen = this.car.state.seen.has(p.id);
      return `${seen ? '[x]' : '[ ]'}  ${p.title}${seen ? ` · ${p.primarySign.toUpperCase()} + ${p.sharedSign.toUpperCase()}` : ''}`;
    });
    this.notebook.setText(['THE GALLERY', ...lines].join('\n')).setAlpha(0.96);
  }

  showTutorial(id, text) {
    if (this.tutorialSeen[id] || this.activeTutorial) return;
    this.activeTutorial = id;
    this.tutorialPrompt.setText(text).setAlpha(1);
  }

  dismissTutorial(id) {
    if (this.activeTutorial !== id) return;
    this.tutorialSeen[id] = true;
    this.activeTutorial = null;
    this.tweens.add({ targets: this.tutorialPrompt, alpha: 0, duration: 180 });
  }

  updateTutorials() {
    // The first floor break is columns 20–31; the first removable paper wall
    // begins at column 40. These are spatial prompts, not global instructions.
    if (!this.tutorialSeen.bridge && this.walker.x >= 300) {
      this.showTutorial('bridge', 'LEFT MOUSE · DRAW PAPER ACROSS THE GAP');
    } else if (this.tutorialSeen.bridge && !this.tutorialSeen.wash && this.walker.x >= 710) {
      this.showTutorial('wash', 'RIGHT MOUSE · ERASE THE PAPER BLOCK');
    }
  }

  nearDoor() {
    return (
      Phaser.Math.Distance.Between(
        this.walker.x,
        this.walker.y,
        DOOR.x + DOOR.w / 2,
        DOOR.y + DOOR.h / 2,
      ) <= 280
    );
  }

  toggleViewer() {
    if (this.viewer.open) {
      this.setViewerVisible(false);
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
    this.flashMessage('NOTHING TO READ HERE.', '#a49c8d');
  }

  updatePictureHints() {
    const inRange = this.car.pictureInRange(this.walker.x, this.walker.y);
    PAINTINGS.forEach((picture) => {
      const entry = this.pictureLabels[picture.id];
      if (!entry) return;
      const here = inRange && inRange.id === picture.id;
      const seen = this.car.state.seen.has(picture.id);
      const hovered = this.hoveredPictureId === picture.id;
      entry.hint.setVisible(here || hovered);
      if (here || hovered) {
        entry.hint.setText(
          !here
            ? 'BUILD CLOSER TO REACH THIS ARCHIVE'
            : seen
              ? 'CLICK OR PRESS E  ·  REVIEW'
              : this.car.boardSolved(picture.id)
                ? 'CLICK OR PRESS E  ·  READ'
                : 'CLICK OR PRESS E  ·  OPEN COLOR LINK',
        );
      }
      const revealed = seen || this.car.boardSolved(picture.id);
      entry.plate.setVisible(revealed).setAlpha(revealed ? 1 : 0);
      entry.cover
        .setVisible(!revealed)
        .setStrokeStyle(here || hovered ? 2.4 : 1, here || hovered ? PAPER.cyan : PAPER.deckle, here || hovered ? 0.95 : 0.8);
    });

    if (!this.doorHint) return;
    const near = this.nearDoor();
    this.doorHint.setVisible(near);
    if (!near) return;
    // Kept to two short lines so it always sits inside the door frame.
    if (this.car.state.door.solved) this.doorHint.setText('OPEN');
    else if (!this.car.boardsSolved()) {
      const solved = PAINTINGS.filter((picture) => this.car.boardSolved(picture.id)).length;
      this.doorHint.setText(`COLOR LINKS\n${solved} OF ${PAINTINGS.length} DONE`);
    }
    else if (!this.car.allSeen()) {
      this.doorHint.setText(`READ THE ARCHIVES\n${this.car.state.seen.size} OF 3`);
    } else this.doorHint.setText('E · COMPARE SMALL SEALS\nCLICK THE REPEATED ONE');
  }

  processCarEvents() {
    let events = this.car.drainEvents();
    while (events.length) {
      events.forEach((event) => {
        if (event.type === 'picture-read') {
          this.flashMessage('ARCHIVE DEVELOPED · THE SYMBOLS ENTER YOUR NOTES.', '#2f8c9e');
          if (this.viewer.picture?.id === event.id) this.updateViewerArchive();
        } else if (event.type === 'cord-joined') {
          this.flashMessage('THAT COLOR PAIR IS THREADED.', '#6f9c8b');
        } else if (event.type === 'board-solved') {
          this.flashMessage('COLOR LINK COMPLETE. THE ARCHIVE DEVELOPS.', '#6f9c8b');
          this.car.readPicture(event.pictureId);
          if (this.viewer.picture?.id === event.pictureId) this.updateViewerArchive();
        } else if (event.type === 'cord-blocked') {
          this.flashMessage('ANOTHER CORD IS ALREADY IN THAT HOLE.', '#c8892f');
        } else if (event.type === 'door-dark') {
          this.flashMessage('THE SIGNS ARE DARK — FINISH EVERY COLOR LINK FIRST.', '#c8892f');
        } else if (event.type === 'door-silent') {
          this.flashMessage(`THE DOOR STAYS SHUT — ${event.seen} OF ${event.of} ARCHIVES READ.`, '#c8892f');
        } else if (event.type === 'door-refused') {
          this.flashMessage(`${String(event.sign).toUpperCase()} IS NOT THE WORD IN THE NOTES.`, '#b4453a');
        } else if (event.type === 'door-opened') {
          this.flashMessage('THE MOON. THE DOOR OPENS.', '#6f9c8b');
        } else if (event.type === 'paint-refused' && event.reason === 'varnished') {
          this.flashMessage('THE PAPER IS VARNISHED HERE. PAINT WILL NOT TAKE.', '#c8892f');
        }
      });
      events = this.car.drainEvents();
    }
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;

    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.scene.restart();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.read)) this.toggleViewer();

    // Dying takes the car away from the player for a moment, then starts over.
    if (this.stepDeath(time)) {
      this.drawFigure();
      return;
    }

    // With a plate in hand the car holds still.
    if (this.viewer && this.viewer.open) {
      this.walker.body.setVelocityX(0);
      this.stepViewerBoard();
      this.drawViewerBoard();
      this.processCarEvents();
      this.updateNotebook();
      this.updateViewerArchive();
      return;
    }

    this.stepBrush();
    this.stepPlayer();

    if (this.paintDirty) {
      this.redrawPaint();
      this.paintDirty = false;
    }
    this.drawFigure();
    this.drawCursor();
    this.drawDoorSigns();
    this.processCarEvents();

    this.updateNotebook();
    this.updatePictureHints();
    this.updateTutorials();

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
    // Until the board is threaded the signs are unlit — visible as shapes, but
    // plainly not yet askable.
    const lit = this.car.boardsSolved();

    DOOR.panels.forEach((panel) => {
      const chosen = this.car.state.door.chosen === panel.sign;
      const right = opened && panel.sign === DOOR.correct;
      g.fillStyle(right ? PAPER.verdigris : PAPER.sheetHigh, right ? 0.4 : lit ? 0.92 : 0.4);
      g.fillRect(panel.x, panel.y, panel.w, panel.h);
      g.lineStyle(right ? 2.6 : 1.6, right ? PAPER.verdigris : PAPER.graphite, lit ? 0.9 : 0.4);
      g.strokeRect(panel.x, panel.y, panel.w, panel.h);
      const art = this.panelArt && this.panelArt[panel.sign];
      if (art) art.setAlpha(lit ? 1 : 0.3);
      const label = this.panelLabels && this.panelLabels[panel.sign];
      if (label) label.setAlpha(lit ? 1 : 0.38);
      if (this.hoveredDoorSign === panel.sign) {
        g.lineStyle(2.6, PAPER.cyan, 0.96);
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
    const pointer = this.input.activePointer;
    const cx = colOf(pointer.worldX);
    const cy = rowOf(pointer.worldY);
    return {
      scene: 'PaintedCountry',
      bay: this.bayId(),
      objective: this.objectiveText(),
      viewer: {
        open: Boolean(this.viewer?.open),
        picture: this.viewer?.picture?.id ?? null,
        imageVisible: Boolean(this.viewer?.picture && this.car.boardSolved(this.viewer.picture.id)),
        board: this.viewer?.picture ? this.car.snapshot().boards[this.viewer.picture.id] : null,
      },
      ...this.car.snapshot(),
      pigmentRingVisible: false,
      advancingToStudio: this.advancingToStudio,
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        onGround: this.walker.body.blocked.down,
      },
      pointer: {
        x: Math.round(pointer.worldX),
        y: Math.round(pointer.worldY),
        cell: [cx, cy],
        inReach: this.pointerInReach(),
        canPaint: this.car.canPaint(cx, cy),
        canWash: this.car.canWash(cx, cy),
        overPanel: this.panelAt(pointer.worldX, pointer.worldY)?.sign ?? null,
      },
    };
  }
}

export const PAINTED_COUNTRY_VIEW = VIEW;
