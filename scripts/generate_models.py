"""
Fishslop Procedural 3D Asset Generator for Blender 5.2
Executes in headless Blender to generate production-ready .glb models
"""
import bpy
import math
import os

OUTPUT_DIR = os.path.abspath("public/models")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def reset_scene():
    """Wipe default cube, camera, and lights"""
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, color=(1,1,1,1), metallic=0.0, roughness=0.5, emission=None, emission_strength=1.0, transmission=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = color
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if transmission > 0 and "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        if emission:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = emission
            elif "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = emission
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def export_model(filename):
    filepath = os.path.join(OUTPUT_DIR, filename)
    print(f"Exporting GLB to: {filepath}")
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
        export_apply=True
    )
    print(f"Successfully generated {filename} ({os.path.getsize(filepath):,} bytes)")

# ==========================================
# 1. SUBMARINE MODEL (Yellow Subnautica Explorer)
# ==========================================
def generate_submarine():
    reset_scene()
    print("Generating Submarine...")

    yellow_mat = create_pbr_material("SubYellow", color=(1.0, 0.72, 0.05, 1.0), metallic=0.25, roughness=0.35)
    dark_mat = create_pbr_material("SubDarkMetal", color=(0.12, 0.15, 0.2, 1.0), metallic=0.85, roughness=0.25)
    glass_mat = create_pbr_material("SubGlass", color=(0.7, 0.9, 1.0, 1.0), roughness=0.05, transmission=0.9)
    light_mat = create_pbr_material("SubHeadlight", color=(1, 1, 1, 1), emission=(0.6, 0.9, 1.0, 1), emission_strength=4.0)
    copper_mat = create_pbr_material("SubBrass", color=(0.85, 0.55, 0.2, 1.0), metallic=0.9, roughness=0.2)

    # Main Hull (Cylinder capsule stretched along Y)
    bpy.ops.mesh.primitive_cylinder_add(radius=1.6, depth=5.5, location=(0, 0, 0))
    hull = bpy.context.active_object
    hull.name = "Hull_Main"
    hull.rotation_euler = (math.radians(90), 0, 0)
    hull.data.materials.append(yellow_mat)

    # Front Nose (Hemisphere)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.6, location=(0, 2.75, 0))
    nose = bpy.context.active_object
    nose.name = "Hull_Nose"
    nose.scale = (1.0, 1.2, 1.0)
    nose.data.materials.append(yellow_mat)

    # Rear Taper Cone
    bpy.ops.mesh.primitive_cone_add(radius1=1.6, radius2=0.5, depth=2.8, location=(0, -4.15, 0))
    rear = bpy.context.active_object
    rear.name = "Hull_Rear"
    rear.rotation_euler = (math.radians(-90), 0, 0)
    rear.data.materials.append(yellow_mat)

    # Glass Bubble Cockpit Dome
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.35, location=(0, 1.2, 0.95))
    dome = bpy.context.active_object
    dome.name = "Cockpit_Glass"
    dome.scale = (1.0, 1.15, 0.85)
    dome.data.materials.append(glass_mat)

    # Conning Tower & Periscope
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.6, 1.85))
    tower = bpy.context.active_object
    tower.name = "Conning_Tower"
    tower.scale = (0.7, 1.8, 0.9)
    tower.data.materials.append(dark_mat)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=1.2, location=(0, -0.2, 2.7))
    periscope = bpy.context.active_object
    periscope.name = "Periscope"
    periscope.data.materials.append(dark_mat)

    # Dual Thruster Pods (Left & Right)
    for side, x in [("Left", -1.9), ("Right", 1.9)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=2.2, location=(x, -2.4, -0.3))
        pod = bpy.context.active_object
        pod.name = f"Thruster_Pod_{side}"
        pod.rotation_euler = (math.radians(90), 0, 0)
        pod.data.materials.append(dark_mat)

        # Strut
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x * 0.5, -2.4, -0.1))
        strut = bpy.context.active_object
        strut.name = f"Thruster_Strut_{side}"
        strut.scale = (abs(x) * 0.5, 0.5, 0.15)
        strut.data.materials.append(dark_mat)

        # Propeller Blades
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, -3.6, -0.3))
        prop = bpy.context.active_object
        prop.name = f"Propeller_{side}"
        prop.scale = (1.1, 0.08, 0.22)
        prop.data.materials.append(copper_mat)

    # Headlights (Dual Front Beams)
    for side, x in [("Left", -1.0), ("Right", 1.0)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.4, location=(x, 3.4, 0.2))
        housing = bpy.context.active_object
        housing.name = f"Headlight_Housing_{side}"
        housing.rotation_euler = (math.radians(90), 0, 0)
        housing.data.materials.append(dark_mat)

        bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.08, location=(x, 3.6, 0.2))
        lens = bpy.context.active_object
        lens.name = f"Headlight_Lens_{side}"
        lens.rotation_euler = (math.radians(90), 0, 0)
        lens.data.materials.append(light_mat)

    # Torpedo Launchers on flanks
    for side, x in [("Left", -1.6), ("Right", 1.6)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.35, depth=2.6, location=(x, 0.2, 0.45))
        tube = bpy.context.active_object
        tube.name = f"Torpedo_Tube_{side}"
        tube.rotation_euler = (math.radians(90), 0, 0)
        tube.data.materials.append(dark_mat)

    # Food Bay Hatch on bottom
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -1.65))
    hatch = bpy.context.active_object
    hatch.name = "Food_Hatch"
    hatch.scale = (0.9, 1.2, 0.2)
    hatch.data.materials.append(dark_mat)

    export_model("submarine.glb")

