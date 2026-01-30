/**
 * Atmospheric glow effect using Fresnel shader for Earth's limb.
 *
 * Creates a subtle blue halo around Earth simulating atmospheric scattering
 * as seen from space, using a back-face rendered sphere with additive blending.
 *
 * @module atmosphere
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { AtmosphereState, SceneObjects } from './types';

/**
 * Vertex shader for atmospheric glow effect.
 * Computes view direction for Fresnel calculation.
 */
function getAtmosphereVertexShader(): string {
  return `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
}

/**
 * Fragment shader for atmospheric glow effect.
 * Uses Fresnel equation for edge glow - stronger at limb, transparent at center.
 */
function getAtmosphereFragmentShader(): string {
  return `
    uniform vec3 atmosphereColor;
    uniform float glowIntensity;
    uniform float fresnelPower;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      // Direction from surface point to camera
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 normal = normalize(vNormal);

      // Fresnel effect: stronger glow at edges (where view is perpendicular to surface)
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), fresnelPower);

      // Apply color with fresnel-based alpha
      gl_FragColor = vec4(atmosphereColor, fresnel * glowIntensity);
    }
  `;
}

/**
 * Initializes the atmospheric glow effect around Earth.
 * Creates a slightly larger sphere with Fresnel shader for limb glow.
 *
 * @param sceneObjects - Core scene objects to add the atmosphere to
 * @returns Atmosphere state with mesh, material, and visibility flag
 */
export function initAtmosphere(sceneObjects: SceneObjects): AtmosphereState {
  const { scene } = sceneObjects;

  // Determine geometry detail level (same as Earth for consistency)
  const devicePixelRatio = window.devicePixelRatio || 1;
  const isHighDPI = devicePixelRatio > 1.5;
  const isLargeScreen = window.innerWidth > 1200;
  const segments =
    isHighDPI && isLargeScreen
      ? CONFIG.GEOMETRY_HIGH
      : isHighDPI || isLargeScreen
        ? CONFIG.GEOMETRY_MEDIUM
        : CONFIG.GEOMETRY_LOW;

  // Create atmosphere geometry slightly larger than clouds
  const atmosphereGeometry = new THREE.SphereGeometry(
    CONFIG.ATMOSPHERE_RADIUS,
    segments,
    segments
  );

  // Create Fresnel shader material
  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      atmosphereColor: { value: new THREE.Color(CONFIG.ATMOSPHERE_COLOR) },
      glowIntensity: { value: CONFIG.ATMOSPHERE_GLOW_INTENSITY },
      fresnelPower: { value: CONFIG.ATMOSPHERE_FRESNEL_POWER },
    },
    vertexShader: getAtmosphereVertexShader(),
    fragmentShader: getAtmosphereFragmentShader(),
    side: THREE.BackSide, // Render inside of sphere for glow effect
    transparent: true,
    blending: THREE.AdditiveBlending, // Accumulates light for glow
    depthWrite: false, // Don't occlude other objects
  });

  const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);

  // Apply Earth's axial tilt to atmosphere
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  atmosphereMesh.rotation.z = tiltRadians;

  scene.add(atmosphereMesh);

  console.log('Atmosphere glow initialized');

  return {
    mesh: atmosphereMesh,
    material: atmosphereMaterial,
    visible: true,
  };
}

/**
 * Syncs atmosphere rotation with Earth's Y-axis rotation.
 *
 * @param atmosphere - Atmosphere state to update
 * @param earthRotationY - Current Earth Y rotation in radians
 */
export function updateAtmosphereRotation(
  atmosphere: AtmosphereState,
  earthRotationY: number
): void {
  atmosphere.mesh.rotation.y = earthRotationY;
}

/**
 * Toggles visibility of the atmospheric glow effect.
 *
 * @param atmosphere - Atmosphere state to update
 * @param visible - Whether the atmosphere should be visible
 */
export function setAtmosphereVisible(
  atmosphere: AtmosphereState,
  visible: boolean
): void {
  atmosphere.mesh.visible = visible;
  atmosphere.visible = visible;
}
