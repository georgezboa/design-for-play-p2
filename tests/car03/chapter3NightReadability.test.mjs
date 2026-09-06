import assert from 'node:assert/strict';
import test from 'node:test';

import { chapter3LightForClock } from '../../src/cars/presentCity3d/Chapter3TimeVisualController.js';

test('Echo City midnight keeps a readable blue ambient and fill-light floor', () => {
  const night = chapter3LightForClock({ day: 2, minuteOfDay: 40, period: 'NIGHT' });
  assert.ok(night.exposure >= 1.08);
  assert.ok(night.hemiIntensity >= 1.2);
  assert.ok(night.fillIntensity >= 2);
  assert.notEqual(night.background, 0x000000);
  assert.notEqual(night.fog, 0x000000);
});
