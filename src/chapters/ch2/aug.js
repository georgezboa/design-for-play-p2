import Phaser from 'phaser';
import { Heightfield } from './torso.js';

/**
 * Chapter 2 L2-2 shared kit — the augmented body and the things that hunt it.
 *
 *   makeAugTextures   metal-limbed player parts, cyberpsycho parts, shards,
 *                     anchor rings, gibs — all procedural, no assets
 *   AugPlayer         metal humanoid on a Heightfield: walk, chain-jump
 *                     (no double jump), SHIFT rush, slash attack,
 *                     web-swing grapple arm
 *   Psycho            surgical-failure enemy: twitchy dashes, windup lunge,
 *                     3 hits to kill, drops shards that feed the parasite
 */

export const AUG_TUNE = {
  walkSpeed: 260,
  airAccel: 1200,
  airMax: 300,
  gravity: 1900,
  jumpVelocity: -760, // restored, not a moon jump — big gaps belong to the arm
  halfH: 30,
  stepSnap: 18, // max ground rise the legs walk over without jumping
  slashCooldown: 300,
  slashReach: 58,
  slashArc: 46, // vertical half-extent of the slash hitbox
  hitstopMs: 110,
  killHitstopMs: 200,
  invulnMs: 1200,
  knockback: 340,
  hitPopVy: -170, // hits lift the body off the ground
  killLaunchVy: -330,
  armReach: 380, // auto-aim grapple — Spider-Man range, not a handshake
  armExtendMs: 120,
  swingPump: 980, // tangential accel from A/D while swinging
  swingReel: 260, // the winch zips him up into the arc, Spider-Man style
  swingReleaseBoost: 1.14,
  swingJumpKick: 140, // extra upward kick when releasing with SPACE
  dashSpeed: 950, // SHIFT — rush
  dashMs: 180,
  dashCooldownMs: 700,
  lives: 3,
};

// ------------------------------------------------------------------ textures

