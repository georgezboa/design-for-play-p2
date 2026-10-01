// Round 3 (H6): the Museum stops looking like greybox without getting slower
// on LOW: world-scale UVs, walnut panelling and backs, picture lights whose
// pools are painted on LOW, and no idle lights in the shaders.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { applyWorldUv } from '../../src/chapters/museum3d/util/graybox.js';
import { applySceneQuality, lowTierWantsFxaa } from '../../src/chapters/museum3d/systems/QualityTier.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function uvRange(geometry, from, to) {
  const uv = geometry.attributes.uv;
  let maxU = 0;
  let maxV = 0;
  for (let i = from; i < to; i += 1) { maxU = Math.max(maxU, uv.getX(i)); maxV = Math.max(maxV, uv.getY(i)); }
  return [maxU, maxV];
}

test('shell surfaces get world-scale UVs: one tile per worldTile metres on any wall', () => {
  const material = { userData: { worldTile: 2 } };
  const long = applyWorldUv(new THREE.BoxGeometry(30, 3, 0.3), { w: 30, h: 3, d: 0.3 }, material);
  const short = applyWorldUv(new THREE.BoxGeometry(2, 3, 0.3), { w: 2, h: 3, d: 0.3 }, material);
  // the +z face (vertices 16–19): u along the wall's length, v up it
  assert.deepEqual(uvRange(long, 16, 20), [15, 1.5]);
  assert.deepEqual(uvRange(short, 16, 20), [1, 1.5]);
  // the ±x end faces run along the depth
  assert.ok(Math.abs(uvRange(long, 0, 4)[0] - 0.15) < 1e-6);
  const panels = applyWorldUv(new THREE.BoxGeometry(12, 1.02, 0.04), { w: 12, h: 1.02, d: 0.04 }, { userData: { worldTile: [1.2, 1.02] } });
  assert.ok(Math.abs(uvRange(panels, 16, 20)[0] - 10) < 1e-6, 'ten panelling bays on a 12 m run');
  assert.ok(Math.abs(uvRange(panels, 16, 20)[1] - 1) < 1e-6, 'one bay tall');
  const plain = new THREE.PlaneGeometry(16, 12);
  applyWorldUv(plain, { w: 16, h: 12 }, { userData: { worldTile: 2 } });
  assert.deepEqual(uvRange(plain, 0, plain.attributes.uv.count), [8, 6]);
  // a material without worldTile keeps its 0..1 UVs
  const untouched = applyWorldUv(new THREE.BoxGeometry(5, 5, 5), { w: 5, h: 5, d: 5 }, { userData: {} });
  assert.deepEqual(uvRange(untouched, 0, 24), [1, 1]);
});

test('a case light is real on HIGH and a painted pool on LOW; LOW keeps normal maps', () => {
  const root = new THREE.Group();
  const light = new THREE.PointLight(0xffd7a1, 1.8, 3.4, 2);
  light.userData.tierVisibility = 'high';
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
  pool.visible = false;
  pool.userData.tierVisibility = 'low';
  const normalMap = new THREE.Texture();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ normalMap, normalScale: new THREE.Vector2(0.3, 0.3) }));
  root.add(light, pool, wall);
  const cache = new Map();
  applySceneQuality(root, 'low', { Lambert: THREE.MeshLambertMaterial, cache });
  assert.equal(light.visible, false);
  assert.equal(pool.visible, true);
  assert.ok(wall.material.isMeshLambertMaterial);
  assert.equal(wall.material.normalMap, normalMap, 'the Lambert stand-in keeps the normal map');
  assert.equal(wall.material.normalScale.x, 0.3);
  applySceneQuality(root, 'high', { Lambert: THREE.MeshLambertMaterial, cache });
  assert.equal(light.visible, true);
  assert.equal(pool.visible, false);
  assert.ok(wall.material.isMeshStandardMaterial);
});

test('FXAA only where it pays: a LOW frame on a GPU without MSAA, never on a software rasteriser', () => {
  assert.equal(lowTierWantsFxaa({ software: false, contextAntialias: false }), true);
  assert.equal(lowTierWantsFxaa({ software: false, contextAntialias: true }), false);
  assert.equal(lowTierWantsFxaa({ software: true, contextAntialias: false }), false);
  const app = read('src/chapters/museum3d/Museum3DApp.js');
  assert.match(app, /this\._renderFrame\(\);/);
  assert.match(app, /composer\.addPass\(this\._fxaaPass\)/);
});

test('the corridor is dressed: walnut panelling, brass rails, walnut case backs, picture lights', () => {
  const corridor = read('src/chapters/museum3d/scenes/ArchiveCorridor.js');
  const lobby = read('src/chapters/museum3d/scenes/ServiceLobby.js');
  const materials = read('src/chapters/museum3d/assets/MuseumMaterials.js');
  assert.doesNotMatch(corridor, /emissiveMat\(0x080a0b|emissiveMat\(0x0c0b09/, 'no black slab case backs');
  assert.match(corridor, /material: m\.walnutBack, name: `\$\{id\}-niche-back`/);
  assert.match(corridor, /material: m\.walnutBack, name: `\$\{claim\.id\}-back`/);
  assert.match(corridor, /m\.wainscot, name: `wainscot-\$\{id\}`/);
  assert.match(corridor, /m\.brassTrim, name: `chair-rail-\$\{id\}`/);
  assert.equal((corridor.match(/addPictureLight\(/g) ?? []).length, 2, 'one per chapter case and one per filed claim');
  assert.equal((corridor.match(/highOnly\(new THREE\.PointLight/g) ?? []).length, 2);
  assert.match(lobby, /piece\(0\.61, 1\.02, 0\.04, m\.wainscot/);
  assert.match(materials, /wall: tiled\(new THREE\.MeshStandardMaterial\(\{\s*\.\.\.wallMaps,\s*map: wallcovering/);
  assert.match(materials, /deskWood: tiled\(new THREE\.MeshStandardMaterial\(\{\s*\.\.\.woodMaps/, 'walnut has grain now');
});

test('idle lights stay out of the scene until they burn', () => {
  const gauntlet = read('src/chapters/museum3d/systems/CollapseGauntletDirector.js');
  assert.match(gauntlet, /this\.emergencyLights = this\._buildEmergencyLights\(\);\s*[^]*?this\._setEmergencyLightsPresent\(false\);/);
  assert.match(gauntlet, /start\(snapshot\) \{\s*this\.active = true;\s*this\._setEmergencyLightsPresent\(true\);/);
  const lobby = read('src/chapters/museum3d/scenes/ServiceLobby.js');
  assert.match(lobby, /this\.deskLampLight\.visible = variant === 'reclassified';/);
});

test('the orchard case is a stitched leather case, not a box', () => {
  const objects = read('src/chapters/museum3d/assets/ChapterCaseObjects.js');
  assert.match(objects, /new THREE\.Mesh\(new RoundedBoxGeometry\(0\.62, 0\.42, 0\.2, 3, 0\.03\), leather\)/);
  assert.match(objects, /map: caseLeatherTexture\(\)/);
});
