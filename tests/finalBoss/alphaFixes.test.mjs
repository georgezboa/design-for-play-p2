// Chapter 6 alpha fixes (round 1): regression checks on the Conductor page.
// The rules are model-tested in finaleModel.test.mjs; these pin the wiring
// in spectacleBattle.js, its HUD layout and its world dressing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const battle = read('src/chapters/finalBoss/spectacleBattle.js');
const style = read('src/chapters/finalBoss/style.css');
const finaleCss = read('src/shell/finale.css');

test('A4-5: every hit names its source, and a fatal fall no longer overwrites the death card', () => {
  for (const source of ["'case'", "'ghost-train' : 'train'", "'beam'", "'fall'", "'collapse'", "'sweep'"]) assert.ok(battle.includes(source), source);
  assert.match(battle, /takeHit\(\{ force = false, source = 'hit', from = null \} = \{\}\)/);
  assert.match(battle, /this\.showHitFeedback\(this\.lastHit, from\)/);
  assert.match(battle, /this\.showDeathCard\(this\.lastHit \?\? \{ label: HIT_SOURCES\.hit \}\)/);
  // The street-gap line only when the fall did not end the movement.
  assert.match(battle, /if \(p\.respawns === before\) \{[\s\S]{0,400}?this\.toast\(tutor\.gapIsRailing \? 'THE BRIDGE FOLDED · BACK ON THE NEAR ROOF' : 'THE STREET IS A LONG WAY DOWN · WAIT FOR A BRIDGE'\);\s*\}/);
  assert.match(battle, /his ticket is back where this movement began/);
  assert.match(style, /\.nf-hit-flash\[data-side='left'\]/);
});

