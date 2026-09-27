// Network plumbing for chapter preloads, kept free of Vite-only imports so it
// can be exercised directly by node tests.
//
// Every request has a stall timeout: if no response headers or body bytes
// arrive for `stallTimeoutMs`, that resource is abandoned and counted as
// failed. A whole job also has a hard ceiling. Destination pages already load
// (and fall back for) everything themselves, so a timed-out preload only means
// the next chapter fetches the rest on arrival instead of from cache.

export const PRELOAD_STALL_TIMEOUT_MS = 15000;
export const PRELOAD_JOB_CEILING_MS = 90000;

export class PreloadTimeoutError extends Error {
  constructor(url, ms) {
    super(`Preload stalled for ${ms}ms: ${url}`);
    this.name = 'TimeoutError';
    this.url = url;
  }
}

const isAbort = (error) => error?.name === 'AbortError';

// Fetch one resource fully into the HTTP cache. Resolves with the URL, or
// rejects with PreloadTimeoutError / an HTTP error / an AbortError when the
// caller's signal is aborted.
export async function cacheResource(url, {
  signal = null,
  priority = null,
  stallTimeoutMs = PRELOAD_STALL_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  as = 'buffer',
} = {}) {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  const controller = new AbortController();
  let timedOut = false;
  let timer = null;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, stallTimeoutMs);
  };
  const forwardAbort = () => controller.abort();
  signal?.addEventListener?.('abort', forwardAbort, { once: true });
  try {
    arm();
    const response = await fetchImpl(url, {
      cache: 'force-cache',
      credentials: 'same-origin',
      ...(priority ? { priority } : {}),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Preload failed (${response.status}): ${url}`);
    if (as === 'text') {
      arm();
      return await response.text();
    }
    const reader = response.body?.getReader?.();
    if (reader) {
      // Reading chunk by chunk lets a slow-but-alive download keep going
      // while a connection that silently stops sending is cut off.
      for (;;) {
        arm();
        const { done } = await reader.read();
        if (done) break;
      }
    } else {
      arm();
      await response.arrayBuffer();
    }
    return url;
  } catch (error) {
    if (timedOut) throw new PreloadTimeoutError(url, stallTimeoutMs);
    if (signal?.aborted && !isAbort(error)) throw new DOMException('Aborted', 'AbortError');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', forwardAbort);
  }
}

// Fetch `urls` with bounded concurrency. `onSettled(url, ok, error)` fires
// once per resource that completed or failed (including stalls). Resources
// cut off by the caller's abort are not reported.
export async function runQueue(urls, {
  signal = null,
  onSettled = () => {},
  concurrency = 2,
  priority = null,
  stallTimeoutMs = PRELOAD_STALL_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
} = {}) {
  let index = 0;
  const worker = async () => {
    while (index < urls.length && !signal?.aborted) {
      const url = urls[index++];
      try {
        await cacheResource(url, { signal, priority, stallTimeoutMs, fetchImpl });
        onSettled(url, true);
      } catch (error) {
        if (!isAbort(error) && !signal?.aborted) onSettled(url, false, error);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
}

// A signal that aborts when `parent` does or when `ms` elapses; `timedOut()`
// says which. `clear()` must be called once the guarded work has finished.
export function createCeiling(ms, parent = null) {
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, ms);
  const forward = () => controller.abort();
  if (parent?.aborted) controller.abort();
  parent?.addEventListener?.('abort', forward, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => expired,
    clear: () => {
      clearTimeout(timer);
      parent?.removeEventListener?.('abort', forward);
    },
  };
}

// Fraction [0, 1] of a preload job that has settled (loaded or failed).
export function preloadProgress(state) {
  if (!state) return 0;
  if (['ready', 'partial', 'timeout', 'cancelled'].includes(state.status)) return 1;
  const total = Math.max(1, Number(state.total) || 1);
  return Math.max(0, Math.min(1, ((state.loaded || 0) + (state.failed || 0)) / total));
}
