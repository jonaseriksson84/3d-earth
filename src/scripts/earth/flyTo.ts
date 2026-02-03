/**
 * Fly-to camera animation for navigating to city markers.
 *
 * Provides smooth spherical interpolation (slerp) camera animation
 * with ease-in-out cubic easing and interruptible behavior.
 *
 * @module flyTo
 */

import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONFIG } from './config';
import type { SceneObjects, CityData, FlyToState } from './types';
import { latLonToPosition } from './markers';

/**
 * Easing function for smooth animation (ease-in-out cubic)
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Creates the initial fly-to animation state (not animating).
 *
 * @returns Initialized fly-to state with default values
 */
export function createFlyToState(): FlyToState {
  return {
    isAnimating: false,
    startPosition: new THREE.Vector3(),
    endPosition: new THREE.Vector3(),
    startTime: 0,
    duration: 2000, // 2 seconds default
    targetCity: null,
  };
}

/**
 * Calculate camera position to view a location on Earth
 * The camera should be positioned along the line from Earth center through the target point
 */
function calculateCameraPosition(
  lat: number,
  lon: number,
  cameraDistance: number
): THREE.Vector3 {
  // Convert lat/lon to 3D position at camera distance from origin
  const position = latLonToPosition(lat, lon, cameraDistance);
  return position;
}

/**
 * Starts a fly-to camera animation toward a city's geographic position.
 * Disables OrbitControls during the animation.
 * Duration scales with angular distance (2–3 seconds).
 *
 * @param cityData - Target city with lat/lon coordinates
 * @param sceneObjects - Scene objects for camera access
 * @param flyToState - Mutable animation state to configure
 * @param controls - OrbitControls to disable during animation
 * @param earthRotationY - Current Earth Y rotation in radians (to account for globe orientation)
 */
export function startFlyTo(
  cityData: CityData,
  sceneObjects: SceneObjects,
  flyToState: FlyToState,
  controls: OrbitControls,
  earthRotationY: number = 0
): void {
  // Store current camera position
  flyToState.startPosition.copy(sceneObjects.camera.position);

  // Calculate target camera position
  // Use current camera distance from center, or default to a nice viewing distance
  const currentDistance = sceneObjects.camera.position.length();
  const targetDistance = Math.max(
    Math.min(currentDistance, CONFIG.INITIAL_CAMERA_DISTANCE),
    CONFIG.MIN_ZOOM_DISTANCE + 2
  );

  // Calculate the position on the sphere where the camera should look from
  // This gives us the position in "Earth local" coordinates (unrotated)
  const localPosition = calculateCameraPosition(
    cityData.lat,
    cityData.lon,
    targetDistance
  );

  // Apply Earth's rotation to get world-space coordinates
  // The Earth (and markers) rotate around Y axis, so we need to match that
  flyToState.endPosition = localPosition.applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    earthRotationY
  );

  // Adjust duration based on angular distance (longer for farther trips)
  const startNormalized = flyToState.startPosition.clone().normalize();
  const endNormalized = flyToState.endPosition.clone().normalize();
  const angularDistance = startNormalized.angleTo(endNormalized);
  const baseDuration = 2000; // 2 seconds base
  const maxDuration = 3000; // 3 seconds max

  // Scale duration: 0 radians = 1500ms, PI radians = 3000ms
  flyToState.duration =
    baseDuration + (angularDistance / Math.PI) * (maxDuration - baseDuration);

  flyToState.startTime = performance.now();
  flyToState.isAnimating = true;
  flyToState.targetCity = cityData;

  // Disable controls during animation
  controls.enabled = false;
}

/**
 * Updates the fly-to animation each frame using spherical interpolation.
 * Re-enables OrbitControls when the animation completes.
 *
 * @param flyToState - Animation state with start/end positions and timing
 * @param sceneObjects - Scene objects for camera position updates
 * @param controls - OrbitControls to re-enable on completion
 * @returns `true` if the animation completed this frame, `false` otherwise
 */
export function updateFlyTo(
  flyToState: FlyToState,
  sceneObjects: SceneObjects,
  controls: OrbitControls
): boolean {
  if (!flyToState.isAnimating) {
    return false;
  }

  const elapsed = performance.now() - flyToState.startTime;
  const progress = Math.min(elapsed / flyToState.duration, 1);
  const easedProgress = easeInOutCubic(progress);

  // Interpolate camera position along a curved path (spherical interpolation)
  // This ensures the camera doesn't go through the Earth
  const startNorm = flyToState.startPosition.clone().normalize();
  const endNorm = flyToState.endPosition.clone().normalize();

  // Slerp for direction
  const currentDirection = new THREE.Vector3();
  currentDirection.copy(startNorm).lerp(endNorm, easedProgress).normalize();

  // Interpolate distance
  const startDistance = flyToState.startPosition.length();
  const endDistance = flyToState.endPosition.length();
  const currentDistance =
    startDistance + (endDistance - startDistance) * easedProgress;

  // Apply new camera position
  sceneObjects.camera.position.copy(
    currentDirection.multiplyScalar(currentDistance)
  );

  // Keep camera looking at center
  sceneObjects.camera.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);

  // Check if animation is complete
  if (progress >= 1) {
    flyToState.isAnimating = false;
    flyToState.targetCity = null;
    controls.enabled = true;
    return true;
  }

  return false;
}

/**
 * Cancels any in-progress fly-to animation and re-enables OrbitControls.
 *
 * @param flyToState - Animation state to cancel
 * @param controls - OrbitControls to re-enable
 */
export function cancelFlyTo(
  flyToState: FlyToState,
  controls: OrbitControls
): void {
  if (flyToState.isAnimating) {
    flyToState.isAnimating = false;
    flyToState.targetCity = null;
    controls.enabled = true;
  }
}

/**
 * Checks whether a fly-to animation is currently active.
 *
 * @param flyToState - Animation state to check
 * @returns `true` if an animation is in progress
 */
export function isFlyingTo(flyToState: FlyToState): boolean {
  return flyToState.isAnimating;
}

/**
 * Determines whether a mousedown target should cancel an in-progress fly-to.
 * Only canvas clicks (globe interaction) cancel; UI element clicks do not.
 *
 * @param target - The event target from the mousedown event
 * @returns `true` if the target is a canvas element
 */
export function shouldCancelFlyTo(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return target.tagName === 'CANVAS';
}
