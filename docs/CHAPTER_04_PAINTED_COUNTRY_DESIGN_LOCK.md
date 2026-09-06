# Chapter 4 // THE PAINTED COUNTRY — design lock

Status: `SUPERSEDED FOR PLAYABLE SLICE` — product decision 2026-08-11
Product lead: Claude Code
Date: 2026-08-07

> **Replacement decision — 2026-08-11.** The paper-car setting, PAINT/WASH
> vocabulary, made-real routes, paper barriers, Mara's under-drawing, and
> carriage presentation remain in force. The finite pigment economy, coverage
> filling, brush slots, material collection, water/float route, ceiling gravity,
> wrong-door test, and mural cost do not. Paint is infinite and forgiving:
> PAINT a labelled hidden path to make all of it real. WASH a labelled barrier
> to remove it and reveal the next path. The runnable design is defined by the
> READY task in `docs/NEXT_TASK.md`; this document remains as the superseded
> exploration record.

Extends the Chapter 4 entry in `docs/GAME_MASTER_V2_SIX_CHAPTERS.md` §8. The
core relationship (`paint/erase → reveal/change memory`), the two-material
limit, the authored-brush-region rule and the cost twist are all carried over
unchanged. What is new here is George's framing on 2026-08-07: the stage is a
**mysterious train car**, not an open landscape, and the player is looking for
clues, materials and the way through to the next car.

---

## 1. Core sentence

**Paint makes a drawn thing real. Wash makes a real thing drawn again. There is
only so much pigment, so every road you build is taken out of a picture.**

---

## 2. The idea, in one paragraph

Car 04 is an archive car the train can no longer render. Everything inside it —
walls, benches, stove, the country outside the windows — exists only as a
**pencil under-drawing**: fold lines, construction lines, hatching and bare
paper, exactly the language of the reference image. It is unfinished because
finishing it requires a witness, and the archive lost hers. The player finds a
brush and three ground pigments, and discovers that pigment is not decoration:
a painted line bears weight, a washed plank becomes a line again, and the paper
remembers every stroke. The car is not a level to cross. It is a picture the
player has to spend in order to walk out of.

---

## 3. Why this is the right chapter-4 interaction

Measured against the guardrails in `CLAUDE.md`:

- **A distinct, story-expressive interaction.** No other car's verb is
  *authorship*. Night Service commands a machine, Borrowed Grid repositions
  objects, Move As One copies behaviour. This car edits the substance the world
  is made of, which is the only verb that can carry "a place official records
  say never existed."
- **Cooperation with an authored past action.** The partner is not an NPC
  standing next to the player. It is **the child who drew this car** — Mara, at
  the age the archive stopped keeping her. Her pencil under-drawing is the level
  design, mistakes included, and the player has to work *with* the drawing
  rather than correct it (§7).
- **Understandable physical causality, not scrambled controls.** Two verbs on
  one axis: drawn ↔ real. Every rule that follows is a consequence of that axis
  plus the physical behaviour of three pigments. Nothing is hidden or inverted.
- **Complete-car checklist.** Exterior: the Painted Country through the windows.
  Shell and framing: a paper carriage cutaway in the established side-view
  grammar. Unique readable mechanic: the brush. Character/partner: the
  under-drawing and Mara's cyan thread. Ambient motion: paper breathing, drying
  edges, drifting pigment. Visible completion transformation: §9.

---

## 4. The space

One carriage interior, read in the established side-view cutaway, tall enough to
scroll vertically. Three bays, each a framed diorama the camera settles into:

| Bay | Name | What it holds |
|---|---|---|
| A | `THE COLD END` | Stove, coal scuttle, soot. Entry vestibule from Car 03. The teaching bay. |
| B | `THE WASHROOM` | Basin, indigo bottle, a drawn river running *through the floor* — the child's mistake. |
| C | `THE LONG WALL` | A full-height painted mural of Mara's home, and the coupling door to Car 05 behind it. |

