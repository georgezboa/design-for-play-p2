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

export function statueCanDamage({ isPrimaryHunter, state, now, wingGraceUntil = 0 }) {
  return Boolean(isPrimaryHunter && state === 'hunting' && now >= wingGraceUntil);
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
