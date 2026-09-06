import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  CHAPTER3_CHARACTER_ACTIONS,
  CHAPTER3_CHARACTER_ASSETS,
} from '../../src/cars/presentCity3d/Chapter3AnimatedCharacters.js';

const CHARACTER_DIR = new URL('../../public/assets/chapter03-3d/characters/', import.meta.url);
const ANIMATION_DIR = new URL('../../public/assets/chapter03-3d/animations/', import.meta.url);
const EMBEDDED_CLIPS = [
  'A_TPose', 'Fixing_Kneeling', 'Idle_Loop', 'Interact', 'Sitting_Idle_Loop', 'Walk_Loop',
].sort();

function readGlbJson(file, directory = CHARACTER_DIR) {
  const bytes = readFileSync(new URL(file, directory));
  assert.equal(bytes.toString('utf8', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  const jsonLength = bytes.readUInt32LE(12);
  const chunkType = bytes.toString('utf8', 16, 20);
  assert.equal(chunkType, 'JSON');
  return JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength).trim());
}

function triangleCount(json) {
  return (json.meshes || []).reduce((total, mesh) => total + mesh.primitives.reduce((meshTotal, primitive) => {
    assert.ok(primitive.mode == null || primitive.mode === 4, 'character meshes must use triangle primitives');
    const accessorIndex = primitive.indices ?? primitive.attributes.POSITION;
    return meshTotal + json.accessors[accessorIndex].count / 3;
  }, 0), 0);
}

describe('Chapter 3 shared character runtime assets', () => {
  it('ships the seven approved Chapter 3 shared-rig bases with the same skeleton and core clips', () => {
    assert.equal(Object.keys(CHAPTER3_CHARACTER_ASSETS).length, 7);
    for (const [assetId, spec] of Object.entries(CHAPTER3_CHARACTER_ASSETS)) {
      const json = readGlbJson(spec.file);
      assert.equal(triangleCount(json), 30_000, `${assetId} triangle budget`);
      assert.equal(json.skins?.length, 1, `${assetId} skin count`);
      assert.equal(json.skins[0].joints.length, 53, `${assetId} joint count`);
      assert.deepEqual((json.animations || []).map((clip) => clip.name).sort(), EMBEDDED_CLIPS, `${assetId} clips`);
    }
  });

  it('ships a compatible shared library containing every runtime action', () => {
    const json = readGlbJson('quaternius_ual1_standard.glb', ANIMATION_DIR);
    assert.equal(json.skins?.[0]?.joints.length, 53, 'shared animation skeleton joint count');
    const clips = new Set((json.animations || []).map((clip) => clip.name.replace(/_Rig$/, '')));
    for (const clip of Object.values(CHAPTER3_CHARACTER_ACTIONS)) {
      assert.ok(clips.has(clip), `shared library contains ${clip}`);
    }
    assert.ok(clips.size >= 40, 'shared library should materially expand animation coverage');
  });
});
