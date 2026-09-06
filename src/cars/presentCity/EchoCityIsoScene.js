// Chapter 3 // ECHO CITY ISO — scene (pure consumer of echoCityIsoModel).
//
// Authoritative spec: docs/CHAPTER_03_KIMI_ISOMETRIC_ECHO_CITY_WORK_PACKAGE.md
//
//   - fixed-camera three-quarter isometric civic block around the central
//     clock; camera moves only between authored framing beats, never follows
//     the player down a corridor;
//   - pointer grammar: click ground = walk, hover = cyan outline + local
//     prompt, hold on a source = observe, click receiver = transplant,
//     right-click/Esc = cancel/release, E = keyboard alternative, R = reset;
//   - fixed-step feed of real frame delta into model.update(dt, input);
//   - events from model.drainEvents() drive one-shot audio/visual feedback;
//   - window.render_game_to_text() = read-only snapshot JSON.
//
// All surfaces are greybox vector blockout drawn through echoCityIsoArt.js;
// the Gate 5 art pass replaces them with the Blender-rendered layers without
// touching mechanics.

import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../../constants.js';
import { createEchoCityIsoModel, ISO_POINTS, COURIER_PATH, FIELD } from './echoCityIsoModel.js';
import { car03Audio } from './car03Audio.js';
import {
  ISO_COL, ITXT,
  strokePoly, drawGroundDisc,
  drawActor, drawMarketGate, drawBus,
  drawCrosswalkSignal, drawBarrier, drawField,
  drawWitnessGate,
  drawFocusOutline, drawProgressRing, drawTracePath, drawMovePing, chipFrame,
} from './echoCityIsoArt.js';
import painterlyCityUrl from './assets-iso-v2/city_full_painterly_v6.webp';
import butchActorUrl from './assets-iso-v2/actor_butch.webp';
import maraActorUrl from './assets-iso-v2/actor_mara.webp';
import crowdAtlasUrl from './assets-iso/crowd_atlas.webp';

// Gate 5 baked layers (Blender offline renders, see docs/CHAPTER_03_KIMI_HANDOFF.md
// and ASSET_MANIFEST.json). Camera: yaw 45 / tilt 55 ortho; ppm = 1920/ortho_scale.
// Anchored each frame so the layer target projects to the image center.
const BAKED_LAYERS = [
  // One coherent PBR render: original CC0 Quaternius materials, rebuilt
  // plaza geometry, and one shared 45/55 camera calibration.
  { key: 'painterly-city', url: painterlyCityUrl, tx: 1.5, ty: 2, tz: 0.8, ppm: 1920 / 62, depth: -100 },
];

// Crowd atlas: tile 128x160, 24 rows (action idle/walk/interact x 8 dirs) x 8 frames.
// Baked at 128x160 with ortho_scale 2.5 -> 64 px per camera unit; person is 2.0u.
const CROWD_ROW = Object.freeze({ idle: 0, walk: 1, interact: 2 });
const CROWD_DIR = 7; // facing the fixed camera (verified in Gate 5 screenshots)
const CROWD_FOOT_ORIGIN = 154 / 160;

const STEP_MS = 16;
const COS45 = 0.7071;
const SINY = 0.5796; // cos45 * sin(55deg)
const ZSCALE = 0.5736; // cos(55deg)

const OBJECTIVE_TEXT = Object.freeze({
  OBSERVE_AND_COPY_A_CYCLE: 'WATCH THE COURIER. HOLD CLICK TO OBSERVE THE CYCLE.',
  TRANSPLANT_TO_THE_MARKET_GROUP: 'CARRY THE CYCLE. GIVE IT TO THE WAITING GROUP.',
  FOLLOW_THE_OPEN_ROUTE_TO_THE_CLOCK: 'THE SHUTTERS KNOW THE PATTERN. RETURN TO THE CLOCK.',
  REACH_THE_TRANSIT_INTERSECTION: 'CROSS THE BLOCK TO THE TRANSIT INTERSECTION.',
  COPY_AND_PLANT_BOTH_CYCLES: 'OBSERVE THE BUS AND THE CROSSING. PLANT BOTH CYCLES.',
  CROSS_WHEN_BOTH_CYCLES_RUN: 'CROSS WHILE THE BARRIER OPENS AND THE CROWD MOVES.',
  CROSS_THE_FIELD_TO_THE_SILENT_FOUNTAIN: 'THE CROSSING IS SAFE. GO EAST TO THE SILENT FOUNTAIN.',
  RECORD_YOUR_OWN_CYCLE: 'STAND ON THE AMBER MARK. RECORD YOUR OWN CYCLE.',
  WALK_A_ROUTE_AND_RING_THE_BELL: 'CLICK A SHORT ROUTE AROUND THE FOUNTAIN. RING THE BELL.',
  THE_ECHO_SHOWS_YOUR_CYCLE: 'YOUR ECHO SHOWS THE SQUARE WHAT YOU TAUGHT IT.',
  SHARE_YOUR_CYCLE_WITH_MARA: 'STAND ON THE CYAN PAD. SHARE YOUR CYCLE WITH MARA.',
  REUNION: 'YOU ALWAYS WALKED HALF A STEP AHEAD.',
});

