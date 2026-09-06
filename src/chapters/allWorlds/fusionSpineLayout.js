// Course-build greybox for Chapter 6's continuous spatial spine.
// Coordinates are world pixels in the locked 960 x 600 gameplay viewport.

export const FUSION_SPINE_GREYBOX = Object.freeze({
  viewport: Object.freeze({ width: 960, height: 600 }),
  worldBounds: Object.freeze({ minX: 0, maxX: 2880, minY: 0, maxY: 600 }),
  player: Object.freeze({ startX: 180, walkY: 468, walkSpeed: 260 }),
  anchors: Object.freeze({
    pylonX: 610,
    gateX: 940,
    brushX: 1370,
    chasmX: 1790,
    automaticCutX: 1980,
    witnessDoorX: 2420,
    worldLoomX: 2625,
    maraX: 2740,
  }),
  modules: Object.freeze([
    Object.freeze({ id: 'arrival-rail', slot: 'spine-floor-straight', x: 0, width: 430 }),
    Object.freeze({ id: 'power-approach', slot: 'spine-ramp', x: 430, width: 420 }),
    Object.freeze({ id: 'safety-gate', slot: 'spine-world-arch', x: 850, width: 250 }),
    Object.freeze({ id: 'paint-threshold', slot: 'spine-foreground-occluder', x: 1100, width: 330 }),
    Object.freeze({ id: 'brush-deck', slot: 'spine-lift-platform', x: 1430, width: 260 }),
    Object.freeze({ id: 'paper-chasm', slot: 'spine-chasm-edge', x: 1690, width: 360 }),
    Object.freeze({ id: 'witness-bridge', slot: 'spine-bridge', x: 2050, width: 360 }),
    Object.freeze({ id: 'loom-vista', slot: 'spine-wall-pillar', x: 2410, width: 470 }),
  ]),
});

export function worldFusionOptionsFromSpine(layout = FUSION_SPINE_GREYBOX) {
  return {
    minX: 116,
    maxX: layout.anchors.witnessDoorX,
    startX: layout.player.startX,
    walkSpeed: layout.player.walkSpeed,
    pylonX: layout.anchors.pylonX,
    gateX: layout.anchors.gateX,
    brushX: layout.anchors.brushX,
    chasmX: layout.anchors.chasmX,
    cutX: layout.anchors.automaticCutX,
    doorX: layout.anchors.witnessDoorX,
    loomX: layout.anchors.worldLoomX,
    maraX: layout.anchors.maraX,
    worldWidth: layout.worldBounds.maxX,
    interactRadius: 76,
  };
}
