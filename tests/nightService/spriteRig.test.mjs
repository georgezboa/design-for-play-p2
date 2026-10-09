// Round 7 (sprites): George's painted Chapter 1 figures replace the jointed
// ones. The atlas covers every pose the acts use; the rigs keep the jointed
// rigs' interface and heights; the walk is driven by distance walked; the
// jointed figures stay as the fallback.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import SPRITE_ATLAS from '../../src/chapters/nightService/spriteAtlas.js';
import {
  ATLAS, PROP_SIZES, PUNCH_TEXTURE, SPRITE_RIGS, anchorPoint, createAnimator, frameGeometry, framesOf, pickLevel, rigHeight, spriteFiles,
  spriteFilesForAct,
} from '../../src/chapters/nightService/spriteAnimator.js';
import { buildSpriteRig, paintedFiguresEnabled, spriteTexturesReady } from '../../src/chapters/nightService/spriteRig.js';
import { buildProceduralRig, buildRig } from '../../src/chapters/nightService/actorRig.js';
import { ACTS } from '../../src/chapters/nightService/acts/index.js';
import { ONE_ANSWER_ACT } from '../../src/chapters/nightService/acts/oneAnswer.js';

const ROOT = new URL('../../', import.meta.url).pathname;
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const PUBLIC = join(ROOT, 'public');
const fileOf = (entry) => join(PUBLIC, ATLAS.urlBase, entry.file);
const mainEntries = () => [
  ...Object.values(ATLAS.characters).flatMap((c) => Object.values(c.frames)),
  ...Object.values(ATLAS.train.frames),
  ...Object.values(ATLAS.props),
];
// with their 1/2 and 1/4 copies
const allEntries = () => mainEntries().flatMap((e) => [e, ...(e.mips ?? [])]);

// ---------------------------------------------------------------------------
// what the acts ask of the figures

/** Every (rig kind, pose / carried / gesture) the acts and their fx use. */
function usedByActs() {
  const used = [];
  const acts = [...Object.values(ACTS), ONE_ANSWER_ACT];
  acts.forEach((act) => {
    const kinds = Object.fromEntries(Object.entries(act.actors ?? {}).map(([id, def]) => [id, def.rig ?? id]));
    Object.entries(act.actors ?? {}).forEach(([id, def]) => {
      used.push({ act: act.id, kind: kinds[id], pose: def.pose ?? 'idle', carrying: def.carrying ?? null });
    });
    const visit = (node) => {
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (!node || typeof node !== 'object') return;
      ['actorPose', 'placeActor'].forEach((verb) => {
        const arg = node[verb];
        if (arg?.actor && kinds[arg.actor]) used.push({ act: act.id, kind: kinds[arg.actor], pose: arg.pose ?? null, carrying: arg.carrying ?? null });
      });
      ['walk', 'walkButch', 'playTrain'].forEach((verb) => {
        const arg = node[verb];
        if (!arg) return;
        const actor = verb === 'walkButch' ? 'butch' : verb === 'playTrain' ? 'train' : arg.actor;
        if (kinds[actor]) used.push({ act: act.id, kind: kinds[actor], pose: 'walk', carrying: null });
        (arg.path ?? []).forEach((p) => { if (p.pose && kinds[actor]) used.push({ act: act.id, kind: kinds[actor], pose: p.pose, carrying: null }); });
      });
      Object.values(node).forEach(visit);
    };
    visit(act.steps);
  });
  // gestures the fx files ask for: `const x = api.rig('id')` ... `x.gesture('name')`
  const fxDir = join(ROOT, 'src/chapters/nightService/art');
  readdirSync(fxDir).filter((f) => /Fx\.js$/.test(f)).forEach((f) => {
    const src = readFileSync(join(fxDir, f), 'utf8');
    const vars = Object.fromEntries([...src.matchAll(/const (\w+) = api\.rig\('(\w+)'\)/g)].map((m) => [m[1], m[2]]));
    [...src.matchAll(/(\w+)\.gesture\('(\w+)'\)/g)].forEach((m) => { if (vars[m[1]]) used.push({ act: f, kind: vars[m[1]], gesture: m[2] }); });
  });
  return used;
}

