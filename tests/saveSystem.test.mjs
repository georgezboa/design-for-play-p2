import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  assert.deepEqual(store.readAll()[1].unlocked, ['chapter-1-start', 'chapter-2-start']);
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

test('Load hides a legacy checkpoint the save also holds as a current one', async () => {
  const { loadListCheckpoints, CHECKPOINTS } = await import('../src/shell/saveSystem.js');
  const rows = (save) => loadListCheckpoints(save).map(({ checkpoint, selected }) => `${selected ? '◆' : '◇'} ${checkpoint.id}`);
  // A legacy save that reached Act I under both ids: one CHAPTER 1 row, not two.
  assert.deepEqual(rows({ checkpointId: 'chapter-2-start', unlocked: ['prologue-start', 'chapter-1-start', 'chapter-2-start'] }), ['◇ chapter-1-start', '◆ chapter-2-start']);
  // Still pointing at the legacy id: its current twin carries the marker.
  assert.deepEqual(rows({ checkpointId: 'prologue-start', unlocked: ['prologue-start', 'chapter-1-start'] }), ['◆ chapter-1-start']);
  // A legacy id with no current twin still loads.
  assert.deepEqual(rows({ checkpointId: 'prologue-start', unlocked: ['prologue-start'] }), ['◆ prologue-start']);
  // A later act of the same chapter is not a twin of the legacy Act I id.
  assert.deepEqual(rows({ checkpointId: 'chapter-1-act-2', unlocked: ['prologue-start', 'chapter-1-act-2'] }), ['◇ prologue-start', '◆ chapter-1-act-2']);
  assert.deepEqual(loadListCheckpoints(null), []);
  // Story order is kept and nothing else is hidden.
  const everything = { checkpointId: 'chapter-6-start', unlocked: CHECKPOINTS.map(({ id }) => id) };
  assert.deepEqual(loadListCheckpoints(everything).map(({ checkpoint }) => checkpoint.id), CHECKPOINTS.filter(({ legacy }) => !legacy).map(({ id }) => id));
  // Every legacy id has a current twin: same chapter, same act.
  CHECKPOINTS.filter(({ legacy }) => legacy).forEach((legacy) => {
    assert.ok(CHECKPOINTS.some((c) => !c.legacy && c.chapter === legacy.chapter && (c.act ?? null) === (legacy.act ?? null)), legacy.id);
  });
});

test('the title Load panel lists loadListCheckpoints()', () => {
  const title = readFileSync(new URL('../src/shell/titleMenu.js', import.meta.url), 'utf8');
  assert.match(title, /loadListCheckpoints\(save\)\.forEach\(\(\{ checkpoint, selected \}\) =>/);
});
