/**
 * Aurora Borealis and Australis visualization.
 *
 * Renders animated aurora effects near the polar regions using custom shaders.
 * Auroras appear as shimmering, colorful light curtains that animate over time
 * and are only visible on the night side of Earth.
 *
 * @module aurora
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { AuroraState, SceneObjects } from './types';

/**
 * Vertex shader for aurora effect.
 * Passes UV coordinates, world position, and normal for fragment shader processing.
 * Applies vertical displacement based on noise for curtain-like waviness.
 */
function getAuroraVertexShader(): string {
  return `
    uniform float time;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
}

/**
 * Fragment shader for aurora effect.
 * Creates animated curtain effect with green/blue/purple color spectrum.
 * Only renders on the night side by checking sun direction dot product.
 */
function getAuroraFragmentShader(): string {
  return `
    uniform float time;
    uniform vec3 sunDirection;
    uniform float opacity;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    // Simple pseudo-noise function
    float hash(float n) {
      return fract(sin(n) * 43758.5453123);
    }

    float noise(float x) {
      float i = floor(x);
      float f = fract(x);
      float a = hash(i);
      float b = hash(i + 1.0);
      return mix(a, b, f * f * (3.0 - 2.0 * f));
    }

    void main() {
      // Check if on night side - auroras only visible in darkness
      vec3 normal = normalize(vNormal);
      float sunDot = dot(normal, sunDirection);

      // Fade aurora from fully visible on dark side to invisible on lit side
      // Use smooth transition in twilight zone
      float nightFactor = smoothstep(0.1, -0.2, sunDot);
      if (nightFactor <= 0.0) {
        discard;
      }

      // Aurora curtain effect using layered sine waves
      float u = vUv.x;
      float v = vUv.y;

      // Create wave pattern along longitude
      float wave1 = sin(u * 20.0 + time * 1.2) * 0.5 + 0.5;
      float wave2 = sin(u * 35.0 - time * 0.8 + 1.5) * 0.5 + 0.5;
      float wave3 = sin(u * 12.0 + time * 2.0 + 3.0) * 0.5 + 0.5;

      // Noise-based variation for organic feel
      float n1 = noise(u * 10.0 + time * 0.5);
      float n2 = noise(u * 15.0 - time * 0.3 + 5.0);

      // Combine waves with noise
      float curtain = wave1 * 0.4 + wave2 * 0.3 + wave3 * 0.2 + n1 * 0.1;

      // Latitude falloff - strongest at band center, fading at edges
      float latFade = 1.0 - abs(v * 2.0 - 1.0);
      latFade = pow(latFade, 1.5);

      // Shimmer effect
      float shimmer = noise(u * 30.0 + time * 3.0) * 0.3 + 0.7;

      // Color gradient: green at base transitioning to blue/purple at top
      vec3 green = vec3(0.2, 1.0, 0.3);
      vec3 blue = vec3(0.1, 0.4, 1.0);
      vec3 purple = vec3(0.6, 0.1, 0.9);

      // Mix colors based on vertical position and wave patterns
      float colorMix = v + wave1 * 0.2 + n2 * 0.15;
      vec3 auroraColor;
      if (colorMix < 0.5) {
        auroraColor = mix(green, blue, colorMix * 2.0);
      } else {
        auroraColor = mix(blue, purple, (colorMix - 0.5) * 2.0);
      }

      // Final alpha combining all factors
      float alpha = curtain * latFade * shimmer * nightFactor * opacity;

      // Boost brightness slightly for vibrance
      auroraColor *= 1.3;

      gl_FragColor = vec4(auroraColor, alpha);
    }
  `;
}

/**
 * Creates a ring geometry representing an aurora band at a specific latitude.
 * The ring is a band on the sphere surface between two latitude angles.
 *
 * @param radius - Sphere radius for the aurora band
 * @param centerLatDeg - Center latitude in degrees
 * @param bandWidthDeg - Width of the band in degrees
 * @param segments - Number of longitudinal segments
 * @param rings - Number of latitudinal subdivisions within the band
 * @returns Buffer geometry for the aurora ring
 */
export function createAuroraBandGeometry(
  radius: number,
  centerLatDeg: number,
  bandWidthDeg: number,
  segments: number,
  rings: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const latMin = ((centerLatDeg - bandWidthDeg / 2) * Math.PI) / 180;
  const latMax = ((centerLatDeg + bandWidthDeg / 2) * Math.PI) / 180;

  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= rings; j++) {
    const latFrac = j / rings;
    const lat = latMin + (latMax - latMin) * latFrac;

    for (let i = 0; i <= segments; i++) {
      const lonFrac = i / segments;
      const lon = lonFrac * Math.PI * 2;

      const x = radius * Math.cos(lat) * Math.cos(lon);
      const y = radius * Math.sin(lat);
      const z = radius * Math.cos(lat) * Math.sin(lon);

      vertices.push(x, y, z);

      // Normal points outward from sphere center
      const nx = Math.cos(lat) * Math.cos(lon);
      const ny = Math.sin(lat);
      const nz = Math.cos(lat) * Math.sin(lon);
      normals.push(nx, ny, nz);

      // UV: u = longitude fraction, v = latitude fraction within band
      uvs.push(lonFrac, latFrac);
    }
  }

  // Build triangle indices
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + segments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return geometry;
}

/**
 * Initializes aurora borealis and australis visualization.
 * Creates two aurora bands at northern and southern polar regions
 * with animated shader effects.
 *
 * @param sceneObjects - Core scene objects to add auroras to
 * @returns Aurora state with meshes, material, and visibility flag
 */
export function initAurora(sceneObjects: SceneObjects): AuroraState {
  const { scene } = sceneObjects;

  const auroraRadius = CONFIG.EARTH_RADIUS + 0.08; // Just above surface
  const segments = 128;
  const rings = 8;

  // Create shared shader material
  const auroraMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      opacity: { value: CONFIG.AURORA_OPACITY },
    },
    vertexShader: getAuroraVertexShader(),
    fragmentShader: getAuroraFragmentShader(),
    side: THREE.FrontSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Northern aurora (Aurora Borealis) at ~67 degrees N
  const northGeometry = createAuroraBandGeometry(
    auroraRadius,
    CONFIG.AURORA_LATITUDE,
    CONFIG.AURORA_BAND_WIDTH,
    segments,
    rings,
  );
  const northMesh = new THREE.Mesh(northGeometry, auroraMaterial);

  // Southern aurora (Aurora Australis) at ~67 degrees S
  const southGeometry = createAuroraBandGeometry(
    auroraRadius,
    -CONFIG.AURORA_LATITUDE,
    CONFIG.AURORA_BAND_WIDTH,
    segments,
    rings,
  );
  const southMesh = new THREE.Mesh(southGeometry, auroraMaterial);

  // Group both auroras and apply Earth's axial tilt
  const group = new THREE.Group();
  group.add(northMesh);
  group.add(southMesh);

  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  group.rotation.z = tiltRadians;

  // Start hidden by default
  group.visible = false;

  scene.add(group);

  console.log('Aurora Borealis and Australis initialized');

  return {
    group,
    northMesh,
    southMesh,
    material: auroraMaterial,
    visible: false,
  };
}

/**
 * Updates aurora animation time and sun direction for night-side rendering.
 *
 * @param aurora - Aurora state to update
 * @param deltaTime - Time elapsed since last frame in seconds
 * @param sunDirX - Sun direction X component
 * @param sunDirY - Sun direction Y component
 * @param sunDirZ - Sun direction Z component
 */
export function updateAurora(
  aurora: AuroraState,
  deltaTime: number,
  sunDirX: number,
  sunDirY: number,
  sunDirZ: number,
): void {
  // Advance animation time
  const currentTime = aurora.material.uniforms.time.value as number;
  aurora.material.uniforms.time.value = currentTime + deltaTime * CONFIG.AURORA_ANIMATION_SPEED;

  // Update sun direction for night-side culling
  aurora.material.uniforms.sunDirection.value.set(sunDirX, sunDirY, sunDirZ);
}

/**
 * Syncs aurora rotation with Earth's Y-axis rotation.
 *
 * @param aurora - Aurora state to update
 * @param earthRotationY - Current Earth Y rotation in radians
 */
export function updateAuroraRotation(aurora: AuroraState, earthRotationY: number): void {
  aurora.group.rotation.y = earthRotationY;
}

/**
 * Toggles visibility of the aurora effect.
 *
 * @param aurora - Aurora state to update
 * @param visible - Whether auroras should be visible
 */
export function setAuroraVisible(aurora: AuroraState, visible: boolean): void {
  aurora.group.visible = visible;
  aurora.visible = visible;
}