// Round 4 moved the steps into finaleModel.js createBellTutorial (model-
// tested in alphaRound4.test.mjs); the battle feeds it and shows its hint.
test('Movement II teaches one machine, then the other, then both, with the combined hint before any failure', () => {
  assert.match(battle, /if \(!keepTutorial\) this\.bell\.tutor = createBellTutorial\(\);/);
  assert.match(battle, /tutor\.queued\(\{ line: node\.line, lane: node\.lane, nextLane: arena\.plan\.lane \}\)/);
  assert.match(battle, /if \(kind === 'bridge'\) tutor\.bridgeOut\(\);/);
  assert.match(battle, /const help = tutor\.exposed\(\{ bridgeOut: arena\.anyBridgeOut\(\) \}\);/);
  assert.match(battle, /this\.hint\(tutor\.hint\(\{/);
  const model = read('src/chapters/finalBoss/finaleModel.js');
  assert.match(model, /BOTH BEFORE ONE BELL · AN <kbd>AMBER<\/kbd> BRIDGE \+ THE <kbd>ROSE<\/kbd> SIGNAL IN HIS NEXT LANE/);
  // Wires from each amber and teal lamp to its machine.
  assert.match(battle, /new THREE\.TubeGeometry\(curve, 28, 0\.05, 6, false\)/);
  assert.match(battle, /THE AMBER LINE IS STILL OUT · PUNCH IT AGAIN ONCE ITS BRIDGE FOLDS/);
});

test('A4-6: a stranded player gets a return plank, and the post-death grace respects the gap', () => {
  assert.match(battle, /if \(arena\.stranded\(p\.z\) && !this\.transition\) \{[\s\S]{0,300}arena\.extendReturnBridge\(arena\.nearestBridge\(p\.x\)\)/);
  assert.match(battle, /const level = arena\.bridgeLevel\(id\);/);
  assert.match(battle, /if \(arena && \(p\.respawnInv > 0 \|\| this\.bell\.tutor\.gapIsRailing\) && arena\.fallsAt\(resolved\.x, resolved\.z\) && !arena\.fallsAt\(p\.x, p\.z\)\)/);
});

test('Movement IV plays from the keyboard: HOLD E absorbs the nearest colour, HOLD R returns it', () => {
  assert.match(battle, /if \(event\.code === 'KeyE'\) this\.startKeyboardPaint\(2\);/);
  assert.match(battle, /if \(event\.code === 'KeyR'\) this\.startKeyboardPaint\(0\);/);
  assert.match(battle, /findNearestPaint\(reach = 4\.2\)/);
  assert.match(battle, /HOLD E · ABSORB THE NEAREST COLOUR/);
  assert.match(battle, /\['ABSORB \(MOVEMENT IV\)', 'HOLD E · OR HOLD RIGHT MOUSE ON IT'\]/);
  // The start board lists every movement's keys, the mouse ones included.
  const page = read('final-boss.html');
  assert.match(page, /HOLD E absorbs the nearest colour · HOLD R returns it · or hold right \/ left mouse/);
  assert.match(page, /MOUSE aims it/);
});

test('A4-3: at 16:9 the bell dial leaves the Conductor and the hint leaves Butch and the layers', () => {
  assert.match(style, /\.battle-hud \.nf-bell \{\s*left: 20px; top: 16px; transform: none;/);
  assert.match(style, /\.battle-hud \.nf-hint \{\s*top: 82px; bottom: auto;/);
  // Round 4: one banner slot; a toast takes the hint's place, never under it.
  assert.match(style, /\.battle-hud\.has-toast \.nf-hint\.show \{ opacity: 0;/);
  assert.match(battle, /this\.hud\.classList\.add\('has-hint'\)/);
  assert.match(battle, /this\.conductorRoot\.scale\.setScalar\(isEchoCity \? 2\.85 : index === 3 \? 3\.15 : 3\.8\)/);
});

test('A4-4: Movements III and IV are dressed in the finale\'s painted style before they open', () => {
  assert.match(battle, /await this\.loadEchoCityModels\(\);\s*await runSliced\(this\.echoCityArt\(\), \{ sink: uploads \}\);/);
  assert.match(battle, /\} else if \(index === 3\) \{\s*await runSliced\(this\.paintedCountryArt\(\), \{ sink: uploads \}\);/);
  const art = read('src/chapters/finalBoss/finaleWorldArt.js');
  for (const name of ['echoTerraceSteps', 'paintEchoSkyline', 'paintEchoProp', 'paintedSheetSteps', 'paintPaintedCountryBackdrop', 'paintPaintedProp']) assert.match(art, new RegExp(`export function\\*? ${name}\\(`), name);
  assert.match(art, /from '\.\.\/paintedCountry\/paperPalette\.js'/, 'Chapter 4\'s own paper palette');
  assert.match(art, /CITY_PALETTE|Chapter 3 · Echo City/);
});

test('A4-9 and A4-10: the stamp misses BUTCH, and nothing unpainted shows at boot or edge-on', () => {
  assert.match(finaleCss, /\.nf-stamp \{\s*position: absolute; right: 34px; bottom: 22px;/);
  assert.match(finaleCss, /padding: 30px 40px 96px 64px/);
  assert.match(battle, /<s>RAIN CLERK<\/s> · <b>BUTCH<\/b>/);
  assert.match(battle, /this\.conductorFallback\.visible = false;/);
  assert.match(battle, /this\.lensRim\.visible = false;/);
  assert.match(battle, /this\.conductorFallback\.visible = this\.movementReady\(index\) && /);
  assert.match(battle, /this\.setConductorWorld\(startMovement, true\);/);
  assert.match(battle, /this\.conductorPaper\?\.update\(dt, false, true, false, false, this\.player\.x - this\.boss\.x\);\s*return;/);
});

test('A4-13: Chapter 6 is ALL WORLDS AT ONCE; THE LAST CARRIAGE is only the five-stone route', () => {
  const page = read('final-boss.html');
  assert.doesNotMatch(page, /THE LAST CARRIAGE/);
  assert.match(page, /CHAPTER 6 · THE CONDUCTOR/);
  assert.doesNotMatch(battle, /<span>THE LAST CARRIAGE<\/span>/);
  assert.match(read('hidden-final-boss.html'), /THE LAST CARRIAGE · ALL FIVE MAGIC STONES/);
});
