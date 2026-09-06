import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import {
  CAMERA_HOME,
  CAMERA_FOLLOW,
  CAMERA_FOCUS_TARGETS,
  CAMERA_LIMITS,
  DEVELOPER_CAMERA_LIMITS,
  CITY_MODELS,
  CITY_PALETTE,
  CITY_SURFACE_Y,
  ECHO_CITY_LAMP_POSITIONS,
  ECHO_CITY_LOOKS,
  COURTS,
  DISTRICT_CROSSINGS,
  DISTRICT_ROADS,
  HIDDEN_WALK_ZONES,
  MODEL_ROOT,
  OBSTACLES,
  OUTER_CITY_GROUND,
  PERIMETER_BUILDINGS,
  PERIMETER_FOOTPRINTS,
  PERIMETER_MODEL_SOURCES,
  RAIL_LAYOUT,
  STATION_LAYOUT,
  TUNNEL_LAYOUT,
  TUNNEL_TERRAIN,
  WORLD_EDGES,
  WORLD_NODES,
  WALKABLE_DISTRICT,
  boundaryScaleFor,
} from './city3dConfig.js';

// Chapter 5 ships its own frozen Echo City authority snapshot. Keeping these
// materials under museum3d prevents an in-progress Chapter 3 art pass from
// changing the Chapter 5 reconstruction by accident.
const MATERIAL_ROOT = '/museum3d/echo-city/authority/materials';
const GRID_STEP = 1;
const NAV_BOUNDS = Object.freeze({ minX: -58, maxX: 58, minZ: -28, maxZ: 58 });
const PROP_OBSTACLES = CITY_MODELS
  .filter((spec) => spec.collision)
  .map((spec) => ({ ...spec.collision, center: [spec.position[0], spec.position[2]], sourceId: spec.id }));
const ALL_OBSTACLES = [...OBSTACLES, ...PROP_OBSTACLES, ...TUNNEL_TERRAIN.obstacles];

function configureTexture(texture, { color = false, repeat = [1, 1] } = {}) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 8;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cloneTexture(texture, repeat, color = false) {
  const clone = texture.clone();
  clone.needsUpdate = true;
  return configureTexture(clone, { color, repeat });
}

function alignMaterialToWorld(material, minX, minZ, tileSize) {
  for (const key of ['map', 'bumpMap', 'roughnessMap']) {
    const texture = material[key];
    if (!texture) continue;
    texture.offset.set(minX / tileSize, minZ / tileSize);
    texture.needsUpdate = true;
  }
  return material;
}

function insideCourt(x, z, court) {
  const [localX, localZ] = localPoint(x, z, court.center, court.rotationY || 0);
  const dx = Math.abs(localX);
  const dz = Math.abs(localZ);
  if (court.shape === 'box') {
    return dx <= court.size[0] * 0.5 && dz <= court.size[1] * 0.5;
  }
  const r = court.radius;
  return Math.max(dx, dz) + Math.min(dx, dz) * 0.4142 <= r;
}

function localPoint(x, z, center, rotationY = 0) {
  const angle = THREE.MathUtils.degToRad(rotationY);
  const dx = x - center[0];
  const dz = z - center[1];
  return [Math.cos(angle) * dx - Math.sin(angle) * dz, Math.sin(angle) * dx + Math.cos(angle) * dz];
}

function distanceToSegmentSquared(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len = vx * vx + vz * vz;
  const t = len > 0 ? THREE.MathUtils.clamp((wx * vx + wz * vz) / len, 0, 1) : 0;
  const dx = px - (ax + vx * t);
  const dz = pz - (az + vz * t);
  return dx * dx + dz * dz;
}

function insideObstacle(x, z, obstacle, padding = 0) {
  const [localX, localZ] = localPoint(x, z, obstacle.center, obstacle.rotationY || 0);
  const dx = Math.abs(localX);
  const dz = Math.abs(localZ);
  if (obstacle.type === 'circle') {
    return dx * dx + dz * dz < (obstacle.radius + padding) ** 2;
  }
  return dx < obstacle.size[0] * 0.5 + padding && dz < obstacle.size[1] * 0.5 + padding;
}

export function isWalkable(x, z, runtimeObstacles = []) {
  const inHiddenZone = HIDDEN_WALK_ZONES.some((zone) => insideCourt(x, z, { ...zone, shape: 'box' }));
  if (inHiddenZone) return false;
  const inDistrict = insideCourt(x, z, WALKABLE_DISTRICT);
  const inCourt = COURTS.some((court) => insideCourt(x, z, court));
  const inRibbon = WORLD_EDGES.some(([aId, bId]) => {
    const a = WORLD_NODES[aId];
    const b = WORLD_NODES[bId];
    return distanceToSegmentSquared(x, z, a[0], a[1], b[0], b[1]) <= 2.35 ** 2;
  });
  if (!inDistrict && !inCourt && !inRibbon) return false;
  return ![...ALL_OBSTACLES, ...runtimeObstacles].some((obstacle) => (
    insideObstacle(x, z, obstacle, obstacle.padding ?? 0.52)
  ));
}

