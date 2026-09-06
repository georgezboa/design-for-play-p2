# NIGHTFALL PROLOGUE IV–VI — COMPLETE ASSET PACKAGE

**Status:** V02 CONTINUITY TARGET GENERATED / ASSET BREAKDOWN READY  
**Date:** 2026-08-05  
**Design source:** `docs/PROLOGUE_IV_VI_NARRATIVE_EVENT_PROPOSAL.md`  
**Generation authorization:** George explicitly reversed the earlier no-generation
restriction on 2026-08-06 and asked Codex to generate the package. Codex may
generate target references and production candidates for environment, props and
mechanisms. The approved Butch/Mara contributor remains authoritative for final
character identity, model, rig and animation; figures inside concept frames are
composition stand-ins, not final character designs.

**Continuity authority:** `docs/PROLOGUE_I_VI_CONTINUITY_AND_ASSET_DELTA.md`.
The three V01 frames are not approved as a separate train interior. All final
assets must extend the existing Phase I punch, Phase II amber relay path and
Phase III cyan air path.

## 1. Visual identity

### One-line direction

**A hand-painted 1960s night-train service theatre in which worn railway
hardware physically carries fragile human memories.**

### Style

- Fixed theatrical cutaway with large negative space and selective pools of
  light. It should feel staged and composed, not like a side-scrolling platform
  level or a dashboard.
- Original storybook treatment: graphite/ink contour, restrained gouache or
  watercolor fills, visible paper grain, slightly imperfect hand-painted edges
  and subtle line boil where animation permits.
- Railway hardware must have credible mount points, pivots, brackets, cable
  routes and weight transfer. Simplify detail, but never draw a floating lever,
  unconnected pipe or decorative gauge.
- Every interactive object has a unique silhouette and one obvious moving part.
  No row of identical rectangular buttons.
- Memory cases look handled, repaired and personal. They are not sci-fi loot
  crates or generic military boxes.

### Palette and material hierarchy

| Role | Material / color | Rule |
|---|---|---|
| Train body | charcoal blue-black painted steel | Largest dark mass; matte, worn, never pure black |
| Structural edges | desaturated blue-grey steel | Defines geometry without bright outlines everywhere |
| Human-made mechanism | aged brass, dark iron, oiled leather | Brass only on pivots, brackets, handles and witness points |
| Paper/archive | warm aged cream, graphite, faded ink | Human memory reads warmer and softer than the machine |
| Active relationship | amber | Travels from action through a physical path to result |
| Held relationship | cyan | Real thread/material, never a generic glow aura |
| Archivist intervention | cold off-white crop lines and slate masks | Sterile and geometric; no giant red warning banner |
| Failure | physical tilt, slack cable, folded support, fading echo | Do not solve failure readability with red UI |

### Lighting

- Base ambience: deep night blue, soft reflected window light.
- IV: one warm pool follows the first falling case; the rest of the carriage
  remains uncertain.
- V: cold Archivist white cuts across two memory cases while the train reveals a
  warmer hidden support below.
- VI: moving exterior light sweeps across the carriage; amber past and present
  actions alternate, then combine with cyan at the payoff.
- Interactive readability comes from local light and motion, not bloom.

## 2. Existing sources that may be reused

| Existing ID / file | Allowed use | Not allowed |
|---|---|---|
| G01 `Paper001` CC0 | Common paper grain, archive labels, subtle scene overlay | Do not paste as a full-screen dirty filter |
| G02 `PaintedMetal006` CC0 | Repainted train enamel and worn steel masks | Do not use the raw texture without color/scale correction |
| G04 `Kloppenheim 07 Pure Sky` CC0 | Blender/AE night lighting reference | Do not ship the HDR directly in Phaser |
| G05 Kenney UI Audio CC0 | Temporary interaction placeholders only | Not final narrative/mechanical sound identity |
| G06 Kenney Impact Sounds CC0 | Source layers for impacts and latches after editing | Do not import the whole pack or use byte-identical repeats |
| G07 Atkinson Hyperlegible OFL | Subtitles and accessibility text | Not painted labels on physical machinery |
| Shared paper / feedback atlases | Prototype texture and amber/cyan motion studies | Do not assume they meet final art quality |
| Hunyuan bogie GLB / baked WebP | Scale, structure and material reference only | Never restore as a pasted runtime image or final hero machine |
| Current mechanical-table / pipe / trap assets | Salvage measurements or tiny generic hardware only | Do not preserve the rejected panel, bearing launcher or receiver |

