import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_FRAMES_IN_FLIGHT, MAX_HELD_TICKS, createFramePacer, isSoftwareRenderer } from '../src/shell/framePacing.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// A fake browser frame source: tick() delivers one native frame.
function harness(state = {}) {
  const native = [];
  const s = { inFlight: 0, gpu: true, paused: false, leaving: false, ended: 0, ...state };
  const pacer = createFramePacer({
    request: (callback) => native.push(callback),
    inFlight: () => s.inFlight,
    hasGpuWork: () => s.gpu,
    endFrame: () => { s.ended += 1; },
    paused: () => s.paused,
    leaving: () => s.leaving,
  });
  const tick = (now = 16) => { const due = native.splice(0); due.forEach((callback) => callback(now)); };
  return { pacer, s, tick, native };
}

test('frames run as usual while the GPU keeps up', () => {
  const { pacer, s, tick } = harness();
  const seen = [];
  const loop = (now) => { seen.push(now); pacer.requestAnimationFrame(loop); };
  pacer.requestAnimationFrame(loop);
  tick(16); tick(32); tick(48);
  assert.deepEqual(seen, [16, 32, 48]);
  assert.equal(s.ended, 3, 'each frame is fenced');
});

test('a frame waits while too many earlier frames are still on the GPU', () => {
  const { pacer, s, tick } = harness({ inFlight: MAX_FRAMES_IN_FLIGHT });
  let runs = 0;
  pacer.requestAnimationFrame(() => { runs += 1; });
  tick(); tick();
  assert.equal(runs, 0);
  assert.equal(pacer.stats.heldForGpu, 2);
  s.inFlight = MAX_FRAMES_IN_FLIGHT - 1;
  tick();
  assert.equal(runs, 1);
});

test('a GPU that never reports back cannot freeze the page', () => {
  const { pacer, tick } = harness({ inFlight: 99 });
  let runs = 0;
  pacer.requestAnimationFrame(() => { runs += 1; });
  for (let i = 0; i < MAX_HELD_TICKS; i += 1) tick();
  assert.equal(runs, 0);
  tick();
  assert.equal(runs, 1);
});

test('a 3D page does not draw behind the pause menu, and resumes after it', () => {
  const { pacer, s, tick } = harness({ paused: true });
  let runs = 0;
  const loop = () => { runs += 1; pacer.requestAnimationFrame(loop); };
  pacer.requestAnimationFrame(loop);
  tick(); tick(); tick();
  assert.equal(runs, 0);
  assert.equal(pacer.stats.heldForPause, 3);
  s.paused = false;
  tick();
  assert.equal(runs, 1);
  // A page without a WebGL2 context (the Phaser chapters) keeps its loop.
  const phaser = harness({ paused: true, gpu: false });
  let phaserRuns = 0;
  phaser.pacer.requestAnimationFrame(() => { phaserRuns += 1; });
  phaser.tick();
  assert.equal(phaserRuns, 1);
});

test('once the page is leaving for the title no frame runs again', () => {
  const { pacer, s, tick, native } = harness();
  let runs = 0;
  pacer.requestAnimationFrame(() => { runs += 1; });
  s.leaving = true;
  tick();
  pacer.requestAnimationFrame(() => { runs += 1; });
  tick();
  assert.equal(runs, 0);
  assert.equal(native.length, 0, 'not even a native frame is requested');
});

test('cancelled callbacks never run; exceptions do not stop the others', () => {
  const errors = [];
  const native = [];
  const pacer = createFramePacer({ request: (callback) => native.push(callback), onError: (error) => errors.push(error.message) });
  let ran = 0;
  const id = pacer.requestAnimationFrame(() => { ran += 10; });
  pacer.requestAnimationFrame(() => { throw new Error('boom'); });
  pacer.requestAnimationFrame(() => { ran += 1; });
  pacer.cancelAnimationFrame(id);
  native.splice(0).forEach((callback) => callback(0));
  assert.equal(ran, 1);
  assert.deepEqual(errors, ['boom']);
});

test('software renderers are recognised by name', () => {
  const gl = (name) => ({ RENDERER: 1, getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 2 }), getParameter: () => name });
  assert.equal(isSoftwareRenderer(gl('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')), true);
  assert.equal(isSoftwareRenderer(gl('llvmpipe (LLVM 15.0.7, 256 bits)')), true);
  assert.equal(isSoftwareRenderer(gl('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')), false);
});

test('the pause menu installs the pacer before any chapter asks for a frame', () => {
  const pause = read('src/shell/pauseMenu.js');
  assert.match(pause, /^installFramePacing\(globalThis\.window\);$/m);
  assert.match(pause, /action\('RETURN TO TITLE', \(\) => leaveForTitle\(\), 'is-danger'\)/);
});
