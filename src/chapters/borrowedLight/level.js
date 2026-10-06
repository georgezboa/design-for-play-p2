// Chapter 2 · BORROWED LIGHT — level data (v2, round 3).
//
// Everything the scene builds comes from here: roofs, grid nodes, machines,
// cables, lamp checkpoints, section triggers and story props. Pure data plus
// a few pure helpers, so tests can check geometry against the jump arc.
//
// Design numbers (src/chapters/borrowedLight/controller.js, jumpArc()):
//   max run 420 px/s · apex 180 px · air time 0.73 s · flat range 308 px
//   comfortable gap ≤ 231 px · comfortable step-up ≤ 144 px
//   → every "walk/jump" gap here is ≤ 200 px with ≤ 100 px rise,
//   → every "machine only" gap is out of jump reach (+40 px slack).
// Timetable: bell every 4 s (2.5 s in the chase); machine durations
// 3.6–8 s; bridges extend in 0.6 s, lifts travel in 1.3–1.5 s, so a machine
// that fires as you arrive is always ridable before its 0.6 s flicker.
//
// v2 adds, each taught alone, then combined, then twisted (spec §5):
//   A6–A8  two-phase bells (I / II), ending in the Mara chase (quick bell);
//   B5–B7  BORROW: carry a lit machine's light to a dead node;
//   C3     the counterweight walkway, against the departure countdown;
//   C4     TWO WEIGHTS (round 3): a ledge the city holds up drops on its
//          brake, then a second walkway rides up — two brakes on one line
//          that rings only on bell I.
// Sections B and C are authored in their v1 coordinates and shifted by the
// room the new A and B content takes (B(x), C(x)), so every v1 relation
// between their roofs, nodes and machines is kept exactly.

const DX_B = 5960; // A grew from 8440 to 14400 px
const DX_C = 7500; // … and B grew by 1540 px (B5–B7)
const DX_D = 1440; // C4 sits between the C3 walkway and the platform
const B = (x) => x + DX_B;
const C = (x) => x + DX_C;
// The evacuation platform and everything on it, after C4.
const D = (x) => C(x + DX_D);

export const WORLD = Object.freeze({
  width: D(21600),
  top: -760,
  bottom: 1480,
  killY: 990,       // below every roof: Butch is falling into the mist → respawn
  mistY: 1160,      // where the mist starts to thicken (visual)
  view: { w: 1920, h: 1080 },
});

export const SECTIONS = Object.freeze({
  A: Object.freeze({ id: 'A', name: 'RAIN ROOFTOPS', from: 0, to: B(8440), checkpoint: 'chapter-2-start', spawn: 'lamp-a0' }),
  B: Object.freeze({ id: 'B', name: 'BLACKOUT', from: B(8440), to: C(16760), checkpoint: 'chapter-2-midpoint', spawn: 'lamp-b0' }),
  C: Object.freeze({ id: 'C', name: 'EVACUATION PLATFORM', from: C(16760), to: D(21600), checkpoint: 'chapter-2-platform', spawn: 'lamp-c0' }),
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
// (a lit machine, a node's afterglow or the light Butch carries) falls on
// them. style picks the procedural facade (see art/paint.js).
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
  roof('a-roof6', 7900, 1100, 160, 'tenement'),                 //    top of the updraft · 6: TWO BELLS
  roof('a-roof7', 9460, 800, 160, 'brick'),                     //    across the II bridge
  roof('a-roof8', 10260, 940, 520, 'office'),                   // 7: I THEN II (lift, then bridge)
  roof('a-roof9', 11660, 700, 220, 'tenement'),                 // 8: THE CHASE · the quick bell
  roof('a-roof10', 13600, 800, 220, 'brick'),                   //    Mara's roof; she drops into B

  // ---- B · BLACKOUT ----------------------------------------------------
  roof('b-roof7', B(8440), 860, 640, 'brick'),                  // section start, lamp
  // Two wide, dark scaffold decks: any full running jump from the right half
  // of one lands on the next. The challenge is seeing them, not precision.
  ledge('b-step1', B(9407), 240, 620, 'ledge', { hidden: true, h: 40 }),
  ledge('b-step2', B(9754), 240, 600, 'ledge', { hidden: true, h: 40 }),
  roof('b-roof8', B(10100), 800, 640, 'tenement'),
  roof('b-roof9', B(10900), 1000, 300, 'office'),
  ledge('b-stone-ledge', B(11560), 220, -60, 'ledge', { hidden: true, h: 40 }),
  roof('b-roof10', B(12340), 660, 300, 'brick'),
  roof('b-hotel', B(13000), 1000, -150, 'hotel'),
  // B5 · BORROW (teach): the lantern's light, carried to the dead bridge.
  roof('b-roof11a', B(14000), 560, 300, 'tenement'),
  roof('b-tower', B(15000), 200, 300, 'watertower'),
  // B6 · combine: the dark decks stand only in the light Butch carries.
  ledge('b-deck3', B(15270), 300, 320, 'ledge', { hidden: true, h: 40 }),
  ledge('b-deck4', B(15640), 300, 320, 'ledge', { hidden: true, h: 40 }),
  // B7 · twist: power the lift, ride it, take its light back, give it on.
  roof('b-roof11b', B(16010), 760, 300, 'tenement'),
  roof('b-roof12', B(16770), 520, -40, 'office'),
  roof('b-roof13', B(17750), 550, -40, 'brick'),

  // ---- C · EVACUATION PLATFORM ----------------------------------------
  roof('c-concourse', C(16760), 990, 520, 'concourse'),
  roof('c-yard', C(18250), 500, 520, 'concourse'),
  roof('c-gantry', C(18750), 600, 180, 'gantry', { bottom: 250 }),
  // C3's walkway lands on the signal deck; C4 · TWO WEIGHTS starts here.
  roof('c-signal', C(19950), 300, 180, 'gantry', { bottom: 250 }),
  roof('c-landing', C(20630), 160, 180, 'gantry', { bottom: 250 }),
  roof('c-platform', D(19950), 1650, 180, 'platform'),
]);

