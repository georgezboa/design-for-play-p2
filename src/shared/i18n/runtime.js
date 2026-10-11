// NIGHTFALL 汉化: `tr` for code that has to translate before it draws (a
// typewriter that reveals a line letter by letter, a canvas helper that sets
// a word one glyph at a time). English pages get the string back unchanged.
// install.js sets the translator before any chapter code runs.
export const tr = (text) => (globalThis.__nfTr ? globalThis.__nfTr(text) : text);
export const chineseShown = () => globalThis.NIGHTFALL_LANG === 'zh';
