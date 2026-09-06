// Actor-padded navigation footprints for the fused Hunyuan hotel kit. Keeping
// this data in a dependency-free module lets the live runtime and Node tests
// use exactly the same collision map.
export const HOTEL_LOBBY_WALK_BOUNDS = Object.freeze({ minX: -3.0, maxX: 2.75, minZ: -2.85, maxZ: 3.15 });
export const HOTEL_LOBBY_FURNITURE_OBSTACLES = Object.freeze([
  Object.freeze({ id: 'reception-counter', minX: -2.75, maxX: 2.65, minZ: -2.85, maxZ: -1.25 }),
  Object.freeze({ id: 'dining-table', minX: -2.55, maxX: -0.35, minZ: -0.8, maxZ: 2.75 }),
  Object.freeze({ id: 'window-cabinet', minX: -2.95, maxX: -1.75, minZ: -2.45, maxZ: -1.15 }),
  Object.freeze({ id: 'staircase', minX: -1.0, maxX: 1.05, minZ: 1.35, maxZ: 3.15 }),
]);

export const HOTEL_CORRIDOR_WALK_BOUNDS = Object.freeze({ minX: -1.05, maxX: 1.05, minZ: -8.35, maxZ: 8.35 });
export const HOTEL_ROOM_WALK_BOUNDS = Object.freeze({ minX: -3.15, maxX: 3.15, minZ: -15.9, maxZ: -9.2 });
export const HOTEL_ROOM_FURNITURE_OBSTACLES = Object.freeze([
  Object.freeze({ id: 'evidence-table', minX: -2.85, maxX: 0.9, minZ: -11.7, maxZ: -9.45 }),
  Object.freeze({ id: 'bed', minX: -2.25, maxX: 1.75, minZ: -14.85, maxZ: -12.45 }),
  Object.freeze({ id: 'washstand', minX: 1.1, maxX: 2.95, minZ: -11.3, maxZ: -9.8 }),
]);

export function hotelFurnitureAt(point, area = 'lobby') {
  const obstacles = area === 'lobby'
    ? HOTEL_LOBBY_FURNITURE_OBSTACLES
    : area === 'room' ? HOTEL_ROOM_FURNITURE_OBSTACLES : [];
  return obstacles.find((box) => (
    point.x > box.minX && point.x < box.maxX
    && point.z > box.minZ && point.z < box.maxZ
  ))?.id ?? null;
}
