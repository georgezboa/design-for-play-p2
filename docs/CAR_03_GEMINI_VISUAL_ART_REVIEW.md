# Car 03 Gemini Visual / Art Review

## Verdict

REJECT

The current build fails all primary visual hierarchy, page framing, and player readability standards required for an acceptable vertical slice. Across all 19 screenshots in `outputs/car03-acceptance/`, the 960×600 game canvas is horizontally displaced and clipped, with `playtest-01` showing a WebGL wireframe fallback grid and `playtest-02` through `05` rendering black empty screens. At actual scale, character sprites (14–28px tall) are crushed by a high-resolution photographic background, rendering every social stealth state visually unreadable without reading debug text.

## Evidence Matrix

| Screenshot Path | Intended State | Directly Observed State | Reviewability | Issue |
|---|---|---|---|---|
| `outputs/car03-acceptance/playtest-01-walked.png` | Free walking in Section I | Canvas displaced right; left side shows clipped page margin text; right side shows green WebGL fallback wireframe grid over black. | Not reviewable | WebGL canvas context/render failure; page container displaced right; HUD text cut off on left. |
| `outputs/car03-acceptance/playtest-02-caught-up.png` | Caught up to crowd | Canvas displaced right; solid dark container with a single gray pixel speck. | Not reviewable | Canvas render blank/black; page layout offset right. |
| `outputs/car03-acceptance/playtest-03-stopped-near-crowd.png` | Stopped near crowd | Canvas displaced right; dark container with single grey pixel speck. | Not reviewable | Blank canvas render; missing actors and background. |
| `outputs/car03-acceptance/playtest-04-cadence-started.png` | Cadence lock started | Canvas displaced right; dark container with single grey pixel speck. | Not reviewable | Blank canvas render; cadence lock visual ticks completely absent. |
| `outputs/car03-acceptance/playtest-05-anchored.png` | Player anchored to group | Canvas displaced right; dark container with three isolated pixel dots. | Not reviewable | Blank canvas render; crowd, hero, and anchor cues invisible. |
| `outputs/car03-acceptance/qa-entry.png` | Entry / Section I start | Canvas displaced right; photographic city panorama in middle; top is grey grid box; bottom is dark bar; hero is a 20px dark blob near bottom edge. | Partially reviewable | Canvas clipped on right; top shell frame broken; character scale unreadably small against photographic cityscape. |
| `outputs/car03-acceptance/qa-rule-demo.png` | Environment rule demo (stranger scanned) | Canvas displaced right; photo skyline visible; right edge clipped; tiny red/blue pixel specks near bottom lane railing. | Partially reviewable | Drone scan bracket invisible against bright background; NPC and drone unreadable at actual scale. |
| `outputs/car03-acceptance/qa-isolated-warning.png` | Isolated warning (drone scanning player) | Canvas displaced right; Coit Tower photo background; no visible red/amber scan cone or player ground warning bracket. | Partially reviewable | Exposure warning bracket and drone scan beam invisible at actual scale. |
| `outputs/car03-acceptance/qa-locked-recovery.png` | Drone lock & safe anchor recovery | Canvas displaced right; photo background; no red lock flash overlay visible; hero position unreadable. | Partially reviewable | `drawLockFlash` 80px red bar unnoticeable/absent; zero spatial recovery trajectory visual indicator. |
| `outputs/car03-acceptance/qa-joined-slow.png` | Anchored to slow crowd (NEAR lane) | Canvas displaced right; photo background; crowd and hero render as a 14px horizontal row of pixel ticks on railing line. | Partially reviewable | Zero visual indicator of anchor status; crowd resembles fence post noise; cadence/anchor bracket absent. |
| `outputs/car03-acceptance/qa-joined-fast.png` | Anchored to fast crowd (FAR lane) | Canvas displaced right; photo background showing bay/bridge; tiny pixel specks on upper lane. | Partially reviewable | FAR lane depth/scale separation unreadable; anchor state visually identical to unanchored walking. |
| `outputs/car03-acceptance/qa-group-transfer.png` | Group transfer in overlap zone | Canvas displaced right; photo background; crowd dots merge into a single line of pixels. | Partially reviewable | Overlap footprint bounds and transfer key cue completely absent visually. |
| `outputs/car03-acceptance/qa-lane-risk.png` | Unanchored in FAR lane under risk | Canvas displaced right; photo skyline; yellow wireframe box on bottom left corner of canvas; tiny dots on FAR lane. | Partially reviewable | Yellow debug bounding box artifact visible inside game canvas; exposure warning invisible. |
| `outputs/car03-acceptance/qa-companion-stranded.png` | Companion falling behind in Section III | Canvas displaced right; photo skyline; single tiny pixel dot trailing a row of crowd dots. | Partially reviewable | Companion silhouette and "falling behind" state identical to generic NPC noise; no rescue prompt. |
| `outputs/car03-acceptance/qa-companion-rescued.png` | Companion rescued into player group | Canvas displaced right; photo skyline; companion dot next to hero dot in crowd row. | Partially reviewable | Rescued state unreadable; 2×2px `LAMP_OK` pin invisible at actual screenshot scale. |
| `outputs/car03-acceptance/qa-crowd-dispersal.png` | Crowd dispersal alert in Section IV | Canvas displaced right; photo skyline with viaduct; crowd dots separated on railing line. | Partially reviewable | Dispersal looks like static frozen dots; zero screen-space alert visual effect or drone visual mode shift. |
| `outputs/car03-acceptance/qa-duo-sync.png` | Duo stealth lock with companion | Canvas displaced right; photo skyline with park; two tiny dots (hero + companion) on railing line. | Partially reviewable | Duo sync alignment invisible; no visual link, gait sync bracket, or spatial framing around pair. |
| `outputs/car03-acceptance/qa-complete.png` | Stage completion with fireworks | Canvas displaced right; sky contains three 10×10px orange/yellow pixel starburst dots; hero/companion unreadable. | Partially reviewable | Fireworks render as tiny pixel specks; no carriage shell lighting change or clear visual triumph focus. |
| `outputs/car03-acceptance/qa-reset-replay.png` | Reset to start state | Identical to `qa-entry.png`; canvas displaced right, Coit tower photo background, tiny pixel dots. | Partially reviewable | Inherits all entry framing, scale, and background hierarchy defects. |

