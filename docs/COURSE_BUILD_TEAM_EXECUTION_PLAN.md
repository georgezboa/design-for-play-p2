# NIGHTFALL — Course Build Team Execution Plan

Status: `APPROVED FOR EXECUTION`

Deadline: August 14, 2026

Repository: `design-for-play-p2`

Detailed authority: this plan records the team and model division approved by George on August 4, 2026. It governs ownership and integration. The accepted six-chapter narrative and mechanic decisions govern product direction. Older eight/ten-car ordering and old uses of `Chapter One` are historical when they conflict with this plan.

## 1. Delivery target

Build the most complete six-chapter course version possible by the deadline. Do not pre-emptively remove chapters or mechanics. The current target is a dense 25–35 minute course build that tells the complete story and proves every chapter's core interaction. The 65–80 minute director's version remains the post-course expansion target.

The course build must retain:

1. all six chapter identities;
2. one readable core mechanic per chapter;
3. Butch as the only directly controlled protagonist;
4. Mara as an active partner, not a passive rescue object;
5. the unified `source → relationship → result` feedback language;
6. the Chapter 4 creation payoff;
7. seamless cross-world action in Chapter 6;
8. the final refusal of Archivist's six-way forced choice;
9. Butch and Mara's reunion as the direct goal;
10. English voice and English subtitles only.

The emergency reduction order exists only as a fallback. Nobody cuts scope independently. George makes every scope decision.

## 2. Shared product lock

### Premise

The train is the narrative spine, not the physical container for every level. Its stored worlds come from memories, collective records, predicted futures, unfinished stories, and contradictory archives. Archivist is a preservation system attempting to save capacity by deleting contradictions. Mara appears differently because the same consciousness is incompletely expressed by different world records.

### Core character relationship

- **Butch:** connects, preserves, and fulfils promises.
- **Mara:** creates, changes, and breaks false boundaries.
- Their relationship is emotionally complete but never assigned one mandatory category.
- Butch knows his name in Chapter 1. Mara first says `Butch` clearly at the end of Chapter 5.
- Archivist calls him `WITNESS` as a system classification, not as his name.

### Universal ability

`RESONANCE` lets Butch see and temporarily change a relationship between two things. Each world translates it into a local mechanic:

1. Chapter 1: repair physical mechanical relationships.
2. Chapter 2: connect energy, command, and motion systems.
3. Chapter 3: copy and transplant behavior cycles.
4. Chapter 4: preserve an object, property, rule, or creative action across a rewrite.
5. Chapter 5: make a recorded relationship temporarily real through framing.
6. Chapter 6: combine these world expressions without a six-item ability menu.

Every interaction must visibly communicate:

1. **Source:** what is producing the signal or behavior.
2. **Relationship:** what path or dependency is being changed.
3. **Result:** what physically responds, including on an incorrect attempt.

## 3. Team ownership

### George — Creative and Integration Lead

Responsibilities:

- final product, narrative, character, art-direction, and scope decisions;
- one consolidated human playtest verdict per day;
- Butch and Mara voice-reference approval;
- Seedance prompt and performance approval with Jason;
- accepting or rejecting chapter slices against player experience;
- deciding whether any emergency scope reduction is activated.

George should not become the primary programmer of a chapter. The lead must remain available to play the whole build and resolve cross-chapter decisions.

### Jason — Visual and Cinematic Lead

Primary deliverables:

- the shared visual-treatment reference: line, paper grain, paint edge, value hierarchy, and world-specific palette rules;
- AE templates for gameplay overlay tests, color finishing, and seamless cinematic handoffs;
- Seedance chapter films and fixed Butch/Mara voice continuity;
- optimized exports for the game, with exact dimensions, duration, alpha/audio requirements, and filenames;
- Chapter 4 visual support for Carl;
- final gameplay capture and trailer assembly if time permits.

Boundaries:

- Jason does not need to implement Phaser gameplay.
- Do not commit raw project caches or multi-gigabyte source renders.
- Runtime exports go into an assigned optimized asset folder only after Codex confirms format and size.
- Every downloaded asset must retain source URL, author, license, and download date. Prefer CC0.

### Jack — Chapter 2 Builder

Chapter: `CYBER CITY / THE BORROWED GRID`

Human role: chapter content owner working through a frozen brief, Vibe Coding, and Qwen support.

Owned implementation area:

