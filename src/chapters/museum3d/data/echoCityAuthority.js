// Chapter 5 reads Echo City from this frozen Chapter 3 authority snapshot.
// Do not invent a second city layout in the museum scene.  When Chapter 3
// changes intentionally, update this version and its contract tests together.

export const ECHO_CITY_AUTHORITY = Object.freeze({
  id: 'chapter-3-echo-city-v68',
  sourceBaseCommit: 'bbc91ec563b5e48340936de90a5c9b18a970f7dd',
  sourceNote: 'v68 spatial snapshot from the Chapter 3 working tree, 2026-08-09',
  // The complete v68 south frontage occupies z≈47.1–54. The old z=49
  // entry was therefore inside an actual Chapter 3 building. This anchor is
  // on the south tram street, facing north into the city, with the Chapter 5
  // return threshold mounted on (not behind) the frontage.
  entrance: Object.freeze({ x: 0, z: 44.5, yaw: 0 }),
  returnThreshold: Object.freeze({ x: 0, z: 46.9, w: 5.2, d: 1.0 }),
  bounds: Object.freeze({ minX: -52, maxX: 52, minZ: -34, maxZ: 52 }),
  roads: Object.freeze([
    Object.freeze({ id: 'north-market-street', x: 0, z: -25, w: 96, d: 5.2 }),
    Object.freeze({ id: 'arrival-boulevard', x: 0, z: 17, w: 102, d: 5.8 }),
    Object.freeze({ id: 'south-tram-street', x: 0, z: 43, w: 96, d: 6 }),
    Object.freeze({ id: 'west-edge-road', x: -45, z: 8, w: 5.2, d: 74 }),
    Object.freeze({ id: 'east-edge-road', x: 45, z: 9, w: 5.2, d: 70 }),
    Object.freeze({ id: 'north-civic-lane', x: 7, z: -15, w: 4, d: 20 }),
    Object.freeze({ id: 'south-civic-lane', x: 7, z: 34, w: 4, d: 18 }),
  ]),
  landmarks: Object.freeze([
    Object.freeze({ id: 'clock-tower', model: 'clockTower', x: 0, z: 0, yaw: 0, size: [5.5, 14, 5.5] }),
    Object.freeze({ id: 'reunion-fountain', model: 'fountain', x: 20, z: 0, yaw: 0, size: [8.5, 3.2, 8.5] }),
    Object.freeze({ id: 'municipal-archive', model: 'archive', x: -18, z: -15.2, yaw: 0, size: [15, 8, 9] }),
    Object.freeze({ id: 'transit-ministry', model: 'ministry', x: 30.2, z: -15.2, yaw: Math.PI, size: [16, 9, 10] }),
    Object.freeze({ id: 'north-market-stall', model: 'marketStall', x: -20, z: -3.5, yaw: 0, size: [6, 3.6, 4] }),
    Object.freeze({ id: 'south-market-stall', model: 'marketStall', x: -20, z: 3.5, yaw: Math.PI, size: [6, 3.6, 4] }),
    Object.freeze({ id: 'municipal-tram', model: 'tram', x: -13.7, z: 34, yaw: Math.PI / 2, size: [4.2, 4, 16] }),
  ]),
  encounters: Object.freeze({
    oilSeam: Object.freeze({ x: 7, z: 13.2 }),
    eda: Object.freeze({ x: -16.2, z: 5.8 }),
    olek: Object.freeze({ x: 12.5, z: -8.5 }),
    petar: Object.freeze({ x: 25.0, z: -8.3 }),
    archive: Object.freeze({ x: -8.8, z: -13.0 }),
  }),
});

export const ECHO_CITY_REQUIRED_LANDMARKS = Object.freeze([
  'clock-tower',
  'reunion-fountain',
  'municipal-archive',
  'transit-ministry',
  'north-market-stall',
  'south-market-stall',
  'municipal-tram',
]);
