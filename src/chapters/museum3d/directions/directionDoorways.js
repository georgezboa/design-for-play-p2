import { CHAPTER05_DIRECTIONS } from './directionRegistry.js';

// Door 4 is the only doorway in the archive corridor. Its band sits in the
// north half of the corridor, in front of the door panel: close enough that
// the collision body stopping against the panel is still inside, but never
// reaching the south wall, where the Chapter 4 case at x≈38 must keep its
// own E (the old band spanned the whole corridor width and stole it).
export const DIRECTION_DOORWAYS = Object.freeze([
  Object.freeze({ id: CHAPTER05_DIRECTIONS.LABYRINTH, minX: 36.95, maxX: 39.05, minZ: -1.92, maxZ: -0.55 }),
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
