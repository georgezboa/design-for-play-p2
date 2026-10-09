// Round 9 · the painted cutscenes (src/shell/cutscene/painted, docs/CUTSCENES_PAINTED.md):
// Gorogoa's joins in the timeline, which version plays, the painted opening
// against its drawn twin, the kit's figure frames, and the image batch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RECT_TRANSITIONS, STAGE, TRANSITIONS, buildTimeline, effectiveTransition, flightView, frameAt, mapIntoRect, validateCutscene, viewTransform,
} from '../src/shell/cutscene/timeline.js';
import { CUTSCENE_IDS, DRAWN_LOADERS, PAINTED_LOADERS, cutsceneVersion } from '../src/shell/cutscene/registry.js';
import { COMPLETE, PLATES } from '../src/shell/cutscene/painted/plates.generated.js';

register(new URL('./helpers/viteUrlLoader.mjs', import.meta.url));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const batch = JSON.parse(read('scripts/cutscene-art/cutscenes-batch.json'));
const { opening: drawnOpening } = await import('../src/shell/cutscene/scenes/opening.js');
const { opening: paintedOpening } = await import('../src/shell/cutscene/painted/opening.js');
const kit = await import('../src/shell/cutscene/painted/kit.js');

const captionsOf = (def) => buildTimeline(def).captions.map((c) => [c.speaker, c.text]);

test('the timeline knows the painted joins: zoom and pull carry a rect; Reduce Motion crossfades them', () => {
  for (const type of ['zoom', 'pull', 'white']) assert.ok(TRANSITIONS.includes(type), type);
  assert.deepEqual([...RECT_TRANSITIONS].sort(), ['pull', 'zoom']);
  const zoom = effectiveTransition({ type: 'zoom', duration: 1.2, rect: [100, 50, 400, 200] });
  assert.equal(zoom.type, 'zoom');
  assert.deepEqual(zoom.rect, [100, 50, 400, 200]);
  assert.deepEqual(effectiveTransition({ type: 'zoom', duration: 1.2, rect: [1, 1, 2, 1] }, { reducedMotion: true }), { type: 'fade', duration: 1.2 });
  assert.equal(effectiveTransition({ type: 'pull', duration: 1 }).type, 'fade', 'a pull with no rect falls back to a crossfade');
  assert.deepEqual(effectiveTransition({ type: 'white', duration: 1 }), { type: 'white', duration: 1 });
});

test('a zoom join hands its rect to the frame, and a join without one is a problem', () => {
  const draw = () => {};
  const def = {
    id: 'z', length: [1, 100],
    shots: [
      { id: 'a', duration: 4, draw, transition: { type: 'zoom', duration: 1, rect: [10, 20, 200, 100] }, captions: [{ text: 'one', at: 0, end: 3 }] },
      { id: 'b', duration: 4, draw, transition: { type: 'pull', duration: 1 }, captions: [{ text: 'two', at: 0.5, end: 3.5 }] },
      { id: 'c', duration: 4, draw, captions: [{ text: 'three', at: 0.5, end: 3.5 }] },
      { id: 'd', duration: 4, draw },
    ],
  };
  const f = frameAt(buildTimeline(def), 3.5);
  assert.equal(f.transition.type, 'zoom');
  assert.deepEqual(f.transition.rect, [10, 20, 200, 100]);
  assert.ok(validateCutscene(def).some((p) => p.includes("pull join has no rect")));
});

test('the camera flies from one view rect into another: ends exact, width geometric, aimed straight', () => {
  const a = { x: 0, y: 0, w: 1600, h: 800 };
  const b = mapIntoRect({ x: 0, y: 0, w: 1600, h: 800 }, [400, 200, 400, 200]);
  assert.deepEqual(b, { x: 400, y: 200, w: 400, h: 200 });
  assert.deepEqual(flightView(a, b, 0), a);
  assert.deepEqual(flightView(a, b, 1), b);
  const mid = flightView(a, b, 0.5);
  assert.ok(Math.abs(mid.w - 800) < 0.01, 'half way in, the view is the geometric mean');
  // the centre moves along the line between the two centres
  const c = (v) => [v.x + v.w / 2, v.y + v.h / 2];
  const [x0, y0] = c(a); const [x1, y1] = c(b); const [xm, ym] = c(mid);
  const cross = (xm - x0) * (y1 - y0) - (ym - y0) * (x1 - x0);
  assert.ok(Math.abs(cross) / (Math.hypot(xm - x0, ym - y0) * Math.hypot(x1 - x0, y1 - y0)) < 1e-4);
  const T = viewTransform(b, 1600);
  assert.equal(T.scale, 4);
  assert.equal(T.tx, -1600);
});

test('a painted cutscene plays only when every painting is in (or a dev flag asks); the drawn one is kept', () => {
  assert.deepEqual(Object.keys(DRAWN_LOADERS).sort(), [...CUTSCENE_IDS].sort());
  assert.ok(Object.keys(PAINTED_LOADERS).every((id) => CUTSCENE_IDS.includes(id)));
  assert.equal(cutsceneVersion('opening', { complete: { opening: false }, flag: null }), 'drawn');
  assert.equal(cutsceneVersion('opening', { complete: { opening: true }, flag: null }), 'painted');
  assert.equal(cutsceneVersion('opening', { complete: { opening: true }, flag: 'drawn' }), 'drawn');
  assert.equal(cutsceneVersion('opening', { complete: { opening: false }, flag: 'painted' }), 'painted');
  assert.equal(cutsceneVersion('ending', { complete: { ending: true }, flag: 'painted', painted: {} }), 'drawn', 'no painted version yet');
  // the build marks a cutscene complete only without stand-ins
  Object.entries(COMPLETE).forEach(([id, done]) => {
    if (!done) return;
    const plates = paintedOpening.id === id ? paintedOpening.plates : [];
    plates.filter((p) => !p.includes(':')).forEach((p) => assert.ok(PLATES[p] && !PLATES[p].standIn, `${id}: ${p}`));
  });
});

