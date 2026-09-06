import { magicStoneSnapshot } from './magicStones.js';

export const FINAL_BOSS_DESTINATIONS = Object.freeze({
  conductor: Object.freeze({
    id: 'conductor',
    title: 'ALL WORLDS AT ONCE',
    preloadChapterId: 'chapter6',
    route: '/final-boss.html?from=chapter5',
    cinematicId: 'chapter5-to-conductor',
    cinematicPath: '/cinematics/5-6-conductor.mp4',
  }),
  blackKnife: Object.freeze({
    id: 'black-knife',
    title: 'BLACK KNIFE',
    preloadChapterId: 'hiddenBoss',
    route: '/hidden-final-boss.html?from=chapter5',
    cinematicId: 'chapter5-to-black-knife',
    cinematicPath: '/cinematics/5-6-black-knife.mp4',
  }),
});

export function resolveFinalBossDestination(storage = globalThis.localStorage) {
  const stones = magicStoneSnapshot(storage);
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
