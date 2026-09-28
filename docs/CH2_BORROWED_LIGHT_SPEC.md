# Chapter 2 · BORROWED LIGHT — side-scrolling rebuild spec (v1, 2026-09-28)

Status: READY (product decision 2026-09-28). This replaces the cyberpunk parkour (`src/cars/cyberpunkParkour/`).
The chapter title changes from the mixed "CYBERPUNK PARKOUR / THE SAFETY TEST / BORROWED GRID" to **BORROWED LIGHT**. The Chapter 5 mini-game `borrowed-grid.html` keeps its own name.
Chapter 1 has become a mouse-driven panel puzzle (see `CH1_NIGHT_SERVICE_PANELS_SPEC.md`). Chapter 2 is deliberately a contrast: a movement chapter with the same visual language (paper tags with an amber glint, the ticket punch, the bell) and the same story thread.

## 1. Fantasy
The train stops at an archived city whose lights run on time borrowed from the train. Butch chases Mara across wet rooftops. She is always one roof ahead. He punches the city's grid nodes so that lifts, bridges and signs switch on at the next bell, exactly when he needs them.

## 2. Story beats
- **Start:** the train pulls into a rooftop terminal in the rain. A ROOFTOP MECHANIC (NPC) recognises the punch: "She came through three nights ago. Took the same roofs. Said you'd be along." This is the only NPC.
- **Midpoint:** the city starts taking its light back (blackout). Through a dark hotel window Butch sees Mara's ticket stub pinned to the glass. It is a punched city-line ticket, matching the Chapter 1 file.
- **End:** at the evacuation platform a letter waits on a bench: "Butch — … keep moving." Mara has boarded the train ahead. Keep the exact letter text from `CyberpunkParkourScene.js`. This sets up Chapter 3's "Train Mara".
- Do not write lines that define Butch's relation to Mara.

## 3. Controls
| Action | Keys | Gamepad |
|---|---|---|
| Move | A / D, ← → | left stick |
| Jump | Space (hold for height) | A / × |
| Interact / read | E | X / □ |
| Punch the targeted node | F or left mouse (auto-targets the nearest node in range, about 220 px, highlighted) | RB / R1 |
| Listen (preview what the next bell will do: ghost outlines of the machines that will move) | hold Q | LB / L1 |
| Pause | Esc | Start |

## 4. Core system: the city's timetable
- A **bell** rings every **4.0 s**. A meter at the top centre shows the next bell. This is the same bell graphic and sound family as Chapter 1.
- **Grid nodes** are lamp boxes on poles and walls, each with a paper tag. Punching a node queues it (the tag shows a hole). On the next bell every queued node fires and powers its linked machine for that machine's `duration`:
  - lift platform rises;
  - telescopic bridge extends;
  - billboard becomes a solid lit platform;
  - vent fan updraft;
  - shutter opens;
  - points switch.
  - Then the machine returns, telegraphed with a 0.6 s flicker before it switches off.
- **One line, one borrowed moment.** Each node belongs to a coloured line (amber, teal, rose). Punching a second node on the same line cancels the first (its tag hole seals with a small fizzle). This is the puzzle constraint.
- Machines and their power state are always visible in the world: cables glow along the line when queued, and brighten on the bell.
- **Failure:** falling off drops the player into rain mist, followed by a 0.6 s fade and a respawn at the last passed street-lamp checkpoint. There are no spikes, no electrocution and no precision pixel jumps. Queued punches clear on respawn.

## 5. Sections (about 12–15 min total)
### A · RAIN ROOFTOPS (about 4 min). Learn the punch; then timing; then the one-line rule.
1. **A gap with a telescopic bridge.** Its node is right beside the start. The mechanic's first line points at it. The player punches, the bell rings, the bridge extends, and the player crosses.
2. **A lift up to a higher roof.** Punch the lift and the lift rises on the bell.
3. **A lift then a bridge on different lines.** Punch both and ride the lift up; the bridge is already out when the player arrives.
4. **The one-line rule.** Two nodes on the same amber line power a bridge and a billboard. Only the billboard route continues; the bridge leads to a view of Mara one roof ahead, who jumps off-screen.
5. **A vent updraft.** Punch the fan and ride the updraft.
**Lamp checkpoints** sit after steps 2 and 4.

