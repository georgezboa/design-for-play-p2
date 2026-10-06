import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore } from '../src/shell/saveSystem.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
}

test('a resume point is kept for its checkpoint and read back', () => {
  const store = createSaveStore(memoryStorage(), { scratch: false });
  store.startNew(0);
  assert.equal(store.readResume('chapter-1-start'), null);
  store.markResume('chapter-1-start', { step: 'office-hooks' });
  assert.deepEqual(store.readResume('chapter-1-start'), { step: 'office-hooks' });
  assert.equal(store.readResume('chapter-2-start'), null);
});

test('a resume point for another checkpoint is refused', () => {
  const store = createSaveStore(memoryStorage(), { scratch: false });
  store.startNew(0);
  assert.equal(store.markResume('chapter-2-start', { lamp: 'a3' }), null);
  assert.equal(store.readResume('chapter-2-start'), null);
});

test('moving to a new checkpoint or picking one in LOAD drops the resume point', () => {
  const store = createSaveStore(memoryStorage(), { scratch: false });
  store.startNew(0);
  store.markResume('chapter-1-start', { step: 'x' });
  store.markCheckpoint('chapter-1-start');
  assert.deepEqual(store.readResume('chapter-1-start'), { step: 'x' }, 're-marking the same checkpoint keeps it');
  store.markCheckpoint('chapter-1-act-05');
  assert.equal(store.readResume('chapter-1-start'), null);
  store.markResume('chapter-1-act-05', { step: 'y' });
  store.selectCheckpoint(0, 'chapter-1-start');
  assert.equal(store.readResume('chapter-1-act-05'), null);
  assert.equal(store.readResume('chapter-1-start'), null);
});

test('a rewinding checkpoint mark keeps the current resume point', () => {
  const store = createSaveStore(memoryStorage(), { scratch: false });
  store.startNew(0);
  store.markCheckpoint('chapter-3-dusk');
  store.markResume('chapter-3-dusk', { stage: 'hotel' });
  store.markCheckpoint('chapter-3-start'); // a page load that must not rewind
  assert.deepEqual(store.readResume('chapter-3-dusk'), { stage: 'hotel' });
});
