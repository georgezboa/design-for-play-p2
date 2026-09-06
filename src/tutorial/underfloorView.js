// UNDERCARRIAGE VIEW TEACHING (III/IV Visual Polish Wave) — pure predicates
// for the look-down teaching layer. No Phaser imports, so the node test suite
// can lock every gate the scene wires up:
//
//   * `underfloor`      — machinery layout flag (IV/V/VI): the stage's gear
//                         lives in the deep underfloor band (underY = 690).
//   * `underfloorView`  — teaching flag (III, IV): the stage teaches the
//                         hold-S look-down verb. III carries ONLY this flag so
//                         its hand-placed air-circuit run (header y=545, gauge
//                         at wall eye height) is not relocated by the
//                         underfloor machinery branch.
//
// Lane keys are a world-1 verb; inside the tutorial car (world 0) W/S never
// switch lanes — S is the hold-to-look-down verb. That suppression already
// existed inline in GameScene.update(); it is extracted here so the gate is
// testable and so the camera, the input layer and the hint share one truth.

export function stageHasUnderfloorView(stage) {
  return Boolean(stage && (stage.underfloor || stage.underfloorView));
}

// The camera may only tilt down once the player has walked far enough into
// the stage for the machinery to be on screen (same +90 margin the camera
// used before this extraction).
export function canLookDownUnderfloor(stage, playerX) {
  return stageHasUnderfloorView(stage) && playerX > stage.startX + 90;
}

// V and VI turn the undercarriage into the room's primary play surface. A
// hold gesture makes that surface vanish as soon as the player releases the
// key, so these two rooms use a persistent toggle instead: one press looks
// down, the next press returns to the cab. Earlier teaching rooms retain the
// lighter hold gesture.
export function stageUsesPersistentUnderfloorView(stage) {
  return stage?.id === 'junction-5' || stage?.id === 'junction-6';
}

export function createPersistentUnderfloorState() {
  return { activeStageId: null, latched: false };
}

export function updatePersistentUnderfloorState(state, {
  stage,
  playerX,
  grounded,
  lookDownPressed,
  autoLookDown = false,
}) {
  const stageId = stage?.id ?? null;
  if (state.activeStageId !== stageId) {
    state.activeStageId = stageId;
    state.latched = false;
  }
  if (!stageUsesPersistentUnderfloorView(stage)) {
    state.latched = false;
    return false;
  }
  // VI's mandatory first observation pass hands control back without
  // snapping upright. It may begin before the player reaches the manual
  // look-down zone, so it is allowed to arm the latch independently.
  if (autoLookDown) state.latched = true;
  if (!canLookDownUnderfloor(stage, playerX) || !grounded) return false;
  if (lookDownPressed && !autoLookDown) state.latched = !state.latched;
  return state.latched;
}

// Full look-down resolution, mirroring the guard order in
// GameScene.updateTutorialCamera: world/camera-mode guards first, then the
// zone check, then the held key (or QA force), then grounded.
export function resolveUnderfloorLookDown({
  activeWorldIndex,
  cameraLocked,
  cinematic,
  relayCloseup,
  stage,
  playerX,
  grounded,
  lookDownHeld,
  forceLookDown,
}) {
  if (activeWorldIndex !== 0) return false;
  if (!cameraLocked || cinematic || relayCloseup) return false;
  if (!canLookDownUnderfloor(stage, playerX)) return false;
  return Boolean((lookDownHeld || forceLookDown) && grounded);
}

// W/S lane changes belong to the later worlds. In the tutorial car they are
// swallowed so S can be the look-down verb without a lane fight.
export function gateTutorialLaneInput({ activeWorldIndex, laneBack, laneFront }) {
  if (activeWorldIndex === 0) return { laneBack: false, laneFront: false };
  return { laneBack: Boolean(laneBack), laneFront: Boolean(laneFront) };
}

// ---------------------------------------------------------------- hint ---
// [HOLD S] / [S] prompt, screen-anchored (VISIBLE SYSTEM ARC CORRECTION §1). The
// weak/dwell model is abolished: III, IV and V ALL show the same strong
// prompt the moment the player steps into the underfloor readable zone —
// a first-time player cannot be expected to remember a verb taught two rooms
// ago, and a 2800ms dwell only read as "the game has nothing to say". V and
// VI are different: their undercarriage view is persistent, so they always
// expose the inverse action as well (INSPECT while upright, RETURN while
// down). VI's first observation loop still drives the camera automatically.
//
// In III/IV retirement is earned, not timed: the prompt only leaves once the
// player has genuinely held S and kept the camera visibly tilted down for
// UNDERFLOOR_HINT_LOOK_MS. V/VI keep their toggle prompt visible so the
// inverse action is never hidden. No prompt appears during cinematics, the
// relay close-up, or after the stage is complete.

export const UNDERFLOOR_HINT_LOOK_MS = 300;

export function createUnderfloorHintState() {
  return { retiredByStage: {}, lookMs: 0, activeStageId: null };
}

// One call per frame. Mutates `state` (look-down accumulation, per-stage
// retirement) and returns what the scene should show:
// { visible, style: 'strong'|null, action: 'inspect'|'return'|null }.
// 'weak' no longer exists.
export function updateUnderfloorHint(state, {
  stage,
  playerX,
  lookingDown,
  cinematic,
  relayCloseup,
  stageComplete,
  deltaMs,
}) {
  const hidden = { visible: false, style: null, action: null };
  if (!stage || cinematic || relayCloseup || stageComplete) return hidden;

  if (!stageHasUnderfloorView(stage)) return hidden;

  // V/VI use a toggle, so the inverse action must remain discoverable. This
  // also makes VI's automatic look-down handoff explicit instead of leaving
  // the player apparently trapped below the floor.
  if (stageUsesPersistentUnderfloorView(stage)) {
    if (playerX <= stage.startX + 90) return hidden;
    return {
      visible: true,
      style: 'strong',
      action: lookingDown ? 'return' : 'inspect',
    };
  }

  const stageId = stage.id ?? String(stage.startX);
  if (state.activeStageId !== stageId) {
    // Entering a new stage's zone re-arms the look-down timer; the retirement
    // record itself is per stage and survives the switch.
    state.activeStageId = stageId;
    state.lookMs = 0;
  }
  if (state.retiredByStage[stageId]) return hidden;

  // A real look-down: the key is held AND the camera has tilted (the scene
  // only reports lookingDown once the resolve gate passes). Accumulate only
  // while it stays down; releasing resets the earned time.
  if (lookingDown) {
    state.lookMs += Math.max(0, deltaMs ?? 0);
    if (state.lookMs >= UNDERFLOOR_HINT_LOOK_MS) {
      state.retiredByStage[stageId] = true;
      return hidden;
    }
    // Keep the prompt on screen during the first earned look-downs — it is
    // the instruction being followed, disappearing mid-gesture reads as a bug.
  } else {
    state.lookMs = 0;
  }

  return playerX > stage.startX + 90
    ? { visible: true, style: 'strong', action: 'inspect' }
    : hidden;
}
