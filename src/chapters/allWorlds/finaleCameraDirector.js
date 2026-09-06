import { CAMERA_LANGUAGE } from './finaleArtDirection.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createFinaleCameraDirector(options = {}) {
  const cfg = {
    viewportWidth: 960,
    worldWidth: 2880,
    deadzoneWidth: CAMERA_LANGUAGE.follow.deadzonePx.width,
    lookAheadPx: CAMERA_LANGUAGE.follow.lookAheadPx,
    smoothingRate: CAMERA_LANGUAGE.follow.smoothingRate,
    startFocusX: 480,
    maraX: 2740,
    ...options,
  };

  let focusX = cfg.startFocusX;
  let scrollX = clamp(focusX - cfg.viewportWidth / 2, 0, cfg.worldWidth - cfg.viewportWidth);
  let facing = 1;
  let mode = 'guided-follow';

  function update(dtMs, state) {
    const dt = clamp(Number.isFinite(dtMs) ? dtMs : 0, 0, 100) / 1000;
    const playerX = Number.isFinite(state?.playerX) ? state.playerX : focusX;
    const direction = Math.sign(Number(state?.direction) || 0);
    if (direction !== 0) facing = direction;

    const halfDeadzone = cfg.deadzoneWidth / 2;
    if (playerX > focusX + halfDeadzone) focusX = playerX - halfDeadzone;
    if (playerX < focusX - halfDeadzone) focusX = playerX + halfDeadzone;

    mode = state?.complete ? 'butch-mara-two-target' : 'guided-follow';
    const targetFocus = state?.complete
      ? (playerX + cfg.maraX) / 2
      : focusX + facing * cfg.lookAheadPx;
    const maxScroll = Math.max(0, cfg.worldWidth - cfg.viewportWidth);
    const desiredScroll = clamp(targetFocus - cfg.viewportWidth / 2, 0, maxScroll);
    const blend = dt === 0 ? 0 : 1 - Math.exp(-cfg.smoothingRate * dt);
    scrollX += (desiredScroll - scrollX) * blend;
    scrollX = clamp(scrollX, 0, maxScroll);

    return snapshot();
  }

  function snapshot() {
    return copy({
      mode,
      projection: CAMERA_LANGUAGE.projection,
      pitchDeg: CAMERA_LANGUAGE.authoredPitchDeg,
      scrollX: Number(scrollX.toFixed(3)),
      focusX: Number(focusX.toFixed(3)),
      facing,
      viewport: { width: cfg.viewportWidth, worldWidth: cfg.worldWidth },
      bounds: { minScrollX: 0, maxScrollX: Math.max(0, cfg.worldWidth - cfg.viewportWidth) },
    });
  }

  function reset() {
    focusX = cfg.startFocusX;
    scrollX = clamp(focusX - cfg.viewportWidth / 2, 0, cfg.worldWidth - cfg.viewportWidth);
    facing = 1;
    mode = 'guided-follow';
    return snapshot();
  }

  return Object.freeze({ update, snapshot, reset });
}
