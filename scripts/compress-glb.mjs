#!/usr/bin/env node
// Shrinks the shipped GLB files in public/ in place:
//   dedup + prune (names, leaves, attributes and extras kept) ->
//   PNG/JPEG textures to WebP (EXT_texture_webp), capped at a per-category
//   maximum size (never upscaled) ->
//   Meshopt geometry/animation compression (EXT_meshopt_compression with
//   KHR_mesh_quantization; positions 14 bit, normals 8 bit octahedral,
//   texcoords 12 bit; skins keep their bones, IBMs absorb the dequantize
//   transform; animations keep every keyframe).
//
// Files that already use EXT_meshopt_compression are skipped, so the script is
// idempotent and never re-encodes a lossy texture twice. Identical source
// files (the Chapter 3 models mirrored under public/museum3d/echo-city/...)
// are compressed once and written to every copy, so they stay byte-identical.
// The originals live in git history (release/1.0 before this commit).
//
// Every three.js GLTFLoader that reads these files must call
// loader.setMeshoptDecoder(MeshoptDecoder) (three/examples/jsm/libs/
// meshopt_decoder.module.js). WebP decodes natively in browsers and Electron.
//
// Usage:
//   node scripts/compress-glb.mjs                 # compress everything, write records
//   node scripts/compress-glb.mjs --dry-run       # report what would change
//   node scripts/compress-glb.mjs --only lev_     # only paths containing "lev_"
//   node scripts/compress-glb.mjs --root <repo>   # operate on another checkout
//
// Dev dependencies: @gltf-transform/core, @gltf-transform/extensions,
// @gltf-transform/functions, meshoptimizer, sharp.

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const args = process.argv.slice(2);
function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}
const dryRun = args.includes('--dry-run');
const only = argValue('--only');
const projectRoot = path.resolve(argValue('--root')
  ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const publicDir = path.join(projectRoot, 'public');

export const COMPRESSION_PROFILE = Object.freeze({
  tool: '@gltf-transform 4 + meshoptimizer + sharp (scripts/compress-glb.mjs)',
  geometry: 'EXT_meshopt_compression (level high: KHR_mesh_quantization, position 14 bit, normal 8 bit, texcoord 12 bit)',
  textures: 'EXT_texture_webp, lossy, smart chroma subsampling, effort 6, alpha lossless; near-lossless or lossless when lossy cannot reach minPsnr',
  webpQuality: { baseColor: 88, normal: 90, data: 90, other: 88 },
  // Raise quality along this ladder until a texture is >= minPsnr dB of its source.
  qualityLadder: [92, 95, 98],
  minPsnr: 40,
  maxTextureSize: { hero: 2048, prop: 1024 },
});

// Hero characters, environments, interiors and buildings may keep up to 2048;
// hand props and museum exhibits are capped at 1024.
function maxTextureSizeFor(relativePath) {
  if (/\/(characters|animations)\//.test(relativePath)) return COMPRESSION_PROFILE.maxTextureSize.hero;
  if (/\/replacements\/env-/.test(relativePath)) return COMPRESSION_PROFILE.maxTextureSize.hero;
  if (/(landmark|perimeter|shop_|station|tunnel|tenement|archive_web|ministry_web|tower_web|tram_web|stall_web|fountain_web|cliff|compact_car)/.test(relativePath)) {
    return COMPRESSION_PROFILE.maxTextureSize.hero;
  }
  return COMPRESSION_PROFILE.maxTextureSize.prop;
}

async function listGlbs(directory) {
  const out = [];
  for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...await listGlbs(absolute));
    else if (entry.name.endsWith('.glb') && !/ \d+\.glb$/.test(entry.name)) out.push(absolute);
  }
  return out;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function glbJson(buffer) {
  const length = buffer.readUInt32LE(12);
  return JSON.parse(buffer.toString('utf8', 20, 20 + length));
}

// Which material slot a texture feeds decides its WebP quality.
function textureRoles(document) {
  const roles = new Map();
  const add = (texture, role) => {
    if (!texture) return;
    if (!roles.has(texture)) roles.set(texture, new Set());
    roles.get(texture).add(role);
  };
  for (const material of document.getRoot().listMaterials()) {
    add(material.getBaseColorTexture(), 'baseColor');
    add(material.getEmissiveTexture(), 'baseColor');
    add(material.getNormalTexture(), 'normal');
    add(material.getMetallicRoughnessTexture(), 'data');
    add(material.getOcclusionTexture(), 'data');
    for (const extension of material.listExtensions()) {
      for (const property of Object.getOwnPropertyNames(Object.getPrototypeOf(extension))) {
        if (!/^get\w*Texture$/.test(property)) continue;
        try { add(extension[property](), 'data'); } catch { /* not a texture getter */ }
      }
    }
  }
  return roles;
}

function qualityFor(roles) {
  const q = COMPRESSION_PROFILE.webpQuality;
  if (!roles || roles.size === 0) return q.other;
  return Math.max(...[...roles].map((role) => q[role] ?? q.other));
}

async function psnr(originalBuffer, encodedBuffer, width, height) {
  const [a, b] = await Promise.all([
    sharp(originalBuffer).resize(width, height, { fit: 'fill' }).ensureAlpha().raw().toBuffer(),
    sharp(encodedBuffer).ensureAlpha().raw().toBuffer(),
  ]);
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  const mse = sum / a.length;
  return mse === 0 ? 99 : Number((10 * Math.log10((255 * 255) / mse)).toFixed(1));
}

async function compressTextures(document, maxSize) {
  const roles = textureRoles(document);
  const records = [];
  let converted = 0;
  for (const texture of document.getRoot().listTextures()) {
    const mime = texture.getMimeType();
    const image = texture.getImage();
    if (!image || !/^image\/(png|jpeg)$/.test(mime)) {
      records.push({ name: texture.getName(), kept: mime });
      continue;
    }
    const metadata = await sharp(image).metadata();
    const scale = Math.min(1, maxSize / Math.max(metadata.width, metadata.height));
    const width = Math.max(1, Math.round(metadata.width * scale));
    const height = Math.max(1, Math.round(metadata.height * scale));
    // Start at the slot's quality and step up until the texture is within
    // the PSNR floor of its source (busy 512 px interior maps need more).
    let quality = qualityFor(roles.get(texture));
    let encoded;
    let score;
    for (;;) {
      let pipeline = sharp(image);
      if (scale < 1) pipeline = pipeline.resize(width, height, { kernel: 'lanczos3' });
      encoded = await pipeline.webp({ quality, alphaQuality: 100, smartSubsample: true, effort: 6 }).toBuffer();
      score = await psnr(image, encoded, width, height);
      const next = COMPRESSION_PROFILE.qualityLadder.find((step) => step > quality);
      if (score >= COMPRESSION_PROFILE.minPsnr || !next) break;
      quality = next;
    }
    // Lossy WebP is always 4:2:0, so a packed data map (roughness in G,
    // metalness in B) with busy detail can stay under the floor at any
    // quality. Those go near-lossless, then lossless.
    for (const fallback of [{ nearLossless: true, quality: 60 }, { lossless: true }]) {
      if (score >= COMPRESSION_PROFILE.minPsnr) break;
      let pipeline = sharp(image);
      if (scale < 1) pipeline = pipeline.resize(width, height, { kernel: 'lanczos3' });
      encoded = await pipeline.webp({ ...fallback, effort: 6 }).toBuffer();
      score = await psnr(image, encoded, width, height);
      quality = fallback.lossless ? 'lossless' : 'near-lossless';
    }
    records.push({
      name: texture.getName(),
      role: [...(roles.get(texture) ?? ['other'])].join('+'),
      from: `${mime.split('/')[1]} ${metadata.width}x${metadata.height} ${image.byteLength}`,
      to: `webp ${width}x${height} ${typeof quality === 'number' ? `q${quality}` : quality} ${encoded.byteLength}`,
      psnr: score,
    });
    texture.setImage(new Uint8Array(encoded)).setMimeType('image/webp');
    if (texture.getURI()) texture.setURI(texture.getURI().replace(/\.(png|jpe?g)$/i, '.webp'));
    converted += 1;
  }
  if (converted) document.createExtension(EXTTextureWebP).setRequired(true);
  return records;
}

function documentStats(document) {
  const root = document.getRoot();
  let triangles = 0;
  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      triangles += (indices ? indices.getCount() : primitive.getAttribute('POSITION').getCount()) / 3;
    }
  }
  return {
    triangles,
    skins: root.listSkins().map((skin) => skin.listJoints().length),
    animations: root.listAnimations().map((animation) => `${animation.getName()}:${animation.listChannels().length}`),
    morphTargets: root.listMeshes().reduce((n, mesh) => n + mesh.listPrimitives().reduce((m, p) => m + p.listTargets().length, 0), 0),
    nodes: root.listNodes().map((node) => node.getName()).filter(Boolean).sort(),
  };
}

