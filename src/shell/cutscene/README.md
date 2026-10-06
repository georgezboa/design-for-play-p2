# Cutscenes — authoring guide

The eight transitions are in-engine cutscenes drawn in Chapter 1's ink
language (docs/CUTSCENES_SPEC.md is the script; docs/STORY_BIBLE.md wins
where they disagree). All eight are authored; the films they replaced
(`public/cinematics/`) and the video player are gone.

## How a cutscene was added (for a new one or a rework)

1. Write `scenes/<name>.js` exporting `default` (and a named export) — the
   definition below. Copy `scenes/opening.js` for the shape.
2. Add one line to `CUTSCENE_LOADERS` in `registry.js`:
   `chapter1To2: () => import('./scenes/chapter1To2.js'),`. The names are
   `CUTSCENE_IDS` (opening, chapter1To2, chapter2To3, chapter3To4,
   chapter4To5, chapter5-to-conductor, chapter5-to-black-knife, ending).
   Call sites pass `CINEMATICS.*` / `finalBossRoute.js` names; old ids and
   film paths (`/cinematics/1-2.mp4`) still resolve to the same cutscene.
3. Add your definition to the "follow the spec" and "captions are the
   script" tests in `tests/cutscenes.test.mjs`.
4. Look at it: restart the dev server (it does not see edits), then in the
   browser console `(await import('/src/shell/gameFlow.js')).playCinematic({ id: 'chapter-1-to-2' })`.
   In dev builds `NIGHTFALL_CUTSCENE.freeze(seconds)` shows one frame and
   stops the clock there, `.seek(s)`, `.state()`; `render_game_to_text()`
   returns the same state. Render frames at 1600×900, 1280×720 and
   900×1200 and check them against the title scene and Ch1 Act 0.

## The definition

```js
export const chapter1To2 = {
  id: 'chapter1To2',
  length: [25, 40],                 // seconds; the ending is [40, 55]
  music: { id: 'cutscene-1-2', src: '/assets/music/ch1/1.2_train_resonance.mp3', volume: 0.42, fade: 3, outFade: 3 },
  prepare: () => usePaintAssets({ paper: paperUrl, train: trainUrl }),   // images the painters use
  shots: [
    {
      id: 'pulls-away',
      duration: 8,                  // seconds, including the join into the next shot
      draw(c, t, w, h, env) { … },  // t 0..1 within the shot; w × h is the stage (1600 × 800)
      camera: { from: { x: 0.4, y: 0.5, zoom: 1.1 }, to: { x: 0.6, y: 0.48, zoom: 1.25 }, still: { x: 0.5, y: 0.5, zoom: 1.1 } },
      transition: { type: 'slide', duration: 1.1 },   // the join into the NEXT shot
      captions: [{ text: 'The orchard case stayed on the rack.\nHer other ticket did not.', at: 0.9, end: 5.6 }],
      cues: [{ at: 0, sfx: 'rail', level: 1 }, { at: 3.2, sfx: 'punch' }],
    },
    // … 4–7 shots
  ],
};
```

- **The stage.** Every painter draws in stage units, 1600 × 800, whatever the
  window. The engine fits the stage to the panel with "cover" and the camera:
  `x`, `y` (0..1) are the stage point at the view's centre, `zoom` ≥ 1. On a
  tall window (900 × 1200) the sides are cropped, so keep the focal point
  near the middle third and let the edges be expendable.
- **Static vs live.** Paint anything that does not move once:
  `env.drawLayer(c, 'room', (lc, w, h, env) => { … })` caches it at the
  shot's resolution (keys starting `@` are shared by every shot of the
  cutscene). `env.drawLayer(c, key, paint, { depth: 0.4 })` gives it
  parallax against the camera. Draw only the moving parts live: rain, a
  swinging lamp, the train, a figure. Layers for every shot are painted
  before the first frame, so a shot never stutters into view.
- **env**: `time` (cutscene s), `wall` (s, keeps running in the held last
  frame — use it for loops like rain and flicker), `seconds`, `local`,
  `duration`, `reducedMotion`, `lowGraphics`, `textScale`, `camera`, `view`
  (the visible stage rect), `res`, `layer()`, `drawLayer()`, `parallax(d)`, `rng`.
