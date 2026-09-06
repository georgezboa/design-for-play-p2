export const CITY_PALETTE = Object.freeze({
  sky: 0x1a0f10,
  fog: 0x241517,
  stone: 0xc8a370,
  stoneEdge: 0x765332,
  street: 0x2a2021,
  earth: 0x130c0d,
  bronze: 0x65452f,
  iron: 0x1b2221,
  patina: 0x2c6d67,
  water: 0x285f65,
  amber: 0xf0b45f,
  teal: 0x5bd2c6,
  wine: 0x71352f,
});

// Shared time-of-day looks. Chapter 5 uses `night`; Chapter 3 keeps its
// existing look by default and can opt into the same night map later without
// copying geometry or placing a second set of lamps.
export const ECHO_CITY_LOOKS = Object.freeze({
  day: Object.freeze({
    sky: CITY_PALETTE.sky,
    fog: CITY_PALETTE.fog,
    fogDensity: 0.0085,
  }),
  night: Object.freeze({
    sky: 0x020306,
    fog: 0x07090d,
    fogDensity: 0.0085,
    lampColor: 0xff8a22,
  }),
});

// One authored street datum for procedural furniture, imported models and
// their supports. Keeping it here prevents props from inheriting arbitrary
// GLB authoring offsets and hovering above the Chapter 3 paving.
export const CITY_SURFACE_Y = 0.14;

export const ECHO_CITY_LAMP_POSITIONS = Object.freeze([
  [-8.8, 8.8], [8.8, 8.8], [-8.8, -8.8], [8.8, -8.8],
  [-23.5, 8], [-23.5, -8], [12, 8.5], [28.5, 7], [28.5, -7],
  [-6.5, -15.5], [10.8, -20.5],
  [-5, 27], [2.8, 37.8], [23, 38], [40.5, 34], [49.2, 15], [40.5, -6],
  [-40, -20.7], [-20, -20.7], [20, -20.7], [40, -20.7],
  [-40, 12.4], [40, 12.4], [-40, 38], [40, 38], [-20, 49], [20, 49],
]);

// This is a Chapter 5-owned snapshot of the Chapter 3 city geometry. It is
// deliberately namespaced so Chapter 3 can finish independently.
export const MODEL_ROOT = '/museum3d/echo-city/authority/models';

export const OUTER_CITY_GROUND = Object.freeze({
  baseSize: [282, 262],
  streetSize: [280, 260],
});

export const CAMERA_LIMITS = Object.freeze({
  minZoom: 2.4,
  maxZoom: 3.2,
  minPolarDeg: 54,
  maxPolarDeg: 57,
  minAzimuthDeg: 41,
  maxAzimuthDeg: 49,
});

// Inspection-only camera. Production play keeps the deliberately narrow
// isometric framing above; `?dev=1` or D opens the map for level-layout QA.
export const DEVELOPER_CAMERA_LIMITS = Object.freeze({
  minZoom: 0.72,
  maxZoom: 5.2,
  minPolarDeg: 24,
  maxPolarDeg: 82,
  minAzimuthDeg: -180,
  maxAzimuthDeg: 180,
});

export const CAMERA_FOLLOW = Object.freeze({
  deadzone: [3.2, 2.4],
  smoothingRate: 4.8,
  bounds: { minX: -50, maxX: 50, minZ: -22, maxZ: 52 },
});

export const WALKABLE_DISTRICT = Object.freeze({
  id: 'continuous-visible-district',
  center: [0, 15],
  size: [116, 86],
  shape: 'box',
});

// V3 old-town hierarchy: three through streets carry the critical path while
// two edge streets and two short civic lanes create T-junctions. Secondary
// streets are intentionally narrower than the arrival boulevard; this avoids
// the suburban six-lane grid that made every building read as an isolated prop.
export const DISTRICT_ROADS = Object.freeze([
  { id: 'north-market-street', center: [0, -25], size: [96, 5.2], sidewalkWidth: 1.1 },
  { id: 'arrival-boulevard', center: [0, 17], size: [102, 5.8], sidewalkWidth: 1.25 },
  { id: 'south-tram-street', center: [0, 43], size: [96, 6], sidewalkWidth: 1.2 },
  { id: 'west-edge-street', center: [-45, 8], size: [5.2, 74], sidewalkWidth: 1.1 },
  { id: 'east-edge-street', center: [45, 9], size: [5.2, 70], sidewalkWidth: 1.1 },
  { id: 'north-civic-lane', center: [7, -15], size: [4, 20], sidewalkWidth: 1, junction: 'T' },
  { id: 'south-civic-lane', center: [7, 34], size: [4, 18], sidewalkWidth: 1, junction: 'T' },
]);

