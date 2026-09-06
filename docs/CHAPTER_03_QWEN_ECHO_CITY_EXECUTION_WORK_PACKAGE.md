# CHAPTER 03 — ECHO CITY — QWEN EXECUTION WORK PACKAGE

Status: `READY FOR QWEN`

Owner: `Qwen`

Date: 2026-08-04

## 1. Mission

Build the isolated course-version Chapter 3 slice as **ECHO CITY**. The player
must learn one clear relationship:

> Observe a behavior cycle, copy it through RESONANCE, and transplant it so a
> person or part of the city repeats that relationship.

This package implements the newest product, ownership, architecture, and art
direction. It supersedes
`docs/CAR_03_QWEN_V2_READABLE_REBUILD_WORK_PACKAGE.md` as the next production
task. The existing `MOVE AS ONE` V2 work is evidence and reusable engineering,
not the final chapter definition. Preserve useful code and tests; do not delete
or reset it merely because the direction advanced.

## 2. Authoritative sources, newest first

Read completely before editing:

1. `docs/COURSE_BUILD_TEAM_EXECUTION_PLAN.md` — ownership, shared-file
   protection, course-build scope, and the three required Chapter 3 sequences.
2. `docs/GAME_MASTER_V2_SIX_CHAPTERS.md` — narrative foundation, Mara/Butch,
   Chapter 3 relationship, art bible, pacing, and six-chapter context.
3. This work package — exact isolated implementation contract.
4. `docs/CAR_03_DESIGN_LOCK_V2_READABLE_PLAY.md` — retain only compatible
   readability lessons: visible targeting, local recovery, depth lanes,
   shape/text/color redundancy, and blind-player acceptance.
5. Current `src/cars/presentCity/**`, `tests/car03/**`, `car03.html`, and current
   Car 03 evidence.
6. Gemini A2 review and manifest as structural reference only:
   `outputs/car03-gemini-visual-directions/CODEX_REVIEW_A2.md`,
   `outputs/car03-a2-production-assets/ASSET_MANIFEST.json`, and
   `outputs/car03-a2-production-assets/PRODUCTION_NOTES.md`.

When older documents conflict with the August 4 team plan or this package,
follow the newer plan and record the conflict in the handoff.

## 3. Product lock

### Player-facing goal

Find Mara in the contemporary city and restore a witness link by teaching the
silent square a behavior the official archive has erased.

### Core vocabulary

- `SOURCE`: the person or object currently producing a repeating behavior.
- `CYCLE`: a short, visible sequence of movement, pause, direction, or physical
  interaction.
- `COPY`: hold/focus RESONANCE on a highlighted source until one complete cycle
  has been observed.
- `RECEIVER`: a highlighted person or city mechanism that can accept the copied
  cycle.
- `TRANSPLANT`: connect the carried cycle to the receiver; the receiver then
  performs it and changes the space physically.
- `RESULT`: the route, crowd formation, barrier, light, shutter, or Mara action
  that visibly changes.

This is **not a rhythm game**. Do not add note lanes, beat-button tests, combo
scores, miss-on-beat failure, or music-gated controls. Sound makes cycles easier
to perceive but never decides whether ordinary input is accepted.

### Controls in the isolated slice

| Input | Meaning |
|---|---|
| A/D or Left/Right | Move |
| W/S or Up/Down | Change depth lane diagonally |
| E | Use RESONANCE on the one visibly highlighted source/receiver; cancel the current link when already linked |
| R | Restart the current Chapter 3 slice |

Never present a hidden inventory or ability wheel. The nearest eligible target
within range receives the only outline and the exact prompt describing the
outcome of E.

## 4. Course-build sequence

Target first-play duration for this isolated course slice: **6–9 minutes**.
Implement all three authored spaces before final polish.

### Space A — LIVING MARKET: copy one behavior cycle

Teaching image:

- A courier performs a plainly readable loop: walk right, stop under a transit
  sign, turn, return.
- A lone pedestrian tries to cross the inspection strip without a recognized
  cycle and is redirected locally.
- The courier's path pulses cyan from feet to sign and back. No prose appears
  until the full demonstration is visible once.

Player action:

1. approach the outlined courier;
2. hold E through one complete short loop to `COPY CYCLE`;
3. the copied cycle appears as three large world-space pictograms, not a HUD
   meter: `MOVE → WAIT → RETURN`;
