// Which in-engine cutscene plays for a playCinematic() call (pure: no DOM).
//
// Call sites still pass the ids and film paths they always have
// (gameFlow.js CINEMATICS.*, finalBossRoute.js cinematicId / cinematicPath),
// spelled several ways over the project's life: 'opening', 'chapter-1-to-2',
// 'chapter1To2', '/cinematics/1-2.mp4'. resolveCutsceneId() folds them all
// onto the eight names in docs/CUTSCENES_SPEC.md, and registeredCutscene()
// says whether that cutscene is authored yet. While one is not, gameFlow.js
// keeps playing its film.
//
// Adding a cutscene: write src/shell/cutscene/scenes/<name>.js (README.md)
// and add one line to CUTSCENE_LOADERS.

export const CUTSCENE_IDS = Object.freeze([
  'opening',
  'chapter1To2',
  'chapter2To3',
  'chapter3To4',
  'chapter4To5',
  'chapter5-to-conductor',
  'chapter5-to-black-knife',
  'ending',
]);

/** The film each cutscene replaces (public/cinematics/<name>.mp4|webm). */
export const FILM_NAMES = Object.freeze({
  opening: 'start',
  chapter1To2: '1-2',
  chapter2To3: '2-3',
  chapter3To4: '3-4',
  chapter4To5: '4-5',
  'chapter5-to-conductor': '5-6-conductor',
  'chapter5-to-black-knife': '5-6-black-knife',
  ending: 'end',
});

/** Authored cutscenes, each its own chunk. */
export const CUTSCENE_LOADERS = Object.freeze({
  opening: () => import('./scenes/opening.js'),
  chapter1To2: () => import('./scenes/chapter1To2.js'),
  chapter2To3: () => import('./scenes/chapter2To3.js'),
  ending: () => import('./scenes/ending.js'),
});

const fold = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const BY_KEY = new Map();
CUTSCENE_IDS.forEach((id) => {
  BY_KEY.set(fold(id), id);
  BY_KEY.set(fold(FILM_NAMES[id]), id);
});
// other spellings in the code base and the old film scripts
[['start', 'opening'], ['intro', 'opening'], ['end', 'ending'], ['normalending', 'ending'],
  ['chapter56conductor', 'chapter5-to-conductor'], ['chapter5toconductor', 'chapter5-to-conductor'],
  ['chapter56blackknife', 'chapter5-to-black-knife'], ['chapter5toblackknife', 'chapter5-to-black-knife'],
  ['chapter5toblackticket', 'chapter5-to-black-knife'],
].forEach(([key, id]) => BY_KEY.set(key, id));

/** The film name in a src such as '/cinematics/1-2.mp4' or 'cinematics/end.webm?v=2'. */
export function filmName(src) {
  if (typeof src !== 'string') return null;
  const match = src.match(/([^/?#]+)\.(?:mp4|webm)(?:[?#].*)?$/i);
  return match ? match[1] : null;
}

/** The cutscene name for an id and/or a film src, or null when neither is one. */
export function resolveCutsceneId(id, src) {
  for (const key of [id, filmName(src)]) {
    if (key == null) continue;
    const found = BY_KEY.get(fold(key));
    if (found) return found;
  }
  return null;
}

/** The authored cutscene for this call, or null: then the film plays. */
export function registeredCutscene(id, src, loaders = CUTSCENE_LOADERS) {
  const name = resolveCutsceneId(id, src);
  return name && typeof loaders[name] === 'function' ? name : null;
}

export async function loadCutscene(name, loaders = CUTSCENE_LOADERS) {
  const loader = loaders[name];
  if (!loader) return null;
  const module = await loader();
  return module.default ?? module.cutscene ?? null;
}
