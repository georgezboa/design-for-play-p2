import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore, DEFAULT_SETTINGS, readSettings, volumeForChannel, writeSettings } from '../src/shell/saveSystem.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}

test('three slots start independently and retain unlocked checkpoints', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  store.startNew(1);
  store.markCheckpoint('chapter-2-start', { slot: 1 });
  assert.equal(store.readAll()[0], null);
  assert.equal(store.readAll()[1].checkpointId, 'chapter-2-start');
  assert.deepEqual(store.readAll()[1].unlocked, ['prologue-start', 'chapter-2-start']);
});

test('a locked or unknown checkpoint cannot be selected', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  store.startNew(0);
  assert.equal(store.selectCheckpoint(0, 'chapter-5-start'), null);
  assert.equal(store.selectCheckpoint(0, 'missing'), null);
});

test('settings merge defaults and persist edits', () => {
  const storage = memoryStorage();
  assert.deepEqual(readSettings(storage), DEFAULT_SETTINGS);
  writeSettings({ masterVolume: 25, subtitles: false }, storage);
  assert.equal(readSettings(storage).masterVolume, 25);
  assert.equal(readSettings(storage).subtitles, false);
  assert.equal(readSettings(storage).textScale, 100);
});

test('volume settings keep master, music, and effects on separate channels', () => {
  const settings = { ...DEFAULT_SETTINGS, masterVolume: 80, musicVolume: 50, sfxVolume: 25 };
  assert.equal(volumeForChannel(settings), 0.8);
  assert.ok(Math.abs(volumeForChannel(settings, 'music') - 0.46) < 1e-9);
  assert.equal(volumeForChannel(settings, 'sfx'), 0.2);
});

test('magic stones belong to one save slot and are idempotent', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  store.startNew(0);
  store.startNew(1);
  store.collectMagicStone('chapter-1', { slot: 0 });
  store.collectMagicStone('chapter-1', { slot: 0 });
  store.collectMagicStone('chapter-3', { slot: 0 });
  assert.deepEqual(store.readAll()[0].magicStones, ['chapter-1', 'chapter-3']);
  assert.deepEqual(store.readAll()[1].magicStones, []);
});
