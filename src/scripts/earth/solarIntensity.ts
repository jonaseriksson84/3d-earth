/**
 * Sun intensity visualization with subsolar point indicator.
 *
 * Renders a combined visualization showing solar intensity with two components:
 * 1. Subsolar Point Indicator - A spike/line extending from Earth's surface at the
 *    subsolar point (where sun is directly overhead), plus a circular ring on the ground.
 * 2. Solar Intensity Overlay - A translucent heat gradient radiating from the subsolar
 *    point using warm colors (yellow -> orange -> red), fading to fully transparent
 *    toward the terminator. Night side remains transparent.
 *
 * @module solarIntensity
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { SolarIntensityState, SceneObjects } from './types';

/**
 * Vertex shader for the heat gradient overlay.
 * Passes world position and normal to fragment shader for sun direction calculations.
 */
function getHeatGradientVertexShader(): string {
  return `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
}

/**
 * Fragment shader for the heat gradient overlay.
 * Creates a radial gradient from yellow (hottest) to orange to red (edges),
 * fading to transparent near the terminator. Night side is fully transparent.
 */
function getHeatGradientFragmentShader(): string {
  return `
    uniform vec3 subsolarPoint;
    uniform vec3 sunDirection;
    uniform float opacity;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      // Check if on day side - gradient only visible where sun shines
      vec3 normal = normalize(vNormal);
      float sunDot = dot(normal, sunDirection);

      // Fade gradient toward terminator (twilight zone)
      // sunDot = 1.0 at subsolar point, = 0.0 at terminator, negative on night side
      float terminatorFade = smoothstep(-0.05, 0.3, sunDot);
      if (terminatorFade <= 0.0) {
        discard;
      }

      // Calculate angular distance from subsolar point
      // Both vWorldPosition and subsolarPoint are on the sphere surface
      vec3 posNorm = normalize(vWorldPosition);
      vec3 subNorm = normalize(subsolarPoint);
      float cosDist = dot(posNorm, subNorm);
      // Convert to approximate angular distance (radians)
      float angularDist = acos(clamp(cosDist, -1.0, 1.0));

      // Gradient factor: 1.0 at subsolar point, fading to 0.0 at ~90 degrees
      // Use a smooth falloff over the lit hemisphere
      float gradientFactor = 1.0 - smoothstep(0.0, 1.57, angularDist); // 1.57 radians = 90 degrees

      // Skip if too far from subsolar point
      if (gradientFactor <= 0.0) {
        discard;
      }

      // Color gradient: yellow (hot center) -> orange -> red (edges)
      vec3 yellow = vec3(1.0, 1.0, 0.0);
      vec3 orange = vec3(1.0, 0.55, 0.0);
      vec3 red = vec3(1.0, 0.15, 0.0);

      vec3 color;
      if (gradientFactor > 0.6) {
        // Close to subsolar point: yellow to orange
        float t = (gradientFactor - 0.6) / 0.4;
        color = mix(orange, yellow, t);
      } else if (gradientFactor > 0.3) {
        // Mid region: orange
        float t = (gradientFactor - 0.3) / 0.3;
        color = mix(red, orange, t);
      } else {
        // Outer region: red fading out
        color = red;
      }

      // Final alpha combining gradient falloff and terminator fade
      // Use quadratic falloff for more natural appearance
      float alpha = gradientFactor * gradientFactor * terminatorFade * opacity;

      gl_FragColor = vec4(color, alpha);
    }
  `;
}

/**
 * Generates points for the subsolar ground ring (circular footprint).
 *
 * @param sunX - Sun direction X component
 * @param sunY - Sun direction Y component
 * @param sunZ - Sun direction Z component
 * @param radius - Earth radius for positioning
 * @param ringRadius - Angular radius of the ring in radians
 * @param segments - Number of segments for the ring circle
 * @returns Array of Vector3 points forming the ring
 */
export function generateGroundRingPoints(
  sunX: number,
  sunY: number,
  sunZ: number,
  radius: number,
  ringRadius: number,
  segments: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  // Subsolar point (normalized sun direction scaled to radius)
  const sunDir = new THREE.Vector3(sunX, sunY, sunZ).normalize();

  // Create orthonormal basis on the tangent plane at subsolar point
  // Find a vector not parallel to sunDir
  const up = Math.abs(sunDir.y) < 0.9
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);

  const tangent1 = new THREE.Vector3().crossVectors(sunDir, up).normalize();
  const tangent2 = new THREE.Vector3().crossVectors(sunDir, tangent1).normalize();

  // Generate ring points as small circles around the subsolar point
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    // Point on the small circle at angular distance ringRadius from subsolar
    // Using spherical geometry: rotate sunDir by ringRadius radians
    const cosRing = Math.cos(ringRadius);
    const sinRing = Math.sin(ringRadius);

    // Rodrigues rotation formula applied to sphere surface
    const point = new THREE.Vector3()
      .addScaledVector(sunDir, cosRing)
      .addScaledVector(tangent1, sinRing * cosTheta)
      .addScaledVector(tangent2, sinRing * sinTheta)
      .normalize()
      .multiplyScalar(radius);

    points.push(point);
  }

  return points;
}

/**
 * Initializes the sun intensity visualization.
 * Creates the subsolar point spike, ground ring, and heat gradient overlay mesh.
 *
 * @param sceneObjects - Core scene objects to add visualization to
 * @returns Solar intensity state with all components and visibility flag
 */
export function initSolarIntensity(sceneObjects: SceneObjects): SolarIntensityState {
  const { scene } = sceneObjects;

  // Create group to hold all components
  const group = new THREE.Group();

  // Slightly above Earth to prevent z-fighting (same as other overlays)
  const overlayRadius = CONFIG.EARTH_RADIUS + 0.07;

  // === Subsolar Point Spike ===
  // A line extending from Earth surface straight outward
  const spikeGeometry = new THREE.BufferGeometry();
  // Start at Earth surface, extend outward by spike height
  const spikePoints = [
    new THREE.Vector3(overlayRadius, 0, 0),
    new THREE.Vector3(overlayRadius + CONFIG.SOLAR_INTENSITY_SPIKE_HEIGHT, 0, 0),
  ];
  spikeGeometry.setFromPoints(spikePoints);

  const spikeMaterial = new THREE.LineBasicMaterial({
    color: CONFIG.SOLAR_INTENSITY_SPIKE_COLOR,
    linewidth: 2,
    transparent: true,
    opacity: 0.9,
  });
  const spikeLine = new THREE.Line(spikeGeometry, spikeMaterial);

  // === Ground Ring (Circular Footprint) ===
  const ringGeometry = new THREE.BufferGeometry();
  // Initial ring points (will be updated in updateSolarIntensityPosition)
  const initialRingPoints = generateGroundRingPoints(1, 0, 0, overlayRadius, CONFIG.SOLAR_INTENSITY_RING_RADIUS, 64);
  ringGeometry.setFromPoints(initialRingPoints);

  const ringMaterial = new THREE.LineBasicMaterial({
    color: CONFIG.SOLAR_INTENSITY_SPIKE_COLOR,
    linewidth: 2,
    transparent: true,
    opacity: 0.8,
  });
  const groundRing = new THREE.Line(ringGeometry, ringMaterial);

  // === Heat Gradient Overlay ===
  // Use a sphere geometry slightly above Earth
  const gradientGeometry = new THREE.SphereGeometry(overlayRadius, 64, 32);
  const heatGradientMaterial = new THREE.ShaderMaterial({
    uniforms: {
      subsolarPoint: { value: new THREE.Vector3(overlayRadius, 0, 0) },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      opacity: { value: CONFIG.SOLAR_INTENSITY_GRADIENT_OPACITY },
    },
    vertexShader: getHeatGradientVertexShader(),
    fragmentShader: getHeatGradientFragmentShader(),
    side: THREE.FrontSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const heatGradientMesh = new THREE.Mesh(gradientGeometry, heatGradientMaterial);

  // Add all components to group
  group.add(spikeLine);
  group.add(groundRing);
  group.add(heatGradientMesh);

  // Apply Earth's axial tilt
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  group.rotation.z = tiltRadians;

  // Start hidden by default
  group.visible = false;

  scene.add(group);

  console.log('Sun intensity visualization initialized');

  return {
    group,
    spikeLine,
    groundRing,
    heatGradientMesh,
    heatGradientMaterial,
    visible: false,
  };
}

/**
 * Updates the sun intensity visualization position based on sun direction.
 * Repositions the spike, ring, and updates shader uniforms for the heat gradient.
 *
 * @param state - Solar intensity state to update
 * @param sunX - Sun direction X component
 * @param sunY - Sun direction Y component
 * @param sunZ - Sun direction Z component
 */
export function updateSolarIntensityPosition(
  state: SolarIntensityState,
  sunX: number,
  sunY: number,
  sunZ: number
): void {
  const overlayRadius = CONFIG.EARTH_RADIUS + 0.07;

  // Normalize sun direction
  const sunDir = new THREE.Vector3(sunX, sunY, sunZ).normalize();

  // === Update Spike Position ===
  // The spike should point from subsolar point outward
  const spikeStart = sunDir.clone().multiplyScalar(overlayRadius);
  const spikeEnd = sunDir.clone().multiplyScalar(overlayRadius + CONFIG.SOLAR_INTENSITY_SPIKE_HEIGHT);

  const spikePositions = state.spikeLine.geometry.attributes.position as THREE.BufferAttribute;
  spikePositions.setXYZ(0, spikeStart.x, spikeStart.y, spikeStart.z);
  spikePositions.setXYZ(1, spikeEnd.x, spikeEnd.y, spikeEnd.z);
  spikePositions.needsUpdate = true;

  // === Update Ground Ring ===
  const ringPoints = generateGroundRingPoints(
    sunX,
    sunY,
    sunZ,
    overlayRadius,
    CONFIG.SOLAR_INTENSITY_RING_RADIUS,
    64
  );
  const ringGeometry = state.groundRing.geometry;
  const ringPositions = ringGeometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < ringPoints.length && i < ringPositions.count; i++) {
    ringPositions.setXYZ(i, ringPoints[i].x, ringPoints[i].y, ringPoints[i].z);
  }
  ringPositions.needsUpdate = true;

  // === Update Heat Gradient Shader Uniforms ===
  const subsolarPoint = sunDir.clone().multiplyScalar(overlayRadius);
  state.heatGradientMaterial.uniforms.subsolarPoint.value.copy(subsolarPoint);
  state.heatGradientMaterial.uniforms.sunDirection.value.set(sunX, sunY, sunZ);
}

/**
 * Syncs solar intensity visualization rotation with Earth's Y-axis rotation.
 *
 * @param state - Solar intensity state to update
 * @param earthRotationY - Current Earth Y rotation in radians
 */
export function updateSolarIntensityRotation(
  state: SolarIntensityState,
  earthRotationY: number
): void {
  state.group.rotation.y = earthRotationY;
}

/**
 * Toggles visibility of the sun intensity visualization.
 *
 * @param state - Solar intensity state to update
 * @param visible - Whether the visualization should be visible
 */
export function setSolarIntensityVisible(
  state: SolarIntensityState,
  visible: boolean
): void {
  state.group.visible = visible;
  state.visible = visible;
}
