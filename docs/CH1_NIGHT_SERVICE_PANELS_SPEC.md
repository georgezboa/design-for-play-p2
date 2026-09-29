# Chapter 1 · NIGHT SERVICE — panel-puzzle rebuild spec (v2, 2026-09-29)

Status: READY (product decision by George 2026-09-28: "you decide; the goal is to ship it and make it fun").
Replaces the side-scrolling Prologue (GameScene + TimetablePuzzle + 6 junctions). The old code stays in the repo until the new chapter fully works end-to-end.

v2 (2026-09-29, after George's Mac playtest: "make this part longer, and start with only ONE panel, so people who never played Gorogoa can get into it"; he got stuck on Act 2's glint-only BELLWETHER tag): the chapter now opens on one window (Act 0) and two (Act 0.5) before the 2×2 wall; every past-era interactable is ringed inside the lens; Acts 2 and 3 gain one puzzle each; the single 45 s pulse becomes three wordless hint tiers plus a pause-menu SHOW ME (§3, §6).

## 1. Player fantasy in one line
You are a night-train lost-property clerk. The carriage windows are paintings you can rearrange, zoom into, peel apart and punch through. Line the pictures up so that Butch can walk from one to the next, and so that an unclaimed suitcase gets back to the woman who owned it.

## 2. Story (kept from the existing Prologue, condensed)
- Butch works the lost-property desk on the night service, "the last archive line". The CONDUCTOR gives him the ticket punch.
- File: a 1978 claim for **Mara Velez**. She kept a rented **city room** near the terminal (early shifts) and still went home to the **orchard house in Bellwether** at weekends. Her younger sister is **Rosa**. The archive filed her two lives as two claims. The **city case** was collected; the **orchard case** stayed on the train.
- Theme: "Two true things". One person really lived in two places.
- The chapter ends with Mara glimpsed boarding the train ahead, which sets up Chapter 2.
- Reuse existing copy from `src/tutorial/prologueNarrativeDialogue.js` and `src/prologueNarrativeProps.js` for the archive cards (trim it; players read at most 2–3 short lines per card).
- Butch's relationship to Mara stays undecided in this chapter: don't write "sister/brother" lines about Butch.

## 3. Verbs (all mouse-first; a keyboard/gamepad fallback is required)
| Verb | Mouse | Keyboard fallback |
|---|---|---|
| Drag a panel to another slot (swap) | press on panel body + drag, release on target slot | arrows select a panel, Space picks it up / puts it down |
| Zoom in | click a zoom hotspot (a subtle amber shimmer on hover) | Tab cycles hotspots in the selected panel, Enter activates |
| Zoom out | right-click the panel, mouse wheel down, or the small "⤢" corner glyph | Backspace |
| Lift a frame layer | press-and-hold 250 ms on the frame's edge, then drag it out; drop it on another panel to overlay, or on an empty gutter to return it | F on the selected panel lifts its frame; arrows move it; Space drops it |
| Punch-hole lens (from Act 2) | drag the round lens anywhere; clicks inside the lens act on the 1978 layer | L toggles lens focus; arrows move it |
| Read an archive card | click the paper item | Enter; Esc closes |
| Pause | Esc | Esc |

No text tutorials. Each verb is taught by one puzzle whose only possible action is that verb, plus a hover affordance (cursor change and shimmer).

**Past-era affordance.** Inside the lens, every 1978 interactable (a past-era hotspot, or the anchor of a past-era edge) wears a pulsing amber ring, and the cursor turns to a pointer over it. No text. Any required action whose only mark is a glint (`tag.glintOnly`) gets the same ring outside the lens; `tag.ring: false` keeps an optional secret (the Ember Stone) subtle. The ring breathes more slowly and does not grow under Reduce Motion.

**Progressive, wordless hints** (`src/chapters/nightService/hints.js` decides when; `PanelScene` draws). The idle clock runs only while a step with a `hint` is waiting for the player — never during a walk, a dialogue, an open card or a locked beat — and restarts on any meaningful input (a click, a key, the wheel).

