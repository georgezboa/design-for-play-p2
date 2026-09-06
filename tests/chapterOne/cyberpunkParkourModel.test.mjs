import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FLYING_CAR_DEFS,
  MOVABLE_DEFS,
  PARKOUR_WIDTH,
  activateCheckpoint,
  beginDrag,
  canActivateCheckpoint,
  canCompleteGoal,
  completeGoal,
  createParkourState,
  finishDrag,
  movableById,
  parkourSnapshot,
  previewDrag,
  recordCarRide,
  recordNarrativeInteraction,
  resetParkourState,
  stepFlyingCars,
} from '../../src/cars/cyberpunkParkour/parkourModel.js';

test('first movable ladder spans the intentionally unaided-jump-proof ascent', () => {
  const ladder = MOVABLE_DEFS.find(({ id }) => id === 'ladder-a');
  assert.equal(ladder.height, 180);
  assert.equal(ladder.y - ladder.height / 2, 170);
  assert.equal(ladder.y + ladder.height / 2, 350);
});

test('the existing route is preserved and the second act extends the course', () => {
  assert.equal(PARKOUR_WIDTH, 8100);
  assert.deepEqual(
    MOVABLE_DEFS.slice(0, 4).map(({ id }) => id),
    ['ladder-a', 'block-a', 'ladder-b', 'block-b'],
  );
  assert.deepEqual(
    MOVABLE_DEFS.slice(4).map(({ id }) => id),
    ['ladder-c', 'block-c', 'ladder-d', 'block-d'],
  );
  assert.deepEqual(
    FLYING_CAR_DEFS.map(({ id }) => id),
    ['car-a', 'car-b', 'car-c', 'car-d'],
  );
  assert.equal(MOVABLE_DEFS.find(({ id }) => id === 'ladder-d').y, 170);
});

test('legal horizontal placement commits and updates the traversable position', () => {
  const state = createParkourState();
  assert.equal(beginDrag(state, 'ladder-a'), true);
  assert.deepEqual(previewDrag(state, 735), { x: 735, legal: true });
  assert.deepEqual(finishDrag(state), { id: 'ladder-a', x: 735, accepted: true });
  assert.equal(movableById(state, 'ladder-a').committedX, 735);
  assert.deepEqual(state.movedKinds, ['ladder']);
});

test('illegal placement stays on its rail and restores committed collision position', () => {
  const state = createParkourState();
  const block = movableById(state, 'block-a');
  const startX = block.startX;
  beginDrag(state, block.id);
  assert.deepEqual(previewDrag(state, block.maxX + 400), { x: block.maxX, legal: false });
  assert.deepEqual(finishDrag(state), { id: block.id, x: startX, accepted: false });
  assert.equal(block.x, startX);
  assert.equal(block.committedX, startX);
  assert.deepEqual(state.movedKinds, []);
});

test('flying cars move autonomously, expose phase, and reverse at authored bounds', () => {
  const state = createParkourState();
  const car = state.flyingCars[0];
  assert.equal(car.maxX, 1700, 'the first transfer car must overlap the next roof by a safe margin');
  assert.equal(
    state.flyingCars.find(({ id }) => id === 'car-b').maxX,
    4120,
    'the second transfer car must carry the player safely onto the POWER roof',
  );
  const first = stepFlyingCars(state, 100)[0];
  assert.ok(first.deltaX > 0);
  assert.ok(first.phase > 0);

  car.x = car.maxX - 1;
  car.direction = 1;
  stepFlyingCars(state, 100);
  assert.equal(car.x, car.maxX);
  assert.equal(car.direction, -1);
  assert.equal(car.phase, 1);
});

test('goal requires every obstacle, all four cars, and Mara\'s final letter', () => {
  const state = createParkourState();
  for (const movable of state.movables) {
    const x = movable.startX === movable.maxX ? movable.minX : movable.maxX;
    const target = Math.abs(x - movable.startX) >= 12 ? x : movable.minX + 20;
    const id = movable.id;
    beginDrag(state, id);
    previewDrag(state, target);
    finishDrag(state);
  }
  assert.equal(canCompleteGoal(state), false);
  assert.equal(completeGoal(state), false);
  for (const id of ['car-a', 'car-b', 'car-c']) recordCarRide(state, id);
  assert.equal(canCompleteGoal(state), false, 'the final new car remains mandatory');
  recordCarRide(state, 'car-d');
  assert.equal(canCompleteGoal(state), false, 'the story reveal remains mandatory');
  assert.equal(recordNarrativeInteraction(state, 'letter'), true);
  assert.equal(canCompleteGoal(state), true);
  assert.equal(completeGoal(state), true);
});

test('Mara story evidence is explicit and survives route recovery', () => {
  const state = createParkourState();
  assert.deepEqual(state.narrative, { npcTalked: false, letterRead: false });
  assert.equal(recordNarrativeInteraction(state, 'npc'), true);
  assert.equal(recordNarrativeInteraction(state, 'letter'), true);
  resetParkourState(state, 'fall');
  assert.deepEqual(parkourSnapshot(state).narrative, { npcTalked: true, letterRead: true });
});

test('physically reaching the midpoint always activates it and preserves it after failure', () => {
  const state = createParkourState();
  assert.equal(canActivateCheckpoint(state), true);
  assert.equal(activateCheckpoint(state), true);
  assert.equal(canActivateCheckpoint(state), false);
  assert.deepEqual(state.movedMovables, ['ladder-a', 'block-a', 'ladder-b', 'block-b']);
  assert.deepEqual(state.riddenCars, ['car-a', 'car-b']);

  beginDrag(state, 'block-c');
  previewDrag(state, 5850);
  finishDrag(state);
  recordCarRide(state, 'car-c');
  resetParkourState(state, 'spikes');
  assert.equal(state.checkpointReached, true);
  assert.deepEqual(state.movedMovables, ['ladder-a', 'block-a', 'ladder-b', 'block-b']);
  assert.deepEqual(state.riddenCars, ['car-a', 'car-b']);
  assert.equal(movableById(state, 'block-c').x, 5580);

  resetParkourState(state, 'manual');
  assert.equal(state.checkpointReached, false);
  assert.deepEqual(state.movedMovables, []);
  assert.deepEqual(state.riddenCars, []);
});

test('failure and manual reset restore movable collision positions and platform timing', () => {
  const state = createParkourState();
  beginDrag(state, 'block-b');
  previewDrag(state, 4120);
  finishDrag(state);
  stepFlyingCars(state, 1000);
  recordCarRide(state, 'car-a');

  resetParkourState(state, 'spikes');
  const snapshot = parkourSnapshot(state);
  assert.equal(snapshot.resetCount, 1);
  assert.equal(snapshot.lastFailure, 'spikes');
  assert.deepEqual(snapshot.movedKinds, []);
  assert.deepEqual(snapshot.riddenCars, []);
  assert.equal(snapshot.movables.find(({ id }) => id === 'block-b').x, 4070);
  assert.equal(snapshot.flyingCars.find(({ id }) => id === 'car-a').x, 1100);
  assert.equal(snapshot.goalComplete, false);
});