- `src/cars/retroCyberpunk/**`
- `tests/car04/**`
- the standalone Chapter 2 entry and its dedicated build config, only when already isolated to this chapter
- new Chapter 2-only assets in a dedicated folder

Do not rename the existing Car 04 paths during initial production. Product naming and old technical labels remain separate until integration.

Required course-build sequence:

1. **Blackout block:** learn one Grid Link relationship.
2. **Auto-correction intersection:** reconnect while the city restores its preferred state.
3. **Folded tower:** Butch maintains two links and Mara maintains the third.

System categories:

- `ENERGY`
- `COMMAND`
- `MOTION`

Player outcome: the player feels that they are reprogramming city infrastructure, not merely moving through cyberpunk platforms.

Jack's acceptance route:

1. complete the slice using ordinary input from its normal standalone entrance;
2. demonstrate one valid and one invalid connection with readable physical feedback;
3. show the city auto-correcting one player change;
4. complete the Mara-supported third-link payoff;
5. reset and replay without stale connections or collision state;
6. provide screenshots plus `render_game_to_text()` states for entrance, first link, correction, and completion.

### Carl — Chapter 4 Owner

Chapter: `PAPER WORLD / THE UNFINISHED STORY`

Human role: product and code owner for the most complete new showcase chapter.

Owned implementation area:

- `src/chapters/paperWorld/**`
- `tests/chapter04/**`
- a standalone Chapter 4 entry and chapter-only asset folder

Required course-build sequence:

1. **Pencil draft:** preserve an object across a page rewrite.
2. **Painted story map:** preserve or transfer an attribute or rule.
3. **Dynamic comic page:** preserve Mara's act of continuing to create.

Puzzle rule:

- aim for two or three valid authored solutions where time permits;
- an incorrect choice must create a visible, understandable, and often funny result before reset;
- do not attempt an unrestricted sandbox;
- the final discovery must be that an action, not only an object, can be kept.

Carl's acceptance route:

1. complete the chapter from its normal standalone entrance;
2. show object, property/rule, and creative-action preservation;
3. demonstrate at least one alternative valid solution;
4. demonstrate one incorrect choice with complete feedback;
5. verify that a rewrite never leaves stale colliders or impossible state;
6. provide screenshots plus text state for each mode and the final page break.

## 4. Model ownership

### Kimi — Primary Engineering Partner

#### Wave A: Chapter 1 Phase V–VI bounded feedback pass

Kimi begins the Night Service audit at Phase V and continues through Phase VI. Phases I–IV remain frozen. Kimi may improve the two rooms' mechanical readability without changing their answers, pure state-machine rules, or frozen earlier-room behavior. The exact scope and acceptance route live in `docs/NIGHT_SERVICE_PHASE_V_VI_KIMI_AUDIT_WORK_PACKAGE.md`.

Required feedback:

- physical machine topology is readable from a distance;
- every control directly moves its affected part;
- signal travels along a visible cable, rod, pipe, or mechanical path;
- wrong input produces a local physical attempt and explains why it fails;
- success produces a complete chain reaction before the door opens.
- every player-facing prompt is English;
- Phase V and VI use a persistent undercarriage view: one `S`/Down press looks down, releasing the key does not return the camera, and a second press returns to the cab;
- Phase VI's automatic observation pass hands control back while the camera remains down.

Owned files for this wave must be explicitly listed in Kimi's work package. Existing unrelated Prologue changes remain protected.

#### Wave B: Chapter 5 owner

Chapter: `THE MUSEUM OF POSSIBLE HISTORIES`

Preferred new implementation area:

- `src/chapters/museum/**`
- `tests/chapter05/**`
- a standalone Chapter 5 entry

Required course-build sequence:

1. **Miniature gallery:** align space and scale.
2. **Film corridor:** align time and reflection.
3. **Multiple portrait hall:** hold contradictory Mara records, then break the frame.

The player controls Butch's physical position. There is no free-camera photography mode. The camera is directed; the player finds a viewpoint by walking and moving exhibits.

#### Wave C: engineering support

After Chapter 5 passes its isolated gate, Kimi may accept bounded tasks for:

- audio/voice/subtitle playback;
- checkpoints and fast local recovery;
- asset preprocessing and compression;
- optional interaction placement systems;
- performance profiling and regression tests;
- frozen, isolated Chapter 6 interaction modules assigned by Codex.

