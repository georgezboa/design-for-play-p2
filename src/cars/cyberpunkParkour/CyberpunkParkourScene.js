import Phaser from 'phaser';
import { GAME_H, GAME_W, GRAVITY, LANE_NEAR, MOVE } from '../../constants.js';
import Player from '../../Player.js';
import { STORY_WORLDS } from '../../story.js';
import { music } from '../../shared/musicDirector.js';
import { createSaveStore } from '../../shell/saveSystem.js';
import { CINEMATICS, navigateAfterCinematic } from '../../shell/gameFlow.js';
import { collectMagicStone, magicStoneSnapshot } from '../../shell/magicStones.js';
import { WorldAssetLoader, getWorldAsset, queueWorldAsset } from '../../worlds/worldAssets.js';
import {
  PARKOUR_HEIGHT,
  PARKOUR_WIDTH,
  activateCheckpoint,
  beginDrag,
  canCompleteGoal,
  completeGoal,
  createParkourState,
  finishDrag,
  movableById,
  parkourSnapshot,
  previewDrag,
  recordCarRide,
  recordNarrativeInteraction,
  resetParkourState,
  stepFlyingCars,
} from './parkourModel.js';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const CYAN = 0x25e6ff;
const PINK = 0xff3aae;
const AMBER = 0xffbf26;
const GREEN = 0x45ff65;
const RED = 0xff435f;
const STEEL = 0x111522;
const DEEP_STEEL = 0x060811;
const VIOLET_STEEL = 0x25142d;
const TRAIN_RETURN_X = 4700;
const TRAIN_RETURN_Y = 400;
const MIDPOINT_X = 4230;
const MIDPOINT_ROOF_Y = 120;
const FINAL_GOAL_X = 8040;
const FINAL_GOAL_ROOF_Y = 180;
// Keep the pickup at chest height on the lower RETURN route so walking the
// optional branch collects it without a precision jump.
const GRID_STONE = Object.freeze({ x: 6370, y: 445 });
const STORY_NPC_X = 126;
const STORY_NPC_GROUND_Y = 540;
const MARA_LETTER_X = 7890;
const MARA_LETTER_Y = 146;

const PARKOUR_STORY = Object.freeze({
  npc: {
    speaker: 'ROOFTOP MECHANIC',
    role: 'night transit / maintenance shift',
    lines: [
      'Mara came through three nights ago. She asked which roofs still connected to the old transit balcony.',
      'I showed her the maintenance ladders. She moved them herself and crossed before the patrol cars changed shift.',
      'She left a letter at the final door. She said the person looking for her would know the name.',
    ],
  },
  letter: {
    speaker: 'MARA',
    role: 'letter / left at the final balcony',
    lines: [
      'Butch— I made it through this city, but I could not wait here.',
      'The train opened the next door before dawn. I went on.',
      'If you are following me, keep moving. I will leave another mark where I can. — Mara',
    ],
  },
});

const PLATFORM_DEFS = [
  { x: 0, y: 540, w: 460, h: 180, accent: CYAN, sign: 'START' },
  { x: 470, y: 350, w: 440, h: 370, accent: PINK, sign: '未来' },
  { x: 760, y: 170, w: 430, h: 550, accent: PINK, sign: 'NEON HOTEL' },
  { x: 1190, y: 465, w: 410, h: 255, accent: CYAN, sign: 'RETURN' },
  { x: 1600, y: 210, w: 440, h: 510, accent: PINK, sign: '08' },
  { x: 1900, y: 390, w: 300, h: 330, accent: AMBER, sign: '危険' },
  { x: 2200, y: 390, w: 580, h: 330, accent: CYAN, sign: '株式会社' },
  { x: 2800, y: 220, w: 300, h: 500, accent: PINK, sign: 'TRANSIT' },
  { x: 2700, y: 500, w: 480, h: 220, accent: AMBER, sign: 'RETURN' },
  { x: 3150, y: 160, w: 300, h: 560, accent: CYAN, sign: '08' },
  { x: 3500, y: 360, w: 350, h: 360, accent: PINK, sign: 'WARNING' },
  { x: 3800, y: 500, w: 200, h: 220, accent: AMBER, sign: 'RETURN' },
  { x: 4000, y: 300, w: 300, h: 420, accent: CYAN, sign: 'POWER' },
  { x: 4180, y: 120, w: 120, h: 600, accent: PINK, sign: 'TOP' },
  { x: 4300, y: 360, w: 420, h: 360, accent: AMBER, sign: 'CHECKPOINT' },
  { x: 4720, y: 180, w: 360, h: 540, accent: CYAN, sign: 'SKYLINE' },
  { x: 5080, y: 500, w: 440, h: 220, accent: AMBER, sign: 'RETURN' },
  { x: 5520, y: 260, w: 360, h: 460, accent: PINK, sign: 'SIGNAL' },
  { x: 5880, y: 80, w: 360, h: 640, accent: CYAN, sign: 'OVERRIDE' },
  { x: 6240, y: 500, w: 360, h: 220, accent: AMBER, sign: 'RETURN' },
  { x: 6600, y: 260, w: 380, h: 460, accent: PINK, sign: 'AIR LANE' },
  { x: 6980, y: 80, w: 360, h: 640, accent: CYAN, sign: 'NIGHT GRID' },
  { x: 7340, y: 360, w: 400, h: 360, accent: AMBER, sign: 'LAST STEP' },
  { x: 7740, y: 180, w: 360, h: 540, accent: PINK, sign: 'EXIT' },
];

const RECOVERY_LADDER_DEFS = [
  { id: 'recovery-a', x: 1210, y: 317.5, width: 48, height: 295, dismountDirection: -1 },
  { id: 'recovery-b', x: 2790, y: 445, width: 48, height: 110, dismountDirection: -1 },
  { id: 'recovery-c', x: 3820, y: 430, width: 48, height: 140, dismountDirection: -1 },
  { id: 'recovery-d', x: 5100, y: 340, width: 48, height: 320, dismountDirection: -1 },
  { id: 'recovery-e', x: 6260, y: 290, width: 48, height: 420, dismountDirection: -1 },
];

const HAZARD_DEFS = [
  { x: 460, y: 620, w: 10, h: 32, label: 'electrified-fall' },
  { x: 2040, y: 620, w: 160, h: 32, label: 'electrified-fall' },
  { x: 2380, y: 365, w: 96, h: 25, label: 'spikes' },
  { x: 3450, y: 620, w: 350, h: 32, label: 'electrified-fall' },
  { x: 4840, y: 155, w: 72, h: 25, label: 'spikes' },
  { x: 5620, y: 235, w: 96, h: 25, label: 'spikes' },
  { x: 7160, y: 55, w: 72, h: 25, label: 'spikes' },
];

export default class CyberpunkParkourScene extends Phaser.Scene {
  constructor() {
    super('CyberpunkParkour');
  }

  preload() {
    queueWorldAsset(this.load, 'backdrop-cyberpunk');
  }

