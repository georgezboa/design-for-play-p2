import { LANE_FAR, LANE_NEAR } from './constants.js';

// Level authoring in plain data. Coordinates are world-space.
//   - solids:  { lane, x, y, w, h, tex, kind }   x/y = TOP-LEFT
//   - coins:   { lane, x, y, value }             x/y = CENTRE
//   - enemies: { lane, x, min, max }             patrol bounds
//
// The far lane's ground surface sits at y=290, the near lane's at y=460
// (see LANES in constants.js). Jump height is ~140px, so anything within
// ~135px of a standing surface is reachable.

const G = 'terrain-body'; // ground body — the moonlit cap is added automatically
const S = 'stone';
const W = 'plank';

// Which stage runs the rotating drum. `stages` and `interactables` are sibling
// keys of one object literal, so neither can read the other through LEVEL while
// it is still being constructed; this constant is the single place both consult.
// Set it to null to retire the pilot — the stage's `drum` block and the slot
// dial then disappear together, and section III falls back to the ordered queue
// every other stage uses.
// Section III. Named for what the room now is rather than for the deleted drum.
// The index is still needed because the shared interactable builder has to know
// which stage gets air-circuit machines (kind 'air-lock') instead of
// queue-punch controls.
const AIR_LOCK_STAGE = 2;
// Phase IV-VI are one narrative system arc in world space. IV teaches one
// weight, V asks the player to make room for two true records, VI lets the
// train reproduce the player's earlier counter-movement. None uses the
// retired rolling-bearing service table.
const FIRST_WEIGHT_STAGE = 3;
const TWO_TRUE_THINGS_STAGE = 4;
const TRAIN_REMEMBERS_STAGE = 5;

