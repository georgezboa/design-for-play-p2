const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const PARKOUR_WIDTH = 8100;
export const PARKOUR_HEIGHT = 720;

export const MOVABLE_DEFS = Object.freeze([
  {
    id: 'ladder-a',
    kind: 'ladder',
    startX: 550,
    y: 260,
    width: 48,
    height: 180,
    minX: 550,
    maxX: 735,
    dismountDirection: 1,
  },
  {
    id: 'block-a',
    kind: 'block',
    startX: 180,
    y: 509,
    width: 62,
    height: 62,
    minX: 180,
    maxX: 430,
  },
  {
    id: 'ladder-b',
    kind: 'ladder',
    startX: 2500,
    y: 305,
    width: 48,
    height: 170,
    minX: 2350,
    maxX: 2765,
    dismountDirection: 1,
  },
  {
    id: 'block-b',
    kind: 'block',
    startX: 4070,
    y: 269,
    width: 62,
    height: 62,
    minX: 4040,
    maxX: 4145,
  },
  {
    id: 'ladder-c',
    kind: 'ladder',
    startX: 4380,
    y: 270,
    width: 48,
    height: 180,
    minX: 4380,
    maxX: 4690,
    dismountDirection: 1,
  },
  {
    id: 'block-c',
    kind: 'block',
    startX: 5580,
    y: 229,
    width: 62,
    height: 62,
    minX: 5580,
    maxX: 5850,
  },
  {
    id: 'ladder-d',
    kind: 'ladder',
    startX: 6680,
    y: 170,
    width: 48,
    height: 180,
    minX: 6680,
    maxX: 6950,
    dismountDirection: 1,
  },
  {
    id: 'block-d',
    kind: 'block',
    startX: 7420,
    y: 329,
    width: 62,
    height: 62,
    minX: 7420,
    maxX: 7710,
  },
]);

export const FLYING_CAR_DEFS = Object.freeze([
  {
    id: 'car-a',
    minX: 1100,
    // Drive well onto the next roof. The old endpoint only grazed its edge,
    // which made the first airborne transfer unreliable in the desktop build.
    maxX: 1700,
    startX: 1100,
    y: 180,
    width: 132,
    height: 30,
    speed: 82,
    startDirection: 1,
  },
  {
    id: 'car-b',
    minX: 3780,
    // The second transfer must carry the rider well onto the POWER roof.
    // 3940 only touched its x=4000 edge; this leaves a forgiving landing area.
    maxX: 4120,
    startX: 3780,
    y: 330,
    width: 132,
    height: 30,
    speed: 76,
    startDirection: 1,
  },
  {
    id: 'car-c',
    minX: 5020,
    maxX: 5470,
    startX: 5020,
    y: 205,
    width: 132,
    height: 30,
    speed: 84,
    startDirection: 1,
  },
  {
    id: 'car-d',
    minX: 6200,
    maxX: 6550,
    startX: 6200,
    y: 105,
    width: 132,
    height: 30,
    speed: 78,
    startDirection: 1,
  },
]);

export const ROUTE_REQUIREMENTS = Object.freeze({
  movables: MOVABLE_DEFS.map(({ id }) => id),
  flyingCars: FLYING_CAR_DEFS.map(({ id }) => id),
});

export const MIDPOINT_REQUIREMENTS = Object.freeze({
  movables: ['ladder-a', 'block-a', 'ladder-b', 'block-b'],
  flyingCars: ['car-a', 'car-b'],
});

const makeMovable = (def) => ({
  ...def,
  x: def.startX,
  committedX: def.startX,
  dragging: false,
  previewLegal: true,
  moved: false,
});

const makeFlyingCar = (def) => ({
  ...def,
  x: def.startX,
  direction: def.startDirection,
  phase: def.startX === def.minX ? 0 : 1,
});

export function createParkourState() {
  return {
    movables: MOVABLE_DEFS.map(makeMovable),
    flyingCars: FLYING_CAR_DEFS.map(makeFlyingCar),
    activeDragId: null,
    movedKinds: [],
    movedMovables: [],
    riddenCars: [],
    resetting: false,
    resetCount: 0,
    lastFailure: null,
    checkpointReached: false,
    goalComplete: false,
    narrative: {
      npcTalked: false,
      letterRead: false,
    },
  };
}

export function recordNarrativeInteraction(state, interaction) {
  if (!state?.narrative) return false;
  if (interaction === 'npc') state.narrative.npcTalked = true;
  else if (interaction === 'letter') state.narrative.letterRead = true;
  else return false;
  return true;
}

export function movableById(state, id) {
  return state.movables.find((movable) => movable.id === id) ?? null;
}

export function beginDrag(state, id) {
  if (state.activeDragId || state.goalComplete || state.resetting) return false;
  const movable = movableById(state, id);
  if (!movable) return false;
  movable.dragging = true;
  movable.previewLegal = true;
  state.activeDragId = id;
  return true;
}

