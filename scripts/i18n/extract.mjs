// NIGHTFALL 汉化 (2026-10-11): every player-facing English string in src/
// and the HTML pages → scripts/i18n/strings.json, the list the Chinese
// table (src/shared/i18n/zh.generated.js) must cover.
//
//   npm i --no-save acorn@8 acorn-walk@8 && node scripts/i18n/extract.mjs
//
// A string literal or template literal is kept when it reads as text: it has
// a run of letters and a space, or it is an all-caps label (BACK, STORY).
// Template literals keep their holes as {0}, {1}…; HTML inside a template
// is split into its text segments (each is translated on its own when the
// whole string is not in the table). Code-looking strings (identifiers,
// paths, CSS, selectors, key codes) are dropped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'scripts/i18n/strings.json');
const SKIP_DIRS = new Set(['generated', 'node_modules']);
const SKIP_FILES = [/devMode\.js$/, /\.test\./, /bots\.js$/, /devLauncher\.js$/, /i18n\//];

const files = [];
const walkDir = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walkDir(p); } else if (/\.(js|mjs)$/.test(name) && !SKIP_FILES.some((re) => re.test(p))) files.push(p);
  }
};
walkDir(path.join(ROOT, 'src'));

const CODEY = [
  /^[a-z][a-zA-Z0-9]*$/, // identifiers, camelCase
  /^[a-z0-9]+([-_.:][a-z0-9]+)+$/i, // kebab / snake / dotted / ids
  /^(Key|Digit|Arrow|Shift|Control|Alt|Meta|Escape|Enter|Space|Tab|Backspace|Numpad)\w*$/,
  /^[#.][\w-]/, /^(https?:|data:|blob:|\.\/|\/)/, /^rgba?\(|^hsla?\(|^#[0-9a-f]{3,8}$/i,
  /\b\d+(px|em|rem|vh|vw|ms|s|deg|%)\b/, /[{};]\s*$/, /^[\w-]+\s*:\s*[^ ]+;/, /=>|&&|\|\||===/,
  /^(normal|bold|italic|center|left|right|top|bottom|middle|none|auto|block|flex|grid|absolute|relative|fixed|hidden|visible|pointer|default|inherit)$/,
];
CODEY.push(/\b(sans-serif|serif|monospace|cursive)\b/, /^\d{3}\s+\d|^(bold|italic|normal)\s+\d+px/, /^'[^']+'(,\s*'?[\w ]+'?)+$/);
const isCodey = (s) => CODEY.some((re) => re.test(s.trim()));
const readsAsText = (s) => {
  const t = s.replace(/\{\d+\}/g, '').replace(/<[^>]+>/g, ' ').trim();
  if (!/[A-Za-z]{2,}/.test(t)) return false;
  if (isCodey(t)) return false;
  if (/[A-Za-z]{2,}[^A-Za-z]+[A-Za-z]{2,}/.test(t) && /\s/.test(t)) return true; // two words
  if (/[A-Za-z]{2,}.*\s.*[A-Za-z]{2,}/.test(t)) return true; // two words, with a number or a letter between (LIVE 3D READY)
  if (/^[A-Z][A-Za-z]+\.?\s+[0-9IVX]+[A-Z]?$/.test(t)) return true; // CHAPTER 5, LINE 01
  if (/^[^A-Za-z]*[A-Z][A-Z'’&\-]{2,}[^A-Za-z]*$/.test(t) && /[^A-Z]/.test(t)) return true; // one caps word with marks or a number (STEADY · {0}, ✓ DONE)
  if (/^[A-Z][A-Z0-9'’&!?.,\-]{1,}$/.test(t)) return true; // ALLCAPS label
  if (/^[A-Z][a-z]+[.!?]?$/.test(t) && t.length >= 3) return true; // a capitalised word
  return false;
};

const entries = new Map(); // key -> { key, files:Set, kind }
const add = (key, file, kind) => {
  const k = key.replace(/\s+/g, ' ').trim();
  if (!k || k.length > 2000 || !readsAsText(k)) return;
  const e = entries.get(k) ?? { key: k, files: new Set(), kind };
  e.files.add(path.relative(ROOT, file));
  entries.set(k, e);
};
// HTML: the whole string, and its text segments (between tags)
const addHtmlAware = (str, file, kind) => {
  if (/<[a-z][^>]*>/i.test(str)) {
    // whole only if short and inline-ish (kbd, b, i, em, span)
    if (str.length < 260 && !/<(div|p|article|section|h\d|ul|li|button|img|svg|header|footer|label|input|select|table)\b/i.test(str)) add(str, file, kind);
    for (const seg of str.split(/<[^>]*>/)) add(seg, file, `${kind}-segment`);
  } else add(str, file, kind);
};

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true }); }
  catch (e) { console.warn(`skip ${path.relative(ROOT, file)}: ${e.message}`); continue; }
  // console messages and thrown errors are not shown to players
  const quiet = (ancestors) => ancestors.some((a) => (a.type === 'CallExpression' && a.callee.type === 'MemberExpression' && a.callee.object.name === 'console')
    || ((a.type === 'NewExpression' || a.type === 'CallExpression') && /Error$/.test(a.callee.name ?? ''))
    || (a.type === 'ImportDeclaration' || a.type === 'ImportExpression' || a.type === 'ExportNamedDeclaration' && a.source));
  walk.fullAncestor(ast, (node, _state, ancestors) => {
    if ((node.type === 'Literal' || node.type === 'TemplateLiteral') && quiet(ancestors)) return;
    if (node.type === 'Literal' && typeof node.value === 'string') addHtmlAware(node.value, file, 'literal');
    if (node.type === 'TemplateLiteral') {
      const parts = [];
      node.quasis.forEach((q, i) => { parts.push(q.value.cooked ?? q.value.raw); if (i < node.expressions.length) parts.push(`{${i}}`); });
      const joined = parts.join('');
      addHtmlAware(joined, file, node.expressions.length ? 'template' : 'literal');
      // each quasi alone too (a string built around holes still shows its words)
      if (node.expressions.length) node.quasis.forEach((q) => { const t = (q.value.cooked ?? '').trim(); if (/\s/.test(t)) addHtmlAware(t, file, 'quasi'); });
    }
  });
}
// HTML pages: their static text
for (const name of fs.readdirSync(ROOT).filter((n) => n.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(ROOT, name), 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '');
  for (const seg of html.split(/<[^>]*>/)) add(seg.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·'), path.join(ROOT, name), 'html');
  for (const m of html.matchAll(/(?:title|aria-label|placeholder|alt)="([^"]+)"/g)) add(m[1], path.join(ROOT, name), 'attr');
}

const list = [...entries.values()].map((e) => ({ key: e.key, files: [...e.files].sort(), kind: e.kind }))
  .sort((a, b) => a.files[0].localeCompare(b.files[0]) || a.key.localeCompare(b.key));
fs.writeFileSync(OUT, JSON.stringify(list, null, 1) + '\n');
console.log(`${list.length} strings, ${list.reduce((n, e) => n + e.key.length, 0)} characters → ${path.relative(ROOT, OUT)}`);
