// Phase VI — PAST RIDES THE LOAD (SYSTEM ARC LOCK §6).
// Pure logic: no Phaser, no DOM, no rendering.
//
// The past self RE-RIDES the counterweight trolley along the trace the player
// actually produced in Phase IV (traceContract; canonical fallback when QA
// skips IV — lock §2.4). The echo's position periodically re-modulates drive
// -axle load: air suspension height, axle weight and usable adhesion all swing
// with it. The player cannot steer the past self; they can only ALIGN the
// systems they already learned with the rhythm they themselves recorded.
//
// Six-condition success chain (lock §6, local progress is never wiped):
//   1. interlockComplete  — Phase II relay TEST done        (input, read-only)
//   2. airPathOpen        — Phase III door line released    (input, read-only)
//   3. load window        — echo trace over the drive bogie (live rhythm)
//   4. bite               — motor energized INSIDE the window
//   5. bogiesSynced       — Phase V repaired branch released(input, read-only)
//   6. departure          — biting sustained biteHoldMs with 1/2/5 true
//
// Rider physics (VI-owned constant, locked here by tests, Appendix A.4): the
// past self RIDES the trolley, so at the peak of the trace the drive bogie
// carries trolley load + rider: effectiveDrive = baseDrive + riderBonus*x.
// With the shared loadBase/loadSpan (0.1/0.5) and a healed suspension this
// puts the bite threshold at echoX >= 0.75 — reachable by BOTH the canonical
// trace (peak 0.85) and any valid player trace, while centre-crossing
// (x ~ 0.5 -> 0.40) stays below the hysteresis floor. This is the only reason
// the canonical fallback remains completable (lock §2.4) without retuning the
// frozen Phase IV constants.
//
// Stale-spin rule (the timing lesson): energizing OUTSIDE the window free-revs
// the wheels. A free-revving wheel cannot re-grip when the load arrives — the
// attempt is marked 'stale' and keeps spinning through the window until the
// player releases TEST and re-engages. So holding TEST down from the start
// never wins; the player must read the rhythm and engage inside the window.
//
// Observation loop (lock §6): loop 0 is watch-only. TEST bounces with
// 'observe-first-loop' — no spinning, no penalty, no progress loss.
//
// Events:
//   'loop-start'        { loopIndex, observation }
//   'echo-marker'       { marker }                 semantic marker crossed
//   'window-opened' / 'window-closed'
//   'test-energized'    { inWindow }
//   'test-released'
//   'load-route-changed' { route }
//   'load-misrouted'    the replay load was sent to the reference bogie
//   'spinning-stale'    window arrived but the attempt was already free-revving
//   'bite-started'
//   'bite-broken'       window ended before the hold completed (hold resets)
//   'departure-started'
//   'stage-complete'
//   'control-bounce'    { command, reason }

import { normalizeTrace } from './traceContract.js';
import { createMotorAdhesion } from './motorAdhesion.js';

