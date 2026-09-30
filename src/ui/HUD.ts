import * as THREE from 'three';
import { FOOD_TIERS, SHOP_PRICES, WORLD_CONFIG } from '../config';
import { GameState } from '../core/GameState';
import { Coin } from '../entities/Coin';
import { Fish } from '../entities/Fish';
import { Predator } from '../entities/Predator';
import { Submarine } from '../entities/Submarine';

export class HUD {
  // DOM Elements
  private moneyValEl: HTMLElement;
  private depthValEl: HTMLElement;
  private speedValEl: HTMLElement;
  private pelletsValEl: HTMLElement;
  private boostPctEl: HTMLElement;
  private boostBarEl: HTMLElement;
  private alertBannerEl: HTMLElement;
  private alertTitleEl: HTMLElement;
  private alertSubtitleEl: HTMLElement;
  private radarCanvas: HTMLCanvasElement;
  private radarCtx: CanvasRenderingContext2D;
  private toastContainer: HTMLElement;

  // Shop buttons
  private btnBuyGuppy: HTMLButtonElement;
  private btnUpgradeFood: HTMLButtonElement;
  private btnUpgradeCap: HTMLButtonElement;
  private btnBuyCarnivore: HTMLButtonElement;
  private btnBuyBreeder: HTMLButtonElement;
  private btnBuyEgg: HTMLButtonElement;
  private foodTierNameEl: HTMLElement;
  private foodTierPriceEl: HTMLElement;
  private foodCapNameEl: HTMLElement;
  private foodCapPriceEl: HTMLElement;
  private eggPieceNameEl: HTMLElement;
  private eggPiecePriceEl: HTMLElement;

  // Submarine Toggles
  public btnHeadlights: HTMLElement;
  public btnCamMode: HTMLElement;
  public btnSonar: HTMLElement;

  constructor() {
    this.moneyValEl = document.getElementById('money-val')!;
    this.depthValEl = document.getElementById('depth-val')!;
    this.speedValEl = document.getElementById('speed-val')!;
    this.pelletsValEl = document.getElementById('pellets-val')!;
    this.boostPctEl = document.getElementById('boost-pct')!;
    this.boostBarEl = document.getElementById('boost-bar')!;
    this.alertBannerEl = document.getElementById('alert-banner')!;
    this.alertTitleEl = document.getElementById('alert-title')!;
    this.alertSubtitleEl = document.getElementById('alert-subtitle')!;
    this.radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
    this.radarCtx = this.radarCanvas.getContext('2d')!;
    this.toastContainer = document.getElementById('toast-container')!;

    this.btnBuyGuppy = document.getElementById('btn-buy-guppy') as HTMLButtonElement;
    this.btnUpgradeFood = document.getElementById('btn-upgrade-food') as HTMLButtonElement;
    this.btnUpgradeCap = document.getElementById('btn-upgrade-capacity') as HTMLButtonElement;
    this.btnBuyCarnivore = document.getElementById('btn-buy-carnivore') as HTMLButtonElement;
    this.btnBuyBreeder = document.getElementById('btn-buy-breeder') as HTMLButtonElement;
    this.btnBuyEgg = document.getElementById('btn-buy-egg') as HTMLButtonElement;

    this.foodTierNameEl = document.getElementById('food-tier-name')!;
    this.foodTierPriceEl = document.getElementById('food-tier-price')!;
    this.foodCapNameEl = document.getElementById('food-cap-name')!;
    this.foodCapPriceEl = document.getElementById('food-cap-price')!;
    this.eggPieceNameEl = document.getElementById('egg-piece-name')!;
    this.eggPiecePriceEl = document.getElementById('egg-piece-price')!;

    this.btnHeadlights = document.getElementById('btn-headlights')!;
    this.btnCamMode = document.getElementById('btn-cam-mode')!;
    this.btnSonar = document.getElementById('btn-sonar')!;
  }

  public updateTelemetry(sub: Submarine, gameState: GameState): void {
    // 1. Money format
    this.moneyValEl.textContent = `$${gameState.money.toLocaleString()}`;

    // 2. Depth calculation (distance down from water surface)
    const depthMeters = Math.max(0, WORLD_CONFIG.WATER_SURFACE_Y - sub.position.y);
    this.depthValEl.textContent = `${depthMeters.toFixed(1)} m`;

    // 3. Speed in knots
    const speedKnots = sub.velocity.length() * 1.94;
    this.speedValEl.textContent = `${speedKnots.toFixed(1)} kn`;

    // 4. Pellets dropped vs max capacity
    this.pelletsValEl.textContent = `${gameState.activeFoodCount} / ${gameState.maxFoodCapacity}`;
    if (gameState.activeFoodCount >= gameState.maxFoodCapacity) {
      this.pelletsValEl.style.color = '#ffaa44';
    } else {
      this.pelletsValEl.style.color = 'var(--primary-cyan)';
    }

    // 5. Boost energy bar
    const boostPct = Math.round(sub.boostEnergy);
    this.boostPctEl.textContent = `${boostPct}%`;
    this.boostBarEl.style.width = `${boostPct}%`;

    // 6. Shop button states
    this.updateShopButtons(gameState);
  }