export function previewDrag(state, pointerWorldX) {
  const movable = movableById(state, state.activeDragId);
  if (!movable) return null;
  const requestedX = Number(pointerWorldX);
  const withinBounds = requestedX >= movable.minX && requestedX <= movable.maxX;
  movable.x = clamp(requestedX, movable.minX, movable.maxX);
  movable.previewLegal = withinBounds;
  return { x: movable.x, legal: movable.previewLegal };
}

export function finishDrag(state, commit = true) {
  const movable = movableById(state, state.activeDragId);
  if (!movable) return null;
  const accepted = Boolean(commit && movable.previewLegal);
  if (accepted) {
    movable.committedX = movable.x;
    movable.moved = movable.moved || Math.abs(movable.x - movable.startX) >= 12;
    if (movable.moved && !state.movedKinds.includes(movable.kind)) {
      state.movedKinds.push(movable.kind);
    }
    if (movable.moved && !state.movedMovables.includes(movable.id)) {
      state.movedMovables.push(movable.id);
    }
  } else {
    movable.x = movable.committedX;
  }
  movable.dragging = false;
  movable.previewLegal = true;
  state.activeDragId = null;
  return { id: movable.id, x: movable.x, accepted };
}

export function stepFlyingCars(state, deltaMs) {
  const dt = Math.max(0, Math.min(deltaMs, 100)) / 1000;
  return state.flyingCars.map((car) => {
    const previousX = car.x;
    car.x += car.speed * car.direction * dt;
    if (car.x >= car.maxX) {
      car.x = car.maxX;
      car.direction = -1;
    } else if (car.x <= car.minX) {
      car.x = car.minX;
      car.direction = 1;
    }
    const span = Math.max(1, car.maxX - car.minX);
    car.phase = (car.x - car.minX) / span;
    return { id: car.id, x: car.x, deltaX: car.x - previousX, phase: car.phase };
  });
}

export function recordCarRide(state, id) {
  if (!state.riddenCars.includes(id)) state.riddenCars.push(id);
}

export function canCompleteGoal(state) {
  return ROUTE_REQUIREMENTS.movables.every((id) => state.movedMovables.includes(id))
    && ROUTE_REQUIREMENTS.flyingCars.every((id) => state.riddenCars.includes(id))
    && state.narrative?.letterRead === true;
}

export function canActivateCheckpoint(state) {
  return !state.checkpointReached;
}

export function activateCheckpoint(state) {
  if (!canActivateCheckpoint(state)) return false;
  // Reaching the physical midpoint is the proof that act one was completed.
  // Normalize its route requirements here so an optional/unused obstacle from
  // the opening half cannot silently prevent the checkpoint or final door.
  state.movedKinds = [...new Set([...state.movedKinds, 'ladder', 'block'])];
  state.movedMovables = [...new Set([
    ...state.movedMovables,
    ...MIDPOINT_REQUIREMENTS.movables,
  ])];
  state.riddenCars = [...new Set([
    ...state.riddenCars,
    ...MIDPOINT_REQUIREMENTS.flyingCars,
  ])];
  state.checkpointReached = true;
  return true;
}

export function completeGoal(state) {
  if (!canCompleteGoal(state)) return false;
  state.goalComplete = true;
  return true;
}

export function resetParkourState(state, failure = 'manual') {
  const resetCount = state.resetCount + 1;
  const narrative = { ...state.narrative };
  const restoreCheckpoint = failure !== 'manual' && state.checkpointReached;
  const checkpointMovables = restoreCheckpoint
    ? state.movables
      .filter(({ id }) => MIDPOINT_REQUIREMENTS.movables.includes(id))
      .map((movable) => ({ ...movable }))
    : [];
  const fresh = createParkourState();
  Object.assign(state, fresh, {
    resetCount,
    lastFailure: failure,
    narrative,
  });
  if (restoreCheckpoint) {
    checkpointMovables.forEach((saved) => {
      const movable = movableById(state, saved.id);
      Object.assign(movable, saved, { dragging: false, previewLegal: true });
    });
    state.movedKinds = ['ladder', 'block'];
    state.movedMovables = [...MIDPOINT_REQUIREMENTS.movables];
    state.riddenCars = [...MIDPOINT_REQUIREMENTS.flyingCars];
    state.checkpointReached = true;
  }
  return state;
}

export function parkourSnapshot(state) {
  return {
    drag: state.activeDragId
      ? {
          id: state.activeDragId,
          legal: movableById(state, state.activeDragId)?.previewLegal ?? false,
        }
      : null,
    movables: state.movables.map((movable) => ({
      id: movable.id,
      kind: movable.kind,
      x: Math.round(movable.x),
      y: movable.y,
      moved: movable.moved,
    })),
    flyingCars: state.flyingCars.map((car) => ({
      id: car.id,
      x: Math.round(car.x),
      y: car.y,
      direction: car.direction,
      phase: Number(car.phase.toFixed(3)),
    })),
    movedKinds: [...state.movedKinds],
    movedMovables: [...state.movedMovables],
    riddenCars: [...state.riddenCars],
    resetting: state.resetting,
    resetCount: state.resetCount,
    lastFailure: state.lastFailure,
    checkpointReached: state.checkpointReached,
    goalReady: canCompleteGoal(state),
    goalComplete: state.goalComplete,
    narrative: { ...state.narrative },
  };
}
