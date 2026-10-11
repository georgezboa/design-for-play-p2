// Round 12 · the Conductor's page: the set pieces wired to the stage, game
// feel behind the accessibility settings, the pad, the dev routes and the
// hand-off to the ending. The page needs a browser (three.js, the DOM), so
// its wiring is pinned in the source; the pad helpers are pure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { FINALE_PAD, padDirection, readFinalePad } from '../../src/chapters/finalBoss/finaleControls.js';
import { SET_PIECES } from '../../src/chapters/finalBoss/setPieces/sequence.js';
import { DEV_ROUTES } from '../../src/shell/devRoutes.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const battle = read('src/chapters/finalBoss/spectacleBattle.js');
const views = Object.fromEntries(['trainView', 'rooftopView', 'squareView', 'lineView'].map((name) => [name, read(`src/chapters/finalBoss/stage/${name}.js`)]));
const pieceFiles = readdirSync(new URL('../../src/chapters/finalBoss/setPieces/', import.meta.url)).filter((name) => name.endsWith('.js'));

test('the rules stay pure: no set piece touches three.js or the DOM', () => {
  for (const name of pieceFiles) {
    const code = read(`src/chapters/finalBoss/setPieces/${name}`).split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(code, /from 'three'|document\.|window\.|requestAnimationFrame/, name);
  }
});

test('every movement has its own view, and every set piece its own camera', () => {
  assert.match(battle, /this\.viewOfMovement = \[this\.views\.train, this\.views\.rooftops, this\.views\.square, this\.views\.line\];/);
  for (const [name, source] of Object.entries(views)) {
    for (const method of ['enter', 'leave', 'sync', 'camera', 'look', 'point', 'onEvent', 'paint']) assert.match(source, new RegExp(`\\b${method}\\(`), `${name}.${method}`);
  }
  // the two-piece movements' views draw both of their pieces' modes
  const modes = { side: views.trainView, duel: views.trainView, rooftops: views.rooftopView, tower: views.rooftopView, top: views.squareView, standoff: views.squareView };
  for (const spec of SET_PIECES.flat().filter((p) => modes[p.view])) assert.match(modes[spec.view], new RegExp(`'${spec.view}'`), `${spec.id} is drawn in its ${spec.view} view`);
});

test('a piece hands to the next without a menu; movements fall through the lens; II → III is the ticket inspection', () => {
  assert.match(battle, /const kind = \['tunnel', 'crane-up', 'crane-down', 'cut'\]\[this\.phase\] \?\? 'cut';/);
  assert.match(battle, /if \(this\.phase === 1 && nextPhase === 2\) \{ this\.startVerifiedTransition\(nextPhase\); return; \}/);
  assert.match(battle, /this\.iris\.style\.setProperty\('--ir', `\$\{Math\.max\(0, r\)\}px`\);/);
});

