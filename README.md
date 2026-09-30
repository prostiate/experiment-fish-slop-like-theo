# FISHSLOP 3D 🐟🤿

> **An Insaniquarium-style fish feeding simulation meets Subnautica 3D underwater piloting.**  
> Built from scratch with **Three.js**, **TypeScript**, **Web Audio API**, and procedurally modeled with **Blender 5.2**.

---

## 🌊 Overview

**Fishslop 3D** brings the classic Insaniquarium feeding frenzy into a fully 3-dimensional aquatic environment:
- Instead of clicking flat 2D water to drop food, you pilot a sleek **research submarine** in the aquarium tank.
- Swim freely in 6 degrees of freedom (pitch, yaw, banking roll, vertical ballast ascent/dive, afterburner boost).
- Drop nutrient pellets from the sub's underbelly cargo hatch to nourish your swimming schools of fish.
- Collect shimmering gold, silver, bronze coins and diamond gems as your fish grow.
- Defend your aquarium tank against hostile boss predators using high-velocity plasma torpedoes!
- Hatch the mythical **Golden Aqua-Dragon** by collecting all 3 Ancient Egg Pieces to win!

---

## 🎮 Submarine Controls (Subnautica-Style)

| Control | Action |
| :--- | :--- |
| **W / S** | Forward Thrusters / Reverse Propulsion |
| **A / D** | Steer Left / Right (Yaw + Roll Banking) |
| **SPACE** | Ballast Ascent (Rise towards water surface) |
| **C / CTRL** | Ballast Descent (Dive towards tank floor) |
| **SHIFT** | Cavitation Afterburner (Turbo Boost) |
| **MOUSE** | Smooth 3D Steering (Click canvas to lock cursor) |
| **F / LEFT CLICK** | Drop Fish Food Pellet from Sub Belly Hatch |
| **RIGHT CLICK / E** | Fire Plasma Defense Torpedo |
| **L** | Toggle High-Beam Volumetric Headlights |
| **V / C** | Toggle 3rd-Person Chase Cam / 1st-Person Cockpit View |
| **Q** | Dispatch Acoustic Bio-Sonar Ping (3D Shockwave) |
| **1 – 6** | Quick Shop Hotkeys (Guppy, Food, Cap, Carnivore, Breeder, Egg) |
| **U** | Open Submarine Drydock & Engineering Tech Tree |
| **H** | Open Controls & Gameplay Guide |
| **M** | Mute / Unmute Procedural Audio Engine |

---

## 🐟 Fish Species & Lifecycle

1. **Baby Guppy (Tier 1)**: Fast, tiny minnow. Consumes basic pellets and drops **Bronze Coins ($15)**. Evolves after 3 feedings.
2. **Medium Guppy (Tier 2)**: Sturdy adolescent fish. Drops **Silver Coins ($40)**. Evolves after 5 feedings.
3. **King Guppy (Tier 3)**: Adorned with a golden crown. Drops gleaming **Gold Coins ($100)**!
4. **Carnivore (Piranha / Anglerfish)**: Doesn't eat pellets—hunts baby guppies, but rewards you with sparkling **Diamonds ($250)**!
5. **Breeder (Guppy Mother)**: Gentle large fish that periodically births new baby guppies into the tank!

### 💡 Hunger Mechanics
- Fish get hungry over time. When hunger > 50%, they actively seek out sinking food pellets.
- If starved (>65%), their skin shifts to a sickly green hue.
- If hunger hits 100% for too long, fish belly-up and dissolve. Keep them well-fed!

---

## 👾 Predator Invasions & Combat

Every few minutes, red sirens blare across the telemetry HUD:
- A rogue deep-sea Leviathan invades the tank through an abyssal rift!
- The predator hunts and consumes your fish.
- Pilot your submarine and fire torpedoes (`Right Click` / `E`) to defeat the invader.
- Destroying the predator releases a massive treasure bounty of gold coins and diamond gems!

---

## 🛠️ Submarine Tech Tree Upgrades

Access the **Drydock** (`U` key or top gear icon):
- **Cavitation Thrusters**: +25% top cruising speed & afterburner thrust.
- **Magnetic Hull Tractor**: Powerful suction field pulls sinking coins and gems directly into your hull.
- **Plasma Torpedo Battery**: Faster missile velocity, larger blast radius, +50% monster damage.
- **Bio-Sonar Ping**: Expands acoustic radar detection range and marks targets in 3D.

---

## 🎨 3D Blender Pipeline

All primary 3D assets are procedurally modeled and exported as production-ready `.glb` files using headless **Blender 5.2**:
- `submarine.glb`: Submersible hull, cockpit bubble dome, dual thruster pods, rotating propellers, torpedo racks.
- `guppy.glb`: Streamlined fish body, articulated tail fin, pectoral fins, dorsal fin, expressive eyes.
- `carnivore.glb`: Heavy predator fish with toothy jaw and glowing bioluminescent angler lure.
- `coin.glb`: Beveled metallic coin with embossed star emblem.
- `diamond.glb`: Brilliant cut faceted gemstone.
- `predator.glb`: Armored leviathan with spiny dorsal ridges, fanged jaw, and tail fin.

To regenerate or customize all 3D models with Blender:
```bash
blender -b -P scripts/generate_models.py
```

---

## 🚀 Running the Project

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in any modern web browser.

### Production Build
```bash
npm run build
npm run preview
```
Builds optimized production assets to `dist/`.

---

## 🎧 Procedural Web Audio Engine

No external `.mp3` or `.wav` files needed! The game synthesizes all audio procedurally via native **Web Audio API**:
- Sub-bass ambient ocean drone
- Dynamic submarine engine hum (frequency & volume scale with sub speed)
- Micro-bubble bloops and fizzing aerator stones
- Pellet release "ploop"
- Fish eating "chomp/gulp"
- Sparkling coin pickup chord chimes (pentatonic scales matching coin tiers)
- High-Q resonant sonar ping with acoustic decay
- Red alert klaxon siren for predator invasions
- Underwater muffled torpedo launch & explosion rumbles