// Deliberate raised-stone crossings close the apparent paving seams where a
// footway meets a road. They remain fully walkable and make each interruption
// read as an authored pedestrian crossing rather than a missing material tile.
export const DISTRICT_CROSSINGS = Object.freeze([
  { id: 'north-civic-crossing', center: [7, -25], size: [3.2, 5.2] },
  { id: 'arrival-west-crossing', center: [-12, 17], size: [3.2, 5.8] },
  { id: 'arrival-east-crossing', center: [20, 17], size: [3.2, 5.8] },
  { id: 'south-civic-crossing', center: [7, 43], size: [3.2, 6] },
]);

// Parcel audit approved against the actual player camera. Full masses are
// confined to the far north corners; foreground parcels stay low or open.
export const AUDITED_PARCELS = Object.freeze([
  { id: 'A', treatment: 'full', center: [-51, -45], size: [15, 14] },
  { id: 'B', treatment: 'full', center: [50, -45], size: [15, 14] },
  { id: 'C', treatment: 'low', center: [-14, -29], size: [8, 6] },
  { id: 'D', treatment: 'low', center: [16, -29], size: [8, 6] },
  { id: 'E', treatment: 'open', center: [-45, 18], size: [14, 18] },
  { id: 'F', treatment: 'low', center: [-28, 38], size: [10, 8] },
  { id: 'G', treatment: 'open', center: [24, 32], size: [20, 14] },
  { id: 'H', treatment: 'low', center: [-38, 60], size: [14, 11] },
  { id: 'I', treatment: 'low', center: [52, 51], size: [12, 11] },
]);

export const RAIL_LAYOUT = Object.freeze({
  start: [-8, 38],
  end: [-41, 15],
  gauge: 2.64,
  sleeperStep: 2,
  bedWidth: 9,
  exitCorridor: { center: [-39, 17], halfWidth: 5.5, headingDeg: 55 },
});

export const STATION_LAYOUT = Object.freeze({
  center: [-10.8, 30.6],
  rotationY: 55,
  modelRotationY: -35,
  // Match the authored station model's measured footprint after its 11.5x
  // world scale (about 4.45m x 11.78m). The previous 18m deck extended more
  // than three metres beyond either end of the visible station and created a
  // huge invisible/solid slab around the small waiting area.
  platformSize: [4.45, 11.8],
  canopyScale: 11.5,
  approach: [-6.5, 26],
});

export const TUNNEL_LAYOUT = Object.freeze({
  center: [-38.5, 0, 16.8],
  rotationY: 55,
  scale: 8.2,
});

// The Hunyuan portal is an architectural facade, not a complete tunnel. These
// measured procedural masses turn it into a rail cutting: the centre remains
// open to the track while the flanks are visibly and physically closed.
export const TUNNEL_TERRAIN = Object.freeze({
  depth: 18,
  width: 22,
  height: 9.5,
  throatWidth: 4.2,
  throatHeight: 4,
  obstacles: [
    { type: 'oriented-box', center: [-46.4, 18.8], size: [4.8, 13.5], rotationY: 55, padding: 0.1, sourceId: 'tunnel-bank-west' },
    { type: 'oriented-box', center: [-39.3, 8.7], size: [4.8, 13.5], rotationY: 55, padding: 0.1, sourceId: 'tunnel-bank-east' },
  ],
});

