// Car 03 // MOVE AS ONE — V2 scene (readable rebuild).
//
// Full replacement of the V1 scene. Authoritative spec:
//   docs/CAR_03_DESIGN_LOCK_V2_READABLE_PLAY.md
//   docs/CAR_03_QWEN_V2_READABLE_REBUILD_WORK_PACKAGE.md
//
// The scene is a pure consumer of createCar03V2Model:
//   - fixed-step feed of real frame delta into model.update(dt, input);
//   - E (JustDown) -> model.pressInteract()  (match / release, one meaning);
//   - R (JustDown) -> fullReset() (model.reset + rebuild dynamic visuals +
//     camera scrollX 0 + time.scale 1);
//   - events from model.drainEvents() drive one-shot audio/visual feedback;
//   - window.render_game_to_text() = read-only snapshot JSON.
//
// Raster layers/characters come from the A2 production kit
// (/outputs/car03-a2-production-assets, served from repo root by vite dev).
// All scanner beams, outlines, ribbons, prompts, pips, icons and panels are
// dynamic Phaser graphics/text per the Design Lock.

import Phaser from 'phaser';
import { GAME_W, GAME_H, LANE_NEAR } from '../../constants.js';
import { CAR } from '../../art/colors.js';
import { createCar03V2Model, CAR03_V2_DEFAULTS } from './socialStealthModel.js';
import { car03Audio } from './car03Audio.js';
import {
  laneToY, laneScale, laneDepth, lerpLane, easeInOut,
  WORLD_LENGTH, BAY_WIDTH, MAX_SCROLL, TXT,
  drawFootsteps, drawLinkedFootprints, drawTargetOutline, drawRibbon,
  drawBeam, drawStatusIcon, drawDuoPips, drawLuggage, drawArch,
  drawFinalDoor, drawBaySeams, drawBaySweep, drawObjectiveIcon,
  drawAlertBorder,
} from './presentCityArt.js';

const STEP_MS = 16; // fixed-step model feed
const ASSET_BASE = '/outputs/car03-a2-production-assets';
const SCANNER_TOP_Y = 0; // scanner sprite origin (0.5, 0) at the ceiling rail
const BEAM_ORIGIN_DY = 96; // PRODUCTION_NOTES §4 beam origin (64, 96) local

// Objective card copy, keyed by snapshot.objectiveId (work package §4).
const OBJECTIVE_TEXT = Object.freeze({
  REACH_THE_LAST_DOOR: 'REACH THE LAST DOOR',
  MATCH_A_GROUP_THEN_WALK_THROUGH: 'MATCH A GROUP, THEN WALK THROUGH',
  RELEASE_CHANGE_LANE_MATCH_OTHER: 'RELEASE. CHANGE LANE. MATCH THE OTHER GROUP.',
  MATCH_TEAL_SCARF_PASSENGER: 'MATCH THE PASSENGER IN THE TEAL SCARF.',
  FIND_PARTNER_MATCH_THREE_STEPS: 'FIND YOUR PARTNER. MATCH. TAKE THREE STEPS.',
});

const CAPTION_TEXT = 'SCANNERS FLAG PEOPLE MOVING ALONE.';
const FLAG_STAMP_TEXT = 'ALONE — MATCH SOMEONE';

// Beat 2 luggage position: on the near lane just before SC2 (2560), where
// G2N halts (2350) — visually pointing up to the far-lane route.
const LUGGAGE_X = 2430;

// Group visual variants (commuters spritesheet rows).
const GROUP_ANIM = Object.freeze({ G1: 'c03-trench-walk', G2N: 'c03-suit-walk', G2F: 'c03-casual-walk' });
const GROUP_SPACING = 34;