- **Joins**, in order of preference: `slide` (Chapter 1's window swap: the
  panels slide along the wall), `ink` (a ragged ink front wipes across),
  `fade` (crossfade), `black` (through black), `cut`. A join overlaps the end
  of its shot with the start of the next; it is never longer than half of
  either shot. A shot with `blackout: true` takes the whole screen, frame and
  wall too, to black (the opening's hand-off into Act 0).
- **Reduce Motion** (the setting or the OS): the camera holds `still` (or
  `from`), every slide and ink join becomes a crossfade. In your painter,
  stop decorative motion when `env.reducedMotion` (rain still falls in
  place, lamps hang straight, passing lamps do not sweep). **LOW GRAPHICS**:
  one rain sheet, lower layer resolution, DPR 1; draw fewer particles when
  `env.lowGraphics`.

## Captions

- 3–5 per cutscene, one or two lines (`\n` breaks the line), about 4 s each,
  **never less than 2.5 s and never two at once** (`validateCutscene()` and
  the tests check). Times are seconds from the shot's own start; a caption may
  run on into the next shot's join.
- The text is the script, word for word. No voice. No speaker unless a
  character speaks a line in the script (`speaker: 'THE CONDUCTOR'`, shown in
  amber Space Mono over the line).
- They render as DOM in the caption-bar look (uiKit.css `.nf-caption`),
  centred under the panel, and follow TEXT SIZE. Keep the bottom 6 % of the
  stage free of anything the eye must read.

## Music and sound

- Music: only cleared tracks (docs/MUSIC_REPLACEMENT_PLAN.md and each
  `public/assets/music/*/ASSET_MANIFEST.md`; never a track on the uncleared
  list). `def.music` starts at the first frame with a fade and fades out at
  the end; `{ at, stopMusic: true, fade: 4 }` lets it go earlier. It plays
  through `src/shared/musicDirector.js`, which pauses with the pause menu and
  a hidden tab.
- Effects (`sfx.js`, WebAudio, Master × SFX): beds `rail` and `rain`
  (`{ sfx: 'rail', level: 1 }` starts or re-levels one; `{ stopSfx: 'rail', fade: 2 }`
  stops it), one-shots `bell`, `softBell`, `punch`, `paper`, `thud`,
  `whistle`, `brake`. Skipping fires no further cues.

## Shared painters (`painters.js`)

All take a context in stage units. Read-only imports of Chapter 1's kit
(`chapters/nightService/art/ink.js`, `figures.js`) are re-exported:
`ink`, `inkRect`, `inkEllipse`, `glow`, `wood`, `brassFill`, `vgrad`,
`paperTag`, `parcel`, `amberGlint`, `rng`, `PAL`, …

| Painter | What |
|---|---|
| `paintNightSky`, `paintCountry`, `drawRain`, `finishLayer` | the title's rain sky and orchard country; live rain over `env.view`; paper grain + vignette for a finished layer |
| `drawViaductShot(c, w, h, env, { trainX, dark, trainGlow })` | the opening's viaduct with the night service crossing (also `paintViaduct`, `paintCatenary`, `paintNightTrain`, `drawTrainLight`) |
| `drawWindowView(c, env, glass, { world, extra })` | the world through a carriage window: the night country, or any `paintWorld` kind, posts and rain running by |
| `damaskWall`, `wainscot`, `floorboards`, `carriageCeiling`, `seatBack`, `drawCeilingLamp`, `drawOilLamp` | the carriage interior pieces (teal damask, walnut, brass, oxblood seats, lamps) |
| `paintWorld(c, kind, w, h)` | one world as a panel: `office` (Ch1), `rooftops` (Ch2 rain, teal and amber), `square` (Ch3 warm stone, 14:20), `painted` (Ch4 pencil and gouache, the red hawthorn), `museum` (Ch5 walnut and brass) — stack them as Chapter 1 panels |
| `drawButch(c, x, y, s, { pose, phase, lamp })` | Butch, the Chapter 1 rig at any scale: `stand`, `walk` (phase = distance / 9.5), `sit`; lamp `'hand'` or `'belt'` |
| `drawButchAtDesk(c, x, y, s, { pose: 'tag' \| 'asleep', nod, lamp, light })` | the title's seated Butch in profile at a desk, holding a tag up (returns where it is) or asleep on his arms |
| `drawButchBack(c, x, y, s, { lampSide })` | Butch seated, seen from behind (cap band, turned-up collar) |
| `drawButchHeadBack(c, s, { lampSide, light, turn })` | the one back of his head both back views use (painters-c3 `drawButchStandingBack` too): round skull, short dark hair, ears, the nape over the turned-up collar, the cap from behind |
| `drawMaraWalking`, `drawMaraSeatedBack` | the Mara ahead: rose scarf, always turned away. **Never draw her face**, not even in a reflection |
| `drawConductor(c, x, y, s, { punch, lantern })` | the finale's Conductor (finalBoss/conductorFigure.js head and coat, Ch1 arms and lantern) |
| `drawClaimTag(c, x, y, { w, flip, front, back })`, `drawTicket`, `drawAccessionCard`, `drawOrchardCase` | close-ups: the claim tag (flips over about its long axis), a punched ticket, the museum card, the case |

`painters-c1.js` (chapter1To2, chapter2To3) adds: `drawPinchHand` (Butch's
hand holding a paper by its edge, close), `glassBeads`, `paintBrickFacade` and
`paintCityFar` (Chapter 2's rain city), `drawLitSign`, `drawStationClock`,
`drawLampPost`, `drawWaterTower`, `paintCarriageSide` (the night carriage's
side, close).

Characters: Butch is one design everywhere (cap with oxblood band and brass
badge, long coat, lamp) — use these painters, never a new Butch. The
Conductor is the finale's. Mara only from behind or in silhouette.

## Runtime (for reference)

`gameFlow.js` keeps `playCinematic` / `navigateAfterCinematic` /
`CINEMATICS`: `registry.js` resolves the call to a cutscene, `player.js`
mounts one full-window canvas (DPR-capped; CPU-backed on a software
renderer) inside the `.nf-cinematic` overlay, runs a wall-clock session
(`timeline.js`: frame-rate independent, a single step capped at 0.25 s),
pauses on `nightfall:pause` and a hidden tab, and hands back to gameFlow's
HOLD TO SKIP and preload gate: when the next chapter is not ready the last
frame stays up with "THE NIGHT SERVICE IS ARRIVING · n%". A short tap of
Escape opens the pause menu (the title page installs one for the opening);
holding it skips. If a cutscene fails to load it is skipped, through the same
preload gate. While a cutscene is mounted the page underneath does not draw
(`framePacing.js` `setPageCovered`): the cutscene ticks on the native frame
and has the machine to itself.
