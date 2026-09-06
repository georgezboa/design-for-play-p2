# Chapter 5 Parallel Directions — Art Asset Completion Ledger

Status: runtime blockout/playable art pass, 2026-08-09
Scope: numbered Door 2 (Chapter 2 / The Borrowed Grid), Door 4 (Chapter 4 / The Painted Country), and shared completion presentation. Echo City is outside this ledger.

## Door 2 — The Borrowed Grid from inside the current

### 2026-08-10 foreground-only theatrical 2D correction — current

- **Locked gameplay boundary:** Door 2 keeps the original three-round grid game, the animated electrical-current player, timed calls, numbered terminals, feed/step-up/delivery loop, round-local retry and cyan round-clear confirmation. The briefly implemented maintenance-worker/four-switch rewrite was rejected and is superseded.
- **Locked background boundary:** the actual first-version Chapter 2 city chunks `world-04-retro-cyberpunk/chunk-00.jpg` through `chunk-02.jpg` are the runtime background. The later v3 `parallax-*-city.png` repaint was mistakenly called “original” and is no longer drawn.
- **Foreground authority:** [`concepts/door2-night-shift-theatrical-2d-v1.png`](concepts/door2-night-shift-theatrical-2d-v1.png) governs only the high-contrast foreground powerway, feed machinery, transformers and terminal housings. It does not authorize changing the player, city background or game structure.
- **Runtime implementation:** `BorrowedGridCurrentScene.js` keeps the v3 current animation and HUD demand feedback but draws the original city chunks. The current `src/assets/generated/door2-foreground-lowpoly-v2/` machine sprites preserve their authored aspect ratios and share a bottom anchor. High nodes use side mounts so machines clear the HUD; lower nodes use short vertical mounts. The rejected repeated structure-sheet assembly is no longer drawn because it duplicated and obscured the playable conductor graph.
- **Palette and projection lock:** strict side/front elevation, near-black and charcoal-violet silhouettes, sparse amber practical light and cyan electrical accents; no isometric angle, glossy kitbash, tiny mechanical detail, texture, gradients or replacement skyline.

### 2026-08-10 elevated-powerway direction and v3 sprite batch — active gameplay base

- **Gameplay/art base:** The v3 batch remains active for the grid-runner and demand icons. Its generated parallax repaint is retained for provenance but no longer drawn. Exact files, dimensions and provenance remain recorded in [`DOOR2_V3_ASSET_PRODUCTION_MANIFEST.md`](DOOR2_V3_ASSET_PRODUCTION_MANIFEST.md).
- **Correction:** “Original background” means the first Chapter 2 cyberpunk city chunks, not the later generated three-layer skyline. Only foreground interactive machinery follows the new low-face-count silhouette reference.
- The v2 environment retains three physically supported service levels, large polygonal piers, simple truss spans, stairs, catenary, a suspended transformer block and tiny human scale. The v2 kit decomposes those shapes into runtime-feasible low-poly modules with a very small material palette.
- **Superseded visual treatment:** [`concepts/door2-elevated-grid-styleframe-v1.png`](concepts/door2-elevated-grid-styleframe-v1.png) and [`concepts/door2-elevated-grid-modular-kit-v1.png`](concepts/door2-elevated-grid-modular-kit-v1.png) remain only as structural studies. Their dense realistic metal, concrete, rust, wetness and engineering detail are rejected.
- All four images are concept-only references generated through the built-in OpenAI image-generation tool after explicit user request. No purchased or third-party source art was used. Runtime geometry, collision and sprites remain unchanged until a separate implementation pass selects and converts the v2 modules.

### Reused and already active

- Three first-version Chapter 2 cyberpunk city chunks.
- Original dark-metal, brass, copper, ceramic, cyan, red and amber material language.
- Original platform/deck modules, insulator posts, relay masts, terminal door and maglev-car silhouettes.
- Rain, district window banks and live/dead conductor states.
- Current playable blockout now has a three-height elevated network, 21 conductor spans, two feed stations, four step-up transformers and six numbered resident terminals. The network physically unfolds in three rounds: 45 seconds with only the route through 01–03; 60 seconds revealing the next section through 04–05; 80 seconds revealing the final line to 06. Unopened nodes, hardware and conductors are absent and non-traversable rather than merely dimmed.

