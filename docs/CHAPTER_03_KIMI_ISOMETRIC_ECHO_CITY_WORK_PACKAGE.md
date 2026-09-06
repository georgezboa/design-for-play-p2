# CHAPTER 03 — ECHO CITY — KIMI ISOMETRIC REBUILD WORK PACKAGE

Status: `DESIGN LOCK / READY FOR KIMI`

Owner: `Kimi`

Date: `2026-08-05`

## 0. Immediate ownership boundary

George has reassigned Chapter 3 to Kimi. Chapter 5 belongs to Mathias.

- Stop all Chapter 5 work. Do not read, modify, extend, test, commit, or publish Museum files.
- Do not commit, push, reset, clean, stash, or overwrite the shared dirty worktree.
- Do not ask George to approve every gate. Continue automatically while the gates below pass.
- Return only after the whole Chapter 3 package is playable and verified, or after a specific blocker has been proven.
- Use multiple agents only for genuinely independent asset inventory, visual review, or adversarial playtest. A single implementation owner must control shared Chapter 3 files.

This document is self-contained and supersedes the horizontal implementation direction in the earlier Qwen closeout package. Preserve Qwen's pure-model work and tests as evidence. Do not continue polishing the current left-to-right scene.

## 1. Product decision

### New play form

Chapter 3 becomes a **fixed-camera, three-quarter isometric social-choreography puzzle** set in one coherent city block.

It is not:

- a left-to-right platformer;
- a long horizontal world with three rooms placed in sequence;
- a lane-switching runner;
- a rhythm game with beat judgment;
- a dialogue or inventory puzzle;
- a real-time 3D engine migration.

The player sees most of the civic block at once and moves through it by clicking the ground. The city is arranged around a central transit clock, so paths loop back through a shared landmark instead of progressing continuously rightward. The camera is authored and mostly stable. It may make short pans or small zooms to frame a result, but it must not follow the player down a scrolling corridor.

### Core sentence

> Borrow a movement from one relationship, give it to another part of the city, then make your own movement the final missing relationship.

### Narrative purpose

The Archivist has reduced Echo City to a set of officially accepted commuter routines. People are safe only while behaving like recorded systems. Butch does not defeat the system by fighting it. He restores relationships by observing a living cycle, carrying its meaning, and teaching that cycle to a different person or civic mechanism. In the final plaza, the city has no living cycle left, so Butch becomes the source and Mara completes his pattern.

This chapter must prove the six-chapter narrative claim: **safety can come from coordination rather than control**.

## 2. Player controls and interaction grammar

### Primary controls

| Input | Player-facing meaning |
|---|---|
| Left click on walkable ground | Move Butch to that point |
| Hover a source or receiver | Show one cyan outline and a short local prompt |
| Hold left click on a source | Observe one full visible cycle and copy it |
| Left click a receiver while carrying | Transplant the carried cycle |
| Right click or Esc | Release/cancel the currently selected relationship |
| E | Keyboard alternative for the currently highlighted source or receiver |
| R | Restart the current civic-space checkpoint |

WASD may remain as an accessibility fallback, but it is not the authored presentation. Jump is disabled. There is no lane-change control and no hidden inventory.

### Spatial interaction rules

1. Ground clicking uses an authored navigation graph, not free physics and not a new package dependency.
2. A source is readable before interaction because its complete loop is visible in the world.
3. A carried cycle is shown as a short cyan relationship ribbon near Butch, with two or three semantic pictograms. It is not a HUD inventory slot.
4. A receiver previews the likely physical result using a ghosted path, moving part, or silhouette before the player commits.
5. Wrong-but-eligible transplants always produce a complete physical result and remain reversible in place.
6. The player can never complete a space merely by clicking the exit or walking around every obstacle.

## 3. The city block

Build one compact civic diorama around a central clock and transit kiosk. The whole composition should read as a place, not three screens connected in a line.

```text
                         NORTH

             [TRANSIT INTERSECTION]
          bus bay      crossing island
               \        /
                \      /
          [CENTRAL CLOCK / KIOSK]
             /                  \
            /                    \
 [LIVING MARKET]          [SILENT FOUNTAIN]
 courier + shutters       record path + Mara
            \                    /
             \                  /
              [TRAIN THRESHOLD]

                         SOUTH
```

### Spatial metrics

