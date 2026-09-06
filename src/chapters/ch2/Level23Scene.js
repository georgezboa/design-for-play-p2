import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../../constants.js';
import {
  makeTorsoTextures,
  Heightfield,
  playVoidDeath,
  synthThud,
  synthBuzz,
} from './torso.js';
import { makeAugTextures, Psycho } from './aug.js';
import { applyLens, addFogBands, addEmbers } from './fx.js';
import { startAmbience } from './ambience.js';
import { makeVesselVoice } from './vessel.js';

/**
 * L2-3 「过载」 — the aggregate. The parasite has swallowed every shard in
 * the underground; what climbs out of the ascent elevator is a human silhouette
 * buried inside a crawling shell of scrap (design §5).
 *
 * The third body of the chapter, and the heaviest:
 *   - walks slow, jumps low, no arm, no dash — just mass
 *   - landing hard detonates a shockwave that shatters psychos
 *   - ordinary platforms CRUMBLE under it after 0.8s — weight is the hazard
 *   - finale: a pit no jump can cross. Mid-air, F detonates the shell and
 *     the explosion throws the naked torso across. Miss the window and the
 *     void takes you — same gore, same whip-back, same cold comment.
 *
 * One take, as always: no black cuts, the camera never stops rolling.
 */

const L3 = {
  ground: 470,
  killY: 780,
  spawn: { x: 140 },
  worldEnd: 3700,
  // Two bridged gaps (crumble platforms are the only way across) + the pit.
  gaps: [
    { from: 950, to: 1250 },
    { from: 2550, to: 2850 },
    { from: 2880, to: 3350 },
  ],
  platforms: [
    { x: 1025, y: 470, w: 130 },
    { x: 1175, y: 470, w: 130 },
    { x: 2625, y: 470, w: 130 },
    { x: 2775, y: 470, w: 130 },
  ],
  crumbleMs: 800,
  pit: { x0: 2880, x1: 3350 },
  detonateMinX: 2680, // F only arms near the pit
  hintX: 2560,
  goalX: 3540, // where the thrown torso lands
  gateX: 3650, // the cold door — Chapter 3
  psychoX: [700, 1900, 2120, 2480],
  // Crackable floor slabs (§5.2): a hard enough landing smashes the street
  // itself open — and anything standing on it goes down with it.
  slabs: [
    { x0: 1480, x1: 1800 },
    { x0: 1960, x1: 2160 },
  ],
  chaseSpeed: 84, // the monument district coming down behind you
};

const AGG = {
  walkSpeed: 150, // it wades, it does not run
  airAccel: 700,
  airMax: 200,
  gravity: 1900,
  jumpVelocity: -560, // ~82px of lift — small hops only
  stepSnap: 18,
  shockMinVy: 380, // landing faster than this = shockwave
  shockRadius: 160,
  detonateWindowMs: 1200,
  lives: 3,
  invulnMs: 1200,
};

const SUBTITLE =
  'THE UPGRADE is complete. The body was the last thing that was still yours.';
const MISS_COMMENT = 'Detonation window: missed. Retrying is free.';

// ------------------------------------------------------------- local textures

function makeLocalTextures(scene) {
  if (!scene.textures.exists('ch2-hu-body')) {
    // Naked human torso (normally minted by L2-1; guard for isolated starts).
    const g = scene.make.graphics({ add: false });
    const BODY = 0x232b36;
    const RIM = 0x7fd4e8;
    g.fillStyle(BODY, 1);
    g.fillRoundedRect(0, 0, 14, 26, 4);
    g.lineStyle(1, RIM, 0.5);
    g.lineBetween(1, 3, 1, 23);
    g.generateTexture('ch2-hu-body', 14, 26);
    g.clear();
    g.fillStyle(BODY, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0x9fd8e8, 0.9);
    g.fillCircle(8, 5, 1.4);
    g.generateTexture('ch2-hu-head', 12, 12);
    g.destroy();
  }
  if (!scene.textures.exists('ch2-plat')) {
    // Crumble platform: poured concrete slab, rebar ends, warning chevron.
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x232a34, 1);
    g.fillRect(0, 0, 130, 14);
    g.fillStyle(0x39424e, 1);
    g.fillRect(0, 0, 130, 3);
    g.lineStyle(1, 0x5d6a78, 0.7);
    g.lineBetween(0, 1, 130, 1);
    g.lineStyle(1, 0x14181f, 0.9);
    for (let x = 12; x < 130; x += 24) g.lineBetween(x, 4, x + 8, 12);
    g.fillStyle(0xff8a3c, 0.55);
    g.fillTriangle(8, 5, 14, 5, 11, 10);
    g.fillTriangle(116, 5, 122, 5, 119, 10);
    g.generateTexture('ch2-plat', 130, 14);
    g.destroy();
  }
}

// ----------------------------------------------------------- aggregate player

class AggregatePlayer {
  /** A human shape drowning in scrap. Feet-origin, like AugPlayer. */
  constructor(scene, spawn) {
    this.scene = scene;
    this.p = { x: spawn.x, y: spawn.y, vx: 0, vy: 0, grounded: true, facing: 1, dead: false };
    this.lives = AGG.lives;
    this.invulnUntil = 0;

    this.fig = scene.add.container(this.p.x, this.p.y).setDepth(5);
    this.body = scene.add.image(0, -50, 'ch2-aug-body').setScale(0.88);
    this.head = scene.add.image(3, -92, 'ch2-aug-head').setScale(0.72);

    // The crawling shell: shards in a slow orbit, each with its own jitter.
    this.shellRing = scene.add.container(0, -52);
    this.shell = [];
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const rad = 40 + (i % 3) * 8;
      const img = scene.add
        .image(Math.cos(ang) * rad, Math.sin(ang) * rad * 1.15, 'ch2-shard')
        .setScale(0.68)
        .setRotation(ang * 2.3)
        .setVisible(false);
      this.shellRing.add(img);
      this.shell.push({ img, ang, rad, wob: Math.random() * 6 });
    }
    this.fig.add([this.body, this.head, this.shellRing]);

