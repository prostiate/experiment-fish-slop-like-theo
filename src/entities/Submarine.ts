import * as THREE from 'three';
import { SUB_CONFIG, WORLD_CONFIG } from '../config';
import { modelLoader } from '../core/ModelLoader';

export class Submarine {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public angularVelocity: THREE.Euler;
  public orientation: THREE.Quaternion;

  // Visual components
  private leftPropeller: THREE.Object3D | null = null;
  private rightPropeller: THREE.Object3D | null = null;
  private spotLightLeft!: THREE.SpotLight;
  private spotLightRight!: THREE.SpotLight;
  private lightConeLeft!: THREE.Mesh;
  private lightConeRight!: THREE.Mesh;
  private bubbleTrail!: THREE.Points;
  private bubbleTrailPositions!: Float32Array;

  // States
  public boostEnergy: number = 100.0;
  public isBoosting: boolean = false;
  public areLightsOn: boolean = true;
  public isFirstPerson: boolean = false;
  public speedRatio: number = 0; // 0 to 1

  // Cockpit camera anchor
  public cockpitAnchor: THREE.Object3D;
  // Chase camera anchor
  public chaseCamAnchor: THREE.Object3D;

  private minBound = new THREE.Vector3(-WORLD_CONFIG.TANK_WIDTH / 2 + 4, WORLD_CONFIG.TANK_FLOOR_Y + 3, -WORLD_CONFIG.TANK_DEPTH / 2 + 4);
  private maxBound = new THREE.Vector3(WORLD_CONFIG.TANK_WIDTH / 2 - 4, WORLD_CONFIG.WATER_SURFACE_Y - 2, WORLD_CONFIG.TANK_DEPTH / 2 - 4);

  constructor(scene: THREE.Scene, startPos: THREE.Vector3 = new THREE.Vector3(0, 0, 15)) {
    this.position = startPos.clone();
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Euler(0, 0, 0);
    this.orientation = new THREE.Quaternion();

    this.mesh = new THREE.Group();

    this.cockpitAnchor = new THREE.Object3D();
    this.cockpitAnchor.position.set(0, 0.9, 1.2);
    this.mesh.add(this.cockpitAnchor);

    this.chaseCamAnchor = new THREE.Object3D();
    this.chaseCamAnchor.position.set(0, SUB_CONFIG.CHASE_CAM_OFFSET.y, SUB_CONFIG.CHASE_CAM_OFFSET.z);
    this.mesh.add(this.chaseCamAnchor);

    this.buildSubmarineMesh();

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  private buildSubmarineMesh(): void {
    const blenderSub = modelLoader.cloneModel('submarine');
    if (blenderSub) {
      // Use Blender-modeled 3D Submarine!
      this.mesh.add(blenderSub);

      // Locate propellers from Blender hierarchy
      this.leftPropeller = blenderSub.getObjectByName('Propeller_Left') || null;
      this.rightPropeller = blenderSub.getObjectByName('Propeller_Right') || null;
    } else {
      // Fallback procedural hull
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0xffbb00,
        roughness: 0.35,
        metalness: 0.25,
      });

      const hullGeo = new THREE.CylinderGeometry(1.6, 1.8, 6.8, 16);
      hullGeo.rotateX(Math.PI / 2);
      const hullMesh = new THREE.Mesh(hullGeo, hullMat);
      this.mesh.add(hullMesh);

      const noseGeo = new THREE.SphereGeometry(1.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      noseGeo.rotateX(-Math.PI / 2);
      const noseMesh = new THREE.Mesh(noseGeo, hullMat);
      noseMesh.position.set(0, 0, -3.4);
      this.mesh.add(noseMesh);

      const rearGeo = new THREE.ConeGeometry(1.8, 2.8, 16);
      rearGeo.rotateX(Math.PI / 2);
      const rearMesh = new THREE.Mesh(rearGeo, hullMat);
      rearMesh.position.set(0, 0, 4.8);
      this.mesh.add(rearMesh);

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x99ddff,
        transmission: 0.92,
        opacity: 0.65,
        transparent: true,
        roughness: 0.05,
        metalness: 0.1,
        ior: 1.45,
      });
      const interiorGlow = new THREE.PointLight(0x00f2fe, 0.8, 4.0);
      interiorGlow.position.set(0, 0.8, -1.2);
      this.mesh.add(interiorGlow);