- One fixed orthographic three-quarter camera, approximately 45-degree yaw and 50–60-degree downward tilt.
- Render source art at 1920×1200, then present at 960×600.
- The complete civic block fits inside about 1.15 screen widths and 1.10 screen heights. Camera movement is for framing, not traversal.
- Butch crosses one district in roughly 3–5 seconds.
- The central clock remains visible in all ordinary gameplay framings and is the orientation landmark.
- Buildings define the north and west edges. Foreground planters, bollards, and awnings provide depth but never hide the current target completely.
- All necessary routes form loops that return to the central clock. Avoid dead-end hallways.

## 4. Authored progression: 7–10 minute course slice

### Beat 1 — Arrival and visual demonstration (0:00–0:40)

Butch enters from the train threshold at the south edge. The camera reveals the whole block and settles on the central clock. A courier repeats a triangular route around two market stalls. The route is readable through footsteps, turns, a delivery handoff, and a cyan trace that appears only after the player watches for a moment.

No instruction paragraph appears. The first prompt is local: `[HOLD] OBSERVE CYCLE`.

### Beat 2 — Living Market: introduce (0:40–2:00)

The player holds on the courier through one full loop: `MOVE → DELIVER → RETURN`.

The player gives that loop to a stalled three-person delivery group. They repeat the triangular handoff. Market shutters open in sequence, stall lights wake, and a route to the central clock becomes active.

Failure is harmless. Releasing early drains the partial trace. Giving the loop to an incompatible shutter controller makes it repeatedly open and close without passing the parcel; the player can release it immediately.

### Beat 3 — Transit Intersection: develop and twist (2:00–4:45)

The player now sees two independent source/receiver relationships in the same intersection:

- bus source: `STOP → OPEN → GO`;
- crossing source: `WAIT → WALK`;
- barrier receiver accepts the bus service loop;
- waiting crowd receiver accepts the crossing loop.

The player still carries one cycle at a time, but installed cycles persist. The order is free. When both relationships are installed, the bus barrier and moving crowd create a safe diagonal crossing through the surveillance field.

At least one wrong mapping must be fully animated and legible. Example: `WAIT → WALK` applied to the barrier makes it twitch halfway open whenever the pedestrian signal changes. Nothing silently refuses input.

### Beat 4 — Central-clock breather (4:45–5:20)

The player returns to the clock. The restored market and transit cycles are visible at once. Ambient sound layers briefly align. Mara appears across the silent fountain, separated by the witness gate. This is a short vista and story beat, not a new mechanic.

### Beat 5 — Silent Fountain: combine (5:20–7:40)

The Archivist triggers an alarm and removes the living crowd from the square. The installed city cycles remain as amber/cyan echoes, proving that the player changed the place.

Butch steps onto an amber record mark. The same observe/copy language turns inward: the player clicks a short three-point route around the fountain and rings the witness bell once. The recording stores semantic actions, not frame-perfect timing.

An authored Butch echo previews the route. Mara then performs the same route half a step behind while the restored bus and crossing cycles keep the civic block moving. Butch and Mara arrive on two witness pads together. The gate opens because two people now form a valid relationship without a crowd.

No new control is introduced in the final 20 percent. The player uses click movement and the same resonance action already learned.

### Beat 6 — Payoff (7:40–8:30)

Mara reaches Butch. The clock, shutters, barrier, crossing and fountain replay their restored cycles together. Mara says:

`You always walked half a step ahead.`

The camera frames both characters and the reawakened block before the train threshold opens. Completion is the reunion and persistent city transformation, not a score screen.

## 5. Art-source audit and approved use

The downloaded Quaternius Standard archives are valid, CC0, and useful, but only as **offline source material**. Do not import the archives or glTF files into Phaser at runtime.

### Downtown City MegaKit — approved

Extract only the following candidates into:

`/Users/zhongzicheng/Documents/CS247G Game Design Part 2/open-source-assets/car03-2p5d/work/echo-city-isometric/`

Recommended minimum set:

- `Street_4WayIntersection.gltf`
- `Street_Asphalt_6x6.gltf`
- `Sidewalk_Corner_Round_3m.gltf`
- `Sidewalk_Straight_3m.gltf`
- `Decal_Crosswalk.gltf`
- `Decal_Crosswalk_Wide.gltf`
- `Building_Small_1.gltf`
- `Building_Medium_2_001.gltf`
- `Building_Large_2.gltf`
- `Prop_Bollard.gltf`
- `Prop_Planter_Single.gltf`
- `Prop_ManholeCover.gltf`
- `Prop_Drain.gltf`
- only the minimum doors, stairs, trims, and windows used by the final composition.

Use these for geometry, perspective, shadows, and paint-over. Remove commercial signage, simplify building silhouettes, and recolor the entire set into Echo City's restrained warm-grey, transit-green, cyan, amber, and red palette.

### Universal Animation Library — approved with limits

