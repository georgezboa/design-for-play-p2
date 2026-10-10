// Chapter 6 alpha fixes (round 2): the Conductor page and the Black Ticket.
// Pure rules are driven directly; the page wiring is pinned in the source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  HIGH_PIXEL_RATIO, LOW_PIXEL_RATIO, SLOW_FRAME_MS, createFinaleQualityMonitor, finalePixelRatio, finaleQualityPreference, lowGraphicsRequested,
} from '../../src/chapters/finalBoss/finaleQuality.js';
import { PAINT_MOVEMENT_DRAIN, paintReturnDamage, spreadWorldTags, tagWidth } from '../../src/chapters/finalBoss/finaleModel.js';
import { ECHO_EXCHANGES, ECHO_VOICE_URLS } from '../../src/chapters/finalBoss/echoExchanges.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const battle = read('src/chapters/finalBoss/spectacleBattle.js');
const style = read('src/chapters/finalBoss/style.css');
const ticketMain = read('src/chapters/blackKnifeFinal/main.js');
const ticketScene = read('src/chapters/blackKnifeFinal/scenes/BossScene.js');

// ------------------------------------------------------------- R4-1 quality

test('R4-1: LOW GRAPHICS pins the low tier; otherwise slow measured frames drop to it, once', () => {
  assert.equal(lowGraphicsRequested({ lowGraphics: true }), true);
  assert.equal(lowGraphicsRequested({ lowGraphics: false }), false);
  assert.equal(finaleQualityPreference({ lowGraphics: true }), 'low');
  assert.equal(finaleQualityPreference({}), 'auto');
  const pinned = createFinaleQualityMonitor({ preference: 'low' });
  assert.equal(pinned.tier, 'low');
  assert.equal(pinned.decided, true);

  const slow = createFinaleQualityMonitor();
  let drops = 0;
  for (let i = 0; i < 200; i += 1) if (slow.sample((SLOW_FRAME_MS + 20) / 1000) === 'low') drops += 1;
  assert.equal(drops, 1, 'drops exactly once');
  assert.equal(slow.tier, 'low');
  assert.equal(slow.snapshot().reason, 'slow-frames');

  const fast = createFinaleQualityMonitor();
  for (let i = 0; i < 600; i += 1) assert.equal(fast.sample(1 / 60), null);
  assert.equal(fast.tier, 'high');
  assert.equal(fast.decided, true);
  // a warm-up spike (shader compiles) does not count
  const spiky = createFinaleQualityMonitor();
  spiky.sample(1.5);
  for (let i = 0; i < 400; i += 1) spiky.sample(1 / 60);
  assert.equal(spiky.tier, 'high');
  // the pause-menu checkbox, mid-fight
  assert.equal(fast.force('setting'), 'low');
  assert.equal(fast.force('setting'), null);
});