export const CITY_MODELS = Object.freeze([
  {
    id: 'archive',
    label: 'Old Municipal Archive',
    file: 'old_municipal_archive_web.glb',
    position: [-18, 0, -15.2],
    rotationY: 0,
    scale: 1,
  },
  {
    id: 'transit-ministry',
    label: 'Transit Ministry',
    file: 'transit_ministry_web.glb',
    position: [30.2, 0, -15.2],
    rotationY: 0,
    scale: 1,
  },
  {
    id: 'scanner-tower',
    label: 'Scanner Tower',
    file: 'scanner_tower_web.glb',
    position: [12.6, 0, -12],
    rotationY: 125,
    scale: 1,
  },
  {
    id: 'clock-tower',
    label: 'Central Clock',
    file: 'clock_tower_web.glb',
    position: [0, 0.34, 0],
    rotationY: -45,
    scale: 1.95,
  },
  {
    id: 'reunion-fountain',
    label: 'Reunion Fountain',
    file: 'reunion_fountain_web.glb',
    position: [20, 0.18, 0],
    rotationY: 0,
    scale: 1.12,
  },
  {
    id: 'municipal-tram',
    label: 'Municipal Tram',
    file: 'municipal_tram_web.glb',
    position: [-13.7, 0, 34],
    rotationY: 55,
    scale: 1,
    collision: { type: 'oriented-box', size: [2.8, 9.2], rotationY: 55, padding: 0.18 },
  },
  {
    id: 'municipal-tram-car-02',
    label: 'Municipal Tram Convoy',
    file: 'municipal_tram_web.glb',
    position: [-22.3, 0, 28],
    rotationY: 55,
    scale: 1,
    cloneOf: 'municipal-tram',
    category: 'boundary-transit',
    collision: { type: 'oriented-box', size: [2.8, 9.2], rotationY: 55, padding: 0.18 },
  },
  {
    id: 'municipal-tram-car-03',
    label: 'Municipal Tram Convoy',
    file: 'municipal_tram_web.glb',
    position: [-30.9, 0, 22],
    rotationY: 55,
    scale: 1,
    cloneOf: 'municipal-tram',
    category: 'boundary-transit',
    collision: { type: 'oriented-box', size: [2.8, 9.2], rotationY: 55, padding: 0.18 },
  },
  {
    id: 'market-stall-west',
    label: 'Produce Market',
    file: 'produce_market_stall_web.glb',
    position: [-20, 0, 3.5],
    rotationY: 0,
    scale: 1.12,
  },
  {
    id: 'market-stall-east',
    label: 'Produce Market',
    file: 'produce_market_stall_web.glb',
    position: [-20, 0, -3.5],
    rotationY: -180,
    scale: 1.12,
    cloneOf: 'market-stall-west',
  },
  {
    id: 'district-stall-c',
    label: 'North Market Kiosk',
    role: 'low parcel C street activity',
    category: 'district-decoration',
    file: 'produce_market_stall_web.glb',
    position: [-30, 0.5, -18],
    rotationY: 0,
    scale: 0.86,
    cloneOf: 'market-stall-west',
    alignToGround: true,
    auditParcel: 'C',
    collision: { type: 'box', size: [3.9, 2.9] },
  },
  {
    id: 'district-stall-d',
    label: 'North Flower Kiosk',
    role: 'low parcel D street activity',
    category: 'district-decoration',
    file: 'produce_market_stall_web.glb',
    position: [21.5, 0.5, -18],
    rotationY: 180,
    scale: 0.86,
    cloneOf: 'market-stall-west',
    alignToGround: true,
    auditParcel: 'D',
    collision: { type: 'box', size: [3.9, 2.9] },
  },
  {
    id: 'queue-dispenser',
    label: 'Municipal Queue Dispenser',
    role: 'arrival ticket ritual',
    category: 'prop',
    file: 'ch03_queue_dispenser.glb',
    position: [-6.8, 0.5, 12.4],
    rotationY: 0,
    scale: 1.9,
    alignToGround: true,
    // The GLB contains a hairline underside below the visible stone plinth.
    // Sink the authored object slightly so the plinth, not that hidden edge,
    // is what visibly meets the paving.
    groundSink: 0.09,
    collision: { type: 'circle', radius: 0.9 },
  },
  {
    id: 'produce-scale',
    label: 'Eda\'s Produce Scale',
    role: 'market weight routine',
    category: 'prop',
    file: 'ch03_produce_scale.glb',
    position: [-13.2, 0.5, 4.1],
    rotationY: 32,
    scale: 1.5,
    alignToGround: true,
    collision: { type: 'circle', radius: 1 },
  },
  {
    id: 'porter-handcart',
    label: 'Porter Handcart',
    role: 'repeatable porter route',
    category: 'prop',
    file: 'ch03_porter_handcart.glb',
    position: [-24.2, 0.5, -1.4],
    rotationY: -24,
    scale: 2.2,
    alignToGround: true,
    collision: { type: 'box', size: [2.8, 1.65], height: 0.72 },
  },
  {
    id: 'receipt-device',
    label: 'Receipt Roll and Spike',
    role: 'duplicate receipt evidence',
    category: 'prop',
    file: 'ch03_receipt_spike.glb',
    position: [-11.3, 0.5, -4.4],
    rotationY: 68,
    scale: 1.08,
    alignToGround: true,
    collision: { type: 'circle', radius: 0.72 },
  },
  {
    id: 'queue-stanchion',
    label: 'Queue Stanchion',
    role: 'bureaucratic queue boundary',
    category: 'prop',
    file: 'ch03_queue_stanchion.glb',
    position: [-5.8, 0.5, -11.1],
    rotationY: -18,
    scale: 1.7,
    alignToGround: true,
    collision: { type: 'box', size: [1.75, 0.8] },
  },
  {
    id: 'clerk-stamp-machine',
    label: 'Clerk Sava\'s Stamp Machine',
    role: 'duplicate-pass bureaucracy',
    category: 'prop',
    file: 'ch03_clerk_stamp_machine.glb',
    position: [-5.2, 1.34, -19.5],
    rotationY: 18,
    scale: 1.08,
    alignToGround: true,
    support: { type: 'counter', size: [1.65, 0.82, 1.1] },
    collision: { type: 'box', size: [1.75, 1.2] },
  },
  {
    id: 'crosswalk-signal',
    label: 'Civic Crosswalk Signal',
    role: 'traffic-pattern rehearsal',
    category: 'prop',
    file: 'ch03_crosswalk_signal.glb',
    position: [10.9, 0.5, -8.8],
    rotationY: 14,
    scale: 2.45,
    alignToGround: true,
    collision: { type: 'circle', radius: 0.48 },
  },
  {
    id: 'fountain-bench',
    label: 'Reunion Bench',
    role: 'Mara conversation anchor',
    category: 'prop',
    file: 'ch03_fountain_bench.glb',
    position: [20, 0.5, 8.2],
    rotationY: 0,
    scale: 2.75,
    alignToGround: true,
    collision: { type: 'box', size: [3.25, 1.15], height: 0.68 },
  },
  {
    id: 'district-bench-f',
    label: 'South Tramway Bench',
    role: 'low parcel F street rest point',
    category: 'district-decoration',
    file: 'ch03_fountain_bench.glb',
    position: [-28, 0.5, 38],
    rotationY: 90,
    scale: 2.35,
    cloneOf: 'fountain-bench',
    alignToGround: true,
    auditParcel: 'F',
    collision: { type: 'box', size: [2.5, 1.2], height: 0.68 },
  },
  {
    id: 'pa-speaker',
    label: 'Lockdown PA Speaker',
    role: 'civic countdown voice',
    category: 'prop',
    file: 'ch03_pa_speaker.glb',
    position: [10.9, 4.65, -19.2],
    rotationY: -145,
    scale: 1.18,
    alignToGround: true,
    support: { type: 'pole', height: 4.1 },
  },
  {
    id: 'night-ticket-reader',
    label: 'Night Train Ticket Reader',
    role: 'two-ticket boarding test',
    category: 'prop',
    file: 'ch03_night_ticket_reader.glb',
    position: [-4.5, 0.5, 29.5],
    rotationY: 55,
    scale: 1.9,
    alignToGround: true,
    groundY: 0.41,
    collision: { type: 'circle', radius: 0.96 },
  },
  {
    id: 'open-air-station',
    label: 'Night Service Open-Air Station',
    role: 'chapter departure platform',
    category: 'transit-architecture',
    file: 'ch03_open_air_station.glb',
    position: [STATION_LAYOUT.center[0], 0.5, STATION_LAYOUT.center[1]],
    rotationY: STATION_LAYOUT.modelRotationY,
    scale: STATION_LAYOUT.canopyScale,
    alignToGround: true,
    groundY: 0.41,
    collision: {
      type: 'oriented-box',
      size: [3.6, 1.2],
      rotationY: STATION_LAYOUT.modelRotationY,
    },
  },
  {
    id: 'tram-tunnel-portal',
    label: 'Municipal Tram Tunnel',
    role: 'visible chapter exit',
    category: 'transit-architecture',
    file: 'ch03_tram_tunnel_portal.glb',
    position: TUNNEL_LAYOUT.center,
    rotationY: TUNNEL_LAYOUT.rotationY,
    scale: TUNNEL_LAYOUT.scale,
    alignToGround: true,
  },
]);

