import Phaser from 'phaser';
import { FRAME_DT_CAP_MS } from './chapterConstants.js';
import {
  BARRIERS,
  FADED_SPANS,
  FINISH_FRONT,
  GROUND_SPANS,
  LINE,
  LINE_WORLD,
  RIDE,
  RIDER,
  TRAIN,
  TRAIN_COLOURS,
  coatAlpha,
  createPaintedLine,
  platformLines,
  key as lineKey,
} from './paintedLineModel.js';
import { PIGMENTS } from './chapter4ExpansionModel.js';
import { PAPER } from './paperPalette.js';
import { createPaintedPlayer, drawPaintedPlayer, preloadPaintedPlayer } from './paintedPlayerFigure.js';
import { addFrames, addLayers, ensureCanvasTexture, ensurePair } from './art/artTextures.js';
import { paintCountry } from './art/countryArt.js';
import { TRAIN_WASH_ALPHA, paintTrain, trainTint } from './art/trainArt.js';
import { RESIDENT, paintResident } from './art/figuresArt.js';
import { CELL_STAMP, cellAtlasFrames, paintCellAtlas } from './art/cellArt.js';
import { draftBlockEdges, shadePit } from './art/pencilEdges.js';
import { buildPaperGrain, draftLine, draftRect, hatchRect, makeRandom } from './paperSurface.js';
import { BrushInput } from './brushInput.js';
import { HOLD_SECONDS, MONO, PaperTag, RestartHold, UI, drawGlintMarker, hideUnderLowGraphics, noteAt } from './chapterUi.js';
import { bell as ringBell, chuff, installLineAudio, whistle } from './lineAudio.js';
import { reducedMotionActive } from '../../shell/motion.js';
import { CINEMATICS, navigateAfterCinematic } from '../../shell/gameFlow.js';
import { createSaveStore } from '../../shell/saveSystem.js';
import { devParam } from '../../devMode.js';
import { RESUME_REGISTRY_KEY, recordChapter4Resume } from './chapter4Resume.js';
import { createFallGuard, placeBody } from './fallGuard.js';
import { BrushNib } from './brushNib.js';
import { nibState, reachExit, withinReach } from './brushReach.js';
import { GhostStroke } from './ghostStroke.js';
import { createStrokeBook } from './brushStrokes.js';
import { StrokeLayer } from './strokeLayer.js';
import { stepFollower } from './residentMotion.js';

// Chapter 4 // THE PAINTED COUNTRY — Part III, "paint the line ahead".
//
// Round 6 (George, G2): the painted train used to run one stretch per bell
// and stand still in between, which was not fun. Now it never waits for a
// bell, and the train rolls on continuously (paintedLineModel.js).
//
// Round 11 (George: standing right on top of the locomotive was too odd):
// Butch rides where a person rides the front of an engine, on its front
// footplate: a plank over the buffer beam, one hand on the grab rail from
// the smokebox, leaning out with the brush over the line just ahead. That is
// also the closest place to the work, so the reach and the camera are as
// they were (RIDER in paintedLineModel.js).
//
//   · it runs at its pencil pace on Rosa's pencil rails, and faster on rails
//     he has just painted, so laying wet paint ahead of it is what drives it;
//   · it has weight: it gathers speed slowly and eases to a stop, whistling,
//     in front of any break it cannot cross (a torn gap, rubbed-out rails,
//     grey paper across the line), and rolls on the moment the way is clear;
//   · nothing fails. Kept standing too long, the weather takes a coat of
//     its borrowed paint, which only changes how the platform remembers it.
//
// The six residents who lent their colours run behind it. At the platform
// Butch hops down and washes each borrowed colour back to whoever lent it,
// and the pencil train that is left still runs, on to the Museum.
//
// A / D lean him a little on the footplate, SPACE gives a small hop; the
// brush is the mouse (or I J K L with F / SHIFT, or the right stick with
// RT / LT).

const VIEW = Object.freeze({ w: 960, h: 600 });
const CELL = LINE.cell;
const TRACK_Y = LINE.trackRow * CELL; // 440
// Riding, the brush reaches a little further than on foot: he leans out off
// the footplate over the line (RIDER.reach).
const REACH = RIDER.reach;
const WALK_REACH = 180;
const MOVE_SPEED = 200;
const JUMP_VELOCITY = -560;
const DEPTH = Object.freeze({ SKY: 0, HILLS: 4, GRID: 8, TRACK: 12, BLOCK: 16, PAINT: 18, TRAIN: 24, PEOPLE: 26, FIGURE: 30, CURSOR: 34, UI: 60, GRAIN: 80 });

const PART_OF = Object.fromEntries(PIGMENTS.map((p) => [p.id, p]));

// The painted train at the line's scale, in coordinates relative to its rear
// (x0 = front - length); these are partRects() below, so the drawing and the
// hit areas are the same rectangles.
const TRAIN_L = TRAIN.length * CELL;
const TRAIN_TOP = TRAIN.topRow * CELL;
// Round 11: the carriage is a little shorter so the engine keeps its length
// with a front footplate ahead of the smokebox for Butch to ride on.
const LINE_TRAIN_SPEC = Object.freeze({
  S: 1,
  nose: 1,
  carriage: { x: 8, y: TRAIN_TOP + 22, w: 132, h: 46 },
  roof: { x: 4, y: TRAIN_TOP + 8, w: 180, h: 16 },
  cab: { x: 140, y: TRAIN_TOP + 8, w: 46, h: 60 },
  boiler: { x: 186, y: TRAIN_TOP + 30, w: 58, h: 38 },
  stack: { x: 206, y: TRAIN_TOP + 6, w: 20, h: 26 },
  stackWhistle: false,
  windows: 3,
  wheels: [22, 80, 136, 196, 232].map((dx) => ({ x: 10 + dx, y: TRACK_Y - 12, r: 12 })),
  frame: { x0: 6, x1: TRAIN_L - 6, y: TRACK_Y - 20, h: 7 },
  railDrop: 14,
  // where he rides: the plank's top is RIDER.feetY (its grab rail is drawn
  // in front of him, FOOT_RAIL, so his hand is on it)
  footboard: { x: TRAIN_L + RIDER.dx - 16, y: RIDER.feetY, w: 30, h: 5 },
});
// The footplate's grab rail, relative to the nose: a stanchion at the front
// edge and a rail back to the smokebox at his hand height.
const FOOT_RAIL = Object.freeze({ x0: RIDER.dx - 14, x1: -1, y: RIDER.feetY - 27, top: RIDER.feetY - 35 });
const LINE_TRAIN_ORDER = ['blue', 'violet', 'orange', 'red', 'yellow'];
let lineTrainKeys = null;
// Where Butch rides: RIDER (paintedLineModel.js), on the front footplate.
// The six residents, each drawn their own way (art/figuresArt.js).
const RESIDENT_TYPE = Object.freeze({ red: 0, orange: 1, yellow: 2, green: 3, blue: 4, violet: 5 });
const PALE = 0xd6d0c4;
// The platform at the end of the line.
const PLATFORM = Object.freeze({ x: (FINISH_FRONT + 1) * CELL - 40, w: 480, h: 16 });
// The first gap: its cells get the lesson's dotted stroke.
const FIRST_GAP = Object.freeze({ from: GROUND_SPANS[0].to, to: GROUND_SPANS[1].from });

