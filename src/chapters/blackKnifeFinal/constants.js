// Shared constants for the hidden finale — THE BLACK TICKET, the Conductor's
// true form (docs/STORY_BIBLE.md). Mathias's shooter, reskinned to the
// finale palette. The module folder and ids keep the old `black-knife` name.

export const W = 1100;
export const H = 560;

// The finale palette (src/shell/finale.css): walnut night, brass, ivory
// paper, amber light, oxblood stamps. The legacy key names stay so the
// attack code reads the same; each now maps to a finale colour.
export const COLORS = {
  bg: 0x0b0806,
  walnut: 0x1c130d,
  walnutMid: 0x2a1d14,
  brass: 0xb08a4a,
  brassHi: 0xd9b56e,
  amber: 0xe0a24a,
  amberHot: 0xffcf7a,
  ivory: 0xeadfc6,
  paper: 0xefe4cc,
  oxblood: 0x8a2a1e,
  teal: 0x6fb7ad,
  // legacy names
  pink: 0xd0533a,        // danger ink (telegraphs, slashes)
  pinkDark: 0x5a1a14,
  purple: 0x6b2a22,
  purpleDark: 0x3a1a12,
  yellow: 0xe0a24a,      // amber
  green: 0xeadfc6,       // the eye beam is ivory light
  cyan: 0xeadfc6,        // the player's shield: ivory paper
  white: 0xffffff,
  smoke: 0x6b5640,
};

// Boss tuning. About 2,600 HP: four to five minutes at realistic damage,
// five phases of 520 each.
export const BOSS = {
  maxHp: 2600,
  // Phase thresholds as fraction of max HP remaining. FIVE phases:
  // P1 100–80%, P2 80–60%, P3 60–40%, P4 40–20%, P5 20–0%
  phaseThresholds: [0.8, 0.6, 0.4, 0.2],
  contactDamage: true,
  hitFlashMs: 60,
};

// The phase a fraction of HP sits in, and the HP a phase starts at.
export function phaseForHp(hp, maxHp = BOSS.maxHp) {
  const f = Math.max(0, hp / maxHp);
  return BOSS.phaseThresholds.filter((t) => f <= t).length;
}
export function phaseStartHp(phase, maxHp = BOSS.maxHp) {
  return phase <= 0 ? maxHp : Math.round(maxHp * BOSS.phaseThresholds[phase - 1]);
}

// Player tuning
export const PLAYER = {
  lives: 4,
  speed: 300,
  boostSpeed: 560,
  boostDrain: 1.0,      // seconds of boost per second used
  boostMax: 2.2,        // seconds of boost fuel
  boostRegen: 0.55,     // fuel per second when not boosting
  shieldDuration: 1.5,  // seconds the shield stays up
  shieldCharges: 3,     // refilled at every phase break
  shieldRearm: 0.6,     // tiny delay so a double-tap can't waste two charges
  fireInterval: 0.12,   // seconds between bullets while holding fire
  bulletSpeed: 780,
  bulletDamage: 2,
  hitInvuln: 1.6,       // seconds of invulnerability after losing a life
  hitRadius: 10,
};

// Assist (offered after two failures): slower bullets, more lives.
export const ASSIST = {
  lives: 6,
  bulletScale: 0.72,
  recoveryScale: 1.2,
  offerAfterFailures: 2,
};

// The bell (Chapter 2's four-second bell). A shield raised within
// PARRY_WINDOW seconds of a bell is a parry: the charge comes back.
export const BELL_SECONDS = 4;
export const PARRY_WINDOW = 0.35;

export function nearestBellOffset(timeSeconds, bell = BELL_SECONDS) {
  const phase = ((timeSeconds % bell) + bell) % bell;
  return Math.min(phase, bell - phase);
}

// Each phase opens on one stone's chapter.
export const PHASE_CARDS = Object.freeze([
  Object.freeze({ stone: 'EMBER STONE', chapter: 'NIGHT SERVICE', line: 'The orchard case is still on the rack.' }),
  Object.freeze({ stone: 'GRID STONE', chapter: 'BORROWED LIGHT', line: 'Keep moving, the letter said. Too well timed.' }),
  Object.freeze({ stone: 'ECHO STONE', chapter: 'ECHO CITY', line: 'Two tickets. One name cut short.' }),
  Object.freeze({ stone: 'PIGMENT STONE', chapter: 'THE PAINTED COUNTRY', line: 'Rosa drew the hawthorn before anyone painted over it.' }),
  Object.freeze({ stone: 'BLACK TICKET', chapter: 'THE MUSEUM OF ONE ANSWER', line: 'The ticket that never gets punched.' }),
]);

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