function sameStructure(before, after) {
  const problems = [];
  if (before.triangles !== after.triangles) problems.push(`triangles ${before.triangles} -> ${after.triangles}`);
  if (JSON.stringify(before.skins) !== JSON.stringify(after.skins)) problems.push('skin joints changed');
  if (JSON.stringify(before.animations) !== JSON.stringify(after.animations)) problems.push('animation clips/channels changed');
  if (before.morphTargets !== after.morphTargets) problems.push('morph targets changed');
  const afterNodes = new Set(after.nodes);
  const lost = before.nodes.filter((name) => !afterNodes.has(name));
  if (lost.length) problems.push(`named nodes lost: ${lost.slice(0, 5).join(', ')}`);
  return problems;
}

async function compressOne(io, buffer, relativePath) {
  const document = await io.readBinary(new Uint8Array(buffer));
  const before = documentStats(document);
  await document.transform(
    dedup({ keepUniqueNames: true }),
    prune({ keepLeaves: true, keepAttributes: true, keepIndices: true, keepSolidTextures: true, keepExtras: true }),
  );
  const textures = await compressTextures(document, maxTextureSizeFor(relativePath));
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  const output = Buffer.from(await io.writeBinary(document));
  const check = await io.readBinary(new Uint8Array(output));
  const problems = sameStructure(before, documentStats(check));
  if (problems.length) throw new Error(`${relativePath}: ${problems.join('; ')}`);
  return { output, textures, stats: before };
}

