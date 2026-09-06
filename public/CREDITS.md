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

## Music

### Credits music

- **Track:** Last And First Light
- **Artist:** Scott Buckley
- **Source:** https://www.scottbuckley.com.au/library/last-and-first-light/
- **License:** Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/
- **Required attribution:** `'Last And First Light' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au`
- **Runtime derivative:** `/assets/music/scott-buckley-last-and-first-light.mp3`, transcoded to 128 kbps MP3 without source metadata
- **Runtime SHA-256:** `f7ea852bc761d7b0d4a42ca586077661a1c3564f062e63830c6987b74b8e92d9`

The current Chapter 5 tension score and other procedural cues are synthesized in-engine from project-authored Web Audio code rather than third-party recordings.

## Generative and AI-assisted production

- **Tencent Hunyuan 3D 3.0 / 3.1:** generated 3D source meshes for Echo City, the Museum reconstruction, environments, props and characters. Runtime assets were selected, edited, retopologized or optimized by the team. Chapter 3 per-asset details: `/assets/chapter03-3d/ASSET_MANIFEST.json` and `/assets/chapter03-3d/replacements/manifest.json`.
- **OpenAI image generation:** title and visual-direction imagery, world panoramas, shared painterly textures, Chapter 3 surface sources and selected production reference art. Shared painterly details: `../src/assets/shared/painterly/ASSET_MANIFEST.md` in the source repository.
- **MiniMax Hailuo H3:** opening and transition animation production sources. Shot-level records: `/chapter01-opening/MINIMAX_H3_GENERATION_MANIFEST_V01.json` and `/chapter01-opening/MINIMAX_H3_GENERATION_MANIFEST_V02.json`.
- **Synthetic character voices:** generated English voice performances are present in Chapters 3 and 5. Their current manifests enumerate every runtime line but do not record the provider. This missing provenance is disclosed rather than guessed: `/assets/chapter03-3d/voice/ch03/manifest.json` and `/museum3d/voice/ch05/manifest.json`.
- **AI-assisted development:** OpenAI Codex, Anthropic Claude Code, Alibaba Qwen Code, Moonshot Kimi and Google Gemini supported planning, implementation, review and testing under human direction.

## Licensed source material

- **Quaternius Universal Animation Library 1 and 2:** CC0 1.0. Bundled license files: `/assets/chapter03-3d/animations/QUATERNIUS_UAL1_LICENSE.txt` and `/assets/chapter03-3d/animations/QUATERNIUS_UAL2_LICENSE.txt`.
- **Poly Haven:** `beige_wall_001`, `dirty_carpet`, `wood_table_001`, `rubber_tiles`, and `dark_wood`; CC0 1.0.
- **ambientCG:** `Fingerprints001` and shared material sources; CC0 1.0.
- **Kenney:** selected industrial, pipe, UI and impact source assets; CC0 1.0.
- **Permanent Marker:** typeface by Font Diner; Apache License 2.0. Bundled license: `/fonts/PermanentMarker-LICENSE.txt`.

## Provenance rule

Every new recording, generated asset or external source added after this register must record creator or model/provider, exact source URL when applicable, license or usage basis, runtime destination and modification history. Unknown metadata is labelled incomplete and must not be silently inferred.
