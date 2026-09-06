"""Finalize the three Hunyuan Chapter 3 replacement assets.

The first-stage files have already been simplified with meshoptimizer while
locking topological borders. This Blender pass establishes authored meter
dimensions, centers each asset, reaches the final triangle budget, repacks 2K
PBR textures, and writes stable GLB names for the calibrated city scene.
"""

import hashlib
import json
import os

import bpy
from mathutils import Vector


ROOT = "/Users/zhongzicheng/Documents/CS247G Game Design Part 2"
INCOMING = os.path.join(
    ROOT,
    "NIGHTFALL_Source_Assets/05_CH03_CITY/HUNYUAN_GENERATED/incoming_v2",
)
OUT = os.path.join(
    ROOT,
    "NIGHTFALL_Source_Assets/05_CH03_CITY/HUNYUAN_GENERATED/optimized_v2",
)
os.makedirs(OUT, exist_ok=True)

ASSETS = {
    "old_municipal_archive": {
        "source": "efd0_stage1.glb",
        "dimensions": (19.0, 9.0, 16.0),
        "triangles": 80000,
    },
    "transit_ministry": {
        "source": "9184_stage1.glb",
        "dimensions": (10.0, 17.0, 17.0),
        "triangles": 70000,
    },
    "scanner_tower": {
        "source": "21aa_stage1.glb",
        "dimensions": (2.7, 2.7, 8.2),
        "triangles": 32000,
    },
}


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def triangle_count(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def world_bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    return low, high


def optimize(name, spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = os.path.join(INCOMING, spec["source"])
    bpy.ops.import_scene.gltf(filepath=source)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"{name}: expected one mesh, got {len(meshes)}")

    obj = meshes[0]
    obj.name = name
    obj.data.name = f"{name}_mesh"
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # Bake glTF Y-up conversion before applying the authored world dimensions.
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    current = obj.dimensions.copy()
    target = Vector(spec["dimensions"])
    obj.scale = tuple(obj.scale[i] * target[i] / current[i] for i in range(3))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    before = triangle_count(obj.data)
    target_triangles = spec["triangles"]
    if before > target_triangles:
        modifier = obj.modifiers.new("final silhouette decimation", "DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = target_triangles / before
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    low, high = world_bounds(obj)
    obj.location += Vector((-(low.x + high.x) * 0.5, -(low.y + high.y) * 0.5, -low.z))
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    for image in bpy.data.images:
        if image.size[0] > 2048 or image.size[1] > 2048:
            image.scale(2048, 2048)
        image.pack()

    output = os.path.join(OUT, f"{name}_low.glb")
    bpy.ops.export_scene.gltf(
        filepath=output,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_image_format="AUTO",
    )

    after = triangle_count(obj.data)
    low, high = world_bounds(obj)
    return {
        "name": name,
        "source": source,
        "source_sha256": sha256(source),
        "output": output,
        "output_sha256": sha256(output),
        "source_bytes": os.path.getsize(source),
        "output_bytes": os.path.getsize(output),
        "triangles_before_final_pass": before,
        "triangles_after": after,
        "dimensions_m": [round(value, 4) for value in (high - low)],
        "textures": [
            {"name": image.name, "size": [image.size[0], image.size[1]]}
            for image in bpy.data.images
        ],
    }


results = [optimize(name, spec) for name, spec in ASSETS.items()]
manifest = os.path.join(OUT, "optimization_manifest.json")
with open(manifest, "w", encoding="utf-8") as handle:
    json.dump(results, handle, ensure_ascii=False, indent=2)
print(json.dumps(results, ensure_ascii=False, indent=2))
