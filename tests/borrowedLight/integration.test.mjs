import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { CHECKPOINTS, createSaveStore, formatSave } from '../../src/shell/saveSystem.js';
import { MAGIC_STONES } from '../../src/shell/magicStones.js';
import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';
import { MARA_LETTER, MECHANIC_LINES } from '../../src/chapters/borrowedLight/story.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function memoryStorage() {
  const values = new Map();
  return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
}

test('Chapter 2 checkpoints route to borrowed-light.html by section, and old ids still load', () => {
  const byId = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c]));
  assert.equal(byId['chapter-2-start'].route, '/borrowed-light.html');
  assert.equal(byId['chapter-2-midpoint'].route, '/borrowed-light.html?section=B');
  assert.equal(byId['chapter-2-platform'].route, '/borrowed-light.html?section=C');
  for (const id of ['chapter-2-start', 'chapter-2-midpoint', 'chapter-2-platform']) {
    assert.equal(byId[id].chapter, 2);
    assert.match(byId[id].title, /^BORROWED LIGHT/);
    assert.equal(byId[id].launch, undefined, `${id} no longer boots the old in-page parkour`);
  }
  // An old save sitting on the parkour midpoint shows the new chapter name.
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  store.startNew(0);
  store.markCheckpoint('chapter-2-midpoint', { slot: 0 });
  assert.match(formatSave(store.readAll()[0]).title, /BORROWED LIGHT/);
  store.markCheckpoint('chapter-2-platform', { slot: 0 });
  assert.equal(store.readAll()[0].checkpointId, 'chapter-2-platform');
});

test('Chapter 1 hands off to the new page, and the 1→2 preload profile warms it', () => {
  const chapter1 = read('src/scenes/GameScene.js');
  assert.match(chapter1, /markCheckpoint\('chapter-2-start'\)[\s\S]*?preloadChapterId: 'chapter2'[\s\S]*?launchCheckpoint\('chapter-2-start'\)/);
  const preloader = read('src/shell/chapterPreloader.js');
  assert.match(preloader, /chapter2: Object\.freeze\(\{\s*route: '\/borrowed-light\.html'/);
});

test('the page is a production build input with its own title and favicon', () => {
  assert.ok(existsSync(new URL('../../borrowed-light.html', import.meta.url)));
  const html = read('borrowed-light.html');
  assert.match(html, /<title>NIGHTFALL — Borrowed Light<\/title>/);
  assert.match(html, /rel="icon"[^>]*favicon\.png/);
  assert.match(html, /src="\/src\/borrowedLight-main\.js"/);
  assert.match(read('vite.config.js'), /borrowed-light\.html/);
});

test('entry: own 1920×1080 antialiased FIT Arcade game, chapter controls, dev-only QA hooks', () => {
  const main = read('src/borrowedLight-main.js');
  assert.match(main, /installPauseMenu\(\{ controls: CHAPTER_CONTROLS\.borrowedLight \}\)/);
  assert.match(main, /antialias: true/);
  assert.match(main, /Phaser\.Scale\.FIT/);
  assert.match(main, /default: 'arcade'/);
  assert.match(main, /if \(DEV_MODE\) \{\s*const scene/);
  assert.match(main, /window\.render_game_to_text = /);
  // Production-only inputs: the section is honoured only when unlocked, the
  // QA timescale and intro skip only in dev.
  assert.match(main, /resolveStartSection\(\{\s*search: window\.location\.search,\s*devMode: DEV_MODE,\s*unlocked:/);
  assert.match(main, /const qaTimescale = DEV_MODE && devParam\('timescale'\) !== null/);
  assert.match(main, /const skipIntro = DEV_MODE && devParam\('intro'\) === '0'/);
  const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
  assert.match(scene, /width: 1920|w: 1920/);
});

test('Chapter 2 exits exactly like before: save chapter-3-start, 2-3 film, chapter-3 preload gate, Echo City', () => {
  const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
  assert.match(scene, /markCheckpoint\('chapter-3-start'\);\s*navigateAfterCinematic\('chapter-2-to-3', CINEMATICS\.chapter2To3, '\/car03-3d\.html', \{[\s\S]*?preloadChapterId: 'chapter3',\s*requirePreloadReady: true/);
});

test('the Grid Stone keeps its id, gets a new clue, and is an authored world pickup', () => {
  const stone = MAGIC_STONES.find((s) => s.id === 'chapter-2');
  assert.equal(stone.name, 'GRID STONE');
  assert.match(stone.clue, /afterglow/);
  const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
  assert.match(scene, /collectMagicStone\('chapter-2'\)/);
  assert.doesNotMatch(scene, /offerMagicStone/);
});

test('story text: the mechanic line from the spec and Mara\'s letter kept word for word from the old chapter', () => {
  const old = read('src/cars/cyberpunkParkour/CyberpunkParkourScene.js');
  for (const line of MARA_LETTER.lines) assert.ok(old.includes(line.replace(/'/g, "\\'")) || old.includes(line), `letter line missing from original: ${line}`);
  assert.ok(MECHANIC_LINES.some((l) => /three nights ago\. Took the same roofs\. Said you'd be along\./.test(l.text)));
  assert.ok(MECHANIC_LINES.every((l) => l.speaker === 'ROOFTOP MECHANIC'));
  // Nothing defines Butch's relation to Mara.
  const words = [...MECHANIC_LINES.map((l) => l.text), ...MARA_LETTER.lines].join(' ');
  assert.doesNotMatch(words, /\b(sister|brother|wife|husband|daughter|son|lover)\b/i);
});

test('controls list the chapter\'s verbs, including Listen and the gamepad', () => {
  const rows = CHAPTER_CONTROLS.borrowedLight.map(([a, k]) => `${a} ${k}`).join(' | ');
  for (const needle of ['MOVE', 'JUMP', 'PUNCH', 'F / LEFT CLICK', 'HOLD Q', 'E', 'ESC', 'RB', 'LB']) assert.match(rows, new RegExp(needle));
});

test('player-visible chapter name is BORROWED LIGHT in the router, credits and chapter select', () => {
  const title = read('src/shell/titleMenu.js');
  assert.match(title, /CHAPTER 2 · BORROWED LIGHT/);
  assert.match(title, /borrowed-light\.html\?section=B/);
  assert.match(title, /<strong>BORROWED LIGHT<\/strong>/);
  assert.match(read('src/shell/creditsData.js'), /stamp: 'BORROWED LIGHT'/);
  assert.match(read('src/scenes/DevMenuScene.js'), /BORROWED LIGHT[\s\S]*borrowed-light\.html\?section=C/);
});

test('reduced motion is respected: no heavy rain streaks, no lightning flash, no camera shake', () => {
  const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
  assert.match(scene, /w\.near\.setVisible\(!reduced\)/);
  assert.match(scene, /this\.flashT = reducedMotionActive\(\) \? 0 : strength/);
  assert.match(scene, /if \(!reducedMotionActive\(\)\) this\.cameras\.main\.shake/);
  assert.match(read('src/borrowedLight-main.js'), /installPhaserMotionGuard\(Phaser\)/);
});