4. approach the waiting market group and press E to `TRANSPLANT CYCLE`;
5. the group performs the loop, the inspection strip recognizes the pattern,
   and the market gate opens.

Failure/recovery: releasing E before observing one full loop simply drains the
partial trace and leaves the source available. No damage and no chapter reset.

### Space B — TRANSIT SQUARE: combine cycles to reconfigure space

The square contains two physically readable source/receiver chains in one
camera bay at a time:

- a bus supplies a `STOP → OPEN → GO` cycle;
- a crosswalk supplies a `WAIT → WALK` cycle;
- a road barrier can receive the bus door/open phase;
- a crowd island can receive the crosswalk movement phase.

The player carries **one cycle at a time**. A transplanted receiver keeps its
cycle, so the player combines two persistent relationships sequentially rather
than managing a menu. The correct result is visible before traversal:

1. transplant the bus cycle so the barrier opens and closes on a safe loop;
2. transplant the crosswalk cycle so the crowd becomes moving cover across the
   surveillance field;
3. cross while both receiver cycles are physically running.

At least one wrong but eligible transplant must produce a complete readable
result, then remain locally reversible. Example: the wrong cycle makes the
barrier repeatedly stop without opening; the receiver panel shows the cycle's
icons and `[E] RELEASE CYCLE`, so the player can recover without R.

### Space C — SILENT CENTRAL SQUARE: the player becomes the source

All ambient cycles stop. Mara is visible across a closed witness gate. The
square provides a clearly framed recording path containing one movement leg and
one physical interaction.

Player action:

1. stand on the amber record mark and press E to `RECORD YOUR CYCLE`;
2. for a forgiving 4-second window, ordinary movement and one marked physical
   interaction are sampled into semantic steps, not frame-perfect input;
3. stop early with E or allow the window to close;
4. the path is previewed once by an authored Butch echo;
5. focus Mara and press E to `SHARE CYCLE`;
6. Mara performs the movement component while the square performs the recorded
   interaction component; their combined result opens the witness gate;
7. Mara crosses to Butch and says, in English subtitle-ready text:
   `You always walked half a step ahead.`

Completion is the visible reunion and persistent transformation of the square,
not a score screen. Expose a chapter-complete event for later Codex integration,
but do not edit shared routing.

## 5. Architecture contract

### Pure model

Keep a deterministic, serializable Chapter 3 model under
`src/cars/presentCity/**`. It may replace or wrap the current Car 03 V2 model,
but do not pile the new system onto the old hidden priority chain.

Recommended state domains:

- `chapter`: current space, objective, checkpoint, complete;
- `player`: x, lane, lane transition, movement state;
- `focus`: target id, target kind, eligibility, prompt;
- `resonance`: `idle | observing | carrying | linking | recording | previewing`,
  source id, receiver id, progress, carried cycle id;
- `cycles`: serializable semantic steps and current phase;
- `receivers`: installed cycle id, result state, reversible status;
- `mara`: location, visibility, cycle state, reunion state;
- `environment`: market gate, barrier, crowd cover, witness gate;
- `accessibility`: reduce-flash state;
- `events`: source observed, cycle copied, transplant applied/released, visible
  wrong result, recording started/ended, preview complete, reunion, complete.

Model API remains deterministic: `update(dtMs, input)`, explicit E edge action,
`snapshot()`, `drainEvents()`, and `reset()`.

### BehaviorCycle data

Represent a cycle as data, not bespoke scene conditionals. At minimum expose:

- stable `id`, `sourceId`, and `label`;
- ordered semantic steps;
- per-step kind (`move`, `wait`, `turn`, `open`, `interact`), duration, direction,
  and lane delta where applicable;
- loop duration and phase;
- compatible receiver tags;
- icon sequence used by world-space feedback.

Scene animation consumes the same cycle state that gameplay uses. Do not run a
separate decorative timer that can disagree with the model.

### Receiver contract

Each receiver declares accepted tags and maps any applied cycle to a visible
physical result. Incompatible-but-eligible applications must be deterministic,
visible, and reversible; they must not silently no-op.

### Diagnostics

`window.render_game_to_text()` must remain read-only and expose enough state to
verify every source → relationship → result chain, including:

- space/objective/checkpoint/complete;
- player and lane-transition state;
- focus target and exact E action;
- resonance mode, source, receiver, and carried cycle;
- current cycle step/phase;
- every receiver's installed cycle and physical result;
- Mara state;
- persistent environment changes;
- last meaningful event.

