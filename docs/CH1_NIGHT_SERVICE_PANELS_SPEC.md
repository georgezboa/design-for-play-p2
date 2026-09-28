# Chapter 1 · NIGHT SERVICE — panel-puzzle rebuild spec (v1, 2026-09-28)

Status: READY (product decision by George 2026-09-28: "you decide; the goal is to ship it and make it fun").
Replaces the side-scrolling Prologue (GameScene + TimetablePuzzle + 6 junctions). The old code stays in the repo until the new chapter fully works end-to-end.

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

No text tutorials. Each verb is taught by one puzzle whose only possible action is that verb, plus a hover affordance (cursor change and shimmer). After 45 s idle on an unsolved step, pulse the relevant element softly. This is a hint, not text.

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
- **Save**: checkpoints `chapter-1-start` (Act 1), `chapter-1-act-2`, `chapter-1-act-3`. Add them to `CHECKPOINTS` in `src/shell/saveSystem.js` with route `/night-service.html` and an `act` param. Keep legacy `prologue-start` mapping to Act 1 so old saves still load.
- **Stone**: Ember Stone via the existing `magicStones.js` API (see how `prologueNarrativeProps.js` grants chapter-1). Update its clue text.
- **QA hooks (DEV_MODE only)**:
  - `window.render_game_to_text()` returns act, step, grid layout, tile states, overlays, active links, lens position, Butch position, bell count and items.
  - Dev routes `?act=1|2|3` and `?step=<id>`.
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

### Act 1 · LOST PROPERTY (2×2, about 3–4 min). Teaches drag + zoom.
The panels start as:
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

### Act 2 · THE LUGGAGE CAR (2×2, about 5 min). Teaches the punch lens + frame lift; hides the Ember Stone.
The panels start as:
- **TL "rack"**: a high luggage rack with two identical brown cases.
- **TR "window"**: the carriage window. Its brass window frame is a liftable FrameDef; the inner view is night fields.
- **BL "aisle"**: Butch in the aisle below the rack, holding his ticket. The rack's BOTTOM-edge drop point `at 0.25` (type `drop`) exists only in state `rack:tilting`.
- **BR "board"**: the timetable board, with stops CITY TERMINAL · … · BELLWETHER (greyed out).

Steps:
1. **Punch the ticket** by clicking the ticket in Butch's hand. Clack. A punched hole pops out and becomes the lens (draggable). Ring bell #2.
2. **Look through the lens.** Over "rack", the 1978 layer shows tags on both cases: `CITY` and `BELLWETHER` with a hawthorn leaf. Over "board", the 1978 layer shows BELLWETHER lit as a REQUEST STOP. Clicking the BELLWETHER tag through the lens marks the orchard case, which now has an amber glint in the present too.
3. **Zoom into the marked case's tag** (present, now enabled). It shows a postcard of the orchard house at Bellwether (painted `world_07_memory` crop, sepia). Zoom again into the postcard picture itself: the whole panel becomes the orchard house scene at dusk.
4. **Lift the window frame** off "window" and drop it onto the orchard scene. The overlay composite means the train is now AT Bellwether:
   - the carriage slows (all panels ease their drift);
   - "rack" switches to `rack:tilting`;
   - the orchard case slides to the rack's drop point.
   - If "rack" is above "aisle" (the drop↔arms link is active), the case falls into Butch's arms. This is "the first weight": Butch staggers and the case is heavy. If it isn't above, the case waits at the edge.
   - Ring bell #3.
5. **Ember Stone (optional, deep zoom).**
   - Zoom into the case in Butch's arms to see the open case.
   - Zoom into the unfinished letter to Rosa (archive card A2, 2–3 lines).
   - Zoom beneath the letter to find the small glowing EMBER STONE. Click it to take it.
   - The window bezel gains a row of five empty stone sockets; one fills. This communicates that there are more stones, with no text.
   - Leaving the act without the stone is allowed.
6. The act ends when Butch holds the case and the player zooms back out to the aisle. Fade, then save `chapter-1-act-3`.

### Act 3 · TWO TRUE THINGS (3×2, about 6–7 min). Everything combined; the lens as a bridge; the bell finale.
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
2. **Follow her down the lane.** Mara's silhouette is now visible walking in "hawthorn". The player must order the top row city room → hawthorn → orchard house so that the lane links (path edges `at 0.62`). She walks through them and ends at the edge above "platform".
   - A zoom-out on "orchard house" reveals that it overlooks the platform. The zoomed-out state is what exposes the bottom edge that connects visually.
3. **Build the line.** The bottom row must read carriage → gap → platform. The present gap has no rail, so the rail link fails.
   - The player drags the punch-hole lens over the gap. In 1978 the viaduct is whole; with the lens held there, the past-era rail edges become active.
   - The train (with Butch and the case) runs from "carriage" through the lens into "platform". The lens must stay put: if the player moves it while the train is crossing, the train stops safely and waits.
   - Ring bell #5, the finale. As the train passes, each previously built link in the chapter briefly glows again, like memory lights along the line.
4. **Too late, or just in time.** On "platform", Mara, seen from behind, boards a different train on the far track. That train pulls away as ours arrives. Butch sets the orchard case down on the bench. The final two-line caption comes from the Conductor: "She's always one stop ahead. The line keeps going." Fade.
   - Then save `chapter-2-start` and play `/cinematics/1-2.mp4` via `playCinematic` (preload chapter 2 as today), which leads into Chapter 2.

## 7. Integration
- Title → New Game → `start.mp4` → `/night-service.html` (Act 1). Continue/Load uses the new checkpoints.
- After Act 3: `1-2.mp4` → Chapter 2. Until the new Chapter 2 exists, this goes to the existing parkour (`/?play=1` launching `chapter-2`, as `CHECKPOINTS` does today).
- Chapter select (dev) and the `1111` router (dev only) get entries for the acts.
- `vite.config.js`: add the `night-service.html` input.
- `CREDITS.md`: no new third-party assets unless added (and then documented).

## 8. Acceptance
- A new player can finish all three acts in 14–18 minutes with zero text instructions. Each verb is taught by exactly one "only move possible" puzzle before it is combined.
- No dead ends: any action that would strand progress is reversible (zoom out, drag back, lift the frame back, move the lens).
- Keyboard-only completion is possible.
- Scripted model tests solve every act. A headless Playwright run solves Act 1 end-to-end with real pointer input, and screenshots of every step are inspected.
- `npm run build`, all node tests and `git diff --check` pass; prod ignores dev routes.