// ---------------------------------------------------------------------------
// Machines. Durations are ms of power (the last 600 ms flicker). `travel` is
// the ms to move fully between rest and powered. `borrowable` machines give
// up their light to Butch's lamp (section B).
export const MACHINES = Object.freeze([
  // A
  { id: 'a-bridge1', kind: 'bridge', x: 1500, y: 760, length: 500, dir: 1, duration: 6000, travel: 600, section: 'A' },
  { id: 'a-lift1', kind: 'lift', x: 2680, w: 220, y0: 760, y1: 400, duration: 5000, travel: 1300, section: 'A' },
  { id: 'a-lift2', kind: 'lift', x: 4480, w: 220, y0: 760, y1: 460, duration: 5000, travel: 1300, section: 'A' },
  { id: 'a-bridge2', kind: 'bridge', x: 4700, y: 460, length: 460, dir: 1, duration: 6000, travel: 600, section: 'A', mast: true },
  { id: 'a-bridge3', kind: 'bridge', x: 5980, y: 460, length: 460, dir: 1, duration: 6000, travel: 600, section: 'A' },
  { id: 'a-billboard', kind: 'billboard', x: 5880, y: 240, w: 760, h: 96, duration: 7000, travel: 260, section: 'A', text: 'NIGHT SERVICE · ALL LINES' },
  { id: 'a-fan', kind: 'fan', x: 7560, w: 280, yTop: -120, yBottom: 1260, duration: 5000, travel: 500, section: 'A' },
  // A6 · a bridge on a line that rings only on bell II.
  { id: 'a-bridge4', kind: 'bridge', x: 9000, y: 160, length: 460, dir: 1, duration: 6000, travel: 600, section: 'A' },
  // A7 · lift on I, bridge on II: up on the first bell, across on the next.
  { id: 'a-lift3', kind: 'lift', x: 10980, w: 220, y0: 520, y1: 220, duration: 6000, travel: 1300, section: 'A' },
  { id: 'a-bridge5', kind: 'bridge', x: 11200, y: 220, length: 460, dir: 1, duration: 6000, travel: 600, section: 'A', mast: true },
  // A8 · window cradles over the gap, lowered on I, II, I (the chase).
  { id: 'a-cradle1', kind: 'cradle', x: 12400, w: 240, y: 220, hoist: 150, duration: 3600, travel: 450, section: 'A', postX: 12336 },
  { id: 'a-cradle2', kind: 'cradle', x: 12800, w: 240, y: 220, hoist: 150, duration: 3600, travel: 450, section: 'A', postX: 12342 },
  { id: 'a-cradle3', kind: 'cradle', x: 13200, w: 240, y: 220, hoist: 150, duration: 3600, travel: 450, section: 'A', postX: 12348 },

  // B
  { id: 'b-sign', kind: 'sign', x: B(9700), y: 380, w: 200, h: 70, duration: 4000, travel: 200, section: 'B', text: 'OPEN LATE', glow: 360 },
  { id: 'b-lift1', kind: 'lift', x: B(10680), w: 220, y0: 640, y1: 300, duration: 5000, travel: 1300, section: 'B' },
  { id: 'b-lift2', kind: 'lift', x: B(11340), w: 200, y0: 300, y1: -60, duration: 5000, travel: 1300, section: 'B' },
  { id: 'b-bridge', kind: 'bridge', x: B(11900), y: 300, length: 440, dir: 1, duration: 'hold', travel: 600, section: 'B', heldAtStart: true, heldBy: 'b-n4', holdName: 'THE BRIDGE', holdTag: 'THE TEAL TAG WHERE THE BRIDGE STARTS' },
  { id: 'b-hotel-lift', kind: 'lift', x: B(12780), w: 220, y0: 300, y1: -150, duration: 6000, travel: 1500, section: 'B' },
  // B5–B7 · lanterns the city still holds lit, and machines with dead nodes.
  { id: 'b-lantern1', kind: 'lantern', x: B(14300), y: 300, h: 200, duration: 'hold', travel: 300, section: 'B', heldAtStart: true, heldBy: 'b-nL1', borrowable: true },
  { id: 'b-bridge2', kind: 'bridge', x: B(14560), y: 300, length: 440, dir: 1, duration: 6000, travel: 600, section: 'B', borrowable: true },
  { id: 'b-lantern2', kind: 'lantern', x: B(16320), y: 300, h: 200, duration: 'hold', travel: 300, section: 'B', heldAtStart: true, heldBy: 'b-nL2', borrowable: true },
  { id: 'b-lift3', kind: 'lift', x: B(16550), w: 220, y0: 300, y1: -40, duration: 6000, travel: 1400, section: 'B', borrowable: true },
  { id: 'b-bridge3', kind: 'bridge', x: B(17290), y: -40, length: 460, dir: 1, duration: 6000, travel: 600, section: 'B', borrowable: true },

  // C
  { id: 'c-points', kind: 'points', x: C(17750), y: 520, length: 500, dir: 1, duration: 6000, travel: 700, section: 'C' },
  { id: 'c-lift', kind: 'lift', x: C(18530), w: 220, y0: 520, y1: 180, duration: 5000, travel: 1300, section: 'C' },
  // C3 · the counterweight walkway: cage A (beside the gantry) and the long
  // walkway cage B (beside the platform) hang from one wheel. While the brake
  // is released, the cage carrying Butch sinks and the other rises — B on a
  // longer drum, so Butch's 110 px ride brings the walkway up 360 px, flush
  // with the platform. The brake rings on the bell, like every machine.
  {
    id: 'c-weights', kind: 'counterweight', section: 'C', duration: 3000, travel: 2400,
    x: C(19370), w: 220, yA0: 180, yA1: 290,
    xB: C(19610), wB: 320, yB0: 540, yB1: 180,
  },
  // C4 · TWO WEIGHTS. The drop ledge: the city holds it up (level 1) over
  // the gap; it is heavier than its iron counter-box, so released it sinks
  // on its own (ballast 'b') into line with the signal deck and the landing.
  // Only the ledge (cage b) can be stood on.
  {
    id: 'c-drop', kind: 'counterweight', section: 'C', duration: 3000, travel: 1600, ballast: 'b', startLevel: 1, riders: ['b'], style: 'ledge',
    x: C(20190), w: 46, yA0: 300, yA1: 630,
    xB: C(20270), wB: 340, yB0: 180, yB1: -150,
    brakeAt: { x: C(20226), y: 174 },
  },
  // … then the second walkway, ridden up from cage A2 beside the landing.
  {
    id: 'c-weights2', kind: 'counterweight', section: 'C', duration: 3000, travel: 2400,
    x: C(20810), w: 220, yA0: 180, yA1: 290,
    xB: C(21050), wB: 320, yB0: 540, yB1: 180,
  },
].map((machine) => Object.freeze(machine)));

