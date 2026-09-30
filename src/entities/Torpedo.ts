import * as THREE from 'three';
import { WORLD_CONFIG } from '../config';

export class Torpedo {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public isExpired: boolean = false;
  public damage: number;

  private lifetime: number = 0;
  private maxLifetime: number = 4.5;
  private bubbleParticles: THREE.Points;

  constructor(scene: THREE.Scene, startPos: THREE.Vector3, direction: THREE.Vector3, damage: number = 30) {
    this.position = startPos.clone();
    this.damage = damage;
    this.velocity = direction.clone().normalize().multiplyScalar(42.0); // Fast underwater rocket

    this.mesh = new THREE.Group();

    // Sleek Torpedo Fuselage
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 2.2, 12);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      metalness: 0.85,
      roughness: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(bodyMesh);

    // Glowing Plasma Warhead
    const noseGeo = new THREE.ConeGeometry(0.3, 0.6, 12);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00f2fe,
      emissiveIntensity: 0.8,
    });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.position.set(0, 0, -1.3);
    this.mesh.add(noseMesh);

    // Steering Fins
    const finGeo = new THREE.BoxGeometry(0.08, 1.2, 0.4);
    const finMat = new THREE.MeshStandardMaterial({ color: 0xff3366, metalness: 0.5 });
    const fin1 = new THREE.Mesh(finGeo, finMat);
    fin1.position.set(0, 0, 0.8);
    this.mesh.add(fin1);

    const fin2 = fin1.clone();
    fin2.rotation.z = Math.PI / 2;
    this.mesh.add(fin2);

    // Exhaust cavitation trail
    const bubbleGeo = new THREE.BufferGeometry();
    const bPos = new Float32Array(15 * 3);
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
    const bMat = new THREE.PointsMaterial({
      color: 0x99eeff,
      size: 0.6,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    this.bubbleParticles = new THREE.Points(bubbleGeo, bMat);
    this.bubbleParticles.position.set(0, 0, 1.2);
    this.mesh.add(this.bubbleParticles);

    // Align rotation with velocity
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction.clone().normalize());

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  public update(delta: number): void {
    if (this.isExpired) return;

    this.lifetime += delta;
    if (this.lifetime >= this.maxLifetime) {
      this.isExpired = true;
      return;
    }

    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);

    // Check tank boundary collision
    if (
      Math.abs(this.position.x) > WORLD_CONFIG.TANK_WIDTH / 2 ||
      this.position.y < WORLD_CONFIG.TANK_FLOOR_Y ||
      this.position.y > WORLD_CONFIG.WATER_SURFACE_Y ||
      Math.abs(this.position.z) > WORLD_CONFIG.TANK_DEPTH / 2
    ) {
      this.isExpired = true;
    }
  }

  public destroy(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        child.geometry.dispose();
      }
    });
  }
}
