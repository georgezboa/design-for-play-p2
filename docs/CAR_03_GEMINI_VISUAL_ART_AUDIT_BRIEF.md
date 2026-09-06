# Car 03 — Gemini Visual / Art Audit Brief

## Role

You are the visual direction and player-readability reviewer for Car 03. Treat the current build and screenshots as evidence, not as accepted work. Your job is to produce a precise implementation handoff for MiniMax. You are not the gameplay designer and you are not the implementation owner.

## Objective

Determine whether a first-time player can visually understand the Car 03 fantasy and every required state at actual play scale. Identify the smallest concrete art, composition, motion, and UI corrections that make the mechanic readable while preserving the locked design.

## Hard boundaries

- Do not edit source code, tests, screenshots, design-lock documents, or configuration.
- Do not change the mechanic, story canon, controls, state thresholds, or success/failure rules.
- Do not introduce a numerical stealth meter, yellow/red circular halos, or a large abstract overlay that replaces spatial play.
- Prefer Phaser primitives, the existing palette, and existing project assets. Propose a new asset only when primitives cannot communicate the state.
- Do not run Git mutations, install packages, create branches, commit, or push.
- Distinguish direct observations from inferences. If a screenshot is cropped, empty, or visually invalid, mark the intended state as **not reviewable** rather than inventing what it shows.

## Required reading and evidence

Read these completely before judging the work:

1. `AGENTS.md`
2. `docs/CAR_03_DESIGN_LOCK.md`
3. `docs/PRODUCT_STATE.md`
4. `car03.html`
5. `src/car03-main.js`
6. `src/cars/presentCity/PresentCityScene.js`
7. `src/cars/presentCity/presentCityArt.js`
8. `src/cars/presentCity/socialStealthModel.js` — only to understand state semantics
9. Every image in `outputs/car03-acceptance/`

For visual continuity only, compare against:

- `src/art/colors.js`
- `src/art/tutorialCarArt.js`
- `src/art/tutorialTrainRoomsArt.js`

Do not treat passing tests or filenames as proof that an intended visual state is actually visible.

## Audit questions

### 1. Frame and hierarchy

- Is the complete 960×600 game canvas visible in the page, without horizontal clipping or a side-by-side HUD shrinking the play area?
- Does the player see the protagonist, immediate crowd relationship, and threat before reading explanatory text?
- Is the train shell stable relative to the screen while the city moves behind it?
- Does the city panorama support the play space instead of overpowering small low-pixel characters?
- Are aspect scaling, safe margins, and HUD hierarchy robust enough for the supplied viewport?

### 2. Character and spatial readability

- At actual screenshot scale, can the player distinguish protagonist, ordinary commuters, companion, and drone by silhouette, shape language, value, and motion rather than color alone?
- Are foreground, middle, and background lanes immediately legible?
- Is the anchored relationship spatially visible, including the player's permitted micro-adjustment around a group?
- Does crowd dispersal look like a real spatial event—people separating or leaving—rather than characters merely freezing?

### 3. Mechanic-state readability

For each state below, decide whether it is visible without relying on debug text or a numeric meter:

- free movement / cadence seeking
- valid group in range
- anchored / joined
- low exposure
- exposure warning
- drone lock
- transfer between groups
- companion rescue / synchronization
- crowd dispersal
- two-person-pattern twist
- completion

Evaluate entrance cue, sustained cue, and exit cue where applicable. Check `render_game_to_text` meaning against what the screenshot actually shows.

### 4. Art direction and motion

- Does the work preserve the project's crisp low-pixel / low-poly direction?
- Are palette, contrast, scale, outline weight, and depth treatment coherent across characters, train shell, drone, and panorama?
- Do motion cues communicate cadence, surveillance, joining, danger, dispersal, and relief?
- Is feedback layered but restrained enough that it does not cover the playable spatial relationships?

## Required output

Return one Markdown report only, with no conversational preamble. Use this exact structure:

1. `# Car 03 Gemini Visual / Art Review`
2. `## Verdict` — `ACCEPT`, `CONDITIONAL`, or `REJECT`, followed by no more than five sentences
3. `## Evidence Matrix` — table with screenshot path, intended state, directly observed state, reviewability, and issue
4. `## First Five Seconds` — what the eye sees first, second, and third; name any hierarchy failure
5. `## Mechanic Readability Matrix` — one row for every mechanic state above, rated clear / weak / absent / not reviewable, with evidence
6. `## Art Direction Findings` — silhouettes, value/contrast, palette, scale, depth, panorama, shell, motion, and UI
7. `## P0 — Acceptance Blockers` — numbered, implementation-ready specifications
8. `## P1 — High-Value Polish` — numbered, implementation-ready specifications
9. `## P2 — Defer` — optional ideas that are not needed for acceptance
10. `## Do Not Change` — locked mechanic and art constraints MiniMax must preserve
11. `## MiniMax Handoff Checklist` — a short checkbox list that can be verified in new screenshots

Every P0/P1 item must specify:

- exact affected layer or object;
- desired screen-space size, placement, value/contrast, palette role, or motion timing where relevant;
- the mechanic state it communicates;
- a screenshot-level acceptance test;
- whether it can be done with existing primitives/assets.

Avoid vague advice such as “add polish,” “increase contrast,” or “make it more obvious.” When recommending contrast, name the object pair and the value relationship. When recommending motion, name amplitude/distance, duration, easing or rhythm, and trigger/exit condition. Keep the P0 set to the minimum viable visual correction needed for a trustworthy acceptance run.
