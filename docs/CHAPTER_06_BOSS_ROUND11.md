# Chapter 6 · ALL WORLDS AT ONCE — the Conductor, rebuilt as a skill fight (round 11)

George's note (round 11): "boss关太没意思 要像split fiction一样考验操作 最好四个部分重构一下" —
the boss fight is boring; it should test execution like Split Fiction's boss fights; ideally
restructure all four parts.

## Why the old fight was boring

| Movement | What the player did | Why it was flat |
|---|---|---|
| I · Lost Property | Waited for a case to drop, waited for the orbiting lens to sweep its tag, pressed E. | Every case was ammunition; the only pressure was a train now and then. Waiting, not reading. |
| II · On the Bell | A step-by-step tutorial at 0.7× speed with the bell held, then a 4 s bell puzzle. | One beam lane to dodge; the puzzle was the whole movement. |
| III · Echo City | A quiz: two of four facts, then one of two framings, with the square frozen while choosing. | No execution at all. |
| IV · Painted Country | Hold E near paint, hold R anywhere. | "Open" only changed a label; nothing had to be timed. |

## What it is now

Each movement is a short set piece of **three escalating phases**. Each phase opens by **teaching its
new move by doing**: one slow, lone attack whose counter is the lesson, with one hint line. Then it
loops its patterns, tightening as his ticket falls. A cleared phase **staggers him and changes the arena**
(a 2.6 s interlude in which nothing can hit). The movement ends on a **finishing move that hands
straight into the next world**. Damage stops at each phase's floor, so every phase is played.

### The shared language

- **Verbs**: move (WASD / arrows / stick), **jump** (Space / A) clears ground rings and sweeps,
  **dash** (Shift / X / B / RB) has 0.26 s of i-frames: enough for a ring or a sweep, never for a
  train or a flood. Plus **one verb per movement** (E / Enter / click / X; Movement IV holds E and R).
- **Telegraphs** (`fightVisuals.js`): a *drop* is a ring that a disc fills; full means it lands. A *zone*
  fills from the edge in. A *wave* gathers, then spreads as a ring. A *sweep* shows its start line,
  then crosses the floor. A *train* lights its seam (amber for his trains, sepia for 1978 ones). Danger is drawn in the
  movement's danger colour; **Butch's chances** (a claim case, a true thing, wet paint) are **brass**.
  Every telegraph also has a sound.
- **Fairness**: Butch's hurt radius is small (0.34 m; 0.27 on STORY) and every edge is forgiving. Nothing can
  touch a standing Butch less than ~0.45 s after it appears (0.6 s on STORY; this is a test). Every hit was
  telegraphed (test). Everything lands on the visible floor. The street gap is a railing, and holes and walls are
  walked round, never fallen into by accident.
- **Checkpoints**: each phase is a checkpoint. A torn last layer on **NORMAL** restarts **only that phase**:
  his ticket goes back to the phase's start, and earlier phases and movements stay won. On **STORY** nothing is
  undone. STORY is still offered after three deaths in one movement.
- **STORY** keeps every pattern but slows and thins it (`DIFFICULTIES` in `finaleModel.js`): telegraphs
  ×1.4, flights and travelling hazards ×1.3 slower, gaps ×1.35, punish windows ×1.5, attacks marked `extra`
  left out, a smaller hurt radius, a jump that clears sooner (0.45 m vs 0.6 m), 6 layers.
- **Accessibility**: Reduce Motion turns every pulse into a steady fill (no telegraph blinks; nothing flashes
  above 3 Hz in any mode, which a test pins), and shake and the hit flash stay off. All words are DOM (world tags,
  subtitles, the phase stamp) and follow TEXT SIZE. **LOW GRAPHICS**: every new mesh is unlit (MeshBasic /
  a small shader), and impact shards are halved.
- **Input**: keyboard, mouse and **gamepad** (`readFinalePad` in `finaleControls.js`): left stick or D-pad
  moves, A jumps, B / RB dash, X acts (and holds to absorb in IV), Y holds to return (IV), LB listens (II), the right
  stick aims the lens (I), START pauses.