test('sprites: every pose, carried thing and gesture the acts use has a painted frame', () => {
  const used = usedByActs();
  assert.ok(used.length > 30, `found the acts' actor uses (${used.length})`);
  const kinds = new Set(used.map((u) => u.kind));
  ['butch', 'conductor', 'mara', 'train'].forEach((k) => assert.ok(kinds.has(k), `${k} is used`));
  used.forEach((u) => {
    const spec = SPRITE_RIGS[u.kind];
    assert.ok(spec, `${u.act}: rig kind ${u.kind} has painted frames`);
    const frames = SPRITE_ATLAS[spec.sheet === 'train' ? 'train' : 'characters'];
    const sheet = spec.sheet === 'train' ? frames : frames[spec.sheet];
    if (u.gesture) {
      const g = spec.gestures?.[u.gesture];
      assert.ok(g || (u.kind === 'conductor' && u.gesture === 'rest'), `${u.act}: ${u.kind} gesture ${u.gesture} is mapped`);
      if (g) assert.ok(sheet.frames[g.frame], `${u.kind} gesture ${u.gesture} → ${g.frame} exists`);
      return;
    }
    if (u.kind.startsWith('train')) return; // the carriage has no poses
    if (u.pose) {
      const f = spec.poses[u.pose];
      assert.ok(f, `${u.act}: ${u.kind} pose '${u.pose}' is mapped explicitly`);
      if (f === '@walk') assert.ok(sheet.cycles?.walk?.frames.every((n) => sheet.frames[n]), `${u.kind} walk cycle frames exist`);
      else assert.ok(sheet.frames[f], `${u.kind} pose ${u.pose} → frame ${f} exists`);
    }
    if (u.carrying) {
      const pair = spec.carry?.[u.carrying];
      assert.ok(pair || PROP_SIZES[u.carrying], `${u.act}: ${u.kind} carrying ${u.carrying} has a painted frame or a prop`);
      (pair ?? []).forEach((n) => assert.ok(sheet.frames[n], `${n} exists`));
    }
  });
});

test('sprites: the pose → frame table (round 7 report)', () => {
  // the table the report quotes; a change here is a deliberate art decision
  assert.deepEqual({ ...SPRITE_RIGS.butch.poses }, {
    idle: 'stand', stand: 'stand', walk: '@walk', sleep: 'sleep', sit: 'sit', 'sit-chair': 'sit-chair',
    ticket: 'ticket', lantern: 'lantern', reach: 'reach', receive: 'receive', carry: 'carry',
  });
  assert.deepEqual([...SPRITE_RIGS.butch.carry.case], ['carry', 'carry-walk']);
  assert.equal(SPRITE_RIGS.conductor.idle, 'lantern');
  assert.equal(SPRITE_RIGS.conductor.gestures.offer.frame, 'offer');
  assert.equal(SPRITE_RIGS.mara.idle, 'turn');
});

// ---------------------------------------------------------------------------
// the atlas and its files

test('sprites: the atlas module and atlas.json agree, and every file is there, as WebP with alpha', () => {
  const json = JSON.parse(readFileSync(join(PUBLIC, ATLAS.urlBase, 'atlas.json'), 'utf8'));
  assert.deepEqual(json, JSON.parse(JSON.stringify(SPRITE_ATLAS)));
  assert.equal(ATLAS.urlBase, '/assets/ch1-painted/sprites');
  let bytes = 0;
  allEntries().forEach((e) => {
    const path = fileOf(e);
    assert.ok(existsSync(path), `${e.file} exists`);
    const buf = readFileSync(path);
    bytes += buf.length;
    assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
    assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
    // extended format with an alpha chunk; canvas size in the VP8X header
    assert.equal(buf.toString('ascii', 12, 16), 'VP8X', `${e.file} is extended WebP`);
    assert.ok(buf[20] & 0x10, `${e.file} has alpha`);
    const w = 1 + buf.readUIntLE(24, 3);
    const h = 1 + buf.readUIntLE(27, 3);
    assert.deepEqual([w, h], [e.w, e.h], `${e.file} size matches the atlas`);
    assert.equal(createHash('sha256').update(buf).digest('hex').slice(0, 10), e.v, `${e.file} version stamp`);
  });
  assert.ok(bytes < 2.5e6, `sprites stay small (${(bytes / 1e6).toFixed(2)} MB)`);
  // the copies are half and a quarter of each frame
  mainEntries().forEach((e) => {
    assert.equal(e.mips.length, 2, `${e.file} has two smaller copies`);
    e.mips.forEach((m, i) => {
      const d = 2 ** (i + 1);
      assert.ok(Math.abs(m.w - e.w / d) <= 0.5 && Math.abs(m.h - e.h / d) <= 0.5, `${m.file} is 1/${d}`);
    });
  });
  // nothing stray in the folder
  const listed = new Set(allEntries().map((e) => e.file));
  const walk = (dir, rel = '') => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f), `${rel}${f}/`) : [`${rel}${f}`]));
  walk(join(PUBLIC, ATLAS.urlBase)).filter((f) => f.endsWith('.webp')).forEach((f) => assert.ok(listed.has(f), `${f} is in the atlas`));
});

