# NIGHTFALL — Shared Asset and Voice Handoff

Status: `ACTIVE`  
Owner: Codex curates and verifies; Jason and Carl select/produce within the locked visual direction.  
Updated: 2026-08-04

## 1. Ownership: nobody searches blindly

Codex owns the small, licensed source shelf, provenance manifest, conversion rules, and runtime import review. Jason owns the final compositional choice and custom visual production. Carl owns Paper World gameplay objects and decides which visual slot is actually needed by a playable puzzle.

This division prevents two failure modes: a generic online asset becoming a chapter landmark, or an artist losing half a day digging through asset sites instead of making the image only this game can have.

### Already ready for everyone

Local source library, outside this game repository:

`../NIGHTFALL_Source_Assets/`

- `Paper001`: shared paper grain, paper-cut edge, subtitle backing.
- `PaintedMetal006`: train enamel and mechanical wear base.
- `Asphalt027B`: wet city-ground base, only after painterly processing.
- `kloppenheim_07_puresky_2k.hdr`: Blender/AE night lighting only.
- Kenney UI and impact audio: editable source SFX, never bulk-import all files.
- Atkinson Hyperlegible: English subtitle and readable UI candidate.

All source URLs, licenses and exact local paths are in:

`../NIGHTFALL_Source_Assets/00_MANIFEST/NIGHTFALL_EXTERNAL_ASSET_MANIFEST_v01.md`

## 2. Jason: what he receives and what he must make

Jason receives the shared source shelf plus the existing character and opening work packages. He should **not** spend time hunting generic city props, paper texture packs, or train textures.

His original deliverables are the visual identity:

1. Butch/Mara silhouette boards and selected reference pack.
2. Visual Bible and AE painterly treatment template.
3. Opening animatic, then selected Seedance/AE shots.
4. Small reusable overlays: paper grain, dry-brush edge, pigment dust, cyan-thread, amber-signal and brush-boundary mattes.

If a shot needs a particular external material or model, Jason submits a one-line request containing: chapter/shot, camera view, needed role, preferred dimensions, and whether it is a background fill or landmark. Codex then finds 2–3 licensed candidates and records provenance. Jason makes the final visual choice.

## 3. Carl: what he receives and what he must make

Carl starts Chapter 4 with only flat coloured shapes and the shared `Paper001` texture. The first gate is the playable `KEEP` chain, not a pretty village.

Carl must create the chapter-defining assets himself or with Jason's treatment:

- the rewrite/page boundary;
- object, property/rule and creative-action `KEEP` markers;
- Mara's continuing drawing action;
- the castle/monster additions that visibly change the page;
- every incorrect-result state that explains what the player preserved.

After Carl supplies a playable whitebox and one 960 × 600 screenshot, Codex will curate only the needed ordinary backdrop geometry from the approved CC0 nature/village shelf. No large Chapter 4 model pack is downloaded or imported before that gate.

## 4. Runtime import contract

No raw ZIP, HDRI, Blender source, AE cache, full-resolution video master, or generative source board goes in Git.

Every runtime candidate must state:

| Field | Required value |
|---|---|
| owner | Jason, Carl, or Codex |
| chapter/shot | exact chapter and visual slot |
| role | background, character, landmark, interaction, overlay, SFX, subtitle or transition |
| source | original/custom or source URL + license |
| export | exact format, pixel size, alpha/audio, and target runtime weight |
| origin | Phaser anchor/pivot and expected depth |
| status | placeholder, review, approved, or shipped |

## 5. English voice plan

Do not scrape or clone a real actor's voice. The reference is a **casting brief**, then Jason uses the generation platform's licensed English voice options with original lines. Web research, if used, is for general performance vocabulary and technical constraints, not for copying a person's vocal identity.

### Fixed voice cards for first auditions

| Role | Voice identity | Performance boundary | Audition line |
|---|---|---|---|
| Butch | young adult, neutral North-American English, low-to-mid register, grounded and tired but never flat | short breaths; thinks before speaking; no gravelly action-hero delivery | `The line doesn't need to be perfect. It just needs to hold.` |
| Mara | young adult, neutral international English, clear mid register, direct and active | warm but not breathy; momentum and resolve, never passive mysticism | `Don't follow the map. Follow what it tries to erase.` |
| Archivist | precise, restrained, human-adjacent system voice | calm certainty; no villain growl; slight archival compression may be added later in AE | `Archive integrity failing. Contradictory records will be removed.` |

Jason produces a 10–15 second A/B audition for each role, with the same original lines and no named-actor imitation. George selects one voice per role before any final opening or chapter-film dialogue is generated. The selected voice identity stays fixed; only world reverb, radio treatment, paper texture or archive resonance changes.

## 6. Immediate requests

- **Jason:** make opening animatic and character silhouettes from the existing packages. Use the fixed audition cards above only for temporary audio.
- **Carl:** send one normal-entry whitebox screenshot and the first object/property `KEEP` route. Then request only the particular backdrop asset slots needed.
- **Codex:** maintain manifest, select/licence-check requested external filler assets, convert approved exports, and protect runtime budgets.