test('game feel: hit-stop on every impact, shake and kick only with SHAKE on and Reduce Motion off, flashes only when allowed', () => {
  assert.match(battle, /hitStopFor\(seconds\) \{ this\.hitStop = Math\.max\(this\.hitStop, seconds\); \}/);
  assert.match(battle, /addTrauma\(amount, kick = null\) \{[\s\S]{0,120}if \(kick && shakeEnabled && !reducedMotionActive\(\)\)/);
  assert.match(battle, /const allow = shakeEnabled && !reducedMotionActive\(\);\s*const shake = allow \? this\.trauma \* this\.trauma : 0;/);
  assert.match(battle, /if \(flashEnabled && !reducedMotionActive\(\)\) \{ this\.renderer\.domElement\.classList\.add\('hit-flash'\);/);
  assert.match(battle, /let flashEnabled = false;/, 'FLASHING starts off');
  // the hurt, the death, a stretch cleared, a struck Conductor: each lands
  for (const fn of ['onHurt(e) {', 'onDeath(e) {', 'onSegmentCleared(e) {']) {
    const body = battle.slice(battle.indexOf(fn), battle.indexOf(fn) + 400);
    assert.match(body, /this\.hitStopFor\(/, fn);
  }
  // every view has a still form for Reduce Motion, and a cheaper one for LOW
  for (const [name, source] of Object.entries(views)) {
    assert.match(source, /still = \(\) => false/, `${name} takes still`);
    assert.match(source, /low = false/, `${name} takes low`);
    assert.match(source, /createParticles\(root, \{ low \}\)/, `${name}: half the particles on LOW`);
  }
});

test('his ticket follows the set pieces: each movement 100, the night service the last of it', () => {
  assert.match(battle, /this\.boss\.hp = Math\.max\(0, \(3 - this\.phase\) \* 100 \+ \(100 - this\.run\.ticket\(\)\)\);/);
  assert.match(battle, /if \(this\.phase === 3 && this\.run\.piece\.boarded\) this\.boss\.hp = 0;/);
});

test('the music climbs with each stretch, and the fight has its own impact sounds', () => {
  assert.match(battle, /onSegment\(e\) \{[\s\S]{0,200}this\.audio\.setIntensity\(1 \+ Math\.min\(2, e\.index\)/);
  const audio = read('src/chapters/finalBoss/stage/fightAudio.js');
  for (const fn of ['impact', 'hurt', 'whoosh', 'jump', 'land', 'dash', 'punch', 'horn', 'sting', 'setIntensity']) assert.match(audio, new RegExp(`\\b${fn}\\(`), fn);
});

test('the ending: aboard the night service, it rams through him, then the film, the archive card and the credits', () => {
  assert.match(battle, /case 'boarded': this\.onBoarded\(\); break;|'boarded'/);
  assert.match(battle, /startRamCinematic\(\) \{/);
  assert.match(battle, /if \(t > 5\.2\) this\.finish\(\);/);
  const finish = battle.slice(battle.indexOf('  finish() {'), battle.indexOf('  finish() {') + 900);
  assert.match(finish, /recordEnding\('normal'\)/);
  assert.match(finish, /showNormalEndingCard\(\)\.then\(\(\) => showEndCredits\(\{ ending: 'normal' \}\)\)/);
});

test('the QA bot exists only in DEV builds, loaded on demand', () => {
  assert.doesNotMatch(battle, /^import [^;]*setPieces\/bots\.js/m, 'never statically imported');
  const gate = battle.indexOf('if (DEV_MODE) {');
  assert.ok(gate > 0);
  assert.ok(battle.indexOf("await import('./setPieces/bots.js')") > gate);
  assert.match(battle, /if \(DEV_MODE && this\.bot\) input = this\.bot\.decide\(this\.run\.piece, dt\);/);
});

test('the dev routes open each set piece; they are dev-gated', () => {
  const routes = DEV_ROUTES.filter((entry) => /final-boss\.html\?qa=conductor-/.test(entry.route)).map((entry) => entry.route.split('qa=')[1]);
  assert.deepEqual(routes, ['conductor-1', 'conductor-1-2', 'conductor-2', 'conductor-2-2', 'conductor-3', 'conductor-3-2', 'conductor-4']);
  for (const route of routes) assert.match(battle, new RegExp(`'${route}': \\[\\d, \\d\\]`), route);
  assert.match(battle, /const route = CONDUCTOR_TEST_ROUTES\[devParam\('qa'\)\];/, 'devParam reads nothing outside dev routes');
});

// ------------------------------------------------------------------ the pad

const button = (pressed) => ({ pressed });
const padWith = (indices = [], axes = [0, 0, 0, 0]) => {
  const buttons = Array.from({ length: 17 }, (_, i) => button(indices.includes(i)));
  return [{ connected: true, buttons, axes }];
};

test('the pad: A jumps, B / RB dash, X acts; a press is reported once', () => {
  const first = readFinalePad(padWith([FINALE_PAD.jump, FINALE_PAD.dashAlt]));
  assert.equal(first.connected, true);
  assert.equal(first.buttons.jump, true);
  assert.equal(first.buttons.dash, true, 'RB dashes too');
  assert.equal(first.pressed.jump, true);
  const held = readFinalePad(padWith([FINALE_PAD.jump]), first.buttons);
  assert.equal(held.buttons.jump, true);
  assert.equal(held.pressed.jump, false, 'held, not pressed again');
  assert.equal(readFinalePad([]).connected, false);
});

test('the pad: the stick moves (with a deadzone), the D-pad overrides it', () => {
  assert.equal(readFinalePad(padWith([], [0.1, 0, 0, 0])).moveX, 0, 'inside the deadzone');
  assert.ok(readFinalePad(padWith([], [0.9, 0, 0, 0])).moveX > 0.8);
  assert.equal(readFinalePad(padWith([FINALE_PAD.left], [0.9, 0, 0, 0])).moveX, -1);
});

test('the standoff from a pad: the D-pad, the face diamond (Y X B A), or a flick of the stick', () => {
  assert.equal(padDirection(readFinalePad(padWith([FINALE_PAD.up]))), 'up');
  assert.equal(padDirection(readFinalePad(padWith([FINALE_PAD.ret]))), 'up', 'Y is the top of the diamond');
  assert.equal(padDirection(readFinalePad(padWith([FINALE_PAD.act]))), 'left', 'X');
  assert.equal(padDirection(readFinalePad(padWith([FINALE_PAD.dash]))), 'right', 'B');
  assert.equal(padDirection(readFinalePad(padWith([FINALE_PAD.jump]))), 'down', 'A');
  const flick = readFinalePad(padWith([], [-0.95, 0, 0, 0]));
  assert.equal(padDirection(flick), 'left');
  assert.equal(padDirection(readFinalePad(padWith([], [-0.95, 0, 0, 0]), flick.buttons)), null, 'a held stick is one flick');
  assert.equal(padDirection(readFinalePad([])), null);
  assert.match(battle, /padDirection\(/, 'the stage reads it');
});
