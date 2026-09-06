import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNTIME_PATH = join(__dirname, '../../src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const REPLACEMENT_ROOT = join(__dirname, '../../public/assets/chapter03-3d/replacements');

globalThis.self = globalThis;

function mockDocument() {
  if (globalThis.document) return;
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowColor: '',
    shadowBlur: 0,
    globalCompositeOperation: '',
    fillRect: () => {},
    strokeRect: () => {},
    clearRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: () => ({ width: 10 }),
    drawImage: () => {},
    beginPath: () => {},
    bezierCurveTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
  globalThis.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 512,
          height: 128,
          getContext: () => context,
          toDataURL: () => '',
        };
      }
      return {};
    },
  };
}

function parseTransform(source, id) {
  const pattern = new RegExp(
    `\\{ id: '${id}', host: [^}]+? position: \\[(?<px>[-0-9.]+), (?<py>[-0-9.]+), (?<pz>[-0-9.]+)\\](?:, rotationY: (?<ry>[-0-9.]+))?(?:, scale: (?<scale>\\[[-0-9., ]+\\]|[-0-9.]+))?`,
  );
  const match = source.match(pattern);
  assert.ok(match, `${id} replacement entry not found`);
  const position = [match.groups.px, match.groups.py, match.groups.pz].map(Number);
  const rotationY = match.groups.ry ? Number(match.groups.ry) : 0;
  let scale = [1, 1, 1];
  if (match.groups.scale) {
    if (match.groups.scale.startsWith('[')) {
      scale = match.groups.scale.slice(1, -1).split(',').map((s) => Number(s.trim()));
      assert.equal(scale.length, 3, `${id} scale array must have three axes`);
    } else {
      const uniform = Number(match.groups.scale);
      scale = [uniform, uniform, uniform];
    }
  }
  return { position, rotationY, scale };
}

function transformMissing(source, id) {
  const pattern = new RegExp(`\\{ id: '${id}',`);
  return !pattern.test(source);
}

async function loadModelBounds(id) {
  const buffer = readFileSync(join(REPLACEMENT_ROOT, `${id}.glb`));
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loader = new GLTFLoader();
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    const gltf = await new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject));
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const min = box.min.clone();
    const max = box.max.clone();
    return { min, max, size };
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
}

function worldBounds(localBounds, transform) {
  const corners = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const local = new THREE.Vector3(
          sx === -1 ? localBounds.min.x : localBounds.max.x,
          sy === -1 ? localBounds.min.y : localBounds.max.y,
          sz === -1 ? localBounds.min.z : localBounds.max.z,
        );
        corners.push(local.multiply(new THREE.Vector3(...transform.scale)).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          transform.rotationY,
        ).add(new THREE.Vector3(...transform.position)));
      }
    }
  }
  const box = new THREE.Box3().setFromPoints(corners);
  const size = new THREE.Vector3();
  box.getSize(size);
  return { min: box.min, max: box.max, size };
}

function aabbFromMesh(mesh) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  return { min: box.min, max: box.max, size };
}

function intersects2D(a, b) {
  return a.max.x > b.min.x && a.min.x < b.max.x && a.max.z > b.min.z && a.min.z < b.max.z;
}

function contains2D(outer, inner, margin = 0.05) {
  return inner.min.x >= outer.min.x - margin
    && inner.max.x <= outer.max.x + margin
    && inner.min.z >= outer.min.z - margin
    && inner.max.z <= outer.max.z + margin;
}

function pointInBox2D(point, box, margin = 0.05) {
  return point.x >= box.min.x - margin && point.x <= box.max.x + margin
    && point.z >= box.min.z - margin && point.z <= box.max.z + margin;
}

