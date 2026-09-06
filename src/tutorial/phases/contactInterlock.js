// Phase II — door-latch / relay-cabinet / power-contactor interlock.
// Pure logic: no Phaser, no DOM, no rendering. The player closes a physical
// latch, a signal propagates along the copper trace to the mid-car relay
// cabinet, WAITS there until the relay is bridged, then propagates on to the
// contactor; only then can POWER close the contactor and deliver traction.
//
// Three-segment propagation (PHASE_II_RELAY_CABINET work package §4.2):
//   preRelay  latch x=850 -> relay x≈1195, takes propagationMs * relaySplit
//   waiting   signal holds at the cabinet mouth until isRelaySolved() is true
//   postRelay relay x≈1195 -> contactor x=1440, takes propagationMs * (1 - relaySplit)
// `signalProgress` survives as a derived compatibility field: the weighted
// whole-run progress (preRelayProgress * relaySplit + postRelayProgress *
// (1 - relaySplit)). With no relay hook wired (legacy standalone use) the two
// segments run back-to-back and signalProgress advances exactly like the old
// single-segment trace — same total time, same numbers.
//
// `isRelaySolved` is an injectable dependency, not an import: the pure module
// never reaches into relayCabinet.js. Once the hook reports solved the fact
// is latched (`relayBridged`) — a later unsolve cannot rewind the trace; only
// reset() (room exit / explicit replay) unwires both machines together.
//
// `isProgressHeld` (optional, injectable): while it reports true the bridge
// latch and the post-relay segment are HELD — the pre-relay segment keeps its
// existing semantics and advances normally, but update() will neither latch
// relayBridged nor advance postRelayProgress, so trace-energized cannot fire.
// The integration layer wires this to the close-up lifecycle so the post
// segment never runs ahead of the exit beat (work package §3.4.6: the trace
// must light in world view, after the camera is back). Default null = never
// held, every legacy and relay-mode number unchanged.
//
// POWER fault taxonomy (internal only — never shown as answer text):
//   'open-circuit'      latch not closed
//   'relay-open'        signal arrived at the cabinet, relay not bridged yet
//   'signal-in-transit' either segment still moving
//
// Events added for the three-segment world:
//   'trace-reached-relay'  one-shot when the pre-relay segment first completes
//                          (only emitted when a relay hook is wired; legacy
//                          standalone mode has no cabinet to reach).

export const CONTACT_INTERLOCK_DEFAULTS = Object.freeze({
  propagationMs: 550,
  // Locked geometry (WAVE_3 spec §1 + relay work package): latch 850, relay
  // 1195, contactor 1440 -> pre segment weight (1195-850)/(1440-850).
  relaySplit: 345 / 590,
});

const VALID_TARGETS = Object.freeze(new Set(['latch', 'power']));

function makeEntryState(relayMode) {
  return {
    entered: false,
    destroyed: false,
    latchClosed: false,
    preRelayProgress: 0,
    // No relay in the circuit (legacy standalone mode) reads as already
    // bridged: relayWaiting is never true and no trace-reached-relay fires.
    relayBridged: !relayMode,
    postRelayProgress: 0,
    circuitEnergized: false,
    contactorClosed: false,
    powerDelivered: false,
    complete: false,
    lastFault: null,
    traceReachedRelayEventFired: false,
    traceEnergizedEventFired: false,
  };
}

function resolvePropagationMs(config) {
  const raw = config?.propagationMs;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return CONTACT_INTERLOCK_DEFAULTS.propagationMs;
}

function resolveRelaySplit(config) {
  const raw = config?.relaySplit;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0 && raw < 1) {
    return raw;
  }
  return CONTACT_INTERLOCK_DEFAULTS.relaySplit;
}

