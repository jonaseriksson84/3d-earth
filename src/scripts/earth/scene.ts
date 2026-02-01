/**
 * Scene initialization and graphics support detection.
 *
 * Handles creating the Three.js scene, camera, and renderer (WebGPU or WebGL),
 * as well as checking for graphics API support and displaying error messages.
 *
 * @module scene
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects } from './types';
import { createRenderer } from './webgpu';

/**
 * Checks whether the browser supports WebGL rendering.
 *
 * @returns `true` if WebGL or experimental-webgl context can be created
 */
export function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Displays a full-screen error message to the user.
 * Uses safe DOM manipulation (textContent) to prevent XSS.
 *
 * @param title - Error heading text
 * @param message - Descriptive error message
 */
export function showError(title: string, message: string): void {
  // Clear existing content safely
  document.body.textContent = '';

  // Create container div
  const container = document.createElement('div');
  container.style.cssText =
    'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; font-family: Arial, sans-serif;';

  // Create title element with safe textContent
  const titleElement = document.createElement('h2');
  titleElement.textContent = title;
  container.appendChild(titleElement);

  // Create message element with safe textContent
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  container.appendChild(messageElement);

  document.body.appendChild(container);
}

/**
 * Verifies WebGL support and throws if unavailable.
 * Displays a user-facing error message before throwing.
 *
 * @throws {Error} If WebGL is not supported by the browser
 */
export function initWebGL(): void {
  if (!checkWebGLSupport()) {
    showError(
      'WebGL Not Supported',
      'This application requires WebGL to display 3D graphics. Please update your browser or enable WebGL in settings.'
    );
    throw new Error('WebGL not supported');
  }
}

/**
 * Creates and configures the Three.js scene, camera, and renderer.
 * Automatically detects WebGPU support and selects the optimal rendering backend.
 * Falls back to WebGL when WebGPU is not available.
 * Appends the renderer's canvas to the document body with accessibility attributes.
 *
 * @returns Initialized scene objects (scene, camera, renderer)
 * @throws {Error} If the renderer cannot be created
 */
export function initScene(): SceneObjects {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA_NEAR,
      CONFIG.CAMERA_FAR
    );

    // Create renderer with automatic WebGPU/WebGL selection
    const renderer = createRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D Earth visualization. Use mouse to rotate and scroll to zoom.');
    document.body.appendChild(renderer.domElement);

    console.log(`Scene initialized successfully (${renderer.rendererInfo.backend} backend)`);

    return { scene, camera, renderer };
  } catch (error) {
    console.error('Failed to initialize renderer:', error);
    showError(
      'Graphics Initialization Failed',
      'Unable to start the 3D graphics system. Please refresh the page or try a different browser.'
    );
    throw error;
  }
}
