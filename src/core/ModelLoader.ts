import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group> = new Map();
  public isLoaded: boolean = false;

  constructor() {
    this.loader = new GLTFLoader();
  }

  public async preloadAll(): Promise<void> {
    const models = [
      { name: 'submarine', path: './models/submarine.glb' },
      { name: 'guppy', path: './models/guppy.glb' },
      { name: 'carnivore', path: './models/carnivore.glb' },
      { name: 'coin', path: './models/coin.glb' },
      { name: 'diamond', path: './models/diamond.glb' },
      { name: 'predator', path: './models/predator.glb' },
    ];

    const promises = models.map(m => this.loadModel(m.name, m.path));
    await Promise.all(promises);
    this.isLoaded = true;
    console.log('✅ All Blender 3D GLB models preloaded successfully!');
  }

  private loadModel(name: string, path: string): Promise<THREE.Group> {
    return new Promise((resolve) => {
      this.loader.load(
        path,
        (gltf) => {
          const root = gltf.scene;

          // Enable shadow casting and tune materials
          root.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.side = THREE.DoubleSide;
              }
            }
          });

          this.cache.set(name, root);
          resolve(root);
        },
        undefined,
        (err) => {
          console.warn(`Failed to load ${path}, fallback will be used:`, err);
          resolve(new THREE.Group());
        }
      );
    });
  }

  /**
   * Clone a preloaded Blender model instance
   */
  public cloneModel(name: string): THREE.Group | null {
    const cached = this.cache.get(name);
    if (cached) {
      return cached.clone(true);
    }
    return null;
  }
}

export const modelLoader = new ModelLoader();