### B · BLACKOUT (about 4–5 min). The city takes its light back.
- It enters with a cut: every sign dies, the rain gets louder, and the screen darkens. Butch's lamp gives a small radius. Keep it readable: platform edges carry a faint rim.
- **Memory light:** a node the player punched in this section leaves an afterglow for 6 s after its bell. The afterglow illuminates the surrounding roofs, revealing platforms that are solid but unseen in the dark.
- **Twist:** power for the hotel lift is only available if the player deliberately cuts (unpunches, by punching its node again) a line that is currently holding a bridge open, then crosses before it retracts. This is a timing twist on the one-line rule.
- **GRID STONE (optional):** a high ledge visible only in the afterglow of a specific punched node. Reaching it needs one extra lift. Grant it through the `magicStones.js` API with id `chapter-2`. Update its clue text.
- **Hotel window:** Mara's punched ticket stub is pinned to the glass. E reads archive card B1.
- A lamp checkpoint sits at the section start and after the hotel.

### C · EVACUATION PLATFORM (about 4 min). A departure countdown.
- The train's departure bell counts down 8 bells, shown in the bell meter as a distinct ring colour.
- Chain lines to light the platform lamps and throw the points: points switch, platform lift, final bridge.
- There is no fail state at the end. If the player is late or stuck when the countdown ends, the train "remembers" the punches made in this section and fires them itself in sequence, so the final bridge lowers and Butch runs aboard. Players who solve it in time get a slightly calmer ending shot (the train waits with its door open).
- Mara's letter is on the bench. E reads it (keep the old letter text).
- Then: save `chapter-3-start` → `playCinematic` `2-3.mp4` with the chapter-3 preload gate → `/car03-3d.html`. This is the same exit as today.

## 6. Tech
- A new page `borrowed-light.html` + `src/borrowedLight-main.js`, with its own Phaser game at **1920×1080**, antialiased, Arcade physics. The shared shell is used:
  - pause menu with per-chapter controls, settings, reduce motion (drop rain and camera shake), text size;
  - saves, stones, cinematics and the desktop bridge.
- Data-driven level: `src/chapters/borrowedLight/level.js` (geometry, nodes, lines, machines, checkpoints, triggers). Keep the pure `timetableModel.js` (bell clock, queue, one-line rule, machine timers, memory light) free of Phaser, with node tests.
- **Player:** new controller with coyote time 100 ms, jump buffer 120 ms and variable jump height. Target a tuned feel: max run about 420 px/s, jump apex about 180 px.
- **Camera:** it follows with lookahead, and on bells briefly frames the machine that just moved when it's off-screen, but only if it is part of the current puzzle.
- **Art (placeholder-but-presentable):** the far background is a painted panorama from `src/assets/generated/worlds/world-04-retro-cyberpunk`, graded darker and colder so it sits behind a rain layer. It uses the same visual language as Chapter 1, and the result should read as "the same night seen from a roof", not as a different game:
  - Mid and near rooftops are procedural silhouettes: near-black walnut and teal with warm window lights and ink rim lines in `#eadfc6`.
  - Rain streaks, puddle reflections and neon kept low-saturation (amber, teal, rose only).
  - Paper tags with an amber glint mark nodes.
  - Butch has a coat, cap and lamp, matching Chapter 1's figure but larger (about 110 px) with a proper run/jump/fall/land cycle.
- **Save checkpoints:** `chapter-2-start`, `chapter-2-midpoint` (the start of section B) and `chapter-2-platform` (the start of section C). Remap the existing ids to the new page so old saves load.
- **QA (DEV_MODE only):**
  - `render_game_to_text` returns section, player position and velocity, queued nodes, machine states, bell phase, checkpoint and stone.
  - Dev routes `?section=A|B|C`.
  - Scripted solve tests on the model.
  - A headless Playwright run that plays section A with real key input.

## 7. Acceptance
- Every mechanic is readable from the world: cables and tags show what a node powers before the bell.
- Nothing is required that the player hasn't been shown; there are no hidden "8 objects + 4 cars" completion checks.
- There are no dead ends: every machine resets, and every queued punch can be changed.
- Checks pass: build, tests, a prod build that ignores dev routes, and `git diff --check`.
