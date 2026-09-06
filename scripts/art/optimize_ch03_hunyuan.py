"""Reduce the four Hunyuan Chapter 3 hero props and normalize their scale.

The source files stay in Downloads. Optimized GLBs are written to the external
NIGHTFALL source library so only baked runtime derivatives enter the web game.
"""

import json
import os

import bpy
from mathutils import Vector


ROOT = "/Users/zhongzicheng/Documents/CS247G Game Design Part 2"
DOWNLOADS = "/Users/zhongzicheng/Downloads"
OUT = os.path.join(ROOT, "NIGHTFALL_Source_Assets/05_CH03_CITY/HUNYUAN_GENERATED/optimized")
os.makedirs(OUT, exist_ok=True)

ASSETS = {
    "clock_tower": {
        "source": "钟表.glb",
        "dimensions": (1.65, 1.65, 5.20),
        "triangles": 24000,
    },
    "municipal_tram": {
        "source": "电车.glb",
        "dimensions": (2.50, 9.00, 3.35),
        "triangles": 36000,
    },
    "reunion_fountain": {
        "source": "喷泉.glb",
        "dimensions": (4.60, 4.60, 2.70),
        "triangles": 28000,
    },
    "produce_market_stall": {
        "source": "杂货摊.glb",
        "dimensions": (3.60, 2.20, 2.80),
        "triangles": 40000,
    },
}


def triangle_count(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mins = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    maxs = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    return mins, maxs


def optimize(name, spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = os.path.join(DOWNLOADS, spec["source"])
    bpy.ops.import_scene.gltf(filepath=source)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"{name}: expected one mesh, got {len(meshes)}")

    obj = meshes[0]
    obj.name = name
    obj.data.name = f"{name}_mesh"
    before = triangle_count(obj.data)

    # glTF imports usually carry a Y-up to Z-up object rotation. Bake it before
    # measuring so the requested dimensions refer to Blender world X/Y/Z.
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    current = obj.dimensions.copy()
    target = Vector(spec["dimensions"])
    obj.scale = tuple(obj.scale[i] * target[i] / current[i] for i in range(3))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    target_triangles = spec["triangles"]
    ratio = min(1.0, target_triangles / before)
    decimate = obj.modifiers.new("runtime silhouette decimation", "DECIMATE")
    decimate.decimate_type = "COLLAPSE"
    decimate.ratio = ratio
    decimate.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=decimate.name)

    # Center XY and place the lowest vertex on Z=0, then bake that transform.
    low, high = bounds(obj)
    obj.location += Vector((-(low.x + high.x) * 0.5, -(low.y + high.y) * 0.5, -low.z))
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    # 2K is enough for a prop rendered into a 1920x1200 camera-locked layer.
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
    low, high = bounds(obj)
    return {
        "name": name,
        "source": source,
        "output": output,
        "source_bytes": os.path.getsize(source),
        "output_bytes": os.path.getsize(output),
        "triangles_before": before,
        "triangles_after": after,
        "reduction_percent": round((1 - after / before) * 100, 2),
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
