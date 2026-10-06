// Alpha round 4 fix round (engineer P2, 2026-10-06): Chapter 3's long walks
// (stride on far clicks, Lev leads the way) and the far-city LOD.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import {
  JOG_GAIT_SPEED, LEAD_KEY, LEAD_MIN_METRES, LEAD_ROUTES, STRIDE_MIN_METRES, STRIDE_MULTIPLIER,
  gaitFor, leadOffer, leadOfferHtml, pacedSpeed, pathMetres, stridesFor,
} from '../../src/cars/presentCity3d/chapter3LongWalks.js';
import {
  CITY_LOD_TIERS, Chapter3CityLod, boxCorners, groundShadowPoints, lodKeep, lodTierFor, ndcBounds, overlapsScreen,
} from '../../src/cars/presentCity3d/chapter3CityLod.js';
import {
  MAX_STEP_SECONDS, RUN_MULTIPLIER, WALK_SPEED, findPath, frameSteps, isWalkable, walkAlongPath,
} from '../../src/cars/presentCity3d/EchoCity3DPreview.js';
import { OPENING_POSITIONS } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');
const css = read('src/cars/presentCity3d/chapter3Release.css');
const controls = read('src/shell/chapterControls.js');

// The four longest walks between beats (start → the destination's approach).
const LONG_WALKS = Object.freeze({
  'find-ministry': [[5.7, 9.6], OPENING_POSITIONS.transportApproach],
  'find-market': [[37.68, -14.35], [-9.9, 0.5, 6.7]],
  'find-hotel': [[5.6, 13.0], [50.3, 0.5, -12.4]],
  'find-fire': [[49.8, -12.2], [8.2, 0.5, 10.6]],
});

// Walk an A* path at `fps` with the game's own frame pacing; seconds taken.
function timedWalk(from, to, { fps = 60, striding = false } = {}) {
  const position = { x: from[0], y: 0.5, z: from[1] };
  const path = findPath(position, { x: to[0], z: to[2] ?? to[1] });
  const metres = pathMetres(position, path);
  let seconds = 0;
  while (path.length && seconds < 120) {
    const { steps, step } = frameSteps(1 / fps);
    for (let index = 0; index < steps && path.length; index += 1) {
      const speed = pacedSpeed({ walkSpeed: WALK_SPEED, runMultiplier: RUN_MULTIPLIER, striding, remaining: pathMetres(position, path) });
      walkAlongPath(position, path, speed * step);
    }
    seconds += 1 / fps;
  }
  return { metres, seconds };
}