export function makeAugTextures(scene) {
  if (scene.textures.exists('ch2-aug-body')) return;
  const g = scene.make.graphics({ add: false });

  const STEEL = 0x39424e;
  const STEEL_HI = 0x5d6a78;
  const STEEL_LO = 0x232a34;
  const SEAM = 0x9fd8e8;
  const SEAM_HOT = 0xe8fbff;

  // All baked at 2.5x and drawn at 0.4 — panel lines and rivets stay legible
  // instead of dissolving into single pixels.

  // Augmented body: gunmetal torso with cold seams and the AI core.
  g.fillStyle(STEEL, 1);
  g.fillRoundedRect(0, 0, 40, 65, 9);
  // side shadow + left rim light: the body is a cylinder, not a card
  g.fillStyle(STEEL_LO, 0.8);
  g.fillRoundedRect(28, 2, 11, 61, 6);
  g.lineStyle(2, STEEL_HI, 0.9);
  g.lineBetween(2, 6, 2, 58);
  // chest plate with shade bands
  g.fillStyle(STEEL_HI, 0.55);
  g.fillRoundedRect(5, 5, 16, 22, 4);
  g.fillStyle(STEEL_LO, 0.5);
  g.fillRoundedRect(5, 18, 16, 9, 3);
  // ab segments
  g.fillStyle(STEEL_LO, 0.65);
  g.fillRect(4, 34, 32, 3);
  g.fillRect(4, 44, 32, 3);
  g.fillRect(4, 54, 32, 3);
  // glowing seams
  g.lineStyle(2, SEAM, 0.9);
  g.lineBetween(5, 15, 35, 15);
  g.lineBetween(5, 39, 35, 39);
  g.lineStyle(1, SEAM_HOT, 0.7);
  g.lineBetween(5, 14, 35, 14);
  // the core, now in a metal chest — halo baked in
  g.fillStyle(SEAM, 0.3);
  g.fillCircle(20, 25, 9);
  g.fillStyle(SEAM, 0.85);
  g.fillCircle(20, 25, 5.5);
  g.fillStyle(SEAM_HOT, 1);
  g.fillCircle(20, 25, 2.6);
  // shoulder caps + rivets
  g.fillStyle(STEEL_HI, 0.9);
  g.fillCircle(6, 7, 5);
  g.fillCircle(34, 7, 5);
  g.fillStyle(STEEL_LO, 1);
  g.fillCircle(6, 7, 2);
  g.fillCircle(34, 7, 2);
  g.generateTexture('ch2-aug-body', 40, 65);
  g.clear();

  // head: sensor dome, one calm slit eye, jaw plate
  g.fillStyle(STEEL, 1);
  g.fillCircle(15, 15, 15);
  g.fillStyle(STEEL_LO, 0.75);
  g.fillCircle(20, 20, 11);
  g.fillStyle(STEEL, 1);
  g.fillCircle(13, 12, 12);
  g.fillStyle(STEEL_HI, 0.6);
  g.fillCircle(9, 8, 5);
  // visor slit
  g.fillStyle(0x0a0e14, 1);
  g.fillRoundedRect(8, 13, 17, 5, 2);
  g.fillStyle(SEAM, 1);
  g.fillRoundedRect(10, 14.5, 12, 2, 1);
  g.fillStyle(SEAM_HOT, 1);
  g.fillCircle(19, 15.5, 1.4);
  // rim arc
  g.lineStyle(1.8, 0xd8e4ec, 0.6);
  g.beginPath();
  g.arc(15, 15, 13, Math.PI * 0.8, Math.PI * 1.5);
  g.strokePath();
  // neck seal
  g.fillStyle(STEEL_LO, 1);
  g.fillRect(9, 27, 12, 3);
  g.generateTexture('ch2-aug-head', 30, 30);
  g.clear();

  // arm: two segments, hydraulic spine, glowing joint band
  g.fillStyle(STEEL, 1);
  g.fillRoundedRect(0, 0, 13, 45, 4);
  g.fillStyle(STEEL_LO, 0.7);
  g.fillRoundedRect(8, 1, 5, 43, 2);
  g.fillStyle(STEEL_HI, 1);
  g.fillRect(0, 20, 13, 5); // joint band
  g.fillStyle(STEEL_LO, 1);
  g.fillRect(3, 22, 7, 1.6);
  g.lineStyle(1.6, SEAM, 0.75);
  g.lineBetween(2, 3, 2, 42);
  g.lineStyle(1, STEEL_HI, 0.8);
  g.lineBetween(5, 4, 5, 18);
  g.lineBetween(5, 27, 5, 41);
  g.fillStyle(SEAM, 0.9);
  g.fillCircle(6.5, 22.5, 1.6); // joint diode
  g.generateTexture('ch2-aug-arm', 13, 45);
  g.clear();

  // leg: thigh/shin split, knee band, foot wedge
  g.fillStyle(STEEL, 1);
  g.fillRoundedRect(0, 0, 15, 50, 4);
  g.fillStyle(STEEL_LO, 0.7);
  g.fillRoundedRect(9, 1, 6, 48, 2);
  g.fillStyle(STEEL_HI, 1);
  g.fillRect(0, 23, 15, 5); // knee band
  g.fillStyle(STEEL_LO, 1);
  g.fillRect(4, 25, 8, 1.6);
  g.lineStyle(1.6, SEAM, 0.75);
  g.lineBetween(2, 3, 2, 47);
  g.fillStyle(STEEL_HI, 0.9);
  g.fillRect(1, 44, 13, 5); // foot wedge
  g.fillStyle(SEAM, 0.9);
  g.fillCircle(7.5, 25.5, 1.6);
  g.generateTexture('ch2-aug-leg', 15, 50);
  g.clear();

  // Slash crescent: white-hot leading edge with a cold core — the blade's
  // afterimage, not a rectangle. Centered, swept rightward (mirror with scaleX).
  g.lineStyle(20, 0xd8f4fc, 0.95);
  g.beginPath();
  g.arc(100, 100, 60, -1.05, 1.05);
  g.strokePath();
  g.lineStyle(9, 0x27e0f5, 0.9);
  g.beginPath();
  g.arc(100, 100, 72, -0.9, 0.9);
  g.strokePath();
  g.lineStyle(5, 0xffffff, 0.8);
  g.beginPath();
  g.arc(100, 100, 48, -0.7, 0.7);
  g.strokePath();
  // sparks trailing the tip
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(152, 72, 2.4);
  g.fillCircle(158, 100, 3);
  g.fillCircle(152, 128, 2.4);
  g.fillStyle(0x27e0f5, 0.8);
  g.fillCircle(146, 84, 1.6);
  g.fillCircle(146, 116, 1.6);
  g.generateTexture('ch2-crescent', 200, 200);
  g.clear();

  // Cyberpsycho: patchwork of flesh and rejects, one red eye.
  const FLESH = 0x8a736c;
  const FLESH_HI = 0xa88e85;
  const FLESH_LO = 0x4d3c38;
  g.fillStyle(FLESH, 1);
  g.fillRoundedRect(0, 0, 40, 65, 9);
  g.fillStyle(FLESH_LO, 0.6);
  g.fillRoundedRect(28, 2, 11, 61, 6);
  g.fillStyle(FLESH_HI, 0.4);
  g.fillRoundedRect(4, 4, 12, 20, 4);
  // metal grafts: right chest plate, left hip — bolted, not grown
  g.fillStyle(STEEL, 1);
  g.fillRect(20, 0, 20, 32);
  g.fillRect(0, 40, 17, 25);
  g.fillStyle(STEEL_HI, 0.6);
  g.fillRect(22, 2, 8, 28);
  g.lineStyle(1.4, STEEL_LO, 0.9);
  g.lineBetween(20, 0, 20, 32);
  g.lineBetween(0, 40, 17, 40);
  // graft seam: angry red flesh at the metal's edge
  g.lineStyle(2, 0x6e1f24, 0.85);
  g.lineBetween(19, 2, 19, 30);
  g.lineBetween(2, 39, 15, 39);
  // rivets on the plate
  g.fillStyle(STEEL_HI, 1);
  g.fillCircle(24, 5, 1.8);
  g.fillCircle(34, 5, 1.8);
  g.fillCircle(24, 27, 1.8);
  g.fillCircle(34, 27, 1.8);
  // stitches down the sternum
  g.lineStyle(1.5, FLESH_LO, 0.9);
  g.lineBetween(8, 10, 8, 34);
  g.lineStyle(1.5, 0x2a2020, 0.9);
  for (let i = 0; i < 5; i++) g.lineBetween(5, 12 + i * 5, 11, 14 + i * 5);
  g.generateTexture('ch2-psy-body', 40, 65);
  g.clear();

  g.fillStyle(FLESH, 1);
  g.fillCircle(15, 15, 15);
  g.fillStyle(FLESH_LO, 0.55);
  g.fillCircle(20, 20, 11);
  g.fillStyle(FLESH, 1);
  g.fillCircle(13, 12, 12);
  // metal skullcap, riveted
  g.fillStyle(STEEL, 1);
  g.fillCircle(20, 12, 9);
  g.fillStyle(STEEL_HI, 0.7);
  g.fillCircle(18, 10, 4);
  g.fillStyle(STEEL_HI, 1);
  g.fillCircle(14, 8, 1.4);
  g.fillCircle(25, 10, 1.4);
  g.fillStyle(0x6e1f24, 0.8);
  g.fillCircle(12, 14, 3); // torn scalp at the cap's edge
  // the red eye — halo baked in
  g.fillStyle(0xff2d3c, 0.35);
  g.fillCircle(17, 16, 7);
  g.fillStyle(0xff2d3c, 1);
  g.fillCircle(17, 16, 3.4);
  g.fillStyle(0xffd0d4, 1);
  g.fillCircle(17, 16, 1.4);
  g.generateTexture('ch2-psy-head', 30, 30);
  g.clear();

  g.fillStyle(FLESH, 1);
  g.fillRoundedRect(0, 0, 15, 48, 4);
  g.fillStyle(FLESH_LO, 0.5);
  g.fillRoundedRect(9, 1, 6, 46, 2);
  g.fillStyle(FLESH_HI, 0.45);
  g.fillRect(2, 3, 4, 20);
  // metal forearm / shin graft
  g.fillStyle(STEEL, 1);
  g.fillRect(0, 25, 15, 23);
  g.fillStyle(STEEL_HI, 0.6);
  g.fillRect(2, 27, 5, 19);
  g.lineStyle(2, 0x6e1f24, 0.85);
  g.lineBetween(1, 24, 14, 24); // graft seam
  g.lineStyle(1.4, FLESH_LO, 0.8);
  g.lineBetween(3, 4, 3, 22);
  g.fillStyle(STEEL_HI, 1);
  g.fillCircle(4, 29, 1.5);
  g.fillCircle(11, 29, 1.5);
  g.generateTexture('ch2-psy-limb', 15, 48);
  g.clear();

  // Metal shard: feeds the parasite. Jagged plate with a torn bright edge.
  g.fillStyle(STEEL_HI, 1);
  g.beginPath();
  g.moveTo(0, 8);
  g.lineTo(13, 0);
  g.lineTo(20, 10);
  g.lineTo(15, 20);
  g.lineTo(3, 17);
  g.closePath();
  g.fillPath();
  g.fillStyle(STEEL, 0.85);
  g.beginPath();
  g.moveTo(5, 9);
  g.lineTo(13, 4);
  g.lineTo(17, 10);
  g.lineTo(12, 16);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.6, SEAM, 0.7);
  g.lineBetween(5, 8, 15, 10);
  g.lineStyle(1.2, 0xd8e4ec, 0.6);
  g.lineBetween(2, 7, 12, 1);
  g.generateTexture('ch2-shard', 20, 20);
  g.clear();

  // Anchor ring: the fixed glow the arm grabs — twin rings + core, halo baked.
  g.fillStyle(SEAM, 0.14);
  g.fillCircle(30, 30, 28);
  g.lineStyle(7, SEAM, 1);
  g.strokeCircle(30, 30, 22);
  g.lineStyle(3.5, 0xd8f4fc, 0.95);
  g.strokeCircle(30, 30, 15);
  g.fillStyle(SEAM, 0.4);
  g.fillCircle(30, 30, 12);
  g.fillStyle(SEAM_HOT, 0.9);
  g.fillCircle(30, 30, 5);
  g.generateTexture('ch2-anchor', 60, 60);
  g.clear();

  // Gib: flesh-metal chunk for kills.
  g.fillStyle(FLESH, 1);
  g.beginPath();
  g.moveTo(3, 5);
  g.lineTo(18, 0);
  g.lineTo(25, 12);
  g.lineTo(15, 25);
  g.lineTo(0, 18);
  g.closePath();
  g.fillPath();
  g.fillStyle(FLESH_HI, 0.5);
  g.fillCircle(9, 8, 5);
  g.fillStyle(STEEL, 1);
  g.fillRect(10, 8, 12, 10);
  g.fillStyle(STEEL_HI, 0.6);
  g.fillRect(12, 9, 5, 8);
  g.fillStyle(0x8e1f24, 0.9);
  g.fillCircle(8, 15, 5);
  g.fillStyle(0x5c1216, 1);
  g.fillCircle(10, 17, 2.5);
  g.generateTexture('ch2-gib', 25, 25);
  g.clear();

  // Metal arm (the extendable one): segmented telescoping bar, claw end.
  g.fillStyle(STEEL, 1);
  g.fillRect(0, 0, 60, 12);
  g.fillStyle(STEEL_LO, 0.8);
  g.fillRect(0, 7, 60, 5);
  g.fillStyle(STEEL_HI, 0.8);
  g.fillRect(0, 1, 60, 3);
  // segment seams
  g.lineStyle(1.6, STEEL_LO, 1);
  for (let x = 12; x < 50; x += 12) g.lineBetween(x, 0, x, 12);
  g.lineStyle(1.6, SEAM, 0.8);
  g.lineBetween(2, 2.5, 58, 2.5);
  // claw end
  g.fillStyle(STEEL_HI, 1);
  g.fillRect(50, 0, 10, 12);
  g.fillStyle(SEAM_HOT, 0.9);
  g.fillCircle(55, 6, 2.2);
  g.generateTexture('ch2-extarm', 60, 12);
  g.clear();

  // Ernest's prototype emitter — salvaged from what's left of him.
  g.fillStyle(STEEL, 1);
  g.fillRoundedRect(0, 10, 65, 17, 5); // receiver
  g.fillRect(50, 5, 25, 10); // barrel shroud
  g.fillStyle(STEEL_LO, 0.8);
  g.fillRect(0, 20, 65, 7);
  g.fillStyle(STEEL_HI, 1);
  g.fillRect(70, 7, 8, 12); // muzzle
  g.fillStyle(STEEL_HI, 0.6);
  g.fillRect(4, 12, 30, 4);
  g.fillStyle(SEAM, 1);
  g.fillRect(15, 27, 12, 17); // grip
  g.fillStyle(STEEL_LO, 1);
  g.fillRect(15, 34, 12, 3);
  g.fillRect(15, 40, 12, 3);
  // the cell, still warm
  g.fillStyle(0x9fd8e8, 0.35);
  g.fillRoundedRect(26, 9, 24, 12, 3);
  g.fillStyle(0x9fd8e8, 1);
  g.fillRoundedRect(30, 12, 16, 6, 2);
  g.fillStyle(0xe8fbff, 1);
  g.fillRect(34, 13, 8, 3);
  g.generateTexture('ch2-lasergun', 78, 45);
  g.destroy();
}

