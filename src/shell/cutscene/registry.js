// Which in-engine cutscene plays for a playCinematic() call (pure: no DOM).
//
// Call sites pass ids spelled several ways over the project's life
// (gameFlow.js CINEMATICS.*, finalBossRoute.js cinematicId / cinematicPath):
// 'opening', 'chapter-1-to-2', 'chapter1To2', and the retired films' paths
// such as '/cinematics/1-2.mp4' (old saves, notes, scripts).
// resolveCutsceneId() folds them all onto the eight names in
// docs/CUTSCENES_SPEC.md, and registeredCutscene() names the cutscene to
// play; with none, gameFlow.js skips the transition (there is no film).
//
// Adding a cutscene: write src/shell/cutscene/scenes/<name>.js (README.md)
// and add one line to CUTSCENE_LOADERS.

import { COMPLETE } from './painted/plates.generated.js';
import { devParam } from '../../devMode.js';

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

/** The retired film each cutscene replaced (its old path still resolves). */
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

/** The round-6 drawn cutscenes, each its own chunk. */
export const DRAWN_LOADERS = Object.freeze({
  opening: () => import('./scenes/opening.js'),
  chapter1To2: () => import('./scenes/chapter1To2.js'),
  chapter2To3: () => import('./scenes/chapter2To3.js'),
  chapter3To4: () => import('./scenes/chapter3To4.js'),
  chapter4To5: () => import('./scenes/chapter4To5.js'),
  ending: () => import('./scenes/ending.js'),
  'chapter5-to-conductor': () => import('./scenes/chapter5-to-conductor.js'),
  'chapter5-to-black-knife': () => import('./scenes/chapter5-to-black-knife.js'),
});

/**
 * Round 9 · the painted cutscenes (painted/, docs/CUTSCENES_PAINTED.md):
 * George's paintings. One plays instead of its drawn twin once every one of
 * its paintings is in (plates.generated.js COMPLETE, written by
 * scripts/cutscene-art/build.py); until then the drawn one plays. Dev
 * builds: `?cutscenes=painted` plays the painted ones with stand-ins,
 * `?cutscenes=drawn` the drawn ones.
 */
export const PAINTED_LOADERS = Object.freeze({
  opening: () => import('./painted/opening.js'),
  chapter1To2: () => import('./painted/chapter1To2.js'),
  chapter2To3: () => import('./painted/chapter2To3.js'),
  chapter3To4: () => import('./painted/chapter3To4.js'),
  chapter4To5: () => import('./painted/chapter4To5.js'),
  'chapter5-to-conductor': () => import('./painted/chapter5-to-conductor.js'),
  'chapter5-to-black-knife': () => import('./painted/chapter5-to-black-knife.js'),
  ending: () => import('./painted/ending.js'),
});

/** Which version of a cutscene plays: 'painted' or 'drawn'. Pure: `complete` and `flag` are passed in by the caller in tests. */
export function cutsceneVersion(name, { complete = COMPLETE, flag = devParam('cutscenes') ?? null, painted = PAINTED_LOADERS } = {}) {
  if (!painted[name]) return 'drawn';
  if (flag === 'drawn') return 'drawn';
  if (flag === 'painted') return 'painted';
  return complete[name] === true ? 'painted' : 'drawn';
}

/** Authored cutscenes: the painted version where it is ready, else the drawn one. */
export const CUTSCENE_LOADERS = Object.freeze(Object.fromEntries(Object.keys(DRAWN_LOADERS).map((name) => [
  name,
  () => (cutsceneVersion(name) === 'painted' ? PAINTED_LOADERS[name]() : DRAWN_LOADERS[name]()),
])));

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

/** The authored cutscene for this call, or null: then the transition is skipped. */
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
