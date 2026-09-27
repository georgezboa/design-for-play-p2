import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cacheResource,
  createCeiling,
  preloadProgress,
  runQueue,
} from '../src/shell/preloadQueue.js';

// A fetch double: `plan[url]` is 'ok', 'stall', 'stall-body', or an HTTP status.
function fakeFetch(plan) {
  return (url, { signal } = {}) => new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const mode = plan[url] ?? 'ok';
    if (mode === 'stall') return;
    if (typeof mode === 'number') {
      resolve({ ok: false, status: mode, arrayBuffer: async () => new ArrayBuffer(0) });
      return;
    }
    let sent = false;
    resolve({
      ok: true,
      status: 200,
      text: async () => '<html></html>',
      body: {
        getReader: () => ({
          read: () => new Promise((done, fail) => {
            if (mode === 'stall-body' && sent) {
              signal?.addEventListener('abort', () => fail(new DOMException('Aborted', 'AbortError')), { once: true });
              return;
            }
            if (sent) return done({ done: true });
            sent = true;
            done({ done: false, value: new Uint8Array(4) });
          }),
        }),
      },
    });
  });
}

test('a resource that never answers is abandoned after the stall timeout', async () => {
  const started = Date.now();
  await assert.rejects(
    cacheResource('/stuck.glb', { fetchImpl: fakeFetch({ '/stuck.glb': 'stall' }), stallTimeoutMs: 40 }),
    { name: 'TimeoutError' },
  );
  assert.ok(Date.now() - started < 1000);
});

test('a download that stops sending mid-body is also abandoned', async () => {
  await assert.rejects(
    cacheResource('/half.glb', { fetchImpl: fakeFetch({ '/half.glb': 'stall-body' }), stallTimeoutMs: 40 }),
    { name: 'TimeoutError' },
  );
});

test('stalled and 404 resources are reported as failed so a queue always settles', async () => {
  const settled = [];
  await runQueue(['/a', '/stuck', '/missing', '/b'], {
    fetchImpl: fakeFetch({ '/stuck': 'stall', '/missing': 404 }),
    stallTimeoutMs: 30,
    concurrency: 2,
    onSettled: (url, ok) => settled.push([url, ok]),
  });
  assert.deepEqual(Object.fromEntries(settled), { '/a': true, '/stuck': false, '/missing': false, '/b': true });
});

test('the job ceiling stops a queue of stalled requests without reporting them', async () => {
  const ceiling = createCeiling(50);
  const settled = [];
  const started = Date.now();
  await runQueue(['/s1', '/s2', '/s3'], {
    signal: ceiling.signal,
    fetchImpl: fakeFetch({ '/s1': 'stall', '/s2': 'stall', '/s3': 'stall' }),
    stallTimeoutMs: 60000,
    onSettled: (url, ok) => settled.push([url, ok]),
  });
  ceiling.clear();
  assert.equal(ceiling.timedOut(), true);
  assert.deepEqual(settled, []);
  assert.ok(Date.now() - started < 1000);
});

test('a ceiling that has not expired reports timedOut() false after clear', () => {
  const ceiling = createCeiling(10000);
  ceiling.clear();
  assert.equal(ceiling.timedOut(), false);
  assert.equal(ceiling.signal.aborted, false);
});

test('progress counts failed resources as settled and is complete once the job ends', () => {
  assert.equal(preloadProgress(null), 0);
  assert.equal(preloadProgress({ status: 'loading', loaded: 3, failed: 1, total: 8 }), 0.5);
  assert.equal(preloadProgress({ status: 'timeout', loaded: 1, failed: 0, total: 8 }), 1);
  assert.equal(preloadProgress({ status: 'loading', loaded: 0, failed: 0, total: 0 }), 0);
});