  create(data = {}) {
    this.scene.stop('Hud');
    this.state = createParkourState();
    this.finished = false;
    this.transitioningToNextArea = false;
    this.climbing = false;
    this.activeLadder = null;
    this.activeLadderPlatform = null;
    this.currentRideId = null;
    this.lastRideId = null;
    this.narrativeDialogue = null;
    this.dragViews = new Map();
    this.carViews = new Map();
    this.nextAreaLoader = new WorldAssetLoader(this);
    createSaveStore().markCheckpoint('chapter-2-start');

    // Keep the camera on the authored composition while allowing high jumps
    // to travel above the visible frame without hitting an invisible ceiling.
    this.physics.world.setBounds(0, -600, PARKOUR_WIDTH, PARKOUR_HEIGHT + 600);
    this.cameras.main.setBounds(0, 0, PARKOUR_WIDTH, GAME_H);

    this.buildBackdrop();
    this.buildAtmosphere();
    this.buildPlatforms();
    this.buildHazards();
    this.buildRangeGuides();
    this.buildMovables();
    this.buildRecoveryLadders();
    this.buildFlyingCars();
    this.buildMidpointCheckpoint();
    this.buildGoal();
    this.buildMagicStone();
    this.buildNarrativeWorld();
    this.buildHud();
    this.buildNarrativePanel();

    this.player = new Player(this, 70, 490, LANE_NEAR);
    this.player.clearTint().setTint(0xd7eaff).setDepth(50);
    this.player.body.setMaxVelocity(300, 1500);

    // Roof and wall collision stays live while climbing. A ladder sits outside
    // its building, so the player can traverse the visible ladder width while
    // the attached wall still prevents an invalid sideways clip.
    this.platformCollider = this.physics.add.collider(this.player, this.fixedSolids);
    this.physics.add.collider(this.player, this.blockGroup);
    this.physics.add.collider(this.player, this.carGroup);
    this.physics.add.overlap(this.player, this.hazardGroup, (_player, hazard) => {
      this.failAndReset(hazard.failureLabel ?? 'hazard');
    });
    this.physics.add.overlap(this.player, this.checkpointZone, () => this.tryActivateCheckpoint());
    this.physics.add.overlap(this.player, this.goalZone, () => this.tryCompleteGoal());
    this.physics.add.overlap(this.player, this.magicStoneZone, () => this.collectGridStone());

    this.cameras.main.startFollow(this.player, true, 0.1, 0.12);
    this.cameras.main.setDeadzone(250, 130);
    this.cameras.main.setFollowOffset(-90, 40);

    this.setupInput();
    this.setupDragInput();
    if (data.checkpoint === 'midpoint') this.seedMidpointCheckpoint();
    this.setupQAState();
    music.play('chapter-two-neon-safety-test', {
      src: 'assets/music/ch1/1.3_neon_safety_test.mp3',
      volume: 0.45,
      fade: 3.5,
      loop: true,
    });
    this.game.events.emit('cyberpunk:entered');

    this.events.once('shutdown', () => {
      this.input.off('pointermove', this.onPointerMove, this);
      this.input.off('pointerup', this.onPointerUp, this);
      this.narrativeTypeTimer?.remove(false);
      this.nextAreaLoader?.destroy();
      music.stop({ fade: 1.8 });
    });
  }

