# Chapter 03 Qwen Closeout and Natural Playthrough Gate

## Authority and goal

This is a bounded continuation of the existing **ECHO CITY** implementation. The implementation owner is Qwen. Codex remains acceptance and integration authority.

The goal is not to add another design layer. The goal is to turn the current logic/build pass into an honest, reviewable Chapter 03 handoff:

1. prove the current three-space chapter can be completed from its normal `car03.html` entry with natural player input;
2. make only the minimum fixes required for that natural route to work and read correctly;
3. clean up Chapter 03-owned legacy/test scope without erasing useful V1 evidence;
4. clearly inventory placeholder assets for the human/visual production pipeline.

## Current verified baseline

- `tests/car03/echoCity-behavior.test.mjs`: 28/28 focused tests passed in Codex's independent rerun.
- `npx vite build --config vite.car03.config.js`: standalone production build passed.
- `car03.html` currently loads `EchoCityScene`.
- The three intended spaces exist: Living Market, Transit Square, Silent Central Square.
- The current asset registry is placeholder-heavy.
- The existing `outputs/chapter03-echo-city-evidence/` relay screenshots are **not valid gameplay evidence**. They show TextEdit, AppleScript, or terminal relay screens rather than the game.

## Hard scope boundary

You may edit only:

- `car03.html`
- `src/car03-main.js`
- `src/cars/presentCity/**`
- `tests/car03/**`
- `vite.car03.config.js` only if strictly required
- `outputs/chapter03-echo-city-final-evidence/**`
- `docs/CHAPTER_03_QWEN_HANDOFF.md`

Do not edit shared routing, save systems, audio/subtitle buses, package files, `progress.md`, Chapters 01/02/04/05/06, character production assets, or another owner's work.

Do not commit, push, install dependencies, delete branches, reset the worktree, or use broad restore/cleanup commands.

## Product locks

- Keep the existing `observe/copy -> carry one cycle -> transplant -> release/restore -> record Butch -> Mara/city replay -> reunion` design.
- Do not add new worlds, abilities, combat, rhythm-game mechanics, currencies, menus, or narrative branches.
- Walking alone must never complete the chapter.
- Wrong interaction must produce clear local feedback and remain retryable.
- Failure resets only the current space checkpoint.
- Full reset remains deterministic.
- English voice and English subtitles are the project target, but this task must not generate or integrate final voice assets.
- Butch and Mara final character models are owned by another contributor. Keep explicit placeholders and asset slots; do not generate, redesign, or declare placeholder characters final.

## Required work

### 1. Inspect before editing

- Read this file, `docs/CHAPTER_03_QWEN_ECHO_CITY_EXECUTION_WORK_PACKAGE.md`, the current Chapter 03 scene/model/art/audio files, and all current `tests/car03/**` files.
- Inspect `git diff --` for Chapter 03 only. Do not assume every dirty file belongs to you.
- Identify whether the tracked deleted V1 tests and modified `PresentCity*` files are truly required by the new entry. Preserve useful V1 evidence. Never use a broad `git restore`; if a file must be recovered, make that one-file decision explicitly and record it in the handoff.

### 2. Run the current gates before changing code

- Run `node --test tests/car03/echoCity-behavior.test.mjs`.
- Run `npx vite build --config vite.car03.config.js`.
- Record exact results in the handoff.

### 3. Natural-input playthrough

Start the normal local build and play `car03.html` from the chapter entry to the Mara reunion.

Evidence rules:

- Use native browser keyboard/mouse events only.
- Do not use QA query parameters, debug teleportation, model mutation, localStorage manipulation, scene-method calls, or code executed in the page to advance state.
- `window.render_game_to_text()` may be read only for observation and logging.
- Short browser automation bursts with pauses are allowed.
- The playthrough must demonstrate each required causal step, not only the ending state.
- If the natural route is impossible, find the smallest Chapter 03-owned defect, fix it, rerun tests/build, and restart the natural playthrough from the beginning.

Save only real game evidence under `outputs/chapter03-echo-city-final-evidence/`:

- `01-entry.png`
- `02-living-market-observe.png`
- `03-living-market-copy-complete.png`
- `04-transit-first-transplant.png`
- `05-transit-both-relations-restored.png`
- `06-central-square-recording.png`
- `07-reunion-complete.png`
- `playthrough.jsonl` with timestamped input bursts and read-only text-state snapshots
- `console-errors.txt`
- `PLAYTHROUGH_REPORT.md` containing URL, launch command, automation command/script path, whether the browser was headed or headless, assertions, and final result

Every PNG must show the Phaser game canvas. TextEdit, Script Editor, terminal, source code, or materializer screenshots are forbidden and do not count.

You must open and visually inspect all seven PNGs before claiming PASS. Check that the player, focus target, copied cycle, receivers, current objective, failure feedback, recording state, Mara, and reunion outcome are actually readable on screen.

### 4. Minimum readability fixes only

If natural play reveals a blocker, you may make small Chapter 03-owned fixes such as:

- focus/prompt consistency;
- held-E progress feedback;
- copied-cycle inventory visibility;
- receiver compatibility feedback;
- current-space objective language;
- completion/retry feedback;
- `render_game_to_text()` parity with visible state;
- broken input wiring, checkpoint wiring, or scene transitions.

Do not perform a visual redesign and do not replace placeholders with improvised program-art pretending to be final assets.

### 5. Asset and legacy inventory

In `docs/CHAPTER_03_QWEN_HANDOFF.md`, list:

- every placeholder asset slot still required for final production;
- which slots depend on Butch/Mara character work owned by the human character contributor;
- which city/environment/FX assets can be replaced independently;
- the exact status of old `PresentCity*` files and tracked V1 tests: preserved, restored, superseded but retained, or still intentionally modified, with a one-line reason for each.

## Final verification

Rerun:

- all Chapter 03 Node tests that are intended to remain active;
- the standalone Chapter 03 production build;
- one full natural-input entry-to-reunion playthrough;
- one negative control proving walk-only completion is impossible;
- console error inspection.

## Handoff verdict vocabulary

End `docs/CHAPTER_03_QWEN_HANDOFF.md` with exactly one verdict:

- `READY FOR CODEX VISUAL/PLAYTEST REVIEW`
- `BLOCKED: <specific blocker>`

Do not use `PASS`, `DONE`, `FINAL`, or `MERGE READY`; Qwen is not the acceptance authority.

