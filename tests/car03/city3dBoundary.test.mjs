import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  AUDITED_PARCELS,
  BOUNDARY_BARRIERS,
  BUILDING_HEIGHT_BY_PROTOTYPE,
  CAMERA_HOME,
  CAMERA_FOLLOW,
  CAMERA_LIMITS,
  DEVELOPER_CAMERA_LIMITS,
  CITY_MODELS,
  CIVIC_PLAZA_PAVING,
  COURTS,
  DISTRICT_CROSSINGS,
  DISTRICT_ROADS,
  HIDDEN_WALK_ZONES,
  MAP_LAYOUT_LOCK,
  OUTER_CITY_GROUND,
  PERIMETER_BUILDINGS,
  PERIMETER_FOOTPRINTS,
  PERIMETER_MODEL_DIMENSIONS,
  PERIMETER_MODEL_SOURCES,
  RAIL_LAYOUT,
  STATION_LAYOUT,
  TUNNEL_LAYOUT,
  TUNNEL_TERRAIN,
  WALKABLE_DISTRICT,
  WORLD_EDGES,
  WORLD_NODES,
  boundaryScaleFor,
} from '../../src/cars/presentCity3d/city3dConfig.js';
import { findPath, isWalkable } from '../../src/cars/presentCity3d/EchoCity3DPreview.js';

function distanceToRail([x, z]) {
  const [ax, az] = RAIL_LAYOUT.start;
  const [bx, bz] = RAIL_LAYOUT.end;
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - (ax + vx * t), z - (az + vz * t));
}

function buildingBox(spec, margin = 0.45) {
  const [width, depth] = PERIMETER_FOOTPRINTS[spec.prototype];
  const [scaleX, , scaleZ] = boundaryScaleFor(spec);
  const angle = spec.rotationY * Math.PI / 180;
  return {
    center: [spec.position[0], spec.position[2]],
    axes: [[Math.cos(angle), Math.sin(angle)], [-Math.sin(angle), Math.cos(angle)]],
    half: [width * scaleX / 2 + margin, depth * scaleZ / 2 + margin],
  };
}

function roadBox(road) {
  return {
    center: road.center,
    axes: [[1, 0], [0, 1]],
    half: [road.size[0] / 2, road.size[1] / 2],
  };
}

function sitsInVehicleLane(spec) {
  const [x, , z] = spec.position;
  return DISTRICT_ROADS.some((road) => (
    Math.abs(x - road.center[0]) < road.size[0] / 2
    && Math.abs(z - road.center[1]) < road.size[1] / 2
  ));
}

function boxesOverlap(a, b) {
  const dot = (left, right) => left[0] * right[0] + left[1] * right[1];
  const delta = [b.center[0] - a.center[0], b.center[1] - a.center[1]];
  for (const axis of [...a.axes, ...b.axes]) {
    const distance = Math.abs(dot(delta, axis));
    const radiusA = a.half[0] * Math.abs(dot(a.axes[0], axis)) + a.half[1] * Math.abs(dot(a.axes[1], axis));
    const radiusB = b.half[0] * Math.abs(dot(b.axes[0], axis)) + b.half[1] * Math.abs(dot(b.axes[1], axis));
    if (distance > radiusA + radiusB) return false;
  }
  return true;
}

function frontageGap(left, right) {
  const leftWidth = PERIMETER_FOOTPRINTS[left.prototype][0] * boundaryScaleFor(left)[0];
  const rightWidth = PERIMETER_FOOTPRINTS[right.prototype][0] * boundaryScaleFor(right)[0];
  return right.position[0] - left.position[0] - (leftWidth + rightWidth) / 2;
}