    this.coreGlow = scene.add
      .image(this.p.x, this.p.y - 50, 'ch2-mote')
      .setScale(9)
      .setTint(0x9fd8e8)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);

    this.wobble = 0;
    this.wobbleV = 0;
    this.revealed = 0; // FORM phase reveals the shell piece by piece

    // Grind dust: the shell drags metal across the street as it walks.
    this.grindDust = scene.add
      .particles(0, 0, 'ch2-mote', {
        speed: { min: 30, max: 90 },
        angle: { min: 200, max: 340 },
        lifespan: { min: 250, max: 550 },
        scale: { min: 0.25, max: 0.6 },
        alpha: { start: 0.4, end: 0 },
        tint: [0x39424e, 0x5d6a78],
        emitting: false,
      })
      .setDepth(4);
    this.grindAt = 0;
  }

  get hurt() {
    return this.scene.time.now < this.invulnUntil;
  }

  /** Attach the next shell shard (FORM fly-in). */
  revealNext() {
    if (this.revealed >= this.shell.length) return;
    this.shell[this.revealed].img.setVisible(true);
    this.revealed++;
    this.squash(0.5);
  }

  squash(amount) {
    this.wobbleV += amount * 0.06;
  }

  setVisible(v) {
    this.fig.setVisible(v);
    this.coreGlow.setVisible(v);
  }

  /**
   * Platformer step on the scene's ground function (field + standing
   * platforms). Returns { land: impactVy } on touchdown, null otherwise.
   */
  step(dt, input, groundYAt, { worldEnd = Infinity } = {}) {
    const p = this.p;
    if (p.grounded) {
      let dir = 0;
      if (input.left && !input.right) dir = -1;
      else if (input.right && !input.left) dir = 1;
      p.vx = dir * AGG.walkSpeed;
      if (dir !== 0) p.facing = dir;

      if (input.jump) {
        p.grounded = false;
        p.vy = AGG.jumpVelocity;
        p.y -= 2;
        this.squash(3);
        return null;
      }

      const nx = p.x + p.vx * dt;
      const gy = groundYAt(nx);
      const gyCur = groundYAt(p.x);
      if (gy === null) {
        p.grounded = false; // walked off the edge — or the slab gave way
        p.vy = 0;
        p.x = nx;
        return null;
      }
      if (gyCur !== null && gy < gyCur - AGG.stepSnap && dir !== 0) return null;
      p.x = Math.min(nx, worldEnd);
      p.y = gy;
      return null;
    }

    p.vy += AGG.gravity * dt;
    if (input.left && !input.right) {
      p.vx = Math.max(p.vx - AGG.airAccel * dt, -AGG.airMax);
      p.facing = -1;
    } else if (input.right && !input.left) {
      p.vx = Math.min(p.vx + AGG.airAccel * dt, AGG.airMax);
      p.facing = 1;
    }
    p.x = Math.min(p.x + p.vx * dt, worldEnd);
    p.y += p.vy * dt;

    const gy = groundYAt(p.x);
    if (gy !== null && p.y >= gy && p.vy > 0) {
      p.y = gy;
      const impact = p.vy;
      p.vy = 0;
      p.grounded = true;
      p.vx = 0;
      this.squash(-Phaser.Math.Clamp(impact / 300, 1.5, 6));
      return { land: impact };
    }
    return null;
  }

  /** Shell crawl + breathing wobble. Pure visuals. */
  animate(dt) {
    const p = this.p;
    const now = this.scene.time.now;
    this.wobbleV += (-this.wobble * 120 - this.wobbleV * 9) * dt;
    this.wobble += this.wobbleV * dt;
    this.fig.setScale(p.facing * (1 + this.wobble), 1 - this.wobble * 0.8);
    this.fig.setPosition(p.x, p.y);

    this.shellRing.setRotation(now * 0.00035);
    for (const s of this.shell) {
      if (!s.img.visible) continue;
      const a = s.ang + Math.sin(now * 0.0011 + s.wob) * 0.14;
      const r = s.rad + Math.sin(now * 0.0017 + s.wob * 2) * 3;
      s.img.setPosition(Math.cos(a) * r, Math.sin(a) * r * 1.15);
      s.img.setRotation(a * 2.3 + now * 0.0006);
    }
    this.coreGlow.setPosition(p.x, p.y - 50);
    this.fig.setAlpha(this.hurt && Math.floor(now / 90) % 2 === 0 ? 0.35 : 1);
    // Walking grinds the shell against the street — dust and a metal rasp.
    if (p.grounded && Math.abs(p.vx) > 30 && now > this.grindAt) {
      this.grindAt = now + 160;
      this.grindDust.explode(3, p.x - p.facing * 16, p.y - 3);
      if (Math.random() < 0.35) synthBuzz(this.scene, { freq: 160 + Math.random() * 140, dur: 0.05, gain: 0.03 });
    }
  }
}

// ------------------------------------------------------------------- the scene

export default class Level23Scene extends Phaser.Scene {
  constructor() {
    super('Level23');
  }