export default class PresentCityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PresentCity' });
  }

  // ------------------------------------------------------------------
  // Preload — A2 production kit. Vite dev serves the repo root, so the
  // absolute /outputs/... URLs resolve in the dev environment this slice
  // is exercised in.
  // ------------------------------------------------------------------
  preload() {
    const base = ASSET_BASE;
    this.load.spritesheet('car03-hero', `${base}/characters/hero-spritesheet.png`, {
      frameWidth: 96, frameHeight: 120,
    });
    this.load.spritesheet('car03-companion', `${base}/characters/companion-spritesheet.png`, {
      frameWidth: 96, frameHeight: 120,
    });
    this.load.spritesheet('car03-commuters', `${base}/characters/commuters-spritesheet.png`, {
      frameWidth: 96, frameHeight: 120,
    });
    this.load.spritesheet('car03-scanner', `${base}/scanner/scanner-unit.png`, {
      frameWidth: 128, frameHeight: 120,
    });
    this.load.image('car03-city-view', `${base}/carriage/carriage-city-view.png`);
    this.load.image('car03-back-wall', `${base}/carriage/carriage-back-wall.png`);
    this.load.image('car03-doors-seats', `${base}/carriage/carriage-doors-seats.png`);
    this.load.image('car03-floor-deck', `${base}/carriage/carriage-floor-deck.png`);
    this.load.image('car03-ceiling-rail', `${base}/carriage/carriage-ceiling-rail.png`);
    this.load.image('car03-alert-overlay', `${base}/carriage/carriage-alert-overlay.png`);
    this.load.image('car03-foreground-poles', `${base}/carriage/carriage-foreground-poles.png`);
  }

  // ------------------------------------------------------------------
  create() {
    this.model = createCar03V2Model();
    this.defaults = CAR03_V2_DEFAULTS;
    this.reduceFlash = false;
    try {
      this.reduceFlash = new URLSearchParams(window.location.search).get('reduceFlash') === '1';
    } catch { /* non-browser guard */ }

    this._createAnims();
    this._initKeys();
    this._buildLayers();
    this._buildWorldGraphics();
    this._buildScanners();
    this._buildActors();
    this._buildUi();
    this._initTransients();

    // Camera: one 4800×600 world; the bay-lock logic lives in update().
    this.cameras.main.setBounds(0, 0, WORLD_LENGTH, GAME_H);
    this.cameras.main.setBackgroundColor('#0a1015');
    this.cameras.main.scrollX = MAX_SCROLL; // intro frames the last door

    this._exposeRenderToText();
  }

  // ------------------------------------------------------------------
  // Animations (ASSET_MANIFEST characters). Guarded so create() re-runs
  // never double-register.
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
    // Hero / companion: idle 0-3 @6fps, walk 4-11 @12fps.
    add('c03-hero-idle', 'car03-hero', 0, 3, 6);
    add('c03-hero-walk', 'car03-hero', 4, 11, 12);
    add('c03-comp-idle', 'car03-companion', 0, 3, 6);
    add('c03-comp-walk', 'car03-companion', 4, 11, 12);
    // Commuters rows: suit r0 walk 4-11; trenchcoat r1 walk 16-23;
    // casual r2 walk 24-27, panic 28-35.
    add('c03-suit-walk', 'car03-commuters', 4, 11, 12);
    add('c03-trench-walk', 'car03-commuters', 16, 23, 12);
    add('c03-casual-walk', 'car03-commuters', 24, 27, 6);
    add('c03-casual-panic', 'car03-commuters', 28, 35, 12);
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
    // Edge-triggered E/R via the plugin's own keydown events. JustDown
    // polling can lose an instantaneous down+up pair that lands between
    // frames; queueing from the event guarantees one press = one action.
    this._eQueued = false;
    this._rQueued = false;
    kb.on('keydown-E', () => { this._eQueued = true; });
    kb.on('keydown-R', () => { this._rQueued = true; });
  }

  // ------------------------------------------------------------------
  // Carriage layers — tileSprites, repeat-x, manifest depths/scroll
  // factors. The tiles are screen-anchored (scrollFactor 0) and their
  // tilePositionX is driven from the camera scroll each frame, which is
  // the version-robust way to express the manifest parallax contract.
  // ------------------------------------------------------------------
  _buildLayers() {
    const defs = [
      { key: 'car03-city-view', depth: 0, scroll: 0.4 },
      { key: 'car03-back-wall', depth: 100, scroll: 1 },
      { key: 'car03-doors-seats', depth: 200, scroll: 1 },
      { key: 'car03-floor-deck', depth: 300, scroll: 1 },
      { key: 'car03-ceiling-rail', depth: 600, scroll: 1 },
      { key: 'car03-alert-overlay', depth: 650, scroll: 1 },
      { key: 'car03-foreground-poles', depth: 700, scroll: 1 },
    ];
    this.layers = [];
    for (const d of defs) {
      const tile = this.add.tileSprite(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, d.key);
      tile.setOrigin(0.5, 0.5);
      tile.setScrollFactor(0, 0);
      tile.setDepth(d.depth);
      if (d.key === 'car03-alert-overlay') tile.setAlpha(0);
      if (d.key === 'car03-city-view') tile.setAlpha(0.9);
      this.layers.push({ tile, scroll: d.scroll });
      if (d.key === 'car03-alert-overlay') this.alertOverlay = tile;
    }
  }

  // ------------------------------------------------------------------
  // World-space dynamic graphics (all drawn every frame from snapshot).
  // ------------------------------------------------------------------
  _buildWorldGraphics() {
    this.seamG = this.add.graphics().setDepth(250);
    drawBaySeams(this.seamG);
    this.sweepG = this.add.graphics().setDepth(260);
    this.doorLightG = this.add.graphics().setDepth(230);
    this.doorG = this.add.graphics().setDepth(240);
    this.archG = this.add.graphics().setDepth(610);
    this.beamG = this.add.graphics().setDepth(340);
    this.ribbonG = this.add.graphics().setDepth(545);
    this.luggageG = this.add.graphics().setDepth(560);
    this.targetG = this.add.graphics().setDepth(860);
    this.pipsG = this.add.graphics().setDepth(850);
    this.scarfG = this.add.graphics().setDepth(870);
    this.demoGlowG = this.add.graphics().setDepth(565);
  }

  // ------------------------------------------------------------------
  // Scanners — ceiling-rail sprites (depth 620) + world-space result
  // panel text + status icon graphics attached to each unit.
  // ------------------------------------------------------------------
  _buildScanners() {
    this.scannerSprites = new Map();
    this.scannerPanels = new Map();
    const snap = this.model.snapshot();
    for (const sc of snap.scanners) {
      const spr = this.add.sprite(sc.x, SCANNER_TOP_Y, 'car03-scanner', 0);
      spr.setOrigin(0.5, 0);
      spr.setDepth(620);
      this.scannerSprites.set(sc.id, spr);

      const text = this.add.text(sc.x, 186, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: TXT.white,
        backgroundColor: TXT.panel,
        padding: { x: 8, y: 4 },
        align: 'center',
      });
      text.setOrigin(0.5, 0);
      text.setDepth(830);
      text.setVisible(false);
      const icon = this.add.graphics().setDepth(831);
      this.scannerPanels.set(sc.id, { text, icon });
    }
  }

  // ------------------------------------------------------------------
  // Actors — hero, companion, three groups (member sprites each), and
  // the Beat 0 demo actors (lone commuter + three-person group).
  // ------------------------------------------------------------------
  _buildActors() {
    const snap = this.model.snapshot();

    this.hero = this.add.sprite(0, 0, 'car03-hero');
    this.hero.setOrigin(0.5, 0.916);
    this.hero.setDepth(laneDepth(LANE_NEAR));
    this.hero.play('c03-hero-idle');

    this.companionSpr = this.add.sprite(0, 0, 'car03-companion');
    this.companionSpr.setOrigin(0.5, 0.916);
    this.companionSpr.setDepth(laneDepth(LANE_NEAR));
    this.companionSpr.play('c03-comp-idle');

    this.groupSprites = new Map();
    for (const g of snap.groups) {
      const arr = [];
      for (let i = 0; i < g.members; i++) {
        const s = this.add.sprite(0, 0, 'car03-commuters');
        s.setOrigin(0.5, 0.916);
        s.play(GROUP_ANIM[g.id] ?? 'c03-suit-walk');
        arr.push(s);
      }
      this.groupSprites.set(g.id, arr);
    }

    // Beat 0 environmental demonstration actors.
    this.demoLone = this.add.sprite(0, 0, 'car03-commuters');
    this.demoLone.setOrigin(0.5, 0.916);
    this.demoLone.setDepth(laneDepth(LANE_NEAR));
    this.demoLone.play('c03-trench-walk');

    this.demoGroupSprs = [];
    for (let i = 0; i < 3; i++) {
      const s = this.add.sprite(0, 0, 'car03-commuters');
      s.setOrigin(0.5, 0.916);
      s.setDepth(laneDepth(LANE_NEAR));
      s.play('c03-suit-walk');
      this.demoGroupSprs.push(s);
    }
  }

  // ------------------------------------------------------------------
  // Screen-space UI: objective card, interaction prompt, Beat 0 caption,
  // flag stamp, flash/border overlays. All inside the safe area.
  // ------------------------------------------------------------------
  _buildUi() {
    const mono = '"Courier New", monospace';

    // Objective card (top-left safe area, max width 360, icon + text).
    this.objCardG = this.add.graphics().setDepth(900).setScrollFactor(0, 0);
    this.objIconG = this.add.graphics().setDepth(901).setScrollFactor(0, 0);
    this.objText = this.add.text(64, 16 + 13, '', {
      fontFamily: mono, fontSize: '24px', fontStyle: 'bold',
      color: TXT.white, wordWrap: { width: 280 }, lineSpacing: 2,
    });
    this.objText.setOrigin(0, 0.5).setDepth(901).setScrollFactor(0, 0);
    this._setObjectiveCard('REACH_THE_LAST_DOOR');

    // Interaction prompt (bottom-centre, ≥26px, visible E keycap).
    this.promptG = this.add.graphics().setDepth(900).setScrollFactor(0, 0);
    this.promptText = this.add.text(GAME_W / 2 + 26, GAME_H - 52, '', {
      fontFamily: mono, fontSize: '26px', fontStyle: 'bold', color: TXT.white,
    });
    this.promptText.setOrigin(0, 0.5).setDepth(901).setScrollFactor(0, 0);
    this._drawPromptKeycap();
    this._setPromptVisible(false);

    // Beat 0 caption (≤4s).
    this.captionText = this.add.text(GAME_W / 2, 96, CAPTION_TEXT, {
      fontFamily: mono, fontSize: '28px', fontStyle: 'bold', color: TXT.white,
      backgroundColor: TXT.panel, padding: { x: 12, y: 6 },
    });
    this.captionText.setOrigin(0.5).setDepth(902).setScrollFactor(0, 0);
    this.captionText.setVisible(false);

    // Flag stamp (centre, shown during the 350ms freeze).
    this.stampG = this.add.graphics().setDepth(950).setScrollFactor(0, 0);
    this.stampText = this.add.text(GAME_W / 2, GAME_H / 2 - 40, FLAG_STAMP_TEXT, {
      fontFamily: mono, fontSize: '32px', fontStyle: 'bold', color: TXT.alert,
      backgroundColor: TXT.ink, padding: { x: 14, y: 10 },
    });
    this.stampText.setOrigin(0.5).setDepth(951).setScrollFactor(0, 0);
    this.stampText.setVisible(false);

    // Full red flash (normal mode) / steady border pulse (reduceFlash).
    this.flashG = this.add.graphics().setDepth(940).setScrollFactor(0, 0);
  }

  _drawPromptKeycap() {
    const g = this.promptG;
    const kx = GAME_W / 2 - 60;
    const ky = GAME_H - 52;
    g.clear();
    g.fillStyle(CAR.ENAMEL_MID, 1);
    g.fillRoundedRect(kx - 17, ky - 17, 34, 34, 5);
    g.lineStyle(2, CAR.STEEL_HI, 1);
    g.strokeRoundedRect(kx - 17, ky - 17, 34, 34, 5);
    g.fillStyle(CAR.HERO_BASE, 1);
    // 'E' glyph drawn as vector bars so the keycap needs no font.
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
    const label = OBJECTIVE_TEXT[objectiveId] ?? objectiveId;
    this.objText.setText(label);
    const w = Math.min(360, this.objText.width + 64);
    const h = Math.max(52, this.objText.height + 22);
    const g = this.objCardG;
    g.clear();
    g.fillStyle(CAR.VOID_LIFT, 0.88);
    g.fillRoundedRect(16, 16, w, h, 8);
    g.lineStyle(2, CAR.STEEL_MID, 0.9);
    g.strokeRoundedRect(16, 16, w, h, 8);
    // Left accent bar — icon lane.
    g.fillStyle(CAR.LAMP_OK, 0.9);
    g.fillRect(16, 16, 4, h);
    this.objText.setPosition(64, 16 + h / 2);
    this.objIconG.clear();
    drawObjectiveIcon(this.objIconG, objectiveId, 40, 16 + h / 2);
  }

  // ------------------------------------------------------------------
  // Transient scene-side state (everything rebuilt/zeroed by fullReset).
  // ------------------------------------------------------------------
  _initTransients() {
    this.acc = 0;
    this.intro = { phase: 'hold-final-door', t: 0 };
    this.camTarget = -1;
    this.camEase = null;
    this.sweep = null; // { x, alpha }
    this.ribbonFade = 0;
    this.lastRibbon = null; // { x1, x2, y }
    this.slowMoLeft = 0;
    this.doorOpenK = 0;
    this.doorOpening = false;
    this.demoFade = 1;
    this.demoFading = false;
    this.prevTargetEligibleFree = false;
    this.lastScannerState = new Map();
    this.groupLastX = new Map();
    this.pipPulse = 0;
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
    };
  }

  // ------------------------------------------------------------------
  // Main loop — fixed-step feed of real frame delta into the model.
  // ------------------------------------------------------------------
  update(time, delta) {
    const rawDt = Math.min(delta || STEP_MS, 100);
    // Completion slow-motion: feed the world at 70% for 500ms.
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
    if (steps === 8) this.acc = 0; // spiral-of-death guard

    // Edge-triggered E (match/release) and R (full reset).
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
    this._updateTargetAudio(snap);
    this._updateWarningAudio(snap);
    this._render(snap, time);
  }

  // ------------------------------------------------------------------
  // Camera — intro frames the last door, settles on the first scanner
  // bay for the Beat 0 demonstration, then bay-locks to the player's
  // bay (target = clamp(bayIndex*960, 0, 3840), 500ms ease on change).
  // ------------------------------------------------------------------
  _updateCamera(dt, snap) {
    const cam = this.cameras.main;

    if (this.intro.phase === 'hold-final-door') {
      this.intro.t += dt;
      cam.scrollX = MAX_SCROLL;
      if (this.intro.t >= 500) {
        this.intro.phase = 'pan-demo';
        this.intro.t = 0;
      }
      return;
    }
    if (this.intro.phase === 'pan-demo') {
      this.intro.t += dt;
      const k = Math.min(1, this.intro.t / 1000);
      cam.scrollX = MAX_SCROLL + (BAY_WIDTH - MAX_SCROLL) * easeInOut(k);
      if (k >= 1) {
        this.intro.phase = 'demo-hold';
        cam.scrollX = BAY_WIDTH;
      }
      return;
    }

    let target;
    if (this.intro.phase === 'demo-hold') {
      // During Beat 0 the camera belongs to the demonstration bay (SC1);
      // if the player has already walked further, follow their bay.
      target = Math.max(BAY_WIDTH, Phaser.Math.Clamp(snap.bayIndex * BAY_WIDTH, 0, MAX_SCROLL));
      if (snap.demo.complete) this.intro.phase = 'done';
    } else {
      target = Phaser.Math.Clamp(snap.bayIndex * BAY_WIDTH, 0, MAX_SCROLL);
    }

    if (target !== this.camTarget) {
      const from = cam.scrollX;
      const movingRight = target > from;
      this.camTarget = target;
      this.camEase = { from, to: target, t: 0 };
      // Bay-door cyan sweep at the crossed boundary.
      const boundary = movingRight ? target : target + BAY_WIDTH;
      if (this.intro.phase === 'done') this.sweep = { x: boundary, alpha: 1 };
    }
    if (this.camEase) {
      this.camEase.t += dt;
      const k = Math.min(1, this.camEase.t / 500);
      cam.scrollX = this.camEase.from + (this.camEase.to - this.camEase.from) * easeInOut(k);
      if (k >= 1) this.camEase = null;
    }
  }

  // ------------------------------------------------------------------
  // Audio triggers driven by snapshot transitions.
  // ------------------------------------------------------------------
  _updateTargetAudio(snap) {
    const freeEligible = snap.target.eligible && !snap.match.active;
    if (freeEligible && !this.prevTargetEligibleFree) {
      car03Audio.matchPreview(); // two-note footstep preview
    }
    this.prevTargetEligibleFree = freeEligible;
  }

  _updateWarningAudio(snap) {
    for (const sc of snap.scanners) {
      const prev = this.lastScannerState.get(sc.id) ?? 'idle';
      if (sc.state === 'warning' && prev !== 'warning') {
        car03Audio.warningTicks();
      }
      this.lastScannerState.set(sc.id, sc.state);
    }
  }

  // ------------------------------------------------------------------
  // Event reactions (one-shot audio/visual feedback).
  // ------------------------------------------------------------------
  _onEvent(ev) {
    switch (ev.type) {
      case 'match-started':
        car03Audio.matchSnap();
        this.ribbonFade = 0;
        break;
      case 'match-released':
        car03Audio.release();
        if (this.lastRibbon) this.ribbonFade = 1;
        break;
      case 'duo-step':
        car03Audio.duoStep(ev.payload?.steps ?? 1);
        this.pipPulse = 1;
        break;
      case 'duo-reset':
        car03Audio.duoReset();
        break;
      case 'flagged':
        car03Audio.flagStamp();
        this.cameras.main.shake(160, 0.0035); // ~3px impulse
        break;
      case 'checkpoint-return':
        car03Audio.checkpointReturn();
        break;
      case 'beat-advance':
        this._setObjectiveCard(ev.payload?.objectiveId ?? 'REACH_THE_LAST_DOOR');
        car03Audio.uiTick();
        break;
      case 'alert':
        car03Audio.startAlarm();
        break;
      case 'arch-accepted':
        car03Audio.archAccept();
        break;
      case 'door-open':
        car03Audio.doorOpen();
        this.cameras.main.shake(140, 0.003); // ~3px impulse
        this.doorOpening = true;
        break;
      case 'complete':
        car03Audio.stopAlarm();
        car03Audio.completeTone();
        this.slowMoLeft = 500;
        break;
      case 'demo-complete':
        this.demoFading = true;
        break;
      case 'interact-noop':
        car03Audio.uiTick();
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------
  // Full reset (R): model baseline + rebuilt dynamic visuals + camera
  // scrollX 0 + time.scale 1.
  // ------------------------------------------------------------------
  fullReset() {
    this.model.reset();
    this.model.drainEvents(); // discard the 'reset' event
    this._eQueued = false;
    this._rQueued = false;
    car03Audio.reset();

    this.time.timeScale = 1;
    this.anims.globalTimeScale = 1;
    // Camera shake effects are short (140-160ms) and self-terminating;
    // Phaser 3.90 exposes no camera stopFX/stopShake, so let them decay.
    this.cameras.main.scrollX = 0;

    this._initTransients();
    this.intro = { phase: 'done', t: 0 }; // no intro replay; camera at 0
    this.camTarget = 0;

    this._setObjectiveCard('REACH_THE_LAST_DOOR');
    this.alertOverlay.setAlpha(0);
    // Actor sprites return to a neutral pose; positions re-render next
    // frame from the reset snapshot.
    for (const arr of this.groupSprites.values()) {
      for (const s of arr) {
        s.setAngle(0);
        s.setFlipX(false);
        s.setVisible(true);
      }
    }
    this.demoLone.setVisible(true).setAngle(0).setFlipX(false).setAlpha(1);
    for (const s of this.demoGroupSprs) s.setVisible(true).setAngle(0).setFlipX(false).setAlpha(1);
    this.hero.setVisible(true).setAngle(0).setAlpha(1);
    this.companionSpr.setVisible(true).setAngle(0).setAlpha(1);
    this.stampText.setVisible(false);
    this.stampG.clear();
    this.flashG.clear();
    this.ribbonG.clear();
    this.targetG.clear();
    this.pipsG.clear();
    this.luggageG.clear();
    this.scarfG.clear();
    this.demoGlowG.clear();
    this.sweepG.clear();
  }

  // ------------------------------------------------------------------
  // Render — everything derives from the snapshot; no scene-side game
  // state mutates the model.
  // ------------------------------------------------------------------
  _render(snap, time) {
    const cam = this.cameras.main;

    // 1) Parallax carriage layers.
    for (const layer of this.layers) {
      layer.tile.tilePositionX = cam.scrollX * layer.scroll;
    }
    this.alertOverlay.setAlpha(
      snap.alertActive ? 0.3 + 0.12 * Math.sin(time * 0.006) : 0,
    );

    // 2) Bay sweep fade.
    if (this.sweep) {
      this.sweep.alpha -= 0.032;
      this.sweepG.clear();
      drawBaySweep(this.sweepG, this.sweep.x, Math.max(0, this.sweep.alpha));
      if (this.sweep.alpha <= 0) this.sweep = null;
    } else {
      this.sweepG.clear();
    }

    // 3) Scanners: lens cell, beam, result panel, status icon.
    this._renderScanners(snap, time);

    // 4) Final door + calibration arch + luggage.
    if (this.doorOpening && this.doorOpenK < 1) {
      this.doorOpenK = Math.min(1, this.doorOpenK + 0.025);
    }
    drawFinalDoor(this.doorG, this.doorLightG, this.doorOpenK, snap.complete);
    const arch = snap.scanners.find((s) => s.kind === 'arch');
    this.archG.clear();
    drawArch(this.archG, arch ? arch.x : 3520, arch ? arch.state === 'safe' : false,
      0.5 + 0.5 * Math.sin(time * 0.004));
    this.luggageG.clear();
    if (snap.nearRouteBlocked) {
      drawLuggage(this.luggageG, LUGGAGE_X, laneToY(LANE_NEAR), 0.5 + 0.5 * Math.sin(time * 0.008));
    }

    // 5) Actors.
    this._renderGroups(snap, time);
    this._renderDemo(snap, time);
    this._renderCompanion(snap, time);
    this._renderHero(snap, time);

    // 6) Match ribbon (or its release fade).
    this._renderRibbon(snap, time);

    // 7) Targeting outline + prompt.
    this._renderTargeting(snap, time);

    // 8) Duo pips.
    this._renderDuoPips(snap, time);

    // 9) Beat 4 companion scarf flash + persistent footstep icon.
    this._renderScarfFlash(snap, time);

    // 10) Flag freeze, flash/border, caption.
    this._renderFlag(snap, time);
    this._renderCaption(snap);
  }

  // ------------------------------------------------------------------
  _scannerCell(sc, snap) {
    if (sc.state === 'safe') return 1;
    if (sc.state === 'flagged') return 2;
    // The accepted crossing keeps the final lens cyan through the outro.
    if (snap.complete && sc.id === 'FINAL') return 1;
    // During the alert the final scanner stays visibly red until the
    // pair earns the cyan crossing (Design Lock Beat 4).
    if (snap.alertActive && sc.id === 'FINAL') return 2;
    return 0;
  }

  _beamStyle(sc) {
    switch (sc.state) {
      case 'safe': return { color: CAR.LAMP_OK, alpha: 0.20 };
      case 'warning': return { color: CAR.LAMP_WARN, alpha: 0.24 };
      case 'flagged': return { color: CAR.LAMP_ALERT, alpha: 0.30 };
      default:
        if (sc.kind === 'arch') return { color: CAR.LAMP_OK, alpha: 0.05 };
        return { color: CAR.LAMP_WARN, alpha: 0.07 };
    }
  }

  _renderScanners(snap, time) {
    this.beamG.clear();
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.008);
    for (const sc of snap.scanners) {
      const spr = this.scannerSprites.get(sc.id);
      if (spr) spr.setFrame(this._scannerCell(sc, snap));
      const beam = (snap.complete && sc.id === 'FINAL')
        ? { color: CAR.LAMP_OK, alpha: 0.2 }
        : this._beamStyle(sc);
      drawBeam(this.beamG, sc.x, SCANNER_TOP_Y + BEAM_ORIGIN_DY, beam.color, beam.alpha);

      const panel = this.scannerPanels.get(sc.id);
      if (!panel) continue;
      if (sc.panelText) {
        panel.text.setText(sc.panelText);
        panel.text.setVisible(true);
        // Status colour on the word reinforces (never replaces) the shape.
        if (sc.state === 'safe') panel.text.setColor(TXT.ok);
        else if (sc.state === 'warning') panel.text.setColor(TXT.warn);
        else if (sc.state === 'flagged') panel.text.setColor(TXT.alert);
        else panel.text.setColor(TXT.white);
        panel.icon.clear();
        drawStatusIcon(panel.icon, sc.state, sc.x - panel.text.width / 2 - 20, 198, pulse);
      } else {
        panel.text.setVisible(false);
        panel.icon.clear();
      }
    }
  }

  // ------------------------------------------------------------------
  _memberOffset(i, count) {
    return (i - (count - 1) / 2) * GROUP_SPACING;
  }

  _renderGroups(snap, time) {
    for (const g of snap.groups) {
      const sprites = this.groupSprites.get(g.id);
      if (!sprites) continue;
      const prevX = this.groupLastX.get(g.id);
      const movingRight = prevX === undefined ? true : g.x >= prevX;
      this.groupLastX.set(g.id, g.x);
      const y = laneToY(g.lane);
      const scale = laneScale(g.lane);
      const depth = laneDepth(g.lane);
      for (let i = 0; i < sprites.length; i++) {
        const s = sprites[i];
        const mx = g.x + this._memberOffset(i, sprites.length);
        if (mx < -100 || mx > WORLD_LENGTH + 100) {
          s.setVisible(false);
          continue;
        }
        s.setVisible(true);
        s.setPosition(mx, y);
        s.setScale(scale);
        s.setDepth(depth);
        if (g.scattered) {
          // Alert dispersal: panic frames + ±15° outward lean.
          if (s.anims.currentAnim?.key !== 'c03-casual-panic') s.play('c03-casual-panic');
          s.setAngle(i % 2 === 0 ? 15 : -15);
          s.setFlipX(!movingRight);
        } else {
          s.setAngle(0);
          s.setFlipX(!movingRight);
          const key = GROUP_ANIM[g.id] ?? 'c03-suit-walk';
          if (s.anims.currentAnim?.key !== key) s.play(key);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Beat 0 demonstration — positions reconstructed from MODEL time
  // (snapshot.elapsedMs) and the model's own exported demo constants, so
  // the choreography stays driven by the model timeline rather than by a
  // second copy of the rules.
  // ------------------------------------------------------------------
  _demoPositions(snap) {
    const D = this.defaults;
    const sc1 = snap.scanners.find((s) => s.id === 'SC1');
    const sc1x = sc1 ? sc1.x : 1560;
    const tSec = snap.elapsedMs / 1000;
    const tRedirect = (sc1x - D.demoLoneStartX) / D.demoLoneVx;
    const flagHoldSec = 0.7;

    let loneX = D.demoLoneStartX + D.demoLoneVx * tSec;
    let loneFacing = 1;
    let loneVisible = true;
    if (tSec >= tRedirect) {
      // Redirected to the bay safe line, holds while SC1 shows ALONE,
      // then walks gently left off-view.
      loneX = 1080;
      loneFacing = 1;
      if (tSec >= tRedirect + flagHoldSec) {
        loneX = 1080 - D.demoLoneVx * (tSec - tRedirect - flagHoldSec);
        loneFacing = -1;
        if (loneX < -60) loneVisible = false;
      }
    }

    let groupX = D.demoGroupStartX;
    let groupVisible = false;
    if (snap.elapsedMs >= D.demoGroupSpawnMs) {
      groupVisible = true;
      const gt = (snap.elapsedMs - D.demoGroupSpawnMs) / 1000;
      groupX = Math.min(D.demoGroupStartX + D.demoGroupVx * gt, D.demoGroupStopX);
    }
    return { loneX, loneFacing, loneVisible, groupX, groupVisible };
  }

  _renderDemo(snap, time) {
    if (this.demoFading && this.demoFade > 0) {
      this.demoFade = Math.max(0, this.demoFade - 0.02);
    }
    const fade = this.demoFade;
    const demoOver = snap.demo.complete && fade <= 0;
    this.demoGlowG.clear();

    if (demoOver) {
      this.demoLone.setVisible(false);
      for (const s of this.demoGroupSprs) s.setVisible(false);
      return;
    }

    const d = this._demoPositions(snap);
    const y = laneToY(LANE_NEAR);

    this.demoLone.setVisible(d.loneVisible && fade > 0);
    this.demoLone.setAlpha(fade);
    this.demoLone.setPosition(d.loneX, y);
    this.demoLone.setFlipX(d.loneFacing < 0);

    for (let i = 0; i < this.demoGroupSprs.length; i++) {
      const s = this.demoGroupSprs[i];
      s.setVisible(d.groupVisible && fade > 0);
      s.setAlpha(fade);
      s.setPosition(d.groupX + this._memberOffset(i, this.demoGroupSprs.length), y);
      s.setFlipX(false);
    }

    // Linked-footprint pulse over the demo group while SC1 says PATTERN OK.
    const sc1 = snap.scanners.find((s) => s.id === 'SC1');
    if (sc1 && sc1.state === 'safe' && !snap.demo.complete) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.008);
      drawLinkedFootprints(this.demoGlowG, d.groupX, y - 150, CAR.LAMP_OK, 0.6 + 0.3 * pulse, 1.1, pulse);
    }
  }

  // ------------------------------------------------------------------
  _renderHero(snap, time) {
    const p = snap.player;
    let y = laneToY(p.lane);
    let scale = laneScale(p.lane);
    let depth = laneDepth(p.lane);
    if (p.laneTransition) {
      const lt = p.laneTransition;
      const k = 1 - lt.msLeft / Math.max(1, lt.msTotal);
      const v = lerpLane(lt.from, lt.to, k);
      y = v.y; scale = v.scale; depth = v.depth;
    }
    this.hero.setPosition(p.x, y);
    this.hero.setScale(scale);
    this.hero.setDepth(depth);
    this.hero.setFlipX(p.facing < 0);
    this.hero.setVisible(true);

    // Visible 250ms step-in: a small committed lean toward the target.
    if (snap.match.active && snap.match.stepInMsLeft > 0) {
      const prog = 1 - snap.match.stepInMsLeft / 250;
      this.hero.x += Math.sin(prog * Math.PI) * 10 * p.facing;
    }

    const moving = Math.abs(p.vx) > 5;
    const want = moving ? 'c03-hero-walk' : 'c03-hero-idle';
    if (this.hero.anims.currentAnim?.key !== want) this.hero.play(want);

    // The flag freeze visually halts every animation for 350ms.
    this.anims.globalTimeScale = p.frozenMsLeft > 0 ? 0 : 1;
  }

  _renderCompanion(snap, time) {
    const c = snap.companion;
    const y = laneToY(c.lane);
    this.companionSpr.setPosition(c.x, y);
    this.companionSpr.setScale(laneScale(c.lane));
    this.companionSpr.setDepth(laneDepth(c.lane));
    this.companionSpr.setVisible(true);

    let facing = c.facing;
    if (snap.complete) facing = -1; // glance back at the player in the outro
    this.companionSpr.setFlipX(facing < 0);

    const matchedMoving = snap.match.active && snap.match.kind === 'companion'
      && Math.abs(snap.player.vx) > 5;
    const want = matchedMoving ? 'c03-comp-walk' : 'c03-comp-idle';
    if (this.companionSpr.anims.currentAnim?.key !== want) this.companionSpr.play(want);
  }

  // ------------------------------------------------------------------
  _targetXs(snap) {
    // Returns { x, lane, halfW } for a target id, or null.
    const t = snap.match.active
      ? { kind: snap.match.kind, id: snap.match.targetId }
      : snap.target;
    if (!t || !t.kind) return null;
    if (t.kind === 'group') {
      const g = snap.groups.find((gg) => gg.id === t.id);
      if (!g) return null;
      return { x: g.x, lane: g.lane, halfW: ((g.members - 1) * GROUP_SPACING + 96) / 2 + 22 };
    }
    return { x: snap.companion.x, lane: snap.companion.lane, halfW: 62 };
  }

  _renderTargeting(snap, time) {
    this.targetG.clear();
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.007);
    const bob = Math.sin(time * 0.005) * 4;

    let promptLabel = null;

    if (snap.match.active) {
      // Outline the matched partner; E now means RELEASE.
      const tgt = this._targetXs(snap);
      if (tgt) {
        const y = laneToY(tgt.lane);
        const scale = laneScale(tgt.lane);
        drawTargetOutline(this.targetG, tgt.x, y + 12 * scale, tgt.halfW * 2, 150 * scale, pulse);
        promptLabel = '[E] RELEASE';
      }
    } else if (snap.target.eligible) {
      const tgt = this._targetXs(snap);
      if (tgt) {
        const y = laneToY(tgt.lane);
        const scale = laneScale(tgt.lane);
        drawTargetOutline(this.targetG, tgt.x, y + 12 * scale, tgt.halfW * 2, 150 * scale, pulse);
        // Small footstep icon bobbing above the target's feet.
        drawFootsteps(this.targetG, tgt.x, y - 150 * scale + bob, CAR.LAMP_OK, 0.95, 1.1);
        promptLabel = '[E] MATCH PACE';
      }
    }

    if (promptLabel) {
      this.promptText.setText(promptLabel);
      this._setPromptVisible(true);
    } else {
      this._setPromptVisible(false);
    }
  }

  // ------------------------------------------------------------------
  _renderRibbon(snap, time) {
    this.ribbonG.clear();
    const phase = time * 0.006;
    if (snap.match.active) {
      const tgt = this._targetXs(snap);
      if (tgt) {
        // The ribbon spans the whole linked formation — when the player
        // snaps to a group's centre the link still reads as a connected
        // footprint strip, not a zero-length dot.
        const lo = Math.min(snap.player.x, tgt.x) - (tgt.halfW - 20);
        const hi = Math.max(snap.player.x, tgt.x) + (tgt.halfW - 20);
        const y = laneToY(snap.player.lane) + 10;
        drawRibbon(this.ribbonG, lo, hi, y, 1, phase);
        this.lastRibbon = { x1: lo, x2: hi, y };
      }
    } else if (this.ribbonFade > 0 && this.lastRibbon) {
      // Release: the ribbon snaps and fades over ~250ms.
      this.ribbonFade = Math.max(0, this.ribbonFade - 0.06);
      const r = this.lastRibbon;
      drawRibbon(this.ribbonG, r.x1, r.x2, r.y, this.ribbonFade * 0.8, phase);
      if (this.ribbonFade === 0) this.lastRibbon = null;
    }
  }

  // ------------------------------------------------------------------
  _renderDuoPips(snap, time) {
    this.pipsG.clear();
    if (this.pipPulse > 0) this.pipPulse = Math.max(0, this.pipPulse - 0.05);
    if (!(snap.match.active && snap.match.kind === 'companion')) return;
    const midX = (snap.player.x + snap.companion.x) / 2;
    const y = laneToY(snap.player.lane) - 175 * laneScale(snap.player.lane);
    drawDuoPips(this.pipsG, midX, y, snap.duoSteps, this.pipPulse);
  }

  // ------------------------------------------------------------------
  _renderScarfFlash(snap, time) {
    this.scarfG.clear();
    // Beat 4 identification aid: teal scarf flash + persistent footstep
    // icon on the separated companion (never a large glowing circle).
    if (snap.beatId >= 4 && !snap.complete
      && (snap.companion.state === 'separated' || snap.companion.state === 'waiting')) {
      const c = snap.companion;
      const y = laneToY(c.lane);
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
      const scale = laneScale(c.lane);
      this.scarfG.fillStyle(CAR.LAMP_OK, 0.25 + 0.3 * pulse);
      this.scarfG.fillRoundedRect(c.x - 14 * scale, y - 92 * scale, 28 * scale, 22 * scale, 6);
      drawFootsteps(this.scarfG, c.x, y - 150 * scale + Math.sin(time * 0.005) * 4,
        CAR.LAMP_OK, 0.9, 1.0);
    }
  }

  // ------------------------------------------------------------------
  _renderFlag(snap, time) {
    this.flashG.clear();
    const frozen = snap.player.frozenMsLeft > 0;
    this.stampText.setVisible(frozen);
    if (!frozen) return;

    // Centre stamp with a border box.
    const g = this.stampG;
    g.clear();
    g.lineStyle(4, CAR.LAMP_ALERT, 0.95);
    const tw = this.stampText.width;
    const th = this.stampText.height;
    g.strokeRect(GAME_W / 2 - tw / 2 - 22, GAME_H / 2 - 40 - th / 2 - 16, tw + 44, th + 32);

    if (this.reduceFlash) {
      // Reduce-flash mode: steady border pulse instead of a full red flash.
      const pulse = 0.55 + 0.25 * Math.sin(time * 0.012);
      drawAlertBorder(this.flashG, pulse);
    } else {
      const a = Math.min(0.22, (snap.player.frozenMsLeft / 350) * 0.22);
      this.flashG.fillStyle(CAR.LAMP_ALERT, a);
      this.flashG.fillRect(0, 0, GAME_W, GAME_H);
    }
  }

  _renderCaption(snap) {
    const t = snap.elapsedMs;
    const show = !snap.demo.complete && t >= 500 && t <= 4500;
    this.captionText.setVisible(show);
  }

  // ------------------------------------------------------------------
  // Browser diagnostic surface — read-only, never mutates the model.
  // ------------------------------------------------------------------
  _exposeRenderToText() {
    if (typeof window === 'undefined') return;
    const self = this;
    window.render_game_to_text = function car03V2Render() {
      if (!self.model) return JSON.stringify({ state: 'uninitialised' });
      return JSON.stringify({
        ...self.model.snapshot(),
        qaState: null,
        reduceFlash: self.reduceFlash,
      });
    };
  }
}
