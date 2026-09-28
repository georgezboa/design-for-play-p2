import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { CHECKPOINTS, createSaveStore, formatSave } from '../../src/shell/saveSystem.js';
import { MAGIC_STONES } from '../../src/shell/magicStones.js';
import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';
import { MARA_LETTER, MECHANIC_LINES } from '../../src/chapters/borrowedLight/story.js';
import { resolveStartSection } from '../../src/chapters/borrowedLight/level.js';

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

test('an old chapter-2-midpoint save lands in section B in production', () => {
  const storage = memoryStorage();
  const now = new Date().toISOString();
  const legacy = [
    { version: 1, slot: 0, checkpointId: 'chapter-2-midpoint', unlocked: ['prologue-start', 'chapter-2-start', 'chapter-2-midpoint'], magicStones: [], createdAt: now, updatedAt: now, playSeconds: 0 },
    // Hand-migrated saves sometimes sit on a checkpoint they never listed.
    { version: 1, slot: 1, checkpointId: 'chapter-2-midpoint', unlocked: ['prologue-start'], magicStones: [], createdAt: now, updatedAt: now, playSeconds: 0 },
    null,
  ];
  storage.setItem('nightfall.saves.v1', JSON.stringify(legacy));
  const store = createSaveStore(storage);
  const route = CHECKPOINTS.find((c) => c.id === 'chapter-2-midpoint').route;
  const search = route.slice(route.indexOf('?'));
  for (const save of store.readAll().slice(0, 2)) {
    assert.equal(save.checkpointId, 'chapter-2-midpoint');
    // The same inputs borrowedLight-main.js passes.
    const unlocked = [...(save.unlocked ?? []), save.checkpointId].filter(Boolean);
    assert.equal(resolveStartSection({ search, devMode: false, unlocked }), 'B', `slot ${save.slot}`);
  }
  assert.match(read('src/borrowedLight-main.js'), /unlocked: \[\.\.\.\(activeSave\?\.unlocked \?\? \[\]\), activeSave\?\.checkpointId\]\.filter\(Boolean\)/);
  // Without that save, production ignores the ?section= request.
  assert.equal(resolveStartSection({ search, devMode: false, unlocked: ['chapter-2-start'] }), 'A');
});

test('Chapter 1 hands off to the new page, and the 1→2 preload profile warms it', () => {
  const chapter1 = read('src/nightService-main.js');
  assert.match(chapter1, /function launchChapter2\(\) \{\s*launchCheckpoint\('chapter-2-start'\);/);
  assert.match(chapter1, /onCheckpoint\('chapter-2-start'\)[\s\S]*?preloadChapterId: 'chapter2',\s*onComplete: launchChapter2/);
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
  // Mara's letter exactly as the retired Phaser parkour chapter
  // (src/cars/cyberpunkParkour/CyberpunkParkourScene.js) wrote it.
  assert.deepEqual(MARA_LETTER.lines, [
    'Butch— I made it through this city, but I could not wait here.',
    'The train opened the next door before dawn. I went on.',
    'If you are following me, keep moving. I will leave another mark where I can. — Mara',
  ]);
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
  // One route list feeds both the dev launcher and the title's 1111 router.
  const routes = read('src/shell/devRoutes.js');
  assert.match(routes, /CHAPTER 2 · BORROWED LIGHT/);
  assert.match(routes, /borrowed-light\.html\?section=B/);
  assert.match(routes, /BORROWED LIGHT[\s\S]*borrowed-light\.html\?section=C/);
  assert.match(read('src/shell/titleMenu.js'), /<strong>BORROWED LIGHT<\/strong>/);
  assert.match(read('src/shell/creditsData.js'), /stamp: 'BORROWED LIGHT'/);
  assert.match(read('src/shell/devLauncher.js'), /DEV_ROUTES/);
});

test('reduced motion is respected: no heavy rain streaks, no lightning flash, no camera shake', () => {
  const scene = read('src/chapters/borrowedLight/BorrowedLightScene.js');
  assert.match(scene, /w\.near\.setVisible\(!reduced\)/);
  assert.match(scene, /this\.flashT = reducedMotionActive\(\) \? 0 : strength/);
  assert.match(scene, /if \(!reducedMotionActive\(\)\) this\.cameras\.main\.shake/);
  assert.match(read('src/borrowedLight-main.js'), /installPhaserMotionGuard\(Phaser\)/);
});
