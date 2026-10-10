// Round 11 (George's playtest): the figure "walked into the furniture" in
// Chapter 1, and the acts were joined through black. Here: where the painted
// figures may stand on the painted plates (stageClearance.js), every Butch
// walk in Acts 0.5 and 1 against the painted desk and door, the Conductor's
// car, and the joins between the acts (the flights, PanelScene).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTS } from '../../src/chapters/nightService/acts/index.js';
import { ANCHOR } from '../../src/chapters/nightService/art/ch1Plates.js';
import { A05_BUTCH_SCALE, DESK_BLOCK05 } from '../../src/chapters/nightService/art/act05Plates.js';
import {
  A1_BUTCH_SCALE, BUTCH_IN_CAR, BUTCH_STEP_IN, CAR_ACTOR_SCALE, CAR_WALLS, CONDUCTOR_IN_CAR, CONDUCTOR_SCALE, DESK_BLOCK1, DOOR_LEAF_BLOCK,
} from '../../src/chapters/nightService/art/act1Plates.js';
import { figureSpan, frameExtent, obstacleHit, walkFrames, walkViolations } from '../../src/chapters/nightService/stageClearance.js';
import { SPRITE_RIGS } from '../../src/chapters/nightService/spriteAnimator.js';

const TILE_W = 745;

/** Every Butch walk in an act's script, split into its runs on one tile, from where he stood. */
function butchRuns(act) {
  const runs = [];
  const def = act.actors.butch;
  let at = { tile: def.tile, x: def.x, y: def.y };
  act.steps.forEach((step) => {
    (step.do ?? []).forEach((e) => {
      if (e.placeActor?.actor === 'butch' && e.placeActor.x !== undefined) {
        at = { tile: e.placeActor.tile ?? at?.tile ?? act.actors.butch.tile, x: e.placeActor.x, y: e.placeActor.y ?? at?.y ?? act.actors.butch.y, state: e.placeActor.state };
      }
      const walk = e.walkButch;
      if (!walk) return;
      let run = { id: walk.id, tile: at?.tile, start: at, path: [] };
      walk.path.forEach((p) => {
        if (p.tile !== run.tile) {
          if (run.path.length) runs.push(run);
          run = { id: walk.id, tile: p.tile, start: p, path: [] };
        } else run.path.push(p);
      });
      if (run.path.length) runs.push(run);
      const last = walk.path.at(-1);
      at = { tile: last.tile, x: last.x, y: last.y };
    });
  });
  return runs;
}

test('round 11: a figure\'s width is its painted frames\' (pivot to padded edge), facing the way it walks', () => {
  const stand = frameExtent('butch', 'stand');
  assert.ok(Math.abs(stand.height - 70) < 1, 'Butch is 70 tile px at scale 1');
  assert.ok(stand.back > 8 && stand.front > 8 && stand.back + stand.front < 25);
  assert.ok(walkFrames('butch').length >= 8);
  const right = figureSpan({ kind: 'butch', frames: ['walk-5'], x: 0.5, facing: 1, scale: 2, tileW: TILE_W });
  const left = figureSpan({ kind: 'butch', frames: ['walk-5'], x: 0.5, facing: -1, scale: 2, tileW: TILE_W });
  assert.ok(Math.abs((right[0] + right[1]) / 2 - 0.5 - (0.5 - (left[0] + left[1]) / 2)) < 1e-9, 'mirrored');
  // a block: in front of its foot he may overlap it; deeper, never
  const desk = { x0: 0, x1: 0.5, front: 0.9 };
  assert.equal(obstacleHit(desk, [0.4, 0.6], 0.95), null);
  assert.match(obstacleHit(desk, [0.4, 0.6], 0.85), /block/);
  assert.equal(obstacleHit(desk, [0.51, 0.6], 0.85), null);
  // walls: between their lines, nearer than where they start he is in front of them
  const walls = { left: [[0.4, 0.9], [0.45, 0.6]], right: [[0.7, 0.9], [0.65, 0.6]] };
  assert.equal(obstacleHit(walls, [0.43, 0.66], 0.75), null);
  assert.match(obstacleHit(walls, [0.41, 0.6], 0.75), /left wall/);
  assert.match(obstacleHit(walls, [0.5, 0.7], 0.75), /right wall/);
  assert.equal(obstacleHit(walls, [0.3, 0.8], 0.95), null);
  // a walk is sampled along its waypoints
  const v = walkViolations({ kind: 'butch', start: { x: 0.3, y: 0.95 }, path: [{ x: 0.6, y: 0.8 }], obstacles: [desk], scale: 2, tileW: TILE_W });
  assert.ok(v.length > 0 && v.every((hit) => hit.y < 0.9));
});

