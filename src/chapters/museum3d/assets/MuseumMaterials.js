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

// ---------------------------------------------------------------------------
// Round 3 (owner: "the museum looks like greybox"). Three things made it so:
//   · every wall, floor and lane shared one texture repeat, so a 30 m wall
//     and a 2 m wall got the same 2.4 tiles: the corridor's surfaces were
//     stretched into flat colour. Shell geometry now carries world-scale UVs
//     (graybox.js applyWorldUv: one tile per `userData.worldTile` metres);
//   · the plaster photo is nearly featureless, so the upper walls now wear a
//     painted wallcovering (warm linen ground, a quiet regency stripe), the
//     lower walls walnut panelling under a brass chair rail;
//   · the "walnut" was a flat brown (normal map, no colour map) and the case
//     backs were black slabs: walnut now has grain, and the backs are walnut.
// Everything new is a small canvas painted once: no new downloads.

// A tile of museum wallcovering: warm linen ground, fine woven threads, a
// regency stripe and a low, broad mottle so the repeat never reads as a grid.
function museumWallcoveringTexture({ base = '#cdb894', stripe = 'rgba(120, 86, 46, 0.075)', seed = 7 } = {}) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  c.fillStyle = base;
  c.fillRect(0, 0, size, size);
  let s = seed;
  const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 26; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = 30 + random() * 70;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const light = random() > 0.5;
    g.addColorStop(0, light ? 'rgba(255, 244, 214, 0.06)' : 'rgba(90, 62, 34, 0.06)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = g;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      c.save(); c.translate(dx, dy); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
    }
  }
  // the stripe: two quiet bands and a hairline per tile
  c.fillStyle = stripe;
  c.fillRect(0, 0, 40, size);
  c.fillRect(128, 0, 40, size);
  c.fillStyle = 'rgba(120, 86, 46, 0.12)';
  c.fillRect(84, 0, 2, size);
  c.fillRect(212, 0, 2, size);
  // woven threads
  for (let x = 0; x < size; x += 2) {
    c.fillStyle = random() > 0.5 ? 'rgba(255, 248, 226, 0.05)' : 'rgba(70, 50, 28, 0.05)';
    c.fillRect(x, 0, 1, size);
  }
  for (let y = 0; y < size; y += 2) {
    c.fillStyle = random() > 0.5 ? 'rgba(255, 248, 226, 0.04)' : 'rgba(70, 50, 28, 0.045)';
    c.fillRect(0, y, size, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// One bay of walnut panelling (1.2 m × 1.1 m): a raised field in a moulded
// frame, stiles at the bay edges. The grain is the dark_wood photo, drawn in
// once it loads; until then the bay is painted walnut.
function walnutPanelTexture(imageLoader) {
  const W = 384;
  const H = 352;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const paint = (grain) => {
    c.fillStyle = '#4a2f1d';
    c.fillRect(0, 0, W, H);
    if (grain) {
      // field grain runs vertically, frame grain along each member
      c.save(); c.translate(W, 0); c.rotate(Math.PI / 2); c.drawImage(grain, 0, 0, H, W); c.restore();
    }
    c.fillStyle = 'rgba(40, 22, 12, 0.35)';
    c.fillRect(0, 0, W, H);
    const frame = 46;
    const inset = (x, y, w, h, light, dark, width) => {
      c.fillStyle = light; c.fillRect(x, y, w, width); c.fillRect(x, y, width, h);
      c.fillStyle = dark; c.fillRect(x, y + h - width, w, width); c.fillRect(x + w - width, y, width, h);
    };
    // stiles meet at the bay edge: a dark joint, then the frame
    c.fillStyle = 'rgba(15, 8, 4, 0.75)';
    c.fillRect(0, 0, 3, H);
    // the moulding round the field (lit from above, as by the picture lights)
    inset(frame - 10, frame - 10, W - (frame - 10) * 2, H - (frame - 10) * 2, 'rgba(0, 0, 0, 0.42)', 'rgba(255, 214, 160, 0.16)', 6);
    inset(frame - 4, frame - 4, W - (frame - 4) * 2, H - (frame - 4) * 2, 'rgba(255, 214, 160, 0.2)', 'rgba(0, 0, 0, 0.4)', 4);
    // the raised field: a bevel and a slightly lighter face
    c.fillStyle = 'rgba(255, 220, 170, 0.05)';
    c.fillRect(frame + 10, frame + 10, W - (frame + 10) * 2, H - (frame + 10) * 2);
    inset(frame, frame, W - frame * 2, H - frame * 2, 'rgba(255, 214, 160, 0.12)', 'rgba(0, 0, 0, 0.3)', 10);
    texture.needsUpdate = true;
  };
  paint(null);
  imageLoader.load(`${ROOT}/dark_wood/diffuse.jpg`, (image) => paint(image));
  return texture;
}

// The soft warm pool a picture light throws on a case back (LOW tier stand-in
// for the case's point light: one additive textured quad, no lighting).
let lightPoolTexture = null;
export function museumLightPoolTexture() {
  if (lightPoolTexture) return lightPoolTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  // brightest just under the lamp, falling off down the case
  const g = c.createRadialGradient(size / 2, size * 0.18, 2, size / 2, size * 0.42, size * 0.62);
  g.addColorStop(0, 'rgba(255, 214, 150, 0.95)');
  g.addColorStop(0.35, 'rgba(255, 190, 120, 0.5)');
  g.addColorStop(0.7, 'rgba(255, 170, 100, 0.14)');
  g.addColorStop(1, 'rgba(255, 170, 100, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  lightPoolTexture = new THREE.CanvasTexture(canvas);
  lightPoolTexture.colorSpace = THREE.SRGBColorSpace;
  return lightPoolTexture;
}

function tiled(material, worldTile) {
  material.userData.worldTile = worldTile;
  return material;
}

export function createMuseumMaterialLibrary() {
  if (sharedLibrary) return sharedLibrary;

  const loader = new THREE.TextureLoader();
  const imageLoader = new THREE.ImageLoader();
  // Shell surfaces use world-scale UVs (graybox.js), so these repeat once
  // per UV unit and `worldTile` says how many metres one unit covers.
  const wallMaps = pbrSet(loader, 'beige_wall_001', 1, 1);
  const carpetMaps = pbrSet(loader, 'dirty_carpet', 1, 1);
  const woodMaps = pbrSet(loader, 'wood_table_001', 1, 1);
  const darkWoodMaps = pbrSet(loader, 'dark_wood', 1, 1);
  const wallcovering = museumWallcoveringTexture();
  const wallcoveringDark = museumWallcoveringTexture({ base: '#b9a27c', stripe: 'rgba(96, 64, 32, 0.09)', seed: 11 });
  const panelling = walnutPanelTexture(imageLoader);
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
    // upper walls: wallcovering colour over the plaster's normal/roughness
    wall: tiled(new THREE.MeshStandardMaterial({
      ...wallMaps,
      map: wallcovering,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0,
      normalScale: new THREE.Vector2(0.35, 0.35),
    }), 1.4),
    wallDark: tiled(new THREE.MeshStandardMaterial({
      ...wallMaps,
      map: wallcoveringDark,
      color: 0xffffff,
      roughness: 0.93,
      metalness: 0,
      normalScale: new THREE.Vector2(0.32, 0.32),
    }), 1.4),
    wallLower: tiled(new THREE.MeshStandardMaterial({
      ...wallMaps,
      color: 0xcfbd9b,
      roughness: 0.94,
      metalness: 0,
      normalScale: new THREE.Vector2(0.12, 0.12),
    }), 1.4),
    // lower walls: walnut panelling, one bay per 1.2 m
    wainscot: tiled(new THREE.MeshStandardMaterial({
      map: panelling,
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0,
    }), [1.2, 1.02]),
    carpet: tiled(new THREE.MeshStandardMaterial({
      ...carpetMaps,
      color: 0xa3927e,
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(0.42, 0.42),
    }), 2),
    carpetLane: tiled(new THREE.MeshStandardMaterial({
      ...carpetMaps,
      color: 0x6b5a48,
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(0.34, 0.34),
    }), 2),
    // walnut with grain (it was a flat brown: a normal map and no colour)
    deskWood: tiled(new THREE.MeshStandardMaterial({
      ...woodMaps,
      color: 0xe2cfb8,
      roughness: 0.7,
      metalness: 0,
      normalScale: new THREE.Vector2(0.2, 0.2),
    }), 1.1),
    deskWoodDark: tiled(new THREE.MeshStandardMaterial({
      ...woodMaps,
      color: 0xb29c88,
      roughness: 0.76,
      metalness: 0,
      normalScale: new THREE.Vector2(0.18, 0.18),
    }), 1.1),
    // case backboards: dark walnut, not black slabs
    walnutBack: tiled(new THREE.MeshStandardMaterial({
      ...darkWoodMaps,
      color: 0x9a765c,
      roughness: 0.72,
      metalness: 0,
      normalScale: new THREE.Vector2(0.16, 0.16),
    }), 0.9),
    brassTrim: new THREE.MeshStandardMaterial({
      color: 0xb08a4a,
      roughness: 0.34,
      metalness: 0.78,
      emissive: 0x1e1408,
    }),
    // the warm strip under a picture light
    lampGlow: new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false }),
    // vitrine plinths in walnut on a brass toe band, ivory linen decks
    displayPlinth: tiled(new THREE.MeshStandardMaterial({
      ...woodMaps,
      color: 0xb08868,
      roughness: 0.68,
      metalness: 0,
      normalScale: new THREE.Vector2(0.18, 0.18),
    }), 1.1),
    displayDeck: new THREE.MeshStandardMaterial({
      color: 0xe0d8bf,
      roughness: 0.88,
      metalness: 0,
    }),
    displayToeKick: new THREE.MeshStandardMaterial({
      color: 0x6e5530,
      roughness: 0.4,
      metalness: 0.7,
    }),
    caseChannel: new THREE.MeshStandardMaterial({
      color: 0x9a7a44,
      roughness: 0.36,
      metalness: 0.78,
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
