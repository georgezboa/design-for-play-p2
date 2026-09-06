// Chapter 3 // ECHO CITY — scene (pure consumer of echoCityModel).
//
// SUPERSEDED 2026-08-05: replaced by EchoCityIsoScene.js (fixed-camera
// isometric rebuild). Kept for reference only; not wired into car03.html.
//
// Authoritative spec: docs/CHAPTER_03_QWEN_ECHO_CITY_EXECUTION_WORK_PACKAGE.md
//
//   - fixed-step feed of real frame delta into model.update(dt, input);
//   - E (deduplicated keydown edge) -> model.pressInteract(); the current
//     focus prompt always states exactly what E will do;
//   - R -> fullReset() (model.reset + rebuilt transients + camera home);
//   - events from model.drainEvents() drive one-shot audio/visual feedback;
//   - window.render_game_to_text() = read-only snapshot JSON.
//
// Raster characters come from the preserved A2 kit (provisional structural
// material per the work package). Every environment surface is blockout
// drawn through echoCityArt.js against the named ECHO_ASSET_SLOTS manifest,
// so painted exports replace layers without touching mechanics.

import Phaser from 'phaser';
import { GAME_W, GAME_H, LANE_NEAR } from '../../constants.js';
import { CAR } from '../../art/colors.js';
import { createEchoCityModel, ECHO_CITY_DEFAULTS, ECHO_CYCLES } from './echoCityModel.js';
import { car03Audio } from './car03Audio.js';
import {
  ECHO_WORLD_LENGTH, ECHO_SPACE_BOUNDS,
  echoLaneToY, echoLaneScale, echoLaneDepth, echoLerpLane,
  ETXT,
  drawCycleStrip, drawFocusOutline, drawProgressRing, drawRecordMark,
  drawRelationshipPath, drawInspectionStrip, drawMarketGate, drawTransitSign,
  drawBus, drawCrosswalkSignal, drawBarrier, drawFieldPylons, drawBell,
  drawWitnessGate, drawObjectiveIcon, drawEchoAlertBorder,
  drawMarketBlockout, drawTransitBlockout, drawSquareBlockout,
  drawFrozenCrowd, drawStreetFloor, drawSkyline,
} from './echoCityArt.js';

const STEP_MS = 16; // fixed-step model feed
const ASSET_BASE = '/outputs/car03-a2-production-assets';

const OBJECTIVE_TEXT = Object.freeze({
  OBSERVE_AND_COPY_A_CYCLE: 'WATCH THE COURIER. HOLD E TO COPY THE CYCLE.',
  TRANSPLANT_TO_THE_MARKET_GROUP: 'CARRY THE CYCLE. GIVE IT TO THE WAITING GROUP.',
  CROSS_THE_OPEN_GATE: 'THE STRIP KNOWS THE PATTERN NOW. CROSS.',
  COPY_AND_PLANT_BOTH_CYCLES: 'COPY THE BUS AND THE CROSSWALK. PLANT BOTH.',
  CROSS_WHEN_BOTH_CYCLES_RUN: 'CROSS WHILE THE BARRIER OPENS AND THE CROWD MOVES.',
  RECORD_YOUR_OWN_CYCLE: 'STAND ON THE AMBER MARK. RECORD YOUR OWN CYCLE.',
  THE_ECHO_SHOWS_YOUR_CYCLE: 'YOUR ECHO SHOWS THE SQUARE WHAT YOU TAUGHT IT.',
  SHARE_YOUR_CYCLE_WITH_MARA: 'FOCUS MARA. SHARE YOUR CYCLE.',
  REUNION: 'YOU ALWAYS WALKED HALF A STEP AHEAD.',
});

const SPACE_TITLE = Object.freeze({
  MARKET: 'LIVING MARKET',
  TRANSIT: 'TRANSIT SQUARE',
  SQUARE: 'SILENT CENTRAL SQUARE',
});

const FLAG_STAMP_TEXT = 'EXPOSED — NO COVER';

const GROUP_SPACING = 34;

