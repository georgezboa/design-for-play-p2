// Chapter 2 · BORROWED LIGHT — level data.
//
// Everything the scene builds comes from here: roofs, grid nodes, machines,
// cables, lamp checkpoints, section triggers and story props. Pure data plus
// a few pure helpers, so tests can check geometry against the jump arc.
//
// Design numbers (src/chapters/borrowedLight/controller.js, jumpArc()):
//   max run 420 px/s · apex 180 px · air time 0.73 s · flat range 308 px
//   comfortable gap ≤ 231 px · comfortable step-up ≤ 144 px
//   → every "walk/jump" gap here is ≤ 200 px with ≤ 90 px rise,
//   → every "machine only" gap is ≥ 400 px level, or ≥ 300 px rise.
// Timetable: bell every 4 s; machine durations 4–8 s; bridges extend in
// 0.6 s, lifts travel in 1.3 s, so a machine that fires as you arrive is
// always ridable before its 0.6 s flicker.

export const WORLD = Object.freeze({
  width: 21600,
  top: -760,
  bottom: 1480,
  killY: 990,       // below every roof: Butch is falling into the mist → respawn
  mistY: 1160,      // where the mist starts to thicken (visual)
  view: { w: 1920, h: 1080 },
});

export const SECTIONS = Object.freeze({
  A: Object.freeze({ id: 'A', name: 'RAIN ROOFTOPS', from: 0, to: 8440, checkpoint: 'chapter-2-start', spawn: 'lamp-a0' }),
  B: Object.freeze({ id: 'B', name: 'BLACKOUT', from: 8440, to: 16760, checkpoint: 'chapter-2-midpoint', spawn: 'lamp-b0' }),
  C: Object.freeze({ id: 'C', name: 'EVACUATION PLATFORM', from: 16760, to: 21600, checkpoint: 'chapter-2-platform', spawn: 'lamp-c0' }),
});

export const SECTION_ORDER = Object.freeze(['A', 'B', 'C']);

export function sectionAt(x) {
  if (x >= SECTIONS.C.from) return 'C';
  if (x >= SECTIONS.B.from) return 'B';
  return 'A';
}

// ---------------------------------------------------------------------------
// Roofs. y is the walkable top; buildings run down past the bottom of the
// world. `hidden` roofs are solid but unseen in the blackout until a light
// (Butch's lamp, a lit machine or a node's afterglow) falls on them.
// style picks the procedural facade (see art/cityArt.js).
const roof = (id, x, w, y, style, extra = {}) => Object.freeze({ id, x, w, y, style, kind: 'roof', ...extra });
const ledge = (id, x, w, y, style, extra = {}) => Object.freeze({ id, x, w, y, style, kind: 'ledge', h: extra.h ?? 34, ...extra });