## Movement I · LOST PROPERTY — return to sender (`movements/lostProperty.js`)

The carriage wall laid flat: four panels, his trains in the seams. He throws the office's cases.
Most are **unclaimed** (red ring: dodge). One in each pattern is a **claim case** (brass ring).
Once it lands, its claim reads through the **punch-hole lens**, and a read claim punched (E / click)
flies back to him: **6**, or a **VOLLEY** for **10** if punched within **0.42 s** of landing (stand at the
ring's edge, lens on it, punch as it lands). The lens follows the mouse or right stick; otherwise it leads
Butch 2.6 m the way he faces.

| Phase | HP | Teach | Patterns (telegraph → counter) |
|---|---|---|---|
| 1 RETURN TO SENDER | 100→68 | One slow claim case beside Butch, nothing else: "stand by its brass ring, lens on it, E as it lands". | Tosses at Butch (1.15 s ring → step out). A **rolling barrage** of cases marching along a line through him (→ step out of its path). A **ring** of four round him, then one on him (→ leave through a gap). A train down the nearest seam (1.1 s seam glow → cross behind it). |
| 2 TRAINS IN THE SEAMS | 68→34 | A train in his seam and a claim across it: wait, cross behind, return. | Crossing trains on both seams. A claim across a seam with a train coming down it. **Ghost trains** (sepia seam glow; the train itself is seen whole only through the lens). His **OVERDUE stamp** shadows Butch's whole panel (1.5 s → leave the panel), with a train in the seam he must cross. |
| 3 UNCLAIMED | 34→0 | A stamp chain: his panel, then the next, a claim waiting in the safe one. | Rings with the claim among them, quicker throws (0.95 s), ghost and present trains together, stamp chains, barrages. **The 1978 layer bleeds through: the lens widens** (2.35→3.05 m). |

Phase changes are visible: phase 2 lights the seams, phase 3 widens the lens and thickens the fog. **Finish**:
the last return knocks him back and the lens opens under Butch, the fall into Borrowed Light.

## Movement II · BORROWED LIGHT — on the bell (`movements/onTheBell.js`)

Chapter 2's four-second bell and its **one-line rule** (one queued lamp per coloured line), on two roofs
over a street gap (`createBellArena`). An **amber** lamp lays its bridge on the bell, a **teal** lamp raises a
billboard (shelter), and a **rose** signal lights a lane. If he steps into a lit lane on the bell he stands in borrowed
light: cross and punch him (**10**, or **ON THE BELL 15** within 1.25 s of the bell, which means being at the bridge
head when it rings). On the off-beat his beams fire down the lanes he announced (a lit billboard shelters
the lane behind it, and he can't fire down his own lit lane). The gap is a railing, and a bridge folding under
Butch holds for its rider.

| Phase | HP | Teach | Patterns |
|---|---|---|---|
| 1 ON THE BELL | 100→70 | No beams until the first punch lands; one hint at a time (amber lamp → rose signal in his lane → wait at the bridge → cross and punch). | Beams down one lane on the off-beat (2 s warning → another lane or shelter). |
| 2 THE BELL SWINGS | 70→38 | The first bell swings its ring alone; the beams rejoin after it passes. | **Every bell swings a brass ring** out from him across both roofs (9 m/s, jumpable: SPACE as it passes), plus beams. |
| 3 THE LAST BELL | 38→0 | One bell of the new rule. | **He calls his lane late** (1.2 s after the bell, 2.8 s to light it, before his beams fire). **Every fourth bell his beams sweep all three lanes**: only a lit billboard (teal lamp) or his own lit lane is safe. The ring swings every other bell. |

Phase changes: the rain thickens, the rim light rises. **Finish**: the last punch cracks the bell, then the
ticket inspection, then Echo City.

## Movement III · ECHO CITY — two true things (`movements/echoCity.js`)

The argument about Mara, **fought**. Each exchange (`echoExchanges.js`, unchanged voiced content) is one
round. While he **voices his claim**, he **throws his two misreadings** at Butch: civic props, each tagged with
its text, that crack the terrace where they land. One that hits answers Butch "from the record" (the
rebuttal). The **two true things** come down from the lamps as lit record cards, 7.5–10 m apart. Strike one (E)
and Butch holds it. Strike the other within **3.2 s** and he says both: his voiced answer that holds both
lands (**18**) and the Conductor staggers. Hold only one and the window closes: Butch says the half answer, the
Conductor's voiced brush-off and one-line deflection follow, and the claim goes to the back of the queue.
Cracks are obstacles Butch walks round, so the square closes in as the argument goes on.

| Phase | HP | Teach | Patterns |
|---|---|---|---|
| 1 THE CLAIM | 100→64 | The first exchange: the hint says "two true things came down: E on one, then the other; dodge what he throws". | Misreadings at Butch (1.25 s), plain throws every ~2 s while the true things are out. |
| 2 ECHOES | 64→28 | Its first exchange. | **Every throw is echoed**: a second lands a beat later where Butch stood (→ keep moving). His **benches send a low ring** across the stones after a visible gather (→ jump). True things farther apart. |
| 3 THE SQUARE FALLS | 28→0 | Its exchange. | **The back of the terrace falls away** row by row (a crumbling edge warns; being overtaken costs a layer), and the true things drift. |

Phase changes: the dusk tint shifts and the collapse begins. **Finish**: after the last pair **he has no answer**.
The front edge lights, the collapse runs faster, and E at the front edge says it to his face (**10**), then the fall into the
Painted Country. A NORMAL checkpoint unsays what that phase had said.

## Movement IV · THE PAINTED COUNTRY — take back the colour (`movements/paintedCountry.js`)

Rosa's sheet. Everything he throws is pigment. His paint lands where its ring closes, then lies **wet for
1.9 s**: hold **E** beside it (or hold right mouse on it) for **0.35 s** to absorb it. **Dashing through one of
his sweeps** as it passes takes its colour too. Hold **R** (or left mouse) for 0.3 s to return the brush: the
stroke lands only while **his brush is dry**, the **2.5 s open beat after a wash**. Otherwise he paints it out
and flicks it back as paint to take again. A fuller brush cuts deeper (**7 / 15 / 24**) and **weighs more**
(−7% speed per colour), and a hit spills it.

| Phase | HP | Teach | Patterns |
|---|---|---|---|
| 1 TAKE THE COLOUR | 100→70 | One harmless colour lands beside Butch ("hold E"), then a wash far from him opens him ("hold R"). Both repeat until done. | Drops at Butch, single sweeps (jump them), a **wash** (a long 1.7 s band → leave it; it leaves wet colour behind and opens him). |
| 2 THE WASH | 70→40 | Two crossing sweeps: "jump it, or dash through it and take its colour". | Crossing sweeps, **indigo tiles that stand up as walls** (5.6 s), washes across Butch's row, faster sweeps. |
| 3 PAINTED OVER | 40→12 | A double wash: the safe band moves. | **Double washes**, fast crossing sweeps, a rain of three drops. |

Phase changes: the paper's light shifts, and his coat fills with returned colour. **Finish**: at 12 the night
service arrives; Butch jumps aboard, then the ending film, the archive card and the credits (unchanged flow).

## Measured (QA bot on the real rules, `tests/finalBoss/round11Sim.test.mjs`)

The bot (`fightBot.js`) reads telegraphs the way a player does (0.24 s reaction, attention for the four most pressing
warnings, occasional late reads) and plays the real directors. Median bot time per movement on NORMAL,
competent: **I ≈ 60 s, II ≈ 100 s, III ≈ 55 s, IV ≈ 75 s**, so **≈ 5 min of fight**, plus about 45 s of falls, the
ticket inspection, title cards and the departure. The learner profile takes **≈ 6.5–7 min** and dies about once
(mostly in II's last phase). A human first run hesitates where the bot never does; that is the 8–12 minutes asked for. Every movement
is won by both profiles on NORMAL and on STORY; STORY deaths for the learner are ~0.

## Tuning knobs

| Where | Knob |
|---|---|
| `finaleModel.js` `DIFFICULTIES` | `teleScale`, `flightScale`, `tempo`, `windowScale`, `thin`, `hurtScale`, `jumpClear`, `rollback`, `layers`, `respawnInv` |
| `conductorFight.js` | `FIGHT_BODY` (speed 6.3, dash 16 m/s × 0.18 s, dash i-frames 0.26 s, jump 8.7 m/s, hurt radius 0.34), `INTRO_SECONDS` 2.2, `INTERLUDE_SECONDS` 2.6 |
| `movements/lostProperty.js` | phase HPs, `CASE_DAMAGE` 6, `VOLLEY_DAMAGE` 10, `VOLLEY_S` 0.42, `CASE_FLIGHT_S` 1.15, `CASE_LIE_S` 3.2, `LENS_LEAD` 2.6, `LENS_WIDE` 3.05, `TRAIN`, `STAMP`, each phase's `loop` |
| `movements/onTheBell.js` | `PUNCH_DAMAGE` (= `LIGHT_DAMAGE` 10), `ON_THE_BELL_DAMAGE` 15, `ON_THE_BELL_S` 1.25, `BELL_WAVE`, `BELL_PRESSURE` (beam lanes and full sweeps per phase), `LATE_CALL_MS` |
| `movements/echoCity.js` | `PAIR_DAMAGE` 18, `SAID_DAMAGE` 10, `PAIR_S` 3.2, `TRUTH_LIFE_S` 8.5, `PROP_FLIGHT_S`, `HOLE_R`, `COLLAPSE`, the volley gap per phase, minimum distance between the true things |
| `movements/paintedCountry.js` | `PAINT_DAMAGE_BY_CHARGE` (finaleModel), `WET_S`, `ABSORB_S`, `RETURN_S`, `OPEN_S` 2.5, `BRUSH_WEIGHT` 0.07, `DROP`, `SWEEP`, `WASH`, `COVER` |
| `fightBot.js` | `BOT_SKILL` (for QA only) |

## QA

- Dev routes as before: `/final-boss.html?qa=conductor-1` … `conductor-4`.
- DEV hooks (`spectacleBattle.js`, DEV builds only): `render_game_to_text()` (now with `fight`: state, phase,
  attacks, the movement's own state), `advanceTime(ms)`, `finalBossBot(on, skill, seed)` (the bot plays the movement
  and the departure), `setFinalBossFightPhase(i)`, `finishFinalBossTutorial()` (skip a phase's teaching beat),
  `setFinalBossDifficulty(id)`, `finalBossMove(dx, dz)`, `finalBossHold('absorb' | 'return', on)`, `finalBossDash()`,
  `damageFinalBossPlayer(n)` (to reach a checkpoint), `damageFinalBoss(n)`.
- Tests: `tests/finalBoss/round11Kernel`, `round11Movements`, `round11Sim`, `round11Stage`.

## Open questions for George

1. **Death cost.** NORMAL restarts the phase (at most ~35 of a movement's 100 and about a minute of play). Is that the
   right sting, or should NORMAL keep round 6's "nothing undone" and leave the challenge to the patterns?
2. **Length.** Bot time is ≈ 5 min, so a person's first run should be about 8–12. If it plays short on your Mac, the cheapest
   knobs are the phase HPs (more returns per phase) and `tempo`.
3. **Movement II's last phase** is the hardest stretch (a late call, a sweep of all three lanes every fourth bell, the ring).
   Keep it as the spike, or ease it further (sweep every fifth bell, no ring)?
4. **Movement III's pair window** is 3.2 s on NORMAL with the true things 7.5–10 m apart. Tighter makes it a routing test;
   looser makes it read more like the argument.
5. **Volley and ON THE BELL** reward timing by ×1.5–1.7. Should they reward more (and make the late hit worth less)?
6. **Ghost trains** are drawn whole only through the lens, though their seam always glows sepia. Fair enough, or should the
   train itself show faintly outside the lens too?
7. **Movement IV's heavy brush** (−7% speed per colour). Keep the risk, or drop it so a full brush is only a reward?
