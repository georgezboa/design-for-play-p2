import test from 'node:test';
import assert from 'node:assert/strict';

import { createTwoTrueThings } from '../../src/tutorial/phases/twoTrueThings.js';

function step(phase, ms, playerX = 0.1) {
  for (let t = 0; t < ms; t += 20) phase.update(20, { playerX });
}

function enterAndLand(phase) {
  phase.enter();
  step(phase, 700);
}

function witnessBoth(phase) {
  phase.interact('case-a');
  phase.interact('case-b');
}

function carry(phase, id, x) {
  phase.interact(`case-${id}`);
  phase.update(20, { playerX: x });
  phase.interact(`case-${id}`);
}

test('two cases visibly fall onto one overloaded cradle', () => {
  const phase = createTwoTrueThings();
  phase.enter();
  step(phase, 300);
  assert.equal(phase.snapshot().casesFalling, true);
  step(phase, 400);
  assert.equal(phase.snapshot().casesFallen, true);
  assert.deepEqual(phase.drainEvents().map((event) => event.type), ['cases-fell']);
});

test('both witness punches are required before the second cradle unfolds', () => {
  const phase = createTwoTrueThings();
  enterAndLand(phase);
  phase.interact('case-a');
  assert.equal(phase.snapshot().cradleUnfolded, false);
  phase.interact('case-b');
  assert.equal(phase.snapshot().cradleUnfolded, true);
});

test('amber and cyan are independent visible support relationships', () => {
  const phase = createTwoTrueThings();
  enterAndLand(phase);
  witnessBoth(phase);
  phase.interact('amber');
  assert.equal(phase.snapshot().cradleSupport, 'winch-only');
  phase.interact('amber');
  phase.interact('cyan');
  assert.equal(phase.snapshot().cradleSupport, 'air-only');
});

test('placing a case on an incompletely supported cradle returns only that case', () => {
  const phase = createTwoTrueThings({ caseReturnMs: 100 });
  enterAndLand(phase);
  witnessBoth(phase);
  phase.interact('amber');
  carry(phase, 'b', 0.82);
  assert.equal(phase.snapshot().cases.b.detent, 'second');
  assert.equal(phase.snapshot().tags.b, true);
  step(phase, 120, 0.82);
  assert.equal(phase.snapshot().cases.b.detent, 'mainRight');
  assert.equal(phase.snapshot().tags.b, true);
});

test('support connections may be made in either order', () => {
  for (const order of [['amber', 'cyan'], ['cyan', 'amber']]) {
    const phase = createTwoTrueThings();
    enterAndLand(phase);
    witnessBoth(phase);
    order.forEach((command) => phase.interact(command));
    assert.equal(phase.snapshot().cradleSupport, 'ready');
  }
});

test('one witnessed case on each fully supported cradle completes after a readable hold', () => {
  const phase = createTwoTrueThings();
  enterAndLand(phase);
  witnessBoth(phase);
  phase.interact('cyan');
  phase.interact('amber');
  carry(phase, 'b', 0.82);
  step(phase, 580, 0.82);
  assert.equal(phase.snapshot().stageComplete, false);
  step(phase, 40, 0.82);
  assert.equal(phase.snapshot().stageComplete, true);
});