Use the non-root-motion GLB only as an offline motion source. Select idle, walk, quick walk/run, turn, handoff, point/reach, and bell/interact actions if available. Retarget only the actions actually used. Bake 8-direction crowd atlases at 12 or 15 fps. Gameplay position remains controlled by the pure model.

### Universal Base Characters — crowds and scale reference only

These models may become anonymous commuters after silhouette, clothing, palette, and material changes. They may also provide temporary Butch/Mara scale and rig tests.

They are **not approved final Butch or Mara designs**. Final Butch/Mara appearance belongs to the human character owner. Keep the runtime slots replaceable.

### Existing A2 PNG kit — limited salvage

The existing side-view carriage layers do not fit the new isometric city and must not define the new layout. Salvage only:

- palette and identity-color references;
- scanner state language;
- temporary portraits or interaction icons if they remain readable;
- provisional animation timing as a reference.

The current side-view hero, companion, and commuter sprite sheets are not sufficient for isometric movement because they lack directional views.

## 6. Offline Blender-to-Phaser art pipeline

Blender 4.1.1 is available locally.

1. Build the entire civic block in one Blender scene using only the selected source models.
2. Lock one orthographic camera before detailing.
3. Establish three value groups: quiet background, readable walkable plane, high-contrast actors/mechanisms.
4. Render separate transparent layers:
   - far buildings and skyline;
   - ground and permanent shadows;
   - market mechanisms;
   - transit mechanisms;
   - fountain and witness gate;
   - foreground occluders;
   - cyan/amber/red relationship masks.
5. Render 8-direction character atlases from the same camera and lighting setup.
6. Apply the hand-painted storybook treatment after the 3D composition reads: graphite edges, restrained watercolor/gouache color, paper grain, and selected line wobble.
7. Export only optimized WebP/PNG derivatives to the Chapter 3 runtime asset directory. Keep the `.blend`, archives, and source glTF files outside Git.
8. Maintain an asset manifest with source file, license, render camera, dimensions, pivot, layer, runtime derivative, and placeholder/final status.

Runtime budget:

- derived Chapter 3 art target: 12 MB or less;
- no runtime glTF, skeletal animation runtime, Three.js, or new engine dependency;
- atlas size at most 4096×4096;
- maintain smooth play at 960×600 and correct layout at 1280×720.

## 7. Engineering architecture

Preserve and adapt Qwen's deterministic `BehaviorCycle`, receiver, event, reset, and `render_game_to_text()` logic. Replace the scene's horizontal world and lane assumptions.

Required domains:

- `spatialGraph`: walkable nodes, links, district ids, click target, current route;
- `player`: isometric world position, route progress, facing, movement state;
- `focus`: one hovered/highlighted source or receiver;
- `resonance`: idle, observing, carrying, transplanting, recording, previewing;
- `cycles`: semantic loop data and shared visual/gameplay phase;
- `receivers`: installed cycle, compatibility, visible result, reversible state;
- `districts`: market, transit, fountain restoration states;
- `mara`: visibility, replay route, reunion state;
- `cameraBeat`: authored framing id only, never free-scroll progression;
- `events`: visible cause/intermediate/result transitions.

Use an authored waypoint graph of roughly 24–32 nodes. A simple deterministic shortest-path search is sufficient. Do not install a pathfinding package.

Depth sort actors by isometric world Y. Important targets behind an occluder receive a thin silhouette outline; do not make the player hunt behind buildings.

## 8. File ownership

Kimi may modify only:

- `car03.html`
- `src/car03-main.js`
- `src/cars/presentCity/**`
- `tests/car03/**`
- `vite.car03.config.js` only if the standalone build requires it
- new Chapter 3 runtime derivatives under an isolated Chapter 3 asset directory
- `outputs/chapter03-kimi-isometric/**`
- `docs/CHAPTER_03_KIMI_HANDOFF.md`
- the external work directory listed in Section 5

Do not modify:

- any Chapter 5/Museum file;
- `src/main.js`, `src/scenes/GameScene.js`, shared chapter routing, save, subtitle, audio, package, or lock files;
- Chapter 1, 2, 4, or 6 content;
- original Quaternius archives;
- final Butch/Mara character assets owned by the human contributor.

If integration needs a shared edit, describe the exact event/payload contract in the handoff and stop only that integration step. Do not make the edit yourself.

## 9. Continuous execution gates

Kimi should execute these gates continuously. Do not return after each gate.

### Gate 0 — preserve and map (30–45 min)

