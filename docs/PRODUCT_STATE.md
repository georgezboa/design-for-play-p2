# Infinity Train product state

Last reviewed: 2026-08-03

## North star

Build a complete 2D single-player train journey whose cars move backward
through different eras. Each car should feel like a compact mechanical and
narrative episode rather than another stretch of the same platforming/combat
level.

## Current playable build

The opening is a 4,800-pixel Prologue made of six connected train sections. The
player uses a brass ticket punch and direct physical controls to teach the train
DOOR, BRAKE, POWER, VENT, and COUPLE actions. The final section requires timing
the present player's actions with an authored replay of an earlier action.

The Prologue currently includes:

- six gated sections with persistent completed-room states;
- period train motion and physical undercarriage feedback;
- a world-space carriage shell over the station panorama;
- a departure cinematic and `CHAPTER ONE // THE SAFETY TEST` transition;
- deterministic development routes for every major puzzle and transition state;
- a production-verified world-background pipeline for all ten panoramas.

After the Prologue, the build still enters inherited prototype content. That
material contains useful movement, lane, combat, dialogue, checkpoint, and
world-switching systems, but it is not yet a finished Chapter One and its
witness/simulation story is not authoritative canon.

## Accepted experience rules

- The protagonist is the only directly controlled human.
- A remembered self may be an authored replay, but not a continuously controlled
  second avatar.
- Train interiors inherit the exterior world's material language.
- First-time rules should be demonstrated by environmental states before prose.
- New rooms exist as dim physical spaces before activation; doors should not
  make content pop into existence.
- Completed spaces remain visible as non-interactive tableaux with their final
  machinery state intact.
- Mechanical success is shown through the affected machine, then the door or
  partition transition, rather than only through text or a gauge.
- TIMETABLE faces are primary instruments, not small labels. Their schedule
  display stays visually separate from the handles and machine controls below.
- Crisp low-pixel/low-poly rendering and clear silhouettes are the current art
  direction.

## Current product gap

Chapter One needs a product-approved vertical slice. Its mechanic must express
`THE SAFETY TEST`, use the AI-apocalypse exterior, build on the player's new
relationship with the train, and avoid becoming either another timetable-order
puzzle or a return to generic combat-only progression.

**Accepted 2026-08-03.** Chapter One is now the teammate-authored cyberpunk
parkour car. The player crosses a neon industrial exterior by dragging ladders
and movable blocks horizontally to construct routes, then timing jumps onto
autonomous flying-car platforms to reach a goal balcony. The cyberpunk theme is
intentional and approved for this car. This is an explicit exception to the
project-wide rule against making every car the same left-to-right 2D level; it
does not set the visual style, camera, or topology for later cars.

This decision supersedes both the AI-apocalypse exterior requirement in the
paragraph above and the earlier `The Proctor` Chapter One design below. The
existing Prologue remains frozen, and the isolated present-city Car 03 remains
separate. The executable scope and QA contract are in `docs/NEXT_TASK.md`.

**Superseded 2026-08-03.** Chapter One's previously accepted interaction was "The
Proctor". The AI runs a safety test on the *train*, and the player is the
proctor — the five Prologue device verbs become diagnostic queries instead of
commands, and the player stamps PASS or FAIL at a console. The train is failing,
so the player learns to restage conditions and re-test until it passes. The twist
is that the final test is a witness scan reading the *player*, so passing the
train means exposing yourself; the player must deliberately stamp FAIL, and the
car goes dark as unfit for service while the tracking beam sweeps past a train
the system has written off.

Full reasoning, including the rejected "examiner inversion" design and why it
failed, is in `docs/GAME_DESIGN_MASTER.md` under 车厢 2. The short version: the
first design's twist punished the compliance reflex it had just spent minutes
conditioning, and its escape hatch was a compound action that had never existed
in the game. Two independent external reviews converged on that flaw. The
replacement makes the twist an *application* of the stamping action the player has
already performed a dozen times.

