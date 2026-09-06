# Chapter 6 Art, Camera, and Model Specification

Status: `ACCEPTED / LOCKED BY GEORGE — 2026-08-04`  
Runtime manifest: `src/chapters/allWorlds/finaleArtDirection.js`  
Chapter: `ALL WORLDS AT ONCE`

## One-sentence direction

Chapter 6 is a **moving memory theatre**: Butch continues along one spatial spine toward Mara while the materials, structures, behavior, and physical rules of the first five worlds take ownership of the same geometry.

It is not five maps loaded in sequence and not five background skins.

## Shared visual grammar

- Hand-drawn characters over 3D-assisted environments with one painterly surface treatment.
- Graphite contour, watercolor/gouache masses, paper grain, visible brush boundaries, restrained line jitter.
- Cyan means a relationship holds; amber means an action or signal is travelling; red means failure, refusal, or Archivist deletion.
- Butch, Mara, the train spine, and at least one cyan relationship remain visually continuous through every world change.
- A world transition changes physical meaning, not only color.

## World layers

| World | Material signature | Finale function |
|---|---|---|
| Night Service | blackened iron, brass, steam, piston and linkage | changes how structures move |
| Borrowed Grid | cyan cable, neon scaffold, suspended transit | changes where power and routes flow |
| Echo City | motion traces, semantic loops, repeated urban behavior | changes what a receiver repeats |
| Painted Country | torn paper, wet ink, watercolor, folded structures | changes which property becomes physical |
| Museum | ivory archive, glass, brass labels, reconstruction | changes which interpretation becomes walkable |

## Camera lock

Normal play uses a directed, fake-orthographic three-quarter camera authored around a 40-degree downward view. It has a small deadzone, eased look-ahead, frame-rate-independent smoothing, and updates only after player movement resolves.

World changes preserve Butch's screen motion and world coordinate. Foreground pillars, steam, paper tears, glass, transit vehicles, and world seams may briefly occlude local geometry while layered art changes behind them. The camera must not reset or expose a black cut.

The three-world overlap pulls back to 78% scale. It does not begin a free camera orbit. The reunion changes from player follow to Butch/Mara two-target framing and a slow push-in, then hands directly to the ending film.

## Locked visual beats

1. **Arrival on the Spine:** Night Service establishes the shared physical skeleton.
2. **Mechanical Interpretation:** Museum framing changes which train mechanism creates a route.
3. **Powered Painted Crossing:** Grid power enters Painted Country and becomes a physical brush/wind bridge.
4. **Echo Three-World Overlap:** Echo City's semantic loop drives the already-readable Grid/Paint relationship.
5. **Archivist Compression Refusal:** all five worlds become visible, but only two rules remain directly interactive.
6. **Reach Mara:** all five worlds coexist visually; no new puzzle rule appears during the emotional payoff.

## Original model list

### P0 — Fusion Spine reusable kit

1. straight floor/rail
2. chasm edge
3. bridge
4. world boundary arch
5. ramp/stair
6. lift/rotating platform
7. wall/pillar
8. foreground occluder

Every module uses shared scale and connection sockets. The five world treatments must fit the same geometry.

### P0 — one readable landmark set per world

- Night: traction node, piston/pipe, lock lever.
- Grid: power pylon, cable junction, transit receiver.
- Echo: behavior receiver, traffic gate, loop beacon. Ordinary crowds may be hand-drawn sprite cards.
- Painted: brush anchor, folding bridge, paper landmark.
- Museum: evidence plinth, glass case, reconstruction door.

### P0 — finale hero models

- Archivist compression core.
- World Loom.
- Mara reunion platform.
- Witness door / train spine.
- Near, middle, and far world-seam silhouettes.

### Character assets

Butch and Mara remain visible hand-drawn characters. Blender uses only simple hidden proxies for scale, contact shadow, and occlusion. Runtime sets require idle, walk/run, interact, hold/push, brace/resist, and reach/reunion poses. Use four directions with left/right mirroring for the course build.

### Effects, not 3D models

Cyan thread, amber pulse, red deletion fracture, paper tear, watercolor bloom, ink dissolve, glass reflection, steam/dust/paper loop, and foreground world wipe.

## Production handoff

- **Blender:** locked camera, modular geometry, lighting, depth, shadow, and occlusion plates.
- **AE:** painterly coverage, line motion, material transformation, seam wipes, and cinematic compositing.
- **Phaser:** collision, interaction, parallax layers, masks, color response, state continuity, and camera direction.

Each exported asset uses the stable names in `finaleArtDirection.js`. Runtime code must never depend on a Blender collection name chosen ad hoc.

## First production order

1. Entire Fusion Spine greybox.
2. World Loom greybox and silhouette test.
3. One P0 landmark from each world placed on the spine.
4. Butch/Mara scale and occlusion test in the locked camera.
5. Complete the no-art playable route.
6. Only then add final materials, secondary props, and painterly coverage.

