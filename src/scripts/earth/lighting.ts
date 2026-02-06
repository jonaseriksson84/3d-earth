/**
 * Scene lighting setup for the Earth visualization.
 *
 * Creates ambient fill light and a directional sun light.
 *
 * @module lighting
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { LightingObjects, SceneObjects } from './types';

/**
 * Initializes scene lighting with ambient fill and directional sunlight.
 *
 * @param sceneObjects - Core scene objects to add lights to
 * @returns The created ambient and directional light objects
 */
export function initLighting(sceneObjects: SceneObjects): LightingObjects {
  const { scene } = sceneObjects;

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, CONFIG.AMBIENT_LIGHT_INTENSITY);
  scene.add(ambientLight);

  // Directional light (sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, CONFIG.DIRECTIONAL_LIGHT_INTENSITY);
  directionalLight.position.set(0, 0, CONFIG.SUN_DISTANCE);
  scene.add(directionalLight);

  return { ambientLight, directionalLight };
}
