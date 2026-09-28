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

import Phaser from 'phaser';
import { edgePoint, tilePoint } from './panelModel.js';
import { createPanelModel } from './panelModel.js';
import { actById, startCarry } from './acts/index.js';
import { createPaintContext, ensureLoopTexture, ensureSharedTextures } from './painter.js';
import { buildRig } from './actorRig.js';
import { BEZEL, paintBezel, paintLensRim, paintVignette, paintWall } from './art/wallArt.js';
import { PAL, brassFill, ink, roundRectPath, paperGrain } from './art/ink.js';
import { PAPER_URL, WORLDS } from './worldAssets.js';
import { reducedMotionActive } from '../../shell/motion.js';

export const PANEL_SCENE = 'NightServicePanels';

const WORLD_ORIGIN = 40000;
const WORLD_GAP = 4000;
const ZOOM_MS = 460;
const IDLE_HINT_MS = 45000;
const HINT_REPEAT_MS = 9000;
const GRADES = {
  dusk: [0xe0a24a, 0.05],
  evening: [0x5a3050, 0.1],
  night: [0x101a33, 0.2],
  'deep-night': [0x070b18, 0.32],
};
const SERIF = 'Georgia, "Times New Roman", "DejaVu Serif", serif';
const MONO = '"Space Mono", ui-monospace, monospace';
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];