  private updateShopButtons(gameState: GameState): void {
    // Buy Guppy
    this.btnBuyGuppy.disabled = !gameState.canBuyGuppy();

    // Food Upgrade
    const nextFoodCost = gameState.getNextFoodTierCost();
    if (nextFoodCost !== null) {
      const nextTier = FOOD_TIERS[gameState.foodTierIndex + 1];
      this.foodTierNameEl.textContent = nextTier.name.split(' ')[0];
      this.foodTierPriceEl.textContent = `$${nextFoodCost}`;
      this.btnUpgradeFood.disabled = gameState.money < nextFoodCost;
    } else {
      this.foodTierNameEl.textContent = 'MAX';
      this.foodTierPriceEl.textContent = '---';
      this.btnUpgradeFood.disabled = true;
    }

    // Food Capacity Upgrade
    const capCost = gameState.getFoodCapacityUpgradeCost();
    if (capCost !== null) {
      this.foodCapNameEl.textContent = `Cap ${gameState.maxFoodCapacity + 1}`;
      this.foodCapPriceEl.textContent = `$${capCost}`;
      this.btnUpgradeCap.disabled = gameState.money < capCost;
    } else {
      this.foodCapNameEl.textContent = 'MAX';
      this.foodCapPriceEl.textContent = '---';
      this.btnUpgradeCap.disabled = true;
    }

    // Buy Carnivore & Breeder
    this.btnBuyCarnivore.disabled = !gameState.canBuyCarnivore();
    this.btnBuyBreeder.disabled = !gameState.canBuyBreeder();

    // Egg Victory Piece
    const eggCost = gameState.getNextEggCost();
    if (eggCost !== null) {
      this.eggPieceNameEl.textContent = `Egg ${gameState.eggPieces + 1}/3`;
      this.eggPiecePriceEl.textContent = `$${eggCost}`;
      this.btnBuyEgg.disabled = gameState.money < eggCost;
    } else {
      this.eggPieceNameEl.textContent = 'HATCHED!';
      this.eggPiecePriceEl.textContent = 'WIN';
      this.btnBuyEgg.disabled = true;
    }
  }

  /**
   * Draw the 3D acoustic mini-sonar radar
   */
  public drawRadar(sub: Submarine, fishes: Fish[], coins: Coin[], predator: Predator | null, range: number): void {
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 4;

    ctx.clearRect(0, 0, w, h);

    // Range rings
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // Submarine heading vector
    const subHeading = new THREE.Vector3(0, 0, -1).applyQuaternion(sub.mesh.quaternion);
    const subAngle = Math.atan2(subHeading.x, subHeading.z);

    // Helper to map 3D world relative pos to radar 2D coordinates relative to sub heading
    const mapToRadar = (worldPos: THREE.Vector3) => {
      const relX = worldPos.x - sub.position.x;
      const relZ = worldPos.z - sub.position.z;

      // Rotate coordinates so submarine points "UP" on the radar
      const rotX = relX * Math.cos(subAngle) - relZ * Math.sin(subAngle);
      const rotZ = relX * Math.sin(subAngle) + relZ * Math.cos(subAngle);

      const radarX = cx + (rotX / range) * radius;
      const radarY = cy + (-rotZ / range) * radius;

      const dist = Math.hypot(rotX, rotZ);
      return { x: radarX, y: radarY, inRange: dist <= range };
    };

    // Draw Coins (Yellow/Gold dots)
    for (const c of coins) {
      if (c.isCollected || c.isDespawned) continue;
      const p = mapToRadar(c.position);
      if (p.inRange) {
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Fish (Green if healthy, Red pulse if hungry)
    for (const f of fishes) {
      if (f.isDead) continue;
      const p = mapToRadar(f.position);
      if (p.inRange) {
        const isHungry = f.hunger > 60;
        ctx.fillStyle = isHungry ? '#ff3366' : '#00ff88';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isHungry ? 6 : 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHungry ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Predator (Red skull marker)
    if (predator && !predator.isDead) {
      const p = mapToRadar(predator.position);
      if (p.inRange) {
        ctx.fillStyle = '#ff0033';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing alert ring around predator blip
        ctx.strokeStyle = '#ff0033';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Submarine Center Marker (pointing upwards)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();
  }

  public showAlert(title: string, subtitle: string, durationMs: number = 6000): void {
    this.alertTitleEl.textContent = title;
    this.alertSubtitleEl.textContent = subtitle;
    this.alertBannerEl.classList.remove('hidden');

    setTimeout(() => {
      this.alertBannerEl.classList.add('hidden');
    }, durationMs);
  }

  public showToast(message: string, type: 'info' | 'reward' | 'danger' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }
}
