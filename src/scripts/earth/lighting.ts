import * as THREE from 'three';
import { CONFIG } from './config';
import type { LightingObjects, SceneObjects } from './types';

export function initLighting(sceneObjects: SceneObjects): LightingObjects {
  const { scene } = sceneObjects;

  // Ambient light
  const ambientLight = new THREE.AmbientLight(
    0x404040,
    CONFIG.AMBIENT_LIGHT_INTENSITY
  );
  scene.add(ambientLight);

  // Directional light (sun)
  const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    CONFIG.DIRECTIONAL_LIGHT_INTENSITY
  );
  directionalLight.position.set(0, 0, CONFIG.SUN_DISTANCE);
  scene.add(directionalLight);

  return { ambientLight, directionalLight };
}