test('sprites: every frame of a character shares one scale, one feet baseline, and its pivot inside the figure', () => {
  Object.entries(ATLAS.characters).forEach(([name, c]) => {
    assert.equal(c.unit, +(c.rigHeight / c.frameHeight).toFixed(6), `${name}: unit = rigHeight / frameHeight`);
    Object.entries(c.frames).forEach(([frame, f]) => {
      if (f.overlay) return; // a piece drawn over another frame, placed by that frame's pivot
      assert.ok(f.pivot[0] > 0 && f.pivot[0] < f.w, `${name}/${frame}: pivot x inside`);
      if (/^walk-/.test(frame)) {
        // a walk frame stands on its planted foot; a nearer swinging foot may dip below the line
        assert.ok(f.pivot[1] <= f.h - ATLAS.pad + 0.01 && f.pivot[1] > f.h - ATLAS.pad - 0.04 * f.h, `${name}/${frame}: floor line at the planted foot`);
      } else {
        assert.equal(f.pivot[1], f.h - ATLAS.pad, `${name}/${frame}: the feet are the frame's floor line`);
      }
      Object.entries(f.anchors ?? {}).forEach(([k, a]) => assert.ok(a[0] >= 0 && a[0] <= f.w && a[1] >= 0 && a[1] <= f.h, `${name}/${frame}: anchor ${k} inside`));
    });
    // a standing frame is the character's full height
    const stand = c.frames.stand ?? c.frames.turn;
    assert.ok(Math.abs(stand.h - 2 * ATLAS.pad - c.frameHeight) <= 1, `${name}: standing frame is ${c.frameHeight} px`);
    // a walk cycle's frames are one height (no bobbing from frame to frame)
    const cycle = c.cycles?.walk;
    if (cycle) {
      // cap (or crown) to the planted foot: one height
      const hs = cycle.frames.map((n) => c.frames[n].pivot[1] - ATLAS.pad);
      assert.ok(Math.max(...hs) - Math.min(...hs) <= 1, `${name}: walk frames share a height (${hs})`);
    }
  });
  // 2x the largest on-screen size, roughly: Butch's standing frame is 400-500 px tall
  assert.ok(ATLAS.characters.butch.frameHeight >= 400 && ATLAS.characters.butch.frameHeight <= 500);
});

test('sprites: Mara keeps her face hidden (only back and side frames exist for her)', () => {
  const names = Object.keys(ATLAS.characters.mara.frames);
  names.forEach((n) => assert.match(n, /^(walk-\d|back|turn)$/, `mara frame ${n}`));
  framesOf('mara').forEach((n) => assert.ok(names.includes(n)));
});

test('sprites: the walk cycles cover a plausible stride with little foot slide', () => {
  const butch = ATLAS.characters.butch.cycles.walk;
  assert.equal(butch.frames.length, 8);
  assert.equal(butch.steps, 2);
  // a stride (two steps) of 0.5-0.9 of his height, and frame windows in order
  assert.ok(butch.stride > 0.5 * 70 && butch.stride < 0.9 * 70, `stride ${butch.stride}`);
  const mara = ATLAS.characters.mara.cycles.walk;
  assert.equal(mara.steps, 1);
  assert.ok(mara.stride > 0.25 * 66 && mara.stride < 0.55 * 66, `step ${mara.stride}`);
  [butch, mara].forEach((cyc) => {
    assert.equal(cyc.at[0], 0);
    cyc.at.forEach((a, i) => { if (i) assert.ok(a > cyc.at[i - 1], 'windows in order'); });
    const windows = cyc.at.map((a, i) => (cyc.at[i + 1] ?? 1) - a);
    assert.ok(Math.max(...windows) < 0.25, 'no pose is held for more than a quarter of the cycle');
    // the solver's worst planted-foot slide: under 7% of the figure's height
    assert.ok(cyc.maxSlide < 0.07 * (cyc === butch ? 70 : 66), `slide ${cyc.maxSlide}`);
  });
});

