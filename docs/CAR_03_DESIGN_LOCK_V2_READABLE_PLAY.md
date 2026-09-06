# CAR 03 V2 — MOVE AS ONE — READABLE PLAY DESIGN LOCK

Status: `USER-ORDERED REDESIGN / READY FOR IMPLEMENTATION`

This document supersedes the gameplay, teaching, pacing, interaction-priority, and completion rules in `CAR_03_DESIGN_LOCK.md`. The old document remains historical evidence. Existing tests that enforce superseded behavior must be replaced with honest V2 behavior tests, not preserved as product requirements.

## 1. Player-facing promise

> Reach the last train door. The inspection system flags anyone moving alone. Match another passenger's pace and cross each scanner together.

The player must be able to explain the game after the first safe scanner:

1. I am trying to reach the last door.
2. A red scanner catches people moving alone.
3. I press E beside a highlighted passenger or group to match their pace.

The thematic reveal is not hidden behind documentation:

> The scanner recognizes coordinated movement, not crowd size. Two people moving together count.

## 2. Controls and invariant meanings

| Input | Meaning |
|---|---|
| A / Left | Walk left |
| D / Right | Walk right |
| W/S or Up/Down | Move diagonally between the far and near lanes |
| E | MATCH PACE with the highlighted target; while matched, E means RELEASE |
| R | Restart the current Car 03 slice |

`E` has exactly one conceptual meaning: **change whether the player is matching the highlighted/current target**.

Removed from V1:

- E does not separately mean rescue, transfer, detach, and establish duo.
- No overlap-zone transfer priority chain.
- No invisible 350 ms footprint test.
- No automatic completion merely because hidden alignment values happen to match.
- No requirement to understand `anchoredGroupId`, exposure milliseconds, or section indices.

## 3. Camera and space

- Reference canvas: 960×600.
- Side-on 2.5D carriage, never over-the-shoulder.
- Five authored bays across one car, each approximately one viewport wide.
- Camera locks to the active bay. On crossing a bay door, it eases to the next bay over 500 ms, then locks again.
- The player can always see the current scanner gate and the passengers needed to solve it in the same camera view.
- Far lane is visually higher and 0.88 actor scale. Near lane is lower and 1.0 actor scale.
- Lane changes take 250 ms and visibly move diagonally. No teleporting between two y-values.

## 4. Core interaction contract

### Targeting

The nearest eligible target in the same lane within 100 px receives all of:

- a high-contrast white/cyan outline;
- a small footstep icon above its feet;
- a bottom-centre prompt: `[E] MATCH PACE`;
- a short two-note footstep preview.

No eligible target means no E prompt. The player never has to guess what E will affect.

### Matching

Pressing E starts a visible 250 ms step-in animation and connects the player to the target with a cyan floor ribbon. The linked actors' footfalls pulse together. The scanner lens and floor marks use the same status language:

- red triangle + `ALONE`: unsafe;
- amber narrowing brackets + `WARNING`: about to be flagged;
- cyan linked footprints + `MATCHED`: safe.

These states must use shape, icon, animation, and text in addition to colour.

While matched to a moving group, holding D moves the player at that group's visible pace. A/D can adjust position inside the formation by at most 40 px. Leaving the lane, moving more than 100 px away, or pressing E releases the match with an audible snap and a fading ribbon.

### Two-person match

The teal-scarf companion is a normal match target. Pressing E beside them uses the same prompt and same animation as matching a group. There is no special unexplained rescue action.

After matching the companion, the pair must make **three consecutive rightward synchronized steps**. Three large footprint pips fill beside the pair: `○ ○ ○` → `● ● ●`. Stopping pauses progress; reversing or separating resets only these pips. This is the final skill check the player can see and understand.

## 5. Scanner contract

- Scanners are fixed ceiling-rail inspection gates, not free-flying drones.
- Every scanner has a visible lens, a floor landing zone, and a diegetic result panel.
- The active scan volume is one coherent world-space trapezoid approximately 180 px wide.
- A matched player makes the lens cyan and the result panel show `PATTERN OK` before entering the centre of the gate.
- An unmatched player inside the scan volume receives 600 ms of amber warning, then is flagged at 1500 ms.
- Flagging freezes the scene for 350 ms, displays `ALONE — MATCH SOMEONE`, and returns the player to that bay's safe line. It does not restart the whole car.
- The first teaching scanner cannot flag the player before the environmental demonstration and prompt have completed.
- No numerical exposure bar is shown.

## 6. Five-beat level plan

Target total first-play length: 3–5 minutes.

### Beat 0 — SEE THE RULE — safe environmental demonstration

Intensity: 0.1. Target duration: 15–20 seconds.

- The last door is briefly framed in the distance, then the camera settles on the first bay.
- Top-left objective card: `REACH THE LAST DOOR`.
- A lone commuter walks through a scanner. The cone turns amber, then red; the commuter is gently redirected.
- Immediately afterward, a group walks through. Linked footprints pulse; the scanner turns cyan and displays `PATTERN OK`.
- A single caption appears for no more than four seconds: `SCANNERS FLAG PEOPLE MOVING ALONE.`
- The player cannot be punished during this demonstration.

Exit condition: demonstration has played once. The player remains in control afterward.

### Beat 1 — MATCH — safe practice

Intensity: 0.2. Target duration: 30–45 seconds.

- A slow group waits or loops within the camera view before Scanner 1.
- On approach it is highlighted and `[E] MATCH PACE` appears.
- E creates the cyan ribbon and matched footsteps.
- Objective changes to `MATCH A GROUP, THEN WALK THROUGH`.
- Scanner 1 is forgiving: if the player enters alone, it pauses at amber and points back to the highlighted group rather than flagging them.
- Crossing while matched opens the bay door with a cyan sweep.

