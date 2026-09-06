# PROLOGUE III–VI EXECUTION STATE

```text
CURRENT PHASE:    ALL PHASES II–VI FROZEN — continuous browser acceptance passed, final report next
LAST COMPLETED ACTION: II→VI continuous acceptance in ONE page session (2026-08-03): IV real keyboard (fail TEST spinning 0.35 -> drain/supply -> charge 99.9 -> trolley 0.949 -> bite 0.85 -> car move), V real keyboard (contradiction front-turns/rear-seized -> isolate -> vent 0 -> pin -> repair -> withdraw -> restore -> wheel turns), VI consumed the REAL IV trace (traceSource 'player', 73 samples, durationMs 9095.7) -> loop-1 window @3714ms -> bite -> stage-complete -> departure -> chapter card -> world-1 arrival (phase 'complete', px 4955, lives 3, arrival grace true). 10 screenshots in 游戏/phase6/continuous/. II/III spot-checks post-fix both converge. 495/495 ✓ build ✓ diff ✓
NEXT EXACT ACTION: final delivery report (lock §12 checklist) — Appendix A write-back DONE (A.2 loadBase 0.1/loadSpan 0.5 locked, A.3 fault brake-actuator-seized rear, A.4 VI constants)
FROZEN FILES:     src/tutorial/phases/airNetwork.js, motorAdhesion.js, bogieSnapshot.js, localAirCircuit.js, weightTransfer.js, traceContract.js, bogieDiagnosis.js, echoReplay.js (+ docs/PROLOGUE_III_VI_SYSTEM_ARC_LOCK.md Appendix A fully written back)
CURRENT BLOCKER:  none
LAST GREEN TEST COUNT: 495
BROWSER ROUTE:    ?qa=phase2..6&state=entry all playable; continuous run scripted in 游戏/phase6/continuous-run.mjs (full|v|vi) + spot-check.mjs (ii|iii)
```

## 2026-08-03 two shared bugs found + fixed during VI browser acceptance (do not re-audit)

- BUG A (critical, all-stage): Phaser `Camera.pan(x,y,dur,ease,force,cb)` callback is a PER-FRAME
  onUpdate, not an onComplete. `GameScene.playTutorialCompletionReveal` and both relay close-up
  pans treated it as onComplete → the whole completion chain (onMachineReady/onReadyForDoor →
  playTutorialGateOpen → playPrologueDeparture) re-fired EVERY FRAME (~49 calls per 420ms pan).
  Guards made stages converge, but the reveal cinematic never actually played, pendingActions were
  scheduled 49×, and VI's departure started mid-pan. FIX: gate every pan callback on
  `progress >= 1` (true exactly once, final frame). 4 sites: GameScene.js playTutorialCompletionReveal
  (both pans), TimetablePuzzle.js openRelayCloseup + closeRelayCloseup pans.
- BUG B (VI finale): playPrologueDeparture teleports the player to STORY_WORLDS[1].startX+155 = 4955,
  inside the world-1 enemy patrol (4940–5220); measured body widths (enemy halfW 16.8 + player
  halfW 18.88 = 35.68 contact reach) prove EVERY standable pixel of the landing strip (4920–5266)
  is reachable by the patrol, so the frozen cinematic arrival was farmed 3× → gameOver → scene.restart
  → QA warp re-ran (the "mystery reset"). FIX: arrival protection = `invulnUntil = Infinity` +
  `prologueArrivalGrace`, cleared on first movement input (+400ms buffer) with a 10s post-handoff
  safety cap. Verified: 0 damage for 21s idle in patrol; grace clears on ArrowRight; chapter
  completes phase 'complete' world 1.
- VI loop-0 observation rule confirmed in browser: energize during loopIndex 0 bounces
  (`observe-first-loop`) — with a real player trace (~9s) loop 1 arrives quickly; with a degenerate
  262s trace (produced only by a 10-minute interrupted debug session) the observation loop is
  correspondingly long. Working as designed, not a bug.
- E-synthesis caveat: synthetic KeyboardEvent E JustDown is ~90% reliable; all drivers retry once
  and verify via snapshot. VI energize uses the accepted page-internal fallback
  (`echoReplay.interact('test')`) as documented in earlier phases.


## Phase IV frozen contract (do not re-audit)

- Damaged suspension = shared airNetwork 'suspension' branch isolated+venting, flat. Two devices either order: level-drain (close vent) + level-supply (open isolation). Supply-open-while-venting floors at 55 -> max load 0.465 < 0.47 hysteresis floor: leak can never be muscled through.
- motorAdhesion locked constants: loadBase 0.1, loadSpan 0.5 -> bite needs trolleyX >= 0.9 at full health; spin-drop below 0.74. Appendix A write-back to lock doc still PENDING (do at final report).
- Trolley: grab toggles with E, arrows move it (speed 0.22/s), player pinned to trolley while grabbed; failed TEST never resets trolley.
- Trace: rebased to first grab (pre-grab idle excluded); parked left-extreme at t=0; settled appended with strictly-increasing tMs; stored on puzzle.weightTrace for Phase VI (only consumer).
- Devices layout: drain 2560, supply 2660, trolley 2480->3060 (y 429), test 2900; guard 3178 still bounds.
- render_game_to_text path: root.world.tutorial.timetablePuzzle.weightTransfer.

