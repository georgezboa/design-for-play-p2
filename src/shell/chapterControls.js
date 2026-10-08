// Per-chapter controls, as [action, input] pairs.
//
// Two layers (round 6, feedback item 19: the pause menu showed every rule at
// once, most of them not yet needed):
//   CHAPTER_CONTROLS  the FULL list of each chapter page, unchanged in shape:
//                     the page passes it to installPauseMenu({ controls }) and
//                     the pause menu shows it under ALL CONTROLS.
//   CONTROL_SETS      per chapter: `basics` (3–5 rows), `stages` (the 3–5 rows
//                     that matter in one stage, keyed by stage id), `all` (the
//                     full list above) and `entry` (the chapter-entry card,
//                     controlsCard.js). The pause menu opens on the current
//                     stage's rows, else the basics.
//
// The current stage comes from an event any chapter can dispatch (the pause
// menu keeps the last one):
//   window.dispatchEvent(new CustomEvent('nightfall:controls-stage', {
//     detail: { chapter: 'chapter2', stage: 'B' },             // a stage below
//   }));
//   window.dispatchEvent(new CustomEvent('nightfall:controls-stage', {
//     detail: { chapter: 'chapter6', stage: 'face', label: 'SAY IT FACE TO FACE',
//               controls: [['SPEAK FACE TO FACE', 'E · AT THE LIT FRONT'], ['MOVE', 'WASD / ARROWS']] },
//   }));                                                       // rows of its own
// `detail.controls` wins; else CONTROL_SETS[chapter].stages[stage]; else the
// chapter's basics. `chapter` may be a set id (chapter1 … chapter6,
// oneAnswer, labyrinth, blackTicket, trueEnding, cutscene), a CHAPTER_CONTROLS
// key (nightServicePanels, borrowedLight, …) or a chapter number; it may be
// left out (the page's own set). `{ stage: null }` returns to the basics.
const list = (...rows) => Object.freeze(rows.map((row) => Object.freeze(row)));

