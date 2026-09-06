import generatedManifest from '../assets/generated/worlds/manifest.generated.json';
import { devParam } from '../devMode.js';

const generatedUrls = import.meta.glob('../assets/generated/worlds/**/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});

function textureKey(assetId, index) {
  return `world-asset:${assetId}:${index}`;
}

function urlFor(file) {
  const url = generatedUrls[`../assets/generated/worlds/${file}`];
  if (!url) throw new Error(`Missing bundled world asset: ${file}`);
  return url;
}

const assets = generatedManifest.assets.map((asset) => ({
  ...asset,
  chunks: asset.chunks.map((chunk, index) => ({
    ...chunk,
    textureKey: textureKey(asset.id, index),
    url: urlFor(chunk.file),
  })),
}));

const assetById = new Map(assets.map((asset) => [asset.id, asset]));
const assetByTexture = new Map();
assets.forEach((asset) => {
  asset.textureKeys.forEach((key) => assetByTexture.set(key, asset));
});

export function getWorldAsset(storyTextureKey) {
  const asset = assetByTexture.get(storyTextureKey);
  if (!asset) throw new Error(`No world asset is registered for ${storyTextureKey}`);
  return asset;
}

export function queueWorldAsset(loader, storyTextureKey) {
  const asset = getWorldAsset(storyTextureKey);
  asset.chunks.forEach((chunk) => {
    if (!loader.textureManager.exists(chunk.textureKey)) loader.image(chunk.textureKey, chunk.url);
  });
  return asset;
}

export function isWorldAssetLoaded(scene, storyTextureKey) {
  return getWorldAsset(storyTextureKey).chunks.every((chunk) =>
    scene.textures.exists(chunk.textureKey),
  );
}

// Backdrop-only preview: freezes the world index so a painting can be judged
// without walking the level. A dev route, so it reads through devParam() and
// returns null in a production build.
export function resolvePreviewWorldIndex(worlds, search = window.location.search) {
  const requested = devParam('world', search);
  if (!requested) return null;

  const numeric = Number(requested);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= worlds.length) return numeric - 1;
  const normalized = requested.toLowerCase();
  const index = worlds.findIndex(
    (world) => world.texture.toLowerCase() === normalized || getWorldAsset(world.texture).id === normalized,
  );
  return index >= 0 ? index : null;
}

export class WorldAssetLoader {
  constructor(scene) {
    this.scene = scene;
    this.pending = new Map();
    this.disposed = false;
  }

  load(storyTextureKey) {
    const asset = getWorldAsset(storyTextureKey);
    if (isWorldAssetLoaded(this.scene, storyTextureKey)) return Promise.resolve(asset);
    if (this.pending.has(asset.id)) return this.pending.get(asset.id);

    const promise = new Promise((resolve, reject) => {
      const loader = this.scene.load;
      queueWorldAsset(loader, storyTextureKey);

      const onComplete = () => {
        cleanup();
        if (this.disposed) return resolve(asset);
        if (isWorldAssetLoaded(this.scene, storyTextureKey)) resolve(asset);
        else reject(new Error(`World asset did not finish loading: ${asset.id}`));
      };
      const onLoadError = (file) => {
        if (!asset.chunks.some((chunk) => chunk.textureKey === file.key)) return;
        cleanup();
        reject(new Error(`Failed to load world texture: ${file.key}`));
      };
      const cleanup = () => {
        loader.off('complete', onComplete);
        loader.off('loaderror', onLoadError);
      };

      loader.once('complete', onComplete);
      loader.on('loaderror', onLoadError);
      if (!loader.isLoading()) loader.start();
    }).finally(() => this.pending.delete(asset.id));

    this.pending.set(asset.id, promise);
    return promise;
  }

  releaseExcept(storyTextureKeys) {
    const keep = new Set(storyTextureKeys.map((key) => getWorldAsset(key).id));
    for (const [assetId, asset] of assetById) {
      if (keep.has(assetId) || this.pending.has(assetId)) continue;
      asset.chunks.forEach((chunk) => {
        if (this.scene.textures.exists(chunk.textureKey)) this.scene.textures.remove(chunk.textureKey);
      });
    }
  }

  loadedAssetIds() {
    return assets
      .filter((asset) => asset.chunks.every((chunk) => this.scene.textures.exists(chunk.textureKey)))
      .map((asset) => asset.id);
  }

  destroy() {
    this.disposed = true;
  }
}
