# Chapter 6: All Worlds at Once — Score

Last verified: 2026-08-13; runtime files re-encoded 2026-09-27 (see end of file).

Three recordings are original project-owned compositions. Threshold and Cut
Current are rendered from `scripts/audio/render_threshold_modern.mjs`; Night
Train Departure is rendered from `scripts/audio/render_final_boss_score.mjs`.
Echo City and Painted Country use public-domain Musopen recordings listed below.
Source and licence details are kept here so the release package remains auditable.

| Cue | Runtime file | Narrative use | SHA-256 |
| --- | --- | --- | --- |
| All Worlds at Once — Convergence Loom | `6.0_convergence_loom.mp3` | The pre-boss bridge: one suspended pulse shared by the drawn and electrical worlds. | `d11238a47621569eb9f35bc9d92656fc020ee275f9eaef05493112ed0ba02f47` |
| Threshold — Modern Industrial Pulse | `6.1_threshold_modern.mp3` | First movement: immediate 126 BPM pressure as the Conductor calls the train. | `7ee0aeced029bc1a5b8ebbea09033c5f11989ea9967fce6ccd8b7308e304f943` |
| Cut Current — Electro Grid Chase | `6.2_grid_modern.mp3` | Second movement: 144 BPM cut-current grid combat. | `c34cec82e1d3213fe65383dddf0ea253580c331d16c5813fdff31fdf0f778313` |
| Echo City — Dvořák, Symphony No. 9, IV | `6.3_dvorak_new_world_mvt4_theme.mp3` | Echo City: starts at source 00:10, entering on the famous *Allegro con fuoco* theme. | `32573e5e21dfe067dca89d7e4c998bdd59e8c4cabda1fcdf38c3e3e0a2c8776f` |
| Painted Country — Mussorgsky, *Pictures at an Exhibition*, X | `6.4_mussorgsky_kiev_gate.mp3` | Fourth movement: a painted gate becomes the world the Conductor cannot erase. | `25163bce189a236137e7683b3df71cf1f7f061e60b4c2a8fdb5bb2480b128fde` |
| Night Train Departure | `6.5_night_train_departure.mp3` | Mara is aboard; the score leaves with the train. | `c13ae8654fd0f63f6d6f23771cacf1a47b561505681d7e4098532cabf390cabe` |

## Echo City recording provenance

- Work: Antonín Dvořák, *Symphony No. 9 in E minor, “From the New World,” Op. 95*, IV. *Allegro con fuoco* (1893).
- Recording: Musopen; published through Wikimedia Commons as public domain.
- Source and licence record: <https://commons.wikimedia.org/wiki/File:Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27,_op._95_-_iv._allegro_con_fuoco.ogg>
- The Commons record identifies both the composition and Musopen's recording as public domain and permits commercial use. Attribution is not required; this manifest preserves voluntary provenance credit.
- Runtime edit: the project copy begins at source time 00:10 so the cue begins at the requested famous fourth-movement phrase. The 11:32.888 runtime is looped by the shared music director; scene changes retain their authored crossfade rather than using a baked fade-out.

## Painted Country recording provenance

- Work: Modest Mussorgsky, *Pictures at an Exhibition*, X. *The Great Gate of Kyiv* — *Allegro alla breve. Maestoso. Con grandezza* (1874).
- Recording: Musopen; published through Wikimedia Commons as public domain.
- Source and licence record: <https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_x._la_grande_porte_de_kiev_-_allegro_alla_breve._maestoso._con_grandezza.ogg>
- The Commons record identifies both the composition and Musopen's recording as public domain and permits commercial use. Attribution is not required; this manifest preserves voluntary provenance credit.
- Runtime: the complete 5:28.200 movement is looped by the shared music director. The 1.65-second movement fade-in and 3.8-second departure crossfade remain runtime automation, not baked into the recording.

## Threshold recording provenance

- Work: `Modern Industrial Pulse`, an original project-owned 126 BPM electronic combat cue.
- Renderer: `scripts/audio/render_threshold_modern.mjs`.
- Rights: the project owns the composition and recording. No samples, third-party recordings or pre-existing compositions are included; no external attribution is required.

## All Worlds at Once recording provenance

- Work: `Convergence Loom`, an original project-owned 96 BPM connective score cue.
- Renderer: `scripts/audio/render_chapter_score.mjs`.
- Rights: the project owns the composition and recording. No samples, third-party recordings or pre-existing compositions are included; no external attribution is required.

## Cut Current recording provenance

- Work: `Electro Grid Chase`, an original project-owned 144 BPM electronic combat cue.
- Renderer: `scripts/audio/render_grid_modern.mjs`.
- Rights: the project owns the composition and recording. No samples, third-party recordings or pre-existing compositions are included; no external attribution is required.

## Release re-encode (2026-09-27)

To reduce download size, runtime files above 160 kbps were re-encoded from the previous runtime MP3 with LAME VBR `-V2`, keeping the same sample rate, channel count and filename. Integrated loudness (EBU R128, ±0.1 LU) and duration are unchanged. The SHA-256 values above are for the re-encoded files. A file whose re-encode would not have been at least 5 % smaller kept its previous bytes.
