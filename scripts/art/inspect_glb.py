"""Print compact geometry/material statistics for one or more GLB files.

Run with Blender, for example:
  Blender --background --python scripts/art/inspect_glb.py -- asset.glb
"""

import json
import os
import sys

import bpy
from mathutils import Vector


def mesh_triangles(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def inspect(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    triangles = sum(mesh_triangles(obj.data) for obj in meshes)
    vertices = sum(len(obj.data.vertices) for obj in meshes)
    materials = {slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}
    images = []
    for image in bpy.data.images:
        images.append({
            "name": image.name,
            "width": image.size[0],
            "height": image.size[1],
            "packed": bool(image.packed_file),
        })

    world_corners = []
    for obj in meshes:
        world_corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if world_corners:
        mins = [min(point[i] for point in world_corners) for i in range(3)]
        maxs = [max(point[i] for point in world_corners) for i in range(3)]
        dimensions = [maxs[i] - mins[i] for i in range(3)]
    else:
        dimensions = [0, 0, 0]

    return {
        "path": os.path.abspath(path),
        "bytes": os.path.getsize(path),
        "objects": len(bpy.context.scene.objects),
        "meshes": len(meshes),
        "vertices": vertices,
        "triangles": triangles,
        "materials": sorted(materials),
        "images": images,
        "dimensions": dimensions,
        "mesh_detail": [
            {
                "name": obj.name,
                "vertices": len(obj.data.vertices),
                "triangles": mesh_triangles(obj.data),
                "materials": len(obj.material_slots),
            }
            for obj in sorted(meshes, key=lambda item: item.name)
        ],
    }


if __name__ == "__main__":
    marker = sys.argv.index("--") + 1 if "--" in sys.argv else len(sys.argv)
    print(json.dumps([inspect(path) for path in sys.argv[marker:]], ensure_ascii=False, indent=2))
