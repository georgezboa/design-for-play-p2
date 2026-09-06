import * as THREE from 'three';
import {
  COLLAPSE_DOOR_PRESSURE_X,
  COLLAPSE_ENTRY,
  COLLAPSE_SLOT_SECONDS,
  COLLAPSE_STRINGS,
  COLLAPSE_THRESHOLD,
} from '../state/collapseGauntlet.js';

export const COLLAPSE_WARNING_SECONDS = 1.3;
export const COLLAPSE_HOLE_WARNING_SECONDS = 1.55;
export const COLLAPSE_DOOR_WARNING_SECONDS = 1.45;
export const COLLAPSE_FALL_SECONDS = 0.4;
export const COLLAPSE_DEBRIS_LEAD_METERS = 2.8;
export const COLLAPSE_HOLE_LEAD_METERS = 3.4;
export const COLLAPSE_DOOR_REPEAT_SECONDS = 3.15;
const INVULNERABLE_SECONDS = 1;

export const COLLAPSE_HAZARD_SETS = Object.freeze({
  1: ['ceiling-tile', 'fixture'],
  2: ['wall-chunk', 'rail-plate', 'cable-spool', 'insulator'],
  3: ['rail-plate', 'cable-spool', 'city-stone', 'lamp-head', 'paper-slab', 'wall-chunk'],
});

// Every world-space failure is authored here. triggerX controls when it begins;
// x/z control where it lands. No value is derived from the player position.
export const COLLAPSE_SCRIPT = Object.freeze([
  Object.freeze({ id: 'z1-ceiling-a', triggerX: 13.85, kind: 'debris', type: 'ceiling-tile', x: 16.65, z: -0.72, scale: 1.75, radius: 0.56, weight: 'heavy' }),
  Object.freeze({ id: 'z1-fixture-a', triggerX: 15.55, kind: 'debris', type: 'fixture', x: 18.35, z: 0.78, scale: 1.65, radius: 0.46, weight: 'heavy', metallic: true }),
  Object.freeze({ id: 'z1-hole-a', triggerX: 16.75, kind: 'hole', x: 20.15, z: -0.73, radiusX: 0.94, radiusZ: 0.78, warningSeconds: COLLAPSE_HOLE_WARNING_SECONDS, weight: 'heavy' }),
  Object.freeze({ id: 'z2-wall-a', triggerX: 19.4, kind: 'debris', type: 'wall-chunk', x: 22.2, z: 0.72, scale: 2.05, radius: 0.65, weight: 'heavy' }),
  Object.freeze({ id: 'z2-rail-a', triggerX: 21.35, kind: 'debris', type: 'rail-plate', x: 24.15, z: -0.76, scale: 2.2, radius: 0.58, weight: 'heavy', metallic: true }),
  Object.freeze({ id: 'z2-ceiling-a', triggerX: 23.15, kind: 'debris', type: 'ceiling-tile', x: 25.95, z: 0.7, scale: 2.15, radius: 0.68, weight: 'heavy' }),
  Object.freeze({ id: 'z2-hole-a', triggerX: 24.35, kind: 'hole', x: 27.75, z: 0.76, radiusX: 1.02, radiusZ: 0.82, warningSeconds: COLLAPSE_HOLE_WARNING_SECONDS, weight: 'heavy' }),
  Object.freeze({ id: 'z2-grid-a', triggerX: 26.85, kind: 'debris', type: 'cable-spool', x: 29.65, z: -0.7, scale: 2.05, radius: 0.62, weight: 'heavy', metallic: true }),
  Object.freeze({ id: 'z3-city-a', triggerX: 30, kind: 'debris', type: 'city-stone', x: 32.8, z: 0.72, scale: 2.25, radius: 0.72, weight: 'heavy' }),
  Object.freeze({ id: 'z3-paper-a', triggerX: 31.95, kind: 'debris', type: 'paper-slab', x: 34.75, z: -0.74, scale: 2.35, radius: 0.66, weight: 'heavy' }),
  Object.freeze({ id: 'z3-hole-a', triggerX: 33.25, kind: 'hole', x: 36.65, z: -0.74, radiusX: 1.08, radiusZ: 0.86, warningSeconds: COLLAPSE_HOLE_WARNING_SECONDS, weight: 'heavy' }),
  Object.freeze({ id: 'z3-wall-a', triggerX: 35.45, kind: 'debris', type: 'wall-chunk', x: 38.25, z: 0.76, scale: 2.2, radius: 0.7, weight: 'heavy' }),
]);

export const COLLAPSE_DOOR_PATTERN = Object.freeze([
  Object.freeze({ x: 40.55, z: 0.02, type: 'rail-plate', scale: 2.15, radius: 0.62, metallic: true }),
  Object.freeze({ x: 40.05, z: -2.45, type: 'lamp-head', scale: 1.8, radius: 0.52, metallic: true }),
  Object.freeze({ x: 40.12, z: 2.48, type: 'city-stone', scale: 2.05, radius: 0.66 }),
]);

const GALLERY_THRESHOLDS = Object.freeze([
  ['painted-country', 14],
  ['borrowed-grid', 20.5],
  ['echo-city', 28.5],
  ['labyrinth', 36.5],
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hazardMaterial(type) {
  const color = {
    'ceiling-tile': 0xcac5b7,
    fixture: 0xe8dfc8,
    'wall-chunk': 0x77715f,
    'rail-plate': 0xa17a3f,
    'cable-spool': 0x3b9da0,
    insulator: 0xc5bda8,
    'city-stone': 0x656966,
    'lamp-head': 0x59615e,
    'paper-slab': 0xe8dfca,
  }[type] ?? 0x77716a;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: ['rail-plate', 'lamp-head'].includes(type) ? 0.5 : 0.88,
    metalness: ['rail-plate', 'lamp-head'].includes(type) ? 0.58 : 0.04,
    side: THREE.DoubleSide,
  });
}

