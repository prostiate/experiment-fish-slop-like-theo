import * as THREE from 'three';
import { FoodTier, WORLD_CONFIG } from '../config';

export class FoodPellet {
  public mesh: THREE.Group;
  public tier: FoodTier;
  public isConsumed: boolean = false;
  public isDespawned: boolean = false;
  public position: THREE.Vector3;

  private velocityY: number;
  private wobbleOffset: number;
  private lifetime: number = 0;
  private maxLifetime: number = 24.0; // Dissolves after 24s if uneaten

  constructor(scene: THREE.Scene, startPos: THREE.Vector3, tier: FoodTier) {
    this.tier = tier;
    this.position = startPos.clone();
    this.velocityY = -tier.sinkSpeed;
    this.wobbleOffset = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();

    // 3D Pellet geometry: capsule/sphere with food texture color
    const pelletGeo = new THREE.DodecahedronGeometry(tier.size, 1);
    const pelletMat = new THREE.MeshStandardMaterial({
      color: tier.color,
      roughness: 0.5,
      emissive: tier.glowColor,
      emissiveIntensity: 0.35,
    });
    const coreMesh = new THREE.Mesh(pelletGeo, pelletMat);
    this.mesh.add(coreMesh);

    // Glowing halo for higher tier foods
    if (tier.nutrition > 50) {
      const haloGeo = new THREE.SphereGeometry(tier.size * 1.5, 8, 8);
      const haloMat = new THREE.MeshBasicMaterial({
        color: tier.glowColor,
        transparent: true,
        opacity: 0.25,
        wireframe: true,
      });
      this.mesh.add(new THREE.Mesh(haloGeo, haloMat));
    }

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  public update(delta: number, elapsed: number): void {
    if (this.isConsumed || this.isDespawned) return;

    this.lifetime += delta;
    if (this.lifetime >= this.maxLifetime) {
      this.isDespawned = true;
      return;
    }

    // Sinking physics with gentle water resistance
    this.position.y += this.velocityY * delta;

    // Gentle horizontal wobble while sinking
    this.position.x += Math.sin(elapsed * 3.0 + this.wobbleOffset) * 0.4 * delta;
    this.position.z += Math.cos(elapsed * 2.5 + this.wobbleOffset) * 0.4 * delta;

    // Tumble rotation
    this.mesh.rotation.x += 1.5 * delta;
    this.mesh.rotation.y += 2.0 * delta;

    // Stop at tank floor and dissolve
    if (this.position.y <= WORLD_CONFIG.TANK_FLOOR_Y + 0.4) {
      this.position.y = WORLD_CONFIG.TANK_FLOOR_Y + 0.4;
      this.velocityY = 0;
      // Shrink and dissolve on seabed
      const remainingLifeRatio = Math.max(0, 1.0 - (this.lifetime / this.maxLifetime));
      this.mesh.scale.setScalar(remainingLifeRatio);
    }

    this.mesh.position.copy(this.position);
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
