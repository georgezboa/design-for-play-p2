import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../../constants.js';
import { makeFxTextures } from './fx.js';

/**
 * Chapter 2 shared torso kit — everything the limbless body needs, extracted
 * from the RollProto feel prototype (src/scenes/RollProtoScene.js) so L2-1,
 * L2-2 and L2-3 all roll on the same flesh.
 *
 *   ROLL_TUNE           all feel numbers in one place
 *   makeTorsoTextures   procedural blob / lump / stump / mote textures
 *   Heightfield         piecewise-linear ground with gaps (no Arcade physics)
 *   Torso               kinematic body + flesh rig + roll/hop physics
 *   playVoidDeath       the gore sequence: lens blood, thud, black, respawn
 *   synthThud           WebAudio low-impact thud, no asset
 */

export const ROLL_TUNE = {
  radius: 15,
  gravity: 1900,
  rollAccel: 480, // input push along the slope tangent — a torso, not a runner
  slopePull: 1700, // how hard gravity drags you down a slope
  groundFriction: 0.45,
  airDrag: 0.06,
  airControl: 300,
  hopVelocity: -470, // shoulder hop: clears a debris bump, never a platform
  maxRoll: 640, // downhill terminal velocity — heavy, not a cannonball
  maxPush: 300, // soft cap for torso-power rolling on gentle ground
  maxAir: 800,
  wallSlope: 0.62, // |t.y| above this = a face too steep to roll up: a wall
  landSnap: 10,
  camZoomSlow: 1.08,
  camZoomFast: 0.9,
};

// ------------------------------------------------------------------ textures