// ------------------------------------------------------------------ aug player

export class AugPlayer {
  /** feet-origin metal humanoid on a Heightfield. */
  constructor(scene, spawn, field) {
    this.scene = scene;
    this.field = field;
    this.p = {
      x: spawn.x,
      y: spawn.y, // feet y
      vx: 0,
      vy: 0,
      grounded: true,
      facing: 1,
      dead: false,
    };
    this.lives = AUG_TUNE.lives;
    this.invulnUntil = 0;
    this.slashReadyAt = 0;
    this.armSwingUntil = 0; // while active, the combo owns the sword arm's pose
    this.dashReadyAt = 0;
    this.dashUntil = 0;
    this.shards = 0; // absorbed metal — the parasite's growth counter

    this.fig = scene.add.container(this.p.x, this.p.y).setDepth(5);
    this.parts = {
      body: scene.add.image(0, -32, 'ch2-aug-body').setScale(0.4),
      head: scene.add.image(1, -52, 'ch2-aug-head').setScale(0.4),
      armL: scene.add.image(-10, -44, 'ch2-aug-arm').setOrigin(0.5, 0.08).setScale(0.4),
      armR: scene.add.image(10, -44, 'ch2-aug-arm').setOrigin(0.5, 0.08).setScale(0.4),
      legL: scene.add.image(-4, -20, 'ch2-aug-leg').setOrigin(0.5, 0.05).setScale(0.4),
      legR: scene.add.image(4, -20, 'ch2-aug-leg').setOrigin(0.5, 0.05).setScale(0.4),
    };
    this.fig.add(Object.values(this.parts));

    // The extendable arm — hidden until E.
    this.arm = scene.add.image(0, 0, 'ch2-extarm').setOrigin(0, 0.5).setDepth(6).setVisible(false);

    // Absorbed shards ride the body (stage visuals attach here).
    this.shardLayer = scene.add.container(0, 0);
    this.fig.add(this.shardLayer);

    this.coreGlow = scene.add
      .image(this.p.x, this.p.y - 32, 'ch2-mote')
      .setScale(5)
      .setTint(0x9fd8e8)
      .setAlpha(0.25)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);

