// Every film ships twice at the same size: H.264 / AAC in an MP4 and a
// VP9 / Opus WebM beside it (same name, .webm). The player picks by
// canPlayType, and falls back to the other file if the first one fails to
// decode, so a browser without H.264 (Chromium builds, headless QA) still
// plays every film instead of skipping it.
export const CINEMATIC_TYPES = Object.freeze({
  mp4: 'video/mp4; codecs="avc1.4D401F, mp4a.40.2"',
  webm: 'video/webm; codecs="vp9, opus"',
});

/** [mp4, webm] for a film path (a non-MP4 path is its own only source). */
export function cinematicSources(src) {
  if (typeof src !== 'string' || !/\.mp4(\?|#|$)/i.test(src)) return [src];
  return [src, src.replace(/\.mp4(?=(\?|#|$))/i, '.webm')];
}

/**
 * The sources to try, best first: whatever the browser says it plays
 * ("probably" beats "maybe"), MP4 on a tie.
 */
export function orderCinematicSources(src, canPlayType = () => 'maybe') {
  const sources = cinematicSources(src);
  if (sources.length < 2) return sources;
  const rank = (answer) => (answer === 'probably' ? 2 : answer === 'maybe' ? 1 : 0);
  const [mp4, webm] = sources;
  const mp4Rank = rank(canPlayType(CINEMATIC_TYPES.mp4));
  const webmRank = rank(canPlayType(CINEMATIC_TYPES.webm));
  return webmRank > mp4Rank ? [webm, mp4] : [mp4, webm];
}
