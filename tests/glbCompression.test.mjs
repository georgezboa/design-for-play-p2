import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

// Contract for the shipped 3D assets (scripts/compress-glb.mjs): every GLB is
// Meshopt-compressed with WebP maps, every three.js GLTFLoader in the game can
// decode Meshopt, and the asset manifests record the shipped bytes.
const repoRoot = fileURLToPath(new URL('../', import.meta.url));

function walk(relativeRoot, accept) {
  const out = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      if (statSync(absolute).isDirectory()) visit(absolute);
      else if (accept(absolute)) out.push(path.relative(repoRoot, absolute).split(path.sep).join('/'));
    }
  };
  visit(path.join(repoRoot, relativeRoot));
  return out;
}

function glbJson(relativePath) {
  const bytes = readFileSync(path.join(repoRoot, relativePath));
  assert.equal(bytes.toString('utf8', 0, 4), 'glTF', `${relativePath} is a GLB`);
  return JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
}

const GLBS = walk('public', (file) => file.endsWith('.glb'));

describe('Shipped GLB compression', () => {
  it('ships every GLB Meshopt-compressed with WebP (no PNG/JPEG) textures', () => {
    assert.ok(GLBS.length >= 100, `expected the full GLB set, found ${GLBS.length}`);
    for (const file of GLBS) {
      const json = glbJson(file);
      assert.ok(json.extensionsRequired?.includes('EXT_meshopt_compression'), `${file} must use EXT_meshopt_compression`);
      for (const image of json.images ?? []) {
        assert.equal(image.mimeType, 'image/webp', `${file} still embeds ${image.mimeType}`);
      }
      if (json.images?.length) assert.ok(json.extensionsUsed.includes('EXT_texture_webp'), `${file} must declare EXT_texture_webp`);
    }
  });

  it('keeps the shared rigs and the animation library animated and skinned', () => {
    const rigs = GLBS.filter((file) => /characters\/.*_shared_rig\.glb$/.test(file));
    assert.equal(rigs.length, 7);
    for (const file of [...rigs, 'public/assets/chapter03-3d/animations/quaternius_ual1_standard.glb']) {
      const json = glbJson(file);
      assert.equal(json.skins?.length, 1, `${file} skin`);
      assert.equal(json.skins[0].joints.length, 53, `${file} joints`);
      assert.ok(json.animations?.length >= 6, `${file} clips`);
    }
  });

  it('gives every three.js GLTFLoader in the game a Meshopt decoder', () => {
    const sources = walk('src', (file) => file.endsWith('.js'));
    const loaders = sources.filter((file) => /new GLTFLoader\(/.test(readFileSync(path.join(repoRoot, file), 'utf8')));
    assert.ok(loaders.length >= 6, `expected the game's loaders, found ${loaders.join(', ')}`);
    for (const file of loaders) {
      const source = readFileSync(path.join(repoRoot, file), 'utf8');
      assert.match(source, /setMeshoptDecoder\(MeshoptDecoder\)/, `${file} must call setMeshoptDecoder`);
      assert.match(source, /import \{ MeshoptDecoder \} from 'three\/(examples\/jsm|addons)\/libs\/meshopt_decoder\.module\.js'/,
        `${file} must import the bundled decoder (no CDN)`);
    }
  });

  it('records each compressed file with its shipped size and hash', () => {
    for (const [prefix, manifest] of [
      ['public/assets/chapter03-3d/', 'public/assets/chapter03-3d/ASSET_MANIFEST.json'],
      ['public/museum3d/', 'public/museum3d/ASSET_MANIFEST.json'],
    ]) {
      const record = JSON.parse(readFileSync(path.join(repoRoot, manifest), 'utf8')).runtimeCompression;
      assert.equal(record.script, 'scripts/compress-glb.mjs');
      for (const entry of record.files) {
        const bytes = readFileSync(path.join(repoRoot, prefix, entry.file));
        assert.equal(bytes.length, entry.bytesAfter, `${entry.file} size`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256After, `${entry.file} hash`);
        assert.ok(entry.bytesAfter < entry.bytesBefore, `${entry.file} got smaller`);
      }
    }
  });
});
