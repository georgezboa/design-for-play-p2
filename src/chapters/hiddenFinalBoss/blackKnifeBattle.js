import Phaser from 'phaser';
import { magicStoneSnapshot } from '../../shell/magicStones.js';

const W = 960;
const H = 540;
const PINK = 0xff176f;
const CYAN = 0x43e9ff;
const PHASES = Object.freeze(['THE EDGE', 'CROSS CUT', 'TEETH', 'FINAL VERDICT']);
const HP_FOR = Object.freeze({ low: 18, casual: 12, hard: 6 });
const params = new URLSearchParams(window.location.search);
const qaMode = params.get('qa') === '1';
const easterEggMode = params.get('easter-egg') === '1';
const stones = magicStoneSnapshot();

if (!stones.allCollected && !import.meta.env.DEV && !qaMode && !easterEggMode) {
  window.location.replace('/final-boss.html?from=chapter5');
}

let difficulty = 'casual';
let shakeEnabled = true;
let flashEnabled = false;
let soundEnabled = true;
let gameScene = null;

class BattleScene extends Phaser.Scene {
  constructor() { super('black-knife'); }

  create() {
    gameScene = this;
    this.state = 'menu';
    this.elapsed = 0;
    this.phase = 0;
    this.spawnClock = 0;
    this.attacks = [];
    this.warnings = [];
    this.particles = [];
    this.background = this.add.graphics();
    this.effects = this.add.graphics();
    this.playerShape = this.add.rectangle(W / 2, H * 0.78, 18, 18, CYAN)
      .setRotation(Math.PI / 4).setVisible(false);
    this.playerGlow = this.add.rectangle(W / 2, H * 0.78, 25, 25, CYAN, 0.16)
      .setRotation(Math.PI / 4).setVisible(false);
    const textStyle = { fontFamily: 'ui-monospace, monospace', fontSize: '10px', fontStyle: 'bold', color: '#ffffff' };
    this.phaseText = this.add.text(18, 10, '', textStyle).setVisible(false);
    this.dashText = this.add.text(W - 18, 10, '', { ...textStyle, color: '#c789ae' }).setOrigin(1, 0).setVisible(false);
    this.hpText = this.add.text(18, H - 39, '', { ...textStyle, fontSize: '9px' }).setVisible(false);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-SPACE', () => this.dash());
    this.input.keyboard.on('keydown-X', () => this.dash());
    this.drawScene();
    if (qaMode) window.setTimeout(() => document.querySelector('#start')?.click(), 120);
  }

  begin() {
    this.state = 'play';
    this.elapsed = 0;
    this.phase = 0;
    this.spawnClock = 0;
    this.attacks = [];
    this.warnings = [];
    this.particles = [];
    this.player = {
      x: W / 2, y: H * 0.78, r: 9,
      hp: HP_FOR[difficulty], max: HP_FOR[difficulty],
      inv: 0, dash: 0, cooldown: 0, trail: [],
    };
    [this.playerShape, this.playerGlow, this.phaseText, this.dashText, this.hpText]
      .forEach((object) => object.setVisible(true));
    this.tone(70, 0.5, 'sawtooth', 0.05);
  }

  dash() {
    if (this.state !== 'play' || this.player.cooldown > 0) return;
    this.player.dash = 0.2;
    this.player.inv = 0.42;
    this.player.cooldown = 0.72;
    this.tone(360, 0.11, 'sawtooth', 0.045);
    this.emitParticles(this.player.x, this.player.y, 18, CYAN, 180);
    this.tweens.add({ targets: this.playerShape, scaleX: 1.7, scaleY: 0.62, duration: 80, yoyo: true });
  }

