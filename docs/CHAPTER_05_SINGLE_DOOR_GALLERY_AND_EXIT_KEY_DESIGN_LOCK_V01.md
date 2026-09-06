# Chapter 05 · The Museum of One Answer

## Single-Door Gallery + Exit Key — Design Lock V01

Status: LOCKED pending George review · 2026-08-12
Supersedes: the four-door archive corridor plan (Doors 1–4, two playable + two sealed shutters).

---

## 1. One-sentence premise

The museum has already collected Butch's whole journey. Only one door is
still playable — the Labyrinth — and the key inside it opens the sealed door
at the end of the archive corridor: the way out, toward the final boss.

## 2. What changed and why

The four-door hub (Labyrinth / Borrowed Grid / Echo City / Painted Country)
is cut to **one playable door**. A hub with three dead doors is a corridor
with scaffolding; the museum's reason to exist is no longer "route the
player into replays" but:

> **Before the final boss, the player walks past everything they have done —
> already filed, already labelled, already wrong — and one empty case the
> museum is saving for its one answer.**

This reuses the finished artifact models that Doors 2–4 orphaned
(`ReturnArtifacts.js`: bypass coil, Mara's cassette, common fold) and turns
the chapter into a recap-memorial instead of a menu.

## 3. Chapter flow (new)

```
LOBBY (Room 101)
  inspect + carry punched ticket A-1017            (unchanged)
  central case: "OBJECT PENDING CLASSIFICATION"    (stays empty — see §7)
        ↓  corridor doors read the carried ticket
ARCHIVE CORRIDOR
  Door 1 — THE LABYRINTH  (the only playable door)
  Bay 2  — vitrine: Three-District Bypass Coil     (Ch2, pre-displayed)
  Bay 3  — vitrine: Mara's Ordinary Morning Cassette (Ch3, pre-displayed)
  Bay 4  — vitrine: Common Fold                    (Ch4, pre-displayed)
  Niche opposite Door 1: Looking Fragment          (pre-displayed)
        ↓
  END WALL — THE EXIT DOOR (new, faces the player)
  locked until the Labyrinth is complete
        ↓  ARCHIVE EXIT KEY
CHAPTER COMPLETE → Chapter 6 handoff
```

The old `echo-city` phase chain, the `return`/`collapse` stub (Gate 6), and
the carry-and-display artifact loop are retired from the critical path. See
§8 for what happens to the desk-reclassification beat.

## 4. The Exit Door (corridor end wall, x = 42)

The corridor end wall is currently deliberately blank. It now carries the
chapter exit — the one door in the museum that faces the player head-on as
they walk east.

- **Look:** same walnut/brass institutional language as Door 1's terminal,
  but full-width (2.4 m) and double-height lintel. No number. A brass
  keyhole plate where the number would be.
- **Plaque (locked):** `FINAL ARCHIVE — SEALED PENDING THE LAST RECORD`
- **Plaque (unlocked):** `FINAL ARCHIVE — THE RECORD ADMITS ITS KEEPER`
- **Locked interact line:** "The lock is new. The door predates the building.
  The museum only made one key, and it is not on this wall."
- **With key:** `[E] UNLOCK THE FINAL ARCHIVE` → key turns, door swings into
  darkness, camera fade → chapter complete.

Fiction: this door is the museum's own exit *and* the door to the final
boss. One lock, one key, one meaning.

## 5. The Archive Exit Key (Door 1 reward)

The Labyrinth is untouched internally: 8 keys, 4 wings, final gate, statues.
The museum shell only consumes the existing `museum-labyrinth:complete`
message.

- On `direction.complete` (labyrinth), the museum grants the
  **ARCHIVE EXIT KEY** directly to the player's hand. No new embedded-side
  work: the eight labyrinth keys open its gates; the ninth was always the
  museum's.
- **Grant caption:** "Eight keys opened its gates. You walk out holding the
  ninth."
- **Archivist guide line (audio guide, on key grant):** "ACC. 17-0001 —
  EXIT KEY. Issued once. The archive does not issue duplicates."
- Model: new state `exitKey: { held: false }` on the direction-progress or
  chapter model; `direction.complete(labyrinth)` sets `held: true`.
- The old labyrinth carry-artifact step is cut: the player no longer carries
  the Looking Fragment back. The fragment is **pre-displayed** in its niche
  like every other artifact (§6). One door, one reward, no errands.

## 6. The gallery of the journey (pre-displayed exhibits)

All four chapter artifacts are installed and lit **before the player does
anything**. The museum has already filed the player's life; the labels are
the museum's cold misreadings, and the gap between label and truth is the
recap. Interact = read the accession card.

| Bay | Artifact (model exists) | Accession card (museum's reading) | Player-facing caption (what actually happened) |
|---|---|---|---|
| Lobby desk | Punched ticket A-1017 (Ch1, carried) | `RECOVERED TICKET — ORIGIN DISPUTED` | (existing inspect line, unchanged) |
| Niche @ Door 1 | Looking Fragment | `ACC. 17-0000 — STONE FACE, UNVERIFIED SIGHT` | "It watched you the whole way through. It is still watching." |
| Bay 2 | Three-District Bypass Coil | `ACC. 17-0002 — ILLEGAL GRID TAP, THREE DISTRICTS` | "You didn't tap the grid. You taught three districts to share." |
| Bay 3 | Mara's Ordinary Morning Cassette | `ACC. 17-0003 — DOMESTIC RECORDING, LOW VALUE` | "One ordinary morning, kept on tape. The museum priced it at nothing." |
| Bay 4 | Common Fold | `ACC. 17-0004 — PAPER FOLD, WATER DAMAGE` | "Folded paper, one cyan thread. It held a country together once." |

Implementation note: these are the existing `createReturnArtifact()` models
and niche/case hardware; the only change is that sealed-direction artifacts
start with `displayed: true` and are never carriable. The sealed shutters
(`_sealNumberedDoor`) at bays 2–4 are replaced by vitrines at the same x
positions (14/22/30/38 rhythm preserved).

## 7. The empty case

The lobby central case stays empty for the whole chapter:
`CENTRAL DISPLAY — OBJECT PENDING CLASSIFICATION`.

It is the museum's reserved slot for the one answer it intends to write
about Mara. Chapter 6 is the fight over whether anything ever goes in it.
Recommended ending beat (Chapter 6 side, noted here for continuity): the
final tableau cuts back to this case — still empty, or holding only a cyan
thread.

## 8. Desk reclassification (kept, retriggered)

The strongest lobby beat — the service desk reclassified as evidence, the
open register reading BUTCH, the phone that keeps ringing — currently fires
on return from Echo City. With Echo City off the route:

- Retrigger it on **labyrinth completion** (the moment the key is granted,
  or the next lobby visit — lobby visit preferred, so the player actually
  sees it: after the exit door unlocks, the player may walk back west
  through the lobby one last time, or the door unlock simply plays the beat
  in the corridor).
- Recommended: on `exitKey.held → true`, dispatch the reclassification so
  the next lobby entry runs the existing `reclassified` variant unchanged.
- The collapse stub (Gate 6) and the `return`/`collapse` phases are removed
  from the critical path. The stub geometry may stay as a dead corridor with
  its `SEQUENCE NOT YET INSTALLED` sign — now honest set dressing.

## 9. New chapter state machine (delta)

```
lobby → corridor            (carry ticket, unchanged)
corridor → corridor (loop)  (pass 2, unchanged, optional)
corridor → complete         (NEW: via exit door, requires exitKey.held)
```

- `PHASES`: drop `echo-city`, `return`, `collapse` from the required path;
  keep `complete`.
- `PHASE_TRANSITIONS.corridor = ['lobby', 'complete']`.
- `directionRegistry`: add `BORROWED_GRID` to `SEALED_DIRECTION_IDS`;
  `PLAYABLE_DIRECTION_ORDER` becomes `[LABYRINTH]` only.
- `allComplete` semantics: with one playable direction, labyrinth completion
  = all complete = exit door unlock condition (via `exitKey.held`).
- Door 2 terminal and its interaction are removed from `ArchiveCorridor`;
  bays 2–4 become vitrines (§6).

## 10. Player-facing string additions

```
exitDoorPlaqueLocked:   'FINAL ARCHIVE — SEALED PENDING THE LAST RECORD'
exitDoorPlaqueOpen:     'FINAL ARCHIVE — THE RECORD ADMITS ITS KEEPER'
exitDoorLockedNote:     'The lock is new. The door predates the building. The museum made one key, and it is not on this wall.'
promptUnlockExit:       '[E] UNLOCK THE FINAL ARCHIVE'
keyGrantCaption:        'Eight keys opened its gates. You walk out holding the ninth.'
keyAccession:           'ACC. 17-0001 — EXIT KEY. Issued once. The archive does not issue duplicates.'
completeLine:           'You filed nothing. You kept everything.'
chapterComplete:        'CHAPTER 5 COMPLETE — THE MUSEUM OF ONE ANSWER'
```

## 11. Test / regression impact

- `chapter05Model`: remove or bypass echo-city-only actions from
  `availableActions()`; add `exitKey` state and an `unlockExit` action
  (`corridor → complete`, requires `exitKey.held`).
- `chapter05DirectionProgress`: sealed-direction artifacts seed
  `displayed: true`; remove carry requirement for labyrinth completion
  (completion now grants the key directly).
- New focused tests: exit door refuses without key; labyrinth completion
  grants key; exit door opens with key and reaches `complete`; all four
  artifacts displayed on first corridor entry; desk reclassification fires
  once after key grant.
- Update: any test asserting `PLAYABLE_DIRECTION_ORDER.length === 2` or
  Door 2 terminal presence.

## 12. Open questions for George

1. Does walking through the exit door cut straight to the Chapter 6 entry,
   or to a short transition video from `NIGHTFALL_VIDEO_TRANSITION_HANDOFF`?
2. Should the exit door stay open behind the player (returnable museum) or
   seal shut once crossed (point of no return)? Recommendation: seal shut —
   "the archive does not issue duplicates."
