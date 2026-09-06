# CHAPTER 03 // ECHO CITY — Kimi Isometric Rebuild Handoff

Date: 2026-08-05 · Branch: `codex/playable-train-prologue` (shared dirty workspace — **no commits made by this work package**)
Authoritative spec: `docs/CHAPTER_03_KIMI_ISOMETRIC_ECHO_CITY_WORK_PACKAGE.md`
Verdict: **READY FOR GEORGE PLAYTEST**

---

## 1. What this is

Chapter 3 was rebuilt from Qwen's 3600px side-scrolling lane map into a
**fixed-camera, three-quarter isometric (yaw 45° / tilt 55°, orthographic)
point-and-click city-block behaviour-orchestration puzzle**. The world is one
loopable civic block organised around the central station clock — not a
left-to-right corridor. Full 7–10 minute flow:

```
TRAIN THRESHOLD → watch courier demo → LIVING MARKET (observe courier-loop,
transplant to waiting group → shutters open) → TRANSIT INTERSECTION
(observe bus-service + crosswalk-signal, plant both → barrier cycles open,
crowd covers the crossing) → surveillance field dash → SILENT FOUNTAIN
(record your own cycle: ≥2 legs + ring the bell) → echo replays it →
witness pad → share with Mara → REUNION → complete
```

Camera never follows the player down a corridor; it cuts between seven
authored framing beats (entry / block / market / transit / fountain /
breather / reunion), each numerically solved to keep the clock head on
screen (`EchoCityIsoScene.js CAMERA_BEATS`).

## 2. Qwen carry-over vs replacement

**Preserved (Qwen logic, reused verbatim or by reference):**
- `BehaviorCycle` / `cycleStepAt` / ECHO_CYCLES semantics — the iso model
  imports Qwen's cycle definitions from `echoCityModel.js`.
- Receiver compatibility, install/release, reset, and event vocabulary.
- The old lane-based model/scene/art + their regression tests still run
  green (28 tests) and are kept for reference, now headed `SUPERSEDED`.

**Replaced:**
- `echoCityModel.js` → `echoCityIsoModel.js` (31-node waypoint graph +
  Dijkstra routing around the block, district detection, camera-beat
  selection, same cycle/receiver core).
- `EchoCityScene.js` → `EchoCityIsoScene.js` (pointer grammar: click=walk,
  hover=focus, hold=observe, click receiver=transplant, right-click/Esc=
  release, E=context action, R=reset, WASD=nudge along graph edges).
- `echoCityArt.js` → `echoCityIsoArt.js` + Blender-baked layers (Gate 5).
- `car03.html` HUD copy rewritten for the new controls; `canvas {outline:none}`.
- `src/car03-main.js` now boots `EchoCityIsoScene.js` only.

## 3. Files changed / created by this work package

Runtime (allowed set only):
- `car03.html` (HUD + CSS)
- `src/car03-main.js` (scene wiring)
- `src/cars/presentCity/echoCityIsoModel.js` **new**
- `src/cars/presentCity/EchoCityIsoScene.js` **new**
- `src/cars/presentCity/echoCityIsoArt.js` **new**
- `src/cars/presentCity/car03Audio.js` (ECHO CITY event vocabulary + ambient bed)
- `src/cars/presentCity/echoCityModel.js` / `EchoCityScene.js` / `echoCityArt.js`
  (header-only: marked SUPERSEDED, no logic change)
- `src/cars/presentCity/assets-iso/` **new** — 6 baked WebP layers + masks
  layer (baked, not shipped), `crowd_atlas.webp` (24×8 tiles), `layers_camera.json`,
  `ASSET_MANIFEST.json` — **0.48 MB total** (budget 12 MB)
- `tests/car03/echoCityIso-behavior.test.mjs` **new**

Evidence + tooling:
- `outputs/chapter03-kimi-isometric/` — screenshots `01-…-11-*.png`,
  `natural-playthrough.jsonl`, `natural-playthrough-2.jsonl`,
  `console-errors.txt` (0 entries), `ASSET_MANIFEST.json` copy,
  `GATE0_PRESERVE_AND_MAP.md`, `gate1-proof-0*.png`,
  `driver/playthrough.py`, `driver/gate6.py`, `driver/negative-control.jsonl`,
  `driver/early-release.jsonl`, `driver/flag-checkpoint.jsonl`
- Offline pipeline: `open-source-assets/car03-2p5d/work/echo-city-isometric/`
  (`blender/build_blockout.py`, `build_layers.py`, `bake_crowd.py`,
  `calibrate.py`, `assemble_assets.py` + all renders)