Raw source packs remain outside Git. Every selected derivative needs source URL,
license, creator, modification record and runtime destination in the manifest.

## 3. Target-frame package — V01 generated

### Approved continuity target — V02

- `docs/visual-references/prologue-iv-vi-narrative-v02/TF-V02-I-IV-continuity-target-v01.png`
- `docs/visual-references/prologue-iv-vi-narrative-v02/TF-V03-IV-playable-sequence-storyboard-v01.png`

V02 is the material and atmosphere reference for Phase IV. It restores
the accepted Phase I–III carriage scale and palette, keeps the ticket punch as
the persistent memory tool, and carries the Phase II amber electrical route and
Phase III cyan pneumatic route into the same physical room. It locks the Phase
IV addition to one archive case and one readable weight-transfer mechanism.
Character rendering remains a placeholder.

V03 is the gameplay construction reference. It locks a visible left start and
right exit, three physical rail detents, a first apparent balance, the reveal
that Butch's own position changes the load, and a final counterbalance at the
exit. Its sequence is specified in
`docs/PROLOGUE_PHASE_IV_PLAYABLE_SEQUENCE_LOCK.md`.

The V01 frames below remain composition and narrative references only. Where a
V01 visual decision conflicts with V02 continuity, V02 is authoritative.

Generated V01 references:

- `docs/visual-references/prologue-iv-vi-narrative-v01/TF-01-IV-first-fall-v01.png`
- `docs/visual-references/prologue-iv-vi-narrative-v01/TF-02-V-forced-choice-v01.png`
- `docs/visual-references/prologue-iv-vi-narrative-v01/TF-03-VI-duet-v01.png`

These three images lock the proposed composition and causal storytelling for
review. Their characters are placeholders. Their mechanical forms may be used
as design references but must be broken into editable gameplay parts before
runtime integration.

If the direction is approved, derive layered production assets and editable
mechanical parts from the selected frames. Final environment polish may still be
painted over by the assigned environment/concept artist.

| ID | Frame | Required visible information | Delivery |
|---|---|---|---|
| TF-01 | IV — First Fall | Full carriage cutaway; one case impacting the suspended cradle; lamps/tableware/Butch reacting to the same tilt; undercarriage compression visible; one human echo in a window | `3840×2400` layered master + `1920×1200` PNG |
| TF-02 | V — Forced Choice | Two contradictory cases share the same archive identity; cold Archivist frames; physical jettison hatch open; train's hidden second cradle unfolding in warmer light | Same |
| TF-03 | VI — Duet | Moving night exterior; amber past Butch and present Butch on opposite supports; one continuous beam and suspension system linking their weight; falling case and cyan thread visible | Same |

Layer groups in every target:

```text
BG_SKY
BG_MOVING_LANDSCAPE
WINDOW_GLASS
TRAIN_REAR_WALL
ARCHIVE_RACK
MEMORY_CASES
HERO_MECHANISM_REAR
CHARACTERS
HERO_MECHANISM_FRONT
FOREGROUND_OCCLUDERS
AMBER_FX
CYAN_THREAD
ARCHIVIST_MASKS
LIGHTING
COLOR_GRADE
```

The selected frames lock composition and scale. They are references, not baked
backgrounds to paste behind gameplay.

## 4. Environment and set assets

