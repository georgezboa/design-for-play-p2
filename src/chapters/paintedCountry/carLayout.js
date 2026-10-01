// Chapter 4 // THE PAINTED COUNTRY — where everything physically is.
//
// Per docs/STORY_BIBLE.md the country is Rosa Velez's childhood drawings of
// the Bellwether orchard, painted over by the archive in grey. The car is a
// grid of paper cells. PAINT rebuilds what she remembered; WASH strips the
// archive's grey and shows the pencil underneath (this chapter's version of
// Chapter 1's 1978 lens).
//
// The three bays are a three-step escalation:
//   A · THE COLD END   paint across a hole; wash a grey block away.
//   B · THE GALLERY    varnished "official record" air: paint will not take
//                      until it has been washed twice.
//   C · THE LONG WALL  pigment runs out. Washing the archive's grey gives
//                      Rosa's colour back to the brush; painting spends it.
//                      The last plate hangs over a hole, so the two verbs feed
//                      each other.
//
// This file describes surfaces and contents only. paintedCarModel.js turns it
// into rules.

export const CELL = 20;
export const GRID = { w: 144, h: 30 }; // 2880 x 600
export const VIEW = { w: 960, h: 600 };
export const WORLD = { w: GRID.w * CELL, h: GRID.h * CELL };

export const CEILING_Y = 80;
export const CEILING_ROW = CEILING_Y / CELL; // 4
export const RACK_Y = 104;
export const WAINSCOT_Y = 340;
export const FLOOR_ROW = 22;
export const FLOOR_Y = FLOOR_ROW * CELL; // 440

// Solid floor, in grid columns [from, to). Both holes are wider than a jump.
export const FLOOR_SPANS = [
  { from: 0, to: 20 }, // the cold end
  { from: 30, to: 112 }, // across the first hole, the gallery, the long wall
  { from: 122, to: 144 }, // past the second hole: the door
];

export const BAY_TITLES = [
  { x: 40, title: 'BAY A  ·  THE COLD END' },
  { x: 1000, title: 'BAY B  ·  THE GALLERY' },
  { x: 1960, title: 'BAY C  ·  THE LONG WALL' },
];

export const FOLDS = [960, 1920];

export const WINDOWS = [
  { x: 60, y: 120, w: 240, h: 170 },
  { x: 620, y: 120, w: 250, h: 170 },
  { x: 1600, y: 120, w: 240, h: 170 },
];

// The archive's grey gouache, in cell rectangles. Solid, and the only solid
// thing besides the player's own paint that a wash can remove.
export const BLOCK_RECTS = [
  // Bay A: five cells tall, so it cannot be jumped — WASH is taught here.
  { col: 40, row: 17, cols: 3, rows: 5 },
  // Bay C: the long wall, floor to ceiling. There is no way over it; washing
  // through it is also where the brush gets its colour back.
  { col: 102, row: CEILING_ROW, cols: 6, rows: FLOOR_ROW - CEILING_ROW },
];

// "Official record": varnished air under the orchard plate. Paint slides off
// it until it has been washed twice (VARNISH_COATS), then it is ordinary paper.
export const VARNISH_COATS = 2;
export const VARNISH_RECTS = [{ col: 63, row: 11, cols: 17, rows: 11 }];

// The door's own face. Nothing paints or washes it, so the signs stay legible.
export const SEALED_RECTS = [{ col: 129, row: 8, cols: 15, rows: 14 }];

// Bay C: the brush is dry. Painting a cell here spends one pigment; washing
// your own paint here gives it back; stripping a grey cell here recovers one.
// A grey cell washed here gives two pigment (alpha round 1 pacing: the
// staircase over the hole was a cell-by-cell chore); your own paint washed
// back still refunds one.
export const PIGMENT_ZONE = Object.freeze({ fromCol: 96, start: 0, perGrey: 2 });

// ------------------------------------------------------------------- signs
export const SIGN = Object.freeze({
  HAWTHORN: 'hawthorn',
  TICKET: 'ticket',
  LANTERN: 'lantern',
  APPLE: 'apple',
  ROSE: 'rose',
});

// Player-visible names for the sign ids.
export const SIGN_LABELS = Object.freeze({
  [SIGN.HAWTHORN]: 'HAWTHORN',
  [SIGN.TICKET]: 'TICKET',
  [SIGN.LANTERN]: 'LANTERN',
  [SIGN.APPLE]: 'APPLE',
  [SIGN.ROSE]: 'ROSE',
});

// Original project art, rendered by scripts/art/generate-chapter4-sign-icons.mjs.
// sign-* is the door plate; mark-* is the bare mark the gallery plates use.
export const SIGN_ART = Object.freeze(Object.fromEntries(
  Object.values(SIGN).map((sign) => [sign, `assets/chapter04/icons/sign-${sign}.webp`]),
));
export const MARK_ART = Object.freeze(Object.fromEntries(
  Object.values(SIGN).map((sign) => [sign, `assets/chapter04/icons/mark-${sign}.webp`]),
));