The inherited post-Prologue combat area remains prototype material and is not
authoritative for the approved cyberpunk parkour car. Chapter One implementation
is now scheduled by the current `READY` handoff in `docs/NEXT_TASK.md`.

## Parallel workstream: Phase 1 depth and presentation

Reviewed 2026-07-29. A code audit of the shipped Prologue found two problems that
are independent of the Chapter One decision and can proceed now.

Mechanical depth: clearing the Prologue takes 17 interactions but contains only
one genuine decision, the three-command ordering in section III. Guidance and
validation duplicate each other three times over — input-layer pre-validation
rejects wrong answers before they land, the next correct device is tinted gold,
and error toasts name the correct command. Four of the six authored `FAIL_LINES`
are unreachable, and sections I, II, V, and VI cannot fail at all.

Presentation: the environment work is strong (17 continuous ambient loops, real
squash/stretch, an authored completion camera grammar), but there is no
screen-level game feel (`timeScale` is never used), no music or ambient audio
loop of any kind, no pitch variation so repeated cues are byte-identical, and the
player's entire airborne state is two static frames.

Plan and task sequence: `docs/PHASE1_POLISH_PLAN.md`. Three tasks, presentation
first (lowest risk, no product dependency), then guidance tiering, then time
windows and the echo rework once playtest data exists.

## Accepted 2026-07-30: the Prologue's core loop is the problem, not any one section

The Phase 1 polish tasks all landed and playtesters still reported "no real
mechanical difference." Diagnosis accepted: all six sections share one loop —
walk to the rack, punch commands while standing still, press RUN, spectate. The
TIMETABLE, the game's central prop, contains no time; punch order is execution
order at a hard-coded 540 ms interval.

> **SUPERSEDED 2026-07-30 (later same day).** Everything from here to the end of
> this section describes the boolean-causality drum as built. It shipped a stage
> with **zero real player decisions** and a visual language the user judged to be
> a HUD panel pasted into the carriage. The replacement decision is the next
> section, `Accepted 2026-07-30 (revised): pressure is a resource`. The layout
> numbers, the six fixed defects, and the rollback switch below all **remain
> authoritative** — only the causality model and the room's visual organization
> are replaced. Audit: `docs/SECTION_III_REDESIGN_AUDIT.md`.

**Superseded decision — section III becomes a rotating-drum pilot.** The punch rack
becomes a **3-slot drum at 2.2 s per slot** (6.6 s per revolution). The player
punches three cards in the order they choose; punch order is execution order, the
rule sections I and II already taught, now with a clock attached. VENT and DOOR
require the player within 70 px of that machine when its slot fires, and VENT
additionally requires E held for 0.4 s; BRAKE fires unattended as the free
teaching slot. Causal order `BRAKE → VENT → DOOR` is unchanged. Failure is
per-slot — the card chars, other slots keep their results, and the player
re-punches only what failed.

**Revised down from 6 slots at 1.1 s, and one headline claim withdrawn.** The
6-slot version paired every card with a slot-index dial, and its selling point
was that the player would choose their own time pressure. Neither held up. A
1.1 s slot is shorter than the 1.05 s walk from RUN to the valve plus the 0.4 s
hold, so no adjacent pair of slots was ever survivable and the "choose your
spacing" freedom was fictional. And with three cards, three slots, and exactly
one legal causal order, there is no spacing decision left at all — every player
runs the same plan on the same clock. External design review reached this
independently.

**What section III actually pilots, stated honestly:** the player's *body* enters
the loop for the first time. They cannot punch and then spectate; they must be at
the valve, then at the door, while the drum turns. That is the single new variable
and the playtest question is whether it alone reads as a real mechanical
difference. **Player-selected tension is deferred**, and it is the strongest
argument for a wider drum returning in a later section once one has been walked
in a browser.