    this.walkPhase = 0;
    this.armState = null; // null | {phase:'extend'|'pull', ...}
    this.landWobble = 0; // touchdown squash spring
    this.landWobbleV = 0;
    this.lastLandImpact = 0;
  }

  /** Spring kick on touchdown — the metal frame remembers the floor. */
  landKick(impact = 400) {
    this.landWobbleV += Phaser.Math.Clamp(impact / 900, 0.25, 0.9);
  }

  get hurt() {
    return this.scene.time.now < this.invulnUntil;
  }

  setVisible(v) {
    this.fig.setVisible(v);
    this.coreGlow.setVisible(v);
  }

  /**
   * Platformer step. input: {left,right,jump,dash}. Returns 'land' on
   * touchdown, 'dash' on the frame a rush starts, 'dashing' mid-rush.
   * Jump: grounded only, chain on landing, NO double jump (design §0.5).
   * Rush: SHIFT burst — horizontal, gravity suspended, short cooldown.
   */
  step(dt, input, { worldEnd = Infinity } = {}) {
    const p = this.p;
    const T = AUG_TUNE;
    const now = this.scene.time.now;

    if (input.dash && now >= this.dashReadyAt && !p.dead) {
      this.dashReadyAt = now + T.dashCooldownMs;
      this.dashUntil = now + T.dashMs;
      p.dashDir = input.left && !input.right ? -1 : input.right && !input.left ? 1 : p.facing;
      p.grounded = false;
      p.vy = 0;
    }
    if (now < this.dashUntil) {
      p.facing = p.dashDir;
      p.vx = p.dashDir * T.dashSpeed;
      p.vy = 0;
      p.x = Math.min(p.x + p.vx * dt, worldEnd);
      return 'dashing';
    }

    if (p.grounded) {
      let dir = 0;
      if (input.left && !input.right) dir = -1;
      else if (input.right && !input.left) dir = 1;
      p.vx = dir * T.walkSpeed;
      if (dir !== 0) p.facing = dir;

      if (input.jump) {
        p.grounded = false;
        p.vy = T.jumpVelocity;
        p.y -= 2;
        return null;
      }

      const nx = p.x + p.vx * dt;
      const gy = this.field.groundAt(nx);
      const gyCur = this.field.groundAt(p.x);
      if (gy === null) {
        // walked off an edge
        p.grounded = false;
        p.vy = 0;
        p.x = nx;
        return null;
      }
      if (gyCur !== null && gy < gyCur - T.stepSnap && dir !== 0) {
        return null; // a wall of rubble — jump it
      }
      p.x = Math.min(nx, worldEnd);
      p.y = gy;
      return null;
    }

    // airborne
    p.vy += T.gravity * dt;
    if (input.left && !input.right) {
      p.vx = Math.max(p.vx - T.airAccel * dt, -T.airMax);
      p.facing = -1;
    } else if (input.right && !input.left) {
      p.vx = Math.min(p.vx + T.airAccel * dt, T.airMax);
      p.facing = 1;
    }
    p.x = Math.min(p.x + p.vx * dt, worldEnd);
    p.y += p.vy * dt;

    const gy = this.field.groundAt(p.x);
    if (gy !== null && p.y >= gy && p.vy > 0) {
      this.lastLandImpact = p.vy;
      p.y = gy;
      p.vy = 0;
      p.grounded = true;
      p.vx = 0;
      return 'land';
    }
    return null;
  }

  /** Walk cycle / pose. Pure visuals. */
  animate(dt) {
    const p = this.p;
    const now = this.scene.time.now;
    const moving = p.grounded && p.vx !== 0;
    this.walkPhase += Math.abs(p.vx) * dt * 0.05;
    const armRFree = now >= this.armSwingUntil; // combo swing owns armR
    const poseArmR = (r) => {
      if (armRFree) this.parts.armR.setRotation(r);
    };
    if (now < this.dashUntil) {
      // rush: body leans hard, limbs swept back
      this.parts.legL.setRotation(0.85);
      this.parts.legR.setRotation(-0.7);
      this.parts.armL.setRotation(0.7);
      poseArmR(0.9);
    } else if (moving) {
      const sw = Math.sin(this.walkPhase) * 0.6;
      this.parts.legL.setRotation(sw);
      this.parts.legR.setRotation(-sw);
      this.parts.armL.setRotation(-sw * 0.7);
      poseArmR(sw * 0.7);
    } else if (!p.grounded) {
      this.parts.legL.setRotation(0.35);
      this.parts.legR.setRotation(-0.25);
      this.parts.armL.setRotation(-0.4);
      poseArmR(0.5);
    } else {
      // Idle: the frame breathes — a slow swell, arms adrift.
      const sway = Math.sin(now * 0.0026);
      this.parts.legL.setRotation(0.03);
      this.parts.legR.setRotation(-0.03);
      this.parts.armL.setRotation(0.06 + sway * 0.05);
      poseArmR(-0.06 - sway * 0.05);
    }
    // Touchdown squash spring + idle breathing, applied to the whole frame.
    this.landWobbleV += (-this.landWobble * 140 - this.landWobbleV * 10) * dt;
    this.landWobble += this.landWobbleV * dt;
    const idle = p.grounded && p.vx === 0 && now >= this.dashUntil;
    const breath = idle ? (Math.sin(now * 0.0026) + 1) / 2 : 0;
    const sq = this.landWobble;
    this.fig.setPosition(p.x, p.y);
    this.fig.setScale(p.facing * (1 + sq * 0.35 - breath * 0.006), 1 - sq * 0.45 + breath * 0.014);
    this.coreGlow.setPosition(p.x, p.y - 32);
    // hurt blink
    this.fig.setAlpha(this.hurt && Math.floor(this.scene.time.now / 90) % 2 === 0 ? 0.35 : 1);
  }

  /** Attach one absorbed shard to the body. Returns the new count. */
  absorb() {
    this.shards++;
    const a = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 10;
    const s = this.scene.add.image(Math.cos(a) * r, -34 + Math.sin(a) * r * 1.4, 'ch2-shard');
    s.setRotation(Math.random() * 6).setScale(0.36);
    this.shardLayer.add(s);
    return this.shards;
  }
}