  tone(frequency, duration, type, volume) {
    if (!soundEnabled || !this.sound.context) return;
    const oscillator = this.sound.context.createOscillator();
    const gain = this.sound.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.sound.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.sound.context.currentTime + duration);
    oscillator.connect(gain).connect(this.sound.context.destination);
    oscillator.start();
    oscillator.stop(this.sound.context.currentTime + duration);
  }

  emitParticles(x, y, count, color = 0xffffff, speed = 250) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x, y,
        vx: Phaser.Math.FloatBetween(-speed, speed),
        vy: Phaser.Math.FloatBetween(-speed, speed),
        life: 0.65, color,
      });
    }
  }

  takeHit() {
    if (this.player.inv > 0) return;
    this.player.hp -= 1;
    this.player.inv = 1.05;
    this.tone(65, 0.22, 'sawtooth', 0.07);
    this.emitParticles(this.player.x, this.player.y, 28);
    if (shakeEnabled) this.cameras.main.shake(150, 0.014);
    this.cameras.main.flash(flashEnabled ? 80 : 40, 255, 255, 255);
    if (this.player.hp <= 0) this.finish(false);
  }

  lineAttack(angle, offset = 0, delay = 720) {
    this.warnings.push({ kind: 'line', angle, offset, life: delay / 1000, max: delay / 1000 });
    this.time.delayedCall(delay, () => {
      if (this.state !== 'play') return;
      this.attacks.push({ kind: 'line', angle, offset, life: 0.42, width: 13 });
      if (shakeEnabled) this.cameras.main.shake(90, 0.006);
      this.tone(110, 0.15, 'square', 0.035);
    });
  }

  tooth(side) {
    const y = Phaser.Math.Between(70, H - 70);
    const left = side === 'left';
    this.warnings.push({ kind: 'tooth', x: left ? 0 : W, y, life: 0.55, max: 0.55 });
    this.time.delayedCall(550, () => {
      if (this.state !== 'play') return;
      this.attacks.push({ kind: 'tooth', x: left ? -70 : W + 70, y, vx: left ? 310 : -310, life: 3, r: 30 });
      this.tone(95, 0.1, 'square', 0.035);
    });
  }

  burst() {
    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * Math.PI * 2 + this.elapsed;
      this.attacks.push({ kind: 'orb', x: W / 2, y: H / 2, vx: Math.cos(angle) * 155, vy: Math.sin(angle) * 155, r: 8, life: 4 });
    }
    this.tone(190, 0.15, 'sawtooth', 0.035);
  }

  spawnAttack() {
    if (this.phase === 0) {
      this.lineAttack(Math.random() * Math.PI, Phaser.Math.Between(-180, 180));
      this.spawnClock = 1.15;
    } else if (this.phase === 1) {
      this.lineAttack((Math.random() > 0.5 ? 1 : -1) * 0.45, Phaser.Math.Between(-130, 130), 550);
      if (Math.random() > 0.55) this.lineAttack(Math.PI / 2 + Phaser.Math.FloatBetween(-0.15, 0.15), Phaser.Math.Between(-150, 150), 550);
      this.spawnClock = 0.88;
    } else if (this.phase === 2) {
      this.tooth(Math.random() > 0.5 ? 'left' : 'right');
      if (Math.random() > 0.5) this.lineAttack(Math.random() * Math.PI, Phaser.Math.Between(-170, 170), 500);
      this.spawnClock = 0.72;
    } else {
      if (Math.random() > 0.42) this.burst();
      else for (let i = 0; i < 3; i += 1) this.lineAttack(Math.random() * Math.PI, Phaser.Math.Between(-130, 130), 480);
      this.spawnClock = 1.05;
    }
  }

  update(_time, deltaMs) {
    const dt = Math.min(0.033, deltaMs / 1000);
    if (this.state !== 'play') { this.drawScene(); return; }
    this.elapsed += dt;
    this.phase = Math.min(3, Math.floor(this.elapsed / 15));
    this.spawnClock -= dt;
    if (this.spawnClock <= 0) this.spawnAttack();
    if (this.elapsed >= 60) { this.finish(true); return; }
    const dx = Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize();
    const speed = this.player.dash > 0 ? 510 : 225;
    this.player.x = Phaser.Math.Clamp(this.player.x + direction.x * speed * dt, 15, W - 15);
    this.player.y = Phaser.Math.Clamp(this.player.y + direction.y * speed * dt, 42, H - 15);
    this.player.inv = Math.max(0, this.player.inv - dt);
    this.player.dash = Math.max(0, this.player.dash - dt);
    this.player.cooldown = Math.max(0, this.player.cooldown - dt);
    this.player.trail.unshift({ x: this.player.x, y: this.player.y });
    this.player.trail.length = Math.min(this.player.trail.length, this.player.dash > 0 ? 12 : 4);
    this.warnings.forEach((item) => { item.life -= dt; });
    this.warnings = this.warnings.filter((item) => item.life > 0);
    this.attacks.forEach((attack) => {
      attack.life -= dt;
      if (attack.kind === 'tooth' || attack.kind === 'orb') {
        attack.x += attack.vx * dt;
        attack.y += (attack.vy || 0) * dt;
        if (Phaser.Math.Distance.Between(attack.x, attack.y, this.player.x, this.player.y) < attack.r + this.player.r) this.takeHit();
      } else {
        const nx = -Math.sin(attack.angle);
        const ny = Math.cos(attack.angle);
        const distance = Math.abs((this.player.x - W / 2) * nx + (this.player.y - H / 2) * ny - attack.offset);
        if (distance < attack.width + this.player.r) this.takeHit();
      }
    });
    this.attacks = this.attacks.filter((item) => item.life > 0);
    this.particles.forEach((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    });
    this.particles = this.particles.filter((item) => item.life > 0);
    this.drawScene();
  }

  drawLine(graphics, angle, offset) {
    const cos = Math.cos(angle) * 1000;
    const sin = Math.sin(angle) * 1000;
    const nx = -Math.sin(angle) * offset;
    const ny = Math.cos(angle) * offset;
    graphics.lineBetween(W / 2 + nx - cos, H / 2 + ny - sin, W / 2 + nx + cos, H / 2 + ny + sin);
  }

  drawScene() {
    this.background.clear().fillStyle(0x050105).fillRect(0, 0, W, H);
    this.background.fillStyle(0x13030d);
    for (let i = 0; i < 55; i += 1) this.background.fillRect((i * 137) % W, (i * 83) % H, 1, 1);
    this.effects.clear();
    if (this.state !== 'play') return;
    this.effects.fillStyle(0x2a0920).fillRect(0, 0, W, 28);
    this.effects.fillStyle(PINK).fillRect(0, 0, W * Math.min(1, this.elapsed / 60), 3);
    this.warnings.forEach((warning) => {
      this.effects.lineStyle(2, PINK, 0.2 + 0.6 * (1 - warning.life / warning.max));
      if (warning.kind === 'line') this.drawLine(this.effects, warning.angle, warning.offset);
      else this.effects.strokeTriangle(warning.x, warning.y - 35, warning.x + (warning.x ? -90 : 90), warning.y, warning.x, warning.y + 35);
    });
    this.attacks.forEach((attack) => {
      if (attack.kind === 'line') {
        this.effects.lineStyle(attack.width * 2, PINK, Math.min(1, attack.life * 6));
        this.drawLine(this.effects, attack.angle, attack.offset);
        this.effects.lineStyle(2, 0xffffff, Math.min(1, attack.life * 6));
        this.drawLine(this.effects, attack.angle, attack.offset);
      } else if (attack.kind === 'tooth') {
        const direction = attack.vx > 0 ? 1 : -1;
        this.effects.fillStyle(PINK).lineStyle(2, 0xffffff);
        this.effects.fillTriangle(attack.x - 35 * direction, attack.y - 28, attack.x + 38 * direction, attack.y, attack.x - 35 * direction, attack.y + 28);
        this.effects.strokeTriangle(attack.x - 35 * direction, attack.y - 28, attack.x + 38 * direction, attack.y, attack.x - 35 * direction, attack.y + 28);
      } else this.effects.fillStyle(PINK).fillCircle(attack.x, attack.y, attack.r);
    });
    this.player.trail.forEach((point, index) => this.effects.fillStyle(CYAN, Math.max(0.02, 0.18 - index * 0.012)).fillCircle(point.x, point.y, Math.max(2, this.player.r - index * 0.45)));
    this.particles.forEach((particle) => this.effects.fillStyle(particle.color, Math.min(1, particle.life * 2)).fillRect(particle.x - 2, particle.y - 2, 4, 4));
    this.effects.fillStyle(0x2c1022).fillRect(18, H - 24, 180, 7);
    this.effects.fillStyle(this.player.hp / this.player.max < 0.3 ? 0xffe600 : CYAN).fillRect(18, H - 24, 180 * this.player.hp / this.player.max, 7);
    this.playerShape.setPosition(this.player.x, this.player.y).setFillStyle(this.player.inv > 0 && Math.floor(this.player.inv * 14) % 2 ? 0xffffff : CYAN);
    this.playerGlow.setPosition(this.player.x, this.player.y);
    this.phaseText.setText(`${PHASES[this.phase]}  //  ${Math.max(0, 60 - this.elapsed).toFixed(1)}s`);
    this.dashText.setText(`DASH ${this.player.cooldown <= 0 ? 'READY' : this.player.cooldown.toFixed(1)}`);
    this.hpText.setText(`HP ${this.player.hp} / ${this.player.max}`);
  }

  finish(won) {
    if (this.state !== 'play') return;
    this.state = won ? 'won' : 'lost';
    [this.playerShape, this.playerGlow, this.phaseText, this.dashText, this.hpText]
      .forEach((object) => object.setVisible(false));
    document.querySelector('#result-kicker').textContent = won ? 'BATTLE COMPLETE' : 'THE KNIFE FALLS';
    document.querySelector('#result-title').textContent = won ? 'SURVIVED' : 'SHATTERED';
    document.querySelector('#result-copy').textContent = won
      ? 'All five stones resonate. The sealed ending is now within reach.'
      : 'Read the pink warnings, keep moving, and dash through the impossible cuts.';
    document.querySelector('#again').classList.toggle('hidden', won);
    document.querySelector('#ending').classList.toggle('hidden', !won);
    document.querySelector('#result').classList.remove('hidden');
    this.tone(won ? 620 : 55, 0.8, won ? 'sine' : 'sawtooth', 0.05);
  }
}

