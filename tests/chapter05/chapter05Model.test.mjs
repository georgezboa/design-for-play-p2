import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Chapter05Model,
  createMuseumEntryState,
  createInitialState,
  reduce,
  REQUIRED_ECHO_FLAGS,
} from '../../src/chapters/museum3d/state/chapter05Model.js';

test('fresh state matches the Chapter 5 entry contract', () => {
  const s = createInitialState();
  assert.equal(s.phase, 'lobby');
  assert.deepEqual(s.ticket, { inspected: false, carried: false, returned: false });
  assert.equal(s.echoRecord.nightKitTaken, false);
  for (const flag of [...REQUIRED_ECHO_FLAGS, 'returnWalkStarted', 'recordFiled']) {
    assert.equal(s.echoRecord[flag], false);
  }
});

test('integrated Museum entry carries the Chapter 1 ticket through the archive doors', () => {
  const s = createMuseumEntryState();
  assert.equal(s.phase, 'lobby');
  assert.deepEqual(s.ticket, { inspected: true, carried: true, returned: false });
  assert.equal(reduce(s, { type: 'enterCorridor' }).state.phase, 'corridor');
});

function driveToEcho(model) {
  for (const type of ['inspectTicket', 'carryTicket', 'enterCorridor', 'enterEchoCity']) {
    assert.equal(model.dispatch({ type }).changed, true, type);
  }
}

function finishNightRound(model) {
  driveToEcho(model);
  for (const type of [
    'takeNightKit',
    'openStationPanel', 'switchStationLamp',
    'releaseMarketPawl', 'lockMarketShutters',
    'clearFountainGrate', 'restoreFountainCirculation',
    'unlockArchiveSlot', 'returnArchiveLedger', 'claimNightBadge',
  ]) {
    assert.equal(model.dispatch({ type }).changed, true, type);
  }
}

test('the municipal night round exposes one current stop at a time', () => {
  const model = new Chapter05Model();
  driveToEcho(model);
  assert.deepEqual(model.availableActions(), ['takeNightKit']);
  assert.equal(model.dispatch({ type: 'lockMarketShutters' }).changed, false);
  model.dispatch({ type: 'takeNightKit' });
  assert.deepEqual(model.availableActions(), ['openStationPanel']);
  model.dispatch({ type: 'openStationPanel' });
  assert.deepEqual(model.availableActions(), ['switchStationLamp']);
  model.dispatch({ type: 'switchStationLamp' });
  assert.deepEqual(model.availableActions(), [
    'releaseMarketPawl',
    'closeServiceWindow',
    'resetTramNotice',
    'closeStandpipe',
  ]);
});

test('optional closing details change the city but never gate the badge', () => {
  const model = new Chapter05Model();
  driveToEcho(model);
  assert.equal(model.dispatch({ type: 'closeServiceWindow' }).changed, false);
  model.dispatch({ type: 'takeNightKit' });
  model.dispatch({ type: 'openStationPanel' });
  model.dispatch({ type: 'switchStationLamp' });

  for (const [type, field] of [
    ['closeServiceWindow', 'serviceWindowClosed'],
    ['resetTramNotice', 'tramNoticeReset'],
    ['closeStandpipe', 'standpipeClosed'],
  ]) {
    assert.equal(model.dispatch({ type }).changed, true, type);
    assert.equal(model.getSnapshot().echoRecord[field], true, field);
    assert.equal(model.dispatch({ type }).changed, false, `${type} is idempotent`);
  }

  for (const type of [
    'releaseMarketPawl', 'lockMarketShutters',
    'clearFountainGrate', 'restoreFountainCirculation',
    'unlockArchiveSlot', 'returnArchiveLedger', 'claimNightBadge',
  ]) model.dispatch({ type });
  assert.equal(model.getSnapshot().echoRecord.recordFiled, true);
});

test('each ordinary duty has a visible preparation step before completion', () => {
  const model = new Chapter05Model();
  driveToEcho(model);
  model.dispatch({ type: 'takeNightKit' });

  for (const [finish, field] of [
    ['lockMarketShutters', 'marketShuttersLocked'],
    ['restoreFountainCirculation', 'fountainCirculationRestored'],
    ['returnArchiveLedger', 'archiveLedgerReturned'],
    ['switchStationLamp', 'stationLampOn'],
  ]) {
    assert.equal(model.dispatch({ type: finish }).changed, false, finish);
    assert.equal(model.getSnapshot().echoRecord[field], false, field);
  }

  model.dispatch({ type: 'openStationPanel' });
  model.dispatch({ type: 'switchStationLamp' });
  model.dispatch({ type: 'releaseMarketPawl' });
  assert.equal(model.availableActions().includes('lockMarketShutters'), true);
  assert.equal(model.getSnapshot().echoRecord.marketShuttersLocked, false);
});

