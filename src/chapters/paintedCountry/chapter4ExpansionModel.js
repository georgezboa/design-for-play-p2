// Chapter 4 // THE PAINTED COUNTRY — Part III, the train yard, as rules.
//
// The residents lend Butch their colours (RIGHT-HOLD each place: bakery,
// station, orchard, mill, square, home) and he paints the unfinished train
// with them (LEFT-HOLD a part: it takes the colour borrowed for it, wheels
// first). Then a simple hold boards it. There is no second quiz: the door in
// Part I already asked the question.
//
// Above the HOME door hangs a plate under the archive's grey. Washing it is
// optional, and under it is the Pigment Stone.

import { SIGN } from './carLayout.js';

export const EXPANSION_PHASE = Object.freeze({
  COLLECT: 'collect-six-colors',
  BUILD: 'build-the-train',
  BOARDED: 'boarded',
});

export const PIGMENTS = Object.freeze([
  { id: 'red', name: 'VERMILION', color: 0xc95850, source: 'BAKERY AWNING', part: 'ENGINE' },
  { id: 'orange', name: 'MARIGOLD', color: 0xd98a3a, source: 'STATION LANTERN', part: 'CAB' },
  { id: 'yellow', name: 'OCHRE', color: 0xd7b84a, source: 'ORCHARD SUN FLAG', part: 'WHISTLE' },
  { id: 'green', name: 'VERDIGRIS', color: 0x5e9172, source: 'MILL GARDEN', part: 'WHEELS' },
  { id: 'blue', name: 'INDIGO', color: 0x537ca6, source: 'PUBLIC WELL', part: 'CARRIAGE' },
  { id: 'violet', name: 'MULBERRY', color: 0x84658f, source: 'FAMILY QUILT', part: 'ROOF' },
]);

// The mark the train carries on its cab: the answer from Part I, painted on,
// not asked again.
export const CHAPTER4_IGNITION_SIGN = SIGN.HAWTHORN;

// Wheels first; bodies on the wheels; the cab and roof on the bodies.
export const TRAIN_BUILD_RULES = Object.freeze({
  green: Object.freeze({ requires: [], tier: 0 }),
  red: Object.freeze({ requires: ['green'], tier: 1 }),
  blue: Object.freeze({ requires: ['green'], tier: 1 }),
  yellow: Object.freeze({ requires: ['red'], tier: 2 }),
  orange: Object.freeze({ requires: ['red', 'blue'], tier: 2 }),
  violet: Object.freeze({ requires: ['orange', 'blue'], tier: 3 }),
});

export const TRAIN_BUILD_EXAMPLE_ORDER = Object.freeze(['green', 'red', 'blue', 'yellow', 'orange', 'violet']);

// Two washes take the grey off the HOME plate.
export const HOME_PLATE_WASHES = 2;

export function createChapter4Expansion({ unlockedPigments = [] } = {}) {
  const initiallyUnlocked = new Set(unlockedPigments);
  const state = {
    phase: PIGMENTS.every(({ id }) => initiallyUnlocked.has(id)) ? EXPANSION_PHASE.BUILD : EXPANSION_PHASE.COLLECT,
    trainBuilt: false,
    boarded: false,
    complete: false,
    failedAttempts: 0,
    lastFailure: null,
    pigments: PIGMENTS.map((pigment) => ({
      ...pigment,
      collected: initiallyUnlocked.has(pigment.id),
      built: false,
    })),
    homePlate: { washes: 0, revealed: false },
    events: [],
  };

  const emit = (type, detail = {}) => state.events.push({ type, ...detail });
  const pigment = (id) => state.pigments.find((item) => item.id === id) ?? null;
  const collectedCount = () => state.pigments.filter((item) => item.collected).length;
  const builtCount = () => state.pigments.filter((item) => item.built).length;
  const builtIds = () => new Set(state.pigments.filter((item) => item.built).map((item) => item.id));

  function unlockPigment(id) {
    const item = pigment(id);
    if (!item || item.collected) return false;
    item.collected = true;
    emit('pigment-unlocked', { id, source: item.source, part: item.part });
    if (collectedCount() === state.pigments.length) {
      state.phase = EXPANSION_PHASE.BUILD;
      emit('all-pigments-unlocked');
    }
    return true;
  }

  function collect(id) {
    if (state.phase !== EXPANSION_PHASE.COLLECT) return false;
    const changed = unlockPigment(id);
    if (changed) emit('pigment-taken', { id });
    return changed;
  }

  function failBuild(reason, partId, pigmentId, missing = []) {
    state.failedAttempts += 1;
    state.lastFailure = { reason, partId, pigmentId, missing: [...missing] };
    emit('train-build-failed', { ...state.lastFailure });
    return false;
  }

  // A part takes the colour borrowed for it; the explicit colour argument is
  // kept for tests and QA. Colours can be painted as they are borrowed — the
  // yard does not wait for all six.
  function placePart(partId, pigmentId = partId) {
    if (state.trainBuilt || state.boarded) return false;
    const part = pigment(partId);
    const color = pigment(pigmentId);
    if (!part || !color || part.built) return false;
    if (!color.collected) return failBuild('not-borrowed', partId, pigmentId);
    if (partId !== pigmentId) return failBuild('wrong-color', partId, pigmentId);

    const rule = TRAIN_BUILD_RULES[partId];
    const placed = builtIds();
    const missing = rule.requires.filter((id) => !placed.has(id));
    if (missing.length) return failBuild('unsupported', partId, pigmentId, missing);

    part.built = true;
    state.lastFailure = null;
    emit('train-part-placed', { id: partId, part: part.part, tier: rule.tier });
    if (builtCount() === state.pigments.length) {
      state.trainBuilt = true;
      state.phase = EXPANSION_PHASE.BUILD;
      emit('train-built');
    }
    return true;
  }

  function boardTrain() {
    if (!state.trainBuilt || state.boarded) return false;
    state.boarded = true;
    state.complete = true;
    state.phase = EXPANSION_PHASE.BOARDED;
    emit('train-boarded');
    return true;
  }

  function washHomePlate() {
    if (state.homePlate.revealed) return false;
    state.homePlate.washes += 1;
    if (state.homePlate.washes >= HOME_PLATE_WASHES) {
      state.homePlate.revealed = true;
      emit('home-plate-revealed');
    } else {
      emit('home-plate-thinned', { left: HOME_PLATE_WASHES - state.homePlate.washes });
    }
    return true;
  }

  return {
    state,
    pigment,
    collect,
    unlockPigment,
    placePart,
    boardTrain,
    washHomePlate,
    snapshot() {
      return {
        phase: state.phase,
        trainBuilt: state.trainBuilt,
        boarded: state.boarded,
        complete: state.complete,
        failedAttempts: state.failedAttempts,
        lastFailure: state.lastFailure ? { ...state.lastFailure, missing: [...state.lastFailure.missing] } : null,
        collectedCount: collectedCount(),
        builtCount: builtCount(),
        homePlate: { ...state.homePlate },
        pigments: state.pigments.map((item) => ({ ...item })),
      };
    },
    drainEvents() {
      const events = state.events.slice();
      state.events.length = 0;
      return events;
    },
  };
}
