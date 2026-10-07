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
| `hints.js`, `hintLines.js`, `art/hintArt.js` | The wordless hint tiers (when, and which gesture), the Conductor's tier-3 lines, the ghost hand, the unfold's brass pull and tag. |
| `unfold.js` | The player unfolds the wall between acts that `growFrom` each other: fold geometry (which side, the seam, the pull), the layout at any progress, and the drag / spring / snap / keyboard state machine, with the wrong-way give and rebound and the teaching unfold's one demonstration nudge. Pure, tested in `tests/nightService/unfold.test.mjs` and `round6.test.mjs`. |
| `readingView.js`, `art/readingArt.js` | The reading view: a readable's words held up large, in the shape of the paper (ticket, slip, tag, brass label, torn page), following TEXT SIZE. |
| `chips.js` | The engine's short words on screen (a hotspot's verb, why a click did nothing, how to step back, NEED A HINT? [H]): walnut pills with key caps, like the key strip. |
| `art/actNArt.js`, `art/actNFx.js` | Each act's drawings and custom presentation effects. |
| `audio.js` | Synth SFX on the SFX bus, rail ambience, quiet music loop. |

## Authoring an act

```js
import { defineAct } from '../panelModel.js';

export const ACT2 = defineAct({
  id: 'act2', number: 2, title: 'THE LUGGAGE CAR',
  grid: { cols: 2, rows: 2 },            // 3×2 works too; layout is automatic
                                         // (1×1 / 1×2 pass `tile: CARRIAGE_TILE` so the wall can grow,
                                         // and `display: 1.7` to show that tile larger on screen:
                                         // tile coordinates stay the same, the canvases paint at screen res)
  growFrom: { act: 'act0', keep: { desk: 'office' } }, // optional: open folded on the previous act's wall;
                                         // the player drags the brass pull to unfold it (unfold.js)
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
    grip: { rect: [x, y, w, h], hole: [x, y, w, h] }, // where press-and-hold lifts it
                                    // (default: a wide band all round the window; a solid
                                    // `rect` for a window drawn inside the room, Act 3).
                                    // A still hold of 120 ms lifts it, and so does a drag
                                    // that starts on the grip; a drag from the `hole` (the
                                    // picture) still moves the window. Gate `requires` off
                                    // once the frame's job is done so the window drags again.
    tag: { u, v },                  // where HOLD · LIFT THE FRAME hangs (tile-local eyelet):
                                    // shown while lifting is the step's move, until any frame
                                    // has been lifted once in the chapter (hints.js frameTagFor)
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
      plate: '/assets/…/rack-v01.png', // optional painted plate (see below); platePast for the 1978 layer
      readables: [{                 // optional papers whose words matter (see below)
        id: 'slip', rect: [x, y, w, h], era: 'present' | 'past' | 'both', requires: cond,
        reading: { shape, kicker, header, lines, stamp, seal, hole },  // today's words
        past: { … },                // the 1978 words, shown when read through the lens
      }],
      hotspots: [{
        id: 'tag', kind: 'zoom' | 'use' | 'read' | 'pickup',
        verb: 'RING',               // the word by the hand on hover/focus (default USE / TAKE / READ;
                                    // a zoom is "look closer": the magnifier, no word)
        notYet: 'NOT YET',          // what a click says while `requires` still waits for something
        rect: [x, y, w, h], era: 'present' | 'past' | 'both',
        to: 'closeup',              // zoom target state (keep w == h for an even zoom)
        card: 'A2', item: 'lens',   // read / pickup
        do: [effects],              // run on click
        requires: cond, once: true, pulseOnce: true,
        zoomRect: [x, y, w, h],     // zoom square, when it differs from the click rect
        tag: { x, y, angle, scale },// draws the paper tag + amber glint for you
                                    // (glintOnly: true = glint, no paper; a glint-only
                                    // or past-era hotspot also gets a pulsing amber
                                    // ring — seen through the lens for 1978 — unless ring: false;
                                    // ring: true rings any hotspot; text: 'PUNCH THE STUB'
                                    // types the words on the unfold's paper tag). The tag
                                    // itself is clickable too (panelModel tagRect), after
                                    // the thing it hangs from
        quiet: true,                // an answer to a wrong guess (a caption, a pulse):
                                    // never ringed, never what a hint points at
        ringRect: [x, y, w, h],     // ring the thing itself when the click target is larger
      }],
    },
  },
},
```

**Painted plates.** A state (and a frame) may name `plate: '<url>'` (and
`platePast` for its 1978 layer): an illustrated PNG, loaded with the act
(`actPlates` → the scene's preload) and drawn full-tile, cover-fit (centred,
cropped to the tile), under the state's own `draw()`. The painter `ctx`
then has `ctx.plate === true`, so a `draw()` can skip its canvas painting
and add only overlays (glows, dust, rain, live sprites). Linked panels
should share their edge rows so the picture continues across the gutter.
Act logic never changes: swap a PNG in, keep the edges and hotspots.

