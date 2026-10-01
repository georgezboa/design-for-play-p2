// Chapter 1 // NIGHT SERVICE — the panel renderer.
//
// Draws a panelModel (see panelModel.js) as painted carriage windows and turns
// pointer / keyboard input into model verbs. It owns no puzzle rules.
//
// Rendering trick: every tile lives in its own far-away patch of world space
// and gets its own camera whose viewport IS the window. Cameras clip for free,
// zooming is camera zoom + a crossfade, and dragging moves the viewport.
// UI cameras on top draw bezels, the lens, captions and cards:
//
//   main (wall) → tile cameras → bezel cam → lifted tile cams → drag cam → top cam
//
// Also here: the wordless hint tiers (hints.js decides when; this draws the
// pulse, the ghost hand and the Conductor's line) and the grid growth between
// Acts 0 → 0.5 → 1 (the carriage wall slides open around the kept windows).

import Phaser from 'phaser';
import { edgePoint, framePoints, planGrowth, tilePoint } from './panelModel.js';
import { createPanelModel } from './panelModel.js';
import { ACTS, actById, startCarry } from './acts/index.js';
import { createHintDirector, pickGesture, stepVerb, unmetSeam } from './hints.js';
import { HINT_SPEAKER, hintLine } from './hintLines.js';
import { INTRO_FAILSAFE_SLACK_MS, createIntroGuard, growScheduleMs, introScheduleMs } from './introGuard.js';
import { GHOST_HAND, paintGhostHand, paintShutter } from './art/hintArt.js';
import { createPaintContext, ensureLoopTexture, ensureSharedTextures } from './painter.js';
import { buildRig } from './actorRig.js';
import { BEZEL, paintBezel, paintLensRim, paintVignette, paintWall } from './art/wallArt.js';
import { PAL, brassFill, ink, roundRectPath, paperGrain } from './art/ink.js';
import { PAPER_URL, WORLDS } from './worldAssets.js';
import { reducedMotionActive } from '../../shell/motion.js';
import { magicStoneSnapshot } from '../../shell/magicStones.js';

export const PANEL_SCENE = 'NightServicePanels';

const WORLD_ORIGIN = 40000;
const WORLD_GAP = 4000;
const ZOOM_MS = 460;
const GHOST_ALPHA = 0.72;
const GRADES = {
  dusk: [0xe0a24a, 0.05],
  evening: [0x5a3050, 0.1],
  night: [0x101a33, 0.2],
  'deep-night': [0x070b18, 0.32],
};
const SERIF = 'Georgia, "Times New Roman", "DejaVu Serif", serif';
const MONO = '"Space Mono", ui-monospace, monospace';
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];
/** Press-and-hold on a frame this long (still) and it lifts (spec §3). */
const FRAME_HOLD_MS = 250;
/** Inside this far from the lens rim a press is on the glass, not the rim. */
const LENS_RIM = 18;
/** The keys the panel scene answers (besides the arrows). */
const KEYS = new Set(['Tab', 'Enter', ' ', 'Backspace', 'f', 'F', 'l', 'L', 'h', 'H']);
/** After a key that had nothing to do, the key strip blinks the one that would help. */
const KEY_NUDGE = { Enter: 'TAB', Tab: '← ↑ ↓ →', ' ': '← ↑ ↓ →', Backspace: 'TAB', f: '← ↑ ↓ →', l: 'H' };
// the "lift" cursor over a liftable frame: a brass frame with an arrow up
const LIFT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'
  + '<rect x="4.5" y="13.5" width="23" height="15" rx="3" fill="none" stroke="#1c130d" stroke-width="5"/>'
  + '<rect x="4.5" y="13.5" width="23" height="15" rx="3" fill="none" stroke="#e0b36a" stroke-width="2.5"/>'
  + '<path d="M16 1.5 L23.5 9.5 H19 V18 H13 V9.5 H8.5 Z" fill="#fff4dc" stroke="#1c130d" stroke-width="1.6" stroke-linejoin="round"/></svg>';
export const LIFT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(LIFT_SVG)}") 16 16, grab`;

const lerp = (a, b, t) => a + (b - a) * t;
const wallKey = (layout) => `nsv-wall-${layout.cols}x${layout.rows}-${layout.slots[0]?.w ?? layout.tileW}`;
const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------------------

class TileView {
  constructor(scene, tileId, index) {
    this.scene = scene;
    this.id = tileId;
    this.ox = WORLD_ORIGIN + index * WORLD_GAP;
    this.oy = WORLD_ORIGIN;
    const { tileW: w, tileH: h } = scene.layout;
    this.w = w;
    this.h = h;
    // screen px per tile px (a small grid's windows are shown larger)
    this.base = scene.layout.scale ?? 1;
    this.root = scene.add.container(this.ox, this.oy);
    this.stateLayer = scene.add.container(0, 0);
    this.frameLayer = scene.add.container(0, 0);
    this.actorLayer = scene.add.container(0, 0);
    this.tagLayer = scene.add.container(0, 0);
    this.grade = scene.add.rectangle(-60, -60, w + 120, h + 120, 0x000000, 0).setOrigin(0, 0);
    this.fxLayer = scene.add.container(0, 0);
    this.root.add([this.stateLayer, this.frameLayer, this.actorLayer, this.tagLayer, this.grade, this.fxLayer]);
    this.cam = scene.cameras.add(0, 0, w, h, false, `tile-${tileId}`);
    this.cam.setRoundPixels(false);
    this.cam.transparent = true;
    this.rect = { x: 0, y: 0, w, h, scale: 1, rot: 0 };
    this.focus = null; // zoom animation: { cx, cy, zoom }
    this.current = null;
    this.zooming = false;
    this.lifted = false;
    this.moving = false;
    this.mask = scene.make.graphics({ add: false });
    this.geomMask = this.mask.createGeometryMask();
    this.hover = scene.add.image(0, 0, 'nsv-radial').setBlendMode('ADD').setTint(0xffc46a).setAlpha(0).setVisible(false);
    this.tagLayer.add(this.hover);
    this.buildBezel();
  }

  buildBezel() {
    const s = this.scene;
    const { w, h } = this;
    const key = `nsv-bezel-${w}x${h}`;
    if (!s.textures.exists(key)) {
      const tex = s.textures.createCanvas(key, w + BEZEL * 2, h + BEZEL * 2);
      paintBezel(tex.getContext(), w, h);
      tex.refresh();
    }
    const vkey = `nsv-vignette-${w}x${h}`;
    if (!s.textures.exists(vkey)) {
      const tex = s.textures.createCanvas(vkey, w, h);
      paintVignette(tex.getContext(), w, h);
      tex.refresh();
    }
    this.bezel = s.add.container(0, 0);
    this.vignette = s.add.image(-w / 2, -h / 2, vkey).setOrigin(0, 0);
    this.cover = s.add.rectangle(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 0x050304, 0).setOrigin(0, 0);
    this.ring = s.add.image(-w / 2 - BEZEL, -h / 2 - BEZEL, key).setOrigin(0, 0);
    // the keyboard's selected window: ivory on a dark outline, so it reads
    // against the brass bezel and the gold wall alike
    this.select = s.add.graphics();
    this.select.lineStyle(12, 0x0b0705, 0.85);
    this.select.strokeRoundedRect(-w / 2 - BEZEL - 7, -h / 2 - BEZEL - 7, w + BEZEL * 2 + 14, h + BEZEL * 2 + 14, 26);
    this.select.lineStyle(5, 0xfff4dc, 1);
    this.select.strokeRoundedRect(-w / 2 - BEZEL - 7, -h / 2 - BEZEL - 7, w + BEZEL * 2 + 14, h + BEZEL * 2 + 14, 26);
    this.select.setVisible(false);
    this.glyph = s.add.image(w / 2 - 12, -h / 2 + 12, 'nsv-zoomout').setScale(0.5).setVisible(false);
    // the glyph's cue when stepping back is the lesson (Act 0)
    this.glyphGlow = s.add.image(w / 2 - 12, -h / 2 + 12, 'nsv-radial').setTint(0xffc46a).setBlendMode('ADD').setDisplaySize(96, 96).setAlpha(0).setVisible(false);
    this.bezel.add([this.vignette, this.cover, this.ring, this.select, this.glyphGlow, this.glyph]);
    s.bezelLayer.add(this.bezel);
  }

  /** Place the window: viewport, zoom and rotation of its camera + the bezel. */
  apply() {
    const { x, y, w, h, scale, rot } = this.rect;
    const k = scale * this.base;
    const vw = this.w * k;
    const vh = this.h * k;
    const vx = x + w / 2 - vw / 2;
    const vy = y + h / 2 - vh / 2;
    this.cam.setViewport(vx, vy, vw, vh);
    const f = this.focus ?? { cx: this.w / 2, cy: this.h / 2, zoom: 1 };
    this.cam.setZoom(k * f.zoom);
    this.cam.setRotation(rot);
    this.cam.centerOn(this.ox + f.cx, this.oy + f.cy);
    this.bezel.setPosition(x + w / 2, y + h / 2);
    this.bezel.setScale(k);
    this.bezel.setRotation(rot);
  }

  setRect(slot, extra = {}) {
    Object.assign(this.rect, { x: slot.x, y: slot.y, w: slot.w, h: slot.h, scale: 1, rot: 0 }, extra);
    this.apply();
  }

  /** Screen point of a tile-local normalised coordinate (current placement). */
  screen(u, v) {
    const { x, y, w, h, scale, rot } = this.rect;
    const f = this.focus ?? { cx: this.w / 2, cy: this.h / 2, zoom: 1 };
    const lx = (u * this.w - f.cx) * f.zoom * scale * this.base;
    const ly = (v * this.h - f.cy) * f.zoom * scale * this.base;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    return { x: x + w / 2 + lx * cos - ly * sin, y: y + h / 2 + lx * sin + ly * cos };
  }

  destroyState(state) {
    if (!state) return;
    state.root.destroy();
  }
}

// ---------------------------------------------------------------------------

export class PanelScene extends Phaser.Scene {
  constructor() {
    super(PANEL_SCENE);
  }

  init(data = {}) {
    this.actId = data.actId ?? 'act1';
    // An act definition can be handed in directly (e.g. the Museum's
    // one-answer exhibit, which is not a Chapter 1 act).
    this.actDef = data.act ?? this.actDef ?? null;
    this.startStep = data.step ?? null;
    this.carryIn = data.carry ?? null;
    this.services = data.services ?? this.services ?? {};
    this.fromAct = data.fromAct ?? null;
  }

  resolveAct() {
    return this.actDef ?? actById(this.actId);
  }

  preload() {
    if (!this.textures.exists('nsv-paper')) this.load.image('nsv-paper', PAPER_URL);
    const act = this.resolveAct();
    const worlds = new Set(['fields', ...(act.assets ?? [])].filter((name) => WORLDS[name]));
    worlds.forEach((name) => WORLDS[name].chunks.forEach(({ key, url }) => {
      if (!this.textures.exists(key)) this.load.image(key, url);
    }));
  }

  create() {
    this.act = this.resolveAct();
    const freshCarry = this.actDef
      ? { bell: 0, items: [], flags: [], linkHistory: [], ...(this.actDef.start ?? {}) }
      : startCarry(this.actId);
    this.model = createPanelModel(this.act, { carry: this.carryIn ?? freshCarry, step: this.startStep });
    this.layout = this.model.layout;
    this.audio = this.services.audio ?? { play() {}, unlock() {}, setRailRate() {} };
    this.clock = 0;
    this.idleMs = 0;
    this.hintCooldown = 0;
    this.keyboardMode = false;
    this.selectedSlot = 0;
    this.focusedHotspot = null;
    this.kbHeld = null;
    this.kbFrameTarget = null;
    this.lensFocus = false;
    this.keysDown = new Set();
    this.press = null;
    this.drag = null;
    this.floating = null;
    this.caption = null;
    this.cardView = null;
    this.fading = false;
    this.pulses = [];
    this.bridgeFlash = new Map();
    this.textScale = (globalThis.NIGHTFALL_SETTINGS?.textScale ?? 100) / 100;
    this.growing = false;
    this.ghost = null;
    this.idleHints = 0;
    this.ghostCount = 0;
    this.hintCaptions = 0;
    // the intro's wall-clock fail-safe (introGuard.js)
    this.introGuard = createIntroGuard();
    this.introSettled = null;
    this.introTimer = null;
    this.finishGrowth = null;
    // verbs the ghost hand has shown, shared by every act of this page
    this.hintSeen = this.services.hintSeen ?? new Set();
    this.services.hintSeen = this.hintSeen;
    this.hints = createHintDirector({ seen: this.hintSeen });

    // dev QA only (`?dtmax=`): let tweens take real-time steps on very slow
    // headless renderers instead of Phaser's 33 ms lag-smoothing.
    if ((this.services.maxDt ?? 50) > 50) { this.tweens.maxLag = 1e9; this.tweens.lagSkip = 1e9; }
    ensureSharedTextures(this);
    this.ensureUiTextures();
    this.worldKeys = {};
    Object.entries(WORLDS).forEach(([name, world]) => {
      if (world.chunks.every(({ key }) => this.textures.exists(key))) {
        this.worldKeys[name] = ensureLoopTexture(this, world.key, world.chunks.map(({ key }) => key));
      }
    });
    this.env = {
      paper: this.textures.exists('nsv-paper') ? this.textures.get('nsv-paper').getSourceImage() : null,
      images: Object.fromEntries(Object.values(WORLDS).flatMap((world) => world.chunks)
        .filter(({ key }) => this.textures.exists(key))
        .map(({ key }) => [key, this.textures.get(key).getSourceImage()])),
      worlds: this.worldKeys,
      reduceMotion: () => reducedMotionActive(),
    };

    // ---------- layers ----------
    this.wallLayer = this.add.container(0, 0);
    this.bezelLayer = this.add.container(0, 0);
    this.dragLayer = this.add.container(0, 0);
    this.topLayer = this.add.container(0, 0);
    this.buildWall();
    this.linkG = this.add.graphics();
    this.bezelLayer.add(this.linkG);
    this.shadow = this.add.image(0, 0, 'nsv-shadow').setVisible(false).setAlpha(0);
    this.bezelLayer.add(this.shadow);
    // where a carried window will land
    this.targetG = this.add.graphics();
    this.bezelLayer.add(this.targetG);
    // the band where a frame can be taken hold of (hover / hold)
    this.gripG = this.add.graphics();
    this.bezelLayer.add(this.gripG);
    this.hoverGrip = null;
    this.crossLayer = this.add.container(0, 0);

    // ---------- tiles ----------
    this.views = {};
    Object.keys(this.act.tiles).forEach((tileId, index) => {
      this.views[tileId] = new TileView(this, tileId, index);
    });
    this.bezelLayer.add(this.crossLayer);
    this.bezelLayer.bringToTop(this.linkG);
    this.bezelLayer.bringToTop(this.targetG);
    this.bezelLayer.bringToTop(this.crossLayer);
    this.bezelLayer.bringToTop(this.gripG);
    this.bezelCam = this.cameras.add(0, 0, this.layout.view.w, this.layout.view.h, false, 'bezel');
    this.dragCam = this.cameras.add(0, 0, this.layout.view.w, this.layout.view.h, false, 'drag');
    this.topCam = this.cameras.add(0, 0, this.layout.view.w, this.layout.view.h, false, 'top');
    [this.bezelCam, this.dragCam, this.topCam].forEach((cam) => { cam.transparent = true; });
    this.cameras.main.setBackgroundColor('#0b0705');
    this.orderCameras();
    this.applyCameraFilters();

    Object.values(this.views).forEach((view) => {
      view.setRect(this.model.slotRect(view.id));
      this.rebuildState(view, { instant: true });
      this.rebuildFrames(view);
    });
    this.prewarm();

    // ---------- actors ----------
    this.rigs = {};
    Object.entries(this.act.actors ?? {}).forEach(([id, def]) => {
      const rig = buildRig(this, def.rig ?? id);
      if (def.tint !== undefined) {
        const tintAll = (obj) => { obj.setTint?.(def.tint); obj.list?.forEach(tintAll); };
        tintAll(rig.root);
      }
      this.rigs[id] = { rig, kind: def.rig ?? id, parent: null, stepClock: 0, scale: def.scale ?? 1 };
    });

    // ---------- lens ----------
    const lensKey = 'nsv-lens-rim';
    if (!this.textures.exists(lensKey)) {
      const r = this.model.state.lens.r;
      const tex = this.textures.createCanvas(lensKey, (r + 26) * 2, (r + 26) * 2);
      paintLensRim(tex.getContext(), r);
      tex.refresh();
    }
    this.lensView = this.add.image(0, 0, lensKey).setVisible(false);
    this.topLayer.add(this.lensView);
    // above the lens: the keyboard focus ring and the tier-1 beacons
    this.focusG = this.add.graphics();
    this.topLayer.add(this.focusG);
    this.beaconLayer = this.add.container(0, 0);
    this.topLayer.add(this.beaconLayer);

    this.buildOverlays();
    this.bindModel();
    this.bindInput();
    this.applyGrades(true);

    const onSettings = (event) => {
      this.textScale = (event.detail?.textScale ?? 100) / 100;
      this.relayoutText();
    };
    window.addEventListener('nightfall:settings', onSettings);
    // the pause menu's SHOW ME (and H): the ghost hand, now. The menu resumes
    // the scene on Phaser's next step, so a request made while still paused
    // waits for the resume.
    const onHint = () => {
      if (this.sys.isActive()) { this.requestHint(); return; }
      this.events.once('resume', () => this.time.delayedCall(80, () => this.requestHint()));
    };
    window.addEventListener('nightfall:hint', onHint);
    this.events.once('shutdown', () => {
      window.removeEventListener('nightfall:settings', onSettings);
      window.removeEventListener('nightfall:hint', onHint);
      globalThis.clearTimeout?.(this.introTimer);
      this.introGuard.disarm();
      window.removeEventListener('keydown', this.onKeyDown, true);
      window.removeEventListener('keyup', this.onKeyUp, true);
    });

    this.buildSockets();
    this.buildKeyStrip();
    this.growth = this.planGrowthIntro();
    this.introduce();
  }

