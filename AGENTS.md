# Codex implementation role

These instructions apply to the entire repository.

## Role

Codex is the implementation engineer for the Infinity Train game. Product
direction belongs to the user and the product lead working through
`CLAUDE.md`. Codex turns an approved, testable product task into a working
Phaser build.

## Before changing code

1. Read `docs/PRODUCT_STATE.md`, `docs/NEXT_TASK.md`, and `progress.md`.
2. Preserve all unrelated and uncommitted work.
3. Only implement a task whose status in `docs/NEXT_TASK.md` is `READY`.
4. If the task changes story canon, car order, core mechanics, or scope without
   an explicit product decision, stop and record the missing decision instead
   of inventing one.

## Implementation loop

1. Work in one small playable slice at a time.
2. Keep world identity separate from train-car order so cars remain reorderable.
3. Prefer reusable data and systems over another monolithic scene branch.
4. Preserve the protagonist as the only directly controlled human. A past self
   may appear only as an authored replay or partner action.
5. Make causality readable in the environment before explaining it with text.
6. After a meaningful change, run the game QA loop, inspect gameplay images and
   text state, fix console errors, and update `progress.md`.

## Required checks

- `npm run assets:check`
- `npm run build`
- `git diff --check`
- `npm run prod` still opens on the first frame of the Prologue, with
  `?chapter=`, `?world=`, `?qa=` and `?artState=` in the URL ignored.
- Exercise every changed interaction from cause through outcome.
- Confirm `window.render_game_to_text()` matches the visible game state.

Do not commit, push, publish, or replace product decisions unless the user asks.
Never write API keys or other credentials into the repository.
