// Chapter 6 · ALL WORLDS AT ONCE — the controls of each set piece (round 12).
//
// The unified keys (round 6): Space only jumps; E or Enter is the piece's
// action; Shift / X dashes; Esc pauses. Round 12 adds what the new ways to
// play need, and nothing hidden: S / ↓ ducks in the side-on run, WASD /
// arrows move in the top-down square, the standoff answers with a direction
// (the card at that hand), and the painted line holds E to paint.
//
// The pause menu shows the current stage's 3–5 controls first. The shell owns
// that menu (src/shell), so this chapter only describes its stages and says
// when the stage changes:
//   window 'nightfall:controls-stage' { chapter: 'final-boss', stage, controls }
// Pure data plus the pad reader; tests/finalBoss/round12Controls.test.mjs.

export const CONTROLS_STAGE_EVENT = 'nightfall:controls-stage';
export const CONTROLS_CHAPTER = 'final-boss';

const JUMP = Object.freeze(['JUMP', 'SPACE · HOLD FOR HIGHER']);
const DASH = Object.freeze(['DASH', 'SHIFT / X']);
const PAUSE = Object.freeze(['PAUSE', 'ESC']);
const rows = (...list) => Object.freeze(list.map((row) => Object.freeze([...row])));

// Stage ids are the set pieces' ids (setPieces/sequence.js), plus the
// departure once the night service is alongside.
export const FINALE_STAGE_CONTROLS = Object.freeze({
  'roof-run': rows(['RUN', 'A / D · ← →'], JUMP, ['DUCK · SLIDE UNDER A GANTRY', 'S / ↓'], ['PUNCH A BRASS CLAIM BACK', 'E / ENTER / CLICK · AS IT REACHES YOU'], DASH),
  'return-to-sender': rows(['MOVE ACROSS THE ROOF', 'A / D · ← →'], ['PUNCH IT BACK', 'E / ENTER / CLICK · AS IT LANDS IN THE BRASS RING'], ['JUMP A SACK', 'SPACE'], DASH),
  'on-the-bell': rows(['RUN', 'A / D · ← →'], JUMP, ['PUNCH A LAMP', 'E / ENTER · IT FIRES ON THE NEXT BELL'], ['DASH', 'SHIFT / X · ONCE IN THE AIR']),
  'bell-tower': rows(['MOVE', 'A / D · ← →'], ['JUMP · JUMP THE BELL’S RING', 'SPACE · HOLD FOR HIGHER'], ['PUNCH THE BELL', 'E · AS IT STRIKES'], DASH),
  'false-claims': rows(['MOVE', 'WASD / ARROWS'], ['DASH THROUGH THE WORDS', 'SHIFT / X'], ['SAY BOTH TRUE THINGS', 'E / ENTER / CLICK · UNDER HIM'], PAUSE),
  standoff: rows(['WAIT', 'FOR THE CLOCK, NOT FOR HIM'], ['A TRUE THING', '↑ ← → ↓ / WASD · THE CARD AT THAT HAND'], ['THE OTHER TRUE THING', 'ITS DIRECTION ON THE SECOND STROKE'], PAUSE),
  'painted-line': rows(['LEAN TO A LINE', 'A / D · ← →'], ['PAINT THE LINE AHEAD', 'HOLD E · OR HOLD THE MOUSE'], ['JUMP HIS BRUSH', 'SPACE']),
  departure: rows(['LEAN LEFT', 'A / ←'], ['JUMP ABOARD', 'SPACE'], PAUSE),
});

// Every control in the chapter, for ALL CONTROLS.
export const FINALE_ALL_CONTROLS = rows(
  ['MOVE', 'WASD / ARROWS · STICK'],
  JUMP,
  ['DUCK · SLIDE (THE ROOF RUN)', 'S / ↓'],
  DASH,
  ['ACT · PUNCH · SAY IT', 'E / ENTER · LEFT CLICK'],
  ['PAINT (THE PAINTED LINE)', 'HOLD E · HOLD THE MOUSE'],
  ['ANSWER (THE STANDOFF)', '↑ ← → ↓ / WASD · PAD: D-PAD OR Y X B A'],
  ['GAMEPAD', 'STICK MOVE · A JUMP · B / RB DASH · X ACT (HOLD TO PAINT) · STICK DOWN DUCK · START PAUSE'],
  ['FULLSCREEN', 'F'],
  PAUSE,
);

