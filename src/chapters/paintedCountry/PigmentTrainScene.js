import Phaser from 'phaser';
import {
  CHAPTER4_IGNITION_SIGN,
  EXPANSION_PHASE,
  PIGMENTS,
  TRAIN_BUILD_EXAMPLE_ORDER,
  TRAIN_BUILD_RULES,
  createChapter4Expansion,
} from './chapter4ExpansionModel.js';
import { drawPaintedPlayer } from './paintedPlayerFigure.js';
import { drawPigmentHalo, haloPointToward } from './pigmentHalo.js';
import { PAPER } from './paperPalette.js';
import { buildPaperGrain, draftLine, draftRect, makeRandom } from './paperSurface.js';
import { BrushInput } from './brushInput.js';
import { HOLD_SECONDS, MONO, PaperTag, RestartHold, UI, drawGlintMarker, noteAt, showTitleCard } from './chapterUi.js';
import { drawGreyCell } from './platePencil.js';
import { collectMagicStone, magicStoneSnapshot } from '../../shell/magicStones.js';
import { devParam } from '../../devMode.js';

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
const SOURCE_SCALE = 0.68;
const TRAIN_SCALE = 0.82;
const TRAIN_ORIGIN = Object.freeze({ x: 2260, y: 468 });
const TRAIN_MIRROR_X = 2600;
const SOURCE_REACH = 190;
const PART_REACH = 420;

