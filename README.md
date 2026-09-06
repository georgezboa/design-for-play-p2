# Nightfall

A 2D lane-shifting psychological horror game built with Phaser 3. The player
crosses eleven versions of the same world, meets witnesses who remember failed
runs, and makes a final choice about whether the simulation should continue.

```bash
npm install
npm run assets:prepare   # only after a source panorama changes
npm run dev      # http://localhost:5180 — chapter select
npm run prod     # http://localhost:5181 — the real run, no skipping
npm run build    # -> dist/
```

## Dev mode and prod mode

`npm run dev` opens on a **chapter select**: the Prologue's six junctions in the
left column, the car order in the right. Move with `W`/`S` or the arrow keys,
change column with `A`/`D`, start with `Enter`. Selecting a row writes the
matching query string into the address bar, so the URL you end up on is
shareable and survives a reload. Press `` ` `` at any time to come back here.

`npm run prod` serves exactly the same code with every skip route switched off.
There is no chapter select, and `?chapter=`, `?world=`, `?qa=` and `?artState=`
are all ignored — the game always starts on the first frame of the Prologue.
`npm run build` produces a bundle with the same guarantee. The two servers use
different ports so a dev session and a clean run can be compared side by side.

The switch is one build-time constant, `DEV_MODE` in `src/devMode.js`, set from
Vite's `command`/`mode` in `vite.config.js`. Every dev route reads its query
parameters through `devParams()` in that file, which returns an empty set in a
production build — so adding a new route cannot accidentally leak into a shipped
game.

### Dev routes

| Route | Effect |
| --- | --- |
| `?chapter=N` | Start inside chapter `N` (0 = Prologue, 1 = `THE SAFETY TEST`). Also accepts a slugified title, e.g. `?chapter=the-safety-test`. |
| `?qa=timetable-N` | Warp into Prologue junction `N` with the earlier junctions already cleared. |
| `?qa=phase2…phase6&state=…` | The per-phase QA fixtures documented under `docs/`. |
| `?world=N` | Backdrop preview only: swap the painting and freeze world streaming. |
| `?artState=…` | Force the tutorial car's power state. |

A URL that already names one of these boots straight into it and skips the
chapter select, so every existing QA link in `docs/` still works as a deep link.

`?chapter=N` lands the player on the first ground run that can hold them:
chapters 1, 3 and 8 begin over a hole in the near lane, so their spawn is nudged
past it rather than dropped into it.

### Getting your chapter into the chapter select

The menu is built from the data the game already runs on, so most chapters
appear without touching [`src/scenes/DevMenuScene.js`](src/scenes/DevMenuScene.js).
Which case you are in depends on how your chapter is built.

**1. Your chapter is a world in the main build.** Add your entry to
`STORY_WORLDS` in [`src/story.js`](src/story.js) — `startX`, `texture`, `title`,
`subtitle` — and it shows up in the right-hand column with a `?chapter=N` route.
Nothing else is required. Two things to know:

- `startX` is where your backdrop takes over, not a spawn point. The chapter
  select lands the player on the first `LANE_NEAR` `kind: 'ground'` solid in
  [`src/level.js`](src/level.js) that can hold them, so make sure your chapter
  has ground somewhere at or after its `startX`.
- Add your chapter's number word to `CHAPTER_WORDS` in `DevMenuScene.js` if you
  want a name instead of the `CHAPTER 11` fallback.

**2. Your chapter is a section of the Prologue.** Add your stage to
`LEVEL.tutorialPuzzle.stages` in [`src/level.js`](src/level.js). It appears in
the left-hand column with a `?qa=timetable-N` route, and the row's detail line
comes from your stage's `lesson` field.

**3. Your chapter is its own entry point.** This is the pattern car03, car04 and
car06 use: your own HTML page in the project root, your own `src/carNN-main.js`,
and usually your own `vite.carNN.config.js`. That game is a different page, so no
query string can reach it — add one line to `STANDALONE_SLICES` at the top of
[`src/scenes/DevMenuScene.js`](src/scenes/DevMenuScene.js) instead:

```js
{
  label: 'CAR 07  //  YOUR CHAPTER',
  detail: 'One line the menu shows when this row is selected.',
  href: '/car07.html',
},
```

The main dev server serves every HTML page in the project root, so `href` works
without starting your car's own Vite config. Selecting the row navigates to that
page; `` ` `` will not come back from it unless your entry point wires up the
same shortcut, so reach the menu again through `http://localhost:5180/`.

Whichever case you are in, keep world identity separate from sequence order. The
car order is still expected to move, so name your chapter after what it *is*, not
after the slot it currently occupies.

## World background pipeline

The full-resolution PNG files in `src/assets/` are source masters, not runtime
textures. `npm run assets:prepare` converts the ten unique panoramas into
overlapping JPEG chunks no wider than 4096 pixels and writes a generated
manifest under `src/assets/generated/worlds/`.