test('R4-1: the low tier caps the pixel ratio at 0.75 and turns off MSAA and shadows', () => {
  assert.ok(LOW_PIXEL_RATIO <= 0.75);
  assert.equal(finalePixelRatio('low', 2), LOW_PIXEL_RATIO);
  assert.equal(finalePixelRatio('low', 0.5), 0.5);
  assert.equal(finalePixelRatio('high', 3), HIGH_PIXEL_RATIO);
  // the Conductor's renderer reads the tier before the context exists
  assert.match(battle, /new THREE\.WebGLRenderer\(\{ antialias: !low,/);
  assert.match(battle, /this\.renderer\.shadowMap\.enabled = !low;/);
  assert.match(battle, /this\.key\.castShadow = this\.quality\.tier !== 'low';/);
  assert.match(battle, /finaleQualityPreference\(globalThis\.NIGHTFALL_SETTINGS \?\? readSettings\(\)\)/);
  // the drop: pixel ratio, shadows off, Lambert in place of PBR
  assert.match(battle, /applyLowQuality\(reason = 'setting'\) \{[\s\S]{0,400}setPixelRatio\(finalePixelRatio\('low'[\s\S]{0,300}shadowMap\.enabled = false;[\s\S]{0,80}this\.key\.castShadow = false;[\s\S]{0,40}this\.cheapenScene\(\);/);
  assert.match(battle, /new THREE\.MeshLambertMaterial\(/);
  assert.match(battle, /if \(this\.quality\.sample\(frameSeconds\) === 'low'\) this\.applyLowQuality\('slow-frames'\);/);
  assert.match(battle, /lowGraphics === true\) game\.applyLowQuality\('setting'\)/);
  // the Black Ticket: antialias from the setting, half the particles on low
  assert.match(ticketMain, /render: \{ antialias: !lowGraphicsRequested\(/);
  assert.match(ticketScene, /const total = this\.lowGraphics \? Math\.ceil\(count \/ 2\) : count;/);
  assert.match(ticketScene, /this\.quality\?\.sample\(deltaMs \/ 1000\)/);
});

// --------------------------------------------------------- R4-3 the window

test('R4-3: when he has no answer, the front edge stays lit with a tag and a HUD line until it is said', () => {
  // Round 11: this is Movement III's finisher (movements/echoCity.js).
  const echo = read('src/chapters/finalBoss/movements/echoCity.js');
  assert.match(echo, /const noAnswer = \(\) => \{\s*frontLit = true;/);
  assert.match(echo, /if \(frontLit\) \{\s*if \(body\.z <= FRONT_EDGE_Z\) \{[\s\S]{0,200}d\.damage\(SAID_DAMAGE, 'said-to-his-face'\);/);
  assert.match(echo, /if \(frontLit\) return 'HE HAS NO ANSWER · THE LIT FRONT EDGE · <kbd>E<\/kbd> · SAY IT TO HIS FACE';/);
  assert.doesNotMatch(battle, /THE MOMENT PASSED/, 'the window never times out');
  assert.match(battle, /this\.showFrontEdge\(director\.frontLit\);/);
  assert.match(battle, /text: p\.z <= ECHO_FRONT_EDGE_Z \? '<kbd>E<\/kbd> · SAY IT TO HIS FACE' : 'THE FRONT EDGE · <kbd>E<\/kbd>'/);
  assert.doesNotMatch(battle, /<kbd>SPACE<\/kbd> · SAY IT/);
});

// ------------------------------------------------------- R4-4 the argument

test('R4-4: both answers answer "Official inquiry?", and the true one holds both truths', () => {
  const [first] = ECHO_EXCHANGES;
  assert.match(first.claim.text, /^Official inquiry\?/);
  const right = first.replies.find((reply) => reply.holdsBoth);
  const wrong = first.replies.find((reply) => !reply.holdsBoth);
  for (const reply of [right, wrong]) assert.match(reply.cue.text, /^No\./, 'answers his question');
  assert.match(right.cue.text, /why she left/);
  assert.equal(right.cue.parts.length, 2, 'two recordings, played in order');
  assert.ok(right.cue.parts.every((part) => ECHO_VOICE_URLS.includes(part.url)), 'both recordings are preloaded');
  assert.match(battle, /if \(Array\.isArray\(cue\?\.parts\) && cue\.parts\.length\) \{/);
});

test('R4-4: a half answer is deflected in one short line, and the claim comes back', () => {
  for (const exchange of ECHO_EXCHANGES) {
    for (const reply of exchange.replies.filter((entry) => !entry.holdsBoth)) {
      assert.ok(reply.deflect, `${exchange.id}: has a reason`);
      assert.match(reply.deflect, /^He files .+ Try the true thing\.$/, exchange.id);
      assert.ok(reply.deflect.length <= 72, `${exchange.id}: one short line (${reply.deflect.length})`);
    }
  }
  // Round 11: the square never freezes; the line is a toast over the fight.
  const echo = read('src/chapters/finalBoss/movements/echoCity.js');
  assert.match(echo, /const line = why === 'none' \? ECHO_DEFLECT_FALLBACK : \(reply\.deflect \?\? ECHO_DEFLECT_FALLBACK\);/);
  assert.match(echo, /argument\.deflect\(exchange\.id\);/);
  assert.match(battle, /case 'deflected': this\.toast\(e\.line, 3\.2\);/);
});

// ------------------------------------------------------------ R4-5 colour

test('R4-5 → round 11: a return lands only in the open beat, so each colour cuts deep and a fuller brush deeper', () => {
  assert.equal(PAINT_MOVEMENT_DRAIN, 88);
  // A phase is ~30 of the 88 and stops at its floor: two open windows a phase.
  assert.ok(paintReturnDamage(3) < 30, 'one full brush never ends a phase by itself');
  assert.ok(paintReturnDamage(3) * 2 >= 30, 'two full brushes always do');
  assert.ok(paintReturnDamage(2) > paintReturnDamage(1) * 2, 'holding pays');
  assert.ok(paintReturnDamage(3) > paintReturnDamage(1) * 3);
  assert.equal(paintReturnDamage(9), paintReturnDamage(3), 'three colours at most');
});

// ---------------------------------------------------------- layout and flow

test('Movement I: a case tag never covers the E · RETURN prompt beside it', () => {
  const prompt = { text: '<kbd>E</kbd> · RETURN', x: 470, y: 560, priority: 2 };
  const claim = { text: '1978-0402 · UMBRELLA', x: 330, y: 556, dim: true };
  const [placedPrompt, placedClaim] = spreadWorldTags([prompt, claim]);
  assert.equal(placedPrompt.y, prompt.y, 'the prompt keeps its place');
  assert.ok(placedClaim.y <= claim.y - 26, 'the claim tag is lifted clear');
  const box = (tag) => ({ l: tag.x - tagWidth(tag.text) / 2, r: tag.x + tagWidth(tag.text) / 2, t: tag.y - 26, b: tag.y });
  const a = box(placedPrompt); const b = box(placedClaim);
  assert.ok(!(a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b), 'no overlap');
  // tags far apart are left alone
  const apart = spreadWorldTags([{ text: 'A', x: 100, y: 300 }, { text: 'B', x: 900, y: 300 }]);
  assert.deepEqual(apart.map((tag) => tag.y), [300, 300]);
  assert.match(battle, /spreadWorldTags\(tags\)\.forEach\(\(tag\) => this\.tags\.tag\(tag\.text, tag\.x, tag\.y, \{ dim: Boolean\(tag\.dim\) \}\)\);/);
});

test('the STORY offer replaces the death card and carries what tore the layer', () => {
  assert.match(battle, /offerStory\(\) \{[\s\S]{0,200}clearTimeout\(this\.deathCardTimer\);\s*this\.deathCardEl\.classList\.remove\('show'\);/);
  assert.match(battle, /<p class="nf-story-offer__what">What tore it: <b>\$\{what\}<\/b><\/p>/);
  assert.match(style, /\.nf-story-offer__what \{/);
});

test('A4-10: a new world is held behind a veil until the GPU has drawn it; the title card waits for it', () => {
  assert.match(battle, /tr\.switched = true;\s*this\.holdWorldVeil\(\{ cameraUp: true \}\);/);
  assert.match(battle, /finishVerifiedTransition\(\) \{\s*const tr = this\.transition;\s*this\.holdWorldVeil\(\);/);
  assert.match(battle, /gl\.fenceSync\(gl\.SYNC_GPU_COMMANDS_COMPLETE, 0\)/);
  assert.match(battle, /this\.renderer\.render\(this\.scene, this\.camera\);\s*this\.checkWorldVeil\(\);/);
  assert.match(battle, /if \(this\.worldVeiled\) this\.pendingTitleCard = card; else card\(\);/);
  assert.match(battle, /!this\.dialoguePause && !this\.worldVeiled && director\) \{/, 'no world tags over the veil');
  assert.match(style, /\.nf-world-veil\.is-held \{ opacity: 1;/);
  // and the fall lands on the fight's own framing
  assert.match(battle, /const pose = this\.landingCameraPose\(\);/);
});

test('A4-3: at 1280×720 the hint is one line under the ticket bar and the answer box clears the layers', () => {
  assert.match(style, /@media \(max-height: 820px\) \{\s*\.battle-hud \.nf-hint \{[^}]*max-width: min\(840px, calc\(100vw - 440px\)\);/);
  assert.match(style, /@media \(max-width: 1720px\) \{\s*\.nf-finale \.battle-hud \.nf-caption \{ bottom: 112px; \}/);
});

test('the production Black Ticket page exposes no game or scene object', () => {
  assert.doesNotMatch(ticketScene, /window\.__battleScene|window\.__startBattle|window\.__pauseBattle|window\.__conductorSettings/);
  assert.doesNotMatch(ticketMain, /window\.__conductorSettings|window\.__startBattle|window\.__pauseBattle/);
  // the only window.game / __battleScene are inside the dev-route gate
  const gate = ticketMain.match(/if \(devRoutesEnabled\(\)\) \{([\s\S]*?)\n\}/);
  assert.ok(gate, 'a devRoutesEnabled() block');
  assert.match(gate[1], /window\.game = game;/);
  assert.match(gate[1], /'__battleScene'/);
  const outside = ticketMain.replace(gate[0], '');
  assert.doesNotMatch(outside, /window\.game\s*=/);
  assert.doesNotMatch(outside, /window\.__battleScene/);
});
