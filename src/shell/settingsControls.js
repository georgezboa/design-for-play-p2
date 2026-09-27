// The one list of player settings shown by both the title SETTINGS dialog and
// the in-chapter pause menu: [key, label, input type, min, max].
//
// There is deliberately no SUBTITLES toggle: every voiced line in the game is
// always shown as on-screen text, so the old toggle changed nothing.
export const SETTINGS_CONTROLS = Object.freeze([
  Object.freeze(['masterVolume', 'MASTER VOLUME', 'range', 0, 100]),
  Object.freeze(['musicVolume', 'MUSIC VOLUME', 'range', 0, 100]),
  Object.freeze(['sfxVolume', 'SFX VOLUME', 'range', 0, 100]),
  Object.freeze(['textScale', 'TEXT SIZE', 'range', 90, 130]),
  Object.freeze(['reducedMotion', 'REDUCE MOTION', 'checkbox']),
]);
