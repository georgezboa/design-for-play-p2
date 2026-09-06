import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');

test('every delivered film is preserved as a production runtime asset', () => {
  for (const name of ['start', '1-2', '2-3', '3-4', '4-5', 'end']) {
    assert.equal(existsSync(resolve(root, `public/cinematics/${name}.mp4`)), true, `${name}.mp4 missing`);
  }
});

test('the completed chapter route owns all four film handoffs', () => {
  assert.match(source('src/scenes/GameScene.js'), /CINEMATICS\.chapter1To2/);
  assert.match(source('src/cars/cyberpunkParkour/CyberpunkParkourScene.js'), /CINEMATICS\.chapter2To3/);
  assert.match(source('src/cars/presentCity3d/Chapter3OpeningRuntime.js'), /nightfall:chapter3-complete/);
  assert.match(source('src/car03-3d-main.js'), /CINEMATICS\.chapter3To4/);
  assert.match(source('src/chapters/paintedCountry/PigmentTrainScene.js'), /CINEMATICS\.chapter4To5/);
});

test('Chapter One releases its score before the 1→2 film begins', () => {
  const chapter1 = source('src/scenes/GameScene.js');
  assert.match(chapter1, /this\.prologueScoreReleased = true;[\s\S]*?music\.stop\(\{ fade: 1\.4 \}\)/);
  assert.match(chapter1, /if \(this\.prologueScoreReleased \|\| this\.prologueTransitionActive \|\| this\.skipPrologue/);
});

test('every transition preloads its next chapter while the film is playing', () => {
  const flow = source('src/shell/gameFlow.js');
  const title = source('src/shell/titleMenu.js');
  const chapter1 = source('src/scenes/GameScene.js');
  const chapter2 = source('src/cars/cyberpunkParkour/CyberpunkParkourScene.js');
  const chapter3 = source('src/car03-3d-main.js');
  const chapter4 = source('src/chapters/paintedCountry/PigmentTrainScene.js');
  assert.match(flow, /video\.addEventListener\('playing', beginPreload/);
  assert.match(flow, /const waitForPreload = Boolean\(preloadChapterId\) \|\| requirePreloadReady/);
  assert.match(flow, /if \(waitForPreload\)[\s\S]*?await preloadPromise/);
  for (const [file, chapter] of [[title, 1], [chapter1, 2], [chapter2, 3], [chapter3, 4], [chapter4, 5]]) {
    assert.match(file, new RegExp(`preloadChapterId: 'chapter${chapter}'`));
  }
});

test('the hidden title router gives Chapter 3 direct node access', () => {
  const title = source('src/shell/titleMenu.js');
  assert.match(title, /id: '3\.1'[\s\S]*?CITY ENTRY · DAWN[\s\S]*?route: '\/car03-3d\.html'/);
  assert.match(title, /id: '3\.2'[\s\S]*?DUSK CAMPFIRE/);
  assert.match(title, /id: '3\.4'[\s\S]*?SUNRISE OVERLOOK/);
});

test('the integrated preview preserves the Chapter 3 film preload across navigation', () => {
  const vite = source('vite.config.js');
  assert.doesNotMatch(vite, /'Cache-Control': 'no-store'/);
  assert.match(vite, /Chapter 3's 2→3 film fetches its full scene[\s\S]*?reuse those cached bytes/);
});

test('the playable Chapter 5 collapse preloads the single resolved final-boss destination', () => {
  const museum = source('src/chapters/museum3d/Museum3DApp.js');
  assert.match(museum, /directionId === CHAPTER05_DIRECTIONS\.LABYRINTH.*resolveFinalBossDestination\(\)\.preloadChapterId/s);
  assert.match(museum, /labyrinthComplete[\s\S]*resolveFinalBossDestination\(\)\.preloadChapterId/);
  const profiles = source('src/shell/chapterPreloader.js');
  assert.match(profiles, /route: '\/final-boss\.html\?from=chapter5'/);
  assert.match(profiles, /6\.1_threshold_modern\.mp3/);
});

test('Chapter 5 black threshold lands directly in the final boss', () => {
  const collapse = source('src/chapters/museum3d/state/collapseGauntlet.js');
  const boss = source('src/chapters/finalBoss/spectacleBattle.js');
  assert.match(collapse, /\/final-boss\.html\?from=chapter5/);
  assert.match(boss, /get\('from'\) === 'chapter5'/);
  assert.match(boss, /CINEMATICS\.ending/);
  assert.match(boss, /preserveBlackout: true[\s\S]*showEndCredits\(\)/);
  assert.match(source('src/shell/endCredits.js'), /CREDIT_TEAM\.map\(\(\{ name \}\) => name\)/);
  assert.match(source('src/shell/endCredits.js'), /music\.play\('end-credits'/);
  assert.match(source('src/main.js'), /DEV_MODE \|\| playRequested/);
  assert.match(source('src/shell/saveSystem.js'), /window\.location\.assign\('\/\?play=1'\)/);
  assert.match(source('src/scenes/GameScene.js'), /music\.play\(`prologue-\$\{cue\}`/);
  assert.match(source('src/cars/cyberpunkParkour/CyberpunkParkourScene.js'), /chapter-two-neon-safety-test/);
  assert.match(source('src/cars/presentCity3d/Chapter3OpeningRuntime.js'), /c3-\$\{cue\}/);
  assert.match(source('src/chapters/museum3d/Museum3DApp.js'), /CHAPTER5_SCORE/);
  assert.match(source('src/chapters/museum3d/chapter05Score.js'), /ch5-dies-irae/);
});

test('the shared ESC pause menu exposes resume, save, settings and title exit', () => {
  const pause = source('src/shell/pauseMenu.js');
  for (const label of ['RESUME', 'SAVE', 'SETTINGS', 'RETURN TO TITLE']) {
    assert.match(pause, new RegExp(`action\\('${label}'`));
  }
  assert.match(pause, /event\.key !== 'Escape'/);
  assert.match(pause, /pausedPhaserScenes = game\.scene\.getScenes\(true\)/);
  assert.match(pause, /pausedPhaserScenes\.forEach/);
  assert.doesNotMatch(pause, /else scene\.scene\.resume\(\)/);
});

test('the invisible 1111 title code opens every chapter’s named test nodes', () => {
  const title = source('src/shell/titleMenu.js');
  const devMode = source('src/devMode.js');
  assert.match(title, /hiddenChapterSequence === '1111'/);
  assert.match(title, /SELECT TEST NODE/);
  for (const group of [
    'CHAPTER 1 · NIGHT SERVICE',
    'CHAPTER 2 · BORROWED GRID',
    'CHAPTER 3 · ECHO CITY',
    'CHAPTER 4 · THE PAINTED COUNTRY',
    'CHAPTER 5 · MUSEUM OF ONE ANSWER',
    'CHAPTER 6 · ALL WORLDS AT ONCE',
  ]) {
    assert.match(title, new RegExp(group));
  }
  for (const phase of [1, 2, 3, 4, 5, 6]) assert.match(title, new RegExp(`\\?qa=phase${phase}&state=entry`));
  assert.match(title, /chapter-2-midpoint/);
  assert.match(title, /painted-country\.html\?qa=drawing/);
  assert.match(title, /museum-3d\.html\?beat=corridor/);
  assert.match(title, /museum-3d\.html\?beat=collapse/);
  for (const movement of [1, 2, 3, 4]) assert.match(title, new RegExp(`CONDUCTOR ${['I', 'II', 'III', 'IV'][movement - 1]}[\\s\\S]*final-boss\\.html\\?qa=conductor-${movement}`));
  assert.match(title, /BLACK KNIFE · HIDDEN FINALE[\s\S]*hidden-final-boss\.html\?easter-egg=1/);
  assert.match(title, /preload: 'hiddenBoss'/);
  assert.match(title, /activateHiddenRouter\(\)/);
  assert.match(devMode, /hiddenRouterActive/);
  assert.match(devMode, /return DEV_MODE \|\| hiddenRouterActive\(\)/);
});
