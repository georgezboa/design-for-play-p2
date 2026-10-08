import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTION, STRIDE_PX, createButchMotion, spring } from '../../src/chapters/paintedCountry/paintedPlayerPose.js';
import { gait, stepFollower } from '../../src/chapters/paintedCountry/residentMotion.js';

// Round 6 (George, G2): "the characters are drawn well, but many animations
// look unnatural". These pin the motion that now carries the drawings.

const read = (path) => readFileSync(new URL(`../../src/chapters/paintedCountry/${path}`, import.meta.url), 'utf8');
const DT = 1 / 60;

function run(motion, frames, input) {
  let out = null;
  for (let i = 0; i < frames; i += 1) out = motion.step({ dt: DT, ...input(i) });
  return out;
}

test('springs settle, and stay stable on a 10 fps frame', () => {
  let [x, v] = [0, 0];
  for (let i = 0; i < 120; i += 1) [x, v] = spring(x, v, 1, DT, 140, 15);
  assert.ok(Math.abs(x - 1) < 0.01);
  [x, v] = [0, 0];
  for (let i = 0; i < 30; i += 1) [x, v] = spring(x, v, 1, 0.1, 320, 20);
  assert.ok(Math.abs(x - 1) < 0.01, 'sub-stepped, so a slow frame does not explode');
});

test('turning round is a turn, not a mirror snap: he narrows through side-on, then faces the new way', () => {
  const m = createButchMotion();
  run(m, 30, () => ({ facing: 1 }));
  const widths = [];
  const facings = [];
  for (let i = 0; i < 14; i += 1) {
    const out = m.step({ dt: DT, facing: -1 });
    widths.push(out.scaleX);
    facings.push(out.facing);
  }
  assert.ok(Math.min(...widths) < 0.4, 'side-on in the middle of the turn');
  assert.equal(facings[0], 1, 'still facing the old way as the turn starts');
  assert.equal(facings[facings.length - 1], -1);
  const settled = run(m, 30, () => ({ facing: -1 }));
  assert.ok(Math.abs(settled.scaleX - 1) < 0.02);
});

test('he leans into his speed, with a little anticipation on starting and follow-through on stopping', () => {
  const m = createButchMotion();
  run(m, 30, () => ({ animation: 'idle' }));
  const start = m.step({ dt: DT, vx: 200, animation: 'walk', stride: 1 });
  const lean0 = start.rotation;
  assert.ok(lean0 < 0, 'the first frame tips back (anticipation)');
  const walking = run(m, 60, (i) => ({ vx: 200, animation: 'walk', stride: i * 3 }));
  assert.ok(walking.rotation > 2 * Math.PI / 180, 'then leans forward into the walk');
  // stop: he tips past upright the other way before settling
  let min = Infinity;
  for (let i = 0; i < 40; i += 1) min = Math.min(min, m.step({ dt: DT, vx: 0, animation: 'idle' }).rotation);
  assert.ok(min < -0.1 * Math.PI / 180, `follow-through past upright (${min})`);
  const rest = run(m, 120, () => ({ vx: 0, animation: 'idle' }));
  assert.ok(Math.abs(rest.rotation) < (MOTION.swayDeg + 0.2) * Math.PI / 180, 'settles to the slow weight shift');
});

test('the walk bobs (high on passing, low on contact) and idle breathes', () => {
  const m = createButchMotion();
  const passing = m.step({ dt: DT, vx: 200, animation: 'walk', stride: STRIDE_PX * 0.5 });
  const contact = m.step({ dt: DT, vx: 200, animation: 'walk', stride: STRIDE_PX * 1.5 });
  assert.ok(passing.offsetY < contact.offsetY - 1, `${passing.offsetY} vs ${contact.offsetY}`);
  const idle = createButchMotion();
  const scales = [];
  for (let i = 0; i < 240; i += 1) scales.push(idle.step({ dt: DT, animation: 'idle' }).scaleY);
  assert.ok(Math.max(...scales) - Math.min(...scales) > 0.01, 'the breath is visible');
  assert.ok(Math.max(...scales) - Math.min(...scales) < 0.05, 'and small');
});