describe('Chapter 3 · the long walks', () => {
  it('a far click strides, easing back to a walk; short clicks walk; Shift / double-click still run', () => {
    assert.equal(stridesFor(STRIDE_MIN_METRES - 0.5), false);
    assert.equal(stridesFor(STRIDE_MIN_METRES), true);
    const base = { walkSpeed: WALK_SPEED, runMultiplier: RUN_MULTIPLIER };
    assert.equal(pacedSpeed({ ...base, remaining: 30 }), WALK_SPEED);
    assert.equal(pacedSpeed({ ...base, striding: true, remaining: 30 }), WALK_SPEED * STRIDE_MULTIPLIER);
    assert.equal(pacedSpeed({ ...base, striding: true, remaining: 0.2 }), WALK_SPEED, 'arrives at a walk');
    assert.ok(pacedSpeed({ ...base, striding: true, remaining: 1.5 }) < WALK_SPEED * STRIDE_MULTIPLIER);
    assert.equal(pacedSpeed({ ...base, running: true, striding: true, remaining: 30 }), WALK_SPEED * RUN_MULTIPLIER);
    assert.equal(gaitFor(WALK_SPEED), 'walk');
    assert.equal(gaitFor(WALK_SPEED * STRIDE_MULTIPLIER), 'jog');
    assert.ok(WALK_SPEED < JOG_GAIT_SPEED && WALK_SPEED * STRIDE_MULTIPLIER > JOG_GAIT_SPEED);
  });

  it('measures the four longest walks and keeps each under 25 s, at 60 fps and at 10 fps alike', () => {
    for (const [id, [from, to]] of Object.entries(LONG_WALKS)) {
      const walk = timedWalk(from, to);
      const stride = timedWalk(from, to, { striding: true });
      const slow = timedWalk(from, to, { striding: true, fps: 10 });
      assert.ok(walk.metres > 40, `${id} is a long walk (${walk.metres.toFixed(0)} m)`);
      assert.ok(walk.seconds <= 25, `${id} walks in ${walk.seconds.toFixed(1)} s`);
      assert.ok(stride.seconds < walk.seconds * 0.8, `${id} strides in ${stride.seconds.toFixed(1)} s`);
      // Game time follows the wall clock: 10 fps arrives with 60 fps.
      assert.ok(Math.abs(slow.seconds - stride.seconds) <= 0.1 + 1e-9, `${id}: ${slow.seconds.toFixed(2)} vs ${stride.seconds.toFixed(2)} s`);
    }
    assert.equal(MAX_STEP_SECONDS, 0.1);
  });

  it('Lev leads the way only on a long walk, with Lev there, when Butch is free', () => {
    assert.equal(leadOffer({ phaseId: 'find-ministry', distance: LEAD_MIN_METRES + 1, levPresent: true }), LEAD_ROUTES['find-ministry']);
    assert.equal(leadOffer({ phaseId: 'find-ministry', distance: LEAD_MIN_METRES - 1, levPresent: true }), null, 'close: just walk');
    assert.equal(leadOffer({ phaseId: 'find-ministry', distance: 40, levPresent: false }), null, 'Lev must be with him');
    assert.equal(leadOffer({ phaseId: 'find-ministry', distance: 40, levPresent: true, locked: true }), null);
    assert.equal(leadOffer({ phaseId: 'find-ministry', distance: 40, levPresent: true, travelling: true }), null);
    assert.equal(leadOffer({ phaseId: 'find-station', distance: 40, levPresent: true }), null, 'the dawn walk is short');
    // At night Butch is alone: the firelight leads.
    assert.equal(leadOffer({ phaseId: 'find-fire', distance: 40 }), LEAD_ROUTES['find-fire']);
    assert.equal(leadOfferHtml(LEAD_ROUTES['find-fire']), '<kbd>G</kbd> FOLLOW THE FIRELIGHT');
    assert.equal(leadOfferHtml(LEAD_ROUTES['find-hotel']), '<kbd>G</kbd> LEV LEADS THE WAY');
    assert.equal(LEAD_KEY, 'KeyG');
    for (const route of Object.values(LEAD_ROUTES)) {
      assert.ok(['LEV', 'NARRATION'].includes(route.line.speaker));
      assert.ok(route.line.text.length < 90, 'one short line over the black');
      if (route.butch) assert.equal(isWalkable(route.butch[0], route.butch[2]), true);
    }
    // Arrival spots stand on the street, Eda's within her E reach.
    assert.equal(isWalkable(50.3, -12.4), true);
    assert.equal(isWalkable(OPENING_POSITIONS.transportApproach[0], OPENING_POSITIONS.transportApproach[2]), true);
    assert.ok(Math.hypot(-9.9 - OPENING_POSITIONS.eda[0], 6.7 - OPENING_POSITIONS.eda[2]) < 4.2);
  });

  it('wires the offer, the key, the lock and the arrival into the runtime', () => {
    assert.match(runtime, /if \(event\.code === LEAD_KEY && !event\.repeat && this\.leadTheWay\(\)\)/);
    assert.match(runtime, /\|\| this\.leadTravelling !== null\n/, 'the travel holds the controls');
    assert.match(runtime, /this\.updateLeadOffer\(locked\);/);
    assert.match(runtime, /return wait\(LEAD_LINE_MS\)/, 'the line holds on wall-clock time');
    assert.match(runtime, /if \(this\.morningLevFollowing\) this\.startMorningLevFollow\(\);/, 'Lev follows from the arrival');
    assert.match(runtime, /this\.preview\.striding = false;/, 'rooms never stride');
    assert.match(runtime, /butchMoving \? butchGait : 'idle'/);
    assert.match(preview, /this\.striding = stridesFor\(pathMetres\(this\.player\.position, nextPath\)\);/);
    assert.match(css, /\.c3-lead \{[^}]*pointer-events: auto/);
    assert.match(controls, /\['LONG WALKS', 'G · LEV LEADS THE WAY \(WHEN OFFERED\)'\]/);
  });
});

// A fixed street camera like the game's: orthographic, zoom 4, 16:9.
function streetCamera(target = new THREE.Vector3(0, 0.8, 0)) {
  const half = 35;
  const camera = new THREE.OrthographicCamera(-half * 16 / 9, half * 16 / 9, half, -half, 0.1, 320);
  camera.position.copy(target).add(new THREE.Vector3(50.5, 99.2, 52));
  camera.lookAt(target);
  camera.zoom = 4;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

function building(x, z, { height = 12, name = 'building' } = {}) {
  const root = new THREE.Group();
  root.name = name;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(8, height, 8), new THREE.MeshBasicMaterial());
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  root.add(mesh);
  root.position.set(x, 0, z);
  return { root, mesh };
}

