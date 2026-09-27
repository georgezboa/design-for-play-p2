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

describe('Chapter 3 integrated final lock v37', () => {
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
    // Reopened once for the 1.0 release: the ?playtest= / ?dev= / ?focus= /
    // ?autowalk= / ?endingqa= QA routes and window QA hooks became dev-only
    // (DEV_MODE / devParams()), and car03-3d.html got its release <title> and
    // favicon. Gameplay itself is unchanged.
    assert.equal(
      aggregateSignature(sourceFiles),
      '39e18dcd81e2ab90eef20844128df87c9dc691d63bb5f3cd0dd3611c86ed2219',
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
    // v37 (release/1.0 asset pass, 2026-09-27): reopened for asset-only
    // changes with no runtime behaviour change — removed 4 unreferenced voice
    // OGGs, the unshipped worn-limestone-source.png, the superseded backdrops
    // and the stale music/ch3 "ASSET_MANIFEST 2.md" (759 -> 751 files);
    // scrubbed absolute paths from replacements/manifest.json; re-encoded
    // eight Chapter 3 MP3s to LAME V2 at identical loudness and length.
    assert.equal(assetFiles.length, 751);
    assert.equal(
      aggregateSignature(assetFiles),
      '0dc11e665a7b3cbeef55d562490ec38aa690499bf1f47e3f8370b4cf9b4bd1e8',
      'Chapter 3 assets are locked. Reopen it explicitly and create a new lock version before changing assets.',
    );
  });
});
