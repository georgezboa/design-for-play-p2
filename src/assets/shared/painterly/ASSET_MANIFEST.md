# Shared Painterly Source Pack — v01

Status: **source assets / not yet approved for runtime integration**  
Created: 2026-08-04  
Generator: OpenAI built-in image generation  
Project use: internal NIGHTFALL production

These assets are intentionally independent of the unfinished Chapter 1–5 gameplay and final Butch/Mara designs. Do not wire them into a chapter until George approves the visual direction.

## Files

- `paper-texture-ivory-v01.png` — 1254 × 1254 warm ivory paper base. Low-contrast surface treatment; seamless tiling is not yet certified.
- `brush-mask-atlas-v01.png` — 1248 × 1248, 4 × 4 grid, 312 × 312 per frame. White painterly masks on black.
- `brush-mask-atlas-v01.json` — frame order and dimensions.
- `signal-feedback-atlas-v01.png` — 1248 × 1248, 4 × 3 grid, 312 × 416 per frame. Black-background additive VFX.
- `signal-feedback-atlas-v01.json` — frame order and dimensions.

## Locked visual semantics

- Cyan: relationship, witness, connection, successful mutual recognition.
- Amber: player action, transferred force, physical causality.
- Red: refusal, interruption, danger, broken connection.
- Warm ivory paper and graphite tooth: the shared rendering surface, not the identity of any one world.

## Integration rules

1. Keep these as shared source material; chapter-specific color grading and compositing belong in each chapter's presentation layer.
2. Use the two atlases with explicit frame dimensions from their JSON files. The black backgrounds are intended for additive/screen-style compositing.
3. Do not crop concept screenshots into characters or gameplay props.
4. Before runtime use, verify paper seams, VFX contrast over bright and dark scenes, and compression artifacts at the shipped resolution.
5. These files do not define Butch, Mara, world architecture, or mechanics.

## Generation prompts

### Paper texture

Square, low-contrast warm ivory cotton paper surface for a hand-painted 2.5D game; subtle fibers, graphite tooth, watercolor sizing, faint gouache scuffs, flat orthographic material, no objects, text, frame, vignette, or watermark; designed as a tileable candidate.

### Brush masks

Square grayscale technical asset sheet; exact 4 × 4 grid of sixteen isolated handmade graphite, gouache, watercolor, ink, chalk, stipple, paper-edge, bristle, dust, hatch, sponge, wash, scratch, impact, speed, and mist marks; pure white on pure black; no labels, borders, scene, or watermark.

### Signal feedback

Square VFX atlas; exact 3 × 4 grid on pitch black. Cyan relationship energy progresses sparks → connection → flow → knot; amber action energy progresses seed → pulse → impact → settle; red refusal energy progresses crack → interruption → slash → fading fragments. Painterly graphite/watercolor/gouache edges; no labels, borders, scene, or watermark.