// ---------------------------------------------------------------------------
// Grid nodes: lamp boxes on poles or walls, each with a paper tag. x/y is the
// base (where the pole meets the roof). `cable` overrides the auto route.
// `phase` 'odd' rings on bells I, III…; 'even' on II, IV… `dead` nodes have
// no line of their own: only borrowed light (E) powers them.
export const NODES = Object.freeze([
  // A1 · the first bridge: right beside the start, the mechanic points at it.
  { id: 'a-n1', line: 'amber', machine: 'a-bridge1', x: 1400, y: 760, mount: 'pole', section: 'A' },
  // A2 · lift.
  { id: 'a-n2', line: 'teal', machine: 'a-lift1', x: 2540, y: 760, mount: 'pole', section: 'A' },
  // A3 · lift + bridge on different lines, both punched from the low roof.
  // `noCatch`: half of a pair meant for one bell never catches the bell
  // just gone (round 3, R3-4: a caught bridge was gone before the lift).
  { id: 'a-n3', line: 'teal', machine: 'a-lift2', x: 4390, y: 760, mount: 'pole', section: 'A', noCatch: true },
  { id: 'a-n4', line: 'rose', machine: 'a-bridge2', x: 4280, y: 760, mount: 'pole', section: 'A', noCatch: true },
  // A4 · one amber line, two machines.
  { id: 'a-n5', line: 'amber', machine: 'a-bridge3', x: 5500, y: 460, mount: 'pole', section: 'A' },
  { id: 'a-n6', line: 'amber', machine: 'a-billboard', x: 5390, y: 460, mount: 'pole', section: 'A' },
  { id: 'a-n7', line: 'amber', machine: 'a-bridge3', x: 6590, y: 460, mount: 'pole', section: 'A' },
  // A5 · vent fan.
  { id: 'a-n8', line: 'rose', machine: 'a-fan', x: 7380, y: 260, mount: 'pole', section: 'A' },
  // A6 · TWO BELLS: rose rings on II.
  { id: 'a-n9', line: 'rose', machine: 'a-bridge4', x: 8860, y: 160, mount: 'pole', section: 'A', district: 'A6', phase: 'even' },
  // A7 · I THEN II: punch both while the next bell is I.
  { id: 'a-n11', line: 'amber', machine: 'a-bridge5', x: 10620, y: 520, mount: 'pole', section: 'A', district: 'A7', phase: 'even', noCatch: true },
  { id: 'a-n10', line: 'teal', machine: 'a-lift3', x: 10800, y: 520, mount: 'pole', section: 'A', district: 'A7', phase: 'odd', noCatch: true },
  // A8 · THE CHASE: I, II, I. The last cradle's node stands at the roof edge,
  // in reach from the first cradle: punch it once the first bell has rung.
  { id: 'a-n12', line: 'amber', machine: 'a-cradle1', x: 12060, y: 220, mount: 'pole', section: 'A', district: 'A8', phase: 'odd', noCatch: true },
  { id: 'a-n13', line: 'teal', machine: 'a-cradle2', x: 12160, y: 220, mount: 'pole', section: 'A', district: 'A8', phase: 'even', noCatch: true },
  { id: 'a-n14', line: 'rose', machine: 'a-cradle3', x: 12300, y: 220, mount: 'pole', section: 'A', district: 'A8', phase: 'odd', noCatch: true },

  // B
  { id: 'b-n1', line: 'rose', machine: 'b-sign', x: B(9210), y: 640, mount: 'pole', section: 'B' },
  { id: 'b-n2', line: 'amber', machine: 'b-lift1', x: B(10560), y: 640, mount: 'pole', section: 'B' },
  { id: 'b-n3', line: 'rose', machine: 'b-lift2', x: B(11210), y: 300, mount: 'pole', section: 'B' },
  { id: 'b-n4', line: 'teal', machine: 'b-bridge', x: B(11820), y: 300, mount: 'pole', section: 'B' },
  { id: 'b-n5', line: 'teal', machine: 'b-hotel-lift', x: B(12640), y: 300, mount: 'pole', section: 'B' },
  // B5 · the lantern, and the dead bridge to the water tower.
  { id: 'b-nL1', line: 'amber', machine: 'b-lantern1', x: B(14230), y: 300, mount: 'pole', section: 'B', dead: true },
  { id: 'b-n9', line: 'rose', machine: 'b-bridge2', x: B(14470), y: 300, mount: 'pole', section: 'B', dead: true },
  // B6 · the bridge's far node on the tower: take the light back out of it.
  { id: 'b-n7', line: 'rose', machine: 'b-bridge2', x: B(15095), y: 300, mount: 'pole', section: 'B', dead: true },
  // B7 · a second lantern (for a respawn), the dead lift and the dead bridge.
  { id: 'b-nL2', line: 'amber', machine: 'b-lantern2', x: B(16240), y: 300, mount: 'pole', section: 'B', dead: true },
  { id: 'b-n10', line: 'teal', machine: 'b-lift3', x: B(16470), y: 300, mount: 'pole', section: 'B', dead: true },
  { id: 'b-n11', line: 'teal', machine: 'b-lift3', x: B(16840), y: -40, mount: 'pole', section: 'B', dead: true },
  { id: 'b-n12', line: 'rose', machine: 'b-bridge3', x: B(17200), y: -40, mount: 'pole', section: 'B', dead: true },

  // C
  { id: 'c-n1', line: 'amber', machine: 'c-points', x: C(17640), y: 520, mount: 'pole', section: 'C' },
  { id: 'c-n2', line: 'amber', machine: 'c-points', x: C(18320), y: 520, mount: 'pole', section: 'C' },
  { id: 'c-n3', line: 'teal', machine: 'c-lift', x: C(18490), y: 520, mount: 'pole', section: 'C' },
  // C3 · the brake shares the lift's teal line: it waits for the lift.
  { id: 'c-n5', line: 'teal', machine: 'c-weights', x: C(19300), y: 180, mount: 'pole', section: 'C' },
  // C4 · two brakes on one rose line that rings only on bell I: drop the
  // ledge from the signal deck, then ride cage A2 from the landing. One
  // line, one moment: they cannot both be released on the same bell.
  { id: 'c-n7', line: 'rose', machine: 'c-drop', x: C(20140), y: 180, mount: 'pole', section: 'C', district: 'C4', phase: 'odd' },
  { id: 'c-n6', line: 'rose', machine: 'c-weights2', x: C(20740), y: 180, mount: 'pole', section: 'C', district: 'C4', phase: 'odd' },
].map((node) => Object.freeze(node)));

