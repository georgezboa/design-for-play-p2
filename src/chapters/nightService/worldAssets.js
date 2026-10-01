// Painted panoramas and paper grain for NIGHT SERVICE (spec §5). These are
// the pipeline's generated JPEG chunks, not the full-resolution masters, so
// the same hashed URLs are shared with the chapter preloader.

import paperUrl from '../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
// Act 3's train: the painted Chapter 1 carriage (finalBoss/assets/paper/
// ch1-train-exterior-v01.png) graded for night with its windows lit
// (art/train-night.png, 4x the in-tile size).
import trainUrl from './art/train-night.png?url';

const fields = import.meta.glob('../../assets/generated/worlds/world-01-tutorial/*.jpg', { eager: true, query: '?url', import: 'default' });
const memory = import.meta.glob('../../assets/generated/worlds/world-07-memory/*.jpg', { eager: true, query: '?url', import: 'default' });

const sorted = (glob) => Object.keys(glob).sort().map((path) => glob[path]);

export const PAPER_URL = paperUrl;
export const TRAIN_URL = trainUrl;
/** Texture key of the painted night train (actorRig.js uses it when loaded). */
export const TRAIN_KEY = 'nsv-train-night';

/**
 * name → { key: loop texture key, chunks: [{ key, url }] }. `fields` loops the
 * canal-and-sunset end of the night fields; `memory` the houses by the water
 * (also the dusk town in Mara's city-room window). The daytime present-city
 * panorama (world 03) is not used in Chapter 1 or the exhibit: it is a
 * sunny-day view in a night chapter.
 */
export const WORLDS = Object.freeze({
  fields: { key: 'nsv-loop-fields', chunks: sorted(fields).slice(1, 3).map((url, i) => ({ key: `nsv-w01-${i + 1}`, url })) },
  memory: { key: 'nsv-loop-memory', chunks: sorted(memory).slice(0, 2).map((url, i) => ({ key: `nsv-w07-${i}`, url })) },
});

export const PRELOAD_URLS = Object.freeze([PAPER_URL, ...Object.values(WORLDS).flatMap((world) => world.chunks.map((chunk) => chunk.url))]);
