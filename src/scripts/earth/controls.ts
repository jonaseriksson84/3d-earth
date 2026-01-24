import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONFIG } from './config';
import type { SceneObjects } from './types';

export function initControls(
  sceneObjects: SceneObjects
): OrbitControls {
  const { camera, renderer } = sceneObjects;

  // Camera position
  camera.position.set(0, 0, CONFIG.INITIAL_CAMERA_DISTANCE);
  camera.lookAt(0, 0, 0);

  // Orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = CONFIG.DAMPING_FACTOR;
  controls.target.set(0, 0, 0);
  controls.minDistance = CONFIG.MIN_ZOOM_DISTANCE;
  controls.maxDistance = CONFIG.MAX_ZOOM_DISTANCE;

  return controls;
}