The car is drawn on a single continuous sheet. Bay boundaries are **fold
lines**, and folds are load-bearing: the paper hinges when the car takes a curve,
which changes what is reachable. Ambient, authored, non-random.

---

## 5. The verbs

The pointer aims the brush. This reuses the diegetic point-and-click grammar the
Prologue already established for close-ups; no new keyboard vocabulary is added.

| Input | Verb | Effect |
|---|---|---|
| Move / jump | walk, jump | Positions the body. Unchanged from every other car. |
| Hold left button over paper | **PAINT** | Loads the current pigment into whatever authored region the stroke covers. |
| Hold right button over pigment | **WASH** | Dilutes the region back toward bare paper and **returns its pigment to the brush**. |
| `E` at a palette shelf | load | Swaps which two of the three pigments the brush carries. |

Coverage-based, not shape-recognition. A region fills as the stroke passes over
it; a scruffy stroke and a neat one reach the same state, only at different
speeds. Stroke **direction** is read for indigo and verdigris (§6); stroke
*precision* is never read anywhere.

### The conservation rule

The brush has a finite load. There is no pigment source in the car other than the
three the player finds and **the paint already on the walls**. Washing is the
only way to refill. This single rule is what turns a drawing tool into a puzzle:

> Every surface you stand on was taken from something you can no longer see.

---

## 6. The three pigments

Each is an "important item" in George's sense — but each is *found by using the
brush*, so collection is the puzzle rather than a fetch errand.

**BONE BLACK** — scraped from the cold stove in Bay A.
Solidity. A pencil construction line painted black becomes a real surface with
real collision. Black is the only pigment that bears weight. It is also the only
one indigo can dissolve, which is the whole of §7's second lesson.

**INDIGO** — a laundry bottle behind a washed-away basin panel in Bay B.
Water. Indigo runs *along the direction of the stroke* until it meets a fold or
a downhill fibre, then gravity takes it. It swells paper (a soaked plank sags and
then holds a bend), floats anything light, and dissolves bone black on contact —
so indigo both opens routes and destroys them.

**VERDIGRIS** — bloomed on a brass coupling bracket, exposed by soaking it.
Motion. Painting the *missing motion line* of a drawn thing — a bird's arc, a
windmill's sweep, a piston's travel — grants it one authored movement, in the
direction the stroke was drawn. Verdigris never creates matter; it only lets
drawn matter finish a gesture the child left incomplete.

Only two may be loaded at once. The choice is made at a physical shelf, in the
world, with the two loaded pigments visible on the brush ferrule.

---

## 7. The beat ladder

Each beat introduces exactly one new variable and is fully recoverable in place.

**1 — REVEAL (Bay A).** The vestibule door is painted shut with flat gouache.
Wash it. Under the paint are the pencil lines of a door that was never finished.
*Teaches: wash exposes what is underneath, and paint is a layer, not a fact.*

**2 — SOLIDIFY (Bay A).** The floor has a gap; a construction line crosses it at
knee height. Paint the line black and stand on it.
*Teaches: paint makes a drawn thing real.*

**3 — CONSERVATION (Bay A → B).** The brush empties one plank short of the far
side. The only bone black left in the car is the plank already underfoot.
*Teaches: the resource is the world. The first genuinely uncomfortable decision.*

**4 — FLOW (Bay B).** Indigo is found. A drawn river crosses the washroom floor
and disappears into the wall. Stroke direction steers the water; the fold in the
floor decides where gravity takes it. Float the coal scuttle to reach the shelf.
*Teaches: a second material with its own physical law, and that stroke direction
carries meaning while stroke shape does not.*

**5 — INTERFERENCE (Bay B).** The route onward needs a black bridge over water
that is already running. Black dissolves. The player has to sequence — build,
then divert; or divert, then build — and either order is legal at a different
cost.
*Teaches: the materials have a relationship with each other, not just with paper.*