export const CHAPTER_CONTROLS = Object.freeze({
  // Chapter 1 panel puzzle (night-service.html). Mouse first; every verb
  // also has a keyboard fallback.
  // The full key list (the in-game key strip shows the ones that apply now).
  nightServicePanels: list(
    ['UNFOLD THE WALL', 'DRAG THE BRASS PULL · HOLD ITS ARROW · ENTER'],
    ['CHOOSE A WINDOW', 'ARROW KEYS'],
    ['MOVE A WINDOW', 'DRAG IT · SPACE PICKS UP, ARROWS, SPACE PUTS DOWN'],
    ['LOOK CLOSER / USE', 'CLICK A TAG · TAB NEXT TAG, ENTER USES IT'],
    ['STEP BACK', 'RIGHT-CLICK · WHEEL DOWN · ⤢ GLYPH · BACKSPACE'],
    ['LIFT A FRAME', 'PRESS AND HOLD THE FRAME · F, ARROWS, SPACE DROPS'],
    ['PUNCH-HOLE LENS', 'DRAG IT · L, ARROWS MOVE IT, ENTER CLICKS THROUGH'],
    ['PUT BACK WHAT YOU HOLD', 'BACKSPACE · ESC'],
    ['CONTINUE / READ', 'CLICK · ENTER · SPACE'],
    ['SHOW ME (A HINT)', 'PAUSE → SHOW ME · H'],
    ['PAUSE', 'ESC'],
  ),
  // Round 6 (unified controls): E punches as well as talks and reads.
  borrowedLight: list(
    ['MOVE', 'A / D · ← →'],
    ['JUMP', 'SPACE / W / ↑ · HOLD FOR HEIGHT'],
    ['PUNCH NODE', 'E / LEFT CLICK (THE MARKED NODE)'],
    ['TAKE BACK A PUNCH', 'HOLD E / HOLD CLICK ON IT'],
    ['LISTEN (NEXT BELL)', 'HOLD Q'],
    ['BORROW / GIVE LIGHT', 'E AT A LIT / DEAD NODE (BLACKOUT)'],
    ['TALK / READ / CONTINUE', 'E / ENTER'],
    ['GAMEPAD', 'STICK · A JUMP · X ACT · RB PUNCH · LB LISTEN'],
    ['STUCK?', 'PAUSE · SHOW ME'],
    ['PAUSE', 'ESC / START'],
  ),
  echoCity: list(
    // Echo City: click-to-walk streets; scanner fields switch to direct
    // movement. F is free (fullscreen is the desktop bridge's F11).
    ['WALK', 'CLICK THE GROUND · WASD / ARROWS · A FAR CLICK STRIDES'],
    ['RUN', 'DOUBLE-CLICK THE GROUND · HOLD SHIFT'],
    // Alpha round 4 fix round (P2): the long walks.
    ['LONG WALKS', 'G · LEV LEADS THE WAY (WHEN OFFERED)'],
    ['SKIP A SCRIPTED WALK', 'CLICK'],
    ['TALK / INSPECT', 'CLICK A TAG · E / ENTER'],
    ['CONTINUE DIALOGUE', 'CLICK · E / ENTER'],
    ['SHOW WHAT MATTERS', 'HOLD TAB'],
    ['WALK IN STEP (SCANNERS)', 'HOLD E BESIDE A LIT WALKER · OR WASD TOWARD THE ARCH'],
    ['LET GO OF A WALKER', 'WALK BACK'],
    ['WIRE CLAMP', 'DRAG THE COPPER END · OR E'],
    // Round 6 (items 8, 18): the operations only, never the solution
    // order; E / Enter acts (Ch3 has no jump, so Space is not shown).
    ['TICKET BOARD', 'DRAG PAPERS AND THE 1978 LENS · CLICK A STACK TO PUNCH · H HINT'],
    ['BOARD BY KEYS', 'TAB + ARROWS · L LENS · E / ENTER ACT'],
    ['RESET CAMERA', 'R'],
    ['PAUSE', 'ESC'],
  ),
  // Chapter 4: the unified keys (round 6, item 18) for walking, jumping and
  // reading; the brush has three hands (mouse; I J K L with F / SHIFT; the
  // right stick with RT / LT).
  paintedCountry: list(
    ['MOVE', 'A / D · ← → · LEFT STICK'],
    ['JUMP', 'SPACE · W / ↑ · PAD A'],
    ['PAINT / APPLY', 'LEFT MOUSE · F · PAD RT'],
    ['WASH / TAKE', 'RIGHT MOUSE · SHIFT · PAD LT'],
    ['AIM THE BRUSH', 'MOUSE · I J K L · RIGHT STICK'],
    ['READ / INTERACT', 'E / ENTER · PAD X'],
    ['RESTART ROOM', 'HOLD R · HOLD PAD BACK'],
    ['PAUSE', 'ESC · PAD START'],
  ),
  // Chapter 5 · the Museum (first person). Space is jump here and does
  // nothing in the Labyrinth; E is the one "act on this" key everywhere.
  museum: list(
    ['WALK', 'WASD / ARROWS'],
    ['LOOK', 'MOUSE (CLICK TO TAKE THE MOUSE)'],
    ['JUMP', 'SPACE'],
    ['INTERACT / READ', 'E / ENTER / LEFT CLICK'],
    ['SLOT THE KEYS', 'HOLD E'],
    ['PAUSE', 'ESC'],
  ),
  // Chapter 5 · the one-answer exhibit (one-answer.html): the Chapter 1
  // panel verbs, framed in the lobby's central case.
  oneAnswer: list(
    ['MOVE A WINDOW', 'DRAG IT · ARROWS + SPACE'],
    ['LOOK CLOSER', 'CLICK A TAG · TAB + ENTER'],
    ['STEP BACK', 'RIGHT-CLICK · WHEEL DOWN · BACKSPACE'],
    ['PUNCH-HOLE LENS', 'DRAG IT · L + ARROWS'],
    ['CONTINUE / READ', 'CLICK · ENTER'],
    ['BACK TO THE MUSEUM', 'ESC'],
  ),
  // Chapter 5 · Door 4, the Labyrinth.
  labyrinth: list(
    ['MOVE', 'WASD / ARROWS'],
    ['AIM YOUR GAZE', 'MOUSE'],
    ['HOLD YOUR GAZE', 'HOLD Q'],
    ['SHIELD', 'SHIFT'],
    ['STAIRS / TAKE', 'E'],
    ['REBUILD THE MAZE', 'HOLD R'],
    ['PAUSE', 'ESC'],
  ),
  // Chapter 6's keys (blackKnifeFinal/constants.js BT_KEYS, alpha round 4).
  blackKnife: list(
    ['MOVE', 'WASD / ARROWS'],
    ['PUNCH', 'HOLD SPACE / Z / LEFT CLICK'],
    ['DASH', 'HOLD SHIFT / X'],
    ['SHIELD ×3 (ON THE BELL: KEEPS ITS CHARGE)', 'E / C / RIGHT CLICK'],
    ['PAUSE', 'ESC / P'],
  ),
  trueEnding: list(
    ['SKIP THE REVEAL', 'HOLD SPACE / ENTER / MOUSE'],
    ['CONTINUE (AFTER THE REVEAL)', 'ENTER / SPACE / CLICK'],
    ['PAUSE', 'ESC'],
  ),
  // A cutscene on a page without a chapter of its own (the opening plays on
  // the title page): gameFlow.js HOLD TO SKIP and the Escape tap.
  cutscene: list(
    ['SKIP', 'HOLD SPACE / ENTER / ESC / MOUSE'],
    ['PAUSE', 'TAP ESC'],
  ),
});