This beat alone must teach the complete basic loop.

### Beat 2 — CHOOSE — lane and group application

Intensity: 0.45. Target duration: 45–60 seconds.

- Both lanes are clearly visible in one screen.
- A slow near-lane group and a fast far-lane group approach Scanner 2.
- A temporary luggage obstruction makes the current group route unsuitable, visually pointing to the other lane.
- Objective: `RELEASE. CHANGE LANE. MATCH THE OTHER GROUP.`
- The player presses E to release, W/S to make a visible diagonal lane change, then E beside the other highlighted group.
- Scanner 2 uses the real warning/flag/checkpoint rules.

The solution is spatial and visible. No hidden overlap transfer exists.

### Beat 3 — TWO CAN MATCH — safe twist

Intensity: 0.25. Target duration: 35–50 seconds.

- A quiet passenger with a large teal scarf waits alone beside a non-punishing calibration arch.
- The crowd continues without them. The companion looks toward the player, then toward the arch.
- Objective: `MATCH THE PASSENGER IN THE TEAL SCARF.`
- E uses the ordinary match interaction.
- The three synchronized footprint pips appear. Walking right together fills all three.
- The calibration arch turns cyan and displays `2-PERSON PATTERN ACCEPTED`.

This is the rest beat before the climax and explicitly teaches the final rule.

### Beat 4 — ALERT — final test

Intensity: 0.8. Target duration: 45–75 seconds.

- Red pillar strips and an alarm activate. Large crowds visibly run toward both outer doors, clearing the centre.
- The final scanner remains red; the exit door is visible behind it.
- The player and teal-scarf companion become separated by the dispersal but remain in the same camera view.
- Objective: `FIND YOUR PARTNER. MATCH. TAKE THREE STEPS.`
- The companion receives a teal scarf flash and a persistent footstep icon, not a large glowing circle.
- The player reaches them, presses E, and walks three synchronized steps.
- The final scanner changes from red to cyan before the pair enters it.
- Crossing together completes the car.

Completion sequence:

1. action slows to 70% for 500 ms;
2. scanner panel reads `COORDINATED PATTERN ACCEPTED`;
3. the companion glances back at the player;
4. the last door opens and warm exterior light enters;
5. chapter transition begins only after the player walks through the door.

No fireworks are required. The success is the door and the acknowledged relationship.

## 7. Player-facing UI

### Objective card

- Top-left safe-area anchored container, maximum width 360 px.
- 24 px minimum text at 960×600.
- One verb-led sentence only.
- Updates on beat transitions, not every frame.
- Uses an icon plus text; never colour alone.

### Interaction prompt

- Bottom centre, above the floor and inside safe area.
- 26 px minimum text with a visible E keycap.
- Appears only when the affected target is visibly outlined.
- `MATCH PACE` while free; `RELEASE` while matched.

### Scanner feedback

- World-space and attached to the physical scanner.
- Result words are short: `ALONE`, `WARNING`, `PATTERN OK`.
- No side panel shrinking the 960×600 play canvas.

### Accessibility

- Critical text never below 20 px at reference resolution.
- All red/cyan distinctions also use triangle/link shapes and words.
- Reduce-flash mode replaces full red flashes with a steady border pulse.
- Prompts survive 960×600 and 1280×720 without clipping.

## 8. Visual direction

- Warm illustrated 2.5D commuter carriage remains the target.
- Hero silhouette: rolled sleeves, open cardigan, crossbody bag.
- Companion silhouette: dark coat and large teal scarf.
- Scanners are integrated into the ceiling rail.
- Background city is softened and subordinate to actors.
- Actor silhouettes must be readable without relying only on colour.
- Current `outputs/car03-a2-production-assets/` may be used as a structural/prototyping kit, but its proof images are **not final-art accepted**. Do not claim final visual approval merely because those files are integrated.
- Do not crop concept boards into production sprites.

## 9. Audio and feel

- Match available: two soft preview footfalls.
- Match successful: two footfalls snap into the same rhythm plus a warm confirmation tone.
- Release: brief cloth/step separation sound.
- Scanner warning: three accelerating ticks, spatially attached to scanner.
- Flag: muted inspection stamp, no harsh damage sound.
- Three-step duo: one note per footprint, resolving on the third.
- Alert: low carriage alarm under the footstep rhythm; dialogue remains audible if later added.

Use subtle 2–4 px camera impulse only on flag and final door opening. No constant shake.

## 10. State and completion requirements

The public diagnostic surface must expose at least:

- `beatId` and `objectiveId`;
- player position/lane/checkpoint;
- `target.kind`, `target.id`, `target.eligible`;
- `match.active`, `match.targetId`, `match.kind`;
- `duoSteps` from 0 to 3;
- each scanner's state: `idle | warning | flagged | safe`;
- alert state;
- last door state;
- complete state.

Completion requires all of:

1. Beat 4 active;
2. companion match active;
3. three synchronized steps completed;
4. player and companion cross the final scanner;
5. player crosses the open final door.

Walking to the end without matching cannot complete.

## 11. Human acceptance gate

A first-time player receives no verbal explanation beyond the game itself.

Pass only if:

- within 20 seconds they can point to the destination and scanner danger;
- within 45 seconds after gaining control they intentionally press E on the highlighted first group;
- they can explain that E means match/release pace;
- after the lane obstruction they deliberately change lane and choose the other group;
- in the final alert they identify the teal-scarf companion without being told;
- they understand the three footprint pips and complete the final gate;
- after play they can state: “the scanner cares about coordinated movement, not the number of people.”

Automated completion, QA warps, or an agent knowing the internal model cannot substitute for this blind-play gate.

