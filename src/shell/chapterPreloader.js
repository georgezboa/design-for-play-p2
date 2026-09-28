import {
  PRELOAD_JOB_CEILING_MS,
  PRELOAD_STALL_TIMEOUT_MS,
  cacheResource,
  createCeiling,
  runQueue,
} from './preloadQueue.js';

const CHAPTER03_MODELS = [
  'old_municipal_archive_web.glb', 'transit_ministry_web.glb', 'scanner_tower_web.glb',
  'clock_tower_web.glb', 'reunion_fountain_web.glb', 'municipal_tram_web.glb',
  'ch03_abandoned_compact_car.glb', 'ch03_street_campfire.glb', 'ch03_crushed_trash_can.glb',
  'produce_market_stall_web.glb', 'ch03_queue_dispenser.glb', 'ch03_produce_scale.glb',
  'ch03_porter_handcart.glb', 'ch03_receipt_spike.glb', 'ch03_queue_stanchion.glb',
  'ch03_clerk_stamp_machine.glb', 'ch03_crosswalk_signal.glb', 'ch03_fountain_bench.glb',
  'ch03_pa_speaker.glb', 'ch03_night_ticket_reader.glb', 'ch03_open_air_station.glb',
  'ch03_tram_tunnel_portal.glb', 'ch03_perimeter_tenement.glb',
  'ch03_perimeter_corner_arcade.glb', 'ch03_perimeter_workers_hall.glb',
  'ch03_shop_bakery_tenement.glb', 'ch03_shop_pharmacy_corner.glb',
  'ch03_shop_printworks_rowhouse.glb', 'ch03_landmark_copper_heron_hotel.glb',
  'ch03_landmark_civic_night_arcade.glb', 'ch03_cliff_overlook_platform.glb',
].map((file) => `/assets/chapter03-3d/models/${file}`);

// Echo City gates only what the platform needs at start: the city itself,
// Butch and Lev, the shared animation library, the paving materials and the
// arrival score. The market cast, the interior sets and the later music
// stream in during play (Chapter3OpeningRuntime.streamDeferredAssets).
const CHAPTER03_START_CHARACTERS = [
  'butch_shared_rig.glb', 'lev_shared_rig.glb',
].map((file) => `/assets/chapter03-3d/characters/${file}`);

const CHAPTER03_MATERIALS = [
  'worn-limestone-albedo.webp', 'worn-limestone-height.webp',
  'worn-limestone-roughness.webp', 'worn-limestone-dark-albedo.webp', 'dark-city-cobbles.webp',
].map((file) => `/assets/chapter03-3d/materials/${file}`);

const CHAPTER03_START_MUSIC = ['/assets/music/ch3/3.1_satie_gnossienne_no1.mp3'];

const CHAPTER1_WORLD = Object.values(import.meta.glob('../assets/generated/worlds/world-01-tutorial/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
}));

const CHAPTER2_WORLD = Object.values(import.meta.glob('../assets/generated/worlds/world-04-retro-cyberpunk/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
}));

const MUSEUM_TEXTURES = ['beige_wall_001', 'dark_wood', 'dirty_carpet', 'rubber_tiles', 'wood_table_001']
  .flatMap((folder) => ['diffuse.jpg', 'normal_gl.jpg', 'roughness.jpg']
    .map((file) => `/museum3d/textures/${folder}/${file}`));

export const CHAPTER_PRELOAD_PROFILES = Object.freeze({
  // Chapter 1 is night-service.html; its windows paint from the night fields.
  chapter1: Object.freeze({ route: '/night-service.html', assets: Object.freeze(CHAPTER1_WORLD) }),
  chapter2: Object.freeze({
    route: '/borrowed-light.html',
    assets: Object.freeze([...CHAPTER2_WORLD, '/assets/music/ch1/1.3_neon_safety_test.mp3']),
  }),
  chapter3: Object.freeze({
    route: '/car03-3d.html',
    concurrency: 6,
    assets: Object.freeze([
      ...CHAPTER03_MODELS,
      ...CHAPTER03_START_CHARACTERS,
      ...CHAPTER03_MATERIALS,
      ...CHAPTER03_START_MUSIC,
      '/assets/chapter03-3d/animations/quaternius_ual1_standard.glb',
    ]),
  }),
  chapter4: Object.freeze({
    route: '/painted-country.html',
    assets: Object.freeze([
      '/assets/music/ch4/4.3_debussy_reflets_dans_leau.mp3',
      '/assets/music/ch4/4.2_debussy_snow_is_dancing.mp3',
    ]),
  }),
  chapter5: Object.freeze({
    route: '/museum-3d.html',
    assets: Object.freeze([
      '/museum3d/models/ch05_corded_desk_telephone.glb',
      '/museum3d/models/ch05_automatic_archive_cart.glb',
      ...MUSEUM_TEXTURES,
      '/museum3d/textures/glass_fingerprints/normal_gl.jpg',
      '/museum3d/textures/glass_fingerprints/opacity.jpg',
      '/museum3d/textures/glass_fingerprints/roughness.jpg',
    ]),
  }),
  chapter6: Object.freeze({
    route: '/final-boss.html?from=chapter5',
    priority: 'high',
    assets: Object.freeze([
      '/assets/music/ch6/6.1_threshold_modern.mp3',
      '/assets/music/ch6/6.2_grid_modern.mp3',
      '/assets/music/ch6/6.3_dvorak_new_world_mvt4_theme.mp3',
      '/assets/music/ch6/6.4_mussorgsky_kiev_gate.mp3',
      '/assets/music/ch6/6.5_night_train_departure.mp3',
      '/assets/chapter03-3d/characters/male_municipal_shared_rig.glb',
      '/assets/chapter03-3d/characters/butch_shared_rig.glb',
      '/assets/chapter03-3d/models/municipal_tram_web.glb',
      '/assets/chapter03-3d/models/ch03_open_air_station.glb',
      '/assets/chapter03-3d/models/reunion_fountain_web.glb',
      '/assets/chapter03-3d/models/clock_tower_web.glb',
      '/assets/chapter03-3d/models/old_municipal_archive_web.glb',
      '/assets/chapter03-3d/models/ch03_perimeter_tenement.glb',
      '/assets/chapter03-3d/models/ch03_perimeter_workers_hall.glb',
      '/assets/chapter03-3d/models/ch03_shop_bakery_tenement.glb',
      '/assets/chapter03-3d/models/ch03_shop_printworks_rowhouse.glb',
      '/assets/chapter03-3d/models/ch03_crushed_trash_can.glb',
      '/assets/chapter03-3d/models/ch03_fountain_bench.glb',
      '/assets/chapter03-3d/models/ch03_pa_speaker.glb',
    ]),
  }),
  hiddenBoss: Object.freeze({
    route: '/hidden-final-boss.html?from=chapter5',
    priority: 'high',
    assets: Object.freeze([]),
  }),
});

