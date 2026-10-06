# Chapter 5 — Museum Score: provenance

Last reviewed: 2026-10-06. All four Chapter 5 recordings are cleared for public release.

The Museum's three *Pictures at an Exhibition* cues were already in the game without a source record. On 2026-10-06 each one was matched to its source: the same Musopen recordings on Wikimedia Commons, with matching length (within 0.1 s, MP3 padding) and loudness envelope (correlation 0.92–0.99 at zero lag, 0.5 s windows). The Verdi *Dies irae* was a 1900–1950 Italian 78 rpm transfer (ICBSA, *La voce del padrone*). It may still be protected in the U.S. as a pre-1972 recording, so it was replaced with another movement of the same Musopen *Pictures* recording.

Musopen recordings on Commons are dedicated to the public domain, and commercial use is allowed. Attribution is not required; it is given voluntarily below.

| Runtime file | Work | Recording | Licence | Source | Runtime edit | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| `5.1_mussorgsky_promenade.mp3` | Mussorgsky, *Pictures at an Exhibition*, opening *Promenade* | Musopen | Public domain | <https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_promenade_-_allegro_giusto,_nel_modo_russico_senza_allegrezza,_ma.ogg> | complete movement, 100.7 s, MP3 | `4809166622f79d6c321ffc73ba59f0b7872a484244ccbe5009ba3e8bc396215a` |
| `5.3_mussorgsky_old_castle.mp3` | *Pictures*, II *Il vecchio castello* | Musopen | Public domain | <https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_ii._il_vecchio_castello_-_andante.ogg> | complete, 284.8 s | `5bc435fab449f9192947d7b633320cfeb7c3c5a2f9085974845ea26acb22b60a` |
| `5.4_mussorgsky_catacombae.mp3` | *Pictures*, VIII *Catacombae (Sepulcrum romanum)* | Musopen | Public domain | <https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_viii._catacombae._sepulcrum_romanum_-_largo.ogg> | complete, 113.2 s | `826e8163d3096ed980dd23e4686b3004b2319a11608b5ec9c5592f56568b32b9` |
| `5.7_mussorgsky_baba_yaga.mp3` | *Pictures*, IX *La cabane sur des pattes de poule (Baba-Yaga)* | Musopen | Public domain | <https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_ix._la_cabane_sur_des_pattes_de_poule_-_allegro_con_brio,_feroce_-_andante_mosso_-_allegro_molto.ogg> | the two *Allegro* sections joined (source 0:00–1:09.4 and 2:27.6–end, 0.5 s crossfade; the slow middle section is cut so the museum's collapse loop never goes quiet), loudness-normalised to −15.6 LUFS, LAME V2, 133.5 s. Source SHA-256 `09df3c4d5d4f6bec675b4a584f29b2587712f06b5d198594fc5333fc8d2e983f`, retrieved 2026-10-06. | `06056693dd213fdeaec6914ba1006f20e1394fb43d87f745404f3047f765eb4a` |

The runtime call sites are in `src/chapters/museum3d/chapter05Score.js`. The collapse cue id changed from `ch5-dies-irae` to `ch5-baba-yaga`.

## Removed

| Former file | Reason |
| --- | --- |
| `5.7_verdi_dies_irae.mp3` | ICBSA transfer of a 1900–1950 *La voce del padrone* 78 rpm. Possibly still protected in the U.S. (pre-1972 recording); replaced 2026-10-06. |
| `5.2_faure_pie_jesu.mp3`, `5.5_saint_saens_danse_macabre.mp3`, `5.6_mozart_lacrimosa.mp3` | Uncleared and unused; removed 2026-09-27. |