export function makeTorsoTextures(scene) {
  if (scene.textures.exists('ch2-blob')) return;
  const g = scene.make.graphics({ add: false });

  // The torso is NOT a sphere. A wet cluster of lumps — ribcage mass,
  // shoulder, head stump — with creases and one cold AI core under the skin.
  // Baked at 2x and drawn at 0.5: the detail survives the squash.
  const FLESH = 0xa08a83;
  const FLESH_HI = 0xc4aca2;
  const FLESH_LO = 0x5d4b48;
  const FLESH_DEEP = 0x42332f;
  const lumps = [
    [40, 44, 26], // ribcage mass
    [24, 34, 18], // side slack
    [56, 30, 16], // shoulder
    [50, 58, 16], // hip sag
    [22, 54, 14], // lower slack
    [60, 18, 10], // head stump
  ];
  // base masses
  lumps.forEach(([x, y, r]) => {
    g.fillStyle(FLESH, 1);
    g.fillCircle(x, y, r);
  });
  // form shadows — crescents at each lump's lower-right
  lumps.forEach(([x, y, r]) => {
    g.fillStyle(FLESH_LO, 0.55);
    g.fillCircle(x + r * 0.22, y + r * 0.26, r * 0.62);
  });
  // re-assert the lit tops
  lumps.forEach(([x, y, r]) => {
    g.fillStyle(FLESH, 0.9);
    g.fillCircle(x - r * 0.1, y - r * 0.12, r * 0.7);
  });
  // wet specular caps
  lumps.forEach(([x, y, r]) => {
    g.fillStyle(FLESH_HI, 0.7);
    g.fillCircle(x - r * 0.28, y - r * 0.32, r * 0.42);
  });
  // hot pinpoint highlights — the skin is slick
  lumps.forEach(([x, y, r], i) => {
    g.fillStyle(0xefe2da, 0.85);
    g.fillCircle(x - r * 0.34, y - r * 0.4, 1.6 + (i % 2));
  });
  // rim light — cold, from the upper left, on every lump
  g.lineStyle(2.5, 0xd8e4ec, 0.55);
  lumps.forEach(([x, y, r]) => {
    g.beginPath();
    g.arc(x, y, r - 1, Math.PI * 0.72, Math.PI * 1.45);
    g.strokePath();
  });
  // deep creases between the masses
  g.lineStyle(3.5, FLESH_DEEP, 0.75);
  g.beginPath();
  g.arc(32, 40, 16, 0.3, 1.7);
  g.strokePath();
  g.beginPath();
  g.arc(48, 44, 18, 1.6, 3.0);
  g.strokePath();
  g.beginPath();
  g.arc(30, 52, 12, 0.5, 1.9);
  g.strokePath();
  // veins — thin, dark red, wandering
  g.lineStyle(1.2, 0x7a3638, 0.55);
  g.lineBetween(28, 30, 38, 42);
  g.lineBetween(38, 42, 34, 52);
  g.lineBetween(52, 36, 46, 50);
  g.lineBetween(24, 48, 34, 58);
  // surgical staple seam across the shoulder
  g.lineStyle(1.4, FLESH_DEEP, 0.8);
  g.lineBetween(50, 22, 62, 30);
  g.lineStyle(1.6, 0xb9c4cc, 0.85);
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    g.lineBetween(50 + 12 * t, 19 + 8 * t, 52 + 12 * t, 25 + 8 * t);
  }
  // one surgical blood smear, fresher at the wound edge
  g.fillStyle(0x6e1f24, 0.5);
  g.fillEllipse(28, 60, 20, 8);
  g.fillStyle(0x8e1f24, 0.65);
  g.fillEllipse(24, 61, 10, 4);
  // AI core under the skin — bright nucleus, cold halo bleeding outward
  g.fillStyle(0x9fd8e8, 0.28);
  g.fillCircle(38, 38, 9);
  g.fillStyle(0x9fd8e8, 0.55);
  g.fillCircle(38, 38, 5);
  g.fillStyle(0xe8fbff, 1);
  g.fillCircle(38, 38, 2.6);
  g.generateTexture('ch2-blob', 80, 80);
  g.clear();

  // loose flesh lump (the wobbling satellites)
  g.fillStyle(FLESH, 1);
  g.fillCircle(10, 10, 9);
  g.fillStyle(FLESH_LO, 0.55);
  g.fillCircle(12, 12, 5.5);
  g.fillStyle(FLESH_HI, 0.85);
  g.fillCircle(7, 7, 4);
  g.fillStyle(0xefe2da, 0.8);
  g.fillCircle(6, 6, 1.4);
  g.generateTexture('ch2-lump', 20, 20);
  g.clear();

  // severed limb stump: sealed wound, bone nub, staple row
  g.fillStyle(FLESH, 1);
  g.fillRoundedRect(6, 0, 16, 32, 7);
  g.fillStyle(FLESH_HI, 0.5);
  g.fillRoundedRect(8, 2, 5, 24, 2);
  g.fillStyle(FLESH_LO, 1);
  g.fillEllipse(14, 33, 16, 10); // sealed wound end
  g.fillStyle(0xd8cfc6, 0.9);
  g.fillEllipse(14, 33, 6, 4); // bone nub
  g.fillStyle(0x8e1f24, 0.8);
  g.fillEllipse(17, 34, 6, 3); // blood ring
  g.lineStyle(1.4, 0xd8e4ec, 0.55);
  g.lineBetween(6, 4, 6, 26);
  g.lineStyle(1.5, 0xb9c4cc, 0.8);
  for (let i = 0; i < 3; i++) g.lineBetween(9 + i * 4, 28, 10 + i * 4, 32); // staples
  g.generateTexture('ch2-stump', 28, 40);
  g.clear();

  // The mote is EVERY glow in the chapter — a soft radial orb, not a hard dot.
  for (let r = 4; r > 0; r -= 0.5) {
    const t = 1 - r / 4;
    g.fillStyle(0xffffff, Math.pow(t, 1.9));
    g.fillCircle(4, 4, r);
  }
  g.generateTexture('ch2-mote', 8, 8);

  // A HEAD. Pale, eyes shut, neck wound dark — the thing that makes the
  // cluster read as "what is left of a person", never as a ball.
  g.fillStyle(0xc4aca2, 1);
  g.fillCircle(16, 14, 14);
  g.fillStyle(0xa08a83, 1);
  g.fillEllipse(18, 22, 22, 12); // jaw slack
  g.fillStyle(0x8a736c, 0.6);
  g.fillEllipse(20, 26, 12, 6); // under-jaw shadow
  g.lineStyle(2, 0x3a2f2c, 0.9);
  g.lineBetween(8, 11, 16, 12); // closed eye — he never asked for any of this
  g.lineStyle(1, 0x3a2f2c, 0.5);
  g.lineBetween(10, 12.5, 14, 13); // lash line
  g.fillStyle(0xa08a83, 0.9);
  g.fillTriangle(17, 14, 20, 14, 18.5, 18); // nose hint
  g.fillStyle(0x5c1216, 1);
  g.fillEllipse(16, 28, 18, 10); // neck wound
  g.fillStyle(0x8e1f24, 0.8);
  g.fillEllipse(13, 27, 8, 4); // fresher blood at the tear
  g.fillStyle(0xd8c6bc, 0.55);
  g.fillCircle(12, 8, 4.5); // brow highlight
  g.fillStyle(0xefe2da, 0.7);
  g.fillCircle(11, 7, 1.6);
  g.generateTexture('ch2-torso-head', 32, 36);
  g.destroy();
}

