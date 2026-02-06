/**
 * Camera controls setup for orbit-style interaction with the globe.
 *
 * Configures OrbitControls for smooth rotation, zoom limits, and touch handling.
 *
 * @module controls
 */

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONFIG } from './config';
import type { SceneObjects } from './types';

/**
 * Initializes OrbitControls with damping, zoom limits, and disabled panning.
 * Sets the camera to the initial viewing distance.
 *
 * @param sceneObjects - Core scene objects (camera and renderer for controls binding)
 * @returns Configured OrbitControls instance
 */
export function initControls(sceneObjects: SceneObjects): OrbitControls {
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

  // Disable panning (not useful for globe interaction)
  controls.enablePan = false;

  // Improve touch rotation sensitivity
  controls.rotateSpeed = 0.8;

  return controls;
}

/**
 * Prevent default touch behaviors on the canvas to avoid
 * page scroll, browser zoom, and double-tap zoom during globe interaction.
 */
export function setupCanvasTouchHandling(canvas: HTMLCanvasElement): void {
  // Prevent default touch behavior on canvas (scroll, zoom)
  canvas.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      // Allow default behavior if touching a UI element overlaying the canvas
      if (e.target === canvas) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  canvas.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.target === canvas) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  canvas.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      if (e.target === canvas) {
        e.preventDefault();
      }
    },
    { passive: false },
  );
}