test('round 11: Butch walks round his desk, never through it (Acts 0.5 and 1)', () => {
  const cases = [
    ['act05', DESK_BLOCK05, ANCHOR['act05/desk'], A05_BUTCH_SCALE],
    ['act1', DESK_BLOCK1, ANCHOR['act1/desk'], A1_BUTCH_SCALE],
  ];
  for (const [id, block, desk, scale] of cases) {
    assert.deepEqual([block.x1, block.front], [desk.deskRight, desk.deskFront]);
    // the painted desk ends right of its top's corner and its front foot is below the walk line
    assert.ok(desk.deskRight > desk.deskEnd && desk.deskFront > desk.floorRight);
    const runs = butchRuns(ACTS[id]).filter((run) => run.tile === 'desk');
    assert.ok(runs.length >= (id === 'act05' ? 2 : 1), `${id}: the desk walks are found`);
    for (const run of runs) {
      const hits = walkViolations({ kind: 'butch', start: run.start, path: run.path, obstacles: [block], scale, tileW: TILE_W });
      assert.deepEqual(hits.slice(0, 3), [], `${id} ${run.id}: through the painted desk`);
      // standing still, too (the stand frame where he gets up or stops)
      [run.start, run.path.at(-1)].forEach((p) => {
        const span = figureSpan({ kind: 'butch', frames: ['stand'], x: p.x, facing: 1, scale, tileW: TILE_W });
        assert.equal(obstacleHit(block, span, p.y), null, `${id} ${run.id}: standing in the desk at ${p.x}, ${p.y}`);
      });
    }
  }
  // (the old Act 1 path, from beside the chair straight to the walk line, went through the pedestal)
  const old = walkViolations({ kind: 'butch', start: { x: 0.3078, y: 0.9562 }, path: [{ x: 0.5629, y: 0.8538 }], obstacles: [DESK_BLOCK1], scale: A1_BUTCH_SCALE, tileW: TILE_W });
  assert.ok(old.length > 10, 'the old path is caught');
});

test('round 11: through the open door he stops short of the leaf; on the door tiles he walks clear', () => {
  const runs = butchRuns(ACTS.act1).filter((run) => run.tile === 'door' && run.id !== 'meetConductor');
  const through = runs.find((run) => run.id === 'throughDoor');
  assert.ok(through, 'the walk through the door');
  assert.equal(through.start.x, 0.62, 'from where he waited at the door');
  for (const run of runs) {
    assert.deepEqual(walkViolations({ kind: 'butch', start: run.start, path: run.path, obstacles: [DOOR_LEAF_BLOCK], scale: A1_BUTCH_SCALE, tileW: TILE_W }), [], run.id);
  }
  // in front of the wall's plane (the painted floor line), not inside the doorway's jambs
  assert.ok(through.path.at(-1).y > ANCHOR['act1/door-locked'].floorLeft);
});

