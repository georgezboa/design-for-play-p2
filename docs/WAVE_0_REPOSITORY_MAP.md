# Wave 0 Repository Map — Prologue Phase II–VI

**Status:** Read-only mapping complete. No files modified.
**Scope:** `src/` and the six Prologue timetable stages as they exist in the working tree on 2026-08-01.
**Important framing:** The current tree is **not a single implemented design** — it is a stack of partially-removed pilots. The Design Lock in `docs/PROLOGUE_II_VI_KIMI_CLUSTER_EXECUTION_PLAN.md` calls for a fifth new scheme, but the code still carries the second, third, and fourth schemes simultaneously. This report treats each layer as a real runtime path, not as a cleaned-up design statement.

---

## 1. Executive Summary

The running Prologue has six stages authored in `src/level.js:33-218`. Today:

- **Phase I / PUNCH THE DOOR** (`junction-1`, x 0–790) and **Phase II / CONTACT** (`junction-2`, x 800–1590) still run the original ordered-queue timetable path.
- **Phase III / AIR LOCK** (`junction-3`, x 1600–2390) has been switched to a new pure-logic state machine in `src/tutorial/airLock.js`. The rotating-drum pilot (`src/tutorial/drum.js`) is still imported and branched inside `TimetablePuzzle.js`, but `level.js` no longer assigns a `drum` block to any stage, so the drum code is **dead at runtime** unless someone re-adds the field.
- **Phases IV–VI** (`junction-4` through `junction-6`) are still the **old physical-sequence / pressure-hold / echo-gate** build, exactly the build the Design Lock says to replace. The documents `docs/III_VI_IMPLEMENTATION_SPEC.md` and `docs/MDA_REDESIGN_III_VI.md` describe a replacement that is **not yet implemented**.

The most consequential inconsistencies between documents and running code are:

1. `manualWindowMs: 3500` is still live on `junction-4` (`src/level.js:135`), and the whole `beginManualWindow / updateManualHeat / performManualAction` branch still executes. The Design Lock says IV must become a spatial weight-transfer problem, not a hidden timer.
2. Phase V still uses a 30–62 pressure band and `pressureHintCommand()` gold highlighting (`src/tutorial/TimetablePuzzle.js:3077-3085`), which the audit says removes the need to read the machine.
3. Phase VI still uses the fixed `command: 'brake' / 'vent' / 'couple'` gate map (`src/level.js:188-210`) with `blockedHint` / `clearedHint` strings, which the Design Lock says must be replaced by a real recorded echo.
4. `src/tutorial/drum.js` is imported but has no stage consumer; its helper functions (`ensureDrumState`, `causalBlocker`, etc.) are wired into `TimetablePuzzle.js` but unreachable.

**Chief verification correction:** `createAirLock(stage.airLock)` appears to pass the Phase III tuning block into the state machine (`src/tutorial/TimetablePuzzle.js:2730`), but `createAirLock(config)` immediately discards that argument with `void config` (`src/tutorial/airLock.js:44-45`). Runtime rates and thresholds come from the separate `AIR_LOCK_TUNING` constant, and several visual/integration checks import that constant directly. Phase III therefore has two apparent tuning sources, only one of which is live. Wave 2 must collapse this to one authoritative configuration and add a regression test proving the displayed threshold and logic threshold are identical.

Because this is a mapping report, no code was changed. The remainder of the report gives file/line evidence for every major call site, field, and QA route.

---

## 2. Runtime Call Graph by Phase

### Phase I / PUNCH THE DOOR (stage 0)

