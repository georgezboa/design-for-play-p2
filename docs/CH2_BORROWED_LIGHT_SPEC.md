# Chapter 2 · BORROWED LIGHT — side-scrolling spec (v2, 2026-10-01)

Status: READY (round 3 owner feedback, 2026-10-01). v1 (2026-09-28) replaced the cyberpunk parkour (`src/cars/cyberpunkParkour/`). v2 keeps the bell-and-punch core and the story beats, makes the nodes reliable and honest, adds lamps, and develops the core into three new mechanics (each taught alone, then combined, then twisted) so the chapter is not just a parkour run.
The chapter title is **BORROWED LIGHT**. The Chapter 5 mini-game `borrowed-grid.html` keeps its own name.
Chapter 1 is a mouse-driven panel puzzle (see `CH1_NIGHT_SERVICE_PANELS_SPEC.md`). Chapter 2 is deliberately a contrast: a movement chapter with the same visual language (paper tags with an amber glint, the ticket punch, the bell) and the same story thread.

## 1. Fantasy
The train stops at an archived city whose lights run on time borrowed from the train. Butch chases Mara across wet rooftops. She is always one roof ahead. He punches the city's grid nodes so that lifts, bridges and signs switch on at the next bell, exactly when he needs them. When the city takes its light back, he carries what light is left in his own lamp.

## 2. Story beats
- **Start:** the train pulls into a rooftop terminal in the rain. A ROOFTOP MECHANIC (NPC) recognises the punch: "She came through three nights ago. Took the same roofs. Said you'd be along." This is the only NPC.
- **The chase (end of A):** Mara waits one roof ahead across a gap of window cradles, looks back, and runs when Butch is nearly across; the city's bell quickens while she does. She drops toward the hotel as the blackout falls.
- **Midpoint:** the city takes its light back (blackout). Through a dark hotel window Butch sees Mara's ticket stub pinned to the glass: a punched city-line ticket, matching the Chapter 1 file.
- **End:** at the evacuation platform a letter waits on a bench: "Butch — … keep moving." Mara has boarded the train ahead. The letter text is kept word for word. This sets up Chapter 3's "Train Mara".
- Do not write lines that define Butch's relation to Mara.

## 3. Controls
| Action | Keys | Gamepad |
|---|---|---|
| Move | A / D, ← → | left stick |
| Jump | Space (hold for height) | A / × |
| Interact / read; borrow / give light (blackout) | E | X / □ |
| Punch the marked node | F, or left-click (a click on a node in reach punches that node) | RB / R1 |
| Take a punch back | hold F (or hold the click) on a punched node, ~0.5 s, a ring fills | hold RB / R1 |
| Listen (preview what the next bell will do: ghost outlines of the machines that will move) | hold Q | LB / L1 |
| Pause | Esc | Start |