| ID | Asset | Quantity / states | Style and construction | Priority |
|---|---|---|---|---|
| ENV-01 | Passenger/service carriage shell | 1 layered master | Curved roof, believable floor depth, two large windows, wall ribs, door partitions; worn steel and dark wood; no generic sci-fi panels | P0 |
| ENV-02 | Ceiling archive rack | 1 modular set, closed/open/damaged | Heavy brass/steel rail with numbered paper sleeves; visible release pawls; sized to physically hold the cases | P0 |
| ENV-03 | Overhead baggage rail | 1 continuous rail | Credible trolley wheels, stops and mounting bolts; cases visibly slide along it | P0 |
| ENV-04 | Witness brackets | 4 large brackets | Brass-lined physical saddles that catch case feet; empty/occupied/strained states | P0 |
| ENV-05 | Jettison hatch | closed/cracked/open/rejected | Floor-level mechanical door with hinge, counterweight and cold Archivist crop frame; never a UI trash icon | P0 |
| ENV-06 | Passenger dressing set | 8–12 props | Hanging lamp, small table, cup, ticket book, strap, coat hook, luggage net; every loose prop has a tilt reaction | P1 |
| ENV-07 | Structural foreground | 3–5 occluders | Door frame, vertical rib, chain or seat edge used for theatrical reveals and transitions | P1 |
| ENV-08 | Exterior night panorama | 3 parallax layers | Distant hills/city lights, midground poles/trees, near trackside streaks; seamless horizontal loops | P0 |
| ENV-09 | Window reflection layer | 1 reusable + 3 local masks | Must support Butch, Mara, memory echoes and moving outside light independently | P0 |
| ENV-10 | Underfloor stage cavity | 1 layered set | Dark but readable service void with believable mounts for cradle, beam, air cushions, winch and suspension | P0 |
| ENV-11 | Lighting masks | IV/V/VI + transition | Selective pools, cold crop light, moving exterior sweep, final combined amber/cyan state | P1 |

Runtime recommendation: environment masters at `2×` the `960×600` viewport.
Moving exterior strips may be `4096×1024 WebP` per layer after approval and
compression. Keep foreground and interactive layers separate.

## 5. Hero mechanical system

This system must be an original, editable model or layered illustration. If made
in 3D, deliver a Blender source and a GLB whose moving components are separate
named nodes with correct pivots. Do not deliver one fused mesh.

| ID | Component | Required parts / states | Readability requirement | Priority |
|---|---|---|---|---|
| MEC-01 | Primary suspended cradle | bed, four rollers, two case saddles, cable eyelets | Immediately reads as a load-carrying platform | P0 |
| MEC-02 | Equalizing beam | beam, central pivot, left/right links | 5–8° tilt must be readable at gameplay scale | P0 |
| MEC-03 | Train suspension pair | two air cushions, springs, axle boxes, wheel contact | Load causes one side to compress and opposite side to unload | P0 |
| MEC-04 | Hidden second cradle | folded/deploying/deployed/failed | Must visibly emerge from train structure, not pop in | P0 |
| MEC-05 | Air-support branch | pipe, shutoff, flexible hose, cushion | Air path ends at the second cradle; inflation lifts it visibly | P0 |
| MEC-06 | Winch assembly | motor, drum, cable, guide pulleys, ratchet | Power winds the cable; no separate abstract power meter | P0 |
| MEC-07 | Electrical lead | fixed supply, movable plug, winch terminal | Brass/amber path is visually distinct from cyan air line | P0 |
| MEC-08 | Jettison mechanism | latch, linkage, counterweight, hatch | Archivist can open it, train can physically resist it | P1 |
| MEC-09 | Train's autonomous counter-movement | one concealed motor/linkage state | In VI the mechanism performs the learned corrective move without a UI explanation | P1 |

Suggested real-world scale:

- main cradle: about `3.0–3.4 m` wide;
- second cradle: about `2.0–2.4 m` wide;
- memory cases: `0.65–0.95 m` wide;
- wheel diameter: about `0.9 m`;
- beam pivot, cables and brackets must remain readable when the character is
  approximately `80–110 px` tall on a `960×600` viewport.

## 6. Narrative memory cases

Exactly three hero cases are required. They must read as personal archives with
different mass and history, not differently colored game blocks.

### CASE-01 — THE WORK CASE

- Heavy dark leather/painted metal case, repaired corners, brass handle.
- Interior glimpse: folded evacuation map, small electrical coil/battery clamp,
  punched transit ticket.
