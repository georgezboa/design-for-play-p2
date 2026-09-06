// CAR 04 // THE BORROWED GRID — authoritative layout data.
// Pure data module: no Phaser. The scene renders from this, the models run on
// it, and the tests lock it. Coordinates are world px, y grows downward.
//
// Platforming budget (verified in tests/car04/levelData.test.mjs):
//   walk 200 px/s, jump v -730, g 1900 -> max jump length ~154 px,
//   max jump height ~140 px. Every gap meant to be unjumpable is >= 240 px,
//   every level change meant to be unreachable is >= 270 px.

export const VIEW = { w: 960, h: 600 };

export const PLAYER = {
  walkSpeed: 200,
  jumpVelocity: -730,
  gravity: 1900,
  w: 26,
  h: 44,
  coyoteMs: 110,
  bufferMs: 130,
};

export const MOVE_LIMITS = {
  maxJumpLength: 154, // derived from the numbers above; tests re-derive
  maxJumpHeight: 140,
};

export const GROUND_Y = 520; // main deck surface line for bays 1-3
export const UPPER_Y = 250; // high deck surface line for bays 4-5
export const CATWALK_Y = 430; // bay 3 upper-branch catwalk

export const WORLD = { w: 5700, h: 720, killY: 690 };

export const BAYS = [
  { id: 'bay1', name: 'STRUCTURE', x0: 0, x1: 950 },
  { id: 'bay2', name: 'CONDUCTION', x0: 950, x1: 2050 },
  { id: 'bay3', name: 'SWITCHING', x0: 2050, x1: 3350 },
  { id: 'bay4', name: 'REBUILD', x0: 3350, x1: 4550 },
  { id: 'bay5', name: 'GRID', x0: 4550, x1: 5700 },
];

// Solid walkable platforms: { id, x, y(surface top), w, d(depth downward) }.
export const PLATFORMS = [
  { id: 'p1a', x: 40, y: GROUND_Y, w: 460, d: 200 }, // bay 1 start
  { id: 'p1b', x: 740, y: GROUND_Y, w: 410, d: 200 }, // bay 1 far / bay 2 near
  { id: 'p2f', x: 1750, y: GROUND_Y, w: 300, d: 200 }, // bay 2 far side
  { id: 'p3a', x: 2050, y: GROUND_Y, w: 400, d: 200 }, // bay 3 arrival (battery home)
  // hazard floor 2450..3250 at GROUND_Y (crusher machinery, lethal on foot)
  { id: 'p3z', x: 3250, y: GROUND_Y, w: 470, d: 200 }, // bay 3 merge -> bay 4 base
  { id: 'cw3a', x: 2440, y: CATWALK_Y, w: 320, d: 18 }, // upper branch catwalk A
  { id: 'cw3b', x: 3000, y: CATWALK_Y, w: 320, d: 18 }, // upper branch catwalk B
  { id: 'step3', x: 2400, y: 475, w: 60, d: 45 }, // one step up to catwalk (jumpable)
  { id: 'p4u', x: 3950, y: UPPER_Y, w: 650, d: 60 }, // bay 4 upper deck
  { id: 'p5b', x: 4840, y: UPPER_Y, w: 400, d: 60 }, // bay 5 far deck (final car dock)
  { id: 'balcony', x: 5360, y: UPPER_Y, w: 300, d: 60 }, // goal balcony
];

// Lethal zones (respawn at current bay).
export const HAZARDS = [
  { id: 'crushers', x: 2460, y: GROUND_Y - 46, w: 780, h: 46, kind: 'machinery' },
];

// Ladder anchors. role 'bridge' = structural walkway; 'lean' = climbable slope;
// 'conductor' = lies across two insulator posts and closes a circuit.
export const LADDERS = [
  {
    id: 'L1',
    home: { x: 180, y: GROUND_Y - 8 }, // rack position in bay 1
    w: 240,
    h: 16,
    slots: [
      // slot.y is the WALKING surface line (the ladder's top edge); bridge
      // slots stay flush with the decks they join so crossing needs no hop.
      { id: 'L1.bridge', role: 'bridge', x: 500, y: GROUND_Y, w: 240, h: 16 },
      {
        id: 'L1.power', role: 'conductor', x: 955, y: GROUND_Y - 58, w: 240, h: 16,
        sockets: ['S2A', 'S2B'],
      },
    ],
  },
  {
    id: 'L3',
    home: { x: 2140, y: GROUND_Y - 8 }, // rack at the bay-3 entry, clear of the battery
    w: 240,
    h: 16,
    slots: [
      { id: 'L3.bridge', role: 'bridge', x: 2760, y: CATWALK_Y, w: 240, h: 16 },
    ],
  },
  {
    id: 'L2',
    home: { x: 4400, y: UPPER_Y - 8 },
    w: 240,
    h: 16,
    slots: [
      { id: 'L2.bridge', role: 'bridge', x: 4600, y: UPPER_Y, w: 240, h: 16 },
    ],
  },
];

