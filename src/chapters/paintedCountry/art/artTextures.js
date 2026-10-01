// Chapter 4 // THE PAINTED COUNTRY — the drawn country, as Phaser textures.
//
// Every painter in this folder draws into plain canvases once; this file
// turns them into textures (once per game: the texture manager outlives a
// scene restart) and lays them out as images. Nothing here draws per frame:
// a colour "returning" is an alpha tween on a wash image that already exists.

import { COLOUR_GROUPS } from './countryArt.js';

const layerMeta = new Map();

export function ensureCanvasTexture(scene, key, make) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, make());
  return key;
}

// Registers an ArtLayers (countryArt.js artLayers) under `key`, building it
// only if this game has not already.
export function ensureLayers(scene, key, build) {
  if (!scene.textures.exists(`${key}:pencil`)) {
    const L = build();
    scene.textures.addCanvas(`${key}:pencil`, L.pencil);
    Object.entries(L.washes).forEach(([id, { canvas }]) => scene.textures.addCanvas(`${key}:wash:${id}`, canvas));
    layerMeta.set(key, { w: L.w, h: L.h, washScale: L.washScale, scale: L.scale, groups: Object.keys(L.washes) });
  }
  return layerMeta.get(key);
}

// Lays a registered ArtLayers out at (x, y): its washes (one image per
// colour group, in a fixed order) under its pencil. `washAlpha` is the
// starting alpha for every wash (0 = still pencil only).
export function addLayers(scene, key, build, { x = 0, y = 0, depth = 0, scrollFactor = 1, washAlpha = 1, pencilAlpha = 1, groups = COLOUR_GROUPS, container = null } = {}) {
  const meta = ensureLayers(scene, key, build);
  const scale = 1 / (meta.scale ?? 1);
  const add = (obj) => { if (container) container.add(obj); return obj; };
  const washes = {};
  groups.filter((id) => meta.groups.includes(id)).forEach((id, i) => {
    washes[id] = add(scene.add.image(x, y, `${key}:wash:${id}`)
      .setOrigin(0)
      .setScale(scale / meta.washScale)
      .setDepth(depth + i * 0.01)
      .setScrollFactor(scrollFactor)
      .setAlpha(washAlpha));
  });
  const pencil = add(scene.add.image(x, y, `${key}:pencil`).setOrigin(0).setScale(scale).setDepth(depth + 0.1).setScrollFactor(scrollFactor).setAlpha(pencilAlpha));
  return {
    pencil,
    washes,
    meta,
    // Rosa's colour comes back: the wash blooms in over the pencil.
    bloom(id, { duration = 1100, delay = 0, to = 1 } = {}) {
      const image = washes[id];
      if (!image) return null;
      scene.tweens.killTweensOf(image);
      return scene.tweens.add({ targets: image, alpha: to, duration, delay, ease: 'Sine.easeOut' });
    },
    bloomAll(opts = {}) { Object.keys(washes).forEach((id, i) => this.bloom(id, { ...opts, delay: (opts.delay ?? 0) + i * (opts.stagger ?? 0) })); },
    setWash(id, alpha) { washes[id]?.setAlpha(alpha); },
    images() { return [...Object.values(washes), pencil]; },
  };
}

// A pencil + neutral wash pair (train parts, residents' clothes, studio
// keepsakes): two textures, the wash tinted by the scene.
export function ensurePair(scene, key, make) {
  if (!scene.textures.exists(`${key}:pencil`)) {
    const pair = make();
    scene.textures.addCanvas(`${key}:pencil`, pair.pencil);
    scene.textures.addCanvas(`${key}:wash`, pair.wash);
  }
  return { pencil: `${key}:pencil`, wash: `${key}:wash` };
}

// Adds numbered frames to a canvas texture (strips and atlases).
export function addFrames(scene, key, frames) {
  const texture = scene.textures.get(key);
  frames.forEach(({ name, x, y, w, h }) => { if (!texture.has(name)) texture.add(name, 0, x, y, w, h); });
  return texture;
}
