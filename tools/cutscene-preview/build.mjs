// Build the cutscene preview as one static folder:
//   node tools/cutscene-preview/build.mjs [outDir]
// = vite build of this page, the public/ files the cutscenes ask for at run
// time (plates and stand-ins, Chapter 1's painted figures and chrome, the
// music), and page.html: the page as a fragment for a host that wraps it in
// its own document (assets referenced relative to it).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const here = import.meta.dirname;
const root = resolve(here, '../..');
const out = resolve(process.argv[2] || '/tmp/claude-0/cs-preview');
execFileSync('npx', ['vite', 'build', '--config', join(here, 'vite.config.mjs'), '--logLevel', 'warn'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, NF_PREVIEW_OUT: out },
});

const copy = (rel) => {
  const from = join(root, 'public', rel);
  if (!existsSync(from)) return;
  mkdirSync(dirname(join(out, rel)), { recursive: true });
  cpSync(from, join(out, rel), { recursive: true });
};
// the plates (stand-ins included: the preview shows the work in progress)
copy('assets/cutscenes');
// Chapter 1's painted figures: full-size frames only (the kit draws those)
for (const kind of ['butch', 'mara', 'conductor', 'train']) {
  const dir = join(root, 'public/assets/ch1-painted/sprites', kind);
  readdirSync(dir).filter((f) => f.endsWith('.webp') && !f.includes('@')).forEach((f) => copy(`assets/ch1-painted/sprites/${kind}/${f}`));
}
copy('assets/ch1-painted/chrome/bezel.webp');
copy('assets/ch1-painted/chrome/walnut.webp');
// the music the eight cutscenes play
const music = new Set();
for (const f of readdirSync(join(root, 'src/shell/cutscene/scenes'))) {
  const text = readFileSync(join(root, 'src/shell/cutscene/scenes', f), 'utf8');
  for (const m of text.matchAll(/'(\/assets\/music\/[^']+\.mp3)'/g)) music.add(m[1].slice(1));
}
music.forEach((rel) => copy(rel));

// the page as a fragment, its script and stylesheet beside it
const built = readFileSync(join(out, 'tools/cutscene-preview/index.html'), 'utf8');
const script = built.match(/<script[^>]+src="([^"]+)"/)[1].replace(/^(\.\.\/)+/, '');
const styles = [...built.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1].replace(/^(\.\.\/)+/, ''));
const page = [
  '<title>NIGHTFALL 过场预览</title>',
  ...styles.map((href) => `<link rel="stylesheet" href="${href}">`),
  '<div id="nf-preview"></div>',
  `<script type="module" src="${script}"></script>`,
  '',
].join('\n');
writeFileSync(join(out, 'page.html'), page);

const files = [];
const walk = (dir) => readdirSync(dir).forEach((f) => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) walk(p);
  else files.push(p.slice(out.length + 1));
});
walk(out);
const shipped = files.filter((f) => f !== 'page.html' && !f.startsWith('tools/'));
writeFileSync(join(out, 'files.json'), JSON.stringify(Object.fromEntries(shipped.map((f) => [f, join(out, f)])), null, 1));
const bytes = shipped.reduce((n, f) => n + statSync(join(out, f)).size, 0);
console.log(`${shipped.length} files, ${(bytes / 1e6).toFixed(1)} MB → ${out}`);
