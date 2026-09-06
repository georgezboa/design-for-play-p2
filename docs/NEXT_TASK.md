# Next implementation task

## READY — Chapter One cyberpunk parkour extension

Status: `READY`

Owner: `Codex`

Product decision (2026-08-09): Preserve the complete existing Chapter One
cyberpunk parkour route and extend it in the same visual and mechanical
language. The former top-balcony finish becomes a midpoint checkpoint; the
actual completion door moves to the end of the new route.

In scope:

- extend the existing 4,300px course rather than replacing or compressing it;
- add more authored jumps, horizontally draggable ladders and blocks,
  autonomous side-to-side flying cars, spike strips, and readable recovery
  ladders/platforms;
- require the new movable geometry and cars before the final door accepts the
  route;
- preserve the current obstacle behavior, cyberpunk presentation, removal of
  green solution arrows, and the door handoff into the next area;
- make post-midpoint failure return to the midpoint while manual `R` remains a
  complete level reset;
- extend deterministic model and browser QA through the new finish.

Acceptance criteria:

1. Every existing platform and obstacle remains in the opening route.
2. At least two new movable obstacles, two new flying-car traversals, and two
   new spike jumps appear after the former goal.
3. A missed new car has a recovery path that does not bypass that car.
4. Visual and collision positions remain aligned after new obstacle dragging
   and moving-platform travel.
5. The final door transitions to the same next area only after the extended
   route requirements are satisfied.
6. Model tests, browser QA, asset verification, production build, and
   whitespace validation pass.

User correction (2026-08-09): crossing the physical midpoint gate must always
activate the checkpoint; it must not be rejected because the player did not use
an optional opening obstacle. The first spike jump after that checkpoint is
three segments wide.

User correction (2026-08-09): the visible top of the screen is not a physics
ceiling, ladder tops use continuous player-controlled dismounting instead of a
position snap, and the high third post-checkpoint spike jump must clear normally.
That high strip is reduced to three segments and moved right to provide a proper
jump runway.

User correction (2026-08-09): AIR LANE and NIGHT GRID plus the props, ladder,
rail and spikes resting on them move down together by 30px. The final door
returns the player to the completed train instead of entering the next city.

User story amendment (2026-08-13): Continue the prior search for Mara inside
the cyberpunk parkour without changing its topology. An NPC at the beginning
confirms that Mara crossed this city and points Butch toward a letter she left
at the final balcony. The letter uses the preceding chapter's restrained
typewriter dialogue style and reveals that Mara could not wait and has already
moved on. Reading it is required before the final door opens; talking to the
NPC remains optional.

## READY — Chapter 4 teammate-grid and HUE-train fusion

Status: `READY` — product decision 2026-08-13

Owner: `Codex`

George approved one continuous Chapter 4 built around Carl's complete paper-grid
archive level rather than three adjacent mini-games. Port Carl's latest three
archive Color Link cards and preserve their full images, captions, notebook and
Moon deduction. The six-color HUE halo becomes the chapter's shared color
language: completing each archive unlocks one pair of train pigments, so all six
are earned by investigation instead of collected again from unrelated props.

The redundant Drawing Studio and Pigment Train collection phase are removed from
normal play. After the third archive, the player enters the unfinished-train
finale with all six earned pigments, assembles it bottom-up with the existing HUE
interaction, and uses the archive answer `MOON` as the ignition decision before
the existing crowd chase and physical train escape. The completed escape keeps
the authored Chapter 4→5 handoff already wired by the final integration branch.

Acceptance criteria:

1. The paper grid, all three latest Color Link cards, all three archive images,
   their complete narrative captions and the notebook remain playable.
2. Solving/reading archive 1 unlocks verdigris + vermilion; archive 2 unlocks
   indigo + marigold; archive 3 unlocks ochre + mulberry. Visible HUE and text
   state agree after every unlock.
3. Normal play no longer enters the separate Drawing Studio or recollects six
   colors from the Pigment Train room.
4. The train build still rejects a wrong color and an unsupported top-down
   placement, remains recoverable, and completes only with all six parts.
5. Boarding asks for the common archive sign. `MOON` starts the existing chase;
   a wrong sign gives readable feedback without erasing the whole chapter.
6. `render_game_to_text()` covers archive unlocks, available HUE pigments,
   train construction, ignition choice, chase and completion.
7. Focused model tests, browser cause→outcome playthroughs, screenshots, console
   checks, asset verification, production build and whitespace validation pass.

## Awaiting product accept — Chapter 4 `THE PAINTED COUNTRY` Bay A slice

Status: `AWAITING PRODUCT ACCEPT` (not `READY` — do not start)

Owner: unassigned

George set the premise on 2026-08-07: chapter 4 is a paper world, and the
mechanic is magical paint used to change parts of a mysterious train car,
uncover clues, collect materials and reveal the route to the next car. This
matches the Chapter 4 slot already locked in
`docs/GAME_MASTER_V2_SIX_CHAPTERS.md` §8 (`paint/erase → reveal/change memory`),
re-sited from an open landscape into a carriage interior.