// Required machines for the departure (the train remembers them in order).
export const DEPARTURE_CHAIN = Object.freeze(['c-points', 'c-lift', 'c-weights', 'c-drop', 'c-weights2']);
// Tuned so a first run (a wasted bell or two in C3 and C4) makes it with
// about three bells to spare and a clean run with five (round 3: C used to
// leave nine of twelve; tests/borrowedLight/level.test.mjs, solveC).
export const DEPARTURE_BELLS = 12;

// The chase (A8): from Mara's first look back until Butch lands on her roof,
// the city's bell quickens.
export const CHASE = Object.freeze({ fromX: 11680, toX: 13600, bellMs: 2500, section: 'A' });

// ---------------------------------------------------------------------------
// Street-lamp checkpoints. Passing a lamp lights it; a fall returns you to
// the last lit lamp. v2: one before and after every puzzle room, so no fall
// costs more than ~20 s of replay (tests/borrowedLight/level.test.mjs).
export const LAMPS = Object.freeze([
  { id: 'lamp-a0', x: 640, y: 760, section: 'A', spawnX: 700 },
  { id: 'lamp-a1', x: 3060, y: 400, section: 'A', spawnX: 3120 },     // after A2
  { id: 'lamp-a2', x: 3780, y: 760, section: 'A', spawnX: 3840 },     // before A3
  { id: 'lamp-a3', x: 5220, y: 460, section: 'A', spawnX: 5270 },     // after A3, before A4
  { id: 'lamp-a4', x: 6960, y: 260, section: 'A', spawnX: 7020 },     // after A4, before A5
  { id: 'lamp-a5', x: 7990, y: 160, section: 'A', spawnX: 8050 },     // after A5, before A6
  { id: 'lamp-a6', x: 10330, y: 520, section: 'A', spawnX: 10390 },   // after A6, before A7
  { id: 'lamp-a7', x: 11720, y: 220, section: 'A', spawnX: 11780 },   // after A7, before the chase
  { id: 'lamp-a8', x: 13680, y: 220, section: 'A', spawnX: 13740 },   // after the chase
  { id: 'lamp-b0', x: B(8640), y: 640, section: 'B', spawnX: B(8700) },  // section start
  { id: 'lamp-b1', x: B(10160), y: 640, section: 'B', spawnX: B(10220) }, // after the dark decks
  { id: 'lamp-b2', x: B(11020), y: 300, section: 'B', spawnX: B(11080) }, // before the cut
  { id: 'lamp-b3', x: B(13840), y: -150, section: 'B', spawnX: B(13900) }, // after the hotel
  { id: 'lamp-b4', x: B(14060), y: 300, section: 'B', spawnX: B(14120) }, // the first lantern (B5, B6)
  { id: 'lamp-b5', x: B(16060), y: 300, section: 'B', spawnX: B(16120) }, // the second lantern (B7)
  { id: 'lamp-c0', x: C(16880), y: 520, section: 'C', spawnX: C(16940) },
  { id: 'lamp-c1', x: C(18360), y: 520, section: 'C', spawnX: C(18280) },
  { id: 'lamp-c2', x: C(18790), y: 180, section: 'C', spawnX: C(18820) }, // top of the lift
  { id: 'lamp-c3', x: C(19970), y: 180, section: 'C', spawnX: C(20010) }, // the signal deck, before C4
].map((lamp) => Object.freeze(lamp)));

