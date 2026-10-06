// Chapter 3 · far-city LOD (open since alpha round 1: "~357k triangles is
// heavy; cull or LOD the far city"; alpha round 4 fix round, engineer P2).
//
// What the measurements showed (headless, 1280×720, eight street views):
//   * the main pass was already small: the street camera is a close
//     orthographic view (~35 × 20 m), and three.js frustum-culls each mesh,
//     so the skyline and backdrop rows never reach the gameplay view;
//   * the waste was the SHADOW pass: the sun's shadow camera spans the whole
//     city (±52 m) and every static model within 43 m of the view went into
//     it — 0.5–0.95 M triangles a frame on HIGH, two to three times the
//     visible scene, most of them from buildings whose shadow can never
//     reach the screen;
//   * a few long or tall models (stalls, arcades) passed the bounding-sphere
//     test with their box well off screen.
//
// So the LOD here is screen based, not distance-from-Butch based (an
// orthographic view has no "far"): each static city model's world box is
// projected with the live camera every simulation step.
//   * DRAWN while any part of it is within the tier's margin of the screen
//     (HIGH SHOW_METRES 6 / HIDE 9, LOW 3 / 5: HIGH keeps more around the
//     edge, LOW less). The margin and its hysteresis lie outside the frame,
//     so nothing pops in view, and a tall building whose roof pokes into
//     the frame keeps its full silhouette (no proxy box ever stands in for
//     a visible model).
//   * CASTING only while its shadow can land in that same margin: the box's
//     corners are projected down the live sun direction onto the ground
//     (the dusk sun is low, so its long shadows keep far casters on).
//   * Otherwise its meshes are hidden (visible = false: no draw, no shadow).
// Visibility is set on the model's meshes, never on its root, so the
// runtime's own root toggles (interiors, the departing train) still win.

import * as THREE from 'three';

export const CITY_LOD_TIERS = Object.freeze({
  high: Object.freeze({ showMetres: 6, hideMetres: 9 }),
  low: Object.freeze({ showMetres: 3, hideMetres: 5 }),
});
// How far along the ground a shadow is followed when the sun is (nearly)
// level: the shadow camera's own reach.
export const MAX_SHADOW_REACH_METRES = 120;

export function lodTierFor(qualityTier) {
  return qualityTier === 'high' ? CITY_LOD_TIERS.high : CITY_LOD_TIERS.low;
}

/** The eight corners of a box given as min / max [x, y, z]. */
export function boxCorners(min, max) {
  const corners = [];
  for (let index = 0; index < 8; index += 1) {
    corners.push([
      index & 1 ? max[0] : min[0],
      index & 2 ? max[1] : min[1],
      index & 4 ? max[2] : min[2],
    ]);
  }
  return corners;
}

/**
 * Screen (NDC) bounds of world points under a view-projection matrix given
 * as 16 column-major numbers (THREE.Matrix4.elements).
 */