| Concern | Entry point | File / line |
|---|---|---|
| Stage data | `LEVEL.tutorialPuzzle.stages[0]` | `src/level.js:33-48` |
| Interactable creation | `buildInteractables()` flatMap, kind `timetable-command` + `timetable-run` | `src/level.js:301-355` |
| `canInteract` | `TimetablePuzzle.canInteract()` | `src/tutorial/TimetablePuzzle.js:918-981` |
| Prompt | `promptFor()` kind `timetable-command` / `timetable-run` | `src/tutorial/TimetablePuzzle.js:994-1024` |
| Interaction | `handleInteraction()` → `punch()` / `run()` | `src/tutorial/TimetablePuzzle.js:1029-1052` |
| State init | `GameScene.create()` `tutorialPuzzle` defaults | `src/scenes/GameScene.js:55-100` |
| Per-frame update | `GameScene.update()` → `TimetablePuzzle.update()` | `src/scenes/GameScene.js:2727` |
| Success | `run()` → `completeStage()` | `src/tutorial/TimetablePuzzle.js:1451, 2487` |
| Failure | none — one command, autoRun | — |
| Reset | `failStage()` / `completeStage()` reset `queue` | `src/tutorial/TimetablePuzzle.js:2477, 2536` |
| Visual refresh | `TimetablePuzzle.refresh()` | `src/tutorial/TimetablePuzzle.js:3092` |
| Door/gate open | `GameScene.playTutorialGateOpen()` | `src/scenes/GameScene.js:1855` |
| `render_game_to_text` | `window.render_game_to_text()` | `src/main.js:49-204` |

### Phase II / CONTACT (stage 1)

| Concern | Entry point | File / line |
|---|---|---|
| Stage data | `LEVEL.tutorialPuzzle.stages[1]` | `src/level.js:50-62` |
| `guideSequence` pre-check | `punch()` rejects wrong order | `src/tutorial/TimetablePuzzle.js:1069-1082` |
| Prompt / objective | `updateObjective()` shows “FIRST: BRAKE / THEN: POWER” | `src/tutorial/TimetablePuzzle.js:2997` |
| Success | `run()` queue matches `solution` → `completeStage()` | `src/tutorial/TimetablePuzzle.js:1448-1452` |
| Failure | `failStage()` (only reachable if queue is wrong length/order) | `src/tutorial/TimetablePuzzle.js:1491, 2461` |
| Visual machinery | `buildMachinery()` contact shoe / bridge | `src/tutorial/TimetablePuzzle.js:794-818` |
| `applyAction('brake')` / `applyAction('power')` | `run()` delayedCall chain | `src/tutorial/TimetablePuzzle.js:1464-1477` |

### Phase III / AIR LOCK (stage 2) — current running path

| Concern | Entry point | File / line |
|---|---|---|
| Stage data | `LEVEL.tutorialPuzzle.stages[2]` with `airLock` block | `src/level.js:64-116` |
| Interactables | kind `air-lock`, commands `brake/vent/door` | `src/level.js:313-317, 334-335` |
| Air-lock state machine | `createAirLock()` | `src/tutorial/airLock.js:44-124` |
| `canInteract` gate | `canInteract()` returns `Boolean(stage.airLock)` for air-lock kind | `src/tutorial/TimetablePuzzle.js:950` |
| Prompts | `promptFor()` reads `stage.prompts` | `src/tutorial/TimetablePuzzle.js:999-1022` |
| Interaction | `handleInteraction()` → `operateAirLock()` | `src/tutorial/TimetablePuzzle.js:1039-1041, 2891-2951` |
| Per-frame update | `TimetablePuzzle.updateAirLockStage()` | `src/tutorial/TimetablePuzzle.js:2736-2788` |
| Visual refresh | `refreshAirLockVisuals()` | `src/tutorial/TimetablePuzzle.js:2793-2841` |
| Success | `operateAirLock('door')` → `lock.tryLatch()` → `completeStage({ pendingActions: ['door'] })` | `src/tutorial/airLock.js:106-117; src/tutorial/TimetablePuzzle.js:2923-2929` |
| Failure | `lock.tryLatch()` sets `failReason` | `src/tutorial/airLock.js:107, 115; src/tutorial/TimetablePuzzle.js:2936-2948` |
| Reset | `airLock.reset()` is not called by stage reset; new `createAirLock()` replaces state in `ensureAirLockState()` | `src/tutorial/TimetablePuzzle.js:2727-2732` |

### Phase III / AIR LOCK — dead drum branches

The drum path is still present but unreachable because no stage has `drum`:

| Concern | Branch | File / line |
|---|---|---|
| `stage.drum` check | `if (stage.drum)` everywhere | e.g. `src/tutorial/TimetablePuzzle.js:1058, 1431, 1497, 1821, etc.` |
| Drum helpers | `src/tutorial/drum.js` exports | `src/tutorial/drum.js:44-132` |
| Drum QA routes | `setupQA()` cases `timetable-3-fail/auto/reset/duplicate/sparse` | `src/tutorial/TimetablePuzzle.js:3458-3523` |

