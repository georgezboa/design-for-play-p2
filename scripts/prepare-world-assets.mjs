import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const configPath = path.join(projectRoot, 'src/worlds/world-assets.json');
const sourceDir = path.join(projectRoot, 'src/assets');
const outputDir = path.join(projectRoot, 'src/assets/generated/worlds');
const manifestPath = path.join(outputDir, 'manifest.generated.json');
const checkOnly = process.argv.includes('--check');

function fail(message) {
  throw new Error(`[world-assets] ${message}`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function hashFile(filePath) {
  const hash = createHash('sha256');
  hash.update(await fs.readFile(filePath));
  return hash.digest('hex');
}

async function validateConfig(config) {
  if (config.schemaVersion !== 1) fail(`Unsupported schema version: ${config.schemaVersion}`);
  if (!Number.isInteger(config.maxTextureWidth) || config.maxTextureWidth > 4096) {
    fail('maxTextureWidth must be an integer no larger than 4096');
  }
  if (!Number.isInteger(config.chunkOverlap) || config.chunkOverlap < 0) {
    fail('chunkOverlap must be a non-negative integer');
  }
  if (config.chunkOverlap >= config.maxTextureWidth) {
    fail('chunkOverlap must be smaller than maxTextureWidth');
  }

  const ids = new Set();
  const textureKeys = new Set();
  for (const asset of config.assets) {
    if (!asset.id || ids.has(asset.id)) fail(`Duplicate or missing asset id: ${asset.id}`);
    ids.add(asset.id);
    if (!asset.sourceFile || !asset.textureKeys?.length) fail(`Incomplete asset entry: ${asset.id}`);
    for (const key of asset.textureKeys) {
      if (textureKeys.has(key)) fail(`Duplicate texture key: ${key}`);
      textureKeys.add(key);
    }
  }
}

async function prepare(config) {
  const tempDir = `${outputDir}.tmp-${process.pid}`;
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });

  const generated = {
    schemaVersion: config.schemaVersion,
    maxTextureWidth: config.maxTextureWidth,
    chunkOverlap: config.chunkOverlap,
    encoding: { format: 'jpeg', quality: config.jpegQuality },
    assets: [],
  };

  for (const asset of config.assets) {
    const sourcePath = path.join(sourceDir, asset.sourceFile);
    const metadata = await sharp(sourcePath).metadata();
    if (!metadata.width || !metadata.height) fail(`Cannot read dimensions for ${asset.sourceFile}`);

    const assetDir = path.join(tempDir, asset.id);
    await fs.mkdir(assetDir, { recursive: true });
    const chunks = [];
    const step = config.maxTextureWidth - config.chunkOverlap;

    for (let left = 0, index = 0; left < metadata.width; left += step, index += 1) {
      const width = Math.min(config.maxTextureWidth, metadata.width - left);
      const file = `${asset.id}/chunk-${String(index).padStart(2, '0')}.jpg`;
      const outputPath = path.join(tempDir, file);

      await sharp(sourcePath)
        .extract({ left, top: 0, width, height: metadata.height })
        .jpeg({
          quality: config.jpegQuality,
          chromaSubsampling: '4:4:4',
          mozjpeg: true,
          progressive: true,
        })
        .toFile(outputPath);

      chunks.push({
        file,
        x: left,
        width,
        height: metadata.height,
        bytes: (await fs.stat(outputPath)).size,
      });
    }

    generated.assets.push({
      id: asset.id,
      sourceFile: asset.sourceFile,
      sourceSha256: await hashFile(sourcePath),
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      textureKeys: asset.textureKeys,
      chunks,
    });
  }

  await fs.writeFile(
    path.join(tempDir, 'manifest.generated.json'),
    `${JSON.stringify(generated, null, 2)}\n`,
  );
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(outputDir), { recursive: true });
  await fs.rename(tempDir, outputDir);

  const sourceBytes = (
    await Promise.all(config.assets.map((asset) => fs.stat(path.join(sourceDir, asset.sourceFile))))
  ).reduce((sum, stat) => sum + stat.size, 0);
  const outputBytes = generated.assets.flatMap((asset) => asset.chunks).reduce((sum, chunk) => sum + chunk.bytes, 0);
  console.log(
    `[world-assets] prepared ${generated.assets.length} unique panoramas / ${generated.assets.flatMap((asset) => asset.chunks).length} safe textures`,
  );
  console.log(
    `[world-assets] ${(sourceBytes / 1024 / 1024).toFixed(1)} MiB source -> ${(outputBytes / 1024 / 1024).toFixed(1)} MiB game assets`,
  );
}

async function check(config) {
  const generated = await readJson(manifestPath).catch(() =>
    fail('Generated manifest is missing. Run `npm run assets:prepare`.'),
  );
  if (generated.schemaVersion !== config.schemaVersion) fail('Generated manifest schema is stale');

  const expected = new Map(config.assets.map((asset) => [asset.id, asset]));
  if (generated.assets.length !== expected.size) fail('Generated asset count does not match source config');

  for (const asset of generated.assets) {
    const source = expected.get(asset.id);
    if (!source) fail(`Unexpected generated asset: ${asset.id}`);
    if (source.sourceFile !== asset.sourceFile) fail(`Source changed for ${asset.id}; regenerate assets`);
    if (JSON.stringify(source.textureKeys) !== JSON.stringify(asset.textureKeys)) {
      fail(`Texture aliases changed for ${asset.id}; regenerate assets`);
    }
    const sourcePath = path.join(sourceDir, source.sourceFile);
    if ((await hashFile(sourcePath)) !== asset.sourceSha256) {
      fail(`Source image changed for ${asset.id}; run \`npm run assets:prepare\``);
    }

    for (const chunk of asset.chunks) {
      const chunkPath = path.join(outputDir, chunk.file);
      const metadata = await sharp(chunkPath).metadata().catch(() =>
        fail(`Missing or unreadable generated texture: ${chunk.file}`),
      );
      if (metadata.width !== chunk.width || metadata.height !== chunk.height) {
        fail(`Dimension mismatch for ${chunk.file}`);
      }
      if (metadata.width > config.maxTextureWidth) fail(`Unsafe texture width in ${chunk.file}`);
    }
  }

  console.log(
    `[world-assets] verified ${generated.assets.length} panoramas and ${generated.assets.flatMap((asset) => asset.chunks).length} textures`,
  );
}

const config = await readJson(configPath);
await validateConfig(config);
if (checkOnly) await check(config);
else await prepare(config);