## 4. Core system: the city's timetable (`timetableModel.js`, pure, tested)
- A **bell** rings every **4.0 s** (2.5 s during the chase). A meter at the top centre shows the next bell, with the same bell graphic and sound family as Chapter 1.
- **Grid nodes** are lamp boxes on poles with a paper tag. Punching a node queues it (the tag shows a hole). On the next bell every queued node fires and powers its linked machine for that machine's `duration`: lift, telescopic bridge, lit billboard platform, vent updraft, points, window cradle, sign. Then the machine flickers for 0.6 s and returns.
- **One line, one borrowed moment.** Each node belongs to a coloured line (amber, teal, rose) in its district. A line carries one claim at a time: a second punch on the same line replaces the first (the first tag's hole seals); while the line powers a machine it is busy and refuses other nodes. A line the city holds open can be **cut** (2 s grace, then it frees).
- **Two-phase lines (v2).** Some lines ring only on odd bells (stamped **I** on their tags) or only on even bells (**II**). A punch on them waits, queued, for its own bell. Where a district has phased lines, the meter shows the number of the coming bell, and the line tags under it carry the stamps.
- **Borrowed light (v2, section B).** Some nodes are **dead**: no line reaches them (cut cable, cracked lens, stamped-through tag). Butch's lamp can take the light out of a lit *borrowable* machine (the city's lanterns, and the machines in the borrow rooms). Taking it switches the source off: a bridge retracts, a lift goes home. He carries one charge at a time (his lamp burns warm white; a lantern glyph shows on the HUD). E at a dead node gives it; the node fires on the next bell. The light remembers its source: when the machine it powers switches off, or when Butch falls, it flies home and the source is restored, so nothing can be stranded. The carried light is borrowed light: it shows (and holds) the dark decks around Butch.
- **Counterweight pair (v2, section C).** Two cages on one axle; the walkway cage hangs on a larger drum. While the brake is released (powered, on the bell like every machine), the cage Butch stands in sinks and the other rises; locked otherwise.
- **Forgiveness and honesty (round 3 fixes, §8, §9).** A punch up to 120 ms after a bell catches that bell — never for half of a puzzle pair (A3, A7, the chase), and never while another punch waits in the same room. A press never takes a punch back: pressing a punched node again says PUNCHED · RINGS ON BELL I (its tag adds HOLD F · TAKE BACK); holding F, the click or RB on it for 0.5 s takes it back, with a filling ring and TAKEN BACK. A lift whose bell comes while Butch is still walking to it (on its floor, within ~1.5 s) waits one ring of its line, blinking, and the rest of its room waits with it, so a pair keeps its order. The lamp never borrows the light of the machine Butch stands on or rides: STEP OFF FIRST. Punching a running timed machine renews it at the next bell instead of switching it off. The marked node is exactly what F, E or a click acts on, and its tag says beforehand what the press will do (PUNCH · RINGS ON II, SAME LINE · AMBER FORGETS THE OTHER, LINE BUSY, PUNCHED · RINGS ON BELL I, RENEW, CUT, BORROW, GIVE, STEP OFF FIRST…). A press with nothing in reach names the nearest node: OUT OF REACH.
- Machines and their power state are always visible in the world: cables glow along the line when queued and brighten on the bell; borrowed light runs warm white.
- **Failure:** falling off drops the player into rain mist, a 0.6 s fade, and a respawn at the last passed street-lamp checkpoint (the lamp lights when passed). No spikes, no electrocution, no precision pixel jumps. Queued punches clear on respawn — the tags seal visibly and a line says so; borrowed light goes home; the counterweight resets.

## 5. Sections (about 22–28 min total)
Each new mechanic: taught alone (safe), combined with an earlier one, then one twist.

### A · RAIN ROOFTOPS (about 9–10 min). The punch, timing, the one-line rule; then two bells.
1. **A gap with a telescopic bridge.** Its node is right beside the start; the mechanic points at it.
2. **A lift up to a higher roof.**
3. **A lift then a bridge on different lines.** Punch both and ride the lift up; the bridge is already out when the player arrives.
4. **The one-line rule.** Two nodes on one amber line power a bridge or a billboard. Only the billboard route continues; the bridge leads to a view of Mara one roof ahead.
5. **A vent updraft.**
6. **TWO BELLS (teach, safe).** A bridge on a rose line stamped II: punched while the next bell is I, it waits a bell, and says so. A tag teaches "THE BELL COUNTS · I · II".
7. **I THEN II (combine with 3).** A lift on teal I and a bridge on amber II at its top. Punched while the next bell is I: up on the first bell, across on the next. Punched while the next is II, the bridge comes out first and is gone before the lift is up (ride down, try again).
8. **THE CHASE (twist).** Mara waits one roof ahead. Once the first cradle is coming, a tag over it reads PUNCH THE LAST POLE FROM HERE, and the last pole's own tag says BEST FROM CRADLE 1, AFTER ITS BELL; no other teach tag shows in the chase. The bell quickens to 2.5 s. Three window cradles over the gap lower on I, II, I; each overlaps the next by about a second. The last cradle's node stands at the roof edge, in reach from the first cradle: punch it after the first bell, or it lowers with the first and is gone. Mara runs when Butch is on the last cradle, and drops toward the hotel. Generous: no fail state beyond a fall; a lamp before and after.

Lamps: at the start, after A2, before A3, between A3/A4, after A4, after A5, before A7, before the chase, after the chase. Section C adds one on the signal deck, before C4.

