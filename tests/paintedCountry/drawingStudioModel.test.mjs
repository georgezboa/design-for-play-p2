import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STILL_LIFE_REGIONS,
  STUDIO_PIGMENTS,
  STUDIO_SOURCES,
  createDrawingStudio,
} from '../../src/chapters/paintedCountry/drawingStudioModel.js';

// Chapter 4 · Part II, the still life (release 1.0): six fills, each a real
// colour choice. Wrong colours are accepted, look wrong, and wash off. There
// is no free canvas and no stone here any more.

const sourceFor = (pigment) => STUDIO_SOURCES.find((s) => s.pigment === pigment).id;
const paintRight = (studio) => STILL_LIFE_REGIONS.forEach((region) => {
  studio.take(sourceFor(region.wants));
  studio.apply(region.id);
});

test('six places in the drawing, seven colours on the shelf, one of them the archive grey', () => {
  assert.equal(STILL_LIFE_REGIONS.length, 6);
  assert.equal(STUDIO_SOURCES.length, 7);
  assert.equal(STUDIO_PIGMENTS.length, 7);
  assert.ok(STUDIO_PIGMENTS.some((p) => p.id === 'grey'));
  assert.equal(STILL_LIFE_REGIONS.some((r) => r.wants === 'grey'), false, 'the archive grey is never right');
  assert.equal(new Set(STILL_LIFE_REGIONS.map((r) => r.wants)).size, 6, 'every place wants a different colour');
  STILL_LIFE_REGIONS.forEach((r) => assert.ok(STUDIO_SOURCES.some((s) => s.pigment === r.wants), r.id));
});

test('the brush holds the colour last taken; objects are never used up', () => {
  const studio = createDrawingStudio();
  assert.equal(studio.snapshot().brush, null);
  studio.take('red-cup');
  studio.take('blue-jug');
  assert.equal(studio.snapshot().brush, 'blue');
  studio.apply('sky');
  studio.apply('sun');
  assert.equal(studio.snapshot().fills.sun, 'blue', 'the same colour can be used twice');
});

test('a dry brush is refused, a wrong colour is accepted and looks wrong', () => {
  const studio = createDrawingStudio();
  assert.deepEqual(studio.apply('apple'), { ok: false, reason: 'dry-brush' });
  studio.take('blue-jug');
  assert.deepEqual(studio.apply('apple'), { ok: true, right: false });
  assert.deepEqual(studio.snapshot().wrong, ['apple']);
  assert.deepEqual(studio.apply('apple'), { ok: false, reason: 'already-painted' });
});

test('the door opens only when the drawing is as she remembered it', () => {
  const studio = createDrawingStudio();
  STILL_LIFE_REGIONS.forEach((region, i) => {
    studio.take(sourceFor(i === 0 ? 'grey' : region.wants));
    studio.apply(region.id);
  });
  assert.equal(studio.allFilled(), true);
  assert.equal(studio.isComplete(), false);
  assert.ok(studio.drainEvents().some((e) => e.type === 'still-life-looks-wrong'));
  assert.equal(studio.wash(STILL_LIFE_REGIONS[0].id), true);
  studio.take(sourceFor(STILL_LIFE_REGIONS[0].wants));
  studio.apply(STILL_LIFE_REGIONS[0].id);
  assert.equal(studio.isComplete(), true);
  assert.ok(studio.drainEvents().some((e) => e.type === 'still-life-complete'));
});

test('no dead ends: from any painting, washing and repainting reaches the finished still life', () => {
  // Try every wrong assignment for each region: wash always recovers.
  for (const region of STILL_LIFE_REGIONS) {
    for (const pigment of STUDIO_PIGMENTS) {
      const studio = createDrawingStudio();
      studio.take(sourceFor(pigment.id));
      STILL_LIFE_REGIONS.forEach((r) => studio.apply(r.id));
      STILL_LIFE_REGIONS.forEach((r) => { if (!studio.isRight(r.id)) studio.wash(r.id); });
      paintRight(studio);
      assert.equal(studio.isComplete(), true, `${region.id} / ${pigment.id}`);
    }
  }
});

test('washing a finished region closes the door again', () => {
  const studio = createDrawingStudio();
  paintRight(studio);
  studio.drainEvents();
  studio.wash('fox');
  assert.equal(studio.isComplete(), false);
  assert.deepEqual(studio.drainEvents().map((e) => e.type), ['region-washed', 'still-life-opened-again']);
});
