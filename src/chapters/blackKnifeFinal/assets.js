// Central asset manifest. Spritesheets in public/assets/black-knife/images/conductor are
// Mathias's "Chapter 6 final boss" art drops (frames normalized, bottom-centre
// anchored, packed per animation), gradient-mapped in 2026-09 from the old
// neon palette to the finale's walnut / oxblood / brass / amber / ivory ramp
// for THE BLACK TICKET. Any entry with path:null gets a painted placeholder
// (PreloadScene.makeFallbacks).
//
// The battle music (face-the-fear.mp3) has no recorded provenance and is
// listed for replacement in docs/MUSIC_REPLACEMENT_PLAN.md.

export const CONDUCTOR_SHEETS = {
  'conductor-idle':   { path: '/assets/black-knife/images/conductor/idle.webp',   sheet: { frameWidth: 399, frameHeight: 428 }, frameRate: 8,  repeat: -1 },
  'conductor-move':   { path: '/assets/black-knife/images/conductor/move.webp',   sheet: { frameWidth: 409, frameHeight: 386 }, frameRate: 10, repeat: -1 },
  'conductor-baton':  { path: '/assets/black-knife/images/conductor/baton.webp',  sheet: { frameWidth: 410, frameHeight: 599 }, frameRate: 10, repeat: 0 },
  'conductor-locom':  { path: '/assets/black-knife/images/conductor/locom.webp',  sheet: { frameWidth: 410, frameHeight: 375 }, frameRate: 12, repeat: -1 },
  'conductor-magic':  { path: '/assets/black-knife/images/conductor/magic.webp',  sheet: { frameWidth: 409, frameHeight: 572 }, frameRate: 9,  repeat: 0 },
  'conductor-damage': { path: '/assets/black-knife/images/conductor/damage.webp', sheet: { frameWidth: 378, frameHeight: 392 }, frameRate: 10, repeat: 0 },
  'conductor-defeat': { path: '/assets/black-knife/images/conductor/defeat.webp', sheet: { frameWidth: 396, frameHeight: 368 }, frameRate: 4,  repeat: 0 },
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
  'music-battle': { path: '/assets/black-knife/audio/face-the-fear.mp3', loop: true, volume: 0.5 },
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
