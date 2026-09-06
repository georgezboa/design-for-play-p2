import {
  CHAPTER05_DIRECTIONS,
  DIRECTION_ORDER,
  PLAYABLE_DIRECTION_ORDER,
  isDirectionId,
  isDirectionPlayable,
} from '../directions/directionRegistry.js';

export const ARTIFACT_DIRECTIONS = Object.freeze([
  CHAPTER05_DIRECTIONS.LABYRINTH,
  CHAPTER05_DIRECTIONS.BORROWED_GRID,
  CHAPTER05_DIRECTIONS.ECHO_CITY,
  CHAPTER05_DIRECTIONS.PAINTED_COUNTRY,
]);

export function isArtifactDirection(id) {
  return ARTIFACT_DIRECTIONS.includes(id);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDirectionProgressState(seed = {}) {
  const completed = Object.fromEntries(DIRECTION_ORDER.map((id) => [id, false]));
  for (const id of DIRECTION_ORDER) completed[id] = seed.completed?.[id] === true;
  const artifacts = Object.fromEntries(ARTIFACT_DIRECTIONS.map((id) => [id, {
    taken: false,
    displayed: true,
  }]));
  return {
    activeDirection: null,
    carriedArtifact: seed.carriedArtifact && isArtifactDirection(seed.carriedArtifact) ? seed.carriedArtifact : null,
    artifacts,
    completed,
    completedCount: PLAYABLE_DIRECTION_ORDER.filter((id) => completed[id]).length,
    allComplete: PLAYABLE_DIRECTION_ORDER.every((id) => completed[id]),
  };
}

export function reduceDirectionProgress(previous, action) {
  const state = clone(previous);
  const events = [];
  const reject = (reason) => ({ state: previous, events: [{ type: 'direction.rejected', payload: { reason } }] });

  if (action.type === 'direction.open') {
    if (!isDirectionId(action.id)) return reject('unknown direction');
    if (!isDirectionPlayable(action.id)) return reject('direction is sealed');
    if (state.activeDirection) return reject('another direction is already open');
    state.activeDirection = action.id;
    events.push({ type: 'direction.opened', payload: { id: action.id } });
  } else if (action.type === 'direction.close') {
    if (!state.activeDirection) return reject('no direction is open');
    const id = state.activeDirection;
    state.activeDirection = null;
    events.push({ type: 'direction.closed', payload: { id } });
  } else if (action.type === 'direction.complete') {
    if (!isDirectionId(action.id)) return reject('unknown direction');
    if (!isDirectionPlayable(action.id)) return reject('direction is sealed');
    if (!state.completed[action.id]) {
      state.completed[action.id] = true;
      events.push({ type: 'direction.completed', payload: { id: action.id } });
    }
    state.completedCount = PLAYABLE_DIRECTION_ORDER.filter((id) => state.completed[id]).length;
    state.allComplete = state.completedCount === PLAYABLE_DIRECTION_ORDER.length;
    if (state.allComplete && !previous.allComplete) events.push({ type: 'directions.allComplete' });
  } else if (action.type === 'artifact.take') {
    if (!isArtifactDirection(action.id)) return reject('unknown artifact');
    return reject('gallery artifacts are pre-displayed and cannot be carried');
  } else if (action.type === 'artifact.display') {
    if (!isArtifactDirection(action.id)) return reject('unknown artifact');
    return reject('gallery artifacts are already displayed');
  } else {
    return reject('unknown action');
  }

  state.completedCount = PLAYABLE_DIRECTION_ORDER.filter((id) => state.completed[id]).length;
  state.allComplete = state.completedCount === PLAYABLE_DIRECTION_ORDER.length;
  if (state.allComplete && !previous.allComplete && !events.some((event) => event.type === 'directions.allComplete')) {
    events.push({ type: 'directions.allComplete' });
  }
  return { state, events };
}

export class Chapter05DirectionProgress {
  constructor(seed) {
    this._state = createDirectionProgressState(seed);
    this._listeners = new Set();
  }

  getSnapshot() {
    return clone(this._state);
  }

  dispatch(action) {
    const result = reduceDirectionProgress(this._state, action);
    this._state = result.state;
    for (const listener of this._listeners) listener(this.getSnapshot(), result.events);
    return result;
  }

  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}
