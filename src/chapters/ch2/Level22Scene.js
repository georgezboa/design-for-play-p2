import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../../constants.js';
import { Heightfield, playVoidDeath, synthThud, synthBuzz, synthPing, synthWhir, makeTorsoTextures } from './torso.js';
import { AUG_TUNE, PSY_TUNE, makeAugTextures, AugPlayer, Psycho } from './aug.js';
import { makeVesselVoice } from './vessel.js';
import { applyLens, addFogBands, addEmbers, addSteam, addShaft } from './fx.js';
import { startAmbience } from './ambience.js';

/**
 * L2-2 「拼接」 — THE UPGRADE, level two of three (docs/chapter2-redesign.md §4).
 *
 * Flow: ATTACH cutscene (the prosthetic takes the torso, jump comes back
 * stronger) → PLAY: learn the grapple arm on a flat anchor, learn it under
 * pressure in the patrol zone, then the combined gauntlet (pit + anchor +
 * psychos) — with the Ernest corridor as the emotional valley in the middle.
 *
 * Metal absorption is always on: shards fly to the body and stay. Killing
 * feeds the parasite. 5 psychos + Ernest. Player has 3 lives; contact = 1.
 * Death = gore, respawn at this level's start. The chapter flows on to L2-3.
 */

// ------------------------------------------------------------------- layout

const L2 = {
  ground: 500,
  killY: 780,
  spawn: { x: 120, y: 500 },
  worldEnd: 6700,
  elevatorX: 6520,

  contour: [
    { x: 0, y: 500 },
    { x: 700, y: 505 },
    { x: 940, y: 505 },
    // GAP A 950–1230: too wide for the jump — the arm teaches itself here
    { x: 1240, y: 505 },
    { x: 1680, y: 505 },
    { x: 1730, y: 468 }, // small rubble bump — a hop, not a wall
    { x: 1780, y: 505 },
    { x: 2500, y: 500 },
    // Ernest corridor: dead flat, dead quiet
    { x: 3450, y: 500 },
    // PIT B 3500–3820: swing
    { x: 3830, y: 505 },
    { x: 4390, y: 505 },
    // PIT C 4400–4720: swing
    { x: 4730, y: 505 },
    { x: 4940, y: 505 },
    // CHASM D 4950–5600: three-ring web-swing chain
    { x: 5610, y: 505 },
    { x: 5800, y: 505 }, // landing shelf — breathe, then look DOWN
    // FOUNDRY SHAFT 5810–6280: the only way is UP — four-anchor climb
    { x: 6290, y: 350 }, // the high ledge: the elevator's deck
    { x: 6700, y: 350 },
  ],
  gaps: [
    { from: 950, to: 1230 },
    { from: 3500, to: 3820 },
    { from: 4400, to: 4720 },
    { from: 4950, to: 5600 },
    { from: 5810, to: 6280 },
  ],

  anchors: [
    { x: 1090, y: 330 }, // teaching: high over gap A — jump can't make it
    { x: 2000, y: 350 }, // optional: swing into the patrol zone
    { x: 3660, y: 330 }, // pit B
    { x: 4560, y: 330 }, // pit C
    { x: 5100, y: 340 }, // chasm ring 1
    { x: 5270, y: 318 }, // chasm ring 2
    { x: 5440, y: 340 }, // chasm ring 3
    { x: 5830, y: 330 }, // foundry: the first catch off the shelf
    { x: 5960, y: 252 }, // …and the floor of the world falls away
    { x: 6090, y: 192 }, // crucible light below, cable to cable
    { x: 6210, y: 252 }, // the last swing pays out onto the ledge
  ],

  psychos: [
    { x: 1500 },
    { x: 1950 },
    { x: 2300 },
    { x: 4050 },
    { x: 4300 },
    { x: 4800 },
    { x: 6400 }, // ledge guard
    { x: 6470 }, // ledge guard
  ],

  shardSpots: [
    [620, 470], [760, 465], [900, 470],
    [1300, 470], [1500, 465], [1750, 470], [2100, 465], [2350, 470],
    [3900, 470], [4150, 465], [4350, 470],
    [4750, 470], [4900, 465],
    [5650, 470], [5750, 465],
    [5895, 260], [6025, 200], [6150, 260], // paid out along the climb
    [6360, 318], [6580, 318],
  ],

  absorbStages: { half: 12, shoulders: 22 }, // §5.1: scattered → half-covered → shoulder mound

  ernest: { triggerX: 2550, spawnX: 3300, stopDist: 118, exitX: 3560 },
};

const POEM = [
  'Two roads diverged in a wood, and I—',
  'I took the one less traveled by,',
  'And that has made all the difference.',
];

export default class Level22Scene extends Phaser.Scene {
  constructor() {
    super('Level22');
  }

