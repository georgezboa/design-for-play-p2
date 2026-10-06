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

describe('Chapter 3 integrated final lock v46', () => {
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
    // v41 (alpha round 2, engineer G2, 2026-09-30): objective tags show near Butch and along the oil line, HOLD TAB after 20 s idle; ministry directions match the map, "twice" only after two passes, beacons at Toma and Eda; clamp near-misses never walk; LOWEST tier; QA starts chapter3-oil / chapter3-ministry. Files: +1 (chapter3Guidance): 26 -> 27.
    // v42 (round 3 owner feedback "Ch3 lost logic when parts were cut",
    // engineer H3, 2026-10-01): reopened for the logic pass G1–G15. Set-ups
    // restored (seven o'clock train, "another mark", the two fire rows,
    // Petar's C-441 work order at dusk, the repair line, the oil line as the
    // first row, the dawn time jump and bench lines, Hana's greeting, the
    // rose scarf, Rada); HUD objectives move to CHAPTER3_OBJECTIVES and name
    // only what has been told; Sava has a hover tag; the dusk fire smokes
    // from a distance; dead hotel door interactions removed. Art: amber lamp
    // globes with halo and light pool (setLampGlow by clock), road setts on
    // the full-contrast limestone, a tight rim on Butch, street camera
    // 3.6 -> 4.0. Toma's composition unchanged. Files: 27 -> 27.
    // v43 (alpha round 3 follow-ups, engineer L1, 2026-10-01): every walk
    // objective has a compass tag (Tab, or 4 s / 8 frames after the task
    // changes; clamped to the screen edge, arrow toward the target) and Lev's
    // direction hint counts wall seconds; the ticket lens masks the present
    // ink around it and fades its 1978 ink before the rim; upstairs the
    // camera follows / frames the room (the lobby framing no longer sticks),
    // Butch arrives clear of the doorway wall and the bed is tagged on
    // arrival; the empty-seat line plays over a close shot of the open
    // carriage door and says so; "Take the room" leads Hana's menu after the
    // ledger question; on LOW / LOWEST Butch's rim becomes a clean inverted-
    // hull outline. Toma's composition unchanged. Files: 27 -> 27.
    // v44 (alpha round 4 fix round, engineer M3, 2026-10-05): reopened for
    // the round-4 playthrough issues (tests/car03/chapter3AlphaRound4).
    // Mid-chapter resume points at every beat (chapter3ResumePoint /
    // chapter3ResumeStart; new starts ministry-hall, market, hotel-lobby,
    // hotel-room, platform-walk; 3.4a starts after the cut feed); the ticket
    // board names lens → stack → punch and shows PUNCH BOTH only when it
    // works; checklist menus keep their numbers (asked topics struck,
    // Continue last; "Take the room" last again); the Mara ahead wears a rose
    // scarf on her rig's neck bone and the station beat pushes in on the
    // pair; a CLICK TO WALK · E TO LOOK · HOLD TAB controls tag; game time
    // follows the wall clock down to 1 fps (screen work once per drawn frame,
    // one shared snapshot per story change), LOW 0.7 / LOWEST 0.5 pixel
    // ratio and no MSAA when pinned LOW; Chapter 2's stone notice for the
    // Echo Stone (no Butch count line, the coat stays unclaimed); the dawn
    // bench waits for its painting; the camera reaches the laundry fire;
    // beacons draw over roofs and the edge compass stays while the target is
    // off screen; interior cuts swap at full black and lift after the new set
    // has drawn. Toma's composition unchanged. Files: 27 -> 27.
    // v46 (alpha round 4 fix round, engineer P1, 2026-10-06): the character
    // and interior-set GLTFLoaders get the bundled Meshopt decoder
    // (setMeshoptDecoder) for the compressed GLBs; no behaviour change.
    // Files: 27 -> 27.
    // v47 (alpha round 4 fix round, engineer P2, 2026-10-06): the long walks
    // and the far-city LOD (tests/car03/chapter3LongWalksLod). A walk
    // ordered 9 m or more away strides (1.45x, the rig jogs); on the four
    // long walks G · LEV LEADS THE WAY (FOLLOW THE FIRELIGHT at night) cuts
    // through black with one line to the destination's approach. Static
    // city models, the perimeter and the built street scenery are drawn only
    // near the frame and cast only where their shadow can reach it (screen
    // based, live camera and sun, once per drawn frame, hysteresis outside
    // the frame). Files: +2
    // (chapter3LongWalks, chapter3CityLod): 27 -> 29. Toma's composition
    // unchanged. Assets unchanged.
    assert.equal(sourceFiles.length, 29);
    assert.equal(
      aggregateSignature(sourceFiles),
      'dad3e3249e93935ae7b52cdb3fa6ad9c22797457d3b5c17468be7d121941f468',
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
    // v45 (2026-10-06, asset-only): voice/ch03/manifest.json records the
    // voice provider (ElevenLabs); no runtime behaviour change.
    // v46 (alpha round 4 fix round, engineer P1, 2026-10-06, asset-only):
    // every Chapter 3 GLB without Meshopt (rigs, animation library, models,
    // interior sets) recompressed in place by scripts/compress-glb.mjs —
    // Meshopt geometry + WebP maps, same triangles, skins, clips and names;
    // ASSET_MANIFEST.json and replacements/manifest.json record before/after
    // bytes and hashes (751 -> 751 files).
    assert.equal(assetFiles.length, 751);
    assert.equal(
      aggregateSignature(assetFiles),
      'fc2880bb5c00127e3f69358994d9d5fbe727c9d78ba518110893d935771323a0',
      'Chapter 3 assets are locked. Reopen it explicitly and create a new lock version before changing assets.',
    );
  });
});