Full design: `docs/CHAPTER_04_PAINTED_COUNTRY_DESIGN_LOCK.md`. The short
version — two verbs on one axis (PAINT makes a drawn line real, WASH makes a real
thing drawn again and returns its pigment), three found mineral pigments with two
loadable at a time, and a finite pigment budget, so every surface the player
builds is taken out of a picture. The car's level design is a child's
under-drawing, mistakes included, and the chapter's thesis beat requires painting
a *wrong* drawing rather than correcting it.

Proposed first slice is **Bay A only** (design lock §14): beats 1–3, a standalone
entry point named `painted-country.html` for identity rather than sequence order,
one pure deterministic region/pigment module with focused tests, one art layer
that owns no rules, full `render_game_to_text()` coverage, and a row in
`STANDALONE_SLICES` so the dev chapter select can reach it.

This does not become `READY` until George accepts or amends the design lock.
## READY — Chapter 4 `THE PAINTED COUNTRY` archive gallery and moon handle

Status: `BUILT AND VERIFIED` — 2026-08-12

Owner: `Claude Code` (designed and implemented directly at George's request; this
is a deliberate step outside the usual product-lead-writes-the-task loop, taken
because he asked for the change itself rather than for a task to hand to Codex)

## Product decision (2026-08-12)

Keep the built ink-displacement route puzzle as the traversal spine, but add a
haunted investigation layer rather than another repeated bridge. Three wall
archives, one in each bay, begin obscured by washable ink. A short WASH removes
the whole cover and reveals the supplied image on the wall. The player presses
`E` at a revealed archive to see the full image and a compact, vague horror
fragment: people built, worshipped, and researched the same presence.

All three archives must be viewed before the final coupling handle accepts an
answer. `E` at the handle opens a five-icon choice using
`public/assets/chapter04/icons/`. The **Moon** is the correct icon. It completes
the car and opens the next-car handoff; every other choice kills the player and
restarts this standalone car. This death/restart explicitly supersedes the prior
rule that every Chapter 4 mistake must be undoable.

## Acceptance criteria

1. Each supplied gallery image is visibly installed in a framed wall archive,
   fully revealed only after its washable ink cover is cleared.
2. `E` on a revealed archive opens the full image plus a distinct, terse horror
   fragment about building, worshipping, or researching.
3. The handle is locked until all three archives have been viewed, with a clear
   local reason rather than a silent refusal.
4. The handle popup shows all five supplied icons. Moon completes; each other
   icon visibly kills then restarts the level.
5. Archive reveal/view state, handle state, death and completion agree with
   `window.render_game_to_text()` and deterministic model tests.

---

## Superseded built task — Chapter 4 ink-displacement puzzle

Status: `BUILT, VERIFIED, AND RETAINED AS THE TRAVERSAL SPINE` — 2026-08-11

## Product decision (2026-08-11, second decision of the day)

George played the wash → paint → cross build and rejected it: *"it is just
repeated wash and paint, there is no puzzle, no fun at all... make it more
interesting, it has to challenge the IQ a bit."*

This does **not** reverse the morning's decision. Read together, the two
rejections say something precise, and it is the design rule for this chapter:

> He rejected **bookkeeping**, not **thinking**.
> The finite-pigment build was rejected for admin — collecting, budgeting,
> filling to a threshold. The simplified build was rejected for having no
> decision in it at all. So the input stays trivial and the *consequences*
> carry the difficulty.

Accordingly the verbs are unchanged and the following remain permanently out:
pigment collection, brush slots, coverage thresholds, meters, counters, timers,
precision aiming, twitch execution, and any punishment that is not undoable.

## The one new rule

> **Washing does not destroy ink. It moves it.**
> Every washable mark has a drain channel drawn on the sheet. Wash it and its
> ink travels that channel:
> - ink that reaches a **hole** falls through and is gone;
> - ink that reaches **paper** stands there as a new blot you must now deal with;
> - ink that crosses a **bridge you already painted** dissolves it on the way past.

Everything is visible from the first frame. Nothing is hidden, revealed, or
remembered — a puzzle the player cannot see is a memory test, not a puzzle. The
difficulty is entirely *which order you act in*, and the channel that is about to
cross one of your own bridges turns red before you commit to the wash.

## The three bays

- **Bay A — teach.** The seal's channel runs away from the route into a floor
  grate. The player watches ink travel and vanish. There is no wrong order here.
- **Bay B — the trap.** The seal's ink lands as a blot between the player and the
  trough. Washing the blot sends its ink into the trough — which is only open
  while the bridge is unpainted. Paint first and you watch your own bridge go.
- **Bay C — the exam.** Two seals with different channels: one drains the length
  of the bay straight into the last hole, the other drops its ink at your feet.
  Both must go through the hole *before* the last bridge is made.

## In scope

- The pure model owns every rule; the scene owns pixels, input and bodies only.
- Blots are physically taller than a jump can clear, so ink is a problem to solve
  rather than an obstacle to vault.
- Keep the paper carriage, its windows, Mara's cyan thread, the standalone entry,
  unlimited paint, and the restart/movement controls.

## Out of scope

- Any third verb, any second resource, any meter, counter or timer.
- Changing the car order or the chapter's place in the journey. This slice is
  named for identity, not sequence.
- Touching another chapter's code, the shared Prologue, or the dev/prod split.
- Story or dialogue authoring. The car must read through its own objects first.

## Acceptance criteria

