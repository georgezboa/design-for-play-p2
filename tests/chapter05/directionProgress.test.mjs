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

test('Chapter 5 keeps four authored directions but exposes only the Labyrinth in the museum route', () => {
  assert.deepEqual(DIRECTION_ORDER, [
    'labyrinth',
    'borrowed-grid',
    'echo-city',
    'painted-country',
  ]);
  assert.deepEqual(DIRECTION_ORDER.map((id) => directionDefinition(id).title), ['4', '2', '3', '1']);
  assert.deepEqual(PLAYABLE_DIRECTION_ORDER, ['labyrinth']);
  assert.equal(directionDefinition(CHAPTER05_DIRECTIONS.BORROWED_GRID).available, false);
  assert.equal(directionDefinition(CHAPTER05_DIRECTIONS.ECHO_CITY).available, false);
  assert.equal(directionDefinition(CHAPTER05_DIRECTIONS.PAINTED_COUNTRY).available, false);
});

test('Labyrinth completion is the only direction contribution to the final gate', () => {
  let state = createDirectionProgressState();
  ({ state } = reduceDirectionProgress(state, { type: 'direction.complete', id: 'labyrinth' }));
  assert.equal(state.completedCount, 1);
  assert.equal(state.allComplete, true);
  assert.equal(state.carriedArtifact, null);
  assert.ok(Object.values(state.artifacts).every((artifact) => artifact.displayed));
  assert.ok(Object.values(state.artifacts).every((artifact) => !artifact.taken));
  assert.equal(state.completed['borrowed-grid'], false);
  assert.equal(state.completed['echo-city'], false);
  assert.equal(state.completed['painted-country'], false);
});

test('the legacy Painted Country record cannot be opened or smuggle its artifact into the packaged route', () => {
  const state = createDirectionProgressState();
  const opened = reduceDirectionProgress(state, { type: 'direction.open', id: 'painted-country' });
  assert.equal(opened.state.activeDirection, null);
  assert.match(opened.events[0].payload.reason, /sealed/);
  const taken = reduceDirectionProgress(state, { type: 'artifact.take', id: 'painted-country' });
  assert.equal(taken.state.carriedArtifact, null);
  assert.match(taken.events[0].payload.reason, /pre-displayed/);
});

test('sealed directions cannot open, complete, or remove their pre-displayed artifacts', () => {
  let state = createDirectionProgressState();
  const opened = reduceDirectionProgress(state, { type: 'direction.open', id: 'echo-city' });
  assert.equal(opened.state.activeDirection, null);
  assert.match(opened.events[0].payload.reason, /sealed/);
  const shortcut = reduceDirectionProgress(state, { type: 'direction.complete', id: 'echo-city' });
  assert.equal(shortcut.state.completed['echo-city'], false);
  const taken = reduceDirectionProgress(state, { type: 'artifact.take', id: 'echo-city' });
  state = taken.state;
  assert.equal(state.carriedArtifact, null);
  assert.match(taken.events[0].payload.reason, /pre-displayed/);
  assert.equal(state.completed['echo-city'], false);
  assert.equal(state.artifacts['echo-city'].displayed, true);
});

test('the calm corridor cannot carry any gallery artifact', () => {
  const state = createDirectionProgressState();
  for (const id of DIRECTION_ORDER) {
    const result = reduceDirectionProgress(state, { type: 'artifact.take', id });
    assert.equal(result.state.carriedArtifact, null);
    assert.match(result.events[0].payload.reason, /pre-displayed/);
  }
});

test('opening one packaged direction never nests another direction inside it', () => {
  let state = createDirectionProgressState();
  ({ state } = reduceDirectionProgress(state, { type: 'direction.open', id: 'labyrinth' }));
  const rejected = reduceDirectionProgress(state, { type: 'direction.open', id: 'labyrinth' });
  assert.equal(rejected.state.activeDirection, 'labyrinth');
  assert.equal(rejected.events[0].type, 'direction.rejected');
});
