import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const CHARACTER_URLS = Object.freeze({
  lev: '/museum3d/echo-city/characters/lev-scholar.glb',
  pavel: '/museum3d/echo-city/characters/lev-confrontation/pavel-posed.glb',
  recoveryA: '/museum3d/echo-city/characters/lev-confrontation/recovery-a-posed.glb',
  recoveryB: '/museum3d/echo-city/characters/lev-confrontation/recovery-b-posed.glb',
  recoveryC: '/museum3d/echo-city/characters/lev-confrontation/recovery-c-posed.glb',
});

const PISTOL_URL = '/museum3d/echo-city/characters/lev-confrontation/service-pistol.glb';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
let pistolTemplate = null;

export const CHAPTER5_MOTION_PROFILES = Object.freeze({
  lev: Object.freeze({ idles: ['Idle_Loop', 'Idle_FoldArms_Loop', 'Idle_Rail_Loop'], walks: ['Walk_Formal_Loop', 'Walk_Loop'], walkSpeed: 1.05, hold: [10, 18] }),
  pavel: Object.freeze({ idles: ['Idle_Rail_Loop', 'Idle_Loop', 'Crouch_Idle_Loop'], walks: ['Walk_Loop', 'Walk_Formal_Loop'], walkSpeed: 0.92, hold: [8, 15] }),
  recoveryA: Object.freeze({ idles: ['Idle_Loop', 'Fixing_Kneeling', 'Idle_Rail_Loop'], walks: ['Walk_Carry_Loop', 'Walk_Loop'], walkSpeed: 0.88, hold: [7, 13] }),
  recoveryB: Object.freeze({ idles: ['Idle_FoldArms_Loop', 'Idle_Loop', 'Idle_Lantern_Loop'], walks: ['Walk_Loop', 'Walk_Carry_Loop'], walkSpeed: 1.0, hold: [9, 16] }),
  recoveryC: Object.freeze({ idles: ['Idle_TalkingPhone_Loop', 'Idle_Loop', 'Sitting_Idle_Loop'], walks: ['Walk_Loop', 'Walk_Formal_Loop'], walkSpeed: 1.16, hold: [6, 12] }),
});

function loadTemplate(role) {
  const url = CHARACTER_URLS[role];
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
}

function findIdleClip(animations = []) {
  return animations.find((clip) => /(^|[_\s-])idle($|[_\s-])/i.test(clip.name) && !/sit/i.test(clip.name))
    ?? animations.find((clip) => /idle/i.test(clip.name) && !/sit/i.test(clip.name))
    ?? null;
}

function fallbackActor(role) {
  const root = new THREE.Group();
  const colors = { lev: 0x4a5558, pavel: 0x665343, recoveryA: 0x24282b, recoveryB: 0x30292a };
  const material = new THREE.MeshStandardMaterial({ color: colors[role] ?? 0x24282b, roughness: 0.92 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.05, 5, 10), material);
  body.position.y = 0.88;
  body.castShadow = true;
  root.add(body);
  return root;
}

function normalizeToGround(root, targetHeight = 1.78) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = size.y > 0.001 ? targetHeight / size.y : 1;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(root);
  root.position.y -= scaled.min.y;
}

function prepareMaterials(root, tint = null) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    object.material = materials.map((source) => {
      const material = source.clone();
      material.roughness = Math.max(material.roughness ?? 0.7, 0.78);
      material.metalness = Math.min(material.metalness ?? 0, 0.12);
      if (tint && material.color) material.color.lerp(new THREE.Color(tint), 0.22);
      return material;
    });
    if (object.material.length === 1) object.material = object.material[0];
  });
}

function boneMap(root) {
  const map = new Map();
  root.traverse((object) => {
    if (object.isBone || /^(left|right)hand$/i.test(object.name)) {
      map.set(object.name.toLowerCase(), object);
    }
  });
  return map;
}

