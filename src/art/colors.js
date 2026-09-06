// The compliance layer for car-interior art.
//
// Why C() throws instead of warning: the art audit found 196 distinct colour
// values across the project, roughly 150 of them used exactly once, and three
// car-art files that referenced src/palette.js zero times. The rules were
// written down and then ignored by 73% of the literals, which is how the car
// interior ended up running a second value structure that fought the depth
// ramp. A wrapper that only warns would be ignored the same way. The throw is
// the only thing that actually holds the role-controlled palette in place.
//
// PAL in src/palette.js is untouched and still governs the exterior lanes.
// CAR is additive, and covers surfaces inside the carriage.

const HEX_HASH = /^#[0-9a-fA-F]{6}$/;
const HEX_0X = /^0x[0-9a-fA-F]{6}$/i;

function toHex(num) {
  return `0x${num.toString(16).padStart(6, '0')}`;
}

// Accepts 0xRRGGBB numbers and '#RRGGBB' / '0xRRGGBB' strings. Three-digit
// shorthand is rejected rather than expanded: '#abc' silently parsing to
// something plausible is how off-palette values sneak back in.
function normalizeColor(input) {
  if (typeof input === 'number') {
    if (!Number.isInteger(input) || input < 0 || input > 0xffffff) {
      throw new Error(`Colour ${input} is outside the 24-bit range 0x000000..0xffffff.`);
    }
    return input;
  }
  if (typeof input === 'string') {
    const s = input.trim();
    if (HEX_HASH.test(s)) return parseInt(s.slice(1), 16);
    if (HEX_0X.test(s)) return parseInt(s.slice(2), 16);
    throw new Error(`Unsupported colour string "${input}". Use '#RRGGBB' or '0xRRGGBB'.`);
  }
  throw new Error(`Invalid colour type ${typeof input}. Expected a number or a hex string.`);
}

function tryNormalize(input) {
  try {
    return normalizeColor(input);
  } catch {
    return null;
  }
}

// Every entry is one role; a colour that does not match a role is a bug. L* is
// kept inline so the value ramp can be checked without leaving the file: the
// hero must out-value every control face it stands next to.
export const CAR = Object.freeze({
  // Hero. Never tinted, never used for anything else.
  HERO_BASE: 0xdfe7f2, // L*91.3  hero body
  HERO_TRIM: 0xcfe0f0, // L*88.4  hero secondary
  HERO_ACCENT: 0x86b8d8, // L*72.4  hero detail

  // Brass. BRASS_HI is an edge colour only: at L*85.8 it is 5.6 points off the
  // hero, so a large brass-highlight face would erase the hero's separation.
  // Control faces cap at BRASS_MID, which leaves a real 21.2-point gap.
  BRASS_HI: 0xe8d5a7, // L*85.8  highlight edges, <=2px
  BRASS_MID: 0xcaa66b, // L*70.1  brass body, ticket punch, trim; control-face cap
  BRASS_DARK: 0x7f6540, // L*44.5  brass shadow

  // Period body colour. It is reserved for large non-interactive carriage
  // panels and doors, never for warnings or puzzle state.
  SAFETY_ORANGE: 0xd96b30,

  // Tungsten and status lamps. Lamps may run hot in saturation but are capped
  // at 6x6 px in area, and only one alert may be lit at a time.
  TUNGSTEN: 0xffc98a, // L*84.4  filament, status lamp lit
  TUNGSTEN_REFLECT: 0xe4b45a, // L*76.0  warm reflection on metal, stands in for bloom
  LAMP_WARN: 0xe4c276, // L*79.8  status lamp waiting
  LAMP_OK: 0x75d4cd, // L*79.2  status lamp ready
  LAMP_ALERT: 0xe45a5f, // L*56.7  status lamp alert

  // Steel.
  STEEL_HI: 0x9fb7c0, // L*72.9  machined edges, rivet highlights
  STEEL_MID: 0x687981, // L*49.7  machinery body, springs, brake shoes
  STEEL_DARK: 0x5b6472, // L*42.1  machinery shadow, wheelsets

  // Vinyl.
  VINYL_HI: 0xb04a50, // L*45.2  wine vinyl lit face
  VINYL: 0x8e2634, // L*32.7  wine vinyl seats

  // Enamel.
  ENAMEL_HI: 0x52636b, // L*40.9  enamel lit face, rivet base
  ENAMEL_MID: 0x405159, // L*33.3  enamel lining, generic surface
  ENAMEL_DARK: 0x263238, // L*20.0  enamel panel in shadow

  // Atmosphere, glass and shadow.
  SKY_HORIZON: 0x454e5c, // L*32.9  window panorama
  SKY_RIM: 0xdfe7f2, // L*91.3  exterior rim light, gauge ticks; shares HERO_BASE's value
  GLASS_DARK: 0x1c2830, // L*15.4  glass tint over the panorama
  VOID_LIFT: 0x17232b, // L*13.0  darkest VISIBLE surface
  VOID: 0x0a1015, // L*4.4   pure shadow, underfloor, inactive rooms
});

