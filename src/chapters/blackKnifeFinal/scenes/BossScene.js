import Phaser from 'phaser';
import { W, H, COLORS, BOSS, PLAYER, DEPTHS } from '../constants.js';
import { createSfx } from '../sfx.js';
import Player from '../entities/Player.js';
import Boss from '../entities/Boss.js';
import Hud from '../entities/Hud.js';

// Chapter 6 — THE CONDUCTOR. Cuphead-style (Dr. Kahl's Robot pacing) boss
// battle with Black Knife-inspired bullet patterns.
//
// FIVE phases (~7 minute fight) read off the HP bar → KNOCKOUT.
// Arsenal grows every phase: baton fans → coal flak + signal lasers →
// spiral streams + ticket walls + tracking eye beam → ticket vortex →
// ENRAGED (red Conductor, faster music, piston-press waves, everything).
export default class BossScene extends Phaser.Scene {
  constructor() { super('battle'); }

  create() {
    this.stateFlag = 'menu';
    this.settings = window.__conductorSettings ?? { shake: true, flash: false, sound: true };
    this.sfx = createSfx(this);
    this.buildBackground();

    this.fxGfx = this.add.graphics().setDepth(DEPTHS.fx);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,Z,J,SPACE,X,C,L,SHIFT,K,P,ESC');

    this.announceText = this.add.text(W / 2, H / 2, '', {
      fontFamily: 'Space Mono, monospace', fontSize: '64px', fontStyle: 'bold',
      color: '#ffe733', stroke: '#ff2266', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(DEPTHS.overlay).setVisible(false);

    this.hintText = this.add.text(W / 2, H - 64, '', {
      fontFamily: 'Space Mono, monospace', fontSize: '15px', fontStyle: 'bold',
      color: '#43e9ff', stroke: '#03202a', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTHS.overlay).setVisible(false);

    // Shield is also latched from a DOM keydown: Phaser can miss a tap that
    // starts and ends between two frames, and with only 3 charges every
    // press has to count.
    this.shieldRequested = false;
    this._shieldKeyHandler = e => {
      if (['x', 'X', 'c', 'C', 'l', 'L'].includes(e.key)) this.shieldRequested = true;
    };
    window.addEventListener('keydown', this._shieldKeyHandler);

    window.__startBattle = () => this.beginIntro();
    window.__battleScene = this;
    window.__pauseBattle = () => this.pauseBattle();
    window.__resumeBattle = () => this.resumeBattle();
    this.events.on('shutdown', () => {
      window.removeEventListener('keydown', this._shieldKeyHandler);
      window.__startBattle = null; window.__battleScene = null;
      window.__pauseBattle = null; window.__resumeBattle = null;
    });
  }

  // ---------- pause ----------
  pauseBattle() {
    if (this.scene.isPaused() || (this.stateFlag !== 'play' && this.stateFlag !== 'intro')) return;
    this.playSfx('pause', 1);
    this.music?.pause();
    this.scene.pause();
    document.querySelector('#pause-overlay').classList.remove('hidden');
  }

  resumeBattle() {
    if (!this.scene.isPaused()) return;
    document.querySelector('#pause-overlay').classList.add('hidden');
    this.scene.resume();
    this.music?.resume();
  }

  // ---------- environment ----------
  buildBackground() {
    const g = this.add.graphics().setDepth(DEPTHS.bg);
    g.fillStyle(COLORS.bg, 1).fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i += 1) {
      g.fillStyle(0x2a0a22, 1).fillRect((i * 149) % W, (i * 97) % H, 2, 2);
    }
    // Perspective train tracks (from the key art)
    g.lineStyle(3, 0x77123f, 1);
    g.lineBetween(0, H - 18, W, H - 92);
    g.lineBetween(0, H - 78, W, H - 128);
    for (let i = 0; i < 24; i += 1) {
      const t = i / 24;
      const x = t * W;
      g.lineStyle(2.5, 0x5c0e33, 1);
      g.lineBetween(x, H - 18 - t * 74 + 6, x + 24, H - 78 - t * 50 - 4);
    }
    this.add.image(70, H - 105, 'crossing').setDepth(DEPTHS.tracks);
    this.signal = this.add.image(W * 0.56, H - 165, 'signal').setDepth(DEPTHS.tracks);
    this.signalGlow = this.add.graphics().setDepth(DEPTHS.tracks + 1);
  }

  // ---------- audio ----------
  playSfx(name, vol = 1) {
    if (!this.settings.sound) return;
    this.sfx.play(name, vol);
  }

  // ---------- battle lifecycle ----------
  beginIntro() {
    this.stateFlag = 'intro';
    this.playerBullets = [];
    this.enemyShots = [];
    this.beams = [];
    this.warnings = [];
    this.particles = [];
    this.attackActive = false;
    this.lastAttack = null;
    this.decisionClock = 0;
    this.ambientClock = 0;
    this.sideClock = 0;
    this.signalRed = false;
    this._beamRepeated = false;
    this.suppressSide = false;

    this.player = new Player(this);
    this.boss = new Boss(this);
    this.hud = new Hud(this);

    if (this.cache.audio.exists('music-battle') && this.settings.sound) {
      this.music?.stop();
      this.music = this.sound.add('music-battle', { loop: true, volume: 0.5 });
      this.music.setRate(1);
      this.music.play();
    }

    // The Infinity Train chugs in from the right; the Conductor previews his
    // weapons (baton raise → eye magic) — then READY? / WALLOP!
    this.playSfx('train', 1);
    if (this.settings.shake) this.cameras.main.shake(900, 0.005);
    this.boss.playAnim('move');
    this.tweens.add({
      targets: this.boss, x: this.boss.baseX, duration: 1900, ease: 'Cubic.easeOut',
      onComplete: () => this.boss.playAnim('idle'),
    });
    this.time.delayedCall(2000, () => { if (this.stateFlag === 'intro') { this.boss.playAnim('baton'); this.playSfx('baton', 0.7); } });
    this.time.delayedCall(2700, () => { if (this.stateFlag === 'intro') { this.boss.playAnim('magic'); this.eyeGlow(); } });
    this.time.delayedCall(3400, () => {
      if (this.stateFlag !== 'intro') return;
      this.announce('READY?', 700, () => {
        this.announce('WALLOP!', 600, () => {
          this.boss.state = 'battle';
          this.stateFlag = 'play';
          this.decisionClock = 0.7;
          this.showHint('X / C = SHIELD (1.5s)  —  3 CHARGES, REFILLED EVERY PHASE YOU BREAK.');
        });
      });
    });
  }

  showHint(text) {
    this.hintText.setText(text).setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.hintText, alpha: 1, duration: 250 });
    this.time.delayedCall(3600, () => {
      this.tweens.add({ targets: this.hintText, alpha: 0, duration: 400, onComplete: () => this.hintText.setVisible(false) });
    });
  }