// ---------------------------------------------------------------- heightfield

export class Heightfield {
  /** contour: [{x,y}] sorted by x; gaps: [{from,to}] where ground is null. */
  constructor(contour, gaps = []) {
    this.contour = contour;
    this.gaps = gaps;
  }

  groundAt(x) {
    for (const g of this.gaps) if (x >= g.from && x <= g.to) return null;
    const c = this.contour;
    if (x <= c[0].x) return c[0].y;
    for (let i = 0; i < c.length - 1; i++) {
      const a = c[i];
      const b = c[i + 1];
      if (x >= a.x && x <= b.x) {
        const t = (x - a.x) / (b.x - a.x);
        return Phaser.Math.Linear(a.y, b.y, t);
      }
    }
    return c[c.length - 1].y;
  }

  tangentAt(x) {
    const e = 2;
    const y0 = this.groundAt(x - e) ?? this.groundAt(x);
    const y1 = this.groundAt(x + e) ?? this.groundAt(x);
    const dx = 2 * e;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  /**
   * Fill the ground down to `bottom`, with a rim light on the surface — the
   * only edge cue, per the value-ramp rule.
   */
  draw(scene, { maxX, bottom, fill = 0x11151d, rimColor = 0x3a4a5c, depth = 2 } = {}) {
    const g = scene.add.graphics().setDepth(depth);
    const rim = scene.add.graphics().setDepth(depth + 1);
    let pen = null;
    const flush = () => {
      if (!pen) return;
      g.lineTo(pen.x, bottom);
      g.lineTo(pen.startX, bottom);
      g.closePath();
      g.fillPath();
      pen = null;
    };
    for (let x = this.contour[0].x; x <= maxX; x += 8) {
      const y = this.groundAt(x);
      if (y === null) {
        flush();
        continue;
      }
      if (!pen) {
        pen = { startX: x, x };
        g.fillStyle(fill, 1);
        g.beginPath();
        g.moveTo(x, y);
      } else {
        g.lineTo(x, y);
        pen.x = x;
      }
      rim.lineStyle(2, rimColor, 1);
      rim.lineBetween(x - 8, this.groundAt(x - 8) ?? y, x, y);
    }
    flush();
    return { g, rim };
  }
}

// ---------------------------------------------------------------------- torso

export class Torso {
  constructor(scene, spawn, tune = ROLL_TUNE) {
    this.scene = scene;
    this.tune = tune;
    this.p = {
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      speed: 0,
      grounded: true,
      angle: 0,
      dead: false,
    };

    this.blob = scene.add.container(this.p.x, this.p.y).setDepth(5);
    this.bodyImg = scene.add.image(0, 0, 'ch2-blob');

    this.lumpRing = scene.add.container(0, 0);
    const lumpSpots = [
      [8, -2],
      [-6, 5],
      [2, 9],
      [-9, -4],
    ];
    this.lumps = lumpSpots.map(([lx, ly]) => scene.add.image(lx, ly, 'ch2-lump').setScale(0.5));
    this.lumpRing.add(this.lumps);

    this.stumps = [
      { img: scene.add.image(0, 0, 'ch2-stump').setOrigin(0.5, 0.2).setScale(0.5), base: 2.1, swing: 0, swingV: 0 },
      { img: scene.add.image(0, 0, 'ch2-stump').setOrigin(0.5, 0.2).setScale(0.5), base: 4.4, swing: 0, swingV: 0 },
    ];
    // The head rides the cluster like the stumps do — flopping on its neck
    // wound as the body tumbles. This is a person, not a ball.
    this.head = { img: scene.add.image(0, 0, 'ch2-torso-head').setOrigin(0.5, 0.75).setScale(0.5), base: 5.3, swing: 0, swingV: 0 };
    this.blob.add([this.bodyImg, this.lumpRing, ...this.stumps.map((s) => s.img), this.head.img]);

    this.jelly = 0;
    this.jellyV = 0;
    this.lastSpinV = 0;
    this.baseScale = 0.59; // 2x-baked textures, drawn at half size

    this.coreLight = scene.add
      .image(this.p.x, this.p.y, 'ch2-mote')
      .setScale(6)
      .setTint(0x9fd8e8)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);
  }