// Which machines a respawn at a lamp puts back at rest (the counterweight a
// fall left at the bottom of its run).
// The drop ledge stays dropped: once down it only ever helps.
export const RESET_ON_RESPAWN = Object.freeze({ 'lamp-c3': ['c-weights2'], 'lamp-c2': ['c-weights'], 'lamp-c1': ['c-weights'], 'lamp-c0': ['c-weights'] });
// … and which machines the city holds open again (the hotel room starts over
// with its bridge held, ready to be cut).
export const REHOLD_ON_RESPAWN = Object.freeze({ 'lamp-b2': Object.freeze(['b-bridge']) });

// ---------------------------------------------------------------------------
// Story props.
export const TRAIN = Object.freeze({
  // Two cars fit the rooftop terminal (-400 … 1500); the door is on the rear car.
  start: Object.freeze({ x: -380, y: 760, cars: 2 }),
  end: Object.freeze({ x: D(20060), y: 180, cars: 3 }),
  // The train ahead: Mara boards it on a far track as C begins (scroll 0.7):
  // placed so it stands in the same part of the screen at C's first lamp.
  ahead: Object.freeze({ x: 1080 + 0.7 * (C(16940) + 220 - 960), y: 470, cars: 2, scroll: 0.7, scale: 0.55 }),
});

