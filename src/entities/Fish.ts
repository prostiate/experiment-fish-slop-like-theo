import * as THREE from 'three';
import { FishStage, FishType, GUPPY_STAGE_SETTINGS, WORLD_CONFIG } from '../config';
import { FoodPellet } from './FoodPellet';
import { modelLoader } from '../core/ModelLoader';

export class Fish {
  public mesh: THREE.Group;
  public type: FishType;
  public stage: FishStage;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public targetPos: THREE.Vector3;

  // AI & States
  public hunger: number = 20; // 0 (full) to 100 (starving)
  public isDead: boolean = false;
  public eatCount: number = 0;
  public coinTimer: number = 0;
  public breedTimer: number = 0;

  // Swimming animation components
  private bodyMesh: THREE.Mesh | null = null;
  private tailGroup: THREE.Object3D | null = null;
  private leftFin: THREE.Object3D | null = null;
  private rightFin: THREE.Object3D | null = null;
  private crownMesh: THREE.Mesh | null = null;
  private swimCycle: number = 0;

  // Boundary limits
  private minBound = new THREE.Vector3(-WORLD_CONFIG.TANK_WIDTH / 2 + 5, WORLD_CONFIG.TANK_FLOOR_Y + 4, -WORLD_CONFIG.TANK_DEPTH / 2 + 5);
  private maxBound = new THREE.Vector3(WORLD_CONFIG.TANK_WIDTH / 2 - 5, WORLD_CONFIG.WATER_SURFACE_Y - 4, WORLD_CONFIG.TANK_DEPTH / 2 - 5);

  constructor(scene: THREE.Scene, startPos: THREE.Vector3, type: FishType = FishType.GUPPY, stage: FishStage = FishStage.BABY) {
    this.type = type;
    this.stage = stage;
    this.position = startPos.clone();
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 5
    );
    this.targetPos = this.getRandomTankPoint();
    this.coinTimer = 3.0 + Math.random() * 5.0;
    this.breedTimer = 20.0 + Math.random() * 10.0;

