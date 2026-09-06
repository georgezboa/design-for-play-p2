import { W, COLORS, BOSS, PLAYER, DEPTHS } from '../constants.js';

// Top-of-screen boss health bar (with phase notches so the player can read
// which phase they're in), plus player lives / shield / boost readouts.
export default class Hud {
  constructor(scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(DEPTHS.hud);
    this.phaseText = scene.add.text(W / 2, 34, '', {
      fontFamily: 'Space Mono, monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffe733',
    }).setOrigin(0.5, 0).setDepth(DEPTHS.hud);
    this.barX = W * 0.18;
    this.barW = W * 0.64;
    this.barY = 14;
    this.barH = 14;
    this.displayHp = 1; // eased fill for smooth drain
  }

  update(dt, boss, player) {
    const target = Math.max(0, boss.hp / BOSS.maxHp);
    this.displayHp += (target - this.displayHp) * Math.min(1, dt * 6);
    const g = this.gfx;
    g.clear();

    // Frame
    g.fillStyle(0x1a0512, 0.92).fillRect(this.barX - 4, this.barY - 4, this.barW + 8, this.barH + 8);
    g.lineStyle(2, COLORS.pinkDark, 1).strokeRect(this.barX - 4, this.barY - 4, this.barW + 8, this.barH + 8);

    // Fill: colour shifts as phases progress
    const phaseColors = [COLORS.green, COLORS.yellow, 0xff8c1a, COLORS.pink, 0xff2222];
    g.fillStyle(phaseColors[boss.phase] ?? COLORS.pink, 1).fillRect(this.barX, this.barY, this.barW * this.displayHp, this.barH);
    // Recent-damage ghost
    if (this.displayHp > target) {
      g.fillStyle(COLORS.white, 0.35).fillRect(this.barX + this.barW * target, this.barY, this.barW * (this.displayHp - target), this.barH);
    }

    // Phase notches at the thresholds — the "which phase am I in" indicator
    BOSS.phaseThresholds.forEach(t => {
      const x = this.barX + this.barW * t;
      g.fillStyle(COLORS.white, 0.9).fillRect(x - 1.5, this.barY - 6, 3, this.barH + 12);
    });

    // Boss eye icon at the right end of the bar
    g.fillStyle(COLORS.yellow, 1).fillCircle(this.barX + this.barW + 22, this.barY + this.barH / 2, 9);
    g.fillStyle(0x000000, 1).fillEllipse(this.barX + this.barW + 22, this.barY + this.barH / 2, 4, 12);

    this.phaseText.setText(`THE CONDUCTOR  —  PHASE ${boss.phase + 1} / 5${boss.enraged ? '  ·  ENRAGED' : ''}`);

    // ----- Player readouts (bottom-left) -----
    const y = 528;
    // Lives
    for (let i = 0; i < PLAYER.lives; i += 1) {
      const filled = i < player.lives;
      g.fillStyle(filled ? COLORS.pink : 0x2a0a1c, 1);
      const x = 24 + i * 26;
      g.fillTriangle(x, y - 4, x + 16, y - 4, x + 8, y + 10);
      g.fillCircle(x + 4, y - 5, 4.5);
      g.fillCircle(x + 12, y - 5, 4.5);
    }
    // Shield charges — 3 for the whole battle
    for (let i = 0; i < PLAYER.shieldCharges; i += 1) {
      const has = i < player.shieldCharges;
      g.lineStyle(2, has ? COLORS.cyan : 0x1c3a44, 1).strokeCircle(142 + i * 24, y + 2, 8);
      if (has) g.fillStyle(COLORS.cyan, player.shielded ? 0.9 : 0.35).fillCircle(142 + i * 24, y + 2, 4.5);
    }
    // Boost fuel
    g.fillStyle(0x2a1a05, 1).fillRect(224, y - 3, 70, 8);
    g.fillStyle(COLORS.yellow, 1).fillRect(224, y - 3, 70 * (player.boostFuel / PLAYER.boostMax), 8);
  }

  destroy() { this.gfx.destroy(); this.phaseText.destroy(); }
}