export const MECHANIC = Object.freeze({ x: 1130, y: 760, talkRadius: 150 });
export const HOTEL_WINDOW = Object.freeze({ x: B(13420), y: -150, readRadius: 150 });
// B's visual goal: Mara stands in the lit penthouse window, seen from roof
// 10 and the hotel lift; the light goes out as Butch reaches the roof, and
// only her ticket stub is left in the glass.
export const WINDOW_SIGHTING = Object.freeze({ id: 'hotel-window', fromX: B(12560), goneFeetY: -60, goneFromX: B(12780) });
export const BENCH = Object.freeze({ x: C(17160), y: 520, readRadius: 150 });
export const GRID_STONE = Object.freeze({ x: B(11690), y: -60 });
export const DEPARTURE_TRIGGER_X = C(17520);
export const BOARD_X = D(20300);
// Where the train puts Butch when it remembers the route for him.
export const REMEMBER_PLACE = Object.freeze({ x: D(20020), y: 180, upperFromX: D(19950) });

// Mara, always one roof ahead. Each sighting is a short authored run.
// `waitForX`: she stands and looks back until Butch gets that close.
export const MARA_SIGHTINGS = Object.freeze([
  Object.freeze({ id: 'first', triggerX: 1290, section: 'A', path: [[2060, 760], [2390, 760]], leap: [2770, 420], waitMs: 1800, speed: 0.3 }),
  Object.freeze({ id: 'one-roof-ahead', triggerX: 6440, altTriggerX: 6100, section: 'A', path: [[6980, 260], [7440, 260]], leap: [7780, 0], waitMs: 1600, speed: 0.32 }),
  // The chase: she waits on the far roof until Butch is on the last cradle.
  // Alpha r4: she waits deeper on that roof and runs off it before Butch can
  // land beside her (she leaves as he comes within MARA_FLEE_PX); he calls
  // after her.
  Object.freeze({ id: 'chase', triggerX: 11700, section: 'A', path: [[13940, 220], [14330, 220]], leap: [14720, 640], waitForX: 13180, waitMs: 200, speed: 0.42, call: Object.freeze({ speaker: 'BUTCH', text: 'Wait—!' }) }),
  // After the ticket stub: lightning shows her below, crossing to the water
  // tower — the way on.
  Object.freeze({ id: 'after-window', trigger: 'card', section: 'B', path: [[B(14120), 300], [B(14520), 300]], leap: [B(14860), 230], waitMs: 900, speed: 0.34, flash: true }),
]);

// Neon: low saturation, amber / teal / rose only. `layer` 'mid' signs sit on
// the parallax skyline; 'near' signs hang on playfield buildings. Every sign
// dies when the blackout starts. Alpha r4: no lamp, node pole or canopy
// column stands in front of a board (ROOMS, PHARMACY and PLATFORM 2 had a
// pole through their letters; tests/borrowedLight/alphaRound4.test.mjs).
// A sign's board hangs 30 px below its y (art/paint.js paintSign pads it).
export const SIGNS = Object.freeze([
  { x: 330, y: 548, text: 'CITY TERMINAL', color: 'amber', layer: 'near', w: 300 },
  { x: 3260, y: 196, text: 'TICKETS', color: 'teal', layer: 'near', w: 170 },
  { x: 4000, y: 556, text: 'LAUNDRY', color: 'rose', layer: 'near', w: 170 },
  { x: 5240, y: 170, text: 'ROOMS', color: 'rose', layer: 'near', w: 140 },
  { x: 7020, y: -30, text: 'PHARMACY', color: 'teal', layer: 'near', w: 200 },
  { x: 8150, y: -44, text: 'LAST TRAM', color: 'amber', layer: 'near', w: 200 },
  { x: 9900, y: -60, text: 'WATCHES', color: 'teal', layer: 'near', w: 180 },
  { x: 10480, y: 300, text: 'TAILOR', color: 'rose', layer: 'near', w: 150 },
  { x: 13960, y: 0, text: 'DANCING', color: 'amber', layer: 'near', w: 190 },
  { x: B(13500), y: -560, text: 'HOTEL MERIDIAN', color: 'amber', layer: 'hotel', w: 520 },
  // The goal for section A: the hotel's sign far off across the roofs, on
  // the mid skyline (scroll 0.5). It dies with the rest of the city.
  { x: 4520, y: 250, text: 'HOTEL MERIDIAN', color: 'amber', layer: 'far', w: 400, scroll: 0.5 },
  { x: C(17900), y: 340, text: 'EVACUATION', color: 'amber', layer: 'near', w: 280 },
  { x: D(20110), y: -200, text: 'PLATFORM 2', color: 'teal', layer: 'near', w: 240 },
].map((sign) => Object.freeze(sign)));