- Purpose: first readable weight and subtle Chapter 2 foreshadow.
- States: closed, impact-compressed, bracketed, sliding, open-glimpse.

### CASE-02A — RECORD R-17 / CITY

- Worn commuter case with a single cyan repair stitch.
- Interior glimpse: paired shoes, transit token, small timing/metronome object.
- Same brass identity tag and handle silhouette as CASE-02B.
- Purpose: one version of a life; subtle Chapter 3 foreshadow.

### CASE-02B — RECORD R-17 / COUNTRY

- Paper-wrapped field case with the same cyan repair stitch and the same `R-17`
  brass identity tag as CASE-02A.
- Interior glimpse: painted stone, brush, folded paper landscape.
- Purpose: contradictory version of the same life; Chapter 4 foreshadow.

For each case deliver:

- front / back / side / top views;
- separate lid, handle, tag, straps, contents and shadow;
- impact, strain and sliding poses;
- clean silhouette at `96 px` high;
- layered PSD/PSB and, if modeled, separate-node GLB;
- runtime WebP/PNG states only after the target frame passes.

Do not write explanatory paragraphs on the cases. Their shared `R-17` tag,
matching repair stitch and different contents must communicate contradiction.

## 7. Character and performance assets

### Ownership

Butch and Mara remain under the assigned character contributor. This package is
an animation request against the approved character model, not a request for a
new design. Codex and gameplay programmers may only import approved deliveries.

### Butch additions

| ID | Action | Minimum delivery | Use |
|---|---|---|---|
| CH-B01 | Look up / react to first impact | 8–12 frames | IV entry |
| CH-B02 | Two-hand push/drag at chest height | 10–14-frame loop | Move cases along rail |
| CH-B03 | Brace against left tilt | 6–8 frames + hold | Physical failure feedback |
| CH-B04 | Brace against right tilt | Mirrored or authored counterpart | Physical failure feedback |
| CH-B05 | Stumble/slide one step | 8–12 frames | Strong imbalance |
| CH-B06 | Reach and catch falling case | 14–20 frames | VI narrative twist |
| CH-B07 | Hanging recovery / train catches Butch | 10–16 frames | VI payoff |
| CH-B08 | Quiet recognition/relief | 8–12 frames | Departure reflection |

Also provide approved idle/walk/turn/short interact from the main character
package. All animations share one pivot and body scale.

### Mara additions

| ID | Action | Minimum delivery | Use |
|---|---|---|---|
| CH-M01 | Reflection silhouette ties cyan thread to a bracket | 12–16 frames | VI final window beat |
| CH-M02 | Pulls the thread once and releases tension | 8–12 frames | Confirms active assistance |

Mara is a reflection/partial silhouette here; do not create a new costume or
full-face close-up for this sequence.

### Past Butch

No separate character art. Use the approved Butch animations with an amber
material treatment, reduced opacity, delayed line boil and a short trailing
witness pulse. The echo must retain the exact body performance recorded in IV.

## 8. Memory vignette assets

Three brief window/tableau animations, each `1.5–2.5 s`, limited animation at
`8–12 fps`. They are human evidence, not tutorial icons.

| ID | Tableau | Required action | Treatment |
|---|---|---|---|
| MEM-01 | Worker passing a battery/coil to another person | Two hands share the load | Warm silhouette, no faces required |
| MEM-02 | Commuter tying or matching a repeated step | One person adjusts another's rhythm | Cool city-window silhouette |
| MEM-03 | Hand painting a stone while another hand keeps the paper still | Shared creation | Paper/gouache edge inside the window |

Deliver layered action, background wash and mask separately so the projection can
fade, crop or fragment under Archivist intervention.

## 9. FX and motion assets