function makeHazardMesh(type, scale = 1) {
  const material = hazardMaterial(type);
  let mesh;
  if (type === 'cable-spool') {
    mesh = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 8, 18), material);
    mesh.rotation.x = Math.PI / 2;
  } else if (type === 'insulator') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.54, 10), material);
    mesh.rotation.z = Math.PI / 2;
  } else if (type === 'lamp-head') {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 7), material);
    mesh.scale.set(1.35, 0.75, 0.85);
  } else if (type === 'paper-slab') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.62), material);
  } else if (type === 'fixture') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 1.36), material);
  } else if (type === 'ceiling-tile') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.13, 0.84), material);
  } else if (type === 'rail-plate') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.13, 0.46), material);
  } else if (type === 'city-stone') {
    mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), material);
    mesh.scale.set(1.2, 0.72, 0.9);
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 0.56), material);
    mesh.rotation.set(0.18, 0.24, 0.12);
  }
  mesh.scale.multiplyScalar(scale);
  mesh.name = `collapse-hazard-${type}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeDangerMarker(size = 0.65) {
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b20, transparent: true, opacity: 0.96, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.72, size, 3), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.rotation.z = Math.PI / 6;
  ring.position.y = 0.025;
  group.add(ring);
  const outerMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b20, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const outer = new THREE.Mesh(new THREE.RingGeometry(size * 1.05, size * 1.18, 32), outerMaterial);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.021;
  group.add(outer);
  const barMaterial = new THREE.MeshBasicMaterial({ color: 0xffd06a, side: THREE.DoubleSide, depthWrite: false });
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.13, size * 0.58), barMaterial);
  bar.rotation.x = -Math.PI / 2;
  bar.position.set(0, 0.035, -size * 0.06);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(size * 0.085, 16), barMaterial);
  dot.rotation.x = -Math.PI / 2;
  dot.position.set(0, 0.036, size * 0.34);
  group.add(bar, dot);
  group.userData.ring = ring;
  group.userData.outer = outer;
  return group;
}

function makeCracks({ ceiling = false, radius = 0.9 } = {}) {
  const points = [];
  for (let branch = 0; branch < 9; branch += 1) {
    const angle = branch * 2.399;
    const inner = radius * (0.16 + (branch % 3) * 0.04);
    const outer = radius * (0.62 + (branch % 4) * 0.09);
    points.push(
      new THREE.Vector3(Math.cos(angle) * inner, 0, Math.sin(angle) * inner),
      new THREE.Vector3(Math.cos(angle + 0.18) * outer, 0, Math.sin(angle + 0.18) * outer),
    );
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: ceiling ? 0x211a16 : 0xff4a2c, transparent: true, opacity: 0.92, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = ceiling ? 'ceiling-fracture-warning' : 'floor-fracture-warning';
  return lines;
}

function makeCeilingRupture(radius = 0.9) {
  const group = new THREE.Group();
  const voidMesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), new THREE.MeshBasicMaterial({ color: 0x050403, side: THREE.DoubleSide }));
  voidMesh.rotation.x = Math.PI / 2;
  group.add(voidMesh);
  const rim = new THREE.Mesh(new THREE.RingGeometry(radius * 0.82, radius * 1.08, 14), new THREE.MeshStandardMaterial({ color: 0x585044, roughness: 0.98, side: THREE.DoubleSide }));
  rim.rotation.x = Math.PI / 2;
  rim.rotation.z = 0.17;
  group.add(rim);
  return group;
}

function makeFloorHole(radiusX, radiusZ) {
  const group = new THREE.Group();
  const voidMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
  voidMesh.rotation.x = -Math.PI / 2;
  voidMesh.scale.set(radiusX, radiusZ, 1);
  voidMesh.position.y = 0.018;
  group.add(voidMesh);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.12, 18), new THREE.MeshStandardMaterial({ color: 0x40392f, roughness: 0.98, side: THREE.DoubleSide }));
  rim.rotation.x = -Math.PI / 2;
  rim.rotation.z = 0.11;
  rim.scale.set(radiusX, radiusZ, 1);
  rim.position.y = 0.026;
  group.add(rim);
  return group;
}

function makeKeyInsertionRig() {
  const root = new THREE.Group();
  root.name = 'first-person-key-insertion-animation';
  root.visible = false;
  const skin = new THREE.MeshStandardMaterial({ color: 0x8b6956, roughness: 0.92, metalness: 0 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x20262b, roughness: 0.96, metalness: 0.02 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x756a72, emissive: 0x16070a, emissiveIntensity: 0.28, roughness: 0.72, metalness: 0.22 });
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.31, 5, 9), sleeve);
  forearm.position.set(0.13, -0.115, 0.075);
  forearm.rotation.z = -0.74;
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 9), skin);
  hand.scale.set(0.78, 1.0, 0.58);
  hand.position.set(0.02, 0.02, -0.03);
  const wrist = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.1, 4, 8), skin);
  wrist.position.set(0.075, -0.055, 0.005);
  wrist.rotation.z = -0.7;
  const key = new THREE.Group();
  key.name = 'animated-labyrinth-key';
  key.position.set(-0.045, 0.08, -0.15);
  key.rotation.set(-Math.PI / 2, 0, 0.08);
  const head = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.019, 8, 18), stone);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.23, 0.028), stone);
  stem.position.y = -0.14;
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.032, 0.028), stone);
  tooth.position.set(0.025, -0.25, 0);
  key.add(head, stem, tooth);
  for (let index = 0; index < 3; index += 1) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.075, 3, 7), skin);
    finger.position.set(-0.02 + index * 0.038, 0.075, -0.095);
    finger.rotation.x = Math.PI / 2;
    finger.rotation.z = -0.18;
    root.add(finger);
  }
  root.add(forearm, wrist, hand, key);
  root.userData.key = key;
  return root;
}

export class CollapseGauntletDirector {
  constructor({ ctx, root, materials, cases, corridorLights, ceilingFixtures = [], finalDoor }) {
    this.ctx = ctx;
    this.root = root;
    this.materials = materials;
    this.cases = cases;
    this.corridorLights = corridorLights;
    this.ceilingFixtures = ceilingFixtures;
    this.finalDoor = finalDoor;
    this.hazardRoot = new THREE.Group();
    this.hazardRoot.name = 'collapse-authored-world-events';
    root.add(this.hazardRoot);
    this.shardRoot = new THREE.Group();
    root.add(this.shardRoot);
    this.impactFxRoot = new THREE.Group();
    this.impactFxRoot.name = 'collapse-impact-only-fx';
    root.add(this.impactFxRoot);
    this.impactBursts = [];
    this.emergencyLights = this._buildEmergencyLights();
    this.keyInsertionRig = makeKeyInsertionRig();
    this.ctx.camera.add(this.keyInsertionRig);
    this.keyInsertion = {
      active: false,
      age: 0,
      duration: 0.54,
      targetCount: 0,
      committed: false,
      audioFired: false,
    };
    this.active = false;
    this.hazards = [];
    this.firedScriptIds = new Set();
    this.shatterAnimations = [];
    this.sequence = 0;
    this.doorPatternIndex = 0;
    this.doorTimer = 1.25;
    this.invulnerable = 0;
    this.hitDip = 0;
    this.trauma = 0;
    this.lightClock = 0;
    this.slotAccumulator = 0;
    this.slotInterruptedUntilRelease = false;
    this.lastRunId = 1;
    this._lastDoorSlots = -1;
    this._displayedDoorSlots = 0;
    this._storyStarted = false;
    this._blockade = null;
    this._reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  enter(snapshot) {
    if (snapshot.phase === 'collapse') this.start(snapshot);
    this.syncDoor(snapshot.collapse, { immediate: true });
  }

  start(snapshot) {
    this.active = true;
    this.lastRunId = snapshot.collapse.runId;
    this.finalDoor.void.visible = snapshot.collapse.doorOpen;
    this.ctx.renderer.toneMappingExposure = 0.72;
    for (const light of this.corridorLights) {
      if (light.userData.calmIntensity == null) light.userData.calmIntensity = light.intensity;
      if (light.userData.calmColor == null) light.userData.calmColor = light.color?.getHex?.();
    }
    if (!this._blockade) this._buildWestBlockade();
    this._shatterCase('labyrinth');
    this.ctx.audioGuide.startCollapseScore();
    if (!this._storyStarted) {
      this._storyStarted = true;
      this.ctx.audioGuide.sayArchivist(COLLAPSE_STRINGS.archivistCollapse);
      this.ctx.dialogue.play([{ speaker: null, text: COLLAPSE_STRINGS.keyRingCaption }]);
    }
  }

  _buildEmergencyLights() {
    const rects = [14.5, 20.5, 26.5, 32.5, 37.2, 40.4].map((x) => {
      const light = new THREE.RectAreaLight(0xff1c0d, 0, x >= 38.5 ? 3.2 : 4.8, x >= 38.5 ? 7.6 : 3.7);
      light.position.set(x, 3.02, 0);
      light.rotation.x = -Math.PI / 2;
      this.root.add(light);
      return light;
    });
    const points = [16, 24, 32, 39.8].map((x) => {
      const light = new THREE.PointLight(0xff210f, 0, x > 38 ? 9.2 : 7.6, 1.65);
      light.position.set(x, 2.35, 0);
      this.root.add(light);
      return light;
    });
    const roomWash = new THREE.HemisphereLight(0xff210f, 0x110000, 0);
    const ambientWash = new THREE.AmbientLight(0xff160c, 0);
    // A transparent red volume guarantees that alarm state reads across the
    // full room even on GPUs where broad area-light contribution is subdued.
    // Point/area lights still provide the animated physical pulse.
    const veilMaterial = new THREE.MeshBasicMaterial({
      color: 0xff1209,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(80, 18), veilMaterial);
    veil.position.set(27, 2.5, -3.2);
    veil.renderOrder = 90;
    this.root.add(roomWash, ambientWash, veil);
    return { rects, points, roomWash, ambientWash, veil };
  }

  _buildWestBlockade() {
    const group = new THREE.Group();
    group.position.set(12.25, 0, 0);
    this.root.add(group);
    const slabMaterial = new THREE.MeshStandardMaterial({ color: 0x686052, roughness: 0.93 });
    for (const [x, y, z, sx, sy, sz, rz] of [
      [0, 0.45, -0.92, 0.72, 0.9, 1.45, 0.18],
      [-0.12, 0.55, 0.62, 0.82, 1.1, 1.3, -0.22],
      [0.12, 1.28, 0.02, 0.55, 1.25, 2.8, 0.1],
    ]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), slabMaterial);
      slab.position.set(x, y, z);
      slab.rotation.z = rz;
      slab.castShadow = true;
      group.add(slab);
    }
    this.ctx.collisionWorld.addBoxFromCenterSize(12.25, 0, 0.78, 3.45, 'collapse-west-blockade');
    this._blockade = group;
  }

  _zoneForX(x) {
    if (x >= 32) return 3;
    if (x >= 20) return 2;
    return 1;
  }

  _queueEvent(spec, id = spec.id) {
    if (this.firedScriptIds.has(id)) return;
    this.firedScriptIds.add(id);
    const warningSeconds = spec.warningSeconds ?? COLLAPSE_WARNING_SECONDS;
    const markerSize = (spec.kind === 'hole'
      ? Math.max(spec.radiusX, spec.radiusZ)
      : Math.max(0.76, spec.radius ?? 0.6)) * 1.12;
    const marker = makeDangerMarker(markerSize);
    marker.position.set(spec.x, 0, spec.z);
    this.hazardRoot.add(marker);
    const cracks = makeCracks({ ceiling: spec.kind !== 'hole', radius: markerSize * 1.25 });
    cracks.position.set(spec.x, spec.kind === 'hole' ? 0.036 : 3.175, spec.z);
    this.hazardRoot.add(cracks);
    let mesh;
    if (spec.kind === 'hole') {
      mesh = makeFloorHole(spec.radiusX, spec.radiusZ);
      mesh.position.set(spec.x, 0, spec.z);
    } else {
      mesh = makeHazardMesh(spec.type, spec.scale ?? 1);
      mesh.position.set(spec.x, 4.15, spec.z);
    }
    mesh.visible = false;
    this.hazardRoot.add(mesh);
    const hazard = {
      ...spec,
      id: `collapse-${this.lastRunId}-${id}`,
      scriptId: id,
      warningSeconds,
      age: 0,
      phase: 'warning',
      marker,
      cracks,
      mesh,
      rupture: null,
      hitConsumed: false,
    };
    this.hazards.push(hazard);
    this.ctx.audioGuide.collapseTelegraph({ kind: spec.kind, weight: spec.weight });
  }

  _openHole(hazard, player) {
    hazard.phase = 'open';
    hazard.marker.visible = false;
    hazard.cracks.material.color.setHex(0x2a211b);
    hazard.mesh.visible = true;
    this.ctx.audioGuide.collapseHoleOpen();
    this.trauma = this._reducedMotion ? 0 : Math.max(this.trauma, 0.82);
    this._testHole(hazard, player);
  }

  _impact(hazard, player) {
    hazard.phase = 'settled';
    hazard.mesh.position.y = hazard.type === 'city-stone' || hazard.type === 'wall-chunk' ? 0.26 : 0.14;
    hazard.mesh.rotation.x += 0.34;
    hazard.mesh.rotation.z += 0.22;
    hazard.marker.visible = false;
    hazard.cracks.material.opacity = 0.78;
    hazard.rupture = makeCeilingRupture(Math.max(0.66, (hazard.radius ?? 0.55) * 1.18));
    hazard.rupture.position.set(hazard.x, 3.18, hazard.z);
    this.hazardRoot.add(hazard.rupture);
    this._spawnImpactBurst(hazard);
    this.ctx.audioGuide.collapseImpact({ metallic: hazard.metallic === true, weight: hazard.weight });
    this.trauma = this._reducedMotion ? 0 : Math.max(this.trauma, hazard.weight === 'heavy' ? 0.78 : 0.45);
    this.ctx.collisionWorld.addCircle(hazard.x, hazard.z, hazard.radius ?? 0.45, hazard.id, { minY: 0, maxY: 0.82 });
    const distance = Math.hypot(player.x - hazard.x, player.z - hazard.z);
    if (distance <= (hazard.radius ?? 0.55) + 0.38 && this.invulnerable <= 0) this._takeHit();
  }

  _testHole(hole, player) {
    if (hole.phase !== 'open' || hole.hitConsumed || this.invulnerable > 0) return;
    const dx = (player.x - hole.x) / (hole.radiusX * 0.86);
    const dz = (player.z - hole.z) / (hole.radiusZ * 0.86);
    if (dx * dx + dz * dz > 1) return;
    hole.hitConsumed = true;
    const died = this._takeHit();
    if (!died) {
      const safeZ = hole.z > 0 ? -1.12 : 1.12;
      this.ctx.controller.setPose(Math.max(COLLAPSE_ENTRY.x, hole.x - 1.15), safeZ, this.ctx.controller.getYaw());
    }
  }

  _takeHit() {
    this.invulnerable = INVULNERABLE_SECONDS;
    this.hitDip = this._reducedMotion ? 0 : 0.34;
    this.slotAccumulator = 0;
    this.slotInterruptedUntilRelease = true;
    const result = this.ctx.model.dispatch({ type: 'collapseHit' });
    const died = result.events.some((event) => event.type === 'collapse.playerDied');
    if (died) this._respawnAfterDeath();
    return died;
  }

  _respawnAfterDeath() {
    this._resetLooseDebris();
    const state = this.ctx.model.getSnapshot().collapse;
    this.lastRunId = state.runId;
    this.ctx.controller.setPose(COLLAPSE_ENTRY.x, COLLAPSE_ENTRY.z, COLLAPSE_ENTRY.yaw);
    this.ctx.dialogue.play([{ speaker: null, text: COLLAPSE_STRINGS.deathLine }]);
  }

  _resetLooseDebris() {
    for (const hazard of this.hazards) {
      this.ctx.collisionWorld.removeById(hazard.id);
      hazard.marker.removeFromParent();
      hazard.cracks.removeFromParent();
      hazard.mesh.removeFromParent();
      hazard.rupture?.removeFromParent();
    }
    this.hazards.length = 0;
    this.firedScriptIds.clear();
    this.sequence = 0;
    this.doorPatternIndex = 0;
    this.doorTimer = 1.4;
    for (const burst of [...this.impactBursts]) this._disposeImpactBurst(burst);
  }

  _shatterCase(id) {
    const record = this.cases.get(id);
    if (!record || record.shattered) return;
    record.shattered = true;
    record.glass.visible = false;
    record.light.intensity = 0;
    if (record.supportingElements) record.supportingElements.visible = false;
    record.artifact.userData.collapseStartPosition = record.artifact.position.clone();
    record.artifact.userData.collapseStartRotation = record.artifact.rotation.clone();
    this.shatterAnimations.push({ record, age: 0 });
    const world = new THREE.Vector3();
    record.group.getWorldPosition(world);
    for (let i = 0; i < 12; i += 1) {
      const shard = new THREE.Mesh(
        new THREE.BoxGeometry(0.12 + (i % 3) * 0.045, 0.22 + (i % 2) * 0.08, 0.012),
        new THREE.MeshPhysicalMaterial({ color: 0xbcd6d4, transparent: true, opacity: 0.48, roughness: 0.12, depthWrite: false }),
      );
      shard.position.set(world.x + ((i % 4) - 1.5) * 0.17, 1.55 + (i % 3) * 0.14, world.z - 0.16);
      shard.rotation.set(i * 0.21, i * 0.33, i * 0.18);
      shard.userData.velocity = new THREE.Vector3(((i % 4) - 1.5) * 0.22, 0.7 + (i % 3) * 0.14, (i % 2 ? 1 : -1) * 0.18);
      this.shardRoot.add(shard);
    }
    this.ctx.audioGuide.collapseImpact({ weight: 'medium' });
  }

  _updateShatter(dt) {
    for (const animation of this.shatterAnimations) {
      animation.age = Math.min(1, animation.age + dt * 1.6);
      const t = animation.age;
      const { artifact } = animation.record;
      const start = artifact.userData.collapseStartPosition;
      artifact.position.set(start.x + t * 0.12, start.y - t * 0.48, start.z + t * 0.08);
      artifact.rotation.x = artifact.userData.collapseStartRotation.x + t * 1.1;
      artifact.rotation.z = artifact.userData.collapseStartRotation.z + t * 0.7;
    }
    for (const shard of this.shardRoot.children) {
      const velocity = shard.userData.velocity;
      if (!velocity || shard.position.y <= 0.08) continue;
      velocity.y -= 4.8 * dt;
      shard.position.addScaledVector(velocity, dt);
      shard.rotation.x += dt * 2.4;
      shard.rotation.z += dt * 1.8;
      if (shard.position.y < 0.08) shard.position.y = 0.08;
    }
  }

  _spawnImpactBurst(hazard) {
    const group = new THREE.Group();
    group.name = 'collapse-impact-dust-burst';
    group.position.set(hazard.x, 0.06, hazard.z);

    const heavy = hazard.weight === 'heavy';
    const plumeGeometry = new THREE.CircleGeometry(0.2, 3);
    const plumeMaterial = new THREE.MeshBasicMaterial({
      color: hazard.metallic ? 0x69645e : 0x665547,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const chipGeometry = new THREE.DodecahedronGeometry(0.036, 0);
    const chipMaterial = new THREE.MeshStandardMaterial({
      color: hazard.metallic ? 0xb18b55 : 0x695d4d,
      roughness: 0.9,
      metalness: hazard.metallic ? 0.42 : 0.03,
      transparent: true,
      opacity: 0.92,
    });
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x6f5946,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.68, 32), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(Math.max(0.7, hazard.radius ?? 0.55));
    group.add(ring);

    const plumes = [];
    const plumeCount = heavy ? 14 : 9;
    for (let index = 0; index < plumeCount; index += 1) {
      const angle = index * 2.399 + (hazard.x + hazard.z) * 0.17;
      const speed = 0.72 + (index % 5) * 0.16;
      const plume = new THREE.Mesh(plumeGeometry, plumeMaterial);
      const radial = 0.08 + (index % 4) * 0.035;
      plume.position.set(Math.cos(angle) * radial, 0.05 + (index % 3) * 0.025, Math.sin(angle) * radial);
      plume.rotation.x = -Math.PI / 2;
      plume.rotation.z = -angle + Math.PI / 2;
      plume.scale.set(0.48 + (index % 3) * 0.1, 1.25 + (index % 2) * 0.22, 1);
      plume.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        0.025 + (index % 3) * 0.015,
        Math.sin(angle) * speed,
      );
      plume.userData.baseScale = plume.scale.clone();
      group.add(plume);
      plumes.push(plume);
    }

    const chips = [];
    const chipCount = heavy ? 10 : 6;
    for (let index = 0; index < chipCount; index += 1) {
      const angle = index * 2.17 + hazard.x * 0.31;
      const speed = 0.75 + (index % 4) * 0.22;
      const chip = new THREE.Mesh(chipGeometry, chipMaterial);
      chip.position.set(0, 0.08, 0);
      chip.scale.setScalar(0.7 + (index % 3) * 0.25);
      chip.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        0.75 + (index % 5) * 0.16,
        Math.sin(angle) * speed,
      );
      group.add(chip);
      chips.push(chip);
    }

    this.impactFxRoot.add(group);
    this.impactBursts.push({
      group,
      ring,
      plumes,
      chips,
      plumeGeometry,
      plumeMaterial,
      chipGeometry,
      chipMaterial,
      ringGeometry: ring.geometry,
      ringMaterial,
      age: 0,
      life: heavy ? 0.88 : 0.68,
    });
  }

  _disposeImpactBurst(burst) {
    burst.group.removeFromParent();
    burst.plumeGeometry.dispose();
    burst.plumeMaterial.dispose();
    burst.chipGeometry.dispose();
    burst.chipMaterial.dispose();
    burst.ringGeometry.dispose();
    burst.ringMaterial.dispose();
    const index = this.impactBursts.indexOf(burst);
    if (index >= 0) this.impactBursts.splice(index, 1);
  }

  _updateImpactBursts(dt) {
    for (const burst of [...this.impactBursts]) {
      burst.age += dt;
      const t = clamp(burst.age / burst.life, 0, 1);
      const spread = 1 - Math.pow(1 - t, 3);
      burst.ring.scale.setScalar(0.62 + spread * 2.25);
      burst.ringMaterial.opacity = 0.34 * Math.pow(1 - t, 2);
      burst.plumeMaterial.opacity = 0.34 * Math.pow(1 - t, 1.45);
      burst.chipMaterial.opacity = 0.92 * (1 - clamp((t - 0.48) / 0.52, 0, 1));

      for (const plume of burst.plumes) {
        const velocity = plume.userData.velocity;
        plume.position.addScaledVector(velocity, dt);
        const drag = Math.exp(-3.1 * dt);
        velocity.x *= drag;
        velocity.z *= drag;
        velocity.y *= Math.exp(-1.8 * dt);
        const base = plume.userData.baseScale;
        plume.scale.set(base.x * (1 + spread * 1.25), base.y * (1 + spread * 1.9), base.z);
      }

      for (const chip of burst.chips) {
        const velocity = chip.userData.velocity;
        velocity.y -= 4.9 * dt;
        chip.position.addScaledVector(velocity, dt);
        chip.rotation.x += dt * 8.2;
        chip.rotation.z += dt * 6.4;
        if (chip.position.y < 0.025) {
          chip.position.y = 0.025;
          velocity.y = 0;
          velocity.x *= 0.7;
          velocity.z *= 0.7;
        }
      }

      if (burst.age >= burst.life) this._disposeImpactBurst(burst);
    }
  }

  _updateLighting(dt, playerX, zone) {
    this.lightClock += dt;
    const flashWave = 0.5 + 0.5 * Math.sin(this.lightClock * 5.45 - 0.4);
    const hardFlash = this._reducedMotion ? 0.46 : Math.pow(flashWave, 2.2);
    const pressure = 0.72 + zone * 0.16;
    // The alarm is a room state, not a handful of red bulbs. Keep enough
    // neutral exposure to read the architecture, then let the red wash own the
    // flash so the whole corridor visibly pulses on ordinary displays.
    this.ctx.renderer.toneMappingExposure = 0.58 + hardFlash * 0.12;
    for (const light of this.corridorLights) {
      const calm = light.userData.calmIntensity ?? light.intensity;
      const x = light.userData.corridorX ?? light.position.x ?? 20;
      const electricalFlutter = Math.sin(this.lightClock * (18.5 + x * 0.09)) > 0.82 ? 0.15 : 1;
      if (light.isRectAreaLight || light.isPointLight) {
        light.intensity = calm * (0.018 + hardFlash * 0.11) * electricalFlutter;
        light.color.setHex(hardFlash > 0.32 ? 0xff3a19 : 0x7d160f);
      } else if (light.isHemisphereLight) {
        light.intensity = calm * (0.06 + hardFlash * 0.12);
        light.color.setHex(0x6b120c);
        light.groundColor?.setHex?.(0x080101);
      } else if (light.isAmbientLight) {
        light.intensity = calm * (0.045 + hardFlash * 0.09);
        light.color.setHex(0x5c0b08);
      }
    }
    this.ceilingFixtures.forEach((fixture) => {
      const localFlicker = Math.sin(this.lightClock * 23 + fixture.x * 0.7) > 0.78;
      fixture.tube.visible = hardFlash > 0.1 || localFlicker;
      fixture.tube.material.color?.setHex?.(hardFlash > 0.24 ? 0xff2412 : 0x3a0906);
    });
    this.emergencyLights.rects.forEach((light, index) => {
      const rollingFlash = Math.max(hardFlash, Math.pow(Math.max(0, Math.sin(this.lightClock * 4.9 - index * 0.52)), 9) * 0.78);
      light.intensity = (0.16 + rollingFlash * 5.2) * pressure;
    });
    this.emergencyLights.points.forEach((light, index) => {
      const beat = Math.pow(Math.max(0, Math.sin(this.lightClock * 5.45 - index * 0.18)), 6);
      light.intensity = (0.18 + Math.max(hardFlash, beat) * 6.4) * pressure;
    });
    this.emergencyLights.roomWash.intensity = 0.22 + hardFlash * 1.18;
    this.emergencyLights.ambientWash.intensity = 0.16 + hardFlash * 1.42;
    this.emergencyLights.veil.material.opacity = 0.055 + hardFlash * 0.18;
  }

  _updateCameraFeedback(dt) {
    if (this._reducedMotion) return;
    this.trauma = Math.max(0, this.trauma - dt * 1.35);
    const shake = this.trauma * this.trauma;
    const t = this.lightClock * 24;
    this.ctx.camera.position.x += Math.sin(t * 1.17) * 0.045 * shake;
    this.ctx.camera.position.y += Math.sin(t * 1.73) * 0.035 * shake;
    if (this.hitDip > 0) this.ctx.camera.position.y -= Math.sin((this.hitDip / 0.34) * Math.PI) * 0.18;
  }

  _applyDoorKeyVisuals(collapse) {
    if (!collapse) return;
    this._lastDoorSlots = collapse.keysSlotted;
    this.finalDoor.keySlots.forEach((slot, index) => {
      const filled = index < this._displayedDoorSlots;
      slot.key.visible = filled;
      slot.glow.visible = !filled;
      slot.key.rotation.x = filled ? Math.PI / 2 : 0;
    });
    this.finalDoor.lockedPlaque.visible = !collapse.doorOpen;
    this.finalDoor.openPlaque.visible = collapse.doorOpen;
    this.finalDoor.void.visible = collapse.doorOpen;
    if (collapse.doorOpen) this.ctx.collisionWorld.removeById('final-archive-door-closed');
  }

  syncDoor(collapse, { immediate = false } = {}) {
    if (!collapse) return;
    if (immediate || !this.keyInsertion.active) this._displayedDoorSlots = collapse.keysSlotted;
    this._applyDoorKeyVisuals(collapse);
  }

  _startKeyInsertion(keysSlotted) {
    const animation = this.keyInsertion;
    animation.active = true;
    animation.age = 0;
    animation.targetCount = keysSlotted;
    animation.committed = false;
    animation.audioFired = false;
    this.keyInsertionRig.visible = true;
  }

  _updateKeyInsertion(dt) {
    const animation = this.keyInsertion;
    if (!animation.active) return;
    animation.age += dt;
    const t = clamp(animation.age / animation.duration, 0, 1);
    const slotIndex = Math.max(0, animation.targetCount - 1);
    const column = Math.floor(slotIndex / 4);
    const row = slotIndex % 4;
    const reachT = clamp(t / 0.56, 0, 1);
    const reach = 1 - Math.pow(1 - reachT, 3);
    const recoilT = clamp((t - 0.76) / 0.24, 0, 1);
    const recoil = recoilT * recoilT;
    const travel = reach * (1 - recoil);
    const baseX = 0.42;
    const baseY = -0.38;
    this.keyInsertionRig.position.set(
      THREE.MathUtils.lerp(baseX, 0.08 + column * 0.13, travel),
      THREE.MathUtils.lerp(baseY, -0.22 + row * 0.10, travel),
      THREE.MathUtils.lerp(-0.72, -1.12, travel),
    );
    this.keyInsertionRig.rotation.set(-0.12 + travel * 0.18, 0.12 - travel * 0.18, -0.08 - travel * 0.62);
    const alignKey = clamp((t - 0.28) / 0.4, 0, 1);
    this.keyInsertionRig.userData.key.rotation.y = THREE.MathUtils.lerp(0.58, 0, alignKey);
    if (!animation.audioFired && t >= 0.55) {
      animation.audioFired = true;
      this.ctx.audioGuide.archiveKeyTurn(animation.targetCount);
    }
    if (!animation.committed && t >= 0.68) {
      animation.committed = true;
      this._displayedDoorSlots = animation.targetCount;
      this._applyDoorKeyVisuals(this.ctx.model.getSnapshot().collapse);
      this.trauma = this._reducedMotion ? 0 : Math.max(this.trauma, 0.16);
    }
    if (t >= 1) {
      animation.active = false;
      this.keyInsertionRig.visible = false;
      this.keyInsertionRig.position.set(0, 0, 0);
      this.keyInsertionRig.rotation.set(0, 0, 0);
    }
  }

  _updateDoor(dt, collapse) {
    const finalKeyStillMoving = this.keyInsertion.active && !this.keyInsertion.committed;
    const target = collapse.doorOpen && !finalKeyStillMoving ? 1 : 0;
    this.finalDoor.openAmount = THREE.MathUtils.damp(this.finalDoor.openAmount, target, 3.4, dt);
    this.finalDoor.leftPivot.rotation.y = this.finalDoor.openAmount * Math.PI * 0.49;
    this.finalDoor.rightPivot.rotation.y = -this.finalDoor.openAmount * Math.PI * 0.49;
    this.finalDoor.keyRoot.visible = !collapse.doorOpen || finalKeyStillMoving;
  }

  _updateSlotting(dt, collapse) {
    const held = this.ctx.isInteractHeld();
    if (!held) this.slotInterruptedUntilRelease = false;
    const focusedDoor = this.ctx.interaction.focused?.id === 'final-archive-door';
    const canSlot = held && focusedDoor && !this.slotInterruptedUntilRelease && !collapse.doorOpen;
    if (!canSlot) {
      this.slotAccumulator = 0;
      return;
    }
    this.slotAccumulator += dt;
    if (this.slotAccumulator < COLLAPSE_SLOT_SECONDS) return;
    this.slotAccumulator -= COLLAPSE_SLOT_SECONDS;
    const result = this.ctx.model.dispatch({ type: 'collapseSlotKey' });
    const keyEvent = result.events.find((event) => event.type === 'collapse.keySlotted');
    if (keyEvent) this._startKeyInsertion(keyEvent.payload.keysSlotted);
  }

  _updateAuthoredEvents(player, dt) {
    for (const spec of COLLAPSE_SCRIPT) {
      if (player.x >= spec.triggerX) this._queueEvent(spec);
    }
    if (player.x >= COLLAPSE_DOOR_PRESSURE_X) {
      this.doorTimer -= dt;
      if (this.doorTimer <= 0) {
        const spec = COLLAPSE_DOOR_PATTERN[this.doorPatternIndex % COLLAPSE_DOOR_PATTERN.length];
        const id = `door-${this.sequence}`;
        this._queueEvent({ ...spec, kind: 'debris', id, weight: 'heavy', warningSeconds: COLLAPSE_DOOR_WARNING_SECONDS }, id);
        this.sequence += 1;
        this.doorPatternIndex += 1;
        this.doorTimer = COLLAPSE_DOOR_REPEAT_SECONDS;
      }
    }
  }

  update(dt, snapshot) {
    if (!this.active || snapshot.phase !== 'collapse') return;
    if (!this.ctx.controller.enabled) {
      this._updateDoor(dt, snapshot.collapse);
      return;
    }
    const player = this.ctx.controller.position;
    const collapse = snapshot.collapse;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.hitDip = Math.max(0, this.hitDip - dt);
    const zone = this._zoneForX(player.x);
    if (zone > collapse.zoneReached) this.ctx.model.dispatch({ type: 'collapseReachZone', zone });
    this.ctx.audioGuide.setCollapseIntensity(zone, player.x >= COLLAPSE_DOOR_PRESSURE_X);
    this._updateLighting(dt, player.x, zone);
    for (const [id, threshold] of GALLERY_THRESHOLDS) {
      if (player.x >= threshold) this._shatterCase(id);
    }
    if (!collapse.doorOpen && !this.qaHazardsDisabled) this._updateAuthoredEvents(player, dt);

    for (const hazard of this.hazards) {
      if (hazard.phase === 'settled') continue;
      if (hazard.phase === 'open') {
        this._testHole(hazard, player);
        continue;
      }
      hazard.age += dt;
      if (hazard.phase === 'warning') {
        const t = clamp(hazard.age / hazard.warningSeconds, 0, 1);
        hazard.marker.scale.setScalar(0.82 + t * 0.18);
        hazard.marker.userData.ring.material.opacity = 0.62 + Math.sin(t * Math.PI * 7) * 0.32;
        hazard.marker.userData.outer.scale.setScalar(0.88 + t * 0.38);
        hazard.marker.userData.outer.material.opacity = 0.18 + Math.sin(t * Math.PI * 5) * 0.1 + t * 0.16;
        hazard.cracks.scale.setScalar(0.2 + t * 0.8);
        if (hazard.age >= hazard.warningSeconds) {
          hazard.age = 0;
          if (hazard.kind === 'hole') this._openHole(hazard, player);
          else {
            hazard.phase = 'falling';
            hazard.mesh.visible = true;
          }
        }
      } else if (hazard.phase === 'falling') {
        const t = clamp(hazard.age / COLLAPSE_FALL_SECONDS, 0, 1);
        hazard.mesh.position.y = THREE.MathUtils.lerp(4.15, 0.16, t * t);
        hazard.mesh.rotation.y += dt * 3.4;
        if (t >= 1) this._impact(hazard, player);
      }
    }

    this._updateShatter(dt);
    this._updateImpactBursts(dt);
    this._updateSlotting(dt, collapse);
    this._updateKeyInsertion(dt);
    this._updateDoor(dt, this.ctx.model.getSnapshot().collapse);
    this._updateCameraFeedback(dt);
    const liveCollapse = this.ctx.model.getSnapshot().collapse;
    if (liveCollapse.doorOpen
      && this.finalDoor.openAmount >= COLLAPSE_THRESHOLD.doorOpenAmount
      && player.x >= COLLAPSE_THRESHOLD.x
      && Math.abs(player.z) <= COLLAPSE_THRESHOLD.halfWidth) {
      this.ctx.completeCollapse();
    }
  }

  getSnapshot() {
    return {
      active: this.active,
      authoredFixedPositions: true,
      warningSeconds: COLLAPSE_WARNING_SECONDS,
      holeWarningSeconds: COLLAPSE_HOLE_WARNING_SECONDS,
      invulnerableSeconds: Number(this.invulnerable.toFixed(2)),
      activeHazards: this.hazards.filter((hazard) => !['settled', 'open'].includes(hazard.phase)).map((hazard) => ({
        id: hazard.scriptId,
        kind: hazard.kind,
        type: hazard.type ?? 'floor-hole',
        phase: hazard.phase,
        x: hazard.x,
        z: hazard.z,
      })),
      openHoles: this.hazards.filter((hazard) => hazard.phase === 'open').map((hazard) => ({ id: hazard.scriptId, x: hazard.x, z: hazard.z, radiusX: hazard.radiusX, radiusZ: hazard.radiusZ })),
      settledDebris: this.hazards.filter((hazard) => hazard.phase === 'settled').length,
      ambientDust: false,
      impactBursts: this.impactBursts.length,
      ceilingRuptures: this.hazards.filter((hazard) => hazard.rupture).length,
      shatteredVitrines: [...this.cases.entries()].filter(([, record]) => record.shattered).map(([id]) => id),
      slotProgressSeconds: Number(this.slotAccumulator.toFixed(2)),
      keyInsertion: {
        active: this.keyInsertion.active,
        displayedSlots: this._displayedDoorSlots,
        targetSlots: this.keyInsertion.targetCount,
      },
      musicIntensity: this.ctx.audioGuide._collapseIntensity,
    };
  }
}