  setVisible(v) {
    this.blob.setVisible(v);
    this.coreLight.setVisible(v);
  }

  reset(spawn) {
    const p = this.p;
    p.x = spawn.x;
    p.y = spawn.y;
    p.vx = 0;
    p.vy = 0;
    p.speed = 0;
    p.grounded = true;
    p.dead = false;
    this.jelly = 0;
    this.jellyV = 0;
    this.blob.setPosition(p.x, p.y);
    this.blob.setScale(this.baseScale, this.baseScale);
    this.coreLight.setPosition(p.x, p.y);
  }

  /** Squash impulse: positive = stretch along travel, negative = flatten. */
  squash(amount) {
    this.jellyV += amount;
  }

  /**
   * Grounded step on a heightfield. Returns 'bonk' when a steep face was
   * hit, 'takeoff' when the contour fell away, null otherwise.
   */
  stepGrounded(dt, input, field, { worldEnd = Infinity } = {}) {
    const p = this.p;
    const T = this.tune;
    const t = field.tangentAt(p.x);

    p.speed += T.slopePull * t.y * t.x * dt * 2;
    if (input.left && !input.right) p.speed -= T.rollAccel * dt;
    else if (input.right && !input.left) p.speed += T.rollAccel * dt;

    p.speed *= Math.max(0, 1 - T.groundFriction * dt);

    const cap = Math.abs(t.y) > 0.18 ? T.maxRoll : T.maxPush;
    const over = Math.abs(p.speed) - cap;
    if (over > 0) p.speed -= Math.sign(p.speed) * over * 3 * dt;
    p.speed = Phaser.Math.Clamp(p.speed, -T.maxRoll, T.maxRoll);

    if (p.speed !== 0 && -t.y * Math.sign(p.speed) > T.wallSlope) {
      p.speed = -p.speed * 0.22;
      this.squash(-5);
      return 'bonk';
    }

    let nx = p.x + p.speed * t.x * dt;
    if (nx >= worldEnd - T.radius) {
      nx = worldEnd - T.radius;
      p.speed = 0;
    }
    const gy = field.groundAt(nx);

    if (input.jump) {
      p.grounded = false;
      p.vx = p.speed * t.x;
      p.vy = T.hopVelocity;
      p.y -= 2;
      this.squash(4.5);
      return null;
    }

    if (gy === null || gy - T.radius > p.y + T.landSnap) {
      p.grounded = false;
      p.vx = p.speed * t.x;
      p.vy = Math.max(0, p.speed * t.y);
      p.x = nx;
      p.y += Math.max(0, p.speed * t.y) * dt;
      return 'takeoff';
    }

    p.x = nx;
    p.y = gy - T.radius;
    return null;
  }