test('the painted opening follows the spec and says exactly what the drawn one says', () => {
  assert.deepEqual(validateCutscene(paintedOpening), []);
  assert.deepEqual(captionsOf(paintedOpening), captionsOf(drawnOpening));
  assert.deepEqual(paintedOpening.music, drawnOpening.music);
  assert.equal(paintedOpening.chrome, 'painted');
  assert.equal(paintedOpening.shots.at(-1).blackout, true, 'Act 0 still opens on black');
  // its plates are the storyboard's (plus the reused Chapter 1 paintings and the train)
  const board = batch.storyboard.find((b) => b.id === 'opening');
  const wanted = new Set(board.shots.flatMap((s) => s.plates).filter((p) => !['C-train', 'panels', 'C-butch-poses', 'C-mara'].includes(p)));
  wanted.forEach((p) => assert.ok(paintedOpening.plates.includes(p), p));
  assert.ok(paintedOpening.plates.includes('train:lit'));
  // every join that flies needs its rect
  paintedOpening.shots.slice(0, -1).forEach((s) => {
    if (RECT_TRANSITIONS.has(s.transition?.type)) assert.ok(s.transition.rect, s.id);
  });
});

test('every painted cutscene follows the spec, says what its drawn twin says, and lists its pictures', async () => {
  const board = new Map(batch.storyboard.map((b) => [b.id, b]));
  for (const id of Object.keys(PAINTED_LOADERS)) {
    const def = (await PAINTED_LOADERS[id]()).default;
    const twin = (await DRAWN_LOADERS[id]()).default;
    assert.equal(def.id, id);
    assert.deepEqual(validateCutscene(def), [], id);
    assert.deepEqual(captionsOf(def), captionsOf(twin), `${id}: captions`);
    assert.deepEqual(def.music, twin.music, `${id}: music`);
    assert.equal(def.chrome, 'painted');
    assert.deepEqual(def.shots.map((s) => s.id).filter((s) => s !== 'black'), board.get(id).shots.map((s) => s.id), `${id}: the storyboard's shots`);
    const items = new Set(batch.items.map((it) => it.id));
    board.get(id).shots.flatMap((s) => s.plates).filter((p) => items.has(p)).forEach((p) => assert.ok(def.plates.includes(p), `${id} loads ${p}`));
    def.plates.filter((p) => !p.includes(':')).forEach((p) => assert.ok(items.has(p) || ['A0-office', 'A0-office-awake'].includes(p), `${id}: ${p} is in the batch`));
    def.shots.slice(0, -1).forEach((s) => {
      if (RECT_TRANSITIONS.has(s.transition?.type)) assert.ok(s.transition.rect, `${id}/${s.id}`);
    });
  }
  assert.deepEqual(Object.keys(PAINTED_LOADERS).sort(), [...CUTSCENE_IDS].sort(), 'all eight are painted');
});

test('the image batch keeps every shipped caption word for word, and orders its pairs and parents', async () => {
  const shipped = [];
  for (const id of CUTSCENE_IDS) {
    const def = (await DRAWN_LOADERS[id]()).default;
    captionsOf(def).forEach(([speaker, text]) => shipped.push([id, speaker, text]));
  }
  const boarded = batch.storyboard.flatMap((b) => b.shots.flatMap((s) => s.captions.map((c) => [b.id, c.speaker ?? null, c.text])));
  assert.deepEqual(boarded, shipped);
  const seen = new Set(['A0-office', 'A0-office-awake', 'C-butch-poses', 'C-conductor', 'C-mara', 'C-train']);
  batch.items.forEach((it) => {
    [it.parent, it.pair_of, it.continues?.from].filter(Boolean).forEach((src) => assert.ok(seen.has(src), `${it.id} needs ${src} first`));
    assert.equal(it.size, '1536x1024');
    assert.match(it.prompt, /No text|no text/);
    seen.add(it.id);
  });
  assert.equal(batch.items.length, 44);
});

test('the kit walks Chapter 1\'s painted figures by distance and knows the train', () => {
  assert.ok(kit.spriteFrame('train:lit'), 'the lit carriage');
  assert.ok(kit.spriteFrame('butch:walk-1'));
  const frames = new Set();
  for (let d = 0; d < 400; d += 7) frames.add(kit.walkFrame('butch', d, 120));
  assert.ok(frames.size >= 6, 'a walk cycles through its frames');
  assert.equal(kit.walkFrame('butch', 0, 120), 'butch:walk-1');
  assert.equal(kit.walkFrame('nobody', 10, 100), 'nobody:stand');
  assert.deepEqual(kit.linkRect('nope', [1, 2, 3, 4]), [1, 2, 3, 4]);
  assert.equal(STAGE.w / STAGE.h, 2);
});