const DISTRICT_TITLE = Object.freeze({
  TRAIN: 'TRAIN THRESHOLD',
  MARKET: 'LIVING MARKET',
  CLOCK: 'CENTRAL CLOCK',
  TRANSIT: 'TRANSIT INTERSECTION',
  FOUNTAIN: 'SILENT FOUNTAIN',
});

// Authored camera framings. The clock stays inside every ordinary beat.
// Solved numerically: clock head (6.0u above base) stays >= 30px on screen
// while each district's corners stay inside the 960x600 frame.
const CAMERA_BEATS = Object.freeze({
  entry: Object.freeze({ cx: -3.5, cy: -10.5, ppm: 28 }),
  block: Object.freeze({ cx: 1.5, cy: 0.5, ppm: 30 }),
  market: Object.freeze({ cx: -19, cy: -1, ppm: 31 }),
  transit: Object.freeze({ cx: 0.5, cy: 17, ppm: 30 }),
  fountain: Object.freeze({ cx: 18, cy: 4.5, ppm: 20 }),
  breather: Object.freeze({ cx: -4, cy: 6.5, ppm: 16.5 }),
  reunion: Object.freeze({ cx: 18, cy: 6, ppm: 21.5 }),
});

const FLAG_STAMP_TEXT = 'EXPOSED — NO COVER';