// Power sockets. kind 'mains' = always-live city grid terminal;
// 'battery' = accepts the battery block; 'conductor' = ladder terminal.
export const SOCKETS = [
  { id: 'GRID2', kind: 'mains', x: 820, y: GROUND_Y - 90 },
  { id: 'S2A', kind: 'conductor', x: 970, y: GROUND_Y - 58 },
  { id: 'S2B', kind: 'conductor', x: 1130, y: GROUND_Y - 58 },
  { id: 'SIG2', kind: 'signal', x: 1160, y: GROUND_Y - 150 }, // dock stop light
  { id: 'S3U', kind: 'battery', x: 2380, y: GROUND_Y - 30 },
  { id: 'S3L', kind: 'battery', x: 2250, y: GROUND_Y - 30 },
  { id: 'SIG3U', kind: 'signal', x: 2520, y: CATWALK_Y - 60 },
  { id: 'SIG3L', kind: 'signal', x: 2660, y: GROUND_Y - 120 },
  { id: 'S4', kind: 'battery', x: 4240, y: UPPER_Y - 30 },
  { id: 'SIG5', kind: 'signal', x: 4920, y: UPPER_Y - 90 },
  { id: 'NEON', kind: 'signal', x: 5200, y: UPPER_Y - 60 }, // balcony power bus
];

// Fixed copper wires (always conduct). Ladder conductor links are dynamic.
export const WIRES = [
  { a: 'GRID2', b: 'S2A' },
  { a: 'S2B', b: 'SIG2' },
  { a: 'S3U', b: 'SIG3U' },
  { a: 'S3L', b: 'SIG3L' },
  { a: 'S4', b: 'SIG5' },
  { a: 'SIG5', b: 'NEON' },
];

export const BATTERY = {
  id: 'BAT',
  home: { x: 2280, y: GROUND_Y - 26 },
  w: 44,
  h: 52,
  sockets: ['S3U', 'S3L', 'S4'],
};

// Traffic. Stops are dock points; stop.y is the car's top-surface line while
// dwelling, kept flush with the platform it serves so boarding needs no jump.
export const STOPS = {
  b2near: { x: 1080, y: GROUND_Y },
  b2far: { x: 1850, y: GROUND_Y },
  b3upA: { x: 2560, y: CATWALK_Y },
  b3upB: { x: 3260, y: CATWALK_Y },
  b3lowA: { x: 2260, y: GROUND_Y },
  b3lowB: { x: 3290, y: GROUND_Y },
  b4low: { x: 3620, y: GROUND_Y },
  b4up: { x: 4080, y: UPPER_Y },
  b5dock: { x: 4940, y: UPPER_Y },
  b5balcony: { x: 5420, y: UPPER_Y },
};

export const CARS = [
  {
    id: 'car2',
    signal: 'SIG2',
    routes: { on: ['b2near', 'b2far'] },
    speed: 170,
    dwellMs: 3500,
    parkAt: { x: 1080, y: 300 }, // dark, parked high and away when unpowered
  },
  {
    id: 'tram3',
    signal: 'SIG3U',
    routes: { on: ['b3upA', 'b3upB'] },
    speed: 95, // the slow safe branch
    dwellMs: 4000,
    parkAt: { x: 3260, y: 200 },
  },
  {
    id: 'car3l',
    signal: 'SIG3L',
    routes: { on: ['b3lowA', 'b3lowB'] },
    speed: 230, // the fast branch through the machinery
    dwellMs: 3200,
    parkAt: { x: 3290, y: 300 },
  },
  {
    id: 'car4',
    signal: null, // city cargo lift, always running
    routes: { on: ['b4low', 'b4up'] },
    speed: 120,
    dwellMs: 4200,
    parkAt: null,
  },
  {
    id: 'car5',
    signal: 'SIG5',
    routes: { on: ['b5dock', 'b5balcony'] },
    speed: 150,
    dwellMs: 3800,
    parkAt: { x: 4940, y: 60 },
  },
];

export const CAR_SIZE = { w: 150, h: 30 };

// Camera windows: fixed frames for the planning bays, follow elsewhere.
// Bay 4 follows vertically during the layer change.
export const CAMERA_ZONES = [
  { id: 'bay2-plan', x0: 950, x1: 1700, camX: 980, followY: false },
  { id: 'bay3-plan', x0: 2050, x1: 3100, camX: 2100, followY: false },
  { id: 'bay4-lift', x0: 3350, x1: 4550, camX: null, followY: true },
  { id: 'bay5-wide', x0: 4550, x1: 5350, camX: 4560, followY: true },
];

// Respawn points per bay (player falls -> current bay start, progress kept).
export const RESPAWNS = {
  bay1: { x: 120, y: GROUND_Y - 60 },
  bay2: { x: 820, y: GROUND_Y - 60 },
  bay3: { x: 2120, y: GROUND_Y - 60 },
  bay4: { x: 3300, y: GROUND_Y - 60 },
  bay5: { x: 4400, y: UPPER_Y - 60 },
};

export const START = { x: 120, y: GROUND_Y - 60 };

export const GOAL = { doorX: 5560, balconyX0: 5360, balconyX1: 5660, completeX: 5540 };

// The single hint line allowed per bay (shown only after the player has seen
// the failure once and still not acted).
export const HINTS = {
  bay1: 'A ladder can bridge it.',
  bay2: 'The dock light has no power — a ladder conducts too.',
  bay3: 'One battery feeds one branch.',
  bay4: 'Bring the battery up. The line up there is cut.',
  bay5: 'Feed the branch, then meet the last car at the dock.',
};
