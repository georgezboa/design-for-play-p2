// Chapter 6 alpha fixes (round 1): regression checks on the Conductor page.
// Round 12 replaced the four movements with set pieces (setPieces/*.js,
// driven in round12*.test.mjs); these pin what the alpha fixes asked of the
// page, in its round-12 form: named hits, keyboard play, the HUD layout and
// nothing unpainted at boot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const battle = read('src/chapters/finalBoss/spectacleBattle.js');
const style = read('src/chapters/finalBoss/style.css');
const finaleCss = read('src/shell/finale.css');
const pieceSources = readdirSync(new URL('../../src/chapters/finalBoss/setPieces/', import.meta.url))
  .filter((name) => name.endsWith('.js')).map((name) => read(`src/chapters/finalBoss/setPieces/${name}`)).join('\n');

test('A4-5: every hit names its source, and the death card says what tore the last layer and what it cost', () => {
  const block = battle.slice(battle.indexOf('export const HIT_SOURCES'), battle.indexOf('});', battle.indexOf('export const HIT_SOURCES')));
  const HIT_SOURCES = Object.fromEntries([...block.matchAll(/^  '?([a-z-]+)'?: '([^']+)',$/gm)].map(([, k, v]) => [k, v]));
  // every source a set piece can emit (a literal, a crash() or a hazard kind)
  const emitted = new Set([
    ...[...pieceSources.matchAll(/source: '([a-z-]+)'/g)].map(([, s]) => s),
    ...[...pieceSources.matchAll(/crash\('([a-z-]+)'/g)].map(([, s]) => s),
    ...[...pieceSources.matchAll(/LANDING_SOURCE = Object\.freeze\(\{([^}]*)\}/g)].flatMap(([, body]) => [...body.matchAll(/'([a-z-]+)'/g)].map(([, s]) => s)),
    'case', 'claim-case', 'gantry', 'trunk',
  ]);
  assert.ok(emitted.size >= 20, `${emitted.size} sources`);
  for (const source of emitted) assert.ok(HIT_SOURCES[source], `${source} has a label`);
  // a label says what it was and what beats it
  for (const [source, label] of Object.entries(HIT_SOURCES)) if (source !== 'hit') assert.match(label, / · /, source);
  assert.match(battle, /onHurt\(e\) \{\s*const label = HIT_SOURCES\[e\.source\] \?\? HIT_SOURCES\.hit;/);
  assert.match(battle, /if \(e\.layersLeft > 0\) this\.showHitFeedback\(this\.lastHit, e\.from\);/, 'a fatal hit leaves the moment to the death card');
  assert.match(battle, /LAYERS TORN · MOVEMENT \$\{phase\.number\} GOES ON/);
  assert.match(battle, /checkpointLine\(\{ rollback, phaseName \}\)/);
  assert.match(style, /\.nf-hit-flash\[data-side='left'\]/);
});

test('every set piece plays from the keyboard, and the start board lists each movement\'s keys', () => {
  // edges for the one-press actions; held keys for running, ducking, painting
  assert.match(battle, /this\.edges = \{ jump: false, dash: false, act: false, dir: null \};/);
  const page = read('final-boss.html');
  assert.match(page, /S ducks a gantry · E punches a brass claim back/);
  assert.match(page, /E punches a lamp: it fires on the next bell/);
  assert.match(page, /↑ ← → ↓ the card at that hand/);
  assert.match(page, /HOLD E or the mouse paints the drawn line ahead · SPACE jumps his brush/);
  assert.match(page, /<b>JUMP<\/b> SPACE/);
});

test('A4-3: one banner slot; the bell meter keeps the top left and the hint sits under the ticket bar', () => {
  assert.match(style, /\.battle-hud \.nf-bell \{\s*left: 20px; top: 16px; transform: none;/);
  assert.match(style, /\.battle-hud \.nf-hint \{\s*top: 82px; bottom: auto;/);
  assert.match(style, /\.battle-hud\.has-toast \.nf-hint\.show \{ opacity: 0;/);
  assert.match(battle, /this\.hud\.classList\.add\('has-hint'\)/);
});

test('A4-4: every movement is painted before it opens, its textures uploaded first', () => {
  assert.match(battle, /await runSliced\(this\.views\.train\.paint\(sources\), \{ sink: uploads \}\);/);
  assert.match(battle, /await runSliced\(this\.views\.rooftops\.paint\(\), \{ sink: uploads \}\);/);
  assert.match(battle, /await this\.loadEchoCityModels\(\);\s*await runSliced\(this\.views\.square\.paint\(\{ rigs: this\.rigs \}\), \{ sink: uploads \}\);/);
  assert.match(battle, /await runSliced\(this\.views\.line\.paint\(\), \{ sink: uploads \}\);/);
  assert.match(battle, /renderer\.initTexture\(texture\)/);
  const art = read('src/chapters/finalBoss/finaleWorldArt.js');
  assert.match(art, /from '\.\.\/paintedCountry\/paperPalette\.js'/, 'Chapter 4\'s own paper palette');
  assert.match(read('src/chapters/finalBoss/stage/lineView.js'), /from '\.\.\/finaleWorldArt\.js'/);
  assert.match(read('src/chapters/finalBoss/stage/squareView.js'), /from '\.\.\/finaleWorldArt\.js'/);
});

test('A4-9 and A4-10: the stamp misses BUTCH, and a world opens only once it is drawn', () => {
  assert.match(finaleCss, /\.nf-stamp \{\s*position: absolute; right: 34px; bottom: 22px;/);
  assert.match(finaleCss, /padding: 30px 40px 96px 64px/);
  assert.match(battle, /<s>RAIN CLERK<\/s> · <b>BUTCH<\/b>/);
  // the transition waits for the next movement's art
  assert.match(battle, /if \(!nextReady && !tr\.switched\) tr\.time = Math\.min\(tr\.time, tr\.duration \* 0\.5\);/);
  assert.match(battle, /if \(!nextReady\) tr\.time = Math\.min\(tr\.time, tr\.duration - 0\.001\);/);
});

test('A4-13: Chapter 6 is ALL WORLDS AT ONCE; THE LAST CARRIAGE is only the five-stone route', () => {
  const page = read('final-boss.html');
  assert.doesNotMatch(page, /THE LAST CARRIAGE/);
  assert.match(page, /CHAPTER 6 · THE CONDUCTOR/);
  assert.doesNotMatch(battle, /<span>THE LAST CARRIAGE<\/span>/);
  assert.match(read('hidden-final-boss.html'), /THE LAST CARRIAGE · ALL FIVE MAGIC STONES/);
});
