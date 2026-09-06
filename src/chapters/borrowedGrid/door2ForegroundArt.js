const ORIGINAL_BACKDROP_KEYS = Object.freeze([
  'door2-original-city-00',
  'door2-original-city-01',
  'door2-original-city-02',
]);

const ORIGINAL_BACKDROP_URLS = Object.freeze([
  new URL('../../assets/generated/worlds/world-04-retro-cyberpunk/chunk-00.jpg', import.meta.url).href,
  new URL('../../assets/generated/worlds/world-04-retro-cyberpunk/chunk-01.jpg', import.meta.url).href,
  new URL('../../assets/generated/worlds/world-04-retro-cyberpunk/chunk-02.jpg', import.meta.url).href,
]);

// Door 2 keeps the original cyberpunk city as atmosphere. The playable layer is
// now drawn in Phaser as one restrained line-art electrical diagram.
export function preloadDoor2Foreground(scene) {
  ORIGINAL_BACKDROP_KEYS.forEach((key, index) => {
    scene.load.image(key, ORIGINAL_BACKDROP_URLS[index]);
  });
}

export function originalBackdropTexture(index) {
  return ORIGINAL_BACKDROP_KEYS[index] ?? ORIGINAL_BACKDROP_KEYS[0];
}
