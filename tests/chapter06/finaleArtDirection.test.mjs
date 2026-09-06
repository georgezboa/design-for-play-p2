import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CAMERA_LANGUAGE,
  FINALE_VISUAL_BEATS,
  FINALE_WORLD_IDS,
  WORLD_ART_LAYERS,
  getFinaleAssetManifest,
} from '../../src/chapters/allWorlds/finaleArtDirection.js';

describe('Chapter 6 locked art and camera direction', () => {
  it('defines exactly one art language for every earlier world', () => {
    assert.deepEqual(Object.keys(WORLD_ART_LAYERS), FINALE_WORLD_IDS);
    for (const layer of Object.values(WORLD_ART_LAYERS)) {
      assert.ok(layer.material.length > 0);
      assert.ok(layer.changes.length > 0);
      assert.ok(layer.transitionToken.length > 0);
    }
  });

  it('keeps normal puzzle beats readable and reserves five-world visibility for authored climax beats', () => {
    for (const beat of FINALE_VISUAL_BEATS) {
      assert.ok(beat.activeRuleWorlds.length <= 3, `${beat.id} exposes too many simultaneous rules`);
      for (const world of beat.activeRuleWorlds) assert.ok(beat.visibleWorlds.includes(world));
    }
    assert.equal(FINALE_VISUAL_BEATS.at(-1).visibleWorlds.length, 5);
    assert.equal(FINALE_VISUAL_BEATS.at(-1).activeRuleWorlds.length, 0);
  });

  it('locks a directed 2.5D camera rather than a free-orbit 3D camera', () => {
    assert.equal(CAMERA_LANGUAGE.freeOrbit, false);
    assert.equal(CAMERA_LANGUAGE.projection, 'painted-orthographic-three-quarter');
    assert.equal(CAMERA_LANGUAGE.follow.updateAfterPlayer, true);
    assert.ok(CAMERA_LANGUAGE.follow.deadzonePx.width > 0);
    assert.ok(CAMERA_LANGUAGE.follow.lookAheadPx > 0);
  });

  it('gives Blender, AE and Phaser unique stable asset names', () => {
    const manifest = getFinaleAssetManifest();
    const all = [
      ...manifest.fusionSpine,
      ...Object.values(manifest.worldLandmarks).flat(),
      ...manifest.finaleHero,
      ...manifest.effects,
    ];
    assert.equal(new Set(all).size, all.length);
    assert.equal(manifest.fusionSpine.length, 8);
    assert.equal(Object.keys(manifest.worldLandmarks).length, 5);
  });
});
