import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import path from 'node:path';

import { OPENING_POSITIONS } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

function filesBelow(relativeRoot, accept = () => true) {
  const root = path.join(repoRoot, relativeRoot);
  const entries = [];
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const stat = statSync(absolute);
      if (stat.isDirectory()) visit(absolute);
      else if (accept(absolute)) entries.push(path.relative(repoRoot, absolute));
    }
  }
  visit(root);
  return entries;
}

function aggregateSignature(files) {
  const manifest = files.map((relativePath) => {
    const digest = createHash('sha256')
      .update(readFileSync(path.join(repoRoot, relativePath)))
      .digest('hex');
    return `${digest}  ${relativePath}`;
  }).join('\n');
  return createHash('sha256').update(`${manifest}\n`).digest('hex');
}

describe('Chapter 3 integrated final lock v35', () => {
  it('preserves the George-approved final Toma composition', () => {
    assert.deepEqual(OPENING_POSITIONS.toma, [37.68, 0.5, -15.87]);
    assert.deepEqual(OPENING_POSITIONS.transportApproach, [37.68, 0.5, -14.35]);
    assert.deepEqual(OPENING_POSITIONS.levTransportExterior, [36.6, 0.5, -14.35]);
  });

  it('preserves the complete temporary-final Chapter 3 runtime source', () => {
    const sourceFiles = [
      'car03-3d.html',
      'src/car03-3d-main.js',
      ...filesBelow('src/cars/presentCity3d', (file) => /\.(?:js|png)$/.test(file)),
    ];
    assert.equal(sourceFiles.length, 24);
    assert.equal(
      aggregateSignature(sourceFiles),
      '7bc15af8d38739425ef7e086f65e5cbb08b72907d196d6062d94bf601ad57b1d',
      'Chapter 3 is locked. Reopen it explicitly and create a new lock version before changing runtime source.',
    );
  });

  it('preserves the complete temporary-final Chapter 3 runtime asset set', () => {
    const assetFiles = [
      // Ignore local iCloud conflict copies ("name 2.ext"); they are not
      // tracked runtime assets and must not invalidate the release lock.
      ...filesBelow('public/assets/chapter03-3d', (file) => !/ \d+\.[^/]+$/.test(file)),
      ...filesBelow('public/assets/music/ch3'),
    ];
    assert.equal(assetFiles.length, 759);
    assert.equal(
      aggregateSignature(assetFiles),
      'be4c754b243e8296c7c8b12acd7121a1607f0ef1a97d62fc53a16a3d8f0e0e77',
      'Chapter 3 assets are locked. Reopen it explicitly and create a new lock version before changing assets.',
    );
  });
});
