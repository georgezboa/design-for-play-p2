import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const chapter1 = read('src/prologueNarrativeProps.js');
const chapter2 = read('src/cars/cyberpunkParkour/CyberpunkParkourScene.js');
const chapter3 = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const chapter4 = read('src/chapters/paintedCountry/DrawingStudioScene.js');
const museum = read('src/chapters/museum3d/Museum3DApp.js');
const lobby = read('src/chapters/museum3d/scenes/ServiceLobby.js');
const hiddenBoss = read('src/chapters/hiddenFinalBoss/blackKnifeBattle.js');
const finalBossRoute = read('src/shell/finalBossRoute.js');
const flow = read('src/shell/gameFlow.js');

test('every stone is an authored world pickup rather than a completion offer', () => {
  assert.match(chapter1, /completedScriptId === 'phase-iv-envelope'/);
  assert.match(chapter1, /envelopeReadComplete/);
  assert.match(chapter1, /collectMagicStone\('chapter-1'\)/);
  assert.match(chapter2, /GRID_STONE = Object\.freeze\(\{ x: 6370, y: 445 \}\)/);
  assert.match(chapter2, /collectMagicStone\('chapter-2'\)/);
  assert.match(chapter3, /id: 'campfire-seline'/);
  assert.match(chapter3, /openCampfireSelineDialogue\(\)/);
  assert.match(chapter3, /CAMPFIRE_SELINE_STONE_DIALOGUE/);
  assert.match(chapter3, /collectMagicStone\('chapter-3'\)/);
  assert.match(chapter3, /event\.code === 'KeyE' \|\| event\.key === 'Enter'/);
  assert.doesNotMatch(chapter3, /magic-stone-echo-city/);
  assert.match(chapter4, /PIGMENT_STONE = Object\.freeze\(\{ x: 790, y: 426 \}\)/);
  assert.match(chapter4, /collectMagicStone\('chapter-4'\)/);
  [chapter1, chapter2, chapter3, chapter4].forEach((source) => assert.doesNotMatch(source, /offerMagicStone/));
  assert.match(lobby, /offerMagicStone\('black-knife'\)/);
});

test('five stones, including the Museum Black Knife stone, select Mathias boss while an incomplete set retains the Conductor boss', () => {
  assert.match(museum, /resolveFinalBossDestination\(\)/);
  assert.match(finalBossRoute, /stones\.allCollected/);
  assert.match(finalBossRoute, /route: '\/hidden-final-boss\.html\?from=chapter5'/);
  assert.match(finalBossRoute, /route: '\/final-boss\.html\?from=chapter5'/);
  assert.match(finalBossRoute, /cinematicPath: '\/cinematics\/5-6-black-knife\.mp4'/);
  assert.match(finalBossRoute, /cinematicPath: '\/cinematics\/5-6-conductor\.mp4'/);
  assert.match(hiddenBoss, /PHASES = Object\.freeze\(\['THE EDGE', 'CROSS CUT', 'TEETH', 'FINAL VERDICT'\]\)/);
  assert.match(hiddenBoss, /this\.elapsed >= 60/);
  assert.match(hiddenBoss, /window\.location\.assign\('\/true-ending\.html'\)/);
  assert.match(hiddenBoss, /window\.location\.replace\('\/final-boss\.html\?from=chapter5'\)/);
  assert.match(hiddenBoss, /easterEggMode/);
  assert.match(hiddenBoss, /All five stones resonate/);
  assert.match(hiddenBoss, /'five-stone-route'/);
  assert.doesNotMatch(hiddenBoss, /All four stones resonate|'four-stone-route'/);
});

test('Chapter 3 and every other chapter transition wait for the complete preload job', () => {
  assert.match(chapter2, /requirePreloadReady: true/);
  assert.match(flow, /const waitForPreload = Boolean\(preloadChapterId\) \|\| requirePreloadReady/);
  assert.match(flow, /if \(waitForPreload\)/);
  assert.match(flow, /await preloadPromise/);
  assert.match(flow, /PREPARING EVERY OBJECT · PLEASE WAIT/);
});
