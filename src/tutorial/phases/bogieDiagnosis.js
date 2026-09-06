// Phase V — READ THE BOGIE orchestration — SYSTEM ARC LOCK §5.
// Pure logic: no Phaser, no DOM, no rendering.
//
// A real test stand does not ask the operator to parse two animated trucks at
// once.  One A/B selector routes the same calibrated TEST to each bogie in
// turn.  The player must record A's normal response, return TEST to OFF,
// select B, and repeat.  Only that pair of observations unlocks diagnosis.
// Both bogies still read the SAME shared systems — the contactor/current from the
// shared motorAdhesion, the axle load the player fixed in Phase IV, and air
// from the shared airNetwork — so the contradiction is genuine, never staged:
//   front: contactor closed -> current up -> brake released -> wheels turn
//   rear:  contactor closed -> current up -> LINE PRESSURISED -> load normal
//          -> wheels DO NOT turn
// Every upstream signal is normal; the break is local. The locked fault for
// this build is 'brake-actuator-seized' on the REAR bogie (lock §11).
//
// The normal bogie is fed by the main reservoir header; the faulty bogie's
// LOCAL feed is the airNetwork 'brake' branch. Servicing that branch is the
// Gate 0 safe repair chain, and it can only be done on the rear bogie — the
// healthy side has no service cocks and cannot be stripped by mistake:
//   1. brake-isolate  cut the local branch off the header
//   2. brake-vent     HOLD to bleed it flat (fail-safe: the clamp bites as
//                     pressure falls — that bite is the safe state, not a
//                     failure)
//   3. service-lock   seat the steel pin. Refuses while the line is live or
//                     pressurised — the pin cannot seat against a charged
//                     actuator (bogieSnapshot's own interlock)
//   4. repair         free the seized piston. Requires ALL THREE: isolated,
//                     pressure < safeRepairPressure, service lock seated
//   5. service-lock   withdraw the pin (same device, second press)
//   6. brake-isolate  restore the supply; the branch recharges
//   7. TEST           both bogies turn — the contradiction is gone
//
// Fail-safe semantics (Gate 0, do not mix conventions): pressure RELEASES the
// brake; loss of pressure CLAMPS it. Low pressure alone is never a safe-work
// condition — the service lock is.
//
// The motor's Phase IV state is not inherited blindly: enter() resets the
// shared motor (clearing the completed car move) and the caller re-applies
// the PERSISTENT load every frame via update(delta, loadInput) — the trolley
// stayed home, so the drive axle keeps its weight. TEST here is the same
// grammar as Phase IV: a toggle that energizes the contactor chain.
//
// Events:
//   'test-energized' / 'test-de-energized'
//   'brake-branch-isolated' / 'brake-branch-restored'
//   'brake-vent-opened' / 'brake-vent-closed'
//   'service-lock-engaged' / 'service-lock-removed'      (forwarded, id: 'rear')
//   'brake-released' / 'brake-applied'                   (forwarded, per bogie id)
//   'bogie-repaired'                                      (forwarded)
//   'fault-localized'    the live A/B comparison proves the break is local
//   'control-bounce'     { command, reason } refusal — local clunk, no reset
//   'stage-complete'     one-shot: the repaired bogie turns under TEST

import { createBogie } from './bogieSnapshot.js';

export const BOGIE_DIAGNOSIS_DEFAULTS = Object.freeze({
  faultyBogie: 'rear',
  fault: 'brake-actuator-seized',
});

