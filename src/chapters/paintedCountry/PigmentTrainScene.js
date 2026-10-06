import Phaser from 'phaser';
import { FRAME_DT_CAP_MS } from './chapterConstants.js';
import {
  CHAPTER4_IGNITION_SIGN,
  EXPANSION_PHASE,
  PIGMENTS,
  TRAIN_BUILD_EXAMPLE_ORDER,
  TRAIN_BUILD_RULES,
  createChapter4Expansion,
} from './chapter4ExpansionModel.js';
import { createPaintedPlayer, drawPaintedPlayer, preloadPaintedPlayer } from './paintedPlayerFigure.js';
import { addLayers, ensurePair } from './art/artTextures.js';
import { TRAIN_WASH_ALPHA, paintTrain, trainTint } from './art/trainArt.js';
import { YARD_SOURCE, paintYardBackdrop, paintYardSource } from './art/yardArt.js';
import { drawPigmentHalo, haloPointToward } from './pigmentHalo.js';
import { PAPER } from './paperPalette.js';
import { buildPaperGrain, draftLine, draftRect, makeRandom } from './paperSurface.js';
import { BrushInput } from './brushInput.js';
import { HOLD_SECONDS, MONO, PaperTag, RestartHold, UI, drawGlintMarker, hideUnderLowGraphics, noteAt, showTitleCard } from './chapterUi.js';
import { drawGreyCell } from './platePencil.js';
import { collectMagicStone, magicStoneSnapshot, magicStoneCountLabel } from '../../shell/magicStones.js';
import { devParam } from '../../devMode.js';
import { RESUME_REGISTRY_KEY, applyYardResume, recordChapter4Resume, yardResumeData } from './chapter4Resume.js';
import { createSaveStore } from '../../shell/saveSystem.js';

// Chapter 4 // THE PAINTED COUNTRY — Part III, the train yard.
//
// The residents lend their colours: RIGHT-HOLD each place along the yard to
// borrow it. LEFT-HOLD a part of the unfinished train to paint it with the
// colour borrowed for it, wheels first. When it is whole, hold on the cab to
// board: no second quiz. The painted train then runs the line ahead
// (PaintedLineScene), where the colours go back to the people who lent them.
//
// Above the HOME door hangs a plate under the archive's grey. Washing it is
// optional; the Pigment Stone is under it.
//
// The colour ring around Butch's head only SHOWS what he has borrowed. It
// never takes a click, so a click on the carriage always reaches the part
// under the brush (the old ring swallowed carriage clicks).

const VIEW = { w: 960, h: 600 };
const WORLD = { w: 3200, h: 600 };
const FLOOR_Y = 474;
const MOVE_SPEED = 220;
const JUMP_VELOCITY = -620;
const TRAIN_ENTRY_X = 116;
const TRAIN_SCALE = 0.82;
const TRAIN_ORIGIN = Object.freeze({ x: 2260, y: 468 });
const TRAIN_MIRROR_X = 2600;
const SOURCE_REACH = 190;
const PART_REACH = 420;

const SOURCE_X = [270, 590, 910, 1230, 1550, 1870];
// The top of the tallest thing in a place (the station's lantern, the
// orchard's flag) and where a place's tag sits: above it, under its name.
const SOURCE_TOP = 180;
const SOURCE_TAG_Y = 178;
const SOURCE_TITLES = ['BAKERY', 'STATION', 'ORCHARD', 'MILL', 'SQUARE', 'HOME'];

// The plate above the HOME door: grey over, the stone under.
const HOME_PLATE = Object.freeze({ x: SOURCE_X[5] + 30, y: 196, w: 56, h: 56 });
export const PIGMENT_STONE = Object.freeze({ x: HOME_PLATE.x + HOME_PLATE.w / 2, y: HOME_PLATE.y + HOME_PLATE.h / 2 });

const TRAIN_PARTS = Object.freeze([
  { id: 'red', type: 'rect', x: 2288, y: 372, w: 212, h: 84 },
  { id: 'orange', type: 'rect', x: 2496, y: 340, w: 102, h: 116 },
  { id: 'yellow', type: 'rect', x: 2350, y: 316, w: 92, h: 58 },
  { id: 'green', type: 'wheels', circles: [{ x: 2358, y: 462, r: 33 }, { x: 2535, y: 462, r: 33 }, { x: 2698, y: 462, r: 33 }, { x: 2854, y: 462, r: 33 }] },
  { id: 'blue', type: 'rect', x: 2594, y: 372, w: 306, h: 84 },
  { id: 'violet', type: 'roof', x: 2482, y: 326, w: 430, h: 40 },
]);

// The drawing of the train (art/trainArt.js) uses the parts' own hit rects,
// in the train's local (unmirrored) frame; the smokebox is at local left.
const partRect = (id) => {
  const { x, y, w, h } = TRAIN_PARTS.find((part) => part.id === id);
  return { x, y, w, h };
};
const YARD_TRAIN_SPEC = Object.freeze({
  S: 1,
  nose: -1,
  boiler: partRect('red'),
  stack: partRect('yellow'),
  cab: partRect('orange'),
  carriage: partRect('blue'),
  roof: partRect('violet'),
  wheels: TRAIN_PARTS.find((part) => part.id === 'green').circles,
  frame: { x0: 2255, x1: 2941, y: 447, h: 19 },
});
// Draw order, back to front; the wheels go over the bodies.
const TRAIN_DRAW_ORDER = ['red', 'yellow', 'orange', 'blue', 'violet'];

let yardTrainKeys = null;