### Shared-system boundary

Do not edit shared entry, routing, transition, save, subtitle bus, audio bus,
chapter manifest, `package.json`, lockfiles, `src/main.js`, or
`src/scenes/GameScene.js`. Keep the existing isolated `car03.html` entry
playable. If integration is needed, write a short contract containing event
name, payload, source state, receiver, and a test route; Codex owns the shared
implementation.

## 6. Art and presentation contract

The final target is the August 4 art bible:

- original hand-painted storybook animation language;
- soft urban watercolor and paper-cut crowd silhouettes;
- concrete warm grey, transit green, cyan relationship, amber transmission,
  and red danger;
- oblique side-on 2.5D depth lanes;
- graphite/ink contours, visible paper grain, restrained values;
- selected 12/15 fps secondary motion over 60 fps gameplay;
- cyan relationship paths, amber in-transit paths, and red failed relationships;
- source, relationship, and result visible without relying on text or colour.

Compose three distinct outdoor urban spaces: living market, transit square,
and silent central square. Do not stretch the old carriage interior across the
chapter. Existing A2 hero, Mara/companion, crowd, depth, scanner, targeting, and
accessibility assets may be reused as provisional structural material only when
they fit. Do not claim those procedural assets or old proof composites are
final art. Never crop a concept board into runtime art.

Keep art replaceable:

- separate background, middle-ground mechanisms, far actors, near actors,
  foreground occluders, relationship graphics, and UI;
- keep collision and cycle data independent of painted surfaces;
- use named asset slots and stable origins so Jason's later painted exports can
  replace blockout layers without changing mechanics;
- provide an asset-slot manifest listing filename, dimensions, origin, depth,
  repeat behavior, status use, and placeholder/final status.

Player-facing text is English only. Critical text is at least 20 px at 960×600.
All cyan/amber/red meanings also use line shape, pictogram, motion, and short
words. Support 960×600 and 1280×720 without clipping.

## 7. Tests and evidence

Add honest behavior tests proving at minimum:

1. E with no eligible focus does nothing.
2. Only one source/receiver is highlighted and the prompt matches E's effect.
3. Partial observation does not create a carried cycle.
4. One full visible source loop creates the correct semantic cycle.
5. Transplant changes receiver behavior using the same cycle phase data.
6. Release restores a receiver deterministically.
7. A wrong eligible transplant produces a visible reversible result.
8. The Transit Square requires both persistent receiver relationships.
9. The player carries only one cycle at a time and no hidden inventory exists.
10. Recording samples semantic movement plus interaction without frame-perfect
    timing.
11. Mara and the square consume different parts of the same recorded cycle.
12. Completion requires the reunion transformation and cannot occur by walking
    to the end.
13. Local failures return only to the current space checkpoint.
14. R resets cycles, receivers, Mara, environment, camera-facing state, and
    completion deterministically; ten resets match.
15. Snapshot fields match every scene consumer.
16. No prohibited rhythm-game state exists.

Use only trusted keyboard input on the plain standalone URL for natural-play
evidence. Do not mutate the model from browser scripts. Capture at 960×600:

- market demonstration, source focus, copied cycle, transplant, opened gate;
- both Transit Square sources, one readable wrong result and release, each
  correct transplant, combined crossing;
- silent square, recording, echo preview, Mara share, physical combined result,
  reunion, completion;
- R reset and a no-copy/no-completion control;
- one 1280×720 layout frame.

Save the new run under a new directory such as
`outputs/chapter03-echo-city-evidence/`; do not overwrite the existing Car 03 V2
evidence.

## 8. Verification and stop conditions

Run the scoped Chapter 3 tests, tutorial regression tests, asset check, normal
build, isolated build, and `git diff --check`. Report exact commands and counts.
Do not weaken unrelated tests, commit, push, stage all files, or claim human
comprehension success.

Stop `BLOCKED` only if the isolated implementation truly requires a protected
shared-file edit or if a same-file dirty overlap cannot be preserved safely.
Otherwise finish with:

`READY_FOR_CODEX_AND_HUMAN_CHAPTER_03_PLAYTEST`

The handoff must include the implemented loop, changed files, test/build
results, natural input sequence, evidence paths, placeholder-art inventory,
integration contract, risks, and confirmation that no commit/push occurred.