// ---------------------------------------------------------------------------
// Round 6 · control sets: the rows that matter now, per chapter and stage.
//
// Written to the unified scheme (feedback item 18, agent-common.md): move
// WASD / arrows, jump Space (+ W / ↑ where those are not movement),
// interact / confirm E / Enter, back / pause Esc; chapter verbs keep their own
// key. A chapter that remaps a key updates its rows here (or dispatches its
// own rows with the stage event).

export const CONTROLS_STAGE_EVENT = 'nightfall:controls-stage';

// Chapter 6 · the Conductor (final-boss.html passes its own inline list; this
// copy is the set's fallback for ALL CONTROLS).
export const CONDUCTOR_CONTROLS = list(
  ['MOVE', 'WASD / ARROWS'],
  ['PUNCH / ACT', 'E / ENTER · LEFT CLICK (MOVEMENT I)'],
  ['DASH', 'SHIFT / X'],
  ['LENS (MOVEMENT I)', 'MOUSE · L LETS IT CIRCLE YOU'],
  ['LISTEN (MOVEMENT II)', 'HOLD Q'],
  ['ANSWER (MOVEMENT III)', '1 / 2'],
  ['SPEAK FACE TO FACE (MOVEMENT III)', 'E / ENTER AT THE LIT FRONT'],
  ['ABSORB (MOVEMENT IV)', 'HOLD E · OR HOLD RIGHT MOUSE ON IT'],
  ['RETURN (MOVEMENT IV)', 'HOLD R · OR HOLD LEFT MOUSE'],
  ['PAUSE', 'ESC'],
);

const stage = (name, rows, { diagrams = [] } = {}) => Object.freeze({ name, rows: list(...rows), diagrams: Object.freeze([...diagrams]) });
// The chapter-entry card (controlsCard.js): 3–4 basic rows, and what changed
// since the chapter before, as [tag, line] (tag NEW / NOW / SAME).
const entry = (title, rows, changed = []) => Object.freeze({ title, rows: list(...rows), changed: list(...changed) });

// Read-only probes of a running chapter, so the pause menu knows the stage
// even before a chapter dispatches the event (null when they find nothing,
// and the basics show).
const phaserScenes = () => {
  try {
    return (globalThis.game?.scene?.getScenes?.(false) ?? []).filter((scene) => scene?.sys?.isActive?.() || scene?.sys?.isPaused?.());
  } catch { return []; }
};
const sceneStage = (byKey) => () => {
  const scene = phaserScenes().find((candidate) => byKey[candidate?.sys?.settings?.key]);
  return scene ? byKey[scene.sys.settings.key] : null;
};
const STEP_BACK = ['STEP BACK', 'RIGHT-CLICK · ⌫'];
const SHOW_ME = ['SHOW ME (A HINT)', 'H'];
const DRAG_WINDOW = ['MOVE A WINDOW', 'DRAG ITS PICTURE'];
const LOOK_CLOSER = ['LOOK CLOSER / USE', 'CLICK A TAG · TAB, ENTER'];
const SIDE_MOVE = ['MOVE', 'A / D · ← →'];
const SIDE_JUMP = ['JUMP', 'SPACE · W · ↑'];

