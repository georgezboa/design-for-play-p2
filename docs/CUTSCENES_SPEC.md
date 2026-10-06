# NIGHTFALL — In-engine cutscenes (replaces the eight films) · v1, 2026-10-06

Decision (George, 2026-10-06): the eight pre-rendered films (`public/cinematics/*.mp4|webm`) are replaced by short cutscenes drawn in the game's own ink language. Reasons, from alpha round 4:
- Butch looked different in every film.
- The 3D/anime look clashed with the 2D game.
- Several captions contradicted the story bible: "Neo-Kyoto"; "the other end of a promise"; 4-5 recapped Echo City; the ending showed Mara's face.

Canon is `docs/STORY_BIBLE.md`. This file is the script. Where the two disagree, the bible wins.

## Look and rules (all cutscenes)
- **Style:** Chapter 1's ink-panel language, the same bar as the title scene (`src/shell/titlePlate.js`, `titlePlateArt.js`) and Ch1 Act 0.
  - Flat teal and navy shapes, ivory ink outlines, amber lamplight, walnut and brass, paper grain.
  - Use `src/chapters/nightService/art/ink.js`, `figures.js`, `painter.js` and the title painters. Import them read-only, or copy into the cutscene module if you need changes.
  - Each destination world gets its own palette inside that language:
    - Ch2: rain rooftops, teal and amber.
    - Ch3: Echo City square in warm afternoon stone.
    - Ch4: pencil on paper with gouache blooms.
    - Ch5: museum walnut and brass in the dark.
    - Ch6: the worlds stacked as panels.
- **Butch:** one design everywhere, the lost-property clerk from Ch1 and the title: cap with brim, long coat, lamp. Same proportions as `figures.js`.
- **Mara (the Mara ahead):** always the rose scarf, always turned away or in silhouette. **Her face is never shown**, not even in the ending.
- **The Conductor:** the finale's design (cap with badge, brim shadow over lamp-lit eyes, grey moustache, watch chain). Keep it consistent with `src/chapters/finalBoss`.
- **Shots:** 4–7 per cutscene. Each is one painted panel with slow camera motion (pan, push-in, parallax) and one or two animated elements: rain, a lamp swaying, a train moving, pages turning, paint blooming. Joins between shots, in order of preference:
  1. a panel slide, as in Ch1's window swap;
  2. an ink wipe;
  3. a crossfade.
- **Length:** 25–40 s each, except the ending at 40–55 s.
- **Captions:** the game's caption bar (`.nf-caption` look). 1–2 lines each, 3–5 captions per cutscene, about 4 s each, all text below.
  - **Voice:** none. The old films' voice lines go with the films.
  - **Text size:** captions follow the TEXT SIZE setting.
- **Sound:**
  - **Music:** only cleared tracks. Check `docs/MUSIC_REPLACEMENT_PLAN.md` and each `public/assets/music/*/ASSET_MANIFEST.md`; never use a track listed as uncleared. Play through the shared music director (`src/shared/musicDirector.js`), with fades.
  - **Effects:** light procedural sounds via WebAudio, the same way Ch1's `audio.js` makes them: rail rumble, a bell, a punch, paper, rain.
- **Player control:**
  - **Skip:** HOLD TO SKIP, as today (`holdToSkip.js`).
  - **Pause:** the pause menu and a hidden tab pause the cutscene.
  - **Reduce Motion:** no camera moves; shots crossfade.
  - **LOW GRAPHICS:** fewer particles, and lower internal resolution if needed.
  - **Scaling:** scales to any window; tested at 1920×1080, 1600×900, 1280×720 and 900×1200.
- **Integration:** keep the existing API, so no call site changes.
  - `playCinematic({ id, src, onComplete, preloadChapterId, … })`, `navigateAfterCinematic(...)`, `CINEMATICS.*`, and `finalBossRoute.js`'s `cinematicId` / `cinematicPath`.
  - These resolve to a cutscene by id (or by the old `src` name). The preload gate still holds the destination until its chapter is ready; show the cutscene's last shot, or a "the night service is arriving" hold, while it waits.
  - Once every cutscene is in, delete the mp4/webm files and the video code path. That saves about 70 MB.

## The eight cutscenes

### 1. `opening`: before Chapter 1 (title → NEW GAME)
Purpose: who Butch is, what the night service is, and the case.
1. A night viaduct in rain. The night service crosses, lit windows in a row. *"The night service runs between stored places. The archive calls it the last line."*
2. Inside: the lost-property carriage. Shelves of tagged things (umbrellas, hat boxes, a birdcage, letters). Lamplight swings with the carriage. *"Everything left on board comes here, to Lost Property."*
3. Push-in on one case on the top shelf: a battered orchard case, with a paper tag reading CLAIM 1978-0412 · ORCHARD CASE · UNCLAIMED.
4. Butch at his desk under the lamp, turning the tag over. On the back, in faded ink: M. VELEZ · BELLWETHER. *"The clerk, Butch, had filed it a hundred times. He could not leave it alone."*
5. His head drops onto his arms; the lamp burns low. The carriage rocks him to sleep. *"The line keeps running while someone rides it."*
6. Hand-off: cut to black, which flows into Ch1 Act 0. Its first line is the Conductor's "Wake up, Lost Property."