## 2026-08-02 Phase V integration green
- STATUS: PHASE V INTEGRATION GREEN — browser acceptance next
- DONE: pressureHold fully removed (objectiveHint branch, pressureHintCommand, refresh tint branch, timetable-5-* QA routes); main.js bogieDiagnosis render_game_to_text block added (faultyBogie field); build OK; 458/458 tests; git diff --check clean
- NEXT: dev server 5199, ?qa=phase5 real keyboard route + 5 screenshots, verify pin/shoe/spoke visuals
- BLOCKERS: none
- OWNERS: single-threaded, no agents
- FILES: src/tutorial/TimetablePuzzle.js, src/main.js
- NOTES: machinery coords (bogieY=underY+65, shoes +44/+58, pin parked rearX-64 seated rearX-18) not yet visually verified

## 2026-08-02 PHASE V FROZEN
- STATUS: PHASE V FROZEN — READ THE BOGIE accepted in real browser
- DONE: real keyboard route on ?qa=phase5&state=entry: TEST contradiction (front turns / rear seized, brake-actuator-seized) → early repair refused (repaired stayed false) → isolate → hold vent to 0 → service pin seated → repair OK → pin withdrawn → supply restored → at 60psi rear released, wheel turned, stage-complete auto-fired → stageIndex 5. Screenshots 01-05 in 游戏/phase5/. Prompts verified: FREE THE SEIZED PISTON / WITHDRAW THE SERVICE PIN / CUT OFF THE LOCAL BRAKE LINE. 458/458 tests, build OK, diff clean. pressureHold fully removed.
- NEXT: Phase VI — read lock §6 + §2.4, read echo code (operateEchoGate/advanceEchoToGate/beginEchoSync), design echoReplay consuming puzzle.weightTrace
- BLOCKERS: none
- OWNERS: single-threaded
- FILES: src/tutorial/phases/bogieDiagnosis.js, bogieSnapshot.js, level.js, GameScene.js, TimetablePuzzle.js, main.js
- NOTES: machinery coords verified visually OK (shoes red blocks at wheels, pin slides as yellow bar, gauge reads brake branch). WebBridge extension was down; used headless Chrome CDP driver 游戏/phase5/cdp-driver.mjs — reusable for Phase VI. Appendix A write-back still owed (motorAdhesion 0.1/0.5, bogie fault, weightTransfer/bogieDiagnosis defaults).

## 2026-08-02 Phase VI integration green
- STATUS: PHASE VI INTEGRATION GREEN — browser acceptance next
- DONE: echoReplay.js (14 tests) locked riderBonus 0.1 / biteHoldMs 900 / departureMs 2600; level.js junction-6 echoLoad config (echoGates abolished, title PAST RIDES THE LOAD); GameScene echo-load texture; TimetablePuzzle full wiring (ensure/update/operate/handleEvent/refreshEchoVisuals + machinery: rail beam, brass zone stripe, trolley car, ghost, drive spoke, 5-lamp condition strip, window lamp, gauge); objectiveHint branch; ?qa=phase6&state=entry|window|biting|departing; main.js echoReplay render block. Old echoGates/operateEchoGate/advanceEchoToGate/timetable-6-* behavior routes removed; echoSync/echoAssist dead paths left untouched (zero config refs). 476/476 tests, build OK, diff clean.
- NEXT: dev server 5199 + headless Chrome CDP (driver 游戏/phase5/cdp-driver.mjs), ?qa=phase6 real keyboard route: observation loop bounce → stale spin → release → window energize → bite → departure → chapter animation; 5 screenshots to 游戏/phase6/
- BLOCKERS: none
- OWNERS: single-threaded
- FILES: src/tutorial/phases/echoReplay.js, tests/tutorial/echoReplay.test.mjs, src/level.js, src/scenes/GameScene.js, src/tutorial/TimetablePuzzle.js, src/main.js
- NOTES: VI consumes puzzle.weightTrace via normalizeTrace; QA warp → canonical (window ~2857-3714ms of 6000ms loop, bite tail to ~4398). completeStage(last) triggers playPrologueDeparture. Machinery coords (bogieY=underY+65, rail +42, lamps test.x-52+i*26) not yet visually verified. Appendix A write-back still owed: A.2 loadBase 0.1/loadSpan 0.5 locked, A.3 fault=brake-actuator-seized rear, A.4 VI constants.

