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
  borrowedGrid: list(
    ['MOVE', 'A / D · ← →'],
    ['JUMP', 'SPACE'],
    ['INTERACT', 'E'],
    ['RESTART FROM CHECKPOINT', 'R'],
    ['PAUSE', 'ESC'],
  ),
  echoCity: list(
    ['WALK', 'CLICK THE GROUND'],
    ['TALK / INSPECT', 'CLICK A PERSON OR OBJECT · E / ENTER'],
    ['CONTINUE DIALOGUE', 'CLICK · E / ENTER'],
    ['SHOW INTERACTABLES', 'HOLD TAB'],
    ['RESET CAMERA', 'R'],
    ['FULLSCREEN', 'F'],
    ['PAUSE', 'ESC'],
  ),
  paintedCountry: list(
    ['MOVE', 'A / D · ← →'],
    ['JUMP', 'SPACE / W / ↑'],
    ['PAINT', 'LEFT MOUSE · CLICK OR DRAG'],
    ['WASH', 'RIGHT MOUSE'],
    ['READ / INTERACT', 'E'],
    ['RESTART', 'R'],
    ['PAUSE', 'ESC'],
  ),
  museum: list(
    ['MOVE', 'WASD / ARROWS'],
    ['LOOK', 'MOUSE (CLICK TO CAPTURE)'],
    ['JUMP', 'SPACE'],
    ['INTERACT', 'E / ENTER / LEFT CLICK'],
    ['RELEASE MOUSE', 'ESC'],
    ['PAUSE', 'ESC AGAIN'],
  ),
  labyrinth: list(
    ['MOVE', 'WASD / ARROWS'],
    ['SHIELD', 'SPACE'],
    ['RESTART', 'R'],
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
