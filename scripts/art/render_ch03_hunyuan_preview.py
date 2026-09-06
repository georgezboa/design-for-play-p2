"""Render neutral previews of the optimized Chapter 3 Hunyuan props."""

import os

import bpy
from mathutils import Vector


ROOT = "/Users/zhongzicheng/Documents/CS247G Game Design Part 2"
SOURCE = os.path.join(ROOT, "NIGHTFALL_Source_Assets/05_CH03_CITY/HUNYUAN_GENERATED/optimized")
OUT = os.path.join(ROOT, "design-for-play-p2/outputs/chapter03-hunyuan-optimized")
os.makedirs(OUT, exist_ok=True)

ASSETS = ["clock_tower", "municipal_tram", "reunion_fountain", "produce_market_stall"]


def mat(name, color, roughness=0.75):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return material


def aim(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


for name in ASSETS:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=os.path.join(SOURCE, f"{name}_low.glb"))
    hero = next(obj for obj in scene.objects if obj.type == "MESH")
    center = Vector((0, 0, hero.dimensions.z * 0.5))
    extent = max(hero.dimensions.x, hero.dimensions.y, hero.dimensions.z)

    bpy.ops.mesh.primitive_plane_add(size=extent * 5, location=(0, 0, -0.025))
    bpy.context.object.data.materials.append(mat("warm studio floor", (0.16, 0.145, 0.13), 0.9))

    camera_data = bpy.data.cameras.new("preview camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = extent * 1.42
    camera = bpy.data.objects.new("preview camera", camera_data)
    scene.collection.objects.link(camera)
    direction = Vector((1.2, -1.55, 1.0)).normalized()
    camera.location = center + direction * extent * 3
    aim(camera, center)
    scene.camera = camera

    sun_data = bpy.data.lights.new("warm key", "AREA")
    sun_data.energy = 850
    sun_data.shape = "DISK"
    sun_data.size = extent * 2.2
    sun = bpy.data.objects.new("warm key", sun_data)
    sun.location = Vector((-extent, -extent, extent * 2.5))
    scene.collection.objects.link(sun)
    aim(sun, center)

    fill_data = bpy.data.lights.new("cool fill", "AREA")
    fill_data.energy = 500
    fill_data.color = (0.42, 0.58, 0.7)
    fill_data.size = extent * 2
    fill = bpy.data.objects.new("cool fill", fill_data)
    fill.location = Vector((extent * 1.5, extent, extent * 1.5))
    scene.collection.objects.link(fill)
    aim(fill, center)

    world = bpy.data.worlds.new("preview world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.055, 0.045, 0.038, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.65
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
