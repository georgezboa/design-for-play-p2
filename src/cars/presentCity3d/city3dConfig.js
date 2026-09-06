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

export const MODEL_ROOT = '/assets/chapter03-3d/models';

export const OUTER_CITY_GROUND = Object.freeze({
  baseSize: [160, 150],
  streetSize: [158, 148],
});

export const CAMERA_LIMITS = Object.freeze({
  minZoom: 2.85,
  maxZoom: 2.85,
  minPolarDeg: 45,
  maxPolarDeg: 48,
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
  bounds: { minX: -43, maxX: 43, minZ: -18, maxZ: 47 },
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

// One continuous civic carpet replaces the intersecting sidewalk strips that
// previously cut the clock/fountain square into unrelated patches.
export const CIVIC_PLAZA_PAVING = Object.freeze({
  center: [10, 0.5],
  insetScale: 0.985,
  points: [
    [-13, -10], [4, -12.5], [11, -10.5], [27, -10], [33, -5],
    [32, 6.5], [26, 11], [8, 11.5], [2, 13], [-11.5, 9],
  ],
});

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
  platformSize: [4.6, 18],
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
  depth: 26,
  width: 30,
  height: 9.5,
  throatWidth: 4.2,
  throatHeight: 4,
  obstacles: [
    { type: 'oriented-box', center: [-46.4, 18.8], size: [4.8, 13.5], rotationY: 55, padding: 0.1, sourceId: 'tunnel-bank-west' },
    { type: 'oriented-box', center: [-39.3, 8.7], size: [4.8, 13.5], rotationY: 55, padding: 0.1, sourceId: 'tunnel-bank-east' },
    { type: 'oriented-box', center: [-47.1, 10.8], size: [28, 10], rotationY: 55, padding: 0.2, sourceId: 'tunnel-rear-ridge' },
    // The portal is a chapter-exit facade in this build, not a traversable
    // tunnel. A shallow cross-piece at the dark throat prevents the player
    // walking through the visible arch while leaving the approach readable.
    { type: 'oriented-box', center: [-38, 19], size: [5.8, 1.8], rotationY: 55, padding: 0.12, sourceId: 'tunnel-mouth-stop' },
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
    occludesPlayer: true,
  },
  {
    id: 'transit-ministry',
    label: 'Transit Ministry',
    file: 'transit_ministry_web.glb',
    position: [30.2, 0, -15.2],
    rotationY: 0,
    scale: 1,
    occludesPlayer: true,
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
    id: 'derelict-boundary-tram-lower',
    label: 'Derelict Boundary Car',
    file: 'municipal_tram_web.glb',
    position: [48.3, 0.22, 44.8],
    rotationY: -33,
    scale: 0.92,
    cloneOf: 'municipal-tram',
    category: 'boundary-transit',
    collision: { type: 'oriented-box', size: [2.8, 9.2], rotationY: -33, padding: 0.25 },
  },
  {
    id: 'derelict-boundary-tram-upper',
    label: 'Roadside Derelict Car',
    file: 'municipal_tram_web.glb',
    position: [51.6, 0.24, 43.2],
    rotationY: 11,
    scale: 0.82,
    cloneOf: 'municipal-tram',
    category: 'boundary-transit',
    collision: { type: 'oriented-box', size: [2.8, 9.2], rotationY: 11, padding: 0.25 },
  },
  {
    id: 'abandoned-car-southeast',
    label: 'Abandoned Compact Car',
    file: 'ch03_abandoned_compact_car.glb',
    position: [53.2, 0.5, 47.1],
    rotationY: 17,
    scale: 3.85,
    alignToGround: true,
    category: 'boundary-vehicle',
    collision: { type: 'oriented-box', size: [4.45, 1.9], rotationY: 17, padding: 0.18 },
  },
  {
    id: 'abandoned-car-southwest',
    label: 'Abandoned Compact Car',
    file: 'ch03_abandoned_compact_car.glb',
    position: [-56, 0.5, 31],
    rotationY: 64,
    scale: 3.7,
    alignToGround: true,
    cloneOf: 'abandoned-car-southeast',
    category: 'boundary-vehicle',
    collision: { type: 'oriented-box', size: [4.3, 1.85], rotationY: 64, padding: 0.18 },
  },
  {
    id: 'abandoned-car-west-mid',
    label: 'Abandoned Compact Car',
    file: 'ch03_abandoned_compact_car.glb',
    position: [-56.6, 0.5, 35.8],
    rotationY: 100,
    scale: 3.65,
    alignToGround: true,
    cloneOf: 'abandoned-car-southeast',
    category: 'boundary-vehicle',
    collision: { type: 'oriented-box', size: [4.25, 1.85], rotationY: 100, padding: 0.18 },
  },
  {
    id: 'abandoned-car-northeast',
    label: 'Abandoned Compact Car',
    file: 'ch03_abandoned_compact_car.glb',
    position: [44.8, 0.5, -28.1],
    rotationY: 0,
    scale: 3.85,
    alignToGround: true,
    cloneOf: 'abandoned-car-southeast',
    category: 'boundary-vehicle',
    collision: { type: 'oriented-box', size: [4.45, 1.9], rotationY: 0, padding: 0.2 },
  },
  {
    id: 'street-campfire',
    label: 'Street Campfire',
    file: 'ch03_street_campfire.glb',
    position: [-52.8, 0.5, 34],
    rotationY: 18,
    scale: 1.35,
    alignToGround: true,
    category: 'street-dressing',
    collision: { type: 'circle', radius: 0.95 },
  },
  {
    id: 'crushed-trash-can-01',
    label: 'Crushed Municipal Trash Can',
    file: 'ch03_crushed_trash_can.glb',
    position: [-39.5, 0.5, -20.5],
    rotationY: 12,
    scale: 0.11,
    alignToGround: true,
    category: 'street-litter',
  },
  ...[
    ['02', [-39.1, 0.5, -20.1], 76, 0.25],
    ['03', [-38.7, 0.5, -20.7], -32, 0.33],
    ['04', [-26.5, 0.5, -22.2], 128, 0.27],
    ['05', [-26.1, 0.5, -21.8], 46, 0.31],
    ['06', [-8.5, 0.5, -21.8], -74, 0.28],
    ['07', [-8.1, 0.5, -22.1], 24, 0.34],
    ['08', [22.8, 0.5, -22], 154, 0.27],
    ['09', [23.2, 0.5, -21.6], 98, 0.32],
    ['10', [40.4, 0.5, -19.8], -8, 0.29],
    ['11', [40.8, 0.5, -20.2], 62, 0.25],
    ['12', [-40.2, 0.5, 10.5], 143, 0.31],
    ['13', [-39.8, 0.5, 10.9], -53, 0.26],
    ['14', [-25.2, 0.5, 13.3], 31, 0.3],
    ['15', [-24.8, 0.5, 13.0], 105, 0.24],
    ['16', [35.8, 0.5, 13.2], -18, 0.33],
    ['17', [36.2, 0.5, 12.8], 72, 0.27],
    ['18', [-40.5, 0.5, 30.2], 116, 0.29],
    ['19', [-40.1, 0.5, 29.8], -42, 0.24],
    ['20', [-31.0, 0.5, 34.2], 8, 0.31],
    ['21', [-30.6, 0.5, 34.6], 84, 0.26],
    ['22', [-29.0, 0.5, 31.0], 147, 0.34],
    ['23', [-28.6, 0.5, 31.3], -65, 0.25],
    ['24', [-20.8, 0.5, 39.2], 22, 0.28],
    ['25', [-20.4, 0.5, 38.8], 132, 0.32],
    ['26', [12.5, 0.5, 39.4], -11, 0.26],
    ['27', [12.9, 0.5, 39.1], 57, 0.3],
    ['28', [31.5, 0.5, 39], 169, 0.24],
    ['29', [31.9, 0.5, 39.4], -77, 0.33],
    ['30', [42.2, 0.5, 26.8], 36, 0.28],
    ['31', [41.8, 0.5, 27.2], 124, 0.31],
    ['32', [39.5, 0.5, 6.5], -28, 0.27],
    ['33', [39.9, 0.5, 6.1], 81, 0.32],
    ['34', [-12.8, 0.5, 28.9], 155, 0.25],
    ['35', [-12.4, 0.5, 29.3], 12, 0.3],
    ['36', [18.3, 0.5, 8.8], -95, 0.27],
    ['37', [18.7, 0.5, 9.1], 44, 0.33],
    ['38', [7.8, 0.5, -8.5], 118, 0.25],
    ['39', [8.2, 0.5, -8.1], -34, 0.29],
    ['40', [36.0, 0.5, 43.1], 68, 0.31],
  ].map(([suffix, position, rotationY, scale]) => ({
    id: `crushed-trash-can-${suffix}`,
    label: 'Crushed Municipal Trash Can',
    file: 'ch03_crushed_trash_can.glb',
    position,
    rotationY,
    scale: scale * 0.38,
    alignToGround: true,
    cloneOf: 'crushed-trash-can-01',
    category: 'street-litter',
  })),
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
    collision: { type: 'box', size: [2.8, 1.65] },
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
    collision: { type: 'box', size: [3.25, 1.15] },
  },
  {
    id: 'district-bench-f',
    label: 'South Tramway Bench',
    role: 'low parcel F street rest point',
    category: 'district-decoration',
    file: 'ch03_fountain_bench.glb',
    position: [-28, 0.5, 38],
    rotationY: 0,
    scale: 2.35,
    cloneOf: 'fountain-bench',
    alignToGround: true,
    auditParcel: 'F',
    collision: { type: 'box', size: [2.5, 1.2] },
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

// Runtime bounds measured from the optimized GLBs. Every prototype is scaled
// uniformly in XYZ: floor heights, windows, doors, roof pitch, and ornament must
// keep the proportions authored by the source model. Prototype-specific target
// heights preserve a deliberate three/four-storey skyline without deformation.
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

export const BUILDING_HEIGHT_BY_PROTOTYPE = Object.freeze({
  'perimeter-tenement': 14,
  'perimeter-corner-arcade': 13.5,
  'perimeter-workers-hall': 11.5,
  'district-bakery-tenement': 14.5,
  'district-pharmacy-corner': 14,
  'district-printworks-rowhouse': 12,
  'landmark-copper-heron-hotel': 16.5,
  'landmark-civic-night-arcade': 14.5,
});

export function boundaryScaleFor(spec) {
  const dimensions = PERIMETER_MODEL_DIMENSIONS[spec.prototype];
  const targetHeight = spec.height ?? BUILDING_HEIGHT_BY_PROTOTYPE[spec.prototype] ?? 12;
  const uniformScale = targetHeight / dimensions[1];
  return [uniformScale, uniformScale, uniformScale];
}

// Dense Mediterranean street walls. Adjacent buildings share a common setback
// and leave only service-width seams, so the camera reads blocks and roof layers
// rather than collectible models placed around a board. The far north row adds
// a second depth layer; foreground masses stay lower to preserve player sight.
export const PERIMETER_BUILDINGS = Object.freeze([
  // Main north frontage, immediately behind the north-market street.
  { id: 'north-a-corner', prototype: 'perimeter-corner-arcade', position: [-50.62, 0, -36.9], rotationY: 0, scale: 15, tier: 'skyline', auditParcel: 'A' },
  { id: 'north-bakery-west', prototype: 'district-bakery-tenement', position: [-39.63, 0, -32.9], rotationY: 0, scale: 20, tier: 'skyline' },
  { id: 'north-tenement-west', prototype: 'perimeter-tenement', position: [-29.29, 0, -32.1], rotationY: 0, scale: 16, tier: 'skyline' },
  { id: 'north-printworks', prototype: 'district-printworks-rowhouse', position: [-15.83, 0, -34.18], rotationY: 0, scale: 15, tier: 'skyline' },
  { id: 'civic-night-arcade', prototype: 'landmark-civic-night-arcade', position: [1.8, 0, -39.08], rotationY: 0, scale: 15, tier: 'landmark', role: 'interactive-landmark' },
  { id: 'north-pharmacy', prototype: 'district-pharmacy-corner', position: [17.66, 0, -33.36], rotationY: 0, scale: 17, tier: 'skyline' },
  { id: 'north-bakery-east', prototype: 'district-bakery-tenement', position: [27.09, 0, -32.32], rotationY: 0, scale: 20, tier: 'skyline' },
  { id: 'north-corner-east', prototype: 'perimeter-corner-arcade', position: [38.08, 0, -36.29], rotationY: 0, scale: 15, tier: 'skyline' },
  { id: 'north-b-tenement', prototype: 'perimeter-tenement', position: [51.35, 0, -32.1], rotationY: 0, scale: 14, tier: 'skyline', auditParcel: 'B' },

  // A staggered rear roofline creates the layered old-town silhouette.
  { id: 'backdrop-workers-west', prototype: 'perimeter-workers-hall', position: [-42.65, 0, -61.18], rotationY: 0, scale: 11, tier: 'backdrop' },
  { id: 'backdrop-tenement-west', prototype: 'perimeter-tenement', position: [-25.62, 0, -58.3], rotationY: 0, scale: 14, tier: 'backdrop' },
  { id: 'backdrop-printworks-west', prototype: 'district-printworks-rowhouse', position: [-12.16, 0, -60.38], rotationY: 0, scale: 13, tier: 'backdrop' },
  { id: 'backdrop-bakery', prototype: 'district-bakery-tenement', position: [-0.98, 0, -58.52], rotationY: 0, scale: 18, tier: 'backdrop' },
  { id: 'backdrop-tenement-center', prototype: 'perimeter-tenement', position: [9.37, 0, -58.3], rotationY: 0, scale: 14, tier: 'backdrop' },
  { id: 'backdrop-pharmacy', prototype: 'district-pharmacy-corner', position: [21.02, 0, -59.6], rotationY: 0, scale: 16, tier: 'backdrop' },
  { id: 'backdrop-printworks-east', prototype: 'district-printworks-rowhouse', position: [33.57, 0, -60.38], rotationY: 0, scale: 13, tier: 'backdrop' },
  { id: 'backdrop-tenement-east', prototype: 'perimeter-tenement', position: [47.03, 0, -58.3], rotationY: 0, scale: 14, tier: 'backdrop' },

  // West street wall. It stops before the tram cutting, then resumes south.
  { id: 'west-bakery-north', prototype: 'district-bakery-tenement', position: [-52.42, 0, -17.25], rotationY: 90, scale: 18, tier: 'side' },
  { id: 'west-tenement-mid', prototype: 'perimeter-tenement', position: [-52.2, 0, -6.91], rotationY: 90, scale: 15, tier: 'side' },
  { id: 'west-printworks-mid', prototype: 'district-printworks-rowhouse', position: [-54.28, 0, 6.56], rotationY: 90, scale: 11, tier: 'low' },

  // East street wall includes the hotel as a continuous frontage, not an island.
  { id: 'copper-heron-hotel', prototype: 'landmark-copper-heron-hotel', position: [53.72, 0, -13.58], rotationY: -90, scale: 16, height: 15.5, tier: 'landmark', role: 'interactive-landmark' },
  { id: 'east-tenement-mid', prototype: 'perimeter-tenement', position: [51.97, 0, -0.01], rotationY: -90, scale: 15, height: 13, tier: 'side' },
  { id: 'east-bakery-mid', prototype: 'district-bakery-tenement', position: [52.06, 0, 9.48], rotationY: -90, scale: 13, height: 13, tier: 'low' },
  { id: 'east-tenement-south', prototype: 'perimeter-tenement', position: [51.85, 0, 26.72], rotationY: -90, scale: 13, height: 12.5, tier: 'side' },
  { id: 'east-bakery-south', prototype: 'district-bakery-tenement', position: [51.69, 0, 35.58], rotationY: -90, scale: 11, height: 11.5, tier: 'side' },

  // Low foreground wall: dense enough to enclose, short enough for the camera.
  { id: 'south-h-printworks', prototype: 'district-printworks-rowhouse', position: [-55.98, 0, 52.9], rotationY: 180, scale: 11, height: 12.5, tier: 'low', auditParcel: 'H' },
  { id: 'south-bakery-west', prototype: 'district-bakery-tenement', position: [-44.9165, 0, 51.3], rotationY: 180, scale: 9, height: 13, tier: 'low' },
  { id: 'south-tenement-west', prototype: 'perimeter-tenement', position: [-35.4296, 0, 50.95], rotationY: 180, scale: 11, height: 13, tier: 'low' },
  { id: 'south-bakery', prototype: 'district-bakery-tenement', position: [-25.9427, 0, 51.3], rotationY: 180, scale: 12, height: 13, tier: 'low' },
  { id: 'south-tenement-center', prototype: 'perimeter-tenement', position: [-16.4558, 0, 50.95], rotationY: 180, scale: 11, height: 13, tier: 'low' },
  { id: 'south-printworks-center', prototype: 'district-printworks-rowhouse', position: [-3.1453, 0, 52.9], rotationY: 180, scale: 10, height: 12.5, tier: 'low' },
  { id: 'south-tenement-east', prototype: 'perimeter-tenement', position: [10.1652, 0, 50.95], rotationY: 180, scale: 11, height: 13, tier: 'low' },
  { id: 'south-bakery-east', prototype: 'district-bakery-tenement', position: [19.6521, 0, 51.3], rotationY: 180, scale: 9, height: 13, tier: 'low' },
  { id: 'south-printworks-east', prototype: 'district-printworks-rowhouse', position: [30.7156, 0, 52.9], rotationY: 180, scale: 11, height: 12.5, tier: 'low' },
  { id: 'south-i-tenement', prototype: 'perimeter-tenement', position: [44.0261, 0, 50.95], rotationY: 180, scale: 9, height: 13, tier: 'low', auditParcel: 'I' },

  // A short inner frontage embeds the archive into a block without closing the
  // market or transit routes. These end before the civic lane and plaza.
  { id: 'market-row-printworks', prototype: 'district-printworks-rowhouse', position: [-34.65, 0, -16.08], rotationY: 0, scale: 11, tier: 'infill' },
  { id: 'market-row-bakery', prototype: 'district-bakery-tenement', position: [-4.4, 0, -14.22], rotationY: 0, scale: 12, tier: 'infill' },
  { id: 'market-west-tenement', prototype: 'perimeter-tenement', position: [-31, 0, -4.17], rotationY: 90, scale: 11, tier: 'infill' },
  { id: 'market-west-bakery', prototype: 'district-bakery-tenement', position: [-31.22, 0, 6.39], rotationY: 90, scale: 14, tier: 'infill' },
  // East of the civic core, two short attached frontages complete a compact
  // block around the fountain. The arrival boulevard stays fully open between
  // them; the buildings sit on its setbacks instead of floating in the parcel.
  { id: 'east-civic-printworks', prototype: 'district-printworks-rowhouse', position: [36.82, 0, 0.53], rotationY: 90, scale: 11, tier: 'infill' },
  { id: 'east-civic-bakery', prototype: 'district-bakery-tenement', position: [39.53, 0, 10.75], rotationY: 90, scale: 14, height: 11, tier: 'infill' },
  { id: 'east-south-printworks', prototype: 'district-printworks-rowhouse', position: [19.08, 0, 25.88], rotationY: 0, scale: 10, tier: 'infill' },
  { id: 'east-south-bakery', prototype: 'district-bakery-tenement', position: [30.25, 0, 24.02], rotationY: 0, scale: 14, tier: 'infill' },
  { id: 'east-south-bakery-small', prototype: 'district-bakery-tenement', position: [37.35, 0, 23.17], rotationY: 0, scale: 10, height: 11, tier: 'infill' },
  // A lower rear roofline faces the tram street. Together the two rows occupy
  // the parcel as a real urban block, with only a service alley between them.
  { id: 'east-south-rear-bakery-west', prototype: 'district-bakery-tenement', position: [15.96, 0, 35.08], rotationY: 0, scale: 7, tier: 'infill' },
  { id: 'east-south-rear-tenement', prototype: 'perimeter-tenement', position: [26.3, 0, 35.3], rotationY: 0, scale: 9, tier: 'infill' },
  { id: 'east-south-rear-bakery-east', prototype: 'district-bakery-tenement', position: [36.64, 0, 35.08], rotationY: 0, scale: 7, tier: 'infill' },
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

// Every visually open street end gets a physical roadblock. Local X is the
// fence rail direction; the southeast opening is already closed by the two
// stacked derelict tram bodies above.
export const BOUNDARY_BARRIERS = Object.freeze([
  { id: 'north-market-west-roadblock', center: [-48.5, -25], length: 7.6, rotationY: 90 },
  // The east rail stops before the corner; the generated wreck below closes
  // the perpendicular street without two fence meshes crossing each other.
  { id: 'north-market-east-roadblock', center: [48.5, -22.5], length: 6, rotationY: 90 },
  { id: 'arrival-west-roadblock', center: [-51.5, 17], length: 8.2, rotationY: 90 },
  { id: 'arrival-east-roadblock', center: [51.5, 17], length: 8.2, rotationY: 90 },
  { id: 'south-tram-west-roadblock', center: [-48.5, 43], length: 8.2, rotationY: 90 },
  { id: 'west-edge-north-roadblock', center: [-45, -28], length: 7.6, rotationY: 0 },
  { id: 'west-edge-south-roadblock', center: [-45, 45], length: 8.2, rotationY: 0 },
]);

export const OBSTACLES = Object.freeze([
  { type: 'circle', center: [0, 0], radius: 4.9 },
  { type: 'circle', center: [20, 0], radius: 4.7 },
  { type: 'circle', center: [12.6, -12], radius: 1.75 },
  { type: 'box', center: [-20, 3.5], size: [4.6, 3.4] },
  { type: 'box', center: [-20, -3.5], size: [4.6, 3.4] },
  { type: 'box', center: [-18, -15.2], size: [14, 8], padding: 0.25, sourceId: 'archive' },
  { type: 'box', center: [30.2, -15.2], size: [11, 8], padding: 0.25, sourceId: 'transit-ministry' },
  ...BOUNDARY_BARRIERS.map((barrier) => ({
    type: 'oriented-box',
    center: barrier.center,
    size: [barrier.length, 0.9],
    rotationY: barrier.rotationY,
    padding: 0.18,
    sourceId: barrier.id,
  })),
]);

export const CAMERA_HOME = Object.freeze({
  position: [52, 100, 65],
  target: [1.5, 0.8, 13],
  zoom: 2.85,
});

export const CAMERA_FOCUS_TARGETS = Object.freeze({
  arrival: [0, 0.8, 16],
  market: [-17, 0.8, 0],
  transit: [2, 0.8, -15],
  fountain: [20, 0.8, 0],
  reunion: [20, 0.8, 8],
  streetfire: [-52.8, 0.8, 34],
  southeast: [49, 0.8, 45],
  northeast: [44.8, 0.8, -28.1],
  station: [-12, 0.8, 29],
  tunnel: [-35, 0.8, 19],
});

// George approved the complete v68 spatial composition on 2026-08-07.
// Tests hash the structural data named here so later narrative, interaction,
// and litter passes cannot accidentally rearrange the accepted map.
export const MAP_LAYOUT_LOCK = Object.freeze({
  version: 'v68',
  status: 'approved',
  approvedAt: '2026-08-07',
  structuralModelIds: Object.freeze([
    'archive',
    'transit-ministry',
    'scanner-tower',
    'clock-tower',
    'reunion-fountain',
    'municipal-tram',
    'municipal-tram-car-02',
    'municipal-tram-car-03',
    'derelict-boundary-tram-lower',
    'derelict-boundary-tram-upper',
    'abandoned-car-southeast',
    'abandoned-car-southwest',
    'abandoned-car-west-mid',
    'abandoned-car-northeast',
    'market-stall-west',
    'market-stall-east',
    'street-campfire',
    'open-air-station',
    'tram-tunnel-portal',
  ]),
  allowedWithoutRelock: Object.freeze([
    'dialogue and narrative state',
    'interaction logic',
    'small non-blocking decoration',
    'material and lighting polish that preserves geometry',
  ]),
});