test('the night-round chain finishes only after the tangible badge is claimed', () => {
  const model = new Chapter05Model();
  finishNightRound(model);
  const record = model.getSnapshot().echoRecord;
  assert.equal(record.recordFiled, true);
  assert.equal(record.returnWalkStarted, true);
  for (const flag of REQUIRED_ECHO_FLAGS) assert.equal(record[flag], true, flag);
});

test('the return route stays offline until every visible duty is finished', () => {
  const model = new Chapter05Model();
  driveToEcho(model);
  model.dispatch({ type: 'takeNightKit' });
  for (const type of [
    'openStationPanel', 'switchStationLamp',
    'releaseMarketPawl', 'lockMarketShutters',
    'clearFountainGrate', 'restoreFountainCirculation',
    'unlockArchiveSlot', 'returnArchiveLedger',
  ]) {
    model.dispatch({ type });
  }
  assert.equal(model.getSnapshot().echoRecord.recordFiled, false);
  assert.equal(model.dispatch({ type: 'returnTicket' }).changed, false);
  model.dispatch({ type: 'claimNightBadge' });
  assert.equal(model.getSnapshot().echoRecord.recordFiled, true);
});

test('return preserves the completed round and reclassifies the desk once', () => {
  const model = new Chapter05Model();
  finishNightRound(model);
  let reclassified = 0;
  model.on('lobby.deskReclassified', () => reclassified++);
  assert.equal(model.dispatch({ type: 'returnTicket' }).changed, true);
  assert.equal(model.dispatch({ type: 'returnToMuseum' }).changed, true);
  assert.equal(model.getSnapshot().phase, 'return');
  assert.equal(model.getSnapshot().echoRecord.recordFiled, true);
  assert.equal(reclassified, 1);
  assert.equal(model.dispatch({ type: 'returnToMuseum' }).changed, false);
  assert.equal(reclassified, 1);
});

test('Echo City can return to the archive without opening the finale', () => {
  const model = new Chapter05Model();
  finishNightRound(model);
  model.dispatch({ type: 'returnTicket' });
  assert.equal(model.dispatch({ type: 'returnToArchive' }).changed, true);
  assert.equal(model.getSnapshot().phase, 'corridor');
  assert.equal(model.getSnapshot().lobby.deskReclassified, false);
});

test('the outer four-direction gate unlocks the finale only from the archive corridor', () => {
  const model = new Chapter05Model();
  assert.equal(model.dispatch({ type: 'unlockFinale' }).changed, false);
  model.dispatch({ type: 'inspectTicket' });
  model.dispatch({ type: 'carryTicket' });
  model.dispatch({ type: 'enterCorridor' });
  assert.equal(model.dispatch({ type: 'unlockFinale' }).changed, true);
  assert.equal(model.getSnapshot().phase, 'return');
  assert.equal(model.getSnapshot().lobby.deskReclassified, true);
});

test('corridor loops exactly once and moves the guide stand', () => {
  const model = new Chapter05Model();
  model.dispatch({ type: 'inspectTicket' });
  model.dispatch({ type: 'carryTicket' });
  model.dispatch({ type: 'enterCorridor' });
  assert.equal(model.dispatch({ type: 'corridorLoop' }).changed, true);
  assert.equal(model.getSnapshot().corridor.guideStandSide, 'north');
  assert.equal(model.dispatch({ type: 'corridorLoop' }).changed, false);
});

test('the player can walk back from the archive corridor to the front lobby', () => {
  const model = new Chapter05Model();
  model.dispatch({ type: 'inspectTicket' });
  model.dispatch({ type: 'carryTicket' });
  model.dispatch({ type: 'enterCorridor' });
  assert.equal(model.dispatch({ type: 'leaveCorridor' }).changed, true);
  assert.equal(model.getSnapshot().phase, 'lobby');
  assert.equal(model.getSnapshot().ticket.carried, true);
});

test('reset restores entry state', () => {
  const model = new Chapter05Model();
  finishNightRound(model);
  model.reset();
  assert.deepEqual(model.getSnapshot(), createInitialState());
});

test('rejected actions never mutate prior state', () => {
  const model = new Chapter05Model();
  const before = model.getSnapshot();
  const result = model.dispatch({ type: 'returnArchiveLedger' });
  assert.equal(result.changed, false);
  assert.deepEqual(model.getSnapshot(), before);
});

test('reduce does not mutate its input snapshot', () => {
  const before = createInitialState();
  const frozen = structuredClone(before);
  const result = reduce(before, { type: 'inspectTicket' });
  assert.deepEqual(before, frozen);
  assert.notEqual(result.state, before);
});