export const PLATFORMS = Object.freeze([
  // ---- A · RAIN ROOFTOPS ----------------------------------------------
  roof('a-terminal', -400, 1900, 760, 'terminal'),              // 1: the rooftop terminal
  roof('a-roof1', 2000, 900, 760, 'tenement'),                  // bridge a-bridge1 lands here
  roof('a-roof2', 2900, 800, 400, 'office'),                    // 2: reached by the lift
  roof('a-roof3', 3700, 1000, 760, 'brick'),                    // 3: drop down, lift + bridge
  roof('a-roof4', 5160, 820, 460, 'tenement'),                  // 4: the one-line rule
  ledge('a-ac', 5540, 100, 390, 'ac', { h: 70 }),               //    AC unit: step onto the stair head
  roof('a-stairhead', 5640, 240, 300, 'stairhead', { bottom: 460 }),
  roof('a-view', 6440, 220, 460, 'watertower'),                 //    dead-end lookout (bridge route)
  roof('a-roof5', 6840, 660, 260, 'office'),                    // 5: vent updraft
  roof('a-roof6', 7900, 540, 160, 'tenement'),                  //    top of the updraft, hotel sign ahead

  // ---- B · BLACKOUT ----------------------------------------------------
  roof('b-roof7', 8440, 860, 640, 'brick'),                     // section start, lamp
  // Two wide, dark scaffold decks: any full running jump from the right half
  // of one lands on the next. The challenge is seeing them, not precision.
  ledge('b-step1', 9407, 240, 620, 'ledge', { hidden: true, h: 40 }),
  ledge('b-step2', 9754, 240, 600, 'ledge', { hidden: true, h: 40 }),
  roof('b-roof8', 10100, 800, 640, 'tenement'),
  roof('b-roof9', 10900, 1000, 300, 'office'),
  ledge('b-stone-ledge', 11560, 220, -60, 'ledge', { hidden: true, h: 40 }),
  roof('b-roof10', 12340, 660, 300, 'brick'),
  roof('b-hotel', 13000, 1000, -150, 'hotel'),
  // B5 · BORROWED AFTERGLOW: the city holds a bridge to a water-tower roof;
  // past it, two dark decks that only a sign's afterglow shows. The sign is
  // on the bridge's line: to borrow the light you give up the way back.
  roof('b-roof11a', 14000, 560, 300, 'tenement'),
  roof('b-tower', 15000, 200, 300, 'watertower'),
  ledge('b-deck3', 15270, 300, 320, 'ledge', { hidden: true, h: 40 }),
  ledge('b-deck4', 15640, 300, 320, 'ledge', { hidden: true, h: 40 }),
  roof('b-roof11b', 16010, 750, 300, 'tenement'),
  roof('b-plant', 16220, 240, 80, 'plantroom', { bottom: 190 }),

  // ---- C · EVACUATION PLATFORM ----------------------------------------
  roof('c-concourse', 16760, 990, 520, 'concourse'),
  roof('c-yard', 18250, 500, 520, 'concourse'),
  roof('c-gantry', 18750, 600, 180, 'gantry', { bottom: 250 }),
  // C4 · the signal box above the gantry: its node (the final bridge) is
  // only in reach from the top of the vent's updraft — a mid-air punch.
  ledge('c-signal', 19180, 120, -160, 'ledge', { h: 40 }),
  roof('c-platform', 19850, 1750, 180, 'platform'),
]);

