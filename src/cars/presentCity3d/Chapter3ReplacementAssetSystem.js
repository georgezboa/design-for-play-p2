import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ROOT = '/assets/chapter03-3d/replacements';
// Full hotel shells are several MB each.  They are loaded alongside the
// chapter's other authored sets, and Safari can queue them for longer than
// the old 18-second cutoff even on localhost.  Do not prematurely replace a
// real room with the old greybox while it is still arriving.
const LOAD_TIMEOUT_MS = 60000;

export const CHAPTER3_REPLACEMENT_IDS = Object.freeze([
  'env-eda-oil-stall', 'env-flower-stall',
  'env-service-alley-kit', 'env-campfire-props', 'env-ministry-shell',
  'env-ministry-furniture', 'env-archive-shell', 'env-archive-furniture',
  'env-hotel-lobby-shell', 'env-hotel-lobby-furniture',
  'env-hotel-corridor-shell', 'env-butch-room-shell',
  'env-butch-room-furniture', 'env-doorless-carriage',
  'env-single-train-door', 'prop-oil-container-set', 'prop-solvent-bottle',
  'prop-terminal-printer', 'prop-petar-toolbox', 'prop-hotel-register-key',
  'prop-cut-connector-set',
]);

function prepareModel(model, id) {
  model.name = `chapter3-replacement-${id}`;
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material?.map) material.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
  return model;
}

export class Chapter3ReplacementAssetSystem {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.instances = new Map();
  }

  load(id) {
    if (!CHAPTER3_REPLACEMENT_IDS.includes(id)) return Promise.reject(new Error(`Unknown Chapter 3 replacement: ${id}`));
    if (!this.cache.has(id)) {
      this.cache.set(id, this.loader.loadAsync(`${ROOT}/${id}.glb`).then((gltf) => gltf.scene));
    }
    return this.cache.get(id);
  }

  async attach({ id, host, position = [0, 0, 0], rotationY = 0, scale = 1, hide = [] }) {
    const record = { id, loaded: false, error: null, model: null };
    this.instances.set(`${id}:${this.instances.size}`, record);
    try {
      const source = await Promise.race([
        this.load(id),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error(`${id} exceeded ${LOAD_TIMEOUT_MS}ms load budget`)),
          LOAD_TIMEOUT_MS,
        )),
      ]);
      const model = prepareModel(source.clone(true), id);
      model.position.fromArray(position);
      model.rotation.y = rotationY;
      if (Array.isArray(scale)) model.scale.fromArray(scale);
      else model.scale.setScalar(scale);
      host.add(model);
      for (const object of hide) {
        if (object && object !== host) object.visible = false;
      }
      record.loaded = true;
      record.model = model;
      return record;
    } catch (error) {
      record.error = String(error?.message || error);
      console.warn(`[Chapter 3 replacements] ${id} kept fallback:`, error);
      return record;
    }
  }

  state() {
    return [...this.instances.values()].map(({ id, loaded, error, model }) => ({
      id,
      loaded,
      error,
      visible: model?.visible ?? false,
    }));
  }

  model(id) {
    return [...this.instances.values()].find((record) => record.id === id && record.loaded)?.model ?? null;
  }
}