async function updateRecords(records) {
  const byTree = [
    { prefix: 'assets/chapter03-3d/', manifest: path.join(publicDir, 'assets/chapter03-3d/ASSET_MANIFEST.json') },
    { prefix: 'museum3d/', manifest: path.join(publicDir, 'museum3d/ASSET_MANIFEST.json') },
  ];
  for (const { prefix, manifest } of byTree) {
    const entries = records.filter((record) => record.file.startsWith(prefix));
    if (!entries.length) continue;
    let json = {};
    try { json = JSON.parse(await fs.readFile(manifest, 'utf8')); } catch { json = { tree: `public/${prefix}` }; }
    const previous = new Map((json.runtimeCompression?.files ?? []).map((entry) => [entry.file, entry]));
    for (const entry of entries) previous.set(entry.file, { ...entry, file: entry.file.slice(prefix.length) });
    const files = [...previous.values()].sort((a, b) => a.file.localeCompare(b.file));
    const bytesBefore = files.reduce((n, entry) => n + entry.bytesBefore, 0);
    const bytesAfter = files.reduce((n, entry) => n + entry.bytesAfter, 0);
    json.runtimeCompression = {
      script: 'scripts/compress-glb.mjs',
      profile: COMPRESSION_PROFILE,
      originals: 'git history: release/1.0 before the "Shrink the 3D assets" commit',
      totals: { files: files.length, bytesBefore, bytesAfter, saved: bytesBefore - bytesAfter },
      files,
    };
    await fs.writeFile(manifest, `${JSON.stringify(json, null, 2)}\n`);
  }

  // The replacement manifest records each shipped file's bytes and hash.
  const replacementManifest = path.join(publicDir, 'assets/chapter03-3d/replacements/manifest.json');
  const replacement = JSON.parse(await fs.readFile(replacementManifest, 'utf8'));
  let touched = false;
  for (const asset of replacement.assets ?? []) {
    const record = records.find((entry) => `public/${entry.file}` === asset.output);
    if (!record) continue;
    asset.preCompressionSha256 ??= asset.outputSha256;
    asset.preCompressionBytes ??= asset.outputBytes;
    asset.outputSha256 = record.sha256After;
    asset.outputBytes = record.bytesAfter;
    asset.compression = 'scripts/compress-glb.mjs (meshopt + webp)';
    touched = true;
  }
  if (touched) await fs.writeFile(replacementManifest, `${JSON.stringify(replacement, null, 2)}\n`);
}

async function main() {
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

  const files = (await listGlbs(publicDir)).filter((file) => !only || file.includes(only));
  const groups = new Map();
  for (const file of files) {
    const buffer = await fs.readFile(file);
    const json = glbJson(buffer);
    const relativePath = path.relative(publicDir, file).split(path.sep).join('/');
    if ((json.extensionsUsed ?? []).includes('EXT_meshopt_compression')) {
      console.log(`skip (already meshopt) ${relativePath}`);
      continue;
    }
    const hash = sha256(buffer);
    if (!groups.has(hash)) groups.set(hash, { buffer, paths: [] });
    groups.get(hash).paths.push(relativePath);
  }

  const records = [];
  let totalBefore = 0;
  let totalAfter = 0;
  for (const [hash, { buffer, paths }] of groups) {
    const { output, textures, stats } = await compressOne(io, buffer, paths[0]);
    const after = sha256(output);
    for (const relativePath of paths) {
      totalBefore += buffer.byteLength;
      totalAfter += output.byteLength;
      records.push({
        file: relativePath,
        bytesBefore: buffer.byteLength,
        bytesAfter: output.byteLength,
        sha256Before: hash,
        sha256After: after,
        triangles: stats.triangles,
        skinJoints: stats.skins[0] ?? 0,
        animations: stats.animations.length,
        textures,
      });
      if (!dryRun) await fs.writeFile(path.join(publicDir, relativePath), output);
      const psnrs = textures.filter((t) => t.psnr).map((t) => `${t.role} ${t.psnr}dB`).join(', ');
      console.log(`${(buffer.byteLength / 1048576).toFixed(2).padStart(6)} MB -> ${(output.byteLength / 1048576).toFixed(2).padStart(6)} MB  ${relativePath}${psnrs ? `  [${psnrs}]` : ''}`);
    }
  }
  console.log(`total ${(totalBefore / 1048576).toFixed(1)} MB -> ${(totalAfter / 1048576).toFixed(1)} MB (saved ${((totalBefore - totalAfter) / 1048576).toFixed(1)} MB) in ${records.length} files`);
  if (!dryRun && records.length) await updateRecords(records);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
