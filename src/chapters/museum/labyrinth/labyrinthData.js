// CHAPTER 5 — THE MUSEUM OF ONE ANSWER
// Slice 2: LABYRINTH WING (experimental playtest slice)
//
// Super Dark Deception-inspired detour: the museum's back halls unfold into
// a sprawling stone labyrinth, built the way the base game's own world is
// built — distinct sections you advance through one at a time (this repo's
// "car" idea, translated into wings of one continuous maze instead of hard
// scene loads). Each wing is its own full sub-labyrinth; you clear the keys
// in it before the connector to the next one unlocks. Statues line the
// halls and only hold still while you look straight at them. Three lives.
// Die three times and the archive takes back the keys you found in that
// wing: you start again at its entrance, and they wait in the dark again.
//
// Pure data: grid size, wing map, tuning, palette, strings. mazeGenerator.js
// builds the layout from this; LabyrinthScene.js is the only thing that
// draws it.

export const VIEW = { w: 1280, h: 800 };

export const CELL = 72; // px per maze cell (both rooms and corridor cells)

// Each wing is its own independently-generated maze over a WING_ROOMS_X x
// WING_ROOMS_Y room grid. Wings tile into a macro grid (WINGS below gives
// each one a {col,row} slot) and share their border wall with neighbors, so
// they come pre-sealed from each other until a single connector cell is
// explicitly carved and gated between each adjacent pair.
export const WING_ROOMS_X = 9;
export const WING_ROOMS_Y = 9;
export const LOCAL_W = WING_ROOMS_X * 2 + 1; // 19 — one wing's own wall grid
export const LOCAL_H = WING_ROOMS_Y * 2 + 1;

// The progression order below IS the "car to car" order: wing 0 is where
// you spawn, each entry connects only to the next, and the exit lives in
// the last one. The first key found in a wing opens the next connector;
// the remaining keys are still required at the final exit, so players can
// advance, backtrack, and route around a statue instead of being trapped in
// one quadrant until it is completely swept. Laid out as a clockwise loop.
export const WINGS = [
  { id: 0, name: 'ENTRY HALL', col: 0, row: 0, keys: 2, statues: 2, shields: 1 },
  { id: 1, name: 'RESTORATION WING', col: 1, row: 0, keys: 2, statues: 2, shields: 1 },
  { id: 2, name: 'ARCHIVE DEPTHS', col: 1, row: 1, keys: 2, statues: 2, shields: 1 },
  { id: 3, name: 'THE LAST GALLERY', col: 0, row: 1, keys: 2, statues: 2, shields: 1 },
];

const WINGS_COLS = 1 + Math.max(...WINGS.map((w) => w.col));
const WINGS_ROWS = 1 + Math.max(...WINGS.map((w) => w.row));

// Wings share their border column/row with neighbors (that shared line is
// solid wall until a connector opens it), so the composite grid is smaller
// than WINGS_COLS*LOCAL_W — each additional wing only adds (LOCAL-1) cells.
export const GRID_W = WINGS_COLS * (LOCAL_W - 1) + 1;
export const GRID_H = WINGS_ROWS * (LOCAL_H - 1) + 1;
export const WORLD_W = GRID_W * CELL;
export const WORLD_H = GRID_H * CELL;

// The museum after hours, in the shared UI kit's language (src/shell/
// uiKit.css): walnut-dark masonry for the walls, worn limestone with a walnut
// cast for the floors, warm brass torch pools as the only comfort. Ivory marks
// the player and the keys; polished brass (`safe`, the kit's brass-hi) marks
// safety and open paths, where the old build used cyan; red only for active
// danger. The survey map is a walnut plate with ivory walls in a brass frame,
// like every other panel in the game.
export const PAL = {
  void: 0x070504,
  stone: 0x120d09,
  stoneLight: 0x1f1711,
  stoneLine: 0x050302,
  slate: 0x4c4135,
  floor: 0x352c23,
  floorLight: 0x473c2f,
  floorSeam: 0x1c1610,
  fog: 0x000000,
  torch: 0xe0a24a,
  torchCore: 0xffd98a,
  ivory: 0xeadfc6,
  graphite: 0x2f2922,
  graphiteSoft: 0x9c8a68,
  brass: 0xb08a4a,
  safe: 0xd9b56e,
  amber: 0xe0a24a,
  red: 0xd0503a,
  bloodRed: 0x8a2a1e,
  statue: 0x4a4542,
  statueEdge: 0x17120f,
  eye: 0x6e2a22,
  eyeFrozen: 0xb3563d,
  eyeHunt: 0xff3b3b,
  mapBackground: 0x2a1d14,
  mapFog: 0x120c08,
  mapWall: 0xeadfc6,
};