### B · BLACKOUT (about 8–10 min). The city takes its light back.
- It enters with a cut: every sign dies, the rain gets louder, the screen darkens (to a readable 74%: silhouettes and edges stay visible). Butch's lamp gives a small radius; platform edges carry a faint rim.
- **Memory light:** a node punched in this section leaves an afterglow for 6 s after its bell; the afterglow reveals the dark decks.
- **Hotel twist:** power for the hotel lift is only available if the player deliberately cuts the held teal line holding a bridge open, then crosses before it retracts.
- **GRID STONE (optional):** a high ledge shown only in the afterglow of the stone lift's node. Granted through `magicStones.js` with id `chapter-2`.
- **Hotel window:** Mara's punched ticket stub is pinned to the glass. E reads archive card B1.
- **B5 · BORROW (teach, safe).** A lit city lantern and the dead bridge to the water tower. E at the lantern takes its light; E at the dead node gives it; the bridge extends on the bell; when it switches off, the light flies home to the lantern.
- **B6 · combine (with memory light).** On the tower, take the light back out of the bridge you just crossed (the way back is gone) and carry it: the dark decks to the next roof stand only in the light Butch carries.
- **B7 · twist.** A dead lift up and a dead bridge at the top: give the light to the lift, ride up, step off, take the light back out of the lift (not while riding it: STEP OFF FIRST), give it to the bridge. A second lantern by the lamp here guarantees a fresh light after any fall.
- Lamps: section start, after the dark decks, before the cut, after the hotel, at the first lantern, at the second lantern. No lamp on the tower or the decks: a fall there goes back to the lantern.

### C · EVACUATION PLATFORM (about 4–5 min). A departure countdown.
- The train's departure bell counts down **12 bells** from the letter, shown as rose pips around the meter.
- Chain lines: the points (amber), the lift to the gantry (teal), then **C3 · the counterweight walkway**: stand in cage A beside the gantry and release its brake (its node shares the lift's teal line, so it waits until the lift is done). Butch's weight takes the cage down 110 px and brings the walkway up 360 px, flush with the signal deck; step across. Teach and combine (with the one-line rule and the countdown) in one room; a respawn resets the pair.
- **C4 · TWO WEIGHTS (twist, round 3).** From the signal deck the landing is out of reach. A long ledge hangs high over the gap on a brake: it is heavier than the iron box on the other end of its rope, so released (F · RELEASE · THE LEDGE DROPS) it sinks into line by its own weight. Across it, cage A2 beside the landing rides the second walkway up to the platform, as in C3. Both brakes are on one rose line that rings only on bell I (stamped I): one line, one moment — the second waits until the first lets go, and a punch made while the next bell is II waits a bell more. The ledge's brake is reached only from the deck, the walkway's only from the landing and cage A2. A lamp on the signal deck; a respawn there resets the second pair (the dropped ledge stays down).
- The countdown stays **12 bells**: a clean run boards with about five to spare, a first run with two typical mistakes (a brake released from outside its cage, a bell I missed) with about three (tests: `solveC`).
- No fail state at the end. If the countdown ends first, the train "remembers" the punches made in this section and fires them itself in sequence (the walkways are set in place, the ledge dropped), so Butch runs aboard; players in time get the calmer ending shot (the train waits with its door open).
- Mara's letter is on the bench. E reads it.
- Then: save `chapter-3-start` → `playCinematic` `2-3.mp4` with the chapter-3 preload gate → `/car03-3d.html`.

## 6. Tech
- Page `borrowed-light.html` + `src/borrowedLight-main.js`, its own Phaser game at **1920×1080**, antialiased, Arcade physics, with the shared shell (pause menu with per-chapter controls, settings, reduce motion, text size, saves, stones, cinematics, desktop bridge).
- Data-driven level: `level.js` (geometry, nodes, lines, phases, dead nodes, machines, checkpoints, triggers). Sections B and C are authored in their v1 coordinates and shifted by the room the new A and B content takes, so every v1 relation is kept.
- Pure modules with node tests: `timetableModel.js` (bell clock, queue, one-line rule, phases, borrowed light, counterweight, memory light, countdown), `targeting.js` (the one target a press acts on), `memoryLight.js` (what the light reveals), `controller.js`.
- **Player:** coyote 100 ms, jump buffer 120 ms, variable jump height; max run ≈ 420 px/s, apex ≈ 180 px.
- **Camera:** follows with lookahead; on bells briefly frames a machine that just moved off-screen if it is part of the current puzzle.
- **Art:** the far backdrop is a painted rainy skyline in the chapter's teal and amber (`paintRainSkyline`, after the approach of the finale's `paintEchoSkyline`), with no lettering; the retro-cyberpunk panorama is no longer used. Mid and near rooftops are procedural silhouettes (facades vary by bay, household and floor; a few boarded or television-lit windows), ink rims in `#eadfc6`, low-saturation neon (amber, teal, rose only), paper tags with an amber glint. The far train runs on a viaduct.
- **Save checkpoints:** `chapter-2-start`, `chapter-2-midpoint` (start of B) and `chapter-2-platform` (start of C).
- **QA (DEV_MODE only):** `render_game_to_text` (section, player, bell index / phase / interval / next parity, queued, given, carried, machines, target and its prompt, lamps lit, chase, checkpoint, stone); routes `?section=A|B|C` and `?lamp=<id>` (start at a lamp inside the section, e.g. `?section=A&lamp=lamp-a7` for the chase); `window.__borrowedLight` hooks; scripted solves of every room on the model; a targeting sweep over every standing spot.

