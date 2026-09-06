# NIGHTFALL CHAPTER 1 — I–VI CONTINUITY AND ASSET DELTA

**Status:** PRODUCT CORRECTION / READY FOR HUMAN LOCK  
**Date:** 2026-08-06  
**Supersedes:** treating IV–VI as a visually independent archive-carriage minigame  
**Preserves:** the accepted Phase I ticket punch, Phase II relay cabinet and
Phase III local air circuit

## 1. Correction

Chapter 1 is one train waking up, not six unrelated puzzles. The generated
IV–VI V01 images are composition references only. They must not replace the
existing train shell, character scale, brass/cyan color language, relay cabinet
or air-line geometry with a second visual universe.

The chapter uses four relationships in order:

1. **PUNCH records an instruction.**
2. **AMBER electricity carries that instruction through a relationship.**
3. **CYAN air keeps or releases mechanical force.**
4. **WEIGHT tests whether the train can really carry what it records.**

IV introduces only the fourth relationship. V recombines all four. VI adds no
new tool; it changes who performs the learned actions.

## 2. Chapter promise

> Butch wakes a stalled archive train by learning three simple physical
> relationships. When its stored lives begin falling loose, those same tools
> stop being maintenance equipment and become a way to keep contradictory
> memories alive. The train remembers how Butch treated them and helps him in
> return.

The player should finish the chapter able to say:

> I gave the train an instruction, carried it through wire and air, used those
> systems to make room for two memories, and the train copied what I did.

## 3. Six-beat critical path

| Phase | Story beat | Player question | Interaction | New cognitive variable |
|---|---|---|---|---|
| I — WITNESS TICKET | The absent conductor's punch and one blank ticket remain. Butch sees one recorded gesture in the glass and repeats it. The door accepts his punched ticket and classifies him as WITNESS. | “How do I ask this train to respond?” | Walk to punch, one tactile punch, insert ticket at door | One action leaves a persistent mark |
| II — MISSING CONTACT | The punched signal travels under the floor and stops at the relay cabinet. | “Where did my instruction stop?” | Open cabinet, connect coil, watch armature reveal NO contact, connect output, TEST, close contactor | A relationship can interrupt a command |
| III — THE AIR THAT RETURNS | The next door claw will not release because live supply replaces every unit of air Butch bleeds. A thin cyan thread is caught around the isolator handle, the first quiet Mara trace. | “Why does the force keep returning?” | Try bleed, trace pulse to source, isolate, hold bleed, watch claw retract | A source must be separated before stored force can leave |
| IV — THE FIRST WEIGHT | Departure starts; one personal archive case falls onto the baggage cradle and the whole carriage leans. Its witness tag is blank. | “Where can the train safely carry this?” | Drag one case along one rail until the two wheel/suspension sides visibly settle, then punch its witness tag | Weight changes the meaning of the same machine |
| V — TWO TRUE THINGS | Two cases fall with the same witness pattern but incompatible contents. Archivist opens the jettison hatch and says one record must be removed. The train unfolds a second, unsupported cradle. | “Can the systems I repaired make room for both?” | Punch both tags to prove both authentic; plug the existing amber relay lead into the cradle winch; reopen the existing cyan supply to inflate its cushion; place one case on each cradle | Previously separate relationships can support one shared intention |
| VI — THE TRAIN REMEMBERS | The train moves. An amber past Butch repeats the exact Phase IV case movement while a present case slides. Archivist removes part of the echo. | “Will I preserve balance or save the person/memory?” | Counter the echo using the same case drag; leave the optimal balance point to catch the falling case; the train performs the missing counter-movement | The train learned the player's conduct and becomes a partner |

## 4. Phase I simplicity lock

Phase I must last roughly 20–40 seconds and contain only one observation plus
one action. It is a tactile narrative tutorial, not a logic exam.

### Required screen language

- The conductor or his reflection performs one slow punch gesture.
- A blank ticket rests directly beneath the punch.
- The nearby door has the same physical ticket slot and die silhouette.
- Butch punches once; the punched hole emits one amber pulse that travels to the
  door latch.
- The ticket remains with Butch. It becomes the witness tool used on case tags
  in IV and V, so Phase I is not disposable tutorial fiction.

### Explicit exclusions

- no command list;
- no multiple ticket recipes;
- no inventory screen;
- no wrong ticket that forces reset;
- no paragraph explaining WITNESS;
- no more than one `[E]` prompt at a time.

Its interest comes from performance, persistence and mystery: the player copies
an absent person, leaves a permanent mark, and the train remembers the mark.

## 5. IV–VI puzzle limits

### IV — one case, one rail, one false answer and one inference

