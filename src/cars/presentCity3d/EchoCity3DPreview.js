import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import {
  CAMERA_HOME,
  CAMERA_FOLLOW,
  CAMERA_FOCUS_TARGETS,
  CAMERA_LIMITS,
  BOUNDARY_BARRIERS,
  DEVELOPER_CAMERA_LIMITS,
  CIVIC_PLAZA_PAVING,
  CITY_MODELS,
  CITY_PALETTE,
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

const MATERIAL_ROOT = '/assets/chapter03-3d/materials';
const GRID_STEP = 1;
const NAV_BOUNDS = Object.freeze({ minX: -58, maxX: 58, minZ: -28, maxZ: 58 });
const PROP_OBSTACLES = CITY_MODELS
  .filter((spec) => spec.collision)
  .map((spec) => ({ ...spec.collision, center: [spec.position[0], spec.position[2]], sourceId: spec.id }));
// The porter handcart moves with Olek at runtime, so its collision footprint
// is maintained by Chapter3OpeningRuntime instead of remaining at spawn.
const ALL_OBSTACLES = [
  ...OBSTACLES,
  ...PROP_OBSTACLES.filter((obstacle) => obstacle.sourceId !== 'porter-handcart'),
  ...TUNNEL_TERRAIN.obstacles,
];

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

// ShapeGeometry UVs are already expressed in the shape's coordinate space.
// Using the box-material repeat here would multiply world metres twice and
// shrink the limestone pattern into a flat average colour.
function tileShapeMaterialInWorld(material, minX, minZ, tileSize) {
  for (const key of ['map', 'bumpMap', 'roughnessMap']) {
    const texture = material[key];
    if (!texture) continue;
    texture.repeat.set(1 / tileSize, 1 / tileSize);
    texture.offset.set(-minX / tileSize, -minZ / tileSize);
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
    rockFace: new THREE.MeshStandardMaterial({
      color: 0x6a5548,
      map: cloneTexture(darkLimestone, [2, 4], true),
      bumpMap: cloneTexture(height, [2, 4]),
      bumpScale: 0.16,
      roughness: 0.95,
      metalness: 0,
    }),
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

function addNorthFrontageApron(scene, materials) {
  // Bridge the shallow setback between the north sidewalk and the irregular
  // generated facades. It remains decorative: navigation and building
  // collision continue to define where the player can actually stand.
  const width = 118;
  const depth = 5.6;
  const material = alignMaterialToWorld(
    materials.darkPaving(width, depth),
    -width * 0.5,
    -30.65 - depth * 0.5,
    5.5,
  );
  const apron = new THREE.Mesh(new THREE.BoxGeometry(width, 0.055, depth), material);
  apron.name = 'north-frontage-apron';
  apron.position.set(0, 0.128, -30.65);
  apron.receiveShadow = true;
  scene.add(apron);
}

function addNorthBackstagePaving(scene, materials) {
  const width = 118;
  const depth = 34;
  const material = alignMaterialToWorld(
    materials.darkPaving(width, depth),
    -width * 0.5,
    -62,
    5.5,
  );
  const paving = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), material);
  paving.name = 'north-backstage-continuous-paving';
  paving.position.set(0, 0.02, -45);
  paving.receiveShadow = true;
  scene.add(paving);
}

function addBoundaryBarriers(scene, materials) {
  const postGeometry = new THREE.CylinderGeometry(0.11, 0.15, 1.75, 8);
  const panelGeometry = new THREE.BoxGeometry(1.45, 0.44, 0.12);
  for (const barrier of BOUNDARY_BARRIERS) {
    const group = new THREE.Group();
    group.name = barrier.id;
    for (const x of [-barrier.length * 0.5, 0, barrier.length * 0.5]) {
      const post = new THREE.Mesh(postGeometry, materials.iron);
      post.position.set(x, 0.88, 0);
      post.castShadow = true;
      group.add(post);
    }
    for (const y of [0.72, 1.32]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(barrier.length, 0.13, 0.14),
        materials.iron,
      );
      rail.position.y = y;
      rail.castShadow = true;
      group.add(rail);
    }
    const panel = new THREE.Mesh(panelGeometry, materials.wine);
    panel.position.set(0, 1.04, -0.1);
    panel.castShadow = true;
    group.add(panel);
    group.position.set(barrier.center[0], 0.12, barrier.center[1]);
    group.rotation.y = THREE.MathUtils.degToRad(barrier.rotationY);
    scene.add(group);
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

function makeWorldShape(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}

function makeTiledWorldShapeGeometry(points, tileSize) {
  const geometry = new THREE.ShapeGeometry(makeWorldShape(points));
  const positions = geometry.getAttribute('position');
  const uvs = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index += 1) {
    uvs[index * 2] = positions.getX(index) / tileSize;
    uvs[index * 2 + 1] = -positions.getY(index) / tileSize;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geometry;
}

function pointInsidePolygon(x, z, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [xi, zi] = points[index];
    const [xj, zj] = points[previous];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

function addCivicPlazaPaving(scene, walkMeshes, materials) {
  const { center, insetScale, points } = CIVIC_PLAZA_PAVING;
  const inset = points.map(([x, z]) => [
    center[0] + (x - center[0]) * insetScale,
    center[1] + (z - center[1]) * insetScale,
  ]);
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minZ = Math.min(...points.map(([, z]) => z));
  const maxZ = Math.max(...points.map(([, z]) => z));

  const border = new THREE.Mesh(new THREE.ShapeGeometry(makeWorldShape(points)), materials.edge);
  border.name = 'civic-plaza-stone-border';
  border.rotation.x = -Math.PI / 2;
  border.position.y = 0.146;
  border.receiveShadow = true;
  scene.add(border);

  const material = tileShapeMaterialInWorld(
    materials.paving(maxX - minX, maxZ - minZ, 0xd6bd97),
    0,
    0,
    4.2,
  );
  for (const key of ['map', 'bumpMap', 'roughnessMap']) {
    if (material[key]) material[key].repeat.set(1, 1);
  }
  material.side = THREE.DoubleSide;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;
  const surface = new THREE.Mesh(makeTiledWorldShapeGeometry(inset, 4.2), material);
  surface.name = 'civic-plaza-continuous-paving';
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.15;
  surface.receiveShadow = true;
  surface.userData.walkable = true;
  walkMeshes.push(surface);
  scene.add(surface);

  // Instanced 2.34m paving panels keep the source limestone legible on every
  // browser/GPU. A single draw call replaces the unreliable UV interpolation
  // of one large concave polygon, while the small gaps read as laid stone bays.
  const tileStep = 2.4;
  const tileSize = 2.34;
  const placements = [];
  for (let z = minZ + tileStep / 2; z <= maxZ - tileStep / 2; z += tileStep) {
    const row = Math.round((z - minZ) / tileStep);
    for (let x = minX + tileStep / 2 + (row % 2) * tileStep / 2; x <= maxX - tileStep / 2; x += tileStep) {
      const corners = [
        [x - tileSize / 2, z - tileSize / 2],
        [x + tileSize / 2, z - tileSize / 2],
        [x + tileSize / 2, z + tileSize / 2],
        [x - tileSize / 2, z + tileSize / 2],
      ];
      if (!corners.every(([cornerX, cornerZ]) => pointInsidePolygon(cornerX, cornerZ, inset))) continue;
      placements.push([x, z]);
    }
  }
  const tileMaterial = materials.paving(tileSize, tileSize, 0xe1c8a0);
  const tiles = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(tileSize, tileSize),
    tileMaterial,
    placements.length,
  );
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  placements.forEach(([x, z], index) => {
    matrix.compose(new THREE.Vector3(x, 0.158, z), rotation, new THREE.Vector3(1, 1, 1));
    tiles.setMatrixAt(index, matrix);
  });
  tiles.instanceMatrix.needsUpdate = true;
  tiles.computeBoundingSphere();
  tiles.name = 'civic-plaza-instanced-limestone';
  tiles.receiveShadow = true;
  scene.add(tiles);
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
    [-14.6, 4.4, -11.5, 6.2, 4.8, 7.4, 0.16],
    [14.4, 4.7, -11.8, 6.0, 5.0, 7.2, -0.2],
    [-11.2, 6.9, -17.5, 6.5, 5.1, 7.8, -0.08],
    [10.8, 7.2, -17.8, 6.3, 5.3, 7.8, 0.12],
    [0, 9.2, -19.6, 7.8, 4.2, 8.6, 0.04],
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

function addLamp(scene, materials, x, z) {
  const group = new THREE.Group();
  group.name = 'street-lamp';
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
    new THREE.MeshStandardMaterial({ color: 0xffd69a, emissive: 0xffa84c, emissiveIntensity: 2.2, roughness: 0.4 }),
  );
  bulb.position.y = 4.15;
  group.add(bulb);
  group.position.set(x, 0.3, z);
  scene.add(group);
}

function addStreetFurniture(scene, materials) {
  [
    [-8.8, 8.8], [8.8, 8.8], [-8.8, -8.8], [8.8, -8.8],
    [-23.5, 8], [-23.5, -8], [12, 8.5], [28.5, 7], [28.5, -7],
    [-6.5, -15.5], [10.8, -20.5],
    [-5, 27], [2.8, 37.8], [23, 38], [40.5, 34], [49.2, 15], [40.5, -6],
    [-40, -20.7], [-20, -20.7], [20, -20.7], [40, -20.7],
    [-40, 12.4], [40, 12.4], [-40, 38], [40, 38], [-20, 49], [20, 49],
  ].forEach(([x, z]) => addLamp(scene, materials, x, z));
  addMailbox(scene, materials, -3.2, 31.5, -35);
  addMailbox(scene, materials, 34, 38, 12);
  addMailbox(scene, materials, -40.5, -14, 90);
  addMailbox(scene, materials, 40.5, -14, -90);
  addMailbox(scene, materials, -24, 49, 180);
  addMailbox(scene, materials, 26, 49, 180);
}

function addMailbox(scene, materials, x, z, rotationY) {
  const group = new THREE.Group();
  group.name = 'municipal-mailbox';
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.2, 12), materials.wine || materials.bronze);
  body.position.y = 0.82;
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.43, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), materials.bronze);
  cap.position.y = 1.42;
  cap.castShadow = true;
  group.add(cap);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.08), materials.iron);
  slot.position.set(0, 1.05, 0.43);
  group.add(slot);
  group.position.set(x, 0.25, z);
  group.rotation.y = THREE.MathUtils.degToRad(rotationY);
  scene.add(group);
}