// ---------------------------------------------------------------------------
// Machines. Durations are ms of power (the last 600 ms flicker). `travel` is
// the ms to move fully between rest and powered.
export const MACHINES = Object.freeze([
  // A
  { id: 'a-bridge1', kind: 'bridge', x: 1500, y: 760, length: 500, dir: 1, duration: 6000, travel: 600, section: 'A' },
  { id: 'a-lift1', kind: 'lift', x: 2680, w: 220, y0: 760, y1: 400, duration: 5000, travel: 1300, section: 'A' },
  { id: 'a-lift2', kind: 'lift', x: 4480, w: 220, y0: 760, y1: 460, duration: 5000, travel: 1300, section: 'A' },
  { id: 'a-bridge2', kind: 'bridge', x: 4700, y: 460, length: 460, dir: 1, duration: 6000, travel: 600, section: 'A', mast: true },
  { id: 'a-bridge3', kind: 'bridge', x: 5980, y: 460, length: 460, dir: 1, duration: 6000, travel: 600, section: 'A' },
  { id: 'a-billboard', kind: 'billboard', x: 5880, y: 240, w: 760, h: 96, duration: 7000, travel: 260, section: 'A', text: 'NIGHT SERVICE · ALL LINES' },
  { id: 'a-fan', kind: 'fan', x: 7560, w: 280, yTop: -120, yBottom: 1260, duration: 5000, travel: 500, section: 'A' },

  // B
  { id: 'b-sign', kind: 'sign', x: 9700, y: 380, w: 200, h: 70, duration: 4000, travel: 200, section: 'B', text: 'OPEN LATE', glow: 360 },
  { id: 'b-lift1', kind: 'lift', x: 10680, w: 220, y0: 640, y1: 300, duration: 5000, travel: 1300, section: 'B' },
  { id: 'b-lift2', kind: 'lift', x: 11340, w: 200, y0: 300, y1: -60, duration: 5000, travel: 1300, section: 'B' },
  { id: 'b-bridge', kind: 'bridge', x: 11900, y: 300, length: 440, dir: 1, duration: 'hold', travel: 600, section: 'B', heldAtStart: true, heldBy: 'b-n4' },
  { id: 'b-hotel-lift', kind: 'lift', x: 12780, w: 220, y0: 300, y1: -150, duration: 6000, travel: 1500, section: 'B' },
  { id: 'b-bridge2', kind: 'bridge', x: 14560, y: 300, length: 440, dir: 1, duration: 'hold', travel: 600, section: 'B', heldAtStart: true, heldBy: 'b-n7' },
  { id: 'b-sign2', kind: 'sign', x: 15580, y: 90, w: 220, h: 70, duration: 4500, travel: 200, section: 'B', text: 'VACANCY', glow: 420 },
  { id: 'b-shutter', kind: 'shutter', x: 16228, y: 190, w: 34, h: 110, duration: 4000, travel: 450, section: 'B' },

  // C
  { id: 'c-points', kind: 'points', x: 17750, y: 520, length: 500, dir: 1, duration: 6000, travel: 700, section: 'C' },
  { id: 'c-lift', kind: 'lift', x: 18530, w: 220, y0: 520, y1: 180, duration: 5000, travel: 1300, section: 'C' },
  { id: 'c-fan', kind: 'fan', x: 18950, w: 200, yTop: -340, yBottom: 180, duration: 5000, travel: 500, section: 'C' },
  { id: 'c-drawbridge', kind: 'drawbridge', x: 19350, y: 180, length: 500, dir: 1, duration: 8000, travel: 900, section: 'C' },
].map((machine) => Object.freeze(machine)));

// ---------------------------------------------------------------------------
// Grid nodes: lamp boxes on poles or walls, each with a paper tag. x/y is the
// base (where the pole meets the roof). `cable` overrides the auto route.
export const NODES = Object.freeze([
  // A1 · the first bridge: right beside the start, the mechanic points at it.
  { id: 'a-n1', line: 'amber', machine: 'a-bridge1', x: 1400, y: 760, mount: 'pole', section: 'A' },
  // A2 · lift.
  { id: 'a-n2', line: 'teal', machine: 'a-lift1', x: 2540, y: 760, mount: 'pole', section: 'A' },
  // A3 · lift + bridge on different lines, both punched from the low roof.
  { id: 'a-n3', line: 'teal', machine: 'a-lift2', x: 4390, y: 760, mount: 'pole', section: 'A' },
  { id: 'a-n4', line: 'rose', machine: 'a-bridge2', x: 4280, y: 760, mount: 'pole', section: 'A' },
  // A4 · one amber line, two machines.
  { id: 'a-n5', line: 'amber', machine: 'a-bridge3', x: 5500, y: 460, mount: 'pole', section: 'A' },
  { id: 'a-n6', line: 'amber', machine: 'a-billboard', x: 5390, y: 460, mount: 'pole', section: 'A' },
  { id: 'a-n7', line: 'amber', machine: 'a-bridge3', x: 6590, y: 460, mount: 'pole', section: 'A' },
  // A5 · vent fan.
  { id: 'a-n8', line: 'rose', machine: 'a-fan', x: 7380, y: 260, mount: 'pole', section: 'A' },

  // B
  { id: 'b-n1', line: 'rose', machine: 'b-sign', x: 9210, y: 640, mount: 'pole', section: 'B' },
  { id: 'b-n2', line: 'amber', machine: 'b-lift1', x: 10560, y: 640, mount: 'pole', section: 'B' },
  { id: 'b-n3', line: 'rose', machine: 'b-lift2', x: 11210, y: 300, mount: 'pole', section: 'B' },
  { id: 'b-n4', line: 'teal', machine: 'b-bridge', x: 11820, y: 300, mount: 'pole', section: 'B' },
  { id: 'b-n5', line: 'teal', machine: 'b-hotel-lift', x: 12640, y: 300, mount: 'pole', section: 'B' },
  // B5 is its own district: its rose line is not the rose line of B1–B3.
  { id: 'b-n9', line: 'rose', machine: 'b-bridge2', x: 14470, y: 300, mount: 'pole', section: 'B', district: 'B5' },
  { id: 'b-n7', line: 'rose', machine: 'b-bridge2', x: 15095, y: 300, mount: 'pole', section: 'B', district: 'B5' },
  { id: 'b-n8', line: 'rose', machine: 'b-sign2', x: 15170, y: 300, mount: 'pole', section: 'B', district: 'B5' },
  { id: 'b-n6', line: 'amber', machine: 'b-shutter', x: 16090, y: 300, mount: 'pole', section: 'B' },

  // C
  { id: 'c-n1', line: 'amber', machine: 'c-points', x: 17640, y: 520, mount: 'pole', section: 'C' },
  { id: 'c-n2', line: 'amber', machine: 'c-points', x: 18320, y: 520, mount: 'pole', section: 'C' },
  { id: 'c-n3', line: 'teal', machine: 'c-lift', x: 18490, y: 520, mount: 'pole', section: 'C' },
  { id: 'c-n5', line: 'rose', machine: 'c-fan', x: 18860, y: 180, mount: 'pole', section: 'C' },
  { id: 'c-n4', line: 'amber', machine: 'c-drawbridge', x: 19250, y: -160, mount: 'pole', section: 'C' },
].map((node) => Object.freeze(node)));