function cssColor(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function pointInPart(part, x, y) {
  if (part.type === 'wheels') {
    return part.circles.some((circle) => Phaser.Math.Distance.Between(circle.x, circle.y, x, y) <= circle.r + 8);
  }
  return x >= part.x && x <= part.x + part.w && y >= part.y && y <= part.y + part.h;
}

export class PigmentTrainScene extends Phaser.Scene {
  constructor() {
    super('PigmentTrain');
  }

  preload() {
    preloadPaintedPlayer(this);
    if (!this.cache.audio.exists('chapter4-consequence-music')) {
      this.load.audio('chapter4-consequence-music', '/assets/music/ch4/4.2_debussy_snow_is_dancing.mp3');
    }
  }

  create(data = {}) {
    this.qa = devParam('qa');
    const qaUnlocked = ['fused-train', 'train-ready'].includes(this.qa) ? PIGMENTS.map(({ id }) => id) : [];
    // Normal play always borrows the six colours from left to right. Only
    // explicit QA routes may prefill them.
    const unlockedPigments = qaUnlocked;
    this.registry.set('chapter4Pigments', []);
    this.fusedEntry = unlockedPigments.length === PIGMENTS.length;
    this.chapter = createChapter4Expansion({ unlockedPigments });
    const resume = this.registry.get(RESUME_REGISTRY_KEY);
    this.resumed = resume?.room === 'yard' && applyYardResume(this.chapter, resume) ? resume : null;
    if (resume?.room === 'yard') this.registry.remove(RESUME_REGISTRY_KEY);
    this.rnd = makeRandom(0xc4104);
    this.hold = { key: null, progress: 0 };
    this.hover = null;
    this.failedPartId = null;
    this.failedPartUntil = 0;
    this.trainShakeUntil = 0;
    this.trainOffset = 0;
    this.transitioning = false;
    this.locked = false;
    this.stoneCollected = magicStoneSnapshot().collected.includes('chapter-4');
    if (this.qa === 'home-plate') this.stoneCollected = false;
    this.tutorialSeen = { collect: this.fusedEntry, part: false, board: false };

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, -200, WORLD.w, WORLD.h + 400);

    this.buildWorld();
    this.buildSources();
    this.buildHomePlate();
    this.buildTrain();
    this.buildPlayer();
    this.buildGrain();
    this.bindInput();
    this.startMusic();
    this.applyQaState();
    if (this.resumed) {
      const x = Phaser.Math.Clamp(this.resumed.x ?? TRAIN_ENTRY_X, 60, WORLD.w - 80);
      this.walker.setPosition(x, 410);
      this.cameras.main.centerOn(x, 300);
      const snap = this.chapter.snapshot();
      this.tutorialSeen = { collect: snap.collectedCount > 0, part: snap.builtCount > 0, board: false };
      // left between the plate coming clear and the stone being taken
      if (snap.homePlate.revealed && !this.stoneCollected) this.time.delayedCall(800, () => this.collectStone());
    }
    this.refreshPresentation();
    this.recordResume();

    if (!data.skipIntro && !this.qa) {
      // Butch can walk under the banner (alpha round 4: dead starts).
      this.bannerUp = true;
      showTitleCard(this, {
        kicker: 'CHAPTER 4 · THE PAINTED COUNTRY',
        main: 'III · THE PAINTED TRAIN',
        hold: 1400,
        onDone: () => { this.bannerUp = false; },
      });
    }
  }

  // chapter4Resume.js; never on a dev route.
  recordResume() {
    if (this.qa || this.transitioning) return;
    if (!this.saveStore) {
      try { this.saveStore = createSaveStore(); } catch { this.saveStore = null; }
    }
    recordChapter4Resume(this.saveStore, yardResumeData(this.chapter, this.walker?.x));
  }

  buildWorld() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(PAPER.sheet, 1).fillRect(0, 0, WORLD.w, WORLD.h);
    g.fillStyle(PAPER.sheetLow, 1).fillRect(0, 0, WORLD.w, 52);
    g.fillStyle(PAPER.sheetHigh, 0.94).fillRect(0, 94, WORLD.w, 270);
    g.fillStyle(PAPER.sheetLow, 0.9).fillRect(0, FLOOR_Y, WORLD.w, WORLD.h - FLOOR_Y);

    // The street behind the six places, still in pencil: it drifts behind
    // the yard at half speed. Its washes stay down until the line ahead
    // gives the colours back.
    this.backdrop = addLayers(this, 'ch4-yard-street', () => paintYardBackdrop(2100, 220), {
      x: 0, y: FLOOR_Y - 220, depth: 1, scrollFactor: 0.45, washAlpha: 0.12, pencilAlpha: 0.42,
    });
    g.lineStyle(2, PAPER.graphite, 0.78);
    draftLine(g, this.rnd, 0, FLOOR_Y, WORLD.w, FLOOR_Y, { overshoot: 0, jitter: 0.8, segments: 60 });
    // the yard's ground: cinders and sleepers, hatched
    const ground = this.add.graphics().setDepth(2);
    const gr = makeRandom(0x9e7);
    ground.lineStyle(1, PAPER.graphiteSoft, 0.32);
    for (let x = 4; x < WORLD.w; x += 9 + gr() * 8) ground.lineBetween(x, FLOOR_Y + 6 + gr() * 4, x - 6, FLOOR_Y + 14 + gr() * 6);
    ground.lineStyle(1.4, PAPER.graphite, 0.5);
    for (let x = 2120; x < WORLD.w; x += 24) ground.lineBetween(x, FLOOR_Y + 3, x - 6, FLOOR_Y + 12);

    for (let i = 0; i < PIGMENTS.length && !this.fusedEntry; i += 1) {
      const x = SOURCE_X[i];
      this.add.text(x, 100, SOURCE_TITLES[i], {
        fontFamily: MONO,
        fontSize: '12px',
        color: '#6f675c',
        letterSpacing: 2,
      }).setOrigin(0.5).setDepth(4);
    }

    // The yard's name lives in the title strip.
    this.yardTitle = this.add.text(24, 26, 'THE YARD  ·  THE UNFINISHED TRAIN', {
      fontFamily: MONO,
      fontSize: '13px',
      color: '#5c574f',
      letterSpacing: 2.5,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(70);

    const floor = this.add.rectangle(WORLD.w / 2, FLOOR_Y + 52, WORLD.w, 104, 0xffffff, 0);
    this.physics.add.existing(floor, true);
    this.floor = floor;
  }

  buildSources() {
    this.sources = PIGMENTS.map((pigment, index) => {
      const source = {
        ...pigment,
        index,
        x: SOURCE_X[index],
        y: 358,
        // The whole drawn place, lantern head and flag tip included (alpha
        // round 4: only their lower halves answered the brush).
        rect: new Phaser.Geom.Rectangle(SOURCE_X[index] - 84, SOURCE_TOP, 168, FLOOR_Y - SOURCE_TOP),
      };
      // The place in pencil, and the one thing in it that holds its colour.
      const keys = ensurePair(this, `ch4-yard-source-${index}`, () => {
        const art = paintYardSource(index, cssColor(pigment.color));
        return { pencil: art.pencil, wash: art.live };
      });
      const top = FLOOR_Y - 4 - YARD_SOURCE.ground;
      source.live = this.add.image(source.x, top, keys.wash).setOrigin(0.5, 0).setDepth(11.9);
      source.art = this.add.image(source.x, top, keys.pencil).setOrigin(0.5, 0).setDepth(12);
      source.liveAlpha = 1;
      source.label = this.add.text(source.x, 492, pigment.source, {
        fontFamily: MONO,
        fontSize: '11px',
        color: cssColor(pigment.color),
        align: 'center',
        letterSpacing: 1.2,
        wordWrap: { width: 150 },
      }).setOrigin(0.5, 0).setDepth(13);
      return source;
    });
  }

  buildHomePlate() {
    this.homePlateArt = this.add.graphics().setDepth(14);
    this.stoneArt = this.add.graphics().setDepth(15);
  }

  drawHomePlate(time) {
    const g = this.homePlateArt;
    const s = this.stoneArt;
    g.clear();
    s.clear();
    if (this.fusedEntry) return;
    const { x, y, w, h } = HOME_PLATE;
    const plate = this.chapter.state.homePlate;
    g.lineStyle(1.1, PAPER.graphiteSoft, 0.8);
    g.lineBetween(x + w / 2, y, x + w / 2 - 10, y - 18);
    g.lineBetween(x + w / 2, y, x + w / 2 + 10, y - 18);
    g.fillStyle(PAPER.sheetHigh, 1).fillRect(x - 4, y - 4, w + 8, h + 8);
    g.lineStyle(2, PAPER.graphite, 0.9);
    draftRect(g, makeRandom(0x40e), x - 4, y - 4, w + 8, h + 8, { overshoot: 3, jitter: 0.5 });
    if (!plate.revealed) {
      drawGreyCell(g, x, y, w / 2, 0x5ee);
      drawGreyCell(g, x + w / 2, y, w / 2, 0x5ef);
      drawGreyCell(g, x, y + h / 2, w / 2, 0x5f0);
      drawGreyCell(g, x + w / 2, y + h / 2, w / 2, 0x5f1);
      if (plate.washes > 0) g.fillStyle(PAPER.sheetHigh, 0.45).fillRect(x + 6, y + 6, w - 12, h - 12);
      return;
    }
    // Under the grey: Rosa's pencil of the stone, and the stone itself.
    if (this.stoneCollected) {
      g.lineStyle(1.2, PAPER.graphiteSoft, 0.7).strokeCircle(x + w / 2, y + h / 2, 12);
      return;
    }
    const cx = PIGMENT_STONE.x;
    const cy = PIGMENT_STONE.y;
    s.fillStyle(UI.amber, 0.14 + Math.sin(time / 420) * 0.05).fillCircle(cx, cy, 22);
    s.fillStyle(0xc9a0dc, 1);
    s.lineStyle(1.6, PAPER.graphite, 0.85);
    s.beginPath();
    s.moveTo(cx, cy - 16);
    s.lineTo(cx + 10, cy - 6);
    s.lineTo(cx + 6, cy + 10);
    s.lineTo(cx, cy + 15);
    s.lineTo(cx - 6, cy + 10);
    s.lineTo(cx - 10, cy - 6);
    s.closePath();
    s.fillPath();
    s.strokePath();
    s.fillStyle(0xffffff, 0.7).fillCircle(cx - 3, cy - 6, 2.4);
  }

  // The painted train is one pencil drawing in six parts (art/trainArt.js):
  // an unpainted part is a faint construction drawing; painting it firms the
  // pencil and blooms its colour in.
  buildTrain() {
    const keys = this.ensureTrainTextures();
    this.trainArt = this.add.container(0, 0).setDepth(10);
    this.trainParts = {};
    // the sheet the train is drawn on, then the chassis, then each part's
    // gouache body, its pooled edges and its pencil
    this.trainArt.add(this.add.image(keys.paper.x, keys.paper.y, keys.paper.key).setOrigin(0));
    const chassis = this.add.image(keys.chassis.x, keys.chassis.y, keys.chassis.pencil).setOrigin(0);
    this.trainArt.add(chassis);
    TRAIN_DRAW_ORDER.forEach((id) => {
      const k = keys.parts[id];
      const tint = trainTint(this.chapter.pigment(id).color);
      const wash = this.add.image(k.x, k.y, k.wash).setOrigin(0).setTint(tint).setAlpha(0);
      const edge = this.add.image(k.x, k.y, k.edge).setOrigin(0).setTint(tint).setAlpha(0);
      const pencil = this.add.image(k.x, k.y, k.pencil).setOrigin(0).setAlpha(0.5);
      this.trainArt.add([wash, edge, pencil]);
      this.trainParts[id] = { wash, edge, pencil, shown: false };
    });
    const wheelTint = trainTint(this.chapter.pigment('green').color);
    this.wheelArt = YARD_TRAIN_SPEC.wheels.map((w) => {
      const wash = this.add.image(w.x, w.y, keys.wheel.wash).setTint(wheelTint).setAlpha(0);
      const edge = this.add.image(w.x, w.y, keys.wheel.edge).setTint(wheelTint).setAlpha(0);
      const pencil = this.add.image(w.x, w.y, keys.wheel.pencil).setAlpha(0.5);
      this.trainArt.add([wash, edge, pencil]);
      return { wash, edge, pencil };
    });
    this.trainParts.green = { wash: null, pencil: null, shown: false };
    this.positionTrainArt();
    this.referenceArt = this.add.graphics().setDepth(9);
    this.referenceTrain = this.add.container(0, 0).setDepth(9.5);
    this.buildReferenceTrain(keys);
    this.referenceLabel = this.add.text(2328, 146, 'THE PAINTED TRAIN, AS DRAWN', {
      fontFamily: MONO,
      fontSize: '11px',
      color: '#5c574f',
      letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(14);
    // The order the yard really builds in (TRAIN_BUILD_RULES): the roof sits
    // on the cab and the carriage (alpha round 4: the card said WHEELS →
    // BODY → ROOF and the roof then refused with CAB FIRST).
    this.referenceRule = this.add.text(2328, 262, 'WHEELS  →  ENGINE · CARRIAGE  →  CAB  →  ROOF', {
      fontFamily: MONO,
      fontSize: '11px',
      color: '#6f675c',
      letterSpacing: 1.1,
    }).setOrigin(0.5).setDepth(14);
    this.ringArt = this.add.graphics().setDepth(90);
    this.focusArt = this.add.graphics().setDepth(91);
    this.markerArt = this.add.graphics().setDepth(89);
  }

  ensureTrainTextures() {
    if (yardTrainKeys && this.textures.exists(yardTrainKeys.chassis.pencil)) return yardTrainKeys;
    const art = paintTrain(YARD_TRAIN_SPEC);
    const register = (name, part) => {
      this.textures.addCanvas(`${name}:pencil`, part.pencil);
      if (part.wash) this.textures.addCanvas(`${name}:wash`, part.wash);
      if (part.edge) this.textures.addCanvas(`${name}:edge`, part.edge);
      return { pencil: `${name}:pencil`, wash: `${name}:wash`, edge: `${name}:edge`, x: part.x, y: part.y };
    };
    this.textures.addCanvas('ch4-yard-train-paper', art.paper.canvas);
    yardTrainKeys = {
      paper: { key: 'ch4-yard-train-paper', x: art.paper.x, y: art.paper.y },
      chassis: register('ch4-yard-train-chassis', { pencil: art.chassis.pencil, x: art.chassis.x, y: art.chassis.y }),
      parts: Object.fromEntries(TRAIN_DRAW_ORDER.map((id) => [id, register(`ch4-yard-train-${id}`, art.parts[id])])),
      wheel: register('ch4-yard-train-wheel', art.wheel),
    };
    return yardTrainKeys;
  }

  // "The painted train, as drawn": the same drawing, small and finished, on
  // a pinned card, so the player sees what they are making.
  buildReferenceTrain(keys) {
    const g = this.referenceArt;
    g.fillStyle(0x6b5640, 0.12).fillRect(2134, 163, 398, 92);
    g.fillStyle(PAPER.sheetHigh, 1).fillRect(2130, 158, 398, 92);
    g.lineStyle(1.2, PAPER.graphiteSoft, 0.8);
    draftRect(g, makeRandom(0x4ef), 2130, 158, 398, 92, { overshoot: 3, jitter: 0.5 });
    g.fillStyle(UI.brass, 1).fillCircle(2140, 166, 2.6).fillCircle(2518, 166, 2.6);
    const box = this.referenceTrain;
    const k = 0.42;
    box.setScale(-k, k).setPosition(2508 + k * 2222, 172 - k * 316);
    box.add(this.add.image(keys.paper.x, keys.paper.y, keys.paper.key).setOrigin(0));
    box.add(this.add.image(keys.chassis.x, keys.chassis.y, keys.chassis.pencil).setOrigin(0));
    TRAIN_DRAW_ORDER.forEach((id) => {
      const p = keys.parts[id];
      const tint = trainTint(this.chapter.pigment(id).color);
      box.add(this.add.image(p.x, p.y, p.wash).setOrigin(0).setTint(tint).setAlpha(TRAIN_WASH_ALPHA.body));
      box.add(this.add.image(p.x, p.y, p.edge).setOrigin(0).setTint(tint).setAlpha(TRAIN_WASH_ALPHA.edge));
      box.add(this.add.image(p.x, p.y, p.pencil).setOrigin(0));
    });
    const wheelTint = trainTint(this.chapter.pigment('green').color);
    YARD_TRAIN_SPEC.wheels.forEach((w) => {
      box.add(this.add.image(w.x, w.y, keys.wheel.wash).setTint(wheelTint).setAlpha(TRAIN_WASH_ALPHA.body));
      box.add(this.add.image(w.x, w.y, keys.wheel.edge).setTint(wheelTint).setAlpha(TRAIN_WASH_ALPHA.edge));
      box.add(this.add.image(w.x, w.y, keys.wheel.pencil));
    });
  }

  buildPlayer() {
    this.walker = this.add.rectangle(this.fusedEntry ? 2110 : TRAIN_ENTRY_X, 410, 18, 62, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.physics.add.collider(this.walker, this.floor);
    // The yard's ends are the body's own bounds (alpha A3-1): writing
    // walker.x every frame let Arcade add a slow frame's whole step on top.
    this.walker.body.setBoundsRectangle(new Phaser.Geom.Rectangle(42 - 9, -200, WORLD.w - 44 - 42 + 18, WORLD.h + 400));
    this.walker.body.setCollideWorldBounds(true);
    this.figure = createPaintedPlayer(this, 28);
    this.playerFacing = 1;
    this.playerAnimation = 'idle';
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.13);
    this.cameras.main.setDeadzone(260, 180);
  }

  buildGrain() {
    const key = buildPaperGrain(this, 'paper-grain-pigment-train');
    hideUnderLowGraphics(this, [this.add.tileSprite(0, 0, VIEW.w, VIEW.h, key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(80)
      .setAlpha(0.68)]);
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
    this.brush.cursor.setDepth(95);
    this.tag = new PaperTag(this, { depth: 120 });
    this.restart = new RestartHold(this, { onRestart: () => this.scene.restart({ skipIntro: true }) });
  }

  startMusic() {
    this.music = this.cache.audio.exists('chapter4-consequence-music')
      ? this.sound.add('chapter4-consequence-music', { loop: true, volume: 0.34 })
      : null;
    const play = () => {
      if (!this.music?.isPlaying) this.music?.play();
    };
    if (this.sound.locked) this.sound.once('unlocked', play);
    else play();
    this.input.once('pointerdown', play);
    this.input.keyboard.once('keydown', play);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());
  }

  applyQaState() {
    // Dev-only: devParam() is null in production.
    const qa = this.qa;
    if (qa === 'home-plate') {
      this.walker.setPosition(SOURCE_X[5] - 40, 410);
      this.cameras.main.centerOn(SOURCE_X[5], 300);
      return;
    }
    if (!['build-train', 'train-ready', 'fused-train'].includes(qa)) return;
    if (!this.fusedEntry) PIGMENTS.forEach(({ id }) => this.chapter.collect(id));
    this.walker.setPosition(2470, 410);
    this.cameras.main.centerOn(2560, 300);
    if (qa === 'train-ready') TRAIN_BUILD_EXAMPLE_ORDER.forEach((id) => this.chapter.placePart(id, id));
    this.chapter.drainEvents();
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
    drawPaintedPlayer(this.figure, this.walker, this.brush);
  }

  trainWorldPoint(x, y) {
    return {
      x: TRAIN_MIRROR_X - (x - TRAIN_MIRROR_X) * TRAIN_SCALE + this.trainOffset,
      y: TRAIN_ORIGIN.y + (y - TRAIN_ORIGIN.y) * TRAIN_SCALE,
    };
  }

  trainLocalPoint(x, y) {
    return {
      x: TRAIN_MIRROR_X - (x - this.trainOffset - TRAIN_MIRROR_X) / TRAIN_SCALE,
      y: TRAIN_ORIGIN.y + (y - TRAIN_ORIGIN.y) / TRAIN_SCALE,
    };
  }

  positionTrainArt(shake = 0) {
    this.trainArt
      .setScale(-TRAIN_SCALE, TRAIN_SCALE)
      .setPosition(
        TRAIN_MIRROR_X * (1 + TRAIN_SCALE) + this.trainOffset + shake,
        TRAIN_ORIGIN.y * (1 - TRAIN_SCALE),
      );
  }

  sourceAt(x, y) {
    return this.sources.find((source) => Phaser.Geom.Rectangle.Contains(source.rect, x, y)) ?? null;
  }

  partAt(x, y) {
    const local = this.trainLocalPoint(x, y);
    return TRAIN_PARTS.find((part) => pointInPart(part, local.x, local.y)) ?? null;
  }

  onHomePlate(x, y) {
    return !this.fusedEntry && x >= HOME_PLATE.x - 6 && x <= HOME_PLATE.x + HOME_PLATE.w + 6
      && y >= HOME_PLATE.y - 6 && y <= HOME_PLATE.y + HOME_PLATE.h + 6;
  }

  cabBounds() {
    return this.partWorldBounds(TRAIN_PARTS.find((part) => part.id === 'orange'));
  }

  nearCab() {
    const cab = this.cabBounds();
    return Math.abs(this.walker.x - (cab.x + cab.w / 2)) <= 220;
  }

  // The parts this one stands on that are not painted yet.
  missingFor(id) {
    return (TRAIN_BUILD_RULES[id]?.requires ?? []).filter((need) => !this.chapter.pigment(need).built);
  }

  setHold(key, dt) {
    if (this.hold.key !== key) this.hold = { key, progress: 0 };
    this.hold.progress += dt;
    return this.hold.progress >= HOLD_SECONDS;
  }

  resetHold() {
    this.hold = { key: null, progress: 0 };
  }

  // What the brush is on, in priority order: train parts first (so the ring
  // can never swallow a carriage click), then the cab, the HOME plate and
  // the places lending colour. The ring is not in this list at all.
  hitTest() {
    const { worldX: x, worldY: y } = this.brush;
    const built = this.chapter.state.trainBuilt;
    const part = this.partAt(x, y);
    if (part && built && part.id === 'orange') return { type: 'cab', part };
    if (part && !this.chapter.pigment(part.id).built && Math.abs(this.walker.x - x) <= PART_REACH) {
      return { type: this.missingFor(part.id).length ? 'part-later' : 'part', part };
    }
    if (part && built && this.nearCab()) return { type: 'cab', part };
    if (this.onHomePlate(x, y) && !this.chapter.state.homePlate.revealed && Math.abs(this.walker.x - PIGMENT_STONE.x) <= SOURCE_REACH) {
      return { type: 'home-plate' };
    }
    const source = this.sourceAt(x, y);
    if (source && !this.chapter.pigment(source.id).collected && Math.abs(this.walker.x - source.x) <= SOURCE_REACH) {
      return { type: 'source', source };
    }
    return null;
  }

  stepInteraction(dt, move) {
    const b = this.brush;
    const hit = this.hitTest();
    this.hover = hit;
    if (move.interactPressed && this.chapter.state.trainBuilt && this.nearCab()) {
      this.boardTrain();
      return;
    }
    if (!hit) return this.resetHold();
    if (hit.type === 'source' && b.washDown) {
      if (this.setHold(`source:${hit.source.id}`, dt)) {
        this.chapter.collect(hit.source.id);
        this.recordResume();
        noteAt(this, hit.source.x, 250, `${hit.source.name} · BORROWED`, { tone: 'info', hold: 1000 });
        this.tutorialSeen.collect = true;
        this.resetHold();
      }
      return;
    }
    if (hit.type === 'home-plate' && b.washDown) {
      if (this.setHold('home-plate', dt)) {
        this.chapter.washHomePlate();
        this.recordResume();
        this.resetHold();
        this.handleEvents();
      }
      return;
    }
    if (hit.type === 'part' && b.paintDown) {
      if (this.setHold(`part:${hit.part.id}`, dt)) {
        this.resetHold();
        this.paintPart(hit.part.id);
      }
      return;
    }
    if (hit.type === 'cab' && b.paintDown) {
      if (this.setHold('board', dt)) {
        this.resetHold();
        this.boardTrain();
      }
      return;
    }
    this.resetHold();
  }

  paintPart(id) {
    // Feedback sits by the part, under the rails, clear of the part's tag.
    const bounds = this.partWorldBounds(TRAIN_PARTS.find((p) => p.id === id));
    const at = { x: bounds.x + bounds.w / 2, y: FLOOR_Y + 44 };
    if (this.chapter.placePart(id)) {
      this.recordResume();
      const part = this.chapter.pigment(id);
      noteAt(this, at.x, at.y, `${part.part} · ${part.name}`, { tone: 'good', hold: 900 });
      this.trainShakeUntil = this.time.now + 180;
      this.tutorialSeen.part = true;
      return;
    }
    const failure = this.chapter.snapshot().lastFailure;
    this.failedPartId = id;
    this.failedPartUntil = this.time.now + 760;
    const part = this.chapter.pigment(id);
    if (failure?.reason === 'not-borrowed') {
      noteAt(this, at.x, at.y, `NO ${part.name} YET · BORROW IT FROM THE ${part.source}`, { tone: 'warn', hold: 1600 });
    } else if (failure?.reason === 'unsupported') {
      const missing = failure.missing.map((m) => this.chapter.pigment(m).part).join(' AND ');
      noteAt(this, at.x, at.y, `NOTHING TO STAND ON · ${missing} FIRST`, { tone: 'warn', hold: 1600 });
    }
  }

  handleEvents() {
    this.chapter.drainEvents().forEach((event) => {
      if (event.type === 'home-plate-thinned') {
        // Under the plate: the wash tag owns the space above it (alpha A3-5).
        noteAt(this, PIGMENT_STONE.x, HOME_PLATE.y + HOME_PLATE.h + 32, 'THE GREY THINS · ONCE MORE', { hold: 1000 });
      } else if (event.type === 'home-plate-revealed' && !this.stoneCollected) {
        this.time.delayedCall(500, () => this.collectStone());
      }
    });
  }

  collectStone() {
    if (this.stoneCollected) return;
    collectMagicStone('chapter-4');
    this.stoneCollected = true;
    const snapshot = magicStoneSnapshot();
    this.tag.hide();
    noteAt(this, PIGMENT_STONE.x, HOME_PLATE.y + HOME_PLATE.h + 32, `PIGMENT STONE · ${magicStoneCountLabel(snapshot)}`, { tone: 'good', hold: 1700 });
    this.cameras.main.flash(240, 224, 162, 74);
    // The shell's one-time "first stone" card waits while a stone beat is on
    // screen (pauseMenu.js checks NIGHTFALL_STONE_OFFER), so it comes after
    // this line has faded instead of freezing it half-way.
    globalThis.NIGHTFALL_STONE_OFFER = true;
    const release = () => { globalThis.NIGHTFALL_STONE_OFFER = false; };
    this.time.delayedCall(2400, release);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, release);
  }

  boardTrain() {
    if (this.transitioning || !this.chapter.boardTrain()) return;
    this.transitioning = true;
    this.tag.hide();
    this.registry.set('chapter4Pigments', PIGMENTS.map(({ id }) => id));
    this.registry.set('chapter4ArchiveAnswer', CHAPTER4_IGNITION_SIGN);
    if (this.music) this.tweens.add({ targets: this.music, volume: 0, duration: 420 });
    this.cameras.main.fadeOut(520, 247, 244, 236);
    this.time.delayedCall(560, () => this.scene.start('PaintedLine'));
  }

  updateTag() {
    const b = this.brush;
    if (this.locked || this.transitioning || this.bannerUp) return this.tag.hide();
    const hit = this.hover;
    const progress = this.hold.key ? this.hold.progress / HOLD_SECONDS : 0;
    if (hit?.type === 'source') {
      return this.tag.show(`${b.label('washHold')} · BORROW ${hit.source.name}`, hit.source.x, SOURCE_TAG_Y, { progress });
    }
    if (hit?.type === 'home-plate') {
      return this.tag.show(`${b.label('washHold')} · WASH THE GREY`, PIGMENT_STONE.x, HOME_PLATE.y - 8, { progress });
    }
    if (hit?.type === 'part' || hit?.type === 'part-later') {
      const bounds = this.partWorldBounds(hit.part);
      const part = this.chapter.pigment(hit.part.id);
      if (hit.type === 'part-later') {
        // Not yet: say what it stands on instead of inviting a refusal.
        const first = this.missingFor(hit.part.id).map((id) => this.chapter.pigment(id).part).join(' AND ');
        return this.tag.show(`THE ${part.part} · AFTER THE ${first}`, bounds.x + bounds.w / 2, bounds.y - 6);
      }
      return this.tag.show(`${b.label('paintHold')} · PAINT THE ${part.part}`, bounds.x + bounds.w / 2, bounds.y - 6, { progress });
    }
    if (this.chapter.state.trainBuilt && this.nearCab()) {
      const cab = this.cabBounds();
      return this.tag.show(`${b.label('paintHold')} ON THE CAB · ${b.label('read')} · BOARD`, cab.x + cab.w / 2, cab.y - 8, { progress: this.hold.key === 'board' ? progress : 0 });
    }
    const snap = this.chapter.snapshot();
    if (snap.collectedCount === 0 && this.walker.x < SOURCE_X[0] + 200) {
      return this.tag.show(`AIM AT THE AWNING · ${b.label('washHold')} TO BORROW ITS COLOUR`, SOURCE_X[0], SOURCE_TAG_Y);
    }
    if (this.walker.x > 2140 && !snap.trainBuilt && !this.tutorialSeen.part) {
      // over the carriage roof's far end, clear of the reference card (R4)
      return this.tag.show(`${b.label('paintHold')} A PART · WHEELS FIRST`, 2720, 330);
    }
    return this.tag.hide();
  }

  drawMarkers() {
    const g = this.markerArt;
    g.clear();
    const t = this.time.now;
    this.sources.forEach((s) => { if (!this.chapter.pigment(s.id).collected) drawGlintMarker(g, t, s.x + 70, SOURCE_TOP + 6); });
    if (!this.fusedEntry && !this.chapter.state.homePlate.revealed) drawGlintMarker(g, t, HOME_PLATE.x + HOME_PLATE.w + 4, HOME_PLATE.y - 6);
    TRAIN_PARTS.forEach((p) => {
      if (this.chapter.pigment(p.id).built || this.missingFor(p.id).length) return;
      const bounds = this.partWorldBounds(p);
      drawGlintMarker(g, t, bounds.x + bounds.w - 6, bounds.y + 4, { alpha: 0.8 });
    });
    if (this.chapter.state.trainBuilt) {
      const cab = this.cabBounds();
      drawGlintMarker(g, t, cab.x + cab.w - 4, cab.y - 6);
    }
  }

  // The borrowed colours, shown round Butch's head. Display only.
  drawRing() {
    const g = this.ringArt;
    g.clear();
    const snapshot = this.chapter.snapshot();
    const activeIds = snapshot.pigments.filter((item) => item.collected && !item.built).map((item) => item.id);
    const progressId = this.hold.key?.startsWith('source:') ? this.hold.key.slice('source:'.length) : null;
    if (activeIds.length || progressId) {
      drawPigmentHalo(g, {
        x: this.walker.x,
        y: this.walker.y - 50,
        pigments: PIGMENTS,
        activeIds,
        progressId,
        progress: this.hold.progress / HOLD_SECONDS,
        time: this.time.now,
      });
    }
  }

  drawFocus() {
    const g = this.focusArt;
    g.clear();
    const hit = this.hover;
    if (!hit) return;
    let rect = null;
    let color = UI.amberInk;
    if (hit.type === 'source') {
      rect = hit.source.rect;
      color = hit.source.color;
    } else if (hit.type === 'part-later') {
      rect = this.partWorldBounds(hit.part);
      color = PAPER.graphiteFaint;
    } else if (hit.type === 'part' || hit.type === 'cab') {
      rect = this.partWorldBounds(hit.part);
      if (this.failedPartId === hit.part.id && this.time.now < this.failedPartUntil) color = PAPER.fault;
    } else if (hit.type === 'home-plate') {
      rect = { x: HOME_PLATE.x - 4, y: HOME_PLATE.y - 4, w: HOME_PLATE.w + 8, h: HOME_PLATE.h + 8 };
    }
    if (!rect) return;
    g.lineStyle(2.2, color, 0.94);
    draftRect(g, makeRandom(0x8710 + Math.floor(rect.x)), rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8, { overshoot: 4, jitter: 0.8 });
    if (!this.hold.key) return;
    const progress = Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1);
    const head = { x: this.walker.x, y: this.walker.y - 50 };
    const centre = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    const edge = haloPointToward(head.x, head.y, centre.x, centre.y, 36);
    const from = hit.type === 'source' || hit.type === 'home-plate' ? centre : edge;
    const to = hit.type === 'source' || hit.type === 'home-plate' ? edge : centre;
    const end = { x: Phaser.Math.Linear(from.x, to.x, progress), y: Phaser.Math.Linear(from.y, to.y, progress) };
    g.lineStyle(2.5, color, 0.72);
    [-2.5, 2.5].forEach((o) => draftLine(g, makeRandom(0x8820 + o), from.x, from.y + o, end.x, end.y + o * 0.25, { overshoot: 0, jitter: 1.2, segments: 9 }));
  }

  refreshPresentation() {
    this.sources.forEach((source) => {
      source.art.setVisible(!this.fusedEntry);
      source.live.setVisible(!this.fusedEntry);
      source.label.setVisible(!this.fusedEntry);
      if (!this.fusedEntry) this.drawSource(source);
    });
    this.drawTrain();
  }

  update(time, delta) {
    // Wall-clock time down to 10 fps (alpha round 4: weak laptops run at
    // 15-25 fps, and a 50 ms cap slowed every walk, hold and bell there).
    const dt = Math.min(delta, FRAME_DT_CAP_MS) / 1000;
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
    this.refreshPresentation();
    this.drawHomePlate(time);
    this.drawRing();
    this.drawFocus();
    this.drawMarkers();
    this.updateTag();
    this.brush.drawCursor({ hidden: this.transitioning });
  }

  textState() {
    const snapshot = this.chapter.snapshot();
    const b = this.brush;
    return {
      scene: 'PigmentTrain',
      camera: { x: Math.round(this.cameras.main.worldView.x), y: Math.round(this.cameras.main.worldView.y) },
      coordinateSystem: 'world pixels; origin top-left; x right; y down',
      phase: snapshot.phase,
      locked: this.locked,
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        facing: this.playerFacing,
        animation: this.playerAnimation,
        onGround: this.walker.body.blocked.down,
      },
      pointer: { mode: b.mode, x: Math.round(b.worldX), y: Math.round(b.worldY) },
      hover: this.hover ? { type: this.hover.type, id: this.hover.part?.id ?? this.hover.source?.id ?? null } : null,
      hold: { key: this.hold.key, progress: Number((this.hold.progress / HOLD_SECONDS).toFixed(2)) },
      holdSeconds: HOLD_SECONDS,
      tag: this.tag.visible ? this.tag.text : null,
      counts: {
        collected: snapshot.collectedCount,
        trainParts: snapshot.builtCount,
        failedAttempts: snapshot.failedAttempts,
      },
      trainBuilt: snapshot.trainBuilt,
      boarded: snapshot.boarded,
      quiz: null,
      homePlate: snapshot.homePlate,
      stone: { collected: this.stoneCollected, x: PIGMENT_STONE.x, y: PIGMENT_STONE.y },
      // A point inside each part (for wheels, the second wheel's hub).
      parts: Object.fromEntries(TRAIN_PARTS.map((p) => {
        if (p.type === 'wheels') {
          const hub = this.trainWorldPoint(p.circles[1].x, p.circles[1].y);
          return [p.id, { x: Math.round(hub.x), y: Math.round(hub.y) }];
        }
        const r = this.partWorldBounds(p);
        return [p.id, { x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) }];
      })),
      sourcesAt: Object.fromEntries(this.sources.map((s) => [s.id, { x: s.x, y: 360 }])),
      buildRules: Object.fromEntries(Object.entries(TRAIN_BUILD_RULES).map(([id, rule]) => [id, { requires: [...rule.requires], tier: rule.tier }])),
      lastFailure: snapshot.lastFailure,
      pigments: snapshot.pigments.map(({ id, collected, built }) => ({ id, collected, built })),
      phaseIsBoarded: snapshot.phase === EXPANSION_PHASE.BOARDED,
      music: { playing: Boolean(this.music?.isPlaying), volume: Number((this.music?.volume ?? 0).toFixed(2)) },
    };
  }

  // A place keeps its colour until Butch borrows it; while he draws it out
  // the wash thins, then it is pencil only (a ghost of the colour stays).
  drawSource(source) {
    const item = this.chapter.pigment(source.id);
    const live = !item.collected;
    const suctionProgress = this.hold.key === `source:${source.id}`
      ? Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1)
      : 0;
    const target = live ? 1 - suctionProgress * 0.7 : 0.06;
    source.liveAlpha += (target - source.liveAlpha) * (live ? 1 : 0.12);
    source.live.setAlpha(source.liveAlpha);
    source.art.setAlpha(live ? 1 : 0.82);
    source.label.setColor(live ? cssColor(source.color) : '#8d8579');
  }

  drawTrain() {
    const shake = this.time.now < this.trainShakeUntil ? Math.sin(this.time.now / 38) * 5 : 0;
    this.positionTrainArt(shake);
    Object.entries(this.trainParts).forEach(([id, part]) => {
      const built = this.chapter.pigment(id).built;
      if (built === part.shown) return;
      part.shown = built;
      const images = id === 'green' ? this.wheelArt : [part];
      images.forEach(({ wash, edge, pencil }) => {
        this.tweens.killTweensOf([wash, edge, pencil]);
        if (!built) {
          wash.setAlpha(0);
          edge.setAlpha(0);
          pencil.setAlpha(0.5);
          return;
        }
        // The gouache goes on wet and pale, spreads, then dries darker at its
        // edges; the construction drawing firms up under it.
        wash.setAlpha(0.15);
        this.tweens.add({ targets: wash, alpha: TRAIN_WASH_ALPHA.body, duration: 900, ease: 'Sine.easeOut' });
        this.tweens.add({ targets: edge, alpha: TRAIN_WASH_ALPHA.edge, duration: 1300, delay: 450, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: pencil, alpha: 1, duration: 360, ease: 'Sine.easeOut' });
      });
    });
    // The train is whole: the street behind it warms a little too.
    if (this.chapter.state.trainBuilt && !this.yardBloomed) {
      this.yardBloomed = true;
      this.backdrop.bloomAll({ to: 0.5, duration: 1800, delay: 500, stagger: 120 });
    }
    const wheelSpin = -this.trainOffset / 18;
    this.wheelArt.forEach(({ wash, edge, pencil }) => { wash.setRotation(wheelSpin); edge.setRotation(wheelSpin); pencil.setRotation(wheelSpin); });
  }

  partWorldBounds(part) {
    const original = part.type === 'wheels'
      ? { x: 2317, y: 421, w: 578, h: 79 }
      : { x: part.x, y: part.y, w: part.w, h: part.h };
    const a = this.trainWorldPoint(original.x, original.y);
    const b = this.trainWorldPoint(original.x + original.w, original.y + original.h);
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
  }

}
