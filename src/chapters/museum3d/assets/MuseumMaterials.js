import * as THREE from 'three';

const ROOT = '/museum3d/textures';
let sharedLibrary = null;

function tiledTexture(loader, url, {
  repeatX = 1,
  repeatY = 1,
  color = false,
} = {}) {
  const texture = loader.load(url);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function pbrSet(loader, folder, repeatX, repeatY) {
  return {
    map: tiledTexture(loader, `${ROOT}/${folder}/diffuse.jpg`, {
      repeatX,
      repeatY,
      color: true,
    }),
    normalMap: tiledTexture(loader, `${ROOT}/${folder}/normal_gl.jpg`, {
      repeatX,
      repeatY,
    }),
    roughnessMap: tiledTexture(loader, `${ROOT}/${folder}/roughness.jpg`, {
      repeatX,
      repeatY,
    }),
  };
}

function acousticTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c9c5b9';
  ctx.fillRect(0, 0, 128, 128);
  // Deterministic pinprick pattern: enough to read as compressed mineral
  // fibre at close range without becoming noisy or requiring another image.
  for (let i = 0; i < 84; i += 1) {
    const x = (i * 47 + 13) % 128;
    const y = (i * 71 + 29) % 128;
    const r = i % 5 === 0 ? 1.1 : 0.65;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(78,75,68,0.20)' : 'rgba(255,255,244,0.18)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function institutionalWallcoveringTexture({ dark = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = dark ? '#b8aa8f' : '#d8c9aa';
  ctx.fillRect(0, 0, 256, 256);

  // 1980s contract-vinyl wallcovering: broad hanging seams with a restrained
  // woven grain. The contrast is intentional so it survives the dim museum
  // lighting instead of collapsing back into a flat gray box.
  for (let x = 1; x < 256; x += 4) {
    ctx.fillStyle = x % 8 === 1
      ? 'rgba(78, 67, 48, 0.10)'
      : 'rgba(255, 248, 220, 0.075)';
    ctx.fillRect(x, 0, 1, 256);
  }
  for (let y = 2; y < 256; y += 7) {
    ctx.fillStyle = y % 14 === 2
      ? 'rgba(75, 65, 48, 0.045)'
      : 'rgba(255, 249, 229, 0.04)';
    ctx.fillRect(0, y, 256, 1);
  }
  for (const x of [0, 128, 255]) {
    ctx.fillStyle = 'rgba(70, 58, 38, 0.22)';
    ctx.fillRect(x, 0, 2, 256);
    ctx.fillStyle = 'rgba(255, 247, 218, 0.14)';
    ctx.fillRect(Math.min(255, x + 2), 0, 1, 256);
  }
  for (let i = 0; i < 42; i += 1) {
    const x = (i * 83 + 19) % 256;
    const y = (i * 47 + 31) % 256;
    ctx.fillStyle = i % 3 === 0
      ? 'rgba(65, 54, 37, 0.13)'
      : 'rgba(255, 247, 216, 0.12)';
    ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function lowerWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#727660';
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 8) {
    ctx.fillStyle = x % 16 === 0
      ? 'rgba(35, 40, 31, 0.16)'
      : 'rgba(220, 220, 185, 0.08)';
    ctx.fillRect(x, 0, 2, 128);
  }
  for (let y = 16; y < 128; y += 32) {
    ctx.fillStyle = 'rgba(235, 229, 192, 0.07)';
    ctx.fillRect(0, y, 128, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMuseumMaterialLibrary() {
  if (sharedLibrary) return sharedLibrary;

  const loader = new THREE.TextureLoader();
  const wallMaps = pbrSet(loader, 'beige_wall_001', 2.4, 1.4);
  const carpetMaps = pbrSet(loader, 'dirty_carpet', 8, 6);
  const woodMaps = pbrSet(loader, 'wood_table_001', 2.2, 1.1);
  const darkWoodMaps = pbrSet(loader, 'dark_wood', 1.35, 1.0);
  const rubberTileMaps = pbrSet(loader, 'rubber_tiles', 3.2, 8);
  const glassSmudges = {
    normalMap: tiledTexture(loader, `${ROOT}/glass_fingerprints/normal_gl.jpg`, {
      repeatX: 1.4,
      repeatY: 1.1,
    }),
    roughnessMap: tiledTexture(loader, `${ROOT}/glass_fingerprints/roughness.jpg`, {
      repeatX: 1.4,
      repeatY: 1.1,
    }),
  };
  sharedLibrary = {
    wall: new THREE.MeshStandardMaterial({
      ...wallMaps,
      color: 0xdccaa8,
      roughness: 0.92,
      metalness: 0,
      normalScale: new THREE.Vector2(0.16, 0.16),
    }),
    wallDark: new THREE.MeshStandardMaterial({
      ...wallMaps,
      color: 0xcbb890,
      roughness: 0.93,
      metalness: 0,
      normalScale: new THREE.Vector2(0.14, 0.14),
    }),
    wallLower: new THREE.MeshStandardMaterial({
      ...wallMaps,
      color: 0xcfbd9b,
      roughness: 0.94,
      metalness: 0,
      normalScale: new THREE.Vector2(0.12, 0.12),
    }),
    carpet: new THREE.MeshStandardMaterial({
      ...carpetMaps,
      color: 0xa3927e,
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(0.42, 0.42),
    }),
    carpetLane: new THREE.MeshStandardMaterial({
      ...carpetMaps,
      color: 0x5f574d,
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(0.34, 0.34),
    }),
    deskWood: new THREE.MeshStandardMaterial({
      normalMap: woodMaps.normalMap,
      roughnessMap: woodMaps.roughnessMap,
      color: 0x9b7450,
      roughness: 0.74,
      metalness: 0,
      normalScale: new THREE.Vector2(0.16, 0.16),
    }),
    deskWoodDark: new THREE.MeshStandardMaterial({
      normalMap: woodMaps.normalMap,
      roughnessMap: woodMaps.roughnessMap,
      color: 0x715137,
      roughness: 0.8,
      metalness: 0,
      normalScale: new THREE.Vector2(0.14, 0.14),
    }),
    displayPlinth: new THREE.MeshStandardMaterial({
      color: 0xcac0a6,
      roughness: 0.9,
      metalness: 0,
    }),
    displayDeck: new THREE.MeshStandardMaterial({
      color: 0xe0d8bf,
      roughness: 0.88,
      metalness: 0,
    }),
    displayToeKick: new THREE.MeshStandardMaterial({
      color: 0x4c4539,
      roughness: 0.86,
      metalness: 0.08,
    }),
    caseChannel: new THREE.MeshStandardMaterial({
      color: 0x626158,
      roughness: 0.42,
      metalness: 0.72,
    }),
    glassEdge: new THREE.MeshPhysicalMaterial({
      color: 0x83aaa3,
      transparent: true,
      opacity: 0.46,
      transmission: 0.32,
      roughness: 0.16,
      metalness: 0,
      depthWrite: false,
    }),
    museumGlass: new THREE.MeshPhysicalMaterial({
      ...glassSmudges,
      color: 0xd8e8e4,
      transparent: true,
      opacity: 0.19,
      transmission: 0.76,
      thickness: 0.008,
      ior: 1.5,
      roughness: 0.13,
      metalness: 0,
      clearcoat: 0.72,
      clearcoatRoughness: 0.11,
      envMapIntensity: 1.25,
      normalScale: new THREE.Vector2(0.018, 0.018),
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    ceilingTile: new THREE.MeshStandardMaterial({
      map: acousticTileTexture(),
      color: 0xd9d2bd,
      emissive: 0x17160f,
      emissiveIntensity: 0.06,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
    rubberTile: new THREE.MeshStandardMaterial({
      ...rubberTileMaps,
      color: 0x4c514b,
      roughness: 0.96,
      metalness: 0,
      normalScale: new THREE.Vector2(0.34, 0.34),
    }),
    blackPlastic: new THREE.MeshStandardMaterial({
      color: 0x171719,
      roughness: 0.58,
      metalness: 0.05,
    }),
    olivePlastic: new THREE.MeshStandardMaterial({
      color: 0x3d4737,
      roughness: 0.72,
      metalness: 0,
    }),
    oliveSteel: new THREE.MeshStandardMaterial({
      color: 0x4b5043,
      roughness: 0.7,
      metalness: 0.45,
    }),
    darkSteel: new THREE.MeshStandardMaterial({
      color: 0x333532,
      roughness: 0.62,
      metalness: 0.58,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0x8a7042,
      roughness: 0.5,
      metalness: 0.68,
    }),
    paper: new THREE.MeshStandardMaterial({
      color: 0xe9e1ca,
      roughness: 0.96,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x181916,
      roughness: 0.9,
      metalness: 0,
    }),
    lampGreen: new THREE.MeshStandardMaterial({
      color: 0x315840,
      emissive: 0x17291d,
      emissiveIntensity: 0.3,
      roughness: 0.38,
    }),
  };

  // Compatibility aliases for the existing prop builders. New code uses the
  // semantic names above; the aliases keep older chapter assets stable.
  sharedLibrary.walnut = sharedLibrary.deskWood;
  sharedLibrary.walnutDark = sharedLibrary.deskWoodDark;

  return sharedLibrary;
}

export const MUSEUM_TEXTURE_SOURCES = Object.freeze([
  {
    id: 'beige_wall_001',
    title: 'Beige Wall 001',
    author: 'Dimitrios Savva, Rico Cilliers',
    license: 'CC0 1.0',
    source: 'https://polyhaven.com/a/beige_wall_001',
  },
  {
    id: 'dirty_carpet',
    title: 'Dirty Carpet',
    author: 'Rohit Seervi',
    license: 'CC0 1.0',
    source: 'https://polyhaven.com/a/dirty_carpet',
  },
  {
    id: 'wood_table_001',
    title: 'Wood Table 001',
    author: 'Dimitrios Savva, Rico Cilliers',
    license: 'CC0 1.0',
    source: 'https://polyhaven.com/a/wood_table_001',
  },
  {
    id: 'rubber_tiles',
    title: 'Rubber Tiles',
    author: 'Amal Kumar',
    license: 'CC0 1.0',
    source: 'https://polyhaven.com/a/rubber_tiles',
  },
  {
    id: 'dark_wood',
    title: 'Dark Wood',
    author: 'Dario Barresi, Dimitrios Savva, Rico Cilliers',
    license: 'CC0 1.0',
    source: 'https://polyhaven.com/a/dark_wood',
  },
  {
    id: 'Fingerprints001',
    title: 'Fingerprints 001',
    author: 'ambientCG',
    license: 'CC0 1.0',
    source: 'https://ambientcg.com/view?id=Fingerprints001',
  },
]);
