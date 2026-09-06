export const MAX_FAILURES = 3;
export const LOW_VOLTAGE_THRESHOLD = 0.52;
export const VOLTAGE_DECAY_PER_MS = 0.00004;
export const MAINTENANCE_DEADLINE_MS = 16_000;

export const DISTRICTS = Object.freeze([
  Object.freeze({ id: 'lift', code: '01', name: 'LIFT', people: 'MEDICINE', node: 2, unlockedRound: 1 }),
  Object.freeze({ id: 'market', code: '02', name: 'MARKET', people: 'COLD FOOD', node: 5, unlockedRound: 1 }),
  Object.freeze({ id: 'clinic', code: '03', name: 'CLINIC', people: 'TREATMENT', node: 8, unlockedRound: 1 }),
  Object.freeze({ id: 'shelter', code: '04', name: 'SHELTER', people: 'HEAT', node: 10, unlockedRound: 2 }),
  Object.freeze({ id: 'pump', code: '05', name: 'WATER', people: 'DRINKING WATER', node: 13, unlockedRound: 2 }),
  Object.freeze({ id: 'kitchen', code: '06', name: 'KITCHEN', people: 'EVENING MEAL', node: 16, unlockedRound: 3 }),
]);

export const ROUND_SPECS = Object.freeze([
  Object.freeze({
    number: 1,
    durationMs: 45_000,
    lastNode: 8,
    stations: Object.freeze(['lift', 'market', 'clinic']),
    demands: Object.freeze([
      Object.freeze({ at: 0, district: 'lift', units: 1, deadline: 26_000 }),
      Object.freeze({ at: 9_000, district: 'market', units: 1, deadline: 27_000 }),
      Object.freeze({ at: 18_000, district: 'clinic', units: 2, deadline: 27_000 }),
    ]),
  }),
  Object.freeze({
    number: 2,
    durationMs: 60_000,
    lastNode: 14,
    stations: Object.freeze(['lift', 'market', 'clinic', 'shelter', 'pump']),
    demands: Object.freeze([
      Object.freeze({ at: 0, district: 'lift', units: 1, deadline: 27_000 }),
      Object.freeze({ at: 0, district: 'market', units: 2, deadline: 31_000 }),
      Object.freeze({ at: 10_000, district: 'clinic', units: 2, deadline: 30_000 }),
      Object.freeze({ at: 20_000, district: 'shelter', units: 1, deadline: 28_000 }),
      Object.freeze({ at: 31_000, district: 'pump', units: 2, deadline: 29_000 }),
    ]),
  }),
  Object.freeze({
    number: 3,
    durationMs: 80_000,
    lastNode: 16,
    stations: Object.freeze(['lift', 'market', 'clinic', 'shelter', 'pump', 'kitchen']),
    demands: Object.freeze([
      Object.freeze({ at: 0, district: 'lift', units: 1, deadline: 25_000 }),
      Object.freeze({ at: 0, district: 'market', units: 2, deadline: 29_000 }),
      Object.freeze({ at: 7_000, district: 'clinic', units: 3, deadline: 31_000 }),
      Object.freeze({ at: 13_000, district: 'shelter', units: 1, deadline: 26_000 }),
      Object.freeze({ at: 20_000, district: 'pump', units: 2, deadline: 29_000 }),
      Object.freeze({ at: 27_000, district: 'kitchen', units: 2, deadline: 29_000 }),
      Object.freeze({ at: 37_000, district: 'market', units: 3, deadline: 27_000 }),
      Object.freeze({ at: 46_000, district: 'shelter', units: 2, deadline: 25_000 }),
      Object.freeze({ at: 56_000, district: 'lift', units: 2, deadline: 24_000 }),
      Object.freeze({ at: 65_000, district: 'clinic', units: 3, deadline: 23_000 }),
    ]),
  }),
]);

export const DEMAND_SCHEDULE = Object.freeze(ROUND_SPECS.flatMap((round) => round.demands));
export const REQUIRED_COMPLETIONS = DEMAND_SCHEDULE.length;

