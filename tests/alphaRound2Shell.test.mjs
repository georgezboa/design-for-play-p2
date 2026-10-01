// Alpha round 2 (G1 · shell): regression tests for R3-1, N3, R2-6, R4-6,
// R4-7, the router play-time leak and the credits URL.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MAGIC_STONE_IDS, ROUTER_SAVE_KEY, SAVE_KEY, applySettings, createSaveStore, seedRouterSave,
} from '../src/shell/saveSystem.js';
import { firstStoneNotice, magicStoneRow, magicStoneRowHtml, magicStoneSnapshot, missingStoneNotice } from '../src/shell/magicStones.js';
import { DEV_ROUTES } from '../src/shell/devRoutes.js';
import { installPlayClock } from '../src/shell/playClock.js';
import { clearCreditsQuery, titleUrlWithoutCredits } from '../src/shell/endCredits.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

/** The CSS rule bodies for an exact selector (every occurrence). */
function rules(css, selector) {
  const out = [];
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'g');
  let m;
  while ((m = re.exec(css))) out.push(m[2]);
  return out;
}

// ---------- R3-1: LOW GRAPHICS and the paper tag ----------

test('R3-1: applySettings exposes LOW GRAPHICS to CSS as data-low-graphics', () => {
  const dataset = {};
  const previous = globalThis.document;
  globalThis.document = {
    documentElement: { dataset, style: { setProperty() {} } },
    querySelectorAll: () => [],
  };
  try {
    applySettings({ masterVolume: 80, musicVolume: 70, sfxVolume: 85, reducedMotion: false, textScale: 100, lowGraphics: true });
    assert.equal(dataset.lowGraphics, 'true');
    assert.equal(globalThis.NIGHTFALL_SETTINGS.lowGraphics, true);
    applySettings({ masterVolume: 80, musicVolume: 70, sfxVolume: 85, reducedMotion: false, textScale: 100, lowGraphics: false });
    assert.equal(dataset.lowGraphics, 'false');
  } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});

