"""Render neutral review views of the Prologue Hunyuan bogie source GLB.

Run with Blender, for example:
  Blender --background --python scripts/art/render_prologue_bogie_preview.py -- input.glb output_dir
"""

import json
import math
import os
import sys

import bpy
from mathutils import Vector


def aim(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def world_bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    low = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    return low, high


def review_material(name, color, roughness=0.82):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return material


marker = sys.argv.index("--") + 1 if "--" in sys.argv else len(sys.argv)
source = os.path.abspath(sys.argv[marker])
output_dir = os.path.abspath(sys.argv[marker + 1])
os.makedirs(output_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
scene = bpy.context.scene
meshes = [obj for obj in scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError("No mesh objects found in GLB")

# Bake the importer transform, center the asset, and set its lowest point on Z=0.
for obj in meshes:
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
low, high = world_bounds(meshes)
offset = Vector((-(low.x + high.x) * 0.5, -(low.y + high.y) * 0.5, -low.z))
for obj in meshes:
    obj.location += offset
low, high = world_bounds(meshes)
center = (low + high) * 0.5
dimensions = high - low
extent = max(dimensions)

# A plain warm-neutral floor makes silhouette, contact points, and cast shadows legible.
bpy.ops.mesh.primitive_plane_add(size=extent * 5.5, location=(0, 0, -0.012))
floor = bpy.context.object
floor.name = "neutral review floor"
floor.data.materials.append(review_material("neutral floor", (0.72, 0.70, 0.66), 0.94))

world = bpy.data.worlds.new("neutral review world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.76, 0.75, 0.72, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.55
scene.world = world

key_data = bpy.data.lights.new("large soft key", "AREA")
key_data.energy = 1150
key_data.shape = "DISK"
key_data.size = extent * 2.4
key = bpy.data.objects.new("large soft key", key_data)
key.location = Vector((-extent * 1.25, -extent * 1.1, extent * 2.2))
scene.collection.objects.link(key)
aim(key, center)

fill_data = bpy.data.lights.new("cool edge fill", "AREA")
fill_data.energy = 650
fill_data.color = (0.58, 0.70, 0.82)
fill_data.size = extent * 1.8
fill = bpy.data.objects.new("cool edge fill", fill_data)
fill.location = Vector((extent * 1.4, extent * 1.1, extent * 1.3))
scene.collection.objects.link(fill)
aim(fill, center)

camera_data = bpy.data.cameras.new("review camera")
camera_data.type = "ORTHO"
camera = bpy.data.objects.new("review camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera

views = {
    "front": Vector((0, -1, 0.34)),
    "three-quarter": Vector((1.15, -1.55, 0.78)),
    "side": Vector((1, 0, 0.34)),
    "top-three-quarter": Vector((1.05, -1.25, 1.75)),
}

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.film_transparent = False
scene.view_settings.look = "AgX - Medium High Contrast"

rendered = []
for label, direction in views.items():
    direction.normalize()
    camera.location = center + direction * extent * 3.2
    aim(camera, center)
    camera_data.ortho_scale = max(dimensions.z * 1.75, dimensions.x * 0.78)
    if label == "side":
        camera_data.ortho_scale = max(dimensions.z * 1.8, dimensions.y * 1.45)
    elif label == "top-three-quarter":
        camera_data.ortho_scale = extent * 1.1
    filepath = os.path.join(output_dir, f"bogie-{label}.png")
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    rendered.append(filepath)

report = {
    "source": source,
    "dimensions_raw": [round(v, 6) for v in dimensions],
    "mesh_count": len(meshes),
    "rendered": rendered,
}
with open(os.path.join(output_dir, "preview-manifest.json"), "w", encoding="utf-8") as handle:
    json.dump(report, handle, indent=2)
print(json.dumps(report, indent=2))
