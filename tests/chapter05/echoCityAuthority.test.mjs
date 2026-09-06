import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ECHO_CITY_AUTHORITY,
  ECHO_CITY_REQUIRED_LANDMARKS,
} from '../../src/chapters/museum3d/data/echoCityAuthority.js';

test('Chapter 5 uses the frozen Chapter 3 v68 city authority', () => {
  assert.equal(ECHO_CITY_AUTHORITY.id, 'chapter-3-echo-city-v68');
  const ids = ECHO_CITY_AUTHORITY.landmarks.map((item) => item.id);
  assert.deepEqual(ids, [...ECHO_CITY_REQUIRED_LANDMARKS]);
});

test('the city retains the recognizable civic landmarks and figure-eight roads', () => {
  const ids = new Set(ECHO_CITY_AUTHORITY.landmarks.map((item) => item.id));
  for (const id of ['clock-tower', 'reunion-fountain', 'municipal-archive', 'transit-ministry', 'municipal-tram']) {
    assert.equal(ids.has(id), true, id);
  }
  assert.ok(ECHO_CITY_AUTHORITY.roads.length >= 7);
  assert.equal(ECHO_CITY_AUTHORITY.entrance.z, 44.5);
});

test('encounter contract contains one trace, three witnesses, and the archive', () => {
  assert.deepEqual(Object.keys(ECHO_CITY_AUTHORITY.encounters), [
    'oilSeam', 'eda', 'olek', 'petar', 'archive',
  ]);
});
