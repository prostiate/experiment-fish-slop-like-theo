export class InputManager {
  private keys: Set<string> = new Set();
  public mouseX: number = 0;
  public mouseY: number = 0;
  public mouseDeltaX: number = 0;
  public mouseDeltaY: number = 0;
  public isPointerLocked: boolean = false;

  // Single-frame action flags
  public dropFoodRequested: boolean = false;
  public fireTorpedoRequested: boolean = false;
  public toggleLightsRequested: boolean = false;
  public toggleCamRequested: boolean = false;
  public sonarPingRequested: boolean = false;
  public hotkeyShopIndex: number = -1;

  private canvas: HTMLElement | null = null;

  constructor() {
    this.setupKeyboard();
  }

  public init(canvas: HTMLElement): void {
    this.canvas = canvas;
    this.setupMouse(canvas);
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // Prevent browser default for game keys like Space and Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      this.keys.add(e.code);

      // Single trigger actions
      if (e.code === 'KeyF') {
        this.dropFoodRequested = true;
      }
      if (e.code === 'KeyE') {
        this.fireTorpedoRequested = true;
      }
      if (e.code === 'KeyL') {
        this.toggleLightsRequested = true;
      }
      if (e.code === 'KeyV' || (e.code === 'KeyC' && !e.ctrlKey)) {
        // Toggle camera if not holding Ctrl
        if (e.code === 'KeyV') this.toggleCamRequested = true;
      }
      if (e.code === 'KeyQ') {
        this.sonarPingRequested = true;
      }

      // Hotkeys 1-6 for shop
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        if (digit >= 1 && digit <= 6) {
          this.hotkeyShopIndex = digit - 1;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
    });
  }

  private setupMouse(canvas: HTMLElement): void {
    // Request pointer lock on canvas click
    canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    // Track mouse delta when locked or dragging
    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    // Mouse buttons
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        // Left click = Drop food (if pointer locked)
        if (this.isPointerLocked) {
          this.dropFoodRequested = true;
        }
      } else if (e.button === 2) {
        // Right click = Fire torpedo
        e.preventDefault();
        this.fireTorpedoRequested = true;
      }
    });

    // Prevent context menu on right click in canvas
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // --- Input Queries ---

  public isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  public getForwardThrust(): number {
    let thrust = 0;
    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) thrust += 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) thrust -= 0.6;
    return thrust;
  }

  public getTurnYaw(): number {
    let yaw = 0;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) yaw += 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) yaw -= 1;
    return yaw;
  }

  public getAscent(): number {
    let ascent = 0;
    if (this.isKeyDown('Space')) ascent += 1;
    if (this.isKeyDown('KeyC') || this.isKeyDown('ControlLeft')) ascent -= 1;
    return ascent;
  }

  public isBoosting(): boolean {
    return this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');
  }

  /**
   * Consume and reset mouse deltas after each frame
   */
  public consumeMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseDeltaX, y: this.mouseDeltaY };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }

  /**
   * Consume single-action flags
   */
  public consumeDropFood(): boolean {
    const res = this.dropFoodRequested;
    this.dropFoodRequested = false;
    return res;
  }

  public consumeFireTorpedo(): boolean {
    const res = this.fireTorpedoRequested;
    this.fireTorpedoRequested = false;
    return res;
  }

  public consumeToggleLights(): boolean {
    const res = this.toggleLightsRequested;
    this.toggleLightsRequested = false;
    return res;
  }

  public consumeToggleCam(): boolean {
    const res = this.toggleCamRequested;
    this.toggleCamRequested = false;
    return res;
  }

  public consumeSonarPing(): boolean {
    const res = this.sonarPingRequested;
    this.sonarPingRequested = false;
    return res;
  }

  public consumeShopHotkey(): number {
    const res = this.hotkeyShopIndex;
    this.hotkeyShopIndex = -1;
    return res;
  }
}

export const inputManager = new InputManager();
