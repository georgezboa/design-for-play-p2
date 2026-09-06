// Progression model for CAR 04 // THE BORROWED GRID.
// Pure logic, no Phaser. Tracks the current bay, per-bay completion, failure
// observation (for the one-sentence hint rule), fall respawns and full reset.

export function createProgression({ bays, respawns, start, goal, hints }) {
  const state = {
    bay: 'bay1',
    completed: new Set(),
    failureSeen: new Set(),
    hintShown: new Set(),
    falls: 0,
    resets: 0,
    goalOpen: false,
    complete: false,
    player: { x: start.x, y: start.y },
  };
  let events = [];

  function bayAt(x) {
    const b = bays.find((bb) => x >= bb.x0 && x < bb.x1);
    return b ? b.id : bays[bays.length - 1].id;
  }

  return {
    updatePlayer(x, y) {
      state.player = { x, y };
      const b = bayAt(x);
      if (b !== state.bay) {
        state.bay = b;
        events.push({ type: 'bay-entered', bay: b });
      }
      // Auto-complete bays whose exit line the player has crossed on foot or
      // by riding; bay-specific machinery completion is marked separately.
      if (!state.complete && state.goalOpen && x >= goal.completeX) {
        state.complete = true;
        events.push({ type: 'slice-complete' });
      }
    },
    markComplete(bayId) {
      if (!state.completed.has(bayId)) {
        state.completed.add(bayId);
        events.push({ type: 'bay-complete', bay: bayId });
      }
    },
    openGoal() {
      if (!state.goalOpen) {
        state.goalOpen = true;
        events.push({ type: 'goal-open' });
      }
    },
    seeFailure(bayId) {
      if (!state.failureSeen.has(bayId)) {
        state.failureSeen.add(bayId);
        events.push({ type: 'failure-seen', bay: bayId });
      }
    },
    // The one-sentence rule: a hint exists only after the failure has been
    // observed, and it is shown exactly once.
    requestHint(bayId) {
      if (!state.failureSeen.has(bayId) || state.hintShown.has(bayId)) return null;
      state.hintShown.add(bayId);
      events.push({ type: 'hint-shown', bay: bayId });
      return hints[bayId] || null;
    },
    fell() {
      state.falls += 1;
      const at = respawns[state.bay] || start;
      events.push({ type: 'player-fell', bay: state.bay, respawn: at });
      return { ...at };
    },
    bay() {
      return state.bay;
    },
    isComplete() {
      return state.complete;
    },
    snapshot() {
      return {
        bay: state.bay,
        completed: [...state.completed],
        failureSeen: [...state.failureSeen],
        hintShown: [...state.hintShown],
        falls: state.falls,
        resets: state.resets,
        goalOpen: state.goalOpen,
        complete: state.complete,
        player: { ...state.player },
      };
    },
    drainEvents() {
      const out = events;
      events = [];
      return out;
    },
    reset() {
      state.bay = 'bay1';
      state.completed.clear();
      state.failureSeen.clear();
      state.hintShown.clear();
      state.falls = 0;
      state.resets += 1;
      state.goalOpen = false;
      state.complete = false;
      state.player = { x: start.x, y: start.y };
      events.push({ type: 'progression-reset' });
      return { ...start };
    },
  };
}