function gridKey(x, z) {
  return `${x},${z}`;
}

function worldToGrid(value) {
  return Math.round(value / GRID_STEP);
}

function gridToWorld(value) {
  return value * GRID_STEP;
}

function nearestWalkableGrid(x, z, runtimeObstacles = []) {
  const gx = worldToGrid(x);
  const gz = worldToGrid(z);
  if (isWalkable(gridToWorld(gx), gridToWorld(gz), runtimeObstacles)) return [gx, gz];
  for (let radius = 1; radius <= 6; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
        const nx = gx + dx;
        const nz = gz + dz;
        if (isWalkable(gridToWorld(nx), gridToWorld(nz), runtimeObstacles)) return [nx, nz];
      }
    }
  }
  return null;
}

export function findPath(start, goal, runtimeObstacles = []) {
  const startGrid = nearestWalkableGrid(start.x, start.z, runtimeObstacles);
  const goalGrid = nearestWalkableGrid(goal.x, goal.z, runtimeObstacles);
  if (!startGrid || !goalGrid) return [];

  const startKey = gridKey(...startGrid);
  const goalKey = gridKey(...goalGrid);
  const open = [{ point: startGrid, score: 0 }];
  const cameFrom = new Map();
  const cost = new Map([[startKey, 0]]);
  const directions = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];

  while (open.length) {
    open.sort((a, b) => a.score - b.score);
    const current = open.shift().point;
    const currentKey = gridKey(...current);
    if (currentKey === goalKey) break;

    for (const [dx, dz, travel] of directions) {
      const next = [current[0] + dx, current[1] + dz];
      if (next[0] < NAV_BOUNDS.minX || next[0] > NAV_BOUNDS.maxX ||
          next[1] < NAV_BOUNDS.minZ || next[1] > NAV_BOUNDS.maxZ) continue;
      const wx = gridToWorld(next[0]);
      const wz = gridToWorld(next[1]);
      if (!isWalkable(wx, wz, runtimeObstacles)) continue;
      if (dx && dz) {
        if (!isWalkable(gridToWorld(current[0] + dx), gridToWorld(current[1]), runtimeObstacles) ||
            !isWalkable(gridToWorld(current[0]), gridToWorld(current[1] + dz), runtimeObstacles)) continue;
      }
      const nextKey = gridKey(...next);
      const nextCost = cost.get(currentKey) + travel;
      if (nextCost >= (cost.get(nextKey) ?? Infinity)) continue;
      cost.set(nextKey, nextCost);
      cameFrom.set(nextKey, current);
      const heuristic = Math.hypot(goalGrid[0] - next[0], goalGrid[1] - next[1]);
      open.push({ point: next, score: nextCost + heuristic });
    }
  }

  if (!cameFrom.has(goalKey) && startKey !== goalKey) return [];
  const path = [goalGrid];
  let cursor = goalGrid;
  while (gridKey(...cursor) !== startKey) {
    cursor = cameFrom.get(gridKey(...cursor));
    if (!cursor) return [];
    path.push(cursor);
  }
  path.reverse();
  return path.slice(1).map(([gx, gz]) => new THREE.Vector3(gridToWorld(gx), 0.5, gridToWorld(gz)));
}

