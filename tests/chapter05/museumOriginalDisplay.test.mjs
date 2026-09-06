import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { FINAL_BOSS_ARCHIVE_ASSETS } from '../../src/chapters/museum3d/assets/FinalBossPaperAssetLoader.js';
import { CENTRAL_JOURNEY_ITEMS, CENTRAL_JOURNEY_SAFE_LAYOUT } from '../../src/chapters/museum3d/assets/CentralJourneyDisplay.js';

const readSource = (path) => readFile(new URL(path, new URL('../../', import.meta.url)), 'utf8');

test('the central plinth uses exactly two final-boss assets from different chapters', async () => {
  assert.deepEqual(Object.keys(FINAL_BOSS_ARCHIVE_ASSETS).sort(), [
    'chapter01-night-service-train',
    'chapter04-indigo-pigment',
  ]);
  assert.deepEqual(
    [...new Set(Object.values(FINAL_BOSS_ARCHIVE_ASSETS).map(({ sourceChapter }) => sourceChapter))].sort(),
    ['chapter01', 'chapter04'],
  );
  for (const source of Object.values(FINAL_BOSS_ARCHIVE_ASSETS)) {
    assert.equal(source.sourceRuntime, 'final-boss-all-worlds-at-once');
    await readFile(fileURLToPath(source.url));
  }
});

test('the Museum preserves the final-boss paper treatment and locked reclassification', async () => {
  const loader = await readSource('src/chapters/museum3d/assets/FinalBossPaperAssetLoader.js');
  assert.match(loader, /new THREE\.PlaneGeometry\(width, height\)/);
  assert.match(loader, /map: texture/);
  assert.match(loader, /alphaMap: texture/);
  assert.doesNotMatch(loader, /CanvasTexture|ShapeGeometry|BoxGeometry|GLTFLoader/);

  const lobby = await readSource('src/chapters/museum3d/scenes/ServiceLobby.js');
  for (const id of Object.keys(FINAL_BOSS_ARCHIVE_ASSETS)) assert.match(lobby, new RegExp(`id: '${id}'`));
  assert.doesNotMatch(lobby, /chapter03-clock-tower|chapter03-reunion-fountain|chapter03-municipal-tram/);
  assert.match(lobby, /centralOriginalDisplay\.visible = variant === 'normal'/);
  assert.match(lobby, /INSPECT THE TWO-WORLD DISPLAY/);
});

test('the central journey display stays padded and mixes 2D, 3D, and motion media', () => {
  assert.equal(CENTRAL_JOURNEY_SAFE_LAYOUT.paddingRatio, 0.12);
  assert.ok(CENTRAL_JOURNEY_ITEMS.length >= 9);
  assert.deepEqual(
    [...new Set(CENTRAL_JOURNEY_ITEMS.map(({ medium }) => medium.replace('-original', '')))].sort(),
    ['2d', '3d', 'motion'],
  );
  for (const item of CENTRAL_JOURNEY_ITEMS) {
    assert.ok(item.x - item.halfX >= CENTRAL_JOURNEY_SAFE_LAYOUT.minX, `${item.id} crosses the left safe edge`);
    assert.ok(item.x + item.halfX <= CENTRAL_JOURNEY_SAFE_LAYOUT.maxX, `${item.id} crosses the right safe edge`);
    assert.ok(item.z - item.halfZ >= CENTRAL_JOURNEY_SAFE_LAYOUT.minZ, `${item.id} crosses the rear safe edge`);
    assert.ok(item.z + item.halfZ <= CENTRAL_JOURNEY_SAFE_LAYOUT.maxZ, `${item.id} crosses the front safe edge`);
  }
});

test('every paper and motion artifact lies flat in the museum vitrine', async () => {
  const supportingDisplay = await readSource('src/chapters/museum3d/assets/CentralJourneyDisplay.js');
  const lobby = await readSource('src/chapters/museum3d/scenes/ServiceLobby.js');
  assert.match(supportingDisplay, /mesh\.rotation\.x = -Math\.PI \/ 2/g);
  assert.doesNotMatch(supportingDisplay, /journey-archive-shelf/);
  assert.equal((lobby.match(/rotationX: -Math\.PI \/ 2/g) ?? []).length, 2);
  assert.doesNotMatch(lobby, /rotationY: -Math\.PI \/ 2,[\s\S]{0,100}chapter04-indigo-pigment/);
});
