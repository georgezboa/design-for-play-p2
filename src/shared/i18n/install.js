// NIGHTFALL 汉化: the first script on every page (vite.config.js injects it).
//
// When the screens are Chinese (locale.js) it routes every place text reaches
// the screen through the table (translate.js): DOM text, HTML and the
// attributes players read, the page title, and canvas fillText/strokeText/
// measureText. The game's own strings, voice lookups and saves stay English.
// Phaser pages also load ./phaser.js (Text objects and CJK line breaking).
// Changing SETTINGS · 中文 reloads the page in the other language.
import { chineseWanted } from './locale.js';
import table from './zh.generated.js';
import { createTranslator } from './translate.js';

const ZH = chineseWanted();
globalThis.NIGHTFALL_LANG = ZH ? 'zh' : 'en';

if (typeof window !== 'undefined') {
  window.addEventListener('nightfall:settings', (event) => {
    if (chineseWanted(event.detail) !== ZH) window.location.reload();
  });
  if (ZH) install();
}

function install() {
  const { tr, trHtml } = createTranslator(table);
  globalThis.__nfTr = tr;
  globalThis.__nfTrHtml = trHtml;
  const root = document.documentElement;
  root.lang = 'zh-CN';
  root.dataset.lang = 'zh';

  const SKIP = new Set(['STYLE', 'SCRIPT', 'TEXTAREA', 'NOSCRIPT']);
  const READ_ATTRS = new Set(['title', 'aria-label', 'placeholder', 'alt']);
  const skipped = (node) => {
    const el = node?.nodeType === 1 ? node : node?.parentNode;
    return !!el && SKIP.has(el.nodeName);
  };
  const own = (proto, name) => Object.getOwnPropertyDescriptor(proto, name);
  const wrapSetter = (proto, name, make) => {
    const d = own(proto, name);
    if (!d?.set) return;
    Object.defineProperty(proto, name, { ...d, set: make(d.set, d.get) });
  };

  // textContent / innerText: translate, and skip a write that changes nothing
  // (HUD code writes its English every frame when the shown text differs).
  wrapSetter(Node.prototype, 'textContent', (set, get) => function (value) {
    if (typeof value !== 'string' || skipped(this)) return set.call(this, value);
    const out = tr(value);
    if (this.nodeType === 1 && this.childNodes.length === 1 && this.firstChild.nodeType === 3 && this.firstChild.data === out) return undefined;
    if (this.nodeType === 3 && get.call(this) === out) return undefined;
    return set.call(this, out);
  });
  wrapSetter(HTMLElement.prototype, 'innerText', (set, get) => function (value) {
    if (typeof value !== 'string' || skipped(this)) return set.call(this, value);
    const out = tr(value);
    if (this.childNodes.length === 1 && this.firstChild.nodeType === 3 && this.firstChild.data === out) return undefined;
    return set.call(this, out);
  });
  const lastHtml = new WeakMap();
  wrapSetter(Element.prototype, 'innerHTML', (set, get) => function (value) {
    if (typeof value !== 'string' || skipped(this)) return set.call(this, value);
    const prev = lastHtml.get(this);
    if (prev && prev.src === value && prev.out === get.call(this)) return undefined;
    set.call(this, trHtml(value));
    lastHtml.set(this, { src: value, out: get.call(this) });
    return undefined;
  });
  const insertHtml = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (where, html) {
    return insertHtml.call(this, where, skipped(this) ? html : trHtml(html));
  };
  const insertText = Element.prototype.insertAdjacentText;
  Element.prototype.insertAdjacentText = function (where, text) {
    return insertText.call(this, where, skipped(this) ? text : tr(text));
  };
  const textData = (set) => function (value) {
    if (typeof value !== 'string' || this.nodeType !== 3 || skipped(this)) return set.call(this, value);
    return set.call(this, tr(value));
  };
  wrapSetter(CharacterData.prototype, 'data', textData);
  wrapSetter(Node.prototype, 'nodeValue', textData);
  const createText = Document.prototype.createTextNode;
  Document.prototype.createTextNode = function (text) { return createText.call(this, tr(text)); };
  // append('text'), replaceChildren('text')… make their text nodes directly
  const strings = (args) => args.map((a) => (typeof a === 'string' ? tr(a) : a));
  for (const proto of [Element.prototype, DocumentFragment.prototype, Document.prototype, CharacterData.prototype]) {
    for (const name of ['append', 'prepend', 'replaceChildren', 'before', 'after', 'replaceWith']) {
      const fn = own(proto, name)?.value;
      if (typeof fn !== 'function') continue;
      proto[name] = function (...args) { return fn.apply(this, skipped(this) ? args : strings(args)); };
    }
  }
  const setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    return setAttr.call(this, name, typeof value === 'string' && READ_ATTRS.has(String(name).toLowerCase()) ? tr(value) : value);
  };
  wrapSetter(HTMLElement.prototype, 'title', (set) => function (v) { return set.call(this, tr(v)); });
  if (typeof HTMLInputElement !== 'undefined') wrapSetter(HTMLInputElement.prototype, 'placeholder', (set) => function (v) { return set.call(this, tr(v)); });
  if (typeof HTMLImageElement !== 'undefined') wrapSetter(HTMLImageElement.prototype, 'alt', (set) => function (v) { return set.call(this, tr(v)); });
  if (own(Element.prototype, 'ariaLabel')) wrapSetter(Element.prototype, 'ariaLabel', (set) => function (v) { return set.call(this, typeof v === 'string' ? tr(v) : v); });
  wrapSetter(Document.prototype, 'title', (set) => function (v) { return set.call(this, tr(v)); });

  // canvas: whole strings (labels, signs, tags); a word set one glyph at a
  // time is translated by its helper (runtime.js `tr`).
  const patchCanvas = (proto) => {
    if (!proto) return;
    for (const name of ['fillText', 'strokeText', 'measureText']) {
      const fn = proto[name];
      if (typeof fn !== 'function') continue;
      proto[name] = function (text, ...rest) { return fn.call(this, typeof text === 'string' ? tr(text) : text, ...rest); };
    }
  };
  patchCanvas(globalThis.CanvasRenderingContext2D?.prototype);
  patchCanvas(globalThis.OffscreenCanvasRenderingContext2D?.prototype);

  // what the HTML page already holds, and anything that reaches the page
  // another way (a cloned template, a text node made before a write)
  const translateTree = (start) => {
    if (start.nodeType === 3) { if (!skipped(start)) { const out = tr(start.data); if (out !== start.data) start.data = out; } return; }
    if (start.nodeType !== 1 && start.nodeType !== 11) return;
    if (start.nodeType === 1 && SKIP.has(start.nodeName)) return;
    const walker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeType === 1 && SKIP.has(n.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = start; n; n = walker.nextNode()) {
      if (n.nodeType === 3) { const out = tr(n.data); if (out !== n.data) n.data = out; continue; }
      if (n.nodeType !== 1) continue;
      for (const attr of READ_ATTRS) {
        const v = n.getAttribute(attr);
        if (v) { const out = tr(v); if (out !== v) setAttr.call(n, attr, out); }
      }
    }
  };
  const start = () => {
    translateTree(document.body ?? root);
    document.title = document.title;
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') translateTree(r.target);
        else r.addedNodes.forEach(translateTree);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  const style = document.createElement('style');
  style.dataset.nfI18n = 'zh';
  // Chinese needs no capital-letter tracking; keep a little air.
  style.textContent = ':root[data-lang="zh"] body { font-synthesis: none; }';
  document.head.append(style);
}
