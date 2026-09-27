# Chapter 5 — Museum Score: provenance audit

Last reviewed: 2026-09-27 (release/1.0 asset pass)

**Not project-owned. Not cleared for public release.**
The runtime files are external classical recordings, not a generated score.
The table records what can be established locally from embedded metadata; an
empty provenance field is an unresolved source, not a licence grant.

## Files still shipped (temporary — replacement required)

These four recordings are referenced by the game and stay in place only so
Chapter 5 and the Chapter 6 false-boss keep their score until cleared
recordings arrive. Replacement targets, runtime call sites, lengths and
loudness targets are in `docs/MUSIC_REPLACEMENT_PLAN.md` in the source
repository. A replacement dropped in under the same filename needs no code
change; if a file is removed before its replacement arrives, the runtime
continues silently.

| Runtime file | Embedded source information | Release status |
| --- | --- | --- |
| `5.1_mussorgsky_promenade.mp3` | No embedded artist, copyright or source metadata. | Unresolved; replace before public release. |
| `5.3_mussorgsky_old_castle.mp3` | No embedded artist, copyright or source metadata. | Unresolved; replace before public release. |
| `5.4_mussorgsky_catacombae.mp3` | No embedded artist, copyright or source metadata. | Unresolved; replace before public release. |
| `5.7_verdi_dies_irae.mp3` | No embedded artist, copyright or source metadata. | Unresolved; replace before public release. |

## Removed on 2026-09-27

These files were not referenced by any runtime code and have been deleted from
`public/` so they cannot ship:

| Former file | Embedded source information | Reason |
| --- | --- | --- |
| `5.2_faure_pie_jesu.mp3` | Louis Frémaux / Orchestre National de l'Opéra de Monte-Carlo, `Erato STE 50128` (1962 LP transfer). | Third-party commercial recording; not cleared; unused. |
| `5.5_saint_saens_danse_macabre.mp3` | Kevin MacLeod (Logic Pro export, 2008). | External recording with no licence or credit record; unused. |
| `5.6_mozart_lacrimosa.mp3` | Josef Krips / Wiener Hofmusikkapelle; restoration of ACL 39 / ARL 4322/3 by René Gagnaux. | External restored commercial recording; not cleared; unused. |