test('round 11: in the Conductor\'s car both figures stand clear of the corridor\'s walls and the doorway\'s jambs', () => {
  const walls = { left: CAR_WALLS.left, right: CAR_WALLS.right };
  const [dx, dy, dw, dh] = CAR_WALLS.doorway;
  const door = { x0: dx, x1: dx + dw, row: dy + dh };
  const conductorScale = CONDUCTOR_SCALE * CAR_ACTOR_SCALE;
  const butchScale = A1_BUTCH_SCALE * CAR_ACTOR_SCALE;
  // every frame the Conductor shows there: waiting (lantern lowered), the offer, the punch given
  assert.equal(ACTS.act1.actors.conductor.pose, 'lowered');
  assert.equal(SPRITE_RIGS.conductor.poses.lowered, 'stand');
  for (const frame of ['stand', 'offer', 'offer-empty', 'stand-empty']) {
    const span = figureSpan({ kind: 'conductor', frames: [frame], x: CONDUCTOR_IN_CAR.x, facing: -1, scale: conductorScale, tileW: TILE_W });
    assert.equal(obstacleHit(walls, span, CONDUCTOR_IN_CAR.y), null, `the Conductor (${frame})`);
    assert.equal(obstacleHit(door, span, CONDUCTOR_IN_CAR.y), null, `the Conductor (${frame}) between the jambs`);
  }
  // Butch: his step in, and where he stands (receiving the punch, too)
  assert.deepEqual(walkViolations({ kind: 'butch', start: BUTCH_STEP_IN, path: [BUTCH_IN_CAR], obstacles: [walls, door], scale: butchScale, tileW: TILE_W }), []);
  for (const frame of ['stand', 'receive']) {
    const span = figureSpan({ kind: 'butch', frames: [frame], x: BUTCH_IN_CAR.x, facing: 1, scale: butchScale, tileW: TILE_W });
    assert.equal(obstacleHit(walls, span, BUTCH_IN_CAR.y), null, `Butch (${frame})`);
    assert.equal(obstacleHit(door, span, BUTCH_IN_CAR.y), null, `Butch (${frame})`);
  }
  // the round-8 staging stood Butch in the left wall
  const old = figureSpan({ kind: 'butch', frames: ['stand'], x: 0.4961, facing: 1, scale: 3.79 * 0.759, tileW: TILE_W });
  assert.match(obstacleHit(walls, old, 0.6586) ?? '', /left wall/);
  // the nearer figure is drawn in front
  assert.equal(ACTS.act1.tiles.door.states.conductor.depthSort, true);
  assert.ok(BUTCH_IN_CAR.y > CONDUCTOR_IN_CAR.y);
});

// ---------------------------------------------------------------------------
// the joins between the acts

import { ACT_ORDER } from '../../src/chapters/nightService/acts/index.js';
import {
  FLIGHT_DIM, FLIGHT_MAX_ZOOM, actJoins, clampFocus, flightFrame, flightPlacement, matchFocus, pullFocus, rectFocus,
} from '../../src/chapters/nightService/flight.js';
import { readFileSync } from 'node:fs';

test('round 11: no act join in Chapter 1 goes through black (only the chapter\'s end, into the 1-2 film)', () => {
  const joins = actJoins(ACTS, ACT_ORDER);
  assert.deepEqual(joins.map((j) => `${j.from}>${j.to}:${j.kind}`), [
    'act0>act05:grow', 'act05>act1:grow', 'act1>act2:flight', 'act2>act3:flight', 'act3>chapter-end:black',
  ]);
  // each flight names a window its act has, and the next act answers it from a window it has
  for (const { from, to, kind } of joins.filter((j) => j.kind === 'flight')) {
    const last = ACTS[from].steps.at(-1).do;
    const fx = last.find((e) => e.fx?.name === 'flight').fx;
    assert.ok(ACTS[from].tiles[fx.tile], `${from}: flight from ${fx.tile}`);
    assert.ok(fx.ms > 0, 'it holds the script (so the checkpoint and the act change come after it)');
    const enter = ACTS[to].enter[from];
    assert.ok(ACTS[to].tiles[enter.tile], `${to}: enters on ${enter.tile}`);
    assert.ok(enter.actor ? ACTS[to].actors[enter.actor] : enter.rect, `${to}: matched to a figure or a box`);
    // the checkpoint is still saved before the act changes
    const order = last.map((e) => Object.keys(e)[0]);
    assert.ok(order.indexOf('fx') < order.indexOf('checkpoint') && order.indexOf('checkpoint') < order.indexOf('nextAct'));
    void kind;
  }
  // I -> II: Butch in the corridor becomes Butch in the aisle
  assert.equal(ACTS.act2.enter.act1.actor, 'butch');
  assert.equal(ACTS.act1.steps.at(-1).do.find((e) => e.fx?.name === 'flight').fx.actor, 'butch');
});