1. The first screen shows every seal, every route, every basin and every drain
   channel, with no hover required and nothing hidden.
2. A player can predict where a wash sends its ink before committing to it, and
   is warned when a channel is about to cross a bridge they made.
3. Washing is never destructive of progress in a way that cannot be undone: every
   wrong order costs a repeat, never a restart.
4. Nothing that blocks the way can be jumped over, so the puzzle cannot be skipped.
5. Every mark's visible state, physical collision, objective line and
   `render_game_to_text()` state agree.
6. Paint remains unlimited, with no inventory, counter or threshold anywhere.

## QA route

Run `npm run dev` and open `/painted-country.html`. Play with a real mouse — the
wash verb is a **held** right-click and a synthetic click will not exercise it.

1. Before touching anything, follow each dashed channel with your eye. Every
   consequence in the car is already on the sheet.
2. Bay A: wash the seal. The ink should run left and disappear down the grate.
   Paint the bridge, walk across.
3. Bay B: wash the seal. Its ink should *land*, standing in your way. Try to jump
   it — you must not be able to. Wash the blot, watch it fall into the trough,
   then paint and cross.
4. Bay B, deliberately wrong: restart, wash the seal, paint the bridge **first**,
   then wash the blot. The bridge must dissolve, and the objective must have
   warned you before you washed. Repaint and continue — no restart required.
5. Bay C: wash both seals, note their channels end in different places. Clear the
   blot into the hole, then make the last bridge and reach the vestibule.
6. Bay C, deliberately wrong: paint the last bridge while the blot still stands.
7. Fall into a hole. Progress must survive.
8. Reach the vestibule, then keep walking right — you must stop at the coupling.
9. Press `R` and confirm the car returns to its opening state.

## Verified 2026-08-11 (played in-browser, real held right- and left-click)

- The clean solve completes: all nine actions land, car completes, zero falls,
  no ink left standing.
- Both traps fire and both recover with a single repaint.
- Ink can no longer be jumped: a blot now stands 130px tall against a ~92px jump.
  This was a real bug found in play — the first blots were vaultable, which made
  the whole puzzle optional. Pinned by a test.
- Walking past the coupling stops at x=2872 instead of throwing the player back
  down the car.
- 14 model tests pass, including an exhaustive search proving that **no ordering
  of legal moves can strand the player**, and both Vite builds and the whitespace
  check pass.

### The three defects from the morning review are fixed

1. Walking off the end of the world after completion — the sheet now has end walls.
2. A washed seal leaving a slab and a blank plaque — a washed seal now leaves only
   a damp ghost and a torn lip.
3. A prompt on a target that is out of reach — labels are anchored to the end the
   player walks up to, reach is measured to the label itself, and an unreachable
   target reads `STEP CLOSER TO …` at half alpha instead of pretending to be a
   button. The wrong mouse button and the dissolved bridge now both say so.

### If this is still not hard enough — the next rung

The cheapest way to add real difficulty without adding a rule is to make **holes
saturate**: a hole swallows one lot of ink, after which the paper there is soaked
and further ink stands on top. Sinks become scarce and the player must decide
*which* ink goes *where*, routing one lot through a chain to a further hole. It is
a genuine allocation puzzle and still has no counter, no inventory and no meter.
Say the word and it is a small change to `deliver()` plus one flag per hole.

---

## Completed task

Status: `COMPLETE`

Owner: `Codex`

Task: Final Prologue UI cleanup

## Product decision (2026-08-06)

George approved the retro-transit colour pass and requested one bounded final
cleanup: keep dialogue/subtitle UI clear of the player and floor interactions,
remove the large non-interactive Archivist diagram from Phase VI, and remove
the redundant Phase VI in-room caption. Preserve all puzzle logic, timing,
hit regions, cameras and completion conditions.

## Acceptance criteria

1. Dialogue remains fully readable without covering the player or floor-mounted
   interaction hardware.
2. Phase VI no longer renders the central non-interactive Archivist diagram.
3. The actual present case, remembered case, falling record, balance beam,
   winch and air cushion remain visible and unchanged.
4. Tutorial tests, asset verification, build and browser screenshots pass.

## Completed QA

- Moved the full dialogue card from the floor band to the upper window band;
  speaker, role, typed line, choices and continue hint remain inside the card.
- Removed Phase VI's large non-interactive Archivist diagram and its redundant
  in-room caption while preserving every playable case, balance component and
  state transition.
- Browser review confirmed the conductor dialogue no longer covers the player,
  door or floor hardware, and the Phase VI redaction fixture retains its active
  objects without the false focal object.
- Tutorial tests pass 457/457, 10 panoramas and 30 textures verify, production
  build passes, browser console is clean and scoped whitespace checks pass.

---

## Previous completed task

Status: `COMPLETE`

Owner: `Codex`

Task: Prologue late-1970s / early-1980s retro-transit interior skin

## Product decision (2026-08-06)

George approved the third visual direction. Preserve the existing blue-purple
dusk panoramas outside every window and preserve all puzzle rules, geometry,
camera behavior and state colours. Reskin only the shared carriage interior as
an optimistic period transit vehicle: aged ivory wall panels, safety-orange
lower panels and door leaves, charcoal structure and floor, oxidized silver
hardware, small cyan status lamps, period route typography and restrained
printed wear. This is retro transit, not outer space; add no stars, planets or
new exterior backdrop.