export function ndcBounds(points, m) {
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  for (const [x, y, z] of points) {
    const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
    const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    const ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    if (nx < minX) minX = nx;
    if (nx > maxX) maxX = nx;
    if (ny < minY) minY = ny;
    if (ny > maxY) maxY = ny;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Where each corner's shadow falls on the plane y = groundY, for a light
 * shining from `toLight` (a vector toward the light). A light at or below
 * the horizon throws the shadow MAX_SHADOW_REACH_METRES along the ground.
 */
export function groundShadowPoints(corners, toLight, groundY = 0, maxReach = MAX_SHADOW_REACH_METRES) {
  const [lx, ly, lz] = toLight;
  const horizontal = Math.hypot(lx, lz);
  const points = [];
  for (const [x, y, z] of corners) {
    const height = Math.max(0, y - groundY);
    let reach = ly > 1e-3 ? (height * horizontal) / ly : maxReach;
    reach = Math.min(reach, maxReach);
    const ux = horizontal > 1e-6 ? -lx / horizontal : 0;
    const uz = horizontal > 1e-6 ? -lz / horizontal : 0;
    points.push([x + ux * reach, groundY, z + uz * reach]);
  }
  return points;
}

export function overlapsScreen(bounds, marginX = 0, marginY = 0) {
  return bounds.maxX >= -1 - marginX && bounds.minX <= 1 + marginX
    && bounds.maxY >= -1 - marginY && bounds.minY <= 1 + marginY;
}

/**
 * Hysteresis: something shown stays until it is HIDE metres off screen;
 * something hidden comes back at SHOW metres (both outside the frame).
 * `metresToNdc` = [x, y] NDC units per metre of the current view.
 */
export function lodKeep(wasKept, bounds, tier, metresToNdc) {
  const metres = wasKept ? tier.hideMetres : tier.showMetres;
  return overlapsScreen(bounds, metres * metresToNdc[0], metres * metresToNdc[1]);
}

export class Chapter3CityLod {
  constructor() {
    this.entries = [];
    this.enabled = true;
    this.viewProjection = new THREE.Matrix4();
    this.toLight = new THREE.Vector3();
    this.box = new THREE.Box3();
    this.updates = 0;
  }

  // `dynamic`: the runtime moves it (the train, Olek's cart), so its box is
  // re-measured every update.
  register(root, { id = root?.name ?? '', dynamic = false } = {}) {
    if (!root) return null;
    const entry = {
      id, root, dynamic, corners: null, kept: true, casting: true, shadowReach: true,
      hidden: [], uncast: [],
    };
    this.measure(entry);
    this.entries.push(entry);
    return entry;
  }

  measure(entry) {
    entry.root.updateMatrixWorld(true);
    this.box.setFromObject(entry.root);
    entry.corners = this.box.isEmpty() ? null : boxCorners(this.box.min.toArray(), this.box.max.toArray());
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) for (const entry of this.entries) this.apply(entry, true, true);
  }

  update({ camera, light = null, shadowsOn = false, qualityTier = 'high' }) {
    if (!this.enabled || !camera) return;
    this.updates += 1;
    camera.updateMatrixWorld();
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const m = this.viewProjection.elements;
    const zoom = Math.max(0.05, camera.zoom || 1);
    const halfWidth = Math.max(1e-3, (camera.right - camera.left) / 2 / zoom);
    const halfHeight = Math.max(1e-3, (camera.top - camera.bottom) / 2 / zoom);
    const metresToNdc = [1 / halfWidth, 1 / halfHeight];
    const tier = lodTierFor(qualityTier);
    let toLight = null;
    if (shadowsOn && light) {
      this.toLight.copy(light.position).sub(light.target?.position ?? new THREE.Vector3());
      if (this.toLight.lengthSq() > 1e-8) toLight = this.toLight.normalize().toArray();
    }
    for (const entry of this.entries) {
      if (entry.dynamic) this.measure(entry);
      if (!entry.corners) continue;
      const kept = lodKeep(entry.kept, ndcBounds(entry.corners, m), tier, metresToNdc);
      let casting = entry.casting;
      if (toLight) {
        const shadow = [...entry.corners, ...groundShadowPoints(entry.corners, toLight)];
        entry.shadowReach = lodKeep(entry.shadowReach, ndcBounds(shadow, m), tier, metresToNdc);
        casting = entry.shadowReach;
      }
      entry.kept = kept;
      this.apply(entry, kept || (toLight !== null && casting), casting);
    }
  }

  // Only what this LOD switched off is ever switched back on.
  apply(entry, drawn, casting) {
    const isDrawn = entry.hidden.length === 0;
    if (!drawn && isDrawn) {
      entry.root.traverse((object) => {
        if (!object.isMesh || !object.visible) return;
        object.visible = false;
        entry.hidden.push(object);
      });
      if (!entry.hidden.length) entry.hidden.push(null);
    } else if (drawn && !isDrawn) {
      for (const object of entry.hidden) if (object) object.visible = true;
      entry.hidden = [];
    }
    const isCasting = entry.uncast.length === 0;
    if (!casting && isCasting) {
      entry.root.traverse((object) => {
        if (!object.isMesh || !object.castShadow) return;
        object.castShadow = false;
        entry.uncast.push(object);
      });
      if (!entry.uncast.length) entry.uncast.push(null);
    } else if (casting && !isCasting) {
      for (const object of entry.uncast) if (object) object.castShadow = true;
      entry.uncast = [];
    }
    entry.casting = casting;
  }

  snapshot() {
    const drawn = this.entries.filter((entry) => entry.hidden.length === 0);
    return {
      enabled: this.enabled,
      managed: this.entries.length,
      drawn: drawn.length,
      hidden: this.entries.length - drawn.length,
      casting: drawn.filter((entry) => entry.uncast.length === 0).length,
      updates: this.updates,
    };
  }
}