At runtime, Phaser loads only the current world and its neighbors. Distant
world textures are released from GPU memory. The two cyberpunk story revisions
share one generated asset instead of bundling the same panorama twice. Normal
gameplay, story triggers, world order, and level geometry are unchanged.

To preview a background without walking through the level, add `?world=N` or a
texture key to the development URL. This freezes world streaming, so it judges a
painting rather than playing a chapter — use `?chapter=N` to actually stand in
one.

```text
http://localhost:5180/?world=5
http://localhost:5180/?world=backdrop-05
```

The canonical source-to-texture mapping lives in
`src/worlds/world-assets.json`. Builds run `npm run assets:check` automatically
and fail with a direct instruction if a source image changed without regenerating
its game assets.

## Controls

Chapter 4 (`painted-country.html`) is the exception: it is a painting chapter,
so it adds the pointer and lists its own controls in the car's margin.

| Key | Action |
| --- | --- |
| `A` `D` / `←` `→` | Walk |
| `Space` | Jump |
| Hold left-click | Paint — turns a drawn line into a surface that bears weight |
| Hold right-click | Wash — turns a surface back into a line and returns its pigment |
| `R` | Start the bay over |

### Every other car

| Key | Action |
| --- | --- |
| `←` `→` / `A` `D` | Move |
| `Space` / `↑` | Jump (hold for height) |
| `Shift` | Run |
| `W` | Shift into the background (far lane) |
| `S` | Shift toward the camera (near lane) |
| `F` | Strike |
| `E` | Interact — levers |
| `E` / `Space` | Advance dialogue |
| `1` / `2` | Choose a dialogue response |
| `R` | Restart |
| `0` | Toggle Arcade physics debug |

## Story mode

The environments in `src/assets/` are treated as revisions of one simulation,
not as a literal historical timeline. The player is the **witness process**:
something the world needs in order to prove that a person once lived inside it.

Eight NPCs are placed along the existing platforming route. Each NPC has a
first conversation, a meaningful question with two responses, and a shorter
repeat line when revisited. Dialogue choices track **memory** and **witnesses**;
the final NPC offers two endings:

- **I remember** — the player rejects the role of player and wakes the world.
- **I forgive you** — the player stays, becoming the shape used to render the
  next person.

The game uses repetition, contradictions, and changing scenery for tension. It
does not rely on jump scares.

## How the depth lanes work

The world stays flat and readable. Both lanes live in the **same Arcade physics world**,
just at different vertical bands: the far lane's ground surface is at `y=290`,
the near lane's at `y=460`. Depth is sold with four cues layered together:

- **Vertical separation** — the two playfields occupy distinct screen bands.
- **Scale** — far-lane sprites render at `0.78`, and far-lane terrain uses
  `setTileScale` so its masonry shrinks *without* changing collision boxes.
- **Value** — both lanes are crushed to silhouettes against the painted
  backdrop, the near one darker. See the value ramp under *Art direction*.
- **Parallax** — the painted panorama, two drifting fog banks, inter-lane mist
  and the foreground brambles all scroll at different rates.

Lane separation is enforced by a **single collider with a process callback**:

```js
this.physics.add.collider(
  this.player, this.solids, this.onSolidHit,
  (p, s) => s.laneId === p.lane && s.body.enable && !p.transiting,
);
```

The player simply cannot touch geometry belonging to the other lane. Enemies
use the same lane check on their overlap callback.

Shifting lanes maps the player's height above their current lane's floor onto
the destination lane, scaled by the ratio of lane scales
(`Player.laneTargetY`). `GameScene.canOccupyLane` probes the destination first
and refuses the shift if it would put the player inside solid rock.

## Where to change things

| I want to... | Edit |
| --- | --- |
| Retune jump feel, speed, lane timing | `src/constants.js` → `MOVE` |
| Move platforms, enemies, and pits | `src/level.js` |
| Change lane depth/scale/tint | `src/constants.js` → `LANES` |
| Redraw any sprite | `src/textures.js` |
| Change the simulation worlds | `src/story.js` → `STORY_WORLDS` |
| Replace or add a panorama source | `src/worlds/world-assets.json`, then `npm run assets:prepare` |
| Reframe the backdrop | `src/constants.js` → `BACKDROP` |
| Retune the value ramp / fog | `src/palette.js` + `LANES` tints |
| Move lamps, hearses, fences, graves | `src/level.js` → `decor` |
| Add a new interactable | `src/level.js` + `GameScene.fireInteractable` |

### Jump feel

The jump is not a single impulse. `src/Player.js` layers the things that make a
platformer feel forgiving:

- **Coyote time** (110 ms) — jump slightly after walking off a ledge.
- **Jump buffering** (130 ms) — press jump slightly before landing.
- **Variable height** — release early and upward velocity is cut to 42%.
- **Asymmetric gravity** — 0.6× near the apex, 1.3× while falling, so you
  float at the top and come down snappy.

Scripted launches go through `Player.launch()`, which deliberately clears
`isJumping` so the variable-height cut doesn't chop them.