describe('Chapter 3 interior replacement placement', () => {
  const runtimeSource = readFileSync(RUNTIME_PATH, 'utf8');

  it('exports greybox meshes from the hotel hall so replacements can hide them', async () => {
    const { createChapter3HotelHall } = await import(
      '../../src/cars/presentCity3d/Chapter3HotelHall.js'
    );
    const scene = new THREE.Scene();
    const hall = createChapter3HotelHall(scene);
    assert.ok(hall.roomFloor, 'roomFloor is exported');
    assert.ok(hall.roomRug, 'roomRug is exported');
    assert.ok(hall.roomWalls && hall.roomWalls.length === 3, 'three room walls are exported');
    assert.ok(hall.corridorFloor, 'corridorFloor is exported');
    assert.ok(hall.corridorRunner, 'corridorRunner is exported');
    assert.ok(hall.corridorWalls && hall.corridorWalls.length === 4, 'four corridor walls are exported');
    assert.ok(hall.backgroundDoors && hall.backgroundDoors.length === 8, 'eight background doors are exported');
  });

  it('reuses the existing Hunyuan furniture kits without procedural duplicates', () => {
    assert.ok(!transformMissing(runtimeSource, 'env-ministry-furniture'), 'ministry furniture kit is attached');
    assert.ok(!transformMissing(runtimeSource, 'env-butch-room-furniture'), 'Butch-room furniture kit is attached');
    const ministryEntry = runtimeSource.match(/\{ id: 'env-ministry-furniture'[^\n]+/)?.[0] ?? '';
    assert.ok(ministryEntry.includes('ministryFurnitureFallback'), 'duplicate ministry furniture is hidden');
    const furnitureEntry = runtimeSource.match(/\{ id: 'env-butch-room-furniture'[^\n]+/)?.[0] ?? '';
    assert.ok(furnitureEntry.includes('roomFurnitureGreybox'), 'duplicate procedural furniture is hidden');
  });

  it('fits Butch’s private room replacement shell to the authored 7.4 x 7.4 m footprint with floor contact', async () => {
    const shell = await loadModelBounds('env-butch-room-shell');
    const shellTransform = parseTransform(runtimeSource, 'env-butch-room-shell');
    const shellWorld = worldBounds(shell, shellTransform);

    assert.equal(shellWorld.min.y.toFixed(2), '0.00', 'room shell sits on the floor');
    assert.ok(shellWorld.size.x <= 7.5 && shellWorld.size.x >= 7.0, `room shell width ${shellWorld.size.x.toFixed(2)} fits 7.4 m room`);
    assert.ok(shellWorld.size.z <= 7.5 && shellWorld.size.z >= 7.0, `room shell depth ${shellWorld.size.z.toFixed(2)} fits 7.4 m room`);
    assert.ok(shellWorld.size.y <= 3.0, `room shell height ${shellWorld.size.y.toFixed(2)} stays below ceiling`);
  });

  it('fits the Butch-room furniture kit inside the shell and keeps evidence papers on its table', async () => {
    const { createChapter3HotelHall, HOTEL_POSITIONS } = await import(
      '../../src/cars/presentCity3d/Chapter3HotelHall.js'
    );
    const scene = new THREE.Scene();
    const hall = createChapter3HotelHall(scene);

    const shellTransform = parseTransform(runtimeSource, 'env-butch-room-shell');
    const shell = await loadModelBounds('env-butch-room-shell');
    const shellWorld = worldBounds(shell, shellTransform);

    const floorBox = {
      min: { x: shellWorld.min.x + 0.05, z: shellWorld.min.z + 0.05 },
      max: { x: shellWorld.max.x - 0.05, z: shellWorld.max.z - 0.05 },
    };

    const table = aabbFromMesh(hall.evidenceTable);
    const furniture = await loadModelBounds('env-butch-room-furniture');
    const furnitureTransform = parseTransform(runtimeSource, 'env-butch-room-furniture');
    const furnitureWorld = worldBounds(furniture, furnitureTransform);
    assert.ok(contains2D(floorBox, furnitureWorld, 0.15), 'Hunyuan furniture stays inside the room footprint');
    assert.ok(furnitureWorld.min.y >= -0.02 && furnitureWorld.min.y <= 0.02, 'Hunyuan furniture sits on the floor');
    assert.ok(furnitureWorld.max.y <= shellWorld.max.y + 0.05, 'Hunyuan furniture stays below the room ceiling');

    const doorZ = HOTEL_POSITIONS.butchRoomDoor[2];
    const clearance = doorZ - furnitureWorld.max.z;
    assert.ok(clearance >= 0.9, `doorway clearance is ${clearance.toFixed(2)} m (need >= 0.9)`);

    for (const paper of hall.evidencePapers) {
      const paperBox = aabbFromMesh(paper);
      assert.ok(contains2D(table, paperBox, 0.02), `paper ${paper.userData.hotelPaperId} stays on the evidence table`);
      assert.ok(contains2D(floorBox, paperBox, 0.1), `paper ${paper.userData.hotelPaperId} stays inside the room`);
    }
  });

  it('keeps the Copper Heron corridor walkable, full-length and at its natural height', async () => {
    const shell = await loadModelBounds('env-hotel-corridor-shell');
    const transform = parseTransform(runtimeSource, 'env-hotel-corridor-shell');
    const world = worldBounds(shell, transform);

    // The model carries a 0.70 m plinth beneath its floorboards; sinking the
    // shell by that exact amount puts the walkable floor surface at y = 0.
    assert.equal(transform.position[1], -0.7, 'corridor shell is sunk by the plinth height');
    assert.equal(world.min.y.toFixed(2), '-0.70', 'corridor plinth sits below the walk floor');
    assert.ok(world.size.z >= 18.0 && world.size.z <= 18.8, `corridor depth ${world.size.z.toFixed(2)} gives the upper floor a longer sightline`);
    assert.ok(world.size.x >= 2.9 && world.size.x <= 3.1, `corridor width ${world.size.x.toFixed(2)} gives the camera and two adults room`);
    assert.ok(world.size.y >= 3.15 && world.size.y <= 3.25, `corridor keeps its natural ${world.size.y.toFixed(2)} m height`);
    assert.equal(transform.scale[1], 1, 'corridor Y axis is not compressed');
  });

  it('mirrors the existing Hunyuan corridor shell to form two modeled side walls', () => {
    assert.match(
      runtimeSource,
      /hotelCorridorMirrorModel = this\.hotelCorridorShellModel\.clone\(true\)/,
      'the opposite wall reuses the loaded Hunyuan shell',
    );
    assert.match(runtimeSource, /hotelCorridorMirrorModel\.scale\.x \*= -1/, 'the reused shell is mirrored across the aisle');
    assert.match(runtimeSource, /hotelCorridorMirrorModel\.position\.y \+= 0\.002/, 'the mirrored floor is offset enough to avoid z-fighting');
  });

  it('fades the camera-side Hunyuan door wall through the existing occlusion system', () => {
    assert.match(
      runtimeSource,
      /registerOccludingBuilding\(this\.hotelCorridorShellModel, 'hotel-corridor-camera-wall'\)/,
      'the +X wall facing the fixed camera is a smooth occluder',
    );
  });

  it('opens traversed hotel doors around fixed side hinges while occupied guest doors stay shut', async () => {
    const { createChapter3HotelHall } = await import('../../src/cars/presentCity3d/Chapter3HotelHall.js');
    const scene = new THREE.Scene();
    const hall = createChapter3HotelHall(scene);

    assert.equal(hall.butchDoorPivot.position.x, -0.775, 'Butch-room hinge is on the left jamb');
    assert.equal(hall.butchDoorLeaf.position.x, 0.775, 'closed Butch-room leaf remains centered in its frame');
    assert.equal(hall.butchDoorPortal.position.z, -0.06, 'dark room portal covers the fused closed shell door when the leaf opens');
    assert.equal(hall.stairDoorPivot.position.x, -0.775, 'stair-door hinge is on the left jamb');
    assert.equal(hall.stairDoorLeaf.position.x, 0.775, 'closed stair leaf remains centered in its frame');
    assert.equal(hall.stairDoorPortal.position.z, 0.06, 'dark stair portal covers the fused closed shell door when the leaf opens');
    assert.match(runtimeSource, /this\.hotelDoorPivot\.rotation\.y = this\.hotelDoorOpenAngle/, 'door animation rotates the hinge pivot');
    assert.match(runtimeSource, /stairDoorPivot, -Math\.PI \* 0\.5/, 'stair door swings out toward the stair landing');
    assert.match(runtimeSource, /speaker: 'VOICE BEHIND DOOR'/, 'occupied guest-room interactions remain knocks, not implausible openings');
  });

  it('hides the old greybox corridor walls and background doors so only the shell walls remain', () => {
    const hideList = runtimeSource.match(/const corridorGreybox = \[[\s\S]*?\];/)?.[0] ?? '';
    assert.ok(hideList.includes('corridorWalls'), 'corridor greybox walls are hidden');
    assert.ok(hideList.includes('backgroundDoors'), 'background doors are hidden');
    assert.ok(hideList.includes('corridorFloor'), 'corridor greybox floor is hidden');
    assert.ok(hideList.includes('corridorRunner'), 'corridor greybox runner is hidden');
  });

  it('places the interactive corridor doors near the replacement shell ends with room for a central aisle', async () => {
    const { createChapter3HotelHall, HOTEL_POSITIONS } = await import(
      '../../src/cars/presentCity3d/Chapter3HotelHall.js'
    );
    const shell = await loadModelBounds('env-hotel-corridor-shell');
    const transform = parseTransform(runtimeSource, 'env-hotel-corridor-shell');
    const world = worldBounds(shell, transform);

    const scene = new THREE.Scene();
    createChapter3HotelHall(scene);

    const aisleWidth = world.size.x - 0.5;
    assert.ok(aisleWidth >= 1.5, `central aisle is about ${aisleWidth.toFixed(2)} m wide`);

    const doorHalfWidth = 0.8;
    assert.ok(
      HOTEL_POSITIONS.butchRoomDoor[2] >= world.min.z + 0.2
        && HOTEL_POSITIONS.butchRoomDoor[2] <= world.max.z - 0.2,
      'Butch-room door is inside the corridor length',
    );
    assert.ok(
      HOTEL_POSITIONS.butchRoomDoor[0] >= world.min.x + doorHalfWidth
        && HOTEL_POSITIONS.butchRoomDoor[0] <= world.max.x - doorHalfWidth,
      'Butch-room door is against a wall, not in the aisle',
    );
    assert.ok(
      HOTEL_POSITIONS.corridorStairExit[2] >= world.min.z + 0.2
        && HOTEL_POSITIONS.corridorStairExit[2] <= world.max.z - 0.2,
      'stair exit door is inside the corridor length',
    );
  });

  it('keeps the ministry queue and benches visible while hiding only the architectural envelope', () => {
    const fallbackSource = runtimeSource.match(/const ministryFallback = [\s\S]*?;\s*const archiveFallback/s)?.[0] ?? '';
    assert.ok(fallbackSource.length > 0, 'ministryFallback source found');

    const keptNames = [
      'queue-rope-left', 'queue-rope-right', 'queue-rope-back',
      'ministry-waiting-bench', 'ministry-waiting-bench-back',
    ];
    for (const name of keptNames) {
      assert.ok(!fallbackSource.includes(`'${name}'`), `${name} is not hidden`);
    }
    assert.ok(!fallbackSource.includes('queue-post'), 'queue posts are not hidden');
  });

  it('reuses existing Hunyuan props for ministry benches, stanchions and dispenser', () => {
    const detailSource = runtimeSource.match(/populateMinistryDetailModels\(\) \{[\s\S]*?\n  \}/s)?.[0] ?? '';
    assert.ok(detailSource.length > 0, 'populateMinistryDetailModels source found');
    assert.ok(detailSource.includes("modelCache.get('fountain-bench')"), 'reuses fountain-bench model');
    assert.ok(detailSource.includes("modelCache.get('queue-stanchion')"), 'reuses queue-stanchion model');
    assert.ok(detailSource.includes("modelCache.get('queue-dispenser')"), 'reuses queue-dispenser model');
  });

  it('hides procedural ministry placeholders after successful detailed model placement', () => {
    const detailSource = runtimeSource.match(/populateMinistryDetailModels\(\) \{[\s\S]*?\n  \}/s)?.[0] ?? '';
    assert.ok(detailSource.includes("'ministry-waiting-bench'"), 'hides procedural bench seats');
    assert.ok(detailSource.includes("'ministry-waiting-bench-back'"), 'hides procedural bench backs');
    assert.ok(detailSource.includes("'queue-rope-left'"), 'hides procedural left queue rope');
    assert.ok(detailSource.includes("'queue-rope-right'"), 'hides procedural right queue rope');
    assert.ok(detailSource.includes("'queue-rope-back'"), 'hides procedural back queue rope');
    assert.ok(detailSource.includes("startsWith('queue-post-')"), 'hides procedural queue posts');
    assert.ok(detailSource.includes('queueDispenser.traverse'), 'hides procedural dispenser geometry');
  });

  it('places three complete Hunyuan railing segments as an open U-shaped queue', async () => {
    mockDocument();
    const [{ Chapter3OpeningRuntime }, { createChapter3MinistryHall }] = await Promise.all([
      import('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js'),
      import('../../src/cars/presentCity3d/Chapter3MinistryHall.js'),
    ]);
    const source = (name, size) => {
      const group = new THREE.Group();
      group.name = name;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        new THREE.MeshStandardMaterial(),
      );
      mesh.position.y = size[1] / 2;
      group.add(mesh);
      return group;
    };
    const scene = new THREE.Scene();
    const hall = createChapter3MinistryHall(scene);
    const runtime = {
      preview: {
        modelCache: new Map([
          ['fountain-bench', source('fountain-bench', [1.04, 0.515, 0.332])],
          ['queue-stanchion', source('queue-stanchion', [0.948, 0.744, 0.282])],
          ['queue-dispenser', source('queue-dispenser', [0.373, 1.144, 0.37])],
        ]),
      },
      ministryHall: hall,
    };

    Chapter3OpeningRuntime.prototype.populateMinistryDetailModels.call(runtime);

    const rails = runtime.ministryDetailModels.stanchions;
    assert.equal(rails.length, 3, 'exactly three complete railing segments are used');
    const sideRails = rails.filter((rail) => Math.abs(rail.rotation.y - Math.PI / 2) < 0.001);
    const backRail = rails.find((rail) => Math.abs(rail.rotation.y) < 0.001);
    assert.deepEqual(
      sideRails.map((rail) => Number(rail.position.x.toFixed(1))).sort((a, b) => a - b),
      [-2.5, 2.5],
      'side rails flank the queue lane',
    );
    assert.ok(sideRails.every((rail) => Math.abs(rail.position.z - 4.25) < 0.001), 'side rails run from z=3.0 to z=5.5');
    assert.ok(backRail, 'back rail exists');
    assert.ok(Math.abs(backRail.position.x) < 0.001 && Math.abs(backRail.position.z - 5.5) < 0.001, 'back rail closes only the far end');

    for (const rail of sideRails) {
      const size = new THREE.Box3().setFromObject(rail).getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.x - 0.45) < 0.02, 'side rail is about 0.45 m thick');
      assert.ok(Math.abs(size.y - 1.2) < 0.02, 'side rail is about 1.2 m tall');
      assert.ok(Math.abs(size.z - 2.5) < 0.02, 'side rail is about 2.5 m long');
    }
    const backSize = new THREE.Box3().setFromObject(backRail).getSize(new THREE.Vector3());
    assert.ok(Math.abs(backSize.x - 5.0) < 0.02, 'back rail spans the 5 m queue width');
    assert.ok(Math.abs(backSize.y - 1.2) < 0.02, 'back rail is about 1.2 m tall');
    assert.ok(Math.abs(backSize.z - 0.45) < 0.02, 'back rail is about 0.45 m thick');
    assert.ok(!rails.some((rail) => Math.abs(rail.position.z - 3.0) < 0.001), 'no transverse rail blocks the entrance');

    for (const name of ['queue-rope-left', 'queue-rope-right', 'queue-rope-back']) {
      assert.equal(hall.group.getObjectByName(name).visible, false, `${name} fallback is hidden`);
    }
  });

  it('constructs a complete readable ministry queue with ropes, posts and benches', async () => {
    mockDocument();
    const { createChapter3MinistryHall } = await import(
      '../../src/cars/presentCity3d/Chapter3MinistryHall.js'
    );
    const scene = new THREE.Scene();
    const hall = createChapter3MinistryHall(scene);

    assert.ok(hall.group.getObjectByName('queue-rope-left'), 'left queue rope exists');
    assert.ok(hall.group.getObjectByName('queue-rope-right'), 'right queue rope exists');
    assert.ok(hall.group.getObjectByName('queue-rope-back'), 'back queue rope exists');

    const posts = hall.group.children.filter((c) => c.isMesh && c.name.startsWith('queue-post-'));
    assert.ok(posts.length >= 4, `found ${posts.length} queue posts (need >= 4)`);

    // U-shaped queue: side rails at x = ±2.5, back rail at z = 5.5.
    const leftRail = hall.group.getObjectByName('queue-rope-left');
    const rightRail = hall.group.getObjectByName('queue-rope-right');
    const backRail = hall.group.getObjectByName('queue-rope-back');
    assert.ok(Math.abs(leftRail.position.x - (-2.5)) < 0.01, 'left rail is at x = -2.5');
    assert.ok(Math.abs(rightRail.position.x - 2.5) < 0.01, 'right rail is at x = 2.5');
    assert.ok(Math.abs(backRail.position.z - 5.5) < 0.01, 'back rail is at z = 5.5');

    const benches = hall.group.children.filter((c) => c.isMesh && c.name === 'ministry-waiting-bench');
    const benchBacks = hall.group.children.filter((c) => c.isMesh && c.name === 'ministry-waiting-bench-back');
    assert.ok(benches.length >= 3, `found ${benches.length} benches (need >= 3)`);
    assert.ok(benchBacks.length >= 3, `found ${benchBacks.length} bench backs (need >= 3)`);

    // Benches line the left wall (x ≈ -5.7), are aligned along X (long side),
    // do not overlap along Z, and stay clear of the entrance zone.
    const benchZs = benches.map((b) => b.position.z).sort((a, b) => a - b);
    assert.deepEqual(benchZs.map((z) => Number(z.toFixed(1))), [3.5, 5.6, 7.7], 'benches are at the expected z positions');
    for (const bench of benches) {
      const box = aabbFromMesh(bench);
      assert.ok(Math.abs(bench.position.x + 5.7) < 0.01, `bench at z=${bench.position.z.toFixed(1)} is at x=-5.7`);
      assert.ok((box.max.x - box.min.x) > (box.max.z - box.min.z), `bench at z=${bench.position.z.toFixed(1)} is aligned along X`);
      assert.ok(box.max.z <= 8.7, `bench at z=${bench.position.z.toFixed(1)} stays outside the entrance zone`);
    }
    for (let i = 0; i < benchZs.length - 1; i += 1) {
      const gap = benchZs[i + 1] - benchZs[i];
      assert.ok(gap >= 1.5, `gap between bench ${i} and ${i + 1} is ${gap.toFixed(2)} m (need >= 1.5)`);
    }
  });

  it('hides the old greybox corridor ceiling light fixtures so no white plates float in the aisle', () => {
    const hideList = runtimeSource.match(/const corridorGreybox = \[[\s\S]*?\];/)?.[0] ?? '';
    assert.ok(hideList.includes('corridorLightFixtures'), 'corridor ceiling fixtures are in the hide list');
  });

  it('hides the old greybox lobby envelope when the Hunyuan lobby shell loads', () => {
    const lobbyShellEntry = runtimeSource.match(/\{ id: 'env-hotel-lobby-shell'[^\n]+/)?.[0] ?? '';
    assert.ok(lobbyShellEntry.includes('this.hotelHall.lobbyLegacyFallbacks'), 'lobby shell hides the legacy greybox envelope');
  });

  it('scales the Hunyuan lobby furniture uniformly and lowers it to the floor', () => {
    const furnitureEntry = runtimeSource.match(/\{ id: 'env-hotel-lobby-furniture'[^\n]+/)?.[0] ?? '';
    const scaleMatch = furnitureEntry.match(/scale: ([0-9.]+)/);
    assert.ok(scaleMatch, 'lobby furniture has a uniform scale');
    assert.equal(Number(scaleMatch[1]), 1.25, 'lobby furniture scale is 1.25');
    const positionMatch = furnitureEntry.match(/position: \[([^\]]+)\]/);
    assert.ok(positionMatch, 'lobby furniture has a position');
    const position = positionMatch[1].split(',').map((s) => Number(s.trim()));
    assert.deepEqual(position, [0, -0.6, -0.15], 'lobby furniture position is [0, -0.6, -0.15]');
  });

  it('lowers the Hunyuan lobby shell so its floor sits at y=0', () => {
    const shellEntry = runtimeSource.match(/\{ id: 'env-hotel-lobby-shell'[^\n]+/)?.[0] ?? '';
    const positionMatch = shellEntry.match(/position: \[([^\]]+)\]/);
    assert.ok(positionMatch, 'lobby shell has a position');
    const position = positionMatch[1].split(',').map((s) => Number(s.trim()));
    assert.deepEqual(position, [0, -0.6, -0.2], 'lobby shell position is [0, -0.6, -0.2]');
  });

  it('keeps every lobby navigation point inside the x ±3.1, z ±3.0 lobby footprint', async () => {
    const { HOTEL_POSITIONS } = await import('../../src/cars/presentCity3d/Chapter3HotelHall.js');
    const lobbyKeys = [
      'playerStart', 'lev', 'hana', 'deskApproach', 'irena', 'irenaApproach',
      'vesna', 'vesnaApproach', 'daro', 'daroApproach', 'corridorEntrance',
      'corridorEntranceApproach', 'lobbyStairArrival', 'lobbyExit', 'lobbyExitApproach',
    ];
    for (const key of lobbyKeys) {
      const [x, , z] = HOTEL_POSITIONS[key];
      assert.ok(Math.abs(x) <= 3.1, `${key} x=${x.toFixed(2)} is inside ±3.1`);
      assert.ok(Math.abs(z) <= 3.0, `${key} z=${z.toFixed(2)} is inside ±3.0`);
    }
  });

  it('keeps the entrance-to-desk-to-stair lobby path at least 1.1 m between key waypoints', async () => {
    const { HOTEL_POSITIONS } = await import('../../src/cars/presentCity3d/Chapter3HotelHall.js');
    const path = ['lobbyExitApproach', 'deskApproach', 'corridorEntranceApproach'];
    for (let i = 0; i < path.length - 1; i += 1) {
      const a = HOTEL_POSITIONS[path[i]];
      const b = HOTEL_POSITIONS[path[i + 1]];
      const dist = Math.hypot(a[0] - b[0], a[2] - b[2]);
      assert.ok(dist >= 1.1, `${path[i]} → ${path[i + 1]} is ${dist.toFixed(2)} m (need ≥ 1.1)`);
    }
  });

  it('keeps the six lobby characters at least 0.9 m apart in XZ', async () => {
    const { HOTEL_POSITIONS } = await import('../../src/cars/presentCity3d/Chapter3HotelHall.js');
    const characters = [
      ['playerStart', HOTEL_POSITIONS.playerStart],
      ['lev', HOTEL_POSITIONS.lev],
      ['hana', HOTEL_POSITIONS.hana],
      ['irena', HOTEL_POSITIONS.irena],
      ['vesna', HOTEL_POSITIONS.vesna],
      ['daro', HOTEL_POSITIONS.daro],
    ];
    for (let i = 0; i < characters.length; i += 1) {
      for (let j = i + 1; j < characters.length; j += 1) {
        const [nameA, posA] = characters[i];
        const [nameB, posB] = characters[j];
        const dist = Math.hypot(posA[0] - posB[0], posA[2] - posB[2]);
        assert.ok(dist >= 0.9, `${nameA} ↔ ${nameB} is ${dist.toFixed(2)} m (need ≥ 0.9)`);
      }
    }
  });

  it('orients lobby doors and keeps fallback stairs inside the lobby footprint', async () => {
    const { createChapter3HotelHall } = await import(
      '../../src/cars/presentCity3d/Chapter3HotelHall.js'
    );
    const scene = new THREE.Scene();
    const hall = createChapter3HotelHall(scene);

    assert.ok(Math.abs(hall.lobbyExit.rotation.y - Math.PI / 2) < 0.001, 'lobby exit faces the -X wall');
    assert.ok(Math.abs(hall.corridorEntrance.rotation.y) < 0.001, 'corridor entrance faces the +Z stairway');

    for (const step of hall.steps) {
      const box = aabbFromMesh(step);
      assert.ok(Math.abs(box.min.x) <= 3.1 && Math.abs(box.max.x) <= 3.1, `${step.name} is inside x ±3.1`);
      assert.ok(Math.abs(box.min.z) <= 3.0 + 0.001 && Math.abs(box.max.z) <= 3.0 + 0.001, `${step.name} is inside z ±3.0`);
    }
  });

  it('exports named corridor ceiling fixtures and keeps their point lights separate', async () => {
    const { createChapter3HotelHall } = await import(
      '../../src/cars/presentCity3d/Chapter3HotelHall.js'
    );
    const scene = new THREE.Scene();
    const hall = createChapter3HotelHall(scene);

    assert.ok(hall.corridorLightFixtures && hall.corridorLightFixtures.length === 4, 'four corridor light fixtures exported');
    for (const fixture of hall.corridorLightFixtures) {
      assert.ok(fixture.name.startsWith('corridor-ceiling-fixture-'), `fixture ${fixture.name} is named`);
      assert.ok(fixture.position.y >= 2.4, `fixture ${fixture.name} is at ceiling height (${fixture.position.y.toFixed(2)})`);
      assert.ok(Math.abs(fixture.position.x) <= 0.1, `fixture ${fixture.name} is centered in the corridor`);
    }
  });

  it('fits the Transit Ministry replacement shell to the authored 18 x 18 m public hall', async () => {
    const shell = await loadModelBounds('env-ministry-shell');
    const shellTransform = parseTransform(runtimeSource, 'env-ministry-shell');
    const shellWorld = worldBounds(shell, shellTransform);

    assert.equal(shellWorld.min.y.toFixed(2), '0.00', 'ministry shell sits on its finished floor');
    assert.ok(shellWorld.size.x >= 17.5 && shellWorld.size.x <= 18.05, `ministry shell width ${shellWorld.size.x.toFixed(2)} fills hall`);
    assert.ok(shellWorld.size.z >= 17.5 && shellWorld.size.z <= 18.05, `ministry shell depth ${shellWorld.size.z.toFixed(2)} fills hall`);
    assert.ok(shellWorld.size.y <= 6.0, `ministry shell height ${shellWorld.size.y.toFixed(2)} stays below ceiling`);
  });

  it('fits the full Hunyuan ministry furniture kit inside the hall with a clear entrance zone', async () => {
    const shell = await loadModelBounds('env-ministry-shell');
    const shellWorld = worldBounds(shell, parseTransform(runtimeSource, 'env-ministry-shell'));
    const furniture = await loadModelBounds('env-ministry-furniture');
    const furnitureWorld = worldBounds(furniture, parseTransform(runtimeSource, 'env-ministry-furniture'));

    assert.ok(contains2D(shellWorld, furnitureWorld, 0.1), 'ministry furniture stays inside the shell footprint');
    assert.ok(furnitureWorld.min.y >= -0.02 && furnitureWorld.min.y <= 0.02, 'ministry furniture sits on the floor');
    assert.ok(furnitureWorld.max.y <= shellWorld.max.y + 0.05, 'ministry furniture stays below the wall height');
    const entranceClearance = shellWorld.max.z - furnitureWorld.max.z;
    assert.ok(entranceClearance >= 6.4, `ministry entrance keeps ${entranceClearance.toFixed(2)} m clear`);
  });

  it('keeps procedural ministry props and NPCs inside the hall, clear of queue rails and the entrance', async () => {
    mockDocument();
    const { createChapter3MinistryHall, MINISTRY_POSITIONS } = await import(
      '../../src/cars/presentCity3d/Chapter3MinistryHall.js'
    );
    const shell = await loadModelBounds('env-ministry-shell');
    const transform = parseTransform(runtimeSource, 'env-ministry-shell');
    const world = worldBounds(shell, transform);

    const scene = new THREE.Scene();
    const hall = createChapter3MinistryHall(scene);

    const floorBox = {
      min: { x: world.min.x + 0.2, z: world.min.z + 0.2 },
      max: { x: world.max.x - 0.2, z: world.max.z - 0.2 },
    };

    const props = [
      hall.queueDispenser,
      hall.sava,
      hall.nika,
      hall.bosko,
      hall.discardedPrint,
    ];
    const propNames = ['queueDispenser', 'sava', 'nika', 'bosko', 'discardedPrint'];
    for (const [index, prop] of props.entries()) {
      const box = aabbFromMesh(prop);
      assert.ok(contains2D(floorBox, box, 0.1), `${propNames[index]} is inside the hall footprint`);
    }

    // Entrance clearance: the southmost 2.5 m of the hall should be free of
    // large furniture so the door and main aisle are readable.
    const entranceZone = { min: { x: world.min.x, z: world.max.z - 2.5 }, max: { x: world.max.x, z: world.max.z } };
    const benches = hall.group.children.filter((c) => c.isMesh && c.name === 'ministry-waiting-bench');
    for (const bench of benches) {
      const box = aabbFromMesh(bench);
      assert.ok(!intersects2D(box, entranceZone), 'waiting benches do not block the entrance zone');
    }

    // NPCs should stand clear of the queue rails (side rails, back rail).
    const leftRail = hall.group.getObjectByName('queue-rope-left');
    const rightRail = hall.group.getObjectByName('queue-rope-right');
    const backRail = hall.group.getObjectByName('queue-rope-back');
    const railBuffers = [
      { x: leftRail.position.x, z: null },
      { x: rightRail.position.x, z: null },
      { x: null, z: backRail.position.z },
    ];
    for (const [name, pos] of [['sava', MINISTRY_POSITIONS.sava], ['nika', MINISTRY_POSITIONS.nika], ['bosko', MINISTRY_POSITIONS.bosko]]) {
      for (const rail of railBuffers) {
        const dx = rail.x === null ? 0 : Math.abs(pos[0] - rail.x);
        const dz = rail.z === null ? 0 : Math.abs(pos[2] - rail.z);
        const dist = Math.hypot(dx, dz);
        assert.ok(dist >= 0.6, `${name} is ${dist.toFixed(2)} m from a queue rail (need >= 0.6)`);
      }
    }

    // Shared-rig bodies are wider than the placeholder capsules. Keep their
    // roots on the public side of the fused counter so neither can embed.
    assert.ok(MINISTRY_POSITIONS.sava[2] >= -4.0 && MINISTRY_POSITIONS.sava[2] <= -3.6,
      'Sava stands clear on the public side of the service counter');
    assert.ok(MINISTRY_POSITIONS.nika[2] >= -4.0 && MINISTRY_POSITIONS.nika[2] <= -3.6,
      'Nika stands clear on the public side of the service counter');

    // Bosko waits in the queue lane, not on top of the dispenser.
    const dispenserBox = aabbFromMesh(hall.queueDispenser);
    const dispenserCenter = new THREE.Vector3(
      (dispenserBox.min.x + dispenserBox.max.x) / 2,
      (dispenserBox.min.y + dispenserBox.max.y) / 2,
      (dispenserBox.min.z + dispenserBox.max.z) / 2,
    );
    const boskoPos = new THREE.Vector3(...MINISTRY_POSITIONS.bosko);
    const distToDispenser = boskoPos.distanceTo(dispenserCenter);
    assert.ok(distToDispenser >= 1.0, `Bosko is ${distToDispenser.toFixed(2)} m from the dispenser (need >= 1.0)`);
  });
});
