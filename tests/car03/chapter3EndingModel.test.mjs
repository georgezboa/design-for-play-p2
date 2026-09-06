import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHAPTER3_ENDING_TIMELINE,
  createChapter3EndingModel,
} from '../../src/cars/presentCity3d/chapter3EndingModel.js';

function reachMeeting(model, approach = 'plan') {
  assert.equal(model.inspectMorningFire(), true);
  assert.equal(model.chooseMaraApproach(approach), true);
  assert.equal(model.reachStation(), true);
}

describe('Chapter 3 ending slice state model', () => {
  it('starts at the morning evidence gate and returns cloned snapshots', () => {
    const model = createChapter3EndingModel();
    const snapshot = model.snapshot();
    assert.equal(snapshot.phase, 'explore');
    assert.equal(snapshot.morningFireConfirmed, false);
    snapshot.phase = 'corrupted';
    assert.equal(model.snapshot().phase, 'explore');
  });

  it('does not let Mara join or the station trigger before evidence confirmation', () => {
    const model = createChapter3EndingModel();
    assert.equal(model.talkToMaraBeforeEvidence(), true);
    assert.equal(model.snapshot().lastEvent, 'mara-evidence-reminder');
    assert.equal(model.chooseMaraApproach('plan'), false);
    assert.equal(model.reachStation(), false);
  });

  it('accepts exactly three no-fail approaches and preserves the selected tone', () => {
    for (const approach of ['evidence', 'plan', 'uncertainty']) {
      const model = createChapter3EndingModel();
      model.inspectMorningFire();
      assert.equal(model.chooseMaraApproach(approach), true);
      assert.equal(model.snapshot().maraApproach, approach);
      assert.equal(model.snapshot().maraJoinsStation, true);
    }
    const invalid = createChapter3EndingModel();
    invalid.inspectMorningFire();
    assert.equal(invalid.chooseMaraApproach('charm-check'), false);
  });

  it('requires meeting completion before the deterministic scan and departure timeline', () => {
    const model = createChapter3EndingModel();
    reachMeeting(model);
    assert.equal(model.advance(10000), false);
    assert.equal(model.snapshot().dualMaraValidated, false);
    assert.equal(model.completeStationMeeting(), true);
    assert.equal(model.snapshot().interactionLocked, true);
  });

  it('keeps both valid rows visible and boards normally without a timing input', () => {
    const model = createChapter3EndingModel();
    reachMeeting(model, 'evidence');
    model.completeStationMeeting();
    model.advance(700);
    assert.deepEqual(model.snapshot().scannerRows, ['TICKET 43 / VALID']);
    model.advance(800);
    assert.deepEqual(model.snapshot().scannerRows, ['TICKET 43 / VALID', 'TICKET 43 / VALID']);
    model.advance(1000);
    assert.equal(model.snapshot().scannerSummary, '2 PASSENGERS / 2 VALID');
    assert.equal(model.snapshot().dualMaraValidated, true);
    model.advance(900);
    assert.equal(model.snapshot().squareMaraBoarded, true);
    model.advance(1000);
    assert.equal(model.snapshot().butchBoarded, true);
  });

  it('ends with visual black before a two-second audio tail reaches silence', () => {
    const model = createChapter3EndingModel();
    reachMeeting(model, 'uncertainty');
    model.completeStationMeeting();
    model.advance(21600);
    assert.equal(model.snapshot().blackout, true);
    assert.equal(model.snapshot().audioSilent, false);
    assert.equal(model.snapshot().phase, 'black-audio-tail');
    model.advance(1999);
    assert.equal(model.snapshot().audioSilent, false);
    model.advance(1);
    assert.equal(model.snapshot().audioSilent, true);
    assert.equal(model.snapshot().phase, 'complete');
  });

  it('declares a monotonic authored timeline', () => {
    assert.equal(CHAPTER3_ENDING_TIMELINE[0].at, 0);
    for (let index = 1; index < CHAPTER3_ENDING_TIMELINE.length; index += 1) {
      assert.ok(CHAPTER3_ENDING_TIMELINE[index].at > CHAPTER3_ENDING_TIMELINE[index - 1].at);
    }
  });
});
