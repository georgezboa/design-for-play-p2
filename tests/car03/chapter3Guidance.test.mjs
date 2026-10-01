import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  IDLE_LOOK_HINT_HTML,
  IDLE_LOOK_HINT_SECONDS,
  autoTaggedInteractions,
  closestOnPolyline2D,
  idleLookHintDue,
  trackDestinationPass,
} from '../../src/cars/presentCity3d/chapter3Guidance.js';
import { OPENING_POSITIONS, SEAM_CONCLUSION, SEARCH_HINT_LINES } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import { CITY_MODELS } from '../../src/cars/presentCity3d/city3dConfig.js';
import { LOWEST_PIXEL_RATIO, createQualityMonitor } from '../../src/cars/presentCity3d/chapter3Quality.js';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const clamp = read('src/cars/presentCity3d/Chapter3BellClamp.js');
const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');

// The runtime compass (Chapter3OpeningRuntime.compassDirection): north is -z.
function compass(from, to) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const angle = Math.atan2(dx, -dz);
  const octants = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  return octants[Math.round(((angle < 0 ? angle + Math.PI * 2 : angle) / (Math.PI / 4))) % 8];
}
const model = (id) => CITY_MODELS.find((entry) => entry.id === id).position;

// Alpha round 2 (2026-09-30), engineer G2: Chapter 3 guidance.
describe('Chapter 3 alpha round 2 guidance', () => {
  it('R2-3: a long interactable answers anywhere along itself', () => {
    const line = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    assert.equal(closestOnPolyline2D({ x: 5, y: 3 }, line).distance, 3);
    assert.deepEqual(closestOnPolyline2D({ x: 13, y: 8 }, line), { distance: 3, index: 1, t: 0.8 });
    assert.equal(closestOnPolyline2D({ x: 0, y: 0 }, []).distance, Infinity);
    assert.match(runtime, /hitPoints: this\.seam\.points,/);
    assert.match(runtime, /const onScreen = closestOnPolyline2D\(pointer, screenPoints\);/);
  });

  it('R2-3: the objective within reach is tagged without Tab; companions and flavour are not', () => {
    const candidates = [
      { id: 'lamp-oil-seam', distance: 1.6 },
      { id: 'flavour-clock-tower', ambient: true, distance: 0.5 },
      { id: 'lev-morning-companion', follows: true, distance: 0.9 },
      { id: 'transport-entrance', distance: 30 },
    ];
    let plan = autoTaggedInteractions({ candidates: candidates.filter((c) => c.id !== 'lev-morning-companion'), radius: 4.2 });
    assert.deepEqual([...plan.shown], ['lamp-oil-seam']);
    assert.equal(plan.nearestId, 'lamp-oil-seam');
    plan = autoTaggedInteractions({ candidates, radius: 4.2 });
    assert.equal(plan.nearestId, 'lev-morning-companion', 'E still talks to Lev');
    assert.deepEqual([...plan.shown], [], 'but Lev is never auto-tagged');
    plan = autoTaggedInteractions({ candidates: [{ id: 'transport-entrance', distance: 30 }], radius: 4.2 });
    assert.deepEqual([...plan.shown], []);
    plan = autoTaggedInteractions({ candidates: [{ id: 'transport-entrance', distance: 30 }], hoveredId: 'transport-entrance', radius: 4.2 });
    assert.deepEqual([...plan.shown], ['transport-entrance'], 'hover always tags');
    plan = autoTaggedInteractions({ candidates, tabHeld: true, radius: 4.2 });
    assert.ok(plan.shown.has('transport-entrance') && !plan.shown.has('flavour-clock-tower'));
    plan = autoTaggedInteractions({ candidates: [{ id: 'night-cut-feed', distance: 3.6, radius: 3.2 }], radius: 4.2 });
    assert.equal(plan.nearestId, null, 'per-interactable reach');
    assert.match(runtime, /const plan = autoTaggedInteractions\(\{/);
    assert.match(runtime, /outline: this\.levOutline, follows: true,/);
  });

  it('R2-3: after 20 s idle the city suggests holding Tab', () => {
    assert.equal(IDLE_LOOK_HINT_SECONDS, 20);
    assert.match(IDLE_LOOK_HINT_HTML, /HOLD <kbd>TAB<\/kbd> · LOOK AROUND/);
    const base = { idleSeconds: 20, storyTargets: 1 };
    assert.equal(idleLookHintDue(base), true);
    assert.equal(idleLookHintDue({ ...base, idleSeconds: 19.9 }), false);
    assert.equal(idleLookHintDue({ ...base, locked: true }), false);
    assert.equal(idleLookHintDue({ ...base, tabHeld: true }), false);
    assert.equal(idleLookHintDue({ ...base, storyTargets: 0 }), false, 'nothing to find');
    assert.equal(idleLookHintDue({ ...base, storyTagShown: true }), false, 'a tag already points at it');
    assert.match(runtime, /if \(this\.interactionLocked\(\) \|\| moving\) this\.idleElapsed = 0;/);
    assert.match(runtime, /this\.tags\.place\(screen, IDLE_LOOK_HINT_HTML\);/);
  });

  it('R2-4: Lev\'s directions agree with the city geometry', () => {
    const lev = SEAM_CONCLUSION.at(-1).text;
    const ministry = OPENING_POSITIONS.transportApproach;
    // Said at the oil line.
    for (const from of [OPENING_POSITIONS.seamApproach, OPENING_POSITIONS.seam, OPENING_POSITIONS.levInterview]) {
      assert.equal(compass(from, ministry), 'northeast', `from ${from}`);
    }
    assert.match(lev, /The ministry is northeast, past the fountain\./);
    assert.doesNotMatch(lev, /east, past the clock/);
    // The fountain is on the straight walk; the clock is behind Butch.
    const route = [OPENING_POSITIONS.seamApproach, ministry].map(([x, , z]) => ({ x, y: z }));
    const [fx, , fz] = model('reunion-fountain');
    const [cx, , cz] = model('clock-tower');
    assert.ok(closestOnPolyline2D({ x: fx, y: fz }, route).distance < 2.5);
    assert.ok(closestOnPolyline2D({ x: cx, y: cz }, route).distance > 6);
  });

  it('R2-4: "twice" only after two real passes; beacons mark the ministry and Eda', () => {
    const say = (passes) => SEARCH_HINT_LINES['find-ministry']('south', { passes })[0].text;
    assert.doesNotMatch(say(0), /twice|walked past/);
    assert.match(say(0), /^The Transport Ministry is south of here/);
    assert.match(say(1), /^We just walked past it\./);
    assert.equal(say(2), 'We have walked past it twice. The Transport Ministry is south of here — the tall stone front with the recessed doors.');
    const tracker = { near: false, passes: 0 };
    for (const distance of [30, 20, 8, 12, 16, 25, 7, 20]) trackDestinationPass(tracker, distance);
    assert.equal(tracker.passes, 2);
    const once = { near: false, passes: 0 };
    for (const distance of [40, 30, 20, 14, 10, 12, 30]) trackDestinationPass(once, distance);
    assert.equal(once.passes, 0, 'never near: no pass');
    assert.match(runtime, /SEARCH_HINT_LINES\[phase\.id\]\?\.\(this\.compassDirection\(phase\.target\), \{ passes: this\.destinationPass\.passes \}\)/);
    assert.match(runtime, /ministry: makeGuidanceBeacon\(scene, \{ name: 'chapter3-beacon-ministry' \}\),/);
    assert.match(runtime, /eda: makeGuidanceBeacon\(scene, \{ name: 'chapter3-beacon-eda' \}\),/);
    assert.match(runtime, /this\.updateGuidanceBeacons\(\);/);
  });

  it('R2-5: a missed clamp grab is never also a ground click', () => {
    assert.match(clamp, /if \(near <= NEAR_MISS_PX \|\| this\.puzzleDistance\(event\) <= NEAR_MISS_PX\) \{/);
    assert.match(clamp, /puzzleDistance\(event\) \{/);
    // While the clamp is live the loose-feed interactable never takes hover
    // (it walked Butch onto the clamp).
    assert.match(runtime, /if \(interaction\.id === 'night-cut-feed' && this\.bellClamp\.active\) continue;\n\s+let screenDistance;/);
    // A release on the ground by the puzzle is a miss even without a press
    // on the canvas (the press that closed the caption).
    assert.match(runtime, /if \(this\.bellClamp\.nearPuzzle\(ground\)\) \{\n\s+this\.bellClamp\.noteMiss\('grab'\);\n\s+return true;/);
    assert.match(clamp, /nearPuzzle\(point, radius = PUZZLE_GROUND_RADIUS\) \{/);
    // Butch kneels beside the copper end, not between it and the camera.
    assert.match(runtime, /const kneel = rest\.clone\(\)\.addScaledVector\(screenLeft, 1\.5\);/);
  });

  it('R2-5: nearPuzzle covers the copper end, the ring and the line between', async () => {
    const THREE = await import('three');
    const { Chapter3BellClamp } = await import('../../src/cars/presentCity3d/Chapter3BellClamp.js');
    const element = () => ({ hidden: true, className: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, querySelector: () => ({ style: {} }), append() {} });
    const originalDocument = globalThis.document;
    globalThis.document = { createElement: element, body: { append() {} } };
    try {
      const clampPuzzle = new Chapter3BellClamp({ preview: { scene: new THREE.Scene(), renderer: null } });
      clampPuzzle.start({ clamp: new THREE.Vector3(4.54, 0.24, 11.88), restFrom: new THREE.Vector3(5.48, 0.26, 12.71) });
      assert.equal(clampPuzzle.nearPuzzle({ x: 4.54, z: 11.88 }), true, 'the ring');
      assert.equal(clampPuzzle.nearPuzzle({ x: 5.0, z: 12.3 }), true, 'between');
      assert.equal(clampPuzzle.nearPuzzle({ x: 3.3, z: 11.0 }), true, 'just beyond the ring');
      assert.equal(clampPuzzle.nearPuzzle({ x: 0, z: 8 }), false, 'across the square: a real walk');
      clampPuzzle.seat();
      assert.equal(clampPuzzle.nearPuzzle({ x: 4.54, z: 11.88 }), false, 'seated: clicks walk again');
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('LOW tier: still slow on LOW drops once to half resolution', () => {
    assert.ok(LOWEST_PIXEL_RATIO >= 0.5 && LOWEST_PIXEL_RATIO <= 0.6);
    const pinned = createQualityMonitor({ preference: 'low' });
    const results = [];
    for (let i = 0; i < 60; i += 1) results.push(pinned.sample(0.2));
    assert.deepEqual(results.filter(Boolean), ['lowest'], 'Settings LOW GRAPHICS still measures');
    assert.match(preview, /this\.renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1, 1\) \* LOWEST_PIXEL_RATIO\);/);
  });
});
