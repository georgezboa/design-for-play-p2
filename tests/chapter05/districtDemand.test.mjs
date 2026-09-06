import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DISTRICTS,
  ROUND_SPECS,
  advanceDistrictRound,
  applyDistrictAction,
  createDistrictDemandState,
  currentRoundSpec,
  isGridNodeAvailable,
  restartDistrictRound,
  tickDistrictDemand,
} from '../../src/chapters/borrowedGrid/model/districtDemand.js';

function serveAllCurrentRound(state) {
  const round = currentRoundSpec(state);
  state.active = round.demands.map((spec, id) => ({ id: `${state.roundIndex}-${id}`, district: spec.district, units: spec.units, remainingMs: 99_000 }));
  state.nextDemand = round.demands.length;
  for (const demand of [...state.active]) {
    state.carriedUnits = demand.units;
    state = applyDistrictAction(state, { type: 'district.deliver', district: demand.district });
  }
  return state;
}

test('the three rounds teach three stations, then five, then all six', () => {
  assert.deepEqual(ROUND_SPECS.map((round) => round.stations.length), [3, 5, 6]);
  assert.deepEqual(ROUND_SPECS.map((round) => round.demands.length), [3, 5, 10]);
  assert.deepEqual(DISTRICTS.map(({ code, name }) => `${code} ${name}`), [
    '01 LIFT', '02 MARKET', '03 CLINIC', '04 SHELTER', '05 WATER', '06 KITCHEN',
  ]);
});

test('later grid sections are physically unavailable until their round opens', () => {
  assert.deepEqual(ROUND_SPECS.map(({ lastNode }) => lastNode), [8, 14, 16]);
  assert.equal(isGridNodeAvailable(0, 8), true);
  assert.equal(isGridNodeAvailable(0, 9), false);
  assert.equal(isGridNodeAvailable(1, 14), true);
  assert.equal(isGridNodeAvailable(1, 15), false);
  assert.equal(isGridNodeAvailable(2, 16), true);
});

test('round one overlaps only its three learnable station calls', () => {
  let state = tickDistrictDemand(createDistrictDemandState(), 1);
  assert.deepEqual(state.active.map(({ district }) => district), ['lift']);
  state = tickDistrictDemand(state, 9_000);
  assert.deepEqual(state.active.map(({ district }) => district), ['lift', 'market']);
  assert.equal(state.roundIndex, 0);
});

test('power is collected, boosted, and delivered at separate interaction points', () => {
  let state = tickDistrictDemand(createDistrictDemandState(), 1);
  state = applyDistrictAction(state, { type: 'source.collect' });
  assert.equal(state.carriedUnits, 1);
  state = applyDistrictAction(state, { type: 'district.deliver', district: 'lift' });
  assert.equal(state.roundCompleted, 1);
  assert.equal(state.carriedUnits, 0);
  assert.equal(state.districtVoltages.lift, 1);
});

test('served districts sag and return as maintenance instead of staying permanently solved', () => {
  let state = tickDistrictDemand(createDistrictDemandState(), 1);
  state.carriedUnits = 1;
  state = applyDistrictAction(state, { type: 'district.deliver', district: 'lift' });
  const initialCompleted = state.roundCompleted;
  for (let elapsed = 0; elapsed < 12_500; elapsed += 50) state = tickDistrictDemand(state, 50);
  const maintenance = state.active.find((demand) => demand.district === 'lift' && demand.maintenance);
  assert.ok(maintenance);
  assert.ok(state.districtVoltages.lift <= 0.52);
  state.carriedUnits = maintenance.units;
  state = applyDistrictAction(state, { type: 'district.deliver', district: 'lift' });
  assert.equal(state.roundCompleted, initialCompleted);
  assert.equal(state.maintenanceCompleted, 1);
  assert.equal(state.districtVoltages.lift, 1);
});

test('clearing one round pauses before adding the next two stations', () => {
  let state = serveAllCurrentRound(createDistrictDemandState());
  assert.equal(state.mode, 'intermission');
  assert.equal(state.roundIndex, 0);
  state = advanceDistrictRound(state);
  assert.equal(state.mode, 'playing');
  assert.equal(state.roundIndex, 1);
  assert.deepEqual(currentRoundSpec(state).stations, ['lift', 'market', 'clinic', 'shelter', 'pump']);
  assert.equal(state.roundCompleted, 0);
});

test('winning requires clearing all three rounds', () => {
  let state = createDistrictDemandState();
  for (let round = 0; round < ROUND_SPECS.length; round += 1) {
    state = serveAllCurrentRound(state);
    if (round < ROUND_SPECS.length - 1) state = advanceDistrictRound(state);
  }
  assert.equal(state.mode, 'won');
  assert.equal(state.completed, 18);
  assert.deepEqual(new Set(state.servedDistricts), new Set(DISTRICTS.map(({ id }) => id)));
});

test('three expired needs still black out the grid', () => {
  let state = createDistrictDemandState();
  state.active = [
    { id: '0-0', district: 'lift', units: 1, remainingMs: 10 },
    { id: '0-1', district: 'market', units: 1, remainingMs: 10 },
    { id: '0-2', district: 'clinic', units: 2, remainingMs: 10 },
  ];
  state.nextDemand = currentRoundSpec(state).demands.length;
  state = tickDistrictDemand(state, 20);
  assert.equal(state.failures, 3);
  assert.equal(state.mode, 'lost');
});

test('failure retries only the current round and preserves earlier rounds', () => {
  let state = serveAllCurrentRound(createDistrictDemandState());
  state = advanceDistrictRound(state);
  assert.equal(state.roundIndex, 1);
  assert.equal(state.roundStartCompleted, 3);

  state = tickDistrictDemand(state, 1);
  state.carriedUnits = 1;
  state = applyDistrictAction(state, { type: 'district.deliver', district: 'lift' });
  assert.equal(state.completed, 4);
  state.failures = 3;
  state.mode = 'lost';

  state = restartDistrictRound(state);
  assert.equal(state.mode, 'playing');
  assert.equal(state.roundIndex, 1);
  assert.equal(state.completed, 3);
  assert.equal(state.roundCompleted, 0);
  assert.equal(state.failures, 0);
  assert.deepEqual(state.servedDistricts, ['lift', 'market', 'clinic']);
  assert.equal(state.remainingMs, 60_000);
});