// Required machines for the departure (the train remembers them in order).
export const DEPARTURE_CHAIN = Object.freeze(['c-points', 'c-lift', 'c-fan', 'c-drawbridge']);
export const DEPARTURE_BELLS = 8;

// ---------------------------------------------------------------------------
// Street-lamp checkpoints. Passing a lamp lights it; a fall returns you to
// the last lit lamp.
export const LAMPS = Object.freeze([
  { id: 'lamp-a0', x: 640, y: 760, section: 'A', spawnX: 700 },
  { id: 'lamp-a1', x: 3060, y: 400, section: 'A', spawnX: 3120 },  // after step 2
  { id: 'lamp-a2', x: 6960, y: 260, section: 'A', spawnX: 7020 },  // after step 4
  { id: 'lamp-b0', x: 8640, y: 640, section: 'B', spawnX: 8700 },  // section start
  { id: 'lamp-b1', x: 11020, y: 300, section: 'B', spawnX: 11080 }, // before the cut
  { id: 'lamp-b2', x: 13840, y: -150, section: 'B', spawnX: 13900 }, // after the hotel
  { id: 'lamp-b3', x: 15010, y: 300, section: 'B', spawnX: 15050 }, // the water tower, before the dark decks
  { id: 'lamp-c0', x: 16880, y: 520, section: 'C', spawnX: 16940 },
  { id: 'lamp-c1', x: 18360, y: 520, section: 'C', spawnX: 18280 },
  { id: 'lamp-c2', x: 18790, y: 180, section: 'C', spawnX: 18820 }, // top of the lift
].map((lamp) => Object.freeze(lamp)));

// ---------------------------------------------------------------------------
// Story props.
export const TRAIN = Object.freeze({
  // Two cars fit the rooftop terminal (-400 … 1500); the door is on the rear car.
  start: Object.freeze({ x: -380, y: 760, cars: 2 }),
  end: Object.freeze({ x: 20060, y: 180, cars: 3 }),
  // The train ahead: Mara boards it on a far track as C begins (scroll 0.7).
  ahead: Object.freeze({ x: 12420, y: 470, cars: 2, scroll: 0.7, scale: 0.55 }),
});