## 2026-08-03 III/IV VISUAL POLISH WAVE — UNDERCARRIAGE VIEW TEACHING FROZEN
- STATUS: WAVE FROZEN — III/IV undercarriage teaching accepted in real browser with real keyboard S
- DONE: new pure module src/tutorial/underfloorView.js (flag semantics: `underfloor` = deep machinery layout IV/V/VI; `underfloorView` = look-down teaching III+IV; resolveUnderfloorLookDown / gateTutorialLaneInput / hint state machine) + tests/tutorial/underfloorView.test.mjs (13 tests, all 7 brief items that are pure logic). level.js: junction-3 underfloorView (keeps hand-placed air run at y545 + wall-eye gauge), junction-4 underfloor+underfloorView (full deep band: bogie, wheels, bags at 716, gauge 602). GameScene: updateTutorialCamera consumes resolveUnderfloorLookDown (V/VI behaviour unchanged), update() consumes gateTutorialLaneInput (W/S swallowed in world 0 — pre-existing inline gate extracted), [S]▼ screen-anchored hint ([E]-prompt recipe after drawn-keycap version failed contrast; III strong once/session, IV weak after 2800ms dwell, both retired by one look-down, hidden in cinematic/close-up/stage-complete; anchored GAME_H-100 after discovering headless viewport clips canvas bottom ~87px). TimetablePuzzle: III dressing (4 floor beams + hanger straps + tee collars + cylinder→claw rigid rod + 2 service glows) all in assembly.machinery so refresh() owns visibility; brake shoes hidden on airCircuit via the refresh exclusion loop (construction-time setVisible gets reasserted there — same trap as pressureBar, fixed the same way); IV refresh drives wheelSpokes from wheelSpeed, axlePulse by wheelState, throttled slip sparks at drive wheel. QA warps use stageHasUnderfloorView.
- REGRESSION: 508/508 tests (495+13), npm run build OK, git diff --check clean. No puzzle logic, state machine, camera values or shared numbers touched.
- ACCEPTANCE (real keyboard S, tutorialForceLookDown=false throughout): 游戏/phase3/undercarriage/u01-u06 (entry strong hint / mid-lerp transition / full air-circuit panorama with hangers / stall contest with hiss / isolated venting slack pipe + release text / door open + passage to IV); 游戏/phase4/undercarriage/u01-u06 (entry no hint / weak hint after dwell / suspension+bogie panorama / wheel slip amber lamp + sparks / charged suspension / biting teal lamp + trolley over drive bogie). Driver: 游戏/phase6/undercarriage-run.mjs.
- DEBUG LOG (for future waves): (1) TimetablePuzzle refresh() reasserts machinery visibility every frame — construction-time setVisible is never enough, extend the exclusion loop; (2) stageComplete is a PER-STAGE ARRAY in timetable mode, Boolean(array) is always true; (3) localAirCircuit snapshot field is isolateClosed not branches.door.isolated; (4) headless Chrome --window-size=960,600 yields a 513px viewport — anything anchored below game y~525 is clipped in QA shots; (5) Phaser followOffset: camera centres on target MINUS offset, so -165 looks down.
- NEXT: Phase I (junction-1 PUNCH THE DOOR) and Phase VII (prologue exit / world-1 hand-off) work packages, per standing instruction
- BLOCKERS: none
- OWNERS: single-threaded, no agents, no commit/push
- FILES: src/tutorial/underfloorView.js, tests/tutorial/underfloorView.test.mjs, src/level.js, src/scenes/GameScene.js, src/tutorial/TimetablePuzzle.js, 游戏/phase3/undercarriage/, 游戏/phase4/undercarriage/, 游戏/phase6/undercarriage-run.mjs

## SHIP MODE final leg (2026-08-03 PM)
- IV bogie/trolley redraw accepted: six same-viewport shots in 游戏/phase4/ship/ (pinned cam 2240,300; canvas bottom cuts ~game y 814 in headless 513px viewport — scrollY 300 is the max bound 900-600).
- Phase I entry teaching verified playable as-is (speak -> dialogue -> PUNCH DOOR -> partition). No changes needed.
- Phase VII verified: real E in the VI arming window -> biting -> departure -> chapter card -> world 1 (x 4955, grace on).
- I-VII continuous single-session run: 游戏/continuous/ship-i-vii-run.mjs (to-v then vi). VI replay consumed the run's own IV trace (source 'player', 69 samples, 9100ms).
- Driver lessons: approach->idle flips at stage.startX+72 (walk targets must clear it); relay wiring drives scene-level _onRelayPointerDown/Move/Up with relayArt.getState()/getHitRegions() world coords; III bleed is a real E hold; VI energize keeps the page-internal interact fallback.
- 508/508 tests, build, git diff --check all green. No commits.