// Dedicated Hunyuan perimeter prototypes are load-only assets. Their geometry
// and PBR maps are shared by every repeated instance, so the city can read as
// dense without downloading the same building more than once.
export const PERIMETER_MODEL_SOURCES = Object.freeze([
  {
    id: 'perimeter-tenement',
    label: 'Ochre Residential Tenement',
    file: 'ch03_perimeter_tenement.glb',
    category: 'perimeter-prototype',
  },
  {
    id: 'perimeter-corner-arcade',
    label: 'Corner Commercial Arcade',
    file: 'ch03_perimeter_corner_arcade.glb',
    category: 'perimeter-prototype',
  },
  {
    id: 'perimeter-workers-hall',
    label: 'Workers Cooperative Hall',
    file: 'ch03_perimeter_workers_hall.glb',
    category: 'perimeter-prototype',
  },
  {
    id: 'district-bakery-tenement',
    label: 'Bakery Tenement',
    file: 'ch03_shop_bakery_tenement.glb',
    category: 'perimeter-prototype',
  },
  {
    id: 'district-pharmacy-corner',
    label: 'Pharmacy Corner House',
    file: 'ch03_shop_pharmacy_corner.glb',
    category: 'perimeter-prototype',
  },
  {
    id: 'district-printworks-rowhouse',
    label: 'Printworks Rowhouse',
    file: 'ch03_shop_printworks_rowhouse.glb',
    category: 'perimeter-prototype',
  },
  {
    id: 'landmark-copper-heron-hotel',
    label: 'Copper Heron Hotel',
    file: 'ch03_landmark_copper_heron_hotel.glb',
    category: 'perimeter-prototype',
  },
  {
    id: 'landmark-civic-night-arcade',
    label: 'Civic Night Arcade',
    file: 'ch03_landmark_civic_night_arcade.glb',
    category: 'perimeter-prototype',
  },
]);

