// Shared motor / wheel-rail adhesion model — SYSTEM ARC LOCK §2.2.
// Pure logic: no Phaser, no DOM, no rendering.
//
// The Phase II contactor chain energizes the traction motor; whether the
// wheels spin uselessly or bite the rail depends on DRIVE-AXLE LOAD, which the
// player changes through the suspension levelling valve (airNetwork
// 'suspension' branch) and the inspection counterweight trolley (Phase IV),
// and which the echo trace re-modulates in Phase VI.
//
//   energized && driveLoad <  adhesionLimit            -> 'spinning'
//   energized && driveLoad >= adhesionLimit            -> 'biting'
//   !energized                                         -> 'idle'
//
// Hysteresis: once biting, the wheels hold until driveLoad falls below
// adhesionLimit - adhesionHysteresis. No threshold flicker (lock §4).
//
// Current and wheel speed tell the story without words — Gate 0 correction:
// the earlier draft had this BACKWARDS. An unloaded motor draws LESS current,
// not more. The physics now reads:
//   idle     current ~ 0, wheelSpeed ~ 0
//   spinning wheel revs FREE (wheelSpeed high, sparks), car does not move,
//            current drops abnormally LOW (no load torque)
//   biting   wheel speed re-couples to car movement, sparks fade, traction
//            load pulls current HIGH, car moves
// Integration-layer visuals/audio (spark rate, motor pitch) must key off
// wheelState + wheelSpeed + current from snapshot() so the player is never
// taught the wrong feedback.
//
// Load mapping (setLoadInput): trolleyX in [0,1] shifts weight between the
// bogies; suspensionHealth in [0,1] (derived from the suspension branch
// pressure by the caller) scales how much of that shift actually reaches the
// drive axle. Constants are LOCKED by Phase IV (lock §11) and mirrored in the
// lock's Appendix A.
//
// Events:
//   'wheel-spin-start'  spinning began (one-shot per transition)
//   'wheel-bite'        wheels caught the rail
//   'car-move-complete' carDisplacement reached 1