function findClip(animations, names) {
  const wanted = Array.isArray(names) ? names : [names];
  return wanted.map((name) => animations.find((clip) => clip.name.toLowerCase() === name.toLowerCase()))
    .find(Boolean) ?? null;
}

function roleSeed(role) {
  return [...role].reduce((seed, char) => ((seed * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
}

function makePistolProxy() {
  const group = new THREE.Group();
  group.name = 'temporary-service-pistol';
  const steel = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.68, metalness: 0.55 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2f22, roughness: 0.9, metalness: 0.02 });
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.075, 0.055), steel);
  slide.position.x = 0.08;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.16, 0.06), wood);
  grip.position.set(-0.02, -0.095, 0);
  grip.rotation.z = -0.18;
  group.add(slide, grip);
  group.rotation.set(0.1, 0.05, -Math.PI / 2);
  group.position.set(0.02, -0.04, 0.02);
  group.scale.setScalar(0.78);
  group.traverse((part) => { if (part.isMesh) part.castShadow = true; });
  return group;
}

async function loadPistol() {
  if (!pistolTemplate) pistolTemplate = loader.loadAsync(PISTOL_URL);
  const gltf = await pistolTemplate;
  const asset = gltf.scene.clone(true);
  asset.name = 'hunyuan-service-pistol-mesh';
  prepareMaterials(asset, 0x3f3a34);
  asset.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(asset);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const longest = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.001);
  asset.scale.setScalar(0.28 / longest);
  asset.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(asset);
  const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
  asset.position.sub(scaledCenter);

  const mount = new THREE.Group();
  mount.name = 'hunyuan-service-pistol';
  // The generated model's barrel runs on local X. Turn only around Y so the
  // barrel points toward actor-forward (-Z); the former extra Z rotation made
  // the entire pistol read as a vertical black board.
  asset.rotation.y = Math.PI / 2;
  mount.position.set(0.015, -0.025, -0.055);
  mount.add(asset);
  return mount;
}

const AUTO_RIG_ROLES = new Set(['pavel', 'recoveryA', 'recoveryB', 'recoveryC']);

function addBone(name, parent, x, y, z = 0) {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.set(x, y, z);
  parent.add(bone);
  return bone;
}

