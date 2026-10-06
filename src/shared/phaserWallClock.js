// Phaser's game clock, made to follow the wall clock on slow machines.
//
// Phaser's TimeStep caps every frame's delta at its 60 fps target (16.7 ms)
// for `panicMax` (120) frames after boot, after every focus and after every
// resume, and for as long as the window is not focused. At 60 fps nobody
// notices. At 10 fps the first 120 frames are twelve seconds of game time
// running at a sixth of real speed (alpha round 4: title cards that would not
// leave, holds and walks that crawled on weak laptops), and an unfocused but
// visible window plays in slow motion for good.
//
// Frames slower than Phaser's minFps (5 fps, 200 ms) are still replaced by
// the last sane delta, so a hitch or a tab coming back cannot make a leap;
// each scene also clamps its own dt (100 ms in Chapter 4 and the Labyrinth).

export function installWallClock(game) {
  const loop = game?.loop;
  if (!loop) return false;
  loop.panicMax = 0;
  loop._coolDown = 0;
  const focus = typeof loop.focus === 'function' ? loop.focus.bind(loop) : null;
  // Losing focus no longer caps the clock; regaining it still re-seeds it.
  loop.blur = () => { loop.inFocus = true; };
  if (focus) loop.focus = () => { focus(); loop._coolDown = 0; };
  const resetDelta = typeof loop.resetDelta === 'function' ? loop.resetDelta.bind(loop) : null;
  if (resetDelta) loop.resetDelta = () => { resetDelta(); loop._coolDown = 0; };
  loop.inFocus = true;
  return true;
}
