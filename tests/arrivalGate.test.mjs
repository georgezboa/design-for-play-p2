// Round 11 · the 2→3 hand-off: the cutscene plays on Echo City's page while
// the city loads underneath (src/shell/arrivalGate.js, gameFlow.js
// playCinematic({ arrival }), car03-3d-main.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ARRIVAL_PARAM, ARRIVAL_STALL_MS, arrivalFrom, arrivalRoute, arrivalStep, createArrivalGate, withoutArrival,
} from '../src/shell/arrivalGate.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the leaving chapter names the arrival in the address; the page reads it once', () => {
  assert.equal(ARRIVAL_PARAM, 'from');
  assert.equal(arrivalRoute('/car03-3d.html', 'chapter2'), '/car03-3d.html?from=chapter2');
  assert.equal(arrivalRoute('/car03-3d.html?stage=dusk', 'chapter2'), '/car03-3d.html?stage=dusk&from=chapter2');
  assert.equal(arrivalFrom('?from=chapter2', { expected: 'chapter2' }), 'chapter2');
  assert.equal(arrivalFrom('?from=chapter5', { expected: 'chapter2' }), null, 'another arrival is not this page\'s');
  assert.equal(arrivalFrom('', { expected: 'chapter2' }), null);
  assert.equal(arrivalFrom('?playtest=chapter3-oil&from=chapter2', { expected: 'chapter2', override: true }), null, 'a dev route wins');
  // a reload (or Continue) after the cutscene opens the chapter, not the cutscene
  assert.equal(withoutArrival('http://localhost:5181/car03-3d.html?from=chapter2'), '/car03-3d.html');
  assert.equal(withoutArrival('http://localhost:5181/car03-3d.html?quality=low&from=chapter2#x'), '/car03-3d.html?quality=low#x');
  assert.equal(withoutArrival('http://localhost:5181/car03-3d.html'), 'http://localhost:5181/car03-3d.html');
});

test('the gate is weighted stages that only rise, then settles once', async () => {
  let now = 0;
  const gate = createArrivalGate([
    { id: 'page', weight: 1 }, { id: 'models', weight: 2 }, { id: 'warm', weight: 1 },
  ], { now: () => now });
  const seen = [];
  gate.subscribe((value) => seen.push(Math.round(value * 100)));
  assert.equal(gate.progress(), 0);
  assert.equal(gate.status, 'loading');
  gate.report('page');
  gate.report('models', 0.5);
  assert.equal(gate.progress(), 0.5);
  assert.equal(gate.report('models', 0.25), false, 'progress never goes back');
  assert.equal(gate.report('nope', 1), false);
  now = 1000;
  assert.equal(gate.idleFor(), 1000);
  gate.report('models', 1);
  assert.equal(gate.idleFor(), 0);
  assert.equal(gate.progress(), 0.75);
  assert.equal(gate.ready(), true);
  assert.equal(gate.ready(), false, 'settles once');
  assert.equal(gate.fail(new Error('late')), false);
  assert.equal(gate.progress(), 1);
  assert.deepEqual(await gate.promise, { status: 'ready', error: null });
  assert.deepEqual(seen, [25, 50, 75, 100]);
});

test('a failed page settles the gate too (it is revealed with its own error, never held)', async () => {
  const gate = createArrivalGate([{ id: 'models', weight: 1 }]);
  const error = new Error('no city');
  gate.fail(error);
  assert.equal(gate.status, 'failed');
  assert.equal((await gate.promise).error, error);
  assert.equal(arrivalStep({ cutsceneDone: true, status: gate.status }), 'reveal');
});

test('the overlay plays, holds with progress, reveals, or hands over to the page rather than freeze', () => {
  assert.equal(arrivalStep({ cutsceneDone: false, status: 'loading' }), 'play');
  assert.equal(arrivalStep({ cutsceneDone: false, status: 'ready' }), 'play', 'the cutscene is never cut short by a quick page');
  assert.equal(arrivalStep({ cutsceneDone: true, status: 'loading', idleMs: 0 }), 'hold');
  assert.equal(arrivalStep({ cutsceneDone: true, status: 'loading', idleMs: ARRIVAL_STALL_MS - 1 }), 'hold');
  assert.equal(arrivalStep({ cutsceneDone: true, status: 'loading', idleMs: ARRIVAL_STALL_MS }), 'reveal-loading');
  assert.equal(arrivalStep({ cutsceneDone: true, status: 'ready' }), 'reveal');
  assert.ok(ARRIVAL_STALL_MS >= 15000 && ARRIVAL_STALL_MS <= 60000);
});

