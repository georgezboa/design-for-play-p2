// The Unfiled Ending (docs/STORY_BIBLE.md, true ending), as data. Times are
// seconds from the page opening; the page (trueEnding-main.js) plays it and
// keeps input locked until REVEAL_ENDS, except the films' hold-to-skip.

export const TRUE_ENDING_SCRIPT = Object.freeze([
  Object.freeze({ at: 2.4, panel: 'carriage' }),
  Object.freeze({ at: 3.6, stamp: 'ECHO RECORD · WITHDRAWN', a: 'The Mara ahead of Butch was never ahead of him.' }),
  Object.freeze({ at: 7.6, b: 'She was an echo the Conductor filed: a record of Mara made to walk, so Butch would keep riding and the line would keep running.' }),
  Object.freeze({ at: 14.2, panel: 'city', stamp: 'CLAIM 1978-0412 · TWO CLAIMS', a: 'The real Mara lived both her lives in 1978.' }),
  Object.freeze({ at: 18.0, b: 'A rented room by the terminal for the early shift. The orchard house in Bellwether at weekends, where her sister Rosa lived.' }),
  Object.freeze({ at: 24.4, panel: 'platform', stamp: 'BELLWETHER · REQUEST STOP', a: 'Butch gets off at Bellwether.', b: '' }),
  Object.freeze({ at: 29.4, panel: 'door', stamp: 'THE ORCHARD HOUSE', a: 'He leaves the orchard case at Rosa’s door.', b: '' }),
  Object.freeze({ at: 35.0, final: 'line' }),
  Object.freeze({ at: 38.2, final: 'stamp' }),
]);

// Input (other than hold-to-skip) stays locked until the reveal has ended.
export const REVEAL_ENDS = 40;

export const FINAL_LINES = Object.freeze(['The property was lost, not Mara.', 'CLAIM 1978-0412 · CLOSED.']);

// Everything the script has shown by time t (for the page and for tests).
export function scriptStateAt(t) {
  const state = { panel: null, stamp: '', a: '', b: '', finalLine: false, finalStamp: false, revealEnded: t >= REVEAL_ENDS };
  for (const beat of TRUE_ENDING_SCRIPT) {
    if (beat.at > t) break;
    if (beat.panel) state.panel = beat.panel;
    if (beat.stamp !== undefined) state.stamp = beat.stamp;
    if (beat.a !== undefined) { state.a = beat.a; state.b = ''; }
    if (beat.b !== undefined) state.b = beat.b;
    if (beat.final === 'line') state.finalLine = true;
    if (beat.final === 'stamp') state.finalStamp = true;
  }
  return state;
}