// Measured from the optimized runtime GLBs. Keeping the actual footprints in
// level data lets both placement QA and navigation use the same oriented box,
// instead of the oversized world-axis bounds that caused invisible corners.
export const PERIMETER_FOOTPRINTS = Object.freeze({
  'perimeter-tenement': [0.77013, 0.40767],
  'perimeter-corner-arcade': [0.72471, 0.78819],
  'perimeter-workers-hall': [1.03189, 0.59805],
  'district-bakery-tenement': [0.54237, 0.48273],
  'district-pharmacy-corner': [0.65891, 0.5642],
  'district-printworks-rowhouse': [0.8581, 0.6527],
  'landmark-copper-heron-hotel': [0.79572, 0.41895],
  'landmark-civic-night-arcade': [0.86967, 0.85999],
});

// Runtime bounds measured from the optimized GLBs. Hunyuan delivered the
// prototypes at unrelated native heights, so one scalar made the bakery almost
// four times taller than the workers hall. Horizontal scale still controls the
// authored frontage; vertical scale is derived from a consistent tier height.
export const PERIMETER_MODEL_DIMENSIONS = Object.freeze({
  'perimeter-tenement': [0.77013, 0.86428, 0.40767],
  'perimeter-corner-arcade': [0.72471, 0.7107, 0.78819],
  'perimeter-workers-hall': [1.03189, 0.55718, 0.59805],
  'district-bakery-tenement': [0.54237, 0.99448, 0.48273],
  'district-pharmacy-corner': [0.65891, 0.86694, 0.56928],
  'district-printworks-rowhouse': [0.8581, 0.72784, 0.6527],
  'landmark-copper-heron-hotel': [0.79572, 0.80831, 0.41895],
  'landmark-civic-night-arcade': [0.86967, 0.60653, 0.85999],
});

const BUILDING_HEIGHT_BY_TIER = Object.freeze({
  backdrop: 15.5,
  skyline: 15,
  side: 14,
  low: 13,
  infill: 14,
  landmark: 17.5,
});

export function boundaryScaleFor(spec) {
  const dimensions = PERIMETER_MODEL_DIMENSIONS[spec.prototype];
  const targetHeight = spec.height ?? BUILDING_HEIGHT_BY_TIER[spec.tier] ?? 10.5;
  return [
    spec.frontage ? spec.frontage / dimensions[0] : spec.scale * (spec.stretchX ?? 1),
    targetHeight / dimensions[1],
    spec.depth ? spec.depth / dimensions[2] : spec.scale * (spec.stretchZ ?? 1),
  ];
}

