// NIGHTFALL 汉化: which language the screens show.
//
// SETTINGS · 中文 (settingsControls.js) stores `chinese: true|false`; until a
// player sets it, a computer whose first language is Chinese gets Chinese.
// Voices stay English either way.
export const SETTINGS_KEY = 'nightfall.settings.v1';

function storedSettings() {
  try { return JSON.parse(globalThis.localStorage?.getItem(SETTINGS_KEY) || '{}') ?? {}; } catch { return {}; }
}

export function chineseWanted(settings = storedSettings(), nav = globalThis.navigator) {
  if (typeof settings?.chinese === 'boolean') return settings.chinese;
  const first = nav?.languages?.[0] ?? nav?.language ?? '';
  return /^zh\b/i.test(first);
}
