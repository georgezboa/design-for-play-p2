import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const chapter1 = read('src/chapters/nightService/acts/act2.js');
const chapter1Main = read('src/nightService-main.js');
const chapter2 = read('src/chapters/borrowedLight/BorrowedLightScene.js');
const chapter2Level = read('src/chapters/borrowedLight/level.js');
const chapter3 = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
// Chapter 4's stone is under the washed HOME plate in the painted-train yard.
const chapter4 = read('src/chapters/paintedCountry/PigmentTrainScene.js');
const museum = read('src/chapters/museum3d/Museum3DApp.js');
const lobby = read('src/chapters/museum3d/scenes/ServiceLobby.js');
// hidden-final-boss.html runs the Black Knife fight in src/chapters/blackKnifeFinal/.
const hiddenBoss = read('src/chapters/blackKnifeFinal/main.js');
const finalBossRoute = read('src/shell/finalBossRoute.js');
const flow = read('src/shell/gameFlow.js');

test('every stone is an authored world pickup rather than a completion offer', () => {
  assert.match(chapter1, /requires: \{ notFlag: 'stone:chapter-1' \}/);
  assert.match(chapter1, /\{ grantStone: 'chapter-1' \}/);
  assert.match(chapter1Main, /onStone\(id\) \{\s*collectMagicStone\(id\);/);
  assert.match(chapter2Level, /GRID_STONE = Object\.freeze\(\{ x: 11690, y: -60 \}\)/);
  assert.match(chapter2, /collectMagicStone\('chapter-2'\)/);
  assert.match(chapter3, /id: 'campfire-seline'/);
  assert.match(chapter3, /openCampfireSelineDialogue\(\)/);
  assert.match(chapter3, /CAMPFIRE_SELINE_STONE_DIALOGUE/);
  assert.match(chapter3, /collectMagicStone\('chapter-3'\)/);
  assert.match(chapter3, /event\.code === 'KeyE' \|\| event\.key === 'Enter'/);
  assert.doesNotMatch(chapter3, /magic-stone-echo-city/);
  assert.match(chapter4, /PIGMENT_STONE = Object\.freeze\(\{ x: HOME_PLATE\.x \+ HOME_PLATE\.w \/ 2/);
  assert.match(chapter4, /washHomePlate\(\)/);
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
  assert.match(hiddenBoss, /const redirectToConductor = !stones\.allCollected && !DEV_MODE && !qaMode && !easterEggMode/);
  assert.match(hiddenBoss, /window\.location\.replace\('\/final-boss\.html\?from=chapter5'\)/);
  assert.match(hiddenBoss, /window\.location\.assign\(`\/true-ending\.html/);
  assert.match(hiddenBoss, /easterEggMode/);
  assert.match(hiddenBoss, /'five-stone-route'/);
  assert.doesNotMatch(hiddenBoss, /'four-stone-route'/);
});

test('Chapter 3 and every other chapter transition wait for the complete preload job', () => {
  assert.match(chapter2, /requirePreloadReady: true/);
  assert.match(flow, /const waitForPreload = Boolean\(preloadChapterId\) \|\| requirePreloadReady/);
  assert.match(flow, /if \(waitForPreload\)/);
  assert.match(flow, /await preloadPromise/);
  assert.match(flow, /PREPARING EVERY OBJECT · PLEASE WAIT/);
});

test('hidden-final-boss.html checks the stones before it loads the fight', () => {
  const entry = read('src/chapters/blackKnifeFinal/entry.js');
  assert.match(read('hidden-final-boss.html'), /<script type="module" src="\/src\/chapters\/blackKnifeFinal\/entry\.js"><\/script>/);
  // No static import of the fight (Phaser, the score): only the gate's own needs.
  assert.deepEqual([...entry.matchAll(/^import .* from '([^']+)';$/gm)].map((match) => match[1]), ['../../shell/magicStones.js', '../../devMode.js']);
  assert.match(entry, /if \(!unlocked && !magicStoneSnapshot\(\)\.allCollected\) \{\n  window\.location\.replace\('\/final-boss\.html\?from=chapter5'\);\n\} else \{\n  import\('\.\/main\.js'\);\n\}/);
});
