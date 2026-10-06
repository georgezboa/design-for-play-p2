// Alpha R4 · P1: Chapter 1's game time follows the wall clock on a weak
// machine (10–25 fps), and Butch walks at BUTCH_PACE.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FRAME_DT_CAP_MS, MODEL_STEP_MS, frameDt, stepModel } from '../../src/chapters/nightService/frameClock.js';
import { BUTCH_PACE, DEFAULT_WALK_SPEED, createPanelModel } from '../../src/chapters/nightService/panelModel.js';
import { ACT05 } from '../../src/chapters/nightService/acts/act05.js';
import { ACTS } from '../../src/chapters/nightService/acts/index.js';

test('frameDt follows real time down to 10 fps and caps a stall', () => {
  assert.equal(FRAME_DT_CAP_MS, 100);
  assert.equal(frameDt(16.7), 16.7);
  assert.equal(frameDt(66), 66);
  assert.equal(frameDt(100), 100);
  assert.equal(frameDt(900), 100);
  assert.equal(frameDt(-5), 0);
  assert.equal(frameDt(NaN), 0);
  // the dev ?dtmax= QA knob still raises the cap
  assert.equal(frameDt(900, 1000), 900);
});

test('stepModel slices a long frame so nothing tunnels', () => {
  const calls = [];
  const slices = stepModel({ update: (dt) => calls.push(dt) }, 130);
  assert.equal(slices, 3);
  assert.deepEqual(calls, [MODEL_STEP_MS, MODEL_STEP_MS, 30]);
});

/** Game ms until Butch reaches the stores door in Act 0.5, at a frame rate. */
function walkTime(fps) {
  const m = createPanelModel(ACT05);
  m.swap(0, 1);
  const frame = 1000 / fps;
  let ms = 0;
  while (!m.hasFlag('butchAtStores') && ms < 60000) {
    stepModel(m, frameDt(frame));
    ms += frame;
  }
  return ms;
}

test('a walk takes the same wall-clock time at 10, 20 and 60 fps', () => {
  const at60 = walkTime(60);
  const at20 = walkTime(20);
  const at10 = walkTime(10);
  assert.ok(at60 < 60000, 'Butch arrives');
  // within a frame or two of each other, never slower at a low frame rate
  assert.ok(Math.abs(at20 - at60) <= 120, `20 fps ${at20} vs 60 fps ${at60}`);
  assert.ok(Math.abs(at10 - at60) <= 220, `10 fps ${at10} vs 60 fps ${at60}`);
});

test('every Chapter 1 Butch walks at BUTCH_PACE', () => {
  assert.ok(BUTCH_PACE >= 1.2 && BUTCH_PACE <= 1.4);
  Object.values(ACTS).forEach((act) => assert.equal(act.actors.butch.pace, BUTCH_PACE, act.id));
  const m = createPanelModel(ACT05);
  m.swap(0, 1);
  stepModel(m, 1000);
  const walk = m.state.actors.butch.walk;
  assert.ok(walk, 'walking to the stores');
  assert.equal(walk.speed, DEFAULT_WALK_SPEED * BUTCH_PACE);
});
