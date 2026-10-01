// Round 3: every case gets a warm picture light, as a museum would hang one.
//
//   · addPictureLight: the fixture itself (a brass hood on two arms with a
//     glowing strip under it), on every tier;
//   · addLightPool: the warm pool it throws on the walnut back, as one
//     additive textured quad. LOW only: on the software renderer each real
//     point light is paid by every pixel of the corridor, so the low tier
//     draws the pool instead of lighting it;
//   · highOnly(light): the real light the pool stands in for.
// QualityTier.applySceneQuality reads `userData.tierVisibility`.

import * as THREE from 'three';
import { museumLightPoolTexture } from './MuseumMaterials.js';

export function highOnly(light) {
  light.userData.tierVisibility = 'high';
  return light;
}

// A picture light over a case whose face looks toward −z (local), centred
// on x with its arms reaching back to `wallZ`.
export function addPictureLight(parent, materials, { x = 0, y = 2.25, z = -0.2, wallZ = 0, width = 1.1, name = 'picture-light' } = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  parent.add(group);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, width, 12), materials.brassTrim);
  hood.rotation.z = Math.PI / 2;
  hood.name = `${name}-hood`;
  group.add(hood);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, 0.012, 0.03), materials.lampGlow);
  strip.position.set(0, -0.03, -0.012);
  strip.name = `${name}-strip`;
  group.add(strip);
  const reach = Math.abs(wallZ - z);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, reach + 0.02), materials.brassTrim);
    arm.position.set(side * (width / 2 - 0.08), 0.03, Math.sign(wallZ - z) * (reach / 2));
    group.add(arm);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 10), materials.brassTrim);
    rose.rotation.x = Math.PI / 2;
    rose.position.set(side * (width / 2 - 0.08), 0.03, Math.sign(wallZ - z) * reach);
    group.add(rose);
  }
  return group;
}

// The pool, a quad facing −z (local) laid just in front of the case back.
export function addLightPool(parent, { x = 0, y = 1.4, z = 0, w = 1.8, h = 1.2, opacity = 0.55, rotationY = Math.PI, name = 'case-light-pool' } = {}) {
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: museumLightPoolTexture(),
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  pool.name = name;
  pool.position.set(x, y, z);
  pool.rotation.y = rotationY;
  pool.visible = false;
  pool.renderOrder = 1;
  pool.userData.tierVisibility = 'low';
  parent.add(pool);
  return pool;
}
