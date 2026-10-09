# Chapter 1 · art still needed (Acts 2 and 3)

These three Act 3 tiles have no painting yet. Until they do, the game uses the old
Bellwether panoramas, graded to the plates' palette by `scripts/ch1-art/plates2-build.py`
(and the orchard house plate set into the hill view), with the rails, stair and lane the
puzzle needs drawn over them in the same matte palette.

Paste each item into the batch (same format as `ch1-batch.json`), generate at 1536×1024,
save into `ch1/` under its `file` name and run `python3 -I scripts/ch1-art/plates2-build.py`.
Then add the new plate to its state in `src/chapters/nightService/acts/act3.js` and drop the
interim drawing in `art/act3Art.js` (the `ctx.plate` branch of drawOverlook, drawCarriageScene
or drawPlatform).

## The edges they must meet

| Item | Edge | Where (cropped frame) | Where (full 3:2 image) | Meets |
|---|---|---|---|---|
| A3-overlook | lane, LEFT | 0.72 of the height | 72% down | A3-hawthorn's right edge (1978) |
| A3-overlook | stair, BOTTOM | 0.55 across | 54% across | A3-platform's top edge |
| A3-overlook | the house | x 0.3–0.76, y 0.1–0.56 | 33–72% across | the zoom into A3-orchard |
| A3-carriage | rail, RIGHT | 0.75 of the height | 75% down | A3-gap's left edge |
| A3-platform | rail, LEFT | 0.75 of the height | 75% down | A3-gap's right edge |
| A3-platform | stair, TOP | 0.55 across | 54% across | A3-overlook's bottom edge |

The cropped frame is the middle 86% of the width (x 105–1431 of 1536), full height.

## Ready-to-paste items

