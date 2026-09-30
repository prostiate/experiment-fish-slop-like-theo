import { FOOD_TIERS, SHOP_PRICES } from '../config';

export type GameEventListener = (event: string, data?: unknown) => void;

export class GameState {
  // Economy & Resources
  public money: number = 200; // Starting money: enough for 2 guppies
  public foodTierIndex: number = 0;
  public maxFoodCapacity: number = 2;
  public activeFoodCount: number = 0;

  // Submarine Tech Tree Upgrades (0 = base, 1-3 = upgrades)
  public engineUpgradeLevel: number = 0;
  public magnetUpgradeLevel: number = 0;
  public torpedoUpgradeLevel: number = 0;
  public sonarUpgradeLevel: number = 0;

  // Victory / Progression Condition (The 3 Egg Pieces)
  public eggPieces: number = 0;
  public isGameWon: boolean = false;

  // Statistics
  public fishFedCount: number = 0;
  public coinsCollectedCount: number = 0;
  public predatorsDefeatedCount: number = 0;
  public totalMoneyEarned: number = 200;

  // Predator Wave System
  public nextPredatorCountdown: number = 75.0; // Seconds until first predator
  public waveNumber: number = 1;
  public isPredatorActive: boolean = false;

  // Event Listeners
  private listeners: GameEventListener[] = [];

  constructor() {}

  public addListener(listener: GameEventListener): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: GameEventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  public emit(event: string, data?: unknown): void {
    for (const listener of this.listeners) {
      listener(event, data);
    }
  }

  // --- Economy Actions ---

  public addMoney(amount: number): void {
    this.money += amount;
    this.totalMoneyEarned += amount;
    this.coinsCollectedCount++;
    this.emit('moneyChanged', this.money);
  }

  public spendMoney(amount: number): boolean {
    if (this.money >= amount) {
      this.money -= amount;
      this.emit('moneyChanged', this.money);
      return true;
    }
    return false;
  }

  // --- Shop Purchases ---

  public canBuyGuppy(): boolean {
    return this.money >= SHOP_PRICES.BUY_GUPPY;
  }

  public buyGuppy(): boolean {
    if (this.spendMoney(SHOP_PRICES.BUY_GUPPY)) {
      this.emit('spawnGuppy');
      return true;
    }
    return false;
  }

  public canBuyCarnivore(): boolean {
    return this.money >= SHOP_PRICES.BUY_CARNIVORE;
  }

  public buyCarnivore(): boolean {
    if (this.spendMoney(SHOP_PRICES.BUY_CARNIVORE)) {
      this.emit('spawnCarnivore');
      return true;
    }
    return false;
  }

  public canBuyBreeder(): boolean {
    return this.money >= SHOP_PRICES.BUY_BREEDER;
  }

  public buyBreeder(): boolean {
    if (this.spendMoney(SHOP_PRICES.BUY_BREEDER)) {
      this.emit('spawnBreeder');
      return true;
    }
    return false;
  }

  // --- Food Upgrades ---

  public getNextFoodTierCost(): number | null {
    if (this.foodTierIndex + 1 < FOOD_TIERS.length) {
      return FOOD_TIERS[this.foodTierIndex + 1].cost;
    }
    return null;
  }

  public upgradeFood(): boolean {
    const cost = this.getNextFoodTierCost();
    if (cost !== null && this.spendMoney(cost)) {
      this.foodTierIndex++;
      this.emit('foodUpgraded', this.foodTierIndex);
      return true;
    }
    return false;
  }

  public getFoodCapacityUpgradeCost(): number | null {
    if (this.maxFoodCapacity < 6) {
      return this.maxFoodCapacity * 150;
    }
    return null;
  }

  public upgradeFoodCapacity(): boolean {
    const cost = this.getFoodCapacityUpgradeCost();
    if (cost !== null && this.spendMoney(cost)) {
      this.maxFoodCapacity++;
      this.emit('foodCapUpgraded', this.maxFoodCapacity);
      return true;
    }
    return false;
  }

  // --- Tech Tree Upgrades ---

  public upgradeEngine(): boolean {
    if (this.engineUpgradeLevel < 3) {
      const cost = SHOP_PRICES.UPGRADE_ENGINE[this.engineUpgradeLevel];
      if (this.spendMoney(cost)) {
        this.engineUpgradeLevel++;
        this.emit('upgradeApplied', { type: 'engine', level: this.engineUpgradeLevel });
        return true;
      }
    }
    return false;
  }

  public upgradeMagnet(): boolean {
    if (this.magnetUpgradeLevel < 3) {
      const cost = SHOP_PRICES.UPGRADE_MAGNET[this.magnetUpgradeLevel];
      if (this.spendMoney(cost)) {
        this.magnetUpgradeLevel++;
        this.emit('upgradeApplied', { type: 'magnet', level: this.magnetUpgradeLevel });
        return true;
      }
    }
    return false;
  }

  public upgradeTorpedo(): boolean {
    if (this.torpedoUpgradeLevel < 3) {
      const cost = SHOP_PRICES.UPGRADE_TORPEDO[this.torpedoUpgradeLevel];
      if (this.spendMoney(cost)) {
        this.torpedoUpgradeLevel++;
        this.emit('upgradeApplied', { type: 'torpedo', level: this.torpedoUpgradeLevel });
        return true;
      }
    }
    return false;
  }

  public upgradeSonar(): boolean {
    if (this.sonarUpgradeLevel < 3) {
      const cost = SHOP_PRICES.UPGRADE_SONAR[this.sonarUpgradeLevel];
      if (this.spendMoney(cost)) {
        this.sonarUpgradeLevel++;
        this.emit('upgradeApplied', { type: 'sonar', level: this.sonarUpgradeLevel });
        return true;
      }
    }
    return false;
  }

  // --- Win Condition: Egg Pieces ---

  public getNextEggCost(): number | null {
    if (this.eggPieces < SHOP_PRICES.EGG_PIECES.length) {
      return SHOP_PRICES.EGG_PIECES[this.eggPieces];
    }
    return null;
  }

  public buyEggPiece(): boolean {
    const cost = this.getNextEggCost();
    if (cost !== null && this.spendMoney(cost)) {
      this.eggPieces++;
      this.emit('eggBought', this.eggPieces);

      if (this.eggPieces >= 3) {
        this.isGameWon = true;
        this.emit('gameWon');
      }
      return true;
    }
    return false;
  }

  // --- Helper getters ---

  public getSpeedMultiplier(): number {
    return 1.0 + this.engineUpgradeLevel * 0.25;
  }

  public getMagnetRadius(): number {
    return 9.0 + this.magnetUpgradeLevel * 6.5;
  }

  public getTorpedoDamage(): number {
    return 25 + this.torpedoUpgradeLevel * 15;
  }

  public getSonarRange(): number {
    return 60 + this.sonarUpgradeLevel * 30;
  }
}

export const gameState = new GameState();
