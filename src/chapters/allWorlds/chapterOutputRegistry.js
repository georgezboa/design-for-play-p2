// Chapter 6 // ALL WORLDS AT ONCE — input contract for Chapters 1–5.
//
// This module intentionally imports no chapter implementation. Each chapter
// can finish on its own schedule, then publish one small serializable packet
// into its named slot. Chapter 6 only reads these packets.

export const CHAPTER_OUTPUT_SCHEMA_VERSION = 1;

export const CHAPTER_OUTPUT_SLOTS = Object.freeze({
  NIGHT_SERVICE: 'night-service',
  BORROWED_GRID: 'borrowed-grid',
  ECHO_CITY: 'echo-city',
  PAINTED_COUNTRY: 'painted-country',
  MUSEUM_OF_ONE_ANSWER: 'museum-of-one-answer',
});

export const CHAPTER_OUTPUT_EXPECTATIONS = Object.freeze({
  [CHAPTER_OUTPUT_SLOTS.NIGHT_SERVICE]: Object.freeze({
    chapter: 1,
    carryKind: 'held-action',
    example: 'hold a mechanical relationship long enough for another system to answer',
  }),
  [CHAPTER_OUTPUT_SLOTS.BORROWED_GRID]: Object.freeze({
    chapter: 2,
    carryKind: 'power-link',
    example: 'source and receiver remain visibly connected',
  }),
  [CHAPTER_OUTPUT_SLOTS.ECHO_CITY]: Object.freeze({
    chapter: 3,
    carryKind: 'behavior-cycle',
    example: 'MOVE / WAIT / RETURN can be copied and transplanted',
  }),
  [CHAPTER_OUTPUT_SLOTS.PAINTED_COUNTRY]: Object.freeze({
    chapter: 4,
    carryKind: 'world-rule',
    example: 'a kept property changes what a painted action makes physical',
  }),
  [CHAPTER_OUTPUT_SLOTS.MUSEUM_OF_ONE_ANSWER]: Object.freeze({
    chapter: 5,
    carryKind: 'interpretation',
    example: 'evidence placement makes one physical route real',
  }),
});

const SLOT_IDS = Object.freeze(Object.values(CHAPTER_OUTPUT_SLOTS));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertSlotId(chapterId) {
  if (!SLOT_IDS.includes(chapterId)) {
    throw new Error(`Unknown Chapter 6 input slot: ${String(chapterId)}`);
  }
}

function assertSerializable(value, label) {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) throw new Error('undefined root');
    JSON.parse(json);
  } catch (error) {
    throw new Error(`${label} must be JSON-serializable: ${error.message}`);
  }
}

export function makePlaceholderChapterOutput(chapterId) {
  assertSlotId(chapterId);
  const expectation = CHAPTER_OUTPUT_EXPECTATIONS[chapterId];
  return {
    schemaVersion: CHAPTER_OUTPUT_SCHEMA_VERSION,
    chapterId,
    status: 'placeholder',
    carry: {
      kind: expectation.carryKind,
      verb: 'pending',
      sourceId: 'pending',
      relationshipId: 'pending',
      resultId: 'pending',
      visualToken: 'graphite-dash',
      payload: {},
    },
    provenance: {
      checkpointId: 'not-connected',
      chapterComplete: false,
    },
  };
}

export function normalizeChapterOutput(chapterId, candidate) {
  assertSlotId(chapterId);
  if (!isRecord(candidate)) throw new Error(`${chapterId} output must be an object`);
  assertSerializable(candidate, `${chapterId} output`);

  if (candidate.schemaVersion !== CHAPTER_OUTPUT_SCHEMA_VERSION) {
    throw new Error(`${chapterId} output schemaVersion must be ${CHAPTER_OUTPUT_SCHEMA_VERSION}`);
  }
  if (candidate.chapterId !== chapterId) {
    throw new Error(`${chapterId} output chapterId must match its registry slot`);
  }
  if (candidate.status !== 'ready') {
    throw new Error(`${chapterId} output status must be ready`);
  }
  if (!isRecord(candidate.carry)) throw new Error(`${chapterId} output carry is required`);
  if (candidate.carry.kind !== CHAPTER_OUTPUT_EXPECTATIONS[chapterId].carryKind) {
    throw new Error(`${chapterId} output carry.kind must be ${CHAPTER_OUTPUT_EXPECTATIONS[chapterId].carryKind}`);
  }

  for (const field of ['verb', 'sourceId', 'relationshipId', 'resultId', 'visualToken']) {
    if (!nonEmptyString(candidate.carry[field])) {
      throw new Error(`${chapterId} output carry.${field} must be a non-empty string`);
    }
  }
  if (!isRecord(candidate.carry.payload)) {
    throw new Error(`${chapterId} output carry.payload must be an object`);
  }
  if (!isRecord(candidate.provenance) || !nonEmptyString(candidate.provenance.checkpointId)) {
    throw new Error(`${chapterId} output provenance.checkpointId is required`);
  }
  if (candidate.provenance.chapterComplete !== true) {
    throw new Error(`${chapterId} output provenance.chapterComplete must be true`);
  }

  return clone({
    schemaVersion: CHAPTER_OUTPUT_SCHEMA_VERSION,
    chapterId,
    status: 'ready',
    carry: {
      kind: candidate.carry.kind,
      verb: candidate.carry.verb.trim(),
      sourceId: candidate.carry.sourceId.trim(),
      relationshipId: candidate.carry.relationshipId.trim(),
      resultId: candidate.carry.resultId.trim(),
      visualToken: candidate.carry.visualToken.trim(),
      payload: candidate.carry.payload,
    },
    provenance: {
      checkpointId: candidate.provenance.checkpointId.trim(),
      chapterComplete: true,
    },
  });
}

export function createChapterOutputRegistry(seed = {}) {
  const slots = Object.fromEntries(
    SLOT_IDS.map((chapterId) => [chapterId, makePlaceholderChapterOutput(chapterId)]),
  );

  function connect(chapterId, output) {
    slots[chapterId] = normalizeChapterOutput(chapterId, output);
    return get(chapterId);
  }

  function disconnect(chapterId) {
    assertSlotId(chapterId);
    slots[chapterId] = makePlaceholderChapterOutput(chapterId);
    return get(chapterId);
  }

  function get(chapterId) {
    assertSlotId(chapterId);
    return clone(slots[chapterId]);
  }

  function snapshot() {
    const connected = SLOT_IDS.filter((chapterId) => slots[chapterId].status === 'ready');
    return clone({
      schemaVersion: CHAPTER_OUTPUT_SCHEMA_VERSION,
      connectedCount: connected.length,
      readyForFinale: connected.length === SLOT_IDS.length,
      connected,
      missing: SLOT_IDS.filter((chapterId) => !connected.includes(chapterId)),
      slots,
    });
  }

  for (const [chapterId, output] of Object.entries(seed)) connect(chapterId, output);

  return Object.freeze({ connect, disconnect, get, snapshot });
}