- Record the current Chapter 3 dirty files, tests, build result, and Qwen model APIs.
- Mark the old horizontal scene as superseded, but do not delete useful code or tests until replacements pass.
- Confirm no Chapter 5 file will be touched.

### Gate 1 — visual/spatial spike (60–90 min)

- Extract only the approved asset subset into the external work directory.
- Produce one Blender blockout and three 960×600 proof renders: full block, actor readability, and transit relationship.
- Verify the central clock is visible from all authored framings and that the composition does not read left-to-right.
- If the native-size screenshot cannot distinguish Butch, Mara, crowd, source, receiver, safe ground, and destination, fix the blockout before coding the full chapter.

### Gate 2 — spatial model and input (90–120 min)

- Implement the deterministic waypoint graph, click-to-move, hover focus, click/hold resonance, depth sorting, cancel, and reset.
- Keep keyboard E and WASD alternatives.
- Add focused model tests before art integration.

### Gate 3 — Living Market vertical slice (90–120 min)

- Complete the entire observe → copy → transplant → visible market result loop.
- Add one wrong reversible transplant.
- Run a normal browser playthrough from `car03.html` using real pointer input.
- Do not build all districts if this first loop is not visually understandable.

### Gate 4 — full civic-block logic (120–180 min)

- Add Transit, the central-clock breather, Silent Fountain recording, Mara replay, and reunion.
- Preserve installed relationships across districts.
- Validate the whole critical path and local recovery before final dressing.

### Gate 5 — art, sound, and feedback pass (120–180 min)

- Replace greybox surfaces with the rendered layers and directional atlases.
- Add ambient city bed, source-cycle sounds, transplant result sounds, wrong-result sounds, and reunion stinger using the existing isolated Chapter 3 audio path.
- Keep text local, English, at least 20 px at 960×600.

### Gate 6 — adversarial acceptance (90–120 min)

- Run scoped Chapter 3 tests, standalone build, asset check where applicable, and diff check.
- Complete two normal-entry runs using real mouse/keyboard input and no QA state mutation.
- Run a no-copy negative control proving that movement alone cannot complete the chapter.
- Run wrong-transplant/release, early observation release, checkpoint reset, ten full resets, and 1280×720 layout checks.
- Inspect every required screenshot at native size. Automated success does not prove visual comprehension.

## 10. Acceptance criteria

The work is not complete unless all are true:

1. The map does not read as a horizontal corridor in the entry screenshot or during play.
2. The player can travel between at least three directions from the central clock.
3. The first source demonstrates its full cycle before prose tells the answer.
4. Source, carried relationship, receiver, and result are visually distinct without relying on color alone.
5. One wrong transplant visibly changes a mechanism and is reversible in place within two actions.
6. Transit requires two persistent relationships and allows either installation order.
7. The final recording reuses established controls and combines earlier city cycles with Mara's movement.
8. Walking/clicking directly to Mara or the exit cannot complete the chapter.
9. No required interaction repeats unchanged more than twice.
10. Normal first-run duration is 7–10 minutes; a knowledgeable rerun is under 6 minutes.
11. Camera framing, occlusion, pathfinding, reset, and focus remain stable after ten resets.
12. `render_game_to_text()` matches the visible route, focus, carried cycle, installed receiver states, district state, Mara state, and completion.
13. All player-facing text is English and unclipped at 960×600 and 1280×720.
14. No Chapter 5 or protected shared file changed.
15. No commit or push occurred.

## 11. Required evidence and handoff

Save under `outputs/chapter03-kimi-isometric/`:

- `01-city-block-entry.png`
- `02-market-source-observed.png`
- `03-market-transplant-result.png`
- `04-transit-wrong-result.png`
- `05-transit-two-cycles-running.png`
- `06-central-clock-breather.png`
- `07-silent-square-recording.png`
- `08-mara-echo-replay.png`
- `09-reunion-complete.png`
- `10-reset-baseline.png`
- `layout-1280x720.png`
- `natural-playthrough.jsonl`
- `console-errors.txt`
- `ASSET_MANIFEST.json`
- `PLAYTHROUGH_REPORT.md`

`docs/CHAPTER_03_KIMI_HANDOFF.md` must report:

- implemented spatial mode and full player route;
- preserved Qwen logic versus superseded horizontal assumptions;
- exact changed files;
- exact extracted source assets and runtime derivatives;
- test/build counts and commands;
- natural-input sequence and evidence paths;
- known limitations and final-character placeholders;
- confirmation that Chapter 5 and protected files were untouched;
- confirmation that no commit/push occurred.

Finish with exactly one verdict:

`READY FOR GEORGE PLAYTEST`

or

`BLOCKED: <one specific proven blocker>`

