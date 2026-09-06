import Phaser from 'phaser';
import {
  EXPANSION_PHASE,
  CHAPTER4_IGNITION_SIGN,
  PIGMENTS,
  TRAIN_BUILD_EXAMPLE_ORDER,
  TRAIN_BUILD_RULES,
  createChapter4Expansion,
} from './chapter4ExpansionModel.js';
import { SIGN_ART } from './carLayout.js';
import { drawPaintedPlayer } from './paintedPlayerFigure.js';
import { drawPigmentHalo, haloPointToward, pigmentAtHalo } from './pigmentHalo.js';
import { PAPER } from './paperPalette.js';
import { buildPaperGrain, draftLine, makeRandom } from './paperSurface.js';
import { CINEMATICS, navigateAfterCinematic } from '../../shell/gameFlow.js';
import { createSaveStore } from '../../shell/saveSystem.js';

const VIEW = { w: 960, h: 600 };
const WORLD = { w: 4000, h: 600 };
const FLOOR_Y = 474;
const MOVE_SPEED = 220;
const JUMP_VELOCITY = -620;
const HOLD_SECONDS = 0.5;
const TRAIN_ENTRY_X = 116;
const SOURCE_SCALE = 0.68;
const TRAIN_SCALE = 0.82;
const TRAIN_ORIGIN = Object.freeze({ x: 2260, y: 468 });
const TRAIN_MIRROR_X = 2600;
const TRAIN_ESCAPE_DISTANCE = 780;
const TRAIN_ESCAPE_MS = 5700;
const CROWD_APPROACH_MS = 2100;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const SOURCE_X = [270, 590, 910, 1230, 1550, 1870];

const TRAIN_PARTS = Object.freeze([
  { id: 'red', type: 'rect', x: 2288, y: 372, w: 212, h: 84 },
  { id: 'orange', type: 'rect', x: 2496, y: 340, w: 102, h: 116 },
  { id: 'yellow', type: 'rect', x: 2350, y: 316, w: 92, h: 58 },
  { id: 'green', type: 'wheels', circles: [{ x: 2358, y: 462, r: 33 }, { x: 2535, y: 462, r: 33 }, { x: 2698, y: 462, r: 33 }, { x: 2854, y: 462, r: 33 }] },
  { id: 'blue', type: 'rect', x: 2594, y: 372, w: 306, h: 84 },
  { id: 'violet', type: 'roof', x: 2482, y: 326, w: 430, h: 40 },
]);