```json
[
 {
  "id": "A3-overlook",
  "file": "A3-overlook.png",
  "act": "act3",
  "title": "The orchard house from the hill above it (the orchard window zoomed out)",
  "size": "1536x1024",
  "reference_images": [
   "ST1-a.png",
   "A3-orchard.png",
   "A3-hawthorn.png"
  ],
  "parent": null,
  "continues": {
   "from": "A3-hawthorn",
   "edge": "the lane continues from the right edge of A3-hawthorn"
  },
  "prompt": "The same orchard house as A3-orchard.png (white walls, the one lit upstairs window, apple trees, the gate and stone wall), seen from further away across a dark hillside at dusk: the house and its orchard fill only the upper middle of the picture, from 33% to 72% across and from 10% to 56% down, framed exactly as A3-orchard.png is, so that region looks like A3-orchard.png made small. In the foreground a country lane enters from the LEFT edge at 72% of the image height and runs about 39% of the way across the hill, where it ends at the top of a steep stone stair. The stair goes straight down the hillside and leaves the BOTTOM edge at 54% across (a station platform lies far below, out of the picture). Far below on the right, one small platform lamp and a glint of rails. No people and no animals in the picture (characters are added separately). FRAMING: landscape 3:2. The left 7% and right 7% will be cropped to a 1.3:1 frame, so keep everything important inside the middle 86% of the width. STYLE: hand-inked editorial illustration; fine dip-pen linework with delicate cross-hatching in the shadows; flat matte gouache colour fields; limited palette of ink black (#0E0C0B), deep navy (#1B2A3A), dark teal (#23413F), walnut brown (#4A3222), aged matte brass (#8A6A3C), ivory paper (#E9DFC8) and one warm amber (#E3A34E) practical light; theatrical stage-set composition with large areas of near-black negative space; one warm light source makes a sharp-edged pool of light and everything outside it falls quickly into shadow; realistic proportions and consistent scale; subtle paper grain, slightly uneven ink. No glossy highlights, no airbrushed gradients, no 3D render look, no photorealism, no anime, no text, no letters, no numbers, no signage words, no watermark. Match the style, palette, line quality and lighting of the reference image ST1-a.png exactly.",
  "notes": "Edges the game links: lane LEFT edge at 0.72 of the height (from A3-hawthorn); stair BOTTOM edge at 0.55 across the cropped frame (to A3-platform). The zoom from this picture into the house lands on the box x 0.3–0.76, y 0.1–0.56 of the cropped frame: keep the house there."
 },
 {
  "id": "A3-carriage",
  "file": "A3-carriage.png",
  "act": "act3",
  "title": "Our line at night, on the embankment before the viaduct",
  "size": "1536x1024",
  "reference_images": [
   "ST1-a.png",
   "A3-gap.png"
  ],
  "parent": null,
  "continues": {
   "from": "A3-gap",
   "edge": "its rails run on into the left edge of A3-gap"
  },
  "prompt": "A single railway line on the high stone approach to the viaduct at night, under the same moonlit, rain-streaked sky as A3-gap.png and at the same scale (a railway carriage is about 30% of the picture's width); the line runs from a timber buffer stop near the LEFT edge to the RIGHT edge, where it becomes the stone viaduct deck of A3-gap.png (same stone, same iron railing along the near side, same height): the rails reach the RIGHT edge at exactly 75% of the image height, and the deck top is level all the way across. A tall signal post with one small warm lamp stands beside the line near the right; dark forested hills behind, the valley opening to the right. The line itself is empty (the train is added by the game; leave the left half of the track clear). No people and no animals in the picture (characters are added separately). FRAMING: landscape 3:2. The left 7% and right 7% will be cropped to a 1.3:1 frame, so keep everything important inside the middle 86% of the width. STYLE: hand-inked editorial illustration; fine dip-pen linework with delicate cross-hatching in the shadows; flat matte gouache colour fields; limited palette of ink black (#0E0C0B), deep navy (#1B2A3A), dark teal (#23413F), walnut brown (#4A3222), aged matte brass (#8A6A3C), ivory paper (#E9DFC8) and one warm amber (#E3A34E) practical light; theatrical stage-set composition with large areas of near-black negative space; one warm light source makes a sharp-edged pool of light and everything outside it falls quickly into shadow; realistic proportions and consistent scale; subtle paper grain, slightly uneven ink. No glossy highlights, no airbrushed gradients, no 3D render look, no photorealism, no anime, no text, no letters, no numbers, no signage words, no watermark. Match the style, palette, line quality and lighting of the reference image ST1-a.png exactly.",
  "notes": "Edge the game links: rail RIGHT edge at 0.75 of the height (to A3-gap's left edge). Our train waits on the left third."
 },
 {
  "id": "A3-platform",
  "file": "A3-platform.png",
  "act": "act3",
  "title": "Bellwether station: the platform at night",
  "size": "1536x1024",
  "reference_images": [
   "ST1-a.png",
   "A3-gap.png",
   "A3-orchard.png"
  ],
  "parent": null,
  "continues": {
   "from": "A3-gap",
   "edge": "the rails continue from the right edge of A3-gap"
  },
  "prompt": "A small country station at night, seen side on from across the line, at the same distance and scale as the viaduct in A3-gap.png: a railway carriage would be about 30% of the picture's width and a standing person about 5% of its height. In front, our railway line runs on the same stone deck as A3-gap.png (same dressed ochre stone, same thin iron railing on posts) and enters from the LEFT edge with its deck top at exactly 75% of the image height, ending at a small timber buffer stop about 86% across. Behind it a long low stone platform: its near edge at about 71% of the height, just behind the deck's railing, its far edge at about 58%, its walking surface between. Behind the platform a second track at about 56% of the height, where another train will stand. A narrow, steep timber stair comes down from the TOP edge at 54% across and lands on the far side of the platform at about 59% across (it comes down from the hill of A3-overlook). On the platform: a short wooden bench from about 24% to 30% across; one lamp post at about 78% across with the one warm amber light in the picture, about 12% of the height tall; a station nameboard on two short posts with a blank dark enamel plate from about 33% to 44% across at about 59% of the height (the game letters the name). Above, the dark roofs and chimneys of Bellwether and the night sky. Leave the platform and both tracks empty. No people and no animals in the picture (characters are added separately). FRAMING: landscape 3:2. The left 7% and right 7% will be cropped to a 1.3:1 frame, so keep everything important inside the middle 86% of the width. STYLE: hand-inked editorial illustration; fine dip-pen linework with delicate cross-hatching in the shadows; flat matte gouache colour fields; limited palette of ink black (#0E0C0B), deep navy (#1B2A3A), dark teal (#23413F), walnut brown (#4A3222), aged matte brass (#8A6A3C), ivory paper (#E9DFC8) and one warm amber (#E3A34E) practical light; theatrical stage-set composition with large areas of near-black negative space; one warm light source makes a sharp-edged pool of light and everything outside it falls quickly into shadow; realistic proportions and consistent scale; subtle paper grain, slightly uneven ink. No glossy highlights, no airbrushed gradients, no 3D render look, no photorealism, no anime, no text, no letters, no numbers, no signage words, no watermark. Match the style, palette, line quality and lighting of the reference image ST1-a.png exactly.",
  "notes": "Edges the game links: rail LEFT edge at 0.75 of the height (from A3-gap); stair TOP edge at 0.55 across the cropped frame (from A3-overlook). Butch walks the platform at 0.7 of the height from 0.44 to the bench at 0.24 across; Mara comes down the stair and boards the far train at 0.71 across, 0.57 down; our train docks centred at 0.42. A 1978 version (A3-platform-1978, \"the same place in 1978\", same composition) would let the lens show it."
 }
]
```