// ---------------------------------------------------------------------------
// the animator (what each tick shows)

function walk(anim, distance, { speed = 1, pose = 'walk', carrying = null, per = 0.7 } = {}) {
  const frames = [];
  let t = 0;
  let d = 0;
  while (d < distance - 1e-9) {
    const step = Math.min(per * speed, distance - d);
    d += step;
    t += 16;
    frames.push(anim.update(16, { pose, moving: true, time: t, carrying, travelled: step }).frame);
  }
  return frames;
}

test('sprites: the walk is driven by distance walked, not by time', () => {
  const stride = ATLAS.characters.butch.cycles.walk.stride;
  const a = createAnimator('butch');
  const b = createAnimator('butch');
  a.update(16, { pose: 'idle', time: 0 });
  b.update(16, { pose: 'idle', time: 0 });
  // the same distance at two paces lands on the same frame
  const slow = walk(a, stride * 1.37, { speed: 0.5 });
  const fast = walk(b, stride * 1.37, { speed: 2 });
  assert.equal(slow.at(-1), fast.at(-1));
  // one stride shows every frame, in order, once
  const c = createAnimator('butch');
  const seq = walk(c, stride - 0.01, { per: 0.2 }).filter((f, i, all) => f !== all[i - 1]);
  assert.deepEqual(seq, ATLAS.characters.butch.cycles.walk.frames);
  // each walk sets off from the contact frame
  c.update(16, { pose: 'idle', moving: false, time: 9999 });
  assert.equal(c.update(16, { pose: 'walk', moving: true, time: 10015, travelled: 0.1 }).frame, 'walk-1');
  // standing still, nothing advances
  const d = createAnimator('mara');
  assert.equal(d.update(16, { pose: 'walk', moving: false, time: 0 }).frame, 'turn', 'a walker held at an edge stands');
});

test('sprites: poses, the carried case, the gestures, the punch handed over', () => {
  const b = createAnimator('butch');
  assert.equal(b.update(16, { pose: 'sleep', time: 0 }).frame, 'sleep');
  const waking = b.update(16, { pose: 'sit', time: 16 });
  assert.equal(waking.frame, 'sit');
  assert.equal(waking.prev, 'sleep', 'waking up is a crossfade');
  assert.deepEqual(waking.overlay, { frame: 'desk', alpha: 1 }, 'the desk he slept at stays, from the first moment');
  assert.ok(waking.glow, 'and its lantern still glows');
  let v;
  for (let t = 32; t < 600; t += 16) v = b.update(16, { pose: 'sit', time: t });
  assert.equal(v.prev, null, 'the crossfade ends');
  assert.equal(v.overlay?.frame, 'desk');
  const up = b.update(16, { pose: 'ticket', time: 700 });
  assert.equal(up.frame, 'ticket');
  assert.ok(up.overlay && up.overlay.alpha < 1, 'the desk fades when he leaves it');
  const fresh = createAnimator('butch');
  assert.equal(fresh.update(16, { pose: 'sit', time: 0 }).overlay, null, 'a sit that never slept at the desk has only its stool');
  assert.equal(b.update(16, { pose: 'idle', time: 716, carrying: 'case' }).frame, 'carry');
  assert.equal(b.update(16, { pose: 'idle', moving: true, time: 732, carrying: 'case', travelled: 2 }).frame, 'carry-walk');
  // receive: the open hand for a moment, then back
  b.update(16, { pose: 'idle', time: 1000 });
  b.gesture('receive', 1000);
  assert.equal(b.update(16, { pose: 'idle', time: 1016 }).frame, 'receive');
  assert.equal(b.update(16, { pose: 'idle', time: 2600 }).frame, 'stand');

  const c = createAnimator('conductor');
  assert.equal(c.update(16, { pose: 'idle', time: 0 }).frame, 'lantern', 'the lantern raised at the door');
  c.gesture('offer');
  assert.equal(c.update(16, { pose: 'idle', time: 16 }).frame, 'offer');
  c.hidePunch(true);
  assert.equal(c.update(16, { pose: 'idle', time: 32 }).frame, 'offer-empty', 'the punch has left his hand');
  c.gesture('rest');
  assert.equal(c.update(16, { pose: 'idle', time: 48 }).frame, 'stand-empty', 'he lowers his arm, the punch given');
});

