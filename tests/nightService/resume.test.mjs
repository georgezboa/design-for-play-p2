// Alpha R4 · P1: Chapter 1 records a resume point after every finished step
// of every act, and Continue reopens the act there (rebuilding the board the
// step needs from the dev `?step=` skips, then the windows and the lens).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTS, ACT_ORDER, resolveResume, startCarry } from '../../src/chapters/nightService/acts/index.js';
import { createPanelModel } from '../../src/chapters/nightService/panelModel.js';
import { createSaveStore } from '../../src/shell/saveSystem.js';
import { apply, settle, solveBfs } from './helpers.mjs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const open = (actId, options = {}) => createPanelModel(ACTS[actId], { carry: startCarry(actId), ...options });

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
}

/** Reopen an act from a resume point the way nightService-main.js + PanelScene do. */
function resumeFrom(actId, point) {
  const resume = resolveResume(ACTS[actId], point);
  assert.ok(resume, `${actId}: ${point?.step} resolves`);
  const model = open(actId, { step: resume.step });
  model.applyResume(resume);
  return model;
}

/** Steps that wait on the player (the ones a resume point can name). */
const resumable = (actId) => ACTS[actId].steps.slice(1).filter((step) => step.hint).map((step) => step.id);

test('every act step after the first that waits on the player reopens on that step, ready to play', () => {
  ACT_ORDER.forEach((actId) => {
    resumable(actId).forEach((stepId) => {
      const model = open(actId, { step: stepId });
      settle(model);
      assert.equal(model.currentStep()?.id, stepId, `${actId}:${stepId}`);
      assert.ok(model.waitingOnPlayer(), `${actId}:${stepId} waits on the player`);
      assert.equal(model.state.inputLocked, false, `${actId}:${stepId} is not locked`);
    });
  });
});

test('Acts 0 – 2: from every resume point the act can still be finished', () => {
  ['act0', 'act05', 'act1', 'act2'].forEach((actId) => {
    resumable(actId).forEach((stepId) => {
      const model = open(actId, { step: stepId });
      const solution = solveBfs(ACTS[actId], model.snapshot(), { maxStates: 6000 });
      assert.ok(solution, `${actId}:${stepId} is solvable`);
    });
  });
});

test('a played act records each finished step once, and each one resumes on that step', () => {
  ['act0', 'act05', 'act1', 'act2'].forEach((actId) => {
    const model = open(actId);
    const solution = solveBfs(ACTS[actId], model.snapshot(), { maxStates: 6000 });
    const points = [];
    let index = model.state.stepIndex;
    const watch = () => {
      if (model.state.stepIndex !== index && model.state.stepIndex > 0 && model.waitingOnPlayer()) {
        index = model.state.stepIndex;
        points.push(model.resumePoint());
      }
    };
    solution.forEach((action) => { apply(model, action); watch(); settle(model); watch(); });
    assert.ok(model.state.ended, `${actId} ends`);
    assert.ok(points.length >= 1, `${actId} recorded resume points`);
    assert.equal(new Set(points.map((p) => p.step)).size, points.length, `${actId}: once per step`);
    points.forEach((point) => {
      assert.equal(point.act, actId);
      const again = resumeFrom(actId, point);
      settle(again);
      assert.equal(again.currentStep().id, point.step, `${actId}: ${point.step}`);
      assert.deepEqual(again.state.slots, point.slots, `${actId}: ${point.step} keeps the windows`);
    });
  });
});

test('Act 3: the hill resume opens the orchard on the hill, where Mara waits', () => {
  const model = open('act3', { step: 'bridge' });
  settle(model);
  assert.equal(model.state.tiles.orchard.state, 'overlook');
  assert.equal(model.state.actors.mara.state, 'overlook');
  assert.ok(model.state.actors.mara.visible);
});

test('a resumed layout that would finish the step at once is not restored', () => {
  // Act 2 firstWeight: rack above the aisle would drop the case under the title
  const model = open('act2', { step: 'firstWeight' });
  const done = ['rack', 'board', 'aisle', 'window'];
  const applied = model.applyResume({ slots: done });
  assert.equal(applied.slots, false);
  assert.notDeepEqual(model.state.slots, done);
  assert.equal(model.currentStep().id, 'firstWeight');
  // a harmless one is
  const elsewhere = ['board', 'window', 'aisle', 'rack'];
  assert.equal(model.applyResume({ slots: elsewhere }).slots, true);
  assert.deepEqual(model.state.slots, elsewhere);
});

test('resume data is checked: the act, a real step past the first, a sane lens; junk slots are ignored', () => {
  const act = ACTS.act2;
  assert.equal(resolveResume(act, null), null);
  assert.equal(resolveResume(act, { act: 'act1', step: 'mark' }), null);
  assert.equal(resolveResume(act, { act: 'act2', step: 'punch' }), null, 'the first step is the checkpoint itself');
  assert.equal(resolveResume(act, { act: 'act2', step: 'nope' }), null);
  assert.deepEqual(resolveResume(act, { act: 'act2', step: 'mark', slots: ['a'], lens: { x: 'x' } }), { act: 'act2', step: 'mark', slots: ['a'], lens: null });
  const model = open('act2', { step: 'mark' });
  assert.equal(model.applyResume({ slots: ['rack', 'rack', 'aisle', 'board'] }).slots, false);
  assert.equal(model.applyResume({ lens: { x: 900, y: 500 } }).lens, true);
  assert.equal(model.state.lens.x, 900);
});

test('through the save: Continue reads the resume point of the act the save stands on', () => {
  const store = createSaveStore(memoryStorage(), { scratch: false });
  store.startNew(0);
  store.markCheckpoint('chapter-1-act-2');
  const model = open('act2', { step: 'orchard' });
  settle(model);
  const point = model.resumePoint();
  store.markResume('chapter-1-act-2', point);
  const back = resumeFrom('act2', store.readResume('chapter-1-act-2'));
  assert.equal(back.currentStep().id, 'orchard');
  // the next act's checkpoint drops it
  store.markCheckpoint('chapter-1-act-3');
  assert.equal(store.readResume('chapter-1-act-2'), null);
});

test('the page wires it: the scene reports finished steps, main reopens the act there unless a dev route overrides', () => {
  const scene = read('src/chapters/nightService/PanelScene.js');
  const main = read('src/nightService-main.js');
  assert.match(scene, /updateResumePoint\(\) \{/);
  assert.match(scene, /this\.services\.onResumePoint\(point\)/);
  assert.match(scene, /this\.model\.applyResume\(this\.resumeData\)/);
  assert.match(main, /store\.markResume\(save\.checkpointId, point\)/);
  assert.match(main, /const overridden = \['act', 'step', 'from'\]\.some/);
  assert.match(main, /step: startStep, resume,/);
});