## Acceptance criteria

1. All six Prologue rooms share one ivory/orange/charcoal material language.
2. The existing dusk panorama remains visible and unchanged through the windows.
3. The protagonist, machinery, state feedback and interaction prompts remain
   readable against the lighter shell.
4. No puzzle logic, hit region, stage data, camera rule or completion condition
   changes.
5. Tutorial tests, asset verification, production build and whitespace checks
   pass, followed by browser screenshots of at least two rooms.

## Completed QA

- Preserved the existing dusk panoramas and all puzzle-state colours.
- Verified the opening carriage and Phase IV at 960x600 in a clean Chromium
  session; both show the shared ivory/orange/charcoal skin and readable actors.
- Confirmed real keyboard movement in Phase IV and matching live
  `render_game_to_text()` output after the reskin.
- Tutorial tests, asset verification, production build and whitespace checks
  pass.

---

## Previous completed task

Status: `COMPLETE`

Owner: `Codex`

Task: Prologue Phase V `TWO TRUE THINGS` + Phase VI `THE TRAIN REMEMBERS`

## Product decision (2026-08-06)

George accepted the implemented Phase IV and explicitly rejected the remaining
Phase V/VI rolling-bearing table. Implement the world-space continuation locked
in `docs/PROLOGUE_PHASE_V_VI_PLAYABLE_SEQUENCE_LOCK.md`. The old table must not
remain reachable in V or VI. Preserve Phase IV gameplay exactly; it may only
export its already-performed case movement for VI to replay.

## Player outcome

V asks the player to use the persistent witness punch, amber relationship and
cyan force line to unfold and support a second cradle so two contradictory but
authentic memories can both remain. VI replays the large Phase IV case movement
as an amber partner action; the player counterbalances it with the present case,
then abandons perfect balance to catch a falling record and watches the train
perform the missing counter-movement itself.

## In scope

- Replace only the Phase V/VI runtime routes with the approved world-space acts.
- Add one pure deterministic module and one world-art layer per phase.
- Reuse the Phase IV grip/release case verb, Phase I punch, Phase II amber line,
  Phase III cyan line and the same cradle/equalizer silhouette.
- Keep `?qa=phase5&state=entry` and `?qa=phase6&state=entry` playable and expose
  both new snapshots through `window.render_game_to_text()`.
- Keep all wrong placements recoverable in place with persistent progress.
- Add focused tests for V's independent support relationships and VI's two
  counterbalance poses, redaction, catch and autonomous train response.

## Acceptance criteria

1. V exposes two distinct memories before asking the player to preserve both.
2. Amber-only, cyan-only and unsupported-case states each produce different
   physical outcomes without clearing tags or connections.
3. V completes only when both tags are punched, both old relationships support
   the second cradle and the cases occupy separate supports for 600ms.
4. VI teaches two readable opposite-side poses before its story twist.
5. Catching the redacted case, not maintaining perfect balance, triggers the
   train's autonomous counter-movement and completion.
6. No modal panel, new button vocabulary, timer bar, death, reset or red warning
   is introduced.
7. Phase IV, Chapters 3-6 and unrelated dirty work remain intact.

## Completed QA route

1. Phase V was inspected at entry, amber-only, both-supports and solved states.
2. Phase VI was inspected at entry, both counterbalance poses, the visible
   redaction/fall beat, catch and autonomous-train completion.
3. Both phases expose live snapshots through `render_game_to_text()`.
4. Focused tests, the complete tutorial suite, production build, console and
   whitespace checks pass.

---

## Superseded task: Prologue IV-VI unified rolling-bearing table replacement

Status: `SUPERSEDED FOR PHASE IV / DEFERRED FOR V-VI`

Owner: `penguin`

Base: `georgezboa/design-for-play-p2`, branch
`codex/playable-train-prologue`, at or after commit `19cf96b`

## Parallel READY task — Chapter 3 visual rebuild

Status: `READY`

Owner: `Codex`

Product decision (2026-08-05): George explicitly rejected the current Chapter 3
greybox art and selected the warm, sun-bleached painterly civic-square concept
generated during the visual review. Rebuild only the visible `ECHO CITY` layer:
real CC0 3D environment and character sources, coherent hand-painted materials,
directional late-afternoon lighting, readable architectural depth, and restrained
diegetic interaction feedback. Preserve the accepted isometric model, waypoint
graph, seven camera beats, puzzle rules, events, reset, and completion behavior.
The selected concept is a visual target, not a runtime background to paste over
the game. Other chapters and shared gameplay files remain protected.

## Product decision (2026-08-05)

The user explicitly rejects the existing Phase IV weight-transfer floor rig,
Phase V bogie-service panel, and Phase VI traction synchronizer as three
separate interaction languages. This is a core-mechanics replacement, not an
art polish pass.

Phases IV-VI now use one diegetic, point-and-click **rolling-bearing service
table**. The table has five persistent physical verbs:

1. charge the hydraulic/steam reservoir;
2. place a sliding counterweight in a visible detent;
3. route a plug/fork to one of two visible output paths;
4. bridge a visible broken contact when present;
5. release one brass bearing and watch its complete physical journey.

