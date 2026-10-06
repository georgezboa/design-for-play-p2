# NIGHTFALL Credits and Attribution Register

This register covers the production categories represented by the current integrated build. Per-file manifests remain authoritative where linked below.

## Team

- **George — Creative & Integration Lead**
  - Game direction and creative direction
  - Narrative, world and character direction
  - Butch/Mara story and relationship design
  - Chapter, gameplay and player-experience design
  - Prologue design and implementation
  - Production, team and build integration
  - Voice casting and performance direction
  - AI production direction and asset curation
  - Playtest direction, scope decisions and final acceptance
  - Title, credits and release presentation
- **Carl — Chapter 4 Owner:** The Painted Country product decisions and code
- **Jack — Chapter 2 Builder:** The Borrowed Grid playable chapter
- **Jason — Visual & Cinematic Lead:** shared visual treatment, compositing, cinematics and final capture
- **Mathias — Chapter 5 / Labyrinth:** Museum Labyrinth chapter work

The hidden final fight, *The Black Ticket*, is built on Mathias's original boss battle and its hand-drawn Conductor frames, recoloured for the finale.

## Music

### Credits music

- **Track:** Last And First Light
- **Artist:** Scott Buckley
- **Source:** https://www.scottbuckley.com.au/library/last-and-first-light/
- **License:** Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/
- **Required attribution:** `'Last And First Light' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au`
- **Runtime derivative:** `/assets/music/scott-buckley-last-and-first-light.mp3`, transcoded to 128 kbps MP3 without source metadata
- **Runtime SHA-256:** `f7ea852bc761d7b0d4a42ca586077661a1c3564f062e63830c6987b74b8e92d9`

### Chapter 3 — Echo City (required attribution)

