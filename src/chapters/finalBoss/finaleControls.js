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
// departure once the night service arrives. Round 11 (the skill fight):
// every movement is move, jump, dash and one verb of its own.
export const FINALE_STAGE_CONTROLS = Object.freeze({
  lost: rows(MOVE, ['PUNCH A CLAIM BACK', 'E / ENTER / CLICK · AS IT LANDS'], ['AIM THE LENS', 'MOUSE / RIGHT STICK · IT LEADS YOU'], JUMP, DASH),
  borrowed: rows(MOVE, ['PUNCH A LAMP · PUNCH HIM', 'E / ENTER'], ['JUMP THE BELL’S RING', 'SPACE'], DASH, ['LISTEN FOR THE BELL', 'HOLD Q']),
  echo: rows(MOVE, ['STRIKE A TRUE THING', 'E / ENTER · THEN THE OTHER'], JUMP, DASH, PAUSE),
  painted: rows(MOVE, ['ABSORB WET COLOUR', 'HOLD E · OR HOLD RIGHT MOUSE'], ['RETURN IT WHEN HE IS OPEN', 'HOLD R · OR HOLD LEFT MOUSE'], JUMP, ['DASH · THROUGH A SWEEP TAKES ITS COLOUR', 'SHIFT / X']),
  departure: rows(MOVE, ['JUMP ABOARD', 'SPACE / E'], PAUSE),
});

// Every control in the chapter, for ALL CONTROLS (the start board lists the
// same, movement by movement).
export const FINALE_ALL_CONTROLS = rows(
  MOVE, JUMP, DASH,
  ['ACT · CONFIRM', 'E / ENTER'],
  ['LENS (MOVEMENT I)', 'MOUSE OR RIGHT STICK AIMS IT · OTHERWISE IT LEADS YOU · CLICK PUNCHES'],
  ['LISTEN (MOVEMENT II)', 'HOLD Q'],
  ['TRUE THINGS (MOVEMENT III)', 'E ON ONE, THEN E ON THE OTHER · AT THE LIT EDGE, E'],
  ['ABSORB (MOVEMENT IV)', 'HOLD E · OR HOLD RIGHT MOUSE ON IT'],
  ['RETURN (MOVEMENT IV)', 'HOLD R · OR HOLD LEFT MOUSE'],
  ['GAMEPAD', 'STICK MOVE · A JUMP · B DASH · X ACT / ABSORB · Y RETURN · LB LISTEN · RIGHT STICK LENS · START PAUSE'],
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
  'E / CLICK · PUNCH A CLAIM BACK AS IT LANDS   ·   MOUSE · AIM THE LENS   ·   SPACE · JUMP',
  'E · PUNCH A LAMP, THEN HIM   ·   SPACE · JUMP THE BELL’S RING   ·   SHIFT · DASH',
  'E · STRIKE ONE TRUE THING, THEN THE OTHER   ·   SPACE · JUMP',
  'HOLD E · ABSORB WET COLOUR   ·   HOLD R · RETURN IT WHEN HE IS OPEN   ·   SHIFT · DASH THROUGH A SWEEP',
]);

// What a torn last layer costs, said once on each movement's title card:
// a phase is its checkpoint (conductorFight.js createFightRunner).
export const PROGRESS_KEPT_LINES = Object.freeze([
  'EACH PHASE IS A CHECKPOINT · A TORN LAST LAYER RESTARTS ONLY THE PHASE',
  'EACH PHASE IS A CHECKPOINT · A TORN LAST LAYER RESTARTS ONLY THE PHASE',
  'EACH PHASE IS A CHECKPOINT · A TORN LAST LAYER RESTARTS ONLY THE PHASE',
  'EACH PHASE IS A CHECKPOINT · A TORN LAST LAYER RESTARTS ONLY THE PHASE',
]);
export const STORY_KEPT_LINE = 'STORY · A TORN LAST LAYER UNDOES NOTHING';

// ---------------------------------------------------------------------------
// Gamepad (standard mapping): the same verbs as the keys.
//   left stick / D-pad  move           A jump        B / RB dash
//   X  act (Movement IV: hold to absorb)            Y hold to return (IV)
//   LB hold to listen (II)   right stick  aims the lens (I)   START pause

export const FINALE_PAD = Object.freeze({
  jump: 0, dash: 1, act: 2, ret: 3, listen: 4, dashAlt: 5, start: 9, up: 12, down: 13, left: 14, right: 15, deadzone: 0.24,
});

const padPressed = (pad, index) => Boolean(pad?.buttons?.[index]?.pressed);
const deadzone = (v, dz = FINALE_PAD.deadzone) => (Math.abs(v) < dz ? 0 : (v - Math.sign(v) * dz) / (1 - dz));

// Read the first connected pad. `previous` is the last call's `buttons`
// (for presses: true only on the poll a button goes down).
export function readFinalePad(pads, previous = null) {
  const pad = [...(pads ?? [])].find((entry) => entry && entry.connected !== false) ?? null;
  const buttons = {
    jump: padPressed(pad, FINALE_PAD.jump), dash: padPressed(pad, FINALE_PAD.dash) || padPressed(pad, FINALE_PAD.dashAlt), act: padPressed(pad, FINALE_PAD.act),
    ret: padPressed(pad, FINALE_PAD.ret), listen: padPressed(pad, FINALE_PAD.listen), start: padPressed(pad, FINALE_PAD.start),
  };
  const axes = pad?.axes ?? [];
  let moveX = deadzone(Number(axes[0]) || 0);
  let moveZ = deadzone(Number(axes[1]) || 0);
  if (padPressed(pad, FINALE_PAD.left)) moveX = -1;
  if (padPressed(pad, FINALE_PAD.right)) moveX = 1;
  if (padPressed(pad, FINALE_PAD.up)) moveZ = -1;
  if (padPressed(pad, FINALE_PAD.down)) moveZ = 1;
  const aimX = deadzone(Number(axes[2]) || 0, 0.3);
  const aimZ = deadzone(Number(axes[3]) || 0, 0.3);
  const pressed = Object.fromEntries(Object.entries(buttons).map(([key, down]) => [key, down && !previous?.[key]]));
  return { connected: Boolean(pad), moveX, moveZ, aimX, aimZ, aimActive: Math.hypot(aimX, aimZ) > 0.05, buttons, pressed };
}
