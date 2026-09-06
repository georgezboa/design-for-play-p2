// Phase IV — THE FIRST WEIGHT.
// Pure logic: no Phaser, DOM, rendering, or audio.
//
// The room teaches one readable sentence through space:
//   a case falls right -> the car tilts -> move it to the middle -> level.
// The ticket punch then turns that apparent answer into a memory. Walking to
// the exit adds the player's own weight, spoils the balance, and makes the
// real answer visible: case left + body right. Holding that composition long
// enough opens the partition.

// There is no fail state and no reset. Every wrong placement remains visible
// and can be corrected in place.

// Events:
//   case-fell, case-grabbed, case-released, first-balance,
//   witness-punched, player-weight-revealed, latch-refused, stage-complete


export const FIRST_WEIGHT_DEFAULTS = Object.freeze({
  fallMs: 620,
  firstBalanceHoldMs: 420,
  finalBalanceHoldMs: 600,
  balanceTolerance: 0.13,
  exitZoneNormalized: 0.86,
  playerRevealNormalized: 0.58,
});

const DETENTS = Object.freeze({ left: 0, middle: 0.5, right: 1 });

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function nearestDetent(value) {
  return Object.entries(DETENTS).reduce((best, [name, x]) => (
    Math.abs(value - x) < Math.abs(value - DETENTS[best]) ? name : best
  ), 'left');
}

function caseMoment(x) {
  // The authored balance has three strong, readable rests. Interpolation is
  // used only while the player is carrying the case between them.
  return (clamp01(x) - 0.5) * 1.3;
}

export function createFirstWeight(config = {}) {
  const tuning = Object.freeze({ ...FIRST_WEIGHT_DEFAULTS, ...config });
  let entered = false;
  let caseFalling = false;
  let caseFallen = false;
  let fallElapsedMs = 0;
  let caseX = 1;
  let caseDetent = 'right';
  let grabbed = false;
  let firstBalanceMs = 0;
  let firstBalanced = false;
  let tagPunched = false;
  let playerWeightRevealed = false;
  let finalBalanceMs = 0;
  let stageComplete = false;
  let refusalSent = false;
  let events = [];
  let lastPlayerX = 0;
  let elapsedMs = 0;
  const trace = [{ t: 0, x: 1 }];

  function enter() {
    if (entered) return false;
    entered = true;
    caseFalling = true;
    fallElapsedMs = 0;
    return true;
  }

  function tiltFor(playerX = lastPlayerX) {
    const caseLoad = caseMoment(caseX);
    if (!tagPunched) return caseLoad;
    const playerContribution = clamp01(
      (playerX - tuning.playerRevealNormalized)
      / Math.max(0.001, tuning.exitZoneNormalized - tuning.playerRevealNormalized),
    ) * 0.65;
    return caseLoad + playerContribution;
  }

  function isLevel(playerX = lastPlayerX) {
    return Math.abs(tiltFor(playerX)) <= tuning.balanceTolerance;
  }

  function update(dtMs, { playerX = lastPlayerX } = {}) {
    const dt = Math.max(0, Number(dtMs) || 0);
    elapsedMs += dt;
    lastPlayerX = clamp01(playerX);
    if (!entered || stageComplete) return snapshot();

    if (caseFalling) {
      fallElapsedMs += dt;
      if (fallElapsedMs >= tuning.fallMs) {
        caseFalling = false;
        caseFallen = true;
        events.push({ type: 'case-fell' });
      }
      return snapshot();
    }

    if (grabbed) {
      caseX = lastPlayerX;
      caseDetent = null;
    }

    const level = isLevel();
    if (!tagPunched && !grabbed && caseDetent === 'middle' && level) {
      firstBalanceMs += dt;
      if (!firstBalanced && firstBalanceMs >= tuning.firstBalanceHoldMs) {
        firstBalanced = true;
        events.push({ type: 'first-balance' });
      }
    } else if (!firstBalanced) {
      firstBalanceMs = 0;
    }

    if (tagPunched && !playerWeightRevealed
      && lastPlayerX >= tuning.playerRevealNormalized) {
      playerWeightRevealed = true;
      events.push({ type: 'player-weight-revealed' });
    }

    const atExit = lastPlayerX >= tuning.exitZoneNormalized;
    const finalComposition = tagPunched && caseDetent === 'left' && atExit && level;
    if (finalComposition) {
      finalBalanceMs += dt;
      if (finalBalanceMs >= tuning.finalBalanceHoldMs) {
        stageComplete = true;
        grabbed = false;
        events.push({ type: 'stage-complete' });
      }
    } else {
      finalBalanceMs = 0;
    }

    if (tagPunched && atExit && !level && !refusalSent) {
      refusalSent = true;
      events.push({ type: 'latch-refused' });
    }
    if (!atExit) refusalSent = false;
    return snapshot();
  }

  function interactCase() {
    if (!caseFallen || stageComplete) return false;
    if (!grabbed && firstBalanced && !tagPunched && caseDetent === 'middle') {
      tagPunched = true;
      events.push({ type: 'witness-punched' });
      return true;
    }
    grabbed = !grabbed;
    if (grabbed) {
      events.push({ type: 'case-grabbed' });
    } else {
      caseDetent = nearestDetent(caseX);
      caseX = DETENTS[caseDetent];
      const previous = trace.at(-1);
      if (!previous || previous.x !== caseX) trace.push({ t: elapsedMs, x: caseX });
      events.push({ type: 'case-released', detent: caseDetent });
    }
    return true;
  }

  function snapshot() {
    const tilt = tiltFor();
    return {
      entered,
      caseFalling,
      caseFallen,
      fallProgress: caseFalling ? clamp01(fallElapsedMs / tuning.fallMs) : caseFallen ? 1 : 0,
      caseX,
      caseDetent,
      grabbed,
      firstBalanced,
      tagAvailable: firstBalanced && !tagPunched,
      tagPunched,
      playerWeightRevealed,
      playerX: lastPlayerX,
      tilt,
      level: Math.abs(tilt) <= tuning.balanceTolerance,
      atExit: lastPlayerX >= tuning.exitZoneNormalized,
      finalBalanceProgress: clamp01(finalBalanceMs / tuning.finalBalanceHoldMs),
      stageComplete,
      tuning,
    };
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  function exportTrace() {
    const out = trace.map((sample) => ({ ...sample }));
    const last = out.at(-1) ?? { t: 0, x: caseX };
    // Preserve a readable duration without inventing a duplicate movement.
    // VI cares about the order of poses; a repeated final x would look like a
    // third authored action even though the player only paused there.
    if (last.t < 1600) last.t = 1600;
    return out;
  }

  return Object.freeze({ enter, update, interactCase, snapshot, drainEvents, exportTrace });
}
