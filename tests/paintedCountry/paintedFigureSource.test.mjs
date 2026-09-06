import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sceneUrl = new URL('../../src/chapters/paintedCountry/PaintedCountryScene.js', import.meta.url);
const sceneSource = await readFile(sceneUrl, 'utf8');
const studioSource = await readFile(
  new URL('../../src/chapters/paintedCountry/DrawingStudioScene.js', import.meta.url),
  'utf8',
);
const trainSource = await readFile(
  new URL('../../src/chapters/paintedCountry/PigmentTrainScene.js', import.meta.url),
  'utf8',
);
const playerFigureSource = await readFile(
  new URL('../../src/chapters/paintedCountry/paintedPlayerFigure.js', import.meta.url),
  'utf8',
);

test('the teammate gallery keeps its original code-drawn Butch', () => {
  assert.match(sceneSource, /drawFigure\(\)/);
  assert.match(sceneSource, /drawPaintedPlayer\(this\.figure, this\.walker, this\.input\.activePointer\)/);
  assert.match(playerFigureSource, /figure\.fillRect\(x - 8, feetY - 46, 16, 28\)/);
  assert.doesNotMatch(sceneSource, /latestButch|frame-[0-3]\.png/);
});

test('the teammate gallery figure aims its brush at the active pointer', () => {
  assert.match(playerFigureSource, /Math\.atan2\(pointer\.worldY - shoulderY, pointer\.worldX - x\)/);
  assert.match(playerFigureSource, /figure\.lineTo\(tipX, tipY\)/);
  assert.match(playerFigureSource, /figure\.fillCircle\(tipX, tipY, 4\.6\)/);
});

test('every Chapter 4 room reuses the same brush-wielding protagonist', () => {
  assert.match(studioSource, /from '\.\/paintedPlayerFigure\.js'/);
  assert.match(studioSource, /drawPaintedPlayer\(this\.figure, this\.walker, pointer\)/);
  assert.doesNotMatch(studioSource, /paperButch\.js/);
  assert.match(trainSource, /from '\.\/paintedPlayerFigure\.js'/);
  assert.match(trainSource, /drawPaintedPlayer\(this\.figure, this\.walker, this\.input\.activePointer\)/);
  assert.doesNotMatch(trainSource, /paperButch\.js/);
});

test('the gallery uses three distinct hand-drawn marks with one repeated moon seal', () => {
  assert.match(sceneSource, /buildArchiveSymbolTextures\(\)/);
  assert.match(sceneSource, /picture\.primarySign === 'eye'/);
  assert.match(sceneSource, /picture\.primarySign === 'heir'/);
  assert.match(sceneSource, /LAST CITY — the rapture mark/);
  assert.match(sceneSource, /const sealX = w - 150/);
  assert.match(sceneSource, /fillCircle\(sealX \+ 19, sealY - 12, 45\)/);
  assert.doesNotMatch(sceneSource, /PAINTINGS\.forEach\(\(picture\) => this\.load\.image/);
});

test('paper placement applies its first cell immediately on pointer down', () => {
  assert.match(sceneSource, /this\.input\.on\('pointerdown', this\.handlePointerDown, this\)/);
  assert.match(sceneSource, /handlePointerDown\(pointer\)/);
  assert.match(sceneSource, /this\.applyBrush\(cx, cy, right\)/);
  assert.match(sceneSource, /this\.lastBrushCell = \{ cx, cy \}/);
});

test('the restored chapter route is gallery, small-grid canvas, then fresh pigment yard', () => {
  assert.match(sceneSource, /this\.scene\.start\('DrawingStudio'\)/);
  assert.doesNotMatch(sceneSource, /drawPigmentHalo/,
    'the gallery must not display the pigment ring');
  assert.match(studioSource, /const CANVAS_CELL = 18/);
  assert.match(studioSource, /this\.studio\.allSourcesExtracted\(\)/,
    'the studio stone must emerge behind the cabinet as soon as every miniature object is collected');
  assert.match(studioSource, /this\.scene\.start\('PigmentTrain'\)/);
  assert.match(trainSource, /const TRAIN_ENTRY_X = 116/);
  assert.match(trainSource, /const unlockedPigments = qaUnlocked/,
    'normal train entry must ignore carried pigment state');
});

test('Chapter 4 keeps no persistent HUD and teaches drawing and erasing only where needed', () => {
  assert.match(sceneSource, /No persistent HUD in Chapter 4/);
  assert.match(sceneSource, /LEFT MOUSE · DRAW PAPER ACROSS THE GAP/);
  assert.match(sceneSource, /RIGHT MOUSE · ERASE THE PAPER BLOCK/);
  assert.match(sceneSource, /if \(this\.activeTutorial === 'bridge'\) this\.dismissTutorial\('bridge'\)/);
  assert.match(sceneSource, /if \(this\.activeTutorial === 'wash'\) this\.dismissTutorial\('wash'\)/);
  assert.doesNotMatch(sceneSource, /HOLD LEFT  draw paper \(∞\)/);
  assert.match(sceneSource, /chapter4-drawing-music', \{ loop: true, volume: 0\.42 \}/);
  assert.match(studioSource, /chapter4-drawing-music', \{ loop: true, volume: 0\.38 \}/);
  assert.match(trainSource, /chapter4-consequence-music', \{ loop: true, volume: 0\.34 \}/);
});
