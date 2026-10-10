// A transition cutscene that plays on the page it leads to (round 11, the
// 2→3 hand-off; George: "第三章一开始要在动画的时候加载" — Chapter 3 should
// load during the cutscene, not after it).
//
// The leaving chapter navigates at once with `?from=<chapter>`; the arriving
// page mounts the cutscene over itself and loads underneath, and the overlay
// leaves only when both the cutscene has ended (or been skipped) and the page
// says it is ready. If the page is still loading when the cutscene ends, the
// last frame stays up with the page's own live progress; if the page stops
// making progress, the overlay hands over to the page's own loading screen
// instead of freezing (arrivalStep below).
//
// Pure: no DOM. gameFlow.js drives the overlay from it, the page reports its
// stages, and tests/arrivalGate.test.mjs covers it.

/** The query key the leaving chapter sets: `/car03-3d.html?from=chapter2`. */
export const ARRIVAL_PARAM = 'from';
/** No progress for this long while the overlay holds: hand over to the page. */
export const ARRIVAL_STALL_MS = 30000;

/**
 * Which arrival a page was opened for, or null. `expected` names the one
 * this page plays (anything else is ignored); `override` (a dev / QA route
 * such as ?playtest=) always wins, so a test start never plays the cutscene.
 */
export function arrivalFrom(search, { expected, override = false } = {}) {
  if (override) return null;
  let value = null;
  try {
    value = new URLSearchParams(search ?? '').get(ARRIVAL_PARAM);
  } catch {
    value = null;
  }
  if (!value) return null;
  if (expected && value !== expected) return null;
  return value;
}

/**
 * The same address without the arrival flag: once the cutscene has been
 * taken, a reload (or Continue) opens the chapter normally, never the
 * cutscene again.
 */
export function withoutArrival(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (!url.searchParams.has(ARRIVAL_PARAM)) return href;
  url.searchParams.delete(ARRIVAL_PARAM);
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
}

/** The route a leaving chapter navigates to: `route` with `?from=<from>`. */
export function arrivalRoute(route, from) {
  const [path, query = ''] = String(route).split('?');
  const params = new URLSearchParams(query);
  params.set(ARRIVAL_PARAM, from);
  return `${path}?${params.toString()}`;
}

/**
 * The page's readiness, built from weighted stages ({ id, weight }). Each
 * stage reports a fraction in [0, 1] (never going back); progress() is the
 * weighted sum. ready() / fail() settle `promise`; a failed page is revealed
 * too, so its own error shows instead of a held frame.
 */
export function createArrivalGate(stages, { now = () => Date.now() } = {}) {
  const list = stages.map(({ id, weight }) => ({ id, weight: Math.max(0, Number(weight) || 0) }));
  const total = list.reduce((sum, stage) => sum + stage.weight, 0) || 1;
  const values = new Map(list.map((stage) => [stage.id, 0]));
  const listeners = new Set();
  let status = 'loading';
  let error = null;
  let changedAt = now();
  let settle;
  const promise = new Promise((resolve) => { settle = resolve; });

  const progress = () => {
    if (status !== 'loading') return 1;
    const sum = list.reduce((acc, stage) => acc + stage.weight * values.get(stage.id), 0);
    return Math.max(0, Math.min(1, sum / total));
  };
  const emit = () => {
    const value = progress();
    listeners.forEach((listener) => {
      try { listener(value, status); } catch { /* a listener never breaks the gate */ }
    });
  };
  const finish = (next, reason = null) => {
    if (status !== 'loading') return false;
    status = next;
    error = reason;
    changedAt = now();
    emit();
    settle({ status, error });
    return true;
  };

  return {
    promise,
    /** Stage `id` is `fraction` done (values only ever rise). */
    report(id, fraction = 1) {
      if (status !== 'loading' || !values.has(id)) return false;
      const next = Math.max(0, Math.min(1, Number(fraction) || 0));
      if (next <= values.get(id)) return false;
      values.set(id, next);
      changedAt = now();
      emit();
      return true;
    },
    ready() {
      list.forEach((stage) => values.set(stage.id, 1));
      return finish('ready');
    },
    fail(reason = null) { return finish('failed', reason); },
    progress,
    stage(id) { return values.get(id) ?? null; },
    get status() { return status; },
    get error() { return error; },
    get settled() { return status !== 'loading'; },
    /** Milliseconds since progress last moved. */
    idleFor(at = now()) { return Math.max(0, at - changedAt); },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * What the overlay does now:
 *   'play'           the cutscene is still on (the page loads underneath);
 *   'hold'           it has ended, the page is still loading: hold the last
 *                    frame with the page's live progress;
 *   'reveal'         both are done (a failed page is revealed too);
 *   'reveal-loading' the page has made no progress for `stallMs`: lift the
 *                    overlay onto the page's own loading screen, never a
 *                    frozen frame.
 */
export function arrivalStep({ cutsceneDone, status, idleMs = 0, stallMs = ARRIVAL_STALL_MS }) {
  if (!cutsceneDone) return 'play';
  if (status === 'ready' || status === 'failed') return 'reveal';
  if (idleMs >= stallMs) return 'reveal-loading';
  return 'hold';
}
