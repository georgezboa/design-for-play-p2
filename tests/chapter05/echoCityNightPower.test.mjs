import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNightPowerPresentation,
  rankStreetlightsByDistance,
} from '../../src/chapters/museum3d/systems/EchoCityNightPower.js';

test('Echo City begins in a navigable blackout with only an emergency beacon', () => {
  const state = getNightPowerPresentation({ stationLampOn: false });
  assert.equal(state.powered, false);
  assert.ok(state.exposure < 0.3);
  assert.equal(state.streetlightFactor, 0);
  assert.equal(state.activePoolCount, 0);
  assert.equal(state.shadowCasterCount, 0);
  assert.equal(state.groundPoolOpacity, 0);
  assert.ok(state.emergencyBeaconIntensity > 0);
  assert.equal(state.stationLampIntensity, 0);
});

test('night power restores the street grid and warm station lamp', () => {
  const state = getNightPowerPresentation({ stationLampOn: true });
  assert.equal(state.powered, true);
  assert.ok(state.exposure < 0.3, 'power must not globally brighten the whole city');
  assert.equal(state.streetlightFactor, 1);
  assert.equal(state.activePoolCount, 8);
  assert.equal(state.shadowCasterCount, 2);
  assert.ok(state.bulbIntensity >= 10);
  assert.ok(state.groundPoolOpacity > 0.1);
  assert.equal(state.emergencyBeaconIntensity, 0);
  assert.ok(state.stationLampIntensity >= 60);
});

test('streetlight budget follows the player so local pools and shadows move through the city', () => {
  const lights = [
    { x: 20, z: 0 },
    { x: 1, z: 1 },
    { x: -4, z: 0 },
    { x: 0, z: 9 },
  ];
  assert.deepEqual(rankStreetlightsByDistance({ x: 0, z: 0 }, lights), [1, 2, 3, 0]);
  assert.deepEqual(rankStreetlightsByDistance({ x: 18, z: 0 }, lights), [0, 1, 3, 2]);
});
