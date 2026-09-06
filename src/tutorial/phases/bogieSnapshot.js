// Shared bogie snapshot — SYSTEM ARC LOCK §2.3.
// Pure logic: no Phaser, no DOM, no rendering.
//
// One bogie = one position on the force-transmission chain. The snapshot is
// derived from the SAME shared systems every stage reads (airNetwork brake
// branch + motorAdhesion), so Phase V's "contradictory evidence" can never be
// a staged fake: on the faulty side every upstream signal is genuinely
// normal and the axle genuinely does not turn.
//
// Railway brake physics (fail-safe air brake, Gate 0 locked semantics — do
// NOT mix conventions): the release line is pressurised to RELEASE the brake;
// loss of pressure means the brake clamps (springs apply it). Therefore a
// de-pressurised actuator is a CLAMPED actuator, and low pressure alone is
// never a safe-work condition.
//
// Safe repair chain (Phase V sequence, taught by spatial layout, not text):
//   1. isolate the local branch        (branchIsolated)
//   2. vent it below safeRepairPressure
//   3. insert the visible MECHANICAL SERVICE LOCK (serviceLockEngaged) —
//      a steel pin that physically bars the brake linkage; the integration
//      layer MUST draw the pin sliding in and the linkage becoming barred.
//      An invisible boolean is forbidden (Gate 0).
//   4. only then may repair() unjam the pin / actuator
//   5. removeServiceLock() -> restore supply -> TEST
//
// The service lock has its own mechanical interlock: engageServiceLock()
// refuses while the branch is live or pressurised — the pin cannot seat
// against a charged actuator.
//
// repair() requires ALL THREE: branchIsolated && branchPressure <
// safeRepairPressure && serviceLockEngaged.
//
// Local fault kinds — all three present identically upstream (pressure,
// current, load normal) and differ only in where the chain breaks:
//   'brake-actuator-seized'  actuator piston stuck
//   'cutoff-valve-closed'    local cock closed, pressure never reaches it
//   'mechanical-pin'         rigging pin jammed
//
// wheelTurning requires the whole chain: contactor closed, brake released,
// and the shared adhesion model actually biting.
//
// Events:
//   'brake-released'        brake let go (one-shot per transition)
//   'brake-applied'         brake bit again
//   'service-lock-engaged'  mechanical lock pin seated
//   'service-lock-removed'  mechanical lock pin withdrawn
//   'bogie-repaired'        repair() succeeded under safe conditions

export const BOGIE_DEFAULTS = Object.freeze({
  brakeReleasePressure: 60,
  safeRepairPressure: 20,
});

const FAULT_KINDS = Object.freeze([
  'brake-actuator-seized',
  'cutoff-valve-closed',
  'mechanical-pin',
]);

function resolveNumber(config, key) {
  const raw = config?.[key];
  return typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : BOGIE_DEFAULTS[key];
}

export function createBogie(config = {}) {
  const tuning = Object.freeze({
    brakeReleasePressure: resolveNumber(config, 'brakeReleasePressure'),
    safeRepairPressure: resolveNumber(config, 'safeRepairPressure'),
  });
  const id = config?.id === 'front' ? 'front' : 'rear';

  let fault = FAULT_KINDS.includes(config?.fault) ? config.fault : null;
  let repaired = false;
  let serviceLockEngaged = false;
  let brakeReleased = false;
  let events = [];

  function setFault(kind) {
    fault = FAULT_KINDS.includes(kind) ? kind : null;
    if (fault) repaired = false;
  }

  function branchIsSafe({ branchIsolated, branchPressure } = {}) {
    return Boolean(branchIsolated)
      && typeof branchPressure === 'number'
      && branchPressure < tuning.safeRepairPressure;
  }

  // The mechanical service lock has its own interlock: the pin cannot seat
  // against a live or charged actuator.
  function engageServiceLock(branchState = {}) {
    if (serviceLockEngaged) return true;
    if (!branchIsSafe(branchState)) return false;
    serviceLockEngaged = true;
    events.push({ type: 'service-lock-engaged', id });
    return true;
  }

  function removeServiceLock() {
    if (!serviceLockEngaged) return false;
    serviceLockEngaged = false;
    events.push({ type: 'service-lock-removed', id });
    return true;
  }

  // Gate 0 locked repair conditions: isolated AND vented AND mechanically
  // locked. Anything less is a refusal, not an error.
  function repair(branchState = {}) {
    if (!fault || repaired) return false;
    if (!branchIsSafe(branchState)) return false;
    if (!serviceLockEngaged) return false;
    repaired = true;
    events.push({ type: 'bogie-repaired', id });
    return true;
  }

  function isRepaired() {
    return repaired;
  }

  // motorSnap: motorAdhesion.snapshot(); brakeLinePressure: number (0..100).
  function update(_dtMs, { motorSnap, brakeLinePressure } = {}) {
    const pressure = typeof brakeLinePressure === 'number' ? brakeLinePressure : 0;
    const jammed = fault !== null && !repaired;
    const next = !jammed && pressure >= tuning.brakeReleasePressure;
    if (next !== brakeReleased) {
      brakeReleased = next;
      events.push({ type: next ? 'brake-released' : 'brake-applied', id });
    }
  }

  function snapshot({ motorSnap, brakeLinePressure } = {}) {
    const pressure = typeof brakeLinePressure === 'number' ? brakeLinePressure : 0;
    const contactorClosed = Boolean(motorSnap?.energized);
    const current = typeof motorSnap?.current === 'number' ? motorSnap.current : 0;
    const axleLoad = typeof motorSnap?.axleLoad?.[id] === 'number'
      ? motorSnap.axleLoad[id]
      : 0;
    const wheelTurning = contactorClosed
      && brakeReleased
      && motorSnap?.wheelState === 'biting';
    return {
      id,
      contactorClosed,
      current,
      linePressure: pressure,
      axleLoad,
      brakeReleased,
      wheelTurning,
      fault,
      repaired,
      serviceLockEngaged,
    };
  }

  function reset() {
    repaired = false;
    serviceLockEngaged = false;
    brakeReleased = false;
    events = [];
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  return {
    id,
    setFault,
    engageServiceLock,
    removeServiceLock,
    repair,
    isRepaired,
    update,
    snapshot,
    reset,
    drainEvents,
  };
}
