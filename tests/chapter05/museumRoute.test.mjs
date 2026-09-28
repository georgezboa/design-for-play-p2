// The shipping Museum route: lobby ⇄ corridor without re-clicking, the lobby
// exhibit and Door 4 as the two required halves (either order), the
// corridor's filed claims and ordered chapter cases, Echo City off the
// shipping path, and the shared DOM UI (tags, captions, cards).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { DIRECTION_DOORWAYS, directionAtDoorway, isAtLabyrinthDoor } from '../../src/chapters/museum3d/directions/directionDoorways.js';
import { CHAPTER05_DIRECTIONS } from '../../src/chapters/museum3d/directions/directionRegistry.js';
import { ONE_ANSWER_CHAPTER05_CONTRACT } from '../../src/chapters/museum3d/oneAnswer/chapter05OneAnswerContract.js';
import { tagHtml } from '../../src/chapters/museum3d/systems/InteractionSystem.js';
import { cardHtml } from '../../src/chapters/museum3d/systems/ArchiveCardView.js';
import { COLLAPSE_STRINGS } from '../../src/chapters/museum3d/state/collapseGauntlet.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../../src/chapters/museum3d/Museum3DApp.js');
const main = read('../../src/chapters/museum3d/museum3d-main.js');
const corridor = read('../../src/chapters/museum3d/scenes/ArchiveCorridor.js');
const lobby = read('../../src/chapters/museum3d/scenes/ServiceLobby.js');
const html = read('../../museum-3d.html');
const vite = read('../../vite.config.js');
const museumVite = read('../../vite.museum3d.config.js');
const exhibitEntry = read('../../src/chapters/museum3d/oneAnswer/oneAnswer-main.js');
const exhibitHtml = read('../../one-answer.html');

