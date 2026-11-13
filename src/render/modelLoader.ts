import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface LoadedModelRecord {
  scene: THREE.Group;
  scale: number;
  dance: THREE.AnimationClip | null;
  clips: THREE.AnimationClip[];
}

class ModelLoaderService {
  private gltfLoader: GLTFLoader | null = null;
  private dracoLoader: DRACOLoader | null = null;
  private readonly cache = new Map<string, LoadedModelRecord>();
  private readonly loading = new Map<string, Promise<LoadedModelRecord | null>>();

  private initLoader(): GLTFLoader {
    if (this.gltfLoader) return this.gltfLoader;

    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/gltf/');

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    return this.gltfLoader;
  }

  async load(id: string): Promise<LoadedModelRecord | null> {
    if (this.cache.has(id)) return this.cache.get(id)!;
    if (this.loading.has(id)) return this.loading.get(id)!;

    const promise = (async () => {
      try {
        const loader = this.initLoader();
        const url = `/models/${id}.glb`;
        const gltf = await loader.loadAsync(url);

        // Filter animations removing Head.scale tracks
        for (const clip of gltf.animations) {
          clip.tracks = clip.tracks.filter((t) => !/Head(?!Top)[^.]*\.scale$/.test(t.name));
        }

        const scene = gltf.scene as THREE.Group;

        // Traverse & configure materials
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;

          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              const stdMat = m as THREE.MeshStandardMaterial;
              stdMat.roughness = Math.max(0.45, stdMat.roughness ?? 0.6);
              stdMat.metalness = Math.min(0.2, stdMat.metalness ?? 0.05);
            }
          }
        });

        // Compute ground height scale relative to 0.97
        let leftLegBone: THREE.Bone | null = null;
        scene.traverse((obj) => {
          if (!leftLegBone && (obj as THREE.Bone).isBone && /^LeftUpLeg(_\d+)?$/.test(obj.name)) {
            leftLegBone = obj as THREE.Bone;
          }
        });
        scene.updateMatrixWorld(true);

        const v = new THREE.Vector3();
        if (leftLegBone) (leftLegBone as THREE.Bone).getWorldPosition(v);
        const scale = 0.97 / (v.y > 0.1 ? v.y : 0.97);

        const record: LoadedModelRecord = {
          scene,
          scale,
          dance: gltf.animations.find((a) => a.name === 'dance') ?? null,
          clips: gltf.animations,
        };

        this.cache.set(id, record);
        this.loading.delete(id);
        return record;
      } catch (err) {
        console.warn(`[modelLoader] Failed to load model for ${id}:`, err);
        this.loading.delete(id);
        return null;
      }
    })();

    this.loading.set(id, promise);
    return promise;
  }

  clone(id: string, isAlt = false): {
    model: THREE.Group;
    scale: number;
    dance: THREE.AnimationClip | null;
    clips: THREE.AnimationClip[];
  } | null {
    const record = this.cache.get(id);
    if (!record) return null;

    const cloned = SkeletonUtils.clone(record.scene) as THREE.Group;
    if (isAlt) {
      this.applyAlt(cloned);
    }
    return {
      model: cloned,
      scale: record.scale,
      dance: record.dance,
      clips: record.clips,
    };
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  private applyAlt(scene: THREE.Group): void {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const clonedMats = mats.map((m) => {
        const mat = m.clone() as THREE.MeshStandardMaterial;
        if (mat.color) {
          const hsl = { h: 0, s: 0, l: 0 };
          mat.color.getHSL(hsl);
          mat.color.setHSL((hsl.h + 0.35) % 1, hsl.s, hsl.l);
        }
        return mat;
      });
      mesh.material = Array.isArray(mesh.material) ? clonedMats : clonedMats[0];
    });
  }
}

export const modelLoader = new ModelLoaderService();