## First Five Seconds

- **First (0–1s)**: The eye lands on the large black void filling the left 45% of the screen containing misaligned, truncated text (`/ A D . Lane shift...`), and the high-contrast photographic San Francisco city skyline background on the right.
- **Second (1–3s)**: The eye notices the unfinished grey grid box filling the top 50px of the canvas and the harsh horizontal seam between photographic panorama chunks.
- **Third (3–5s)**: The player searches for the player avatar and interactive entities, eventually discovering microscopic 14–28px pixel-art sprites sitting on the bottom railing line, visually indistinguishable from background window noise or fence posts.
- **Hierarchy Failures**:
  1. *Viewport & Canvas Framing Failure*: The `.hud` element in `car03.html` forces horizontal overflow, displacing the `#game` canvas to the right edge and cropping the rightmost 20% of play area off-screen.
  2. *Visual Priority Failure*: The photographic background asset (`backdrop-03`) dominates 95% of visual contrast, completely swallowing the 16×32px protagonist (`car03-hero`) and 14×28px NPCs (`car03-npc`).
  3. *Carriage Interior Frame Failure*: `createTrainShell` fails to establish an interior carriage window frame—its top border renders as an untextured grey box in QA warps and its side bezels fail to frame the play space.

## Mechanic Readability Matrix

| State | Rating | Evidence |
|---|---|---|
| free movement / cadence seeking | absent | Free walking hero sprite is 16×32px against photographic backdrop; no cadence seeking visual feedback (movement looks unanchored and floating). |
| valid group in range | absent | No visual footprint highlight, ground cue, or prompt appears when player steps into a group's 80px join range. |
| anchored / joined | weak | Hero aligns X position inside crowd row, but no unifying visual bracket, rhythm indicator, or floor connection ties them together. |
| low exposure | absent | The 2px ground bracket line (`drawGroundBracket`) is sub-pixel and invisible against complex photographic cityscape terrain. |
| exposure warning | absent | Translucent drone scan fan line (`drawScanBracket`) is washed out by bright city backdrop; player ground warning bracket is unreadable. |
| drone lock | absent | Red lock flash overlay (`drawLockFlash`) is a subtle 80px bar with low opacity that is unnoticeable; reset to safe anchor looks like an instantaneous frame teleport without motion/trail. |
| transfer between groups | absent | In `qa-group-transfer`, two crowds merge visually into one continuous line of pixels; zero visual cue for overlap or transfer opportunity. |
| companion rescue / synchronization | absent | Companion sprite's 2×2px `LAMP_OK` pin is sub-pixel at actual scale; rescue interaction provides no visual flash, tether, or join feedback. |
| crowd dispersal | weak | NPCs stop moving, but visually look like static fence posts; no scattering motion, panic visual language, or alarm color shift in environment. |
| two-person-pattern twist | absent | Hero and companion sit side-by-side as two tiny dots; no duo bracket, sync pulse, or visual connection establishing "two is a crowd". |
| completion | weak | Three tiny pixel starbursts float in sky in `qa-complete`; no carriage shell lighting change, silhouette turn, or clear success focus. |

