import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_TILE_BAND_CHUNK, addTileBand, chunkTilePositionX, tileBandChunks } from '../../src/chapters/borrowedLight/art/tileBand.js';
import { WORLD } from '../../src/chapters/borrowedLight/level.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('a level-wide mist band is cut into chunks no wider than a GPU texture', () => {
  const width = WORLD.width + 1200;
  const chunks = tileBandChunks(width);
  assert.ok(chunks.every((chunk) => chunk.width > 0 && chunk.width <= MAX_TILE_BAND_CHUNK));
  assert.equal(MAX_TILE_BAND_CHUNK, 4096);
  assert.equal(chunks.reduce((sum, chunk) => sum + chunk.width, 0), width, 'no gap, no overlap');
  chunks.forEach((chunk, index) => assert.equal(chunk.offset, index ? chunks[index - 1].offset + chunks[index - 1].width : 0));
  assert.deepEqual(tileBandChunks(300), [{ offset: 0, width: 300 }]);
  assert.deepEqual(tileBandChunks(0), []);
});

test('each chunk continues the pattern where the previous one ended', () => {
  // With tile scale 1.6, a chunk 4096 px in starts 2560 texture px along.
  assert.equal(chunkTilePositionX(0, 4096, 1.6), 2560);
  assert.equal(chunkTilePositionX(10, 4096, 2), 2058);
  assert.equal(chunkTilePositionX(-5, 0, 2.2), -5);
});

function fakeScene() {
  const made = [];
  return {
    made,
    add: {
      tileSprite(x, y, width, height, key) {
        const sprite = {
          x, y, width, height, key, tilePositionX: 0, tilePositionY: 0, tileScaleX: 1, tileScaleY: 1, depth: 0, alpha: 1,
          setOrigin() { return sprite; },
          setTileScale(sx, sy) { sprite.tileScaleX = sx; sprite.tileScaleY = sy; return sprite; },
          setDepth(d) { sprite.depth = d; return sprite; },
          setAlpha(a) { sprite.alpha = a; return sprite; },
        };
        made.push(sprite);
        return sprite;
      },
    },
  };
}

test('the band drives every chunk like one TileSprite', () => {
  const scene = fakeScene();
  const band = addTileBand(scene, -600, 900, WORLD.width + 1200, 512, 'bl-fog').setDepth(16).setAlpha(0.8).setTileScale(1.6, 2);
  assert.equal(scene.made.length, Math.ceil((WORLD.width + 1200) / 4096));
  assert.ok(scene.made.every((sprite) => sprite.width <= 4096 && sprite.height === 512 && sprite.depth === 16 && sprite.alpha === 0.8));
  assert.deepEqual(scene.made.map((sprite) => sprite.x), tileBandChunks(WORLD.width + 1200).map(({ offset }) => -600 + offset));
  band.tilePositionX = 140;
  assert.equal(band.tilePositionX, 140);
  scene.made.forEach((sprite, index) => {
    assert.equal(sprite.tileScaleX, 1.6);
    assert.equal(sprite.tileScaleY, 2);
    assert.equal(sprite.tilePositionX, 140 + (index * 4096) / 1.6);
  });
});

test('Borrowed Light builds its mist from tile bands and a seamless fog tile', () => {
  const art = read('src/chapters/borrowedLight/art/worldArt.js');
  assert.match(art, /const mistBack = addTileBand\(scene, -600, WORLD\.mistY - 180, WORLD\.width \+ 1200, 512, 'bl-fog'\)/);
  assert.match(art, /const mistFront = addTileBand\(scene, -600, WORLD\.mistY \+ 10, WORLD\.width \+ 1200, 460, 'bl-fog'\)/);
  assert.doesNotMatch(art, /tileSprite\([^)]*WORLD\.width/);
  assert.match(read('src/chapters/borrowedLight/art/paint.js'), /const alpha = \[r\(\), r\(\), r\(\)\]\[1\];/);
});