// Dense Mediterranean street walls. Adjacent buildings share a common setback
// and leave only service-width seams, so the camera reads blocks and roof layers
// rather than collectible models placed around a board. The far north row adds
// a second depth layer; foreground masses stay lower to preserve player sight.
export const PERIMETER_BUILDINGS = Object.freeze([
  // Main north frontage, immediately behind the north-market street.
  { id: 'north-a-corner', prototype: 'perimeter-corner-arcade', position: [-51, 0, -35.1], rotationY: 0, scale: 15, frontage: 11.7, tier: 'skyline', auditParcel: 'A' },
  { id: 'north-bakery-west', prototype: 'district-bakery-tenement', position: [-39.1, 0, -34.1], rotationY: 0, scale: 20, frontage: 11.8, tier: 'skyline' },
  { id: 'north-tenement-west', prototype: 'perimeter-tenement', position: [-26.5, 0, -32.5], rotationY: 0, scale: 16, frontage: 13.1, tier: 'skyline' },
  { id: 'north-printworks', prototype: 'district-printworks-rowhouse', position: [-12.9, 0, -34.1], rotationY: 0, scale: 15, frontage: 13.8, tier: 'skyline' },
  { id: 'civic-night-arcade', prototype: 'landmark-civic-night-arcade', position: [1, 0, -35.7], rotationY: 0, scale: 15, frontage: 13.7, tier: 'landmark', role: 'interactive-landmark' },
  { id: 'north-pharmacy', prototype: 'district-pharmacy-corner', position: [14.2, 0, -34.1], rotationY: 0, scale: 17, frontage: 12.4, tier: 'skyline' },
  { id: 'north-bakery-east', prototype: 'district-bakery-tenement', position: [26.3, 0, -34.1], rotationY: 0, scale: 20, frontage: 11.5, tier: 'skyline' },
  { id: 'north-corner-east', prototype: 'perimeter-corner-arcade', position: [38.2, 0, -35.1], rotationY: 0, scale: 15, frontage: 12, tier: 'skyline' },
  { id: 'north-b-tenement', prototype: 'perimeter-tenement', position: [50, 0, -32.1], rotationY: 0, scale: 14, frontage: 11.3, tier: 'skyline', auditParcel: 'B' },

  // A staggered rear roofline creates the layered old-town silhouette.
  { id: 'backdrop-workers-west', prototype: 'perimeter-workers-hall', position: [-50, 0, -47.3], rotationY: 0, scale: 11, frontage: 12.8, tier: 'backdrop' },
  { id: 'backdrop-tenement-west', prototype: 'perimeter-tenement', position: [-37, 0, -46.9], rotationY: 0, scale: 14, frontage: 12.8, tier: 'backdrop' },
  { id: 'backdrop-printworks-west', prototype: 'district-printworks-rowhouse', position: [-23, 0, -48.3], rotationY: 0, scale: 13, frontage: 13.8, tier: 'backdrop' },
  { id: 'backdrop-bakery', prototype: 'district-bakery-tenement', position: [-9, 0, -48.4], rotationY: 0, scale: 18, frontage: 12.8, tier: 'backdrop' },
  { id: 'backdrop-tenement-center', prototype: 'perimeter-tenement', position: [4, 0, -46.9], rotationY: 0, scale: 14, frontage: 12.8, tier: 'backdrop' },
  { id: 'backdrop-pharmacy', prototype: 'district-pharmacy-corner', position: [17, 0, -48.6], rotationY: 0, scale: 16, frontage: 12.8, tier: 'backdrop' },
  { id: 'backdrop-printworks-east', prototype: 'district-printworks-rowhouse', position: [31, 0, -48.3], rotationY: 0, scale: 13, frontage: 13.8, tier: 'backdrop' },
  { id: 'backdrop-tenement-east', prototype: 'perimeter-tenement', position: [45, 0, -46.9], rotationY: 0, scale: 14, frontage: 13.8, tier: 'backdrop' },

  // West street wall. It stops before the tram cutting, then resumes south.
  { id: 'west-bakery-north', prototype: 'district-bakery-tenement', position: [-53.3, 0, -14], rotationY: 90, scale: 18, frontage: 10.8, tier: 'side' },
  { id: 'west-tenement-mid', prototype: 'perimeter-tenement', position: [-52, 0, -3], rotationY: 90, scale: 15, frontage: 10.8, tier: 'side' },
  { id: 'west-workers-mid', prototype: 'perimeter-workers-hall', position: [-52.2, 0, 7.2], rotationY: 90, scale: 11, frontage: 9.4, tier: 'low' },
  { id: 'west-pharmacy-south', prototype: 'perimeter-tenement', position: [-51.7, 0, 27], rotationY: 90, scale: 13, frontage: 11.2, tier: 'side' },
  { id: 'west-printworks-south', prototype: 'district-printworks-rowhouse', position: [-52.2, 0, 36.4], rotationY: 90, scale: 11, frontage: 7.4, tier: 'side' },

  // East street wall includes the hotel as a continuous frontage, not an island.
  { id: 'east-workers-north', prototype: 'perimeter-workers-hall', position: [52.2, 0, -14], rotationY: -90, scale: 11, frontage: 10.5, tier: 'low' },
  { id: 'copper-heron-hotel', prototype: 'landmark-copper-heron-hotel', position: [52.3, 0, -3.4], rotationY: -90, scale: 16, frontage: 10.4, tier: 'landmark', role: 'interactive-landmark' },
  { id: 'east-tenement-mid', prototype: 'perimeter-tenement', position: [52, 0, 7.4], rotationY: -90, scale: 15, frontage: 10.8, tier: 'side' },
  { id: 'east-bakery-south', prototype: 'district-bakery-tenement', position: [53.3, 0, 27], rotationY: -90, scale: 18, frontage: 11.2, tier: 'side' },
  { id: 'east-tenement-tail', prototype: 'perimeter-tenement', position: [52.2, 0, 36.4], rotationY: -90, scale: 12, frontage: 7.4, tier: 'side' },

  // Low foreground wall: dense enough to enclose, short enough for the camera.
  { id: 'south-h-printworks', prototype: 'district-printworks-rowhouse', position: [-50, 0, 51.1], rotationY: 180, scale: 11, frontage: 10.8, tier: 'low', auditParcel: 'H' },
  { id: 'south-workers-west', prototype: 'perimeter-workers-hall', position: [-39, 0, 50.2], rotationY: 180, scale: 9, frontage: 10.8, tier: 'low' },
  { id: 'south-tenement-west', prototype: 'perimeter-tenement', position: [-28, 0, 49.8], rotationY: 180, scale: 11, frontage: 10.8, tier: 'low' },
  { id: 'south-bakery', prototype: 'district-bakery-tenement', position: [-17, 0, 50.4], rotationY: 180, scale: 12, frontage: 10.8, tier: 'low' },
  { id: 'south-tenement-center', prototype: 'perimeter-tenement', position: [-6, 0, 49.8], rotationY: 180, scale: 11, frontage: 10.8, tier: 'low' },
  { id: 'south-pharmacy', prototype: 'district-printworks-rowhouse', position: [5, 0, 50.5], rotationY: 180, scale: 10, frontage: 10.8, tier: 'low' },
  { id: 'south-tenement-east', prototype: 'perimeter-tenement', position: [16, 0, 49.8], rotationY: 180, scale: 11, frontage: 10.8, tier: 'low' },
  { id: 'south-workers-east', prototype: 'perimeter-workers-hall', position: [27, 0, 50.2], rotationY: 180, scale: 9, frontage: 10.8, tier: 'low' },
  { id: 'south-printworks-east', prototype: 'district-printworks-rowhouse', position: [38, 0, 51.1], rotationY: 180, scale: 11, frontage: 10.8, tier: 'low' },
  { id: 'south-i-corner', prototype: 'perimeter-tenement', position: [49, 0, 49.4], rotationY: 180, scale: 9, frontage: 10.8, tier: 'low', auditParcel: 'I' },

  // A short inner frontage embeds the archive into a block without closing the
  // market or transit routes. These end before the civic lane and plaza.
  { id: 'market-row-printworks', prototype: 'district-printworks-rowhouse', position: [-32.5, 0, -17.4], rotationY: 0, scale: 11, frontage: 15, tier: 'infill' },
  { id: 'market-row-bakery', prototype: 'district-bakery-tenement', position: [-4.5, 0, -18.1], rotationY: 0, scale: 12, frontage: 13, tier: 'infill' },
  { id: 'market-west-tenement', prototype: 'perimeter-tenement', position: [-34, 0, -4], rotationY: 90, scale: 11, frontage: 14, tier: 'infill' },
  { id: 'market-west-bakery', prototype: 'district-bakery-tenement', position: [-34, 0, 8.5], rotationY: 90, scale: 14, frontage: 10.8, tier: 'infill' },
  // East of the civic core, two short attached frontages complete a compact
  // block around the fountain. The arrival boulevard stays fully open between
  // them; the buildings sit on its setbacks instead of floating in the parcel.
  { id: 'east-civic-printworks', prototype: 'district-printworks-rowhouse', position: [37.4, 0, -6], rotationY: 90, scale: 11, frontage: 10, tier: 'infill' },
  { id: 'east-civic-bakery', prototype: 'district-bakery-tenement', position: [37.6, 0, 7], rotationY: 90, scale: 14, frontage: 13.6, tier: 'infill' },
  { id: 'east-south-printworks', prototype: 'district-printworks-rowhouse', position: [18, 0, 24.8], rotationY: 0, scale: 10, frontage: 9.3, tier: 'infill' },
  { id: 'east-south-bakery', prototype: 'district-bakery-tenement', position: [27.5, 0, 24.8], rotationY: 0, scale: 14, frontage: 9.3, tier: 'infill' },
  { id: 'east-south-pharmacy', prototype: 'perimeter-tenement', position: [36.2, 0, 24.8], rotationY: 0, scale: 10, frontage: 7.9, tier: 'infill' },
  // A lower rear roofline faces the tram street. Together the two rows occupy
  // the parcel as a real urban block, with only a service alley between them.
  { id: 'east-south-rear-workers', prototype: 'perimeter-workers-hall', position: [18, 0, 36.3], rotationY: 0, scale: 7, frontage: 8.8, tier: 'infill' },
  { id: 'east-south-rear-tenement', prototype: 'perimeter-tenement', position: [27, 0, 36.3], rotationY: 0, scale: 9, frontage: 8.8, tier: 'infill' },
  { id: 'east-south-rear-pharmacy', prototype: 'district-printworks-rowhouse', position: [36, 0, 36.3], rotationY: 0, scale: 7, frontage: 8.8, tier: 'infill' },
]);

