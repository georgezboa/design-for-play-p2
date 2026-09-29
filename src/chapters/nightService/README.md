# NIGHT SERVICE — panel engine and how to author an act

Chapter 1 is a Gorogoa-style panel puzzle on its own page (`night-service.html`
→ `src/nightService-main.js`). The spec is `docs/CH1_NIGHT_SERVICE_PANELS_SPEC.md`.

| File | Role |
|---|---|
| `panelModel.js` | **All rules.** Grid, swaps, zoom stacks, frames/overlays, lens, links, actors, bell, script. No Phaser. |
| `PanelScene.js` | Renderer + input. Each tile has its own camera (clipping, zoom, drag). Never decides puzzle state. |
| `painter.js` | The `ctx` handed to `draw(ctx)` functions. |
| `actorRig.js`, `art/figures.js` | Jointed Butch / Conductor / Mara / train. |
| `art/ink.js`, `art/wallArt.js` | Canvas kit: jittered ink, wood, brass, paper tags, sepia, the carriage wall. |
| `acts/*.js` | Act 0 (1×1, zoom), Act 0.5 (1×2, swap; zoom + swap), Act 1 (2×2), Act 2 (2×2 lens + frame lift), Act 3 (3×2, everything). `acts/index.js` is the registry. |
| `hints.js`, `hintLines.js`, `art/hintArt.js` | The wordless hint tiers (when, and which gesture), the Conductor's tier-3 lines, the ghost hand and the sliding wall panels. |
| `art/actNArt.js`, `art/actNFx.js` | Each act's drawings and custom presentation effects. |
| `audio.js` | Synth SFX on the SFX bus, rail ambience, quiet music loop. |

## Authoring an act

```js
import { defineAct } from '../panelModel.js';

export const ACT2 = defineAct({
  id: 'act2', number: 2, title: 'THE LUGGAGE CAR',
  grid: { cols: 2, rows: 2 },            // 3×2 works too; layout is automatic
                                         // (1×1 / 1×2 pass `tile: CARRIAGE_TILE` so the wall can grow)
  growFrom: { act: 'act0', keep: { desk: 'office' } }, // optional: grow in place from the previous act
  slots: ['rack', 'window', 'aisle', 'board'],   // row-major starting layout
  start: { bell: 1, items: ['punch'] },  // chapter state when starting here fresh
  assets: ['fields', 'memory'],          // panoramas to load (worldAssets.js)
  cards: { A2: { stamp: '…', title: '…', lines: ['…'] } },
  fx: { myEffect(api, params) {} },      // optional act-specific presentation
  tiles: { /* see below */ },
  actors: { butch: { rig: 'butch', tile: 'aisle', x: 0.4, y: 0.8 } },
  steps: [ /* see below */ ],
});
```

Everything is tile-normalised: `x`, `y`, `at` and hotspot rects run 0..1 across
the panel.

**Acts outside Chapter 1.** `PanelScene` can also run an act that is not in the
chapter's act list: start it with `game.scene.start('PanelScene', { act: MY_ACT })`.
Such an act can set `kicker` and `heading` (the intro title card, which default
to `CHAPTER 1 · NIGHT SERVICE` and the act title) and `devSkip` (the `N` skip's
effects). The Museum's exhibit `acts/oneAnswer.js` (page `one-answer.html`,
entry `src/chapters/museum3d/oneAnswer/oneAnswer-main.js`) works this way; its
model tests are in `tests/nightService/oneAnswer.test.mjs`.

### Tiles and scenes

