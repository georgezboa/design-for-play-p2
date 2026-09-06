// Central asset manifest. Spritesheets in public/assets/images/conductor are
// generated from the "Chapter 6 final boss" art drops (see art-source/ and
// tools/process_assets.py): frames normalized, bottom-center anchored, packed
// per animation. Any entry with path:null gets a generated placeholder.

export const CONDUCTOR_SHEETS = {
  'conductor-idle':   { path: '/assets/black-knife/images/conductor/idle.png',   sheet: { frameWidth: 399, frameHeight: 428 }, frameRate: 8,  repeat: -1 },
  'conductor-move':   { path: '/assets/black-knife/images/conductor/move.png',   sheet: { frameWidth: 409, frameHeight: 386 }, frameRate: 10, repeat: -1 },
  'conductor-baton':  { path: '/assets/black-knife/images/conductor/baton.png',  sheet: { frameWidth: 410, frameHeight: 599 }, frameRate: 10, repeat: 0 },
  'conductor-locom':  { path: '/assets/black-knife/images/conductor/locom.png',  sheet: { frameWidth: 410, frameHeight: 375 }, frameRate: 12, repeat: -1 },
  'conductor-magic':  { path: '/assets/black-knife/images/conductor/magic.png',  sheet: { frameWidth: 409, frameHeight: 572 }, frameRate: 9,  repeat: 0 },
  'conductor-damage': { path: '/assets/black-knife/images/conductor/damage.png', sheet: { frameWidth: 378, frameHeight: 392 }, frameRate: 10, repeat: 0 },
  'conductor-defeat': { path: '/assets/black-knife/images/conductor/defeat.png', sheet: { frameWidth: 396, frameHeight: 368 }, frameRate: 4,  repeat: 0 },
};

export const IMAGE_MANIFEST = {
  // Player + projectiles + environment use generated neon placeholders for
  // now — drop real art in public/assets and point these paths at it.
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