**Chapter 5 / car04: zero files touched.** Other agents' pre-existing dirty
state (docs/CHAPTER_06*, tutorial files, car04/chapter05 untracked work) was
left exactly as found. Nothing was committed, pushed, reset, or stashed.

## 4. Asset pipeline (Gate 5)

- Locked camera yaw 45° / tilt 55° ortho. **Calibration finding:** Blender
  `ortho_scale` spans the *larger* image dimension — layer ppm = 1920/ortho_scale
  at 1920×1200; crowd ppm = 160/2.5 = 64 px/unit at 128×160. Verified by
  two-point calibration renders (`blender/calibrate.py`).
- 7 layers rendered object-by-object with `hide_render`; dynamic/state parts
  (clock, courier, crowd, gate bars, barrier arm, bus, train, actors) were
  **excluded from baking** and stay procedural.
- Crowd = Quaternius UAL-1 mannequin (CC0), 3 actions (Idle/Walk/Interact)
  × 8 facing dirs × 8 frames, per-frame bbox-centred, foot-anchored at
  tile bottom −6px, flat warm base colour for runtime tinting
  (commuters grey-lavender, post-alarm echo amber α0.55).
- Base Characters were staged but **not shipped** — per the work package they
  may only stand in for crowd/proportion; the UAL mannequin covers crowd.
  **Butch, Mara, courier and the player-echo remain procedural capsule
  placeholders, deliberately replaceable** by the human contributor's final
  characters (`drawActor` in `echoCityIsoArt.js` is the single slot).
- Sources are Quaternius Downtown + UAL-1, both CC0 1.0; licence file at
  `open-source-assets/car03-2p5d/work/echo-city-isometric/src/anim/License.txt`.
  Full per-asset camera/anchor/pivot data: `src/cars/presentCity/assets-iso/ASSET_MANIFEST.json`.

## 5. Verification

- `node --test tests/car03/*.test.mjs` → **75/75 pass** (28 Qwen legacy +
  47 iso). Build: `npx vite build --config vite.car03.config.js` → OK.
- **Two complete natural-input browser playthroughs** (real DOM
  MouseEvent/KeyboardEvent; no state mutation): `natural-playthrough.jsonl`
  (with screenshots 01–09) and `natural-playthrough-2.jsonl`, both ending
  `obj=REUNION, complete=true`.
- Screenshots (native 2174×1770, reviewed): `01` entry, `02` market observed,
  `03` transplant+gate, `04` wrong-mapping twitch, `05` both cycles running,
  `06` clock breather, `07` recording, `08` echo replay, `09` reunion,
  `10` post-reset baseline, `11` flag/checkpoint, `layout-1280x720.png`.
- Adversarial (`driver/gate6.py`, all passing):
  - 10× in-browser R reset → exact entry state every time;
  - negative control: 30 walk-only clicks → objective never advances, no cycle;
  - early release mid-observation → `observation-aborted`, nothing copied;
  - unprotected field dash → flag + freeze + `checkpoint-return` to the
    transit checkpoint (`flag-checkpoint.jsonl`);
  - console/page errors captured across a full run: **0**;
  - 1280×720 layout via CDP metrics override → canvas/HUD intact.

## 6. How to run / reproduce

```bash
npx vite build --config vite.car03.config.js
npx vite preview --config vite.car03.config.js --port 5180 --strictPort
# open http://localhost:5180/car03.html
node --test tests/car03/*.test.mjs
# natural-input replay (needs Kimi WebBridge session "car03-iso-playtest"):
python3 outputs/chapter03-kimi-isometric/driver/playthrough.py myrun --shots 01,02,03,04,05,06,07,08,09
```

## 7. Known limitations (accepted, declared)

- **Butch / Mara / courier / player-echo are capsule placeholders.** Crowd
  uses the baked atlas; final hero characters are the human contributor's slot.
- **Background-tab throttling:** the browser freezes RAF/timers when the tab
  is hidden, so the driver steps `game.loop.step(+16.67ms)` manually — this is
  the exact engine step RAF would run, not a QA state mutation. In a
  foreground tab the game runs on its own RAF.
- **E is contextual:** standing on an installed receiver and pressing E
  *releases* its cycle (by design); observe is mouse-hold or E on a source.
- **Barrier window:** a move order through the transit crossing can be
  rejected while the barrier is closed; clicking again when it opens is the
  intended player behaviour (driver does the same).
- **Depth trade-off:** baked props sit on fixed layers, so actors always draw
  over stall/fountain props even when passing "behind" them — accepted 2.5D
  layering, no gameplay impact.
- `layer_masks.webp` is baked but intentionally not shipped (relationship
  masks are state-driven and stay procedural); retained for future art passes.
- `vite build` warns about >500 kB chunks (pre-existing Phaser bundle size,
  not a regression).