export default class EchoCityIsoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EchoCityIso' });
  }

  preload() {
    for (const L of BAKED_LAYERS) this.load.image(L.key, L.url);
    this.load.image('actor-butch', butchActorUrl);
    this.load.image('actor-mara', maraActorUrl);
    this.load.spritesheet('crowdAtlas', crowdAtlasUrl, { frameWidth: 128, frameHeight: 160 });
  }

  create() {
    this.model = createEchoCityIsoModel();
    this.reduceFlash = false;
    try {
      this.reduceFlash = new URLSearchParams(window.location.search).get('reduceFlash') === '1';
    } catch { /* non-browser guard */ }

    this._initKeys();
    this._initPointer();
    this._buildLayers();
    this._buildUi();
    this._initTransients();

    const beat = CAMERA_BEATS.entry;
    this.cam = { cx: beat.cx, cy: beat.cy, ppm: beat.ppm };
    this.cameras.main.setBackgroundColor('#24120b');

    this._exposeRenderToText();
  }

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------
  _initKeys() {
    const K = Phaser.Input.Keyboard.KeyCodes;
    const kb = this.input.keyboard;
    kb.on('keydown', () => car03Audio.ambientStart()); // idempotent city bed
    this.keyA = kb.addKey(K.A);
    this.keyD = kb.addKey(K.D);
    this.keyW = kb.addKey(K.W);
    this.keyS = kb.addKey(K.S);
    this.keyEsc = kb.addKey(K.ESC);
    this._eDown = false;
    this._eQueued = false;
    this._rQueued = false;
    this._escQueued = false;
    kb.on('keydown-E', () => {
      if (!this._eDown) {
        this._eDown = true;
        this._eQueued = true;
      }
    });
    kb.on('keyup-E', () => { this._eDown = false; });
    kb.on('keydown-R', () => { this._rQueued = true; });
    kb.on('keydown-ESC', () => { this._escQueued = true; });
  }

  _initPointer() {
    this.pointerScreen = null; // { x, y } in canvas pixels
    this._primaryHeld = false;
    this._primaryDownQueued = false;
    this._secondaryQueued = false;
    this.input.on('pointermove', (p) => {
      this.pointerScreen = { x: p.x, y: p.y };
    });
    this.input.on('pointerdown', (p) => {
      car03Audio.ambientStart(); // idempotent city bed
      this.pointerScreen = { x: p.x, y: p.y };
      if (p.rightButtonDown()) {
        this._secondaryQueued = true;
      } else if (p.leftButtonDown()) {
        this._primaryDownQueued = true;
        this._primaryHeld = true;
      }
    });
    this.input.on('pointerup', (p) => {
      if (!p.leftButtonDown()) this._primaryHeld = false;
    });
    this.input.on('pointerupoutside', () => { this._primaryHeld = false; });
    if (this.game && this.game.canvas) {
      this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  // screen -> world meters on the ground plane (z = 0)
  _screenToWorld(sx, sy) {
    const a = (sx - GAME_W / 2) / (COS45 * this.cam.ppm);
    const b = (GAME_H * 0.52 - sy) / (SINY * this.cam.ppm);
    return {
      x: this.cam.cx + (a - b) / 2,
      y: this.cam.cy + (a + b) / 2,
    };
  }

  // world meters -> screen pixels
  _wx(x, y) {
    return GAME_W / 2 + ((x - this.cam.cx) + (y - this.cam.cy)) * COS45 * this.cam.ppm;
  }

  _wy(x, y, z = 0) {
    return GAME_H * 0.52 - (((y - this.cam.cy) - (x - this.cam.cx)) * SINY * this.cam.ppm) - z * ZSCALE * this.cam.ppm;
  }

  _readInput() {
    const input = {
      hover: null,
      primaryDown: false,
      primaryHeld: this._primaryHeld,
      secondaryDown: false,
      eHeld: this._eDown,
      wasd: null,
    };
    if (this.pointerScreen) {
      const w = this._screenToWorld(this.pointerScreen.x, this.pointerScreen.y);
      input.hover = { x: w.x, y: w.y };
    }
    if (this._primaryDownQueued) {
      input.primaryDown = true;
      this._primaryDownQueued = false;
    }
    if (this._secondaryQueued || this._escQueued) {
      input.secondaryDown = true;
      this._secondaryQueued = false;
      this._escQueued = false;
    }
    const wx = (this.keyD.isDown ? 1 : 0) - (this.keyA.isDown ? 1 : 0);
    const wy = (this.keyW.isDown ? 1 : 0) - (this.keyS.isDown ? 1 : 0);
    if (wx !== 0 || wy !== 0) input.wasd = { x: wx, y: wy };
    return input;
  }

  // ------------------------------------------------------------------
  // Layers and UI
  // ------------------------------------------------------------------
  _buildLayers() {
    this.baked = BAKED_LAYERS.map((L) => {
      const img = this.add.image(0, 0, L.key).setOrigin(0.5, 0.5).setDepth(L.depth);
      return { ...L, img };
    });
    // crowd sprite pool: 3 market group + 3 transit crowd (+3 ghost re-use)
    this.crowdSprites = [];
    for (let i = 0; i < 9; i++) {
      const s = this.add.sprite(0, 0, 'crowdAtlas', 0);
      s.setOrigin(0.5, CROWD_FOOT_ORIGIN).setDepth(19).setVisible(false);
      this.crowdSprites.push(s);
    }
    this.actorSprites = {
      butch: this.add.image(0, 0, 'actor-butch').setOrigin(0.5, 0.78).setDepth(22).setVisible(false),
      courier: this.add.image(0, 0, 'actor-butch').setOrigin(0.5, 0.78).setDepth(22).setVisible(false),
      mara: this.add.image(0, 0, 'actor-mara').setOrigin(0.5, 0.78).setDepth(22).setVisible(false),
      echo: this.add.image(0, 0, 'actor-butch').setOrigin(0.5, 0.78).setDepth(22).setVisible(false),
    };
    this.gGround = this.add.graphics().setDepth(0);
    this.gMark = this.add.graphics().setDepth(10);
    this.gWorld = this.add.graphics().setDepth(20);
    this.gFx = this.add.graphics().setDepth(30);
    this.gUi = this.add.graphics().setDepth(40);
    // pictogram chip text pool (carried cycle + busy states)
    this.chipTexts = [];
    for (let i = 0; i < 4; i++) {
      const t = this.add.text(0, 0, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px', fontStyle: 'bold', color: ITXT.white, align: 'center',
      });
      t.setOrigin(0.5).setDepth(41).setVisible(false);
      this.chipTexts.push(t);
    }
  }

  _buildUi() {
    const editorial = 'Georgia, "Times New Roman", serif';
    this.objCardG = this.add.graphics().setDepth(50);
    this.objText = this.add.text(24, 24, '', {
      fontFamily: editorial, fontSize: '17px', fontStyle: 'bold',
      color: ITXT.white, wordWrap: { width: 360 }, lineSpacing: 3,
    });
    this.objText.setOrigin(0, 0).setDepth(51);
    this.currentObjectiveId = null;

    this.promptText = this.add.text(GAME_W / 2, GAME_H - 42, '', {
      fontFamily: editorial, fontSize: '19px', fontStyle: 'bold', color: ITXT.white,
      backgroundColor: ITXT.panel, padding: { x: 12, y: 6 },
    });
    this.promptText.setOrigin(0.5).setDepth(51).setVisible(false);

    this.subtitleText = this.add.text(GAME_W / 2, GAME_H - 104, '', {
      fontFamily: editorial, fontSize: '20px', fontStyle: 'italic', color: ITXT.tungsten,
      backgroundColor: ITXT.panel, padding: { x: 14, y: 8 },
    });
    this.subtitleText.setOrigin(0.5).setDepth(51).setVisible(false);

    this.titleText = this.add.text(GAME_W / 2, 96, '', {
      fontFamily: editorial, fontSize: '28px', fontStyle: 'bold', color: ITXT.white,
      backgroundColor: ITXT.panel, padding: { x: 16, y: 8 },
    });
    this.titleText.setOrigin(0.5).setDepth(51).setVisible(false);

    this.stampText = this.add.text(GAME_W / 2, GAME_H / 2 - 40, FLAG_STAMP_TEXT, {
      fontFamily: editorial, fontSize: '30px', fontStyle: 'bold', color: ITXT.alert,
      backgroundColor: ITXT.panel, padding: { x: 14, y: 10 },
    });
    this.stampText.setOrigin(0.5).setDepth(52).setVisible(false);
  }

  _initTransients() {
    this.acc = 0;
    this.slowMoLeft = 0;
    this.linkFlash = null; // { x, y, t }
    this.pictPop = 0;
    this.movePing = null; // { x, y, t }
    this.rejectPing = null; // explicit boundary feedback for non-walkable clicks
    this.subtitleMsLeft = 0;
    this.titleMsLeft = 0;
    this.fieldVignette = 0;
    this.entryMs = 0;
    this.lastMaraState = 'waiting';
    this.walkPhase = 0;
    this.lastPlayerMoving = false;
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
  // Camera — authored beats only, smooth exponential settle
  // ------------------------------------------------------------------
  _updateCamera(dt, snap) {
    const beat = CAMERA_BEATS[snap.cameraBeat] ?? CAMERA_BEATS.block;
    const k = 1 - Math.exp(-dt / 900);
    this.cam.cx += (beat.cx - this.cam.cx) * k;
    this.cam.cy += (beat.cy - this.cam.cy) * k;
    this.cam.ppm += (beat.ppm - this.cam.ppm) * k;
  }

  // ------------------------------------------------------------------
  // Event reactions
  // ------------------------------------------------------------------
  _onEvent(ev) {
    switch (ev.type) {
      case 'demo-seen': car03Audio.uiTick(); break;
      case 'observation-started': car03Audio.echoFocus(); break;
      case 'observation-aborted': car03Audio.observationDrain(); break;
      case 'cycle-copied': car03Audio.cycleCopy(); this.pictPop = 1; break;
      case 'transplant-applied': {
        if (ev.payload.compatible) car03Audio.transplant();
        else car03Audio.transplantWrong();
        this.linkFlash = { x: ev.payload.x, y: ev.payload.y, t: 1, receiverId: ev.payload.receiverId };
        break;
      }
      case 'cycle-released': car03Audio.cycleRelease(); break;
      case 'gate-opened': car03Audio.echoGateOpen(); break;
      case 'move-order':
        this.movePing = { x: ev.payload.x, y: ev.payload.y, t: 1 };
        break;
      case 'move-rejected':
        this.rejectPing = { x: ev.payload.x, y: ev.payload.y, t: 1 };
        car03Audio.uiTick();
        break;
      case 'move-cancelled': car03Audio.release(); break;
      case 'field-warning': car03Audio.warningTicks(); break;
      case 'flagged':
        car03Audio.flagStamp();
        this.cameras.main.shake(160, 0.0035);
        break;
      case 'checkpoint-return': car03Audio.checkpointReturn(); break;
      case 'district-entered':
        car03Audio.spaceChime();
        this.titleMsLeft = 2200;
        this.titleText.setText(DISTRICT_TITLE[ev.payload.district] ?? ev.payload.district);
        break;
      case 'alarm':
        car03Audio.startAlarm();
        this.titleMsLeft = 2600;
        this.titleText.setText('THE ARCHIVIST EMPTIES THE SQUARE');
        break;
      case 'mara-seen':
        car03Audio.spaceChime();
        this.titleMsLeft = 2600;
        this.titleText.setText('SOMEONE IS WAITING ACROSS THE FOUNTAIN');
        break;
      case 'recording-started': car03Audio.recordStart(); break;
      case 'recording-leg': car03Audio.duoStep(ev.payload.legs); break;
      case 'recording-interact': car03Audio.bellRing(); break;
      case 'recording-ended': car03Audio.recordEnd(); break;
      case 'recording-empty': car03Audio.recordDrain(); break;
      case 'preview-started': car03Audio.echoPreview(); break;
      case 'preview-complete': car03Audio.cycleCopy(); this.pictPop = 1; break;
      case 'cycle-shared': car03Audio.shareCycle(); break;
      case 'square-resonated': car03Audio.squareResonate(); break;
      case 'reunion': car03Audio.reunion(); break;
      case 'subtitle':
        this.subtitleText.setText(ev.payload.text);
        this.subtitleMsLeft = 4600;
        break;
      case 'complete': car03Audio.completeTone(); this.slowMoLeft = 500; break;
      case 'interact-noop': car03Audio.uiTick(); break;
      default: break;
    }
  }

  // ------------------------------------------------------------------
  // Full reset (R)
  // ------------------------------------------------------------------
  fullReset() {
    this.model.reset();
    this.model.drainEvents();
    this._eQueued = false;
    this._rQueued = false;
    this._eDown = false;
    this._primaryDownQueued = false;
    this._secondaryQueued = false;
    this._escQueued = false;
    this._primaryHeld = false;
    car03Audio.reset();
    const beat = CAMERA_BEATS.entry;
    this.cam = { cx: beat.cx, cy: beat.cy, ppm: beat.ppm };
    this._initTransients();
    this.currentObjectiveId = null;
    this.objCardG.clear();
    this.objText.setText('');
    this.subtitleText.setVisible(false);
    this.titleText.setVisible(false);
    this.stampText.setVisible(false);
    for (const t of this.chipTexts) t.setVisible(false);
  }

  // ------------------------------------------------------------------
  // Render — everything derives from the snapshot + camera
  // ------------------------------------------------------------------
  _render(snap, time, dt) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
    // anchor baked layers to the live camera
    for (const L of this.baked) {
      L.img.setPosition(this._wx(L.tx, L.ty), this._wy(L.tx, L.ty, L.tz));
      L.img.setScale(this.cam.ppm / L.ppm);
    }
    this._renderGround(snap, pulse, time);
    this._renderMarks(snap, pulse, time);
    this._renderWorld(snap, pulse, time);
    this._renderCrowd(snap, time);
    this._renderFx(snap, pulse, time, dt);
    this._renderOverlays(snap, dt, time);
  }

  _rect(x0, y0, x1, y1) {
    // world-space axis-aligned rectangle -> 4 projected corners
    return [
      { x: this._wx(x0, y0), y: this._wy(x0, y0) },
      { x: this._wx(x1, y0), y: this._wy(x1, y0) },
      { x: this._wx(x1, y1), y: this._wy(x1, y1) },
      { x: this._wx(x0, y1), y: this._wy(x0, y1) },
    ];
  }

  _renderGround(snap, pulse, time) {
    const g = this.gGround;
    g.clear();
    // surveillance field: dynamic state overlay (baked floor layers sit below)
    const c = Math.cos(FIELD.rot); const s = Math.sin(FIELD.rot);
    const corner = (lx, ly) => ({
      x: this._wx(FIELD.cx + lx * c - ly * s, FIELD.cy + lx * s + ly * c),
      y: this._wy(FIELD.cx + lx * c - ly * s, FIELD.cy + lx * s + ly * c),
    });
    const corners = [
      corner(-FIELD.hx, -FIELD.hy), corner(FIELD.hx, -FIELD.hy),
      corner(FIELD.hx, FIELD.hy), corner(-FIELD.hx, FIELD.hy),
    ];
    drawField(g, corners, snap.environment.fieldState, snap.environment.fieldSafe, pulse);
    void time;
  }

  _renderMarks(snap, pulse, time) {
    const g = this.gMark;
    g.clear();
    const u = this.cam.ppm;
    // courier loop trace (visible after the demonstration has played)
    const tri = [
      { x: this._wx(COURIER_PATH.home.x, COURIER_PATH.home.y), y: this._wy(COURIER_PATH.home.x, COURIER_PATH.home.y) },
      { x: this._wx(COURIER_PATH.deliver.x, COURIER_PATH.deliver.y), y: this._wy(COURIER_PATH.deliver.x, COURIER_PATH.deliver.y) },
      { x: this._wx(COURIER_PATH.via.x, COURIER_PATH.via.y), y: this._wy(COURIER_PATH.via.x, COURIER_PATH.via.y) },
      { x: this._wx(COURIER_PATH.home.x, COURIER_PATH.home.y), y: this._wy(COURIER_PATH.home.x, COURIER_PATH.home.y) },
    ];
    drawTracePath(g, tri, ISO_COL.cyan, snap.demoSeen ? 0.55 : 0.18, (time * 0.00012) % 1);
    // record mark
    const rm = ISO_POINTS['record-mark'];
    drawGroundDisc(g, this._wx(rm.x, rm.y), this._wy(rm.x, rm.y), rm.r * u, rm.r * u * 0.5,
      ISO_COL.amber, snap.resonance.mode === 'recording' ? 0.85 : 0.4 + pulse * 0.2, 2.5);
    // witness pads
    const pb = ISO_POINTS['pad-butch'];
    drawGroundDisc(g, this._wx(pb.x, pb.y), this._wy(pb.x, pb.y), pb.r * u, pb.r * u * 0.5, ISO_COL.cyan, 0.4 + pulse * 0.25, 2.5);
    drawGroundDisc(g, this._wx(26.2, 1.1), this._wy(26.2, 1.1), pb.r * u, pb.r * u * 0.5, ISO_COL.amber, 0.4 + pulse * 0.25, 2.5);
    // move ping
    if (this.movePing) {
      drawMovePing(g, this._wx(this.movePing.x, this.movePing.y), this._wy(this.movePing.x, this.movePing.y), this.movePing.t, ISO_COL.cyan);
      this.movePing.t -= 0.045;
      if (this.movePing.t <= 0) this.movePing = null;
    }
    if (this.rejectPing) {
      drawMovePing(g, this._wx(this.rejectPing.x, this.rejectPing.y), this._wy(this.rejectPing.x, this.rejectPing.y), this.rejectPing.t, ISO_COL.red);
      this.rejectPing.t -= 0.065;
      if (this.rejectPing.t <= 0) this.rejectPing = null;
    }
    // recording route so far
    const det = snap.resonance.recordLegsDetail;
    if (det && (snap.resonance.mode === 'recording' || snap.resonance.mode === 'previewing')) {
      const pts = [];
      for (const leg of det.legs) {
        if (pts.length === 0) pts.push({ x: this._wx(leg.x1, leg.y1), y: this._wy(leg.x1, leg.y1) });
        pts.push({ x: this._wx(leg.x2, leg.y2), y: this._wy(leg.x2, leg.y2) });
      }
      if (snap.resonance.mode === 'recording') {
        const start = det.legStart ?? (det.legs.length ? { x: det.legs[det.legs.length - 1].x2, y: det.legs[det.legs.length - 1].y2 } : null);
        if (start) {
          if (pts.length === 0) pts.push({ x: this._wx(start.x, start.y), y: this._wy(start.x, start.y) });
          pts.push({ x: this._wx(snap.player.x, snap.player.y), y: this._wy(snap.player.x, snap.player.y) });
        }
      }
      if (pts.length >= 2) strokePoly(g, pts, ISO_COL.amber, 0.85, 3, false);
    }
  }

  _renderWorld(snap, pulse, time) {
    const g = this.gWorld;
    g.clear();
    const u = this.cam.ppm;
    const items = [];
    const add = (x, y, fn) => items.push({ k: x - y, fn });

    // The central clock is real geometry in the coherent PBR background.
    // market gate shutter leaves (posts are baked into the market layer)
    const gateK = snap.environment.marketGate === 'open' ? 1 : (snap.environment.marketGate === 'opening' ? 0.5 : 0);
    add(-13, 0, () => drawMarketGate(g,
      this._wx(-13, -3.2), this._wy(-13, -3.2), this._wx(-13, 3.2), this._wy(-13, 3.2),
      u, gateK, snap.environment.shutters, pulse));
    // transit
    const bus = snap.sources.find((s) => s.id === 'bus');
    add(bus.x, bus.y, () => drawBus(g, this._wx(bus.x, bus.y), this._wy(bus.x, bus.y), u, bus.stepKind, pulse));
    const cross = snap.sources.find((s) => s.id === 'crosswalk');
    add(cross.x, cross.y, () => drawCrosswalkSignal(g, this._wx(cross.x, cross.y), this._wy(cross.x, cross.y), u, cross.stepKind, pulse));
    const barrier = snap.receivers.find((r) => r.id === 'barrier');
    const barrierOpenK = barrier.stepKind === 'open' && barrier.compatible ? 1 : 0;
    add(barrier.x, barrier.y, () => drawBarrier(g, this._wx(8, 12), this._wy(8, 12), u, barrier.resultState, barrierOpenK, pulse));
    // witness gate red field (posts + fountain + bell are baked into layers)
    add(27.5, 0, () => drawWitnessGate(g,
      this._wx(27.5, -1.6), this._wy(27.5, -1.6), this._wx(27.5, 1.6), this._wy(27.5, 1.6),
      u, snap.environment.witnessGate, pulse));

    // Actors are offline renders of fully skinned CC0 3D models. They retain a
    // subtle gameplay bob, but no longer collapse back into vector capsules.
    for (const sprite of Object.values(this.actorSprites)) sprite.setVisible(false);
    const bobT = time * 0.012;
    const placeActor = (sprite, x, y, tint = null, alpha = 1, moving = false) => {
      const lift = moving ? Math.abs(Math.sin(bobT)) * u * 0.07 : 0;
      sprite.setPosition(this._wx(x, y), this._wy(x, y) - lift);
      sprite.setScale(u / 100);
      sprite.setAlpha(alpha);
      sprite.setDepth(22 + this._wy(x, y) / 10000);
      if (tint === null) sprite.clearTint(); else sprite.setTint(tint);
      sprite.setVisible(true);
    };
    const courier = snap.sources.find((s) => s.id === 'courier');
    add(courier.x, courier.y - 0.01, () => placeActor(
      this.actorSprites.courier, courier.x, courier.y, ISO_COL.cyan, 0.95, courier.stepKind === 'move'));

    if (snap.echo.visible) {
      add(snap.echo.x, snap.echo.y - 0.01, () => placeActor(
        this.actorSprites.echo, snap.echo.x, snap.echo.y, ISO_COL.amber, 0.58, snap.echo.interactK <= 0));
    }
    if (snap.mara.visible) {
      add(snap.mara.x, snap.mara.y - 0.01, () => placeActor(
        this.actorSprites.mara, snap.mara.x, snap.mara.y, null, 1,
        snap.mara.state === 'crossing' || snap.mara.state === 'performing'));
    }
    // Butch
    const p = snap.player;
    const pMoving = p.moving;
    add(p.x, p.y, () => placeActor(this.actorSprites.butch, p.x, p.y, null, 1, pMoving));

    items.sort((a, b) => a.k - b.k);
    for (const it of items) it.fn();
  }

  // Crowd sprites from the Gate 5 UAL-1 atlas: market group + transit crowd
  // (ghosts after the alarm). Butch, Mara, courier and the player echo stay
  // procedural placeholders by design — see handoff "replaceable placeholders".
  _renderCrowd(snap, time) {
    for (const s of this.crowdSprites) s.setVisible(false);
    const u = this.cam.ppm;
    const scale = (u / 64) * 1.1; // 2.2u person; atlas baked at 64 px/unit for 2.0u
    let si = 0;
    const place = (x, y, tint, alpha, moving, phase) => {
      if (si >= this.crowdSprites.length) return;
      const s = this.crowdSprites[si++];
      const row = (moving ? CROWD_ROW.walk : CROWD_ROW.idle) * 8 + CROWD_DIR;
      const col = Math.floor((time + phase * 670) / 95) % 8;
      s.setFrame(row * 8 + col);
      s.setPosition(this._wx(x, y), this._wy(x, y));
      s.setScale(scale);
      s.setTint(tint);
      s.setAlpha(alpha);
      s.setVisible(true);
    };
    const group = snap.receivers.find((r) => r.id === 'market-group');
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 0.8;
      place(group.x + off, group.y, ISO_COL.crowd, 1, group.resultState === 'performing-loop', i);
    }
    const crowd = snap.receivers.find((r) => r.id === 'crowd');
    const moving = crowd.stepKind === 'move' && crowd.compatible;
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 0.8;
      if (!snap.alarmRaised) {
        place(crowd.x + off, crowd.y, ISO_COL.crowd, 1, moving, i + 3);
      } else {
        // the Archivist took the living crowd; their cycle remains as an echo
        place(crowd.x + off, crowd.y, ISO_COL.amber, 0.55, moving, i + 3);
      }
    }
  }

  _focusGeometry(snap) {
    const f = snap.focus;
    if (!f || !f.eligible || !f.id) return null;
    const u = this.cam.ppm;
    let pos = null; let r = 2;
    if (f.kind === 'source') {
      const s = snap.sources.find((ss) => ss.id === f.id);
      if (!s) return null;
      pos = { x: s.x, y: s.y };
      r = ISO_POINTS[f.id].r * 0.75;
    } else if (f.kind === 'receiver') {
      const r0 = snap.receivers.find((rr) => rr.id === f.id);
      if (!r0) return null;
      pos = { x: r0.x, y: r0.y };
      r = ISO_POINTS[f.id].r;
    } else if (f.kind === 'record' || f.kind === 'recording') {
      pos = { x: ISO_POINTS['record-mark'].x, y: ISO_POINTS['record-mark'].y };
      r = ISO_POINTS['record-mark'].r;
    } else if (f.kind === 'mara') {
      pos = { x: snap.mara.x, y: snap.mara.y };
      r = 1.8;
    }
    if (!pos) return null;
    return { sx: this._wx(pos.x, pos.y), sy: this._wy(pos.x, pos.y), rx: r * u, ry: r * u * 0.5 };
  }

  _renderFx(snap, pulse, time, dt) {
    const g = this.gFx;
    g.clear();
    const u = this.cam.ppm;

    // ghost preview: hovered receiver while carrying shows the likely result
    if (snap.hover.kind === 'receiver' && snap.carriedCycle) {
      const r = snap.receivers.find((rr) => rr.id === snap.hover.id);
      if (r && !r.installedCycleId) {
        const compatible = snap.carriedCycle && r.acceptedTags.some((t) => this._cycleTags(snap.carriedCycle.id).includes(t));
        const col = compatible ? ISO_COL.cyan : ISO_COL.red;
        const gx = this._wx(r.x, r.y); const gy = this._wy(r.x, r.y);
        if (r.id === 'barrier') {
          g.lineStyle(5, col, 0.4);
          g.beginPath();
          g.moveTo(gx, gy - 1.6 * u);
          g.lineTo(gx + 2.6 * u, gy - 1.6 * u - (compatible ? 1.8 : 0.5) * u);
          g.strokePath();
        } else if (r.id === 'crowd') {
          for (let i = 0; i < 3; i++) {
            drawActor(g, gx + (i - 1) * 0.7 * u + 1.5 * u, gy - 0.6 * u, 2.0 * u, 0.8 * u, col, { ghost: true, alpha: 0.4 });
          }
        } else if (r.id === 'market-group') {
          drawTracePath(g, [
            { x: gx - 1.5 * u, y: gy },
            { x: gx, y: gy - 2.2 * u },
            { x: gx + 1.5 * u, y: gy },
            { x: gx - 1.5 * u, y: gy },
          ], col, 0.45, (time * 0.0003) % 1);
        } else if (r.id === 'shutter-controller') {
          g.fillStyle(col, 0.35);
          g.fillRect(gx - 1.4 * u, gy - 2.0 * u, 2.8 * u, compatible ? 0.3 * u : 1.2 * u);
        }
      }
    }

    // focus outline + progress rings
    const fg = this._focusGeometry(snap);
    if (fg) {
      const col = snap.focus.kind === 'record' || snap.focus.kind === 'recording' ? ISO_COL.amber : ISO_COL.cyan;
      drawFocusOutline(g, fg.sx, fg.sy, fg.rx, fg.ry, col, pulse);
      if (snap.resonance.mode === 'observing' && snap.resonance.observeNeedMs > 0) {
        drawProgressRing(g, fg.sx, fg.sy - fg.ry - 30, 20, snap.resonance.observeMs / snap.resonance.observeNeedMs, ISO_COL.cyan, 1);
      }
    }
    if (snap.resonance.mode === 'recording') {
      const rm = ISO_POINTS['record-mark'];
      drawProgressRing(g, this._wx(rm.x, rm.y), this._wy(rm.x, rm.y) - 40, 22,
        snap.resonance.recordMsLeft / 16000, ISO_COL.amber, 1);
      // bell target highlight while recording
      drawFocusOutline(g, this._wx(24.5, -5), this._wy(24.5, -5), 1.7 * u, 0.85 * u, ISO_COL.amber, pulse);
    }

    // transplant link flash
    if (this.linkFlash) {
      const r = snap.receivers.find((rr) => rr.id === this.linkFlash.receiverId);
      if (r) {
        g.lineStyle(4, ISO_COL.amber, this.linkFlash.t * 0.9);
        g.beginPath();
        g.moveTo(this._wx(snap.player.x, snap.player.y), this._wy(snap.player.x, snap.player.y) - 1.5 * u);
        g.lineTo(this._wx(r.x, r.y), this._wy(r.x, r.y) - u);
        g.strokePath();
      }
      this.linkFlash.t -= dt / 350;
      if (this.linkFlash.t <= 0) this.linkFlash = null;
    }

    // echo interact ring
    if (snap.echo.visible && snap.echo.interactK > 0) {
      drawProgressRing(g, this._wx(snap.echo.x, snap.echo.y), this._wy(snap.echo.x, snap.echo.y) - 2.2 * u, 18, snap.echo.interactK, ISO_COL.amber, 0.9);
    }

    // bell ring waves + fountain ripple while the square resonates (props are baked)
    if (snap.environment.squareResonance === 'resonating') {
      const k = (time % 900) / 900;
      g.lineStyle(2.5, ISO_COL.amber, (1 - k) * 0.8);
      g.strokeCircle(this._wx(24.5, -5), this._wy(24.5, -5, 2.1), (0.6 + k * 1.6) * u);
      const fx = this._wx(20, 0); const fy = this._wy(20, 0);
      g.lineStyle(2, ISO_COL.amber, 0.55);
      for (let i = 1; i <= 3; i++) {
        const rr = (i * 1.15 + Math.sin(pulse * 4 + i) * 0.2) * u;
        g.strokeEllipse(fx, fy - 0.25 * u, rr * 2, rr);
      }
    }

    // carried relationship ribbon (world-space chips above Butch, not a HUD slot)
    for (const t of this.chipTexts) t.setVisible(false);
    if (snap.carriedCycle) {
      if (this.pictPop > 0) this.pictPop = Math.max(0, this.pictPop - dt / 300);
      const icons = snap.carriedCycle.icons.slice(0, 4);
      const scale = 1 + this.pictPop * 0.3;
      const px = this._wx(snap.player.x, snap.player.y);
      const py = this._wy(snap.player.x, snap.player.y) - 3.2 * u * scale;
      const chipW = 74 * scale;
      const total = icons.length * chipW;
      icons.forEach((label, i) => {
        const cx = px - total / 2 + chipW / 2 + i * chipW;
        chipFrame(g, cx, py, chipW - 8, 26 * scale, ISO_COL.amber, 0.95);
        const t = this.chipTexts[i];
        t.setText(this._shortLabel(label));
        t.setFontSize(Math.round(18 * scale));
        t.setColor(ITXT.warn);
        t.setPosition(cx, py);
        t.setVisible(true);
      });
    }

    // field warning vignette + flag stamp
    const warn = snap.environment.fieldState === 'warning';
    const frozen = snap.player.frozenMsLeft > 0;
    if (warn || frozen) {
      const a = this.reduceFlash ? 0.25 : (frozen ? 0.22 : 0.12 + pulse * 0.08);
      g.lineStyle(10, ISO_COL.red, a + 0.25);
      g.strokeRect(5, 5, GAME_W - 10, GAME_H - 10);
      if (!this.reduceFlash) {
        g.fillStyle(ISO_COL.red, a * 0.5);
        g.fillRect(0, 0, GAME_W, GAME_H);
      }
    }
    this.stampText.setVisible(frozen);
    void time;
  }

  _cycleTags(cycleId) {
    if (cycleId === 'courier-loop') return ['pattern'];
    if (cycleId === 'bus-service') return ['open'];
    if (cycleId === 'crosswalk-signal') return ['walk'];
    return ['witness'];
  }

  _shortLabel(label) {
    const map = { MOVE: 'MOVE', WAIT: 'WAIT', RETURN: 'BACK', STOP: 'STOP', OPEN: 'OPEN', GO: 'GO', WALK: 'WALK', RESONATE: 'RING' };
    return map[label] ?? label.slice(0, 5);
  }

  _renderOverlays(snap, dt, time) {
    this.gUi.clear();
    // subtitle
    if (this.subtitleMsLeft > 0) {
      this.subtitleMsLeft -= dt;
      this.subtitleText.setVisible(true);
      if (this.subtitleMsLeft <= 0) this.subtitleText.setVisible(false);
    }
    // district title
    if (this.titleMsLeft > 0) {
      this.titleMsLeft -= dt;
      this.titleText.setVisible(true);
      if (this.titleMsLeft <= 0) this.titleText.setVisible(false);
    }
    // objective card (no prose until the courier demonstration has played)
    if (snap.demoSeen && !snap.complete) {
      if (snap.objectiveId !== this.currentObjectiveId) {
        this.currentObjectiveId = snap.objectiveId;
        const label = OBJECTIVE_TEXT[snap.objectiveId] ?? snap.objectiveId;
        this.objText.setText(label);
        this.objCardG.clear();
        this.objCardG.fillStyle(0x2b150e, 0.88);
        this.objCardG.fillRoundedRect(14, 14, Math.min(400, this.objText.width + 34), this.objText.height + 22, 6);
        this.objCardG.fillStyle(ISO_COL.amber, 0.95);
        this.objCardG.fillRect(14, 14, 3, this.objText.height + 22);
      }
    } else if (this.currentObjectiveId !== null) {
      this.currentObjectiveId = null;
      this.objCardG.clear();
      this.objText.setText('');
    }
    // local prompt from the model focus
    if (snap.focus.eligible && snap.focus.prompt && !snap.complete) {
      this.promptText.setText(snap.focus.prompt);
      this.promptText.setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
    void time;
  }

  // ------------------------------------------------------------------
  // Browser diagnostic surface — read-only, never mutates the model.
  // ------------------------------------------------------------------
  _exposeRenderToText() {
    if (typeof window === 'undefined') return;
    const self = this;
    window.render_game_to_text = function echoCityIsoRender() {
      if (!self.model) return JSON.stringify({ state: 'uninitialised' });
      return JSON.stringify({
        ...self.model.snapshot(),
        qaState: null,
        reduceFlash: self.reduceFlash,
        entry: 'car03.html',
        version: 'echo-city-iso-2026-08-05',
      });
    };
  }
}