export function isGridNodeAvailable(roundIndex, nodeIndex) {
  const round = ROUND_SPECS[Math.max(0, Math.min(ROUND_SPECS.length - 1, roundIndex))];
  return nodeIndex >= 0 && nodeIndex <= round.lastNode;
}

const clone = (value) => JSON.parse(JSON.stringify(value));

export function currentRoundSpec(state) {
  return ROUND_SPECS[state.roundIndex] ?? ROUND_SPECS.at(-1);
}

export function createDistrictDemandState() {
  return {
    mode: 'playing',
    roundIndex: 0,
    roundElapsedMs: 0,
    remainingMs: ROUND_SPECS[0].durationMs,
    nextDemand: 0,
    active: [],
    roundCompleted: 0,
    completed: 0,
    roundStartCompleted: 0,
    failures: 0,
    servedDistricts: [],
    roundStartServedDistricts: [],
    roundServedDistricts: [],
    districtVoltages: {},
    maintenanceCycles: {},
    maintenanceCompleted: 0,
    carriedUnits: 0,
    event: 'round-started',
  };
}

function finishRoundIfReady(state) {
  const round = currentRoundSpec(state);
  if (state.nextDemand < round.demands.length || state.active.length || state.roundCompleted < round.demands.length) return;
  if (state.roundIndex === ROUND_SPECS.length - 1) {
    state.mode = 'won';
    state.event = 'all-rounds-complete';
  } else {
    state.mode = 'intermission';
    state.event = 'round-complete';
  }
}

export function advanceDistrictRound(previous) {
  if (previous.mode !== 'intermission' || previous.roundIndex >= ROUND_SPECS.length - 1) return previous;
  const state = clone(previous);
  state.roundIndex += 1;
  state.mode = 'playing';
  state.roundElapsedMs = 0;
  state.remainingMs = currentRoundSpec(state).durationMs;
  state.nextDemand = 0;
  state.active = [];
  state.roundCompleted = 0;
  state.roundStartCompleted = state.completed;
  state.roundServedDistricts = [];
  state.districtVoltages = {};
  state.maintenanceCycles = {};
  state.maintenanceCompleted = 0;
  state.roundStartServedDistricts = [...state.servedDistricts];
  state.carriedUnits = 0;
  state.event = 'round-started';
  return state;
}

export function restartDistrictRound(previous) {
  if (previous.mode === 'won' || previous.mode === 'intermission') return previous;
  const state = clone(previous);
  state.mode = 'playing';
  state.roundElapsedMs = 0;
  state.remainingMs = currentRoundSpec(state).durationMs;
  state.nextDemand = 0;
  state.active = [];
  state.roundCompleted = 0;
  state.completed = state.roundStartCompleted;
  state.failures = 0;
  state.servedDistricts = [...state.roundStartServedDistricts];
  state.roundServedDistricts = [];
  state.districtVoltages = {};
  state.maintenanceCycles = {};
  state.maintenanceCompleted = 0;
  state.carriedUnits = 0;
  state.event = 'round-restarted';
  return state;
}

