# NIGHTFALL — The Last Archive Line

A single-player night-train journey backward through time. Every chapter is its
own page built with Phaser 3 or Three.js; the title screen on `index.html`
holds the saves and sends the player from page to page, with an authored film
between chapters.

```bash
npm install
npm run dev      # http://localhost:5180 — dev launcher + dev-only QA routes
npm run prod     # http://localhost:5181 — the real run, no skipping
npm run build    # -> dist/ (every page below is a build input)
npm run preview  # serve dist/
node --test $(find tests -name '*.test.mjs')
```

`dev`, `prod` and `build` run `npm run assets:check` first (see *World
panoramas*).

## Chapters

| # | Chapter | Page | Code |
| --- | --- | --- | --- |
| — | Title, saves, settings, credits | `index.html` | `src/main.js`, `src/shell/` |
| 1 | NIGHT SERVICE (panel puzzle, three acts) | `night-service.html` | `src/nightService-main.js`, `src/chapters/nightService/` |
| 2 | BORROWED LIGHT (rain rooftops, sections A–C) | `borrowed-light.html` | `src/borrowedLight-main.js`, `src/chapters/borrowedLight/` |
| 3 | ECHO CITY (3D investigation) | `car03-3d.html` | `src/car03-3d-main.js`, `src/cars/presentCity3d/`, `public/assets/chapter03-3d/` |
| 4 | THE PAINTED COUNTRY | `painted-country.html` | `src/paintedCountry-main.js`, `src/chapters/paintedCountry/` |
| 5 | THE MUSEUM OF ONE ANSWER | `museum-3d.html` | `src/chapters/museum3d/`, `public/museum3d/` |
| 5 | · Door 1 — Labyrinth | `labyrinth.html` | `src/chapters/museum/labyrinth/` |
| 5 | · Door 2 — Borrowed Grid | `borrowed-grid.html` | `src/chapters/borrowedGrid/` |
| 5 | · Painted Country revisit | `chapter05-painted-country.html` | `src/chapters/paintedCountry/painted-country-main.js` |
| 6 | ALL WORLDS AT ONCE — the Conductor | `final-boss.html` | `src/chapters/finalBoss/` |
| 6 | BLACK KNIFE — hidden finale (all five stones) | `hidden-final-boss.html` | `src/chapters/blackKnifeFinal/` |
| — | The Unfiled Ending | `true-ending.html` | `src/trueEnding-main.js` |

Shared pieces: `src/shell/` (title menu, save slots and checkpoints, pause
menu, settings, cinematics and chapter preloading, magic stones, credits),
`src/shared/` (music director, audio focus), `src/fonts/`, and the transition
films in `public/cinematics/`. Chapter 3's runtime is locked by
`tests/car03/chapter3TemporaryFinalLock.test.mjs`; reopen the lock before
editing it.

## Saves and checkpoints

Three slots live in `localStorage` (`src/shell/saveSystem.js`). Each chapter
records its own checkpoint as the player reaches it; **Continue** and **Load**
open the checkpoint's page. Legacy ids from earlier builds still load:
`prologue-start` opens Night Service Act I and the `chapter-2-*` ids open
Borrowed Light at the matching section. A Chapter 6 save resumes on whichever
boss that slot's magic stones select (`src/shell/finalBossRoute.js`).

`index.html` itself runs no chapter:

| URL | Effect |
| --- | --- |
| `/` | Title screen (in `npm run dev`: the dev launcher) |
| `/?credits=1` | Title with the credits roll open; the endings return here |
| `/?play=1` | Legacy entry: resume the active slot's checkpoint, or show the title |
| `/?title=1` | Dev only: the production title instead of the launcher |

## Dev mode and prod mode

The switch is one build-time constant, `DEV_MODE` in `src/devMode.js`, set from
Vite's `command`/`mode` in `vite.config.js`. Pages read their QA query
parameters through `devParams()`/`devParam()` (or check `DEV_MODE`), which are
empty/false in a production build, so no dev route can leak into a shipped game.

In `npm run dev`, `/` shows an HTML **dev launcher** listing every page, act and
section; the title's hidden `1111` router shows the same list. Both read
`src/shell/devRoutes.js` — add a row there for a new test node. Every chapter
page gets a `` ` DEV MENU`` link back to the launcher.

| Page | Dev-only routes |
| --- | --- |
| `night-service.html` | `?act=1..3`, `?step=<id>` (opens the act that owns the step), `?dtmax=` |
| `borrowed-light.html` | `?section=A\|B\|C` (production honours it only when unlocked), `?timescale=`, `?intro=0` |
| `car03-3d.html` | `?playtest=chapter3-campfire`, `chapter3-25`, `chapter3-sunrise` |
| `painted-country.html` | `?qa=drawing`, `?qa=pigments` |
| `museum-3d.html` | `?beat=corridor`, `?beat=echo&standalone=1`, `?beat=collapse` |
| `final-boss.html` | `?qa=conductor-1..4` |
| `hidden-final-boss.html` | `?qa=1`, `?easter-egg=1` (skip the five-stone gate) |
| `true-ending.html` | `?qa=1` (skip the five-stone gate) |

Standalone dev servers exist for the heavy chapters: `npm run dev:chapter03`,
`dev:chapter05`, `dev:final-boss`, `dev:hidden-final-boss` (plus
`vite.labyrinth.config.js` and `vite.painted-country.config.js`). The main dev
server already serves every page, so they are only needed for isolated builds.
`chapter01-opening.html` is a dev-only storyboard preview of the opening film.

## World panoramas

The full-resolution PNGs in `src/assets/` are source masters, not runtime
textures. `npm run assets:prepare` cuts each panorama listed in
`src/worlds/world-assets.json` into JPEG chunks no wider than 4096 px under
`src/assets/generated/worlds/`, with a generated manifest; `npm run
assets:check` (run before every dev/prod/build) fails if a source changed
without regenerating. Four panoramas remain, cropped by Night Service
(world-01, 03, 07), Borrowed Light and the Museum's Borrowed Grid door
(world-04).

## Desktop and Steam builds

`npm run desktop` runs the production build in Electron; `npm run package:mac`,
`package:win`, `package:linux` and `package:steam*` produce installers and
Steam depots. See [`desktop/README.md`](desktop/README.md) for the local
server, save-location rules and packaging details.

## Version pins

- **Phaser 3.90.0**, not 4.x. Phaser 4 is a renderer rewrite with API churn.
- **Vite 6.4.3**, not 7/8. Vite 7+ requires Node `^20.19.0 || >=22.12.0`.