**Readables.** Papers whose words carry the story (the exhibit's ticket
stub, reservation slip, torn ledger page, Plate IV's label, the case tag)
are `readables`, not hotspots: a click on one (the magnifier and READ on
hover; Tab/Enter reach them too) holds it up in the reading view — a large
copy in the shape of the thing (`shape: 'ticket' | 'slip' | 'tag' | 'plate'
| 'torn' | 'paper'`) with its `lines` (`{ text, font: 'serif'|'mono', size:
'xl'|'l'|'m'|'s', color: 'ink'|'red'|'teal'|'faded', italic }`), an optional
`header` (`{ left, right, band }`), `stamp` (DUPLICATE) and `seal`
('whole' | 'broken'), all in type that follows TEXT SIZE. Through the lens
it shows `past` (with a 1978 badge). The paper stays in its window,
outlined while read; click, E, Enter or Esc puts it back. It holds the
script like an archive card (`s.card.reading`) but never prompts, never
blocks a step, and a hotspot under the same point wins. The effect
`{ read: 'tile.id' }` (or `{ tile, id, past }`) opens one from a script.

**Look closer or act (round 6).** Over a zoom (and a read) the cursor is a
brass magnifier; over anything that acts it is the hand, with the
hotspot's `verb` on a small chip by the pointer (over the keyboard focus:
`[ENTER] RING`). The player's first close-up of the chapter, once it can be
stepped out of, says how by its ⤢ glyph (ESC · RIGHT-CLICK · OR THIS),
once. A click that does nothing says why: NOT YET over a hotspot whose
`requires` still waits; otherwise the window's live tags hop and, the first
three times an act, a word (NOTHING HERE · TRY THE TAGS / · STEP BACK / ·
DRAG THE WINDOW). A click during a scripted beat shows an ellipsis. Three
such ineffective tries within 20 s (dead clicks, a drag on a window that
cannot move, a window put back where it was, a wrong-way pull) offer
NEED A HINT? [H] on the sill, once in the page's life, never after H or
SHOW ME (`hints.js createFlailMeter`).

**Moving and lifting (round 6).** The brass bezel round a window (just
outside its picture, `bezelSlotAt`) moves the window: the open hand on
hover (the window rises a hair), and on press it rises off the wall over
its shadow before it follows the hand; a window that cannot move strains a
few px after the hand, says why (`act.fixedText`), and springs back. A
frame's grip (its painted brass, inside the picture) lifts the frame: the
lift cursor, and only the frame rises off the picture from its own
silhouette. The picture inside a frame still moves the window.

**Dialogue (round 6).** While a line is spoken, the windows dim, the tags
and rings step back, and the caption reads ▸ CONTINUE · CLICK · E: a click
anywhere (or E / Enter) moves the line on, with a ripple where the hand was.

**Keys.** E is Enter everywhere (interact, confirm, advance). Esc is Back:
it steps out of a close-up the player opened (never a view the act started
zoomed in), else the pause menu opens. An act can keep Esc for itself with
`escapeZoomsOut: false` (the Museum exhibit: Esc leaves the case).

**The lens and clicks.** A still click inside the lens acts on the 1978 layer
first (`era: 'past'` / `'both'`); when no 1978 hotspot is under it, the click
falls through to the present hotspot or ⤢ glyph underneath, so the lens never
swallows a click. Moving from a press on the lens drags it; a still hold (250 ms) on
a frame's grip, inside the lens glass, still lifts the frame. The lens centre
is clamped to the board of windows (`model.lensBounds()`), and its rim fades
while a spoken line's caption bar sits under it.