export default class EchoCityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EchoCity' });
  }

  // ------------------------------------------------------------------
  // Preload — provisional A2 character sheets (asset-slot manifest ids
  // echo-hero / echo-mara / echo-crowd).
  // ------------------------------------------------------------------
  preload() {
    const base = ASSET_BASE;
    this.load.spritesheet('echo-hero', `${base}/characters/hero-spritesheet.png`, {
      frameWidth: 96, frameHeight: 120,
    });
    this.load.spritesheet('echo-mara', `${base}/characters/companion-spritesheet.png`, {
      frameWidth: 96, frameHeight: 120,
    });
    this.load.spritesheet('echo-crowd', `${base}/characters/commuters-spritesheet.png`, {
      frameWidth: 96, frameHeight: 120,
    });
  }

  create() {
    this.model = createEchoCityModel();
    this.defaults = ECHO_CITY_DEFAULTS;
    this.reduceFlash = false;
    try {
      this.reduceFlash = new URLSearchParams(window.location.search).get('reduceFlash') === '1';
    } catch { /* non-browser guard */ }

    this._createAnims();
    this._initKeys();
    this._buildStaticLayers();
    this._buildMechanisms();
    this._buildActors();
    this._buildRelationshipLayer();
    this._buildUi();
    this._initTransients();

    this.cameras.main.setBounds(0, 0, ECHO_WORLD_LENGTH, GAME_H);
    this.cameras.main.setBackgroundColor('#0a1015');
    this.cameras.main.scrollX = 0;

    this._exposeRenderToText();
  }

  // ------------------------------------------------------------------
  // Animations (same A2 frame layout as the preserved V2 scene).
  // ------------------------------------------------------------------
  _createAnims() {
    const A = this.anims;
    const add = (key, tex, start, end, frameRate) => {
      if (A.exists(key)) return;
      A.create({
        key,
        frames: A.generateFrameNumbers(tex, { start, end }),
        frameRate,
        repeat: -1,
      });
    };
    add('echo-hero-idle', 'echo-hero', 0, 3, 6);
    add('echo-hero-walk', 'echo-hero', 4, 11, 12);
    add('echo-mara-idle', 'echo-mara', 0, 3, 6);
    add('echo-mara-walk', 'echo-mara', 4, 11, 12);
    add('echo-suit-walk', 'echo-crowd', 4, 11, 12);
    add('echo-suit-idle', 'echo-crowd', 0, 3, 6);
    add('echo-trench-walk', 'echo-crowd', 16, 23, 12);
    add('echo-casual-walk', 'echo-crowd', 24, 27, 6);
    add('echo-casual-panic', 'echo-crowd', 28, 35, 12);
  }

  _initKeys() {
    const K = Phaser.Input.Keyboard.KeyCodes;
    const kb = this.input.keyboard;
    this.keyLeft = kb.addKey(K.LEFT);
    this.keyA = kb.addKey(K.A);
    this.keyRight = kb.addKey(K.RIGHT);
    this.keyD = kb.addKey(K.D);
    this.keyUp = kb.addKey(K.UP);
    this.keyW = kb.addKey(K.W);
    this.keyDown = kb.addKey(K.DOWN);
    this.keyS = kb.addKey(K.S);
    this.keyE = kb.addKey(K.E);
    this.keyR = kb.addKey(K.R);
    // Edge-triggered E/R with OS autorepeat deduplicated: one physical
    // press = exactly one model action, while eHeld tracks the real hold.
    this._eDown = false;
    this._eQueued = false;
    this._rDown = false;
    this._rQueued = false;
    kb.on('keydown-E', () => {
      if (!this._eDown) {
        this._eDown = true;
        this._eQueued = true;
      }
    });
    kb.on('keyup-E', () => { this._eDown = false; });
    kb.on('keydown-R', () => {
      if (!this._rDown) {
        this._rDown = true;
        this._rQueued = true;
      }
    });
    kb.on('keyup-R', () => { this._rDown = false; });
  }

  // ------------------------------------------------------------------
  // Static blockout layers (asset slots: skyline, street floor, space
  // backdrops, foreground occluders).
  // ------------------------------------------------------------------
  _buildStaticLayers() {
    const sky = this.add.graphics().setDepth(0).setScrollFactor(0.5, 0.5);
    drawSkyline(sky);

    // Paper-grain placeholder: deterministic speckle, screen-anchored.
    const grain = this.add.graphics().setDepth(6).setScrollFactor(0, 0);
    let seed = 1234567;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 320; i++) {
      const gx = rnd() * GAME_W;
      const gy = rnd() * GAME_H;
      grain.fillStyle(CAR.HERO_BASE, 0.02 + rnd() * 0.03);
      grain.fillRect(gx, gy, 1.6, 1.6);
    }

    const floor = this.add.graphics().setDepth(300);
    drawStreetFloor(floor);

    this.marketBg = this.add.graphics().setDepth(100);
    drawMarketBlockout(this.marketBg);
    this.transitBg = this.add.graphics().setDepth(100);
    drawTransitBlockout(this.transitBg);
    this.squareBg = this.add.graphics().setDepth(100);
    drawSquareBlockout(this.squareBg);
    this.frozenCrowdG = this.add.graphics().setDepth(105);

    // Foreground occluders — thin poles that never sit on interactables.
    const fg = this.add.graphics().setDepth(700);
    const pole = (x) => {
      fg.fillStyle(CAR.ENAMEL_DARK, 0.92);
      fg.fillRect(x - 5, 368, 10, GAME_H - 368);
      fg.fillStyle(CAR.STEEL_MID, 0.7);
      fg.fillRect(x - 5, 368, 10, 6);
      fg.fillStyle(CAR.ENAMEL_DARK, 0.95);
      fg.fillEllipse(x, GAME_H - 8, 46, 18);
    };
    [170, 590, 1310, 2630, 2680, 3560].forEach(pole);
  }

  // ------------------------------------------------------------------
  // Dynamic middle-ground mechanisms (local-coordinate art objects).
  // ------------------------------------------------------------------
  _buildMechanisms() {
    const nearY = echoLaneToY(LANE_NEAR);
    const farY = echoLaneToY(0);
    this.signG = this.add.graphics().setDepth(210);
    this.signG.setPosition(this.defaults.courierSignX, nearY);
    this.stripG = this.add.graphics().setDepth(215);
    this.stripG.setPosition(this.defaults.inspectionStripX, nearY);
    this.marketGateG = this.add.graphics().setDepth(220);
    this.marketGateG.setPosition(this.defaults.marketGateX, nearY);
    this.crosswalkG = this.add.graphics().setDepth(210);
    this.crosswalkG.setPosition(this.defaults.crosswalkX, nearY);
    this.barrierG = this.add.graphics().setDepth(230);
    this.barrierG.setPosition(this.defaults.barrierX, nearY);
    this.fieldG = this.add.graphics().setDepth(240);
    this.fieldG.setPosition(this.defaults.fieldX0, nearY);
    this.busG = this.add.graphics().setDepth(430);
    this.busG.setPosition(this.defaults.busX, farY);
    this.busG.setScale(echoLaneScale(0));
    this.bellG = this.add.graphics().setDepth(220);
    this.bellG.setPosition(this.defaults.bellX, nearY);
    this.witnessG = this.add.graphics().setDepth(230);
    this.witnessG.setPosition(this.defaults.witnessGateX, nearY);
    this.recordMarkG = this.add.graphics().setDepth(310);
    this.recordMarkG.setPosition(this.defaults.recordMarkX, nearY);
  }

  // ------------------------------------------------------------------
  // Actors.
  // ------------------------------------------------------------------
  _buildActors() {
    this.hero = this.add.sprite(0, 0, 'echo-hero');
    this.hero.setOrigin(0.5, 0.916);
    this.hero.play('echo-hero-idle');

    this.echoSpr = this.add.sprite(0, 0, 'echo-hero');
    this.echoSpr.setOrigin(0.5, 0.916);
    this.echoSpr.setAlpha(0.5);
    this.echoSpr.setTint(0xffc98a);
    this.echoSpr.play('echo-hero-walk');
    this.echoSpr.setVisible(false);

    this.maraSpr = this.add.sprite(0, 0, 'echo-mara');
    this.maraSpr.setOrigin(0.5, 0.916);
    this.maraSpr.play('echo-mara-idle');
    this.maraSpr.setVisible(false);

    this.courierSpr = this.add.sprite(0, 0, 'echo-crowd');
    this.courierSpr.setOrigin(0.5, 0.916);
    this.courierSpr.play('echo-trench-walk');

    this.walkerSpr = this.add.sprite(0, 0, 'echo-crowd');
    this.walkerSpr.setOrigin(0.5, 0.916);
    this.walkerSpr.play('echo-casual-walk');

    this.groupSprites = [];
    for (let i = 0; i < 4; i++) {
      const s = this.add.sprite(0, 0, 'echo-crowd');
      s.setOrigin(0.5, 0.916);
      s.play('echo-suit-idle');
      this.groupSprites.push(s);
    }
    this.crowdSprites = [];
    for (let i = 0; i < 4; i++) {
      const s = this.add.sprite(0, 0, 'echo-crowd');
      s.setOrigin(0.5, 0.916);
      s.play('echo-suit-idle');
      this.crowdSprites.push(s);
    }
  }

  // ------------------------------------------------------------------
  // Relationship graphics + receiver panels.
  // ------------------------------------------------------------------
  _buildRelationshipLayer() {
    this.pathG = this.add.graphics().setDepth(600);
    this.linkG = this.add.graphics().setDepth(605);
    this.carryG = this.add.graphics().setDepth(610);
    this.focusG = this.add.graphics().setDepth(860);
    this.panelGs = new Map();
    this.panelTexts = new Map();
    for (const id of ['market-group', 'barrier', 'crowd']) {
      const g = this.add.graphics().setDepth(615);
      const text = this.add.text(0, 0, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px', fontStyle: 'bold', color: ETXT.white,
        backgroundColor: ETXT.panel, padding: { x: 8, y: 4 }, align: 'center',
      });
      text.setOrigin(0.5, 0).setDepth(616).setVisible(false);
      this.panelGs.set(id, g);
      this.panelTexts.set(id, text);
    }
  }

  // ------------------------------------------------------------------
  // Screen-space UI. All critical text >= 20px at 960x600.
  // ------------------------------------------------------------------
  _buildUi() {
    const mono = '"Courier New", monospace';

    // Objective card (top-left safe area).
    this.objCardG = this.add.graphics().setDepth(900).setScrollFactor(0, 0);
    this.objIconG = this.add.graphics().setDepth(901).setScrollFactor(0, 0);
    this.objText = this.add.text(64, 29, '', {
      fontFamily: mono, fontSize: '22px', fontStyle: 'bold',
      color: ETXT.white, wordWrap: { width: 300 }, lineSpacing: 2,
    });
    this.objText.setOrigin(0, 0.5).setDepth(901).setScrollFactor(0, 0);
    this.currentObjectiveId = null;
    this._setObjectiveCard(null);

    // Interaction prompt (bottom-centre, keycap + words).
    this.promptG = this.add.graphics().setDepth(900).setScrollFactor(0, 0);
    this.promptText = this.add.text(GAME_W / 2 + 26, GAME_H - 48, '', {
      fontFamily: mono, fontSize: '26px', fontStyle: 'bold', color: ETXT.white,
    });
    this.promptText.setOrigin(0, 0.5).setDepth(901).setScrollFactor(0, 0);
    this._drawPromptKeycap();
    this._setPromptVisible(false);

    // Subtitle (Mara's line and other English caption-ready text).
    this.subtitleText = this.add.text(GAME_W / 2, GAME_H - 108, '', {
      fontFamily: mono, fontSize: '24px', fontStyle: 'bold', color: ETXT.tungsten,
      backgroundColor: ETXT.panel, padding: { x: 14, y: 8 },
    });
    this.subtitleText.setOrigin(0.5).setDepth(902).setScrollFactor(0, 0);
    this.subtitleText.setVisible(false);

    // Space title card.
    this.titleText = this.add.text(GAME_W / 2, 108, '', {
      fontFamily: mono, fontSize: '32px', fontStyle: 'bold', color: ETXT.white,
      backgroundColor: ETXT.panel, padding: { x: 16, y: 8 },
    });
    this.titleText.setOrigin(0.5).setDepth(902).setScrollFactor(0, 0);
    this.titleText.setVisible(false);

    // Flag stamp + flash/border overlays.
    this.stampG = this.add.graphics().setDepth(950).setScrollFactor(0, 0);
    this.stampText = this.add.text(GAME_W / 2, GAME_H / 2 - 40, FLAG_STAMP_TEXT, {
      fontFamily: mono, fontSize: '30px', fontStyle: 'bold', color: ETXT.alert,
      backgroundColor: ETXT.ink, padding: { x: 14, y: 10 },
    });
    this.stampText.setOrigin(0.5).setDepth(951).setScrollFactor(0, 0);
    this.stampText.setVisible(false);
    this.flashG = this.add.graphics().setDepth(940).setScrollFactor(0, 0);
  }

  _drawPromptKeycap() {
    const g = this.promptG;
    const kx = GAME_W / 2 - 60;
    const ky = GAME_H - 48;
    g.clear();
    g.fillStyle(CAR.ENAMEL_MID, 1);
    g.fillRoundedRect(kx - 17, ky - 17, 34, 34, 5);
    g.lineStyle(2, CAR.STEEL_HI, 1);
    g.strokeRoundedRect(kx - 17, ky - 17, 34, 34, 5);
    g.fillStyle(CAR.HERO_BASE, 1);
    g.fillRect(kx - 7, ky - 9, 4, 18);
    g.fillRect(kx - 7, ky - 9, 14, 4);
    g.fillRect(kx - 7, ky - 2, 11, 4);
    g.fillRect(kx - 7, ky + 5, 14, 4);
  }

  _setPromptVisible(v) {
    this.promptG.setVisible(v);
    this.promptText.setVisible(v);
  }

  _setObjectiveCard(objectiveId) {
    this.currentObjectiveId = objectiveId;
    if (!objectiveId) {
      this.objCardG.clear();
      this.objIconG.clear();
      this.objText.setText('');
      return;
    }
    const label = OBJECTIVE_TEXT[objectiveId] ?? objectiveId;
    this.objText.setText(label);
    const w = Math.min(380, this.objText.width + 64);
    const h = Math.max(52, this.objText.height + 22);
    const g = this.objCardG;
    g.clear();
    g.fillStyle(CAR.VOID_LIFT, 0.88);
    g.fillRoundedRect(16, 16, w, h, 8);
    g.lineStyle(2, CAR.STEEL_MID, 0.9);
    g.strokeRoundedRect(16, 16, w, h, 8);
    g.fillStyle(CAR.LAMP_OK, 0.9);
    g.fillRect(16, 16, 4, h);
    this.objText.setPosition(64, 16 + h / 2);
    this.objIconG.clear();
    drawObjectiveIcon(this.objIconG, objectiveId, 40, 16 + h / 2);
  }

  // ------------------------------------------------------------------
  // Transients (all rebuilt by fullReset).
  // ------------------------------------------------------------------
  _initTransients() {
    this.acc = 0;
    this.slowMoLeft = 0;
    this.gateK = 0;
    this.stripFlash = 0;
    this.linkFlash = null; // { x2, y2, t }
    this.pictPop = 0;
    this.subtitleMsLeft = 0;
    this.titleMsLeft = 0;
    this.lastMaraState = 'waiting';
    this.groupLastX = null;
    this.crowdLastX = null;
  }

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------
  _readInput() {
    return {
      left: this.keyLeft.isDown || this.keyA.isDown,
      right: this.keyRight.isDown || this.keyD.isDown,
      laneFar: this.keyUp.isDown || this.keyW.isDown,
      laneNear: this.keyDown.isDown || this.keyS.isDown,
      eHeld: this._eDown,
    };
  }

  // ------------------------------------------------------------------
  // Main loop
  // ------------------------------------------------------------------
  update(time, delta) {
    const rawDt = Math.min(delta || STEP_MS, 100);
    let dt = rawDt;
    if (this.slowMoLeft > 0) {
      dt = rawDt * 0.7;
      this.slowMoLeft -= rawDt;
      this.time.timeScale = 0.7;
    } else if (this.time.timeScale !== 1) {
      this.time.timeScale = 1;
    }

    const input = this._readInput();
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP_MS && steps < 8) {
      this.model.update(STEP_MS, input);
      this.acc -= STEP_MS;
      steps++;
    }
    if (steps === 8) this.acc = 0;

    if (this._eQueued) {
      this._eQueued = false;
      this.model.pressInteract();
    }
    if (this._rQueued) {
      this._rQueued = false;
      this.fullReset();
      return;
    }

    for (const ev of this.model.drainEvents()) this._onEvent(ev);

    const snap = this.model.snapshot();
    this._updateCamera(rawDt, snap);
    this._render(snap, time, rawDt);
  }

  // ------------------------------------------------------------------
  // Camera — smooth follow clamped to the active space so every puzzle
  // reads inside one viewport.
  // ------------------------------------------------------------------
  _updateCamera(dt, snap) {
    const bounds = ECHO_SPACE_BOUNDS[snap.space];
    const target = Phaser.Math.Clamp(
      snap.player.x - GAME_W / 2,
      bounds.x0,
      Math.max(bounds.x0, bounds.x1 - GAME_W),
    );
    const cam = this.cameras.main;
    const k = 1 - Math.exp(-dt / 140);
    cam.scrollX += (target - cam.scrollX) * k;
  }

  // ------------------------------------------------------------------
  // Event reactions
  // ------------------------------------------------------------------
  _onEvent(ev) {
    switch (ev.type) {
      case 'demo-seen':
        car03Audio.uiTick();
        break;
      case 'observation-started':
        car03Audio.echoFocus();
        break;
      case 'observation-aborted':
        car03Audio.observationDrain();
        break;
      case 'cycle-copied':
        car03Audio.cycleCopy();
        this.pictPop = 1;
        break;
      case 'transplant-applied': {
        if (ev.payload.compatible) car03Audio.transplant();
        else car03Audio.transplantWrong();
        const r = this.model.snapshot().receivers.find((rr) => rr.id === ev.payload.receiverId);
        if (r) {
          this.linkFlash = { x2: r.x, y2: echoLaneToY(r.lane), t: 1 };
        }
        break;
      }
      case 'cycle-released':
        car03Audio.cycleRelease();
        break;
      case 'gate-opened':
        car03Audio.echoGateOpen();
        if (ev.payload.gateId === 'market') this.stripFlash = 1;
        break;
      case 'walker-redirected':
        this.stripFlash = 1;
        break;
      case 'field-warning':
        car03Audio.warningTicks();
        break;
      case 'flagged':
        car03Audio.flagStamp();
        this.cameras.main.shake(160, 0.0035);
        break;
      case 'checkpoint-return':
        car03Audio.checkpointReturn();
        break;
      case 'space-entered':
        car03Audio.spaceChime();
        this.titleMsLeft = 2400;
        this.titleText.setText(SPACE_TITLE[ev.payload.space] ?? ev.payload.space);
        break;
      case 'recording-started':
        car03Audio.recordStart();
        break;
      case 'recording-interact':
        car03Audio.bellRing();
        break;
      case 'recording-ended':
        car03Audio.recordEnd();
        break;
      case 'recording-empty':
        car03Audio.recordDrain();
        break;
      case 'preview-started':
        car03Audio.echoPreview();
        break;
      case 'preview-complete':
        car03Audio.cycleCopy();
        this.pictPop = 1;
        break;
      case 'cycle-shared':
        car03Audio.shareCycle();
        break;
      case 'square-resonated':
        car03Audio.squareResonate();
        break;
      case 'reunion':
        car03Audio.reunion();
        break;
      case 'subtitle':
        this.subtitleText.setText(ev.payload.text);
        this.subtitleMsLeft = 4200;
        break;
      case 'complete':
        car03Audio.completeTone();
        this.slowMoLeft = 500;
        break;
      case 'interact-noop':
        car03Audio.uiTick();
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------
  // Full reset (R)
  // ------------------------------------------------------------------
  fullReset() {
    this.model.reset();
    this.model.drainEvents(); // discard the 'reset' event
    this._eQueued = false;
    this._rQueued = false;
    this._eDown = false;
    this._rDown = false;
    car03Audio.reset();

    this.time.timeScale = 1;
    this.anims.globalTimeScale = 1;
    this.cameras.main.scrollX = 0;

    this._initTransients();
    this._setObjectiveCard(null);
    this.subtitleText.setVisible(false);
    this.titleText.setVisible(false);
    this.stampText.setVisible(false);
    this.stampG.clear();
    this.flashG.clear();
    this.focusG.clear();
    this.linkG.clear();
    this.carryG.clear();
    this.pathG.clear();
    for (const g of this.panelGs.values()) g.clear();
    for (const t of this.panelTexts.values()) t.setVisible(false);
    this.hero.setVisible(true).setAngle(0).setAlpha(1);
    this.maraSpr.setVisible(false);
    this.echoSpr.setVisible(false);
  }

  // ------------------------------------------------------------------
  // Render — everything derives from the snapshot.
  // ------------------------------------------------------------------
  _render(snap, time, dt) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);

    // 1) Square completion transformation: the frozen crowd wakes.
    this.frozenCrowdG.clear();
    if (snap.space === 'SQUARE') {
      drawFrozenCrowd(this.frozenCrowdG, snap.complete, time * 0.002);
    }

    // 2) Mechanisms (drawn per space; the rest stay cleared).
    this._renderMechanisms(snap, pulse, dt);

    // 3) Actors.
    this._renderActors(snap, time);

    // 4) Relationship graphics: courier path, link flash, carried cycle.
    this._renderRelationship(snap, time, dt);

    // 5) Receiver panels.
    this._renderReceiverPanels(snap, time);

    // 6) Targeting outline + prompt.
    this._renderTargeting(snap, time);

    // 7) Flag freeze, flash/border, subtitle, title, objective card.
    this._renderFlag(snap, time);
    this._renderOverlays(snap, dt);
  }

  _renderMechanisms(snap, pulse, dt) {
    const inMarket = snap.space === 'MARKET';
    const inTransit = snap.space === 'TRANSIT';
    const inSquare = snap.space === 'SQUARE';

    // Market: transit sign, inspection strip, gate.
    this.signG.clear();
    this.stripG.clear();
    this.marketGateG.clear();
    if (inMarket) {
      drawTransitSign(this.signG, pulse);
      const flash = Math.max(0, this.stripFlash);
      drawInspectionStrip(this.stripG, snap.environment.stripRecognizes, flash);
      const gateTarget = snap.environment.marketGate === 'open' ? 1 : 0;
      const d = dt / 1400;
      this.gateK += Phaser.Math.Clamp(gateTarget - this.gateK, -d, d);
      drawMarketGate(this.marketGateG, this.gateK, pulse);
    }

    // Transit: bus, crosswalk signal, barrier, surveillance field.
    this.busG.clear();
    this.crosswalkG.clear();
    this.barrierG.clear();
    this.fieldG.clear();
    if (inTransit) {
      const bus = snap.sources.find((s) => s.id === 'bus');
      const cross = snap.sources.find((s) => s.id === 'crosswalk');
      const barrier = snap.receivers.find((r) => r.id === 'barrier');
      drawBus(this.busG, bus.stepKind, bus.progress ?? 0, pulse);
      drawCrosswalkSignal(this.crosswalkG, cross.stepKind, cross.progress ?? 0);
      drawBarrier(this.barrierG, barrier.resultState, barrier.stepKind, barrier.phaseMs != null ? this._phaseProgress(snap, barrier) : 0, pulse);
      drawFieldPylons(this.fieldG, snap.environment.fieldX1 - snap.environment.fieldX0,
        snap.environment.fieldState, snap.environment.fieldSafe, pulse);
    }

    // Square: record mark, bell, witness gate.
    this.recordMarkG.clear();
    this.bellG.clear();
    this.witnessG.clear();
    if (inSquare) {
      drawRecordMark(this.recordMarkG, snap.resonance.mode === 'recording', pulse);
      const bellK = snap.environment.squareResonance === 'resonating'
        ? (time % 1000) / 1000 : 0;
      drawBell(this.bellG, snap.environment.squareResonance, bellK, pulse);
      drawWitnessGate(this.witnessG, snap.environment.witnessGate, pulse);
    }
    if (this.stripFlash > 0) this.stripFlash = Math.max(0, this.stripFlash - dt / 600);
  }

  _phaseProgress(snap, receiverSnap) {
    const cycle = ECHO_CYCLES[receiverSnap.installedCycleId];
    if (!cycle) return 0;
    const step = cycle.steps.find((s) => s.label === receiverSnap.stepLabel);
    if (!step || !step.durMs) return 0;
    // Derive within-step progress from the shared phase clock.
    let acc = 0;
    for (const s of cycle.steps) {
      if (s.label === receiverSnap.stepLabel) {
        return Phaser.Math.Clamp((receiverSnap.phaseMs - acc) / s.durMs, 0, 1);
      }
      acc += s.durMs;
    }
    return 0;
  }

  _renderActors(snap, time) {
    const nearY = echoLaneToY(LANE_NEAR);
    const inMarket = snap.space === 'MARKET';
    const inTransit = snap.space === 'TRANSIT';
    const inSquare = snap.space === 'SQUARE';

    // Courier (Space A source).
    const courier = snap.sources.find((s) => s.id === 'courier');
    this.courierSpr.setVisible(inMarket);
    if (inMarket) {
      this.courierSpr.setPosition(courier.x, nearY);
      this.courierSpr.setDepth(echoLaneDepth(LANE_NEAR));
      this.courierSpr.setFlipX(courier.facing < 0);
      const moving = courier.stepKind === 'move';
      const want = moving ? 'echo-trench-walk' : 'echo-suit-idle';
      if (this.courierSpr.anims.currentAnim?.key !== want) this.courierSpr.play(want);
    }

    // Lone pedestrian (Space A teaching image).
    const w = snap.loneWalker;
    this.walkerSpr.setVisible(inMarket && w.state !== 'gone');
    if (inMarket && w.state !== 'gone') {
      this.walkerSpr.setPosition(w.x, nearY);
      this.walkerSpr.setDepth(echoLaneDepth(LANE_NEAR));
      this.walkerSpr.setFlipX(w.facing < 0);
      const want = w.state === 'redirected' ? 'echo-casual-panic'
        : (w.state === 'waiting' ? 'echo-suit-idle' : 'echo-casual-walk');
      if (this.walkerSpr.anims.currentAnim?.key !== want) this.walkerSpr.play(want);
    }

    // Market group receiver (Space A).
    const group = snap.receivers.find((r) => r.id === 'market-group');
    const groupVisible = inMarket;
    const prevGX = this.groupLastX;
    const groupMoving = prevGX === null ? false : Math.abs(group.x - prevGX) > 0.5;
    this.groupLastX = groupVisible ? group.x : null;
    for (let i = 0; i < this.groupSprites.length; i++) {
      const s = this.groupSprites[i];
      s.setVisible(groupVisible);
      if (!groupVisible) continue;
      const off = (i - (this.groupSprites.length - 1) / 2) * GROUP_SPACING;
      s.setPosition(group.x + off, nearY);
      s.setDepth(echoLaneDepth(LANE_NEAR));
      if (group.resultState === 'performing-loop') {
        if (s.anims.currentAnim?.key !== 'echo-suit-walk') s.play('echo-suit-walk');
        s.setFlipX(groupMoving ? (group.x < (prevGX ?? group.x) ? true : false) : false);
        s.setAngle(0);
      } else if (group.resultState === 'confused-milling') {
        if (s.anims.currentAnim?.key !== 'echo-casual-walk') s.play('echo-casual-walk');
        s.setFlipX(false);
        s.setAngle(Math.sin(time * 0.01 + i) * 7);
      } else {
        if (s.anims.currentAnim?.key !== 'echo-suit-idle') s.play('echo-suit-idle');
        s.setFlipX(false);
        s.setAngle(0);
      }
    }

    // Crowd island receiver (Space B).
    const crowd = snap.receivers.find((r) => r.id === 'crowd');
    const crowdVisible = inTransit;
    for (let i = 0; i < this.crowdSprites.length; i++) {
      const s = this.crowdSprites[i];
      s.setVisible(crowdVisible);
      if (!crowdVisible) continue;
      const off = (i - (this.crowdSprites.length - 1) / 2) * GROUP_SPACING;
      s.setPosition(crowd.x + off, nearY);
      s.setDepth(echoLaneDepth(LANE_NEAR));
      if (crowd.resultState === 'moving-cover') {
        if (s.anims.currentAnim?.key !== 'echo-casual-walk') s.play('echo-casual-walk');
        s.setFlipX(false);
        s.setAngle(0);
      } else if (crowd.resultState === 'stalled-huddle') {
        if (s.anims.currentAnim?.key !== 'echo-suit-idle') s.play('echo-suit-idle');
        s.setFlipX(i % 2 === 0);
        s.setAngle(i % 2 === 0 ? 5 : -5);
      } else {
        if (s.anims.currentAnim?.key !== 'echo-suit-idle') s.play('echo-suit-idle');
        s.setFlipX(false);
        s.setAngle(0);
      }
    }

    // Butch echo (Space C preview).
    this.echoSpr.setVisible(snap.echo.visible && inSquare);
    if (snap.echo.visible && inSquare) {
      this.echoSpr.setPosition(snap.echo.x, nearY);
      this.echoSpr.setDepth(echoLaneDepth(LANE_NEAR));
      this.echoSpr.setFlipX(snap.echo.facing < 0);
      const want = snap.echo.interactK > 0 ? 'echo-hero-idle' : 'echo-hero-walk';
      if (this.echoSpr.anims.currentAnim?.key !== want) this.echoSpr.play(want);
    }

    // Mara (Space C).
    this.maraSpr.setVisible(snap.mara.visible && inSquare);
    if (snap.mara.visible && inSquare) {
      const m = snap.mara;
      this.maraSpr.setPosition(m.x, nearY);
      this.maraSpr.setDepth(echoLaneDepth(LANE_NEAR));
      this.maraSpr.setFlipX(m.facing < 0);
      const moving = m.state === 'crossing' || (m.state === 'performing' && Math.abs(m.x - 3420) > 2);
      const want = moving ? 'echo-mara-walk' : 'echo-mara-idle';
      if (this.maraSpr.anims.currentAnim?.key !== want) this.maraSpr.play(want);
      if (m.state === 'crossing' && this.lastMaraState !== 'crossing') {
        car03Audio.maraCross();
      }
      this.lastMaraState = m.state;
    }

    // Hero.
    const p = snap.player;
    let y = echoLaneToY(p.lane);
    let scale = echoLaneScale(p.lane);
    let depth = echoLaneDepth(p.lane);
    if (p.laneTransition) {
      const lt = p.laneTransition;
      const k = 1 - lt.msLeft / Math.max(1, lt.msTotal);
      const v = echoLerpLane(lt.from, lt.to, k);
      y = v.y; scale = v.scale; depth = v.depth;
    }
    this.hero.setPosition(p.x, y);
    this.hero.setScale(scale);
    this.hero.setDepth(depth);
    this.hero.setFlipX(p.facing < 0);
    this.hero.setVisible(true);
    const moving = Math.abs(p.vx) > 5;
    const want = moving ? 'echo-hero-walk' : 'echo-hero-idle';
    if (this.hero.anims.currentAnim?.key !== want) this.hero.play(want);
    this.anims.globalTimeScale = p.frozenMsLeft > 0 ? 0 : 1;
  }

  _renderRelationship(snap, time, dt) {
    // Courier loop path pulse (Space A teaching image).
    this.pathG.clear();
    if (snap.space === 'MARKET') {
      drawRelationshipPath(
        this.pathG,
        this.defaults.courierHomeX, this.defaults.courierSignX,
        echoLaneToY(LANE_NEAR) + 10,
        CAR.LAMP_OK, 0.5, time * 0.0004,
      );
    }

    // Amber transplant link flash (in-transit relationship colour).
    this.linkG.clear();
    if (this.linkFlash) {
      const f = this.linkFlash;
      drawRelationshipPath(this.linkG, snap.player.x, f.x2, f.y2 + 6, CAR.LAMP_WARN, f.t * 0.9, time * 0.001);
      f.t -= dt / 320;
      if (f.t <= 0) this.linkFlash = null;
    }
    // Echo interaction ring while the preview rings the bell.
    if (snap.echo.visible && snap.echo.interactK > 0) {
      drawProgressRing(this.linkG, snap.echo.x, echoLaneToY(LANE_NEAR) - 70, 30,
        snap.echo.interactK, CAR.LAMP_WARN, 0.9);
    }

    // Carried cycle pictograms — world-space above the player, never a HUD
    // meter. Amber = a relationship in transit.
    this.carryG.clear();
    if (snap.carriedCycle) {
      if (this.pictPop > 0) this.pictPop = Math.max(0, this.pictPop - dt / 300);
      const scale = 1 + this.pictPop * 0.35;
      const y = echoLaneToY(snap.player.lane) - 190 * echoLaneScale(snap.player.lane);
      drawCycleStrip(this.carryG, snap.carriedCycle.icons, snap.player.x, y, 22 * scale, CAR.LAMP_WARN, 0.95);
    }
  }

  _renderReceiverPanels(snap, time) {
    for (const id of ['market-group', 'barrier', 'crowd']) {
      const g = this.panelGs.get(id);
      const text = this.panelTexts.get(id);
      g.clear();
      const r = snap.receivers.find((rr) => rr.id === id);
      const inSpace = r && r.space === snap.space;
      if (!inSpace || !r.installedCycleId) {
        text.setVisible(false);
        continue;
      }
      const cycle = ECHO_CYCLES[r.installedCycleId] ?? null;
      const icons = cycle ? cycle.icons : [];
      const color = r.compatible ? CAR.LAMP_OK : CAR.LAMP_ALERT;
      const y = echoLaneToY(r.lane) - 185;
      drawCycleStrip(g, icons, r.x, y, 16, color, 0.95);
      if (id === 'market-group') {
        text.setText('PATTERN RECOGNIZED');
        text.setColor(ETXT.ok);
      } else {
        text.setText(r.compatible ? '[E] RELEASE CYCLE' : 'WRONG CYCLE — [E] RELEASE');
        text.setColor(r.compatible ? ETXT.white : ETXT.alert);
      }
      text.setPosition(r.x, y + 26);
      text.setVisible(true);
    }
  }

  _focusTargetGeometry(snap) {
    const f = snap.focus;
    if (!f || !f.eligible) return null;
    const nearY = echoLaneToY(LANE_NEAR);
    const farY = echoLaneToY(0);
    switch (f.kind) {
      case 'source': {
        if (f.id === 'courier') {
          const c = snap.sources.find((s) => s.id === 'courier');
          return { x: c.x, y: nearY, w: 120, h: 150, color: CAR.LAMP_OK };
        }
        if (f.id === 'bus') {
          return { x: this.defaults.busX, y: farY, w: 290 * echoLaneScale(0), h: 150 * echoLaneScale(0), color: CAR.LAMP_OK };
        }
        return { x: this.defaults.crosswalkX, y: nearY, w: 90, h: 250, color: CAR.LAMP_OK };
      }
      case 'receiver': {
        const r = snap.receivers.find((rr) => rr.id === f.id);
        const halfW = r.id === 'barrier' ? 140 : 130;
        return { x: r.x, y: echoLaneToY(r.lane), w: halfW, h: 165, color: CAR.LAMP_OK };
      }
      case 'record':
        return { x: this.defaults.recordMarkX, y: nearY, w: 120, h: 165, color: CAR.LAMP_WARN };
      case 'recording':
        return { x: this.defaults.recordMarkX, y: nearY, w: 120, h: 165, color: CAR.LAMP_WARN };
      case 'mara':
        return { x: snap.mara.x, y: nearY, w: 110, h: 155, color: CAR.LAMP_OK };
      default:
        return null;
    }
  }

  _renderTargeting(snap, time) {
    this.focusG.clear();
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.007);
    let promptLabel = null;

    const tgt = this._focusTargetGeometry(snap);
    if (tgt) {
      drawFocusOutline(this.focusG, tgt.x, tgt.y + 10, tgt.w, tgt.h, tgt.color, pulse);
      promptLabel = snap.focus.prompt;
      // Observation progress ring while holding E on a source.
      if (snap.resonance.mode === 'observing' && snap.resonance.observeNeedMs > 0) {
        drawProgressRing(this.focusG, tgt.x, tgt.y - tgt.h - 26, 22,
          snap.resonance.observeMs / snap.resonance.observeNeedMs, CAR.LAMP_OK, 1);
      }
      // Recording countdown ring around the record mark.
      if (snap.resonance.mode === 'recording') {
        drawProgressRing(this.focusG, tgt.x, tgt.y - tgt.h - 26, 22,
          snap.resonance.recordMsLeft / this.defaults.recordWindowMs, CAR.LAMP_WARN, 1);
      }
    }

    if (promptLabel) {
      this.promptText.setText(promptLabel);
      this._setPromptVisible(true);
    } else {
      this._setPromptVisible(false);
    }
  }

  _renderFlag(snap, time) {
    this.flashG.clear();
    const frozen = snap.player.frozenMsLeft > 0;
    this.stampText.setVisible(frozen);
    if (!frozen) {
      this.stampG.clear();
      return;
    }
    const g = this.stampG;
    g.clear();
    g.lineStyle(4, CAR.LAMP_ALERT, 0.95);
    const tw = this.stampText.width;
    const th = this.stampText.height;
    g.strokeRect(GAME_W / 2 - tw / 2 - 22, GAME_H / 2 - 40 - th / 2 - 16, tw + 44, th + 32);
    if (this.reduceFlash) {
      const p = 0.55 + 0.25 * Math.sin(time * 0.012);
      drawEchoAlertBorder(this.flashG, p);
    } else {
      const a = Math.min(0.22, (snap.player.frozenMsLeft / this.defaults.fieldFreezeMs) * 0.22);
      this.flashG.fillStyle(CAR.LAMP_ALERT, a);
      this.flashG.fillRect(0, 0, GAME_W, GAME_H);
    }
  }

  _renderOverlays(snap, dt) {
    // Subtitle.
    if (this.subtitleMsLeft > 0) {
      this.subtitleMsLeft -= dt;
      this.subtitleText.setVisible(true);
      if (this.subtitleMsLeft <= 0) this.subtitleText.setVisible(false);
    }
    // Space title.
    if (this.titleMsLeft > 0) {
      this.titleMsLeft -= dt;
      this.titleText.setVisible(true);
      if (this.titleMsLeft <= 0) this.titleText.setVisible(false);
    }
    // Objective card — no prose until the market demonstration has played.
    if (snap.demoSeen) {
      if (snap.objectiveId !== this.currentObjectiveId) {
        this._setObjectiveCard(snap.objectiveId);
      }
    } else if (this.currentObjectiveId !== null) {
      this._setObjectiveCard(null);
    }
  }

  // ------------------------------------------------------------------
  // Browser diagnostic surface — read-only, never mutates the model.
  // ------------------------------------------------------------------
  _exposeRenderToText() {
    if (typeof window === 'undefined') return;
    const self = this;
    window.render_game_to_text = function echoCityRender() {
      if (!self.model) return JSON.stringify({ state: 'uninitialised' });
      return JSON.stringify({
        ...self.model.snapshot(),
        qaState: null,
        reduceFlash: self.reduceFlash,
        entry: 'car03.html',
        version: 'echo-city-2026-08-04',
      });
    };
  }
}