Scope is deliberately one section. **Sections I, II, IV, V, and VI are not
modified.** The drum is gated on a `stage.drum` field so deleting that one field
restores today's section III, which is the pilot's rollback insurance.

Direction sourcing and what was deferred: `docs/PROLOGUE_INNOVATION_DIRECTIONS.md`
section 六 carries the full status table. The spine is direction A (living
timetable) plus exactly one slice of direction B (VENT is held, not tapped).
Direction C (the train pre-punching a slot), D (moving finale), E (the sweeping
search beam), and the closing cards-in-the-drum egg all remain candidates and
none are implemented. C was specifically rejected *for this section* because a
non-removable card would read as a bug before the partner relationship exists.

Two numbers were corrected against the code during this decision and are recorded
because both were wrong in the incoming proposals: section III's device interval
is **147 px**, not 98 px, which is why 1.5 s slots absorbed all walking and made
the pilot's headline feature vacuous; and single-slot re-runs require the device
actions to **set** state rather than toggle it, or a player loses progress by
succeeding. Full reasoning is in `docs/GAME_DESIGN_MASTER.md` section 一bis.

**Implementation status — the pilot is built and builds clean.** `src/level.js`,
`src/tutorial/TimetablePuzzle.js`, and a new `src/tutorial/drum.js` carry it;
nothing is committed. Authoritative layout is `DRUM_LAYOUT` in `src/level.js`:
punch press 1690, RESET 1800, RUN 1900, BRAKE 1990, VENT 2110, DOOR 2330.
Verified against `MOVE.speedWalk` 200: RUN→valve is 210 px = 1.05 s against a
2.2 s slot, valve→door is 220 px = 1.10 s against another 2.2 s, so **both legs
clear on foot with the 0.4 s hold and 0.32 s reaction grace paid** and the run key
is never required. Minimum control spacing is 90 px, clear of the 62 px
nearest-interactable pickup radius; DOOR sits 48 px inside the 2378 room guard.

The slot dial was removed rather than shrunk. Three standalone command keys were
also tried and abandoned — at 96 px minimum separation, five bench controls plus
three machine legs do not fit between `startX` 1600 and the guard. The press is
now one machine with three lettered enamel keys: `←/→` picks, `E` strikes.

Six defects were found by auditing the built code and are fixed:

- **Completion could soft-lock.** A re-punch leaves the charred original in place
  and puts the retry in another slot, so one command owns two cards. Testing only
  the first card bearing that command kept reading the charred one, and the stage
  could never close even with all three commands fired. Now any completed card
  satisfies it.
- **A frame hitch or backgrounded tab skipped slots silently** — never fired,
  never charred, card ejecting unmarked. The sweep now steps one slot at a time;
  simulated a 3 s hitch and a 20 s background jump, both enter every slot.
- **The VENT hold had no reaction window.** A player standing at the valve who
  pressed the key a frame late charred with nothing to perceive. There is now a
  0.32 s grace to get the key down, and the valve prompt reads `[HOLD E]` during
  a run, which is how the hold teaches itself.
- **`drum.waiting` was read in four places and written in none.** Input gating,
  pointer drawing, the `[HOLD E] BLEED THE LINE` prompt, and diagnostics all
  consulted it; it stayed at its initial `-1` for the entire life of the stage, so
  **the hold prompt could never appear** and the only on-screen explanation of the
  hold requirement was dead. It is now set when the pointer enters a
  presence-gated slot and cleared on all four exits — commit, jam, RESET, and a
  fresh RUN.
- **Two source comments documented mechanics that do not exist.** One described a
  pointer that parks and waits at a presence slot, referencing a `waitedMs` field
  that was never written; the drum deliberately does *not* stop, because a
  stopping pointer would make a late player's failure invisible. Another gave
  RUN's x as 1830 when the constant says 1900, which overstated the walk budget by
  0.35 s. Both now match the code.
