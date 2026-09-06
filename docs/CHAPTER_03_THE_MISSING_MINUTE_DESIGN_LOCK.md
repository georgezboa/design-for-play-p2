# CHAPTER 03 · ECHO CITY

## THE MISSING MINUTE — Short Narrative Design Lock

Status: **SUPERSEDED 2026-08-06** by `CHAPTER_03_MOVE_AS_ONE_NARRATIVE_LOCK.md`  
Target length: **12–15 minutes**  
Format: **single-square, fixed three-quarter camera, point-and-click narrative investigation**  
Runtime target: `car03-3d.html` real-time GLB scene

> Supersession note: George rejected the abstract missing-minute premise. Chapter
> 3 must first serve the whole-game Butch/Mara arc, use a concrete urge/objective/
> obstacle, and ground its language in work, bureaucracy and physical objects.
> This file remains only as discarded exploration.

---

## 1. Product promise

The player arrives in a civic square where the central clock refuses to strike
six. Everyone has repeated the same minute so many times that the city now
treats repetition as proof of innocence. Mara has vanished beyond the scanner
field and left one instruction:

> **Do not follow me. Follow the minute.**

Butch must inspect the square, listen to three conflicting inner faculties,
borrow one public behaviour, cross the surveillance field, and decide what the
missing minute means when he finds Mara at the fountain.

The intended feeling is a compact literary detective RPG: dense atmosphere,
world inspection, eccentric dialogue, internal contradiction, failure that
reveals character, and one consequential final conversation. It does not copy
another game's characters, prose, interface, lore, skill names, or art assets.

## 2. Four design pillars

1. **One place becomes deep.** The whole chapter uses the existing civic square.
   Progress changes what the player understands, not how many rooms exist.
2. **Thought is visible play.** Three internal voices interrupt inspections and
   dialogue with incompatible readings. The player chooses which voice to trust.
3. **Failure adds meaning.** A failed check gives a revealing line, an alternate
   clue, or a more difficult relationship. It never requires reload or blocks
   completion.
4. **The final answer is performed.** The investigation ends in a physical act:
   Butch walks a borrowed routine through the scanner, then answers Mara.

## 3. Scope boundary

### In scope

- One continuous square and the seven existing real-time GLB landmarks.
- Butch, Mara, two speaking residents, three internal faculties.
- Seven authored interaction sites, two conversations, one surveillance crossing, one
  final conversation, and three tonal ending variations.
- One dominant-faculty choice, clue-modified checks, a small case board, and a
  single borrowed behaviour routine.
- Approximately 1,400–1,800 words of authored text.

### Out of scope

- Combat, inventory grids, equipment, leveling, quest logs, day/night cycles,
  large dialogue trees, multiple districts, procedural quests, voice acting, or
  a full RPG character sheet.
- Random failure that can soft-lock the chapter.
- Generating or modeling a whole plaza. Existing real-time geometry remains the
  spatial source of truth.

## 4. Player verbs

The complete input vocabulary is intentionally small:

- **Click paving:** walk.
- **Click highlighted person/object:** inspect or talk.
- **Choose a dialogue/thought response:** commit to an interpretation.
- **Hold Observe on a repeating person:** learn their three-step behaviour.
- **Click the ground inside the scanner field:** perform the borrowed behaviour
  while pathfinding.
- **Right-click / Escape:** close the current conversation or inspection.

No separate pickup, crouch, sprint, attack, or rhythm input is introduced.

## 5. The three inner faculties

At the tram threshold, the first thought exchange asks what Butch trusts tonight.
The choice gives one faculty **2** and leaves the others at **1**. These are not
good/evil alignments; each is useful and each can be wrong.

| Faculty | Function | Voice |
|---|---|---|
| **PATTERN** | Reads systems, timing, repetition and contradictions. | Precise, cold, seduced by elegant explanations. |
| **TENDERNESS** | Reads fear, shame, attachment and what people avoid saying. | Intimate, forgiving, occasionally sentimental. |
| **NERVE** | Resists authority, notices threats and turns failure into momentum. | Blunt, physical, sometimes reckless. |

Checks are seeded and reset-deterministic. A check displays its faculty and
current chance before commitment. Clues can reopen failed **white checks**.
**Red checks** cannot be retried, but failure changes tone only; it never removes
the critical path.

Internal voices appear as short interruptions around the dialogue column, never
as three simultaneous paragraphs. Their lines should be specific reactions to
the current object, not generic hints.

