import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTROLLER, createControllerState, jumpArc, stepController } from '../../src/chapters/borrowedLight/controller.js';

const FRAME = 1000 / 60;
const idle = { left: false, right: false, jumpPressed: false, jumpHeld: false };

// A flat-floor integrator: enough to measure the arc the controller produces.
function simulate(inputs, { frames = 120, floorY = 0, startGrounded = true } = {}) {
  const state = createControllerState();
  let x = 0; let y = floorY; let vx = 0; let vy = 0; let grounded = startGrounded;
  const trace = [];
  for (let i = 0; i < frames; i += 1) {
    const input = typeof inputs === 'function' ? inputs(i, { x, y, grounded }) : inputs;
    const out = stepController(state, input, { grounded, vx, vy }, FRAME);
    vx = out.vx; vy = out.vy;
    x += vx * (FRAME / 1000);
    y += vy * (FRAME / 1000);
    if (y >= floorY) { y = floorY; if (vy > 0) vy = 0; grounded = true; } else grounded = false;
    trace.push({ i, x, y, vx, vy, grounded, pose: out.pose, jumped: out.jumped });
  }
  return trace;
}

test('the tuned feel matches the spec: ~420 px/s run, ~180 px apex', () => {
  const arc = jumpArc();
  assert.equal(CONTROLLER.maxRun, 420);
  assert.ok(Math.abs(arc.apex - 180) < 2, `apex ${arc.apex}`);
  assert.ok(arc.flatRange > 290 && arc.flatRange < 330, `flat range ${arc.flatRange}`);
  assert.ok(arc.safeGap >= 220 && arc.safeGap < arc.flatRange);
  assert.ok(arc.safeStepUp >= 140 && arc.safeStepUp < arc.apex);
  // Reaching a higher ledge is harder than a level one; a lower one is easier.
  assert.ok(arc.reachAtRise(140) < arc.reachAtRise(0));
  assert.ok(arc.reachAtRise(-200) > arc.reachAtRise(0));
  assert.equal(arc.reachAtRise(arc.apex + 1), 0);
});

test('the simulated full jump peaks near 180 px and a held run reaches max speed quickly', () => {
  const trace = simulate((i) => ({ left: false, right: true, jumpPressed: i === 20, jumpHeld: i >= 20 }));
  const top = Math.min(...trace.map((frame) => frame.y));
  assert.ok(Math.abs(-top - 180) < 12, `apex ${-top}`);
  assert.equal(Math.round(trace[19].vx), 420);
});

test('releasing jump early gives a short hop (variable jump height)', () => {
  const full = simulate((i) => ({ ...idle, jumpPressed: i === 2, jumpHeld: i >= 2 }));
  const hop = simulate((i) => ({ ...idle, jumpPressed: i === 2, jumpHeld: i >= 2 && i < 6 }));
  const peak = (trace) => -Math.min(...trace.map((frame) => frame.y));
  assert.ok(peak(hop) < peak(full) * 0.55, `hop ${peak(hop)} full ${peak(full)}`);
  assert.ok(peak(hop) > 30);
});

test('coyote time: a jump pressed up to 100 ms after leaving a ledge still fires', () => {
  const state = createControllerState();
  stepController(state, idle, { grounded: true, vx: 300, vy: 0 }, FRAME);
  // Walk off the ledge: four frames airborne (~67 ms), press on the fifth.
  let out;
  for (let i = 0; i < 4; i += 1) out = stepController(state, idle, { grounded: false, vx: 300, vy: out?.vy ?? 0 }, FRAME);
  out = stepController(state, { ...idle, jumpPressed: true, jumpHeld: true }, { grounded: false, vx: 300, vy: out.vy }, FRAME);
  assert.equal(out.jumped, true);

  const late = createControllerState();
  stepController(late, idle, { grounded: true, vx: 300, vy: 0 }, FRAME);
  for (let i = 0; i < 8; i += 1) out = stepController(late, idle, { grounded: false, vx: 300, vy: 200 }, FRAME);
  out = stepController(late, { ...idle, jumpPressed: true, jumpHeld: true }, { grounded: false, vx: 300, vy: 300 }, FRAME);
  assert.equal(out.jumped, false);
});

test('jump buffer: a press up to 120 ms before landing jumps on touchdown', () => {
  const state = createControllerState();
  let out = stepController(state, { ...idle, jumpPressed: true, jumpHeld: true }, { grounded: false, vx: 0, vy: 500 }, FRAME);
  assert.equal(out.jumped, false);
  for (let i = 0; i < 5; i += 1) out = stepController(state, { ...idle, jumpHeld: true }, { grounded: false, vx: 0, vy: 500 }, FRAME);
  out = stepController(state, { ...idle, jumpHeld: true }, { grounded: true, vx: 0, vy: 0 }, FRAME);
  assert.equal(out.jumped, true);
  assert.equal(out.vy < -850, true);

  const stale = createControllerState();
  stepController(stale, { ...idle, jumpPressed: true, jumpHeld: false }, { grounded: false, vx: 0, vy: 500 }, FRAME);
  for (let i = 0; i < 9; i += 1) out = stepController(stale, idle, { grounded: false, vx: 0, vy: 500 }, FRAME);
  out = stepController(stale, idle, { grounded: true, vx: 0, vy: 0 }, FRAME);
  assert.equal(out.jumped, false);
});

test('updraft lifts toward a steady rise and poses read run / jump / fall / land / idle', () => {
  const state = createControllerState();
  let out = { vy: 400, vx: 0 };
  for (let i = 0; i < 30; i += 1) out = stepController(state, idle, { grounded: false, vx: 0, vy: out.vy, inUpdraft: true }, FRAME);
  assert.equal(out.vy, CONTROLLER.updraftVy);
  assert.equal(out.pose, 'float');

  const trace = simulate((i) => ({ ...idle, right: i < 40, jumpPressed: i === 10, jumpHeld: i >= 10 && i < 40 }), { frames: 90 });
  const poses = new Set(trace.map((frame) => frame.pose));
  for (const pose of ['run', 'jump', 'fall', 'land', 'idle']) assert.ok(poses.has(pose), `missing ${pose}`);
});