async function makeMaterialSet(renderer) {
  const maxAnisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
  const loader = new THREE.TextureLoader();
  const [limestoneImage, heightImage, roughnessImage, darkLimestoneImage, darkImage] = await Promise.all([
    loader.loadAsync(`${MATERIAL_ROOT}/worn-limestone-albedo.webp`),
    loader.loadAsync(`${MATERIAL_ROOT}/worn-limestone-height.webp`),
    loader.loadAsync(`${MATERIAL_ROOT}/worn-limestone-roughness.webp`),
    loader.loadAsync(`${MATERIAL_ROOT}/worn-limestone-dark-albedo.webp`),
    loader.loadAsync(`${MATERIAL_ROOT}/dark-city-cobbles.webp`),
  ]);
  const limestone = configureTexture(limestoneImage, { color: true });
  const height = configureTexture(heightImage);
  const roughness = configureTexture(roughnessImage);
  const darkLimestone = configureTexture(darkLimestoneImage, { color: true });
  const dark = configureTexture(darkImage, { color: true });
  for (const texture of [limestone, height, roughness, darkLimestone, dark]) texture.anisotropy = maxAnisotropy;

  return {
    paving(width, depth, tint = 0xffffff) {
      const repeat = [Math.max(1, width / 6), Math.max(1, depth / 6)];
      return new THREE.MeshStandardMaterial({
        color: tint,
        map: cloneTexture(limestone, repeat, true),
        bumpMap: cloneTexture(height, repeat),
        bumpScale: 0.12,
        roughnessMap: cloneTexture(roughness, repeat),
        roughness: 0.94,
        metalness: 0,
      });
    },
    darkPaving(width, depth) {
      const repeat = [Math.max(1, width / 5.5), Math.max(1, depth / 5.5)];
      return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: cloneTexture(darkLimestone, repeat, true),
        bumpMap: cloneTexture(height, repeat),
        bumpScale: 0.095,
        roughnessMap: cloneTexture(roughness, repeat),
        roughness: 0.96,
        metalness: 0,
      });
    },
    districtPaving(width, depth) {
      const repeat = [Math.max(1, width / 5), Math.max(1, depth / 5)];
      return new THREE.MeshStandardMaterial({
        color: 0x81786d,
        map: cloneTexture(limestone, repeat, true),
        bumpMap: cloneTexture(height, repeat),
        bumpScale: 0.11,
        roughnessMap: cloneTexture(roughness, repeat),
        roughness: 0.97,
        metalness: 0,
        emissive: 0x171311,
        emissiveIntensity: 0.08,
      });
    },
    street: new THREE.MeshStandardMaterial({
      color: 0x694b48,
      map: cloneTexture(limestone, [48, 45], true),
      bumpMap: cloneTexture(height, [48, 45]),
      bumpScale: 0.07,
      roughnessMap: cloneTexture(roughness, [48, 45]),
      emissive: 0x170d0e,
      emissiveIntensity: 0.14,
      roughness: 0.96,
      metalness: 0,
    }),
    hiddenStreet: new THREE.MeshStandardMaterial({
      color: 0x7d6662,
      map: cloneTexture(dark, [8, 16], true),
      roughness: 1,
      metalness: 0,
    }),
    earth: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.earth, roughness: 1 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x403937, roughness: 0.98, metalness: 0 }),
    rockFace: new THREE.MeshStandardMaterial({ color: 0x554a43, roughness: 0.95, metalness: 0 }),
    tunnelVoid: new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.DoubleSide }),
    edge: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.stoneEdge, roughness: 0.86, metalness: 0.04 }),
    bronze: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.bronze, roughness: 0.64, metalness: 0.42 }),
    wine: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.wine, roughness: 0.74, metalness: 0.16 }),
    iron: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.iron, roughness: 0.72, metalness: 0.62 }),
    patina: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.patina, roughness: 0.48, metalness: 0.32 }),
    water: new THREE.MeshPhysicalMaterial({
      color: CITY_PALETTE.water,
      roughness: 0.2,
      metalness: 0,
      transmission: 0.12,
      transparent: true,
      opacity: 0.86,
    }),
  };
}

function addShadowFlags(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      if ('roughness' in material) material.roughness = Math.max(material.roughness ?? 0.5, 0.5);
      if ('envMapIntensity' in material) material.envMapIntensity = 0.45;
    }
  });
}

function prepareBoundaryInstance(root, spec) {
  root.name = spec.id;
  root.position.fromArray(spec.position);
  root.rotation.y = THREE.MathUtils.degToRad(spec.rotationY);
  root.scale.fromArray(boundaryScaleFor(spec));
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  root.position.y += spec.position[1] - bounds.min.y;
  root.updateMatrixWorld(true);
  root.userData.assetId = spec.id;
  root.userData.assetCategory = 'perimeter-building';
  root.userData.prototype = spec.prototype;
  root.userData.tier = spec.tier;
  root.traverse((object) => {
    if (!object.isMesh) return;
    // The enclosing skyline should receive the live light but should not cast
    // dozens of expensive, overlapping shadows across the playable plaza.
    object.castShadow = false;
    object.receiveShadow = true;
  });
  return root;
}

function addCourt(scene, walkMeshes, materials, court) {
  let edgeGeometry;
  let surfaceGeometry;
  let width;
  let depth;
  if (court.shape === 'box') {
    width = court.size[0];
    depth = court.size[1];
    edgeGeometry = new THREE.BoxGeometry(width + 0.35, 0.07, depth + 0.35);
    surfaceGeometry = new THREE.BoxGeometry(width, 0.06, depth);
  } else {
    width = court.radius * 2;
    depth = width;
    edgeGeometry = new THREE.CylinderGeometry(court.radius + 0.25, court.radius + 0.25, 0.07, 8);
    surfaceGeometry = new THREE.CylinderGeometry(court.radius, court.radius, 0.06, 8);
  }
  const edge = court.style === 'outer-street' ? null : new THREE.Mesh(edgeGeometry, materials.edge);
  const surfaceY = court.style === 'outer-street' ? 0.105 : 0.135;
  if (edge) {
    edge.position.set(court.center[0], 0.09, court.center[1]);
    edge.rotation.y = THREE.MathUtils.degToRad(court.rotationY || 0);
    edge.receiveShadow = true;
    scene.add(edge);
  }

  const surfaceMaterial = court.style === 'platform'
    ? materials.paving(width, depth, 0xe0c79f)
    : materials.darkPaving(width, depth);
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surface.position.set(court.center[0], surfaceY, court.center[1]);
  surface.rotation.y = THREE.MathUtils.degToRad(court.rotationY || 0);
  surface.receiveShadow = true;
  surface.userData.walkable = true;
  walkMeshes.push(surface);
  scene.add(surface);
}

