import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CHAPTER5_SCORE } from '../../src/chapters/museum3d/chapter05Score.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = (path) => readFile(new URL(path, new URL('../../', import.meta.url)), 'utf8');

test('the Museum score begins audibly in the front hall and continues into the corridor', async () => {
  assert.equal(CHAPTER5_SCORE.lobby.id, CHAPTER5_SCORE.corridor.id);
  assert.equal(CHAPTER5_SCORE.lobby.src, CHAPTER5_SCORE.corridor.src);
  assert.ok(CHAPTER5_SCORE.lobby.volume >= 0.4);
  assert.ok(CHAPTER5_SCORE.lobby.fade <= 1.2);
  await readFile(`${root}public${CHAPTER5_SCORE.lobby.src}`);

  const app = await source('src/chapters/museum3d/Museum3DApp.js');
  assert.match(app, /lockOverlay\.addEventListener\('click',[\s\S]*?this\._syncChapterScore\(\)/);

  const entry = await source('src/chapters/museum3d/museum3d-main.js');
  assert.match(entry, /from '\.\/Museum3DApp\.js'/);
  assert.doesNotMatch(entry, /Museum3DApp\.js\?v=/);
});

test('the Labyrinth owns an ambient exploration cue and exposes it to runtime QA', async () => {
  assert.match(CHAPTER5_SCORE.labyrinth.id, /labyrinth/);
  assert.match(CHAPTER5_SCORE.labyrinth.src, /5\.4_mussorgsky_catacombae\.mp3$/);
  await readFile(`${root}public${CHAPTER5_SCORE.labyrinth.src}`);

  const entry = await source('src/chapters/museum/labyrinth/labyrinth-main.js');
  assert.match(entry, /music\.play\(labyrinthScore\.id/);
  assert.match(entry, /music:\s*music\.qa\(\)/);
});

test('the shared score pauses and resumes with the global ESC menu', async () => {
  const director = await source('src/shared/musicDirector.js');
  assert.match(director, /addEventListener\('nightfall:pause'/);
  assert.match(director, /pausedForMenu = event\.detail\?\.paused === true/);
});