- Only one draggable case appears during the playable teaching beat.
- Three large physical detents make case placement readable without a gauge:
  right is the initial impact, middle is the convincing first balance, and left
  is the final counterweight when Butch stands at the right exit.
- Position changes must move at least four things together: beam angle,
  suspension compression, lamp angle and window horizon.
- The first balance exposes the blank tag. Punching it plays a 1.5–2.5 second
  memory vignette but does not complete IV. Walking to the exit reveals that
  Butch's own position changes the balance.
- Completion requires the punched case in the left detent, Butch in the right
  exit zone and the carriage level for 600ms. Full sequence and recovery rules
  are locked in `docs/PROLOGUE_PHASE_IV_PLAYABLE_SEQUENCE_LOCK.md`.
- A second and third case may appear in the transition into V, but they are not
  extra IV calibration rounds.

### V — three old tools on one machine

V contains exactly three large actions, each mounted on the second cradle:

1. punch both matching tags;
2. attach the amber lead to the visible winch terminal;
3. open the cyan supply so the visible cushion inflates.

The player then places one case on each cradle. There is no hidden order between
amber and cyan. Power alone visibly folds the unsupported cradle; air alone
floats it out of alignment. Both states persist, are reversible and directly
show the missing relationship.

### VI — no new interface

- The same rail, cases, cradles, amber lead and cyan cushion stay visible.
- Past Butch uses the recorded IV drag path.
- Present Butch only drags/catches. No timing bar or engagement prompt appears.
- Train assistance is performed by the same winch/linkage built in V.

## 6. Existing art to preserve and extend

| Existing art/system | Source | Use in IV–VI |
|---|---|---|
| Train shell, windows, ribs, floor and palette | `src/art/tutorialTrainRoomsArt.js`, `src/art/tutorialCarArt.js`, `src/art/colors.js` | This remains the base carriage. New target art must fit its proportions and charcoal/blue-grey/brass hierarchy. |
| Ticket punch and brass language | existing Phase I art plus `CAR.BRASS_*` colors | Convert punch into a persistent carried/holstered prop and create compatible witness tags. |
| Door latch, underfloor cable trough, contactor | `src/art/contactInterlockArt.js` | Extend the amber route from the solved relay/contact chain to the second-cradle winch. Do not redraw a new electrical system. |
| Relay cabinet close-up | `src/art/relayCabinetArt.js` | Preserve unchanged. V reuses only its proven amber output lead and physical visual language. |
| Reservoir, isolator, gauge, bleed and cyan pipe | Phase III art currently assembled by `TimetablePuzzle.js` plus `localAirCircuit.js` | Extend one clearly branched cyan hose to the second-cradle air cushion. Reuse the same isolator state; do not add a new valve panel. |
| Amber/cyan feedback atlases | `src/assets/shared/painterly/signal-feedback-atlas-v01.*` | Use for path accents only after the real part moves. |
| Paper/paint treatment | `src/assets/shared/painterly/**` | Normalize new archive-case and carriage layers to the existing storybook surface. |
| Butch and Mara concepts | `src/assets/characters/concepts/v01/**` | Composition/scale reference only until the character owner delivers approved runtime art. |

## 7. New art still required

### A. Continuity bridge assets — highest priority

These make the back half visibly belong to the front half.

| ID | Asset | States / delivery |
|---|---|---|
| LINK-01 | Persistent brass ticket punch | fixed stand, carried/holstered, punching case tag; same silhouette and pivot |
| LINK-02 | Witness ticket and case tags | blank, punched amber, duplicated R-17 pattern, Archivist-cropped; separate paper/tag/hole layers |
| LINK-03 | Amber extension lead | parked, dragged, connected, tensioned, powered; visually continuous with Phase II cable trough |
| LINK-04 | Cyan cradle branch | rigid main branch, flexible hose, coupler, empty/pressurized cushion; visually continuous with Phase III pipe |
| LINK-05 | Shared underfloor junction | one credible bracket where Phase II electricity, Phase III air and IV load structure converge without becoming a control panel |

### B. Shared IV–VI set

| ID | Asset | States / delivery |
|---|---|---|
| SET-01 | Overhead archive rack | shut, first release, purge release, jammed/resisted |
| SET-02 | Main baggage cradle | empty, loaded, left/right tilt, stable, strained |
| SET-03 | Equalizing beam and suspension links | continuous angles, independent left/right compression, named pivots |
| SET-04 | Hidden second cradle | folded, unfolding, unsupported-fold, air-supported, cable-aligned, locked |
| SET-05 | Winch/cable/pulley set | idle, powered-no-support, aligned, train-autonomous correction |
| SET-06 | Physical jettison hatch | closed, opening, open, mechanically resisted |
| SET-07 | Reactive carriage props | two lamps, cup, ticket book, strap and luggage net with left/right/settled poses |