export const CONTROL_SETS = Object.freeze({
  // Chapter 1 · NIGHT SERVICE (night-service.html). Stages are the act ids
  // (PanelScene onActChange also sets <html data-night-service-act>, which
  // the pause menu reads when no stage event came).
  chapter1: Object.freeze({
    id: 'chapter1',
    title: 'NIGHT SERVICE',
    all: CHAPTER_CONTROLS.nightServicePanels,
    basics: list(DRAG_WINDOW, LOOK_CLOSER, STEP_BACK, SHOW_ME),
    stages: Object.freeze({
      act0: stage('ACT 0 · ONE WINDOW', [
        ['LOOK CLOSER', 'CLICK A TAG · TAB, ENTER'],
        ['USE', 'CLICK THE MARKED PART, UP CLOSE'],
        ['STEP BACK', 'RIGHT-CLICK · WHEEL DOWN · ⌫'],
        SHOW_ME,
      ]),
      act05: stage('ACT 0.5 · TWO WINDOWS', [
        ['UNFOLD THE WALL', 'DRAG THE PULL OUTWARD'],
        ['SWAP THE WINDOWS', 'DRAG A PICTURE ONTO THE OTHER'],
        ['LOOK CLOSER', 'CLICK A TAG'],
        STEP_BACK,
        SHOW_ME,
      ], { diagrams: ['unfold', 'swap'] }),
      act1: stage('ACT I · LOST PROPERTY', [
        ['UNFOLD THE WALL', 'DRAG THE PULL OUTWARD'],
        DRAG_WINDOW,
        ['LOOK CLOSER', 'CLICK A TAG'],
        STEP_BACK,
        SHOW_ME,
      ], { diagrams: ['unfold', 'swap'] }),
      act2: stage('ACT II · THE LUGGAGE CAR', [
        ['PUNCH-HOLE LENS', 'DRAG IT · L, ARROWS'],
        ['USE THROUGH IT', 'CLICK INSIDE THE LENS'],
        ['LIFT A FRAME', 'PRESS AND HOLD THE FRAME · F'],
        DRAG_WINDOW,
        STEP_BACK,
      ], { diagrams: ['swap', 'lift'] }),
      act3: stage('ACT III · TWO TRUE THINGS', [
        DRAG_WINDOW,
        ['LIFT A FRAME', 'PRESS AND HOLD THE FRAME · F'],
        ['LENS ON A SEAM', 'DRAG IT THERE · L, ARROWS'],
        STEP_BACK,
        SHOW_ME,
      ], { diagrams: ['swap', 'lift'] }),
    }),
    aliases: Object.freeze({ 0: 'act0', 0.5: 'act05', '0.5': 'act05', 1: 'act1', 2: 'act2', 3: 'act3' }),
    probe: () => globalThis.document?.documentElement?.dataset?.nightServiceAct ?? null,
    entry: entry('CHAPTER 1 · NIGHT SERVICE', [
      ['MOVE A WINDOW', 'DRAG ITS PICTURE'],
      ['LOOK CLOSER', 'CLICK A TAG'],
      ['STEP BACK', 'RIGHT-CLICK'],
      ['A HINT', 'H'],
    ], [
      ['NOTE', 'The mouse does the work here. Every move has a key too.'],
    ]),
  }),
  // Chapter 2 · BORROWED LIGHT. Stages are the sections (level.js SECTIONS).
  chapter2: Object.freeze({
    id: 'chapter2',
    title: 'BORROWED LIGHT',
    all: CHAPTER_CONTROLS.borrowedLight,
    basics: list(SIDE_MOVE, SIDE_JUMP, ['PUNCH A NODE', 'F · CLICK THE MARKED NODE'], ['READ / INTERACT', 'E / ENTER'], ['LISTEN (NEXT BELL)', 'HOLD Q']),
    stages: Object.freeze({
      A: stage('RAIN ROOFTOPS', [
        SIDE_MOVE,
        ['JUMP', 'SPACE · W · ↑ · HOLD FOR HEIGHT'],
        ['PUNCH A NODE', 'F · CLICK IT · FIRES ON THE NEXT BELL'],
        ['TAKE BACK A PUNCH', 'HOLD F ON IT'],
        ['LISTEN (NEXT BELL)', 'HOLD Q'],
      ]),
      B: stage('BLACKOUT', [
        SIDE_MOVE,
        SIDE_JUMP,
        ['BORROW / GIVE LIGHT', 'E AT A LIT / DEAD NODE'],
        ['PUNCH A NODE', 'F · CLICK IT'],
        ['LISTEN (NEXT BELL)', 'HOLD Q'],
      ]),
      C: stage('EVACUATION PLATFORM', [
        SIDE_MOVE,
        SIDE_JUMP,
        ['RELEASE A BRAKE', 'F · STANDING IN THE CAGE'],
        ['PUNCH A NODE', 'F · CLICK IT'],
        ['LISTEN (NEXT BELL)', 'HOLD Q'],
      ]),
    }),
    aliases: Object.freeze({ rooftops: 'A', blackout: 'B', platform: 'C', a: 'A', b: 'B', c: 'C' }),
    // BorrowedLightScene keeps the section Butch is in
    probe: () => phaserScenes().find((scene) => scene?.sys?.settings?.key === 'BorrowedLight')?.section ?? null,
    entry: entry('CHAPTER 2 · BORROWED LIGHT', [
      SIDE_MOVE,
      SIDE_JUMP,
      ['PUNCH A NODE', 'F'],
      ['READ', 'E / ENTER'],
    ], [
      ['NOW', 'You walk Butch yourself. The arrows move him; Space jumps.'],
      ['NEW', 'F punches a lit node. It fires on the next bell.'],
    ]),
  }),
  // Chapter 3 · ECHO CITY. Stages: the streets, a scanner field, the wire
  // clamp, the Ticket 43 board, and the board with the lens in hand. The board
  // rows teach the operations only, never the order of the solution
  // (feedback item 8).
  chapter3: Object.freeze({
    id: 'chapter3',
    title: 'ECHO CITY',
    all: CHAPTER_CONTROLS.echoCity,
    basics: list(
      ['WALK', 'WASD / ARROWS · CLICK THE GROUND'],
      ['TALK / INSPECT', 'E / ENTER · CLICK A TAG'],
      ['SHOW WHAT MATTERS', 'HOLD TAB'],
      ['LEV LEADS THE WAY', 'G (WHEN OFFERED)'],
    ),
    stages: Object.freeze({
      city: stage('THE STREETS', [
        ['WALK', 'WASD / ARROWS · CLICK THE GROUND'],
        ['RUN', 'HOLD SHIFT · DOUBLE-CLICK'],
        ['TALK / INSPECT', 'E / ENTER · CLICK A TAG'],
        ['SHOW WHAT MATTERS', 'HOLD TAB'],
        ['LEV LEADS THE WAY', 'G (WHEN OFFERED)'],
      ]),
      scanner: stage('A SCANNER FIELD', [
        ['WALK IN STEP', 'HOLD E BESIDE A LIT WALKER'],
        ['KEEP PACE', 'WASD TOWARD THE ARCH'],
        ['LET GO OF A WALKER', 'WALK BACK'],
        ['SHOW WHAT MATTERS', 'HOLD TAB'],
      ]),
      clamp: stage('THE WIRE CLAMP', [
        ['WIRE CLAMP', 'DRAG THE COPPER END · OR E'],
        ['TALK / INSPECT', 'E / ENTER'],
        ['WALK', 'WASD / ARROWS · CLICK THE GROUND'],
      ]),
      board: stage('THE TICKET BOARD', [
        ['MOVE A CARD', 'DRAG IT · TAB, ARROWS'],
        ['THE 1978 LENS', 'DRAG IT OVER A CARD · L'],
        ['PUNCH', 'CLICK · ENTER'],
        ['STEP AWAY', 'ESC'],
      ]),
      lens: stage('THE 1978 LENS', [
        ['MOVE THE LENS', 'DRAG IT · ARROWS'],
        ['PUT IT DOWN', 'LET GO · L'],
        ['MOVE A CARD', 'DRAG IT · TAB'],
        ['STEP AWAY', 'ESC'],
      ]),
    }),
    aliases: Object.freeze({ streets: 'city', walk: 'city', scanners: 'scanner', field: 'scanner', wire: 'clamp', ticket: 'board', tickets: 'board' }),
    entry: entry('CHAPTER 3 · ECHO CITY', [
      ['WALK', 'WASD / ARROWS · CLICK THE GROUND'],
      ['TALK / INSPECT', 'E / ENTER'],
      ['SHOW WHAT MATTERS', 'HOLD TAB'],
    ], [
      ['NOW', 'E speaks to people and inspects things.'],
      ['NOW', 'No jumping in the city: Space has nothing to do here.'],
      ['NEW', 'A click on the ground walks Butch there.'],
    ]),
  }),
  // Chapter 4 · THE PAINTED COUNTRY. Stages are the rooms (chapter4Resume
  // room ids): the gallery car, the studio, the yard, the line ahead.
  chapter4: Object.freeze({
    id: 'chapter4',
    title: 'THE PAINTED COUNTRY',
    all: CHAPTER_CONTROLS.paintedCountry,
    basics: list(SIDE_MOVE, SIDE_JUMP, ['PAINT', 'LEFT MOUSE · DRAG'], ['WASH / TAKE', 'RIGHT MOUSE'], ['READ / INTERACT', 'E / ENTER']),
    stages: Object.freeze({
      gallery: stage('I · UNDER THE GOUACHE', [
        SIDE_MOVE,
        SIDE_JUMP,
        ['PAINT PAPER', 'LEFT MOUSE · DRAG, NEAR BUTCH'],
        ['WASH IT AWAY', 'RIGHT MOUSE'],
        ['RESTART THE ROOM', 'HOLD R'],
      ]),
      studio: stage('II · THE STILL LIFE', [
        ['PAINT A COLOUR', 'LEFT MOUSE'],
        ['WASH / TAKE', 'RIGHT MOUSE'],
        SIDE_MOVE,
        ['READ / INTERACT', 'E / ENTER'],
      ]),
      yard: stage('III · THE PAINTED TRAIN', [
        ['TAKE A PIGMENT', 'RIGHT MOUSE ON IT'],
        ['PAINT THE TRAIN', 'LEFT MOUSE'],
        SIDE_MOVE,
        SIDE_JUMP,
        ['READ / INTERACT', 'E / ENTER'],
      ]),
      line: stage('THE LINE AHEAD', [
        ['PAINT THE TRACK IN', 'LEFT MOUSE · AHEAD OF THE TRAIN'],
        ['WASH PAPER OFF THE LINE', 'RIGHT MOUSE'],
        SIDE_MOVE,
        SIDE_JUMP,
        ['RESTART', 'HOLD R'],
      ]),
    }),
    aliases: Object.freeze({ painting: 'gallery', train: 'line', 'final-train': 'line', pigments: 'yard', drawing: 'studio' }),
    // one Phaser scene per room (painted-country-main.js)
    probe: sceneStage({ PaintedCountry: 'gallery', DrawingStudio: 'studio', PigmentTrain: 'yard', PaintedLine: 'line' }),
    entry: entry('CHAPTER 4 · THE PAINTED COUNTRY', [
      SIDE_MOVE,
      SIDE_JUMP,
      ['PAINT', 'LEFT MOUSE'],
      ['WASH', 'RIGHT MOUSE'],
    ], [
      ['NEW', 'The mouse is a brush: left paints paper, right washes it away.'],
      ['SAME', 'Space still jumps; E still reads.'],
    ]),
  }),
  // Chapter 5 · THE MUSEUM OF ONE ANSWER (museum-3d.html, first person).
  chapter5: Object.freeze({
    id: 'chapter5',
    title: 'THE MUSEUM OF ONE ANSWER',
    all: CHAPTER_CONTROLS.museum,
    basics: list(['WALK', 'WASD / ARROWS'], ['LOOK', 'MOUSE · CLICK TO TAKE IT'], ['JUMP', 'SPACE'], ['INTERACT / READ', 'E / ENTER · LEFT CLICK']),
    stages: Object.freeze({
      walk: stage('THE HALLS', [
        ['WALK', 'WASD / ARROWS'],
        ['LOOK', 'MOUSE · CLICK TO TAKE IT'],
        ['JUMP', 'SPACE'],
        ['INTERACT / READ', 'E / ENTER · LEFT CLICK'],
        ['SLOT THE KEYS', 'HOLD E'],
      ]),
      exhibit: stage('AN EXHIBIT', [
        ['READ ON', 'E / ENTER · CLICK THE TEXT'],
        ['LOOK CLOSER', 'CLICK THE PAPER'],
        ['STEP BACK', 'ESC'],
      ]),
    }),
    aliases: Object.freeze({ halls: 'walk', museum: 'walk', exhibits: 'exhibit', case: 'exhibit' }),
    entry: entry('CHAPTER 5 · THE MUSEUM OF ONE ANSWER', [
      ['WALK', 'WASD / ARROWS'],
      ['LOOK', 'MOUSE'],
      ['JUMP', 'SPACE'],
      ['INTERACT', 'E / ENTER'],
    ], [
      ['NEW', 'First person: the mouse turns your head. Click once to take it.'],
      ['NOW', 'No brush here. A left click reads and opens.'],
    ]),
  }),
  // Chapter 5 · the one-answer exhibit (the Chapter 1 panel verbs).
  oneAnswer: Object.freeze({
    id: 'oneAnswer',
    title: 'THE ONE-ANSWER EXHIBIT',
    all: CHAPTER_CONTROLS.oneAnswer,
    basics: list(DRAG_WINDOW, ['LOOK CLOSER', 'CLICK A TAG · TAB, ENTER'], STEP_BACK, ['PUNCH-HOLE LENS', 'DRAG IT · L'], ['BACK TO THE MUSEUM', 'ESC']),
    stages: Object.freeze({
      exhibit: stage('THE ONE-ANSWER EXHIBIT', [
        DRAG_WINDOW,
        ['LOOK CLOSER', 'CLICK A TAG · TAB, ENTER'],
        STEP_BACK,
        ['PUNCH-HOLE LENS', 'DRAG IT · L'],
        ['BACK TO THE MUSEUM', 'ESC'],
      ], { diagrams: ['swap'] }),
    }),
    probe: () => 'exhibit',
    entry: null,
  }),
  // Chapter 5 · Door 4, the Labyrinth.
  labyrinth: Object.freeze({
    id: 'labyrinth',
    title: 'THE LABYRINTH',
    all: CHAPTER_CONTROLS.labyrinth,
    basics: list(['MOVE', 'WASD / ARROWS'], ['AIM YOUR GAZE', 'MOUSE'], ['HOLD YOUR GAZE', 'HOLD Q'], ['SHIELD', 'SHIFT'], ['STAIRS / TAKE', 'E']),
    stages: Object.freeze({}),
    entry: null,
  }),
  // Chapter 6 · ALL WORLDS AT ONCE, the Conductor (final-boss.html): four
  // movements, one per carriage.
  chapter6: Object.freeze({
    id: 'chapter6',
    title: 'ALL WORLDS AT ONCE',
    all: CONDUCTOR_CONTROLS,
    basics: list(['MOVE', 'WASD / ARROWS'], ['ACT / SPEAK', 'E / ENTER'], ['DASH', 'SHIFT']),
    stages: Object.freeze({
      movement1: stage('I · NIGHT SERVICE', [
        ['MOVE', 'WASD / ARROWS'],
        ['PUNCH / ACT', 'E / ENTER · LEFT CLICK'],
        ['LENS', 'MOUSE · L LETS IT CIRCLE YOU'],
        ['DASH', 'SHIFT'],
      ]),
      movement2: stage('II · ON THE BELL', [
        ['MOVE', 'WASD / ARROWS'],
        ['LISTEN (NEXT BELL)', 'HOLD Q'],
        ['ACT', 'E / ENTER'],
        ['DASH', 'SHIFT'],
      ]),
      movement3: stage('III · TWO TRUE THINGS', [
        ['CHOOSE WHAT TO SAY', '1 / 2'],
        ['SPEAK FACE TO FACE', 'E / ENTER AT THE LIT FRONT'],
        ['MOVE', 'WASD / ARROWS'],
        ['DASH', 'SHIFT'],
      ]),
      movement4: stage('IV · THE PAINTED COUNTRY', [
        ['ABSORB THE COLOUR', 'HOLD E · HOLD RIGHT MOUSE'],
        ['RETURN IT', 'HOLD R · HOLD LEFT MOUSE'],
        ['MOVE', 'WASD / ARROWS'],
        ['DASH', 'SHIFT'],
      ]),
    }),
    aliases: Object.freeze({
      1: 'movement1', 2: 'movement2', 3: 'movement3', 4: 'movement4',
      i: 'movement1', ii: 'movement2', iii: 'movement3', iv: 'movement4',
    }),
    entry: entry('CHAPTER 6 · ALL WORLDS AT ONCE', [
      ['MOVE', 'WASD / ARROWS'],
      ['ACT / SPEAK', 'E / ENTER'],
      ['DASH', 'SHIFT'],
    ], [
      ['NOW', 'E is ‘act’ and ‘speak face to face’. There is no jumping here.'],
      ['NEW', 'Shift dashes. Each movement adds one verb, shown as it comes.'],
    ]),
  }),
  // Chapter 6 · the five-stone route, THE BLACK TICKET (hidden-final-boss.html).
  blackTicket: Object.freeze({
    id: 'blackTicket',
    title: 'THE BLACK TICKET',
    all: CHAPTER_CONTROLS.blackKnife,
    basics: CHAPTER_CONTROLS.blackKnife,
    stages: Object.freeze({}),
    entry: entry('CHAPTER 6 · THE BLACK TICKET', [
      ['MOVE', 'WASD / ARROWS'],
      ['PUNCH', 'HOLD SPACE · LEFT CLICK'],
      ['DASH', 'HOLD SHIFT'],
      ['SHIELD', 'E · RIGHT CLICK'],
    ], [
      ['NEW', 'A shield raised on the bell keeps its charge.'],
    ]),
  }),
  trueEnding: Object.freeze({ id: 'trueEnding', title: 'THE TRUE ENDING', all: CHAPTER_CONTROLS.trueEnding, basics: CHAPTER_CONTROLS.trueEnding, stages: Object.freeze({}), entry: null }),
  cutscene: Object.freeze({ id: 'cutscene', title: 'THE NIGHT SERVICE', all: CHAPTER_CONTROLS.cutscene, basics: CHAPTER_CONTROLS.cutscene, stages: Object.freeze({}), entry: null }),
});