export const COURTS = Object.freeze([
  { id: 'arrival', center: [0, 16.25], size: [21, 12.5], shape: 'box' },
  { id: 'market', center: [-17.25, 0.25], size: [19.5, 22.5], shape: 'box' },
  { id: 'clock', center: [0, 0], radius: 13.2, shape: 'octagon' },
  { id: 'transit', center: [2, -15.25], size: [23, 15.5], shape: 'box' },
  { id: 'fountain', center: [20.25, 0], radius: 10.8, shape: 'octagon' },
  { id: 'station-apron', center: [-8.5, 29.5], size: [18, 13], shape: 'box', rotationY: 55, style: 'outer-street' },
  { id: 'south-boulevard', center: [8, 39.5], size: [52, 11], shape: 'box', style: 'outer-street' },
  { id: 'southeast-square', center: [35, 36], size: [20, 15], shape: 'box', style: 'outer-street' },
  { id: 'east-boulevard', center: [48, 11], size: [11, 54], shape: 'box', style: 'outer-street' },
  {
    id: 'night-platform',
    center: STATION_LAYOUT.center,
    size: STATION_LAYOUT.platformSize,
    shape: 'box',
    rotationY: STATION_LAYOUT.rotationY,
    style: 'platform',
  },
]);

export const HIDDEN_WALK_ZONES = Object.freeze([
  { id: 'north-behind-skyline', center: [0, -53], size: [132, 50], reason: 'behind the far north building row' },
  { id: 'west-behind-facades', center: [-54, -17], size: [16, 28], reason: 'occluded behind the northwest facade row' },
]);

