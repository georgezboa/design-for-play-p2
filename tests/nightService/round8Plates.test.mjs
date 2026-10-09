// Round 8 (plates1): George's painting of the Conductor's car in Act 1, and
// Butch in his desk chairs (the painted sit-chair frame) in Acts 0.5 and 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ACTS, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { ANCHOR, PLATE, ZOOM } from '../../src/chapters/nightService/art/ch1Plates.js';
import { BUTCH_IN_CHAIR } from '../../src/chapters/nightService/art/act05Plates.js';
import { BUTCH_IN_CAR, BUTCH_IN_CHAIR1, CONDUCTOR_IN_CAR } from '../../src/chapters/nightService/art/act1Plates.js';
import { SPRITE_RIGS } from '../../src/chapters/nightService/spriteAnimator.js';
import { createPanelModel } from '../../src/chapters/nightService/panelModel.js';
import { settle } from './helpers.mjs';

const inRect = ([x, y, w, h], u, v, pad = 0) => u >= x - pad && u <= x + w + pad && v >= y - pad && v <= y + h + pad;

test('round 8: the Conductor\'s car is George\'s A1-conductor, not a crop of the Act 2 aisle', () => {
  const plate = PLATE['act1/conductor'];
  assert.equal(plate.src, 'A1-conductor.png');
  assert.ok(existsSync(new URL(`../../public${plate.url}`, import.meta.url)));
  assert.equal(ACTS.act1.tiles.door.states.conductor.plate, plate.url);
  assert.ok(Math.abs(plate.crop[2] / plate.crop[3] - 1.8) < 0.002);
  // the zoom flies through the open door's painted doorway into it: the box is
  // pinned to the door painting's right edge and holds the doorway
  const [x, y, s] = ZOOM['act1/conductor'];
  assert.ok(Math.abs(x + s - 1) < 1e-3 && y > 0 && y + s < 1, 'inside the door painting, at its right edge');
  const open = ANCHOR['act1/door-open'].doorway;
  const cx = open[0] + open[2] / 2;
  assert.ok(cx > x && cx < x + s, 'the doorway is inside the box');
  const step = ACTS.act1.steps.find((st) => st.id === 'conductor').do;
  assert.deepEqual(step.find((e) => e.zoomTo).zoomTo.rect, ZOOM['act1/conductor']);
});

test('round 8: in the car Butch and the Conductor meet on the runner, inside the doorway, facing each other', () => {
  const car = ANCHOR['act1/conductor'];
  const door = car.doorway;
  for (const [u, v] of [car.butchFeet, car.conductorFeet]) {
    assert.ok(inRect(door, u, v), 'standing in the corridor beyond the door');
    assert.ok(v < car.threshold, 'beyond the threshold');
  }
  // Butch comes in a step and stops in front of the Conductor
  const step = ACTS.act1.steps.find((st) => st.id === 'conductor').do;
  const place = step.find((e) => e.placeActor?.state === 'conductor').placeActor;
  const walk = step.find((e) => e.walkButch?.id === 'meetConductor').walkButch;
  assert.equal(place.facing, 1);
  assert.ok(place.x < BUTCH_IN_CAR.x && Math.abs(place.y - BUTCH_IN_CAR.y) < 1e-9, 'a step across the runner, at one depth');
  assert.deepEqual([walk.path.at(-1).x, walk.path.at(-1).y], [BUTCH_IN_CAR.x, BUTCH_IN_CAR.y]);
  assert.equal(ACTS.act1.actors.conductor.facing, -1);
  // he is placed before the zoom, so both are there when it lands
  assert.ok(step.indexOf(step.find((e) => e.placeActor?.state === 'conductor')) < step.indexOf(step.find((e) => e.zoomTo)));
  // the model plays the scene through: offer, handover, bell #1
  const model = createPanelModel(ACTS.act1, { carry: startCarry('act1'), step: 'conductor' });
  settle(model);
  assert.equal(model.state.tiles.door.state, 'conductor');
  assert.ok(model.hasItem('punch'));
  const butch = model.state.actors.butch;
  assert.deepEqual([butch.x, butch.y], [BUTCH_IN_CAR.x, BUTCH_IN_CAR.y]);
  assert.ok(CONDUCTOR_IN_CAR.x - BUTCH_IN_CAR.x > 0.05, 'room for the handover between them');
});

test('round 8: Butch sits in his desk chairs with the painted sit-chair frame (no stool)', () => {
  assert.equal(SPRITE_RIGS.butch.poses['sit-chair'], 'sit-chair');
  const a05 = ACTS.act05.actors.butch;
  const a1 = ACTS.act1.actors.butch;
  assert.equal(a05.pose, 'sit-chair');
  assert.equal(a1.pose, 'sit-chair');
  assert.deepEqual([a05.x, a05.y], [BUTCH_IN_CHAIR.x, BUTCH_IN_CHAIR.y]);
  assert.deepEqual([a1.x, a1.y], [BUTCH_IN_CHAIR1.x, BUTCH_IN_CHAIR1.y]);
  // the seat's back is on the painted chair, his feet on the boards below it
  for (const [id, desk, at] of [['act05', 'act05/desk', BUTCH_IN_CHAIR], ['act1', 'act1/desk', BUTCH_IN_CHAIR1]]) {
    const chair = ANCHOR[desk].chair;
    assert.ok(inRect(chair, at.x, at.y, 0.01), `${id}: sitting on the painted chair`);
    assert.ok(at.y > ANCHOR[desk].floorRight, `${id}: the chair stands in front of the wall`);
  }
  // no act in Chapter 1's first half uses the stool frame where there is a chair
  for (const id of ['act05', 'act1']) {
    const poses = ACTS[id].steps.flatMap((st) => [...(st.do ?? []), ...(st.skip ?? [])])
      .map((e) => e.actorPose?.pose ?? e.placeActor?.pose).filter(Boolean);
    assert.ok(!poses.includes('sit'), `${id} never shows the stool frame`);
  }
  // he gets up when the floor links, and Act 0.5 ends with him back in his chair
  const model = createPanelModel(ACTS.act05, { carry: startCarry('act05') });
  model.swap(0, 1);
  model.update(50);
  assert.notEqual(model.state.actors.butch.pose, 'sit-chair');
  settle(model);
  model.zoomIn('desk', 'keys');
  model.zoomIn('door', 'lock');
  model.swap(0, 1);
  settle(model);
  model.swap(0, 1);
  settle(model);
  assert.equal(model.state.actors.butch.pose, 'sit-chair');
  assert.deepEqual([model.state.actors.butch.x, model.state.actors.butch.y], [BUTCH_IN_CHAIR.x, BUTCH_IN_CHAIR.y]);
  assert.equal(model.state.ended?.next, 'act1');
});