## 7. Acceptance
- Every mechanic is readable from the world: cables, tags, stamps and the meter show what a node does before the bell; the marked node's tag says what a press will do.
- Nothing is required that the player has not been shown.
- No dead ends: every machine resets, every queued punch can be changed, borrowed light always goes home.
- No fall costs more than ~20 s of replay (a lamp before every room).
- Checks pass: build, tests, a prod build that ignores dev routes, and `git diff --check`.

## 8. Round 3 · "the nodes sometimes don't work" — causes found and fixed
1. **Highlight ≠ punch.** The highlight was drawn from one nearest-node pick and the press re-picked on the key event, so with two poles close together (A3, A4, the chase) the highlighted and the punched node could differ, and the pick flipped while walking between them. Now one sticky pick per frame (`targeting.js`) is both the highlight and the target.
2. **A press out of reach did nothing.** No sound, no tag. Now it names the nearest node: OUT OF REACH (and a click on a node out of reach says so instead of punching another).
3. **A second press switched machines off.** Pressing again on a running machine (to be sure, or F + click) cut it to 2 s. Now it renews it at the next bell; only city-held lines are cut.
4. **A quick double press took the punch back.** Now a second press within 450 ms is the same punch.
5. **A punch just after the bell waited four more seconds.** Now it catches that bell (250 ms).
6. **The one-line rule cancelled silently.** "FORGOTTEN" appeared at the old node, often off-screen. Now the tag warns before the press (SAME LINE · AMBER FORGETS THE OTHER) and the punched node says it.
7. **Respawn cleared punches without a word.** Now the tags seal visibly and a line says PUNCHES FORGOTTEN.
8. **The mouse ignored where it was clicked.** A click on a node in reach now punches that node.

## 9. Alpha round 3 (tester t2, 2026-10-01) — fixed
1. **Silent take-back (R3-1).** A second press on a punched node more than 450 ms later cancelled it with only a sound; with poles 100–140 px apart and a sticky pick that stayed on the old pole 10–20 px past the midpoint, a press meant for the next pole cancelled the last (the A8 chase). Now a press never takes a punch back (the tag says PUNCHED · RINGS ON BELL I); hold F / the click / RB 0.5 s to take it back on purpose. While running, the pick is not sticky (it switches at the midpoint, a pole behind counts as further) and a punched pole yields to an unpunched neighbour. The legacy rule stays the model's default for the finale's bell arena (`CH2_RULES` opts in).
2. **Borrowing the light under your own feet (R3-2, B6).** The lamp refuses while Butch stands on, rides, or is in the air just over the machine it would switch off: STEP OFF FIRST. A level-data test sweeps every borrowable machine's surface.
3. **Lifts leaving empty (R3-3, A2, B lift2).** Lifts wait one ring for a rider on the way (above).
4. **A caught half split a pair (R3-4, A3).** The catch is 120 ms, never for pair nodes, never with a punch waiting in the room.
5. **P2.** Toasts sit on a dark band (the DARK DECK toast was dark on dark) and float hints stay on screen; A1 shows the punch tag with E · TALK on the mechanic; no teach tags in the chase; the chase pre-hint (A8 above).
6. **Section C was too easy** (9 of 12 bells left): C4 · TWO WEIGHTS (above).