export const BOGIE_SERVICE_PROMPTS = Object.freeze({
  testOff: '[E] TEST BOTH BOGIES',
  testOn: '[E] CUT THE TEST',
  isolateOpen: '[E] CUT OFF THE LOCAL BRAKE LINE',
  isolateClosed: '[E] RESTORE THE LOCAL BRAKE LINE',
  vent: '[HOLD E] BLEED THE LOCAL LINE',
  lockFree: '[E] SEAT THE SERVICE PIN',
  lockEngaged: '[E] WITHDRAW THE SERVICE PIN',
  repair: '[E] FREE THE SEIZED PISTON',
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function createBogieDiagnosis({ airNetwork, motor, config = {} } = {}) {
  if (!airNetwork || !motor) {
    throw new Error('createBogieDiagnosis requires the shared airNetwork and motorAdhesion instances');
  }
  const faultyId = config?.faultyBogie === 'front' ? 'front' : BOGIE_DIAGNOSIS_DEFAULTS.faultyBogie;
  const healthyId = faultyId === 'rear' ? 'front' : 'rear';
  const bogies = {
    [healthyId]: createBogie({ id: healthyId }),
    [faultyId]: createBogie({ id: faultyId, fault: config?.fault ?? BOGIE_DIAGNOSIS_DEFAULTS.fault }),
  };

  let entered = false;
  let stageComplete = false;
  let faultLocalized = false;
  let selectedBogie = healthyId;
  let observations = { front: null, rear: null };
  let events = [];

  function brakeBranch() {
    return airNetwork.snapshot().branches.brake;
  }

  function branchState() {
    const branch = brakeBranch();
    return { branchIsolated: branch.isolated, branchPressure: branch.pressure };
  }

  function enter() {
    if (entered) return;
    entered = true;
    // The Phase IV car move is done; the LOAD it found persists through the
    // caller's update(delta, loadInput), not through motor memory.
    motor.reset();
  }

  function interact(command) {
    if (!entered || stageComplete) {
      events.push({ type: 'control-bounce', command, reason: 'inactive' });
      return false;
    }
    if (command === 'select-front' || command === 'select-rear') {
      if (motor.snapshot().energized) {
        events.push({ type: 'control-bounce', command, reason: 'return-test-off' });
        return false;
      }
      selectedBogie = command === 'select-front' ? 'front' : 'rear';
      events.push({ type: 'bogie-selected', id: selectedBogie });
      return true;
    }
    if (command === 'test') {
      const next = !motor.snapshot().energized;
      motor.setEnergized(next);
      events.push({ type: next ? 'test-energized' : 'test-de-energized', id: selectedBogie });
      return true;
    }
    if (command === 'inspect-actuator') {
      const motorSnap = motor.snapshot();
      const healthy = bogieSnapshot(healthyId, motorSnap);
      const faulty = bogieSnapshot(faultyId, motorSnap);
      const liveComparison = selectedBogie === faultyId
        && motorSnap.energized
        && observations[healthyId]
        && observations[faultyId]
        && healthy.wheelTurning
        && !faulty.wheelTurning
        && faulty.linePressure >= 60;
      if (!liveComparison) {
        const reason = !observations[healthyId] || !observations[faultyId]
          ? 'compare-both-bogies'
          : selectedBogie !== faultyId
            ? 'select-faulty-bogie'
            : 'no-live-comparison';
        events.push({ type: 'control-bounce', command, reason });
        return false;
      }
      if (!faultLocalized) {
        faultLocalized = true;
        events.push({
          type: 'fault-localized',
          id: faultyId,
          evidence: ['current-arrives', 'line-pressurized', 'piston-stationary'],
        });
      }
      return true;
    }
    if (command === 'brake-isolate') {
      const next = !brakeBranch().isolated;
      airNetwork.setIsolated('brake', next);
      airNetwork.drainEvents();
      events.push({ type: next ? 'brake-branch-isolated' : 'brake-branch-restored' });
      return true;
    }
    if (command === 'service-lock') {
      const faulty = bogies[faultyId];
      if (faulty.snapshot({}).serviceLockEngaged) {
        faulty.removeServiceLock();
        forwardBogieEvents();
        return true;
      }
      if (faulty.engageServiceLock(branchState())) {
        forwardBogieEvents();
        return true;
      }
      events.push({ type: 'control-bounce', command, reason: 'line-live' });
      return false;
    }
    if (command === 'repair') {
      const faulty = bogies[faultyId];
      if (faulty.isRepaired()) {
        events.push({ type: 'control-bounce', command, reason: 'already-repaired' });
        return false;
      }
      if (!faultLocalized) {
        events.push({ type: 'control-bounce', command, reason: 'fault-not-localized' });
        return false;
      }
      const state = branchState();
      if (faulty.repair(state)) {
        forwardBogieEvents();
        return true;
      }
      const reason = !state.branchIsolated
        ? 'not-isolated'
        : state.branchPressure >= 20
          ? 'still-pressurized'
          : 'no-service-lock';
      events.push({ type: 'control-bounce', command, reason });
      return false;
    }
    events.push({ type: 'control-bounce', command, reason: 'unknown' });
    return false;
  }

  // The bleed is a HOLD, same hand grammar as Section III and the old
  // pressure line: the valve only stays open while the key is down.
  function setVentHeld(held) {
    if (!entered || stageComplete) return;
    const next = Boolean(held);
    if (brakeBranch().venting === next) return;
    airNetwork.setVenting('brake', next);
    events.push({ type: next ? 'brake-vent-opened' : 'brake-vent-closed' });
  }

  function forwardBogieEvents() {
    [bogies.front, bogies.rear].forEach((bogie) => {
      bogie.drainEvents().forEach((evt) => events.push(evt));
    });
  }

  function bogieSnapshot(id, motorSnap) {
    const linePressure = id === faultyId
      ? brakeBranch().pressure
      : airNetwork.snapshot().reservoirPressure;
    return bogies[id].snapshot({ motorSnap, brakeLinePressure: linePressure });
  }

  // loadInput: { trolleyX, suspensionHealth } — the persistent Phase IV load,
  // supplied by the integration layer from the world state every frame.
  function update(dtMs, loadInput = {}) {
    if (!entered) return;
    const dt = Math.max(0, dtMs);
    airNetwork.update(dt);
    airNetwork.drainEvents();
    motor.setLoadInput({
      trolleyX: clamp01(typeof loadInput.trolleyX === 'number' ? loadInput.trolleyX : 1),
      suspensionHealth: clamp01(
        typeof loadInput.suspensionHealth === 'number' ? loadInput.suspensionHealth : 1,
      ),
    });
    motor.update(dt);
    motor.drainEvents(); // the car does not move again in this room

    const motorSnap = motor.snapshot();
    [bogies.front, bogies.rear].forEach((bogie) => {
      bogie.update(dt, {
        motorSnap,
        brakeLinePressure: bogie.id === faultyId
          ? brakeBranch().pressure
          : airNetwork.snapshot().reservoirPressure,
      });
    });
    forwardBogieEvents();

    if (motorSnap.energized) {
      const observed = bogieSnapshot(selectedBogie, motorSnap);
      observations = {
        ...observations,
        [selectedBogie]: {
          linePressure: observed.linePressure,
          pistonTravel: observed.brakeReleased ? 1 : 0,
          wheelTurning: observed.wheelTurning,
        },
      };
    }

    if (!stageComplete && bogieSnapshot(faultyId, motorSnap).wheelTurning) {
      stageComplete = true;
      events.push({ type: 'stage-complete', id: faultyId });
    }
  }

  function snapshot() {
    const motorSnap = motor.snapshot();
    const branch = brakeBranch();
    return {
      entered,
      brake: {
        pressure: branch.pressure,
        isolated: branch.isolated,
        venting: branch.venting,
        flow: branch.flow,
      },
      motor: motorSnap,
      front: bogieSnapshot('front', motorSnap),
      rear: bogieSnapshot('rear', motorSnap),
      faultyBogie: faultyId,
      faultLocalized,
      selectedBogie,
      observations: {
        front: observations.front ? { ...observations.front } : null,
        rear: observations.rear ? { ...observations.rear } : null,
      },
      stageComplete,
    };
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  function reset() {
    entered = false;
    stageComplete = false;
    faultLocalized = false;
    selectedBogie = healthyId;
    observations = { front: null, rear: null };
    events = [];
    bogies.front.reset();
    bogies.rear.reset();
    bogies[faultyId].setFault(config?.fault ?? BOGIE_DIAGNOSIS_DEFAULTS.fault);
    motor.reset();
  }

  return {
    enter,
    interact,
    setVentHeld,
    update,
    snapshot,
    drainEvents,
    reset,
  };
}
