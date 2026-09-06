export const GAME_W = 960;
export const GAME_H = 600;
export const WORLD_W = 9500;

export const GRAVITY = 1900;

// Two depth lanes. 0 = far (back of the scene), 1 = near (front).
// Both lanes live in the SAME Arcade physics world, just at different screen
// bands — the illusion of depth comes from baseY separation, sprite scale,
// atmospheric tint, and the parallax layers drawn between them.
export const LANE_FAR = 0;
export const LANE_NEAR = 1;

// Tints are multiplicative, so textures are drawn at their lightest (hazy)
// value and each lane multiplies down. Both lanes are crushed to near-black
// silhouettes: against a painted backdrop a mid-grey lane reads as a flat slab
// pasted over the art (measured luminance 28 against a backdrop of 27-39 — no
// separation at all). The ledges stay readable via PAL.terrainRim, not via
// body brightness.
export const LANES = [
  {
    id: 0,
    name: 'FAR',
    baseY: 290, // y of the lane's default ground surface
    scale: 0.78,
    tint: 0x2e3138,
    // Terrain can go fully silhouette, but anything the player must SEE —
    // the hunter, beasts, levers, flags — needs its own lighter multiplier or
    // it disappears into ground that is just as black.
    figureTint: 0x767f8e,
    // Ledge highlight, applied as its own strip rather than through `tint`.
    // Measured: the baked rim multiplied by a silhouette tint lands within 2
    // luminance of the body, leaving the surface you stand on with no edge.
    rim: 0x424b58,
    depth: 10,
    killY: 400, // fall past this in the far lane and you're out
  },
  {
    id: 1,
    name: 'NEAR',
    baseY: 460,
    scale: 1.0,
    tint: 0x181a1f,
    figureTint: 0x737e8c,
    rim: 0x333c48,
    depth: 30,
    killY: 720,
  },
];

// Panorama framing for the simulation worlds in src/assets/.
//
// Everything is derived from the source image's real dimensions at runtime, so
// dropping in a different painting only means changing the import in
// BootScene — no numbers here assume 2134x737.
export const BACKDROP = {
  // Scaled height in px. Taller than the 600px viewport on purpose: the extra
  // gives room to slide the image vertically, and crops the painting's own
  // cobblestone plaza, which would otherwise compete with the game's lanes.
  height: 900,

  // Where the skyline meets the ground haze, as a fraction of image height.
  // Measured off the painting rather than guessed, so the city sits behind the
  // far lane instead of floating above or drowning under it.
  horizonFrac: 0.66,

  // The game y the horizon lands on. Pushed low so the painting's own
  // cobblestone plaza and fence row fall below the viewport — they sit exactly
  // where the play area is and competed with the game's two lanes.
  horizonY: 560,

  // Multiplicative, so it can only darken. The backdrop must stay the lightest
  // plane in the value ramp (see palette.js) but the painting has bright
  // moonlit passages that would otherwise out-value the far lane.
  tint: 0xa8b0bc,
};

// Platformer feel. These are the numbers worth tweaking first — jump arc and
// the coyote/buffer windows are what make a Mario-like feel forgiving.
export const MOVE = {
  accelGround: 2800,
  accelAir: 1900,
  dragGround: 2400,
  dragAir: 500,
  speedWalk: 200,
  speedRun: 310,

  jumpVelocity: -730,
  jumpCutMultiplier: 0.42, // release jump early -> chop upward velocity

  coyoteMs: 110, // grace period to jump after walking off a ledge
  bufferMs: 130, // press jump slightly before landing and it still fires

  apexThreshold: 130, // |vy| under this counts as "at the apex"
  apexGravityMult: 0.6, // float a little at the top of the arc
  fallGravityMult: 1.3, // then come down snappier than you went up

  laneSwitchMs: 150,
  hurtInvulnMs: 1300,
  hurtKnockX: 220,
  hurtKnockY: -330,
};

export const SPRING_VELOCITY = -1080;
export const STOMP_BOUNCE = -520;
