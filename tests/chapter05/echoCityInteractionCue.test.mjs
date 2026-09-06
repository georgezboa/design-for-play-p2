import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  currentNightRoundStop,
  nightRoundCuePresentation,
} from '../../src/chapters/museum3d/scenes/EchoCityWalkingSim.js';

test('only the next night-round object is eligible for the breathing cue', () => {
  assert.equal(currentNightRoundStop({}), 'kit');
  assert.equal(currentNightRoundStop({ nightKitTaken: true }), 'station');
  assert.equal(currentNightRoundStop({ nightKitTaken: true, stationLampOn: true }), 'market');
  assert.equal(currentNightRoundStop({
    nightKitTaken: true,
    stationLampOn: true,
    marketShuttersLocked: true,
  }), 'fountain');
  assert.equal(currentNightRoundStop({
    nightKitTaken: true,
    stationLampOn: true,
    marketShuttersLocked: true,
    fountainCirculationRestored: true,
  }), 'archive');
  assert.equal(currentNightRoundStop({
    nightKitTaken: true,
    stationLampOn: true,
    marketShuttersLocked: true,
    fountainCirculationRestored: true,
    nightBadgeClaimed: true,
  }), null);
});

test('active cue visibly breathes while inactive hardware stays neutral', () => {
  const low = nightRoundCuePresentation(2.1, true);
  const high = nightRoundCuePresentation(0.7, true);
  // The city renderer runs at 0.20 exposure, so the local cue needs enough
  // energy to survive tone mapping while remaining a short-range pool.
  assert.ok(low.lightIntensity >= 5.8);
  assert.ok(high.lightIntensity <= 7.6);
  assert.ok(high.lightIntensity > low.lightIntensity);
  assert.ok(low.colorMix >= 0.34);
  assert.ok(high.colorMix <= 0.60);
  assert.deepEqual(nightRoundCuePresentation(0.7, false), {
    lightIntensity: 0,
    colorMix: 0,
  });
});

test('market duty uses stall-mounted canvas curtains instead of floating shutters', () => {
  const source = fs.readFileSync(
    new URL('../../src/chapters/museum3d/scenes/EchoCityWalkingSim.js', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /marketClosures/);
  assert.doesNotMatch(source, /this\.marketCanvas/);
  assert.match(source, /DRAW THE CANVAS CURTAINS/);
  assert.match(source, /market-stall-canvas-curtain-/);
  assert.match(source, /market-curtain-winch-rope/);
  assert.match(source, /openScaleX = 0\.14/);
});

test('market handwheel preserves its vertical face and turns once around its axle', () => {
  const source = fs.readFileSync(
    new URL('../../src/chapters/museum3d/scenes/EchoCityWalkingSim.js', import.meta.url),
    'utf8',
  );
  assert.match(source, /marketWheelBaseQuaternion = handwheel\.quaternion\.clone\(\)/);
  assert.match(source, /marketWheelSpinAxis = new THREE\.Vector3\(0, 1, 0\)/);
  assert.match(source, /r\.marketShuttersLocked \? Math\.PI \* 2 : 0/);
  assert.match(source, /marketWheelTurnStartMs = globalThis\.performance\.now\(\)/);
  assert.match(source, /marketWheelTurnStartMs\) \/ 1200/);
  assert.match(source, /setFromAxisAngle\(this\.marketWheelSpinAxis, this\.marketWheelSpin\)/);
  assert.doesNotMatch(source, /this\.marketWheel\.rotation\.z\s*=/);
});

test('market and fountain actions produce persistent world-space feedback', () => {
  const source = fs.readFileSync(
    new URL('../../src/chapters/museum3d/scenes/EchoCityWalkingSim.js', import.meta.url),
    'utf8',
  );
  assert.match(source, /market-stall-canvas-curtain-/);
  assert.match(source, /r\.marketShuttersLocked \? curtain\.userData\.closedX/);
  assert.match(source, /fountain-pump-service-wheel/);
  assert.match(source, /this\.fountainRipples/);
  assert.match(source, /r\.fountainCirculationRestored \? 0\.72 : 0/);
});

test('night-round hardware has no large world-space instruction placards', () => {
  const source = fs.readFileSync(
    new URL('../../src/chapters/museum3d/scenes/EchoCityWalkingSim.js', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /MARKET\s+\/\s+LAST STALL/);
  assert.doesNotMatch(source, /REUNION FOUNTAIN\nCIRCULATION PUMP/);
  assert.doesNotMatch(source, /PUBLIC WORKS\nNIGHT RETURN/);
  assert.doesNotMatch(source, /PLATFORM\s+\/\s+NIGHT POWER/);
  assert.match(source, /night-round-\$\{id\}-breath/);
});