test('a jump stretches on take-off and squashes on landing, and the landing is reported for dust', () => {
  const m = createButchMotion();
  run(m, 20, () => ({ animation: 'idle' }));
  let maxY = 0;
  for (let i = 0; i < 8; i += 1) maxY = Math.max(maxY, m.step({ dt: DT, grounded: false, vy: -500, animation: 'jump' }).scaleY);
  assert.ok(maxY > 1.03, `stretch ${maxY}`);
  run(m, 30, () => ({ grounded: false, vy: 600, animation: 'fall' }));
  const land = m.step({ dt: DT, grounded: true, vy: 0, animation: 'idle' });
  assert.equal(land.events[0]?.type, 'land');
  let minY = 1;
  for (let i = 0; i < 10; i += 1) minY = Math.min(minY, m.step({ dt: DT, animation: 'idle' }).scaleY);
  assert.ok(minY < 0.95, `squash ${minY}`);
});

test('the brush arm swings to the cursor on a spring and settles; it scrubs while painting', () => {
  const m = createButchMotion();
  run(m, 10, () => ({ aim: 0 }));
  const first = m.step({ dt: DT, aim: Math.PI / 2 }).arm;
  assert.ok(first < Math.PI / 4, 'it does not snap');
  const settled = run(m, 90, () => ({ aim: Math.PI / 2 })).arm;
  assert.ok(Math.abs(settled - Math.PI / 2) < 0.02);
  const scrub = new Set();
  for (let i = 0; i < 20; i += 1) scrub.add(m.step({ dt: DT, aim: Math.PI / 2, painting: true }).arm.toFixed(3));
  assert.ok(scrub.size >= 4, 'scrubbing moves the brush');
});

test('residents run after the train with real acceleration, and their cycle follows the ground', () => {
  const p = { x: 0, v: 0, stride: 0, facing: 1 };
  stepFollower(p, 500, DT);
  assert.ok(p.v <= 420 * DT + 1e-9, 'they do not leap to full speed');
  for (let i = 0; i < 300; i += 1) stepFollower(p, 500, DT);
  assert.ok(Math.abs(p.x - 500) < 1, 'and arrive without overshooting');
  assert.ok(p.stride >= 499, 'the stride counts the ground covered');
  for (let i = 0; i < 60; i += 1) stepFollower(p, 500, DT);
  assert.ok(Math.abs(p.v) < 1);
  stepFollower(p, 0, DT);
  for (let i = 0; i < 20; i += 1) stepFollower(p, 0, DT);
  assert.equal(p.facing, -1, 'they face the way they run');
});

test('a gait bobs highest on passing and swings the coat a beat behind the legs', () => {
  const passing = gait(0, { strideLength: 40 });
  const contact = gait(10, { strideLength: 40 });
  assert.ok(passing.bob < contact.bob, 'up on passing');
  assert.ok(Math.abs(contact.swing) > 0.99, 'legs apart at contact');
  assert.notEqual(Math.sign(gait(5, { strideLength: 40 }).hem), Math.sign(gait(5, { strideLength: 40 }).swing), 'the hem lags');
  assert.equal(gait(13, { speed: 0 }).bob, -0, 'standing, no bob');
});

test('every figure in the chapter uses the motion: Butch, Mara, the residents, the inhabitants', () => {
  assert.match(read('paintedPlayerFigure.js'), /figure\.motion\.step\(/);
  assert.match(read('maraFigure.js'), /gait\(walked/);
  assert.match(read('PaintedCountryScene.js'), /distance: m\.distance,/);
  const line = read('PaintedLineScene.js');
  assert.match(line, /stepFollower\(p, trainRear/);
  assert.match(line, /p\.stride \/ 11/, 'the run frames follow the stride, not the clock');
  assert.doesNotMatch(line, /Math\.floor\(time \/ 110/);
  const inhabitants = read('PaintedCountryInhabitantScene.js');
  assert.match(inhabitants, /this\.playerMotion\.step\(/);
  assert.match(inhabitants, /stepFollower\(p, p\.targetX/);
  assert.doesNotMatch(inhabitants, /x: 3080 - person\.x/, 'the villagers no longer slide off as one picture');
});
