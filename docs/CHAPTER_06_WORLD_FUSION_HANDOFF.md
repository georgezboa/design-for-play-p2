# Chapter 6 — All Worlds at Once: Pairwise Fusion Slice

Status: `PLAYABLE ISOLATED VERTICAL SLICE`
Owner: Codex
Entry: `car06.html` via `vite.car06.config.js`

## What is already proven

This first slice deliberately proves the finale's central technical and design requirement before attempting the full spectacle:

> A meaningful player-made relationship survives a world switch and becomes a new physical rule in the next world.

The route is:

1. In **Borrowed Grid**, Butch reaches the dead pylon and uses `E` to make a `POWER LINK`.
2. With `Q`, the player deliberately shifts into **Painted Country**. The power link is still visible as a carried cyan/amber relationship.
3. At the brush anchor, `E` turns that carried signal into `WIND`; it paints a bridge over the paper chasm.
4. Crossing the brush boundary causes one authored **automatic** cut back to Grid. The bridge state survives the cut.
5. Back in Grid, the now-complete `POWER → WIND → BRIDGE` chain opens the witness door with `E`.

This establishes player-controlled and automatic world switching in one route without a six-item ability menu and without ever showing more than two active world rules.

## Files

- `src/chapters/allWorlds/worldFusionModel.js`: deterministic pure model.
- `src/chapters/allWorlds/AllWorldsScene.js`: Phaser visual slice and input.
- `src/car06-main.js`, `car06.html`, `vite.car06.config.js`: isolated entry.
- `tests/chapter06/worldFusionModel.test.mjs`: progression, persistence, automatic cut, gated final door, deterministic reset.

## Validation on 2026-08-04

- The original pairwise model remains 5/5 passing.
- The complete Chapter 6 focused suite is now 21/21 passing, including the five-slot contract, art/camera lock, eight-piece continuous Fusion Spine, camera deadzone/look-ahead/bounds, and reunion framing.
- `npx vite build --config vite.car06.config.js --outDir /tmp/nightfall-car06-build`: passing.
- `git diff --check`: passing for this change.
- Browser composition and the complete playable route were inspected at `car06.html`: entry, pylon prompt, Grid to Paper switch, foreground occluder, Brush Anchor, wind bridge, automatic return to Grid, Witness Door, World Loom vista, Mara silhouette, completion, and reset all rendered. Browser automation could only repeat discrete native key presses instead of sustaining a held key, so final human held-key feel remains a QA gate.

## Fusion Spine P0 greybox

- Runtime layout: `src/chapters/allWorlds/fusionSpineLayout.js`.
- Camera controller: `src/chapters/allWorlds/finaleCameraDirector.js`.
- The 2880px route uses all eight locked reusable spine slots without gaps.
- The Scene draws a three-quarter deck, shared under-spine mechanical ribs, a readable safety gate, transition-ready foreground occlusion, a fixed Brush Anchor, chasm/bridge, Witness Door, World Loom scale proxy, and distant Mara scale proxy.
- The camera follows after player movement with a deadzone, eased look-ahead, hard world bounds, and a non-snapping Butch/Mara two-target mode.

## Next implementation beats

The five independent chapter input slots and their exact packet contract are now locked in `docs/CHAPTER_06_INTEGRATION_PIPELINE.md`.

1. Replace the programmatic Fusion Spine surfaces with Jason's common painterly treatment while preserving all named state anchors, module sockets, the 960×600 viewport, and the 2880px world route.
2. Connect each real chapter packet as it becomes ready; the order no longer matters.
3. Add a second pairwise beat, ideally **Museum ↔ Train**, with one interpretation changing a moving route.
4. Add the three-world overlap only after each pairwise carry contract is represented as named serializable state.
5. Build the **Compression Engine final-boss shell** after the three-world
   overlap is readable. It consumes the same five registered packets across
   three phases: expose witness anchors, sustain contradictory world states,
   and complete the final shared circuit. Do not add health, attacks or a new
   boss-only input.
6. Integrate only through the shared chapter lifecycle owned by Codex. Do not attach this standalone slice to the main route yet.
7. Add Chapter 1 echo and Mara action only when their runtime event contracts are available; never mock them as a second directly controlled player.
