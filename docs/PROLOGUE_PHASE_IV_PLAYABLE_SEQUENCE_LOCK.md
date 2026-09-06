# NIGHTFALL CHAPTER 1 PHASE IV — PLAYABLE SEQUENCE LOCK

**Status:** PLAYABLE FLOW CORRECTION / READY FOR GREYBOX  
**Date:** 2026-08-06  
**Supersedes:** using a single mood frame as the Phase IV gameplay specification  
**Storyboard:** `docs/visual-references/prologue-iv-vi-narrative-v02/TF-V03-IV-playable-sequence-storyboard-v01.png`

## 1. Five-second read

From the entry, the player must immediately see:

1. **START:** the left carriage door where Butch enters;
2. **DISTURBANCE:** one unstable archive case above the right half of the room;
3. **GOAL:** a warm, visibly locked exit on the far right;
4. **CAUSE:** the case falls and the entire carriage leans with it;
5. **TOOL:** one horizontal luggage rail with three large physical saddle notches.

This is not a calibration panel. The room itself is the puzzle.

## 2. Core insight

> The train weighs the witness as well as the memory.

The first answer is deliberately incomplete. Moving the case until the carriage
looks level works while Butch remains near the entry. After he punches the case's
witness tag and walks to the exit, his own weight changes the balance and the
door misaligns again. The final solution is to leave the case on the opposite
side so case and witness counterbalance each other at the exit.

## 3. Spatial layout

```text
LEFT / START                                                   RIGHT / EXIT
┌──────────┬──────────────┬──────────────────┬──────────────────────────────┐
│ entry    │ left saddle  │ middle saddle    │ right saddle + falling rack │
│ Butch    │ final case   │ apparent answer  │ initial case impact          │
└──────────┴──────────────┴──────────────────┴──────────────────────────────┘
                         continuous luggage rail

UNDERFLOOR: amber route ───────── shared pivot ───────── cyan suspension
                               equalizing beam
```

- The exit stays visible from the start. It is a goal, not a surprise reveal.
- The rail is continuous but has three strong mechanical detents. The case
  snaps to them; the player never pixel-hunts for an invisible balance value.
- The middle detent is the convincing first answer. The left detent is the
  final counterweight when Butch stands at the right exit.
- The amber and cyan routes remain in the lower third as continuity from II and
  III. They are not additional controls.

## 4. Golden path — five beats

### Beat 1 — Enter and read the room

- Butch enters from the left.
- The right exit has the brightest warm pool of light.
- A loose archive case trembles in the overhead rack.
- No instruction text appears. The player only needs to walk into the room.

### Beat 2 — The case creates the problem

- The case falls onto the right saddle.
- In one synchronized 450–650ms reaction: floor/horizon leans right, right
  suspension compresses, equalizing beam tilts, lamp swings, cup rolls and the
  exit latch moves out of alignment.
- A short case-handle movement and local light establish that the case can be
  grabbed. Only nearby prompt: `[E] GRIP CASE`.

### Beat 3 — Apparent answer and narrative reward

- The player drags the case along the rail.
- Every detent gives immediate physical feedback. The middle detent levels the
  room while Butch remains in the entry half.
- After 500ms level hold, the blank witness tag flips open.
- Nearby prompt: `[E] PUNCH WITNESS TAG`.
- Punching sends one amber pulse through the existing route and plays a 1.5–2.5
  second window reflection of two people carrying one battery between them.
- The exit latch aligns, strongly suggesting that the player has solved it.

### Beat 4 — Twist: Butch is part of the load

- The player walks toward the right exit.
- The carriage slowly leans right again under Butch's changing position; the
  exit latch slides visibly out of alignment before he reaches it.
- The door gives one restrained mechanical refusal, not a red warning or text
  answer. Butch, lamp and rolling cup all direct attention back toward the case.
- No state is cleared. The punched tag remains punched.

### Beat 5 — Final inference and exit

- The player returns to the case and leaves it in the left saddle.
- While Butch is also left, the room may lean left. This is valid feedback, not
  failure.
- As Butch walks right, his weight progressively cancels the case moment.
- When the case is left, Butch is in the exit zone and the carriage remains
  level for 600ms: equalizing beam settles, both cyan suspension sides match,
  amber pulse reaches the latch and the exit opens.
- The punched case stays behind as a preserved memory. Butch exits right.

## 5. State model

```text
ENTRY
  → CASE_FALL
  → CASE_DRAGGABLE
  → FIRST_BALANCE
  → TAG_PUNCHED
  → PLAYER_WEIGHT_REVEALED
  → COUNTERBALANCED_AT_EXIT
  → COMPLETE
```

Persistent facts:

- `tagPunched` never resets after Beat 3;
- case position never resets after a refusal;
- door refusal never removes progress;
- the player can always return left and continue;
- no timer, death or full-room reset exists.

## 6. Feedback hierarchy

The player reads the solution in this order:

1. **carriage horizon/floor angle** — largest and fastest signal;
2. **exit latch alignment** — direct goal feedback;
3. **equalizing beam and suspension** — causal explanation;
4. **lamp and cup** — intuitive confirmation;
5. **amber/cyan paths** — continuity with earlier phases.

No gauge, objective checklist, red failure banner or central control panel may
replace these physical signals.

## 7. Difficulty and pacing

| Beat | Purpose | Intended time | Risk |
|---|---|---:|---|
| Entry | read start and goal | 3–6s | none |
| Fall | understand cause | 2–4s | none |
| First balance | learn drag and feedback | 10–20s | harmless experimentation |
| Punch + memory | narrative release | 3–5s | none |
| Twist | revise mental model | 5–12s | door refusal only |
| Counterbalance | apply insight | 10–25s | reversible |

Target total: **45–75 seconds** for a first-time player.

## 8. Greybox acceptance gate

Do not add final art until three first-time players can, without spoken help:

1. point to the start and exit within five seconds;
2. say the falling case caused the tilt;
3. discover case dragging within fifteen seconds of the fall;
4. understand why the middle position stopped working after walking right;
5. solve by counterbalancing Butch with the case;
6. explain that punching preserved the case rather than balancing it.

If players fail step 4, increase physical reaction and sightline back to the
case. Do not add a sentence that gives away the final position.

