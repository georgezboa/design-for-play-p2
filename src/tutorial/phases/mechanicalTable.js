const PHASES = new Set([4, 5, 6]);
const DETENTS = Object.freeze(['left', 'center', 'right']);
const ROUTES = Object.freeze(['a', 'b']);

export const MECHANICAL_TABLE_TUNING = Object.freeze({
  launchPressure: 0.5,
  pumpStep: 0.25,
  launchCost: 0.25,
  balanceTolerance: 0.04,
  rollMs: 1450,
  resultHoldMs: 850,
  canonicalLoopMs: 4800,
  couplingProgress: 0.62,
  couplingTolerance: 0.12,
});

const LOAD_MOMENT = Object.freeze({ left: 0.25, center: 0.5, right: 0.75 });

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

function normaliseTrace(trace) {
  if (!Array.isArray(trace) || trace.length < 2) return null;
  const samples = trace
    .map((sample) => ({
      t: Number(sample?.t ?? sample?.timeMs),
      x: clamp01(sample?.x ?? sample?.trolleyX),
    }))
    .filter((sample) => Number.isFinite(sample.t))
    .sort((a, b) => a.t - b.t);
  if (samples.length < 2) return null;
  const first = samples[0].t;
  const shifted = samples.map((sample) => ({ t: Math.max(0, sample.t - first), x: sample.x }));
  const duration = shifted.at(-1).t;
  if (duration < 1200) return null;
  return { samples: shifted, duration };
}

function tracePosition(trace, elapsed) {
  if (!trace) return elapsed;
  const t = Math.max(0, elapsed);
  for (let i = 1; i < trace.samples.length; i += 1) {
    const before = trace.samples[i - 1];
    const after = trace.samples[i];
    if (t <= after.t) {
      const span = Math.max(1, after.t - before.t);
      const p = (t - before.t) / span;
      return before.x + (after.x - before.x) * p;
    }
  }
  return trace.samples.at(-1).x;
}

function circularDistance(a, b) {
  const direct = Math.abs(a - b);
  return Math.min(direct, 1 - direct);
}

