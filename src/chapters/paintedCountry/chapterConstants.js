// Chapter 4 // THE PAINTED COUNTRY — shared UI constants (no Phaser, so the
// node tests can read them). chapterUi.js re-exports all of these.

export const SERIF = 'Georgia, "Times New Roman", "DejaVu Serif", serif';
export const MONO = '"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

// One hold time for every hold in the chapter (take, apply, board, exit).
export const HOLD_SECONDS = 0.25;
// Restarting a room wipes what was painted, so it is a deliberate act.
export const RESTART_HOLD_SECONDS = 1;

// The smallest text the chapter draws, in design pixels. The 960×600 view is
// scaled ×1.8 at 1080p and ×1.2 at 720p, so 11 px reads as ~20 px / ~13 px.
export const MIN_FONT_PX = 11;

export const UI = Object.freeze({
  walnut: 0x1c130d,
  walnut2: 0x2a1d14,
  brass: 0xb08a4a,
  brassHi: 0xd9b56e,
  ivory: '#eadfc6',
  paper: 0xefe4cc,
  ink: '#2a1d14',
  inkSoft: '#6b5640',
  amber: 0xe0a24a,
  amberInk: 0xc8892f,
  amberCss: '#b87418',
  oxblood: '#8a2a1e',
  rose: '#c46a7a',
});

export const VIEW_SIZE = Object.freeze({ w: 960, h: 600 });
// Top 52 px is the room's title strip; the rest is a 16 px gutter.
export const SAFE = Object.freeze({ left: 16, right: VIEW_SIZE.w - 16, top: 52, bottom: VIEW_SIZE.h - 16 });

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Where a w×h prompt anchored at (x, y) (bottom-centre) may sit on screen.
export const clampToSafe = (x, y, w, h) => ({
  x: clamp(x, SAFE.left + w / 2, SAFE.right - w / 2),
  y: clamp(y, SAFE.top + h, SAFE.bottom),
});
