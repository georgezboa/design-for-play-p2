import test from 'node:test';
import assert from 'node:assert/strict';
import {
  installPhaserRenderScale,
  lowGraphicsRenderScale,
  scaledBufferSize,
  wrapContextForScale,
} from '../src/shared/phaserRenderScale.js';

function fakeGl() {
  const calls = [];
  return {
    FRAMEBUFFER: 0x8d40,
    calls,
    viewport: (...a) => calls.push(['viewport', ...a]),
    scissor: (...a) => calls.push(['scissor', ...a]),
    bindFramebuffer: (t, fb) => calls.push(['bind', fb ? 'fb' : null]),
  };
}

test('LOW GRAPHICS asks for a smaller drawing buffer; otherwise full size', () => {
  assert.equal(lowGraphicsRenderScale({ lowGraphics: true }), 0.5);
  assert.equal(lowGraphicsRenderScale({ lowGraphics: true }, { low: 0.6 }), 0.6);
  assert.equal(lowGraphicsRenderScale({ lowGraphics: false }), 1);
  assert.equal(lowGraphicsRenderScale(undefined), 1);
  assert.deepEqual(scaledBufferSize(1280, 800, 0.5), { width: 640, height: 400, scale: 0.5 });
  assert.deepEqual(scaledBufferSize(960, 600, 0.6), { width: 576, height: 360, scale: 0.6 });
});

test('default-framebuffer viewport and scissor are scaled; render textures are not', () => {
  const gl = fakeGl();
  let scale = 0.5;
  wrapContextForScale(gl, { width: 1280, height: 800, getScale: () => scale });
  assert.equal(gl.drawingBufferHeight, 800, 'Phaser flips scissors in game pixels');
  gl.viewport(0, 0, 1280, 800);
  assert.deepEqual(gl.calls.at(-1), ['viewport', 0, 0, 640, 400]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, {});
  gl.viewport(0, 0, 256, 256);
  assert.deepEqual(gl.calls.at(-1), ['viewport', 0, 0, 256, 256]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.scissor(10, 20, 100, 60);
  assert.deepEqual(gl.calls.at(-1), ['scissor', 5, 10, 50, 30]);
  scale = 1;
  gl.viewport(0, 0, 1280, 800);
  assert.deepEqual(gl.calls.at(-1), ['viewport', 0, 0, 1280, 800]);
});

test('a viewport set before a render texture is bound is re-applied unscaled on the bind', () => {
  // Phaser sets a render texture's viewport, then binds its framebuffer
  // (the Labyrinth's fog of war drew into a quarter of itself otherwise).
  const gl = fakeGl();
  wrapContextForScale(gl, { width: 1280, height: 800, getScale: () => 0.5 });
  gl.viewport(0, 0, 640, 400);
  assert.deepEqual(gl.calls.at(-1), ['viewport', 0, 0, 320, 200]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, {});
  const after = gl.calls.filter(([name]) => name === 'viewport').at(-1);
  assert.deepEqual(after, ['viewport', 0, 0, 640, 400]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  assert.deepEqual(gl.calls.filter(([name]) => name === 'viewport').at(-1), ['viewport', 0, 0, 320, 200]);
});

test('installing on a game shrinks the canvas and can switch back live', () => {
  const gl = fakeGl();
  const canvas = { width: 960, height: 600 };
  const game = { config: { width: 960, height: 600 }, canvas, renderer: { gl, width: 960, height: 600 } };
  const control = installPhaserRenderScale(game, 0.6);
  assert.equal(control.scale, 0.6);
  assert.deepEqual([canvas.width, canvas.height], [576, 360]);
  assert.equal(game.renderer.width, 960, 'the renderer keeps the logical size');
  control.setScale(1);
  assert.deepEqual([canvas.width, canvas.height], [960, 600]);
  assert.equal(installPhaserRenderScale({ canvas, renderer: {} }, 0.5), null, 'a canvas renderer is left alone');
});
