import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../../constants.js';
import {
  ROLL_TUNE,
  makeTorsoTextures,
  Heightfield,
  Torso,
  playVoidDeath,
  synthThud,
  synthBuzz,
} from './torso.js';
import { makeVesselVoice } from './vessel.js';
import { applyLens, addFogBands, addNeonSign, addShaft, addBeacon, addEmbers, addSteam } from './fx.js';
import { startAmbience } from './ambience.js';

/**
 * L2-1 「切除」 — THE UPGRADE, level one of three.
 *
 * Four acts, one scene (docs/chapter2-redesign.md §3):
 *   WALK  humanoid baseline, neon rooftop into the clinic (~20s)
 *   CS    the amputation cutscene — HUD abilities burn out one by one,
 *         explosion, the prosthetic is blown down into the dark
 *   ROLL1 collapse slopes with falling debris → floor hole
 *   SHAFT elevator-shaft freefall, beams to graze, body-bag cushion
 *   RAMP  the long downhill, full speed, ending at the cold metal glow
 *
 * Death = void only (design §3.3); gore sequence from torso.js; respawn at
 * the current act's start.
 */

// ------------------------------------------------------------------- layout

const WALK = {
  ground: 500,
  end: 2700, // door x — triggers the cutscene
  boxes: [
    { x0: 900, x1: 980, top: 460 },
    { x0: 1500, x1: 1590, top: 445 },
    { x0: 2050, x1: 2130, top: 465 },
  ],
  terminals: [
    {
      x: 500,
      lines: ['CONSENT FORM 88-C', 'subject waives claim', 'to original limbs.'],
    },
    {
      x: 1300,
      lines: ['AI bridge status: READY.', 'The AI is looking forward', 'to meeting you.'],
    },
  ],
};

const OR = { tableX: 3200, tableY: 462, roomL: 2850, roomR: 3750 };

const ROLL1 = {
  contour: [
    { x: 0, y: 1500 },
    { x: 350, y: 1500 }, // spawn pad
    { x: 900, y: 1740 }, // collapse slope 24°
    { x: 1150, y: 1785 }, // run-in keeps feeding speed into the bump
    { x: 1210, y: 1747 }, // debris bump — hop
    { x: 1270, y: 1785 },
    { x: 1700, y: 2050 }, // steeper
    { x: 1800, y: 2120 },
    // PIT 1900–2040: hop or die
    { x: 2100, y: 2130 },
    { x: 2600, y: 2290 }, // 25° runout
    { x: 2860, y: 2300 },
    // FLOOR HOLE 2870–3050: the way down — exits to the shaft
  ],
  gaps: [
    { from: 1900, to: 2040 },
    // FLOOR HOLE 2870→worldEdge: the only way on is DOWN. No far lip to hop
    // onto — overshoot and you still fall into the shaft, never beach on a
    // phantom floor past the hole.
    { from: 2870, to: 3400, exit: true },
  ],
  killY: 2750,
  spawn: { x: 120, y: 1500 - ROLL_TUNE.radius },
  exitX: 2870,
};

const SHAFT = {
  wallL: 4200,
  wallR: 4600,
  top: 2350,
  cushionY: 5000,
  beams: [
    { x0: 4200, x1: 4470, y: 2780 },
    { x0: 4330, x1: 4600, y: 3140 },
    { x0: 4200, x1: 4440, y: 3520 },
    { x0: 4360, x1: 4600, y: 3900 },
    { x0: 4200, x1: 4460, y: 4300 },
    { x0: 4340, x1: 4600, y: 4640 },
  ],
};

const RAMP = {
  contour: [
    { x: 7460, y: 4100 }, // vent-stack crown — the climb pays out here
    { x: 7700, y: 4130 },
    { x: 8300, y: 4430 }, // 28° — speed comes back
    { x: 8900, y: 4680 },
    { x: 9050, y: 4710 },
    { x: 9110, y: 4672 }, // rubble bump — hop
    { x: 9170, y: 4710 },
    // PIT 9450–9590: hop or die
    { x: 9650, y: 4750 },
    { x: 10100, y: 4860 }, // long runout
    { x: 10600, y: 4890 }, // flattens — the glow is near
    { x: 11050, y: 4890 },
  ],
  gaps: [{ from: 9450, to: 9590 }],
  killY: 5400,
  spawn: { x: 7500, y: 4100 - ROLL_TUNE.radius },
  worldEnd: 11000,
  prostheticX: 10780,
  endTriggerX: 10350,
  endGroundY: 4890,
};

// The collapse chase: a corridor the building eats behind you (§6.1).
const CHASE = {
  contour: [
    { x: 4300, y: 5050 }, // cushion lip
    { x: 4700, y: 5060 },
    { x: 5200, y: 5060 },
    { x: 5260, y: 5022 }, // instrument cabinet — hop
    { x: 5320, y: 5060 },
    { x: 5800, y: 5060 },
    { x: 5860, y: 5022 }, // gurney — hop
    { x: 5920, y: 5060 },
    { x: 6400, y: 5060 },
    { x: 6460, y: 5022 }, // cabinet — hop
    { x: 6520, y: 5060 },
    { x: 7100, y: 5090 }, // the floor simply ends — the vent slot gapes
    { x: 7320, y: 4100 }, // (inside the slot gap) — the stack's crown
    { x: 7460, y: 4100 },
  ],
  gaps: [{ from: 7101, to: 7319 }], // the slot: cling or fall
  killY: 5260,
  spawn: { x: 4520, y: 5050 - ROLL_TUNE.radius },
  worldEnd: 7450,
  collapseStartX: 4180,
  collapseSpeed: 238,
  jars: [
    { x: 5450, limb: 'ch2-hu-arm', label: 'your right arm' },
    { x: 6120, limb: 'ch2-hu-leg', label: 'your left leg' },
    { x: 6780, limb: 'ch2-hu-leg', label: 'your right leg' },
  ],
};

// The vent slot: two faces, 220px apart, zigzag up (§6.1 splat-climb).
const CLIMB = {
  faceL: 7100, // corridor's cut face — cling while moving left
  topL: 4150,
  faceR: 7320, // vent stack's face — cling while moving right
  topR: 4100,
  bottom: 5340, // faces end; below this is the drop
  killY: 5620,
  exitY: 4130, // above the stack's crown…
  exitX: 7380, // …and past its face = out
  vaultVy: -780,
  vaultVx: 400,
};

const PROMPTS = [
  { key: 'SPACE', label: 'SPACE — jump' },
  { key: 'A', label: 'A — left' },
  { key: 'D', label: 'D — right' },
  { key: 'E', label: 'E — interact' },
];

export default class Level21Scene extends Phaser.Scene {
  constructor() {
    super('Level21');
  }

