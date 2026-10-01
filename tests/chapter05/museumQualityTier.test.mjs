import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import {
  LOW_SHEEN,
  QUALITY_SAMPLE_SECONDS,
  SLOW_FRAME_MS,
  SOFTWARE_PIXEL_RATIO,
  applyRendererQuality,
  applySceneQuality,
  createQualityGovernor,
  isSoftwareRendererName,
  qualityPreference,
  syncLowMaterials,
} from '../../src/chapters/museum3d/systems/QualityTier.js';

// Alpha round 1, A3-7 (P1): museum-3d drew at 0.1–0.2 fps on software GL.
// The museum now picks a render tier: low on a software rasteriser or when
// the first 2 s of frames are slow, or when the player asks for it.

test('software rasterisers are recognised from the renderer string', () => {
  for (const name of [
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'Google SwiftShader',
    'Microsoft Basic Render Driver',
  ]) assert.equal(isSoftwareRendererName(name), true, name);
  for (const name of ['ANGLE (Apple, Apple M2, OpenGL 4.1)', 'NVIDIA GeForce RTX 3060/PCIe/SSE2', 'Intel(R) Iris(R) Xe Graphics', '']) {
    assert.equal(isSoftwareRendererName(name), false, name);
  }
});

test('the governor measures 2 s of frames and goes low only when they are slow', () => {
  assert.equal(QUALITY_SAMPLE_SECONDS, 2);
  const fast = createQualityGovernor();
  assert.equal(fast.tier, 'high');
  let changed = null;
  for (let i = 0; i < 200 && !fast.state.decided; i += 1) changed = fast.sample(16.7) ?? changed;
  assert.equal(changed, null);
  assert.equal(fast.tier, 'high');
  assert.equal(fast.state.decided, true);
  assert.match(fast.snapshot().reason, /^fast:/);

  const slow = createQualityGovernor();
  // three slow shader-compile frames are skipped, then 2 s of 80 ms frames
  let result = null;
  for (let i = 0; i < 60 && !slow.state.decided; i += 1) result = slow.sample(80) ?? result;
  assert.equal(result, 'low');
  assert.equal(slow.tier, 'low');
  assert.ok(slow.snapshot().medianMs > SLOW_FRAME_MS);

  // A single frame longer than the whole window decides at once.
  const crawl = createQualityGovernor();
  assert.equal(crawl.sample(5000), 'low');
});

test('a software renderer starts low; the setting overrides either way', () => {
  const soft = createQualityGovernor({ software: true });
  assert.equal(soft.tier, 'low');
  assert.equal(soft.state.reason, 'software-renderer');
  assert.equal(soft.sample(5), null, 'already decided');
  assert.equal(soft.setPreference('high'), 'high');
  assert.equal(soft.tier, 'high');
  assert.equal(soft.setPreference('auto'), 'low');

  assert.equal(createQualityGovernor({ preference: 'low' }).tier, 'low');
  assert.equal(createQualityGovernor({ software: true, preference: 'high' }).tier, 'high');
  assert.equal(qualityPreference({}), 'auto');
  assert.equal(qualityPreference({ graphicsQuality: 'LOW' }), 'low');
  assert.equal(qualityPreference({ graphicsQuality: 'high' }), 'high');
  assert.equal(qualityPreference({ lowGraphics: true }), 'low');
  assert.equal(qualityPreference({ graphicsQuality: 'ultra' }), 'auto');
});

function lobbyLikeScene() {
  const scene = new THREE.Scene();
  const floorMap = new THREE.Texture();
  floorMap.anisotropy = 4;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x6b5d4f, map: floorMap }));
  floor.castShadow = true;
  floor.receiveShadow = true;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color: 0xd8e8e4, transparent: true, opacity: 0.19, transmission: 0.76 }));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const hemi = new THREE.HemisphereLight(0xfff0d2, 0x40392f, 0.58);
  const rect = new THREE.RectAreaLight(0xffedc4, 3.2, 0.48, 3.0);
  const key = new THREE.DirectionalLight(0xffe6bd, 1.65);
  key.castShadow = true;
  scene.add(floor, glass, sign, hemi, rect, key);
  return { scene, floor, glass, sign, hemi, rect, floorMap };
}

