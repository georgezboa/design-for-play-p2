// Round 11 · the arrival (George: "第三章任务一开始的站位不是很好 一直卡在一个地方
// 你要做出来那种正在下车 他便播报 下车动画结束之后就可以随意移动了").
// Butch steps down from the night service's last carriage while the station
// announcement plays; once he is down the player has him, and the rest of
// the opening (the call-back, his two lines with the claim card in his hand,
// Lev's introduction) is walk-and-talk. src/cars/presentCity3d/chapter3Alighting.js.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  ALIGHTING, ALIGHTING_SECONDS, ARRIVAL_CARRIAGE, alightingFocus, alightingPlan, alightingPose, carriageLocal, carriagePoint,
  createLineQueue, lineSeconds,
} from '../../src/cars/presentCity3d/chapter3Alighting.js';
import { ARRIVAL_DIALOGUE, LEV_INTRO_DIALOGUE, OPENING_POSITIONS, SCANNER_FIELDS } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import { isWalkable } from '../../src/cars/presentCity3d/EchoCity3DPreview.js';
import { STATION_LAYOUT } from '../../src/cars/presentCity3d/city3dConfig.js';
import { createChapter3OpeningModel } from '../../src/cars/presentCity3d/chapter3OpeningModel.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const STATION_BLOCK = [{ type: 'oriented-box', center: STATION_LAYOUT.center, size: [5.4, 7.0], rotationY: STATION_LAYOUT.modelRotationY, padding: 0.18 }];
const POST_BOX = { x: -3.2, z: 31.5 };