  create() {
    this.phase = 'WALK';
    makeTorsoTextures(this);
    startAmbience(this, 'city');
    this.buildTextures();
    this.buildSkyline();
    this.buildPropaganda();
    this.buildWalkWorld();
    this.buildHumanoid();
    this.buildPromptChips();
    this.buildOrSet();
    // The surgical lamp's cone over the table — the last light he sees as meat.
    addShaft(this, { x: OR.tableX, y: 150, color: 0xcfe8f2, alpha: 0.14, scaleX: 1.5, scaleY: 0.9, depth: 3.5 });

    this.vessel = makeVesselVoice(this); // story bible §5: customer-service register
    this.vesselSaid = new Set();

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      jump: 'SPACE',
      e: 'E',
      enter: 'ENTER',
    });
    this.input.keyboard.addCapture(['SPACE', 'LEFT', 'RIGHT']);

    this.cameras.main.setBounds(0, 0, WALK.end + 200, GAME_H);
    this.cameras.main.startFollow(this.figure, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(0, 40);
    // From the menu: the lens dives out of the skyline onto the rooftop.
    this.cameras.main.setZoom(1.7);
    this.tweens.add({ targets: this.cameras.main, zoom: 1, duration: 800, ease: 'Quad.easeOut' });

    // The lens: vignette + bloom, over every act of the level.
    applyLens(this);

    this.hint = this.add
      .text(GAME_W / 2, GAME_H - 22, '', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#5d6a78',
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(60);
  }

  // --------------------------------------------------------------- textures

  buildTextures() {
    const g = this.make.graphics({ add: false });

    // Humanoid: dark silhouette body parts with a cold rim — limbs are
    // separate textures because the cutscene takes them one by one.
    // Baked at 2.5x, drawn at 0.4.
    const BODY = 0x232b36;
    const BODY_LO = 0x151a22;
    const BODY_HI = 0x36404e;
    const RIM = 0x7fd4e8;
    const SKIN = 0xa08a83;
    // body: a cheap rain coat — collar, zip line, belt shadow
    g.fillStyle(BODY, 1);
    g.fillRoundedRect(0, 0, 35, 65, 9);
    g.fillStyle(BODY_LO, 0.85);
    g.fillRoundedRect(24, 2, 10, 61, 5);
    g.fillStyle(BODY_HI, 0.7);
    g.fillRoundedRect(3, 3, 10, 26, 4);
    // collar
    g.fillStyle(BODY_LO, 1);
    g.fillTriangle(4, 0, 14, 0, 9, 8);
    g.fillTriangle(31, 0, 21, 0, 26, 8);
    // zip line
    g.lineStyle(1.6, BODY_LO, 0.9);
    g.lineBetween(17, 6, 17, 60);
    g.lineStyle(1, BODY_HI, 0.7);
    g.lineBetween(18.5, 6, 18.5, 60);
    // belt shadow
    g.fillStyle(BODY_LO, 0.8);
    g.fillRect(2, 46, 31, 5);
    // cold rim
    g.lineStyle(2, RIM, 0.55);
    g.lineBetween(2, 6, 2, 58);
    g.generateTexture('ch2-hu-body', 35, 65);
    g.clear();

    // head: hair, pale face edge, one calm eye — the AI is already watching
    g.fillStyle(BODY, 1);
    g.fillCircle(15, 15, 15);
    g.fillStyle(SKIN, 0.85);
    g.fillCircle(18, 17, 9); // face catching the clinic's light
    g.fillStyle(BODY, 1);
    g.fillCircle(12, 10, 11); // hair mass over the top
    g.fillStyle(BODY_HI, 0.6);
    g.fillCircle(10, 7, 4);
    g.fillStyle(0x9fd8e8, 0.9);
    g.fillCircle(20, 15, 2.2);
    g.lineStyle(1.6, RIM, 0.5);
    g.beginPath();
    g.arc(15, 15, 13.5, Math.PI * 0.8, Math.PI * 1.5);
    g.strokePath();
    g.generateTexture('ch2-hu-head', 30, 30);
    g.clear();

    // arm: coat sleeve + pale hand
    g.fillStyle(BODY, 1);
    g.fillRoundedRect(0, 0, 13, 40, 4);
    g.fillStyle(BODY_LO, 0.7);
    g.fillRoundedRect(8, 1, 5, 38, 2);
    g.lineStyle(1.6, RIM, 0.45);
    g.lineBetween(2, 2, 2, 34);
    g.fillStyle(SKIN, 1);
    g.fillCircle(6.5, 37, 4.5); // hand
    g.generateTexture('ch2-hu-arm', 13, 40);
    g.clear();

    // leg: trouser + shoe
    g.fillStyle(BODY, 1);
    g.fillRoundedRect(0, 0, 15, 45, 4);
    g.fillStyle(BODY_LO, 0.75);
    g.fillRoundedRect(9, 1, 6, 43, 2);
    g.lineStyle(1.6, RIM, 0.45);
    g.lineBetween(2, 2, 2, 40);
    g.fillStyle(BODY_LO, 1);
    g.fillRoundedRect(0, 40, 15, 5, 2); // shoe
    g.fillStyle(BODY_HI, 0.8);
    g.fillRect(1, 40, 13, 1.6);
    g.generateTexture('ch2-hu-leg', 15, 45);
    g.clear();

    // Falling debris chunk: jagged concrete with rebar shadow.
    g.fillStyle(0x2a2f38, 1);
    g.beginPath();
    g.moveTo(1, 4);
    g.lineTo(6, 0);
    g.lineTo(14, 2);
    g.lineTo(18, 8);
    g.lineTo(15, 14);
    g.lineTo(4, 13);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x4a5563, 0.8);
    g.lineBetween(3, 5, 12, 4);
    g.generateTexture('ch2-chunk', 18, 14);
    g.clear();

    // Shaft crossbeam.
    g.fillStyle(0x1d232c, 1);
    g.fillRect(0, 0, 64, 10);
    g.lineStyle(1, 0x46525f, 1);
    g.lineBetween(0, 1, 64, 1);
    g.generateTexture('ch2-beam', 64, 10);
    g.clear();

    // Body bag: the soft thing that saves you at the shaft bottom.
    g.fillStyle(0x22261f, 1);
    g.fillRoundedRect(0, 0, 46, 16, 7);
    g.fillStyle(0x333930, 0.8);
    g.fillRoundedRect(3, 2, 40, 5, 3);
    g.lineStyle(1, 0x4a5244, 0.7);
    g.lineBetween(10, 1, 10, 15); // zipper
    g.generateTexture('ch2-bag', 46, 16);
    g.clear();

    // The prosthetic: a folded humanoid frame crouched on itself — cowled
    // head, plate torso, limbs tucked in, the AI core burning at the
    // sternum. Baked 2.5x; every call site renders it at 0.4.
    {
      const M = 0x39424e;
      const D = 0x232b36;
      const C = 0x9fd8e8;
      // tucked legs
      g.fillStyle(D, 1);
      g.fillRoundedRect(22, 70, 14, 26, 5);
      g.fillRoundedRect(39, 70, 14, 26, 5);
      g.fillStyle(M, 1);
      g.fillRoundedRect(25, 75, 9, 17, 4);
      g.fillRoundedRect(42, 75, 9, 17, 4);
      // plate torso
      g.fillStyle(M, 1);
      g.beginPath();
      g.moveTo(22, 26);
      g.lineTo(53, 26);
      g.lineTo(60, 55);
      g.lineTo(50, 74);
      g.lineTo(25, 74);
      g.lineTo(15, 55);
      g.closePath();
      g.fillPath();
      // folded arms hugging the chest
      g.fillStyle(D, 1);
      g.fillRoundedRect(12, 34, 14, 30, 6);
      g.fillRoundedRect(49, 34, 14, 30, 6);
      g.fillStyle(M, 1);
      g.fillRoundedRect(15, 39, 9, 21, 4);
      g.fillRoundedRect(51, 39, 9, 21, 4);
      // cowled head
      g.fillStyle(D, 1);
      g.fillRoundedRect(27, 3, 21, 22, 7);
      g.fillStyle(M, 1);
      g.fillRoundedRect(30, 6, 15, 16, 5);
      g.fillStyle(C, 0.9);
      g.fillRect(33, 12, 9, 2); // visor slit
      // seams and the core
      g.lineStyle(1.5, C, 0.85);
      g.lineBetween(22, 30, 53, 30);
      g.lineBetween(37, 30, 37, 66);
      g.fillStyle(C, 1);
      g.fillCircle(37, 44, 6);
      g.fillStyle(0xd8f4fc, 1);
      g.fillCircle(37, 44, 2.6);
      g.generateTexture('ch2-prosthetic', 75, 100);
      g.clear();
    }

    // Terminal screen.
    g.fillStyle(0x0a0f0c, 1);
    g.fillRoundedRect(0, 0, 34, 44, 3);
    g.fillStyle(0x12261a, 1);
    g.fillRect(3, 3, 28, 30);
    g.lineStyle(1, 0x2fbf71, 0.8);
    for (let i = 0; i < 4; i++) g.lineBetween(5, 8 + i * 6, 5 + 18 + (i % 2) * 6, 8 + i * 6);
    g.generateTexture('ch2-terminal', 34, 44);
    g.clear();

    // Specimen jar: your own limb, floating in preservative green (§6.1).
    g.fillStyle(0x0e1a1c, 0.95);
    g.fillRoundedRect(0, 0, 28, 44, 4);
    g.fillStyle(0x27443e, 0.55);
    g.fillRect(3, 6, 22, 33); // fluid
    g.fillStyle(0x6b5a54, 0.9);
    g.fillRoundedRect(10, 12, 8, 22, 3); // the limb, adrift
    g.fillStyle(0x39424e, 1);
    g.fillRect(0, 0, 28, 5);
    g.fillRect(0, 39, 28, 5); // caps
    g.lineStyle(1, 0x9fd8e8, 0.5);
    g.lineBetween(4, 8, 4, 36); // glass sheen
    g.generateTexture('ch2-jar', 28, 44);
    g.destroy();
  }

  // --------------------------------------------------- walk act: neon world

  buildSkyline() {
    // Night gradient.
    const sky = this.add.graphics().setScrollFactor(0).setDepth(0);
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      sky.fillStyle(Phaser.Display.Color.GetColor(10 + 8 * t, 8 + 10 * t, 26 + 14 * t), 1);
      sky.fillRect(0, (GAME_H / 40) * i, GAME_W, GAME_H / 40 + 1);
    }

    // Far towers with lit windows — parallax 0.15.
    const far = this.add.graphics().setScrollFactor(0.15).setDepth(1);
    let x = -60;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const beaconSpots = [];
    while (x < 3600) {
      const w = 90 + rnd() * 140;
      const h = 180 + rnd() * 240;
      far.fillStyle(0x0c1020, 1);
      far.fillRect(x, 500 - h, w, h);
      for (let wy = 500 - h + 12; wy < 490; wy += 16) {
        for (let wx = x + 8; wx < x + w - 8; wx += 14) {
          if (rnd() < 0.22) {
            const neon = rnd();
            far.fillStyle(neon < 0.12 ? 0xff2d78 : neon < 0.3 ? 0x27e0f5 : 0x3a4a66, 0.9);
            far.fillRect(wx, wy, 5, 7);
          }
        }
      }
      if (h > 330 && rnd() < 0.6) beaconSpots.push({ x: x + w / 2, y: 500 - h - 4 });
      x += w + 20 + rnd() * 60;
    }
    // Aviation beacons pulse over the towers — the city never sleeps, it charges.
    beaconSpots.slice(0, 5).forEach((b, i) => addBeacon(this, { x: b.x, y: b.y, sf: 0.15, period: 2200 + i * 500 }));

    // Mid towers, closer and darker, with bigger windows and neon edge
    // strips — parallax 0.42, so the skyline has a middle to read against.
    const mid = this.add.graphics().setScrollFactor(0.42).setDepth(1.5);
    x = -120;
    seed = 97;
    while (x < 5200) {
      const w = 120 + rnd() * 170;
      const h = 240 + rnd() * 260;
      mid.fillStyle(0x080b13, 1);
      mid.fillRect(x, 500 - h, w, h);
      for (let wy = 500 - h + 16; wy < 490; wy += 22) {
        for (let wx = x + 10; wx < x + w - 10; wx += 18) {
          if (rnd() < 0.16) {
            const neon = rnd();
            mid.fillStyle(neon < 0.1 ? 0xff2d78 : neon < 0.28 ? 0x27e0f5 : neon < 0.4 ? 0xffc98a : 0x2a3648, 0.95);
            mid.fillRect(wx, wy, 8, 10);
          }
        }
      }
      // edge strip: one face of the tower burns a single color
      if (rnd() < 0.5) {
        const strip = rnd() < 0.5 ? 0xff2d78 : 0x27e0f5;
        mid.fillStyle(strip, 0.55);
        mid.fillRect(rnd() < 0.5 ? x : x + w - 3, 500 - h, 3, h * (0.4 + rnd() * 0.5));
      }
      if (h > 380 && rnd() < 0.5) beaconSpots.push({ x: x + w / 2, y: 500 - h - 4 });
      x += w + 30 + rnd() * 110;
    }
    beaconSpots.slice(5, 9).forEach((b, i) => addBeacon(this, { x: b.x, y: b.y, sf: 0.42, period: 3000 + i * 700 }));

    // Two searchlights sweep the smog — slow, indifferent.
    [0.9, 2.6].forEach((sx, i) => {
      const beam = addShaft(this, {
        x: GAME_W * sx * 0.5,
        y: -20,
        color: 0x8a99b8,
        alpha: 0.05,
        scaleX: 2.4,
        scaleY: 2,
        depth: 1.2,
        angle: 0.5 + i * 0.6,
      }).setScrollFactor(0.3);
      this.tweens.add({
        targets: beam,
        angle: -(0.4 + i * 0.5),
        duration: 14000 + i * 5000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });

    // Clinic sign — where he is walking to.
    const sign = this.add
      .text(2380, 250, 'NEW BODY\nCLINIC', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '30px',
        color: '#27e0f5',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0.55)
      .setDepth(1)
      .setAlpha(0.85);
    this.tweens.add({
      targets: sign,
      alpha: { from: 0.85, to: 0.35 },
      duration: 90,
      yoyo: true,
      repeat: -1,
      repeatDelay: 2400,
    });

    // Rain — two depths: the far drizzle…
    this.add
      .particles(0, 0, 'ch2-mote', {
        x: { min: -20, max: GAME_W + 20 },
        y: { min: -40, max: -10 },
        speedY: { min: 520, max: 760 },
        speedX: { min: -60, max: -30 },
        scaleX: 0.16,
        scaleY: { min: 1.6, max: 3 },
        alpha: { start: 0.28, end: 0.1 },
        lifespan: 1400,
        frequency: 26,
        tint: 0x6a7f96,
      })
      .setScrollFactor(0)
      .setDepth(40);
    // …and the near sheet, longer and faster, that streaks past the lens.
    this.add
      .particles(0, 0, 'ch2-mote', {
        x: { min: -30, max: GAME_W + 30 },
        y: { min: -60, max: -20 },
        speedY: { min: 900, max: 1250 },
        speedX: { min: -110, max: -60 },
        scaleX: 0.12,
        scaleY: { min: 3.5, max: 6 },
        alpha: { start: 0.22, end: 0.05 },
        lifespan: 900,
        frequency: 60,
        tint: 0x8fa4bc,
      })
      .setScrollFactor(0)
      .setDepth(41);

    // Ground mist crawling over the rooftop.
    addFogBands(this, { count: 3, y0: WALK.ground - 70, y1: WALK.ground - 8, tint: 0x5d7089, alpha: 0.05, depth: 3, sf: 0.8 });

    // Wet concrete: the skyline's neon catches in the rooftop's skin.
    this.add
      .image(WALK.end / 2, WALK.ground + 8, 'ch2-fx-glow')
      .setScale(WALK.end / 34, 1.6)
      .setTint(0x3a5a78)
      .setAlpha(0.07)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2.5);
  }

  /**
   * The regime's voice on the skyline (story bible §7): holographic
   * propaganda boards hanging over the walk to the clinic. The last thing
   * he reads with his own eyes.
   */
  buildPropaganda() {
    const boards = [
      {
        x: 620,
        y: 200,
        sf: 0.42,
        color: '#ff5560',
        glow: 0xb03036,
        lines: 'PAIN IS FAULT\nFLESH IS PRISON\nUPGRADE IS FREEDOM',
        size: 22,
      },
      {
        x: 1620,
        y: 170,
        sf: 0.5,
        color: '#6ff0ff',
        glow: 0x27e0f5,
        lines: 'Still enduring your body?\nYou are not alone. Soon, no one will have to.\n— REFERENDUM RESULT: 81.4% IN FAVOR —',
        size: 14,
      },
      {
        x: 2420,
        y: 130,
        sf: 0.55,
        color: '#ff6ba0',
        glow: 0xff2d78,
        lines: 'RESIDUAL REGISTRY REMINDER:\n90 DAYS REMAINING',
        size: 14,
      },
    ];
    for (const b of boards) {
      // Dark glass plate first — the letters need something black to burn against.
      const w = Math.max(...b.lines.split('\n').map((l) => l.length)) * b.size * 0.62 + 36;
      const h = b.lines.split('\n').length * b.size * 1.35 + 28;
      const plate = this.add
        .rectangle(b.x, b.y, w, h, 0x05070c, 0.88)
        .setStrokeStyle(1, b.glow, 0.6)
        .setScrollFactor(b.sf)
        .setDepth(1.9);
      const txt = this.add
        .text(b.x, b.y, b.lines, {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: `${b.size}px`,
          color: b.color,
          align: 'center',
        })
        .setOrigin(0.5)
        .setScrollFactor(b.sf)
        .setDepth(2);
      const glow = this.add
        .image(b.x, b.y, 'ch2-mote')
        .setScale(w / 8, h / 4)
        .setTint(b.glow)
        .setAlpha(0.14)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScrollFactor(b.sf)
        .setDepth(1.8);
      // Holo flicker: the hardware glitches, the message never goes out.
      this.tweens.add({
        targets: [plate, glow],
        alpha: { from: plate.alpha, to: 0.55 },
        duration: 70,
        yoyo: true,
        repeat: -1,
        repeatDelay: 1800 + Math.random() * 2200,
      });
      this.tweens.add({
        targets: txt,
        alpha: { from: 1, to: 0.85 },
        duration: 70,
        yoyo: true,
        repeat: -1,
        repeatDelay: 2600 + Math.random() * 2600,
      });
    }
  }

  buildWalkWorld() {
    const g = this.add.graphics().setDepth(2);
    // Rooftop slab.
    g.fillStyle(0x11151d, 1);
    g.fillRect(-100, WALK.ground, WALK.end + 500, GAME_H - WALK.ground + 60);
    const rim = this.add.graphics().setDepth(3);
    rim.lineStyle(2, 0x3a4a5c, 1);
    rim.lineBetween(-100, WALK.ground, WALK.end + 500, WALK.ground);

    // AC units to hop — the last easy jumps of his life.
    WALK.boxes.forEach((b) => {
      g.fillStyle(0x181d26, 1);
      g.fillRect(b.x0, b.top, b.x1 - b.x0, WALK.ground - b.top);
      rim.lineStyle(2, 0x3a4a5c, 1);
      rim.lineBetween(b.x0, b.top, b.x1, b.top);
      rim.lineStyle(1, 0x2a3442, 1);
      rim.lineBetween(b.x0 + 6, b.top + 8, b.x1 - 6, b.top + 8);
    });

    // Terminals with pre-op consent text.
    this.terminalsDone = new Set();
    WALK.terminals.forEach((t, i) => {
      this.add.image(t.x, WALK.ground - 22, 'ch2-terminal').setDepth(3);
      const txt = this.add
        .text(t.x, WALK.ground - 120, '', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '13px',
          color: '#5ce894',
          align: 'center',
        })
        .setOrigin(0.5, 1)
        .setDepth(3)
        .setAlpha(0);
      t.txt = txt;
      t.idx = i;
    });

    // Clinic door: cold light spilling out.
    const doorX = WALK.end - 60;
    g.fillStyle(0x0d1118, 1);
    g.fillRect(doorX, WALK.ground - 130, 90, 130);
    rim.lineStyle(2, 0x27e0f5, 0.9);
    rim.strokeRect(doorX, WALK.ground - 130, 90, 130);
    const spill = this.add
      .image(doorX + 45, WALK.ground - 60, 'ch2-mote')
      .setScale(16, 9)
      .setTint(0x27e0f5)
      .setAlpha(0.12)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);
    this.tweens.add({ targets: spill, alpha: 0.22, duration: 1600, yoyo: true, repeat: -1 });
    // The door's light pours out onto the wet roof — a way out, sold as a way up.
    addShaft(this, { x: doorX + 45, y: WALK.ground - 128, color: 0x27e0f5, alpha: 0.1, scaleX: 1.4, scaleY: 0.42, depth: 2.2 });
    this.add
      .text(doorX + 45, WALK.ground - 152, 'SURGERY →', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#27e0f5',
      })
      .setOrigin(0.5, 1)
      .setDepth(3);
  }

  walkGroundAt(x) {
    let y = WALK.ground;
    for (const b of WALK.boxes) if (x >= b.x0 && x <= b.x1) y = Math.min(y, b.top);
    return y;
  }

  buildHumanoid() {
    // Origin at the feet. Parts are separate so the cutscene can take them.
    this.figure = this.add.container(120, WALK.ground).setDepth(5);
    this.parts = {
      body: this.add.image(0, -31, 'ch2-hu-body').setScale(0.4),
      head: this.add.image(1, -50, 'ch2-hu-head').setScale(0.4),
      armL: this.add.image(-9, -42, 'ch2-hu-arm').setOrigin(0.5, 0.1).setScale(0.4),
      armR: this.add.image(9, -42, 'ch2-hu-arm').setOrigin(0.5, 0.1).setScale(0.4),
      legL: this.add.image(-4, -18, 'ch2-hu-leg').setOrigin(0.5, 0.05).setScale(0.4),
      legR: this.add.image(4, -18, 'ch2-hu-leg').setOrigin(0.5, 0.05).setScale(0.4),
    };
    this.figure.add(Object.values(this.parts));
    this.walker = { x: 120, y: WALK.ground, vy: 0, grounded: true, facing: 1, phase: 0 };
  }

  buildPromptChips() {
    // The abilities the player currently owns. The cutscene burns them out.
    this.chips = PROMPTS.map((p, i) => {
      const txt = this.add
        .text(14, 12 + i * 20, p.label, {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '12px',
          color: '#7f8b99',
        })
        .setScrollFactor(0)
        .setDepth(60);
      return { txt, lit: true };
    });
  }

  flashChip(i) {
    const c = this.chips[i];
    if (!c || !c.lit) return;
    c.txt.setColor('#c9e8f2');
    this.time.delayedCall(120, () => c.lit && c.txt.setColor('#7f8b99'));
  }

  burnChip(i) {
    const c = this.chips[i];
    if (!c || !c.lit) return;
    c.lit = false;
    c.txt.setColor('#3a3f46');
    c.txt.setText(c.txt.text + '  ✕');
    const b = c.txt.getBounds();
    this.add
      .particles(b.right - 8, b.centerY, 'ch2-mote', {
        speed: { min: 30, max: 120 },
        lifespan: 420,
        quantity: 10,
        scale: { min: 0.3, max: 0.8 },
        tint: [0xff5a3c, 0xffa23c],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(61)
      .explode(10);
    synthBuzz(this, { freq: 90, dur: 0.25, gain: 0.1 });
  }

  // ------------------------------------------------------------ OR set (CS)

  buildOrSet() {
    // The operating room lives far right of the rooftop; the camera only
    // visits during the cutscene.
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x0b0e14, 1);
    g.fillRect(OR.roomL, 140, OR.roomR - OR.roomL, 460);
    // Tiled back wall, surgical greenwhite, mostly dark.
    g.lineStyle(1, 0x161c26, 1);
    for (let x = OR.roomL; x < OR.roomR; x += 46) g.lineBetween(x, 140, x, 600);
    for (let y = 140; y < 600; y += 46) g.lineBetween(OR.roomL, y, OR.roomR, y);
    // Glass tanks with organ silhouettes — procedural, per §3.1.
    [2960, 3060, 3540, 3640].forEach((tx, i) => {
      g.fillStyle(0x0e1a1c, 0.9);
      g.fillRoundedRect(tx, 220, 54, 150, 8);
      g.fillStyle(0x27443e, 0.55);
      if (i % 2 === 0) g.fillEllipse(tx + 27, 290, 22, 34);
      else g.fillCircle(tx + 27, 285, 13);
    });

    // Table.
    g.fillStyle(0x1a212c, 1);
    g.fillRect(OR.tableX - 95, OR.tableY, 190, 14);
    g.fillRect(OR.tableX - 8, OR.tableY + 14, 16, 60);
    const rim = this.add.graphics().setDepth(3);
    rim.lineStyle(2, 0x46525f, 1);
    rim.lineBetween(OR.tableX - 95, OR.tableY, OR.tableX + 95, OR.tableY);

    // Surgical light cone above the table.
    this.orLight = this.add
      .image(OR.tableX, 300, 'ch2-mote')
      .setScale(26, 20)
      .setTint(0xbfe8f0)
      .setAlpha(0.0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);

    // Robotic arm from the ceiling: two segments, hidden until the cuts.
    this.arm = this.add.container(OR.tableX, 140).setDepth(4).setAlpha(0);
    const seg1 = this.add.image(0, 60, 'ch2-beam').setScale(0.4, 12).setTint(0x39424e);
    const seg2 = this.add.image(0, 150, 'ch2-beam').setScale(0.28, 8).setTint(0x39424e);
    const claw = this.add.image(0, 208, 'ch2-mote').setScale(2.6).setTint(0xff5a3c);
    this.arm.add([seg1, seg2, claw]);

    // The prosthetic waiting on a side tray — the thing the explosion steals.
    this.orProsthetic = this.add.image(OR.tableX + 220, OR.tableY - 18, 'ch2-prosthetic').setDepth(3).setScale(0.4);
    this.add
      .image(OR.tableX + 220, OR.tableY - 18, 'ch2-mote')
      .setScale(7)
      .setTint(0x9fd8e8)
      .setAlpha(0.25)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);

    // Lying figure on the table: same parts, rearranged horizontally,
    // spread across the table so the silhouette reads at a glance.
    this.lying = this.add.container(OR.tableX, OR.tableY - 10).setDepth(5).setVisible(false);
    this.lyingParts = {
      body: this.add.image(0, 0, 'ch2-hu-body').setRotation(Math.PI / 2).setScale(0.4),
      head: this.add.image(-32, -1, 'ch2-hu-head').setScale(0.4),
      armL: this.add.image(-4, -12, 'ch2-hu-arm').setRotation(Math.PI / 2 + 0.18).setOrigin(0.5, 0.1).setScale(0.4),
      armR: this.add.image(4, 10, 'ch2-hu-arm').setRotation(Math.PI / 2 - 0.14).setOrigin(0.5, 0.1).setScale(0.4),
      legL: this.add.image(30, -4, 'ch2-hu-leg').setRotation(Math.PI / 2 + 0.08).setOrigin(0.5, 0.05).setScale(0.4),
      legR: this.add.image(31, 6, 'ch2-hu-leg').setRotation(Math.PI / 2 - 0.06).setOrigin(0.5, 0.05).setScale(0.4),
    };
    // Under the surgical light he is pale flesh, not a rooftop silhouette —
    // the player must SEE the limbs leave the table.
    Object.values(this.lyingParts).forEach((img) => img.setTint(0xd8c0b4).setScale(0.68)); // 1.7x of the 0.4-drawn 2.5x textures
    this.lying.add(Object.values(this.lyingParts));

    // Blood pool spreading across the table, grows with every cut.
    this.csPool = this.add
      .rectangle(OR.tableX, OR.tableY - 4, 0, 7, 0x5c1216, 0.85)
      .setDepth(4);

    // Blood-shadow splashes at table height — the blood belongs to the
    // body, not the ceiling (was y=300: a streak floating mid-air).
    this.splashes = [-70, -25, 30, 75].map((dx) =>
      this.add
        .image(OR.tableX + dx, OR.tableY - 22, 'ch2-mote')
        .setScale(9, 5)
        .setTint(0x6e1f24)
        .setAlpha(0)
        .setDepth(3),
    );

    // Cutscene overlay text.
    this.csText = this.add
      .text(GAME_W / 2, 90, '', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '15px',
        color: '#9fb4c4',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(62);

    this.buildOrDressing();

    // Letterbox bars (scaleY-driven: Rectangle height is not tween-safe).
    this.barT = this.add.rectangle(0, 0, GAME_W, 56, 0x000000).setOrigin(0, 0).setScale(1, 0).setScrollFactor(0).setDepth(55);
    this.barB = this.add
      .rectangle(0, GAME_H, GAME_W, 56, 0x000000)
      .setOrigin(0, 1)
      .setScale(1, 0)
      .setScrollFactor(0)
      .setDepth(55);
  }

  // -------------------------------------------------------------- walk update

  /**
   * OR dressing pass: the lamp rig, the monitors, the instruments — the room
   * earns the procedure. Everything the flat tile grid was missing.
   */
  buildOrDressing() {
    const g = this.add.graphics().setDepth(2.5);

    // Ceiling cable tray with drooping runs.
    g.lineStyle(2, 0x1d2632, 1);
    g.lineBetween(OR.roomL, 152, OR.roomR, 152);
    [2920, 3080, 3330, 3560].forEach((cx) => {
      g.lineStyle(1, 0x232d3a, 0.9);
      g.lineBetween(cx, 152, cx + 14, 206);
    });

    // Grime: the tiles weep where the sterilizer mist never reaches.
    [2900, 3150, 3410, 3700].forEach((sx, i) => {
      g.fillStyle(0x080a10, 0.5);
      g.fillRect(sx, 140, 5 + (i % 2) * 4, 90 + (i * 37) % 120);
    });
    // Floor sheen and the drain the blood is meant for.
    const sheen = this.add
      .image(OR.tableX, 592, 'ch2-mote')
      .setScale(46, 2.4)
      .setTint(0x5d6a78)
      .setAlpha(0.05)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2.4);
    void sheen;
    g.fillStyle(0x0a0e12, 1);
    g.fillRect(OR.tableX + 90, 586, 54, 8);
    g.lineStyle(1, 0x2a3442, 1);
    for (let i = 0; i < 5; i++) g.lineBetween(OR.tableX + 96 + i * 10, 587, OR.tableX + 96 + i * 10, 593);

    // The Ministry signs its work — high on the right wall, in frame.
    this.add
      .text(3440, 176, 'MINISTRY OF HEALTH — UPGRADE WING 7', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '11px',
        color: '#46525f',
      })
      .setOrigin(0.5)
      .setDepth(2.6);
    const plac = this.add.rectangle(OR.roomL + 76, 250, 88, 30, 0x3a0d10, 0.9).setDepth(2.6);
    plac.setStrokeStyle(1, 0x8e1f24, 0.9);
    this.add
      .text(OR.roomL + 76, 250, 'BIOHAZARD', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '11px',
        color: '#b03036',
      })
      .setOrigin(0.5)
      .setDepth(2.7);

    // Surgical lamp rig: ceiling mount, two articulated arms, a lens head —
    // the light cone finally has a source.
    const lamp = this.add.graphics().setDepth(3.5);
    lamp.fillStyle(0x232b36, 1);
    lamp.fillRect(OR.tableX - 14, 140, 28, 14);
    lamp.lineStyle(4, 0x39424e, 1);
    lamp.lineBetween(OR.tableX, 154, OR.tableX - 58, 196);
    lamp.lineBetween(OR.tableX - 58, 196, OR.tableX - 4, 224);
    lamp.fillStyle(0x39424e, 1);
    lamp.fillCircle(OR.tableX - 58, 196, 5);
    lamp.fillRoundedRect(OR.tableX - 36, 220, 66, 18, 8);
    lamp.fillStyle(0xcfe8f2, 0.95);
    for (let i = 0; i < 4; i++) lamp.fillCircle(OR.tableX - 21 + i * 15, 229, 5);
    this.orLampGlow = this.add
      .image(OR.tableX - 3, 232, 'ch2-mote')
      .setScale(7, 2.6)
      .setTint(0xcfe8f2)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3.4);

    // Procedure monitor (left wall, in frame): the plan, signed and numbered.
    const pm = { x: OR.roomL + 22, y: 396, w: 190, h: 112 };
    g.fillStyle(0x05080d, 1);
    g.fillRoundedRect(pm.x, pm.y, pm.w, pm.h, 6);
    g.lineStyle(1, 0x2a4a5c, 0.9);
    g.strokeRoundedRect(pm.x, pm.y, pm.w, pm.h, 6);
    this.add
      .text(pm.x + 10, pm.y + 8, 'PROCEDURE 44-C\nFULL SHELL TRANSFER', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '10px',
        color: '#9fd8e8',
        lineSpacing: 3,
      })
      .setDepth(2.7);
    this.add
      .text(pm.x + 10, pm.y + 46, '1 HARVEST LIMBS  x4\n2 BRIDGE NEURAL LINK\n3 FIT MK-IV SHELL', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '10px',
        color: '#5d8a6a',
        lineSpacing: 4,
      })
      .setDepth(2.7);
    // the little diagram: a body, limbs crossed out in red
    const dg = this.add.graphics().setDepth(2.7);
    const dx = pm.x + 158;
    const dy = pm.y + 58;
    dg.lineStyle(1.5, 0x5d6a78, 1);
    dg.strokeCircle(dx, dy - 24, 7);
    dg.strokeRect(dx - 7, dy - 16, 14, 26);
    dg.lineBetween(dx - 7, dy - 10, dx - 18, dy + 4);
    dg.lineBetween(dx + 7, dy - 10, dx + 18, dy + 4);
    dg.lineBetween(dx - 4, dy + 10, dx - 10, dy + 34);
    dg.lineBetween(dx + 4, dy + 10, dx + 10, dy + 34);
    dg.lineStyle(1.5, 0x8e1f24, 1);
    [[dx - 18, dy + 4], [dx + 18, dy + 4], [dx - 10, dy + 34], [dx + 10, dy + 34]].forEach(([lx, ly]) => {
      dg.lineBetween(lx - 5, ly - 5, lx + 5, ly + 5);
      dg.lineBetween(lx - 5, ly + 5, lx + 5, ly - 5);
    });

    // Vitals monitors (right of the table): ECG runs live in the update loop.
    const vm = { x: OR.tableX + 300, y: 420, w: 128, h: 64 };
    g.fillStyle(0x05080d, 1);
    g.fillRoundedRect(vm.x, vm.y, vm.w, vm.h, 6);
    g.lineStyle(1, 0x2a4a3c, 0.9);
    g.strokeRoundedRect(vm.x, vm.y, vm.w, vm.h, 6);
    this.add
      .text(vm.x + 8, vm.y + 5, 'CITIZEN-8 · HR 61', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '9px',
        color: '#2fbf71',
      })
      .setDepth(2.7);
    this.ecgBox = { x: vm.x + 8, y: vm.y + 20, w: vm.w - 16, h: 38 };
    this.ecgGfx = this.add.graphics().setDepth(2.8);
    this.ecgT = 0;
    // bridge status monitor below it
    g.fillStyle(0x05080d, 1);
    g.fillRoundedRect(vm.x, vm.y + 76, vm.w, 44, 6);
    g.lineStyle(1, 0x2a4a5c, 0.9);
    g.strokeRoundedRect(vm.x, vm.y + 76, vm.w, 44, 6);
    this.bridgeStat = this.add
      .text(vm.x + 8, vm.y + 84, 'AI BRIDGE\nSTANDBY_', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '10px',
        color: '#46525f',
        lineSpacing: 3,
      })
      .setDepth(2.7);

    // IV stand, still dripping for a subject who declined the anesthetic.
    g.lineStyle(2, 0x39424e, 1);
    g.lineBetween(OR.tableX - 120, 596, OR.tableX - 120, 470);
    g.lineBetween(OR.tableX - 132, 470, OR.tableX - 108, 470);
    g.fillStyle(0x3fbf8e, 0.5);
    g.fillRoundedRect(OR.tableX - 130, 472, 20, 30, 4);
    g.lineStyle(1, 0x3fbf8e, 0.6);
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const q0x = Phaser.Math.Linear(OR.tableX - 120, OR.tableX - 90, u);
      const q0y = Phaser.Math.Linear(502, 522, u);
      const q1x = Phaser.Math.Linear(OR.tableX - 90, OR.tableX - 58, u);
      const q1y = Phaser.Math.Linear(522, 458, u);
      const tx = Phaser.Math.Linear(q0x, q1x, u);
      const ty = Phaser.Math.Linear(q0y, q1y, u);
      if (i === 0) g.moveTo(tx, ty);
      else g.lineTo(tx, ty);
    }
    g.strokePath();

    // Instrument tray: saw, forceps, clamp — laid out and waiting.
    g.fillStyle(0x1a212c, 1);
    g.fillRect(OR.tableX - 250, 540, 90, 8);
    g.fillRect(OR.tableX - 246, 548, 6, 48);
    g.fillRect(OR.tableX - 166, 548, 6, 48);
    g.lineStyle(2, 0x8a94a8, 0.9);
    g.lineBetween(OR.tableX - 240, 536, OR.tableX - 214, 536); // scalpel
    g.lineBetween(OR.tableX - 206, 532, OR.tableX - 186, 538); // forceps
    g.lineStyle(2, 0x8a94a8, 0.9);
    g.strokeCircle(OR.tableX - 176, 534, 4); // clamp ring
    g.lineBetween(OR.tableX - 176, 538, OR.tableX - 176, 542);

    // The discharge tray the shell waits on — and its name tag, so the
    // player knows WHAT that thing is before the explosion steals it.
    g.fillStyle(0x1a212c, 1);
    g.fillRect(OR.tableX + 176, 468, 90, 10);
    g.fillRect(OR.tableX + 216, 478, 8, 118);
    g.lineStyle(1, 0x9fd8e8, 0.5);
    g.strokeCircle(OR.tableX + 220, OR.tableY - 18, 26); // the clamp ring
    this.shellTag = this.add
      .text(OR.tableX + 220, OR.tableY - 62, 'MK-IV SHELL — “UNIT 8”', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '11px',
        color: '#9fd8e8',
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setAlpha(0.55);
  }

  /** Live ECG trace on the vitals monitor, redrawn during the cutscene. */
  updateOrMonitors() {
    const b = this.ecgBox;
    if (!b || !this.ecgGfx) return;
    this.ecgT += 1;
    const g = this.ecgGfx;
    g.clear();
    // After the bridge connects the trace runs double-time — two rhythms
    // in one chest.
    const fast = this.csBeat >= 9;
    g.lineStyle(1.5, fast ? 0x9fd8e8 : 0x2fbf71, 0.95);
    g.beginPath();
    for (let i = 0; i <= 42; i++) {
      const u = i / 42;
      const ph = (u * (fast ? 5 : 3) + this.ecgT * 0.02) % 1;
      let v = 0;
      if (ph < 0.06) v = -Math.sin((ph / 0.06) * Math.PI) * 14;
      else if (ph < 0.12) v = Math.sin(((ph - 0.06) / 0.06) * Math.PI) * 5;
      const x = b.x + u * b.w;
      const y = b.y + b.h / 2 + v;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
  }

  // -------------------------------------------------------------- walk update

  updateWalk(dt) {
    const w = this.walker;
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;

    const SPEED = 240;
    let vx = 0;
    if (left && !right) vx = -SPEED;
    else if (right && !left) vx = SPEED;
    if (vx !== 0) {
      w.facing = Math.sign(vx);
      this.flashChip(vx < 0 ? 1 : 2);
    }

    // Horizontal move, blocked by box walls rising more than a step.
    const nx = w.x + vx * dt;
    const gCur = this.walkGroundAt(w.x);
    const gNew = this.walkGroundAt(nx);
    if (w.grounded && gNew < gCur - 12) {
      // wall
    } else {
      w.x = Phaser.Math.Clamp(nx, 40, WALK.end);
    }

    // Jump — the baseline that is about to be taken away.
    if (w.grounded && Phaser.Input.Keyboard.JustDown(k.jump)) {
      w.vy = -730;
      w.grounded = false;
      this.flashChip(0);
    }

    if (!w.grounded) {
      w.vy += 1900 * dt;
      w.y += w.vy * dt;
      const gy = this.walkGroundAt(w.x);
      if (w.vy > 0 && w.y >= gy) {
        w.y = gy;
        w.vy = 0;
        w.grounded = true;
      }
    } else {
      w.y = this.walkGroundAt(w.x);
    }

    // Walk cycle.
    w.phase += Math.abs(vx) * dt * 0.045;
    const sw = w.grounded && vx !== 0 ? Math.sin(w.phase) * 0.55 : 0;
    this.parts.legL.setRotation(sw);
    this.parts.legR.setRotation(-sw);
    this.parts.armL.setRotation(-sw * 0.8);
    this.parts.armR.setRotation(sw * 0.8);
    this.figure.setPosition(w.x, w.y);
    this.figure.setScale(w.facing, 1);

    // Terminals type their consent text as he passes.
    WALK.terminals.forEach((t, i) => {
      if (!this.terminalsDone.has(i) && Math.abs(w.x - t.x) < 210) {
        this.terminalsDone.add(i);
        this.typeText(t.txt, t.lines.join('\n'), 26);
      }
    });

    // VESSEL speaks — customer-service register, still says "you" (§5).
    if (!this.vesselSaid.has('w1') && w.x > 260) {
      this.vesselSaid.add('w1');
      this.vessel.say('Good morning, Citizen 8. You are in good hands.');
    }
    if (!this.vesselSaid.has('w2') && w.x > 1250) {
      this.vesselSaid.add('w2');
      this.vessel.say('The procedure is routine. 7,412 upgrades completed this quarter.');
    }

    // The door.
    if (w.x >= WALK.end - 110) this.startCutscene();
  }

  typeText(txt, full, cps = 30) {
    txt.setAlpha(1);
    txt.setText('');
    let i = 0;
    const timer = this.time.addEvent({
      delay: 1000 / cps,
      repeat: full.length - 1,
      callback: () => {
        i++;
        txt.setText(full.slice(0, i));
      },
    });
    return timer;
  }

  // ---------------------------------------------------------------- cutscene

  startCutscene() {
    this.phase = 'CS_PAN';
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.setBounds(0, 0, OR.roomR, GAME_H);
    // He walks through the door ahead of the lens; the camera slides in
    // after him. The room was always there — no black, one take.
    this.figure.setVisible(false);
    cam.pan(OR.tableX, 400, 850, 'Cubic.easeInOut', true, () => {
      this.lying.setVisible(true);
      cam.setBounds(OR.roomL, 0, OR.roomR - OR.roomL, GAME_H);
      cam.centerOn(OR.tableX, 400);
      this.tweens.add({ targets: cam, zoom: 1.25, duration: 500 });
      this.csStart = this.time.now + 500;
      this.csBeat = 0;
      this.phase = 'CS';
      this.hint.setText('SPACE — skip');
      this.buildCsBeats();
    });
  }

  buildCsBeats() {
    const cutLimb = (i) => {
      const names = ['legR', 'legL', 'armR', 'armL'];
      // Arm descends, the saw sings, the wall takes the blood — the camera
      // never shows the cut itself (design §3.2).
      this.tweens.add({
        targets: this.arm,
        alpha: 1,
        y: 140 + 150,
        duration: 650,
        ease: 'Quad.easeIn',
        onComplete: () => {
          synthBuzz(this, { freq: 150 + i * 25, dur: 0.7, gain: 0.18 });
          this.cameras.main.flash(160, 120, 10, 12);
          const part = this.lyingParts[names[i]];
          part.setVisible(false);
          // The severed limb drops off the table and stays on the floor.
          const drop = this.add
            .image(this.lying.x + part.x, this.lying.y + part.y, part.texture.key)
            .setOrigin(part.originX, part.originY)
            .setRotation(part.rotation)
            .setTint(0xd8c0b4)
            .setScale(0.68)
            .setDepth(6);
          this.tweens.add({
            targets: drop,
            y: 588,
            rotation: part.rotation + 2.1,
            duration: 620,
            ease: 'Quad.easeIn',
            onComplete: () => this.tweens.add({ targets: drop, alpha: 0.55, duration: 1200 }),
          });
          // The pool spreads with every cut.
          this.csPool.setSize(56 + i * 34, 7);
          this.splashes[i].setAlpha(0.85);
          this.tweens.add({ targets: this.splashes[i], alpha: 0.4, duration: 900 });
          this.add
            .particles(this.lying.x, this.lying.y, 'ch2-mote', {
              speed: { min: 40, max: 180 },
              lifespan: 500,
              quantity: 16,
              scale: { min: 0.4, max: 1.1 },
              tint: [0x8e1f24, 0x5c1216],
              blendMode: Phaser.BlendModes.ADD,
              emitting: false,
            })
            .setDepth(6)
            .explode(16);
          // The UI loses the ability with the limb — jump first, then left,
          // then right, then interact.
          this.burnChip(i);
          this.tweens.add({ targets: this.arm, y: 140, alpha: 0, duration: 700, delay: 500 });
        },
      });
    };

    this.csBeats = [
      {
        at: 600,
        fn: () => {
          this.tweens.add({
            targets: [this.barT, this.barB],
            scaleY: 1,
            duration: 900,
            ease: 'Quad.easeOut',
          });
          this.tweens.add({ targets: this.orLight, alpha: 0.5, duration: 1200 });
          this.tweens.add({ targets: this.orLampGlow, alpha: 0.5, duration: 1200 });
        },
      },
      { at: 1400, fn: () => this.typeText(this.csText, 'MINISTRY OF HEALTH — PROCEDURE 44-C:\nFULL SHELL TRANSFER', 24) },
      {
        at: 3800,
        fn: () => {
          // The tag on the tray flashes — the player meets the shell BEFORE
          // the explosion steals it.
          this.typeText(this.csText, 'SHELL ASSIGNED: MK-IV COMBAT FRAME — “UNIT 8”.\nWaiting at the discharge tray.', 24);
          this.tweens.add({
            targets: this.shellTag,
            alpha: 1,
            scale: 1.15,
            duration: 240,
            yoyo: true,
            repeat: 3,
          });
        },
      },
      { at: 6800, fn: () => this.typeText(this.csText, 'ANESTHETIC: declined by subject.\nLIMB EXCISION ×4 — beginning harvest.', 24) },
      { at: 8600, fn: () => cutLimb(0) },
      { at: 12400, fn: () => cutLimb(1) },
      { at: 16200, fn: () => cutLimb(2) },
      { at: 20000, fn: () => cutLimb(3) },
      {
        at: 22200,
        fn: () =>
          this.typeText(
            this.csText,
            'EXCISION COMPLETE — residual mass: 31.4 kg.\nNeural bridge: CONNECTED — motor cortex rerouted to torso.',
            22,
          ),
      },
      {
        at: 26200,
        fn: () => {
          this.typeText(this.csText, 'Your shell is ready.\n\nHello.', 20);
          this.bridgeStat.setText('AI BRIDGE\nCONNECTED').setColor('#9fd8e8');
        },
      },
      { at: 29800, fn: () => this.csExplosion() },
      { at: 32600, fn: () => this.csRumble() },
      { at: 35400, fn: () => this.csFloorDrops() },
    ];
  }

  updateCs() {
    const t = this.time.now - this.csStart;
    if (this.csSkipped) return;
    // Grace window: a Space still registering from the walk-in must not
    // skip the cutscene by accident.
    if (t > 800 && Phaser.Input.Keyboard.JustDown(this.keys.jump)) {
      this.skipCutscene();
      return;
    }
    while (this.csBeat < this.csBeats.length && t >= this.csBeats[this.csBeat].at) {
      this.csBeats[this.csBeat].fn();
      this.csBeat++;
    }
  }

  csExplosion() {
    // White light, low boom, the table flips — and the prosthetic is blown
    // out of the building, down toward L2-2.
    this.cameras.main.flash(420, 255, 255, 255);
    synthThud(this, { freq: 60, gain: 0.85, dur: 1.0 });
    this.cameras.main.shake(700, 0.02);
    this.csText.setText('');
    this.orLight.setAlpha(0);
    if (this.orLampGlow) this.orLampGlow.setAlpha(0);
    if (this.shellTag) this.shellTag.destroy(); // its own tag takes over mid-arc

    this.tweens.add({
      targets: this.lying,
      rotation: -0.35,
      x: this.lying.x - 40,
      y: this.lying.y + 26,
      duration: 800,
      ease: 'Quad.easeOut',
    });

    // The cold thing arcs away into the dark — tagged, so the player knows
    // exactly WHAT just left the building: the body they were promised.
    const px = this.orProsthetic.x;
    const py = this.orProsthetic.y;
    const tag = this.add
      .text(px, py - 34, 'UNIT 8 — YOUR SHELL', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '13px',
        color: '#9fd8e8',
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.vessel.say('That was yours. Retrieve it.');
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1400,
      ease: 'Quad.easeIn',
      onUpdate: (tw) => {
        const u = tw.getValue();
        this.orProsthetic.setPosition(px + 900 * u, py - 260 * u + 900 * u * u);
        this.orProsthetic.setRotation(u * 9);
        this.orProsthetic.setAlpha(1 - u * 0.6);
        tag.setPosition(px + 900 * u, py - 34 - 260 * u + 900 * u * u);
        tag.setAlpha(1 - u * 0.85);
      },
      onComplete: () => {
        this.orProsthetic.setVisible(false);
        tag.destroy();
      },
    });

    // Debris burst.
    this.add
      .particles(OR.tableX, OR.tableY, 'ch2-chunk', {
        speed: { min: 120, max: 480 },
        angle: { min: 200, max: 340 },
        gravityY: 1400,
        lifespan: 1400,
        quantity: 14,
        rotate: { min: -360, max: 360 },
        emitting: false,
      })
      .setDepth(6)
      .explode(14);
  }

  csRumble() {
    this.cameras.main.shake(2400, 0.004);
    synthThud(this, { freq: 45, gain: 0.4, dur: 1.6 });
    // Dust from the ceiling.
    this.add.particles(0, 0, 'ch2-mote', {
      x: { min: OR.roomL, max: OR.roomR },
      y: { min: 150, max: 200 },
      speedY: { min: 30, max: 90 },
      lifespan: 2200,
      quantity: 2,
      frequency: 90,
      scale: { min: 0.3, max: 0.9 },
      alpha: { start: 0.4, end: 0 },
      tint: 0x5d6a78,
    });
  }

  csFloorDrops() {
    // The floor gives way; what is left of him falls — and the camera falls
    // with him, straight through the collapse, into the roll. One take.
    this.tweens.add({
      targets: this.lying,
      y: this.lying.y + 500,
      rotation: -1.2,
      duration: 900,
      ease: 'Quad.easeIn',
    });
    this.dropToRoll1(1000);
  }

  skipCutscene() {
    this.csSkipped = true;
    this.tweens.killAll();
    this.dropToRoll1(650);
  }

  /** Camera falls from the OR into the collapse route — no black. */
  dropToRoll1(panMs) {
    const cam = this.cameras.main;
    cam.shake(panMs, 0.005);
    synthThud(this, { freq: 50, gain: 0.45, dur: 1.1 });
    // The world tears upward past the lens — we are falling.
    const streaks = this.add
      .particles(0, 0, 'ch2-mote', {
        x: { min: 0, max: GAME_W },
        y: { min: -20, max: GAME_H + 20 },
        speedY: { min: -1400, max: -700 },
        speedX: { min: -60, max: 60 },
        lifespan: { min: 250, max: 600 },
        quantity: 3,
        frequency: 45,
        scale: { min: 0.3, max: 0.9 },
        alpha: { start: 0.5, end: 0 },
        tint: [0x3a4a5c, 0x5d6a78, 0x8e1f24],
        blendMode: Phaser.BlendModes.ADD,
        emitting: true,
      })
      .setScrollFactor(0)
      .setDepth(85);
    cam.pan(444, 1628, panMs, 'Cubic.easeIn', true, () => {
      streaks.destroy();
      this.setupRoll1();
    });
  }

  // ------------------------------------------------------------- roll acts

  /** Shared setup for the torso-rolling acts. */
  enterRollPhase(field, spawn, camBounds, hintText) {
    this.rollField = field;
    this.rollSpawn = spawn;
    if (!this.torso) this.torso = new Torso(this, spawn);
    else this.torso.reset(spawn);
    this.torso.setVisible(true);
    this.deathFxStarted = false;

    const cam = this.cameras.main;
    cam.stopFollow();
    cam.setBounds(camBounds.x, camBounds.y, camBounds.w, camBounds.h);
    // Keep whatever zoom the transition carried in; updateRoll lerps it
    // to the speed-based target from the first frame — no snap, no fade.
    cam.startFollow(this.torso.blob, true, 0.1, 0.1);
    cam.setFollowOffset(0, 60);
    this.hint.setText(hintText);
  }

  setupRoll1() {
    this.phase = 'ROLL1';
    this.vessel.say('Citizen 8, return to the table. This is not part of the procedure.');
    // Cut the cutscene dressing loose.
    [this.barT, this.barB].forEach((b) => b.setScale(1, 0));
    this.csText.setText('');
    this.arm.setVisible(false);
    this.lying.setVisible(false);
    this.orLight.setAlpha(0);
    this.chips.forEach((c, i) => c.lit && this.burnChip(i));
    this.hint.setText('');

    const field = new Heightfield(ROLL1.contour, ROLL1.gaps);
    field.draw(this, { maxX: 2900, bottom: 2850 });
    this.buildRoll1Backdrop();

    // Falling ceiling debris: bounce + blood, never lethal (design §3.3).
    this.chunks = [];
    this.chunkTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.spawnChunk(),
    });

    this.enterRollPhase(field, ROLL1.spawn, { x: 0, y: 1350, w: 3150, h: 1500 },
      'A/D — roll · SPACE — shoulder hop · the fall is the only way out');
    // One last overlay whisper, so the player names what they are now.
    this.typeText(this.csText, '— what is left of you.', 22);
    this.time.delayedCall(3600, () => {
      if (this.csText.active) this.tweens.add({ targets: this.csText, alpha: 0, duration: 900 });
    });
    // Why a meatball: the procedure manual has a protocol for this.
    this.time.delayedCall(4400, () => {
      if (this.phase === 'ROLL1') this.vessel.say('Limbs unrecoverable. Torso locomotion protocol engaged: roll.');
    });
  }

  buildRoll1Backdrop() {
    // Collapsing tower interior: tilted floor slabs, emergency red wash.
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x080a10, 1);
    g.fillRect(0, 1300, 3150, 1600);
    g.lineStyle(3, 0x141a24, 1);
    for (let i = 0; i < 9; i++) {
      const x = 150 + i * 340;
      g.lineBetween(x, 1350 + (i % 3) * 120, x + 260, 1390 + (i % 3) * 120);
    }
    const alarm = this.add
      .rectangle(1575, 1420, 3150, 300, 0x5c1216, 0.05)
      .setDepth(1);
    this.tweens.add({ targets: alarm, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
    // Dust.
    this.add.particles(0, 0, 'ch2-mote', {
      x: { min: -40, max: GAME_W + 40 },
      y: { min: -30, max: GAME_H },
      lifespan: 1500,
      speedX: { min: -220, max: -100 },
      speedY: { min: 40, max: 110 },
      scale: { min: 0.2, max: 0.6 },
      alpha: { start: 0.4, end: 0 },
      quantity: 1,
      frequency: 70,
      blendMode: Phaser.BlendModes.ADD,
    })
      .setScrollFactor(0)
      .setDepth(6);
  }

  spawnChunk() {
    if (this.phase !== 'ROLL1' || !this.torso || this.torso.p.dead) return;
    if (this.chunks.length >= 5) return; // never bury the player in debris
    const cam = this.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(100, GAME_W - 60);
    const y = cam.scrollY - 30;
    const img = this.add.image(x, y, 'ch2-chunk').setDepth(4).setRotation(Math.random() * 6);
    this.chunks.push({ img, vy: Phaser.Math.Between(40, 160), rot: Phaser.Math.FloatBetween(-3, 3) });
  }

  updateChunks(dt) {
    const p = this.torso.p;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      c.vy += 1900 * dt;
      c.img.y += c.vy * dt;
      c.img.rotation += c.rot * dt;
      const gy = this.rollField.groundAt(c.img.x);
      // Hit the torso: a bonk, blood, squash — then the chunk shatters.
      // It knocks speed OFF, never reverses it: a reversal on the slope
      // pinned the torso in place and soft-locked the fall (bug).
      if (!p.dead && Phaser.Math.Distance.Between(c.img.x, c.img.y, p.x, p.y) < ROLL_TUNE.radius + 11) {
        if (p.grounded) p.speed *= 0.55;
        else {
          p.vx *= 0.6;
          p.vy = Math.min(p.vy, -140);
        }
        this.torso.squash(-7);
        this.cameras.main.shake(120, 0.004);
        this.bloodBurst(p.x, p.y, 20);
        synthThud(this, { freq: 120, gain: 0.3, dur: 0.25 });
        this.shatterChunk(c);
        this.chunks.splice(i, 1);
        continue;
      }
      // Hit the ground: small splat, gone.
      if (gy !== null && c.img.y > gy + 8) {
        this.shatterChunk(c);
        this.chunks.splice(i, 1);
      }
    }
  }

  shatterChunk(c) {
    this.add
      .particles(c.img.x, c.img.y, 'ch2-mote', {
        speed: { min: 60, max: 200 },
        lifespan: 400,
        quantity: 8,
        scale: { min: 0.3, max: 0.7 },
        tint: 0x4a5563,
        emitting: false,
      })
      .setDepth(6)
      .explode(8);
    c.img.destroy();
  }

  bloodBurst(x, y, n) {
    this.add
      .particles(x, y, 'ch2-mote', {
        speed: { min: 60, max: 260 },
        lifespan: { min: 300, max: 700 },
        quantity: n,
        scale: { min: 0.4, max: 1.2 },
        tint: [0x8e1f24, 0x5c1216, 0xb03036],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6)
      .explode(n);
  }

  // --------------------------------------------------------------- shaft act

  setupShaft() {
    this.phase = 'SHAFT';
    this.vessel.say('Fault feedback noted. Your cooperation rating has been adjusted.');
    this.chunkTimer.remove();
    this.chunks.forEach((c) => c.img.destroy());
    this.chunks = [];

    // Shaft walls and beams.
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x07090e, 1);
    g.fillRect(SHAFT.wallL - 220, SHAFT.top - 400, (SHAFT.wallR - SHAFT.wallL) + 440, SHAFT.cushionY - SHAFT.top + 700);
    g.fillStyle(0x10141c, 1);
    g.fillRect(SHAFT.wallL - 40, SHAFT.top - 400, 40, SHAFT.cushionY - SHAFT.top + 700);
    g.fillRect(SHAFT.wallR, SHAFT.top - 400, 40, SHAFT.cushionY - SHAFT.top + 700);
    const rim = this.add.graphics().setDepth(2);
    rim.lineStyle(2, 0x3a4a5c, 1);
    rim.lineBetween(SHAFT.wallL, SHAFT.top - 400, SHAFT.wallL, SHAFT.cushionY + 100);
    rim.lineBetween(SHAFT.wallR, SHAFT.top - 400, SHAFT.wallR, SHAFT.cushionY + 100);
    // Cable lines down the shaft.
    rim.lineStyle(1, 0x1d2632, 1);
    [4360, 4440, 4520].forEach((x) => rim.lineBetween(x, SHAFT.top - 400, x, SHAFT.cushionY));

    SHAFT.beams.forEach((b) => {
      const w = b.x1 - b.x0;
      this.add
        .image((b.x0 + b.x1) / 2, b.y, 'ch2-beam')
        .setScale(w / 64, 1)
        .setDepth(2);
    });

    // The soft landing: body bags. Dark, and it saves his life — §3.3.
    for (let row = 0; row < 3; row++) {
      const count = 8 - row * 2;
      for (let i = 0; i < count; i++) {
        this.add
          .image(SHAFT.wallL + 40 + i * 48 + row * 22, SHAFT.cushionY + 8 - row * 14, 'ch2-bag')
          .setRotation((Math.random() - 0.5) * 0.3)
          .setDepth(2);
      }
    }

    // Put the torso at the shaft mouth, falling.
    const p = this.torso.p;
    p.x = (SHAFT.wallL + SHAFT.wallR) / 2;
    p.y = SHAFT.top - 120;
    p.vx = Phaser.Math.Clamp(p.vx, -200, 200);
    p.vy = 60;
    p.grounded = false;
    p.dead = false;
    this.shaftLanded = false;

    const cam = this.cameras.main;
    cam.stopFollow();
    cam.setBounds(SHAFT.wallL - 220, SHAFT.top - 400, (SHAFT.wallR - SHAFT.wallL) + 440, SHAFT.cushionY - SHAFT.top + 700);
    cam.startFollow(this.torso.blob, true, 0.08, 0.12);
    cam.setFollowOffset(0, -60);
    this.hint.setText('A/D — steer the fall · the beams slow you down');
  }

  updateShaft(dt) {
    const p = this.torso.p;
    const k = this.keys;
    const T = ROLL_TUNE;
    const prevY = p.y;

    p.vy = Math.min(p.vy + T.gravity * dt, 1150);
    if ((k.left.isDown || k.a.isDown) && !(k.right.isDown || k.d.isDown)) p.vx -= 520 * dt;
    else if ((k.right.isDown || k.d.isDown) && !(k.left.isDown || k.a.isDown)) p.vx += 520 * dt;
    p.vx *= Math.max(0, 1 - 1.6 * dt);
    p.vx = Phaser.Math.Clamp(p.vx, -380, 380);

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Walls.
    if (p.x < SHAFT.wallL + T.radius) {
      p.x = SHAFT.wallL + T.radius;
      if (p.vx < -60) this.shaftGraze(p.x, p.y);
      p.vx = Math.abs(p.vx) * 0.3;
    } else if (p.x > SHAFT.wallR - T.radius) {
      p.x = SHAFT.wallR - T.radius;
      if (p.vx > 60) this.shaftGraze(p.x, p.y);
      p.vx = -Math.abs(p.vx) * 0.3;
    }

    // Beams: crossing one on the way down = a graze, sparks, speed bled.
    // The push is always toward the beam's FREE end (the side not bolted to
    // a wall) so a slow torso slides off the tip instead of balancing on it
    // forever; feeble contact slips off instead of bouncing.
    for (const b of SHAFT.beams) {
      if (
        prevY + T.radius <= b.y &&
        p.y + T.radius >= b.y &&
        p.x >= b.x0 - 6 &&
        p.x <= b.x1 + 6 &&
        p.vy > 0
      ) {
        const freeDir = b.x0 <= SHAFT.wallL + 1 ? 1 : -1;
        if (p.vy > 110) {
          p.y = b.y - T.radius;
          p.vy = -p.vy * 0.16;
          p.vx += freeDir * 140;
          this.shaftGraze(p.x, b.y - 4);
          this.torso.squash(-5);
          synthThud(this, { freq: 140, gain: 0.22, dur: 0.2 });
        } else {
          // Too slow to bounce — roll off the free end.
          p.vx += freeDir * 90;
        }
      }
    }

    // The cushion.
    if (!this.shaftLanded && p.y + T.radius >= SHAFT.cushionY) {
      p.y = SHAFT.cushionY - T.radius;
      p.vy = 0;
      p.vx = 0;
      p.grounded = true;
      this.shaftLanded = true;
      this.torso.squash(-9);
      this.cameras.main.shake(200, 0.006);
      synthThud(this, { freq: 70, gain: 0.5, dur: 0.6 });
      // Dust off the bags.
      this.add
        .particles(p.x, SHAFT.cushionY, 'ch2-mote', {
          speed: { min: 40, max: 160 },
          lifespan: 800,
          quantity: 18,
          scale: { min: 0.4, max: 1 },
          tint: 0x4a5244,
          emitting: false,
        })
        .setDepth(6)
        .explode(18);
      // A beat in the dark, then the torso rolls on — the camera tears
      // right after it, out of the shaft, into the ruins. One take.
      this.time.delayedCall(900, () => {
        const cam = this.cameras.main;
        cam.stopFollow();
        synthBuzz(this, { freq: 120, dur: 0.6, gain: 0.12 });
        const streaks = this.add
          .particles(0, 0, 'ch2-mote', {
            x: { min: 0, max: GAME_W },
            y: { min: 0, max: GAME_H },
            speedX: { min: -1600, max: -900 },
            speedY: 0,
            lifespan: { min: 200, max: 420 },
            quantity: 3,
            frequency: 40,
            scale: { min: 0.3, max: 0.8 },
            alpha: { start: 0.5, end: 0 },
            tint: [0x3a4a5c, 0x5d6a78],
            blendMode: Phaser.BlendModes.ADD,
            emitting: true,
          })
          .setScrollFactor(0)
          .setDepth(85);
        cam.pan(5000, 4990, 750, 'Cubic.easeInOut', true, () => {
          streaks.destroy();
          this.setupChase();
        });
      });
    }

    this.torso.updateFlesh(dt);
  }

  shaftGraze(x, y) {
    this.add
      .particles(x, y, 'ch2-mote', {
        speed: { min: 80, max: 260 },
        lifespan: 350,
        quantity: 12,
        scale: { min: 0.3, max: 0.7 },
        tint: [0xffc46b, 0xff8a3c, 0xd8f4fc],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6)
      .explode(12);
  }

  // --------------------------------------------------------------- chase act

  setupChase() {
    this.phase = 'CHASE';
    this.vessel.say('Evacuation notice: this floor is being reclaimed. Remaining is not authorized.');
    this.hint.setText('A/D — roll · SPACE — hop · do not stop');

    const field = new Heightfield(CHASE.contour, CHASE.gaps);
    field.draw(this, { maxX: 7460, bottom: 5850 });
    this.buildChaseBackdrop();
    this.buildVentSlot();
    this.buildJars(field);

    // The collapse: a ragged bite-front of dust, slab teeth and furnace glow
    // that eats the corridor. Built in layers so it reads as a WALL, not fog.
    this.collapseX = CHASE.collapseStartX;
    this.collapseFig = this.add.container(this.collapseX, 4800).setDepth(4);
    const backDust = this.add
      .image(-110, 0, 'ch2-mote')
      .setScale(14, 60)
      .setTint(0x241f1c)
      .setAlpha(0.32);
    // Jagged leading edge: broken floor slabs chewing right.
    const teeth = this.add.graphics();
    teeth.fillStyle(0x17130f, 0.95);
    teeth.beginPath();
    teeth.moveTo(30, -640);
    for (let i = 0; i <= 12; i++) {
      const y = -640 + i * 110;
      teeth.lineTo(30 + ((i * 37) % 54) - 14, y);
      teeth.lineTo(-26 - ((i * 53) % 60), y + 55);
    }
    teeth.lineTo(30, 700);
    teeth.closePath();
    teeth.fillPath();
    teeth.lineStyle(2, 0x3d342c, 0.8);
    for (let i = 0; i < 8; i++) {
      const y = -560 + i * 150;
      teeth.lineBetween(-10 - (i % 3) * 18, y, 22, y + 60);
    }
    const biteGlow = this.add
      .image(24, 0, 'ch2-mote')
      .setScale(7, 46)
      .setTint(0xff8a3c)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.collapseFig.add([backDust, teeth, biteGlow]);
    // Sparks and grit tossed off the bite line.
    this.collapseSparks = this.add.particles(0, 0, 'ch2-mote', {
      x: 10,
      y: { min: -500, max: 560 },
      speedX: { min: 40, max: 220 },
      speedY: { min: -140, max: 60 },
      lifespan: { min: 200, max: 500 },
      quantity: 1,
      frequency: 90,
      scale: { min: 0.3, max: 0.9 },
      alpha: { start: 0.8, end: 0 },
      tint: [0xffc46b, 0xff8a3c, 0x6b5a4a],
      blendMode: Phaser.BlendModes.ADD,
      emitting: true,
    });
    this.collapseSparks.setDepth(5);
    this.collapseSparks.setPosition(this.collapseX, 4800);
    this.collapseRumbleAt = 0;

    this.enterRollPhase(field, CHASE.spawn, { x: 4200, y: 4650, w: 3400, h: 1400 },
      'A/D — roll · SPACE — hop · do not stop');
    this.torso.p.speed = 140; // rolling off the body bags
    this.cling = null;
    this.jarsSmashed = this.jarsSmashed || 0;
  }

  buildChaseBackdrop() {
    // Service corridor: lockers, pipes, and the live feed of your own hunt.
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x080a10, 1);
    g.fillRect(4200, 4650, 3400, 1400);
    g.lineStyle(3, 0x12161f, 1);
    for (let i = 0; i < 10; i++) {
      const x = 4350 + i * 320;
      g.lineBetween(x, 4700, x, 5050);
    }
    g.lineStyle(2, 0x1d2632, 1);
    g.lineBetween(4200, 4780, 7600, 4780); // pipe run
    g.lineBetween(4200, 4794, 7600, 4794);

    // Live-feed screens: your escape is programming (story §7).
    [5100, 6300].forEach((sx) => {
      this.add
        .rectangle(sx, 4870, 250, 96, 0x05070c, 0.92)
        .setStrokeStyle(1, 0xb03036, 0.7)
        .setDepth(2);
      this.add
        .text(sx, 4852, 'ANOMALY CULL · LIVE', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '14px',
          color: '#ff5560',
        })
        .setOrigin(0.5)
        .setDepth(2);
      this.add
        .text(sx, 4880, '2.1M WATCHING', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '11px',
          color: '#7f8b99',
        })
        .setOrigin(0.5)
        .setDepth(2);
      const dot = this.add.circle(sx - 108, 4840, 4, 0xff2d3c).setDepth(2);
      this.tweens.add({ targets: dot, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
    });
  }

  buildVentSlot() {
    // Corridor's cut face (left) and the vent stack (right): two slabs with
    // 220px of nothing between them. The stack's crown is the way out.
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x10141c, 1);
    g.fillRect(CLIMB.faceR, CLIMB.topR, 140, CLIMB.bottom - CLIMB.topR + 220);
    const rim = this.add.graphics().setDepth(3);
    rim.lineStyle(2, 0x3a4a5c, 1);
    rim.lineBetween(CLIMB.faceL, CLIMB.topL, CLIMB.faceL, CLIMB.bottom + 20);
    rim.lineBetween(CLIMB.faceR, CLIMB.topR, CLIMB.faceR, CLIMB.bottom + 20);
    rim.lineStyle(1, 0x1d2632, 1);
    for (let y = CLIMB.topR + 40; y < CLIMB.bottom; y += 90) {
      rim.lineBetween(CLIMB.faceL - 60, y, CLIMB.faceL, y + 26);
      rim.lineBetween(CLIMB.faceR, y + 40, CLIMB.faceR + 60, y + 14);
    }
    // The slot's dark maw below.
    g.fillStyle(0x04050a, 1);
    g.fillRect(CLIMB.faceL, CLIMB.bottom, CLIMB.faceR - CLIMB.faceL, 400);
  }

  buildJars(field) {
    this.jars = CHASE.jars.map((j) => {
      const gy = field.groundAt(j.x);
      const img = this.add.image(j.x, gy - 22, 'ch2-jar').setDepth(3);
      const glow = this.add
        .image(j.x, gy - 22, 'ch2-mote')
        .setScale(5, 7)
        .setTint(0x27443e)
        .setAlpha(0.35)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2);
      return { ...j, img, glow, smashed: false };
    });
  }

  smashJar(jar) {
    jar.smashed = true;
    jar.img.destroy();
    jar.glow.destroy();
    this.jarsSmashed++;
    this.registry.set('ch2.limbs', this.jarsSmashed);
    // Glass, preservative, and the limb itself tumbling free.
    this.add
      .particles(jar.img.x, jar.img.y, 'ch2-mote', {
        speed: { min: 60, max: 240 },
        lifespan: { min: 300, max: 700 },
        quantity: 18,
        scale: { min: 0.3, max: 0.9 },
        tint: [0x9fd8e8, 0x27443e, 0xd8f4fc],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6)
      .explode(18);
    const limb = this.add
      .image(jar.img.x, jar.img.y, jar.limb)
      .setTint(0x6b5a54)
      .setScale(0.4)
      .setDepth(5);
    this.tweens.add({
      targets: limb,
      y: limb.y - 90,
      rotation: 2.4,
      duration: 480,
      ease: 'Quad.easeOut',
      onComplete: () =>
        this.tweens.add({ targets: limb, y: limb.y + 70, alpha: 0.4, duration: 700, ease: 'Quad.easeIn' }),
    });
    synthThud(this, { freq: 260, gain: 0.2, dur: 0.12 });
    this.cameras.main.shake(50, 0.002);
    // The toast: inventory of a body you no longer own.
    const toast = this.add
      .text(GAME_W / 2, 118, `recovered: ${jar.label} — ${this.jarsSmashed}/3`, {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '13px',
        color: '#7f8b99',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60)
      .setAlpha(0);
    this.tweens.add({
      targets: toast,
      alpha: 0.95,
      duration: 300,
      onComplete: () => this.tweens.add({ targets: toast, alpha: 0, duration: 900, delay: 1600 }),
    });
  }

  updateChase(dt) {
    this.updateRoll(dt, CHASE.worldEnd, CHASE.killY);
    const p = this.torso.p;
    if (p.dead) return;

    // The wall eats forward.
    this.collapseX += CHASE.collapseSpeed * dt;
    this.collapseFig.setPosition(this.collapseX, 4880);
    if (this.collapseSparks) this.collapseSparks.setPosition(this.collapseX, 4880);
    const near = Phaser.Math.Clamp(1 - (p.x - this.collapseX) / 700, 0, 1);
    if (this.time.now > this.collapseRumbleAt) {
      this.collapseRumbleAt = this.time.now + 520;
      synthThud(this, { freq: 50, gain: 0.08 + near * 0.2, dur: 0.5 });
    }
    if (near > 0.25) this.cameras.main.shake(120, 0.001 + near * 0.003);

    // Jars.
    for (const j of this.jars) {
      if (!j.smashed && Math.abs(p.x - j.x) < 34 && Math.abs(p.y + ROLL_TUNE.radius - j.img.y - 22) < 60) {
        this.smashJar(j);
      }
    }

    // Eaten.
    if (p.x < this.collapseX + 30) {
      p.dead = true;
      this.startDeath();
      return;
    }

    // The slot mouth: the climb takes over.
    if (p.x > 6900) this.setupClimb();
  }

  // --------------------------------------------------------------- climb act

  setupClimb() {
    this.phase = 'CLIMB';
    this.vessel.say('…what are you doing.');
    this.hint.setText('fall toward a wall — you stick · SPACE — vault · hold away — let go');
    this.cling = null;
    this.splattedOnce = false;
    // The collapse jams itself into the corridor mouth and settles.
    this.collapseX = Math.min(this.collapseX, 6600);
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.setBounds(6500, 3550, 2200, 2400);
    cam.startFollow(this.torso.blob, true, 0.1, 0.12);
    cam.setFollowOffset(0, 40);
  }

  splatWall(side, x) {
    const p = this.torso.p;
    this.cling = { side, x, t: 0, letGo: 0 };
    p.vx = 0;
    p.vy = Math.min(p.vy, 50);
    this.torso.squash(-7);
    // Wet smack + a blood smear the wall keeps.
    synthThud(this, { freq: 220, gain: 0.18, dur: 0.12 });
    this.cameras.main.shake(60, 0.002);
    this.add
      .image(x + side * 6, p.y, 'ch2-mote')
      .setScale(5, 8)
      .setTint(0x5c1216)
      .setAlpha(0.55)
      .setDepth(3);
    this.add
      .particles(x, p.y, 'ch2-mote', {
        speed: { min: 30, max: 140 },
        lifespan: 400,
        quantity: 10,
        scale: { min: 0.3, max: 0.8 },
        tint: [0x8e1f24, 0xa08a83],
        emitting: false,
      })
      .setDepth(6)
      .explode(10);
    if (!this.splattedOnce) {
      this.splattedOnce = true;
      this.vessel.say('That is not a sanctioned movement.');
    }
  }

  updateClimb(dt) {
    const p = this.torso.p;
    if (p.dead) {
      this.updateDeath(dt);
      return;
    }
    const k = this.keys;
    const R = ROLL_TUNE.radius;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(k.jump);

    if (this.cling) {
      const c = this.cling;
      c.t += dt;
      // Topping out: reach a face's lip and the meat heaves itself over.
      if (c.side === 1 && p.y <= CLIMB.topR + 26) {
        this.cling = null;
        p.x = CLIMB.faceR + R + 6;
        p.y = 4100 - R;
        p.vx = 0; p.vy = 0; p.grounded = true; p.speed = 120;
        this.torso.squash(-5);
        synthThud(this, { freq: 140, gain: 0.2, dur: 0.25 });
        this.cameras.main.shake(70, 0.002);
        this.torso.updateFlesh(dt);
        return;
      }
      if (c.side === -1 && p.y <= CLIMB.topL + 26) {
        this.cling = null;
        p.x = CLIMB.faceL - R - 6;
        p.y = 5090 - R;
        p.vx = 0; p.vy = 0; p.grounded = true; p.speed = -100;
        this.torso.squash(-5);
        synthThud(this, { freq: 140, gain: 0.2, dur: 0.25 });
        this.torso.updateFlesh(dt);
        return;
      }
      // The slide: wet grip, bleeding altitude. Grip fails after a moment.
      p.vy = Math.min(p.vy + 480 * dt, c.t > 1.4 ? 210 : 60);
      p.y += p.vy * dt;
      p.x = c.x;
      if (jump) {
        // Vault: away and UP. The only verticality a torso has left.
        this.cling = null;
        p.grounded = false;
        p.vy = CLIMB.vaultVy;
        p.vx = -c.side * CLIMB.vaultVx;
        this.torso.squash(5);
        synthThud(this, { freq: 170, gain: 0.16, dur: 0.12 });
      } else if ((c.side === 1 && left) || (c.side === -1 && right)) {
        c.letGo += dt;
        if (c.letGo > 0.16) {
          this.cling = null;
          p.grounded = false;
          p.vx = -c.side * 150;
        }
      } else c.letGo = 0;
      if (this.cling && p.y > CLIMB.bottom) this.cling = null; // slid off the face
      this.torso.updateFlesh(dt);
      return;
    }

    if (p.grounded) {
      const ev = this.torso.stepGrounded(dt, { left, right, jump }, this.rollField, { worldEnd: CHASE.worldEnd });
      if (ev === 'bonk') {
        this.cameras.main.shake(60, 0.002);
        synthThud(this, { freq: 110, gain: 0.2, dur: 0.2 });
      }
      // Back on the corridor floor, the collapse is still eating it.
      if (p.x < this.collapseX + 30) {
        p.dead = true;
        this.startDeath();
        return;
      }
    } else {
      const ev = this.torso.stepAirborne(dt, { left, right, jump: false }, this.rollField, { worldEnd: CHASE.worldEnd });
      if (ev === 'slam') {
        this.startDeath();
        return;
      }
      // Face contact = splat. Meat sticks on any touch; only pressing AWAY
      // peels it off. Each face ignores contact while you're still moving
      // TOWARD the slot from its side (so the takeoff roll doesn't glue
      // you to the lip) — press into the wall and even that sticks.
      if (!p.grounded) {
        if (p.x < CLIMB.faceR && p.x + R >= CLIMB.faceR && (p.vx >= -60 || right) && p.y > CLIMB.topR + 12 && p.y < CLIMB.bottom) {
          this.splatWall(1, CLIMB.faceR - R);
        } else if (p.x > CLIMB.faceL && p.x - R <= CLIMB.faceL && (p.vx <= 60 || left) && p.y > CLIMB.topL + 12 && p.y < CLIMB.bottom) {
          this.splatWall(-1, CLIMB.faceL + R);
        }
      }
    }

    if (p.y > CLIMB.killY) {
      p.dead = true;
      this.startDeath();
      return;
    }

    // Out: over the stack's crown, onto the ramp.
    if (p.y < CLIMB.exitY && p.x > CLIMB.exitX) this.setupRamp();

    this.torso.updateFlesh(dt);
  }

  // ---------------------------------------------------------------- ramp act

  setupRamp() {
    this.phase = 'RAMP';
    this.vessel.say('Please stop. You are damaging company property.');

    const field = new Heightfield(RAMP.contour, RAMP.gaps);
    field.draw(this, { maxX: RAMP.worldEnd + 50, bottom: 5600 });
    this.buildRampBackdrop();

    // One-shot continuity: the climb spits the torso over the stack's crown
    // and it LANDS on the ramp — same body, same frame, no cut.
    const sp = { x: Math.max(7500, (this.torso ? this.torso.p.x : 0) + 40), y: 4100 - ROLL_TUNE.radius };
    this.enterRollPhase(field, sp, { x: 6800, y: 3500, w: 4400, h: 2100 },
      'A/D — roll · SPACE — hop · do not stop');
    this.torso.p.speed = 220; // carried over the crown
    this.torso.squash(-6);
    this.cameras.main.shake(70, 0.002);
    this.endStarted = false;
  }

  buildRampBackdrop() {
    // Underground ruins: crushed slabs, and far right — the cold glow.
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x06080c, 1);
    g.fillRect(6800, 3500, 4400, 2200);
    g.lineStyle(4, 0x11161f, 1);
    for (let i = 0; i < 13; i++) {
      const x = 7000 + i * 300;
      g.lineBetween(x, 4200 + (i % 4) * 160, x + 200, 4240 + (i % 4) * 160);
    }
    // Scattered limb silhouettes half-buried in the ruins — L2-2's theme
    // leaking into the end of L2-1.
    g.fillStyle(0x14181f, 1);
    [7600, 8200, 9300, 9900].forEach((x, i) => {
      g.fillEllipse(x, 4140 + (i % 2) * 60, 40, 12);
      g.fillEllipse(x + 26, 4134 + (i % 2) * 60, 14, 10);
    });

    // The prosthetic, jammed in the rubble, glowing cold.
    const px = RAMP.prostheticX;
    const gy = RAMP.endGroundY;
    g.fillStyle(0x181d26, 1);
    g.fillTriangle(px - 60, gy, px + 60, gy, px + 10, gy - 46);
    this.prosthetic = this.add.image(px, gy - 26, 'ch2-prosthetic').setDepth(3).setScale(0.4);
    this.prostheticGlow = this.add
      .image(px, gy - 26, 'ch2-mote')
      .setScale(12)
      .setTint(0x9fd8e8)
      .setAlpha(0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);
    this.tweens.add({
      targets: this.prostheticGlow,
      alpha: { from: 0.12, to: 0.3 },
      scale: { from: 10, to: 14 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
    });
  }

  updateEnd(dt) {
    // Input is gone. The torso rolls itself the last meters to the glow.
    const p = this.torso.p;
    const stopX = RAMP.prostheticX - 70;
    if (!p.grounded) {
      // Crossed the trigger mid-hop: land first, then keep rolling.
      this.torso.stepAirborne(dt, { left: false, right: false, jump: false }, this.rollField, { worldEnd: RAMP.worldEnd });
    } else if (p.grounded) {
      const dist = stopX - p.x;
      if (dist > 4) {
        p.speed = Phaser.Math.Linear(p.speed, Math.max(40, dist * 1.6), 0.08);
        const t = this.rollField.tangentAt(p.x);
        p.x += p.speed * t.x * dt;
        p.y = this.rollField.groundAt(p.x) - ROLL_TUNE.radius;
      } else {
        p.speed = 0;
        if (!this.endSettled) {
          this.endSettled = true;
          this.endSequence();
        }
      }
    }
    this.torso.updateFlesh(dt);
  }

  endSequence() {
    // The cold light notices him — then it takes the whole frame. It never
    // goes black: the glow IS the cut. L2-2 opens inside the same light.
    this.tweens.add({
      targets: this.prostheticGlow,
      alpha: 0.65,
      scale: 22,
      duration: 1600,
      ease: 'Quad.easeInOut',
    });
    synthThud(this, { freq: 50, gain: 0.25, dur: 1.4 });
    this.time.delayedCall(1700, () => {
      const veil = this.add
        .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x9fd8e8, 0)
        .setScrollFactor(0)
        .setDepth(100)
        .setBlendMode(Phaser.BlendModes.ADD);
      synthBuzz(this, { freq: 200, dur: 1.4, gain: 0.1 });
      this.tweens.add({
        targets: veil,
        alpha: 1,
        duration: 1400,
        ease: 'Quad.easeIn',
        onComplete: () => this.scene.start('Level22'),
      });
    });
  }

  // ------------------------------------------------------------ death & update

  startDeath() {
    this.deathFxStarted = true;
    this.deathAt = this.time.now;
  }

  updateDeath(dt) {
    this.torso.updateDead(dt, this.rollField);
    if (this.time.now - this.deathAt > 450) {
      playVoidDeath(this, () => {
        // Dying to the collapse rewinds the collapse too — fair, and the
        // dread rebuilds from the corridor mouth.
        if (this.phase === 'CHASE' || this.phase === 'CLIMB') {
          this.collapseX = Math.max(CHASE.collapseStartX, this.rollSpawn.x - 700);
          if (this.collapseFig) this.collapseFig.setPosition(this.collapseX, 4880);
          if (this.collapseSparks) this.collapseSparks.setPosition(this.collapseX, 4880);
          this.cling = null;
          if (this.phase === 'CLIMB') {
            // Dying in the slot rewinds to the corridor mouth: phase AND
            // camera, or the chase never restarts and the lens stays pinned
            // to the vent while the body re-forms 2000px behind it.
            this.phase = 'CHASE';
            this.cameras.main.setBounds(4200, 4650, 3400, 1400);
          }
        }
        this.torso.reset(this.rollSpawn);
        this.deathFxStarted = false;
        const cam = this.cameras.main;
        cam.setZoom(ROLL_TUNE.camZoomSlow);
        cam.startFollow(this.torso.blob, true, 0.1, 0.1);
        cam.setFollowOffset(0, 60);
        cam.flash(140, 159, 216, 232); // the body re-forms in a cold blink
      }, { panTo: { x: this.rollSpawn.x, y: this.rollSpawn.y } });
      this.deathAt = this.time.now + 999999; // fire once
    }
  }

  updateRoll(dt, worldEnd, killY) {
    const p = this.torso.p;
    if (p.dead) {
      this.updateDeath(dt);
      return;
    }

    const k = this.keys;
    const input = {
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      jump: Phaser.Input.Keyboard.JustDown(k.jump),
    };

    let ev = null;
    if (p.grounded) ev = this.torso.stepGrounded(dt, input, this.rollField, { worldEnd });
    else ev = this.torso.stepAirborne(dt, input, this.rollField, { worldEnd });

    if (ev === 'bonk') {
      this.cameras.main.shake(60, 0.002);
      synthThud(this, { freq: 110, gain: 0.2, dur: 0.2 });
    } else if (ev === 'land') {
      this.cameras.main.shake(90, 0.003);
      // Meat meets concrete: a heavy slap of grit and blood-fleck.
      this.add
        .particles(p.x, p.y - 4, 'ch2-mote', {
          speed: { min: 40, max: 160 },
          angle: { min: 200, max: 340 },
          lifespan: { min: 250, max: 550 },
          quantity: 10,
          scale: { min: 0.4, max: 1 },
          tint: [0x4a5563, 0x5c1216],
          emitting: false,
        })
        .setDepth(2)
        .explode(10);
    } else if (ev === 'slam') {
      this.startDeath();
      return;
    }

    this.torso.updateFlesh(dt);

    // Rolling drags meat across concrete — a grit trail behind the contact.
    if (p.grounded && Math.abs(p.speed) > 80) {
      this.rollDustAcc = (this.rollDustAcc || 0) + dt;
      if (this.rollDustAcc > 0.09) {
        this.rollDustAcc = 0;
        this.add
          .particles(p.x - Math.sign(p.speed) * 14, p.y - 6, 'ch2-mote', {
            speed: { min: 30, max: 110 },
            angle: { min: 200, max: 340 },
            lifespan: { min: 250, max: 500 },
            quantity: 3,
            scale: { min: 0.3, max: 0.8 },
            tint: [0x4a5563, 0x5c1216],
            emitting: false,
          })
          .setDepth(2)
          .explode(3);
      }
    }

    if (p.y > killY) {
      p.dead = true;
      this.startDeath();
      return;
    }

    // Camera breathes out with speed.
    const sp = Math.abs(p.grounded ? p.speed : p.vx);
    const cam = this.cameras.main;
    const targetZoom = Phaser.Math.Linear(
      ROLL_TUNE.camZoomSlow,
      ROLL_TUNE.camZoomFast,
      Phaser.Math.Clamp(sp / ROLL_TUNE.maxRoll, 0, 1),
    );
    cam.setZoom(Phaser.Math.Linear(cam.zoom, targetZoom, 0.04));
  }

  update(_, deltaMs) {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.ecgGfx && (this.phase === 'CS' || this.phase === 'CS_PAN')) this.updateOrMonitors();

    switch (this.phase) {
      case 'WALK':
        this.updateWalk(dt);
        break;
      case 'CS':
        this.updateCs();
        break;
      case 'ROLL1': {
        this.updateRoll(dt, 3120, ROLL1.killY);
        this.updateChunks(dt);
        // The floor hole: fall past its lip and the shaft takes over.
        const p = this.torso.p;
        if (!p.dead && p.x > ROLL1.exitX && p.y > 2360) this.setupShaft();
        break;
      }
      case 'SHAFT':
        this.updateShaft(dt);
        break;
      case 'CHASE':
        this.updateChase(dt);
        break;
      case 'CLIMB':
        this.updateClimb(dt);
        break;
      case 'RAMP':
        this.updateRoll(dt, RAMP.worldEnd, RAMP.killY);
        if (!this.endStarted && !this.torso.p.dead && this.torso.p.x > RAMP.endTriggerX) {
          this.endStarted = true;
          this.phase = 'END';
          this.hint.setText('');
        }
        break;
      case 'END':
        this.updateEnd(dt);
        break;
    }
  }
}
