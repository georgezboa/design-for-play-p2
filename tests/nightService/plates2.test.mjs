// Rounds 7–8 · George's painted plates for Acts 2 and 3: every state is a
// painting, the 1978 paintings register on today's, linked edges meet on the
// painted lines, and the hotspots and zoom rects sit on the painted objects.
// Round 8: the overlook, carriage and platform are George's too, and the
// farewell plays in the platform close-up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ACT2 } from '../../src/chapters/nightService/acts/act2.js';
import { ACT3, BENCH_STAND, CLOSE_SCALE, MARA_CLOSE_SCALE, PEOPLE_SCALE, TRAIN_SCALE } from '../../src/chapters/nightService/acts/act3.js';
import {
  CASE_BOX, CASE_HELD, CASE_LABEL, CASE_TAG, CASE_ZOOM, DROP_AT, EMBER, LETTER_BUNDLE, LETTER_ZOOM, POSTCARD, REQUEST_PUSH,
  REQUEST_STOP, SHAWL, BENEATH_ZOOM, TAG_ZOOM, TICKET_AT, BUTCH_SCALE, WINDOW_FRAME, WINDOW_GLASS,
} from '../../src/chapters/nightService/art/act2Art.js';
import { CITY_GLASS, CITY_WINDOW, CLOSE, CLOSE_ZOOM, HEDGE, ORCHARD_LIT, OVERLOOK_HOUSE, PATH_AT, PLATE as PLATE3, RAIL_AT, STAIR_AT, GAP_SPAN } from '../../src/chapters/nightService/art/act3Art.js';
import { GEO2 } from '../../src/chapters/nightService/art/act2Plates.js';
import { GEO3 } from '../../src/chapters/nightService/art/act3Plates.js';
import { actPlates, createPanelModel, layoutGrid } from '../../src/chapters/nightService/panelModel.js';
import { startCarry } from '../../src/chapters/nightService/acts/index.js';
import { record, settle } from './helpers.mjs';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'scripts/ch1-art/plates2-manifest.json'), 'utf8'));
const file = (url) => resolve(ROOT, 'public', url.replace(/^\//, ''));

/** Width and height of a WebP (VP8, VP8L or VP8X). */
function webpSize(path) {
  const b = readFileSync(path);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

const inside = (outer, inner, tol = 1e-6) => inner[0] >= outer[0] - tol && inner[1] >= outer[1] - tol
  && inner[0] + inner[2] <= outer[0] + outer[2] + tol && inner[1] + inner[3] <= outer[1] + outer[3] + tol;
const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
const isSquareZoom = (r) => Math.abs(r[2] - r[3]) < 1e-6 && r[0] >= -1e-6 && r[1] >= -1e-6 && r[0] + r[2] <= 1 + 1e-6 && r[1] + r[3] <= 1 + 1e-6;

test('plates2: every state of Acts 2 and 3 is one of George\'s paintings, and every file is there', () => {
  for (const act of [ACT2, ACT3]) {
    const { tileW, tileH } = layoutGrid(act.grid);
    for (const [tileId, tile] of Object.entries(act.tiles)) {
      for (const [stateId, state] of Object.entries(tile.states)) {
        assert.ok(state.plate, `${act.id} ${tileId}.${stateId} has a plate`);
        if (state.drawPast) assert.ok(state.platePast, `${act.id} ${tileId}.${stateId}: its 1978 layer is a plate too`);
        for (const url of [state.plate, state.platePast].filter(Boolean)) {
          assert.ok(url.startsWith('/assets/ch1-painted/'), url);
          assert.ok(existsSync(file(url)), `${url} exists`);
          // cover-fit at the tile's own aspect: nothing important is cropped away
          const { w, h } = webpSize(file(url));
          assert.ok(Math.abs(w / h - tileW / tileH) < 0.012, `${url}: ${w}×${h} for a ${tileW}×${tileH} tile`);
        }
      }
      if (tile.frame) {
        assert.ok(tile.frame.plate && existsSync(file(tile.frame.plate)), `${act.id} ${tileId}: its liftable frame is painted`);
      }
    }
    // the act preloads all of them
    const urls = actPlates(act).map((p) => p.url);
    Object.values(act.tiles).forEach((tile) => Object.values(tile.states).forEach((s) => assert.ok(urls.includes(s.plate))));
  }
});

test('plates2: a 1978 plate and its present share one crop and one size, and register', () => {
  for (const [a, b] of manifest.pairs) {
    const A = manifest.outputs[a];
    const B = manifest.outputs[b];
    assert.ok(A && B, `${a} / ${b} in the manifest`);
    assert.deepEqual(A.crop, B.crop, `${a} / ${b}: identical crop`);
    assert.deepEqual([A.w, A.h], [B.w, B.h], `${a} / ${b}: identical size`);
    const sa = webpSize(resolve(ROOT, A.file));
    const sb = webpSize(resolve(ROOT, B.file));
    assert.deepEqual(sa, sb, `${a} / ${b}: the files agree`);
  }
  // George's pairs were feature-matched: under a pixel apart after registration
  for (const [name, r] of Object.entries(manifest.registration).filter(([, r]) => 'residualPx' in r)) {
    assert.ok(r.inliers > 200, `${name}: ${r.inliers} inliers`);
    assert.ok(r.residualPx < 1, `${name}: residual ${r.residualPx}px`);
    assert.ok(r.warped || r.maxCornerOffsetPx <= 0.5, `${name}: in register (${r.maxCornerOffsetPx}px)`);
  }
  // every present plate with a 1978 layer is in a pair
  for (const act of [ACT2, ACT3]) {
    for (const tile of Object.values(act.tiles)) {
      for (const state of Object.values(tile.states)) {
        if (!state.platePast) continue;
        const key = (url) => url.replace('/assets/ch1-painted/', '').replace('.webp', '');
        assert.ok(manifest.pairs.some(([x, y]) => x === key(state.plate) && y === key(state.platePast)), `${state.plate} ↔ ${state.platePast}`);
      }
    }
  }
});

test('plates2: Act 2 · the torn net drops the case straight down onto the aisle\'s centre line', () => {
  const { rack, aisle } = manifest.edges.act2.drop;
  assert.ok(Math.abs(rack - aisle) < 0.002, `rack ${rack} vs aisle ${aisle}`);
  assert.equal(DROP_AT, rack);
  const bottom = ACT2.tiles.rack.states.tilting.edges.bottom[0];
  const top = ACT2.tiles.aisle.states.aisle.edges.top[0];
  assert.equal(bottom.at, top.at);
  // Butch stands under it, on the painted floor, at the painted scale (taller than
  // the far door seen behind him: he stands a pace in front of it)
  const butch = ACT2.actors.butch;
  assert.equal(butch.x, DROP_AT);
  assert.ok(Math.abs(butch.y - GEO2.aisle.floor) < 1e-9);
  assert.ok(Math.abs(BUTCH_SCALE * 70 - GEO2.aisle.butchTilePx) < 1, `${BUTCH_SCALE * 70} vs ${GEO2.aisle.butchTilePx}`);
  assert.ok(GEO2.aisle.butchTilePx > GEO2.aisle.doorTilePx * 0.85 && GEO2.aisle.butchTilePx < GEO2.aisle.doorTilePx * 1.1);
});

test('plates2: Act 3 · the lane, the rails and the stair meet on the painted lines', () => {
  const { path, rail, stair, lane, declared } = manifest.edges.act3;
  // the plates were cut so the painted lane sits at PATH_AT on every top-row tile
  Object.entries({ ...path, ...lane }).forEach(([tile, v]) => assert.ok(Math.abs(v - PATH_AT) < 0.005, `${tile} lane ${v} vs ${PATH_AT}`));
  // the deck at RAIL_AT on the carriage, the viaduct and the platform (round 8: all George's)
  assert.deepEqual(Object.keys(rail).sort(), ['carriage', 'gap', 'platform']);
  Object.entries(rail).forEach(([tile, v]) => assert.ok(Math.abs(v - RAIL_AT) < 0.005, `${tile} deck ${v} vs ${RAIL_AT}`));
  // the painted stair leaves the hill's bottom edge and reaches the platform's top edge at STAIR_AT
  Object.entries(stair).forEach(([tile, v]) => assert.ok(Math.abs(v - STAIR_AT) < 0.005, `${tile} stair ${v} vs ${STAIR_AT}`));
  assert.deepEqual(declared, { path: PATH_AT, rail: RAIL_AT, stair: STAIR_AT }, 'the script cut the plates to the same edges');
  // every linked edge of a type carries the one value
  const want = { path: PATH_AT, rail: RAIL_AT, stair: STAIR_AT };
  let count = 0;
  for (const tile of Object.values(ACT3.tiles)) {
    for (const state of Object.values(tile.states)) {
      for (const list of Object.values(state.edges ?? {})) {
        for (const edge of list) {
          if (!(edge.type in want)) continue;
          assert.equal(edge.at, want[edge.type], `${edge.type} at ${edge.at}`);
          count += 1;
        }
      }
    }
  }
  assert.ok(count >= 9, `${count} edges`);
});

test('plates2: Act 2 hotspots and zoom rects sit on the painted objects', () => {
  const rack = ACT2.tiles.rack.states.rack.hotspots;
  const mark = rack.find((h) => h.id === 'bellwether');
  assert.ok(inside(mark.rect, CASE_LABEL), '1978 MARK covers the BELLWETHER label');
  assert.ok(inside(CASE_BOX, CASE_LABEL), 'the label is on the case');
  const tagHot = rack.find((h) => h.id === 'caseTag');
  assert.ok(inside(tagHot.rect, CASE_TAG), 'the zoom hotspot covers the claim tag');
  assert.ok(isSquareZoom(TAG_ZOOM) && inside(TAG_ZOOM, CASE_TAG), 'the zoom flies into the tag');
  assert.equal(tagHot.zoomRect, TAG_ZOOM);
  const post = ACT2.tiles.rack.states.tag.hotspots[0];
  assert.deepEqual(post.rect, POSTCARD);
  assert.ok(isSquareZoom(POSTCARD), 'the postcard picture has the orchard plate\'s aspect, so the zoom lands in it');
  // the frame lifts by its painted brass; the picture inside still moves the window
  const grip = ACT2.tiles.window.frame.grip;
  assert.ok(inside(grip.rect, WINDOW_FRAME) && inside(WINDOW_FRAME, grip.hole), 'grip = the brass ring');
  assert.deepEqual(grip.hole, [...WINDOW_GLASS]);
  // the aisle: the ticket in Butch's raised hand, the case in his arms
  const aisle = ACT2.tiles.aisle.states.aisle.hotspots;
  const ticket = aisle.find((h) => h.id === 'ticket');
  assert.ok(TICKET_AT.x > ticket.rect[0] && TICKET_AT.x < ticket.rect[0] + ticket.rect[2] && TICKET_AT.y > ticket.rect[1] && TICKET_AT.y < ticket.rect[1] + ticket.rect[3]);
  const caseHot = aisle.find((h) => h.id === 'case');
  assert.ok(inside(caseHot.rect, CASE_HELD) && isSquareZoom(CASE_ZOOM) && inside(CASE_ZOOM, CASE_HELD));
  // the open case → the letters; the letter → the shawl; the stone
  const letter = ACT2.tiles.aisle.states.openCase.hotspots[0];
  assert.deepEqual(letter.rect, [...LETTER_BUNDLE]);
  assert.ok(isSquareZoom(LETTER_ZOOM) && overlaps(LETTER_ZOOM, LETTER_BUNDLE));
  const beneath = ACT2.tiles.aisle.states.letter.hotspots.find((h) => h.id === 'beneath');
  assert.deepEqual(beneath.rect, [...SHAWL]);
  assert.ok(isSquareZoom(BENEATH_ZOOM) && overlaps(BENEATH_ZOOM, SHAWL));
  const ember = ACT2.tiles.aisle.states.stone.hotspots[0];
  assert.ok(inside(ember.rect, EMBER));
  // the board: the push is painted only in 1978, and that is where it is pressed
  const board = ACT2.tiles.board.states.default.hotspots;
  for (const id of ['request', 'requestDead']) assert.ok(inside(board.find((h) => h.id === id).rect, REQUEST_PUSH), id);
  assert.deepEqual(REQUEST_STOP, board.find((h) => h.id === 'request').rect);
});

test('plates2: Act 3 · the city window lands round the orchard house\'s lit window; the lens points sit on the breaks', () => {
  // the frame keeps its own tile position on the orchard tile: the painted lit window is inside its glass
  assert.ok(inside(CITY_GLASS, ORCHARD_LIT), 'lit window inside the city glass');
  assert.ok(inside(CITY_WINDOW, CITY_GLASS));
  const grip = ACT3.tiles.city.frame.grip.rect;
  assert.ok(inside(grip, CITY_WINDOW));
  // the zoom from the hill lands on the house painted in A3-overlook: the
  // orchard plate's lit window, carried through the zoom rect, is the
  // overlook's lit window (round 8: matched, AKAZE + RANSAC)
  assert.ok(isSquareZoom(OVERLOOK_HOUSE));
  assert.deepEqual(ACT3.tiles.orchard.zoomStack[0].rect, OVERLOOK_HOUSE);
  const match = manifest.registration['A3-orchard→A3-overlook'];
  assert.ok(match.inliers >= 30, `${match.inliers} inliers`);
  const [hx, hy, hw] = OVERLOOK_HOUSE;
  const lit = [hx + (ORCHARD_LIT[0] + ORCHARD_LIT[2] / 2) * hw, hy + (ORCHARD_LIT[1] + ORCHARD_LIT[3] / 2) * hw];
  assert.ok(Math.abs(lit[0] - GEO3.overlook.lit[0]) < 0.01 && Math.abs(lit[1] - GEO3.overlook.lit[1]) < 0.012, `${lit} vs ${GEO3.overlook.lit}`);
  // the hawthorn lane's painted break: Mara waits short of it, the lens goes on it
  const [bx, by, , bh] = GEO3.hawthorn.break;
  assert.ok(HEDGE.wait < bx, 'Mara waits before the break');
  assert.ok(HEDGE.lens[0] > bx && HEDGE.lens[0] < 1 && HEDGE.lens[1] > by && HEDGE.lens[1] < by + bh, 'the lens point is on the break');
  const right = ACT3.tiles.hawthorn.states.default.edges.right[0];
  assert.deepEqual(right.lensAt, [...HEDGE.lens]);
  // the viaduct's fallen span, centred on the lens point
  assert.ok(Math.abs((GAP_SPAN[0] + GAP_SPAN[1]) / 2 - 0.5) < 0.02, `${GAP_SPAN}`);
  ACT3.tiles.gap.states.default.edges.left.forEach((e) => assert.deepEqual(e.lensAt, [0.5, RAIL_AT]));
});

test('plates2: actors are at the painted scale (Butch in the aisle, Mara on the lane, the train on the viaduct)', () => {
  assert.ok(Math.abs(TRAIN_SCALE * 150 - GEO3.gap.trainTilePx) < 2, 'a 20 m carriage by 15 m arches');
  const mara = (state) => ACT3.actors.mara.scale * (state.actorScale ?? 1) * 66;
  assert.ok(Math.abs(mara(ACT3.tiles.city.states.default) - GEO3.city.maraTilePx) < 1.5, 'in the room');
  assert.ok(Math.abs(mara(ACT3.tiles.hawthorn.states.default) - GEO3.hawthorn.maraTilePx) < 1.5, 'on the lane');
  // further off on the hill, smaller on the platform beside the train
  assert.ok(mara(ACT3.tiles.orchard.states.overlook) < mara(ACT3.tiles.hawthorn.states.default));
  assert.ok(Math.abs(mara(ACT3.tiles.orchard.states.overlook) - GEO3.overlook.maraTilePx) < 1.5, 'on the hill');
  assert.ok(ACT3.actors.mara.scale * 66 < TRAIN_SCALE * 44, 'on the platform she is shorter than the carriage');
  // the farewell's close-up: Butch 45% of the tile's height by the bench, Mara beside the painted doorway
  const close = ACT3.tiles.platform.states.close;
  const butchPx = 70 * PEOPLE_SCALE * close.actorScale;
  assert.ok(Math.abs(butchPx / 414 - 0.45) < 0.01, `Butch ${butchPx} px of 414`);
  assert.equal(close.actorScale, CLOSE_SCALE);
  const maraPx = 66 * MARA_CLOSE_SCALE * close.actorScale;
  assert.ok(Math.abs(maraPx - CLOSE.maraTilePx) < 1.5, `Mara ${maraPx} px`);
  assert.ok(maraPx < CLOSE.door[3] * 414 && maraPx > CLOSE.door[3] * 414 * 0.75, 'she fits the doorway she boards by');
  // the act still plays through at these scales
  const model = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'bridge' });
  const target = ['city', 'hawthorn', 'orchard', 'carriage', 'gap', 'platform'];
  for (let i = 0; i < target.length; i += 1) if (model.state.slots[i] !== target[i]) model.swap(i, model.state.slots.indexOf(target[i]));
  const r = model.slotRect('gap');
  model.moveLens(r.x + r.w * 0.5, r.y + r.h * RAIL_AT);
  settle(model, { maxMs: 120000 });
  assert.equal(model.state.ended?.kind, 'endChapter');
});

/** Mean luminance of each pixel row over a vertical strip [x0, x1) of a plate. */
async function rowProfile(path, x0, x1) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const a = Math.round(x0 * width);
  const b = Math.round(x1 * width);
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = a; x < b; x += 1) {
      const i = (y * width + x) * 3;
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    rows.push(sum / (b - a));
  }
  return { rows, height };
}

