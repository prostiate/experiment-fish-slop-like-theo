import * as THREE from 'three';
import { WORLD_CONFIG } from '../config';
import { Fish } from './Fish';
import { modelLoader } from '../core/ModelLoader';

export class Predator {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public maxHealth: number = 100;
  public health: number = 100;
  public isDead: boolean = false;

  private bodyMesh: THREE.Mesh | null = null;
  private tailGroup: THREE.Object3D | null = null;
  private jawMesh: THREE.Object3D | null = null;
  private healthBarMesh!: THREE.Mesh;
  private hitFlashTimer: number = 0;
  private attackTimer: number = 0;
  private swimCycle: number = 0;

  constructor(scene: THREE.Scene, startPos: THREE.Vector3, wave: number = 1) {
    this.position = startPos.clone();
    this.velocity = new THREE.Vector3();
    this.maxHealth = 80 + wave * 40;
    this.health = this.maxHealth;

    this.mesh = new THREE.Group();
    this.buildPredatorMesh();

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  private buildPredatorMesh(): void {
    const blenderPredator = modelLoader.cloneModel('predator');

    if (blenderPredator) {
      this.mesh.add(blenderPredator);
      this.bodyMesh = blenderPredator.getObjectByName('Predator_Torso') as THREE.Mesh || null;
      this.jawMesh = blenderPredator.getObjectByName('Predator_Jaw') || null;
      this.tailGroup = blenderPredator.getObjectByName('Predator_TailFin') || null;
    } else {
      // 1. Armored Monster Body Fallback
      const bodyGeo = new THREE.ConeGeometry(2.4, 7.5, 12);
      bodyGeo.rotateZ(-Math.PI / 2); // Point forward along +X
      bodyGeo.scale(1.0, 0.7, 0.55);

      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x2b0938, // Deep menacing alien purple
        roughness: 0.3,
        metalness: 0.6,
        emissive: 0x440022,
        emissiveIntensity: 0.4,
      });
      this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      this.mesh.add(this.bodyMesh);

    // 2. Glowing Menacing Eyes
    const eyeGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0044 }); // Glowing crimson red

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(1.8, 0.6, 0.7);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(1.8, 0.6, -0.7);
    this.mesh.add(rightEye);

    // 3. Spiky Dorsal Ridges
    for (let s = 0; s < 4; s++) {
      const spikeGeo = new THREE.ConeGeometry(0.35, 1.4 - s * 0.25, 5);
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.5 });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(0.8 - s * 1.1, 1.2 - s * 0.1, 0);
      spike.rotation.z = -0.4;
      this.mesh.add(spike);
    }

    // 4. Moving Articulated Lower Jaw with Sharp Teeth
    const jawGeo = new THREE.ConeGeometry(1.4, 3.2, 8);
    jawGeo.rotateZ(-Math.PI / 2);
    jawGeo.scale(1.0, 0.35, 0.45);
    this.jawMesh = new THREE.Mesh(jawGeo, bodyMat);
    this.jawMesh.position.set(1.2, -0.6, 0);
    this.mesh.add(this.jawMesh);

    // 5. Tail Group
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(-3.2, 0, 0);

    const tailFinGeo = new THREE.BufferGeometry();
    const tailVertices = new Float32Array([
      0, 0, 0,
      -2.5, 2.0, 0,
      -1.8, 0, 0,
      -2.5, -2.0, 0,
    ]);
    const tailIndices = [0, 1, 2, 0, 2, 3];
    tailFinGeo.setAttribute('position', new THREE.BufferAttribute(tailVertices, 3));
    tailFinGeo.setIndex(tailIndices);
    tailFinGeo.computeVertexNormals();

    const finMat = new THREE.MeshStandardMaterial({
      color: 0x440055,
      side: THREE.DoubleSide,
      metalness: 0.4,
    });
    const tailFin = new THREE.Mesh(tailFinGeo, finMat);
    this.tailGroup.add(tailFin);
    this.mesh.add(this.tailGroup);
    }

    // 6. Floating 3D Health Bar
    const barTrackGeo = new THREE.PlaneGeometry(5.0, 0.5);
    const barTrackMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
    const barTrack = new THREE.Mesh(barTrackGeo, barTrackMat);
    barTrack.position.set(0, 3.2, 0);

    const barFillGeo = new THREE.PlaneGeometry(5.0, 0.45);
    const barFillMat = new THREE.MeshBasicMaterial({ color: 0xff3366, side: THREE.DoubleSide });
    this.healthBarMesh = new THREE.Mesh(barFillGeo, barFillMat);
    this.healthBarMesh.position.set(0, 0, 0.02);
    barTrack.add(this.healthBarMesh);
    this.mesh.add(barTrack);
  }

  public takeDamage(amount: number): boolean {
    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = 0.15; // Flash white

    // Update health bar fill scale
    const healthRatio = this.health / this.maxHealth;
    this.healthBarMesh.scale.x = Math.max(0.01, healthRatio);
    this.healthBarMesh.position.x = -(1.0 - healthRatio) * 2.5;

    if (this.health <= 0) {
      this.isDead = true;
      return true; // Defeated!
    }
    return false;
  }

  /**
   * Update predator attack AI: hunt nearest fish, take bites, swim with menacing speed
   */
  public update(delta: number, elapsed: number, fishes: Fish[], camera: THREE.Camera): Fish | null {
    if (this.isDead) return null;

    let eatenFish: Fish | null = null;
    this.swimCycle += delta * 4.0;

    // Hit flash handling
    if (this.bodyMesh && this.bodyMesh.material && (this.bodyMesh.material as THREE.MeshStandardMaterial).emissive) {
      const mat = this.bodyMesh.material as THREE.MeshStandardMaterial;
      if (this.hitFlashTimer > 0) {
        this.hitFlashTimer -= delta;
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 1.0;
      } else {
        mat.emissive.setHex(0x440022);
        mat.emissiveIntensity = 0.4;
      }
    }

    // Jaw chomp animation
    if (this.jawMesh) this.jawMesh.rotation.z = Math.sin(this.swimCycle * 1.5) * 0.25 - 0.2;
    if (this.tailGroup) this.tailGroup.rotation.y = Math.sin(this.swimCycle) * 0.55;

    // Find nearest live fish to target
    let targetFish: Fish | null = null;
    let minDist = Infinity;

    for (const f of fishes) {
      if (f.isDead) continue;
      const d = this.position.distanceTo(f.position);
      if (d < minDist) {
        minDist = d;
        targetFish = f;
      }
    }

    const targetPos = targetFish ? targetFish.position : new THREE.Vector3(0, 0, 0);

    // Steering towards target
    const desiredVel = new THREE.Vector3().subVectors(targetPos, this.position).normalize().multiplyScalar(15.0);
    this.velocity.lerp(desiredVel, 0.04);
    this.position.addScaledVector(this.velocity, delta);

    // Keep within tank bounds
    this.position.x = THREE.MathUtils.clamp(this.position.x, -WORLD_CONFIG.TANK_WIDTH / 2 + 6, WORLD_CONFIG.TANK_WIDTH / 2 - 6);
    this.position.y = THREE.MathUtils.clamp(this.position.y, WORLD_CONFIG.TANK_FLOOR_Y + 5, WORLD_CONFIG.WATER_SURFACE_Y - 5);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -WORLD_CONFIG.TANK_DEPTH / 2 + 6, WORLD_CONFIG.TANK_DEPTH / 2 - 6);

    this.mesh.position.copy(this.position);

    // Orient towards movement
    if (this.velocity.lengthSq() > 0.1) {
      const lookTarget = this.position.clone().add(this.velocity);
      const targetQuat = new THREE.Quaternion();
      const lookMat = new THREE.Matrix4().lookAt(lookTarget, this.position, new THREE.Vector3(0, 1, 0));
      targetQuat.setFromRotationMatrix(lookMat);
      this.mesh.quaternion.slerp(targetQuat, 0.08);
    }

    // Make health bar face the active camera
    this.healthBarMesh.parent?.quaternion.copy(camera.quaternion);

    // Check if close enough to devour fish
    if (targetFish && minDist < 3.8) {
      this.attackTimer += delta;
      if (this.attackTimer > 0.4) {
        this.attackTimer = 0;
        targetFish.isDead = true;
        eatenFish = targetFish;
      }
    }

    return eatenFish;
  }

  public destroy(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
  }
}
