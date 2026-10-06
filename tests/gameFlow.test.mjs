import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');

test('the films are gone: every transition is an in-engine cutscene (docs/CUTSCENES_SPEC.md)', async () => {
  const { CUTSCENE_IDS, CUTSCENE_LOADERS, FILM_NAMES } = await import('../src/shell/cutscene/registry.js');
  for (const id of CUTSCENE_IDS) {
    assert.equal(typeof CUTSCENE_LOADERS[id], 'function', `${id} has no cutscene`);
    assert.equal(existsSync(resolve(root, `public/cinematics/${FILM_NAMES[id]}.mp4`)), false, `${id}: the old film still ships`);
  }
});

test('no runtime code names a retired film: CINEMATICS and the Museum routes name cutscenes', async () => {
  const flow = source('src/shell/gameFlow.js');
  const route = source('src/shell/finalBossRoute.js');
  for (const [file, text] of [['gameFlow.js', flow], ['finalBossRoute.js', route]]) {
    assert.doesNotMatch(text, /cinematics\/|\.mp4|\.webm|createElement\('video'\)/, file);
  }
  const { CUTSCENE_IDS, resolveCutsceneId } = await import('../src/shell/cutscene/registry.js');
  const block = flow.match(/export const CINEMATICS = Object\.freeze\(\{([\s\S]*?)\}\);/)[1];
  const values = [...block.matchAll(/(\w+): '([^']+)'/g)];
  assert.equal(values.length, 6);
  for (const [, key, value] of values) assert.ok(CUTSCENE_IDS.includes(resolveCutsceneId(value, null)), key);
  for (const path of [...route.matchAll(/cinematicPath: '([^']+)'/g)].map((m) => m[1])) assert.ok(CUTSCENE_IDS.includes(path), path);
  assert.equal(existsSync(resolve(root, 'src/shell/cinematicSources.js')), false, 'the film source picker is gone');
});

test('the completed chapter route owns all four film handoffs', () => {
  assert.match(source('src/nightService-main.js'), /CINEMATICS\.chapter1To2/);
  assert.match(source('src/chapters/borrowedLight/BorrowedLightScene.js'), /CINEMATICS\.chapter2To3/);
  assert.match(source('src/cars/presentCity3d/Chapter3OpeningRuntime.js'), /nightfall:chapter3-complete/);
  assert.match(source('src/car03-3d-main.js'), /CINEMATICS\.chapter3To4/);
  // Chapter 4 now ends on the line ahead (PaintedLineScene), not the yard.
  assert.match(source('src/chapters/paintedCountry/PaintedLineScene.js'), /CINEMATICS\.chapter4To5/);
});

test('Chapter One releases its score before the 1→2 film begins', () => {
  const chapter1 = source('src/nightService-main.js');
  assert.match(chapter1, /onChapterEnd\(\) \{[\s\S]*?audio\.destroy\(\);\s*playCinematic\(\{/);
});

test('every transition preloads its next chapter while the film is playing', () => {
  const flow = source('src/shell/gameFlow.js');
  const title = source('src/shell/titleMenu.js');
  const chapter1 = source('src/nightService-main.js');
  const chapter2 = source('src/chapters/borrowedLight/BorrowedLightScene.js');
  const chapter3 = source('src/car03-3d-main.js');
  const chapter4 = source('src/chapters/paintedCountry/PaintedLineScene.js');
  assert.match(flow, /await cutscene\.start\(\);\s*\/\/ the next chapter loads while the cutscene plays\s*beginPreload\(\);/);
  assert.match(flow, /const waitForPreload = Boolean\(preloadChapterId\) \|\| requirePreloadReady/);
  assert.match(flow, /if \(waitForPreload\)[\s\S]*?await preloadPromise/);
  for (const [file, chapter] of [[title, 1], [chapter1, 2], [chapter2, 3], [chapter3, 4], [chapter4, 5]]) {
    assert.match(file, new RegExp(`preloadChapterId: 'chapter${chapter}'`));
  }
});

test('the hidden title router gives Chapter 3 direct node access', () => {
  const title = source('src/shell/devRoutes.js');
  assert.match(title, /id: '3\.1'[\s\S]*?CITY ENTRY · THE PLATFORM[\s\S]*?route: '\/car03-3d\.html'/);
  // 1.0 release: the campfire chatter and the overlook climb were cut; the
  // nodes now open the ticket board, the scanners and the night fire.
  assert.match(title, /id: '3\.2'[\s\S]*?TICKET 43 BOARD[\s\S]*?playtest=chapter3-board/);
  assert.match(title, /id: '3\.4'[\s\S]*?DUSK · THE CUT FEED/);
  assert.match(title, /id: '3\.6'[\s\S]*?STATION SCANNER · FINALE[\s\S]*?playtest=chapter3-station/);
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
  assert.match(boss, /preserveBlackout: true[\s\S]*showEndCredits\(\{ ending: 'normal' \}\)/);
  // Both endings hand over to the title menu's full credit roll, which plays
  // the credits track; the normal ending shows its archive card first.
  assert.match(source('src/shell/endCredits.js'), /END_CREDITS_ROUTE = '\/\?credits=1'/);
  assert.match(boss, /onComplete: \(\) => showNormalEndingCard\(\)\.then\(\(\) => showEndCredits\(\{ ending: 'normal' \}\)\)/);
  assert.match(boss, /CLAIM 1978-0412 · STATUS: OPEN/);
  assert.match(source('src/shell/titleMenu.js'), /new Audio\(CREDIT_MUSIC\[0\]\.localFile\)/);
  // The ending returns to /?credits=1; the legacy /?play=1 entry resumes
  // the active checkpoint instead of booting a game on index.html.
  assert.match(source('src/main.js'), /params\.get\('credits'\) === '1'[\s\S]*?createTitleMenu\(\{ openCredits: true, ending: params\.get\('ending'\) \}\)/);
  assert.match(source('src/main.js'), /params\.get\('play'\) === '1'[\s\S]*?resumeActiveCheckpoint\(\)/);
  assert.match(source('src/chapters/nightService/audio.js'), /1\.1_train_undertow\.mp3/);
  assert.match(source('src/chapters/borrowedLight/level.js'), /id: 'chapter-two-borrowed-light', src: 'assets\/music\/ch2\/2\.1_borrowed_light\.mp3'/);
  assert.match(source('src/chapters/borrowedLight/BorrowedLightScene.js'), /music\.play\(id, \{ \.\.\.options, \.\.\.overrides \}\)/);
  assert.match(source('src/cars/presentCity3d/Chapter3OpeningRuntime.js'), /c3-\$\{cue\}/);
  assert.match(source('src/chapters/museum3d/Museum3DApp.js'), /CHAPTER5_SCORE/);
  assert.match(source('src/chapters/museum3d/chapter05Score.js'), /ch5-baba-yaga/);
});

test('the shared ESC pause menu exposes resume, settings and a confirmed title exit', () => {
  const pause = source('src/shell/pauseMenu.js');
  for (const label of ['RESUME', 'SETTINGS', 'RETURN TO TITLE', 'CANCEL']) {
    assert.match(pause, new RegExp(`action\\('${label}'`));
  }
  // No SAVE button: the menu reports the saved checkpoint instead of
  // re-marking the chapter start and claiming the journey was saved.
  assert.doesNotMatch(pause, /action\('SAVE'/);
  assert.doesNotMatch(pause, /JOURNEY SAVED/);
  assert.match(pause, /LAST CHECKPOINT · CHAPTER/);
  assert.match(pause, /action\('RETURN TO TITLE', showConfirm/);
  assert.match(pause, /Progress since your last save point will be lost\./);
  assert.match(pause, /event\.key !== 'Escape'/);
  assert.match(pause, /pausedPhaserScenes = game\.scene\.getScenes\(true\)/);
  assert.match(pause, /pausedPhaserScenes\.forEach/);
  assert.doesNotMatch(pause, /else scene\.scene\.resume\(\)/);
});

test('the dev-only 1111 title code opens every chapter’s named test nodes', () => {
  const titleMenu = source('src/shell/titleMenu.js');
  const title = source('src/shell/devRoutes.js');
  const devMode = source('src/devMode.js');
  const viteConfig = source('vite.config.js');
  assert.match(titleMenu, /hiddenChapterSequence === '1111'/);
  assert.match(titleMenu, /SELECT TEST NODE/);
  for (const group of [
    'CHAPTER 1 · NIGHT SERVICE',
    'CHAPTER 2 · BORROWED LIGHT',
    'CHAPTER 3 · ECHO CITY',
    'CHAPTER 4 · THE PAINTED COUNTRY',
    'CHAPTER 5 · MUSEUM OF ONE ANSWER',
    'CHAPTER 6 · ALL WORLDS AT ONCE',
  ]) {
    assert.match(title, new RegExp(group));
  }
  for (const act of [1, 2, 3]) assert.match(title, new RegExp(`night-service\\.html\\?act=${act}`));
  assert.doesNotMatch(title, /\?qa=phase|route: '\/\?(chapter|qa|world)=/);
  assert.match(title, /chapter-2-midpoint/);
  assert.match(title, /painted-country\.html\?qa=drawing/);
  assert.match(title, /museum-3d\.html\?beat=corridor/);
  assert.match(title, /museum-3d\.html\?beat=collapse/);
  for (const movement of [1, 2, 3, 4]) assert.match(title, new RegExp(`CONDUCTOR ${['I', 'II', 'III', 'IV'][movement - 1]}[\\s\\S]*final-boss\\.html\\?qa=conductor-${movement}`));
  assert.match(title, /THE LAST CARRIAGE'[\s\S]*hidden-final-boss\.html\?easter-egg=1/);
  // The router and its key listener exist in dev and playtest builds only; a
  // release build (PLAYTEST_MODE false) has neither, and the session flag it
  // sets unlocks dev routes only while PLAYTEST_MODE is on.
  assert.match(titleMenu, /const hiddenChapters = DEV_MODE \? DEV_ROUTES : PLAYTEST_MODE \? routerEntries\(\) : \[\]/);
  assert.match(titleMenu, /if \(\(DEV_MODE \|\| PLAYTEST_MODE\) && root\.isConnected && !dialog\.open && !event\.repeat && event\.key === '1'\)/);
  assert.match(devMode, /export function devRoutesEnabled\(\) \{\n  return DEV_MODE \|\| \(PLAYTEST_MODE && hiddenRouterActive\(\)\);\n\}/);
  assert.match(viteConfig, /__PLAYTEST_MODE__: JSON\.stringify\(process\.env\.NIGHTFALL_RELEASE !== '1'\)/);
});

test('a stale hidden-router session flag cannot open dev routes in a release build', async () => {
  const previous = globalThis.sessionStorage;
  const values = new Map([['nightfall.hidden-router.v1', '1']]);
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  try {
    const devMode = await import('../src/devMode.js');
    assert.equal(devMode.DEV_MODE, false);
    assert.equal(devMode.hiddenRouterActive(), true);
    assert.equal(devMode.devRoutesEnabled(), false);
    assert.equal(devMode.devParam('qa', '?qa=1'), null);
    assert.equal(devMode.hasDevRoute('?beat=collapse&qa=1&chapter=3'), false);
  } finally {
    globalThis.sessionStorage = previous;
  }
});

test('production chapter pages get no TITLE button or T hotkey', () => {
  const control = source('src/devMenuReturn.js');
  assert.match(control, /if \(checkpoint\) createSaveStore\(\)\.markCheckpoint\(checkpoint\);\n    return;\n  \}/);
  assert.doesNotMatch(control, /'TITLE'/);
  assert.doesNotMatch(control, /returnToTitle/);
});