export class PaintedLineScene extends Phaser.Scene {
  constructor() {
    super('PaintedLine');
  }

  preload() {
    preloadPaintedPlayer(this);
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
    this.strokes = createStrokeBook({ cols: LINE.cols });
    this.lastBrushCell = null;
    this.lastStrokePt = null;
    this.hold = { key: null, progress: 0 };
    this.hover = null;
    this.departing = false;
    this.departOffset = 0;
    this.finished = false;
    this.paintDirty = true;
    this.steam = [];
    this.chuffDistance = 0;
    this.puffDistance = 0;
    this.whistleClock = 0;
    this.gaugeNeedle = 0;
    this.riding = true;
    this.rider = { lean: 0, leanV: 0, hop: 0, hopV: 0, x: 0, y: 0 };
    this.startedAt = this.time.now;
    this.tutorialSeen = { gap: false, ink: false, barrier: false, faded: false, return: false };
    this.inkTagUntil = 0;
    this.taughtInkAt = null;

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, LINE_WORLD.w, LINE_WORLD.h);
    this.physics.world.setBounds(0, -300, LINE_WORLD.w, LINE_WORLD.h + 800);

    this.buildCountry();
    this.buildTrackArt();
    this.buildSolids();
    // The archive's grey is still a laid coat of cells; Butch's paint is
    // drawn as brush strokes over the grid it collides on (strokeLayer.js).
    ensureCanvasTexture(this, 'ch4-cells', () => paintCellAtlas().canvas);
    addFrames(this, 'ch4-cells', cellAtlasFrames());
    this.strokeLayer = new StrokeLayer(this, { book: this.strokes, cell: CELL, worldW: LINE_WORLD.w, worldH: LINE_WORLD.h, depth: DEPTH.PAINT, seed: 0x11ae });
    this.railArt = this.add.graphics().setDepth(DEPTH.PAINT + 0.5);
    this.blockArt = this.add.blitter(0, 0, 'ch4-cells').setDepth(DEPTH.BLOCK);
    // the grey's pencil contour, redrawn with the stamps (alpha R3 · R6)
    this.blockEdges = this.add.graphics().setDepth(DEPTH.BLOCK + 0.5);
    this.buildTrain();
    this.dripArt = this.add.graphics().setDepth(DEPTH.TRAIN + 0.5);
    this.steamArt = this.add.graphics().setDepth(DEPTH.TRAIN + 1);
    this.streamArt = this.add.graphics().setDepth(DEPTH.PEOPLE + 1);
    this.markerArt = this.add.graphics().setDepth(DEPTH.CURSOR - 1);
    this.buildPlayer();
    this.buildResidents();
    this.buildGauge();
    this.buildGrain();

    this.keys = this.input.keyboard.addKeys({ a: 'A', d: 'D', w: 'W', e: 'E' });
    this.input.keyboard.addCapture(['SPACE', 'W']);
    this.input.mouse?.disableContextMenu();
    this.brush = new BrushInput(this, { anchor: () => this.brushHand(), radius: REACH - 2 });
    this.brush.cursor.setDepth(DEPTH.CURSOR + 1);
    this.nib = new BrushNib(this, { depth: DEPTH.CURSOR, reach: REACH, cell: CELL });
    this.ghost = new GhostStroke(this, { depth: DEPTH.CURSOR - 0.5, cell: CELL });
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

