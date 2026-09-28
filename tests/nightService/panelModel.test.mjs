import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LINK_TOLERANCE, TIMES_OF_DAY, createPanelModel, defineAct, edgePoint, layoutGrid, validateAct,
} from '../../src/chapters/nightService/panelModel.js';
import { record, settle } from './helpers.mjs';

const noop = () => {};

// A synthetic 3×2 act exercising every engine feature at once.
function fixture(overrides = {}) {
  return defineAct({
    id: 'fixture',
    number: 0,
    grid: { cols: 3, rows: 2 },
    slots: ['a', 'b', 'c', 'd', 'e', 'f'],
    start: { bell: 0 },
    tiles: {
      a: { states: { s: { draw: noop, edges: { right: [{ type: 'floor', at: 0.5 }], bottom: [{ type: 'pipe', at: 0.4 }] } } } },
      b: {
        states: {
          s: {
            draw: noop,
            edges: { left: [{ type: 'floor', at: 0.52 }] },
            hotspots: [
              { id: 'zoom', kind: 'zoom', to: 'close', rect: [0.4, 0.4, 0.2, 0.2] },
              { id: 'past', kind: 'use', era: 'past', rect: [0.1, 0.1, 0.2, 0.2], do: [{ setFlag: 'sawPast' }] },
              { id: 'gated', kind: 'pickup', item: 'key', rect: [0.7, 0.7, 0.2, 0.2], requires: { flag: 'sawPast' } },
            ],
          },
          close: { draw: noop, edges: { right: [{ type: 'rope', at: 0.3 }] } },
        },
      },
      c: {
        states: {
          s: { draw: noop, edges: { left: [{ type: 'rope', at: 0.3 }] } },
        },
      },
      d: { states: { s: { draw: noop, edges: { top: [{ type: 'pipe', at: 0.4 }], right: [{ type: 'rail', at: 0.85 }] } } } },
      e: {
        frame: { id: 'frameE', edges: { right: [{ type: 'glow', at: 0.5 }] } },
        states: {
          s: {
            draw: noop,
            edges: {
              left: [{ type: 'rail', at: 0.85, era: 'past', lensAt: [0.5, 0.85] }],
              right: [{ type: 'rail', at: 0.85, era: 'past', lensAt: [0.5, 0.85] }],
            },
          },
        },
      },
      f: { states: { s: { draw: noop, edges: { left: [{ type: 'rail', at: 0.85 }, { type: 'glow', at: 0.5 }] } } } },
    },
    actors: { butch: { tile: 'a', x: 0.5, y: 0.5 }, train: { tile: 'd', x: 0.2, y: 0.85 } },
    steps: [],
    ...overrides,
  });
}

test('layout: 2×2 and 3×2 carriage windows fit 1920×1080 with 36 px gutters', () => {
  const two = layoutGrid({ cols: 2, rows: 2 });
  assert.equal(two.slots.length, 4);
  assert.equal(two.slots[1].x - (two.slots[0].x + two.slots[0].w), 36);
  assert.equal(two.slots[2].y - (two.slots[0].y + two.slots[0].h), 36);
  const three = layoutGrid({ cols: 3, rows: 2 });
  assert.equal(three.slots.length, 6);
  three.slots.forEach((slot) => {
    assert.ok(slot.x >= 100 && slot.x + slot.w <= 1820);
    assert.ok(slot.y >= 40 && slot.y + slot.h <= 940);
  });
});

test('validateAct reports structural problems', () => {
  assert.deepEqual(validateAct(fixture()), []);
  const bad = validateAct({ id: 'x', grid: { cols: 2, rows: 1 }, slots: ['a'], tiles: { a: { states: { s: { hotspots: [{ id: 'z', kind: 'zoom', to: 'nope', rect: [0, 0, 1, 1] }] } } } }, steps: [] });
  assert.ok(bad.some((p) => p.includes('slots must list 2')));
  assert.ok(bad.some((p) => p.includes('unknown state "nope"')));
  assert.throws(() => defineAct({ id: 'y', slots: [], tiles: {}, steps: [] }));
});

