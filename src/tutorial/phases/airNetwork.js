// Shared air network — PROLOGUE III–VI SYSTEM ARC LOCK §2.1.
// Pure logic: no Phaser, no DOM, no rendering.
//
// Topology is PARALLEL (Gate 0 correction — the serial "door -> suspension ->
// brake" reading of an earlier diagram was wrong and is forbidden):
//
//   compressor / main reservoir / supply header
//     ├─ door branch        -> ISOLATE -> BLEED -> door cylinder
//     ├─ suspension branch  -> levelling valve -> air springs
//     └─ brake branch       -> cutout / control valve -> brake actuators
//
// The three branches share the reservoir but hold INDEPENDENT pressure,
// isolation valve, vent state and actuator. Operating one branch never
// serially drives another; only a reservoir-level change may move several
// un-isolated branches at once (see setReservoirPressure).
//
// One physical model serves Phase III (door branch), Phase IV (suspension
// branch) and Phase V/VI (brake branch). Per the lock, no stage may copy a
// private pressure state: pressures, valves and vents live here only.
//
// Model (per branch):
//   venting && !isolated  -> pressure sinks toward the supply-equilibrium
//                            floor min(ventOpenFloor, reservoir) but never
//                            below it: a small bleed orifice on a live supply
//                            line cannot pull line pressure into the release
//                            band. This IS the Phase III lesson.
//   venting && isolated   -> pressure drains toward 0 at ventRatePerSec.
//   !venting && !isolated -> pressure recovers toward the CURRENT reservoir
//                            pressure at supplyRatePerSec.
//   !venting && isolated  -> sealed: pressure holds, immune to reservoir
//                            changes.
//
// Door-latch consumer (Phase III) uses hysteresis: the cylinder retracts and
// the latch releases when pressure < releaseThreshold, and the latch only
// re-engages after pressure climbs back above reengageThreshold. Absolute
// zero is never required (lock §3).
//
// Numbers are LOCKED by tests/tutorial/airNetwork.test.mjs (lock §11): the
// vent floor must sit above the re-engage threshold so that venting an open
// branch can never keep the latch released, and the isolated vent time from
// full pressure to release must stay a readable long-hold, not a tap.
//
// Events:
//   'door-latch-released'   pressure crossed below releaseThreshold
//   'door-latch-reengaged'  pressure climbed back above reengageThreshold
//   'branch-isolated'       { branch } valve closed
//   'branch-restored'       { branch } valve opened
//   'reservoir-changed'     { pressure } header pressure write point moved

export const AIR_NETWORK_DEFAULTS = Object.freeze({
  reservoirPressure: 100,
  supplyRatePerSec: 14,
  ventRatePerSec: 55,
  // Supply-equilibrium floor while bleeding an un-isolated branch. Must stay
  // strictly above reengageThreshold (see tests).
  ventOpenFloor: 55,
  releaseThreshold: 30,
  reengageThreshold: 45,
});

const BRANCH_IDS = Object.freeze(['door', 'suspension', 'brake']);

function resolveNumber(config, key) {
  const raw = config?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0
    ? raw
    : AIR_NETWORK_DEFAULTS[key];
}

function makeBranch() {
  return { pressure: AIR_NETWORK_DEFAULTS.reservoirPressure, isolated: false, venting: false };
}