**6 — THE WRONG DRAWING (Bay B → C).** The only way up is a door the child drew
**on the ceiling**, with the perspective of a seven-year-old: a door that cannot
exist. The player's first instinct is to paint a correct one. Correct lines take
no pigment at all — the paper refuses them, visibly, with the pigment beading and
running off. The wrong door accepts paint immediately, and when it is real, the
car's gravity is the *drawing's* gravity in that region: the player walks onto
the ceiling to use it.
*Teaches the chapter's thesis: the archive can only make real what was actually
remembered. You do not get to fix someone's memory to make it convenient.*

**7 — THE COST (Bay C).** The coupling door to Car 05 is behind the mural of
Mara's home, and there is no pigment left in the car. The door needs one full
brush load. The mural is the only paint remaining.

The player chooses **which part of the mural to wash**: the house, the hill, the
river, the figure standing in the doorway. Each yields a full load. Each leaves a
permanent blank scar. There is no option that takes nothing, and no option that
takes less.

---

## 8. The twist, stated plainly

The chapter spends six beats teaching that paint is a resource, and then reveals
in the seventh that it was *always* someone's memory being spent — including
every plank in Bay A, which came out of parts of the picture the player never
looked at closely enough to miss.

The twist is an application of the action the player has already performed a
dozen times, not a punishment for having performed it. This is the same
correction that saved Chapter One from "The Proctor" (see `PRODUCT_STATE.md`).

---

## 9. Completion transformation

When the coupling door opens, the entire car — pencil-and-paper for the whole
chapter — **takes full color for three seconds**, all at once, as the train
accepts the witness link. Wet edges bloom, the paper grain lights from behind,
and the Painted Country outside the windows saturates to the horizon.

Then it drains back to paper, and what remains is exactly what the player made:
their planks, their diverted river, their ceiling door, and the blank scar where
they took the mural apart. The train couples on and the car stays behind as a
tableau, in the established rule that completed spaces remain visible with their
final state intact.

---

## 10. Failure and recovery

There is no death, no timer, no reset and no red fault state in this car. Every
wrong stroke is undone by washing it, which returns the pigment. The only
irreversible act in the chapter is beat 7, and it is irreversible by design, is
announced by the fiction before it is required, and always leaves a legal route.

A player who paints themselves into a corner — all pigment locked into surfaces
they are not standing on — is never stuck: the brush can always reach the
surface under their own feet.

---

## 11. Art direction

Pencil-on-paper, per the reference: folded planes, visible construction lines,
directional hatching for shade, bare paper for light. This is the
`exposed paper, wet-on-wet watercolor, dry-brush ink` identity from the art
bible §11, pushed toward the **unfinished draft** end of it — the car is a
drawing in progress, not a finished painting.

### The ground is warm off-white, and the value ramp inverts

Accepted 2026-08-07. Every other car in this game is a dark world where the
player is the brightest moving thing. This one inverts that completely: the
world is warm off-white paper and **the player is the darkest mark on it**.
Getting the inversion right is the whole art problem for this chapter.

The neutrals are a warm off-white family — bone, cloud, manilla, kraft, book
cloth — not a cool grey-white. Cool white reads as *screen*; warm white reads as
*paper*, and this car has to read as paper before it reads as anything else.

The ramp runs the opposite way from `constants.js`: the **furthest** plane is
the **lightest**, and each plane closer to the camera takes one more step of
warm grey. Break the monotonicity and the folds stop reading, exactly as
breaking it the other way collapses depth in the dark cars.

| Role | Value |
|---|---|
| Sky / country through a window | `#fdfcf8` |
| Base sheet, carriage lining | `#f7f4ec` |
| One fold back | `#efe9dc` |
| Near plane, ceiling and floor | `#e6dfcd` |
| Shaded side of a crease | `#d8cfb9` |
| Torn and cut edges | `#c9bda3` |
| Contour / hard construction line | `#4a4640` |
| Hatching | `#8d8579` |
| Abandoned guide lines | `#b7af9f` |
| Book cloth (brush handle, stove enamel) | `#cc785c` |
| Kraft (tape, repairs) | `#d4a27f` |
| Pigment — bone black | `#2c2823` |
| Pigment — indigo | `#46618c` |
| Pigment — verdigris | `#6f9c8b` |
| Mara's thread (cyan, re-tuned for a light ground) | `#2f8c9e` |
| The player | `#24211d` |

