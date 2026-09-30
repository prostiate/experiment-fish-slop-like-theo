// Aquarium Tank Boundaries & World Settings
export const WORLD_CONFIG = {
  // Tank dimensions (in world units)
  TANK_WIDTH: 100,    // X axis: -50 to +50
  TANK_HEIGHT: 55,    // Y axis: -25 (bottom) to +30 (water surface)
  TANK_DEPTH: 80,     // Z axis: -40 to +40
  WATER_SURFACE_Y: 28,
  TANK_FLOOR_Y: -25,

  // Water environment
  WATER_COLOR: 0x052347,
  WATER_FOG_NEAR: 15,
  WATER_FOG_FAR: 140,
  AMBIENT_LIGHT: 0x224466,
  SUN_LIGHT: 0x77ccff,
};

// Submarine Physics & Specifications
export const SUB_CONFIG = {
  BASE_SPEED: 26.0,
  BOOST_MULTIPLIER: 1.85,
  REVERSE_SPEED: 12.0,
  ASCENT_SPEED: 18.0,
  TURN_SPEED_YAW: 2.2,
  PITCH_SPEED: 1.8,
  DAMPING: 0.94,
  ANGULAR_DAMPING: 0.88,
  BOOST_DRAIN_RATE: 35.0,  // per second
  BOOST_RECHARGE_RATE: 20.0, // per second

  // Camera settings
  CHASE_CAM_OFFSET: { x: 0, y: 5.5, z: 17.0 },
  CHASE_CAM_LOOK_OFFSET: { x: 0, y: 1.0, z: -8.0 },
  CAM_LERP: 0.08,

  // Default magnet radius (can be upgraded)
  BASE_MAGNET_RADIUS: 9.0,
};

// Food Pellet Types & Progression
export interface FoodTier {
  name: string;
  nutrition: number; // How much hunger it restores (0-100)
  color: number;
  glowColor: number;
  size: number;
  sinkSpeed: number;
  cost: number;
}

export const FOOD_TIERS: FoodTier[] = [
  { name: 'Basic Pellets', nutrition: 35, color: 0xc87d55, glowColor: 0xffaa66, size: 0.45, sinkSpeed: 3.5, cost: 0 },
  { name: 'Rich Flakes', nutrition: 55, color: 0x44dd88, glowColor: 0x88ffaa, size: 0.55, sinkSpeed: 4.2, cost: 200 },
  { name: 'Nutrient Pills', nutrition: 80, color: 0x00ccff, glowColor: 0x66eeff, size: 0.65, sinkSpeed: 4.8, cost: 450 },
  { name: 'Super Slop Bio-Mix', nutrition: 100, color: 0xff44aa, glowColor: 0xff88dd, size: 0.75, sinkSpeed: 5.5, cost: 900 },
];

// Fish Types & Stages
export enum FishType {
  GUPPY = 'GUPPY',
  CARNIVORE = 'CARNIVORE',
  BREEDER = 'BREEDER',
}

export enum FishStage {
  BABY = 0,
  MEDIUM = 1,
  KING = 2,
}

export const GUPPY_STAGE_SETTINGS = {
  [FishStage.BABY]: {
    scale: 0.8,
    eatsToGrow: 3,
    coinDropInterval: 12.0, // seconds
    coinType: 'BRONZE',
    color: 0xffa500, // Orange
    swimSpeed: 11.0,
  },
  [FishStage.MEDIUM]: {
    scale: 1.25,
    eatsToGrow: 5,
    coinDropInterval: 10.0,
    coinType: 'SILVER',
    color: 0x33bbff, // Aqua Blue
    swimSpeed: 9.5,
  },
  [FishStage.KING]: {
    scale: 1.8,
    eatsToGrow: 0, // max
    coinDropInterval: 8.5,
    coinType: 'GOLD',
    color: 0xffd700, // Golden Crown
    swimSpeed: 8.0,
  },
};

// Coin Types & Reward Values
export interface CoinConfig {
  value: number;
  color: number;
  emissive: number;
  scale: number;
  sinkSpeed: number;
  lifespan: number; // despawns after seconds
  isGem?: boolean;
}

export const COIN_TYPES: Record<string, CoinConfig> = {
  BRONZE: {
    value: 15,
    color: 0xcd7f32,
    emissive: 0x663300,
    scale: 0.9,
    sinkSpeed: 4.0,
    lifespan: 14.0,
  },
  SILVER: {
    value: 40,
    color: 0xe0e8f0,
    emissive: 0x556677,
    scale: 1.05,
    sinkSpeed: 4.5,
    lifespan: 16.0,
  },
  GOLD: {
    value: 100,
    color: 0xffd700,
    emissive: 0x886600,
    scale: 1.25,
    sinkSpeed: 5.0,
    lifespan: 18.0,
  },
  DIAMOND: {
    value: 250,
    color: 0x00f2fe,
    emissive: 0x0088cc,
    scale: 1.3,
    sinkSpeed: 3.5,
    lifespan: 22.0,
    isGem: true,
  },
  STAR_PEARL: {
    value: 500,
    color: 0xff66cc,
    emissive: 0xaa2288,
    scale: 1.4,
    sinkSpeed: 3.0,
    lifespan: 25.0,
    isGem: true,
  },
};

// Shop Costs & Upgrades
export const SHOP_PRICES = {
  BUY_GUPPY: 100,
  BUY_CARNIVORE: 1000,
  BUY_BREEDER: 750,
  EGG_PIECES: [1500, 3000, 5000],

  UPGRADE_ENGINE: [350, 750, 1500],
  UPGRADE_MAGNET: [400, 850, 1800],
  UPGRADE_TORPEDO: [500, 1100, 2200],
  UPGRADE_SONAR: [300, 700, 1400],
};