function addPlayableDistrict(scene, walkMeshes, materials) {
  const [width, depth] = WALKABLE_DISTRICT.size;
  const surface = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.14, depth),
    materials.districtPaving(width, depth),
  );
  surface.name = WALKABLE_DISTRICT.id;
  surface.position.set(WALKABLE_DISTRICT.center[0], 0.01, WALKABLE_DISTRICT.center[1]);
  surface.receiveShadow = true;
  surface.userData.walkable = true;
  walkMeshes.push(surface);
  scene.add(surface);
}

function addDistrictRoads(scene, walkMeshes, materials) {
  // Flush inlays replace the former raised curb-and-road sandwiches. The
  // continuous base remains visible between streets, so the whole district
  // reads as one laid surface instead of overlapping coloured rectangles.
  for (const road of DISTRICT_ROADS) {
    const [width, depth] = road.size;
    const material = alignMaterialToWorld(
      materials.darkPaving(width, depth),
      road.center[0] - width * 0.5,
      road.center[1] - depth * 0.5,
      5.5,
    );
    const street = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.045, depth),
      material,
    );
    street.name = road.id;
    street.position.set(road.center[0], 0.102, road.center[1]);
    street.receiveShadow = true;
    street.userData.walkable = true;
    walkMeshes.push(street);
    scene.add(street);
  }
}

function addDistrictSidewalks(scene, walkMeshes, materials) {
  for (const road of DISTRICT_ROADS) {
    const horizontal = road.size[0] > road.size[1];
    const sidewalkWidth = road.sidewalkWidth ?? 1.7;
    const roadWidth = horizontal ? road.size[1] : road.size[0];
    const offset = roadWidth * 0.5 + sidewalkWidth * 0.5;
    for (const side of [-1, 1]) {
      const width = horizontal ? road.size[0] : sidewalkWidth;
      const depth = horizontal ? sidewalkWidth : road.size[1];
      const x = road.center[0] + (horizontal ? 0 : side * offset);
      const z = road.center[1] + (horizontal ? side * offset : 0);
      const material = alignMaterialToWorld(
        materials.paving(width, depth, 0xc1b39c),
        x - width * 0.5,
        z - depth * 0.5,
        6,
      );
      const sidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.05, depth),
        material,
      );
      sidewalk.name = `${road.id}-sidewalk-${side < 0 ? 'a' : 'b'}`;
      sidewalk.position.set(x, 0.13, z);
      sidewalk.receiveShadow = true;
      sidewalk.userData.walkable = true;
      walkMeshes.push(sidewalk);
      scene.add(sidewalk);
    }
  }
}

function addDistrictCrossings(scene, walkMeshes, materials) {
  for (const crossing of DISTRICT_CROSSINGS) {
    const [width, depth] = crossing.size;
    const material = alignMaterialToWorld(
      materials.paving(width, depth, 0xaa9b84),
      crossing.center[0] - width * 0.5,
      crossing.center[1] - depth * 0.5,
      3.2,
    );
    const surface = new THREE.Mesh(new THREE.BoxGeometry(width, 0.052, depth), material);
    surface.name = crossing.id;
    surface.position.set(crossing.center[0], 0.132, crossing.center[1]);
    surface.receiveShadow = true;
    surface.userData.walkable = true;
    walkMeshes.push(surface);
    scene.add(surface);
  }
}

function addHiddenWalkZoneSurfaces(scene, materials) {
  for (const zone of HIDDEN_WALK_ZONES) {
    const surface = new THREE.Mesh(
      new THREE.BoxGeometry(zone.size[0], 0.08, zone.size[1]),
      materials.hiddenStreet,
    );
    surface.name = `${zone.id}-backstage-surface`;
    surface.position.set(zone.center[0], 0.1, zone.center[1]);
    surface.receiveShadow = true;
    scene.add(surface);
  }
}

function addRibbon(scene, walkMeshes, materials, a, b, width = 3.05) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const centerX = (a[0] + b[0]) * 0.5;
  const centerZ = (a[1] + b[1]) * 0.5;
  const angle = Math.atan2(dx, dz);

  const surface = new THREE.Mesh(new THREE.BoxGeometry(width, 0.055, length), materials.paving(width, length, 0xd8c8ae));
  surface.position.set(centerX, 0.145, centerZ);
  surface.rotation.y = angle;
  surface.receiveShadow = true;
  surface.userData.walkable = true;
  walkMeshes.push(surface);
  scene.add(surface);
}