function addModelSupport(scene, materials, spec) {
  if (!spec.support) return;
  const rotationY = THREE.MathUtils.degToRad(spec.rotationY);
  if (spec.support.type === 'counter') {
    const [width, height, depth] = spec.support.size;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.edge);
    counter.position.set(spec.position[0], 0.5 + height * 0.5, spec.position[2]);
    counter.rotation.y = rotationY;
    counter.castShadow = counter.receiveShadow = true;
    scene.add(counter);
    const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.14, 0.1, depth + 0.14), materials.bronze);
    top.position.set(spec.position[0], 0.54 + height, spec.position[2]);
    top.rotation.y = rotationY;
    top.castShadow = top.receiveShadow = true;
    scene.add(top);
    return;
  }
  if (spec.support.type === 'pole') {
    const height = spec.support.height;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, height, 14), materials.iron);
    pole.position.set(spec.position[0], 0.5 + height * 0.5, spec.position[2]);
    pole.castShadow = pole.receiveShadow = true;
    scene.add(pole);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.22, 14), materials.bronze);
    collar.position.set(spec.position[0], 0.61, spec.position[2]);
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

function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xaac8c4, 0x4a2a20, 1.8);
  hemi.name = 'city-hemisphere-light';
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffd39a, 4.3);
  sun.name = 'city-sun-light';
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

  const fill = new THREE.DirectionalLight(0x5b9ca4, 1.1);
  fill.name = 'city-fill-light';
  fill.position.set(20, 28, -30);
  scene.add(fill);
}

