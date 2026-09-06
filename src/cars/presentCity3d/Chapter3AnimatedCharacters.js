import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const CHARACTER_ROOT = '/assets/chapter03-3d/characters';
const ANIMATION_LIBRARY = '/assets/chapter03-3d/animations/quaternius_ual1_standard.glb';
const ACTOR_GROUND_OFFSET = 0.49;
const LOCOMOTION_REFERENCE_SPEEDS = Object.freeze({
  walk: 1.75,
  formalWalk: 1.65,
  crouchWalk: 1.2,
  jog: 3.4,
  sprint: 5.2,
});

export const CHAPTER3_CHARACTER_ASSETS = Object.freeze({
  // Target heights are measured sole-to-crown in world metres. The previous
  // 1.88-2.02 m targets made nearly every shared NPC read as unusually tall
  // beside counters, doors and Butch. Keep recognizable variation while
  // returning the cast to the architectural scale used by Echo City.
  butch: Object.freeze({ file: 'butch_shared_rig.glb', height: 1.86 }),
  lev: Object.freeze({ file: 'lev_shared_rig.glb', height: 1.82 }),
  femaleCivic: Object.freeze({ file: 'female_civic_shared_rig.glb', height: 1.70 }),
  femaleCivilian: Object.freeze({ file: 'female_civilian_shared_rig.glb', height: 1.67 }),
  femaleMarket: Object.freeze({ file: 'female_market_shared_rig.glb', height: 1.71 }),
  maleMunicipal: Object.freeze({ file: 'male_municipal_shared_rig.glb', height: 1.79 }),
  maleLabor: Object.freeze({ file: 'male_labor_shared_rig.glb', height: 1.83 }),
});

export const CHAPTER3_CHARACTER_ACTIONS = Object.freeze({
  tpose: 'A_TPose',
  idle: 'Idle_Loop',
  talk: 'Idle_Talking_Loop',
  torch: 'Idle_Torch_Loop',
  walk: 'Walk_Loop',
  formalWalk: 'Walk_Formal_Loop',
  crouchWalk: 'Crouch_Fwd_Loop',
  crouch: 'Crouch_Idle_Loop',
  jog: 'Jog_Fwd_Loop',
  sprint: 'Sprint_Loop',
  sit: 'Sitting_Idle_Loop',
  sitTalk: 'Sitting_Talking_Loop',
  investigate: 'Interact',
  repair: 'Fixing_Kneeling',
  pickUp: 'PickUp_Table',
  push: 'Push_Loop',
  dance: 'Dance_Loop',
});

function prepareVisual(root, height, groundOffset = ACTOR_GROUND_OFFSET) {
  root.updateMatrixWorld(true);
  const initialBounds = new THREE.Box3().setFromObject(root);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(initialSize.y) || initialSize.y <= 0.01) throw new Error('Character has invalid bounds');
  root.scale.setScalar(height / initialSize.y);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  // Gameplay actors are positioned half a metre above their walking surface so
  // the old capsule placeholders sit correctly. Counteract that convention for
  // rigged characters so their soles, not the visual root, touch the surface.
  root.position.set(-center.x, -bounds.min.y - groundOffset, -center.z);
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
    if (Array.isArray(child.material)) child.material = child.material.map((material) => material.clone());
    else if (child.material) child.material = child.material.clone();
  });
  root.updateMatrixWorld(true);
  return root;
}

class AnimatedCharacterInstance {
  constructor({ id, assetId, host, fallbackChildren, groundHeightAt }) {
    this.id = id;
    this.assetId = assetId;
    this.host = host;
    this.fallbackChildren = fallbackChildren;
    this.groundHeightAt = groundHeightAt;
    this.visual = null;
    this.mixer = null;
    this.actions = new Map();
    this.currentAction = null;
    this.currentState = null;
    this.previousHostPosition = new THREE.Vector3();
    this.currentHostPosition = new THREE.Vector3();
    this.smoothedSpeed = 0;
    this.playbackRate = 1;
    this.groundOffset = 0;
    this.visualBaseY = 0;
    this.groundCorrection = 0;
    this.groundHeight = null;
    host.getWorldPosition(this.previousHostPosition);
    this.loaded = false;
    this.error = null;
  }

  install(gltf, spec, sharedAnimations = []) {
    const groundOffset = spec.groundOffset
      ?? (Math.abs(this.host.position.y) < 0.25 ? 0 : ACTOR_GROUND_OFFSET);
    const root = prepareVisual(cloneSkeleton(gltf.scene), spec.height, groundOffset);
    root.name = `${this.id}-shared-rig-visual`;
    root.userData.characterAsset = this.assetId;
    this.host.add(root);
    this.visual = root;
    this.groundOffset = groundOffset;
    this.visualBaseY = root.position.y;
    this.mixer = new THREE.AnimationMixer(root);
    for (const clip of [...sharedAnimations, ...gltf.animations]) {
      const normalizedName = clip.name.replace(/_Rig$/, '');
      if (!this.actions.has(normalizedName) || gltf.animations.includes(clip)) {
        this.actions.set(normalizedName, this.mixer.clipAction(clip));
      }
    }
    for (const child of this.fallbackChildren) child.visible = false;
    this.loaded = true;
    this.play('idle', { immediate: true });
  }

  fail(error) {
    this.error = error?.message || String(error);
    this.loaded = false;
    for (const child of this.fallbackChildren) child.visible = true;
  }