test('R3-1: the paper tag carries no CSS filter, and LOW GRAPHICS stops its animation', () => {
  const css = read('src/shell/uiKit.css');
  const tag = rules(css, '.nf-tag').join('\n');
  assert.ok(tag, 'the .nf-tag rule exists');
  assert.doesNotMatch(tag, /filter\s*:/, 'no filter: drop-shadow over the WebGL canvas');
  assert.doesNotMatch(tag, /clip-path/, 'the notch is painted, so a plain box-shadow can sit under it');
  const low = rules(css, ":root[data-low-graphics='true'] .nf-tag").join('\n');
  assert.match(low, /box-shadow:\s*none/);
  assert.match(rules(css, ":root[data-low-graphics='true'] .nf-tag::after").join('\n'), /animation:\s*none/);
  assert.match(css, /:root\[data-low-graphics='true'\] \.nf-caption__next \{ animation: none; \}/);
  // the pause menu drops its full-screen backdrop blur too
  assert.match(read('src/shell/pauseMenu.css'), /:root\[data-low-graphics='true'\] \.nf-pause-backdrop \{ backdrop-filter: none;/);
});

// ---------- N3: the pause card at 1280×720 ----------

test('N3: short, wide windows get the three-column pause card', () => {
  const css = read('src/shell/pauseMenu.css');
  const block = css.slice(css.indexOf('@media (max-height: 820px) and (min-width: 900px)'));
  assert.ok(block.length > 0 && css.includes('@media (max-height: 820px) and (min-width: 900px)'));
  assert.match(block, /\.nf-pause-controls-note \{[^}]*columns: 2;/, 'the legend splits in two');
  assert.match(block, /\.nf-pause-controls-note div \{[^}]*break-inside: avoid;/);
  assert.match(block, /\.nf-pause-body \{[^}]*grid-template-columns: minmax\(0, [.\d]+fr\) minmax\(0, 2fr\);/);
  assert.match(block, /\.nf-pause-stones \{[^}]*grid-auto-flow: column;/, 'stones and their line share a row');
});

// ---------- R2-6 / R4-6: the socket rows ----------

test('R2-6: the first stone lights the first socket, whichever stone it is', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  store.startNew(0);
  store.collectMagicStone('chapter-2');
  const notice = firstStoneNotice('chapter-2', storage);
  assert.match(notice.stamp, /MAGIC STONE 1 \/ 5/);
  const classes = [...notice.socketsHtml.matchAll(/<i class="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(classes, ['is-held', '', '', '', ''], '"1 / 5" lights pip one');
  assert.match(notice.socketsHtml, /<i class="is-held" title="GRID STONE"/);
  // the offer card's pending stone sits right after the held ones
  const pending = magicStoneRowHtml(magicStoneSnapshot(storage), { pending: 'chapter-4' });
  assert.deepEqual([...pending.matchAll(/<i class="([^"]*)"/g)].map((m) => m[1]), ['is-held', 'is-pending', '', '', '']);
  // the registry-order row (true ending, finale) is unchanged
  assert.deepEqual(magicStoneRow(magicStoneSnapshot(storage)).map(({ held }) => held), [false, true, false, false, false]);
});

test('R4-6: the credits stones card lights the held sockets', () => {
  const notice = missingStoneNotice(['chapter-1', 'chapter-3']);
  const held = [...notice.socketsHtml.matchAll(/<i class="is-held"/g)].length;
  assert.equal(held, 2);
  const css = read('src/shell/titleMenu.css');
  const empty = rules(css, '.nf-stones-sockets .nf-stones i').join('\n');
  assert.match(empty, /background:/, 'the card restyles empty sockets ...');
  const lit = rules(css, '.nf-stones-sockets .nf-stones i.is-held').join('\n');
  assert.match(lit, /background: radial-gradient/, '... so it must restyle held ones at the same scope');
  assert.ok(css.indexOf('.nf-stones-sockets .nf-stones i.is-held') > css.indexOf('.nf-stones-sockets .nf-stones i {'), 'and after it');
});

// ---------- R4-7 and play time: router sessions ----------

test('R4-7: the five-stone router nodes seed all five stones on the scratch save', () => {
  const byId = Object.fromEntries(DEV_ROUTES.map((entry) => [entry.id, entry]));
  assert.equal(byId['6.5'].stones, 'all');
  assert.equal(byId['6.6'].stones, 'all');
  assert.equal(DEV_ROUTES.filter((entry) => entry.stones).length, 2, 'only the five-stone nodes');
  const storage = memoryStorage();
  const real = createSaveStore(storage, { scratch: false });
  real.startNew(0);
  real.collectMagicStone('chapter-1', { slot: 0 });
  const before = storage.getItem(SAVE_KEY);
  seedRouterSave(byId['6.5'].checkpoint, { storage, stones: byId['6.5'].stones });
  const scratch = createSaveStore(storage, { scratch: true }).readAll()[0];
  assert.deepEqual(scratch.magicStones, [...MAGIC_STONE_IDS]);
  assert.equal(storage.getItem(SAVE_KEY), before, 'the real slot keeps its one stone');
  // any other node still copies the active slot's stones
  seedRouterSave('chapter-6-start', { storage });
  assert.deepEqual(createSaveStore(storage, { scratch: true }).readAll()[0].magicStones, ['chapter-1']);
  assert.match(read('src/shell/titleMenu.js'), /seedRouterSave\(chapter\.checkpoint, \{ stones: chapter\.stones \?\? null \}\)/);
});

test('router play time accrues to the scratch save only, even after the router flag is cleared', () => {
  const storage = memoryStorage();
  const real = createSaveStore(storage, { scratch: false });
  real.startNew(0);
  real.addPlaySeconds(9000, { slot: 0 });
  seedRouterSave('chapter-2-start', { storage });
  let now = 0;
  const listeners = {};
  const docListeners = {};
  const win = {
    performance: { now: () => now },
    setInterval: () => 1,
    clearInterval: () => {},
    addEventListener: (type, fn) => { listeners[type] = fn; },
    document: { visibilityState: 'visible', addEventListener: (type, fn) => { docListeners[type] = fn; } },
  };
  const clock = installPlayClock({ win, storage, scratch: true });
  assert.deepEqual(clock.target, { scratch: true });
  now += 4000;
  clock.clock.tick();
  // BACK TO THE TITLE: the router flag is gone before the page hides
  now += 4000;
  listeners.pagehide();
  clock.stop();
  assert.equal(real.readAll()[0].playSeconds, 9000, 'the real slot does not gain the router visit');
  assert.equal(JSON.parse(storage.getItem(ROUTER_SAVE_KEY))[0].playSeconds, 8);
  assert.match(read('src/shell/playClock.js'), /createSaveStore\(storage, target\)\.addPlaySeconds/);
});

// ---------- the credits URL ----------

test('BACK TO THE TITLE drops ?credits=1&ending=normal from the URL', () => {
  assert.equal(titleUrlWithoutCredits('http://localhost/?credits=1&ending=normal'), '/');
  assert.equal(titleUrlWithoutCredits('http://localhost/?credits=1&title=1#x'), '/?title=1#x');
  assert.equal(titleUrlWithoutCredits('http://localhost/?title=1'), null, 'nothing to clean');
  const calls = [];
  const win = { location: { href: 'http://localhost/?credits=1&ending=normal' }, history: { state: null, replaceState: (...args) => calls.push(args) } };
  assert.equal(clearCreditsQuery(win), true);
  assert.deepEqual(calls, [[null, '', '/']]);
  const title = read('src/shell/titleMenu.js');
  assert.match(title, /const closeDialog = \(\) => \{[\s\S]*?clearCreditsQuery\(window\);[\s\S]*?\};/);
});