## Art Direction Findings

- **Silhouettes**: At 16×32px (`HERO_SCALE = 1.2`) and 14×28px (`NPC_SCALE = 1.05`), sprites have zero readable silhouette language at actual 960×600 canvas resolution. Protagonist, commuters, companion, and drones all collapse into rectangular 15-pixel pixel blocks.
- **Value / Contrast**: Hero value (`CAR.HERO_BASE` `0xdfe7f2`, L*91.3) should be the brightest moving object, but because it occupies only 16×32px, high-contrast white and yellow buildings in photographic `backdrop-03` steal all visual focus.
- **Palette**: The strict 24-color `CAR` palette in `src/art/colors.js` is enforced for Phaser vector shapes, but `backdrop-03` is a photographic asset with thousands of unindexed colors, creating a harsh style clash between pixel sprites and photographic realism.
- **Scale**: Severe scale mismatch. The 600px tall realistic city panorama forces characters down to ~20px tall (1:30 scale ratio), which is far too small for low-pixel character readability.
- **Depth**: `LANE_FAR` (y=290) and `LANE_NEAR` (y=460) depth placement causes `LANE_FAR` actors to sit in the middle of San Francisco building facades, appearing as floating dots on rooftops/windows rather than walking on a ground deck.
- **Panorama**: `backdrop-03` photo chunks have visible vertical seam lines and fail to feel like a cohesive, stylized distant background.
- **Shell**: `createTrainShell` draws top (50px) and bottom (70px) dark rectangles, but top renders as a broken grey box in QA warps, and 24px side bezels fail to create an immersive train interior window frame.
- **Motion**: Playtest screenshots suffer from WebGL wireframe / black render bugs; QA freeze states show static pixel positioning without step gait, walk cycle, or scan pulse visibility.
- **UI**: `.hud` in `car03.html` is unstyled inline text that overflows left and gets cut off; keybinding overlays and in-game prompt badges are entirely missing.

## P0 — Acceptance Blockers

1. **P0-1: Viewport Layout and HTML Frame Correction**
   - *Affected layer/object*: `car03.html` (`#game`, `.hud`, `body`), `src/car03-main.js` canvas scale config.
   - *Screen-space specification*: Set `body { overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100vw; height: 100vh; background: #03050a; }`. Set `#game { width: 960px; height: 600px; margin: 0 auto; box-shadow: 0 0 24px #000000; }`. Ensure Phaser `scale.mode` centers the 960×600 canvas cleanly without page-level horizontal scrollbars or clipping.
   - *Mechanic state communicated*: All states (Frame & Viewport hierarchy).
   - *Screenshot acceptance test*: Clean centered 960×600 game canvas in all 19 acceptance screenshots, zero horizontal page scrollbar, `.hud` text neatly formatted above canvas.
   - *Primitives/assets*: Existing HTML/CSS and Phaser scale config.

2. **P0-2: Character & Actor Scale Increase (2.5× Scale Up)**
   - *Affected layer/object*: `src/cars/presentCity/presentCityArt.js` (`HERO_SCALE`, `NPC_SCALE`, `COMPANION_SCALE`, `DRONE_SCALE`).
   - *Screen-space specification*: Increase `HERO_SCALE` from 1.2 to 3.0 (sprite height 80px), `NPC_SCALE` from 1.05 to 2.6 (height 72px), `COMPANION_SCALE` to 2.6 (height 72px), and `DRONE_SCALE` from 1.0 to 2.2 (width/height 35px). Adjust ground Y baselines to `LANE_Y = [390, 490]` so actors walk on a clearly defined platform/carriage deck line.
   - *Mechanic state communicated*: Character readability, silhouette distinction, spatial relationship.
   - *Screenshot acceptance test*: Protagonist, companion, and crowd members clearly recognizable by silhouette and value at 100% screenshot scale without zooming.
   - *Primitives/assets*: Constants update in `presentCityArt.js`.

