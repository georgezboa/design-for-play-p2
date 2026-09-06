// Phase IV — WEIGHT / ADHESION orchestration — SYSTEM ARC LOCK §4.
// Pure logic: no Phaser, no DOM, no rendering.
//
// The Phase II contactor chain can energize the traction motor, but the
// wheels free-rev: the damaged air suspension plus the service counterweight
// leave the drive bogie short of axle load. The player repairs the suspension
// branch of the SHARED airNetwork (the same instance Phase III used — never a
// private copy, lock §2.1) and drives the counterweight trolley over the
// drive bogie, then TESTs the motor again.
//
// Damage model on the shared network's 'suspension' branch:
//   enter(): the branch is found ISOLATED and VENTING (a stuck drain cock on
//   a cut-off line) and has long since leaked to zero. Two physical devices,
//   either order, both required:
//     level-drain  closes the vent (the hissing stops; pressure holds at ~0
//                  because the line is still cut off from the supply)
//     level-supply opens the isolation (the header recharges the bags at
//                  supplyRatePerSec; closing the drain first is what makes
//                  this stick — a line open to atmosphere floors at the
//                  Phase III vent equilibrium and can never charge)
//   Opening the supply while the drain still vents floors at ventOpenFloor,
//   whose health caps the axle load BELOW the hysteresis floor even with the
//   trolley fully home: the leak cannot be muscled through (see
//   motorAdhesion.js locked constants).
//
// Trolley: continuous position in [0,1]; 0 = parked at the maintenance end
// (front), 1 = fully over the drive bogie (rear). The player grabs it and
// walks it. Every grab session is sampled into a traceContract-compatible
// trajectory (lock §2.4): Phase IV is the ONLY producer, Phase VI the only
// consumer. Markers follow the frozen contract:
//   left-extreme  first sample at normalizedX <= 0.15
//   center-cross  first crossing of 0.5 in either direction
//   right-extreme first sample at normalizedX >= 0.85
//   settled       final sample, stamped when the car finishes moving
// The trolley starts at 0, so a natural solve (push it all the way home)
// collects all four markers without any prompting.
//
// TEST follows the interlocked test-handle grammar used by real traction
// stands: the operator prepares the machine, returns the handle to OFF after
// an unsuccessful test, then deliberately applies TEST again.  A handle left
// live while the counterweight is moved cannot silently become a successful
// test.  That attempt is latched STALE and keeps free-revving until reset.
// This prevents ordinary D movement from crossing a hidden threshold and
// completing the room without a final player decision.
//
// Events:
//   'suspension-drain-closed'    leak sealed (hiss stops)
//   'suspension-supply-opened'   header admitted to the bags
//   'control-bounce'             { command } device pressed in a state where
//                                it has nothing to do — local clunk, no reset
//   'trolley-grabbed' / 'trolley-released'
//   'motor-energized' / 'motor-de-energized'
//   'wheel-spin-start'           forwarded from motorAdhesion
//   'wheel-bite'                 forwarded from motorAdhesion
//   'car-move-complete'          car reached the aligned position
//   'stage-complete'             one-shot, same step as car-move-complete

import { TRACE_VERSION, TRACE_MARKERS, summarizeTrace } from './traceContract.js';

export const WEIGHT_TRANSFER_DEFAULTS = Object.freeze({
  trolleySpeedPerSec: 0.22,
  sampleIntervalMs: 60,
  leftExtremeMax: 0.15,
  rightExtremeMin: 0.85,
  center: 0.5,
});