describe('Chapter 3 · far-city LOD', () => {
  it('projects boxes and their ground shadows to the screen', () => {
    const corners = boxCorners([0, 0, 0], [1, 2, 3]);
    assert.equal(corners.length, 8);
    assert.deepEqual(corners[7], [1, 2, 3]);
    const camera = streetCamera();
    const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements;
    const centre = ndcBounds([[0, 0.8, 0]], m);
    assert.ok(Math.abs(centre.minX) < 1e-6 && Math.abs(centre.minY) < 1e-6, 'the target is the screen centre');
    assert.equal(overlapsScreen(ndcBounds([[60, 0, 0]], m)), false);
    // Sun up and to the west: shadows fall east, as long as the sun is low.
    const high = groundShadowPoints([[0, 10, 0]], [-1, 1, 0]);
    assert.ok(Math.abs(high[0][0] - 10) < 1e-9 && high[0][1] === 0);
    const level = groundShadowPoints([[0, 10, 0]], [-1, 0, 0], 0, 120);
    assert.equal(level[0][0], 120, 'a level sun throws the shadow to the reach limit');
    assert.equal(lodTierFor('lowest'), CITY_LOD_TIERS.low);
    assert.ok(CITY_LOD_TIERS.high.showMetres > CITY_LOD_TIERS.low.showMetres, 'HIGH keeps more around the frame');
    // Hysteresis: kept until HIDE metres out, back at SHOW metres.
    const tier = { showMetres: 2, hideMetres: 4 };
    const bounds = { minX: 1.3, maxX: 1.6, minY: 0, maxY: 0.2 };
    assert.equal(lodKeep(false, bounds, tier, [0.1, 0.1]), false);
    assert.equal(lodKeep(true, bounds, tier, [0.1, 0.1]), true);
  });

  it('draws what is near the frame, keeps far shadows that reach it, skips the rest', () => {
    const scene = new THREE.Scene();
    const camera = streetCamera();
    const sun = new THREE.DirectionalLight();
    sun.position.set(-34, 52, 26);
    sun.target.position.set(0, 0, 0);
    const near = building(2, 2, { name: 'near' });
    const far = building(0, -80, { name: 'far' });
    // West of the view, out of frame, but the low sun throws its shadow in.
    const shadowing = building(-30, 6, { height: 30, name: 'shadowing' });
    const already = building(3, -1, { name: 'already-hidden' });
    already.mesh.visible = false;
    for (const entry of [near, far, shadowing, already]) scene.add(entry.root);
    scene.updateMatrixWorld(true);
    const lod = new Chapter3CityLod();
    for (const entry of [near, far, shadowing, already]) lod.register(entry.root);

    lod.update({ camera, light: sun, shadowsOn: true, qualityTier: 'high' });
    assert.equal(near.mesh.visible, true);
    assert.equal(near.mesh.castShadow, true);
    assert.equal(far.mesh.visible, false, 'far off screen: not drawn, not in the shadow pass');
    assert.equal(far.root.visible, true, 'the root is never touched');
    const shadowProjected = ndcBounds(groundShadowPoints(boxCorners([-34, 0, 2], [-26, 30, 10]), sun.position.clone().normalize().toArray()), new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements);
    assert.equal(overlapsScreen(shadowProjected), true, 'the test caster really shadows the frame');
    assert.equal(shadowing.mesh.visible, true, 'drawn into the shadow map');
    assert.equal(shadowing.mesh.castShadow, true);

    // LOW: no shadow maps, so only the frame matters.
    lod.update({ camera, light: sun, shadowsOn: false, qualityTier: 'low' });
    assert.equal(near.mesh.visible, true);

    // Butch walks north: the far building comes into the frame and is drawn.
    camera.position.add(new THREE.Vector3(0, 0, -80));
    camera.updateMatrixWorld();
    lod.update({ camera, light: sun, shadowsOn: true, qualityTier: 'high' });
    assert.equal(far.mesh.visible, true);
    assert.equal(near.mesh.visible, false);
    // A mesh someone else hid stays hidden when its model comes back.
    camera.position.add(new THREE.Vector3(0, 0, 80));
    camera.updateMatrixWorld();
    lod.update({ camera, light: sun, shadowsOn: true, qualityTier: 'high' });
    assert.equal(near.mesh.visible, true);
    assert.equal(already.mesh.visible, false);
    // The developer camera (whole map) keeps everything.
    lod.setEnabled(false);
    assert.equal(far.mesh.visible, true);
    assert.deepEqual(Object.keys(lod.snapshot()).sort(), ['casting', 'drawn', 'enabled', 'hidden', 'managed', 'updates']);
  });

  it('runs every simulation step in the city, for city models, the perimeter and built scenery', () => {
    assert.match(preview, /this\.cityLod = new Chapter3CityLod\(\);/);
    assert.match(preview, /this\.updateShadowLod\(\);/);
    assert.match(preview, /this\.registerShadowCaster\(root, \{ dynamic: MOVING_CITY_MODELS\.has\(spec\.id\) \}\);/);
    assert.match(preview, /this\.registerStaticSceneryForLod\(\);/);
    assert.match(preview, /cityLod: this\.cityLod\.snapshot\(\),/);
    assert.match(preview, /this\.cityLod\.setEnabled\(!this\.developerMode\)/);
  });
});