Kimi never self-accepts its work and never edits shared routing without explicit Codex ownership transfer.

### Qwen — Chapter 3 Owner and Chapter 2 Support

Chapter: `ECHO CITY`

Owned implementation area:

- `src/cars/presentCity/**`
- `tests/car03/**`
- existing isolated Chapter 3 entry

Required course-build sequence:

1. **Living market:** copy one behavior cycle.
2. **Transit square:** combine behavior cycles to reconfigure space.
3. **Silent central square:** record Butch's own movement/interaction cycle; Mara and the city copy him.

This is not a rhythm game. Prohibited mechanics:

- note lanes;
- beat-timing button tests;
- combo scoring;
- miss-on-wrong-beat failure;
- music controlling whether ordinary input is accepted.

Sound communicates object cycles and builds adaptive music, but the puzzle is observation and spatial reassignment.

Qwen may support Jack with bounded Chapter 2 defects after its Chapter 3 owned work reaches a playable gate. It may not edit Jack's branch and Chapter 3 shared files in one undifferentiated run.

### Codex — Shared Architecture, Chapter 6, Integration, and QA

Codex owns:

- the one-day Phaser 4.1 technical gate and Phaser 3.90 fallback decision evidence;
- shared `RESONANCE` input and focus contracts;
- chapter lifecycle, save/checkpoint, subtitle/audio bus, world preloading, and transition interfaces;
- shared entry files and final chapter ordering;
- Chapter 6 implementation;
- integration of accepted isolated slices;
- final automated and human-visible QA.

Chapter 6 course-build structure:

1. pairwise world combinations;
2. three-world overlap;
3. automatic and player-controlled switching in separate authored beats;
4. one continuous action carried across world changes;
5. a three-phase final boss against the Archivist's Compression Engine, using
   only previously taught verbs and relationship packets;
6. Archivist's forced six-choice structure after the engine is disabled;
7. refusal of the choice, reunion with Mara, and world preservation as a consequence.

The final boss is not conventional combat. It has no health bar or new attack
input. Its three readable phases are expose the witness anchors, keep two
contradictory world states active, and complete the shared circuit with Mara
and the recorded past self. Failure rewinds only the current compression sweep.

No six-item ability wheel. Spectacle transitions are automatic. Puzzle transitions expose at most two active world rules and use one switch input.

### Claude Code — Product Reviewer

Claude Code may:

- translate accepted product direction into one bounded player-facing task at a time;
- inspect a slice against the accepted product lock;
- write specific acceptance or revision notes.

Claude Code may not silently rewrite shared production code while acting as product lead, reopen accepted story choices, or change chapter ownership without George's decision.

## 5. Shared-file protection

Only Codex may change these areas unless it explicitly hands off a bounded edit:

- `package.json` and lockfiles;
- `src/main.js` and final shared entry wiring;
- `src/scenes/GameScene.js` shared routing;
- shared story order and chapter manifest;
- shared save/checkpoint state;
- shared `RESONANCE` and input contracts;
- world preload/release code;
- Chapter 6 integration files.

Rules for all contributors and models:

1. Never use `git add -A` in the shared dirty worktree.
2. Stage only owned files.
3. Do not delete or reset another owner's uncommitted work.
4. Every chapter remains playable through a standalone entry until accepted for integration.
5. Do not change another chapter merely to make your local build pass.
6. Send integration needs as a short contract: event name, payload, source state, expected receiver, and test route.
7. No credentials, API keys, generated service tokens, or private files enter the repository.

## 6. Art and downloaded-asset policy

Downloaded assets fill the world; custom assets define it.

- approximately 60–70% of ordinary background props may come from licensed packs;
- chapter landmarks, Butch, Mara, Archivist manifestations, and causal machinery are custom;
- prioritize Quaternius, Kenney, Poly Haven, and other clearly documented CC0 sources;
- every external asset records source URL, creator, license, download date, and modified/exported derivative;
- downloaded models pass through common camera, palette, light, material, line, and painterly treatment;
- do not merge incompatible pixel-art, photoreal, and low-poly assets without transformation;
- raw source packages stay out of runtime builds; only used optimized derivatives enter game asset folders.

Global visual production remains:

`downloaded/custom source → Blender staging → layered render → hand-drawn treatment → AE look development/finishing → optimized Phaser runtime asset`

