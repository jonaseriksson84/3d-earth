import * as THREE from 'three';
import type { SceneObjects } from './types';

export interface StarsConfig {
  count: number;
  radius: number;
  size: number;
  sizeAttenuation: boolean;
}

const STARS_CONFIG: StarsConfig = {
  count: 5000,
  radius: 400,
  size: 1.5,
  sizeAttenuation: true,
};

/**
 * Creates a star field using THREE.Points for efficient rendering
 * Stars are distributed on a large sphere surrounding the scene
 */
export function initStars(sceneObjects: SceneObjects): THREE.Points {
  const { scene } = sceneObjects;

  // Create geometry with random star positions on a sphere
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STARS_CONFIG.count * 3);

  for (let i = 0; i < STARS_CONFIG.count; i++) {
    // Use spherical distribution for even coverage
    const theta = Math.random() * Math.PI * 2; // Azimuthal angle
    const phi = Math.acos(2 * Math.random() - 1); // Polar angle for uniform distribution

    const x = STARS_CONFIG.radius * Math.sin(phi) * Math.cos(theta);
    const y = STARS_CONFIG.radius * Math.sin(phi) * Math.sin(theta);
    const z = STARS_CONFIG.radius * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Create material with small white points
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: STARS_CONFIG.size,
    sizeAttenuation: STARS_CONFIG.sizeAttenuation,
    transparent: true,
    opacity: 0.9,
  });

  // Create points mesh and add to scene
  const stars = new THREE.Points(geometry, material);
  stars.name = 'stars';
  scene.add(stars);

  console.log(`Stars initialized with ${STARS_CONFIG.count} points`);

  return stars;
}