3. **P0-3: High-Contrast Ground Deck & Interior Carriage Window Shell**
   - *Affected layer/object*: `src/cars/presentCity/presentCityArt.js` (`createTrainShell`).
   - *Screen-space specification*: Rebuild `createTrainShell` using `CAR` palette primitives. Draw solid dark carriage interior walls (`CAR.VOID` `0x0a1015`), heavy window pillars (`CAR.ENAMEL_DARK` `0x263238`), and a solid train deck floor at y=490..600 (`CAR.VOID_LIFT` `0x17232b` with a 4px `CAR.STEEL_HI` `0x9fb7c0` floor trim line at y=490) framing the background window (y=60..490). Eliminate raw photographic cityscape showing under character feet.
   - *Mechanic state communicated*: World hierarchy, train shell stability vs. moving city panorama.
   - *Screenshot acceptance test*: Solid train carriage silhouette framing the window; actors walking on a solid carriage floor deck rather than floating over photo buildings.
   - *Primitives/assets*: Phaser Graphics primitives in `presentCityArt.js`.

4. **P0-4: High-Visibility Scan Cone & Foot Exposure Bracket UI**
   - *Affected layer/object*: `src/cars/presentCity/presentCityArt.js` (`drawScanBracket`, `drawGroundBracket`).
   - *Screen-space specification*:
     - Drone scan cone (`drawScanBracket`): Increase lineStyle width to 3px using `CAR.LAMP_WARN` (`0xe4c276`) with semi-transparent fill polygon (`alpha: 0.25`). In warning state (`exposureMs >= 900`), change fill to `CAR.LAMP_ALERT` (`0xe45a5f`, `alpha: 0.40`) with animated scan lines.
     - Foot exposure bracket (`drawGroundBracket`): Render a 70px wide ground bracket around player feet with vertical end ticks (14px height, 3px stroke, `CAR.LAMP_WARN`/`CAR.LAMP_ALERT`), narrowing inward as exposure accumulates toward `lockMs`.
   - *Mechanic state communicated*: Low exposure, exposure warning, drone lock.
   - *Screenshot acceptance test*: In `qa-isolated-warning.png` and `qa-lane-risk.png`, drone scan cone and player foot bracket clearly visible against background.
   - *Primitives/assets*: Phaser Graphics drawing in `presentCityArt.js`.

5. **P0-5: Distinct Visual Anchored & Cadence Seeking Cues**
   - *Affected layer/object*: `src/cars/presentCity/presentCityArt.js` (`drawCadenceTicks`, crowd rendering).
   - *Screen-space specification*:
     - Cadence seeking: Render rhythmic pulse brackets (`CAR.LAMP_OK` `0x75d4cd`, 3px stroke, height 18px) around player feet during the 350ms lock phase.
     - Anchored state: When `anchoredGroupId` is active, draw a unifying floor footprint bar (`CAR.STEEL_HI` `0x9fb7c0`, 3px line, alpha 0.5) spanning the crowd footprint underneath all group members, and align step animations.
   - *Mechanic state communicated*: Free movement vs. cadence seeking vs. anchored/joined.
   - *Screenshot acceptance test*: In `qa-joined-slow.png` and `playtest-05-anchored.png`, anchored group has a visible ground footprint bar unifying hero and crowd.
   - *Primitives/assets*: Phaser Graphics in `presentCityArt.js`.

6. **P0-6: Group Transfer & Overlap Footprint Indicator**
   - *Affected layer/object*: `src/cars/presentCity/presentCityArt.js` (overlap zone visualizer).
   - *Screen-space specification*: When player is in an overlap zone between two groups, draw an overlapping footprint bracket highlight (`CAR.LAMP_OK` alpha 0.6) and a contextual key hint `[E TRANSFER]` above player head (14px font, `CAR.HERO_BASE` text on `CAR.VOID_LIFT` background badge).
   - *Mechanic state communicated*: Transfer between groups.
   - *Screenshot acceptance test*: `qa-group-transfer.png` shows explicit visual footprint overlap and key prompt above hero.
   - *Primitives/assets*: Phaser Graphics and Text object in `presentCityArt.js`.

7. **P0-7: Companion Silhouette & Duo Sync Visual Connection**
   - *Affected layer/object*: `src/cars/presentCity/presentCityArt.js` (`createCompanionSprite`, duo sync rendering).
   - *Screen-space specification*:
     - Companion visual identity: Add a distinct scarf/chest trim in `CAR.LAMP_OK` (`0x75d4cd`, 6×8px) so companion is instantly recognizable from generic NPCs.
     - Duo sync state (`qa-duo-sync`): When `duo.active` is true in Section IV, draw a pair-framing bracket around hero and companion (`CAR.LAMP_OK` corner brackets, 3px line) and matching step pulse beneath their feet.
   - *Mechanic state communicated*: Companion rescue, crowd dispersal, two-person-pattern twist (duo sync).
   - *Screenshot acceptance test*: `qa-companion-stranded.png` shows companion with readable visual distinction; `qa-duo-sync.png` shows explicit duo sync bracket framing the pair.
   - *Primitives/assets*: Phaser Graphics and updated sprite texture in `presentCityArt.js`.