// One restrained warm wash per wing — pure atmosphere, never geometry. The
// four wings share one masonry language but each leans a few degrees toward
// its own tint: lamp-lit walnut entry, brass-patina restoration, oxblood
// archive depths, umber last gallery.
export const WING_WASH = [
  { color: 0x3a2c1f, alpha: 0.1 },
  { color: 0x30342a, alpha: 0.1 },
  { color: 0x3b2726, alpha: 0.1 },
  { color: 0x3d332a, alpha: 0.1 },
];

export const TUNING = {
  playerSpeed: 0.34, // px/ms — fast enough to actually outrun a hunting statue
  playerRadius: 15,
  invulnMs: 1400, // flashing i-frames after a hit
  lives: 3,

  keysTotal: WINGS.reduce((sum, w) => sum + w.keys, 0),
  // A little more forgiving than the collision math strictly needs, so a
  // fast, glancing approach under pressure still registers the pickup.
  keyPickupRadius: 40,

  shieldsTotal: WINGS.reduce((sum, w) => sum + w.shields, 0),
  shieldPickupRadius: 40,
  shieldCap: 3, // max carried charges
  shieldDurationMs: 3000, // how long one activation blocks all statue damage
  shieldTutorialThreatRadius: 720, // first post-pickup hunter teaches Shift before impact

  statueCount: WINGS.reduce((sum, w) => sum + w.statues, 0),
  statueSpeed: 0.205, // px/ms while hunting — still slower than the player
  statueRadius: 17, // "landing a hit" is now a real Arcade Physics overlap
  // between the player's and statue's circle bodies, not a distance check.
  activationRadius: 860, // px — unseen statues now commit from farther down a corridor
  returnRadius: 1320, // px — beyond this leash they path back to their original post
  statuePatrolSpeed: 0.135, // px/ms while roaming between distant rooms
  statuePatrolMinSteps: 6, // never choose the room it is already guarding
  statuePatrolMaxSteps: 18, // a broad route that can carry it out of a dead end
  visionRange: 460, // px — beyond this the player can't "see" a statue at all
  visionConeDeg: 62, // half-angle either side of facing counts as "looked at"
  repathMs: 380, // how often a hunting statue recomputes its path
  maxConcurrentHuntersPerWing: 1, // prevents two-statue corridor sandwiches
  wingEntryGraceMs: 1800, // crossing a new gate cannot immediately consume the restored life
  hunterReliefAfterHitMs: 2200, // the second statue cannot immediately replace a hunter that just hit

  chaseProximity: 560, // px — how close a hunting statue must be to trigger the chase theme
  chaseFadeMs: 700,

  flashlightRadius: 260, // Wing 1's safe, permanent light radius
  darkVisionRadius: 118,
  carriedTorchRadius: 245,
  torchRadius: 190,
  torchFuelMs: 20000,
  torchRelightRadius: 76,
  torchAttractionRadius: 1120,
  darkActivationRadius: 620,

  minimapSize: 190, // px, square survey map pinned to the lower-right

  movingMazeIntervalMs: 15000,
  movingMazeWarningMs: 2200,
  stairUseRadius: 58,

  gameOverHoldMs: 2600,
  winHoldMs: 3600,
};

