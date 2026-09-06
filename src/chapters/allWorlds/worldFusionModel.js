// Chapter 6 // ALL WORLDS AT ONCE — first pairwise world-fusion model.
//
// This isolated course-build slice proves the final chapter's essential rule:
// a meaningful player state survives a world change and gains a new physical
// expression there. It deliberately exposes only two world rules at once.

const WORLD_GRID = 'GRID';
const WORLD_PAINT = 'PAINT';

const DEFAULTS = Object.freeze({
  minX: 72,
  maxX: 888,
  startX: 92,
  walkSpeed: 210,
  pylonX: 264,
  gateX: 392,
  brushX: 540,
  chasmX: 690,
  cutX: 700,
  doorX: 840,
  loomX: 888,
  maraX: 888,
  worldWidth: 960,
  interactRadius: 54,
  autoCutMs: 780,
});

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createWorldFusionModel(options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  let elapsedMs = 0;
  let world = WORLD_GRID;
  let playerX = cfg.startX;
  let gridLinked = false;
  let paintBridge = false;
  let autoCutMsLeft = 0;
  let complete = false;
  let lastEvent = null;
  let events = [];

  function emit(type, payload = {}) {
    lastEvent = { type, t: Math.round(elapsedMs), payload: copy(payload) };
    events.push(lastEvent);
  }

  function near(x) {
    return Math.abs(playerX - x) <= cfg.interactRadius;
  }

  function obstacleLimit(nextX) {
    // Grid's dead safety gate is a physical limit until Butch restores the
    // relationship. Paper's chasm is a separate limit until that same signal
    // becomes a painted wind-bridge.
    if (world === WORLD_GRID && !gridLinked && nextX > cfg.gateX) return cfg.gateX;
    if (world === WORLD_PAINT && !paintBridge && nextX > cfg.chasmX) return cfg.chasmX;
    return nextX;
  }

  function prompt() {
    if (complete) return 'MARA: "You kept every road open."';
    if (autoCutMsLeft > 0) return 'THE WORLDS ARE PULLING TOGETHER';
    if (world === WORLD_GRID && near(cfg.pylonX) && !gridLinked) return '[E] LINK THE POWER PYLON';
    if (world === WORLD_PAINT && near(cfg.brushX) && gridLinked && !paintBridge) return '[E] TURN THE SIGNAL INTO WIND';
    if (world === WORLD_GRID && near(cfg.doorX) && gridLinked && paintBridge) return '[E] OPEN THE WITNESS DOOR';
    if (gridLinked && !paintBridge && world === WORLD_GRID) return '[Q] STEP THROUGH THE PAINTED EDGE';
    if (paintBridge && world === WORLD_PAINT && playerX < cfg.cutX) return 'FOLLOW THE WIND-BRIDGE';
    return '[Q] SHIFT WORLD   ·   [R] RESTART';
  }

  function snapshot() {
    return copy({
      coordinateSystem: 'origin top-left; +x right; world units are pixels',
      chapter: 'ALL WORLDS AT ONCE',
      slice: 'GRID_TO_PAINT_PAIRWISE_FUSION',
      world,
      player: { x: Math.round(playerX), y: 468 },
      spine: {
        worldWidth: cfg.worldWidth,
        bounds: { minX: cfg.minX, maxX: cfg.maxX },
        anchors: {
          pylonX: cfg.pylonX,
          gateX: cfg.gateX,
          brushX: cfg.brushX,
          chasmX: cfg.chasmX,
          cutX: cfg.cutX,
          witnessDoorX: cfg.doorX,
          worldLoomX: cfg.loomX,
          maraX: cfg.maraX,
        },
      },
      carriedState: {
        gridLinked,
        paintBridge,
        meaning: gridLinked
          ? (paintBridge ? 'power became wind became a bridge' : 'power is carried across the boundary')
          : 'no relationship carried yet',
      },
      automaticCut: autoCutMsLeft > 0 ? { active: true, msLeft: Math.ceil(autoCutMsLeft) } : { active: false },
      objective: prompt(),
      complete,
      lastEvent,
    });
  }

  function pressInteract() {
    if (complete || autoCutMsLeft > 0) {
      emit('interact-refused', { reason: complete ? 'complete' : 'auto-cut-active' });
      return false;
    }
    if (world === WORLD_GRID && near(cfg.pylonX) && !gridLinked) {
      gridLinked = true;
      emit('grid-linked', { source: 'pylon', relationship: 'amber current', result: 'paint-world-unlocked' });
      return true;
    }
    if (world === WORLD_PAINT && near(cfg.brushX) && gridLinked && !paintBridge) {
      paintBridge = true;
      emit('signal-painted', { source: 'carried-current', relationship: 'wind stroke', result: 'paper-chasm-bridged' });
      return true;
    }
    if (world === WORLD_GRID && near(cfg.doorX) && gridLinked && paintBridge) {
      complete = true;
      emit('witness-door-opened', { source: 'two-world-chain', relationship: 'continuous witness link', result: 'mara-reached' });
      return true;
    }
    emit('interact-refused', { reason: 'no-eligible-relationship', world, x: Math.round(playerX) });
    return false;
  }

  function pressWorldShift() {
    if (complete || autoCutMsLeft > 0 || !gridLinked) {
      emit('world-shift-refused', { reason: complete ? 'complete' : (gridLinked ? 'auto-cut-active' : 'link-required') });
      return false;
    }
    world = world === WORLD_GRID ? WORLD_PAINT : WORLD_GRID;
    emit('world-shifted', { world, carried: { gridLinked, paintBridge } });
    return true;
  }

  function update(dtMs, input = {}) {
    const dt = Math.max(0, Math.min(100, Number.isFinite(dtMs) ? dtMs : 0));
    elapsedMs += dt;

    if (autoCutMsLeft > 0) {
      autoCutMsLeft = Math.max(0, autoCutMsLeft - dt);
      if (autoCutMsLeft === 0) {
        world = WORLD_GRID;
        emit('automatic-cut-finished', { world, carried: { gridLinked, paintBridge } });
      }
      return snapshot();
    }

    if (!complete) {
      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let nextX = clamp(playerX + direction * cfg.walkSpeed * (dt / 1000), cfg.minX, cfg.maxX);
      nextX = obstacleLimit(nextX);
      playerX = nextX;

      // The final movement itself carries the player across a brush boundary;
      // control returns after the intentional automatic cut, in GRID, with the
      // Paper-created bridge still part of the active relationship.
      if (world === WORLD_PAINT && paintBridge && playerX >= cfg.cutX) {
        playerX = cfg.cutX;
        autoCutMsLeft = cfg.autoCutMs;
        emit('automatic-world-cut-started', { from: WORLD_PAINT, to: WORLD_GRID, carried: { gridLinked, paintBridge } });
      }
    }
    return snapshot();
  }

  function reset() {
    elapsedMs = 0;
    world = WORLD_GRID;
    playerX = cfg.startX;
    gridLinked = false;
    paintBridge = false;
    autoCutMsLeft = 0;
    complete = false;
    lastEvent = null;
    events = [];
    emit('reset');
    return snapshot();
  }

  return {
    update,
    pressInteract,
    pressWorldShift,
    reset,
    snapshot,
    drainEvents() {
      const out = events.map(copy);
      events = [];
      return out;
    },
  };
}

export const WORLD_FUSION = Object.freeze({ GRID: WORLD_GRID, PAINT: WORLD_PAINT, DEFAULTS });