export function finaleStageControls(stage) {
  const list = FINALE_STAGE_CONTROLS[stage] ?? FINALE_STAGE_CONTROLS['roof-run'];
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

// The one line of keys on each set piece's card (where the verbs change).
export const PIECE_KEY_LINES = Object.freeze({
  'roof-run': 'SPACE · JUMP   ·   S · DUCK UNDER A GANTRY   ·   E · PUNCH A BRASS CLAIM BACK',
  'return-to-sender': 'E · PUNCH IT BACK AS IT LANDS   ·   SPACE · JUMP A SACK   ·   SHIFT · DASH',
  'on-the-bell': 'E · PUNCH A LAMP, IT FIRES ON THE BELL   ·   SPACE · JUMP ON THE BEAT',
  'bell-tower': 'SPACE · CLIMB, AND JUMP THE BELL’S RING   ·   E · PUNCH THE BELL AS IT STRIKES',
  'false-claims': 'WASD · MOVE   ·   SHIFT · DASH THROUGH   ·   E · SAY BOTH TRUE THINGS, UNDER HIM',
  standoff: 'WAIT FOR THE CLOCK   ·   ↑ ← → ↓ · ONE TRUE THING, THEN THE OTHER ON THE SECOND STROKE',
  'painted-line': 'A / D · LEAN TO A LINE   ·   HOLD E · PAINT THE DRAWN LINE AHEAD   ·   SPACE · JUMP',
});

// What a torn last layer costs, said once on each movement's card: each
// stretch of a set piece is its checkpoint (setPieces/kernel.js).
export const PROGRESS_KEPT_LINE = 'EVERY STRETCH IS A CHECKPOINT · A TORN LAST LAYER RESTARTS ONLY THE STRETCH';
export const STORY_KEPT_LINE = 'STORY · A TORN LAST LAYER UNDOES NOTHING';

// ---------------------------------------------------------------------------
// Gamepad (standard mapping): the same verbs as the keys.
//   left stick / D-pad  move (stick down ducks in the run)   A jump
//   B / RB dash   X act (hold to paint)   START pause
//   the standoff: D-pad, or Y ↑ X ← B → A ↓ (the face buttons' diamond)

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
    up: padPressed(pad, FINALE_PAD.up), down: padPressed(pad, FINALE_PAD.down), left: padPressed(pad, FINALE_PAD.left), right: padPressed(pad, FINALE_PAD.right),
    faceUp: padPressed(pad, FINALE_PAD.ret), faceLeft: padPressed(pad, FINALE_PAD.act), faceRight: padPressed(pad, FINALE_PAD.dash), faceDown: padPressed(pad, FINALE_PAD.jump),
  };
  const axes = pad?.axes ?? [];
  let moveX = deadzone(Number(axes[0]) || 0);
  let moveZ = deadzone(Number(axes[1]) || 0);
  if (buttons.left) moveX = -1;
  if (buttons.right) moveX = 1;
  if (buttons.up) moveZ = -1;
  if (buttons.down) moveZ = 1;
  const aimX = deadzone(Number(axes[2]) || 0, 0.3);
  const aimZ = deadzone(Number(axes[3]) || 0, 0.3);
  const pressed = Object.fromEntries(Object.entries(buttons).map(([key, down]) => [key, down && !previous?.[key]]));
  // A flick of the stick counts as a press of that direction (the standoff).
  const flick = Math.hypot(moveX, moveZ) > 0.75 ? (Math.abs(moveX) > Math.abs(moveZ) ? (moveX < 0 ? 'left' : 'right') : (moveZ < 0 ? 'up' : 'down')) : null;
  pressed.flick = flick && flick !== previous?.flick ? flick : null;
  buttons.flick = flick;
  return { connected: Boolean(pad), moveX, moveZ, aimX, aimZ, aimActive: Math.hypot(aimX, aimZ) > 0.05, buttons, pressed };
}

// The direction the standoff hears from a pad this poll (D-pad, the face
// diamond, or a stick flick), or null.
export function padDirection(pad) {
  if (!pad?.connected) return null;
  const p = pad.pressed;
  if (p.up || p.faceUp) return 'up';
  if (p.left || p.faceLeft) return 'left';
  if (p.right || p.faceRight) return 'right';
  if (p.down || p.faceDown) return 'down';
  return p.flick ?? null;
}