/** Where the strongest dark-to-light step (a deck's moonlit coping, or a railing) is, between v0 and v1. */
function strongestStep({ rows, height }, v0, v1) {
  let best = -Infinity;
  let at = 0;
  for (let y = Math.round(height * v0); y < Math.round(height * v1); y += 1) {
    const d = rows[y + 3] - rows[y - 3];
    if (d > best) { best = d; at = y; }
  }
  return at / height;
}

test('plates2: the painted viaduct deck meets at RAIL_AT on both sides of both gutters (pixels)', async () => {
  const plate = (name) => file(ACT3.tiles[name].states.default.plate);
  const edges = [
    ['carriage', 0.93, 1], ['gap', 0, 0.07], ['gap', 0.93, 1], ['platform', 0, 0.07],
  ];
  const railing = {};
  for (const [tile, x0, x1] of edges) {
    const profile = await rowProfile(plate(tile), x0, x1);
    // the deck's top: the moonlit coping just at RAIL_AT (the railing stands above it)
    const v = strongestStep(profile, RAIL_AT - 0.02, RAIL_AT + 0.02);
    // within 4 screen px at 1920×1080 (the tile is 414 px tall there)
    assert.ok(Math.abs(v - RAIL_AT) * 414 <= 4, `${tile} @${x0}: deck at ${v.toFixed(4)} vs ${RAIL_AT}`);
    railing[`${tile}@${x0}`] = strongestStep(profile, RAIL_AT - 0.045, RAIL_AT - 0.015);
  }
  // the iron railing on the approach runs on into the viaduct's (the station's own is taller)
  assert.ok(Math.abs(railing['carriage@0.93'] - railing['gap@0']) * 414 <= 4, JSON.stringify(railing));
});

