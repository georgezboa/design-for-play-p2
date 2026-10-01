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

// ---------- A4-2: a page load never rewinds a save ----------

test('loading an earlier checkpoint of the same chapter never rewinds the save (car03-3d on a dusk save)', async () => {
  const { checkpointAdvances } = await import('../src/shell/saveSystem.js');
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  store.startNew(0);
  store.markCheckpoint('chapter-3-start');
  store.markCheckpoint('chapter-3-dusk');
  // car03-3d.html records chapter-3-start on every load (devMenuReturn.js).
  store.markCheckpoint('chapter-3-start');
  assert.equal(store.readAll()[0].checkpointId, 'chapter-3-dusk');
  assert.deepEqual(store.readAll()[0].unlocked, ['chapter-1-start', 'chapter-3-start', 'chapter-3-dusk']);
  // An earlier chapter's page does not rewind it either; equal or later does.
  store.markCheckpoint('chapter-2-start');
  assert.equal(store.readAll()[0].checkpointId, 'chapter-3-dusk');
  store.markCheckpoint('chapter-3-dusk');
  assert.equal(store.readAll()[0].checkpointId, 'chapter-3-dusk');
  store.markCheckpoint('chapter-4-start');
  assert.equal(store.readAll()[0].checkpointId, 'chapter-4-start');
  assert.equal(checkpointAdvances('chapter-3-dusk', 'chapter-3-start'), false);
  assert.equal(checkpointAdvances('chapter-3-start', 'chapter-3-start'), true);
  assert.equal(checkpointAdvances(undefined, 'chapter-1-start'), true);
  assert.equal(checkpointAdvances('chapter-1-start', 'missing'), false);
});

test('going back on purpose is LOAD: a selected earlier checkpoint then moves forward again', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  store.startNew(0);
  ['chapter-3-start', 'chapter-3-dusk', 'chapter-4-start'].forEach((id) => store.markCheckpoint(id));
  store.selectCheckpoint(0, 'chapter-3-start');
  store.markCheckpoint('chapter-3-start');
  assert.equal(store.readAll()[0].checkpointId, 'chapter-3-start');
  store.markCheckpoint('chapter-3-dusk');
  assert.equal(store.readAll()[0].checkpointId, 'chapter-3-dusk');
});

// ---------- A2-14 / A4-11: router visits play on scratch slots ----------

test('a test-route session writes only its scratch slots, seeded from the active slot', async () => {
  const { seedRouterSave, ROUTER_SAVE_KEY, SAVE_KEY } = await import('../src/shell/saveSystem.js');
  const storage = memoryStorage();
  const real = createSaveStore(storage, { scratch: false });
  real.startNew(1);
  real.collectMagicStone('chapter-1', { slot: 1 });
  real.markCheckpoint('chapter-5-start', { slot: 1 });
  const before = storage.getItem(SAVE_KEY);
  seedRouterSave('chapter-3-start', { storage });
  const scratch = createSaveStore(storage, { scratch: true });
  assert.equal(scratch.scratch, true);
  assert.equal(scratch.readAll()[0].checkpointId, 'chapter-3-start');
  assert.deepEqual(scratch.readAll()[0].magicStones, ['chapter-1']);
  scratch.markCheckpoint('chapter-3-dusk');
  scratch.collectMagicStone('chapter-3');
  scratch.addPlaySeconds(30);
  assert.equal(storage.getItem(SAVE_KEY), before, 'the real slots are untouched');
  assert.equal(real.readAll()[1].checkpointId, 'chapter-5-start');
  assert.equal(real.getActiveSlot(), 1);
  assert.match(storage.getItem(ROUTER_SAVE_KEY), /chapter-3-dusk/);
  // Outside a dev / playtest build no tab is ever a test route.
  const { routerSessionActive } = await import('../src/shell/saveSystem.js');
  assert.equal(routerSessionActive({ getItem: () => '1' }), false);
});

test('the router seeds its scratch save before it navigates, and the title always reads the real slots', () => {
  const title = readFileSync(new URL('../src/shell/titleMenu.js', import.meta.url), 'utf8');
  assert.match(title, /seedRouterSave\(chapter\.checkpoint, \{ stones: chapter\.stones \?\? null \}\);\s*activateHiddenRouter\(\);/);
  assert.match(title, /createSaveStore\(undefined, \{ scratch: false \}\)/);
  assert.match(title, /clearHiddenRouter\(\)/);
});

// ---------- play time ----------

test('play time accumulates per slot and formats for the Load list', async () => {
  const { formatPlayTime, formatSave } = await import('../src/shell/saveSystem.js');
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  store.startNew(0);
  store.addPlaySeconds(59.5);
  store.addPlaySeconds(3600);
  store.addPlaySeconds(-4);
  store.addPlaySeconds(Number.NaN);
  assert.equal(store.readAll()[0].playSeconds, 3659.5);
  assert.equal(formatPlayTime(3659.5), '1H 00M');
  assert.equal(formatPlayTime(754), '12M');
  assert.equal(formatPlayTime(20), 'UNDER 1M');
  assert.match(formatSave(store.readAll()[0]).detail, /· 1H 00M PLAYED$/);
  // A checkpoint keeps the larger of the two totals.
  store.markCheckpoint('chapter-1-act-1', { playSeconds: 10 });
  assert.equal(store.readAll()[0].playSeconds, 3659.5);
});

test('the play clock counts only visible, unpaused time and flushes in chunks', async () => {
  const { createPlayClock, FLUSH_EVERY_S, MAX_TICK_S } = await import('../src/shell/playClock.js');
  let t = 0;
  let running = true;
  const commits = [];
  const clock = createPlayClock({ now: () => t, running: () => running, commit: (s) => commits.push(s) });
  for (let i = 0; i < FLUSH_EVERY_S - 1; i += 1) { t += 1000; clock.tick(); }
  assert.deepEqual(commits, []);
  t += 1000; clock.tick();
  assert.deepEqual(commits, [FLUSH_EVERY_S]);
  running = false;
  t += 1000; clock.tick();
  assert.equal(clock.pending, 0);
  running = true;
  t += (MAX_TICK_S + 1) * 1000; clock.tick();
  assert.equal(clock.pending, 0, 'a frozen tab is not play time');
  t += 2000; clock.tick();
  assert.equal(clock.flush(), 2);
  assert.match(readFileSync(new URL('../src/shell/pauseMenu.js', import.meta.url), 'utf8'), /installPlayClock\(\)/);
});

test('a five-stone Chapter 6 save is THE LAST CARRIAGE; four stones stay ALL WORLDS AT ONCE', async () => {
  const { formatSave, MAGIC_STONE_IDS } = await import('../src/shell/saveSystem.js');
  const { MAGIC_STONES } = await import('../src/shell/magicStones.js');
  assert.deepEqual([...MAGIC_STONE_IDS], MAGIC_STONES.map(({ id }) => id));
  const now = new Date().toISOString();
  const save = { checkpointId: 'chapter-6-start', unlocked: ['chapter-6-start'], magicStones: [...MAGIC_STONE_IDS], updatedAt: now };
  assert.equal(formatSave(save).title, 'THE LAST CARRIAGE');
  assert.equal(formatSave({ ...save, magicStones: MAGIC_STONE_IDS.slice(0, 4) }).title, 'ALL WORLDS AT ONCE');
  assert.equal(formatSave({ ...save, checkpointId: 'chapter-5-start' }).title, 'THE MUSEUM OF ONE ANSWER');
});