test('round 11: a flight starts with its figure where the last one stood, inside the painting', () => {
  // a figure of 200 px at zoom 1 must stand 300 px tall at (900, 800), in a window centred on (1350, 723)
  const f = matchFocus({ feet: { x: 0.45, y: 0.87 }, tall: 200, anchor: { x: 1300, y: 900, h: 300 }, centre: { x: 1350, y: 723 }, k: 1, tileW: 745, tileH: 414 });
  assert.ok(Math.abs(f.zoom - 1.5) < 1e-9);
  // the feet land on the anchor: screen = centre + (feet - c) * zoom * k
  assert.ok(Math.abs(1350 + (0.45 * 745 - f.cx) * f.zoom - 1300) < 1e-6);
  assert.ok(Math.abs(723 + (0.87 * 414 - f.cy) * f.zoom - 900) < 1e-6);
  // never zoomed out past the painting, never deeper than its paint allows, edges never showing
  assert.equal(matchFocus({ feet: { x: 0.5, y: 0.5 }, tall: 400, anchor: { x: 0, y: 0, h: 100 }, centre: { x: 0, y: 0 }, k: 1, tileW: 745, tileH: 414 }).zoom, 1);
  assert.equal(clampFocus({ cx: 0, cy: 0, zoom: 9 }, 745, 414).zoom, FLIGHT_MAX_ZOOM);
  const edge = clampFocus({ cx: 0, cy: 999, zoom: 2 }, 745, 414);
  assert.deepEqual([edge.cx, edge.cy], [745 / 4, 414 - 414 / 4]);
  const box = rectFocus([0.3, 0.2, 0.5, 0.5], 745, 414);
  assert.equal(box.zoom, 2);
  // a narrower window (Act 3) keeps its shape inside the last act's
  const place = flightPlacement({ x: 197, y: 516, w: 745, h: 414 }, { x: 692, y: 66, w: 536, h: 414 }, 536, 414, 1);
  assert.equal(place.scale, 1);
  assert.deepEqual(place.centre, { x: 197 + 745 / 2, y: 516 + 207 });
  assert.equal(place.x + 536 / 2, place.centre.x);
  assert.deepEqual(flightPlacement(null, { x: 5, y: 6, w: 10, h: 20 }, 10, 20).centre, { x: 10, y: 16 });
});