  announce(text, holdMs, then) {
    this.announceText.setText(text).setVisible(true).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: this.announceText, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
    this.playSfx('phase', 0.7);
    this.time.delayedCall(holdMs, () => {
      this.tweens.add({
        targets: this.announceText, alpha: 0, duration: 140,
        onComplete: () => { this.announceText.setVisible(false); then?.(); },
      });
    });
  }

  eyeGlow() {
    const e = this.boss.eyePos();
    this.emitBurst(e.x, e.y, 10, COLORS.green);
    this.playSfx('magic', 0.6);
  }

  // ---------- attack decks (one new trick every phase) ----------
  pickAttack() {
    const decks = [
      ['baton', 'locomotive', 'magic', 'traincar'],
      ['baton', 'locomotive', 'magic', 'traincar', 'coal', 'signal'],
      ['baton', 'locomotive', 'magic', 'traincar', 'coal', 'signal', 'spiral', 'ticketwall', 'eyebeam'],
      ['locomotive', 'magic', 'traincar', 'coal', 'signal', 'spiral', 'ticketwall', 'eyebeam', 'vortex', 'baton'],
      ['locomotive', 'magic', 'traincar', 'coal', 'signal', 'spiral', 'ticketwall', 'eyebeam', 'vortex', 'wave', 'wave', 'baton'],
    ];
    const deck = decks[this.boss.phase].filter(a => a !== this.lastAttack);
    const choice = Phaser.Utils.Array.GetRandom(deck);
    this.lastAttack = choice;
    return choice;
  }

  startAttack(name) {
    this.attackActive = true;
    this.boss.busy = true;
    this.boss.windup();
    ({
      baton: () => this.batonAttack(),
      locomotive: () => this.locomotiveAttack(),
      magic: () => this.magicAttack(),
      signal: () => this.signalAttack(),
      traincar: () => this.trainCarAttack(),
      ticketwall: () => this.ticketWallAttack(),
      eyebeam: () => this.eyeBeamAttack(),
      coal: () => this.coalAttack(),
      spiral: () => this.spiralAttack(),
      vortex: () => this.vortexAttack(),
      wave: () => this.waveAttack(),
    })[name]();
  }

  endAttack(recoverySeconds) {
    if (this.stateFlag !== 'play') return;
    this.attackActive = false;
    this.boss.busy = false;
    const speedup = [1, 0.9, 0.78, 0.64, 0.5][this.boss.phase];
    this.decisionClock = recoverySeconds * speedup;
    this.boss.reposition(this.boss.phase >= 2 && Math.random() < 0.45);
  }

  // BATON: crossfire ticket fans + homing tickets
  batonAttack() {
    const phase = this.boss.phase;
    const volleys = 3 + Math.min(3, phase);
    const spread = [5, 5, 7, 7, 9][phase];
    const speed = [300, 330, 365, 400, 440][phase];
    let fired = 0;
    const volley = () => {
      if (this.stateFlag !== 'play') return;
      this.boss.playAnim('baton');
      this.playSfx('baton', 0.8);
      const o = this.boss.batonHandPos();
      const origins = phase >= 1
        ? [o, { x: o.x + 40, y: this.boss.y - 60 }]
        : [o];
      origins.forEach((org, oi) => {
        const base = Phaser.Math.Angle.Between(org.x, org.y, this.player.x, this.player.y);
        const n = oi === 0 ? spread : 3;
        for (let i = 0; i < n; i += 1) {
          const a = base + (i - (n - 1) / 2) * (0.22 - phase * 0.016);
          this.spawnEnemyShot(org.x, org.y, Math.cos(a) * speed, Math.sin(a) * speed, 'ticket', {
            homing: phase >= 2 && i % 3 === 1 ? 0.7 : 0,
          });
        }
      });
      this.playSfx('ticket', 0.8);
      fired += 1;
      if (fired < volleys) this.time.delayedCall(560 - phase * 60, volley);
      else this.time.delayedCall(400, () => this.endAttack(1.2));
    };
    this.time.delayedCall(140, volley); // beat after the windup squash
  }

  // LOCOMOTIVE: detached engine charges the player's row, smoke-trail hazards
  locomotiveAttack(pass = 0) {
    const phase = this.boss.phase;
    this.boss.playAnim('move');
    this.playSfx('train', 1);
    const bombs = 3 + phase * 2;
    for (let i = 0; i < bombs; i += 1) {
      this.time.delayedCall(120 * i, () => {
        if (this.stateFlag !== 'play') return;
        const c = this.boss.chimneyPos();
        this.playSfx('chug', 0.5);
        this.spawnEnemyShot(c.x, c.y, Phaser.Math.Between(-380, -140), Phaser.Math.Between(-390, -230), 'smokebomb', { ay: 430 });
      });
    }
    const rowY = Phaser.Math.Clamp(this.player.y, 90, H - 90);
    this.warnings.push({ kind: 'row', y: rowY, life: 0.78, max: 0.78 });
    this.time.delayedCall(800, () => {
      if (this.stateFlag !== 'play') return;
      this.playSfx('train', 1);
      if (this.settings.shake) this.cameras.main.shake(420, 0.011);
      const speed = 560 + phase * 70;
      const train = this.add.sprite(W + 180, rowY, 'conductor-locom').setDepth(DEPTHS.attacks).setScale(0.62);
      if (this.anims.exists('conductor-locom-anim')) train.play('conductor-locom-anim');
      this.enemyShots.push({ sprite: train, x: W + 180, y: rowY, vx: -speed, vy: 0, r: 62, kind: 'train', life: 6, pierce: true, trail: phase >= 1 ? 0.11 : 0 });
      const passes = [1, 1, 2, 2, 3][phase];
      this.time.delayedCall(1250, () => {
        if (this.stateFlag !== 'play') return;
        if (pass + 1 < passes) this.locomotiveAttack(pass + 1);
        else { this.boss.playAnim('idle'); this.endAttack(1.4); }
      });
    });
  }