// Platform lamps along the evacuation platform, lit as the chain fires.
export const PLATFORM_LAMPS = Object.freeze([
  Object.freeze({ x: D(20060), lights: 'c-points' }),
  Object.freeze({ x: D(20260), lights: 'c-lift' }),
  Object.freeze({ x: D(20560), lights: 'c-weights' }),
  Object.freeze({ x: D(20860), lights: 'c-drop' }),
  Object.freeze({ x: D(21160), lights: 'c-weights2' }),
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
  { from: 'a-roof6', to: 'a-roof7', via: 'a-bridge4' },
  { from: 'a-roof7', to: 'a-roof8', via: 'drop' },
  { from: 'a-roof8', to: 'a-roof9', via: 'a-lift3+a-bridge5' },
  { from: 'a-roof9', to: 'a-roof10', via: 'a-cradle1+a-cradle2+a-cradle3' },
  { from: 'a-roof10', to: 'b-roof7', via: 'drop' },
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
  { from: 'b-roof11b', to: 'b-roof12', via: 'b-lift3' },
  { from: 'b-roof12', to: 'b-roof13', via: 'b-bridge3' },
  { from: 'b-roof13', to: 'c-concourse', via: 'drop' },
  { from: 'c-concourse', to: 'c-yard', via: 'c-points' },
  { from: 'c-yard', to: 'c-gantry', via: 'c-lift' },
  { from: 'c-gantry', to: 'c-signal', via: 'c-weights' },
  { from: 'c-signal', to: 'c-landing', via: 'c-drop' },
  { from: 'c-landing', to: 'c-platform', via: 'c-weights2' },
].map((edge) => Object.freeze(edge)));

// A8 · "PUNCH THE LAST POLE FROM HERE": the spot on cradle 1 the tag points
// at. Butch standing there (feet on the lowered cradle) has the last pole in
// reach (tests/borrowedLight/level.test.mjs checks every "from here" spot).
export const FROM_HERE = Object.freeze([
  Object.freeze({ id: 'a8-last-pole', node: 'a-n14', on: 'a-cradle1', x: 12445 }),
]);

// Punch auto-targets the nearest node within this range of Butch's chest
// (targeting.js picks it, sticky between near poles).
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

// The counterweight's two cages at a level (0 = rest: A up, B down; for
// the drop ledge, rest is the ledge down in line and its box up).
export function cagesAt(machine, level) {
  const k = Math.max(0, Math.min(1, level));
  return {
    a: { x: machine.x, w: machine.w, y: machine.yA0 + (machine.yA1 - machine.yA0) * k },
    b: { x: machine.xB, w: machine.wB, y: machine.yB0 + (machine.yB1 - machine.yB0) * k },
  };
}

// The tops Butch can stand on, for a machine at a level: [{ x0, x1, y }].
export function surfacesOf(machine, level) {
  switch (machine.kind) {
    case 'bridge': {
      const len = machine.length * level;
      if (len <= 8) return [];
      return [{ x0: machine.dir > 0 ? machine.x : machine.x - len, x1: machine.dir > 0 ? machine.x + len : machine.x, y: machine.y }];
    }
    case 'lift': {
      const y = machine.y0 + (machine.y1 - machine.y0) * level;
      return [{ x0: machine.x, x1: machine.x + machine.w, y }];
    }
    case 'billboard':
    case 'cradle':
    case 'points':
    case 'drawbridge': {
      const b = machineBounds(machine, level);
      return [{ x0: b.x, x1: b.x + b.w, y: b.y }];
    }
    case 'counterweight': {
      const cages = cagesAt(machine, level);
      return (machine.riders ?? ['a', 'b']).map((side) => ({ x0: cages[side].x, x1: cages[side].x + cages[side].w, y: cages[side].y, cage: side }));
    }
    default: return [];
  }
}

// Is Butch (feet at x, y) standing on this machine? His body is 40 px wide:
// with his centre a few px past the end he is still held by the roof.
// `above`: also count him this far up in the air over it (mid-jump).
export function standsOn(machine, level, feetX, feetY, { slack = 4, tol = 10, above = 0 } = {}) {
  return surfacesOf(machine, level).some((s) => feetX >= s.x0 - slack && feetX <= s.x1 + slack
    && feetY >= s.y - Math.max(tol, above) && feetY <= s.y + tol);
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
    // The cradles' winch cables come down one post at the roof edge.
    case 'cradle': return { x: machine.postX, y: machine.y - 60 };
    case 'lantern': return { x: machine.x - 8, y: machine.y - 6 };
    case 'counterweight': return machine.brakeAt ? { ...machine.brakeAt } : { x: machine.x - 34, y: machine.yA0 - 6 };
    default: return { x: machine.x, y: machine.y };
  }
}

// The cable from a node's box down its pole, along the roof, to the machine.
// Nodes may give an explicit `cable` list of points instead.
export function cableFor(node, machine = machineById(node.machine)) {
  if (node.cable) return node.cable.map(([x, y]) => ({ x, y }));
  const head = nodeHead(node);
  const anchor = machineAnchor(machine);
  // A lift's upper node feeds the car from the top of its shaft.
  if (machine.kind === 'lift' && Math.abs(node.y - machine.y1) < 1) {
    const top = { x: machine.x + machine.w / 2, y: machine.y1 - 86 };
    return [{ x: head.x, y: head.y + 18 }, { x: node.x, y: node.y - 6 }, { x: machine.x + machine.w + 6, y: node.y - 6 }, { x: machine.x + machine.w + 6, y: top.y }, top];
  }
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
    case 'cradle': return { x: machine.x, y: machine.y - machine.hoist * (1 - level), w: machine.w, h: 24 };
    case 'lantern': return { x: machine.x - 24, y: machine.y - machine.h - 24, w: 48, h: 56 };
    case 'counterweight': {
      const { a, b } = cagesAt(machine, level);
      const y = Math.min(a.y, b.y);
      return { x: a.x, y, w: b.x + b.w - a.x, h: Math.max(a.y, b.y) + 26 - y };
    }
    default: return { x: machine.x, y: machine.y, w: 10, h: 10 };
  }
}