export const MECHANIC = Object.freeze({ x: 1130, y: 760, talkRadius: 150 });
export const HOTEL_WINDOW = Object.freeze({ x: 13420, y: -150, readRadius: 150 });
// B's visual goal: Mara stands in the lit penthouse window, seen from roof
// 10 and the hotel lift; the light goes out as Butch reaches the roof, and
// only her ticket stub is left in the glass.
export const WINDOW_SIGHTING = Object.freeze({ id: 'hotel-window', fromX: 12560, goneFeetY: -60, goneFromX: 12780 });
export const BENCH = Object.freeze({ x: 17160, y: 520, readRadius: 150 });
export const GRID_STONE = Object.freeze({ x: 11690, y: -60 });
export const DEPARTURE_TRIGGER_X = 17520;
export const BOARD_X = 20300;
// Where the train puts Butch when it remembers the route for him.
export const REMEMBER_PLACE = Object.freeze({ x: 19100, y: 180, upperFromX: 18750 });

// Mara, always one roof ahead. Each sighting is a short authored run.
export const MARA_SIGHTINGS = Object.freeze([
  Object.freeze({ id: 'first', triggerX: 1290, section: 'A', path: [[2060, 760], [2390, 760]], leap: [2770, 420], waitMs: 1800, speed: 0.3 }),
  Object.freeze({ id: 'one-roof-ahead', triggerX: 6440, altTriggerX: 6100, section: 'A', path: [[6980, 260], [7440, 260]], leap: [7780, 0], waitMs: 1600, speed: 0.32 }),
  // After the ticket stub: lightning shows her below, crossing the held
  // bridge to the water tower — the way on.
  Object.freeze({ id: 'after-window', trigger: 'card', section: 'B', path: [[14120, 300], [14520, 300]], leap: [14860, 230], waitMs: 900, speed: 0.34, flash: true }),
]);

// Neon: low saturation, amber / teal / rose only. `layer` 'mid' signs sit on
// the parallax skyline; 'near' signs hang on playfield buildings. Every sign
// dies when the blackout starts.
export const SIGNS = Object.freeze([
  { x: 330, y: 548, text: 'CITY TERMINAL', color: 'amber', layer: 'near', w: 300 },
  { x: 3260, y: 196, text: 'TICKETS', color: 'teal', layer: 'near', w: 170 },
  { x: 4000, y: 556, text: 'LAUNDRY', color: 'rose', layer: 'near', w: 170 },
  { x: 5240, y: 236, text: 'ROOMS', color: 'rose', layer: 'near', w: 140 },
  { x: 7020, y: 56, text: 'PHARMACY', color: 'teal', layer: 'near', w: 200 },
  { x: 8120, y: -44, text: 'LAST TRAM', color: 'amber', layer: 'near', w: 200 },
  { x: 13500, y: -560, text: 'HOTEL MERIDIAN', color: 'amber', layer: 'hotel', w: 520 },
  // The goal for section A: the hotel's sign far off across the roofs, on
  // the mid skyline (scroll 0.5). It dies with the rest of the city.
  { x: 4520, y: 250, text: 'HOTEL MERIDIAN', color: 'amber', layer: 'far', w: 400, scroll: 0.5 },
  { x: 17900, y: 340, text: 'EVACUATION', color: 'amber', layer: 'near', w: 280 },
  { x: 20110, y: -110, text: 'PLATFORM 2', color: 'teal', layer: 'near', w: 240 },
].map((sign) => Object.freeze(sign)));

// Platform lamps along the evacuation platform, lit as the chain fires.
export const PLATFORM_LAMPS = Object.freeze([
  Object.freeze({ x: 19960, lights: 'c-points' }),
  Object.freeze({ x: 20260, lights: 'c-lift' }),
  Object.freeze({ x: 20860, lights: 'c-fan' }),
  Object.freeze({ x: 21160, lights: 'c-drawbridge' }),
]);

