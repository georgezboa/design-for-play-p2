# Chapters 1 / 2 / 3 / 5 latest-main integration handoff

Last updated: 2026-08-13

## Integration boundary

- Local integration branch: `codex/latest-main-chapters-1-2-3-5`
- Base: current `main` at `570c988` (2026-08-11).
- The reviewed cyberpunk parkour package from PR #8 (`c746ffa`) is applied on
  top of that base, excluding its stale task-note conflict.
- This is a local integration branch. Nothing has been pushed or merged into
  `main`.

## Dev-menu routes

Run `npm run dev` once. The main development menu now exposes all playable
packages together:

- **Chapter 1 — Night Service / orange carriage narrative:** `/?chapter=0`.
  This is the latest playable Chapter 1 authority from PR #6 (`f1aa420`): the
  orange retro-transit car, Conductor narrative, and power-restoration route.
  The separate `/chapter01-opening.html` cinematic preview remains available
  as reference material, but it is not the Chapter 1 development-menu entry.
- **Chapter 1 / 2 — Cyberpunk Parkour:** `/?chapter=cyberpunk`.
  The main story column retains the normal Chapter One route; this direct entry
  is the teammate's movable-route, ladder, and flying-car development slice.
- **Chapter 3 — Echo City 3D:** `/car03-3d.html`.
- **Chapter 5 — Museum of One Answer:** `/museum-3d.html`.
- **Chapter 5 Door 1 — Labyrinth:** `/labyrinth.html`.
- **Chapter 5 Door 2 — Borrowed Grid:** `/borrowed-grid.html`.
- **Chapter 5 Echo City review:** `/museum-3d.html?beat=echo&standalone=1`.
- **Chapter 5 final pre-boss review — Collapse:**
  `/museum-3d.html?beat=collapse`. This direct route is for review only; the
  canonical story trigger is the embedded Labyrinth's completion message.

The menu continues to list Chapters 4 and 6, and production stays unchanged:
`npm run prod` starts the Prologue, not the development menu.

## Asset ownership kept separate

- Chapter 3's active runtime package and its animation, voice, model, backdrop
  and replacement assets live under `src/cars/presentCity3d/` and
  `public/assets/chapter03-3d/`.
- Chapter 1's playable authority is the orange retro-transit narrative
  interior. Its optional opening source, preview, narration, subtitles,
  storyboard and true gameplay-frame reference remain packaged at
  `public/chapter01-opening/` without replacing the playable Chapter 1 route.
- Chapter 5's Echo City revisit uses its own frozen authority snapshot at
  `public/museum3d/echo-city/authority/`; it does not overwrite Chapter 3.
- The final-locked Museum route enables **only Door 1 / Labyrinth**. Borrowed
  Grid, Echo City and Painted Country remain buildable as direct review pages
  but are sealed and inert inside the Museum. Completing the embedded Labyrinth
  grants eight keys and immediately starts the fixed-coordinate collapse in
  the existing corridor. Slotting all eight keys and crossing the black
  threshold completes Chapter 5 and hands off to `/car06.html` for the Chapter
  6 final boss. The authoritative timing/event table is in
  `docs/CHAPTER_05_COLLAPSE_GAUNTLET_DESIGN_LOCK_V02.md`.

## Useful focused commands

- `npm run test:chapter03`
- `npm run test:chapter05`
- `npm run build:chapter03`
- `npm run build:chapter05`

## Verification on this integration branch

- Chapter 1 / 2 focused tests: 8 / 8 passed.
- Chapter 3 focused tests: 163 / 163 passed.
- Chapter 5 focused tests: 148 / 148 passed after the final collapse lock.
- `npm run assets:check`, `npm run build`, `npm run build:chapter03`,
  `npm run build:chapter05`, and `git diff --check` passed.
- Browser-checked the menu, clicked its corrected Chapter 1 opening entry and
  its **ENTER CHAPTER 1** handoff through to the literal Prologue first frame,
  then clicked its Chapter 3 entry through to the live Echo City page. The
  direct Chapter 2, Chapter 3, Chapter 5 Museum, Door 1, and Door 2 routes
  likewise produced their expected runtime states with no browser-console
  errors.
- The final Chapter 5 contract additionally locks the Labyrinth completion
  message, all 12 authored collapse triggers, the eight-key door, black
  threshold, and `/car06.html` Chapter 6 handoff. Both the Chapter 5 and main
  production builds pass with this final lock.
