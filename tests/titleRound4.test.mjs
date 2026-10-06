// Alpha round 4 (P2): the title plaque at large text, the seated Butch, and
// the credits roll's bar, speed keys and departure times.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOARD_FIT_LEVELS, creditDepartureTime, formatCreditRate } from '../src/shell/titleMenuBoard.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('src/shell/titleMenu.css');
const menu = read('src/shell/titleMenu.js');
const art = read('src/shell/titlePlateArt.js');

test('the credits board shows real clock times, past midnight as 00:xx', () => {
  const times = Array.from({ length: 24 }, (_, i) => creditDepartureTime(i));
  times.forEach((time) => {
    assert.match(time, /^([01]\d|2[0-3]):[0-5]\d$/, time);
  });
  assert.equal(times[0], '23:00');
  assert.equal(times[2], '23:22');
  assert.equal(times[6], '00:06');
  assert.ok(!menu.includes('String(23 + Math.floor(index / 2))'), 'no 24:xx');
  assert.match(menu, /<span class="nf-credit-time">\$\{creditDepartureTime\(index\)\}<\/span>/);
});

test('the credits bar says which arrow slows and which speeds, and shows the speed', () => {
  assert.match(menu, /<kbd>↑<\/kbd> SLOWER <i><\/i> <kbd>↓<\/kbd> FASTER/);
  assert.match(menu, /changeCreditSpeed\(event\.key === 'ArrowDown'\)/);
  assert.equal(formatCreditRate(1), 'SPEED 1×');
  assert.equal(formatCreditRate(1.5), 'SPEED 1.5×');
  assert.equal(formatCreditRate(1 / 1.5), 'SPEED 0.67×');
  assert.match(menu, /shown\.textContent = formatCreditRate\(creditPlaybackRate\)/);
});

test('the roll ends above the control bar and fades out before it', () => {
  const rule = css.match(/\.nf-credits-viewport \{[^}]*\}/)[0];
  assert.match(rule, /inset: 0 0 var\(--nf-credits-bar\) 0/);
  assert.match(rule, /mask-image: linear-gradient\(to bottom, transparent 0, #000 9vh, #000 calc\(100% - 16vh\), transparent 100%\)/);
});

test('large text: the plaque steps down until every line shows (QUIT GAME included)', () => {
  assert.deepEqual([...BOARD_FIT_LEVELS], ['', 'tight', 'small', 'smaller', 'compact', 'smallest', 'tiny']);
  BOARD_FIT_LEVELS.slice(1).forEach((level) => assert.ok(css.includes(`[data-fit="${level}"]`) || level === 'tight', level));
  assert.match(css, /#nightfall-title\[data-fit\] \.nf-main-actions \.nf-action \{ padding-block/);
  assert.match(css, /\* var\(--nightfall-text-scale\) \* var\(--nf-fit, 1\)\)/);
  assert.match(menu, /window\.addEventListener\('nightfall:settings', \(event\) => \{ syncCreditVolume\(event\.detail\); scheduleFit\(\); \}\);/);
  assert.match(menu, /window\.addEventListener\('resize', scheduleFit\);/);
});

test('the key hints are spaced, not dotted, so a wrapped line never starts on a lone dot', () => {
  assert.ok(!css.includes('.nf-hint span + span::before'));
  assert.match(css, /\.nf-hint \{ column-gap: 1\.25em; row-gap: \.15em; \}/);
});

test('seated Butch has two legs: a tucked far leg and a planted near one, each with a boot', () => {
  assert.match(art, /const farLeg = leg\(\[31, -5\], \[26\.5, floor - 6\]/);
  assert.match(art, /const shin = leg\(\[38\.5, -6\], \[43\.5, floor - 6\]/);
  assert.equal((art.match(/boot\(\d[^)]*, \d/g) ?? []).length, 2);
});
