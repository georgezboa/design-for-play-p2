// Frame pacing for the three.js chapters, installed by the shared pause menu.
//
// On software GL (SwiftShader: a machine without a usable GPU, or a
// blocklisted one) a 3D chapter queues frames far faster than the GPU draws
// them. The queue grows to several seconds of work, and everything that
// needs the GPU waits behind it: the pause menu appearing, the fade to black
// on RETURN TO TITLE, and the navigation itself, because Chrome finishes a
// page's queued WebGL work before it can tear the page down (~5-8 s on
// car03-3d and museum-3d here).
//
// The pacer sits in front of requestAnimationFrame:
//   - a frame's callbacks run only while fewer than MAX_FRAMES_IN_FLIGHT
//     earlier frames are still unfinished on the GPU (a WebGL2 fence per
//     frame; one frame on a software renderer, whose frames take seconds);
//     on a real GPU they finish within a frame and nothing is ever skipped;
//   - while the pause menu is open, a 3D page does not draw at all (its
//     canvas keeps showing the last frame) until Resume, so the GPU catches
//     up behind the menu;
//   - once the page is leaving for the title, no callback runs again.
// Pages without a WebGL2 context (the Phaser chapters use WebGL1) are only
// affected by the last rule.

export const MAX_FRAMES_IN_FLIGHT = 2;
export const MAX_SOFTWARE_FRAMES_IN_FLIGHT = 1;
export const PAUSED_FRAMES = 0;
// A GPU that never reports back (a lost or stuck context) cannot freeze the
// page: after this many held ticks the frame runs anyway.
export const MAX_HELD_TICKS = 120;

/**
 * The scheduling rule, free of the DOM. `request(callback)` schedules one
 * native frame; `inFlight()` counts unfinished GPU frames; `hasGpuWork()`
 * says whether any WebGL2 context is tracked; `endFrame()` fences the frame
 * that just ran; `paused()` and `leaving()` read the page state.
 */
export function createFramePacer({
  request, cancel = () => {}, inFlight = () => 0, maxInFlight = () => MAX_FRAMES_IN_FLIGHT, hasGpuWork = () => false, endFrame = () => {},
  paused = () => false, leaving = () => false, onError = (error) => { throw error; },
}) {
  let queue = new Map();
  // Well clear of the browser's own ids, so a frame requested before the
  // pacer was installed can still be cancelled natively.
  let nextId = 1e9;
  let scheduled = false;
  let held = 0;
  let pausedFrames = 0;
  const stats = { ran: 0, heldForGpu: 0, heldForPause: 0 };

  const schedule = () => {
    if (scheduled || leaving()) return;
    scheduled = true;
    request(tick);
  };

  function tick(now) {
    scheduled = false;
    if (leaving()) { queue.clear(); return; }
    if (!queue.size) return;
    const isPaused = paused() && hasGpuWork();
    if (!isPaused) pausedFrames = 0;
    const holdForPause = isPaused && pausedFrames >= PAUSED_FRAMES;
    const holdForGpu = !holdForPause && inFlight() >= maxInFlight() && held < MAX_HELD_TICKS;
    if (holdForPause || holdForGpu) {
      if (holdForPause) stats.heldForPause += 1;
      else { stats.heldForGpu += 1; held += 1; }
      schedule();
      return;
    }
    held = 0;
    if (isPaused) pausedFrames += 1;
    const callbacks = queue;
    queue = new Map();
    stats.ran += 1;
    callbacks.forEach((callback) => {
      try { callback(now); } catch (error) { onError(error); }
    });
    endFrame();
  }

  return {
    requestAnimationFrame(callback) {
      const id = nextId;
      nextId += 1;
      queue.set(id, callback);
      schedule();
      return id;
    },
    cancelAnimationFrame(id) {
      if (!queue.delete(id)) cancel(id);
    },
    // After Resume: a held page picks up on the next native frame.
    wake: schedule,
    stats,
  };
}

// SwiftShader, llvmpipe and the like: GL drawn by the CPU.
export function isSoftwareRenderer(gl) {
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = `${gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)}`;
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

let nativeRequest = null;

/** The browser's own requestAnimationFrame, for the shell's own overlays. */
export function nativeRequestAnimationFrame(callback, win = globalThis.window) {
  if (nativeRequest) return nativeRequest(callback);
  if (win?.requestAnimationFrame) return win.requestAnimationFrame(callback);
  return setTimeout(() => callback(Date.now()), 16);
}

export function installFramePacing(win = globalThis.window) {
  if (!win?.requestAnimationFrame || win.__nightfallFramePacing) return win?.__nightfallFramePacing ?? null;
  const GL2 = win.WebGL2RenderingContext;
  const contexts = new Set();
  let software = false;
  const getContext = win.HTMLCanvasElement?.prototype?.getContext;
  if (getContext && GL2) {
    win.HTMLCanvasElement.prototype.getContext = function getContextTracked(type, ...rest) {
      const context = getContext.call(this, type, ...rest);
      if (context instanceof GL2 && !contexts.has(context)) {
        contexts.add(context);
        software ||= isSoftwareRenderer(context);
      }
      return context;
    };
  }
  // Fences of the frames still on the GPU, oldest first: [[gl, sync], ...].
  const frames = [];
  const finished = (frame) => frame.every(([gl, sync]) => gl.isContextLost() || gl.getSyncParameter(sync, gl.SYNC_STATUS) === gl.SIGNALED);
  const inFlight = () => {
    while (frames.length && finished(frames[0])) {
      frames.shift().forEach(([gl, sync]) => { if (!gl.isContextLost()) gl.deleteSync(sync); });
    }
    return frames.length;
  };
  const endFrame = () => {
    const frame = [];
    contexts.forEach((gl) => {
      if (gl.isContextLost()) { contexts.delete(gl); return; }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) return;
      gl.flush();
      frame.push([gl, sync]);
    });
    if (frame.length) frames.push(frame);
  };
  nativeRequest = win.requestAnimationFrame.bind(win);
  const pacer = createFramePacer({
    request: nativeRequest,
    cancel: win.cancelAnimationFrame.bind(win),
    inFlight,
    maxInFlight: () => (software ? MAX_SOFTWARE_FRAMES_IN_FLIGHT : MAX_FRAMES_IN_FLIGHT),
    hasGpuWork: () => contexts.size > 0,
    endFrame,
    paused: () => Boolean(win.NIGHTFALL_PAUSED),
    leaving: () => Boolean(win.NIGHTFALL_LEAVING),
    onError: (error) => (win.reportError ? win.reportError(error) : win.setTimeout(() => { throw error; })),
  });
  win.requestAnimationFrame = pacer.requestAnimationFrame;
  win.cancelAnimationFrame = pacer.cancelAnimationFrame;
  win.addEventListener?.('nightfall:pause', (event) => { if (!event.detail?.paused) pacer.wake(); });
  win.__nightfallFramePacing = pacer;
  return pacer;
}
