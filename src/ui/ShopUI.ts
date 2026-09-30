import { SHOP_PRICES } from '../config';
import { GameState } from '../core/GameState';
import { soundManager } from '../audio/SoundManager';

export class ShopUI {
  private upgradesModal: HTMLElement;
  private helpModal: HTMLElement;
  private introOverlay: HTMLElement;

  private btnUpgEngine: HTMLButtonElement;
  private btnUpgMagnet: HTMLButtonElement;
  private btnUpgTorpedo: HTMLButtonElement;
  private btnUpgSonar: HTMLButtonElement;

  private upgEngineLevels: HTMLElement;
  private upgMagnetLevels: HTMLElement;
  private upgTorpedoLevels: HTMLElement;
  private upgSonarLevels: HTMLElement;

  constructor(gameState: GameState, onStartDive: () => void) {
    this.upgradesModal = document.getElementById('upgrades-modal')!;
    this.helpModal = document.getElementById('help-modal')!;
    this.introOverlay = document.getElementById('intro-overlay')!;

    this.btnUpgEngine = document.getElementById('btn-upg-engine') as HTMLButtonElement;
    this.btnUpgMagnet = document.getElementById('btn-upg-magnet') as HTMLButtonElement;
    this.btnUpgTorpedo = document.getElementById('btn-upg-torpedo') as HTMLButtonElement;
    this.btnUpgSonar = document.getElementById('btn-upg-sonar') as HTMLButtonElement;

    this.upgEngineLevels = document.getElementById('upg-engine-levels')!;
    this.upgMagnetLevels = document.getElementById('upg-magnet-levels')!;
    this.upgTorpedoLevels = document.getElementById('upg-torpedo-levels')!;
    this.upgSonarLevels = document.getElementById('upg-sonar-levels')!;

    this.setupModalEvents(onStartDive);
    this.setupUpgradeButtons(gameState);
    this.updateTechTreeUI(gameState);

    gameState.addListener(() => {
      this.updateTechTreeUI(gameState);
    });
  }

  private setupModalEvents(onStartDive: () => void): void {
    // Intro Launch Dive Button
    const btnLaunch = document.getElementById('btn-launch')!;
    btnLaunch.addEventListener('click', () => {
      this.introOverlay.classList.add('fade-out');
      soundManager.init();
      onStartDive();
    });

    const btnStartGame = document.getElementById('btn-start-game')!;
    btnStartGame.addEventListener('click', () => {
      this.helpModal.classList.add('hidden');
      soundManager.init();
      onStartDive();
    });

    // Close buttons
    document.getElementById('btn-close-upgrades')?.addEventListener('click', () => {
      this.upgradesModal.classList.add('hidden');
    });

    document.getElementById('btn-close-help')?.addEventListener('click', () => {
      this.helpModal.classList.add('hidden');
    });

    // Header buttons
    document.getElementById('btn-upgrades-menu')?.addEventListener('click', () => {
      this.upgradesModal.classList.toggle('hidden');
    });

    document.getElementById('btn-toggle-help')?.addEventListener('click', () => {
      this.helpModal.classList.toggle('hidden');
    });

    const btnSound = document.getElementById('btn-toggle-sound')!;
    btnSound.addEventListener('click', () => {
      const isUnmuted = soundManager.toggleMute();
      btnSound.textContent = isUnmuted ? '🔊' : '🔇';
    });
  }

  private setupUpgradeButtons(gameState: GameState): void {
    this.btnUpgEngine.addEventListener('click', () => {
      if (gameState.upgradeEngine()) {
        soundManager.playCoinPickup('GOLD');
      }
    });

    this.btnUpgMagnet.addEventListener('click', () => {
      if (gameState.upgradeMagnet()) {
        soundManager.playCoinPickup('GOLD');
      }
    });

    this.btnUpgTorpedo.addEventListener('click', () => {
      if (gameState.upgradeTorpedo()) {
        soundManager.playCoinPickup('GOLD');
      }
    });

    this.btnUpgSonar.addEventListener('click', () => {
      if (gameState.upgradeSonar()) {
        soundManager.playCoinPickup('GOLD');
      }
    });
  }

  public updateTechTreeUI(gameState: GameState): void {
    // Engine Upgrade
    this.renderUpgradeItem(
      this.btnUpgEngine,
      this.upgEngineLevels,
      gameState.engineUpgradeLevel,
      SHOP_PRICES.UPGRADE_ENGINE,
      gameState.money
    );

    // Magnet Upgrade
    this.renderUpgradeItem(
      this.btnUpgMagnet,
      this.upgMagnetLevels,
      gameState.magnetUpgradeLevel,
      SHOP_PRICES.UPGRADE_MAGNET,
      gameState.money
    );

    // Torpedo Upgrade
    this.renderUpgradeItem(
      this.btnUpgTorpedo,
      this.upgTorpedoLevels,
      gameState.torpedoUpgradeLevel,
      SHOP_PRICES.UPGRADE_TORPEDO,
      gameState.money
    );

    // Sonar Upgrade
    this.renderUpgradeItem(
      this.btnUpgSonar,
      this.upgSonarLevels,
      gameState.sonarUpgradeLevel,
      SHOP_PRICES.UPGRADE_SONAR,
      gameState.money
    );
  }

  private renderUpgradeItem(
    btn: HTMLButtonElement,
    pipsContainer: HTMLElement,
    currentLevel: number,
    costArray: number[],
    currentMoney: number
  ): void {
    // Update pips
    pipsContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const pip = document.createElement('span');
      pip.className = `pip ${i < currentLevel ? 'active' : ''}`;
      pipsContainer.appendChild(pip);
    }

    // Update button price & disabled state
    if (currentLevel < 3) {
      const cost = costArray[currentLevel];
      btn.textContent = `$${cost}`;
      btn.disabled = currentMoney < cost;
    } else {
      btn.textContent = 'MAX';
      btn.disabled = true;
    }
  }
}