  /**
   * Airborne step. Returns 'slam' when the body clipped a gap's far lip
   * (lethal), 'land' on touchdown, null otherwise.
   */
  stepAirborne(dt, input, field, { worldEnd = Infinity } = {}) {
    const p = this.p;
    const T = this.tune;
    p.vy += T.gravity * dt;
    if (input.left && !input.right) p.vx -= T.airControl * dt;
    else if (input.right && !input.left) p.vx += T.airControl * dt;
    p.vx *= Math.max(0, 1 - T.airDrag * dt);
    p.vx = Phaser.Math.Clamp(p.vx, -T.maxAir, T.maxAir);
    p.vy = Math.min(p.vy, T.maxAir * 1.4);

    const gyBefore = field.groundAt(p.x);
    const xBefore = p.x;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x > worldEnd - T.radius) {
      p.x = worldEnd - T.radius;
      p.vx = 0;
    }

    const gy = field.groundAt(p.x);

    // Below the far lip of a gap: slam the edge, fall into the void. Never
    // snap up onto the platform, never tunnel under it.
    if (gyBefore === null && gy !== null && p.y + T.radius > gy + 10) {
      p.dead = true;
      p.x = xBefore - 2;
      p.vx = -Math.min(120, Math.abs(p.vx) * 0.25);
      this.squash(-6);
      return 'slam';
    }

    if (gy !== null && p.y + T.radius >= gy && p.vy > 0) {
      const t = field.tangentAt(p.x);
      p.speed = p.vx * t.x + p.vy * t.y;
      p.grounded = true;
      p.y = gy - T.radius;
      this.squash(-Phaser.Math.Clamp(p.vy / 260, 2, 8));
      return 'land';
    }
    return null;
  }

  /** Death fall integration; keeps the corpse out of the terrain. */
  updateDead(dt, field) {
    const p = this.p;
    p.vy += this.tune.gravity * dt;
    p.y += p.vy * dt;
    p.x += p.vx * dt;
    const gy = field ? field.groundAt(p.x) : null;
    if (gy !== null && p.y + this.tune.radius > gy + 4) p.vx = 0;
    this.updateFlesh(dt);
  }

  /** Soft-body pass: spin, jelly spring, flesh churn, stump pendulums. */
  updateFlesh(dt) {
    const p = this.p;
    const spinV = p.grounded ? p.speed : p.vx;
    p.angle += (spinV / this.tune.radius) * dt;

    this.jellyV += (-this.jelly * 140 - this.jellyV * 10) * dt;
    this.jelly += this.jellyV * dt;
    this.blob.setScale(this.baseScale * (1 + this.jelly), this.baseScale * (1 - this.jelly * 0.8));
    this.blob.setPosition(p.x, p.y);

    this.bodyImg.setRotation(p.angle);
    this.lumpRing.setRotation(p.angle * 0.34 + this.scene.time.now * 0.0004);

    const angAccel = (spinV - this.lastSpinV) / Math.max(dt, 1e-4);
    this.lastSpinV = spinV;
    const R = this.tune.radius + 3;
    [...this.stumps, this.head].forEach((st) => {
      st.swingV += (-st.swing * 60 - st.swingV * 6 - angAccel * 0.004) * dt;
      st.swing += st.swingV * dt;
      const anchor = p.angle + st.base;
      st.img.setPosition(Math.cos(anchor) * R, Math.sin(anchor) * R);
      st.img.setRotation(Math.PI / 2 - anchor * 0.22 + st.swing);
    });

    this.coreLight.setPosition(p.x, p.y);
  }
}

// ------------------------------------------------------------------- death fx

