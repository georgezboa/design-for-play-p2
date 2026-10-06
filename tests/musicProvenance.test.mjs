import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

// Every music recording that ships has a source and licence on record
// (2026-10-06: the last seven uncleared cues were matched or replaced).
test('every shipped music file is named in its folder manifest or the credits register', () => {
  const credits = readFileSync(join(root, 'public/CREDITS.md'), 'utf8');
  const music = [...walk(join(root, 'public/assets/music')), ...walk(join(root, 'public/assets/black-knife/audio'))]
    .filter((file) => /\.(mp3|ogg|m4a|wav)$/i.test(file));
  assert.ok(music.length >= 20);
  for (const file of music) {
    const manifest = join(dirname(file), 'ASSET_MANIFEST.md');
    const record = (existsSync(manifest) ? readFileSync(manifest, 'utf8') : '') + credits;
    assert.ok(record.includes(basename(file)), `${relative(root, file)} has no provenance record`);
    if (existsSync(manifest)) assert.doesNotMatch(readFileSync(manifest, 'utf8'), /Not cleared for public release|replace before public release/i, manifest);
  }
  assert.doesNotMatch(credits, /unresolved provenance|do not record the provider/i);
});

test('the synthetic voices name their provider', () => {
  for (const path of ['public/assets/chapter03-3d/voice/ch03/manifest.json', 'public/museum3d/voice/ch05/manifest.json']) {
    assert.equal(JSON.parse(readFileSync(join(root, path), 'utf8')).provider, 'ElevenLabs', path);
  }
});