test('links: facing edges of the same type within ±0.03 connect', () => {
  const model = createPanelModel(fixture());
  // a.right floor 0.50 ↔ b.left floor 0.52 : |Δ| = 0.02 ≤ 0.03
  assert.ok(model.findLink('a', 'b', 'floor'));
  // a.bottom pipe 0.4 ↔ d.top pipe 0.4
  assert.ok(model.findLink('a', 'd', 'pipe'));
  assert.equal(LINK_TOLERANCE, 0.03);
});

test('links: tolerance boundary — 0.03 connects, 0.031 does not', () => {
  const make = (at) => createPanelModel(fixture({
    tiles: {
      ...fixture().tiles,
      b: { states: { s: { draw: noop, edges: { left: [{ type: 'floor', at }] } } } },
    },
  }));
  assert.ok(make(0.53).findLink('a', 'b', 'floor'), '0.03 apart links');
  assert.ok(make(0.47).findLink('a', 'b', 'floor'), '-0.03 apart links');
  assert.equal(make(0.531).findLink('a', 'b', 'floor'), null, '0.031 apart does not');
});

test('links: different types never link; mismatches are reported', () => {
  const model = createPanelModel(fixture());
  assert.equal(model.findLink('d', 'e', 'rail'), null, 'past rail without lens');
  const mism = model.mismatches();
  assert.ok(mism.some((m) => m.tile === 'd' && m.side === 'right' && m.type === 'rail'));
});

test('swap moves tiles, emits swap + link events, and recomputes links', () => {
  const model = createPanelModel(fixture());
  const log = record(model);
  assert.ok(model.swap(0, 1)); // b | a | c
  assert.deepEqual(model.state.slots.slice(0, 3), ['b', 'a', 'c']);
  assert.ok(log.some(([name]) => name === 'swap'));
  assert.ok(log.some(([name, p]) => name === 'link:off' && p.type === 'floor'));
  assert.equal(model.findLink('a', 'b', 'floor'), null);
  assert.ok(model.swap(1, 0));
  assert.ok(model.findLink('a', 'b', 'floor'));
  assert.ok(log.some(([name, p]) => name === 'link:on' && p.type === 'floor'));
});

test('drag: a lifted tile drops its links until it lands; dropping on itself is a no-op', () => {
  const model = createPanelModel(fixture());
  assert.ok(model.beginDrag('a'));
  assert.equal(model.findLink('a', 'b', 'floor'), null);
  assert.equal(model.dropOn(0), false);
  assert.ok(model.findLink('a', 'b', 'floor'));
});