### Phase IV / WEIGHT TRANSFER (stage 3)

| Concern | Entry point | File / line |
|---|---|---|
| Stage data | `junction-4` with `manualWindowMs: 3500` | `src/level.js:118-138` |
| Interactables | `timetable-command` + `timetable-run` + `timetable-manual` | `src/level.js:318, 357-364` |
| Window start | `run()` sequence correct → `beginManualWindow()` | `src/tutorial/TimetablePuzzle.js:1488, 1922-1938` |
| Heat visual | `updateManualHeat()` | `src/tutorial/TimetablePuzzle.js:1947-1992` |
| Manual action | `performManualAction()` | `src/tutorial/TimetablePuzzle.js:2010-2029` |
| Timeout failure | `update()` past `manualUntil` → `failStage()` | `src/tutorial/TimetablePuzzle.js:2717-2722` |
| Reset | `coolManualHeat()` + `resetMachinery()` | `src/tutorial/TimetablePuzzle.js:1996-2008, 2569-2596` |

### Phase V / READ THE BOGIE (stage 4)

| Concern | Entry point | File / line |
|---|---|---|
| Stage data | `junction-5` with `pressureHold` block | `src/level.js:140-169` |
| Interactables | kind `rail-control`, commands `brake/vent/power` | `src/level.js:319, 334` |
| Pressure update | `updatePressure()` every frame | `src/tutorial/TimetablePuzzle.js:2609-2672` |
| Interaction | `operateRailControl()` → `operatePressureControl()` | `src/tutorial/TimetablePuzzle.js:1108-1116, 1184-1253` |
| Hint / gold highlight | `pressureHintCommand()` | `src/tutorial/TimetablePuzzle.js:3077-3085` |
| Success | POWER in band → `completeStage({ pendingActions: ['power'] })` | `src/tutorial/TimetablePuzzle.js:1238-1252` |

### Phase VI / PAST HOLDS THE VALVE (stage 5)

| Concern | Entry point | File / line |
|---|---|---|
| Stage data | `junction-6` with `echoGates` | `src/level.js:171-217` |
| Echo start | `update()` approach phase → `advanceEchoToGate(5, 0)` | `src/tutorial/TimetablePuzzle.js:2689-2690` |
| Gate clear | `operateEchoGate()` | `src/tutorial/TimetablePuzzle.js:1117-1119, 1261-1289` |
| Echo travel | `advanceEchoToGate()` tween | `src/tutorial/TimetablePuzzle.js:1297-1369` |
| Success | Echo reaches valve → `completeStage({ pendingActions: ['couple'] })` | `src/tutorial/TimetablePuzzle.js:1351-1365` |
| Failure | No failure state — echo waits forever | `src/tutorial/TimetablePuzzle.js:1342-1346` |

### `render_game_to_text` / QA state output

- Defined in `src/main.js:49-204`.
- Exposes `timetablePuzzle` subtree with `airLock`, `pressure`, `echoGateIndex`, `echoGatesCleared`, `echoAtValve`, `pressureBand`, etc.
- `airLock` snapshot is built from `scene.tutorialPuzzle.airLock` getters at `src/main.js:105-120`.

---

## 3. Field Read/Write Matrix

### `guideSequence`

- **Write:** `src/level.js:59` (stage 1 only).
- **Read:** `src/tutorial/TimetablePuzzle.js:313` (build guide label), `1069-1080` (punch pre-rejection), `2997` (objective text), `3279-3282` (sprite tint).
- **Runtime effect:** Phase II rejects wrong-first punches and shows “FIRST: BRAKE / THEN: POWER”.
- **Design Lock conflict:** The Design Lock says Phase II must become a visible interlock (door latch → copper trace → power contactor) and must not show FIRST/THEN or pre-reject. This field is the old branch.

### `solution`

- **Write:** every stage in `src/level.js:42, 58, 78, 126, 148, 179`.
- **Read:** ~50 sites across `TimetablePuzzle.js` and `main.js`; key consumers are `run()` correctness checks (`src/tutorial/TimetablePuzzle.js:1448-1450, 1472-1473, 1486-1487`), completion art (`tutorialTrainRoomsArt.js:238-253`), `refresh()` queue display, `updateObjective()`, and `completeStage()` pending actions.
- **Runtime effect:** Still the single source of truth for completion.
- **Note:** For Phase III, `solution` is explicitly documented as decorative-only (`src/level.js:73-77`) because completion is gated by `airLock.solved`.

