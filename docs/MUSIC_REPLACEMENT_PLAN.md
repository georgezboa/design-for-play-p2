# Music replacement plan (release/1.0)

Status: **open**. Written 2026-09-27 during the release asset pass.

Seven shipped recordings have **no provenance**: no performer, label, source
URL or licence, in the files or in any manifest. The compositions are all in
the public domain, but a sound recording has its own rights, so these files
cannot go into a public Steam / itch.io build. Replacements could not be
downloaded from the build sandbox (Wikimedia Commons and Musopen were
blocked), so this document says exactly what to fetch and where to put it.

The current files stay in place until replacements arrive so the game keeps
its score. Nothing in the runtime depends on a file's exact length or loop
point. **Drop a replacement in under the exact target filename and no code
change is needed.**

If a file has to be removed before its replacement arrives, the game carries
on without that cue:

- `musicDirector` (HTMLAudio) swallows the failed `play()`.
- The chapter preloader marks the job `partial` and still opens the
  cinematic gate.
- The Chapter 4 Phaser scenes check `cache.audio.exists()` first.
- The black-knife boss already checks `cache.audio.exists()`.

Two tests read the Chapter 5 files from disk (`tests/chapter05/chapter05Music.test.mjs`
reads the lobby and labyrinth cue files). Update them in the same change if a
file is deleted without a replacement.

## Delivery spec (all cues)

| Property | Value |
| --- | --- |
| Container | MP3 (MPEG-1 Layer III), same filename and folder as listed |
| Encoding | 44.1 kHz, stereo, 160 kbps CBR or LAME VBR `-V2`; strip cover art and comments |
| Loudness | Match the **current integrated loudness** in the table (±1 LU, EBU R128). The in-code `volume` values were tuned against these files, so a matched replacement keeps the mix. |
| Peak | True peak ≤ −1.0 dBTP. Several current files clip above 0 dBTP; don't copy that. |
| Head / tail | No baked fade-in or fade-out, and no more than 0.3 s of leading silence. Every cue gets its fades from the runtime. |
| Record | Add performer, canonical file-page URL, licence and version, retrieval date and SHA-256 to that folder's `ASSET_MANIFEST.md`. If the licence is CC BY / CC BY-SA, also add the credit line to `public/CREDITS.md` and `src/shell/creditsData.js`. |

Measured with `ffmpeg -af ebur128=peak=true` on the current files (the 2026-09-27 LAME V2 re-encode left loudness unchanged).

## Cue sheet

### 1. Promenade (Chapter 5 museum lobby and corridor)

- **Piece:** Modest Mussorgsky, *Pictures at an Exhibition* (1874), opening *Promenade* (Allegro giusto, nel modo russico).
- **Target file:** `public/assets/music/ch5/5.1_mussorgsky_promenade.mp3`
- **Current:** 1:40.676 (100.68 s), MP3 VBR ~196 kbps, **−13.5 LUFS**, TP +0.5 dBTP.
- **Used at:** `src/chapters/museum3d/chapter05Score.js:5-16` (`lobby` and `corridor` share cue id `ch5-museum-promenade`, so walking lobby → corridor does not restart the track). Played from `src/chapters/museum3d/Museum3DApp.js:478-489` (`_syncChapterScore`).
- **Behaviour:** loops (`loop: true`). Fade in 1.0 s, fade out 2.0 s, volume 0.46, dialogue duck −7 dB.
- **Look for (to verify):**
  1. The same Musopen *Pictures at an Exhibition* series on Wikimedia Commons that `6.4_mussorgsky_kiev_gate.mp3` already uses (a file named like `Modest_Mussorgsky_-_pictures_at_an_exhibition_-_i._promenade…ogg`). Musopen releases it as public domain. Using the same series keeps the timbre consistent with Chapter 6.
  2. The Musopen.org Mussorgsky page, filtered to recordings marked Public Domain.
  - Check whether the recording is the piano original or Ravel's orchestration. Ravel died in 1937 and the orchestration was published in 1929, so it is public domain in life+70 countries and in the U.S. from 2025. Record which version it is either way.

### 2. The Old Castle (Chapter 5 Echo reconstruction)

- **Piece:** Mussorgsky, *Pictures at an Exhibition*, II. *Il vecchio castello* (The Old Castle).
- **Target file:** `public/assets/music/ch5/5.3_mussorgsky_old_castle.mp3`
- **Current:** 4:44.761 (284.76 s), MP3 VBR ~182 kbps, **−30.4 LUFS** (very quiet), TP −13.0 dBTP.
- **Used at:** `src/chapters/museum3d/chapter05Score.js:23-28` (`echo`, id `ch5-old-castle`), played from `Museum3DApp.js:478-489`.
- **Behaviour:** loops. Fade in 4.5 s, fade out 2.0 s, volume 0.30, duck −7 dB. The long fade and low volume make this a background bed. If the replacement is mastered at a normal level, normalise it down to about −30 LUFS or it will jump out of the mix.
- **Look for (to verify):**
  1. The same Musopen *Pictures at an Exhibition* series on Commons (`…_-_ii._il_vecchio_castello…ogg`).
  2. The Musopen.org Mussorgsky page, Public Domain filter.

