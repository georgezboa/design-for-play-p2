"""Render neutral previews of the three Chapter 3 Hunyuan v2 assets.

The source hash names are deliberately mapped here before the final optimized
files receive stable production names. Run with Blender 4.1 in background mode.
"""

import os

import bpy
from mathutils import Vector


ROOT = "/Users/zhongzicheng/Documents/CS247G Game Design Part 2"
SOURCE = os.path.join(
    ROOT,
    "NIGHTFALL_Source_Assets/05_CH03_CITY/HUNYUAN_GENERATED/optimized_v2",
)
OUT = os.path.join(ROOT, "design-for-play-p2/outputs/chapter03-hunyuan-v2-source-previews")
os.makedirs(OUT, exist_ok=True)

ASSETS = {
    "old_municipal_archive": "old_municipal_archive_low.glb",
    "transit_ministry": "transit_ministry_low.glb",
    "scanner_tower": "scanner_tower_low.glb",
}


def material(name, color, roughness=0.8):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def aim(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


for name, filename in ASSETS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=os.path.join(SOURCE, filename))
    hero = next(obj for obj in scene.objects if obj.type == "MESH")

    # The generated files arrive Y-up. Bake the import rotation so the preview
    # camera and later authored dimensions both use Blender X/Y/Z consistently.
    bpy.context.view_layer.objects.active = hero
    hero.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    extent = max(hero.dimensions)
    center = Vector((0.0, 0.0, hero.dimensions.z * 0.5))

    bpy.ops.mesh.primitive_plane_add(size=extent * 5.0, location=(0.0, 0.0, -0.008))
    bpy.context.object.data.materials.append(material("warm preview floor", (0.12, 0.105, 0.09)))

    camera_data = bpy.data.cameras.new("preview camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = extent * 1.35
    camera = bpy.data.objects.new("preview camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = center + Vector((1.25, -1.55, 1.05)).normalized() * extent * 3.5
    aim(camera, center)
    scene.camera = camera

    key_data = bpy.data.lights.new("warm key", "AREA")
    # Preserve comparable exposure after the production files are scaled from
    # sub-meter generator coordinates to authored 8-19 meter world sizes.
    key_data.energy = 700 * extent * extent
    key_data.shape = "DISK"
    key_data.size = extent * 2.2
    key = bpy.data.objects.new("warm key", key_data)
    key.location = Vector((-extent, -extent, extent * 2.5))
    scene.collection.objects.link(key)
    aim(key, center)

    fill_data = bpy.data.lights.new("cool fill", "AREA")
    fill_data.energy = 350 * extent * extent
    fill_data.color = (0.42, 0.58, 0.7)
    fill_data.size = extent * 2.0
    fill = bpy.data.objects.new("cool fill", fill_data)
    fill.location = Vector((extent * 1.5, extent, extent * 1.5))
    scene.collection.objects.link(fill)
    aim(fill, center)

    world = bpy.data.worlds.new("preview world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.045, 0.038, 0.032, 1.0)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    scene.world = world

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = os.path.join(OUT, f"{name}_low_preview.png")
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)
    print("RENDERED", scene.render.filepath)
