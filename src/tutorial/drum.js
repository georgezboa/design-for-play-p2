// The Living Timetable — section III pilot.
//
// Every other stage executes an ordered queue: punch order is execution order
// and the gap between actions is a hard-coded 540ms. This module replaces that
// for one stage with a rotating drum whose slots are *wide* — one card per
// machine, no blanks — so the gap between two commands is a slot width the
// player can see on the drum face and walk during.
//
// Everything here is reached only through `stage.drum`. No other stage touches
// this file.
//
// Four rules this model is built to satisfy, all of them reversals of the first
// draft, and all of them load-bearing:
//
//  1. FREE ENTRY. Nothing refuses a keypress. Any of BRAKE/VENT/DOOR can be
//     punched in any order, including an order that cannot possibly work. The
//     verdict comes from the machine during the run, never from the input layer,
//     and no message ever names the correct command or slot. Prior art is
//     unanimous here: no shipped puzzle game pre-validates entry.
//  2. NO EMPTY SLOTS. Cards append in punch order and fill the drum from slot 0.
//     The first draft asked the player to place emptiness to buy walking time,
//     which nobody thinks to do, and worse: the walk arithmetic made a gap the
//     *only* legal answer, so the "choose your spacing" feature was a lie.
//     Duration now lives in slot *width*, not slot count.
//  3. THE MACHINE FAILS AT THE FAILING STEP. A wrong order is not blocked; it
//     runs, and it breaks visibly where it breaks — a door that will not budge
//     against a charged pipe teaches the interlock better than any toast.
//  4. PRESENCE SLOTS WAIT. A slot needing the player's hand holds the drum open
//     rather than charring the instant the pointer arrives. Section VI already
//     works this way (`PAST waits indefinitely`), and Talos Principle shipped
//     the same conversion — a timing problem becomes a routing problem.
//
// Two engine facts this code is built around, both verified rather than assumed:
//
//  * `scene.applyHitstop()` scales `scene.time.timeScale`, and every Phaser
//    timer runs on that clock. A hitstop during a run would stretch the slots
//    and silently break the walk budget the layout is balanced against. So the
//    pointer is driven by the *unscaled* wall clock and slot boundaries are
//    derived from elapsed real time — never by one timer per slot.
//  * `inputState.interactHeld` is `k.interact.isDown` read raw, independent of
//    the 62px nearest-interactable picker. So the valve hold can use the drum's
//    own 70px presence radius without a dead zone between 62 and 70.

export const SLOT_EMPTY = null;

export function createSlots(count) {
  return Array.from({ length: count }, () => SLOT_EMPTY);
}

// A slot is either null or { command, status }, where status is:
//   'pending'  punched, not yet run
//   'done'     executed successfully; a re-run must skip it, not repeat it
//   'jammed'   the machine refused it in this order, or the hand never came
export function makeSlot(command) {
  return { command, status: 'pending' };
}

// Cards fill the drum left to right in punch order. There is no cursor and no
// slot dial: the player's punch order *is* the schedule, which is the one
// mental model they already have from sections I and II.
export function firstOpenSlot(drum) {
  return drum.slots.findIndex((slot) => slot === SLOT_EMPTY || slot.status === 'jammed');
}

export function ensureDrumState(puzzle, stage) {
  if (!stage.drum) return null;
  // Keyed by stage id, not by array index: stages carry `id`, and there is no
  // `index` field on them. Keying on undefined would rebuild the drum — and wipe
  // every completed slot — on every call.
  if (!puzzle.drum || puzzle.drum.stageId !== stage.id) {
    puzzle.drum = {
      stageId: stage.id,
      slots: createSlots(stage.drum.slots),
      command: null,
      editing: false,
      running: false,
      startedAt: 0,
      activeSlot: -1,
      // The pointer never parks: the drum keeps turning and a slot the player
      // failed to attend chars. `waiting` is the slot currently asking for a
      // hold, so the valve prompt and the lit slot on the drum face can show
      // the player which card is live right now. -1 means no slot is asking.
      waiting: -1,
      hold: null,
      timer: null,
    };
  }
  return puzzle.drum;
}

// Causal order is still enforced, but it is read off the *machine*, never off
// this run's slot list. On a re-run the BRAKE slot is skipped because it already
// succeeded, so a check that looked for BRAKE earlier in the current run would
// decide the brake was never set and char the valve forever.
export function causalBlocker(machine, command) {
  if (command === 'vent') return machine.brakeSet ? null : 'brake';
  if (command === 'door') return machine.ventSet ? null : 'vent';
  return null;
}

export function needsPresence(stage, command) {
  return Boolean(stage.drum.presence?.[command]);
}

export function holdMsFor(stage, command) {
  return stage.drum.holdMs?.[command] ?? 0;
}

export function isPlayerAt(scene, x, radius) {
  return Math.abs(scene.player.x - x) <= radius;
}

// Completion is read off the machine, never off the cards. A player who jams
// DOOR, re-punches it into a later slot and succeeds has three machines set and
// one dead card on the drum; judging by cards would soft-lock that run.
export function machineSatisfied(machine, commands) {
  return commands.every((command) => {
    if (command === 'brake') return machine.brakeSet;
    if (command === 'vent') return machine.ventSet;
    if (command === 'door') return machine.doorSet;
    return false;
  });
}

export function summarizeSlots(drum) {
  return drum.slots.map((slot) => {
    if (!slot) return '·';
    if (slot.status === 'done') return slot.command.toUpperCase();
    if (slot.status === 'jammed') return '✗';
    return slot.command.slice(0, 2).toUpperCase();
  });
}
