# NIGHTFALL Final Boss Intro Cutscene Generation Package

Status: **DESIGN COMPLETE, MEDIA PENDING**
Date: 2026-08-13

This package defines two mutually exclusive films after Chapter 5. Generate
them as separate files. Do not combine both bosses into one reusable intro.

## Delivery files

1. `5-6-conductor.mp4`
   - Destination: `final-boss.html?from=chapter5`
   - Plays when the active save has fewer than five magic stones.
   - Creative brief: [01_CONDUCTOR_INTRO.md](./01_CONDUCTOR_INTRO.md)
2. `5-6-black-knife.mp4`
   - Destination: `hidden-final-boss.html?from=chapter5`
   - Plays only when the active save has all five magic stones.
   - Creative brief: [02_BLACK_KNIFE_INTRO.md](./02_BLACK_KNIFE_INTRO.md)

Place approved files in `public/cinematics/`. The runtime already reserves
these exact paths in `src/shell/finalBossRoute.js`. They are not played until
the media is delivered and the final integration pass explicitly enables
them, so missing videos cannot interrupt the current game.

## Shared technical specification

- 1280 × 720, 16:9, 30 fps.
- H.264 video in MP4, yuv420p, progressive scan.
- Target duration: 12 seconds. Acceptable range: 10 to 15 seconds.
- Begin on full black for at least 8 frames.
- End on a composition that can cut directly to the matching boss menu.
- No logos, subtitles, title cards, UI, health bars, watermarks, or readable
  generated text inside the image.
- No spoken dialogue. Deliver clean picture with restrained environmental SFX
  or silence. Final music and loudness matching stay in the game mix.
- Keep Butch's identity consistent: small paper body, dark coat, pale face,
  cyan thread/light accent. Do not redesign him as a realistic human.
- Preserve the game's tactile materials: paper, graphite, museum dust, brass,
  worn stone, black negative space. Avoid glossy science-fiction surfaces.

## Continuity boundary

The film begins after Butch crosses the opened Final Archive threshold. It
must not replay the Labyrinth, key insertion, or the corridor run. It may use
one brief falling fragment to connect the Museum collapse to the boss space.
Neither film reveals the ending. Do not show Mara, the truth-ending statement,
the escape train, or either boss being defeated.

The route decision is already locked in `resolveFinalBossDestination()`:

- `0–4 / 5` stones → Conductor film → original Chapter 6 boss.
- `5 / 5` stones → Black Knife film → hidden boss.

The title-screen `1111` menu has a separate seventh Easter Egg entry that
opens Black Knife directly for testing. That route never adds stones to a save
and does not change the Museum's normal decision.