| Tier | Idle | What happens |
|---|---|---|
| 1 | 25 s (repeats every 12 s) | A soft pulse on the relevant element: the tag, the edge, the frame, the lens rim, the ⤢ glyph, or the slot a window should go to. |
| 2 | 60 s (repeats every 45 s) | A translucent ghost hand — a paper glove in the chapter's ink — performs the exact gesture once, then fades: the drag from panel to slot (carrying a ghost of the window), a click on the hotspot, the ⤢ glyph, press-and-hold then drag of the frame, or dragging the lens onto its target (and clicking through it). |
| 3 | 120 s (once per idle stretch) | One in-fiction line from the Conductor in the caption bar, from the per-step table in `hintLines.js` (e.g. "The tag says more in 1978 light."). |

- **First use of each verb** (drag, zoom, click, zoom-out, frame lift, lens hold, lens click): the ghost hand demonstrates it after only 8 s idle, the first time that verb appears on this page. A verb the player solves before the demo counts as learned.
- **SHOW ME**: the Chapter 1 pause menu has a SHOW ME action (and `H` in play). It dispatches `nightfall:hint`, which plays tier 2 at once (after the scene resumes). It does not reset the idle clock.
- **Reduce Motion**: the ghost hand does not travel; it appears at each end of the gesture in turn, with a dotted ink path between them. Pulses keep their light but lose their swell.
- The gesture is resolved from the live layout (`step.hint.ghost`: `{ drag: { tile, leftOf|rightOf|above|below|slot } }`, `{ click: { tile, hotspot } }`, `{ zoomOut: tile }`, `{ frame: { from, to } }`, `{ lens: { tile, u, v } | { tile, hotspot }, click }`, each with an optional `when`), so the hand always shows the next useful move from where the player actually is.

## 4. Engine requirements (new code, data-driven)
- A separate page `night-service.html` + `src/nightService-main.js`, with its own Phaser game at **1920×1080**, antialiased (NOT the pixel-art 960×600 config). FIT scaling. The shared shell is used: pause menu with per-chapter controls, settings, reduce motion, text size, save system, magic stones, cinematics, desktop bridge.
- **Grid**: slots per act (2×2 or 3×2) laid out as carriage windows inside a dark wood-and-brass carriage wall. Gutters are about 36 px.
- **Tile** = `{ id, state, states: { [stateId]: SceneDef }, draggable, frame?: FrameDef, overlay?: frameId }`.
- **SceneDef**:
  - `draw(layerCtx)` builds display objects for the present layer; `drawPast(layerCtx)` builds the 1978 layer (optional).
  - `hotspots: [{ id, rect (tile-normalised 0..1), kind: 'zoom'|'use'|'read'|'pickup', era: 'present'|'past'|'both', to?, requires? }]`.
  - `edges: { left|right|top|bottom: [{ type, at (0..1 along edge), era? }] }`.
- **Links**: after every change, check every adjacent pair of slots. A link is active when the facing edges carry the same `type` at the same `at` (±0.03). Links can come from overlays too. Emit `link:on` / `link:off` events with `{a, b, type}`.
- **Script**: per act, an ordered list of `steps` with triggers (`link`, `hotspot`, `overlay`, `state`, `butchArrived`, `item`) and effects:
  - `walkButch(path)` across linked tiles; he stops if a link breaks mid-walk.
  - `setState`, `giveItem`, `showCard`, `ringBell`, `unlockDrag`, `lockTile`, `grantStone`, `nextAct`, `playTrain(path)`.
  - Steps must be data, and each must be testable in node without Phaser: keep a pure `panelModel.js` (grid, swap, links, overlays, script state machine) separate from `PanelScene` rendering.