// The score per section, played through the shared music director
// (src/shared/musicDirector.js) on arrival: borrowedLight-main.js asks for
// it before the scene has even built, so it starts as soon as the browser
// allows. The blackout (B) is rain only: the city took its light back.
export const SECTION_MUSIC = Object.freeze({
  A: Object.freeze({ id: 'chapter-two-borrowed-light', src: 'assets/music/ch2/2.1_borrowed_light.mp3', volume: 0.26, fade: 4, loop: true }),
  B: null,
  C: Object.freeze({ id: 'chapter-two-platform', src: 'assets/music/ch1/1.2_train_resonance.mp3', volume: 0.3, fade: 4, loop: true }),
});

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

// Dev QA only: `?lamp=<id>` starts at a lamp inside the start section
// (e.g. lamp-a7 for the chase). Unknown or other-section lamps are ignored.
export function resolveStartLamp({ search = '', devMode = false, section = 'A' } = {}) {
  if (!devMode) return null;
  const id = new URLSearchParams(search).get('lamp');
  const lamp = id ? lampById(id) : null;
  return lamp && lamp.section === section ? lamp.id : null;
}

// Alpha round 4 · mid-chapter resume. The scene records the last lamp lit
// in the current section (saveSystem markResume(checkpoint, { lamp })); a
// load of this page on that checkpoint starts at that lamp. Anything else
// (an unknown lamp, another section's) is ignored.
export function resolveResumeLamp({ resume = null, section = 'A' } = {}) {
  const lamp = typeof resume?.lamp === 'string' ? lampById(resume.lamp) : null;
  return lamp && lamp.section === section ? lamp.id : null;
}

// What starting at a lamp implies about the world behind it, so a resume (or
// a dev ?lamp= route) does not replay a story beat beside Butch:
// - Mara's sightings he is already past are skipped (she must never stand
//   beside him: alpha r4 found her on the DANCING roof after a resume);
// - a held bridge he has already crossed was cut (the city let it go);
// - the platform lamps of the departure machines behind him are lit;
// - the hotel window is dark once he is past it;
// - first-use teaching he has met (walk, jump, the two bells) is done.
export function lampStartState(lampId) {
  const lamp = lampById(lampId);
  if (!lamp) return null;
  const at = lamp.spawnX;
  const index = LAMPS.indexOf(lamp);
  return {
    lamp: lamp.id,
    skipSightings: MARA_SIGHTINGS
      .filter((s) => s.section === lamp.section && (s.waitForX != null ? at > s.waitForX : at > s.path[0][0] - 600))
      .map((s) => s.id),
    released: MACHINES
      .filter((m) => m.heldAtStart && m.kind === 'bridge' && m.section === lamp.section && at > m.x + m.length)
      .map((m) => m.id),
    platformLamps: lamp.section === 'C' ? DEPARTURE_CHAIN.filter((id) => machineById(id).x < at) : [],
    windowGone: lamp.section === 'B' && at > HOTEL_WINDOW.x,
    taught: {
      walked: index > 0,
      jumped: index > 0,
      acClimbed: lamp.section !== 'A' || at > 5880,
      phasePunched: lamp.section !== 'A' || at > 9460,
    },
  };
}

export const circuitKey = (district, line) => `${district}:${line}`;

// Machines that start somewhere other than at rest (the drop ledge, held up).
export function settleStartLevels(tt) {
  MACHINES.filter((m) => m.startLevel != null).forEach((m) => tt.settle(m.id, m.startLevel));
}
export const districtOf = (node) => node.district ?? node.section;

// The tuple the timetable model is built from.
export function timetableDefinition() {
  return {
    // Each section (or district) is its own set of lines.
    nodes: NODES.map((node) => ({
      id: node.id,
      line: node.line,
      machine: node.machine,
      circuit: circuitKey(districtOf(node), node.line),
      district: districtOf(node),
      ...(node.phase ? { phase: node.phase } : {}),
      ...(node.dead ? { dead: true } : {}),
      ...(node.noCatch ? { noCatch: true } : {}),
    })),
    // Every lift waits a bell for a rider who is still on the way (R3-3).
    machines: MACHINES.map(({ id, kind, duration, travel, borrowable, ballast }) => ({
      id, kind, duration, travel, borrowable: Boolean(borrowable), waitsForRider: kind === 'lift', ...(ballast ? { ballast } : {}),
    })),
  };
}
