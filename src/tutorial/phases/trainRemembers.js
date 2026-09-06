// Phase VI — THE TRAIN REMEMBERS.
// Pure logic. An amber past case performs two large poses learned in Phase IV;
// the player uses the already-taught case grip to counterbalance it. After two
// successful poses the Archivist removes the echo. The player leaves the
// balance position to catch the falling record; the train then performs the
// missing counter-movement itself.

export const TRAIN_REMEMBERS_DEFAULTS = Object.freeze({
  arrivalMs: 650,
  echoMoveMs: 900,
  poseHoldMs: 650,
  redactionMs: 900,
  trainHelpMs: 1050,
  balanceTolerance: 0.14,
  // The final recorded pose leaves PRESENT at the right detent. The falling
  // record lands at the opposite end, so catching it truly means abandoning
  // the balance and gives the train a visible reason to take over.
  catchZoneNormalized: 0.18,
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const DETENTS = Object.freeze({ left: 0.12, middle: 0.5, right: 0.88 });

function normaliseTrace(trace) {
  if (!Array.isArray(trace)) return null;
  const xs = trace.map((sample) => clamp01(sample?.x)).filter(Number.isFinite);
  if (xs.length < 2) return null;
  return xs;
}

export function createTrainRemembers({ trace = null, ...config } = {}) {
  const tuning = Object.freeze({ ...TRAIN_REMEMBERS_DEFAULTS, ...config });
  const recorded = normaliseTrace(trace);
  // The two authored poses remain legible even if IV had a very direct route.
  // A valid trace still controls which extreme PAST performs first.
  const firstRecorded = recorded?.[0] ?? 1;
  const lastRecorded = recorded?.at(-1) ?? 0;
  const poses = Math.abs(firstRecorded - lastRecorded) >= 0.45
    ? [firstRecorded >= lastRecorded ? DETENTS.right : DETENTS.left,
      firstRecorded >= lastRecorded ? DETENTS.left : DETENTS.right]
    : [DETENTS.right, DETENTS.left];

  let entered = false;
  let phase = 'idle';
  let elapsedMs = 0;
  let poseIndex = 0;
  let poseHoldMs = 0;
  let echoX = poses[0];
  let echoFrom = poses[0];
  let presentX = DETENTS.middle;
  let presentDetent = 'middle';
  let grabbed = false;
  let caught = false;
  let stageComplete = false;
  let lastPlayerX = 0;
  let events = [];

  function enter() {
    if (entered) return false;
    entered = true;
    phase = 'arrival';
    elapsedMs = 0;
    return true;
  }

  function targetEcho() {
    return poses[Math.min(poseIndex, poses.length - 1)];
  }

  function balanceError() {
    return echoX + presentX - 1;
  }

  function balanced() {
    return Math.abs(balanceError()) <= tuning.balanceTolerance;
  }

  function update(dtMs, { playerX = lastPlayerX } = {}) {
    const dt = Math.max(0, Number(dtMs) || 0);
    lastPlayerX = clamp01(playerX);
    if (!entered || stageComplete) return snapshot();
    elapsedMs += dt;

    if (phase === 'arrival' && elapsedMs >= tuning.arrivalMs) {
      phase = 'duet';
      elapsedMs = 0;
      echoFrom = echoX;
      events.push({ type: 'duet-started' });
    }

    if (phase === 'duet') {
      const moveP = clamp01(elapsedMs / tuning.echoMoveMs);
      echoX = echoFrom + (targetEcho() - echoFrom) * moveP;
      if (grabbed) {
        presentX = lastPlayerX;
        presentDetent = null;
      }
      const echoSettled = moveP >= 1;
      if (echoSettled && !grabbed && balanced()) {
        poseHoldMs += dt;
        if (poseHoldMs >= tuning.poseHoldMs) {
          events.push({ type: 'pose-matched', poseIndex });
          poseIndex += 1;
          poseHoldMs = 0;
          elapsedMs = 0;
          if (poseIndex >= poses.length) {
            phase = 'redaction';
            events.push({ type: 'echo-redacted' });
          } else {
            echoFrom = echoX;
          }
        }
      } else {
        poseHoldMs = 0;
      }
    } else if (phase === 'redaction' && elapsedMs >= tuning.redactionMs) {
      phase = 'catch';
      elapsedMs = 0;
      grabbed = false;
      events.push({ type: 'case-falling' });
    } else if (phase === 'train-help' && elapsedMs >= tuning.trainHelpMs) {
      phase = 'complete';
      stageComplete = true;
      events.push({ type: 'stage-complete' });
    }
    return snapshot();
  }

  function interact(command) {
    if (!entered || stageComplete) return false;
    if (command === 'present-case' && phase === 'duet') {
      grabbed = !grabbed;
      if (!grabbed) {
        presentDetent = presentX < 0.32 ? 'left' : presentX > 0.68 ? 'right' : 'middle';
        presentX = DETENTS[presentDetent];
      }
      events.push({ type: grabbed ? 'case-grabbed' : 'case-released', detent: presentDetent });
      return true;
    }
    if (command === 'catch' && phase === 'catch') {
      if (lastPlayerX > tuning.catchZoneNormalized) {
        events.push({ type: 'catch-reached-for' });
        return true;
      }
      caught = true;
      phase = 'train-help';
      elapsedMs = 0;
      events.push({ type: 'case-caught' });
      events.push({ type: 'train-countermovement' });
      return true;
    }
    return false;
  }

  function snapshot() {
    const catchProgress = phase === 'redaction'
      ? clamp01(elapsedMs / tuning.redactionMs)
      : ['catch', 'train-help', 'complete'].includes(phase) ? 1 : 0;
    const trainHelpProgress = phase === 'train-help'
      ? clamp01(elapsedMs / tuning.trainHelpMs)
      : phase === 'complete' ? 1 : 0;
    const trainCounterweightX = phase === 'train-help' || phase === 'complete'
      ? 1 - lastPlayerX
      : null;
    return {
      entered,
      phase,
      traceSource: recorded ? 'player' : 'canonical',
      poseIndex,
      posesTotal: poses.length,
      echoX,
      echoVisible: !['catch', 'train-help', 'complete'].includes(phase),
      presentX,
      presentDetent,
      grabbed,
      balanceError: balanceError(),
      balanced: phase === 'duet' && balanced(),
      poseHoldProgress: clamp01(poseHoldMs / tuning.poseHoldMs),
      redactionProgress: catchProgress,
      catchReady: phase === 'catch',
      caught,
      trainHelping: phase === 'train-help',
      trainHelpProgress,
      trainCounterweightX,
      stageComplete,
      tuning,
    };
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  return Object.freeze({ enter, update, interact, snapshot, drainEvents });
}