test('locked tiles cannot be dragged or swapped into', () => {
  const act = fixture();
  act.tiles.c.draggable = false;
  const model = createPanelModel(act);
  assert.equal(model.canDrag('c'), false);
  assert.equal(model.swap(0, 2), false);
  assert.deepEqual(model.state.slots, ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('zoom: edges follow the CURRENT state, so zoom level is part of the solution', () => {
  const model = createPanelModel(fixture());
  assert.equal(model.findLink('b', 'c', 'rope'), null);
  assert.ok(model.zoomIn('b', 'zoom'));
  assert.equal(model.state.tiles.b.state, 'close');
  assert.equal(model.state.tiles.b.zoomStack.length, 1);
  assert.ok(model.findLink('b', 'c', 'rope'), 'zoomed state exposes the rope edge');
  assert.equal(model.findLink('a', 'b', 'floor'), null, 'the overview floor edge is gone while zoomed');
  assert.ok(model.zoomOut('b'));
  assert.equal(model.state.tiles.b.state, 's');
  assert.equal(model.findLink('b', 'c', 'rope'), null);
  assert.ok(model.findLink('a', 'b', 'floor'));
  assert.equal(model.zoomOut('b'), false, 'nothing left on the zoom stack');
});

test('zoom: the zoom event carries the hotspot rect for the animation', () => {
  const model = createPanelModel(fixture());
  const log = record(model);
  model.zoomIn('b', 'zoom');
  const zoom = log.find(([name]) => name === 'zoom')[1];
  assert.deepEqual(zoom, { tile: 'b', dir: 'in', from: 's', to: 'close', rect: [0.4, 0.4, 0.2, 0.2] });
});

test('frame lift: overlay contributes edges; dropping in a gutter returns it home', () => {
  const act = fixture();
  act.tiles.e.frame = { id: 'frameE', edges: { right: [{ type: 'glow', at: 0.5 }] } };
  const model = createPanelModel(act);
  // at home on e, its glow edge faces f.left glow 0.5
  assert.ok(model.findLink('e', 'f', 'glow'));
  assert.ok(model.liftFrame('frameE'));
  assert.equal(model.floatingFrame().id, 'frameE');
  assert.equal(model.findLink('e', 'f', 'glow'), null);
  assert.equal(model.textState().tiles.e.frameLifted, true);
  // drop onto b: overlay; b.right now carries glow facing c.left (no glow) — no link
  assert.ok(model.dropFrame('b'));
  assert.equal(model.overlayOn('b'), 'frameE');
  assert.ok(model.evaluate({ overlay: { frame: 'frameE', onto: 'b', ontoState: 's' } }));
  assert.equal(model.evaluate({ overlay: { frame: 'frameE', onto: 'b', ontoState: 'close' } }), false);
  // lift it again and drop on a gutter: home
  assert.ok(model.liftFrame('frameE'));
  model.dropFrame(null);
  assert.equal(model.state.frames.frameE.host, 'e');
  assert.ok(model.findLink('e', 'f', 'glow'));
});

test('frame lift: an overlay composite can contribute edges that link', () => {
  const act = fixture();
  act.tiles.c.states.s.edges.left = [{ type: 'rope', at: 0.3 }, { type: 'glow', at: 0.5 }];
  const model = createPanelModel(act);
  // move b out so a (right edge) faces... put e's frame on b; b.right glow 0.5 ↔ c.left glow 0.5
  model.liftFrame('frameE');
  model.dropFrame('b');
  assert.ok(model.findLink('b', 'c', 'glow'), 'overlay edge links with the neighbour');
});

test('frame drop onto a tile already hosting an overlay is rejected and returns home', () => {
  const act = fixture();
  act.tiles.a.frame = { id: 'frameA' };
  const model = createPanelModel(act);
  model.liftFrame('frameE');
  model.dropFrame('b');
  model.liftFrame('frameA');
  assert.equal(model.dropFrame('b'), false);
  assert.equal(model.state.frames.frameA.host, 'a');
});

test('lens: past-era edges count only while the lens covers their anchor', () => {
  const act = fixture({ start: { lens: { x: 100, y: 100 } } });
  const model = createPanelModel(act);
  const e = model.slotRect('e');
  assert.equal(model.findLink('d', 'e', 'rail'), null);
  // lensAt [0.5, 0.85] of e: centre of the broken viaduct
  model.moveLens(e.x + e.w * 0.5, e.y + e.h * 0.85);
  assert.ok(model.findLink('d', 'e', 'rail'));
  assert.ok(model.findLink('e', 'f', 'rail'));
  assert.equal(model.findLink('d', 'e', 'rail').era, 'past');
  // move it away: links go
  model.moveLens(40, 40);
  assert.equal(model.findLink('d', 'e', 'rail'), null);
});

test('lens: without lensAt the edge endpoint itself must be covered', () => {
  const act = fixture({ start: { lens: { x: 10, y: 10, r: 60 } } });
  act.tiles.e.states.s.edges.left = [{ type: 'rail', at: 0.85, era: 'past' }];
  const model = createPanelModel(act);
  const e = model.slotRect('e');
  model.moveLens(e.x + e.w * 0.5, e.y + e.h * 0.85);
  assert.equal(model.findLink('d', 'e', 'rail'), null, 'middle of the tile is too far from the edge');
  const p = edgePoint(e, 'left', 0.85);
  model.moveLens(p.x + 20, p.y);
  assert.ok(model.findLink('d', 'e', 'rail'));
});

test('lens: past hotspots are clickable only inside the lens; present ones only outside', () => {
  const act = fixture({ start: { lens: { x: 10, y: 10 } } });
  const model = createPanelModel(act);
  const b = model.slotRect('b');
  const inside = { x: b.x + 0.2 * b.w, y: b.y + 0.2 * b.h };
  assert.equal(model.hotspotAt('b', 0.2, 0.2, inside), null, 'lens elsewhere: past hotspot hidden');
  model.moveLens(inside.x, inside.y);
  assert.equal(model.hotspotAt('b', 0.2, 0.2, inside).id, 'past');
  const centre = { x: b.x + 0.5 * b.w, y: b.y + 0.5 * b.h };
  model.moveLens(centre.x, centre.y);
  assert.equal(model.hotspotAt('b', 0.5, 0.5, centre), null, 'present zoom hotspot under the lens is not clickable');
  model.moveLens(10, 10);
  assert.equal(model.hotspotAt('b', 0.5, 0.5, centre).id, 'zoom', 'and clickable again once the lens moves away');
  model.moveLens(inside.x, inside.y);
  assert.ok(model.clickTile('b', 0.2, 0.2, inside));
  assert.ok(model.hasFlag('sawPast'));
  // requires-gated pickup now enabled, and a pickup is consumed once
  model.moveLens(10, 10);
  assert.ok(model.clickTile('b', 0.8, 0.8));
  assert.ok(model.hasItem('key'));
  assert.equal(model.hotspots('b').find((h) => h.id === 'gated').enabled, false);
});

test('walk: actors cross only over an active link and stop when it breaks', () => {
  const act = fixture();
  const model = createPanelModel(act);
  const log = record(model);
  model.state.queue.push({
    walkButch: {
      id: 'go',
      path: [{ tile: 'a', x: 1, y: 0.5 }, { tile: 'b', x: 0, y: 0.52, via: 'floor' }, { tile: 'b', x: 0.5, y: 0.52 }],
    },
  });
  model.swap(0, 2); // break the link first: c a b — a|b still adjacent? slots: c,b,a → a.right is grid edge
  model.swap(0, 2); // restore
  model.swap(0, 1); // b, a : a.right faces c now: no floor link
  assert.equal(model.findLink('a', 'b', 'floor'), null);
  // kick the queue by any change
  model.update(0);
  settle(model, { maxMs: 8000 });
  const butch = model.state.actors.butch;
  assert.equal(butch.tile, 'a');
  assert.equal(butch.blocked, true, 'waits at the edge');
  assert.ok(log.some(([name]) => name === 'walk:blocked'));
  model.swap(0, 1); // a, b again
  settle(model, { maxMs: 8000 });
  assert.equal(butch.tile, 'b');
  assert.equal(butch.x, 0.5);
  assert.ok(model.evaluate({ butchArrived: 'go' }));
});

test('walk: breaking the link mid-crossing sends the actor back to the edge', () => {
  const model = createPanelModel(fixture());
  model.state.queue.push({ walkButch: { id: 'go', path: [{ tile: 'a', x: 1, y: 0.5 }, { tile: 'b', x: 0, y: 0.52, via: 'floor' }, { tile: 'b', x: 0.4, y: 0.52 }] } });
  model.update(0);
  // walk until crossing
  for (let i = 0; i < 400 && !model.state.actors.butch.crossing; i += 1) model.update(16);
  assert.ok(model.state.actors.butch.crossing);
  model.beginDrag('b');
  model.update(16);
  assert.equal(model.state.actors.butch.crossing, null);
  assert.equal(model.state.actors.butch.tile, 'a');
  assert.equal(model.state.actors.butch.blocked, true);
  model.dropOn(model.slotOf('b'));
  settle(model);
  assert.equal(model.state.actors.butch.tile, 'b');
});

test('train: waypoints with a lens requirement wait until the lens is held there', () => {
  const act = fixture({ start: { lens: { x: 10, y: 10 } } });
  const model = createPanelModel(act);
  const e = model.slotRect('e');
  model.state.queue.push({
    playTrain: {
      id: 'run',
      path: [
        { tile: 'd', x: 1, y: 0.85 },
        { tile: 'e', x: 0, y: 0.85, via: 'rail' },
        { tile: 'e', x: 0.5, y: 0.85, requires: { lensOver: { tile: 'e', x: 0.5, y: 0.85 } } },
        { tile: 'e', x: 1, y: 0.85 },
        { tile: 'f', x: 0, y: 0.85, via: 'rail' },
        { tile: 'f', x: 0.3, y: 0.85 },
      ],
    },
  });
  model.update(0);
  settle(model);
  assert.equal(model.state.actors.train.tile, 'd', 'no lens: waits at the broken viaduct');
  model.moveLens(e.x + e.w * 0.5, e.y + e.h * 0.85);
  settle(model);
  assert.equal(model.state.actors.train.tile, 'f');
  assert.ok(model.evaluate({ arrived: 'run' }));
});

test('script: ordered steps, conditions, effects and blocking waits', () => {
  const act = fixture({
    cards: { c1: { title: 'CARD' } },
    steps: [
      { id: 'one', when: { link: { a: 'b', b: 'c', type: 'rope' } }, do: [{ setFlag: 'roped' }, { wait: 500 }, { giveItem: 'coin' }, { showCard: 'c1' }] },
      { id: 'two', when: { all: [{ item: 'coin' }, { state: { tile: 'b', is: 's' } }] }, do: [{ ringBell: true }, { dialogue: [{ speaker: 'X', text: 'a' }, { speaker: 'Y', text: 'b' }] }, { unlockDrag: 'c' }, { nextAct: 'next' }] },
    ],
  });
  const model = createPanelModel(act);
  const log = record(model);
  assert.equal(model.currentStep().id, 'one');
  model.zoomIn('b', 'zoom');
  assert.equal(model.currentStep().id, 'two');
  assert.ok(model.hasFlag('roped'));
  assert.equal(model.hasItem('coin'), false, 'blocked behind the wait');
  model.update(499);
  assert.equal(model.hasItem('coin'), false);
  model.update(2);
  assert.ok(model.hasItem('coin'));
  assert.equal(model.state.card.id, 'c1');
  // step two needs b back at overview
  model.zoomOut('b');
  assert.equal(model.state.bell, 1);
  assert.equal(model.timeOfDay(), TIMES_OF_DAY[1]);
  const bell = log.find(([name]) => name === 'bell')[1];
  assert.ok(bell.memory.some((entry) => entry.type === 'rope'), 'bell remembers earlier links');
  assert.equal(model.textState().dialogue.speaker, 'X');
  assert.equal(model.isLocked(), true, 'dialogue locks the verbs');
  assert.equal(model.swap(0, 1), false);
  model.advanceDialogue();
  model.advanceDialogue();
  assert.deepEqual(model.state.ended.next, 'next');
  assert.ok(log.some(([name]) => name === 'act:end'));
});

test('snapshot/restore round-trips the whole state', () => {
  const model = createPanelModel(fixture());
  model.swap(0, 1);
  model.zoomIn('b', 'zoom');
  model.liftFrame('frameE');
  const snap = model.snapshot();
  const other = createPanelModel(fixture());
  other.restore(snap);
  assert.deepEqual(other.textState(), model.textState());
});

test('textState exposes the QA fields render_game_to_text needs', () => {
  const model = createPanelModel(fixture({ start: { lens: { x: 300, y: 300 }, bell: 2, items: ['punch'] } }));
  const t = model.textState();
  ['act', 'step', 'grid', 'tiles', 'overlays', 'links', 'lens', 'butch', 'bell', 'items', 'timeOfDay'].forEach((key) => assert.ok(key in t, key));
  assert.equal(t.bell, 2);
  assert.deepEqual(t.items, ['punch']);
  assert.deepEqual(t.lens, { x: 300, y: 300, r: 120 });
  assert.equal(t.timeOfDay, 'night');
});

test('carry: bell, items, stones and link history follow into the next act', () => {
  const model = createPanelModel(fixture({ steps: [{ id: 's', when: true, do: [{ ringBell: true }, { giveItem: 'punch' }, { grantStone: 'chapter-1' }, { nextAct: 'x' }] }] }));
  const carry = model.carry();
  assert.equal(carry.bell, 1);
  assert.deepEqual(carry.items, ['punch']);
  assert.deepEqual(carry.flags, ['stone:chapter-1']);
  assert.ok(Array.isArray(carry.linkHistory));
  const next = createPanelModel(fixture(), { carry });
  assert.equal(next.state.bell, 1);
  assert.ok(next.hasItem('punch'));
});

test('link history records every link the player completes', () => {
  const model = createPanelModel(fixture());
  assert.equal(model.state.linkHistory.length, 0, 'links present at load are not player-made');
  model.zoomIn('b', 'zoom');
  assert.ok(model.state.linkHistory.some((entry) => entry.type === 'rope'));
  model.zoomOut('b');
  assert.equal(model.state.linkHistory.filter((entry) => entry.type === 'rope').length, 1, 'no duplicates');
});

test('unknown effects and conditions fail loudly', () => {
  const model = createPanelModel(fixture());
  assert.throws(() => model.evaluate({ bogus: 1 }));
  model.state.queue.push({ nope: true });
  assert.throws(() => model.update(0) || model.swap(0, 1));
});
