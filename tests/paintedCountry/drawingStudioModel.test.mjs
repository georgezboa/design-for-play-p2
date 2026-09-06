import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUIRED_CELLS,
  STUDIO_PIGMENTS,
  STUDIO_SOURCES,
  createDrawingStudio,
} from '../../src/chapters/paintedCountry/drawingStudioModel.js';

test('the cabinet has eighteen miniature colored objects and one finite object for every brush mark', () => {
  assert.equal(STUDIO_SOURCES.length, 18);
  assert.equal(STUDIO_SOURCES.length, REQUIRED_CELLS.length);
  assert.equal(STUDIO_PIGMENTS.length, 6);
  assert.equal(STUDIO_SOURCES.every((source) => STUDIO_PIGMENTS.some(({ id }) => id === source.pigment)), true);
  assert.equal(new Set(REQUIRED_CELLS.map(({ cell }) => cell)).size, REQUIRED_CELLS.length);
  assert.equal(new Set(STUDIO_SOURCES.map(({ id }) => id)).size, STUDIO_SOURCES.length);
});

test('the player accumulates several source colors in a carried palette', () => {
  const studio = createDrawingStudio();
  assert.equal(studio.extract('red-cup'), true);
  assert.equal(studio.extract('red-apple'), true);
  assert.deepEqual(studio.snapshot().palette, ['red-cup', 'red-apple']);
  assert.equal(studio.snapshot().sources.find(({ id }) => id === 'red-cup').drained, true);
});

test('a required brush mark accepts the matching color, not one unique prop', () => {
  const studio = createDrawingStudio();
  studio.extract('red-cup');
  assert.equal(studio.placeRequired('6,1'), false);
  assert.deepEqual(studio.snapshot().palette, ['red-cup']);
  assert.equal(studio.placeRequired('2,1'), true);
  assert.deepEqual(studio.snapshot().palette, []);
});

test('using a color on the free canvas blocks the required copy', () => {
  const studio = createDrawingStudio();
  studio.extract(STUDIO_SOURCES[0].id);
  studio.placeFree('0,0');
  STUDIO_SOURCES.slice(1).forEach((item) => {
    studio.extract(item.id);
    studio.placeRequired(item.targetCell);
  });
  assert.equal(studio.isComplete(), false);
  assert.equal(studio.snapshot().free['0,0'], STUDIO_SOURCES[0].id);
});

test('lifting a free square returns the exact pigment and restores solvability', () => {
  const studio = createDrawingStudio();
  studio.extract(STUDIO_SOURCES[0].id);
  studio.placeFree('3,3');
  assert.equal(studio.liftFree('3,3'), true);
  assert.equal(studio.snapshot().held, STUDIO_SOURCES[0].id);
  assert.equal(studio.placeRequired(STUDIO_SOURCES[0].targetCell), true);
});

test('completing the recognizable still life drains every miniature object and unlocks the shelf reward', () => {
  const studio = createDrawingStudio();
  STUDIO_SOURCES.forEach((item) => {
    studio.extract(item.id);
    studio.placeRequired(item.targetCell);
  });
  assert.equal(studio.isComplete(), true);
  assert.equal(studio.snapshot().sources.every(({ drained }) => drained), true);
  assert.equal(studio.allSourcesDrained(), true);
  assert.equal(studio.snapshot().held, null);
  assert.deepEqual(studio.snapshot().free, {});
});

test('lifting every cabinet object reveals its reward before the carried palette is spent', () => {
  const studio = createDrawingStudio();
  STUDIO_SOURCES.forEach((item) => studio.extract(item.id));
  assert.equal(studio.allSourcesExtracted(), true);
  assert.equal(studio.allSourcesDrained(), false);
  assert.equal(studio.snapshot().allSourcesExtracted, true);
});

test('dismantling the framed vase makes the exit unavailable until restored', () => {
  const studio = createDrawingStudio();
  STUDIO_SOURCES.forEach((item) => {
    studio.extract(item.id);
    studio.placeRequired(item.targetCell);
  });
  assert.equal(studio.liftRequired(STUDIO_SOURCES[0].targetCell), true);
  assert.equal(studio.isComplete(), false);
  assert.equal(studio.placeFree('4,0'), true);
  assert.equal(studio.isComplete(), false);
  studio.liftFree('4,0');
  studio.placeRequired(STUDIO_SOURCES[0].targetCell);
  assert.equal(studio.isComplete(), true);
});

test('color is conserved through every move', () => {
  const studio = createDrawingStudio();
  assert.equal(studio.tokenLocationCount(), STUDIO_SOURCES.length);
  studio.extract(STUDIO_SOURCES[0].id);
  assert.equal(studio.tokenLocationCount(), STUDIO_SOURCES.length);
  studio.placeFree('0,0');
  assert.equal(studio.tokenLocationCount(), STUDIO_SOURCES.length);
  studio.liftFree('0,0');
  studio.placeRequired(STUDIO_SOURCES[0].targetCell);
  assert.equal(studio.tokenLocationCount(), STUDIO_SOURCES.length);
});