The visual target is the selected 1960s cast-iron night-train service box, not
a modern control console. The generated empty base plate and CC0 pipe/industrial
parts are production assets, while commercial reference games contribute only
interaction grammar.

The three rooms share the same board and input language but ask different
questions:

- **IV / LOAD THE RAIL** teaches power plus weight. A bearing only reaches the
  output when the reservoir is charged and the counterweight is in the correct
  visible detent. Wrong attempts stall or return on the table; no progress is
  cleared.
- **V / FIND THE BREAK** adds two routes. A reference run on A works, the same
  run on B stops at a visibly open contact, and the player bridges that contact
  before proving B. This is diagnosis by comparing two physical outcomes, not
  a memorized service sequence.
- **VI / MEET THE PAST** preserves the authored-replay rule. A remembered
  bearing loops on the upper rail. The player configures the now-familiar
  pressure, weight, and route, then releases the present bearing so both meet
  in one visible coupling cradle. Misses recirculate without reset.

Success is never granted by walking, moving a weight, or clicking the final
setting alone. It occurs only after an explicit RELEASE and the bearing visibly
reaches the phase's mechanical result.

## Player outcome

A first-time player can explain the shared sentence — "pressure launches it,
weight changes how it travels, wiring chooses where it goes" — after Phase IV.
Phase V makes them use that sentence to locate a fault. Phase VI makes them
apply the same sentence in time with their past action. Each phase is readable
at a glance but requires at least one observed result and a deliberate second
plan.

## In scope

- Add one pure phase module with deterministic snapshots/events for IV-VI.
- Replace the runtime routes of `weightTransfer`, `bogieDiagnosis`, and
  `echoReplay`; the legacy modules may remain as historical dead code until a
  separate cleanup, but may not drive gameplay.
- Add one shared point-and-click art/controller layer using the selected base
  plate plus credited CC0 art.
- Replace the three rooms' many world controls with one inspection hatch each.
- Preserve ordinary E-to-inspect, pointer interaction, ESC/E close, camera/HUD
  restoration, completed-room persistence, and the protagonist as the only
  directly controlled human.
- Keep `?qa=phase4`, `?qa=phase5`, and `?qa=phase6` working with new fixture
  aliases and expose the complete table snapshot through
  `window.render_game_to_text()`.
- Add deterministic tests for every wrong-result recovery and the full IV→V→VI
  progression.

## Acceptance criteria

1. IV cannot complete merely by moving the counterweight. A visible bearing run
   is required; underpowered and misweighted runs visibly fail and recover.
2. V requires a successful A reference, a failed B comparison, a visible bridge,
   and a successful B proof. Blindly clicking the bridge before observing the
   break does not complete the room.
3. VI consumes the saved IV trace when available, otherwise a canonical loop,
   and requires a visible bearing meeting at the coupling cradle.
4. All three phases use the same hit targets in the same positions and introduce
   no new control vocabulary after IV.
5. The visible plate, bearing position, pressure, weight detent, route, bridge,
   output, failure and completion agree with `render_game_to_text()`.
6. Wrong actions never clear observations, never close the board, and never
   require leaving the room or reloading.
7. Legacy V/VI panels and their abstract ammeters, service-button row and timing
   strip are unreachable in the normal runtime.

## Required QA route

1. IV: release underpowered; charge, release with wrong weight; correct weight,
   release, and complete.
2. V: prove A; select B and observe the open contact; bridge it; prove B and
   complete.
3. VI: make one early or late miss; allow the bearing to recirculate; configure
   route/weight/pressure; meet the past bearing and complete.
4. Close and reopen each plate mid-solve and verify state persistence.
5. Run tutorial tests, `npm run assets:check`, `npm run build`,
   `git diff --check`, browser visual comparison, and text-state comparison.

## File ownership and safety

The current worktree contains unrelated Chapter 3-6 work. Touch only the new
mechanical-table files, narrow integration points in `BootScene.js`,
`TimetablePuzzle.js`, `level.js`, `main.js`, tests, this handoff, and
`progress.md`. Do not commit or push.

---

## Deferred prior READY task: Chapter One cyberpunk parkour vertical slice

The cyberpunk task below remains product-approved but is temporarily displaced
by the user's explicit IV-VI replacement request. Do not implement it in this
pass.

## Product decision

The product lead approves the teammate-authored cyberpunk direction shown in
the 2026-08-03 prototype. Keep the neon industrial exterior and make its
horizontal traversal mechanics playable. This task supersedes Chapter One's
earlier `The Proctor` / AI-apocalypse direction.

This approval applies to Chapter One only. It does not turn every later car
into a left-to-right 2D platformer and does not authorize changes to the frozen
Prologue or the isolated present-city Car 03 slice.

## Player outcome

Starting at the left side of the cyberpunk space, the player learns that ladders
and blocks can be dragged horizontally to build a route, uses at least one
autonomous flying car as a moving platform, and reaches the goal balcony on the
right. Failure and reset are understandable without leaving stale collision or
object state behind.

## In scope

- Preserve the prototype's approved cyberpunk visual identity and extend it
  only as needed to make one coherent start-to-goal route.
- Implement horizontal click/touch dragging for ladders and movable blocks.
  Dragging must have visible legal/illegal placement feedback, stay within the
  authored bounds, and update collision when placement commits.