### 3. Catacombae (Chapter 5 Labyrinth)

- **Piece:** Mussorgsky, *Pictures at an Exhibition*, *Catacombae (Sepulcrum romanum)*. It may be joined to *Cum mortuis in lingua mortua*. The current cue is 1:53, which suggests *Catacombae* with or without the *Cum mortuis* continuation.
- **Target file:** `public/assets/music/ch5/5.4_mussorgsky_catacombae.mp3`
- **Current:** 1:53.241 (113.24 s), MP3 VBR ~180 kbps, **−15.6 LUFS**, TP +0.7 dBTP.
- **Used at:** `src/chapters/museum3d/chapter05Score.js:17-22` (`labyrinth`, id `ch5-labyrinth-catacombae`), played by `src/chapters/museum/labyrinth/labyrinth-main.js:17-23`. `tests/chapter05/chapter05Music.test.mjs:27` asserts the filename.
- **Behaviour:** loops. Fade in 1.4 s, fade out 1.2 s, volume 0.42, duck −7 dB.
- **Look for (to verify):**
  1. The same Musopen *Pictures at an Exhibition* series on Commons (`…_-_catacombae…ogg`, possibly joined with `cum mortuis in lingua mortua`).
  2. The Musopen.org Mussorgsky page, Public Domain filter.

### 4. Dies irae (Chapter 5 collapse and Chapter 6 false-boss movements I–II)

- **Piece:** Giuseppe Verdi, *Messa da Requiem* (1874), II. *Sequentia*, opening *Dies irae* chorus.
- **Target file:** `public/assets/music/ch5/5.7_verdi_dies_irae.mp3`
- **Current:** 2:02.122 (122.12 s), MP3 VBR ~226 kbps, **−15.6 LUFS**, TP +0.1 dBTP.
- **Used at:**
  - `src/chapters/museum3d/chapter05Score.js:29-34` (`collapse`, id `ch5-dies-irae`), played from `Museum3DApp.js:478-489`. Loops. Fade in 1.2 s, fade out 1.2 s, volume 0.42, duck −7 dB.
  - `src/chapters/finalBoss/spectacleBattle.js:77` (path) and `:183-187` (`BOSS_SCORE.falseBossVerdi`), played in `playMusic()` around `:2659-2679`. **Not looped** (`loop: false`). Fade in 0.9 s, fade out 1.8 s, volume 0.42, duck −9 dB. When the file reaches `ended`, the runtime chains into the Echo City cue (`then: 'false-boss-after-verdi'`). `tests/finalBossRoute.test.mjs:50` asserts the filename.
- **Length matters here.** Because the false-boss cue plays once and then hands off, a replacement should run about **1:50–2:10** to cover movements I–II as it does now. A full-length *Dies irae* sequence (≈ 2:10–2:30 for the opening chorus alone) can be trimmed at a phrase end with a short natural decay (no fade longer than 1 s). If the file is missing, the false boss is silent until movement III starts the Dvořák cue.
- **Look for (to verify):**
  1. Wikimedia Commons, *Messa da Requiem (Verdi)* audio category: a public-domain, CC0, CC BY or CC BY-SA *Dies irae* (for example, a university or community choir upload). Record the performer and licence version exactly.
  2. U.S. military band recordings. Works of the U.S. Marine Band or U.S. Army Field Band are public domain as federal-government works. These would be wind-band arrangements, so check the arrangement credit too.
  - Avoid pre-1927 78 rpm transfers. They are public domain in the U.S. but not necessarily worldwide.

### 5. The Snow Is Dancing (Chapter 4 consequence / pigment train)

- **Piece:** Claude Debussy, *Children's Corner* (1908), IV. *The Snow Is Dancing*.
- **Target file:** `public/assets/music/ch4/4.2_debussy_snow_is_dancing.mp3`
- **Current:** 2:22.028 (142.03 s), 99 kbps, **−22.0 LUFS**, TP +0.3 dBTP.
- **Used at:** loaded in `src/chapters/paintedCountry/DrawingStudioScene.js:67-69` and `src/chapters/paintedCountry/PigmentTrainScene.js:64-66` (key `chapter4-consequence-music`). Played in `PigmentTrainScene.js:402-415` (`startMusic`). Preloaded by `src/shell/chapterPreloader.js:84` (profile `chapter4`).
- **Behaviour:** Phaser sound, `loop: true`, volume 0.34. Tweened to 0.43 over 0.9 s (`PigmentTrainScene.js:606`) and to 0.28 over 1.2 s at the finale (`:755`). Stops on scene shutdown. There is no fade-in, so the file should start on the first note.
- **Look for (to verify):**
  1. Wikimedia Commons, *Children's Corner (Debussy)* audio category: a public-domain, CC0 or CC BY piano recording.
  2. The Musopen.org Debussy page, Public Domain filter.

### 6. Reflets dans l'eau (Chapter 4 gallery and drawing studio)