test('round 11: the flight dissolves while the camera is still, then pulls back and lands; Reduce Motion crossfades', () => {
  const at = (t, o) => flightFrame(t, o);
  assert.equal(at(0).picture, 1, 'it opens on the last act\'s frame');
  assert.equal(at(0).pull, 0);
  assert.ok(at(0.3).picture < 0.2 && at(0.3).glide < 0.05, 'mostly dissolved before the window moves');
  assert.equal(at(1).picture, 0);
  assert.equal(at(1).pull, 1);
  assert.equal(at(1).glide, 1);
  [0, 1, 2, 3, 4].forEach((i) => { assert.equal(at(0, { count: 5 }).cover(i), FLIGHT_DIM); assert.equal(at(1, { count: 5 }).cover(i), 0); });
  assert.ok(FLIGHT_DIM < 0.9, 'dimmed, never black');
  // monotone: nothing flickers back
  for (let t = 0.02; t <= 1; t += 0.02) {
    const a = at(t - 0.02);
    const b = at(t);
    assert.ok(b.picture <= a.picture + 1e-9 && b.pull >= a.pull - 1e-9 && b.glide >= a.glide - 1e-9 && b.cover(2) <= a.cover(2) + 1e-9);
  }
  const r = at(0.5, { reduce: true });
  assert.equal(r.pull, 1, 'no camera move');
  assert.equal(r.glide, 1, 'no glide');
  assert.ok(r.picture > 0 && r.picture < 1);
  assert.equal(at(1, { reduce: true }).cover(0), 0);
  // the pull back: zoom in log space, ends on the window's own view
  const p = pullFocus({ cx: 100, cy: 50, zoom: 2 }, 1, 745, 414);
  assert.deepEqual(p, { cx: 372.5, cy: 207, zoom: 1 });
  assert.ok(Math.abs(pullFocus({ cx: 100, cy: 50, zoom: 4 }, 0.5, 745, 414).zoom - 2) < 1e-9);
});

test('round 11: PanelScene hands the last frame over, shows it while loading, and flies only from the act before', () => {
  const scene = readFileSync(new URL('../../src/chapters/nightService/PanelScene.js', import.meta.url), 'utf8');
  // the frame is copied right after a render, and the act changes even if no frame comes
  assert.match(scene, /this\.game\.events\.once\(Phaser\.Core\.Events\.POST_RENDER, grab\)/);
  assert.match(scene, /this\.textures\.addCanvas\(HANDOFF_KEY, copy\)/);
  assert.match(scene, /setTimeout\?\.\(\(\) => \{ this\.game\.events\.off\(Phaser\.Core\.Events\.POST_RENDER, grab\); finish\(null\); \}, 1200\)/);
  // (the pause menu: the act changes once it closes)
  assert.match(scene, /if \(this\.sys\.isPaused\(\)\) \{ this\.events\.once\('resume', \(\) => go\(key\)\); return; \}/);
  // shown while the next act loads, then dissolved (fold) or flown out of (flight)
  assert.match(scene, /this\.handoffImage = this\.add\.image\(0, 0, this\.handoff\.key\)/);
  assert.match(scene, /this\.fadeHandoff\(handoff, reducedMotionActive\(\) \? 260 : 650\)/);
  // a dev ?step= jump, a Continue (no fromAct) or ?act=2 opens with the title card as before
  assert.match(scene, /const enter = this\.fromAct && !this\.startStep \? this\.act\.enter\?\.\[this\.fromAct\] : null;/);
  // input waits until it lands; the intro fail-safe lands it; the lens waits off the glass meanwhile
  const fly = scene.slice(scene.indexOf('  flightIn(enter, handoff) {'), scene.indexOf('  // ---------------------------------------------------------------------------\n  // zoom'));
  assert.match(fly, /this\.growing = true;/);
  assert.match(fly, /this\.growing = false;/);
  assert.match(fly, /this\.armIntroFailsafe\(/);
  assert.match(scene, /settleIntro\(reason = 'frame'\) \{\s*this\.introSettled = reason;\s*if \(this\.flight\) this\.landFlight\(\);/);
  assert.match(scene, /const want = this\.flight \|\| this\.flightOutState \? 0 :/);
  assert.match(fly, /const ms = reduce \? FLIGHT_REDUCED_MS : enter\.ms \?\? 2400;/);
  // the next act's paintings come in during the last step, and the act waits for them
  assert.match(scene, /m\.on\('step', \(\{ id \}\) => \{ this\.flail\.progress\(\); this\.prefetchFor\(id\); \}\);/);
  assert.match(scene, /this\.load\.once\(Phaser\.Loader\.Events\.COMPLETE, once\)/);
});
