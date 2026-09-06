# CAR 03 V2 — QWEN READABLE REBUILD WORK PACKAGE

Status: `READY FOR QWEN`

## Mission

Rebuild the isolated Car 03 slice so a first-time human can understand and complete it from the game itself. The previous implementation passed model and scripted-input tests but failed the user's actual comprehension test. Programmatic solvability is not acceptance.

The authoritative gameplay specification is:

`docs/CAR_03_DESIGN_LOCK_V2_READABLE_PLAY.md`

It supersedes V1 gameplay rules wherever they conflict.

## Read completely before editing

1. Repository `AGENTS.md` and all applicable nested governance files.
2. `docs/CAR_03_DESIGN_LOCK_V2_READABLE_PLAY.md`.
3. `docs/CAR_03_DESIGN_LOCK.md` as historical context only.
4. Current Car 03 model, scene, art, HTML entry, Vite config, and tests.
5. `outputs/car03-a2-production-assets/ASSET_MANIFEST.json`.
6. `outputs/car03-a2-production-assets/PRODUCTION_NOTES.md`.
7. `outputs/car03-gemini-visual-directions/CODEX_REVIEW_A2.md`.

## Authority and protected scope

You may redesign and replace Car 03-specific production code and tests required by V2. You may add Car 03-specific helpers and documentation.

Do not modify:

- Car 01 or Car 02;
- shared prologue logic;
- `src/tutorial/TimetablePuzzle.js`;
- unrelated dirty files;
- shared palette values;
- Git history, commits, branches, remotes, or pushes.

Do not delete V1 documentation. Mark superseded Car 03 tests clearly when replacing them. Preserve useful low-level regressions such as reset determinism, scan-coordinate consistency, and browser diagnostic access where they still apply.

## Required build strategy

### Phase 1 — honest playable blockout

Implement all five beats, controls, scanner gates, checkpoint behavior, objective/prompt UI, three-step duo test, and completion flow before polishing art.

Use high-contrast temporary shapes only where an A2 asset slot is unavailable. The blockout must already be understandable without decorative art. Do not hide unclear mechanics under more labels.

### Phase 2 — A2 structural integration

Integrate the separated A2 carriage, character, and scanner assets where they improve readability. Treat them as replaceable assets, not immutable geometry. The current proof composites are not final-art acceptance and must not be used as flattened backgrounds.

Use sprite sheets according to the manifest. Maintain actual far/near depth, origins, scale, and foreground occlusion. Scanner cones, prompts, outlines, ribbons, footprints, and result words remain dynamic Phaser graphics/text.

### Phase 3 — feedback and accessibility

Add the locked visual, audio, timing, checkpoint, safe-area, reduce-flash, and resolution behavior. Objective changes should be event-driven.

### Phase 4 — evidence and handoff

Run automated gates and a natural-input browser playthrough. Stop for Codex and human review. Do not call the work accepted.

## Architecture requirements

- Prefer a clean V2 state model over accumulating conditionals onto the V1 priority chain.
- Keep deterministic `update(dtMs, input)` behavior and serializable snapshots.
- Keep `window.render_game_to_text()` read-only and sufficient for acceptance automation.
- Use explicit beat transitions and scanner states.
- Use a single coherent coordinate space for each world-space visual.
- Keep camera transitions and UI state outside pure model calculations where appropriate.
- No model mutation from QA/browser scripts used as natural-play evidence.

## Required behavioral tests

Add non-tautological tests proving at minimum:

1. E without an eligible highlighted target does nothing.
2. E on the highlighted group starts one match; E again releases it.
3. E never triggers a separate rescue/transfer/duo priority action.
4. Lane change is diagonal over time and breaks an incompatible match.
5. Scanner 1 cannot punish before teaching completes.
6. Matched movement makes a scanner safe.
7. Unmatched exposure warns and flags at the locked thresholds.
8. Flagging returns only to the active bay checkpoint.
9. Beat 2 cannot be solved without changing to the viable lane/group.
10. Companion uses the same match contract as groups.
11. Three consecutive synchronized steps fill 0 to 3 visibly.
12. Stop pauses the step sequence; reversing or separating resets it.
13. Final completion is impossible without companion match, three steps, scanner crossing, and final-door crossing.
14. R returns model, camera-facing state, UI state, scanners, alert, door, and completion to the baseline.
15. Ten resets are deterministic.
16. Snapshot fields match every scene consumer.

Replace V1 tests that demand superseded hidden anchoring and priority-chain behavior. Do not weaken unrelated assertions to get green output.

## Required browser acceptance

Use the plain `car03.html` URL with no QA parameters and only trusted keyboard input. Do not call game/model methods from page JavaScript. State may be read through `render_game_to_text()`.

Record one complete run showing:

1. environmental alone/group demonstration;
2. intentional E match with first highlighted group;
3. safe passage through Scanner 1;
4. release, diagonal lane change, and match with the viable Beat 2 group;
5. actual warning/checkpoint recovery when entering a scanner alone;
6. matching the teal-scarf companion;
7. three synchronized steps;
8. alert dispersal and reacquisition of the companion;
9. final scanner and door completion;
10. R reset.

Also record a no-match control that walks toward the final route but cannot complete.

Capture 960×600 screenshots for every numbered stage and at least one 1280×720 layout screenshot. Save trace, report, and screenshots under a new Car 03 V2 evidence directory in `outputs/`.

## Visual evidence requirements

Screenshots must make these facts visible without reading JSON:

- destination and current objective;
- which target E will affect;
- difference between ALONE, WARNING, MATCHED, and PATTERN OK;
- two distinct lanes and a diagonal lane change;
- teal-scarf companion identity;
- all three duo footprints;
- final door opening.

If the screenshot requires an explanation to identify these, the visual gate fails even if the model state is correct.

## Verification gates

Run and report exact results:

```text
node --test tests/car03/*.test.mjs
node --test tests/tutorial/*.test.mjs
npm run assets:check
npm run build
npx vite build --config vite.car03.config.js --outDir /tmp/infinity-train-car03-v2-qwen-build
git diff --check
```

Do not claim the entire worktree is clean if unrelated pre-existing changes exist. Report scoped Car 03 modifications separately.

## Stop conditions

Stop and report `BLOCKED` if:

- safe implementation requires modifying protected shared/prologue files;
- the current dirty worktree overlaps the same Car 03 files in an unsafe way;
- an A2 asset is malformed or unusable and no clear blockout substitute exists;
- browser tooling cannot produce honest evidence.

Otherwise finish with `READY_FOR_CODEX_AND_HUMAN_PLAYTEST`.

## Final handoff format

Return:

- status;
- concise explanation of the player-visible loop;
- files changed;
- tests/build results;
- natural-play input sequence;
- evidence paths;
- known visual placeholders or risks;
- confirmation that no commit/push occurred.

Never claim `ACCEPTED`, `FINAL`, or human comprehension success. The user and Codex perform that gate.

