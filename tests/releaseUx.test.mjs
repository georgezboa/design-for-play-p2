import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { collectMagicStone, MAGIC_STONES, magicStoneRow, magicStoneSnapshot } from '../src/shell/magicStones.js';
import { resolveCheckpointRoute } from '../src/shell/finalBossRoute.js';
import {
  DEFAULT_SETTINGS,
  RETURN_TO_TITLE_PROMPT,
  TITLE_REQUEST_EVENT,
  createSaveStore,
  requestReturnToTitle,
  titleNavigationTarget,
} from '../src/shell/saveSystem.js';
import { SETTINGS_CONTROLS } from '../src/shell/settingsControls.js';
import { osPrefersReducedMotion, reducedMotionActive } from '../src/shell/motion.js';
import { createHoldGesture, isSkipKey, SKIP_HOLD_MS } from '../src/shell/holdToSkip.js';
import { CHAPTER_CONTROLS } from '../src/shell/chapterControls.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function chapter6Save(storage, slot, stoneIds) {
  const store = createSaveStore(storage);
  store.startNew(slot);
  stoneIds.forEach((id) => store.collectMagicStone(id, { slot }));
  store.markCheckpoint('chapter-6-start', { slot });
  return store;
}

// ---------- continue routing ----------

test('a chapter-6 save holding all five stones continues into the Black Knife fight', () => {
  const storage = memoryStorage();
  chapter6Save(storage, 0, MAGIC_STONES.map(({ id }) => id));
  assert.equal(resolveCheckpointRoute('chapter-6-start', { storage, slot: 0 }), '/hidden-final-boss.html');
});

test('a chapter-6 save with fewer than five stones continues into the Conductor', () => {
  const storage = memoryStorage();
  chapter6Save(storage, 0, MAGIC_STONES.slice(0, 4).map(({ id }) => id));
  assert.equal(resolveCheckpointRoute('chapter-6-start', { storage, slot: 0 }), '/final-boss.html');
});

test('continue routing reads the chosen slot, not whichever slot was active last', () => {
  const storage = memoryStorage();
  chapter6Save(storage, 0, MAGIC_STONES.map(({ id }) => id));
  const store = chapter6Save(storage, 1, []);
  assert.equal(store.getActiveSlot(), 1);
  assert.equal(resolveCheckpointRoute('chapter-6-start', { storage, slot: 0 }), '/hidden-final-boss.html');
  assert.equal(resolveCheckpointRoute('chapter-6-start', { storage, slot: 1 }), '/final-boss.html');
});

test('earlier checkpoints keep their default route', () => {
  const storage = memoryStorage();
  for (const id of ['prologue-start', 'chapter-3-start', 'chapter-5-start']) {
    assert.equal(resolveCheckpointRoute(id, { storage, slot: 0 }), null);
  }
});