## P1 — High-Value Polish

1. **P1-1: Drone Lock Screen Flash & Recovery Trail**
   - *Affected layer/object*: `src/cars/presentCity/presentCityArt.js` (`drawLockFlash`, new recovery motion effect).
   - *Screen-space specification*: Make `drawLockFlash` fill the entire 960×600 canvas with `CAR.LAMP_ALERT` (`0xe45a5f`) at 0.35 alpha decaying over 450ms. Render a brief motion trail line from `lockedFromX` to `safeAnchorX`.
   - *Mechanic state communicated*: Drone lock & safe anchor recovery.
   - *Screenshot acceptance test*: `qa-locked-recovery.png` shows full-screen red warning tint and clear safe anchor marker.
   - *Primitives/assets*: Phaser Graphics overlay in `presentCityArt.js`.

2. **P1-2: Crowd Dispersal Panic / Scattering Motion Cues**
   - *Affected layer/object*: `src/cars/presentCity/presentCityArt.js` (Crowd member rendering in Section IV).
   - *Screen-space specification*: During `alertActive` in Section IV, crowd NPCs tilt/angle away from each other (`angle: ±15°`), show exclamation mark micro-icons (`CAR.LAMP_ALERT` 4×8px), and move to outer screen edges leaving hero & companion isolated.
   - *Mechanic state communicated*: Crowd dispersal.
   - *Screenshot acceptance test*: `qa-crowd-dispersal.png` shows dispersing crowd members visibly fleeing/separated from central duo space.
   - *Primitives/assets*: Sprite angle & position offsets in `PresentCityScene.js` / `presentCityArt.js`.

3. **P1-3: Stage Completion Lighting & Fireworks Scale Up**
   - *Affected layer/object*: `src/cars/presentCity/presentCityArt.js` (`createFireworkSprite`, scene background tinting).
   - *Screen-space specification*: Scale fireworks up to 3.5× size (`FIREWORK_SCALE = 3.5`), add ambient background glow pulse (`CAR.TUNGSTEN` / `CAR.LAMP_OK`), and turn hero/companion sprites to face window.
   - *Mechanic state communicated*: Stage completion.
   - *Screenshot acceptance test*: `qa-complete.png` shows prominent sky fireworks and warm interior glow.
   - *Primitives/assets*: Scale & graphics adjustments in `presentCityArt.js`.

## P2 — Defer

- Defer procedural weather / rain particles outside train window.
- Defer background train passenger shadow silhouettes in distant windows.
- Defer custom audio wave visualizers in HTML HUD.

## Do Not Change

- Pure logic model contract in `src/cars/presentCity/socialStealthModel.js` (`update`, `pressInteract`, `snapshot`, `drainEvents`, `applyQaWarp`).
- Single-press `E` interact priority chain (Rescue Companion -> Overlap Transfer -> Duo Sync -> Detach).
- 350ms cadence lock duration, 900ms warning threshold, 2200ms lock threshold, 2.0 recovery rate.
- 4-section spatial structure (0–1100, 1100–2500, 2500–3700, 3700–4800).
- 24-color strict `CAR` palette in `src/art/colors.js`.
- Zero numerical stealth meter, zero circular halo overlays.

## MiniMax Handoff Checklist

- [ ] Game canvas is centered at 960×600 without horizontal page overflow or clipping.
- [ ] Character sprites (hero, companion, NPCs) are enlarged to ~72–80px height and clearly readable against background.
- [ ] Train interior carriage frame and solid floor deck cover background raw photographic alignment under character feet.
- [ ] Drone scan fan and player foot exposure brackets use thick, high-contrast `CAR.LAMP_WARN` / `CAR.LAMP_ALERT` strokes.
- [ ] Anchored state draws a unifying footprint ground bar across joined group members.
- [ ] Group transfer overlap zone shows an explicit visual overlap region and `[E TRANSFER]` prompt.
- [ ] Companion features a distinct `CAR.LAMP_OK` scarf/accent and displays a duo sync framing bracket when paired in Section IV.
- [ ] Drone lock presents a full-screen red warning tint and clear safe anchor location indicator.
- [ ] All 19 QA/playtest screenshots render clean, non-wireframe, unclipped game views.