test('sprites: the lantern glow follows the painted lantern, frame by frame; breathing is a small scale', () => {
  const b = createAnimator('butch');
  const cyc = ATLAS.characters.butch.cycles.walk;
  const seen = new Set();
  walk(b, cyc.stride * 0.999, { per: 0.3 });
  const a2 = createAnimator('butch');
  let d = 0;
  while (d < cyc.stride * 0.99) {
    d += 0.3;
    const v = a2.update(16, { pose: 'walk', moving: true, time: d * 10, travelled: 0.3 });
    if (v.prev) continue;
    const g = anchorPoint('butch', v.frame, 'glow');
    assert.ok(g && v.glow, `${v.frame} has a lantern glow`);
    assert.ok(Math.abs(v.glow.x - (g[0] + v.x)) < 1e-6 && Math.abs(v.glow.y - (g[1] + v.y)) < 1e-6, `${v.frame}: glow on the painted lantern`);
    seen.add(v.frame);
  }
  assert.ok(seen.size >= 7, 'checked across the cycle');
  // no lantern, no glow (sitting); breathing stays under 1%
  const s = createAnimator('butch');
  let max = 0;
  for (let t = 0; t < 8000; t += 50) {
    const v = s.update(50, { pose: 'sit', time: t });
    if (!v.prev) assert.equal(v.glow, null);
    max = Math.max(max, Math.abs(v.scaleY - 1));
  }
  assert.ok(max > 0.001 && max < 0.01, `breathing ${max}`);
});

test('sprites: fx points written for the jointed figures land on the painted hands', () => {
  const c = createAnimator('conductor');
  assert.deepEqual(c.mapPoint(30, -48), anchorPoint('conductor', 'offer', 'punch'));
  const b = createAnimator('butch');
  assert.deepEqual(b.mapPoint(14, -40), anchorPoint('butch', 'receive', 'hand'));
  assert.deepEqual(b.mapPoint(8, -34), anchorPoint('butch', 'carry', 'case'));
  assert.deepEqual(b.mapPoint(22, -63), anchorPoint('butch', 'ticket', 'ticket'));
  assert.deepEqual(b.mapPoint(5, -5), [5, -5], 'other points pass through');
  // the painted points are on the figure: in front of him, at hand height
  const [px, py] = anchorPoint('conductor', 'offer', 'punch');
  assert.ok(px > 20 && px < 70 && py < -60 && py > -100, `the punch at ${px}, ${py}`);
});

test('sprites: a figure drawn small uses the 1/2 or 1/4 copy (no sparkle), with hysteresis', () => {
  assert.equal(pickLevel(1.2), 0);
  assert.equal(pickLevel(0.8), 0);
  assert.equal(pickLevel(0.45), 1);
  assert.equal(pickLevel(0.2), 2);
  // near an edge it stays on the copy it has
  assert.equal(pickLevel(0.58, 0), 0);
  assert.equal(pickLevel(0.58, 1), 1);
  assert.equal(pickLevel(0.62, 1), 1);
  assert.equal(pickLevel(0.7, 1), 0);
  // geometry of a copy: the same feet, the same size in tile px
  const full = frameGeometry('butch', 'walk-1', 0);
  const quarter = frameGeometry('butch', 'walk-1', 2);
  assert.deepEqual(quarter.origin, full.origin);
  const f = ATLAS.characters.butch.frames['walk-1'];
  assert.ok(Math.abs(quarter.scaleX * f.mips[1].w - full.scaleX * f.w) < 1e-9, 'same width on screen');
});

// ---------------------------------------------------------------------------
// the Phaser rig, on a stand-in scene

