// NIGHTFALL 汉化 on the Phaser pages (vite.config.js adds it after
// install.js): Text objects show the Chinese, and Chinese lines break
// between characters (they have no spaces), with closing punctuation kept
// off the start of a line.
import Phaser from 'phaser';
import { hasCJK, wrapCJK } from './translate.js';

const T = Phaser.GameObjects.Text?.prototype;
if (T && globalThis.NIGHTFALL_LANG === 'zh' && globalThis.__nfTr) {
  const tr = globalThis.__nfTr;
  const translateValue = (value) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? tr(v) : v)) : typeof value === 'string' ? tr(value) : value);
  const setText = T.setText;
  T.setText = function (value) { return setText.call(this, translateValue(value)); };
  const appendText = T.appendText;
  if (appendText) T.appendText = function (value, addCR) { return appendText.call(this, translateValue(value), addCR); };
  const wrap = (base) => function (text, context, width) {
    if (!hasCJK(text)) return base.call(this, text, context, width);
    return wrapCJK(text, width, (s) => context.measureText(s).width).join('\n');
  };
  T.basicWordWrap = wrap(T.basicWordWrap);
  T.advancedWordWrap = wrap(T.advancedWordWrap);
}
