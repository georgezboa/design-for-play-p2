# Chapter 1 · art still needed (Acts 2 and 3)

Nothing. Round 8: George painted the three Act 3 tiles the interim plates stood in for,
and a close-up of the platform for the farewell. The graded panorama stand-ins are gone;
`scripts/ch1-art/plates2-build.py` cuts these from the paintings:

| Painting | Plate | Crop (source px) | What the game does with it |
|---|---|---|---|
| A3-overlook | `act3/overlook.webp` | 214, 22, 1204, 930 | the orchard window zoomed out: the zoom from the house lands on the house painted here (matched to A3-orchard), Mara walks the lane and goes down the stair |
| A3-carriage | `act3/carriage.webp` | 0, 0, 1296, 1001 | our train waits on the approach, beside the buffer stop |
| A3-platform | `act3/platform.webp` (+ `platform-1978.webp`, a 1978 grade) | 216, 48, 1264, 976 | the train docks; Mara comes down the stair |
| A3-platform-close | `act3/platform-close.webp`, `close-case.webp`, `close-door-dark.webp` | 85, 0, 1326, 1024 | the farewell: the platform tile zooms into it; Butch leaves the case on the bench, Mara boards through the lit door |

## The edges, as measured on the plates

| Link | Edge | Declared | Measured |
|---|---|---|---|
| hawthorn → overlook | lane (1978) | 0.72 down | overlook left edge 0.7204 |
| overlook → platform | stair | 0.5 across | overlook bottom 0.5003 · platform top 0.5 |
| carriage → gap → platform | rail (the deck top) | 0.75 down | carriage 0.7502 · gap 0.75 · platform 0.75 |

The overlook's house region (the zoom into A3-orchard) is x 0.2283–0.6641, y 0.1422–0.578 of its tile. The farewell's camera move flies into the platform's bench ([0.1505, 0.4422, 0.22, 0.22] of the wide tile) and lands on the close-up's bench.

## Would be nice, not needed

- A3-platform-1978 (the same composition, "the same place in 1978"): the lens over the platform shows a 1978 grade of A3-platform today.
- A3-platform-close with the other train gone (the same view, the night and the hedge behind where it stood): her train could then
  be seen pulling away in the close-up. Today its leaving plays as the doorway going dark, the whistle and the Conductor's lines.