The single source of truth is `src/chapters/paintedCountry/paperPalette.js`.
Nothing may hand-pick a colour outside it.

Three rendering decisions follow from the ground and are already built:

- **Not `pixelArt`.** Every other car crushes to a hard pixel grid. This one is
  drawn media and a paper edge needs its antialiasing, so the standalone entry
  sets `antialias: true, roundPixels: false`.
- **Draughtsman's overshoot.** Construction lines run past their corners the way
  a real ruled drawing does. It is the cheapest single detail that separates
  "drawing" from "vector shape", and it is in `paperSurface.js:draftLine`.
- **Deterministic wobble.** Hand-drawn drift comes from a seeded generator, so
  the car draws identically on every boot and a screenshot diff means something.
  Line boil is applied at 12fps to two named contours only, never full-frame.

### Reading drawn from real without being told

A painted region carries a wet edge that dries to a dark rim, sits a hair inside
its outline, and **casts a hatched shadow**. A drawn line has none of those. That
one difference — shadow or no shadow — is how the player learns which surfaces
bear weight, and it is why the beam in Bay A is shown half painted and half
drawn in the same silhouette.

### Status

**The whole car is playable**: `painted-country.html`, `src/paintedCountry-main.js`,
`src/chapters/paintedCountry/`. Walk with `A`/`D`, jump with `SPACE`, hold
left-click to paint and right-click to wash. Rules live in the pure, tested
`paintedCarModel.js`; `PaintedCountryScene.js` owns pixels and input only;
`carLayout.js` owns where things sit.

All seven beats are in, across a 2,880px car of three bays.

| Bay | Beats | What it teaches |
|---|---|---|
| A `THE COLD END` | 1–3 | paint makes real, wash makes drawn, and the pigment has to come from somewhere |
| B `THE WASHROOM` | 4–5 | indigo has its own physics, and the two materials have a relationship with each other |
| C `THE LONG WALL` | 6–7 | the paper only takes what was actually remembered, and the way out costs a piece of it |

Bay A's tuning, which is what makes beat 3 exist at all:

| | |
|---|---|
| Slot capacity (the brush carries two pigments) | `0.7` |
| Coverage at which a surface bears weight | `0.75` |
| Free pigment in bay A (soot spill + firebox) | `0.60` |
| What the drawn beam needs | `0.75` |
| Shortfall taken from the plank underfoot | `0.15` |
| What that plank can give before it stops holding | `0.25` |

Bay B's beat 5 is an ordering problem with two legal answers. The plank across
the trough is bone black and the channel above it is water, and running water
takes bone black apart. Cross first and then fill, and the water dissolves a
plank you no longer need. Fill first and you cannot cross — so wash the indigo
back out (the channel is its own valve), recover the bone from the **settling
pan** where the dissolved pigment collected, and rebuild. Nothing in this car is
ever destroyed, which is what guarantees no ordering can strand the player.

Bay C's beat 6 is the chapter's thesis in one action. There is a door drawn
properly on the wall — panelled, handled, the most carefully drawn object in the
bay — and the paper will not take it: the pigment beads and runs off, and costs
nothing. The door the child drew **on the ceiling** accepts paint immediately,
and inside that band the car has the drawing's gravity rather than the player's,
so the way across the unfinished end of the car is upside down.

Beat 7 is the cost. The coupling needs one full brush and the mural is the only
paint left. It accepts any pigment, so the door you walk through is literally
made of the part of Mara's home you decided to spend — and which parts survived
is the packet the `painted-country` slot hands to Chapter 6.

Two things are deliberately not built yet: verdigris has a pigment and a colour
but no authored motion beat of its own (the mural's hill is currently its only
source), and the completion transformation is a rehearsal — a colour bloom —
rather than the full three-second saturation of the country through the windows.
