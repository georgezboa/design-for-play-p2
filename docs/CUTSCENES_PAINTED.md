# NIGHTFALL: the painted cutscenes (round 9, 2026-10-09)

This round replaces the eight drawn cutscenes (`docs/CUTSCENES_SPEC.md`, round 6) with George's paintings. The decisions, from George on 2026-10-09:

- George paints, Claude integrates.
- All eight cutscenes are redone together.
- **Look:** each cutscene follows its destination chapter.
  - Inside the night service, and for the opening, the finale and the ending: ST1-a.
  - The rain city (Chapter 2): ST3-b.
  - Echo City (Chapter 3), Leone's West: ST4-b.
  - The painted country (Chapter 4): pencil on cream paper with gouache, from screenshots of the chapter.
  - The museum (Chapter 5): ST1-a's ink, in walnut and brass.
- **Text:** the captions are unchanged, word for word.
- **Shots:** they may be restaged, so that one picture flies into the next as in Gorogoa and Kentucky Route Zero.

## The batch

- **Files:** `scripts/cutscene-art/cutscenes-batch.json` lists George's image tool items. `cutscenes-batch.md` is the readable version, with the storyboard. Both are made by `scripts/cutscene-art/make_cs_batch.py`. They live on George's Mac in `NIGHTFALL art/cutscenes/`.
- **Contents:** 44 paintings at 1536 × 1024.
- **Reused from Chapter 1:**
  - A0-office and A0-office-awake;
  - the lit carriage, C-train;
  - Butch's walk and lantern frames;
  - Mara's back, turn and walk frames;
  - the painted bezel.
- **Special items:**
  - **Pairs** (`pair_of`) are the same picture with one change. George makes them with the edit tool. The build aligns each pair (ECC affine) so a crossfade never jumps.
  - **Window plates** (`chroma_window`) have pure #00FF00 glass. The build keys it to alpha, and the game puts a moving view behind it.
  - **Close-ups** (`parent`) are what the camera flies into. The build solves where each sits in its parent with AKAZE and RANSAC, giving `LINKS`.
  - **No words in any painting.** The game sets every word: tags, tickets, signs, the letter, the card, the brass plate, ROSA and FILED.

## The build

```
python3 -I scripts/cutscene-art/build.py [--standins]
```

**Inputs** (read-only):

- `/home/claude/art-src/cutscenes/` (George's paintings);
- `/home/claude/art-src/ch1/` (the Chapter 1 paintings it reuses);
- `/home/claude/art-src/style-tests/` (stand-ins).

**Outputs:**

- `public/assets/cutscenes/<id>.webp`: 2 : 1 plates at 1536 × 768, about 180 KB each, about 8–9 MB in all.
- `ASSET_MANIFEST.md`.
- `scripts/cutscene-art/manifest.json`.
- `src/shell/cutscene/painted/plates.generated.js`: URLs, glass rects, close-up rects, and `COMPLETE`.

**Tuning the crop:** `BAND` sets where each 2 : 1 crop sits on its 3 : 2 painting.

**Stand-ins:** a painting that is not in yet is built from a stand-in (`STANDINS`: another painting, cropped or treated). Stand-ins go to `public/assets/cutscenes/standin/`, which git ignores, so they never ship.

**When a cutscene plays painted:** only when `COMPLETE[id]` is true, meaning none of its plates is a stand-in. Until then the drawn version plays.

**Dev overrides:**

- `?cutscenes=painted` plays the painted versions, stand-ins and all.
- `?cutscenes=drawn` plays the drawn ones.

## The engine

- **`registry.js`**
  - `DRAWN_LOADERS` holds the round-6 cutscenes.
  - `PAINTED_LOADERS` holds the round-9 ones.
  - `cutsceneVersion()` picks which plays.
- **`timeline.js`** adds three joins:
  - `zoom`: the camera flies into `rect` of the outgoing picture, where the next one is its close-up.
  - `pull`: the camera flies out of the outgoing close-up into `rect` of the next picture.
  - `white`: the picture goes through hot white.
  - Their helpers are `mapIntoRect`, `flightView` and `viewTransform`.
  - The flight is geometric in width and straight in centre, so it ends exactly on the inner picture's own framing.
  - Reduce Motion turns zoom and pull into crossfades.
- **`player.js`**
  - `drawRectJoin()` draws the outer picture at the flight's view, then the inner one in its rect through the buffer. The inner fades in over `reveal` with feathered edges (`feather`), so it reads as a picture inside the picture.
  - Every cutscene now hangs in Chapter 1's painted window: George's bezel and walnut, from `wallArt.js` `brassFrame` and `walnutFill`. Set `chrome: 'drawn'` to keep the round-6 brass.
- **`painted/kit.js`** is drawn in stage units (1600 × 800):
  - `drawPlate`, straight from the image, so it stays sharp at any zoom;
  - `drawPair`, which brings in a twin by fade, a ragged wet wipe, per-rect crossfades, or a radial reveal;
  - `windowLayout` and `drawWindowView`, a window plate with a moving view behind its glass;
  - `drawFigure` and `walkFrame`, Chapter 1's painted figures;
  - `drawWords`, words set onto a painted surface, typed or written in;
  - `drawStamp`;
  - lighting: `lampGlow`, `lampsDown`, `lightSweep`, `signLight`;
  - effects: `rain`, `motes`, `pages`, `bloom` (gouache);
  - `clockHands`, `sway`, `vignette`;
  - `drawFramedPlate`, a plate hung as one of Chapter 1's windows.
- **`painted/scene.js`**
  - `paintedCutscene(drawn, …)` keeps the drawn twin's id, length and music, and, shot by shot (the ids match), its captions and cues.
  - `geometry(plate, real, stand)` picks the coordinates for whatever is built.
- **`painted/worlds.js`** draws the worlds stacked round Butch (5 → finale) and folding back into one carriage (the ending).

## When George's paintings come in

1. Copy them to `/home/claude/art-src/cutscenes/`.
2. Run `build.py`. Check:
   - the crop band of each plate;
   - every keyed window's `glass`;
   - the solved `LINKS` and their inliers;
   - the pair alignment in `manifest.json`.
3. In each `painted/<id>.js`, measure the `real` geometry against the painting (`/tmp/claude-0/sheet.py`-style grid overlays):
   - tags, tickets, the letter and the card;
   - signs, lamps, the clock and the hedge;
   - floors and figures' heights;
   - Mara's roof;
   - the door windows;
   - the cases;
   - the stones.
4. Render every shot and join with `/tmp/claude-0/smoke/cs_frames.cjs <id> <dir> ?cutscenes=painted`. Look at the frames at 1600 × 900, 1280 × 720 and 900 × 1200.
5. `COMPLETE` turns true by itself. Run the tests, then build and smoke the bundle.