test('the title menu launches Continue and Load through the resolved route', () => {
  const title = read('src/shell/titleMenu.js');
  assert.match(title, /launchCheckpoint\(activeSave\.checkpointId, \{\s*route: resolveCheckpointRoute\(/);
  assert.match(title, /launchCheckpoint\(checkpoint\.id, \{ route: resolveCheckpointRoute\(checkpoint\.id, \{ slot: index \}\) \}\)/);
  assert.match(read('src/shell/saveSystem.js'), /route = null[\s\S]*?route \? \{ \.\.\.base, route \} : base/);
});

test('the Black Knife fight records the Chapter 6 checkpoint unless it redirects', () => {
  const main = read('src/chapters/blackKnifeFinal/main.js');
  assert.match(main, /if \(redirectToConductor\) \{[\s\S]*?\} else \{[\s\S]*?markCheckpoint\('chapter-6-start'\)/);
});

// ---------- stones ----------

test('the true ending row has one gem per registered stone', () => {
  const storage = memoryStorage();
  createSaveStore(storage).startNew(0);
  collectMagicStone('chapter-1', storage);
  collectMagicStone('black-knife', storage);
  const row = magicStoneRow(magicStoneSnapshot(storage));
  assert.equal(row.length, 5);
  assert.deepEqual(row.map(({ id }) => id), MAGIC_STONES.map(({ id }) => id));
  assert.deepEqual(row.filter(({ held }) => held).map(({ id }) => id), ['chapter-1', 'black-knife']);
  const html = read('true-ending.html');
  assert.doesNotMatch(html, /<i class="stone">/);
  assert.doesNotMatch(html, /Four collected/);
  assert.match(read('src/trueEnding-main.js'), /magicStoneRow\(stones\)/);
});

// ---------- settings plumbing ----------

test('settings lists no longer offer the no-op subtitles toggle', () => {
  assert.deepEqual(SETTINGS_CONTROLS.map(([key]) => key), ['masterVolume', 'musicVolume', 'sfxVolume', 'textScale', 'reducedMotion']);
  assert.equal('subtitles' in DEFAULT_SETTINGS, false);
  for (const file of ['src/shell/pauseMenu.js', 'src/shell/titleMenu.js']) {
    assert.doesNotMatch(read(file), /'SUBTITLES'/);
    assert.match(read(file), /SETTINGS_CONTROLS\.forEach/);
  }
});

test('reduced motion follows either the in-game toggle or the OS preference', () => {
  const os = (matches) => ({ matchMedia: () => ({ matches }) });
  assert.equal(reducedMotionActive({ settings: { reducedMotion: false }, win: os(false) }), false);
  assert.equal(reducedMotionActive({ settings: { reducedMotion: true }, win: os(false) }), true);
  assert.equal(reducedMotionActive({ settings: { reducedMotion: false }, win: os(true) }), true);
  assert.equal(osPrefersReducedMotion({ matchMedia: () => { throw new Error('unsupported'); } }), false);
  assert.equal(osPrefersReducedMotion({}), false);
});

test('gameplay shake and flash sites consult the shared reduced-motion check', () => {
  const guard = read('src/shell/motion.js');
  assert.match(guard, /Shake\.prototype\.start = function start\(duration, intensity, \.\.\.rest\)/);
  assert.match(guard, /reducedMotionActive\(\) \? 0 : intensity/);
  assert.match(guard, /Flash\.prototype\.start/);
  for (const entry of [
    'src/nightService-main.js',
    'src/borrowedLight-main.js',
    'src/paintedCountry-main.js',
    'src/chapters/museum/labyrinth/labyrinth-main.js',
    'src/chapters/blackKnifeFinal/main.js',
    'src/chapters/borrowedGrid/borrowed-grid-main.js',
    'src/chapters/paintedCountry/painted-country-main.js',
  ]) assert.match(read(entry), /^installPhaserMotionGuard\(Phaser\);$/m, entry);
  const museum = read('src/chapters/museum3d/systems/CollapseGauntletDirector.js');
  assert.match(museum, /get _reducedMotion\(\) \{\s*return reducedMotionActive\(\);/);
  assert.doesNotMatch(museum, /this\._reducedMotion = window\.matchMedia/);
  const boss = read('src/chapters/finalBoss/spectacleBattle.js');
  assert.match(boss, /shakeEnabled && !reducedMotionActive\(\)/);
  assert.match(boss, /flashEnabled && !reducedMotionActive\(\)/);
  assert.match(read('src/car03-3d-main.js'), /if \(!reducedMotionActive\(\)\) triggerCityShake/);
});

test('the Black Knife fight reads the global volume buses', () => {
  const scene = read('src/chapters/blackKnifeFinal/scenes/BossScene.js');
  assert.match(scene, /const level = vol \* bus\('sfx'\)/);
  assert.match(scene, /volume: MUSIC_BASE_VOLUME \* bus\('music'\)/);
  assert.match(read('src/chapters/blackKnifeFinal/main.js'), /installPauseMenu\(\{ checkpointId: 'chapter-6-start', controls: CHAPTER_CONTROLS\.blackKnife \}\)/);
});

test('text size scales in-chapter dialogue and HUD text', () => {
  for (const file of ['car03-3d.html', 'museum-3d.html', 'src/chapters/finalBoss/style.css', 'src/shell/pauseMenu.css']) {
    assert.match(read(file), /var\(--nightfall-text-scale, ?1\)/, file);
  }
});

// ---------- title exits ----------

test('title exits go through a cancellable request with a fallback confirmation', () => {
  const previousDispatch = globalThis.dispatchEvent;
  const seen = [];
  try {
    globalThis.dispatchEvent = (event) => { seen.push(event.type); return false; };
    assert.equal(requestReturnToTitle({ confirm: () => assert.fail('pause menu handles it') }), false);
    assert.deepEqual(seen, [TITLE_REQUEST_EVENT]);

    globalThis.dispatchEvent = () => true;
    let asked = null;
    assert.equal(requestReturnToTitle({ confirm: (text) => { asked = text; return false; } }), false);
    assert.equal(asked, RETURN_TO_TITLE_PROMPT);
    assert.match(asked, /Unsaved progress since the last checkpoint will be lost/);
  } finally {
    globalThis.dispatchEvent = previousDispatch;
  }
});

test('an embedded page navigates its same-origin top window to the title', () => {
  const top = { location: { origin: 'app://nightfall' } };
  const framed = { top, location: { origin: 'app://nightfall' } };
  assert.equal(titleNavigationTarget(framed), top);
  const alone = { location: { origin: 'app://nightfall' } };
  alone.top = alone;
  assert.equal(titleNavigationTarget(alone), alone);
  const foreignTop = { get location() { throw new Error('cross-origin'); } };
  const foreign = { top: foreignTop, location: { origin: 'app://nightfall' } };
  assert.equal(titleNavigationTarget(foreign), foreign);
});

// ---------- cinematics ----------

test('holding a skip input for the full duration completes the gesture', () => {
  const hold = createHoldGesture({ holdMs: 1000 });
  hold.press('key:Space', 0);
  assert.equal(hold.progress(500), 0.5);
  assert.equal(hold.completed, false);
  assert.equal(hold.progress(1000), 1);
  assert.equal(hold.completed, true);
  assert.equal(SKIP_HOLD_MS, 1000);
});

test('releasing early resets the hold; overlapping inputs keep it going', () => {
  const hold = createHoldGesture({ holdMs: 1000 });
  hold.press('key:Space', 0);
  hold.release('key:Space');
  assert.equal(hold.progress(900), 0);
  hold.press('key:Enter', 1000);
  hold.press('pointer:1', 1200);
  hold.release('key:Enter');
  assert.equal(hold.holding, true);
  assert.equal(hold.progress(1500), 0.5);
  hold.releaseAll();
  assert.equal(hold.progress(3000), 0);
});

test('Space, Enter and Escape skip; other keys only reveal the prompt', () => {
  for (const code of ['Space', 'Enter', 'NumpadEnter', 'Escape']) assert.equal(isSkipKey({ code }), true);
  for (const code of ['KeyE', 'KeyW', 'Tab']) assert.equal(isSkipKey({ code, key: code }), false);
});

test('every film uses hold-to-skip and a skip still waits for the preload gate', () => {
  const flow = read('src/shell/gameFlow.js');
  assert.match(flow, /HOLD TO SKIP/);
  assert.match(flow, /const skip = \(\) => \{[\s\S]*?finish\(\);/);
  assert.match(flow, /holdForPreload = waitForPreload && Boolean\(preloadPromise\) && !preloadSettled/);
  assert.match(flow, /await preloadPromise;/);
  // Escape belongs to the film while one is playing.
  assert.match(read('src/shell/pauseMenu.js'), /if \(!paused && getActiveCinematic\(\)\) return;/);
});

// ---------- per-chapter controls ----------

test('each chapter passes its own controls list to the pause menu', () => {
  assert.match(read('src/car03-3d-main.js'), /CHAPTER_CONTROLS\.echoCity/);
  assert.match(read('src/paintedCountry-main.js'), /CHAPTER_CONTROLS\.paintedCountry/);
  assert.match(read('src/chapters/museum3d/museum3d-main.js'), /CHAPTER_CONTROLS\.museum/);
  assert.match(read('src/chapters/finalBoss/spectacleBattle.js'), /controls: \[/);
  assert.match(read('src/nightService-main.js'), /controls: CHAPTER_CONTROLS\.nightServicePanels/);
  assert.match(read('src/borrowedLight-main.js'), /CHAPTER_CONTROLS\.borrowedLight/);
  assert.match(CHAPTER_CONTROLS.echoCity[0][1], /CLICK/);
  assert.match(CHAPTER_CONTROLS.paintedCountry.map(([, keys]) => keys).join(' '), /RIGHT MOUSE/);
  // index.html runs no chapter, so it has no pause menu or controls list.
  assert.doesNotMatch(read('src/main.js'), /installPauseMenu|CHAPTER_CONTROLS/);
  assert.doesNotMatch(read('src/shell/titleMenu.js'), /installPauseMenu/);
});
