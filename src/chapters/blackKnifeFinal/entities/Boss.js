import Phaser from 'phaser';
import { W, H, COLORS, BOSS, DEPTHS } from '../constants.js';

// The Conductor — a giant one-eyed conductor fused with the Infinity Train.
// One sprite, many animation states (from the hand-drawn frame sets):
//   idle · move · baton · magic · damage (flinch) · defeat
// The 'locom' sheet is used by the scene for the detached charging train.
export default class Boss {
  constructor(scene) {
    this.scene = scene;
    this.hp = BOSS.maxHp;
    this.phase = 0;
    this.enraged = false;
    this.state = 'intro';
    this.baseX = W * 0.8;
    this.baseY = H + 4;      // sprite is bottom-anchored on the tracks
    this.x = W + 320;         // starts off-screen for the intro chug-in
    this.y = this.baseY;
    this.bobT = Math.random() * 10;
    this.hitFlash = 0;
    this.flinchCd = 0;
    this.smokeT = 0;
    this.moveTarget = null; // x the boss is chugging toward between attacks
    this.busy = false;      // true while an attack animation owns the sprite

    this.sprite = scene.add.sprite(this.x, this.y, 'conductor-idle')
      .setOrigin(0.5, 1)
      .setDepth(DEPTHS.bossBody)
      .setScale(0.8);
    this.playAnim('idle');

    // Return to idle when one-shot animations end
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, anim => {
      if (this.state === 'knockout') return;
      if (['conductor-baton-anim', 'conductor-magic-anim', 'conductor-damage-anim'].includes(anim.key)) {
        this.playAnim('idle');
      }
    });
  }

  playAnim(name) {
    const key = `conductor-${name}-anim`;
    if (!this.scene.anims.exists(key)) return;
    if (this.sprite.anims.currentAnim?.key === key && this.sprite.anims.isPlaying) return;
    // Smoothness: leave a brief fading ghost of the previous pose so state
    // switches read as motion instead of a hard cut
    if (this.sprite.anims.currentAnim) {
      const g = this.scene.add.image(this.sprite.x, this.sprite.y, this.sprite.texture.key, this.sprite.frame.name)
        .setOrigin(0.5, 1)
        .setScale(this.sprite.scaleX, this.sprite.scaleY)
        .setDepth(this.sprite.depth - 1)
        .setAlpha(0.45);
      if (this.enraged) g.setTint(0xff8080);
      this.scene.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
    }
    this.sprite.play(key, true);
  }

  // Anticipation squash before an attack fires — makes the swing feel wound-up
  windup() {
    this.scene.tweens.add({
      targets: this.sprite, scaleX: this.sprite.scaleX * 1.045, scaleY: this.sprite.scaleY * 0.965,
      duration: 130, yoyo: true, ease: 'Sine.easeOut',
    });
  }

  // Recoil kick when the boss takes a meaningful hit
  recoil() {
    if (this._recoiling) return;
    this._recoiling = true;
    const x0 = this.x;
    this.scene.tweens.add({
      targets: this, x: x0 + 10, duration: 70, yoyo: true, ease: 'Sine.easeInOut',
      onComplete: () => { this.x = x0; this._recoiling = false; },
    });
  }

  get hpFrac() { return Math.max(0, this.hp / BOSS.maxHp); }
  get top() { return this.y - this.sprite.displayHeight; }

  computePhase() {
    const f = this.hpFrac;
    let p = 0;
    BOSS.phaseThresholds.forEach(t => { if (f <= t) p += 1; });
    return p;
  }

  damage(amount) {
    if (this.state === 'intro' || this.state === 'knockout') return null;
    this.hp = Math.max(0, this.hp - amount);
    // Throttle the white flash so sustained fire reads as blinks, not a
    // permanently white boss
    if (this.flashCd == null || this.flashCd <= 0) {
      this.hitFlash = BOSS.hitFlashMs / 1000;
      this.flashCd = 0.28;
      if (this.moveTarget == null) this.recoil();
    }
    const newPhase = this.computePhase();
    if (this.hp <= 0) return 'knockout';
    if (newPhase !== this.phase) { this.phase = newPhase; return 'phase'; }
    // Occasional visible flinch so damage reads during the whole battle
    if (this.flinchCd <= 0 && !this.scene.attackActive && Math.random() < 0.2) {
      this.flinchCd = 4;
      this.playAnim('damage');
    }
    return 'hit';
  }

  // World positions of notable parts (measured against the bottom-anchored art)
  batonHandPos() { return { x: this.x - this.sprite.displayWidth * 0.34, y: this.top + this.sprite.displayHeight * 0.16 }; }
  eyePos() { return { x: this.x - this.sprite.displayWidth * 0.1, y: this.top + this.sprite.displayHeight * 0.28 }; }
  chimneyPos() { return { x: this.x + this.sprite.displayWidth * 0.22, y: this.top + this.sprite.displayHeight * 0.3 }; }

  // Pick a new station to chug toward. aggressive=true advances on the player.
  reposition(aggressive = false) {
    const min = aggressive ? W * 0.52 : W * 0.68;
    const max = aggressive ? W * 0.66 : W * 0.88;
    this.moveTarget = Phaser.Math.Between(Math.floor(min), Math.floor(max));
  }

  update(dt) {
    this.bobT += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.flashCd = Math.max(0, (this.flashCd ?? 0) - dt);
    this.flinchCd = Math.max(0, this.flinchCd - dt);

    // Chug between stations while not mid-attack: the Conductor is never a
    // stationary target and can advance to squeeze the player's space.
    if (this.state === 'battle' && this.moveTarget != null) {
      const speed = 120 + this.phase * 45;
      const dx = this.moveTarget - this.x;
      if (Math.abs(dx) > 6) {
        this.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        if (!this.busy) this.playAnim('move');
      } else {
        this.moveTarget = null;
        if (!this.busy) this.playAnim('idle');
      }
    }

    // Idle bob, faster when enraged
    const speed = this.enraged ? 2.8 : 1.6;
    const bob = Math.sin(this.bobT * speed) * (this.enraged ? 7 : 4);
    this.sprite.setPosition(this.x, this.y + bob);

    // Hit flash; when enraged the Conductor burns red between flashes
    if (this.hitFlash > 0) this.sprite.setTintFill(0xffffff);
    else if (this.enraged) this.sprite.setTint(0xff7070);
    else this.sprite.clearTint();

    // Chimney smoke puffs
    this.smokeT -= dt;
    if (this.smokeT <= 0 && this.state !== 'knockout') {
      this.smokeT = this.enraged ? 0.07 : 0.16;
      const c = this.chimneyPos();
      this.scene.emitSmoke(c.x, c.y);
    }
  }
}
