import { magicStoneSnapshot } from './magicStones.js';

export const FINAL_BOSS_DESTINATIONS = Object.freeze({
  conductor: Object.freeze({
    id: 'conductor',
    title: 'ALL WORLDS AT ONCE',
    preloadChapterId: 'chapter6',
    route: '/final-boss.html?from=chapter5',
    cinematicId: 'chapter5-to-conductor',
    // the cutscene's name (the 5-6 film this used to point at is retired)
    cinematicPath: 'chapter5-to-conductor',
  }),
  // The five-stone route: THE BLACK TICKET (player-visible name). The ids
  // and file names keep the old `black-knife` spelling.
  blackKnife: Object.freeze({
    id: 'black-knife',
    title: 'BLACK TICKET',
    preloadChapterId: 'hiddenBoss',
    route: '/hidden-final-boss.html?from=chapter5',
    cinematicId: 'chapter5-to-black-knife',
    cinematicPath: 'chapter5-to-black-knife',
  }),
});

export function resolveFinalBossDestination(storage = globalThis.localStorage, { slot = null } = {}) {
  const stones = magicStoneSnapshot(storage, { slot });
  const destination = stones.allCollected
    ? FINAL_BOSS_DESTINATIONS.blackKnife
    : FINAL_BOSS_DESTINATIONS.conductor;
  return Object.freeze({
    ...destination,
    stoneCount: stones.count,
    stoneTotal: stones.total,
    allStonesCollected: stones.allCollected,
    missingStoneIds: Object.freeze([...stones.missing]),
  });
}

// Pages a saved checkpoint resumes on when they differ from the checkpoint's
// default route. Chapter 6 is one checkpoint with two fights: Continue / Load
// must reach the same boss the Museum would have sent this slot to.
const CHAPTER_6_RESUME_ROUTES = Object.freeze({
  conductor: '/final-boss.html',
  'black-knife': '/hidden-final-boss.html',
});

export function resolveCheckpointRoute(checkpointId, { storage = globalThis.localStorage, slot = null } = {}) {
  if (checkpointId !== 'chapter-6-start') return null;
  return CHAPTER_6_RESUME_ROUTES[resolveFinalBossDestination(storage, { slot }).id];
}