export function createMechanicalTable({ phase, trace = null } = {}) {
  if (!PHASES.has(phase)) throw new Error(`mechanical table phase must be 4, 5, or 6; got ${phase}`);
  const playerTrace = normaliseTrace(trace);
  const events = [];
  let elapsedMs = 0;
  let entered = false;
  let pressure = 0;
  let weight = phase === 4 ? 'left' : 'center';
  let route = 'a';
  let bridgeConnected = phase === 6;
  let referencePassed = false;
  let breakObserved = false;
  let stageComplete = false;
  let result = null;
  // Unlike the transient result toast, this is physical evidence. The art
  // keeps a faint mark at the last rejecting component so a failed run can
  // inform the next plan without a text answer or a reset.
  let lastObservation = null;
  let attemptCount = 0;
  let resultHoldMs = 0;
  let bearing = null;
  let traceStartedAt = null;
  const recordedTrace = [];
  const loopMs = phase === 6
    ? Math.max(MECHANICAL_TABLE_TUNING.canonicalLoopMs, playerTrace?.duration ?? 0)
    : MECHANICAL_TABLE_TUNING.canonicalLoopMs;
  let ghostElapsedMs = 0;

  const emit = (type, detail = {}) => events.push({ type, ...detail });

  const ghostProgress = () => {
    if (phase !== 6) return 0;
    const local = ghostElapsedMs % loopMs;
    if (playerTrace) {
      const scaled = (local / loopMs) * playerTrace.duration;
      return clamp01(tracePosition(playerTrace, scaled));
    }
    return local / loopMs;
  };

  // The upper replay bearing passes a physical launch cam before it reaches
  // the coupling cradle.  The distance between the two is exactly one present
  // bearing travel time, turning VI's hidden lead time into visible geometry.
  const releaseProgress = () => (
    MECHANICAL_TABLE_TUNING.couplingProgress
    - MECHANICAL_TABLE_TUNING.rollMs / loopMs
    + 1
  ) % 1;

  const recordWeight = () => {
    if (phase !== 4 || !entered) return;
    if (traceStartedAt === null) traceStartedAt = elapsedMs;
    const x = DETENTS.indexOf(weight) / (DETENTS.length - 1);
    const t = elapsedMs - traceStartedAt;
    const last = recordedTrace.at(-1);
    if (!last || last.x !== x || t - last.t > 900) recordedTrace.push({ t, x });
  };

  const phaseFourBalance = () => {
    const loadMoment = LOAD_MOMENT[weight] ?? LOAD_MOMENT.center;
    const error = pressure - loadMoment;
    return {
      loadMoment,
      error,
      aligned: Math.abs(error) <= MECHANICAL_TABLE_TUNING.balanceTolerance,
      launchReady: pressure >= MECHANICAL_TABLE_TUNING.launchPressure
        && Math.abs(error) <= MECHANICAL_TABLE_TUNING.balanceTolerance,
    };
  };

  const launchOutcome = () => {
    if (pressure < MECHANICAL_TABLE_TUNING.launchPressure) return 'underpowered';
    if (phase === 4) return phaseFourBalance().aligned ? 'phase-complete' : 'misweighted';
    if (phase === 5) {
      if (weight !== 'center') return 'misweighted';
      if (route === 'a') return 'reference-pass';
      if (!referencePassed) return 'no-reference';
      if (!bridgeConnected) return 'open-contact';
      return 'phase-complete';
    }
    if (weight !== 'right') return 'misweighted';
    if (route !== 'b') return 'misrouted';
    if (!bridgeConnected) return 'open-contact';
    const arrivalGhost = (ghostProgress() + MECHANICAL_TABLE_TUNING.rollMs / loopMs) % 1;
    return circularDistance(arrivalGhost, MECHANICAL_TABLE_TUNING.couplingProgress)
      <= MECHANICAL_TABLE_TUNING.couplingTolerance
      ? 'phase-complete'
      : 'mistimed';
  };

  const settleLaunch = () => {
    if (!bearing) return;
    result = bearing.outcome;
    lastObservation = result;
    attemptCount += 1;
    resultHoldMs = MECHANICAL_TABLE_TUNING.resultHoldMs;
    pressure = Math.max(0, pressure - MECHANICAL_TABLE_TUNING.launchCost);
    emit('bearing-result', { result, route: bearing.route, weight: bearing.weight });
    if (result === 'reference-pass') {
      referencePassed = true;
      emit('reference-proved');
    } else if (result === 'open-contact' && referencePassed) {
      breakObserved = true;
      emit('break-observed');
    } else if (result === 'phase-complete') {
      stageComplete = true;
      emit('stage-complete', { phase });
    }
  };

  const interact = (command) => {
    if (stageComplete || bearing) return false;
    if (command === 'pump') {
      pressure = clamp01(pressure + MECHANICAL_TABLE_TUNING.pumpStep);
      emit('pressure-changed', { pressure });
      return true;
    }
    if (command?.startsWith('weight-')) {
      const next = command.slice('weight-'.length);
      if (!DETENTS.includes(next)) return false;
      weight = next;
      recordWeight();
      emit('weight-moved', { weight });
      return true;
    }
    if (command === 'route') {
      route = route === 'a' ? 'b' : 'a';
      emit('route-changed', { route });
      return true;
    }
    if (command === 'bridge') {
      if (phase < 5 || (phase === 5 && (!referencePassed || !breakObserved))) {
        emit('bridge-refused');
        return true;
      }
      bridgeConnected = !bridgeConnected;
      emit('bridge-changed', { bridgeConnected });
      return true;
    }
    if (command === 'release') {
      const outcome = launchOutcome();
      bearing = {
        elapsedMs: 0,
        progress: 0,
        settled: false,
        outcome,
        route,
        weight,
        launchGhostProgress: ghostProgress(),
      };
      result = null;
      emit('bearing-released', { outcome, route, weight });
      return true;
    }
    return false;
  };

  const update = (deltaMs = 0) => {
    const delta = Math.max(0, Number(deltaMs) || 0);
    elapsedMs += delta;
    if (phase === 6 && entered && !stageComplete) ghostElapsedMs += delta;
    if (bearing) {
      bearing.elapsedMs += delta;
      bearing.progress = clamp01(bearing.elapsedMs / MECHANICAL_TABLE_TUNING.rollMs);
      if (bearing.progress >= 1 && !bearing.settled) {
        bearing.settled = true;
        settleLaunch();
      } else if (bearing.settled && !stageComplete) {
        resultHoldMs -= delta;
        if (resultHoldMs <= 0) {
          bearing = null;
          result = null;
          emit('bearing-recovered');
        }
      }
    } else if (result && !stageComplete) {
      resultHoldMs -= delta;
      if (resultHoldMs <= 0) {
        bearing = null;
        result = null;
        emit('bearing-recovered');
      }
    }
  };

  const snapshot = () => ({
    phase,
    entered,
    pressure,
    weight,
    route,
    bridgeConnected,
    referencePassed,
    breakObserved,
    stageComplete,
    result,
    lastObservation,
    attemptCount,
    bearing: bearing ? { ...bearing } : null,
    ghost: phase === 6 ? {
      progress: ghostProgress(),
      traceSource: playerTrace ? 'player' : 'canonical',
      loopMs,
      couplingProgress: MECHANICAL_TABLE_TUNING.couplingProgress,
      releaseProgress: releaseProgress(),
      releaseWindowActive: circularDistance(ghostProgress(), releaseProgress())
        <= MECHANICAL_TABLE_TUNING.couplingTolerance,
      windowActive: circularDistance(ghostProgress(), MECHANICAL_TABLE_TUNING.couplingProgress)
        <= MECHANICAL_TABLE_TUNING.couplingTolerance,
    } : null,
    balance: phase === 4 ? phaseFourBalance() : null,
    affordances: {
      pump: !stageComplete && !bearing,
      weight: !stageComplete && !bearing,
      route: phase >= 5 && !stageComplete && !bearing,
      bridge: phase >= 5 && !stageComplete && !bearing,
      release: !stageComplete && !bearing,
    },
  });

  return {
    enter() {
      if (entered) return false;
      entered = true;
      traceStartedAt = phase === 4 ? elapsedMs : null;
      recordWeight();
      emit('table-entered', { phase });
      return true;
    },
    interact,
    update,
    snapshot,
    drainEvents() {
      return events.splice(0, events.length);
    },
    exportTrace() {
      if (phase !== 4) return null;
      const traceOut = recordedTrace.slice();
      const last = traceOut.at(-1) ?? { t: 0, x: 0 };
      // VI must be able to replay even a decisive player who moves the weight
      // immediately.  Preserve their real detent choice, but hold the final
      // pose long enough to form a legible recorded movement instead of
      // silently falling back to the canonical ghost.
      if (traceOut.length < 2 || last.t < 1600) {
        traceOut.push({ t: Math.max(1600, last.t), x: last.x });
      }
      return traceOut;
    },
    reset() {
      entered = false;
      pressure = 0;
      weight = phase === 4 ? 'left' : 'center';
      route = 'a';
      bridgeConnected = phase === 6;
      referencePassed = false;
      breakObserved = false;
      stageComplete = false;
      result = null;
      lastObservation = null;
      attemptCount = 0;
      resultHoldMs = 0;
      bearing = null;
      ghostElapsedMs = 0;
      traceStartedAt = null;
      recordedTrace.splice(0, recordedTrace.length);
      events.splice(0, events.length);
    },
  };
}