export const MOTOR_ADHESION_DEFAULTS = Object.freeze({
  adhesionLimit: 0.55,
  adhesionHysteresis: 0.08,
  currentRampPerSec: 2,
  spinningCurrent: 0.35,
  bitingCurrent: 0.85,
  movePerSec: 0.25,
  wheelSpinUpPerSec: 3,
  // load = (loadBase + loadSpan * trolleyX) * (healthFloor + healthSpan * health)
  // PHASE IV LOCKED VALUES (lock §11 — Phase IV owns these): loadBase 0.1 /
  // loadSpan 0.5 means a fully charged suspension still needs trolleyX >= 0.9
  // to bite (0.1 + 0.5*0.9 = 0.55 = adhesionLimit), so the player must drive
  // the counterweight all the way over the drive bogie. Against the Phase III
  // vent floor (pressure 55 -> health 0.55) even trolleyX 1.0 tops out at
  // 0.6 * 0.775 = 0.465 — below the hysteresis floor — so a leaking or
  // half-fixed suspension can never be muscled through.
  loadBase: 0.1,
  loadSpan: 0.5,
  healthFloor: 0.5,
  healthSpan: 0.5,
  driveBogie: 'rear',
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function resolveNumber(config, key) {
  const raw = config?.[key];
  return typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : MOTOR_ADHESION_DEFAULTS[key];
}

export function createMotorAdhesion(config = {}) {
  const tuning = Object.freeze({
    adhesionLimit: resolveNumber(config, 'adhesionLimit'),
    adhesionHysteresis: Math.max(0, resolveNumber(config, 'adhesionHysteresis')),
    currentRampPerSec: Math.max(0.0001, resolveNumber(config, 'currentRampPerSec')),
    spinningCurrent: clamp01(resolveNumber(config, 'spinningCurrent')),
    bitingCurrent: clamp01(resolveNumber(config, 'bitingCurrent')),
    movePerSec: Math.max(0, resolveNumber(config, 'movePerSec')),
    wheelSpinUpPerSec: Math.max(0.0001, resolveNumber(config, 'wheelSpinUpPerSec')),
    loadBase: resolveNumber(config, 'loadBase'),
    loadSpan: resolveNumber(config, 'loadSpan'),
    healthFloor: clamp01(resolveNumber(config, 'healthFloor')),
    healthSpan: clamp01(resolveNumber(config, 'healthSpan')),
    driveBogie: config?.driveBogie === 'front' ? 'front' : 'rear',
  });

  let energized = false;
  let current = 0;
  let axleLoad = { front: 0.5, rear: 0.5 };
  let wheelState = 'idle';
  let wheelSpeed = 0;
  let carDisplacement = 0;
  let events = [];

  function setEnergized(next) {
    energized = Boolean(next);
  }

  function setAxleLoad(next) {
    if (!next || typeof next !== 'object') return;
    if (typeof next.front === 'number' && Number.isFinite(next.front)) {
      axleLoad.front = clamp01(next.front);
    }
    if (typeof next.rear === 'number' && Number.isFinite(next.rear)) {
      axleLoad.rear = clamp01(next.rear);
    }
  }

  // trolleyX: 0 = counterweight fully front, 1 = fully over the drive bogie.
  // suspensionHealth: 1 = bags fully pressurized, 0 = collapsed.
  function setLoadInput({ trolleyX, suspensionHealth } = {}) {
    const x = clamp01(typeof trolleyX === 'number' ? trolleyX : 0.5);
    const health = clamp01(typeof suspensionHealth === 'number' ? suspensionHealth : 1);
    const drive = (tuning.loadBase + tuning.loadSpan * x)
      * (tuning.healthFloor + tuning.healthSpan * health);
    const driveLoad = clamp01(drive);
    const otherLoad = clamp01(1 - driveLoad);
    if (tuning.driveBogie === 'rear') {
      axleLoad = { front: otherLoad, rear: driveLoad };
    } else {
      axleLoad = { front: driveLoad, rear: otherLoad };
    }
  }

  function driveLoad() {
    return axleLoad[tuning.driveBogie];
  }

  function update(dtMs) {
    const dt = Math.max(0, dtMs) / 1000;
    const previous = wheelState;

    if (!energized) {
      wheelState = 'idle';
      current = Math.max(0, current - tuning.currentRampPerSec * dt);
    } else if (wheelState === 'biting') {
      if (driveLoad() < tuning.adhesionLimit - tuning.adhesionHysteresis) {
        wheelState = 'spinning';
      }
    } else if (driveLoad() >= tuning.adhesionLimit) {
      wheelState = 'biting';
    } else {
      wheelState = 'spinning';
    }

    if (energized) {
      // Gate 0: spinning (unloaded) draws LESS current than biting (traction
      // load). Do not swap these back — the test suite locks the ordering.
      const target = wheelState === 'biting' ? tuning.bitingCurrent : tuning.spinningCurrent;
      const step = tuning.currentRampPerSec * dt;
      current = current < target
        ? Math.min(target, current + step)
        : Math.max(target, current - step);
    }

    // Wheel angular speed: free-revs while spinning, re-couples to car speed
    // once biting (car crawl rate), winds down when the move completes.
    const wheelTarget = wheelState === 'spinning'
      ? 1
      : wheelState === 'biting' && carDisplacement < 1
        ? tuning.movePerSec
        : 0;
    const wheelStep = tuning.wheelSpinUpPerSec * dt;
    wheelSpeed = wheelSpeed < wheelTarget
      ? Math.min(wheelTarget, wheelSpeed + wheelStep)
      : Math.max(wheelTarget, wheelSpeed - wheelStep);

    if (wheelState === 'biting' && carDisplacement < 1) {
      carDisplacement = Math.min(1, carDisplacement + tuning.movePerSec * dt);
      if (carDisplacement >= 1) {
        events.push({ type: 'car-move-complete' });
      }
    }

    if (wheelState !== previous) {
      if (wheelState === 'spinning') events.push({ type: 'wheel-spin-start' });
      if (wheelState === 'biting') events.push({ type: 'wheel-bite' });
    }
  }

  function snapshot() {
    return {
      energized,
      current,
      axleLoad: { ...axleLoad },
      driveBogie: tuning.driveBogie,
      adhesionLimit: tuning.adhesionLimit,
      wheelState,
      wheelSpeed,
      carDisplacement,
    };
  }

  function reset() {
    energized = false;
    current = 0;
    axleLoad = { front: 0.5, rear: 0.5 };
    wheelState = 'idle';
    wheelSpeed = 0;
    carDisplacement = 0;
    events = [];
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  return {
    setEnergized,
    setAxleLoad,
    setLoadInput,
    update,
    snapshot,
    reset,
    drainEvents,
  };
}