      const towerGeo = new THREE.BoxGeometry(0.8, 1.2, 2.0);
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.6 });
      const tower = new THREE.Mesh(towerGeo, darkMat);
      tower.position.set(0, 1.8, 0.8);
      this.mesh.add(tower);

      const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
      const propMat = new THREE.MeshStandardMaterial({ color: 0xcc8800, metalness: 0.9, roughness: 0.2 });

      [-1.8, 1.8].forEach((xPos, idx) => {
        const podGeo = new THREE.CylinderGeometry(0.55, 0.55, 2.2, 12);
        podGeo.rotateX(Math.PI / 2);
        const pod = new THREE.Mesh(podGeo, thrusterMat);
        pod.position.set(xPos, -0.4, 2.2);
        this.mesh.add(pod);

        const strutGeo = new THREE.BoxGeometry(Math.abs(xPos) * 0.7, 0.2, 0.6);
        const strut = new THREE.Mesh(strutGeo, darkMat);
        strut.position.set(xPos * 0.5, -0.2, 2.2);
        this.mesh.add(strut);

        const propGroup = new THREE.Mesh();
        const blade1Geo = new THREE.BoxGeometry(1.2, 0.18, 0.04);
        const blade1 = new THREE.Mesh(blade1Geo, propMat);
        const blade2 = blade1.clone();
        blade2.rotation.z = Math.PI / 2;
        propGroup.add(blade1);
        propGroup.add(blade2);
        propGroup.position.set(xPos, -0.4, 3.4);
        this.mesh.add(propGroup);

        if (idx === 0) this.leftPropeller = propGroup;
        else this.rightPropeller = propGroup;
      });
    }

    // 5. Dual High-Beam Headlights
    this.spotLightLeft = new THREE.SpotLight(0xaae5ff, 4.0, 50, Math.PI / 6, 0.4, 1.0);
    this.spotLightLeft.position.set(-1.1, 0.2, -3.2);
    this.spotLightLeft.target.position.set(-1.1, 0, -25);
    this.mesh.add(this.spotLightLeft);
    this.mesh.add(this.spotLightLeft.target);

    this.spotLightRight = new THREE.SpotLight(0xaae5ff, 4.0, 50, Math.PI / 6, 0.4, 1.0);
    this.spotLightRight.position.set(1.1, 0.2, -3.2);
    this.spotLightRight.target.position.set(1.1, 0, -25);
    this.mesh.add(this.spotLightRight);
    this.mesh.add(this.spotLightRight.target);

    // Volumetric Light Cones
    const coneGeo = new THREE.ConeGeometry(3.5, 20, 16, 1, true);
    coneGeo.rotateX(-Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x99ddff,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.lightConeLeft = new THREE.Mesh(coneGeo, coneMat);
    this.lightConeLeft.position.set(-1.1, 0.2, -13.2);
    this.mesh.add(this.lightConeLeft);

    this.lightConeRight = new THREE.Mesh(coneGeo, coneMat);
    this.lightConeRight.position.set(1.1, 0.2, -13.2);
    this.mesh.add(this.lightConeRight);

    // 6. Torpedo Launch Tubes (Sides)
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.6 });
    [-1.6, 1.6].forEach(x => {
      const tubeGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.5, 10);
      tubeGeo.rotateX(Math.PI / 2);
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.position.set(x, 0.4, -0.6);
      this.mesh.add(tube);
    });

    // 7. Bubble Exhaust Particle Trail
    const bubbleCount = 60;
    const bGeo = new THREE.BufferGeometry();
    this.bubbleTrailPositions = new Float32Array(bubbleCount * 3);
    for (let i = 0; i < bubbleCount; i++) {
      this.bubbleTrailPositions[i * 3 + 0] = (Math.random() - 0.5) * 2;
      this.bubbleTrailPositions[i * 3 + 1] = -0.4 + (Math.random() - 0.5) * 0.5;
      this.bubbleTrailPositions[i * 3 + 2] = 3.5 + Math.random() * 8.0;
    }
    bGeo.setAttribute('position', new THREE.BufferAttribute(this.bubbleTrailPositions, 3));
    const bMat = new THREE.PointsMaterial({
      color: 0xaaeeff,
      size: 0.75,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.bubbleTrail = new THREE.Points(bGeo, bMat);
    this.mesh.add(this.bubbleTrail);
  }

  public toggleLights(): boolean {
    this.areLightsOn = !this.areLightsOn;
    this.spotLightLeft.visible = this.areLightsOn;
    this.spotLightRight.visible = this.areLightsOn;
    this.lightConeLeft.visible = this.areLightsOn;
    this.lightConeRight.visible = this.areLightsOn;
    return this.areLightsOn;
  }

  public toggleCameraView(): boolean {
    this.isFirstPerson = !this.isFirstPerson;
    return this.isFirstPerson;
  }

  /**
   * 6-DOF Submarine Physics update:
   * Translates player inputs into realistic underwater hydrodynamic thrust & drag
   */
  public updatePhysics(
    delta: number,
    thrustInput: number,
    yawInput: number,
    ascentInput: number,
    boostRequested: boolean,
    mouseDelta: { x: number; y: number },
    speedMultiplier: number
  ): void {
    // 1. Boost Management
    if (boostRequested && this.boostEnergy > 0 && Math.abs(thrustInput) > 0.1) {
      this.isBoosting = true;
      this.boostEnergy = Math.max(0, this.boostEnergy - SUB_CONFIG.BOOST_DRAIN_RATE * delta);
    } else {
      this.isBoosting = false;
      this.boostEnergy = Math.min(100, this.boostEnergy + SUB_CONFIG.BOOST_RECHARGE_RATE * delta);
    }

    const currentSpeedMult = speedMultiplier * (this.isBoosting ? SUB_CONFIG.BOOST_MULTIPLIER : 1.0);

    // 2. Angular Steering (Pitch & Yaw via mouse or keys)
    const mouseSensitivity = 0.0022;
    const yawAngle = (-yawInput * SUB_CONFIG.TURN_SPEED_YAW * delta) + (-mouseDelta.x * mouseSensitivity);
    const pitchAngle = (-mouseDelta.y * mouseSensitivity);

    // Apply rotation around submarine local axes
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle);
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchAngle);

    // Organic Roll/Banking when turning
    const targetRoll = -yawInput * 0.35 + (-mouseDelta.x * 0.005);
    const currentRoll = THREE.MathUtils.lerp(0, targetRoll, 0.4);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), currentRoll);

    this.mesh.quaternion.multiply(yawQuat).multiply(pitchQuat).multiply(rollQuat);

    // 3. Linear Thrust along submarine forward/up axes
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    const upVector = new THREE.Vector3(0, 1, 0);

    const accel = new THREE.Vector3();
    if (thrustInput > 0) {
      accel.addScaledVector(forwardVector, thrustInput * SUB_CONFIG.BASE_SPEED * currentSpeedMult);
    } else if (thrustInput < 0) {
      accel.addScaledVector(forwardVector, thrustInput * SUB_CONFIG.REVERSE_SPEED * currentSpeedMult);
    }

    // Vertical ballast ascent / descent
    if (ascentInput !== 0) {
      accel.addScaledVector(upVector, ascentInput * SUB_CONFIG.ASCENT_SPEED);
    }

    // Apply acceleration to velocity with fluid damping
    this.velocity.addScaledVector(accel, delta);
    this.velocity.multiplyScalar(SUB_CONFIG.DAMPING);

    this.position.addScaledVector(this.velocity, delta);

    // 4. Tank Boundary Clamping & Soft Collision Bounces
    if (this.position.x < this.minBound.x) { this.position.x = this.minBound.x; this.velocity.x *= -0.3; }
    if (this.position.x > this.maxBound.x) { this.position.x = this.maxBound.x; this.velocity.x *= -0.3; }
    if (this.position.y < this.minBound.y) { this.position.y = this.minBound.y; this.velocity.y *= -0.3; }
    if (this.position.y > this.maxBound.y) { this.position.y = this.maxBound.y; this.velocity.y *= -0.3; }
    if (this.position.z < this.minBound.z) { this.position.z = this.minBound.z; this.velocity.z *= -0.3; }
    if (this.position.z > this.maxBound.z) { this.position.z = this.maxBound.z; this.velocity.z *= -0.3; }

    this.mesh.position.copy(this.position);

    // 5. Visual animations: spinning propellers & bubble exhaust
    const currentSpeed = this.velocity.length();
    this.speedRatio = THREE.MathUtils.clamp(currentSpeed / (SUB_CONFIG.BASE_SPEED * currentSpeedMult), 0, 1);
    const propSpinRate = (currentSpeed + 2.0) * 35.0 * delta * (thrustInput < 0 ? -1 : 1);
    if (this.leftPropeller) this.leftPropeller.rotation.z += propSpinRate;
    if (this.rightPropeller) this.rightPropeller.rotation.z -= propSpinRate;

    // Stream bubbles backwards when moving
    const bPos = this.bubbleTrailPositions;
    for (let i = 0; i < bPos.length / 3; i++) {
      bPos[i * 3 + 2] += (currentSpeed * 0.8 + 4.0) * delta;
      if (bPos[i * 3 + 2] > 18.0) {
        bPos[i * 3 + 0] = (Math.random() - 0.5) * 2.2;
        bPos[i * 3 + 1] = -0.4 + (Math.random() - 0.5) * 0.6;
        bPos[i * 3 + 2] = 3.2;
      }
    }
    this.bubbleTrail.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Get bottom hatch world position for food pellet drops
   */
  public getFoodHatchPosition(): THREE.Vector3 {
    const hatchLocal = new THREE.Vector3(0, -1.6, 0);
    return hatchLocal.applyMatrix4(this.mesh.matrixWorld);
  }

  /**
   * Get torpedo launcher world position & firing direction
   */
  public getTorpedoLaunchData(isLeftTube: boolean): { position: THREE.Vector3; direction: THREE.Vector3 } {
    const tubeLocal = new THREE.Vector3(isLeftTube ? -1.6 : 1.6, 0.4, -2.2);
    const worldPos = tubeLocal.applyMatrix4(this.mesh.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    return { position: worldPos, direction };
  }
}