  // MAGIC: aimed arena slashes, staggered orb rings, tentacle spears
  magicAttack() {
    const phase = this.boss.phase;
    this.boss.playAnim('magic');
    this.eyeGlow();
    const slashes = [3, 4, 6, 7, 9][phase];
    for (let i = 0; i < slashes; i += 1) {
      this.time.delayedCall(280 + i * (470 - phase * 60), () => {
        if (this.stateFlag !== 'play') return;
        if (i % 2 === 0) {
          const a = Math.random() * Math.PI;
          const off = (this.player.x - W / 2) * -Math.sin(a) + (this.player.y - H / 2) * Math.cos(a);
          this.lineSlash(a, Phaser.Math.Clamp(off, -220, 220), 620 - phase * 70);
        } else {
          this.lineSlash(Math.random() * Math.PI, Phaser.Math.Between(-190, 190), 620 - phase * 70);
        }
      });
    }
    const rings = phase >= 3 ? 3 : (phase >= 1 ? 2 : 1);
    for (let ring = 0; ring < rings; ring += 1) {
      this.time.delayedCall(550 + ring * 420, () => {
        if (this.stateFlag !== 'play') return;
        this.playSfx('magic', 0.9);
        const e = this.boss.eyePos();
        const n = 12 + phase * 3;
        for (let i = 0; i < n; i += 1) {
          const a = (i / n) * Math.PI * 2 + ring * (Math.PI / n);
          const sp = 165 + phase * 40;
          this.spawnEnemyShot(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 'orb', { spinAround: (ring % 2 ? -0.6 : 0.6) * (phase >= 1 ? 1 : 0) });
        }
        const base = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
        for (let i = -1; i <= 1; i += 1) {
          const a = base + i * 0.13;
          this.spawnEnemyShot(e.x, e.y, Math.cos(a) * (260 + phase * 45), Math.sin(a) * (260 + phase * 45), 'orb');
        }
        this.playSfx('orb', 0.7);
      });
    }
    if (phase >= 2) {
      const spears = phase >= 4 ? 5 : 3;
      for (let i = 0; i < spears; i += 1) {
        this.time.delayedCall(800 + i * 520, () => {
          if (this.stateFlag !== 'play') return;
          const y = this.player.y + Phaser.Math.Between(-50, 50);
          this.warnings.push({ kind: 'spear', y, life: 0.42, max: 0.42 });
          this.time.delayedCall(420, () => {
            if (this.stateFlag !== 'play') return;
            this.spawnEnemyShot(-60, y, 700, 0, 'tentacle');
            this.playSfx('slash', 0.7);
          });
        });
      }
    }
    const total = 280 + slashes * (470 - phase * 60) + 900;
    this.time.delayedCall(total, () => this.endAttack(1.3));
  }

  // SIGNAL: vertical lasers, aimed + doubled (tripled at the end)
  signalAttack() {
    const phase = this.boss.phase;
    const rounds = 2 + phase;
    this.signalRed = true;
    for (let i = 0; i < rounds; i += 1) {
      this.time.delayedCall(i * (720 - phase * 55), () => {
        if (this.stateFlag !== 'play') return;
        const xs = [];
        xs.push(Math.random() < 0.5
          ? Phaser.Math.Clamp(Math.floor(this.player.x), 70, Math.floor(W * 0.64))
          : Phaser.Math.Between(90, Math.floor(W * 0.62)));
        if (phase >= 2) xs.push(Phaser.Math.Between(90, Math.floor(W * 0.62)));
        if (phase >= 4) xs.push(Phaser.Math.Between(90, Math.floor(W * 0.62)));
        xs.forEach(x => {
          this.warnings.push({ kind: 'col', x, life: 0.62, max: 0.62 });
          this.playSfx('wall', 0.35);
          this.time.delayedCall(620, () => {
            if (this.stateFlag !== 'play') return;
            this.beams.push({ vertical: true, x, life: 0.55, width: 18 });
            this.playSfx('laser', 0.9);
            if (this.settings.shake) this.cameras.main.shake(120, 0.007);
          });
        });
      });
    }
    this.time.delayedCall(rounds * (720 - phase * 55) + 850, () => { this.signalRed = false; this.endAttack(1.2); });
  }

