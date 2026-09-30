import * as THREE from 'three';
import { COIN_TYPES, CoinConfig, WORLD_CONFIG } from '../config';
import { modelLoader } from '../core/ModelLoader';

export class Coin {
  public mesh: THREE.Group;
  public typeName: string;
  public config: CoinConfig;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public isCollected: boolean = false;
  public isDespawned: boolean = false;

  private lifetime: number = 0;
  private tumbleSpeed: THREE.Vector3;
  private isRestingOnFloor: boolean = false;

  constructor(scene: THREE.Scene, startPos: THREE.Vector3, typeName: string) {
    this.typeName = typeName;
    this.config = COIN_TYPES[typeName] || COIN_TYPES.BRONZE;
    this.position = startPos.clone();
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      -this.config.sinkSpeed,
      (Math.random() - 0.5) * 1.5
    );

    this.tumbleSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 4.0,
      3.0 + Math.random() * 2.0,
      (Math.random() - 0.5) * 4.0
    );

    this.mesh = new THREE.Group();

    const blenderModel = modelLoader.cloneModel(this.config.isGem ? 'diamond' : 'coin');

    if (blenderModel) {
      blenderModel.scale.setScalar(this.config.scale);
      // Apply color tint
      blenderModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhysicalMaterial) {
            child.material = child.material.clone();
            child.material.color.setHex(this.config.color);
            if (this.config.emissive) {
              child.material.emissive?.setHex(this.config.emissive);
            }
          }
        }
      });
      this.mesh.add(blenderModel);
    } else if (this.config.isGem) {
      // Faceted Gem geometry fallback
      const gemGeo = new THREE.OctahedronGeometry(this.config.scale * 0.9, 0);
      const gemMat = new THREE.MeshPhysicalMaterial({
        color: this.config.color,
        emissive: this.config.emissive,
        emissiveIntensity: 0.5,
        roughness: 0.1,
        metalness: 0.2,
        transmission: 0.8,
        ior: 2.2,
        reflectivity: 0.9,
      });
      const gemMesh = new THREE.Mesh(gemGeo, gemMat);
      gemMesh.scale.set(1.0, 1.4, 1.0);
      this.mesh.add(gemMesh);

      // Gem core glow
      const light = new THREE.PointLight(this.config.color, 1.2, 5.0);
      this.mesh.add(light);
    } else {
      // 3D Metallic Coin fallback
      const coinGeo = new THREE.CylinderGeometry(
        this.config.scale * 0.8,
        this.config.scale * 0.8,
        0.18,
        18
      );
      coinGeo.rotateX(Math.PI / 2);

      const coinMat = new THREE.MeshStandardMaterial({
        color: this.config.color,
        metalness: 0.9,
        roughness: 0.25,
        emissive: this.config.emissive,
        emissiveIntensity: 0.2,
      });

      const coinMesh = new THREE.Mesh(coinGeo, coinMat);
      this.mesh.add(coinMesh);

      // Star emblem on coin center
      const starGeo = new THREE.OctahedronGeometry(this.config.scale * 0.35, 0);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.scale.set(1.0, 1.0, 0.2);
      this.mesh.add(starMesh);
    }

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  /**
   * Update coin physics, sinking, floor resting, and magnetic attraction
   */
  public update(delta: number, elapsed: number, subPos: THREE.Vector3, magnetRadius: number): void {
    if (this.isCollected || this.isDespawned) return;

    this.lifetime += delta;
    if (this.lifetime >= this.config.lifespan) {
      this.isDespawned = true;
      return;
    }

    // Blink when close to despawning (last 4 seconds)
    const remainingTime = this.config.lifespan - this.lifetime;
    if (remainingTime < 4.0) {
      this.mesh.visible = Math.floor(elapsed * 10) % 2 === 0;
    }

    // Check distance to submarine for magnetic attraction
    const distToSub = this.position.distanceTo(subPos);
    if (distToSub < magnetRadius) {
      // Strong magnetic suction towards the sub!
      const pullDir = new THREE.Vector3().subVectors(subPos, this.position).normalize();
      const pullForce = (1.0 - (distToSub / magnetRadius)) * 45.0 + 15.0;
      this.velocity.lerp(pullDir.multiplyScalar(pullForce), 0.15);
      this.isRestingOnFloor = false;
    } else if (!this.isRestingOnFloor) {
      // Normal sinking flutter
      this.velocity.y = -this.config.sinkSpeed;
      this.velocity.x = Math.sin(elapsed * 4.0 + this.lifetime) * 0.8;
      this.velocity.z = Math.cos(elapsed * 3.5 + this.lifetime) * 0.8;
    }

    // Apply movement
    this.position.addScaledVector(this.velocity, delta);

    // Floor collision
    if (this.position.y <= WORLD_CONFIG.TANK_FLOOR_Y + 0.6) {
      this.position.y = WORLD_CONFIG.TANK_FLOOR_Y + 0.6;
      this.isRestingOnFloor = true;
      this.velocity.set(0, 0, 0);
      // Gentle spin while lying on the sea floor
      this.mesh.rotation.y += 1.2 * delta;
    } else {
      // Tumble in 3D water while sinking
      this.mesh.rotation.x += this.tumbleSpeed.x * delta;
      this.mesh.rotation.y += this.tumbleSpeed.y * delta;
      this.mesh.rotation.z += this.tumbleSpeed.z * delta;
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
