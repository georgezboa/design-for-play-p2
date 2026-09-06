# Prologue IV–VI theatrical environment lock

Status: `REJECTED / DO NOT EXTEND`

Human playtest on 2026-08-05 rejected the rolling-bearing service table,
abstract launched bearing, right-side receiver, balance-rig revision and red
failure banner. Preserve this document only as implementation history until the
replacement IV–VI gameplay lock is approved.

Target render:
`outputs/prologue-iv-vi-environment-target/krz-stage-target-v1.png`

Hunyuan 3D reference (isolated hero machinery):
`outputs/prologue-iv-vi-environment-target/modeling-reference/bogie-rocker-counterweight-hunyuan-reference.png`

## Decision

Phases IV–VI are no longer presented as a photographed service plate covered
with equally bright controls. They are three performances on one continuous
train-underfloor stage. The player still opens the service hatch and uses the
same point-and-click verbs, but the close-up is an architectural cutaway:

- a narrow passenger-cabin silhouette above;
- a pump/reservoir pool of light at left;
- one full bogie, rocker beam and sliding load in the centre;
- the A/B bearing route, open contact and coupling cradle at right;
- one cyan pressure line and one brass electrical/bearing line connecting all
  three zones.

The target borrows Kentucky Route Zero's **stagecraft principles**, not its
specific art: fixed theatrical framing, large negative space, actor-like
blocking, selective light cues and economical reuse of a set. The train,
machinery, palette, characters and composition remain original to Nightfall.

## Visual grammar

1. At most one causal zone is the brightest zone before the bearing moves.
2. The player reads a physical journey, not a diagram: reservoir to rocker to
   route to output.
3. Inactive machinery remains present as a near-black silhouette; it does not
   disappear when a phase changes.
4. Red is reserved for one actual break or failed endpoint. Cyan means stored
   pressure / live circuit. Brass means the bearing's mechanical path.
5. Text never lists the solution. Short parenthetical stage directions may
   describe an outcome after the player has already seen it.
6. The same hit targets remain in the same spatial roles in IV, V and VI.

## Gameplay arc

### IV — Load the rail

The player sees the whole sentence for the first time. The hand pump visibly
raises fluid in the reservoir. The load carriage moves on the rocker and
compresses one suspension side. RELEASE sends a real bearing through the
lit path. An underpowered bearing rolls back at the reservoir; a misweighted
bearing falls into the centre return cradle. These endpoints remain faintly
marked so a second plan uses evidence rather than memory or prose.

### V — Find the break

The same pressure and release actions prove route A. Throwing the same physical
knife to B sends an otherwise identical run to a visible gap between two
ceramic terminals. Only after this comparison can the copper bridge be seated.
The right-hand bay is a machine in the world, not a five-button repair menu.

### VI — Meet the past

All three pools are live. The translucent remembered bearing loops on the upper
rail while the present bearing uses the familiar lower path. A fixed launch cam
sits exactly one present-bearing travel time before the coupling cradle. When
the replay trips that cam, its fork and the familiar spring RELEASE light as one
physical event; releasing there makes both bearings arrive at the cradle
together. The cradle remains the visible meeting point rather than becoming a
countdown UI. A miss leaves a dim afterimage on the side from which the present
bearing arrived, so the next release can be intentionally earlier or later.

## Acceptance

- The environment reads as one train cutaway at a glance, not a modal UI.
- IV, V and VI share one machine and one palette, but ask load, diagnosis and
  timing questions respectively.
- Wrong runs stop at the physical rejecting part and recover in place.
- The board remains understandable with default explanatory text removed.
- Visible pressure, load, route, bridge, bearing and ghost agree with
  `render_game_to_text()`.
- Existing deterministic model tests, browser QA routes and normal completion
  remain valid.

## Browser verification

- IV: an underpowered release visibly returns at the reservoir and remains as
  evidence; pressure + right detent + release completes through the visible
  output wheel.
- V: A reference pass, B open-contact stop, fixed B-branch hanging jumper and
  repaired B pass were completed by real pointer input. The repair object does
  not move with the A/B selector.
- VI: the snapshot exposes `releaseProgress` and `releaseWindowActive`; the
  upper cam, RELEASE hardware and coupling cradle agree with that state. A real
  pointer release during the cam window completed the stage.

## Hunyuan bogie integration

> **SUPERSEDED FOR RUNTIME (2026-08-05 HUMAN REVIEW).** The optimized model remains a valid offline scale/material reference, but the baked WebP underlayer is no longer loaded or rendered in Phase IV. In the live puzzle it read as a pasted photograph and competed with the moving equalizer geometry. The accepted replacement is a fully live, simplified suspension-balance rig: reservoir pressure and trolley load rotate the same equalizer beam, and a moving pin visibly enters a fixed fork at equilibrium.

- George supplied the Hunyuan GLB generated from the isolated machinery brief.
  Source inspection found one coherent mesh with 1,499,318 triangles and three
  embedded 4096px PBR maps. The wheels, springs, equalizer beam, pivot and
  counterweight all survive the locked side camera and are appropriate for the
  centre-stage mechanical silhouette.
- The editable source derivative stays outside Git under
  `NIGHTFALL_Source_Assets/01_PROLOGUE/HUNYUAN_GENERATED/optimized/`. It is
  normalized to 3.20m overall length, reduced to 48,000 triangles and repacked
  with 2048px textures. Source hash, conversion settings and ownership notes are
  recorded beside the runtime derivative.
- Phaser does not load the 3D mesh. It loads the fixed-camera transparent
  `bogie-stage-v1.webp` render (about 73KB) as a subdued structural underlayer.
  The rocker, moving counterweight, spring compression, bearing, route break
  and failed-contact evidence remain live Phaser graphics, so the imported art
  adds believable detail without hiding the puzzle state or adding WebGL mesh
  cost.
- Connected-browser inspection passed in IV, V and VI. Evidence is stored in
  `outputs/prologue-iv-vi-bogie-import/browser/`.
