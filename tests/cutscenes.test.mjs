// The in-engine cutscenes (src/shell/cutscene, docs/CUTSCENES_SPEC.md):
// timeline, clock, skip, pause, Reduce Motion, id / film resolution and the
// film fallback, the preload hold, and caption timing of the authored ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CAPTION_MIN_S, MAX_STEP_S, STAGE, buildTimeline, cameraAt, captionsAt, createSession, effectiveTransition, frameAt,
  panelLayout, parallaxOffset, stageView, validateCutscene,
} from '../src/shell/cutscene/timeline.js';
import {
  CUTSCENE_IDS, CUTSCENE_LOADERS, FILM_NAMES, filmName, loadCutscene, registeredCutscene, resolveCutsceneId,
} from '../src/shell/cutscene/registry.js';
import { FINAL_BOSS_DESTINATIONS } from '../src/shell/finalBossRoute.js';

register(new URL('./helpers/viteUrlLoader.mjs', import.meta.url));
const { opening } = await import('../src/shell/cutscene/scenes/opening.js');
const { ending } = await import('../src/shell/cutscene/scenes/ending.js');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const noop = () => {};

// a small definition: 3 shots of 4 s, 1 s joins → 10 s
const sample = () => ({
  id: 'sample',
  length: [5, 20],
  shots: [
    { id: 'a', duration: 4, draw: noop, transition: { type: 'slide', duration: 1 }, captions: [{ text: 'one', at: 0.5, end: 3.5 }], cues: [{ at: 0, sfx: 'rail' }], camera: { from: { x: 0.4, zoom: 1 }, to: { x: 0.6, zoom: 1.4 }, still: { x: 0.5, zoom: 1.1 } } },
    { id: 'b', duration: 4, draw: noop, transition: { type: 'ink', duration: 1 }, captions: [{ text: 'two', at: 0.5, end: 3.2 }], cues: [{ at: 1, sfx: 'bell' }] },
    { id: 'c', duration: 4, draw: noop, captions: [{ text: 'three', at: 0.5, end: 3.5 }], cues: [{ at: 3, stopMusic: true }] },
  ],
});

// ---------- timeline ----------

test('shots overlap by their join: 3 × 4 s with 1 s joins is 10 s', () => {
  const tl = buildTimeline(sample());
  assert.equal(tl.duration, 10);
  assert.deepEqual(tl.shots.map((s) => [s.start, s.end]), [[0, 4], [3, 7], [6, 10]]);
  assert.deepEqual(tl.captions.map((c) => [c.start, c.end]), [[0.5, 3.5], [3.5, 6.2], [6.5, 9.5]]);
  assert.deepEqual(tl.cues.map((c) => c.at), [0, 4, 9]);
  assert.equal(tl.shots[2].transition.type, 'end');
});

test('frameAt shows one shot, or two with the join progress', () => {
  const tl = buildTimeline(sample());
  const mid = frameAt(tl, 2);
  assert.equal(mid.layers.length, 1);
  assert.equal(mid.transition, null);
  assert.equal(mid.layers[0].local, 0.5);
  const join = frameAt(tl, 3.5);
  assert.deepEqual(join.layers.map((l) => l.id), ['a', 'b']);
  assert.equal(join.transition.type, 'slide');
  assert.equal(join.transition.progress, 0.5);
  assert.equal(join.layers[1].seconds, 0.5);
  assert.equal(frameAt(tl, 99).done, true);
  assert.equal(frameAt(tl, 99).shot, 2);
  assert.deepEqual(captionsAt(tl, 3.6).map((c) => c.text), ['two']);
});

test('a join is never longer than half of either shot it joins', () => {
  const def = sample();
  def.shots[0].transition = { type: 'fade', duration: 9 };
  const tl = buildTimeline(def);
  assert.equal(tl.shots[0].transition.duration, 2);
});

