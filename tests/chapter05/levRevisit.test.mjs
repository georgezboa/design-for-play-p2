import test from 'node:test';
import assert from 'node:assert/strict';
import { Chapter05Model } from '../../src/chapters/museum3d/state/chapter05Model.js';
import { resolveEchoCityRoute } from '../../src/chapters/museum3d/scenes/EchoCityWalkingSim.js';

function enterEcho(model) {
  for (const type of ['inspectTicket', 'carryTicket', 'enterCorridor', 'enterEchoCity']) {
    assert.equal(model.dispatch({ type }).changed, true, type);
  }
}

test('lev=1 selects the mutually exclusive Lev memory walk', () => {
  assert.equal(resolveEchoCityRoute('?beat=echo&lev=1'), 'lev-revisit');
  assert.equal(resolveEchoCityRoute('?beat=echo'), 'municipal-night-round');
  assert.equal(resolveEchoCityRoute('?beat=echo&lev=0'), 'municipal-night-round');
});

test('Mara cassette route advances only through deliberate physical actions', () => {
  const model = new Chapter05Model();
  enterEcho(model);
  assert.equal(model.getSnapshot().levRevisit.beat, 'take-radio');
  assert.equal(model.dispatch({ type: 'performLevMemoryAction', stop: 'cafe' }).changed, false);
  assert.equal(model.dispatch({ type: 'takeLevRadio' }).changed, true);
  for (const [stop, actionFlag, next] of [
    ['cafe', 'cafeCupTurned', 'walk-fountain'],
    ['fountain', 'fountainCoinTaken', 'walk-letters'],
    ['letters', 'lettersBrushed', 'walk-platform'],
    ['platform', 'platformWaited', 'meet-lev'],
  ]) {
    assert.equal(model.dispatch({ type: 'performLevMemoryAction', stop }).changed, true, stop);
    assert.equal(model.getSnapshot().levRevisit[actionFlag], true, actionFlag);
    assert.equal(model.getSnapshot().levRevisit.beat, next);
  }
  assert.equal(model.getSnapshot().levRevisit.threatStarted, undefined);
});

test('memory stops cannot be completed out of order', () => {
  const model = new Chapter05Model();
  enterEcho(model);
  model.dispatch({ type: 'takeLevRadio' });
  assert.equal(model.dispatch({ type: 'performLevMemoryAction', stop: 'fountain' }).changed, false);
  assert.equal(model.dispatch({ type: 'performLevMemoryAction', stop: 'platform' }).changed, false);
  assert.equal(model.getSnapshot().levRevisit.beat, 'walk-cafe');
});

test('the museum return stays dark until Lev gives Butch Mara’s cassette', () => {
  const model = new Chapter05Model();
  enterEcho(model);
  model.dispatch({ type: 'takeLevRadio' });
  for (const stop of ['cafe', 'fountain', 'letters', 'platform']) model.dispatch({ type: 'performLevMemoryAction', stop });
  assert.equal(model.getSnapshot().echoRecord.recordFiled, false);
  assert.equal(model.dispatch({ type: 'claimMaraCassette' }).changed, false);
  assert.equal(model.dispatch({ type: 'meetLevAtOverlook' }).changed, true);
  assert.equal(model.getSnapshot().echoRecord.recordFiled, false);
  assert.equal(model.dispatch({ type: 'claimMaraCassette' }).changed, true);
  const snapshot = model.getSnapshot();
  assert.equal(snapshot.levRevisit.cassetteClaimed, true);
  assert.equal(snapshot.levRevisit.conversationComplete, true);
  assert.equal(snapshot.levRevisit.beat, 'return');
  assert.equal(snapshot.echoRecord.recordFiled, true);
});

test('the cassette handoff is idempotent', () => {
  const model = new Chapter05Model();
  enterEcho(model);
  model.dispatch({ type: 'takeLevRadio' });
  for (const stop of ['cafe', 'fountain', 'letters', 'platform']) model.dispatch({ type: 'performLevMemoryAction', stop });
  model.dispatch({ type: 'meetLevAtOverlook' });
  assert.equal(model.dispatch({ type: 'claimMaraCassette' }).changed, true);
  assert.equal(model.dispatch({ type: 'claimMaraCassette' }).changed, false);
});

test('walking into a stop cannot complete it without its interaction action', () => {
  const model = new Chapter05Model();
  enterEcho(model);
  model.dispatch({ type: 'takeLevRadio' });
  assert.equal(model.dispatch({ type: 'reachLevMemoryStop', stop: 'cafe' }).changed, false);
  const snapshot = model.getSnapshot();
  assert.equal(snapshot.levRevisit.beat, 'walk-cafe');
  assert.equal(snapshot.levRevisit.cafeReached, false);
  assert.equal(snapshot.levRevisit.cafeCupTurned, false);
});