const jobs = new Map();
const jobStates = new Map();

function absolute(url, base = window.location.href) {
  return new URL(url, base).href;
}

function dispatchProgress(detail) {
  jobStates.set(detail.chapterId, detail);
  globalThis.dispatchEvent?.(new CustomEvent('nightfall:preload', { detail }));
}

function discoverPageResources(html, route) {
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const elements = [...doc.querySelectorAll('script[type="module"][src], link[rel="stylesheet"][href], link[rel="modulepreload"][href], link[rel="preload"][href]')];
  return elements
    .map((element) => element.getAttribute('src') || element.getAttribute('href'))
    .filter(Boolean)
    .map((url) => absolute(url, absolute(route)));
}

export function preloadChapter(chapterId, {
  signal,
  stallTimeoutMs = PRELOAD_STALL_TIMEOUT_MS,
  ceilingMs = PRELOAD_JOB_CEILING_MS,
} = {}) {
  if (jobs.has(chapterId)) return jobs.get(chapterId);
  const profile = CHAPTER_PRELOAD_PROFILES[chapterId];
  if (!profile || typeof window === 'undefined') return Promise.resolve(null);

  const state = { chapterId, status: 'loading', loaded: 0, failed: 0, total: profile.assets.length + 1 };
  dispatchProgress({ ...state });
  // A stalled or missing request must never hold a hard-gated transition
  // forever: each resource has a stall timeout and the job has a ceiling.
  const ceiling = createCeiling(profile.ceilingMs ?? ceilingMs, signal);
  const promise = (async () => {
    const route = absolute(profile.route);
    let pageResources = [];
    try {
      const html = await cacheResource(route, { signal: ceiling.signal, stallTimeoutMs, as: 'text' });
      pageResources = discoverPageResources(html, route);
      state.loaded += 1;
    } catch (error) {
      if (error?.name === 'AbortError' && !ceiling.timedOut()) throw error;
      state.failed += 1;
    }

    // Runtime-critical public assets go first. Modulepreload hints above fetch
    // the code graph independently; putting that graph at the head of this
    // queue can otherwise delay the first music/model request behind a large
    // transitive bundle.
    const urls = [...new Set([...profile.assets.map((url) => absolute(url)), ...pageResources])];
    state.total = urls.length + 1;
    dispatchProgress({ ...state });
    await runQueue(urls, {
      signal: ceiling.signal,
      onSettled: (_url, ok) => {
        if (ok) state.loaded += 1;
        else state.failed += 1;
        dispatchProgress({ ...state });
      },
      concurrency: profile.concurrency ?? 2,
      priority: profile.priority,
      stallTimeoutMs,
    });
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    state.status = ceiling.timedOut() ? 'timeout' : state.failed ? 'partial' : 'ready';
    dispatchProgress({ ...state });
    return { ...state };
  })().catch((error) => {
    const result = { ...state, status: error?.name === 'AbortError' ? 'cancelled' : 'partial', error };
    dispatchProgress(result);
    return result;
  }).finally(() => ceiling.clear());

  jobs.set(chapterId, promise);
  globalThis.NIGHTFALL_PRELOADS = jobs;
  return promise;
}

// Latest progress snapshot for a job ({ loaded, failed, total, status }).
export function getChapterPreloadState(chapterId) {
  return jobStates.get(chapterId) ?? null;
}

export function getChapterPreload(chapterId) {
  return jobs.get(chapterId) ?? null;
}

export function resetChapterPreloadsForTests() {
  jobs.clear();
  jobStates.clear();
}