// Every name a chapter may use for its set.
const SET_ALIASES = Object.freeze({
  nightServicePanels: 'chapter1', nightService: 'chapter1', ch1: 'chapter1', 1: 'chapter1',
  borrowedLight: 'chapter2', ch2: 'chapter2', 2: 'chapter2',
  echoCity: 'chapter3', presentCity: 'chapter3', ch3: 'chapter3', 3: 'chapter3',
  paintedCountry: 'chapter4', ch4: 'chapter4', 4: 'chapter4',
  museum: 'chapter5', museum3d: 'chapter5', ch5: 'chapter5', 5: 'chapter5',
  conductor: 'chapter6', finalBoss: 'chapter6', ch6: 'chapter6', 6: 'chapter6',
  blackKnife: 'blackTicket', hiddenBoss: 'blackTicket', 'black-knife': 'blackTicket',
});

// The page each set belongs to (the pause menu's fallback when a page passes
// an inline list, like final-boss.html).
const PAGE_SETS = Object.freeze({
  'night-service.html': 'chapter1',
  'borrowed-light.html': 'chapter2',
  'car03-3d.html': 'chapter3',
  'painted-country.html': 'chapter4',
  'chapter05-painted-country.html': 'chapter4',
  'museum-3d.html': 'chapter5',
  'one-answer.html': 'oneAnswer',
  'labyrinth.html': 'labyrinth',
  'final-boss.html': 'chapter6',
  'hidden-final-boss.html': 'blackTicket',
  'true-ending.html': 'trueEnding',
  'index.html': 'cutscene',
});

