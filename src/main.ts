import * as THREE from 'three';
import { FOOD_TIERS, FishStage, FishType, SUB_CONFIG, WORLD_CONFIG } from './config';
import { gameState } from './core/GameState';
import { inputManager } from './core/InputManager';
import { soundManager } from './audio/SoundManager';
import { AquariumTank } from './environment/AquariumTank';
import { Submarine } from './entities/Submarine';
import { Fish } from './entities/Fish';
import { FoodPellet } from './entities/FoodPellet';
import { Coin } from './entities/Coin';
import { Torpedo } from './entities/Torpedo';
import { Predator } from './entities/Predator';
import { HUD } from './ui/HUD';
import { ShopUI } from './ui/ShopUI';
import { modelLoader } from './core/ModelLoader';

class FishslopGame {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Environment & Entities
  private tank!: AquariumTank;
  private submarine!: Submarine;
  private fishes: Fish[] = [];
  private foodPellets: FoodPellet[] = [];
  private coins: Coin[] = [];
  private torpedoes: Torpedo[] = [];
  private predator: Predator | null = null;
  private explosionParticles: { points: THREE.Points; velocities: Float32Array; life: number }[] = [];

  // UI
  private hud!: HUD;
  private shopUI!: ShopUI;

  // State
  private isNextTorpedoLeft: boolean = true;
  private torpedoCooldown: number = 0;
  private foodDropCooldown: number = 0;
  private currentCamPos = new THREE.Vector3();
  private currentCamLookAt = new THREE.Vector3();

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    // 1. Initialize Three.js Scene, Camera, Renderer
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 400);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 2. Initialize Core Subsystems
    inputManager.init(this.renderer.domElement);
    this.hud = new HUD();
    this.shopUI = new ShopUI(gameState, () => this.onStartGame());

    // 3. Handle Window Resize
    window.addEventListener('resize', () => this.onWindowResize());

    // 4. Preload Blender Models & Start Game
    this.start();
  }

  private async start(): Promise<void> {
    await modelLoader.preloadAll();
    this.initWorld();
    this.setupEventListeners();
    this.animate();
  }

  private initWorld(): void {
    // Aquarium environment
    this.tank = new AquariumTank(this.scene);

    // Submarine player
    this.submarine = new Submarine(this.scene, new THREE.Vector3(0, 0, 10));
    this.currentCamPos.copy(this.submarine.position).add(new THREE.Vector3(0, 8, 20));
    this.currentCamLookAt.copy(this.submarine.position);

    // Spawn initial starter fish (2 baby guppies)
    for (let i = 0; i < 2; i++) {
      this.spawnFish(FishType.GUPPY, FishStage.BABY);
    }
  }

  private setupEventListeners(): void {
    // HUD Toggle Buttons
    this.hud.btnHeadlights.addEventListener('click', () => {
      const lightsOn = this.submarine.toggleLights();
      this.hud.btnHeadlights.classList.toggle('active', lightsOn);
    });

    this.hud.btnCamMode.addEventListener('click', () => {
      const is1st = this.submarine.toggleCameraView();
      this.hud.btnCamMode.textContent = is1st ? '🎥 Cam: 1st [C]' : '🎥 Cam: 3rd [C]';
    });

    this.hud.btnSonar.addEventListener('click', () => {
      this.triggerSonarPing();
    });

    // Top Bar Quick Shop Buttons
    document.getElementById('btn-buy-guppy')?.addEventListener('click', () => {
      if (gameState.buyGuppy()) {
        this.spawnFish(FishType.GUPPY, FishStage.BABY);
        soundManager.playBubble();
        this.hud.showToast('Baby Guppy Purchased! Keep it fed!', 'info');
      }
    });

    document.getElementById('btn-upgrade-food')?.addEventListener('click', () => {
      if (gameState.upgradeFood()) {
        soundManager.playCoinPickup('GOLD');
        const tier = FOOD_TIERS[gameState.foodTierIndex];
        this.hud.showToast(`Food Upgraded: ${tier.name}!`, 'reward');
      }
    });

    document.getElementById('btn-upgrade-capacity')?.addEventListener('click', () => {
      if (gameState.upgradeFoodCapacity()) {
        soundManager.playCoinPickup('GOLD');
        this.hud.showToast(`Food Capacity: ${gameState.maxFoodCapacity} pellets!`, 'reward');
      }
    });

    document.getElementById('btn-buy-carnivore')?.addEventListener('click', () => {
      if (gameState.buyCarnivore()) {
        this.spawnFish(FishType.CARNIVORE, FishStage.BABY);
        soundManager.playBubble();
        this.hud.showToast('Carnivore Deployed! Feed it baby guppies for Diamonds!', 'reward');
      }
    });

    document.getElementById('btn-buy-breeder')?.addEventListener('click', () => {
      if (gameState.buyBreeder()) {
        this.spawnFish(FishType.BREEDER, FishStage.BABY);
        soundManager.playBubble();
        this.hud.showToast('Breeder Guppy Added! Spawns baby fish automatically!', 'reward');
      }
    });

    document.getElementById('btn-buy-egg')?.addEventListener('click', () => {
      if (gameState.buyEggPiece()) {
        soundManager.playVictory();
        this.hud.showToast(`Golden Egg Piece ${gameState.eggPieces}/3 Acquired!`, 'reward');
        if (gameState.eggPieces >= 3) {
          this.triggerVictory();
        }
      }
    });

    // GameState event listeners
    gameState.addListener((event) => {
      if (event === 'gameWon') {
        this.triggerVictory();
      }
    });
  }

  private onStartGame(): void {
    soundManager.playBubble();
    this.hud.showToast('Welcome aboard! Pilot the submarine and feed your fish.', 'info');
  }

  private spawnFish(type: FishType, stage: FishStage): Fish {
    const startX = (Math.random() - 0.5) * 40;
    const startY = (Math.random() - 0.5) * 15;
    const startZ = (Math.random() - 0.5) * 30;
    const fish = new Fish(this.scene, new THREE.Vector3(startX, startY, startZ), type, stage);
    this.fishes.push(fish);
    return fish;
  }

  private dropFoodPellet(): void {
    if (gameState.activeFoodCount >= gameState.maxFoodCapacity) {
      this.hud.showToast('Food bay at max capacity! Wait for fish to eat.', 'info');
      return;
    }

    const currentTier = FOOD_TIERS[gameState.foodTierIndex];
    const hatchPos = this.submarine.getFoodHatchPosition();

    const pellet = new FoodPellet(this.scene, hatchPos, currentTier);
    this.foodPellets.push(pellet);
    gameState.activeFoodCount++;

    soundManager.playPelletDrop();
  }

  private fireTorpedo(): void {
    if (this.torpedoCooldown > 0) return;

    const launchData = this.submarine.getTorpedoLaunchData(this.isNextTorpedoLeft);
    this.isNextTorpedoLeft = !this.isNextTorpedoLeft;
    this.torpedoCooldown = 0.35; // Fire rate

    const torpedo = new Torpedo(this.scene, launchData.position, launchData.direction, gameState.getTorpedoDamage());
    this.torpedoes.push(torpedo);

    soundManager.playTorpedoLaunch();
  }

  private triggerSonarPing(): void {
    soundManager.playSonarPing();
    this.hud.showToast('Acoustic Sonar Ping Dispatched!', 'info');

    // Visual Sonar Shockwave expanding from submarine
    const ringGeo = new THREE.RingGeometry(1, 1.8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(this.submarine.position);
    this.scene.add(ring);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      ring.scale.setScalar(1.0 + progress * gameState.getSonarRange());
      ringMat.opacity = Math.max(0, 0.8 * (1.0 - progress));

      if (progress >= 1.0) {
        clearInterval(interval);
        this.scene.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();
      }
    }, 16);
  }

  private spawnPredator(): void {
    gameState.isPredatorActive = true;
    soundManager.playAlarm();

    const cornerX = Math.random() > 0.5 ? WORLD_CONFIG.TANK_WIDTH / 2 - 10 : -WORLD_CONFIG.TANK_WIDTH / 2 + 10;
    const spawnPos = new THREE.Vector3(cornerX, 10, -WORLD_CONFIG.TANK_DEPTH / 2 + 10);
    this.predator = new Predator(this.scene, spawnPos, gameState.waveNumber);

    this.hud.showAlert(
      `⚠️ WARNING: WAVE ${gameState.waveNumber} PREDATOR!`,
      'Hostile creature detected in tank! Defend fish with Torpedoes [Right Click]!',
      8000
    );
  }

  private createUnderwaterExplosion(position: THREE.Vector3): void {
    soundManager.playExplosion();

    const count = 45;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(12 + Math.random() * 18);

      velocities[i * 3 + 0] = dir.x;
      velocities[i * 3 + 1] = dir.y;
      velocities[i * 3 + 2] = dir.z;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.explosionParticles.push({ points, velocities, life: 1.0 });
  }

  private triggerVictory(): void {
    soundManager.playVictory();
    this.hud.showAlert(
      '👑 AQUARIUM CHAMPION!',
      'You hatched the mythical Golden Dragon! All fish thrive in your underwater empire!',
      15000
    );

    // Spawn celebratory shower of diamonds
    for (let i = 0; i < 20; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        15 + Math.random() * 8,
        (Math.random() - 0.5) * 30
      );
      const coin = new Coin(this.scene, offset, 'STAR_PEARL');
      this.coins.push(coin);
    }
  }

  private handleInput(delta: number): void {
    // 1. Single action consumable keys
    if (inputManager.consumeDropFood() && this.foodDropCooldown <= 0) {
      this.dropFoodPellet();
      this.foodDropCooldown = 0.25;
    }

    if (inputManager.consumeFireTorpedo()) {
      this.fireTorpedo();
    }

    if (inputManager.consumeToggleLights()) {
      const lightsOn = this.submarine.toggleLights();
      this.hud.btnHeadlights.classList.toggle('active', lightsOn);
    }

    if (inputManager.consumeToggleCam()) {
      const is1st = this.submarine.toggleCameraView();
      this.hud.btnCamMode.textContent = is1st ? '🎥 Cam: 1st [C]' : '🎥 Cam: 3rd [C]';
    }

    if (inputManager.consumeSonarPing()) {
      this.triggerSonarPing();
    }

    // Shop Hotkeys 1-6
    const shopIndex = inputManager.consumeShopHotkey();
    if (shopIndex === 0) document.getElementById('btn-buy-guppy')?.click();
    else if (shopIndex === 1) document.getElementById('btn-upgrade-food')?.click();
    else if (shopIndex === 2) document.getElementById('btn-upgrade-capacity')?.click();
    else if (shopIndex === 3) document.getElementById('btn-buy-carnivore')?.click();
    else if (shopIndex === 4) document.getElementById('btn-buy-breeder')?.click();
    else if (shopIndex === 5) document.getElementById('btn-buy-egg')?.click();

    // 2. Continuous Submarine Thruster Physics
    const thrust = inputManager.getForwardThrust();
    const yaw = inputManager.getTurnYaw();
    const ascent = inputManager.getAscent();
    const isBoosting = inputManager.isBoosting();
    const mouseDelta = inputManager.consumeMouseDelta();

    this.submarine.updatePhysics(
      delta,
      thrust,
      yaw,
      ascent,
      isBoosting,
      mouseDelta,
      gameState.getSpeedMultiplier()
    );

    // Audio feedback for engine
    soundManager.updateEngineSound(this.submarine.speedRatio, this.submarine.isBoosting);
  }

  private updateCamera(): void {
    if (this.submarine.isFirstPerson) {
      // 1st Person Cockpit View
      const cockpitWorldPos = new THREE.Vector3();
      this.submarine.cockpitAnchor.getWorldPosition(cockpitWorldPos);
      this.camera.position.copy(cockpitWorldPos);

      const lookDir = new THREE.Vector3(0, 0, -20).applyQuaternion(this.submarine.mesh.quaternion);
      this.camera.lookAt(cockpitWorldPos.clone().add(lookDir));
    } else {
      // 3rd Person Behind-the-Sub Chase Camera with Smooth Lag
      const targetCamPos = new THREE.Vector3();
      this.submarine.chaseCamAnchor.getWorldPosition(targetCamPos);

      // Camera Lag Lerp
      this.currentCamPos.lerp(targetCamPos, SUB_CONFIG.CAM_LERP);
      this.camera.position.copy(this.currentCamPos);

      const subCenter = new THREE.Vector3();
      this.submarine.mesh.getWorldPosition(subCenter);
      const forwardOffset = new THREE.Vector3(0, 1.2, -6.0).applyQuaternion(this.submarine.mesh.quaternion);
      const targetLookAt = subCenter.clone().add(forwardOffset);

      this.currentCamLookAt.lerp(targetLookAt, SUB_CONFIG.CAM_LERP * 1.5);
      this.camera.lookAt(this.currentCamLookAt);
    }
  }

  private updateEntities(delta: number, elapsed: number): void {
    // Cooldown timers
    if (this.torpedoCooldown > 0) this.torpedoCooldown -= delta;
    if (this.foodDropCooldown > 0) this.foodDropCooldown -= delta;

    // 1. Food Pellets
    for (let i = this.foodPellets.length - 1; i >= 0; i--) {
      const pellet = this.foodPellets[i];
      pellet.update(delta, elapsed);

      if (pellet.isConsumed || pellet.isDespawned) {
        if (pellet.isConsumed) {
          soundManager.playChomp();
          gameState.fishFedCount++;
        }
        pellet.destroy(this.scene);
        this.foodPellets.splice(i, 1);
        gameState.activeFoodCount = Math.max(0, gameState.activeFoodCount - 1);
      }
    }

    // 2. Fishes
    const babyGuppies = this.fishes.filter(f => f.type === FishType.GUPPY && f.stage === FishStage.BABY);

    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i];
      const result = fish.update(delta, elapsed, this.foodPellets, babyGuppies);

      // Drop coin
      if (result.droppedCoinType) {
        const coin = new Coin(this.scene, fish.position, result.droppedCoinType);
        this.coins.push(coin);
      }

      // Birth baby
      if (result.spawnedBaby) {
        this.spawnFish(FishType.GUPPY, FishStage.BABY);
        soundManager.playBubble();
        this.hud.showToast('A new baby guppy was born!', 'reward');
      }

      // Check starvation death
      if (fish.isDead && fish.position.y >= WORLD_CONFIG.WATER_SURFACE_Y - 1) {
        fish.destroy(this.scene);
        this.fishes.splice(i, 1);
        this.hud.showToast('A fish starved to death! Keep them fed!', 'danger');
      }
    }

    // 3. Coins Collection & Magnetic Pull
    const magnetRadius = gameState.getMagnetRadius();

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.update(delta, elapsed, this.submarine.position, magnetRadius);

      // Collect coin if touched by submarine hull
      const distToSub = coin.position.distanceTo(this.submarine.position);
      if (distToSub < 3.2) {
        coin.isCollected = true;
        gameState.addMoney(coin.config.value);
        soundManager.playCoinPickup(coin.typeName);
      }

      if (coin.isCollected || coin.isDespawned) {
        coin.destroy(this.scene);
        this.coins.splice(i, 1);
      }
    }

    // 4. Torpedoes & Predator Combat
    for (let i = this.torpedoes.length - 1; i >= 0; i--) {
      const torpedo = this.torpedoes[i];
      torpedo.update(delta);

      // Check collision with Predator
      if (this.predator && !this.predator.isDead) {
        const dist = torpedo.position.distanceTo(this.predator.position);
        if (dist < 4.2) {
          torpedo.isExpired = true;
          this.createUnderwaterExplosion(torpedo.position);

          const isDefeated = this.predator.takeDamage(torpedo.damage);
          if (isDefeated) {
            this.createUnderwaterExplosion(this.predator.position);
            gameState.predatorsDefeatedCount++;
            gameState.waveNumber++;
            gameState.isPredatorActive = false;
            gameState.nextPredatorCountdown = 85.0; // Countdown to next wave

            // Drop bountiful treasure!
            for (let c = 0; c < 8; c++) {
              const scatterPos = this.predator.position.clone().add(
                new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 8)
              );
              this.coins.push(new Coin(this.scene, scatterPos, c % 2 === 0 ? 'GOLD' : 'DIAMOND'));
            }

            this.hud.showAlert('💥 PREDATOR ELIMINATED!', 'Bountiful treasure released on the seabed!', 6000);
            this.predator.destroy(this.scene);
            this.predator = null;
          }
        }
      }

      if (torpedo.isExpired) {
        torpedo.destroy(this.scene);
        this.torpedoes.splice(i, 1);
      }
    }

    // 5. Predator AI & Attacks
    if (this.predator) {
      const eatenFish = this.predator.update(delta, elapsed, this.fishes, this.camera);
      if (eatenFish) {
        soundManager.playChomp();
        this.hud.showToast('A fish was devoured by the predator!', 'danger');
      }
    } else {
      // Countdown to next predator invasion
      gameState.nextPredatorCountdown -= delta;
      if (gameState.nextPredatorCountdown <= 0) {
        this.spawnPredator();
      }
    }

    // 6. Explosion Particles
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const exp = this.explosionParticles[i];
      exp.life -= delta * 1.5;

      const pos = exp.points.geometry.attributes.position;
      for (let p = 0; p < pos.count; p++) {
        pos.setXYZ(
          p,
          pos.getX(p) + exp.velocities[p * 3 + 0] * delta,
          pos.getY(p) + exp.velocities[p * 3 + 1] * delta,
          pos.getZ(p) + exp.velocities[p * 3 + 2] * delta
        );
      }
      pos.needsUpdate = true;
      (exp.points.material as THREE.PointsMaterial).opacity = Math.max(0, exp.life);

      if (exp.life <= 0) {
        this.scene.remove(exp.points);
        exp.points.geometry.dispose();
        (exp.points.material as THREE.Material).dispose();
        this.explosionParticles.splice(i, 1);
      }
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // 1. Process player inputs & submarine movement
    this.handleInput(delta);

    // 2. Update tank environment (caustics, kelp, bubbles)
    this.tank.update(delta, elapsed);

    // 3. Update all game entities (fish, coins, pellets, predators)
    this.updateEntities(delta, elapsed);

    // 4. Update camera
    this.updateCamera();

    // 5. Update HUD telemetry and radar
    this.hud.updateTelemetry(this.submarine, gameState);
    this.hud.drawRadar(this.submarine, this.fishes, this.coins, this.predator, gameState.getSonarRange());

    // 6. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Instantiate game on page load
window.addEventListener('DOMContentLoaded', () => {
  new FishslopGame();
});
