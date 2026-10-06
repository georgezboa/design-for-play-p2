// Central asset manifest. Spritesheets in public/assets/black-knife/images/conductor are
// Mathias's "Chapter 6 final boss" art drops (frames normalized, bottom-centre
// anchored, packed per animation), gradient-mapped in 2026-09 from the old
// neon palette to the finale's walnut / oxblood / brass / amber / ivory ramp
// for THE BLACK TICKET. Any entry with path:null gets a painted placeholder
// (PreloadScene.makeFallbacks).
//
// The battle music is Mussorgsky's Night on Bald Mountain (Musopen, public
// domain; the opening 0:04-3:53 at -14 LUFS), which replaced an uncleared
// track in 2026-10 (public/assets/black-knife/audio/ASSET_MANIFEST.md).
//
// Round 3: the drops were packed edge to edge, so a dozen frames ran into
// (or were sliced by) their frame. Every frame is now re-packed with
// SHEET_PAD px of clear margin left, right and top (the bottom stays flush on
// the rails), and each straight cut is feathered into the smoke; meta.json
// lists them. Boss.js measures the body inside the padding (bodyWidth /
// bodyHeight), so the hurt-box and the eye/baton/chimney points are where
// they were.
export const SHEET_PAD = Object.freeze({ left: 24, right: 24, top: 24, bottom: 0 });

export const CONDUCTOR_SHEETS = {
  'conductor-idle':   { path: '/assets/black-knife/images/conductor/idle.webp',   sheet: { frameWidth: 447, frameHeight: 452 }, frameRate: 8,  repeat: -1 },
  'conductor-move':   { path: '/assets/black-knife/images/conductor/move.webp',   sheet: { frameWidth: 457, frameHeight: 410 }, frameRate: 10, repeat: -1 },
  'conductor-baton':  { path: '/assets/black-knife/images/conductor/baton.webp',  sheet: { frameWidth: 458, frameHeight: 623 }, frameRate: 10, repeat: 0 },
  'conductor-locom':  { path: '/assets/black-knife/images/conductor/locom.webp',  sheet: { frameWidth: 458, frameHeight: 399 }, frameRate: 12, repeat: -1 },
  'conductor-magic':  { path: '/assets/black-knife/images/conductor/magic.webp',  sheet: { frameWidth: 457, frameHeight: 596 }, frameRate: 9,  repeat: 0 },
  'conductor-damage': { path: '/assets/black-knife/images/conductor/damage.webp', sheet: { frameWidth: 426, frameHeight: 416 }, frameRate: 10, repeat: 0 },
  'conductor-defeat': { path: '/assets/black-knife/images/conductor/defeat.webp', sheet: { frameWidth: 444, frameHeight: 392 }, frameRate: 4,  repeat: 0 },
};

export const IMAGE_MANIFEST = {
  // Player (a punched ticket), projectiles and environment are painted in
  // PreloadScene; drop real art in public/assets and point these paths at it.
  'player-ship': { path: null },
  'bullet-player': { path: null },
  'ticket': { path: null },
  'orb': { path: null },
  'smoke': { path: null },
  'spark': { path: null },
  'signal': { path: null },
  'crossing': { path: null },
};

export const AUDIO_MANIFEST = {
  'music-battle': { path: '/assets/black-knife/audio/night-on-bald-mountain.mp3', loop: true, volume: 0.5 },
  'sfx-shoot': { path: null },
  'sfx-boss-hit': { path: null },
  'sfx-player-hit': { path: null },
  'sfx-shield': { path: null },
  'sfx-baton': { path: null },
  'sfx-train': { path: null },
  'sfx-magic': { path: null },
  'sfx-phase': { path: null },
  'sfx-knockout': { path: null },
};

// Fallback synth tones for any sfx key with no file: [freq, dur, type, vol]
export const TONE_FALLBACKS = {
  'sfx-shoot': [520, 0.06, 'square', 0.025],
  'sfx-boss-hit': [180, 0.08, 'sawtooth', 0.03],
  'sfx-player-hit': [65, 0.25, 'sawtooth', 0.07],
  'sfx-shield': [880, 0.15, 'sine', 0.05],
  'sfx-baton': [140, 0.18, 'square', 0.05],
  'sfx-train': [70, 0.5, 'sawtooth', 0.06],
  'sfx-magic': [660, 0.2, 'triangle', 0.05],
  'sfx-phase': [110, 0.6, 'sawtooth', 0.07],
  'sfx-knockout': [55, 1.2, 'sawtooth', 0.08],
};
