import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fitObjectToDimensions, MUSEUM_MODEL_URLS } from '../../src/chapters/museum3d/assets/MuseumModelLoader.js';

test('fitObjectToDimensions keeps a model proportional, centered, and on the floor', () => {
  const object = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 1), new THREE.MeshBasicMaterial());
  mesh.position.set(8, 5, -3);
  object.add(mesh);

  fitObjectToDimensions(object, { x: 1, y: 1, z: 1 });
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  assert.ok(Math.abs(size.x - 0.5) < 0.0001);
  assert.ok(Math.abs(size.y - 1) < 0.0001);
  assert.ok(Math.abs(size.z - 0.25) < 0.0001);
  assert.ok(Math.abs(center.x) < 0.0001);
  assert.ok(Math.abs(center.z) < 0.0001);
  assert.ok(Math.abs(box.min.y) < 0.0001);
});

test('runtime museum models use stable public URLs', () => {
  assert.equal(MUSEUM_MODEL_URLS.telephone, '/museum3d/models/ch05_corded_desk_telephone.glb');
  assert.equal(MUSEUM_MODEL_URLS.archiveCart, '/museum3d/models/ch05_automatic_archive_cart.glb');
});
