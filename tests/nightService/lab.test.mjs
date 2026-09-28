// The dev engine lab exercises the Act 2–3 mechanics end to end in the model:
// frame lift + overlay, the lens bridging past-era rails, and the train.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAB_ACT } from '../../src/chapters/nightService/acts/labAct.js';
import { createPanelModel, validateAct } from '../../src/chapters/nightService/panelModel.js';
import { record, settle } from './helpers.mjs';

test('lab act is valid and uses a 3×2 grid', () => {
  assert.deepEqual(validateAct(LAB_ACT), []);
  const model = createPanelModel(LAB_ACT);
  assert.equal(model.layout.cols, 3);
  assert.equal(model.layout.rows, 2);
  assert.ok(model.state.lens.enabled);
});

test('lab: frame overlay → bell; lens over the viaduct → train crosses; moving the lens stops it', () => {
  const model = createPanelModel(LAB_ACT);
  const log = record(model);
  // overlay step
  assert.ok(model.liftFrame('yardFrame'));
  assert.ok(model.dropFrame('house'));
  settle(model);
  assert.equal(model.state.bell, 2);
  // the overlay contributes a glow edge on the house's left, facing the yard's frame
  // (the yard's frame is on the house now, so no glow link from the yard)
  assert.equal(model.findLink('yard', 'house', 'glow'), null);
  // bridge step: hold the lens on the broken middle of the viaduct
  const v = model.slotRect('viaduct');
  model.moveLens(v.x + v.w * 0.5, v.y + v.h * 0.85);
  assert.ok(model.findLink('depot', 'viaduct', 'rail'));
  assert.ok(model.findLink('viaduct', 'platform', 'rail'));
  // let the train reach the middle, then move the lens away: it waits safely
  for (let i = 0; i < 200 && !(model.state.actors.train.tile === 'viaduct' && model.state.actors.train.x >= 0.49); i += 1) model.update(50);
  assert.equal(model.state.actors.train.tile, 'viaduct');
  model.moveLens(100, 100);
  settle(model);
  assert.equal(model.state.actors.train.blocked, true);
  assert.equal(model.state.actors.train.tile, 'viaduct');
  // lens back: it finishes the run
  model.moveLens(v.x + v.w * 0.5, v.y + v.h * 0.85);
  settle(model);
  assert.equal(model.state.actors.train.tile, 'platform');
  assert.equal(model.state.bell, 3);
  assert.ok(log.some(([name, p]) => name === 'bell' && p.memory.some((m) => m.type === 'rail')), 'the bell remembers the rail links');
  assert.ok(log.some(([name, p]) => name === 'link:on' && p.era === 'past'));
});

test('lab: past-era hotspot only through the lens', () => {
  const model = createPanelModel(LAB_ACT);
  const house = model.slotRect('house');
  const pt = { x: house.x + house.w * 0.5, y: house.y + house.h * 0.45 };
  model.moveLens(100, 100);
  assert.equal(model.clickTile('house', 0.5, 0.45, pt), false);
  model.moveLens(pt.x, pt.y);
  assert.equal(model.clickTile('house', 0.5, 0.45, pt), true);
  assert.ok(model.hasFlag('sawWindow'));
});
