import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

// brushInput.js imports Phaser, which needs a browser. Swap in a stub that
// only carries the one helper the brush uses.
const stub = 'export default { Math: { Clamp: (v, a, b) => Math.min(b, Math.max(a, v)) } };';
const hooks = `
export async function resolve(specifier, context, next) {
  if (specifier === 'phaser') return { url: 'data:text/javascript,${encodeURIComponent(stub)}', shortCircuit: true };
  return next(specifier, context);
}`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`);
const { BrushInput } = await import('../../src/chapters/paintedCountry/brushInput.js');

const scene = readFileSync(new URL('../../src/chapters/paintedCountry/PaintedCountryScene.js', import.meta.url), 'utf8');
const controls = readFileSync(new URL('../../src/shell/chapterControls.js', import.meta.url), 'utf8');

function rig() {
  const handlers = {};
  const key = () => ({ isDown: false });
  const pointer = { x: 400, y: 300, leftButtonDown: () => false, rightButtonDown: () => false };
  const cam = {
    width: 960, height: 600, zoom: 1, worldView: { x: 0, y: 0 },
    getWorldPoint: (x, y) => ({ x, y }),
  };
  const fakeScene = {
    input: {
      keyboard: {
        addKeys: (map) => Object.fromEntries(Object.keys(map).map((k) => [k, key()])),
        addCapture() {},
        on: (name, fn) => { handlers[name] = fn; },
      },
      on() {},
      activePointer: pointer,
      gamepad: null,
    },
    cameras: { main: cam },
    add: { graphics: () => ({ setDepth() { return this; } }) },
  };
  const brush = new BrushInput(fakeScene, { anchor: () => ({ x: 300, y: 300 }), radius: 200 });
  const walk = { a: key(), d: key(), w: key(), e: key() };
  const press = (code) => handlers.keydown({ code, repeat: false });
  return { brush, walk, press, pointer };
}

test('R3-5: ↑ jumps in Chapter 4 (with W), and does not drag the brush', () => {
  const { brush, walk, press } = rig();
  brush.update(1 / 60);
  press('ArrowUp');
  brush.keys.up.isDown = true;
  const move = brush.readMove(walk);
  assert.equal(move.jump, true);
  assert.equal(move.jumpPressed, true);
  const before = { ...brush.offset };
  brush.update(1 / 60);
  assert.deepEqual(brush.offset, before, '↑ as jump leaves the brush where it was');
  assert.equal(brush.mode, 'mouse');
  // W still jumps as before.
  brush.keys.up.isDown = false;
  press('KeyW');
  assert.equal(brush.readMove(walk).jumpPressed, true);
});

test('R3-5: once ← / → / ↓ steer the brush, ↑ aims with them; the mouse hands ↑ back to jumping', () => {
  const { brush, walk, pointer } = rig();
  brush.update(1 / 60);
  brush.keys.left.isDown = true;
  brush.update(1 / 60);
  brush.keys.left.isDown = false;
  assert.equal(brush.upArrowJumps, false);
  assert.equal(brush.jumpKeysLabel(), 'W');
  brush.keys.up.isDown = true;
  assert.equal(brush.readMove(walk).jump, false, '↑ is aiming now');
  const y0 = brush.offset.y;
  brush.update(1 / 10);
  assert.ok(brush.offset.y < y0, 'the brush moved up');
  brush.keys.up.isDown = false;
  pointer.x += 30;
  brush.update(1 / 60);
  assert.equal(brush.upArrowJumps, true);
  assert.equal(brush.jumpKeysLabel(), 'W / ↑');
});

test('R3-5: the first tag and the controls card name ↑ as a jump key', () => {
  assert.match(scene, /\$\{b\.jumpKeysLabel\(\)\} · JUMP/);
  assert.match(controls, /\['JUMP', 'W \/ ↑ · PAD Y \/ RB'\]/);
});
