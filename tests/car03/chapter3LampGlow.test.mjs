import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import { chapter3LampGlowForClock } from '../../src/cars/presentCity3d/Chapter3TimeVisualController.js';
import { applyRimLight } from '../../src/cars/presentCity3d/chapter3SceneBuilders.js';
import { CHAPTER3_TIME_ANCHORS } from '../../src/cars/presentCity3d/chapter3TimeSystem.js';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

// Round 3 art pass (P2): amber lamp globes with a halo and a light pool,
// warmed by the time of day, and a rim light that keeps Butch readable.
describe('Chapter 3 street lamps and Butch readability (round 3)', () => {
  it('lamps barely glow in the afternoon, warm through dusk, are full at night and fade by the morning train', () => {
    const at = (day, hour, minute = 0) => chapter3LampGlowForClock({ day, minuteOfDay: hour * 60 + minute });
    const glow = (anchor) => chapter3LampGlowForClock(CHAPTER3_TIME_ANCHORS[anchor]);
    assert.ok(glow('CHAPTER_START') < 0.2, 'afternoon arrival: the globes are only just lit');
    assert.ok(glow('TICKET_BOARD_FILED') < glow('MARKET_CROSSED'), 'dusk is warmer than the afternoon');
    assert.ok(glow('MARKET_CROSSED') < glow('NIGHT_WAKE'), 'night is warmer than dusk');
    assert.equal(glow('NIGHT_WAKE'), 1, 'full glow over the fire letters');
    assert.ok(glow('SUNRISE_OVERLOOK') < 1 && glow('NIGHT_SERVICE_BOARDING') < glow('SUNRISE_OVERLOOK'), 'they fade after first light');
    for (let minute = 0; minute < 2 * 1440; minute += 7) {
      const value = chapter3LampGlowForClock({ day: 1 + Math.floor(minute / 1440), minuteOfDay: minute % 1440 });
      assert.ok(value >= 0 && value <= 1 && Number.isFinite(value), `glow at minute ${minute} is in 0..1`);
    }
    assert.ok(at(1, 18) <= at(1, 19) && at(1, 19) <= at(1, 20), 'evening glow never dips');
  });

  it('the city builds amber globes, an additive halo and a pool decal per lamp, on shared materials', () => {
    const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');
    const lamp = preview.match(/function addLamp\([\s\S]*?\n\}/)?.[0] ?? '';
    assert.match(lamp, /new THREE\.Sprite\(glow\.halo\)/);
    assert.match(lamp, /new THREE\.PlaneGeometry\([^)]*\), glow\.pool\)/);
    assert.match(lamp, /glow\.globe/);
    assert.doesNotMatch(lamp, /PointLight|SpotLight/, 'no real light per lamp (cheap on LOW)');
    assert.doesNotMatch(lamp, /new THREE\.MeshStandardMaterial/, 'materials are shared, not built per lamp');
    assert.match(preview, /blending: THREE\.AdditiveBlending/);
    assert.match(preview, /setLampGlow\(level\) \{/);
    // The runtime drives it from the chapter clock, outdoors only.
    const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
    assert.match(runtime, /this\.preview\.setLampGlow\?\.\(chapter3LampGlowForClock\(clock\)\)/);
  });

  it('adds a view-space rim to lit materials once, with its own shader cache key', () => {
    const root = new THREE.Group();
    const lit = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    const unlit = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    root.add(lit, unlit);
    assert.equal(applyRimLight(root), 1, 'only materials with emission get a rim');
    assert.equal(applyRimLight(root), 0, 'a second pass changes nothing');
    assert.match(lit.material.customProgramCacheKey(), /chapter3-rim/);
    const shader = {
      uniforms: {},
      fragmentShader: '#include <common>\nvoid main() {\n#include <emissivemap_fragment>\n}',
    };
    lit.material.onBeforeCompile(shader);
    assert.ok(shader.uniforms.chapter3RimColor && shader.uniforms.chapter3RimStrength);
    assert.match(shader.fragmentShader, /totalEmissiveRadiance \+= chapter3RimColor/);
    assert.match(shader.fragmentShader, /nonPerturbedNormal/, 'the rim follows the geometry, not the cloth normal map');
    const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
    assert.match(runtime, /applyRimLight\(rig, \{[^}]*power: 4 \}\)/, 'a tight edge, not a body-wide wash');
    // ... and the street camera sits a little closer on every tier.
    assert.match(runtime, /const STREET_ZOOM_BOOST = 0\.4;/);
    assert.match(runtime, /let target = this\.baseZoom \+ STREET_ZOOM_BOOST;/);
  });
});