    this.placeRider();
    this.cameras.main.centerOn(this.line.state.x + 170, VIEW.h / 2);
    this.applyQa();
    // The line is this page's resume point from here on (it restarts whole:
    // the ride is about a minute). Never on a dev route.
    if (this.registry.get(RESUME_REGISTRY_KEY)?.room === 'line') this.registry.remove(RESUME_REGISTRY_KEY);
    if (!this.qa) {
      try { recordChapter4Resume(createSaveStore(), { room: 'line' }); } catch { /* storage unavailable */ }
    }
    this.cameras.main.fadeIn(520, 247, 244, 236);
    if (!this.line.state.arrived) {
      noteAt(this, this.rider.x + 60, TRAIN_TOP - 70, 'THE LINE AHEAD IS BROKEN.\nPAINT IT IN AS YOU RIDE.', { hold: 3200 });
    }
  }

  frontX() {
    return this.line.state.x;
  }

  // Butch's middle, where the brush's reach is measured from.
  brushHand() {
    if (this.riding) return { x: this.rider.x, y: this.rider.y };
    return { x: this.walker.x, y: this.walker.y };
  }

  get reach() {
    return this.riding ? REACH : WALK_REACH;
  }

  applyQa() {
    const qa = this.qa;
    if (qa === 'line-clear' || qa === 'line-end') {
      this.line.obstaclesAhead().forEach(({ col, reason }) => {
        if (reason === 'gap' || reason === 'faded') this.paintCell(col, LINE.trackRow, true);
        else for (let r = TRAIN.topRow; r < LINE.trackRow; r += 1) while (this.line.isSolid(col, r)) this.line.wash(col, r);
      });
      this.strokes.end();
      this.syncBodies();
      this.paintDirty = true;
    }
    if (qa === 'line-end') {
      this.line.placeAt(FINISH_FRONT);
      this.line.state.x = this.line.finishX;
      this.line.state.arrived = true;
      this.line.drainEvents();
      this.residents.forEach((p, i) => { p.x = this.line.state.x - TRAIN_L - 30 - i * 26; });
      this.placeRider();
      this.cameras.main.centerOn(this.line.state.x - 120, VIEW.h / 2);
      this.onArrived({ instant: true });
    }
  }

  // ============================================================ the country

  buildCountry() {
    const g = this.add.graphics().setDepth(DEPTH.SKY);
    const W = LINE_WORLD.w;
    g.fillStyle(PAPER.sheetHigh, 1).fillRect(0, 0, W, LINE_WORLD.h);
    g.fillStyle(PAPER.sheetLow, 1).fillRect(0, 0, W, 52);
    // Rosa's country, drawn and waiting for its colours: one wash per colour
    // the residents lent. Each blooms back in as Butch washes that colour off
    // the train at the platform (the chapter's completion transformation).
    // It drifts at 0.35 of the camera, so 2760 px covers the whole line.
    this.country = addLayers(this, 'ch4-line-country-r6', () => paintCountry({
      w: 2760,
      h: 400,
      seed: 0x11ae,
      features: [
        { kind: 'farm', x: 120, s: 0.75 }, { kind: 'orchard', x: 330, s: 0.7, n: 5 }, { kind: 'hawthorn', x: 600, s: 0.8 },
        { kind: 'house', x: 760, s: 0.6, lit: true }, { kind: 'orchard', x: 900, s: 0.6, n: 4 }, { kind: 'tree', x: 1150, s: 0.8 },
        { kind: 'orchard', x: 1300, s: 0.75, n: 6 }, { kind: 'hawthorn', x: 1640, s: 0.7 }, { kind: 'farm', x: 1780, s: 0.8 },
        { kind: 'orchard', x: 2000, s: 0.65, n: 4 }, { kind: 'tree', x: 2240, s: 0.7 }, { kind: 'house', x: 2420, s: 0.7, lit: true },
        { kind: 'orchard', x: 2560, s: 0.6, n: 3 },
      ],
    }), { x: 0, y: TRACK_Y - 372, depth: DEPTH.HILLS, scrollFactor: 0.35, washAlpha: 0 });
    // Part I's ruled grid, over the air the line runs through
    const grid = this.add.graphics().setDepth(DEPTH.GRID);
    grid.lineStyle(1, PAPER.graphiteFaint, 0.1);
    for (let c = 0; c <= LINE.cols; c += 1) grid.lineBetween(c * CELL, 260, c * CELL, TRACK_Y);
    for (let r = 13; r <= LINE.trackRow; r += 1) grid.lineBetween(0, r * CELL, W, r * CELL);

    this.add.text(24, 26, 'THE LINE AHEAD', {
      fontFamily: MONO, fontSize: '13px', color: '#5c574f', letterSpacing: 2.5,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.UI);
    // On the ground under the platform, like the gallery's bay names.
    this.add.text(PLATFORM.x + PLATFORM.w / 2, TRACK_Y + 34, 'THE LAST PAINTED PLATFORM', {
      fontFamily: MONO, fontSize: '12px', color: '#5c574f', align: 'center', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.TRACK + 1);
  }

  buildTrackArt() {
    const g = this.add.graphics().setDepth(DEPTH.TRACK);
    const faded = (c) => FADED_SPANS.some(({ from, to }) => c >= from && c < to);
    GROUND_SPANS.forEach(({ from, to }) => {
      const x = from * CELL;
      const w = (to - from) * CELL;
      g.fillStyle(PAPER.sheetLow, 1).fillRect(x, TRACK_Y, w, LINE_WORLD.h - TRACK_Y);
      hatchRect(g, this.rnd, x, TRACK_Y, w, 50, { spacing: 17, alpha: 0.2, flip: true });
      // the rails, except where the archive rubbed them out
      let runFrom = null;
      for (let c = from; c <= to; c += 1) {
        const rail = c < to && !faded(c);
        if (rail && runFrom === null) runFrom = c;
        if (!rail && runFrom !== null) {
          this.drawRails(g, runFrom * CELL, (c - runFrom) * CELL, 0.9);
          runFrom = null;
        }
      }
    });
    // rubbed out: ghosts of the rails, and the eraser's crumbs
    FADED_SPANS.forEach(({ from, to }) => {
      const x = from * CELL;
      const w = (to - from) * CELL;
      this.drawRails(g, x, w, 0.16);
      const r = makeRandom(0xe7a5 + from);
      g.lineStyle(1, PAPER.graphiteFaint, 0.55);
      for (let i = 0; i < w / 9; i += 1) {
        const cx = x + r() * w;
        const cy = TRACK_Y + 2 + r() * 12;
        g.lineBetween(cx, cy, cx + 3 + r() * 6, cy - 2 + r() * 4);
      }
      g.fillStyle(PAPER.deckle, 0.7);
      for (let i = 0; i < w / 14; i += 1) g.fillCircle(x + r() * w, TRACK_Y - 1 - r() * 4, 0.8 + r() * 1.2);
    });
    // torn holes between
    for (let i = 0; i < GROUND_SPANS.length - 1; i += 1) {
      const x = GROUND_SPANS[i].to * CELL;
      const w = (GROUND_SPANS[i + 1].from - GROUND_SPANS[i].to) * CELL;
      shadePit(g, x, TRACK_Y, w, LINE_WORLD.h - TRACK_Y, { seed: 0x9180 + i });
      g.lineStyle(1.6, PAPER.deckle, 0.95);
      [x, x + w].forEach((xx) => draftLine(g, this.rnd, xx, TRACK_Y, xx, LINE_WORLD.h, { overshoot: 0, jitter: 2.6, segments: 10 }));
    }
    // the platform
    g.fillStyle(PAPER.sheetMid, 1).fillRect(PLATFORM.x, TRACK_Y - PLATFORM.h, PLATFORM.w, PLATFORM.h);
    g.lineStyle(1.6, PAPER.graphite, 0.8);
    draftRect(g, this.rnd, PLATFORM.x, TRACK_Y - PLATFORM.h, PLATFORM.w, PLATFORM.h, { overshoot: 4 });
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
    // the platform is a step up off the track, and he stands on it
    solid(PLATFORM.x + 40, TRACK_Y - PLATFORM.h, PLATFORM.w - 40, PLATFORM.h);
    solid(-24, -300, 24, LINE_WORLD.h + 400);
    solid(LINE_WORLD.w, -300, 24, LINE_WORLD.h + 400);
  }

  addCellBody(c, r) {
    const k = lineKey(c, r);
    if (this.cellBodies.has(k)) return;
    const object = this.add.rectangle(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL, CELL, 0xffffff, 0);
    this.physics.add.existing(object, true);
    // Butch's own paint is a one-way platform: he lands on it from above and
    // passes it from below and the sides, so he can walk and jump under the
    // steps he built (alpha round 4). The archive's grey stays solid.
    if (this.line.isPainted(c, r) && !this.line.isBlock(c, r)) {
      object.body.checkCollision.down = false;
      object.body.checkCollision.left = false;
      object.body.checkCollision.right = false;
    }
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
    // His body only takes over at the platform; riding, the engine carries him.
    this.walker = this.add.rectangle(this.frontX() + RIDER.dx, RIDER.feetY - 29, 16, 58, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.walker.body.enable = false;
    this.physics.add.collider(this.walker, this.solids);
    this.figure = createPaintedPlayer(this, DEPTH.FIGURE);
    this.camTarget = this.add.zone(this.frontX() + 170, VIEW.h / 2, 2, 2);
    this.cameras.main.startFollow(this.camTarget, true, 0.09, 0.09);
    // Falls are only possible once he is off the train (fallGuard.js).
    this.fallGuard = createFallGuard({
      start: { x: PLATFORM.x + 80, y: TRACK_Y - PLATFORM.h - 32 },
      sections: GROUND_SPANS.slice(1).map(({ from }) => ({ x: from * CELL + 2 * CELL, y: TRACK_Y - 32 })),
      bodyWidth: 16,
      fallY: VIEW.h + 100,
      isFloorAt: (x) => this.line.isGround(Math.floor(x / CELL), LINE.trackRow) || this.line.isPainted(Math.floor(x / CELL), LINE.trackRow),
    });
  }

  // On the front footplate, carried by the train (and riding its springs),
  // leaning a little with A / D, a small hop on SPACE.
  placeRider() {
    const r = this.rider;
    r.x = this.frontX() + this.departOffset + RIDER.dx + r.lean * RIDER.lean;
    r.y = RIDER.feetY - 29 - r.hop + (this.trainBody?.y ?? 0);
    if (this.riding) this.walker.setPosition(r.x, r.y);
  }

  stepRider(move, dt) {
    const r = this.rider;
    const target = move.left && !move.right ? -1 : move.right && !move.left ? 1 : 0;
    // a soft spring on the footplate: he leans out and settles back
    r.leanV += (-(r.lean - target) * 90 - r.leanV * 12) * dt;
    r.lean = Phaser.Math.Clamp(r.lean + r.leanV * dt, -1.2, 1.2);
    if (move.jumpPressed && r.hop <= 0.01) r.hopV = 200;
    if (r.hop > 0 || r.hopV > 0) {
      r.hopV -= 1500 * dt;
      r.hop = Math.max(0, r.hop + r.hopV * dt);
      if (r.hop === 0) r.hopV = 0;
    }
    this.placeRider();
  }

  // The six residents who lent their colours, running behind the train.
  buildResidents() {
    const rear = this.frontX() - TRAIN_L;
    this.residents = TRAIN_COLOURS.map((id, i) => ({
      id,
      color: PART_OF[id].color,
      name: PART_OF[id].source,
      x: rear - 40 - i * 26,
      v: 0,
      stride: 0,
      facing: 1,
      seed: i * 0.8,
      restored: false,
    }));
    this.residents.forEach((p) => {
      const type = RESIDENT_TYPE[p.id];
      const keys = ensurePair(this, `ch4-resident-${type}`, () => paintResident(type));
      [keys.pencil, keys.wash].forEach((key) => addFrames(this, key, Array.from({ length: RESIDENT.frames }, (_, f) => ({ name: `f${f}`, x: f * RESIDENT.w, y: 0, w: RESIDENT.w, h: RESIDENT.h }))));
      p.cloth = this.add.image(p.x, TRACK_Y, keys.wash, 'f0').setOrigin(0.5, 1).setDepth(DEPTH.PEOPLE).setTint(PALE);
      p.sprite = this.add.image(p.x, TRACK_Y, keys.pencil, 'f0').setOrigin(0.5, 1).setDepth(DEPTH.PEOPLE + 0.1);
    });
    this.time.delayedCall(2600, () => this.shout(0, 'WAIT FOR US!'));
    this.time.delayedCall(5200, () => this.shout(3, 'OUR COLOURS!'));
  }

  shout(index, text) {
    const p = this.residents[index];
    if (!p || this.line.state.arrived) return;
    const label = this.add.text(p.x, TRACK_Y - 96, text, {
      fontFamily: MONO, fontSize: '12px', color: UI.ink, fontStyle: 'bold', backgroundColor: '#fdfcf8ee', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setDepth(DEPTH.UI);
    this.tweens.add({ targets: label, y: label.y - 8, alpha: 0, delay: 1800, duration: 500, ease: 'Sine.easeIn', onComplete: () => label.destroy() });
  }

  buildGauge() {
    this.gauge = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.UI + 2);
    this.gaugeLabel = this.add.text(VIEW.w / 2 + 34, 27, '', {
      fontFamily: MONO, fontSize: '11px', color: '#5c574f', fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.UI + 2);
  }

  buildGrain() {
    const key = buildPaperGrain(this, 'paper-grain-line');
    hideUnderLowGraphics(this, [this.add.tileSprite(0, 0, VIEW.w, VIEW.h, key).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.GRAIN).setAlpha(0.6)]);
  }

  // The engine's pace, as a brass steam gauge in the title strip: its needle
  // sits in the pencil band on pencil rails and swings into the indigo band
  // on wet paint. It is the whole speedometer; nothing else counts down.
  drawGauge(dt) {
    const g = this.gauge;
    g.clear();
    const cx = VIEW.w / 2;
    const cy = 30;
    const R = 19;
    const a0 = Math.PI * 0.8;
    const a1 = Math.PI * 2.2;
    const angleOf = (v) => a0 + (a1 - a0) * Phaser.Math.Clamp(v / RIDE.painted, 0, 1);
    const speed = this.line.state.arrived ? 0 : this.line.state.speed;
    this.gaugeNeedle += (speed - this.gaugeNeedle) * Math.min(1, dt * 6);
    g.fillStyle(0x0b0907, 0.82).fillCircle(cx, cy, R + 7);
    g.lineStyle(1.5, 0xb08a4a, 0.9).strokeCircle(cx, cy, R + 7);
    // bands: stopped, pencil pace, wet-paint pace
    const band = (from, to, color, alpha) => {
      g.lineStyle(4, color, alpha);
      g.beginPath();
      g.arc(cx, cy, R, angleOf(from), angleOf(to), false);
      g.strokePath();
    };
    band(0, RIDE.pencil, 0xeadfc6, 0.35);
    band(RIDE.pencil, RIDE.painted, 0x6f8fc0, 0.95);
    const na = angleOf(this.gaugeNeedle);
    const shake = speed > 20 && !reducedMotionActive() ? Math.sin(this.time.now / 37) * 0.025 : 0;
    g.lineStyle(2.4, 0xf2c27a, 1).lineBetween(cx, cy, cx + Math.cos(na + shake) * (R - 2), cy + Math.sin(na + shake) * (R - 2));
    g.fillStyle(0xb08a4a, 1).fillCircle(cx, cy, 3.2);
    const waiting = this.line.state.waiting;
    const label = this.line.state.arrived ? 'PLATFORM'
      : !this.line.state.started ? 'STEAM UP'
        : waiting ? 'WAITING'
          : this.line.state.pace > 0.5 ? 'WET PAINT · FAST' : 'PENCIL RAILS';
    this.gaugeLabel.setText(label).setColor(waiting ? UI.oxblood : '#5c574f');
  }

  // ============================================================== drawing

  // The archive's grey (stamps from the cell atlas) and the rails over
  // Butch's paint. The paint itself is the stroke layer.
  redrawCells() {
    const b = this.blockArt;
    const rails = this.railArt;
    b.clear();
    rails.clear();
    const off = CELL_STAMP.bleed;
    const wet = new Set([...this.line.state.painted, ...this.line.state.inked]);
    wet.forEach((k) => {
      const c = k % LINE.cols;
      const r = Math.floor(k / LINE.cols);
      if (r === LINE.trackRow) this.drawRails(rails, c * CELL, CELL, 1);
    });
    this.line.state.blocks.forEach((k) => {
      const c = k % LINE.cols;
      const r = Math.floor(k / LINE.cols);
      b.create(c * CELL - off, r * CELL - off, `grey-${(c * 5 + r) % CELL_STAMP.variants}`);
    });
    draftBlockEdges(this.blockEdges, this.line.state.blocks, LINE.cols, CELL);
  }

  // The parts' hit rects are the drawing's own rectangles (LINE_TRAIN_SPEC).
  partRects(frontX) {
    const L = TRAIN.length * CELL;
    const x0 = frontX - L;
    const at = (r) => ({ x: x0 + r.x, y: r.y, w: r.w, h: r.h });
    const S = LINE_TRAIN_SPEC;
    return {
      green: { x: x0 + 10, y: TRACK_Y - 26, w: L - 20, h: 26 },
      blue: at(S.carriage),
      violet: at(S.roof),
      orange: at(S.cab),
      red: at(S.boiler),
      yellow: at(S.stack),
    };
  }

  // The five wheels, drawn over the body, cab and engine.
  wheelCentres(frontX) {
    const x0 = frontX - TRAIN.length * CELL;
    return LINE_TRAIN_SPEC.wheels.map((w) => ({ x: x0 + w.x, y: TRACK_Y - 12 }));
  }

  // The painted train (art/trainArt.js) at the line's scale: pencil parts
  // with their borrowed colours over them, in a container that rolls along.
  buildTrain() {
    if (!lineTrainKeys || !this.textures.exists(lineTrainKeys.chassis.pencil)) {
      const art = paintTrain(LINE_TRAIN_SPEC, 0x11a);
      const register = (name, part) => {
        this.textures.addCanvas(`${name}:pencil`, part.pencil);
        if (part.wash) this.textures.addCanvas(`${name}:wash`, part.wash);
        if (part.edge) this.textures.addCanvas(`${name}:edge`, part.edge);
        return { pencil: `${name}:pencil`, wash: `${name}:wash`, edge: `${name}:edge`, x: part.x ?? 0, y: part.y ?? 0 };
      };
      this.textures.addCanvas('ch4-line-train-paper', art.paper.canvas);
      lineTrainKeys = {
        paper: { key: 'ch4-line-train-paper', x: art.paper.x, y: art.paper.y },
        chassis: register('ch4-line-train-chassis', { pencil: art.chassis.pencil, x: art.chassis.x, y: art.chassis.y }),
        parts: Object.fromEntries(LINE_TRAIN_ORDER.map((id) => [id, register(`ch4-line-train-${id}`, art.parts[id])])),
        wheel: register('ch4-line-train-wheel', art.wheel),
      };
    }
    const keys = lineTrainKeys;
    this.trainArt = this.add.container(0, 0).setDepth(DEPTH.TRAIN);
    this.trainBody = this.add.container(0, 0);
    this.trainArt.add(this.trainBody);
    this.trainBody.add(this.add.image(keys.paper.x, keys.paper.y, keys.paper.key).setOrigin(0));
    this.trainBody.add(this.add.image(keys.chassis.x, keys.chassis.y, keys.chassis.pencil).setOrigin(0));
    // Each borrowed colour is a gouache body and its pooled edges (trainArt.js).
    this.trainWash = {};
    LINE_TRAIN_ORDER.forEach((id) => {
      const k = keys.parts[id];
      const tint = trainTint(PART_OF[id].color);
      const wash = this.add.image(k.x, k.y, k.wash).setOrigin(0).setTint(tint).setAlpha(TRAIN_WASH_ALPHA.body);
      const edge = this.add.image(k.x, k.y, k.edge).setOrigin(0).setTint(tint).setAlpha(TRAIN_WASH_ALPHA.edge);
      this.trainBody.add([wash, edge, this.add.image(k.x, k.y, k.pencil).setOrigin(0)]);
      this.trainWash[id] = [wash, edge];
    });
    // The wheels ride the rails; the body rides its springs above them.
    const wheelTint = trainTint(PART_OF.green.color);
    this.trainWheels = LINE_TRAIN_SPEC.wheels.map((w) => {
      const wash = this.add.image(w.x, w.y, keys.wheel.wash).setTint(wheelTint).setAlpha(TRAIN_WASH_ALPHA.body);
      const edge = this.add.image(w.x, w.y, keys.wheel.edge).setTint(wheelTint).setAlpha(TRAIN_WASH_ALPHA.edge);
      const pencil = this.add.image(w.x, w.y, keys.wheel.pencil);
      this.trainArt.add([wash, edge, pencil]);
      return { wash, edge, pencil };
    });
    this.trainWash.green = this.trainWheels.flatMap((w) => [w.wash, w.edge]);
    this.returnedShown = new Set();
    // the footplate's rail, in front of the rider
    this.footRail = this.add.graphics().setDepth(DEPTH.FIGURE + 0.4);
  }

  drawFootRail(fx) {
    const g = this.footRail;
    g.clear();
    const dy = this.trainBody?.y ?? 0;
    const r = makeRandom(0xf007);
    g.lineStyle(2.4, PAPER.graphite, 0.92);
    draftLine(g, r, fx + FOOT_RAIL.x1, RIDER.feetY + dy, fx + FOOT_RAIL.x1, FOOT_RAIL.top + dy, { overshoot: 0, jitter: 0.5, segments: 3 });
    g.lineStyle(2, PAPER.graphite, 0.88);
    draftLine(g, r, fx + FOOT_RAIL.x0, FOOT_RAIL.y + dy, fx + FOOT_RAIL.x1, FOOT_RAIL.y + dy, { overshoot: 0, jitter: 0.4, segments: 3 });
    g.fillStyle(PAPER.graphite, 0.9);
    g.fillCircle(fx + FOOT_RAIL.x0, FOOT_RAIL.y + dy, 1.6);
    g.fillCircle(fx + FOOT_RAIL.x1, FOOT_RAIL.top + dy, 2);
    // a little lamp iron on the post, its glass warm
    g.fillStyle(0xf2c46a, 0.8).fillRect(fx + FOOT_RAIL.x1 - 3, FOOT_RAIL.top + dy - 7, 6, 5);
    g.lineStyle(1, PAPER.graphite, 0.8).strokeRect(fx + FOOT_RAIL.x1 - 3, FOOT_RAIL.top + dy - 7, 6, 5);
  }

  drawTrain() {
    const fx = this.frontX() + this.departOffset;
    this.trainArt.setPosition(Math.round(fx - TRAIN_L), 0);
    this.drawFootRail(Math.round(fx));
    // secondary motion: the body rocks a little on its springs at speed
    const speedK = Phaser.Math.Clamp(this.line.state.speed / RIDE.painted, 0, 1);
    const still = reducedMotionActive();
    this.trainBody.y = still ? 0 : Math.sin(this.line.state.distance / 11) * 0.8 * speedK;
    this.trainBody.rotation = still ? 0 : Math.sin(this.line.state.distance / 23 + 1.1) * 0.0025 * speedK;
    const returned = new Set(this.line.state.returned);
    // Each coat the weather took leaves the borrowed paint thinner (P2).
    const coat = coatAlpha(this.line.state.coatsLost);
    Object.entries(this.trainWash).forEach(([id, wash]) => {
      const images = Array.isArray(wash) ? wash : [wash];
      if (returned.has(id)) {
        // the colour leaves the train for whoever lent it
        if (!this.returnedShown.has(id)) {
          this.returnedShown.add(id);
          this.tweens.add({ targets: images, alpha: 0, duration: 650, ease: 'Sine.easeIn' });
        }
        return;
      }
      images.forEach((image, i) => image.setAlpha((i % 2 ? TRAIN_WASH_ALPHA.edge : TRAIN_WASH_ALPHA.body) * coat));
    });
    const wheelSpin = (this.line.state.distance + this.departOffset) / 12;
    this.trainWheels.forEach(({ wash, edge, pencil }) => { wash.setRotation(wheelSpin); edge.setRotation(wheelSpin); pencil.setRotation(wheelSpin); });
    // Runs where a coat washed off: pale drips down the carriage and engine.
    const g = this.dripArt;
    g.clear();
    const lost = this.line.state.coatsLost;
    if (lost > 0 && !this.line.state.complete) {
      const rects = this.partRects(fx);
      const drip = makeRandom(0x5eed);
      g.lineStyle(2, PAPER.sheetHigh, 0.75);
      for (let i = 0; i < lost * 7; i += 1) {
        const part = i % 2 ? rects.red : rects.blue;
        if (returned.has(i % 2 ? 'red' : 'blue')) continue;
        const x = part.x + 6 + drip() * (part.w - 12);
        const y = part.y + 2 + drip() * 8;
        g.lineBetween(x, y, x + (drip() - 0.5) * 2, y + 10 + drip() * (part.h - 14));
      }
    }
  }

  drawSteam(dt) {
    const g = this.steamArt;
    g.clear();
    const drift = this.line.state.speed * 0.8;
    this.steam = this.steam.filter((puff) => {
      puff.t += dt;
      puff.x -= (26 + drift) * dt;
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
    const chimney = this.partRects(this.frontX() + this.departOffset).yellow;
    this.steam.push({ x: chimney.x + 10, y: chimney.y - 4, t: 0 });
  }

  // The engine's beat: a chuff and a puff every few metres, quicker and
  // louder the faster it runs.
  stepExhaust(moved) {
    this.chuffDistance += moved;
    this.puffDistance += moved;
    if (this.chuffDistance >= 38) {
      this.chuffDistance = 0;
      chuff(Phaser.Math.Clamp(this.line.state.speed / RIDE.painted, 0, 1));
    }
    if (this.puffDistance >= 70) {
      this.puffDistance = 0;
      this.puff();
    }
  }

  drawResidents(dt) {
    const trainRear = this.frontX() - TRAIN_L;
    this.residents.forEach((p, i) => {
      if (!this.line.state.arrived || p.x < trainRear - 30 - i * 26 - 2) {
        stepFollower(p, trainRear - 30 - i * 26, dt);
      } else {
        stepFollower(p, p.x, dt);
      }
      const running = Math.abs(p.v) > 12;
      // the run cycle follows the ground covered, so the feet never skate
      const frame = running ? `f${1 + (Math.floor(p.stride / 11 + p.seed * 3) % 4)}` : 'f0';
      // a lean into the run (the frames carry their own bob); a breath and
      // a slow weight shift standing still
      const t = this.time.now / 1000;
      const bob = 0;
      const breathe = running ? 1 : 1 + 0.012 * Math.sin(t * 1.9 + p.seed * 4);
      const lean = running ? Phaser.Math.Clamp(p.v / 260, -1, 1) * 0.08 : Math.sin(t * 0.9 + p.seed * 2) * 0.012;
      const x = Math.round(p.x);
      [p.sprite, p.cloth].forEach((img) => img.setPosition(x, TRACK_Y + 1 + bob).setFrame(frame).setScale(1, breathe).setRotation(lean).setFlipX(p.facing < 0));
      if (p.restored && !p.tinted) {
        // their own colour, back in their clothes
        p.tinted = true;
        p.cloth.setTint(p.color);
        p.cloth.setAlpha(0.2);
        this.tweens.add({ targets: p.cloth, alpha: 0.95 * coatAlpha(this.line.state.coatsLost) + 0.05, duration: 600, ease: 'Sine.easeOut' });
      }
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
      drawGlintMarker(g, t, col * CELL + CELL / 2 + 10, reason === 'barrier' ? TRAIN.topRow * CELL - 8 : TRACK_Y - 8);
    });
  }

  // ================================================================ input

  inReach(x = this.brush.worldX, y = this.brush.worldY) {
    const hand = this.brushHand();
    return withinReach(hand.x, hand.y, x, y, this.reach);
  }

  overlapsPlayer(c, r) {
    if (this.riding) return false;
    return this.walker.x >= c * CELL && this.walker.x < c * CELL + CELL && this.walker.y >= r * CELL && this.walker.y < r * CELL + CELL;
  }

  // A cell of paint: the model's rule, the stroke book, and a body if it is
  // new paper (a rail inked over the ground needs none).
  paintCell(c, r, silent = false) {
    if (!this.line.paint(c, r)) return false;
    this.strokes.add(c, r);
    if (this.line.isPainted(c, r)) this.addCellBody(c, r);
    this.paintDirty = true;
    if (!silent) this.pressPainted = true;
    return true;
  }

  applyBrush(c, r, wash) {
    if (!this.line.inBounds(c, r)) return;
    if (wash) {
      const wasWet = this.line.isPainted(c, r) || this.line.isInked(c, r);
      if (this.line.wash(c, r)) {
        if (wasWet && !this.line.isPainted(c, r) && !this.line.isInked(c, r)) this.strokes.remove(c, r);
        // a barrier peels off a whole column at once (paintedLineModel.js)
        for (let row = TRAIN.topRow; row <= LINE.trackRow; row += 1) {
          if (!this.line.isPainted(c, row) && !this.line.isBlock(c, row)) this.removeCellBody(c, row);
        }
        this.paintDirty = true;
      }
      return;
    }
    if (this.overlapsPlayer(c, r)) return;
    this.paintCell(c, r);
  }

  stepBrush() {
    const b = this.brush;
    if (!b.paintDown && !b.washDown) {
      this.endStroke();
      return;
    }
    if (b.paintPressed || b.washPressed) {
      this.endStroke();
      if (b.paintDown) this.strokes.begin();
      if (!this.inReach()) this.refuseFar(b.worldX, b.worldY);
    }
    (b.mode === 'mouse' ? b.samples : []).forEach((p) => this.strokeTo(p.worldX, p.worldY, p.wash));
    this.strokeTo(b.worldX, b.worldY, b.washDown);
  }

  endStroke() {
    this.pressPainted = false;
    this.strokes.end();
    this.lastBrushCell = null;
    this.lastStrokePt = null;
  }

  refuseFar(x, y) {
    this.nib.refuseFar();
    noteAt(this, x, y - 14, this.riding ? 'OUT OF REACH · LET THE TRAIN BRING YOU CLOSER' : 'OUT OF REACH · GET CLOSER', { tone: 'warn', hold: 1300 });
  }

  // Round 6, item 12: a stroke that runs out of reach is painted to the edge
  // and stopped there visibly. (Riding, the train carries the reach along:
  // a brush held still over the line ahead keeps painting it.)
  strokeTo(wx, wy, wash) {
    const hand = this.brushHand();
    const prev = this.lastStrokePt;
    this.lastStrokePt = { x: wx, y: wy };
    if (!withinReach(hand.x, hand.y, wx, wy, this.reach)) {
      const exit = prev && this.lastBrushCell ? reachExit(prev, { x: wx, y: wy }, hand, this.reach - 0.5) : null;
      if (exit) {
        this.strokeCells(Math.floor((exit.x - exit.dirX * 2) / CELL), Math.floor((exit.y - exit.dirY * 2) / CELL), wash);
        this.nib.stop(exit.x, exit.y, exit.dirX, exit.dirY);
        noteAt(this, exit.x, exit.y - 18, this.riding ? 'THE BRUSH REACHES THIS FAR · THE TRAIN WILL BRING YOU' : 'THE BRUSH REACHES THIS FAR · GET CLOSER', { tone: 'warn', hold: 1300 });
      }
      this.lastBrushCell = null;
      return;
    }
    this.strokeCells(Math.floor(wx / CELL), Math.floor(wy / CELL), wash);
  }

  strokeCells(c, r, wash) {
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

  // What the brush is over, in the order the train is drawn from the top:
  // the wheels sit over the blue carriage, the cab and the engine, so their
  // whole circle is the green part (alpha A3-3: only the bottom 12 px were).
  partAt(x, y) {
    const rects = this.partRects(this.frontX());
    const inRect = (id) => {
      const r = rects[id];
      return x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4;
    };
    if (inRect('yellow')) return 'yellow';
    if (this.wheelCentres(this.frontX()).some((c) => Math.hypot(x - c.x, y - c.y) <= 15)) return 'green';
    return ['orange', 'red', 'violet', 'blue', 'green'].find(inRect) ?? null;
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
    const r = this.partRects(this.frontX())[this.hold.key];
    const person = this.residents.find((p) => p.id === this.hold.key);
    const from = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const to = { x: person.x, y: TRACK_Y - 40 };
    const k = Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1);
    const end = { x: Phaser.Math.Linear(from.x, to.x, k), y: Phaser.Math.Linear(from.y, to.y, k) - Math.sin(k * Math.PI) * 40 };
    g.lineStyle(3, PART_OF[this.hold.key].color, 0.8);
    [-2, 2].forEach((o) => draftLine(g, makeRandom(0x77 + o), from.x, from.y + o, end.x, end.y + o, { overshoot: 0, jitter: 1.4, segments: 10 }));
  }

  // ================================================================ flow

  handleLineEvents() {
    const b = this.brush;
    this.line.drainEvents().forEach((event) => {
      if (event.type === 'train-rolling') {
        // Chapter 2's bell, as a departure bell: rolling again, not a timer
        ringBell({ departure: Boolean(event.first) });
        if (!event.first) whistle();
        for (let i = 0; i < 3; i += 1) this.puff();
      } else if (event.type === 'train-waiting') {
        const x = event.at * CELL;
        // what stopped it; the tag over the break carries the verb
        const what = event.reason === 'barrier' ? 'PAPER ON THE LINE' : event.reason === 'faded' ? 'THE RAILS ARE RUBBED OUT' : 'A GAP IN THE LINE';
        noteAt(this, x + 40, TRAIN.topRow * CELL - 84, `THE TRAIN WAITS · ${what}`, { tone: 'warn', hold: 2400 });
        whistle({ long: true });
        this.whistleClock = 0;
      } else if (event.type === 'train-arrived') {
        this.onArrived();
      } else if (event.type === 'colour-returned') {
        const person = this.residents.find((p) => p.id === event.id);
        person.restored = true;
        noteAt(this, person.x, TRACK_Y - 80, `${person.name} · RETURNED`, { tone: 'good', hold: 1100 });
        // ...and that colour comes back into Rosa's country.
        this.country.bloom(event.id, { duration: 1800, delay: 250 });
      } else if (event.type === 'colours-returned') {
        this.departPencilTrain();
      } else if (event.type === 'coat-lost') {
        noteAt(this, this.frontX() - 140, TRAIN.topRow * CELL - 60, platformLines(event.coatsLost).coatLost, { tone: 'warn', hold: 2200 });
        for (let i = 0; i < 4; i += 1) this.puff();
      } else if (event.type === 'wash-refused') {
        noteAt(this, event.c * CELL, event.r * CELL, 'THE TRAIN IS ON IT', { tone: 'warn', hold: 900 });
      } else if (event.type === 'inked' && !this.tutorialSeen.ink && this.tutorialSeen.gap) {
        this.inkedCount = (this.inkedCount ?? 0) + 1;
        if (this.inkedCount >= 6) this.tutorialSeen.ink = true;
      }
    });
  }

  // He steps down off the footplate onto the platform, and has his legs again.
  onArrived({ instant = false } = {}) {
    if (!this.riding) return;
    whistle();
    this.tag.hide();
    const fromX = this.rider.x;
    const fromY = this.rider.y;
    const toX = this.frontX() + 34;
    const toY = TRACK_Y - PLATFORM.h - 30;
    const land = () => {
      this.riding = false;
      this.walker.body.enable = true;
      placeBody(this.walker.body, toX, toY);
      this.walker.setPosition(toX, toY);
      this.cameras.main.startFollow(this.walker, true, 0.1, 0.12);
      this.cameras.main.setDeadzone(200, 160);
      this.cameras.main.setFollowOffset(-120, 0);
      // Well above the return tag, which sits just over the roof (A3-5).
      noteAt(this, this.frontX() - 140, TRAIN.topRow * CELL - 96, platformLines(this.line.state.coatsLost).arrival, { hold: 2600 });
    };
    if (instant) {
      land();
      return;
    }
    // a little arc down, eased: anticipation in the knees is the figure's
    const hop = { k: 0 };
    this.hopping = true;
    this.tweens.add({
      targets: hop,
      k: 1,
      duration: 520,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.rider.x = Phaser.Math.Linear(fromX, toX, hop.k);
        this.rider.y = Phaser.Math.Linear(fromY, toY, hop.k) - Math.sin(hop.k * Math.PI) * 46;
        this.walker.setPosition(this.rider.x, this.rider.y);
        this.hopVelocity = { x: (toX - fromX) / 0.52, y: hop.k < 0.5 ? -200 : 300 };
      },
      onComplete: () => {
        this.hopping = false;
        this.hopVelocity = null;
        land();
      },
    });
  }

  // Every colour is home; what is left is pencil, and it still runs.
  departPencilTrain() {
    if (this.departing) return;
    this.departing = true;
    this.tag.hide();
    this.time.delayedCall(900, () => {
      ringBell({ departure: true });
      whistle({ long: true });
      noteAt(this, this.frontX() - 140, TRAIN.topRow * CELL - 40, platformLines(this.line.state.coatsLost).departure, { tone: 'mara', hold: 2600 });
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
          this.cameras.main.centerOn(this.frontX() + this.departOffset - 200, VIEW.h / 2);
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
  }

  // Off the train only: a fall is always caught (the physics keeps running
  // under a card).
  stepFall(dt) {
    if (this.riding || this.hopping) return;
    const body = this.walker.body;
    const put = this.fallGuard.step({ x: this.walker.x, y: this.walker.y, grounded: body.blocked.down, dt });
    if (!put) return;
    placeBody(body, put.x, put.y - 10);
  }

  // The lesson's dotted stroke over the first gap, until it is painted.
  updateGhost(dt) {
    const cells = [];
    if (!this.tutorialSeen.gap && !this.line.state.arrived) {
      for (let c = FIRST_GAP.from; c < FIRST_GAP.to; c += 1) cells.push({ c, r: LINE.trackRow });
      if (cells.every(({ c, r }) => this.line.isPainted(c, r))) {
        this.tutorialSeen.gap = true;
        this.taughtInkAt = this.time.now;
        cells.length = 0;
      }
    }
    if (cells.length) this.ghost.show(cells);
    else this.ghost.hide();
    this.ghost.markPainted((c, r) => this.line.isPainted(c, r));
    this.ghost.update(dt);
  }

  updateTag() {
    const b = this.brush;
    if (this.departing || this.hopping) return this.tag.hide();
    if (this.line.state.arrived) {
      if (this.hover) {
        const r = this.partRects(this.frontX())[this.hover];
        const person = PART_OF[this.hover];
        return this.tag.show(`${b.label('washHold')} · GIVE ${person.name} BACK TO THE ${person.source}`, r.x + r.w / 2, r.y - 4, {
          progress: this.hold.key ? this.hold.progress / HOLD_SECONDS : 0,
        });
      }
      if (!this.tutorialSeen.return) {
        return this.tag.show(`${b.label('washHold')} ON EACH COLOUR · WASH IT BACK TO WHOEVER LENT IT`, this.frontX() - 140, TRAIN.topRow * CELL - 10);
      }
      return this.tag.hide();
    }
    // the lesson, then each new kind of break the first time it comes close
    if (!this.tutorialSeen.gap) {
      return this.tag.show(`${b.label('paint')} · PAINT THE TRACK ACROSS THE GAP`, (FIRST_GAP.from + FIRST_GAP.to) / 2 * CELL, TRAIN.topRow * CELL - 30);
    }
    if (!this.tutorialSeen.ink && this.taughtInkAt !== null && this.time.now - this.taughtInkAt < 5200) {
      return this.tag.show(`PAINT THE RAILS AHEAD · THE TRAIN RUNS FASTER ON WET PAINT`, this.frontX() + 150, TRAIN.topRow * CELL - 30);
    }
    const ahead = this.line.nextBreak();
    if (ahead && ahead.distance < 300) {
      if (ahead.reason === 'barrier' && !this.tutorialSeen.barrier) {
        return this.tag.show(`${b.label('wash')} · WASH THE PAPER OFF THE LINE`, ahead.col * CELL + 20, TRAIN.topRow * CELL - 30);
      }
      if (ahead.reason === 'faded' && !this.tutorialSeen.faded) {
        return this.tag.show(`${b.label('paint')} · PAINT THE RUBBED-OUT RAILS BACK`, ahead.col * CELL + 60, TRAIN.topRow * CELL - 30);
      }
    }
    const waiting = this.line.state.waiting;
    if (waiting) {
      const verb = waiting.reason === 'barrier' ? `${b.label('wash')} · WASH THE PAPER` : `${b.label('paint')} · PAINT THE TRACK`;
      // Above the train's roof, so the tag never sits on the engine.
      return this.tag.show(verb, waiting.at * CELL + 40, TRAIN.topRow * CELL - 30);
    }
    return this.tag.hide();
  }

  // Each kind of break is taught until the first one is cleared.
  noteCleared() {
    const front = this.line.front();
    BARRIERS.forEach(({ col }) => { if (front > col) this.tutorialSeen.barrier = true; });
    FADED_SPANS.forEach(({ to }) => { if (front > to) this.tutorialSeen.faded = true; });
  }

  drawCursorNib(dt) {
    const b = this.brush;
    if (this.departing || this.hopping || this.line.state.arrived) {
      // at the platform the brush only washes colours back: a wet nib over a part
      this.nib.hide();
      this.nib.setCursor(this.line.state.arrived && !this.departing && this.hover ? 'wash' : 'none');
      return;
    }
    const c = Math.floor(b.worldX / CELL);
    const r = Math.floor(b.worldY / CELL);
    const inBounds = this.line.inBounds(c, r);
    const state = nibState({
      inReach: this.inReach(),
      canPaint: inBounds && this.line.canPaint(c, r),
      canWash: inBounds && this.line.canWash(c, r),
    });
    this.nibStateNow = state;
    const firstStrokes = !this.tutorialSeen.gap;
    const click = (verb) => (b.device === 'mouse' ? `${verb === 'paint' ? 'LEFT' : 'RIGHT'} CLICK` : b.label(verb));
    const keyHint = state === 'paint' && firstStrokes ? `${click('paint')} · PAINT`
      : state === 'wash' && !this.tutorialSeen.barrier ? `${click('wash')} · WASH` : null;
    this.nib.draw({
      anchor: this.brushHand(),
      x: b.worldX,
      y: b.worldY,
      state,
      cell: inBounds ? { cx: c, cy: r } : null,
      pressing: b.paintDown || b.washDown,
      virtual: b.mode === 'virtual',
      keyHint,
      avoid: this.tag.visible ? this.tag.rect : null,
      dt,
    });
  }

  update(time, delta) {
    // Wall-clock time down to 10 fps (alpha round 4: weak laptops run at
    // 15-25 fps, and a 50 ms cap slowed every walk, hold and bell there).
    const dt = Math.min(delta, FRAME_DT_CAP_MS) / 1000;
    this.brush.update(dt);
    this.restart.update(dt, this.brush.pad);
    const move = this.brush.readMove(this.keys);
    if (!this.restart.blocking) {
      if (!this.line.state.arrived) {
        const before = this.line.state.distance;
        this.line.step(dt);
        this.stepExhaust(this.line.state.distance - before);
        if (this.line.state.waiting) {
          this.whistleClock += dt;
          if (this.whistleClock > 2.4) {
            this.whistleClock = 0;
            whistle();
            this.puff();
          }
        }
        this.stepBrush();
        this.handleLineEvents();
        this.noteCleared();
      } else if (!this.departing && !this.riding) {
        this.stepReturn(dt);
      }
    }
    if (this.riding && !this.hopping) this.stepRider(this.restart.blocking ? {} : move, dt);
    else if (!this.riding) this.stepPlayer(move);
    this.stepFall(dt);

    // the camera leads the train while he rides
    if (this.riding) this.camTarget.setPosition(this.frontX() + 170, VIEW.h / 2);

    if (this.paintDirty) {
      this.redrawCells();
      this.paintDirty = false;
    }
    this.strokeLayer.sync(!this.brush.paintDown);
    this.drawTrain();
    this.drawSteam(dt);
    this.drawResidents(dt);
    this.drawStream();
    this.drawMarkers();
    this.drawGauge(dt);
    this.updateGhost(dt);
    this.drawCursorNib(dt);
    if (this.riding || this.hopping) {
      drawPaintedPlayer(this.figure, this.walker, this.brush, PAPER.indigo, {
        grounded: !this.hopping && this.rider.hop <= 0.01,
        velocity: this.hopVelocity ?? { x: 0, y: -this.rider.hopV },
        lean: this.rider.lean * 0.45,
      });
    } else {
      drawPaintedPlayer(this.figure, this.walker, this.brush);
    }
    this.figure.setAlpha(this.walker.alpha);
    this.brush.drawCursor({ hidden: true });
    this.updateTag();
  }

  textState() {
    const b = this.brush;
    return {
      scene: 'PaintedLine',
      camera: { x: Math.round(this.cameras.main.worldView.x), y: Math.round(this.cameras.main.worldView.y) },
      seconds: Math.round((this.time.now - this.startedAt) / 100) / 10,
      trainX: Math.round(this.frontX()),
      riding: this.riding,
      departing: this.departing,
      finished: this.finished,
      player: { x: Math.round(this.walker.x), y: Math.round(this.walker.y), onGround: Boolean(this.walker.body?.blocked.down) },
      fall: this.fallGuard.snapshot(),
      pointer: { mode: b.mode, x: Math.round(b.worldX), y: Math.round(b.worldY), inReach: this.inReach() },
      nib: this.nibStateNow ?? null,
      reachNamed: this.nib.ringTaught,
      ghostVisible: this.ghost.visible,
      hover: this.hover,
      tag: this.tag.visible ? this.tag.text : null,
      barriers: BARRIERS.length,
      strokes: this.strokes.runs().length,
      // A point on each part that no other part covers (wheels: a wheel hub,
      // which sits over the carriage).
      parts: Object.fromEntries(Object.entries(this.partRects(this.frontX())).map(([id, r]) => [id, id === 'green'
        ? { x: Math.round(this.wheelCentres(this.frontX())[1].x), y: TRACK_Y - 18 }
        : { x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) }])),
      ...this.line.snapshot(),
    };
  }
}
