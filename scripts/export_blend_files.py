import bpy
import os

MODELS_DIR = os.path.abspath("public/models")

# 1. Convert each .glb to a native .blend file
for f in os.listdir(MODELS_DIR):
    if f.endswith(".glb"):
        name = f.replace(".glb", "")
        glb_path = os.path.join(MODELS_DIR, f)
        blend_path = os.path.join(MODELS_DIR, f"{name}.blend")

        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=glb_path)
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        print(f"Saved: {blend_path}")

# 2. Create an All-In-One Showcase Scene with all models side-by-side
bpy.ops.wm.read_factory_settings(use_empty=True)

offsets = {
    "submarine.glb": (-7, 0, 0),
    "guppy.glb": (-2, 0, 0),
    "carnivore.glb": (1.5, 0, 0),
    "predator.glb": (7.5, 0, 0),
    "coin.glb": (-2, -3.5, 0),
    "diamond.glb": (1.5, -3.5, 0),
}

for glb_name, (x, y, z) in offsets.items():
    p = os.path.join(MODELS_DIR, glb_name)
    if os.path.exists(p):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=p)
        new_objs = set(bpy.data.objects) - before
        for obj in new_objs:
            if obj.parent is None:
                obj.location.x += x
                obj.location.y += y
                obj.location.z += z

# Add studio lighting and camera to the showcase
bpy.ops.object.camera_add(location=(0, -20, 6), rotation=(1.35, 0, 0))
bpy.ops.object.light_add(type='SUN', location=(5, -5, 10))

showcase_path = os.path.join(MODELS_DIR, "fishslop_showcase.blend")
bpy.ops.wm.save_as_mainfile(filepath=showcase_path)
print(f"Showcase saved: {showcase_path}")
