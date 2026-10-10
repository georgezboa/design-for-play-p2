import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STILL_LIFE_REGIONS,
  STUDIO_PIGMENTS,
  STUDIO_SOURCES,
  createDrawingStudio,
} from '../../src/chapters/paintedCountry/drawingStudioModel.js';

// Chapter 4 · Part II, the still life (release 1.0): six fills. Round 11
// (George could not tell which colour each thing wants): every place names
// its colour (Rosa's note), the shelf goes by the same plain names, and a
// wrong colour is refused with the colour she noted instead of going on to
// be washed off. There is no free canvas and no stone here any more.

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
  studio.take('blue-jug');
  assert.equal(studio.snapshot().brush, 'blue', 'the jug never runs dry');
  assert.equal(studio.snapshot().fills.sky, 'blue');
});

test('every place says which colour it wants, in words the shelf also uses', () => {
  const plain = Object.fromEntries(STUDIO_PIGMENTS.map((p) => [p.id, p.plain]));
  STILL_LIFE_REGIONS.forEach((region) => {
    assert.ok(region.note, `${region.id} has Rosa's colour note`);
    assert.equal(region.note.toUpperCase(), plain[region.wants], `${region.id}: her word is the colour's plain name`);
    const studio = createDrawingStudio();
    const source = studio.sourceFor(region.id);
    assert.equal(source.pigment, region.wants);
    assert.ok(source.object.startsWith(plain[region.wants]), `${source.object} is named by its colour`);
  });
  assert.deepEqual(STUDIO_PIGMENTS.map((p) => p.plain), ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'GREY']);
});

test('a dry brush is refused, and so is a colour she did not note: the room says which one she did', () => {
  const studio = createDrawingStudio();
  assert.deepEqual(studio.apply('apple'), { ok: false, reason: 'dry-brush' });
  studio.take('blue-jug');
  studio.drainEvents();
  assert.deepEqual(studio.apply('apple'), { ok: false, reason: 'wrong-colour', wants: 'red' });
  assert.deepEqual(studio.drainEvents(), [{ type: 'apply-refused', region: 'apple', reason: 'wrong-colour', pigment: 'blue', wants: 'red' }]);
  assert.equal(studio.snapshot().fills.apple, undefined, 'nothing to wash off');
  studio.take('archive-tin');
  assert.equal(studio.apply('sky').reason, 'wrong-colour', 'the archive grey is never right');
  studio.take('red-cup');
  assert.deepEqual(studio.apply('apple'), { ok: true, right: true });
  assert.deepEqual(studio.apply('apple'), { ok: false, reason: 'already-painted' });
});

test('the door opens only when the drawing is as she remembered it', () => {
  const studio = createDrawingStudio();
  STILL_LIFE_REGIONS.slice(0, -1).forEach((region) => {
    studio.take(sourceFor(region.wants));
    studio.apply(region.id);
  });
  assert.equal(studio.isComplete(), false);
  const last = STILL_LIFE_REGIONS[STILL_LIFE_REGIONS.length - 1];
  studio.take(sourceFor(last.wants));
  studio.apply(last.id);
  assert.equal(studio.isComplete(), true);
  assert.ok(studio.drainEvents().some((e) => e.type === 'still-life-complete'));
});

test('no dead ends: whatever is tried in whatever order, the right colours still finish it', () => {
  for (const pigment of STUDIO_PIGMENTS) {
    const studio = createDrawingStudio();
    studio.take(sourceFor(pigment.id));
    STILL_LIFE_REGIONS.forEach((r) => studio.apply(r.id));
    assert.deepEqual(studio.snapshot().wrong, [], 'no wrong colour ever goes on');
    paintRight(studio);
    assert.equal(studio.isComplete(), true, pigment.id);
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
