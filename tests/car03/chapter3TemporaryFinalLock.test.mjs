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

describe('Chapter 3 integrated final lock v48', () => {
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
    // v47-ch3a (round 6, agent ch3a, 2026-10-07): owner note G5 and
    // playtest items 8, 9, 18 (tests/car03/chapter3Round6). The opening's
    // walkers are real walks (chapter3Entrance: Lev waits in view, walks over
    // at a walking pace to stand beside Butch, both turn to face; the walk to
    // the oil line is brisk; the Mara ahead's glimpse starts under the station
    // roof and leaves the frame, rig only); rigs are posed before their first
    // frame and teleports are not speed; Butch turns into a new heading. The
    // ticket board asks only how the two tickets are related: the player
    // stacks, punches, files the stack as one passenger or two and pins the
    // proof (both 1978 records and the duplicate rule); the solution lives in
    // tiered hints (H); 1978 findings stay as CHECKED marks and a side-by-side
    // tray. WASD / arrows walk everywhere; E / Enter act on the board.
    // Files: +1 (chapter3Entrance): 29 -> 30. Toma's composition unchanged.
    // Assets unchanged. (The lead reconciles this lock at merge.)
    // v47-ch3b (round 6 look pass, agent ch3b, 2026-10-07; the lead
    // reconciles this lock with the other round-6 Chapter 3 branch at
    // merge): owner note G8 "too sallow; it needs the West of Leone's
    // Dollars films" and playtest item 10 (tests/car03/chapter3LeoneLook).
    // A white high afternoon sun with hard PCF shadows, a bleached sky and
    // a linear far haze instead of the exponential veil; a backlit
    // blood-orange dusk; blue day-for-night; a cool clear morning; a colour
    // grade inside the materials' tone mapping (CustomToneMapping = ACES +
    // S-curve, saturation, split tone, white balance, grain on HIGH; no
    // extra pass) replacing the canvas CSS filter; sienna / terracotta
    // paving tints and a neutral vignette; the story cast gets signature
    // colour blocks with rim and fill (Butch navy, Lev bottle green, ...),
    // extras muted. Files: +2 (chapter3ColorGrade, chapter3CastLook):
    // 29 -> 31. Toma's composition unchanged. Assets unchanged.
    // v48 (round 6 merge, lead, 2026-10-07): v47-ch3a and v47-ch3b
    // together, plus the lead's integration: the house type (EB Garamond /
    // Jost in place of Georgia / Space Mono), the controls-stage probe
    // (publishControlsStage) and a softer dusk fill. Files: 29 + 1
    // (chapter3Entrance) + 2 (chapter3ColorGrade, chapter3CastLook) -> 32.
    // Toma's composition unchanged. Assets unchanged.
    // v48-ch3art (round 11 art pass, agent ch3art, 2026-10-10; the lead
    // reconciles this lock with the other round-11 Chapter 3 branch at
    // merge): George's notes on the oil, the burning words and the pink
    // collar (tests/car03/chapter3Round11Art). The afternoon oil line is
    // found along the court's real mortar joints and drawn as a lit,
    // shadowed decal (dark joints, soaked stone edges, a paler wiped band,
    // a broken wet sheen); the night letters are oil poured in the house
    // face with a trail joining them: a ground pass for the unlit oil, the
    // burning bed, heat on the stones, soot and the morning char, GPU flame,
    // smoke and spark billboards seeded in the strokes (half on LOW), the
    // lower row dark until it is lit, line-source fire lights (the second
    // waits at zero intensity, so lighting it recompiles nothing); Mara's scarf
    // is matte dusty-rose cloth (a loose double wrap, a knot on her left
    // shoulder, one end down her back and one over the shoulder, swaying),
    // fitted to whatever bone it is tied to. Files: +1 (chapter3OilArt):
    // 32 -> 33. Toma's composition unchanged. Assets unchanged.
    // v49-r11-board (round 11, George's playtest, 2026-10-10; the lead
    // reconciles this lock with the other round-11 Chapter 3 branches at
    // merge): George was stuck at the Ticket 43 proof. The board's top line
    // is now a task line naming the next action (never the answer); while
    // proving every paper wears a PIN badge (CLICK / E), the lens slides off
    // the papers, a proof strip by FILE AS ONE shows Lev's two questions as
    // slots with PINNED n / 3, FILE stays locked until they are filled, the
    // oil receipt is refused on the spot with a stamp and what is needed
    // instead, hints come at 12 / 25 / 40 s while proving and a refused move
    // steps them up instead of restarting them, papers make room for the
    // panel at TEXT SIZE 130%, and Esc (through the pause menu's hook) puts
    // the filing off as NOT YET · ESC says (tests/car03/
    // chapter3Round11Board). Files unchanged: 32. Assets unchanged.
    // v50-r11 (round 11 merge, 2026-10-10): v48-ch3art and v49-r11-board
    // together, plus the arrival and loading changes the lead makes on
    // release/1.0. Files: 33.
    // v51-r11-arrival (round 11, George's playtest, 2026-10-10;
    // tests/car03/chapter3Round11Arrival, tests/arrivalGate): the 2→3
    // hand-off and the arrival. The 2→3 cutscene now plays on this page
    // (car03-3d.html?from=chapter2: black until it is up, the flag taken
    // off the address) while the city loads, stages the arrival and warms
    // its programs and textures underneath in per-frame slices
    // (EchoCity3DPreview.warmUp, onModelProgress feeding the arrival gate;
    // the loading card is lifted by the page, not 650 ms after the models);
    // its Satie carries on as the arrival cue. The arrival (new
    // chapter3Alighting): Butch stands in the lit end doorway of the
    // night service's last carriage (the finale's doorless carriage, staged
    // for the start and leaving with the train), steps down (the rig's new
    // `lift`) and walks out to the station forecourt in about four seconds
    // while the announcement plays, the camera close on the carriage end and
    // the title card high; that is the only part that holds him. The rest
    // of the opening is walk-and-talk (createLineQueue barks that never take
    // the input; extendBark / endBark / voiceSpeaking): the call-back, his
    // two lines with the claim card in his hand as a non-modal paper
    // (Chapter3EvidenceViewer.peek), then Lev, who sets off on Butch's last
    // line and introduces himself beside him without calling him to a halt.
    // playerStart and levStart moved to the forecourt and the paving past
    // it. Files: +1 (chapter3Alighting): 33 -> 34. Toma's composition
    // unchanged. Assets unchanged.
    // v52-r12-ch3play (round 12, George's playtest of how Chapter 3 plays,
    // agent ch3play, 2026-10-10; tests/car03/chapter3Round12Play; the lead
    // reconciles this lock with the other round-12 Chapter 3 branch at
    // merge): point and click only: no key walks Butch (the round-6 WASD /
    // arrows, Shift run and held-E walk in step are gone); a click walks in a
    // scanner field too, the arch's beam stops a lone walker, a click on the
    // lit walker walks in step until the crossing and a click behind lets
    // go; the cards and hints name clicks. A natural walk: WALK_SPEED 5.4 ->
    // 1.9 m/s (the walk clip at about its own cadence), no stride on far
    // clicks, the double-click a 3.3 m/s jog; Lev's guide, follows and
    // scripted walks at that pace; rig speed is measured on slow frames too.
    // The arrival: after the step down Butch stays on the paving
    // (arrivalHold) while Lev walks up and stops in front of him, face to
    // face, then the call-back, Butch's lines (claim card in hand) and Lev's
    // introduction are one required conversation (click through); the
    // controls card comes when control does. The reveal: holding Alt (⌥
    // Option) or Tab lights and tags every interactable on screen, flavour
    // objects included (createRevealHold: either key, the pointer's altKey,
    // cleared on blur / hidden); dialogue digits read event.code. Facing:
    // everyone Butch talks to turns to him at a turn rate from any side (Lev
    // too), whoever speaks a line turns to him, he turns to them (or to the
    // oil line / letters), posts (Toma, Petar, Hana) turn back after; Olek
    // stops to talk after the crossing. Files unchanged: 34. Toma's
    // composition unchanged. Assets unchanged.
    // v53-r12-ch3look (round 12, George: "第三章的色彩我不喜欢 要极乐迪斯科的体感
    // … 第三章的色彩要重新配" and "石油管道看不到了", 2026-10-10; the lead
    // reconciles this lock with the other round-12 Chapter 3 branch at
    // merge; tests/car03/chapter3PaintedLook, which replaces
    // chapter3LeoneLook): the 3D city is painted like a Disco Elysium street
    // instead of the Leone western. Same clock and sun path; soft light, a
    // strong cool sky fill and a little haze; a grade in the same
    // tone-mapping step with a selective palette (khaki stone, rust roads,
    // teal-leaning blues), coloured lifted blacks and split toning, on every
    // tier; dusk ochre / slate, an ink-and-teal night, a grey-green morning,
    // a dirtier interior; PCF shadows with a wider filter. HIGH only: a
    // painted frame (new chapter3Painterly: the city drawn into an
    // off-screen frame that stands in for the screen, then a paint buffer of
    // 440 rows at any resolution pinned to the world, an anisotropic
    // Kuwahara on a fixed 37-sample disc, and a composite with a
    // joint-bilateral upsample, bristle streaks, broken colour, umber
    // contours and a canvas weave; film grain only on an unpainted HIGH
    // frame, still under REDUCE MOTION); LOW / LOWEST unchanged in cost.
    // The oil line: a soaked band along the authored route with the poured
    // line in the joints inside it, amber at its edges and near black down
    // its middle, a pale cleaned margin and a wet sky gloss, so it reads on
    // the pale limestone and on the dark clock court; and the civic plaza
    // paving lost a polygon offset that hid the clock and fountain courts on
    // 720-row canvases only (the plaza now looks the same on every
    // display). Files: +1 (chapter3Painterly): 34 -> 35. Toma's composition
    // unchanged. Assets unchanged.
    // v54-r12 (round 12 merge, 2026-10-10): v52-r12-ch3play and
    // v53-r12-ch3look together. Files: 35.
    assert.equal(sourceFiles.length, 35);
    assert.equal(
      aggregateSignature(sourceFiles),
      'a0aff9410644c2d64b5c4588dd6b6c55a6c2824d348c0292da5efdacb1bec2d3',
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