// Spaced 100 so a hand-written integer can never land on a band boundary. The
// old code had 20 of its 30 setDepth calls crowded into the nine integers
// 53..61, which meant any reorder silently changed occlusion.
export const DEPTH = Object.freeze({
  EXTERIOR: 0,
  WINDOW: 100,
  SHELL: 200,
  MACHINERY: 300,
  SET: 400,
  ACTORS: 500,
  CONTROL: 600,
  FOREGROUND: 700,
  CURTAIN: 800,
});

// The target band layout above cannot be switched on by renumbering the art
// files alone, and the reason is worth recording where the next reader will hit
// it.
//
// Three sets of objects share one depth space at scrollFactor 1:
//   tutorialTrainRoomsArt   depths 1..29
//   tutorialCarArt          depths 7..34
//   GameScene gameplay      depths 1..90, with 22 calls packed into 53..61
//
// Gameplay currently sits ABOVE the car art because 53..61 > 34, and that is
// the only thing keeping controls and the hero in front of the shell. Moving
// the art onto SHELL 200 / SET 400 while GameScene still writes 53..61 would
// put the shell on top of the hero and every control in the car.
//
// So the bands ship as vocabulary now and are adopted per-section as each
// section's gameplay layers are rewritten, since that is the only point at
// which both halves of a comparison can move together. LEGACY_BAND records
// where today's integers actually land, so a partial migration can be checked
// for inversions instead of guessed at.
export const LEGACY_BAND = Object.freeze({
  ROOMS_ART: [1, 29],
  CAR_ART: [7, 34],
  GAMEPLAY: [1, 90],
  GAMEPLAY_CLUSTER: [53, 61],
});

