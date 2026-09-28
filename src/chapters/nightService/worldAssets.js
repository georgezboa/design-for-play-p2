// Painted panoramas and paper grain for NIGHT SERVICE (spec §5). These are
// the pipeline's generated JPEG chunks, not the full-resolution masters, so
// the same hashed URLs are shared with the chapter preloader.

import paperUrl from '../../assets/shared/painterly/paper-texture-ivory-v01.png?url';

const fields = import.meta.glob('../../assets/generated/worlds/world-01-tutorial/*.jpg', { eager: true, query: '?url', import: 'default' });
const city = import.meta.glob('../../assets/generated/worlds/world-03-present-city/*.jpg', { eager: true, query: '?url', import: 'default' });
const memory = import.meta.glob('../../assets/generated/worlds/world-07-memory/*.jpg', { eager: true, query: '?url', import: 'default' });

const sorted = (glob) => Object.keys(glob).sort().map((path) => glob[path]);

export const PAPER_URL = paperUrl;

/**
 * name → { key: loop texture key, chunks: [{ key, url }] }. `fields` loops the
 * canal-and-sunset end of the night fields; `memory` the houses by the water.
 */
export const WORLDS = Object.freeze({
  fields: { key: 'nsv-loop-fields', chunks: sorted(fields).slice(1, 3).map((url, i) => ({ key: `nsv-w01-${i + 1}`, url })) },
  city: { key: 'nsv-loop-city', chunks: sorted(city).slice(0, 2).map((url, i) => ({ key: `nsv-w03-${i}`, url })) },
  memory: { key: 'nsv-loop-memory', chunks: sorted(memory).slice(0, 2).map((url, i) => ({ key: `nsv-w07-${i}`, url })) },
});

export const PRELOAD_URLS = Object.freeze([PAPER_URL, ...Object.values(WORLDS).flatMap((world) => world.chunks.map((chunk) => chunk.url))]);
