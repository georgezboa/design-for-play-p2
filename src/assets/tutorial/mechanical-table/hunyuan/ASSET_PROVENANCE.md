# Prologue bogie Hunyuan derivative

- Source supplied by George on 2026-08-05:
  `/Users/zhongzicheng/Downloads/f014a818991e89bc03e3816b94039cbd.glb`
- Source SHA-256:
  `bfb2a8c7f6d3fe6884c45c9617d5e4f388a2907b4e81b16a3c3cbe41261a3077`
- Generation reference:
  `outputs/prologue-iv-vi-environment-target/modeling-reference/bogie-rocker-counterweight-hunyuan-reference.png`
- Usage status: user-supplied Hunyuan image-to-3D output. This is not a CC0
  vendor asset; continued use follows the terms of George's Hunyuan account.

## Production treatment

The 74 MB source is one 1,499,318-triangle mesh with one material and three
embedded 4096x4096 PBR maps. It is not loaded by Phaser.

`scripts/art/optimize_render_prologue_bogie.py` reduces the external source to
48,000 triangles, scales textures to 2048x2048, and stores the optimized GLB
outside Git under:

`NIGHTFALL_Source_Assets/01_PROLOGUE/HUNYUAN_GENERATED/optimized/`

The web build loads only `bogie-stage-v1.webp`, a 1200x600 transparent,
camera-locked side render. It is a static detail/silhouette layer; the
interactive rocker, counterweight detents, suspension compression, bearing,
route switch and broken contact remain live Phaser graphics above it.
