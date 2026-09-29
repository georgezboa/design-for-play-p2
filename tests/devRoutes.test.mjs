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

test('index.html boots no game: title, credits, legacy ?play=1 resume and the dev launcher only', () => {
  const main = read('src/main.js');
  assert.doesNotMatch(main, /from 'phaser'|new Phaser\.Game|\.\/scenes\//);
  assert.match(main, /import\('\.\/shell\/devLauncher\.js'\)/);
  assert.match(main, /DEV_MODE && params\.get\('title'\) !== '1'/);
  const html = read('index.html');
  assert.doesNotMatch(html, /id="game"/);
  assert.match(html, /src="\/src\/main\.js"/);
});