export const ECHO_REPLAY_DEFAULTS = Object.freeze({
  // effectiveDrive = baseDrive + riderBonus * echoX (see header). 0.1 puts the
  // window at echoX >= 0.75 with a healed suspension: canonical peaks inside
  // it, centre-crossing stays below the hysteresis floor.
  riderBonus: 0.1,
  // Sustained-bite time before the train commits to departure. Must fit inside
  // one hysteresis-extended bite (canonical: arms at echoX 0.75 / t~2857ms,
  // motor holds the bite until x<0.617 / t~4398ms — a ~1540ms window), so
  // 900ms reads as "one held decision" and always fits.
  biteHoldMs: 900,
  // Departure cinematic hand-off: the train keeps pulling this long before the
  // integration layer is told the stage is complete.
  departureMs: 2600,
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function resolveNumber(config, key) {
  const raw = config?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0
    ? raw
    : ECHO_REPLAY_DEFAULTS[key];
}

export function createEchoReplay(config = {}) {
  const tuning = Object.freeze({
    riderBonus: clamp01(resolveNumber(config, 'riderBonus')),
    biteHoldMs: resolveNumber(config, 'biteHoldMs'),
    departureMs: resolveNumber(config, 'departureMs'),
  });

  // normalizeTrace never throws and guarantees the four semantic markers —
  // illegal or missing player traces degrade to canonical (lock §2.4).
  const trace = normalizeTrace(config?.trace);
  const motor = config?.motor ?? createMotorAdhesion();

  let entered = false;
  let loopTMs = 0;
  let loopIndex = 0;
  let echoTrolleyX = trace.samples[0].normalizedX;
  let windowActive = false;
  let attempt = 'idle'; // 'idle' | 'armed' | 'stale' | 'misrouted' | 'biting'
  let loadRoute = 'front'; // deliberate wrong-safe default; Phase V taught B/rear is the repaired drive
  let biteHeldMs = 0;
  let departing = false;
  let departureElapsedMs = 0;
  let stageComplete = false;
  let lastMarker = null;
  let conditions = { interlock: false, airPath: false, synced: false };
  let events = [];

  function sampleAt(tMs) {
    const samples = trace.samples;
    if (tMs <= samples[0].tMs) return samples[0].normalizedX;
    for (let i = 1; i < samples.length; i += 1) {
      if (tMs <= samples[i].tMs) {
        const prev = samples[i - 1];
        const next = samples[i];
        const span = next.tMs - prev.tMs;
        const k = span <= 0 ? 1 : (tMs - prev.tMs) / span;
        return prev.normalizedX + (next.normalizedX - prev.normalizedX) * k;
      }
    }
    return samples[samples.length - 1].normalizedX;
  }

  function emitMarkersBetween(fromT, toT) {
    for (const sample of trace.samples) {
      if (sample.marker && sample.tMs > fromT && sample.tMs <= toT) {
        lastMarker = sample.marker;
        events.push({ type: 'echo-marker', marker: sample.marker });
      }
    }
  }

  function driveLoadAt(x, health) {
    const snap = motor.snapshot();
    motor.setLoadInput({ trolleyX: x, suspensionHealth: health });
    const base = motor.snapshot().axleLoad[snap.driveBogie];
    return clamp01(base + tuning.riderBonus * clamp01(x));
  }

  function enter() {
    if (entered) return;
    entered = true;
    loopTMs = 0;
    loopIndex = 0;
    echoTrolleyX = trace.samples[0].normalizedX;
    windowActive = false;
    attempt = 'idle';
    loadRoute = 'front';
    biteHeldMs = 0;
    departing = false;
    departureElapsedMs = 0;
    lastMarker = null;
    motor.reset();
    events.push({ type: 'loop-start', loopIndex: 0, observation: true });
  }

  function interact(command) {
    if (!entered || stageComplete || departing) {
      events.push({ type: 'control-bounce', command, reason: 'inactive' });
      return false;
    }
    if (command === 'route') {
      if (loopIndex === 0) {
        events.push({ type: 'control-bounce', command, reason: 'observe-first-loop' });
        return false;
      }
      if (motor.snapshot().energized) {
        events.push({ type: 'control-bounce', command, reason: 'release-traction-first' });
        return false;
      }
      loadRoute = loadRoute === 'front' ? 'rear' : 'front';
      events.push({ type: 'load-route-changed', route: loadRoute });
      return true;
    }
    if (command !== 'test') {
      events.push({ type: 'control-bounce', command, reason: 'unknown-control' });
      return false;
    }
    if (loopIndex === 0) {
      // The first loop belongs to the past self alone (lock §6): watching is
      // never punished and never spends an attempt.
      events.push({ type: 'control-bounce', command, reason: 'observe-first-loop' });
      return false;
    }
    const snap = motor.snapshot();
    if (!snap.energized) {
      motor.setEnergized(true);
      if (loadRoute !== 'rear') {
        attempt = 'misrouted';
        events.push({ type: 'load-misrouted', route: loadRoute });
      } else {
        attempt = windowActive ? 'armed' : 'stale';
      }
      events.push({ type: 'test-energized', inWindow: windowActive, route: loadRoute });
    } else {
      motor.setEnergized(false);
      attempt = 'idle';
      biteHeldMs = 0;
      events.push({ type: 'test-released' });
    }
    return true;
  }

  function update(dtMs, inputs = {}) {
    if (!entered) return;
    const dt = Math.max(0, dtMs);
    conditions = {
      interlock: Boolean(inputs.interlockComplete),
      airPath: Boolean(inputs.airPathOpen),
      synced: Boolean(inputs.bogiesSynced),
    };
    const health = clamp01(
      typeof inputs.suspensionHealth === 'number' ? inputs.suspensionHealth : 1,
    );

    // --- echo clock: the trace loops forever -----------------------------
    const fromT = loopTMs;
    loopTMs += dt;
    if (loopTMs >= trace.durationMs) {
      emitMarkersBetween(fromT, trace.durationMs);
      loopTMs -= trace.durationMs;
      loopIndex += 1;
      events.push({ type: 'loop-start', loopIndex, observation: loopIndex === 0 });
      emitMarkersBetween(0, loopTMs);
    } else {
      emitMarkersBetween(fromT, loopTMs);
    }
    echoTrolleyX = clamp01(sampleAt(loopTMs));

    // --- load: trace-driven trolley + rider, unless the attempt is stale --
    // The WINDOW follows the echo's real position even during a stale attempt
    // (the player must see the chance pass by); only the load FED TO THE MOTOR
    // is suppressed — free-revving wheels cannot re-grip when weight arrives.
    const rhythmDrive = driveLoadAt(echoTrolleyX, health);
    const effectiveDrive = attempt === 'stale' || attempt === 'misrouted' || loadRoute !== 'rear'
      ? driveLoadAt(0, health)
      : rhythmDrive;
    motor.setAxleLoad({ rear: effectiveDrive, front: clamp01(1 - effectiveDrive) });

    const limit = motor.snapshot().adhesionLimit;
    const wasWindow = windowActive;
    windowActive = rhythmDrive >= limit;
    if (windowActive && !wasWindow) {
      events.push({ type: 'window-opened' });
      if (attempt === 'stale') events.push({ type: 'spinning-stale' });
    }
    if (!windowActive && wasWindow) {
      events.push({ type: 'window-closed' });
      // 'armed' decays to 'stale' as soon as the arming zone ends. A 'biting'
      // attempt is NOT broken here: motor hysteresis keeps the grip until the
      // load falls below limit - hysteresis, so the hold may finish inside the
      // tail of the rhythm. The break is reported off the motor itself below.
      if (attempt === 'armed') {
        attempt = 'stale';
      }
    }

    motor.update(dt);
    motor.drainEvents().forEach((event) => {
      if (event.type === 'wheel-bite' && attempt === 'armed') {
        attempt = 'biting';
        events.push({ type: 'bite-started' });
      }
      if (event.type === 'wheel-spin-start' && attempt === 'biting' && !departing) {
        // The rhythm outran the hold: the grip is lost, the hold resets, and
        // the still-energized wheels are now free-revving ('stale') until the
        // player releases TEST. Nothing else is lost.
        attempt = 'stale';
        biteHeldMs = 0;
        events.push({ type: 'bite-broken' });
      }
    });

    // --- departure: sustained bite with the learned systems aligned -------
    if (!departing && motor.snapshot().wheelState === 'biting' && attempt === 'biting') {
      if (conditions.interlock && conditions.airPath && conditions.synced) {
        biteHeldMs += dt;
        if (biteHeldMs >= tuning.biteHoldMs) {
          departing = true;
          departureElapsedMs = 0;
          events.push({ type: 'departure-started' });
        }
      } else {
        biteHeldMs = 0;
      }
    }
    if (departing && !stageComplete) {
      departureElapsedMs += dt;
      if (departureElapsedMs >= tuning.departureMs) {
        stageComplete = true;
        events.push({ type: 'stage-complete' });
      }
    }
  }

  function snapshot() {
    const motorSnap = motor.snapshot();
    return {
      entered,
      traceSource: trace.source,
      traceDurationMs: trace.durationMs,
      loopTMs: Math.round(loopTMs),
      loopIndex,
      observationLoop: loopIndex === 0 && !departing && !stageComplete,
      echoTrolleyX: Number(echoTrolleyX.toFixed(4)),
      settledX: trace.settledX,
      windowActive,
      attempt,
      loadRoute,
      requiredRoute: 'rear',
      biteHeldMs: Math.round(biteHeldMs),
      biteHoldMs: tuning.biteHoldMs,
      departing,
      stageComplete,
      lastMarker,
      conditions: {
        interlock: conditions.interlock,
        airPath: conditions.airPath,
        load: windowActive,
        biting: motorSnap.wheelState === 'biting',
        synced: conditions.synced,
        departed: departing || stageComplete,
      },
      motor: motorSnap,
    };
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  function reset() {
    entered = false;
    loopTMs = 0;
    loopIndex = 0;
    echoTrolleyX = trace.samples[0].normalizedX;
    windowActive = false;
    attempt = 'idle';
    loadRoute = 'front';
    biteHeldMs = 0;
    departing = false;
    departureElapsedMs = 0;
    stageComplete = false;
    lastMarker = null;
    conditions = { interlock: false, airPath: false, synced: false };
    events = [];
    motor.reset();
  }

  return {
    enter,
    interact,
    update,
    snapshot,
    drainEvents,
    reset,
  };
}
