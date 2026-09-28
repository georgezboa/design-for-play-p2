import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTER05_DIRECTIONS,
  DIRECTION_ORDER,
  PLAYABLE_DIRECTION_ORDER,
  directionDefinition,
} from '../../src/chapters/museum3d/directions/directionRegistry.js';
import {
  createDirectionProgressState,
  reduceDirectionProgress,
} from '../../src/chapters/museum3d/state/chapter05DirectionProgress.js';
import { ONE_ANSWER_CHAPTER05_CONTRACT } from '../../src/chapters/museum3d/oneAnswer/chapter05OneAnswerContract.js';

test('the Museum opens two framed sub-worlds: the lobby exhibit and Door 4', () => {
  assert.deepEqual(DIRECTION_ORDER, ['one-answer', 'labyrinth', 'echo-city']);
  assert.deepEqual(PLAYABLE_DIRECTION_ORDER, ['one-answer', 'labyrinth']);
  assert.equal(directionDefinition(CHAPTER05_DIRECTIONS.ECHO_CITY).available, false, 'Echo City is dev-only');
  const exhibit = directionDefinition(CHAPTER05_DIRECTIONS.ONE_ANSWER);
  assert.equal(exhibit.src, '/one-answer.html?embedded=1');
  assert.equal(exhibit.completeMessage, ONE_ANSWER_CHAPTER05_CONTRACT.completeMessage);
  assert.equal(exhibit.exitMessage, ONE_ANSWER_CHAPTER05_CONTRACT.exitMessage);
  assert.equal(exhibit.archiveTitle, 'ACC. 1978-0412 · VELEZ, M. · PENDING');
  assert.equal(directionDefinition(CHAPTER05_DIRECTIONS.LABYRINTH).title, '4');
});

test('both are needed for the gate, in either order', () => {
  for (const order of [['one-answer', 'labyrinth'], ['labyrinth', 'one-answer']]) {
    let state = createDirectionProgressState();
    ({ state } = reduceDirectionProgress(state, { type: 'direction.complete', id: order[0] }));
    assert.equal(state.allComplete, false);
    assert.equal(state.completedCount, 1);
    const result = reduceDirectionProgress(state, { type: 'direction.complete', id: order[1] });
    assert.equal(result.state.allComplete, true);
    assert.ok(result.events.some((event) => event.type === 'directions.allComplete'));
  }
});

test('the sealed Echo City reconstruction can never open or count', () => {
  const state = createDirectionProgressState();
  const opened = reduceDirectionProgress(state, { type: 'direction.open', id: 'echo-city' });
  assert.equal(opened.state.activeDirection, null);
  assert.match(opened.events[0].payload.reason, /sealed/);
  const shortcut = reduceDirectionProgress(state, { type: 'direction.complete', id: 'echo-city' });
  assert.equal(shortcut.state.completed['echo-city'], false);
  for (const gone of ['borrowed-grid', 'painted-country']) {
    assert.match(reduceDirectionProgress(state, { type: 'direction.open', id: gone }).events[0].payload.reason, /unknown/);
  }
});

test('opening one framed sub-world never nests another inside it', () => {
  let state = createDirectionProgressState();
  ({ state } = reduceDirectionProgress(state, { type: 'direction.open', id: 'labyrinth' }));
  const rejected = reduceDirectionProgress(state, { type: 'direction.open', id: 'one-answer' });
  assert.equal(rejected.state.activeDirection, 'labyrinth');
  assert.equal(rejected.events[0].type, 'direction.rejected');
});