// ---------------------------------------------------------------------------
// The intended route, roof to roof. `via` is 'jump' (must be comfortable for
// the controller), 'drop' (step off a higher roof), 'walk' (flush), or the
// machine that makes it possible (which must NOT be jumpable without it).
// tests/borrowedLight/level.test.mjs checks every edge against jumpArc().
export const ROUTE = Object.freeze([
  { from: 'a-terminal', to: 'a-roof1', via: 'a-bridge1' },
  { from: 'a-roof1', to: 'a-roof2', via: 'a-lift1' },
  { from: 'a-roof2', to: 'a-roof3', via: 'drop' },
  { from: 'a-roof3', to: 'a-roof4', via: 'a-lift2+a-bridge2' },
  { from: 'a-roof4', to: 'a-ac', via: 'jump' },
  { from: 'a-ac', to: 'a-stairhead', via: 'jump' },
  { from: 'a-stairhead', to: 'a-roof5', via: 'a-billboard' },
  { from: 'a-roof4', to: 'a-view', via: 'a-bridge3', deadEnd: true },
  { from: 'a-roof5', to: 'a-roof6', via: 'a-fan' },
  { from: 'a-roof6', to: 'b-roof7', via: 'drop' },
  { from: 'b-roof7', to: 'b-step1', via: 'jump' },
  { from: 'b-step1', to: 'b-step2', via: 'jump' },
  { from: 'b-step2', to: 'b-roof8', via: 'jump' },
  { from: 'b-roof8', to: 'b-roof9', via: 'b-lift1' },
  { from: 'b-roof9', to: 'b-stone-ledge', via: 'b-lift2', optional: true },
  { from: 'b-roof9', to: 'b-roof10', via: 'b-bridge' },
  { from: 'b-roof10', to: 'b-hotel', via: 'b-hotel-lift' },
  { from: 'b-hotel', to: 'b-roof11a', via: 'drop' },
  { from: 'b-roof11a', to: 'b-tower', via: 'b-bridge2' },
  { from: 'b-tower', to: 'b-deck3', via: 'jump' },
  { from: 'b-deck3', to: 'b-deck4', via: 'jump' },
  { from: 'b-deck4', to: 'b-roof11b', via: 'jump' },
  { from: 'b-roof11b', to: 'c-concourse', via: 'drop', through: 'b-shutter' },
  { from: 'c-concourse', to: 'c-yard', via: 'c-points' },
  { from: 'c-yard', to: 'c-gantry', via: 'c-lift' },
  { from: 'c-gantry', to: 'c-signal', via: 'c-fan', optional: true },
  { from: 'c-gantry', to: 'c-platform', via: 'c-drawbridge' },
].map((edge) => Object.freeze(edge)));

// Punch auto-targets the nearest node within this range of Butch's chest.
export const PUNCH_RANGE = 220;

// ---------------------------------------------------------------------------
// Helpers.

export const platformById = (id) => PLATFORMS.find((platform) => platform.id === id) ?? null;
export const machineById = (id) => MACHINES.find((machine) => machine.id === id) ?? null;
export const nodeById = (id) => NODES.find((node) => node.id === id) ?? null;
export const lampById = (id) => LAMPS.find((lamp) => lamp.id === id) ?? null;

// Where the node's lamp box sits: poles are 150 px tall.
export const NODE_POLE = 150;
export function nodeHead(node) {
  return { x: node.x, y: node.y - NODE_POLE };
}

// Where power arrives at a machine (end of its cable).
export function machineAnchor(machine) {
  switch (machine.kind) {
    case 'bridge': return { x: machine.x - machine.dir * 26, y: machine.y + 18 };
    case 'lift': return { x: machine.x + machine.w / 2, y: machine.y0 + 10 };
    case 'billboard': return { x: machine.x + 40, y: machine.y + machine.h };
    case 'fan': return { x: machine.x + machine.w / 2, y: machine.yBottom - 40 };
    case 'shutter': return { x: machine.x - 16, y: machine.y + machine.h - 10 };
    case 'points': return { x: machine.x, y: machine.y + 16 };
    case 'drawbridge': return { x: machine.x - 18, y: machine.y + 16 };
    case 'sign': return { x: machine.x, y: machine.y + machine.h / 2 };
    default: return { x: machine.x, y: machine.y };
  }
}

