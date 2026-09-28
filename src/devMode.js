// The dev/prod switch, and every route that is allowed to depend on it.
//
// A shipped build always starts on the title screen and plays the chapters in
// order — no chapter select, no query-string warps, no QA fixtures. The dev
// build gets a chapter launcher on index.html (shell/devLauncher.js) plus the
// per-page query routes the QA docs use (`?act=`, `?section=`, `?qa=`, …).
//
//   npm run dev   ->  vite --mode development  ->  DEV_MODE true
//   npm run prod  ->  vite --mode production   ->  DEV_MODE false
//   npm run build ->  vite build               ->  DEV_MODE false
//
// `__DEV_MODE__` is substituted at build time by vite.config.js. The typeof
// guard keeps this module importable from the standalone chapter entry points
// (vite.car03-3d / museum3d / final-boss / … configs), which never define the
// constant: there it follows Vite's own dev flag, so `npm run dev:chapter05`
// keeps its QA routes while every `vite build` stays false. Under plain node
// (tests) `import.meta.env` is absent and this is false.
export const DEV_MODE = typeof __DEV_MODE__ === 'undefined'
  ? Boolean(import.meta.env?.DEV)
  : __DEV_MODE__;
const HIDDEN_ROUTER_KEY = 'nightfall.hidden-router.v1';

// The title's 1111 test-node router exists only in the dev build. It still
// records this session flag there, but the flag is never an input to
// devRoutesEnabled(): a shipped build has no way to turn dev routes on, even
// if a stale flag is left in sessionStorage.
export function hiddenRouterActive(storage = globalThis.sessionStorage) {
  return storage?.getItem(HIDDEN_ROUTER_KEY) === '1';
}

export function activateHiddenRouter(storage = globalThis.sessionStorage) {
  storage?.setItem(HIDDEN_ROUTER_KEY, '1');
}

export function clearHiddenRouter(storage = globalThis.sessionStorage) {
  storage?.removeItem(HIDDEN_ROUTER_KEY);
}

export function devRoutesEnabled() {
  return DEV_MODE;
}

// Every query key that can move the game away from a clean run. Reading them
// all through devParams() below means production has exactly one kill switch
// instead of one per call site.
export const DEV_ROUTE_PARAMS = ['chapter', 'car', 'world', 'qa', 'state', 'artState'];

function currentSearch(explicit) {
  if (typeof explicit === 'string') return explicit;
  return typeof window === 'undefined' ? '' : window.location.search;
}

// The single gate. In a production build this always returns an empty set, so
// no dev route can be reached by hand-editing the URL of a shipped page.
export function devParams(explicitSearch) {
  if (!devRoutesEnabled()) return new URLSearchParams();
  return new URLSearchParams(currentSearch(explicitSearch));
}

export function devParam(name, explicitSearch) {
  return devParams(explicitSearch).get(name);
}

// True when the URL carries one of the query keys above. index.html uses it
// to explain that an old Prologue deep link (`/?chapter=`, `/?qa=`) has
// nowhere to go any more.
export function hasDevRoute(explicitSearch) {
  const params = devParams(explicitSearch);
  return DEV_ROUTE_PARAMS.some((key) => params.has(key));
}