- Implement autonomous flying-car platforms with readable travel paths. The
  player can stand on and ride them without sliding through, teleporting, or
  being stranded by routine timing.
- Include the hazards already expressed by the prototype, including spikes or
  falls, with a quick deterministic recovery.
- Make the elevated goal balcony reachable only after using the taught movable
  geometry and at least one flying-car platform.
- Display concise controls for move, jump, drag, and reset. The environment must
  teach the route before explanatory prose gives away the solution.
- Wire the slice into the post-Prologue Chapter One hand-off. Do not require a
  developer URL or QA-only warp for the normal playable route.
- Expose drag state, movable-object positions, flying-car phase, player state,
  failure/reset state, and goal completion through
  `window.render_game_to_text()`.
- Add deterministic automated coverage for placement bounds, collision updates,
  flying-platform motion/riding, reset, and goal completion.

## File ownership and integration boundary

- Prefer new implementation files under `src/cars/cyberpunkParkour/` and new
  tests under `tests/chapterOne/`.
- Minimal integration edits may be made to `src/main.js`, `src/scenes/GameScene.js`,
  `src/story.js`, `src/level.js`, and `src/textures.js` when required to enter
  and expose the slice.
- Do not edit `src/tutorial/**`, `tests/tutorial/**`,
  `src/cars/presentCity/**`, `tests/car03/**`, or `src/car03-main.js`.
- Preserve all unrelated uncommitted work, including any existing
  `package-lock.json` change. Do not discard, rewrite, or include it unless the
  implementation itself proves a dependency update is necessary and the owner
  explicitly approves that inclusion.

## Acceptance criteria

1. A fresh player can complete the normal route from the Chapter One entrance
   to the goal balcony using ordinary controls.
2. At least one ladder and one block can be repositioned horizontally; legal
   placement changes the traversable route and illegal placement cannot produce
   an unrecoverable state.
3. At least one autonomous flying car is required and works as a stable moving
   platform through its full route.
4. Spikes/falls and `R` reset restore the player, movable geometry, collision,
   and platform timing to the authored start state.
5. The cyberpunk presentation remains confined to this car; the frozen Prologue
   and Car 03 behavior and visuals remain unchanged.
6. The visible state and `window.render_game_to_text()` agree at entrance,
   during drag, on a moving car, after failure/reset, and at completion.
7. No new browser console errors occur on the full start-to-goal route.

## Required QA route

1. Pull the named base branch and preserve unrelated local changes.
2. Enter Chapter One through the normal Prologue hand-off.
3. Verify legal and illegal drag attempts for both a ladder and a block.
4. Complete a jump onto, ride on, and jump off an autonomous flying car.
5. Trigger one spike/fall failure, reset, and confirm all authored state is
   restored.
6. Complete the route to the goal balcony and capture visible plus text-state
   evidence at the five states named in acceptance criterion 6.
7. Run `npm run assets:check`, the relevant automated tests,
   `npm run build`, and `git diff --check`.

## Out of scope

- Reopening or polishing Prologue Phases I-VII.
- Editing the Car 03 social-stealth vertical slice.
- Applying the cyberpunk theme or horizontal-platformer structure to other cars.
- Reintroducing `The Proctor`, generic combat progression, or a new story canon
  inside this implementation task.

---

## Historical appendix: completed Section III handoff

The remainder of this file is retained only as historical design context. It is
not a second `READY` task and must not be reimplemented.

Latest handoff (2026-08-03): Prologue Phases II–VI are frozen after continuous
browser acceptance. The later III/IV undercarriage-view teaching wave is also
frozen at 508/508 tests with both builds and diff checks green. Do not re-run
the Section III task below as new work; it remains as historical design context.
The next product work packages are Phase I (`PUNCH THE DOOR`) and Phase VII
(Prologue exit / world-1 hand-off), which require their own bounded READY brief.
See `docs/PROLOGUE_III_VI_EXECUTION_STATE.md` for the current authoritative log.

Task: Section III `AIR LOCK` — pressure becomes a resource, and the room becomes
a machine

Supersedes the previous Living-Timetable task entirely. Design record:
[SECTION_III_REDESIGN_AUDIT.md](SECTION_III_REDESIGN_AUDIT.md) and the
`Accepted 2026-07-30 (revised)` section of [PRODUCT_STATE.md](PRODUCT_STATE.md).

**The drum has 3 slots at 2200 ms. There is no slot dial and no 6-slot layout.**
Every 6-slot reference in earlier drafts of this file is withdrawn; if any
surviving doc mentions `BRAKE slot 0 / VENT slot 2 / DOOR slot 4`, sparse-vs-tight
routes, or a `SLOT +1` control, that text is stale and this file wins.

## Player-facing problem

Two problems, both verified in code, not inferred:

1. **The stage has zero real decisions.** `commands` and `solution` are both
   `['brake','vent','door']`, three cards fill three slots, and
   [drum.js:95](../src/tutorial/drum.js#L95) `causalBlocker` jams any other order
   at the first misplaced slot. The worst walking leg leaves 0.70 s of slack, so
   it is not a dexterity test either. The stage reduces to *remember the order,
   then walk right*.
2. **The causal rule is never delivered.** `stage.lesson` is never read anywhere
   in `src/`. `guidance: 'machine'` has no consuming branch. `waitForHand: true`
   at [level.js:160](../src/level.js#L160) is read by nothing despite a comment
   calling it "the single change that makes the timing legible." Together with
   the already-fixed `drum.waiting`, four fields were declared, argued for in a
   comment, and never wired.

The user's own verdict on the visuals: it reads as a black HUD panel pasted into
the carriage, six equal buttons in a row express no physical causality, and the
protagonist is smaller than the interface.

## Player outcome

The player should look at a pipe, a gauge and a latch, work out that the door is
being physically held shut by trapped air, and then decide **how tightly to
schedule the bleed against the door** — knowing that air creeps back. Two plans
must be legal at different costs. Nothing may name the answer.

## In scope

### S1 — Replace boolean causality with a pressure value

- `causalBlocker`'s boolean chain becomes a continuous pressure value on
  `puzzle.drumMachine`, e.g. `pipePressure` in `0.0 – 1.0`.
- BRAKE **traps** pressure (holds it high). VENT **bleeds** it toward 0. DOOR
  unlatches only while pressure is **below `doorThreshold`**.
- **Pressure creeps back up after a bleed.** Recovery reaches the threshold
  again **3000 ms** after the bleed commits. This single number is what makes
  slot spacing matter; it is not tunable decoration.
- Actions remain **absolute-set, never toggle** — a re-run must not undo
  progress. This constraint already holds in `applyDrumAction` and must survive.
- `machineSatisfied` keeps reading the machine, never the cards.

### S2 — The two decisions this creates

Both must be reachable and both must be legal:

- **Spacing.** VENT and DOOR in adjacent slots fires the door **1.5 s** after the
  bleed commits (worst case: 0.32 s grace + 0.4 s hold consumed, then the
  remainder of the slot), inside the 3.0 s window, with **0.38 s** of walking
  slack over the 220 px VENT→DOOR leg at `speedWalk` 200. Leaving one slot empty
  between them pushes the door to **3.7 s**, past the window: the latch refuses.
- **Spending the third card on a second VENT** to widen the door window instead
  of walking tight. This must work.

Verify both by arithmetic before wiring art, and keep the numbers in a comment
next to the constant.

### S3 — Implement `waitForHand` or delete it

No third option. If implemented: the slot stays lit and asks for the player's
hand for the grace period; the pointer does **not** park (the drum keeps turning
per the existing `ensureDrumState` comment). If that conflicts, delete the field
and its comment. **A declared-but-unread field is a defect in this task.**

### S4 — Visual reorganization (this is half the task, not polish)

- **Delete the black rounded-rect panel.** The timetable becomes an **enamel
  recess set into the carriage lining** with a brass bezel, flush with the wall,
  below the window band. No pure black fills except unlit gaps.
- **Separate the controls by mounting surface** so they stop reading as a
  toolbar: BRAKE on a **floor-mounted cast bracket with visible bolts**, VENT a
  **wall-mounted brass wheel**, DOOR a **latch at the carriage edge** with a
  tungsten lamp above it. Vary their heights and silhouettes.
- **One traceable brass air pipe** runs horizontally beneath the window band from
  above BRAKE to the door latch, with vertical drops to each device. Pressure is
  visible **travelling along it**. This pipe replaces the row of labels as the
  carrier of causality.
- **The gauge moves to eye level and becomes a continuous readout** of
  `pipePressure` — not the current one-shot `angle: -52` tween. This is the
  player's only pressure instrument and it must be legible at a glance.
- **Delete the floating `[E] RUN TIMETABLE` tooltip.** The RUN lever carries its
  own affordance.
- **Lighten the protagonist's silhouette** to the dusk exterior mid-tone so he is
  the brightest moving thing on screen. He remains the visual center and the only
  directly controlled human.
- Keep low-pixel. Warm brass and cream enamel against the muted dusk palette; no
  glow or bloom — read tungsten as reflection on adjacent metal.

### S5 — Failure legible from the machinery alone

Three distinguishable failures, none named by text:

| Failure | What the machine shows |
| ------- | ---------------------- |
| Never braked | Gauge needle stays low, shoe never clamps, valve turns but no hiss and the needle does not move |
| Bled too briefly | Wheel stops mid-travel, needle drops partway then climbs back |
| Reached the door late, or spaced the slots too far | Needle has visibly climbed back above the mark; the latch lifts a hand's width, holds, and drops with a clank |

`FAIL_LINES[2]` stays `null`. No toast names the right order or the right slot.

### S6 — Diagnostics and QA hooks

`render_game_to_text()` must report, per frame: the three slot statuses and
commands, `pipePressure`, `doorThreshold`, pointer/active slot, `drum.waiting`,
hold state (`elapsed` / `required` / `grace`), player x, and per-device presence
booleans. **Every field a visual reads must appear here**, so a state/visual
mismatch is catchable without eyes on the screen.

## Out of scope

- **Sections I, II, IV, V, VI are not modified.** No changes to their stage data,
  layout, solutions, guidance, or timing. Section II keeps `guideSequence`;
  V and VI keep `pressureHold` and `echoGates`.
- Rolling the pressure model out to any other section.
- The pneumatic valve matrix and the airlock-programmer rewrite (candidates only).
- A hand-pumped primer controlling drum speed — rejected as abstract time math.
- Requiring presence for BRAKE. It stays the free teaching slot.
- Removing the 70 px presence radius or the 0.4 s hold.
- Surfacing `stage.lesson` as displayed text.
- Any Godot work. `godot-porting` was consulted only to confirm this is in-engine
  Phaser work; **do not start a migration.**
- Paid asset generation. No budget is approved (see below).

## Authoritative constants

| Thing | Value |
| ----- | ----- |
| Slots | **3** |
| Slot duration | 2200 ms |
| Pressure recovery to threshold | **3000 ms** after a bleed commits |
| Presence radius | 70 px (VENT, DOOR) |
| VENT hold | 400 ms |
| Reaction grace | 320 ms |
| Walk speed budget | `MOVE.speedWalk` 200 — never budget against `speedRun` 310 |
| Layout x | punch press 1690, RESET 1800, RUN 1900, BRAKE 1990, VENT 2110, DOOR 2330 |
| Room | `startX` 1600, `endX` 2390 |
| Hard ceiling | **Nothing at or past x=2378** (incomplete-stage guard resets the player there) |
| Min control spacing | 90 px (62 px nearest-interactable pickup radius) |

## Asset plan (no cost this round)

Everything in S4 is buildable from Phaser primitives already used in
[tutorialTrainRoomsArt.js](../src/art/tutorialTrainRoomsArt.js): rects for enamel
panels and pipe runs, circles for rivets and the gauge bezel, lines for the
filament and needle. `applyDrumAction` already drives `brakeShoe`, `bogie`,
`ventValve`, `gaugeNeedle`, `doorLeaf`, and `powerLamp` — **no new machinery has
to be invented.**

No paid generation is approved. If a 16:9 image-to-image concept reference is
wanted later, it needs a separate request naming model, per-call price, total cap,
output path, and whether the result is concept reference or shippable asset.

## Acceptance criteria

1. Punching BRAKE / VENT / DOOR into adjacent slots and walking (never running)
   completes the stage.
2. Leaving a slot gap between VENT and DOOR **fails at the latch**, and the gauge
   needle has visibly climbed before it does.
3. Spending the third card on a second VENT is a legal alternative plan.
4. A player who never finds the run key can complete the stage.
5. Three failure modes are visually distinguishable per the S5 table, with no
   text naming a cause.
6. `FAIL_LINES[2]` remains `null`.
7. No screen state depends on a field that nothing writes. **Grep every new field
   for both a read site and a write site.**
8. `waitForHand` is either implemented with a read site or deleted with its comment.
9. No interactable at or past x=2378; all adjacent gaps ≥ 90 px.
10. Deleting the `drum` field from `junction-3` restores the shared ordered-queue
    path and the stage is still completable.
11. Sections I, II, IV, V, VI behave identically to before — verified, not assumed.
12. The protagonist is the brightest moving element; no control, label, or panel
    occludes him or another control.
13. `npm run build` clean.

## QA route

1. `node --check` on every touched file, then `npm run build`.
2. **Arithmetic first, before art.** Assert in a scratch script: adjacent-slot
   door fires at 1.5 s with 0.38 s walk slack; gapped door fires at 3.7 s and is
   refused; recovery is 3000 ms.
3. Walk the happy path in a browser at walk speed only. Confirm completion.
4. Walk the gapped-slot plan. Confirm the latch refuses **and** that the needle
   climb is visible before the refusal.
5. Run the double-VENT plan. Confirm it completes.
6. Reproduce each S5 failure and confirm it is distinguishable **with the text
   layer ignored** — screenshot each, judge from the machinery only.
7. Cross-check `render_game_to_text()` against each screenshot: every slot status,
   the pressure value, and the latch state must agree with what is drawn.
8. Press RESET mid-run. Confirm the drum stops, three cards clear, machinery
   returns to initial state, the player does not move, and sections I–II progress
   survives.
9. Jam one slot, re-punch only that slot, re-run. Confirm completed slots are not
   re-executed and no progress is lost.
10. Field audit: grep every new field for a read site and a write site.
11. Delete `stage.drum` from `junction-3`, rebuild, confirm the ordered-queue
    fallback still completes, then restore.
12. Play sections I, II, IV, V, VI start to finish. Confirm no behavior change.
13. Frame-hitch regression: simulate a 3 s hitch and a 20 s backgrounded tab;
    every slot must still be entered exactly once.

## Failure and rollback rules

- Failure is **per slot**. The card jams and stays legible; other slots keep
  their results; the player re-punches only what failed.
- RESET is player-invoked and **clears everything** — three cards, pointer,
  section III machinery, pressure. It never moves the player and never rolls back
  sections I–II. It can stop a turning drum.
- No attempt limit, no resource cost, no position penalty. If all three slots
  jam, the machine returns to its documented start state and all three slots are
  punchable again.
- **Rollback:** deleting the `drum` field from `junction-3` in `src/level.js`
  restores the shared ordered-queue path. This must remain true at every commit;
  criterion 10 tests it.
- If the pressure model does not read clearly in playtest, fall back to the S4
  visual reorganization alone — it is independently valuable and independently
  shippable. Do not fall back to the boolean drum with the old panel art.
