import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';

import { collectMagicStone, MAGIC_STONES } from '../src/shell/magicStones.js';
import { FINAL_BOSS_DESTINATIONS, resolveFinalBossDestination } from '../src/shell/finalBossRoute.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('Museum routes an incomplete stone set to the original Conductor boss', () => {
  const storage = memoryStorage();
  MAGIC_STONES.slice(0, 3).forEach(({ id }) => collectMagicStone(id, storage));
  assert.deepEqual(resolveFinalBossDestination(storage), {
    ...FINAL_BOSS_DESTINATIONS.conductor,
    stoneCount: 3,
    stoneTotal: 5,
    allStonesCollected: false,
    missingStoneIds: ['chapter-4', 'black-knife'],
  });
});

test('Museum routes exactly five stones to Black Knife', () => {
  const storage = memoryStorage();
  MAGIC_STONES.forEach(({ id }) => collectMagicStone(id, storage));
  assert.deepEqual(resolveFinalBossDestination(storage), {
    ...FINAL_BOSS_DESTINATIONS.blackKnife,
    stoneCount: 5,
    stoneTotal: 5,
    allStonesCollected: true,
    missingStoneIds: [],
  });
});

test('both frozen route cinematics are present in the integrated public build', async () => {
  await Promise.all(Object.values(FINAL_BOSS_DESTINATIONS).map(({ cinematicPath }) => (
    access(new URL(`../public${cinematicPath}`, import.meta.url))
  )));
});

test('the false boss uses Verdi only for movements I–II, then changes to the authored classical cues', async () => {
  const source = await readFile(new URL('../src/chapters/finalBoss/spectacleBattle.js', import.meta.url), 'utf8');
  assert.match(source, /5\.7_verdi_dies_irae\.mp3/);
  assert.doesNotMatch(source, /6\.1_threshold_modern\.mp3/);
  assert.doesNotMatch(source, /6\.2_grid_modern\.mp3/);
  assert.match(source, /false-boss-verdi-dies-irae/);
  assert.match(source, /echo-city-new-world-fire/);
  assert.match(source, /mussorgsky-kiev-gate/);
  assert.match(source, /this\.falseBossScoreLocked = false/);
});