```js
rack: {
  state: 'default',                 // initial state (default: first key)
  draggable: true,                  // false = locked in place
  zoomStack: [],                    // optional pre-zoomed start: [{ state, rect }]
  frame: {                          // optional liftable frame (FrameDef)
    id: 'windowFrame', draw(ctx) {}, edges: {…}, accepts: ['orchard'], requires: cond,
  },
  states: {
    default: {                      // a SceneDef
      draw(ctx) {},                 // present layer
      drawPast(ctx) {},             // optional 1978 layer, seen only through the lens
      actorScale: 1,                // figure size in this state (zoomed rooms: ~1.9)
      zoomOut: true,                // false: a one-way zoom (e.g. the Conductor's car)
      zoomOutWhen: cond,            // hold the player in a close-up until cond (Act 0's bell)
      edges: {
        bottom: [{ type: 'drop', at: 0.25, when: { state: { tile: 'rack', is: 'tilting' } } }],
        right: [{ type: 'rail', at: 0.85, era: 'past', lensAt: [0.5, 0.85] }],
      },
      hotspots: [{
        id: 'tag', kind: 'zoom' | 'use' | 'read' | 'pickup',
        rect: [x, y, w, h], era: 'present' | 'past' | 'both',
        to: 'closeup',              // zoom target state (keep w == h for an even zoom)
        card: 'A2', item: 'lens',   // read / pickup
        do: [effects],              // run on click
        requires: cond, once: true, pulseOnce: true,
        zoomRect: [x, y, w, h],     // zoom square, when it differs from the click rect
        tag: { x, y, angle, scale },// draws the paper tag + amber glint for you
                                    // (glintOnly: true = glint, no paper; a glint-only
                                    // or past-era hotspot also gets a pulsing amber
                                    // ring — seen through the lens for 1978 — unless ring: false)
      }],
    },
  },
},
```

**Links.** Adjacent slots link when facing edges share `type` and their `at`
values differ by ≤ 0.03. Edges come from the tile's *current* state (so zoom
level matters) plus any frame it hosts. `era: 'past'` edges count only while
the lens covers their anchor: the edge endpoint, or `lensAt` if given (use one
`lensAt` for both sides of a broken span). `silent: true` suppresses the
mismatch shimmer. `when` gates an edge on any condition.

### Steps, conditions and effects

Steps run in order. The current step fires once its `when` holds, then its
`do` effects run in sequence. `hint` drives the three wordless tiers (`hints.js`):
a pulse at 25 s idle, the ghost hand at 60 s, the Conductor's line from
`hintLines.js` at 120 s; a verb's first appearance is demonstrated after 8 s;
the pause menu's SHOW ME (`nightfall:hint`, or `H`) plays the ghost hand at once.
`hint.ghost` lists the gestures, first applicable wins, each with an optional `when`:
`{ drag: { tile, leftOf|rightOf|above|below|slot } }` (or a list) · `{ click: { tile, hotspot(s) } }` ·
`{ zoomOut: tile }` · `{ frame: { from, to } }` · `{ lens: { tile, u, v } | { tile, hotspot }, click }`.
Without `ghost`, a hotspot hint clicks it and `zoomOut: true` taps the glyph. The pulse keys are:
`{ tile, hotspot }` · `{ tile, hotspots: [ids] }` (first enabled one) ·
`{ tile, edge: { side, at } }` · `{ tile, frame: true }` (the liftable frame) ·
`{ tile, lens: true }` (the lens rim) · `{ actor }` (the actor and the edge it waits at). `skip` lists the
state changes a dev `?step=` jump applies instead of the blocking effects.

Conditions (single-key objects, combinable): `link {a,b,type}` · `state {tile,is}` ·
`overlay {frame,onto,ontoState}` · `hotspot 'tile.id'` · `butchArrived id` /
`arrived id` · `item` / `notItem` · `flag` / `notFlag` · `lensOver {tile,x,y}` ·
`slot {tile,index}` · `above {a,b}` · `leftOf {a,b}` · `actorAt {actor,tile,minX?,maxX?}` · `bell n` · `lens bool` ·
`all [...]` · `any [...]` · `not cond` · `true`.