export class EchoCity3DPreview {
  constructor({ container, statusElement, loadingPanel, loadingLabel, loadingCount, loadingFill }) {
    this.container = container;
    this.statusElement = statusElement;
    this.loadingPanel = loadingPanel;
    this.loadingLabel = loadingLabel;
    this.loadingCount = loadingCount;
    this.loadingFill = loadingFill;
    this.expectedUniqueModels = CITY_MODELS.filter((spec) => !spec.cloneOf).length + PERIMETER_MODEL_SOURCES.length;
    this.loadedModelIds = [];
    this.loadedSourceIds = [];
    this.boundaryModelIds = [];
    this.boundaryObstacles = [];
    this.occludingBuildings = [];
    this.occlusionRay = new THREE.Ray();
    this.occlusionDirection = new THREE.Vector3();
    this.occlusionHitPoint = new THREE.Vector3();
    this.loadErrors = [];
    this.modelsReady = false;
    this.walkMeshes = [];
    this.surfaceRaycaster = new THREE.Raycaster();
    this.surfaceRayOrigin = new THREE.Vector3();
    this.surfaceRayDirection = new THREE.Vector3(0, -1, 0);
    this.path = [];
    this.clickCount = 0;
    this.lastClick = null;
    this.elapsed = 0;
    this.lastFrame = performance.now();
    this.fps = 0;
    this.fpsFrames = 0;
    this.fpsWindow = 0;
    this.gameplayRuntime = null;
    this.pathArrival = null;
    this.cameraOverrideTarget = null;
    // Optional replacement for the fixed isometric camera offset (used by the
    // Copper Heron lobby, whose only open face looks northwest).
    this.cameraOffsetOverride = null;
    this.cameraShakeRemaining = 0;
    this.cameraShakeDuration = 0;
    this.cameraShakeAmplitude = 0;
    this.cameraShakeOffset = new THREE.Vector3();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CITY_PALETTE.sky);
    this.scene.fog = new THREE.FogExp2(CITY_PALETTE.fog, 0.0085);
    this.renderer = createRenderer(container);
    this.cameraPreset = requestedCameraPreset();
    this.camera = createCamera(container, this.cameraPreset);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.fromArray(this.cameraPreset.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.developerMode = new URLSearchParams(window.location.search).get('dev') === '1';
    this.applyCameraMode();
    this.cameraFollowTarget = this.controls.target.clone();

    addLights(this.scene);
    this.materials = null;
    this.player = makePlayer(this.scene);
    if (this.cameraPreset.focus === 'station') this.player.position.set(-7.2, 0.49, 27.2);
    if (this.cameraPreset.focus === 'tunnel') this.player.position.set(-32.4, 0.49, 21.5);
    if (this.cameraPreset.focus === 'reunion') this.player.position.set(20, 0.49, 8);
    if (this.cameraPreset.focus === 'streetfire') this.player.position.set(-48.5, 0.49, 34);
    if (this.cameraPreset.focus === 'southeast') this.player.position.set(43.2, 0.49, 42.2);
    if (this.cameraPreset.focus === 'northeast') this.player.position.set(41.5, 0.49, -24.5);
    this.destinationMarker = makeDestinationMarker(this.scene);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.modelCache = new Map();
    this.campfireLight = null;

    this.onResize = this.onResize.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.animate = this.animate.bind(this);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.loadingCount.textContent = `0 / ${this.expectedUniqueModels}`;
    if (this.developerMode) this.resetCamera();
  }

  async initialize() {
    this.materials = await makeMaterialSet(this.renderer);
    this.buildGround();
  }

  buildGround() {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(OUTER_CITY_GROUND.baseSize[0], 0.5, OUTER_CITY_GROUND.baseSize[1]),
      this.materials.earth,
    );
    base.position.y = -0.42;
    base.receiveShadow = true;
    this.scene.add(base);

    const street = new THREE.Mesh(
      new THREE.BoxGeometry(OUTER_CITY_GROUND.streetSize[0], 0.24, OUTER_CITY_GROUND.streetSize[1]),
      this.materials.street,
    );
    street.position.y = -0.12;
    street.receiveShadow = true;
    this.scene.add(street);