function addTunnelTerrain(scene, materials) {
  const group = new THREE.Group();
  group.name = 'tram-tunnel-rock-cutting';
  group.position.set(TUNNEL_LAYOUT.center[0], 0, TUNNEL_LAYOUT.center[2]);
  group.rotation.y = THREE.MathUtils.degToRad(TUNNEL_LAYOUT.rotationY);

  // Deep black volume and roof make the rail visibly continue into darkness.
  const throat = new THREE.Mesh(
    new THREE.BoxGeometry(TUNNEL_TERRAIN.throatWidth, TUNNEL_TERRAIN.throatHeight, TUNNEL_TERRAIN.depth),
    materials.tunnelVoid,
  );
  throat.position.set(0, TUNNEL_TERRAIN.throatHeight * 0.5, -TUNNEL_TERRAIN.depth * 0.42);
  group.add(throat);

  const bankGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockSpecs = [
    [-7.8, 2.3, -3.4, 4.1, 3.4, 5.2, 0.1],
    [7.8, 2.3, -3.4, 4.1, 3.4, 5.2, -0.15],
    [-8.9, 4.5, -7.6, 5.1, 4.1, 6.4, 0.28],
    [8.9, 4.6, -7.6, 5.1, 4.2, 6.4, -0.22],
    [-6.2, 6.8, -9.4, 4.8, 3.3, 6.0, -0.08],
    [6.2, 6.9, -9.4, 4.8, 3.4, 6.0, 0.14],
    [0, 8.0, -10.5, 5.7, 3.0, 7.0, 0.05],
    [-10.2, 3.0, -12.7, 5.4, 4.5, 6.2, -0.12],
    [10.2, 3.1, -12.7, 5.4, 4.5, 6.2, 0.18],
  ];
  for (const [x, y, z, sx, sy, sz, rotationZ] of rockSpecs) {
    const rock = new THREE.Mesh(bankGeometry, materials.rock);
    rock.position.set(x, y, z);
    rock.scale.set(sx, sy, sz);
    rock.rotation.set(rotationZ * 0.35, rotationZ, rotationZ * 0.7);
    rock.castShadow = rock.receiveShadow = true;
    group.add(rock);
  }

  // A low retaining shelf blends the cutting into the city block instead of
  // leaving a facade floating on an infinite paving plane.
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 13.5), materials.rockFace);
    wall.position.set(side * 6.2, 1.55, -5.3);
    wall.rotation.z = side * -0.08;
    wall.castShadow = wall.receiveShadow = true;
    group.add(wall);
  }
  scene.add(group);
}

function addCeremonialPad(scene, walkMeshes, materials, x, z, radius) {
  const edge = new THREE.Mesh(
    new THREE.CylinderGeometry(radius + 0.42, radius + 0.42, 0.2, 8),
    materials.edge,
  );
  edge.position.set(x, 0.27, z);
  edge.receiveShadow = true;
  scene.add(edge);

  const surface = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.16, 8),
    materials.paving(radius * 2, radius * 2),
  );
  surface.position.set(x, 0.41, z);
  surface.receiveShadow = true;
  surface.userData.walkable = true;
  walkMeshes.push(surface);
  scene.add(surface);
}

function addRail(scene, materials) {
  const dx = RAIL_LAYOUT.end[0] - RAIL_LAYOUT.start[0];
  const dz = RAIL_LAYOUT.end[1] - RAIL_LAYOUT.start[1];
  const length = Math.hypot(dx, dz);
  const centerX = (RAIL_LAYOUT.start[0] + RAIL_LAYOUT.end[0]) * 0.5;
  const centerZ = (RAIL_LAYOUT.start[1] + RAIL_LAYOUT.end[1]) * 0.5;
  const angle = Math.atan2(dx, dz);
  const railGroup = new THREE.Group();
  railGroup.name = 'northwest-tunnel-railway';
  railGroup.position.set(centerX, 0, centerZ);
  railGroup.rotation.y = angle;
  const railBed = new THREE.Mesh(
    new THREE.BoxGeometry(RAIL_LAYOUT.bedWidth, 0.18, length + 2),
    materials.darkPaving(RAIL_LAYOUT.bedWidth, length + 2),
  );
  railBed.name = 'tram-tunnel-rail-bed';
  railBed.position.y = 0.08;
  railBed.receiveShadow = true;
  railGroup.add(railBed);
  for (const offset of [-RAIL_LAYOUT.gauge * 0.5, RAIL_LAYOUT.gauge * 0.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, length), materials.iron);
    rail.position.set(offset, 0.38, 0);
    rail.castShadow = rail.receiveShadow = true;
    railGroup.add(rail);
  }
  for (let z = -length * 0.5; z <= length * 0.5; z += RAIL_LAYOUT.sleeperStep) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.08, 0.19), materials.bronze);
    sleeper.position.set(0, 0.32, z);
    sleeper.castShadow = sleeper.receiveShadow = true;
    railGroup.add(sleeper);
  }
  scene.add(railGroup);
}

function addLandmarkIslands(scene, materials) {
  const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.32, 64), materials.bronze);
  clockRim.position.set(0, 0.36, 0);
  clockRim.receiveShadow = true;
  scene.add(clockRim);
  const clockInset = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, 0.34, 64), materials.patina);
  clockInset.position.set(0, 0.48, 0);
  clockInset.receiveShadow = true;
  scene.add(clockInset);

  const fountainRim = new THREE.Mesh(new THREE.CylinderGeometry(4.45, 4.45, 0.34, 64), materials.edge);
  fountainRim.position.set(20, 0.37, 0);
  fountainRim.receiveShadow = true;
  scene.add(fountainRim);
  const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(3.85, 3.85, 0.18, 64), materials.water);
  fountainWater.position.set(20, 0.57, 0);
  fountainWater.receiveShadow = true;
  scene.add(fountainWater);
}

