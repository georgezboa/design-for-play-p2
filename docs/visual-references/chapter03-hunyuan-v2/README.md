# Chapter 03 — Hunyuan replacement models v2

These three models replace the remaining procedural civic buildings and scanner
tower in the calibrated Chapter 03 Blender scene. Generate **one GLB per image**
with Hunyuan image-to-3D. Do not combine them into a city scene.

## Delivery settings

- Use the matching PNG as the image-to-3D reference.
- Export GLB with embedded PBR textures; 4K source textures are fine.
- Keep the complete object, including foundation/base and roof/beacon.
- No ground plane, people, vegetation, signs, letters, beams or animation.
- Do not reduce polygons online. Deliver the highest-quality source; Codex will
  make silhouette-protected low-poly derivatives and repack textures.
- Preferred filenames:
  - `CH03_old_municipal_archive.glb`
  - `CH03_transit_ministry.glb`
  - `CH03_scanner_tower.glb`

## 1. Old municipal archive

Reference: `CH03_old_municipal_archive_ref_v01.png`

```text
One complete three-story late-19th-century European municipal archive,
approximately 19m wide, 9m deep and 16m tall. Worn coral-red stucco, dark
oxidized teal copper hipped roof, warm sandstone cornices and window surrounds,
six tall windows per floor, readable ground-floor arched arcade and centered
civic entrance, two asymmetrical chimneys, subtle rain stains and chipped
plaster. Preserve the strong rectangular silhouette and all visible sides.
Exactly one watertight building asset. No ground, street, trees, people,
vehicles, signs, letters, text, props or diorama base.
```

## 2. Transit ministry

Reference: `CH03_transit_ministry_ref_v01.png`

```text
One complete tall late-19th-century European civic transit administration
building, approximately 10m wide, 17m deep and 17m tall. Worn ochre and muted
burnt-orange stucco, dark oxidized teal copper roof, warm sandstone corner
pilasters and cornices, narrow tall arched windows, a ground-floor west-facing
arcade and recessed public entrance, restrained red fabric awning, one small
rooftop lantern and asymmetrical chimneys. Preserve the narrow corner-building
silhouette and all visible sides. Exactly one watertight building asset. No
ground, pavement, fence, trees, people, vehicles, signs, letters, text or props.
```

## 3. Civic scanner tower

Reference: `CH03_scanner_tower_ref_v01.png`

```text
One complete 8m municipal surveillance scanner tower: octagonal weathered stone
plinth, tiered bronze service rings, slender blackened-iron mast, exposed
mechanical collars and cables, articulated oxblood-red rotating scanner head,
one large forward-facing cyan glass lens in a brass visor, small oxidized-teal
beacon, and a clearly readable motorized swivel joint. Retro 1960s civic
infrastructure, not a weapon. Mechanically joined solid asset, crisp and
low-poly-friendly. No beam or cone, ground plane, building, fence, person,
warning symbol, sign, letters, text or UI.
```

## Optimization targets after delivery

- Archive: 60–80k triangles, 2K PBR maps.
- Transit ministry: 60–80k triangles, 2K PBR maps.
- Scanner tower: 24–32k triangles, 2K PBR maps.

The runtime continues to use a camera-locked WebP bake; GLBs stay as offline
source assets so Chapter 03 remains lightweight.
