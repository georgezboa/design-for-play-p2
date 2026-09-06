# Car 03 — MiniMax Acceptance Repair Brief

## Role and finish line

You are the isolated implementation owner for Car 03. Repair the current slice until it can be accepted through real browser input and visually trustworthy evidence. Passing model-level tests alone is not completion.

Codex is the final integrator and design authority. Gemini supplies a visual/art audit; it does not override the locked mechanic. Do not declare completion until every mandatory gate and evidence item below is satisfied.

## Start-up sequence

Before editing, read completely:

1. `AGENTS.md`
2. `docs/CAR_03_DESIGN_LOCK.md`
3. `docs/CAR_03_GEMINI_VISUAL_ART_REVIEW.md`
4. `docs/PRODUCT_STATE.md`
5. `docs/NEXT_TASK.md`
6. `progress.md`
7. Current Car 03 implementation, tests, HTML entry, and all images in `outputs/car03-acceptance/`

If `docs/CAR_03_GEMINI_VISUAL_ART_REVIEW.md` does not exist or is empty, stop before editing and report: `WAITING_FOR_GEMINI_VISUAL_REVIEW`.

Inspect the current dirty worktree before making changes. Preserve all unrelated user/team work. Do not discard, rewrite, stage, commit, push, or clean existing changes.

## Codex ruling on the Gemini review

The Gemini report is accepted as visual evidence, but its proposed constants and file boundaries are not automatically design-locked. Apply these rulings before implementation:

- Approve its P0 findings on viewport framing, complete-canvas visibility, train-shell/deck hierarchy, actor readability, scan/exposure cues, anchored-group cues, transfer readability, and companion/duo distinction.
- Treat the proposed 72–80px actor height and exact scale multipliers as hypotheses, not mandatory constants. Choose the smallest scale that is clearly readable at 100% screenshot size while preserving both lanes, crowd spacing, transfer overlap, camera framing, and the locked spatial mechanic. Prove the result in screenshots.
- Gemini's instruction not to change `socialStealthModel.js` means do not change the locked mechanic contract, thresholds, interaction priority, or section structure. It does **not** freeze the file. You must repair its implementation where required for active-scan exposure, target lock/clear behavior, anchored ±55 adjustment, real crowd dispersal, reset consistency, and truthful tests.
- The suggested full-screen lock flash is optional P1. If used, it must be brief and subordinate to the spatial lock/scan relationship; it must not become the primary stealth explanation or obscure play.
- Keep the current photographic panorama only if it can be visually subordinated and made coherent with the crisp low-pixel actors. Do not spend the acceptance pass producing a new external art asset.
- Where a Gemini recommendation conflicts with the mandatory P0 repairs below, the mandatory repair and `docs/CAR_03_DESIGN_LOCK.md` win. Record any unresolved conflict for Codex.

## Allowed implementation scope

Only modify files required for the isolated Car 03 slice:

- `car03.html`
- `src/car03-main.js`
- `src/cars/presentCity/**`
- `tests/car03/**`
- Car 03-specific Vite configuration only if strictly required
- `outputs/car03-acceptance/**` when regenerating evidence
- Car 03-specific progress/handoff documentation only after verification

Do not modify shared Prologue, Tutorial, Car 02, global art, shared scene, or shared mechanic files. If a required fix appears to need shared-file changes, stop and report the exact dependency to Codex.

## Mandatory P0 repairs

### 1. Real controls must work through the browser

- `A` and `LEFT` move left.
- `D` and `RIGHT` move right.
- Up/down lane controls preserve the design lock.
- `E` performs the context interaction through an edge-triggered input path such as `JustDown`; registering the key is not sufficient.
- `R` fully resets the model and all scene transients: camera position, shell/overlay state, lock visuals, timers, completion/firework state, and any active tween or particles.
- Acceptance evidence must use real browser key events. Do not mutate `key.isDown`, call model APIs directly, or invoke internal QA helpers as a substitute for natural play.

### 2. Anchored micro-adjustment must be real and persistent