export const LEVEL = {
  spawn: { x: 70, y: 400, lane: LANE_NEAR },
  tutorialPuzzle: {
    mode: 'timetable',
    endX: 4800,
    stages: [
      {
        id: 'junction-1',
        title: 'I  /  PUNCH THE DOOR',
        startX: 0,
        endX: 790,
        rackX: 250,
        commandX: 430,
        runX: 650,
        commands: ['door'],
        solution: ['door'],
        autoRun: true,
        showRack: false,
        showMachinery: false,
        guidance: 'direct',
        lesson: 'One punched instruction becomes a real train action.',
      },
      {
        id: 'junction-2',
        title: 'II  /  CONTACT',
        startX: 800,
        endX: 1590,
        // DEAD LAYOUT DATA, kept only because the shared rack-face builder in
        // TimetablePuzzle.build() still positions its (refresh-hidden) rack
        // objects from rackX for every stage; deleting it would leave NaN
        // coordinates on the hidden assembly. commandX/runX were deleted once
        // their last readers went away (completeStage falls back to the room
        // centre for the score popup).
        rackX: 910,
        // Phase II is now the door-latch / power-contactor interlock
        // (src/tutorial/phases/contactInterlock.js): no command devices, no
        // RUN handle, no guideSequence, no rack face in this room. The latch
        // at x=850 and the contactor at x=1440 are `contact-interlock`
        // interactables below; completion is owned by that state machine.
        showRack: false,
        // The shared pneumatic machinery cluster (gauge, brake shoes, motor,
        // flywheel, power lamp) is the retired brake-suspension narrative and
        // would sit 100px from the new contactor. junction-1 precedent: hide
        // the whole cluster; GameScene's completion reveal then skips its
        // camera pan too.
        showMachinery: false,
        guidance: 'interlock',
        // DESCRIPTIVE ONLY, exactly like junction-3: nothing queues or judges
        // these commands any more. The field stays because shared completion
        // art (setCompletedMachinery) and the room pictogram in
        // tutorialTrainRoomsArt read `stage.solution` unguarded.
        solution: ['brake', 'power'],
        lesson: 'The open door latch breaks the circuit; the contactor only holds once the line has gone live.',
      },
      {
        id: 'junction-3',
        title: 'III  /  THE AIR THAT KEEPS COMING BACK',
        startX: 1600,
        endX: 2390,
        // UNDERCARRIAGE VIEW TEACHING: this stage teaches the hold-S look-down
        // verb (camera, QA warp, [S] prompt). It deliberately does NOT carry
        // `underfloor`: that flag would relocate the hand-placed air-circuit
        // run (header y=545, wall-eye-height gauge) into the deep machinery
        // band and strip the custom pipe pulses. See src/tutorial/underfloorView.js.
        underfloorView: true,
        // The drum is gone rather than disabled. One screen cannot sell two
        // solutions: whichever of the drum slots and the air line looked
        // brighter would be read as the real puzzle and the other as decoration.
        guidance: 'machine',
        lesson: 'A branch fed by the main reservoir cannot be bled dry — close its isolator first.',
        // DESCRIPTIVE ONLY. Completion is gated by the local-air-circuit state
        // machine in src/tutorial/phases/localAirCircuit.js, not by this array.
        // It stays because 28 call sites read `stage.solution` unguarded for
        // completion art and objective text; removing those readers is a
        // separate refactor (SYSTEM ARC LOCK §9).
        solution: ['brake', 'vent', 'door'],
        // LOCAL AIR CIRCUIT (SYSTEM ARC LOCK §3). One door branch of the shared
        // PARALLEL air network: reservoir -> ISOLATE -> gauge -> BLEED -> door
        // cylinder and claw. Bleeding against the open supply floors above the
        // release band (the whole lesson); only closing ISOLATE lets the
        // cylinder retract the claw. All numbers live in
        // phases/airNetwork.js + phases/localAirCircuit.js, locked by tests —
        // none may be tuned here.
        airCircuit: {
          interactRadius: 62,
          machines: {
            // Spatial order is locked by the arc: reservoir, ISOLATE, gauge,
            // BLEED, cylinder+latch. The claw keeps its old clearance: the
            // incomplete-stage guard resets the player to endX - 12 = 2378,
            // so 2330 keeps 48px. Nothing may move right for symmetry's sake.
            reservoir: { x: 1650, y: 430, surface: 'underfloor-tank' },
            isolate: { x: 1750, y: 430, surface: 'floor-bracket' },
            gauge: { x: 1900, y: 300, surface: 'wall-eye-height', interactive: false },
            bleed: { x: 2110, y: 430, surface: 'wall-wheel' },
            latch: { x: 2330, y: 430, surface: 'door-claw' },
          },
        },
      },
      {
        id: 'junction-4',
        title: 'IV  /  THE FIRST WEIGHT',
        startX: 2400,
        endX: 3190,
        rackX: 2510,
        commandX: 2630,
        runX: 2800,
        // A world-space balance story, not a service-table UI. The case falls
        // at the right detent, the middle detent exposes its witness tag, and
        // the final composition is case left + player at the right-hand door.
        firstWeight: {
          railY: 354,
          detents: { left: 2585, middle: 2785, right: 2990 },
          entryTriggerX: 2460,
          exitZoneX: 3090,
          interactRadius: 68,
        },
        // Compatibility-only pictogram input for shared completion art. The
        // First Weight state machine, not this array, owns completion.
        solution: ['brake', 'door'],
        showRack: false,
        showMachinery: false,
      },
      {
        id: 'junction-5',
        title: 'V  /  TWO TRUE THINGS',
        startX: 3200,
        endX: 3990,
        rackX: 3310,
        commandX: 3370,
        runX: 3860,
        // Two archive cases overload one cradle. Punching both witness tags
        // unfolds a second cradle; its amber winch and cyan air cushion are
        // independent relationships and may be connected in either order.
        // Completion requires one case on each physically supported cradle.
        twoTrueThings: {
          rail: { left: 3260, right: 3910 },
          entryTriggerX: 3260,
          mainCradleX: 3518,
          secondCradleX: 3788,
          amberX: 3310,
          cyanX: 3880,
          interactRadius: 72,
        },
        // Compatibility-only input for shared completion pictograms.
        solution: ['power', 'vent', 'door'],
        showRack: false,
        showMachinery: false,
      },
      {
        id: 'junction-6',
        title: 'VI  /  THE TRAIN REMEMBERS',
        startX: 4000,
        endX: 4790,
        rackX: 4110,
        commandX: 4160,
        runX: 4660,
        // The amber case replays Phase IV's real movement on the upper rail.
        // The present case uses the same grip/release verb on the lower rail.
        // After two readable balances the Archivist removes the echo; leaving
        // the balance to catch it makes the train take over the missing weight.
        trainRemembers: {
          rail: { left: 4060, right: 4690 },
          entryTriggerX: 4060,
          pivotX: 4380,
          winchX: 4110,
          airX: 4650,
          catchX: 4175,
          interactRadius: 72,
        },
        solution: ['power', 'couple'],
        showRack: false,
        showMachinery: false,
      },
    ],
  },
  goal: { x: 9300, y: 388 },
  checkpoints: [{ x: 6895, y: 400, lane: LANE_NEAR }],

  solids: [
    // ---------------------------------------------------------- NEAR ground
    // Car 01 is now a continuous 4,800px first chapter. All teammate-authored
    // later-world geometry is shifted by the same 2,400px expansion.
    { lane: LANE_NEAR, x: 0, y: 460, w: 4800, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 4920, y: 460, w: 780, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 5830, y: 460, w: 900, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 6890, y: 460, w: 1100, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 8110, y: 460, w: 1390, h: 140, tex: G, kind: 'ground' },

    // ------------------------------------------------------- NEAR platforms
    { lane: LANE_NEAR, x: 5080, y: 385, w: 140, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 5330, y: 330, w: 120, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 6050, y: 375, w: 160, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 7150, y: 380, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 7420, y: 320, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 8300, y: 375, w: 150, h: 24, tex: S, kind: 'platform' },

    // ----------------------------------------------------------- FAR ground
    // Gaps: 700-900, 1800-2400 (the lever bridge), 3400-3560
    // The far path is a balcony, not a second enormous wall. Its thinner
    // silhouette leaves the city visible through the lane gap.
    { lane: LANE_FAR, x: 4800, y: 290, w: 900, h: 26, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 6300, y: 290, w: 1000, h: 26, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 7460, y: 290, w: 2040, h: 26, tex: G, kind: 'ground' },

    // -------------------------------------------------------- FAR platforms
    { lane: LANE_FAR, x: 5150, y: 220, w: 120, h: 20, tex: S, kind: 'platform' },
    { lane: LANE_FAR, x: 6600, y: 215, w: 140, h: 20, tex: S, kind: 'platform' },
    { lane: LANE_FAR, x: 7900, y: 220, w: 150, h: 20, tex: S, kind: 'platform' },
  ],

  // Eight planks spanning the 1800-2400 gap in the far lane. Disabled until
  // the player pulls the lever over in the near lane.
  bridge: {
    lane: LANE_FAR,
    y: 290,
    h: 22,
    tex: W,
    planks: Array.from({ length: 8 }, (_, i) => ({ x: 5700 + i * 75, w: 75 })),
  },

  // Blood echoes are deliberately absent from the opening frame. The player
  // should first read the hunt, the enemy, and the jump—not a row of glowing
  // collectibles. They can be reintroduced later as rare, authored rewards.
  coins: [],

  // Non-collidable set dressing. Lamps carry an additive glow that is never
  // lane-tinted, so they still read as light sources against a black lane.
  decor: [
    { tex: 'lamp-post', lane: LANE_NEAR, x: 5660, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 6760, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 7880, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 8980, light: 1 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 5420, light: 0.55 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 7000, light: 0.55 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 8280, light: 0.55 },

    { tex: 'hearse', lane: LANE_FAR, x: 4980 },
    { tex: 'hearse', lane: LANE_FAR, x: 8600 },

    { tex: 'fence', lane: LANE_FAR, x: 6400, repeat: 8 },
    { tex: 'fence', lane: LANE_FAR, x: 7600, repeat: 7 },

    { tex: 'sign', lane: LANE_NEAR, x: 7240 },
    { tex: 'sign', lane: LANE_FAR, x: 4880 },
    { tex: 'sign', lane: LANE_FAR, x: 8100 },
  ],

  enemies: [
    // A lone hound gives the opening a readable threat and introduces the
    // cleaver before the level asks for any trickier traversal.
    { lane: LANE_NEAR, x: 5020, min: 4940, max: 5220 },
    { lane: LANE_NEAR, x: 7300, min: 6910, max: 7970 },
    { lane: LANE_NEAR, x: 8600, min: 8130, max: 9200 },
    { lane: LANE_FAR, x: 6900, min: 6310, max: 7290 },
  ],

  interactables: [
    ...[
      { stage: 0, commandX: 430, runX: 650, commands: ['door'] },
      // Stage 1 (junction-2) is deliberately absent: its punch keys and its
      // RUN handle are demolished. The room's only interactables are the two
      // contact-interlock devices added explicitly after this flatMap.
      // Section III's two devices are placed explicitly along the locked
      // spatial order (reservoir 1650 -> ISOLATE 1750 -> gauge 1900 -> BLEED
      // 2110 -> cylinder/claw 2330): the player must be able to walk the pipe
      // backwards from the bleeding valve to the isolator. See
      // stages[2].airCircuit for the layout contract.
      //
      // The commands are 'isolate' and 'bleed'. The claw is a passive
      // mechanical consumer — it gets no button of its own.
      {
        stage: 2,
        commands: ['isolate', 'bleed'],
        layout: [1750, 2110],
      },
      { stage: 3, commands: ['case'], layout: [2990] },
      { stage: 4, commands: ['case-a', 'case-b', 'amber', 'cyan'], layout: [3481, 3605, 3310, 3880] },
      { stage: 5, commands: ['present-case', 'catch'], layout: [4375, 4175] },
    ].flatMap(({ stage, commandX = 0, runX = 0, commands, physical = false, layout = null }) => {
      // Stages carrying an explicit `layout` need no interval and no runX, so
      // both default to 0 rather than producing NaN positions.
      const interval = !layout && commands.length > 1
        ? (runX - commandX - 96) / (commands.length - 1)
        : 0;
      return [
        ...commands.map((command, index) => ({
          id: `timetable-${stage}-${command}`,
          // Section III's three devices are air-lock machines: pressing them
          // acts on the pipe immediately instead of queueing a command for a
          // later run. Everywhere else these stay the punch-a-command control
          // they have always been.
          kind: stage === AIR_LOCK_STAGE
            ? 'air-lock'
            : stage === FIRST_WEIGHT_STAGE
              ? 'first-weight'
            : stage === TWO_TRUE_THINGS_STAGE
              ? 'two-true-things'
            : stage === TRAIN_REMEMBERS_STAGE
              ? 'train-remembers'
            : (physical ? 'rail-control' : 'timetable-command'),
          command,
          stage,
          lane: LANE_NEAR,
          x: layout ? layout[index] : commandX + interval * index,
          y: 430,
        })),
        // The drum's planning bench, punch keys, RESET and RUN handles are all
        // deleted along with the drum itself. Section III's causality is
        // immediate, so there is nothing to write down and nothing to run.
        ...(!physical
          && stage !== AIR_LOCK_STAGE
          && stage !== FIRST_WEIGHT_STAGE
          && stage !== TWO_TRUE_THINGS_STAGE
          && stage !== TRAIN_REMEMBERS_STAGE ? [{
          id: `timetable-run-${stage}`,
          kind: 'timetable-run',
          stage,
          lane: LANE_NEAR,
          x: runX,
          y: 430,
        }] : []),
      ];
    }),
    // Phase II (junction-2) interlock devices. Their sprites stay invisible —
    // ContactInterlockArt draws the latch and the contactor — so these defs
    // exist purely to reuse GameScene's dx<62 / dy<100 proximity pick and its
    // E-key routing. `command` is the interlock target: 'latch' | 'power'.
    {
      id: 'contact-latch-1',
      kind: 'contact-interlock',
      command: 'latch',
      stage: 1,
      lane: LANE_NEAR,
      x: 850,
      y: 430,
    },
    {
      id: 'contact-power-1',
      kind: 'contact-interlock',
      command: 'power',
      stage: 1,
      lane: LANE_NEAR,
      x: 1440,
      y: 430,
    },
    // The mid-car relay cabinet (THE MISSING CONTACT). Same invisible-anchor
    // pattern: ContactInterlockArt draws the world cabinet, RelayCabinetArt
    // owns the close-up; this def only feeds the dx<62 proximity pick and
    // routes E to TimetablePuzzle.openRelayCloseup().
    {
      id: 'contact-relay-1',
      kind: 'contact-interlock',
      command: 'relay',
      stage: 1,
      lane: LANE_NEAR,
      x: 1195,
      y: 430,
    },
    {
      id: 'sign-lever',
      kind: 'sign',
      lane: LANE_NEAR,
      x: 6370,
      y: 430,
      message: 'That lever builds a bridge... somewhere behind you.',
    },
    {
      id: 'bridge-lever',
      kind: 'lever',
      lane: LANE_NEAR,
      x: 6500,
      y: 430,
      once: true,
      message: 'A bridge rumbles into place in the far lane.',
    },
  ],

  // The people are not enemies and do not collide. They are anchors for the
  // story: each one remembers a different failed explanation of the world.
  npcs: [
    { id: 'caretaker', lane: LANE_NEAR, x: 125 },
    { id: 'mara', lane: LANE_FAR, x: 5000 },
    { id: 'operator', lane: LANE_NEAR, x: 5260 },
    { id: 'archivist', lane: LANE_FAR, x: 5460 },
    { id: 'mother', lane: LANE_NEAR, x: 6250 },
    { id: 'child', lane: LANE_FAR, x: 6660 },
    { id: 'janitor', lane: LANE_NEAR, x: 8180 },
    { id: 'last', lane: LANE_NEAR, x: 9040 },
  ],
};