- **Three dead exports** (`slotDeadlineMs` among them) were exported from
  `drum.js` and called from nowhere. `slotDeadlineMs` in particular looked like
  evidence that slot deadlines were unimplemented; the scheduler derives the
  active slot from the wall clock instead, which is the more robust choice. The
  unused exports are gone so the next reader is not misled the same way.

Also verified rather than assumed: the drum's `run()` returns before the legacy
path freezes the player, so the body stays mobile; device actions are absolute
assignments and absolute tween targets, so re-runs cannot undo progress; causal
order is checked against persistent machine state, not the slot list, so a
re-punched VENT is not blocked by a BRAKE that already succeeded and is no longer
on the drum; the drum uses no Phaser timers and is torn down on both stage
advance and QA warp.

This Section III task was the playtest and review contract for the pressure
pilot at the time. That work is now frozen; the current `docs/NEXT_TASK.md`
instead schedules the approved Chapter One cyberpunk parkour vertical slice.

**Playtest refinement accepted 2026-07-30.** Section III now has a dedicated
RESET handle and a clearer left-to-right control language:
`PUNCH PRESS → RESET → RUN → BRAKE → VENT → DOOR` (the `SLOT +1` dial named in
the first draft of this line was removed with the 6-slot design). RESET is
player-invoked, not an
automatic failure penalty: it stops a turning drum, clears all six cards,
returns the pointer and section machinery to their initial state, and preserves
the player position plus all earlier-room progress. Local failed-slot re-punch
remains available for players who want the faster recovery.

**Duplicate-card safeguard accepted 2026-07-30.** Each mechanical command may
have only one live card on the drum. A charred card may still be retried in a
new slot, but a pending or completed BRAKE/VENT/DOOR card blocks another copy.
RUN also refuses an incomplete timetable before turning. The readable safe plan
is shown with letters as `B · V · D ·`; this validation reveals neither the
causal order nor the player's required movement timing beyond the three machines
already physically present in the room.

> **Two stale 6-slot references corrected.** "clears all six cards" and the
> `B · V · D ·` four-position display are leftovers from the withdrawn 6-slot
> design. The drum has **3 slots**. RESET clears three cards and the display
> carries three positions. The duplicate-card rule and the RESET semantics
> themselves are unaffected and remain accepted.

## Accepted 2026-07-30 (revised): pressure is a resource, and that is where the decision lives

Supersedes the boolean-causality drum above. Driven by four external audits
(DeepSeek reviewer + critic, Kimi critic + visual director) and a code audit;
full record in `docs/SECTION_III_REDESIGN_AUDIT.md`.

**Why the built version had to change.** Two independent reviews and my own read
of the code agree the stage contains **zero real decisions**: `commands` and
`solution` are both `['brake','vent','door']`, three cards fill three slots,
`causalBlocker` jams any other order at the first misplaced slot, and the worst
walking leg leaves 0.70 s of slack. The stage reduces to *remember the order,
then walk right*. Better art cannot fix that, and the user explicitly ruled out
hiding it behind more text, arrows, highlights, or a bigger panel.

**A worse problem was found underneath it.** The causal rule was never delivered
at all — not by text and not by machinery. `stage.lesson` (the sentence about the
door not releasing under pressure) is **never read anywhere in `src/`**;
`guidance: 'machine'` has **no consuming branch**; `waitForHand: true` is
declared with a comment calling it "the single change that makes the timing
legible" and **nothing reads it**. With the already-fixed `drum.waiting`, that is
four fields following one pattern: declared, argued for in a comment, never
wired. **Every new field in the replacement must ship with its read site, and
the QA route must assert this.**

**The accepted change is one model swap.** `causalBlocker`'s boolean chain
becomes a continuous **brake-pipe pressure value**. BRAKE traps pressure, VENT
bleeds it, and DOOR can only unlatch below a threshold — *and pressure creeps
back up*, so **3.0 s after a bleed the door refuses again**. Slot spacing gains a
physical consequence for the first time.