/** Low body-hitting-concrete thud, synthesized — no asset. */
export function synthThud(scene, { freq = 95, gain = 0.55, dur = 0.45 } = {}) {
  try {
    const ctx = scene.sound.context;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(28, t0 + dur * 0.62);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch (e) {
    /* audio context locked until first gesture; gore still plays */
  }
}

/** Harsh surgical buzz — the cut. */
export function synthBuzz(scene, { freq = 160, dur = 0.5, gain = 0.16 } = {}) {
  try {
    const ctx = scene.sound.context;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.linearRampToValueAtTime(freq * 0.6, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch (e) {
    /* audio locked */
  }
}

/** Short metallic clink — claw catching steel, a latch, a pin. */
export function synthPing(scene, { freq = 1700, gain = 0.09, dur = 0.14 } = {}) {
  try {
    const ctx = scene.sound.context;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    // the click transient on top
    const click = ctx.createOscillator();
    const cg = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(freq * 2.3, t0);
    cg.gain.setValueAtTime(gain * 0.4, t0);
    cg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03);
    click.connect(cg).connect(ctx.destination);
    click.start(t0);
    click.stop(t0 + 0.05);
  } catch (e) {
    /* audio locked */
  }
}

/** Rising servo whir — the winch reeling you in, the lift waking up. */
export function synthWhir(scene, { from = 160, to = 520, dur = 0.5, gain = 0.05 } = {}) {
  try {
    const ctx = scene.sound.context;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (e) {
    /* audio locked */
  }
}

/**
 * Death by void per design §6: no instant teleport, and NO black cut —
 * the take never breaks. Blood thrown at the lens from below the frame,
 * a red pulse, a low thud; then the camera tears back to the respawn
 * point at speed (streaks, whoosh, arrival shake) and onRespawn fires.
 * Without panTo, onRespawn just fires after the gore beat.
 */
export function playVoidDeath(scene, onRespawn, { panTo = null } = {}) {
  makeFxTextures(scene);
  // The world lurches: a beat of slow motion while the gore reads.
  const hadSlow = typeof scene.slow === 'number';
  if (hadSlow) scene.slow = 0.25;
  scene.time.delayedCall(520, () => {
    if (hadSlow) scene.slow = 1;
  });
  scene.cameras.main.shake(180, 0.012);

  // Wave one: the arterial burst, thrown at the lens from below the frame.
  scene.add
    .particles(0, 0, 'ch2-mote', {
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

  // Wave two: heavy morsels on long parabolic arcs — the ones you watch fall.
  scene.add
    .particles(0, 0, 'ch2-fx-chunk', {
      x: { min: 0, max: GAME_W },
      y: GAME_H + 16,
      speedY: { min: -620, max: -240 },
      speedX: { min: -220, max: 220 },
      gravityY: 1500,
      rotate: { start: 0, end: 340 },
      lifespan: { min: 700, max: 1400 },
      quantity: 14,
      scale: { min: 0.5, max: 1.3 },
      tint: [0x5c1216, 0x8e1f24, 0x3a0d10],
      emitting: false,
    })
    .setScrollFactor(0)
    .setDepth(91)
    .explode(14);

  // Blood on the lens itself: streaks that slide down and are slow to fade.
  for (let i = 0; i < 5; i++) {
    const dx = 60 + Math.random() * (GAME_W - 120);
    const drip = scene.add
      .image(dx, -20, 'ch2-fx-chunk')
      .setScale(0.8 + Math.random() * 0.9, 2.2 + Math.random() * 2.4)
      .setTint(0x8e1f24)
      .setAlpha(0.85)
      .setScrollFactor(0)
      .setDepth(92);
    scene.tweens.add({
      targets: drip,
      y: GAME_H * (0.3 + Math.random() * 0.5),
      alpha: 0,
      duration: 900 + Math.random() * 700,
      ease: 'Quad.easeIn',
      onComplete: () => drip.destroy(),
    });
  }

  scene.cameras.main.flash(220, 140, 20, 26);
  // The deeper second pulse — the heart misfiring.
  scene.time.delayedCall(140, () => scene.cameras.main.flash(300, 90, 10, 14));
  synthThud(scene);
  synthBuzz(scene, { freq: 55, dur: 0.7, gain: 0.18 });

  if (!panTo) {
    scene.time.delayedCall(550, onRespawn);
    return;
  }

  scene.time.delayedCall(350, () => {
    const cam = scene.cameras.main;
    cam.stopFollow();
    synthBuzz(scene, { freq: 140, dur: 0.55, gain: 0.14 });
    const streaks = scene.add
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
    cam.pan(panTo.x, panTo.y, 620, 'Cubic.easeInOut', true, () => {
      streaks.stop();
      scene.time.delayedCall(300, () => streaks.destroy());
      cam.shake(120, 0.004);
      onRespawn();
    });
  });
}
