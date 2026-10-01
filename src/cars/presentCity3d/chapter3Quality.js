// Chapter 3 · ECHO CITY — render quality tiers.
//
// The city is heavy (hundreds of thousands of triangles, PCF soft shadows
// over the whole district, transmissive water). On a slow GPU the frame time
// climbs past what reads as a game, so the preview measures it after loading
// and drops to the LOW tier once, for the rest of the visit:
//   * pixel ratio ≤ 0.8 (the DOM captions and tags stay sharp);
//   * no shadow maps;
//   * the cool fill light off (the sky light lifts to cover it);
//   * cheaper materials: no bump / roughness / metalness maps, no water
//     transmission pass;
//   * the far city beyond the view is hidden (checked twice a second).
//
// A player (or QA) can pin the tier: localStorage nightfall.echoCity.quality
// = 'low' | 'high' | 'auto' (default auto). The decision logic is pure so a
// node test can drive it with frame times.

export const QUALITY_STORAGE_KEY = 'nightfall.echoCity.quality';
export const QUALITY_TIERS = Object.freeze(['high', 'low']);

// Frames slower than this (median, after warm-up) choose LOW.
export const SLOW_FRAME_MS = 45;
const WARMUP_SECONDS = 2;
const SAMPLE_SECONDS = 3;

export function storedQualityPreference(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem?.(QUALITY_STORAGE_KEY);
    return value === 'low' || value === 'high' ? value : 'auto';
  } catch {
    return 'auto';
  }
}

// Feed it each frame's wall time (seconds). It returns 'low' exactly once,
// on the frame the city is judged too slow; otherwise null.
export function createQualityMonitor({ preference = 'auto', slowFrameMs = SLOW_FRAME_MS } = {}) {
  let tier = preference === 'low' ? 'low' : 'high';
  let elapsed = 0;
  let decided = preference !== 'auto';
  const samples = [];
  return {
    get tier() { return tier; },
    get decided() { return decided; },
    sample(frameSeconds) {
      if (decided) return null;
      elapsed += frameSeconds;
      if (elapsed < WARMUP_SECONDS) return null;
      samples.push(frameSeconds * 1000);
      if (elapsed < WARMUP_SECONDS + SAMPLE_SECONDS) return null;
      decided = true;
      const sorted = [...samples].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      if (median > slowFrameMs) {
        tier = 'low';
        return 'low';
      }
      return null;
    },
    snapshot() {
      const sorted = [...samples].sort((a, b) => a - b);
      return { tier, decided, samples: samples.length, medianMs: Math.round(sorted[Math.floor(sorted.length / 2)] ?? 0) };
    },
  };
}

// Strip the costly parts of a material in place (identity is kept, so the
// building-occlusion fade that holds material references keeps working).
export function cheapenMaterial(material) {
  if (!material || material.userData?.chapter3Cheap) return false;
  let changed = false;
  for (const slot of ['bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'displacementMap', 'envMap']) {
    if (material[slot]) {
      material[slot] = null;
      changed = true;
    }
  }
  if ('transmission' in material && material.transmission > 0) {
    material.transmission = 0;
    changed = true;
  }
  material.userData = { ...(material.userData ?? {}), chapter3Cheap: true };
  if (changed) material.needsUpdate = true;
  return changed;
}
