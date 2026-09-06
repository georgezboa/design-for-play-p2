// Chapter 6 // ALL WORLDS AT ONCE — locked visual, camera, and asset contract.
//
// This file is deliberately data-only. Phaser, Blender handoff scripts, AE
// shot lists, and tests can all read the same semantic names without owning
// one another's implementation.

export const FINALE_WORLD_IDS = Object.freeze([
  'night-service',
  'borrowed-grid',
  'echo-city',
  'painted-country',
  'museum-of-one-answer',
]);

export const SHARED_PALETTE = Object.freeze({
  graphite: '#28313b',
  paper: '#e9dfcc',
  cyanRelationship: '#38d6d5',
  amberAction: '#f1ab4f',
  redRefusal: '#e75b62',
});

export const CAMERA_LANGUAGE = Object.freeze({
  projection: 'painted-orthographic-three-quarter',
  authoredPitchDeg: 40,
  freeOrbit: false,
  follow: Object.freeze({
    deadzonePx: Object.freeze({ width: 112, height: 64 }),
    lookAheadPx: 108,
    smoothingRate: 7.5,
    updateAfterPlayer: true,
  }),
  overlapZoom: 0.78,
  transitionRule: 'preserve-player-screen-motion-and-world-coordinate',
  reunionRule: 'frame-butch-and-mara-then-push-in-without-a-black-cut',
});

export const WORLD_ART_LAYERS = Object.freeze({
  'night-service': Object.freeze({
    material: 'blackened iron, brass, steam, pistons and visible linkages',
    changes: 'how structures move',
    transitionToken: 'steam-and-amber-pulse',
  }),
  'borrowed-grid': Object.freeze({
    material: 'cyan cable, neon scaffold and suspended transit rails',
    changes: 'where power and routes flow',
    transitionToken: 'cyan-conduit',
  }),
  'echo-city': Object.freeze({
    material: 'human motion traces, semantic loops and repeated urban movement',
    changes: 'what behavior a receiver repeats',
    transitionToken: 'motion-trace',
  }),
  'painted-country': Object.freeze({
    material: 'torn paper, wet ink, watercolor blooms and folded structures',
    changes: 'which property becomes physically real',
    transitionToken: 'brush-stroke',
  }),
  'museum-of-one-answer': Object.freeze({
    material: 'ivory archive, glass, brass labels and reconstructed dioramas',
    changes: 'which interpretation becomes a walkable route',
    transitionToken: 'glass-frame',
  }),
});

export const FUSION_SPINE_ASSET_SLOTS = Object.freeze([
  'spine-floor-straight',
  'spine-chasm-edge',
  'spine-bridge',
  'spine-world-arch',
  'spine-ramp',
  'spine-lift-platform',
  'spine-wall-pillar',
  'spine-foreground-occluder',
]);

export const WORLD_LANDMARK_ASSET_SLOTS = Object.freeze({
  'night-service': Object.freeze([
    'night-traction-node',
    'night-piston-pipe',
    'night-lock-lever',
  ]),
  'borrowed-grid': Object.freeze([
    'grid-power-pylon',
    'grid-cable-junction',
    'grid-transit-receiver',
  ]),
  'echo-city': Object.freeze([
    'echo-behavior-receiver',
    'echo-traffic-gate',
    'echo-loop-beacon',
  ]),
  'painted-country': Object.freeze([
    'paint-brush-anchor',
    'paint-fold-bridge',
    'paint-paper-landmark',
  ]),
  'museum-of-one-answer': Object.freeze([
    'museum-evidence-plinth',
    'museum-glass-case',
    'museum-reconstruction-door',
  ]),
});

export const FINALE_HERO_ASSET_SLOTS = Object.freeze([
  'finale-archivist-compression-core',
  'finale-world-loom',
  'finale-mara-reunion-platform',
  'finale-witness-door-train-spine',
  'finale-world-seam-near',
  'finale-world-seam-mid',
  'finale-world-seam-far',
]);

export const FINALE_FX_SLOTS = Object.freeze([
  'fx-cyan-relationship-thread',
  'fx-amber-energy-pulse',
  'fx-red-deletion-fracture',
  'fx-paper-tear-edge',
  'fx-watercolor-bloom-mask',
  'fx-ink-dissolve',
  'fx-glass-reflection',
  'fx-steam-dust-paper-loop',
  'fx-foreground-world-wipe',
]);

export const FINALE_VISUAL_BEATS = Object.freeze([
  Object.freeze({
    id: 'arrival-on-the-spine',
    visibleWorlds: Object.freeze(['night-service']),
    activeRuleWorlds: Object.freeze(['night-service']),
    camera: 'guided-follow',
  }),
  Object.freeze({
    id: 'mechanical-interpretation',
    visibleWorlds: Object.freeze(['night-service', 'museum-of-one-answer']),
    activeRuleWorlds: Object.freeze(['night-service', 'museum-of-one-answer']),
    camera: 'guided-follow',
  }),
  Object.freeze({
    id: 'powered-painted-crossing',
    visibleWorlds: Object.freeze(['borrowed-grid', 'painted-country']),
    activeRuleWorlds: Object.freeze(['borrowed-grid', 'painted-country']),
    camera: 'guided-follow-with-authored-world-cut',
  }),
  Object.freeze({
    id: 'echo-three-world-overlap',
    visibleWorlds: Object.freeze(['borrowed-grid', 'painted-country', 'echo-city']),
    activeRuleWorlds: Object.freeze(['borrowed-grid', 'painted-country', 'echo-city']),
    camera: 'overlap-pullback',
  }),
  Object.freeze({
    id: 'archivist-compression-refusal',
    visibleWorlds: Object.freeze(FINALE_WORLD_IDS),
    activeRuleWorlds: Object.freeze(['echo-city', 'museum-of-one-answer']),
    camera: 'authored-forward-drive',
  }),
  Object.freeze({
    id: 'reach-mara',
    visibleWorlds: Object.freeze(FINALE_WORLD_IDS),
    activeRuleWorlds: Object.freeze([]),
    camera: 'butch-mara-two-target-push-in',
  }),
]);

export function getFinaleAssetManifest() {
  return {
    fusionSpine: [...FUSION_SPINE_ASSET_SLOTS],
    worldLandmarks: Object.fromEntries(
      Object.entries(WORLD_LANDMARK_ASSET_SLOTS).map(([world, slots]) => [world, [...slots]]),
    ),
    finaleHero: [...FINALE_HERO_ASSET_SLOTS],
    effects: [...FINALE_FX_SLOTS],
  };
}
