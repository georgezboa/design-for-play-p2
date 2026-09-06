# CAR 03 — Gemini Direction A2 Production Asset Kit Work Package

## Role and boundary

You are the visual-production owner for Car 03 Direction A2.

This is an **asset-production task only**. Do not modify production code, gameplay logic, tests, design-lock documents, Git history, or existing source assets. Do not implement the assets in Phaser. Qwen will integrate the approved kit later.

## Read first

1. `outputs/car03-gemini-visual-directions/CODEX_REVIEW_A2.md`
2. `outputs/car03-gemini-visual-directions/DIRECTIONS_A2.md`
3. `outputs/car03-gemini-visual-directions/a2-01-entry-scan.png`
4. `outputs/car03-gemini-visual-directions/a2-02-lane-anchor.png`
5. `outputs/car03-gemini-visual-directions/a2-03-alert-duo.png`
6. The current Car 03 design lock and existing Car 03 visual assets/panorama.

The three individual A2 frames are the visual reference. Do **not** use the over-the-shoulder camera shown in parts of `direction-a2.png` as a production target.

## Locked production camera

- Canvas/reference frame: **960×600**, side-on 2.5D carriage.
- Far lane: visually higher, approximately 0.88 character scale, behind poles and seat edges.
- Near lane: visually lower, 1.0 character scale.
- Lane change must read as a short diagonal movement between these two planes.
- Scanner cone, warning brackets, footprints, prompts, rhythm marks, and duo brackets remain Phaser vector/text overlays. Do not bake them into raster art.

## Required output

Create the following under:

`outputs/car03-a2-production-assets/`

### 1. Character assets

Transparent PNG sprite sheets with consistent cell dimensions, alignment, scale, and identity across frames:

- Protagonist: rolled sleeves/open cardigan and crossbody bag; idle plus walk cycle.
- Safe companion: unmistakable teal scarf; idle plus walk cycle.
- At least three commuter variants: normal synchronized walk plus outward-running/panic poses.

Characters must remain readable when rendered at the intended 960×600 game scale. Left-facing animation may be produced by mirroring if the design remains correct.

### 2. Modular carriage assets

Separate transparent or tileable layers, not one flattened screenshot:

- back wall and window frame;
- softened/desaturated city-window view derived from the existing panorama;
- doors and seats;
- floor and subtle two-lane spatial cues;
- ceiling rail and integrated inspection scanner;
- foreground poles, seat edges, and other occluders needed to sell depth;
- red alert-light state where applicable.

The carriage must support horizontal repetition across the existing Car 03 world without obvious seams.

### 3. Scanner asset

Produce the ceiling-rail inspection scanner as a separate transparent sprite. It must visually belong to the train, support normal/safe/alert states, and have a documented beam origin. Do not include the beam itself in the raster.

### 4. Manifest and production notes

Create:

- `ASSET_MANIFEST.json`
- `PRODUCTION_NOTES.md`

For every file, document:

- pixel dimensions;
- sprite-sheet cell size and frame order;
- recommended origin/anchor;
- intended depth/layer;
- repeat/tile behavior;
- normal/safe/alert usage;
- source and generation provenance;
- whether mirroring is permitted.

Use the existing CAR palette colors as the key identity and gameplay-status colors. Tonal ramps inside painterly raster assets are allowed, but do not edit the project palette or invent competing status colors.

### 5. Proof sheets

Create three **actual 960×600** flattened proof composites assembled from the separated assets:

- entry/scan;
- lane change/anchor;
- alert/duo.

These proof sheets are verification only and must not replace the separated source assets.

## Quality gates

- No asset may be a crop of the A2 concept boards.
- Transparent files must have genuine alpha backgrounds and clean edges.
- Character identity, clothing, proportions, and lighting must remain stable across frames.
- No accidental lettering, fake UI, prompts, brackets, scan cones, or watermarks may be embedded.
- All claimed dimensions must match the actual files.
- The visual style must remain the warm illustrated A2 direction and must not regress into pixel art or procedural rectangles.
- Do not use unlicensed third-party imagery. Record generated/derived provenance.

If consistent transparent production assets cannot be generated, stop and report `ASSET_GENERATION_BLOCKED` with the exact failing items. Do not present flattened concept images as production-ready assets.

## Completion report

On completion, report:

1. every output path;
2. actual dimensions and sprite frame layouts;
3. proof that alpha and tile seams were checked;
4. any remaining integration risks;
5. final status: `READY_FOR_CODEX_ASSET_REVIEW` or `ASSET_GENERATION_BLOCKED`.