test('gameFlow drives an arrival from the gate: hold with live progress, pause menu, reveal on the live page', () => {
  const flow = read('src/shell/gameFlow.js');
  assert.match(flow, /const waitForPreload = Boolean\(preloadChapterId\) \|\| requirePreloadReady \|\| Boolean\(arrival\);/);
  assert.match(flow, /preloadPromise = arrival\.gate\.promise;/);
  assert.match(flow, /const fraction = arrival\?\.gate \? arrival\.gate\.progress\(\) : preloadProgress\(state\);/);
  assert.match(flow, /const step = arrivalStep\(\{ cutsceneDone: true, status: gate\.status, idleMs: gate\.idleFor\(\), stallMs: arrival\.stallMs \}\);/);
  assert.match(flow, /arrival\.onReveal\?\.\(\{ stalled: step === 'reveal-loading', status: arrival\.gate\.status \}\);[\s\S]*?setPageCovered\(false\);[\s\S]*?root\.classList\.add\('is-finished'\);/);
  // the hold never takes the pause menu away
  assert.match(flow, /if \(holdForPreload\) window\.addEventListener\('keydown', onHoldKeyDown, true\);/);
  assert.match(flow, /const onHoldKeyDown = \(event\) => \{[\s\S]*?openPauseMenu\(\)/);
});

test('round 11 · the skip prompt and the score keep working while a cutscene covers the page', () => {
  const flow = read('src/shell/gameFlow.js');
  // the ring fills on the browser's own frame (the page's frames are held while covered)
  assert.match(flow, /holdFrame = nativeRequestAnimationFrame\(holdFrameStep\);/);
  assert.doesNotMatch(flow, /holdFrame = requestAnimationFrame\(/);
  // the skip keys hand their gesture to the music (Safari starts a refused score on it)
  assert.match(flow, /if \(event\.key !== 'Escape'\) musicDirector\.userGesture\?\.\(\);/);
  const music = read('src/shared/musicDirector.js');
  assert.match(music, /nativeRequestAnimationFrame\(\(\) => \{/, 'fades run on the native frame');
  assert.doesNotMatch(music, /\n  requestAnimationFrame\(\(\) => \{/);
  assert.match(music, /'z-index:20500'/, 'CLICK FOR SOUND shows over a cutscene, under the pause menu');
  assert.match(music, /export const music = \{[^}]*userGesture/);
  // a cutscene can hand its score to the page it leads to
  const player = read('src/shell/cutscene/player.js');
  assert.match(player, /if \(!keepMusic\) music\.stop\(\{ fade: def\.music\?\.outFade \?\? 2\.2 \}\);/);
  assert.match(player, /if \(cue\.stopMusic && !keepMusic\) music\.stop/);
  // a cutscene skipped while it was warming never starts its score afterwards
  assert.match(player, /if \(!ended\) \{\s*startMusic\(\);\s*sfx\.resume\(\);\s*\}/);
});

test('round 11 · a preload job cannot outlive its ceiling (a body read that ignores the abort)', async () => {
  const preloader = read('src/shell/chapterPreloader.js');
  assert.match(preloader, /const promise = Promise\.race\(\[job, timedOut\]\)/);
  assert.match(preloader, /status: 'timeout'/);
});

test('Echo City is the 2→3 page: Chapter 2 goes at once, the city stages and warms under the cutscene', () => {
  const chapter2 = read('src/chapters/borrowedLight/BorrowedLightScene.js');
  assert.match(chapter2, /music\.stop\(\{ fade: 1\.1 \}\);[\s\S]*?markCheckpoint\('chapter-3-start'\);\s*arriveAt\('\/car03-3d\.html', 'chapter2'\);/);
  const html = read('car03-3d.html');
  assert.match(html, /\/\[\?&\]from=chapter2\(\?:&\|\$\)\/\.test\(location\.search\)\) document\.documentElement\.classList\.add\('nf-arriving'\)/);
  assert.match(html, /html\.nf-arriving #loading-panel, html\.nf-arriving #objective-card, html\.nf-arriving #sunrise-tableau \{ visibility: hidden; \}/);
  const city = read('src/car03-3d-main.js');
  assert.match(city, /window\.history\.replaceState\(window\.history\.state, '', withoutArrival\(window\.location\.href\)\)/);
  assert.match(city, /\.then\(\(\) => gameplayRuntime\.initialize\(\{ holdArrival: true \}\)\)/);
  assert.match(city, /keepMusic: true/);
  assert.match(city, /id: CHAPTER3_ARRIVAL_MUSIC\.id/);
  // the city's live progress feeds the gate
  assert.match(city, /preview\.onModelProgress = \(completed, total\) => arrivalGate\?\.report\('models'/);
  assert.match(city, /arrivalGate\?\.fail\(error\);/);
});
