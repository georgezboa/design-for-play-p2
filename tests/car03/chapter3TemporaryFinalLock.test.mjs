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

describe('Chapter 3 integrated final lock v39', () => {
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
    // v39 (alpha round 1 fix round, engineer F2, 2026-09-30): reopened for
    // the alpha issues. Frame time follows the wall clock (substeps ≤ 0.1 s)
    // and captions read on it; a LOW quality tier (+chapter3Quality.js) and
    // off-screen rig culling; scanners walk in step on a held E with a lane
    // arrow; one clamp tag with a grab halo and miss feedback; PUNCH BOTH is
    // a button; one prompt on the claim card; the gate label fits; Mara's
    // scarf is rose; a Butch marker; the finale camera holds at the
    // platform; and the length pass (no caption run over five lines, no
    // queue number, briefing, guided walk or hotel corridor; departure and
    // Lev's walks no longer hold Butch; double-click / Shift runs).
    // Toma's composition (above) is unchanged. Files: +1 (chapter3Quality):
    // 25 -> 26.
    // v38 (release/1.0 Echo City pass, 2026-09-28, George's review): reopened
    // for gameplay. Lev's theory rounds became the Ticket 43 board (lens,
    // stack, one punch: VENN is VELEZ); "walk beside" was added at the market
    // and station scanners; the wire became a drag into the clamp on the next
    // train bell; the fire letters were restyled; the hotel guests, alley
    // men, campfire chatter, sunrise climb, inner voices, archive interior,
    // flip clock and legacy ending runtime were cut; captions, tags and cards
    // use the shared UI kit; interiors and late cast stream in after start.
    // Files: -5 (Chapter3ArchiveHall, Chapter3EndingRuntime, Chapter3FlipClock,
    // chapter3EndingModel, chapter3FinalContent) +6 (Chapter3BellClamp,
    // Chapter3Caption, Chapter3ScannerField, Chapter3TicketBoard,
    // chapter3SceneBuilders, chapter3WalkBesideModel): 24 -> 25.
    // v37 note kept: QA routes/hooks are dev-only (DEV_MODE), Escape opens the
    // shared pause menu, REDUCE MOTION and TEXT SIZE are honoured.
    // v40: chapter3Quality pins the LOW tier when the shared Settings
    // checkbox LOW GRAPHICS · SLOWER COMPUTERS is on (alpha round 1, F2/F3).
    assert.equal(sourceFiles.length, 26);
    assert.equal(
      aggregateSignature(sourceFiles),
      '1c4111c322eeb57b81a4ab44d2c7beab08d99d35bc7cb6cc885d28b8b4490006',
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