test('the stage always covers the panel and the view never leaves the stage', () => {
  for (const [w, h] of [[1537, 750], [1230, 579], [837, 670], [2213, 922]]) {
    for (const cam of [{ x: 0, y: 0, zoom: 1 }, { x: 1, y: 1, zoom: 1.6 }, { x: 0.5, y: 0.5, zoom: 1.2 }]) {
      const v = stageView(w, h, cam);
      assert.ok(v.view.x >= -0.01 && v.view.y >= -0.01, `${w}x${h}`);
      assert.ok(v.view.x + v.view.w <= STAGE.w + 0.01 && v.view.y + v.view.h <= STAGE.h + 0.01, `${w}x${h}`);
      assert.ok(Math.abs(v.view.w * v.scale - w) < 1 && Math.abs(v.view.h * v.scale - h) < 1);
    }
  }
  assert.deepEqual(parallaxOffset({ x: 0.5, y: 0.5 }, 0.3), { x: 0, y: 0 });
  assert.equal(parallaxOffset({ x: 0.6, y: 0.5 }, 0).x, 160);
});

test('the panel and its caption band fit every tested window', () => {
  for (const [W, H] of [[1920, 1080], [1600, 900], [1280, 720], [900, 1200]]) {
    for (const textScale of [0.8, 1, 1.4]) {
      const L = panelLayout(W, H, { textScale });
      const p = L.panel;
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= W && p.y + p.h <= H, `${W}x${H}`);
      assert.ok(p.w / p.h >= 1.25 - 1e-6 && p.w / p.h <= 2.4 + 1e-6, `${W}x${H} aspect ${p.w / p.h}`);
      assert.ok(L.captionTop >= p.y + p.h && L.captionTop < H, `${W}x${H}: caption under the panel`);
      assert.ok(H - L.captionTop >= 80, `${W}x${H}: room for the caption bar`);
    }
  }
  // a bigger TEXT SIZE takes more room for the caption band
  assert.ok(panelLayout(1600, 900, { textScale: 1.4 }).panel.h < panelLayout(1600, 900).panel.h);
});

// ---------- wall clock, skip, pause, preload hold ----------

test('the clock follows the wall clock down to 10 fps; a hitch never skips content', () => {
  const tl = buildTimeline(sample());
  const s = createSession(tl);
  s.tick(0);
  for (let now = 100; now <= 3000; now += 100) s.tick(now);
  assert.ok(Math.abs(s.time - 3) < 1e-9, `10 fps: ${s.time}`);
  s.tick(5000);
  assert.ok(Math.abs(s.time - (3 + MAX_STEP_S)) < 1e-9, 'a 2 s frame advances at most one step');
});

test('cues fire once, in order, as the clock passes them', () => {
  const s = createSession(buildTimeline(sample()));
  s.tick(0);
  const fired = [];
  for (let now = 50; now <= 12000; now += 50) fired.push(...s.tick(now));
  assert.deepEqual(fired.map((c) => c.sfx ?? (c.stopMusic ? 'stopMusic' : '?')), ['rail', 'bell', 'stopMusic']);
  assert.equal(s.status, 'done');
});

test('pause holds the clock for every reason until all are released', () => {
  const s = createSession(buildTimeline(sample()));
  s.tick(0); s.tick(1000);
  s.pause('menu');
  s.pause('hidden');
  s.tick(2000); s.tick(9000);
  assert.equal(s.time, 0.25);
  s.resume('menu');
  s.tick(9100);
  assert.equal(s.time, 0.25, 'still hidden');
  s.resume('hidden');
  s.tick(9200); s.tick(9300);
  assert.ok(Math.abs(s.time - 0.35) < 1e-9);
  assert.equal(s.paused, false);
});

test('skip jumps to the last frame without firing the remaining cues', () => {
  const s = createSession(buildTimeline(sample()));
  s.tick(0); s.tick(100);
  s.skip();
  assert.equal(s.skipped, true);
  assert.equal(s.status, 'done');
  assert.equal(s.time, 10);
  assert.deepEqual(s.tick(200), []);
  assert.equal(s.frame().shot, 2);
});