new Phaser.Game({
  // Canvas keeps the authored neon shapes deterministic in browser QA and in
  // the packaged app's screenshot/reporting surface.
  type: Phaser.CANVAS,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#050105',
  scene: BattleScene,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false, preserveDrawingBuffer: true },
  audio: { disableWebAudio: false },
});

document.querySelectorAll('.segmented').forEach((group) => group.addEventListener('click', (event) => {
  if (!event.target.matches('button')) return;
  group.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button === event.target));
  const value = event.target.dataset.value;
  if (group.id === 'difficulty') difficulty = value;
  if (group.id === 'shake') shakeEnabled = value === 'on';
  if (group.id === 'flash') flashEnabled = value === 'on';
}));

document.querySelector('#start').addEventListener('click', () => {
  document.querySelector('#menu').classList.add('hidden');
  gameScene?.sound.unlock();
  gameScene?.begin();
});
document.querySelector('#again').addEventListener('click', () => {
  document.querySelector('#result').classList.add('hidden');
  document.querySelector('#menu').classList.remove('hidden');
  if (gameScene) {
    gameScene.state = 'menu';
    gameScene.attacks = [];
    gameScene.warnings = [];
    gameScene.particles = [];
    gameScene.drawScene();
  }
});
document.querySelector('#ending').addEventListener('click', () => window.location.assign('/true-ending.html'));
document.querySelector('#mute').addEventListener('click', (event) => {
  soundEnabled = !soundEnabled;
  event.currentTarget.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
});

window.render_game_to_text = () => JSON.stringify({
  scene: 'hidden-final-boss',
  entry: easterEggMode ? 'title-easter-egg' : 'five-stone-route',
  access: { collected: stones.collected, required: stones.total, unlocked: stones.allCollected || import.meta.env.DEV || qaMode || easterEggMode },
  state: gameScene?.state ?? 'loading',
  elapsed: Number((gameScene?.elapsed ?? 0).toFixed(2)),
  phase: PHASES[gameScene?.phase ?? 0],
  player: gameScene?.player ? {
    x: Math.round(gameScene.player.x), y: Math.round(gameScene.player.y),
    hp: gameScene.player.hp, maxHp: gameScene.player.max,
    dashReady: gameScene.player.cooldown <= 0,
  } : null,
  warnings: gameScene?.warnings?.length ?? 0,
  attacks: gameScene?.attacks?.length ?? 0,
});

window.advanceTime = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, Math.max(0, milliseconds)));
if (import.meta.env.DEV || qaMode) window.forceHiddenBossWin = () => gameScene?.finish(true);