| ID | FX | Delivery | Notes |
|---|---|---|---|
| FX-01 | Amber witness pulse | 12–16-frame atlas or vector/path spec | Travels along real brackets, beam, cable and player-recorded path |
| FX-02 | Cyan physical thread | Segmented line/rope textures + knots + tension states | Separate from Mara and environment; slack/taut/wind states |
| FX-03 | Archivist crop frame | Corners, scanning line, slate mask, redaction strip | Cold white/slate only; no generic glitch |
| FX-04 | Case impact | Dust, paper fibers, tiny brass vibration, floor shadow squash | Layered, restrained, no explosion |
| FX-05 | Sliding friction | Small dust trail and leather/metal contact marks | Tied to actual speed |
| FX-06 | Suspension compression | Dust fall, joint movement, contact patch glow | Mechanical movement first, FX second |
| FX-07 | Air cushion inflation | Fabric/rubber deformation and short condensation puff | No floating pressure bar |
| FX-08 | Winch activation | Cable tension, drum rotation, amber motor pulse | Source→relationship→result visible |
| FX-09 | Echo degradation | Missing line segments and cropped action trail | Archivist removes part of recorded action |
| FX-10 | Train departure | Window parallax acceleration, dust backward drift, lamp swing, wheel/rod rhythm | Gameplay-to-cinematic transition |
| FX-11 | Mara reflection | Glass-local cyan highlight and slight double reflection | One beat only, not a HUD portrait |

## 10. Audio, music and voice assets

Final audio must be human-edited or human-recorded. Kenney sources may be used as
layers, not unchanged final cues.

### Ambience and mechanics

| ID | Asset | Length / variants |
|---|---|---|
| AUD-01 | Stalled night-train room tone | 60–90 s seamless stereo loop |
| AUD-02 | Distant rail/weather exterior | 60–90 s loop, separate bus |
| AUD-03 | Train metal breathing / settling | 4–6 randomized one-shots |
| AUD-04 | Archive rack release | 3 variants |
| AUD-05 | Case fall and impact by mass | light/medium/heavy, 3 variants each |
| AUD-06 | Case leather/metal slide | loop with start/stop tails |
| AUD-07 | Beam and suspension creak | left/right strain, 4–6 variants |
| AUD-08 | Witness bracket catch | 3 tight brass/iron variants |
| AUD-09 | Jettison hatch opening/resisting | open, stall, train-resist close |
| AUD-10 | Air cushion inflate/vent | start, loop, stop |
| AUD-11 | Winch motor/cable | start, load loop, strain, stop |
| AUD-12 | Train's two knocks | one authored two-hit phrase; emotionally recognizable |
| AUD-13 | Amber pulse | source, travel and arrival layers |
| AUD-14 | Archivist crop/redaction | dry paper/optical/mechanical treatment, not a digital glitch |
| AUD-15 | Moving train acceleration | 3 intensity layers with wheel rhythm |
| AUD-16 | Departure completion stinger | 5–8 s, resolves into Chapter 2 ambience |

Deliver final audio as `48 kHz / 24-bit WAV`; runtime derivatives may later be
compressed to OGG/MP3 as appropriate. Keep stems separate.

### Voice

| Speaker | Line | Performance |
|---|---|---|
| Archivist | `ONE RECORD MUST BE REMOVED.` | Calm, procedural, certain; not villain shouting |
| Caretaker/train radio, optional | No new explanatory line required | Prefer silence and two physical knocks |
| Mara | Reuse the approved `I'm still here.` only if the opening voice identity is locked | Very near, restrained; do not record a new lore speech |

All spoken lines require independent WAV and English SRT. Subtitle font may use
Atkinson Hyperlegible; physical labels use hand-painted/engraved lettering.

### Music

One adaptive cue, not three unrelated tracks:

- `STEM_A_MACHINE`: low rail pulse and metallic breath;
- `STEM_B_MEMORY`: fragile harmonics/strings entering with human echoes;
- `STEM_C_TRUST`: warmer sustained layer entering when the second cradle opens;
- `STEM_D_DEPARTURE`: rhythmic motion that can transition into Chapter 2.

Final composition begins only after the scene timing is stable. Temporary music
may be used during greybox playtests.

## 11. Animation and cinematic deliverables