- **Zoom**: animate from the hotspot rect to the full tile (about 450 ms, ease in-out, crossfade). Zoom out reverses. Each tile keeps a zoom stack. Edges and links follow the CURRENT state, so zoom level is part of the solution.
- **Frame lift**: the frame becomes a floating tile-sized transparent frame. Dropping it on a panel sets `overlay`, and the frame is drawn above that panel's content. The composite can match script triggers (`overlay` trigger `{frame, onto, ontoState}`) and can contribute edges.
- **Lens**: circle, radius about 120 px. Every tile under it renders its past layer through a circular geometry mask at the lens position. Past-era hotspots are clickable only inside the lens. Past-era edges count for links only while the lens covers that edge's endpoint. This is the Act 3 "bridge through 1978" mechanic.
- **Bell**: a global counter. Each `ringBell` plays a bell (synth, or a CC0 sample if one is in the repo). It advances time-of-day one notch across all panels: dusk → evening → night → deep night. Do this with a shared tint/colour-grade uniform or overlay per tile. Previously completed links briefly glow again ("the train remembers").
- **Butch**: a small figure (about 70 px tall at panel scale), procedural or vector: coat, cap, lamp glow. Idle breathing plus a walking cycle. He is placed in tile-local coordinates and moves along script paths across linked tiles; the camera never follows, because he lives inside the pictures.
- **Train** (Act 3): a small train sprite that runs along rail edges across the linked panels.
- **Save**: checkpoints `chapter-1-start` (Act 0, the chapter's start), `chapter-1-act-05` (Act 0.5), `chapter-1-act-1` (Act 1), `chapter-1-act-2`, `chapter-1-act-3`, in `CHECKPOINTS` in `src/shell/saveSystem.js` with route `/night-service.html` and an `act` value. Legacy `prologue-start` (and an old save's `chapter-1-start`) resume at the chapter's start, now Act 0, so old saves still load.
- **Grid growth**: Acts 0 (1×1) and 0.5 (1×2) use the 2×2 window size (`CARRIAGE_TILE`), so the wall can grow around the windows in place. An act with `growFrom: { act, keep: { newTile: oldTile } }` opens without the fade: the kept windows slide from where the previous act left them to their new slots while the old wall panel dissolves into the new one, and each new window opens behind a pair of walnut-and-brass wall panels that slide apart into the wall (with a line of lamplight in the seam and the act's name on the sill). `planGrowth()` in `panelModel.js` is the pure plan; dev `?from=act0` previews it.
- **Stone**: Ember Stone via the existing `magicStones.js` API (see how `prologueNarrativeProps.js` grants chapter-1). Update its clue text.
- **QA hooks (DEV_MODE only)**:
  - `window.render_game_to_text()` returns act, step, grid layout, tile states, overlays, active links, lens position, Butch position, bell count and items.
  - Dev routes `?act=0|0.5|1|2|3`, `?step=<id>` and `?from=<act id>` (grow in from that act).
  - Scripted solutions in `tests/nightService/` drive the pure model through every act. Headless Playwright solve scripts drive the real page with pointer events.

## 5. Art direction (placeholder-but-presentable; final paintings come later)
- The frame around everything is a dark carriage wall: deep walnut `#1c130d` with brass trim `#b08a4a` and rivets. The panels are the windows, with soft rounded corners and a thin brass bezel. There is a warm amber lamp glow from above between panels.
- Inside the panels:
  - Ink linework: warm off-white `#eadfc6`, 2–3 px, slightly irregular (jitter the points ±0.6 px, round caps).
  - Muted fills: navy `#18233a`, teal `#23434a`, amber `#e0a24a`, oxblood `#6b2a22`, ivory `#d8ccb0`.
  - A paper grain overlay from `src/assets/shared/painterly/paper-texture-ivory-v01.png`, multiply at about 10%, plus a vignette per panel.
- Outdoor views reuse the painted panoramas, cropped to the panel:
  - night fields: `world_01_tutorial`
  - city skyline: `world_03_present_city`
  - houses by the water at dusk (use for the Bellwether orchard house and the 1978 views): `world_07_memory`
  - Use the pipeline's generated JPEG chunks under `src/assets/generated/worlds/`, not the full-res masters.
- The 1978 layer is the same composition in a warm sepia grade, with slightly different details (things that were there in 1978).
- Readability: every interactive object gets a paper tag with a tiny amber glint, which is the game's one visual language for "you can act on this". Punched tags show a real hole.
- Motion: ambient drift everywhere (lamp flicker, rain streaks on windows, fields sliding past, steam). It respects Reduce Motion (keep lamps, drop streaks and camera sway).
- Sound: rails clack (synth, low), the bell, paper rustle, punch "clack", drag whoosh. Music is optional; the existing ch1 cues can loop quietly.

## 6. Acts and puzzles

Chapter flow and first-time pacing (target 22–28 min for a first-time player):

| Act | Grid | Teaches | Est. first-time |
|---|---|---|---|
| 0 · ONE WINDOW | 1×1 | zoom in, zoom out, zoom through | 3–4 min |
| 0.5 · TWO WINDOWS | 1×2 | swap; zoom level changes which edges meet | 4 min |
| I · LOST PROPERTY | 2×2 | drag + zoom in the full wall; the chute | 3–4 min |
| II · THE LUGGAGE CAR | 2×2 | the lens (click REQUEST STOP, then the tag), frame lift, the drop | 6–7 min |
| III · TWO TRUE THINGS | 3×2 | past-era edges (the hedge, then the viaduct), the finale | 7–8 min |

The transitions run 0 → 0.5 → I (the wall grows in place) → II → III (fade and title card) → chapter end, unchanged after that.

### Act 0 · ONE WINDOW (1×1, about 3–4 min). Gorogoa's opening: learn zoom with a single picture.
The one window is the lost-property office at night, seen from outside through the carriage glass: rain runs down it. Butch is asleep on his stool at the desk; there is a brass desk bell and a spike of claim stubs.
1. **0.1 The bell.** Clicking the desk bell zooms into it. In its polished curve the room is bent into a reflection, and the Conductor's lantern comes closer in it. The plunger is the only thing to do in the close-up (zoom-out waits for it): striking it rings the bell (sound rings drawn in ink). The ring wakes Butch. The desk bell is not the chapter bell (the count is unchanged).
2. **0.2 Zoom out.** The ⤢ glyph breathes, and the ghost hand shows it (the first-use demo). Back at the desk, Butch sits up.
3. **0.3 The stub.** Clicking the claim stub zooms in: CLAIM 1978-0412, with the Conductor's punch hole showing night through it. Zooming into the hole turns it into a brass porthole over the rainy fields; zooming through the glass lands in a wider picture — the whole carriage from outside in the rain, where the office is one lit window. The view dives back in through that window and the carriage wall slides open a second window beside the first. Checkpoint `chapter-1-act-05`.

### Act 0.5 · TWO WINDOWS (1×2, about 4 min). The swap, then zoom + swap.
Starts in the wrong order, `[stores door | office]`: the office floor leaves its RIGHT edge at 0.78 and the stores door's threshold enters its LEFT edge at 0.78.
1. **Swap them.** Butch stands up and walks across into the door picture. The stores door is locked (he rattles it; its lock glints).
2. **The key line** (zoom and swap together). The office key hangs on a brass cash-carrier wire under the shelf. Zoomed out, the office's wire leaves its LEFT edge at 0.39 and the door's arrives at its RIGHT edge at 0.24: they never meet (an offset shimmer). Zoomed into the key line and into the lock, each close-up carries the wire at 0.44 — but only if the door stands LEFT of the office, the very order puzzle 1 undid. With both close-ups side by side, the carrier runs the key across the gutter, the key turns, both close-ups step back and the door opens on the stores. It is solvable only by combining the two verbs (swaps alone and zooms alone never link), and every move is reversible.
3. **Home.** The desk bell rings on its own — someone is at the counter — and Butch turns toward it. Swap back so he can walk home to the desk. The view zooms through the open door into the stores' wall of pigeonholes, and the wall opens two more windows below (Act 1). Checkpoint `chapter-1-act-1`.

### Act 1 · LOST PROPERTY (2×2, about 3–4 min). Drag + zoom in the full wall.
Opens as the wall grows from Act 0.5: the office and the pigeonholes rise into the top row and the window and the Conductor's door open below. Butch is already awake, standing at his desk. The panels start as:
- **TL "desk"**: Butch at the lost-property desk. The corridor floor (type `floor`) exits the RIGHT edge at `at 0.78`.
- **TR "lockers"**: a wall of pigeonholes. One pigeonhole has an amber tag and is a zoom hotspot.
- **BL "window"**: the carriage window, night fields drifting (painted).
- **BR "door"**: the door to the Conductor's car. Its threshold floor enters from the LEFT edge `at 0.78`. The door has a ticket slot fed by a chute from the TOP edge at `at 0.70` (type `chute`).

Steps:
1. **Swap the desk and the window.** Now "desk" is BL, directly left of "door", and the floor link is active. Butch stands up and walks across into the door panel, then stops at the locked door. The ticket slot flashes. Swapping desk↔door, or putting desk anywhere else, does nothing (a gentle mismatch shimmer at the edge shows why).
2. **Zoom into the tagged pigeonhole** in "lockers" (TR, directly above "door"). The zoomed state shows a claim envelope and a single train ticket resting at a chute opening on the BOTTOM edge `at 0.70` (type `chute`). The link with the door's top chute is active, so the ticket drops through the chute into the slot (animation across the gutter) and the door unlocks.
   - Clicking the envelope shows archive card A1: "Claim 1978-0412 · MARA VELEZ · one case, unclaimed". This is optional but pulses once.
   - If the lockers tile is not above the door when zoomed, the ticket waits at the opening. Swapping it back above the door completes the step.
3. **The door opens.** Butch walks in and the door panel auto-zooms into the Conductor's car. The Conductor hands over the punch (a brief two-line exchange in a small caption bar, typewriter, click to advance). Ring bell #1. The act ends after a 2 s beat with a fade across all four windows. Save `chapter-1-act-2`.

### Act 2 · THE LUGGAGE CAR (2×2, about 6–7 min). Teaches the punch lens + frame lift; hides the Ember Stone.
The panels start as:
- **TL "rack"**: a high luggage rack with two identical brown cases.
- **TR "window"**: the carriage window. Its brass window frame is a liftable FrameDef; the inner view is night fields.
- **BL "aisle"**: Butch in the aisle below the rack, holding his ticket. The rack's BOTTOM-edge drop point `at 0.25` (type `drop`) exists only in state `rack:tilting`.
- **BR "board"**: the timetable board, with stops CITY TERMINAL · … · BELLWETHER (greyed out).

Steps:
1. **Punch the ticket** by clicking the ticket in Butch's hand. Clack. A punched hole pops out and becomes the lens (draggable). Ring bell #2.
2. **Request the stop (the lens-click lesson).** Over "board", the 1978 layer shows a big red enamel REQUEST STOP plate with a brass push. It is ringed in amber inside the lens. Clicking it through the lens punches it: in the present BELLWETHER lights amber. This must happen before the train can arrive (the frame's "arrive" is gated on it) and before the case tag can be marked.
2b. **Look through the lens again (its second use).** Over "rack", the 1978 layer shows tags on both cases: `CITY` and `BELLWETHER` with a hawthorn leaf, the BELLWETHER tag ringed. Clicking it through the lens marks the orchard case, which now has an amber glint in the present too.
3. **Zoom into the marked case's tag** (present, now enabled). It shows a postcard of the orchard house at Bellwether (painted `world_07_memory` crop, sepia). Zoom again into the postcard picture itself: the whole panel becomes the orchard house scene at dusk.
4. **Lift the window frame** off "window" and drop it onto the orchard scene. The overlay composite means the train is now AT Bellwether:
   - the carriage slows (all panels ease their drift);
   - "rack" switches to `rack:tilting`;
   - the orchard case slides to the rack's drop point.
   - If "rack" is above "aisle" (the drop↔arms link is active), the case falls into Butch's arms. This is "the first weight": Butch staggers and the case is heavy. If it isn't above, the case waits at the edge: it visibly teeters over the drop point, the rack's waiting edge glows, and the aisle's ceiling hatch glows back.
   - Ring bell #3.
5. **Ember Stone (optional, deep zoom).**
   - Zoom into the case in Butch's arms to see the open case.
   - Zoom into the unfinished letter to Rosa (archive card A2, 2–3 lines).
   - Zoom beneath the letter to find the small glowing EMBER STONE. Click it to take it.
   - The window bezel gains a row of five empty stone sockets; one fills. This communicates that there are more stones, with no text.
   - Leaving the act without the stone is allowed.
6. The act ends when Butch holds the case and the player zooms back out to the aisle. Fade, then save `chapter-1-act-3`.

### Act 3 · TWO TRUE THINGS (3×2, about 7–8 min). Everything combined; the lens as a bridge; the bell finale.
Top row:
- **"city room"**: Mara's rented room, with a window (liftable frame), a bed and a hot plate. The city skyline is painted outside.
- **"hawthorn"**: an orchard lane with a hawthorn tree. A path exits left and right.
- **"orchard house"**: its upstairs window is circled on the postcard.

Bottom row, rails:
- **"carriage"**: Butch with the case in a carriage, with a rail exit on the RIGHT `at 0.85`.
- **"gap"**: a broken viaduct where the present rail is missing. In the 1978 layer the rail is intact at `at 0.85` on both sides, as a past-era edge.
- **"platform"**: the Bellwether platform, with a rail entering LEFT `at 0.85`.

Steps:
1. **Two rooms, one window.** Lift the city room's window frame and drop it onto the orchard house. Inside the frame, the orchard house's upstairs window lines up with the city window, making one picture of both homes. A silhouette of Mara appears in the combined window, turns, and leaves the frame. This is the story beat: she was one person in two true places.
   - Archive card A3 appears: the clerk's note "maintained the city room for work and returned to Bellwether on weekends".
   - Then the Archivist's red pencil strikes a line through the card's "second claim" line. This is the first sign that someone edits the archive.
   - Ring bell #4.
2. **Follow her down the lane.** Mara's silhouette is now visible walking in "hawthorn". The player must order the top row city room → hawthorn → orchard house so that the lane links (path edges `at 0.62`).
   - **The hedge (past-era edges, low stakes).** At night the lane's last stretch is a hawthorn hedge grown across it: the path between "hawthorn" and "orchard house" exists only in 1978 (an open gate with a lamp on its post). Mara stops at the hedge. Holding the lens on the joint rings it in amber and opens the lane; her silhouette crosses. If the lens leaves mid-hedge she steps back and waits. Nothing can be lost here.
   - She walks on and ends at the edge above "platform".
   - A zoom-out on "orchard house" reveals that it overlooks the platform. The zoomed-out state is what exposes the bottom edge that connects visually.
3. **Build the line** (the finale escalates the hedge's idea). The bottom row must read carriage → gap → platform. The present gap has no rail, so the rail link fails.
   - The player drags the punch-hole lens over the gap. In 1978 the viaduct is whole; with the lens held there, the past-era rail edges become active.
   - The train (with Butch and the case) runs from "carriage" through the lens into "platform". The lens must stay put: if the player moves it while the train is crossing, the train stops safely and waits.
   - Ring bell #5, the finale. As the train passes, each previously built link in the chapter briefly glows again, like memory lights along the line.
4. **Too late, or just in time.** On "platform", Mara, seen from behind, boards a different train on the far track. That train pulls away as ours arrives. Butch sets the orchard case down on the bench. The final two-line caption comes from the Conductor: "She's always one stop ahead. The line keeps going." Fade.
   - Then save `chapter-2-start` and play `/cinematics/1-2.mp4` via `playCinematic` (preload chapter 2 as today), which leads into Chapter 2.

## 7. Integration
- Title → New Game → `start.mp4` → `/night-service.html` (Act 0 · ONE WINDOW). Continue/Load uses the checkpoints above; the pause menu adds SHOW ME.
- After Act 3: `1-2.mp4` → Chapter 2. Until the new Chapter 2 exists, this goes to the existing parkour (`/?play=1` launching `chapter-2`, as `CHECKPOINTS` does today).
- Chapter select (dev) and the `1111` router (dev only) get entries for every act (0, 0.5, I, II, III).
- `vite.config.js`: add the `night-service.html` input.
- `CREDITS.md`: no new third-party assets unless added (and then documented).

## 8. Acceptance
- A new player can finish all five acts in 22–28 minutes with zero text instructions (the only words are the story's own and, after two idle minutes, a Conductor line). Each verb is taught by exactly one "only move possible" puzzle before it is combined.
- No required action's only affordance is a faint glint: past-era interactables are ringed inside the lens.
- No dead ends: any action that would strand progress is reversible (zoom out, drag back, lift the frame back, move the lens).
- Keyboard-only completion is possible.
- Scripted model tests solve every act, BFS/goal-directed searches prove no dead ends, and the hint tier timing and grid growth plans have model tests. Headless Playwright runs solve Acts 0, 0.5 and the changed parts of 2 and 3 with real pointer input; screenshots of every step and of each hint tier are inspected.
- `npm run build`, all node tests and `git diff --check` pass; prod ignores dev routes.