export function createAirNetwork(config = {}) {
  const tuning = Object.freeze({
    reservoirPressure: resolveNumber(config, 'reservoirPressure'),
    supplyRatePerSec: resolveNumber(config, 'supplyRatePerSec'),
    ventRatePerSec: resolveNumber(config, 'ventRatePerSec'),
    ventOpenFloor: resolveNumber(config, 'ventOpenFloor'),
    releaseThreshold: resolveNumber(config, 'releaseThreshold'),
    reengageThreshold: resolveNumber(config, 'reengageThreshold'),
  });

  const branches = {
    door: { ...makeBranch(), pressure: tuning.reservoirPressure },
    suspension: { ...makeBranch(), pressure: tuning.reservoirPressure },
    brake: { ...makeBranch(), pressure: tuning.reservoirPressure },
  };

  // The reservoir is a live write point, not a constant: dropping the header
  // pressure is the ONLY operation that may move several un-isolated branches
  // at once. Sealed (isolated) branches are immune.
  let reservoirPressure = tuning.reservoirPressure;
  let doorLatchReleased = false;
  let events = [];

  function isBranch(id) {
    return BRANCH_IDS.includes(id);
  }

  function setReservoirPressure(next) {
    if (typeof next !== 'number' || !Number.isFinite(next)) return false;
    const clamped = Math.min(tuning.reservoirPressure, Math.max(0, next));
    if (clamped === reservoirPressure) return true;
    reservoirPressure = clamped;
    events.push({ type: 'reservoir-changed', pressure: reservoirPressure });
    return true;
  }

  function setIsolated(id, isolated) {
    if (!isBranch(id)) return false;
    const branch = branches[id];
    const next = Boolean(isolated);
    if (branch.isolated === next) return true;
    branch.isolated = next;
    events.push({ type: next ? 'branch-isolated' : 'branch-restored', branch: id });
    return true;
  }

  function setVenting(id, venting) {
    if (!isBranch(id)) return false;
    branches[id].venting = Boolean(venting);
    return true;
  }

  function update(dtMs) {
    const dt = Math.max(0, dtMs) / 1000;
    const ventFloor = Math.min(tuning.ventOpenFloor, reservoirPressure);
    for (const id of BRANCH_IDS) {
      const branch = branches[id];
      if (branch.venting) {
        if (branch.isolated) {
          branch.pressure = Math.max(0, branch.pressure - tuning.ventRatePerSec * dt);
        } else {
          branch.pressure = Math.max(
            ventFloor,
            branch.pressure - tuning.ventRatePerSec * dt,
          );
        }
      } else if (!branch.isolated) {
        if (branch.pressure < reservoirPressure) {
          branch.pressure = Math.min(
            reservoirPressure,
            branch.pressure + tuning.supplyRatePerSec * dt,
          );
        } else if (branch.pressure > reservoirPressure) {
          // Header dropped below branch pressure: the branch equalises back
          // down through the open supply line (slower than a bleed orifice).
          branch.pressure = Math.max(
            reservoirPressure,
            branch.pressure - tuning.supplyRatePerSec * dt,
          );
        }
      }
      // sealed: isolated and not venting -> pressure holds.
    }

    const doorPressure = branches.door.pressure;
    if (!doorLatchReleased && doorPressure < tuning.releaseThreshold) {
      doorLatchReleased = true;
      events.push({ type: 'door-latch-released' });
    } else if (doorLatchReleased && doorPressure > tuning.reengageThreshold) {
      doorLatchReleased = false;
      events.push({ type: 'door-latch-reengaged' });
    }
  }

  function flowOf(branch) {
    if (branch.venting) return 'vent';
    if (branch.isolated) return 'sealed';
    return 'supply';
  }

  function snapshot() {
    const out = { reservoirPressure, branches: {} };
    for (const id of BRANCH_IDS) {
      const branch = branches[id];
      out.branches[id] = {
        pressure: branch.pressure,
        isolated: branch.isolated,
        venting: branch.venting,
        flow: flowOf(branch),
      };
    }
    out.doorLatch = { released: doorLatchReleased };
    out.tuning = tuning;
    return out;
  }

  function reset() {
    reservoirPressure = tuning.reservoirPressure;
    for (const id of BRANCH_IDS) {
      branches[id].pressure = tuning.reservoirPressure;
      branches[id].isolated = false;
      branches[id].venting = false;
    }
    doorLatchReleased = false;
    events = [];
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  return {
    update,
    setIsolated,
    setVenting,
    setReservoirPressure,
    snapshot,
    reset,
    drainEvents,
  };
}