test('plates2: the farewell plays in the platform close-up, every beat kept and in order', () => {
  const model = createPanelModel(ACT3, { carry: startCarry('act3'), step: 'bridge' });
  const target = ['city', 'hawthorn', 'orchard', 'carriage', 'gap', 'platform'];
  for (let i = 0; i < target.length; i += 1) if (model.state.slots[i] !== target[i]) model.swap(i, model.state.slots.indexOf(target[i]));
  const r = model.slotRect('gap');
  model.moveLens(r.x + r.w * 0.5, r.y + r.h * RAIL_AT);
  const log = record(model);
  const flagsAt = [];
  model.on('change', () => { const f = model.state.flags.join(','); if (flagsAt.at(-1) !== f) flagsAt.push(f); });
  settle(model, { maxMs: 160000 });
  assert.equal(model.state.ended?.kind, 'endChapter');
  const names = log.map(([n, p]) => (n === 'fx' ? `fx:${p.name}` : n === 'sfx' ? `sfx:${p.name}` : n === 'zoom' ? `zoom:${p.to}` : n === 'dialogue' ? 'line' : n));
  const order = ['fx:memoryLights', 'fx:holdActors', 'zoom:close', 'fx:leaveCase', 'sfx:thud', 'fx:boardTrain', 'sfx:door', 'sfx:whistle', 'line', 'fx:fadeAll', 'chapter:end'];
  let at = -1;
  order.forEach((name) => { const i = names.indexOf(name, at + 1); assert.ok(i > at, `${name} after ${order[order.indexOf(name) - 1]}`); at = i; });
  // the camera's move is deliberate, and flies into the painted bench
  const zoom = log.find(([n, p]) => n === 'zoom' && p.to === 'close')[1];
  assert.ok(zoom.ms >= 2000, `${zoom.ms} ms`);
  assert.deepEqual(zoom.rect, CLOSE_ZOOM);
  // the case is left on the bench before she boards
  const caseAt = flagsAt.findIndex((f) => f.includes('caseOnBench'));
  const aboardAt = flagsAt.findIndex((f) => f.includes('maraAboard'));
  assert.ok(caseAt >= 0 && aboardAt > caseAt);
  // the two lines, the beat of her train leaving, and who is where at the end
  assert.deepEqual(log.filter(([n]) => n === 'dialogue').map(([, p]) => p.line.text), ['She\'s always one stop ahead.', 'The line keeps going.']);
  const a = model.state.actors;
  assert.ok(a.farTrain.x > 1, 'her train pulled away');
  assert.equal(a.farTrain.state, 'default', 'it is painted into the close-up: its actor stays off it');
  assert.equal(a.train.state, 'default', 'our train stays on the wide picture');
  assert.equal(model.state.tiles.platform.state, 'close');
  assert.equal(a.butch.state, 'close');
  assert.ok(Math.abs(a.butch.x - BENCH_STAND) < 1e-9 && Math.abs(a.butch.y - CLOSE.floor) < 1e-9);
  assert.equal(a.butch.carrying, null, 'he left it');
  assert.equal(a.maraClose.visible, false, 'she is aboard');
  assert.equal(a.mara.visible, false);
});

