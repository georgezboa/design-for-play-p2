// Per-chapter control lists for the pause menu's SETTINGS panel, as
// [action, input] pairs. Each chapter page passes its own list to
// installPauseMenu({ controls }) so the panel never shows another chapter's
// scheme.
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
  borrowedLight: list(
    ['MOVE', 'A / D · ← →'],
    ['JUMP', 'SPACE · HOLD FOR HEIGHT'],
    ['PUNCH NODE', 'F / LEFT CLICK (THE MARKED NODE)'],
    ['TAKE BACK A PUNCH', 'HOLD F / HOLD CLICK ON IT'],
    ['LISTEN (NEXT BELL)', 'HOLD Q'],
    ['BORROW / GIVE LIGHT', 'E AT A LIT / DEAD NODE (BLACKOUT)'],
    ['INTERACT / READ', 'E'],
    ['GAMEPAD', 'STICK · A JUMP · X READ / LIGHT · RB PUNCH · LB LISTEN'],
    ['STUCK?', 'PAUSE · SHOW ME'],
    ['PAUSE', 'ESC / START'],
  ),
  echoCity: list(
    // Echo City: click-to-walk streets; scanner fields switch to direct
    // movement. F is free (fullscreen is the desktop bridge's F11).
    ['WALK', 'CLICK THE GROUND · A FAR CLICK STRIDES'],
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
    // Alpha round 4: in the order the punch needs.
    ['TICKET BOARD', 'LENS OVER BOTH TICKETS · STACK THEM · CLICK TO PUNCH'],
    ['BOARD BY KEYS', 'TAB + ARROWS · L LENS · SPACE PUNCH'],
    ['RESET CAMERA', 'R'],
    ['PAUSE', 'ESC'],
  ),
  // Chapter 4: the brush has three hands. The arrows and the right stick
  // aim a virtual cursor; A / D and the left stick walk.
  paintedCountry: list(
    ['MOVE', 'A / D · LEFT STICK'],
    ['JUMP', 'W / ↑ · PAD Y / RB'],
    ['AIM THE BRUSH', 'MOUSE · ARROW KEYS · RIGHT STICK'],
    ['PAINT / APPLY', 'LEFT MOUSE · SPACE · PAD A'],
    ['WASH / TAKE', 'RIGHT MOUSE · SHIFT · PAD B'],
    ['READ / INTERACT', 'E · PAD X'],
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