test('the low tier swaps PBR for Lambert, drops rect lights and shadows, and restores exactly', () => {
  const { scene, floor, glass, sign, hemi, rect, floorMap } = lobbyLikeScene();
  const standard = floor.material;
  const physical = glass.material;
  const cache = new Map();
  applySceneQuality(scene, 'low', { Lambert: THREE.MeshLambertMaterial, cache });
  assert.equal(floor.material.isMeshLambertMaterial, true);
  assert.equal(floor.material.map, floorMap, 'maps are shared, not copied');
  assert.equal(floor.material.color.getHex(), 0x6b5d4f);
  assert.equal(glass.material.isMeshLambertMaterial, true);
  assert.equal(glass.material.transparent, true);
  assert.ok(glass.material.opacity <= 0.32, 'glass stays a pale pane');
  assert.equal(sign.material.isMeshBasicMaterial, true, 'unlit materials are already cheap');
  assert.equal(floor.castShadow, false);
  assert.equal(rect.visible, false);
  assert.equal(hemi.intensity, 0.58, 'scene lights keep their own intensity; the app adds a fill');
  assert.equal(floor.material.emissive.getHex(), LOW_SHEEN, 'a flat sheen stands in for the environment');
  assert.equal(floorMap.anisotropy, 1);
  assert.equal(floorMap.minFilter, THREE.LinearMipmapNearestFilter);

  // Running it again (a sweep after new objects appear) changes nothing.
  assert.equal(applySceneQuality(scene, 'low', { Lambert: THREE.MeshLambertMaterial, cache }), 0);

  // A late object picks up the tier on the next sweep.
  const late = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0x123456 }));
  scene.add(late);
  assert.equal(applySceneQuality(scene, 'low', { Lambert: THREE.MeshLambertMaterial, cache }), 1);
  assert.equal(late.material.isMeshLambertMaterial, true);

  applySceneQuality(scene, 'high', { Lambert: THREE.MeshLambertMaterial, cache });
  assert.equal(floor.material, standard);
  assert.equal(glass.material, physical);
  assert.equal(floor.castShadow, true);
  assert.equal(rect.visible, true);
  assert.equal(hemi.intensity, 0.58);
  assert.equal(floorMap.anisotropy, 4);
  assert.equal(floorMap.minFilter, THREE.LinearMipmapLinearFilter);
});

test('animations on a stored PBR material still show on its Lambert stand-in', () => {
  const { scene, floor } = lobbyLikeScene();
  const original = floor.material;
  const cache = new Map();
  applySceneQuality(scene, 'low', { Lambert: THREE.MeshLambertMaterial, cache });
  syncLowMaterials(cache);
  assert.equal(floor.material.emissive.getHex(), LOW_SHEEN, 'the sheen survives the first sync');
  original.opacity = 0.4;
  original.emissive.setHex(0xff2412);
  original.emissiveIntensity = 2;
  syncLowMaterials(cache);
  assert.equal(floor.material.opacity, 0.4);
  assert.equal(floor.material.emissive.getHex(), 0xff2412);
  assert.equal(floor.material.emissiveIntensity, 2);
  original.emissive.setHex(0);
  syncLowMaterials(cache);
  assert.equal(floor.material.emissive.getHex(), LOW_SHEEN, 'back to the sheen when the glow ends');
  // Code that animates mesh.material directly (the stand-in) is not undone.
  floor.material.opacity = 0.7;
  syncLowMaterials(cache);
  assert.equal(floor.material.opacity, 0.7);
});

test('the fill is scaled per space and nearly off in the collapse', async () => {
  const { lowFillScale } = await import('../../src/chapters/museum3d/systems/QualityTier.js');
  assert.equal(lowFillScale('lobby', 'lobby'), 1);
  assert.ok(lowFillScale('corridor', 'corridor') < 1);
  assert.ok(lowFillScale('corridor', 'collapse') < lowFillScale('corridor', 'corridor'));
});

test('renderer: low tier has no shadows, no environment, and a capped render scale', () => {
  const calls = [];
  const renderer = {
    shadowMap: { enabled: true },
    ratio: 1.35,
    getPixelRatio() { return this.ratio; },
    setPixelRatio(r) { this.ratio = r; calls.push(r); },
  };
  const scene = { environment: 'pmrem' };
  applyRendererQuality(renderer, scene, 'low', { software: true, environment: 'pmrem', devicePixelRatio: 2 });
  assert.equal(renderer.shadowMap.enabled, false);
  assert.equal(scene.environment, null);
  assert.equal(renderer.ratio, SOFTWARE_PIXEL_RATIO);
  applyRendererQuality(renderer, scene, 'low', { software: false, environment: 'pmrem', devicePixelRatio: 2 });
  assert.equal(renderer.ratio, 1, 'a real GPU on the low tier is capped at 1');
  applyRendererQuality(renderer, scene, 'high', { environment: 'pmrem', devicePixelRatio: 2, highPixelRatio: 1.35 });
  assert.equal(renderer.shadowMap.enabled, true);
  assert.equal(scene.environment, 'pmrem');
  assert.equal(renderer.ratio, 1.35);
});

test('the museum wires the tier in: probe before the renderer, no MSAA on software, sampled frames', () => {
  const app = readFileSync(new URL('../../src/chapters/museum3d/Museum3DApp.js', import.meta.url), 'utf8');
  assert.match(app, /probeSoftwareRenderer\(document\)/);
  assert.match(app, /antialias: !probe\.software/);
  assert.match(app, /this\._stepQuality\(frameStart - lastFrameAt\)/);
  assert.match(app, /nightfall:settings/);
  assert.ok(app.indexOf('probeSoftwareRenderer(document)') < app.indexOf('new THREE.WebGLRenderer'));
});