test('the preload hold: the last frame stays up until the next chapter is ready', () => {
  const s = createSession(buildTimeline(sample()), { ready: false });
  s.tick(0);
  for (let now = 100; now <= 11000; now += 100) s.tick(now);
  assert.equal(s.status, 'holding');
  assert.equal(s.frame().time, 10);
  s.tick(20000);
  assert.equal(s.status, 'holding');
  s.markReady();
  assert.equal(s.status, 'done');
  // a skip waits too
  const k = createSession(buildTimeline(sample()), { ready: false });
  k.skip();
  assert.equal(k.status, 'holding');
  k.markReady();
  assert.equal(k.status, 'done');
});

test('gameFlow holds the cutscene\'s last frame (not black) while the next chapter loads', () => {
  const flow = read('src/shell/gameFlow.js');
  assert.match(flow, /export const ARRIVING_LINE = 'THE NIGHT SERVICE IS ARRIVING'/);
  assert.match(flow, /if \(mode === 'cutscene'\) \{[\s\S]*?cutscene\?\.hold\(true\)/);
  assert.match(flow, /mountCutscene\(def, \{ root, ready: !waitForPreload/);
  assert.match(read('src/shell/cutscene/player.js'), /hold\(on\) \{[\s\S]*?is-holding/);
  assert.match(read('src/shell/gameFlow.css'), /\.nf-cinematic\.is-holding \.nf-cinematic-arriving \{ opacity/);
});

// ---------- Reduce Motion ----------

test('Reduce Motion: no camera moves, and every moving join is a crossfade', () => {
  const def = sample();
  assert.deepEqual(effectiveTransition({ type: 'slide', duration: 1 }, { reducedMotion: true }), { type: 'fade', duration: 1 });
  assert.deepEqual(effectiveTransition({ type: 'ink', duration: 1 }, { reducedMotion: true }), { type: 'fade', duration: 1 });
  assert.deepEqual(effectiveTransition({ type: 'cut' }, { reducedMotion: true }), { type: 'cut', duration: 0 });
  assert.equal(effectiveTransition({ type: 'slide', duration: 1 }).type, 'slide');
  const tl = buildTimeline(def, { reducedMotion: true });
  assert.deepEqual(tl.shots.slice(0, -1).map((s) => s.transition.type), ['fade', 'fade']);
  const cam = def.shots[0].camera;
  assert.deepEqual(cameraAt(cam, 0, { reducedMotion: true }), cameraAt(cam, 1, { reducedMotion: true }));
  assert.equal(cameraAt(cam, 0.7, { reducedMotion: true }).zoom, 1.1);
  assert.notDeepEqual(cameraAt(cam, 0), cameraAt(cam, 1));
  // the authored cutscenes have no moving join left under Reduce Motion
  for (const scene of [opening, ending]) {
    const types = buildTimeline(scene, { reducedMotion: true }).shots.map((s) => s.transition.type);
    assert.ok(types.every((t) => ['fade', 'black', 'cut', 'end'].includes(t)), `${scene.id}: ${types}`);
  }
  assert.match(read('src/shell/cutscene/player.js'), /reducedMotion: Boolean\(settings\.reducedMotion\) \|\| os/);
});

// ---------- which cutscene plays ----------

test('ids and old film paths resolve to the eight cutscenes', () => {
  assert.equal(CUTSCENE_IDS.length, 8);
  const cases = [
    ['opening', '/cinematics/start.mp4', 'opening'],
    ['chapter-1-to-2', '/cinematics/1-2.mp4', 'chapter1To2'],
    ['chapter1To2', null, 'chapter1To2'],
    ['chapter-2-to-3', '/cinematics/2-3.mp4', 'chapter2To3'],
    ['chapter-3-to-4', '/cinematics/3-4.mp4', 'chapter3To4'],
    ['chapter-4-to-5', '/cinematics/4-5.mp4', 'chapter4To5'],
    ['chapter5-to-conductor', '/cinematics/5-6-conductor.mp4', 'chapter5-to-conductor'],
    ['chapter5-to-black-knife', '/cinematics/5-6-black-knife.mp4', 'chapter5-to-black-knife'],
    ['ending', '/cinematics/end.mp4', 'ending'],
    [null, '/cinematics/end.webm', 'ending'],
    ['something-else', '/cinematics/1-2.mp4?v=3', 'chapter1To2'],
  ];
  for (const [id, src, want] of cases) assert.equal(resolveCutsceneId(id, src), want, `${id} ${src}`);
  assert.equal(resolveCutsceneId('nope', '/video/other.mp4'), null);
  assert.equal(filmName('/cinematics/5-6-conductor.mp4'), '5-6-conductor');
  for (const id of CUTSCENE_IDS) assert.equal(resolveCutsceneId(null, `/cinematics/${FILM_NAMES[id]}.mp4`), id);
  // the Museum's two routes pass finalBossRoute.js ids and paths
  for (const route of Object.values(FINAL_BOSS_DESTINATIONS)) assert.ok(resolveCutsceneId(route.cinematicId, route.cinematicPath));
});

test('every call site resolves to the cutscene it means', () => {
  const sites = [
    ['src/shell/titleMenu.js', 'opening'],
    ['src/nightService-main.js', 'chapter1To2'],
    ['src/chapters/borrowedLight/BorrowedLightScene.js', 'chapter2To3'],
    ['src/car03-3d-main.js', 'chapter3To4'],
    ['src/chapters/paintedCountry/PaintedLineScene.js', 'chapter4To5'],
    ['src/chapters/finalBoss/spectacleBattle.js', 'ending'],
  ];
  for (const [file, want] of sites) {
    const source = read(file);
    const id = source.match(/(?:playCinematic\(\{\s*id: |navigateAfterCinematic\()'([^']+)'/)?.[1];
    assert.equal(resolveCutsceneId(id, null), want, `${file}: ${id}`);
  }
});

test('an id without an authored cutscene keeps its film; authored ones replace theirs', () => {
  for (const name of ['opening', 'ending', 'chapter3To4', 'chapter4To5']) assert.equal(typeof CUTSCENE_LOADERS[name], 'function', name);
  for (const name of Object.keys(CUTSCENE_LOADERS)) assert.ok(CUTSCENE_IDS.includes(name), name);
  assert.equal(registeredCutscene('opening', '/cinematics/start.mp4'), 'opening');
  assert.equal(registeredCutscene('ending', '/cinematics/end.mp4'), 'ending');
  for (const [id, src] of [['chapter-1-to-2', '/cinematics/1-2.mp4'], ['chapter5-to-conductor', '/cinematics/5-6-conductor.mp4']]) {
    assert.equal(registeredCutscene(id, src), null, id);
  }
  // a loader added later takes over without touching the call site
  assert.equal(registeredCutscene('chapter-1-to-2', null, { chapter1To2: () => ({}) }), 'chapter1To2');
  const flow = read('src/shell/gameFlow.js');
  assert.match(flow, /const cutsceneName = registeredCutscene\(id, src\);/);
  assert.match(flow, /if \(cutsceneName\) \{[\s\S]*?startCutscene\(\)\.catch\([\s\S]*?startVideo\(\);[\s\S]*?\} else \{\s*startVideo\(\);/);
});

test('loadCutscene returns a definition, and a failing loader rejects (gameFlow then plays the film)', async () => {
  assert.equal(await loadCutscene('opening', { opening: async () => ({ default: opening }) }), opening);
  assert.equal(await loadCutscene('chapter1To2', {}), null);
  await assert.rejects(loadCutscene('ending', { ending: async () => { throw new Error('chunk failed'); } }));
});

test('the pause menu and a hidden tab pause the cutscene', () => {
  const player = read('src/shell/cutscene/player.js');
  assert.match(player, /addEventListener\('nightfall:pause', onPause\)/);
  assert.match(player, /if \(document\.hidden\) controller\.pause\('hidden'\)/);
  // pauseMenu.js pauses getActiveCinematic().video: the cutscene answers to it
  const flow = read('src/shell/gameFlow.js');
  assert.match(flow, /const pauseShim = \{\s*pause: \(\) => cutscene\?\.pause\('menu'\)/);
  assert.match(flow, /tap && !settled && !hold\.completed && !globalThis\.NIGHTFALL_PAUSED\) openPauseMenu\(\)/);
});

// ---------- the authored cutscenes ----------

test('opening and ending follow the spec: shots, length, captions ≥ 2.5 s, never two at once', () => {
  assert.deepEqual(validateCutscene(opening), []);
  assert.deepEqual(validateCutscene(ending), []);
  for (const scene of [opening, ending]) {
    const tl = buildTimeline(scene);
    tl.captions.forEach((c, i) => {
      assert.ok(c.end - c.start >= CAPTION_MIN_S, `${scene.id} caption ${i + 1}`);
      if (tl.captions[i + 1]) assert.ok(tl.captions[i + 1].start >= c.end, `${scene.id} captions ${i + 1}/${i + 2} overlap`);
    });
  }
  const o = buildTimeline(opening);
  assert.ok(o.duration >= 25 && o.duration <= 40, `opening ${o.duration}`);
  const e = buildTimeline(ending);
  assert.ok(e.duration >= 40 && e.duration <= 55, `ending ${e.duration}`);
  // under Reduce Motion the lengths and captions hold too
  assert.deepEqual(validateCutscene({ ...opening, shots: opening.shots }), []);
});

test('validateCutscene catches short, overlapping and too many captions', () => {
  const def = sample();
  def.shots[1].captions = [{ text: 'quick', at: 0, end: 1 }];
  const problems = validateCutscene(def);
  assert.ok(problems.some((p) => /is up 1 s/.test(p)));
  assert.ok(problems.some((p) => /overlap/.test(p)));
  assert.ok(problems.some((p) => /3 shots/.test(p)));
});

test('the captions are the script (docs/CUTSCENES_SPEC.md), word for word', () => {
  const spec = read('docs/CUTSCENES_SPEC.md');
  const text = (scene) => buildTimeline(scene).captions.map((c) => c.text.replace(/\n/g, ' '));
  assert.deepEqual(text(opening), [
    'The night service runs between stored places. The archive calls it the last line.',
    'Everything left on board comes here, to Lost Property.',
    'The clerk, Butch, had filed it a hundred times. He could not leave it alone.',
    'The line keeps running while someone rides it.',
  ]);
  assert.deepEqual(text(ending), [
    'The Conductor did not stop the train. Nobody could.',
    'One carriage ahead, the seat beside her was empty at last.',
    'He did not look for her reflection.',
    'The night service kept running.',
  ]);
  for (const line of [...text(opening), ...text(ending)]) assert.ok(spec.includes(line), line);
  // no voice, no names the bible removed
  for (const line of [...text(opening), ...text(ending)]) assert.doesNotMatch(line, /Neo-Kyoto|Infinity|promise|Black Knife/i);
});

test('the music is cleared, project-owned and played through the shared director', () => {
  const manifest = { '/assets/music/ch1/1.1_train_undertow.mp3': 'public/assets/music/ch1/ASSET_MANIFEST.md', '/assets/music/ch6/6.5_night_train_departure.mp3': 'public/assets/music/ch6/ASSET_MANIFEST.md' };
  const plan = read('docs/MUSIC_REPLACEMENT_PLAN.md');
  for (const scene of [opening, ending]) {
    const src = scene.music.src;
    assert.ok(manifest[src], `${scene.id}: ${src}`);
    const file = src.split('/').pop();
    assert.match(read(manifest[src]), new RegExp(file.replace(/\./g, '\\.')));
    assert.doesNotMatch(plan, new RegExp(file.replace(/\./g, '\\.')), `${file} is on the uncleared list`);
  }
  assert.match(read('src/shell/cutscene/player.js'), /import \{ music \} from '\.\.\/\.\.\/shared\/musicDirector\.js'/);
});

test('the ending never draws the Mara ahead from the front', () => {
  const painters = read('src/shell/cutscene/painters.js');
  const ends = read('src/shell/cutscene/scenes/ending.js');
  // she is only ever drawn by the two turned-away painters
  assert.match(painters, /export function drawMaraWalking/);
  assert.match(painters, /export function drawMaraSeatedBack/);
  assert.doesNotMatch(painters, /function drawMara(Face|Front)/);
  assert.doesNotMatch(ends, /drawMara(?!SeatedBack|Walking)/);
});

// ---------- C2: chapter3To4 (Ch3 → Ch4) and chapter4To5 (Ch4 → Ch5) ----------

const { chapter3To4 } = await import('../src/shell/cutscene/scenes/chapter3To4.js');
const { chapter4To5 } = await import('../src/shell/cutscene/scenes/chapter4To5.js');

test('chapter3To4 and chapter4To5 are registered and follow the spec: shots, 25–40 s, captions ≥ 2.5 s, never two at once', async () => {
  assert.equal(registeredCutscene('chapter-3-to-4', '/cinematics/3-4.mp4'), 'chapter3To4');
  assert.equal(registeredCutscene('chapter-4-to-5', '/cinematics/4-5.mp4'), 'chapter4To5');
  assert.equal(await loadCutscene('chapter3To4'), chapter3To4);
  assert.equal(await loadCutscene('chapter4To5'), chapter4To5);
  for (const scene of [chapter3To4, chapter4To5]) {
    assert.deepEqual(validateCutscene(scene), [], scene.id);
    for (const reducedMotion of [false, true]) {
      const tl = buildTimeline(scene, { reducedMotion });
      assert.ok(tl.duration >= 25 && tl.duration <= 40, `${scene.id} ${tl.duration}`);
      assert.ok(tl.shots.length >= 4 && tl.shots.length <= 7);
      tl.captions.forEach((c, i) => {
        assert.ok(c.end - c.start >= CAPTION_MIN_S, `${scene.id} caption ${i + 1}`);
        if (tl.captions[i + 1]) assert.ok(tl.captions[i + 1].start >= c.end, `${scene.id} captions ${i + 1}/${i + 2} overlap`);
      });
      if (reducedMotion) assert.ok(tl.shots.every((s) => ['fade', 'black', 'cut', 'end'].includes(s.transition.type)), scene.id);
    }
    // every shot has a still framing or a camera that holds under Reduce Motion
    scene.shots.forEach((shot) => assert.deepEqual(cameraAt(shot.camera, 0, { reducedMotion: true }), cameraAt(shot.camera, 1, { reducedMotion: true })));
  }
});

test('chapter3To4 and chapter4To5 captions are the script, word for word', () => {
  const spec = read('docs/CUTSCENES_SPEC.md');
  const text = (scene) => buildTimeline(scene).captions.map((c) => c.text.replace(/\n/g, ' '));
  assert.deepEqual(text(chapter3To4), [
    'Rosa Velez drew the orchard every summer.',
    'The archive kept her drawings, and painted the colour out. Colour is hard to file.',
    'Under the grey, a hawthorn was still red.',
  ]);
  assert.deepEqual(text(chapter4To5), [
    'The archive had filed his journey already.',
    'One object was still pending.',
    'The museum will need one clean answer.',
  ]);
  for (const line of [...text(chapter3To4), ...text(chapter4To5)]) {
    assert.ok(spec.includes(line), line);
    assert.doesNotMatch(line, /Neo-Kyoto|Infinity|promise|Black Knife|Echo City/i);
  }
  // only the Archivist speaks, and the accession record is the bible's
  const speakers = buildTimeline(chapter4To5).captions.map((c) => c.speaker);
  assert.deepEqual(speakers, [null, null, 'THE ARCHIVIST']);
  assert.ok(buildTimeline(chapter3To4).captions.every((c) => c.speaker === null));
  const scene45 = read('src/shell/cutscene/scenes/chapter4To5.js');
  assert.match(scene45, /drawAccessionCard\(/);
  assert.match(read('src/shell/cutscene/painters.js'), /lines = \['ACC\. 1978-0412', 'VELEZ, M\.', 'PENDING'\]/);
  assert.match(read('docs/STORY_BIBLE.md'), /ACC\. 1978-0412 · VELEZ, M\. · PENDING/);
});

test('chapter3To4 and chapter4To5 play cleared music through the director', () => {
  const plan = read('docs/MUSIC_REPLACEMENT_PLAN.md');
  for (const scene of [chapter3To4, chapter4To5]) {
    const src = scene.music.src;
    assert.match(src, /^\/assets\/music\/ch3\//, `${scene.id}: ${src}`);
    const file = src.split('/').pop();
    assert.match(read('public/assets/music/ch3/ASSET_MANIFEST.md'), new RegExp(file.replace(/\./g, '\\.')));
    assert.doesNotMatch(plan, new RegExp(file.replace(/\./g, '\\.')), `${file} is on the uncleared list`);
    assert.ok(scene.music.fade > 0 && scene.music.outFade > 0);
  }
  // Chapter 4 and 5's own recordings are uncleared: never in these cutscenes
  for (const path of ['src/shell/cutscene/scenes/chapter3To4.js', 'src/shell/cutscene/scenes/chapter4To5.js']) {
    assert.doesNotMatch(read(path), /music\/ch4\/|music\/ch5\/|face-the-fear/);
  }
});

test('chapter3To4 and chapter4To5 draw with the shared Butch and Chapter 4\'s own hand, never a new figure', () => {
  const s34 = read('src/shell/cutscene/scenes/chapter3To4.js');
  const s45 = read('src/shell/cutscene/scenes/chapter4To5.js');
  const c2 = read('src/shell/cutscene/painters-c2.js');
  assert.match(s34, /drawButchBack\(/);
  assert.match(s45, /drawButch\(/);
  for (const source of [s34, s45, c2]) {
    assert.doesNotMatch(source, /function drawButch|function drawMara|drawMara/);
    // Chapter 4's art is imported read-only, not copied
    assert.doesNotMatch(source, /export function (paintCountry|paintTrain|appleTree|hawthorn)\b/);
  }
  assert.match(c2, /from '\.\.\/\.\.\/chapters\/paintedCountry\/art\/countryArt\.js'/);
  assert.match(c2, /from '\.\.\/\.\.\/chapters\/paintedCountry\/art\/trainArt\.js'/);
  // seat 43 empty beside him; the hawthorn left red; FILED; the painted train dries to ink
  assert.match(s34, /\['43', SEAT43\.x\]/);
  assert.match(s34, /'FILED'/);
  assert.match(s34, /redHaw\(/);
  assert.match(s45, /paintTrainBody\(lc, 'paint'\)[\s\S]*paintTrainBody\(lc, 'ink'\)/);
});

test('painters-c2: Chapter 4 art is built once, on CPU canvases when the cutscene paints on the CPU', async () => {
  const { once } = await import('../src/shell/cutscene/painters-c2.js');
  const previous = globalThis.HTMLCanvasElement;
  class FakeCanvas { getContext(type, options) { return { type, options }; } }
  const original = FakeCanvas.prototype.getContext;
  globalThis.HTMLCanvasElement = FakeCanvas;
  try {
    let builds = 0;
    const gpuLayer = { getContextAttributes: () => ({ willReadFrequently: false }) };
    const first = once('test-gpu', () => { builds += 1; return new FakeCanvas().getContext('2d'); }, gpuLayer);
    assert.equal(first.options, undefined, 'a GPU-backed cutscene leaves the chapter painters alone');
    assert.equal(once('test-gpu', () => { builds += 1; }), first);
    assert.equal(builds, 1, 'built once');
    const cpuLayer = { getContextAttributes: () => ({ willReadFrequently: true }) };
    const built = once('test-cpu', () => new FakeCanvas().getContext('2d', { alpha: false }), cpuLayer);
    assert.deepEqual(built.options, { willReadFrequently: true, alpha: false });
    assert.equal(FakeCanvas.prototype.getContext, original, 'getContext is restored after the build');
    assert.equal(new FakeCanvas().getContext('webgl').options, undefined);
  } finally {
    globalThis.HTMLCanvasElement = previous;
  }
});
