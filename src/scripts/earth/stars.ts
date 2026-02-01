/**
 * Star field background for immersive space environment.
 *
 * Creates a GPU-optimized particle system using instanced buffer geometry
 * with per-star size and brightness variation, rendered in a single draw call.
 *
 * @module stars
 */

import * as THREE from 'three';
import type { SceneObjects } from './types';

/**
 * Configuration for the star field particle system.
 */
export interface StarsConfig {
  /** Number of star particles to generate */
  count: number;
  /** Radius of the sphere on which stars are placed (scene units) */
  radius: number;
  /** Base visual size of each star particle */
  size: number;
  /** Whether star size scales with camera distance */
  sizeAttenuation: boolean;
  /** Minimum random size multiplier for star variation */
  minSizeMultiplier: number;
  /** Maximum random size multiplier for star variation */
  maxSizeMultiplier: number;
}

export const STARS_CONFIG: StarsConfig = {
  count: 5000,
  radius: 400,
  size: 1.5,
  sizeAttenuation: true,
  minSizeMultiplier: 0.3,
  maxSizeMultiplier: 2.5,
};

/**
 * Creates a star field using THREE.Points with InstancedBufferGeometry
 * for GPU-efficient rendering of varying star sizes in a single draw call.
 * Stars are uniformly distributed on a large sphere surrounding the scene.
 * Each star has a randomized size for visual variety (simulating varying brightness).
 *
 * @param sceneObjects - Core scene objects to add the star field to
 * @returns The created Points object representing the star field
 */
export function initStars(sceneObjects: SceneObjects): THREE.Points {
  const { scene } = sceneObjects;

  // Use InstancedBufferGeometry for per-star attributes in a single draw call
  const geometry = new THREE.InstancedBufferGeometry();

  // Base point geometry (single vertex at origin)
  const basePositions = new Float32Array([0, 0, 0]);
  geometry.setAttribute('position', new THREE.BufferAttribute(basePositions, 3));

  // Per-instance star positions (instanced attribute)
  const offsets = new Float32Array(STARS_CONFIG.count * 3);
  // Per-instance star sizes (instanced attribute for varying brightness)
  const sizes = new Float32Array(STARS_CONFIG.count);
  // Per-instance star colors for slight color variation
  const colors = new Float32Array(STARS_CONFIG.count * 3);

  for (let i = 0; i < STARS_CONFIG.count; i++) {
    // Use spherical distribution for even coverage
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    offsets[i * 3] = STARS_CONFIG.radius * Math.sin(phi) * Math.cos(theta);
    offsets[i * 3 + 1] = STARS_CONFIG.radius * Math.sin(phi) * Math.sin(theta);
    offsets[i * 3 + 2] = STARS_CONFIG.radius * Math.cos(phi);

    // Random size multiplier for varying brightness
    const sizeRange = STARS_CONFIG.maxSizeMultiplier - STARS_CONFIG.minSizeMultiplier;
    sizes[i] = STARS_CONFIG.size * (STARS_CONFIG.minSizeMultiplier + Math.random() * sizeRange);

    // Subtle color variation (slightly warm or cool white)
    const warmth = 0.9 + Math.random() * 0.1; // 0.9 to 1.0
    const blueShift = 0.85 + Math.random() * 0.15; // 0.85 to 1.0
    colors[i * 3] = warmth;
    colors[i * 3 + 1] = warmth;
    colors[i * 3 + 2] = blueShift;
  }

  geometry.setAttribute(
    'offset',
    new THREE.InstancedBufferAttribute(offsets, 3)
  );
  geometry.setAttribute(
    'starSize',
    new THREE.InstancedBufferAttribute(sizes, 1)
  );
  geometry.setAttribute(
    'starColor',
    new THREE.InstancedBufferAttribute(colors, 3)
  );

  geometry.instanceCount = STARS_CONFIG.count;

  // Custom shader material for instanced stars (single draw call)
  const material = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute vec3 offset;
      attribute float starSize;
      attribute vec3 starColor;
      varying vec3 vColor;

      void main() {
        vColor = starColor;
        vec4 mvPosition = modelViewMatrix * vec4(offset, 1.0);
        gl_PointSize = starSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;

      void main() {
        // Circular point with soft edge
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = 0.9 * smoothstep(0.5, 0.2, dist);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

  // Create points mesh and add to scene
  const stars = new THREE.Points(geometry, material);
  stars.name = 'stars';
  scene.add(stars);

  console.log(`Stars initialized with ${STARS_CONFIG.count} instanced points (1 draw call)`);

  return stars;
}