| ID | Sequence | Length | Must remain interactive? |
|---|---|---:|---|
| CIN-01 | Failed departure / first archive release | 3–5 s | Camera-directed transition into IV; skip after first view |
| CIN-02 | Archivist forced-choice reveal / second cradle knock | 4–6 s | Returns control on the unfolding cradle, not after it finishes |
| CIN-03 | VI train learns and catches Butch | 6–9 s | Begins from gameplay positions; no teleport |
| CIN-04 | Departure and Mara reflection | 8–12 s | Seamless handoff from final held state to Chapter 2 door |

Create these only after the actual gameplay entry and exit frames are locked.
Deliver first/last-frame boards, animatic and final rendered layers separately;
do not make one long prerendered film that replaces play.

## 12. Runtime delivery standards

### 2D / paint

- Source: layered PSD/PSB or Krita file, sRGB.
- Master: generally `2×` runtime size; retain uncropped safe margins.
- Runtime stills: lossless WebP or PNG where alpha is required.
- Atlases: maximum `2048×2048` per sheet when practical; include frame JSON.
- Do not bake characters, cyan thread, amber pulse, Archivist masks or moving
  mechanism pieces into the background.

### 3D

- Source: `.blend` with clean collection names and metric scale.
- Delivery: GLB 2.0, separate named moving nodes, transforms applied, pivots at
  actual hinges/axles/drums.
- Textures: PBR at 1K/2K only for hero pieces; no embedded 4K maps.
- Provide one neutral-light turntable and one gameplay-camera render.
- Final Phaser use may be a fixed-camera 2D derivative, but the source remains
  editable for angle, shadow and state changes.

### Naming

```text
NS_P4_ENV_archiveRack_v01
NS_P4_PROP_caseWork_v01
NS_P5_PROP_caseR17_city_v01
NS_P5_PROP_caseR17_country_v01
NS_P5_MEC_secondCradle_v01
NS_P6_FX_pastButchTrail_v01
NS_P6_CIN_departureReflection_v01
```

## 13. Complete production order

### P0 — Needed to prove the design

1. TF-01, TF-02, TF-03 target frames.
2. ENV-01/02/03/04/05/08/09/10.
3. MEC-01 through MEC-07 as blockout-ready separated pieces.
4. CASE-01, CASE-02A, CASE-02B silhouettes and states.
5. Butch CH-B01 through CH-B06 using the approved character model.
6. FX-01/02/03/04/06/07/08/10.
7. Temporary AUD-01, 04–13 and 15.

### P1 — Needed for first public-quality playtest

1. Final painted environment layers and dressing props.
2. All case interiors and memory tableaux.
3. Hidden cradle failure states and autonomous counter-movement.
4. Butch CH-B07/08 and Mara CH-M01/02.
5. Final FX pass, voice line, adaptive music stems and completion stinger.
6. CIN-01 through CIN-04 animatics and final layers.

### P2 — Polish only

- extra prop reactions, alternative impact variants, additional reflection
  fragments, secondary exterior landmarks and credits art.

## 14. What George needs to hand to each contributor

### Environment/concept artist

- This document, the narrative proposal and current `960×600` screenshots.
- First assignment: only TF-01–03, no runtime asset production until one visual
  direction is approved.

### Mechanical modeler/artist

- Selected target frames plus MEC-01–09 specifications.
- Explicit instruction that all moving parts need separate pivots/nodes.
- Existing Hunyuan bogie only as proportion/reference, never as final design.

### Character contributor

- Approved Butch/Mara master package plus §7 animation additions.
- No new costumes or identities; only Night Service performance.

### FX/motion artist

- Selected target frames, exact physical paths and FX-01–11.
- Amber and cyan rules; Archivist may crop/flatten but not generic-glitch.

### Sound/voice/music contributor

- AUD-01–16, one Archivist line and the four-stem music brief.
- Request dry sources and stems; final mix happens in engine.

## 15. Acceptance rule

The asset package passes only if a silent five-second view communicates:

1. these cases are making the train lean;
2. two cases are being treated as contradictory records;
3. the train is revealing another way to carry both;
4. past and present Butch share the same physical load.

If the viewer instead sees a control panel, abstract meter, random cargo or a
generic industrial set, the assets are not ready for implementation.