## 6. Case board: one question, four evidence slots

The case board is not a quest list. It displays one sentence:

> **WHAT HAPPENED TO 5:59?**

Four evidence slots fill diegetically:

1. **The Unstruck Chime** — the clock mechanism moved, but the bell was prevented.
2. **A Ticket From Tomorrow** — Mara's tram ticket was punched at 6:01 while the
   square still reads 5:59.
3. **The Approved Gesture** — the scanner ignores repeated civic behaviour.
4. **The Wet Footprint** — someone crossed from the scanner field to the fountain.

The player needs any **three** to form the final theory. Finding all four unlocks
the most precise final response but is not required.

## 7. Spatial use of the real-time square

| Existing landmark | Narrative purpose | Interaction |
|---|---|---|
| Municipal tram | Arrival, faculty choice, Mara's impossible ticket. | Inspect conductor punch and listen to Mara's message. |
| Produce market stalls | Human testimony and safe behaviour tutorial. | Talk to Lio; observe the porter's repeated carry–wait–return loop. |
| Central clock | Persistent landmark and mystery source. | Inspect stopped face, maintenance hatch and suppressed chime. |
| Old Municipal Archive | Bureaucratic history and optional world detail. | Read a redacted ordinance defining “civic regularity.” |
| Scanner tower | Visible threat and mechanical explanation. | Watch its beam classify one repeated movement as safe. |
| Transit Ministry | Authority conversation. | Talk to Clerk Sava; obtain or fail into the ticket evidence. |
| Reunion fountain | Quiet final space and Mara confrontation. | Find wet footprint, ring the bell, speak to Mara. |

The clock remains visible from every required beat. Pale paving is traversable;
dark streets remain explicit negative space. The rails lead from arrival to the
clock, the clock points left toward testimony and right toward Mara, and the
scanner visually cuts the final route rather than creating an invisible wall.

## 8. Critical path and optional loop

```text
TRAM ARRIVAL
  → choose dominant faculty
  → inspect clock
  → MARKET or MINISTRY in either order
  → learn one approved behaviour
  → form theory with any 3 evidence slots
  → cross scanner field
  → find Mara at fountain
  → final interpretation
```

The Archive is an optional two-minute loop. It reconnects beside the clock,
reopens one failed PATTERN or TENDERNESS check, and unlocks a sharper accusation
against the city. It is rewarding but never mandatory.

## 9. Beat-by-beat pacing

| Time | Beat | Intensity | Player experience |
|---:|---|---:|---|
| 0:00–1:30 | **The Clock Refuses** | 0.20 | Arrive, hear Mara's message, choose a dominant faculty, see every major landmark. |
| 1:30–5:00 | **People Who Repeat** | 0.35 | Talk to Lio, safely observe the porter loop, learn that repetition defeats scrutiny. |
| 5:00–8:30 | **The Official Minute** | 0.55 | Inspect clock and Ministry in either order; dialogue checks produce ticket/chime evidence. |
| 8:30–10:00 | **Quiet Before the Beam** | 0.25 | Return to clock, review three clues, choose a theory and see Mara's fountain across the field. |
| 10:00–11:30 | **Perform Innocence** | 0.80 | Cross the live scanner field using the borrowed movement. Failure freezes the scene briefly and returns Butch to cover with new inner commentary. |
| 11:30–15:00 | **The Missing Minute** | 0.65 → 0.15 | Find Mara, resolve the emotional question, choose what to do with the evidence, hear the clock finally strike. |

The chapter deliberately rests before the scanner crossing. The final
conversation lowers mechanical tension while raising emotional stakes.

## 10. Required conversations

### Lio, produce seller

Lio has repeated the same sale for twenty-seven minutes because the scanner
marked his unscripted grief as “public instability.” He is funny, irritated and
ashamed that compliance works.

Dialogue purposes:

- Teach that NPC repetition is observable.
- Give the player a safe first white check.
- Establish that the city's categories are absurd but materially dangerous.

Example internal interruption:

> **PATTERN:** He is not repeating the sentence. The sentence is repeating him.

### Clerk Sava, Transit Ministry

Sava insists the clock is correct because all official systems agree with it.
They are not a villain; they are a frightened person whose identity depends on
the records being coherent.

Dialogue purposes:

- Deliver the impossible ticket through success or fail-forward.
- Put a human face on institutional denial.
- Let TENDERNESS and NERVE recommend opposite strategies.

### Mara, reunion fountain

