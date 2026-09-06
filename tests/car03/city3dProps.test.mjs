import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { CITY_MODELS, PERIMETER_MODEL_SOURCES } from '../../src/cars/presentCity3d/city3dConfig.js';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EXPECTED_PROP_IDS = [
  'queue-dispenser',
  'produce-scale',
  'porter-handcart',
  'receipt-device',
  'queue-stanchion',
  'clerk-stamp-machine',
  'crosswalk-signal',
  'fountain-bench',
  'pa-speaker',
  'night-ticket-reader',
];

describe('Chapter 3 real-time narrative prop contract', () => {
  it('registers ten semantic props alongside the landmarks and transit architecture', () => {
    const props = CITY_MODELS.filter((spec) => spec.category === 'prop');
    const unique = [...CITY_MODELS.filter((spec) => !spec.cloneOf), ...PERIMETER_MODEL_SOURCES];
    assert.equal(props.length, 10);
    assert.equal(unique.length, 30);
    assert.deepEqual(props.map((spec) => spec.id), EXPECTED_PROP_IDS);
    for (const spec of props) {
      assert.ok(spec.role, `${spec.id} must name its narrative role`);
      assert.equal(spec.alignToGround, true, `${spec.id} must use geometry-bound placement`);
    }
  });

  it('ships the generated street dressing once and reuses it across the district', async () => {
    const streetDressing = CITY_MODELS.filter((spec) => (
      ['street-dressing', 'street-litter', 'boundary-vehicle'].includes(spec.category)
    ));
    assert.equal(streetDressing.filter((spec) => spec.id.startsWith('crushed-trash-can-')).length, 40);
    assert.equal(streetDressing.filter((spec) => spec.id.startsWith('abandoned-car-')).length, 4);
    assert.ok(streetDressing
      .filter((spec) => spec.id.startsWith('crushed-trash-can-'))
      .every((spec) => spec.scale <= 0.13));
    assert.ok(streetDressing.some((spec) => spec.id === 'street-campfire'));
    const uniqueFiles = [...new Set(streetDressing.map((spec) => spec.file))];
    assert.deepEqual(uniqueFiles.sort(), [
      'ch03_abandoned_compact_car.glb',
      'ch03_crushed_trash_can.glb',
      'ch03_street_campfire.glb',
    ]);
    for (const file of uniqueFiles) {
      const info = await stat(`${PROJECT_ROOT}public/assets/chapter03-3d/models/${file}`);
      assert.ok(info.size > 500_000, `${file} should retain its embedded PBR detail`);
      assert.ok(info.size < 3_100_000, `${file} exceeds its street-dressing ceiling`);
    }
  });

  it('ships dedicated optimized station and tunnel GLBs', async () => {
    const architecture = CITY_MODELS.filter((spec) => spec.category === 'transit-architecture');
    assert.deepEqual(architecture.map((spec) => spec.id), ['open-air-station', 'tram-tunnel-portal']);
    for (const spec of architecture) {
      const path = `${PROJECT_ROOT}public/assets/chapter03-3d/models/${spec.file}`;
      const info = await stat(path);
      assert.ok(info.size > 250_000, `${spec.file} should retain embedded PBR detail`);
      assert.ok(info.size < 2_500_000, `${spec.file} exceeds the 2.5 MB architecture ceiling`);
    }
  });

  it('ships eight optimized district GLBs under tiered runtime ceilings', async () => {
    for (const spec of PERIMETER_MODEL_SOURCES) {
      const path = `${PROJECT_ROOT}public/assets/chapter03-3d/models/${spec.file}`;
      const info = await stat(path);
      assert.ok(info.size > 1_000_000, `${spec.file} should retain embedded PBR detail`);
      const isLandmark = spec.id.startsWith('landmark-');
      const ceiling = isLandmark ? 3_000_000 : 1_900_000;
      assert.ok(info.size < ceiling, `${spec.file} exceeds its district-building ceiling`);
    }
  });

  it('ships every optimized GLB below the runtime size ceiling', async () => {
    const props = CITY_MODELS.filter((spec) => spec.category === 'prop');
    for (const spec of props) {
      const path = `${PROJECT_ROOT}public/assets/chapter03-3d/models/${spec.file}`;
      const info = await stat(path);
      assert.ok(info.size > 100_000, `${spec.file} should be a real embedded model`);
      assert.ok(info.size < 1_100_000, `${spec.file} exceeds the 1.1 MB prop ceiling`);
    }
  });

  it('keeps ground furniture collidable while mounted audio stays overhead', () => {
    const props = CITY_MODELS.filter((spec) => spec.category === 'prop');
    const collidable = props.filter((spec) => spec.collision).map((spec) => spec.id);
    assert.deepEqual(collidable, EXPECTED_PROP_IDS.filter((id) => id !== 'pa-speaker'));
    const speaker = props.find((spec) => spec.id === 'pa-speaker');
    assert.equal(speaker.support?.type, 'pole');
    assert.ok(speaker.position[1] > 4);
  });
});