### `airLock`

- **Write:** `src/level.js:79-106` (stage 2 config).
- **Read:** `src/tutorial/TimetablePuzzle.js:950, 1001-1002, 2729-2730, 2736-2788, 2793-2841, 2893-2948`; `src/tutorial/airLock.js` consumes the rates/threshold.
- **Runtime effect:** Drives Phase III logic entirely.

### `manualWindowMs` / `manualUntil`

- **`manualWindowMs` write:** `src/level.js:135` (stage 3, value 3500).
- **`manualWindowMs` read:** `src/tutorial/TimetablePuzzle.js:1952` (guard in `updateManualHeat`), plus comment references.
- **`manualUntil` write:** `src/tutorial/TimetablePuzzle.js:1927`.
- **`manualUntil` read:** `src/tutorial/TimetablePuzzle.js:1954, 2014, 2713, 2717`.
- **Runtime effect:** Phase IV hidden 3.5 s window still runs.
- **Design Lock conflict:** Direct violation — IV must delete `manualWindowMs`.

### `pressureHold`

- **Write:** `src/level.js:157-168` (stage 4).
- **Read:** `src/tutorial/TimetablePuzzle.js:1113, 1188, 1238-1239, 2613-2672, 3044-3054, 3077-3085`.
- **Runtime effect:** Drives Phase V pressure simulation and hints.

### `pressureHintCommand`

- This is a method, not a data field, but it is the live implementation of the old “gold highlight”.
- **Definition:** `src/tutorial/TimetablePuzzle.js:3077-3085`.
- **Callers:** `updatePressure()` line 2667 and `refresh()` rail-control tint line 3290-3294.
- **Design Lock conflict:** The spec wants the player to read the gauge/rotor, not a highlight.

### `echoGates` / `echoGateIndex` / `echoGatesCleared`

- **`echoGates` write:** `src/level.js:188-210`.
- **`echoGates` read:** `src/tutorial/TimetablePuzzle.js:965-968, 1117-1119, 1266-1289, 1302-1369`.
- **`echoGateIndex` write:** `src/scenes/GameScene.js:97`; read/write in `advanceEchoToGate()` `src/tutorial/TimetablePuzzle.js:1307`; reset in `completeStage()` `src/tutorial/TimetablePuzzle.js:2547`.
- **`echoGatesCleared` write:** `src/scenes/GameScene.js:98`; read/append in `operateEchoGate()` `src/tutorial/TimetablePuzzle.js:1279`; reset in `completeStage()` `src/tutorial/TimetablePuzzle.js:2548`.
- **Runtime effect:** Phase VI fixed gate sequence.

### `physicalSequence`

- **Write:** `src/level.js:152, 215`.
- **Read:** `src/tutorial/TimetablePuzzle.js:350, 952, 830-864, 1121-1176, 3055-3059, 3284-3301`.
- **Runtime effect:** Switches Phases V and VI from queue mode to direct `rail-control` mode.

### `underfloor`

- **Write:** `src/level.js:150, 213`.
- **Read:** `src/tutorial/TimetablePuzzle.js:602, 608, 677-678, 741-786, 797`; `src/scenes/GameScene.js:1100, 2037-2098, etc.`; `src/art/tutorialTrainRoomsArt.js:153, 175`.
- **Runtime effect:** Changes camera deadzone, machinery Y, and art.

### `lesson` / `guidance`

- **`lesson` write:** `src/level.js:47, 61, 72, 137, 149, 212`.
- **`lesson` read:** effectively **none** in `src/` at runtime. It appears only in comments and in `render_game_to_text` only indirectly via `stageId`. `objectiveText()` does not read `lesson`.
- **`guidance` write:** `src/level.js:46, 60, 71, 136, 153, 216`.
- **`guidance` read:** `src/tutorial/TimetablePuzzle.js:921` (phase gating uses `puzzle.phase`, not `guidance` directly), and `refresh()` uses `stage.guideSequence`, not `guidance`. The `guidance` string itself is **not consumed** by code.
- **Audit note:** This matches the Research Audit finding that `lesson` and `guidance` are declared but unread.