### C. Three narrative cases

| Case | Narrative connection | Required art |
|---|---|---|
| Work case | Chapter 2 foreshadow: battery/coil passed between two hands | leather/metal shell, tag, handle, lid glimpse, fall/slide/bracket poses |
| City case | Chapter 3 foreshadow: two people matching a repeated step | commuter shell, transit token, paired shoes/metronome glimpse, R-17 tag, cyan repair stitch |
| Country case | Chapter 4 foreshadow: one hand paints while another steadies the page | paper-wrapped shell, painted stone/brush/folded paper glimpse, same R-17 tag and cyan stitch |

### D. Character animation additions

- Butch: copy punch gesture; inspect/punch case tag; two-hand case drag; brace
  left/right; stumble; catch case; hanging recovery; quiet recognition.
- Conductor: one slow punch demonstration and fade/reflection hold.
- Past Butch: reuse approved Butch performances with amber recording treatment,
  not a separately redesigned ghost.
- Mara: reflection hand ties cyan thread; one tension pull and release.

### E. Story and motion layers

- three 1.5–2.5 second memory tableaus matching Chapters 2–4;
- Archivist cold crop corners, mask and jettison sweep, with no generic red alert;
- case fall/impact/slide dust, cable strain, air-cushion inflation, beam and lamp
  settling;
- amber recorded path and cyan physical thread;
- three-layer moving exterior night panorama and independent window reflections;
- short entry failure, V reveal, VI catch and departure camera beats.

### F. Audio still required

- punch, ticket insertion and persistent witness stamp motif;
- archive rack release plus light/medium/heavy case impacts;
- leather/metal sliding loop;
- equalizing beam groan, air cushion inflate/deflate and winch start/run/stop;
- jettison hatch and Archivist crop tone;
- amber echo playback texture and cyan thread tension sound;
- train autonomous correction/catch signature;
- one Archivist line: `ONE RECORD MUST BE REMOVED.`;
- four music layers: dormant train, human memory, trust, departure.

## 8. Target-frame V02 corrections

**V02 continuity target generated:**
`docs/visual-references/prologue-iv-vi-narrative-v02/TF-V02-I-IV-continuity-target-v01.png`

**V03 playable-sequence storyboard generated:**
`docs/visual-references/prologue-iv-vi-narrative-v02/TF-V03-IV-playable-sequence-storyboard-v01.png`

V02 is the authoritative material and atmosphere target for Phase IV:
the accepted Phase I–III train shell, small protagonist scale, persistent brass
ticket punch, amber electrical route and cyan pneumatic route all remain visible.
V03 is the authoritative gameplay and spatial-flow target: left entry, visible
right exit, case fall, apparent middle balance, player-weight twist and final
counterbalance. Where V02 cannot explain an interaction state, V03 and the
playable sequence lock take precedence. V01 remains useful for narrative staging
only.

The three V01 generated frames remain useful for staging but require a continuity
pass before runtime production:

1. Replace their bespoke carriage shell with the actual Phase I–III shell,
   window spacing, character scale and floor height.
2. Put the existing Phase II amber cable trough and Phase III cyan branch in
   frame before adding any cradle mechanism.
3. Show the ticket punch and witness tags in IV and V.
4. Reduce ornamental mechanical density. One glance must isolate case, cradle,
   beam, amber lead and cyan cushion.
5. Keep TF-02's two matching identity tags and hidden cradle reveal; these are
   the strongest narrative ideas in V01.
6. Keep TF-03's opposite-side past/present blocking, but make the train's rescue
   come from the V winch rather than a new unexplained robot arm.

## 9. Implementation order

1. Lock this I–VI continuity and the Phase IV simplicity limit.
2. Make one V02 continuity target showing the actual I–III train plus the IV
   case/cradle. Do not generate all assets yet.
3. Greybox only IV: one case, one rail, settle, punch tag, vignette, exit.
4. First-time-player test. Pass condition: within 60 seconds the player says
   “the case is making the train lean” and understands that the punch preserves
   its record.
5. Build the second cradle with only grey shapes. Wire existing amber and cyan
   outputs into it and test V without final art.
6. Build VI from recorded IV movement and the same V hardware.
7. Produce the asset delta above, then make final art and audio passes.

## 10. Final acceptance

Without text instruction, a new player must identify:

1. the punch marks what the train remembers;
2. the amber wire carries a command;
3. the cyan pipe carries force;
4. a case's position changes how the carriage stands;
5. V is asking them to reuse the first three relationships to preserve two lives;
6. VI is the train replaying and completing the player's earlier behavior.

If IV–VI reads as a new cargo game unrelated to the relay and air rooms, or if
the player describes a control panel, the continuity pass has failed.
