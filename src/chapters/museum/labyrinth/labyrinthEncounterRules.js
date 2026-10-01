// Pure encounter rules shared by the Phaser scene and regression tests.
// Keeping these decisions out of the render loop makes the fairness contract
// explicit: one damaging hunter per wing, and one life refill per new wing.

export function choosePrimaryHunterId(statues, {
  playerX,
  playerY,
  wingId,
  floor = 0,
  previousId = null,
  activationRadius,
  returnRadius,
} = {}) {
  const candidates = statues
    .filter((statue) => (
      statue.wing === wingId
      && (wingId !== 3 || statue.floor === floor)
      && statue.sprite?.visible !== false
      && statue.sprite?.body?.enable !== false
    ))
    .map((statue) => ({
      statue,
      distance: Math.hypot(playerX - statue.x, playerY - statue.y),
    }));

  const committed = candidates.find(({ statue, distance }) => (
    statue.id === previousId
    && ['hunting', 'frozen'].includes(statue.state)
    && distance <= returnRadius
  ));
  if (committed) return committed.statue.id;

  const nearest = candidates
    .filter(({ distance }) => distance <= activationRadius)
    .sort((a, b) => a.distance - b.distance || a.statue.id - b.statue.id)[0];
  return nearest?.statue.id ?? null;
}

export function statueCanDamage({ isPrimaryHunter, state, now, wingGraceUntil = 0, telegraphReady = true }) {
  return Boolean(isPrimaryHunter && state === 'hunting' && now >= wingGraceUntil && telegraphReady);
}

// Alpha round 1: testers took three hits in four minutes, two from statues
// they never saw coming. A hunter now has to announce itself before it can
// land a hit: once it is closer than `warnRadius` the player hears stone
// grind and sees a marker at the screen edge pointing at it, and only after
// `telegraphMs` (longer in the Entry Hall) can its touch cost a life.
export const TELEGRAPH = Object.freeze({
  warnRadius: 340, // px; at hunting speed that is ≥ 1.6 s of warning
  clearRadius: 480, // px; farther than this the warning resets
  telegraphMs: 900,
  entryTelegraphMs: 1600,
});

// The Entry Hall teaches the rule; its statues are slower and wake later.
export const ENTRY_WING = Object.freeze({ id: 0, speedScale: 0.8, activationScale: 0.7 });

export function wingThreatTuning(wingId) {
  return wingId === ENTRY_WING.id
    ? { speedScale: ENTRY_WING.speedScale, activationScale: ENTRY_WING.activationScale, telegraphMs: TELEGRAPH.entryTelegraphMs }
    : { speedScale: 1, activationScale: 1, telegraphMs: TELEGRAPH.telegraphMs };
}

/**
 * One statue's warning, frame to frame.
 * @param {{warnedAt:number|null}|null} prev
 * @returns {{ warnedAt:number|null, warning:boolean, ready:boolean, started:boolean }}
 *   warning: show the edge marker (unseen and close); ready: may now hit;
 *   started: the warning began this frame (play the sound).
 */
export function stepTelegraph(prev, { hunting, seen, distance, now, telegraphMs = TELEGRAPH.telegraphMs }) {
  const warnedAt = prev?.warnedAt ?? null;
  if (!hunting || distance > TELEGRAPH.clearRadius) {
    return { warnedAt: null, warning: false, ready: false, started: false };
  }
  let next = warnedAt;
  let started = false;
  if (next === null && distance <= TELEGRAPH.warnRadius) {
    next = now;
    started = true;
  }
  return {
    warnedAt: next,
    warning: next !== null && !seen,
    ready: next !== null && now - next >= telegraphMs,
    started,
  };
}

export function applyWingEntryRules({ currentWingId, targetWingId, highestWingReached, lives, maxLives }) {
  const advanced = targetWingId > highestWingReached;
  return {
    currentWingId: targetWingId,
    highestWingReached: advanced ? targetWingId : highestWingReached,
    lives: advanced ? maxLives : lives,
    advanced,
    moved: targetWingId !== currentWingId,
  };
}