// ---------------------------------------------------------------------- psycho

export const PSY_TUNE = {
  hp: 3,
  dashSpeed: 180, // twitchy dash bursts; averages ~90px/s with the pauses
  pauseMs: [300, 750],
  dashMs: [200, 420],
  aggroRange: 420,
  lungeRange: 95,
  lungeWindupMs: 400, // red flash warning — the read window (design §4.3)
  lungeSpeed: 520,
  lungeMs: 260,
  staggerMs: 350,
  armPullStaggerMs: 600,
  halfH: 30,
};

export class Psycho {
  constructor(scene, x, field, { tint = null, oneLegged = false, glow = false } = {}) {
    this.scene = scene;
    this.field = field;
    this.hp = PSY_TUNE.hp;
    this.alive = true;
    this.state = 'pause'; // pause|dash|windup|lunge|stagger
    this.stateUntil = scene.time.now + Phaser.Math.Between(...PSY_TUNE.pauseMs);
    this.facing = -1;
    this.oneLegged = oneLegged;

    const gy = field.groundAt(x);
    this.p = { x, y: gy ?? 500, vx: 0, vy: 0, grounded: true };

    this.fig = scene.add.container(this.p.x, this.p.y).setDepth(5);
    this.parts = {
      body: scene.add.image(0, -32, 'ch2-psy-body').setScale(0.4),
      head: scene.add.image(1, -52, 'ch2-psy-head').setScale(0.4),
      armL: scene.add.image(-10, -44, 'ch2-psy-limb').setOrigin(0.5, 0.08).setScale(0.4),
      armR: scene.add.image(10, -44, 'ch2-psy-limb').setOrigin(0.5, 0.08).setScale(0.4),
      legL: scene.add.image(-4, -20, 'ch2-psy-limb').setOrigin(0.5, 0.05).setScale(0.4),
    };
    if (!oneLegged) {
      this.parts.legR = scene.add.image(4, -20, 'ch2-psy-limb').setOrigin(0.5, 0.05).setScale(0.4);
    }
    this.fig.add(Object.values(this.parts));
    if (tint) Object.values(this.parts).forEach((img) => img.setTint(tint));

    if (glow) {
      this.glowImg = scene.add
        .image(this.p.x, this.p.y - 32, 'ch2-mote')
        .setScale(9)
        .setTint(0x9fd8e8)
        .setAlpha(0.3)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4);
    }
    this.walkPhase = Math.random() * 6;
  }

  /** Take one slash hit. Returns 'dead' | 'hit'. */
  takeHit(fromX) {
    if (!this.alive) return 'dead';
    this.hp--;
    this.lastHitFrom = fromX;
    this.p.vx = (this.p.x < fromX ? -1 : 1) * AUG_TUNE.knockback;
    this.p.vy = AUG_TUNE.hitPopVy; // the blow lifts it off the floor
    this.p.grounded = false;
    this.state = 'stagger';
    this.stateUntil = this.scene.time.now + PSY_TUNE.staggerMs;
    Object.values(this.parts).forEach((img) => img.setTintFill(0xffffff));
    this.scene.time.delayedCall(90, () => {
      if (this.alive) Object.values(this.parts).forEach((img) => img.clearTint());
    });
    if (this.hp <= 0) {
      this.alive = false;
      this.p.vx *= 1.6;
      this.p.vy = AUG_TUNE.killLaunchVy;
      return 'dead';
    }
    return 'hit';
  }

  /** Grappled by the extendable arm: dragged in, longer stagger. */
  yankTo(x) {
    if (!this.alive) return;
    this.p.x = x;
    this.p.vx = 0;
    this.state = 'stagger';
    this.stateUntil = this.scene.time.now + PSY_TUNE.armPullStaggerMs;
  }

  /**
   * AI step. Returns 'lunge-hit' when its body connects with the target
   * point during a lunge, 'touch' on any other contact, null otherwise.
   */
  step(dt, target, now) {
    if (!this.alive) return null;
    const p = this.p;
    const dx = target.x - p.x;
    const dist = Math.abs(dx);

    if (this.state === 'stagger' || this.state === 'windup') {
      if (now >= this.stateUntil) {
        if (this.state === 'windup') {
          this.state = 'lunge';
          this.stateUntil = now + PSY_TUNE.lungeMs;
          p.vx = this.facing * PSY_TUNE.lungeSpeed;
        } else {
          this.state = 'pause';
          this.stateUntil = now + Phaser.Math.Between(...PSY_TUNE.pauseMs);
          p.vx = 0;
        }
      }
      if (this.state === 'windup') {
        // red flash warning
        this.fig.setAlpha(Math.floor(now / 70) % 2 === 0 ? 1 : 0.4);
      }
    } else if (this.state === 'lunge') {
      if (now >= this.stateUntil || p.grounded === false) {
        this.state = 'pause';
        this.stateUntil = now + Phaser.Math.Between(...PSY_TUNE.pauseMs);
        p.vx = 0;
      }
    } else if (dist < PSY_TUNE.aggroRange) {
      this.facing = dx < 0 ? -1 : 1;
      if (dist < PSY_TUNE.lungeRange && this.state !== 'windup') {
        this.state = 'windup';
        this.stateUntil = now + PSY_TUNE.lungeWindupMs;
        p.vx = 0;
      } else if (this.state === 'pause' && now >= this.stateUntil) {
        this.state = 'dash';
        this.stateUntil = now + Phaser.Math.Between(...PSY_TUNE.dashMs);
        p.vx = this.facing * PSY_TUNE.dashSpeed;
      } else if (this.state === 'dash' && now >= this.stateUntil) {
        this.state = 'pause';
        this.stateUntil = now + Phaser.Math.Between(...PSY_TUNE.pauseMs);
        p.vx = 0;
      }
    }

    // integrate (ground-hugging; falls off ledges; falls THROUGH broken floor)
    if (p.grounded) {
      const nx = p.x + p.vx * dt;
      const gy = this.field.groundAt(nx);
      const gyCur = this.field.groundAt(p.x);
      if (gyCur === null) {
        p.grounded = false; // the floor gave way under it
        p.vy = 0;
      } else if (gy === null || (gyCur !== null && gy < gyCur - AUG_TUNE.stepSnap)) {
        p.vx = 0; // psychos stop at ledges and walls
      } else {
        p.x = nx;
        p.y = gy;
      }
    } else {
      p.vy += AUG_TUNE.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const gy = this.field.groundAt(p.x);
      if (gy !== null && p.y >= gy && p.vy > 0) {
        p.y = gy;
        p.vy = 0;
        p.grounded = true;
      }
    }

    this.animate(dt, now);

    // contact check
    const touching =
      Math.abs(target.x - p.x) < 22 && Math.abs(target.y - p.y) < PSY_TUNE.halfH + AUG_TUNE.halfH - 20;
    if (!touching) return null;
    return this.state === 'lunge' ? 'lunge-hit' : 'touch';
  }

  animate(dt, now) {
    const p = this.p;
    const moving = p.grounded && p.vx !== 0;
    this.walkPhase += Math.abs(p.vx) * dt * 0.07;
    const P = this.parts;
    if (this.state === 'windup') {
      // Coiling: crouched low, arms thrown up, the whole frame trembling.
      const shake = Math.sin(now * 0.09) * 0.06;
      P.legL.setRotation(0.8);
      if (P.legR) P.legR.setRotation(-0.8);
      P.armL.setRotation(-2.4 + shake);
      P.armR.setRotation(-2.4 - shake);
      P.head.setRotation(0.3);
      this.fig.setRotation(0);
      this.fig.setScale(this.facing * 1.08, 0.86);
    } else if (this.state === 'lunge') {
      // Fully committed: body pitched forward, limbs streaming behind.
      P.legL.setRotation(0.9);
      if (P.legR) P.legR.setRotation(0.6);
      P.armL.setRotation(1.9);
      P.armR.setRotation(2.1);
      P.head.setRotation(-0.2);
      this.fig.setRotation(this.facing * -0.22);
      this.fig.setScale(this.facing * 1.14, 0.92);
    } else if (this.state === 'stagger') {
      // The blow is still traveling through it: arched back, limbs flung.
      const away = p.x < (this.lastHitFrom ?? p.x) ? 1 : -1;
      P.legL.setRotation(-0.5);
      if (P.legR) P.legR.setRotation(0.4);
      P.armL.setRotation(-1.6);
      P.armR.setRotation(1.6);
      P.head.setRotation(-0.5);
      this.fig.setRotation(away * 0.3);
      this.fig.setScale(this.facing, 1);
    } else if (moving) {
      // twitchy, wrong-looking stride: uneven swing, occasional shiver
      const sw = Math.sin(this.walkPhase) * 0.7;
      const twitch = Math.floor(now / 130) % 5 === 0 ? 0.25 : 0;
      P.legL.setRotation(sw + twitch);
      if (P.legR) P.legR.setRotation(-sw + twitch);
      P.armL.setRotation(-sw * 0.9);
      P.armR.setRotation(sw * 0.9 + twitch);
      P.head.setRotation(twitch * 0.8);
      this.fig.setRotation(0);
      this.fig.setScale(this.facing, 1);
    } else {
      // Idle: it never quite holds still — a slow sway and a head tic.
      const sway = Math.sin(now * 0.0022 + this.walkPhase) * 0.05;
      const tic = Math.floor(now / 900) % 4 === 0 ? Math.sin(now * 0.11) * 0.3 : 0;
      P.legL.setRotation(0.04);
      if (P.legR) P.legR.setRotation(-0.04);
      P.armL.setRotation(sway + 0.08);
      P.armR.setRotation(-sway - 0.08);
      P.head.setRotation(sway * 1.6 + tic);
      this.fig.setRotation(0);
      this.fig.setScale(this.facing * (1 + Math.sin(now * 0.003) * 0.015), 1);
    }
    if (this.state !== 'windup') this.fig.setAlpha(1);
    this.fig.setPosition(p.x, p.y);
    if (this.glowImg) this.glowImg.setPosition(p.x, p.y - 32);
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.fig);
    this.fig.destroy();
    if (this.glowImg) this.glowImg.destroy();
  }
}