  play(state, { immediate = false } = {}) {
    const clipName = CHAPTER3_CHARACTER_ACTIONS[state] || state;
    this.currentState = state;
    if (!this.mixer || this.currentAction === clipName) return Boolean(this.actions.get(clipName));
    const next = this.actions.get(clipName);
    if (!next) return false;
    const previous = this.currentAction ? this.actions.get(this.currentAction) : null;
    next.enabled = true;
    next.reset();
    next.setLoop(THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = false;
    if (previous && !immediate) previous.crossFadeTo(next, 0.18, true);
    else {
      previous?.stop();
      next.play();
    }
    if (previous && !immediate) next.play();
    this.currentAction = clipName;
    return true;
  }

  update(dt, { groundingEnabled = true } = {}) {
    this.host.getWorldPosition(this.currentHostPosition);
    if (dt > 0 && dt < 0.25) {
      const dx = this.currentHostPosition.x - this.previousHostPosition.x;
      const dz = this.currentHostPosition.z - this.previousHostPosition.z;
      const measuredSpeed = Math.hypot(dx, dz) / dt;
      const response = 1 - Math.exp(-dt * 9);
      this.smoothedSpeed = THREE.MathUtils.lerp(this.smoothedSpeed, measuredSpeed, response);
    }
    this.previousHostPosition.copy(this.currentHostPosition);

    let targetGroundCorrection = 0;
    if (groundingEnabled && this.groundHeightAt) {
      const sampledHeight = this.groundHeightAt(this.currentHostPosition.x, this.currentHostPosition.z);
      if (Number.isFinite(sampledHeight)) {
        this.groundHeight = sampledHeight;
        const baselineFeetHeight = this.currentHostPosition.y - this.groundOffset;
        targetGroundCorrection = sampledHeight - baselineFeetHeight;
      }
    } else {
      this.groundHeight = null;
    }
    this.groundCorrection = THREE.MathUtils.damp(
      this.groundCorrection,
      targetGroundCorrection,
      18,
      Math.min(dt, 0.1),
    );
    if (this.visual) this.visual.position.y = this.visualBaseY + this.groundCorrection;

    const referenceSpeed = LOCOMOTION_REFERENCE_SPEEDS[this.currentState];
    const action = this.currentAction ? this.actions.get(this.currentAction) : null;
    if (action && referenceSpeed) {
      this.playbackRate = THREE.MathUtils.clamp(this.smoothedSpeed / referenceSpeed, 0.38, 3.4);
      action.setEffectiveTimeScale(this.playbackRate);
    } else if (action) {
      this.playbackRate = 1;
      action.setEffectiveTimeScale(1);
    }
    this.mixer?.update(dt);
  }

  state() {
    const visualBounds = this.visual
      ? new THREE.Box3().setFromObject(this.visual)
      : null;
    const visualSize = visualBounds?.getSize(new THREE.Vector3()) ?? null;
    return {
      id: this.id,
      asset: this.assetId,
      loaded: this.loaded,
      fallback: !this.loaded,
      action: this.currentAction,
      state: this.currentState,
      speed: Number(this.smoothedSpeed.toFixed(2)),
      playbackRate: Number(this.playbackRate.toFixed(2)),
      groundHeight: this.groundHeight === null ? null : Number(this.groundHeight.toFixed(3)),
      groundCorrection: Number(this.groundCorrection.toFixed(3)),
      visualHeight: visualSize ? Number(visualSize.y.toFixed(3)) : null,
      error: this.error,
      position: [this.host.position.x, this.host.position.y, this.host.position.z]
        .map((value) => Number(value.toFixed(2))),
    };
  }
}

export class Chapter3AnimatedCharacterSystem {
  constructor({ groundHeightAt = null } = {}) {
    this.loader = new GLTFLoader();
    this.sources = new Map();
    this.animationLibrary = null;
    this.groundHeightAt = groundHeightAt;
    this.instances = new Map();
  }

  loadAnimationLibrary() {
    if (!this.animationLibrary) {
      this.animationLibrary = this.loader.loadAsync(ANIMATION_LIBRARY)
        .then((gltf) => gltf.animations)
        .catch((error) => {
          console.warn('Shared Chapter 03 animation library unavailable; using embedded clips only', error);
          return [];
        });
    }
    return this.animationLibrary;
  }

  loadSource(assetId) {
    if (this.sources.has(assetId)) return this.sources.get(assetId);
    const spec = CHAPTER3_CHARACTER_ASSETS[assetId];
    if (!spec) return Promise.reject(new Error(`Unknown Chapter 03 character asset: ${assetId}`));
    const promise = this.loader.loadAsync(`${CHARACTER_ROOT}/${spec.file}`);
    this.sources.set(assetId, promise);
    return promise;
  }

  async attach({ id, assetId, host }) {
    const spec = CHAPTER3_CHARACTER_ASSETS[assetId];
    if (!host || !spec) throw new Error(`Cannot attach ${id}: missing host or asset ${assetId}`);
    const instance = new AnimatedCharacterInstance({
      id,
      assetId,
      host,
      fallbackChildren: [...host.children],
      groundHeightAt: this.groundHeightAt,
    });
    this.instances.set(id, instance);
    try {
      const [gltf, sharedAnimations] = await Promise.all([
        this.loadSource(assetId),
        this.loadAnimationLibrary(),
      ]);
      instance.install(gltf, spec, sharedAnimations);
    } catch (error) {
      instance.fail(error);
      console.warn(`Character ${id} retained its fallback`, error);
    }
    return instance;
  }

  get(id) {
    return this.instances.get(id) || null;
  }

  play(id, state, options) {
    return this.get(id)?.play(state, options) || false;
  }

  playAll(state, options) {
    for (const instance of this.instances.values()) instance.play(state, options);
  }

  update(dt, options) {
    for (const instance of this.instances.values()) instance.update(dt, options);
  }

  state() {
    return [...this.instances.values()].map((instance) => instance.state());
  }
}
