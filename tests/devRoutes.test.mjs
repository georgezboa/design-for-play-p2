import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { DEV_ROUTES, DEV_SHELL_ROUTES } from '../src/shell/devRoutes.js';
import { CHECKPOINTS } from '../src/shell/saveSystem.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = (route) => new URL(route, 'http://nightfall.local').pathname.replace(/^\//, '') || 'index.html';
const viteConfig = read('vite.config.js');

test('every dev route opens a page that exists, with a known checkpoint', () => {
  const ids = new Set(CHECKPOINTS.map(({ id }) => id));
  for (const entry of DEV_ROUTES) {
    assert.ok(existsSync(new URL(`../${page(entry.route)}`, import.meta.url)), `${entry.route} has no page`);
    assert.ok(ids.has(entry.checkpoint), `${entry.id} names unknown checkpoint ${entry.checkpoint}`);
  }
  for (const entry of DEV_SHELL_ROUTES) {
    assert.ok(existsSync(new URL(`../${page(entry.route)}`, import.meta.url)), `${entry.route} has no page`);
  }
});

test('every chapter route in the dev list is a production build input, except the dev-only pages', () => {
  for (const entry of DEV_ROUTES) {
    const input = new RegExp(`resolve\\([^)]*'${page(entry.route).replace('.', '\\.')}'`);
    if (entry.devOnly) assert.doesNotMatch(viteConfig, input, entry.route);
    else assert.match(viteConfig, input, entry.route);
  }
  assert.deepEqual(DEV_ROUTES.filter((entry) => entry.devOnly).map((entry) => entry.route), ['/chapter05-painted-country.html']);
});

test('every checkpoint, legacy ids included, resumes on a production page', () => {
  for (const checkpoint of CHECKPOINTS) {
    assert.match(viteConfig, new RegExp(`'${page(checkpoint.route).replace('.', '\\.')}'`), checkpoint.id);
  }
  const byId = Object.fromEntries(CHECKPOINTS.map((checkpoint) => [checkpoint.id, checkpoint]));
  assert.equal(byId['prologue-start'].route, '/night-service.html');
  for (const id of ['chapter-2-start', 'chapter-2-midpoint', 'chapter-2-platform']) {
    assert.match(byId[id].route, /^\/borrowed-light\.html/);
  }
});

test('Chapter 3 nodes open the beat they name, in play order (round 3, G15)', () => {
  const main = read('src/car03-3d-main.js');
  const starts = Object.fromEntries([...main.matchAll(/'(chapter3-[a-z-]+)': '([a-z-]+)'/g)].map(([, param, start]) => [param, start]));
  const ch3 = DEV_ROUTES.filter(({ id }) => id.startsWith('3.'));
  assert.deepEqual(ch3.map(({ id }) => id), ['3.1', '3.1a', '3.1b', '3.2', '3.3', '3.4', '3.4a', '3.5', '3.5a', '3.6']);
  const param = (entry) => new URL(entry.route, 'http://nightfall.local').searchParams.get('playtest');
  const byId = Object.fromEntries(ch3.map((entry) => [entry.id, param(entry)]));
  for (const [id, playtest] of Object.entries(byId)) {
    if (playtest) assert.ok(starts[playtest], `${id}: ${playtest} is a playtest start`);
  }
  assert.equal(byId['3.1'], null);
  assert.equal(starts[byId['3.1a']], 'oil-seam');
  assert.equal(starts[byId['3.1b']], 'ministry-walk');
  assert.equal(starts[byId['3.4']], 'cut-interface', '3.4 starts at the dusk cut, like the dusk save');
  assert.equal(byId['3.4a'], 'chapter3-magic-stone', '3.4a is the optional fire');
  assert.equal(starts[byId['3.5']], 'hotel', '3.5 starts at the Copper Heron');
  assert.equal(starts[byId['3.5a']], 'wire');
  assert.equal(starts[byId['3.6']], 'station');
});

test('index.html boots no game: title, credits, legacy ?play=1 resume and the dev launcher only', () => {
  const main = read('src/main.js');
  assert.doesNotMatch(main, /from 'phaser'|new Phaser\.Game|\.\/scenes\//);
  assert.match(main, /import\('\.\/shell\/devLauncher\.js'\)/);
  assert.match(main, /DEV_MODE && params\.get\('title'\) !== '1'/);
  const html = read('index.html');
  assert.doesNotMatch(html, /id="game"/);
  assert.match(html, /src="\/src\/main\.js"/);
});

test('a playtest router lists only shipped, on-route nodes with player-safe copy (A2-14 / A4-11)', async () => {
  const { routerEntries } = await import('../src/shell/devRoutes.js');
  const listed = routerEntries().map(({ id }) => id);
  assert.ok(!listed.includes('5.6'), 'the dev-only painted-country page is not built for production');
  assert.ok(!listed.includes('5.3'), 'the sealed museum reconstruction is not on the shipping route');
  for (const entry of routerEntries()) {
    assert.ok(!entry.devOnly && !entry.devBuildOnly, entry.id);
    assert.doesNotMatch(`${entry.title} ${entry.detail}`, /DEV ONLY|BLACK KNIFE|VENN|VELEZ|Mara|suitcase|ladder|Grid runner|not in production/i, entry.id);
  }
  // Every Chapter 6 node describes the movement it opens today.
  const ch6 = Object.fromEntries(DEV_ROUTES.filter(({ id }) => id.startsWith('6.')).map((entry) => [entry.id, entry]));
  assert.match(ch6['6.1'].detail, /lens/);
  assert.match(ch6['6.2'].detail, /bell/);
  assert.match(ch6['6.3'].detail, /truths/);
  assert.match(ch6['6.4'].detail, /pigment/);
  const title = read('src/shell/titleMenu.js');
  assert.match(title, /DEV_MODE \? DEV_ROUTES : PLAYTEST_MODE \? routerEntries\(\) : \[\]/);
  assert.match(read('src/shell/devLauncher.js'), /seedRouterSave\(entry\.checkpoint, \{ stones: entry\.stones \?\? null \}\); activateHiddenRouter\(\);/);
});