export const WORLD_NODES = Object.freeze({
  c_n: [0, -7], c_ne: [5, -5], c_e: [7, 0], c_se: [5, 5],
  c_s: [0, 7], c_sw: [-5, 5], c_w: [-7, 0], c_nw: [-5, -5],
  t_door: [0, 17], t_plat: [0, 13.5], t_sw: [-6.5, 13],
  m_entry: [-12, 9.5], m_plaza: [-16, 4.5], m_group: [-15.8, 7.2],
  m_stalls: [-19.5, 0], m_east: [-15, -0.5], m_gateE: [-10.5, -0.5],
  m_north: [-16, -5], tr_s: [0, -10], tr_bus: [-2.5, -17.5],
  tr_e: [4, -14.5], tr_ne: [8, -12.5], f_nw: [14.8, -5.5],
  f_n: [20, -6.5], f_ne: [24.5, -3], f_pad: [25.4, 1.2],
  f_bell: [23.6, 4.6], f_s: [20, 6.5], f_mark: [15.2, 5],
  f_w: [13.8, 0.5],
  outer_arrival: [-4.5, 22.5], station_entry: [-7, 27], station_platform: [-9.8, 30.5],
  south_w: [-3, 37], south_mid: [12, 39.5], south_e: [31, 38],
  east_s: [43, 34], east_mid: [47, 14], east_n: [45, -10],
});

export const WORLD_EDGES = Object.freeze([
  ['c_n', 'c_ne'], ['c_ne', 'c_e'], ['c_e', 'c_se'], ['c_se', 'c_s'],
  ['c_s', 'c_sw'], ['c_sw', 'c_w'], ['c_w', 'c_nw'], ['c_nw', 'c_n'],
  ['t_door', 't_plat'], ['t_plat', 't_sw'], ['t_sw', 'm_entry'],
  ['m_entry', 'm_plaza'], ['m_plaza', 'm_group'], ['m_plaza', 'm_stalls'],
  ['m_stalls', 'm_north'], ['m_stalls', 'm_east'], ['m_east', 'm_group'],
  ['m_east', 'm_gateE'], ['m_gateE', 'c_w'], ['c_n', 'tr_s'],
  ['tr_s', 'tr_bus'], ['tr_s', 'tr_e'], ['tr_bus', 'tr_e'], ['tr_e', 'tr_ne'],
  ['tr_ne', 'f_nw'], ['f_nw', 'f_n'], ['f_n', 'f_ne'], ['f_ne', 'f_pad'],
  ['f_pad', 'f_bell'], ['f_bell', 'f_s'], ['f_s', 'f_mark'],
  ['f_mark', 'f_w'], ['f_w', 'f_nw'],
  ['t_door', 'outer_arrival'], ['outer_arrival', 'station_entry'], ['station_entry', 'station_platform'],
  ['outer_arrival', 'south_w'], ['south_w', 'south_mid'], ['south_mid', 'south_e'],
  ['south_e', 'east_s'], ['east_s', 'east_mid'], ['east_mid', 'east_n'],
]);

export const OBSTACLES = Object.freeze([
  // Collision follows the actual stone plinths, not the models' decorative
  // overhangs. These are true circles at runtime, so their corners no longer
  // create several metres of invisible blockage around the civic square.
  { type: 'circle', center: [0, 0], radius: 3.2, sourceId: 'clock-tower' },
  { type: 'circle', center: [20, 0], radius: 3.65, sourceId: 'reunion-fountain' },
  { type: 'circle', center: [12.6, -12], radius: 0.92, sourceId: 'scanner-tower' },
  { type: 'box', center: [-20, 3.5], size: [4.6, 3.4] },
  { type: 'box', center: [-20, -3.5], size: [4.6, 3.4] },
  { type: 'box', center: [-18, -15.2], size: [14, 8], padding: 0.25, sourceId: 'archive' },
  { type: 'box', center: [30.2, -15.2], size: [11, 8], padding: 0.25, sourceId: 'transit-ministry' },
]);

export const CAMERA_HOME = Object.freeze({
  position: [52, 82, 65],
  target: [1.5, 0.8, 13],
  zoom: 2.5,
});

export const CAMERA_FOCUS_TARGETS = Object.freeze({
  arrival: [0, 0.8, 16],
  market: [-17, 0.8, 0],
  transit: [2, 0.8, -15],
  fountain: [20, 0.8, 0],
  station: [-12, 0.8, 29],
  tunnel: [-35, 0.8, 19],
});
