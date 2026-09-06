import { PAL } from './palette.js';

// All art is drawn with the Graphics API at boot and baked into textures.
//
// Two-layer scheme: everything solid is a SILHOUETTE drawn in grey and tinted
// per lane (near lane crushes to black, far lane stays hazy). Anything that
// emits light is a separate additive sprite that is never tinted — that's the
// only way to keep a glowing rune readable on a near-black block.
//
// Note: fillGradientStyle does not survive generateTexture, so every gradient
// here is built from solid per-row or per-pixel fills.

const lerpHex = (a, b, t) => {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t)
  );
};

// Deterministic hash-noise: fog banks and treelines vary but rebuild identically.
const rnd = (i, n) => {
  const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export function buildTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  const bake = (key, w, h, draw) => {
    g.clear();
    draw(g);
    g.generateTexture(key, w, h);
  };

  // ------------------------------------------------------------------- light

  // Soft radial falloff, tinted and scaled at every call site. Every light in
  // the game is this one texture.
  bake('glow', 128, 128, (c) => {
    for (let r = 64; r > 0; r -= 1) {
      const t = 1 - r / 64;
      c.fillStyle(0xffffff, Math.pow(t, 2.2) * 0.85);
      c.fillCircle(64, 64, r);
    }
  });

  // --------------------------------------------------------------------- sky

  bake('sky', 8, 600, (c) => {
    for (let y = 0; y < 600; y++) {
      const t = y / 599;
      let col;
      if (t < 0.55) col = lerpHex(PAL.skyTop, PAL.skyMid, t / 0.55);
      else if (t < 0.72) col = lerpHex(PAL.skyMid, PAL.skyHorizon, (t - 0.55) / 0.17);
      else col = lerpHex(PAL.skyHorizon, PAL.skyLow, (t - 0.72) / 0.28);
      c.fillStyle(col, 1);
      c.fillRect(0, y, 8, 1);
    }
  });

  bake('fog', 960, 200, (c) => {
    for (let i = 0; i < 26; i++) {
      const y = rnd(i, 7) * 180;
      const h = 14 + rnd(i, 8) * 46;
      const w = 160 + rnd(i, 9) * 420;
      const x = rnd(i, 10) * 960 - 100;
      c.fillStyle(0x8fa0b5, 0.035 + rnd(i, 11) * 0.05);
      c.fillEllipse(x + w / 2, y + h / 2, w, h);
    }
  });

  // ---------------------------------------------------------------- terrain

  bake('terrain-body', 32, 32, (c) => {
    c.fillStyle(PAL.terrain, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x434b58, 1);
    c.fillRect(5, 7, 8, 4);
    c.fillRect(20, 17, 7, 5);
    c.fillRect(11, 25, 6, 3);
  });

  // The only thing separating the near lane's black mass from the black
  // background is this rim catching the moon.
  bake('terrain-cap', 32, 12, (c) => {
    c.fillStyle(PAL.terrain, 1);
    c.fillRect(0, 0, 32, 12);
    c.fillStyle(PAL.terrainRim, 1);
    c.fillRect(0, 0, 32, 2);
    c.fillStyle(0x5b6472, 1);
    c.fillRect(0, 2, 32, 2);
    // sparse dead grass tufts breaking the straight edge
    c.fillStyle(PAL.terrain, 1);
    c.fillRect(4, 0, 2, 3);
    c.fillRect(15, 0, 2, 4);
    c.fillRect(26, 0, 2, 3);
  });

  bake('stone', 32, 32, (c) => {
    c.fillStyle(PAL.terrain, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(PAL.terrainRim, 1);
    c.fillRect(0, 0, 32, 2);
    c.fillStyle(0x3f4653, 1);
    c.fillRect(0, 28, 32, 4);
    c.lineStyle(1, 0x3a414d, 1);
    c.strokeRect(0.5, 0.5, 31, 31);
  });

  bake('brick', 32, 32, (c) => {
    c.fillStyle(0x444b57, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x373d48, 1);
    c.fillRect(0, 15, 32, 2);
    c.fillRect(15, 0, 2, 15);
    c.fillRect(7, 17, 2, 13);
    c.fillRect(23, 17, 2, 13);
    c.fillStyle(0x5a6270, 1);
    c.fillRect(0, 0, 32, 1);
  });

  bake('plank', 32, 32, (c) => {
    c.fillStyle(0x454c58, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x373e49, 1);
    c.fillRect(0, 11, 32, 2);
    c.fillRect(0, 22, 32, 2);
    c.fillStyle(0x656e7c, 1);
    c.fillRect(0, 0, 32, 2);
  });

  // ---------------------------------------------------------------- blocks

  bake('block-rune', 32, 32, (c) => {
    c.fillStyle(0x4c5462, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x5c6573, 1);
    c.fillRect(2, 2, 28, 26);
    c.fillStyle(0x394049, 1);
    c.fillRect(2, 26, 28, 3);
    c.fillStyle(0x6f7986, 1);
    c.fillRect(0, 0, 32, 2);
    // carved sigil — the light comes from an additive glow sprite on top
    c.fillStyle(0x2b313a, 1);
    c.fillRect(15, 7, 3, 18);
    c.fillRect(8, 13, 17, 3);
    c.fillRect(10, 9, 3, 3);
    c.fillRect(20, 20, 3, 3);
  });

  bake('block-spent', 32, 32, (c) => {
    c.fillStyle(0x3a4049, 1);
    c.fillRect(0, 0, 32, 32);
    c.fillStyle(0x444b55, 1);
    c.fillRect(2, 2, 28, 26);
    c.fillStyle(0x2e343c, 1);
    c.fillRect(2, 26, 28, 3);
    c.fillRect(14, 8, 4, 16);
  });

  // Face texture for the 3D cubes — carved stone rather than timber.
  bake('crate-face', 64, 64, (c) => {
    c.fillStyle(0x525a68, 1);
    c.fillRect(0, 0, 64, 64);
    c.fillStyle(0x5b6472, 1);
    c.fillRect(5, 5, 54, 54);
    c.fillStyle(0x454c58, 1);
    c.fillRect(0, 0, 64, 5);
    c.fillRect(0, 59, 64, 5);
    c.fillRect(0, 0, 5, 64);
    c.fillRect(59, 0, 5, 64);
    c.fillStyle(0x3f4652, 1);
    c.fillRect(14, 14, 36, 3);
    c.fillRect(14, 47, 36, 3);
    c.fillRect(14, 14, 3, 36);
    c.fillRect(47, 14, 3, 36);
    c.fillStyle(0x6b7684, 1);
    c.fillRect(26, 26, 12, 12);
  });

  bake('spring', 32, 20, (c) => {
    c.fillStyle(0x3f4650, 1);
    c.fillRect(2, 15, 28, 5);
    c.fillStyle(0x6c7683, 1);
    c.fillRect(5, 11, 22, 3);
    c.fillRect(5, 6, 22, 3);
    c.fillStyle(0x818c9a, 1);
    c.fillRect(0, 0, 32, 5);
  });

  // --------------------------------------------------------------- pickups

  bake('echo', 20, 20, (c) => {
    c.fillStyle(PAL.echo, 0.18);
    c.fillCircle(10, 10, 9.5);
    c.fillStyle(PAL.echo, 0.55);
    c.fillCircle(10, 10, 6);
    c.fillStyle(0xffffff, 1);
    c.fillCircle(10, 10, 3.2);
  });

  // ---------------------------------------------------------------- actors

  // The passenger animation is built from small deterministic pose offsets.
  // Separate baked textures keep the asset pipeline simple while still giving
  // Phaser real animation frames to play.
  const drawPassenger = (c, pose = {}) => {
    const bob = pose.bob || 0;
    const leftLeg = pose.leftLeg || 0;
    const rightLeg = pose.rightLeg || 0;
    const leftArm = pose.leftArm || 0;
    const rightArm = pose.rightArm || 0;
    const reach = pose.reach || 0;

    c.fillStyle(PAL.actor, 1);
    // shoes and separated legs
    c.fillRect(8 + leftLeg, 34 + bob, 5, 8);
    c.fillRect(16 + rightLeg, 34 + bob, 5, 8);
    c.fillRect(6 + leftLeg, 41 + bob, 8, 3);
    c.fillRect(15 + rightLeg, 41 + bob, 8, 3);
    // jacket with a slightly oversized commuter silhouette
    c.fillRoundedRect(6, 15 + bob, 17, 23, 4);
    c.fillRect(4 + leftArm, 19 + bob, 4, 15);
    c.fillRect(21 + rightArm, 19 + bob, 4 + reach, 15);
    // neck, face and short asymmetric hair
    c.fillRect(11, 11 + bob, 7, 6);
    c.fillCircle(14, 8 + bob, 6);
    c.fillTriangle(8, 7 + bob, 10, 1 + bob, 18, 2 + bob);
    c.fillTriangle(18, 2 + bob, 21, 7 + bob, 16, 6 + bob);
    // messenger bag and diagonal strap
    c.fillStyle(0x596574, 1);
    c.fillRect(17, 25 + bob + Math.abs(leftLeg), 10, 10);
    c.fillRect(19, 23 + bob, 6, 2);
    c.lineStyle(2, 0x768494, 1);
    c.lineBetween(8, 16 + bob, 21, 28 + bob);
    // The brass ticket punch is the protagonist's signature tool. It remains
    // visible at the hip in every pose so the player—not a duplicate body—owns
    // the chapter's central mechanic.
    c.fillStyle(0xcaa66b, 1);
    c.fillRoundedRect(21, 20 + bob, 5, 9, 2);
    c.fillStyle(0xf2d49a, 0.95);
    c.fillRect(22, 21 + bob, 3, 2);
    // cool edge light keeps the near-lane silhouette readable
    c.fillStyle(0x99a4b1, 1);
    c.fillRect(6, 17 + bob, 2, 17);
    c.fillRect(9, 3 + bob, 2, 7);
    c.fillRect(7 + leftLeg, 41 + bob, 6, 1);
    if (reach) {
      c.fillStyle(0xb99a5a, 1);
      c.fillRect(24 + reach, 25 + bob, 3, 3);
      c.fillStyle(0xf2d49a, 1);
      c.fillRoundedRect(25 + reach, 23 + bob, 6, 8, 2);
    }
  };

  const passengerPoses = {
    'player-idle-0': { bob: 0 },
    'player-idle-1': { bob: 1, rightArm: 1 },
    'player-idle-2': { bob: 2 },
    'player-idle-3': { bob: 1, leftArm: -1 },
    'player-walk-0': { bob: 0, leftLeg: -2, rightLeg: 2, leftArm: 1, rightArm: -1 },
    'player-walk-1': { bob: 1, leftLeg: -1, rightLeg: 1 },
    'player-walk-2': { bob: 0, leftLeg: 2, rightLeg: -2, leftArm: -1, rightArm: 1 },
    'player-walk-3': { bob: 1, leftLeg: 0, rightLeg: 0, leftArm: -1, rightArm: 1 },
    'player-walk-4': { bob: 1, leftLeg: 1, rightLeg: -1 },
    'player-walk-5': { bob: 0, leftLeg: -2, rightLeg: 2, leftArm: 1, rightArm: -1 },
    'player-jump-anticipation': { bob: 3, leftLeg: -2, rightLeg: 2, leftArm: 1, rightArm: -1 },
    'player-jump': { bob: -1, leftLeg: 1, rightLeg: -1, leftArm: -1, rightArm: -1 },
    'player-fall': { bob: 0, leftLeg: -1, rightLeg: 1, leftArm: 1, rightArm: 1 },
    'player-land-0': { bob: 3, leftLeg: -2, rightLeg: 2, leftArm: 1, rightArm: 1 },
    'player-land-1': { bob: 1, leftLeg: -1, rightLeg: 1, leftArm: 1, rightArm: 0 },
    'player-interact-0': { bob: 0, reach: 0 },
    'player-interact-1': { bob: 0, rightArm: 1, reach: 2 },
    'player-interact-2': { bob: 0, rightArm: 1, reach: 4 },
    'player-interact-3': { bob: 0, rightArm: 1, reach: 2 },
  };
  Object.entries(passengerPoses).forEach(([key, pose]) => bake(key, 32, 46, (c) => drawPassenger(c, pose)));
  bake('player', 32, 46, (c) => drawPassenger(c, passengerPoses['player-idle-0']));

  // The first-car conductor has a dedicated silhouette rather than sharing
  // the intentionally uncanny generic witness body used elsewhere.
  const drawConductor = (c, pose = {}) => {
    const bob = pose.bob || 0;
    const hand = pose.hand || 0;
    c.fillStyle(PAL.actor, 1);
    c.fillRect(11, 16 + bob, 12, 12);
    c.fillCircle(17, 10 + bob, 7);
    // peaked service cap
    c.fillRect(8, 4 + bob, 18, 5);
    c.fillRect(5, 8 + bob, 22, 3);
    // long tailored coat and narrow stance
    c.fillRoundedRect(7, 25 + bob, 20, 31, 4);
    c.fillTriangle(7, 50 + bob, 4, 62, 17, 57 + bob);
    c.fillTriangle(27, 50 + bob, 30, 62, 17, 57 + bob);
    c.fillRect(10, 55, 5, 11);
    c.fillRect(20, 55, 5, 11);
    // one arm held behind, one presenting the ticket punch
    c.fillRect(4, 28 + bob, 5, 24 - bob);
    c.fillRect(26 + hand, 28 + bob, 4, 19);
    c.fillRect(28 + hand, 44 + bob, 6, 5);
    c.fillStyle(0xb99a5a, 1);
    c.fillRect(13, 27 + bob, 8, 2);
    c.fillRect(15, 31 + bob, 4, 4);
    c.fillRect(29 + hand, 45 + bob, 4, 2);
    c.fillStyle(0x99a4b1, 1);
    c.fillRect(8, 26 + bob, 2, 28 - bob);
    c.fillRect(9, 5 + bob, 13, 1);
  };
  const conductorPoses = [
    { bob: 0, hand: 0 },
    { bob: 0, hand: 1 },
    { bob: 1, hand: 1 },
    { bob: 0, hand: 0 },
  ];
  conductorPoses.forEach((pose, index) => bake(`conductor-idle-${index}`, 36, 67, (c) => drawConductor(c, pose)));
  [1, 3, 6, 3].forEach((hand, index) =>
    bake(`conductor-switch-${index}`, 42, 67, (c) => drawConductor(c, { bob: index === 2 ? -1 : 0, hand })),
  );
  bake('conductor', 36, 67, (c) => drawConductor(c, conductorPoses[0]));

  const drawRecorder = (c, mode) => {
    const color = mode === 'recording' ? 0xe45a5f : mode === 'playback' ? 0x75d4cd : 0x65757d;
    c.fillStyle(0x111920, 1);
    c.fillRoundedRect(1, 1, 38, 53, 5);
    c.lineStyle(2, color, 0.9);
    c.strokeRoundedRect(1, 1, 38, 53, 5);
    c.fillStyle(0x26343b, 1);
    c.fillRect(7, 8, 26, 15);
    c.fillStyle(color, 1);
    if (mode === 'recording') c.fillCircle(20, 15, 5);
    else if (mode === 'playback') c.fillTriangle(16, 10, 27, 15, 16, 20);
    else {
      c.fillRect(12, 12, 16, 2);
      c.fillRect(12, 17, 10, 2);
    }
    c.fillStyle(0xb99a5a, 0.9);
    c.fillRect(8, 31, 24, 3);
    c.fillRect(11, 38, 18, 9);
    c.fillStyle(color, mode === 'idle' ? 0.35 : 0.8);
    c.fillRect(14, 40, 12, 5);
  };
  ['idle', 'recording', 'playback'].forEach((mode) =>
    bake(`echo-recorder-${mode}`, 40, 55, (c) => drawRecorder(c, mode)),
  );

  bake('pressure-pad-off', 62, 12, (c) => {
    c.fillStyle(0x111920, 1);
    c.fillRoundedRect(1, 2, 60, 10, 4);
    c.lineStyle(1, 0x65757d, 0.8);
    c.strokeRoundedRect(1, 2, 60, 10, 4);
    c.fillStyle(0x26343b, 1);
    c.fillRect(8, 0, 46, 5);
  });

  bake('pressure-pad-on', 62, 12, (c) => {
    c.fillStyle(0x102426, 1);
    c.fillRoundedRect(1, 4, 60, 8, 4);
    c.lineStyle(1, 0x75d4cd, 1);
    c.strokeRoundedRect(1, 4, 60, 8, 4);
    c.fillStyle(0x75d4cd, 0.92);
    c.fillRect(8, 2, 46, 4);
  });

  const drawGenerator = (c, active) => {
    c.fillStyle(0x111920, 1);
    c.fillRoundedRect(2, 8, 34, 46, 5);
    c.lineStyle(2, active ? 0x75d4cd : 0x65757d, 0.9);
    c.strokeRoundedRect(2, 8, 34, 46, 5);
    c.fillStyle(active ? 0x1d3638 : 0x26343b, 1);
    c.fillCircle(19, 28, 10);
    c.lineStyle(3, active ? 0xe7d8b2 : 0xb99a5a, 1);
    c.lineBetween(19, 28, active ? 32 : 25, active ? 15 : 22);
    c.fillStyle(active ? 0x75d4cd : 0xe45a5f, 1);
    c.fillCircle(19, 45, 3);
  };
  bake('hand-generator-off', 38, 55, (c) => drawGenerator(c, false));
  bake('hand-generator-on', 38, 55, (c) => drawGenerator(c, true));

  const drawRelay = (c, orientation) => {
    c.fillStyle(0x101820, 1);
    c.fillRoundedRect(1, 1, 34, 34, 6);
    c.lineStyle(2, 0x65757d, 0.9);
    c.strokeRoundedRect(1, 1, 34, 34, 6);
    c.fillStyle(0x26343b, 1);
    c.fillCircle(18, 18, 11);
    c.lineStyle(4, 0xb99a5a, 1);
    if (orientation === 0) c.lineBetween(9, 27, 27, 9);
    else c.lineBetween(9, 9, 27, 27);
    c.fillStyle(0xe7d8b2, 1);
    c.fillCircle(18, 18, 3);
    c.fillStyle(0x75d4cd, 0.55);
    c.fillCircle(6, orientation === 0 ? 29 : 7, 2);
  };
  bake('circuit-relay-0', 36, 36, (c) => drawRelay(c, 0));
  bake('circuit-relay-1', 36, 36, (c) => drawRelay(c, 1));

  bake('power-switch-off', 36, 54, (c) => {
    c.fillStyle(0x111920, 1);
    c.fillRoundedRect(2, 1, 32, 52, 4);
    c.lineStyle(2, 0x65757d, 1);
    c.strokeRoundedRect(2, 1, 32, 52, 4);
    c.fillStyle(0x26343b, 1);
    c.fillRect(8, 9, 20, 14);
    c.fillStyle(0xe45a5f, 1);
    c.fillCircle(13, 16, 3);
    c.fillStyle(0x67747b, 1);
    c.fillRect(15, 30, 6, 16);
    c.fillStyle(0xb99a5a, 1);
    c.fillRect(13, 29, 10, 5);
  });

  bake('power-switch-on', 36, 54, (c) => {
    c.fillStyle(0x111920, 1);
    c.fillRoundedRect(2, 1, 32, 52, 4);
    c.lineStyle(2, 0x91a8aa, 1);
    c.strokeRoundedRect(2, 1, 32, 52, 4);
    c.fillStyle(0x1d3638, 1);
    c.fillRect(8, 9, 20, 14);
    c.fillStyle(0x75d4cd, 1);
    c.fillCircle(13, 16, 3);
    c.fillCircle(22, 16, 3);
    c.fillStyle(0x9b8661, 1);
    c.fillRect(15, 26, 6, 16);
    c.fillStyle(0xe7d8b2, 1);
    c.fillRect(13, 39, 10, 5);
  });

  // The beast: hunched quadruped, long skull, ridged spine.
  bake('enemy', 28, 24, (c) => {
    c.fillStyle(PAL.actor, 1);
    c.fillEllipse(14, 13, 22, 11);
    // haunches and shoulders
    c.fillCircle(6, 12, 6);
    c.fillCircle(21, 12, 5.5);
    // head lowered at the front
    c.fillTriangle(0, 12, 9, 8, 8, 16);
    c.fillRect(1, 11, 7, 4);
    // legs
    c.fillRect(4, 17, 3, 7);
    c.fillRect(9, 18, 2.5, 6);
    c.fillRect(18, 18, 2.5, 6);
    c.fillRect(23, 17, 3, 7);
    // spine ridge
    c.fillTriangle(9, 8, 11, 3, 13, 8);
    c.fillTriangle(14, 7, 16, 2, 18, 7);
    c.fillTriangle(19, 8, 21, 4, 23, 8);
    c.fillStyle(0x99a4b1, 1);
    c.fillRect(10, 6, 12, 2);
  });

  bake('enemy-squashed', 28, 9, (c) => {
    c.fillStyle(PAL.actor, 1);
    c.fillEllipse(14, 5, 26, 8);
  });

  // The witnesses all share one body plan. Their differences are carried by
  // tint and dialogue, which makes the repeated silhouette feel intentional:
  // the simulation can change a setting faster than it can invent a person.
  bake('npc', 34, 66, (c) => {
    c.fillStyle(PAL.actor, 1);
    // head, with the face turned slightly away from the player
    c.fillCircle(17, 11, 8);
    c.fillTriangle(8, 10, 17, 2, 28, 10);
    c.fillRect(11, 16, 12, 16);
    // coat that nearly reaches the ground
    c.fillTriangle(4, 62, 12, 26, 22, 26);
    c.fillTriangle(30, 62, 22, 26, 12, 26);
    c.fillRect(10, 29, 14, 28);
    // arms held too still to be natural
    c.fillRect(5, 29, 6, 25);
    c.fillRect(23, 29, 6, 25);
    c.fillCircle(8, 55, 4);
    c.fillCircle(26, 55, 4);
    // two narrow feet, barely visible under the hem
    c.fillRect(10, 57, 5, 8);
    c.fillRect(19, 57, 5, 8);
  });

  // A fast, narrow silver trail for the hunter's cleaver. It is deliberately
  // brief and cool-coloured, so an attack reads without turning into a bright
  // arcade projectile.
  bake('slash', 56, 36, (c) => {
    c.lineStyle(4, 0xe6f0f7, 0.68);
    c.beginPath();
    c.arc(19, 22, 18, -1.25, 0.95, false);
    c.strokePath();
    c.lineStyle(1.5, 0xffffff, 0.85);
    c.beginPath();
    c.arc(19, 22, 13, -1.18, 0.86, false);
    c.strokePath();
  });

  // ---------------------------------------------------------------- props

  bake('lamp-post', 18, 104, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(7, 16, 4, 84);
    c.fillRect(3, 99, 12, 5);
    // scrolled arm and lantern cage
    c.fillRect(7, 16, 8, 3);
    c.fillRect(13, 16, 3, 8);
    c.fillRect(10, 22, 9, 2);
    c.fillRect(11, 24, 7, 9);
    c.fillTriangle(10, 24, 14.5, 17, 19, 24);
    c.fillRect(12, 33, 5, 2);
  });

  bake('fence', 32, 56, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(0, 12, 32, 3);
    c.fillRect(0, 40, 32, 3);
    for (let i = 0; i < 4; i++) {
      const x = i * 8 + 2;
      c.fillRect(x, 6, 2.5, 50);
      c.fillTriangle(x - 1.5, 8, x + 1.25, 0, x + 4, 8);
    }
  });

  bake('hearse', 190, 104, (c) => {
    c.fillStyle(PAL.prop, 1);
    // carriage body + glass sides
    c.fillRect(52, 24, 104, 44);
    c.fillTriangle(52, 24, 104, 6, 156, 24);
    c.fillRect(48, 62, 112, 7);
    // driver's bench and shafts
    c.fillRect(24, 40, 30, 20);
    c.fillRect(0, 52, 30, 4);
    // wheels
    c.lineStyle(4, PAL.prop, 1);
    [72, 142].forEach((wx) => {
      c.beginPath();
      c.arc(wx, 82, 20, 0, Math.PI * 2);
      c.strokePath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.fillRect(wx - 1.5 + Math.cos(a) * 9, 80.5 + Math.sin(a) * 9, 3, 3);
      }
    });
    c.fillStyle(PAL.prop, 1);
    [72, 142].forEach((wx) => c.fillCircle(wx, 82, 5));
    // finials on the roof corners
    [58, 104, 150].forEach((fx) => c.fillTriangle(fx - 3, 10, fx, -4, fx + 3, 10));
  });

  bake('lever-off', 18, 30, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(5, 22, 8, 8);
    c.fillRect(3, 10, 3, 14);
    c.fillCircle(4, 8, 4.5);
  });

  bake('lever-on', 18, 30, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(5, 22, 8, 8);
    c.fillRect(12, 10, 3, 14);
    c.fillCircle(13, 8, 4.5);
  });

  // Signposts become grave markers.
  bake('sign', 26, 34, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(6, 4, 14, 30);
    c.fillTriangle(6, 6, 13, -1, 20, 6);
    c.fillStyle(0x545c69, 1);
    c.fillRect(9, 12, 8, 2);
    c.fillRect(9, 17, 6, 2);
    c.fillRect(9, 22, 8, 2);
  });

  // Checkpoint and goal are lanterns — the glow is added separately.
  bake('flag-checkpoint', 22, 60, (c) => {
    c.fillStyle(PAL.prop, 1);
    c.fillRect(9, 14, 4, 42);
    c.fillRect(5, 55, 12, 5);
    c.fillRect(6, 6, 10, 10);
    c.fillTriangle(5, 7, 11, 0, 17, 7);
  });

  bake('flag-goal', 34, 96, (c) => {
    c.fillStyle(PAL.prop, 1);
    // gate posts and lintel
    c.fillRect(0, 10, 7, 86);
    c.fillRect(27, 10, 7, 86);
    c.fillRect(0, 10, 34, 6);
    c.fillTriangle(10, 10, 17, -2, 24, 10);
    // hanging lantern
    c.fillRect(16, 16, 2, 10);
    c.fillRect(12, 26, 10, 12);
    c.fillTriangle(11, 27, 17, 19, 23, 27);
  });

  // ------------------------------------------------------------ vegetation

  // Foreground brambles, pure black — nothing in front of these.
  bake('foreground', 960, 84, (c) => {
    c.fillStyle(0x05070b, 1);
    c.fillRect(0, 42, 960, 42);
    for (let i = 0; i < 70; i++) {
      const x = i * 14;
      const h = 14 + rnd(i, 31) * 26;
      c.fillTriangle(x, 48, x + 4.5, 48 - h, x + 9, 48);
    }
    for (let i = 0; i < 22; i++) {
      const x = i * 44 + 8;
      const h = 34 + rnd(i, 33) * 26;
      c.fillRect(x, 48 - h, 2, h);
      c.fillRect(x - 6, 48 - h * 0.7, 7, 1.6);
      c.fillRect(x + 1, 48 - h * 0.45, 7, 1.6);
    }
  });

  // --------------------------------------------------------------- overlay

  bake('vignette', 96, 60, (c) => {
    const cx = 48;
    const cy = 30;
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < 96; x++) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const d = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
        const a = Math.min(1, Math.pow(Math.max(0, d - 0.22) / 0.78, 1.7)) * 0.9;
        if (a <= 0.005) continue;
        c.fillStyle(0x000000, a);
        c.fillRect(x, y, 1, 1);
      }
    }
  });

  bake('mote', 6, 6, (c) => {
    c.fillStyle(0xffffff, 0.25);
    c.fillCircle(3, 3, 3);
    c.fillStyle(0xffffff, 0.9);
    c.fillCircle(3, 3, 1.4);
  });

  g.destroy();
}

export function buildAnimations(scene) {
  const add = (key, frameKeys, frameRate, repeat = -1) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frameKeys.map((frameKey) => ({ key: frameKey })),
      frameRate,
      repeat,
    });
  };

  add('player-idle', ['player-idle-0', 'player-idle-1', 'player-idle-2', 'player-idle-3'], 6);
  add(
    'player-walk',
    ['player-walk-0', 'player-walk-1', 'player-walk-2', 'player-walk-3', 'player-walk-4', 'player-walk-5'],
    10,
  );
  add(
    'player-interact',
    ['player-interact-0', 'player-interact-1', 'player-interact-2', 'player-interact-3'],
    10,
    0,
  );
  add(
    'conductor-idle',
    ['conductor-idle-0', 'conductor-idle-1', 'conductor-idle-2', 'conductor-idle-3'],
    3,
  );
  add(
    'conductor-switch',
    ['conductor-switch-0', 'conductor-switch-1', 'conductor-switch-2', 'conductor-switch-3'],
    7,
    0,
  );
}