export const WEIGHT_TRANSFER_PROMPTS = Object.freeze({
  drainOpen: '[E] CLOSE THE DRAIN COCK',
  drainClosed: null,
  supplyClosed: '[E] OPEN THE LEVELLING VALVE',
  supplyOpen: null,
  trolleyFree: '[E] TAKE THE COUNTERWEIGHT',
  trolleyGrabbed: '[E] LET GO',
  testOff: '[E] TEST MOTOR',
  testOn: '[E] CUT MOTOR POWER',
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function resolveNumber(config, key) {
  const raw = config?.[key];
  return typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : WEIGHT_TRANSFER_DEFAULTS[key];
}

export function createWeightTransfer({ airNetwork, motor, config = {} } = {}) {
  if (!airNetwork || !motor) {
    throw new Error('createWeightTransfer requires the shared airNetwork and a motorAdhesion instance');
  }
  const tuning = Object.freeze({
    trolleySpeedPerSec: Math.max(0.0001, resolveNumber(config, 'trolleySpeedPerSec')),
    sampleIntervalMs: Math.max(1, resolveNumber(config, 'sampleIntervalMs')),
    leftExtremeMax: clamp01(resolveNumber(config, 'leftExtremeMax')),
    rightExtremeMin: clamp01(resolveNumber(config, 'rightExtremeMin')),
    center: clamp01(resolveNumber(config, 'center')),
  });

  let entered = false;
  let trolleyX = 0;
  let grabbed = false;
  let clockMs = 0;
  let firstGrabMs = null;
  let sampleClockMs = 0;
  let samples = [];
  let markersSeen = new Set();
  let stageComplete = false;
  let settledX = null;
  let testAttempt = 'idle'; // idle | stale | armed
  let resetNoticeSent = false;
  let events = [];

  function suspension() {
    return airNetwork.snapshot().branches.suspension;
  }

  // The damaged state: cut off from the header and venting through the stuck
  // drain cock. Long enough has passed that the bags are flat — simulated by
  // stepping the shared network, which leaves the other branches untouched
  // (door is sealed post-III, brake sits at reservoir pressure).
  function applyDamage() {
    airNetwork.setIsolated('suspension', true);
    airNetwork.setVenting('suspension', true);
    let guard = 0;
    while (suspension().pressure > 0 && guard < 40) {
      airNetwork.update(500);
      guard += 1;
    }
    airNetwork.drainEvents();
  }

  function recordSample(marker) {
    samples.push({ tMs: clockMs, normalizedX: trolleyX, marker: marker ?? null });
    if (marker) markersSeen.add(marker);
  }

  function enter() {
    if (entered) return;
    entered = true;
    applyDamage();
    // The trolley is found parked at the maintenance end: the trajectory's
    // first sample is the left extreme by construction.
    recordSample(TRACE_MARKERS.LEFT_EXTREME);
  }

  function interact(command) {
    if (!entered || stageComplete) {
      events.push({ type: 'control-bounce', command });
      return false;
    }
    if (command === 'level-drain') {
      if (suspension().venting) {
        airNetwork.setVenting('suspension', false);
        airNetwork.drainEvents();
        events.push({ type: 'suspension-drain-closed' });
        return true;
      }
      events.push({ type: 'control-bounce', command });
      return false;
    }
    if (command === 'level-supply') {
      if (suspension().isolated) {
        airNetwork.setIsolated('suspension', false);
        airNetwork.drainEvents();
        events.push({ type: 'suspension-supply-opened' });
        return true;
      }
      events.push({ type: 'control-bounce', command });
      return false;
    }
    if (command === 'test') {
      const next = !motor.snapshot().energized;
      motor.setEnergized(next);
      if (next) {
        testAttempt = readyForTest() ? 'armed' : 'stale';
        resetNoticeSent = false;
        events.push({ type: 'motor-energized', attempt: testAttempt });
      } else {
        testAttempt = 'idle';
        resetNoticeSent = false;
        events.push({ type: 'motor-de-energized' });
      }
      return true;
    }
    events.push({ type: 'control-bounce', command });
    return false;
  }

  function setTrolleyGrabbed(next) {
    if (!entered || stageComplete) return false;
    const value = Boolean(next);
    if (value === grabbed) return true;
    grabbed = value;
    if (grabbed && firstGrabMs === null) firstGrabMs = clockMs;
    sampleClockMs = 0;
    events.push({ type: grabbed ? 'trolley-grabbed' : 'trolley-released' });
    if (!grabbed) recordSample(null);
    return true;
  }

  // dir: -1 toward the front (maintenance end), +1 toward the drive bogie.
  function moveTrolley(dir, dtMs) {
    if (!grabbed || stageComplete) return trolleyX;
    const step = Math.sign(dir) * tuning.trolleySpeedPerSec * (Math.max(0, dtMs) / 1000);
    if (step === 0) return trolleyX;
    const previous = trolleyX;
    trolleyX = clamp01(trolleyX + step);
    if (trolleyX === previous) return trolleyX;

    // Contract markers, first occurrence only — duplicates would be stripped
    // by normalizeTrace anyway, so they are never emitted twice here.
    if (!markersSeen.has(TRACE_MARKERS.CENTER_CROSS)
      && (previous < tuning.center) !== (trolleyX < tuning.center)) {
      recordSample(TRACE_MARKERS.CENTER_CROSS);
    } else if (!markersSeen.has(TRACE_MARKERS.RIGHT_EXTREME)
      && trolleyX >= tuning.rightExtremeMin) {
      recordSample(TRACE_MARKERS.RIGHT_EXTREME);
    } else if (!markersSeen.has(TRACE_MARKERS.LEFT_EXTREME)
      && trolleyX <= tuning.leftExtremeMax) {
      recordSample(TRACE_MARKERS.LEFT_EXTREME);
    } else {
      sampleClockMs += Math.max(0, dtMs);
      if (sampleClockMs >= tuning.sampleIntervalMs) {
        sampleClockMs = 0;
        recordSample(null);
      }
    }
    return trolleyX;
  }

  function suspensionHealth() {
    return clamp01(suspension().pressure / 100);
  }

  function readyForTest() {
    const branch = suspension();
    return !grabbed
      && !branch.isolated
      && !branch.venting
      && branch.pressure >= 90
      && trolleyX >= tuning.rightExtremeMin;
  }

  function buildTrace() {
    // Rebased to the first grab: the minutes a player spends reading the room
    // before touching the counterweight are not choreography, and Phase VI
    // replays this loop as the past self's rhythm. The parked left-extreme
    // sample survives at t=0 — it is where the run starts by construction.
    const base = firstGrabMs ?? 0;
    const out = [];
    const parked = samples.find((s) => s.marker === TRACE_MARKERS.LEFT_EXTREME);
    if (parked) {
      out.push({ tMs: 0, normalizedX: parked.normalizedX, marker: TRACE_MARKERS.LEFT_EXTREME });
    }
    for (const s of samples) {
      if (s.tMs <= base) continue;
      if (s.marker === TRACE_MARKERS.LEFT_EXTREME) continue;
      out.push({ tMs: s.tMs - base, normalizedX: s.normalizedX, marker: s.marker });
    }
    out.sort((a, b) => a.tMs - b.tMs);
    const deduplicated = [];
    for (const s of out) {
      if (!deduplicated.length || s.tMs > deduplicated[deduplicated.length - 1].tMs) {
        deduplicated.push(s);
      }
    }
    const durationMs = Math.max(
      1,
      clockMs - base,
      deduplicated.length ? deduplicated[deduplicated.length - 1].tMs : 0,
    );
    return {
      version: TRACE_VERSION,
      durationMs,
      samples: deduplicated,
      settledX: settledX ?? trolleyX,
      source: 'player',
    };
  }

  function complete() {
    if (stageComplete) return;
    stageComplete = true;
    settledX = trolleyX;
    // Never overwrite a marker the player already earned (the contract keeps
    // only the first occurrence of each, and tMs must be strictly increasing),
    // so SETTLED is appended at the next free timestamp.
    const lastT = samples.length ? samples[samples.length - 1].tMs : -1;
    samples.push({
      tMs: clockMs > lastT ? clockMs : lastT + 1,
      normalizedX: trolleyX,
      marker: TRACE_MARKERS.SETTLED,
    });
    markersSeen.add(TRACE_MARKERS.SETTLED);
    events.push({ type: 'car-move-complete' });
    events.push({ type: 'stage-complete', trace: summarizeTrace(buildTrace()) });
  }

  function update(dtMs) {
    if (!entered) return;
    const dt = Math.max(0, dtMs);
    clockMs += dt;
    airNetwork.update(dt);
    airNetwork.drainEvents();
    // A traction handle applied before the machine was ready remains a stale
    // free-rev attempt.  Moving the trolley with D or waiting for pressure to
    // rise cannot turn it into a pass behind the player's back.
    const effectiveTrolleyX = motor.snapshot().energized && testAttempt === 'stale'
      ? 0
      : trolleyX;
    motor.setLoadInput({ trolleyX: effectiveTrolleyX, suspensionHealth: suspensionHealth() });
    motor.update(dt);
    motor.drainEvents().forEach((evt) => {
      if (evt.type === 'car-move-complete') {
        if (testAttempt === 'armed') complete();
        return;
      }
      events.push({ type: evt.type });
    });
    if (testAttempt === 'stale' && readyForTest() && !resetNoticeSent) {
      resetNoticeSent = true;
      events.push({ type: 'test-reset-required' });
    }
  }

  function snapshot() {
    const motorSnap = motor.snapshot();
    const branch = suspension();
    return {
      entered,
      trolleyX,
      grabbed,
      suspensionHealth: suspensionHealth(),
      suspension: {
        pressure: branch.pressure,
        isolated: branch.isolated,
        venting: branch.venting,
        flow: branch.flow,
      },
      motor: motorSnap,
      readyForTest: readyForTest(),
      testAttempt,
      stageComplete,
      trace: summarizeTrace(buildTrace()),
    };
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  function reset() {
    entered = false;
    trolleyX = 0;
    grabbed = false;
    clockMs = 0;
    firstGrabMs = null;
    sampleClockMs = 0;
    samples = [];
    markersSeen = new Set();
    stageComplete = false;
    settledX = null;
    testAttempt = 'idle';
    resetNoticeSent = false;
    events = [];
    motor.reset();
  }

  return {
    enter,
    interact,
    setTrolleyGrabbed,
    moveTrolley,
    update,
    snapshot,
    buildTrace,
    drainEvents,
    reset,
  };
}
