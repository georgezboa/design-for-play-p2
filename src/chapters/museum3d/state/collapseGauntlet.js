export const COLLAPSE_KEY_TOTAL = 8;
export const COLLAPSE_MAX_HITS = 3;
export const COLLAPSE_SLOT_SECONDS = 0.6;
export const COLLAPSE_ENTRY = Object.freeze({ x: 14.8, z: 0, yaw: -Math.PI / 2 });
export const COLLAPSE_DOOR_PRESSURE_X = 38.75;
export const COLLAPSE_THRESHOLD = Object.freeze({ x: 41.25, halfWidth: 1.3, doorOpenAmount: 0.82 });
export const COLLAPSE_BLACK_HOLD_MS = 1200;
export const COLLAPSE_CHAPTER06_DELAY_MS = 2400;
// Chapter 5's authored collapse is the 5→6 transition. The black threshold
// therefore lands directly in the production Conductor encounter, never in
// the superseded Chapter 6 fusion-spine greybox.
export const COLLAPSE_CHAPTER06_ROUTE = '/final-boss.html?from=chapter5';

export const COLLAPSE_ZONES = Object.freeze([
  Object.freeze({ id: 'zone-i', minX: 8, maxX: 20, label: 'SETTLING' }),
  Object.freeze({ id: 'zone-ii', minX: 20, maxX: 32, label: 'BREACH' }),
  Object.freeze({ id: 'zone-iii', minX: 32, maxX: 42, label: 'COLLAPSE' }),
]);

export const COLLAPSE_STRINGS = Object.freeze({
  exitDoorPlaqueLocked: 'FINAL ARCHIVE — EIGHT RECORDS, ONE DOOR',
  exitDoorPlaqueOpen: 'FINAL ARCHIVE — THE RECORD ADMITS ITS KEEPER',
  exitDoorSealedNote: 'Eight keyholes. The museum hid its own keys in the basement and sealed the stairs behind them.',
  keyRingCaption: 'YOU WALKED OUT WITH EVERY KEY. The door at the end of the corridor is counting.',
  archivistCollapse: 'THIS WING IS BEING WITHDRAWN. PROCEED TO THE FINAL ARCHIVE.',
  promptSlotKey: '[E] HOLD TO SLOT THE KEYS',
  promptJump: '[E] STEP THROUGH',
  deathLine: 'The archive catches you. It files you back at the beginning of the hall.',
  completeLine: 'You filed nothing. You kept everything.',
  chapterComplete: 'CHAPTER 5 COMPLETE — THE MUSEUM OF ONE ANSWER',
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createCollapseState(seed = {}) {
  const keysSlotted = Math.max(0, Math.min(COLLAPSE_KEY_TOTAL, Number(seed.keysSlotted) || 0));
  const started = seed.started === true;
  return {
    started,
    zoneReached: Number.isInteger(seed.zoneReached) ? Math.max(0, Math.min(3, seed.zoneReached)) : 0,
    hitsTaken: Math.max(0, Math.min(COLLAPSE_MAX_HITS - 1, Number(seed.hitsTaken) || 0)),
    totalHitsTaken: Math.max(0, Number(seed.totalHitsTaken) || 0),
    deaths: Math.max(0, Number(seed.deaths) || 0),
    runId: Math.max(1, Number(seed.runId) || 1),
    labyrinthKeys: started ? COLLAPSE_KEY_TOTAL - keysSlotted : 0,
    keysSlotted,
    doorOpen: started && (seed.doorOpen === true || keysSlotted === COLLAPSE_KEY_TOTAL),
    jumped: seed.jumped === true,
    completed: seed.completed === true,
  };
}

export function reduceCollapse(previous, action) {
  const state = clone(previous);
  const events = [];
  const reject = (reason) => ({ state: previous, events: [{ type: 'collapse.rejected', payload: { reason } }] });

  if (action.type === 'collapse.start') {
    if (state.started) return reject('collapse already started');
    Object.assign(state, createCollapseState({ started: true }));
    events.push({ type: 'collapse.started' });
    events.push({ type: 'collapse.keysGranted', payload: { count: COLLAPSE_KEY_TOTAL } });
  } else if (action.type === 'collapse.reachZone') {
    if (!state.started || state.completed) return reject('collapse is not active');
    const zone = Number(action.zone);
    if (!Number.isInteger(zone) || zone < 1 || zone > 3) return reject('unknown collapse zone');
    if (zone <= state.zoneReached) return { state: previous, events: [] };
    state.zoneReached = zone;
    events.push({ type: 'collapse.zoneReached', payload: { zone } });
  } else if (action.type === 'collapse.hit') {
    if (!state.started || state.completed) return reject('collapse is not active');
    state.hitsTaken += 1;
    state.totalHitsTaken += 1;
    events.push({ type: 'collapse.hitTaken', payload: { hitsTaken: state.hitsTaken } });
    if (state.hitsTaken >= COLLAPSE_MAX_HITS) {
      state.hitsTaken = 0;
      state.deaths += 1;
      state.runId += 1;
      events.push({
        type: 'collapse.playerDied',
        payload: { deaths: state.deaths, keysSlotted: state.keysSlotted },
      });
    }
  } else if (action.type === 'collapse.slotKey') {
    if (!state.started || state.completed) return reject('collapse is not active');
    if (state.doorOpen || state.labyrinthKeys <= 0) return reject('no key remains to slot');
    state.keysSlotted += 1;
    state.labyrinthKeys -= 1;
    events.push({
      type: 'collapse.keySlotted',
      payload: { keysSlotted: state.keysSlotted, labyrinthKeys: state.labyrinthKeys },
    });
    if (state.keysSlotted === COLLAPSE_KEY_TOTAL) {
      state.doorOpen = true;
      events.push({ type: 'collapse.doorOpened' });
    }
  } else if (action.type === 'collapse.jump') {
    if (!state.started || !state.doorOpen) return reject('the Final Archive door is still locked');
    if (state.completed) return reject('chapter already complete');
    state.jumped = true;
    state.completed = true;
    events.push({ type: 'collapse.jumped' });
    events.push({ type: 'collapse.completed' });
  } else {
    return reject('unknown collapse action');
  }

  return { state, events };
}
