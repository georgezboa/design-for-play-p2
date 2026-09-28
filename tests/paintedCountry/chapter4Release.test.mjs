import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';
import { HOLD_SECONDS, MIN_FONT_PX, RESTART_HOLD_SECONDS, SAFE, clampToSafe } from '../../src/chapters/paintedCountry/chapterConstants.js';

// Chapter 4 release-1.0 rules, checked against the sources themselves.
// PaintedCountryInhabitantScene.js is the Museum's sealed Chapter 5 slice
// (chapter05-painted-country.html) and is out of scope here.

const dir = new URL('../../src/chapters/paintedCountry/', import.meta.url);
const MUSEUM_SLICE = ['PaintedCountryInhabitantScene.js', 'paintedCountryInflationModel.js', 'painted-country-main.js'];
const files = readdirSync(dir).filter((f) => f.endsWith('.js') && !MUSEUM_SLICE.includes(f));
const sources = Object.fromEntries(files.map((f) => [f, readFileSync(new URL(f, dir), 'utf8')]));
const main = readFileSync(new URL('../../src/paintedCountry-main.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../painted-country.html', import.meta.url), 'utf8');
const all = [...Object.values(sources), main, html].join('\n');

test('the old symbol set and the clashing names are gone from the chapter', () => {
  for (const banned of [/\bMOON\b/i, /\bOEDON\b/i, /\bHEIR\b/, /\bRAPTURE\b/i, /BORROWED TRAIN/i, /COLOR STONE/i, /SMALL SEAL/i, /COLOR LINK/i, /Infinity Train/i]) {
    assert.doesNotMatch(all, banned, String(banned));
  }
  assert.match(sources['DrawingStudioScene.js'], /TO THE PAINTED TRAIN/);
  assert.match(sources['PigmentTrainScene.js'], /PIGMENT STONE/);
});

test('no text in the chapter is smaller than 11 design px (≈20 px at 1080p, ≈13 px at 720p)', () => {
  assert.equal(MIN_FONT_PX, 11);
  for (const [file, source] of Object.entries(sources)) {
    for (const match of source.matchAll(/fontSize: '(\d+)px'/g)) {
      assert.ok(Number(match[1]) >= MIN_FONT_PX, `${file}: ${match[0]}`);
    }
    for (const match of source.matchAll(/px\((\d+)\)/g)) {
      assert.ok(Number(match[1]) >= MIN_FONT_PX, `${file}: ${match[0]}`);
    }
  }
});

test('one hold time for every hold: 0.25 s; restarting is a one-second hold with a confirm', () => {
  assert.equal(HOLD_SECONDS, 0.25);
  assert.equal(RESTART_HOLD_SECONDS, 1);
  for (const [file, source] of Object.entries(sources)) {
    if (file === 'chapterConstants.js') continue;
    assert.doesNotMatch(source, /const HOLD_SECONDS\s*=/, `${file} must use the shared hold time`);
    assert.doesNotMatch(source, /keydown-R|key\.toLowerCase\(\) === 'r'|JustDown\(this\.keys\.restart\)/, `${file} must not restart instantly`);
  }
  ['PaintedCountryScene.js', 'DrawingStudioScene.js', 'PigmentTrainScene.js', 'PaintedLineScene.js'].forEach((file) => {
    assert.match(sources[file], /new RestartHold\(this/, file);
  });
});

test('cyan is Mara\'s thread and nothing else', () => {
  for (const [file, source] of Object.entries(sources)) {
    const uses = [...source.matchAll(/PAPER\.cyan/g)].length;
    if (file === 'maraFigure.js') assert.ok(uses >= 1);
    else if (file === 'PaintedCountryScene.js') assert.equal(uses, 2, 'only the pulse on her mark in the notes');
    else if (file !== 'chapterUi.js' && file !== 'paperPalette.js') assert.equal(uses, 0, file);
  }
  assert.doesNotMatch(all, /#2f8c9e/i);
});

test('prompts are clamped inside the safe margins, below the title strip', () => {
  const inside = clampToSafe(955, 10, 200, 30);
  assert.ok(inside.x + 100 <= SAFE.right && inside.y - 30 >= SAFE.top);
  const left = clampToSafe(-50, 300, 120, 20);
  assert.ok(left.x - 60 >= SAFE.left);
});

test('keyboard and gamepad drive the same brush: arrows / right stick aim, Space / A paint, Shift / B wash', () => {
  const brush = sources['brushInput.js'];
  assert.match(brush, /up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', paint: 'SPACE', wash: 'SHIFT'/);
  assert.match(brush, /pad\.axes\[2\]\.getValue\(\)/);
  assert.match(brush, /this\.keys\.paint\.isDown \|\| Boolean\(pad\?\.A\)/);
  assert.match(brush, /this\.keys\.wash\.isDown \|\| Boolean\(pad\?\.B\)/);
  assert.match(main, /input: \{ gamepad: true \}/);
  const keys = CHAPTER_CONTROLS.paintedCountry.map(([, k]) => k).join(' ');
  for (const needle of ['LEFT MOUSE', 'RIGHT MOUSE', 'ARROW KEYS', 'RIGHT STICK', 'SPACE', 'SHIFT', 'PAD A', 'PAD B', 'HOLD R']) {
    assert.match(keys, new RegExp(needle), needle);
  }
});

test('QA routes stay dev-only', () => {
  for (const [file, source] of Object.entries(sources)) {
    assert.doesNotMatch(source, /import\.meta\.env\.DEV|window\.location\.search/, file);
  }
  assert.match(main, /devRoutesEnabled\(\) \? new URLSearchParams/);
  assert.match(main, /if \(DEV_MODE\) window\.render_game_to_text/);
});

test('the chapter speaks the shared UI language: Space Mono labels, Georgia voice, walnut page', () => {
  assert.match(main, /import '\.\/fonts\/fonts\.css'/);
  assert.match(sources['chapterConstants.js'], /"Space Mono"/);
  assert.match(sources['chapterConstants.js'], /Georgia/);
  assert.match(html, /background: #1c130d/);
  assert.match(sources['PaintedCountryScene.js'], /kicker: 'CHAPTER 4 · THE PAINTED COUNTRY'/);
  assert.match(sources['PaintedCountryScene.js'], /stamp: 'CLAIM 1978-0412 · SECOND CLAIM'/);
  assert.match(sources['PaintedCountryScene.js'], /title: 'Bellwether Orchard'/);
  assert.match(sources['PaintedCountryScene.js'], /Address not on file\./);
});

test('the Museum\'s painted-country slice still has every drawing helper it imports', async () => {
  const inhabitant = readFileSync(new URL('PaintedCountryInhabitantScene.js', dir), 'utf8');
  const surface = await import('../../src/chapters/paintedCountry/paperSurface.js');
  const palette = await import('../../src/chapters/paintedCountry/paperPalette.js');
  const imported = inhabitant.match(/import \{([^}]+)\} from '\.\/paperSurface\.js'/)[1].split(',').map((s) => s.trim());
  imported.forEach((name) => assert.equal(typeof surface[name], 'function', name));
  assert.ok(palette.PAPER.sheet);
});
