// Chapter 4 // THE PAINTED COUNTRY — the sheet.
//
// Every other car in this game is a dark world where the player is the
// brightest moving thing. This one inverts that completely: the world is warm
// off-white paper, and the player is the darkest mark on it. Getting the
// inversion right is the whole art problem, so the value ramp is stated here
// once and nothing may hand-pick a colour outside it.
//
// The neutrals are Anthropic's warm off-white family — bone, cloud, manilla,
// kraft, book cloth — rather than a cool grey-white. Cool white reads as
// screen; warm white reads as paper, and this chapter has to read as paper
// before it reads as anything else.

export const PAPER = {
  // ------------------------------------------------------------ the sheet
  // The value ramp runs the opposite way from every other car: the furthest
  // plane is the LIGHTEST, and each plane closer to the camera takes one more
  // step of warm grey. Break the monotonicity and the folds stop reading.
  sheetHigh: 0xfdfcf8, // lit paper — the country seen through a window
  sheet: 0xf7f4ec, // base sheet, the carriage lining
  sheetMid: 0xefe9dc, // one fold back
  sheetLow: 0xe6dfcd, // near plane / foreground paper
  fold: 0xd8cfb9, // the shaded side of a crease
  deckle: 0xc9bda3, // torn and cut edges

  // -------------------------------------------------------------- graphite
  // The under-drawing. Nothing in this car is "outlined" — it is *drafted*,
  // with construction lines that overshoot their corners the way a real
  // draughtsman's do.
  graphite: 0x4a4640, // contour and hard construction line
  graphiteSoft: 0x8d8579, // hatching
  graphiteFaint: 0xb7af9f, // guide lines the child drew and abandoned

  // ---------------------------------------------------------- warm accents
  bookCloth: 0xcc785c, // the brush handle, the stove's enamel, kraft tape
  kraft: 0xd4a27f,
  manilla: 0xebdbbc,

  // ------------------------------------------------------- the three pigments
  // Deliberately outside the shared signal language below, so a painted
  // surface can never be misread as a system state.
  boneBlack: 0x2c2823,
  indigo: 0x46618c,
  verdigris: 0x6f9c8b,

  // --------------------------------------------- shared signal language
  // Re-tuned for a light ground. The dark-car values are unreadable on paper.
  cyan: 0x2f8c9e, // Mara's thread / relationship
  amber: 0xc8892f, // transmitted state
  fault: 0xb4453a, // danger — used nowhere in this car, kept for consistency

  // --------------------------------------------------------------- figures
  // The player is the darkest mark in the frame. That is the inversion.
  figure: 0x24211d,
  figureSoft: 0x4a4640,
};

// Ordered light-to-dark. A plane may never sit lighter than the plane behind
// it; this array is the check.
export const PAPER_RAMP = [
  PAPER.sheetHigh,
  PAPER.sheet,
  PAPER.sheetMid,
  PAPER.sheetLow,
  PAPER.fold,
  PAPER.deckle,
];

export const PAPER_CSS = {
  sheet: '#f7f4ec',
  sheetHigh: '#fdfcf8',
  graphite: '#4a4640',
  graphiteSoft: '#8d8579',
  bookCloth: '#cc785c',
};
