"""Optimize the user-supplied Hunyuan bogie and bake a fixed-camera sprite.

The heavy GLB stays outside Git in NIGHTFALL_Source_Assets. The web game uses
only the transparent fixed-camera PNG/WebP derivative produced by this script.

Run with Blender:
  Blender --background --python scripts/art/optimize_render_prologue_bogie.py -- source.glb
"""

import json
import os
import sys

import bpy
from mathutils import Vector


ROOT = "/Users/zhongzicheng/Documents/CS247G Game Design Part 2"
EXTERNAL_OUT = os.path.join(
    ROOT,
    "NIGHTFALL_Source_Assets/01_PROLOGUE/HUNYUAN_GENERATED/optimized",
)
RUNTIME_OUT = os.path.join(
    ROOT,
    "design-for-play-p2/src/assets/tutorial/mechanical-table/hunyuan",
)
TARGET_TRIANGLES = 48000
TARGET_LENGTH_M = 3.20


def triangles(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    low = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    return low, high


def aim(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


marker = sys.argv.index("--") + 1 if "--" in sys.argv else len(sys.argv)
source = os.path.abspath(sys.argv[marker])
os.makedirs(EXTERNAL_OUT, exist_ok=True)
os.makedirs(RUNTIME_OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
scene = bpy.context.scene
meshes = [obj for obj in scene.objects if obj.type == "MESH"]
if len(meshes) != 1:
    raise RuntimeError(f"Expected one Hunyuan mesh, got {len(meshes)}")

obj = meshes[0]
obj.name = "prologue_bogie_rocker_counterweight"
obj.data.name = "prologue_bogie_rocker_counterweight_mesh"
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

before = triangles(obj.data)
uniform_scale = TARGET_LENGTH_M / obj.dimensions.x
obj.scale = (uniform_scale, uniform_scale, uniform_scale)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

decimate = obj.modifiers.new("camera-locked silhouette decimation", "DECIMATE")
decimate.decimate_type = "COLLAPSE"
decimate.ratio = min(1.0, TARGET_TRIANGLES / before)
decimate.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=decimate.name)

low, high = bounds([obj])
obj.location += Vector((-(low.x + high.x) * 0.5, -(low.y + high.y) * 0.5, -low.z))
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
low, high = bounds([obj])
dimensions = high - low
center = (low + high) * 0.5

for image in bpy.data.images:
    if image.size[0] > 2048 or image.size[1] > 2048:
        image.scale(2048, 2048)
    image.pack()

optimized_glb = os.path.join(EXTERNAL_OUT, "bogie_rocker_counterweight_low.glb")
bpy.ops.export_scene.gltf(
    filepath=optimized_glb,
    export_format="GLB",
    export_apply=True,
    export_image_format="AUTO",
)

# Fixed orthographic camera matching the service-table side elevation.
camera_data = bpy.data.cameras.new("service-table camera")
camera_data.type = "ORTHO"
camera_data.ortho_scale = max(dimensions.z * 2.05, dimensions.x * 1.10)
camera = bpy.data.objects.new("service-table camera", camera_data)
scene.collection.objects.link(camera)
camera.location = center + Vector((0, -dimensions.x * 3.0, dimensions.z * 0.06))
aim(camera, center + Vector((0, 0, dimensions.z * 0.03)))
scene.camera = camera

key_data = bpy.data.lights.new("tungsten key", "AREA")
key_data.energy = 900
key_data.color = (1.0, 0.76, 0.49)
key_data.shape = "RECTANGLE"
key_data.size = dimensions.x * 1.8
key = bpy.data.objects.new("tungsten key", key_data)
key.location = Vector((-dimensions.x * 0.6, -dimensions.x * 0.8, dimensions.z * 2.7))
scene.collection.objects.link(key)
aim(key, center)

fill_data = bpy.data.lights.new("night fill", "AREA")
fill_data.energy = 520
fill_data.color = (0.31, 0.54, 0.62)
fill_data.size = dimensions.x * 1.6
fill = bpy.data.objects.new("night fill", fill_data)
fill.location = Vector((dimensions.x * 0.75, -dimensions.x * 0.4, dimensions.z * 1.1))
scene.collection.objects.link(fill)
aim(fill, center)

world = bpy.data.worlds.new("transparent world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.03, 0.035, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.18
scene.world = world

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.render.filepath = os.path.join(RUNTIME_OUT, "bogie-stage-v1.png")
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)

after = triangles(obj.data)
manifest = {
    "source": source,
    "source_bytes": os.path.getsize(source),
    "optimized_glb": optimized_glb,
    "optimized_bytes": os.path.getsize(optimized_glb),
    "runtime_png": scene.render.filepath,
    "triangles_before": before,
    "triangles_after": after,
    "reduction_percent": round((1 - after / before) * 100, 2),
    "dimensions_m": [round(value, 4) for value in dimensions],
    "texture_sizes": [[image.size[0], image.size[1]] for image in bpy.data.images],
}
with open(os.path.join(EXTERNAL_OUT, "optimization_manifest.json"), "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, indent=2)
with open(os.path.join(RUNTIME_OUT, "source-manifest.json"), "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, indent=2)
print(json.dumps(manifest, indent=2))
