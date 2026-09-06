# CAR 03 // GEMINI VISUAL REDESIGN WORK PACKAGE

Status: `READY_FOR_GEMINI`  
Owner for this wave: Gemini  
Authority: visual concept only; Codex and the user select the direction  
Production implementation owner after selection: Qwen  

## 1. Mission

The Car 03 core gameplay model has passed automated and natural-input browser acceptance, but the user's first blind playtest immediately failed: the player could not understand the objective, the crowd mechanic, the scan danger, or the final two-person twist. The present visual build is therefore `CORE LOGIC PASS / HUMAN VISUAL-UX REJECT`.

Create **exactly three materially different, coherent visual directions** for Car 03. Each direction must visually demonstrate the same three gameplay moments:

1. Entry and first readable commuter group.
2. Player anchored into the group and protected from a drone scan.
3. Alarm aftermath: crowds disperse and the player forms a synchronized duo with the silent companion.

This is a concept-selection wave, not implementation. Do not change production code, gameplay logic, tests, thresholds, shared files, or repository history.

## 2. Read these sources first

All paths are relative to the repository root unless absolute.

1. `outputs/car03-human-audit/AUDIT.md`
2. `outputs/car03-human-audit/01-start.png`
3. `outputs/car03-human-audit/02-joined-slow.png`
4. `outputs/car03-human-audit/03-duo-sync.png`
5. `outputs/car03-human-audit/04-isolated-warning.png`
6. `docs/CAR_03_DESIGN_LOCK.md`
7. `docs/CAR_03_GEMINI_VISUAL_ART_REVIEW.md`
8. `src/assets/world_03_present_city_panorama_fullres.png`
9. `src/art/colors.js`

Do not treat the current block characters or literal photographic treatment as visual targets. They are failure evidence. Preserve the underlying narrative/mechanical relationships from the design lock.

## 3. Non-negotiable gameplay meaning

The single relationship is:

> coordinated movement is recognized by the system as a crowd

The visual design must make the following readable without explanatory paragraphs:

- The player is distinct from commuters but belongs to the same physical world.
- A commuter group has shared direction, spacing, and step rhythm.
- The group has a readable spatial footprint that the player can enter.
- One contextual E press means “match their pace,” not attack or talk.
- A drone scan is a directional threat; being isolated is risky, synchronized movement is safe.
- The silent companion is recognizable through posture and one restrained teal clothing detail, not a full-body recolor.
- The alarm visibly breaks large formations.
- The final pair becomes legible as a valid two-person pattern through matching gait, direction, and spacing.
- Completion feels like a visual/narrative payoff, not a debug state.

## 4. Required directions

Direction A must explore the recommended baseline:

### A. Illustrated 2.5D commuter carriage

- Painterly or clean editorial illustration, not pixel art.
- A real carriage interior with floor depth, doors, poles, seats, lighting, and foreground layers.
- The city panorama is simplified, color-graded, slightly defocused moving window scenery rather than the dominant visual plane.
- Medium-sized, readable commuters with restrained clothing variation and synchronized gait.

Directions B and C must be genuinely distinct alternatives, not palette swaps. They may explore, for example, a bolder graphic-animation language, cinematic silhouette staging, or another coherent non-pixel treatment. Both must still feel like the same train game and retain the present-day-city premise.

Do not propose:

- 16-bit or low-resolution pixel art as the default solution;
- the current photo-plus-block pairing;
- generic cyberpunk neon;
- UI meters as a substitute for visible behavior;
- a top-down HUD-heavy stealth game;
- a new mechanic, extra enemy, extra lane, dialogue exposition, or changed controls.

## 5. Required visual deliverables

Create an output directory:

`outputs/car03-gemini-visual-directions/`

For each direction, deliver one 1920×1080 concept sheet containing three clearly labeled 16:9 gameplay panels at a consistent 960×600-style camera:

- `direction-a.png`
- `direction-b.png`
- `direction-c.png`

Every sheet must show:

1. `ENTRY / READ THE FLOW`
2. `ANCHORED / MATCH THEIR PACE`
3. `ALERT / TWO IS A CROWD`

Also write:

`outputs/car03-gemini-visual-directions/DIRECTIONS.md`

For each direction, document only implementation-relevant facts:

- visual thesis in one sentence;
- camera and spatial composition;
- character silhouette language;
- carriage/background treatment;
- how entry, anchored, scan warning, companion, alarm, duo, and completion read;
- animation/motion principles;
- likely Phaser implementation cost: low / medium / high;
- main risk;
- why it is materially different from the other two.

Finish with a comparison table and one recommendation, but do not select on the user's behalf.

If the current Gemini/Antigravity environment cannot generate or save raster images, do not fake the boards with placeholder rectangles, ASCII, handmade SVGs, or production-code edits. Instead:

1. Write the complete `DIRECTIONS.md` specification.
2. Add three production-ready image-generation prompts under `IMAGE_PROMPTS.md`, one per direction, each explicitly requesting the three-panel concept sheet.
3. Report `IMAGE_GENERATION_UNAVAILABLE` clearly in the final response.

## 6. First-five-seconds teaching standard

Every direction must solve this sequence visually:

1. The eye finds the player immediately.
2. An isolated NPC is visibly scanned before the player is punished.
3. A synchronized commuter group passes close to the player.
4. Entering its footprint reveals one small contextual `E — MATCH THEIR PACE` cue.
5. Successful anchoring produces an immediate gait, formation, sound, and scan-response change.

Do not use permanent tutorial prose or expose QA/development labels.

## 7. Acceptance gate

Gemini's wave is complete only when:

- there are exactly three materially distinct directions;
- each direction covers all three required gameplay moments;
- the player, commuters, companion, drone, scan direction, anchored relationship, dispersal, and duo relationship are readable at normal size;
- the city and characters share one coherent material/lighting language;
- the train interior reads as a real navigable space rather than a photo frame;
- no source/production code was changed;
- the output is ready for the user to compare visually without reading a long explanation.

Stop after delivering the three directions. Do not implement the winner and do not ask Qwen or another model to continue.