const SOURCE_TITLES = ['BAKERY', 'STATION', 'ORCHARD', 'MILL', 'SQUARE', 'HOME'];

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
    Object.entries(SIGN_ART).forEach(([sign, file]) => {
      if (!this.textures.exists(`train-sign-${sign}`)) this.load.image(`train-sign-${sign}`, file);
    });
  }

  create() {
    const qa = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('qa') : null;
    const qaUnlocked = ['fused-train', 'ignition'].includes(qa) ? PIGMENTS.map(({ id }) => id) : [];
    // Normal play always re-collects the six world colors from left to right.
    // Only explicit QA routes may prefill them for focused train testing.
    const unlockedPigments = qaUnlocked;
    this.registry.set('chapter4Pigments', []);
    this.fusedEntry = unlockedPigments.length === PIGMENTS.length;
    this.chapter = createChapter4Expansion({ unlockedPigments });
    this.rnd = makeRandom(0xc4104);
    this.selectedId = null;
    this.selectedPartId = null;
    this.ringPress = null;
    this.failedPartId = null;
    this.failedPartUntil = 0;
    this.hold = { key: null, progress: 0 };
    this.cutscene = false;
    this.trainOffset = 0;
    this.trainShakeUntil = 0;
    this.crowd = [];
    this.speechBubbles = [];
    this.chaseBeat = 'idle';
    this.trainMoving = false;
    this.chaseCameraActive = false;
    this.chaseCameraX = null;
    this.chaseCameraStartX = null;
    this.lastHint = '';
    this.chapterTransitionStarted = false;
    this.ignitionOpen = false;
    this.tutorialSeen = { collect: this.fusedEntry, selectPart: false, chooseColor: false, board: false };

    this.cameras.main.setBackgroundColor(PAPER.sheet);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.physics.world.setBounds(0, -200, WORLD.w, WORLD.h + 400);

    this.buildWorld();
    this.buildSources();
    this.buildTrain();
    this.buildPlayer();
    this.buildHud();
    this.buildIgnitionChoice();
    this.buildGrain();
    this.bindInput();
    this.startMusic();
    this.applyQaState();
    this.refreshPresentation();
  }

  buildWorld() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(PAPER.sheet, 1).fillRect(0, 0, WORLD.w, WORLD.h);
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
      this.add.text(x, 86, SOURCE_TITLES[i], {
        fontFamily: MONO,
        fontSize: '11px',
        color: '#8d8579',
        letterSpacing: 2,
      }).setOrigin(0.5).setDepth(4);
    }

    if (this.fusedEntry) {
      this.add.text(210, 118, 'THREE ARCHIVES  ·  SIX REMEMBERED COLORS', {
        fontFamily: MONO,
        fontSize: '11px',
        color: '#2f8c9e',
        letterSpacing: 2,
      }).setDepth(4);
      this.add.text(210, 142, 'THE HUE RING CARRIES THEM INTO THE UNFINISHED TRAIN.', {
        fontFamily: MONO,
        fontSize: '9px',
        color: '#8d8579',
        letterSpacing: 1.4,
      }).setDepth(4);
    }

    this.yardTitle = this.add.text(2135, 86, 'THE UNFINISHED TRAIN', {
      fontFamily: MONO,
      fontSize: '14px',
      color: '#5c574f',
      letterSpacing: 2.8,
    }).setDepth(4);
    this.yardSubtitle = this.add.text(2135, 109, 'SIX PARTS. SIX COLORS.', {
      fontFamily: MONO,
      fontSize: '10px',
      color: '#8d8579',
      letterSpacing: 1.6,
    }).setDepth(4);

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
      source.label = this.add.text(source.x, 498, pigment.source, {
        fontFamily: MONO,
        fontSize: '8px',
        color: cssColor(pigment.color),
        align: 'center',
        letterSpacing: 1.2,
        wordWrap: { width: 138 },
      }).setOrigin(0.5, 0).setDepth(13);
      return source;
    });
  }

  buildTrain() {
    this.trainArt = this.add.graphics().setDepth(10);
    this.positionTrainArt();
    this.referenceArt = this.add.graphics().setDepth(9);
    this.referenceArt.setScale(-1, 1).setPosition(4656, 0);
    this.referenceLabel = this.add.text(2328, 146, 'FINISHED TRAIN', {
      fontFamily: MONO,
      fontSize: '9px',
      color: '#5c574f',
      letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(14);
    this.referenceRule = this.add.text(2328, 257, 'WHEELS  →  BODY  →  ROOF', {
      fontFamily: MONO,
      fontSize: '8px',
      color: '#8d8579',
      letterSpacing: 1.1,
    }).setOrigin(0.5).setDepth(14);
    this.drawReferenceTrain();
    this.cabPromptArt = this.add.graphics().setDepth(34);
    this.cabPromptTitle = this.add.text(0, 0, 'BOARD', {
      fontFamily: MONO,
      fontSize: '13px',
      color: '#4a4640',
      letterSpacing: 2.4,
    }).setOrigin(0.5).setDepth(35).setVisible(false);
    this.cabPromptHint = this.add.text(0, 0, 'HOLD', {
      fontFamily: MONO,
      fontSize: '8px',
      color: '#2f8c9e',
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(35).setVisible(false);
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

  buildHud() {
    // Objective/counter values remain available to render_game_to_text, but
    // they are no longer screen furniture. All teaching now happens beside
    // the object in a hand-drawn frame.
    const stateLabel = () => ({
      text: '',
      visible: false,
      setText(value) { this.text = value; return this; },
      setVisible(value) { this.visible = value; return this; },
    });
    this.objective = stateLabel();
    this.counter = stateLabel();
    this.controls = stateLabel();

    this.flash = this.add.text(0, 0, '', {
      fontFamily: MONO,
      fontSize: '10px',
      color: '#b4453a',
      align: 'center',
      lineSpacing: 4,
      letterSpacing: 1.1,
      backgroundColor: '#fdfcf8ee',
      padding: { x: 11, y: 8 },
    }).setOrigin(0.5, 1).setDepth(92).setAlpha(0);
    this.subtitle = this.add.text(480, 456, '', {
      fontFamily: MONO,
      fontSize: '13px',
      color: '#3f3b35',
      letterSpacing: 1.4,
    }).setScrollFactor(0).setDepth(90)
      .setOrigin(0.5, 1)
      .setBackgroundColor('#fdfcf8ee')
      .setPadding(18, 12, 18, 12)
      .setAlign('center')
      .setAlpha(0);
    this.interactionRing = this.add.graphics().setDepth(90);
    this.selectedArt = this.add.graphics().setDepth(91);
    this.contextFrame = this.add.graphics().setDepth(92);
    this.contextText = this.add.text(0, 0, '', {
      fontFamily: MONO,
      fontSize: '10px',
      color: '#4a4640',
      align: 'center',
      lineSpacing: 4,
      letterSpacing: 1.1,
      padding: { x: 9, y: 7 },
    }).setOrigin(0.5, 1).setDepth(93).setVisible(false);
  }

  buildGrain() {
    const key = buildPaperGrain(this, 'paper-grain-pigment-train');
    this.add.tileSprite(0, 0, VIEW.w, VIEW.h, key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(80)
      .setAlpha(0.68);
  }

  buildIgnitionChoice() {
    const depth = 140;
    this.ignitionElements = [];
    const add = (object) => {
      object.setScrollFactor(0).setDepth(depth + this.ignitionElements.length * 0.01).setVisible(false);
      this.ignitionElements.push(object);
      return object;
    };
    add(this.add.rectangle(VIEW.w / 2, VIEW.h / 2, 820, 470, PAPER.sheetHigh, 0.985)
      .setStrokeStyle(2, PAPER.graphite, 0.9));
    add(this.add.text(VIEW.w / 2, 92, 'IGNITION ARCHIVE', {
      fontFamily: MONO, fontSize: '18px', color: '#4a4640', letterSpacing: 3,
    }).setOrigin(0.5));
    add(this.add.text(VIEW.w / 2, 126,
      'THE NAVE  ·  THE LISTENING FIELD  ·  THE LAST CITY\nALL THREE RECORDS END ON THE SAME WORD.', {
        fontFamily: MONO, fontSize: '10px', color: '#8d8579', align: 'center',
        lineSpacing: 7, letterSpacing: 1.4,
      }).setOrigin(0.5));
    add(this.add.text(VIEW.w / 2, 202, 'WHICH SIGN STARTS THE BORROWED TRAIN?', {
      fontFamily: MONO, fontSize: '12px', color: '#4a4640', letterSpacing: 2,
    }).setOrigin(0.5));

    const signs = Object.keys(SIGN_ART);
    signs.forEach((sign, index) => {
      const x = 256 + index * 112;
      const image = add(this.add.image(x, 300, `train-sign-${sign}`).setDisplaySize(66, 66));
      image.setInteractive({ useHandCursor: true });
      image.on('pointerdown', () => this.chooseIgnition(sign));
      const label = sign.toUpperCase().replace('-', ' ');
      add(this.add.text(x, 354, label, {
        fontFamily: MONO, fontSize: '9px', color: '#5c574f', letterSpacing: 1.2,
      }).setOrigin(0.5));
    });
    this.ignitionFeedback = add(this.add.text(VIEW.w / 2, 412, '', {
      fontFamily: MONO, fontSize: '11px', color: '#b4453a', align: 'center', letterSpacing: 1.4,
    }).setOrigin(0.5));
  }

  setIgnitionVisible(visible) {
    this.ignitionOpen = visible;
    this.ignitionElements.forEach((element) => element.setVisible(visible));
  }

  openIgnitionChoice() {
    if (!this.chapter.state.boarded && !this.chapter.boardTrain()) return;
    this.walker.body.setVelocity(0, 0);
    this.ignitionFeedback.setText('');
    this.setIgnitionVisible(true);
  }

  chooseIgnition(sign) {
    if (!this.ignitionOpen) return;
    const result = this.chapter.chooseIgnition(sign);
    if (!result.ok) {
      this.ignitionFeedback.setText(`${String(sign).toUpperCase()} DOES NOT MATCH THE THREE NOTES.\nTHE TRAIN WAITS.`);
      this.cameras.main.shake(90, 0.0018);
      return;
    }
    this.ignitionFeedback.setText('MOON  ·  THE ARCHIVE ENGINE ANSWERS.');
    this.time.delayedCall(480, () => {
      this.setIgnitionVisible(false);
      this.beginChaseSequence();
    });
  }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', up: 'UP', a: 'A', d: 'D', w: 'W', space: 'SPACE' });
    this.input.keyboard.addCapture(['LEFT', 'RIGHT', 'UP', 'SPACE']);
    this.input.mouse?.disableContextMenu();
    this.input.keyboard.on('keydown', (event) => {
      if (event.key.toLowerCase() === 'r') this.scene.restart();
      else if (event.key.toLowerCase() === 'f') {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      }
    });
    this.input.on('pointerdown', (pointer) => {
      if (this.ignitionOpen) return;
      if (this.chapter.state.phase !== EXPANSION_PHASE.BUILD || this.chapter.state.trainBuilt) return;
      const world = this.pointerWorld(pointer);
      const haloPigment = pigmentAtHalo(this.walker.x, this.walker.y - 50, PIGMENTS, world.x, world.y);
      if (haloPigment && this.chapter.pigment(haloPigment.id).collected && !this.chapter.pigment(haloPigment.id).built) {
        if (!this.selectedPartId) {
          this.flashMessage('PICK A PART FIRST.', cssColor(PAPER.cyan));
          return;
        }
        this.selectedId = haloPigment.id;
        this.ringPress = { id: haloPigment.id, startedAt: this.time.now };
        this.tutorialSeen.chooseColor = true;
        return;
      }
      const part = this.partAt(world.x, world.y);
      if (part && !this.chapter.pigment(part.id).built) this.selectPart(part.id);
    });
    this.input.on('pointerup', () => this.releaseRingColor());
  }

  startMusic() {
    this.music = this.sound.add('chapter4-consequence-music', { loop: true, volume: 0.34 });
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
    if (!import.meta.env.DEV) return;
    const qa = new URLSearchParams(window.location.search).get('qa');
    if (!['build-train', 'ring-press', 'train-ready', 'fused-train', 'ignition', 'consequence'].includes(qa)) return;

    if (!this.fusedEntry) PIGMENTS.forEach(({ id }) => this.chapter.collect(id));
    this.walker.setPosition(2470, 410);
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(2560, 300);
    if (['build-train', 'fused-train'].includes(qa)) return;
    if (qa === 'ring-press') {
      this.selectedPartId = 'green';
      this.selectedId = 'green';
      this.ringPress = { id: 'green', startedAt: this.time.now - 300 };
      return;
    }

    TRAIN_BUILD_EXAMPLE_ORDER.forEach((id) => this.chapter.placePart(id, id));
    if (qa === 'train-ready') return;
    if (qa === 'ignition') {
      this.chapter.boardTrain();
      this.time.delayedCall(250, () => this.openIgnitionChoice());
      return;
    }
    if (qa === 'consequence') {
      this.chapter.boardTrain();
      this.chapter.chooseIgnition(CHAPTER4_IGNITION_SIGN);
      this.time.delayedCall(350, () => this.beginChaseSequence());
    }
  }

  selectPart(id) {
    const item = this.chapter.pigment(id);
    if (!item || item.built || this.chapter.state.phase !== EXPANSION_PHASE.BUILD) return;
    this.selectedPartId = id;
    this.selectedId = null;
    this.tutorialSeen.selectPart = true;
  }

  releaseRingColor() {
    if (!this.ringPress) return;
    const colorId = this.ringPress.id;
    const partId = this.selectedPartId;
    this.ringPress = null;
    if (!partId || this.chapter.state.phase !== EXPANSION_PHASE.BUILD) return;
    if (this.chapter.placePart(partId, colorId)) {
      const part = this.chapter.pigment(partId);
      this.flashMessage(`${part.part} SET.`, cssColor(part.color));
      this.selectedPartId = null;
      this.selectedId = null;
      this.trainShakeUntil = this.time.now + 180;
      return;
    }

    const failure = this.chapter.snapshot().lastFailure;
    this.failedPartId = partId;
    this.failedPartUntil = this.time.now + 760;
    this.cameras.main.shake(90, 0.0022);
    if (failure?.reason === 'wrong-color') {
      this.flashMessage('WRONG COLOR.', '#b4453a');
    } else if (failure?.reason === 'unsupported') {
      this.flashMessage('BUILD FROM THE BOTTOM.', '#b4453a');
    }
  }

  stepPlayer() {
    if (this.cutscene || this.ignitionOpen || this.chapter.state.phase === EXPANSION_PHASE.CHASE || this.chapter.state.complete) {
      this.walker.body.setVelocityX(0);
      return;
    }
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    const jump = this.keys.up.isDown || this.keys.w.isDown || this.keys.space.isDown;
    this.walker.body.setVelocityX(left && !right ? -MOVE_SPEED : right && !left ? MOVE_SPEED : 0);
    if (jump && this.walker.body.blocked.down) this.walker.body.setVelocityY(JUMP_VELOCITY);
    this.walker.x = Phaser.Math.Clamp(this.walker.x, 42, WORLD.w - 44);
  }

  updateFigure(time) {
    if (!this.figure.visible) return;
    const moving = Math.abs(this.walker.body.velocity.x) > 8;
    if (this.walker.body.velocity.x < -8) this.playerFacing = -1;
    if (this.walker.body.velocity.x > 8) this.playerFacing = 1;
    this.playerAnimation = moving ? 'walk' : 'idle';
    drawPaintedPlayer(this.figure, this.walker, this.input.activePointer);
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

  pointerWorld(pointer = this.input.activePointer) {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  sourceAt(x, y) {
    return this.sources.find((source) => Phaser.Geom.Rectangle.Contains(source.rect, x, y)) ?? null;
  }

  partAt(x, y) {
    const local = this.trainLocalPoint(x, y);
    return TRAIN_PARTS.find((part) => pointInPart(part, local.x, local.y)) ?? null;
  }

  boardAt(x, y) {
    if (!this.chapter.state.trainBuilt || this.chapter.state.phase !== EXPANSION_PHASE.BUILD) return null;
    const cab = this.partWorldBounds(TRAIN_PARTS.find((part) => part.id === 'orange'));
    if (Math.abs(this.walker.x - (cab.x + cab.w / 2)) > 220) return null;
    const rect = new Phaser.Geom.Rectangle(cab.x - 12, cab.y - 18, cab.w + 24, cab.h + 30);
    return Phaser.Geom.Rectangle.Contains(rect, x, y) ? { rect } : null;
  }

  setHold(key, dt) {
    if (this.hold.key !== key) this.hold = { key, progress: 0 };
    this.hold.progress += dt;
    return this.hold.progress >= HOLD_SECONDS;
  }

  resetHold() {
    this.hold = { key: null, progress: 0 };
  }

  stepInteraction(dt) {
    if (this.cutscene || this.ignitionOpen) return this.resetHold();
    const pointer = this.input.activePointer;
    const { x, y } = this.pointerWorld(pointer);
    const phase = this.chapter.state.phase;

    if (phase === EXPANSION_PHASE.COLLECT) {
      const source = this.sourceAt(x, y);
      const inReach = source && Phaser.Math.Distance.Between(this.walker.x, this.walker.y, source.x, 390) <= 170;
      if (!source || !inReach || !pointer.rightButtonDown() || this.chapter.pigment(source.id).collected) return this.resetHold();
      if (this.setHold(`source:${source.id}`, dt)) {
        this.chapter.collect(source.id);
        this.selectedId = source.id;
        this.flashMessage(`${source.name} TAKEN.`, cssColor(source.color));
        this.resetHold();
      }
      return;
    }

    if (phase === EXPANSION_PHASE.BUILD && this.chapter.state.trainBuilt) {
      const board = this.boardAt(x, y);
      if (!board || !pointer.leftButtonDown()) return this.resetHold();
      if (this.setHold('board', dt)) {
        this.tutorialSeen.board = true;
        this.resetHold();
        this.openIgnitionChoice();
      }
      return;
    }

    this.resetHold();
  }

  beginChaseSequence() {
    if (this.chapter.state.phase !== EXPANSION_PHASE.CHASE) return;
    this.cutscene = true;
    this.chaseBeat = 'crowd-approach';
    this.trainMoving = false;
    this.walker.body.setVelocity(0, 0);
    this.figure.setVisible(false);
    this.cameras.main.stopFollow();
    this.chaseCameraX = this.cameras.main.midPoint.x;
    this.chaseCameraStartX = this.chaseCameraX;
    this.cabPromptArt.clear();
    this.cabPromptTitle.setVisible(false);
    this.cabPromptHint.setVisible(false);
    this.subtitle.setAlpha(0);
    this.tweens.add({ targets: this.music, volume: 0.43, duration: 900 });

    this.spawnCrowd();
    this.time.delayedCall(CROWD_APPROACH_MS, () => this.beginTrainEscape());
    this.time.delayedCall(CROWD_APPROACH_MS + TRAIN_ESCAPE_MS + 850, () => this.finishConsequence());
  }

  spawnCrowd() {
    if (this.crowd.length) return;
    const trainRearX = this.trainWorldPoint(2976, 456).x;
    for (let i = 0; i < 9; i += 1) {
      const person = this.makeResident(2080 - i * 29, FLOOR_Y, i);
      this.crowd.push(person);
      this.tweens.add({
        targets: person,
        x: trainRearX - 38 - i * 25,
        duration: 1600 + i * 55,
        ease: 'Sine.easeOut',
      });
    }

    this.time.delayedCall(330, () => this.showSpeechBubble(this.crowd[0], 'WAIT!', -4, -113));
    this.time.delayedCall(760, () => this.showSpeechBubble(this.crowd[3], 'OUR COLORS!', 2, -142));
    this.time.delayedCall(1180, () => this.showSpeechBubble(this.crowd[4], 'COME BACK!', 18, -112));
  }

  makeResident(x, y, index) {
    const container = this.add.container(x, y).setDepth(26);
    container.poseArt = this.add.graphics();
    container.color = PIGMENTS[index % PIGMENTS.length].color;
    container.runSeed = index * 0.72;
    container.baseY = y;
    container.add(container.poseArt);
    this.drawResidentPose(container, 0, false);
    return container;
  }

  drawResidentPose(person, time, running) {
    const g = person.poseArt;
    const stride = running ? Math.sin(time / 82 + person.runSeed) : 0;
    const arm = stride * 11;
    const leg = stride * 10;
    g.clear();
    g.lineStyle(2, PAPER.graphite, 0.9);
    g.fillStyle(PAPER.sheetHigh, 0.96).fillCircle(0, -62, 10);
    g.strokeCircle(0, -62, 10);
    g.fillStyle(person.color, 0.76).fillRoundedRect(-6, -51, 12, 27, 3);
    g.strokeRoundedRect(-6, -51, 12, 27, 3);
    g.lineBetween(-3, -45, -12 + arm, -31);
    g.lineBetween(3, -45, 12 - arm, -31);
    g.lineBetween(-2, -24, -10 + leg, 0);
    g.lineBetween(2, -24, 10 - leg, 0);
    g.lineStyle(2, PAPER.fault, 0.82);
    g.lineBetween(-8, -78, -2, -74);
    g.lineBetween(2, -74, 8, -78);
  }

  showSpeechBubble(person, text, offsetX, offsetY) {
    if (!person || this.chaseBeat === 'settled') return;
    const width = Math.max(64, text.length * 7 + 24);
    const height = 34;
    const bubble = this.add.container(person.x + offsetX, person.baseY + offsetY).setDepth(42);
    const art = this.add.graphics();
    art.fillStyle(PAPER.sheetHigh, 0.98).fillRoundedRect(-width / 2, -height / 2, width, height, 11);
    art.lineStyle(1.6, PAPER.graphiteSoft, 0.88).strokeRoundedRect(-width / 2, -height / 2, width, height, 11);
    art.fillStyle(PAPER.sheetHigh, 0.98).fillTriangle(-7, height / 2 - 2, 8, height / 2 - 2, -1, height / 2 + 11);
    art.lineStyle(1.4, PAPER.graphiteSoft, 0.88);
    art.lineBetween(-7, height / 2 - 2, -1, height / 2 + 11);
    art.lineBetween(-1, height / 2 + 11, 8, height / 2 - 2);
    art.lineStyle(2.2, person.color, 0.72).lineBetween(-width / 2 + 13, height / 2 - 5, width / 2 - 13, height / 2 - 5);
    const label = this.add.text(0, -1, text, {
      fontFamily: MONO,
      fontSize: '10px',
      color: '#4a4640',
      letterSpacing: 1.4,
    }).setOrigin(0.5);
    bubble.add([art, label]);
    bubble.setScale(0.72).setAlpha(0);
    const entry = { person, bubble, offsetX, offsetY };
    this.speechBubbles.push(entry);
    this.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 230, ease: 'Back.easeOut' });
  }

  beginTrainEscape() {
    if (this.chaseBeat !== 'crowd-approach') return;
    this.chaseBeat = 'train-escape';
    this.trainMoving = true;
    this.chaseCameraActive = true;
    this.trainShakeUntil = this.time.now + 480;
    this.cameras.main.shake(110, 0.0016);
    this.tweens.add({
      targets: this,
      trainOffset: TRAIN_ESCAPE_DISTANCE,
      duration: TRAIN_ESCAPE_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.trainMoving = false;
        this.chaseBeat = 'settling';
      },
    });
    this.crowd.forEach((person, index) => {
      this.tweens.add({
        targets: person,
        x: person.x + 340 + index * 7,
        duration: TRAIN_ESCAPE_MS,
        ease: 'Sine.easeOut',
      });
    });
  }

  updateChaseCamera(dt) {
    if (!this.chaseCameraActive) return;
    const halfView = VIEW.w / 2;
    const trainFocusX = TRAIN_MIRROR_X + this.trainOffset + 70;
    const trainFrontX = this.trainWorldPoint(2240, FLOOR_Y).x;
    const crowdLeftX = this.crowd.length
      ? Math.min(...this.crowd.map((person) => person.x - 18))
      : trainFocusX;
    const groupFocusX = (crowdLeftX + trainFrontX) / 2;
    const escapeProgress = Phaser.Math.Clamp(this.trainOffset / TRAIN_ESCAPE_DISTANCE, 0, 1);
    const trainPriority = escapeProgress * escapeProgress;
    const cinematicFocusX = Phaser.Math.Linear(groupFocusX, trainFocusX, trainPriority);
    const forwardOnlyFocusX = Math.max(this.chaseCameraStartX ?? halfView, cinematicFocusX);
    const targetX = Phaser.Math.Clamp(forwardOnlyFocusX, halfView, WORLD.w - halfView);
    const smoothing = 1 - Math.exp(-4.4 * dt);
    this.chaseCameraX = Phaser.Math.Linear(this.chaseCameraX ?? this.cameras.main.midPoint.x, targetX, smoothing);
    this.cameras.main.centerOn(this.chaseCameraX, VIEW.h / 2);
  }

  updateChaseVisuals(time, dt) {
    if (this.chapter.state.phase !== EXPANSION_PHASE.CHASE) return;
    const running = this.chaseBeat !== 'settled';
    this.crowd.forEach((person) => {
      const bob = running ? -Math.abs(Math.sin(time / 82 + person.runSeed)) * 3 : 0;
      person.y = person.baseY + bob;
      this.drawResidentPose(person, time, running);
    });
    this.speechBubbles.forEach((entry) => {
      entry.bubble.setPosition(entry.person.x + entry.offsetX, entry.person.y + entry.offsetY);
    });
    this.updateChaseCamera(dt);
  }

  finishConsequence() {
    if (!this.chapter.revealConsequence()) return;
    this.chaseBeat = 'settled';
    this.trainMoving = false;
    this.chaseCameraActive = false;
    this.subtitle.setAlpha(0);
    this.tweens.add({ targets: this.music, volume: 0.28, duration: 1200 });
    this.time.delayedCall(1450, () => this.finishChapter());
  }

  finishChapter() {
    if (this.chapterTransitionStarted) return;
    this.chapterTransitionStarted = true;
    const wash = this.add.rectangle(0, 0, VIEW.w, VIEW.h, PAPER.bookCloth, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(200);
    this.tweens.add({
      targets: wash,
      fillAlpha: { from: 0, to: 0.32 },
      duration: 520,
      yoyo: true,
      hold: 720,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        createSaveStore().markCheckpoint('chapter-5-start');
        navigateAfterCinematic('chapter-4-to-5', CINEMATICS.chapter4To5, '/museum-3d.html', {
          label: 'Chapter 4 to Chapter 5 transition',
          preloadChapterId: 'chapter5',
        });
      },
    });
  }

  flashMessage(text, color = '#b4453a') {
    if (this.lastHint === text && this.time.now - (this.lastHintAt ?? 0) < 850) return;
    this.lastHint = text;
    this.lastHintAt = this.time.now;
    this.tweens.killTweensOf(this.flash);
    const fixedBuildMessage = this.chapter.state.phase === EXPANSION_PHASE.BUILD;
    this.flash
      .setPosition(fixedBuildMessage ? 2270 : this.walker.x, fixedBuildMessage ? 320 : this.walker.y - 84)
      .setText(text)
      .setColor(color)
      .setAlpha(1);
    this.tweens.add({ targets: this.flash, alpha: 0, delay: 1100, duration: 650 });
  }

  showContextPrompt(spec) {
    this.contextFrame.clear();
    if (!spec) {
      this.contextText.setVisible(false);
      return;
    }
    this.contextText.setText(spec.text).setPosition(spec.x, spec.y).setColor(cssColor(spec.color)).setVisible(true);
    const bounds = this.contextText.getBounds();
    this.contextFrame.fillStyle(PAPER.sheetHigh, 0.95).fillRoundedRect(bounds.x - 5, bounds.y - 4, bounds.width + 10, bounds.height + 8, 3);
    this.contextFrame.lineStyle(1.5, PAPER.graphiteSoft, 0.82);
    const rnd = makeRandom(Math.floor(spec.x * 19 + spec.y));
    draftLine(this.contextFrame, rnd, bounds.x - 5, bounds.y - 4, bounds.x + bounds.width + 5, bounds.y - 4, { overshoot: 3, jitter: 0.7 });
    draftLine(this.contextFrame, rnd, bounds.x + bounds.width + 5, bounds.y - 4, bounds.x + bounds.width + 5, bounds.y + bounds.height + 4, { overshoot: 3, jitter: 0.7 });
    draftLine(this.contextFrame, rnd, bounds.x + bounds.width + 5, bounds.y + bounds.height + 4, bounds.x - 5, bounds.y + bounds.height + 4, { overshoot: 3, jitter: 0.7 });
    draftLine(this.contextFrame, rnd, bounds.x - 5, bounds.y + bounds.height + 4, bounds.x - 5, bounds.y - 4, { overshoot: 3, jitter: 0.7 });
    this.contextFrame.lineStyle(2.4, spec.color, 0.84);
    draftLine(this.contextFrame, rnd, bounds.x + 8, bounds.y + bounds.height + 1, bounds.x + bounds.width - 8, bounds.y + bounds.height + 1, { overshoot: 0, jitter: 1, segments: 5 });
  }

  drawCabPrompt(visible) {
    this.cabPromptArt.clear();
    this.cabPromptTitle.setVisible(visible);
    this.cabPromptHint.setVisible(visible);
    if (!visible) return;
    const cab = this.partWorldBounds(TRAIN_PARTS.find((part) => part.id === 'orange'));
    const anchorX = cab.x + cab.w / 2;
    const anchorY = cab.y - 58;
    const iconX = anchorX - 42;
    const iconY = anchorY + 9;
    const progress = this.hold.key === 'board' ? Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1) : 0;

    this.cabPromptTitle.setPosition(anchorX + 12, anchorY + 1);
    this.cabPromptHint.setPosition(anchorX + 12, anchorY + 20);
    this.cabPromptArt.fillStyle(PAPER.sheetHigh, 0.96).fillCircle(iconX, iconY, 13);
    this.cabPromptArt.lineStyle(1.5, PAPER.graphiteSoft, 0.86).strokeCircle(iconX, iconY, 13);
    this.cabPromptArt.lineStyle(1.2, PAPER.graphite, 0.82).strokeRoundedRect(iconX - 4, iconY - 7, 8, 13, 3);
    this.cabPromptArt.lineBetween(iconX, iconY - 5, iconX, iconY - 1);
    if (progress > 0) {
      this.cabPromptArt.lineStyle(3, PAPER.cyan, 0.94);
      this.cabPromptArt.beginPath();
      this.cabPromptArt.arc(iconX, iconY, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false);
      this.cabPromptArt.strokePath();
    }
    this.cabPromptArt.lineStyle(1.5, PAPER.cyan, 0.72);
    const rnd = makeRandom(0x4cab);
    draftLine(this.cabPromptArt, rnd, anchorX - 3, anchorY + 30, anchorX + 27, anchorY + 30, { overshoot: 1, jitter: 0.5, segments: 4 });
    draftLine(this.cabPromptArt, rnd, anchorX + 12, anchorY + 34, anchorX, cab.y - 6, { overshoot: 0, jitter: 0.5, segments: 4 });
  }

  updateContextPrompt() {
    const snapshot = this.chapter.snapshot();
    const phase = snapshot.phase;
    this.tutorialSeen.collect ||= snapshot.collectedCount > 0;
    this.tutorialSeen.board ||= snapshot.boarded;
    let spec = null;
    if (phase === EXPANSION_PHASE.COLLECT && snapshot.collectedCount === 0) {
      const source = this.sources
        .filter((item) => !this.chapter.pigment(item.id).collected)
        .map((item) => ({ ...item, distance: Math.abs(this.walker.x - item.x) }))
        .filter((item) => item.distance <= 170)
        .sort((a, b) => a.distance - b.distance)[0];
      if (source) spec = { text: 'RIGHT-HOLD · TAKE COLOR', x: source.x, y: 178, color: source.color };
    } else if (phase === EXPANSION_PHASE.BUILD && !snapshot.trainBuilt && this.walker.x > 2140) {
      if (!this.selectedPartId) {
        spec = { text: 'CLICK A TRAIN PART', x: 2780, y: 300, color: PAPER.cyan };
      } else {
        const pressed = this.ringPress ? this.chapter.pigment(this.ringPress.id) : null;
        spec = {
          text: pressed ? `${pressed.name} · RELEASE` : 'HOLD A RING COLOR',
          x: 2780,
          y: 300,
          color: pressed?.color ?? PAPER.cyan,
        };
      }
    }
    this.showContextPrompt(spec);
    const cab = this.partWorldBounds(TRAIN_PARTS.find((part) => part.id === 'orange'));
    const nearCab = Math.abs(this.walker.x - (cab.x + cab.w / 2)) <= 220;
    this.drawCabPrompt(phase === EXPANSION_PHASE.BUILD && snapshot.trainBuilt && nearCab);

    this.selectedArt.clear();
    if (phase === EXPANSION_PHASE.COLLECT || phase === EXPANSION_PHASE.BUILD) {
      const activeIds = snapshot.pigments.filter((item) => item.collected && !item.built).map((item) => item.id);
      const progressId = this.hold.key?.startsWith('source:') ? this.hold.key.slice('source:'.length) : null;
      if (activeIds.length || progressId) {
        const pressProgress = this.ringPress
          ? Phaser.Math.Clamp((this.time.now - this.ringPress.startedAt) / 260, 0, 1)
          : 0;
        drawPigmentHalo(this.selectedArt, {
          x: this.walker.x,
          y: this.walker.y - 50,
          pigments: PIGMENTS,
          activeIds,
          selectedId: phase === EXPANSION_PHASE.BUILD ? this.selectedId : null,
          pressedId: this.ringPress?.id ?? null,
          pressProgress,
          progressId,
          progress: this.hold.progress / HOLD_SECONDS,
          time: this.time.now,
        });
      }
    }
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

  drawInteractionRing() {
    const g = this.interactionRing;
    g.clear();
    const pointer = this.input.activePointer;
    const world = this.pointerWorld(pointer);
    const phase = this.chapter.state.phase;
    const source = phase === EXPANSION_PHASE.COLLECT ? this.sourceAt(world.x, world.y) : null;
    const haloPigment = phase === EXPANSION_PHASE.BUILD
      ? pigmentAtHalo(this.walker.x, this.walker.y - 50, PIGMENTS, world.x, world.y)
      : null;
    const part = phase === EXPANSION_PHASE.BUILD && !haloPigment ? this.partAt(world.x, world.y) : null;
    const board = phase === EXPANSION_PHASE.BUILD ? this.boardAt(world.x, world.y) : null;
    let rect = null;
    let color = PAPER.cyan;
    if (source && !this.chapter.pigment(source.id).collected) {
      rect = source.rect;
      color = source.color;
    } else if (this.selectedPartId && phase === EXPANSION_PHASE.BUILD && !this.chapter.pigment(this.selectedPartId).built) {
      rect = this.partWorldBounds(TRAIN_PARTS.find((item) => item.id === this.selectedPartId));
      color = this.failedPartId === this.selectedPartId && this.time.now < this.failedPartUntil ? PAPER.fault : PAPER.cyan;
    } else if (part && !this.chapter.pigment(part.id).built) {
      rect = this.partWorldBounds(part);
      color = PAPER.cyan;
    } else if (board) {
      rect = board.rect;
      color = PAPER.cyan;
    }
    if (rect) {
      g.lineStyle(2.2, color, 0.94);
      const rnd = makeRandom(0x8710 + Math.floor(rect.x));
      draftLine(g, rnd, rect.x - 4, rect.y - 4, rect.x + rect.w + 4, rect.y - 4, { overshoot: 4, jitter: 0.8 });
      draftLine(g, rnd, rect.x + rect.w + 4, rect.y - 4, rect.x + rect.w + 4, rect.y + rect.h + 4, { overshoot: 4, jitter: 0.8 });
      draftLine(g, rnd, rect.x + rect.w + 4, rect.y + rect.h + 4, rect.x - 4, rect.y + rect.h + 4, { overshoot: 4, jitter: 0.8 });
      draftLine(g, rnd, rect.x - 4, rect.y + rect.h + 4, rect.x - 4, rect.y - 4, { overshoot: 4, jitter: 0.8 });
    }
    if (this.ringPress && this.selectedPartId && rect) {
      const pressed = this.chapter.pigment(this.ringPress.id);
      const progress = Phaser.Math.Clamp((this.time.now - this.ringPress.startedAt) / 260, 0, 1);
      const head = { x: this.walker.x, y: this.walker.y - 50 };
      const centre = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
      const from = haloPointToward(head.x, head.y, centre.x, centre.y, 39 + progress * 5);
      const end = { x: Phaser.Math.Linear(from.x, centre.x, progress * 0.72), y: Phaser.Math.Linear(from.y, centre.y, progress * 0.72) };
      g.lineStyle(2.7 + progress * 1.4, pressed.color, 0.76);
      [-3, 3].forEach((offset) => draftLine(g, makeRandom(0x8830 + offset), from.x, from.y + offset, end.x, end.y + offset * 0.2, {
        overshoot: 0,
        jitter: 1.4,
        segments: 9,
      }));
      return;
    }
    if (!this.hold.key || !rect) return;
    const progress = Phaser.Math.Clamp(this.hold.progress / HOLD_SECONDS, 0, 1);
    const head = { x: this.walker.x, y: this.walker.y - 50 };
    const centre = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    const haloEdge = haloPointToward(head.x, head.y, centre.x, centre.y, 36);
    const from = this.hold.key.startsWith('source:') ? centre : haloEdge;
    const destination = this.hold.key.startsWith('source:') ? haloEdge : centre;
    const end = { x: Phaser.Math.Linear(from.x, destination.x, progress), y: Phaser.Math.Linear(from.y, destination.y, progress) };
    g.lineStyle(2.5, color, 0.72);
    [-2.5, 2.5].forEach((offset) => draftLine(g, makeRandom(0x8820 + offset), from.x, from.y + offset, end.x, end.y + offset * 0.25, {
      overshoot: 0,
      jitter: 1.2,
      segments: 9,
    }));
  }

  refreshPresentation() {
    const snapshot = this.chapter.snapshot();
    const phase = snapshot.phase;
    const sourcesVisible = phase === EXPANSION_PHASE.COLLECT || phase === EXPANSION_PHASE.BUILD;
    this.sources.forEach((source) => {
      source.art.setVisible(sourcesVisible);
      source.label.setVisible(sourcesVisible);
      if (sourcesVisible) this.drawSource(source);
    });
    const referenceVisible = phase === EXPANSION_PHASE.BUILD;
    this.referenceArt.setVisible(referenceVisible);
    this.referenceLabel.setVisible(referenceVisible);
    this.referenceRule.setVisible(referenceVisible);
    this.drawTrain();
    if (phase === EXPANSION_PHASE.COLLECT) {
      this.objective.setText('TAKE ALL SIX COLORS.');
      this.counter.setText(`COLORS  ${snapshot.collectedCount}/6`);
      this.controls.setText('MOVE · JUMP · RIGHT-HOLD');
      this.yardTitle.setText('THE UNFINISHED TRAIN');
      this.yardSubtitle.setText('SIX PARTS. SIX COLORS.');
    } else if (phase === EXPANSION_PHASE.BUILD && !snapshot.trainBuilt) {
      this.objective.setText('COPY THE TRAIN. BUILD BOTTOM-UP.');
      this.counter.setText(`TRAIN  ${snapshot.builtCount}/6`);
      this.controls.setText('CLICK PART · HOLD COLOR · RELEASE');
      this.yardTitle.setText('THE UNFINISHED TRAIN');
      this.yardSubtitle.setText('COPY IT. BUILD BOTTOM-UP.');
    } else if (phase === EXPANSION_PHASE.BUILD) {
      this.objective.setText(snapshot.boarded ? 'CHOOSE THE ARCHIVE SIGN.' : 'BOARD THE TRAIN.');
      this.counter.setText('TRAIN  6/6');
      this.controls.setText('HOLD TO BOARD');
      this.yardTitle.setText('THE PAINTED TRAIN');
      this.yardSubtitle.setText('READY TO GO.');
    } else if (phase === EXPANSION_PHASE.CHASE) {
      this.objective.setText('THE CROWD IS CHASING THE TRAIN.');
      this.counter.setText('CONSEQUENCE');
      this.yardTitle.setText('');
      this.yardSubtitle.setText('');
    }

    this.controls.setVisible(phase !== EXPANSION_PHASE.CHASE);
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.stepPlayer();
    this.stepInteraction(dt);
    this.updateFigure(time);

    this.updateChaseVisuals(time, dt);

    this.refreshPresentation();
    this.drawInteractionRing();
    this.updateContextPrompt();
  }

  textState() {
    const snapshot = this.chapter.snapshot();
    const pointer = this.input.activePointer;
    const world = this.pointerWorld(pointer);
    const source = this.sourceAt(world.x, world.y);
    const part = this.partAt(world.x, world.y);
    const board = this.boardAt(world.x, world.y);
    return {
      scene: 'PigmentTrain',
      coordinateSystem: 'world pixels; origin top-left; x right; y down',
      phase: snapshot.phase,
      objective: this.objective?.text ?? '',
      player: {
        x: Math.round(this.walker.x),
        y: Math.round(this.walker.y),
        facing: this.playerFacing,
        animation: this.playerAnimation,
        onGround: this.walker.body.blocked.down,
        cutscene: this.cutscene,
      },
      selectedPart: this.selectedPartId,
      selectedColor: this.selectedId,
      ringPress: this.ringPress ? {
        id: this.ringPress.id,
        progress: Number(Phaser.Math.Clamp((this.time.now - this.ringPress.startedAt) / 260, 0, 1).toFixed(2)),
      } : null,
      counts: {
        collected: snapshot.collectedCount,
        trainParts: snapshot.builtCount,
        failedAttempts: snapshot.failedAttempts,
      },
      train: {
        heading: 'right',
        offset: Math.round(this.trainOffset),
        moving: this.trainMoving,
      },
      trainBuilt: snapshot.trainBuilt,
      boarded: snapshot.boarded,
      ignition: {
        open: this.ignitionOpen,
        chosen: snapshot.ignition.chosen,
        started: snapshot.ignition.started,
        wrongTries: snapshot.ignition.wrongTries,
        answerCarriedFromArchives: this.registry.get('chapter4ArchiveAnswer') ?? null,
      },
      crowdVisible: this.crowd.length > 0,
      chase: {
        beat: this.chaseBeat,
        cameraCenterX: Math.round(this.cameras.main.midPoint.x),
        nearestCrowdGap: this.crowd.length
          ? Math.round(this.trainWorldPoint(2976, 456).x - Math.max(...this.crowd.map((person) => person.x)))
          : null,
        speech: this.speechBubbles.map((entry) => entry.bubble.list[1]?.text ?? '').filter(Boolean),
      },
      consequenceRevealed: snapshot.consequenceRevealed,
      complete: snapshot.complete,
      interaction: {
        pointer: {
          x: Math.round(pointer.x),
          y: Math.round(pointer.y),
          worldX: Math.round(world.x),
          worldY: Math.round(world.y),
        },
        source: source?.id ?? null,
        trainPart: part?.id ?? null,
        board: Boolean(board),
        holdProgress: Number(this.hold.progress.toFixed(2)),
      },
      tutorialSeen: { ...this.tutorialSeen },
      buildRules: Object.fromEntries(Object.entries(TRAIN_BUILD_RULES).map(([id, rule]) => [id, { requires: [...rule.requires], tier: rule.tier }])),
      lastFailure: snapshot.lastFailure,
      pigments: snapshot.pigments.map(({ id, collected, built }) => ({ id, collected, built })),
      music: { playing: Boolean(this.music?.isPlaying), volume: Number((this.music?.volume ?? 0).toFixed(2)) },
    };
  }
}