  create() {
    this.phase = 'FORM'; // FORM | PLAY | DETONATE | FLIGHT | END
    makeTorsoTextures(this);
    makeAugTextures(this);
    makeLocalTextures(this);
    startAmbience(this, 'surface');

    // Flat pre-dawn ground with one low ledge (jump still exists — barely).
    const contour = [
      { x: 0, y: L3.ground },
      { x: 2160, y: L3.ground },
      { x: 2180, y: L3.ground - 40 },
      { x: 2340, y: L3.ground - 40 },
      { x: 2360, y: L3.ground },
      { x: L3.worldEnd + 60, y: L3.ground },
    ];
    this.field = new Heightfield(contour, L3.gaps);

    this.buildBackdrop();
    this.field.draw(this, { maxX: L3.worldEnd + 50, bottom: 820, fill: 0x14181f, rimColor: 0x3a4a5c });
    this.buildPlatforms();
    this.buildGate();
    this.buildPitSign();
    this.buildSlabs();
    this.buildRuins();
    this.buildChase();

    this.player = new AggregatePlayer(this, { x: L3.spawn.x, y: this.field.groundAt(L3.spawn.x) });
    this.psychos = [];
    this.spawnPsychos();

    this.slow = 1;
    this.groundedAt = 0;
    this.fPrev = false;

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      a: 'A',
      d: 'D',
      jump: 'SPACE',
      f: 'F',
      q: 'Q',
      enter: 'ENTER',
    });
    this.input.keyboard.addCapture(['SPACE', 'LEFT', 'RIGHT']);
    // Shed-shell tuning lives in AGG; make sure a restart finds defaults.
    AGG.walkSpeed = 150;
    AGG.jumpVelocity = -560;
    this.shedUntil = 0;
    this.shedReadyAt = 0;
    this.shedSaid = false;

    this.cameras.main.setBounds(0, 0, L3.worldEnd + 200, 820);
    this.cameras.main.centerOn(320, 380);

    this.buildHud();
    // VESSEL speaks in bulletins now — no more "you" left in it (story §6).
    this.vessel = makeVesselVoice(this);
    this.detonateWarned = false;

    // One take from L2-2: the ascent's dawn light recedes from the frame.
    const veil = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x8a94b0, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: veil, alpha: 0, duration: 900, onComplete: () => veil.destroy() });

    // The parasite's count carries over — a whisper, not a report card.
    const shards = this.registry.get('ch2.shards');
    if (shards !== undefined) {
      const toast = this.add
        .text(GAME_W / 2, 130, `${shards} shards. it is still hungry.`, {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '12px',
          color: '#5d6a78',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(60)
        .setAlpha(0);
      this.tweens.add({
        targets: toast,
        alpha: 0.9,
        duration: 900,
        delay: 700,
        onComplete: () => this.tweens.add({ targets: toast, alpha: 0, duration: 1200, delay: 2400 }),
      });
    }

    this.beginForm();
  }

  // ---------------------------------------------------------------- backdrop

  buildBackdrop() {
    // Pre-dawn surface: lead grey, cold blue (§7). Static in screen space.
    const sky = this.add.graphics().setDepth(0).setScrollFactor(0);
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      sky.fillStyle(Phaser.Display.Color.GetColor(14 + 14 * t, 16 + 14 * t, 24 + 16 * t), 1);
      sky.fillRect(0, (GAME_H / 40) * i, GAME_W, GAME_H / 40 + 1);
    }
    // A thin warm band on the horizon — the sun is coming, too late.
    sky.fillStyle(0x4a3a30, 0.5);
    sky.fillRect(0, 430, GAME_W, 40);

    // Ruined skyline, two parallax depths, wide enough for the whole world.
    let seed = 41;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const far = this.add.graphics().setDepth(1).setScrollFactor(0.2, 1);
    let x = -30;
    const farW = L3.worldEnd * 0.2 + GAME_W + 120;
    while (x < farW) {
      const w = 60 + rnd() * 100;
      const h = 90 + rnd() * 180;
      far.fillStyle(0x11151d, 1);
      far.fillRect(x, 470 - h, w, h);
      if (rnd() < 0.6)
        far.fillTriangle(x + w * 0.3, 470 - h, x + w * 0.7, 470 - h, x + w * 0.5, 470 - h - 20 - rnd() * 20);
      x += w + 10 + rnd() * 40;
    }
    const mid = this.add.graphics().setDepth(1).setScrollFactor(0.45, 1);
    x = -60;
    const midW = L3.worldEnd * 0.45 + GAME_W + 120;
    while (x < midW) {
      const w = 40 + rnd() * 70;
      const h = 40 + rnd() * 90;
      mid.fillStyle(0x0d1017, 1);
      mid.fillRect(x, 470 - h, w, h);
      x += w + 30 + rnd() * 90;
    }

    // Morning haze: huge soft motes drifting, almost still.
    for (let i = 0; i < 5; i++) {
      const m = this.add
        .image(200 + i * 720, 330 + (i % 2) * 90, 'ch2-mote')
        .setScale(60, 18)
        .setTint(0x8a94b0)
        .setAlpha(0.045)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);
      this.tweens.add({ targets: m, x: m.x + 120, duration: 14000 + i * 3000, yoyo: true, repeat: -1 });
    }

    // The lens first — it bakes the fx textures everything below uses.
    applyLens(this);

    // The district is still burning: fire glows on the ruined skyline,
    // flickering against the pre-dawn grey.
    [320, 1150, 2100, 3050].forEach((fx_, i) => {
      const fire = this.add
        .image(fx_, 430 - (i % 2) * 60, 'ch2-fx-glow')
        .setScale(1.6, 1.1)
        .setTint(0xff7a2c)
        .setAlpha(0.3)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScrollFactor(0.35)
        .setDepth(1.5);
      this.tweens.add({
        targets: fire,
        alpha: { from: 0.18, to: 0.42 },
        scaleX: { from: 1.4, to: 1.8 },
        duration: 300 + i * 90,
        yoyo: true,
        repeat: -1,
      });
      addEmbers(this, { x: fx_, y: 450 - (i % 2) * 60, spread: 40, depth: 2, frequency: 700 });
    });

    // The coming sun, smothered: a warm smear behind the ruins.
    this.add
      .image(GAME_W / 2, 445, 'ch2-fx-glow')
      .setScale(14, 2.2)
      .setTint(0x8a5a40)
      .setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0.1)
      .setDepth(1);

    addFogBands(this, { count: 3, y0: 400, y1: 465, tint: 0x8a94b0, alpha: 0.04, depth: 3, sf: 0.55 });
  }

  buildPlatforms() {
    for (const pl of L3.platforms) {
      pl.state = 'idle'; // idle | shaking | fallen
      pl.shookAt = 0;
      pl.img = this.add.image(pl.x, pl.y + 7, 'ch2-plat').setDepth(4);
    }
  }

  buildGate() {
    // The cold door at the end of the world — Chapter 3 behind it.
    const frame = this.add.graphics().setDepth(3);
    frame.lineStyle(3, 0x9fd8e8, 0.9);
    frame.strokeRect(L3.gateX, L3.ground - 150, 90, 150);
    const spill = this.add
      .image(L3.gateX + 45, L3.ground - 70, 'ch2-mote')
      .setScale(16, 22)
      .setTint(0x9fd8e8)
      .setAlpha(0.14)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);
    this.tweens.add({ targets: spill, alpha: 0.3, duration: 2100, yoyo: true, repeat: -1 });
    this.gateSpill = spill;
  }

  buildPitSign() {
    // The only instruction the level ever gives. Cold, floating, patient.
    const sign = this.add
      .text(L3.hintX, 360, 'DETONATE: press F in mid-air', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '14px',
        color: '#9fd8e8',
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setAlpha(0.75);
    this.tweens.add({ targets: sign, alpha: 0.35, duration: 1400, yoyo: true, repeat: -1 });
  }

  buildHud() {
    this.hint = this.add
      .text(GAME_W / 2, GAME_H - 22, '', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '12px',
        color: '#5d6a78',
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(60);
    this.lifeImgs = [];
    for (let i = 0; i < AGG.lives; i++) {
      this.lifeImgs.push(
        this.add
          .image(GAME_W - 20 - i * 22, 20, 'ch2-aug-body')
          .setScale(0.26)
          .setScrollFactor(0)
          .setDepth(60),
      );
    }
  }

  refreshLivesHud() {
    this.lifeImgs.forEach((img, i) => img.setAlpha(i < this.player.lives ? 1 : 0.15));
  }

  // --------------------------------------------------------------- FORM phase

  /** The last absorption, on camera: the scrap of the underground flies in
   *  and closes over the silhouette. No input until the shell is shut. */
  beginForm() {
    // First four shards are already on it when it climbs out of the elevator.
    for (let i = 0; i < 4; i++) this.player.revealNext();
    this.figScale = 0.62;
    this.player.fig.setScale(this.figScale, this.figScale);

    const px = this.player.p.x;
    const py = this.player.p.y - 52;
    const total = this.player.shell.length;
    for (let i = 4; i < total; i++) {
      this.time.delayedCall(500 + (i - 4) * 110, () => {
        const fromLeft = i % 2 === 0;
        const fly = this.add
          .image(px + (fromLeft ? -560 : 560), 120 + Math.random() * 300, 'ch2-shard')
          .setScale(0.68)
          .setRotation(Math.random() * 6)
          .setDepth(6);
        synthBuzz(this, { freq: 300 + i * 18, dur: 0.08, gain: 0.06 });
        this.tweens.add({
          targets: fly,
          x: px,
          y: py,
          duration: 420,
          ease: 'Quad.easeIn',
          onComplete: () => {
            fly.destroy();
            this.player.revealNext();
            this.figScale = Math.min(1, this.figScale + 0.038);
            synthThud(this, { freq: 130 + i * 8, gain: 0.1, dur: 0.16 });
          },
        });
      });
    }

    this.time.delayedCall(500 + (total - 4) * 110 + 500, () => {
      // The shell closes. The ground notices.
      this.figScale = 1;
      this.cameras.main.shake(220, 0.008);
      this.cameras.main.flash(160, 159, 216, 232);
      synthThud(this, { freq: 70, gain: 0.5, dur: 0.5 });
      this.add
        .particles(px, py + 40, 'ch2-mote', {
          speed: { min: 60, max: 240 },
          lifespan: { min: 300, max: 700 },
          quantity: 26,
          scale: { min: 0.4, max: 1.2 },
          tint: [0x5d6a78, 0x9fd8e8],
          blendMode: Phaser.BlendModes.ADD,
          emitting: false,
        })
        .setDepth(6)
        .explode(26);
      this.phase = 'PLAY';
      this.cameras.main.startFollow(this.player.fig, true, 0.1, 0.1);
      this.cameras.main.setFollowOffset(0, 60);
      this.hint.setText('A/D · ←/→ move — SPACE jump — Q shed shell — do not stop');
      this.vessel.say('Aggregation complete. The shell exceeds specification.');
      // The district answers: everything behind you comes down.
      this.chaseX = L3.spawn.x - 420;
      this.time.delayedCall(2400, () => {
        if (this.phase === 'PLAY') this.vessel.say('Notice: the monument district is being retired. Move.');
      });
    });
  }

  // ------------------------------------------------------------ crack slabs

  buildSlabs() {
    const g = this.add.graphics().setDepth(3);
    for (const s of L3.slabs) {
      s.cracked = false;
      // Stress fractures spider across the marked stretch — a warning and
      // an invitation.
      g.lineStyle(2, 0x39424e, 0.9);
      const mid = (s.x0 + s.x1) / 2;
      g.lineBetween(s.x0 + 14, L3.ground, mid - 30, L3.ground - 14);
      g.lineBetween(mid - 30, L3.ground - 14, mid + 6, L3.ground);
      g.lineBetween(mid + 30, L3.ground, mid + 58, L3.ground - 10);
      g.lineBetween(s.x1 - 40, L3.ground, s.x1 - 16, L3.ground - 8);
    }
  }

  crackSlab(s) {
    s.cracked = true;
    this.field.gaps.push({ from: s.x0, to: s.x1 });
    // Swallow the drawn street: a black wound with torn edges.
    const w = s.x1 - s.x0;
    const hole = this.add.graphics().setDepth(4);
    hole.fillStyle(0x020306, 1);
    hole.fillRect(s.x0, L3.ground - 2, w, 360);
    hole.fillStyle(0x14181f, 1);
    for (let x = s.x0; x < s.x1; x += 26) {
      const d = 4 + ((x * 7) % 13);
      hole.fillTriangle(x, L3.ground - 2, x + 18, L3.ground - 2, x + 6, L3.ground + d);
    }
    s.holeGfx = hole;
    const mid = (s.x0 + s.x1) / 2;
    this.cameras.main.shake(200, 0.008);
    synthThud(this, { freq: 60, gain: 0.4, dur: 0.6 });
    this.add
      .particles(mid, L3.ground, 'ch2-mote', {
        speed: { min: 60, max: 300 },
        angle: { min: 220, max: 320 },
        lifespan: { min: 300, max: 800 },
        quantity: 26,
        scale: { min: 0.4, max: 1.2 },
        tint: [0x39424e, 0x5d6a78, 0x232a34],
        emitting: false,
      })
      .setDepth(6)
      .explode(26);
    if (!this.slabSaid) {
      this.slabSaid = true;
      this.vessel.say('Structural failure: logged. The district was already condemned.');
    }
  }

  // ----------------------------------------------------------- near ruins

  /** The district up close: cracked asphalt, shell craters, torn rebar,
   *  toppled lamps, rubble strata, meltwater, and the gate's last slogan. */
  buildRuins() {
    const g = this.add.graphics().setDepth(3.5);
    let seed = 13;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // Asphalt fatigue: cracks wandering across the whole street.
    g.lineStyle(1, 0x0b0e13, 0.9);
    for (let x = 80; x < L3.worldEnd - 100; x += 90 + rnd() * 150) {
      const y = L3.ground + 8 + rnd() * 40;
      g.beginPath();
      g.moveTo(x, y);
      let cx = x;
      let cy = y;
      for (let k = 0; k < 4; k++) {
        cx += 14 + rnd() * 22;
        cy += (rnd() - 0.5) * 10;
        g.lineTo(cx, cy);
      }
      g.strokePath();
    }

    // Shell craters — the bombardment that "retired" the district.
    [420, 1560, 2380, 3120].forEach((cx) => {
      g.fillStyle(0x090c11, 1);
      g.fillEllipse(cx, L3.ground + 26, 150, 22);
      g.lineStyle(2, 0x2c313c, 0.8);
      g.beginPath();
      g.arc(cx, L3.ground + 22, 72, Math.PI * 1.08, Math.PI * 1.92);
      g.strokePath();
      g.fillStyle(0x171a21, 1);
      g.fillEllipse(cx - 62, L3.ground + 12, 34, 10);
      g.fillEllipse(cx + 56, L3.ground + 14, 28, 9);
    });

    // Torn rebar sprouting from every gap rim — the street's broken bones.
    g.lineStyle(2, 0x3a4a5c, 0.9);
    L3.gaps.forEach((gp) => {
      [gp.from + 6, gp.to - 6].forEach((ex, side) => {
        for (let k = 0; k < 3; k++) {
          const bx = ex + (side ? -k * 11 : k * 11);
          g.lineBetween(bx, L3.ground - 2, bx + (side ? -1 : 1) * (6 + k * 3), L3.ground - 22 - k * 6);
        }
      });
    });

    // Toppled street lamps — one of them still burning, badly.
    [900, 2050, 3300].forEach((lx, i) => {
      const lean = i % 2 ? -1 : 1;
      g.lineStyle(3, 0x23262e, 1);
      g.lineBetween(lx, L3.ground - 4, lx + lean * 90, L3.ground - 66);
      g.fillStyle(0x23262e, 1);
      g.fillRect(lx + lean * 90 - 8, L3.ground - 76, 20, 10);
      if (i === 1) {
        const lamp = this.add
          .image(lx + lean * 94, L3.ground - 64, 'ch2-fx-glow')
          .setScale(0.8, 0.5)
          .setTint(0xd8b46b)
          .setAlpha(0.3)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(3.6);
        this.tweens.add({
          targets: lamp,
          alpha: 0.05,
          duration: 120,
          yoyo: true,
          repeat: -1,
          repeatDelay: 900,
        });
      }
    });

    // Rubble strata: silhouette heaps leaning on the street line.
    [260, 700, 1300, 1760, 2300, 2700, 3400].forEach((rx) => {
      const w = 90 + (rx % 3) * 30;
      g.fillStyle(0x10131a, 1);
      g.fillTriangle(rx - w / 2, L3.ground, rx + w / 2, L3.ground, rx + w * 0.1, L3.ground - 26 - (rx % 17));
      g.fillStyle(0x171a21, 1);
      g.fillTriangle(rx - w * 0.3, L3.ground, rx + w * 0.5, L3.ground, rx + w * 0.15, L3.ground - 14 - (rx % 11));
    });

    // Meltwater puddles holding the last of the night.
    [560, 1420, 2240, 2980].forEach((px) => {
      g.fillStyle(0x0d1420, 0.9);
      g.fillEllipse(px, L3.ground + 30, 120, 10);
      const sheen = this.add
        .image(px, L3.ground + 28, 'ch2-fx-glow')
        .setScale(1.1, 0.14)
        .setTint(0x8a94b0)
        .setAlpha(0.1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3.6);
      this.tweens.add({ targets: sheen, alpha: 0.2, duration: 3400 + (px % 900), yoyo: true, repeat: -1 });
    });

    // The banner at the gate: the district's last slogan, weathered through.
    const banner = this.add.container(L3.gateX + 45, L3.ground - 150).setDepth(3.7);
    const cloth = this.add.graphics();
    cloth.fillStyle(0x2c2620, 0.95);
    cloth.beginPath();
    cloth.moveTo(-34, 0);
    cloth.lineTo(34, 0);
    cloth.lineTo(30, 62);
    cloth.lineTo(14, 54);
    cloth.lineTo(2, 66);
    cloth.lineTo(-12, 56);
    cloth.lineTo(-30, 64);
    cloth.closePath();
    cloth.fillPath();
    cloth.lineStyle(1, 0x4a4034, 0.8);
    cloth.lineBetween(-34, 0, 34, 0);
    const slogan = this.add
      .text(0, 24, 'RENEWAL', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '13px',
        color: '#7a6a52',
      })
      .setOrigin(0.5);
    banner.add([cloth, slogan]);
    this.tweens.add({
      targets: banner,
      rotation: 0.06,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ------------------------------------------------------------ chase (§5.3)

  buildChase() {
    // The retiring district: a grey bite-front of dust and toppling
    // obelisks that never stops walking right.
    this.chaseX = -800;
    this.chaseFig = this.add.container(this.chaseX, 470).setDepth(5);
    const dust = this.add
      .image(-90, -40, 'ch2-mote')
      .setScale(16, 40)
      .setTint(0x23262e)
      .setAlpha(0.4);
    const teeth = this.add.graphics();
    teeth.fillStyle(0x171a21, 0.95);
    teeth.beginPath();
    teeth.moveTo(26, -420);
    for (let i = 0; i <= 8; i++) {
      const y = -420 + i * 110;
      teeth.lineTo(26 + ((i * 41) % 46) - 12, y);
      teeth.lineTo(-30 - ((i * 59) % 50), y + 55);
    }
    teeth.lineTo(26, 500);
    teeth.closePath();
    teeth.fillPath();
    // Obelisk silhouettes caught mid-topple in the dust (hand-rotated quads).
    teeth.fillStyle(0x2c313c, 0.9);
    const obelisk = (cx, cy, w, len, ang) => {
      const c = Math.cos(ang);
      const s2 = Math.sin(ang);
      const hw = w / 2;
      teeth.fillPoints(
        [
          { x: cx - c * hw, y: cy - s2 * hw },
          { x: cx + c * hw, y: cy + s2 * hw },
          { x: cx + c * hw - s2 * len, y: cy + s2 * hw + c * len },
          { x: cx - c * hw - s2 * len, y: cy - s2 * hw + c * len },
        ],
        true,
      );
    };
    obelisk(-40, -260, 26, 170, 0.5);
    obelisk(-10, -80, 20, 120, -0.35);
    this.chaseFig.add([dust, teeth]);
    this.chaseRumbleAt = 0;
  }

  updateChase(dt, now) {
    const p = this.player.p;
    this.chaseX += L3.chaseSpeed * dt;
    this.chaseFig.setPosition(this.chaseX, 470);
    const near = Phaser.Math.Clamp(1 - (p.x - this.chaseX) / 640, 0, 1);
    if (now > this.chaseRumbleAt) {
      this.chaseRumbleAt = now + 560;
      synthThud(this, { freq: 48, gain: 0.07 + near * 0.18, dur: 0.5 });
    }
    if (near > 0.3) this.cameras.main.shake(110, 0.001 + near * 0.002);
    if (!p.dead && p.x < this.chaseX + 30) this.die(true);
  }

  // ------------------------------------------------------------ shed shell (Q)

  /** Q — blow a third of the shell off: lighter, quicker, weaker landing. */
  shedShell(now) {
    if (now < this.shedReadyAt || now < this.shedUntil) return;
    this.shedUntil = now + 8000;
    this.shedReadyAt = now + 14000;
    AGG.walkSpeed = 218;
    AGG.jumpVelocity = -645;
    // The shell sheds: shards burst outward, the ring thins.
    const pl = this.player;
    let shed = 0;
    pl.shell.forEach((s, i) => {
      if (i % 3 === 0 && s.img.visible) {
        s.img.setVisible(false);
        shed++;
      }
    });
    const p = pl.p;
    this.add
      .particles(p.x, p.y - 50, 'ch2-shard', {
        speed: { min: 120, max: 380 },
        lifespan: { min: 300, max: 800 },
        quantity: shed,
        scale: 0.4,
        rotate: { min: -300, max: 300 },
        emitting: false,
      })
      .setDepth(6)
      .explode(shed);
    this.cameras.main.shake(120, 0.004);
    synthBuzz(this, { freq: 520, dur: 0.3, gain: 0.16 });
    if (!this.shedSaid) {
      this.shedSaid = true;
      this.vessel.say('Discarding issued mass. It will be billed.');
    }
  }

  regrowShell() {
    AGG.walkSpeed = 150;
    AGG.jumpVelocity = -560;
    this.player.shell.forEach((s, i) => {
      if (i < this.player.revealed) s.img.setVisible(true);
    });
    synthThud(this, { freq: 120, gain: 0.2, dur: 0.3 });
  }

  /** Shock tuning respects the shed state: lighter body, softer crater. */
  get shockR() {
    return (this.shedUntil > this.time.now ? 0.6 : 1) * AGG.shockRadius;
  }

  // ------------------------------------------------------------------ ground

  /** Field ground plus standing platforms; null = void. */
  groundYAt(x) {
    let y = this.field.groundAt(x);
    if (y === null) y = Infinity;
    for (const pl of L3.platforms) {
      if (pl.state === 'fallen') continue;
      if (x >= pl.x - pl.w / 2 && x <= pl.x + pl.w / 2) y = Math.min(y, pl.y);
    }
    return y === Infinity ? null : y;
  }

  platformUnder(p) {
    if (!p.grounded) return null;
    for (const pl of L3.platforms) {
      if (pl.state === 'fallen') continue;
      if (Math.abs(p.y - pl.y) < 3 && p.x >= pl.x - pl.w / 2 && p.x <= pl.x + pl.w / 2) return pl;
    }
    return null;
  }

  updatePlatforms(now) {
    const standing = this.phase === 'PLAY' ? this.platformUnder(this.player.p) : null;
    for (const pl of L3.platforms) {
      if (pl.state === 'idle' && pl === standing) {
        pl.state = 'shaking';
        pl.shookAt = now;
        pl.img.setTint(0xff8a5d);
        synthBuzz(this, { freq: 90, dur: 0.3, gain: 0.1 });
      }
      if (pl.state === 'shaking') {
        pl.img.setPosition(pl.x + Phaser.Math.Between(-2, 2), pl.y + 7 + Phaser.Math.Between(-1, 2));
        if (now - pl.shookAt > L3.crumbleMs) {
          pl.state = 'fallen';
          pl.img.clearTint();
          synthThud(this, { freq: 85, gain: 0.3, dur: 0.4 });
          this.tweens.add({ targets: pl.img, y: pl.y + 340, alpha: 0, duration: 900, ease: 'Quad.easeIn' });
          this.add
            .particles(pl.x, pl.y, 'ch2-mote', {
              speed: { min: 40, max: 160 },
              lifespan: { min: 300, max: 700 },
              quantity: 18,
              scale: { min: 0.4, max: 1 },
              tint: [0x39424e, 0x5d6a78],
              blendMode: Phaser.BlendModes.ADD,
              emitting: false,
            })
            .setDepth(6)
            .explode(18);
        }
      }
    }
  }

  restorePlatforms() {
    for (const pl of L3.platforms) {
      this.tweens.killTweensOf(pl.img);
      pl.state = 'idle';
      pl.img.clearTint();
      pl.img.setPosition(pl.x, pl.y + 7);
      pl.img.setAlpha(1);
    }
  }

  restoreSlabs() {
    for (const s of L3.slabs) {
      if (!s.cracked) continue;
      s.cracked = false;
      const gi = this.field.gaps.findIndex((g) => g.from === s.x0 && g.to === s.x1);
      if (gi >= 0) this.field.gaps.splice(gi, 1);
      if (s.holeGfx) {
        s.holeGfx.destroy();
        s.holeGfx = null;
      }
    }
  }

  // ------------------------------------------------------------------ psychos

  spawnPsychos() {
    for (const x of L3.psychoX) this.psychos.push(new Psycho(this, x, this.field));
  }

  /** Shockwave kill: the aggregate lands and the ground itself hits back.
   *  Tiers by impact: a hop scares, a fall kills, a PLUNGE breaks the
   *  street open (§5.2). */
  shockwave(x, y, impact) {
    const shed = this.shedUntil > this.time.now;
    const tier = impact > 820 ? 2 : impact > 560 ? 1 : 0;
    const radius = this.shockR * (tier === 2 ? 1.5 : tier === 1 ? 1.25 : 1);
    const power = Phaser.Math.Clamp(impact / 900, 0.6, 1.3);
    const ring = this.add.graphics().setDepth(7);
    ring.lineStyle(tier === 2 ? 4 : 3, tier === 2 ? 0xffc46b : 0x9fd8e8, 0.9);
    ring.strokeCircle(x, y - 6, 16);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: radius / 9,
      scaleY: radius / 22,
      duration: tier === 2 ? 480 : 380,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.cameras.main.shake(tier === 2 ? 260 : 180, 0.009 * power);
    synthThud(this, { freq: tier === 2 ? 45 : 55, gain: 0.5, dur: tier === 2 ? 0.7 : 0.5 });
    // A beat of slow-mo so the shatter reads.
    this.slow = 0.3;
    this.time.delayedCall(130, () => {
      if (this.phase === 'PLAY') this.slow = 1;
    });
    // The street gives way under a hard enough landing.
    if (tier >= 1 && !shed) {
      for (const s of L3.slabs) {
        if (s.cracked) continue;
        const mid = (s.x0 + s.x1) / 2;
        if (Math.abs(mid - x) < radius + (s.x1 - s.x0) / 2) this.crackSlab(s);
      }
    }
    for (const psy of this.psychos) {
      if (!psy.alive) continue;
      const d = Math.hypot(psy.p.x - x, psy.p.y - y);
      if (d > radius) continue;
      psy.hp = 1;
      psy.takeHit(x);
      this.onPsychoDead(psy);
    }
  }

  onPsychoDead(t) {
    this.add
      .particles(t.p.x, t.p.y - 30, 'ch2-gib', {
        speed: { min: 120, max: 460 },
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
    this.add
      .particles(t.p.x, t.p.y - 30, 'ch2-mote', {
        speed: { min: 100, max: 420 },
        lifespan: { min: 300, max: 800 },
        quantity: 30,
        scale: { min: 0.4, max: 1.5 },
        tint: [0x8e1f24, 0x5c1216, 0xffc46b],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6)
      .explode(30);
    synthThud(this, { freq: 80, gain: 0.35, dur: 0.35 });
    const dir = Math.sign(t.p.x - this.player.p.x) || 1;
    this.tweens.add({
      targets: t.fig,
      x: t.p.x + dir * 190,
      y: t.p.y - 110,
      rotation: dir * 2.8,
      alpha: 0,
      duration: 340,
      ease: 'Quad.easeOut',
      onComplete: () => t.fig.setVisible(false),
    });
    if (t.glowImg) t.glowImg.setVisible(false);
  }

  // ------------------------------------------------------------ hurt & death

  hurtPlayer(psy) {
    const p = this.player.p;
    this.player.lives--;
    this.refreshLivesHud();
    this.player.invulnUntil = this.time.now + AGG.invulnMs;
    p.vx = (p.x < psy.p.x ? -1 : 1) * 260;
    p.vy = -220;
    p.grounded = false;
    this.cameras.main.flash(150, 140, 20, 26);
    synthBuzz(this, { freq: 200, dur: 0.3, gain: 0.16 });
    this.add
      .particles(p.x, p.y - 50, 'ch2-mote', {
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
    if (this.player.lives <= 0) this.die(false);
  }

  /** Gore per §6, then the camera tears back to the spawn. Never black. */
  die(byVoid) {
    const p = this.player.p;
    if (p.dead) return;
    p.dead = true;
    this.phase = 'DYING';
    this.slow = 1;
    if (!byVoid) {
      this.cameras.main.flash(400, 160, 20, 26);
      synthBuzz(this, { freq: 90, dur: 0.8, gain: 0.2 });
      this.add
        .particles(p.x, p.y - 50, 'ch2-mote', {
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
      // The shell bursts off — every shard it stole, thrown at once.
      this.add
        .particles(p.x, p.y - 50, 'ch2-shard', {
          speed: { min: 160, max: 520 },
          gravityY: 1100,
          rotate: { start: 0, end: 360 },
          lifespan: { min: 600, max: 1200 },
          quantity: 12,
          scale: { min: 0.3, max: 0.7 },
          emitting: false,
        })
        .setDepth(6)
        .explode(12);
      // Death drags time down with it.
      this.slow = 0.2;
      setTimeout(() => {
        this.slow = 1;
      }, 520);
      this.cameras.main.shake(200, 0.013);
      this.time.delayedCall(650, () => {
        playVoidDeath(this, () => this.respawn(), {
          panTo: { x: L3.spawn.x + 200, y: 380 },
        });
      });
      return;
    }
    playVoidDeath(this, () => this.respawn(), {
      panTo: { x: L3.spawn.x + 200, y: 380 },
    });
    // The pit keeps its own ledger.
    if (p.x > L3.detonateMinX) {
      const c = this.add
        .text(GAME_W / 2, 200, MISS_COMMENT, {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '12px',
          color: '#5d6a78',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(90)
        .setAlpha(0);
      this.tweens.add({
        targets: c,
        alpha: 0.9,
        duration: 600,
        delay: 900,
        onComplete: () => this.tweens.add({ targets: c, alpha: 0, duration: 1000, delay: 2200 }),
      });
    }
  }

  respawn() {
    const p = this.player.p;
    p.x = L3.spawn.x;
    p.y = this.field.groundAt(L3.spawn.x);
    p.vx = 0;
    p.vy = 0;
    p.grounded = true;
    p.dead = false;
    this.player.lives = AGG.lives;
    this.player.invulnUntil = this.time.now + 1500;
    this.player.setVisible(true);
    this.refreshLivesHud();
    this.restorePlatforms();
    this.restoreSlabs();
    this.chaseX = L3.spawn.x - 420;
    this.chaseFig.setPosition(this.chaseX, 470);
    if (this.shedUntil) {
      this.shedUntil = 0;
      this.regrowShell();
    }
    this.shedReadyAt = 0;
    this.psychos.forEach((psy) => psy.destroy());
    this.psychos = [];
    this.spawnPsychos();
    const cam = this.cameras.main;
    cam.centerOn(p.x + 140, 380);
    cam.startFollow(this.player.fig, true, 0.1, 0.1);
    cam.setFollowOffset(0, 60);
    cam.flash(140, 159, 216, 232);
    synthThud(this, { freq: 100, gain: 0.25, dur: 0.3 });
    this.phase = 'PLAY';
  }

  // --------------------------------------------------------------- detonation

  detonate() {
    const p = this.player.p;
    this.phase = 'DETONATE';
    p.vx = 0;
    p.vy = 0;
    this.hint.setText('');

    // 300ms of near-stop time — the frame holds its breath.
    this.slow = 0.15;
    this.time.delayedCall(300, () => {
      this.slow = 1;
    });

    // The shell leaves all at once: every shard flung radially.
    const cx = p.x;
    const cy = p.y - 52;
    this.player.shell.forEach((s, i) => {
      if (!s.img.visible) return;
      s.img.setVisible(false);
      const a = (i / this.player.shell.length) * Math.PI * 2 + Math.random() * 0.4;
      const shard = this.add.image(cx, cy, 'ch2-shard').setScale(0.68).setRotation(s.img.rotation).setDepth(7);
      this.tweens.add({
        targets: shard,
        x: cx + Math.cos(a) * 320,
        y: cy + Math.sin(a) * 320,
        rotation: s.img.rotation + 6,
        alpha: 0,
        duration: 700,
        ease: 'Quad.easeOut',
        onComplete: () => shard.destroy(),
      });
    });
    // The shock ring.
    const ring = this.add.graphics().setDepth(8);
    ring.lineStyle(4, 0xd8f4fc, 1);
    ring.strokeCircle(cx, cy, 20);
    this.tweens.add({
      targets: ring,
      scaleX: 14,
      scaleY: 14,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.cameras.main.shake(260, 0.012);
    this.cameras.main.flash(280, 226, 236, 244);
    synthBuzz(this, { freq: 480, dur: 0.7, gain: 0.24 });
    synthThud(this, { freq: 50, gain: 0.55, dur: 0.6 });

    // What remains: a naked torso, and the AI still lit in its chest.
    this.player.setVisible(false);
    this.torso = this.add.container(cx, cy).setDepth(6);
    this.torsoBody = this.add.image(0, 0, 'ch2-hu-body');
    this.torsoHead = this.add.image(1, -18, 'ch2-hu-head');
    this.torsoCore = this.add
      .image(0, -3, 'ch2-mote')
      .setScale(4)
      .setTint(0x9fd8e8)
      .setAlpha(0.8)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.torso.add([this.torsoBody, this.torsoHead, this.torsoCore]);

    // A fixed, ceremonial trajectory — the blast does the aiming, not RNG.
    this.time.delayedCall(340, () => {
      this.phase = 'FLIGHT';
      this.flightT0 = this.time.now;
      this.flightDur = 1150;
      this.flightFrom = { x: cx, y: cy };
      this.flightTo = { x: L3.goalX, y: this.field.groundAt(L3.goalX) - 14 };
      this.flightH = 190;
    });
  }

  updateFlight(now) {
    const u = Phaser.Math.Clamp((now - this.flightT0) / this.flightDur, 0, 1);
    const e = u; // linear x, parabolic y — a thrown body, not a jump
    const x = Phaser.Math.Linear(this.flightFrom.x, this.flightTo.x, e);
    const y =
      Phaser.Math.Linear(this.flightFrom.y, this.flightTo.y, e) - this.flightH * 4 * u * (1 - u);
    this.torso.setPosition(x, y);
    this.torso.setRotation(u * Math.PI * 0.5);
    if (u >= 1) this.beginEnd();
  }

  // --------------------------------------------------------------------- end

  beginEnd() {
    this.phase = 'END';
    const gy = this.field.groundAt(L3.goalX);
    // It lands like laundry. Rotation finishes to lying flat.
    this.tweens.add({
      targets: this.torso,
      rotation: Math.PI * 0.5,
      y: gy - 8,
      duration: 260,
      ease: 'Quad.easeOut',
    });
    synthThud(this, { freq: 90, gain: 0.3, dur: 0.35 });
    this.cameras.main.stopFollow();
    this.cameras.main.pan(L3.goalX + 160, 380, 1400, 'Sine.easeInOut');

    // The core keeps breathing. Everything else is done.
    this.tweens.add({ targets: this.torsoCore, alpha: 0.25, scale: 2.6, duration: 1300, yoyo: true, repeat: -1 });

    // Far away, the next prosthetic rises into the gate's cold light.
    const nextBody = this.add
      .image(L3.gateX + 20, L3.ground + 60, 'ch2-aug-body')
      .setScale(0.6)
      .setAlpha(0)
      .setDepth(3);
    const nextGlow = this.add
      .image(L3.gateX + 20, L3.ground + 40, 'ch2-mote')
      .setScale(8)
      .setTint(0x9fd8e8)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2);
    this.tweens.add({ targets: nextGlow, alpha: 0.5, duration: 1600, delay: 1200 });
    this.tweens.add({
      targets: nextBody,
      alpha: 0.95,
      y: L3.ground - 16,
      duration: 3400,
      delay: 1400,
      ease: 'Sine.easeInOut',
    });

    // The subtitle, one character at a time.
    const sub = this.add
      .text(GAME_W / 2, 100, '', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '15px',
        color: '#9fb4c4',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60);
    let i = 0;
    const typeTimer = this.time.addEvent({
      delay: 42,
      repeat: SUBTITLE.length - 1,
      callback: () => {
        i++;
        sub.setText(SUBTITLE.slice(0, i));
        if (i >= SUBTITLE.length) {
          this.time.delayedCall(900, () => {
            // The company's version of what just happened (story §6, bulletin voice).
            this.add
              .text(GAME_W / 2, GAME_H - 96,
                'NIGHTFALL BULLETIN: Citizen 8\'s upgrade ceremony concluded with zero incidents.\nThe upgrade window remains open.', {
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: '11px',
                color: '#46525f',
                align: 'center',
              })
              .setOrigin(0.5)
              .setScrollFactor(0)
              .setDepth(60);
            this.add
              .text(GAME_W / 2, GAME_H - 60, 'CHAPTER 2 · END\nENTER — menu', {
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: '13px',
                color: '#5d6a78',
                align: 'center',
              })
              .setOrigin(0.5)
              .setScrollFactor(0)
              .setDepth(60);
            this.endReady = true;
          });
          typeTimer.destroy();
        }
      },
    });
  }

  // -------------------------------------------------------------------- loop

  readInput() {
    const k = this.keys;
    return {
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      jump: k.jump.isDown,
    };
  }

  update(time, delta) {
    const now = this.time.now;
    const dt = Math.min(delta / 1000, 1 / 30) * this.slow;

    if (this.phase === 'END') {
      if (this.endReady && Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.scene.start('Menu');
      return;
    }
    if (this.phase === 'FORM' || this.phase === 'DYING') {
      this.player.fig.setScale(this.figScale ?? 1, this.figScale ?? 1);
      return;
    }
    if (this.phase === 'DETONATE') return; // frozen mid-air, tweens carry it
    if (this.phase === 'FLIGHT') {
      this.updateFlight(now);
      return;
    }

    // PLAY
    const p = this.player.p;
    if (p.grounded) this.groundedAt = now;

    const input = this.readInput();
    // A two-tonne shell leaving the ground has a sound.
    if (input.jump && p.grounded) synthThud(this, { freq: 170, gain: 0.14, dur: 0.2 });
    const res = this.player.step(dt, input, (x) => this.groundYAt(x), { worldEnd: L3.worldEnd });
    this.player.animate(dt);
    if (res && res.land && res.land > AGG.shockMinVy) this.shockwave(p.x, p.y, res.land);

    this.updatePlatforms(now);
    this.updateChase(dt, now);

    // Q — shed the shell (edge-triggered).
    const qEdge = this.keys.q.isDown && !this.qPrev;
    this.qPrev = this.keys.q.isDown;
    if (qEdge) this.shedShell(now);
    if (this.shedUntil && now > this.shedUntil) {
      this.shedUntil = 0;
      this.regrowShell();
    }

    // F — true edge, only armed in mid-air near the pit, inside the window.
    const fEdge = this.keys.f.isDown && !this.fPrev;
    this.fPrev = this.keys.f.isDown;
    if (
      fEdge &&
      !p.grounded &&
      !p.dead &&
      p.x > L3.detonateMinX &&
      now - this.groundedAt <= AGG.detonateWindowMs
    ) {
      this.detonate();
      return;
    }

    // Psychos hunt the shell; contact costs a life. Broken floors keep
    // their own ledger: what falls into a cracked slab stays down.
    const target = { x: p.x, y: p.y - 50 };
    for (const psy of this.psychos) {
      if (!psy.alive) continue;
      if (psy.p.y > L3.killY) {
        psy.alive = false;
        psy.fig.setVisible(false);
        if (psy.glowImg) psy.glowImg.setVisible(false);
        continue;
      }
      const hit = psy.step(dt, target, now);
      if (hit && !this.player.hurt && !p.dead) this.hurtPlayer(psy);
    }

    // The void.
    if (!p.dead && p.y > L3.killY) {
      this.die(true);
      return;
    }

    // Hint swap near the pit.
    if (p.x > L3.detonateMinX - 140) {
      this.hint.setText('DETONATE: press F in mid-air');
      if (!this.detonateWarned) {
        this.detonateWarned = true;
        this.vessel.say('Detonation is scheduled. Compliance is expected.');
      }
    } else if (this.hint.text.startsWith('DETONATE'))
      this.hint.setText('A/D · ←/→ move — SPACE jump — Q shed shell — do not stop');
  }
}