### P0 replacement assets generated and integrated

1. **Grid-runner current animation**: generated as 20 transparent state frames: a normalized 12-frame idle loop plus wire travel, collection, compression, one/two/three-unit carry, outage knockback and completion bloom.
2. **Elevated powerway modular kit**: viaduct piers, steel service decks, maintenance guardrails, crossbeams, suspension hangers, ceramic insulator families and sagging overhead conductor spans. It must support the runtime's lower/middle/upper heights and keep every junction readable while the camera moves.
3. **Two feed-station variants**: West Feed and Central Feed, each with idle, available, collecting and depleted/blocked feedback. Their silhouettes must read as places to collect one unit, not as district delivery points.
4. **Four step-up transformer variants**: A–D cabinets with open copper coils and zero/one/two/three-unit charge feedback. These replace the procedural boxes without changing the four authored node positions.
5. **Six numbered resident-demand terminals**: 01 Lift medicine run, 02 Market cold storage, 03 Clinic treatment floor, 04 Shelter heat bank, 05 Water drinking supply and 06 Kitchen evening meal. Each requires reveal, idle, calling, urgent, served and missed states. The two-digit number must remain the primary wayfinding mark; the short name and distinct silhouette are secondary cues.
6. **Lived-use story strips**: off/on pairs for apartment lift landings, freezer shutters, treatment-room windows, shelter heaters, water-pump indicators and kitchen serving windows. The city-scale payoff must show people benefiting from electricity, not only lamps changing colour.
7. **Timed demand card icon set**: six district icons plus one-, two- and three-unit load marks, warning pulse and missed-call stamp. These stay compact in the top-right queue and must not resemble Museum labels.
8. **Terminal completion vista**: generated as far/middle/near parallax city layers plus six lived-use off/on pairs; completion cascade timing still needs runtime implementation.

### P1 polish

- Wet-surface reflection strips for cyan conductors and maglev traffic.
- Animated bilingual service signage tied to each restored district.
- Dedicated feeder hum, unit pickup, transformer step-up, demand arrival, seven-second warning, delivery, missed call and full-grid success sound set.
- Optional parallax pedestrian/window silhouettes. They should communicate lived use, not become interactable NPCs.

## Door 4 — The Painted Country from inside the drawing

### Reused and already active

- Original warm paper value ramp, deterministic pulp grain, graphite construction lines and overshoot.
- Original folded-plane hills, paper houses, deckle tears, kraft repairs, cyan thread and indigo/book-cloth/verdigris pigments.
- Small resident scale, loose story scraps, torn-floor jumps, bridge/roof/banner repairs and gathering residents.

### P0 replacement assets still required

1. Small resident walk/jump/fall/fold animation in graphite-on-paper style.
2. Two supporting resident age/shape variants and one carrying-table animation.
3. Fold bridge, communal roof and meeting banner as layered paper parts with pencil, half-folded and finished pigment states.
4. Six unique story-scrap illustrations matching the runtime pickup IDs.
5. Subtle ink-rain and paper-wind effect sheets that preserve legibility on the warm ground.

## Shared completion presentation

- Door 2 completion: city-wide cyan light cascade, terminal wake and two-line thematic close.
- Door 4 completion: residents gather, cyan thread brightens, finished structures hold and two-line thematic close.
- Completion presentation must remain inside the playable world for at least three seconds before reporting back to the Museum.
- No full Museum title card should reappear when a direction closes; only a compact click-to-resume prompt is allowed.

## Asset production rule

Do not generate or purchase additional assets automatically. Preserve the current procedural versions as exact scale/layout references. The 2026-08-10 v3 generation batch was explicitly authorized by the user and records its generation path in the production manifest. It does not authorize runtime replacement without a separate integration and live-comparison pass.