# ==========================================
# 2. GUPPY FISH MODEL
# ==========================================
def generate_guppy():
    reset_scene()
    print("Generating Guppy Fish...")

    orange_mat = create_pbr_material("FishOrange", color=(1.0, 0.55, 0.05, 1.0), roughness=0.3, metallic=0.1)
    fin_mat = create_pbr_material("FishFin", color=(1.0, 0.75, 0.2, 0.85), roughness=0.4, transmission=0.4)
    eye_white = create_pbr_material("EyeWhite", color=(1, 1, 1, 1), roughness=0.1)
    pupil_mat = create_pbr_material("EyePupil", color=(0.02, 0.02, 0.02, 1), roughness=0.1)

    # Body (Tear-shaped sphere)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(0, 0, 0))
    body = bpy.context.active_object
    body.name = "Fish_Body"
    body.scale = (0.6, 1.6, 1.0)
    body.data.materials.append(orange_mat)

    # Tail Fin (Caudal)
    bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=0.08, location=(0, -2.2, 0))
    tail = bpy.context.active_object
    tail.name = "Tail_Fin"
    tail.rotation_euler = (0, math.radians(90), 0)
    tail.scale = (1.2, 0.7, 0.05)
    tail.data.materials.append(fin_mat)

    # Dorsal Fin
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.4, 1.1))
    dorsal = bpy.context.active_object
    dorsal.name = "Dorsal_Fin"
    dorsal.scale = (0.06, 0.8, 0.5)
    dorsal.rotation_euler = (math.radians(-25), 0, 0)
    dorsal.data.materials.append(fin_mat)

    # Pectoral Fins
    for side, x in [("Left", -0.65), ("Right", 0.65)]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, 0.3, -0.2))
        pec = bpy.context.active_object
        pec.name = f"Pectoral_Fin_{side}"
        pec.scale = (0.05, 0.5, 0.35)
        pec.rotation_euler = (0, math.radians(35 if side == "Left" else -35), math.radians(20))
        pec.data.materials.append(fin_mat)

    # Eyes
    for side, x in [("Left", -0.45), ("Right", 0.45)]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.28, location=(x, 0.9, 0.25))
        eye = bpy.context.active_object
        eye.name = f"Eye_{side}"
        eye.data.materials.append(eye_white)

        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(x * 1.15, 1.05, 0.28))
        pupil = bpy.context.active_object
        pupil.name = f"Pupil_{side}"
        pupil.data.materials.append(pupil_mat)

    export_model("guppy.glb")

