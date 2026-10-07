// The house typefaces as JS strings, for canvas and Phaser text (round 6,
// owner note G7: towards Kentucky Route Zero). The faces themselves are
// bundled in src/fonts/fonts.css; DOM text uses the CSS variables of
// src/shell/uiKit.css (--nf-serif, --nf-ui, --nf-display), which name the
// same stacks.
//
//   FONT_SERIF  EB Garamond: narrative, dialogue, letters, cards
//   FONT_UI     Jost, in letter-spaced capitals: labels, menus, titles, keys
//
// Weights bundled: EB Garamond 400 / 400 italic / 600; Jost 300 / 400 / 500 /
// 600. Ask for one of those (a 700 is drawn with the 600).
//
// Canvas and Phaser draw with whatever face is loaded at that moment, so text
// drawn before the font arrives stays in the fallback. Wait first:
//   import { FONT_UI, waitForFonts } from '../shared/fonts.js';
//   await waitForFonts();          // resolves within `timeoutMs` either way
//   this.add.text(x, y, 'DEPARTURES', { fontFamily: FONT_UI, fontSize: '22px', letterSpacing: 4 });

export const FONT_SERIF_FAMILY = 'EB Garamond';
export const FONT_UI_FAMILY = 'Jost';

export const FONT_SERIF = "'EB Garamond', Garamond, Georgia, 'Times New Roman', serif";
export const FONT_UI = "'Jost', 'Futura', 'Century Gothic', 'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
// Titles are the UI face, light and widely spaced (no condensed display face).
export const FONT_DISPLAY = FONT_UI;

// Tracking for UI capitals, as a fraction of the font size (canvas
// `ctx.letterSpacing`, Phaser's `letterSpacing` in px = size × this).
export const UI_TRACKING = 0.18;
export const TITLE_TRACKING = 0.32;

/** A canvas `font` shorthand: canvasFont(22, { weight: 500 }) → "500 22px 'Jost', …". */
export function canvasFont(size, { family = FONT_UI, weight = 400, italic = false } = {}) {
  return `${italic ? 'italic ' : ''}${weight} ${Math.round(size * 100) / 100}px ${family}`;
}

/** Letter spacing in px for UI capitals at `size` (canvas / Phaser). */
export const trackingPx = (size, tracking = UI_TRACKING) => Math.round(size * tracking * 100) / 100;

// One request per bundled face (the fonts load lazily: a face is fetched only
// once something asks for it).
export const HOUSE_FACES = Object.freeze([
  `300 16px ${FONT_UI_FAMILY}`,
  `400 16px ${FONT_UI_FAMILY}`,
  `500 16px ${FONT_UI_FAMILY}`,
  `600 16px ${FONT_UI_FAMILY}`,
  `400 16px "${FONT_SERIF_FAMILY}"`,
  `italic 400 16px "${FONT_SERIF_FAMILY}"`,
  `600 16px "${FONT_SERIF_FAMILY}"`,
]);

/**
 * Load the house faces (or `faces`), then resolve true; resolve false after
 * `timeoutMs` (or with no FontFace API) so a slow disk never holds a scene.
 */
export function waitForFonts({ faces = HOUSE_FACES, timeoutMs = 1200, doc = globalThis.document } = {}) {
  const fonts = doc?.fonts;
  if (!fonts?.load) return Promise.resolve(false);
  const loaded = Promise.all(faces.map((face) => fonts.load(face).catch(() => null)))
    .then(() => fonts.ready)
    .then(() => true, () => false);
  let timer = null;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(false), timeoutMs); });
  return Promise.race([loaded, timeout]).finally(() => clearTimeout(timer));
}
