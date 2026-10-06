// The two Museum → finale cutscenes (src/shell/cutscene/scenes/
// chapter5-to-conductor.js and chapter5-to-black-knife.js, painters-c3.js):
// spec shape, the script's captions, cleared music, Reduce Motion joins, the
// call sites that reach them, and the five stones / the finale's Conductor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CAPTION_MIN_S, buildTimeline, validateCutscene } from '../src/shell/cutscene/timeline.js';
import { CUTSCENE_LOADERS, loadCutscene, registeredCutscene, resolveCutsceneId } from '../src/shell/cutscene/registry.js';
import { FINAL_BOSS_DESTINATIONS } from '../src/shell/finalBossRoute.js';
import { MAGIC_STONES } from '../src/shell/magicStones.js';

register(new URL('./helpers/viteUrlLoader.mjs', import.meta.url));
const { chapter5ToConductor: conductor } = await import('../src/shell/cutscene/scenes/chapter5-to-conductor.js');
const { chapter5ToBlackKnife: blackTicket } = await import('../src/shell/cutscene/scenes/chapter5-to-black-knife.js');
const { HALL, MAGIC_STONE_KINDS, hallFloorDepth, hallPoint } = await import('../src/shell/cutscene/painters-c3.js');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const scenes = [conductor, blackTicket];

test('both follow the spec: 4–7 shots, 25–40 s, 3–5 captions ≥ 2.5 s, never two at once', () => {
  for (const scene of scenes) {
    assert.deepEqual(validateCutscene(scene), [], scene.id);
    const tl = buildTimeline(scene);
    assert.ok(tl.duration >= 25 && tl.duration <= 40, `${scene.id} ${tl.duration}`);
    tl.captions.forEach((c, i) => {
      assert.ok(c.end - c.start >= CAPTION_MIN_S, `${scene.id} caption ${i + 1}`);
      if (tl.captions[i + 1]) assert.ok(tl.captions[i + 1].start >= c.end, `${scene.id} captions overlap`);
    });
    // they hand off on black, frame and all: Movement I / the Black Ticket fight open from it
    const last = scene.shots.at(-1);
    assert.equal(last.blackout, true, scene.id);
  }
});

test('Reduce Motion leaves no moving join', () => {
  for (const scene of scenes) {
    const types = buildTimeline(scene, { reducedMotion: true }).shots.map((s) => s.transition.type);
    assert.ok(types.every((t) => ['fade', 'black', 'cut', 'end'].includes(t)), `${scene.id}: ${types}`);
  }
});

test('the captions are the script (docs/CUTSCENES_SPEC.md), word for word', () => {
  const spec = read('docs/CUTSCENES_SPEC.md');
  const lines = (scene) => buildTimeline(scene).captions.map((c) => c.text.replace(/\n/g, ' '));
  assert.deepEqual(lines(conductor), ['Tickets, please.', 'The line runs while someone rides it.', 'You are the someone.']);
  // the Conductor speaks his lines; nobody else does
  assert.ok(buildTimeline(conductor).captions.every((c) => c.speaker === 'THE CONDUCTOR'));
  assert.ok(spec.includes('*"The line runs while someone rides it. You are the someone."*'));
  // the one long line is carried across the door closing, split with an ellipsis
  assert.deepEqual(lines(blackTicket), ['Five things the archive could not file.', 'A ticket that is never punched…', '…never ends its journey.']);
  assert.ok(buildTimeline(blackTicket).captions.every((c) => !c.speaker));
  const joined = lines(blackTicket).slice(1).join(' ').replace(/…\s*…/, ' ');
  assert.equal(joined, 'A ticket that is never punched never ends its journey.');
  for (const line of [...lines(conductor), ...lines(blackTicket)]) {
    assert.ok(spec.includes(line.replace(/…/g, '')), line);
    assert.doesNotMatch(line, /Neo-Kyoto|Infinity|promise|Black Knife/i);
  }
});