    this.mesh = new THREE.Group();
    this.buildFishMesh();
    this.updateAppearance();

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  private buildFishMesh(): void {
    const modelName = this.type === FishType.CARNIVORE ? 'carnivore' : 'guppy';
    const blenderModel = modelLoader.cloneModel(modelName);

    if (blenderModel) {
      this.mesh.add(blenderModel);
      this.tailGroup = blenderModel.getObjectByName('Tail_Fin') || null;
      this.leftFin = blenderModel.getObjectByName('Pectoral_Fin_Left') || null;
      this.rightFin = blenderModel.getObjectByName('Pectoral_Fin_Right') || null;
      this.bodyMesh = (blenderModel.getObjectByName('Fish_Body') || blenderModel.getObjectByName('Carnivore_Body')) as THREE.Mesh || null;
    } else {
      // 1. Streamlined Fish Body Fallback
      const bodyGeo = new THREE.ConeGeometry(0.9, 3.2, 12);
    bodyGeo.rotateZ(-Math.PI / 2); // Point forward along +X
    bodyGeo.scale(1.0, 0.65, 0.45);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffa500,
      roughness: 0.35,
      metalness: 0.15,
      flatShading: false,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(this.bodyMesh);

    // 2. Eyes
    const eyeGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(0.9, 0.3, 0.32);
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), pupilMat);
    leftPupil.position.set(0.1, 0.05, 0.12);
    leftEye.add(leftPupil);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.9, 0.3, -0.32);
    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), pupilMat);
    rightPupil.position.set(0.1, 0.05, -0.12);
    rightEye.add(rightPupil);
    this.mesh.add(rightEye);

    // 3. Tail Group (articulated joint)
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(-1.4, 0, 0);

    // Caudal fin (tail fin)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(-1.2, 0.9);
    finShape.lineTo(-0.8, 0);
    finShape.lineTo(-1.2, -0.9);
    finShape.closePath();

    const finGeo = new THREE.ShapeGeometry(finShape);
    const finMat = new THREE.MeshStandardMaterial({
      color: 0xff7700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      roughness: 0.4,
    });
    const tailFin = new THREE.Mesh(finGeo, finMat);
    this.tailGroup.add(tailFin);
    this.mesh.add(this.tailGroup);

    // 4. Dorsal Fin (top)
    const dorsalShape = new THREE.Shape();
    dorsalShape.moveTo(0, 0);
    dorsalShape.lineTo(-0.8, 0.7);
    dorsalShape.lineTo(-1.2, 0);
    dorsalShape.closePath();
    const dorsalGeo = new THREE.ShapeGeometry(dorsalShape);
    const dorsalMesh = new THREE.Mesh(dorsalGeo, finMat);
    dorsalMesh.position.set(0.2, 0.6, 0);
    this.mesh.add(dorsalMesh);

    // 5. Pectoral Fins (side flapping)
    const pecShape = new THREE.Shape();
    pecShape.moveTo(0, 0);
    pecShape.lineTo(-0.6, -0.3);
    pecShape.lineTo(-0.4, 0.1);
    pecShape.closePath();
    const pecGeo = new THREE.ShapeGeometry(pecShape);

    this.leftFin = new THREE.Mesh(pecGeo, finMat);
    this.leftFin.position.set(0.3, -0.2, 0.4);
    this.leftFin.rotation.y = 0.4;
    this.mesh.add(this.leftFin);

    this.rightFin = new THREE.Mesh(pecGeo, finMat);
    this.rightFin.position.set(0.3, -0.2, -0.4);
    this.rightFin.rotation.y = -0.4;
    this.mesh.add(this.rightFin);

    // 6. King Guppy Golden Crown
    const crownGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.4, 5, 1, true);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xaa7700,
      emissiveIntensity: 0.4,
    });
    this.crownMesh = new THREE.Mesh(crownGeo, crownMat);
    this.crownMesh.position.set(0.4, 0.85, 0);
    this.crownMesh.visible = false;
    this.mesh.add(this.crownMesh);
    }
  }

  public updateAppearance(): void {
    if (this.type === FishType.GUPPY) {
      const cfg = GUPPY_STAGE_SETTINGS[this.stage];
      this.mesh.scale.setScalar(cfg.scale);

      if (this.bodyMesh && this.bodyMesh.material) {
        const mat = this.bodyMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(cfg.color);
      }

      if (this.stage === FishStage.KING && this.crownMesh) {
        this.crownMesh.visible = true;
      }
    } else if (this.type === FishType.CARNIVORE) {
      this.mesh.scale.setScalar(1.6);
      if (this.bodyMesh && this.bodyMesh.material) {
        const mat = this.bodyMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x1a365d);
        mat.emissive.setHex(0x004488);
        mat.emissiveIntensity = 0.3;
      }
    } else if (this.type === FishType.BREEDER) {
      this.mesh.scale.setScalar(1.5);
      if (this.bodyMesh && this.bodyMesh.material) {
        const mat = this.bodyMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0xff66cc);
      }
    }
  }

  public getRandomTankPoint(): THREE.Vector3 {
    return new THREE.Vector3(
      THREE.MathUtils.lerp(this.minBound.x, this.maxBound.x, Math.random()),
      THREE.MathUtils.lerp(this.minBound.y, this.maxBound.y, Math.random()),
      THREE.MathUtils.lerp(this.minBound.z, this.maxBound.z, Math.random())
    );
  }

  /**
   * Main Fish AI Update: Steering, swimming oscillation, hunger, and eating
   */
  public update(delta: number, elapsed: number, foodPellets: FoodPellet[], babyGuppies: Fish[]): { droppedCoinType: string | null; spawnedBaby: boolean } {
    let droppedCoinType: string | null = null;
    let spawnedBaby = false;

    if (this.isDead) {
      // Belly-up float towards water surface
      this.mesh.rotation.z += 1.5 * delta;
      this.position.y += 3.0 * delta;
      this.mesh.position.copy(this.position);
      return { droppedCoinType, spawnedBaby };
    }

    // 1. Hunger Progression
    this.hunger += delta * 2.8; // Increases hunger over time

    // Hunger visuals: shift color sickly green if starving
    if (this.bodyMesh && this.bodyMesh.material) {
      const mat = this.bodyMesh.material as THREE.MeshStandardMaterial;
      if (this.hunger > 65) {
        const starveRatio = (this.hunger - 65) / 35;
        mat.color.lerp(new THREE.Color(0x55aa44), starveRatio * 0.1);
      } else {
        this.updateAppearance();
      }
    }

    if (this.hunger >= 100) {
      this.isDead = true;
      return { droppedCoinType, spawnedBaby };
    }

    // 2. Coin Production when fed & healthy
    if (this.hunger < 70) {
      this.coinTimer -= delta;
      if (this.coinTimer <= 0) {
        if (this.type === FishType.GUPPY) {
          droppedCoinType = GUPPY_STAGE_SETTINGS[this.stage].coinType;
          this.coinTimer = GUPPY_STAGE_SETTINGS[this.stage].coinDropInterval + (Math.random() - 0.5) * 3;
        } else if (this.type === FishType.CARNIVORE) {
          droppedCoinType = 'DIAMOND';
          this.coinTimer = 14.0 + (Math.random() - 0.5) * 4;
        }
      }
    }

    // 3. Breeder reproduction
    if (this.type === FishType.BREEDER) {
      this.breedTimer -= delta;
      if (this.breedTimer <= 0) {
        spawnedBaby = true;
        this.breedTimer = 22.0 + Math.random() * 8;
      }
    }

    // 4. Food Seeking AI (Target closest food if hungry)
    let isHuntingFood = false;

    if (this.type === FishType.GUPPY && this.hunger > 40 && foodPellets.length > 0) {
      // Find nearest active food pellet
      let nearestPellet: FoodPellet | null = null;
      let minDist = Infinity;

      for (const p of foodPellets) {
        if (p.isConsumed || p.isDespawned) continue;
        const d = this.position.distanceTo(p.position);
        if (d < minDist) {
          minDist = d;
          nearestPellet = p;
        }
      }

      if (nearestPellet) {
        this.targetPos.copy(nearestPellet.position);
        isHuntingFood = true;

        // Check if close enough to consume
        if (minDist < 2.0) {
          nearestPellet.isConsumed = true;
          this.hunger = Math.max(0, this.hunger - nearestPellet.tier.nutrition);
          this.eatCount++;

          // Check Growth Evolution for Guppies
          if (this.stage === FishStage.BABY && this.eatCount >= GUPPY_STAGE_SETTINGS[FishStage.BABY].eatsToGrow) {
            this.stage = FishStage.MEDIUM;
            this.eatCount = 0;
            this.updateAppearance();
          } else if (this.stage === FishStage.MEDIUM && this.eatCount >= GUPPY_STAGE_SETTINGS[FishStage.MEDIUM].eatsToGrow) {
            this.stage = FishStage.KING;
            this.eatCount = 0;
            this.updateAppearance();
          }
        }
      }
    } else if (this.type === FishType.CARNIVORE && this.hunger > 45 && babyGuppies.length > 0) {
      // Carnivores hunt baby guppies!
      let nearestBaby: Fish | null = null;
      let minDist = Infinity;

      for (const baby of babyGuppies) {
        if (baby.isDead) continue;
        const d = this.position.distanceTo(baby.position);
        if (d < minDist) {
          minDist = d;
          nearestBaby = baby;
        }
      }

      if (nearestBaby) {
        this.targetPos.copy(nearestBaby.position);
        isHuntingFood = true;

        if (minDist < 2.5) {
          nearestBaby.isDead = true;
          this.hunger = 0; // Completely fed
          droppedCoinType = 'DIAMOND';
        }
      }
    }

    // 5. Wander Steering if not hunting
    if (!isHuntingFood) {
      if (this.position.distanceTo(this.targetPos) < 4.0 || Math.random() < 0.008) {
        this.targetPos = this.getRandomTankPoint();
      }
    }

    // 6. Physics & Movement
    const desiredVel = new THREE.Vector3().subVectors(this.targetPos, this.position).normalize();
    const maxSpeed = this.type === FishType.GUPPY
      ? GUPPY_STAGE_SETTINGS[this.stage].swimSpeed * (isHuntingFood ? 1.4 : 1.0)
      : 12.0;

    desiredVel.multiplyScalar(maxSpeed);
    this.velocity.lerp(desiredVel, 0.05);

    // Keep fish firmly inside tank bounds
    if (this.position.x < this.minBound.x) this.velocity.x += 12 * delta;
    if (this.position.x > this.maxBound.x) this.velocity.x -= 12 * delta;
    if (this.position.y < this.minBound.y) this.velocity.y += 12 * delta;
    if (this.position.y > this.maxBound.y) this.velocity.y -= 12 * delta;
    if (this.position.z < this.minBound.z) this.velocity.z += 12 * delta;
    if (this.position.z > this.maxBound.z) this.velocity.z -= 12 * delta;

    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);

    // 7. Orient fish smoothly towards travel direction
    if (this.velocity.lengthSq() > 0.1) {
      const lookTarget = this.position.clone().add(this.velocity);
      const targetQuat = new THREE.Quaternion();
      const lookMat = new THREE.Matrix4().lookAt(lookTarget, this.position, new THREE.Vector3(0, 1, 0));
      targetQuat.setFromRotationMatrix(lookMat);
      this.mesh.quaternion.slerp(targetQuat, 0.12);
    }

    // 8. Sinusoidal Swimming Animation (Tail wag & Fin flutter)
    const swimSpeed = this.velocity.length();
    this.swimCycle += delta * (swimSpeed * 0.8 + 2.5);

    // Tail oscillation
    if (this.tailGroup) {
      this.tailGroup.rotation.y = Math.sin(this.swimCycle) * 0.45;
    } else {
      // Wiggle whole fish gently if no separate tail mesh
      this.mesh.rotation.y += Math.sin(this.swimCycle) * 0.05;
    }

    // Pectoral fin flapping
    if (this.leftFin) this.leftFin.rotation.y = 0.4 + Math.sin(this.swimCycle * 1.5) * 0.3;
    if (this.rightFin) this.rightFin.rotation.y = -0.4 - Math.sin(this.swimCycle * 1.5) * 0.3;

    return { droppedCoinType, spawnedBaby };
  }

  public destroy(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