function sampleWalkSurfaceY(walkMeshes, x, z, fallback = CITY_SURFACE_Y) {
  if (!walkMeshes?.length) return fallback;
  for (const mesh of walkMeshes) mesh.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(x, 32, z),
    new THREE.Vector3(0, -1, 0),
    0,
    64,
  );
  const hit = raycaster.intersectObjects(walkMeshes, false)[0];
  return hit?.point?.y ?? fallback;
}

function addLamp(scene, materials, x, z, look, lampIndex = 0, groundY = CITY_SURFACE_Y) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.9, 12), materials.iron);
  pole.position.y = 1.95;
  pole.castShadow = true;
  group.add(pole);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.4, 10), materials.bronze);
  crown.position.y = 3.85;
  crown.castShadow = true;
  group.add(crown);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffbd62,
      emissive: 0xff7a12,
      emissiveIntensity: look === 'night' ? 12 : 2.2,
      roughness: 0.4,
    }),
  );
  bulb.name = 'echo-city-night-streetlight-bulb';
  bulb.userData.lampIndex = lampIndex;
  bulb.position.y = 4.15;
  group.add(bulb);
  group.position.set(x, groundY, z);
  scene.add(group);
  if (look === 'night') {
    // A street lamp points down.  A PointLight would render six shadow faces
    // per fixture, which is both less physical and prohibitively expensive in
    // the browser.  The warm bulb and additive ground pool provide the soft
    // lateral spill while this cone supplies one directional shadow map.
    const pool = new THREE.SpotLight(
      ECHO_CITY_LOOKS.night.lampColor,
      420,
      10.5,
      Math.PI / 3.25,
      0.62,
      2.15,
    );
    pool.name = 'echo-city-night-streetlight';
    pool.userData.lampIndex = lampIndex;
    pool.userData.fullIntensity = 420;
    pool.position.set(x, groundY + 4.05, z);
    const poolTarget = new THREE.Object3D();
    poolTarget.name = 'echo-city-night-streetlight-target';
    poolTarget.position.set(x, groundY, z);
    pool.target = poolTarget;
    pool.castShadow = false;
    pool.visible = false;
    pool.shadow.mapSize.set(512, 512);
    pool.shadow.camera.near = 0.35;
    pool.shadow.camera.far = 11;
    pool.shadow.bias = -0.0012;
    pool.shadow.normalBias = 0.035;
    scene.add(pool);
    scene.add(poolTarget);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb85f,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const groundPool = new THREE.Mesh(new THREE.CircleGeometry(2.85, 32), glowMaterial);
    groundPool.name = 'echo-city-night-streetlight-ground-pool';
    groundPool.userData.lampIndex = lampIndex;
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.set(x, groundY + 0.035, z);
    scene.add(groundPool);
  }
}

function addStreetFurniture(scene, materials, look, walkMeshes) {
  // Every fixture owns a bulb and a ground pool.  The Chapter 5 night-round
  // controller activates only the nearest local lights and gives shadows to
  // the nearest two, so the street reads as individually lit without asking
  // the GPU to render 27 six-face point-light shadow maps at once.
  const groundAt = (x, z) => sampleWalkSurfaceY(walkMeshes, x, z);
  ECHO_CITY_LAMP_POSITIONS.forEach(([x, z], index) => addLamp(scene, materials, x, z, look, index, groundAt(x, z)));
  addMailbox(scene, materials, -3.2, 31.5, -35, groundAt(-3.2, 31.5));
  addMailbox(scene, materials, 34, 38, 12, groundAt(34, 38));
  addMailbox(scene, materials, -40.5, -14, 90, groundAt(-40.5, -14));
  addMailbox(scene, materials, 40.5, -14, -90, groundAt(40.5, -14));
  addMailbox(scene, materials, -24, 49, 180, groundAt(-24, 49));
  addMailbox(scene, materials, 26, 49, 180, groundAt(26, 49));
}

function addMailbox(scene, materials, x, z, rotationY, groundY = CITY_SURFACE_Y) {
  const group = new THREE.Group();
  group.name = 'municipal-mailbox';
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.2, 12), materials.wine || materials.bronze);
  body.position.y = 0.6;
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.43, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), materials.bronze);
  cap.position.y = 1.2;
  cap.castShadow = true;
  group.add(cap);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.08), materials.iron);
  slot.position.set(0, 0.83, 0.43);
  group.add(slot);
  group.position.set(x, groundY, z);
  group.rotation.y = THREE.MathUtils.degToRad(rotationY);
  scene.add(group);
}

function addModelSupport(scene, materials, spec, groundY = CITY_SURFACE_Y) {
  if (!spec.support) return;
  const rotationY = THREE.MathUtils.degToRad(spec.rotationY);
  if (spec.support.type === 'counter') {
    const [width, height, depth] = spec.support.size;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.edge);
    counter.position.set(spec.position[0], groundY + height * 0.5, spec.position[2]);
    counter.rotation.y = rotationY;
    counter.castShadow = counter.receiveShadow = true;
    scene.add(counter);
    const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.14, 0.1, depth + 0.14), materials.bronze);
    top.position.set(spec.position[0], groundY + height + 0.05, spec.position[2]);
    top.rotation.y = rotationY;
    top.castShadow = top.receiveShadow = true;
    scene.add(top);
    return;
  }
  if (spec.support.type === 'pole') {
    const height = spec.support.height;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, height, 14), materials.iron);
    pole.position.set(spec.position[0], groundY + height * 0.5, spec.position[2]);
    pole.castShadow = pole.receiveShadow = true;
    scene.add(pole);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.22, 14), materials.bronze);
    collar.position.set(spec.position[0], groundY + 0.11, spec.position[2]);
    collar.castShadow = collar.receiveShadow = true;
    scene.add(collar);
  }
}

