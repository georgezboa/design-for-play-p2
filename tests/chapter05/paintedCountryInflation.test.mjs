import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPaintedCountryInflationModel,
  INFLATION_SLOT_CAPACITY,
} from '../../src/chapters/paintedCountry/paintedCountryInflationModel.js';

function fill(model, action, id) {
  for (let step = 0; step < 120; step += 1) model[action](id, 1 / 60);
}

test('Door 4 starts with a real two-slot brush and one washable pigment', () => {
  const model = createPaintedCountryInflationModel();
  assert.equal(model.target().id, 'ink-bread');
  assert.deepEqual(model.state.brush, [{ pigment: null, load: 0 }, { pigment: null, load: 0 }]);
  fill(model, 'wash', 'ink-bread');
  assert.equal(model.target().id, 'note-bread');
  assert.equal(model.state.brush[0].pigment, 'gold-ochre');
  assert.ok(Math.abs(model.state.brush[0].load - INFLATION_SLOT_CAPACITY) < 1e-9);
});

test('painting three notes creates inflation instead of solving the market', () => {
  const model = createPaintedCountryInflationModel();
  for (const good of ['bread', 'medicine', 'timber']) {
    fill(model, 'wash', `ink-${good}`);
    fill(model, 'paint', `note-${good}`);
  }
  assert.equal(model.state.phase, 'crisis');
  assert.equal(model.state.moneyGiven, 3);
  assert.equal(model.state.pricePressure, 3);
  assert.deepEqual(model.state.servedResidents, ['bread', 'medicine', 'timber']);
});

test('old notes must be washed back into the brush before supply can be painted', () => {
  const model = createPaintedCountryInflationModel();
  for (const good of ['bread', 'medicine', 'timber']) {
    fill(model, 'wash', `ink-${good}`);
    fill(model, 'paint', `note-${good}`);
  }
  model.update(2);
  assert.equal(model.state.phase, 'repair');
  assert.equal(model.target().id, 'note-bread');
  assert.equal(model.paint('repair-bread', 1), 0);
  fill(model, 'wash', 'note-bread');
  assert.equal(model.target().id, 'repair-bread');
  fill(model, 'paint', 'repair-bread');
  assert.deepEqual(model.state.repaired, ['bread']);
  assert.equal(model.state.pricePressure, 2);
});

test('all three supply repairs complete only through wash and paint transfer', () => {
  const model = createPaintedCountryInflationModel();
  for (const good of ['bread', 'medicine', 'timber']) {
    fill(model, 'wash', `ink-${good}`);
    fill(model, 'paint', `note-${good}`);
  }
  model.update(2);
  for (const good of ['bread', 'medicine', 'timber']) {
    fill(model, 'wash', `note-${good}`);
    fill(model, 'paint', `repair-${good}`);
  }
  assert.equal(model.state.complete, true);
  assert.equal(model.state.phase, 'complete');
  assert.equal(model.state.pricePressure, 0);
  assert.deepEqual(model.state.repaired, ['bread', 'medicine', 'timber']);
});