- While anchored, lateral input must update the model's intended relative offset and keep it clamped to the locked ±55 range.
- The scene must pass the relevant input into the model every frame.
- The visual player position, model state, and `render_game_to_text` must agree.
- Add a non-tautological test proving both limits, persistence, and reset behavior.

### 3. Exposure and drone lock must follow the locked rules

- Exposure growth must depend on active scanning, not merely proximity to a drone.
- Set, display, transfer, and clear the lock target according to the model rules.
- Warning, lock, recovery, and group transfer must have visible state changes without a numeric stealth HUD.
- Add tests that fail if scanning is inactive, if a wrong target is locked, or if lock state survives an invalid reset/recovery.

### 4. Crowd dispersal must be spatial and visible

- An alert-triggered crowd must visibly separate, flee, or leave the playable relationship; freezing in place is not dispersal.
- Update both model state and scene presentation so collision/anchoring targets match what the player sees.
- Preserve the two-person-pattern twist and make its distinction visually readable.
- Add tests for dispersal transition, post-dispersal target invalidation, and the duo exception/twist.

### 5. Repair page composition and camera-space art

- The HUD and canvas must stack vertically or otherwise preserve a complete, readable 960×600 canvas at the acceptance viewport. No side-by-side clipping.
- Train shell and screen-space surveillance feedback must stay fixed to the camera where required.
- Panorama chunks must use a coherent display scale and scaled X placement so there are no black gaps or mismatched seams.
- The protagonist must be the clearest moving silhouette. Crowd, companion, and drone must remain distinguishable at screenshot scale and not rely on color alone.
- Implement Gemini P0 items, and any compatible P1 items that materially improve acceptance, using existing primitives/assets where possible.
- Do not implement a Gemini recommendation that changes locked mechanics or canon. Record the conflict for Codex instead.

### 6. Replace false-positive tests

- Remove tautological type checks such as comparing a value's type with itself.
- Validate required keys with own-property checks and expected concrete types/ranges.
- The caught-to-recovered test must actually create a caught/locked condition before proving recovery.
- Add at least one scene/browser integration test for the real keyboard route, not only model unit tests.

## Visual constraints to preserve

- No numerical stealth meter.
- No yellow/red circular halos as the primary explanation.
- No giant abstract overlay replacing spatial stealth.
- No photoreal or high-detail backdrop that overwhelms the existing crisp low-pixel / low-poly character language.
- Preserve the locked fantasy, thresholds, interaction grammar, and narrative meaning.
- Treat Gemini observations as evidence and specifications, not permission to redesign the game.

## Required acceptance evidence

Regenerate the evidence only after the real-input path works. Capture the complete page and the complete canvas at a consistent viewport, with no crop hiding composition problems. Required states:

1. entry / free movement
2. isolated warning
3. joined at slow cadence
4. active drone scan and growing warning
5. drone lock
6. crowd dispersal
7. transfer or recovery after lock
8. companion rescue / synchronization
9. duo-pattern twist
10. completion
11. reset after completion

At least one continuous natural-play run must reach the critical sequence using browser key events only. Record the exact key sequence and timestamps or step order. Keep `render_game_to_text` synchronized with each captured state.

## Verification gates

Run and report exact results for:

1. Car 03 tests
2. tutorial regression tests
3. asset check
4. production build
5. `git diff --check`
6. real browser interaction run
7. screenshot review at actual scale
8. `render_game_to_text` parity review

Do not weaken tests or delete assertions to make gates pass. Do not claim a visual state exists merely because a model field has the expected value.

## Final handoff format

Return a concise report containing:

- files changed;
- each mandatory P0 and how it was repaired;
- Gemini P0/P1 items implemented, deferred, or rejected with reasons;
- exact verification commands and pass counts;
- exact natural-play input sequence;
- links/paths to all regenerated evidence;
- remaining risks or blockers;
- a final status of `READY_FOR_CODEX_REVIEW` or `BLOCKED`.

Do not use `COMPLETE`, `ACCEPTED`, or equivalent language; Codex performs the final review.