/** The set id for any name a chapter may use (see the header), or null. */
export function resolveControlSetId(chapter) {
  if (chapter === null || chapter === undefined || chapter === '') return null;
  const key = String(chapter).trim();
  if (CONTROL_SETS[key]) return key;
  const alias = SET_ALIASES[key] ?? SET_ALIASES[key.toLowerCase()] ?? SET_ALIASES[key.replace(/^chapter[-_ ]?/i, '')];
  return alias && CONTROL_SETS[alias] ? alias : null;
}

/** The set a full CHAPTER_CONTROLS list belongs to (the same frozen array). */
export function controlSetIdForList(rows) {
  if (!Array.isArray(rows)) return null;
  const key = Object.keys(CHAPTER_CONTROLS).find((name) => CHAPTER_CONTROLS[name] === rows);
  return key ? resolveControlSetId(key) : null;
}

/** The set of a page, from its path (`/final-boss.html` → chapter6). */
export function controlSetIdForPage(pathname = '/') {
  const page = String(pathname).split('?')[0].split('/').pop() || 'index.html';
  return PAGE_SETS[page] ?? null;
}

/** The stage key inside `set` for a stage name or alias, or null. */
export function resolveStageId(set, stageId) {
  if (!set || stageId === null || stageId === undefined || stageId === '') return null;
  const key = String(stageId).trim();
  if (set.stages?.[key]) return key;
  const lower = key.toLowerCase();
  const normal = lower.replace(/^(?:movement|phase|act|section|stage|room)[-_ ]?/, '');
  const alias = set.aliases?.[key] ?? set.aliases?.[lower] ?? set.aliases?.[normal];
  if (alias && set.stages?.[alias]) return alias;
  return Object.keys(set.stages ?? {}).find((name) => name.toLowerCase() === lower) ?? null;
}

