// Chapter 2 · BORROWED LIGHT — the chapter scene.
//
// Butch chases Mara across wet rooftops. He punches the city's grid nodes so
// lifts, bridges and signs switch on at the next bell. The rules live in
// timetableModel.js, the movement numbers in controller.js and the geometry
// in level.js; this scene renders them, runs Arcade physics and the story.
//
// Physics and the timetable advance together inside Arcade's fixed 60 Hz
// step (WORLD_STEP), so jumps, bells and machines behave the same at any
// frame rate. Rendering happens in update().

import Phaser from 'phaser';
import { music } from '../../shared/musicDirector.js';
import { createSaveStore } from '../../shell/saveSystem.js';
import { CINEMATICS, navigateAfterCinematic } from '../../shell/gameFlow.js';
import { collectMagicStone, magicStoneSnapshot } from '../../shell/magicStones.js';
import { reducedMotionActive } from '../../shell/motion.js';
import { createTimetable, rememberedSequence } from './timetableModel.js';
import { CONTROLLER, createControllerState, stepController, tapHoldMs } from './controller.js';
import { placeTeachTag, signRects } from './teachTag.js';
import {
  BENCH,
  BOARD_X,
  DEPARTURE_BELLS,
  DEPARTURE_CHAIN,
  DEPARTURE_TRIGGER_X,
  REMEMBER_PLACE,
  GRID_STONE,
  HOTEL_WINDOW,
  LAMPS,
  MACHINES,
  MARA_SIGHTINGS,
  WINDOW_SIGHTING,
  MECHANIC,
  NODES,
  PLATFORMS,
  PLATFORM_LAMPS,
  PUNCH_RANGE,
  SECTIONS,
  SECTION_CHECKPOINTS,
  SECTION_ORDER,
  SIGNS,
  TRAIN,
  WORLD,
  cableFor,
  circuitKey,
  districtOf,
  lampById,
  machineBounds,
  machineById,
  nodeHead,
  sectionAt,
  timetableDefinition,
} from './level.js';
import { ARCHIVE_CARD_B1, BOARDING_LINES, CHAPTER_TITLE, DARK_DECK_HINT, HINTS, MARA_LETTER, MECHANIC_LINES, MECHANIC_REPEAT, stoneToast } from './story.js';
import { afterglowLight, deckReveal, deckSolid, lampRim, machineLight } from './memoryLight.js';
import { DEPTH, FONTS, INK_HEX, LINE_COLORS } from './art/palette.js';
import { BUTCH_SPEC, MARA_SPEC, MECHANIC_SPEC, drawFigure } from './art/figures.js';
import {
  buildBackground,
  buildDarkness,
  buildLamp,
  buildPlatformArt,
  buildPuddles,
  buildSharedTextures,
  buildSigns,
  buildTrain,
  buildWeather,
  drawBlackoutRims,
  setLampLit,
} from './art/worldArt.js';
import { createMachineView, drawCable, drawGhost, drawMachine, drawNode, drawNodePole, powerLevel } from './art/machineArt.js';
import { BorrowedLightHud } from './hud.js';
import { Fx } from './art/fx.js';
import * as sfx from './audio.js';

export const BORROWED_LIGHT_VIEW = Object.freeze({ w: 1920, h: 1080 });

const PANORAMA_URLS = Object.values(import.meta.glob('../../assets/generated/worlds/world-04-retro-cyberpunk/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
})).sort();

const BODY_W = 40;
const BODY_H = 96;
const CHEST = 64;
const SECTION_LABEL = { A: 'A · RAIN ROOFTOPS', B: 'B · BLACKOUT', C: 'C · EVACUATION PLATFORM' };

export class BorrowedLightScene extends Phaser.Scene {
  constructor() {
    super('BorrowedLight');
  }

  init(data = {}) {
    this.startSection = SECTION_ORDER.includes(data.section) ? data.section : 'A';
    this.devMode = Boolean(data.devMode);
    this.timescale = Math.max(0.1, Math.min(2, Number(data.timescale) || 1));
    this.skipIntro = Boolean(data.skipIntro);
    this.qaTimescale = Boolean(data.qaTimescale);
    this.maxFrameMs = this.qaTimescale ? 1000 : 100;
  }

  preload() {
    PANORAMA_URLS.forEach((url, i) => this.load.image(`bl-w4-${i}`, url));
  }

  create() {
    this.clock = 0;
    this.section = this.startSection;
    this.blackout = false;
    this.locked = null;
    this.respawning = false;
    this.listening = false;
    this.boarded = false;
    this.remembering = false;
    this.stoneTaken = magicStoneSnapshot().collected.includes('chapter-2');
    this.cull = [];
    this.platformX = PLATFORMS.find((p) => p.id === 'c-platform').x;
    this.flags = { mechanicTalked: false, letterRead: false, cardRead: false, listenHinted: false, firstPunch: false, jumped: false, listened: false, darkDeckHinted: false, darkDeckToasted: false };
    this.departure = { started: false, startBell: 0 };
    this.platformLampsLit = new Set();
    this.lastBellAt = -10;
    this.frame = null;
    this.onLiftId = null;
    this.stepAcc = 0;

    this.tt = createTimetable(timetableDefinition());
    // The city holds some machines open; the node that holds it shows lit,
    // so "punch its lit tag to cut" always points at something visible.
    const holderNode = (machineId) => machineById(machineId)?.heldBy ?? NODES.find((n) => n.machine === machineId)?.id ?? null;
    this.holderNode = holderNode;
    MACHINES.filter((m) => m.heldAtStart).forEach((m) => { this.tt.hold(m.id, holderNode(m.id)); this.tt.settle(m.id, 1); });

    const cam = this.cameras.main;
    cam.setBounds(-300, WORLD.top, WORLD.width + 300, WORLD.bottom - WORLD.top);
    cam.setBackgroundColor('#05080d');
    this.physics.world.setBounds(-800, WORLD.top - 600, WORLD.width + 1600, WORLD.bottom - WORLD.top + 1200);
    this.applyTimescale();
    // QA on a slow software renderer: tweens must not drop long frames either.
    if (this.maxFrameMs > 100) this.tweens.setLagSmooth(5000, 1000);

    buildSharedTextures(this);
    this.bg = buildBackground(this, PANORAMA_URLS.map((_, i) => `bl-w4-${i}`));
    this.buildPlatforms();
    this.buildForegroundWires();
    this.signs = buildSigns(this, SIGNS);
    this.signs.filter((sign) => !sign.scroll).forEach((sign) => this.addCull([sign.img, sign.glow, sign.g], sign.x0, sign.x1));
    this.puddles = buildPuddles(this, PLATFORMS);
    this.puddles.forEach((p) => this.addCull([p.img], p.x0, p.x1));
    this.lamps = LAMPS.map((lamp) => buildLamp(this, lamp));
    this.lamps.forEach((lamp) => this.addCull([lamp.g, lamp.head, lamp.glow, lamp.cone], lamp.x0, lamp.x1));
    this.activeLamp = null;
    this.buildStoryProps();
    this.buildMachines();
    this.buildNodes();
    this.buildPlayer();
    this.weather = buildWeather(this);
    this.dark = buildDarkness(this);
    drawBlackoutRims(this.dark.rim, PLATFORMS);
    this.dark.rim.setVisible(false);
    this.hud = new BorrowedLightHud(this);
    // World prompts are paper tags (ivory paper, walnut ink), like every
    // chapter's tags. The teach tag carries first-use keys (jump, listen).
    const tagStyle = { fontFamily: FONTS.mono, fontSize: '16px', fontStyle: 'bold', color: '#2a1d14', backgroundColor: '#e6dcc2', padding: { x: 12, y: 6 } };
    this.promptText = this.add.text(0, 0, '', tagStyle)
      .setOrigin(0.5, 1).setDepth(DEPTH.ghost + 2).setLetterSpacing(3).setVisible(false);
    this.teachText = this.add.text(0, 0, '', tagStyle)
      .setOrigin(0.5, 1).setDepth(DEPTH.ghost + 2).setLetterSpacing(3).setVisible(false);
    this.hintText = this.add.text(0, 0, '', { fontFamily: FONTS.mono, fontSize: '14px', color: '#e6aab0', align: 'center' })
      .setOrigin(0.5, 1).setDepth(DEPTH.ghost + 3).setLetterSpacing(2).setAlpha(0);
    this.ghostG = this.add.graphics().setDepth(DEPTH.ghost);
    this.ghostLabels = Array.from({ length: 6 }, () => this.add.text(0, 0, '', { fontFamily: FONTS.mono, fontSize: '15px', color: '#eadfc6', backgroundColor: 'rgba(8,12,14,0.8)', padding: { x: 8, y: 4 } })
      .setOrigin(0.5, 1).setDepth(DEPTH.ghost + 1).setLetterSpacing(3).setVisible(false));
    this.fx = new Fx(this);
    this.squash = 1;

    this.setupInput();
    sfx.installAudio();
    this.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.fixedStep, this);

    this.onSettings = () => {
      this.hud.applyTextScale();
      const k = (globalThis.NIGHTFALL_SETTINGS?.textScale ?? 100) / 100;
      this.promptText.setFontSize(`${Math.round(16 * k)}px`);
      this.teachText.setFontSize(`${Math.round(16 * k)}px`);
      this.hintText.setFontSize(`${Math.round(14 * k)}px`);
    };
    this.onSettings();
    window.addEventListener('nightfall:settings', this.onSettings);
    this.events.once('shutdown', () => {
      window.removeEventListener('nightfall:settings', this.onSettings);
      music.stop({ fade: 1.6 });
    });

