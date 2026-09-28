import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTER4_IGNITION_SIGN,
  EXPANSION_PHASE,
  HOME_PLATE_WASHES,
  PIGMENTS,
  TRAIN_BUILD_EXAMPLE_ORDER,
  TRAIN_BUILD_RULES,
  createChapter4Expansion,
} from '../../src/chapters/paintedCountry/chapter4ExpansionModel.js';
import { DOOR } from '../../src/chapters/paintedCountry/carLayout.js';

// Chapter 4 · Part III, the yard (release 1.0): borrow six colours, paint the
// train bottom-up, then a simple hold boards it. The second quiz is cut.

function borrowAll(chapter) {
  PIGMENTS.forEach(({ id }) => chapter.collect(id));
  assert.equal(chapter.snapshot().phase, EXPANSION_PHASE.BUILD);
}

test('the yard starts with nothing borrowed', () => {
  const chapter = createChapter4Expansion();
  assert.equal(PIGMENTS.length, 6);
  assert.equal(chapter.snapshot().phase, EXPANSION_PHASE.COLLECT);
  assert.equal(chapter.snapshot().collectedCount, 0);
});

test('a part needs its colour borrowed first, and says where from', () => {
  const chapter = createChapter4Expansion();
  assert.equal(chapter.placePart('green'), false);
  assert.equal(chapter.snapshot().lastFailure.reason, 'not-borrowed');
  chapter.collect('green');
  assert.equal(chapter.placePart('green'), true, 'a borrowed colour can be painted straight away');
});

test('the train is painted wheels first and obeys support', () => {
  const chapter = createChapter4Expansion();
  borrowAll(chapter);
  assert.deepEqual(TRAIN_BUILD_RULES.green.requires, []);
  assert.equal(chapter.placePart('red'), false);
  assert.deepEqual(chapter.snapshot().lastFailure, { reason: 'unsupported', partId: 'red', pigmentId: 'red', missing: ['green'] });
  assert.equal(chapter.placePart('green'), true);
  assert.equal(chapter.placePart('red'), true);
  chapter.placePart('blue');
  assert.equal(chapter.placePart('violet'), false);
  assert.deepEqual(chapter.snapshot().lastFailure.missing, ['orange']);
});

test('an explicit wrong colour is still refused (kept for QA)', () => {
  const chapter = createChapter4Expansion();
  borrowAll(chapter);
  assert.equal(chapter.placePart('green', 'red'), false);
  assert.equal(chapter.snapshot().lastFailure.reason, 'wrong-color');
});

test('boarding is a simple hold with no second quiz', () => {
  const chapter = createChapter4Expansion();
  borrowAll(chapter);
  assert.equal(chapter.boardTrain(), false, 'not before the train is whole');
  TRAIN_BUILD_EXAMPLE_ORDER.forEach((id) => assert.equal(chapter.placePart(id), true));
  assert.equal(chapter.snapshot().trainBuilt, true);
  assert.equal(chapter.boardTrain(), true);
  assert.equal(chapter.snapshot().phase, EXPANSION_PHASE.BOARDED);
  assert.equal(chapter.snapshot().complete, true);
  assert.equal(chapter.chooseIgnition, undefined, 'the ignition quiz is gone');
  assert.equal(chapter.boardTrain(), false);
});

test('the cab carries the Part I answer rather than asking it again', () => {
  assert.equal(CHAPTER4_IGNITION_SIGN, DOOR.correct);
  assert.equal(CHAPTER4_IGNITION_SIGN, 'hawthorn');
});

test('the HOME plate is optional and gives up its grey in two washes', () => {
  const chapter = createChapter4Expansion();
  assert.equal(HOME_PLATE_WASHES, 2);
  assert.equal(chapter.washHomePlate(), true);
  assert.equal(chapter.snapshot().homePlate.revealed, false);
  chapter.washHomePlate();
  assert.equal(chapter.snapshot().homePlate.revealed, true);
  assert.deepEqual(chapter.drainEvents().map((e) => e.type), ['home-plate-thinned', 'home-plate-revealed']);
  assert.equal(chapter.washHomePlate(), false);
  // and the train can be finished without touching it
  const other = createChapter4Expansion();
  borrowAll(other);
  TRAIN_BUILD_EXAMPLE_ORDER.forEach((id) => other.placePart(id));
  assert.equal(other.boardTrain(), true);
});

test('borrowing and painting are idempotent', () => {
  const chapter = createChapter4Expansion();
  assert.equal(chapter.collect('red'), true);
  assert.equal(chapter.collect('red'), false);
  PIGMENTS.slice(1).forEach(({ id }) => chapter.collect(id));
  TRAIN_BUILD_EXAMPLE_ORDER.forEach((id) => chapter.placePart(id));
  assert.equal(chapter.placePart('green'), false);
});
