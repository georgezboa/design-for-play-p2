import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHAPTER_OUTPUT_EXPECTATIONS,
  CHAPTER_OUTPUT_SCHEMA_VERSION,
  CHAPTER_OUTPUT_SLOTS,
  createChapterOutputRegistry,
} from '../../src/chapters/allWorlds/chapterOutputRegistry.js';

function readyOutput(chapterId, overrides = {}) {
  const kind = CHAPTER_OUTPUT_EXPECTATIONS[chapterId].carryKind;
  return {
    schemaVersion: CHAPTER_OUTPUT_SCHEMA_VERSION,
    chapterId,
    status: 'ready',
    carry: {
      kind,
      verb: 'connect',
      sourceId: 'source-a',
      relationshipId: 'relationship-a',
      resultId: 'result-a',
      visualToken: 'cyan-thread',
      payload: { strength: 1 },
    },
    provenance: { checkpointId: 'chapter-end', chapterComplete: true },
    ...overrides,
  };
}

describe('Chapter 6 input registry', () => {
  it('starts with five explicit placeholders and never imports unfinished chapters', () => {
    const snapshot = createChapterOutputRegistry().snapshot();
    assert.equal(snapshot.connectedCount, 0);
    assert.equal(snapshot.readyForFinale, false);
    assert.deepEqual(snapshot.missing, Object.values(CHAPTER_OUTPUT_SLOTS));
    for (const slot of Object.values(snapshot.slots)) assert.equal(slot.status, 'placeholder');
  });

  it('replaces one placeholder without changing the other four slots', () => {
    const registry = createChapterOutputRegistry();
    registry.connect(
      CHAPTER_OUTPUT_SLOTS.ECHO_CITY,
      readyOutput(CHAPTER_OUTPUT_SLOTS.ECHO_CITY),
    );
    const snapshot = registry.snapshot();
    assert.equal(snapshot.connectedCount, 1);
    assert.equal(snapshot.slots[CHAPTER_OUTPUT_SLOTS.ECHO_CITY].status, 'ready');
    assert.equal(snapshot.slots[CHAPTER_OUTPUT_SLOTS.BORROWED_GRID].status, 'placeholder');
  });

  it('rejects an output that enters the wrong named slot', () => {
    const registry = createChapterOutputRegistry();
    assert.throws(
      () => registry.connect(
        CHAPTER_OUTPUT_SLOTS.NIGHT_SERVICE,
        readyOutput(CHAPTER_OUTPUT_SLOTS.ECHO_CITY),
      ),
      /chapterId must match/,
    );
  });

  it('rejects the wrong carry kind before Chapter 6 can depend on it', () => {
    const chapterId = CHAPTER_OUTPUT_SLOTS.PAINTED_COUNTRY;
    const output = readyOutput(chapterId);
    output.carry.kind = 'power-link';
    assert.throws(() => createChapterOutputRegistry({ [chapterId]: output }), /carry.kind/);
  });

  it('returns deep clones so a chapter cannot mutate finale state after connecting', () => {
    const chapterId = CHAPTER_OUTPUT_SLOTS.MUSEUM_OF_ONE_ANSWER;
    const output = readyOutput(chapterId);
    const registry = createChapterOutputRegistry({ [chapterId]: output });
    output.carry.payload.strength = 999;
    const first = registry.get(chapterId);
    first.carry.payload.strength = 500;
    assert.equal(registry.get(chapterId).carry.payload.strength, 1);
  });

  it('becomes finale-ready only when all five adapters have connected', () => {
    const seed = Object.fromEntries(
      Object.values(CHAPTER_OUTPUT_SLOTS).map((chapterId) => [chapterId, readyOutput(chapterId)]),
    );
    const snapshot = createChapterOutputRegistry(seed).snapshot();
    assert.equal(snapshot.connectedCount, 5);
    assert.equal(snapshot.readyForFinale, true);
    assert.deepEqual(snapshot.missing, []);
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(snapshot)));
  });
});