- **Piece:** Claude Debussy, *Images*, Book I (1905), No. 1 *Reflets dans l'eau*.
- **Target file:** `public/assets/music/ch4/4.3_debussy_reflets_dans_leau.mp3`
- **Current:** 5:32.904 (332.90 s), MP3 VBR ~148 kbps, **−29.2 LUFS** (quiet), TP −7.7 dBTP.
- **Used at:** loaded in `src/chapters/paintedCountry/PaintedCountryScene.js:74-76` and `DrawingStudioScene.js:64-66` (key `chapter4-drawing-music`). Played in `PaintedCountryScene.js:79-90` (volume 0.42) and `DrawingStudioScene.js:286-297` (`startMusic`, volume 0.38). Preloaded by `src/shell/chapterPreloader.js:83`.
- **Behaviour:** Phaser sound, `loop: true`. Faded to 0 over 0.36 s when leaving the gallery (`PaintedCountryScene.js:1395`) and over 0.42 s when leaving the studio (`DrawingStudioScene.js:900`). No fade-in. The volume constants assume a quiet master, so normalise to about −29 LUFS.
- **Look for (to verify):**
  1. Wikimedia Commons, *Images (Debussy)* / *Reflets dans l'eau* audio: public-domain, CC0 or CC BY.
  2. The Musopen.org Debussy page, Public Domain filter.

### 7. Face the Fear (hidden final boss)

- **Piece:** unknown. The file is titled "Face the Fear" and has no composer or performer metadata. It is an electronic action track, not a classical work, so both the composition and the recording need clearing. It is not enough to find another recording of the same piece.
- **Target file:** `public/assets/black-knife/audio/face-the-fear.mp3` (keep the filename, or change `src/chapters/blackKnifeFinal/assets.js:30`).
- **Current:** 3:26.916 (206.92 s), 135 kbps, **−8.3 LUFS** (very loud, LRA 1.3), TP +2.1 dBTP.
- **Used at:** `src/chapters/blackKnifeFinal/assets.js:30` (`music-battle`), loaded by `scenes/PreloadScene.js:25-27`, and played in `scenes/BossScene.js:123-128` only if `cache.audio.exists('music-battle')`. That scene pauses and resumes it at `:62` / `:71`, sets `setRate(1.18)` when the boss is enraged (`:856`), and stops it at `:887`, `:905` and `:929`. Page: `hidden-final-boss.html`.
- **Behaviour:** Phaser sound, `loop: true`, volume 0.5, with no fade in or out. Because the playback rate goes to 1.18× when enraged, the track should still sound acceptable sped up. A driving 120–150 BPM loop with a clean loop seam is ideal.
- **Replacement options (to verify):**
  1. **Project-owned render** (preferred: no attribution and no licence risk). Chapters 1 and 6 already credit project-rendered cues. Note that the renderers named in `public/assets/music/ch1/ASSET_MANIFEST.md` and `ch6/ASSET_MANIFEST.md` (`scripts/audio/render_*.mjs`) are **not in this repository**. Recover them first if a matching cue is wanted.
  2. A CC0 action loop from OpenGameArt.org (filter licence = CC0), or a CC BY 4.0 track from Kevin MacLeod / incompetech.com (attribution required in `CREDITS.md` and `creditsData.js`).
- **Loudness:** do not match the current −8 LUFS. Deliver at about −14 LUFS, TP ≤ −1 dBTP, then check the in-game balance at volume 0.5 against the boss SFX. This may need a one-line volume change in `assets.js:30` / `BossScene.js:125`.

## Summary

| # | Target file | Piece | Length | Loop | Current LUFS |
| --- | --- | --- | --- | --- | --- |
| 1 | `ch5/5.1_mussorgsky_promenade.mp3` | Mussorgsky, *Pictures*: Promenade | 1:40.7 | yes | −13.5 |
| 2 | `ch5/5.3_mussorgsky_old_castle.mp3` | Mussorgsky, *Pictures*: The Old Castle | 4:44.8 | yes | −30.4 |
| 3 | `ch5/5.4_mussorgsky_catacombae.mp3` | Mussorgsky, *Pictures*: Catacombae | 1:53.2 | yes | −15.6 |
| 4 | `ch5/5.7_verdi_dies_irae.mp3` | Verdi, *Requiem*: Dies irae | 2:02.1 | ch5 yes / ch6 **no, chains** | −15.6 |
| 5 | `ch4/4.2_debussy_snow_is_dancing.mp3` | Debussy, *Children's Corner* IV | 2:22.0 | yes | −22.0 |
| 6 | `ch4/4.3_debussy_reflets_dans_leau.mp3` | Debussy, *Images* I/1 | 5:32.9 | yes | −29.2 |
| 7 | `black-knife/audio/face-the-fear.mp3` | unknown electronic track | 3:26.9 | yes (rate 1.18× when enraged) | −8.3 → target −14 |

All paths are under `public/assets/`. Lengths are those of the current files.
The runtime doesn't need a replacement to match them, except cue 4 in the
false boss.
