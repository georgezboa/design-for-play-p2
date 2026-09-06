import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMagicStone, magicStoneSnapshot, MAGIC_STONES } from '../src/shell/magicStones.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}

test('the first collected stone is reported as one of five', () => {
  const storage = memoryStorage();
  collectMagicStone(MAGIC_STONES[0].id, storage);
  assert.deepEqual(magicStoneSnapshot(storage), {
    collected: [MAGIC_STONES[0].id], count: 1, total: 5, allCollected: false,
    missing: MAGIC_STONES.slice(1).map(({ id }) => id),
  });
});

test('five hidden stones, including the Museum Black Knife stone, unlock the alternate boss only as a complete set', () => {
  const storage = memoryStorage();
  MAGIC_STONES.slice(0, -1).forEach(({ id }) => collectMagicStone(id, storage));
  assert.equal(magicStoneSnapshot(storage).allCollected, false);
  collectMagicStone(MAGIC_STONES.at(-1).id, storage);
  assert.deepEqual(magicStoneSnapshot(storage), {
    collected: MAGIC_STONES.map(({ id }) => id), count: 5, total: 5, allCollected: true, missing: [],
  });
});

test('a legacy chapter-five stone never counts toward the five-stone set', () => {
  const storage = memoryStorage();
  collectMagicStone('chapter-5', storage);
  assert.deepEqual(magicStoneSnapshot(storage), {
    collected: [], count: 0, total: 5, allCollected: false,
    missing: MAGIC_STONES.map(({ id }) => id),
  });
});
