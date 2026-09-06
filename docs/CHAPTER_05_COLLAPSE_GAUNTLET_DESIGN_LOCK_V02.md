# Chapter 05 · The Museum of One Answer

## Single-Door Gallery + Collapse Gauntlet — Design Lock V02

Status: **FINAL LOCKED** · George-approved gameplay/art/timing authority · 2026-08-13
Supersedes: CHAPTER_05_SINGLE_DOOR_GALLERY_AND_EXIT_KEY_DESIGN_LOCK_V01
(four-door hub → one playable door, pre-displayed gallery, exit door).
V02 changes: the exit door needs the labyrinth's **8 keys**, and the corridor
becomes a **collapsing gauntlet** on the way to it.

Final-lock amendment (2026-08-13): this document now records the shipped
fixed-coordinate event table, first-run-clear warning windows, dark/red
lighting, wider Final Archive room, key-insertion animation, impact-only dust,
and hard-cut Chapter 6 handoff. Earlier language about player-following debris,
ambient airborne dust, and unresolved approval questions is superseded.

Final-boss routing amendment (2026-08-13): the Museum now freezes one
authoritative destination before the blackout. With fewer than five magic
stones it routes to the Conductor in `ALL WORLDS AT ONCE`; with all five it
routes to `BLACK KNIFE`. The fifth is the Museum's Black Knife Stone behind
the shattered evidence glass. Preloading and final navigation consume that same
frozen decision. Two route-specific intro films are now designed and awaiting
user-generated media; until those files are delivered, the existing black
handoff remains in place.

---

## 1. One-sentence premise

The museum has already collected Butch's whole journey. The moment the last
key leaves the Labyrinth, the Archivist starts tearing the archive down from
the outside — walls, ceiling, and debris from the other worlds fall in —
and Butch must dodge through the collapse, slot all eight keys into the
Final Archive door, and jump into the dark behind it: the final boss.

## 2. Chapter flow (V02)

```
LOBBY (Room 101)
  inspect + carry punched ticket A-1017            (unchanged)
  central case: "OBJECT PENDING CLASSIFICATION"    (stays empty — §8)
        ↓  corridor doors read the carried ticket
ARCHIVE CORRIDOR — calm pass
  Door 1 — THE LABYRINTH  (the only playable door)
  Bays 2/3/4 — pre-displayed vitrines (Ch2 coil, Ch3 cassette, Ch4 fold)
  Niche @ Door 1 — Looking Fragment (pre-displayed)
        ↓  enter Door 1
LABYRINTH (embedded slice, unchanged internally)
  8 keys · 4 wings · statues · final gate
  win line already on disk: "YOU WALKED OUT WITH EVERY KEY."
        ↓  museum-labyrinth:complete
ARCHIVE CORRIDOR — THE COLLAPSE GAUNTLET (new, §5)
  the archive is crushed from outside; world debris falls in
  player dodges east along the corridor, key ring in hand
        ↓
FINAL ARCHIVE DOOR (end wall, x = 42) — §6
  8 keyholes; slot all 8 keys while the collapse continues
        ↓  door opens onto pure darkness
THE JUMP — §7
  walk into the dark → chapter complete → Chapter 6 final boss
```

Retired from the critical path (unchanged from V01): the `echo-city` phase
chain, the carry-and-display artifact loop, the lobby `return`/`collapse`
stub route. Note: the old model's unused `collapse` phase name now finally
gets its real meaning — moved from the lobby stub to the corridor.

## 3. Why the keys come out of the Labyrinth

Inside the Labyrinth nothing changes: 8 keys open the wing connectors and
the final gate. The fiction already says the keys physically leave with the
player ("YOU WALKED OUT WITH EVERY KEY"). V02 makes that literal:

- On `direction.complete(labyrinth)` the player carries the
  **LABYRINTH KEY RING ×8** — eight dark stone keys on a brass ring.
- They are the only keys the Final Archive door accepts. The museum made
  eight and hid them in its own basement; the player spent the whole
  Labyrinth earning the way out.
