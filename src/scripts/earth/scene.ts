import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects } from './types';

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

export function initWebGL(): void {
  if (!checkWebGLSupport()) {
    showError(
      'WebGL Not Supported',
      'This application requires WebGL to display 3D graphics. Please update your browser or enable WebGL in settings.'
    );
    throw new Error('WebGL not supported');
  }
}

export function initScene(): SceneObjects {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA_NEAR,
      CONFIG.CAMERA_FAR
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D Earth visualization. Use mouse to rotate and scroll to zoom.');
    document.body.appendChild(renderer.domElement);

    console.log('Scene initialized successfully');

    return { scene, camera, renderer };
  } catch (error) {
    console.error('Failed to initialize WebGL renderer:', error);
    showError(
      'Graphics Initialization Failed',
      'Unable to start the 3D graphics system. Please refresh the page or try a different browser.'
    );
    throw error;
  }
}