export function createContactInterlock(config = {}) {
  const propagationMs = resolvePropagationMs(config);
  const relaySplit = resolveRelaySplit(config);
  // Relay mode activates only when the caller wires a real hook. The default
  // keeps the module standalone-usable with the legacy single-run behaviour.
  const isRelaySolvedHook = typeof config?.isRelaySolved === 'function'
    ? config.isRelaySolved
    : null;
  // Optional hold gate (close-up exit beat): never reached into when absent.
  const isProgressHeldHook = typeof config?.isProgressHeld === 'function'
    ? config.isProgressHeld
    : null;
  const relayMode = isRelaySolvedHook !== null;
  let state = makeEntryState(relayMode);
  const events = [];

  function pushEvent(type, payload = {}) {
    events.push({ type, ...payload });
  }

  function progressHeldNow() {
    return isProgressHeldHook?.() === true;
  }

  function relayWaitingNow() {
    return state.latchClosed
      && state.preRelayProgress >= 1
      && !state.relayBridged
      && !state.circuitEnergized;
  }

  function snapshotInternal() {
    const preRelayProgress = state.preRelayProgress;
    const postRelayProgress = state.postRelayProgress;
    return {
      entered: state.entered,
      destroyed: state.destroyed,
      latchClosed: state.latchClosed,
      preRelayProgress,
      relayWaiting: relayWaitingNow(),
      relayBridged: state.relayBridged,
      postRelayProgress,
      // Derived compatibility field: weighted whole-run progress.
      signalProgress:
        preRelayProgress * relaySplit + postRelayProgress * (1 - relaySplit),
      circuitEnergized: state.circuitEnergized,
      contactorClosed: state.contactorClosed,
      powerDelivered: state.powerDelivered,
      complete: state.complete,
      lastFault: state.lastFault,
    };
  }

  const api = {
    enter(context = {}) {
      if (state.destroyed) return api;
      if (state.entered) {
        // Re-entering must not stack or duplicate state.
        return api;
      }
      state.entered = true;
      return api;
    },

    update(deltaMs) {
      if (state.destroyed) return api;
      if (typeof deltaMs !== 'number' || !Number.isFinite(deltaMs)) {
        return api;
      }
      if (deltaMs < 0) {
        return api;
      }

      if (state.latchClosed && !state.circuitEnergized) {
        const preMs = propagationMs * relaySplit;
        const postMs = propagationMs * (1 - relaySplit);
        let remaining = deltaMs;

        // Segment 1: latch -> relay cabinet mouth. Leftover delta carries
        // over into the post segment when the relay is already bridged, so a
        // single large update() still reproduces the legacy one-shot advance.
        if (state.preRelayProgress < 1) {
          const used = Math.min((1 - state.preRelayProgress) * preMs, remaining);
          state.preRelayProgress += used / preMs;
          remaining -= used;
          // FP tolerance: a full-length advance must land exactly on the seam.
          if (state.preRelayProgress >= 1 - 1e-9) {
            state.preRelayProgress = 1;
            if (relayMode && !state.traceReachedRelayEventFired) {
              state.traceReachedRelayEventFired = true;
              pushEvent('trace-reached-relay', snapshotInternal());
            }
          }
        }

        // The waiting segment: the signal holds at the cabinet until the
        // relay is bridged. Poll the hook every update and latch the result —
        // once bridged, the trace never unwinds short of reset(). While the
        // integration layer holds progress (close-up exit beat) the latch is
        // deferred so the post segment cannot run ahead of the camera.
        if (!state.relayBridged && !progressHeldNow() && isRelaySolvedHook?.() === true) {
          state.relayBridged = true;
        }

        // Segment 2: relay cabinet -> contactor. Runs only while bridged.
        if (state.relayBridged && state.postRelayProgress < 1 && remaining > 0) {
          const used = Math.min((1 - state.postRelayProgress) * postMs, remaining);
          state.postRelayProgress += used / postMs;
          remaining -= used;
          // FP tolerance: a full-length advance must energize, not stall at
          // 0.999… one epsilon short of the contactor.
          if (state.postRelayProgress >= 1 - 1e-9) {
            state.postRelayProgress = 1;
            state.circuitEnergized = true;
            if (!state.traceEnergizedEventFired) {
              state.traceEnergizedEventFired = true;
              pushEvent('trace-energized', snapshotInternal());
            }
          }
        }
      } else if (!state.relayBridged && !progressHeldNow() && isRelaySolvedHook?.() === true) {
        // Relay bridged before the latch ever closed (player opened the case
        // first): latch the fact so the trace runs straight through later.
        state.relayBridged = true;
      }

      return api;
    },

    interact(target) {
      if (state.destroyed) {
        return { accepted: false, reason: 'destroyed', complete: false };
      }
      if (!VALID_TARGETS.has(target)) {
        return { accepted: false, reason: 'unknown-target', complete: false };
      }

      if (target === 'latch') {
        const wasClosed = state.latchClosed;
        state.latchClosed = true;
        state.lastFault = null;
        if (!wasClosed) {
          state.preRelayProgress = 0;
          state.postRelayProgress = 0;
          pushEvent('latch-reset', snapshotInternal());
          pushEvent('trace-started', snapshotInternal());
        }
        return { accepted: true, reason: null, complete: state.complete };
      }

      // target === 'power'
      if (!state.latchClosed) {
        state.lastFault = 'open-circuit';
        pushEvent('contactor-bounce', snapshotInternal());
        return { accepted: false, reason: 'open-circuit', complete: false };
      }

      if (relayWaitingNow()) {
        // The signal is parked at the cabinet mouth: the relay case is the
        // open point now. Internal reason only — the world never prints it.
        state.lastFault = 'relay-open';
        pushEvent('contactor-bounce', snapshotInternal());
        return { accepted: false, reason: 'relay-open', complete: false };
      }

      if (!state.circuitEnergized) {
        state.lastFault = 'signal-in-transit';
        pushEvent('contactor-bounce', snapshotInternal());
        return { accepted: false, reason: 'signal-in-transit', complete: false };
      }

      if (!state.contactorClosed) {
        state.lastFault = null;
        state.contactorClosed = true;
        state.powerDelivered = true;
        state.complete = true;
        pushEvent('contactor-closed', snapshotInternal());
        pushEvent('traction-enabled', snapshotInternal());
      }

      return { accepted: true, reason: null, complete: true };
    },

    reset() {
      const wasDestroyed = state.destroyed;
      state = makeEntryState(relayMode);
      events.length = 0;
      state.destroyed = wasDestroyed;
      return api;
    },

    snapshot() {
      return { ...snapshotInternal() };
    },

    isComplete() {
      return state.complete;
    },

    destroy() {
      state.destroyed = true;
      events.length = 0;
      return api;
    },

    drainEvents() {
      return events.splice(0, events.length);
    },
  };

  return api;
}
