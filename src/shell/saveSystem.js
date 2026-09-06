export const SAVE_VERSION = 1;
export const SAVE_KEY = 'nightfall.saves.v1';
export const SETTINGS_KEY = 'nightfall.settings.v1';
export const ACTIVE_SLOT_KEY = 'nightfall.activeSlot.v1';

export const CHECKPOINTS = Object.freeze([
  { id: 'prologue-start', chapter: 1, title: 'NIGHT SERVICE', detail: 'The last archive line wakes.', route: '/' },
  { id: 'chapter-2-start', chapter: 2, title: 'BORROWED GRID', detail: 'The cyberpunk safety test.', route: '/', launch: 'chapter-2' },
  { id: 'chapter-2-midpoint', chapter: 2, title: 'BORROWED GRID · MIDPOINT', detail: 'The route extension checkpoint.', route: '/', launch: 'chapter-2-midpoint' },
  { id: 'chapter-3-start', chapter: 3, title: 'ECHO CITY', detail: 'The Spanish civic city investigation.', route: '/car03-3d.html' },
  { id: 'chapter-4-start', chapter: 4, title: 'THE PAINTED COUNTRY', detail: 'Ink moves. Paper remembers.', route: '/painted-country.html' },
  { id: 'chapter-5-start', chapter: 5, title: 'THE MUSEUM OF ONE ANSWER', detail: 'The archive corridor and Labyrinth.', route: '/museum-3d.html' },
  { id: 'chapter-6-start', chapter: 6, title: 'ALL WORLDS AT ONCE', detail: 'The Conductor’s last platform.', route: '/final-boss.html' },
]);

export const DEFAULT_SETTINGS = Object.freeze({
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 85,
  subtitles: true,
  reducedMotion: false,
  textScale: 100,
});

// A modest music-bus lift keeps the score present beneath gameplay without
// changing the user's Music slider or the independently mixed SFX bus.
const MUSIC_BUS_GAIN = 1.15;

const checkpointById = (id) => CHECKPOINTS.find((checkpoint) => checkpoint.id === id);
const safeParse = (value, fallback) => {
  try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
};

export function createSaveStore(storage = globalThis.localStorage) {
  const readAll = () => {
    const source = safeParse(storage?.getItem(SAVE_KEY), []);
    return [0, 1, 2].map((index) => source[index] ?? null);
  };
  const writeAll = (saves) => storage?.setItem(SAVE_KEY, JSON.stringify(saves));
  const getActiveSlot = () => Math.max(0, Math.min(2, Number(storage?.getItem(ACTIVE_SLOT_KEY)) || 0));
  const setActiveSlot = (index) => storage?.setItem(ACTIVE_SLOT_KEY, String(Math.max(0, Math.min(2, index))));

  const startNew = (index) => {
    const saves = readAll();
    const now = new Date().toISOString();
    saves[index] = {
      version: SAVE_VERSION,
      slot: index,
      checkpointId: 'prologue-start',
      unlocked: ['prologue-start'],
      magicStones: [],
      createdAt: now,
      updatedAt: now,
      playSeconds: 0,
    };
    writeAll(saves);
    setActiveSlot(index);
    return saves[index];
  };

  const markCheckpoint = (id, { slot = getActiveSlot(), playSeconds = 0 } = {}) => {
    if (!checkpointById(id)) return null;
    const saves = readAll();
    const save = saves[slot];
    if (!save) return null;
    const unlocked = [...new Set([...(save.unlocked ?? []), id])];
    saves[slot] = {
      ...save,
      checkpointId: id,
      unlocked,
      updatedAt: new Date().toISOString(),
      playSeconds: Math.max(save.playSeconds ?? 0, playSeconds),
    };
    writeAll(saves);
    setActiveSlot(slot);
    globalThis.dispatchEvent?.(new CustomEvent('nightfall:checkpoint', { detail: { id, slot } }));
    return saves[slot];
  };

  const selectCheckpoint = (index, id) => {
    const saves = readAll();
    const save = saves[index];
    if (!save || !(save.unlocked ?? []).includes(id) || !checkpointById(id)) return null;
    saves[index] = { ...save, checkpointId: id, updatedAt: new Date().toISOString() };
    writeAll(saves);
    setActiveSlot(index);
    return saves[index];
  };

  const collectMagicStone = (id, { slot = getActiveSlot() } = {}) => {
    const saves = readAll();
    const save = saves[slot];
    if (!save || typeof id !== 'string' || !id) return null;
    saves[slot] = {
      ...save,
      magicStones: [...new Set([...(save.magicStones ?? []), id])],
      updatedAt: new Date().toISOString(),
    };
    writeAll(saves);
    setActiveSlot(slot);
    globalThis.dispatchEvent?.(new CustomEvent('nightfall:magic-stone', { detail: { id, slot } }));
    return saves[slot];
  };

  const remove = (index) => {
    const saves = readAll();
    saves[index] = null;
    writeAll(saves);
  };

  return { readAll, startNew, markCheckpoint, collectMagicStone, selectCheckpoint, remove, getActiveSlot, setActiveSlot };
}

