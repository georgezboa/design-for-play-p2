// Chapter 6 finale (and the Black Ticket): render quality tiers.
//
// The shared Settings checkbox LOW GRAPHICS · SLOWER COMPUTERS
// (globalThis.NIGHTFALL_SETTINGS.lowGraphics) pins the LOW tier from the
// first frame. Otherwise the fight starts HIGH and measures itself: once
// the movement is being played, after a short warm-up, a median frame
// slower than SLOW_FRAME_MS drops it to LOW for the rest of the visit (the
// same rule as Chapter 3's chapter3Quality.js).
//
// LOW, in the Conductor's three.js stage:
//   * no MSAA (antialias is fixed when the context is made, so only a
//     setting read at load can turn it off);
//   * pixel ratio ≤ LOW_PIXEL_RATIO (the DOM HUD stays sharp);
//   * no shadow maps;
//   * lit PBR materials become Lambert (painted cards are unlit already).
// In the Black Ticket's Phaser stage: no antialias, half the particles.
//
// Pure: node tests drive it with frame times (tests/finalBoss/alphaFixes2).

export const SLOW_FRAME_MS = 45;
export const LOW_PIXEL_RATIO = 0.75;
export const HIGH_PIXEL_RATIO = 1.6;
const WARMUP_SECONDS = 2;
const SAMPLE_SECONDS = 3;

export function lowGraphicsRequested(settings = globalThis.NIGHTFALL_SETTINGS) {
  return settings?.lowGraphics === true;
}

// 'low' when the player asked for it, otherwise 'auto'.
export function finaleQualityPreference(settings = globalThis.NIGHTFALL_SETTINGS) {
  return lowGraphicsRequested(settings) ? 'low' : 'auto';
}

export function finalePixelRatio(tier, devicePixelRatio = 1) {
  const dpr = Number(devicePixelRatio) > 0 ? Number(devicePixelRatio) : 1;
  return Math.min(dpr, tier === 'low' ? LOW_PIXEL_RATIO : HIGH_PIXEL_RATIO);
}

// Feed it each played frame's wall time (seconds). It returns 'low' exactly
// once, on the frame the stage is judged too slow; otherwise null.
export function createFinaleQualityMonitor({ preference = 'auto', slowFrameMs = SLOW_FRAME_MS, warmupSeconds = WARMUP_SECONDS, sampleSeconds = SAMPLE_SECONDS } = {}) {
  let tier = preference === 'low' ? 'low' : 'high';
  let decided = preference === 'low';
  let elapsed = 0;
  let reason = preference === 'low' ? 'setting' : null;
  const samples = [];
  const median = () => {
    const sorted = [...samples].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  return {
    get tier() { return tier; },
    get decided() { return decided; },
    sample(frameSeconds) {
      if (decided) return null;
      const seconds = Math.max(0, Number(frameSeconds) || 0);
      elapsed += seconds;
      if (elapsed < warmupSeconds) return null;
      samples.push(seconds * 1000);
      if (elapsed < warmupSeconds + sampleSeconds) return null;
      decided = true;
      if (median() > slowFrameMs) {
        tier = 'low';
        reason = 'slow-frames';
        return 'low';
      }
      return null;
    },
    // The setting turned on mid-fight (pause menu): drop now.
    force(why = 'setting') {
      if (tier === 'low') return null;
      tier = 'low';
      decided = true;
      reason = why;
      return 'low';
    },
    snapshot() {
      return { tier, decided, reason, samples: samples.length, medianMs: Math.round(median()) };
    },
  };
}

// Frame-rate independence (alpha round 4): game time follows the wall clock
// down to 10 fps. A frame's wall time is capped at MAX_FRAME_SECONDS (a
// longer stall, a tab switch, is not played as one leap; 0.125 s rather
// than 0.1 so the frame-to-frame jitter of a ~10 fps machine does not cost
// a fifth of its game time, as measured on software GL) and split into
// substeps no longer than MAX_STEP_SECONDS, so walks, timers, falling cases
// and collisions behave on a 12 fps laptop as they do at 60 (nothing jumps
// through a hit test in one step).
export const MAX_FRAME_SECONDS = 0.125;
export const MAX_STEP_SECONDS = 1 / 30;

export function frameSteps(wallSeconds, { cap = MAX_FRAME_SECONDS, step = MAX_STEP_SECONDS } = {}) {
  const total = Math.min(cap, Math.max(0, Number(wallSeconds) || 0));
  if (total <= 0) return [];
  const count = Math.ceil(total / step - 1e-9);
  return Array.from({ length: count }, () => total / count);
}