describe('Chapter 3 round 11 · stepping down from the night service', () => {
  it('uses the carriage the finale boards, where it stands', () => {
    const builders = read('src/cars/presentCity3d/chapter3SceneBuilders.js');
    assert.match(builders, /group\.position\.set\(-13\.7, 0, 34\.0\);\s*group\.rotation\.y = THREE\.MathUtils\.degToRad\(55\);/);
    assert.deepEqual([...ARRIVAL_CARRIAGE.origin], [-13.7, 34.0]);
    assert.equal(Math.round((ARRIVAL_CARRIAGE.rotationY * 180) / Math.PI), 55);
    const back = carriageLocal(carriagePoint([0.4, 3.1]));
    assert.ok(Math.abs(back[0] - 0.4) < 1e-9 && Math.abs(back[1] - 3.1) < 1e-9);
  });

  it('starts in the end doorway (facing out, toward the camera) and ends on the forecourt, a few seconds later', () => {
    const plan = alightingPlan();
    const [, doorZ] = carriageLocal(plan.doorway);
    assert.ok(doorZ < ARRIVAL_CARRIAGE.endZ && doorZ > ARRIVAL_CARRIAGE.endZ - 0.6, 'just inside the end doorway');
    assert.deepEqual([plan.stand.x, plan.stand.z], [OPENING_POSITIONS.playerStart[0], OPENING_POSITIONS.playerStart[2]]);
    assert.ok(ALIGHTING_SECONDS > 2.5 && ALIGHTING_SECONDS < 5, `${ALIGHTING_SECONDS.toFixed(2)} s`);
    const first = alightingPose(0);
    assert.equal(first.lift, ALIGHTING.floorLift);
    assert.equal(first.moving, false);
    // out of the end door: along the rails, toward +z (the camera side)
    assert.ok(Math.abs(first.facing - ARRIVAL_CARRIAGE.rotationY) < 1e-6);
    const last = alightingPose(ALIGHTING_SECONDS + 0.01);
    assert.equal(last.done, true);
    assert.equal(last.lift, 0);
    assert.deepEqual([last.x, last.z], [plan.stand.x, plan.stand.z]);
  });

  it('steps down once, at a walking pace, and stops without a skid', () => {
    let previous = alightingPose(0);
    let maxSpeed = 0;
    let lift = previous.lift;
    const dt = 1 / 60;
    for (let t = dt; t <= ALIGHTING_SECONDS + dt; t += dt) {
      const pose = alightingPose(t);
      const speed = Math.hypot(pose.x - previous.x, pose.z - previous.z) / dt;
      maxSpeed = Math.max(maxSpeed, speed);
      assert.ok(pose.lift <= lift + 1e-9, 'the feet only ever go down');
      lift = pose.lift;
      previous = pose;
    }
    // the rig's walk clip is paced for 1.75 m/s (Chapter3AnimatedCharacters)
    assert.ok(maxSpeed <= ALIGHTING.walkSpeed + 1e-6 && maxSpeed / 1.75 < 1.6, `peak ${maxSpeed.toFixed(2)} m/s`);
    // the last tenth of a second is nearly still
    const a = alightingPose(ALIGHTING_SECONDS - 0.1);
    const b = alightingPose(ALIGHTING_SECONDS - 0.001);
    assert.ok(Math.hypot(b.x - a.x, b.z - a.z) / 0.099 < 0.5);
    // the step down is under a second, from the carriage floor to the bed
    const step = alightingPlan().segments.find((segment) => segment.kind === 'step');
    assert.ok(step.seconds > 0.25 && step.seconds < 1);
    assert.ok(ALIGHTING.floorLift > 0.3 && ALIGHTING.floorLift < 0.7);
  });

  it('walks out across open ground to a spot clear of the station, the post box and the scanner arch', () => {
    const walk = alightingPlan().segments.find((segment) => segment.kind === 'walk');
    for (let k = 1; k <= 20; k += 1) {
      const x = walk.from.x + ((walk.to.x - walk.from.x) * k) / 20;
      const z = walk.from.z + ((walk.to.z - walk.from.z) * k) / 20;
      assert.ok(isWalkable(x, z, STATION_BLOCK), `the walk out crosses blocked ground at ${x.toFixed(2)}, ${z.toFixed(2)}`);
    }
    const [sx, , sz] = OPENING_POSITIONS.playerStart;
    assert.ok(Math.hypot(sx - POST_BOX.x, sz - POST_BOX.z) > 3, 'not by the post box any more');
    assert.ok(Math.hypot(sx - -3.0, sz - 32.6) > 1.5, 'not the old frozen spot');
    const arch = SCANNER_FIELDS.station.gate;
    assert.ok(Math.hypot(sx - arch[0], sz - arch[2]) > 4);
    // Lev waits in view on the paving, a short walk away
    const [lx, , lz] = OPENING_POSITIONS.levStart;
    assert.ok(isWalkable(lx, lz, STATION_BLOCK));
    const apart = Math.hypot(lx - sx, lz - sz);
    assert.ok(apart > 3 && apart < 8, `${apart.toFixed(1)} m`);
  });

  it('frames the carriage end and the forecourt together, a little below the title', () => {
    const plan = alightingPlan();
    const focus = alightingFocus();
    const mid = { x: (plan.doorway.x + plan.stand.x) / 2, z: (plan.doorway.z + plan.stand.z) / 2 };
    // further from the camera than the midpoint (CAMERA_HOME looks from +x +z)
    assert.ok(focus.x < mid.x && focus.z < mid.z);
    assert.match(runtime, /if \(this\.alightingElapsed !== null \|\| \(this\.arrivalStaged && !this\.arrivalStarted\)\) target = this\.baseZoom \+ ARRIVAL_CLOSE_UP_ZOOM;/);
    assert.match(runtime, /this\.showTitleCard\(\{ high: true \}\);/);
    assert.match(read('src/cars/presentCity3d/chapter3Release.css'), /\.nf-title-card\.c3-title-high \{ place-items: start center;/);
  });
});

describe('Chapter 3 round 11 · walk-and-talk captions', () => {
  it('reads at a comfortable pace, within bounds', () => {
    assert.equal(lineSeconds('Why?'), 2.8);
    assert.ok(lineSeconds(ARRIVAL_DIALOGUE[0].text) > 5 && lineSeconds(ARRIVAL_DIALOGUE[0].text) < 8);
    assert.equal(lineSeconds('x'.repeat(400)), 8);
  });

  it('shows one line at a time, holds a voiced line, waits out a conversation, and ends', () => {
    const shown = [];
    const queue = createLineQueue([
      { line: { text: 'one' }, at: 0.5 },
      { line: { text: 'two' }, onShow: () => shown.push('cue') },
      { line: { text: 'three' } },
    ], { gap: 0.25, hold: () => 1 });
    const run = (seconds, state = {}) => {
      const out = [];
      for (let t = 0; t < seconds - 1e-9; t += 0.05) {
        const entry = queue.tick(0.05, state);
        if (entry) { out.push(entry.line.text); entry.onShow?.(); }
      }
      return out;
    };
    assert.deepEqual(run(0.4), [], 'held back until `at`');
    assert.deepEqual(run(0.2), ['one']);
    assert.deepEqual(run(0.9), []);
    // still speaking: the line stays up past its reading time
    assert.deepEqual(run(1.0, { speaking: true }), []);
    // a conversation has the caption bar: wait
    assert.deepEqual(run(1.0, { free: false }), []);
    assert.deepEqual(run(0.4), ['two']);
    assert.deepEqual(shown, ['cue']);
    queue.interrupt();
    assert.deepEqual(run(0.4), ['three']);
    assert.equal(queue.done, false);
    run(1.5);
    assert.equal(queue.done, true);
    assert.equal(queue.remaining, 0);
  });
});

// Round 12 (George: "一开始是应该那个人走到前面必须聊天的"): the walk-and-talk
// after the step down is a required conversation again, with Lev in front
// of Butch (tests/car03/chapter3Round12Play.test.mjs). What round 11 set up
// around it stays: the step down holds him, the claim card is a paper at the
// side, never a modal; the story order is unchanged.
describe('Chapter 3 round 11 · the opening around the step down', () => {
  it('locks input while he steps down (and before the page shows the arrival)', () => {
    assert.match(runtime, /\|\| this\.alightingElapsed !== null\s*\|\| \(this\.arrivalStaged && !this\.arrivalStarted\)/);
    // the old arrival held him through four captions and a modal card
    assert.doesNotMatch(runtime, /openArrival\(\)/);
    assert.doesNotMatch(runtime, /evidenceViewer\.open\(CHAPTER3_DOCUMENTS\.CLAIM_CARD/);
    assert.match(runtime, /this\.evidenceViewer\.peek\(CHAPTER3_DOCUMENTS\.CLAIM_CARD, \{ seconds: \d+ \}\)/);
    // the announcement is a walk-and-talk caption over the step down
    assert.match(runtime, /this\.openingLines = createLineQueue\(ARRIVAL_ANNOUNCEMENT\.map\(/);
    assert.ok(ARRIVAL_DIALOGUE[0].speaker === 'CONDUCTOR' && /Passengers leaving the train/.test(ARRIVAL_DIALOGUE[0].text), 'the announcement plays first');
    assert.equal(LEV_INTRO_DIALOGUE[0].text, 'Keep that card out.');
  });

  it('keeps the story order: arrival read on the paving, the train leaves, then Lev, then the walk', () => {
    const model = createChapter3OpeningModel();
    assert.equal(model.completeTrainDeparture(), false, 'the train waits until he is down');
    assert.equal(model.readArrival(), true);
    assert.equal(model.completeLevIntroduction(), false);
    assert.equal(model.completeTrainDeparture(), true);
    assert.equal(model.completeLevIntroduction(), true);
    assert.equal(model.beginGuide(), true);
    const alight = runtime.match(/  updateAlighting\(dt\) \{([\s\S]*?)\n  \}\n/)[1];
    assert.match(alight, /if \(!pose\.done\) return;[\s\S]*?this\.model\.readArrival\(\);[\s\S]*?this\.beginTrainDeparture\(\);\s*this\.beginLevArrivalApproach\(\);/);
    assert.match(runtime, /finishLevIntroduction\(\) \{[\s\S]*?this\.model\.completeTrainDeparture\(\);[\s\S]*?if \(this\.model\.completeLevIntroduction\(\)\) this\.beginGuidedWalk\(\);/);
  });

  it('stages the first frame before the page reveals it, and leaves the finale its carriage', () => {
    assert.match(runtime, /async initialize\(\{ holdArrival = false \} = \{\}\) \{/);
    assert.match(runtime, /this\.stageArrival\(\);\s*if \(!holdArrival\) this\.beginArrival\(\);/);
    assert.match(runtime, /\.\.\.\(arrivalPending \? \[this\.loadAssetGroup\('train'\)\] : \[\]\),/);
    assert.match(runtime, /if \(this\.finalDoor\.group\.visible\) roots\.push\(this\.finalDoor\.group\);/);
    assert.match(runtime, /if \(this\.finalDoorBase\) this\.finalDoor\.group\.position\.copy\(this\.finalDoorBase\);/);
    // the feet stand on the carriage floor while he is in the door
    assert.match(read('src/cars/presentCity3d/Chapter3AnimatedCharacters.js'), /this\.visualBaseY \+ this\.groundCorrection \+ \(Number\(this\.lift\) \|\| 0\)/);
  });
});