- No "ninth key" (V01's single exit key is cut). One key ring, one door,
  one gauntlet between them.

## 4. The gallery of the journey (unchanged from V01)

All four chapter artifacts are pre-displayed and lit before the player does
anything; labels are the museum's cold misreadings, interact = read the
accession card.

| Bay | Artifact | Accession card (museum's reading) | Player caption (the truth) |
|---|---|---|---|
| Lobby desk | Punched ticket A-1017 (Ch1, carried) | `RECOVERED TICKET — ORIGIN DISPUTED` | (existing inspect line) |
| Niche @ Door 1 | Looking Fragment | `ACC. 17-0000 — STONE FACE, UNVERIFIED SIGHT` | "It watched you the whole way through. It is still watching." |
| Bay 2 | Three-District Bypass Coil | `ACC. 17-0002 — ILLEGAL GRID TAP, THREE DISTRICTS` | "You didn't tap the grid. You taught three districts to share." |
| Bay 3 | Mara's Ordinary Morning Cassette | `ACC. 17-0003 — DOMESTIC RECORDING, LOW VALUE` | "One ordinary morning, kept on tape. The museum priced it at nothing." |
| Bay 4 | Common Fold | `ACC. 17-0004 — PAPER FOLD, WATER DAMAGE` | "Folded paper, one cyan thread. It held a country together once." |

V02 addition — **the gallery dies with the room**: during the gauntlet the
vitrines shatter one by one as the player runs past (glass burst, case
light dies, artifact knocked dark). The museum loses its collection in
front of the player. This is the setup Chapter 6 pays off: the four
fragments the Archivist threatens in the boss fight are these same objects.

## 5. The Collapse Gauntlet

### 5.1 Trigger and staging — final timing authority

- Starts from the real embedded Labyrinth completion message
  `museum-labyrinth:complete`. The direction is marked complete, the embedded
  view closes, and Chapter 5 dispatches `labyrinthComplete` while the player is
  in `corridor`. That one action grants all 8 keys, changes the phase to
  `collapse`, re-enters the existing corridor scene in collapse mode, and
  places the player at `(x=14.8, z=0, yaw=-π/2)` facing east.
- The corridor is already wrong on the first controllable collapse frame:
  its earlier dark environment is restored, the whole room begins saturated
  red emergency pulses, the low industrial score begins, and the west return
  is physically blocked. There is **no ambient airborne dust field**.
- Archivist line (audio guide, distorted for the first time):
  *"THIS WING IS BEING WITHDRAWN. PROCEED TO THE FINAL ARCHIVE."*
- The corridor is 34 m (x 8 → 42). Three escalation zones, paced by player
  x-position, not timers — a slow player is never outrun by the script:

| Zone | x range | Pressure |
|---|---|---|
| I. Settling | 8 → 20 | Ceiling tiles and fixtures at authored fixed positions; long telegraphs; no world debris yet. |
| II. Breach | 20 → 32 | Wall chunks from the bay walls; vitrines shatter; first world-bleed objects punch through the ceiling. |
| III. Collapse | 32 → 42 | Continuous mixed hazards; the door zone itself is periodically targeted, forcing the player off the lock (§6). |

### 5.2 Hazard language

Every hazard uses the same three-step readability contract as the Chapter 6
boss (long warning, strong contrast, no flash reliance):

1. **Telegraph:** a large red triangular floor symbol with a pulsing outer ring,
   spreading cracks, and a crack/pressure sound. Ordinary debris warns for
   **1.30 s**; floor failures warn for **1.55 s**.
2. **Impact:** ordinary debris then falls straight down for **0.40 s** onto the
   authored marker. Only the actual landing emits a **0.68–0.88 s** dark,
   ground-hugging radial dust sheet and a small ballistic chip spray. Warning,
   falling, and time between impacts keep the air clean.
3. **Settle**: debris stays as permanent collision for the rest of the run
   (the corridor physically narrows behind the player).

Hazard table — the museum dies by its own fabric first, then the other
worlds start falling in (the Archivist's compression bleeding through, same
fiction as the Chapter 6 arena):

| Type | Look | Where |
|---|---|---|
| Ceiling tile + fixture | acoustic tile, fluorescent tube (sparks on impact) | Zone I+ |
| Wall chunk | olive wainscot + graphite plaster slab from bay walls | Zone II+ |
| Ch1 railway debris | brass relay plate, rail offcut | Zone II+ |
| Ch2 grid debris | cable spool, ceramic insulator | Zone II+ |
| Ch3 city debris | cobble/bench fragment, lamp-post head | Zone III |
| Ch4 paper debris | wet pigment slab that bursts into a paper shower | Zone III |

World-bleed objects are graybox-simple meshes in each chapter's material
color (brass / cyan-copper / city stone / paper white) — readable at a
glance, cheap to build, and they rhyme with the four vitrine artifacts the
player just watched shatter.

### 5.3 Damage, death, retry

- Player has **3 hits** per gauntlet run; each hit gives ~1 s invulnerability
  and a heavy camera dip (no rapid shake; accessibility toggles respected).
- Death: the player wakes at the Door 1 threshold, key ring and **all
  already-slotted keys kept** (§6). The corridor resets its loose debris
  but the story beat does not rewind — the Archivist does not gloat twice.
- The gauntlet must remain finishable by movement alone. Every corridor hazard
  uses the fixed coordinates in §5.4 and never samples, follows, or retargets
  the player. At the locked 3.2 m/s walk speed, continuing forward clears each
  landing on a first run; the player still reads the impact behind them.

### 5.4 Final authored trigger table

`triggerX` is when the warning appears. `impactX/Z` never changes at runtime.
Ordinary debris uses 2.80 m of lead, 1.30 s warning, and 0.40 s fall. Holes use
3.40 m of lead and open after 1.55 s.

| Beat | Zone | Kind / object | triggerX | impactX | impactZ |
|---|---:|---|---:|---:|---:|
| z1-ceiling-a | I | debris / ceiling tile | 13.85 | 16.65 | -0.72 |
| z1-fixture-a | I | debris / fixture | 15.55 | 18.35 | 0.78 |
| z1-hole-a | I | floor failure | 16.75 | 20.15 | -0.73 |
| z2-wall-a | II | debris / wall chunk | 19.40 | 22.20 | 0.72 |
| z2-rail-a | II | debris / rail plate | 21.35 | 24.15 | -0.76 |
| z2-ceiling-a | II | debris / ceiling tile | 23.15 | 25.95 | 0.70 |
| z2-hole-a | II | floor failure | 24.35 | 27.75 | 0.76 |
| z2-grid-a | II | debris / cable spool | 26.85 | 29.65 | -0.70 |
| z3-city-a | III | debris / city stone | 30.00 | 32.80 | 0.72 |
| z3-paper-a | III | debris / paper slab | 31.95 | 34.75 | -0.74 |
| z3-hole-a | III | floor failure | 33.25 | 36.65 | -0.74 |
| z3-wall-a | III | debris / wall chunk | 35.45 | 38.25 | 0.76 |

Final Archive pressure begins at player `x=38.75`. It uses a fixed repeating
centre → north (`z=-2.45`) → south (`z=2.48`) pattern. Each strike warns for
1.45 s and the next strike begins 3.15 s later. The wider room is approximately
8.4 m across, giving more than 4.5 m of lateral response at normal speed.

## 6. The Final Archive Door (end wall, x = 42)

- **Look:** full-width (2.4 m) walnut double door, double-height lintel,
  no number. **Eight keyholes in two brass columns of four** where a number
  plate would be. Each empty hole glows faintly; a slotted key turns and
  its glow goes dark.
- **Plaque (locked):** `FINAL ARCHIVE — EIGHT RECORDS, ONE DOOR`
- **Plaque (unlocked):** `FINAL ARCHIVE — THE RECORD ADMITS ITS KEEPER`
- **First locked touch (before Labyrinth):** "Eight keyholes. The museum
  hid its own keys in the basement and sealed the stairs behind them."

### 6.1 Slotting the keys under pressure

- Interact at the door: hold **E** to slot keys one at a time — ~0.6 s per
  key (held primary mouse is equivalent), with a visible first-person reach,
  align, turn and recoil; one hole goes dark. Full set ≈ 5 s of commitment.
- While slotting, Zone III hazards **deliberately target the door zone** on
  a readable rhythm: the player must release E, dodge the telegraph, and
  re-engage. Slotted keys persist (across dodges and across deaths).
- This is the chapter's whole thesis in one verb: the museum demands you
  stand still and file eight records; staying alive means letting go.

## 7. The Jump

- The eighth key turns: the door swings inward onto **pure black** — a
  light-swallowing void plane. No geometry, floor, ambient dust or smoke is
  visible beyond.
- Prompt: `[E] STEP THROUGH` at the threshold; walking in also works.
- The player steps/jumps into darkness → camera holds on black for ~1.2 s
  with the collapse rumble cutting to silence →
  `CHAPTER 5 COMPLETE — THE MUSEUM OF ONE ANSWER` → Chapter 6 entry.
- The door seals behind (point of no return): *"The archive does not issue
  duplicates."*

## 8. The empty case (unchanged from V01)

The lobby central case stays empty all chapter:
`CENTRAL DISPLAY — OBJECT PENDING CLASSIFICATION`. It is the museum's
reserved slot for the one answer it intends to write about Mara; Chapter 6
decides whether anything ever goes in it. (During the gauntlet the player
does not return to the lobby — the west end is choked with debris first,
which also scripts the no-return elegantly.)

## 9. Desk reclassification (kept, retriggered — unchanged from V01)

The lobby's best beat (desk reclassified as evidence, register open at
BUTCH, phone ringing) is still written into Chapter 5 state on Labyrinth
completion for continuity and save-state compatibility. The collapse west
blockade prevents returning to stage a new lobby beat during this final route;
the gauntlet and Chapter 6 handoff remain the critical path.

## 10. State machine delta (V02)

```
lobby → corridor             (carry ticket, unchanged)
corridor → corridor (loop)   (optional pass 2, unchanged)
corridor → collapse          (NEW: on direction.complete(labyrinth))
collapse → complete          (NEW: all 8 keys slotted + threshold entered)
```

- `collapse` state: `{ started, zoneI/II/III reached, hitsTaken,
  keysSlotted: 0..8, doorOpen, jumped }`.
- Key ring: `labyrinthKeys: 8` granted on `direction.complete(labyrinth)`;
  consumed one per slot at the door.
- `directionRegistry`: `PLAYABLE_DIRECTION_ORDER = [LABYRINTH]`
  (Borrowed Grid joins the sealed list); sealed-direction artifacts seed
  `displayed: true`, never carriable.
- Old lobby-stub `enterCollapse` action is removed/renamed; the stub keeps
  its `SEQUENCE NOT YET INSTALLED` sign as honest dead-end dressing.

## 11. Player-facing string additions

```
exitDoorPlaqueLocked:  'FINAL ARCHIVE — EIGHT RECORDS, ONE DOOR'
exitDoorPlaqueOpen:    'FINAL ARCHIVE — THE RECORD ADMITS ITS KEEPER'
exitDoorSealedNote:    'Eight keyholes. The museum hid its own keys in the basement and sealed the stairs behind them.'
keyRingCaption:        'YOU WALKED OUT WITH EVERY KEY. The door at the end of the corridor is counting.'
archivistCollapse:     'THIS WING IS BEING WITHDRAWN. PROCEED TO THE FINAL ARCHIVE.'
promptSlotKey:         '[E] HOLD TO SLOT THE KEYS — {n} / 8'
promptJump:            '[E] STEP THROUGH'
deathLine:             'The archive catches you. It files you back at the beginning of the hall.'
completeLine:          'You filed nothing. You kept everything.'
chapterComplete:       'CHAPTER 5 COMPLETE — THE MUSEUM OF ONE ANSWER'
```

## 12. Accessibility & difficulty safeguards (mirrors the Ch6 boss contract)

- Telegraphs ≥ 0.6 s, floor decals high-contrast, no flash-only warnings.
- No rapid screen shake by default; camera dip on hit is short and single.
- Hazards never spawn overlapping inescapably; door-zone targeting runs on
  a fixed readable rhythm the player can learn across retries.
- Death restarts only the gauntlet, never the chapter; slotted keys persist.
- The whole gauntlet is beatable by movement + the E hold alone.
- Exact completion trigger: door open animation ≥ 0.82, player `x ≥ 41.25`,
  and `|z| ≤ 1.30`. Chapter 5 holds black for 1200 ms, shows its completion
  card, and redirects to `/final-boss.html?from=chapter5` at 2400 ms. This hard cut is the locked
  Chapter 5 → Chapter 6 final-boss handoff.

## 13. Test / regression impact

- Model: labyrinth completion enters `collapse`; door refuses < 8 keys;
  slotting progresses 0→8 with interruption safety; death keeps slots and
  respawns at Door 1; 8th key + threshold → `complete`.
- Scene: vitrines shatter in zone order; hazards respect the telegraph
  contract; debris collision persists; world-bleed types appear in their
  zones only.
- Update any test asserting `PLAYABLE_DIRECTION_ORDER.length === 2`, Door 2
  terminal presence, or the old lobby-stub collapse route.

## 14. George decisions — resolved in the final lock

1. **Chapter 6 entry:** hard cut from the black hold to `/final-boss.html?from=chapter5`; no
   transition video in this sequence.
2. **Chapter 6 continuity:** Chapter 5 exposes the shattered four-object setup;
   Chapter 6 owns how those fragments reappear and must not change Chapter 5's
   completion contract.
3. **HUD:** diegetic only. The carried ring, eight physical holes, insertion
   animation and door state communicate key progress; no separate corner key
   counter is added.
