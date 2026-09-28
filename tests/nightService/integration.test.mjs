import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHECKPOINTS, createSaveStore, formatSave } from '../../src/shell/saveSystem.js';
import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';
import { MAGIC_STONES } from '../../src/shell/magicStones.js';
import { devParams } from '../../src/devMode.js';
import { CHECKPOINT_ACTS, resolveActParam } from '../../src/chapters/nightService/acts/index.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}

test('Chapter 1 checkpoints route to night-service.html with an act', () => {
  const byId = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c]));
  for (const [id, act] of [['chapter-1-start', 1], ['chapter-1-act-2', 2], ['chapter-1-act-3', 3], ['prologue-start', 1]]) {
    assert.equal(byId[id].route, '/night-service.html', id);
    assert.equal(byId[id].act, act, id);
    assert.equal(byId[id].chapter, 1);
    assert.equal(CHECKPOINT_ACTS[id], `act${act}`);
  }
  assert.equal(byId['prologue-start'].legacy, true, 'legacy id kept so old saves still load');
  assert.equal(byId['chapter-2-start'].launch, 'chapter-2', 'Chapter 2 still launches the existing parkour');
});

test('a new journey starts at chapter-1-start; an old prologue-start save still formats', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  const save = store.startNew(0);
  assert.equal(save.checkpointId, 'chapter-1-start');
  assert.deepEqual(save.unlocked, ['chapter-1-start']);
  store.markCheckpoint('chapter-1-act-2');
  assert.equal(formatSave(store.readAll()[0]).title, 'NIGHT SERVICE · THE LUGGAGE CAR');
  const legacy = { ...save, checkpointId: 'prologue-start', unlocked: ['prologue-start'] };
  assert.equal(formatSave(legacy).checkpoint.route, '/night-service.html');
});

test('production ignores ?act= and ?step= (dev params are empty outside the dev build)', () => {
  assert.equal(devParams('?act=3&step=conductor').get('act'), null);
  assert.equal(resolveActParam(devParams('?act=3').get('act')), null);
  const main = read('src/nightService-main.js');
  assert.match(main, /const params = devParams\(\);/);
  assert.match(main, /resolveActParam\(params\.get\('act'\)\) \?\? savedAct\(\)/);
  assert.match(main, /if \(DEV_MODE\) \{\s*window\.render_game_to_text/);
});

test('title New Game plays the opening film then opens night-service.html', () => {
  const title = read('src/shell/titleMenu.js');
  assert.match(title, /id: 'opening',[\s\S]{0,300}onComplete: \(\) => window\.location\.assign\('\/night-service\.html'\)/);
  assert.match(title, /route: '\/night-service\.html\?act=1'/, 'dev 1111 router lists the acts');
});

test('the page is a build input with its own title and favicon', () => {
  assert.match(read('vite.config.js'), /nightService: resolve\(import\.meta\.dirname, 'night-service\.html'\)/);
  const html = read('night-service.html');
  assert.match(html, /<title>NIGHTFALL — Night Service<\/title>/);
  assert.match(html, /rel="icon" type="image\/png" href="\/favicon\.png"/);
  assert.match(html, /src="\/src\/nightService-main\.js"/);
});

test('the pause menu shows Chapter 1 panel controls with keyboard fallbacks', () => {
  const rows = CHAPTER_CONTROLS.nightServicePanels;
  assert.ok(rows.length >= 6);
  const text = rows.map((row) => row.join(' ')).join(' | ');
  ['DRAG', 'SPACE', 'TAB', 'ENTER', 'BACKSPACE', 'RIGHT-CLICK', 'F', 'ESC'].forEach((word) => assert.match(text, new RegExp(word)));
  assert.match(read('src/nightService-main.js'), /controls: CHAPTER_CONTROLS\.nightServicePanels/);
});

test('the Ember Stone clue points at the orchard case in Act 2', () => {
  const ember = MAGIC_STONES.find((stone) => stone.id === 'chapter-1');
  assert.equal(ember.name, 'EMBER STONE');
  assert.match(ember.clue, /letter to Rosa/);
});

test('act end leads to chapter-2-start, the 1-2 film and the existing Chapter 2 launch', () => {
  const main = read('src/nightService-main.js');
  assert.match(main, /onChapterEnd\(\) \{[\s\S]*?onCheckpoint\('chapter-2-start'\)[\s\S]*?CINEMATICS\.chapter1To2[\s\S]*?preloadChapterId: 'chapter2'[\s\S]*?onComplete: launchChapter2/);
  assert.match(main, /pendingLaunch\.v1', 'chapter-2'\)/);
});