export function readSettings(storage = globalThis.localStorage) {
  return { ...DEFAULT_SETTINGS, ...safeParse(storage?.getItem(SETTINGS_KEY), {}) };
}

export function writeSettings(next, storage = globalThis.localStorage) {
  const settings = { ...DEFAULT_SETTINGS, ...next };
  storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applySettings(settings);
  return settings;
}

export function volumeForChannel(settings = DEFAULT_SETTINGS, channel = 'master') {
  const clamp = (value) => Math.max(0, Math.min(1, Number(value) / 100));
  const master = clamp(settings.masterVolume);
  if (channel === 'music') return Math.min(1, master * clamp(settings.musicVolume) * MUSIC_BUS_GAIN);
  if (channel === 'sfx') return master * clamp(settings.sfxVolume);
  return master;
}

export function applySettings(settings = readSettings()) {
  if (typeof document === 'undefined') return settings;
  const root = document.documentElement;
  root.style.setProperty('--nightfall-text-scale', String(settings.textScale / 100));
  root.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  root.dataset.subtitles = settings.subtitles ? 'true' : 'false';
  document.querySelectorAll('audio, video').forEach((media) => {
    media.volume = volumeForChannel(settings, media.dataset?.nightfallAudioChannel);
  });
  globalThis.NIGHTFALL_SETTINGS = settings;
  globalThis.dispatchEvent?.(new CustomEvent('nightfall:settings', { detail: settings }));
  return settings;
}

export function launchCheckpoint(checkpointId, { replace = false } = {}) {
  const checkpoint = checkpointById(checkpointId) ?? CHECKPOINTS[0];
  sessionStorage.setItem('nightfall.titleDismissed.v1', '1');
  if (checkpoint.launch) sessionStorage.setItem('nightfall.pendingLaunch.v1', checkpoint.launch);
  if (checkpoint.route === '/' && window.location.pathname === '/') {
    window.location.assign('/?play=1');
    return;
  }
  const navigate = replace ? window.location.replace.bind(window.location) : window.location.assign.bind(window.location);
  navigate(checkpoint.route);
}

export function consumePendingLaunch(storage = globalThis.sessionStorage) {
  const launch = storage?.getItem('nightfall.pendingLaunch.v1') ?? null;
  storage?.removeItem('nightfall.pendingLaunch.v1');
  return launch;
}

export function hasDismissedTitle(storage = globalThis.sessionStorage) {
  return storage?.getItem('nightfall.titleDismissed.v1') === '1';
}

export function returnToTitle(storage = globalThis.sessionStorage) {
  storage?.removeItem('nightfall.titleDismissed.v1');
  storage?.removeItem('nightfall.pendingLaunch.v1');
  storage?.removeItem('nightfall.hidden-router.v1');
  window.location.assign('/');
}

export function formatSave(save) {
  if (!save) return { title: 'EMPTY SLOT', detail: 'Begin a new journey.', checkpoint: null };
  const checkpoint = checkpointById(save.checkpointId) ?? CHECKPOINTS[0];
  return {
    title: checkpoint.title,
    detail: `CHAPTER ${checkpoint.chapter} · ${new Date(save.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
    checkpoint,
  };
}