describe('Chapter 3 enclosing city boundary', () => {
  it('preserves the George-approved v68 structural map lock', () => {
    assert.equal(MAP_LAYOUT_LOCK.status, 'approved');
    assert.equal(MAP_LAYOUT_LOCK.version, 'v68');
    const lockedModels = MAP_LAYOUT_LOCK.structuralModelIds.map((id) => {
      const spec = CITY_MODELS.find((candidate) => candidate.id === id);
      assert.ok(spec, `locked structural model ${id} must remain present`);
      return spec;
    });
    const structuralSnapshot = {
      lock: MAP_LAYOUT_LOCK,
      models: lockedModels,
      buildings: PERIMETER_BUILDINGS,
      roads: DISTRICT_ROADS,
      crossings: DISTRICT_CROSSINGS,
      civicPaving: CIVIC_PLAZA_PAVING,
      courts: COURTS,
      hiddenZones: HIDDEN_WALK_ZONES,
      worldNodes: WORLD_NODES,
      worldEdges: WORLD_EDGES,
      barriers: BOUNDARY_BARRIERS,
      railway: RAIL_LAYOUT,
      station: STATION_LAYOUT,
      tunnel: TUNNEL_LAYOUT,
      terrain: TUNNEL_TERRAIN,
      walkableDistrict: WALKABLE_DISTRICT,
      cameraHome: CAMERA_HOME,
      cameraFollow: CAMERA_FOLLOW,
      cameraLimits: CAMERA_LIMITS,
    };
    const signature = createHash('sha256').update(JSON.stringify(structuralSnapshot)).digest('hex');
    assert.equal(signature, '1b414e52dec59f6c04d8ab1468279a0b0527e04e8fe74aaa7ba04aeedb564110');
  });

  it('uses five new Hunyuan buildings plus three legacy prototypes in dense street walls', () => {
    const prototypes = [...new Set(PERIMETER_BUILDINGS.map((spec) => spec.prototype))].sort();
    assert.deepEqual(prototypes, [
      'district-bakery-tenement',
      'district-pharmacy-corner',
      'district-printworks-rowhouse',
      'landmark-civic-night-arcade',
      'landmark-copper-heron-hotel',
      'perimeter-corner-arcade',
      'perimeter-tenement',
      'perimeter-workers-hall',
    ]);
    assert.equal(PERIMETER_BUILDINGS.length, 47);
    const counts = Object.fromEntries(prototypes.map((prototype) => [
      prototype,
      PERIMETER_BUILDINGS.filter((spec) => spec.prototype === prototype).length,
    ]));
    assert.ok(counts['district-bakery-tenement'] >= 12);
    assert.equal(PERIMETER_BUILDINGS.filter((spec) => spec.prototype === 'district-pharmacy-corner').length, 2);
    assert.ok(counts['district-printworks-rowhouse'] >= 8);
    assert.ok(Math.max(...Object.values(counts)) <= 17, 'no repeatable prototype may dominate the whole district');
    assert.equal(PERIMETER_BUILDINGS.filter((spec) => spec.prototype === 'landmark-copper-heron-hotel').length, 1);
    assert.equal(PERIMETER_BUILDINGS.filter((spec) => spec.prototype === 'landmark-civic-night-arcade').length, 1);
  });

  it('uses two deliberate L-shaped infill frontages and keeps every other block on the perimeter', () => {
    const infill = PERIMETER_BUILDINGS.filter((spec) => spec.tier === 'infill');
    assert.deepEqual(infill.map((spec) => spec.id), [
      'market-row-printworks',
      'market-row-bakery',
      'market-west-tenement',
      'market-west-bakery',
      'east-civic-printworks',
      'east-civic-bakery',
      'east-south-printworks',
      'east-south-bakery',
      'east-south-bakery-small',
      'east-south-rear-bakery-west',
      'east-south-rear-tenement',
      'east-south-rear-bakery-east',
    ]);
    assert.ok(infill.every((spec) => spec.position[2] <= 36.3));
    for (const spec of PERIMETER_BUILDINGS.filter((item) => item.tier !== 'infill')) {
      const [x, , z] = spec.position;
      assert.ok(
        Math.abs(x) >= 49 || z <= -32 || z >= 49,
        `${spec.id} must remain in the non-interactive perimeter band`,
      );
    }
  });

  it('spaces every repeated building by its measured oriented footprint', () => {
    const boxes = PERIMETER_BUILDINGS.map((spec) => ({ id: spec.id, box: buildingBox(spec, 0.04) }));
    const overlaps = [];
    for (let index = 0; index < boxes.length; index += 1) {
      for (let other = index + 1; other < boxes.length; other += 1) {
        if (boxesOverlap(boxes[index].box, boxes[other].box)) {
          overlaps.push(`${boxes[index].id} × ${boxes[other].id}`);
        }
      }
    }
    assert.deepEqual(overlaps, []);
  });

  it('keeps the player-facing edge low and reserves height for two readable landmarks', () => {
    const low = PERIMETER_BUILDINGS.filter((spec) => spec.tier === 'low');
    assert.ok(low.length >= 6);
    assert.ok(low.every((spec) => (
      PERIMETER_MODEL_DIMENSIONS[spec.prototype][1] * boundaryScaleFor(spec)[1] <= 13
    )));
    const landmarks = PERIMETER_BUILDINGS.filter((spec) => spec.tier === 'landmark');
    assert.deepEqual(landmarks.map((spec) => spec.id).sort(), ['civic-night-arcade', 'copper-heron-hotel']);
    assert.ok(landmarks.every((spec) => spec.role === 'interactive-landmark'));
  });

  it('uses uniform XYZ scaling so no building stretches its floors, windows, or roof', () => {
    for (const spec of PERIMETER_BUILDINGS) {
      const [scaleX, scaleY, scaleZ] = boundaryScaleFor(spec);
      assert.ok(Math.abs(scaleX - scaleY) < 1e-9, `${spec.id} must keep X/Y proportions`);
      assert.ok(Math.abs(scaleY - scaleZ) < 1e-9, `${spec.id} must keep Y/Z proportions`);
      const height = PERIMETER_MODEL_DIMENSIONS[spec.prototype][1] * boundaryScaleFor(spec)[1];
      const intendedHeight = spec.height ?? BUILDING_HEIGHT_BY_PROTOTYPE[spec.prototype];
      assert.ok(Math.abs(height - intendedHeight) < 1e-9, `${spec.id} must retain its authored height family`);
      assert.ok(height >= 11 && height <= 16.5, `${spec.id} height ${height} must stay in the old-town range`);
    }
  });

  it('sizes every street building from the 1.71m player metric with natural height variation', () => {
    const playerHeight = 1.71;
    for (const spec of PERIMETER_BUILDINGS) {
      const height = PERIMETER_MODEL_DIMENSIONS[spec.prototype][1] * boundaryScaleFor(spec)[1];
      assert.ok(height / playerHeight >= 6.4, `${spec.id} must read as a multi-storey building beside the player`);
      assert.ok(height / playerHeight <= 9.7, `${spec.id} must remain within the shared old-town scale family`);
    }
    assert.ok(BUILDING_HEIGHT_BY_PROTOTYPE['perimeter-workers-hall'] < BUILDING_HEIGHT_BY_PROTOTYPE['perimeter-tenement']);
    assert.ok(BUILDING_HEIGHT_BY_PROTOTYPE['district-printworks-rowhouse'] < BUILDING_HEIGHT_BY_PROTOTYPE['district-bakery-tenement']);
  });

  it('keeps the north and south street walls attached with only construction seams', () => {
    const northIds = new Set(PERIMETER_BUILDINGS.slice(0, 9).map((spec) => spec.id));
    const rows = [
      PERIMETER_BUILDINGS.filter((spec) => northIds.has(spec.id)),
      PERIMETER_BUILDINGS.filter((spec) => spec.id.startsWith('south-')),
    ];
    for (const row of rows) {
      const sorted = row.toSorted((left, right) => left.position[0] - right.position[0]);
      for (let index = 1; index < sorted.length; index += 1) {
        const gap = frontageGap(sorted[index - 1], sorted[index]);
        assert.ok(gap >= 0.09 && gap <= 0.21, `${sorted[index - 1].id} → ${sorted[index].id} gap ${gap} must stay visually closed`);
      }
    }
  });

  it('keeps open-courtyard prototypes out of player-facing foreground rows', () => {
    const pharmacies = PERIMETER_BUILDINGS.filter((spec) => spec.prototype === 'district-pharmacy-corner');
    assert.ok(pharmacies.every((spec) => ['skyline', 'backdrop'].includes(spec.tier)));
    const arcades = PERIMETER_BUILDINGS.filter((spec) => spec.prototype === 'perimeter-corner-arcade');
    assert.ok(arcades.every((spec) => spec.rotationY === 0 && spec.position[2] < -30));
  });

  it('loads eight dedicated building GLBs instead of cloning one repeated house', () => {
    const cityIds = new Set(CITY_MODELS.map((spec) => spec.id));
    assert.ok(cityIds.has('archive'));
    assert.ok(cityIds.has('transit-ministry'));
    assert.equal(PERIMETER_MODEL_SOURCES.length, 8);
    assert.deepEqual(
      PERIMETER_MODEL_SOURCES.map((spec) => spec.id).sort(),
      [
        'district-bakery-tenement',
        'district-pharmacy-corner',
        'district-printworks-rowhouse',
        'landmark-civic-night-arcade',
        'landmark-copper-heron-hotel',
        'perimeter-corner-arcade',
        'perimeter-tenement',
        'perimeter-workers-hall',
      ],
    );
    assert.ok(PERIMETER_MODEL_SOURCES.every((spec) => spec.file.endsWith('.glb')));
    assert.equal(new Set(PERIMETER_BUILDINGS.map((spec) => spec.id)).size, PERIMETER_BUILDINGS.length);
  });

  it('covers every allowed camera view with real world-space ground and one camera-aware street wall', () => {
    assert.ok(OUTER_CITY_GROUND.streetSize[0] >= 150 && OUTER_CITY_GROUND.streetSize[0] <= 160);
    assert.ok(OUTER_CITY_GROUND.streetSize[1] >= 140 && OUTER_CITY_GROUND.streetSize[1] <= 150);
    assert.ok(PERIMETER_BUILDINGS.filter((spec) => spec.position[2] <= -44).length >= 8);
    assert.ok(PERIMETER_BUILDINGS.filter((spec) => spec.position[2] <= -32).length >= 17);
    assert.ok(CAMERA_HOME.zoom >= CAMERA_LIMITS.minZoom);
    assert.ok(CAMERA_LIMITS.minZoom >= 1.25);
    assert.ok(CAMERA_LIMITS.maxPolarDeg - CAMERA_LIMITS.minPolarDeg <= 4);
    assert.ok(CAMERA_LIMITS.maxAzimuthDeg - CAMERA_LIMITS.minAzimuthDeg <= 10);
  });

  it('implements the approved A-I parcel visibility audit', () => {
    assert.deepEqual(AUDITED_PARCELS.map((parcel) => parcel.id), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
    assert.deepEqual(
      Object.fromEntries(AUDITED_PARCELS.map((parcel) => [parcel.id, parcel.treatment])),
      { A: 'full', B: 'full', C: 'low', D: 'low', E: 'open', F: 'low', G: 'open', H: 'low', I: 'low' },
    );
    for (const parcelId of ['A', 'B', 'H', 'I']) {
      assert.ok(PERIMETER_BUILDINGS.some((spec) => spec.auditParcel === parcelId));
    }
    const decorationParcels = CITY_MODELS.filter((spec) => spec.auditParcel).map((spec) => spec.auditParcel).sort();
    assert.deepEqual(decorationParcels, ['C', 'D', 'F']);
    assert.equal(PERIMETER_BUILDINGS.some((spec) => ['E', 'G'].includes(spec.auditParcel)), false);
  });

  it('lays out an old-town street hierarchy with through streets and T-junctions', () => {
    assert.equal(DISTRICT_ROADS.length, 7);
    assert.equal(DISTRICT_ROADS.filter((road) => road.size[0] > road.size[1]).length, 3);
    assert.equal(DISTRICT_ROADS.filter((road) => road.size[1] > road.size[0]).length, 4);
    assert.equal(DISTRICT_ROADS.filter((road) => road.junction === 'T').length, 2);
    assert.ok(DISTRICT_ROADS.every((road) => Math.min(...road.size) >= 4 && Math.min(...road.size) <= 6));
    assert.ok(DISTRICT_ROADS.some((road) => Math.max(...road.size) <= 20));
    assert.ok(DISTRICT_ROADS.every((road) => Math.abs(road.center[0]) <= 45 && road.center[1] >= -25));
  });

  it('bridges visible footway breaks with narrow walkable stone crossings', () => {
    assert.equal(DISTRICT_CROSSINGS.length, 4);
    for (const crossing of DISTRICT_CROSSINGS) {
      assert.ok(crossing.size[0] <= 3.2, `${crossing.id} must read as a crossing rather than a new plaza`);
      const containingRoad = DISTRICT_ROADS.find((road) => (
        crossing.center[0] >= road.center[0] - road.size[0] / 2 &&
        crossing.center[0] <= road.center[0] + road.size[0] / 2 &&
        crossing.center[1] >= road.center[1] - road.size[1] / 2 &&
        crossing.center[1] <= road.center[1] + road.size[1] / 2
      ));
      assert.ok(containingRoad, `${crossing.id} must bridge an authored road`);
      assert.equal(crossing.size[1], containingRoad.size[1]);
    }
  });

  it('repaves the central clock and fountain district as one continuous civic carpet', () => {
    const xs = CIVIC_PLAZA_PAVING.points.map(([x]) => x);
    const zs = CIVIC_PLAZA_PAVING.points.map(([, z]) => z);
    assert.ok(CIVIC_PLAZA_PAVING.points.length >= 8);
    assert.ok(Math.max(...xs) - Math.min(...xs) >= 40);
    assert.ok(Math.max(...zs) - Math.min(...zs) >= 20);
    assert.ok(CIVIC_PLAZA_PAVING.insetScale > 0.98 && CIVIC_PLAZA_PAVING.insetScale < 1);
  });

  it('keeps every repeated building footprint off the authored road surfaces', () => {
    const overlaps = [];
    for (const building of PERIMETER_BUILDINGS) {
      for (const road of DISTRICT_ROADS) {
        if (boxesOverlap(buildingBox(building, 0.15), roadBox(road))) {
          overlaps.push(`${building.id} × ${road.id}`);
        }
      }
    }
    assert.deepEqual(overlaps, []);
  });

  it('keeps freestanding interaction props out of the vehicle lane centres', () => {
    const streetProps = CITY_MODELS.filter((spec) => (
      ['prop', 'district-decoration'].includes(spec.category) && (spec.collision || spec.support)
    ));
    for (const spec of streetProps) {
      const [x, , z] = spec.position;
      const insideRoad = DISTRICT_ROADS.some((road) => (
        Math.abs(x - road.center[0]) < road.size[0] / 2 &&
        Math.abs(z - road.center[1]) < road.size[1] / 2
      ));
      assert.equal(insideRoad, false, `${spec.id} must sit on a sidewalk, court, or platform`);
    }
    assert.equal(CITY_MODELS.find((spec) => spec.id === 'fountain-bench').rotationY, 0);
    assert.equal(CITY_MODELS.find((spec) => spec.id === 'district-bench-f').rotationY, 0);
  });

  it('uses visible boundary treatments without parking derelict vehicles in the street', () => {
    assert.equal(BOUNDARY_BARRIERS.length, 7);
    assert.equal(new Set(BOUNDARY_BARRIERS.map((barrier) => barrier.id)).size, 7);
    for (const barrier of BOUNDARY_BARRIERS) {
      assert.ok(barrier.length >= 6);
      assert.equal(isWalkable(barrier.center[0], barrier.center[1]), false, barrier.id);
    }
    assert.equal(isWalkable(44.8, -28.1), false, 'the northeast fence corner is replaced by a physical wreck');
    assert.equal(isWalkable(42, 43), true, 'the southeast wrecks leave the inner paved junction open');
  });

  it('turns the railway toward the northwest tunnel and aligns all three tram cars end-to-end', () => {
    const convoy = CITY_MODELS.filter((spec) => spec.id.startsWith('municipal-tram-car-'));
    const wrecks = CITY_MODELS.filter((spec) => spec.id.startsWith('derelict-boundary-tram-'));
    const lead = CITY_MODELS.find((spec) => spec.id === 'municipal-tram');
    assert.equal(convoy.length, 2);
    assert.equal(wrecks.length, 2);
    assert.ok(wrecks.every((spec) => spec.position[1] < 0.5), 'both southeast trams rest on the ground');
    assert.ok(wrecks.every((spec) => spec.collision), 'both southeast trams keep collisions aligned to their roadside shells');
    assert.ok(wrecks.every((spec) => !sitsInVehicleLane(spec)), 'southeast wrecks stay on the roadside paving, not in a vehicle lane');
    assert.deepEqual(wrecks.map((spec) => spec.rotationY).sort((a, b) => a - b), [-33, 11], 'southeast trams follow the two user-drawn screen directions');
    assert.ok(wrecks.every((spec) => spec.collision.rotationY === spec.rotationY));
    const cars = [lead, ...convoy];
    assert.ok(cars.every((spec) => spec.rotationY === RAIL_LAYOUT.exitCorridor.headingDeg));
    assert.ok(cars.every((spec) => distanceToRail([spec.position[0], spec.position[2]]) < 0.2));
    const carDistances = cars.map((spec) => Math.hypot(spec.position[0] - RAIL_LAYOUT.end[0], spec.position[2] - RAIL_LAYOUT.end[1]));
    assert.ok(carDistances[0] > carDistances[1] && carDistances[1] > carDistances[2]);
    assert.ok(Math.hypot(RAIL_LAYOUT.end[0] - RAIL_LAYOUT.start[0], RAIL_LAYOUT.end[1] - RAIL_LAYOUT.start[1]) > 38);
    assert.ok(RAIL_LAYOUT.bedWidth >= 8);
    assert.deepEqual(TUNNEL_LAYOUT.center.slice(0, 3).filter((_, index) => index !== 1), [-38.5, 16.8]);
    assert.ok(distanceToRail([TUNNEL_LAYOUT.center[0], TUNNEL_LAYOUT.center[2]]) < 0.5);
    assert.ok(TUNNEL_TERRAIN.width >= 20);
    assert.ok(TUNNEL_TERRAIN.depth >= 16);
    assert.ok(TUNNEL_TERRAIN.throatWidth > RAIL_LAYOUT.gauge);
    assert.ok(TUNNEL_TERRAIN.obstacles.length >= 4);
    assert.ok(TUNNEL_TERRAIN.obstacles.some((obstacle) => obstacle.sourceId === 'tunnel-rear-ridge'));
    assert.ok(TUNNEL_TERRAIN.obstacles.some((obstacle) => obstacle.sourceId === 'tunnel-mouth-stop'));
  });

  it('stages southwest compact wrecks along the two user-drawn crossing directions', () => {
    const westWrecks = ['abandoned-car-southwest', 'abandoned-car-west-mid']
      .map((id) => CITY_MODELS.find((spec) => spec.id === id));
    assert.deepEqual(westWrecks.map((spec) => spec.rotationY), [64, 100]);
    assert.deepEqual(westWrecks.map((spec) => [spec.position[0], spec.position[2]]), [[-56, 31], [-56.6, 35.8]], 'southwest wrecks sit against the outer map edge rather than in the west street');
    assert.ok(Math.abs(westWrecks[0].position[2] - westWrecks[1].position[2]) >= 2);
    assert.ok(Math.abs(westWrecks[0].position[2] - westWrecks[1].position[2]) <= 5);
    assert.notEqual(westWrecks[0].rotationY, westWrecks[1].rotationY);
    assert.ok(westWrecks.every((spec) => spec.collision.rotationY === spec.rotationY));
    const campfire = CITY_MODELS.find((spec) => spec.id === 'street-campfire');
    assert.ok(!sitsInVehicleLane(campfire), 'the campfire belongs on the roadside apron, not in the street');
    assert.ok(Math.hypot(campfire.position[0] - westWrecks[1].position[0], campfire.position[2] - westWrecks[1].position[2]) < 5, 'the campfire stays visually grouped with the southwest wrecks');
    const southeastCar = CITY_MODELS.find((spec) => spec.id === 'abandoned-car-southeast');
    assert.ok(!sitsInVehicleLane(southeastCar), 'the southeast compact car also belongs beside the road, not on it');
    assert.ok(southeastCar.position[0] > 50 && southeastCar.position[2] > 45, 'the southeast compact car closes the outer corner, not the inner junction');
  });

  it('expands only the camera-readable outer streets and keeps occluded bands non-walkable', () => {
    const expanded = COURTS.filter((court) => court.style).map((court) => court.id);
    assert.deepEqual(expanded, [
      'station-apron',
      'south-boulevard',
      'southeast-square',
      'east-boulevard',
      'night-platform',
    ]);
    assert.ok(HIDDEN_WALK_ZONES.some((zone) => zone.id === 'north-behind-skyline'));
    assert.ok(HIDDEN_WALK_ZONES.some((zone) => zone.id === 'west-behind-facades'));
    assert.ok(STATION_LAYOUT.platformSize[1] >= 16);
  });

  it('uses a closer bounded player-follow camera instead of a static full-map overview', () => {
    assert.equal(CAMERA_HOME.zoom, 2.85);
    assert.equal(CAMERA_LIMITS.minZoom, 2.85);
    assert.equal(CAMERA_LIMITS.maxZoom, 2.85, 'production zoom must be locked');
    assert.ok(CAMERA_HOME.position[1] >= 95, 'the camera must be raised to reveal the street network');
    assert.ok(CAMERA_LIMITS.minPolarDeg >= 45);
    assert.ok(CAMERA_LIMITS.maxPolarDeg <= 48);
    assert.ok(CAMERA_FOLLOW.deadzone[0] <= 3.2);
    assert.ok(CAMERA_FOLLOW.smoothingRate >= 4.5);
    assert.ok(CAMERA_FOLLOW.bounds.minX >= -43);
    assert.ok(DEVELOPER_CAMERA_LIMITS.minZoom <= 0.75);
    assert.ok(DEVELOPER_CAMERA_LIMITS.maxZoom >= 5);
    assert.ok(DEVELOPER_CAMERA_LIMITS.maxPolarDeg - DEVELOPER_CAMERA_LIMITS.minPolarDeg >= 50);
  });

  it('routes across every visible paved gap while keeping only far occluded bands closed', () => {
    assert.deepEqual(WALKABLE_DISTRICT.size, [116, 86]);
    assert.equal(isWalkable(STATION_LAYOUT.approach[0], STATION_LAYOUT.approach[1]), true);
    assert.equal(isWalkable(12, 39.5), true);
    assert.equal(isWalkable(48, 8), true);
    assert.equal(isWalkable(-53, -5), false);
    assert.equal(isWalkable(0, 45), true);
    assert.equal(isWalkable(35, 25), true);
    assert.equal(isWalkable(-38, 19), false, 'the visible tunnel throat must block entry through the facade');
    assert.equal(isWalkable(-45, 18), false, 'the visible west rock bank must provide a natural boundary');
    assert.equal(isWalkable(-47, 11), false, 'the rear of the rock ridge must not be enterable from above');
    assert.equal(isWalkable(42, 43), true, 'the southeast street remains walkable up to the outer wreck closure');
    assert.equal(isWalkable(24, 32), true, 'parcel G activity lawn must remain continuously walkable');
    assert.equal(isWalkable(0, -53), false);
    assert.equal(isWalkable(-64, 0), false);
    const stationPath = findPath(
      { x: 0, z: 16.8 },
      { x: STATION_LAYOUT.approach[0], z: STATION_LAYOUT.approach[1] },
    );
    const eastPath = findPath(
      { x: 0, z: 16.8 },
      { x: 51, z: 12 },
    );
    const tunnelApproachPath = findPath(
      { x: 0, z: 16.8 },
      { x: -34.5, z: 21.5 },
    );
    const openLawnPath = findPath(
      { x: 0, z: 16.8 },
      { x: 24, z: 32 },
    );
    assert.ok(stationPath.length > 5);
    assert.ok(eastPath.length > 20);
    assert.ok(tunnelApproachPath.length > 20);
    assert.ok(openLawnPath.length > 15);
  });
});