Mara did not disappear because she was captured. She discovered the archive had
begun rewriting irregular citizens as “timing errors,” then used a copied civic
routine to step outside the scanner's memory. She left Butch a trail because she
wanted him to choose knowingly rather than merely rescue her.

The emotional question is:

> **Did you come to find me, or to make the story make sense?**

## 11. The scanner crossing

This is the only high-pressure physical test.

1. The scanner paints the paving with a slow teal sweep and shows one public
   porter crossing safely with a carry–wait–return routine.
2. Butch selects the learned routine on the case board.
3. A destination click across the field routes normally, but movement visibly
   inherits the three semantic phases.
4. Matching phases turn the scanner teal and produce restrained approval tones.
5. Entering without a learned routine turns the beam amber, then wine-red,
   freezes Butch for 350ms, and returns him to the clock-side cover.
6. Failure adds a faculty line and marks the safe phase boundaries more clearly.
   Nothing is lost.

This is not a rhythm game. The player chooses the correct behaviour and
destination; path traversal performs it semantically.

## 12. Final choice and endings

All endings reunite Butch and Mara and complete the chapter. The choice changes
the clock, scanner and closing exchange, not the next chapter's required state.

### A. **Erase the minute**

Butch destroys the ticket and Mara's trace. The scanner goes dark. The clock
strikes once, privately. Tone: intimacy over proof.

### B. **Return the minute**

Butch broadcasts the contradictory record from the fountain bell. Windows light
across the square as residents break their routines. Tone: truth over safety.

### C. **Carry the minute**

Butch keeps the evidence and leaves with Mara before deciding. The clock resumes
without striking. Tone: uncertainty accepted rather than solved.

All-four-evidence players may articulate the city's mechanism precisely. Three-
evidence players choose from more emotional interpretations. Neither is labeled
the correct ending.

## 13. Presentation rules

### Camera

- Fixed orthographic three-quarter composition for normal play.
- Gentle authored pushes only for first clock inspection, scanner crossing and
  Mara reveal; no free orbit in the narrative build.
- Buildings frame the square instead of occluding required hotspots.

### Dialogue UI

- One narrow lower-left dialogue column, leaving the square visible.
- Speaker line, 2–4 responses, small faculty interruptions at the outer edge.
- No giant center-screen boxes, parchment panels, portraits covering the world,
  or permanent objective list.
- Checks show faculty, stakes and chance in one line. Failure text remains short.

### Art and lighting

- Warm late-afternoon stone and dusty coral façades against cool oxidized teal
  civic machinery.
- Long shadows point toward the clock at entry and toward the fountain before
  the crossing.
- Interactive evidence uses restrained amber edge light; scanner authority uses
  teal when accepted and wine-red when threatened.
- Add grime, paper notices, leaves, crates and benches as grounded civic history,
  not random clutter.

### Audio

- Continuous distant tram hum, fountain water and sparse market murmur.
- The missing clock chime leaves a perceptible silence every sixty seconds.
- Faculty voices are text-only in this scope but receive distinct subtle tones.
- The final clock strike is the chapter's loudest sound.

## 14. Production content budget

| Content | Maximum |
|---|---:|
| Speaking external characters | 3 including Mara |
| Internal faculties | 3 |
| Authored interaction sites | 7 |
| Evidence items | 4 |
| Mandatory conversations | 2 plus Mara |
| Dialogue responses per node | 2–4 |
| Total authored words | 1,400–1,800 |
| Physical challenge | 1 scanner crossing |
| Ending variations | 3 tonal variants |

If a proposed feature exceeds this table, another feature must be removed.

## 15. Blockout gates before further art production

1. From arrival, a first-time player can identify the clock, market, Ministry,
   scanner and fountain without rotating the camera.
2. Every pale visible destination in the active square is actually reachable;
   dark streets reject immediately and consistently.
3. The critical path completes with any three evidence items and cannot soft-lock
   after any failed check.
4. A player can explain “repeated behaviour passes the scanner” before the final
   crossing without reading a tutorial paragraph.
5. The first complete playthrough lands between 12 and 18 minutes; a replay can
   finish in under 10.
6. At least one playtester voluntarily visits the optional Archive because the
   world composition or dialogue makes it attractive, not because of a task list.
7. After the ending, a player can answer both: “what happened to the minute?” and
   “why did Mara want Butch to investigate it?”

No additional hero environment model should be commissioned until these gates
pass with primitive characters and the current seven GLBs.