export const STRINGS = {
  title: 'THE MUSEUM OF ONE ANSWER',
  slice: 'LABYRINTH WING',
  plaque: '"It only moves while you\'re not looking. Keep it in your eyes."',
  controls: 'WASD MOVE  ·  MOUSE AIM  ·  Q HOLD GAZE  ·  SHIFT SHIELD  ·  E USE  ·  HOLD R RESTART',
  keysLabel: (n, total) => `KEYS  ${n} / ${total}`,
  livesLabel: 'LIVES',
  shieldLabel: (n) => `SHIELD  ×${n}`,
  hitFlavor: [
    'IT MOVED WHEN YOU BLINKED.',
    'SOMETHING WAS BEHIND YOU.',
    'YOU LOOKED AWAY TOO LONG.',
  ],
  shieldFoundNote: (n) => `SHIELD RECOVERED — ${n} CHARGE${n === 1 ? '' : 'S'}.`,
  shieldFirstFoundNote: 'SHIELD RECOVERED — PRESS SHIFT WHEN A STATUE CLOSES IN.',
  shieldTutorialPrompt: '[SHIFT]  ACTIVATE SHIELD',
  shieldFullNote: 'ALREADY CARRYING AS MANY SHIELDS AS YOU CAN HOLD.',
  shieldUpNote: 'SHIELD UP — IT CAN\'T TOUCH YOU.',
  shieldEmptyNote: 'NO SHIELD CHARGES — FIND ONE FIRST.',
  shieldActiveNote: 'ALREADY SHIELDED.',
  shieldBlockedHit: [
    'THE SHIELD TAKES THE HIT.',
    'IT COULDN’T GET THROUGH.',
    'DEFLECTED.',
  ],
  gateLockedNote: 'THE GATE WON’T OPEN — MORE KEYS, SOMEWHERE IN THE DARK.',
  gateOpenNote: 'THE GATE IS OPEN. RUN.',
  wingGateLockedNote: (name, need) => `SEALED — FIND ${need} MORE KEY${need === 1 ? '' : 'S'} TO OPEN ${name}.`,
  wingGateOpenNote: (name) => `THE WAY TO ${name} IS OPEN.`,
  wingCard: (name) => name,
  wingLivesRestored: 'NEW WING — LIVES RESTORED TO THREE.',
  gameOverLine: 'THE ARCHIVE HOLDS YOUR PLACE.',
  gameOverSub: (lost) => `${lost ? `THE ARCHIVE TAKES BACK ${lost} KEY${lost === 1 ? '' : 'S'} FROM THIS WING   ·   ` : ''}[R] RETURN TO ITS ENTRANCE`,
  restartHold: (progress) => `HOLD R TO REBUILD THE MAZE  ${'▰'.repeat(Math.round(progress * 6))}${'▱'.repeat(6 - Math.round(progress * 6))}`,
  restartConfirmLine: 'REBUILD THE LABYRINTH?',
  restartConfirmSub: 'A NEW MAZE, AND EVERY KEY YOU CARRY IS LOST   ·   [Y] REBUILD   ·   [N] KEEP GOING',
  winLine: 'YOU WALKED OUT WITH EVERY KEY.',
  winSub: 'THE GATE CLOSES ON SOMETHING BEHIND YOU.',
  fragmentRestLine: 'A BROKEN EYE RESTS ON YOUR SIDE OF THE GATE.',
  fragmentTakeHint: '[E]  TAKE IT',
  fragmentTakenLine: 'THE LOOKING FRAGMENT COMES WITH YOU.',
  introLine: 'DON’T LOOK AWAY FOR LONG.',
  torchLitNote: 'THE FLAME RETURNS. SOMETHING ELSE NOTICED.',
  torchOutNote: 'THE FLAME IS GONE. STAY CLOSE TO THE WALLS.',
  movingMazeWarning: 'THE WALLS ARE DRAWING BREATH.',
  movingMazeShifted: 'THE PASSAGES HAVE MOVED.',
  stairHint: '[E]  CHANGE FLOOR',
  fragmentClueNear: 'THE BROKEN EYES ALL FACE THIS WAY.',
  lastGalleryIntro: 'TWO FLOORS SHARE ONE PLAN. USE E AT THE STAIRS. THE FINAL SEAL IS NOT ON THE MAP.',
};
