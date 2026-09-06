import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { fitObjectToDimensions } from './MuseumModelLoader.js';

const MODEL_ROOT = '/museum3d/echo-city/models';
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const sourceCache = new Map();
const NIGHT_DUTY_SHELLS = new Set([
  'nightServiceKit',
  'fountainPumpCabinet',
  'archiveNightReturn',
  'publicWorksLedger',
  'stationNightPowerBox',
]);

// The generated service kit arrived with a pale tan material that reads like
// a toy in Echo City's municipal night palette.  Keep its authored surface
// detail, but cool and darken the single shared material at runtime.  Brass
// hardware and the hand-lamp lens are separate scene dressing so they can stay
// warm without requiring another generated mesh.
const SHELL_TREATMENTS = Object.freeze({
  nightServiceKit: Object.freeze({
    color: 0x344853,
    emissive: 0x11191d,
    emissiveIntensity: 0.045,
    roughness: 0.84,
    metalness: 0.04,
    stripBaseColorMap: true,
  }),
  stationNightPowerBox: Object.freeze({
    color: 0x314247,
    emissive: 0x0b1113,
    emissiveIntensity: 0.035,
    roughness: 0.91,
    metalness: 0.11,
    stripBaseColorMap: true,
  }),
  fountainPumpCabinet: Object.freeze({
    color: 0x364642,
    emissive: 0x0d1513,
    emissiveIntensity: 0.035,
    roughness: 0.88,
    metalness: 0.14,
  }),
  archiveNightReturn: Object.freeze({
    color: 0x34413e,
    emissive: 0x0c1211,
    emissiveIntensity: 0.03,
    roughness: 0.9,
    metalness: 0.12,
  }),
  publicWorksLedger: Object.freeze({
    color: 0x8b7757,
    emissive: 0x171208,
    emissiveIntensity: 0.025,
    roughness: 0.96,
    metalness: 0,
  }),
  marketShutterPedestal: Object.freeze({
    color: 0x34413e,
    emissive: 0x0b1110,
    emissiveIntensity: 0.03,
    roughness: 0.9,
    metalness: 0.16,
  }),
  marketShutterControls: Object.freeze({
    color: 0x7d6842,
    emissive: 0x160f05,
    emissiveIntensity: 0.04,
    roughness: 0.82,
    metalness: 0.24,
  }),
});

export const ECHO_CITY_MODEL_URLS = Object.freeze({
  clockTower: `${MODEL_ROOT}/clock_tower_web.glb`,
  fountain: `${MODEL_ROOT}/reunion_fountain_web.glb`,
  archive: `${MODEL_ROOT}/old_municipal_archive_web.glb`,
  ministry: `${MODEL_ROOT}/transit_ministry_web.glb`,
  marketStall: `${MODEL_ROOT}/produce_market_stall_web.glb`,
  tram: `${MODEL_ROOT}/municipal_tram_web.glb`,
  nightServiceKit: `${MODEL_ROOT}/ch05_night_attendant_service_kit.glb`,
  fountainPumpCabinet: `${MODEL_ROOT}/ch05_fountain_pump_cabinet.glb`,
  archiveNightReturn: `${MODEL_ROOT}/ch05_archive_night_return.glb`,
  publicWorksLedger: `${MODEL_ROOT}/ch05_public_works_ledger.glb`,
  stationNightPowerBox: `${MODEL_ROOT}/ch05_station_night_power_box.glb`,
  marketShutterPedestal: `${MODEL_ROOT}/ch05_market_shutter_pedestal_gearbox_v2.glb`,
  marketShutterControls: `${MODEL_ROOT}/ch05_market_shutter_handwheel_pawl_v2.glb`,
});

function loadSource(id) {
  const url = ECHO_CITY_MODEL_URLS[id];
  if (!url) return Promise.reject(new Error(`Unknown Echo City model: ${id}`));
  if (!sourceCache.has(id)) {
    sourceCache.set(id, loader.loadAsync(url).then((gltf) => gltf.scene));
  }
  return sourceCache.get(id);
}

export async function loadEchoCityModel(id, { target, rotation } = {}) {
  const source = await loadSource(id);
  const clone = source.clone(true);
  clone.name = `echo-city-${id}`;
  clone.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material) {
      child.material = child.material.clone();
      child.material.roughness = Math.max(child.material.roughness ?? 0.55, 0.55);
      child.material.metalness = Math.min(child.material.metalness ?? 0.05, 0.25);
      const treatment = SHELL_TREATMENTS[id];
      if (treatment) {
        // The source kit's baked tan albedo overwhelms material tinting.  Its
        // silhouette is useful, but Chapter 5 needs a dark municipal canvas
        // shell rather than a beige toy, so keep the authored geometry and
        // normal response while replacing only that albedo map.
        if (treatment.stripBaseColorMap) child.material.map = null;
        child.material.color.setHex(treatment.color);
        child.material.roughness = treatment.roughness;
        child.material.metalness = treatment.metalness;
        if ('envMapIntensity' in child.material) child.material.envMapIntensity = 0.45;
        if (child.material.emissive) {
          child.material.emissive.setHex(treatment.emissive);
          child.material.emissiveIntensity = treatment.emissiveIntensity;
        }
        child.material.needsUpdate = true;
      }
      // These small duty objects must remain legible before the street grid is
      // restored. A restrained material lift reveals their silhouette without
      // raising the exposure of the whole night scene.
      if (NIGHT_DUTY_SHELLS.has(id) && !treatment && child.material.emissive) {
        child.material.emissive.copy(child.material.color);
        child.material.emissiveIntensity = 0.14;
      }
    }
  });
  if (rotation) clone.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
  if (target) fitObjectToDimensions(clone, target);
  return clone;
}
