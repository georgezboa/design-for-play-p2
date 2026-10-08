import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

// Round 6, feedback item 18 (the cross-chapter controls decision): walk on
// A / D and ← / →, jump on SPACE, W and ↑, read / confirm on E or ENTER. In a
// chapter with a jump SPACE only jumps, so the keyboard brush moved to the
// right hand (I J K L aim, F paints, SHIFT washes).
//
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

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');
const scene = read('chapters/paintedCountry/PaintedCountryScene.js');
const line = read('chapters/paintedCountry/PaintedLineScene.js');
const { CHAPTER_CONTROLS } = await import('../../src/shell/chapterControls.js');

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

test('round 6: SPACE, W and ↑ all jump, and none of them touches the brush', () => {
  for (const code of ['Space', 'KeyW', 'ArrowUp']) {
    const { brush, walk, press } = rig();
    brush.update(1 / 60);
    const before = { ...brush.offset };
    press(code);
    const move = brush.readMove(walk);
    assert.equal(move.jump, true, code);
    assert.equal(move.jumpPressed, true, code);
    brush.update(1 / 60);
    assert.equal(brush.paintDown, false, `${code} never paints`);
    assert.deepEqual(brush.offset, before, `${code} leaves the brush where it was`);
    assert.equal(brush.mode, 'mouse');
  }
  // held keys jump too (a held jump re-jumps on landing, as before)
  const { brush, walk } = rig();
  brush.keys.space.isDown = true;
  assert.equal(brush.readMove(walk).jump, true);
});

test('round 6: ← and → walk (with A and D); the arrows no longer aim', () => {
  const { brush, walk } = rig();
  brush.update(1 / 60);
  const before = { ...brush.offset };
  brush.keys.left.isDown = true;
  assert.equal(brush.readMove(walk).left, true);
  brush.update(1 / 10);
  assert.deepEqual(brush.offset, before, 'the brush stays put');
  brush.keys.left.isDown = false;
  brush.keys.right.isDown = true;
  assert.equal(brush.readMove(walk).right, true);
  walk.a.isDown = true;
  brush.keys.right.isDown = false;
  assert.equal(brush.readMove(walk).left, true);
  assert.equal(brush.upArrowJumps, true);
});

test('round 6: E and ENTER both read / confirm', () => {
  for (const code of ['KeyE', 'Enter']) {
    const { brush, walk, press } = rig();
    press(code);
    assert.equal(brush.readMove(walk).interactPressed, true, code);
    assert.equal(brush.readMove(walk).interactPressed, false, 'a tap is one press');
  }
});

test('round 6: the keyboard brush is I J K L to aim, F to paint, SHIFT to wash', () => {
  const { brush, press } = rig();
  brush.update(1 / 60);
  // the first aim key hands the brush to the virtual cursor, where the mouse was
  brush.keys.aimDown.isDown = true;
  brush.update(1 / 120);
  brush.keys.aimDown.isDown = false;
  const y0 = brush.offset.y;
  brush.keys.aimUp.isDown = true;
  brush.update(1 / 10);
  assert.ok(brush.offset.y < y0, 'I aims up');
  assert.equal(brush.mode, 'virtual');
  brush.keys.aimUp.isDown = false;
  const x0 = brush.offset.x;
  brush.keys.aimRight.isDown = true;
  brush.update(1 / 10);
  assert.ok(brush.offset.x > x0, 'L aims right');
  brush.keys.aimRight.isDown = false;
  press('KeyF');
  brush.update(1 / 60);
  assert.equal(brush.paintPressed, true, 'F paints');
  brush.update(1 / 60);
  brush.keys.wash.isDown = true;
  brush.update(1 / 60);
  assert.equal(brush.washDown, true, 'SHIFT washes');
  assert.equal(brush.device, 'keys');
  assert.equal(brush.label('paint'), 'F');
  assert.equal(brush.label('wash'), 'SHIFT');
  assert.equal(brush.label('aim'), 'I J K L');
});

test('round 6: tags print the unified keys, and the controls card lists them', () => {
  const { brush } = rig();
  assert.equal(brush.label('paint'), 'LEFT MOUSE');
  assert.equal(brush.label('wash'), 'RIGHT MOUSE');
  assert.equal(brush.label('jump'), 'SPACE');
  assert.equal(brush.label('read'), 'E');
  assert.equal(brush.jumpKeysLabel(), 'SPACE');
  const rows = Object.fromEntries(CHAPTER_CONTROLS.paintedCountry);
  assert.match(rows.MOVE, /A \/ D · ← →/);
  assert.match(rows.JUMP, /^SPACE · W \/ ↑/);
  assert.match(rows['PAINT / APPLY'], /^LEFT MOUSE · F/);
  assert.match(rows['WASH / TAKE'], /^RIGHT MOUSE · SHIFT/);
  assert.match(rows['READ / INTERACT'], /^E \/ ENTER/);
  assert.match(rows.PAUSE, /^ESC/);
  assert.doesNotMatch(rows['PAINT / APPLY'], /SPACE/, 'SPACE never paints in a chapter with a jump');
  // the first lesson names the jump and the walk in the hand being used
  assert.match(scene, /\$\{b\.label\('jump'\)\} · JUMP ONTO YOUR PAPER/);
  assert.match(scene, /\$\{b\.label\('walk'\)\} · WALK/);
  assert.match(line, /\$\{b\.label\('paint'\)\} · PAINT THE TRACK ACROSS THE GAP/);
});