### Old `drum` fields

- `drumKey`, `drumMachine`, `puzzle.drum`, `drum.waiting`, `drum.slots`, `DRUM_KEYS`, `DRUM_HOLD_GRACE_MS`.
- **State:** All still exist in `src/tutorial/TimetablePuzzle.js` and `src/tutorial/drum.js`, but no stage has `drum: {...}` in `src/level.js`. Therefore they are **written by helper code but never reached from the active level data**.
- Exception: `puzzle.drum` is initialized/reset in `setupQA()` (`src/tutorial/TimetablePuzzle.js:3407-3409`) and `completeStage()` (`src/tutorial/TimetablePuzzle.js:2533`), but remains null because `ensureDrumState()` returns null when `stage.drum` is absent.

### `windowAchieved`

- Air-lock internal field.
- **Write:** `src/tutorial/airLock.js:79`.
- **Read:** `src/tutorial/airLock.js:115, 144`; `src/main.js:117`.

### `failReason`

- Air-lock internal field.
- **Write:** `src/tutorial/airLock.js:107, 115`.
- **Read:** `src/tutorial/airLock.js:53, 143`; `src/main.js:115`; `src/tutorial/TimetablePuzzle.js:1016, 2936-2948, 3039-3041`.

### `pressureSettled` / `pressureBraked` / `pressureVenting`

- **Write:** `src/scenes/GameScene.js:93-95` (init); `src/tutorial/TimetablePuzzle.js:1192-1197, 1210, 1238-1239, 2543-2545, 2626-2627, 3397-3399`.
- **Read:** Many sites; drives Phase V completion and `render_game_to_text`.

### `latchEngaged` / `braked`

- Air-lock getters; see airLock.js.

---

## 4. Legacy Branches Still Live

### Phase II — FIRST/THEN guide and pre-rejection

- `stage.guideSequence` at `src/level.js:59`.
- Pre-rejects wrong punch: `src/tutorial/TimetablePuzzle.js:1069-1082`.
- Objective text names order: `src/tutorial/TimetablePuzzle.js:2997`.
- Guide label rendered on rack: `src/tutorial/TimetablePuzzle.js:313-333`.
- **Design Lock says:** delete this; replace with visible copper interlock trace.

### Phase III — old drum branches (unreachable but present)

- `if (stage.drum)` guards in `punch()`, `run()`, `drumMachine()`, `update()`, `refresh()`, `setupQA()`.
- `src/tutorial/drum.js` still imported at `src/tutorial/TimetablePuzzle.js:5-14`.
- If someone re-adds `drum` to a stage, the old 6-slot / 3-slot drum would run immediately. The current `drum.js` code has 3 slots hard-coded in some paths but references `stage.drum.slots` generically.

### Phase IV — `manualWindowMs: 3500`

- Defined at `src/level.js:135`.
- Executed via `beginManualWindow()` (`src/tutorial/TimetablePuzzle.js:1922`), `updateManualHeat()` (`src/tutorial/TimetablePuzzle.js:1947`), and timeout failure (`src/tutorial/TimetablePuzzle.js:2717`).
- `manualX: 3150` at `src/level.js:134`.
- **Design Lock says:** delete this entire branch; IV becomes trolley/weight-transfer.

### Phase V — 30–62 pressure band and text hints

- `pressureHold.bandLow: 30, bandHigh: 62` at `src/level.js:159-160`.
- `pressureHintCommand()` at `src/tutorial/TimetablePuzzle.js:3077` still highlights the next expected control in gold (`src/tutorial/TimetablePuzzle.js:3290-3294`).
- Failure toasts tell the player which direction to correct: `src/tutorial/TimetablePuzzle.js:1229-1232`.
- **Design Lock says:** V becomes bogie diagnosis (compare healthy vs. faulty bogie), not pressure-band maintenance.

### Phase VI — fixed `gate.command` and infinite waiting

- `echoGates` array with `command: 'brake'/'vent'/'couple'` at `src/level.js:188-210`.
- `blockedHint` / `clearedHint` strings emitted as toasts at `src/tutorial/TimetablePuzzle.js:1273, 1288, 1345`.
- Echo waits indefinitely at each gate: `src/tutorial/TimetablePuzzle.js:1342-1346`.
- **Design Lock says:** replace fixed gates with replay of Phase IV trolley trace; no infinite waits; no hint strings.