Effects: `setState {tile,state}` · `setFlag` / `clearFlag` · `giveItem` / `takeItem` ·
`showCard id` (cards: `{stamp,title,lines,strike?,strikeDelay?}`; `strike` is
the line index the Archivist's red pencil crosses out) · `dialogue [{speaker,text}]` (blocks, click to advance) ·
`caption {text,ms}` · `wait ms` · `fx {name,…,ms?}` · `sfx name` · `ringBell` ·
`walkButch {id,path,speed,await}` / `walk {actor,…}` / `playTrain {id,path}` ·
`placeActor {actor,tile,state,x,y,visible,pose,facing,carrying}` · `actorPose` ·
`zoomTo {tile,to,rect}` · `zoomOut tile` · `enableLens {x,y,r}` or `{tile,u,v}` / `disableLens` ·
`returnFrame id` · `unlockDrag` / `lockTile` · `lockInput` / `unlockInput` ·
`grantStone id` · `checkpoint id` · `nextAct id` · `endChapter` · `setSlots [..]` (dev `skip` only).

**Walk paths** are waypoint lists `{ tile, x, y, via?, requires?, pose?, state? }`.
Moving to a waypoint on another tile needs an active link between the two tiles
(of type `via` if given); `requires` makes the actor wait for a condition (e.g.
`lensOver` for Act 3's viaduct); `retreat: {x, y}` backs it off to a safe spot
while the condition fails. A broken link stops the actor at the edge, and
mid-gutter it steps back; it resumes by itself when the link returns.

An open archive card pauses the script (reading is never rushed). `lockInput`
also drops whatever the player is holding.

### The painter `ctx`

`ctx.w/h/era/tileId/stateId/model` · `ctx.paint(key, (c, env) => …)` cached
canvas (tile coords, 28 px bleed; `env.paper`, `env.era`) · `ctx.sprite(key, w, h,
fn, x, y, opts)` · `ctx.glow(x, y, size, {color, alpha, flicker})` ·
`ctx.dust(x, y, w, h)` · `ctx.rain(x, y, w, h)` (off under Reduce Motion) ·
`ctx.fields(x, y, w, h, {world:'fields'|'city'|'memory', speed, crop, zoom, offset})`
painted panorama, drifting · `ctx.image(key, …)` · `ctx.animate((time, dt) => …)` ·
`ctx.flag(name)` · `ctx.item(name)`. `env.images[key]` gives the loaded panorama
chunks (`nsv-w07-0`, `nsv-w01-2`, …) for exact crops — see `crop`/`cropFull` in
`art/act2Art.js`; linked panels must share crop edges so they line up. In `art/ink.js`: `ink`, `inkRect`,
`inkEllipse`, `wood`, `brassFill`, `rivet`, `paperTag`, `amberGlint`, `glow`,
`lightCone`, `paperGrain`, `vignette`, `sepia` (the 1978 grade).

### Custom `fx`

`act.fx[name](api, params)` runs for `{ fx: { name } }`. The api offers
`screen(tile,u,v)`, `topSprite(key,x,y)`, `flash(tile,u,v,opts)`,
`sparkle(x,y)`, `lightRun(points,opts)`, `rig(id)`, `rigPoint(id,lx,ly)`,
`audio.play(name)`, `top` (the overlay container), `scene` (Phaser) and `model`. Built-ins: `fadeAll`,
`pulse`, `drift {rate}` (slows the fields and the rail clack), `shake`.

**Actors** take `scale` and `tint` (e.g. Act 3's far train). **Stone sockets**
(five, bezel bottom) appear once any stone is held and light on `grantStone`.

## Testing

Pure-model tests live in `tests/nightService/`. `helpers.mjs` has `settle()`
(runs waits/walks/dialogue), `availableActions()` and a BFS `solveBfs()` used
for the "no dead ends" proof — add the same tests for each new act. When the
state space is too big for BFS (Act 3: 720 layouts), drive a goal-directed
solver from random states instead (`act3.test.mjs`).

## Dev routes (DEV_MODE only; production ignores them)

`?act=0|0.5|1|2|3`, `?step=<step id>` (alone it finds the act), `?from=act0`
(open the act as if that act just ended, so the wall grows in), `?dtmax=1000`
(real-time steps for slow headless renderers), `N` skips the act.
`window.render_game_to_text()` returns the model state plus screen positions
of slots, enabled hotspots and zoom-out glyphs.
