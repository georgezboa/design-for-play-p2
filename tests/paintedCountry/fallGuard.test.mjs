import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { FALL_STUCK_SECONDS, createFallGuard, placeBody } from '../../src/chapters/paintedCountry/fallGuard.js';

// Alpha round 1, A3-1 (P0): the Chapter 4 respawn soft-lock. After a fall,
// Butch was put back with setPosition; Arcade's postUpdate then added the
// frame's whole fall on top, so on a slow frame he landed inside the floor,
// sank out of view and respawned again, forever.
//
// These tests run Phaser's real Arcade World, Body and StaticBody in node, with
// the chase's numbers (20 px cells, track at y 440, a 16×58 walker, gravity
// 1400, JUMP -560, fall line at 700), at Phaser's default fixed 60 Hz step.

const require = createRequire(import.meta.url);
const World = require('phaser/src/physics/arcade/World.js');
const Body = require('phaser/src/physics/arcade/Body.js');
const StaticBody = require('phaser/src/physics/arcade/StaticBody.js');

const CELL = 20;
const TRACK_Y = 440;
const FALL_Y = 700;
const W = 16;
const H = 58;
// [from, to) columns of solid ground, with a four-cell gap: the chase's first.
const SPANS = [{ from: 0, to: 26 }, { from: 30, to: 52 }];
const isGroundCol = (c) => SPANS.some(({ from, to }) => c >= from && c < to);

function rectObject(x, y, w, h) {
  return {
    x, y, width: w, height: h, displayWidth: w, displayHeight: h,
    originX: 0.5, originY: 0.5, displayOriginX: w / 2, displayOriginY: h / 2,
    scaleX: 1, scaleY: 1, angle: 0, rotation: 0, parentContainer: null, active: true,
    setPosition(nx, ny) { this.x = nx; this.y = ny; return this; },
    getTopLeft(out) { out.x = this.x - this.width / 2; out.y = this.y - this.height / 2; return out; },
  };
}

function makeLine() {
  const scene = { sys: { scale: { width: 960, height: 600 }, events: { on() {}, once() {} } } };
  const world = new World(scene, { gravity: { y: 1400 }, fps: 60 });
  world.setBounds(0, -300, 3200, 1400);
  const walker = rectObject(460, TRACK_Y - 32, W, H);
  walker.body = new Body(world, walker);
  world.add(walker.body);
  SPANS.forEach(({ from, to }) => {
    const floor = rectObject(((from + to) / 2) * CELL, TRACK_Y + 80, (to - from) * CELL, 160);
    floor.body = new StaticBody(world, floor);
    world.add(floor.body);
    world.addCollider(walker, floor);
  });
  // Scene.update runs between World.update and World.postUpdate, as in Phaser.
  const frame = (deltaMs, sceneUpdate = () => {}) => {
    world.update(0, deltaMs);
    sceneUpdate();
    world.postUpdate();
  };
  return { world, walker, frame };
}

const lineGuard = () => createFallGuard({
  start: { x: 460, y: TRACK_Y - 32 },
  sections: [{ x: 30 * CELL + 2 * CELL, y: TRACK_Y - 32 }],
  bodyWidth: W,
  fallY: FALL_Y,
  isFloorAt: (x) => isGroundCol(Math.floor(x / CELL)),
});

test('control: the old setPosition respawn lands a slow frame\'s fall inside the floor', () => {
  const { walker, frame } = makeLine();
  for (let i = 0; i < 20; i += 1) frame(16.67);
  const lastSafe = { x: walker.x, y: walker.y };
  walker.x = 27 * CELL; // over the gap
  walker.y = 600;
  let respawns = 0;
  // 1 fps frames: ~60 fixed steps each, the old respawn in scene.update.
  const oldRespawn = () => {
    if (walker.y > FALL_Y) {
      walker.setPosition(lastSafe.x, lastSafe.y - 10);
      walker.body.setVelocity(0, 0);
      respawns += 1;
    }
  };
  for (let i = 0; i < 2; i += 1) frame(1000, oldRespawn);
  assert.equal(respawns, 1);
  // The bug: postUpdate added the frame's fall to the respawn point.
  assert.ok(walker.y > TRACK_Y + 20, `expected the walker below the track, y=${walker.y}`);
  // ...and it never stops.
  for (let i = 0; i < 6; i += 1) frame(1000, oldRespawn);
  assert.ok(respawns >= 4, `respawn loop: ${respawns} respawns in 8 frames`);
});

