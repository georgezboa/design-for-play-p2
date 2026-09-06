import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWorldFusionModel, WORLD_FUSION } from '../../src/chapters/allWorlds/worldFusionModel.js';

const DT = 16;

function walk(model, target) {
  for (let i = 0; i < 1000; i++) {
    const s = model.snapshot();
    if (Math.abs(s.player.x - target) <= 2) return s;
    model.update(DT, { right: s.player.x < target, left: s.player.x > target });
  }
  assert.fail(`did not reach ${target}`);
}

function advance(model, totalMs, input = {}) {
  let left = totalMs;
  while (left > 0) {
    const dt = Math.min(DT, left);
    model.update(dt, input);
    left -= dt;
  }
}

function completePairwiseFusion(model) {
  walk(model, 264);
  assert.equal(model.pressInteract(), true);
  assert.equal(model.pressWorldShift(), true);
  walk(model, 540);
  assert.equal(model.pressInteract(), true);
  walk(model, 700);
  model.update(800, {});
  walk(model, 840);
  assert.equal(model.pressInteract(), true);
}

describe('Chapter 6 pairwise world fusion', () => {
  it('blocks movement through each world rule until its carried relationship changes it', () => {
    const m = createWorldFusionModel();
    advance(m, 4000, { right: true });
    assert.equal(m.snapshot().player.x, 392);
    walk(m, 264);
    m.pressInteract();
    m.pressWorldShift();
    advance(m, 4000, { right: true });
    assert.equal(m.snapshot().player.x, 690);
  });

  it('carries grid power into the painted world and makes it a new physical rule', () => {
    const m = createWorldFusionModel();
    walk(m, 264);
    m.pressInteract();
    assert.equal(m.snapshot().carriedState.gridLinked, true);
    m.pressWorldShift();
    assert.equal(m.snapshot().world, WORLD_FUSION.PAINT);
    walk(m, 540);
    m.pressInteract();
    const s = m.snapshot();
    assert.equal(s.carriedState.paintBridge, true);
    assert.match(s.carriedState.meaning, /power became wind/);
  });

  it('uses a player-controlled shift and then an authored automatic cut without losing state', () => {
    const m = createWorldFusionModel();
    walk(m, 264); m.pressInteract(); m.pressWorldShift();
    walk(m, 540); m.pressInteract();
    walk(m, 700);
    let s = m.snapshot();
    assert.equal(s.automaticCut.active, true);
    assert.equal(s.world, WORLD_FUSION.PAINT);
    advance(m, 800);
    s = m.snapshot();
    assert.equal(s.world, WORLD_FUSION.GRID);
    assert.equal(s.carriedState.gridLinked, true);
    assert.equal(s.carriedState.paintBridge, true);
  });

  it('cannot open the witness door with only one world state', () => {
    const m = createWorldFusionModel();
    walk(m, 264); m.pressInteract();
    walk(m, 840);
    assert.equal(m.pressInteract(), false);
    assert.equal(m.snapshot().complete, false);
  });

  it('completes with one continuous chain and reset is deterministic', () => {
    const m = createWorldFusionModel();
    completePairwiseFusion(m);
    assert.equal(m.snapshot().complete, true);
    const baseline = JSON.stringify(m.reset());
    for (let i = 0; i < 8; i++) assert.equal(JSON.stringify(m.reset()), baseline);
  });
});
