import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore } from '../../src/shell/saveSystem.js';
import { createPaintedCar, idx } from '../../src/chapters/paintedCountry/paintedCarModel.js';
import { createDrawingStudio, STILL_LIFE_REGIONS, STUDIO_SOURCES } from '../../src/chapters/paintedCountry/drawingStudioModel.js';
import { createChapter4Expansion, PIGMENTS } from '../../src/chapters/paintedCountry/chapter4ExpansionModel.js';
import { FLOOR_ROW, PAINTINGS } from '../../src/chapters/paintedCountry/carLayout.js';
import {
  CH4_CHECKPOINT,
  applyGalleryResume,
  applyStudioResume,
  applyYardResume,
  chapter4ResumeOnLoad,
  galleryResumeData,
  recordChapter4Resume,
  sanitizeResume,
  yardResumeData,
} from '../../src/chapters/paintedCountry/chapter4Resume.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
}

function chapter4Save() {
  const store = createSaveStore(memoryStorage(), { scratch: false });
  store.startNew(0);
  store.markCheckpoint(CH4_CHECKPOINT);
  return store;
}

test('the gallery comes back with its plates, paint, washed grey and Butch where he stood', () => {
  const car = createPaintedCar();
  // bridge the first hole, wash the Bay A block, develop the first plate
  for (let cx = 20; cx < 30; cx += 1) car.paint(cx, FLOOR_ROW);
  for (let cy = 17; cy < 22; cy += 1) for (let cx = 40; cx < 43; cx += 1) car.wash(cx, cy);
  car.developPlate(PAINTINGS[0].id);
  car.wash(63, 11); // one coat off the official record
  const store = chapter4Save();
  recordChapter4Resume(store, galleryResumeData(car, { x: 1100.4, y: 380 }));

  const loaded = chapter4ResumeOnLoad({ store });
  assert.equal(loaded.room, 'gallery');
  assert.deepEqual(loaded.at, { x: 1100, y: 380 });
  const fresh = createPaintedCar();
  assert.equal(applyGalleryResume(fresh, loaded), true);
  assert.equal(fresh.isPainted(25, FLOOR_ROW), true);
  assert.equal(fresh.isBlock(41, 19), false);
  assert.equal(fresh.isBlock(103, 10), true, 'the long wall is still there');
  assert.equal(fresh.plateState(PAINTINGS[0].id).developed, true);
  assert.equal(fresh.plateState(PAINTINGS[1].id).developed, false);
  assert.equal(fresh.varnishAt(63, 11), 1);
  assert.equal(fresh.varnishAt(64, 11), 2);
  assert.deepEqual(fresh.drainEvents(), []);
});

test('the studio comes back with its colours, the yard with its borrowed colours and painted parts', () => {
  const studio = createDrawingStudio();
  const region = STILL_LIFE_REGIONS[0];
  studio.take(STUDIO_SOURCES.find((s) => s.pigment === region.wants).id);
  studio.apply(region.id);
  const store = chapter4Save();
  const snap = studio.snapshot();
  recordChapter4Resume(store, { room: 'studio', fills: snap.fills, brush: snap.brush });
  const again = createDrawingStudio();
  applyStudioResume(again, chapter4ResumeOnLoad({ store }));
  assert.equal(again.snapshot().fills[region.id], region.wants);
  assert.equal(again.snapshot().brush, region.wants);

  const yard = createChapter4Expansion();
  ['red', 'orange', 'yellow', 'green'].forEach((id) => yard.collect(id));
  yard.placePart('green');
  yard.placePart('red');
  yard.washHomePlate();
  recordChapter4Resume(store, yardResumeData(yard, 1234.6));
  const back = createChapter4Expansion();
  const data = chapter4ResumeOnLoad({ store });
  assert.equal(data.x, 1235);
  applyYardResume(back, data);
  const s = back.snapshot();
  assert.equal(s.collectedCount, 4);
  assert.deepEqual(s.pigments.filter((p) => p.built).map((p) => p.id).sort(), ['green', 'red']);
  assert.equal(s.homePlate.washes, 1);
  assert.equal(s.phase, 'collect-six-colors');
});

test('a whole yard resumes into the building phase', () => {
  const yard = createChapter4Expansion();
  PIGMENTS.forEach(({ id }) => yard.collect(id));
  const back = createChapter4Expansion();
  applyYardResume(back, yardResumeData(yard));
  assert.equal(back.snapshot().phase, 'build-the-train');
});

test('a dev route, another checkpoint or junk data never resumes', () => {
  const store = chapter4Save();
  recordChapter4Resume(store, { room: 'line' });
  assert.deepEqual(chapter4ResumeOnLoad({ store }), { room: 'line' });
  assert.equal(chapter4ResumeOnLoad({ store, devRoute: 'bay-b' }), null);
  store.markCheckpoint('chapter-5-start');
  assert.equal(chapter4ResumeOnLoad({ store }), null, 'moving on drops it');
  assert.equal(sanitizeResume({ room: 'attic' }), null);
  assert.equal(sanitizeResume(null), null);
  const clean = sanitizeResume({ room: 'gallery', car: { painted: [-4, 'x', idx(25, FLOOR_ROW), 10 ** 9], plates: ['nope', 'city'] } });
  assert.deepEqual(clean.car.painted, [idx(25, FLOOR_ROW)]);
  assert.deepEqual(clean.car.plates, ['city']);
});

test('a resume point is not written while the save is on another checkpoint', () => {
  const store = createSaveStore(memoryStorage(), { scratch: false });
  store.startNew(0);
  assert.equal(recordChapter4Resume(store, { room: 'studio', fills: {} }), null);
  assert.equal(recordChapter4Resume(null, { room: 'studio' }), null);
});