function fakeScene(loaded) {
  const keys = new Set(loaded);
  const node = (type, key) => {
    const o = {
      type, x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true, rotation: 0, list: [], parentContainer: null,
      texture: { key }, width: 100, height: 100,
      setPosition(x, y = x) { this.x = x; this.y = y; return this; },
      setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
      setOrigin() { return this; }, setAlpha(a) { this.alpha = a; return this; }, setVisible(v) { this.visible = v; return this; },
      setRotation(r) { this.rotation = r; return this; }, setTint() { return this; }, setBlendMode() { return this; },
      setDisplaySize() { return this; }, setTexture(k) { this.texture = { key: k }; return this; }, setFlipX() { return this; },
      setSize() { return this; }, setDepth() { return this; },
      add(c) { (Array.isArray(c) ? c : [c]).forEach((ch) => { this.list.push(ch); ch.parentContainer = this; }); return this; },
      addAt(c) { this.list.unshift(c); c.parentContainer = this; return this; },
      destroy() {},
      getWorldTransformMatrix() {
        const p = this.parentContainer?.getWorldTransformMatrix() ?? { a: 1, b: 0, tx: 0, ty: 0 };
        return { a: p.a * this.scaleX, b: 0, tx: p.tx + this.x * p.a, ty: p.ty + this.y * p.a };
      },
    };
    return o;
  };
  // a 2D context that takes any drawing call (the jointed parts paint into it)
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ctx), set: (t, k, v) => { t[k] = v; return true; } });
  return {
    keys,
    add: {
      container: (x = 0, y = 0) => node('Container').setPosition(x, y),
      image: (x, y, key) => node('Image', key).setPosition(x, y),
      ellipse: () => node('Ellipse'),
    },
    textures: {
      exists: (k) => keys.has(k),
      get: () => ({ getSourceImage: () => ({ width: 300, height: 200 }) }),
      createCanvas: (k) => { keys.add(k); return { getContext: () => ctx, refresh() {} }; },
    },
    tweens: { add() {} },
  };
}

const KINDS = ['butch', 'conductor', 'mara', 'train'];
const allKeys = () => KINDS.flatMap((k) => spriteFiles(k).map((f) => f.key)).concat(['nsv-radial']);

test('sprites: the painted rigs keep the jointed rigs’ interface and heights', () => {
  KINDS.forEach((kind) => {
    const painted = buildRig(fakeScene(allKeys()), kind);
    const jointed = buildProceduralRig(fakeScene(['nsv-radial']), kind);
    assert.equal(painted.painted, true, `${kind} is painted when its frames are loaded`);
    assert.ok(!jointed.painted);
    ['root', 'update', 'gesture'].forEach((k) => assert.ok(painted[k], `${kind}.${k}`));
    if (kind === 'train') {
      // the carriage keeps its length on the track (act3.js TRAIN_LENGTH = 150 px x scale)
      const f = ATLAS.train.frames.lit;
      assert.ok(Math.abs((f.w - 2 * ATLAS.pad) * ATLAS.train.unit - 150) < 0.5, 'the train is 150 tile px long');
      assert.ok(painted.height > 35 && painted.height < 45, `rail to roof ${painted.height}`);
    } else {
      assert.equal(painted.height, jointed.height, `${kind}: same height in tile px (scale keeps its meaning)`);
    }
    painted.update(16, { pose: 'idle', moving: false, time: 16, carrying: null, speed: null });
    painted.gesture('anything');
  });
  // the Conductor's punch, as act1Fx hides it
  const scene = fakeScene(allKeys());
  const conductor = buildRig(scene, 'conductor');
  conductor.gesture('offer');
  conductor.update(16, { pose: 'idle', time: 16 });
  assert.equal(conductor.punch.setVisible(false), conductor.punch);
  conductor.update(16, { pose: 'idle', time: 32 });
  assert.equal(conductor.frame, 'offer-empty');
  assert.ok(scene.keys.has(PUNCH_TEXTURE.key), 'the flying punch texture exists for act1Fx');
});