// ------------------------------------------------------------------ plates
// Three plates, hung too high to read from the floor. Each is under the
// archive's grey: washing it (in the plate viewer) reveals the pencil beneath.
// Every plate has a different large mark and, somewhere else on it, the same
// small hawthorn — Mara's mark. Rosa's rose is on two of them, never three.
//
// A plate is a 12 × 7 grid of wash cells. Rects are in those cells.
export const PLATE_GRID = Object.freeze({ cols: 12, rows: 7 });

export const PAINTINGS = [
  {
    id: 'city',
    key: 'plate-city',
    title: '1978 · CITY ROOM',
    primarySign: SIGN.TICKET,
    sharedSign: SIGN.HAWTHORN,
    scene: 'city',
    x: 1000,
    y: 236,
    w: 200,
    h: 112,
    markRect: { c: 1, r: 1, w: 6, h: 4 },
    hawthornRect: { c: 9, r: 4, w: 2, h: 2 },
    roseRect: null,
    varnishRects: [],
    caption:
      'A rented room near the terminal, kept for the early shift.\n'
      + 'The archive filed it as the first claim, collected, and painted it the colour of a filing cabinet.',
  },
  {
    id: 'orchard',
    key: 'plate-orchard',
    title: 'BELLWETHER ORCHARD',
    primarySign: SIGN.LANTERN,
    sharedSign: SIGN.HAWTHORN,
    scene: 'orchard',
    // Alpha round 1 pacing: hung 40 px lower, so a four-cell stair (one
    // jump from the floor) reaches it instead of a six-cell double stair.
    x: 1320,
    y: 188,
    w: 200,
    h: 112,
    markRect: { c: 5, r: 1, w: 3, h: 5 },
    hawthornRect: { c: 0, r: 0, w: 2, h: 2 },
    roseRect: { c: 10, r: 5, w: 2, h: 2 },
    varnishRects: [{ c: 4, r: 0, w: 5, h: 3 }],
    caption:
      'The orchard house, where she went home at weekends. Rosa drew it from the gate, porch lantern lit.\n'
      + 'The archive wrote "second claim" across it and never sent anyone to the address.',
  },
  {
    id: 'drawing',
    key: 'plate-drawing',
    title: "ROSA'S DRAWING",
    primarySign: SIGN.APPLE,
    sharedSign: SIGN.HAWTHORN,
    scene: 'drawing',
    // 40 px lower: a five-cell tower over the hole instead of seven. Alpha
    // round 2: 40 px lower again, so a bridge over the hole and one hop onto
    // a three-cell step reach it (testers were making three 1-cell hops). It
    // still hangs out over the hole, past what a jump from the floor reaches.
    x: 2240,
    y: 200,
    w: 200,
    h: 112,
    markRect: { c: 1, r: 2, w: 4, h: 5 },
    hawthornRect: { c: 7, r: 0, w: 2, h: 2 },
    roseRect: { c: 10, r: 4, w: 2, h: 2 },
    varnishRects: [{ c: 6, r: 0, w: 4, h: 3 }, { c: 0, r: 5, w: 3, h: 2 }],
    caption:
      'Rosa Velez, age nine: "my sister coming home". Apples on every tree, because she wanted more of them.\n'
      + 'She signed it the way she signed everything. So did her sister.',
  },
];

// How close the player has to get before a plate can be taken down. Small
// enough that none of the three can be reached from the floor.
export const READ_RADIUS = 100;

// The vestibule door: five signs, one question.
export const DOOR = {
  x: 2600,
  y: 186,
  w: 260,
  h: 254,
  correct: SIGN.HAWTHORN,
  prompt: 'WHICH MARK DID SHE LEAVE IN ALL THREE?',
  panels: [
    { sign: SIGN.LANTERN, x: 2626, y: 226, w: 56, h: 56 },
    { sign: SIGN.ROSE, x: 2702, y: 226, w: 56, h: 56 },
    { sign: SIGN.TICKET, x: 2778, y: 226, w: 56, h: 56 },
    { sign: SIGN.HAWTHORN, x: 2664, y: 314, w: 56, h: 56 },
    { sign: SIGN.APPLE, x: 2740, y: 314, w: 56, h: 56 },
  ],
};

// What the door says after a second wrong answer. The first miss only waits.
export const WRONG_ANSWER_LINES = Object.freeze({
  first: 'The door waits. Compare the three plates.',
  rosa: "That's Rosa's. Mara signed with the hawthorn.",
  gentle: (sign) => `The ${String(SIGN_LABELS[sign] ?? sign).toLowerCase()} is in only one of them. She left one small mark in all three.`,
});

// The brush reaches about a body and a half. Short enough that the player has
// to climb what they build, long enough that building is never fiddly.
export const REACH = 180;
export const MOVE_SPEED = 190;
export const JUMP_VELOCITY = -560;
export const GRAVITY_Y = 1700;
