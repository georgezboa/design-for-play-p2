// Per-chapter control lists for the pause menu's SETTINGS panel, as
// [action, input] pairs. Each chapter page passes its own list to
// installPauseMenu({ controls }) so the panel never shows another chapter's
// scheme.
const list = (...rows) => Object.freeze(rows.map((row) => Object.freeze(row)));

export const CHAPTER_CONTROLS = Object.freeze({
  // Chapter 1 panel puzzle (night-service.html). Mouse first; every verb
  // also has a keyboard fallback.
  nightServicePanels: list(
    ['MOVE A WINDOW', 'DRAG IT · ARROWS + SPACE'],
    ['LOOK CLOSER', 'CLICK A TAG · TAB + ENTER'],
    ['STEP BACK', 'RIGHT-CLICK · WHEEL DOWN · BACKSPACE'],
    ['LIFT A FRAME', 'HOLD ITS EDGE · F'],
    ['PUNCH-HOLE LENS', 'DRAG IT · L + ARROWS'],
    ['CONTINUE / READ', 'CLICK · ENTER'],
    ['PAUSE', 'ESC'],
  ),
  borrowedLight: list(
    ['MOVE', 'A / D · ← →'],
    ['JUMP', 'SPACE · HOLD FOR HEIGHT'],
    ['PUNCH NODE', 'F / LEFT CLICK'],
    ['LISTEN (NEXT BELL)', 'HOLD Q'],
    ['INTERACT / READ', 'E'],
    ['GAMEPAD', 'STICK · A JUMP · X READ · RB PUNCH · LB LISTEN'],
    ['PAUSE', 'ESC / START'],
  ),
  echoCity: list(
    // Echo City: click-to-walk streets; scanner fields switch to direct
    // movement. F is free (fullscreen is the desktop bridge's F11).
    ['WALK', 'CLICK THE GROUND'],
    ['TALK / INSPECT', 'CLICK A TAG · E / ENTER'],
    ['CONTINUE DIALOGUE', 'CLICK · E / ENTER'],
    ['SHOW WHAT MATTERS', 'HOLD TAB'],
    ['SCANNER FIELDS', 'WASD / ARROWS · OR HOLD THE MOUSE'],
    ['WALK BESIDE · LET GO', 'E NEXT TO A LIT WALKER'],
    ['TICKET BOARD', 'DRAG CARDS AND LENS · CLICK TO PUNCH'],
    ['BOARD BY KEYS', 'TAB + ARROWS · L LENS · SPACE PUNCH'],
    ['RESET CAMERA', 'R'],
    ['PAUSE', 'ESC'],
  ),
  // Chapter 4: the brush has three hands. The arrows and the right stick
  // aim a virtual cursor; A / D and the left stick walk.
  paintedCountry: list(
    ['MOVE', 'A / D · LEFT STICK'],
    ['JUMP', 'W · PAD Y / RB'],
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
  blackKnife: list(
    ['MOVE', 'WASD / ARROWS'],
    ['SHOOT', 'Z / SPACE / LEFT CLICK'],
    ['SHIELD ×3', 'X / C'],
    ['BOOST', 'SHIFT'],
    ['BATTLE PAUSE', 'P'],
    ['MENU', 'ESC'],
  ),
  trueEnding: list(
    ['CONTINUE', 'ENTER / SPACE'],
    ['PAUSE', 'ESC'],
  ),
});
