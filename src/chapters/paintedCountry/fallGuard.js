// Chapter 4 // THE PAINTED COUNTRY — falling through the paper, safely.
//
// Alpha round 1 (A3-1, P0): after a fall Butch was put back at `lastSafe` with
// `setPosition`, which Arcade physics then added the whole frame's fall on top
// of (Body.postUpdate: gameObject.y += position - prevFrame). On a slow frame
// that is hundreds of pixels, so he respawned inside the floor, sank, fell out
// of view again and respawned again, forever. `lastSafe` was also recorded
// right on a ledge edge, so pushing into a gap re-dropped him at once.
//
// This file holds the rules, with no Phaser, so node can test them:
//   · `lastSafe` is only recorded where the floor carries Butch's whole body
//     plus one body-width on each side (never the last pixel of a ledge);
//   · a fall below `fallY` puts him back at `lastSafe` (the scene does it with
//     `body.reset`, which also zeroes his velocity and the frame's delta);
//   · if he is still not standing FALL_STUCK_SECONDS after that, or he falls
//     out again before he has stood, he goes to the start of his section,
//     which is always permanent floor.
//
// Nothing here costs the player anything that was painted.

export const FALL_STUCK_SECONDS = 1.5;

export function createFallGuard({
  start,
  sections = [],
  bodyWidth,
  fallY,
  isFloorAt,
  stuckSeconds = FALL_STUCK_SECONDS,
}) {
  const margin = bodyWidth * 1.5; // half the body, then one body-width inside
  const state = {
    lastSafe: { x: start.x, y: start.y },
    sinceRespawn: null,
    respawns: 0,
    rescues: 0,
    last: null,
  };

  // Floor under the whole body and one body-width either side of it.
  const fullySupported = (x, y) => [-margin, -bodyWidth / 2, 0, bodyWidth / 2, margin]
    .every((dx) => isFloorAt(x + dx, y));

  // The section a point belongs to: the last section start at or before it.
  function sectionFor(x) {
    let best = start;
    sections.forEach((s) => { if (s.x <= x + 0.5 && s.x >= best.x) best = s; });
    return { x: best.x, y: best.y };
  }

  function respawn(kind, at) {
    state.last = { kind, x: at.x, y: at.y };
    if (kind === 'respawn') {
      state.respawns += 1;
      state.sinceRespawn = 0;
    } else {
      state.rescues += 1;
      state.sinceRespawn = null;
      state.lastSafe = { x: at.x, y: at.y };
    }
    return { kind, x: at.x, y: at.y };
  }

  // Once per frame, after the player has moved. Returns null, or where to put
  // Butch ({ kind: 'respawn' | 'section', x, y }).
  function step({ x, y, grounded, dt }) {
    if (state.sinceRespawn !== null) {
      if (grounded) {
        state.sinceRespawn = null;
      } else {
        state.sinceRespawn += dt;
        if (state.sinceRespawn >= stuckSeconds) return respawn('section', sectionFor(state.lastSafe.x));
      }
    }
    if (grounded && fullySupported(x, y)) state.lastSafe = { x, y };
    if (y > fallY) {
      // Fell again before standing up: the respawn point is no good any more
      // (its floor was washed away, or he is caught in a loop).
      if (state.sinceRespawn !== null) return respawn('section', sectionFor(state.lastSafe.x));
      return respawn('respawn', state.lastSafe);
    }
    return null;
  }

  return {
    state,
    step,
    fullySupported,
    sectionFor,
    get lastSafe() {
      return state.lastSafe;
    },
    get recovering() {
      return state.sinceRespawn !== null;
    },
    snapshot() {
      return {
        lastSafe: { x: Math.round(state.lastSafe.x), y: Math.round(state.lastSafe.y) },
        respawns: state.respawns,
        rescues: state.rescues,
        recovering: state.sinceRespawn !== null,
      };
    },
  };
}

// Put an Arcade body back in the world with nothing carried over: position,
// previous position (so postUpdate adds no delta), velocity and acceleration.
export function placeBody(body, x, y) {
  body.reset(x, y);
  body.setVelocity(0, 0);
}