### `FAIL_LINES`

- Defined `src/tutorial/TimetablePuzzle.js:79-86`; only index 3 (Phase IV) is non-null.
- Read in `failStage()` `src/tutorial/TimetablePuzzle.js:2474`.
- Indices 0,1,2,4,5 are `null` as intended.

---

## 5. QA Route Audit

QA is driven by `?qa=...` URL parameter. The handlers are split:

- `TimetablePuzzle.setupQA()` handles `timetable-*`, `tutorial-exit`, `chapter-card`, `departure-moving` (`src/tutorial/TimetablePuzzle.js:3351-3567`).
- `GameScene.setupTutorialQA()` handles legacy echo-puzzle routes (`src/scenes/GameScene.js:1249-1342`).

### Phase II routes

| Route | Action | State |
|---|---|---|
| `?qa=timetable-1-auto` | punches DOOR, auto-runs | likely works |
| `?qa=timetable-1-enter` | punches DOOR, waits, warps to stage 2 | likely works |
| `?qa=timetable-2-wrong` | punches POWER first | works: pre-rejected |
| `?qa=timetable-2-brake` / `timetable-2-auto` | punches BRAKE, then POWER/run | works |

### Phase III routes

| Route | Action | State |
|---|---|---|
| `?qa=timetable-3-layout` | warps player to x=2110 (vent) | still works as a spawn, but no longer exercises drum layout |
| `?qa=timetable-3-fail` | punches `door/vent/brake` then `run` | **broken** — stage 2 no longer has `timetable-command` / `timetable-run`; `punch()` will queue commands but they will not operate the air-lock machines |
| `?qa=timetable-3-auto` | punches solution then runs | **broken** for same reason |
| `?qa=timetable-3-reset` | punches BRAKE/VENT, runs, then RESET | **broken** — RESET interactable no longer exists for stage 2 |
| `?qa=timetable-3-duplicate` | two BRAKE cards | **broken** — no drum |
| `?qa=timetable-3-sparse` | three punches | **broken** — no drum |
| `?qa=timetable-6-cab` | warps to final stage cab | spawn-only, still works |

### Phase IV routes

| Route | Action | State |
|---|---|---|
| `?qa=timetable-manual-*` (`auto`, `auto`, etc.) | sets queue, runs, then performs manual action | still executes the old `manualWindowMs` path |
| These routes assume the old queue + manual branch; they will become invalid when IV is replaced by weight transfer. |

### Phase V routes

| Route | Action | State |
|---|---|---|
| `?qa=timetable-5-auto` | BRAKE, VENT, POWER | works against old pressureHold |
| `?qa=timetable-5-cinematic` | delayed BRAKE/VENT/POWER | works |
| `?qa=timetable-5-wrong` | repeated POWER | works |

### Phase VI routes

| Route | Action | State |
|---|---|---|
| `?qa=timetable-6-auto` | BRAKE, VENT, COUPLE | works against old echoGates |
| `?qa=timetable-6-window` / `timetable-6-miss` | partial BRAKE only | works |
| `?qa=tutorial-exit` | starts at final stage, auto-clears | works |

### Cross-stage / departure routes

| Route | Action | State |
|---|---|---|
| `?qa=chapter-card` | shows chapter card | works |
| `?qa=departure-moving` | sets departure scroll | works |

### Missing / needed routes

- No QA route exists for the new air-lock III completion, failure, or reset.
- No route exists for Phase IV weight-transfer once implemented.
- No route exists for Phase V bogie diagnosis.
- No route exists for Phase VI recorded-echo replay.
- `render_game_to_text` does not expose trolley trace samples because no trace is recorded yet.

---

## 6. Recommended File Ownership