const rowsOf = (rows) => (Array.isArray(rows) ? rows.filter((row) => Array.isArray(row) && row.length >= 2).map(([a, k]) => [String(a), String(k)]) : []);

/**
 * What the pause menu shows (pure; tests/controlsStage.test.mjs):
 *   rows       the 3–5 rows for now (event rows › the stage's › the basics)
 *   label      the stage's name, when one is known
 *   diagrams   tiny drag diagrams to draw above the rows (Chapter 1)
 *   all        the full list (the page's own, else the set's)
 *   expandable whether ALL CONTROLS has anything more to show
 *   source     'event' | 'stage' | 'basics' | 'page'
 */
export function pauseControlsView({ setId = null, stage = null, eventControls = null, label = null, full = null, probe = true } = {}) {
  const set = CONTROL_SETS[resolveControlSetId(setId)] ?? null;
  const all = rowsOf(full).length ? rowsOf(full) : rowsOf(set?.all);
  const own = rowsOf(eventControls);
  let view;
  if (own.length) {
    const known = set ? resolveStageId(set, stage) : null;
    view = { rows: own, label: label ?? (known ? set.stages[known].name : null), diagrams: known ? [...set.stages[known].diagrams] : [], source: 'event', stage: known ?? (stage ?? null) };
  } else {
    const wanted = stage ?? (probe && typeof set?.probe === 'function' ? set.probe() : null);
    const known = set ? resolveStageId(set, wanted) : null;
    if (known) {
      const entryStage = set.stages[known];
      view = { rows: rowsOf(entryStage.rows), label: label ?? entryStage.name, diagrams: [...entryStage.diagrams], source: 'stage', stage: known };
    } else if (set) {
      view = { rows: rowsOf(set.basics), label: label ?? null, diagrams: [], source: 'basics', stage: null };
    } else {
      // an unknown page: its own list, cut to the first five rows
      view = { rows: all.slice(0, 5), label: label ?? null, diagrams: [], source: 'page', stage: null };
    }
  }
  const shown = new Set(view.rows.map(([a, k]) => `${a}\u0000${k}`));
  const expandable = all.length > 0 && all.some(([a, k]) => !shown.has(`${a}\u0000${k}`));
  return { ...view, all, expandable, setId: set?.id ?? null };
}

/** The chapter-entry card's content for a set (null when it has none). */
export function chapterCardSpec(chapter) {
  const id = resolveControlSetId(chapter);
  const spec = id ? CONTROL_SETS[id].entry : null;
  if (!spec) return null;
  return { id, title: spec.title, rows: rowsOf(spec.rows), changed: spec.changed.map(([tag, text]) => ({ tag: String(tag), text: String(text) })) };
}
