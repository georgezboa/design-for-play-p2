import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import { SCANNER_FIELDS } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import {
  FLAG_MS,
  PIPS_REQUIRED,
  WARNING_MS,
  createWalkBeside,
  fieldContains,
  inScanVolume,
  worldFromLocal,
} from '../../src/cars/presentCity3d/chapter3WalkBesideModel.js';
import { isWalkable } from '../../src/cars/presentCity3d/EchoCity3DPreview.js';

const runtime = fs.readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');

function besideWalker(walk) {
  const walker = walk.walkerPosition();
  return { x: walker.x + walk.geometry.n.x * 1.0, z: walker.z + walk.geometry.n.z * 1.0 };
}

function run(walk, seconds, input, player) {
  const events = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    const at = typeof player === 'function' ? player() : player;
    events.push(...walk.update(1 / 60, { player: at, input }));
  }
  return events;
}

describe('Chapter 3 walk beside (scanner crossings)', () => {
  for (const [id, field] of Object.entries(SCANNER_FIELDS)) {
    it(`${id}: the crossing, its safe line and the walker's side lane are walkable`, () => {
      const walk = createWalkBeside(field);
      for (let along = 0; along <= walk.geometry.length; along += 0.5) {
        for (const lateral of [0, field.side * field.sideOffset]) {
          const point = worldFromLocal(walk.geometry, along, lateral);
          assert.ok(isWalkable(point.x, point.z), `${id} blocked at along ${along}, lateral ${lateral}`);
        }
      }
    });
  }

  it('only lights a walker when Butch stands beside them', () => {
    const walk = createWalkBeside(SCANNER_FIELDS.market);
    const far = worldFromLocal(walk.geometry, -1.5, 3.2);
    assert.equal(walk.eligible(far), false);
    assert.deepEqual(walk.toggleMatch(far), []);
    assert.equal(walk.eligible(besideWalker(walk)), true);
    assert.deepEqual(walk.toggleMatch(besideWalker(walk)), ['matched']);
    assert.equal(walk.snapshot().matched, true);
    assert.equal(walk.eligible(besideWalker(walk)), false, 'no second prompt while matched');
  });

  it('fills three pips while Butch keeps pace, and pauses when he stops', () => {
    const walk = createWalkBeside(SCANNER_FIELDS.market);
    walk.toggleMatch(besideWalker(walk));
    const forward = walk.geometry.u;
    run(walk, 0.4, { x: 0, z: 0 }, () => walk.besidePosition());
    assert.equal(walk.snapshot().walker.along, 0, 'the walker waits without input');
    const events = run(walk, 0.65, forward, () => walk.besidePosition());
    assert.ok(events.includes('pip'));
    assert.equal(walk.snapshot().pips, 1);
    const held = walk.snapshot().walker.along;
    run(walk, 1, { x: 0, z: 0 }, () => walk.besidePosition());
    assert.equal(walk.snapshot().walker.along, held, 'stopping pauses the pair');
    assert.equal(walk.snapshot().pips, 1, 'stopping keeps the pips');
    run(walk, 1.3, forward, () => walk.besidePosition());
    assert.equal(walk.snapshot().pips, PIPS_REQUIRED);
    assert.equal(walk.snapshot().scanner, 'ok');
  });

  it('never lets the pair into the scanner before the pips are full', () => {
    const walk = createWalkBeside(SCANNER_FIELDS.station);
    walk.toggleMatch(besideWalker(walk));
    // Hold forward for exactly two pips' worth, many times over the distance.
    for (let i = 0; i < 200; i += 1) {
      walk.update(1 / 60, { player: walk.besidePosition(), input: walk.geometry.u });
      if (walk.snapshot().pips === PIPS_REQUIRED) break;
      assert.equal(inScanVolume(walk.geometry, walk.walkerPosition()), false);
    }
  });

  it('crosses and completes once in step, and cannot be abandoned mid-scan', () => {
    const walk = createWalkBeside(SCANNER_FIELDS.market);
    walk.toggleMatch(besideWalker(walk));
    let events = [];
    for (let i = 0; i < 60 * 12 && !walk.snapshot().passed; i += 1) {
      events.push(...walk.update(1 / 60, { player: walk.besidePosition(), input: walk.geometry.u }));
      if (inScanVolume(walk.geometry, walk.walkerPosition()) && walk.snapshot().matched) {
        assert.deepEqual(walk.toggleMatch(walk.besidePosition()), [], 'E cannot let go inside the scan');
      }
    }
    assert.ok(events.includes('pattern-ok'));
    assert.ok(events.includes('passed'));
    assert.equal(walk.snapshot().passed, true);
    assert.equal(walk.snapshot().flags, 0);
    events = walk.update(1 / 60, { player: walk.besidePosition(), input: walk.geometry.u });
    assert.deepEqual(events, [], 'a finished crossing is inert');
  });

  it('releases on E or on walking back, resetting only the pips', () => {
    const walk = createWalkBeside(SCANNER_FIELDS.market);
    walk.toggleMatch(besideWalker(walk));
    run(walk, 0.7, walk.geometry.u, () => walk.besidePosition());
    const along = walk.snapshot().walker.along;
    assert.deepEqual(walk.toggleMatch(walk.besidePosition()), ['released']);
    assert.equal(walk.snapshot().pips, 0);
    assert.equal(walk.snapshot().walker.along, along, 'the walker waits where he is');
    walk.toggleMatch(besideWalker(walk));
    const back = { x: -walk.geometry.u.x, z: -walk.geometry.u.z };
    const events = run(walk, 0.6, back, () => walk.besidePosition());
    assert.ok(events.includes('released'));
  });

  it('warns, then flags, anyone who enters the scan volume alone', () => {
    const walk = createWalkBeside(SCANNER_FIELDS.station);
    const insideScan = worldFromLocal(walk.geometry, walk.geometry.gateAlong, 0.3);
    assert.equal(fieldContains(walk.geometry, insideScan), true);
    let events = run(walk, (WARNING_MS + 50) / 1000, { x: 0, z: 0 }, insideScan);
    assert.ok(events.includes('warning'));
    assert.equal(walk.snapshot().scanner, 'warning');
    events = run(walk, (FLAG_MS - WARNING_MS) / 1000, { x: 0, z: 0 }, insideScan);
    assert.ok(events.includes('flagged'));
    assert.equal(walk.snapshot().flags, 1);
    const back = walk.safeReturnPoint(insideScan);
    assert.equal(inScanVolume(walk.geometry, back), false, 'the flag returns Butch to the safe line');
  });

  it('switches to direct movement only inside a live scanner field', () => {
    assert.match(runtime, /activeField\(\) \{[\s\S]*?this\.model\.scannerActive\(id\)/);
    assert.match(runtime, /Scanner fields use direct movement; a click never paths through them/);
    assert.match(runtime, /KeyW', 'KeyA', 'KeyS', 'KeyD'/);
    assert.match(runtime, /this\.pointerHeld/);
  });
});