function makePlayer(scene) {
  const group = new THREE.Group();
  const coat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 0.95, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x4c2420, roughness: 0.82 }),
  );
  coat.position.y = 1.02;
  coat.castShadow = true;
  group.add(coat);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0xb8794f, roughness: 0.76 }),
  );
  head.position.y = 2.05;
  head.castShadow = true;
  group.add(head);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.62, 32),
    new THREE.MeshBasicMaterial({ color: CITY_PALETTE.teal, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.05;
  group.add(marker);
  group.position.set(0, 0.49, 16.8);
  scene.add(group);
  return group;
}

function makeDestinationMarker(scene) {
  const material = new THREE.MeshBasicMaterial({ color: CITY_PALETTE.amber, transparent: true, opacity: 0 });
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.65, 40), material);
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.51;
  marker.visible = false;
  scene.add(marker);
  return marker;
}

function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}

function requestedCameraPreset() {
  const focus = new URLSearchParams(window.location.search).get('focus');
  const target = CAMERA_FOCUS_TARGETS[focus];
  if (!target) return { ...CAMERA_HOME, focus: 'overview' };
  const dx = target[0] - CAMERA_HOME.target[0];
  const dz = target[2] - CAMERA_HOME.target[2];
  return {
    focus,
    target,
    position: [CAMERA_HOME.position[0] + dx, CAMERA_HOME.position[1], CAMERA_HOME.position[2] + dz],
    zoom: 2.85,
  };
}

function createCamera(container, preset) {
  const aspect = container.clientWidth / container.clientHeight;
  const halfHeight = 35;
  const camera = new THREE.OrthographicCamera(-halfHeight * aspect, halfHeight * aspect, halfHeight, -halfHeight, 0.1, 320);
  camera.position.fromArray(preset.position);
  camera.lookAt(...preset.target);
  camera.zoom = preset.zoom;
  camera.updateProjectionMatrix();
  return camera;
}