function proceduralRig(source, role) {
  source.updateMatrixWorld(true);
  const sourceInverse = new THREE.Matrix4().copy(source.matrixWorld).invert();
  const baked = [];
  source.traverse((object) => {
    if (!object.isMesh || !object.geometry?.attributes?.position) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(sourceInverse, object.matrixWorld));
    baked.push({ geometry, material: object.material });
  });
  if (!baked.length) return source;

  const bounds = new THREE.Box3();
  baked.forEach(({ geometry }) => {
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox);
  });
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const floor = bounds.min.y;
  const h = Math.max(0.001, size.y);
  const halfW = Math.max(0.001, size.x * 0.5);
  const rig = new THREE.Group();
  rig.name = 'nightfall-procedural-humanoid-rig';
  // The Hunyuan people are dense, single-mesh T poses with no skin weights.
  // Rotating guessed arm vertices tears coat triangles into large wings. Keep
  // the generated face/hair (the identity-bearing part) and place it on a
  // deliberately simple period body whose limbs have real pivots. The source
  // GLB remains an untouched strict T pose for later Blender/Mixamo rigging.
  const shoulderY = floor + h * 0.735;
  const shoulderX = halfW * 0.245;

  const extractGeneratedHead = (sourceGeometry) => {
    const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
    const position = geometry.attributes.position;
    const kept = [];
    for (let i = 0; i < position.count; i += 3) {
      const averageY = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
      const centered = [i, i + 1, i + 2]
        .every((vertex) => Math.abs(position.getX(vertex) - center.x) < halfW * 0.36);
      if (averageY > floor + h * 0.79 && centered) kept.push(i, i + 1, i + 2);
    }
    const cleaned = new THREE.BufferGeometry();
    Object.entries(geometry.attributes).forEach(([name, attribute]) => {
      const ArrayType = attribute.array.constructor;
      const array = new ArrayType(kept.length * attribute.itemSize);
      kept.forEach((vertex, outputIndex) => {
        for (let component = 0; component < attribute.itemSize; component++) {
          array[outputIndex * attribute.itemSize + component] = attribute.array[vertex * attribute.itemSize + component];
        }
      });
      cleaned.setAttribute(name, new THREE.BufferAttribute(array, attribute.itemSize, attribute.normalized));
    });
    geometry.dispose();
    if (cleaned.attributes.position?.count) cleaned.computeVertexNormals();
    cleaned.computeBoundingBox();
    cleaned.computeBoundingSphere();
    return cleaned;
  };

  baked.forEach(({ geometry, material }) => {
    const cleanedGeometry = extractGeneratedHead(geometry);
    geometry.dispose();
    if (!cleanedGeometry.attributes.position?.count) {
      cleanedGeometry.dispose();
      return;
    }
    const mesh = new THREE.Mesh(cleanedGeometry, material);
    mesh.name = 'hunyuan-generated-head-and-hair';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rig.add(mesh);
  });

  const coatColors = {
    pavel: 0x4f4037,
    recoveryA: 0x281f20,
    recoveryB: 0x202628,
    recoveryC: 0x3b2927,
  };
  const cloth = new THREE.MeshStandardMaterial({
    color: coatColors[role] ?? 0x282526,
    roughness: 0.92,
    metalness: 0.02,
  });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a6657, roughness: 0.88, metalness: 0 });
  const trouser = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.94, metalness: 0.01 });
  const shirt = new THREE.MeshStandardMaterial({ color: role === 'pavel' ? 0xc5b99f : 0x9ca0a0, roughness: 0.9 });
  const makeSegment = (start, end, radius, material) => {
    const direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.86, radius, direction.length(), 8, 1),
      material,
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rig.add(mesh);
    return mesh;
  };
  const addBox = (name, width, height, depth, x, y, z, material, bevel = 0) => {
    const geometry = bevel > 0
      ? new THREE.CapsuleGeometry(width * 0.5, Math.max(0.01, height - width), 3, 8)
      : new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rig.add(mesh);
    return mesh;
  };

  // Clear 1930s-inspired silhouette: shirt front, dark coat, separated legs.
  const torsoY = floor + h * 0.585;
  addBox('procedural-shirt-front', h * 0.23, h * 0.29, h * 0.115, center.x, torsoY + h * 0.035, center.z - h * 0.04, shirt);
  addBox('procedural-coat-torso', h * 0.34, h * 0.37, h * 0.18, center.x, torsoY, center.z, cloth);
  const coatSkirt = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.17, h * 0.21, h * 0.25, 8, 1), cloth);
  coatSkirt.name = 'procedural-coat-skirt';
  coatSkirt.position.set(center.x, floor + h * 0.37, center.z);
  coatSkirt.castShadow = true;
  rig.add(coatSkirt);
  const hipY = floor + h * 0.29;
  const footY = floor + h * 0.055;
  [-1, 1].forEach((side) => {
    const hip = new THREE.Vector3(center.x + side * h * 0.075, hipY, center.z);
    const ankle = new THREE.Vector3(center.x + side * h * 0.085, footY, center.z);
    makeSegment(hip, ankle, h * 0.055, trouser);
    addBox(`procedural-shoe-${side}`, h * 0.12, h * 0.055, h * 0.2,
      ankle.x, floor + h * 0.025, center.z - h * 0.045, trouser);
  });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.045, h * 0.05, h * 0.075, 8), skin);
  neck.position.set(center.x, floor + h * 0.785, center.z);
  neck.castShadow = true;
  rig.add(neck);
  const makeArm = (side, { raised = false, guarded = false } = {}) => {
    const shoulder = new THREE.Vector3(center.x + side * shoulderX, shoulderY, center.z);
    const elbow = new THREE.Vector3(
      center.x + side * (raised ? h * 0.105 : h * 0.13),
      shoulderY - h * (raised ? 0.12 : 0.18),
      center.z - (raised ? h * 0.11 : guarded ? h * 0.055 : 0),
    );
    const hand = new THREE.Vector3(
      center.x + side * (raised ? h * 0.035 : h * 0.115),
      shoulderY - h * (raised ? 0.22 : guarded ? 0.3 : 0.35),
      center.z - (raised ? h * 0.24 : guarded ? h * 0.08 : h * 0.015),
    );
    makeSegment(shoulder, elbow, h * 0.043, cloth);
    makeSegment(elbow, hand, h * 0.038, cloth);
    const handMesh = new THREE.Mesh(new THREE.SphereGeometry(h * 0.041, 8, 6), skin);
    handMesh.position.copy(hand);
    handMesh.castShadow = true;
    rig.add(handMesh);
    const anchor = new THREE.Group();
    anchor.name = side < 0 ? 'leftHand' : 'rightHand';
    anchor.position.copy(hand);
    rig.add(anchor);
    return anchor;
  };

  const leftHand = makeArm(-1, { raised: role === 'pavel', guarded: role !== 'pavel' });
  const rightHand = makeArm(1, { raised: role !== 'pavel', guarded: true });
  rig.userData.nightfallRig = {
    staticPose: true,
    sourceSize: size.toArray(),
    bones: { leftHand, rightHand },
  };
  return rig;
}

