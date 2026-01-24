import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  initWebGL,
  initScene,
  initEarth,
  initLighting,
  initControls,
  createLocationState,
  getLocation,
  createTimeState,
  initTimeControls,
  initEventListeners,
  handleSunUpdate,
} from './earth';
import type {
  SceneObjects,
  EarthObjects,
  LightingObjects,
  TimeState,
  LocationState,
} from './earth';

let sceneObjects: SceneObjects | null = null;
let earthObjects: EarthObjects | null = null;
let lightingObjects: LightingObjects | null = null;
let controls: OrbitControls | null = null;
let timeState: TimeState | null = null;
let locationState: LocationState | null = null;

function animate(): void {
  try {
    requestAnimationFrame(animate);

    // Only update sun position when slider changes (performance optimization)
    if (timeState && earthObjects && lightingObjects) {
      handleSunUpdate(timeState, earthObjects, lightingObjects);
    }

    if (controls) controls.update();
    if (sceneObjects) {
      const { renderer, scene, camera } = sceneObjects;
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }
  } catch (error) {
    console.error('Animation error:', error);
    requestAnimationFrame(animate);
  }
}

export function initApp(): void {
  try {
    console.log('Initializing 3D Earth visualization...');

    // Initialize all systems
    initWebGL();
    sceneObjects = initScene();
    earthObjects = initEarth(sceneObjects);
    lightingObjects = initLighting(sceneObjects);
    controls = initControls(sceneObjects);

    timeState = createTimeState();
    initTimeControls(timeState, earthObjects, lightingObjects);
    initEventListeners(sceneObjects);

    // Start location detection and animation
    locationState = createLocationState();
    getLocation(locationState, earthObjects);
    animate();

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText =
      'position: fixed; bottom: 20px; left: 20px; background: rgba(255, 0, 0, 0.8); color: white; padding: 10px; border-radius: 5px; font-family: Arial, sans-serif;';
    const strongEl = document.createElement('strong');
    strongEl.textContent = 'Error:';
    errorDiv.appendChild(strongEl);
    errorDiv.appendChild(
      document.createTextNode(' Application failed to start. Check console for details.')
    );
    document.body.appendChild(errorDiv);
  }
}

// Start the application when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
