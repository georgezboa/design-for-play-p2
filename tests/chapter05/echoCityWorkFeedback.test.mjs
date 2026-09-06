import test from 'node:test';
import assert from 'node:assert/strict';
import { getEchoWorkFeedback } from '../../src/chapters/museum3d/systems/EchoCityWorkFeedback.js';

test('work feedback stays hidden until the player physically takes the kit', () => {
  assert.equal(getEchoWorkFeedback({}, true).visible, false);
  assert.equal(getEchoWorkFeedback({ nightKitTaken: true }, false).visible, false);
});

test('the work card advances one concrete machine at a time', () => {
  const feedback = getEchoWorkFeedback({ nightKitTaken: true, stationLampOn: true }, true);
  assert.equal(feedback.held, 'kit');
  assert.deepEqual(feedback.steps.map((step) => step.state), ['done', 'current', 'future', 'future', 'future']);
  assert.equal(feedback.nextAction, 'RELEASE WINCH PAWL');
});

test('each machine exposes its immediate physical sub-step', () => {
  assert.equal(getEchoWorkFeedback({ nightKitTaken: true }, true).nextAction, 'OPEN BREAKER COVER');
  assert.equal(getEchoWorkFeedback({ nightKitTaken: true, stationPanelOpened: true }, true).nextAction, 'SWITCH NIGHT POWER');
  assert.equal(getEchoWorkFeedback({ nightKitTaken: true, stationLampOn: true, marketPawlReleased: true }, true).nextAction, 'DRAW CANVAS CURTAINS');
  assert.equal(getEchoWorkFeedback({ nightKitTaken: true, stationLampOn: true, marketShuttersLocked: true, fountainGrateCleared: true }, true).nextAction, 'START CIRCULATION');
});

test('claiming the badge visibly replaces the carried kit and completes the card', () => {
  const feedback = getEchoWorkFeedback({
    nightKitTaken: true,
    stationLampOn: true,
    marketShuttersLocked: true,
    fountainCirculationRestored: true,
    archiveLedgerReturned: true,
    nightBadgeClaimed: true,
  }, true);
  assert.equal(feedback.held, 'badge');
  assert.equal(feedback.complete, true);
  assert.equal(feedback.nextAction, 'RETURN TO THE MUSEUM');
  assert.ok(feedback.steps.every((step) => step.state === 'done'));
});
