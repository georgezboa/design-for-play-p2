import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';

/**
 * L2-1 torso-rolling feel prototype (?proto=roll).
 *
 * Arcade physics has no rotated-rectangle collision, so slopes are faked with
 * an ANALYTIC HEIGHTFIELD: the ground is a piecewise-linear contour y = h(x)
 * and the torso is a custom kinematic body projected onto it each frame.
 * Arcade is only used as the render/camera host — no physics bodies at all.
 *
 * Feel targets (from docs/chapter2-redesign.md §3.3):
 *   - A/D or arrows roll, Space hops (no cooldown, chain on landing, NO
 *     double jump)
 *   - downhill acceleration should read "hard to stop" within 3 seconds
 *   - high speed cap, heavy inertia, near-zero jump agency
 */

// Tuning — everything worth touching lives here.
const TUNE = {
  radius: 15,
  gravity: 1900,
  rollAccel: 480, // input push along the slope tangent — a torso, not a runner
  slopePull: 1700, // how hard gravity drags you down a slope
  groundFriction: 0.45, // fraction of speed bled per second while rolling
  airDrag: 0.06,
  airControl: 300,
  hopVelocity: -470, // shoulder hop: clears a debris bump, never a platform
  maxRoll: 640, // downhill terminal velocity — heavy, not a cannonball
  maxPush: 300, // soft cap for torso-power rolling on gentle ground
  maxAir: 800,
  wallSlope: 0.62, // |t.y| above this = a face too steep to roll up: it is a wall
  landSnap: 10, // max px the contour may fall away per frame before takeoff
  camZoomSlow: 1.08,
  camZoomFast: 0.9,
};

// The collapse route: mostly downhill (y grows downward). The two "spikes"
// are debris bumps with >50° faces — a torso cannot roll up them, they must
// be hopped. The small pit at 2000–2090 is a hop check; the big gap at
// 3050–3350 needs real speed.
const CONTOUR = [
  { x: 0, y: 320 },
  { x: 350, y: 320 }, // flat spawn pad
  { x: 900, y: 470 }, // first ramp: gentle
  { x: 1150, y: 480 }, // brief flat
  { x: 1180, y: 480 },
  { x: 1210, y: 442 }, // bump 1: steep face up
  { x: 1240, y: 480 }, // steep face down
  { x: 1700, y: 620 }, // steeper
  { x: 1750, y: 700 }, // drop ledge — becomes airborne
  { x: 1990, y: 778 },
  // PIT 2000–2140: too wide to roll at torso speed — hop it or die
  { x: 2150, y: 780 },
  { x: 2480, y: 780 },
  { x: 2510, y: 742 }, // bump 2
  { x: 2540, y: 780 },
  { x: 2950, y: 905 }, // long fast runout
  // GAP 3050–3350: fall in and you die
  { x: 3350, y: 940 },
  { x: 3900, y: 980 }, // landing flats
  { x: 4600, y: 980 },
];
const GAPS = [
  { from: 2000, to: 2140 },
  { from: 3050, to: 3350 },
];
const KILL_Y = 1250;
const SPAWN = { x: 120, y: 290 };
const WORLD_END = 4620;

export default class RollProtoScene extends Phaser.Scene {
  constructor() {
    super('RollProto');
  }