function setBoneRotation(bones, name, x = 0, y = 0, z = 0) {
  const bone = bones.get(name.toLowerCase());
  if (bone) bone.rotation.set(x, y, z);
}

export class EchoCityActor {
  constructor(role, root, animations = []) {
    this.role = role;
    this.root = root;
    this.bones = boneMap(root);
    this.boneRest = new Map([...this.bones.entries()].map(([name, bone]) => [name, {
      position: bone.position.clone(),
      quaternion: bone.quaternion.clone(),
    }]));
    const autoBones = root.userData?.nightfallRig?.bones;
    if (autoBones) Object.entries(autoBones).forEach(([name, bone]) => this.bones.set(name.toLowerCase(), bone));
    this.clock = 0;
    this.pose = 'idle';
    this.threat = 0;
    this.baseY = root.position.y;
    this.mixer = animations.length ? new THREE.AnimationMixer(root) : null;
    this.animations = animations;
    this.currentAction = null;
    this.motion = CHAPTER5_MOTION_PROFILES[role] ?? CHAPTER5_MOTION_PROFILES.recoveryB;
    this.randomState = roleSeed(role);
    this.idleClips = this.motion.idles
      .map((name) => findClip(animations, name))
      .filter((clip, index, clips) => clip && clips.indexOf(clip) === index);
    const fallbackIdle = findIdleClip(animations);
    if (!this.idleClips.length && fallbackIdle) this.idleClips.push(fallbackIdle);
    this.idleIndex = 0;
    this.idleRemaining = this.nextIdleHold();
    this.isMoving = false;
    const idleClip = this.idleClips[0] ?? null;
    this.idleAction = idleClip && this.mixer ? this.mixer.clipAction(idleClip) : null;
    if (this.idleAction) {
      this.idleAction.setLoop(THREE.LoopRepeat, Infinity);
      this.idleAction.play();
      this.currentAction = this.idleAction;
    }
  }

