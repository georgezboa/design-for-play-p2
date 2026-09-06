// Chapter 4 // THE PAINTED COUNTRY — where everything physically is.
//
// The car is a grid of paper cells. The player paints and washes cells freely
// rather than triggering fixed targets, so this file describes surfaces and
// contents, never "the third barrier". The model turns it into rules.

export const CELL = 20;
export const GRID = { w: 144, h: 30 }; // 2880 x 600
export const VIEW = { w: 960, h: 600 };
export const WORLD = { w: GRID.w * CELL, h: GRID.h * CELL };

export const CEILING_Y = 80;
export const RACK_Y = 104;
export const WAINSCOT_Y = 340;
export const FLOOR_ROW = 22;
export const FLOOR_Y = FLOOR_ROW * CELL; // 440

// Solid floor, in grid columns [from, to). Everything else is a hole in the
// sheet. Both holes are wider than a jump, so both must be painted across.
export const FLOOR_SPANS = [
  { from: 0, to: 20 }, // the cold end
  { from: 32, to: 96 }, // across the first hole and the whole gallery
  { from: 104, to: 144 }, // the long wall, the door
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
  { x: 2120, y: 120, w: 250, h: 170 },
];

// Paper blocks: solid, and the only solid thing besides the player's own paint
// that a wash can remove. Given in cell rectangles.
export const BLOCK_RECTS = [
  // Bay A: a stack sealing the way into the gallery. Five cells tall, so it
  // cannot be jumped — the player has to learn WASH to get past it.
  { col: 40, row: 17, cols: 3, rows: 5 },
  // Bay C: the long wall. A slab the player must open a hole through.
  { col: 110, row: 13, cols: 5, rows: 9 },
];

// ------------------------------------------------------------ the thread boards
// Each archive has its own color-link card. The first card is the existing
// three-pair teaching board; the later cards add turns and crossings. The
// model owns the rules, while the scene places the active card inside the E
// viewer beside the image it develops.
export const BOARDS = [
  {
    id: 'board-nave',
    cols: 5,
    rows: 5,
    // The first card is deliberately literal: three separate straight lines.
    // It teaches dragging and releasing without looking like a dead end.
    torn: [],
    pairs: [
      { id: 'amber', a: [0, 0], b: [4, 0] },
      { id: 'cyan', a: [0, 2], b: [4, 2] },
      { id: 'red', a: [0, 4], b: [4, 4] },
    ],
  },
  {
    id: 'board-field',
    cols: 5,
    rows: 7,
    torn: [],
    pairs: [
      { id: 'amber', a: [0, 6], b: [3, 5] },
      { id: 'orange', a: [3, 0], b: [0, 1] },
      { id: 'green', a: [4, 0], b: [4, 6] },
      { id: 'cyan', a: [3, 1], b: [0, 2] },
      { id: 'violet', a: [2, 2], b: [2, 5] },
      { id: 'pink', a: [3, 2], b: [1, 4] },
    ],
  },
  {
    id: 'board-city',
    cols: 7,
    rows: 7,
    torn: [],
    // Carved from a single path that covers every hole in the card, then cut
    // into seven, so it is solvable by construction and every cord has to weave.
    pairs: [
      { id: 'green', a: [3, 1], b: [5, 3] },
      { id: 'violet', a: [6, 3], b: [4, 4] },
      { id: 'red', a: [4, 3], b: [4, 6] },
      { id: 'amber', a: [3, 6], b: [1, 4] },
      { id: 'cyan', a: [1, 5], b: [0, 2] },
      { id: 'lime', a: [1, 2], b: [3, 0] },
      { id: 'blue', a: [4, 0], b: [6, 2] },
    ],
  },
];

// Compatibility data for focused tests and old tooling. The first archive's
// board is intentionally the easiest one.
export const BOARD = Object.freeze({
  ...BOARDS[0],
  x: 0,
  y: 0,
  w: 192,
  h: 192,
  pad: 28,
  pitch: 34,
});

export const eyeletAt = (c, r, board = BOARD) => ({
  x: board.x + board.pad + c * board.pitch,
  y: board.y + board.pad + r * board.pitch,
});

export const CORD_COLOURS = {
  amber: 0xc8892f,
  cyan: 0x2f8c9e,
  red: 0xb4453a,
  orange: 0xd4772f,
  green: 0x4f9d5d,
  violet: 0x8a5cc4,
  pink: 0xd06ba8,
  lime: 0xa8b83c,
  blue: 0x3f7fc4,
};

// Varnished paper. Only the door face is protected. The former varnished patch
// beneath The Last City made the archive look reachable while preventing the
// player from placing the staircase the controls had taught them to build.
export const GLAZE_RECTS = [
  // The door face, so the signs can never be painted over.
  { col: 129, row: 8, cols: 15, rows: 14 },
];

