# Chapter 3 Music — Release Provenance

Last verified: 2026-08-12; runtime files re-encoded 2026-09-27 (see end of file).

All runtime recordings in this directory have a specific source and licence.
The MP3 assets that preceded this manifest had no provenance and are not part of
the release set. The runtime uses the MP3 files below.

## Required public credits

Include this text, including the two licence links, in the game's credits page
or a bundled `CREDITS` file:

> Chapter 3 music includes “Humoresque, Op. 101 No. 7,” arranged for piano and
> viola by Elias Goldstein, from the Al Goldstein collection, CC BY-SA 2.0
> (https://creativecommons.org/licenses/by-sa/2.0/); “Symphony No. 7,
> Allegretto,” performed by John Michel, CC BY-SA 3.0
> (https://creativecommons.org/licenses/by-sa/3.0/); and “Prelude in E minor,
> Op. 28 No. 4,” performed by Ivan Ilić, CC BY 3.0
> (https://creativecommons.org/licenses/by/3.0/). These recordings were
> converted to MP3 for the game.

The converted **3.2** and **3.8** audio files remain available under their
respective CC BY-SA licences. The project code, art, and unrelated audio are not
licensed by this file. A future commercial release should have its packaging
reviewed in the target jurisdictions if it changes or redistributes those two
adapted recordings.

## Runtime inventory

| Cue | Runtime file | Performer / source | Licence | Canonical source file | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| Arrival / station | `3.1_satie_gnossienne_no1.mp3` | Jaan Patterson | CC0 1.0 | [Commons file](https://commons.wikimedia.org/wiki/File:Jaan_Patterson_-_05_-_Gnossiennes_No1_ric_Alfred_Leslie_Satie.ogg) | `274c629ba544196576dd17302ed715506b5cf6625766c3806d1cc62c72758ad3` |
| Market investigation | `3.2_dvorak_humoresque_no7.mp3` | Elias Goldstein, piano and viola; Al Goldstein collection | CC BY-SA 2.0 | [Commons file](https://commons.wikimedia.org/wiki/File:Dvořák_-_Humoresque_Op._101_No._7.ogg) | `4e278a94e95581ba52aa48b5c7c3a314b65ee14a29f71f290db38464d2e89fac` |
| Transit Ministry | `3.3_sousa_washington_post_march.mp3` | United States Marine Band | Public domain, U.S. federal-government work | [Commons file](https://commons.wikimedia.org/wiki/File:Washington_Post.ogg) | `566db5c3c6440b60da5d43caa6b37d3e5190f57f7cd516ec2210a5e4780fc290` |
| Transit Square | `3.4_beethoven_pathetique_mvt2.mp3` | Paul Pitman / Musopen | CC0 1.0 | [Commons file](https://commons.wikimedia.org/wiki/File:Beethoven,_Sonata_No._8_in_C_Minor_Pathetique,_Op._13_-_II._Adagio_cantabile.ogg) | `3b61532a107460a3edd3a2c637def051b292cac5251ddc1bdd23be3b36e1a86e` |
| Archive | `3.5_beethoven_moonlight_mvt1.mp3` | Paul Pitman / Musopen | Public domain dedication | [Commons file](https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_sonata_no._14_in_c_sharp_minor_%27moonlight%27,_op._27_no._2_-_i._adagio_sostenuto.ogg) | `ab9839e5d8ce2923d1a1b3ead2bf8dcb4cf8deaaca31cb35c75beeb4318afda9` |
| Dusk | `3.6_chopin_prelude_op28_no4.mp3` | Ivan Ilić | CC BY 3.0 | [Commons file](https://commons.wikimedia.org/wiki/File:Ivan_Ilić-Chopin_Prelude_Opus_28_n.4.ogg) | `949cf3ebdab3890f99234fac090e35638e63e52e96eaca2acd5688d19b8c284c` |
| Copper Heron | `3.7_chopin_nocturne_op27_no2.mp3` | Frank Lévy | Public domain | [Commons file](https://commons.wikimedia.org/wiki/File:Chopin_-_Nocturne_No._8_in_D-flat_major,_Op._27_No._2_(Frank_Levy).flac) | `37d7f87996ec9a618d75f7d812514f88e571539c57a42b655087697376b6bab4` |
| Burning message | `3.8_beethoven_sym7_mvt2_allegretto_cello.mp3` | John Michel, cello | CC BY-SA 3.0 | [Commons file](https://commons.wikimedia.org/wiki/File:JOHN_MICHEL_CELLO-BEETHOVEN_SYMPHONY_7_Allegretto.ogg) | `988deae024d1f2396d36f76bef423754affb068db1db8d95470eda136d66aa34` |
| Morning / departure | `3.9_dvorak_new_world_largo.mp3` | Original Nightfall arrangement rendered by `scripts/audio/render_ch3_morning_largo.mjs`; melody adapted from Dvořák's public-domain Largo theme | Project-owned recording; underlying composition public domain | [Dvořák work reference](https://commons.wikimedia.org/wiki/File:Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27,_op._95_-_ii._largo.ogg) | `938a721e0a7c023ab19e61b671fa2a6ff02102bc44d661af5dc39840bc7e8d91` |

The 3.7 conversion is an MP3 derivative of the cited public-domain
FLAC. The 3.9 renderer is retained in the repository so the project can
reproduce its own recording without relying on a third-party audio download.

## Release re-encode (2026-09-27)

To reduce download size, runtime files above 160 kbps were re-encoded from the previous runtime MP3 with LAME VBR `-V2`, keeping the same sample rate, channel count and filename. Integrated loudness (EBU R128, ±0.1 LU) and duration are unchanged. The SHA-256 values above are for the re-encoded files. A file whose re-encode would not have been at least 5 % smaller kept its previous bytes.
