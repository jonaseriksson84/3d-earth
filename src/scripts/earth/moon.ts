/**
 * Moon visualization with orbital position and phase-accurate lighting.
 *
 * Calculates the Moon's position relative to Earth using the synodic period,
 * renders it with a Lambertian shader illuminated by the sun direction,
 * and implements tidal locking (same face always toward Earth).
 *
 * @module moon
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects, MoonState } from './types';

// Moon constants (scaled relative to Earth)
const MOON_RADIUS = CONFIG.EARTH_RADIUS * 0.2724; // Real ratio: 1737km / 6371km
const MOON_DISTANCE = CONFIG.EARTH_RADIUS * 12; // Compressed from real 60x for visibility
const SYNODIC_PERIOD = 29.530588853; // Days for one full Moon cycle

/**
 * Calculates the Moon's orbital phase angle for a given date.
 * Uses a simplified model based on the synodic period (29.53 days)
 * relative to a known new moon reference (January 6, 2000 18:14 UTC).
 *
 * @param date - The date to calculate the phase angle for
 * @returns Phase angle in radians (0 = new moon, π = full moon)
 */
export function calculateMoonPhaseAngle(date: Date): number {
  const referenceNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const currentTime = date.getTime();
  const daysSinceRef = (currentTime - referenceNewMoon) / (1000 * 60 * 60 * 24);
  const phase = (daysSinceRef % SYNODIC_PERIOD) / SYNODIC_PERIOD;
  // Convert phase (0-1) to orbital angle (0 to 2*PI)
  // Phase 0 = new moon (Moon between Earth and Sun)
  return phase * 2 * Math.PI;
}

/**
 * Calculates the Moon's 3D position relative to Earth based on the current date
 * and sun direction. Applies a 5.14° orbital inclination.
 *
 * @param date - The date to calculate position for
 * @param sunDirX - X component of the normalized sun direction
 * @param sunDirY - Y component of the normalized sun direction
 * @param sunDirZ - Z component of the normalized sun direction
 * @returns Moon position in scene coordinates
 */
export function calculateMoonPosition(
  date: Date,
  sunDirX: number,
  sunDirY: number,
  sunDirZ: number
): { x: number; y: number; z: number } {
  const phaseAngle = calculateMoonPhaseAngle(date);

  // Moon's orbital inclination to ecliptic is ~5.14 degrees
  const orbitalInclination = 5.14 * (Math.PI / 180);

  // Sun direction defines the Sun-Earth line
  // Moon orbits around Earth; at phase 0 (new moon) it's roughly toward the Sun
  // At phase 0.5 (full moon) it's opposite the Sun
  const sunDir = new THREE.Vector3(sunDirX, sunDirY, sunDirZ).normalize();

  // Build a coordinate frame from the sun direction
  // "up" is roughly Y-axis but we need a perpendicular
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, sunDir).normalize();
  // If sunDir is nearly parallel to up, use a fallback
  if (right.lengthSq() < 0.001) {
    right.set(1, 0, 0);
  }
  const perpUp = new THREE.Vector3().crossVectors(sunDir, right).normalize();

  // Moon position in the orbital plane
  // phaseAngle=0 -> new moon (toward sun), phaseAngle=PI -> full moon (away from sun)
  const cosA = Math.cos(phaseAngle);
  const sinA = Math.sin(phaseAngle);

  // Apply slight orbital inclination
  const cosInc = Math.cos(orbitalInclination);
  const sinInc = Math.sin(orbitalInclination);

  // Position in Sun-Earth coordinate frame
  const x =
    MOON_DISTANCE * (cosA * sunDir.x + sinA * cosInc * right.x + sinA * sinInc * perpUp.x);
  const y =
    MOON_DISTANCE * (cosA * sunDir.y + sinA * cosInc * right.y + sinA * sinInc * perpUp.y);
  const z =
    MOON_DISTANCE * (cosA * sunDir.z + sinA * cosInc * right.z + sinA * sinInc * perpUp.z);

  return { x, y, z };
}

function getMoonVertexShader(): string {
  return `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;
}

function getMoonFragmentShader(): string {
  return `
    uniform vec3 sunDirection;
    uniform vec3 moonColor;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      // Lambertian lighting from sun direction
      vec3 sunDir = normalize(sunDirection);
      float light = max(dot(vNormal, sunDir), 0.0);

      // Slight ambient so the dark side isn't completely black
      float ambient = 0.05;
      float finalLight = ambient + light * 0.95;

      gl_FragColor = vec4(moonColor * finalLight, 1.0);
    }
  `;
}

/**
 * Initializes the Moon mesh with a Lambertian shader for phase illumination.
 * Hidden by default; toggle via UI checkbox.
 *
 * @param sceneObjects - Core scene objects to add the Moon to
 * @returns Moon state with mesh, shader material, and visibility flag
 */
export function initMoon(sceneObjects: SceneObjects): MoonState {
  const { scene } = sceneObjects;

  const geometry = new THREE.SphereGeometry(MOON_RADIUS, 32, 32);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      moonColor: { value: new THREE.Vector3(0.75, 0.73, 0.7) }, // Slightly warm gray
    },
    vertexShader: getMoonVertexShader(),
    fragmentShader: getMoonFragmentShader(),
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false; // Hidden by default, toggled via UI
  scene.add(mesh);

  return {
    mesh,
    material,
    visible: false,
  };
}

/**
 * Updates the Moon's position and phase lighting based on the current date and sun direction.
 * Implements tidal locking by orienting the Moon toward Earth's center.
 *
 * @param moonState - Moon state with mesh and shader to update
 * @param date - Current date for orbital position calculation
 * @param sunDirX - X component of the sun direction for phase lighting
 * @param sunDirY - Y component of the sun direction for phase lighting
 * @param sunDirZ - Z component of the sun direction for phase lighting
 */
export function updateMoonPosition(
  moonState: MoonState,
  date: Date,
  sunDirX: number,
  sunDirY: number,
  sunDirZ: number
): void {
  const pos = calculateMoonPosition(date, sunDirX, sunDirY, sunDirZ);
  moonState.mesh.position.set(pos.x, pos.y, pos.z);

  // Update sun direction uniform for phase lighting
  moonState.material.uniforms.sunDirection.value.set(sunDirX, sunDirY, sunDirZ);

  // Tidal locking: Moon always faces Earth (at origin)
  moonState.mesh.lookAt(0, 0, 0);
}

/**
 * Sets visibility of the Moon mesh.
 *
 * @param moonState - Moon state to update
 * @param visible - Whether the Moon should be visible
 */
export function setMoonVisible(moonState: MoonState, visible: boolean): void {
  moonState.visible = visible;
  moonState.mesh.visible = visible;
}
