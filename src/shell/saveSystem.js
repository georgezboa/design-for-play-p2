export const SAVE_VERSION = 1;
export const SAVE_KEY = 'nightfall.saves.v1';
export const SETTINGS_KEY = 'nightfall.settings.v1';
export const ACTIVE_SLOT_KEY = 'nightfall.activeSlot.v1';

export const CHECKPOINTS = Object.freeze([
  // Chapter 1 is the NIGHT SERVICE panel puzzle (night-service.html). The page
  // opens the act named by the active slot's checkpoint (`act`). The legacy
  // `prologue-start` id stays first so older saves still load (as Act 1).
  // Detail strings follow docs/STORY_BIBLE.md (player-visible names).
  { id: 'prologue-start', chapter: 1, title: 'NIGHT SERVICE', detail: 'The last archive line. Returning the orchard case.', route: '/night-service.html', act: 1, legacy: true },
  { id: 'chapter-1-start', chapter: 1, title: 'NIGHT SERVICE', detail: 'Act I · Lost property. Claim 1978-0412.', route: '/night-service.html', act: 1 },
  { id: 'chapter-1-act-2', chapter: 1, title: 'NIGHT SERVICE · THE LUGGAGE CAR', detail: 'Act II · The punch and the lens.', route: '/night-service.html', act: 2 },
  { id: 'chapter-1-act-3', chapter: 1, title: 'NIGHT SERVICE · TWO TRUE THINGS', detail: 'Act III · Two true things.', route: '/night-service.html', act: 3 },
  // Chapter 2 · BORROWED LIGHT (borrowed-light.html). The ids are kept so
  // saves from the old parkour chapter load the new page.
  { id: 'chapter-2-start', chapter: 2, title: 'BORROWED LIGHT', detail: 'The city runs on light borrowed from the train.', route: '/borrowed-light.html' },
  { id: 'chapter-2-midpoint', chapter: 2, title: 'BORROWED LIGHT · BLACKOUT', detail: 'The city takes its light back.', route: '/borrowed-light.html?section=B' },
  { id: 'chapter-2-platform', chapter: 2, title: 'BORROWED LIGHT · EVACUATION PLATFORM', detail: 'Eight bells to departure. Keep moving.', route: '/borrowed-light.html?section=C' },
  { id: 'chapter-3-start', chapter: 3, title: 'ECHO CITY', detail: 'The duplicate ticket. M. Venn. Move as one.', route: '/car03-3d.html' },
  // Saved when Butch crosses the market scanner beside Olek; the page honours
  // `stage=dusk` only for a save that unlocked it.
  { id: 'chapter-3-dusk', chapter: 3, title: 'ECHO CITY · DUSK', detail: 'Two tickets filed as one. Another mark waits in the square.', route: '/car03-3d.html?stage=dusk' },
  { id: 'chapter-4-start', chapter: 4, title: 'THE PAINTED COUNTRY', detail: 'Rosa’s orchard, painted over by the archive.', route: '/painted-country.html' },
  { id: 'chapter-5-start', chapter: 5, title: 'THE MUSEUM OF ONE ANSWER', detail: 'The archive wants one clean answer about Mara.', route: '/museum-3d.html' },
  { id: 'chapter-6-start', chapter: 6, title: 'ALL WORLDS AT ONCE', detail: 'The Conductor keeps the line running.', route: '/final-boss.html' },
]);

export const DEFAULT_SETTINGS = Object.freeze({
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 85,
  reducedMotion: false,
  textScale: 100,
});

// A modest music-bus lift keeps the score present beneath gameplay without
// changing the user's Music slider or the independently mixed SFX bus.
const MUSIC_BUS_GAIN = 1.15;

const checkpointById = (id) => CHECKPOINTS.find((checkpoint) => checkpoint.id === id);

// The rows LOAD / CHECKPOINTS lists for a save: its unlocked checkpoints in
// story order, minus any `legacy: true` id when the save also holds a current
// checkpoint for the same chapter and act (a save that unlocked both
// `prologue-start` and `chapter-1-start` would otherwise list two identical
// "CHAPTER 1 · NIGHT SERVICE" rows). `selected` marks the row Continue
// resumes, which is the current twin when the save still points at the
// hidden legacy id.
export function loadListCheckpoints(save) {
  const unlocked = new Set(save?.unlocked ?? []);
  const sameSpot = (a, b) => a.chapter === b.chapter && (a.act ?? null) === (b.act ?? null);
  const rows = CHECKPOINTS.filter((checkpoint) => unlocked.has(checkpoint.id));
  const shown = rows.filter((checkpoint) => !checkpoint.legacy
    || !rows.some((other) => !other.legacy && sameSpot(other, checkpoint)));
  const current = checkpointById(save?.checkpointId);
  const selectedId = shown.some(({ id }) => id === current?.id)
    ? current.id
    : shown.find((checkpoint) => current?.legacy && !checkpoint.legacy && sameSpot(checkpoint, current))?.id ?? null;
  return shown.map((checkpoint) => ({ checkpoint, selected: checkpoint.id === selectedId }));
}
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
      checkpointId: 'chapter-1-start',
      unlocked: ['chapter-1-start'],
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
  document.querySelectorAll('audio, video').forEach((media) => {
    media.volume = volumeForChannel(settings, media.dataset?.nightfallAudioChannel);
  });
  globalThis.NIGHTFALL_SETTINGS = settings;
  globalThis.dispatchEvent?.(new CustomEvent('nightfall:settings', { detail: settings }));
  return settings;
}

// `route` overrides the checkpoint's default page; the title menu passes the
// resolved final-boss page for a Chapter 6 save (see finalBossRoute.js).
export function launchCheckpoint(checkpointId, { replace = false, route = null } = {}) {
  const base = checkpointById(checkpointId) ?? CHECKPOINTS[0];
  const checkpoint = route ? { ...base, route } : base;
  const navigate = replace ? window.location.replace.bind(window.location) : window.location.assign.bind(window.location);
  navigate(checkpoint.route);
}

// The window a title exit should navigate: the top-level page when this one
// is embedded (the Museum hosts the Labyrinth and other wings in iframes),
// otherwise this window. A cross-origin parent cannot be navigated.
export function titleNavigationTarget(win = globalThis.window) {
  try {
    if (win?.top && win.top !== win && win.top.location.origin === win.location.origin) return win.top;
  } catch { /* cross-origin parent */ }
  return win;
}

export function returnToTitle(storage = globalThis.sessionStorage) {
  storage?.removeItem('nightfall.hidden-router.v1');
  titleNavigationTarget(window).location.assign('/');
}

export const TITLE_REQUEST_EVENT = 'nightfall:request-title';
export const RETURN_TO_TITLE_PROMPT = 'Return to the title screen? Unsaved progress since the last checkpoint will be lost.';

// Ask before leaving a chapter. A page with the shared pause menu shows its
// in-game confirmation (it cancels this event); anything else falls back to
// the browser dialog.
export function requestReturnToTitle({ confirm = globalThis.confirm } = {}) {
  const event = new CustomEvent(TITLE_REQUEST_EVENT, { cancelable: true });
  if (globalThis.dispatchEvent?.(event) === false) return false;
  if (typeof confirm === 'function' && !confirm(RETURN_TO_TITLE_PROMPT)) return false;
  returnToTitle();
  return true;
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