export function tickDistrictDemand(previous, dtMs) {
  if (previous.mode !== 'playing') return previous;
  const state = clone(previous);
  const round = currentRoundSpec(state);
  const dt = Math.max(0, dtMs);
  state.roundElapsedMs += dt;
  state.remainingMs = Math.max(0, round.durationMs - state.roundElapsedMs);

  while (state.nextDemand < round.demands.length && round.demands[state.nextDemand].at <= state.roundElapsedMs) {
    const spec = round.demands[state.nextDemand];
    const existing = state.active.find((demand) => demand.district === spec.district);
    if (existing) {
      existing.units = Math.max(existing.units, spec.units);
      existing.remainingMs = Math.max(existing.remainingMs, spec.deadline);
      existing.initialMs = Math.max(existing.initialMs || 0, spec.deadline);
      existing.scheduledCount = (existing.scheduledCount || 0) + 1;
      existing.maintenance = false;
    } else {
      state.active.push({
        id: `${state.roundIndex}-${state.nextDemand}`,
        district: spec.district,
        units: spec.units,
        remainingMs: spec.deadline,
        initialMs: spec.deadline,
        scheduledCount: 1,
        maintenance: false,
      });
    }
    state.nextDemand += 1;
    state.event = 'demand-arrived';
  }

  for (const [district, voltage] of Object.entries(state.districtVoltages)) {
    state.districtVoltages[district] = Math.max(0, voltage - dt * VOLTAGE_DECAY_PER_MS);
  }

  const maintenanceLimit = state.roundIndex >= 2 ? 2 : 1;
  for (const district of round.stations) {
    const voltage = state.districtVoltages[district] || 0;
    const cycles = state.maintenanceCycles[district] || 0;
    const alreadyCalling = state.active.some((demand) => demand.district === district);
    if (voltage > 0 && voltage <= LOW_VOLTAGE_THRESHOLD && cycles < maintenanceLimit && !alreadyCalling) {
      state.active.push({
        id: `${state.roundIndex}-maintenance-${district}-${cycles}`,
        district,
        units: state.roundIndex >= 2 ? 2 : 1,
        remainingMs: MAINTENANCE_DEADLINE_MS,
        initialMs: MAINTENANCE_DEADLINE_MS,
        scheduledCount: 0,
        maintenance: true,
      });
      state.maintenanceCycles[district] = cycles + 1;
      state.event = 'voltage-sag';
    }
  }

  for (const demand of state.active) demand.remainingMs -= dt;
  const expired = state.active.filter((demand) => demand.remainingMs <= 0);
  if (expired.length) {
    state.failures += expired.length;
    state.active = state.active.filter((demand) => demand.remainingMs > 0);
    state.event = 'demand-expired';
  }

  if (state.failures >= MAX_FAILURES || state.remainingMs <= 0) {
    state.mode = 'lost';
    state.event = state.failures >= MAX_FAILURES ? 'grid-failed' : 'round-time-ended';
  } else {
    finishRoundIfReady(state);
  }
  return state;
}

export function applyDistrictAction(previous, action) {
  if (previous.mode !== 'playing') return previous;
  const state = clone(previous);
  if (action.type === 'source.collect') {
    if (state.carriedUnits === 0) {
      state.carriedUnits = 1;
      state.event = 'charge-collected';
    } else {
      state.event = 'already-carrying';
    }
  } else if (action.type === 'transformer.boost') {
    if (state.carriedUnits > 0 && state.carriedUnits < 3) {
      state.carriedUnits += 1;
      state.event = 'charge-boosted';
    } else {
      state.event = state.carriedUnits === 0 ? 'no-charge' : 'charge-full';
    }
  } else if (action.type === 'district.deliver') {
    const demandIndex = state.active.findIndex((demand) => demand.district === action.district);
    if (demandIndex < 0) {
      state.event = 'no-demand';
    } else {
      const demand = state.active[demandIndex];
      if (state.carriedUnits < demand.units) {
        state.event = 'insufficient-charge';
      } else {
        state.carriedUnits -= demand.units;
        state.active.splice(demandIndex, 1);
        const scheduledCount = demand.scheduledCount ?? (demand.maintenance ? 0 : 1);
        state.roundCompleted += scheduledCount;
        state.completed += scheduledCount;
        if (demand.maintenance) state.maintenanceCompleted += 1;
        state.districtVoltages[action.district] = 1;
        if (!state.roundServedDistricts.includes(action.district)) state.roundServedDistricts.push(action.district);
        if (!state.servedDistricts.includes(action.district)) state.servedDistricts.push(action.district);
        state.event = demand.maintenance ? 'voltage-restored' : 'demand-served';
      }
    }
  }
  finishRoundIfReady(state);
  return state;
}

export function demandForDistrict(state, district) {
  return state.active.find((demand) => demand.district === district) ?? null;
}