That produces the two genuine, readable judgements the stage was missing:

- **How far apart to place VENT and DOOR.** Adjacent slots fire the door 1.5 s
  after the bleed commits — inside the window, with 0.38 s of walking slack.
  Leaving a gap pushes it to 3.7 s, past the window, and the latch refuses.
  Verified against `MOVE.speedWalk` 200 and the 0.32 s grace plus 0.4 s hold.
- **Whether to spend the third card on a second VENT** to buy a wider door
  window instead of a tighter walk.

Both plans are legal at different costs. This is the opposite of the 6-slot
failure recorded in `GAME_DESIGN_MASTER.md` section 一bis, where fixed slot
width, fixed card count, and unique causality collapsed the plan space to a
single point; pressure recovery loosens two of those three constraints.

**Visual reorganization accepted in full.** The room is rebuilt in night-train
material language: the black rounded-rect panel becomes an enamel recess set into
the carriage lining with a brass bezel; the six equal-height buttons separate by
**mounting surface** (BRAKE on a floor bracket, VENT a wall-mounted brass wheel,
DOOR a latch at the carriage edge); a single traceable brass air pipe replaces the
row of labels, carrying visible pressure; the gauge rises from floor level to eye
level and becomes a **continuous readout of the pressure value** rather than a
one-shot tween; the floating `[E] RUN TIMETABLE` tooltip is removed. The
protagonist's silhouette is lightened to match the dusk exterior mid-tone so he is
again the brightest moving thing on screen.

**Cost is lower than it looks.** `applyDrumAction` already animates `brakeShoe`,
`bogie`, `ventValve`, `gaugeNeedle`, `doorLeaf`, and `powerLamp`. No new
machinery has to be invented — the needle changes from a one-shot tween to a
pressure-driven readout, and the pipe plus mounting hardware are Phaser
primitives in the existing art file.

