import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects, MoonState } from './types';

// Moon constants (scaled relative to Earth)
const MOON_RADIUS = CONFIG.EARTH_RADIUS * 0.2724; // Real ratio: 1737km / 6371km
const MOON_DISTANCE = CONFIG.EARTH_RADIUS * 12; // Compressed from real 60x for visibility
const SYNODIC_PERIOD = 29.530588853; // Days for one full Moon cycle

/**
 * Calculate the Moon's orbital angle (in radians) for a given date.
 * Uses a simplified model based on the synodic period relative to a known new moon.
 * Reference new moon: January 6, 2000 18:14 UTC
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
 * Calculate the Moon's ecliptic longitude offset from the Sun.
 * The Moon orbits ~12.2 degrees per day relative to the stars,
 * but we use the synodic period for phase accuracy.
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

export function setMoonVisible(moonState: MoonState, visible: boolean): void {
  moonState.visible = visible;
  moonState.mesh.visible = visible;
}
