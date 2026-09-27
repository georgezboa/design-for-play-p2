# Opening Animation V01

## Main outputs

- `NIGHTFALL_OPENING_ANIMATION_PREVIEW_V01.mp4` — 30.8-second local playable preview with narration and ambience.
- `OPENING_BACKSTORY_SOURCE_SHEET_V01.png` — four opening backstory source panels.
- `../CH01_CORRECT_BACKGROUND_CINEMATIC_TARGET_V01.png` — corrected Chapter 1 cinematic target.
- `OPENING_NARRATION_EN_V01.txt` — final English voice-over.
- `OPENING_SUBTITLES_EN_V01.srt` — editable subtitle sidecar.
- `../NIGHTFALL_OPENING_ANIMATION_SCRIPT_V03.md` — shot-by-shot meaning and transition logic.

## Generation notes

The backstory sheet and corrected Chapter 1 target were AI-generated from project-local visual references. The preview animates those images locally with camera drift, transitions, a system-generated narration track, and ambience.

The installed MiniMax desktop package exposes MiniMax Code, not a callable H3 video-generation interface, so this file is a local motion preview rather than an H3 render. Its shots, timing, first/last-frame contract, and narration are ready to use as the handoff specification when a working H3 endpoint or local runner is available.

## Seamless game handoff

The preview's final 1.5 seconds use `frames/ch01-gameplay.png`, cropped from the actual Chapter 1 gameplay first-frame reference. In the game build, place the cinematic over the already-loaded gameplay canvas and unlock input on the final frame.