Seedance supplies English chapter-film dialogue and synchronized audiovisual generation. Butch and Mara each use one fixed reference voice. World processing may change reverb, radio distortion, paper texture, or archive resonance, but not the voice identity.

## 7. Daily execution rhythm

### August 4 — Lock and isolate

- publish this ownership plan;
- every owner confirms their folder, standalone entry, and first playable outcome;
- Codex starts the Phaser 4 gate without blocking chapter work on Phaser 3.90 APIs.

### August 5 — Technical gate

- Phaser 4.1 must preserve the current game, prove a painterly filter, and prove a two-world preloaded action transition;
- if it fails the one-day gate, Codex declares Phaser 3.90 final for the course build;
- each chapter owner has a booting isolated shell and text diagnostics.

### August 6–8 — Core loops

- Chapter 1 feedback chain playable;
- Chapter 2 first link and correction playable;
- Chapter 3 copy/transfer cycle playable;
- Chapter 4 object and property preservation playable;
- Chapter 5 spatial frame playable;
- Chapter 6 pairwise transition shell playable;
- Jason delivers the first shared visual-treatment test and one Seedance/AE transition proof.

### August 9 — Integration checkpoint

- each owner demonstrates a cause-to-outcome playable route;
- George issues one verdict per slice: `PASS`, `REVISE`, or `BLOCKED`;
- Codex integrates only `PASS` slices;
- no slice is accepted from tests or model self-report alone.

### August 10–12 — Escalation and finish

- complete each chapter's twist and payoff;
- integrate English voice/subtitles, checkpoint recovery, and high-value optional interactions;
- replace the weakest placeholder art first;
- begin full six-chapter run as soon as the route exists.

### August 13 — Content freeze

- no new mechanics;
- only critical bug fixes, visual readability, audio balance, loading, performance, and transition continuity;
- complete at least two full ordinary-input runs from Chapter 1 to ending.

### August 14 — Final delivery

- final build and class demonstration;
- record a clean backup playthrough video;
- preserve the working build before any post-course director's-cut work begins.

## 8. Definition of playable handoff

Every owner returns all of the following:

1. a standalone normal entrance with no QA-only setup;
2. concise controls shown before or at first use;
3. one complete cause → intermediate feedback → result route;
4. one incorrect or failure route with local recovery;
5. deterministic reset with no stale collision or state;
6. `window.render_game_to_text()` matching the visible chapter state;
7. focused automated tests for the owned mechanic;
8. build and asset checks appropriate to the slice;
9. screenshots at entrance, developed mechanic, twist, and completion;
10. a handoff note listing changed files, test command, known limitations, and requested integration events.

Unit tests and screenshots do not replace ordinary-input human play. George's playtest is the acceptance authority.

## 9. Integration protocol

1. Owner works only in the assigned chapter folder or isolated branch.
2. Owner proves the standalone route.
3. Owner records the exact commit or patch and handoff note.
4. Codex reviews scope before integration.
5. Codex runs the changed chapter route and shared regression checks.
6. George plays the integrated result.
7. `PASS` becomes frozen unless a real integration regression appears.

Do not integrate multiple unaccepted versions of the same chapter. Do not ask two models to independently rewrite the same files. Parallelism comes from isolated ownership, not duplicate edits.

## 10. Emergency fallback order

This section is insurance only. It is not active at project start.

If George activates scope reduction, remove content in this order:

1. reduce optional interaction count while keeping each interaction type;
2. remove a third alternate solution while keeping two valid solutions and wrong-answer feedback;
3. shorten secondary chapter films while retaining the key Chapter 1, Chapter 5, and ending films;
4. compress middle variations in Chapters 3 and 5 while retaining teach, twist, and payoff;
5. never remove Chapter 4's creation climax, Chapter 6's continuous cross-world action, the forced six-choice refusal, or Butch and Mara's reunion.

No contributor activates this list independently.

## 11. Immediate start checklist

- [ ] George confirms this file is the current team execution plan.
- [ ] Jason confirms export formats and delivers the first visual-treatment board.
- [ ] Jack boots the existing `retroCyberpunk` standalone slice and records the first blocking issue.
- [ ] Carl creates the isolated Paper World entry and proves one page rewrite.
- [ ] Kimi receives the bounded Chapter 1 feedback package.
- [ ] Qwen receives the Chapter 3 Echo City package.
- [ ] Codex runs the one-day Phaser gate and defines the shared integration event contract.
- [ ] Every person/model reports owned files before editing.