const SOURCE_X = [270, 590, 910, 1230, 1550, 1870];
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
    this.refreshPresentation();

    if (!data.skipIntro && !this.qa) {
      this.locked = true;
      showTitleCard(this, {
        kicker: 'CHAPTER 4 · THE PAINTED COUNTRY',
        main: 'III · THE PAINTED TRAIN',
        hold: 1600,
        onDone: () => { this.locked = false; },
      });
    }
  }

  buildWorld() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(PAPER.sheet, 1).fillRect(0, 0, WORLD.w, WORLD.h);
    g.fillStyle(PAPER.sheetLow, 1).fillRect(0, 0, WORLD.w, 52);
    g.fillStyle(PAPER.sheetHigh, 0.94).fillRect(0, 94, WORLD.w, 270);
    g.fillStyle(PAPER.sheetLow, 0.9).fillRect(0, FLOOR_Y, WORLD.w, WORLD.h - FLOOR_Y);

    g.lineStyle(1.3, PAPER.graphiteFaint, 0.45);
    for (let x = 54; x < WORLD.w; x += 126) {
      draftLine(g, this.rnd, x, 106, x + 80, 340, { overshoot: 0, jitter: 0.6, segments: 9 });
    }
    g.lineStyle(2, PAPER.graphite, 0.78);
    draftLine(g, this.rnd, 0, FLOOR_Y, WORLD.w, FLOOR_Y, { overshoot: 0, jitter: 0.8, segments: 60 });

    for (let i = 0; i < PIGMENTS.length && !this.fusedEntry; i += 1) {
      const x = SOURCE_X[i];
      g.lineStyle(1.2, PAPER.graphiteFaint, 0.55);
      draftLine(g, this.rnd, x - 116, 118, x + 116, 118, { jitter: 0.5, segments: 7 });
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
        rect: new Phaser.Geom.Rectangle(SOURCE_X[index] - 64, 276, 128, 194),
        art: this.add.graphics().setDepth(12),
      };
      source.art.setScale(SOURCE_SCALE).setPosition(source.x * (1 - SOURCE_SCALE), FLOOR_Y * (1 - SOURCE_SCALE));
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

  buildTrain() {
    this.trainArt = this.add.graphics().setDepth(10);
    this.positionTrainArt();
    this.referenceArt = this.add.graphics().setDepth(9);
    this.referenceArt.setScale(-1, 1).setPosition(4656, 0);
    this.referenceLabel = this.add.text(2328, 146, 'THE PAINTED TRAIN, AS DRAWN', {
      fontFamily: MONO,
      fontSize: '11px',
      color: '#5c574f',
      letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(14);
    this.referenceRule = this.add.text(2328, 262, 'WHEELS  →  BODY  →  ROOF', {
      fontFamily: MONO,
      fontSize: '11px',
      color: '#6f675c',
      letterSpacing: 1.1,
    }).setOrigin(0.5).setDepth(14);
    this.drawReferenceTrain();
    this.ringArt = this.add.graphics().setDepth(90);
    this.focusArt = this.add.graphics().setDepth(91);
    this.markerArt = this.add.graphics().setDepth(89);
  }

  buildPlayer() {
    this.walker = this.add.rectangle(this.fusedEntry ? 2110 : TRAIN_ENTRY_X, 410, 18, 62, 0xffffff, 0);
    this.physics.add.existing(this.walker);
    this.physics.add.collider(this.walker, this.floor);
    this.walker.body.setCollideWorldBounds(false);
    this.figure = this.add.graphics().setDepth(28);
    this.playerFacing = 1;
    this.playerAnimation = 'idle';
    this.cameras.main.startFollow(this.walker, true, 0.1, 0.13);
    this.cameras.main.setDeadzone(260, 180);
  }

  buildGrain() {
    const key = buildPaperGrain(this, 'paper-grain-pigment-train');
    this.add.tileSprite(0, 0, VIEW.w, VIEW.h, key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(80)
      .setAlpha(0.68);
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
    this.walker.x = Phaser.Math.Clamp(this.walker.x, 42, WORLD.w - 44);
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
    if (part && !this.chapter.pigment(part.id).built && Math.abs(this.walker.x - x) <= PART_REACH) return { type: 'part', part };
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
        noteAt(this, hit.source.x, 250, `${hit.source.name} · BORROWED`, { tone: 'info', hold: 1000 });
        this.tutorialSeen.collect = true;
        this.resetHold();
      }
      return;
    }
    if (hit.type === 'home-plate' && b.washDown) {
      if (this.setHold('home-plate', dt)) {
        this.chapter.washHomePlate();
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
    const bounds = this.partWorldBounds(TRAIN_PARTS.find((p) => p.id === id));
    const at = { x: bounds.x + bounds.w / 2, y: bounds.y - 8 };
    if (this.chapter.placePart(id)) {
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
        noteAt(this, PIGMENT_STONE.x, HOME_PLATE.y - 6, 'THE GREY THINS · ONCE MORE', { hold: 1000 });
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
    noteAt(this, PIGMENT_STONE.x, HOME_PLATE.y - 10, `PIGMENT STONE · ${snapshot.count} / ${snapshot.total}`, { tone: 'good', hold: 2200 });
    this.cameras.main.flash(240, 224, 162, 74);
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
    if (this.locked || this.transitioning) return this.tag.hide();
    const hit = this.hover;
    const progress = this.hold.key ? this.hold.progress / HOLD_SECONDS : 0;
    if (hit?.type === 'source') {
      return this.tag.show(`${b.label('washHold')} · BORROW ${hit.source.name}`, hit.source.x, 272, { progress });
    }
    if (hit?.type === 'home-plate') {
      return this.tag.show(`${b.label('washHold')} · WASH THE GREY`, PIGMENT_STONE.x, HOME_PLATE.y - 8, { progress });
    }
    if (hit?.type === 'part') {
      const bounds = this.partWorldBounds(hit.part);
      const part = this.chapter.pigment(hit.part.id);
      return this.tag.show(`${b.label('paintHold')} · PAINT THE ${part.part}`, bounds.x + bounds.w / 2, bounds.y - 6, { progress });
    }
    if (this.chapter.state.trainBuilt && this.nearCab()) {
      const cab = this.cabBounds();
      return this.tag.show(`${b.label('paintHold')} ON THE CAB · ${b.label('read')} · BOARD`, cab.x + cab.w / 2, cab.y - 8, { progress: this.hold.key === 'board' ? progress : 0 });
    }
    const snap = this.chapter.snapshot();
    if (snap.collectedCount === 0 && this.walker.x < SOURCE_X[0] + 200) {
      return this.tag.show(`AIM AT THE AWNING · ${b.label('washHold')} TO BORROW ITS COLOUR`, SOURCE_X[0], 272);
    }
    if (this.walker.x > 2140 && !snap.trainBuilt && !this.tutorialSeen.part) {
      return this.tag.show(`${b.label('paintHold')} A PART · WHEELS FIRST`, 2560, 300);
    }
    return this.tag.hide();
  }

  drawMarkers() {
    const g = this.markerArt;
    g.clear();
    const t = this.time.now;
    this.sources.forEach((s) => { if (!this.chapter.pigment(s.id).collected) drawGlintMarker(g, t, s.x + 44, 286); });
    if (!this.fusedEntry && !this.chapter.state.homePlate.revealed) drawGlintMarker(g, t, HOME_PLATE.x + HOME_PLATE.w + 4, HOME_PLATE.y - 6);
    TRAIN_PARTS.forEach((p) => {
      if (this.chapter.pigment(p.id).built) return;
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
      source.label.setVisible(!this.fusedEntry);
      if (!this.fusedEntry) this.drawSource(source);
    });
    this.drawTrain();
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
      parts: Object.fromEntries(TRAIN_PARTS.map((p) => {
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

  drawSource(source) {
    const g = source.art;
    const item = this.chapter.pigment(source.id);
    const live = !item.collected;
    const color = live ? source.color : PAPER.graphiteFaint;
    g.clear();
    const suctionProgress = this.hold.key === `source:${source.id}`
      ? Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1)
      : 0;
    g.setAlpha(live ? 1 - suctionProgress * 0.58 : 1);
    g.lineStyle(2, PAPER.graphite, live ? 0.86 : 0.42);
    const x = source.x;
    const floor = FLOOR_Y - 8;

    if (source.index === 0) {
      g.fillStyle(PAPER.sheetHigh, 0.9).fillRect(x - 70, floor - 176, 140, 176);
      g.strokeRect(x - 70, floor - 176, 140, 176);
      for (let i = 0; i < 5; i += 1) {
        g.fillStyle(i % 2 === 0 && live ? color : PAPER.sheetLow, 0.9).fillTriangle(x - 72 + i * 29, floor - 176, x - 43 + i * 29, floor - 176, x - 57 + i * 29, floor - 146);
      }
      g.strokeRect(x - 35, floor - 105, 70, 105);
    } else if (source.index === 1) {
      g.lineStyle(5, PAPER.graphiteSoft, 0.55).lineBetween(x, floor, x, floor - 190);
      g.fillStyle(color, live ? 0.9 : 0.16).fillRoundedRect(x - 31, floor - 172, 62, 72, 7);
      g.lineStyle(2, PAPER.graphite, 0.84).strokeRoundedRect(x - 31, floor - 172, 62, 72, 7);
      g.lineBetween(x - 20, floor - 112, x + 20, floor - 160);
    } else if (source.index === 2) {
      g.lineStyle(4, PAPER.graphiteSoft, 0.6).lineBetween(x - 38, floor, x - 38, floor - 190);
      g.fillStyle(color, live ? 0.9 : 0.12).fillTriangle(x - 35, floor - 185, x + 62, floor - 154, x - 35, floor - 123);
      g.lineStyle(2, PAPER.graphite, 0.84).strokeTriangle(x - 35, floor - 185, x + 62, floor - 154, x - 35, floor - 123);
    } else if (source.index === 3) {
      g.fillStyle(PAPER.sheetLow, 0.8).fillRoundedRect(x - 76, floor - 48, 152, 48, 5);
      g.strokeRoundedRect(x - 76, floor - 48, 152, 48, 5);
      for (let i = 0; i < 7; i += 1) {
        const fx = x - 60 + i * 20;
        g.lineStyle(2, live ? PAPER.verdigris : PAPER.graphiteFaint, 0.72).lineBetween(fx, floor - 46, fx + (i % 2 ? 8 : -7), floor - (live ? 112 : 70));
        g.fillStyle(color, live ? 0.85 : 0.14).fillCircle(fx + (i % 2 ? 8 : -7), floor - (live ? 118 : 72), 8);
      }
    } else if (source.index === 4) {
      g.fillStyle(PAPER.sheetLow, 0.82).fillEllipse(x, floor - 46, 145, 72);
      g.lineStyle(2, PAPER.graphite, 0.84).strokeEllipse(x, floor - 46, 145, 72);
      g.fillStyle(color, live ? 0.86 : 0.12).fillEllipse(x, floor - 78, 118, 36);
      g.strokeEllipse(x, floor - 78, 118, 36);
      g.lineBetween(x - 58, floor - 78, x - 58, floor - 160);
      g.lineBetween(x + 58, floor - 78, x + 58, floor - 160);
      g.lineBetween(x - 58, floor - 160, x + 58, floor - 160);
    } else {
      g.lineStyle(2, PAPER.graphiteSoft, 0.6).lineBetween(x - 78, floor - 166, x + 78, floor - 166);
      g.fillStyle(color, live ? 0.88 : 0.1).fillRect(x - 65, floor - 158, 130, 130);
      g.lineStyle(2, PAPER.graphite, 0.84).strokeRect(x - 65, floor - 158, 130, 130);
      for (let xx = x - 65; xx < x + 65; xx += 32) g.lineBetween(xx, floor - 158, xx, floor - 28);
      for (let yy = floor - 158; yy < floor - 28; yy += 32) g.lineBetween(x - 65, yy, x + 65, yy);
    }

    if (!live) {
      g.lineStyle(3, PAPER.fault, 0.65);
      g.lineBetween(x - 42, floor - 135, x - 6, floor - 96);
      g.lineBetween(x - 6, floor - 96, x + 32, floor - 130);
      g.lineBetween(x - 6, floor - 96, x + 18, floor - 64);
    }
    source.label.setColor(live ? cssColor(source.color) : '#8d8579');
  }

  drawReferenceTrain() {
    const g = this.referenceArt;
    const x = 2142;
    const y = 164;
    g.clear();
    g.fillStyle(PAPER.sheetHigh, 0.94).fillRoundedRect(x - 12, y - 5, 398, 88, 4);
    g.lineStyle(1.3, PAPER.graphiteSoft, 0.72).strokeRoundedRect(x - 12, y - 5, 398, 88, 4);

    g.fillStyle(PAPER.kraft, 0.72).fillRoundedRect(x, y + 58, 360, 8, 3);
    g.lineStyle(1.4, PAPER.graphite, 0.82).strokeRoundedRect(x, y + 58, 360, 8, 3);

    g.fillStyle(this.chapter.pigment('red').color, 0.84).fillRoundedRect(x + 18, y + 25, 101, 35, 14);
    g.strokeRoundedRect(x + 18, y + 25, 101, 35, 14);
    g.fillCircle(x + 20, y + 42, 17);
    g.strokeCircle(x + 20, y + 42, 17);

    g.fillStyle(this.chapter.pigment('yellow').color, 0.86).fillRoundedRect(x + 49, y + 5, 18, 22, 3);
    g.strokeRoundedRect(x + 49, y + 5, 18, 22, 3);
    g.fillRoundedRect(x + 43, y, 30, 8, 4);
    g.strokeRoundedRect(x + 43, y, 30, 8, 4);

    g.fillStyle(this.chapter.pigment('orange').color, 0.86).fillRect(x + 116, y + 12, 48, 48);
    g.strokeRect(x + 116, y + 12, 48, 48);
    g.fillStyle(PAPER.sheetHigh, 0.84).fillRect(x + 126, y + 21, 25, 17);
    g.strokeRect(x + 126, y + 21, 25, 17);

    g.fillStyle(this.chapter.pigment('blue').color, 0.86).fillRoundedRect(x + 163, y + 25, 180, 35, 4);
    g.strokeRoundedRect(x + 163, y + 25, 180, 35, 4);
    [176, 211, 246, 281].forEach((windowX) => {
      g.fillStyle(PAPER.sheetHigh, 0.84).fillRect(x + windowX, y + 33, 24, 14);
      g.strokeRect(x + windowX, y + 33, 24, 14);
    });

    g.fillStyle(this.chapter.pigment('violet').color, 0.86);
    g.beginPath();
    g.moveTo(x + 109, y + 25);
    g.lineTo(x + 122, y + 6);
    g.lineTo(x + 339, y + 6);
    g.lineTo(x + 351, y + 25);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(this.chapter.pigment('green').color, 0.88);
    [46, 137, 224, 315].forEach((wheelX) => {
      g.fillCircle(x + wheelX, y + 66, 15);
      g.strokeCircle(x + wheelX, y + 66, 15);
      g.fillStyle(PAPER.sheetHigh, 0.72).fillCircle(x + wheelX, y + 66, 5);
      g.strokeCircle(x + wheelX, y + 66, 5);
      g.fillStyle(this.chapter.pigment('green').color, 0.88);
    });
    g.lineStyle(2.5, PAPER.graphiteSoft, 0.68).lineBetween(x + 46, y + 67, x + 315, y + 67);
  }

  drawTrain() {
    const g = this.trainArt;
    const shake = this.time.now < this.trainShakeUntil ? Math.sin(this.time.now / 38) * 5 : 0;
    const dx = 0;
    this.positionTrainArt(shake);
    const outlineAlpha = 0.88;
    const partFill = (id) => {
      const item = this.chapter.pigment(id);
      return {
        color: item.built ? item.color : PAPER.sheetHigh,
        alpha: item.built ? 0.9 : 0.38,
      };
    };
    const useFill = (id) => {
      const fill = partFill(id);
      g.fillStyle(fill.color, fill.alpha);
      g.lineStyle(2.2, PAPER.graphite, outlineAlpha);
    };

    g.clear();

    // A neutral frame joins every painted component into one believable machine.
    g.fillStyle(PAPER.kraft, this.chapter.pigment('green').built ? 0.68 : 0.2);
    g.lineStyle(2.3, PAPER.graphite, outlineAlpha);
    g.fillRoundedRect(2255 + dx, 447, 686, 19, 5);
    g.strokeRoundedRect(2255 + dx, 447, 686, 19, 5);
    g.lineBetween(2240 + dx, 466, 2962 + dx, 466);
    g.lineBetween(2268 + dx, 485, 2928 + dx, 485);
    g.lineBetween(2230 + dx, 456, 2255 + dx, 456);
    g.lineBetween(2941 + dx, 456, 2968 + dx, 456);
    g.strokeCircle(2222 + dx, 456, 8);
    g.strokeCircle(2976 + dx, 456, 8);

    // Engine boiler: the round nose and long body now meet the cab directly.
    useFill('red');
    g.fillRoundedRect(2288 + dx, 372, 212, 84, 30);
    g.strokeRoundedRect(2288 + dx, 372, 212, 84, 30);
    g.fillCircle(2292 + dx, 414, 40);
    g.strokeCircle(2292 + dx, 414, 40);
    g.lineBetween(2319 + dx, 392, 2477 + dx, 392);
    g.lineBetween(2319 + dx, 437, 2477 + dx, 437);
    g.lineBetween(2490 + dx, 379, 2490 + dx, 448);
    g.fillStyle(PAPER.sheetHigh, 0.84).fillCircle(2278 + dx, 397, 9);
    g.strokeCircle(2278 + dx, 397, 9);

    // Chimney and whistle share one yellow silhouette and visibly seat on the boiler.
    useFill('yellow');
    g.fillRoundedRect(2367 + dx, 329, 36, 47, 4);
    g.strokeRoundedRect(2367 + dx, 329, 36, 47, 4);
    g.fillRoundedRect(2353 + dx, 316, 64, 16, 7);
    g.strokeRoundedRect(2353 + dx, 316, 64, 16, 7);
    g.fillCircle(2431 + dx, 354, 10);
    g.strokeCircle(2431 + dx, 354, 10);
    g.lineBetween(2403 + dx, 353, 2421 + dx, 353);

    // Cab bridges the engine and carriage instead of floating between them.
    useFill('orange');
    g.fillRect(2496 + dx, 340, 102, 116);
    g.strokeRect(2496 + dx, 340, 102, 116);
    g.fillStyle(PAPER.sheetHigh, 0.86).fillRoundedRect(2515 + dx, 359, 55, 43, 4);
    g.strokeRoundedRect(2515 + dx, 359, 55, 43, 4);
    g.lineBetween(2542 + dx, 359, 2542 + dx, 402);
    g.lineBetween(2579 + dx, 414, 2579 + dx, 452);
    g.strokeCircle(2570 + dx, 431, 3);

    // Carriage body continues from the cab, with a repeating window rhythm.
    useFill('blue');
    g.fillRoundedRect(2594 + dx, 372, 306, 84, 7);
    g.strokeRoundedRect(2594 + dx, 372, 306, 84, 7);
    [2620, 2679, 2738, 2797].forEach((windowX) => {
      g.fillStyle(PAPER.sheetHigh, 0.84).fillRoundedRect(windowX + dx, 389, 39, 31, 3);
      g.strokeRoundedRect(windowX + dx, 389, 39, 31, 3);
    });
    g.lineBetween(2855 + dx, 380, 2855 + dx, 454);
    g.strokeCircle(2866 + dx, 431, 3);
    g.lineBetween(2608 + dx, 437, 2885 + dx, 437);

    // One continuous roof locks cab and carriage into the same vehicle.
    useFill('violet');
    g.beginPath();
    g.moveTo(2482 + dx, 365);
    g.lineTo(2503 + dx, 326);
    g.lineTo(2892 + dx, 326);
    g.lineTo(2912 + dx, 365);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.lineBetween(2502 + dx, 347, 2892 + dx, 347);

    // Wheels, axles, and a single connecting rod make the undercarriage read as one system.
    useFill('green');
    const wheels = TRAIN_PARTS.find((part) => part.id === 'green').circles;
    const wheelSpin = -this.trainOffset / 18;
    wheels.forEach((circle) => {
      const wheelFill = partFill('green');
      g.fillStyle(wheelFill.color, wheelFill.alpha);
      g.fillCircle(circle.x + dx, circle.y, circle.r);
      g.strokeCircle(circle.x + dx, circle.y, circle.r);
      g.fillStyle(PAPER.sheetHigh, 0.66).fillCircle(circle.x + dx, circle.y, 11);
      g.strokeCircle(circle.x + dx, circle.y, 11);
      for (let spoke = 0; spoke < 8; spoke += 1) {
        const angle = (Math.PI * 2 * spoke) / 8 + wheelSpin;
        g.lineBetween(
          circle.x + dx + Math.cos(angle) * 12,
          circle.y + Math.sin(angle) * 12,
          circle.x + dx + Math.cos(angle) * (circle.r - 5),
          circle.y + Math.sin(angle) * (circle.r - 5),
        );
      }
    });
    g.lineStyle(5, PAPER.graphiteSoft, 0.68);
    g.lineBetween(2358 + dx, 466, 2854 + dx, 466);
    g.lineStyle(2, PAPER.sheetHigh, 0.7);
    g.lineBetween(2358 + dx, 464, 2854 + dx, 464);
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