  create() {
    this.phase = 'ATTACH';
    makeTorsoTextures(this);
    makeAugTextures(this);
    startAmbience(this, 'industrial');

    this.field = new Heightfield(L2.contour, L2.gaps);
    this.buildBackdrop();
    this.field.draw(this, { maxX: L2.worldEnd + 50, bottom: 800, fill: 0x0e1219 });
    this.buildDecor();
    this.buildRigging();
    this.buildAnchors();
    this.buildShards();
    this.buildElevator();
    this.buildFoundry();

    this.psychos = [];
    this.hitstopUntil = 0;
    this.lastAnchor = null;
    this.lastAnchorAt = 0;
    this.slow = 1; // kill slow-mo factor (real-time, independent of Phaser clock)
    this.ePrev = false;
    this.ernestState = 'idle'; // idle|approach|wait|speak|leave|done
    this.ernestDone = this.registry.get('ch2.ernest') !== undefined;
    this.laserDrop = null; // Ernest's emitter, if you take it off his body
    this.laserBolts = [];

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      jump: 'SPACE',
      j: 'J',
      e: 'E',
      f: 'F',
      shift: 'SHIFT',
      enter: 'ENTER',
    });
    this.input.keyboard.addCapture(['SPACE', 'LEFT', 'RIGHT']);
    this.input.on('pointerdown', () => { this.pointerSlash = true; });

    this.cameras.main.setBounds(0, 0, L2.worldEnd + 200, 800);

    this.hint = this.add
      .text(GAME_W / 2, GAME_H - 22, '', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#5d6a78',
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(60);

    this.buildAttachSite();
    this.buildAtmosphere();
    // VESSEL rides along in your skull from here on (docs/chapter2-story.md §6).
    this.vessel = makeVesselVoice(this);
    // One take from L2-1: the prosthetic's cold glow fills the frame, then
    // recedes into the chamber — no black, the light IS the cut.
    const veil = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x9fd8e8, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: veil, alpha: 0, duration: 750, onComplete: () => veil.destroy() });
  }

  // ------------------------------------------------------------- atmosphere

  buildAtmosphere() {
    applyLens(this);
    // Ground mist — the deep places breathe.
    addFogBands(this, { count: 4, y0: 420, y1: 505, tint: 0x3fbf8e, alpha: 0.04, depth: 3, sf: 0.7 });
    // Steam vents along the run.
    [1020, 2600, 4300, 5700].forEach((sx) => {
      const gy = this.field.groundAt(sx);
      if (gy !== null) addSteam(this, { x: sx, y: gy - 6, depth: 3 });
    });
    // The crucible below the foundry shaft: a furnace glow you fall TOWARD.
    const glow = this.add
      .image(6045, 830, 'ch2-fx-glow')
      .setScale(7, 3)
      .setTint(0xff7a2c)
      .setAlpha(0.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1);
    this.tweens.add({ targets: glow, alpha: 0.62, scale: { from: 7, to: 8 }, duration: 2100, yoyo: true, repeat: -1 });
    addEmbers(this, { x: 6045, y: 780, spread: 190, depth: 2, frequency: 70 });
  }



  buildBackdrop() {
    // Underground dark, rust and green (SOMA palette, §7).
    const sky = this.add.graphics().setScrollFactor(0).setDepth(0);
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      sky.fillStyle(Phaser.Display.Color.GetColor(8 + 6 * t, 10 + 5 * t, 10 + 5 * t), 1);
      sky.fillRect(0, (GAME_H / 40) * i, GAME_W, GAME_H / 40 + 1);
    }

    // Pipe forest — parallax verticals.
    const pipes = this.add.graphics().setScrollFactor(0.35).setDepth(1);
    let x = -40;
    let seed = 29;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    while (x < 8000) {
      const w = 14 + rnd() * 30;
      pipes.fillStyle(rnd() < 0.3 ? 0x14201c : 0x10161d, 1);
      pipes.fillRect(x, 60 + rnd() * 120, w, 700);
      if (rnd() < 0.35) {
        pipes.fillStyle(0x1d2a26, 1);
        pipes.fillRect(x - 6, 200 + rnd() * 200, w + 12, 10); // flange
      }
      x += w + 30 + rnd() * 90;
    }

    // Emergency red washes.
    [1400, 3600, 5300].forEach((rx) => {
      const r = this.add
        .rectangle(rx, 300, 700, 420, 0x5c1216, 0.05)
        .setDepth(1);
      this.tweens.add({ targets: r, alpha: 0.55, duration: 900, yoyo: true, repeat: -1 });
    });
  }

  buildDecor() {
    const g = this.add.graphics().setDepth(2);

    // Culture pods with floating bodies (§4.5) — silhouettes, occasional bubbles.
    [800, 1750, 2950, 4050, 4900].forEach((px, i) => {
      g.fillStyle(0x0e1a16, 0.95);
      g.fillRoundedRect(px, 240, 60, 200, 10);
      g.fillStyle(0x1d3a2e, 0.6);
      g.fillRoundedRect(px + 5, 245, 50, 190, 8);
      // the thing inside
      g.fillStyle(0x27443e, 0.75);
      g.fillEllipse(px + 30, 330, 22, 34); // torso
      g.fillCircle(px + 30, 296, 10); // head
      g.fillEllipse(px + 18, 352, 8, 22); // limbs adrift
      g.fillEllipse(px + 42, 350, 8, 22);
      // Glass sheen, a pedestal, and a status LED that never agrees.
      g.fillStyle(0x9fd8e8, 0.09);
      g.fillRect(px + 10, 250, 7, 182);
      g.fillRect(px + 42, 258, 3, 150);
      g.fillStyle(0x0a0e12, 1);
      g.fillRect(px - 8, 440, 76, 14);
      g.fillStyle(0x1d2632, 1);
      g.fillRect(px - 8, 440, 76, 3);
      const led = this.add
        .image(px + 52, 446, 'ch2-mote')
        .setScale(0.5)
        .setTint(i % 2 ? 0x3fbf8e : 0xff3c46)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2);
      this.tweens.add({ targets: led, alpha: 0.15, duration: 700 + i * 170, yoyo: true, repeat: -1 });
      this.add
        .particles(px + 30, 420, 'ch2-mote', {
          speedY: { min: -40, max: -18 },
          speedX: { min: -4, max: 4 },
          lifespan: 2600,
          quantity: 1,
          frequency: 1400 + i * 300,
          scale: { min: 0.2, max: 0.5 },
          alpha: { start: 0.5, end: 0 },
          tint: 0x3fbf8e,
        })
        .setDepth(2);
    });

    // Limb piles as terrain dressing.
    [1150, 2350, 3850, 4650].forEach((lx) => {
      const gy = this.field.groundAt(lx) ?? 505;
      g.fillStyle(0x241d1b, 1);
      g.fillEllipse(lx, gy - 6, 70, 18);
      g.fillEllipse(lx - 20, gy - 12, 30, 12);
      g.fillEllipse(lx + 22, gy - 10, 26, 10);
      g.fillStyle(0x3a2e2a, 0.8);
      g.fillEllipse(lx - 8, gy - 14, 18, 7); // a pale forearm on top
    });

    // Hazard chevrons at every pit rim — the facility marked its own teeth.
    L2.gaps.forEach((gp) => {
      [gp.from - 4, gp.to + 4].forEach((ex) => {
        const gy = this.field.groundAt(ex);
        if (gy === null) return;
        for (let k = 0; k < 3; k++) {
          g.fillStyle(k % 2 ? 0x14181f : 0xd8a02c, 0.55);
          g.fillTriangle(ex - 13 + k * 9, gy - 1, ex - 5 + k * 9, gy - 1, ex - 9 + k * 9, gy - 9);
        }
      });
    });

    // Conveyor hooks with dangling arms (decor anim).
    [2050, 3350, 4550].forEach((hx, i) => {
      const arm = this.add.image(hx, 150, 'ch2-psy-limb').setOrigin(0.5, 0).setDepth(2).setAlpha(0.7).setScale(0.4);
      this.add.graphics().lineStyle(1, 0x2a3442, 1).setDepth(2).lineBetween(hx, 60, hx, 150);
      this.tweens.add({
        targets: arm,
        rotation: 0.35,
        duration: 2200 + i * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  /** Ceiling rigging and work lights: the depth cues of a working facility. */
  buildRigging() {
    const g = this.add.graphics().setDepth(2);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // Catenary cable spans sagging from the ceiling, hanger to hanger.
    for (let x0 = 160; x0 < L2.worldEnd - 320; x0 += 520 + rnd() * 280) {
      const span = 360 + rnd() * 180;
      const y = 58 + rnd() * 44;
      const sag = 26 + rnd() * 22;
      g.lineStyle(1, 0x232d3a, 0.9);
      g.beginPath();
      for (let t = 0; t <= 16; t++) {
        const u = t / 16;
        const cx = x0 + span * u;
        const cy = y + sag * 4 * u * (1 - u);
        if (t === 0) g.moveTo(cx, cy);
        else g.lineTo(cx, cy);
      }
      g.strokePath();
      g.fillStyle(0x2a3442, 1);
      g.fillRect(x0 - 2, y - 7, 4, 9);
      g.fillRect(x0 + span - 2, y - 7, 4, 9);
      // every third span drops a loose tail that sways
      if (rnd() < 0.33) {
        const tx = x0 + span * (0.3 + rnd() * 0.4);
        const tail = this.add.graphics().setDepth(2);
        tail.lineStyle(1, 0x232d3a, 1);
        tail.lineBetween(0, 0, 0, 60 + rnd() * 50);
        tail.fillStyle(0x39424e, 1);
        tail.fillCircle(0, 0, 2);
        tail.setPosition(tx, y + sag * 0.8);
        this.tweens.add({
          targets: tail,
          rotation: 0.18,
          duration: 2400 + rnd() * 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    // Valve wheels on the risers — maintenance was here, once.
    [1450, 3200, 5150].forEach((vx) => {
      const gy = (this.field.groundAt(vx) ?? 505) - 150;
      g.lineStyle(2, 0x39424e, 0.9);
      g.strokeCircle(vx, gy, 11);
      for (let a = 0; a < 4; a++) {
        const ang = (a * Math.PI) / 4;
        g.lineBetween(
          vx - Math.cos(ang) * 11, gy - Math.sin(ang) * 11,
          vx + Math.cos(ang) * 11, gy + Math.sin(ang) * 11,
        );
      }
      g.fillStyle(0x5c1216, 1);
      g.fillCircle(vx, gy, 3);
    });

    // Work lamps still burning over the shard fields — cones of dusty light.
    [750, 2100, 4150, 5700].forEach((lx, i) => {
      const gy = this.field.groundAt(lx);
      if (gy === null) return;
      addShaft(this, { x: lx, y: gy - 215, color: 0xd8b46b, alpha: 0.1, scaleX: 1.05, scaleY: 0.6, depth: 2 });
      const bulb = this.add
        .image(lx, gy - 214, 'ch2-mote')
        .setScale(0.9, 0.5)
        .setTint(0xd8b46b)
        .setAlpha(0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2);
      this.tweens.add({ targets: bulb, alpha: 0.25, duration: 1900 + i * 350, yoyo: true, repeat: -1 });
    });
  }

  buildAnchors() {
    this.anchorImgs = L2.anchors.map((a) => {
      const img = this.add.image(a.x, a.y, 'ch2-anchor').setDepth(3).setScale(0.4);
      const glow = this.add
        .image(a.x, a.y, 'ch2-mote')
        .setScale(5)
        .setTint(0x9fd8e8)
        .setAlpha(0.18)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2);
      this.tweens.add({ targets: glow, alpha: 0.34, duration: 1100, yoyo: true, repeat: -1 });
      return img;
    });
    // Aim cue: the ring E WOULD catch breathes before you commit, with a
    // dotted line from the shoulder — swinging should never be a guess.
    this.aimRing = this.add
      .image(0, 0, 'ch2-mote')
      .setTint(0xd8f4fc)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4)
      .setVisible(false);
    this.aimGfx = this.add.graphics().setDepth(2);
    // Claw lash line (E-yank / self-zip / execution reach) and its lifetime.
    this.lashGfx = this.add.graphics().setDepth(7);
    this.lashUntil = 0;
    this.lashTo = null;
  }

  buildShards() {
    this.shards = L2.shardSpots.map(([x, y]) => this.spawnShard(x, y, true));
  }

  spawnShard(x, y, idle = false) {
    const img = this.add.image(x, y, 'ch2-shard').setDepth(3).setScale(0.4);
    const s = { img, x, y, vx: 0, vy: 0, state: idle ? 'idle' : 'fall' };
    if (idle) this.tweens.add({ targets: img, y: y - 4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return s;
  }

  buildElevator() {
    // The lift stands on the high ledge (deck y 350) — the climb's payout.
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x0d1118, 1);
    g.fillRect(L2.elevatorX, 180, 110, 175);
    const rim = this.add.graphics().setDepth(3);
    rim.lineStyle(2, 0x9fd8e8, 0.9);
    rim.strokeRect(L2.elevatorX, 180, 110, 175);
    const spill = this.add
      .image(L2.elevatorX + 55, 260, 'ch2-mote')
      .setScale(18, 12)
      .setTint(0x9fd8e8)
      .setAlpha(0.12)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);
    this.tweens.add({ targets: spill, alpha: 0.26, duration: 1700, yoyo: true, repeat: -1 });
    this.add
      .text(L2.elevatorX + 55, 158, 'ASCENT →', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#9fd8e8',
      })
      .setOrigin(0.5, 1)
      .setDepth(3);
  }

  /** The foundry shaft: crucible glow below, cable runs, heat shimmer. */
  buildFoundry() {
    const g = this.add.graphics().setDepth(1);
    // Shaft cheeks falling away into the dark.
    g.fillStyle(0x0a0d13, 1);
    g.fillRect(5760, 505, 50, 300);
    g.fillRect(6280, 350, 40, 460);
    // Hazard paint on the shaft rims — the last warning before the drop.
    [[5762, 501], [6282, 346]].forEach(([rx, ry]) => {
      for (let k = 0; k < 4; k++) {
        g.fillStyle(k % 2 ? 0x14181f : 0xd8a02c, 0.65);
        g.fillRect(rx + k * 11, ry, 9, 4);
      }
    });
    g.lineStyle(2, 0x2a3442, 0.8);
    g.lineBetween(5810, 505, 5810, 790);
    g.lineBetween(6280, 350, 6280, 790);
    // Cable runs down the shaft.
    g.lineStyle(1, 0x1d2632, 1);
    for (let i = 0; i < 5; i++) {
      const cx = 5860 + i * 90;
      g.lineBetween(cx, 140, cx, 790);
    }
    // The crucible: a furnace heart far below the swing line.
    const crucible = this.add
      .image(6045, 760, 'ch2-mote')
      .setScale(60, 22)
      .setTint(0xff8a3c)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1);
    this.tweens.add({ targets: crucible, alpha: 0.38, scaleY: 26, duration: 1500, yoyo: true, repeat: -1 });
    // Heat shimmer rising off it.
    this.add
      .particles(6045, 740, 'ch2-mote', {
        x: { min: -220, max: 220 },
        speedY: { min: -90, max: -40 },
        speedX: { min: -8, max: 8 },
        lifespan: { min: 1200, max: 2400 },
        quantity: 1,
        frequency: 260,
        scale: { min: 0.3, max: 0.9 },
        alpha: { start: 0.35, end: 0 },
        tint: [0xff8a3c, 0xffc46b],
        blendMode: Phaser.BlendModes.ADD,
        emitting: true,
      })
      .setDepth(1);
  }

  buildLivesHud() {
    this.lifeImgs = [];
    for (let i = 0; i < AUG_TUNE.lives; i++) {
      const img = this.add
        .image(GAME_W - 20 - i * 22, 20, 'ch2-aug-body')
        .setScale(0.26)
        .setScrollFactor(0)
        .setDepth(60);
      this.lifeImgs.push(img);
    }
  }

  refreshLivesHud() {
    this.lifeImgs.forEach((img, i) => img.setAlpha(i < this.player.lives ? 1 : 0.15));
  }

  // --------------------------------------------------------- attach cutscene

  buildAttachSite() {
    // The torso rolls in from the left; the prosthetic waits where L2-1 ended.
    this.siteBlob = this.add.image(60, L2.ground - 15, 'ch2-blob').setDepth(5).setScale(0.5);
    this.siteProsthetic = this.add.image(360, L2.ground - 20, 'ch2-prosthetic').setDepth(4).setScale(0.4);
    this.siteGlow = this.add
      .image(360, L2.ground - 20, 'ch2-mote')
      .setScale(10)
      .setTint(0x9fd8e8)
      .setAlpha(0.25)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);
    this.tweens.add({ targets: this.siteGlow, alpha: 0.4, duration: 1100, yoyo: true, repeat: -1 });

    this.cameras.main.centerOn(260, 380);
    this.attachT0 = this.time.now + 600;
    this.attachStep = 0;
    this.hint.setText('');
  }

  updateAttach() {
    const t = this.time.now - this.attachT0;
    const b = this.siteBlob;
    if (this.attachStep === 0 && t > 0) {
      // The torso rolls itself the last meters — no input, no limbs.
      this.tweens.add({
        targets: b,
        x: 330,
        rotation: 4,
        duration: 1800,
        ease: 'Quad.easeOut',
      });
      this.attachStep = 1;
    } else if (this.attachStep === 1 && t > 2100) {
      // The metal unfolds and takes the body. Four rivets, four limbs.
      this.siteGlow.setAlpha(0.6);
      synthBuzz(this, { freq: 320, dur: 0.12, gain: 0.12 });
      this.attachStep = 2;
      this.attachRivets = 0;
      this.attachRivetAt = t;
    } else if (this.attachStep === 2) {
      const n = Math.floor((t - this.attachRivetAt) / 450);
      if (n > this.attachRivets && this.attachRivets < 4) {
        this.attachRivets++;
        synthBuzz(this, { freq: 180 + n * 40, dur: 0.1, gain: 0.14 });
        this.cameras.main.shake(60, 0.002);
        this.add
          .particles(360, L2.ground - 30, 'ch2-mote', {
            speed: { min: 60, max: 180 },
            lifespan: 350,
            quantity: 8,
            scale: { min: 0.3, max: 0.7 },
            tint: [0x9fd8e8, 0xd8f4fc],
            blendMode: Phaser.BlendModes.ADD,
            emitting: false,
          })
          .setDepth(6)
          .explode(8);
      }
      if (this.attachRivets >= 4 && t - this.attachRivetAt > 2100) {
        this.attachStep = 3;
        // Metal stands where flesh lay.
        this.siteBlob.setVisible(false);
        this.siteProsthetic.setVisible(false);
        this.siteGlow.setVisible(false);
        this.player = new AugPlayer(this, { x: 355, y: this.field.groundAt(355) }, this.field);
        this.cameras.main.startFollow(this.player.fig, true, 0.1, 0.1);
        this.cameras.main.setFollowOffset(0, 60);
        this.buildLivesHud();
        synthThud(this, { freq: 90, gain: 0.4, dur: 0.4 });
        this.cameras.main.flash(200, 159, 216, 232);
        this.attachStep = 4;
        this.attachDoneAt = t;
      }
    } else if (this.attachStep === 4 && t - this.attachDoneAt > 900) {
      this.phase = 'PLAY';
      this.hint.setText('A/D — move · SPACE — jump · SHIFT — rush · J / LMB — slash ×3 · E — claw · F — finish the broken');
      this.vessel.say('The metal suits you. The unit is… pleased.');
      if ((this.registry.get('ch2.limbs') || 0) >= 3) {
        this.vessel.say('You carried your limbs out in your teeth. Sentimental. The unit approves.');
      }
      this.spawnPsychos();
    }
  }

  spawnPsychos() {
    this.psychos.forEach((p) => p.destroy());
    this.psychos = L2.psychos.map((cfg) => new Psycho(this, cfg.x, this.field));
  }

  // ------------------------------------------------------------------- play

  readInput() {
    const k = this.keys;
    // E needs a true single-frame edge: JustDown's 50ms window spans ~3
    // frames, which would attach → detach → re-attach in one press.
    const eDown = k.e.isDown;
    const arm = eDown && !this.ePrev;
    this.ePrev = eDown;
    return {
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      jump: Phaser.Input.Keyboard.JustDown(k.jump),
      slash: Phaser.Input.Keyboard.JustDown(k.j) || this.consumePointerSlash(),
      arm,
      exec: Phaser.Input.Keyboard.JustDown(k.f),
      dash: Phaser.Input.Keyboard.JustDown(k.shift),
    };
  }

  consumePointerSlash() {
    const v = this.pointerSlash;
    this.pointerSlash = false;
    return !!v;
  }

  updatePlay(dt, now) {
    const p = this.player.p;

    // Hitstop: the world holds its breath (design §4.3 — 70ms per hit).
    if (now < this.hitstopUntil) return;

    const input = this.ernestState === 'speak'
      ? { left: false, right: false, jump: false, slash: false, arm: false, exec: false }
      : this.readInput();

    // Grapple arm overrides normal movement while active.
    if (this.armState) {
      this.updateArm(dt, now, input);
    } else {
      const wasDashing = now < this.player.dashUntil;
      if (input.jump && p.grounded) synthPing(this, { freq: 640, gain: 0.045, dur: 0.09 }); // servo kickoff
      const ev = this.player.step(dt, input, { worldEnd: L2.worldEnd });
      if (ev === 'land') {
        synthThud(this, { freq: 130, gain: 0.18, dur: 0.15 });
        this.player.landKick(this.player.lastLandImpact);
        this.dustPuff(p.x, p.y);
      } else if (ev === 'dashing' && !wasDashing) {
        this.dashFx(p);
      }
      if (input.slash) this.trySlash(now);
      if (input.exec) this.tryExecute(now);
      if (input.arm) this.startArm(now);
      // Feet on steel: every spool refills.
      if (p.grounded) L2.anchors.forEach((a) => { a.spentReel = false; });
    }
    this.player.animate(dt);
    this.updateAimCue(now);
    this.updateExecCues(now);
    this.updateLash(now);

    // Psychos.
    for (const psy of this.psychos) {
      if (!psy.alive) continue;
      // Ernest's poem holds the whole corridor still — nothing moves,
      // nothing can hit you mid-line.
      if (this.ernestState === 'speak') continue;
      const contact = psy.step(dt, p, now);
      if (contact && !this.player.hurt && !p.dead && this.ernestState !== 'speak') {
        this.hurtPlayer(psy);
      }
    }

    // Ernest.
    this.updateErnest(dt, now, input);

    // Shard magnetism — the parasite feeds.
    this.updateShards(dt);

    // Ernest's emitter: pickup and bolts.
    this.updateLaser(dt, now);

    // Void death.
    if (p.y > L2.killY && !p.dead) {
      p.dead = true;
      playVoidDeath(this, () => this.whipBack(() => this.respawn()));
    }

    // The elevator out — only from the deck, not a flyby through the void.
    if (p.x > L2.elevatorX - 30 && p.y > 290 && p.y < 500 && this.phase === 'PLAY') this.startEnd();
  }

  dustPuff(x, y) {
    this.add
      .particles(x, y - 2, 'ch2-mote', {
        speed: { min: 30, max: 90 },
        lifespan: 350,
        quantity: 6,
        scale: { min: 0.3, max: 0.6 },
        tint: 0x4a5563,
        emitting: false,
      })
      .setDepth(6)
      .explode(6);
  }

  /** SHIFT rush: whoosh, speed lines, a cold smear behind the body. */
  dashFx(p) {
    synthBuzz(this, { freq: 620, dur: 0.16, gain: 0.1 });
    this.add
      .particles(p.x, p.y - 32, 'ch2-mote', {
        speed: { min: 200, max: 420 },
        angle: p.dashDir > 0 ? { min: 160, max: 200 } : { min: -20, max: 20 },
        lifespan: { min: 150, max: 320 },
        quantity: 14,
        scale: { min: 0.4, max: 1 },
        tint: [0x9fd8e8, 0xd8f4fc, 0x5d6a78],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6)
      .explode(14);
    this.cameras.main.shake(70, 0.0018);

    // Afterimages: rebuild the pose from the part sprites, drop fading
    // ghosts behind the rush.
    const parts = this.player.parts;
    for (let i = 1; i <= 3; i++) {
      const ghost = this.add
        .container(p.x - p.dashDir * i * 26, p.y)
        .setScale(p.facing, 1)
        .setAlpha(0.42 - i * 0.1)
        .setDepth(4);
      for (const key of ['body', 'head', 'armL', 'armR', 'legL', 'legR']) {
        const src = parts[key];
        ghost.add(
          this.add
            .image(src.x, src.y, src.texture.key)
            .setOrigin(src.originX, src.originY)
            .setRotation(src.rotation)
            .setScale(src.scaleX, src.scaleY)
            .setTint(0x9fd8e8)
            .setBlendMode(Phaser.BlendModes.ADD),
        );
      }
      this.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 240 + i * 60,
        onComplete: () => ghost.destroy(true),
      });
    }
  }

  /** SPACE release at speed: the world streaks past, the lens punches. */
  releaseFx(p) {
    const deg = (Math.atan2(p.vy, p.vx) * 180) / Math.PI;
    this.add
      .particles(p.x, p.y - 36, 'ch2-mote', {
        speed: { min: 260, max: 520 },
        angle: { min: deg - 14, max: deg + 14 },
        lifespan: { min: 140, max: 300 },
        quantity: 16,
        scale: { min: 0.5, max: 1.2 },
        tint: [0xd8f4fc, 0x9fd8e8],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6)
      .explode(16);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.05,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  // ------------------------------------------------------------- laser gun

  /** Ernest's emitter hits the ground where he burst. */
  dropLaserGun(x, y) {
    const img = this.add.image(x, y - 16, 'ch2-lasergun').setDepth(4).setRotation(-0.4).setScale(0.4);
    const glow = this.add
      .image(x, y - 16, 'ch2-mote')
      .setScale(4)
      .setTint(0x9fd8e8)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);
    this.laserDrop = { img, glow, x, y: y - 16, vy: -160, state: 'fall' };
  }

  /** Pickup + bolt ballistics. */
  updateLaser(dt, now) {
    const d = this.laserDrop;
    if (d) {
      if (d.state === 'fall') {
        d.vy += 1500 * dt;
        d.y += d.vy * dt;
        const gy = this.field.groundAt(d.x);
        if (gy !== null && d.y >= gy - 8) {
          d.y = gy - 8;
          d.state = 'idle';
          d.img.setRotation(0);
        }
        d.img.setPosition(d.x, d.y);
        if (d.state === 'fall') d.img.rotation += 4 * dt;
      } else {
        d.img.setPosition(d.x, d.y + Math.sin(now / 350) * 2);
        d.glow.setPosition(d.x, d.y);
        d.glow.setAlpha(0.22 + 0.14 * Math.sin(now / 300));
        const p = this.player.p;
        if (!p.dead && Math.abs(p.x - d.x) < 42 && Math.abs(p.y - d.y) < 60) {
          d.img.destroy();
          d.glow.destroy();
          this.laserDrop = null;
          this.player.hasLaser = true;
          synthBuzz(this, { freq: 760, dur: 0.2, gain: 0.14 });
          this.hint.setText('A/D · SPACE · SHIFT · E — swing · J / LMB — ERNEST-7 (pierces)');
          const toast = this.add
            .text(GAME_W / 2, GAME_H - 260, "SALVAGED: prototype emitter 'ERNEST-7'", {
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: '14px',
              color: '#9fd8e8',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(70);
          this.tweens.add({
            targets: toast,
            alpha: 0,
            duration: 800,
            delay: 2400,
            onComplete: () => toast.destroy(),
          });
        }
      }
    }

    for (let i = this.laserBolts.length - 1; i >= 0; i--) {
      const b = this.laserBolts[i];
      b.x += b.vx * dt;
      b.img.setPosition(b.x, b.y);
      let dead = now > b.dieAt || b.x < 0 || b.x > L2.worldEnd;
      let killed = false;
      for (const t of this.psychos) {
        if (!t.alive || b.hit.has(t)) continue;
        if (Math.abs(t.p.x - b.x) < 22 && Math.abs(t.p.y - 30 - b.y) < 30) {
          b.hit.add(t);
          const res = t.takeHit(b.x - b.vx * 0.01);
          this.slashFeedback(t, res === 'dead');
          if (res === 'dead') {
            killed = true;
            this.onPsychoDead(t);
          }
        }
      }
      if (killed) {
        this.hitstopUntil = now + AUG_TUNE.killHitstopMs;
        this.slow = 0.35;
        setTimeout(() => {
          this.slow = 1;
        }, 150);
        this.tweens.add({
          targets: this.cameras.main,
          zoom: 1.06,
          duration: 80,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      } else if (b.hit.size > 0) {
        this.hitstopUntil = Math.max(this.hitstopUntil, now + AUG_TUNE.hitstopMs);
      }
      const gy = this.field.groundAt(b.x);
      if (gy !== null && b.y > gy - 2) dead = true;
      if (dead) {
        this.add
          .particles(b.x, b.y, 'ch2-mote', {
            speed: { min: 40, max: 160 },
            lifespan: 200,
            quantity: 6,
            scale: { min: 0.3, max: 0.6 },
            tint: [0xaefcff, 0x9fd8e8],
            blendMode: Phaser.BlendModes.ADD,
            emitting: false,
          })
          .setDepth(6)
          .explode(6);
        b.img.destroy();
        this.laserBolts.splice(i, 1);
      }
    }
  }

  /** J / LMB with the emitter: a piercing bolt, a kick back. */
  fireLaser(now) {
    const p = this.player.p;
    const fx = p.facing;
    const mx = p.x + fx * 30;
    const my = p.y - 34;
    const img = this.add
      .rectangle(mx, my, 34, 4, 0xaefcff, 0.95)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.laserBolts.push({ img, x: mx, y: my, vx: fx * 1500, dieAt: now + 500, hit: new Set() });
    this.add
      .particles(mx, my, 'ch2-mote', {
        speed: { min: 60, max: 220 },
        lifespan: 160,
        quantity: 8,
        scale: { min: 0.4, max: 0.9 },
        tint: [0xaefcff, 0x9fd8e8],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(7)
      .explode(8);
    if (p.grounded) p.vx -= fx * 60;
    else p.vx -= fx * 120;
    this.cameras.main.shake(50, 0.0012);
    synthBuzz(this, { freq: 1400, dur: 0.09, gain: 0.1 });
  }

  // ------------------------------------------------------------------- slash

  trySlash(now) {
    if (now < this.player.slashReadyAt) return;
    const p = this.player.p;
    // The emitter replaces the blade once salvaged.
    if (this.player.hasLaser) {
      this.player.slashReadyAt = now + AUG_TUNE.slashCooldown;
      this.fireLaser(now);
      return;
    }

    // Three-hit chain: cut → backhand → overhead finisher. Each press inside
    // the window raises the stage; letting it lapse starts the chain over.
    const c = this.combo || (this.combo = { stage: 0, windowUntil: 0 });
    const stage = now < c.windowUntil ? Math.min(c.stage + 1, 3) : 1;
    c.stage = stage;
    c.windowUntil = now + 620;
    this.player.slashReadyAt = now + [0, 230, 250, 470][stage];
    const fx = p.facing;

    // Attack momentum: the body commits harder with every stage.
    const lunge = [0, 12, 17, 26][stage];
    if (p.grounded) p.x += fx * lunge;
    else p.vx += fx * [0, 130, 165, 230][stage];

    // The sword arm swings — the combo owns its pose for a beat (aug.js).
    const armR = this.player.parts.armR;
    const swingMs = [0, 130, 130, 180][stage];
    this.player.armSwingUntil = now + swingMs + 90;
    armR.setRotation([0, -1.9, 1.7, -2.6][stage]);
    this.tweens.add({
      targets: armR,
      rotation: [0, 1.5, -2.0, 2.2][stage],
      duration: swingMs,
      ease: 'Quad.easeIn',
    });
    // The whole frame commits: a torso twist riding the swing.
    this.player.fig.setRotation(0);
    this.tweens.add({
      targets: this.player.fig,
      rotation: fx * [0, -0.09, 0.11, -0.15][stage],
      duration: swingMs,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // The blade's afterimage: a crescent that sweeps and dies — each stage
    // its own arc, the finisher burning hot.
    const cx = p.x + fx * (stage === 3 ? 42 : 36);
    const cy = stage === 3 ? p.y - 44 : p.y - 34;
    const baseRot = [0, fx * 0.15, fx * 2.6, fx * 1.2][stage];
    const sc = [0, 0.34, 0.38, 0.62][stage];
    const arc = this.add
      .image(cx, cy, 'ch2-crescent')
      .setDepth(7)
      .setScale(fx * sc, sc)
      .setRotation(baseRot)
      .setTint(stage === 3 ? 0xffd9a0 : 0xffffff);
    this.tweens.add({
      targets: arc,
      rotation: baseRot + fx * [0, 1.1, -1.2, 0.9][stage],
      alpha: 0,
      duration: stage === 3 ? 200 : 130,
      ease: 'Quad.easeOut',
      onComplete: () => arc.destroy(),
    });
    synthBuzz(this, { freq: [0, 900, 1150, 640][stage], dur: stage === 3 ? 0.14 : 0.08, gain: 0.07 });
    if (stage === 3) {
      // The finisher lands heavy: shockwave ring, dust, a beat of shake.
      const ring = this.add
        .ellipse(cx, cy, 170, 100, 0x9fd8e8, 0)
        .setStrokeStyle(3, 0x9fd8e8, 0.85)
        .setScale(0.12)
        .setDepth(7);
      this.tweens.add({
        targets: ring,
        scaleX: 1,
        scaleY: 1,
        alpha: 0,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
      this.cameras.main.shake(110, 0.005);
      this.dustPuff(p.x + fx * 30, p.y);
    }

    const reach = AUG_TUNE.slashReach + [0, 16, 22, 30][stage];
    const arcHalf = AUG_TUNE.slashArc + (stage === 3 ? 14 : 0);
    const targets = [...this.psychos.filter((s) => s.alive)];
    if (this.ernest && this.ernest.alive) targets.push(this.ernest);

    let anyKill = false;
    let anyHit = false;
    for (const t of targets) {
      const dx = (t.p.x - p.x) * fx;
      const dy = Math.abs((t.p.y - 30) - (p.y - 34));
      if (dx > 0 && dx < reach && dy < arcHalf) {
        let res = t.takeHit(p.x);
        if (res !== 'dead' && stage === 3) {
          res = t.takeHit(p.x); // finisher bites twice
          if (res !== 'dead') {
            // …and launches what survives it.
            t.p.vy = -330;
            t.p.vx *= 1.6;
            t.p.grounded = false;
          }
        }
        anyHit = true;
        this.slashFeedback(t, res === 'dead');
        if (res === 'dead') {
          anyKill = true;
          this.onPsychoDead(t);
        }
      }
    }
    // Chain counter — the only UI flourish the kill floor gets.
    if (anyHit && stage > 1) {
      const pop = this.add
        .text(p.x + fx * 44, p.y - 74, `x${stage}`, {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '15px',
          fontStyle: 'bold',
          color: stage === 3 ? '#ffd9a0' : '#9fd8e8',
        })
        .setOrigin(0.5)
        .setDepth(8);
      this.tweens.add({
        targets: pop,
        y: pop.y - 30,
        alpha: 0,
        duration: 520,
        ease: 'Quad.easeOut',
        onComplete: () => pop.destroy(),
      });
    }
    if (anyKill) {
      this.hitstopUntil = now + AUG_TUNE.killHitstopMs;
      // Slow-mo punch after the freeze: the world drags, the gore doesn't.
      this.slow = 0.35;
      setTimeout(() => {
        this.slow = 1;
      }, 150);
      // Zoom punch.
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.06,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    } else if (anyHit) {
      this.hitstopUntil = now + (stage === 3 ? AUG_TUNE.hitstopMs * 1.8 : stage === 2 ? AUG_TUNE.hitstopMs * 1.3 : AUG_TUNE.hitstopMs);
    }
  }

  /** Every slash that lands: the full feedback chain (design §4.3). */
  slashFeedback(target, killed) {
    const { x, y } = { x: target.p.x, y: target.p.y - 32 };
    this.cameras.main.shake(killed ? 190 : 90, killed ? 0.011 : 0.005);
    // Impact flash — a white-hot point where the blade met.
    const flash = this.add
      .image(x, y, 'ch2-mote')
      .setScale(killed ? 16 : 9)
      .setTint(0xd8f4fc)
      .setAlpha(0.8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: killed ? 26 : 14,
      duration: killed ? 220 : 140,
      onComplete: () => flash.destroy(),
    });
    // Metal tear: sawtooth sweep down + a low body thud on the kill.
    synthBuzz(this, { freq: killed ? 700 : 520, dur: killed ? 0.5 : 0.22, gain: killed ? 0.22 : 0.16 });
    if (killed) synthThud(this, { freq: 60, gain: 0.4, dur: 0.5 });
    // Blood AND sparks — flesh and metal in one body.
    this.add
      .particles(x, y, 'ch2-mote', {
        speed: { min: 100, max: killed ? 460 : 320 },
        lifespan: { min: 300, max: killed ? 900 : 700 },
        quantity: killed ? 44 : 22,
        scale: { min: 0.4, max: killed ? 1.7 : 1.2 },
        tint: [0x8e1f24, 0x5c1216, 0xffc46b, 0xff8a3c],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6)
      .explode(killed ? 44 : 22);
    // Killing feeds the parasite: the body drops shards.
    const drops = killed ? 2 : 1;
    for (let i = 0; i < drops; i++) {
      const s = this.spawnShard(x, y, false);
      s.vx = Phaser.Math.Between(-140, 140);
      s.vy = Phaser.Math.Between(-260, -120);
      this.shards.push(s);
    }
  }

  // ------------------------------------------------------------- execution (F)

  /**
   * A psycho at 1 hp is BROKEN — white-lit, swaying, marked with a floating
   * F. Step in close and press F: the claw punches through the chest and the
   * parasite rips the frame apart (design §4.3 — the kill floor's peak).
   */
  tryExecute(now) {
    const p = this.player.p;
    if (p.dead) return;
    let best = null;
    let bestD = 96;
    for (const t of this.psychos) {
      if (!t.alive || t.hp !== 1) continue;
      const d = Math.hypot(t.p.x - p.x, (t.p.y - 30) - (p.y - 34));
      if (d < bestD) {
        best = t;
        bestD = d;
      }
    }
    if (!best) return;
    // The reach: the claw visibly crosses the gap.
    this.lashTo = { x: best.p.x, y: best.p.y - 32 };
    this.lashUntil = now + 200;
    // The kill itself.
    const res = best.takeHit(p.x);
    if (res === 'dead') {
      // Slow the world to a crawl — longer than a slash kill.
      this.hitstopUntil = now + 240;
      this.slow = 0.25;
      setTimeout(() => {
        this.slow = 1;
      }, 340);
      this.cameras.main.shake(240, 0.014);
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.14,
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
      // Core burst: white-hot heart, then the red and the sparks.
      const x = best.p.x;
      const y = best.p.y - 32;
      const core = this.add
        .image(x, y, 'ch2-mote')
        .setScale(20)
        .setTint(0xd8f4fc)
        .setAlpha(0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(8);
      this.tweens.add({
        targets: core,
        alpha: 0,
        scale: 34,
        duration: 300,
        onComplete: () => core.destroy(),
      });
      this.add
        .particles(x, y, 'ch2-mote', {
          speed: { min: 140, max: 560 },
          lifespan: { min: 300, max: 1000 },
          quantity: 30,
          scale: { min: 0.4, max: 1.9 },
          tint: [0x8e1f24, 0x5c1216, 0xffc46b, 0xff8a3c],
          blendMode: Phaser.BlendModes.ADD,
          emitting: false,
        })
        .setDepth(6)
        .explode(30);
      // Executions pay out double salvage.
      for (let i = 0; i < 4; i++) {
        const s = this.spawnShard(x, y, false);
        s.vx = Phaser.Math.Between(-180, 180);
        s.vy = Phaser.Math.Between(-320, -140);
        this.shards.push(s);
      }
      synthBuzz(this, { freq: 900, dur: 0.6, gain: 0.24 });
      synthThud(this, { freq: 55, gain: 0.45, dur: 0.6 });
      this.onPsychoDead(best);
    }
  }

  /** Broken psychos blink white and wear a floating F — the invite. */
  updateExecCues(now) {
    for (const t of this.psychos) {
      if (!t.alive || t.hp !== 1) {
        if (t.execTag) {
          t.execTag.destroy();
          t.execTag = null;
        }
        continue;
      }
      const on = Math.floor(now / 150) % 2 === 0;
      Object.values(t.parts).forEach((img) => {
        if (on) img.setTintFill(0xffffff);
        else img.clearTint();
      });
      if (!t.execTag) {
        t.execTag = this.add
          .text(0, -78, 'F', {
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffd9a0',
          })
          .setOrigin(0.5);
        t.fig.add(t.execTag);
      }
      t.execTag.setAlpha(0.55 + 0.4 * Math.sin(now / 120));
    }
  }

  /** The claw's lash line — drawn while lashUntil lasts, then cleared. */
  updateLash(now) {
    this.lashGfx.clear();
    if (!this.lashTo || now > this.lashUntil || !this.player) return;
    const p = this.player.p;
    const fade = (this.lashUntil - now) / 200;
    this.lashGfx.lineStyle(3, 0x9fd8e8, 0.7 * fade);
    this.lashGfx.lineBetween(p.x, p.y - 40, this.lashTo.x, this.lashTo.y);
    this.lashGfx.lineStyle(1, 0xd8f4fc, 0.9 * fade);
    this.lashGfx.lineBetween(p.x, p.y - 40, this.lashTo.x, this.lashTo.y);
  }

  onPsychoDead(t) {
    // Third hit: the body comes apart — a gout of gibs, the corpse flung.
    this.add
      .particles(t.p.x, t.p.y - 30, 'ch2-gib', {
        speed: { min: 100, max: 420 },
        angle: { min: 200, max: 340 },
        gravityY: 1500,
        lifespan: 1400,
        quantity: 14,
        scale: 0.4,
        rotate: { min: -400, max: 400 },
        emitting: false,
      })
      .setDepth(6)
      .explode(14);
    synthThud(this, { freq: 80, gain: 0.35, dur: 0.35 });
    const dir = Math.sign(t.p.x - (t.lastHitFrom ?? this.player.p.x)) || 1;
    this.tweens.add({
      targets: t.fig,
      x: t.p.x + dir * 170,
      y: t.p.y - 90,
      rotation: dir * 2.6,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => t.fig.setVisible(false),
    });
    if (t === this.ernest) {
      // The world does not comment (design §4.4). It only remembers.
      this.registry.set('ch2.ernest', 'killed');
      this.ernestState = 'done';
      this.ernestDone = true;
      if (this.ernest.glowImg) {
        this.tweens.add({ targets: this.ernest.glowImg, alpha: 0, duration: 800 });
      }
      // What he carried falls where he burst. The poem has a price.
      // (Had he walked away and detonated himself, there would be nothing
      // left to salvage.)
      this.dropLaserGun(t.p.x, t.p.y);
    }
    if (t.execTag) {
      t.execTag.destroy();
      t.execTag = null;
    }
    if (t.glowImg) t.glowImg.setVisible(false);
  }

  // ------------------------------------------------------------- grapple arm

  /**
   * E — web-swing, not a winch (design §4.2, Spider-Man feel):
   * the claw auto-aims the nearest anchor in a generous radius; the rope
   * catches, momentum becomes a pendulum; A/D pumps the swing; the rope
   * reels in slowly so speed builds; SPACE releases with a kick, E drops.
   * Short-range E on a psycho still yanks it in.
   */
  /**
   * The anchor E would catch right now. Motion matters: an anchor ahead of
   * the swing wins over the one behind, so chains flow forward (Spider-Man
   * never re-grabs the web he just left).
   */
  bestAnchor(now) {
    const p = this.player.p;
    const sx = p.x;
    const sy = p.y - 40;
    let anchor = null;
    let anchorScore = Infinity;
    let anchorDist = 0;
    const mvx = Math.abs(p.vx) > 60 ? Math.sign(p.vx) : p.facing;
    for (const a of L2.anchors) {
      const d = Phaser.Math.Distance.Between(sx, sy, a.x, a.y);
      if (d >= AUG_TUNE.armReach) continue;
      // The web you just left is dead to you for a breath — no ratcheting
      // up the same cable.
      if (this.lastAnchor === a && now - this.lastAnchorAt < 900) continue;
      const ahead = (a.x - sx) * mvx;
      const score = d - Math.max(0, ahead) * 1.5;
      if (score < anchorScore) {
        anchor = a;
        anchorScore = score;
        anchorDist = d;
      }
    }
    return anchor ? { anchor, dist: anchorDist } : null;
  }

  /** Telegraph the catch: the in-range ring breathes, a dotted line aims. */
  updateAimCue(now) {
    const p = this.player.p;
    const found = !this.armState && !p.dead ? this.bestAnchor(now) : null;
    if (!found) {
      this.aimRing.setVisible(false);
      this.aimGfx.clear();
      return;
    }
    const { anchor } = found;
    const pulse = 0.5 + 0.5 * Math.sin(now / 130);
    this.aimRing
      .setVisible(true)
      .setPosition(anchor.x, anchor.y)
      .setScale(6 + pulse * 3)
      .setAlpha(0.22 + pulse * 0.3);
    // Dotted trajectory from the shoulder to the ring.
    this.aimGfx.clear();
    this.aimGfx.lineStyle(2, 0x9fd8e8, 0.35);
    const sx = p.x;
    const sy = p.y - 40;
    const dx = anchor.x - sx;
    const dy = anchor.y - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    for (let t = 26; t < len - 18; t += 22) {
      this.aimGfx.lineBetween(sx + ux * t, sy + uy * t, sx + ux * (t + 9), sy + uy * (t + 9));
    }
  }

  startArm(now) {
    const p = this.player.p;
    const sx = p.x;
    const sy = p.y - 40;

    const found = this.bestAnchor(now);
    const anchor = found ? found.anchor : null;
    const anchorDist = found ? found.dist : 0;

    // Fresh-out-of-a-swing the claw needs a beat to open again — otherwise
    // catch-release-catch at button speed is an elevator to orbit.
    if (anchor && now - this.lastAnchorAt < 250) return;

    if (anchor) {
      this.armState = {
        phase: 'swing',
        anchor,
        ropeLen: Math.max(80, anchorDist),
        // The winch pulls him up INTO the swing — Spider-Man zip, then arc.
        minLen: Math.max(70, anchorDist * 0.45),
        noReel: !!anchor.spentReel,
        t0: now,
      };
      anchor.spentReel = true;
      p.grounded = false;
      p.vy = Math.min(p.vy, -280); // he hops into the swing
      synthBuzz(this, { freq: 340, dur: 0.1, gain: 0.1 }); // the claw bites
      synthPing(this, { freq: 1850, gain: 0.09 }); // steel on steel
      synthWhir(this, { from: 180, to: 560, dur: 0.45, gain: 0.05 }); // the winch reels
      this.add
        .particles(anchor.x, anchor.y, 'ch2-mote', {
          speed: { min: 40, max: 140 },
          lifespan: 250,
          quantity: 8,
          scale: { min: 0.3, max: 0.6 },
          tint: [0x9fd8e8, 0xd8f4fc],
          blendMode: Phaser.BlendModes.ADD,
          emitting: false,
        })
        .setDepth(6)
        .explode(8);
      return;
    }

    // No anchor — is there meat in arm's length? Two ranges:
    // up close the claw drags the body IN; at mid-range it bites and the
    // parasite slingshots YOU across the gap, landing in slash range with
    // the prey staggered (design §4.2 — the claw is a combat verb too).
    let prey = null;
    let preyD = Infinity;
    for (const s of this.psychos) {
      if (!s.alive) continue;
      const d = Math.hypot(s.p.x - p.x, (s.p.y - 30) - (p.y - 34));
      if (d < 290 && d < preyD) {
        prey = s;
        preyD = d;
      }
    }
    if (prey) {
      this.lashTo = { x: prey.p.x, y: prey.p.y - 32 };
      this.lashUntil = now + 200;
      if (preyD <= 170) {
        prey.yankTo(p.x + Math.sign(prey.p.x - p.x || p.facing) * 42);
        this.add
          .particles(prey.p.x, prey.p.y - 32, 'ch2-mote', {
            speed: { min: 60, max: 200 },
            lifespan: 300,
            quantity: 10,
            scale: { min: 0.3, max: 0.7 },
            tint: [0xffc46b, 0x9fd8e8],
            blendMode: Phaser.BlendModes.ADD,
            emitting: false,
          })
          .setDepth(6)
          .explode(10);
        synthBuzz(this, { freq: 220, dur: 0.18, gain: 0.12 });
      } else {
        // The bite staggers at range; the recoil throws you at it.
        prey.state = 'stagger';
        prey.stateUntil = now + 700;
        const dir = Math.sign(prey.p.x - p.x) || p.facing;
        p.facing = dir;
        p.grounded = false;
        p.vx = dir * 760;
        p.vy = -190;
        this.hitstopUntil = Math.max(this.hitstopUntil, now + 60);
        this.add
          .particles(prey.p.x, prey.p.y - 32, 'ch2-mote', {
            speed: { min: 80, max: 240 },
            lifespan: 300,
            quantity: 14,
            scale: { min: 0.3, max: 0.8 },
            tint: [0x9fd8e8, 0xd8f4fc],
            blendMode: Phaser.BlendModes.ADD,
            emitting: false,
          })
          .setDepth(6)
          .explode(14);
        synthBuzz(this, { freq: 420, dur: 0.2, gain: 0.14 });
      }
      return;
    }

    // Whiff: the arm shoots out and comes back empty.
    this.armState = { phase: 'whiff', t0: now, dir: p.facing };
    synthBuzz(this, { freq: 260, dur: 0.12, gain: 0.08 });
  }

  updateArm(dt, now, input) {
    const p = this.player.p;
    const st = this.armState;
    const arm = this.player.arm;
    const T = AUG_TUNE;
    arm.setVisible(true);

    if (st.phase === 'swing') {
      const a = st.anchor;

      // Release: SPACE flings with a kick, E just lets go.
      if (input.jump || input.arm) {
        p.vx *= T.swingReleaseBoost;
        p.vy *= T.swingReleaseBoost;
        if (input.jump) p.vy -= T.swingJumpKick;
        // Terminal velocity on the exit too — compounding boosts orbit.
        const spOut = Math.hypot(p.vx, p.vy);
        if (spOut > 620) {
          p.vx *= 620 / spOut;
          p.vy *= 620 / spOut;
        }
        synthBuzz(this, { freq: 500, dur: 0.1, gain: 0.09 });
        if (input.jump) {
          const sp = Math.hypot(p.vx, p.vy);
          if (sp > 560) this.releaseFx(p);
        }
        this.lastAnchor = a;
        this.lastAnchorAt = now;
        this.armState = null;
        arm.setVisible(false);
        return;
      }

      // Pendulum: gravity, optional A/D pump along the tangent.
      p.vy += T.gravity * dt;
      let rx = p.x - a.x;
      let ry = p.y - 40 - a.y;
      let dist = Math.hypot(rx, ry) || 1;
      let pump = 0;
      if (input.left && !input.right) pump = -1;
      else if (input.right && !input.left) pump = 1;
      if (pump !== 0) {
        let tx = -ry / dist;
        let ty = rx / dist;
        if (tx * pump < 0) {
          tx = -tx;
          ty = -ty;
        }
        // Pump only feeds the swing, never brakes it — holding a direction
        // builds energy rhythm-free, like a web-swing should. But there is
        // a terminal swing: past it the pump just flutters the rope, so
        // orbit is impossible and anchors stay the only way UP.
        const spd = Math.hypot(p.vx, p.vy);
        const tv = p.vx * tx + p.vy * ty;
        if (tv > -60 && spd < 540) {
          p.vx += tx * T.swingPump * dt;
          p.vy += ty * T.swingPump * dt;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // The rope winches in fast — the zip that lifts him into the arc.
      // Only while he's BELOW the anchor, and only if this anchor's zip
      // hasn't been spent this airtime — otherwise catch-reel-catch is an
      // engine and the sky is reachable. Landing refills every spool.
      if (ry > 0 && !st.noReel) {
        st.ropeLen = Math.max(st.minLen, st.ropeLen - T.swingReel * dt);
      }

      // Rope constraint: clamp to the circle, kill outward radial velocity.
      rx = p.x - a.x;
      ry = p.y - 40 - a.y;
      dist = Math.hypot(rx, ry) || 1;
      if (dist > st.ropeLen) {
        const nx = rx / dist;
        const ny = ry / dist;
        p.x = a.x + nx * st.ropeLen;
        p.y = a.y + ny * st.ropeLen + 40;
        const vr = p.vx * nx + p.vy * ny;
        if (vr > 0) {
          p.vx -= vr * nx;
          p.vy -= vr * ny;
        }
      }
      p.x = Math.min(p.x, L2.worldEnd);

      // Touch down mid-swing: the run continues on foot. Grace window at
      // the catch — the zip needs a beat to lift him off the floor.
      const gy = this.field.groundAt(p.x);
      if (now - st.t0 > 320 && gy !== null && p.y >= gy && p.vy > 0) {
        p.y = gy;
        p.vy = 0;
        p.grounded = true;
        p.vx = 0;
        this.lastAnchor = a;
        this.lastAnchorAt = now;
        this.armState = null;
        arm.setVisible(false);
        synthThud(this, { freq: 130, gain: 0.18, dur: 0.15 });
        this.dustPuff(p.x, p.y);
        return;
      }

      // Draw the arm shoulder → anchor.
      arm.setPosition(p.x, p.y - 40);
      arm.setRotation(Math.atan2(a.y - (p.y - 40), a.x - p.x));
      arm.setFlipY(false);
      arm.setScale(dist / 60, 0.4);
      return;
    }

    if (st.phase === 'whiff') {
      const u = Math.min(1, (now - st.t0) / 220);
      const len = u < 0.5 ? u * 2 * 150 : (1 - u) * 2 * 150; // out, then back
      arm.setPosition(p.x, p.y - 40);
      arm.setRotation(st.dir < 0 ? Math.PI : 0);
      arm.setScale(Math.max(0.1, len) / 60, 0.4);
      if (u >= 1) {
        this.armState = null;
        arm.setVisible(false);
      }
    }
  }

  // ------------------------------------------------------------ shards feed

  updateShards(dt) {
    const p = this.player.p;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      if (s.state === 'fall') {
        s.vy += 1500 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const gy = this.field.groundAt(s.x);
        if (gy !== null && s.y >= gy - 4) {
          s.y = gy - 4;
          s.state = 'idle';
        }
        s.img.setPosition(s.x, s.y);
        s.img.rotation += 3 * dt;
      }
      const dx = p.x - s.x;
      const dy = p.y - 34 - s.y;
      const dist = Math.hypot(dx, dy);
      if (s.state === 'idle' && dist < 130) s.state = 'fly';
      if (s.state === 'fly') {
        const sp = 420 + (130 - Math.min(dist, 130)) * 6;
        s.x += (dx / dist) * sp * dt;
        s.y += (dy / dist) * sp * dt;
        s.img.setPosition(s.x, s.y);
        s.img.rotation += 8 * dt;
        if (dist < 14) {
          s.img.destroy();
          this.shards.splice(i, 1);
          this.absorbShard();
        }
      }
    }
  }

  absorbShard() {
    const n = this.player.absorb();
    synthBuzz(this, { freq: 300 + n * 12, dur: 0.06, gain: 0.06 });
    this.add
      .particles(this.player.p.x, this.player.p.y - 34, 'ch2-mote', {
        speed: { min: 20, max: 80 },
        lifespan: 300,
        quantity: 4,
        scale: { min: 0.3, max: 0.6 },
        tint: 0x9fd8e8,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6)
      .explode(4);
    // Growth stages (§5.1): scattered → half-covered → shoulder mound.
    if (n === L2.absorbStages.half || n === L2.absorbStages.shoulders) {
      const cluster = n === L2.absorbStages.half ? 6 : 5;
      for (let i = 0; i < cluster; i++) {
        const sx = n === L2.absorbStages.half ? -6 - Math.random() * 6 : -8 + Math.random() * 10;
        const sy = n === L2.absorbStages.half
          ? -44 + Math.random() * 22
          : -56 + Math.random() * 10; // shoulder mound
        const sh = this.add.image(sx, sy, 'ch2-shard');
        sh.setRotation(Math.random() * 6).setScale(0.44);
        this.player.shardLayer.add(sh);
      }
      synthThud(this, { freq: 110, gain: 0.2, dur: 0.3 });
      this.cameras.main.shake(80, 0.002);
      // The parasite notices its own growth (docs/chapter2-story.md §6).
      this.vessel.say(n === L2.absorbStages.half ? 'More. Bring it more.' : 'It grows. So do you.');
    }
  }

  // ------------------------------------------------------------ hurt & death

  hurtPlayer(psy) {
    const p = this.player.p;
    this.player.lives--;
    this.refreshLivesHud();
    this.player.invulnUntil = this.time.now + AUG_TUNE.invulnMs;
    p.vx = (p.x < psy.p.x ? -1 : 1) * 320;
    p.vy = -260;
    p.grounded = false;
    this.cameras.main.flash(150, 140, 20, 26);
    synthBuzz(this, { freq: 200, dur: 0.3, gain: 0.16 });
    this.add
      .particles(p.x, p.y - 32, 'ch2-mote', {
        speed: { min: 80, max: 280 },
        lifespan: { min: 300, max: 600 },
        quantity: 16,
        scale: { min: 0.4, max: 1 },
        tint: [0x8e1f24, 0xb03036],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6)
      .explode(16);

    if (this.player.lives <= 0) {
      p.dead = true;
      // Death by psycho (design §6): the thing is on top of him, the screen
      // pulses red, a metal arm flies past the lens — then the camera WHIPS
      // back to the section start. No black. The take never breaks.
      this.cameras.main.flash(400, 160, 20, 26);
      synthBuzz(this, { freq: 90, dur: 0.8, gain: 0.2 });
      const armImg = this.add
        .image(-40, 120, 'ch2-aug-arm')
        .setScale(1.2)
        .setRotation(0.8)
        .setScrollFactor(0)
        .setDepth(80);
      this.tweens.add({
        targets: armImg,
        x: GAME_W + 60,
        y: 300,
        rotation: 5,
        duration: 900,
        ease: 'Quad.easeIn',
      });
      this.add
        .particles(p.x, p.y - 30, 'ch2-mote', {
          speed: { min: 100, max: 400 },
          lifespan: { min: 400, max: 900 },
          quantity: 40,
          scale: { min: 0.5, max: 1.6 },
          tint: [0x8e1f24, 0x5c1216, 0xb03036],
          blendMode: Phaser.BlendModes.ADD,
          emitting: false,
        })
        .setDepth(6)
        .explode(40);
      // The frame comes apart: an arm, a leg, a scrap of the parasite arc
      // out of the burst and tumble back down.
      ['ch2-aug-arm', 'ch2-aug-leg', 'ch2-shard'].forEach((tex, i) => {
        const gib = this.add.image(p.x, p.y - 36, tex).setScale(0.4).setDepth(7);
        const dir = i % 2 ? -1 : 1;
        this.tweens.add({
          targets: gib,
          x: p.x + dir * (90 + i * 60),
          rotation: dir * (4 + i * 2),
          duration: 900,
          ease: 'Quad.easeOut',
        });
        this.tweens.add({
          targets: gib,
          y: p.y - 150 - i * 30,
          duration: 320,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: gib,
              y: p.y + 60,
              alpha: 0,
              duration: 500,
              ease: 'Quad.easeIn',
              onComplete: () => gib.destroy(),
            });
          },
        });
      });
      // Death drags time with it — then the zoom punches out.
      this.slow = 0.2;
      setTimeout(() => {
        this.slow = 1;
      }, 520);
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.12,
        duration: 300,
        hold: 200,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
      this.time.delayedCall(650, () => this.whipBack(() => this.respawn()));
    }
  }

  /**
   * One-take respawn: the camera tears back to the spawn point at speed —
   * streaks, a whoosh, a hard shake on arrival. Never a black frame.
   */
  whipBack(onArrive) {
    const cam = this.cameras.main;
    cam.stopFollow();
    const sx = L2.spawn.x + GAME_W / 2 - 200;
    const sy = 420;
    synthBuzz(this, { freq: 140, dur: 0.55, gain: 0.14 });
    // Speed lines against the pan direction.
    const streaks = this.add
      .particles(0, 0, 'ch2-mote', {
        x: { min: 0, max: GAME_W },
        y: { min: 0, max: GAME_H },
        speedX: { min: 900, max: 1600 },
        speedY: 0,
        lifespan: { min: 200, max: 420 },
        quantity: 3,
        frequency: 40,
        scale: { min: 0.3, max: 0.8 },
        alpha: { start: 0.5, end: 0 },
        tint: [0x3a4a5c, 0x5d6a78, 0x9fd8e8],
        blendMode: Phaser.BlendModes.ADD,
        emitting: true,
      })
      .setScrollFactor(0)
      .setDepth(85);
    cam.pan(sx, sy, 620, 'Cubic.easeInOut', true, () => {
      streaks.stop();
      this.time.delayedCall(300, () => streaks.destroy());
      cam.shake(120, 0.004);
      onArrive();
    });
  }

  respawn() {
    const p = this.player.p;
    p.x = L2.spawn.x;
    p.y = this.field.groundAt(L2.spawn.x);
    p.vx = 0;
    p.vy = 0;
    p.grounded = true;
    p.dead = false;
    this.player.lives = AUG_TUNE.lives;
    this.player.invulnUntil = this.time.now + 1500;
    this.refreshLivesHud();
    this.armState = null;
    this.player.arm.setVisible(false);
    // The world resets; what the parasite took, it keeps (shards stay).
    this.spawnPsychos();
    if (!this.ernestDone && this.ernestState !== 'idle') {
      // Ernest event rewinds if it never concluded.
      if (this.ernest) this.ernest.destroy();
      this.ernest = null;
      this.ernestState = 'idle';
      if (this.poemBox) this.poemBox.destroy(true);
    }
    const cam = this.cameras.main;
    cam.centerOn(p.x, 380);
    cam.startFollow(this.player.fig, true, 0.1, 0.1);
    cam.setFollowOffset(0, 60);
    // The body re-forms in a cold blink.
    cam.flash(140, 159, 216, 232);
    synthThud(this, { freq: 100, gain: 0.25, dur: 0.3 });
  }

  // ------------------------------------------------------------------ ernest

  updateErnest(dt, now, input) {
    const E = L2.ernest;
    const p = this.player.p;

    if (this.ernestState === 'idle') {
      if (p.x > E.triggerX && !this.ernestDone) {
        // A cold glow, hopping closer out of the dark — the only light in
        // the corridor (design §4.4).
        this.ernest = new Psycho(this, E.spawnX, this.field, {
          tint: 0xa8d4dc,
          oneLegged: true,
          glow: true,
        });
        this.ernestState = 'approach';
        this.ernestHopAt = 0;
      }
      return;
    }

    if (!this.ernest || !this.ernest.alive) return;
    const ep = this.ernest.p;

    if (this.ernestState === 'approach') {
      // Clumsy but relentless: hop — hop — hop. A rare smooth stumble, never
      // twice running, never on the first hops (read as character, not glitch).
      if (ep.grounded) {
        if (now >= this.ernestHopAt) {
          ep.grounded = false;
          ep.vy = -340;
          ep.vx = (p.x < ep.x ? -1 : 1) * 120;
          this.ernestHopAt = now + Phaser.Math.Between(480, 760);
          this.ernestHops = (this.ernestHops || 0) + 1;
          this.ernestStumble =
            this.ernestHops > 2 && !this.ernestStumbledLast && Math.random() < 0.12;
          this.ernestStumbledLast = this.ernestStumble;
        }
      } else {
        ep.vy += AUG_TUNE.gravity * dt;
        ep.x += ep.vx * dt;
        ep.y += ep.vy * dt;
        const gy = this.field.groundAt(ep.x);
        if (gy !== null && ep.y >= gy && ep.vy > 0) {
          ep.y = gy;
          ep.vy = 0;
          ep.grounded = true;
          ep.vx = 0;
          if (this.ernestStumble) {
            // knees buckle, he catches himself, gets back up — one motion
            // (rotation only: animate() owns fig position every frame)
            this.ernestStumble = false;
            synthThud(this, { freq: 100, gain: 0.12, dur: 0.2 });
            const fig = this.ernest.fig;
            this.tweens.add({
              targets: fig,
              rotation: -0.5 * this.ernest.facing,
              duration: 160,
              ease: 'Quad.easeOut',
              onComplete: () =>
                this.tweens.add({
                  targets: fig,
                  rotation: 0,
                  duration: 420,
                  delay: 380,
                  ease: 'Back.easeOut',
                }),
            });
          }
        }
      }
      this.ernest.facing = p.x < ep.x ? -1 : 1;
      this.ernest.animate(dt, now);
      // He reaches him — and just stops. The poem only comes if you stay.
      if (Math.abs(p.x - ep.x) < E.stopDist && ep.grounded) {
        this.ernestState = 'wait';
        this.ernestWaitSince = 0;
        this.ernest.facing = p.x < ep.x ? -1 : 1;
        this.ernest.fig.setScale(this.ernest.facing, 1);
      }
      return;
    }

    if (this.ernestState === 'wait') {
      // He stands dead still. Three seconds of company earns the poem.
      this.ernest.facing = p.x < ep.x ? -1 : 1;
      this.ernest.fig.setScale(this.ernest.facing, 1);
      this.ernest.animate(dt, now);
      const near = !p.dead && Math.abs(p.x - ep.x) < 140 && Math.abs(p.y - ep.y) < 70;
      if (near) {
        if (!this.ernestWaitSince) this.ernestWaitSince = now;
        const u = Math.min(1, (now - this.ernestWaitSince) / 3000);
        // His glow swells as he decides to trust you.
        if (this.ernest.glowImg) this.ernest.glowImg.setAlpha(0.3 + u * 0.35);
        if (u >= 1) {
          this.ernestState = 'speak';
          this.ernest.parts.head.setRotation(-0.3 * this.ernest.facing); // looks up
          this.vessel.say('Prohibited text. Muting recommended.');
          this.showPoem(now);
        }
      } else {
        this.ernestWaitSince = 0;
        if (this.ernest.glowImg) this.ernest.glowImg.setAlpha(0.3);
      }
      return;
    }

    if (this.ernestState === 'leave') {
      if (ep.grounded && now >= this.ernestHopAt) {
        ep.grounded = false;
        ep.vy = -320;
        ep.vx = 150;
        this.ernestHopAt = now + Phaser.Math.Between(420, 600);
      } else if (!ep.grounded) {
        ep.vy += AUG_TUNE.gravity * dt;
        ep.x += ep.vx * dt;
        ep.y += ep.vy * dt;
        const gy = this.field.groundAt(ep.x);
        if (gy !== null && ep.y >= gy && ep.vy > 0) {
          ep.y = gy;
          ep.vy = 0;
          ep.grounded = true;
          ep.vx = 0;
        }
      }
      // The dark takes him back, a few pixels of alpha at a time.
      if (ep.x > 3400) this.ernest.fig.setAlpha(Math.max(0, 1 - (ep.x - 3400) / 160));
      if (this.ernest.glowImg) {
        this.ernest.glowImg.setAlpha(Math.max(0, 0.3 - (ep.x - 3400) / 500));
        this.ernest.glowImg.setPosition(ep.x, ep.y - 32);
      }
      this.ernest.animate(dt, now);
      if (ep.x > E.exitX) {
        this.ernest.destroy();
        this.ernestState = 'done';
        this.ernestDone = true;
        this.registry.set('ch2.ernest', 'spared');
        // VESSEL flinches — the poem is a hole in its record (story §8).
        this.vessel.say('…the unit cannot retrieve the last 12 seconds. Report what you heard.');
        // Seconds later, far away: one muffled thump, one flash — out.
        this.time.delayedCall(2200, () => {
          synthThud(this, { freq: 40, gain: 0.3, dur: 1.2 });
          const flash = this.add
            .image(E.exitX + 80, 470, 'ch2-mote')
            .setScale(20)
            .setTint(0x9fd8e8)
            .setAlpha(0)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(3);
          this.tweens.add({
            targets: flash,
            alpha: 0.5,
            duration: 120,
            yoyo: true,
            onComplete: () => flash.destroy(),
          });
        });
      }
    }
  }

  showPoem(now) {
    // Third-person quote box: no speaker name, no role line (design §4.4).
    // The signature at the bottom-right is the only way his name is known.
    // Token: if the event resets (death mid-poem), the stale timers must
    // not hijack the next Ernest's state machine.
    const myErnest = this.ernest;
    const box = this.add.container(GAME_W / 2, GAME_H - 190).setDepth(70).setScrollFactor(0);
    this.poemBox = box;
    const bg = this.add.rectangle(0, 0, 680, 168, 0x05070c, 0.92).setStrokeStyle(1, 0x3a4a5c, 0.8);
    const t1 = this.add
      .text(-320, -64, '', { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#9fb4c4', fontStyle: 'italic' })
      .setOrigin(0, 0);
    const t2 = this.add
      .text(-320, -34, '', { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#9fb4c4', fontStyle: 'italic' })
      .setOrigin(0, 0);
    const t3 = this.add
      .text(-320, -4, '', { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#9fb4c4', fontStyle: 'italic' })
      .setOrigin(0, 0);
    const sig = this.add
      .text(320, 46, '—— Ernest', { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', color: '#7f8b99', fontStyle: 'italic' })
      .setOrigin(1, 0)
      .setAlpha(0);
    box.add([bg, t1, t2, t3, sig]);
    box.setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, duration: 500 });

    // Lines surface one by one.
    const lines = [t1, t2, t3];
    let li = 0;
    const typeNext = () => {
      if (li >= POEM.length) {
        this.tweens.add({ targets: sig, alpha: 1, duration: 700 });
        this.time.delayedCall(3400, () => {
          this.tweens.add({
            targets: box,
            alpha: 0,
            duration: 700,
            onComplete: () => box.destroy(true),
          });
          if (this.ernest !== myErnest) return; // stale poem, new Ernest
          if (this.ernest && this.ernest.alive) {
            this.ernest.parts.head.setRotation(0);
            this.ernest.facing = 1; // turns back the way he came
            this.ernest.fig.setScale(1, 1);
            this.ernestHopAt = this.time.now + 400;
            this.ernestState = 'leave';
          } else {
            this.ernestState = 'done';
          }
        });
        return;
      }
      const txt = lines[li];
      const full = POEM[li];
      li++;
      let ci = 0;
      const timer = this.time.addEvent({
        delay: 34,
        repeat: full.length - 1,
        callback: () => {
          ci++;
          txt.setText(full.slice(0, ci));
          if (ci >= full.length) this.time.delayedCall(420, typeNext);
        },
      });
    };
    this.time.delayedCall(600, typeNext);
  }

  // --------------------------------------------------------------------- end

  startEnd() {
    this.phase = 'END';
    const p = this.player.p;
    this.hint.setText('');
    this.registry.set('ch2.shards', this.player.shards);
    this.vessel.say('You are almost complete. Almost mine.');
    // He walks into the light; the metal carries him the last steps.
    this.tweens.add({
      targets: p,
      x: L2.elevatorX + 55,
      duration: 900,
      ease: 'Quad.easeOut',
      onUpdate: () => this.player.animate(1 / 60),
    });
    this.time.delayedCall(1100, () => this.riseToLevel23());
  }

  /**
   * One take up the shaft: the lift rises, pre-dawn light bleeds in from
   * above and swallows the frame — L2-3 opens inside the same light.
   */
  riseToLevel23() {
    if (this.advancing) return;
    this.advancing = true;
    const p = this.player.p;
    const cam = this.cameras.main;
    synthThud(this, { freq: 55, gain: 0.3, dur: 1.6 });
    synthWhir(this, { from: 70, to: 260, dur: 1.5, gain: 0.07 }); // the lift wakes
    cam.shake(1600, 0.002);
    // Cables and shaft walls streak past, downward.
    const streaks = this.add
      .particles(0, 0, 'ch2-mote', {
        x: { min: 0, max: GAME_W },
        y: { min: -20, max: GAME_H },
        speedY: { min: 500, max: 900 },
        speedX: 0,
        lifespan: { min: 300, max: 700 },
        quantity: 2,
        frequency: 60,
        scale: { min: 0.3, max: 0.7 },
        alpha: { start: 0.4, end: 0 },
        tint: [0x3a4a5c, 0x5d6a78],
        blendMode: Phaser.BlendModes.ADD,
        emitting: true,
      })
      .setScrollFactor(0)
      .setDepth(85);
    // The light from the surface grows — warm grey, not cold.
    const dawn = this.add
      .rectangle(GAME_W / 2, 0, GAME_W, GAME_H, 0x8a94b0, 0)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(90)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: dawn, alpha: 0.95, duration: 1500, ease: 'Quad.easeIn' });
    cam.pan(p.x, 260, 1500, 'Quad.easeIn', true, () => {
      streaks.destroy();
      this.scene.start('Level23');
    });
  }

  // ------------------------------------------------------------------ update

  update(_, deltaMs) {
    const dt = (Math.min(deltaMs, 50) / 1000) * this.slow;
    const now = this.time.now;

    switch (this.phase) {
      case 'ATTACH':
        this.updateAttach();
        break;
      case 'PLAY':
        this.updatePlay(dt, now);
        break;
    }
  }
}
