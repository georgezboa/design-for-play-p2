import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_ROOT = '/museum3d/models';
const loader = new GLTFLoader();
const sourceCache = new Map();

const MODEL_URLS = Object.freeze({
  telephone: `${MODEL_ROOT}/ch05_corded_desk_telephone.glb`,
  archiveCart: `${MODEL_ROOT}/ch05_automatic_archive_cart.glb`,
});

function loadSource(id) {
  if (!MODEL_URLS[id]) return Promise.reject(new Error(`Unknown museum model: ${id}`));
  if (!sourceCache.has(id)) {
    sourceCache.set(id, loader.loadAsync(MODEL_URLS[id]).then((gltf) => gltf.scene));
  }
  return sourceCache.get(id);
}

// Normalize a generated model without assuming its authoring origin. The
// wrapper is centered on X/Z and rests on Y=0, so scene code can place it in
// meters exactly like the procedural fallbacks.
export function fitObjectToDimensions(object, target) {
  object.updateMatrixWorld(true);
  const sourceBox = new THREE.Box3().setFromObject(object);
  const size = sourceBox.getSize(new THREE.Vector3());
  const scale = Math.min(
    target.x / Math.max(size.x, 0.0001),
    target.y / Math.max(size.y, 0.0001),
    target.z / Math.max(size.z, 0.0001),
  );
  object.scale.multiplyScalar(scale);
  object.updateMatrixWorld(true);

  const fittedBox = new THREE.Box3().setFromObject(object);
  const center = fittedBox.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= fittedBox.min.y;
  object.updateMatrixWorld(true);
  return object;
}

export async function loadMuseumModel(id, {
  target,
  tint = null,
} = {}) {
  const source = await loadSource(id);
  const clone = source.clone(true);
  clone.name = `runtime-${id}`;
  clone.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = true;
    if (tint && child.material) {
      child.material = child.material.clone();
      child.material.color.multiply(new THREE.Color(tint));
      child.material.roughness = Math.max(child.material.roughness ?? 0.6, 0.62);
    }
  });
  if (target) fitObjectToDimensions(clone, target);
  return clone;
}

export const MUSEUM_MODEL_URLS = MODEL_URLS;