  buildBackdrop() {
    this.add.rectangle(0, 0, PARKOUR_WIDTH, GAME_H, 0x02030a).setOrigin(0).setScrollFactor(0);
    const asset = getWorldAsset('backdrop-cyberpunk');
    const scale = 720 / asset.sourceHeight;
    this.backdropChunks = asset.chunks.map((chunk) => this.add
      .image(chunk.x * scale, -44, chunk.textureKey)
      .setOrigin(0)
      .setScale(scale)
      .setScrollFactor(0.48, 0)
      .setTint(0x7082a0)
      .setDepth(1));
    this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x060713, 0.22)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(2);
  }

  buildAtmosphere() {
    this.neonHaze = this.add
      .tileSprite(0, 250, GAME_W, 350, 'fog')
      .setOrigin(0)
      .setScrollFactor(0)
      .setTint(PINK)
      .setAlpha(0.12)
      .setDepth(3);
    this.add.particles(0, 0, 'mote', {
      x: { min: 0, max: GAME_W },
      y: { min: 0, max: GAME_H },
      lifespan: { min: 1700, max: 3600 },
      speedY: { min: 35, max: 90 },
      speedX: { min: -8, max: 8 },
      tint: [CYAN, PINK],
      alpha: { start: 0.32, end: 0 },
      scale: { min: 0.2, max: 0.65 },
      frequency: 100,
    }).setScrollFactor(0).setDepth(60);
  }

  buildPlatforms() {
    this.fixedSolids = this.physics.add.staticGroup();
    PLATFORM_DEFS.forEach((def, index) => {
      const body = this.add.rectangle(def.x, def.y, def.w, def.h, DEEP_STEEL, 0.92)
        .setOrigin(0)
        .setDepth(20);
      body.setStrokeStyle(2, def.accent, 0.45);
      this.fixedSolids.add(body);
      body.body.updateFromGameObject();
      body.setData('parkourPlatform', def);

      this.buildBuildingFacade(def, index);
      const cap = this.add.rectangle(def.x, def.y, def.w, 10, VIOLET_STEEL, 1)
        .setOrigin(0).setDepth(25).setStrokeStyle(2, PINK, 0.9);
      for (let x = def.x + 5; x < def.x + def.w - 5; x += 24) {
        this.add.rectangle(x, def.y + 3, 17, 7, 0x32162f, 1)
          .setOrigin(0).setDepth(26).setStrokeStyle(1, 0x9b3d86, 0.65);
      }
      cap.setData('platform', true);
    });

    this.buildRooftopProps();
  }

  buildBuildingFacade(def, index) {
    const insetX = def.x + 14;
    const insetY = def.y + 22;
    const insetW = def.w - 28;
    const insetH = Math.max(80, def.h - 34);
    this.add.rectangle(insetX, insetY, insetW, insetH, STEEL, 0.58)
      .setOrigin(0).setDepth(21).setStrokeStyle(1, 0x392041, 0.8);

    const bayWidth = 74;
    for (let x = insetX + 8, bay = 0; x < insetX + insetW - 18; x += bayWidth, bay += 1) {
      const width = Math.min(58, insetX + insetW - x - 6);
      this.add.rectangle(x, insetY + 10, width, insetH - 20, 0x090c16, 0.68)
        .setOrigin(0).setDepth(22).setStrokeStyle(1, 0x302039, 0.72);
      for (let y = insetY + 24, row = 0; y < insetY + insetH - 26; y += 46, row += 1) {
        const lit = (bay + row + index) % 3 === 0;
        const windowColor = lit ? def.accent : 0x27384d;
        this.add.rectangle(x + 9, y, Math.max(12, width - 18), 9, windowColor, lit ? 0.48 : 0.28)
          .setOrigin(0).setDepth(23).setStrokeStyle(1, windowColor, lit ? 0.8 : 0.35);
      }
      this.add.rectangle(x + width - 5, insetY + 12, 2, insetH - 24, def.accent, 0.11)
        .setOrigin(0).setDepth(23);
    }

    const doorW = Math.min(54, Math.max(38, def.w * 0.12));
    this.add.rectangle(def.x + def.w - doorW - 22, 636, doorW, 84, 0x090b13, 0.96)
      .setOrigin(0).setDepth(24).setStrokeStyle(2, 0x70506f, 0.55);
    this.add.rectangle(def.x + def.w - 33, 675, 4, 4, AMBER, 0.9).setDepth(25);

    const signY = Math.min(def.y + 88, 520);
    this.addNeonSign(def.x + Math.min(def.w - 72, 76 + (index % 2) * 36), signY, def.sign, def.accent);
    this.add.rectangle(def.x + 18, def.y + 18, 3, Math.max(42, def.h - 54), def.accent, 0.22)
      .setOrigin(0).setDepth(24);
  }

  buildRooftopProps() {
    // Small silhouette props break up the roofline like the reference city.
    [
      { x: 390, y: 508, w: 48, h: 32 },
      { x: 1800, y: 193, w: 48, h: 32 },
      { x: 2490, y: 358, w: 62, h: 32 },
      { x: 2850, y: 188, w: 54, h: 32 },
      { x: 4050, y: 268, w: 48, h: 32 },
      { x: 4380, y: 328, w: 52, h: 32 },
      { x: 5710, y: 228, w: 54, h: 32 },
      { x: 6060, y: 48, w: 58, h: 32 },
      { x: 6750, y: 228, w: 52, h: 32 },
      { x: 7500, y: 328, w: 58, h: 32 },
    ].forEach((prop, index) => {
      this.add.rectangle(prop.x, prop.y, prop.w, prop.h, 0x100d19, 1)
        .setOrigin(0).setDepth(27).setStrokeStyle(2, index % 2 ? CYAN : PINK, 0.45);
      this.add.line(prop.x + 5, prop.y + 5, 0, 0, prop.w - 10, prop.h - 10, PINK, 0.35)
        .setOrigin(0).setDepth(28);
      this.add.line(prop.x + prop.w - 5, prop.y + 5, 0, 0, -prop.w + 10, prop.h - 10, CYAN, 0.3)
        .setOrigin(0).setDepth(28);
    });

    [
      { x: 500, y: 350 },
      { x: 1650, y: 210 },
      { x: 3180, y: 160 },
      { x: 4190, y: 120 },
      { x: 4750, y: 180 },
      { x: 5910, y: 80 },
      { x: 7010, y: 80 },
      { x: 7765, y: 180 },
    ].forEach(({ x, y }) => {
      for (let railX = x; railX < x + 94; railX += 30) {
        this.add.rectangle(railX, y - 27, 3, 27, 0x925b8c, 0.72).setOrigin(0).setDepth(24);
      }
      this.add.rectangle(x, y - 27, 94, 3, PINK, 0.5).setOrigin(0).setDepth(24);
    });
  }

  addNeonSign(x, y, text, color) {
    const width = Math.max(72, text.length * 9 + 24);
    this.add.rectangle(x, y, width, 34, 0x050813, 0.92)
      .setDepth(23)
      .setStrokeStyle(1, color, 0.8);
    this.add.text(x, y, text, {
      fontFamily: MONO,
      fontSize: '11px',
      color: color === CYAN ? '#25e6ff' : '#ff3aae',
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(24);
  }

  buildHazards() {
    this.hazardGroup = this.physics.add.staticGroup();
    HAZARD_DEFS.forEach((def) => {
      const zone = this.add.zone(def.x, def.y, def.w, def.h).setOrigin(0);
      this.hazardGroup.add(zone);
      zone.body.updateFromGameObject();
      zone.failureLabel = def.label;
      this.add.rectangle(def.x, def.y + 20, def.w, 8, 0x320821, 0.75)
        .setOrigin(0).setDepth(17).setStrokeStyle(1, PINK, 0.45);
      for (let x = def.x; x < def.x + def.w; x += 24) {
        const spike = this.add.triangle(x, def.y, 0, 20, 12, 0, 24, 20, PINK, 0.85)
          .setOrigin(0)
          .setDepth(18);
        spike.setStrokeStyle(1, 0xff87d0, 0.75);
      }
    });
  }

  buildRangeGuides() {
    const graphics = this.add.graphics().setDepth(19);
    this.state.movables.forEach((movable) => {
      const y = movable.kind === 'ladder' ? movable.y + movable.height / 2 + 14 : movable.y + 48;
      graphics.lineStyle(1, AMBER, 0.52);
      const span = movable.maxX - movable.minX;
      for (let offset = 0; offset < span; offset += 24) {
        graphics.lineBetween(movable.minX + offset, y, Math.min(movable.maxX, movable.minX + offset + 12), y);
      }
      graphics.fillStyle(AMBER, 0.75);
      graphics.fillTriangle(movable.minX, y, movable.minX + 9, y - 5, movable.minX + 9, y + 5);
      graphics.fillTriangle(movable.maxX, y, movable.maxX - 9, y - 5, movable.maxX - 9, y + 5);
    });
  }

  buildMovables() {
    this.blockGroup = this.physics.add.staticGroup();
    this.state.movables.forEach((movable) => {
      const view = movable.kind === 'ladder'
        ? this.createLadderView(movable)
        : this.createBlockView(movable);
      this.dragViews.set(movable.id, view);
    });
  }

  buildRecoveryLadders() {
    this.recoveryLadders = RECOVERY_LADDER_DEFS.map((ladder) => {
      const container = this.add.container(ladder.x, ladder.y).setDepth(30);
      const pieces = [
        this.add.rectangle(-17, 0, 6, ladder.height, 0x8d671c, 1).setStrokeStyle(1, 0xffdc62, 0.75),
        this.add.rectangle(17, 0, 6, ladder.height, 0x8d671c, 1).setStrokeStyle(1, 0xffdc62, 0.75),
      ];
      for (let y = -ladder.height / 2 + 18; y < ladder.height / 2 - 8; y += 22) {
        pieces.push(this.add.rectangle(0, y, 36, 5, 0xb48220, 1));
      }
      container.add(pieces);
      this.add.text(ladder.x, ladder.y + ladder.height / 2 + 13, 'RETURN', {
        fontFamily: MONO,
        fontSize: '8px',
        color: '#ffcf4a',
        backgroundColor: '#070912cc',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 0).setDepth(31);
      return { ...ladder, fixedRecovery: true };
    });
  }

  createLadderView(movable) {
    const container = this.add.container(movable.x, movable.y).setDepth(30);
    const pieces = [];
    const shadow = this.add.rectangle(0, 2, movable.width + 16, movable.height + 12, 0x03050a, 0.62)
      .setStrokeStyle(1, AMBER, 0.45);
    const railLeft = this.add.rectangle(-17, 0, 6, movable.height, 0xd88b10, 1)
      .setStrokeStyle(1, 0xffdc62, 0.9);
    const railRight = this.add.rectangle(17, 0, 6, movable.height, 0xd88b10, 1)
      .setStrokeStyle(1, 0xffdc62, 0.9);
    pieces.push(shadow);
    pieces.push(railLeft, railRight);
    for (let y = -movable.height / 2 + 18; y < movable.height / 2 - 8; y += 22) {
      pieces.push(this.add.rectangle(0, y, 36, 5, 0xe69a17, 1)
        .setStrokeStyle(1, 0xffd85a, 0.8));
    }
    const bracketTop = -movable.height / 2 - 9;
    const bracketBottom = movable.height / 2 + 9;
    [-29, 29].forEach((x) => {
      pieces.push(this.add.rectangle(x, 0, 2, movable.height + 20, AMBER, 0.42));
      pieces.push(this.add.rectangle(x > 0 ? x - 7 : x + 7, bracketTop, 16, 2, AMBER, 0.75));
      pieces.push(this.add.rectangle(x > 0 ? x - 7 : x + 7, bracketBottom, 16, 2, AMBER, 0.75));
    });
    container.add(pieces);
    const zone = this.add.zone(movable.x, movable.y, movable.width + 26, movable.height + 16)
      .setInteractive({ useHandCursor: true })
      .setDepth(31);
    zone.on('pointerdown', (pointer) => {
      this.lastPointerEvent = { id: movable.id, worldX: Math.round(pointer.worldX), worldY: Math.round(pointer.worldY) };
      this.startPointerDrag(movable.id, pointer);
    });
    return { kind: 'ladder', container, zone, pieces };
  }

  createBlockView(movable) {
    const container = this.add.container(movable.x, movable.y).setDepth(32);
    const box = this.add.rectangle(0, 0, movable.width, movable.height, 0x07131d, 1)
      .setStrokeStyle(3, CYAN, 1);
    const inner = this.add.rectangle(0, 0, movable.width - 12, movable.height - 12, 0x0b3f51, 0.82)
      .setStrokeStyle(1, 0x8cf8ff, 0.78);
    const core = this.add.rectangle(0, 0, movable.width - 28, movable.height - 28, 0x082630, 0.92)
      .setStrokeStyle(1, CYAN, 0.72);
    const arrow = this.add.text(0, 0, '⇧', {
      fontFamily: MONO,
      fontSize: '25px',
      color: '#8cf8ff',
    }).setOrigin(0.5);
    const corners = [
      [-movable.width / 2 + 5, -movable.height / 2 + 5],
      [movable.width / 2 - 5, -movable.height / 2 + 5],
      [-movable.width / 2 + 5, movable.height / 2 - 5],
      [movable.width / 2 - 5, movable.height / 2 - 5],
    ].map(([x, y]) => this.add.rectangle(x, y, 7, 7, 0x8cf8ff, 0.9));
    container.add([box, inner, core, arrow, ...corners]);
    const collider = this.add.rectangle(movable.x, movable.y, movable.width, movable.height, 0xffffff, 0)
      .setDepth(29);
    this.blockGroup.add(collider);
    collider.body.updateFromGameObject();
    const zone = this.add.zone(movable.x, movable.y, movable.width + 22, movable.height + 22)
      .setInteractive({ useHandCursor: true })
      .setDepth(33);
    zone.on('pointerdown', (pointer) => {
      this.lastPointerEvent = { id: movable.id, worldX: Math.round(pointer.worldX), worldY: Math.round(pointer.worldY) };
      this.startPointerDrag(movable.id, pointer);
    });
    return { kind: 'block', container, zone, pieces: [box, inner, core, arrow, ...corners], collider };
  }

  buildFlyingCars() {
    this.ensureFlyingCarTexture();
    this.carGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.state.flyingCars.forEach((car) => {
      const sprite = this.carGroup.create(car.x, car.y, 'cyber-flying-car')
        .setDepth(35)
        .setImmovable(true)
        .setPushable(false);
      sprite.body.setAllowGravity(false).setSize(car.width - 8, 18).setOffset(4, 0);
      sprite.parkourId = car.id;
      this.carViews.set(car.id, sprite);
      this.add.rectangle(car.minX, car.y - 28, car.maxX - car.minX, 2, PINK, 0.52)
        .setOrigin(0, 0.5).setDepth(18);
      this.add.text((car.minX + car.maxX) / 2, car.y - 42, '←                         →', {
        fontFamily: MONO,
        fontSize: '13px',
        color: '#ff61bb',
        letterSpacing: 1,
      }).setOrigin(0.5).setDepth(19);
    });
  }

  ensureFlyingCarTexture() {
    if (this.textures.exists('cyber-flying-car')) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(PINK, 0.28);
    g.fillEllipse(66, 28, 118, 9);
    g.fillStyle(0x120916, 1);
    g.fillRoundedRect(7, 8, 118, 18, 7);
    g.fillStyle(0x6a1f58, 1);
    g.fillRoundedRect(29, 1, 61, 18, 8);
    g.fillStyle(0x153d55, 1);
    g.fillRect(38, 4, 42, 8);
    g.fillStyle(CYAN, 0.82);
    g.fillRect(40, 5, 17, 6);
    g.fillStyle(0x68305c, 1);
    g.fillRect(60, 5, 18, 6);
    g.lineStyle(2, PINK, 1);
    g.strokeRoundedRect(7, 8, 118, 18, 7);
    g.lineStyle(1, 0xff8bd4, 0.9);
    g.lineBetween(17, 15, 112, 15);
    g.fillStyle(PINK, 1);
    g.fillTriangle(0, 20, 18, 16, 18, 24);
    g.fillTriangle(132, 20, 114, 16, 114, 24);
    g.fillStyle(0x25e6ff, 0.95);
    g.fillEllipse(31, 27, 22, 5);
    g.fillEllipse(101, 27, 22, 5);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(116, 13, 7, 4);
    g.generateTexture('cyber-flying-car', 132, 32);
    g.destroy();
  }

  buildGate(x, roofY, label, labelColor) {
    const doorY = roofY - 58;
    const railY = roofY - 95;
    this.add.rectangle(x, doorY, 88, 118, 0x090712, 1)
      .setDepth(26)
      .setStrokeStyle(3, PINK, 1);
    this.add.rectangle(x, doorY + 3, 52, 92, 0x471059, 0.72)
      .setDepth(27)
      .setStrokeStyle(2, 0xc571ff, 0.9);
    this.add.rectangle(x, doorY + 3, 15, 84, 0xc53cff, 0.25).setDepth(28);
    this.add.circle(x + 17, doorY + 5, 3, CYAN, 0.95).setDepth(29);
    this.add.rectangle(x - 67, railY, 134, 2, PINK, 0.55).setDepth(27);
    [x - 65, x - 32, x + 1, x + 34, x + 67].forEach((railX) => {
      this.add.rectangle(railX, railY, 2, 37, 0x9a478d, 0.68).setOrigin(0.5, 0).setDepth(27);
    });
    this.add.text(x, roofY + 51, label, {
      fontFamily: MONO,
      fontSize: '12px',
      color: labelColor,
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(28);
  }

  buildMidpointCheckpoint() {
    this.buildGate(MIDPOINT_X, MIDPOINT_ROOF_Y, 'CHECKPOINT  //  ROUTE CONTINUES', '#25e6ff');
    this.checkpointZone = this.add.zone(MIDPOINT_X, MIDPOINT_ROOF_Y - 39, 96, 128);
    this.physics.add.existing(this.checkpointZone, true);
  }

  buildGoal() {
    this.buildGate(FINAL_GOAL_X, FINAL_GOAL_ROOF_Y, 'GOAL  //  FINAL BALCONY', '#45ff65');
    this.goalZone = this.add.zone(FINAL_GOAL_X, FINAL_GOAL_ROOF_Y - 39, 96, 128);
    this.physics.add.existing(this.goalZone, true);
  }

  buildMagicStone() {
    const alreadyCollected = magicStoneSnapshot().collected.includes('chapter-2');
    const glow = this.add.circle(0, 0, 28, CYAN, 0.12);
    const gem = this.add.graphics();
    gem.fillStyle(0x8cf8ff, 1);
    gem.lineStyle(2, 0xf4ffff, 0.95);
    gem.beginPath();
    gem.moveTo(0, -20);
    gem.lineTo(14, -6);
    gem.lineTo(9, 15);
    gem.lineTo(0, 23);
    gem.lineTo(-9, 15);
    gem.lineTo(-14, -6);
    gem.closePath();
    gem.fillPath();
    gem.strokePath();
    gem.lineStyle(1, PINK, 0.7);
    gem.lineBetween(0, -20, 0, 23);
    gem.lineBetween(-14, -6, 14, -6);
    this.magicStoneView = this.add.container(GRID_STONE.x, GRID_STONE.y, [glow, gem])
      .setDepth(37)
      .setVisible(!alreadyCollected);
    this.magicStoneZone = this.add.zone(GRID_STONE.x, GRID_STONE.y, 46, 58);
    this.physics.add.existing(this.magicStoneZone, true);
    this.magicStoneZone.body.enable = !alreadyCollected;
    this.gridStoneCollected = alreadyCollected;
  }

  collectGridStone() {
    if (this.gridStoneCollected) return;
    collectMagicStone('chapter-2');
    this.gridStoneCollected = true;
    this.magicStoneZone.body.enable = false;
    this.magicStoneView.setVisible(false);
    const snapshot = magicStoneSnapshot();
    this.showFeedback(`GRID STONE FOUND  //  ${snapshot.count} / ${snapshot.total}`, '#8cf8ff');
    this.cameras.main.flash(260, 67, 233, 255);
  }

  buildNarrativeWorld() {
    const npc = this.add.container(STORY_NPC_X, STORY_NPC_GROUND_Y).setDepth(45).setScale(1.08);
    // A clean human silhouette built from broad shapes that remain readable at
    // gameplay scale. The continuous visor, temple port, chest light and limb
    // seams reveal the mechanic's synthetic construction without visual noise.
    const shadow = this.add.ellipse(0, 0, 34, 7, 0x03060a, 0.65);
    const backLeg = this.add.rectangle(-7, -9, 9, 20, 0x2b3b45, 1)
      .setStrokeStyle(1, 0x82949e, 0.85);
    const frontLeg = this.add.rectangle(7, -9, 9, 20, 0x354852, 1)
      .setStrokeStyle(1, 0x9aabb4, 0.85);
    const backBoot = this.add.rectangle(-9, -1, 14, 5, 0x101920, 1);
    const frontBoot = this.add.rectangle(9, -1, 14, 5, 0x142029, 1);
    const backArm = this.add.rectangle(-18, -33, 8, 31, 0x40545f, 1)
      .setStrokeStyle(1, 0x8fa2ad, 0.8);
    const frontArm = this.add.rectangle(18, -33, 8, 31, 0x4a606b, 1)
      .setStrokeStyle(1, 0xa4b5bd, 0.8);
    const backHand = this.add.circle(-18, -16, 4, 0x75868d, 1)
      .setStrokeStyle(1, CYAN, 0.7);
    const frontHand = this.add.circle(18, -16, 4, 0x87979d, 1)
      .setStrokeStyle(1, CYAN, 0.7);
    const shoulders = this.add.rectangle(0, -47, 34, 10, 0x526875, 1)
      .setStrokeStyle(1.5, 0xa8bac3, 0.95);
    const coat = this.add.rectangle(0, -32, 28, 34, 0x526875, 1)
      .setStrokeStyle(1.5, 0xa8bac3, 0.95);
    const waist = this.add.rectangle(0, -16, 30, 6, 0x31444f, 1)
      .setStrokeStyle(1, 0x8fa4ae, 0.8);
    const coatPanel = this.add.rectangle(0, -32, 1.5, 27, 0x1b2a33, 0.95);
    const collar = this.add.rectangle(0, -48, 18, 5, 0x17232b, 1);
    const neck = this.add.rectangle(0, -53, 9, 8, 0x78868a, 1)
      .setStrokeStyle(1, 0xa7b2b4, 0.8);
    const head = this.add.ellipse(0, -67, 25, 28, 0xb5aaa0, 1)
      .setStrokeStyle(1.5, 0xd2d0c9, 0.95);
    const hairCap = this.add.ellipse(0, -78, 23, 11, 0x17232b, 1);
    const hairFringe = this.add.rectangle(-7, -74, 8, 7, 0x17232b, 1);
    const visor = this.add.rectangle(0, -68, 15, 3, 0x07151c, 1)
      .setStrokeStyle(1, CYAN, 1);
    const faceSeam = this.add.rectangle(0, -60, 12, 1, 0x60757d, 0.8);
    const templePort = this.add.circle(12, -66, 2.5, 0x10212a, 1).setStrokeStyle(1, CYAN, 1);
    const chestLight = this.add.rectangle(6, -37, 6, 6, 0x07131d, 1)
      .setStrokeStyle(1, CYAN, 1);
    npc.add([
      shadow, backLeg, frontLeg, backBoot, frontBoot, backArm, frontArm,
      backHand, frontHand, shoulders, coat, waist, coatPanel, collar, neck,
      head, hairCap, hairFringe, visor, faceSeam, templePort, chestLight,
    ]);
    this.add.text(STORY_NPC_X, STORY_NPC_GROUND_Y - 91, 'E  TALK', {
      fontFamily: MONO,
      fontSize: '12px',
      color: '#edf1f4',
      backgroundColor: '#05070ce8',
      padding: { x: 7, y: 4 },
    }).setOrigin(0.5).setDepth(46);

    const letter = this.add.container(MARA_LETTER_X, MARA_LETTER_Y).setDepth(45);
    const page = this.add.rectangle(0, 0, 34, 25, 0xd8d1bc, 1)
      .setStrokeStyle(2, 0x75d4cd, 0.9).setAngle(-5);
    const fold = this.add.triangle(9, -7, 0, 0, 8, 0, 8, 7, 0x879da0, 0.9).setAngle(-5);
    const thread = this.add.rectangle(-3, 1, 25, 2, CYAN, 0.8).setAngle(-5);
    letter.add([page, fold, thread]);
    this.add.text(MARA_LETTER_X, MARA_LETTER_Y - 38, 'E  READ LETTER', {
      fontFamily: MONO,
      fontSize: '12px',
      color: '#edf1f4',
      backgroundColor: '#05070ce8',
      padding: { x: 7, y: 4 },
    }).setOrigin(0.5).setDepth(46);
  }

  buildHud() {
    this.add.text(22, 18, 'CHAPTER TWO  //  CYBERPUNK PARKOUR', {
      fontFamily: MONO,
      fontSize: '15px',
      color: '#72efff',
      letterSpacing: 2,
      backgroundColor: '#03050bf2',
      padding: { x: 11, y: 8 },
    }).setScrollFactor(0).setDepth(100);
    this.objectiveText = this.add.text(GAME_W - 22, 18, 'REACH THE FINAL BALCONY', {
      fontFamily: MONO,
      fontSize: '14px',
      color: '#78ff8d',
      backgroundColor: '#03050bf2',
      padding: { x: 11, y: 8 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.controlsText = this.add.text(GAME_W / 2, GAME_H - 22,
      'A / D  MOVE     SPACE  JUMP     W / S  CLIMB     E  INTERACT     CLICK + DRAG  PLACE     R  RESET', {
        fontFamily: MONO,
        fontSize: '13px',
        color: '#d5dce3',
        backgroundColor: '#03050bf2',
        padding: { x: 15, y: 9 },
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100);
    this.feedbackText = this.add.text(GAME_W / 2, 74, '', {
      fontFamily: MONO,
      fontSize: '15px',
      color: '#edf1f4',
      backgroundColor: '#05050cf2',
      padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);
  }

  buildNarrativePanel() {
    this.narrativePanel = this.add.rectangle(28, 34, 720, 178, 0x05070c, 0.96)
      .setOrigin(0).setScrollFactor(0).setDepth(200).setVisible(false)
      .setStrokeStyle(1, 0x687481, 0.95);
    this.narrativeSpeaker = this.add.text(48, 50, '', {
      fontFamily: MONO, fontSize: '16px', color: '#e8edf1', letterSpacing: 2,
    }).setScrollFactor(0).setDepth(201).setVisible(false);
    this.narrativeRole = this.add.text(48, 76, '', {
      fontFamily: MONO, fontSize: '12px', color: '#a6b1bc', letterSpacing: 1,
    }).setScrollFactor(0).setDepth(201).setVisible(false);
    this.narrativeText = this.add.text(48, 101, '', {
      fontFamily: MONO,
      fontSize: '17px',
      color: '#edf1f4',
      lineSpacing: 6,
      wordWrap: { width: 670 },
    }).setScrollFactor(0).setDepth(201).setVisible(false);
    this.narrativeHint = this.add.text(728, 187, '', {
      fontFamily: MONO, fontSize: '12px', color: '#b0bbc5',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(201).setVisible(false);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D',
      up: 'UP', down: 'DOWN', w: 'W', s: 'S',
      jump: 'SPACE', restart: 'R',
      interact: 'E',
    });
    this.input.keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
  }

  // Player owns the shared protagonist animation/feel code. Chapter One is a
  // single-plane space, so lane changes are disabled, but resetTo still uses
  // this hook to keep the registry and diagnostics coherent.
  onLaneChanged(lane) {
    this.registry.set('lane', lane);
  }

  setupDragInput() {
    this.onPointerMove = (pointer) => {
      if (!this.state.activeDragId) return;
      const result = previewDrag(this.state, pointer.worldX);
      if (!result) return;
      const movable = movableById(this.state, this.state.activeDragId);
      this.syncMovableView(movable, result.legal ? GREEN : RED);
    };
    this.onPointerUp = () => {
      if (!this.state.activeDragId) return;
      const result = finishDrag(this.state, true);
      const movable = movableById(this.state, result.id);
      this.syncMovableView(movable);
      this.setMovableCollision(movable, true);
      this.showFeedback(result.accepted ? 'PLACEMENT LOCKED' : 'OUTSIDE PLACEMENT RAIL', result.accepted ? '#45ff65' : '#ff435f');
    };
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
  }

  startPointerDrag(id, pointer) {
    if (this.finished || this.climbing) return;
    const movable = movableById(this.state, id);
    const playerTooClose = Math.abs(this.player.x - movable.x) < movable.width + 24
      && Math.abs(this.player.y - movable.y) < movable.height / 2 + 45;
    if (playerTooClose) {
      this.showFeedback('STEP CLEAR BEFORE MOVING', '#ffbf26');
      return;
    }
    if (!beginDrag(this.state, id)) return;
    this.setMovableCollision(movable, false);
    previewDrag(this.state, pointer.worldX);
    this.syncMovableView(movable, GREEN);
  }

  setMovableCollision(movable, enabled) {
    const view = this.dragViews.get(movable.id);
    if (!view?.collider?.body) return;
    view.collider.body.enable = enabled;
    // Dragging disables the static body so the player cannot collide with an
    // invisible copy while the preview moves. On commit, the view has already
    // reached its new x-position; refresh only after re-enabling so Arcade
    // removes the old body from its static tree and inserts the new bounds.
    if (enabled) view.collider.body.updateFromGameObject();
  }

  syncMovableView(movable, tint = null) {
    const view = this.dragViews.get(movable.id);
    if (!view) return;
    view.container.x = movable.x;
    view.zone.x = movable.x;
    view.pieces.forEach((piece) => {
      if (tint !== null && piece.setTintFill) piece.setTintFill(tint);
      else if (piece.clearTint) piece.clearTint();
    });
    if (view.collider) {
      view.collider.x = movable.x;
      if (view.collider.body?.enable) view.collider.body.updateFromGameObject();
    }
  }

  update(_time, delta) {
    this.neonHaze.tilePositionX += delta * 0.012;
    if (this.magicStoneView?.visible) {
      const pulse = 1 + Math.sin(this.time.now * 0.005) * 0.08;
      this.magicStoneView.setScale(pulse).setAngle(Math.sin(this.time.now * 0.0025) * 4);
    }
    if (this.narrativeDialogue) {
      this.updateNarrativeDialogueInput();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact) && this.tryOpenNearbyNarrative()) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.resetParkour('manual');
      return;
    }
    if (this.finished) return;

    const carSteps = stepFlyingCars(this.state, delta);
    this.updateFlyingCars(carSteps);
    if (!this.state.activeDragId && !this.state.resetting) this.updatePlayer(delta);
    else {
      this.player.setAccelerationX(0);
      this.player.setVelocityX(0);
    }
    this.checkRide();
    if (this.player.y > 665) this.failAndReset('fall');
  }

  tryOpenNearbyNarrative() {
    if (this.finished || this.state.activeDragId || this.climbing) return false;
    const nearNpc = Math.abs(this.player.x - STORY_NPC_X) <= 72
      && Math.abs(this.player.y - (STORY_NPC_GROUND_Y - 45)) <= 90;
    const nearLetter = Math.abs(this.player.x - MARA_LETTER_X) <= 72
      && Math.abs(this.player.y - MARA_LETTER_Y) <= 80;
    if (nearNpc) this.openNarrativeDialogue('npc');
    else if (nearLetter) this.openNarrativeDialogue('letter');
    else return false;
    return true;
  }

  openNarrativeDialogue(kind) {
    const script = PARKOUR_STORY[kind];
    if (!script) return;
    recordNarrativeInteraction(this.state, kind);
    this.narrativeDialogue = {
      kind,
      script,
      lineIndex: 0,
      typing: false,
      playerAnchor: { x: this.player.x, y: this.player.y },
    };
    this.player.frozen = true;
    this.player.setAcceleration(0, 0);
    this.player.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.player.body.moves = false;
    this.showNarrativeLine();
  }

  showNarrativeLine() {
    const dialogue = this.narrativeDialogue;
    if (!dialogue) return;
    this.narrativeTypeTimer?.remove(false);
    const line = dialogue.script.lines[dialogue.lineIndex];
    dialogue.typing = true;
    dialogue.typedCount = 0;
    this.narrativePanel.setVisible(true).setAlpha(0).setScale(0.98);
    this.narrativeSpeaker.setText(dialogue.script.speaker).setVisible(true);
    this.narrativeRole.setText(dialogue.script.role).setVisible(true);
    this.narrativeText.setText('').setVisible(true);
    this.narrativeHint.setText(
      dialogue.lineIndex === dialogue.script.lines.length - 1
        ? 'E  CONTINUE'
        : `${dialogue.lineIndex + 1} / ${dialogue.script.lines.length}   E`,
    ).setVisible(true);
    this.tweens.add({ targets: this.narrativePanel, alpha: 0.9, scale: 1, duration: 150, ease: 'Quad.easeOut' });
    this.narrativeTypeTimer = this.time.addEvent({
      delay: 18,
      loop: true,
      callback: () => {
        if (!this.narrativeDialogue) return;
        dialogue.typedCount += 1;
        this.narrativeText.setText(line.slice(0, dialogue.typedCount));
        if (dialogue.typedCount >= line.length) this.finishNarrativeTyping();
      },
    });
  }

  finishNarrativeTyping() {
    const dialogue = this.narrativeDialogue;
    if (!dialogue?.typing) return;
    this.narrativeTypeTimer?.remove(false);
    this.narrativeTypeTimer = null;
    dialogue.typing = false;
    this.narrativeText.setText(dialogue.script.lines[dialogue.lineIndex]);
  }

  updateNarrativeDialogueInput() {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.interact)) return;
    if (this.narrativeDialogue.typing) {
      this.finishNarrativeTyping();
      return;
    }
    if (this.narrativeDialogue.lineIndex < this.narrativeDialogue.script.lines.length - 1) {
      this.narrativeDialogue.lineIndex += 1;
      this.showNarrativeLine();
      return;
    }
    this.closeNarrativeDialogue();
  }

  closeNarrativeDialogue() {
    const anchor = this.narrativeDialogue?.playerAnchor;
    this.narrativeTypeTimer?.remove(false);
    this.narrativeTypeTimer = null;
    this.narrativePanel.setVisible(false);
    this.narrativeSpeaker.setVisible(false);
    this.narrativeRole.setVisible(false);
    this.narrativeText.setVisible(false);
    this.narrativeHint.setVisible(false);
    this.narrativeDialogue = null;
    this.player.body.moves = true;
    this.player.body.setAllowGravity(true);
    this.player.body.setGravityY(0);
    if (anchor) this.player.body.reset(anchor.x, anchor.y);
    this.player.frozen = false;
  }

  updatePlayer(delta) {
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    const up = this.keys.up.isDown || this.keys.w.isDown;
    const down = this.keys.down.isDown || this.keys.s.isDown;
    const ladder = this.nearbyLadder();
    if (!this.climbing && ladder && (up || down)) {
      this.climbing = true;
      this.activeLadder = ladder;
      this.activeLadderPlatform = this.findLadderPlatform(ladder);
    }
    // Remaining on a ladder is based on the player's whole physics body, not
    // a single lateral key press or their centre point. The player may shift
    // freely across its visible width and releases only after the last edge of
    // their body clears the ladder artwork.
    if (this.climbing && !this.playerOverlapsLadder(this.activeLadder)) {
      this.stopClimbing();
    }

    if (this.climbing && this.activeLadder) {
      const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.jump);
      const activeLadder = this.activeLadder;
      const platform = this.activeLadderPlatform;
      const roofY = platform?.body?.top
        ?? activeLadder.y - activeLadder.height / 2;
      const distanceToTop = this.player.body.bottom - roofY;
      const canDismount = distanceToTop <= 0.5;
      // At a ladder's roof line, Space uses the authored safe exit direction.
      // This gives players a clear, forgiving way to continue when they reach
      // the top with the usual jump control instead of needing to discover a
      // lateral A/D dismount.
      const requestedDirection = left === right ? 0 : left ? -1 : 1;
      const safeDirection = activeLadder.dismountDirection ?? -1;
      const dismountDirection = requestedDirection || (canDismount && jumpPressed ? safeDirection : 0);
      const horizontalVelocity = dismountDirection * 120;
      if (canDismount && horizontalVelocity !== 0) {
        // Keep the player's feet on the roof line during the short lateral
        // transfer. Ladder attachment ends only after the full character body
        // leaves the visible ladder, at which point the roof collider resumes.
        const verticalCorrection = roofY - this.player.body.bottom;
        this.player.body.position.y += verticalCorrection;
        this.player.body.prev.y += verticalCorrection;
        this.player.body.updateCenter();
        this.player.body.setGravityY(-GRAVITY);
        this.player.setAcceleration(0, 0);
        this.player.setVelocity(horizontalVelocity, 0);
        this.player.updateVisualAnimation(false);
        this.player.applyScale();
        return;
      }
      // The visible ladder ends at the roof. Stop upward travel as soon as the
      // player's feet reach that line; W may remain held while the player
      // chooses a dismount direction, but it can no longer lift them into the
      // sky above the ladder.
      const frameSeconds = Math.max(1, delta) / 1000;
      const upwardSpeed = Math.min(145, Math.max(0, distanceToTop) / frameSeconds);
      const velocityY = down ? 145 : up && !canDismount ? -upwardSpeed : 0;
      this.player.body.setGravityY(-GRAVITY);
      this.player.setAcceleration(0, 0);
      this.player.setVelocity(horizontalVelocity, velocityY);
      const bottom = activeLadder.y + activeLadder.height / 2;
      // Ladder tops do not snap the player to an authored position. Horizontal
      // input remains live, so the player steps naturally onto either roof.
      if (this.player.y >= bottom + 12) {
        this.stopClimbing();
      }
      this.player.updateVisualAnimation(false);
      this.player.applyScale();
      return;
    }

    this.player.body.moves = true;
    this.player.body.setGravityY(0);
    if (this.currentRideId) {
      // A confirmed flying car is real ground for movement feel and jump
      // buffering. Arcade touching flags can flicker when a kinematic body is
      // translated manually, so provide the same support explicitly until an
      // upward launch releases the ride in checkRide().
      this.player.body.touching.down = true;
      this.player.coyote = MOVE.coyoteMs;
    }
    this.player.update(delta, {
      left,
      right,
      laneBack: false,
      laneFront: false,
      run: false,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.keys.jump),
      jumpHeld: this.keys.jump.isDown,
      attackPressed: false,
    });
  }

  nearbyLadder() {
    const ladders = [
      ...this.state.movables.filter((movable) => movable.kind === 'ladder'),
      ...(this.recoveryLadders ?? []),
    ];
    const halfPlayerHeight = (this.player.body?.height ?? 46) / 2;
    return ladders.find((movable) => {
      const ladderTop = movable.y - movable.height / 2;
      return this.playerOverlapsLadder(movable)
        // Only the player's own height extends beyond the visible ladder: the
        // centre may rise until their feet meet its top, plus a small tolerance
        // for a single physics step and continuous sideways dismounting.
        && this.player.y >= ladderTop - halfPlayerHeight - 8
        && this.player.y <= movable.y + movable.height / 2 + 28;
    }) ?? null;
  }

  playerOverlapsLadder(ladder) {
    if (!ladder || !this.player?.body) return false;
    const ladderLeft = ladder.x - ladder.width / 2;
    const ladderRight = ladder.x + ladder.width / 2;
    return this.player.body.right > ladderLeft && this.player.body.left < ladderRight;
  }

  findLadderPlatform(ladder) {
    const ladderTop = ladder.y - ladder.height / 2;
    let nearest = null;
    let nearestEdgeDistance = Infinity;
    this.fixedSolids.children.iterate((platform) => {
      if (!platform?.body || Math.abs(platform.body.top - ladderTop) > 8) return;
      const edgeDistance = Math.min(
        Math.abs(ladder.x - platform.body.left),
        Math.abs(ladder.x - platform.body.right),
      );
      if (edgeDistance < nearestEdgeDistance) {
        nearest = platform;
        nearestEdgeDistance = edgeDistance;
      }
    });
    return nearest;
  }

  stopClimbing() {
    this.climbing = false;
    this.activeLadder = null;
    this.activeLadderPlatform = null;
  }

  updateFlyingCars(steps) {
    steps.forEach((step) => {
      const sprite = this.carViews.get(step.id);
      if (!sprite) return;
      if (this.currentRideId === step.id) {
        // Translate both current and previous physics positions by the exact
        // platform delta. This carries the rider without manufacturing extra
        // velocity, while their own horizontal velocity remains relative to
        // the car and therefore still responds to A/D.
        this.player.body.position.x += step.deltaX;
        this.player.body.prev.x += step.deltaX;
        this.player.body.updateCenter();
      }
      sprite.body.position.x += step.deltaX;
      sprite.body.prev.x += step.deltaX;
      sprite.body.updateCenter();
    });
  }

  checkRide() {
    const priorRideId = this.currentRideId;
    if (priorRideId && this.player.body.velocity.y >= -20) {
      const priorSprite = this.carViews.get(priorRideId);
      const horizontal = this.player.body.right > priorSprite.body.left + 3
        && this.player.body.left < priorSprite.body.right - 3;
      const separation = priorSprite.body.top - this.player.body.bottom;
      if (horizontal && Math.abs(separation) <= 24) {
        // Arcade can report a 1-frame touching gap when an immovable platform
        // changes direction. Keep a confirmed rider planted without affecting
        // a player who has launched upward to jump off.
        this.player.body.position.y += separation;
        this.player.body.prev.y += separation;
        this.player.body.updateCenter();
        this.player.setVelocityY(0);
        recordCarRide(this.state, priorRideId);
        return;
      }
    }
    this.currentRideId = null;
    for (const car of this.state.flyingCars) {
      const sprite = this.carViews.get(car.id);
      const playerBottom = this.player.body.bottom;
      const carTop = sprite.body.top;
      const horizontal = this.player.body.right > sprite.body.left + 5
        && this.player.body.left < sprite.body.right - 5;
      if (horizontal && Math.abs(playerBottom - carTop) <= 14 && this.player.body.velocity.y >= -10) {
        this.currentRideId = car.id;
        this.lastRideId = car.id;
        recordCarRide(this.state, car.id);
        break;
      }
    }
  }

  failAndReset(reason) {
    if (this.state.resetting || this.finished) return;
    this.state.resetting = true;
    this.player.frozen = true;
    this.player.setVelocity(0, 0);
    this.cameras.main.flash(180, 255, 35, 100);
    this.showFeedback('ROUTE FAILED  //  REBUILDING', '#ff435f');
    this.time.delayedCall(360, () => this.resetParkour(reason));
  }

  resetParkour(reason) {
    resetParkourState(this.state, reason);
    this.state.movables.forEach((movable) => {
      this.syncMovableView(movable);
      this.setMovableCollision(movable, true);
    });
    this.state.flyingCars.forEach((car) => {
      const sprite = this.carViews.get(car.id);
      sprite.setPosition(car.x, car.y);
      sprite.body.updateFromGameObject();
    });
    this.player.frozen = false;
    this.player.body.moves = true;
    this.player.body.allowGravity = true;
    this.player.body.setGravityY(0);
    const respawn = this.state.checkpointReached
      ? { x: MIDPOINT_X, y: MIDPOINT_ROOF_Y - 50 }
      : { x: 70, y: 490 };
    this.player.resetTo(respawn.x, respawn.y, LANE_NEAR);
    this.player.clearTint().setTint(0xd7eaff).setDepth(50);
    this.climbing = false;
    this.activeLadder = null;
    this.activeLadderPlatform = null;
    this.player.body.enable = true;
    this.currentRideId = null;
    this.lastRideId = null;
    this.finished = false;
    this.objectiveText.setText(this.state.checkpointReached
      ? 'CHECKPOINT ACTIVE  //  REACH FINAL BALCONY'
      : 'REACH THE FINAL BALCONY');
    this.cameras.main.flash(180, 37, 230, 255);
    this.showFeedback(
      reason === 'manual'
        ? 'LEVEL RESET'
        : this.state.checkpointReached
          ? 'MIDPOINT RESTORED'
          : 'CHECKPOINT RESTORED',
      '#25e6ff',
    );
  }

  tryActivateCheckpoint() {
    if (this.state.checkpointReached || this.finished) return;
    if (!activateCheckpoint(this.state)) {
      if ((this.midpointRejectedUntil ?? 0) <= this.time.now) {
        this.midpointRejectedUntil = this.time.now + 900;
        this.showFeedback('FIRST ROUTE INCOMPLETE', '#ffbf26');
      }
      return;
    }
    this.objectiveText.setText('CHECKPOINT ACTIVE  //  REACH FINAL BALCONY');
    this.showFeedback('MIDPOINT SAVED  //  ROUTE EXTENDED', '#25e6ff');
    this.cameras.main.flash(260, 37, 230, 255);
    createSaveStore().markCheckpoint('chapter-2-midpoint');
  }

  seedMidpointCheckpoint() {
    for (const movable of this.state.movables) movable.moved = true;
    this.state.movedMovables = this.state.movables.map(({ id }) => id);
    this.state.movedKinds = [...new Set(this.state.movables.map(({ kind }) => kind))];
    for (const car of this.state.flyingCars.slice(0, 2)) recordCarRide(this.state, car.id);
    activateCheckpoint(this.state);
    this.player.body.reset(MIDPOINT_X + 60, MIDPOINT_ROOF_Y - 50);
    this.objectiveText.setText('CHECKPOINT ACTIVE  //  REACH FINAL BALCONY');
  }

  tryCompleteGoal() {
    if (this.finished) return;
    if (!canCompleteGoal(this.state)) {
      this.showFeedback(
        this.state.narrative.letterRead ? 'ROUTE DATA INCOMPLETE' : 'READ MARA\'S LETTER BEFORE LEAVING',
        '#ffbf26',
      );
      return;
    }
    completeGoal(this.state);
    this.finished = true;
    this.player.frozen = true;
    this.player.setAcceleration(0, 0);
    this.player.setVelocity(0, 0);
    this.player.body.allowGravity = false;
    this.player.body.moves = false;
    this.objectiveText.setText('SAFETY TEST COMPLETE  ✓');
    this.showFeedback('BALCONY REACHED  //  ROUTE ACCEPTED', '#45ff65');
    this.cameras.main.flash(420, 80, 255, 130);
    this.beginNextAreaTransition();
  }

  beginNextAreaTransition() {
    if (this.transitioningToNextArea) return;
    this.transitioningToNextArea = true;
    const minimumSuccessHold = new Promise((resolve) => {
      this.time.delayedCall(850, resolve);
    });
    minimumSuccessHold.then(async () => {
      if (!this.sys.isActive()) return;
      createSaveStore().markCheckpoint('chapter-3-start');
      navigateAfterCinematic('chapter-2-to-3', CINEMATICS.chapter2To3, '/car03-3d.html', {
        label: 'Chapter 2 to Chapter 3 transition',
        preloadChapterId: 'chapter3',
        requirePreloadReady: true,
      });
    }).catch((error) => {
      console.error(error);
      this.transitioningToNextArea = false;
      this.showFeedback('TRAIN RETURN FAILED', '#ff435f');
    });
  }

  showFeedback(message, color) {
    this.feedbackText.setText(message).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.feedbackText);
    this.tweens.add({ targets: this.feedbackText, alpha: 0, delay: 1300, duration: 450 });
  }

  setupQAState() {
    if (!import.meta.env.DEV) return;
    const qa = new URLSearchParams(window.location.search).get('qa');
    if (!qa?.startsWith('parkour-')) return;
    const seedMovables = (ids) => {
      ids.forEach((id) => {
        const movable = movableById(this.state, id);
        if (!movable) return;
        movable.moved = true;
        if (!this.state.movedMovables.includes(id)) this.state.movedMovables.push(id);
        if (!this.state.movedKinds.includes(movable.kind)) this.state.movedKinds.push(movable.kind);
      });
    };
    const seedFirstAct = () => {
      seedMovables(['ladder-a', 'block-a', 'ladder-b', 'block-b']);
      recordCarRide(this.state, 'car-a');
      recordCarRide(this.state, 'car-b');
    };
    const seedMidpoint = () => {
      seedFirstAct();
      activateCheckpoint(this.state);
    };
    if (qa === 'parkour-drag') {
      beginDrag(this.state, 'ladder-a');
      previewDrag(this.state, 40);
      this.setMovableCollision(movableById(this.state, 'ladder-a'), false);
      this.syncMovableView(movableById(this.state, 'ladder-a'), RED);
      this.showFeedback('OUTSIDE PLACEMENT RAIL', '#ff435f');
    } else if (qa === 'parkour-car') {
      this.state.movedKinds.push('ladder', 'block');
      const car = this.state.flyingCars[0];
      this.player.body.reset(car.x, car.y - 38);
    } else if (qa === 'parkour-ladder-wall' || qa === 'parkour-recovery') {
      // Seed the lower wrong-choice platform. Browser QA still climbs the
      // physical RETURN ladder with ordinary W input.
      this.player.body.reset(1210, 430);
    } else if (qa === 'parkour-recovery-car-b') {
      // Seed the lower branch beneath car B. This RETURN ladder must lead
      // back to the pre-car roof, never forward to the POWER building.
      this.player.body.reset(3820, 465);
    } else if (qa === 'parkour-spikes') {
      this.player.body.reset(2260, 330);
    } else if (qa === 'parkour-extension') {
      // Do not seed route-use flags here: reaching the physical gate itself
      // must activate the checkpoint even when an optional obstacle was unused.
      this.player.body.reset(MIDPOINT_X - 40, MIDPOINT_ROOF_Y - 50);
    } else if (qa === 'parkour-car-c') {
      seedMidpoint();
      const car = this.state.flyingCars.find(({ id }) => id === 'car-c');
      this.player.body.reset(car.x, car.y - 38);
    } else if (qa === 'parkour-car-d') {
      seedMidpoint();
      const car = this.state.flyingCars.find(({ id }) => id === 'car-d');
      this.player.body.reset(car.x, car.y - 38);
    } else if (qa === 'parkour-extension-drag') {
      seedMidpoint();
      this.player.body.reset(5480, 210);
    } else if (qa === 'parkour-recovery-car-d') {
      seedMidpoint();
      this.player.body.reset(6260, 465);
    } else if (qa === 'parkour-magic-stone') {
      seedMidpoint();
      this.player.body.reset(GRID_STONE.x - 92, GRID_STONE.y - 8);
    } else if (qa === 'parkour-extension-spikes') {
      seedMidpoint();
      this.player.body.reset(4770, 130);
    } else if (qa === 'parkour-high-spikes') {
      seedMidpoint();
      this.player.body.reset(7005, 30);
    } else if (qa === 'parkour-story-npc') {
      this.player.body.reset(STORY_NPC_X - 34, STORY_NPC_GROUND_Y - 50);
    } else if (qa === 'parkour-story-letter') {
      seedMovables(this.state.movables.map(({ id }) => id));
      this.state.flyingCars.forEach(({ id }) => recordCarRide(this.state, id));
      this.state.checkpointReached = true;
      this.player.body.reset(MARA_LETTER_X - 28, MARA_LETTER_Y - 18);
    } else if (qa === 'parkour-reset') {
      const ladder = movableById(this.state, 'ladder-a');
      beginDrag(this.state, ladder.id);
      previewDrag(this.state, 720);
      finishDrag(this.state, true);
      this.syncMovableView(ladder);
      this.resetParkour('spikes');
    } else if (qa === 'parkour-final-approach') {
      seedMovables(this.state.movables.map(({ id }) => id));
      this.state.flyingCars.forEach(({ id }) => recordCarRide(this.state, id));
      this.state.checkpointReached = true;
      recordNarrativeInteraction(this.state, 'letter');
      this.player.body.reset(FINAL_GOAL_X - 140, FINAL_GOAL_ROOF_Y - 50);
    } else if (qa === 'parkour-goal') {
      seedMovables(this.state.movables.map(({ id }) => id));
      this.state.flyingCars.forEach(({ id }) => recordCarRide(this.state, id));
      this.state.checkpointReached = true;
      recordNarrativeInteraction(this.state, 'letter');
      // Leave the final ten metres live: browser QA walks through the actual
      // goal overlap instead of directly mutating completion state.
      this.player.body.reset(FINAL_GOAL_X - 40, FINAL_GOAL_ROOF_Y - 50);
    }
  }

  getTextState() {
    const snapshot = parkourSnapshot(this.state);
    snapshot.movables = snapshot.movables.map((movable) => {
      const collider = this.dragViews.get(movable.id)?.collider;
      return {
        ...movable,
        collisionX: collider?.body?.enable ? Math.round(collider.body.center.x) : null,
      };
    });
    snapshot.flyingCars = snapshot.flyingCars.map((car) => {
      const view = this.carViews.get(car.id);
      return {
        ...car,
        visualX: Math.round(view?.x ?? car.x),
        collisionX: Math.round(view?.body?.center?.x ?? car.x),
      };
    });
    return {
      id: 'chapter-two-cyberpunk-parkour',
      objective: this.state.goalComplete ? 'goal balcony reached' : 'reach the final balcony',
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        velocityX: Math.round(this.player.body?.velocity.x ?? 0),
        velocityY: Math.round(this.player.body?.velocity.y ?? 0),
        state: this.climbing ? 'climbing' : this.currentRideId ? 'riding' : this.player.visualState,
        ridingCar: this.currentRideId,
        frozen: Boolean(this.player.frozen),
        blockedUp: Boolean(this.player.body?.blocked.up),
        bodyEnabled: Boolean(this.player.body?.enable),
        platformCollisionActive: Boolean(this.platformCollider?.active),
        ladderPlatform: this.activeLadderPlatform?.getData('parkourPlatform')?.sign ?? null,
        bodyLeft: Math.round(this.player.body?.left ?? this.player.x),
        bodyRight: Math.round(this.player.body?.right ?? this.player.x),
        bodyBottom: Math.round(this.player.body?.bottom ?? this.player.y),
        ladderLeft: this.activeLadder
          ? Math.round(this.activeLadder.x - this.activeLadder.width / 2)
          : null,
        ladderRight: this.activeLadder
          ? Math.round(this.activeLadder.x + this.activeLadder.width / 2)
          : null,
        ladderTop: this.activeLadder
          ? Math.round(this.activeLadder.y - this.activeLadder.height / 2)
          : null,
      },
      recoveryLadders: (this.recoveryLadders ?? []).map((ladder) => ({
        id: ladder.id,
        x: ladder.x,
        y: ladder.y,
        height: ladder.height,
        dismountDirection: ladder.dismountDirection,
      })),
      lastPointerEvent: this.lastPointerEvent ?? null,
      course: {
        width: PARKOUR_WIDTH,
        midpointX: MIDPOINT_X,
        finalGoalX: FINAL_GOAL_X,
      },
      magicStone: {
        id: 'chapter-2',
        x: GRID_STONE.x,
        y: GRID_STONE.y,
        collected: this.gridStoneCollected,
        visible: Boolean(this.magicStoneView?.visible),
      },
      transitioningToNextArea: this.transitioningToNextArea,
      nextArea: STORY_WORLDS[0]
        ? { index: 0, title: STORY_WORLDS[0].title, startX: TRAIN_RETURN_X }
        : null,
      hazards: HAZARD_DEFS.map((hazard) => ({
        label: hazard.label,
        x: hazard.x,
        y: hazard.y,
        width: hazard.w,
        visualSegments: Math.ceil(hazard.w / 24),
      })),
      ...snapshot,
      narrative: {
        npcTalked: snapshot.narrative.npcTalked,
        letterRead: snapshot.narrative.letterRead,
        active: this.narrativeDialogue?.kind ?? null,
        speaker: this.narrativeDialogue?.script.speaker ?? null,
        line: this.narrativeDialogue ? this.narrativeDialogue.lineIndex + 1 : null,
        total: this.narrativeDialogue?.script.lines.length ?? null,
        text: this.narrativeDialogue
          ? this.narrativeDialogue.script.lines[this.narrativeDialogue.lineIndex]
          : null,
        typing: Boolean(this.narrativeDialogue?.typing),
      },
      camera: {
        centerX: Math.round(this.cameras.main.midPoint.x),
        centerY: Math.round(this.cameras.main.midPoint.y),
      },
    };
  }
}