| File / scope | Recommended owner | Rationale |
|---|---|---|
| `src/tutorial/TimetablePuzzle.js` | `integration-owner` | Central puzzle hub; touches every phase. |
| `src/level.js` | `integration-owner` | Stage data; one-field changes alter multiple phases. |
| `src/scenes/GameScene.js` | `integration-owner` | Camera, gates, input, world transitions, QA wiring. |
| `src/tutorial/phases/contactInterlock.js` (new) | `phase-ii-logic-owner` | Wave 2 pure-logic module for Phase II. |
| `src/tutorial/phases/localPneumaticDoor.js` (new) | `phase-iii-logic-owner` | Wave 2 module; likely starts from `airLock.js`. |
| `src/tutorial/phases/weightTransfer.js` (new) | `phase-iv-logic-owner` | Wave 2 module; replaces manual window. |
| `src/tutorial/phases/bogieDiagnosis.js` (new) | `phase-v-logic-owner` | Wave 2 module; replaces pressureHold. |
| `src/tutorial/phases/recordedEcho.js` (new) | `phase-vi-logic-owner` | Wave 2 module; replaces echoGates. |
| `src/tutorial/airLock.js` | `phase-iii-logic-owner` | Already isolated pure logic; keep or fold into `localPneumaticDoor.js`. |
| `src/tutorial/drum.js` | candidate for deletion | No consumer; should be removed once Wave 2 architecture lands. |
| `src/art/tutorialTrainRoomsArt.js` | `visual-hierarchy-owner` / shared art owner | World-space room shells, undercarriage, bogie art. |
| `src/art/tutorialCarArt.js` | not used by current scrolling Prologue | Currently `setVisible(false)` in GameScene; do not modify for Prologue work. |
| `src/main.js` | `qa-owner` / `integration-owner` | `render_game_to_text` contract must follow each phase. |
| QA / tests | `qa-owner` | Must create routes for new phases and remove obsolete drum/manual routes. |

### Cross-dependencies that cannot be parallelized

1. `TimetablePuzzle.js` must keep its public API (`enter`, `update`, `interact`, `reset`, `snapshot`, `isComplete`, `destroy`) stable while logic modules are swapped in.
2. `level.js` stage data must not be edited by two owners — it is the integration owner’s job after logic owners submit “wire requests.”
3. `GameScene.js` handles camera `underfloor` mode and gate opening; any phase that changes `underfloor` or completion camera targets must route through the integration owner.

---

## 7. IV → VI Trace Integration Points

**Current state:** There is **no trace recording** at all. Phase IV’s trolley motion is a purely visual tween:

- `applyAction('release')` tweens `machinery.trolley` +76 px (`src/tutorial/TimetablePuzzle.js:2313-2320`).
- `applyAction('release')` for coupler tweens couplers (`src/tutorial/TimetablePuzzle.js:2321-2339`).
- `setCompletedMachinery()` restores final positions (`src/tutorial/TimetablePuzzle.js:2421-2458`).

There is no array of `{ tMs, normalizedX, marker }` samples.

### Where to collect Phase IV trolley trace

The natural collection point is inside the new `weightTransfer.js` module. It should observe the trolley’s normalized position (`(x - leftBound) / (rightBound - leftBound)`) each frame and emit markers when the trolley crosses:

- left extreme
- center
- right extreme
- final settled position

The current `machinery.trolley` rectangle is created at `src/tutorial/TimetablePuzzle.js:819` and tweened in `applyAction('release')`. A new module would replace that tween with physics/spring simulation and sample it.

### Where cross-Phase state lives today

- `scene.tutorialPuzzle` holds all runtime state.
- `scene.registry` holds a few persistent flags (`tutorialPowerState`, `tutorialPowerRestored`).
- There is no serialization of Phase IV → Phase VI data; phases are advanced by resetting `puzzle.*` fields in `completeStage()` (`src/tutorial/TimetablePuzzle.js:2536-2549`).

### QA / old-save / reload fallback

- `setupQA()` at `src/tutorial/TimetablePuzzle.js:3386-3412` already resets pressure/echo state for warps. A canonical trace should be injected here when `qa` warps to Phase VI.
- `completeStage()` at `src/tutorial/TimetablePuzzle.js:2547-2549` is where Phase VI state is initialized on normal progression; this is where the canonical fallback should be loaded if no valid Phase IV trace exists.
- `window.render_game_to_text()` in `src/main.js` is the natural place to expose a `traceSummary` field.

### Existing resets that could clear the trace

