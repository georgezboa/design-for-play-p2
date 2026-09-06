// The dev/prod switch, and every route that is allowed to depend on it.
//
// The game ships as one continuous journey: the Prologue's six junctions, then
// the chapters. A shipped build must always begin at the first frame of the
// Prologue — no chapter select, no query-string warps, no QA fixtures.
//
// Jumping straight into a junction is also the single most repeated action on
// this project, so the dev build gets a chapter select plus the query routes
// the QA docs already use.
//
//   npm run dev   ->  vite --mode development  ->  DEV_MODE true
//   npm run prod  ->  vite --mode production   ->  DEV_MODE false
//   npm run build ->  vite build               ->  DEV_MODE false
//
// `__DEV_MODE__` is substituted at build time by vite.config.js. The typeof
// guard keeps this module importable from the standalone car entry points
// (car03 / car04 / car06), which each run under their own Vite config and
// never define the constant.
export const DEV_MODE = typeof __DEV_MODE__ === 'undefined' ? false : __DEV_MODE__;
const HIDDEN_ROUTER_KEY = 'nightfall.hidden-router.v1';

// The production title's 1111 code is an intentional playtest doorway. It
// grants only this browser tab's session permission to use the existing named
// test nodes; normal players can neither see the router nor activate a query
// route by typing one into the address bar.
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
  return DEV_MODE || hiddenRouterActive();
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

// True when the URL already names a starting point, which is what tells
// main.js to boot straight into the game instead of showing the chapter
// select. It keeps every `?qa=` link in docs/ working as a deep link.
export function hasDevRoute(explicitSearch) {
  const params = devParams(explicitSearch);
  return DEV_ROUTE_PARAMS.some((key) => params.has(key));
}

// Rewrite the address bar, then let the caller start Boot. Everything
// downstream (BootScene's preload, GameScene's create, TimetablePuzzle's QA
// routes) reads window.location.search lazily, so putting the choice in the
// URL is all the wiring the chapter select needs — and the resulting URL is
// shareable and survives a reload.
export function enterDevRoute(query) {
  if (!DEV_MODE || typeof window === 'undefined') return;
  const url = `${window.location.pathname}${query ?? ''}${window.location.hash}`;
  window.history.replaceState(null, '', url);
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// `?chapter=N` uses the product's own numbering, which is also the index into
// STORY_WORLDS: 0 is the Prologue, 1 is Chapter One (THE SAFETY TEST), and so
// on. A slugified title works too, so QA links can stay readable while the car
// order is still moving (`?chapter=the-safety-test`).
export function resolveDevChapterIndex(worlds, explicitSearch) {
  const requested = devParam('chapter', explicitSearch);
  if (!requested) return null;

  const numeric = Number(requested);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric < worlds.length) return numeric;

  const normalized = slugify(requested);
  if (normalized === 'prologue') return 0;
  const index = worlds.findIndex(
    (world) => slugify(world.title) === normalized || slugify(world.texture) === normalized,
  );
  return index >= 0 ? index : null;
}

// A chapter's startX is where its backdrop takes over, not somewhere a body
// can stand: worlds 1, 3 and 8 all begin over a hole in the near lane. Land
// the warp on the first ground run that can actually hold the player.
const SPAWN_MARGIN = 48;

export function resolveChapterSpawn(worlds, index, solids, lane, fallbackY = 400) {
  const targetX = worlds[index]?.startX ?? 0;
  const ground = solids
    .filter((solid) => solid.lane === lane && solid.kind === 'ground')
    .sort((a, b) => a.x - b.x);
  const landing =
    ground.find((seg) => targetX <= seg.x + seg.w - SPAWN_MARGIN) ?? ground[ground.length - 1];
  if (!landing) return { x: targetX, y: fallbackY, lane };

  const min = landing.x + SPAWN_MARGIN;
  const max = landing.x + landing.w - SPAWN_MARGIN;
  return { x: Math.min(Math.max(targetX, min), max), y: fallbackY, lane };
}