**Retained, unchanged:** BRAKE fires unattended as the only free teaching slot
(rejecting both DeepSeek roles' proposal to require presence for all three); the
VENT 0.4 s hold as the single low-cost side mechanic; absolute-set actions so a
re-run cannot undo progress; per-slot local failure and re-punch; and
`stage.drum` as the one-field rollback switch.

**Rejected:** requiring presence for all three commands; deleting `waitForHand`
instead of implementing it; removing the 70 px / 0.4 s requirements entirely
(Kimi's "fire anywhere in the room" — that deletes the body from the loop and
returns the player to spectating); a hand-pumped primer setting drum speed
(abstract time math, violates one-new-variable-per-step); the pneumatic valve
matrix and the airlock-programmer rewrite (both retained as candidates, neither
in scope); and surfacing `stage.lesson` as text — causality ships in the
machinery or not at all.

**Sections I, II, IV, V, and VI are not modified.**

## Accepted 2026-08-12: Chapter 4 becomes an archive gallery with a moon test

The 2026-08-11 ink-displacement puzzle remains the way the player crosses the
paper car. It now carries three required discoveries: a washable archive in each
bay reveals one supplied image, and `E` expands it into a brief horror fragment
about people who built, worshipped, and researched the same impossible presence.
At the final coupling handle, only after viewing all three, the player selects
one of five supplied marks. The Moon is correct and completes the car; any other
mark kills the player and restarts this standalone slice. This is an explicit
exception to Chapter 4's prior no-punishment rule.

## Accepted 2026-08-11 (second decision): Chapter 4 is an ink-displacement puzzle

George played the plain wash → paint → cross loop below and rejected it as having
no puzzle in it. Read against his rejection of the finite-pigment build earlier
the same day, the two together give the standing design rule for this chapter:

**He rejects bookkeeping, not thinking.** Collecting, budgeting and filling to a
threshold are out permanently. A decision with a consequence is what was missing.
So the input stays trivial — two verbs, one click each, no precision, no
inventory, no meters, no timers — and the difficulty lives in the consequences.

The rule that carries the chapter: **washing does not destroy ink, it moves it.**
Every washable mark has a drain channel drawn on the sheet. Ink that reaches a
hole falls through and is gone; ink that reaches paper stands there as a new blot;
ink that crosses a bridge the player has already painted dissolves it on the way
past. Everything is visible from the first frame, so the puzzle is which order to
act in — never what is hidden. Every wrong order costs a repeat, never a restart,
and an exhaustive search over the reachable state space is kept in the test suite
to prove no ordering can strand the player.

Bay A teaches the rule with no way to fail it, bay B springs the trap, bay C is
the exam. See `docs/NEXT_TASK.md` for the runnable scope, the QA route, and the
one escalation lever held in reserve (saturating holes) if this proves too gentle.

## Superseded 2026-08-11 (morning) — the plain wash/paint/cross loop

Retained as history: this is the build George rejected as "just repeated wash and
paint". The paper carriage remains Chapter 4's setting, but the proposed
finite-pigment puzzle was replaced after play-testing. Paint is unlimited: a brief
PAINT on a large, labelled hidden route makes that entire route real. WASH removes
a large, labelled paper barrier and reveals the next route. The player repeats the
visible loop — **wash barrier → paint path → cross** — rather than collecting or
spending paint. The following 2026-08-07 record is retained only as superseded
design history.

## Proposed 2026-08-07: Chapter 4 is a paper car you have to spend

George set the premise directly: chapter 4 is a paper-ish world, and the mechanic
is magical paint used to change parts of a mysterious train car, uncover hidden
clues, collect important items and reveal the path to the next car. The reference
image supplied with it is pencil-on-paper — folded planes, visible construction
lines, hatching, bare paper — not finished watercolour.

This lands on the Chapter 4 slot already locked in
`docs/GAME_MASTER_V2_SIX_CHAPTERS.md` §8 (`THE PAINTED COUNTRY`,
`paint/erase → reveal/change memory`). The locked core relationship, the
two-material limit, the authored-brush-region rule and the cost twist all carry
over. What changes is the stage: a carriage interior rather than an open
landscape, with the Painted Country visible through the windows and painted on
the long wall.

The design is proposed, not accepted, in
`docs/CHAPTER_04_PAINTED_COUNTRY_DESIGN_LOCK.md`. Its spine:

- **Two verbs on one axis.** PAINT turns a pencil construction line into a real
  surface. WASH turns a real surface back into a line and returns its pigment to
  the brush. Nothing is hidden or inverted; every later rule is a consequence of
  this axis plus the physical behaviour of three pigments.
- **Pigment is finite and the world is the supply.** There is no paint source in
  the car other than the three the player finds and the paint already on the
  walls. Every plank the player stands on was taken out of a picture.
- **The partner is an authored past action, not an NPC.** The car's level design
  is a child's under-drawing — Mara's, at the age the archive stopped keeping
  her. The thesis beat requires painting a door she drew *wrong*, on the ceiling;
  a correct door takes no pigment at all, visibly. The archive can only make real
  what was actually remembered.
- **The cost twist is an application, not a punishment.** The last door needs one
  brush load and the only paint left is the mural of Mara's home. The player
  chooses which part to take, and the finished car keeps that scar permanently.
- **Completion transformation.** The car takes full colour for three seconds as
  the train accepts the witness link, then drains back to paper keeping only what
  the player painted, scar included.
- **Chapter 6 carry.** The `painted-country` slot receives which part of the
  mural survived, as the registry's `world-rule` packet: the kept property is
  what a painted action can make physical in the finale.

Proposed first executable slice is Bay A only — the three teaching beats — as a
standalone entry point named for identity rather than sequence order. Scope,
non-goals and the rejected directions are in the design lock.
