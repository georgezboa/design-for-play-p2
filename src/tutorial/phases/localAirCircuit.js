// Phase III — LOCAL AIR CIRCUIT (SYSTEM ARC LOCK §3).
// Pure logic: no Phaser, no DOM, no rendering.
//
// The ONE new concept: an air branch that keeps being refilled. The player
// holds BLEED and watches the vent pulse fight the supply pulse while the
// needle parks above the release band; then traces the pipe back, closes
// ISOLATE, bleeds again, and the door cylinder retracts the latch.
//
// TRUTH DIVISION (corrected — no `|| complete` fakery):
//   airNetwork       owns PHYSICS: real pressures, and whether the latch is
//                    currently released (snap.doorLatch.released).
//   localAirCircuit  owns the PUZZLE STAGE: the door state chain
//                    LOCKED -> RELEASED -> OPENING -> OPEN.
//   The module never masks the physical snapshot; doorLatchReleased in
//   snapshot() is the raw airNetwork truth, even after completion.
//
// Door state chain:
//   LOCKED     latch engaged (pressure above the release band)
//   RELEASED   pressure dropped below threshold: cylinder retracted, latch
//              free — emits 'door-release-ready' once per entry. The stage is
//              NOT complete: the door leaf has not moved yet. If supply is
//              restored now the latch re-bites and the door returns to LOCKED.
//   OPENING    integration acknowledged the event and started the door-leaf
//              animation (beginDoorOpening()).
//   OPEN       integration confirmed the leaf passed its open threshold
//              (confirmDoorOpened()). A mechanical pawl now holds the door:
//              re-pressurising the branch must NOT close it, and only now is
//              the stage complete (one 'stage-complete' event, passage
//              allowed).
//
// confirmDoorOpened() only succeeds from RELEASED or OPENING — the latch
// must be physically free first. Repeated animation callbacks are idempotent:
// no duplicate events.
//
// Interaction model (Part 0.2 verbs):
//   interact('isolate')         toggles the branch isolation valve
//   update(dt, { bleedHeld })   holding E on the bleed wheel vents the branch
// There is deliberately no LATCH button: the latch is a passive mechanical
// consumer.
//
// Failure vocabulary (all mechanical, all recoverable in place):
//   bleeding against supply  needle stalls at the vent floor, supply pulses
//                            keep arriving, latch travel springs back
//   premature un-isolate     while RELEASED/OPENING the latch re-bites and
//                            the door re-locks (visible), player just closes
//                            the valve again
// The supply-stall hint fires ONCE, and only after a full readable pulse
// cycle (stallNoticeMs, default 1100ms — calibrated by browser playtest):
// before any text appears the player must have SEEN the vent pulse, the
// counter-pushing supply pulse, the needle parked above the release band
// and the cylinder trying to retract and getting shoved back. The line never
// names ISOLATE: 'STILL REFILLING — TRACE THE PIPE BACK'.
//
// Events:
//   'supply-stall-first'   first sustained stall against live supply
//   'door-release-ready'   latch physically released (per LOCKED->RELEASED)
//   'door-relocked'        supply restored before the door opened
//   'stage-complete'       door reached OPEN (one-shot)
//   plus forwarded airNetwork events (branch-isolated / branch-restored /
//   door-latch-released / door-latch-reengaged)

export const LOCAL_AIR_CIRCUIT_DEFAULTS = Object.freeze({
  // One full, readable visual pulse cycle against live supply before the
  // one-time hint. Initial value 1100ms; browser playtest may recalibrate
  // within 1000–1200ms (lock §11 process: recalibration writes back here).
  stallNoticeMs: 1100,
});

export const LOCAL_AIR_CIRCUIT_PROMPTS = Object.freeze({
  isolateOpen: '[E] CLOSE ISOLATOR',
  isolateClosed: '[E] OPEN ISOLATOR',
  bleed: '[HOLD E] BLEED THE LINE',
  supplyStall: 'STILL REFILLING — TRACE THE PIPE BACK',
});

export const DOOR_STATES = Object.freeze(['LOCKED', 'RELEASED', 'OPENING', 'OPEN']);

function resolveStallNoticeMs(config) {
  const raw = config?.stallNoticeMs;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0
    ? raw
    : LOCAL_AIR_CIRCUIT_DEFAULTS.stallNoticeMs;
}

