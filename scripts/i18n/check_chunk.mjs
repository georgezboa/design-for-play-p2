// Check one chunk's Chinese against its English: node scripts/i18n/check_chunk.mjs ch3-1
// Every key present; the same {n} placeholders; the same HTML tags in order;
// the same number of " · " separators and line breaks. Prints problems; exit 1 if any.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function problemsFor(key, zh) {
  const out = [];
  if (typeof zh !== 'string' || !zh.trim()) return ['missing'];
  const ph = (s) => (s.match(/\{\d+\}/g) ?? []).sort().join(',');
  if (ph(key) !== ph(zh)) out.push(`placeholders ${ph(key)} → ${ph(zh)}`);
  const tags = (s) => (s.match(/<\/?[a-z][^>]*>/gi) ?? []).join('');
  if (tags(key) !== tags(zh)) out.push('html tags differ');
  const dots = (s) => (s.match(/ · /g) ?? []).length;
  if (dots(key) !== dots(zh)) out.push(`separators ${dots(key)} → ${dots(zh)}`);
  const nl = (s) => (s.match(/\n/g) ?? []).length;
  if (nl(key) !== nl(zh)) out.push('line breaks differ');
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  const keys = JSON.parse(fs.readFileSync(path.join(ROOT, `scripts/i18n/chunks/${name}.json`), 'utf8')).map((e) => e.key);
  const zh = JSON.parse(fs.readFileSync(path.join(ROOT, `scripts/i18n/zh/${name}.json`), 'utf8'));
  let bad = 0;
  for (const key of keys) {
    const p = problemsFor(key, zh[key]);
    if (p.length) { bad += 1; console.log(`✗ ${JSON.stringify(key).slice(0, 90)}: ${p.join('; ')}`); }
  }
  const extra = Object.keys(zh).filter((k) => !k.startsWith('_') && !keys.includes(k));
  if (extra.length) console.log(`(${extra.length} keys not in the chunk, ignored)`);
  console.log(bad ? `${bad} of ${keys.length} need fixing` : `all ${keys.length} OK`);
  process.exit(bad ? 1 : 0);
}
