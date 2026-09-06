# Car 03 — Qwen Implementation Benchmark

## Mission

This is a bounded implementation task, not another audit. Repair exactly two verified Car 03 blockers, add honest regression coverage, run the required checks, and stop for Codex review.

The two blockers are:

1. Scan graphics mix screen-fixed rendering with world-space X coordinates, so the visible cone/reticle can separate from the gameplay scan region after camera scrolling.
2. Final duo activation can happen automatically from alignment inside `tickDuo()`, bypassing the design-locked single press of `E`.

Do not broaden this task into general Car 03 cleanup or redesign.

## Read before editing

Read completely, in this order:

1. `AGENTS.md`
2. `docs/CAR_03_DESIGN_LOCK.md`
3. this file
4. `src/cars/presentCity/PresentCityScene.js`
5. `src/cars/presentCity/presentCityArt.js`
6. `src/cars/presentCity/socialStealthModel.js`
7. `tests/car03/**`

Inspect `git status --short` first. The worktree is intentionally dirty. Preserve every unrelated user/team change. Do not clean, revert, stage, commit, push, or rewrite existing work. Do not use subagents.

## Allowed files

Modify only what is necessary inside:

- `src/cars/presentCity/PresentCityScene.js`
- `src/cars/presentCity/presentCityArt.js`
- `src/cars/presentCity/socialStealthModel.js`
- `tests/car03/**`

Do not modify shared Prologue, Tutorial, Car 01, Car 02, global scene/art, HTML, Vite config, product-state, progress, evidence, or design-lock files. If either repair truly requires another path, stop and report the dependency instead of expanding scope.

## Repair A — scan coordinate consistency

Use one coherent coordinate system for the entire scan cone and aimed reticle:

- World-space graphics may receive world coordinates and scroll with the world; or screen-fixed graphics may receive coordinates converted from world to camera space.
- Never combine `setScrollFactor(0, 0)` with unconverted world X coordinates.
- The visible drone origin, cone, target reticle, and model scan region must remain aligned before and after substantial camera scroll.
- Preserve the existing active/inactive scan behavior and visual language. Do not redesign the scanner.

Add the strongest practical regression coverage. Prefer a behavioral/pure coordinate test or browser assertion over source-substring checks. A test that merely proves a helper exists is insufficient.

## Repair B — E-gated duo establishment

Preserve the design lock: final duo formation is established only by one contextual edge-triggered `E` press.

Required behavior:

- Alignment alone must never establish the duo.
- Before the valid `E` press, `duo.active` must remain false and completion must be impossible even when lane, facing, spacing, and speed alignment are valid.
- A valid press in final-section alert conditions with the safe companion establishes/arms the duo and emits `duo-established` once.
- The valid E route must remain reachable after crowds disperse; do not accidentally require an obsolete crowd anchor if the locked final state has no large crowd.
- After establishment, live alignment still determines whether the two-person pattern is currently valid. Completion requires explicit establishment plus valid alignment.
- Invalid/out-of-context E presses remain no-ops for duo establishment.
- Reset clears every duo-establishment state and prevents stale completion.
- Do not change the four-section structure, thresholds, interaction priority outside what is necessary for the reachable final E action, or the protagonist-only direct-control rule.

Add non-tautological tests that prove at minimum:

1. valid alignment without E does not activate or complete;
2. one valid E press establishes the duo and emits the event;
3. invalid E cannot establish it;
4. broken alignment cannot complete;
5. reset clears establishment and completion state.

Do not weaken or delete existing assertions merely to make the suite pass.

## Verification

Run and report exact results:

```text
node --test tests/car03/*.test.mjs
npm run assets:check
npx vite build --config vite.car03.config.js --outDir /tmp/infinity-train-car03-qwen-build
git diff --check
```

If your Qwen Code environment can drive a real browser, also run `car03.html` at an actual 960×600 game viewport and verify with natural keyboard input:

- move far enough to cause camera scroll and confirm the visible cone/reticle remains aligned with the drone/player and gameplay exposure;
- reach the final duo state and prove alignment without E cannot complete;
- press E once through the real scene input path and prove the duo can then become valid and complete;
- press R and prove the establishment/completion state clears.

Do not mutate Phaser key objects, invoke model methods from page JavaScript, use QA warps as a substitute for the natural-play claim, or label synthetic `KeyboardEvent` injection as native browser input. If browser tooling is unavailable, say `BROWSER_NOT_RUN` rather than fabricating evidence. Codex will perform final browser acceptance separately.

## Stop conditions

Stop and report `BLOCKED` if:

- a required fix needs an out-of-scope file;
- current unrelated changes overlap so heavily that safe editing is impossible;
- the design lock and implementation cannot be reconciled without a product decision.

Otherwise finish with `READY_FOR_CODEX_REVIEW`. Never claim `ACCEPTED` or final completion.

## Final response format

Return only a concise handoff containing:

- status: `READY_FOR_CODEX_REVIEW` or `BLOCKED`;
- files changed;
- how Repair A works;
- how Repair B enforces E plus live alignment;
- tests added;
- exact command results;
- browser result or `BROWSER_NOT_RUN`;
- remaining risks.
