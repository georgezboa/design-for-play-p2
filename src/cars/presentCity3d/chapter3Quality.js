// Chapter 3 · ECHO CITY — render quality tiers.
//
// The city is heavy (hundreds of thousands of triangles, PCF soft shadows
// over the whole district, transmissive water). On a slow GPU the frame time
// climbs past what reads as a game, so the preview measures it after loading
// and drops to the LOW tier once, for the rest of the visit:
//   * pixel ratio ≤ LOW_PIXEL_RATIO (the DOM captions and tags stay sharp);
//   * no shadow maps;
//   * the cool fill light off (the sky light lifts to cover it);
//   * cheaper materials: no bump / roughness / metalness maps, no water
//     transmission pass;
//   * the far city beyond the view is hidden (checked twice a second).
// If frames are still slow on LOW (measured the same way, after LOW is in
// place, including when the Settings checkbox pinned it), it drops once more
// to LOWEST: the same, at half resolution (pixel ratio LOWEST_PIXEL_RATIO).
// The canvas is upscaled; captions and tags are DOM, so text stays crisp.
//
// A player (or QA) can pin the tier: localStorage nightfall.echoCity.quality
// = 'low' | 'high' | 'auto' (default auto). The decision logic is pure so a
// node test can drive it with frame times.

export const QUALITY_STORAGE_KEY = 'nightfall.echoCity.quality';
export const QUALITY_TIERS = Object.freeze(['high', 'low', 'lowest']);
// Alpha round 4 (P1, 1 fps on LOW): LOW draws at 0.7 (was 0.8) and LOWEST
// at half resolution (was 0.55); a city pinned to LOW also drops MSAA
// (EchoCity3DPreview). The DOM captions and tags stay at full resolution.
export const LOW_PIXEL_RATIO = 0.7;
export const LOWEST_PIXEL_RATIO = 0.5;

// Frames slower than this (median, after warm-up) choose LOW.
export const SLOW_FRAME_MS = 45;
const WARMUP_SECONDS = 2;
const SAMPLE_SECONDS = 3;

export function storedQualityPreference(storage = globalThis.localStorage) {
  // The shared Settings checkbox (LOW GRAPHICS) pins the low tier everywhere.
  if (globalThis.NIGHTFALL_SETTINGS?.lowGraphics === true) return 'low';
  try {
    const value = storage?.getItem?.(QUALITY_STORAGE_KEY);
    return value === 'low' || value === 'high' ? value : 'auto';
  } catch {
    return 'auto';
  }
}

// Feed it each frame's wall time (seconds). It returns 'low' exactly once,
// on the frame the city is judged too slow, and then 'lowest' at most once if
// LOW is still too slow; otherwise null. A pinned 'high' never changes; a
// pinned 'low' can still drop to 'lowest'.
export function createQualityMonitor({ preference = 'auto', slowFrameMs = SLOW_FRAME_MS } = {}) {
  let tier = preference === 'low' ? 'low' : 'high';
  let elapsed = 0;
  // `decided` keeps its 1.0 meaning: the HIGH/LOW choice is made.
  let decided = preference !== 'auto';
  let done = preference === 'high';
  let samples = [];
  const median = () => {
    const sorted = [...samples].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  return {
    get tier() { return tier; },
    get decided() { return decided; },
    sample(frameSeconds) {
      if (done) return null;
      elapsed += frameSeconds;
      if (elapsed < WARMUP_SECONDS) return null;
      samples.push(frameSeconds * 1000);
      if (elapsed < WARMUP_SECONDS + SAMPLE_SECONDS) return null;
      const slow = median() > slowFrameMs;
      if (tier === 'high') {
        decided = true;
        if (!slow) {
          done = true;
          return null;
        }
        // Measure LOW afresh (its own warm-up: shaders recompile).
        tier = 'low';
        elapsed = 0;
        samples = [];
        return 'low';
      }
      done = true;
      decided = true;
      if (!slow) return null;
      tier = 'lowest';
      return 'lowest';
    },
    snapshot() {
      return { tier, decided, samples: samples.length, medianMs: Math.round(median()) };
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
