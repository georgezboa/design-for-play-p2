import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../src/chapters/paintedCountry/${path}`, import.meta.url), 'utf8');
const sceneSource = await read('PaintedCountryScene.js');
const studioSource = await read('DrawingStudioScene.js');
const trainSource = await read('PigmentTrainScene.js');
const lineSource = await read('PaintedLineScene.js');
const playerFigureSource = await read('paintedPlayerFigure.js');
const mainSource = await readFile(new URL('../../src/paintedCountry-main.js', import.meta.url), 'utf8');

test('the teammate gallery keeps its original code-drawn Butch', () => {
  assert.match(sceneSource, /drawFigure\(\)/);
  assert.match(sceneSource, /drawPaintedPlayer\(this\.figure, this\.walker, this\.brush\)/);
  assert.match(playerFigureSource, /figure\.fillRect\(x - 8, feetY - 46, 16, 28\)/);
  assert.doesNotMatch(sceneSource, /latestButch|frame-[0-3]\.png/);
});

test('the figure aims its brush at the brush cursor, whichever hand drives it', () => {
  assert.match(playerFigureSource, /Math\.atan2\(pointer\.worldY - shoulderY, pointer\.worldX - x\)/);
  assert.match(playerFigureSource, /figure\.lineTo\(tipX, tipY\)/);
  assert.match(playerFigureSource, /figure\.fillCircle\(tipX, tipY, 4\.6\)/);
});

test('every Chapter 4 room reuses the same brush-wielding protagonist and the same brush input', () => {
  for (const source of [studioSource, trainSource, lineSource]) {
    assert.match(source, /from '\.\/paintedPlayerFigure\.js'/);
    assert.match(source, /drawPaintedPlayer\(this\.figure, this\.walker, this\.brush/);
    assert.match(source, /new BrushInput\(this/);
    assert.doesNotMatch(source, /paperButch\.js/);
  }
  assert.match(sceneSource, /new BrushInput\(this/);
});

test('the gallery plates are washed clear, not threaded: no Color Link remains', () => {
  for (const source of [sceneSource, studioSource, trainSource, lineSource]) {
    assert.doesNotMatch(source, /COLOR LINK|boardBegin|cordColor|CORD_COLOURS/);
  }
  assert.match(sceneSource, /buildPlateTexture\(this, plate\)/);
  assert.match(sceneSource, /this\.car\.washPlate\(picture\.id/);
});

test('the notes lay the plates side by side as images, with nothing written about the marks', () => {
  assert.match(sceneSource, /openNotes\(\{ pulse = false \} = \{\}\)/);
  assert.match(sceneSource, /YOUR NOTES · THE THREE PLATES/);
  assert.doesNotMatch(sceneSource, /LARGE \$\{|SMALL \$\{|COMPARE THE THREE SMALL SEALS/);
  assert.match(sceneSource, /PAPER\.cyan, 0\.5 \+ 0\.45 \* k/, 'her mark pulses in her thread\'s cyan after two misses');
});

test('part I ends with Mara walking through the door ahead', () => {
  assert.match(sceneSource, /drawMaraSilhouette\(g, \{/);
  assert.match(sceneSource, /this\.scene\.start\('DrawingStudio'\)/);
  assert.doesNotMatch(sceneSource, /playDeath|THE INK TAKES THE CAR/);
});

test('the chapter route is gallery, still life, yard, then the line ahead to the Museum', () => {
  assert.match(studioSource, /this\.scene\.start\('PigmentTrain'\)/);
  assert.match(trainSource, /this\.scene\.start\('PaintedLine'\)/);
  assert.match(lineSource, /CINEMATICS\.chapter4To5/);
  assert.match(lineSource, /preloadChapterId: 'chapter5'/);
  assert.match(trainSource, /const TRAIN_ENTRY_X = 116/);
  assert.match(trainSource, /const unlockedPigments = qaUnlocked/, 'normal train entry must ignore carried pigment state');
  assert.match(mainSource, /PaintedLineScene/);
});

test('Chapter 4 keeps no persistent HUD and teaches paint and wash where they are needed', () => {
  assert.match(sceneSource, /No persistent HUD in Chapter 4/);
  assert.match(sceneSource, /DRAW PAPER ACROSS THE GAP/);
  assert.match(sceneSource, /WASH THE ARCHIVE'S GREY AWAY/);
  assert.match(sceneSource, /if \(this\.activeTutorial === 'bridge'\) this\.dismissTutorial\('bridge'\)/);
  assert.match(sceneSource, /if \(this\.activeTutorial === 'wash'\) this\.dismissTutorial\('wash'\)/);
  assert.match(sceneSource, /chapter4-drawing-music', \{ loop: true, volume: 0\.42 \}/);
  assert.match(studioSource, /chapter4-drawing-music', \{ loop: true, volume: 0\.38 \}/);
  assert.match(trainSource, /chapter4-consequence-music', \{ loop: true, volume: 0\.34 \}/);
});