  create() {
    this.buildTextures();
    this.buildWorld();
    this.buildPlayer();
    this.buildCamera();
    this.buildHud();

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      jump: 'SPACE',
      restart: 'R',
    });
    this.input.keyboard.addCapture(['SPACE', 'LEFT', 'RIGHT']);
  }

  // -------------------------------------------------------------- heightfield

  /** Ground surface y at x, or null when x is inside a gap. */
  groundAt(x) {
    for (const g of GAPS) if (x >= g.from && x <= g.to) return null;
    if (x <= CONTOUR[0].x) return CONTOUR[0].y;
    for (let i = 0; i < CONTOUR.length - 1; i++) {
      const a = CONTOUR[i];
      const b = CONTOUR[i + 1];
      if (x >= a.x && x <= b.x) {
        const t = (x - a.x) / (b.x - a.x);
        return Phaser.Math.Linear(a.y, b.y, t);
      }
    }
    return CONTOUR[CONTOUR.length - 1].y;
  }

  /** Unit tangent of the contour at x (pointing +x, y grows downhill). */
  tangentAt(x) {
    const e = 2;
    const y0 = this.groundAt(x - e) ?? this.groundAt(x);
    const y1 = this.groundAt(x + e) ?? this.groundAt(x);
    const dx = 2 * e;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  // ------------------------------------------------------------------- build

  buildTextures() {
    // The torso is NOT a sphere. It is a wet cluster of lumps — ribcage mass,
    // shoulder, head stump — with creases between the lumps and one cold AI
    // core glowing through the flesh. Reference: INSIDE's final blob, kept
    // small enough to read as "what is left of a person".
    const g = this.make.graphics({ add: false });

    // --- blob body (40x40): overlapping flesh mounds, no perfect circle
    const FLESH = 0xa08a83;
    const FLESH_HI = 0xc4aca2;
    const FLESH_LO = 0x5d4b48;
    const lumps = [
      [20, 22, 13], // ribcage mass
      [12, 17, 9], // side slack
      [28, 15, 8], // shoulder
      [25, 29, 8], // hip sag
      [11, 27, 7], // lower slack
      [30, 9, 5], // head stump
    ];
    lumps.forEach(([x, y, r]) => {
      g.fillStyle(FLESH, 1);
      g.fillCircle(x, y, r);
    });
    // top-left sheen on each mound — wet flesh, not matte rubber
    lumps.forEach(([x, y, r]) => {
      g.fillStyle(FLESH_HI, 0.55);
      g.fillCircle(x - r * 0.28, y - r * 0.32, r * 0.5);
    });
    // rim light around the outer silhouette, or the body dies into the dark
    g.lineStyle(1.5, 0xd8c6bc, 0.75);
    lumps.forEach(([x, y, r]) => {
      g.beginPath();
      g.arc(x, y, r - 0.5, Math.PI * 0.7, Math.PI * 1.5);
      g.strokePath();
    });
    // creases where the mounds meet
    g.lineStyle(2, FLESH_LO, 0.8);
    g.beginPath();
    g.arc(16, 20, 8, 0.3, 1.7);
    g.strokePath();
    g.beginPath();
    g.arc(24, 22, 9, 1.6, 3.0);
    g.strokePath();
    g.lineStyle(1, FLESH_LO, 0.6);
    g.lineBetween(27, 12, 31, 8); // neck crease
    // surgical blood: one faint smear, not a splatter
    g.fillStyle(0x6e1f24, 0.5);
    g.fillEllipse(14, 30, 10, 4);
    // AI core: cold light under the skin
    g.fillStyle(0x9fd8e8, 1);
    g.fillCircle(19, 19, 2.5);
    g.generateTexture('proto-blob', 40, 40);
    g.clear();

    // --- sub-surface lump: soft mound that slides under the skin as it rolls
    g.fillStyle(FLESH_HI, 0.8);
    g.fillCircle(5, 5, 4);
    g.fillStyle(FLESH, 0.9);
    g.fillCircle(6, 6, 3);
    g.generateTexture('proto-lump', 10, 10);
    g.clear();

    // --- limb stump: tapered flesh tube with a dark sealed end
    g.fillStyle(FLESH, 1);
    g.fillRoundedRect(3, 0, 8, 16, 4);
    g.fillStyle(FLESH_LO, 1);
    g.fillEllipse(7, 16, 8, 5); // sealed wound end
    g.fillStyle(FLESH_HI, 0.5);
    g.fillRect(4, 1, 3, 10);
    g.lineStyle(1, 0xd8c6bc, 0.6);
    g.lineBetween(3, 2, 3, 14);
    g.generateTexture('proto-stump', 14, 20);
    g.clear();

    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('proto-mote', 8, 8);
    g.destroy();
  }

  buildWorld() {
    // Night-lab gradient.
    const sky = this.add.graphics().setScrollFactor(0).setDepth(0);
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      sky.fillStyle(Phaser.Display.Color.GetColor(6 + 14 * t, 10 + 12 * t, 20 + 18 * t), 1);
      sky.fillRect(0, (GAME_H / 40) * i, GAME_W, GAME_H / 40 + 1);
    }

    // Ground fill: contour polyline closed along the bottom, gap-aware.
    const g = this.add.graphics().setDepth(2);
    const rim = this.add.graphics().setDepth(3);
    let pen = null;
    const flush = () => {
      if (!pen) return;
      g.lineTo(pen.x, GAME_H * 3);
      g.lineTo(pen.startX, GAME_H * 3);
      g.closePath();
      g.fillPath();
      pen = null;
    };
    for (let x = 0; x <= 4800; x += 8) {
      const y = this.groundAt(x);
      if (y === null) {
        flush();
        continue;
      }
      if (!pen) {
        pen = { startX: x, x };
        g.fillStyle(0x11151d, 1);
        g.beginPath();
        g.moveTo(x, y);
      } else {
        g.lineTo(x, y);
        pen.x = x;
      }
      // Surface rim light — the only edge cue, per the value-ramp rule.
      rim.lineStyle(2, 0x3a4a5c, 1);
      rim.lineBetween(x - 8, this.groundAt(x - 8) ?? y, x, y);
    }
    flush();

    // Rubble wall closing the prototype route.
    const wallY = this.groundAt(WORLD_END);
    g.fillStyle(0x181d26, 1);
    g.fillRect(WORLD_END, wallY - 130, 90, 130);
    rim.lineStyle(2, 0x3a4a5c, 1);
    rim.lineBetween(WORLD_END, wallY - 130, WORLD_END, wallY);
    this.add
      .text(WORLD_END - 14, wallY - 160, 'END OF PROTOTYPE', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#4a545f',
      })
      .setOrigin(1, 0)
      .setDepth(4);

    // Falling-debris streaks for speed sensation.
    this.debris = this.add.particles(0, 0, 'proto-mote', {
      x: { min: -40, max: GAME_W + 40 },
      y: { min: -30, max: GAME_H },
      lifespan: 1400,
      speedX: { min: -260, max: -120 },
      speedY: { min: 40, max: 120 },
      scale: { min: 0.2, max: 0.7 },
      alpha: { start: 0.5, end: 0 },
      quantity: 1,
      frequency: 60,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.debris.setScrollFactor(0).setDepth(6);
  }

  buildPlayer() {
    this.p = {
      x: SPAWN.x,
      y: SPAWN.y,
      vx: 0,
      vy: 0,
      speed: 0, // signed speed along the tangent while grounded
      grounded: true,
      angle: 0,
      dead: false,
    };

    // Flesh assembly: body + under-skin lumps + two dangling stumps, all in
    // one container. Jelly scale and stump pendulums are integrated per frame
    // in updateFlesh().
    this.blob = this.add.container(this.p.x, this.p.y).setDepth(5);
    this.bodyImg = this.add.image(0, 0, 'proto-blob');

    this.lumpRing = this.add.container(0, 0);
    const lumpSpots = [
      [8, -2],
      [-6, 5],
      [2, 9],
      [-9, -4],
    ];
    this.lumps = lumpSpots.map(([lx, ly]) => this.add.image(lx, ly, 'proto-lump'));
    this.lumpRing.add(this.lumps);

    // Stumps ride the body's rim; swing state lives alongside.
    this.stumps = [
      { img: this.add.image(0, 0, 'proto-stump').setOrigin(0.5, 0.2), base: 2.1, swing: 0, swingV: 0 },
      { img: this.add.image(0, 0, 'proto-stump').setOrigin(0.5, 0.2), base: 4.4, swing: 0, swingV: 0 },
    ];

    this.blob.add([this.bodyImg, this.lumpRing, ...this.stumps.map((s) => s.img)]);

    this.jelly = 0; // squash/stretch impulse, decays with a spring
    this.jellyV = 0;
    this.lastSpinV = 0;

    this.coreLight = this.add
      .image(this.p.x, this.p.y, 'proto-mote')
      .setScale(6)
      .setTint(0x9fd8e8)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);
  }

  buildCamera() {
    this.cameras.main.setBounds(0, 0, 4800, KILL_Y + 200);
    this.cameras.main.startFollow(this.blob, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, 60);
  }

  buildHud() {
    this.hud = this.add
      .text(12, 10, '', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#7f8b99',
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.add
      .text(GAME_W - 12, 10, 'ROLL PROTOTYPE — A/D or ←/→ roll · SPACE hop · fall = die', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '11px',
        color: '#4a545f',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);
  }

  // ------------------------------------------------------------------ update

  update(_, deltaMs) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.scene.restart();
      return;
    }
    const dt = Math.min(deltaMs, 50) / 1000;
    const p = this.p;

    if (p.dead) {
      // The fall continues for half a second with the camera riding it, then
      // the impact plays out off-screen: blood on the lens, thud, black.
      p.vy += TUNE.gravity * dt;
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      // Never let the corpse tunnel through terrain during the death fall.
      const gyDead = this.groundAt(p.x);
      if (gyDead !== null && p.y + TUNE.radius > gyDead + 4) p.vx = 0;
      this.updateFlesh(dt);
      if (!this.deathFxDone && this.time.now - this.deathAt > 450) this.runDeathFx();
      return;
    }

    const k = this.keys;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(k.jump);

    if (p.grounded) this.stepGrounded(dt, { left, right, jump });
    else this.stepAirborne(dt, { left, right, jump });

    this.updateFlesh(dt);

    // Falling into the void starts the death sequence — the kill plane only
    // *starts* it; the gore plays out in runDeathFx half a second later.
    if (p.y > KILL_Y) {
      p.dead = true;
      this.deathAt = this.time.now;
    }

    // Camera breathes out with speed.
    const sp = Math.abs(p.grounded ? p.speed : p.vx);
    const targetZoom = Phaser.Math.Linear(
      TUNE.camZoomSlow,
      TUNE.camZoomFast,
      Phaser.Math.Clamp(sp / TUNE.maxRoll, 0, 1),
    );
    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.04));

    this.hud.setText(
      `speed ${Math.round(sp)} px/s  ${p.grounded ? 'GROUND' : 'AIR'}  x ${Math.round(p.x)}`,
    );
  }

  /**
   * Death by void, per the design doc §6: no instant teleport. The screen
   * takes the impact — blood thrown up from below the frame, a red pulse, a
   * low thud — then black, then the sub-level start.
   */
  runDeathFx() {
    this.deathFxDone = true;

    // Blood hits the lens from below.
    this.add
      .particles(0, 0, 'proto-mote', {
        x: { min: 0, max: GAME_W },
        y: GAME_H + 12,
        speedY: { min: -760, max: -320 },
        speedX: { min: -140, max: 140 },
        gravityY: 1300,
        lifespan: { min: 500, max: 1100 },
        quantity: 70,
        scale: { min: 0.5, max: 2.2 },
        tint: [0x8e1f24, 0x5c1216, 0xb03036],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(90)
      .explode(70);

    this.cameras.main.flash(220, 140, 20, 26);
    this.thud();

    this.cameras.main.fadeOut(750, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.resetRun();
      this.cameras.main.fadeIn(420, 0, 0, 0);
    });
  }

  /** Low body-hitting-concrete thud, synthesized — no asset. */
  thud() {
    try {
      const ctx = this.sound.context;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, t0);
      osc.frequency.exponentialRampToValueAtTime(28, t0 + 0.28);
      gain.gain.setValueAtTime(0.55, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.45);
    } catch (e) {
      /* audio context locked until first gesture; gore still plays */
    }
  }

  resetRun() {
    const p = this.p;
    p.x = SPAWN.x;
    p.y = SPAWN.y;
    p.vx = 0;
    p.vy = 0;
    p.speed = 0;
    p.grounded = true;
    p.dead = false;
    this.deathFxDone = false;
    this.jelly = 0;
    this.jellyV = 0;
  }

  /**
   * Soft-body pass. The body image rotates with roll speed while a jelly
   * spring squashes it perpendicular to the motion; under-skin lumps churn at
   * a fraction of the body spin; stumps dangle on pendulums whipped by
   * angular acceleration. None of this touches physics — it is pure flesh.
   */
  updateFlesh(dt) {
    const p = this.p;
    const spinV = p.grounded ? p.speed : p.vx;
    p.angle += (spinV / TUNE.radius) * dt;

    // Jelly spring toward rest. Impulses come from squash() on landings,
    // bonks and takeoffs.
    this.jellyV += (-this.jelly * 140 - this.jellyV * 10) * dt;
    this.jelly += this.jellyV * dt;
    const jx = 1 + this.jelly;
    const jy = 1 - this.jelly * 0.8;
    this.blob.setScale(jx, jy);
    this.blob.setPosition(p.x, p.y);

    this.bodyImg.setRotation(p.angle);

    // Flesh churn: the lumps slide at a third of the body spin plus a slow
    // idle drift, so the silhouette never reads as a rigid ball.
    this.lumpRing.setRotation(p.angle * 0.34 + this.time.now * 0.0004);

    // Stump pendulums: dangle toward world-down, whipped by angular accel.
    const angAccel = (spinV - this.lastSpinV) / Math.max(dt, 1e-4);
    this.lastSpinV = spinV;
    const R = TUNE.radius + 3;
    this.stumps.forEach((st) => {
      st.swingV += (-st.swing * 60 - st.swingV * 6 - angAccel * 0.004) * dt;
      st.swing += st.swingV * dt;
      const anchor = p.angle + st.base;
      st.img.setPosition(Math.cos(anchor) * R, Math.sin(anchor) * R);
      // Point down-ish: rest pose hangs along gravity, swing adds the whip.
      st.img.setRotation(Math.PI / 2 - anchor * 0.22 + st.swing);
    });

    this.coreLight.setPosition(p.x, p.y);
  }

  /** Squash impulse: positive = stretch along travel, negative = flatten. */
  squash(amount) {
    this.jellyV += amount;
  }

  stepGrounded(dt, input) {
    const p = this.p;
    const t = this.tangentAt(p.x);

    // Gravity along the slope (t.y > 0 going downhill) + input push.
    p.speed += TUNE.slopePull * t.y * t.x * dt * 2;
    if (input.left && !input.right) p.speed -= TUNE.rollAccel * dt;
    else if (input.right && !input.left) p.speed += TUNE.rollAccel * dt;

    // Rolling resistance: multiplicative so high speed bleeds hardest, but a
    // steep enough slope always wins — that is the "cannot stop" feel.
    p.speed *= Math.max(0, 1 - TUNE.groundFriction * dt);

    // Two-speed feel: leg power alone tops out at maxPush; only gravity on a
    // real slope may carry you beyond it. Excess speed on gentle ground is
    // bled off smoothly, not clamped, so downhill momentum survives the flats
    // for a beat instead of dying at the slope's foot.
    const cap = Math.abs(t.y) > 0.18 ? TUNE.maxRoll : TUNE.maxPush;
    const over = Math.abs(p.speed) - cap;
    if (over > 0) p.speed -= Math.sign(p.speed) * over * 3 * dt;
    p.speed = Phaser.Math.Clamp(p.speed, -TUNE.maxRoll, TUNE.maxRoll);

    // A face steeper than wallSlope in the direction of travel is not a slope
    // to a limbless torso — it is a wall. Bonk and bounce back; this is what
    // makes debris bumps mandatory hops instead of speed bumps.
    if (p.speed !== 0 && -t.y * Math.sign(p.speed) > TUNE.wallSlope) {
      p.speed = -p.speed * 0.22;
      this.squash(-5); // splat against the face
      this.cameras.main.shake(60, 0.002);
      return;
    }

    let nx = p.x + p.speed * t.x * dt;

    // End of the collapse route: a wall of rubble. The prototype stops here.
    if (nx >= WORLD_END - TUNE.radius) {
      nx = WORLD_END - TUNE.radius;
      p.speed = 0;
    }
    const gy = this.groundAt(nx);

    // Shoulder hop: grounded only, no cooldown, no double jump.
    if (input.jump) {
      p.grounded = false;
      p.vx = p.speed * t.x;
      p.vy = TUNE.hopVelocity;
      p.y -= 2;
      this.squash(4.5); // takeoff stretch
      return;
    }

    if (gy === null || gy - TUNE.radius > p.y + TUNE.landSnap) {
      // Contour fell away: lip of a drop or a gap — go ballistic.
      p.grounded = false;
      p.vx = p.speed * t.x;
      p.vy = Math.max(0, p.speed * t.y);
      p.x = nx;
      p.y += Math.max(0, p.speed * t.y) * dt;
      return;
    }

    p.x = nx;
    p.y = gy - TUNE.radius;
  }

  stepAirborne(dt, input) {
    const p = this.p;
    p.vy += TUNE.gravity * dt;
    if (input.left && !input.right) p.vx -= TUNE.airControl * dt;
    else if (input.right && !input.left) p.vx += TUNE.airControl * dt;
    p.vx *= Math.max(0, 1 - TUNE.airDrag * dt);
    p.vx = Phaser.Math.Clamp(p.vx, -TUNE.maxAir, TUNE.maxAir);
    p.vy = Math.min(p.vy, TUNE.maxAir * 1.4);

    const gyBefore = this.groundAt(p.x);
    const xBefore = p.x;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x > WORLD_END - TUNE.radius) {
      p.x = WORLD_END - TUNE.radius;
      p.vx = 0;
    }

    const gy = this.groundAt(p.x);

    // Crossing a gap's far edge: if the body arrives BELOW the lip it does
    // not get snapped up onto the platform — it slams the edge and goes down
    // into the void. This is what makes the pit lethal at roll speed instead
    // of a free teleport to the other side.
    if (gyBefore === null && gy !== null && p.y + TUNE.radius > gy + 10) {
      // Slam the edge: push the body back out to the void side of the wall
      // and ricochet with the horizontal speed killed, or the corpse keeps
      // its vx / wall overlap and tunnels under the platform on the way down.
      p.dead = true;
      p.x = xBefore - 2;
      p.vx = -Math.min(120, Math.abs(p.vx) * 0.25);
      this.deathAt = this.time.now;
      this.squash(-6);
      return;
    }

    if (gy !== null && p.y + TUNE.radius >= gy && p.vy > 0) {
      // Land: project velocity onto the slope tangent. Steep landings keep
      // most of the speed — momentum is the whole point of this form.
      const t = this.tangentAt(p.x);
      p.speed = p.vx * t.x + p.vy * t.y;
      p.grounded = true;
      p.y = gy - TUNE.radius;
      this.squash(-Phaser.Math.Clamp(p.vy / 260, 2, 8)); // flesh flattens on impact
      this.cameras.main.shake(90, 0.003);
    }
  }
}
