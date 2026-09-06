import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTER4_IGNITION_SIGN,
  EXPANSION_PHASE,
  PIGMENTS,
  TRAIN_BUILD_EXAMPLE_ORDER,
  TRAIN_BUILD_RULES,
  createChapter4Expansion,
} from '../../src/chapters/paintedCountry/chapter4ExpansionModel.js';

function reachBuild(chapter) {
  PIGMENTS.forEach(({ id }) => chapter.collect(id));
  assert.equal(chapter.snapshot().phase, EXPANSION_PHASE.BUILD);
}

test('all six finite pigments are collected before train assembly', () => {
  const chapter = createChapter4Expansion();
  assert.equal(PIGMENTS.length, 6);
  PIGMENTS.slice(0, 5).forEach(({ id }) => chapter.collect(id));
  assert.equal(chapter.placePart('green', 'green'), false);
  chapter.collect(PIGMENTS[5].id);
  assert.equal(chapter.snapshot().phase, EXPANSION_PHASE.BUILD);
});

test('the train yard starts before the six pickups with an empty pigment ring', () => {
  const chapter = createChapter4Expansion();
  assert.equal(chapter.snapshot().phase, EXPANSION_PHASE.COLLECT);
  assert.equal(chapter.snapshot().collectedCount, 0);
  assert.equal(chapter.snapshot().pigments.every(({ collected }) => !collected), true);
});

test('the train must start at the wheels and obey support dependencies', () => {
  const chapter = createChapter4Expansion();
  reachBuild(chapter);
  assert.deepEqual(TRAIN_BUILD_RULES.green.requires, []);
  assert.equal(chapter.placePart('red', 'red'), false);
  assert.deepEqual(chapter.snapshot().lastFailure, {
    reason: 'unsupported', partId: 'red', pigmentId: 'red', missing: ['green'],
  });
  assert.equal(chapter.placePart('green', 'green'), true);
  assert.equal(chapter.placePart('red', 'red'), true);
});

test('a selected color must match the completed-train reference', () => {
  const chapter = createChapter4Expansion();
  reachBuild(chapter);
  assert.equal(chapter.placePart('green', 'red'), false);
  assert.deepEqual(chapter.snapshot().lastFailure, {
    reason: 'wrong-color', partId: 'green', pigmentId: 'red', missing: [],
  });
  assert.equal(chapter.snapshot().builtCount, 0);
  assert.equal(chapter.placePart('green', 'green'), true);
});

test('a physically valid bottom-up order completes one connected train', () => {
  const chapter = createChapter4Expansion();
  reachBuild(chapter);
  TRAIN_BUILD_EXAMPLE_ORDER.forEach((id) => assert.equal(chapter.placePart(id, id), true));
  assert.equal(chapter.snapshot().trainBuilt, true);
  assert.equal(chapter.snapshot().builtCount, 6);
});

test('cab and roof cannot float above missing body pieces', () => {
  const chapter = createChapter4Expansion();
  reachBuild(chapter);
  chapter.placePart('green', 'green');
  chapter.placePart('blue', 'blue');
  assert.equal(chapter.placePart('orange', 'orange'), false);
  assert.deepEqual(chapter.snapshot().lastFailure.missing, ['red']);
  assert.equal(chapter.placePart('violet', 'violet'), false);
  assert.deepEqual(chapter.snapshot().lastFailure.missing, ['orange']);
});

test('boarding ends with the pursuing crowd and has no repair phase', () => {
  const chapter = createChapter4Expansion();
  reachBuild(chapter);
  TRAIN_BUILD_EXAMPLE_ORDER.forEach((id) => chapter.placePart(id, id));
  assert.equal(chapter.boardTrain(), true);
  assert.equal(chapter.snapshot().phase, EXPANSION_PHASE.BUILD, 'the archive ignition still waits');
  assert.deepEqual(chapter.chooseIgnition('eye'), { ok: false, reason: 'wrong-sign' });
  assert.equal(chapter.snapshot().ignition.wrongTries, 1);
  assert.deepEqual(chapter.chooseIgnition(CHAPTER4_IGNITION_SIGN), { ok: true, reason: 'started' });
  assert.equal(chapter.snapshot().phase, EXPANSION_PHASE.CHASE);
  assert.equal(chapter.snapshot().complete, false);
  assert.equal(chapter.revealConsequence(), true);
  assert.equal(chapter.snapshot().complete, true);
  assert.equal(chapter.snapshot().consequenceRevealed, true);
  assert.equal(chapter.beginReturn, undefined);
  assert.equal(chapter.repair, undefined);
});

test('collection, placement and consequence reveal are idempotent', () => {
  const chapter = createChapter4Expansion();
  assert.equal(chapter.collect('red'), true);
  assert.equal(chapter.collect('red'), false);
  PIGMENTS.slice(1).forEach(({ id }) => chapter.collect(id));
  TRAIN_BUILD_EXAMPLE_ORDER.forEach((id) => chapter.placePart(id, id));
  assert.equal(chapter.placePart('green', 'green'), false);
  chapter.boardTrain();
  chapter.chooseIgnition(CHAPTER4_IGNITION_SIGN);
  assert.equal(chapter.revealConsequence(), true);
  assert.equal(chapter.revealConsequence(), false);
});