  // ---------------------------------------------------------------------------
  // setup helpers

  ensureUiTextures() {
    const make = (key, w, h, fn) => {
      if (this.textures.exists(key)) return;
      const tex = this.textures.createCanvas(key, w, h);
      fn(tex.getContext(), w, h);
      tex.refresh();
    };
    make('nsv-zoomout', 72, 72, (c) => {
      c.fillStyle = brassFill(c, 4, 4, 64, 64);
      c.beginPath(); c.arc(36, 36, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1c130d';
      c.beginPath(); c.arc(36, 36, 24, 0, Math.PI * 2); c.fill();
      c.strokeStyle = PAL.ink;
      c.lineWidth = 4;
      c.lineCap = 'round';
      [[1, 1], [-1, -1], [1, -1], [-1, 1]].forEach(([sx, sy]) => {
        c.beginPath();
        c.moveTo(36 + sx * 6, 36 + sy * 6); c.lineTo(36 + sx * 15, 36 + sy * 15);
        c.moveTo(36 + sx * 15, 36 + sy * 8); c.lineTo(36 + sx * 15, 36 + sy * 15); c.lineTo(36 + sx * 8, 36 + sy * 15);
        c.stroke();
      });
    });
    make('nsv-ghost-hand', GHOST_HAND.w * 3, GHOST_HAND.h * 3, (c) => {
      c.scale(3, 3);
      paintGhostHand(c, this.textures.exists('nsv-paper') ? this.textures.get('nsv-paper').getSourceImage() : null);
    });
    make('nsv-shadow', 400, 240, (c) => {
      c.filter = 'blur(18px)';
      c.fillStyle = 'rgba(0,0,0,0.85)';
      roundRectPath(c, 40, 40, 320, 160, 20);
      c.fill();
    });
    make('nsv-card', 700, 420, (c, w, h) => {
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.6)';
      c.shadowBlur = 30;
      c.shadowOffsetY = 12;
      c.fillStyle = '#e8dec4';
      c.fillRect(20, 20, w - 40, h - 40);
      c.restore();
      if (this.env?.paper) {
        c.save();
        c.beginPath(); c.rect(20, 20, w - 40, h - 40); c.clip();
        paperGrain(c, w, h, this.env.paper, 0.4);
        c.restore();
      }
      c.strokeStyle = 'rgba(107, 42, 34, 0.5)';
      c.lineWidth = 1.2;
      for (let y = 150; y < h - 50; y += 38) { c.beginPath(); c.moveTo(60, y); c.lineTo(w - 60, y); c.stroke(); }
      c.strokeStyle = 'rgba(107, 42, 34, 0.7)';
      c.beginPath(); c.moveTo(110, 30); c.lineTo(110, h - 30); c.stroke();
      // punched hole
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(w - 70, 70, 13, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'source-over';
      ink(c, [[20, 20], [w - 20, 20], [w - 20, h - 20], [20, h - 20]], { w: 1.4, closed: true, color: '#6a5238', alpha: 0.7 });
    });
    make('nsv-caption', 1240, 124, (c, w, h) => {
      c.save();
      roundRectPath(c, 4, 4, w - 8, h - 8, 18);
      c.fillStyle = 'rgba(14, 9, 6, 0.9)';
      c.fill();
      c.lineWidth = 3;
      c.strokeStyle = brassFill(c, 0, 0, w, h);
      c.stroke();
      c.lineWidth = 1;
      c.strokeStyle = 'rgba(234,223,198,0.25)';
      roundRectPath(c, 12, 12, w - 24, h - 24, 12);
      c.stroke();
      c.restore();
    });
  }

  buildWall() {
    const { cols, rows } = this.layout;
    const key = wallKey(this.layout);
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, this.layout.view.w, this.layout.view.h);
      const paper = this.textures.exists('nsv-paper') ? this.textures.get('nsv-paper').getSourceImage() : null;
      this.wallInfo = paintWall(tex.getContext(), this.layout, { paper });
      tex.refresh();
      this.textures.get(key).customData = this.wallInfo;
    }
    this.wallInfo = this.textures.get(key).customData ?? { sillY: this.layout.y + this.layout.h + 56 };
    this.wallLayer.add(this.add.image(0, 0, key).setOrigin(0, 0));
    // live lamp flicker between the windows
    this.lampGlows = [];
    for (let col = 0; col <= cols; col += 1) {
      const x = col === 0 ? this.layout.x - 17 : col === cols ? this.layout.x + this.layout.w + 17 : this.layout.slots[col].x - this.layout.gutter / 2;
      const glow = this.add.image(x, this.layout.y - 18, 'nsv-radial').setDisplaySize(260, 200).setTint(0xffb060).setBlendMode('ADD').setAlpha(0.22);
      glow.seed = Math.random() * 100;
      this.lampGlows.push(glow);
      this.wallLayer.add(glow);
    }
    // warm spill down every gutter
    this.layout.slots.forEach((slot) => {
      if (slot.col < cols - 1 && slot.row === 0) {
        const g = this.add.image(slot.x + slot.w + this.layout.gutter / 2, this.layout.y + this.layout.h / 2, 'nsv-radial');
        g.setDisplaySize(90, this.layout.h * 1.1).setTint(0xff9a40).setBlendMode('ADD').setAlpha(0.08);
        this.wallLayer.add(g);
      }
    });
  }

  buildOverlays() {
    const { w: W, h: H } = this.layout.view;
    // full-screen fade (under the act title, over everything else)
    this.blackout = this.add.rectangle(0, 0, W, H, 0x020101, 1).setOrigin(0, 0);
    this.topLayer.add(this.blackout);
    // caption bar (dialogue): anchored to the bottom edge, grows with Text Size
    this.captionBox = this.add.container(W / 2, H - 10).setVisible(false).setAlpha(0);
    this.captionBg = this.add.nineslice(0, 0, 'nsv-caption', null, 1240, 124, 26, 26, 26, 26).setOrigin(0.5, 1);
    this.captionSpeaker = this.add.text(-580, -100, '', { fontFamily: MONO, fontSize: '22px', color: '#e0a24a', fontStyle: 'bold' });
    this.captionText = this.add.text(-580, -68, '', { fontFamily: SERIF, fontSize: '34px', color: '#eadfc6', wordWrap: { width: 1150 }, lineSpacing: 6 });
    this.captionNext = this.add.text(592, -10, '▸', { fontFamily: SERIF, fontSize: '30px', color: '#e0a24a' }).setOrigin(1, 1);
    this.captionBox.add([this.captionBg, this.captionSpeaker, this.captionText, this.captionNext]);
    this.topLayer.add(this.captionBox);
    // archive card
    this.cardBox = this.add.container(W / 2, H / 2 - 30).setVisible(false);
    const scrim = this.add.rectangle(0, 30, W * 2, H * 2, 0x050304, 0.55);
    const card = this.add.image(0, 0, 'nsv-card');
    this.cardStamp = this.add.text(-250, -150, '', { fontFamily: MONO, fontSize: '24px', color: '#8a2a1e', fontStyle: 'bold' });
    this.cardTitle = this.add.text(-250, -104, '', { fontFamily: SERIF, fontSize: '44px', color: '#2a1d14', fontStyle: 'bold' });
    this.cardLines = this.add.text(-250, -36, '', { fontFamily: SERIF, fontSize: '30px', color: '#3a2a1c', wordWrap: { width: 540 }, lineSpacing: 10 });
    this.cardBox.add([scrim, card, this.cardStamp, this.cardTitle, this.cardLines]);
    this.topLayer.add(this.cardBox);
    // act title card
    this.titleBox = this.add.container(W / 2, H / 2).setAlpha(0);
    this.titleKicker = this.add.text(0, -40, '', { fontFamily: MONO, fontSize: '22px', color: '#e0a24a', letterSpacing: 6 }).setOrigin(0.5);
    this.titleMain = this.add.text(0, 12, '', { fontFamily: SERIF, fontSize: '64px', color: '#eadfc6', letterSpacing: 4 }).setOrigin(0.5);
    this.titleBox.add([this.titleKicker, this.titleMain]);
    this.topLayer.add(this.titleBox);
    this.relayoutText();
  }

  relayoutText() {
    const s = clamp(this.textScale, 0.8, 1.6);
    this.captionText?.setFontSize(Math.round(34 * s)).setWordWrapWidth(1150);
    this.captionSpeaker?.setFontSize(Math.round(22 * s));
    if (this.caption) this.layoutCaption(this.caption.text);
    this.cardTitle?.setFontSize(Math.round(44 * s));
    this.cardLines?.setFontSize(Math.round(30 * s));
    this.cardStamp?.setFontSize(Math.round(24 * s));
    this.cardBox?.setScale(Math.max(1, 0.8 + s * 0.2));
  }

  orderCameras() {
    const tiles = Object.values(this.views);
    const resting = tiles.filter((view) => !view.lifted).map((view) => view.cam);
    const lifted = tiles.filter((view) => view.lifted).map((view) => view.cam);
    this.cameras.cameras = [this.cameras.main, ...resting, this.bezelCam, ...lifted, this.dragCam, this.topCam];
  }

  /** Each top-level container is drawn by exactly the cameras that own it. */
  applyCameraFilters() {
    const cams = this.cameras.cameras;
    const all = cams.reduce((bits, cam) => bits | cam.id, 0);
    const own = (obj, owners) => { obj.cameraFilter = all & ~owners.reduce((bits, cam) => bits | cam.id, 0); };
    own(this.wallLayer, [this.cameras.main]);
    own(this.bezelLayer, [this.bezelCam]);
    own(this.dragLayer, [this.dragCam]);
    own(this.topLayer, [this.topCam]);
    Object.values(this.views).forEach((view) => own(view.root, [view.cam]));
  }

  // ---------------------------------------------------------------------------
  // building panel states

  paintCtx(view, target, era, stateId) {
    return createPaintContext(this, { target, w: view.w, h: view.h, era, model: this.model, tileId: view.id, stateId, env: this.env, res: view.base });
  }

  buildState(view, stateId) {
    const sceneDef = this.model.sceneOf(view.id, stateId);
    const root = this.add.container(0, 0);
    view.stateLayer.add(root);
    const present = this.add.container(0, 0);
    root.add(present);
    const pctx = this.paintCtx(view, present, 'present', stateId);
    sceneDef?.draw?.(pctx);
    let past = null;
    let animators = [...pctx.animators];
    if (sceneDef?.drawPast) {
      past = this.add.container(0, 0);
      root.add(past);
      const qctx = this.paintCtx(view, past, 'past', stateId);
      sceneDef.drawPast(qctx);
      animators = animators.concat(qctx.animators);
      past.setMask(view.geomMask);
      past.setVisible(false);
    }
    // paper tags for hotspots: the one visual language for "act on this"
    const tags = [];
    (sceneDef?.hotspots ?? []).forEach((hotspot) => {
      if (!hotspot.tag) return;
      const layer = hotspot.era === 'past' ? past ?? present : root;
      const holder = this.add.container(hotspot.tag.x * view.w, hotspot.tag.y * view.h);
      const tag = this.add.image(0, 0, 'nsv-tag').setOrigin(0.12, 0.2).setScale(0.5 * (hotspot.tag.scale ?? 1));
      const glintOnly = Boolean(hotspot.tag.glintOnly);
      const glint = this.add.image(glintOnly ? 0 : 38 * (hotspot.tag.scale ?? 1), glintOnly ? 0 : -8, 'nsv-glint').setScale(0.55).setBlendMode('ADD');
      if (glintOnly) tag.setVisible(false);
      holder.add([tag, glint]);
      holder.setRotation(hotspot.tag.angle ?? 0);
      holder.setVisible(false);
      layer.add(holder);
      tags.push({ hotspot, holder, tag, glint, shown: false, seed: Math.random() * 10 });
    });
    // clear affordances: a pulsing amber ring around every 1978 interactable
    // (seen only through the lens) and around any required glint-only target
    const rings = [];
    (sceneDef?.hotspots ?? []).forEach((hotspot) => {
      const era = hotspot.era ?? 'present';
      if (!(hotspot.tag?.ring ?? (era === 'past' || Boolean(hotspot.tag?.glintOnly)))) return;
      const g = this.add.graphics();
      (era === 'past' ? past ?? present : root).add(g);
      rings.push({ kind: 'hotspot', hotspot, g });
    });
    if (past) {
      Object.entries(sceneDef.edges ?? {}).forEach(([side, list]) => (Array.isArray(list) ? list : [list]).forEach((edge) => {
        if (edge.era !== 'past') return;
        const [u, v] = edge.lensAt ?? (side === 'left' ? [0, edge.at] : side === 'right' ? [1, edge.at] : side === 'top' ? [edge.at, 0] : [edge.at, 1]);
        const g = this.add.graphics();
        past.add(g);
        rings.push({ kind: 'edge', edge, u, v, g });
      }));
    }
    return { stateId, root, present, past, animators, tags, rings };
  }

  rebuildState(view, { instant = false } = {}) {
    const stateId = this.model.state.tiles[view.id].state;
    const next = this.buildState(view, stateId);
    const old = view.current;
    view.current = next;
    if (old && !instant) {
      next.root.setAlpha(0);
      this.tweens.add({ targets: next.root, alpha: 1, duration: 420, ease: 'Sine.easeInOut', onComplete: () => view.destroyState(old) });
      view.fadingOut = old;
    } else {
      view.destroyState(old);
    }
  }

  rebuildFrames(view) {
    view.frameLayer.removeAll(true);
    view.frameAnimators = [];
    Object.values(this.model.state.frames).filter((frame) => frame.host === view.id).forEach((frame) => {
      const def = this.model.frameDef(frame.id);
      if (!def?.draw) return;
      const holder = this.add.container(0, 0);
      view.frameLayer.add(holder);
      const ctx = this.paintCtx(view, holder, 'present', `frame:${frame.id}`);
      ctx.overlay = frame.origin !== view.id;
      def.draw(ctx);
      view.frameAnimators.push(...ctx.animators);
    });
  }

  /** Paint every state's canvases now so zooms never hitch mid-animation. */
  prewarm() {
    Object.entries(this.act.tiles).forEach(([tileId, tile]) => {
      const view = this.views[tileId];
      Object.keys(tile.states).forEach((stateId) => {
        if (stateId === view.current?.stateId) return;
        const built = this.buildState(view, stateId);
        built.root.destroy();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // model → view

  bindModel() {
    const m = this.model;
    m.on('zoom', ({ tile, dir, rect }) => this.animateZoom(this.views[tile], dir, rect));
    m.on('state', ({ tile }) => {
      const view = this.views[tile];
      if (!view.zooming) this.rebuildState(view);
    });
    m.on('drag:start', ({ tile }) => this.onDragStart(tile));
    m.on('drag:end', (payload) => this.onDragEnd(payload));
    m.on('link:on', (link) => this.onLinkOn(link));
    m.on('link:mismatch', (list) => this.onMismatch(list));
    m.on('frame:lift', ({ frame, from }) => { this.rebuildFrames(this.views[from]); this.startFloatingFrame(frame, from); this.audio.play('lift'); });
    m.on('frame:drop', ({ frame, onto }) => { this.endFloatingFrame(frame, onto); Object.values(this.views).forEach((view) => this.rebuildFrames(view)); this.audio.play('settle'); });
    m.on('bell', (bell) => this.onBell(bell));
    m.on('card', ({ card }) => this.showCard(card));
    m.on('card:close', () => this.hideCard());
    m.on('dialogue', ({ line }) => this.showLine(line));
    m.on('dialogue:end', () => this.hideCaption());
    m.on('caption', (caption) => this.showCaption(caption));
    m.on('fx', (params) => this.runFx(params));
    m.on('sfx', ({ name }) => this.audio.play(name));
    m.on('item', ({ item, held }) => { if (held) this.audio.play('glint'); void item; });
    m.on('stone', ({ id }) => { this.audio.play('stone'); this.services.onStone?.(id); this.refreshSockets(true); });
    m.on('checkpoint', ({ id }) => this.services.onCheckpoint?.(id));
    m.on('hotspot', ({ kind }) => { if (kind === 'read') this.audio.play('paper'); else if (kind !== 'zoom') this.audio.play('clack'); });
    m.on('walk:blocked', ({ actor }) => { if (actor === 'butch') this.flashBlocked(); });
    m.on('lens', (lens) => { if (lens.appeared) this.audio.play('clack'); });
    m.on('act:end', ({ next, carry }) => this.time.delayedCall(120, () => this.gotoAct(next ?? this.act.next, carry)));
    m.on('chapter:end', ({ carry }) => this.time.delayedCall(120, () => this.services.onChapterEnd?.(carry)));
    m.on('restore', () => Object.values(this.views).forEach((view) => { view.setRect(m.slotRect(view.id)); this.rebuildState(view, { instant: true }); this.rebuildFrames(view); }));
  }

  gotoAct(next, carry) {
    if (!next) return;
    this.services.onActChange?.(next);
    this.scene.restart({ actId: next, carry, services: this.services, fromAct: this.actId });
  }

  // ---------------------------------------------------------------------------
  // grid growth (Acts 0 → 0.5 → 1): the carriage wall slides open

  /** The growth plan when this act continues the previous act's wall, else null. */
  planGrowthIntro() {
    const grow = this.act.growFrom;
    const from = this.fromAct ? ACTS[this.fromAct] : null;
    if (!grow || !from || grow.act !== this.fromAct || this.startStep) return null;
    return planGrowth(from, this.act, { fromSlots: this.carryIn?.slots ?? null, toSlots: this.model.state.slots });
  }

  /** One sliding wall panel (two leaves) over a window about to open. */
  makeShutter(rect, index) {
    const pad = BEZEL + 6;
    const x = rect.x - pad;
    const y = rect.y - pad;
    const w = rect.w + pad * 2;
    const h = rect.h + pad * 2;
    const half = Math.ceil(w / 2);
    const leaves = ['L', 'R'].map((side, i) => {
      const key = `nsv-shutter-${side}-${half}x${h}`;
      if (!this.textures.exists(key)) {
        const tex = this.textures.createCanvas(key, half, h);
        paintShutter(tex.getContext(), half, h, side, index * 2 + i);
        tex.refresh();
      }
      const leaf = this.add.image(x + i * half, y, key).setOrigin(0, 0);
      this.bezelLayer.add(leaf);
      return leaf;
    });
    const maskG = this.make.graphics({ add: false });
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(x, y, w, h);
    const mask = maskG.createGeometryMask();
    leaves.forEach((leaf) => leaf.setMask(mask));
    const seam = this.add.image(x + w / 2, y + h / 2, 'nsv-radial').setTint(0xffc46a).setBlendMode('ADD').setDisplaySize(60, h * 1.1).setAlpha(0);
    this.bezelLayer.add(seam);
    return {
      leaves, seam, x, w, half,
      destroy: () => { leaves.forEach((leaf) => leaf.destroy()); seam.destroy(); maskG.destroy(); },
    };
  }

  growIntro(plan) {
    const reduce = reducedMotionActive();
    this.growing = true;
    this.blackout.setAlpha(0);
    const slideDelay = 350;
    const slideMs = reduce ? 450 : 1000;
    const openDelay = slideDelay + (reduce ? 250 : 650);
    const openMs = reduce ? 550 : 1250;
    // the old, smaller wall panel fades into the new one while the windows move
    const oldKey = wallKey(plan.from);
    if (this.textures.exists(oldKey)) {
      const oldWall = this.add.image(0, 0, oldKey).setOrigin(0, 0);
      this.wallLayer.add(oldWall);
      this.tweens.add({ targets: oldWall, alpha: 0, delay: slideDelay, duration: slideMs + 400, ease: 'Sine.easeInOut', onComplete: () => oldWall.destroy() });
    }
    const shutters = [];
    plan.windows.forEach((win, i) => {
      const view = this.views[win.tile];
      view.cover.setAlpha(0);
      if (win.kind === 'keep') {
        // a window shown larger in the smaller wall shrinks as it slides
        view.setRect(win.from, { scale: win.from.w / win.to.w });
        view.moving = true;
        this.tweens.add({
          targets: view.rect,
          x: win.to.x,
          y: win.to.y,
          w: win.to.w,
          h: win.to.h,
          scale: 1,
          delay: slideDelay,
          duration: slideMs,
          ease: 'Sine.easeInOut',
          onUpdate: () => view.apply(),
          onComplete: () => { view.moving = false; view.setRect(win.to); },
        });
      } else {
        const shutter = this.makeShutter(win.to, i);
        shutters.push(shutter);
        // a line of lamplight in the seam, then the leaves part into the wall
        this.tweens.add({ targets: shutter.seam, alpha: 0.7, delay: openDelay - 250, duration: 250, yoyo: true, hold: 200 });
        this.tweens.add({ targets: shutter.leaves[0], x: shutter.x - shutter.half - 6, delay: openDelay, duration: openMs, ease: 'Cubic.easeInOut' });
        this.tweens.add({ targets: shutter.leaves[1], x: shutter.x + shutter.w + 6, delay: openDelay, duration: openMs, ease: 'Cubic.easeInOut' });
      }
    });
    if (shutters.length) this.time.delayedCall(openDelay, () => this.audio.play('shutter'));
    // the act's name, small, on the sill below the grown wall
    const act = this.act;
    this.titleKicker.setText(act.kicker ?? 'CHAPTER 1 · NIGHT SERVICE');
    this.titleMain.setText(act.heading ?? `${ROMAN[act.number] ?? act.number} · ${act.title}`);
    const titleY = Math.min(this.layout.view.h - 58, this.layout.y + this.layout.h + 96);
    this.titleBox.setScale(0.7).setAlpha(0).setY(titleY + 8);
    this.tweens.add({ targets: this.titleBox, alpha: 1, y: titleY, delay: openDelay + openMs * 0.5, duration: 600, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.titleBox, alpha: 0, delay: openDelay + openMs * 0.5 + 2600, duration: 700, ease: 'Sine.easeIn', onComplete: () => this.titleBox.setScale(1) });
    let grown = false;
    this.finishGrowth = () => {
      if (grown) return;
      grown = true;
      shutters.forEach((shutter) => shutter.destroy());
      this.growing = false;
      Object.values(this.views).forEach((view) => { view.moving = false; view.setRect(this.model.slotRect(view.id)); });
    };
    this.time.delayedCall(openDelay + openMs + 120, this.finishGrowth);
    this.armIntroFailsafe(growScheduleMs({ openDelay, openMs }));
  }

  introduce() {
    if (this.growth) { this.growIntro(this.growth); return; }
    const reduce = reducedMotionActive();
    const act = this.act;
    this.titleKicker.setText(act.kicker ?? 'CHAPTER 1 · NIGHT SERVICE');
    this.titleMain.setText(act.heading ?? `${ROMAN[act.number] ?? act.number} · ${act.title}`);
    const hold = this.startStep ? 200 : 1700;
    Object.values(this.views).forEach((view, i) => {
      view.cover.setAlpha(1);
      this.tweens.add({ targets: view.cover, alpha: 0, delay: hold + 300 + i * 170, duration: reduce ? 300 : 950, ease: 'Sine.easeOut' });
    });
    this.tweens.add({ targets: this.blackout, alpha: 0, delay: hold, duration: 800, ease: 'Sine.easeOut' });
    this.titleBox.y = this.layout.view.h / 2 + 8;
    // In and out on the one tween clock (a scene-clock timer can run ahead of
    // lag-smoothed tweens on a slow renderer and strand the card: N1) ...
    this.tweens.add({ targets: this.titleBox, alpha: 1, y: this.layout.view.h / 2, duration: 700, delay: 200, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.titleBox, alpha: 0, delay: 200 + 700 + Math.max(200, hold - 500), duration: 700, ease: 'Sine.easeIn' });
    // ... and a wall-clock deadline that clears whatever is left, at any frame rate
    this.armIntroFailsafe(introScheduleMs({ hold, tiles: Object.keys(this.views).length, reduce }));
  }

  /** Real time (not game time) by which the intro must be gone (introGuard.js). */
  armIntroFailsafe(scheduleMs) {
    const ms = scheduleMs + INTRO_FAILSAFE_SLACK_MS;
    this.introGuard.arm(ms);
    // a timer too, so the card clears even if frames stall altogether
    globalThis.clearTimeout?.(this.introTimer);
    this.introTimer = globalThis.setTimeout?.(() => { if (this.sys?.isActive() && this.introGuard.due()) this.settleIntro('timer'); }, ms + 50);
  }

  /** The fail-safe: the act title, the blackout and the covers snap to their end state. */
  settleIntro(reason = 'frame') {
    this.introSettled = reason;
    this.tweens.killTweensOf(this.titleBox);
    this.titleBox.setAlpha(0).setScale(1);
    if (!this.fading && !this.model.state.ended) {
      this.tweens.killTweensOf(this.blackout);
      this.blackout.setAlpha(0);
      Object.values(this.views).forEach((view) => { this.tweens.killTweensOf(view.cover); view.cover.setAlpha(0); });
    }
    this.finishGrowth?.();
  }

  // ---------------------------------------------------------------------------
  // zoom

  animateZoom(view, dir, rect) {
    const toState = this.model.state.tiles[view.id].state;
    const reduce = reducedMotionActive();
    const duration = reduce ? 240 : ZOOM_MS;
    const old = view.current;
    const next = this.buildState(view, toState);
    view.current = next;
    view.zooming = true;
    const [rx, ry, rw, rh] = rect;
    const W = view.w;
    const H = view.h;
    const s = Math.max(rw, rh);
    const rcx = (rx + rw / 2) * W;
    const rcy = (ry + rh / 2) * H;
    // the child (zoomed) layer sits inside the rect, scaled down
    const child = dir === 'in' ? next : old;
    const parent = dir === 'in' ? old : next;
    child.root.setScale(s);
    child.root.setPosition(rcx - (W * s) / 2, rcy - (H * s) / 2);
    view.stateLayer.bringToTop(child.root);
    this.audio.play(dir === 'in' ? 'zoomIn' : 'zoomOut');
    const tween = { t: 0 };
    const frame = (t) => {
      const k = dir === 'in' ? ease(t) : 1 - ease(t);
      // view span interpolated in log space for an even feel
      const span = Math.exp(lerp(Math.log(1), Math.log(s), k));
      view.focus = { cx: lerp(W / 2, rcx, k), cy: lerp(H / 2, rcy, k), zoom: 1 / span };
      const fadeChild = dir === 'in' ? clamp((t - 0.2) / 0.55, 0, 1) : clamp(1 - (t - 0.15) / 0.55, 0, 1);
      child.root.setAlpha(fadeChild);
      parent.root.setAlpha(dir === 'in' ? 1 - clamp((t - 0.55) / 0.45, 0, 1) : clamp((t - 0.1) / 0.5, 0, 1));
      view.vignette.setAlpha(1 + Math.sin(t * Math.PI) * 0.6);
      view.apply();
    };
    frame(0);
    this.tweens.add({
      targets: tween,
      t: 1,
      duration,
      ease: 'Linear',
      onUpdate: () => frame(tween.t),
      onComplete: () => {
        view.focus = null;
        view.destroyState(old);
        next.root.setScale(1).setPosition(0, 0).setAlpha(1);
        view.vignette.setAlpha(1);
        view.zooming = false;
        view.apply();
        // the script may have changed the state while the zoom ran (a door
        // opening right after a forced zoom-out): show what the model holds
        if (this.model.state.tiles[view.id].state !== next.stateId) this.rebuildState(view);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // drag / swap

  slotAt(x, y) {
    return this.layout.slots.find((slot) => x >= slot.x && y >= slot.y && x <= slot.x + slot.w && y <= slot.y + slot.h) ?? null;
  }

  liftView(view, on) {
    view.lifted = on;
    if (on) this.dragLayer.add(view.bezel); else this.bezelLayer.add(view.bezel);
    if (!on) {
      this.bezelLayer.bringToTop(this.linkG);
      this.bezelLayer.bringToTop(this.targetG);
      this.bezelLayer.bringToTop(this.crossLayer);
      this.bezelLayer.bringToTop(this.gripG);
    }
    this.orderCameras();
  }

  onDragStart(tileId) {
    const view = this.views[tileId];
    this.liftView(view, true);
    this.shadow.setVisible(true);
    this.audio.play('lift');
    this.tweens.add({ targets: view.rect, scale: 1.045, duration: 160, ease: 'Sine.easeOut', onUpdate: () => view.apply() });
    this.tweens.add({ targets: this.shadow, alpha: 0.75, duration: 160 });
  }

  onDragEnd({ tile, swapped, from, to }) {
    this.showDropTarget(null);
    const view = this.views[tile];
    const reduce = reducedMotionActive();
    const target = this.layout.slots[to];
    this.tweens.killTweensOf(view.rect);
    view.moving = true;
    this.tweens.add({
      targets: view.rect,
      x: target.x,
      y: target.y,
      scale: 1,
      rot: 0,
      duration: reduce ? 160 : 420,
      ease: reduce ? 'Sine.easeOut' : 'Back.easeOut',
      easeParams: [1.4],
      onUpdate: () => view.apply(),
      onComplete: () => {
        view.moving = false;
        view.apply();
        this.liftView(view, false);
        this.audio.play('settle');
        if (!reduce) this.bumpBezel(view);
      },
    });
    this.tweens.add({ targets: this.shadow, alpha: 0, duration: 260, onComplete: () => this.shadow.setVisible(false) });
    if (swapped) {
      this.audio.play('whoosh');
      const otherId = this.model.tileAt(from);
      const other = otherId ? this.views[otherId] : null;
      if (other) {
        const dest = this.layout.slots[from];
        other.moving = true;
        const arc = { t: 0 };
        const start = { x: other.rect.x, y: other.rect.y };
        this.tweens.add({
          targets: arc,
          t: 1,
          duration: reduce ? 160 : 460,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            other.rect.x = lerp(start.x, dest.x, arc.t);
            other.rect.y = lerp(start.y, dest.y, arc.t);
            other.rect.scale = 1 - Math.sin(arc.t * Math.PI) * (reduce ? 0 : 0.04);
            other.apply();
          },
          onComplete: () => { other.moving = false; other.setRect(dest); },
        });
      }
    }
  }

  showDropTarget(slot) {
    const g = this.targetG;
    g.clear();
    if (!slot) return;
    g.lineStyle(10, 0xffc46a, 0.16);
    g.strokeRoundedRect(slot.x - 20, slot.y - 20, slot.w + 40, slot.h + 40, 28);
    g.lineStyle(3, 0xffd9a0, 0.75);
    g.strokeRoundedRect(slot.x - 16, slot.y - 16, slot.w + 32, slot.h + 32, 24);
  }

  bumpBezel(view) {
    this.tweens.add({ targets: view.ring, alpha: { from: 1, to: 0.85 }, duration: 90, yoyo: true });
  }

  // ---------------------------------------------------------------------------
  // links

  linkEndpoints(link) {
    const a = this.views[link.a];
    const b = this.views[link.b];
    if (link.dir === 'h') return [a.screen(1, link.at), b.screen(0, link.at)];
    return [a.screen(link.at, 1), b.screen(link.at, 0)];
  }

  onLinkOn(link, tries = 0) {
    const a = this.views[link.a];
    const b = this.views[link.b];
    if (a.lifted || b.lifted) return;
    // wait for a settling swap or a zoom so the light runs on the final picture
    if (a.moving || b.moving || a.zooming || b.zooming) {
      if (tries < 30) this.time.delayedCall(80, () => { if (this.model.findLink(link.a, link.b, link.type)) this.onLinkOn(link, tries + 1); });
      return;
    }
    this.audio.play('chime');
    this.bridgeFlash.set(link.key, this.clock);
    const [p, q] = this.linkEndpoints(link);
    const span = 150;
    const points = link.dir === 'h'
      ? [{ x: p.x - span, y: p.y }, p, q, { x: q.x + span, y: q.y }]
      : [{ x: p.x, y: p.y - span * 0.6 }, p, q, { x: q.x, y: q.y + span * 0.6 }];
    this.fxApi().lightRun(points, { duration: 650 });
  }

  onMismatch(list) {
    const reduce = reducedMotionActive();
    let any = false;
    list.forEach((m) => {
      const view = this.views[m.tile];
      if (!view) return;
      const u = m.side === 'left' ? 0 : m.side === 'right' ? 1 : m.at;
      const v = m.side === 'top' ? 0 : m.side === 'bottom' ? 1 : m.at;
      this.time.delayedCall(430, () => {
        const pt = view.screen(u, v);
        this.shimmer(pt.x, pt.y, reduce);
      });
      any = true;
    });
    if (any) this.time.delayedCall(430, () => this.audio.play('mismatch'));
  }

  shimmer(x, y, reduce = false) {
    for (let i = 0; i < (reduce ? 2 : 6); i += 1) {
      const spark = this.add.image(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 30, 'nsv-spark').setBlendMode('ADD').setTint(0xffd9a0).setScale(0.3 + Math.random() * 0.4).setAlpha(0);
      this.topLayer.add(spark);
      this.tweens.add({ targets: spark, alpha: { from: 0, to: 0.9 }, duration: 140, delay: i * 70, yoyo: true, hold: 120, onComplete: () => spark.destroy() });
    }
    const halo = this.add.image(x, y, 'nsv-radial').setBlendMode('ADD').setTint(0xff9a50).setDisplaySize(90, 90).setAlpha(0);
    this.topLayer.add(halo);
    this.tweens.add({ targets: halo, alpha: 0.45, duration: 200, yoyo: true, hold: 200, onComplete: () => halo.destroy() });
  }

  drawLinks() {
    const g = this.linkG;
    g.clear();
    this.model.links().forEach((link) => {
      const a = this.views[link.a];
      const b = this.views[link.b];
      if (a.lifted || b.lifted || a.moving || b.moving || a.zooming || b.zooming) return;
      const [p, q] = this.linkEndpoints(link);
      const since = this.clock - (this.bridgeFlash.get(link.key) ?? -1e9);
      const flash = Math.max(0, 1 - since / 900);
      const pulse = 0.5 + Math.sin(this.clock / 700 + link.at * 9) * 0.5;
      const glowA = 0.18 + pulse * 0.1 + flash * 0.6;
      if (link.type === 'floor' || link.type === 'path') {
        g.fillStyle(0x5a3a22, 1);
        g.fillRect(p.x - 3, p.y - 1, q.x - p.x + 6, 7);
        g.fillStyle(0xe0a24a, glowA);
        g.fillRect(p.x - 3, p.y - 3, q.x - p.x + 6, 3);
        g.lineStyle(2.4, 0xeadfc6, 0.9);
        g.lineBetween(p.x - 3, p.y, q.x + 3, q.y);
      } else if (link.type === 'chute' || link.type === 'pipe') {
        g.fillStyle(0x8a6934, 1);
        g.fillRect(p.x - 13, p.y - 3, 26, q.y - p.y + 6);
        g.fillStyle(0xe3c27e, 0.6);
        g.fillRect(p.x - 11, p.y - 3, 5, q.y - p.y + 6);
        g.fillStyle(0xb08a4a, 1);
        g.fillRect(p.x - 17, p.y + (q.y - p.y) / 2 - 4, 34, 8);
        g.lineStyle(2, 0xeadfc6, 0.8);
        g.strokeRect(p.x - 13, p.y - 3, 26, q.y - p.y + 6);
        g.fillStyle(0xffc46a, glowA * 0.8);
        g.fillRect(p.x - 13, p.y - 3, 26, q.y - p.y + 6);
      } else if (link.type === 'rail') {
        g.lineStyle(3, 0xb08a4a, 1);
        g.lineBetween(p.x - 2, p.y, q.x + 2, q.y);
        g.lineBetween(p.x - 2, p.y + 6, q.x + 2, q.y + 6);
        g.lineStyle(2, 0xeadfc6, 0.5 + flash * 0.5);
        g.lineBetween(p.x - 2, p.y - 1, q.x + 2, q.y - 1);
      } else {
        g.lineStyle(4, 0xe0a24a, 0.6 + flash * 0.4);
        g.lineBetween(p.x, p.y, q.x, q.y);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // bell and time of day

  applyGrades(instant = false) {
    const [color, alpha] = GRADES[this.model.timeOfDay()] ?? GRADES.dusk;
    Object.values(this.views).forEach((view) => {
      if (instant) { view.grade.setFillStyle(color, alpha); return; }
      const from = Phaser.Display.Color.IntegerToColor(view.grade.fillColor);
      const to = Phaser.Display.Color.IntegerToColor(color);
      const a0 = view.grade.fillAlpha;
      const tw = { t: 0 };
      this.tweens.add({
        targets: tw,
        t: 1,
        duration: 2400,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.t * 100);
          view.grade.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), lerp(a0, alpha, tw.t));
        },
      });
    });
  }

  onBell({ memory }) {
    this.audio.play('bell');
    const reduce = reducedMotionActive();
    Object.values(this.views).forEach((view, i) => {
      const ring = this.add.graphics();
      view.fxLayer.add(ring);
      const state = { r: 20, a: 0.85 };
      this.tweens.add({
        targets: state,
        r: Math.hypot(view.w, view.h) * 0.62,
        a: 0,
        delay: i * 90,
        duration: reduce ? 900 : 2000,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          ring.clear();
          ring.lineStyle(reduce ? 3 : 7, 0xffd9a0, state.a * 0.8);
          ring.strokeCircle(view.w / 2, view.h / 2, state.r);
          if (!reduce) {
            ring.lineStyle(2, 0xffffff, state.a * 0.45);
            ring.strokeCircle(view.w / 2, view.h / 2, state.r * 0.84);
            ring.lineStyle(14, 0xffb060, state.a * 0.12);
            ring.strokeCircle(view.w / 2, view.h / 2, state.r * 0.92);
          }
        },
        onComplete: () => ring.destroy(),
      });
      // a warm breath of light across the window as the bell sounds
      const wash = this.add.rectangle(0, 0, view.w, view.h, 0xffd9a0, 0).setOrigin(0, 0).setBlendMode('ADD');
      view.fxLayer.add(wash);
      this.tweens.add({ targets: wash, alpha: 0.16, delay: i * 90, duration: 260, yoyo: true, ease: 'Sine.easeOut', onComplete: () => wash.destroy() });
    });
    if (!reduce) this.cameras.main.shake(260, 0.0015);
    this.applyGrades();
    // the train remembers: previously built links glow again
    memory.forEach((entry, i) => this.time.delayedCall(300 + i * 160, () => this.bridgeFlash.set(entry.key, this.clock)));
  }

  // ---------------------------------------------------------------------------
  // captions and cards

  showLine(line) {
    this.caption = { speaker: line.speaker ?? '', text: line.text ?? '', shown: 0, done: false, lastTick: 0 };
    this.captionSpeaker.setText(this.caption.speaker);
    this.layoutCaption(this.caption.text);
    this.captionText.setText('');
    this.captionNext.setVisible(false);
    // a spoken line always wins over a lingering act title
    if (this.titleBox.alpha > 0) this.tweens.add({ targets: this.titleBox, alpha: 0, duration: 200 });
    if (!this.captionBox.visible) {
      this.captionBox.setVisible(true).setAlpha(0);
      this.captionBox.y += 12;
      this.tweens.add({ targets: this.captionBox, alpha: 1, y: this.captionBox.y - 12, duration: 260, ease: 'Sine.easeOut' });
    }
  }

  /** Size the bar to the full line so the typewriter never reflows it. */
  layoutCaption(fullText) {
    const prev = this.captionText.text;
    this.captionText.setText(fullText);
    const textH = this.captionText.height;
    this.captionText.setText(prev);
    const speakerH = this.captionSpeaker.text ? this.captionSpeaker.height + 6 : 0;
    const boxH = Math.max(116, Math.ceil(speakerH + textH + 44));
    this.captionBg.setSize(1240, boxH);
    this.captionSpeaker.setY(-boxH + 20);
    this.captionText.setY(-boxH + 20 + speakerH);
  }

  showCaption({ text, speaker = '', ms = 3200 }) {
    this.showLine({ speaker, text });
    this.caption.auto = ms;
  }

  hideCaption() {
    this.caption = null;
    this.tweens.add({ targets: this.captionBox, alpha: 0, duration: 220, onComplete: () => this.captionBox.setVisible(false) });
  }

  advanceCaption() {
    if (!this.caption) return false;
    if (!this.caption.done) {
      this.caption.shown = this.caption.text.length;
      return true;
    }
    if (this.caption.auto) { this.hideCaption(); return true; }
    this.model.advanceDialogue();
    return true;
  }

  updateCaption(dt) {
    const cap = this.caption;
    if (!cap) return;
    if (!cap.done) {
      const before = Math.floor(cap.shown);
      cap.shown = Math.min(cap.text.length, cap.shown + dt * 0.042);
      const now = Math.floor(cap.shown);
      if (now !== before && now % 3 === 0 && cap.text[now - 1] !== ' ') this.audio.play('type');
      this.captionText.setText(cap.text.slice(0, now));
      if (now >= cap.text.length) cap.done = true;
    } else {
      this.captionText.setText(cap.text);
      this.captionNext.setVisible(!cap.auto && Math.sin(this.clock / 260) > -0.2);
      if (cap.auto) {
        cap.auto -= dt;
        if (cap.auto <= 0) this.hideCaption();
      }
    }
  }

  showCard(card) {
    if (!card) return;
    this.cardStamp.setText(card.stamp ?? '');
    this.cardTitle.setText(card.title ?? '').setFontSize(44);
    // long titles shrink to fit the card
    if (this.cardTitle.width > 560) this.cardTitle.setFontSize(Math.floor(44 * (560 / this.cardTitle.width)));
    this.cardLines.setText((card.lines ?? []).join('\n'));
    this.cardBox.setVisible(true).setAlpha(0).setAngle(-3);
    this.cardBox.y = this.layout.view.h / 2 - 10;
    this.tweens.add({ targets: this.cardBox, alpha: 1, angle: -1, y: this.layout.view.h / 2 - 30, duration: 320, ease: 'Back.easeOut' });
    this.audio.play('paper');
    this.strikeCardLine(card);
  }

  /** The Archivist's red pencil: strike one line of the open card. */
  strikeCardLine(card) {
    const lines = card.lines ?? [];
    const index = card.strike;
    if (index === undefined || !lines[index]) return;
    const text = this.cardLines;
    const counts = lines.map((line) => Math.max(1, text.getWrappedText(line).length));
    const total = counts.reduce((a, b) => a + b, 0);
    const lineH = text.height / Math.max(1, total);
    const before = counts.slice(0, index).reduce((a, b) => a + b, 0);
    const scratch = document.createElement('canvas').getContext('2d');
    scratch.font = `${text.style.fontSize} ${text.style.fontFamily}`;
    const wrapped = text.getWrappedText(lines[index]);
    const g = this.add.graphics();
    this.cardBox.add(g);
    this.cardStrike = g;
    const rows = wrapped.map((row, i) => ({ y: text.y + (before + i + 0.55) * lineH, w: scratch.measureText(row).width }));
    const run = { t: 0 };
    this.time.delayedCall(card.strikeDelay ?? 1100, () => {
      if (!this.cardBox.visible) return;
      this.audio.play('scratch');
      this.tweens.add({
        targets: run,
        t: 1,
        duration: 700,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          g.clear();
          rows.forEach((row, i) => {
            const k = Math.max(0, Math.min(1, run.t * rows.length - i));
            if (!k) return;
            g.lineStyle(4, 0xb3261e, 0.85);
            g.beginPath();
            g.moveTo(text.x - 8, row.y + 2);
            const end = text.x - 8 + (row.w + 20) * k;
            for (let x = text.x - 8; x <= end; x += 14) g.lineTo(x, row.y + Math.sin(x * 0.07) * 1.6 + 2);
            g.strokePath();
          });
        },
      });
    });
  }

  buildSockets() {
    // five stone sockets below the brass sill, at its right end: clear of the
    // wall's rivets, and drawn above the lens so it never hides them
    const sillY = this.wallInfo?.sillY ?? this.layout.y + this.layout.h + 56;
    const cx = this.layout.x + this.layout.w - 68;
    const y = Math.min(this.layout.view.h - 28, sillY + 42);
    this.sockets = this.add.container(cx, y).setVisible(false);
    this.topLayer.addAt(this.sockets, this.topLayer.getIndex(this.blackout));
    const plate = this.add.graphics();
    plate.fillStyle(0x0e0906, 0.85);
    plate.fillRoundedRect(-96, -20, 192, 40, 20);
    plate.lineStyle(1.5, 0xb08a4a, 0.8);
    plate.strokeRoundedRect(-96, -20, 192, 40, 20);
    this.sockets.add(plate);
    this.socketGems = [];
    for (let i = 0; i < 5; i += 1) {
      const x = (i - 2) * 34;
      const ring = this.add.circle(x, 0, 11, 0x1c130d).setStrokeStyle(3, 0xb08a4a);
      const gem = this.add.circle(x, 0, 7, 0xff7a3a).setVisible(false);
      const glow = this.add.image(x, 0, 'nsv-radial').setBlendMode('ADD').setTint(0xff8a40).setDisplaySize(46, 46).setVisible(false);
      this.sockets.add([ring, glow, gem]);
      this.socketGems.push({ gem, glow });
    }
    this.refreshSockets(false);
  }

  refreshSockets(animate) {
    let count = 0;
    try { count = magicStoneSnapshot().count; } catch { count = 0; }
    if (this.model.state.flags.some((flag) => flag.startsWith('stone:'))) count = Math.max(1, count);
    if (!count) return;
    const wasHidden = !this.sockets.visible;
    this.sockets.setVisible(true);
    if (animate && wasHidden) {
      this.sockets.setAlpha(0);
      this.tweens.add({ targets: this.sockets, alpha: 1, duration: 700 });
    }
    this.socketGems.forEach(({ gem, glow }, i) => {
      const on = i < count;
      if (on && animate && !gem.visible) {
        gem.setVisible(true).setScale(0);
        glow.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: gem, scale: 1, duration: 500, delay: 700, ease: 'Back.easeOut' });
        this.tweens.add({ targets: glow, alpha: 0.8, duration: 600, delay: 700 });
      } else {
        gem.setVisible(on);
        glow.setVisible(on).setAlpha(0.7);
      }
    });
  }

  hideCard() {
    this.cardStrike?.destroy();
    this.cardStrike = null;
    this.audio.play('paper');
    this.tweens.add({ targets: this.cardBox, alpha: 0, y: this.cardBox.y + 30, duration: 220, onComplete: () => this.cardBox.setVisible(false) });
  }

  // ---------------------------------------------------------------------------
  // effects

  fxApi() {
    const scene = this;
    return {
      scene,
      model: this.model,
      audio: this.audio,
      top: this.topLayer,
      reduceMotion: () => reducedMotionActive(),
      screen: (tile, u, v) => this.views[tile].screen(u, v),
      zoomScale: () => 1,
      view: (tile) => this.views[tile],
      rig: (id) => this.rigs[id]?.rig ?? null,
      rigScale: (id) => Math.abs(this.rigs[id]?.rig.root.scaleX ?? 1),
      rigPoint: (id, lx, ly) => {
        const entry = this.rigs[id];
        const actor = this.model.state.actors[id];
        const view = this.views[actor.tile];
        const scale = Math.abs(entry.rig.root.scaleX);
        const u = actor.x + (lx * scale * actor.facing) / view.w;
        const v = actor.y + (ly * scale) / view.h;
        return view.screen(u, v);
      },
      topSprite: (key, x, y) => {
        const image = this.add.image(x, y, key);
        if (key.startsWith('nsv-sprite-') || key.startsWith('nsv-conductor') || key.startsWith('nsv-butch')) image.setScale(1 / 3);
        this.topLayer.add(image);
        return image;
      },
      flash: (tile, u, v, { color = 0xffc46a, size = 140, duration = 700, repeat = 0 } = {}) => {
        const view = this.views[tile];
        const glow = this.add.image(u * view.w, v * view.h, 'nsv-radial').setBlendMode('ADD').setTint(color).setDisplaySize(size, size).setAlpha(0);
        view.fxLayer.add(glow);
        this.tweens.add({ targets: glow, alpha: 0.9, duration: duration / 2, yoyo: true, repeat, ease: 'Sine.easeInOut', onComplete: () => glow.destroy() });
      },
      sparkle: (x, y, count = 6) => {
        for (let i = 0; i < count; i += 1) {
          const spark = this.add.image(x, y, 'nsv-spark').setBlendMode('ADD').setTint(0xffe0a0).setScale(0.35);
          this.topLayer.add(spark);
          const a = (i / count) * Math.PI * 2;
          this.tweens.add({ targets: spark, x: x + Math.cos(a) * 34, y: y + Math.sin(a) * 34, alpha: 0, scale: 0.1, duration: 620, ease: 'Sine.easeOut', onComplete: () => spark.destroy() });
        }
      },
      lightRun: (points, { duration = 700, delay = 0, color = 0xffd08a, trail: trailMax = 14 } = {}) => {
        const dot = this.add.image(points[0].x, points[0].y, 'nsv-radial').setBlendMode('ADD').setTint(color).setDisplaySize(70, 70).setAlpha(0);
        const core = this.add.image(points[0].x, points[0].y, 'nsv-dot').setBlendMode('ADD').setScale(1.2).setAlpha(0);
        this.topLayer.add([dot, core]);
        const lengths = [];
        let total = 0;
        for (let i = 1; i < points.length; i += 1) {
          const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
          lengths.push(d);
          total += d;
        }
        const run = { t: 0 };
        const trail = [];
        this.tweens.add({
          targets: run,
          t: 1,
          delay,
          duration,
          ease: 'Sine.easeInOut',
          onStart: () => { dot.setAlpha(0.9); core.setAlpha(1); },
          onUpdate: () => {
            let dist = run.t * total;
            let i = 0;
            while (i < lengths.length - 1 && dist > lengths[i]) { dist -= lengths[i]; i += 1; }
            const k = lengths[i] ? dist / lengths[i] : 0;
            const x = lerp(points[i].x, points[i + 1].x, k);
            const y = lerp(points[i].y, points[i + 1].y, k);
            dot.setPosition(x, y);
            core.setPosition(x, y);
            const fade = Math.sin(run.t * Math.PI);
            dot.setAlpha(0.9 * fade + 0.1);
            if (trail.length < trailMax && Math.random() < 0.6) {
              const bit = this.add.image(x, y, 'nsv-dot').setBlendMode('ADD').setTint(color).setScale(0.8).setAlpha(0.7);
              this.topLayer.add(bit);
              trail.push(bit);
              this.tweens.add({ targets: bit, alpha: 0, scale: 0.2, duration: 380, onComplete: () => bit.destroy() });
            }
          },
          onComplete: () => { dot.destroy(); core.destroy(); },
        });
      },
      fadeAll: (ms) => this.fadeAll(ms),
    };
  }

  runFx(params) {
    const custom = this.act.fx?.[params.name];
    if (custom) { custom(this.fxApi(), params); return; }
    if (params.name === 'fadeAll') this.fadeAll(params.ms ?? 1600);
    else if (params.name === 'pulse') this.pulseHint(params.hint ?? params);
    else if (params.name === 'drift') {
      const rate = params.rate ?? 1;
      const holder = { r: this.model.driftRate ?? 1 };
      this.tweens.add({ targets: holder, r: rate, duration: params.ease ?? 1800, ease: 'Sine.easeInOut', onUpdate: () => { this.model.driftRate = holder.r; } });
      this.audio.setRailRate(Math.max(0.25, rate));
    }
    else if (params.name === 'shake') this.cameras.main.shake(params.ms ?? 300, 0.003);
  }

  fadeAll(ms = 1600) {
    this.fading = true;
    const views = Object.values(this.views);
    const per = ms * 0.55;
    views.forEach((view, i) => {
      this.tweens.add({ targets: view.cover, alpha: 1, delay: (i * (ms - per)) / Math.max(1, views.length - 1), duration: per, ease: 'Sine.easeIn' });
    });
    this.tweens.add({ targets: this.blackout, alpha: 1, delay: ms * 0.7, duration: ms * 0.3 });
  }

  flashBlocked() {
    const butch = this.model.state.actors.butch;
    const view = this.views[butch?.tile];
    if (!view) return;
    const pt = view.screen(butch.x, butch.y);
    this.shimmer(pt.x, pt.y - 20, reducedMotionActive());
  }

  // ---------------------------------------------------------------------------
  // hints

  /** A soft amber bloom for idle hints (top layer, screen coords). */
  hintGlow(x, y, size) {
    const glow = this.add.image(x, y, 'nsv-radial').setBlendMode('ADD').setTint(0xffc46a).setDisplaySize(size, size).setAlpha(0);
    this.topLayer.add(glow);
    // soft, but long enough to be seen: three slow breaths
    this.tweens.add({ targets: glow, alpha: 0.6, duration: 750, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => glow.destroy() });
  }

  /**
   * Tier 1, made to be seen: a bright amber beacon over a target (above the
   * lens and the grade) — a glow and three rings rippling out from it, with a
   * dark edge so it reads on gold as well as on night. Under Reduce Motion
   * the rings breathe in place instead of spreading.
   */
  beacon(x, y, r = 60) {
    const reduce = reducedMotionActive();
    const glow = this.add.image(x, y, 'nsv-radial').setBlendMode('ADD').setTint(0xffc46a).setDisplaySize(r * 3.4, r * 3.4).setAlpha(0);
    this.beaconLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.95, duration: 420, yoyo: true, hold: 700, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => glow.destroy() });
    [0, 1, 2].forEach((i) => {
      const g = this.add.graphics();
      this.beaconLayer.add(g);
      const st = { t: 0 };
      this.tweens.add({
        targets: st,
        t: 1,
        delay: i * 450,
        duration: reduce ? 1200 : 1150,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          const rr = reduce ? r * 1.1 : r * (0.75 + st.t * 0.9);
          // bright for most of its life, then gone
          const a = reduce ? Math.sin(st.t * Math.PI) : 1 - st.t ** 3;
          g.clear();
          g.lineStyle(13, 0x0b0705, 0.4 * a);
          g.strokeCircle(x, y, rr);
          g.lineStyle(7, 0xffb040, a);
          g.strokeCircle(x, y, rr);
          g.lineStyle(2.5, 0xfff4dc, a);
          g.strokeCircle(x, y, rr);
        },
        onComplete: () => g.destroy(),
      });
    });
  }

  pulseHint(hint) {
    if (hint?.actor) {
      // pulse where a walker is waiting, and the edge it is waiting at
      const actor = this.model.state.actors[hint.actor];
      const view = actor && this.views[actor.tile];
      if (!view) return;
      const pt = view.screen(actor.x, actor.y);
      this.hintGlow(pt.x, pt.y - 30, 150);
      this.shimmer(pt.x, pt.y - 24);
      this.beacon(pt.x, pt.y - 30, 56);
      const target = actor.walk?.path?.[actor.walk.index];
      if (target && target.tile !== actor.tile) {
        const edgePt = view.screen(Math.min(1, Math.max(0, target.x === 0 ? 1 : target.x)), actor.y);
        this.time.delayedCall(300, () => { this.shimmer(edgePt.x, edgePt.y); this.beacon(edgePt.x, edgePt.y, 40); });
      }
      if (hint.tile) this.pulseHint({ ...hint, actor: null });
      return;
    }
    if (hint?.lens && this.model.state.lens.enabled) {
      // the lens rim swells and glows: this is the thing to move
      const lens = this.model.state.lens;
      this.tweens.add({ targets: this.lensView, scale: reducedMotionActive() ? 1.04 : 1.12, duration: 380, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
      this.hintGlow(lens.x, lens.y, lens.r * 3);
      this.beacon(lens.x, lens.y, lens.r * 0.95);
      [0, 1, 2, 3].forEach((i) => this.time.delayedCall(i * 110, () => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        this.shimmer(lens.x + Math.cos(a) * lens.r, lens.y + Math.sin(a) * lens.r);
      }));
    }
    if (!hint?.tile) return;
    const view = this.views[hint.tile];
    if (!view) return;
    if (hint.zoomOut) {
      // the ⤢ glyph swells: stepping back is the thing to do
      if (this.model.canZoomOut(hint.tile)) {
        const glyph = this.glyphAt(hint.tile);
        this.tweens.add({ targets: view.glyph, scale: 0.72, duration: 240, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => view.glyph.setScale(0.5) });
        this.hintGlow(glyph.x, glyph.y, 150);
        this.beacon(glyph.x, glyph.y, glyph.r * 1.4);
      }
      return;
    }
    if (hint.hotspots) {
      const live = this.model.hotspots(hint.tile).find((h) => h.enabled && hint.hotspots.includes(h.id));
      if (live) this.pulseHint({ tile: hint.tile, hotspot: live.id });
      return;
    }
    if (hint.frame) {
      // the frame's edge breathes: this is the thing you can lift
      const g = this.add.graphics();
      view.fxLayer.add(g);
      const state = { a: 0 };
      this.tweens.add({
        targets: state, a: 1, duration: 520, yoyo: true, repeat: 1,
        onUpdate: () => { g.clear(); g.lineStyle(10, 0xffc46a, 0.45 * state.a); g.strokeRoundedRect(14, 14, view.w - 28, view.h - 28, 22); },
        onComplete: () => g.destroy(),
      });
      [[0.5, 0.02], [0.02, 0.5], [0.98, 0.5], [0.5, 0.98]].forEach(([u, v], i) => this.time.delayedCall(i * 120, () => { const p = view.screen(u, v); this.shimmer(p.x, p.y); }));
      // the beacon sits where a hand takes hold of the frame
      const frameId = this.model.frameOn(hint.tile);
      if (frameId) {
        const slot = this.model.slotRect(hint.tile);
        const holds = framePoints(this.model.frameGrip(frameId)).map(([u, v]) => ({ x: slot.x + u * slot.w, y: slot.y + v * slot.h }));
        const at = this.clearOfLens(holds);
        this.beacon(at.x, at.y, 46);
      }
    }
    if (hint.hotspot) {
      const entry = view.current?.tags.find((tag) => tag.hotspot.id === hint.hotspot);
      if (entry?.holder.visible) {
        this.tweens.add({ targets: entry.holder, scale: 1.35, duration: 260, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
        this.audio.play('glint');
      }
      const h = this.model.hotspots(hint.tile).find((spot) => spot.id === hint.hotspot);
      if (h) {
        const glow = this.add.image((h.rect[0] + h.rect[2] / 2) * view.w, (h.rect[1] + h.rect[3] / 2) * view.h, 'nsv-radial').setBlendMode('ADD').setTint(0xffc46a).setDisplaySize(h.rect[2] * view.w * 2, h.rect[3] * view.h * 2).setAlpha(0);
        view.fxLayer.add(glow);
        this.tweens.add({ targets: glow, alpha: 0.65, duration: 700, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => glow.destroy() });
        const c = view.screen(h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2);
        const size = Math.max(h.rect[2] * view.w, h.rect[3] * view.h) * view.base * 0.5;
        this.beacon(c.x, c.y, clamp(size + 18, 40, 150));
      }
    } else if (hint.edge) {
      const { side, at } = hint.edge;
      const u = side === 'left' ? 0 : side === 'right' ? 1 : at;
      const v = side === 'top' ? 0 : side === 'bottom' ? 1 : at;
      const pt = view.screen(u, v);
      this.shimmer(pt.x, pt.y);
      this.beacon(pt.x, pt.y, 44);
    }
    // a soft breath of light over the whole window
    this.tweens.add({ targets: view.ring, alpha: { from: 1, to: 0.7 }, duration: 500, yoyo: true });
  }

  /**
   * The composition goal (`hint.seams`): both ends of the first seam still
   * apart glow, joined by a dashed amber thread, so the player sees which
   * two edges have to meet, not only the next swap (alpha R1-2).
   */
  pulseSeam(step) {
    const seam = step?.hint?.seams ? unmetSeam(this.model, step.hint.seams) : null;
    if (!seam) return null;
    const rectA = this.model.slotRect(seam.a);
    const rectB = this.model.slotRect(seam.b);
    if (!rectA || !rectB) return null;
    const OPP = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
    const pa = edgePoint(rectA, seam.side, seam.at);
    const pb = edgePoint(rectB, OPP[seam.side], seam.at);
    const reduce = reducedMotionActive();
    [pa, pb].forEach((pt, i) => this.time.delayedCall(i * 260, () => {
      this.hintGlow(pt.x, pt.y, 130);
      this.shimmer(pt.x, pt.y, reduce);
      this.beacon(pt.x, pt.y, 42);
    }));
    // the thread between the two ends (straight across the wall)
    const g = this.add.graphics();
    this.beaconLayer.add(g);
    const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    const state = { a: 0 };
    const draw = () => {
      g.clear();
      const dash = 16;
      const gap = 12;
      const ux = (pb.x - pa.x) / Math.max(1, len);
      const uy = (pb.y - pa.y) / Math.max(1, len);
      [[9, 0x1a0f08, 0.55], [4, 0xffc46a, 0.95]].forEach(([width, color, alpha]) => {
        g.lineStyle(width, color, alpha * state.a);
        for (let d = 0; d < len; d += dash + gap) {
          const e = Math.min(len, d + dash);
          g.lineBetween(pa.x + ux * d, pa.y + uy * d, pa.x + ux * e, pa.y + uy * e);
        }
      });
    };
    this.tweens.add({ targets: state, a: 1, duration: 600, yoyo: true, hold: 1400, repeat: reduce ? 0 : 1, ease: 'Sine.easeInOut', onUpdate: draw, onComplete: () => g.destroy() });
    this.seamCues = (this.seamCues ?? 0) + 1;
    this.lastSeamCue = { a: seam.a, b: seam.b, side: seam.side };
    return seam;
  }

  /** Tier 1: pulse whatever the ghost hand would point at (or the step's own hint). */
  pulseForStep(step) {
    this.pulseSeam(step);
    const g = pickGesture(this.model, step);
    if (!g) { this.pulseHint(step?.hint); return; }
    if (g.kind === 'click') this.pulseHint({ tile: g.tile, hotspot: g.hotspot });
    else if (g.kind === 'zoomOut') this.pulseHint({ tile: g.tile, zoomOut: true });
    else if (g.kind === 'frame') this.pulseHint({ tile: g.from, frame: true });
    else if (g.kind === 'lens') {
      this.pulseHint({ lens: true });
      const p = this.views[g.tile].screen(g.u, g.v);
      this.time.delayedCall(420, () => { this.hintGlow(p.x, p.y, 170); this.beacon(p.x, p.y, 50); });
    } else if (g.kind === 'drag') {
      this.pulseHint(step?.hint?.edge || step?.hint?.actor ? step.hint : { tile: g.tile });
      const slot = this.layout.slots[g.to];
      const from = this.gesturePoints(g).from;
      this.beacon(from.x, from.y, 54);
      this.time.delayedCall(360, () => {
        this.hintGlow(slot.x + slot.w / 2, slot.y + slot.h / 2, Math.min(slot.w, slot.h) * 1.1);
        this.beacon(slot.x + slot.w / 2, slot.y + slot.h / 2, Math.min(slot.w, slot.h) * 0.32);
      });
    }
  }

  /** Tier 3: one line from the Conductor (never over a spoken line). */
  hintCaption(step) {
    const text = hintLine(this.act.id, step?.id, this.model);
    if (!text || (this.caption && !this.caption.auto)) return false;
    this.hintCaptions += 1;
    this.showCaption({ speaker: this.act.hintSpeaker ?? HINT_SPEAKER, text, ms: 6500 });
    return true;
  }

  /** SHOW ME: tier 2 at once (pause menu → `nightfall:hint`, or H). */
  requestHint() {
    if (!this.sys?.isActive() || !this.model) return false;
    const step = this.model.currentStep();
    if (!step?.hint || this.model.isLocked() || this.fading || this.growing) return false;
    // the Conductor's tier-3 line comes back with SHOW ME (alpha R1-3)
    if (this.hints.request().includes('caption')) this.time.delayedCall(450, () => this.hintCaption(this.model.currentStep()));
    const gesture = pickGesture(this.model, step);
    if (gesture) {
      // the goal as well as the next move
      this.pulseSeam(step);
      return this.playGhost(gesture, 'request');
    }
    this.pulseForStep(step);
    return true;
  }

  updateHints(dt) {
    const m = this.model;
    const step = m.currentStep();
    const key = step?.hint ? `${this.act.id}:${step.id}` : null;
    if (!this.hints.setStep(key, key ? stepVerb(m, step) : null) && key && !this.hints.verb) {
      // a step whose gesture only resolves once its beat has finished (the
      // lens appears after the punch): learn its verb as soon as it does
      this.hints.refineVerb(stepVerb(m, step));
    }
    const active = Boolean(key) && !m.isLocked() && !this.fading && !this.growing && !m.state.blocking && !m.state.queue.length
      && !m.state.card && !(this.caption && !this.caption.auto) && !this.ghost && !this.drag && !this.floating;
    this.hints.update(dt, { active }).forEach((event) => {
      if (event === 'pulse') { this.idleHints += 1; this.pulseForStep(step); }
      else if (event === 'ghost' || event === 'first') this.playGhost(pickGesture(m, step), event);
      else if (event === 'caption') this.hintCaption(step);
    });
  }

  // ---------- the ghost hand (tier 2) ----------

  /** Screen points for a gesture (computed at play time from the live layout). */
  gesturePoints(g) {
    const m = this.model;
    const slotCentre = (index) => { const slot = this.layout.slots[index]; return { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 }; };
    if (g.kind === 'click') return { at: this.views[g.tile].screen(g.u, g.v) };
    if (g.kind === 'zoomOut') { const glyph = this.glyphAt(g.tile); return { at: { x: glyph.x, y: glyph.y } }; }
    if (g.kind === 'drag') {
      // take hold of the window where the lens is not (a press there moves the lens)
      const slot = this.layout.slots[g.from];
      const grabs = [[0.5, 0.5], [0.3, 0.35], [0.7, 0.35], [0.3, 0.72], [0.7, 0.72]].map(([u, v]) => ({ x: slot.x + u * slot.w, y: slot.y + v * slot.h }));
      const from = this.clearOfLens(grabs);
      const to = slotCentre(g.to);
      return { from, to: { x: to.x + from.x - (slot.x + slot.w / 2), y: to.y + from.y - (slot.y + slot.h / 2) }, slot, off: { x: slot.x + slot.w / 2 - from.x, y: slot.y + slot.h / 2 - from.y } };
    }
    if (g.kind === 'frame') {
      // press on the frame itself (its grip), clear of the lens, and carry it
      // so that the same spot lands on the target window
      const from = m.slotRect(g.from);
      const to = m.slotRect(g.to) ?? from;
      const grip = m.frameGrip(g.frame);
      const holds = framePoints(grip).map(([u, v]) => ({ x: from.x + u * from.w, y: from.y + v * from.h, u, v }));
      const at = this.clearOfLens(holds);
      const [rx, ry, rw, rh] = grip.rect;
      return {
        from: { x: at.x, y: at.y },
        to: { x: to.x + at.u * to.w, y: to.y + at.v * to.h },
        slot: from,
        // the carried outline: the frame's own rectangle, relative to the hand
        frameRect: { x: (rx - at.u) * from.w, y: (ry - at.v) * from.h, w: rw * from.w, h: rh * from.h },
      };
    }
    if (g.kind === 'lens') {
      const lens = m.state.lens;
      return { from: { x: lens.x, y: lens.y }, to: this.views[g.tile].screen(g.u, g.v) };
    }
    return null;
  }

  /** The first of these screen points the lens does not cover (else the first). */
  clearOfLens(points, margin = 24) {
    const lens = this.model.state.lens;
    if (!lens.enabled) return points[0];
    return points.find((pt) => Math.hypot(pt.x - lens.x, pt.y - lens.y) > lens.r + margin) ?? points[0];
  }

  cancelGhost() {
    const ghost = this.ghost;
    if (!ghost) return;
    this.ghost = null;
    ghost.chain?.stop();
    this.tweens.add({ targets: ghost.layer, alpha: 0, duration: 160, onComplete: () => ghost.layer.destroy() });
  }

  /**
   * Tier 2: a translucent paper-glove hand performs the gesture once, then
   * fades. Under Reduce Motion it does not travel: it appears at each end in
   * turn, with a dotted ink path between them.
   */
  playGhost(gesture, reason = 'ghost') {
    if (!gesture) return false;
    const pts = this.gesturePoints(gesture);
    if (!pts) return false;
    this.cancelGhost();
    const reduce = reducedMotionActive();
    const layer = this.add.container(0, 0);
    this.topLayer.addAt(layer, this.topLayer.getIndex(this.lensView) + 1);
    const hand = this.add.image(0, 0, 'nsv-ghost-hand')
      .setOrigin(GHOST_HAND.tip[0] / GHOST_HAND.w, GHOST_HAND.tip[1] / GHOST_HAND.h)
      .setScale(1 / 3)
      .setAlpha(0);
    const proxy = { x: 0, y: 0, a: 0, s: 1 };
    let carried = null;
    let carriedA = 0;
    const apply = () => {
      hand.setPosition(proxy.x, proxy.y).setAlpha(proxy.a).setScale((1 / 3) * proxy.s);
      if (carried) carried.setPosition(proxy.x + carried.offX, proxy.y + carried.offY).setAlpha(proxy.a * carriedA);
    };
    const ripple = (x, y) => {
      const g = this.add.graphics();
      layer.add(g);
      const st = { r: 6, a: 0.9 };
      this.tweens.add({
        targets: st, r: reduce ? 26 : 42, a: 0, duration: 520, ease: 'Sine.easeOut',
        onUpdate: () => { g.clear(); g.lineStyle(3, 0xffd9a0, st.a); g.strokeCircle(x, y, st.r); },
        onComplete: () => g.destroy(),
      });
    };
    const path = (a, b) => {
      // Reduce Motion: a dotted ink trail says where the hand went
      const g = this.add.graphics();
      layer.addAt(g, 0);
      const n = Math.max(4, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 22));
      for (let i = 1; i < n; i += 1) {
        const t = i / n;
        g.fillStyle(0xeadfc6, 0.75);
        g.fillCircle(lerp(a.x, b.x, t), lerp(a.y, b.y, t), 3.2);
      }
    };
    const move = (p, ms) => (reduce
      ? [{ a: 0, duration: 180 }, { x: p.x, y: p.y, duration: 1 }, { a: GHOST_ALPHA, duration: 220 }]
      : [{ x: p.x, y: p.y, duration: ms, ease: 'Sine.easeInOut' }]);
    const press = (p) => ({ s: 0.84, duration: 130, ease: 'Sine.easeOut', onStart: () => ripple(p.x, p.y) });
    const release = { s: 1, duration: 150, ease: 'Sine.easeOut' };
    const hold = (ms) => ({ a: GHOST_ALPHA, duration: ms });
    const first = pts.at ?? pts.from;
    proxy.x = first.x + 130;
    proxy.y = first.y + 110;
    const tweens = [{ a: GHOST_ALPHA, duration: 280 }];
    if (gesture.kind === 'click' || gesture.kind === 'zoomOut') {
      tweens.push(...move(pts.at, 760), press(pts.at), release, hold(420));
    } else if (gesture.kind === 'drag' || gesture.kind === 'frame') {
      // carry a ghost of the window (or of its brass frame) to where it goes
      const frame = gesture.kind === 'frame';
      const slot = pts.slot;
      const g = this.add.graphics();
      if (frame) {
        // the frame itself, lifted: its brass outline, where the hand holds it
        // (ivory on dark, so it still reads where it passes over a brass bezel)
        const r = pts.frameRect;
        g.fillStyle(0xffc46a, 0.08);
        g.fillRoundedRect(r.x, r.y, r.w, r.h, 16);
        g.lineStyle(14, 0x0b0705, 0.45);
        g.strokeRoundedRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16, 16);
        g.lineStyle(9, 0xd9b56e, 0.9);
        g.strokeRoundedRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16, 16);
        g.lineStyle(2.5, 0xfff4dc, 0.95);
        g.strokeRoundedRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16, 16);
      } else {
        // a translucent ghost of the window, inset so it never hides in the bezel
        const inset = 14;
        g.fillStyle(0xffc46a, 0.16);
        g.fillRoundedRect(-slot.w / 2 + inset, -slot.h / 2 + inset, slot.w - inset * 2, slot.h - inset * 2, 14);
        g.lineStyle(4, 0xffd9a0, 0.95);
        g.strokeRoundedRect(-slot.w / 2 + inset, -slot.h / 2 + inset, slot.w - inset * 2, slot.h - inset * 2, 14);
      }
      layer.add(g);
      carried = g;
      carried.offX = frame ? 0 : pts.off?.x ?? 0;
      carried.offY = frame ? 0 : pts.off?.y ?? 0;
      carried.setAlpha(0);
      tweens.push(...move(pts.from, 700), press(pts.from));
      if (frame) {
        // press, then HOLD (a ring fills around the fingertip), then the frame lifts
        const ring = this.add.graphics();
        layer.add(ring);
        const st = { k: 0 };
        tweens.push({
          s: 0.84,
          duration: 760,
          onStart: () => this.tweens.add({
            targets: st, k: 1, duration: 720,
            onUpdate: () => {
              ring.clear();
              ring.lineStyle(9, 0x0b0705, 0.55); ring.strokeCircle(pts.from.x, pts.from.y, 26);
              ring.lineStyle(4.5, 0xfff4dc, 0.95); ring.beginPath(); ring.arc(pts.from.x, pts.from.y, 26, -Math.PI / 2, -Math.PI / 2 + st.k * Math.PI * 2); ring.strokePath();
            },
            onComplete: () => ring.destroy(),
          }),
        });
      }
      tweens.push({ s: 0.84, duration: 60, onStart: () => { carriedA = 0.9; if (reduce) path(pts.from, pts.to); } });
      tweens.push(...move(pts.to, 1150), { ...release, onStart: () => { carriedA = 0.45; ripple(pts.to.x, pts.to.y); } }, hold(380));
    } else if (gesture.kind === 'lens') {
      // take hold of the lens, carry its ghost onto the target, then click through it
      const ghostLens = this.add.image(0, 0, 'nsv-lens-rim');
      layer.add(ghostLens);
      carried = ghostLens;
      carried.offX = 0;
      carried.offY = 0;
      carried.setAlpha(0);
      tweens.push(...move(pts.from, 700), press(pts.from), { s: 0.84, duration: 60, onStart: () => { carriedA = 0.7; if (reduce) path(pts.from, pts.to); } });
      tweens.push(...move(pts.to, 1150), release, hold(260));
      if (gesture.click) tweens.push(press(pts.to), release, hold(420));
      else tweens.push({ ...hold(900), onStart: () => ripple(pts.to.x, pts.to.y) });
    }
    tweens.push({ a: 0, duration: 520, ease: 'Sine.easeIn' });
    layer.add(hand);
    apply();
    const chain = this.tweens.chain({
      targets: proxy,
      tweens: tweens.map((t) => ({ ...t, onUpdate: apply })),
      onComplete: () => { if (this.ghost?.layer === layer) { this.ghost = null; layer.destroy(); } },
    });
    this.ghostCount += 1;
    this.ghost = { layer, chain, gesture, reason };
    return true;
  }

  // ---------------------------------------------------------------------------
  // input

  bindInput() {
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p) => this.onPointerDown(p));
    this.input.on('pointermove', (p) => this.onPointerMove(p));
    this.input.on('pointerup', (p) => this.onPointerUp(p));
    this.input.on('pointerupoutside', (p) => this.onPointerUp(p));
    this.input.on('wheel', (p, _objs, _dx, dy) => {
      this.userInput();
      if (dy > 0 && !this.growing) {
        const slot = this.slotAt(p.x, p.y);
        const tile = slot ? this.model.tileAt(slot.index) : null;
        if (tile && this.model.canZoomOut(tile) && !this.views[tile].zooming) this.model.zoomOut(tile);
      }
    });
    this.onKeyDown = (event) => this.handleKey(event, true);
    this.onKeyUp = (event) => this.handleKey(event, false);
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('keyup', this.onKeyUp, true);
  }

  busyView(tile) {
    const view = this.views[tile];
    return !view || view.zooming || view.moving || view.lifted;
  }

  userInput() {
    this.idleMs = 0;
    // any meaningful input restarts the hint clock and clears a demonstration
    this.hints?.input();
    if (this.ghost) this.cancelGhost();
    this.audio.unlock();
  }

  onPointerDown(p) {
    this.userInput();
    if (this.keyboardMode) { this.keyboardMode = false; this.refreshSelection(); }
    if (this.fading || this.growing) return;
    if (this.cardView || this.model.state.card) { this.model.closeCard(); return; }
    // a spoken line takes the click; a passing caption never blocks play
    if (this.caption && !this.caption.auto) { this.advanceCaption(); return; }
    if (p.rightButtonDown()) {
      const slot = this.slotAt(p.x, p.y);
      const tile = slot ? this.model.tileAt(slot.index) : null;
      if (tile && !this.busyView(tile)) this.model.zoomOut(tile);
      return;
    }
    if (this.model.isLocked()) return;
    const slot = this.slotAt(p.x, p.y);
    const tile = slot ? this.model.tileAt(slot.index) : null;
    const lens = this.model.state.lens;
    const fromLens = lens.enabled ? Math.hypot(p.x - lens.x, p.y - lens.y) : Infinity;
    if (fromLens <= lens.r + 14) {
      // moving drags the lens; a still click acts through it (1978 first,
      // then the present underneath); a still hold on a frame lifts it
      this.press = { kind: 'lens', x: p.x, y: p.y, dx: lens.x - p.x, dy: lens.y - p.y, moved: false, time: this.time.now };
      if (tile && !this.busyView(tile) && fromLens < lens.r - LENS_RIM) this.armFrameHold(tile, slot, p);
      return;
    }
    if (!tile || this.busyView(tile)) return;
    // the zoom-out glyph
    if (this.onGlyph(tile, p.x, p.y)) {
      this.model.zoomOut(tile);
      return;
    }
    this.press = { kind: 'tile', tile, slot, x: p.x, y: p.y, moved: false, time: this.time.now };
    this.armFrameHold(tile, slot, p);
  }

  /** A press on a frame's grip (its painted frame, generously): hold still to lift it. */
  armFrameHold(tile, slot, p) {
    const frame = this.model.frameGripAt(tile, (p.x - slot.x) / slot.w, (p.y - slot.y) / slot.h);
    const press = this.press;
    if (!frame || !press) return;
    press.grip = { tile, frame, x: p.x, y: p.y };
    press.holdTimer = this.time.delayedCall(FRAME_HOLD_MS, () => {
      if (this.press !== press || press.moved) return;
      press.kind = 'frame';
      press.grip = null;
      if (this.model.liftFrame(frame) && this.floating) {
        // keep the frame where the hand took hold of it
        this.floating.offX = this.floating.holder.x - p.x;
        this.floating.offY = this.floating.holder.y - p.y;
        this.moveFloating(p.x, p.y);
      }
    });
  }

  onPointerMove(p) {
    const press = this.press;
    if (press) {
      const dist = Math.hypot(p.x - press.x, p.y - press.y);
      if (dist > 7) press.moved = true;
      if (press.kind === 'lens' && press.moved) {
        press.holdTimer?.remove();
        press.grip = null;
        this.model.moveLens(p.x + press.dx, p.y + press.dy);
      } else if (press.kind === 'frame') {
        this.moveFloating(p.x, p.y);
      } else if (press.kind === 'tile' && press.moved && !this.drag) {
        press.holdTimer?.remove();
        press.grip = null;
        if (this.model.canDrag(press.tile) && this.model.beginDrag(press.tile)) {
          this.drag = { tile: press.tile, offX: press.slot.x - press.x, offY: press.slot.y - press.y, lastX: p.x, vx: 0 };
        }
      }
      if (this.drag) {
        const view = this.views[this.drag.tile];
        const vx = p.x - this.drag.lastX;
        this.drag.vx = lerp(this.drag.vx, vx, 0.3);
        this.drag.lastX = p.x;
        view.rect.x = p.x + this.drag.offX;
        view.rect.y = p.y + this.drag.offY;
        view.rect.rot = reducedMotionActive() ? 0 : clamp(this.drag.vx * 0.004, -0.019, 0.019);
        view.apply();
        this.shadow.setPosition(view.rect.x + view.rect.w / 2 + 22, view.rect.y + view.rect.h / 2 + 30).setDisplaySize(view.rect.w * 1.2, view.rect.h * 1.25);
        const over = this.slotAt(view.rect.x + view.rect.w / 2, view.rect.y + view.rect.h / 2);
        this.showDropTarget(over && over.index !== this.model.slotOf(this.drag.tile) ? over : null);
      }
      return;
    }
    this.updateHover(p);
  }

  onPointerUp(p) {
    const press = this.press;
    this.press = null;
    if (!press) return;
    press.holdTimer?.remove();
    if (press.kind === 'frame') {
      // the frame lands where it is (its centre), like a carried window
      const holder = this.floating?.holder;
      const slot = (holder && this.slotAt(holder.x, holder.y)) ?? this.slotAt(p.x, p.y);
      this.model.dropFrame(slot ? this.model.tileAt(slot.index) : null);
      return;
    }
    if (this.drag) {
      const drag = this.drag;
      this.drag = null;
      const view = this.views[drag.tile];
      const cx = view.rect.x + view.rect.w / 2;
      const cy = view.rect.y + view.rect.h / 2;
      const slot = this.slotAt(cx, cy) ?? this.slotAt(p.x, p.y);
      this.model.dropOn(slot ? slot.index : this.model.slotOf(drag.tile));
      if (!slot) this.model.cancelDrag();
      return;
    }
    if (press.moved) return;
    if (press.kind === 'lens') {
      const slot = this.slotAt(p.x, p.y);
      const tile = slot ? this.model.tileAt(slot.index) : null;
      if (!tile || this.busyView(tile)) return;
      // the lens never swallows the ⤢ glyph either
      if (this.onGlyph(tile, p.x, p.y)) this.model.zoomOut(tile);
      else this.clickAt(tile, slot, p);
      return;
    }
    this.clickAt(press.tile, press.slot, p);
  }

  clickAt(tile, slot, p) {
    const u = (p.x - slot.x) / slot.w;
    const v = (p.y - slot.y) / slot.h;
    const hit = this.model.hotspotAt(tile, u, v, { x: p.x, y: p.y });
    if (hit) this.model.activateHotspot(tile, hit.id);
    else this.tapPanel(tile);
  }

  /** A click on nothing in particular: a tiny paper wobble so input never feels dead. */
  tapPanel(tile) {
    const view = this.views[tile];
    if (!view || this.busyView(tile)) return;
    this.tweens.add({ targets: view.rect, scale: 0.992, duration: 70, yoyo: true, onUpdate: () => view.apply(), onComplete: () => view.apply() });
  }

  updateHover(p) {
    let cursor = 'default';
    let hovered = null;
    let grip = null;
    const locked = this.model.isLocked() || this.fading;
    const lens = this.model.state.lens;
    const slot = this.slotAt(p.x, p.y);
    const tile = slot ? this.model.tileAt(slot.index) : null;
    const fromLens = lens.enabled ? Math.hypot(p.x - lens.x, p.y - lens.y) : Infinity;
    if (!locked && tile && !this.busyView(tile)) {
      const u = (p.x - slot.x) / slot.w;
      const v = (p.y - slot.y) / slot.h;
      const hit = this.model.hotspotAt(tile, u, v, { x: p.x, y: p.y });
      const frame = fromLens < lens.r - LENS_RIM || fromLens > lens.r + 14 ? this.model.frameGripAt(tile, u, v) : null;
      if (this.onGlyph(tile, p.x, p.y)) cursor = 'zoom-out';
      else if (hit) { cursor = hit.kind === 'zoom' ? 'zoom-in' : 'pointer'; hovered = { tile, hotspot: hit }; }
      else if (frame) { cursor = LIFT_CURSOR; grip = { tile, frame }; }
      else if (this.model.canDrag(tile)) cursor = 'grab';
    }
    if (!locked && fromLens <= lens.r + 14 && cursor === 'default') cursor = 'move';
    if (!locked && lens.enabled && Math.abs(fromLens - lens.r) < 16) cursor = 'move';
    this.input.setDefaultCursor(cursor);
    this.hovered = hovered;
    this.hoverGrip = grip;
  }

  /** Where the ⤢ glyph of a tile sits on screen (it scales with the window). */
  glyphAt(tile) {
    const slot = this.model.slotRect(tile);
    if (!slot) return null;
    const k = this.layout.scale ?? 1;
    return { x: slot.x + slot.w - 12 * k, y: slot.y + 12 * k, r: 26 * k };
  }

  onGlyph(tile, x, y) {
    const view = this.views[tile];
    const g = this.glyphAt(tile);
    return Boolean(view?.glyph.visible && g && Math.hypot(x - g.x, y - g.y) < g.r);
  }

  /** The glowing band where a frame can be taken hold of (hover, and while a hold fills). */
  drawGrip() {
    const g = this.gripG;
    g.clear();
    const press = this.press;
    const holding = press?.grip && !press.moved ? press.grip : null;
    const target = holding ?? (this.drag || this.floating || this.keyboardMode ? null : this.hoverGrip);
    if (!target || this.busyView(target.tile) || !this.model.canLiftFrame(target.frame)) return;
    const slot = this.model.slotRect(target.tile);
    if (!slot) return;
    const grip = this.model.frameGrip(target.frame);
    const k = 0.5 + Math.sin(this.clock / (reducedMotionActive() ? 700 : 260)) * 0.5;
    const box = ([x, y, w, h]) => [slot.x + x * slot.w, slot.y + y * slot.h, w * slot.w, h * slot.h];
    const [ox, oy, ow, oh] = box(grip.rect);
    g.lineStyle(10, 0xffb050, 0.12 + k * 0.1);
    g.strokeRoundedRect(ox + 4, oy + 4, ow - 8, oh - 8, 18);
    g.lineStyle(3, 0xffd9a0, 0.55 + k * 0.35);
    g.strokeRoundedRect(ox + 4, oy + 4, ow - 8, oh - 8, 18);
    if (grip.hole) {
      const [hx, hy, hw, hh] = box(grip.hole);
      g.lineStyle(2, 0xffd9a0, 0.35 + k * 0.3);
      g.strokeRoundedRect(hx, hy, hw, hh, 14);
    }
    if (holding) {
      // press-and-hold: a ring fills around the fingertip until the frame lifts
      const t = clamp((this.time.now - press.time) / FRAME_HOLD_MS, 0, 1);
      g.lineStyle(8, 0x0b0705, 0.6);
      g.strokeCircle(holding.x, holding.y, 24);
      g.lineStyle(4, 0xfff4dc, 0.95);
      g.beginPath();
      g.arc(holding.x, holding.y, 24, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
      g.strokePath();
    }
  }

  // ---------- keyboard ----------

  handleKey(event, down) {
    if (globalThis.NIGHTFALL_PAUSED || globalThis.NIGHTFALL_STONE_OFFER) return;
    if (!this.sys.isActive()) return;
    const key = event.key;
    if (!down) { this.keysDown.delete(key); return; }
    const handled = this.onKey(event);
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  onKey(event) {
    const key = event.key;
    const m = this.model;
    this.userInput();
    if (this.fading || this.growing) return ['Tab', ' ', 'Enter'].includes(key);
    if (this.services.devMode && (key === 'n' || key === 'N') && !event.repeat) {
      this.devSkip();
      return true;
    }
    if (m.state.card) {
      if (key === 'Enter' || key === ' ' || key === 'Escape') { m.closeCard(); return true; }
      return key === 'Tab';
    }
    if (this.caption && !this.caption.auto) {
      if (key === 'Enter' || key === ' ') { if (!event.repeat) this.advanceCaption(); return true; }
      return key === 'Tab';
    }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const ours = Boolean(arrows[key]) || KEYS.has(key);
    // the first key a player uses brings up the key strip and the focus ring
    // (a first Tab or Enter only shows where the focus is)
    const fresh = ours && !this.keyboardMode;
    if (fresh) { this.keyboardMode = true; this.refreshSelection(); }
    if (this.lensFocus && m.state.lens.enabled) {
      if (arrows[key]) { this.keysDown.add(key); return true; }
      if (key === 'l' || key === 'L' || key === 'Escape') { this.lensFocus = false; return true; }
      if (key === 'Enter' || key === ' ') {
        const lens = m.state.lens;
        const slot = this.slotAt(lens.x, lens.y);
        const tile = slot ? m.tileAt(slot.index) : null;
        if (tile && !this.busyView(tile)) this.clickAt(tile, slot, { x: lens.x, y: lens.y });
        return true;
      }
    }
    if (m.isLocked()) return ['Tab', ' ', 'Enter', 'Backspace'].includes(key) || Boolean(arrows[key]);
    if (arrows[key]) {
      const [dx, dy] = arrows[key];
      if (this.kbHeld || this.floating) {
        this.moveKbTarget(dx, dy);
      } else {
        this.selectedSlot = this.stepSlot(this.selectedSlot, dx, dy);
        this.focusedHotspot = null;
      }
      this.refreshSelection();
      return true;
    }
    const tile = m.tileAt(this.selectedSlot);
    switch (key) {
      case ' ':
        if (this.floating) { m.dropFrame(m.tileAt(this.kbFrameTarget ?? this.selectedSlot)); this.kbFrameTarget = null; }
        else if (this.kbHeld) this.kbDrop();
        else if (tile && m.canDrag(tile) && !this.busyView(tile) && m.beginDrag(tile)) {
          this.kbHeld = { tile, target: this.selectedSlot };
          this.hoverKbHeld();
        } else this.kbNudge(tile, ' ');
        this.refreshSelection();
        return true;
      case 'Tab': {
        // every reachable tag on the wall, window by window
        const list = this.kbTargets();
        if (!list.length) { this.kbNudge(tile, 'Tab'); return true; }
        const current = this.kbFocus();
        if (fresh && current) return true;
        const at = current ? list.findIndex((h) => h.tile === current.tile && h.id === current.id) : -1;
        const step = event.shiftKey ? -1 : 1;
        const next = at < 0 ? (step > 0 ? list.find((h) => m.slotOf(h.tile) >= this.selectedSlot) ?? list[0] : list[list.length - 1]) : list[(at + step + list.length) % list.length];
        this.selectedSlot = m.slotOf(next.tile);
        this.focusedHotspot = { tile: next.tile, id: next.id };
        this.refreshSelection();
        return true;
      }
      case 'Enter': {
        // Enter uses the focused tag (a window's first tag is focused as soon as it is selected)
        const focus = this.kbFocus();
        if (fresh && focus) { this.kbFlash(focus.tile, focus.id); return true; }
        if (focus && !this.busyView(focus.tile) && m.activateHotspot(focus.tile, focus.id)) {
          this.kbFlash(focus.tile, focus.id);
          this.focusedHotspot = null;
        } else this.kbNudge(tile, 'Enter');
        this.refreshSelection();
        return true;
      }
      case 'Backspace': {
        if (this.floating) { m.dropFrame(null); this.kbFrameTarget = null; return true; }
        if (this.kbHeld) { m.cancelDrag(); this.kbHeld = null; this.refreshSelection(); return true; }
        // the selected window, else the one window that can step back
        const target = tile && m.canZoomOut(tile) && !this.busyView(tile)
          ? tile
          : m.state.slots.find((id) => id && m.canZoomOut(id) && !this.busyView(id)) ?? null;
        if (target) {
          this.selectedSlot = m.slotOf(target);
          this.focusedHotspot = null;
          m.zoomOut(target);
          this.refreshSelection();
        } else this.kbNudge(tile, 'Backspace');
        return true;
      }
      case 'f':
      case 'F': {
        // the selected window's frame, else the one frame that can lift now
        const liftable = (id) => { const frame = id ? m.frameOn(id) : null; return frame && m.canLiftFrame(frame) ? frame : null; };
        const host = liftable(tile) ? tile : m.state.slots.find((id) => liftable(id)) ?? null;
        if (host) {
          this.selectedSlot = m.slotOf(host);
          if (m.liftFrame(liftable(host))) { this.kbFrameTarget = this.selectedSlot; this.placeFloatingAtSlot(this.selectedSlot); }
        } else this.kbNudge(tile, 'f');
        return true;
      }
      case 'l':
      case 'L':
        if (m.state.lens.enabled) this.lensFocus = !this.lensFocus;
        else this.kbNudge(tile, 'l');
        return true;
      case 'h':
      case 'H':
        // SHOW ME (also in the pause menu)
        if (!event.repeat) this.requestHint();
        return true;
      default:
        return false;
    }
  }

  /** Escape backs out of whatever is in hand; false lets the pause menu open. */
  escape() {
    const m = this.model;
    if (m.state.card) { m.closeCard(); return true; }
    if (this.floating) { m.dropFrame(null); this.kbFrameTarget = null; this.press = null; return true; }
    if (this.kbHeld) { m.cancelDrag(); this.kbHeld = null; this.refreshSelection(); return true; }
    if (this.drag) { this.drag = null; this.press = null; m.cancelDrag(); return true; }
    if (this.lensFocus) { this.lensFocus = false; return true; }
    return false;
  }

  hotspotInLens(tile, h) {
    const slot = this.model.slotRect(tile);
    return this.model.lensCovers(tilePoint(slot, h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2));
  }

  /** Hotspots the keyboard can reach now (1978 ones only inside the lens), in slot order. */
  kbTargets() {
    const m = this.model;
    const out = [];
    m.state.slots.forEach((tile) => {
      if (!tile || this.busyView(tile)) return;
      m.hotspots(tile).forEach((h) => {
        if (h.enabled && (h.era !== 'past' || this.hotspotInLens(tile, h))) out.push({ tile, id: h.id });
      });
    });
    return out;
  }

  /** The focused hotspot: the one Tab chose, else the selected window's first. */
  kbFocus() {
    const tile = this.model.tileAt(this.selectedSlot);
    if (!tile) return null;
    const list = this.kbTargets().filter((h) => h.tile === tile);
    if (this.focusedHotspot?.tile === tile) {
      const kept = list.find((h) => h.id === this.focusedHotspot.id);
      if (kept) return kept;
    }
    return list[0] ?? null;
  }

  /** A key with nothing to do here: the window wobbles and the key strip points at what can. */
  kbNudge(tile, key) {
    if (tile) this.tapPanel(tile);
    this.audio.play('mismatch');
    this.keyStripBlink = { key: KEY_NUDGE[key] ?? 'TAB', until: this.clock + 1400 };
  }

  /** Enter took: a bright flash where the focus ring was. */
  kbFlash(tile, id) {
    const h = this.model.hotspots(tile).find((spot) => spot.id === id);
    const view = this.views[tile];
    if (!h || !view) return;
    const p = view.screen(h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2);
    this.hintGlow(p.x, p.y, 140);
  }

  /** The keyboard focus ring: ivory on a dark outline, readable on brass and on gold. */
  drawFocus() {
    const g = this.focusG;
    g.clear();
    if (!this.keyboardMode || this.kbHeld || this.floating || this.lensFocus) return;
    const focus = this.kbFocus();
    if (!focus || this.busyView(focus.tile)) return;
    const h = this.model.hotspots(focus.tile).find((spot) => spot.id === focus.id);
    const view = this.views[focus.tile];
    if (!h || !view) return;
    const a = view.screen(h.rect[0], h.rect[1]);
    const b = view.screen(h.rect[0] + h.rect[2], h.rect[1] + h.rect[3]);
    const pad = 8 + (reducedMotionActive() ? 0 : (Math.sin(this.clock / 260) * 0.5 + 0.5) * 3);
    const x = Math.min(a.x, b.x) - pad;
    const y = Math.min(a.y, b.y) - pad;
    const w = Math.max(28, Math.abs(b.x - a.x) + pad * 2);
    const hh = Math.max(28, Math.abs(b.y - a.y) + pad * 2);
    const r = Math.min(14, w / 2, hh / 2);
    g.lineStyle(9, 0x0b0705, 0.85);
    g.strokeRoundedRect(x, y, w, hh, r);
    g.lineStyle(3.5, 0xfff4dc, 1);
    g.strokeRoundedRect(x, y, w, hh, r);
  }

  stepSlot(index, dx, dy) {
    const { cols, rows } = this.layout;
    const col = clamp((index % cols) + dx, 0, cols - 1);
    const row = clamp(Math.floor(index / cols) + dy, 0, rows - 1);
    return row * cols + col;
  }

  moveKbTarget(dx, dy) {
    if (this.kbHeld) {
      this.kbHeld.target = this.stepSlot(this.kbHeld.target, dx, dy);
      this.hoverKbHeld();
    } else if (this.floating) {
      this.kbFrameTarget = this.stepSlot(this.kbFrameTarget ?? this.selectedSlot, dx, dy);
      this.placeFloatingAtSlot(this.kbFrameTarget);
    }
  }

  hoverKbHeld() {
    const { tile, target } = this.kbHeld;
    const view = this.views[tile];
    const slot = this.layout.slots[target];
    this.tweens.killTweensOf(view.rect);
    this.tweens.add({ targets: view.rect, x: slot.x + 14, y: slot.y - 16, scale: 1.045, duration: 200, ease: 'Sine.easeOut', onUpdate: () => view.apply() });
    this.shadow.setPosition(slot.x + slot.w / 2 + 30, slot.y + slot.h / 2 + 20).setDisplaySize(slot.w * 1.2, slot.h * 1.25);
    this.showDropTarget(target !== this.model.slotOf(tile) ? slot : null);
  }

  kbDrop() {
    const { target } = this.kbHeld;
    this.kbHeld = null;
    this.selectedSlot = target;
    // dropping back on its own slot: onDragEnd already animates home
    this.model.dropOn(target);
  }

  refreshSelection() {
    Object.values(this.views).forEach((view) => {
      const slot = this.model.slotOf(view.id);
      view.select.setVisible(this.keyboardMode && slot === (this.kbHeld ? this.kbHeld.target : this.kbFrameTarget ?? this.selectedSlot));
    });
  }

  // ---------- the key strip (keyboard play) ----------

  /** Which keys do something right now, as [keycap, what it does]. */
  keyStripItems() {
    const m = this.model;
    const arrows = '← ↑ ↓ →';
    if (this.lensFocus && m.state.lens.enabled) return [[arrows, 'MOVE THE LENS'], ['ENTER', 'CLICK THROUGH IT'], ['L', 'LET GO']];
    if (this.kbHeld) return [[arrows, 'CARRY'], ['SPACE', 'PUT DOWN'], ['⌫', 'PUT BACK']];
    if (this.floating) return [[arrows, 'CARRY THE FRAME'], ['SPACE', 'DROP IT'], ['⌫', 'PUT BACK']];
    const items = [[arrows, 'WINDOW'], ['TAB', 'NEXT TAG'], ['ENTER', 'USE']];
    if (m.state.slots.some((id) => id && m.canDrag(id))) items.push(['SPACE', 'PICK UP']);
    items.push(['⌫', 'STEP BACK']);
    if (Object.keys(m.state.frames).some((id) => m.canLiftFrame(id))) items.push(['F', 'LIFT FRAME']);
    if (m.state.lens.enabled) items.push(['L', 'LENS']);
    items.push(['H', 'SHOW ME'], ['ESC', 'PAUSE']);
    return items;
  }

  buildKeyStrip() {
    this.keyStrip = this.add.container(this.layout.view.w / 2, this.stripY()).setAlpha(0).setVisible(false);
    this.topLayer.addAt(this.keyStrip, this.topLayer.getIndex(this.blackout));
    this.keyStripSig = '';
    this.keyStripCaps = [];
  }

  stripY() {
    return Math.min(this.layout.view.h - 28, (this.wallInfo?.sillY ?? this.layout.y + this.layout.h + 56) + 42);
  }

  layoutKeyStrip(items) {
    const strip = this.keyStrip;
    strip.removeAll(true);
    this.keyStripCaps = [];
    const s = clamp(this.textScale, 0.8, 1.4);
    const font = (size, color, bold = true) => ({ fontFamily: MONO, fontSize: `${Math.round(size * s)}px`, color, fontStyle: bold ? 'bold' : 'normal' });
    const parts = [];
    let x = 0;
    items.forEach(([cap, label], i) => {
      const capText = this.add.text(0, 0, cap, font(17, '#1c130d')).setOrigin(0.5);
      const capW = Math.max(30 * s, capText.width + 16 * s);
      const capH = 30 * s;
      const capBg = this.add.graphics();
      const labelText = this.add.text(0, 0, label, font(15, '#eadfc6')).setOrigin(0, 0.5);
      parts.push({ capText, capBg, labelText, capW, capH, x, cap: items[i][0] });
      x += capW + 8 * s + labelText.width + 26 * s;
    });
    const total = x - 26 * s;
    // never under the stone sockets at the right end of the sill
    const room = this.sockets?.visible ? 2 * (this.sockets.x - 110 - this.layout.view.w / 2) : this.layout.view.w - 120;
    const k = Math.min(1, room / (total + 48));
    const bg = this.add.graphics();
    const bw = (total + 40 * s) * k;
    const bh = 46 * s * k;
    bg.fillStyle(0x0e0906, 0.9);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
    bg.lineStyle(1.5, 0xb08a4a, 0.9);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
    strip.add(bg);
    parts.forEach((part) => {
      const left = (-total / 2 + part.x) * k;
      part.capBg.fillStyle(0xeadfc6, 1);
      part.capBg.fillRoundedRect(0, 0, part.capW, part.capH, 6);
      part.capBg.lineStyle(2, 0x0b0705, 0.9);
      part.capBg.strokeRoundedRect(0, 0, part.capW, part.capH, 6);
      part.capBg.setPosition(left, (-part.capH / 2) * k).setScale(k);
      part.capText.setPosition(left + (part.capW / 2) * k, 0).setScale(k);
      part.labelText.setPosition(left + (part.capW + 8 * s) * k, 0).setScale(k);
      strip.add([part.capBg, part.capText, part.labelText]);
      this.keyStripCaps.push(part);
    });
  }

  updateKeyStrip(dt = 16) {
    const strip = this.keyStrip;
    if (!strip) return;
    const show = this.keyboardMode && !this.caption && !this.model.state.card && !this.fading && !this.growing && !this.model.state.ended;
    if (show) {
      const items = this.keyStripItems();
      const sig = `${items.map((item) => item.join(':')).join('|')}#${this.textScale}#${this.sockets?.visible}`;
      if (sig !== this.keyStripSig) { this.keyStripSig = sig; this.layoutKeyStrip(items); }
      strip.setY(this.stripY());
      if (!strip.visible) strip.setVisible(true);
      strip.setAlpha(Math.min(1, strip.alpha + dt / 200));
      // the key that would help blinks amber after a key that could not
      const blink = this.keyStripBlink && this.clock < this.keyStripBlink.until ? this.keyStripBlink.key : null;
      const on = blink && Math.sin(this.clock / 110) > 0;
      this.keyStripCaps.forEach((part) => part.capText.setColor(on && part.cap === blink ? '#b3261e' : '#1c130d'));
    } else if (strip.visible) {
      strip.setAlpha(Math.max(0, strip.alpha - dt / 160));
      if (strip.alpha <= 0) strip.setVisible(false);
    }
  }

  devSkip() {
    const m = this.model;
    if (m.state.ended) return;
    m.state.queue.length = 0;
    m.state.blocking = null;
    if (this.act.devSkip) {
      // acts outside Chapter 1 (the Museum exhibit) name their own skip
      m.state.queue.push(...this.act.devSkip);
      m.update(0);
      return;
    }
    // skip to the next act (its checkpoint first), or out of the chapter after Act 3
    const next = this.act.next ?? null;
    m.state.queue.push({ checkpoint: next ? actById(next).checkpoint : 'chapter-2-start' });
    m.state.queue.push(next ? { nextAct: next } : { endChapter: true });
    m.update(0);
  }

  // ---------- floating frame ----------

  startFloatingFrame(frameId, from) {
    const def = this.model.frameDef(frameId);
    const view = this.views[from];
    const holder = this.add.container(0, 0);
    const inner = this.add.container(-view.w / 2, -view.h / 2);
    holder.add(inner);
    if (def?.draw) {
      const ctx = this.paintCtx(view, inner, 'present', `frame:${frameId}`);
      ctx.floating = true;
      def.draw(ctx);
      holder.animators = ctx.animators;
    }
    holder.setScale(0.9 * view.base).setAlpha(0.95);
    const outline = this.add.graphics();
    outline.lineStyle(3, 0xffc46a, 0.7);
    outline.strokeRoundedRect(-view.w / 2, -view.h / 2, view.w, view.h, 16);
    holder.add(outline);
    this.dragLayer.add(holder);
    const start = view.screen(0.5, 0.5);
    holder.setPosition(start.x, start.y);
    this.floating = { frameId, holder, offX: 0, offY: 0 };
  }

  moveFloating(x, y) {
    if (!this.floating) return;
    const h = this.floating.holder;
    const tx = x + (this.floating.offX ?? 0);
    const ty = y + (this.floating.offY ?? 0);
    const vx = tx - h.x;
    h.setPosition(tx, ty);
    h.setRotation(reducedMotionActive() ? 0 : clamp(vx * 0.003, -0.03, 0.03));
  }

  placeFloatingAtSlot(index) {
    if (!this.floating) return;
    const slot = this.layout.slots[index];
    this.tweens.add({ targets: this.floating.holder, x: slot.x + slot.w / 2 + 10, y: slot.y + slot.h / 2 - 12, duration: 200, ease: 'Sine.easeOut' });
    this.refreshSelection();
  }

  endFloatingFrame(frameId, onto) {
    if (!this.floating) return;
    const { holder } = this.floating;
    this.floating = null;
    const target = this.views[onto];
    const dest = target.screen(0.5, 0.5);
    this.tweens.add({ targets: holder, x: dest.x, y: dest.y, scale: target.base, rotation: 0, alpha: 0.6, duration: 220, ease: 'Sine.easeOut', onComplete: () => holder.destroy() });
    void frameId;
  }

  // ---------------------------------------------------------------------------
  // per frame

  update(time, delta) {
    if (this.introGuard.due()) this.settleIntro('frame');
    const dt = Math.min(delta, this.services.maxDt ?? 50);
    this.clock += dt;
    this.model.update(dt);
    const reduce = reducedMotionActive();

    // lamps between the windows flicker
    this.lampGlows.forEach((glow) => {
      const t = this.clock / 1000 + glow.seed;
      glow.setAlpha(0.2 + Math.sin(t * 5.3) * 0.02 + Math.sin(t * 11.7) * 0.015 + (Math.sin(t * 0.6) > 0.992 ? -0.1 : 0));
    });

    const lens = this.model.state.lens;
    const cueStep = this.model.currentStep();
    // `hint.zoomOut` (always) or `hint.zoomOutCue` (a condition): the ⤢ glyph breathes
    const cueHint = cueStep?.hint;
    const zoomOutCue = cueHint?.zoomOut || (cueHint?.zoomOutCue && this.model.evaluate(cueHint.zoomOutCue)) ? cueHint.tile : null;
    Object.values(this.views).forEach((view) => {
      const run = (list) => list?.forEach((fn) => fn(this.clock, dt));
      run(view.current?.animators);
      run(view.fadingOut?.animators);
      run(view.frameAnimators);
      // past layer through the lens
      const past = view.current?.past;
      if (past) {
        const slot = this.model.slotRect(view.id);
        const near = lens.enabled && slot && lens.x > slot.x - lens.r && lens.x < slot.x + slot.w + lens.r && lens.y > slot.y - lens.r && lens.y < slot.y + slot.h + lens.r;
        past.setVisible(Boolean(near));
        if (near) {
          const wp = view.cam.getWorldPoint(lens.x, lens.y);
          view.mask.clear();
          view.mask.fillStyle(0xffffff, 1);
          view.mask.fillCircle(wp.x, wp.y, lens.r / view.cam.zoom);
        }
      }
      this.updateTags(view);
      const canOut = this.model.canZoomOut(view.id) && !view.zooming;
      view.glyph.setVisible(canOut);
      // when stepping back is the lesson, the glyph keeps breathing
      const cue = canOut && zoomOutCue === view.id;
      view.glyphGlow.setVisible(cue);
      if (cue) {
        const k = 0.5 + Math.sin(this.clock / (reduce ? 700 : 300)) * 0.5;
        view.glyphGlow.setAlpha(0.25 + k * 0.45);
        if (!this.tweens.isTweening(view.glyph)) view.glyph.setScale(reduce ? 0.5 : 0.5 + k * 0.08);
      } else if (!this.tweens.isTweening(view.glyph) && view.glyph.scale !== 0.5) view.glyph.setScale(0.5);
    });

    // hover shimmer over the hotspot under the pointer (or keyboard focus)
    Object.values(this.views).forEach((view) => view.hover.setVisible(false));
    const kb = this.keyboardMode ? this.kbFocus() : null;
    const focus = kb
      ? { tile: kb.tile, hotspot: this.model.hotspots(kb.tile).find((h) => h.id === kb.id) }
      : this.hovered;
    if (focus?.hotspot?.enabled && !this.busyView(focus.tile)) {
      const view = this.views[focus.tile];
      const [x, y, w, h] = focus.hotspot.rect;
      view.hover.setVisible(true);
      view.hover.setPosition((x + w / 2) * view.w, (y + h / 2) * view.h);
      view.hover.setDisplaySize(w * view.w * 1.6 + 40, h * view.h * 1.6 + 40);
      view.hover.setAlpha(0.22 + Math.sin(this.clock / 180) * 0.1);
    }

    this.syncActors(dt);
    this.drawLinks();
    this.drawGrip();
    this.drawFocus();
    this.updateKeyStrip(dt);

    // lens
    this.lensView.setVisible(lens.enabled);
    if (lens.enabled) {
      this.lensView.setPosition(lens.x, lens.y);
      // (a hint pulse tweens the rim's scale: leave it alone meanwhile)
      if (!this.tweens.isTweening(this.lensView)) this.lensView.setScale(1 + (this.lensFocus ? Math.sin(this.clock / 200) * 0.015 : 0));
      if (this.lensFocus && this.keysDown.size) {
        const speed = 0.45 * dt;
        let dx = 0;
        let dy = 0;
        if (this.keysDown.has('ArrowLeft')) dx -= speed;
        if (this.keysDown.has('ArrowRight')) dx += speed;
        if (this.keysDown.has('ArrowUp')) dy -= speed;
        if (this.keysDown.has('ArrowDown')) dy += speed;
        if (dx || dy) this.model.moveLens(lens.x + dx, lens.y + dy);
      }
    }

    if (this.floating?.holder.animators) this.floating.holder.animators.forEach((fn) => fn(this.clock, dt));
    this.updateCaption(dt);

    // progressive, wordless hints (hints.js): pulse → ghost hand → a line
    if (!this.model.isLocked() && !this.fading) this.idleMs += dt;
    this.updateHints(dt);
    void reduce;
  }

  /** A pulsing amber ring around an interactable (hotspot or 1978 edge anchor). */
  drawRing(view, ring, live, current) {
    const g = ring.g;
    g.clear();
    const on = current && !view.zooming && (ring.kind === 'edge' || Boolean(live.get(ring.hotspot.id)?.enabled));
    if (!on) return;
    const reduce = reducedMotionActive();
    const k = 0.5 + Math.sin(this.clock / (reduce ? 900 : 380) + (ring.kind === 'edge' ? 1.3 : 0)) * 0.5;
    let cx; let cy; let rx; let ry;
    if (ring.kind === 'edge') {
      cx = ring.u * view.w; cy = ring.v * view.h; rx = 30; ry = 30;
    } else {
      // `ringRect`: ring the thing itself when the click target is larger
      const [x, y, w, h] = ring.hotspot.ringRect ?? ring.hotspot.rect;
      cx = (x + w / 2) * view.w; cy = (y + h / 2) * view.h;
      rx = Math.max(22, (w * view.w) / 2 + 10); ry = Math.max(22, (h * view.h) / 2 + 10);
    }
    const grow = reduce ? 0 : k * 7;
    g.lineStyle(12, 0xffa640, 0.1 + k * 0.14);
    g.strokeEllipse(cx, cy, (rx + grow + 5) * 2, (ry + grow + 5) * 2);
    g.lineStyle(3.5, 0xffc46a, 0.5 + k * 0.45);
    g.strokeEllipse(cx, cy, (rx + grow) * 2, (ry + grow) * 2);
    g.lineStyle(1.4, 0xfff0d0, 0.35 + k * 0.3);
    g.strokeEllipse(cx, cy, (rx + grow - 5) * 2, (ry + grow - 5) * 2);
  }

  updateTags(view) {
    const state = view.current;
    if (!state?.tags.length && !state?.rings?.length) return;
    const live = new Map(this.model.hotspots(view.id).map((h) => [h.id, h]));
    const current = state.stateId === this.model.state.tiles[view.id].state;
    state.rings?.forEach((ring) => this.drawRing(view, ring, live, current));
    state.tags.forEach((entry) => {
      const h = live.get(entry.hotspot.id);
      const on = Boolean(h?.enabled) && state.stateId === this.model.state.tiles[view.id].state && !view.zooming;
      if (on && !entry.shown) {
        entry.shown = true;
        entry.holder.setVisible(true).setAlpha(0);
        const y = entry.holder.y;
        entry.holder.y = y - 16;
        this.tweens.add({ targets: entry.holder, alpha: 1, y, duration: 520, ease: 'Back.easeOut' });
        if (this.clock > 1500) this.audio.play('glint');
        if (entry.hotspot.pulseOnce) this.time.delayedCall(700, () => this.pulseHint({ tile: view.id, hotspot: entry.hotspot.id }));
      } else if (!on && entry.shown && !view.zooming) {
        entry.shown = false;
        entry.holder.setVisible(false);
      }
      if (entry.shown) {
        const t = this.clock / 1000 + entry.seed;
        entry.tag.setRotation(Math.sin(t * 1.6) * 0.06);
        const tw = Math.max(0, Math.sin(t * 1.3)) ** 8;
        entry.glint.setAlpha(0.35 + tw * 0.65).setScale(0.45 + tw * 0.25);
      }
    });
  }

  syncActors(dt) {
    Object.entries(this.rigs).forEach(([id, entry]) => {
      const actor = this.model.state.actors[id];
      if (!actor) return;
      const { rig } = entry;
      const view = this.views[actor.tile];
      if (!view) { rig.root.setVisible(false); return; }
      const tileState = this.model.state.tiles[actor.tile].state;
      const sceneDef = this.model.sceneOf(actor.tile, tileState);
      const scale = (sceneDef?.actorScale ?? 1) * entry.scale;
      const moving = Boolean(actor.walk) && !actor.blocked;
      if (actor.crossing) {
        if (entry.parent !== this.crossLayer) { this.crossLayer.add(rig.root); entry.parent = this.crossLayer; }
        const to = actor.crossing.to;
        const from = view.screen(actor.x, actor.y);
        const dest = this.views[to.tile].screen(to.x, to.y);
        rig.root.setPosition(lerp(from.x, dest.x, actor.crossing.t), lerp(from.y, dest.y, actor.crossing.t));
        rig.root.setVisible(actor.visible);
        rig.root.setScale(actor.facing * scale * view.rect.scale * view.base, scale * view.rect.scale * view.base);
      } else {
        if (entry.parent !== view.actorLayer) { view.actorLayer.add(rig.root); entry.parent = view.actorLayer; }
        rig.root.setPosition(actor.x * view.w, actor.y * view.h);
        const visible = actor.visible && (!actor.state || actor.state === tileState) && !view.zooming && view.current?.stateId === tileState;
        rig.root.setVisible(visible);
        rig.root.setScale(actor.facing * scale, scale);
      }
      rig.update(dt, { pose: actor.pose, moving, time: this.clock, carrying: actor.carrying });
      if (moving && id === 'butch') {
        entry.stepClock += dt;
        if (entry.stepClock > 300) { entry.stepClock = 0; this.audio.play('step'); }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // QA (dev only; wired by nightService-main.js)

  textState() {
    const base = this.model.textState();
    const hotspots = [];
    Object.keys(this.act.tiles).forEach((tile) => {
      const slot = this.model.slotRect(tile);
      if (!slot) return;
      this.model.hotspots(tile).forEach((h) => {
        if (!h.enabled) return;
        const [x, y, w, hh] = h.rect;
        hotspots.push({ tile, id: h.id, kind: h.kind, era: h.era, center: { x: Math.round(slot.x + (x + w / 2) * slot.w), y: Math.round(slot.y + (y + hh / 2) * slot.h) } });
      });
    });
    return {
      scene: PANEL_SCENE,
      coordinateSystem: 'game canvas 1920×1080, origin top-left; slot rects in the same space; tile-local coords are 0..1',
      ...base,
      slotsScreen: this.layout.slots.map(({ index, x, y, w, h }) => ({ index, x, y, w, h })),
      hotspots,
      zoomOutGlyphs: Object.keys(this.act.tiles).filter((tile) => this.model.canZoomOut(tile)).map((tile) => {
        const glyph = this.glyphAt(tile);
        return { tile, x: Math.round(glyph.x), y: Math.round(glyph.y) };
      }),
      view: {
        animating: Object.values(this.views).filter((view) => view.zooming || view.moving || view.lifted).map((view) => view.id),
        caption: this.caption ? { speaker: this.caption.speaker, text: this.caption.text, typing: !this.caption.done } : null,
        cardOpen: this.cardBox.visible && this.cardBox.alpha > 0.5,
        fading: this.fading,
        keyboard: { mode: this.keyboardMode, selectedSlot: this.selectedSlot, focusedHotspot: this.focusedHotspot, held: this.kbHeld, lensFocus: this.lensFocus },
        textScale: this.textScale,
        reduceMotion: reducedMotionActive(),
        idleMs: Math.round(this.idleMs),
        idleHints: this.idleHints ?? 0,
        hints: {
          idleMs: Math.round(this.hints.idle),
          tier: this.hints.tier,
          step: this.hints.step,
          verb: this.hints.verb,
          seen: [...this.hintSeen],
          ghost: this.ghost ? { kind: this.ghost.gesture.kind, verb: this.ghost.gesture.verb, reason: this.ghost.reason } : null,
          ghosts: this.ghostCount,
          captions: this.hintCaptions,
          seamCues: this.seamCues ?? 0,
          seam: this.lastSeamCue ?? null,
        },
        growing: this.growing,
        title: { alpha: Number(this.titleBox.alpha.toFixed(2)), failsafeMs: this.introGuard.remaining === null ? null : Math.round(this.introGuard.remaining), settled: this.introSettled },
        audioUnlocked: Boolean(this.audio.unlocked),
      },
    };
  }
}

export { edgePoint };
