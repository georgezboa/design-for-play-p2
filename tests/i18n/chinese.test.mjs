// NIGHTFALL 汉化 (2026-10-11): the Chinese table covers every string the
// extractor found, keeps each string's placeholders, tags and separators, and
// the generated table matches its sources; the translator and the CJK line
// breaker behave; the language follows SETTINGS · 中文, else the computer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { problemsFor } from '../../scripts/i18n/check_chunk.mjs';
import { buildTable } from '../../scripts/i18n/build.mjs';
import table from '../../src/shared/i18n/zh.generated.js';
import { createTranslator, wrapCJK } from '../../src/shared/i18n/translate.js';
import { chineseWanted } from '../../src/shared/i18n/locale.js';
import { SETTINGS_CONTROLS, settingValue } from '../../src/shell/settingsControls.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const strings = read('scripts/i18n/strings.json');
const zhDir = new URL('../../scripts/i18n/zh/', import.meta.url);
const all = {};
for (const name of fs.readdirSync(zhDir).filter((n) => n.endsWith('.json'))) Object.assign(all, read(`scripts/i18n/zh/${name}`));

test('every extracted string has its Chinese, with the same placeholders, tags and separators', () => {
  assert.ok(strings.length > 2500, `${strings.length} strings`);
  const bad = [];
  for (const { key } of strings) {
    const p = problemsFor(key, all[key]);
    if (p.length) bad.push(`${key.slice(0, 70)}: ${p.join('; ')}`);
  }
  assert.deepEqual(bad, []);
});

test('the generated table is the zh/*.json sources (run scripts/i18n/build.mjs after editing them)', () => {
  assert.deepEqual(table, buildTable());
});

test('the names George asked for are used consistently', () => {
  const values = Object.values(table).join('\n');
  for (const old of ['霍索恩', '总站街', '维恩']) assert.equal(values.includes(old), false, old);
  assert.equal(table.Butch ?? table.BUTCH, '布奇');
  assert.equal(table['Echo City'] ?? table['ECHO CITY'], '回声城');
});

test('the translator: exact, whitespace, case, templates with plurals, joined labels, HTML runs', () => {
  const { tr, trHtml } = createTranslator({
    BACK: '返回',
    'MASTER VOLUME': '主音量',
    'Echo City': '回声城',
    '{0} KEY{1} LEFT': '剩余 {0} 把钥匙{1}',
    'The cut feed ends {0} of here.': '断口在这儿往{0}。',
    north: '北',
  });
  assert.equal(tr('BACK'), '返回');
  assert.equal(tr('  BACK \n'), '  返回 \n');
  assert.equal(tr('ECHO CITY'), '回声城');
  assert.equal(tr('MASTER  VOLUME'), '主音量');
  assert.equal(tr('3 KEYS LEFT'), '剩余 3 把钥匙');
  assert.equal(tr('1 KEY LEFT'), '剩余 1 把钥匙');
  assert.equal(tr('The cut feed ends north of here.'), '断口在这儿往北。');
  assert.equal(tr('E · BACK'), 'E · 返回');
  assert.equal(tr('BACK\nMASTER VOLUME'), '返回\n主音量');
  assert.equal(tr('A D  ·  ← →  BACK'), 'A D  ·  ← →  返回');
  assert.equal(tr('Something else entirely'), 'Something else entirely');
  assert.equal(tr('返回'), '返回');
  assert.equal(trHtml('<span>MASTER VOLUME</span><kbd>E</kbd> &amp; BACK'), '<span>主音量</span><kbd>E</kbd> &amp; 返回');
  assert.equal(trHtml('<button title="BACK">BACK</button>'), '<button title="返回">返回</button>');
});

test('Chinese lines break between characters, keeping closing marks off a line start', () => {
  const measure = (s) => [...s].length * 10;
  assert.deepEqual(wrapCJK('一二三四五六七八', 40, measure), ['一二三四', '五六七八']);
  const lines = wrapCJK('一二三，四五六', 30, measure);
  assert.ok(lines.every((l) => !l.startsWith('，')), lines.join('|'));
  assert.deepEqual(wrapCJK('按 Tab 选中', 1000, measure), ['按 Tab 选中']);
  assert.deepEqual(wrapCJK('一\n二', 100, measure), ['一', '二']);
});

test('the language follows SETTINGS · 中文, else the computer’s first language', () => {
  assert.equal(chineseWanted({ chinese: true }, { languages: ['en-US'] }), true);
  assert.equal(chineseWanted({ chinese: false }, { languages: ['zh-CN'] }), false);
  assert.equal(chineseWanted({}, { languages: ['zh-CN', 'en'] }), true);
  assert.equal(chineseWanted({}, { languages: ['zh-Hant-TW'] }), true);
  assert.equal(chineseWanted({}, { languages: ['en-GB', 'zh-CN'] }), false);
  assert.equal(chineseWanted({}, { language: 'fr' }), false);
  assert.ok(SETTINGS_CONTROLS.some(([key, , type]) => key === 'chinese' && type === 'checkbox'));
  assert.equal(settingValue({ chinese: true }, 'chinese'), true);
  assert.equal(settingValue({ masterVolume: 40 }, 'masterVolume'), 40);
});

test('every page runs the Chinese install first; the Phaser pages also patch Text', async () => {
  const { default: config } = await import('../../vite.config.js');
  const resolved = config({ command: 'build', mode: 'production' });
  const plugin = resolved.plugins.find((p) => p?.name === 'nightfall-i18n');
  assert.ok(plugin);
  const html = '<!doctype html><html><head><title>x</title></head><body><script type="module" src="/src/main.js"></script></body></html>';
  const out = plugin.transformIndexHtml.handler(html, { filename: '/x/index.html' });
  assert.ok(out.indexOf('/src/shared/i18n/install.js') < out.indexOf('/src/main.js'));
  assert.equal(out.includes('i18n/phaser.js'), false);
  const phaserPage = plugin.transformIndexHtml.handler(html, { filename: '/x/night-service.html' });
  assert.ok(phaserPage.includes('/src/shared/i18n/phaser.js'));
});