test('A3-1: a respawn after a fall stands on the floor, at a slow frame rate too', () => {
  for (const delta of [16.67, 250, 1000]) {
    const { walker, frame } = makeLine();
    const guard = lineGuard();
    const tick = (ms) => frame(ms, () => {
      const put = guard.step({ x: walker.x, y: walker.y, grounded: walker.body.blocked.down, dt: ms / 1000 });
      if (put) placeBody(walker.body, put.x, put.y - 10);
    });
    for (let i = 0; i < 10; i += 1) tick(16.67);
    // Walk right, off the ledge into the gap, and keep walking.
    for (let i = 0; i < 400 && guard.state.respawns === 0; i += 1) {
      walker.body.setVelocityX(200);
      tick(delta);
    }
    assert.equal(guard.state.respawns, 1, `delta ${delta}: fell and respawned`);
    walker.body.setVelocityX(0);
    for (let i = 0; i < 8; i += 1) tick(delta);
    assert.ok(walker.body.blocked.down, `delta ${delta}: standing after the respawn (y=${walker.y})`);
    assert.ok(Math.abs(walker.y - (TRACK_Y - H / 2)) < 2, `delta ${delta}: on top of the track, y=${walker.y}`);
    assert.equal(guard.state.respawns, 1, `delta ${delta}: no respawn loop`);
    assert.equal(guard.state.rescues, 0);
    // Never put back on the last pixels of the ledge.
    assert.ok(guard.lastSafe.x <= 26 * CELL - W * 1.5, `lastSafe ${guard.lastSafe.x} is a body-width inside the edge`);
  }
});

test('A3-1: lastSafe is only recorded where the whole body and one body-width either side is floor', () => {
  const guard = lineGuard();
  const y = TRACK_Y - 29;
  guard.step({ x: 300, y, grounded: true, dt: 0.016 });
  assert.deepEqual(guard.lastSafe, { x: 300, y });
  // Right at the edge (col 25 ends at x 520): grounded, but not fully supported.
  for (const x of [505, 510, 515, 519]) guard.step({ x, y, grounded: true, dt: 0.016 });
  assert.equal(guard.lastSafe.x, 300);
  guard.step({ x: 520 - 25, y, grounded: true, dt: 0.016 });
  assert.equal(guard.lastSafe.x, 495);
  assert.equal(guard.fullySupported(496, y), false);
  // Mid-air never counts.
  guard.step({ x: 400, y: 300, grounded: false, dt: 0.016 });
  assert.equal(guard.lastSafe.x, 495);
});

test('A3-1: still falling 1.5 s after a respawn goes to the section start', () => {
  assert.equal(FALL_STUCK_SECONDS, 1.5);
  const guard = lineGuard();
  guard.step({ x: 700, y: 400, grounded: true, dt: 0.016 });
  const put = guard.step({ x: 700, y: FALL_Y + 1, grounded: false, dt: 0.016 });
  assert.equal(put.kind, 'respawn');
  let rescue = null;
  let t = 0;
  // Sinking: never grounded, never below the fall line.
  while (!rescue && t < 3) {
    t += 0.1;
    rescue = guard.step({ x: 700, y: 500, grounded: false, dt: 0.1 });
  }
  assert.equal(rescue.kind, 'section');
  assert.ok(t >= 1.5 && t < 1.7, `rescued after ${t.toFixed(2)} s`);
  assert.deepEqual({ x: rescue.x, y: rescue.y }, { x: 640, y: TRACK_Y - 32 });
});

test('A3-1: falling out again before standing goes to the section start, not the same loop', () => {
  const guard = lineGuard();
  guard.step({ x: 300, y: 400, grounded: true, dt: 0.016 });
  assert.equal(guard.step({ x: 540, y: FALL_Y + 5, grounded: false, dt: 0.016 }).kind, 'respawn');
  const again = guard.step({ x: 300, y: FALL_Y + 5, grounded: false, dt: 0.016 });
  assert.equal(again.kind, 'section');
  assert.equal(again.x, 460); // the chapter's own start for the first span
  // Standing again ends the recovery; the next fall is an ordinary respawn.
  guard.step({ x: 460, y: 400, grounded: true, dt: 0.016 });
  assert.equal(guard.recovering, false);
  assert.equal(guard.step({ x: 540, y: FALL_Y + 5, grounded: false, dt: 0.016 }).kind, 'respawn');
});

test('A3-1: every Chapter 4 scene respawns through the guard and body.reset, never setPosition', () => {
  const dir = new URL('../../src/chapters/paintedCountry/', import.meta.url);
  for (const file of ['PaintedLineScene.js', 'PaintedCountryScene.js']) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    assert.match(source, /createFallGuard\(/, file);
    assert.match(source, /placeBody\(body, put\.x, put\.y - 10\)/, file);
    assert.match(source, /this\.stepFall\(dt\)/, file);
    assert.doesNotMatch(source, /setPosition\(this\.lastSafe/, file);
  }
  const yard = readFileSync(new URL('PigmentTrainScene.js', dir), 'utf8');
  assert.doesNotMatch(yard, /this\.walker\.x = /, 'the yard clamps with body bounds, not by writing x');
  const guard = readFileSync(new URL('fallGuard.js', dir), 'utf8');
  assert.match(guard, /body\.reset\(x, y\)/);
});
