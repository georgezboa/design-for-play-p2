import * as THREE from 'three';

// These are the exact paper assets already used by George's production
// `final-boss.html` / ALL WORLDS AT ONCE battle. The Museum treats each source
// image as a conserved paper object: only its display size and placement change.
export const FINAL_BOSS_ARCHIVE_ASSETS = Object.freeze({
  'chapter01-night-service-train': Object.freeze({
    sourceChapter: 'chapter01',
    sourceRuntime: 'final-boss-all-worlds-at-once',
    sourcePath: '../../finalBoss/assets/paper/ch1-train-exterior-v01.png',
    url: new URL('../../finalBoss/assets/paper/ch1-train-exterior-v01.png', import.meta.url).href,
    aspect: 2847 / 823,
  }),
  'chapter04-indigo-pigment': Object.freeze({
    sourceChapter: 'chapter04',
    sourceRuntime: 'final-boss-all-worlds-at-once',
    sourcePath: '../../finalBoss/assets/paper/ch4-pigment-indigo.png',
    url: new URL('../../finalBoss/assets/paper/ch4-pigment-indigo.png', import.meta.url).href,
    aspect: 240 / 144,
  }),
});

const loader = new THREE.TextureLoader();
const textureCache = new Map();

function loadTexture(id) {
  const source = FINAL_BOSS_ARCHIVE_ASSETS[id];
  if (!source) return Promise.reject(new Error(`Unknown final-boss archive asset: ${id}`));
  if (!textureCache.has(id)) {
    textureCache.set(id, loader.loadAsync(source.url).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      return texture;
    }));
  }
  return textureCache.get(id);
}

// This mirrors the final boss's makePaperCard treatment: a source-textured
// front and a very slightly offset dark paper back. The image itself is never
// redrawn, cropped, recolored, or replaced with substitute geometry.
export async function loadFinalBossPaperAsset(id, { width = 1 } = {}) {
  const source = FINAL_BOSS_ARCHIVE_ASSETS[id];
  if (!source) throw new Error(`Unknown final-boss archive asset: ${id}`);
  const texture = await loadTexture(id);
  const height = width / source.aspect;
  const geometry = new THREE.PlaneGeometry(width, height);
  const root = new THREE.Group();
  root.name = `museum-final-boss-paper-${id}`;
  root.userData.sourceAssetId = id;
  root.userData.sourceChapter = source.sourceChapter;
  root.userData.sourceRuntime = source.sourceRuntime;
  root.userData.sourceUrl = source.url;

  const back = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0x171512,
    map: texture,
    alphaMap: texture,
    alphaTest: 0.08,
    transparent: true,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  }));
  back.position.z = -0.028;
  back.scale.set(1.025, 1.04, 1);

  const face = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    alphaTest: 0.08,
    transparent: true,
    roughness: 0.93,
    metalness: 0,
    side: THREE.DoubleSide,
  }));
  face.position.z = 0.012;
  face.castShadow = true;
  back.castShadow = true;
  root.add(back, face);
  return root;
}
