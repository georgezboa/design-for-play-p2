# Chapter 3 Music — Release Provenance

Last verified: 2026-08-12

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
| Arrival / station | `3.1_satie_gnossienne_no1.mp3` | Jaan Patterson | CC0 1.0 | [Commons file](https://commons.wikimedia.org/wiki/File:Jaan_Patterson_-_05_-_Gnossiennes_No1_ric_Alfred_Leslie_Satie.ogg) | `5bceec48027c40c040a52b206369a8b35da7f44213e0cf7f1602b26a8c590dfe` |
| Market investigation | `3.2_dvorak_humoresque_no7.mp3` | Elias Goldstein, piano and viola; Al Goldstein collection | CC BY-SA 2.0 | [Commons file](https://commons.wikimedia.org/wiki/File:Dvořák_-_Humoresque_Op._101_No._7.ogg) | `4e278a94e95581ba52aa48b5c7c3a314b65ee14a29f71f290db38464d2e89fac` |
| Transit Ministry | `3.3_sousa_washington_post_march.mp3` | United States Marine Band | Public domain, U.S. federal-government work | [Commons file](https://commons.wikimedia.org/wiki/File:Washington_Post.ogg) | `744a99d21553e0b323382ee3c6f4a8bfc8191690f1ad00b0367b1133a4f12ae8` |
| Transit Square | `3.4_beethoven_pathetique_mvt2.mp3` | Paul Pitman / Musopen | CC0 1.0 | [Commons file](https://commons.wikimedia.org/wiki/File:Beethoven,_Sonata_No._8_in_C_Minor_Pathetique,_Op._13_-_II._Adagio_cantabile.ogg) | `d0633d494aea3226657452d26c4c63698b7d3a220caab591838685582f6f108a` |
| Archive | `3.5_beethoven_moonlight_mvt1.mp3` | Paul Pitman / Musopen | Public domain dedication | [Commons file](https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_sonata_no._14_in_c_sharp_minor_%27moonlight%27,_op._27_no._2_-_i._adagio_sostenuto.ogg) | `7ef6342adf5bd7fad1823bf4dcbb3ebeaf020928d3f9208596deae708a3e0913` |
| Dusk | `3.6_chopin_prelude_op28_no4.mp3` | Ivan Ilić | CC BY 3.0 | [Commons file](https://commons.wikimedia.org/wiki/File:Ivan_Ilić-Chopin_Prelude_Opus_28_n.4.ogg) | `d743341b4ccde653bf5e5c99cbf581cd5091dadba572c4ae10bd8e54d4b1f8b1` |
| Copper Heron | `3.7_chopin_nocturne_op27_no2.mp3` | Frank Lévy | Public domain | [Commons file](https://commons.wikimedia.org/wiki/File:Chopin_-_Nocturne_No._8_in_D-flat_major,_Op._27_No._2_(Frank_Levy).flac) | `b58664361920dc418ae5f22c09747b24d11b15f2c77bad5559dd235099ffb7d5` |
| Burning message | `3.8_beethoven_sym7_mvt2_allegretto_cello.mp3` | John Michel, cello | CC BY-SA 3.0 | [Commons file](https://commons.wikimedia.org/wiki/File:JOHN_MICHEL_CELLO-BEETHOVEN_SYMPHONY_7_Allegretto.ogg) | `bff5ae23688fbf68c06f800dcb4a48ad96cb706897faeb9ecf351a37448f768a` |
| Morning / departure | `3.9_dvorak_new_world_largo.mp3` | Original Nightfall arrangement rendered by `scripts/audio/render_ch3_morning_largo.mjs`; melody adapted from Dvořák's public-domain Largo theme | Project-owned recording; underlying composition public domain | [Dvořák work reference](https://commons.wikimedia.org/wiki/File:Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27,_op._95_-_ii._largo.ogg) | `98912c025763c3255db0cc1ca95c4c80ac6bf06938f0bba9484a21d82cb97ae2` |

The 3.7 conversion is an MP3 derivative of the cited public-domain
FLAC. The 3.9 renderer is retained in the repository so the project can
reproduce its own recording without relying on a third-party audio download.