  random() {
    this.randomState = (1664525 * this.randomState + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  nextIdleHold() {
    const [min, max] = this.motion.hold;
    return THREE.MathUtils.lerp(min, max, this.random());
  }

  setLocomotion(moving, worldSpeed = this.motion.walkSpeed) {
    this.isMoving = Boolean(moving);
    if (this.isMoving) {
      if (this.playAnimation(this.motion.walks, { loop: true, fade: 0.22 }) && this.currentAction) {
        this.currentAction.timeScale = THREE.MathUtils.clamp(worldSpeed / this.motion.walkSpeed, 0.65, 1.65);
      }
      return;
    }
    this.idleRemaining = this.nextIdleHold();
    this.playAnimation(this.idleClips[this.idleIndex]?.name ?? ['Idle_Loop', 'Idle'], { loop: true, fade: 0.3 });
  }

  playAnimation(names, { loop = true, fade = 0.18 } = {}) {
    if (!this.mixer) return false;
    const clip = findClip(this.animations, names);
    if (!clip) return false;
    const next = this.mixer.clipAction(clip);
    if (next === this.currentAction) return true;
    next.reset();
    next.enabled = true;
    next.clampWhenFinished = !loop;
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.fadeIn(fade).play();
    this.currentAction?.fadeOut(fade);
    this.currentAction = next;
    return true;
  }

  attachPistol({ visible = true } = {}) {
    if (this.pistol) {
      this.pistol.visible = visible;
      return this.pistol;
    }
    const rightHand = [...this.bones.entries()].find(([name]) => /righthand|right(hand|wrist)|hand_r|r_hand/.test(name))?.[1];
    this.pistol = makePistolProxy();
    (rightHand ?? this.root).add(this.pistol);
    if (!rightHand) this.pistol.position.set(0.28, 0.92, 0.08);
    this.pistol.visible = visible;
    loadPistol().then((model) => {
      if (!this.pistol) return;
      model.visible = this.pistol.visible;
      const parent = this.pistol.parent;
      parent?.add(model);
      parent?.remove(this.pistol);
      this.pistol = model;
    }).catch((error) => console.warn('Hunyuan service pistol failed to load; keeping proxy.', error));
    return this.pistol;
  }

  setPose(pose) {
    if (this.pose === pose) return;
    this.pose = pose;
    if (pose === 'kneeling') this.playAnimation(['Fixing_Kneeling'], { loop: true });
    else if (pose === 'walk-away') this.setLocomotion(true, this.motion.walkSpeed);
    else {
      this.isMoving = false;
      this.playAnimation(this.idleClips[this.idleIndex]?.name ?? ['Idle_Loop', 'Idle'], { loop: true });
    }
  }

  applyLevKneelingPose() {
    if (this.role !== 'lev' || this.pose !== 'kneeling') return;
    const offset = (name, { x = 0, y = 0, z = 0, px = 0, py = 0, pz = 0 }) => {
      const bone = this.bones.get(name);
      const rest = this.boneRest.get(name);
      if (!bone || !rest) return;
      bone.position.copy(rest.position).add(new THREE.Vector3(px, py, pz));
      bone.quaternion.copy(rest.quaternion);
      bone.rotateX(x);
      bone.rotateY(y);
      bone.rotateZ(z);
    };

    // The legacy Lev asset contains a skeleton but no usable kneeling clip.
    // Apply a restrained, asymmetric static pose after the mixer so the old
    // bind T-pose can never leak into the confrontation.
    offset('hips', { py: -0.46, x: 0.08 });
    offset('spine', { x: 0.14 });
    offset('spine1', { x: 0.12 });
    offset('spine2', { x: 0.08 });
    offset('head', { x: -0.18, y: -0.08 });
    offset('leftarm', { z: 1.2, x: 0.1 });
    offset('rightarm', { z: -1.2, x: -0.1 });
    offset('leftforearm', { z: 0.62, x: -0.18 });
    offset('rightforearm', { z: -0.62, x: -0.18 });
    offset('leftupleg', { x: -1.05, z: 0.08 });
    offset('rightupleg', { x: -0.72, z: -0.08 });
    offset('leftleg', { x: 1.55 });
    offset('rightleg', { x: 1.25 });
    offset('leftfoot', { x: -0.55 });
    offset('rightfoot', { x: -0.45 });
  }

  update(dt, { target = null, threat = this.threat } = {}) {
    this.clock += dt;
    this.mixer?.update(dt);
    this.applyLevKneelingPose();
    if (!this.isMoving && this.pose === 'idle' && this.idleClips.length > 1) {
      this.idleRemaining -= dt;
      if (this.idleRemaining <= 0) {
        const step = 1 + Math.floor(this.random() * (this.idleClips.length - 1));
        this.idleIndex = (this.idleIndex + step) % this.idleClips.length;
        this.playAnimation(this.idleClips[this.idleIndex].name, { loop: true, fade: 0.4 });
        this.idleRemaining = this.nextIdleHold();
      }
    }
    this.threat = THREE.MathUtils.damp(this.threat, threat, 5, dt);
    const breath = Math.sin(this.clock * 1.7) * 0.018;
    const sway = Math.sin(this.clock * 0.75 + (this.role === 'pavel' ? 1.4 : 0)) * 0.035;
    this.root.rotation.z = this.role === 'pavel' ? sway * 0.8 : sway * 0.18;
    this.root.position.y = this.baseY + Math.max(0, breath * 0.12);

    if (target) {
      const dx = target.x - this.root.position.x;
      const dz = target.z - this.root.position.z;
      const desired = Math.atan2(dx, dz);
      this.root.rotation.y = THREE.MathUtils.damp(this.root.rotation.y, desired, 5, dt);
    }

    setBoneRotation(this.bones, 'Spine2', this.threat * 0.18, 0, 0);
    setBoneRotation(this.bones, 'Head', -this.threat * 0.08, Math.sin(this.clock * 0.55) * 0.04, 0);

    if (this.root.userData?.nightfallRig && !this.root.userData.nightfallRig.staticPose) {
      const leftUpper = this.bones.get('leftupperarm');
      const rightUpper = this.bones.get('rightupperarm');
      const leftLower = this.bones.get('leftlowerarm');
      const rightLower = this.bones.get('rightlowerarm');
      const spineBone = this.bones.get('spine');
      const headBone = this.bones.get('head');
      const tense = this.role.startsWith('recovery') ? THREE.MathUtils.lerp(0.93, 0.68, this.threat) : 1.05;
      if (leftUpper) leftUpper.rotation.z = THREE.MathUtils.damp(leftUpper.rotation.z, tense, 7, dt);
      if (rightUpper) rightUpper.rotation.z = THREE.MathUtils.damp(rightUpper.rotation.z, -tense, 7, dt);
      if (leftLower) leftLower.rotation.z = THREE.MathUtils.damp(leftLower.rotation.z, -0.22 - this.threat * 0.22, 7, dt);
      if (rightLower) rightLower.rotation.z = THREE.MathUtils.damp(rightLower.rotation.z, 0.26 + this.threat * 0.36, 7, dt);
      if (rightUpper) rightUpper.rotation.x = THREE.MathUtils.damp(rightUpper.rotation.x, this.threat * 0.22, 7, dt);
      if (spineBone) spineBone.rotation.x = Math.sin(this.clock * 1.35) * 0.018 + this.threat * 0.06;
      if (headBone) headBone.rotation.y = Math.sin(this.clock * 0.53) * 0.06;
    }

    // Do not hand-author rotations on an unknown imported skeleton. The old
    // pose layer assumed one exact bone orientation and could tear a valid
    // character into a T-pose or twist the shoulders inside-out. Threat is now
    // communicated by blocking, facing, the separate pistol prop, and authored
    // animation clips; new Hunyuan characters may use a different rest rig.
  }
}

export async function createEchoCityActor(role, { tint = null, height = 1.78 } = {}) {
  let root;
  let animations = [];
  try {
    const gltf = await loadTemplate(role);
    root = cloneSkinned(gltf.scene);
    animations = gltf.animations ?? [];
    if (AUTO_RIG_ROLES.has(role) && !boneMap(root).size) root = proceduralRig(root, role);
  } catch (error) {
    console.warn(`Echo City character '${role}' failed to load; using fallback.`, error);
    root = fallbackActor(role);
  }
  prepareMaterials(root, tint);
  normalizeToGround(root, height);
  root.name = `echo-city-character-${role}`;
  return new EchoCityActor(role, root, animations);
}
