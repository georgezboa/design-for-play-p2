// LOW GRAPHICS for the Phaser chapters: draw at a lower internal resolution.
//
// On a software rasteriser (SwiftShader, a laptop without a usable GPU) a
// Phaser page is fill-bound: the main thread sits idle while the GPU process
// rasterises every layer of a 960×600 or 1280×800 canvas (alpha round 4:
// Chapter 4 ran at ~5 fps, the Labyrinth at ~3, whatever the window size,
// because the canvas's own size never changes).
//
// This shrinks the canvas's drawing buffer and keeps everything else at the
// game's logical size: the renderer, its projection, the cameras, the scale
// manager and pointer input all still think in game pixels. Only the calls
// that address the default framebuffer in device pixels (viewport, scissor,
// the drawing buffer's height) are scaled on the way to GL. Render textures
// and other framebuffers are untouched. The browser stretches the smaller
// canvas to the same CSS box, so the layout does not move; it is just
// softer. `setScale(1)` restores full resolution, so the pause menu's
// LOW GRAPHICS checkbox can switch it live.

/** The drawing-buffer scale LOW GRAPHICS asks for (1 = full resolution). */
export function lowGraphicsRenderScale(settings = globalThis.NIGHTFALL_SETTINGS, { low = 0.5 } = {}) {
  return settings?.lowGraphics === true ? low : 1;
}

/** Physical drawing-buffer size for a logical size at `scale`. */
export function scaledBufferSize(width, height, scale) {
  const s = Math.max(0.25, Math.min(1, Number(scale) || 1));
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)), scale: s };
}

/**
 * Wrap a WebGL context so default-framebuffer viewport / scissor calls are
 * scaled by `getScale()`. Pure enough to test with a fake context.
 */
export function wrapContextForScale(gl, { width, height, getScale }) {
  if (!gl || gl.__nfRenderScale) return gl?.__nfRenderScale ?? null;
  const bindFramebuffer = gl.bindFramebuffer.bind(gl);
  const viewport = gl.viewport.bind(gl);
  const scissor = gl.scissor.bind(gl);
  // Viewport and scissor are context state, not framebuffer state, and
  // Phaser sometimes sets a render texture's viewport just BEFORE binding
  // its framebuffer. So the last rect asked for is kept in game pixels and
  // re-applied, scaled or not, whenever the binding changes.
  const state = { defaultBound: true, viewport: null, scissor: null };
  const apply = (fn, rect) => {
    if (!rect) return undefined;
    const [x, y, w, h] = rect;
    const s = state.defaultBound ? getScale() : 1;
    if (s === 1) return fn(x, y, w, h);
    return fn(Math.round(x * s), Math.round(y * s), Math.round(w * s), Math.round(h * s));
  };
  gl.bindFramebuffer = (target, framebuffer) => {
    const result = bindFramebuffer(target, framebuffer);
    if (target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER) {
      const wasDefault = state.defaultBound;
      state.defaultBound = !framebuffer;
      if (wasDefault !== state.defaultBound) {
        apply(viewport, state.viewport);
        apply(scissor, state.scissor);
      }
    }
    return result;
  };
  gl.viewport = (x, y, w, h) => { state.viewport = [x, y, w, h]; return apply(viewport, state.viewport); };
  gl.scissor = (x, y, w, h) => { state.scissor = [x, y, w, h]; return apply(scissor, state.scissor); };
  // Phaser flips scissor rects with the drawing buffer's height: give it the
  // logical one, so the flip happens in game pixels before the scale above.
  try {
    Object.defineProperty(gl, 'drawingBufferHeight', { configurable: true, get: () => height });
    Object.defineProperty(gl, 'drawingBufferWidth', { configurable: true, get: () => width });
  } catch { /* a context that refuses own properties keeps physical sizes */ }
  gl.__nfRenderScale = state;
  return state;
}

/**
 * Install on a booted Phaser.Game (WebGL only; a canvas renderer is left
 * alone). Returns { setScale(scale), scale } or null.
 */
export function installPhaserRenderScale(game, initialScale = 1) {
  const renderer = game?.renderer;
  const gl = renderer?.gl;
  const canvas = game?.canvas;
  if (!gl || !canvas || typeof gl.viewport !== 'function') return null;
  // The game's logical size (the renderer's own size is only set once it
  // has booted; the config's is known from the start).
  const width = Number(game.config?.width) || renderer.width;
  const height = Number(game.config?.height) || renderer.height;
  if (!(width > 0 && height > 0)) return null;
  let current = 1;
  wrapContextForScale(gl, { width, height, getScale: () => current });
  const control = {
    get scale() { return current; },
    setScale(next) {
      const size = scaledBufferSize(width, height, next);
      if (size.scale === current && canvas.width === size.width) return current;
      current = size.scale;
      canvas.width = size.width;
      canvas.height = size.height;
      renderer.drawingBufferHeight = height;
      gl.viewport(0, 0, width, height);
      gl.scissor(0, 0, width, height);
      return current;
    },
  };
  control.setScale(initialScale);
  return control;
}

/**
 * The usual wiring: read LOW GRAPHICS now and follow the pause menu's
 * settings event. Returns the control (or null).
 */
export function followLowGraphics(game, { low = 0.5, onChange = null } = {}) {
  const holder = { control: null };
  const install = () => {
    holder.control = installPhaserRenderScale(game, lowGraphicsRenderScale(globalThis.NIGHTFALL_SETTINGS, { low }));
    if (!holder.control) return;
    globalThis.addEventListener?.('nightfall:settings', (event) => {
      const settings = event.detail ?? globalThis.NIGHTFALL_SETTINGS;
      holder.control.setScale(lowGraphicsRenderScale(settings, { low }));
      onChange?.(settings?.lowGraphics === true);
    });
  };
  if (game?.isBooted && game.renderer?.width > 0) install();
  else game?.events?.once?.('ready', install);
  return holder;
}