**Links.** Drawn as a thin warm seam of light across the gap at the link
height (a rail is two, a chute two walls) with light pooling on both bezel
lips, and a short light-run when one connects: the pictures are what
connect. Adjacent slots link when facing edges share `type` and their `at`
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
Without `ghost`, a hotspot hint clicks it and `zoomOut: true` taps the glyph. `zoomOutCue: cond`
keeps the tile's ⤢ glyph breathing while the condition holds (`zoomOutTile` names another
window's glyph). `pulseAt: ms` brings that step's first pulse forward until the player acts
(Act 0's first beat: 6 s; the Museum exhibit: 10–15 s). For a lens gesture the ghost hand
takes the lens by its rim, sets it over the target, then reaches in and clicks the target. The ghost hand
takes hold of windows and frames where the lens is not (a press there would move
the lens), and every gesture is proved reachable in `hints.test.mjs`. The pulse keys are:
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
`showCard id` or `{ card, unless: cond }` (cards: `{stamp,title,lines,strike?,strikeDelay?}`; `strike` is
the line index the Archivist's red pencil crosses out) · `dialogue [{speaker,text}]` (blocks, click to advance) ·
`caption {text,ms}` · `wait ms` · `fx {name,…,ms?}` · `sfx name` · `ringBell` ·
`walkButch {id,path,speed,await}` / `walk {actor,…}` / `playTrain {id,path}` ·
`placeActor {actor,tile,state,x,y,visible,pose,facing,carrying}` · `actorPose` ·
`zoomTo {tile,to,rect}` · `zoomOut tile` or `{tile,to}` (step back into a different wide state: the door the key just opened) · `zoomOutAll {tile,gap}` (back out of every level, one at a time) · `read 'tile.id'` (a readable's reading view) ·
`enableLens {x,y,r}` or `{tile,u,v}` / `disableLens` ·
`returnFrame id` · `unlockDrag` / `lockTile` · `lockInput` / `unlockInput` ·
`grantStone id` · `checkpoint id` · `nextAct id` · `endChapter` · `setSlots [..]` (dev `skip` only).

**Walk paths** are waypoint lists `{ tile, x, y, via?, requires?, pose?, state? }`.
Moving to a waypoint on another tile needs an active link between the two tiles
(of type `via` if given); `requires` makes the actor wait for a condition (e.g.
`lensOver` for Act 3's viaduct); `retreat: {x, y}` backs it off to a safe spot
while the condition fails. A broken link stops the actor at the edge, and
mid-gutter it steps back; it resumes by itself when the link returns.
`model.waitingFor(actor)` says why a walker stands still; after ~0.9 s the
scene rings her in amber, she glances back now and then, and when the way on
is one step back out of the next window its ⤢ glyph breathes (hints.js
`waitingWalkers`; trains are cued by the lens and the seams instead).

An open archive card pauses the script (reading is never rushed); after a
moment it says CLICK OR PRESS ENTER TO CLOSE. `lockInput` also drops whatever
the player is holding. A passing caption (`caption`) leaves when a window
zooms, and when a window zooms into a close-up with no `drawPast` under the
lens, the lens slides off it onto a neighbour (its rim also dims over one).

### Frame rate and resume points

Game time follows the wall clock down to ~10 fps: `frameClock.js` caps a
frame at 100 ms and steps the model in ≤ 50 ms slices (Phaser's tweens and
timers already run on real time there). Butch walks at `BUTCH_PACE` (his
actor's `pace`). Each time a step is done and the script waits on the player
again, the scene reports a resume point `{ act, step, slots, lens }`
(`services.onResumePoint`); `nightService-main.js` keeps it in the save
(`markResume`) and Continue reopens the act on that step: the `?step=` skips
rebuild the board, then `model.applyResume` puts the windows and the lens back
(unless that layout would finish the step under the act title). So every
step's `skip` must leave the world that step needs (tested in
`tests/nightService/resume.test.mjs`).

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
(five, below the sill at its right end, above the lens) appear once any stone
is held and light on `grantStone`.

**Keyboard.** The first key a player uses shows the focus (an ivory ring on a
dark outline around the selected window and its focused tag) and a key strip
on the sill listing only the keys that do something now; it hides again on
the next mouse press. Arrows choose a window (its first tag is focused), Tab
cycles every reachable tag on the wall, Enter uses it, Space picks up / puts
down, Backspace steps back (the selected window, else the one that can),
F lifts a frame (likewise), L takes the lens, H is SHOW ME. A key with nothing
to do wobbles the window and blinks the key that would help.

**The unfold, the wrong way.** Pulled the wrong way the pull gives a few
px (ever stiffer, `wrongWayGive`) and the kept windows lean a hair; let go,
it rings back into place (`reboundOffset`) with a soft wooden tock, and the
chevrons light up the right way. The opposite arrow key does the same
(`kick`). The chapter's first (teaching) unfold, left alone ~3 s, draws
itself a short way open the right way once and springs back (`demoNudge`).

**Tier-3 speaker.** The Conductor speaks the hint lines; an act can name its
own `hintSpeaker` (the Museum exhibit: Butch).

## Testing

Pure-model tests live in `tests/nightService/`. `helpers.mjs` has `settle()`
(runs waits/walks/dialogue), `availableActions()` and a BFS `solveBfs()` used
for the "no dead ends" proof — add the same tests for each new act. When the
state space is too big for BFS (Act 3: 720 layouts), drive a goal-directed
solver from random states instead (`act3.test.mjs`).

## Dev routes (DEV_MODE only; production ignores them)

`?act=0|0.5|1|2|3`, `?step=<step id>` (alone it finds the act), `?from=act0`
(open the act as if that act just ended: folded, waiting for the player to unfold it), `?dtmax=1000`
(real-time steps for slow headless renderers), `N` skips the act.
`window.render_game_to_text()` returns the model state plus screen positions
of slots, enabled hotspots and zoom-out glyphs.