## Art direction

Three layers, and the distinctions matter:

- **The backdrops** are the eleven panoramas in `src/assets/`; the scene swaps
  them as the player moves through the map, turning traversal into a sequence
  of simulation revisions.
- **Silhouettes** are drawn in grey and *tinted* per lane. Tint is
  multiplicative, so every texture is drawn at its lightest value and each lane
  multiplies it down. Against a painting, both lanes go nearly black.
- **Lights** — lamp haloes and cleaver trails are separate additive sprites
  that are never lane-tinted. That keeps the few bright accents deliberate.

Everything hangs off one rule: **the scene is a monotonic value ramp that
darkens toward the camera.** Measured luminance, sampled off the canvas:

```
backdrop city > FAR lane > NEAR lane > foreground brambles
     46            19          6              4
```

Break the monotonicity anywhere and the depth read collapses, however good the
individual layer looks in isolation. Three things did break it during
development and are worth not re-introducing:

1. Lane tints originally made the far lane *lighter* than the skyline behind
   it, so the mid-distance flattened into one grey slab.
2. `fogDrift` sat at depth 13 — in front of the far lane — and washed its face
   lighter than the city. It now sits below the far lane's surface (y 384).
3. When the painting arrived, the far lane at luminance 28 sat inside a
   backdrop range of 27–39 — no separation at all, so it read as a flat grey
   slab pasted over the art. Both lanes were pushed to silhouette to fix it.

### Silhouettes need two escape hatches

Crushing the lanes to black breaks two things that a mid-grey lane hid, and
both are handled by colours that bypass the lane tint entirely:

- **`LANES[].rim`** — the moonlit lip on every ledge. The baked rim multiplied
  by a silhouette tint landed within *2 luminance* of the body, leaving the
  surface you stand on with no visible edge. The rim is now its own strip.
- **`LANES[].figureTint`** — the hunter, beasts, levers and flags. At the
  terrain tint they vanished into ground that is just as black.

### The backdrop

One `Image`, not a tileSprite. Tiling a painting this specific would repeat its
moon several times across the level and put a seam at every wrap. Instead the
scroll factor is *derived* from the image width so the panorama pans across
exactly once end to end — no repeat, no seam, and the far side of the city
becomes a reward for reaching the far side of the level.

Everything is measured off the source image at runtime, so swapping the
painting means changing one import in `BootScene`. `BACKDROP` in
`src/constants.js` holds the framing:

| Field | Does |
| --- | --- |
| `height` | scaled height in px; taller than the viewport on purpose |
| `horizonFrac` | where the skyline meets the ground haze, as a fraction of the image |
| `horizonY` | the game y that horizon lands on |
| `tint` | multiplicative — holds the painting above the far lane in the ramp |

`horizonY` is pushed low (560) deliberately: the painting has its own
cobblestone plaza and fence row, and they sit exactly where the play area is.
Cropping them below the viewport was the difference between the art supporting
the level and competing with it.

Dropping the inter-lane treeline was the other win — the painting's own lamplit
street now shows through the gap between the two lanes.

## Assets

The world panoramas are real assets. Everything else — every sprite, tile, fog
bank, glow and vignette — is drawn with the Graphics API at boot in
`src/textures.js` and baked into a texture, and all sound is synthesized with
WebAudio oscillators in `src/sfx.js`.

Two Graphics constraints shaped the procedural art: `fillGradientStyle` does
**not** survive `generateTexture`, so every gradient (sky, vignette, glow) is
built from solid per-row or per-pixel fills; and Graphics has no erase, which
is why shapes are stroked rather than carved out of solid blocks.

One Phaser gotcha worth knowing if you go looking for objects at runtime: a
**TileSprite's `texture.key` is an internal UUID**, not the source key you
passed in. Filtering the display list by `texture.key === 'terrain-cap'` finds
nothing and looks exactly like the objects were never created.

## Version pins

- **Phaser 3.90.0**, not 4.x. Phaser 4 is a renderer rewrite with API churn;
  essentially all Phaser tutorials and Stack Overflow answers target v3.
- **Vite 6.4.3**, not 7/8. Vite 7+ requires Node `^20.19.0 || >=22.12.0`.
  If you upgrade Node past 20.19, you can bump Vite freely.

## Layout

```
index.html
src/
  main.js          Phaser config + game boot (exposes window.game)
  constants.js     tuning: lanes, gravity, movement feel
  level.js         all level data (solids, enemies, interactables)
  textures.js      procedural art
  sfx.js           WebAudio blips
  palette.js       the value ramp — every colour in the game
  assets/          the eleven simulation panoramas
  Player.js        movement, jump, lane shifting
  story.js         world revisions, NPC dialogue, and final choice branches
  scenes/
    BootScene.js   bakes textures, starts Game
    GameScene.js   world build, collisions, interactions
    HudScene.js    score/lives/lane, toasts, win + game-over overlays
```
