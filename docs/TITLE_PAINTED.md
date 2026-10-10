# NIGHTFALL: the painted title (round 10, 2026-10-10)

George asked to redo the title screen ("重新做一下标题画面"). His answers:

- **Art:** George paints, Claude integrates (as for Chapter 1 and the cutscenes).
- **Composition:** the round-6 title's, painted: Butch on the bench by the big window, his lamp lit, the orchard case under his hand; the departures board on the walnut wall; the end door's little window onto the next carriage, where Mara walks away.
- **Menu:** still the game's text menu (mouse, keys, pad, any text size), hung in Chapter 1's painted brass bezel.
- **Motion:** the view outside scrolls in layers (hills, orchards, the embankment, poles and wires, trackside lamps), rain, the lamp flickers, the carriage sways, and each passing lamp sweeps a band of warm light across the carriage. Reduce Motion shows one still frame.

## The brief

`scripts/title-art/make_title_batch.py` writes `title-batch.json` (for Codex) and `title-batch.md` (readable, with the layout table). They live on George's Mac in `NIGHTFALL art/title/`. Nine paintings, style ST1-a:

| Item | What | Special |
|---|---|---|
| TT-carriage | the carriage, Butch, the plain wall, the end door | both glasses pure green; positions as fractions (the layout table) |
| TT-carriage-lit | the same, washed by a passing trackside lamp | edit mode from TT-carriage, only the light changes |
| TT-sky | the night sky behind the window, the moon | still |
| TT-hills / TT-orchard / TT-trackside | far, middle and near layers | green above them; seamless left to right |
| TT-pole / TT-lamp | a telegraph pole, a trackside lamp | portrait cut-outs on green |
| TT-next-carriage | the next carriage's corridor, Mara walking away | the middle third shows through the door window |

No words in any painting: the game writes NIGHTFALL and the whole menu.

## The build

```
python3 -I scripts/title-art/make_standins.py /home/claude/art-src/title-standin /home/claude/art-src/ch1   # stand-ins, once
python3 -I scripts/title-art/build.py [--art DIR] [--standins DIR]
```

- George's paintings go in `/home/claude/art-src/title/`. Any item not there yet is built from its stand-in (the round-6 procedural title captured at 1536 × 1024, and simple shapes) into `public/assets/title/standin/`, which git ignores.
- The carriage's two green glasses are keyed to alpha (the two largest keyed regions: the big window, the door window). The lit twin is aligned onto it (`align_pair`, shared with the cutscene build) and takes the carriage's glass.
- The outside layers are keyed, trimmed to their band (`top`) and made seamless (their ends cross-faded, premultiplied so the green never tints an edge).
- The pole and the lamp are cut out; the pole's crossarm (`arm`) and the lamp's flame (`flame`) are found for the wires and the light.
- Outputs: `public/assets/title/*.webp`; `src/shell/titlePlates.generated.js` (`TITLE_PLATES`, `TITLE_GEOMETRY`, `TITLE_COMPLETE`); `scripts/title-art/manifest.json`.
- `TITLE_GEOMETRY` is where things are in the carriage, as fractions: Butch (seat, head, cap), his lamp, the pendant, the board's wall, the narrow crop, the moon in TT-sky. `build.py` holds two sets: `REAL_GEOMETRY` (the brief's layout until it is measured on George's painting) and `STAND_GEOMETRY`.

## The engine

- **`titlePlate.js`** keeps the round-6 motion model (`frameState`: scroll speeds, the sway, the passing lamps and their sweep) and mounts whichever title `titleArtVersion()` picks: the painted one once `TITLE_COMPLETE` is true, else the procedural one. Dev builds force either with `?titleart=painted|drawn`; the dev launcher lists both. If the plates fail to load, the procedural carriage stands in.
- **`titlePaintedLayout.js`** (pure) places the carriage on any screen:
  - **wide** (aspect ≥ 1.1, and the window-to-wall span fits): the plate cover-fitted, never stretched, the crop anchored so the window's frame and the board's wall stay on screen; the board centred on the wall but never over the window, 336–600 px wide;
  - **narrow** (phones, tall windows): the window and Butch cropped into Chapter 1's brass bezel at the top, the board below on the walnut.
  - It returns the round-6 layout's shape (glass, wordmark, plaque, butch, poleGap), so `frameState` and the page's CSS variables work unchanged.
- **`titlePainted.js`** (its own chunk) loads the plates and paints: the next carriage behind the door glass, the carriage, rain beads on the big window; per frame, the sky and the three layers at their speeds, the poles with two sagging wires and the lamps with their glow, two rain layers; the band of the lit twin; the flicker of Butch's lamp and the pendant. It paints the board's brass bezel at the board's own size (repainted when the board changes size) for the CSS (`--nf-board-frame`).
- **CSS:** `#nightfall-title[data-art="painted"] .nf-menu[data-frame="painted"]`.
- **Tests:** `tests/titlePainted.test.mjs` checks the layout on 14 screen shapes, for both the built geometry and the brief's, the motion model on it, the version switch, the generated plates and the brief.

## When George's paintings come in

1. Copy them to `/home/claude/art-src/title/` and run `build.py`.
2. Check the keyed glasses, the lit twin's alignment (`manifest.json`), the strips' bands and seams, the pole's arm and the lamp's flame.
3. Measure `REAL_GEOMETRY` in `build.py` on a grid overlay of TT-carriage (Butch's head and cap, his lamp, the pendant, the wall, the narrow crop) and the moon in TT-sky; run `build.py` again.
4. Look at the title with `?title=1&titleart=painted` at 1920 × 1080, 1600 × 900, 1280 × 800, 1024 × 768, 2560 × 1080, 900 × 1200 and 390 × 844, and with `freeze('sweep')` on the scene (`#nightfall-title.__scene`).
5. `TITLE_COMPLETE` turns true by itself; the game then shows the painted title. Run the tests, build and smoke.

## The paintings are in (2026-10-10)

George's nine title paintings are built (`TITLE_COMPLETE` is true), so the game shows the painted title; `?titleart=drawn` still shows the round-6 one in dev.

- The carriage's glasses keyed cleanly: the big window [104, 172, 727, 437], the door window [1369, 200, 120, 242] (plate px). The lit twin needed no warp (features, shift 0.32 px).
- `REAL_GEOMETRY` is measured on his painting: Butch leans on his hand in the window's right half (head 0.432 × 0.448, cap top 0.382), the oil lamp on the round table (0.523 × 0.58), the board on the plain door-panel wall (0.578–0.846 × 0.065–0.84), the pendant above it (0.723 × 0.085), the narrow crop 0.04–0.58 × 0.13–0.87; the moon in TT-sky at 0.342 × 0.338.
- The orchard's trees stand a little taller in their picture than the far hills' line; the mid layer is drawn over the far one, so that reads as nearer trees.
- Checked at 1600 × 900, 1280 × 800, 1024 × 768, 2560 × 1080, 900 × 1200 and 390 × 844, with the passing lamp's sweep frozen on Butch.
