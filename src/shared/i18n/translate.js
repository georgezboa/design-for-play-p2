// NIGHTFALL 汉化: the lookup the Chinese display runs every string through.
//
// The game keeps writing English everywhere (its voice lookups, tests and
// saves all key on the English); only the places text reaches the screen
// (the DOM, canvas text, Phaser text) ask `tr` for the Chinese. A string is
// found, in order:
//   1. exactly, or with its whitespace collapsed, or ignoring case
//      (code that upper-cases a line before showing it);
//   2. as a template: a table key with {0}, {1}… holes (a sentence built in
//      code) matched against the string, its holes translated in turn;
//   3. line by line, then part by part around " · " (labels joined in code).
// Anything else comes back unchanged, so a miss shows the English, never
// a blank. Plain functions, no DOM: tests run them in node.

const LETTERS = /[A-Za-z]{2}/;
const HOLE = /\{(\d+)\}/g;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const squash = (s) => s.replace(/\s+/g, ' ').trim();

const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return ENTITY[e.toLowerCase()] ?? m;
});
const encode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function createTranslator(table, { cacheLimit = 6000 } = {}) {
  const exact = new Map(Object.entries(table));
  const folded = new Map();
  for (const [key, zh] of exact) if (!folded.has(key.toLowerCase())) folded.set(key.toLowerCase(), zh);

  // Templates: anchor on the longest literal so most strings skip the regex.
  const templates = [];
  for (const [key, zh] of exact) {
    if (!key.includes('{')) continue;
    const pieces = key.split(/\{\d+\}/);
    const anchor = pieces.reduce((a, b) => (b.trim().length > a.trim().length ? b : a), '').trim();
    if (anchor.replace(/[^A-Za-z]/g, '').length < 3) continue;
    const order = [...key.matchAll(HOLE)].map((m) => Number(m[1]));
    // A hole right after a letter ("KEY{1}") is the English plural ending.
    const plural = new Set([...key.matchAll(/[A-Za-z]\{(\d+)\}/g)].map((m) => Number(m[1])));
    const source = `^${pieces.map((p) => escapeRe(p).replace(/\s+/g, '\\s+')).join('([\\s\\S]*?)')}$`;
    templates.push({ re: new RegExp(source, 'i'), anchor: anchor.toLowerCase(), order, plural, zh, literal: key.length - order.length * 3 });
  }
  templates.sort((a, b) => b.literal - a.literal);

  // Parts of joined labels ("E · CLASSIFY THE OBJECT" → "CLASSIFY THE
  // OBJECT"), for code that shows the key and the action apart. Lowest
  // priority: a string the table has whole always wins.
  const parts = new Map();
  for (const [key, zh] of exact) {
    if (!key.includes(' · ') || key.includes('{') || key.includes('<')) continue;
    const a = key.split(' · ');
    const b = zh.split(' · ');
    if (a.length !== b.length) continue;
    a.forEach((part, i) => {
      const k = part.trim().toLowerCase();
      if (LETTERS.test(k) && !folded.has(k) && !parts.has(k) && b[i].trim() !== part.trim()) parts.set(k, b[i].trim());
    });
  }

  const cache = new Map();
  const remember = (s, out) => {
    if (cache.size >= cacheLimit) cache.clear();
    cache.set(s, out);
    return out;
  };

  const lookup = (s) => {
    const sq = squash(s);
    return exact.get(s) ?? exact.get(sq) ?? folded.get(sq.toLowerCase());
  };

  const fromTemplate = (s, depth) => {
    const lower = s.toLowerCase();
    for (const t of templates) {
      if (!lower.includes(t.anchor)) continue;
      const m = t.re.exec(s);
      if (!m) continue;
      const holes = {};
      t.order.forEach((n, i) => {
        const value = m[i + 1];
        holes[n] = t.plural.has(n) && /^(s|es)?$/i.test(value) ? '' : depth < 2 ? translate(value, depth + 1) : value;
      });
      return t.zh.replace(HOLE, (_, n) => holes[n] ?? '');
    }
    return undefined;
  };

  function translate(s, depth = 0) {
    if (typeof s !== 'string' || !LETTERS.test(s)) return s;
    const hit = cache.get(s);
    if (hit !== undefined) return hit;
    const lead = s.match(/^\s*/)[0];
    const tail = s.slice(lead.length).match(/\s*$/)[0];
    const core = s.slice(lead.length, s.length - tail.length);
    let out = lookup(core);
    if (out === undefined) out = fromTemplate(squash(core), depth);
    if (out === undefined) out = parts.get(squash(core).toLowerCase());
    if (out === undefined && core.includes('\n')) {
      const lines = core.split('\n');
      const done = lines.map((line) => translate(line, depth + 1));
      if (done.some((line, i) => line !== lines[i])) out = done.join('\n');
    }
    if (out === undefined && core.includes(' · ')) {
      const parts = core.split(' · ');
      const done = parts.map((part) => translate(part, depth + 1));
      if (done.some((part, i) => part !== parts[i])) out = done.join(' · ');
    }
    if (out === undefined && /\S\s{2,}\S/.test(core)) {
      const parts = core.split(/(\s{2,})/);
      const done = parts.map((part, i) => (i % 2 ? part : translate(part, depth + 1)));
      if (done.some((part, i) => part !== parts[i])) out = done.join('');
    }
    if (out === undefined && /[.!?。！？]\s+["“A-Z]/.test(core)) {
      // sentences joined in code ("Records the archive could not file. Five open the last carriage.")
      const parts = core.split(/(?<=[.!?。！？])\s+(?=["“A-Z])/);
      const done = parts.map((part) => translate(part, depth + 1));
      if (done.some((part, i) => part !== parts[i])) out = done.reduce((acc, part, i) => acc + (i && (/[A-Za-z.!?]$/.test(acc) && /^[A-Za-z"“]/.test(part)) ? ' ' : '') + part, '');
    }
    if (out === undefined && depth < 3) {
      // keys or arrows before the words: "← → WALK", "E PICK UP", "[H] HINT"
      const m = core.match(/^((?:[^A-Za-z\s]+|[A-Z](?![A-Za-z]))(?:\s+(?:[^A-Za-z\s]+|[A-Z](?![A-Za-z])))*\s+)([A-Za-z][\s\S]*)$/);
      if (m) {
        const rest = translate(m[2], depth + 1);
        if (rest !== m[2]) out = m[1] + rest;
      }
    }
    return remember(s, out === undefined ? s : lead + out + tail);
  }

  // HTML: the whole string when the table has it, else each text run
  // between tags (entities decoded for the lookup, encoded again after).
  const htmlCache = new Map();
  function translateHtml(html) {
    if (typeof html !== 'string' || !LETTERS.test(html)) return html;
    const hit = htmlCache.get(html);
    if (hit !== undefined) return hit;
    let out;
    const whole = translate(html);
    if (whole !== html) out = whole;
    else {
      out = html.replace(/(^|>)([^<]+)(?=<|$)/g, (m, open, text) => {
        if (!LETTERS.test(text)) return m;
        const plain = decode(text);
        const zh = translate(plain);
        return zh === plain ? m : open + encode(zh);
      });
      // attributes a player reads
      out = out.replace(/\b(title|aria-label|placeholder|alt)="([^"]*)"/g, (m, name, value) => {
        const plain = decode(value);
        const zh = translate(plain);
        return zh === plain ? m : `${name}="${encode(zh).replace(/"/g, '&quot;')}"`;
      });
    }
    if (htmlCache.size >= cacheLimit) htmlCache.clear();
    htmlCache.set(html, out);
    return out;
  }

  return { tr: translate, trHtml: translateHtml, size: exact.size, templates: templates.length };
}

// CJK text has no spaces to break at: split it into characters, keeping
// closing punctuation off the start of a line and opening marks off its end.
const NO_START = new Set('，。、；：！？）」』》〉”’…—·%,.!?;:)]}');
const NO_END = new Set('（「『《〈“‘([{');
export const hasCJK = (s) => /[　-鿿＀-￯]/.test(s);

/** Break `text` into lines no wider than `width`, using `measure(str) → px`. */
export function wrapCJK(text, width, measure) {
  const out = [];
  for (const para of String(text).split('\n')) {
    // tokens: a Latin word (with its trailing space) stays whole, CJK splits per character
    const tokens = para.match(/[A-Za-z0-9'’\-.,:;!?()/{}#%]+\s*|\s+|./gu) ?? [''];
    let line = '';
    for (const token of tokens) {
      const next = line + token;
      if (line && measure(next.trimEnd()) > width) {
        // kinsoku: pull a forbidden start back onto this line, push an opening mark down
        if (NO_START.has(token[0]) && line.length > 1) { out.push(line + token); line = ''; continue; }
        let carry = '';
        while (line.length > 1 && NO_END.has(line[line.length - 1])) { carry = line[line.length - 1] + carry; line = line.slice(0, -1); }
        out.push(line.trimEnd());
        line = carry + token.trimStart();
      } else line = next;
    }
    out.push(line.trimEnd());
  }
  return out;
}