// Legacy literal -> CAR name. Used only to make C()'s error message
// actionable: an exception that says "0xb99a5a is not a CAR colour" sends the
// reader hunting, one that names BRASS_MID does not.
const LEGACY_NAME = Object.freeze({
  0xcaa66b: 'BRASS_MID',
  0xb99a5a: 'BRASS_MID',
  0xc6a267: 'BRASS_MID',
  0xe7d8b2: 'BRASS_HI',
  0xf2d49a: 'BRASS_HI',
  0xe8d5a7: 'BRASS_HI',
  0xe5cf9b: 'BRASS_HI',
  0xe5c98f: 'BRASS_HI',
  0xf0cf8b: 'BRASS_HI',
  0xf4e3ba: 'BRASS_HI',
  0xe4c276: 'TUNGSTEN_REFLECT',
  0xe4b45a: 'TUNGSTEN_REFLECT',
  0xf0bd62: 'TUNGSTEN_REFLECT',
  0x7f6540: 'BRASS_DARK',
  0x26343b: 'ENAMEL_DARK',
  0x263238: 'ENAMEL_DARK',
  0x26363d: 'ENAMEL_DARK',
  0x1c2830: 'GLASS_DARK',
  0x17232b: 'VOID_LIFT',
  0x111920: 'VOID',
  0x10191e: 'VOID',
  0x101820: 'VOID',
  0x0a1015: 'VOID',
  0x071016: 'VOID',
  0x070b10: 'VOID',
  0x52636b: 'ENAMEL_HI',
  0x65757d: 'STEEL_DARK',
  0x5b6472: 'STEEL_DARK',
  0x454c58: 'STEEL_DARK',
  0x687981: 'STEEL_MID',
  0x697980: 'STEEL_MID',
  0x405159: 'ENAMEL_MID',
  0x99a4b1: 'STEEL_HI',
  0x91a3a9: 'STEEL_HI',
  0x9fb7c0: 'STEEL_HI',
  0x75d4cd: 'LAMP_OK',
  0xe45a5f: 'LAMP_ALERT',
  0x8e2634: 'VINYL',
  0xffc98a: 'TUNGSTEN',
});

// Derived from LEGACY_NAME so the two can never disagree. 0x687981 vs
// 0x697980 were two literals 0.04 L* apart, which no eye can separate; both
// land on STEEL_MID.
export const REMAP = Object.freeze(
  Object.fromEntries(
    Object.entries(LEGACY_NAME).map(([legacy, name]) => [Number(legacy), CAR[name]]),
  ),
);

// Built once at module scope. C() is called from bake-time fillStyle and
// strokeStyle paths, so it cannot afford to rebuild a lookup per call.
const CAR_VALUES = new Set(Object.values(CAR));

// HERO_BASE and SKY_RIM deliberately share 0xdfe7f2 under different semantics,
// so the reverse lookup keeps every name that owns a value rather than letting
// the later key overwrite the earlier one.
const CAR_NAMES_BY_VALUE = new Map();
for (const [name, value] of Object.entries(CAR)) {
  const names = CAR_NAMES_BY_VALUE.get(value);
  if (names) names.push(name);
  else CAR_NAMES_BY_VALUE.set(value, [name]);
}

/** Names that own a colour value, e.g. 0xdfe7f2 -> ['HERO_BASE', 'SKY_RIM']. */
export function namesFor(color) {
  const hex = tryNormalize(color);
  if (hex === null) return [];
  return [...(CAR_NAMES_BY_VALUE.get(hex) ?? [])];
}

/** True when the colour is exactly one of the role colours. Never throws. */
export function isCarColor(color) {
  const hex = tryNormalize(color);
  return hex !== null && CAR_VALUES.has(hex);
}

/**
 * Gate every bake-time colour through this. Returns the value untouched when
 * it is on-palette and throws otherwise, naming the replacement when the
 * offending value is a known legacy literal.
 */
export function C(color) {
  const hex = normalizeColor(color);
  if (CAR_VALUES.has(hex)) return hex;
  const suggestion = LEGACY_NAME[hex];
  throw new Error(
    suggestion
      ? `${toHex(hex)} is not a CAR colour. Use CAR.${suggestion} instead.`
      : `${toHex(hex)} is not a CAR colour, and has no migration mapping. `
        + 'Fold it into the nearest rung of the value ramp rather than adding a 25th colour.',
  );
}

/**
 * Mechanical migration helper: legacy literal in, CAR value out. Already-valid
 * CAR values pass through, so this is safe to apply to a whole file twice.
 */
export function remap(color) {
  const hex = normalizeColor(color);
  if (CAR_VALUES.has(hex)) return hex;
  const mapped = REMAP[hex];
  if (mapped !== undefined) return mapped;
  throw new Error(
    `${toHex(hex)} is neither a CAR colour nor a known legacy literal. `
    + 'Decide which rung of the ramp it belongs to before migrating it.',
  );
}
