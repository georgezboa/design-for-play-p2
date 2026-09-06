// Phase VI (junction-6) PAST RIDES THE LOAD — world prompts for the engage
// stand: terse, on the device, never the answer. The handle only speaks once
// the first observation loop has mechanically unlocked it (VISIBLE SYSTEM ARC
// CORRECTION §4), and after that the OFFER ITSELF is the window signal: while
// the motor is off the prompt appears only during the open departure window.
// E still physically answers outside the window — the stale lesson is kept —
// but the stand never advertises a dead action.
export const ECHO_LOAD_PROMPTS = Object.freeze({
  testOff: '[E] ENGAGE TRACTION',
  testOn: '[E] DISENGAGE TRACTION',
});

// Pure prompt decision for the echo-load stand. `snap` is the echoReplay
// snapshot ({ stageComplete, observationLoop, motor: { energized },
// windowActive }). Returns the prompt string, or null when the stand stays
// silent.
export function echoLoadPromptFor(snap) {
  if (!snap || snap.stageComplete) return null;
  // Mechanically barred for the whole first observation loop: no prompt, no
  // offer. The rhythm must be WATCHED once before the stand answers.
  if (snap.observationLoop) return null;
  if (snap.motor?.energized) return ECHO_LOAD_PROMPTS.testOn;
  return snap.windowActive ? ECHO_LOAD_PROMPTS.testOff : null;
}