# ==========================================
# 3. CARNIVORE FISH MODEL (Predator Fish)
# ==========================================
def generate_carnivore():
    reset_scene()
    print("Generating Carnivore Fish...")

    blue_mat = create_pbr_material("CarnivoreSkin", color=(0.08, 0.25, 0.55, 1.0), metallic=0.4, roughness=0.3)
    fin_mat = create_pbr_material("CarnivoreFin", color=(0.15, 0.5, 0.8, 0.9), roughness=0.35)
    glow_mat = create_pbr_material("AnglerLure", color=(0, 1, 1, 1), emission=(0.2, 0.9, 1.0, 1), emission_strength=6.0)
    tooth_mat = create_pbr_material("Teeth", color=(0.95, 0.95, 0.9, 1), roughness=0.2)

    # Heavy Angler/Piranha Body
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.2, location=(0, 0, 0))
    body = bpy.context.active_object
    body.name = "Carnivore_Body"
    body.scale = (0.8, 1.4, 1.1)
    body.data.materials.append(blue_mat)

    # Sharp Teeth in Lower Jaw
    for i in range(5):
        angle = (i - 2) * 0.25
        tx = math.sin(angle) * 0.55
        ty = 1.15 + math.cos(angle) * 0.3
        bpy.ops.mesh.primitive_cone_add(radius1=0.08, depth=0.35, location=(tx, ty, -0.15))
        tooth = bpy.context.active_object
        tooth.name = f"Tooth_{i}"
        tooth.rotation_euler = (math.radians(20), 0, 0)
        tooth.data.materials.append(tooth_mat)

    # Anglerfish Bioluminescent Lure Stalk
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=1.4, location=(0, 0.7, 1.4))
    stalk = bpy.context.active_object
    stalk.name = "Lure_Stalk"
    stalk.rotation_euler = (math.radians(45), 0, 0)
    stalk.data.materials.append(blue_mat)

    # Glowing Lure Bulb
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.25, location=(0, 1.25, 1.9))
    bulb = bpy.context.active_object
    bulb.name = "Lure_Bulb"
    bulb.data.materials.append(glow_mat)

    # Caudal & Dorsal Fins
    bpy.ops.mesh.primitive_cylinder_add(radius=1.1, depth=0.08, location=(0, -1.9, 0))
    tail = bpy.context.active_object
    tail.rotation_euler = (0, math.radians(90), 0)
    tail.scale = (1.3, 0.6, 0.05)
    tail.data.materials.append(fin_mat)

    export_model("carnivore.glb")

# ==========================================
# 4. COIN MODEL (Gold & Silver Coin)
# ==========================================
def generate_coin():
    reset_scene()
    print("Generating Coin...")

    gold_mat = create_pbr_material("CoinGold", color=(1.0, 0.84, 0.0, 1.0), metallic=0.95, roughness=0.15)
    star_mat = create_pbr_material("CoinEmblem", color=(1.0, 0.95, 0.6, 1.0), metallic=0.9, roughness=0.1, emission=(0.5, 0.4, 0.0, 1), emission_strength=1.5)

    # Coin Disc with Chamfer Rim
    bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=0.22, vertices=32, location=(0, 0, 0))
    coin = bpy.context.active_object
    coin.name = "Coin_Disc"
    coin.data.materials.append(gold_mat)

    # Raised Outer Rim
    bpy.ops.mesh.primitive_torus_add(major_radius=0.92, minor_radius=0.08, location=(0, 0, 0))
    rim = bpy.context.active_object
    rim.name = "Coin_Rim"
    rim.scale = (1.0, 1.0, 1.2)
    rim.data.materials.append(gold_mat)

    # Center Star Emblem (4-sided cone facets)
    bpy.ops.mesh.primitive_cone_add(radius1=0.45, depth=0.18, vertices=4, location=(0, 0, 0.12))
    star_front = bpy.context.active_object
    star_front.name = "Star_Front"
    star_front.data.materials.append(star_mat)

    bpy.ops.mesh.primitive_cone_add(radius1=0.45, depth=0.18, vertices=4, location=(0, 0, -0.12))
    star_back = bpy.context.active_object
    star_back.name = "Star_Back"
    star_back.rotation_euler = (math.radians(180), 0, 0)
    star_back.data.materials.append(star_mat)

    export_model("coin.glb")