test('walking between the lobby and the corridor keeps the mouse: no CLICK TO RESUME', () => {
  assert.match(app, /async goToCorridor\(\) \{[\s\S]*?preserveControl: true,/);
  assert.match(app, /async goBackToLobby\(\) \{[\s\S]*?preserveControl: true,/);
  // a framed exhibit hands the mouse straight back, falling back to drag-look
  assert.match(app, /_onDirectionClosed\(directionId, completed\) \{[\s\S]*?this\.controller\.lock\(\);/);
  assert.doesNotMatch(app, /CLICK TO RETURN/);
});

test('the collapse is gated on the exhibit AND the Labyrinth, in either order', () => {
  assert.match(app, /_maybeStartCollapse\(\) \{[\s\S]*?if \(!state\.exhibit\.solved \|\| !state\.labyrinth\.complete\) return false;/);
  assert.match(app, /fromPhase: 'lobby',\s*toPhase: 'collapse',\s*action: \{ type: 'startCollapse' \}/);
  assert.match(app, /this\.model\.dispatch\(\{ type: 'startCollapse' \}\)/);
  assert.match(app, /_revealLostDesk\(\)[\s\S]*?type: 'solveExhibit'/);
  assert.match(app, /_fileLabyrinth\(\) \{[\s\S]*?type: 'labyrinthComplete'/);
  assert.match(app, /labyrinthComplete[\s\S]*resolveFinalBossDestination\(\)\.preloadChapterId/);
});

test('Door 4 owns E only in front of the door, never across the corridor at the Chapter 4 case', () => {
  assert.equal(DIRECTION_DOORWAYS.length, 1);
  assert.equal(isAtLabyrinthDoor({ x: 38, z: -1.5 }), true, 'stopped against the panel');
  assert.equal(isAtLabyrinthDoor({ x: 38, z: -0.8 }), true);
  assert.equal(directionAtDoorway({ x: 38, z: 0 }), null, 'the middle of the corridor is free');
  assert.equal(directionAtDoorway({ x: 38, z: 1.2 }), null, 'reading the Chapter 4 case');
  assert.equal(isAtLabyrinthDoor({ x: 38, z: -1.5 }, 'collapse'), false);
  assert.match(app, /const aimed = this\.interaction\.aimed;\s*if \(aimed && aimed\.id !== `direction-\$\{CHAPTER05_DIRECTIONS\.LABYRINTH\}`\) return false;/);
});

test('the sealed shutters are filed-claim cabinets and the chapter cases run Chapter 1 → 4', () => {
  assert.match(corridor, /this\.filedCases = FILED_CLAIMS\.map\(\(claim, index\) => this\._filedCase\(g, \{ x: 14 \+ index \* 8, claim \}\)\)/);
  assert.match(corridor, /CHAPTER_EXHIBIT_ORDER\.forEach\(\(id, index\) => \{\s*this\.artifactNiches\.set\(id, this\._artifactNiche\(g, \{ id, x: 14 \+ index \* 8 \}\)\);/);
  assert.match(corridor, /E · READ THE FILED CLAIM/);
  assert.match(corridor, /E · READ THE ACCESSION CARD/);
  for (const gone of ['RECORD SEALED', '_sealArchiveBay', 'guideStand', 'door-4-interact-ring', 'MEMORY TRANSLATION INDEX', 'createReturnArtifact']) {
    assert.ok(!corridor.includes(gone), gone);
  }
  assert.match(COLLAPSE_STRINGS.exitDoorPlaqueLocked, /EIGHT KEYS FROM THE LABYRINTH/);
  assert.match(COLLAPSE_STRINGS.exitDoorSealedNote, /eight keys are in the Labyrinth, behind Door 4/);
});

test('cuts: the corridor loop, the corridor guide stand, the two-world display and the Door 2 page', () => {
  for (const gone of ['loopCorridorPass', 'corridorLoop', 'centralOriginalDisplay', '_door4Prompt']) {
    assert.ok(!app.includes(gone) && !corridor.includes(gone) && !lobby.includes(gone), gone);
  }
  assert.equal(fs.existsSync(new URL('../../borrowed-grid.html', import.meta.url)), false);
  assert.equal(fs.existsSync(new URL('../../src/chapters/borrowedGrid', import.meta.url)), false);
  assert.doesNotMatch(vite, /borrowed-grid/);
  assert.doesNotMatch(museumVite, /borrowed-grid|chapter05-painted-country/);
});

test('Echo City is off the shipping path: never built, preloaded or shipped', () => {
  assert.doesNotMatch(app, /^import .*EchoCityWalkingSim/m, 'no static import');
  assert.match(app, /this\.includeEchoCity = DEV_MODE && includeEchoCity === true;/);
  assert.match(app, /import\('\.\/scenes\/EchoCityWalkingSim\.js'\)/);
  assert.doesNotMatch(app, /_echoPreload/);
  assert.match(main, /includeEchoCity: beat === 'echo'/);
  assert.match(vite, /DEV_ONLY_PUBLIC_DIRS = \['museum3d\/echo-city'\]/);
});

test('the one-answer exhibit is its own framed page with the Labyrinth\'s contract shape', () => {
  assert.equal(ONE_ANSWER_CHAPTER05_CONTRACT.embeddedSrc, '/one-answer.html?embedded=1');
  assert.match(exhibitHtml, /src\/chapters\/museum3d\/oneAnswer\/oneAnswer-main\.js/);
  assert.match(exhibitEntry, /post\(ONE_ANSWER_CHAPTER05_CONTRACT\.completeMessage\)/);
  assert.match(exhibitEntry, /post\(ONE_ANSWER_CHAPTER05_CONTRACT\.exitMessage\)/);
  assert.match(exhibitEntry, /act: ONE_ANSWER_ACT/);
  assert.match(vite, /oneAnswer: resolve\(import\.meta\.dirname, 'one-answer\.html'\)/);
  assert.match(museumVite, /ONE_ANSWER_CHAPTER05_CONTRACT\.entryHtml/);
  assert.equal(CHAPTER05_DIRECTIONS.ONE_ANSWER, 'one-answer');
});

test('one visual language: paper tags, caption bar, archive cards and a carriage-window bezel', () => {
  assert.equal(tagHtml('E · READ THE CARD'), '<kbd>E</kbd> READ THE CARD');
  assert.equal(tagHtml('HOLD E · SLOT THE KEYS · 3 / 8'), '<kbd>HOLD E</kbd> SLOT THE KEYS · 3 / 8');
  assert.match(cardHtml({ stamp: 'S', title: 'T', lines: ['a', 'b'], strike: 1 }), /<p class="nf-card__stamp">S<\/p>[\s\S]*<p><s>b<\/s><\/p>/);
  assert.match(html, /id="prompt" class="nf-tag"/);
  assert.match(html, /id="subtitle" class="nf-caption"/);
  assert.match(html, /#direction-shell \{[\s\S]*?border-radius: 26px;[\s\S]*?#b08a4a/);
  assert.match(main, /import '\.\.\/\.\.\/shell\/uiKit\.css';/);
  assert.doesNotMatch(html, /door-4-direct-interact|echo-work-card/);
});