const lerp = (a, b, t) => a + (b - a) * t;
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
    this.select = s.add.graphics();
    this.select.lineStyle(4, 0xffc46a, 0.95);
    this.select.strokeRoundedRect(-w / 2 - BEZEL - 5, -h / 2 - BEZEL - 5, w + BEZEL * 2 + 10, h + BEZEL * 2 + 10, 24);
    this.select.lineStyle(10, 0xffc46a, 0.18);
    this.select.strokeRoundedRect(-w / 2 - BEZEL - 8, -h / 2 - BEZEL - 8, w + BEZEL * 2 + 16, h + BEZEL * 2 + 16, 28);
    this.select.setVisible(false);
    this.glyph = s.add.image(w / 2 - 12, -h / 2 + 12, 'nsv-zoomout').setScale(0.5).setVisible(false);
    this.bezel.add([this.vignette, this.cover, this.ring, this.select, this.glyph]);
    s.bezelLayer.add(this.bezel);
  }

  /** Place the window: viewport, zoom and rotation of its camera + the bezel. */
  apply() {
    const { x, y, w, h, scale, rot } = this.rect;
    const vw = this.w * scale;
    const vh = this.h * scale;
    const vx = x + w / 2 - vw / 2;
    const vy = y + h / 2 - vh / 2;
    this.cam.setViewport(vx, vy, vw, vh);
    const f = this.focus ?? { cx: this.w / 2, cy: this.h / 2, zoom: 1 };
    this.cam.setZoom(scale * f.zoom);
    this.cam.setRotation(rot);
    this.cam.centerOn(this.ox + f.cx, this.oy + f.cy);
    this.bezel.setPosition(x + w / 2, y + h / 2);
    this.bezel.setScale(scale);
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
    const lx = (u * this.w - f.cx) * f.zoom * scale;
    const ly = (v * this.h - f.cy) * f.zoom * scale;
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
    this.startStep = data.step ?? null;
    this.carryIn = data.carry ?? null;
    this.services = data.services ?? this.services ?? {};
    this.fromAct = data.fromAct ?? null;
  }

  preload() {
    if (!this.textures.exists('nsv-paper')) this.load.image('nsv-paper', PAPER_URL);
    const act = actById(this.actId);
    const worlds = new Set(['fields', ...(act.assets ?? [])].filter((name) => WORLDS[name]));
    worlds.forEach((name) => WORLDS[name].chunks.forEach(({ key, url }) => {
      if (!this.textures.exists(key)) this.load.image(key, url);
    }));
  }

  create() {
    this.act = actById(this.actId);
    this.model = createPanelModel(this.act, { carry: this.carryIn ?? startCarry(this.actId), step: this.startStep });
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
      images: {},
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
    this.crossLayer = this.add.container(0, 0);

    // ---------- tiles ----------
    this.views = {};
    Object.keys(this.act.tiles).forEach((tileId, index) => {
      this.views[tileId] = new TileView(this, tileId, index);
    });
    this.bezelLayer.add(this.crossLayer);
    this.bezelLayer.bringToTop(this.linkG);
    this.bezelLayer.bringToTop(this.crossLayer);
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
      this.rigs[id] = { rig, kind: def.rig ?? id, parent: null, stepClock: 0 };
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

    this.buildOverlays();
    this.bindModel();
    this.bindInput();
    this.applyGrades(true);

    const onSettings = (event) => {
      this.textScale = (event.detail?.textScale ?? 100) / 100;
      this.relayoutText();
    };
    window.addEventListener('nightfall:settings', onSettings);
    this.events.once('shutdown', () => {
      window.removeEventListener('nightfall:settings', onSettings);
      window.removeEventListener('keydown', this.onKeyDown, true);
      window.removeEventListener('keyup', this.onKeyUp, true);
    });

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
    const key = `nsv-wall-${cols}x${rows}-${this.layout.tileW}`;
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
    // caption bar (dialogue)
    const sill = this.wallInfo.sillY;
    this.captionBox = this.add.container(W / 2, H - 66).setVisible(false).setAlpha(0);
    void sill;
    const bg = this.add.image(0, 0, 'nsv-caption');
    this.captionSpeaker = this.add.text(-580, -46, '', { fontFamily: MONO, fontSize: '22px', color: '#e0a24a', fontStyle: 'bold' });
    this.captionText = this.add.text(-580, -16, '', { fontFamily: SERIF, fontSize: '34px', color: '#eadfc6', wordWrap: { width: 1140 }, lineSpacing: 6 });
    this.captionNext = this.add.text(592, 50, '▸', { fontFamily: SERIF, fontSize: '30px', color: '#e0a24a' }).setOrigin(1, 1);
    this.captionBox.add([bg, this.captionSpeaker, this.captionText, this.captionNext]);
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
    this.captionText?.setFontSize(Math.round(34 * s)).setWordWrapWidth(1140);
    this.captionSpeaker?.setFontSize(Math.round(22 * s));
    this.captionBox?.setScale(Math.max(1, 0.85 + s * 0.15));
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
    return createPaintContext(this, { target, w: view.w, h: view.h, era, model: this.model, tileId: view.id, stateId, env: this.env });
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
      const glint = this.add.image(38 * (hotspot.tag.scale ?? 1), -8, 'nsv-glint').setScale(0.55).setBlendMode('ADD');
      holder.add([tag, glint]);
      holder.setRotation(hotspot.tag.angle ?? 0);
      holder.setVisible(false);
      layer.add(holder);
      tags.push({ hotspot, holder, tag, glint, shown: false, seed: Math.random() * 10 });
    });
    return { stateId, root, present, past, animators, tags };
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
    m.on('stone', ({ id }) => { this.audio.play('stone'); this.services.onStone?.(id); });
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

  introduce() {
    const reduce = reducedMotionActive();
    const act = this.act;
    this.titleKicker.setText('CHAPTER 1 · NIGHT SERVICE');
    this.titleMain.setText(`${ROMAN[act.number] ?? act.number} · ${act.title}`);
    const hold = this.startStep ? 200 : 1700;
    Object.values(this.views).forEach((view, i) => {
      view.cover.setAlpha(1);
      this.tweens.add({ targets: view.cover, alpha: 0, delay: hold + 300 + i * 170, duration: reduce ? 300 : 950, ease: 'Sine.easeOut' });
    });
    this.tweens.add({ targets: this.blackout, alpha: 0, delay: hold, duration: 800, ease: 'Sine.easeOut' });
    this.titleBox.y = this.layout.view.h / 2 + 8;
    this.tweens.add({ targets: this.titleBox, alpha: 1, y: this.layout.view.h / 2, duration: 700, delay: 200, ease: 'Sine.easeOut' });
    this.time.delayedCall(200 + 700 + Math.max(200, hold - 500), () => {
      this.tweens.add({ targets: this.titleBox, alpha: 0, duration: 700, ease: 'Sine.easeIn' });
    });
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
      this.bezelLayer.bringToTop(this.crossLayer);
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
    this.captionText.setText('');
    this.captionNext.setVisible(false);
    if (!this.captionBox.visible) {
      this.captionBox.setVisible(true).setAlpha(0);
      this.captionBox.y += 12;
      this.tweens.add({ targets: this.captionBox, alpha: 1, y: this.captionBox.y - 12, duration: 260, ease: 'Sine.easeOut' });
    }
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
    this.cardTitle.setText(card.title ?? '');
    this.cardLines.setText((card.lines ?? []).join('\n'));
    this.cardBox.setVisible(true).setAlpha(0).setAngle(-3);
    this.cardBox.y = this.layout.view.h / 2 - 10;
    this.tweens.add({ targets: this.cardBox, alpha: 1, angle: -1, y: this.layout.view.h / 2 - 30, duration: 320, ease: 'Back.easeOut' });
    this.audio.play('paper');
  }

  hideCard() {
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
      lightRun: (points, { duration = 700, delay = 0, color = 0xffd08a } = {}) => {
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
            if (trail.length < 14 && Math.random() < 0.6) {
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
    else if (params.name === 'drift') { this.model.driftRate = params.rate ?? 1; this.audio.setRailRate(params.rate ?? 1); }
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

  pulseHint(hint) {
    if (!hint?.tile) return;
    const view = this.views[hint.tile];
    if (!view) return;
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
        this.tweens.add({ targets: glow, alpha: 0.5, duration: 600, yoyo: true, onComplete: () => glow.destroy() });
      }
    } else if (hint.edge) {
      const { side, at } = hint.edge;
      const u = side === 'left' ? 0 : side === 'right' ? 1 : at;
      const v = side === 'top' ? 0 : side === 'bottom' ? 1 : at;
      const pt = view.screen(u, v);
      this.shimmer(pt.x, pt.y);
    }
    // a soft breath of light over the whole window
    this.tweens.add({ targets: view.ring, alpha: { from: 1, to: 0.7 }, duration: 500, yoyo: true });
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
      if (dy > 0) {
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
    this.audio.unlock();
  }

  onPointerDown(p) {
    this.userInput();
    if (this.keyboardMode) { this.keyboardMode = false; this.refreshSelection(); }
    if (this.fading) return;
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
    const lens = this.model.state.lens;
    if (lens.enabled && Math.hypot(p.x - lens.x, p.y - lens.y) <= lens.r + 14) {
      this.press = { kind: 'lens', x: p.x, y: p.y, dx: lens.x - p.x, dy: lens.y - p.y, moved: false };
      return;
    }
    const slot = this.slotAt(p.x, p.y);
    if (!slot) return;
    const tile = this.model.tileAt(slot.index);
    if (!tile || this.busyView(tile)) return;
    const view = this.views[tile];
    // the zoom-out glyph
    if (view.glyph.visible && Math.hypot(p.x - (slot.x + slot.w - 12), p.y - (slot.y + 12)) < 26) {
      this.model.zoomOut(tile);
      return;
    }
    const edgeBand = 22;
    const onEdge = p.x - slot.x < edgeBand || slot.x + slot.w - p.x < edgeBand || p.y - slot.y < edgeBand || slot.y + slot.h - p.y < edgeBand;
    const frame = this.model.frameOn(tile);
    this.press = { kind: 'tile', tile, slot, x: p.x, y: p.y, moved: false, time: this.time.now };
    if (onEdge && frame && this.model.canLiftFrame(frame)) {
      this.press.holdTimer = this.time.delayedCall(250, () => {
        if (this.press?.tile === tile && !this.press.moved) {
          this.press.kind = 'frame';
          this.model.liftFrame(frame);
          this.moveFloating(p.x, p.y);
        }
      });
    }
  }

  onPointerMove(p) {
    const press = this.press;
    if (press) {
      const dist = Math.hypot(p.x - press.x, p.y - press.y);
      if (dist > 7) press.moved = true;
      if (press.kind === 'lens' && press.moved) {
        this.model.moveLens(p.x + press.dx, p.y + press.dy);
      } else if (press.kind === 'frame') {
        this.moveFloating(p.x, p.y);
      } else if (press.kind === 'tile' && press.moved && !this.drag) {
        press.holdTimer?.remove();
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
        this.shadow.setPosition(view.rect.x + view.w / 2 + 22, view.rect.y + view.h / 2 + 30).setDisplaySize(view.w * 1.2, view.h * 1.25);
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
      const slot = this.slotAt(p.x, p.y);
      this.model.dropFrame(slot ? this.model.tileAt(slot.index) : null);
      return;
    }
    if (this.drag) {
      const drag = this.drag;
      this.drag = null;
      const view = this.views[drag.tile];
      const cx = view.rect.x + view.w / 2;
      const cy = view.rect.y + view.h / 2;
      const slot = this.slotAt(cx, cy) ?? this.slotAt(p.x, p.y);
      this.model.dropOn(slot ? slot.index : this.model.slotOf(drag.tile));
      if (!slot) this.model.cancelDrag();
      return;
    }
    if (press.moved) return;
    if (press.kind === 'lens') {
      const slot = this.slotAt(p.x, p.y);
      const tile = slot ? this.model.tileAt(slot.index) : null;
      if (tile) this.clickAt(tile, slot, p);
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
    const locked = this.model.isLocked() || this.fading;
    const lens = this.model.state.lens;
    const slot = this.slotAt(p.x, p.y);
    const tile = slot ? this.model.tileAt(slot.index) : null;
    if (!locked && tile && !this.busyView(tile)) {
      const u = (p.x - slot.x) / slot.w;
      const v = (p.y - slot.y) / slot.h;
      const hit = this.model.hotspotAt(tile, u, v, { x: p.x, y: p.y });
      const view = this.views[tile];
      if (view.glyph.visible && Math.hypot(p.x - (slot.x + slot.w - 12), p.y - (slot.y + 12)) < 26) cursor = 'zoom-out';
      else if (hit) { cursor = hit.kind === 'zoom' ? 'zoom-in' : 'pointer'; hovered = { tile, hotspot: hit }; }
      else if (this.model.canDrag(tile)) cursor = 'grab';
    }
    if (!locked && lens.enabled && Math.hypot(p.x - lens.x, p.y - lens.y) <= lens.r + 14 && cursor === 'default') cursor = 'move';
    if (!locked && lens.enabled && Math.abs(Math.hypot(p.x - lens.x, p.y - lens.y) - lens.r) < 16) cursor = 'move';
    this.input.setDefaultCursor(cursor);
    this.hovered = hovered;
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
    if (this.fading) return ['Tab', ' ', 'Enter'].includes(key);
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
    if (this.lensFocus && m.state.lens.enabled) {
      if (arrows[key]) { this.keysDown.add(key); return true; }
      if (key === 'l' || key === 'L' || key === 'Escape') { this.lensFocus = false; return true; }
      if (key === 'Enter' || key === ' ') {
        const lens = m.state.lens;
        const slot = this.slotAt(lens.x, lens.y);
        if (slot) this.clickAt(m.tileAt(slot.index), slot, { x: lens.x, y: lens.y });
        return true;
      }
    }
    if (m.isLocked()) return ['Tab', ' ', 'Enter', 'Backspace'].includes(key) || Boolean(arrows[key]);
    if (arrows[key]) {
      const [dx, dy] = arrows[key];
      this.keyboardMode = true;
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
        this.keyboardMode = true;
        if (this.floating) { m.dropFrame(m.tileAt(this.kbFrameTarget ?? this.selectedSlot)); this.kbFrameTarget = null; }
        else if (this.kbHeld) this.kbDrop();
        else if (tile && m.canDrag(tile) && !this.busyView(tile) && m.beginDrag(tile)) {
          this.kbHeld = { tile, target: this.selectedSlot };
          this.hoverKbHeld();
        }
        this.refreshSelection();
        return true;
      case 'Tab': {
        this.keyboardMode = true;
        const list = tile ? m.hotspots(tile).filter((h) => h.enabled && (h.era !== 'past' || this.hotspotInLens(tile, h))) : [];
        if (!list.length) { this.focusedHotspot = null; return true; }
        const at = list.findIndex((h) => h.id === this.focusedHotspot?.id);
        const next = list[(at + (event.shiftKey ? list.length - 1 : 1) + list.length) % list.length];
        this.focusedHotspot = { tile, id: next.id };
        this.refreshSelection();
        return true;
      }
      case 'Enter': {
        this.keyboardMode = true;
        if (this.focusedHotspot?.tile === tile && tile && !this.busyView(tile)) {
          const h = m.hotspots(tile).find((spot) => spot.id === this.focusedHotspot.id);
          if (h?.enabled) {
            if (h.era === 'past' && !this.hotspotInLens(tile, h)) return true;
            m.activateHotspot(tile, h.id);
            this.focusedHotspot = null;
          }
        } else if (tile) {
          const first = m.hotspots(tile).find((h) => h.enabled && (h.era !== 'past' || this.hotspotInLens(tile, h)));
          if (first) this.focusedHotspot = { tile, id: first.id };
        }
        this.refreshSelection();
        return true;
      }
      case 'Backspace':
        if (this.floating) { m.dropFrame(null); this.kbFrameTarget = null; return true; }
        if (this.kbHeld) { m.cancelDrag(); this.kbHeld = null; return true; }
        if (tile && m.canZoomOut(tile) && !this.busyView(tile)) m.zoomOut(tile);
        return true;
      case 'f':
      case 'F': {
        const frame = tile ? m.frameOn(tile) : null;
        if (frame && m.liftFrame(frame)) { this.kbFrameTarget = this.selectedSlot; this.keyboardMode = true; this.placeFloatingAtSlot(this.selectedSlot); }
        return true;
      }
      case 'l':
      case 'L':
        if (m.state.lens.enabled) this.lensFocus = !this.lensFocus;
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
    this.shadow.setPosition(slot.x + slot.w / 2 + 30, slot.y + slot.h / 2 + 20).setDisplaySize(view.w * 1.2, view.h * 1.25);
  }

  kbDrop() {
    const { tile, target } = this.kbHeld;
    this.kbHeld = null;
    this.selectedSlot = target;
    if (!this.model.dropOn(target)) {
      // dropping back on its own slot: onDragEnd already animates home
    }
    void tile;
  }

  refreshSelection() {
    Object.values(this.views).forEach((view) => {
      const slot = this.model.slotOf(view.id);
      view.select.setVisible(this.keyboardMode && slot === (this.kbHeld ? this.kbHeld.target : this.kbFrameTarget ?? this.selectedSlot));
    });
  }

  devSkip() {
    const m = this.model;
    if (m.state.ended) return;
    m.state.queue.length = 0;
    m.state.blocking = null;
    m.state.queue.push({ checkpoint: this.act.id === 'act1' ? 'chapter-1-act-2' : this.act.id === 'act2' ? 'chapter-1-act-3' : 'chapter-2-start' });
    m.state.queue.push(this.act.id === 'act3' ? { endChapter: true } : { nextAct: this.act.next ?? (this.act.id === 'act1' ? 'act2' : 'act3') });
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
    holder.setScale(0.9).setAlpha(0.95);
    const outline = this.add.graphics();
    outline.lineStyle(3, 0xffc46a, 0.7);
    outline.strokeRoundedRect(-view.w / 2, -view.h / 2, view.w, view.h, 16);
    holder.add(outline);
    this.dragLayer.add(holder);
    const start = view.screen(0.5, 0.5);
    holder.setPosition(start.x, start.y);
    this.floating = { frameId, holder };
  }

  moveFloating(x, y) {
    if (!this.floating) return;
    const h = this.floating.holder;
    const vx = x - h.x;
    h.setPosition(x, y);
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
    this.tweens.add({ targets: holder, x: dest.x, y: dest.y, scale: 1, rotation: 0, alpha: 0.6, duration: 220, ease: 'Sine.easeOut', onComplete: () => holder.destroy() });
    void frameId;
  }

  // ---------------------------------------------------------------------------
  // per frame

  update(time, delta) {
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
      view.glyph.setVisible(this.model.canZoomOut(view.id) && !view.zooming);
    });

    // hover shimmer over the hotspot under the pointer (or keyboard focus)
    Object.values(this.views).forEach((view) => view.hover.setVisible(false));
    const focus = this.keyboardMode && this.focusedHotspot
      ? { tile: this.focusedHotspot.tile, hotspot: this.model.hotspots(this.focusedHotspot.tile).find((h) => h.id === this.focusedHotspot.id) }
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

    // lens
    this.lensView.setVisible(lens.enabled);
    if (lens.enabled) {
      this.lensView.setPosition(lens.x, lens.y);
      this.lensView.setScale(1 + (this.lensFocus ? Math.sin(this.clock / 200) * 0.015 : 0));
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

    // idle hint: 45 s without input on an unsolved step pulses the right thing
    if (!this.model.isLocked() && !this.fading && !(this.caption && !this.caption.auto)) {
      this.idleMs += dt;
      const step = this.model.currentStep();
      if (step?.hint && this.idleMs > IDLE_HINT_MS) {
        this.hintCooldown -= dt;
        if (this.hintCooldown <= 0) {
          this.pulseHint(step.hint);
          this.hintCooldown = HINT_REPEAT_MS;
        }
      }
    }
    void reduce;
  }

  updateTags(view) {
    const state = view.current;
    if (!state?.tags.length) return;
    const live = new Map(this.model.hotspots(view.id).map((h) => [h.id, h]));
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
      const scale = sceneDef?.actorScale ?? 1;
      const moving = Boolean(actor.walk) && !actor.blocked;
      if (actor.crossing) {
        if (entry.parent !== this.crossLayer) { this.crossLayer.add(rig.root); entry.parent = this.crossLayer; }
        const to = actor.crossing.to;
        const from = view.screen(actor.x, actor.y);
        const dest = this.views[to.tile].screen(to.x, to.y);
        rig.root.setPosition(lerp(from.x, dest.x, actor.crossing.t), lerp(from.y, dest.y, actor.crossing.t));
        rig.root.setVisible(actor.visible);
        rig.root.setScale(actor.facing * scale * view.rect.scale, scale * view.rect.scale);
      } else {
        if (entry.parent !== view.actorLayer) { view.actorLayer.add(rig.root); entry.parent = view.actorLayer; }
        rig.root.setPosition(actor.x * view.w, actor.y * view.h);
        const visible = actor.visible && (!actor.state || actor.state === tileState) && !view.zooming && view.current?.stateId === tileState;
        rig.root.setVisible(visible);
        rig.root.setScale(actor.facing * scale, scale);
      }
      rig.update(dt, { pose: actor.pose, moving, time: this.clock });
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
        const slot = this.model.slotRect(tile);
        return { tile, x: slot.x + slot.w - 12, y: slot.y + 12 };
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
        audioUnlocked: Boolean(this.audio.unlocked),
      },
    };
  }
}

export { edgePoint };