### 2. `chapter1To2`: Ch1 → Ch2 BORROWED LIGHT
Ch1 ended at Bellwether: two true things, the city room and the orchard; "She's always one stop ahead."
1. The night service pulls away from Bellwether at night. The orchard case is back on the rack. *"The orchard case stayed on the rack. Her other ticket did not."*
2. Close on Butch's hand: a punched city-line ticket, CITY LINE · ONE WAY · 1978.
3. Through the window, the fields turn into a city of rooftops in rain. Its signs flicker on in sequence, like a bell. *"The city ahead ran on light it had borrowed from the train."*
4. Arrival: CITY TERMINAL, a rooftop platform in the rain. On a far roof, a woman in a rose scarf turns away and is gone. *"One roof ahead. Always one roof ahead."*

### 3. `chapter2To3`: Ch2 → Ch3 ECHO CITY
Ch2 ended with the letter on the bench, "Butch — … keep moving.", and the boarding.
1. The departing train. Butch has just made it, and a corner of his coat is caught in the door.
2. In the carriage, by lamplight: the letter. *"KEEP MOVING. — M."* *"The letter was a day old. It read as if she had written it a minute ago."*
3. The train runs through a tunnel of filed records: drawers and pages streaming past the windows.
4. Out into the afternoon: Echo City in warm stone, a clock reading 14:20. *"Echo City keeps the afternoon its people remember."*
5. Close on the platform ticket board: two tickets, both for SEAT 43. *"Today it was keeping two tickets for seat forty-three."*

### 4. `chapter3To4`: Ch3 → Ch4 THE PAINTED COUNTRY
Ch3 ended with seat 43 empty and still warm, and the scanner reading two tickets as one passenger.
1. The night service leaves Echo City at dusk. Seat 43 is empty beside Butch.
2. Outside the window, the world loses its colour into pencil lines on paper as the train runs.
3. A child's drawing: an orchard, a house, a red hawthorn hedge, signed "ROSA". *"Rosa Velez drew the orchard every summer."*
4. A grey archive wash sweeps across it, and a stamp lands: FILED. *"The archive kept her drawings, and painted the colour out. Colour is hard to file."*
5. The train slows into the unfinished drawing. One fleck of red shows through the grey at the hedge. *"Under the grey, a hawthorn was still red."*

### 5. `chapter4To5`: Ch4 → Ch5 THE MUSEUM OF ONE ANSWER
Ch4 ended with the colours returned, the PAINTED TRAIN, and the Last Painted Platform.
1. The painted train, still wet with colour, runs into the dark. The paint dries into ink as it goes.
2. A vast walnut hall, dark, with brass doors. The train stops inside it.
3. Display cases light one by one, each holding something from the journey: the city-line ticket stub, the letter, the two seat-43 tickets, Rosa's drawing. *"The archive had filed his journey already."*
4. Close on a typed accession card: ACC. 1978-0412 · VELEZ, M. · PENDING. *"One object was still pending."*
5. The Archivist (a shadow behind a brass lamp, or a voice in a caption): *"The museum will need one clean answer."*

### 6. `chapter5-to-conductor`: Ch5 → Ch6 ALL WORLDS AT ONCE (0–4 stones)
1. The museum's lamps go out one by one. The floor's inlay becomes rails.
2. The worlds stack up like Ch1 panels around Butch: the office, the rooftops, the square, the painted country.
3. At the far end, the Conductor, punch in hand. *"Tickets, please."* *"The line runs while someone rides it. You are the someone."*
4. Butch raises his lamp. Cut to black, into Movement I.

### 7. `chapter5-to-black-knife`: Ch5 → THE LAST CARRIAGE (five stones)
1. The five magic stones (EMBER, GRID, ECHO, PIGMENT, BLACK TICKET) glow in Butch's palm. *"Five things the archive could not file."*
2. At the end of the museum, a carriage door that was never on the timetable. A brass plate reads LAST CARRIAGE.
3. Inside: dark, one seat. Above it a ticket floats: black, never punched. *"A ticket that is never punched never ends its journey."*
4. Butch steps in. The door closes. Into the Black Ticket fight.

### 8. `ending`: normal ending (after Ch6, 0–4 stones), before the STATUS: OPEN card
Canon v1.1: Butch outlasts the Conductor. He finally reaches the Mara ahead and rides on beside her. She is the echo, and the line keeps running because Butch never gets off.
1. The stacked worlds fold back, panel by panel, into one carriage. *"The Conductor did not stop the train. Nobody could."*
2. Butch walks the length of the train, carriage by carriage, lamp in hand.
3. The next carriage: a woman in a rose scarf sits by the window, facing away. The seat beside her is empty. *"One carriage ahead, the seat beside her was empty at last."*
4. He sits down beside her. Her reflection in the black window is a blur of lamplight, with no face. Two lamps pass outside, sweeping light across them (the same sweep as the title scene). *"He did not look for her reflection."*
5. Exterior: the night service crosses the viaduct from the opening, lit windows in a row, and runs on into the dark. *"The night service kept running."*
6. Then the existing card (`showNormalEndingCard`), then the credits.

The true ending, "The Unfiled Ending", is already in-engine (`true-ending.html`) and stays as it is.