    addNorthBackstagePaving(this.scene, this.materials);
    addPlayableDistrict(this.scene, this.walkMeshes, this.materials);
    addDistrictRoads(this.scene, this.walkMeshes, this.materials);
    addDistrictSidewalks(this.scene, this.walkMeshes, this.materials);
    addNorthFrontageApron(this.scene, this.materials);
    addDistrictCrossings(this.scene, this.walkMeshes, this.materials);
    addCivicPlazaPaving(this.scene, this.walkMeshes, this.materials);
    addHiddenWalkZoneSurfaces(this.scene, this.materials);

    // The legacy waypoint ribbons and broad box courts used to stack several
    // unrelated tile colours over one another. Navigation still uses those
    // authored shapes, but only landmark paving and the station platform are
    // now rendered above the new continuous street grid.
    for (const court of COURTS.filter((item) => (
      item.shape === 'octagon' || item.style === 'platform'
    ))) addCourt(this.scene, this.walkMeshes, this.materials, court);
    addCeremonialPad(this.scene, this.walkMeshes, this.materials, 0, 0, 9.15);
    addCeremonialPad(this.scene, this.walkMeshes, this.materials, 20, 0, 8.1);
    addLandmarkIslands(this.scene, this.materials);
    addRail(this.scene, this.materials);
    addTunnelTerrain(this.scene, this.materials);
    addBoundaryBarriers(this.scene, this.materials);
    addStreetFurniture(this.scene, this.materials);