# ==========================================
# 5. DIAMOND GEM MODEL
# ==========================================
def generate_diamond():
    reset_scene()
    print("Generating Diamond...")

    cyan_gem = create_pbr_material("GemCyan", color=(0.2, 0.95, 1.0, 1.0), roughness=0.05, transmission=0.85, emission=(0.0, 0.4, 0.6, 1), emission_strength=2.0)

    # Brilliant cut double pyramid
    bpy.ops.mesh.primitive_cone_add(radius1=1.0, radius2=0.5, depth=0.5, vertices=8, location=(0, 0, 0.25))
    crown = bpy.context.active_object
    crown.data.materials.append(cyan_gem)

    bpy.ops.mesh.primitive_cone_add(radius1=1.0, radius2=0.0, depth=1.2, vertices=8, location=(0, 0, -0.6))
    pavilion = bpy.context.active_object
    pavilion.rotation_euler = (math.radians(180), 0, 0)
    pavilion.data.materials.append(cyan_gem)

    export_model("diamond.glb")

# ==========================================
# 6. PREDATOR BOSS MODEL (Gargantuan Cyber Leviathan)
# ==========================================
def generate_predator():
    reset_scene()
    print("Generating Predator Boss...")

    carapace_mat = create_pbr_material("BossArmor", color=(0.18, 0.04, 0.25, 1.0), metallic=0.7, roughness=0.3)
    red_eye_mat = create_pbr_material("BossEyes", color=(1.0, 0.0, 0.2, 1.0), emission=(1.0, 0.05, 0.2, 1.0), emission_strength=8.0)
    spine_mat = create_pbr_material("BossSpine", color=(0.08, 0.01, 0.12, 1.0), metallic=0.85, roughness=0.2)

    # Monster Head & Torso
    bpy.ops.mesh.primitive_cone_add(radius1=2.2, radius2=0.8, depth=6.0, vertices=12, location=(0, 1.0, 0))
    head = bpy.context.active_object
    head.name = "Predator_Torso"
    head.rotation_euler = (math.radians(-90), 0, 0)
    head.scale = (0.8, 1.0, 0.65)
    head.data.materials.append(carapace_mat)

    # Massive Lower Jaw with Teeth
    bpy.ops.mesh.primitive_cone_add(radius1=1.4, radius2=0.2, depth=3.2, vertices=8, location=(0, 2.8, -0.6))
    jaw = bpy.context.active_object
    jaw.name = "Predator_Jaw"
    jaw.rotation_euler = (math.radians(-90), 0, 0)
    jaw.scale = (0.75, 1.0, 0.4)
    jaw.data.materials.append(carapace_mat)

    # Glowing Red Eyes
    for side, x in [("Left", -1.2), ("Right", 1.2)]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, location=(x, 3.2, 0.6))
        eye = bpy.context.active_object
        eye.name = f"Predator_Eye_{side}"
        eye.data.materials.append(red_eye_mat)

    # Segmented Tail & Fin
    bpy.ops.mesh.primitive_cylinder_add(radius=1.8, depth=0.15, vertices=6, location=(0, -3.2, 0))
    fin = bpy.context.active_object
    fin.name = "Predator_TailFin"
    fin.rotation_euler = (0, math.radians(90), 0)
    fin.scale = (2.2, 1.2, 0.08)
    fin.data.materials.append(spine_mat)

    # Spiny Dorsal Plates
    for s in range(4):
        bpy.ops.mesh.primitive_cone_add(radius1=0.4, depth=1.6 - s * 0.25, location=(0, 1.2 - s * 1.4, 1.3))
        spike = bpy.context.active_object
        spike.name = f"Dorsal_Spike_{s}"
        spike.rotation_euler = (math.radians(25), 0, 0)
        spike.data.materials.append(spine_mat)

    export_model("predator.glb")

if __name__ == "__main__":
    print("=== STARTING FISHSLOP 3D BLENDER MODEL GENERATOR ===")
    generate_submarine()
    generate_guppy()
    generate_carnivore()
    generate_coin()
    generate_diamond()
    generate_predator()
    print("=== ALL 3D ASSETS EXPORTED SUCCESSFULLY VIA BLENDER! ===")
