import * as THREE from 'three';
import { WORLD_CONFIG } from '../config';
import { createCausticsMaterial } from './CausticsShader';

export class AquariumTank {
  public group: THREE.Group;
  private causticsMat: THREE.ShaderMaterial;
  private bubbleParticles!: THREE.Points;
  private bubbleVelocities!: Float32Array;
  private kelpMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // Initialize caustics material
    this.causticsMat = createCausticsMaterial();

    this.createFloor();
    this.createWaterSurface();
    this.createGlassWalls();
    this.createCoralsAndRocks();
    this.createKelpForest();
    this.createTreasureChest();
    this.createBubbleAerators();
    this.createLighting(scene);
  }

  private createFloor(): void {
    const geo = new THREE.PlaneGeometry(
      WORLD_CONFIG.TANK_WIDTH * 1.05,
      WORLD_CONFIG.TANK_DEPTH * 1.05,
      48,
      48
    );
    geo.rotateX(-Math.PI / 2);

    // Add gentle sand dunes perturbation
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dune = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 1.8;
      pos.setY(i, dune);
    }
    geo.computeVertexNormals();

    const floor = new THREE.Mesh(geo, this.causticsMat);
    floor.position.y = WORLD_CONFIG.TANK_FLOOR_Y;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private createWaterSurface(): void {
    const geo = new THREE.PlaneGeometry(
      WORLD_CONFIG.TANK_WIDTH,
      WORLD_CONFIG.TANK_DEPTH,
      32,
      32
    );
    geo.rotateX(Math.PI / 2);

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x2288cc,
      transmission: 0.85,
      opacity: 0.7,
      transparent: true,
      roughness: 0.1,
      ior: 1.333,
      side: THREE.DoubleSide,
    });

    const surface = new THREE.Mesh(geo, mat);
    surface.position.y = WORLD_CONFIG.WATER_SURFACE_Y;
    this.group.add(surface);
  }

  private createGlassWalls(): void {
    // Semi-transparent tank boundaries with cyan tinted edges
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.05,
      transmission: 0.9,
      side: THREE.BackSide,
    });

    const boxGeo = new THREE.BoxGeometry(
      WORLD_CONFIG.TANK_WIDTH,
      WORLD_CONFIG.TANK_HEIGHT,
      WORLD_CONFIG.TANK_DEPTH
    );

    const glassBox = new THREE.Mesh(boxGeo, glassMat);
    glassBox.position.y = (WORLD_CONFIG.WATER_SURFACE_Y + WORLD_CONFIG.TANK_FLOOR_Y) / 2;
    this.group.add(glassBox);

    // Frame borders around the tank corners
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.35,
      linewidth: 2,
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    edgeLines.position.copy(glassBox.position);
    this.group.add(edgeLines);
  }

  private createCoralsAndRocks(): void {
    // Scatter decorative low-poly rocks and colorful corals on the sea floor
    const coralColors = [0xff4488, 0xff7733, 0x9933ff, 0x00ddaa, 0xffcc00];

    for (let i = 0; i < 28; i++) {
      const x = (Math.random() - 0.5) * (WORLD_CONFIG.TANK_WIDTH - 15);
      const z = (Math.random() - 0.5) * (WORLD_CONFIG.TANK_DEPTH - 15);
      const y = WORLD_CONFIG.TANK_FLOOR_Y;

      // Rock Base
      const rockGeo = new THREE.DodecahedronGeometry(2.0 + Math.random() * 2.5, 1);
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        roughness: 0.85,
        flatShading: true,
      });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(x, y + 1.2, z);
      rock.scale.set(1 + Math.random() * 0.5, 0.6 + Math.random() * 0.4, 1 + Math.random() * 0.5);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      this.group.add(rock);

      // Coral Branches / Sponges sprouting from the rock
      const coralCount = 2 + Math.floor(Math.random() * 3);
      for (let c = 0; c < coralCount; c++) {
        const color = coralColors[Math.floor(Math.random() * coralColors.length)];
        const branchGeo = new THREE.CylinderGeometry(0.2, 0.6, 2.5 + Math.random() * 2.5, 6);
        const branchMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.4,
          metalness: 0.1,
          emissive: color,
          emissiveIntensity: 0.15,
          flatShading: true,
        });

        const branch = new THREE.Mesh(branchGeo, branchMat);
        branch.position.set(
          x + (Math.random() - 0.5) * 2,
          y + 2.5 + Math.random(),
          z + (Math.random() - 0.5) * 2
        );
        branch.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
        this.group.add(branch);

        // Glowing anemone tips
        const tipGeo = new THREE.SphereGeometry(0.35, 6, 6);
        const tipMat = new THREE.MeshBasicMaterial({ color: 0xeeffff });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(0, (2.5 + Math.random() * 2.5) / 2, 0);
        branch.add(tip);
      }
    }
  }

  private createKelpForest(): void {
    // Tall swaying seaweed ribbons on sides
    const kelpMat = new THREE.MeshStandardMaterial({
      color: 0x228833,
      roughness: 0.6,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    for (let k = 0; k < 18; k++) {
      const height = 22 + Math.random() * 14;
      const geo = new THREE.PlaneGeometry(1.2, height, 2, 16);
      const mesh = new THREE.Mesh(geo, kelpMat);

      // Position along the perimeter corners
      const side = k % 4;
      let x = 0;
      let z = 0;
      if (side === 0) { x = -WORLD_CONFIG.TANK_WIDTH / 2 + 6 + Math.random() * 6; z = (Math.random() - 0.5) * 60; }
      else if (side === 1) { x = WORLD_CONFIG.TANK_WIDTH / 2 - 6 - Math.random() * 6; z = (Math.random() - 0.5) * 60; }
      else if (side === 2) { z = -WORLD_CONFIG.TANK_DEPTH / 2 + 6 + Math.random() * 6; x = (Math.random() - 0.5) * 80; }
      else { z = WORLD_CONFIG.TANK_DEPTH / 2 - 6 - Math.random() * 6; x = (Math.random() - 0.5) * 80; }

      mesh.position.set(x, WORLD_CONFIG.TANK_FLOOR_Y + height / 2, z);
      mesh.rotation.y = Math.random() * Math.PI;
      this.group.add(mesh);
      this.kelpMeshes.push(mesh);
    }
  }

  private createTreasureChest(): void {
    // Sunken antique pirate treasure chest resting on the seabed
    const chestGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.7 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.3 });

    // Chest base
    const baseGeo = new THREE.BoxGeometry(4.5, 2.5, 3.2);
    const base = new THREE.Mesh(baseGeo, woodMat);
    chestGroup.add(base);

    // Chest lid (half cylinder)
    const lidGeo = new THREE.CylinderGeometry(1.6, 1.6, 4.5, 12, 1, false, 0, Math.PI);
    lidGeo.rotateZ(Math.PI / 2);
    const lid = new THREE.Mesh(lidGeo, woodMat);
    lid.position.y = 1.25;
    lid.rotation.x = -0.3; // slightly open lid!
    chestGroup.add(lid);

    // Glowing treasure inside
    const treasureGlow = new THREE.PointLight(0xffcc00, 1.5, 12);
    treasureGlow.position.set(0, 1.4, 0.4);
    chestGroup.add(treasureGlow);

    chestGroup.position.set(28, WORLD_CONFIG.TANK_FLOOR_Y + 1.25, -15);
    chestGroup.rotation.y = -0.6;
    this.group.add(chestGroup);
  }

  private createBubbleAerators(): void {
    // Particle system for rising air bubble columns
    const bubbleCount = 400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(bubbleCount * 3);
    this.bubbleVelocities = new Float32Array(bubbleCount);

    // Two aerator stone positions
    const aerators = [
      { x: -30, z: -15 },
      { x: 30, z: 20 },
      { x: 0, z: -25 },
    ];

    for (let i = 0; i < bubbleCount; i++) {
      const aerator = aerators[i % aerators.length];
      positions[i * 3 + 0] = aerator.x + (Math.random() - 0.5) * 3.5;
      positions[i * 3 + 1] = WORLD_CONFIG.TANK_FLOOR_Y + Math.random() * (WORLD_CONFIG.WATER_SURFACE_Y - WORLD_CONFIG.TANK_FLOOR_Y);
      positions[i * 3 + 2] = aerator.z + (Math.random() - 0.5) * 3.5;

      this.bubbleVelocities[i] = 4.0 + Math.random() * 4.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom circle texture for soft round bubbles
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 28);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.6, 'rgba(180, 240, 255, 0.6)');
    grad.addColorStop(1, 'rgba(100, 200, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 1.1,
      map: texture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.bubbleParticles = new THREE.Points(geo, mat);
    this.group.add(this.bubbleParticles);
  }

  private createLighting(scene: THREE.Scene): void {
    // Water Fog for atmospheric depth
    scene.fog = new THREE.FogExp2(WORLD_CONFIG.WATER_COLOR, 0.012);

    // Deep sea ambient light
    const ambient = new THREE.AmbientLight(WORLD_CONFIG.AMBIENT_LIGHT, 1.8);
    scene.add(ambient);

    // Sunlight piercing water from above
    const sunLight = new THREE.DirectionalLight(WORLD_CONFIG.SUN_LIGHT, 2.4);
    sunLight.position.set(20, 60, 20);
    sunLight.target.position.set(0, 0, 0);
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Soft turquoise fill light from underneath
    const fillLight = new THREE.DirectionalLight(0x004466, 0.8);
    fillLight.position.set(-20, -40, -20);
    scene.add(fillLight);
  }

  /**
   * Update animated caustics, kelp swaying, and rising bubble aerators
   */
  public update(delta: number, elapsed: number): void {
    // Update caustics shader time uniform
    this.causticsMat.uniforms.uTime.value = elapsed;

    // Sway kelp leaves
    for (let i = 0; i < this.kelpMeshes.length; i++) {
      const mesh = this.kelpMeshes[i];
      mesh.rotation.z = Math.sin(elapsed * 1.5 + i * 0.8) * 0.08;
      mesh.rotation.x = Math.cos(elapsed * 1.2 + i * 0.5) * 0.06;
    }

    // Rise bubbles
    const pos = this.bubbleParticles.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + this.bubbleVelocities[i] * delta;
      // Wobble X and Z gently
      let x = pos.getX(i) + Math.sin(elapsed * 4.0 + i) * 0.04;
      let z = pos.getZ(i) + Math.cos(elapsed * 4.0 + i) * 0.04;

      if (y > WORLD_CONFIG.WATER_SURFACE_Y) {
        y = WORLD_CONFIG.TANK_FLOOR_Y + 1.0;
      }

      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }
}