    // Use one continuous, invisible plane for pointer projection. The visible
    // paving is deliberately layered at several heights, so raycasting those
    // small meshes directly leaves cracks between courts and path ribbons.
    // Walkability is still decided by the authored courts/graph below.
    const navMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
      side: THREE.DoubleSide,
    });
    this.navPlane = new THREE.Mesh(new THREE.PlaneGeometry(140, 130), navMaterial);
    this.navPlane.rotation.x = -Math.PI / 2;
    this.navPlane.position.set(0, 0.64, 15);
    this.navPlane.name = 'pointer-navigation-plane';
    this.scene.add(this.navPlane);
  }

  surfaceHeightAt(x, z) {
    if (!this.walkMeshes.length) return null;
    this.surfaceRayOrigin.set(x, 64, z);
    this.surfaceRaycaster.set(this.surfaceRayOrigin, this.surfaceRayDirection);
    this.surfaceRaycaster.near = 0;
    this.surfaceRaycaster.far = 128;
    const hit = this.surfaceRaycaster.intersectObjects(this.walkMeshes, false)[0];
    return hit && Number.isFinite(hit.point.y) ? hit.point.y : null;
  }

  async loadModels() {
    await MeshoptDecoder.ready;
    const manager = new THREE.LoadingManager();
    const loader = new GLTFLoader(manager);
    loader.setMeshoptDecoder(MeshoptDecoder);
    const uniqueModels = [
      ...CITY_MODELS.filter((spec) => !spec.cloneOf),
      ...PERIMETER_MODEL_SOURCES,
    ];
    let completed = 0;
    const total = uniqueModels.length;

    manager.onProgress = (_url, loaded, itemTotal) => {
      const ratio = itemTotal ? loaded / itemTotal : 0;
      this.loadingFill.style.width = `${Math.round(ratio * 100)}%`;
    };

    const loadOne = async (spec) => {
      try {
        const gltf = await loader.loadAsync(`${MODEL_ROOT}/${spec.file}`);
        const root = gltf.scene;
        root.name = spec.id;
        addShadowFlags(root);
        this.modelCache.set(spec.id, root);
        this.loadedSourceIds.push(spec.id);
        if (spec.category !== 'perimeter-prototype') {
          this.placeModel(root, spec);
          this.loadedModelIds.push(spec.id);
        }
      } catch (error) {
        this.loadErrors.push({ id: spec.id, message: error?.message || String(error) });
        console.error(`Failed to load ${spec.id}`, error);
      } finally {
        completed += 1;
        this.loadingCount.textContent = `${completed} / ${total}`;
        this.loadingLabel.textContent = completed === total ? 'ASSEMBLING LIVE SCENE' : 'STREAMING GLB MODELS';
      }
    };

    await Promise.all(uniqueModels.map(loadOne));
    for (const spec of CITY_MODELS.filter((item) => item.cloneOf)) {
      const source = this.modelCache.get(spec.cloneOf);
      if (!source) continue;
      const clone = source.clone(true);
      clone.name = spec.id;
      this.placeModel(clone, spec);
      this.loadedModelIds.push(spec.id);
    }

    for (const spec of PERIMETER_BUILDINGS) {
      const source = this.modelCache.get(spec.prototype);
      if (!source) {
        this.loadErrors.push({ id: spec.id, message: `Missing perimeter prototype ${spec.prototype}` });
        continue;
      }
      const clone = prepareBoundaryInstance(source.clone(true), spec);
      this.scene.add(clone);
      this.registerOccludingBuilding(clone, spec.id);
      this.boundaryModelIds.push(spec.id);
      const footprint = PERIMETER_FOOTPRINTS[spec.prototype];
      const boundaryScale = boundaryScaleFor(spec);
      this.boundaryObstacles.push({
        type: 'oriented-box',
        center: [spec.position[0], spec.position[2]],
        size: [footprint[0] * boundaryScale[0], footprint[1] * boundaryScale[2]],
        rotationY: spec.rotationY,
        padding: 0.18,
        sourceId: spec.id,
      });
    }

    // The approved v68 layout stores the station canopy's narrow historical
    // footprint. Add the measured ticket/service block as runtime collision so
    // the platform stays open while its solid interior cannot be entered.
    this.boundaryObstacles.push({
      type: 'oriented-box',
      center: STATION_LAYOUT.center,
      size: [5.4, 7.0],
      rotationY: STATION_LAYOUT.modelRotationY,
      padding: 0.18,
      sourceId: 'open-air-station-service-block',
    });

    const ok = this.loadErrors.length === 0;
    this.modelsReady = true;
    const autoWalk = new URLSearchParams(window.location.search).get('autowalk');
    const autoTarget = {
      station: STATION_LAYOUT.approach,
      east: [51, 12],
      south: [0, 55],
    }[autoWalk];
    if (autoTarget) {
      const target = new THREE.Vector3(autoTarget[0], 0.5, autoTarget[1]);
      const nextPath = findPath(this.player.position, target, this.boundaryObstacles);
      if (nextPath.length) {
        this.path = nextPath;
        const resolvedTarget = nextPath[nextPath.length - 1];
        this.destinationMarker.position.set(resolvedTarget.x, 0.52, resolvedTarget.z);
        this.destinationMarker.visible = true;
        this.lastClick = { result: 'auto-path', x: target.x, z: target.z, nodes: nextPath.length };
      } else {
        this.lastClick = { result: 'auto-no-path', x: target.x, z: target.z };
      }
    }
    this.refreshStatus();
    this.loadingFill.style.width = '100%';
    this.loadingCount.textContent = ok ? `${total} / ${total}` : `${completed} / ${total}`;
    this.loadingLabel.textContent = ok ? 'LIVE 3D READY' : 'PARTIAL LOAD';
    setTimeout(() => this.loadingPanel.classList.add('done'), 650);
  }

  placeModel(root, spec) {
    root.position.fromArray(spec.position);
    root.rotation.y = THREE.MathUtils.degToRad(spec.rotationY);
    root.scale.setScalar(spec.scale);
    if (spec.alignToGround) {
      root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(root);
      root.position.y += spec.position[1] - bounds.min.y;
      root.updateMatrixWorld(true);
    }
    root.userData.assetId = spec.id;
    root.userData.assetCategory = spec.category || 'landmark';
    root.userData.interactionRole = spec.role || null;
    addModelSupport(this.scene, this.materials, spec);
    this.scene.add(root);
    if (spec.id === 'street-campfire') {
      this.campfireLight = new THREE.PointLight(0xff6b2d, 17, 10, 2.1);
      this.campfireLight.position.set(root.position.x, root.position.y + 1.15, root.position.z);
      this.scene.add(this.campfireLight);
    }
    if (spec.occludesPlayer) this.registerOccludingBuilding(root, spec.id);
  }

  registerOccludingBuilding(root, id) {
    const materialStates = [];
    root.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const originals = Array.isArray(object.material) ? object.material : [object.material];
      const clones = originals.map((material) => {
        const clone = material.clone();
        materialStates.push({
          material: clone,
          opacity: clone.opacity ?? 1,
          transparent: clone.transparent,
          depthWrite: clone.depthWrite,
        });
        return clone;
      });
      object.material = Array.isArray(object.material) ? clones : clones[0];
    });
    root.updateMatrixWorld(true);
    this.occludingBuildings.push({
      id,
      root,
      bounds: new THREE.Box3().setFromObject(root),
      materialStates,
      opacity: 1,
      targetOpacity: 1,
    });
  }

  setOccludingBuildingForceClear(id, enabled) {
    const entry = this.occludingBuildings.find((candidate) => candidate.id === id);
    if (entry) entry.forceClear = Boolean(enabled);
  }

  resetCamera() {
    if (this.developerMode) {
      this.camera.position.set(72, 112, 82);
      this.camera.zoom = 1.05;
      this.controls.target.set(0, 0, 12);
      this.cameraFollowTarget.copy(this.controls.target);
      this.camera.updateProjectionMatrix();
      this.controls.update();
      return;
    }
    const homeOffset = this.cameraOffsetOverride?.clone()
      ?? new THREE.Vector3().fromArray(CAMERA_HOME.position)
        .sub(new THREE.Vector3().fromArray(CAMERA_HOME.target));
    const target = new THREE.Vector3(this.player.position.x, CAMERA_HOME.target[1], this.player.position.z);
    this.camera.position.copy(target).add(homeOffset);
    this.camera.zoom = CAMERA_HOME.zoom;
    this.controls.target.copy(target);
    this.cameraFollowTarget.copy(target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  onPointerUp(event) {
    if (event.button !== 0) return;
    if (this.gameplayRuntime?.handlePointerUp(event)) return;
    if (this.developerMode) return;
    if (!this.navPlane) return;
    if (!this.modelsReady) {
      this.lastClick = { result: 'models-loading' };
      return;
    }
    this.clickCount += 1;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const [hit] = this.raycaster.intersectObject(this.navPlane, false);
    if (!hit) {
      this.lastClick = { result: 'miss-ray' };
      return;
    }
    if (!isWalkable(hit.point.x, hit.point.z, this.boundaryObstacles)) {
      this.lastClick = {
        result: 'blocked',
        x: Number(hit.point.x.toFixed(2)),
        z: Number(hit.point.z.toFixed(2)),
      };
      return;
    }
    const target = new THREE.Vector3(hit.point.x, 0.5, hit.point.z);
    const nextPath = findPath(this.player.position, target, this.boundaryObstacles);
    if (!nextPath.length) {
      this.lastClick = { result: 'no-path', x: target.x, z: target.z };
      return;
    }
    this.path = nextPath;
    const resolvedTarget = nextPath[nextPath.length - 1];
    this.destinationMarker.position.set(resolvedTarget.x, 0.52, resolvedTarget.z);
    this.destinationMarker.visible = true;
    this.destinationMarker.material.opacity = 0.82;
    this.lastClick = { result: 'path', x: target.x, z: target.z, nodes: nextPath.length };
  }

  onPointerMove(event) {
    this.gameplayRuntime?.handlePointerMove(event);
  }

  onKeyDown(event) {
    if (this.gameplayRuntime?.handleKeyDown(event)) return;
    if (event.key.toLowerCase() === 'r') this.resetCamera();
    // The full-map developer camera is URL-only (`?dev=1`). It must never be
    // opened accidentally by pressing D during a normal playthrough.
    if (event.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) this.container.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  }

  onKeyUp(event) {
    this.gameplayRuntime?.handleKeyUp(event);
  }

  attachGameplayRuntime(runtime) {
    this.gameplayRuntime = runtime;
  }

  projectPointerToGround(event) {
    if (!this.navPlane) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const [hit] = this.raycaster.intersectObject(this.navPlane, false);
    return hit?.point?.clone() || null;
  }

  walkTo(x, z, onArrival = null) {
    if (this.gameplayRuntime?.interactionLocked()) return false;
    const target = new THREE.Vector3(x, 0.5, z);
    const nextPath = findPath(this.player.position, target, this.boundaryObstacles);
    if (!nextPath.length) return false;
    this.path = nextPath;
    this.pathArrival = onArrival;
    const resolvedTarget = nextPath[nextPath.length - 1];
    this.destinationMarker.position.set(resolvedTarget.x, 0.52, resolvedTarget.z);
    this.destinationMarker.visible = true;
    return true;
  }

  stopWalking() {
    this.path = [];
    this.pathArrival = null;
    this.destinationMarker.visible = false;
  }

  setCameraOverrideTarget(target = null) {
    this.cameraOverrideTarget = target;
  }

  setLightingMode(mode) {
    if (mode !== 'clear-afternoon') return false;
    this.scene.background.setHex(0x758b93);
    this.scene.fog.color.setHex(0x6f8188);
    this.scene.fog.density = 0.0056;
    this.renderer.toneMappingExposure = 1.12;
    const hemi = this.scene.getObjectByName('city-hemisphere-light');
    const sun = this.scene.getObjectByName('city-sun-light');
    const fill = this.scene.getObjectByName('city-fill-light');
    if (hemi) {
      hemi.color.setHex(0x9fbfc5);
      hemi.groundColor.setHex(0x342b2a);
      hemi.intensity = 1.22;
    }
    if (sun) {
      sun.color.setHex(0xffc477);
      sun.intensity = 5.3;
    }
    if (fill) {
      fill.color.setHex(0x4e8793);
      fill.intensity = 0.82;
    }
    document.body.classList.add('clear-afternoon');
    return true;
  }

  triggerCameraShake(duration = 0.24, amplitude = 0.18) {
    this.cameraShakeRemaining = duration;
    this.cameraShakeDuration = duration;
    this.cameraShakeAmplitude = amplitude;
  }

  applyCameraMode() {
    const limits = this.developerMode ? DEVELOPER_CAMERA_LIMITS : CAMERA_LIMITS;
    this.controls.enablePan = this.developerMode;
    this.controls.enableZoom = this.developerMode;
    this.controls.screenSpacePanning = true;
    this.controls.minZoom = limits.minZoom;
    this.controls.maxZoom = limits.maxZoom;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(limits.minPolarDeg);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(limits.maxPolarDeg);
    this.controls.minAzimuthAngle = THREE.MathUtils.degToRad(limits.minAzimuthDeg);
    this.controls.maxAzimuthAngle = THREE.MathUtils.degToRad(limits.maxAzimuthDeg);
    this.controls.mouseButtons.LEFT = this.developerMode ? THREE.MOUSE.PAN : null;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    document.body.classList.toggle('developer-camera', this.developerMode);
  }

  // Rooms whose readable opening faces away from the fixed isometric camera
  // (e.g. the hotel lobby) install a replacement offset here. OrbitControls
  // clamps azimuth to CAMERA_LIMITS, which would silently rotate any flipped
  // offset back to the default southeast framing, so the azimuth range is
  // pinned onto the override's own azimuth while it is active.
  setCameraOffsetOverride(offset) {
    this.cameraOffsetOverride = offset ? offset.clone() : null;
    if (this.cameraOffsetOverride && !this.developerMode) {
      const azimuth = Math.atan2(this.cameraOffsetOverride.x, this.cameraOffsetOverride.z);
      this.controls.minAzimuthAngle = azimuth;
      this.controls.maxAzimuthAngle = azimuth;
      return;
    }
    this.applyCameraMode();
  }

  setDeveloperMode(enabled) {
    this.developerMode = Boolean(enabled);
    this.applyCameraMode();
    this.resetCamera();
    this.refreshStatus();
  }

  refreshStatus() {
    if (!this.modelsReady) return;
    if (this.loadErrors.length) {
      this.statusElement.textContent = `REAL-TIME GLB · ${this.loadErrors.length} LOAD ERROR`;
      return;
    }
    this.statusElement.textContent = this.developerMode
      ? `DEVELOPER CAMERA · ${this.expectedUniqueModels} ASSETS LIVE`
      : `REAL-TIME GLB · ${this.expectedUniqueModels} ASSETS LIVE`;
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;
    const halfHeight = 35;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update(dt) {
    this.elapsed += dt;
    this.camera.position.sub(this.cameraShakeOffset);
    this.cameraShakeOffset.set(0, 0, 0);
    this.controls.update();
    if (this.path.length) {
      const target = this.path[0];
      const delta = target.clone().sub(this.player.position);
      delta.y = 0;
      const distance = delta.length();
      const travel = 5.4 * dt;
      if (distance <= travel) {
        this.player.position.x = target.x;
        this.player.position.z = target.z;
        this.path.shift();
      } else {
        delta.normalize();
        this.player.position.addScaledVector(delta, travel);
        this.player.rotation.y = Math.atan2(delta.x, delta.z);
      }
      if (!this.path.length) {
        this.destinationMarker.visible = false;
        const arrival = this.pathArrival;
        this.pathArrival = null;
        arrival?.();
      }
    }

    this.updateCameraFollow(dt);
    if (this.cameraShakeRemaining > 0) {
      this.cameraShakeRemaining = Math.max(0, this.cameraShakeRemaining - dt);
      const normalized = this.cameraShakeDuration > 0
        ? this.cameraShakeRemaining / this.cameraShakeDuration
        : 0;
      const amount = Math.sin(this.elapsed * 92) * this.cameraShakeAmplitude * normalized;
      this.cameraShakeOffset.set(amount, amount * 0.35, -amount * 0.45);
      this.camera.position.add(this.cameraShakeOffset);
    }
    this.updateBuildingOcclusion(dt);
    this.gameplayRuntime?.update(dt);

    if (this.campfireLight) {
      this.campfireLight.intensity = 15.5
        + Math.sin(this.elapsed * 9.3) * 1.5
        + Math.sin(this.elapsed * 17.7) * 0.65;
    }

    if (this.destinationMarker.visible) {
      const pulse = 1 + Math.sin(this.elapsed * 5.5) * 0.12;
      this.destinationMarker.scale.setScalar(pulse);
      this.destinationMarker.material.opacity = 0.55 + Math.sin(this.elapsed * 5.5) * 0.22;
    }
  }

  updateCameraFollow(dt) {
    if (this.developerMode) return;
    const focus = this.controls.target;
    const [deadzoneX, deadzoneZ] = CAMERA_FOLLOW.deadzone;
    const subject = this.cameraOverrideTarget || this.player.position;
    const playerDx = subject.x - focus.x;
    const playerDz = subject.z - focus.z;
    let desiredX = focus.x;
    let desiredZ = focus.z;
    if (Math.abs(playerDx) > deadzoneX) desiredX += playerDx - Math.sign(playerDx) * deadzoneX;
    if (Math.abs(playerDz) > deadzoneZ) desiredZ += playerDz - Math.sign(playerDz) * deadzoneZ;
    // The approved city framing ends at x=43, but the Copper Heron threshold is
    // farther east. Let the follow target reach an actual player in that short
    // street extension so the morning exit does not pull the camera to the plaza.
    const eastThresholdMaxX = subject.x > CAMERA_FOLLOW.bounds.maxX
      ? Math.min(subject.x, 55)
      : CAMERA_FOLLOW.bounds.maxX;
    desiredX = THREE.MathUtils.clamp(desiredX, CAMERA_FOLLOW.bounds.minX, eastThresholdMaxX);
    desiredZ = THREE.MathUtils.clamp(desiredZ, CAMERA_FOLLOW.bounds.minZ, CAMERA_FOLLOW.bounds.maxZ);
    const desiredY = this.cameraOverrideTarget
      ? THREE.MathUtils.clamp(this.cameraOverrideTarget.y, CAMERA_HOME.target[1], 18)
      : CAMERA_HOME.target[1];
    this.cameraFollowTarget.set(desiredX, desiredY, desiredZ);
    const t = 1 - Math.exp(-CAMERA_FOLLOW.smoothingRate * dt);
    const nextFocus = focus.clone().lerp(this.cameraFollowTarget, t);
    const shift = nextFocus.sub(focus);
    if (shift.lengthSq() < 1e-8) return;
    this.controls.target.add(shift);
    this.camera.position.add(shift);
  }

  updateBuildingOcclusion(dt) {
    const playerCenter = this.occlusionHitPoint.set(
      this.player.position.x,
      this.player.position.y + 1.05,
      this.player.position.z,
    );
    this.occlusionDirection.copy(playerCenter).sub(this.camera.position);
    const playerDistance = this.occlusionDirection.length();
    if (playerDistance < 0.001) return;
    this.occlusionDirection.multiplyScalar(1 / playerDistance);
    this.occlusionRay.set(this.camera.position, this.occlusionDirection);
    const blend = 1 - Math.exp(-7.5 * dt);

    for (const entry of this.occludingBuildings) {
      let blocked = false;
      if (!this.developerMode) {
        const hit = this.occlusionRay.intersectBox(entry.bounds, this.occlusionHitPoint);
        blocked = Boolean(hit && this.camera.position.distanceTo(hit) < playerDistance - 0.8);
      }
      // The ministry has a deep projecting facade. At its morning handoff the
      // ordinary 20% ghost still layers too much window and cornice detail over
      // Butch, Lev and Nika, so this one facade clears more decisively.
      const clearsMorningHandoff = entry.id === 'transit-ministry' || entry.id === 'east-tenement-mid';
      entry.targetOpacity = entry.forceClear ? 0.05 : blocked ? (clearsMorningHandoff ? 0.05 : 0.2) : 1;
      entry.opacity = THREE.MathUtils.lerp(entry.opacity, entry.targetOpacity, blend);
      if (Math.abs(entry.opacity - entry.targetOpacity) < 0.002) entry.opacity = entry.targetOpacity;
      entry.root.userData.occlusionOpacity = entry.opacity;
      entry.root.renderOrder = entry.opacity < 0.98 ? 4 : 0;
      for (const state of entry.materialStates) {
        const shouldBlend = entry.opacity < 0.995;
        const nextTransparent = state.transparent || shouldBlend;
        if (state.material.transparent !== nextTransparent) {
          state.material.transparent = nextTransparent;
          state.material.needsUpdate = true;
        }
        state.material.opacity = state.opacity * entry.opacity;
        state.material.depthWrite = shouldBlend ? false : state.depthWrite;
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.statusElement.dataset.player = `${this.player.position.x.toFixed(2)},${this.player.position.z.toFixed(2)}`;
    this.statusElement.dataset.pathNodes = String(this.path.length);
    this.statusElement.dataset.clickCount = String(this.clickCount);
    this.statusElement.dataset.lastClick = JSON.stringify(this.lastClick);
    this.statusElement.dataset.triangles = String(this.renderer.info.render.triangles);
    this.statusElement.dataset.cameraFocus = this.cameraPreset.focus;
    this.statusElement.dataset.developerMode = String(this.developerMode);
  }

  animate(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.update(dt);
    this.render();
    this.fpsFrames += 1;
    this.fpsWindow += dt;
    if (this.fpsWindow >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsWindow);
      this.fpsFrames = 0;
      this.fpsWindow = 0;
    }
    this.frameHandle = requestAnimationFrame(this.animate);
  }

  start() {
    this.lastFrame = performance.now();
    this.frameHandle = requestAnimationFrame(this.animate);
  }

  advanceTime(ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let index = 0; index < steps; index += 1) this.update(1 / 60);
    this.render();
  }

  textState() {
    return JSON.stringify({
      mode: 'echo-city-real-time-3d-preview',
      coordinateSystem: 'Three.js world; +X east/right, +Y up, +Z south/toward tram',
      models: {
        expectedUnique: this.expectedUniqueModels,
        loadedSources: [...this.loadedSourceIds],
        expectedInstances: CITY_MODELS.length,
        loadedInstances: [...this.loadedModelIds],
        errors: [...this.loadErrors],
      },
      narrativeProps: CITY_MODELS
        .filter((spec) => spec.category === 'prop')
        .map((spec) => ({
          id: spec.id,
          label: spec.label,
          role: spec.role,
          position: [spec.position[0], spec.position[1], spec.position[2]],
          collidable: Boolean(spec.collision),
        })),
      perimeter: {
        purpose: 'one camera-audited GLB street wall encloses an expanded readable district',
        prototypes: [...new Set(PERIMETER_BUILDINGS.map((spec) => spec.prototype))],
        sources: PERIMETER_MODEL_SOURCES.map((spec) => ({ id: spec.id, file: spec.file })),
        expectedInstances: PERIMETER_BUILDINGS.length,
        placedInstances: [...this.boundaryModelIds],
      },
      expandedDistrict: {
        walkableAreas: [WALKABLE_DISTRICT.id, ...COURTS.filter((court) => court.style).map((court) => court.id)],
        hiddenNoWalkZones: HIDDEN_WALK_ZONES.map((zone) => ({ id: zone.id, reason: zone.reason })),
        collisionRule: 'continuous visible paving minus measured oriented building/prop/tram footprints',
        railway: { start: RAIL_LAYOUT.start, end: RAIL_LAYOUT.end, convoyCars: 3 },
        station: 'open-air-station',
        tunnel: 'tram-tunnel-portal',
      },
      player: {
        x: Number(this.player.position.x.toFixed(2)),
        y: Number(this.player.position.y.toFixed(2)),
        z: Number(this.player.position.z.toFixed(2)),
        pathNodesRemaining: this.path.length,
      },
      camera: {
        type: 'orthographic',
        focus: this.cameraPreset.focus,
        x: Number(this.camera.position.x.toFixed(2)),
        y: Number(this.camera.position.y.toFixed(2)),
        z: Number(this.camera.position.z.toFixed(2)),
        zoom: Number(this.camera.zoom.toFixed(2)),
        developerMode: this.developerMode,
        followingPlayer: !this.developerMode,
        followTarget: [
          Number(this.controls.target.x.toFixed(2)),
          Number(this.controls.target.z.toFixed(2)),
        ],
      },
      occlusion: {
        mode: 'camera-to-player building fade',
        fadedBuildings: this.occludingBuildings
          .filter((entry) => entry.opacity < 0.95)
          .map((entry) => ({ id: entry.id, opacity: Number(entry.opacity.toFixed(2)) })),
      },
      renderer: {
        fps: this.fps,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
      },
      interaction: this.developerMode
        ? 'developer inspection: left drag pans, right drag orbits, wheel freely zooms; reload without ?dev=1 for production camera'
        : 'left click stone streets to A* walk; camera follows with a deadzone; right drag inspects limited depth',
    });
  }
}
