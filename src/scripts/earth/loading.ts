/**
 * Texture loading overlay with progress tracking and error recovery.
 *
 * Manages the loading UI displayed while Earth textures download,
 * including progress bar updates, fade-out animation, and retry functionality.
 *
 * @module loading
 */

import * as THREE from 'three';
import type { LoadingState } from './types';

/**
 * Creates the loading state by finding all required DOM elements.
 *
 * @returns Loading state with DOM references and zeroed counters
 */
export function createLoadingState(): LoadingState {
  const overlay = document.getElementById('loading-overlay');
  const progressBar = document.getElementById('loading-progress');
  const statusText = document.getElementById('loading-status');
  const loadingText = document.querySelector('.loading-text') as HTMLElement | null;
  const errorOverlay = document.getElementById('error-overlay');
  const errorMessage = document.getElementById('error-message');
  const retryButton = document.getElementById('retry-button');

  return {
    overlay,
    progressBar,
    statusText,
    loadingText,
    errorOverlay,
    errorMessage,
    retryButton,
    totalItems: 0,
    loadedItems: 0,
    hasError: false,
  };
}

/**
 * Creates a Three.js LoadingManager that updates the loading overlay with progress.
 *
 * @param loadingState - Loading state for progress bar updates
 * @param onComplete - Callback invoked when all assets finish loading
 * @param onError - Callback invoked with the failed URL on load error
 * @returns Configured LoadingManager to pass to texture loaders
 */
export function createTextureLoadingManager(
  loadingState: LoadingState,
  onComplete: () => void,
  onError: (url: string) => void,
): THREE.LoadingManager {
  const manager = new THREE.LoadingManager();

  manager.onStart = (_url: string, itemsLoaded: number, itemsTotal: number) => {
    loadingState.totalItems = itemsTotal;
    loadingState.loadedItems = itemsLoaded;
    updateLoadingProgress(loadingState);
  };

  manager.onProgress = (_url: string, itemsLoaded: number, itemsTotal: number) => {
    loadingState.totalItems = itemsTotal;
    loadingState.loadedItems = itemsLoaded;
    updateLoadingProgress(loadingState);
  };

  manager.onLoad = () => {
    console.log('All textures loaded successfully');
    hideLoadingOverlay(loadingState);
    onComplete();
  };

  manager.onError = (url: string) => {
    console.error('Failed to load texture:', url);
    loadingState.hasError = true;
    onError(url);
  };

  return manager;
}

function updateLoadingProgress(loadingState: LoadingState): void {
  const { progressBar, statusText, totalItems, loadedItems } = loadingState;

  if (totalItems === 0) return;

  const percentage = Math.round((loadedItems / totalItems) * 100);

  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }

  if (statusText) {
    statusText.textContent = `${percentage}%`;
  }
}

/**
 * Hides the loading overlay with a fade-out animation.
 * Removes from DOM after 500ms transition.
 *
 * @param loadingState - Loading state containing the overlay element
 */
export function hideLoadingOverlay(loadingState: LoadingState): void {
  const { overlay } = loadingState;

  if (overlay) {
    overlay.classList.add('fade-out');
    // Remove from DOM after fade animation
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 500);
  }
}

/**
 * Displays the error overlay with a message, hiding the loading overlay.
 *
 * @param loadingState - Loading state containing overlay elements
 * @param message - Error message to display
 */
export function showErrorOverlay(loadingState: LoadingState, message: string): void {
  const { overlay, errorOverlay, errorMessage } = loadingState;

  if (overlay) {
    overlay.style.display = 'none';
  }

  if (errorOverlay) {
    errorOverlay.style.display = 'flex';
  }

  if (errorMessage) {
    errorMessage.textContent = message;
  }
}

/**
 * Hides the error overlay and resets the loading overlay for a retry attempt.
 *
 * @param loadingState - Loading state to reset
 */
export function hideErrorOverlay(loadingState: LoadingState): void {
  const { errorOverlay, overlay } = loadingState;

  if (errorOverlay) {
    errorOverlay.style.display = 'none';
  }

  // Reset loading overlay for retry
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('fade-out');
  }

  // Reset progress
  loadingState.loadedItems = 0;
  loadingState.totalItems = 0;
  loadingState.hasError = false;
  updateLoadingProgress(loadingState);
}

/**
 * Attaches a click handler to the retry button for error recovery.
 *
 * @param loadingState - Loading state containing the retry button element
 * @param retryCallback - Function to call when retry is clicked
 */
export function setupRetryButton(loadingState: LoadingState, retryCallback: () => void): void {
  const { retryButton } = loadingState;

  if (retryButton) {
    retryButton.addEventListener('click', () => {
      hideErrorOverlay(loadingState);
      retryCallback();
    });
  }
}