// The cable from a node's box down its pole, along the roof, to the machine.
// Nodes may give an explicit `cable` list of points instead.
export function cableFor(node, machine = machineById(node.machine)) {
  if (node.cable) return node.cable.map(([x, y]) => ({ x, y }));
  const head = nodeHead(node);
  const anchor = machineAnchor(machine);
  const runY = node.y - 6;
  const points = [
    { x: head.x, y: head.y + 18 },
    { x: node.x, y: runY },
  ];
  if (Math.abs(anchor.y - runY) < 8) {
    points.push({ x: anchor.x, y: anchor.y });
  } else {
    // Run along the roof to below/above the anchor, then climb to it.
    const runToX = anchor.x + (anchor.x > node.x ? -14 : 14);
    points.push({ x: runToX, y: runY });
    points.push({ x: runToX, y: anchor.y });
    points.push({ x: anchor.x, y: anchor.y });
  }
  return points;
}

// World-space rectangle a machine occupies when powered (Listen ghost,
// camera framing).
export function machineBounds(machine, level = 1) {
  switch (machine.kind) {
    case 'bridge': {
      const len = machine.length * level;
      return { x: machine.dir > 0 ? machine.x : machine.x - len, y: machine.y, w: Math.max(1, len), h: 22 };
    }
    case 'lift': {
      const y = machine.y0 + (machine.y1 - machine.y0) * level;
      return { x: machine.x, y, w: machine.w, h: 26 };
    }
    case 'billboard': return { x: machine.x, y: machine.y, w: machine.w, h: machine.h };
    case 'fan': return { x: machine.x, y: machine.yTop, w: machine.w, h: machine.yBottom - machine.yTop };
    case 'shutter': return { x: machine.x, y: machine.y, w: machine.w, h: machine.h * (1 - level) };
    case 'points':
    case 'drawbridge': return { x: machine.dir > 0 ? machine.x : machine.x - machine.length, y: machine.y, w: machine.length, h: 22 };
    case 'sign': return { x: machine.x - machine.w / 2, y: machine.y, w: machine.w, h: machine.h };
    default: return { x: machine.x, y: machine.y, w: 10, h: 10 };
  }
}

// Which save checkpoint a section maps to, and back.
export const SECTION_CHECKPOINTS = Object.freeze({ A: 'chapter-2-start', B: 'chapter-2-midpoint', C: 'chapter-2-platform' });

// The start section for this page load.
// - In a dev build, `?section=A|B|C` is honoured as-is (QA route).
// - In production the page is reached from a saved checkpoint whose route
//   carries `?section=`, but a hand-edited URL must not skip ahead: the
//   section is honoured only when the active save has unlocked it.
export function resolveStartSection({ search = '', devMode = false, unlocked = [] } = {}) {
  const params = new URLSearchParams(search);
  const requested = String(params.get('section') ?? '').toUpperCase();
  if (!SECTION_ORDER.includes(requested)) return 'A';
  if (devMode) return requested;
  return unlocked.includes(SECTION_CHECKPOINTS[requested]) ? requested : 'A';
}

export const circuitKey = (district, line) => `${district}:${line}`;
export const districtOf = (node) => node.district ?? node.section;

// The tuple the timetable model is built from.
export function timetableDefinition() {
  return {
    // Each section is its own district: its lines are its own circuits.
    nodes: NODES.map((node) => ({ id: node.id, line: node.line, machine: node.machine, circuit: circuitKey(districtOf(node), node.line) })),
    machines: MACHINES.map(({ id, kind, duration, travel }) => ({ id, kind, duration, travel })),
  };
}
