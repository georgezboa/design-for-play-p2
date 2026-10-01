// Chapter 4 // THE PAINTED COUNTRY — which pencil frame Butch is in.
// Pure (no Phaser, no assets), so the node tests can drive it.
//
// The sheet (assets/butch-pencil/butch-pencil-sheet.png): 0-3 the walk (0 is
// the standing pose), 4 JUMP (rising), 5 FALL. The walk advances with
// distance travelled, not time, so his feet never skate.

export const BUTCH_FRAMES = Object.freeze({ walk: [0, 1, 2, 3], idle: 0, jump: 4, fall: 5 });
export const STRIDE_PX = 13;

export function butchPose({ vx = 0, vy = 0, grounded = true, stride = 0, facing = 1, aimX = null, x = 0 } = {}) {
  let nextFacing = facing;
  if (vx < -8) nextFacing = -1;
  else if (vx > 8) nextFacing = 1;
  else if (aimX !== null && Math.abs(aimX - x) > 24) nextFacing = aimX < x ? -1 : 1;
  if (!grounded) {
    const rising = vy < -40;
    return { frame: rising ? BUTCH_FRAMES.jump : BUTCH_FRAMES.fall, facing: nextFacing, animation: rising ? 'jump' : 'fall' };
  }
  if (Math.abs(vx) > 8) {
    const i = Math.floor(stride / STRIDE_PX) % BUTCH_FRAMES.walk.length;
    return { frame: BUTCH_FRAMES.walk[i], facing: nextFacing, animation: 'walk' };
  }
  return { frame: BUTCH_FRAMES.idle, facing: nextFacing, animation: 'idle' };
}
