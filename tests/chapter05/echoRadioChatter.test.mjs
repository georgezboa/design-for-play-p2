import assert from 'node:assert/strict';
import test from 'node:test';
import { ECHO_RADIO_BEATS, findEchoRadioBeat } from '../../src/chapters/museum3d/systems/EchoRadioChatter.js';

const blank = {
  nightKitTaken: true,
  marketShuttersLocked: false,
  fountainCirculationRestored: false,
  archiveLedgerReturned: false,
  nightBadgeClaimed: false,
  stationLampOn: false,
  recordFiled: false,
};

test('the night walk contains practical chatter at every major stop and on the way home', () => {
  assert.deepEqual(ECHO_RADIO_BEATS.map((beat) => beat.id), [
    'receiver-check',
    'market-small-talk',
    'fountain-small-talk',
    'archive-small-talk',
    'station-small-talk',
    'walk-home',
  ]);
  for (const beat of ECHO_RADIO_BEATS) {
    assert.equal(beat.options.length, 2, beat.id);
    assert.ok(beat.lead[0].text.length > 20, beat.id);
  }
});

test('a nearby unplayed conversation triggers once and never repeats', () => {
  const triggered = new Set();
  const first = findEchoRadioBeat({ x: -2.8, z: 41.7, record: blank, triggered });
  assert.equal(first.id, 'receiver-check');
  triggered.add(first.id);
  assert.equal(findEchoRadioBeat({ x: -2.8, z: 41.7, record: blank, triggered }), null);
});

test('the walk-home conversation only becomes available after the round is filed', () => {
  const triggered = new Set(ECHO_RADIO_BEATS.slice(0, 5).map((beat) => beat.id));
  assert.equal(findEchoRadioBeat({ x: -2.5, z: 38.5, record: blank, triggered }), null);
  const completed = { ...blank, recordFiled: true };
  assert.equal(findEchoRadioBeat({ x: -2.5, z: 38.5, record: completed, triggered })?.id, 'walk-home');
});