export const SIGN = Object.freeze({
  MOON: 'moon',
  EYE: 'eye',
  HEIR: 'heir',
  RAPTURE: 'rapture',
  OEDON: 'oedon',
});

// The five signs cut into the vestibule door. Each archive has a different
// large mark drawn from these signs, plus one smaller repeated seal. Comparing
// all three pictures reveals the repeated seal without requiring guesswork.
export const SIGN_ART = {
  [SIGN.MOON]: 'assets/chapter04/icons/Moon.webp',
  [SIGN.EYE]: 'assets/chapter04/icons/Eye_Tier_3.webp',
  [SIGN.HEIR]: 'assets/chapter04/icons/Heir.webp',
  [SIGN.RAPTURE]: 'assets/chapter04/icons/Blood_Rapture.webp',
  [SIGN.OEDON]: 'assets/chapter04/icons/Formless_Oedon.webp',
};

// The gallery. Hung high on purpose: the only way to read one is to build up
// to it. The large marks are deliberately different; the small moon seal is
// the only sign in all three, which is the answer the door is asking for.
// Three pictures of the same institution, three ages apart — which is the whole
// reason this car is on a train travelling backwards. Each one is hung too high
// to read from the floor. Standing close enough lets the player press E and see
// the plate full size with its archive caption underneath, and every caption
// ends on the same word.
export const PAINTINGS = [
  {
    id: 'nave',
    board: 'board-nave',
    key: 'plate-nave',
    file: 'assets/chapter04/gallery/middleage.jpg',
    title: 'YEAR ONE  ·  THE NAVE',
    primarySign: SIGN.EYE,
    sharedSign: SIGN.MOON,
    x: 1000,
    y: 240,
    w: 200,
    h: 112,
    caption:
      'They pulled out the altar and set the instruments where it had stood, and they cut their eye into every banner in the hall.\n' +
      'Nothing in the building ever answered them. The only thing that did came through the high window on a clear night, and the ledger for that year enters it under one word:\n' +
      'LARGE MARK: EYE.  SMALL SEAL: MOON.',
  },
  {
    id: 'field',
    board: 'board-field',
    key: 'plate-field',
    file: 'assets/chapter04/gallery/duga.jpg',
    title: 'YEAR FORTY  ·  THE LISTENING FIELD',
    primarySign: SIGN.HEIR,
    sharedSign: SIGN.MOON,
    x: 1320,
    y: 148,
    w: 200,
    h: 112,
    caption:
      'Three hundred metres of aerial pointed at everything, logging every signal that crossed the commune for forty years.\n' +
      'Exactly one of them came back on schedule, every twenty-nine days. The duty officer was not permitted to write down what he believed it was, so he wrote:\n' +
      'LARGE MARK: HEIR.  SMALL SEAL: MOON.',
  },
  {
    id: 'city',
    board: 'board-city',
    key: 'plate-city',
    file: 'assets/chapter04/gallery/cyberpunk.jpg',
    title: 'THE LAST CITY',
    primarySign: SIGN.RAPTURE,
    sharedSign: SIGN.MOON,
    x: 1660,
    y: 110,
    w: 200,
    h: 112,
    caption:
      'Ninety storeys of him, with a world held up in each hand. Everyone agreed the right hand was the earth.\n' +
      'Nobody could agree about the left, so the plaque stayed blank for eleven years — until somebody climbed up in the dark and finished it:\n' +
      'LARGE MARK: RAPTURE.  SMALL SEAL: MOON.',
  },
];

// How close the player has to get before a picture counts as read. Small
// enough that none of the three can be read from the floor.
export const READ_RADIUS = 100;

// The vestibule door. Four signs; the player has to work out which one every
// picture had in it.
export const DOOR = {
  x: 2600,
  y: 186,
  w: 260,
  h: 254,
  correct: SIGN.MOON,
  prompt: 'THE LARGE MARKS CHANGE.\nWHICH SMALL SEAL REPEATS?',
  panels: [
    { sign: SIGN.EYE, x: 2626, y: 238, w: 56, h: 56 },
    { sign: SIGN.MOON, x: 2702, y: 238, w: 56, h: 56 },
    { sign: SIGN.HEIR, x: 2778, y: 238, w: 56, h: 56 },
    { sign: SIGN.RAPTURE, x: 2664, y: 318, w: 56, h: 56 },
    { sign: SIGN.OEDON, x: 2740, y: 318, w: 56, h: 56 },
  ],
};

// The brush reaches about a body and a half. Short enough that the player has
// to climb what they build, long enough that building is never fiddly.
export const REACH = 180;
export const MOVE_SPEED = 190;
export const JUMP_VELOCITY = -560;
export const GRAVITY_Y = 1700;
