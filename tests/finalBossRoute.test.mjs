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

test('every Conductor movement plays a cleared cue: no Verdi, no uncleared recording', async () => {
  const source = await readFile(new URL('../src/chapters/finalBoss/spectacleBattle.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bverdi\b|_verdi_|dies_irae|dies-irae|5\.7_/i);
  // I and II: the project-owned renders; III and IV: the public-domain Musopen cues.
  assert.match(source, /6\.1_threshold_modern\.mp3/);
  assert.match(source, /6\.2_grid_modern\.mp3/);
  assert.match(source, /echo-city-new-world-fire/);
  assert.match(source, /mussorgsky-kiev-gate/);
  await Promise.all(['6.1_threshold_modern', '6.2_grid_modern', '6.3_dvorak_new_world_mvt4_theme', '6.4_mussorgsky_kiev_gate', '6.5_night_train_departure']
    .map((name) => access(new URL(`../public/assets/music/ch6/${name}.mp3`, import.meta.url))));
});

test('the Conductor loads only the Chapter 3 models it draws, and its preload matches', async () => {
  const source = await readFile(new URL('../src/chapters/finalBoss/spectacleBattle.js', import.meta.url), 'utf8');
  const preload = await readFile(new URL('../src/shell/chapterPreloader.js', import.meta.url), 'utf8');
  const profile = preload.slice(preload.indexOf('chapter6:'), preload.indexOf('hiddenBoss:'));
  const models = [...source.matchAll(/'(\/assets\/chapter03-3d\/[^']+\.glb)'/g)].map((match) => match[1]);
  assert.deepEqual(models.sort(), [...profile.matchAll(/'(\/assets\/chapter03-3d\/[^']+\.glb)'/g)].map((match) => match[1]).sort());
  for (const unused of ['ch03_open_air_station', 'clock_tower_web', 'old_municipal_archive_web', 'ch03_perimeter_tenement', 'ch03_perimeter_workers_hall', 'ch03_shop_bakery_tenement', 'ch03_shop_printworks_rowhouse', 'municipal_tram_web', 'reunion_fountain_web']) {
    assert.doesNotMatch(source, new RegExp(unused));
    assert.doesNotMatch(profile, new RegExp(unused));
  }
});