  // TRAIN CAR THROW: hurled boxcars (bounce → shrapnel) + bounding wheels
  trainCarAttack() {
    const phase = this.boss.phase;
    const cars = [2, 2, 3, 3, 4][phase];
    this.boss.playAnim('baton');
    this.playSfx('train', 0.9);
    for (let i = 0; i < cars; i += 1) {
      this.time.delayedCall(300 + i * (740 - phase * 60), () => {
        if (this.stateFlag !== 'play') return;
        this.boss.playAnim('baton');
        this.boss.windup();
        this.playSfx('car-throw', 1);
        const o = { x: this.boss.x - 40, y: this.boss.top + 120 };
        const tx = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-40, 90), 60, W * 0.6);
        const t = 1.05 - phase * 0.06;
        const vx = (tx - o.x) / t;
        const vy = ((this.player.y - o.y) - 0.5 * 620 * t * t) / t;
        this.spawnEnemyShot(o.x, o.y, vx, vy, 'traincar', { ay: 620, bounces: 1 });
        if (i % 2 === (phase >= 2 ? 0 : 1)) {
          this.spawnEnemyShot(this.boss.x - 90, this.boss.y - 60, -(300 + phase * 50), -260, 'wheel', { ay: 780, bounces: 3 });
        }
      });
    }
    this.time.delayedCall(300 + cars * (740 - phase * 60) + 900, () => this.endAttack(1.3));
  }

  // TICKET WALL: sweeping wall with one drifting gap
  ticketWallAttack() {
    const phase = this.boss.phase;
    const walls = phase >= 3 ? 2 : 1;
    this.boss.playAnim('magic');
    this.playSfx('wall', 1);
    // Fairness pass: gaps are wide enough to fly through comfortably, the
    // gap position is marked with a bright chevron on the right edge, and the
    // drift is gentle enough to ride. Slightly faster to compensate.
    const gapH = [200, 186, 172, 160, 148][phase];
    const speed = 245 + phase * 38;
    for (let wnum = 0; wnum < walls; wnum += 1) {
      this.time.delayedCall(wnum * 1500, () => {
        if (this.stateFlag !== 'play') return;
        let gapY = Phaser.Math.Between(130, H - 130);
        const drift = (wnum % 2 === 0 ? 1 : -1) * (20 + phase * 6);
        this.warnings.push({ kind: 'wallwarn', life: 0.7, max: 0.7 });
        // Pre-show where the gap will be
        this.warnings.push({ kind: 'gapmark', y: gapY, h: gapH, life: 0.7, max: 0.7 });
        this.playSfx('wall', 0.8);
        this.time.delayedCall(700, () => {
          if (this.stateFlag !== 'play') return;
          const cols = 7;
          for (let c = 0; c < cols; c += 1) {
            this.time.delayedCall(c * 240, () => {
              if (this.stateFlag !== 'play') return;
              gapY = Phaser.Math.Clamp(gapY + drift * 0.24 * 10, 110, H - 110);
              for (let y = 40; y < H - 10; y += 46) {
                if (Math.abs(y - gapY) < gapH / 2) continue;
                this.spawnEnemyShot(W + 30, y, -speed, 0, 'ticket');
              }
              // Live marker tracking the drifting gap
              this.warnings.push({ kind: 'gapmark', y: gapY, h: gapH, life: 0.45, max: 0.45 });
              this.playSfx('ticket', 0.35);
            });
          }
        });
      });
    }
    this.time.delayedCall(walls * 1500 + 700 + 7 * 240 + (W / speed) * 1000 * 0.55, () => this.endAttack(1.5));
  }

  // EYE BEAM: sustained beam that tracks the player vertically.
  // Fairness contract (like the pink slashes): the eye charges visibly, then
  // the beam's exact row LOCKS and is telegraphed as a green band before it
  // fires. It fires exactly on that band, holds still for a grace beat, and
  // only then starts steering toward you. Ambient lasers are silenced while
  // a beam attack runs so nothing else fires unannounced on top of it.
  eyeBeamAttack() {
    const phase = this.boss.phase;
    this.boss.playAnim('magic');
    this.eyeGlow();
    this.playSfx('beam-charge', 1);
    this.suppressSide = true;
    const e = this.boss.eyePos();
    // Stage 1 (0.6s): eye visibly charges — no row is committed yet
    this.warnings.push({ kind: 'beamwarn', y: e.y, life: 0.6, max: 0.6 });
    this.time.delayedCall(600, () => {
      if (this.stateFlag !== 'play') return;
      // Stage 2 (0.6s): LOCK the row where the player is NOW and telegraph it
      const lockY = Phaser.Math.Clamp(this.player.y, 70, H - 50);
      this.warnings.push({ kind: 'beamlock', y: lockY, life: 0.6, max: 0.6 });
      this.playSfx('wall', 0.5);
      this.time.delayedCall(600, () => {
        if (this.stateFlag !== 'play') return;
        this.playSfx('beam-fire', 1);
        if (this.settings.shake) this.cameras.main.shake(200, 0.008);
        const life = 1.8 + phase * 0.2;
        this.beams.push({
          horizontal: true, y: lockY, life, width: 17,
          track: 100 + phase * 25,
          trackDelay: 0.45, // grace beat before it starts steering
        });
        const again = phase >= 2;
        this.time.delayedCall(life * 1000 + 350, () => {
          if (this.stateFlag !== 'play') return;
          if (again && !this._beamRepeated) {
            this._beamRepeated = true;
            this.eyeBeamAttack();
          } else {
            this._beamRepeated = false;
            this.suppressSide = false;
            this.endAttack(1.4);
          }
        });
      });
    });
  }

  // COAL FLAK: lobbed chunks that burst mid-air into shrapnel
  coalAttack() {
    const phase = this.boss.phase;
    this.boss.playAnim('move');
    this.playSfx('train', 0.8);
    const lobs = [4, 5, 6, 8, 10][phase];
    for (let i = 0; i < lobs; i += 1) {
      this.time.delayedCall(i * (340 - phase * 28), () => {
        if (this.stateFlag !== 'play') return;
        const c = this.boss.chimneyPos();
        this.playSfx('coal-lob', 0.6);
        this.spawnEnemyShot(c.x, c.y,
          Phaser.Math.Between(-430, -180), Phaser.Math.Between(-420, -260), 'coal',
          { ay: 500, fuse: Phaser.Math.FloatBetween(0.75, 1.25), shards: 6 + phase * 2 });
      });
    }
    this.time.delayedCall(lobs * (340 - phase * 28) + 1600, () => this.endAttack(1.3));
  }

  // NEW (phase 3+) — SPIRAL: continuous rotating orb stream from the eye.
  // Weave between the arms; the stream direction flips halfway.
  spiralAttack() {
    const phase = this.boss.phase;
    this.boss.playAnim('magic');
    this.eyeGlow();
    const arms = phase >= 4 ? 3 : 2;
    const count = 30 + phase * 6;
    const speed = 190 + phase * 30;
    for (let i = 0; i < count; i += 1) {
      this.time.delayedCall(i * 66, () => {
        if (this.stateFlag !== 'play') return;
        const e = this.boss.eyePos();
        const dir = i < count / 2 ? 1 : -1;
        const base = i * 0.42 * dir;
        for (let a = 0; a < arms; a += 1) {
          const ang = base + (a / arms) * Math.PI * 2;
          this.spawnEnemyShot(e.x, e.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 'orb');
        }
        if (i % 3 === 0) this.playSfx('spiral', 0.5);
      });
    }
    this.time.delayedCall(count * 66 + 800, () => this.endAttack(1.4));
  }

  // NEW (phase 4+) — VORTEX: tickets materialize in a ring around YOU and
  // all converge through your position. Boost out of the circle or shield.
  vortexAttack() {
    const phase = this.boss.phase;
    this.boss.playAnim('magic');
    this.playSfx('vortex', 1);
    const pulses = phase >= 4 ? 2 : 1;
    for (let p = 0; p < pulses; p += 1) {
      this.time.delayedCall(p * 1400, () => {
        if (this.stateFlag !== 'play') return;
        const cx = this.player.x;
        const cy = this.player.y;
        const n = 16 + phase * 2;
        this.warnings.push({ kind: 'ring', x: cx, y: cy, r: 330, life: 0.8, max: 0.8 });
        this.playSfx('vortex', 0.8);
        this.time.delayedCall(800, () => {
          if (this.stateFlag !== 'play') return;
          this.playSfx('slash', 0.9);
          for (let i = 0; i < n; i += 1) {
            const a = (i / n) * Math.PI * 2;
            const sx = cx + Math.cos(a) * 330;
            const sy = cy + Math.sin(a) * 330;
            const sp = 250 + phase * 20;
            this.spawnEnemyShot(sx, sy, -Math.cos(a) * sp, -Math.sin(a) * sp, 'ticket');
          }
        });
      });
    }
    this.time.delayedCall(pulses * 1400 + 1400, () => this.endAttack(1.4));
  }

  // NEW (final phase) — PISTON PRESS: waves of tickets slam across alternating
  // horizontal bands, Dr. Kahl finale-style. Read the safe band and commit.
  waveAttack() {
    this.boss.playAnim('baton');
    this.playSfx('enrage', 0.6);
    const waves = 4;
    const bandH = 92;
    for (let wv = 0; wv < waves; wv += 1) {
      this.time.delayedCall(wv * 950, () => {
        if (this.stateFlag !== 'play') return;
        const offset = wv % 2 === 0 ? 0 : 1;
        const bands = [];
        for (let b = 0; b * bandH + 50 < H; b += 1) {
          if (b % 2 === offset) bands.push(50 + b * bandH);
        }
        bands.forEach(y0 => this.warnings.push({ kind: 'band', y: y0, h: bandH, life: 0.55, max: 0.55 }));
        this.playSfx('wall', 0.5);
        this.time.delayedCall(550, () => {
          if (this.stateFlag !== 'play') return;
          this.playSfx('slash', 1);
          bands.forEach(y0 => {
            for (let y = y0 + 14; y < y0 + bandH; y += 40) {
              this.spawnEnemyShot(W + 30 + Math.random() * 40, y, -520, 0, 'ticket');
            }
          });
        });
      });
    }
    this.time.delayedCall(waves * 950 + 1600, () => this.endAttack(1.2));
  }

  lineSlash(angle, offset, delayMs) {
    this.warnings.push({ kind: 'line', angle, offset, life: delayMs / 1000, max: delayMs / 1000 });
    this.time.delayedCall(delayMs, () => {
      if (this.stateFlag !== 'play') return;
      this.beams.push({ angle, offset, life: 0.4, width: 13 });
      this.playSfx('slash', 0.7);
      if (this.settings.shake) this.cameras.main.shake(90, 0.006);
    });
  }

  // Ambient pressure layered on top of the main attack in late phases
  sideAttackTick(dt) {
    const phase = this.boss.phase;
    if (phase >= 3) {
      this.ambientClock -= dt;
      if (this.ambientClock <= 0) {
        this.ambientClock = phase >= 4 ? 0.6 : 1.0;
        this.spawnEnemyShot(Phaser.Math.Between(60, Math.floor(W * 0.6)), -30, Phaser.Math.Between(-30, 30), 190 + phase * 22, 'ticket');
      }
      this.sideClock -= dt;
      if (this.sideClock <= 0 && !this.suppressSide) {
        this.sideClock = phase >= 4 ? 3.2 : 4.5;
        const x = Phaser.Math.Clamp(Math.floor(this.player.x), 70, Math.floor(W * 0.64));
        this.warnings.push({ kind: 'col', x, life: 0.62, max: 0.62 });
        this.time.delayedCall(620, () => {
          if (this.stateFlag !== 'play') return;
          this.beams.push({ vertical: true, x, life: 0.5, width: 16 });
          this.playSfx('laser', 0.7);
        });
      }
    }
  }

  // ---------- projectiles ----------
  spawnPlayerBullet(x, y) {
    const s = this.add.image(x, y, 'bullet-player').setDepth(DEPTHS.attacks);
    this.playerBullets.push({ sprite: s, x, y });
    this.playSfx('shoot', 0.6);
  }

  spawnEnemyShot(x, y, vx, vy, kind, opts = {}) {
    const texture = {
      ticket: 'ticket', orb: 'orb', smokebomb: 'smoke', spark: 'spark',
      tentacle: 'boss-tentacle', traincar: 'traincar', wheel: 'wheel',
      coal: 'coal', cloud: 'cloud',
    }[kind];
    const s = this.add.image(x, y, texture).setDepth(DEPTHS.attacks);
    if (kind === 'tentacle') s.setRotation(-Math.PI / 2).setScale(1.15);
    if (kind === 'cloud') s.setAlpha(0.85).setScale(Phaser.Math.FloatBetween(0.9, 1.3));
    const r = { ticket: 12, orb: 8, smokebomb: 11, spark: 7, tentacle: 16, traincar: 40, wheel: 21, coal: 10, cloud: 20 }[kind];
    const spin = { ticket: 8, traincar: 2.6, wheel: -9, coal: 4 }[kind] ?? 0;
    this.enemyShots.push({ sprite: s, x, y, vx, vy, r, kind, life: kind === 'cloud' ? 1.9 : 9, spin, ...opts });
  }

  explodeShot(shot, shards = 8, speed = 200) {
    this.emitBurst(shot.x, shot.y, 16, COLORS.yellow);
    this.playSfx('boom', 0.9);
    if (this.settings.shake) this.cameras.main.shake(110, 0.006);
    for (let i = 0; i < shards; i += 1) {
      const a = (i / shards) * Math.PI * 2 + Math.random() * 0.3;
      this.spawnEnemyShot(shot.x, shot.y, Math.cos(a) * speed, Math.sin(a) * speed, 'spark');
    }
  }

  emitBurst(x, y, count, color = COLORS.white) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({ x, y, vx: Phaser.Math.FloatBetween(-260, 260), vy: Phaser.Math.FloatBetween(-260, 260), life: 0.6, color });
    }
  }

  emitSmoke(x, y) {
    const color = this.boss?.enraged ? 0xff3344 : COLORS.smoke;
    this.particles.push({ x, y, vx: Phaser.Math.FloatBetween(10, 60), vy: Phaser.Math.FloatBetween(-90, -50), life: 1.1, color, size: Phaser.Math.Between(4, 9) });
  }

  // ---------- update ----------
  update(_t, deltaMs) {
    const dt = Math.min(0.033, deltaMs / 1000);
    if (this.stateFlag === 'menu') return;

    // NOTE: pause is driven from a DOM keydown listener in main.js — some
    // browsers swallow Escape before Phaser's keyboard plugin sees it.
    const input = {
      dx: Number(this.keys.RIGHT.isDown || this.keys.D.isDown) - Number(this.keys.LEFT.isDown || this.keys.A.isDown),
      dy: Number(this.keys.DOWN.isDown || this.keys.S.isDown) - Number(this.keys.UP.isDown || this.keys.W.isDown),
      fire: this.keys.Z.isDown || this.keys.J.isDown || this.keys.SPACE.isDown || this.input.activePointer.isDown,
      boost: this.keys.SHIFT.isDown || this.keys.K.isDown,
    };
    const shieldTapped = Phaser.Input.Keyboard.JustDown(this.keys.X)
      || Phaser.Input.Keyboard.JustDown(this.keys.C)
      || Phaser.Input.Keyboard.JustDown(this.keys.L)
      || this.shieldRequested;
    this.shieldRequested = false;
    if (shieldTapped && this.stateFlag === 'play') this.player.tryShield();

    this.player.update(dt, this.stateFlag === 'play' ? input : { dx: 0, dy: 0, fire: false, boost: false });
    this.boss.update(dt);
    this.hud.update(dt, this.boss, this.player);

    if (this.stateFlag === 'play') {
      if (!this.attackActive) {
        this.decisionClock -= dt;
        if (this.decisionClock <= 0) this.startAttack(this.pickAttack());
      }
      this.sideAttackTick(dt);
    }

    this.updateProjectiles(dt);
    this.drawFx();
  }

  updateProjectiles(dt) {
    // Player bullets → boss hurt-box
    const halfW = this.boss.sprite.displayWidth * 0.36;
    this.playerBullets = this.playerBullets.filter(b => {
      b.x += PLAYER.bulletSpeed * dt;
      b.sprite.setPosition(b.x, b.y);
      const inX = Math.abs(b.x - this.boss.x) < halfW;
      const inY = b.y > this.boss.top + this.boss.sprite.displayHeight * 0.06 && b.y < this.boss.y;
      if (this.stateFlag === 'play' && inX && inY) {
        b.sprite.destroy();
        this.emitBurst(b.x, b.y, 4, COLORS.yellow);
        this.playSfx('boss-hit', 0.5);
        this.onBossDamaged(this.boss.damage(PLAYER.bulletDamage));
        return false;
      }
      if (b.x > W + 30) { b.sprite.destroy(); return false; }
      return true;
    });

    // Enemy shots → player
    const ground = H - 52;
    this.enemyShots = this.enemyShots.filter(shot => {
      shot.life -= dt;
      if (shot.ay) shot.vy += shot.ay * dt;
      if (shot.homing) {
        const a = Phaser.Math.Angle.Between(shot.x, shot.y, this.player.x, this.player.y);
        const cur = Math.atan2(shot.vy, shot.vx);
        const next = Phaser.Math.Angle.RotateTo(cur, a, shot.homing * dt);
        const sp = Math.hypot(shot.vx, shot.vy);
        shot.vx = Math.cos(next) * sp; shot.vy = Math.sin(next) * sp;
      }
      if (shot.spinAround) {
        const a = Math.atan2(shot.vy, shot.vx) + shot.spinAround * dt;
        const sp = Math.hypot(shot.vx, shot.vy);
        shot.vx = Math.cos(a) * sp; shot.vy = Math.sin(a) * sp;
      }
      shot.x += shot.vx * dt; shot.y += shot.vy * dt;

      if ((shot.kind === 'traincar' || shot.kind === 'wheel') && shot.y > ground && shot.vy > 0) {
        if (shot.bounces > 0) {
          shot.bounces -= 1;
          shot.y = ground;
          shot.vy *= -(shot.kind === 'wheel' ? 0.72 : 0.5);
          this.emitBurst(shot.x, ground + 16, 8, COLORS.pink);
          this.playSfx(shot.kind === 'wheel' ? 'wheel' : 'clank', 0.8);
          if (this.settings.shake && shot.kind === 'traincar') this.cameras.main.shake(90, 0.005);
        } else if (shot.kind === 'traincar') {
          this.explodeShot(shot, 8, 210);
          shot.sprite.destroy();
          return false;
        }
      }
      if (shot.kind === 'coal') {
        shot.fuse -= dt;
        if (shot.fuse <= 0) {
          this.explodeShot(shot, shot.shards, 185);
          shot.sprite.destroy();
          return false;
        }
      }
      if (shot.kind === 'train' && shot.trail) {
        shot.trailT = (shot.trailT ?? 0) - dt;
        if (shot.trailT <= 0 && shot.x < W * 0.9 && shot.x > 40) {
          shot.trailT = shot.trail;
          this.spawnEnemyShot(shot.x + 120, shot.y + Phaser.Math.Between(-24, 24), 0, 0, 'cloud');
        }
      }

      if (shot.spin) shot.sprite.rotation += shot.spin * dt;
      if (shot.kind === 'smokebomb') shot.sprite.rotation += 2 * dt;
      shot.sprite.setPosition(shot.x, shot.y);
      if (shot.kind === 'cloud') shot.sprite.setAlpha(Math.min(0.85, shot.life * 0.9));

      const touching = Phaser.Math.Distance.Between(shot.x, shot.y, this.player.x, this.player.y) < shot.r + PLAYER.hitRadius;
      if (this.stateFlag === 'play' && touching) {
        if (this.player.shielded) {
          if (!shot.pierce && shot.kind !== 'cloud') {
            this.emitBurst(shot.x, shot.y, 8, COLORS.cyan);
            shot.sprite.destroy();
            return false;
          }
        } else {
          if (this.player.hit()) this.onPlayerHit();
          if (!shot.pierce && shot.kind !== 'cloud') { shot.sprite.destroy(); return false; }
        }
      }
      if (shot.life <= 0 || shot.x < -420 || shot.x > W + 420 || shot.y > H + 120 || shot.y < -160) {
        shot.sprite.destroy();
        return false;
      }
      return true;
    });

    // Beams: line slashes, vertical signal lasers, tracking eye beam
    this.beams = this.beams.filter(beam => {
      beam.life -= dt;
      if (beam.horizontal && beam.track) {
        // Grace period: the beam holds its telegraphed row before steering
        if (beam.trackDelay > 0) beam.trackDelay -= dt;
        else {
          const dy = this.player.y - beam.y;
          beam.y += Phaser.Math.Clamp(dy, -beam.track * dt, beam.track * dt);
        }
      }
      if (this.stateFlag === 'play' && this.player.vulnerable) {
        let hit = false;
        if (beam.vertical) hit = Math.abs(this.player.x - beam.x) < beam.width + PLAYER.hitRadius;
        else if (beam.horizontal) hit = Math.abs(this.player.y - beam.y) < beam.width + PLAYER.hitRadius && this.player.x < this.boss.x;
        else {
          const nx = -Math.sin(beam.angle);
          const ny = Math.cos(beam.angle);
          const d = Math.abs((this.player.x - W / 2) * nx + (this.player.y - H / 2) * ny - beam.offset);
          hit = d < beam.width + PLAYER.hitRadius;
        }
        if (hit && this.player.hit()) this.onPlayerHit();
      }
      return beam.life > 0;
    });

    this.warnings.forEach(w => { w.life -= dt; });
    this.warnings = this.warnings.filter(w => w.life > 0);

    this.particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  onBossDamaged(result) {
    if (result === 'knockout') this.knockout();
    else if (result === 'phase') this.phaseTransition();
  }

  phaseTransition() {
    const phase = this.boss.phase;
    this.boss.enraged = phase === 4;
    if (this.settings.shake) this.cameras.main.shake(400, 0.014);
    if (this.settings.flash) this.cameras.main.flash(120, 255, 40, 110);
    // Fairness: clear the board so the new phase starts clean
    this.enemyShots.forEach(s => s.sprite.destroy());
    this.enemyShots = [];
    this.beams = [];
    this.warnings = [];
    this.boss.playAnim('damage');
    // Fairness: surviving a phase refills all 3 shields
    this.player.rechargeShields();
    this.playSfx('shield', 1);
    this.showHint('SHIELDS RECHARGED — 3 / 3');
    if (this.boss.enraged) {
      // ENRAGED: the Conductor burns red, the music speeds up, smoke turns red
      this.playSfx('enrage', 1);
      this.music?.setRate(1.18);
      this.announce('ENRAGED!', 900);
      this.cameras.main.flash(160, 255, 30, 30);
    } else {
      this.playSfx('phase', 1);
      this.announce(['', 'FULL STEAM!', 'PICKING UP SPEED!', 'DERAIL THIS!', ''][phase], 800);
    }
    this.eyeGlow();
  }

  onPlayerHit() {
    if (this.settings.flash) this.cameras.main.flash(90, 255, 255, 255);
    if (this.player.dead) this.gameOver();
  }

  clearBattle() {
    [...this.playerBullets, ...this.enemyShots].forEach(o => o.sprite.destroy());
    this.playerBullets = []; this.enemyShots = []; this.beams = []; this.warnings = [];
    this.signalRed = false;
    this._beamRepeated = false;
    this.suppressSide = false;
    this.time.removeAllEvents();
    this.tweens.killAll();
  }

  knockout() {
    if (this.stateFlag === 'knockout') return;
    this.stateFlag = 'knockout';
    this.boss.state = 'knockout';
    this.boss.enraged = false;
    this.clearBattle();
    this.music?.stop();
    this.playSfx('knockout', 1);
    this.time.delayedCall(500, () => this.playSfx('win', 1)); // victory fanfare
    if (this.settings.shake) this.cameras.main.shake(700, 0.02);
    this.announce('KNOCKOUT!', 1600);
    this.boss.playAnim('defeat');
    this.tweens.add({ targets: this.boss.sprite, scaleX: 0.84, scaleY: 0.76, duration: 1400, ease: 'Sine.easeOut' });
    for (let i = 0; i < 10; i += 1) {
      this.time.delayedCall(i * 150, () => this.emitBurst(
        this.boss.x + Phaser.Math.Between(-150, 110), this.boss.y - Phaser.Math.Between(30, 260), 12, i % 2 ? COLORS.pink : COLORS.yellow,
      ));
    }
    this.time.delayedCall(2400, () => this.showResult(true));
  }

  gameOver() {
    this.stateFlag = 'gameover';
    this.clearBattle();
    this.music?.stop();
    this.playSfx('lose', 1); // defeat dirge — distinct from the win fanfare
    this.boss.playAnim('idle');
    this.announce('DERAILED…', 1200);
    this.time.delayedCall(1500, () => this.showResult(false));
  }

  showResult(won) {
    document.querySelector('#result-kicker').textContent = won ? 'CHAPTER 6 COMPLETE' : 'NO CHECKPOINTS ON THIS LINE';
    document.querySelector('#result-title').textContent = won ? 'A KNOCKOUT!' : 'DERAILED';
    document.querySelector('#result-copy').textContent = won
      ? 'The Conductor slumps over his engine. The four stones unseal the true ending.'
      : 'The Conductor punched your last ticket. The battle resets from the top — your 3 shields fully recharge every time you break a phase, so spend them freely on the vortex and anything you cannot outrun.';
    document.querySelector('#ending').classList.toggle('hidden', !won);
    document.querySelector('#result').classList.remove('hidden');
  }

  fullReset() {
    this.resumeBattle();
    this.clearBattle();
    this.particles = [];
    this.player?.sprite.destroy(); this.player?.shieldGfx.destroy(); this.player?.trailGfx.destroy();
    this.boss?.sprite.destroy();
    this.hud?.destroy();
    this.music?.stop();
    this.stateFlag = 'menu';
    this.fxGfx.clear();
    this.signalGlow.clear();
  }

  // ---------- fx drawing ----------
  drawFx() {
    const g = this.fxGfx;
    g.clear();

    this.warnings.forEach(w => {
      const a = Phaser.Math.Clamp(0.25 + 0.65 * (1 - w.life / w.max) + Math.sin(this.time.now / 50) * 0.1, 0, 1);
      g.lineStyle(3, COLORS.pink, a);
      if (w.kind === 'line') this.strokeArenaLine(g, w.angle, w.offset);
      else if (w.kind === 'row') { g.lineBetween(0, w.y - 55, W, w.y - 55); g.lineBetween(0, w.y + 55, W, w.y + 55); }
      else if (w.kind === 'col') g.lineBetween(w.x, 0, w.x, H);
      else if (w.kind === 'spear') g.fillStyle(COLORS.pink, a).fillTriangle(6, w.y - 18, 6, w.y + 18, 52, w.y);
      else if (w.kind === 'wallwarn') g.fillStyle(COLORS.pink, a * 0.35).fillRect(W - 40, 0, 40, H);
      else if (w.kind === 'ring') g.lineStyle(3, COLORS.pink, a).strokeCircle(w.x, w.y, w.r * (0.4 + 0.6 * (w.life / w.max)));
      else if (w.kind === 'band') {
        g.fillStyle(COLORS.pink, a * 0.22).fillRect(0, w.y, W, w.h);
        g.lineStyle(2, COLORS.pink, a).strokeRect(0, w.y, W, w.h);
      } else if (w.kind === 'beamwarn') {
        // Charging: pulsing rings at the eye only — no row committed yet
        const e = this.boss.eyePos();
        g.lineStyle(3, COLORS.green, a).strokeCircle(e.x, e.y, 26 + 18 * (w.life / w.max));
        g.lineStyle(2, COLORS.green, a * 0.5).strokeCircle(e.x, e.y, 40 + 26 * (w.life / w.max));
      } else if (w.kind === 'beamlock') {
        // Locked: the beam will fire EXACTLY inside this hollow corridor.
        // Deliberately drawn as an OUTLINE (never a solid bar) so it can't be
        // confused with the solid, lethal beam that follows.
        const e = this.boss.eyePos();
        g.lineStyle(2, COLORS.green, a).lineBetween(0, w.y - 17, e.x, w.y - 17);
        g.lineStyle(2, COLORS.green, a).lineBetween(0, w.y + 17, e.x, w.y + 17);
        // Dashed centre line
        for (let x = 0; x < e.x; x += 34) {
          g.lineStyle(2, COLORS.green, a * 0.7).lineBetween(x, w.y, x + 18, w.y);
        }
        g.lineStyle(3, COLORS.green, a).strokeCircle(e.x, w.y, 15);
      } else if (w.kind === 'gapmark') {
        // Safe-lane guide: dashed rails across the arena mark the gap edges,
        // with chevrons at the spawn edge. Fly between the rails.
        const top = w.y - w.h / 2;
        const bot = w.y + w.h / 2;
        for (let x = 0; x < W; x += 40) {
          g.lineStyle(2, COLORS.yellow, a * 0.45).lineBetween(x, top, x + 22, top);
          g.lineStyle(2, COLORS.yellow, a * 0.45).lineBetween(x, bot, x + 22, bot);
        }
        const cx = W - 40;
        g.fillStyle(COLORS.yellow, a);
        g.fillTriangle(cx, top, cx + 18, top - 13, cx + 18, top + 5);
        g.fillTriangle(cx, bot, cx + 18, bot + 13, cx + 18, bot - 5);
      }
    });

    this.beams.forEach(beam => {
      const alpha = Math.min(1, beam.life * 5);
      if (beam.vertical) {
        g.fillStyle(COLORS.pink, alpha * 0.85).fillRect(beam.x - beam.width, 0, beam.width * 2, H);
        g.fillStyle(COLORS.white, alpha).fillRect(beam.x - 3, 0, 6, H);
      } else if (beam.horizontal) {
        const e = this.boss.eyePos();
        g.fillStyle(COLORS.green, alpha * 0.8).fillRect(0, beam.y - beam.width, e.x, beam.width * 2);
        g.fillStyle(COLORS.white, alpha).fillRect(0, beam.y - 4, e.x, 8);
        g.fillStyle(COLORS.green, alpha).fillCircle(e.x, beam.y, 24);
      } else {
        g.lineStyle(beam.width * 2, COLORS.pink, alpha * 0.85);
        this.strokeArenaLine(g, beam.angle, beam.offset);
        g.lineStyle(3, COLORS.white, alpha);
        this.strokeArenaLine(g, beam.angle, beam.offset);
      }
    });

    this.particles.forEach(p => {
      const s = p.size ?? 2;
      g.fillStyle(p.color, Math.min(1, p.life * 2)).fillRect(p.x - s, p.y - s, s * 2, s * 2);
    });

    this.signalGlow.clear();
    if (this.signalRed) {
      this.signalGlow.fillStyle(COLORS.pink, 0.5 + Math.sin(this.time.now / 90) * 0.3).fillCircle(this.signal.x, this.signal.y - 44, 12);
    }
  }

  strokeArenaLine(g, angle, offset) {
    const cos = Math.cos(angle) * 1400;
    const sin = Math.sin(angle) * 1400;
    const nx = -Math.sin(angle) * offset;
    const ny = Math.cos(angle) * offset;
    g.lineBetween(W / 2 + nx - cos, H / 2 + ny - sin, W / 2 + nx + cos, H / 2 + ny + sin);
  }
}
