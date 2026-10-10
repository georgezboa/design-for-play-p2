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

test('A4-5: every hit names its source, and the death card says what tore the last layer and what it cost', () => {
  // Round 11: the directors name each hit by its attack's source; the
  // stage shows it on the hit label and the death card.
  const { HIT_SOURCES } = { HIT_SOURCES: Object.fromEntries([...battle.matchAll(/^  '?([a-z-]+)'?: '([^']+)',$/gm)].map(([, k, v]) => [k, v])) };
  for (const source of ['case', 'train', 'ghost-train', 'stamp', 'beam', 'bell-wave', 'fall', 'echo', 'shockwave', 'collapse', 'pigment', 'sweep', 'wash']) assert.ok(HIT_SOURCES[source], source);
  assert.match(battle, /onHurt\(e\) \{\s*const label = HIT_SOURCES\[e\.source\] \?\? HIT_SOURCES\.hit;/);
  assert.match(battle, /if \(e\.layersLeft > 0\) this\.showHitFeedback\(this\.lastHit, e\.from\);/, 'a fatal hit leaves the moment to the death card');
  assert.match(battle, /LAYERS TORN · MOVEMENT \$\{phase\.number\} GOES ON/);
  assert.match(battle, /checkpointLine\(\{ rollback, phaseName \}\)/);
  assert.match(style, /\.nf-hit-flash\[data-side='left'\]/);
});

// Round 11 moved Movement II's teaching into movements/onTheBell.js
// (round11Movements.test.mjs drives it): phase 1 opens with no beams until
// the first punch lands, one hint at a time.
test('Movement II teaches by doing: lamps, bridge and punch first; the beams only after the first punch', () => {
  const bell = read('src/chapters/finalBoss/movements/onTheBell.js');
  assert.match(bell, /'on-the-bell': \{\s*teach\(\) \{ arena\.setBeams\(false\);/);
  assert.match(bell, /teachDone: \(\) => firstPunch,/);
  assert.match(bell, /PUNCH AN <kbd>AMBER<\/kbd> LAMP · <kbd>E<\/kbd> · ITS BRIDGE CROSSES ON THE BELL/);
  assert.match(bell, /NOW THE <kbd>ROSE<\/kbd> SIGNAL IN THE \$\{lane\.toUpperCase\(\)\} LANE/);
  // Wires from each amber and teal lamp to its machine.
  assert.match(battle, /new THREE\.TubeGeometry\(curve, 28, 0\.05, 6, false\)/);
  assert.match(battle, /THE AMBER LINE IS STILL OUT · PUNCH IT AGAIN ONCE ITS BRIDGE FOLDS/);
});

test('A4-6: a stranded player gets a return plank, and a bridge holds for its rider', () => {
  const bell = read('src/chapters/finalBoss/movements/onTheBell.js');
  assert.match(bell, /if \(body && arena\.stranded\(body\.z\) && d\.state !== 'done'\) \{[\s\S]{0,300}arena\.extendReturnBridge\(arena\.nearestBridge\(body\.x\)\)/);
  assert.match(bell, /arena\.extendReturnBridge\(id, undefined, \{ full: true \}\);/);
  assert.match(bell, /The gap is a railing: a step over it needs a bridge underfoot\./);
  assert.match(battle, /const level = arena\.bridgeLevel\(id\);/);
});

test('Movement IV plays from the keyboard: HOLD E absorbs the nearest wet colour, HOLD R returns it', () => {
  // Round 6: E is the action key elsewhere; in Movement IV it is held.
  assert.match(battle, /if \(this\.phase === 3\) \{\s*input\.actHeld = k\.has\('KeyE'\)/);
  assert.match(battle, /input\.retHeld = k\.has\('KeyR'\)/);
  const paint = read('src/chapters/finalBoss/movements/paintedCountry.js');
  assert.match(paint, /\.filter\(\(\{ dist, aimDist \}\) => \(aim \? dist <= 4\.2 && aimDist <= 2\.4 : dist <= ABSORB_REACH\)\)/, 'keys: the nearest in reach; the mouse: the one under it');
  assert.match(read('src/chapters/finalBoss/finaleControls.js'), /HOLD E · ABSORB WET COLOUR/);
  assert.match(read('src/chapters/finalBoss/finaleControls.js'), /\['ABSORB \(MOVEMENT IV\)', 'HOLD E · OR HOLD RIGHT MOUSE ON IT'\]/);
  // The start board lists every movement's keys, the mouse ones included.
  const page = read('final-boss.html');
  assert.match(page, /HOLD E absorbs wet colour · HOLD R returns it when he is open · or hold right \/ left mouse/);
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
