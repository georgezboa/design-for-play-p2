import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const world = fs.readFileSync(new URL('../../src/chapters/museum3d/echoCityV68/EchoCityV68World.js', import.meta.url), 'utf8');
const scene = fs.readFileSync(new URL('../../src/chapters/museum3d/scenes/EchoCityWalkingSim.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../../museum-3d.html', import.meta.url), 'utf8');
const chapter3World = fs.readFileSync(new URL('../../src/chapters/museum3d/echoCityV68/EchoCityV68World.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../../src/chapters/museum3d/Museum3DApp.js', import.meta.url), 'utf8');
const director = fs.readFileSync(new URL('../../src/chapters/museum3d/systems/TransitionDirector.js', import.meta.url), 'utf8');
const modelLoader = fs.readFileSync(new URL('../../src/chapters/museum3d/assets/EchoCityModelLoader.js', import.meta.url), 'utf8');

test('Chapter 5 mounts the complete Chapter 3 Echo City builder instead of a second graybox map', () => {
  assert.match(scene, /buildEchoCityV68World/);
  assert.doesNotMatch(scene, /civic-block-/);
  assert.match(world, /addDistrictRoads/);
  assert.match(world, /PERIMETER_BUILDINGS/);
  assert.match(world, /CITY_MODELS/);
});

test('Echo City transition is a black threshold, never a white loading frame', () => {
  assert.match(html, /#fade[\s\S]*background:\s*#050608/);
  assert.doesNotMatch(html, /#fade[\s\S]{0,180}background:\s*#e8e4d8/);
});

test('the physical Echo City threshold swaps preloaded roots without a full-screen fade or relock', () => {
  assert.match(app, /toPhase: 'echo-city',[\s\S]{0,220}occlude: false,[\s\S]{0,80}preserveControl: true/);
  assert.match(app, /fromPhase: 'echo-city',[\s\S]{0,260}occlude: false,[\s\S]{0,80}preserveControl: true/);
  assert.match(director, /if \(occlude\) await this\._fade\(true\)/);
  assert.match(director, /if \(!preserveControl\)/);
});

test('Chapter 5 requests the shared night look with lit streetlamps', () => {
  assert.match(scene, /buildEchoCityV68World\(\{ renderer: ctx\.renderer, look: 'night' \}\)/);
  assert.match(chapter3World, /ECHO_CITY_LAMP_POSITIONS/);
  assert.match(chapter3World, /echo-city-night-streetlight/);
  assert.match(chapter3World, /new THREE\.SpotLight/);
  assert.match(chapter3World, /multiplyScalar\(0\.12\)/);
  assert.match(chapter3World, /Math\.PI \/ 3\.25/);
  assert.match(chapter3World, /echo-city-night-streetlight-target/);
  assert.match(chapter3World, /echo-city-night-streetlight-ground-pool/);
  assert.match(chapter3World, /shadow\.mapSize\.set\(512, 512\)/);
  assert.match(chapter3World, /rendererExposure = resolvedLook === 'night' \? 0\.20 : 0\.92/);
});

test('authored models, supports, lamps, and mailboxes resolve against their local walk surface', () => {
  assert.match(chapter3World, /function sampleWalkSurfaceY/);
  assert.match(chapter3World, /const groundAt = \(x, z\) => sampleWalkSurfaceY\(walkMeshes, x, z\)/);
  assert.match(chapter3World, /const baseGroundY = spec\.groundY \?\? sampleWalkSurfaceY/);
  assert.match(chapter3World, /groundY - bounds\.min\.y - \(spec\.groundSink \?\? 0\)/);
  assert.match(chapter3World, /addModelSupport\(parent, materials, spec,[\s\S]{0,100}sampleWalkSurfaceY/);
  assert.match(chapter3World, /body\.position\.y = 0\.6/);
  assert.doesNotMatch(chapter3World, /body\.position\.y = 0\.82/);
  assert.match(chapter3World, /const boundaryObstacles = PROP_OBSTACLES\.map/);
});

test('the shared Chapter 3 world contains no Chapter 5 museum return door', () => {
  assert.doesNotMatch(chapter3World, /MUSEUM RETURN|museum-return|chapter-5-only/i);
  assert.match(scene, /chapter-5-only-museum-return-threshold/);
});

test('approved Hunyuan duty models remain where a single shell does not erase mechanical interaction', () => {
  for (const id of ['fountainPumpCabinet', 'archiveNightReturn', 'publicWorksLedger']) {
    assert.match(modelLoader, new RegExp(`${id}:`));
    assert.match(scene, new RegExp(`id: '${id}'`));
  }
  for (const fallback of ['fountainFallback', 'archiveFallback']) {
    assert.match(scene, new RegExp(`this\\.${fallback}\\.visible = false`));
  }
  assert.doesNotMatch(scene, /id: 'nightServiceKit'/);
  assert.doesNotMatch(scene, /id: 'stationNightPowerBox'/);
  assert.match(scene, /_replaceInteractionCueTarget\('fountain', model/);
  assert.match(scene, /_replaceInteractionCueTarget\('archive', model/);
  assert.match(scene, /const interactableId = parent\.userData\.interactableId/);
  assert.match(scene, /model\.traverse\(\(object\) => \{[\s\S]{0,100}object\.userData\.interactableId = interactableId/);
  assert.match(scene, /model\.position\.add\(new THREE\.Vector3\(\.\.\.position\)\)/);
  assert.doesNotMatch(scene, /model\.position\.set\(\.\.\.position\)/);
});

test('night-service kit is grounded articulated municipal canvas hardware', () => {
  assert.match(scene, /night-kit-service-tray/);
  assert.match(scene, /night-kit-canvas-body/);
  assert.match(scene, /night-kit-side-gusset/);
  assert.match(scene, /night-kit-hinged-flap/);
  assert.match(scene, /night-kit-leather-strap/);
  assert.match(scene, /night-kit-aged-clasp/);
  assert.match(scene, /NIGHT SERVICE  \/  A-17/);
  assert.match(scene, /nightKitFlapPivot\.rotation\.x = -flapPhase \* 1\.18/);
  assert.match(scene, /nightKit\.position\.y = this\.nightKitBaseY \+ liftPhase \* 0\.62/);
});

test('station breaker is articulated civic hardware with a staged opening action', () => {
  assert.match(scene, /station-switch-cast-iron-box/);
  assert.match(scene, /station-hinged-breaker-door/);
  assert.match(scene, /station-porcelain-fuse/);
  assert.match(scene, /station-knife-switch/);
  assert.match(scene, /BREAKER COVER OPENING/);
  assert.match(scene, /stationDoorHinge\.rotation\.y = -Math\.PI \* 0\.72/);
  assert.match(scene, /stationDoorOpenVisual < 0\.9/);
});