export function createLocalAirCircuit(config = {}) {
  const airNetwork = config?.airNetwork;
  if (!airNetwork || typeof airNetwork.update !== 'function') {
    throw new Error('createLocalAirCircuit requires an injected airNetwork instance');
  }
  const stallNoticeMs = resolveStallNoticeMs(config);

  let entered = false;
  let destroyed = false;
  let doorState = 'LOCKED';
  let bleedHeld = false;
  let supplyStallMs = 0;
  let firstStallSeen = false;
  let stageCompleteFired = false;
  let events = [];

  function airSnapshot() {
    return airNetwork.snapshot();
  }

  function atVentFloor(snap) {
    const floor = Math.min(snap.tuning.ventOpenFloor, snap.reservoirPressure);
    return snap.branches.door.pressure <= floor + 0.001;
  }

  function isStageComplete() {
    return doorState === 'OPEN';
  }

  function enter() {
    if (entered) return;
    entered = true;
  }

  function interact(target) {
    if (destroyed || !entered) return false;
    if (target === 'isolate') {
      const branch = airSnapshot().branches.door;
      airNetwork.setIsolated('door', !branch.isolated);
      // Forward immediately: valve feedback must not wait for the next frame.
      airNetwork.drainEvents().forEach((evt) => events.push(evt));
      return true;
    }
    return false;
  }

  // Integration hook: the door-leaf animation has started in the world.
  function beginDoorOpening() {
    if (destroyed || doorState !== 'RELEASED') return false;
    doorState = 'OPENING';
    return true;
  }

  // Integration hook: the door leaf actually passed its open threshold.
  // Idempotent — repeated animation callbacks never re-fire events.
  function confirmDoorOpened() {
    if (destroyed) return false;
    if (doorState !== 'RELEASED' && doorState !== 'OPENING') return false;
    doorState = 'OPEN';
    if (!stageCompleteFired) {
      stageCompleteFired = true;
      events.push({ type: 'stage-complete' });
    }
    return true;
  }

  function update(dtMs, input = {}) {
    if (destroyed || !entered) return;
    const dt = Math.max(0, dtMs);

    bleedHeld = Boolean(input.bleedHeld);
    // Once the door is OPEN the lesson is done: no pointless hissing.
    airNetwork.setVenting('door', bleedHeld && !isStageComplete());
    airNetwork.update(dt);

    const snap = airSnapshot();
    const branch = snap.branches.door;
    const latchReleased = snap.doorLatch.released; // physical truth

    // Door state chain.
    if (doorState === 'LOCKED' && latchReleased) {
      doorState = 'RELEASED';
      events.push({ type: 'door-release-ready' });
    } else if ((doorState === 'RELEASED' || doorState === 'OPENING') && !latchReleased) {
      // Supply restored before the door actually opened: the latch re-bites.
      doorState = 'LOCKED';
      events.push({ type: 'door-relocked' });
    }
    // OPEN is pawl-held: latch physics may re-engage, the door stays open.

    // Stalled against live supply: venting, not isolated, parked at the
    // floor. Sustain a full pulse cycle before the one-time hint.
    const stalled = bleedHeld && !branch.isolated && atVentFloor(snap);
    if (stalled && !firstStallSeen) {
      supplyStallMs += dt;
      if (supplyStallMs >= stallNoticeMs) {
        firstStallSeen = true;
        events.push({ type: 'supply-stall-first' });
      }
    } else if (!stalled) {
      supplyStallMs = 0;
    }

    // Forward shared-network events so the integration layer has one drain
    // point for this stage's feedback.
    airNetwork.drainEvents().forEach((evt) => events.push(evt));
  }

  function snapshot() {
    const snap = airSnapshot();
    const branch = snap.branches.door;
    const stalled = bleedHeld && !branch.isolated && atVentFloor(snap);
    return {
      entered,
      bleedHeld,
      isolateClosed: branch.isolated,
      stalledOnSupply: stalled,
      firstStallSeen,
      // Three separate truths — never collapsed into each other:
      doorLatchReleased: snap.doorLatch.released, // raw airNetwork physics
      doorState, // puzzle-side door chain: LOCKED|RELEASED|OPENING|OPEN
      stageComplete: isStageComplete(), // only OPEN completes the stage
      door: {
        pressure: branch.pressure,
        flow: branch.flow,
        venting: branch.venting,
      },
      tuning: snap.tuning,
    };
  }

  function isComplete() {
    return isStageComplete();
  }

  function reset() {
    doorState = 'LOCKED';
    bleedHeld = false;
    supplyStallMs = 0;
    firstStallSeen = false;
    stageCompleteFired = false;
    events = [];
    airNetwork.reset();
  }

  function destroy() {
    destroyed = true;
    events = [];
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  return {
    enter,
    interact,
    beginDoorOpening,
    confirmDoorOpened,
    update,
    snapshot,
    isComplete,
    reset,
    destroy,
    drainEvents,
  };
}
