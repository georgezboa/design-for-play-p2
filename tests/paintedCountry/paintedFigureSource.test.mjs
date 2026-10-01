import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { BUTCH_FRAMES, butchPose } from '../../src/chapters/paintedCountry/paintedPlayerPose.js';

const read = (path) => readFile(new URL(`../../src/chapters/paintedCountry/${path}`, import.meta.url), 'utf8');
const sceneSource = await read('PaintedCountryScene.js');
const studioSource = await read('DrawingStudioScene.js');
const trainSource = await read('PigmentTrainScene.js');
const lineSource = await read('PaintedLineScene.js');
const playerFigureSource = await read('paintedPlayerFigure.js');
const mainSource = await readFile(new URL('../../src/paintedCountry-main.js', import.meta.url), 'utf8');

test('Butch is the pencil walk cycle, not a code-drawn silhouette (round 3 art uplift)', () => {
  assert.match(sceneSource, /drawFigure\(\)/);
  assert.match(sceneSource, /drawPaintedPlayer\(this\.figure, this\.walker, this\.brush\)/);
  assert.match(playerFigureSource, /assets\/butch-pencil\/butch-pencil-sheet\.png\?url/);
  assert.match(playerFigureSource, /scene\.load\.spritesheet\(BUTCH_SHEET\.key/);
  assert.doesNotMatch(playerFigureSource, /figure\.fillRect\(x - 8, feetY - 46, 16, 28\)/, 'the black rectangle with a ball head is gone');
  for (const source of [sceneSource, studioSource, trainSource, lineSource]) {
    assert.match(source, /preloadPaintedPlayer\(this\)/);
    assert.match(source, /this\.figure = createPaintedPlayer\(this, /);
  }
});

test('the figure aims its brush at the brush cursor, whichever hand drives it', () => {
  assert.match(playerFigureSource, /Math\.atan2\(pointer\.worldY - handY, pointer\.worldX - handX\)/);
  assert.match(playerFigureSource, /g\.fillCircle\(tipX, tipY, 4\.2\)/);
});

test('Butch walks with his stride, jumps and falls in their own poses, and faces where he goes', () => {
  assert.deepEqual(butchPose({ vx: 0, grounded: true }).frame, BUTCH_FRAMES.idle);
  assert.equal(butchPose({ vx: 0, vy: -300, grounded: false }).frame, BUTCH_FRAMES.jump);
  assert.equal(butchPose({ vx: 0, vy: 200, grounded: false }).frame, BUTCH_FRAMES.fall);
  const frames = [0, 13, 26, 39, 52].map((stride) => butchPose({ vx: 200, grounded: true, stride }).frame);
  assert.deepEqual(frames, [0, 1, 2, 3, 0], 'the walk advances with distance, so the feet never skate');
  assert.equal(butchPose({ vx: -200, grounded: true }).facing, -1);
  assert.equal(butchPose({ vx: 0, grounded: true, facing: -1, aimX: 500, x: 100 }).facing, 1, 'standing still he turns to the brush');
  assert.equal(butchPose({ vx: 0, grounded: true, facing: -1, aimX: 110, x: 100 }).facing, -1);
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
