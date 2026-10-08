// Chapter 6 · ALL WORLDS AT ONCE — the controls of each movement.
//
// Round 6 (playtest items 18 and 19): the unified keys. Space only jumps
// (the Conductor's square has a jump: it clears his trains and what he
// throws); E or Enter does the movement's action (return a case, punch a
// lamp or him, say it to his face, confirm an answer); Esc pauses. Movement
// IV's own verbs keep their keys (hold E absorbs, hold R returns).
//
// The pause menu shows the current stage's 3–5 controls first. The shell owns
// that menu (src/shell), so this chapter only describes its stages and says
// when the stage changes:
//   window 'nightfall:controls-stage' { chapter: 'final-boss', stage, controls }
// Pure data plus one dispatch helper; tests/finalBoss/round6.test.mjs drives it.

export const CONTROLS_STAGE_EVENT = 'nightfall:controls-stage';
export const CONTROLS_CHAPTER = 'final-boss';

const MOVE = Object.freeze(['MOVE', 'WASD / ARROWS']);
const JUMP = Object.freeze(['JUMP', 'SPACE']);
const DASH = Object.freeze(['DASH', 'SHIFT / X']);
const PAUSE = Object.freeze(['PAUSE', 'ESC']);
const rows = (...list) => Object.freeze(list.map((row) => Object.freeze([...row])));

// Stage ids are the movement ids (spectacleBattle.js PHASES), plus the
// departure once the night service arrives.
export const FINALE_STAGE_CONTROLS = Object.freeze({
  lost: rows(MOVE, ['RETURN A CASE', 'E / ENTER / CLICK'], ['AIM THE LENS', 'MOUSE · L: IT CIRCLES YOU'], JUMP, DASH),
  borrowed: rows(MOVE, ['PUNCH A LAMP · PUNCH HIM', 'E / ENTER'], ['LISTEN FOR THE BELL', 'HOLD Q'], JUMP, DASH),
  echo: rows(MOVE, ['CHOOSE WHAT YOU KNOW', '1 – 4 / CLICK'], ['SAY IT · TO HIS FACE', 'E / ENTER'], JUMP, DASH),
  painted: rows(MOVE, ['ABSORB A COLOUR', 'HOLD E · OR HOLD RIGHT MOUSE'], ['RETURN IT TO HIM', 'HOLD R · OR HOLD LEFT MOUSE'], JUMP, DASH),
  departure: rows(MOVE, ['JUMP ABOARD', 'SPACE / E'], PAUSE),
});

// Every control in the chapter, for ALL CONTROLS (the start board lists the
// same, movement by movement).
export const FINALE_ALL_CONTROLS = rows(
  MOVE, JUMP, DASH,
  ['ACT · CONFIRM', 'E / ENTER'],
  ['LENS (MOVEMENT I)', 'MOUSE · L LETS IT CIRCLE YOU · CLICK RETURNS A CASE'],
  ['LISTEN (MOVEMENT II)', 'HOLD Q'],
  ['ANSWER (MOVEMENT III)', '1 – 4 CHOOSE WHAT YOU KNOW · 1 / 2 HOW YOU SAY IT'],
  ['ABSORB (MOVEMENT IV)', 'HOLD E · OR HOLD RIGHT MOUSE ON IT'],
  ['RETURN (MOVEMENT IV)', 'HOLD R · OR HOLD LEFT MOUSE'],
  ['FULLSCREEN', 'F'],
  PAUSE,
);

export function finaleStageControls(stage) {
  const list = FINALE_STAGE_CONTROLS[stage] ?? FINALE_STAGE_CONTROLS.lost;
  return list.map((row) => [...row]);
}

// What the pause menu lists: the stage's own controls first, then the rest.
export function finalePauseControls(stage = null) {
  const first = stage && FINALE_STAGE_CONTROLS[stage] ? finaleStageControls(stage) : [];
  const seen = new Set(first.map(([label]) => label));
  return [...first, ...FINALE_ALL_CONTROLS.filter(([label]) => !seen.has(label)).map((row) => [...row])];
}

export function controlsStageDetail(stage) {
  return { chapter: CONTROLS_CHAPTER, stage, controls: finaleStageControls(stage) };
}

// Tell the shell the stage changed. Returns the detail sent (null when there
// is no window to send it to, e.g. under node).
export function announceControlsStage(stage, target = globalThis) {
  if (!target?.dispatchEvent || typeof CustomEvent !== 'function') return null;
  const detail = controlsStageDetail(stage);
  target.dispatchEvent(new CustomEvent(CONTROLS_STAGE_EVENT, { detail }));
  return detail;
}

// The one line of keys on each movement's title card (where the verbs change).
export const MOVEMENT_KEY_LINES = Object.freeze([
  'E / CLICK · RETURN A CASE   ·   MOUSE · AIM THE LENS (L: IT CIRCLES YOU)   ·   SPACE · JUMP',
  'E · PUNCH A LAMP, THEN HIM   ·   HOLD Q · LISTEN FOR THE BELL   ·   SPACE · JUMP',
  '1 – 4 · CHOOSE WHAT YOU KNOW   ·   E / ENTER · SAY IT   ·   SPACE · JUMP',
  'HOLD E · ABSORB THE NEAREST COLOUR   ·   HOLD R · RETURN IT   ·   OR HOLD RIGHT / LEFT MOUSE',
]);

// The rule every movement states once on entry (round 6, item 16): a torn
// last layer costs Butch his place, never what he has done.
export const PROGRESS_KEPT_LINES = Object.freeze([
  'TORN LAYERS COST YOU YOUR PLACE · RETURNED CASES STAY RETURNED',
  'TORN LAYERS COST YOU YOUR PLACE · A LANDED PUNCH STAYS LANDED',
  'TORN LAYERS COST YOU YOUR PLACE · WHAT YOU HAVE SAID STANDS',
  'TORN LAYERS COST YOU YOUR PLACE · RETURNED COLOUR STAYS RETURNED',
]);
