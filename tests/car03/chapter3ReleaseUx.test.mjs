import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import { CHAPTER_CONTROLS } from '../../src/shell/chapterControls.js';
import { CHECKPOINTS } from '../../src/shell/saveSystem.js';
import { CAMERA_HOME } from '../../src/cars/presentCity3d/city3dConfig.js';
import { BELL_PERIOD_SECONDS } from '../../src/cars/presentCity3d/Chapter3BellClamp.js';
import { CHAPTER3_DOCUMENTS } from '../../src/cars/presentCity3d/Chapter3EvidenceViewer.js';
import { TICKET_BOARD_CARDS } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const page = read('car03-3d.html');
const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');
const main = read('src/car03-3d-main.js');
const css = read('src/cars/presentCity3d/chapter3Release.css');
const board = read('src/cars/presentCity3d/Chapter3TicketBoard.js');
const caption = read('src/cars/presentCity3d/Chapter3Caption.js');

describe('Chapter 3 release UX', () => {
  it('lights only story interactables with Tab, each with a paper tag', () => {
    assert.match(runtime, /\(this\.tabHeld && !interaction\.ambient\)/);
    // Round 2 (R2-3): chapter3Guidance.autoTaggedInteractions picks the tags
    // (hover, Tab, and the story interactable within E's reach).
    assert.match(runtime, /if \(!plan\.shown\.has\(interaction\.id\)\) continue;/);
    assert.match(runtime, /tag\.className = 'nf-tag c3-tag'/);
    assert.doesNotMatch(runtime, /world-building-|world-street-lamp|world-municipal-mailbox|LAMP_COPY|MAILBOX_COPY/);
  });

  it('keeps about five flavour objects clickable in the street', () => {
    const block = runtime.match(/const FLAVOUR_OBJECTS = Object\.freeze\(\{([\s\S]*?)\n\}\);/)?.[1] ?? '';
    const ids = [...block.matchAll(/^\s+'([a-z-]+)':/gm)].map((match) => match[1]);
    assert.equal(ids.length, 5, ids.join(', '));
  });

  it('speaks in the shared caption bar, frames the speaker and sits closer', () => {
    assert.match(page, /class="nf-caption c3-caption"/);
    assert.doesNotMatch(page, /dialogue-panel|flip-clock|topbar|task-bubble|legend/);
    assert.match(caption, /classList\.add\('nf-caption'/);
    assert.match(runtime, /frameSpeaker\(line, focus = null\)/);
    assert.match(runtime, /onLineChange: \(line\) => this\.frameSpeaker\(line, focus\)/);
    assert.ok(CAMERA_HOME.zoom >= 3.5, 'closer default camera');
  });

  it('opens on a chapter title card and keeps a one-line task card', () => {
    assert.match(runtime, /className = 'nf-title-card'/);
    assert.match(runtime, /ECHO CITY/);
    assert.match(page, /class="c3-objective"/);
    assert.match(runtime, /objectiveText\(\) \{/);
    assert.match(runtime, /this\.updateObjective\(\);\n    this\.updateTags\(\);/, 'the task card is recomputed from the model every frame');
    assert.doesNotMatch(runtime, /FlipClock|flipClock/);
  });

  it('never binds F in Echo City', () => {
    assert.doesNotMatch(preview, /key\.toLowerCase\(\) === 'f'/);
    assert.doesNotMatch(preview, /requestFullscreen/);
    const keys = CHAPTER_CONTROLS.echoCity.map(([, input]) => input).join(' ');
    assert.doesNotMatch(keys, /(^|[^A-Z])F([^A-Z0-9]|$)/);
    assert.match(keys, /WASD/);
  });

  it('fixes the four reported bugs', () => {
    // Evidence documents are complete archive cards, with no art slot.
    for (const spec of Object.values(CHAPTER3_DOCUMENTS)) {
      assert.ok(spec.lines.length >= 2 && spec.lines.length <= 3, spec.id);
      assert.equal('artSlot' in spec, false);
    }
    assert.doesNotMatch(read('src/cars/presentCity3d/Chapter3EvidenceViewer.js'), /PLACEHOLDER ART SLOT/);
    // Unreachable indoor clicks fall back to the nearest reachable point or
    // flash the marker; an unreachable approach still starts the interaction.
    assert.match(runtime, /if \(!this\.walkInsideMinistry\(\[point\.x, walkY, point\.z\]\)\) this\.flashBlockedClick\(point\);/);
    assert.match(runtime, /if \(!started\) this\.activateInteraction\(interaction\);/);
    // The save line names the chapter's story.
    assert.equal(CHECKPOINTS.find(({ id }) => id === 'chapter-3-start').detail, 'The duplicate ticket. M. Venn. Move as one.');
    // The fire letters are framed with nothing over them.
    assert.match(runtime, /for \(const lamp of this\.lampsNearFire \?\? \[\]\) lamp\.visible = !active;/);
    assert.match(read('src/cars/presentCity3d/chapter3SceneBuilders.js'), /700 \$\{fontSize\}px Georgia/);
  });

  it('gives every chapter a story-bible checkpoint line', () => {
    const text = CHECKPOINTS.map(({ detail }) => detail).join(' ');
    assert.doesNotMatch(text, /Spanish|Labyrinth|Ink moves/);
    assert.match(text, /1978-0412/);
    assert.match(text, /Two true things/);
  });

  it('builds the ticket board from archive cards and the shared verbs', () => {
    for (const card of TICKET_BOARD_CARDS) assert.ok(card.lines.length >= 1 && card.lines.length <= 3, card.id);
    assert.match(board, /className = 'c3-lens'|el\('div', 'c3-lens'\)/);
    assert.match(board, /punchClack\(\)/);
    assert.match(board, /seeTicketThroughLens/);
    assert.match(board, /stackTickets/);
    assert.match(board, /KeyL/);
  });

  it('fires the relit feed on the next 4-second train bell, meter only while active', () => {
    assert.equal(BELL_PERIOD_SECONDS, 4);
    const clamp = read('src/cars/presentCity3d/Chapter3BellClamp.js');
    assert.match(clamp, /import \{ bell, clunk \} from '\.\.\/\.\.\/chapters\/borrowedLight\/audio\.js'/);
    assert.match(clamp, /this\.meter\.hidden = true;/);
    assert.match(clamp, /if \(this\.seated && !this\.fired\)/);
    assert.match(runtime, /onBell: \(\) => this\.startNightIgnition\(\)/);
  });

  it('restores the station scanner finale and boards Butch after Mara', () => {
    assert.match(runtime, /ENDING_SLICE_POSITIONS\.butchBoarded/);
    assert.match(runtime, /boardingRoute/);
    assert.match(runtime, /this\.echoMara\.visible = false;/);
    assert.equal(fs.existsSync(new URL('../../src/cars/presentCity3d/Chapter3EndingRuntime.js', import.meta.url)), false);
  });

  it('gates only the start of the chapter and streams the rest', () => {
    // chapterPreloader.js uses import.meta.glob, so read its chapter3 entry.
    const preloader = read('src/shell/chapterPreloader.js');
    const profile = preloader.match(/chapter3: Object\.freeze\(\{[\s\S]*?\]\),\n  \}\),/)?.[0] ?? '';
    assert.match(profile, /CHAPTER03_START_CHARACTERS/);
    assert.match(profile, /CHAPTER03_START_MUSIC/);
    assert.doesNotMatch(profile, /REPLACEMENTS|STATIC_CHARACTERS|CHAPTER03_MUSIC\b/);
    assert.match(preloader, /const CHAPTER03_START_CHARACTERS = \[\n  'butch_shared_rig\.glb', 'lev_shared_rig\.glb',\n\]/);
    assert.match(preloader, /const CHAPTER03_START_MUSIC = \['\/assets\/music\/ch3\/3\.1_satie_gnossienne_no1\.mp3'\];/);
    assert.match(runtime, /streamDeferredAssets\(\) \{/);
    assert.match(runtime, /this\.loadAssetGroup\('ministry'\)/);
    assert.match(runtime, /this\.loadAssetGroup\('hotel'\)/);
  });

  it('keeps every QA route dev-only', () => {
    assert.match(main, /const query = devParams\(\);/);
    assert.match(main, /if \(DEV_MODE\) window\.render_game_to_text/);
    assert.match(css, /var\(--nightfall-text-scale, 1\)/);
  });
});
