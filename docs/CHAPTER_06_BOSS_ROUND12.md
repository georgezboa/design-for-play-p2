# Chapter 6 · ALL WORLDS AT ONCE — the Conductor as set pieces (round 12)

Status: **CURRENT** (2026-10-10). Supersedes `docs/CHAPTER_06_BOSS_ROUND11.md`.

George's note (round 12): "现在的boss关没有那种好玩的感觉你懂吗 就是去学习一下split fiction里面的那种"
(the boss fight still isn't fun, you know? Go and learn from the kind of thing Split Fiction does).
He wanted all four of: every segment a different way to play; spectacle and impact; high execution
demands with a fast pace, low tolerance and a few tries; attacks built from each chapter's world rules.

Round 11 had made four skill fights, but all four were the same top-down arena with a different coat
of paint, so the fight played one way for its whole length. Round 12 replaces it with **seven set
pieces**. Each has its own camera, its own verbs and its own rules. Every one opens by teaching through
play, escalates two or three times, and ends on a finisher that hands straight into the next piece
with no menu and no loading screen.

---

## 1. What Split Fiction does: research, with sources

| # | Principle | What Hazelight / the press say | How round 12 uses it |
|---|---|---|---|
| 1 | **A mechanic lives for one beat, then goes.** | Push Square's review: "nothing ever overstays its welcome", by contrast with *It Takes Two*, where the reviewer felt mechanics went on too long ([Push Square](https://pushsquare.com/reviews/ps5/split-fiction)). "Learning something new every few minutes" ([Epic Games Store](https://store.epicgames.com/news/split-fiction-how-hazelight-studios-makes-it-make-sense)). Josef Fares on an expensive set piece: "Why do you have to reuse it?" and "There's always something around the corner that's going to surprise you and delight you" ([Xbox Wire](https://news.xbox.com/en-us/2025/03/05/split-fiction-josef-fares-interview/)). | No verb outlives its piece: roof jumping and ducking, the punch-back rally, the lamps on the bell, the climb, bullet dodging, the draw, painting the line. Each piece runs 35–110 s on NORMAL. |
| 2 | **The camera changes inside one fight.** | The Overseer moves from a side-view fight to a climb ahead of rising acid, then top-down, then a chase down a corridor, then a run toward the camera ([Sportskeeda](https://www.sportskeeda.com/esports/split-fiction-chapter-4-the-overseer-walkthrough)). Push Square describes 2D side-scrolling, a Crash-style camera and full 3D flight within a single boss fight, with "the perspective was constantly changing". GamingBolt praises "the seamless perspective shifts from top-down, side-scrolling" ([GamingBolt](https://gamingbolt.com/split-fiction-review-split-quality)). | I: side-scroller, then behind Butch. II: side-scrolling rooftops, then a vertical climb. III: top-down bullet hell, then a ground-level duel. IV: on rails behind Butch. |
| 3 | **His attack is how you hurt him.** | Mr. Hammer throws his hammer, and Zoe hurls it back at him ([Prima Games](https://primagames.com/tips/split-fiction-how-to-beat-mr-hammer-boss); [Deltia's ranking of all 20 bosses](https://deltiasgaming.com/?p=169203)). The Overseer's barrels, once disabled, are thrown back at it ([Sportskeeda](https://www.sportskeeda.com/esports/split-fiction-chapter-4-the-overseer-walkthrough)). | His brass claim cases are punched back up the train (I-1, I-2). His bell is punched as it strikes (II-2). His own record cards answer him (III). His train becomes your train (IV). |
| 4 | **Escalate at thresholds, one new thing at a time.** | Mr. Hammer brings in dogs at about 50% health and drifting neon waves under 30% ([Prima Games](https://primagames.com/tips/split-fiction-how-to-beat-mr-hammer-boss)). At a third of its health the Overseer floods the arena and the fight becomes a climb ([Sportskeeda](https://www.sportskeeda.com/esports/split-fiction-chapter-4-the-overseer-walkthrough)). | Every piece is two to four **stretches**. Each one is a checkpoint and adds one thing: trunks, then gantries, then uncoupling; rallies of two, then three, then decoys; one beam, then two, then the quickened bell. |
| 5 | **Danger is read, not guessed.** | Rader's hydra: "watching the highlighted impact zones"; shockwaves are jumped or dashed over ([Deltia's Rader guide](https://deltiasgaming.com/?p=165136)). | Every attack has a visible warning of at least 0.5 s on NORMAL, pinned in `round12Pieces.test.mjs` (fairness): a filling ring, a shadow, a red lamp and horn, a gathering ring at his hand, a lamp in the tunnel. |
| 6 | **Finish with the world, then move on.** | Mr. Hammer leaves through a skyscraper window ([Deltia](https://deltiasgaming.com/?p=169203)). The finale is "half an hour of just constant 'wow' moments", with the split itself as the spectacle ([Pure Xbox](https://www.purexbox.com/features/opinion-split-fiction-has-one-of-the-best-final-levels-of-any-game); the page showed a block notice, but the article text came through). | Finishers: knocked back on the engine and through the punch-hole lens; the rose signal, then the camera cranes up the tower; the bell cracks and his ticket inspection follows; the square cracks open under him; the night service rams through him and he tears into paper. |
| 7 | **Hard, but a few seconds a try.** | Can I Play That: "smaller gaps between checkpoints", a skip-to-checkpoint option and a revive system it calls forgiving ([Can I Play That](https://caniplaythat.com/?p=15173)). Fares wants it "challenging but not too hard", and the team "test[s] to make sure that players aren't stuck for too long" ([VGC](https://videogameschronicle.com/features/interviews/split-fiction-game-interview); [Unreal Engine](https://www.unrealengine.com/developer-interviews/it-takes-two-lovingly-marries-story-and-gameplay-together)). | NORMAL gives three paper layers, and every stretch is a checkpoint (a death costs that stretch, seconds). Each new piece refills the layers. After three deaths in a movement the game offers STORY, which plays the same pieces slower and undoes nothing on a death. |
| 8 | **Play what the story is about.** | Fares: "whatever happens in the story is something you should be playing", and "we didn't want the gameplay to constantly change just for the sake of it" ([Unreal Engine](https://www.unrealengine.com/developer-interviews/it-takes-two-lovingly-marries-story-and-gameplay-together)). | Each piece is a chapter's own rule turned against Butch: lost property (I), Chapter 2's bell and its machines (II), two true things against his misreadings (III), paint makes a drawn thing real (IV). |
| 9 | **Feel: a hit stops time, a jump forgives.** | Sakurai on hit stop: the victim shakes, the attacker keeps moving slightly during the freeze ([Nintendo Wire on *Creating Games*](https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/)). Celeste's forgiveness: coyote time, jump buffering, half gravity at the top of a held jump, corner correction ([Maddy Thorson, "Celeste & Forgiveness"](https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html)). | Hit-stop (0.04–0.16 s), camera trauma with a directional kick, impact audio and a reaction from him, all scaled per event. The side-view body has coyote time (0.11 s), a jump buffer (0.14 s), an apex hang, variable jump height, ledge grace (0.22 m), a generous hurt box, and a dash with i-frames once per air time. |

**Single-player guardrail.** Split Fiction is co-op. Here that cooperation goes to the train, its
machines, the environment and an authored past: Chapter 2's lamps and bridges (machines that act on
the bell), the swinging beams in the tower, the clock in the square (the draw signal), the record
cards (what the journey found), and the night service (the train that takes the last hit). Every rule
is visible physical cause and effect. No control is ever hidden or scrambled.

---

## 2. The fight now

| Movement | Set piece | Way to play | NORMAL length (bot) | Stretches (each a checkpoint) | Finisher → hand-off |
|---|---|---|---|---|---|
| I · LOST PROPERTY | **THE ROOF RUN** | side-scrolling forced run along the night service | 85–125 s | THE LAST CARRIAGE · LUGGAGE · THE GANTRIES · UNCOUPLED | at the tender he turns: camera swings behind Butch |
| | **RETURN TO SENDER** | behind Butch, a punch-back rally against the giant on the engine | 58–133 s | THE TENDER · RETURN TO SENDER · OVERDUE · NO CLAIM | the last rally knocks him back; the punch-hole lens closes on Butch → Movement II |
| II · ON THE BELL | **ON THE BELL** | side-scrolling rooftop platformer in the rain, on Chapter 2's 4 s bell | 47–54 s | THE FIRST BELL · ON THE BELL · THE OFF-BEAT · THE QUICKENING | the rose signal lights him: crane up his tower |
| | **THE BELL TOWER** | vertical climb, the borrowed light rising | 40–56 s | THE TOWER · THE SWING · THE RISING LIGHT · ON THE BELL | the bell cracks → his ticket inspection → Movement III |
| III · TWO TRUE THINGS | **FALSE CLAIMS** | top-down bullet hell made of his misreadings | 37–69 s | THE CLAIM · HIS RECORD · ECHOES | he has no answer, the words fall: crane down to the stones |
| | **THE STANDOFF** | a Leone draw on the square's clock | 32–95 s | THE DRAW · FEINTS · THE LAST WORD | the square cracks open under him; lens → Movement IV |
| IV · THE PAINTED COUNTRY | **THE PAINTED LINE** | on rails at the front of the painted train | 88 s | THE DRAWN LINE · THE WASH · ALL WORLDS AT ONCE | the night service runs alongside; jump aboard and it rams through him → ending film, archive card, credits |

A skilled bot plays the whole fight on NORMAL in about seven and a half minutes. His ticket is 400:
100 per movement, split between its pieces (40/60, 50/50, 55/45), and Movement IV leaves the last 12
to the night service.

Code: pure rules in `src/chapters/finalBoss/setPieces/` (`kernel.js`, `platformer.js`, one file per
piece, `sequence.js`, `bots.js`). The pieces never touch three.js or the DOM; the stage only draws them
(`stage/trainView.js`, `rooftopView.js`, `squareView.js`, `lineView.js`, `fightAudio.js`, `stageKit.js`,
wired by `spectacleBattle.js`).

---

## 3. The set pieces

All numbers are NORMAL. STORY multiplies every speed by 0.82, every warning by 1.4 and every timing
window by 1.6, leaves out the hazards marked `extra`, shrinks Butch's hurt box to 0.8, gives six
layers and undoes nothing on a death (`finaleModel.js` `DIFFICULTIES`, `kernel.js` `pieceTuning`).

### I-1 · THE ROOF RUN (`setPieces/roofRun.js`, view `trainView` 'side')

- **Perspective:** side-on along the carriage roofs at night. The camera scrolls toward the engine,
  and the left edge is where he uncouples the carriage behind, so it pushes you. He stands huge on the
  engine ahead and throws the lost-property office down the train.
- **Controls:** A/D run · SPACE jump (hold for higher) · S/↓ duck (a slide when running) · E/Enter/click
  punches a brass claim back · SHIFT/X dash (i-frames).
- **Teach:** THE LAST CARRIAGE runs at 4.2 m/s. One slow case to jump, then a coupling, then a brass
  claim. **The train holds at the claim** (it re-throws every 3.2 s) until one goes back. Hints teach
  one thing at a time.
- **Escalations:** LUGGAGE (5.4 m/s): pairs and threes of cases, and trunks whose shadow fills before
  they land, bounce once and roll. THE GANTRIES (5.8 m/s): a red lamp and a horn mean a signal gantry,
  so duck (the first one comes slow). UNCOUPLED (6.4 m/s): he uncouples carriages ahead, the gaps
  widen from 1.6 m to 3.4 m, and everything comes together.
- **Combos** are authored by **arrival time** (`ROOF_TIMELINE` `arrive`), so a gantry and the case
  after it are always the same beat apart, at any pace. No two arrivals in a combo are closer than
  0.39 s (pinned by a test).
- **Telegraphs:** an edge warning (case/claim) 0.75/0.9 s ahead; a trunk's shadow (1.15 s flight);
  a gantry's lamp and horn 1.2 s ahead. A gantry is never sent over a coupling Butch is about to jump.
- **Punch-back:** reach 0.15–1.95 m ahead (×1.6 on STORY); 0.5–1.2 m is a **VOLLEY** that flies back
  faster. A returned claim staggers him, and he drops what he was about to throw.
- **Finisher:** at the tender he turns to face Butch; the camera swings behind Butch.
- **Knobs:** `ROOF_RUN_SEGMENTS` (lengths, scroll), `CASE`, `CLAIM` (reach, sweet), `TRUNK`, `GANTRY`,
  `ROOF_TIMELINE`, the coupling widths in `buildCarriages`.
- **QA:** `/final-boss.html?qa=conductor-1`; `window.finalBossBot(true, 'skilled'|'weaker')`.

### I-2 · RETURN TO SENDER (`setPieces/returnToSender.js`, view `trainView` 'duel')

- **Perspective:** behind Butch on the tender roof, looking up the train at the Conductor standing on
  the engine, filling the frame from the engine roof to just under the HUD.
- **Controls:** A/D across the roof · E/Enter/click punches back as it lands · SPACE jumps a sack ·
  SHIFT dash.
- **Teach:** THE TENDER: one slow claim (1.9 s flight) into a brass ring at Butch's feet. Stand in it
  and press E as it lands.
- **Rally:** each return reaches him and he **volleys it back 12% quicker** (flight 1.25 s × 0.88ⁿ,
  never under 0.62 s). When the rally's count is reached the return gets past him (rally won). The
  window is ±0.15 s around the landing, and ±0.055 s is a VOLLEY. A whiffed punch locks the fist for
  0.22 s, so mashing fails.
- **Escalations:** RETURN TO SENDER: rallies of two, grey rings (unclaimed cases) between them.
  OVERDUE: rallies of three, his OVERDUE stamp over one side of the roof, mail sacks skidding down the
  roof (jump), and he sends it wide. NO CLAIM: under the lens a ring can read **NO CLAIM** 0.62 s
  before it lands. Don't punch it; step out. The real claim follows.
- **Finisher:** the last rally knocks him back off his feet on the engine, his claims flying. The
  punch-hole lens closes on Butch and opens on the rain city.
- **Knobs:** `RTS_SEGMENTS` (rally length, wins), `THROW` (flights, window, perfect, reveal, stamp),
  the `BEATS` per stretch.
- **QA:** `?qa=conductor-1-2`.

### II-1 · ON THE BELL (`setPieces/bellRooftops.js`, view `rooftopView` 'rooftops')

- **Perspective:** side-scrolling rooftops in the rain. He looms behind the skyline, lit when the
  borrowed light goes back to him. The bell meter sits top left.
- **Chapter 2's rule:** punch a lamp and its machine fires **on the next bell** (4 s, Chapter 2's
  `BELL_MS`). Amber lamps lay bridges across the street. Teal lamps raise billboards, which give
  shelter and a step up. Bell planks: amber ones are out from each bell, teal ones from each off-beat,
  for 2.25 s, so you jump on the beat. Rose signal: on the bell it lights him and ends the stretch.
- **Controls:** A/D run · SPACE jump · E punches a lamp · SHIFT dash (once in the air).
- **Teach:** THE FIRST BELL: an amber lamp, its bridge on the next bell, then a rose signal. No
  searchlight.
- **Escalations:** ON THE BELL: amber planks, and his **searchlight** starts. It is aimed 0.6 s after
  each bell where Butch is heading and stabs down on the off-beat (0.9 m half-width, rose column
  warning). Keep moving, or stand under a raised billboard. THE OFF-BEAT: amber and teal planks in
  turn, a billboard to climb, a bridge that folds fast, and two beams (where you are going and where
  you stand). THE QUICKENING: Chapter 2's chase, the bell quickens to **3 s** (STORY 3.6 s), and every
  plank and bridge quickens with it.
- **Falls:** the street drops Butch back to the last safe roof (never a plank) and costs a layer.
- **Finisher:** the last rose signal lights him at the foot of his tower; the camera cranes up.
- **Knobs:** `ROOFS`, `PLANKS`, `LAMPS` (bridge/board out times), `ROOFTOP` (plankOut, beam timings,
  quickBell, beamFrom).
- **QA:** `?qa=conductor-2`.

### II-2 · THE BELL TOWER (`setPieces/bellTower.js`, view `rooftopView` 'tower')

- **Perspective:** a vertical climb inside the shaft, the camera rising with Butch.
- **Controls:** A/D · SPACE jump (hold for higher) · E punches the bell · SHIFT dash.
- **Teach:** THE TOWER: ledges. From the second bell the **ring runs down the stones** (a bright band
  at 14 m/s, with an arrow when it is above the view). Anyone standing when it passes is knocked down,
  so be in the air.
- **Escalations:** THE SWING: beams hanging from the bell frame swing on the 4 s bell, so you ride
  them across, and after 3 s the **borrowed light rises** from below (0.55 m/s). THE RISING LIGHT:
  faster light (0.85 m/s), and **counterweights** rattle down the shaft every 2.6 s (a shadow line
  warns 1.1 s ahead). ON THE BELL: under the bell, **punch it as it strikes**, ±0.18 s (×1.6 STORY),
  twice. An unpunched strike knocks a standing Butch down.
- **Finisher:** the bell cracks, then his ticket inspection (IDENTITY VERIFIED), then Echo City.
- **Knobs:** `TOWER` (ringSpeed, light, weights, punchWindow, punches), `TOWER_LEDGES`, `TOWER_SWINGS`
  (phases chosen so every hop is possible), `TOWER_SEGMENTS.light`.
- **QA:** `?qa=conductor-2-2`.

### III-1 · FALSE CLAIMS (`setPieces/falseClaims.js`, view `squareView` 'top')

- **Perspective:** the sunlit square from above and in front: all of him on the steps, all of the
  square.
- **The rule:** while he voices his claim (the shipped Chapter 3 recordings), he throws his
  **misreadings of the record**, and every word of a false claim flies as a word. A word's slip is what
  hits: a capsule as long as the word, drawn the same size (`slipDistance`). Only the dot at Butch's
  heart can be hit. A hit answers Butch "from the record" (its rebuttal shows as a line) and tears a
  layer.
- **Two true things:** two record cards come down far apart (8 m). Walk into one, and you must reach
  the other within 3.8 s (×1.6 STORY), or the half answer is filed (his deflection line) and the
  cards come down again elsewhere. Holding both, line up under him and press E. The answer goes up the
  square, and he keeps walking the steps, so lead him (0.45 s, ±1.6 m).
- **Patterns** (each warned by his raised hand and a gathering ring, 0.5 s): fan, double fan, stream,
  ring with one gap (toward the next card), spiral, rain (the columns show first), echo (bounces once).
- **Escalations:** THE CLAIM: slow fans, 3.2 s of dodging before the cards. HIS RECORD: double fans,
  streams, rings, 5.5 s of dodging first. ECHOES: spirals, echoes and rain, cards that drift, 7 s of
  dodging first.
- **Finisher:** he has no answer, the words fall to the stones, and the camera cranes down to the
  height of the stones.
- **Knobs:** `CLAIM_SEGMENTS.dodge`, `WORDS` (speed, size, windup), `CARDS` (pair, apart, drift),
  `ANSWER`, `SCHEDULE`.
- **QA:** `?qa=conductor-3`.

### III-2 · THE STANDOFF (`setPieces/standoff.js`, view `squareView` 'standoff')

- **Perspective:** ground level, over Butch's shoulder, the two of them at either end of the emptied
  square, the clock between them. The draw cuts to a close-up.
- **The rule:** he makes his claim. Four record cards hang at Butch's hands (↑ ← → ↓): the four facts
  of the exchange, two true, two his misreadings. Then the wait. **The clock strikes: that is the
  draw.** Give ONE TRUE THING within the window, then the OTHER on the clock's second stroke (0.72 s
  later, ±0.2 s). A draw too soon, a misreading or a late draw: his answer tears a layer, and the wait
  begins again.
- **Controls:** ↑ ← → ↓ or WASD; gamepad D-pad, the face diamond (Y X B A) or a flick of the stick.
- **Escalations:** THE DRAW: no feints, a generous window (0.78 s). FEINTS: his hand twitches, a
  chime that is not the clock, pigeons. THE LAST WORD: three feints, **the record shuffles** (a true
  card and a misreading trade places before the clock), and the window tightens (0.51 s).
- **Finisher:** he has no answer. The square cracks open under him and he sinks; the lens falls into
  the Painted Country.
- **Knobs:** `STANDOFF_SEGMENTS` (feints, swap, window), `DUEL` (waits, draw, beat, second).
- **QA:** `?qa=conductor-3-2`.

### IV · THE PAINTED LINE (`setPieces/paintedLine.js`, view `lineView` 'rail')

- **Perspective:** on rails, behind Butch on the front of the painted train. Three lines run away into
  the country. The Conductor strides beside the line, as tall as the hills, all of him in view.
- **Chapter 4's rule:** paint makes a drawn thing real. Where a line is only pencil, the train cannot
  run. HOLD E (or the mouse) paints the line ahead: the brush reaches 15 m and paints 26 m/s, so a
  10 m stretch takes 0.4 s, and with both hands on the brush you barely steer (×0.22). A/D lean to
  another line. SPACE jumps his brush.
- **Teach:** THE DRAWN LINE (12 m/s): paint one drawn stretch, lean round one wash barrier.
- **Escalations:** THE WASH (15 m/s): his brush strokes wash the line ahead back to pencil (the
  shadow warns 1.35 s ahead), low sweeps across the front (jump, 1 s), and combos: barriers on two
  lines with a drawn stretch on the third, then a sweep. ALL WORLDS AT ONCE (16.5 m/s): the 1978
  tunnel (sepia trains coming the other way, their lamp warns 1.7 s ahead), the rain city (bell planks
  over a street: outer lines on the bell, the middle line on the off-beat), Echo City (his words fall
  on the line), then the painted country with the wash closing in.
- **Finisher:** the night service runs up alongside. Lean left and jump aboard; it rams through him,
  and he tears into paper. Then the ending film, the normal ending card and the credits
  (`journeyComplete.js` records the ending).
- **Knobs:** `LINE_SEGMENTS` (speeds), `LINE` (reach, paintSpeed, leads), `LINE_LAYOUT`, `LINE_WORLDS`.
- **QA:** `?qa=conductor-4`; `window.triggerFinalBossRescue()` jumps to the last stretch.

---

## 4. Game feel

- **Hit-stop** on every impact: hurt 0.09 s, death 0.12 s, a stretch cleared 0.06 s, a finisher
  0.16 s, a volley 0.085 s, a world fall 0.12 s.
- **Camera trauma** (squared shake) plus a **directional kick** on punches. Both are off with SHAKE OFF
  or Reduce Motion. Hit flashes only with FLASHING on (it starts off) and never under Reduce Motion.
- **He reacts:** he reels on the engine, staggers on the rally, is lit by the borrowed light, flinches
  at both true things, sinks into the square, tears into paper. Every struck moment adds particles in
  the piece's colour.
- **Sound** (`stage/fightAudio.js`, synthesized, on the SFX bus): impact, hurt, whoosh, jump, land,
  dash, punch, horn, chime, clock, stings, plus Chapter 2's bell, lamp and machine sounds in
  Movement II. **Music intensity** climbs with each stretch (`setIntensity`), over each movement's
  existing score.
- **Readability:** Butch has a silhouette rim on the dark rain roofs (light) and on the white paper
  (dark). The Conductor is framed whole and huge in every piece. In the square his lines are slim
  subtitles at the bottom, between the layers and the plaque. Every warning comes from where the
  danger comes from.

## 5. Death, checkpoints, difficulty

- **NORMAL:** three layers. A hit costs one (0.9 s of i-frames after it), and so does a fall. The last
  layer restarts **the stretch** (seconds of play). Earlier stretches, pieces and movements stay won.
  A new piece refills every layer. The death card says what tore it and what it cost, in one line.
- **STORY:** the same pieces, slower and kinder, with six layers. A torn last layer undoes nothing.
- **The STORY offer** comes after the third death in one movement, once.
- The board (`final-boss.html`): "6 layers · slower, kinder · nothing undone" /
  "3 layers · stretch checkpoints".

## 6. Kept from before

TEXT SIZE (every new HUD size uses `--nf-scale`), Reduce Motion (every view has a still form),
FLASHING, LOW graphics (`finaleQuality.js`: pixel ratio and Lambert; every view builds half the
particles), keyboard/mouse/gamepad (`finaleControls.js`, 3–5 rows a piece, SPACE only ever JUMP; the
shell's set in `src/shell/chapterControls.js`), the dev routes (`src/shell/devRoutes.js` 6.1, 6.1b,
6.2, 6.2b, 6.3, 6.3b, 6.4), the ticket inspection between II and III, the ending film, the archive
card and the credits. The Black Knife fight is untouched.

## 7. QA

- **Tests** (`node --test`): `round12Kernel` (segments, runner, rollback, the body's forgiveness),
  `round12Pieces` (every piece's verbs, windows, STORY widening, fairness), `round12Sim I–IV` (the
  bots win every piece on NORMAL and STORY within budget; past the teaching stretch an idle player
  is hurt and wins nothing), `round12Stage` (wiring, settings gates, the DEV-only bot, the pad).
- **Bots** (`setPieces/bots.js`): `skilled` (0.2 s reaction, little jitter) and `weaker` (0.3 s
  reaction, more jitter, late reads, misjudged timing in proportion to distance, hesitation, bites on
  feints). Side-view pieces use a look-ahead planner that tries input plans through the real physics.
  The bots load only in DEV builds (`window.finalBossBot`).
- **Bot results, 4 seeds each** (time to win; deaths):

| Piece | NORMAL skilled | NORMAL weaker | STORY skilled | STORY weaker |
|---|---|---|---|---|
| THE ROOF RUN | 84–123 s; 0–3 | 85–98 s; 0–1 | 102–104 s; 0 | 102–117 s; 0 |
| RETURN TO SENDER | 58–85 s; 0–1 | 74–133 s; 1–3 | 75–78 s; 0 | 75–88 s; 0 |
| ON THE BELL | 47–52 s; 0 | 47–54 s; 0 (1–2 hits) | 47–55 s; 0 | 47–54 s; 0 |
| THE BELL TOWER | 40–48 s; 0 | 44–56 s; 0 | 36–60 s; 0 | 44–60 s; 0 |
| FALSE CLAIMS | 42–69 s; 0 | 37–45 s; 0–1 | 47–58 s; 0 | 43–47 s; 0 |
| THE STANDOFF | 32–36 s; 0 | 55–95 s; 2–5 | 33–35 s; 0 | 48–72 s; 0–2 |
| THE PAINTED LINE | 88 s; 0 | 88 s; 0 (0–2 hits) | 107 s; 0 | 107 s; 0 |

- **Headless:** every piece fought by the bot in the browser; the full run from I-1 into the ending
  film; forced deaths (`window.damageFinalBossPlayer`) checked against the stretch restart. Dev hooks:
  `render_game_to_text`, `advanceTime`, `setFinalBossPiece(i, seg)`, `setFinalBossSegment`,
  `damageFinalBoss` (skip a stretch), `triggerFinalBossWorldFall`/`Handoff`/`Verified`/`Rescue`.

## 8. Open tuning questions for George

1. **How hard is NORMAL?** The bots are better than people at reading timing, so expect a first-time
   player to need a few tries at the roof run, the rally and the standoff, and fewer at the rooftops,
   the tower and the line. If those three feel easy, the knobs are the rooftop plank time
   (`ROOFTOP.plankOut`), the tower's light (`TOWER_SEGMENTS.light`) and the line's speeds
   (`LINE_SEGMENTS.speed`).
2. **Layers:** three on NORMAL, refilled at each new piece. Should a stretch (not just a piece)
   refill them?
3. **The roof run is the longest piece** (about 1.5–2 min). Cut UNCOUPLED shorter, or keep it as the
   warm-up's peak?
4. **The standoff's feints** cost a layer when you bite. Is that fair, or should a bite only restart the
   wait?
5. **Movement IV** is one long piece. A second piece (riding the night service, punching his strokes
   back?) would match the other movements, at the cost of length.