function addLights(scene, look) {
  const night = look === 'night';
  const hemi = new THREE.HemisphereLight(
    night ? 0x31455c : 0xaac8c4,
    night ? 0x120b0d : 0x4a2a20,
    night ? 0.08 : 1.8,
  );
  hemi.name = night ? 'echo-city-night-ambient' : 'echo-city-day-ambient';
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(night ? 0x607b99 : 0xffd39a, night ? 0.16 : 4.3);
  sun.name = night ? 'echo-city-moonlight' : 'echo-city-sunlight';
  sun.position.set(-34, 52, 26);
  sun.target.position.set(4, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -52;
  sun.shadow.camera.right = 52;
  sun.shadow.camera.top = 52;
  sun.shadow.camera.bottom = -52;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 135;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight(night ? 0xb85a26 : 0x5b9ca4, night ? 0.03 : 1.1);
  fill.position.set(20, 28, -30);
  scene.add(fill);
}

function applyNightMaterialGrade(root) {
  const graded = new Map();
  root.traverse((object) => {
    if (!object.isMesh) return;
    const source = Array.isArray(object.material) ? object.material : [object.material];
    const next = source.map((material) => {
      if (!material || material.isMeshBasicMaterial || !material.color) return material;
      if (!graded.has(material)) {
        const clone = material.clone();
        // Grade the reflected/base colour while preserving emissive windows
        // and lamp bulbs. This makes light sources, rather than albedo maps,
        // describe the street at night.
        clone.color.multiplyScalar(0.12);
        if ('envMapIntensity' in clone) clone.envMapIntensity = Math.min(clone.envMapIntensity ?? 1, 0.16);
        graded.set(material, clone);
      }
      return graded.get(material);
    });
    object.material = Array.isArray(object.material) ? next : next[0];
  });
}

function placeAuthoredModel(parent, materials, root, spec, walkMeshes) {
  root.position.fromArray(spec.position);
  root.rotation.y = THREE.MathUtils.degToRad(spec.rotationY);
  root.scale.setScalar(spec.scale);
  if (spec.alignToGround) {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const baseGroundY = spec.groundY ?? sampleWalkSurfaceY(walkMeshes, spec.position[0], spec.position[2]);
    let groundY = baseGroundY;
    if (spec.support?.type === 'counter') {
      groundY = baseGroundY + spec.support.size[1] + 0.1;
    } else if (spec.support?.type === 'pole') {
      groundY = baseGroundY + spec.support.height;
    }
    root.position.y += groundY - bounds.min.y - (spec.groundSink ?? 0);
    root.userData.groundY = groundY;
    root.userData.groundSink = spec.groundSink ?? 0;
  }
  root.userData.assetId = spec.id;
  root.userData.assetCategory = spec.category || 'landmark';
  root.userData.interactionRole = spec.role || null;
  addModelSupport(parent, materials, spec, spec.groundY ?? sampleWalkSurfaceY(walkMeshes, spec.position[0], spec.position[2]));
  addShadowFlags(root);
  parent.add(root);
}

/** Exact, camera-agnostic Chapter 3 Echo City world snapshot. */
export async function buildEchoCityV68World({ renderer, look = 'day' }) {
  const resolvedLook = look === 'night' ? 'night' : 'day';
  const lookConfig = ECHO_CITY_LOOKS[resolvedLook];
  const root = new THREE.Group();
  root.name = 'chapter-3-echo-city-v68-world';
  const materials = await makeMaterialSet(renderer);
  const walkMeshes = [];

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(OUTER_CITY_GROUND.baseSize[0], 0.5, OUTER_CITY_GROUND.baseSize[1]),
    materials.earth,
  );
  base.position.y = -0.42;
  base.receiveShadow = true;
  root.add(base);
  const street = new THREE.Mesh(
    new THREE.BoxGeometry(OUTER_CITY_GROUND.streetSize[0], 0.24, OUTER_CITY_GROUND.streetSize[1]),
    materials.street,
  );
  street.position.y = -0.12;
  street.receiveShadow = true;
  root.add(street);

  addPlayableDistrict(root, walkMeshes, materials);
  addDistrictRoads(root, walkMeshes, materials);
  addDistrictSidewalks(root, walkMeshes, materials);
  addDistrictCrossings(root, walkMeshes, materials);
  addHiddenWalkZoneSurfaces(root, materials);
  for (const court of COURTS.filter((item) => item.shape === 'octagon' || item.style === 'platform')) {
    addCourt(root, walkMeshes, materials, court);
  }
  addCeremonialPad(root, walkMeshes, materials, 0, 0, 9.15);
  addCeremonialPad(root, walkMeshes, materials, 20, 0, 8.1);
  addLandmarkIslands(root, materials);
  addRail(root, materials);
  addTunnelTerrain(root, materials);
  addStreetFurniture(root, materials, resolvedLook, walkMeshes);
  addLights(root, resolvedLook);

  await MeshoptDecoder.ready;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const modelCache = new Map();
  const loadErrors = [];
  const uniqueModels = [...CITY_MODELS.filter((spec) => !spec.cloneOf), ...PERIMETER_MODEL_SOURCES];
  await Promise.all(uniqueModels.map(async (spec) => {
    try {
      const gltf = await loader.loadAsync(`${MODEL_ROOT}/${spec.file}`);
      const model = gltf.scene;
      model.name = spec.id;
      addShadowFlags(model);
      modelCache.set(spec.id, model);
      if (spec.category !== 'perimeter-prototype') placeAuthoredModel(root, materials, model, spec, walkMeshes);
    } catch (error) {
      loadErrors.push({ id: spec.id, message: error?.message || String(error) });
    }
  }));
  for (const spec of CITY_MODELS.filter((item) => item.cloneOf)) {
    const source = modelCache.get(spec.cloneOf);
    if (source) placeAuthoredModel(root, materials, source.clone(true), spec, walkMeshes);
  }
  // CITY_MODELS already author the collision shape for trams and street
  // furniture. Feed those shapes into the runtime collision world instead of
  // using them only for click-navigation checks.
  const boundaryObstacles = PROP_OBSTACLES.map((obstacle) => ({ ...obstacle }));
  for (const spec of PERIMETER_BUILDINGS) {
    const source = modelCache.get(spec.prototype);
    if (!source) {
      loadErrors.push({ id: spec.id, message: `Missing perimeter prototype ${spec.prototype}` });
      continue;
    }
    root.add(prepareBoundaryInstance(source.clone(true), spec));
    const footprint = PERIMETER_FOOTPRINTS[spec.prototype];
    const scale = boundaryScaleFor(spec);
    boundaryObstacles.push({
      type: 'oriented-box', center: [spec.position[0], spec.position[2]],
      size: [footprint[0] * scale[0], footprint[1] * scale[2]],
      rotationY: spec.rotationY, padding: 0.18, sourceId: spec.id,
    });
  }
  if (resolvedLook === 'night') applyNightMaterialGrade(root);
  root.userData.fog = new THREE.FogExp2(lookConfig.fog, lookConfig.fogDensity);
  root.userData.background = lookConfig.sky;
  root.userData.look = resolvedLook;
  root.userData.rendererExposure = resolvedLook === 'night' ? 0.20 : 0.92;
  root.userData.cityPalette = CITY_PALETTE;
  root.userData.source = 'chapter-3-echo-city-v68';
  root.userData.modelCount = CITY_MODELS.length + PERIMETER_BUILDINGS.length;
  root.userData.loadErrors = loadErrors;
  return { root, boundaryObstacles, loadErrors, walkMeshes };
}

export { CITY_PALETTE, ECHO_CITY_LOOKS, OBSTACLES, TUNNEL_TERRAIN, WALKABLE_DISTRICT };
