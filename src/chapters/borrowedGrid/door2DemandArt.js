const key = (name) => `door2-demand-${name}`;

const ICON_URLS = Object.freeze({
  lift: new URL('../../assets/generated/door2-v3/icon-lift.png', import.meta.url).href,
  market: new URL('../../assets/generated/door2-v3/icon-market.png', import.meta.url).href,
  clinic: new URL('../../assets/generated/door2-v3/icon-clinic.png', import.meta.url).href,
  shelter: new URL('../../assets/generated/door2-v3/icon-shelter.png', import.meta.url).href,
  water: new URL('../../assets/generated/door2-v3/icon-water.png', import.meta.url).href,
  kitchen: new URL('../../assets/generated/door2-v3/icon-kitchen.png', import.meta.url).href,
});

export const districtArtId = (district) => (district === 'pump' ? 'water' : district);
export const demandIconTexture = (district) => key(districtArtId(district));

export function preloadDoor2DemandIcons(scene) {
  Object.entries(ICON_URLS).forEach(([district, url]) => {
    scene.load.image(demandIconTexture(district), url);
  });
}
