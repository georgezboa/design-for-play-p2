import Phaser from 'phaser';
import { W, H, COLORS, PLAYER, DEPTHS } from '../constants.js';

// The player's small ship (Cuphead plane-style). Abilities:
//  - Move (WASD / arrows)
//  - Fire bullets (hold Z / J / click)
//  - Shield: brief 1.5s invulnerability bubble (C / L), with cooldown
//  - Boost: faster movement to dodge (hold SHIFT / K), limited fuel that regenerates
export default class Player {
  constructor(scene) {
    this.scene = scene;
    this.x = W * 0.22;
    this.y = H * 0.5;
    this.lives = PLAYER.lives;
    this.invuln = 0;
    this.shieldTime = 0;
    this.shieldCd = 0;
    this.shieldCharges = PLAYER.shieldCharges;
    this.boostFuel = PLAYER.boostMax;
    this.boosting = false;
    this.fireClock = 0;
    this.dead = false;
    this.trail = [];

    // Sprite (texture swapped in by the scene once assets are known).
    const key = scene.textures.exists('player-ship') ? 'player-ship' : '__ship_fallback';
    this.sprite = scene.add.sprite(this.x, this.y, key).setDepth(DEPTHS.player);
    if (scene.anims.exists('player-fly')) this.sprite.play('player-fly');

    this.shieldGfx = scene.add.graphics().setDepth(DEPTHS.player + 1);
    this.trailGfx = scene.add.graphics().setDepth(DEPTHS.player - 1);
  }

  tryShield() {
    if (this.dead || this.shieldCd > 0 || this.shieldTime > 0) return false;
    if (this.shieldCharges <= 0) { this.scene.playSfx('no-shield', 0.7); return false; }
    this.shieldCharges -= 1;
    this.shieldTime = PLAYER.shieldDuration;
    this.shieldCd = PLAYER.shieldRearm + PLAYER.shieldDuration;
    this.scene.playSfx('shield', 0.8);
    return true;
  }

  // Full shield refill — granted at every phase transition as a reward
  rechargeShields() {
    this.shieldCharges = PLAYER.shieldCharges;
  }

  get shielded() { return this.shieldTime > 0; }
  get vulnerable() { return !this.dead && this.invuln <= 0 && !this.shielded; }

  hit() {
    if (!this.vulnerable) return false;
    this.lives -= 1;
    this.invuln = PLAYER.hitInvuln;
    this.scene.playSfx('player-hit', 0.6);
    this.scene.cameras.main.shake(180, 0.012);
    this.scene.emitBurst(this.x, this.y, 26, COLORS.cyan);
    if (this.lives <= 0) this.dead = true;
    return true;
  }

  update(dt, input) {
    if (this.dead) { this.sprite.setVisible(false); this.shieldGfx.clear(); this.trailGfx.clear(); return; }

    // Movement
    const dir = new Phaser.Math.Vector2(input.dx, input.dy).normalize();
    this.boosting = input.boost && this.boostFuel > 0.05 && (dir.x !== 0 || dir.y !== 0);
    const speed = this.boosting ? PLAYER.boostSpeed : PLAYER.speed;
    if (this.boosting) this.boostFuel = Math.max(0, this.boostFuel - PLAYER.boostDrain * dt);
    else this.boostFuel = Math.min(PLAYER.boostMax, this.boostFuel + PLAYER.boostRegen * dt);

    this.x = Phaser.Math.Clamp(this.x + dir.x * speed * dt, 26, W * 0.66);
    this.y = Phaser.Math.Clamp(this.y + dir.y * speed * dt, 60, H - 30);

    // Timers
    this.invuln = Math.max(0, this.invuln - dt);
    this.shieldTime = Math.max(0, this.shieldTime - dt);
    this.shieldCd = Math.max(0, this.shieldCd - dt);

    // Firing
    this.fireClock -= dt;
    if (input.fire && this.fireClock <= 0) {
      this.fireClock = PLAYER.fireInterval;
      this.scene.spawnPlayerBullet(this.x + 26, this.y);
    }

    // Visuals
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 14) % 2 ? 0.25 : 1);
    this.sprite.setRotation(dir.y * 0.22);

    this.trail.unshift({ x: this.x - 16, y: this.y + 2 });
    this.trail.length = Math.min(this.trail.length, this.boosting ? 14 : 6);
    this.trailGfx.clear();
    this.trail.forEach((p, i) => {
      const a = Math.max(0.03, (this.boosting ? 0.4 : 0.2) - i * 0.025);
      this.trailGfx.fillStyle(this.boosting ? COLORS.yellow : COLORS.cyan, a).fillCircle(p.x - i * 3, p.y, Math.max(1.5, 6 - i * 0.4));
    });

    this.shieldGfx.clear();
    if (this.shielded) {
      const pulse = 1 + Math.sin(this.scene.time.now / 60) * 0.06;
      this.shieldGfx.lineStyle(3, COLORS.cyan, 0.9).strokeCircle(this.x, this.y, 26 * pulse);
      this.shieldGfx.lineStyle(8, COLORS.cyan, 0.18).strokeCircle(this.x, this.y, 30 * pulse);
    }
  }
}