Chapter 3 music includes “Humoresque, Op. 101 No. 7,” arranged for piano and viola by Elias Goldstein, from the Al Goldstein collection, CC BY-SA 2.0 (https://creativecommons.org/licenses/by-sa/2.0/); “Symphony No. 7, Allegretto,” performed by John Michel, CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/); and “Prelude in E minor, Op. 28 No. 4,” performed by Ivan Ilić, CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). These recordings were converted to MP3 for the game.

| Runtime file | Work | Performer / source | Licence | Source file page |
| --- | --- | --- | --- | --- |
| `3.2_dvorak_humoresque_no7.mp3` | Antonín Dvořák, *Humoresque*, Op. 101 No. 7 | Elias Goldstein, piano and viola; Al Goldstein collection | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Dvořák_-_Humoresque_Op._101_No._7.ogg |
| `3.6_chopin_prelude_op28_no4.mp3` | Frédéric Chopin, Prelude in E minor, Op. 28 No. 4 | Ivan Ilić | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Ivan_Ilić-Chopin_Prelude_Opus_28_n.4.ogg |
| `3.8_beethoven_sym7_mvt2_allegretto_cello.mp3` | Ludwig van Beethoven, Symphony No. 7, Op. 92, II *Allegretto* | John Michel, cello | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:JOHN_MICHEL_CELLO-BEETHOVEN_SYMPHONY_7_Allegretto.ogg |

Modifications: transcoded from the source Ogg Vorbis files to MP3; for the release build 3.6 and 3.8 were re-encoded again (LAME VBR V2) to reduce download size. The performances are not edited. The converted 3.2 and 3.8 files remain available under their CC BY-SA licences. Per-file SHA-256 records: `/assets/music/ch3/ASSET_MANIFEST.md`.

Chapter 3 also uses these public-domain / CC0 recordings (credit given voluntarily; no attribution is required):

- *Gnossienne No. 1* (Erik Satie), Jaan Patterson, CC0 1.0 — https://commons.wikimedia.org/wiki/File:Jaan_Patterson_-_05_-_Gnossiennes_No1_ric_Alfred_Leslie_Satie.ogg
- *The Washington Post March* (John Philip Sousa), United States Marine Band, public domain (U.S. federal-government work) — https://commons.wikimedia.org/wiki/File:Washington_Post.ogg
- Piano Sonata No. 8 “Pathétique”, II (Beethoven), Paul Pitman / Musopen, CC0 1.0 — https://commons.wikimedia.org/wiki/File:Beethoven,_Sonata_No._8_in_C_Minor_Pathetique,_Op._13_-_II._Adagio_cantabile.ogg
- Piano Sonata No. 14 “Moonlight”, I (Beethoven), Paul Pitman / Musopen, public-domain dedication — https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_sonata_no._14_in_c_sharp_minor_%27moonlight%27,_op._27_no._2_-_i._adagio_sostenuto.ogg
- Nocturne in D-flat major, Op. 27 No. 2 (Chopin), Frank Lévy / Musopen, public domain — https://commons.wikimedia.org/wiki/File:Chopin_-_Nocturne_No._8_in_D-flat_major,_Op._27_No._2_(Frank_Levy).flac
- Morning / departure (`3.9`): original project arrangement of the public-domain Largo theme from Dvořák's Symphony No. 9; project-owned recording.

### Chapter 6 — All Worlds at Once

- Movements I and II (*Lost Property*, *On the Bell*): *Modern Industrial Pulse* and *Electro Grid Chase*, original project-owned cues.
- Movement III (*Two True Things*): *Symphony No. 9 “From the New World”*, IV *Allegro con fuoco* (Antonín Dvořák), Musopen, public domain — https://commons.wikimedia.org/wiki/File:Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27,_op._95_-_iv._allegro_con_fuoco.ogg (runtime edit starts at source 00:10).
- Movement IV (*The Painted Country*): *Pictures at an Exhibition*, X *The Great Gate of Kyiv* (Modest Mussorgsky), Musopen, public domain — https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_x._la_grande_porte_de_kiev_-_allegro_alla_breve._maestoso._con_grandezza.ogg
- The departure: *Night Train Departure*, an original project-owned cue. Details for all three project cues: `/assets/music/ch6/ASSET_MANIFEST.md`.
- The Unfiled Ending plays the credits music, *Last And First Light* (above).

### Chapters 1 and 2 — Night Service and Borrowed Light

*Train Undertow*, *Train Resonance* and *Neon Safety Test* are original project-owned cues (Night Service plays *Train Undertow*; Borrowed Light plays the other two). Details: `/assets/music/ch1/ASSET_MANIFEST.md`.

### Chapter 4 — The Painted Country (required attribution)

- *Reflets dans l'eau* (Claude Debussy), performed by **Giorgi Latso**, recorded by Asuas, **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/) — https://commons.wikimedia.org/wiki/File:Debussy_,_Reflets_dans_l%27eau.ogg. Converted to MP3 for the game; the converted file remains available under CC BY-SA 4.0. Runtime: `/assets/music/ch4/4.3_debussy_reflets_dans_leau.mp3`.
- *The Snow Is Dancing* from *Children's Corner* (Debussy), a virtual-piano rendition by Commons user Pracchia-78, released into the public domain (credit given voluntarily) — https://commons.wikimedia.org/wiki/File:Claude_Debussy_-_Children%27s_Corner.ogg. The movement is excerpted from the full suite.

### Chapter 5 — The Museum of One Answer, and The Black Ticket

All of these are Musopen recordings, public domain on Wikimedia Commons; credit is given voluntarily.

- Modest Mussorgsky, *Pictures at an Exhibition*: *Promenade* (lobby and corridor), *The Old Castle*, *Catacombae* (the Labyrinth) and *Baba-Yaga* (the collapse; its two *Allegro* sections joined). Per-file sources and SHA-256 records are in `/assets/music/ch5/ASSET_MANIFEST.md`.
- Mussorgsky, *Night on Bald Mountain* (the hidden fight, *The Black Ticket*; the opening 3:50). Source: https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_night_on_bald_mountain.ogg. Record: `/assets/black-knife/audio/ASSET_MANIFEST.md`.

Every recording in the game now has a recorded source and licence. On 2026-10-06 the earlier uncleared files were either matched to their public sources (Chapter 4, and Chapter 5's *Promenade*, *Old Castle* and *Catacombae*) or replaced: Verdi's *Dies irae*, a 1900–1950 78 rpm transfer, and *Face the Fear*, an electronic track of unknown origin.

Sound effects, room tones and some ambience are synthesized in-engine by project-authored Web Audio code rather than taken from third-party recordings.

## Generative and AI-assisted production

- **Tencent Hunyuan 3D 3.0 / 3.1:** generated 3D source meshes for Echo City, the Museum reconstruction, environments, props and characters. Runtime assets were selected, edited, retopologized or optimized by the team. Chapter 3 per-asset details: `/assets/chapter03-3d/ASSET_MANIFEST.json` and `/assets/chapter03-3d/replacements/manifest.json`.
- **OpenAI image generation:** title and visual-direction imagery, world panoramas, shared painterly textures, Chapter 3 surface sources and selected production reference art. Shared painterly details: `../src/assets/shared/painterly/ASSET_MANIFEST.md` in the source repository.
- **ElevenLabs (synthetic character voices, elevenlabs.io):** the English voice performances in Chapters 3 and 5 were generated with ElevenLabs text-to-speech (https://elevenlabs.io); Chapter 6 reuses selected Chapter 3 lines for the argument about Mara. Per-line manifests: `/assets/chapter03-3d/voice/ch03/manifest.json` and `/museum3d/voice/ch05/manifest.json`.
- **AI-assisted development:** OpenAI Codex, Anthropic Claude Code, Alibaba Qwen Code, Moonshot Kimi and Google Gemini supported planning, implementation, review and testing under human direction.

## Licensed source material

- **Quaternius Universal Animation Library 1 and 2:** CC0 1.0. Bundled license files: `/assets/chapter03-3d/animations/QUATERNIUS_UAL1_LICENSE.txt` and `/assets/chapter03-3d/animations/QUATERNIUS_UAL2_LICENSE.txt`.
- **Quaternius Downtown City MegaKit (Standard):** `T_Concrete_Asphalt_BaseColor.png`, source of the dark back-street paving `dark-city-cobbles.webp`; CC0 1.0. Record: `/assets/chapter03-3d/ASSET_MANIFEST.json`.
- **Poly Haven:** `beige_wall_001`, `dirty_carpet`, `wood_table_001`, `rubber_tiles`, and `dark_wood`; CC0 1.0.
- **ambientCG:** `Fingerprints001` (museum glass fingerprints); CC0 1.0.

## Provenance rule

Every new recording, generated asset or external source added after this register must record creator or model/provider, exact source URL when applicable, license or usage basis, runtime destination and modification history. Unknown metadata is labelled incomplete and must not be silently inferred.
