// HOT COFFEE · DLC: its lines, timings and state, apart from the screen
// (hotCoffee.js) so node tests can read them.
export const COFFEE_KEY = 'nightfall.dlc.hotCoffee.v1';
export const BREW_MS = 150000; // 0 → 99 %
export const STALL_MS = 45000; // at 99 %, "the water has not boiled yet"
export const COOL_MS = 5 * 60000; // hot → cold, real time

export const BREW_LINES = Object.freeze([
  'Preparing hot content…',
  'This DLC is for adults only. Please make sure nobody is looking at your screen.',
  'If you are streaming, now would be a good time to turn the camera off.',
  'Warming up…',
  'It is getting steamy in here.',
  'Removing the lid…',
  'Some players may find what follows overly stimulating.',
  'Please do not tell your parents.',
  'Close the curtains.',
  'Lower the volume. The next part gets loud.',
  'Things are about to get very hot.',
  'Nearly there. Breathe.',
  'Just a little longer…',
]);
export const STALL_LINES = Object.freeze([
  'The water has not boiled yet. Please wait.',
  'Still not boiling. Waiting is part of the experience.',
]);
export const COFFEE_TEXT = Object.freeze({
  title: 'HOT COFFEE · DLC',
  installed: 'FREE · INSTALLED',
  coldDetail: 'FREE · COLD',
  brewing: 'BREWING',
  restart: 'The water went cold. Boiling it again.',
  ready: 'Your Hot Coffee is ready.',
  rating: 'ADULT CONTENT: CAFFEINE',
  cold: 'The coffee has gone cold.',
  thanks: 'Thank you for purchasing the Hot Coffee DLC.',
  leave: 'ESC · LEAVE',
  picture: 'A cup of hot coffee on Butch’s desk',
  coldPicture: 'A cup of cold coffee on Butch’s desk',
});

// ---------------------------------------------------------------- state

function readCoffee(storage) {
  try { return JSON.parse(storage?.getItem(COFFEE_KEY) || '{}') ?? {}; } catch { return {}; }
}
export function writeCoffee(storage, value) {
  try { storage?.setItem(COFFEE_KEY, JSON.stringify(value)); } catch { /* private mode: it just brews again */ }
}

/** 'new' (never brewed), 'hot' (brewed under COOL_MS ago) or 'cold' (for good). */
export function coffeeState(storage = globalThis.localStorage, now = Date.now()) {
  const saved = readCoffee(storage);
  if (typeof saved.brewedAt !== 'number') return { phase: 'new', abandoned: typeof saved.startedAt === 'number' };
  const age = Math.max(0, now - saved.brewedAt);
  return age >= COOL_MS ? { phase: 'cold', brewedAt: saved.brewedAt } : { phase: 'hot', brewedAt: saved.brewedAt, coolsIn: COOL_MS - age };
}
export function coffeeMenuDetail(storage = globalThis.localStorage, now = Date.now()) {
  return coffeeState(storage, now).phase === 'cold' ? COFFEE_TEXT.coldDetail : COFFEE_TEXT.installed;
}

/** Brewing progress, 0..99, at `ms` into the brew: quick at first, crawling at the end. */
export function brewPercent(ms) {
  if (ms >= BREW_MS) return 99;
  const t = Math.max(0, ms) / BREW_MS;
  return Math.min(99, Math.floor(99 * (1 - (1 - t) ** 2.4)));
}
/** The line shown at `ms` into the brew (the restart note first when the last brew was abandoned). */
export function brewLine(ms, { abandoned = false } = {}) {
  const lines = abandoned ? [COFFEE_TEXT.restart, ...BREW_LINES] : BREW_LINES;
  if (ms < BREW_MS) return lines[Math.min(lines.length - 1, Math.floor(Math.max(0, ms) / (BREW_MS / lines.length)))];
  return STALL_LINES[Math.min(STALL_LINES.length - 1, Math.floor((ms - BREW_MS) / (STALL_MS / STALL_LINES.length)))];
}