- `completeStage()` resets `puzzle.echoGateIndex`, `echoGatesCleared`, `echoAtValve`, pressure, etc. (`src/tutorial/TimetablePuzzle.js:2542-2549`).
- `GameScene.scene.restart()` (R key) destroys the scene and rebuilds `tutorialPuzzle` from defaults, so any in-memory trace would be lost. Persistence must be externalized (e.g., `localStorage` or `scene.registry`) if the Design Lock’s “no forced replay” rule is to survive a browser reload.

---

## 8. Top 10 Integration Risks

Before the Kimi-authored list, the chief verification found one risk that outranks the original reset note: **Phase III has duplicated tuning truth.** The stage-level `airLock` config is passed but ignored, while `AIR_LOCK_TUNING` controls logic and some visual thresholds. Any future edit to `level.js` can silently disagree with the running state machine.

1. **Three schemes in one file.** `TimetablePuzzle.js` contains the old queue path, the dead drum path, the new air-lock path, and the old physical-sequence path. Removing any branch risks breaking another because they share `applyAction()`, `refresh()`, and machinery objects.
2. **`solution` overuse.** 28 call sites read `stage.solution` (`src/level.js:75`). If Phase II or III removes `solution`, every art/objective consumer must be guarded.
3. **Air-lock reset semantics.** `airLock.js` has `reset()` but it is not wired to any stage reset. On retry, a fresh `createAirLock()` is created by `ensureAirLockState()`; this is safe but should be explicit.
4. **Drum cleanup debt.** `src/tutorial/drum.js` and all `stage.drum` branches should be deleted once Wave 2 lands. Leaving them creates dead-but-reachable code if `drum` is re-added.
5. **QA route rot.** Most `timetable-3-*` routes are broken because Phase III no longer uses the drum. `timetable-manual-*`, `timetable-5-*`, and `timetable-6-*` will break when IV/V/VI are replaced.
6. **`render_game_to_text` drift.** The text tree already mixes old and new field names. Each new phase must add its fields here, and obsolete fields (`drum`, manual heat, etc.) must be removed.
7. **Art ownership split.** `TutorialTrainRoomsArt.js` uses `stage.underfloor`, `stage.solution.length`, etc. Any phase that removes `underfloor` or changes its meaning must update the art module.
8. **Camera coupling.** `GameScene.updateTutorialCamera()` (`src/scenes/GameScene.js:1093-1112`) and `playTutorialCompletionReveal()` (`src/scenes/GameScene.js:1937`) assume `underfloor` stages need a downward look. Phase IV weight transfer may need new camera grammar.
9. **Input edge vs. held state.** Phase III air-lock and Phase V pressure both read `scene.inputState.interactHeld`. The new phases must keep this contract consistent.
10. **Trace persistence.** Without a stored Phase IV trace, Phase VI cannot function. The first implementation must include both in-memory and canonical-fallback paths; otherwise QA skip and old saves will soft-lock.

---

## 9. Wave 2 Preconditions

Before any `phase-*-logic-owner` writes gameplay code, the following should be true:

1. **Design Lock is accepted and `docs/NEXT_TASK.md` is updated to READY** for the Wave 2 architecture task.
2. **Integration owner creates module skeletons** with the agreed interface:
   ```js
   enter(context)
   update(delta)
   interact(target)
   reset()
   snapshot()
   isComplete()
   destroy()
   ```
3. **Old branches are removed or clearly marked.** Specifically:
   - `src/tutorial/drum.js` is removed.
   - All `stage.drum` branches in `TimetablePuzzle.js` are removed.
   - `manualWindowMs` / `manualUntil` / `manualHeatStart` / `manualSmokeAt` are removed.
   - Old `echoGates` with `command` / `blockedHint` / `clearedHint` are removed.
   - Old `pressureHold` band and `pressureHintCommand()` gold highlight are removed.
4. **`src/level.js` stage data is versioned** so that Phase I/II keep working while III–VI are rewired.
5. **QA owner drafts new routes** for air-lock success/failure/reset, weight-transfer trace generation, bogie diagnosis, and recorded-echo replay.
6. **`render_game_to_text` contract is extended** to expose trace samples and per-phase snapshot fields.
7. **Build and asset checks pass** (`npm run assets:check`, `npm run build`, `git diff --check`) after skeleton integration but before logic owners start parallel work.

---

**End of report.** No project files were modified, created, deleted, or formatted during this mapping.
