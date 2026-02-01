/**
 * Cloud layer animation for simulating atmospheric drift.
 *
 * Provides animated cloud rotation that is slightly slower than Earth's rotation,
 * simulating the trade winds effect visible from space.
 *
 * @module clouds
 */

import { CONFIG } from './config';
import type { CloudAnimationState, EarthObjects } from './types';

/**
 * Creates the initial cloud animation state.
 *
 * @returns A new CloudAnimationState with mode set to 'static' and zero offset
 */
export function createCloudAnimationState(): CloudAnimationState {
  return {
    mode: 'static',
    rotationOffset: 0,
  };
}

/**
 * Sets the cloud animation mode.
 *
 * When switching to 'static', the accumulated rotation offset is reset so clouds
 * snap back to Earth-locked position.
 *
 * @param state - Cloud animation state to update
 * @param mode - New animation mode ('static' or 'animated')
 */
export function setCloudAnimationMode(
  state: CloudAnimationState,
  mode: 'static' | 'animated'
): void {
  state.mode = mode;
  if (mode === 'static') {
    state.rotationOffset = 0;
  }
}

/**
 * Updates the cloud layer rotation each frame.
 *
 * In 'animated' mode, applies a slow differential rotation to the cloud layer
 * relative to Earth, simulating trade winds. In 'static' mode, clouds remain
 * locked to Earth's rotation.
 *
 * @param state - Cloud animation state
 * @param earthObjects - Earth objects containing the cloud LOD
 * @param deltaTime - Time elapsed since last frame in seconds
 */
export function updateCloudAnimation(
  state: CloudAnimationState,
  earthObjects: EarthObjects,
  deltaTime: number
): void {
  if (state.mode === 'animated') {
    // Accumulate a slow drift offset (clouds rotate slightly slower = drift eastward relative to surface)
    state.rotationOffset += CONFIG.CLOUD_DRIFT_SPEED * deltaTime;

    // Keep offset from growing unbounded
    if (state.rotationOffset > Math.PI * 2) {
      state.rotationOffset -= Math.PI * 2;
    }
  }

  // Apply Earth's base rotation plus the drift offset
  earthObjects.clouds.rotation.y = earthObjects.earth.rotation.y + state.rotationOffset;
}