    this.startAt(this.startSection);
  }

  // =========================================================================
  // Building.

  addCull(objects, x0, x1) {
    this.cull.push({ objects: objects.filter(Boolean), x0, x1, visible: true });
  }

  buildPlatforms() {
    this.solids = this.physics.add.staticGroup();
    // The blackout's dark decks: solid and visible only in borrowed light.
    this.darkDecks = [];
    PLATFORMS.forEach((platform) => {
      const blackout = sectionAt(platform.x + platform.w / 2) === 'B';
      const exclude = [
        ...MACHINES.map((m) => { const b = machineBounds(m, 1); return [Math.min(b.x, m.x) - 60, Math.max(b.x + b.w, m.x + (m.w ?? 0)) + 60]; }),
        ...NODES.map((n) => [n.x - 70, n.x + 70]),
        ...LAMPS.map((l) => [l.x - 40, l.x + 80]),
        [MECHANIC.x - 180, MECHANIC.x + 180],
        [BENCH.x - 140, BENCH.x + 140],
      ];
      const art = buildPlatformArt(this, platform, { blackout, exclude });
      this.addCull(art.objects, art.x0, art.x1);
      const h = platform.kind === 'ledge'
        ? platform.h ?? 34
        : (platform.bottom ?? WORLD.bottom + 400) - platform.y;
      const zone = this.add.zone(platform.x + platform.w / 2, platform.y + h / 2, platform.w, h);
      this.physics.add.existing(zone, true);
      zone.platformId = platform.id;
      if (platform.kind === 'ledge') {
        zone.body.checkCollision.down = false;
      }
      this.solids.add(zone);
      if (platform.hidden) this.darkDecks.push({ platform, zone, objects: art.objects, reveal: 1, shown: 1, solid: true });
    });
  }

  buildForegroundWires() {
    // A few catenary wires with hanging shades in front of everything: the
    // near layer that makes the roofs feel inside a city, not on a stage.
    const g = this.add.graphics().setScrollFactor(1.18, 1.05).setDepth(DEPTH.near);
    const roofTopNear = (wx) => {
      const p = PLATFORMS.filter((q) => q.kind === 'roof').reduce((best, q) => {
        const d = Math.abs(q.x + q.w / 2 - wx);
        return !best || d < best.d ? { d, y: q.y } : best;
      }, null);
      return p ? p.y : 600;
    };
    for (let x = 400; x < WORLD.width * 1.18 + 2000; x += 1500 + (x % 700)) {
      // Screen-relative: sit well above the roofs the camera will be framing.
      const y = roofTopNear(x / 1.18) * 1.05 - 640 + ((x * 7) % 120);
      const span = 900 + ((x * 3) % 500);
      g.lineStyle(3, 0x050506, 0.95);
      g.beginPath();
      for (let i = 0; i <= 24; i += 1) {
        const k = i / 24;
        const px = x + span * k;
        const py = y + Math.sin(k * Math.PI) * 90;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      const sx = x + span * 0.5;
      const sy = y + 90;
      g.lineStyle(2, 0x050506, 1).lineBetween(sx, sy, sx, sy + 40);
      g.fillStyle(0x0b0907, 1).fillTriangle(sx - 26, sy + 62, sx + 26, sy + 62, sx, sy + 38);
      g.fillStyle(0xf2c27a, 0.8).fillEllipse(sx, sy + 63, 30, 6);
    }
    this.nearWires = g;
  }

  buildStoryProps() {
    // The rooftop mechanic's corner: an awning, a work lamp, a toolbox.
    const mg = this.add.graphics().setDepth(DEPTH.prop + 1);
    const mx = MECHANIC.x;
    const my = MECHANIC.y;
    mg.fillStyle(0x0c0907, 1).fillRect(mx - 120, my - 190, 6, 190).fillRect(mx + 110, my - 190, 6, 190);
    mg.fillStyle(0x3a1f18, 1).fillPoints([{ x: mx - 140, y: my - 196 }, { x: mx + 136, y: my - 196 }, { x: mx + 150, y: my - 160 }, { x: mx - 154, y: my - 160 }], true);
    mg.fillStyle(0x6b2a22, 1);
    for (let sx = mx - 150; sx < mx + 150; sx += 40) mg.fillRect(sx, my - 164, 20, 8);
    mg.lineStyle(1.6, INK_HEX, 0.55).lineBetween(mx - 154, my - 160, mx + 150, my - 160);
    mg.fillStyle(0x2a1d14, 1).fillRect(mx + 40, my - 36, 70, 36);
    mg.fillStyle(0x6b2a22, 1).fillRect(mx + 40, my - 36, 70, 8);
    mg.fillStyle(0x16100c, 1).fillRect(mx - 100, my - 60, 44, 60);
    mg.lineStyle(1.2, INK_HEX, 0.4).strokeRect(mx - 100, my - 60, 44, 60);
    this.mechanicLamp = this.add.image(mx - 60, my - 150, 'bl-glow').setDisplaySize(420, 320).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45).setDepth(DEPTH.fx);
    mg.fillStyle(0x0c0907, 1).fillRect(mx - 64, my - 156, 10, 12);
    mg.fillStyle(0xffd08a, 1).fillRect(mx - 62, my - 146, 6, 6);
    this.mechanicG = this.add.graphics().setDepth(DEPTH.npc);
    this.addCull([mg, this.mechanicLamp, this.mechanicG], mx - 400, mx + 400);

    // Hotel penthouse with the dark window and Mara's ticket stub.
    const hg = this.add.graphics().setDepth(DEPTH.building + 0.6);
    const hx = HOTEL_WINDOW.x;
    const hy = HOTEL_WINDOW.y;
    hg.fillStyle(0x121624, 1).fillRect(hx - 200, hy - 290, 420, 290);
    hg.fillStyle(0x0b0d16, 1).fillRect(hx - 212, hy - 302, 444, 16);
    hg.lineStyle(2.2, INK_HEX, 0.6).lineBetween(hx - 212, hy - 302, hx + 232, hy - 302);
    hg.fillStyle(0x05070c, 1).fillRect(hx - 56, hy - 210, 112, 150);
    hg.fillStyle(0x0d1826, 1).fillRect(hx - 50, hy - 204, 100, 138);
    hg.lineStyle(3, 0x05070c, 1).lineBetween(hx, hy - 204, hx, hy - 66).lineBetween(hx - 50, hy - 140, hx + 50, hy - 140);
    hg.fillStyle(0x6fb7ad, 0.08).fillTriangle(hx - 50, hy - 90, hx + 10, hy - 204, hx + 30, hy - 204);
    for (const wx of [hx - 160, hx + 110]) {
      hg.fillStyle(0x05070c, 1).fillRect(wx, hy - 200, 70, 120);
      hg.fillStyle(0x0a111c, 1).fillRect(wx + 4, hy - 196, 62, 112);
    }
    hg.fillStyle(0x05070c, 1).fillRect(hx - 64, hy - 58, 128, 8);
    // Frame for the HOTEL MERIDIAN sign on the penthouse roof.
    hg.lineStyle(4, 0x0b0907, 1);
    for (const fx of [hx - 180, hx + 180]) hg.lineBetween(fx + 80, hy - 302, fx + 80, hy - 420);
    this.hotelG = hg;
    this.stub = this.add.graphics().setDepth(DEPTH.building + 0.7);
    this.stubGlow = this.add.image(hx - 7, hy - 158, 'bl-glow').setDisplaySize(150, 150).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(DEPTH.building + 0.65);
    this.addCull([hg, this.stub, this.stubGlow], hx - 700, hx + 700);
    // Mara in the lit window (drawn behind the stub).
    this.windowMara = {
      g: this.add.graphics().setDepth(DEPTH.building + 0.62),
      glow: this.add.image(hx, hy - 135, 'bl-glow').setDisplaySize(360, 300).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.building + 0.64),
      state: 'unseen',
      a: 0,
    };

    // The plant room's doorway (behind the shutter): a dark passage with posts.
    const plant = PLATFORMS.find((p) => p.id === 'b-plant');
    if (plant) {
      const pg = this.add.graphics().setDepth(DEPTH.building - 0.2);
      pg.fillStyle(0x07090a, 1).fillRect(plant.x, plant.bottom, plant.w, 300 - plant.bottom);
      pg.fillStyle(0x151b1d, 1).fillRect(plant.x, plant.bottom, 14, 300 - plant.bottom).fillRect(plant.x + plant.w - 14, plant.bottom, 14, 300 - plant.bottom);
      pg.lineStyle(1.4, INK_HEX, 0.4).lineBetween(plant.x, plant.bottom, plant.x, 300).lineBetween(plant.x + plant.w, plant.bottom, plant.x + plant.w, 300);
      this.addCull([pg], plant.x - 200, plant.x + plant.w + 200);
    }

    // Bench with Mara's letter.
    const bg = this.add.graphics().setDepth(DEPTH.prop + 1);
    const bx = BENCH.x;
    const by = BENCH.y;
    bg.fillStyle(0x0c0907, 1).fillRect(bx - 90, by - 34, 8, 34).fillRect(bx + 82, by - 34, 8, 34);
    bg.fillStyle(0x3b2a1d, 1).fillRect(bx - 100, by - 40, 200, 10);
    bg.fillStyle(0x2a1d14, 1).fillRect(bx - 100, by - 76, 200, 9).fillRect(bx - 100, by - 60, 200, 9);
    bg.fillStyle(0x0c0907, 1).fillRect(bx - 94, by - 80, 6, 44).fillRect(bx + 88, by - 80, 6, 44);
    bg.lineStyle(1.6, INK_HEX, 0.55).lineBetween(bx - 100, by - 40, bx + 100, by - 40);
    this.letterG = this.add.graphics().setDepth(DEPTH.prop + 1.2);
    this.addCull([bg, this.letterG], bx - 400, bx + 400);

    // Grid Stone.
    this.stoneG = this.add.graphics().setDepth(DEPTH.node + 1);
    this.stoneGlow = this.add.image(GRID_STONE.x, GRID_STONE.y - 40, 'bl-glow').setDisplaySize(160, 160).setTint(0x7aeaff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDepth(DEPTH.fx);
    if (this.stoneTaken) { this.stoneG.setVisible(false); this.stoneGlow.setVisible(false); }

    // Trains.
    this.trainStart = buildTrain(this, { x: TRAIN.start.x, y: TRAIN.start.y + 36, cars: TRAIN.start.cars, key: 'start' });
    this.trainEnd = buildTrain(this, { x: TRAIN.end.x, y: TRAIN.end.y + 36, cars: TRAIN.end.cars, key: 'end' });
    this.trainEnd.setDoorOpen(true);
    this.trainStart.sync();
    this.trainEnd.sync();

    // The train ahead: far off on another track, lit, with Mara at its door.
    // It leaves as section C begins.
    const ah = TRAIN.ahead;
    const ahead = buildTrain(this, { x: ah.x, y: ah.y, cars: ah.cars, key: 'ahead' });
    ahead.container.setScrollFactor(ah.scroll, ah.scroll, true).setScale(ah.scale).setDepth(DEPTH.mid + 0.8).setAlpha(0.82);
    ahead.spill.setVisible(false);
    ahead.head.setVisible(false);
    ahead.setDoorOpen(true);
    const haze = this.add.image(0, -40, 'bl-px').setOrigin(0, 1).setDisplaySize(ahead.length, 300).setTint(0x0c1a22).setAlpha(0.38);
    const maraG = this.add.graphics();
    ahead.container.add([haze, maraG]);
    this.ahead = { train: ahead, g: maraG, phase: 'waiting', t: 0 };

    // Platform lamps on the evacuation platform (lit as the chain fires).
    this.platformLamps = PLATFORM_LAMPS.map((pl) => {
      const g = this.add.graphics().setDepth(DEPTH.prop + 1);
      g.fillStyle(0x0c0907, 1).fillRect(pl.x - 3, TRAIN.end.y - 230, 6, 230);
      g.fillStyle(0x19120d, 1).fillRect(pl.x - 16, TRAIN.end.y - 238, 32, 12);
      const head = this.add.image(pl.x, TRAIN.end.y - 222, 'bl-px').setDisplaySize(20, 8).setTint(0x3a2a18).setDepth(DEPTH.prop + 1.1);
      const glow = this.add.image(pl.x, TRAIN.end.y - 200, 'bl-glow').setDisplaySize(380, 380).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.fx);
      // The pool of light it throws on the wet platform and the track below.
      const pool = this.add.image(pl.x, TRAIN.end.y + 6, 'bl-glow').setDisplaySize(460, 70).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.fx);
      const spill = this.add.image(pl.x, TRAIN.end.y + 190, 'bl-glow').setDisplaySize(360, 90).setTint(0xe0a24a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.fx);
      return { ...pl, g, head, glow, pool, spill, lit: false };
    });

    // Mara.
    this.maraG = this.add.graphics().setDepth(DEPTH.npc);
    this.mara = null;
    this.sightingsDone = new Set();
  }

  buildMachines() {
    this.machineViews = new Map();
    this.machineSolids = this.physics.add.staticGroup();
    this.liftGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    MACHINES.forEach((machine) => {
      const view = createMachineView(this, machine);
      const entry = { machine, view, zone: null, updraft: null };
      if (machine.kind === 'lift') {
        const zone = this.add.zone(machine.x + machine.w / 2, machine.y0 + 13, machine.w, 26);
        this.physics.add.existing(zone);
        this.liftGroup.add(zone);
        zone.body.setAllowGravity(false).setImmovable(true);
        zone.body.pushable = false;
        zone.body.checkCollision.down = false;
        zone.body.checkCollision.left = false;
        zone.body.checkCollision.right = false;
        zone.machineId = machine.id;
        entry.zone = zone;
      } else if (['bridge', 'billboard', 'points', 'drawbridge', 'shutter'].includes(machine.kind)) {
        const zone = this.add.zone(machine.x, machine.y, 10, 10);
        this.physics.add.existing(zone, true);
        if (machine.kind !== 'shutter') {
          zone.body.checkCollision.down = false;
          zone.body.checkCollision.left = false;
          zone.body.checkCollision.right = false;
        }
        zone.machineId = machine.id;
        this.machineSolids.add(zone);
        entry.zone = zone;
      }
      this.machineViews.set(machine.id, entry);
      const imgs = Object.values(view.images);
      this.addCull([view.g, ...imgs], view.x0, view.x1);
      this.syncMachineBody(entry, 1 / 60, true);
    });
  }

  buildNodes() {
    this.nodeViews = new Map();
    const poles = this.add.graphics().setDepth(DEPTH.node - 0.5);
    NODES.forEach((node) => {
      drawNodePole(poles, node);
      const points = cableFor(node);
      const cableG = this.add.graphics().setDepth(DEPTH.cable);
      const g = this.add.graphics().setDepth(DEPTH.node);
      const xs = points.map((p) => p.x);
      const view = {
        node,
        g,
        cableG,
        points,
        hole: 0,
        sealing: 0,
        busyShake: 0,
        busyFlash: 0,
        cutMark: 0,
        target: 0,
        glint: 1,
        pulse: null,
        hint: 0,
        x0: Math.min(node.x, ...xs) - 120,
        x1: Math.max(node.x, ...xs) + 120,
      };
      this.nodeViews.set(node.id, view);
      this.addCull([g, cableG], view.x0, view.x1);
    });
    this.poles = poles;
  }

  buildPlayer() {
    const zone = this.add.zone(0, 0, BODY_W, BODY_H);
    this.physics.add.existing(zone);
    zone.body.setAllowGravity(false);
    zone.body.setMaxVelocity(1200, 1800);
    this.player = {
      zone,
      body: zone.body,
      ctrl: createControllerState(),
      g: this.add.graphics().setDepth(DEPTH.player),
      lampGlow: this.add.image(0, 0, 'bl-glow').setDisplaySize(260, 260).setTint(0xf2c27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setDepth(DEPTH.fx),
      lampSwing: 0,
      lampVel: 0,
      lampAt: null,
      alpha: 1,
      visible: true,
      pose: 'idle',
      stepPhase: 0,
    };
    this.physics.add.collider(zone, this.solids);
    this.physics.add.collider(zone, this.machineSolids);
    this.physics.add.collider(zone, this.liftGroup, (_p, lift) => {
      if (zone.body.touching.down || zone.body.bottom <= lift.body.top + 6) this.onLiftId = lift.machineId;
    });
  }

  setupInput() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys({
      left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', up: 'UP', w: 'W',
      space: 'SPACE', e: 'E', f: 'F', q: 'Q', enter: 'ENTER',
    });
    kb.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.jumpQueued = false;
    this.jumpHoldMs = 0;
    this.jumpDownAt = null;
    this.jumpUpAt = null;
    // A long frame can hand the same DOM keydown to a Key twice; every
    // press must act once.
    const seen = new WeakSet();
    const once = (fn) => (_key, event) => {
      if (event && typeof event === 'object') {
        if (seen.has(event)) return;
        seen.add(event);
      }
      fn(event);
    };
    const stamp = (event) => (Number.isFinite(event?.timeStamp) ? event.timeStamp : performance.now());
    const queueJump = (event) => {
      this.jumpQueued = true;
      this.jumpDownAt = stamp(event);
      this.jumpUpAt = null;
    };
    const jumpDown = (event) => {
      if (this.hud.cardOpen) { this.hud.closeCard(); return; }
      if (this.hud.dialogOpen) { this.hud.advanceDialog(); return; }
      queueJump(event);
    };
    this.keys.space.on('down', once(jumpDown));
    this.keys.up.on('down', once((event) => { if (!this.hud.dialogOpen && !this.hud.cardOpen) queueJump(event); }));
    this.keys.w.on('down', once((event) => { if (!this.hud.dialogOpen && !this.hud.cardOpen) queueJump(event); }));
    // Remember when the tap ended (see controller.js tapHoldMs).
    for (const key of [this.keys.space, this.keys.up, this.keys.w]) key.on('up', (_key, event) => { this.jumpUpAt = stamp(event); });
    this.keys.e.on('down', once(() => this.interact()));
    this.keys.enter.on('down', once(() => { if (this.hud.cardOpen) this.hud.closeCard(); else if (this.hud.dialogOpen) this.hud.advanceDialog(); }));
    this.keys.f.on('down', once(() => this.punch()));
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) return;
      if (this.hud.cardOpen) { this.hud.closeCard(); return; }
      if (this.hud.dialogOpen) { this.hud.advanceDialog(); return; }
      this.punch();
    });
    this.padPrev = {};
  }

  // =========================================================================
  // Start / sections.

  startAt(section) {
    const lamp = lampById(SECTIONS[section].spawn);
    this.section = section;
    // Lamps before this section's start are already lit.
    const startIndex = LAMPS.findIndex((l) => l.id === lamp.id);
    this.lamps.forEach((l, i) => setLampLit(l, i <= startIndex, null));
    this.activeLamp = lamp.id;
    this.placePlayer(lamp.spawnX, lamp.y);
    this.snapCamera();
    createSaveStore().markCheckpoint(SECTION_CHECKPOINTS[section]);

    if (section === 'A') {
      sfx.setRain(0.55);
      music.play('chapter-two-borrowed-light', { src: 'assets/music/ch1/1.3_neon_safety_test.mp3', volume: 0.26, fade: 4, loop: true });
      if (this.skipIntro) {
        this.hud.titleCard(CHAPTER_TITLE, `CHAPTER 2 · ${SECTION_LABEL.A}`);
        this.trainStart.container.x = -3600;
      } else this.playIntro();
    } else {
      this.trainStart.container.x = -3600;
      this.trainStart.sync();
      this.killSigns(true);
      if (section === 'B') {
        this.setBlackout(true, { instant: true });
        this.tt.setMemoryLight(true);
        sfx.setRain(1);
      } else {
        sfx.setRain(0.6);
        music.play('chapter-two-platform', { src: 'assets/music/ch1/1.2_train_resonance.mp3', volume: 0.3, fade: 4, loop: true });
      }
      this.hud.titleCard(CHAPTER_TITLE, `CHAPTER 2 · ${SECTION_LABEL[section]}`);
      if (section === 'C') this.time.delayedCall(1200, () => this.startAhead());
    }
  }

  applyTimescale() {
    this.physics.world.timeScale = 1 / this.timescale;
    this.tweens.timeScale = this.timescale;
    this.time.timeScale = this.timescale;
  }

  // Dev QA only: a scripted run can slow down for one precise beat.
  setQaTimescale(v) {
    if (!this.qaTimescale) return this.timescale;
    this.timescale = Math.max(0.02, Math.min(2, Number(v) || 1));
    this.applyTimescale();
    return this.timescale;
  }

  // Mara in the hotel window: lit while Butch climbs toward it, dark once
  // he is nearly there.
  drawWindowMara(t, dt) {
    const w = this.windowMara;
    if (!w || (w.state === 'gone' && w.a <= 0)) return;
    const S = WINDOW_SIGHTING;
    if (w.state === 'unseen' && this.section === 'B' && this.feetX > S.fromX && !this.flags.cardRead) {
      w.state = 'lit';
      this.sightingsDone.add(S.id);
    }
    if (w.state === 'lit' && ((this.feetY < S.goneFeetY && this.feetX > S.goneFromX) || this.flags.cardRead || this.section !== 'B')) {
      w.state = 'gone';
    }
    const target = w.state === 'lit' ? 1 : 0;
    w.a = Phaser.Math.Linear(w.a, target, 1 - Math.exp(-dt / (target ? 500 : 260)));
    if (w.state === 'gone' && w.a < 0.02) w.a = 0;
    const g = w.g;
    g.clear();
    w.glow.setAlpha(0.45 * w.a);
    if (w.a <= 0) return;
    const hx = HOTEL_WINDOW.x;
    const hy = HOTEL_WINDOW.y;
    g.fillStyle(0xf2c27a, 0.62 * w.a).fillRect(hx - 50, hy - 204, 100, 138);
    g.fillStyle(0xffe2b0, 0.4 * w.a).fillRect(hx + 4, hy - 196, 40, 70);
    drawFigure(g, MARA_SPEC, { x: hx + 20, y: hy - 64, facing: -1, pose: 'look', t, silhouette: true, rim: 0.3, alpha: w.a });
    g.lineStyle(3, 0x05070c, w.a).lineBetween(hx, hy - 204, hx, hy - 66).lineBetween(hx - 50, hy - 140, hx + 50, hy - 140);
  }

  // Mara boards the train ahead and it pulls away: C's goal, far off.
  startAhead() {
    if (!this.ahead || this.ahead.phase !== 'waiting') return;
    this.ahead.phase = 'boarding';
    this.ahead.t = 0;
  }

  drawAhead(t, dt) {
    const a = this.ahead;
    if (!a) return;
    const { train, g } = a;
    g.clear();
    if (a.phase === 'gone') return;
    a.t += dt;
    const door = train.doorOffset;
    if (a.phase === 'waiting' || a.phase === 'boarding') {
      const k = a.phase === 'boarding' ? Math.min(1, a.t / 1800) : 0;
      const x = door - 150 + 150 * k;
      drawFigure(g, MARA_SPEC, { x, y: -46, facing: 1, pose: k > 0 && k < 1 ? 'run' : 'look', phase: (a.t / 700) % 1, t, silhouette: true, rim: 0.8, alpha: 1 - Math.max(0, k - 0.8) * 5 });
      if (a.phase === 'boarding' && k >= 1) {
        a.phase = 'leaving';
        a.t = 0;
        train.setDoorOpen(false);
        sfx.trainChime();
        this.tweens.add({ targets: train.container, x: train.container.x + 3400, duration: 7000, ease: 'Cubic.easeIn', onComplete: () => { a.phase = 'gone'; train.container.setVisible(false); } });
      }
    }
  }

  playIntro() {
    this.locked = 'intro';
    this.player.visible = false;
    const train = this.trainStart;
    this.placePlayer(TRAIN.start.x + train.doorOffset, TRAIN.start.y);
    this.snapCamera();
    train.container.x = TRAIN.start.x - 2600;
    this.hud.titleCard(CHAPTER_TITLE, `CHAPTER 2 · ${SECTION_LABEL.A}`, { hold: 3200 });
    this.tweens.add({
      targets: train.container,
      x: TRAIN.start.x,
      duration: 2600,
      ease: 'Cubic.easeOut',
      onUpdate: () => train.sync(),
      onComplete: () => {
        train.setDoorOpen(true);
        sfx.trainChime();
        this.time.delayedCall(450, () => {
          this.placePlayer(train.doorWorldX, TRAIN.start.y);
          this.player.visible = true;
          this.autoRun = { targetX: train.doorWorldX + 130, then: () => { this.locked = null; } };
          this.locked = 'auto';
          this.time.delayedCall(2600, () => this.departStartTrain());
        });
      },
    });
  }

  departStartTrain() {
    const train = this.trainStart;
    train.setDoorOpen(false);
    sfx.trainChime();
    this.tweens.add({ targets: train.container, x: TRAIN.start.x - 3400, duration: 4200, ease: 'Cubic.easeIn', onUpdate: () => train.sync() });
  }

  enterSection(next) {
    if (SECTION_ORDER.indexOf(next) <= SECTION_ORDER.indexOf(this.section)) return;
    this.section = next;
    createSaveStore().markCheckpoint(SECTION_CHECKPOINTS[next]);
    if (next === 'B') {
      // The city takes its light back: every sign dies, the rain gets
      // louder, the screen darkens. Butch's lamp is what is left.
      this.killSigns(false);
      this.setBlackout(true);
      this.tt.setMemoryLight(true);
      sfx.blackoutCut();
      sfx.setRain(1);
      music.stop({ fade: 0.6 });
      this.time.delayedCall(900, () => { this.lightning(0.35); });
      if (!reducedMotionActive()) this.cameras.main.shake(260, 0.004);
      this.hud.titleCard('BLACKOUT', 'THE CITY TAKES ITS LIGHT BACK', { hold: 2000 });
    } else if (next === 'C') {
      this.setBlackout(false);
      this.tt.setMemoryLight(false);
      sfx.setRain(0.6);
      music.play('chapter-two-platform', { src: 'assets/music/ch1/1.2_train_resonance.mp3', volume: 0.3, fade: 5, loop: true });
      this.hud.titleCard('EVACUATION PLATFORM', 'THE TRAIN BRINGS ITS OWN LIGHT', { hold: 2000 });
      this.time.delayedCall(1200, () => this.startAhead());
    }
  }

  killSigns(instant) {
    this.signs.filter((sign) => sectionAt(sign.x) !== 'C').forEach((sign, i) => {
      const off = () => {
        sign.lit = false;
        sign.img.setTexture(sign.offKey);
        sign.glow.setAlpha(0);
      };
      if (instant) { off(); return; }
      // Die in a quick ripple, each with a last stutter.
      this.time.delayedCall(40 + i * 70, () => {
        sign.glow.setAlpha(0.1);
        this.time.delayedCall(60, () => { sign.glow.setAlpha(0.3); });
        this.time.delayedCall(140, off);
      });
    });
  }

  setBlackout(on, { instant = false } = {}) {
    this.blackout = on;
    this.dark.rt.setVisible(true);
    this.dark.rim.setVisible(on);
    this.darkTarget = on ? 0.86 : 0;
    if (instant) this.dark.alpha = this.darkTarget;
    this.nextLightning = this.clock + 6 + Math.random() * 6;
  }

  lightning(strength = 1) {
    this.flashT = reducedMotionActive() ? 0 : strength;
    sfx.thunder(0.3 + Math.random() * 0.5);
  }

  // =========================================================================
  // Player helpers.

  get feetX() { return this.player.body.center.x; }
  get feetY() { return this.player.body.bottom; }

  placePlayer(x, feetY) {
    const { body } = this.player;
    body.reset(x, feetY - BODY_H / 2);
    body.setVelocity(0, 0);
    this.player.ctrl = createControllerState();
  }

  snapCamera() {
    const cam = this.cameras.main;
    this.camLook = 220;
    cam.centerOn(this.feetX + this.camLook, this.feetY - 150);
    this.camY = this.feetY - 150;
  }

  respawn() {
    if (this.respawning || this.boarded) return;
    this.respawning = true;
    // The departure does not count the bells spent falling and walking back
    // into the lamp's light.
    this.tt.holdCountdown(true);
    this.time.removeEvent(this.countdownRelease);
    sfx.fallWhoosh();
    // Into the rain mist: the fade is the mist's colour, not black.
    this.hud.fade.setTint(0x0e1b22);
    this.tweens.add({
      targets: this.hud.fade,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        const lamp = lampById(this.activeLamp) ?? lampById(SECTIONS[this.section].spawn);
        this.placePlayer(lamp.spawnX, lamp.y);
        this.snapCamera();
        this.tt.clearQueue().forEach((id) => { const v = this.nodeViews.get(id); if (v) v.sealing = 1; });
        // The lamp flares as Butch steps back into its light.
        const lv = this.lamps.find((l) => l.id === lamp.id);
        if (lv) {
          lv.glow.setAlpha(1);
          this.tweens.add({ targets: lv.glow, alpha: 0.55, duration: 700, ease: 'Sine.easeOut' });
          sfx.lampLit();
        }
        this.tweens.add({
          targets: this.hud.fade,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.respawning = false;
            this.hud.fade.setTint(0x000000);
            this.countdownRelease = this.time.delayedCall(1500, () => this.tt.holdCountdown(false));
            if (this.fellThroughDark && !this.flags.darkDeckToasted) {
              this.flags.darkDeckToasted = true;
              this.hud.toast(DARK_DECK_HINT, '#9fd9cf', 3600);
            }
            this.fellThroughDark = false;
          },
        });
      },
    });
  }

  // =========================================================================
  // Actions.

  targetNode() {
    const cx = this.feetX;
    const cy = this.feetY - CHEST;
    let best = null;
    let bestD = PUNCH_RANGE;
    NODES.forEach((node) => {
      if (node.section !== this.section) return;
      const head = nodeHead(node);
      const d = Math.hypot(head.x - cx, (head.y + 20) - cy);
      if (d < bestD) { bestD = d; best = node; }
    });
    return best;
  }

  punch() {
    if (this.locked || this.respawning || this.hud.dialogOpen || this.hud.cardOpen) return;
    // One press, one punch: a keydown can arrive twice in one long frame.
    const now = performance.now();
    if (now - (this.lastPunchAt ?? -1e9) < 160) return;
    this.lastPunchAt = now;
    const node = this.targetNode();
    if (!node) return;
    const view = this.nodeViews.get(node.id);
    const res = this.tt.punch(node.id);
    this.lastPunch = { nodeId: node.id, result: res.result, at: this.clock };
    switch (res.result) {
      case 'queued': {
        sfx.punchClack();
        view.hole = Math.max(view.hole, 0.2);
        // The punched disc pops out and a light runs down the cable.
        const head = nodeHead(node);
        this.fx.pop(head.x, head.y + 51, LINE_COLORS[node.line].glow);
        view.pulse = 0;
        view.pulseSpeed = 1.6;
        // Listen is taught by a tag over Butch from the second punch on
        // (updatePrompts), until he has listened once.
        if (this.flags.firstPunch) this.flags.listenHinted = true;
        this.flags.firstPunch = true;
        break;
      }
      case 'replaced': {
        const head = nodeHead(node);
        this.fx.pop(head.x, head.y + 51, LINE_COLORS[node.line].glow);
        view.pulse = 0;
        view.pulseSpeed = 1.6;
        sfx.punchClack();
        sfx.fizzle();
        const old = this.nodeViews.get(res.cancelled);
        if (old) old.sealing = 1;
        this.floatHint(res.cancelled, `${LINE_COLORS[res.line].name} · FORGOTTEN`, LINE_COLORS[res.line].css);
        break;
      }
      case 'unqueued':
        sfx.fizzle();
        view.sealing = 1;
        break;
      case 'busy': {
        sfx.refused();
        view.busyShake = 1;
        // Show which machine holds the line: its cable flashes.
        NODES.filter((n) => n.machine === res.holder).forEach((n) => { const v = this.nodeViews.get(n.id); if (v) v.busyFlash = 1.4; });
        this.floatHint(node.id, HINTS.busy, LINE_COLORS[res.line].css, 3200);
        this.frameMachine(res.holder, 1300);
        break;
      }
      case 'cut':
        sfx.cutLine();
        view.cutMark = 1;
        // The "line holding" hint is answered: replace it, don't leave it up.
        this.floatHint(node.id, HINTS.cut, LINE_COLORS[node.line].css, 1600);
        break;
      default:
        break;
    }
  }

  floatHint(nodeId, text, color, ms = 2000) {
    const node = NODES.find((n) => n.id === nodeId);
    if (!node) return;
    const head = nodeHead(node);
    this.floatHintAt(head.x, head.y - 78, text, color, ms);
  }

  floatHintAt(x, y, text, color, ms = 2000) {
    this.hintText.setText(text).setColor(color).setPosition(x, y).setAlpha(1);
    this.tweens.killTweensOf(this.hintText);
    this.tweens.add({ targets: this.hintText, alpha: 0, y: y - 26, delay: ms, duration: 500 });
  }

  interactTarget() {
    const x = this.feetX;
    const y = this.feetY;
    const near = (px, py, r) => Math.abs(px - x) < r && Math.abs(py - y) < 160;
    if (this.section === 'A' && near(MECHANIC.x, MECHANIC.y, MECHANIC.talkRadius)) return 'mechanic';
    if (this.section === 'B' && near(HOTEL_WINDOW.x, HOTEL_WINDOW.y, HOTEL_WINDOW.readRadius)) return 'window';
    if (this.section === 'C' && near(BENCH.x, BENCH.y, BENCH.readRadius)) return 'letter';
    return null;
  }

  interact() {
    const now = performance.now();
    if (now - (this.lastInteractAt ?? -1e9) < 160) return;
    this.lastInteractAt = now;
    if (this.hud.cardOpen) { this.hud.closeCard(); return; }
    if (this.hud.dialogOpen) { this.hud.advanceDialog(); return; }
    if (this.locked || this.respawning || this.clock < (this.interactCooldown ?? 0)) return;
    const target = this.interactTarget();
    if (target === 'mechanic') {
      sfx.paper();
      const lines = this.flags.mechanicTalked ? [MECHANIC_REPEAT] : MECHANIC_LINES;
      this.hud.openDialog(lines, () => {
        this.flags.mechanicTalked = true;
        this.interactCooldown = this.clock + 0.4;
      });
    } else if (target === 'window') {
      sfx.paper();
      this.hud.openCard({ heading: ARCHIVE_CARD_B1.heading, subheading: ARCHIVE_CARD_B1.subheading, lines: ARCHIVE_CARD_B1.lines, kind: 'archive' }, () => {
        this.flags.cardRead = true;
        this.interactCooldown = this.clock + 0.4;
        const ahead = MARA_SIGHTINGS.find((m) => m.trigger === 'card');
        if (ahead && !this.sightingsDone.has(ahead.id)) this.time.delayedCall(400, () => this.startSighting(ahead));
      });
    } else if (target === 'letter') {
      sfx.paper();
      this.hud.openCard({ heading: MARA_LETTER.speaker, subheading: MARA_LETTER.role.toUpperCase(), lines: MARA_LETTER.lines, kind: 'letter' }, () => {
        this.flags.letterRead = true;
        this.interactCooldown = this.clock + 0.4;
        this.startDeparture();
      });
    }
  }

  startDeparture() {
    if (this.departure.started || this.section !== 'C') return;
    this.departure.started = true;
    this.departure.startBell = this.tt.bellIndex;
    this.tt.startCountdown(DEPARTURE_BELLS);
    sfx.bell({ departure: true });
    this.hud.ring({ departure: true });
    this.hud.toast('THE TRAIN IS LEAVING · EIGHT BELLS', '#e6aab0', 3000);
  }

  frameMachine(machineId, ms = 1100) {
    const machine = machineById(machineId);
    if (!machine) return;
    const b = machineBounds(machine, 1);
    this.frame = { x: b.x + b.w / 2, y: b.y + b.h / 2, until: this.clock + ms / 1000 };
  }

  // =========================================================================
  // Fixed step: timetable + physics control.

  fixedStep(dtSec) {
    const dt = dtSec * 1000;
    const events = this.tt.update(dt);
    events.forEach((event) => this.onModelEvent(event));
    this.machineViews.forEach((entry) => this.syncMachineBody(entry, dtSec));
    this.updateDarkDecks();
    this.controlPlayer(dt);
    this.checkWorld();
    this.onLiftId = null;
    // Arcade clears contact flags only on a frame's first step. When a slow
    // frame runs several steps, stale "blocked.down" would read as grounded
    // mid-jump and cancel it, so clear them for the next step ourselves.
    const { body } = this.player;
    for (const flags of [body.blocked, body.touching]) {
      flags.none = true;
      flags.up = false;
      flags.down = false;
      flags.left = false;
      flags.right = false;
    }
  }

  onModelEvent(event) {
    switch (event.type) {
      case 'bell': {
        const departure = Boolean(this.tt.countdown() && !this.tt.countdown().done);
        sfx.bell({ soft: false });
        this.hud.ring({ departure });
        this.lastBellAt = this.clock;
        event.fired.forEach((nodeId) => {
          const v = this.nodeViews.get(nodeId);
          if (v) { v.pulse = 0; v.pulseSpeed = 2.2; }
          const n = NODES.find((q) => q.id === nodeId);
          const head = nodeHead(n);
          this.fx.ripple(head.x, head.y - 4, LINE_COLORS[n.line].glow, { max: 220 });
        });
        // Frame a machine that just moved if it is off-screen but part of
        // the puzzle Butch is standing in.
        const view = this.cameras.main.worldView;
        for (const nodeId of event.fired) {
          const node = NODES.find((n) => n.id === nodeId);
          const machine = machineById(node.machine);
          const b = machineBounds(machine, 1);
          const inView = b.x + b.w > view.x + 80 && b.x < view.right - 80 && b.y + b.h > view.y + 60 && b.y < view.bottom - 60;
          if (!inView && machine.section === this.section && Math.abs(b.x + b.w / 2 - this.feetX) < 1500) { this.frameMachine(machine.id); break; }
        }
        break;
      }
      case 'power': {
        const machine = machineById(event.machineId);
        if (Math.abs(machine.x - this.feetX) < 1600) sfx.machineOn(machine.kind);
        if (this.section === 'C') this.lightPlatformLamp(event.machineId);
        break;
      }
      case 'flicker':
        if (Math.abs(machineById(event.machineId).x - this.feetX) < 1400) sfx.flickerTick();
        break;
      case 'arrived': {
        // The clunk of a bridge locking out (or a lift arriving), with a
        // small camera nudge — none with Reduce Motion.
        const machine = machineById(event.machineId);
        if (!['bridge', 'lift', 'points', 'drawbridge'].includes(machine.kind)) break;
        if (Math.abs(machine.x - this.feetX) > 1400) break;
        sfx.clunk(machine.kind);
        if (!reducedMotionActive()) this.cameras.main.shake(110, machine.kind === 'drawbridge' ? 0.0026 : 0.0016);
        break;
      }
      case 'off':
        if (Math.abs(machineById(event.machineId).x - this.feetX) < 1400) sfx.machineOff(machineById(event.machineId).kind);
        break;
      case 'countdown':
        sfx.bell({ departure: true, soft: true });
        break;
      case 'countdown-end':
        if (!this.boarded) this.trainRemembers();
        break;
      default:
        break;
    }
  }

  lightPlatformLamp(machineId) {
    this.platformLamps.forEach((pl) => {
      if (pl.lights !== machineId || pl.lit) return;
      pl.lit = true;
      pl.head.setTint(0xffd08a);
      this.tweens.add({ targets: pl.glow, alpha: 0.6, duration: 500 });
      this.tweens.add({ targets: pl.pool, alpha: 0.55, duration: 700 });
      this.tweens.add({ targets: pl.spill, alpha: 0.3, duration: 900 });
      sfx.lampLit();
    });
  }

  syncMachineBody(entry, dtSec, initial = false) {
    const { machine, zone } = entry;
    if (!zone) return;
    const status = this.tt.machineStatus(machine.id);
    const level = status.level;
    const setStatic = (x, y, w, h, enabled) => {
      zone.setPosition(x + w / 2, y + h / 2);
      zone.setSize(Math.max(1, w), Math.max(1, h));
      zone.body.enable = enabled;
      zone.body.updateFromGameObject();
    };
    switch (machine.kind) {
      case 'bridge': {
        const len = machine.length * level;
        setStatic(machine.dir > 0 ? machine.x : machine.x - len, machine.y, len, 20, len > 8);
        break;
      }
      case 'billboard':
        setStatic(machine.x, machine.y, machine.w, 20, status.powered && level > 0.5);
        break;
      case 'points':
      case 'drawbridge':
        setStatic(machine.dir > 0 ? machine.x : machine.x - machine.length, machine.y, machine.length, 20, level > 0.97);
        break;
      case 'shutter':
        setStatic(machine.x, machine.y, machine.w, machine.h, level < 0.6);
        break;
      case 'lift': {
        const targetTop = machine.y0 + (machine.y1 - machine.y0) * level;
        const body = zone.body;
        if (initial) {
          body.reset(machine.x + machine.w / 2, targetTop + 13);
          body.setVelocity(0, 0);
        } else {
          // Arrive exactly at the model's position on the next step.
          body.setVelocityY((targetTop - body.y) / Math.max(1 / 240, dtSec));
          body.setVelocityX(0);
        }
        entry.liftVy = body.velocity.y;
        break;
      }
      default:
        break;
    }
  }

  // Borrowed light in the blackout: powered machines and punched nodes'
  // afterglow (memoryLight.js). The darkness is erased with exactly these
  // lights; `visual` adds the machines' flicker, solidity ignores it.
  borrowedLights(t, { visual = false } = {}) {
    const lights = [];
    this.machineViews.forEach((entry) => {
      const st = this.tt.machineStatus(entry.machine.id);
      if (!st.powered) return;
      lights.push(machineLight(entry.machine, machineBounds(entry.machine, st.level), visual ? powerLevel(st, t) : 1));
    });
    NODES.forEach((node) => {
      const glow = this.tt.afterglowOf(node.id);
      if (glow > 0) lights.push(afterglowLight(nodeHead(node), glow));
    });
    return lights.filter(Boolean);
  }

  // Dark decks are solid only while borrowed light is on them. A deck Butch
  // is standing on holds until he leaves it (the light never drops him).
  updateDarkDecks() {
    if (!this.darkDecks?.length) return;
    const lights = this.blackout ? this.borrowedLights(this.clock) : null;
    const grounded = this.player.ctrl.grounded;
    for (const deck of this.darkDecks) {
      const { platform } = deck;
      deck.reveal = this.blackout ? deckReveal(platform, lights) : 1;
      const standing = grounded && Math.abs(this.feetY - platform.y) < 8
        && this.feetX >= platform.x - BODY_W / 2 && this.feetX <= platform.x + platform.w + BODY_W / 2;
      const solid = deckSolid(deck.reveal) || (deck.solid && standing);
      if (solid !== deck.solid) {
        deck.solid = solid;
        deck.zone.body.enable = solid;
      }
    }
  }

  inUpdraft() {
    const x = this.feetX;
    const y = this.feetY - BODY_H / 2;
    for (const entry of this.machineViews.values()) {
      const m = entry.machine;
      if (m.kind !== 'fan') continue;
      const st = this.tt.machineStatus(m.id);
      if (st.level < 0.35) continue;
      if (x > m.x + 10 && x < m.x + m.w - 10 && y > m.yTop && y < m.yBottom) return true;
    }
    return false;
  }

  readInput() {
    const k = this.keys;
    let left = k.left.isDown || k.a.isDown;
    let right = k.right.isDown || k.d.isDown;
    let jumpHeld = k.space.isDown || k.up.isDown || k.w.isDown;
    const pad = this.input.gamepad?.pad1;
    if (pad) {
      const ax = pad.axes.length ? pad.axes[0].getValue() : 0;
      left = left || ax < -0.35 || pad.left;
      right = right || ax > 0.35 || pad.right;
      jumpHeld = jumpHeld || pad.A;
    }
    return { left, right, jumpHeld };
  }

  controlPlayer(dt) {
    const { body, ctrl } = this.player;
    const grounded = body.blocked.down || body.touching.down;
    let input = { ...this.readInput(), jumpPressed: false };
    if (this.jumpQueued) {
      input.jumpPressed = true;
      this.jumpQueued = false;
      // A tap already released by this step still holds the jump for as
      // long as the key was really down (R2-2).
      this.jumpHoldMs = input.jumpHeld ? 0 : tapHoldMs({ downAt: this.jumpDownAt, upAt: this.jumpUpAt, timescale: this.timescale });
    }
    if (this.jumpHoldMs > 0) {
      input.jumpHeld = true;
      this.jumpHoldMs -= dt;
    }
    if (this.locked === 'auto' && this.autoRun) {
      input = { left: false, right: true, jumpHeld: false, jumpPressed: false };
      if (this.autoRun.chase) this.autoRun.targetX = this.boardX() + 10;
      if (this.feetX >= this.autoRun.targetX) {
        const then = this.autoRun.then;
        this.autoRun = null;
        input.right = false;
        then?.();
      }
    } else if (this.locked || this.respawning || this.hud.dialogOpen || this.hud.cardOpen) {
      input = { left: false, right: false, jumpHeld: false, jumpPressed: false };
    }
    if (this.locked === 'intro' || this.locked === 'boarded') {
      body.setVelocity(0, 0);
      return;
    }
    const out = stepController(ctrl, input, {
      grounded,
      vx: body.velocity.x,
      vy: body.velocity.y,
      inUpdraft: this.inUpdraft(),
    }, dt);
    let { vy } = out;
    if (this.onLiftId && grounded && !out.jumped) {
      const liftVy = this.machineViews.get(this.onLiftId)?.liftVy ?? 0;
      // Ride the lift: always press into it a touch so contact (and the
      // grounded pose) holds while it moves.
      vy = liftVy + 30;
    }
    body.setVelocity(out.vx, vy);
    this.player.pose = out.pose;
    // QA: a whole hop can fit inside one slow rendered frame, so the text
    // state keeps the last jump's peak (feet y) as well as the live pose.
    if (out.jumped) this.lastJump = { count: (this.lastJump?.count ?? 0) + 1, fromY: Math.round(this.feetY), peakY: Math.round(this.feetY) };
    else if (this.lastJump && !grounded) this.lastJump.peakY = Math.min(this.lastJump.peakY, Math.round(this.feetY));
    if (out.jumped) {
      this.flags.jumped = true;
      sfx.jumpSound();
      this.squash = 1.1;
      this.fx.dust(this.feetX, this.feetY, { dir: -ctrl.facing });
    }
    if (out.landed) {
      const hard = ctrl.landMs > 0;
      sfx.land(hard);
      this.spawnLandingSplash(this.feetX, this.feetY, hard);
      this.fx.dust(this.feetX, this.feetY, { hard });
      this.squash = hard ? 0.82 : 0.92;
    }
  }

  checkWorld() {
    if (this.boarded) return;
    const x = this.feetX;
    const y = this.feetY;
    if (y > WORLD.killY) {
      // A fall past an unlit dark deck earns one reminder after the respawn.
      if (this.blackout && this.darkDecks.some((deck) => !deck.solid && x > deck.platform.x - 120 && x < deck.platform.x + deck.platform.w + 120)) this.fellThroughDark = true;
      this.respawn();
      return;
    }
    if (this.respawning) return;

    // Street lamps.
    const lampIndex = LAMPS.findIndex((l) => l.id === this.activeLamp);
    this.lamps.forEach((lamp, i) => {
      if (i <= lampIndex || lamp.section !== this.section) return;
      if (x >= lamp.x - 10 && Math.abs(y - lamp.y) < 200) {
        this.activeLamp = lamp.id;
        setLampLit(lamp, true, this);
        sfx.lampLit();
      }
    });

    // Sections move forward only.
    const here = sectionAt(x);
    if (here !== this.section) this.enterSection(here);

    // Mara sightings.
    MARA_SIGHTINGS.forEach((s) => {
      if (this.sightingsDone.has(s.id) || s.section !== this.section || s.trigger) return;
      if (x >= s.triggerX || (s.altTriggerX && x >= s.altTriggerX && y < 330)) this.startSighting(s);
    });

    // Grid Stone.
    if (!this.stoneTaken && Math.abs(x - GRID_STONE.x) < 80 && Math.abs(y - GRID_STONE.y) < 90) this.takeStone();

    // Departure: reading the letter starts it; walking past the bench does too.
    if (this.section === 'C' && !this.departure.started && x >= DEPARTURE_TRIGGER_X && !this.hud.cardOpen) this.startDeparture();

    // Boarding.
    if (this.section === 'C' && x >= this.boardX() - 30 && Math.abs(y - TRAIN.end.y) < 40) this.board();
  }

  // Late, the door is rolling away: Butch boards where it actually is.
  boardX() { return this.remembering ? this.trainEnd.doorWorldX : Math.min(BOARD_X + 200, this.trainEnd.doorWorldX); }

  takeStone() {
    this.stoneTaken = true;
    collectMagicStone('chapter-2');
    sfx.stoneChime();
    this.tweens.add({ targets: [this.stoneGlow], alpha: 0, scale: 3, duration: 700 });
    this.stoneG.setVisible(false);
    // The shell's one-time first-stone card opens ~1.1 s after a first
    // pickup; the toast is short so it has cleared by then.
    const snapshot = magicStoneSnapshot();
    this.hud.toast(stoneToast(snapshot), '#9fd9cf', 900);
    this.hud.showStones(snapshot);
  }

  startSighting(s) {
    this.sightingsDone.add(s.id);
    this.mara = { s, phase: s.lightningOnly ? 'glimpse' : 'run', x: s.path[0][0], y: s.path[0][1], t: 0, facing: 1, alpha: 1, phaseT: 0 };
    if (s.lightningOnly || s.flash) this.lightning(0.9);
  }

  trainRemembers() {
    if (this.remembering || this.boarded) return;
    this.remembering = true;
    this.locked = 'remember';
    this.hud.toast('THE TRAIN REMEMBERS', '#f2c27a', 3200);
    sfx.trainChime();
    const seq = rememberedSequence(this.tt.history(this.departure.startBell), DEPARTURE_CHAIN);
    seq.forEach((machineId, i) => {
      this.time.delayedCall(650 * i + 400, () => {
        this.tt.hold(machineId, this.holderNode(machineId));
        NODES.filter((n) => n.machine === machineId).forEach((n) => { const v = this.nodeViews.get(n.id); if (v) v.pulse = 0; });
        this.lightPlatformLamp(machineId);
        sfx.machineOn(machineById(machineId).kind);
        this.frameMachine(machineId, 600);
      });
    });
    this.time.delayedCall(650 * seq.length + 1600, () => {
      const onUpper = this.feetY <= TRAIN.end.y + 20 && this.feetX >= REMEMBER_PLACE.upperFromX;
      const run = () => {
        // Late: the doors are still open but the train is already rolling;
        // Butch has to run the platform for the last car.
        const train = this.trainEnd;
        this.lateRoll = this.tweens.add({ targets: train.container, x: train.container.x + 900, duration: 9000, ease: 'Sine.easeIn', onUpdate: () => train.sync() });
        sfx.trainChime();
        this.autoRun = { targetX: this.boardX() + 10, then: null, chase: true };
        this.locked = 'auto';
      };
      if (onUpper) { run(); return; }
      this.tweens.add({
        targets: this.hud.fade,
        alpha: 1,
        duration: 350,
        onComplete: () => {
          this.placePlayer(REMEMBER_PLACE.x, REMEMBER_PLACE.y);
          this.snapCamera();
          this.tweens.add({ targets: this.hud.fade, alpha: 0, duration: 400 });
          run();
        },
      });
    });
  }

  board() {
    if (this.boarded) return;
    this.boarded = true;
    const onTime = !(this.tt.countdown()?.done);
    this.boardedOnTime = onTime;
    this.locked = 'boarded';
    this.autoRun = null;
    sfx.trainChime();
    const p = this.player;
    this.tweens.add({ targets: p, alpha: 0, duration: 500, delay: 200 });
    const train = this.trainEnd;
    if (onTime) {
      // The calmer shot: the train waits, door open, light on the wet
      // platform, then closes and pulls away slowly.
      this.frame = { x: train.doorWorldX + 300, y: TRAIN.end.y - 120, until: this.clock + 99 };
      this.time.delayedCall(700, () => this.hud.say(BOARDING_LINES.onTime, 2600));
      this.time.delayedCall(2100, () => {
        train.setDoorOpen(false);
        this.tweens.add({ targets: train.container, x: train.container.x + 900, duration: 4200, ease: 'Sine.easeIn', onUpdate: () => train.sync() });
        this.time.delayedCall(1800, () => this.exitChapter());
      });
    } else {
      // Late: Butch makes the last car at a run and the doors close on his
      // coat; the tail of it flaps outside as the train pulls away.
      this.lateRoll?.stop();
      p.alpha = 0;
      this.tweens.killTweensOf(p);
      train.setDoorOpen(false);
      this.coatCaught = this.caughtCoat(train);
      sfx.clunk('drawbridge');
      if (!reducedMotionActive()) this.cameras.main.shake(160, 0.003);
      this.frame = { x: train.doorWorldX + 160, y: TRAIN.end.y - 110, until: this.clock + 99 };
      this.time.delayedCall(300, () => this.hud.say(BOARDING_LINES.late, 2800));
      this.tweens.add({ targets: train.container, x: train.container.x + 1700, duration: 4200, ease: 'Cubic.easeIn', onUpdate: () => train.sync() });
      this.time.delayedCall(2900, () => this.exitChapter());
    }
  }

  // The coat tail shut in the rear car's door (late boarding only).
  caughtCoat(train) {
    const g = this.add.graphics();
    // The door seam on the side Butch ran from; the tail streams back.
    const x = train.doorOffset - 34;
    const y = -150;
    const draw = (t) => {
      g.clear();
      const flap = Math.sin(t * 17) * 7 + Math.sin(t * 7.3) * 5;
      const tail = [
        { x: x + 4, y }, { x: x + 4, y: y + 78 },
        { x: x - 58 - flap, y: y + 92 + flap * 0.5 }, { x: x - 46 - flap * 0.6, y: y + 40 },
        { x: x - 30 - flap * 0.3, y: y + 8 },
      ];
      g.fillStyle(BUTCH_SPEC.coat, 1).fillPoints(tail, true);
      g.fillStyle(BUTCH_SPEC.coatShade, 1).fillPoints([tail[0], tail[1], { x: x - 20 - flap * 0.4, y: y + 84 }, { x: x - 12, y: y + 20 }], true);
      g.lineStyle(2, INK_HEX, 0.7).strokePoints(tail, true);
    };
    draw(0);
    train.container.add(g);
    this.tweens.addCounter({ from: 0, to: 60, duration: 60000, onUpdate: (tw) => draw(tw.getValue()) });
    return g;
  }

  exitChapter() {
    if (this.exiting) return;
    this.exiting = true;
    this.tweens.add({
      targets: this.hud.fade,
      alpha: 1,
      duration: 1100,
      onComplete: () => {
        music.stop({ fade: 1.2 });
        createSaveStore().markCheckpoint('chapter-3-start');
        navigateAfterCinematic('chapter-2-to-3', CINEMATICS.chapter2To3, '/car03-3d.html', {
          label: 'Chapter 2 to Chapter 3 transition',
          preloadChapterId: 'chapter3',
          requirePreloadReady: true,
        });
      },
    });
  }

  spawnLandingSplash(x, y, hard) {
    const n = hard ? 5 : 2;
    for (let i = 0; i < n; i += 1) this.spawnSplash(x + (Math.random() - 0.5) * 50, y, 1.2);
  }

  spawnSplash(x, y, scale = 1) {
    const s = this.weather.splashes.find((sp) => sp.life <= 0);
    if (!s) return;
    s.life = 1;
    s.img.setPosition(x, y + 1).setVisible(true).setScale(0.5 * scale).setAlpha(0.8);
    s.scale = scale;
  }

  // =========================================================================
  // Frame update: input edges, camera, drawing.

  update(_time, delta) {
    const dt = Math.min(this.maxFrameMs, delta) * this.timescale;
    const t = (this.clock += dt / 1000);
    this.pollGamepad();
    this.listening = !this.locked && !this.hud.dialogOpen && !this.hud.cardOpen && (this.keys.q.isDown || Boolean(this.input.gamepad?.pad1?.L1));
    if (this.listening) this.flags.listened = true;
    if (this.hud.dialogOpen) this.hud.updateDialog(dt);

    this.updateCamera(dt);
    this.updateCulling();
    this.drawWorld(t, dt);
    this.drawPlayer(t, dt);
    this.fx.update(dt);
    this.drawAhead(t, dt);
    this.drawWindowMara(t, dt);
    this.drawNpcs(t, dt);
    this.updateWeather(t, dt);
    this.updateDarkness(t, dt);
    this.updateHud(t, dt);
    this.updatePrompts();
  }

  pollGamepad() {
    const pad = this.input.gamepad?.pad1;
    if (!pad) return;
    const edge = (name, value) => {
      const was = this.padPrev[name];
      this.padPrev[name] = value;
      return value && !was;
    };
    if (edge('A', pad.A)) {
      if (this.hud.cardOpen) this.hud.closeCard();
      else if (this.hud.dialogOpen) this.hud.advanceDialog();
      else {
        this.jumpQueued = true;
        this.jumpDownAt = null;
        this.jumpUpAt = null;
      }
    }
    if (edge('X', pad.X)) this.interact();
    if (edge('R1', pad.R1)) this.punch();
    const start = pad.buttons[9]?.pressed;
    if (edge('start', start)) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
  }

  updateCamera(dt) {
    const cam = this.cameras.main;
    const k = 1 - Math.exp(-dt / 260);
    const facing = this.player.ctrl.facing;
    this.camLook = Phaser.Math.Linear(this.camLook ?? 220, facing * 230, 1 - Math.exp(-dt / 700));
    let tx = this.feetX + this.camLook;
    // A fall is not followed into the depths: Butch drops out of frame into
    // the mist and the respawn fade takes over.
    // On the evacuation platform Butch sits lower in frame, so the train,
    // canopy and lamps fill the picture instead of the platform wall.
    const onPlatform = this.section === 'C' && this.feetX > this.platformX - 500;
    let ty = Math.min(this.feetY - (onPlatform ? 235 : 150), 720);
    // Vertical dead zone; a big drop (a section edge, a leap into the
    // blackout) is caught up quickly so Butch never lands off the bottom.
    const gap = ty - this.camY;
    if (Math.abs(gap) > 90) {
      const tau = Math.abs(gap) > 280 ? 60 : 180;
      this.camY = Phaser.Math.Linear(this.camY, ty - Math.sign(gap) * 90, 1 - Math.exp(-dt / tau));
    }
    ty = this.camY;
    if (this.listening) {
      // Listen pulls the view toward the queued machines.
      const preview = this.tt.preview().filter((c) => machineById(c.machineId).section === this.section);
      if (preview.length) {
        const b = machineBounds(machineById(preview[0].machineId), 1);
        tx = Phaser.Math.Linear(tx, b.x + b.w / 2, 0.35);
        ty = Phaser.Math.Linear(ty, b.y + b.h / 2, 0.25);
      }
    }
    if (this.frame && this.clock < this.frame.until) {
      tx = Phaser.Math.Linear(tx, this.frame.x, 0.6);
      ty = Phaser.Math.Linear(ty, this.frame.y, 0.5);
    } else this.frame = null;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    const ky = Math.abs(ty - cy) > 300 ? 1 - Math.exp(-dt / 90) : k * 0.9;
    cam.centerOn(Phaser.Math.Linear(cx, tx, k), Phaser.Math.Linear(cy, ty, ky));
  }

  updateCulling() {
    const view = this.cameras.main.worldView;
    const x0 = view.x - 400;
    const x1 = view.right + 400;
    this.cull.forEach((entry) => {
      const visible = entry.x1 >= x0 && entry.x0 <= x1;
      if (visible !== entry.visible) {
        entry.visible = visible;
        entry.objects.forEach((obj) => obj.setVisible(visible));
      }
    });
    if (this.stoneTaken) { this.stoneG.setVisible(false); this.stoneGlow.setVisible(false); }
  }

  isVisibleX(x0, x1) {
    const view = this.cameras.main.worldView;
    return x1 >= view.x - 300 && x0 <= view.right + 300;
  }

  drawWorld(t, dt) {
    const target = this.locked || this.hud.dialogOpen || this.hud.cardOpen ? null : this.targetNode();
    this.currentTarget = target;
    // Machines.
    this.machineViews.forEach((entry) => {
      if (!this.isVisibleX(entry.view.x0, entry.view.x1)) return;
      const status = this.tt.machineStatus(entry.machine.id);
      drawMachine(entry.view, status, t);
    });
    // Nodes + cables.
    const decay = dt / 1000;
    this.nodeViews.forEach((view, id) => {
      const status = this.tt.nodeStatus(id);
      const mstatus = this.tt.machineStatus(view.node.machine);
      view.hole = Phaser.Math.Linear(view.hole, status.queued || status.powering ? 1 : 0, Math.min(1, decay * (status.queued || status.powering ? 14 : 3)));
      view.sealing = Math.max(0, view.sealing - decay * 1.8);
      view.busyShake = Math.max(0, view.busyShake - decay * 2.2);
      view.busyFlash = Math.max(0, view.busyFlash - decay * 1.1);
      view.cutMark = mstatus.cut ? 1 : Math.max(0, view.cutMark - decay * 1.5);
      view.target = Phaser.Math.Linear(view.target, target?.id === id ? 1 : 0, Math.min(1, decay * 12));
      if (view.pulse !== null) { view.pulse += decay * (view.pulseSpeed ?? 2.2); if (view.pulse > 1) view.pulse = null; }
      const hinted = this.hud.dialogOpen && this.hud.dialog?.index === 2 && id === 'a-n1';
      view.glint = Phaser.Math.Linear(view.glint, hinted ? 2.2 : 1, Math.min(1, decay * 5));
      if (!this.isVisibleX(view.x0, view.x1)) return;
      const powered = mstatus.powered ? powerLevel(mstatus, t) * (mstatus.poweredBy === id ? 1 : 0.55) : 0;
      drawCable(view.cableG, view.points, view.node.line, { queued: status.queued, powered, pulse: view.pulse, t, busyFlash: Math.min(1, view.busyFlash) });
      drawNode(view.g, view.node, { status, target: view.target, hole: view.hole, sealing: view.sealing, busyShake: view.busyShake, cutMark: view.cutMark, glint: view.glint, flicker: mstatus.flicker }, t);
    });
    // Listen ghosts.
    this.ghostG.clear();
    this.hud.setListen(this.listening, dt);
    this.ghostLabels.forEach((label) => label.setVisible(false));
    if (this.listening) {
      // Labels stay in the playfield: under the bell HUD, above the toasts.
      const view = this.cameras.main.worldView;
      this.tt.preview().filter((change) => machineById(change.machineId).section === this.section).slice(0, 6).forEach((change, i) => {
        const machine = machineById(change.machineId);
        const line = this.tt.lineOf(change.machineId);
        drawGhost(this.ghostG, machine, change.to, line, t);
        // A plain label on each ghost: what the next bell does to it.
        const b = machineBounds(machine, change.to === 'on' ? 1 : Math.max(0.05, this.tt.machineStatus(machine.id).level));
        const verb = change.to === 'on'
          ? { bridge: 'EXTENDS', lift: 'RISES', billboard: 'LIGHTS · SOLID', fan: 'BLOWS', shutter: 'OPENS', points: 'THROWS', drawbridge: 'LOWERS', sign: 'LIGHTS' }[machine.kind]
          : 'SWITCHES OFF';
        const top = machine.kind === 'fan' ? Math.max(machine.yTop + 60, machine.yBottom - 260) : b.y;
        const lx = Phaser.Math.Clamp(b.x + b.w / 2, view.x + 160, view.right - 160);
        const ly = Phaser.Math.Clamp(top - 14, view.y + 270, view.bottom - 130);
        this.ghostLabels[i].setText(`NEXT BELL · ${verb}`).setColor(LINE_COLORS[line].css)
          .setPosition(lx, ly).setVisible(true);
      });
    }
    // Stone.
    if (!this.stoneTaken && this.isVisibleX(GRID_STONE.x - 100, GRID_STONE.x + 100)) {
      const g = this.stoneG;
      g.clear();
      const bob = Math.sin(t * 2) * 5;
      const sx = GRID_STONE.x;
      const sy = GRID_STONE.y - 40 + bob;
      g.fillStyle(0x130d23, 1).fillPoints([{ x: sx, y: sy - 22 }, { x: sx + 16, y: sy - 8 }, { x: sx + 11, y: sy + 16 }, { x: sx, y: sy + 24 }, { x: sx - 11, y: sy + 16 }, { x: sx - 16, y: sy - 8 }], true);
      g.fillStyle(0x7aeaff, 0.85).fillPoints([{ x: sx, y: sy - 18 }, { x: sx + 11, y: sy - 7 }, { x: sx, y: sy + 4 }, { x: sx - 8, y: sy - 6 }], true);
      g.fillStyle(0x795ab4, 0.9).fillPoints([{ x: sx, y: sy + 4 }, { x: sx + 11, y: sy - 7 }, { x: sx + 8, y: sy + 14 }, { x: sx, y: sy + 20 }], true);
      g.fillStyle(0xffffff, 0.9).fillCircle(sx - 3, sy - 10, 2);
      this.stoneGlow.setPosition(sx, sy).setAlpha(0.45 + 0.15 * Math.sin(t * 3));
    }
    // Ticket stub on the hotel window.
    if (this.isVisibleX(HOTEL_WINDOW.x - 300, HOTEL_WINDOW.x + 300)) {
      const g = this.stub;
      g.clear();
      const x = HOTEL_WINDOW.x - 22;
      const y = HOTEL_WINDOW.y - 180;
      g.fillStyle(0xe6dcc2, 1).fillRect(x, y, 30, 44);
      g.fillStyle(0xe0a24a, 1).fillRect(x, y, 30, 6);
      g.fillStyle(0x05070a, 1).fillCircle(x + 15, y + 26, 4);
      g.fillStyle(0x8a1e14, 1).fillCircle(x + 15, y + 2, 2.5);
      const tw = 0.5 + 0.5 * Math.sin(t * 2.3);
      g.fillStyle(0xffd08a, 0.9).fillTriangle(x + 22, y + 12, x + 34 + tw * 4, y + 12, x + 28, y + 11.6);
      g.fillStyle(0xffd08a, 0.9).fillTriangle(x + 28, y + 6 - tw * 3, x + 28, y + 18 + tw * 3, x + 28.4, y + 12);
    }
    // Letter on the bench.
    if (this.isVisibleX(BENCH.x - 300, BENCH.x + 300)) {
      const g = this.letterG;
      g.clear();
      const x = BENCH.x - 30;
      const y = BENCH.y - 48;
      g.fillStyle(this.flags.letterRead ? 0xbfb296 : 0xe9dfc6, 1).fillPoints([{ x, y }, { x: x + 46, y: y - 2 }, { x: x + 48, y: y + 8 }, { x: x + 2, y: y + 9 }], true);
      g.lineStyle(1, 0x8a7a5a, 0.8).lineBetween(x + 2, y + 4, x + 46, y + 3);
      if (!this.flags.letterRead) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2.6);
        g.fillStyle(0xffd08a, 0.9).fillTriangle(x + 38, y - 4, x + 50 + tw * 4, y - 4, x + 44, y - 4.4);
        g.fillStyle(0xffd08a, 0.9).fillTriangle(x + 44, y - 10 - tw * 3, x + 44, y + 2 + tw * 3, x + 44.4, y - 4);
      }
    }
  }

  drawPlayer(t, dt) {
    const p = this.player;
    const g = p.g;
    g.clear();
    const body = p.body;
    // Lamp pendulum reacts to acceleration.
    const ax = (body.velocity.x - (p.prevVx ?? 0)) / Math.max(1, dt);
    p.prevVx = body.velocity.x;
    p.lampVel += (-p.lampSwing * 0.02 - ax * 0.02 * p.ctrl.facing) * dt;
    p.lampVel *= Math.pow(0.08, dt / 1000);
    p.lampSwing = Phaser.Math.Clamp(p.lampSwing + p.lampVel * dt / 1000, -0.9, 0.9);
    if (!p.visible) { p.lampGlow.setAlpha(0); return; }
    // Squash and stretch settle back quickly.
    this.squash += (1 - this.squash) * Math.min(1, dt / 70);
    // Rain lands on his cap and shoulders.
    this.rainOnPlayer = (this.rainOnPlayer ?? 0) - dt;
    if (this.rainOnPlayer <= 0) {
      this.rainOnPlayer = reducedMotionActive() ? 260 : 90;
      this.spawnSplash(this.feetX + (Math.random() - 0.5) * 30, this.feetY - 100 + Math.random() * 14, 0.55);
    }
    // Footsteps.
    if (p.pose === 'run') {
      const phase = p.ctrl.runPhase;
      if ((p.stepPhase < 0.5 && phase >= 0.5) || (p.stepPhase > phase)) { sfx.step(); if (Math.random() < 0.5) this.spawnSplash(this.feetX, this.feetY, 0.7); }
      p.stepPhase = phase;
    }
    const lampAt = drawFigure(g, BUTCH_SPEC, {
      x: this.feetX,
      y: this.feetY,
      facing: p.ctrl.facing,
      pose: p.pose,
      phase: p.ctrl.runPhase,
      t,
      squash: this.squash,
      alpha: p.alpha,
      lampSwing: p.lampSwing,
      rim: this.blackout ? 0.75 : 0.55,
    });
    p.lampAt = lampAt;
    if (lampAt) {
      const flick = 0.92 + Math.sin(t * 17) * 0.03 + Math.sin(t * 5.3) * 0.04;
      p.lampGlow.setPosition(lampAt.x, lampAt.y).setAlpha((this.blackout ? 0.8 : 0.5) * flick * p.alpha).setDisplaySize(this.blackout ? 340 : 240, this.blackout ? 340 : 240);
    }
  }

  drawNpcs(t, dt) {
    // Mechanic: idle, faces Butch, talks while the caption is open.
    if (this.isVisibleX(MECHANIC.x - 200, MECHANIC.x + 200)) {
      const g = this.mechanicG;
      g.clear();
      const talking = this.hud.dialogOpen;
      const pointing = talking && this.hud.dialog?.index === 2;
      drawFigure(g, MECHANIC_SPEC, {
        x: MECHANIC.x,
        y: MECHANIC.y,
        facing: this.feetX < MECHANIC.x - 10 ? -1 : 1,
        pose: pointing ? 'look' : talking ? 'talk' : 'idle',
        t,
        rim: 0.5,
      });
      if (pointing) {
        // Points at the node by the edge.
        g.lineStyle(7, MECHANIC_SPEC.coat, 1).lineBetween(MECHANIC.x + 4, MECHANIC.y - 82, MECHANIC.x + 36, MECHANIC.y - 100);
        g.fillStyle(MECHANIC_SPEC.skin, 1).fillCircle(MECHANIC.x + 38, MECHANIC.y - 101, 4);
      }
    }
    // Mara.
    const g = this.maraG;
    g.clear();
    const m = this.mara;
    if (!m) return;
    const s = m.s;
    m.phaseT += dt;
    if (m.phase === 'glimpse') {
      const flash = this.flashT ?? 0;
      drawFigure(g, MARA_SPEC, { x: m.x, y: m.y, facing: -1, pose: 'look', t, silhouette: true, rim: 0.4 + flash, alpha: 0.5 + flash * 0.5 });
      if (m.phaseT > 1600) { m.phase = 'run'; m.phaseT = 0; }
      return;
    }
    if (m.phase === 'run') {
      const [tx, ty] = s.path[1];
      m.x = Math.min(tx, m.x + (s.speed ?? 0.47) * dt);
      m.y = ty;
      m.run = ((m.run ?? 0) + dt / 560) % 1;
      if (m.x >= tx) { m.phase = 'wait'; m.phaseT = 0; }
      drawFigure(g, MARA_SPEC, { x: m.x, y: m.y, facing: 1, pose: 'run', phase: m.run, t, silhouette: true, rim: 0.7 });
    } else if (m.phase === 'wait') {
      drawFigure(g, MARA_SPEC, { x: m.x, y: m.y, facing: -1, pose: 'look', t, silhouette: true, rim: 0.7 });
      if (m.phaseT > s.waitMs) { m.phase = 'leap'; m.phaseT = 0; m.from = [m.x, m.y]; }
    } else if (m.phase === 'leap') {
      const k = Math.min(1, m.phaseT / 700);
      const [fx, fy] = m.from;
      const [lx, ly] = s.leap;
      const x = fx + (lx - fx) * k;
      const y = fy + (ly - fy) * k - Math.sin(k * Math.PI) * 160;
      m.x = x;
      m.y = y;
      drawFigure(g, MARA_SPEC, { x, y, facing: 1, pose: 'jump', t, silhouette: true, rim: 0.7, alpha: 1 - Math.max(0, k - 0.6) / 0.4 });
      if (k >= 1) this.mara = null;
    }
  }

  updateWeather(t, dt) {
    const w = this.weather;
    const cam = this.cameras.main;
    const reduced = reducedMotionActive();
    const heavy = this.blackout ? 1.35 : 1;
    w.far.tilePositionY -= dt * 0.9 * heavy;
    w.far.tilePositionX = cam.scrollX * 0.25 + t * 40;
    w.mid.tilePositionY -= dt * 1.5 * heavy;
    w.mid.tilePositionX = cam.scrollX * 0.6 + t * 70;
    w.near.setVisible(!reduced);
    if (!reduced) {
      w.near.tilePositionY -= dt * 2.6 * heavy;
      w.near.tilePositionX = cam.scrollX * 1.1 + t * 120;
      w.near.setAlpha(this.blackout ? 0.6 : 0.45);
    }
    w.mid.setAlpha(reduced ? 0.35 : 0.65);
    w.mistBack.tilePositionX = t * 14;
    w.mistFront.tilePositionX = -t * 22;
    this.bg.clouds.tilePositionX = cam.scrollX * 0.05 + t * 6;
    // Splashes on the roofs in view.
    const rate = (reduced ? 18 : 55) * heavy;
    const n = Math.floor(rate * dt / 1000 + Math.random());
    const view = cam.worldView;
    for (let i = 0; i < n; i += 1) {
      const x = view.x + Math.random() * view.width;
      const roof = PLATFORMS.find((p) => x >= p.x && x <= p.x + p.w && p.y > view.y && p.y < view.bottom && !p.hidden);
      if (roof) this.spawnSplash(x, roof.y, 0.6 + Math.random() * 0.6);
    }
    w.splashes.forEach((s) => {
      if (s.life <= 0) return;
      s.life -= dt / 260;
      if (s.life <= 0) { s.img.setVisible(false); return; }
      s.img.setScale((0.5 + (1 - s.life) * 0.7) * s.scale).setAlpha(0.8 * s.life);
    });
    // Puddle shimmer.
    this.puddles.forEach((p) => { if (p.img.visible) p.img.setAlpha(0.6 + 0.15 * Math.sin(t * 1.3 + p.phase) + 0.08 * Math.sin(t * 7 + p.phase * 3)); });
    // Near wires sway a hair.
    // Lightning in the blackout.
    if (this.blackout && this.clock > (this.nextLightning ?? 0)) {
      this.nextLightning = this.clock + 7 + Math.random() * 8;
      this.lightning(0.5 + Math.random() * 0.4);
    }
    // Signs: occasional low buzz flicker while lit.
    this.signs.forEach((sign) => {
      if (!sign.lit || !sign.img.visible) return;
      const f = Math.sin(t * 0.7 + sign.flickerSeed) > 0.985 ? 0.4 : 1;
      sign.img.setAlpha(f);
      sign.glow.setAlpha(0.32 * f);
    });
    // Machine hum.
    let hum = 0;
    this.machineViews.forEach((entry) => {
      const st = this.tt.machineStatus(entry.machine.id);
      if (st.powered && Math.abs(entry.machine.x - this.feetX) < 800) hum += 0.5;
    });
    if (Math.abs(hum - (this.humLevel ?? -1)) > 0.01) { this.humLevel = hum; sfx.setHum(hum); }
  }

  updateDarkness(t, dt) {
    const d = this.dark;
    d.alpha = Phaser.Math.Linear(d.alpha, this.darkTarget ?? 0, Math.min(1, dt / (this.blackout ? 220 : 1600)));
    this.flashT = Math.max(0, (this.flashT ?? 0) - dt / 260);
    d.flash.setAlpha(this.flashT * 0.18);
    if (d.alpha < 0.01) { d.rt.setVisible(false); return; }
    d.rt.setVisible(true);
    const cam = this.cameras.main;
    const view = cam.worldView;
    const rt = d.rt;
    rt.clear();
    const lightningLift = this.flashT * 0.6;
    rt.fill(0x03070c, Math.max(0, d.alpha - lightningLift));
    const brush = d.brush;
    const light = (wx, wy, radius, strength = 1) => {
      const sx = wx - view.x;
      const sy = wy - view.y;
      if (sx < -radius || sx > view.width + radius || sy < -radius || sy > view.height + radius) return;
      brush.setScale((radius * 2) / 256).setAlpha(Math.min(1, strength));
      rt.erase(brush, sx, sy);
    };
    // Butch's lamp.
    const p = this.player;
    if (p.visible && p.lampAt) {
      const flick = 0.95 + Math.sin(t * 13) * 0.03;
      light(p.lampAt.x, p.lampAt.y - 10, 250 * flick, 0.95);
      light(this.feetX, this.feetY - 50, 120, 0.6);
    }
    // Mara, when she is seen in the dark, carries a faint rim of light.
    if (this.mara) light(this.mara.x, this.mara.y - 55, 150, 0.55);
    // Lit street lamps.
    this.lamps.forEach((lamp) => { if (lamp.lit) light(lamp.x + 29, lamp.y - 120, 210, 0.85); });
    // Nodes: small pilot glow (a lit node is a small lamp of its own).
    this.nodeViews.forEach((view, id) => {
      const head = nodeHead(view.node);
      const st = this.tt.nodeStatus(id);
      light(head.x, head.y + 10, st.queued || st.powering ? 130 : 70, st.queued || st.powering ? 1 : 0.7);
    });
    // Borrowed light: powered machines and afterglow reveal the roofs (and
    // the dark decks) around them.
    const borrowed = this.borrowedLights(t, { visual: true });
    borrowed.forEach((b) => light(b.x, b.y, b.r, b.strength));
    this.drawDarkDecks(borrowed, dt);
    // Mara's ticket stub catches what light there is: the one bright thing
    // in the hotel's dark window.
    if (this.section === 'B') light(HOTEL_WINDOW.x - 7, HOTEL_WINDOW.y - 158, 110, 0.75);
    if (this.windowMara?.a > 0) light(HOTEL_WINDOW.x, HOTEL_WINDOW.y - 135, 240, 0.9 * this.windowMara.a);
    // Blackout rims + nodes' glints stay above the dark.
    const rd = d.rimDyn;
    rd.clear();
    if (this.blackout) {
      this.machineViews.forEach((entry) => {
        if (!this.isVisibleX(entry.view.x0, entry.view.x1)) return;
        const m = entry.machine;
        const st = this.tt.machineStatus(m.id);
        const b = machineBounds(m, st.level);
        if (m.kind === 'lift' || (m.kind === 'bridge' && st.level > 0.05)) {
          rd.lineStyle(2, INK_HEX, 0.3).lineBetween(b.x, b.y + 1, b.x + b.w, b.y + 1);
        }
      });
      this.nodeViews.forEach((view) => {
        if (!this.isVisibleX(view.x0, view.x1)) return;
        const head = nodeHead(view.node);
        const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + view.node.x);
        rd.fillStyle(0xffd08a, 0.35 + 0.4 * tw).fillCircle(head.x + 9, head.y + 35, 1.8 + tw);
      });
      this.drawDarkDeckRims(rd);
    }
  }

  // Dark decks fade in with the borrowed light on them and out without it.
  drawDarkDecks(lights, dt) {
    for (const deck of this.darkDecks ?? []) {
      const target = this.blackout ? Math.min(1, deckReveal(deck.platform, lights) * 2.5) : 1;
      deck.shown = Phaser.Math.Linear(deck.shown, target, Math.min(1, dt / 90));
      if (Math.abs(deck.shown - target) < 0.01) deck.shown = target;
      deck.objects.forEach((obj) => obj.setAlpha(deck.shown));
    }
  }

  // A lit deck gets a readable rim; an unlit one inside Butch's lamp shows
  // only a broken rim on its near edge — something is there, but it will not
  // hold him until it is lit.
  drawDarkDeckRims(rd) {
    const lamp = this.player.visible ? this.player.lampAt : null;
    for (const deck of this.darkDecks ?? []) {
      const { platform } = deck;
      if (!this.isVisibleX(platform.x, platform.x + platform.w)) continue;
      if (deck.solid) {
        if (deck.shown > 0.05) rd.lineStyle(2, INK_HEX, 0.55 * deck.shown).lineBetween(platform.x, platform.y + 1, platform.x + platform.w, platform.y + 1);
        // Held under Butch after its light has gone: the lamp shows the
        // boards he is standing on.
        if (deck.shown < 0.5 && deck.reveal < 0.2) {
          const under = lampRim(platform, lamp, 200);
          if (under) rd.lineStyle(2, INK_HEX, 0.45).lineBetween(Math.max(platform.x, this.feetX - 110), platform.y + 1, Math.min(platform.x + platform.w, this.feetX + 110), platform.y + 1);
        }
        continue;
      }
      const rim = lampRim(platform, lamp, 250);
      if (!rim) continue;
      rd.lineStyle(2, 0x9fb8c0, 0.5);
      for (let x = rim.x0; x < rim.x1; x += 18) rd.lineBetween(x, rim.y + 1, Math.min(rim.x1, x + 10), rim.y + 1);
      if (!this.flags.darkDeckHinted) {
        this.flags.darkDeckHinted = true;
        // Under the broken rim, in the dark gap: clear of Butch and the node tags.
        this.floatHintAt((rim.x0 + rim.x1) / 2 + 60, rim.y + 52, DARK_DECK_HINT, '#9fd9cf', 3600);
      }
    }
  }

  // The line tags under the bell show the district Butch is standing in.
  hudDistrict() {
    let best = null;
    let bestD = Infinity;
    for (const node of NODES) {
      if (node.section !== this.section) continue;
      const d = Math.abs(node.x - this.feetX);
      if (d < bestD) { bestD = d; best = node; }
    }
    return best ? districtOf(best) : this.section;
  }

  updateHud(t, dt) {
    const snap = this.tt;
    const lines = {};
    for (const line of ['amber', 'teal', 'rose']) {
      const circuit = circuitKey(this.hudDistrict(), line);
      const queued = snap.queuedOn(circuit);
      let state = queued ? 'queued' : 'idle';
      if (!queued && snap.lineBusy(circuit)) {
        const holder = MACHINES.find((m) => snap.circuitOf(m.id) === circuit && snap.machineStatus(m.id).powered && !snap.machineStatus(m.id).cut);
        state = holder && snap.machineStatus(holder.id).held ? 'held' : 'powering';
      }
      lines[line] = state;
    }
    this.hud.updateMeter({
      phase: snap.bellPhase(),
      msToBell: snap.msToBell(),
      lines,
      countdown: snap.countdown() && !snap.countdown().done ? snap.countdown() : null,
      departure: this.departure.started,
      t,
      dt,
    });
  }

  // First-use key tags. Jumping is first needed at the AC unit on the ROOMS
  // roof; Listen is worth learning once a punch is waiting for its bell.
  teachPrompt() {
    if (this.section !== 'A') return null;
    const onRoomsRoof = this.feetX > 5160 && this.feetX < 5545 && Math.abs(this.feetY - 460) < 12;
    if (!this.flags.jumped && onRoomsRoof) return { x: 5618, y: 386, text: HINTS.jump };
    const queued = Object.values(this.tt.snapshot().queued).length > 0;
    if (!this.flags.listened && this.flags.listenHinted && queued && !this.currentTarget) {
      // Near Butch, clear of the hanging neon (R2-1: it covered LAUNDRY).
      return { follow: true, text: HINTS.listen };
    }
    return null;
  }

  updatePrompts() {
    const pt = this.promptText;
    const teach = this.locked || this.hud.dialogOpen || this.hud.cardOpen ? null : this.teachPrompt();
    this.teachText.setVisible(Boolean(teach));
    if (teach) {
      this.teachText.setText(teach.text);
      const at = teach.follow
        ? placeTeachTag({
          feetX: this.feetX,
          feetY: this.feetY,
          bodyH: BODY_H + 16,
          tagW: this.teachText.width,
          tagH: this.teachText.height,
          rects: this.signRects ?? (this.signRects = signRects(SIGNS)),
        })
        : teach;
      this.teachText.setPosition(at.x, at.y);
      this.teachAt = at.at ?? null;
    }
    if (this.locked || this.hud.dialogOpen || this.hud.cardOpen) { pt.setVisible(false); return; }
    // Something already read keeps its E (you can read it again) but no
    // longer advertises it.
    const raw = this.interactTarget();
    const target = (raw === 'window' && this.flags.cardRead) || (raw === 'letter' && this.flags.letterRead) ? null : raw;
    if (target) {
      const [x, y, label] = target === 'mechanic'
        // Above the kiosk awning (its valance hangs 160–196 px up), clear of it.
        ? [MECHANIC.x, MECHANIC.y - 208, HINTS.talk]
        : target === 'window'
          ? [HOTEL_WINDOW.x, HOTEL_WINDOW.y - 230, HINTS.read]
          : [BENCH.x, BENCH.y - 100, HINTS.read];
      pt.setText(label).setPosition(x, y).setVisible(true);
      return;
    }
    const node = this.currentTarget;
    if (node) {
      const head = nodeHead(node);
      const status = this.tt.nodeStatus(node.id);
      const label = status.queued ? 'F · TAKE BACK' : status.powering && !status.cut ? 'F · CUT' : HINTS.punch;
      pt.setText(label).setPosition(head.x, head.y - 36).setVisible(true);
      return;
    }
    pt.setVisible(false);
  }

  // =========================================================================
  // QA.

  textState() {
    const snap = this.tt.snapshot();
    const body = this.player.body;
    return {
      coordinateSystem: 'origin top-left; +x right; +y down; world px; player x/y are the feet',
      scene: 'BorrowedLight',
      chapter: CHAPTER_TITLE,
      section: this.section,
      player: {
        x: Math.round(this.feetX),
        y: Math.round(this.feetY),
        vx: Math.round(body.velocity.x),
        vy: Math.round(body.velocity.y),
        grounded: this.player.ctrl.grounded,
        pose: this.player.pose,
        facing: this.player.ctrl.facing,
        lastJump: this.lastJump ?? null,
      },
      locked: this.locked,
      respawning: this.respawning,
      bell: { index: snap.bell, msToBell: snap.msToBell, phase: snap.bellPhase },
      queued: snap.queued,
      machines: snap.machines,
      afterglow: snap.afterglow,
      target: this.currentTarget?.id ?? null,
      lastPunch: this.lastPunch ?? null,
      listen: this.listening ? this.tt.preview() : null,
      checkpoint: this.activeLamp,
      blackout: this.blackout,
      stone: { taken: this.stoneTaken },
      countdown: snap.countdown,
      departureStarted: this.departure.started,
      remembering: this.remembering,
      boarded: this.boarded,
      boardedOnTime: this.boardedOnTime ?? null,
      dialog: this.hud.dialogOpen ? { speaker: this.hud.dialog.lines[this.hud.dialog.index].speaker, index: this.hud.dialog.index } : null,
      card: this.hud.cardOpen,
      prompt: this.promptText.visible ? this.promptText.text : null,
      teach: this.teachText.visible ? this.teachText.text : null,
      teachAt: this.teachText.visible ? { x: Math.round(this.teachText.x), y: Math.round(this.teachText.y), at: this.teachAt ?? null } : null,
      darkDecks: Object.fromEntries((this.darkDecks ?? []).map((deck) => [deck.platform.id, { solid: deck.solid, reveal: Number(deck.reveal.toFixed(2)), shown: Number(deck.shown.toFixed(2)) }])),
      caption: this.hud.saying && this.hud.caption.visible && !this.hud.dialogOpen ? this.hud.saying.text : null,
      mara: this.mara ? { sighting: this.mara.s.id, phase: this.mara.phase, x: Math.round(this.mara.x) } : null,
      sightings: [...this.sightingsDone],
      windowMara: this.windowMara ? { state: this.windowMara.state, a: Number(this.windowMara.a.toFixed(2)) } : null,
      aheadTrain: this.ahead ? this.ahead.phase : null,
      flags: this.flags,
      fps: Math.round(this.game.loop.actualFps || 0),
      timescale: this.timescale,
    };
  }
}