test('nothing the player sees says "Black Knife"; the plate and the ticket say LAST CARRIAGE', () => {
  const source = read('src/shell/cutscene/scenes/chapter5-to-black-knife.js') + read('src/shell/cutscene/painters-c3.js');
  for (const [, text] of source.matchAll(/fillText\(\s*'([^']*)'/g)) assert.doesNotMatch(text, /knife/i, text);
  assert.match(source, /fillText\('LAST CARRIAGE'/);
  assert.match(blackTicket.title, /last carriage/i);
});

test('the music is cleared, project-owned, and not on the uncleared list', () => {
  const plan = read('docs/MUSIC_REPLACEMENT_PLAN.md');
  for (const scene of scenes) {
    const { src } = scene.music;
    const match = src.match(/^\/assets\/music\/(ch\d)\/([^/]+\.mp3)$/);
    assert.ok(match, src);
    const [, folder, file] = match;
    assert.match(read(`public/assets/music/${folder}/ASSET_MANIFEST.md`), new RegExp(file.replace(/\./g, '\\.')));
    assert.doesNotMatch(read(`public/assets/music/${folder}/ASSET_MANIFEST.md`), /Not cleared for public release/);
    assert.doesNotMatch(plan, new RegExp(file.replace(/\./g, '\\.')), `${file} is on the uncleared list`);
    assert.ok(readFileSync(resolve(root, `public${src}`)).length > 1000);
  }
});

test('the Museum\'s two routes play these cutscenes instead of their films', async () => {
  assert.equal(resolveCutsceneId('chapter5-to-black-ticket', null), 'chapter5-to-black-knife');
  for (const route of Object.values(FINAL_BOSS_DESTINATIONS)) {
    const name = registeredCutscene(route.cinematicId, route.cinematicPath);
    assert.ok(['chapter5-to-conductor', 'chapter5-to-black-knife'].includes(name), `${route.cinematicId}: ${name}`);
  }
  assert.equal(registeredCutscene(null, '/cinematics/5-6-conductor.mp4'), 'chapter5-to-conductor');
  assert.equal(registeredCutscene(null, '/cinematics/5-6-black-knife.webm'), 'chapter5-to-black-knife');
  assert.equal(await loadCutscene('chapter5-to-conductor', { 'chapter5-to-conductor': async () => ({ default: conductor }) }), conductor);
  assert.equal(typeof CUTSCENE_LOADERS['chapter5-to-black-knife'], 'function');
});

test('the five stones are the game\'s five, in order, under their player-visible names', () => {
  assert.deepEqual(MAGIC_STONE_KINDS.map((s) => s.id), MAGIC_STONES.map((s) => s.id));
  assert.deepEqual(MAGIC_STONE_KINDS.map((s) => `${s.label} STONE`), MAGIC_STONES.map((s) => s.name));
  assert.deepEqual(MAGIC_STONE_KINDS.map((s) => s.label), ['EMBER', 'GRID', 'ECHO', 'PIGMENT', 'BLACK TICKET']);
});

test('one Conductor, one Butch: the finale\'s parts and the shared figures, never a new design', () => {
  const painters = read('src/shell/cutscene/painters-c3.js');
  assert.match(painters, /import \{ CONDUCTOR_HEAD_PART, CONDUCTOR_TORSO_PART \} from '\.\.\/\.\.\/chapters\/finalBoss\/conductorFigure\.js'/);
  for (const file of ['chapter5-to-conductor.js', 'chapter5-to-black-knife.js']) {
    const source = read(`src/shell/cutscene/scenes/${file}`);
    assert.doesNotMatch(source, /BUTCH_PARTS|CONDUCTOR_PARTS|function drawButch|function drawConductor/, file);
    assert.doesNotMatch(source, /drawMara/, file);
  }
});

test('the museum hall\'s perspective round-trips: the floor row at depth z is depth z', () => {
  for (const z of [0, 0.3, 1, 2.5, HALL.far]) {
    const [, y] = hallPoint(800, HALL.floor, z);
    assert.ok(Math.abs(hallFloorDepth(y) - z) < 1e-9, `z ${z}`);
  }
  // the far wall sits inside the near picture
  const [x0, y0] = hallPoint(HALL.left, HALL.ceil, HALL.far);
  const [x1, y1] = hallPoint(HALL.right, HALL.floor, HALL.far);
  assert.ok(x0 > 0 && x1 < 1600 && y0 > 0 && y1 < 800);
});
