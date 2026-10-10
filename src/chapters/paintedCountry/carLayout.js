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
//   B · THE GALLERY    build up to the first two plates; each is a short
//                      puzzle of Rosa's colours (threadBoard.js).
//   C · THE LONG WALL  pigment runs out. Washing the archive's grey gives
//                      Rosa's colour back to the brush; painting spends it.
//                      The last plate hangs over a hole, so the two verbs feed
//                      each other.
//
// Round 11 (George): the varnished "official record" that refused paint
// until it was washed twice is gone, and so is washing the plates open cell
// by cell. Nothing in the car is done twice.
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

// The marks are drawn at boot in the chapter's own pencil and wash
// (art/marksArt.js, via platePencil.js ensureMarkTextures): `sign-<id>` is the
// door's pinned card, `mark-<id>` the bare mark the gallery plates compose.

// ------------------------------------------------------------------ plates
// Three plates, hung too high to read from the floor. Each is under the
// archive's grey, and under the grey are Rosa's colours in pairs (`board`):
// joining every pair and covering every square in the plate viewer lifts
// the grey (threadBoard.js). Every plate has a different large mark and,
// somewhere else on it, the same small hawthorn — Mara's mark. Rosa's rose
// is on two of them, never three.
//
// The marks are placed on a 12 × 7 grid of the plate (PLATE_GRID); the
// puzzle has its own, coarser grid (`board.cols` × `board.rows`) over the
// same picture. The boards ramp gently: 5 × 3 with three colours, 6 × 4 with
// four, 7 × 4 with five. Each has exactly one answer (tests/paintedCountry).
export const PLATE_GRID = Object.freeze({ cols: 12, rows: 7 });

// Rosa's gouache, the colours under the grey (the same six as the studio and
// the yard), each with a small pencil glyph so no colour is told by hue alone.
export const THREAD_COLOURS = Object.freeze({
  red: { name: 'VERMILION', color: 0xc95850, glyph: 'dot' },
  blue: { name: 'INDIGO', color: 0x537ca6, glyph: 'bar' },
  yellow: { name: 'OCHRE', color: 0xd7b84a, glyph: 'ring' },
  green: { name: 'VERDIGRIS', color: 0x5e9172, glyph: 'cross' },
  violet: { name: 'MULBERRY', color: 0x84658f, glyph: 'pair' },
  orange: { name: 'MARIGOLD', color: 0xd98a3a, glyph: 'stem' },
});

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
    // the first: three colours, one short bend
    board: {
      cols: 5,
      rows: 3,
      pairs: [
        { id: 'yellow', a: [0, 0], b: [1, 1] },
        { id: 'red', a: [2, 0], b: [3, 2] },
        { id: 'blue', a: [3, 1], b: [0, 1] },
      ],
    },
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
    board: {
      cols: 6,
      rows: 4,
      pairs: [
        { id: 'yellow', a: [0, 0], b: [3, 1] },
        { id: 'blue', a: [1, 0], b: [1, 2] },
        { id: 'green', a: [4, 1], b: [3, 2] },
        { id: 'red', a: [0, 2], b: [1, 3] },
      ],
    },
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
    board: {
      cols: 7,
      rows: 4,
      pairs: [
        { id: 'blue', a: [0, 0], b: [5, 2] },
        { id: 'red', a: [5, 0], b: [5, 3] },
        { id: 'yellow', a: [0, 1], b: [3, 2] },
        { id: 'green', a: [1, 2], b: [4, 2] },
        { id: 'violet', a: [0, 2], b: [1, 3] },
      ],
    },
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
