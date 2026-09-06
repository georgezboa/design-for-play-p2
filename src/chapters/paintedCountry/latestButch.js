import idleUrl from './assets/butch-latest/frame-0.png?url';
import walk1Url from './assets/butch-latest/frame-1.png?url';
import walk2Url from './assets/butch-latest/frame-2.png?url';
import walk3Url from './assets/butch-latest/frame-3.png?url';

export const LATEST_BUTCH_KEYS = Object.freeze([
  'painted-butch-idle',
  'painted-butch-walk-1',
  'painted-butch-walk-2',
  'painted-butch-walk-3',
]);

const URLS = [idleUrl, walk1Url, walk2Url, walk3Url];

export function preloadLatestButch(scene) {
  LATEST_BUTCH_KEYS.forEach((key, index) => {
    if (!scene.textures.exists(key)) scene.load.image(key, URLS[index]);
  });
}

export function createLatestButch(scene, x, feetY, scale = 0.2, depth = 20) {
  return scene.add
    .image(x, feetY, LATEST_BUTCH_KEYS[0])
    .setOrigin(0.5, 1)
    .setScale(scale)
    .setDepth(depth);
}

export function animateLatestButch(sprite, time, { moving = false, airborne = false, facing = 1 } = {}) {
  const key = airborne
    ? LATEST_BUTCH_KEYS[2]
    : moving
      ? LATEST_BUTCH_KEYS[1 + (Math.floor(time / 120) % 3)]
      : LATEST_BUTCH_KEYS[0];
  sprite.setTexture(key).setFlipX(facing < 0);
  return key;
}
