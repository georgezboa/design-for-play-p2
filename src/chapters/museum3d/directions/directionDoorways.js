import { CHAPTER05_DIRECTIONS } from './directionRegistry.js';

// Every numbered door shares one physical entry band. The band sits just in
// front of the north wall, before the solid door panels stop the player.
export const DIRECTION_DOORWAYS = Object.freeze([
  Object.freeze({ id: 'sealed-record-1', minX: 13.05, maxX: 14.95, minZ: -1.68, maxZ: -1.18 }),
  Object.freeze({ id: CHAPTER05_DIRECTIONS.BORROWED_GRID, minX: 21.05, maxX: 22.95, minZ: -1.68, maxZ: -1.18 }),
  Object.freeze({ id: CHAPTER05_DIRECTIONS.ECHO_CITY, minX: 29.05, maxX: 30.95, minZ: -1.68, maxZ: -1.18 }),
  // Door 4 must remain active from the whole final approach, including the
  // camera-close position where the collision body stops against the panel.
  Object.freeze({ id: CHAPTER05_DIRECTIONS.LABYRINTH, minX: 36.45, maxX: 39.55, minZ: -1.92, maxZ: 0.95 }),
]);

export function directionAtDoorway(position) {
  return DIRECTION_DOORWAYS.find((zone) => (
    position.x >= zone.minX && position.x <= zone.maxX
    && position.z >= zone.minZ && position.z <= zone.maxZ
  ))?.id ?? null;
}

export function isAtLabyrinthDoor(position, phase = 'corridor') {
  return phase === 'corridor'
    && directionAtDoorway(position) === CHAPTER05_DIRECTIONS.LABYRINTH;
}
