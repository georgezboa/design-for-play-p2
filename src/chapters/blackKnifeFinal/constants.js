// Shared constants for Chapter 6 — The Conductor boss battle.

export const W = 1100;
export const H = 560;

// Palette (matches the key art: black night, neon pink/red, purple, acid yellow-green)
export const COLORS = {
  bg: 0x050008,
  pink: 0xff2266,
  pinkDark: 0x8f1040,
  purple: 0x7b2fbe,
  purpleDark: 0x3c1266,
  yellow: 0xffe733,
  green: 0xa8e42a,
  cyan: 0x43e9ff,
  white: 0xffffff,
  smoke: 0xb3125e,
};

// Boss tuning
export const BOSS = {
  // Tuned for a ~7 minute battle at realistic sustained player DPS.
  maxHp: 4200,
  // Phase thresholds as fraction of max HP remaining. FIVE phases:
  // P1 100–80%, P2 80–60%, P3 60–40%, P4 40–20%, P5 (ENRAGED) 20–0%
  phaseThresholds: [0.8, 0.6, 0.4, 0.2],
  contactDamage: true,
  hitFlashMs: 60,
};

// Player tuning
export const PLAYER = {
  lives: 4,
  speed: 300,
  boostSpeed: 560,
  boostDrain: 1.0,      // seconds of boost per second used
  boostMax: 2.2,        // seconds of boost fuel
  boostRegen: 0.55,     // fuel per second when not boosting
  shieldDuration: 1.5,  // seconds the shield stays up
  shieldCharges: 3,     // TOTAL shields for the whole battle — spend wisely
  shieldRearm: 0.6,     // tiny delay so a double-tap can't waste two charges
  fireInterval: 0.12,   // seconds between bullets while holding fire
  bulletSpeed: 780,
  bulletDamage: 2,
  hitInvuln: 1.6,       // seconds of invulnerability after losing a life
  hitRadius: 10,
};

export const DEPTHS = {
  bg: 0,
  tracks: 5,
  bossBody: 10,
  bossDetail: 12,
  attacks: 20,
  player: 30,
  fx: 40,
  hud: 50,
  overlay: 60,
};