test('sprites: the walk reads distance from the figure’s movement on screen', () => {
  const scene = fakeScene(allKeys());
  const rig = buildRig(scene, 'butch');
  const layer = scene.add.container(0, 0).setScale(1.5);
  layer.add(rig.root);
  rig.root.setScale(3);
  const stride = ATLAS.characters.butch.cycles.walk.stride;
  // walk one stride at scale 3 (local units x 3 tile px), in 60 ticks (the
  // first tick, with nothing to compare against, counts by the speed)
  rig.update(16, { pose: 'walk', moving: true, time: 0, speed: 200 });
  const seen = [];
  for (let i = 1; i <= 57; i++) {
    rig.root.setPosition((stride * 3 * i) / 60, 0);
    rig.update(16, { pose: 'walk', moving: true, time: i * 16, speed: (stride * 3 * 60) / 0.96 });
    if (seen.at(-1) !== rig.frame) seen.push(rig.frame);
  }
  assert.deepEqual(seen, ATLAS.characters.butch.cycles.walk.frames, 'one stride on screen = one cycle');
  // a jump (re-parented, zoomed) is not taken as a stride
  // at scale 3 in a 1.5x layer Butch's frames are shown near full size; zoomed far out, the 1/4 copy
  assert.ok(!/@/.test(rig.root.list.find((o) => o.type === 'Container').list[1].texture.key), 'full copy up close');
  rig.update(16, { pose: 'idle', moving: false, time: 1200, zoom: 0.25 });
  assert.match(rig.root.list.find((o) => o.type === 'Container').list[1].texture.key, /@4$/, 'the 1/4 copy far out');
  rig.update(16, { pose: 'walk', moving: true, time: 1216, speed: 200 });
  const before = rig.animator.state.phase;
  rig.root.setPosition(99999, 0);
  rig.update(16, { pose: 'walk', moving: true, time: 2000, speed: 200 });
  const advanced = rig.animator.state.phase - before;
  assert.ok(advanced > 0 && advanced < 2, `counted by the speed instead (${advanced.toFixed(2)} local units)`);
});

test('sprites: the jointed figures stay as the fallback; PanelScene preloads the painted frames', () => {
  // a frame missing → the jointed figure
  const keys = allKeys().filter((k) => !k.endsWith('butch-walk-3'));
  assert.equal(spriteTexturesReady(fakeScene(keys), 'butch'), false);
  assert.equal(buildSpriteRig(fakeScene(keys), 'butch'), null);
  assert.ok(!buildRig(fakeScene(keys), 'butch').painted, 'buildRig falls back');
  assert.ok(buildRig(fakeScene(keys), 'conductor').painted, 'other kinds are unaffected');
  // ?figures=procedural shows the jointed figures (a dev route: production reads no params)
  assert.equal(paintedFiguresEnabled(new URLSearchParams('?act=1&figures=procedural')), false);
  assert.equal(paintedFiguresEnabled(new URLSearchParams('?act=1')), true);
  assert.equal(paintedFiguresEnabled(), true, 'outside dev mode the painted figures always show');
  assert.match(read('src/chapters/nightService/spriteRig.js'), /paintedFiguresEnabled\(params = devParams\(\)\)/);
  // every act queues what its actors draw
  Object.values(ACTS).forEach((act) => {
    const files = spriteFilesForAct(act);
    Object.entries(act.actors).forEach(([id, def]) => {
      spriteFiles(def.rig ?? id).forEach((f) => assert.ok(files.some((g) => g.key === f.key), `${act.id} loads ${f.key}`));
    });
    files.forEach((f) => assert.match(f.url, /^\/assets\/ch1-painted\/sprites\/.+\.webp\?v=[0-9a-f]{10}$/));
  });
  assert.ok(rigHeight('butch') === 70 && rigHeight('conductor') === 110 && rigHeight('mara') === 66);
  // the engine's hooks: preload (textures before the first draw) and the fx points
  const scene = read('src/chapters/nightService/PanelScene.js');
  const preload = scene.slice(scene.indexOf('  preload() {'), scene.indexOf('  create() {'));
  assert.match(preload, /queueSpriteTextures\(this, act\)/);
  assert.match(scene, /entry\.rig\.mapPoint\?\.\(lx0, ly0\)/);
  const rig = read('src/chapters/nightService/actorRig.js');
  assert.match(rig, /return buildSpriteRig\(scene, kind\) \?\? buildProceduralRig\(scene, kind\);/);
  // the art is reproducible: the cutting script is in the repo
  assert.ok(existsSync(join(ROOT, 'scripts/ch1-art/sprites.py')));
});