test('plates2: the close-up\'s pieces sit on the painting (the case on the seat, the dark doorway on the door, the zoom on the bench)', () => {
  const [bx, by, bw, bh] = CLOSE.bench;
  const [cx, cy, cw, ch] = CLOSE.case;
  assert.ok(cx > bx && cx + cw < bx + bw, 'the case lies along the bench');
  assert.ok(Math.abs(cy + ch - CLOSE.seat) < 0.01, 'on the seat');
  assert.ok(BENCH_STAND > cx + cw && BENCH_STAND < bx + bw + 0.1, 'Butch stands just past it');
  assert.ok(inside(CLOSE.doorSprite, CLOSE.door));
  // the zoom rect, carried onto the close-up, puts the wide bench on the painted bench
  const wide = GEO3.platform.bench;
  const [zx, zy, zs] = CLOSE_ZOOM;
  assert.ok(isSquareZoom(CLOSE_ZOOM));
  const mapped = [(wide[0] - zx) / zs, (wide[1] - zy) / zs, wide[2] / zs, wide[3] / zs];
  // (its place and width; George's two benches differ a little in height, which the dissolve covers)
  mapped.slice(0, 3).forEach((v, i) => assert.ok(Math.abs(v - CLOSE.bench[i]) < 0.03, `bench ${mapped} vs ${CLOSE.bench}`));
  assert.ok(Math.abs(mapped[3] / CLOSE.bench[3] - 1) < 0.25, `bench height ${mapped[3]} vs ${CLOSE.bench[3]}`);
  // every piece the farewell draws is a loaded plate or prop
  const urls = actPlates(ACT3).map((p) => p.url);
  [PLATE3['platform-close'], PLATE3['close-case']].forEach((url) => assert.ok(urls.includes(url), url));
  ['close-case', 'close-door-dark'].forEach((k) => assert.ok(existsSync(file(PLATE3[k])), k));
});
