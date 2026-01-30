/**
 * Day/night terminator line visualization.
 *
 * Renders a glowing orange/gold line at the boundary between day and night
 * on Earth's surface. The terminator is computed as the great circle
 * perpendicular to the sun direction vector.
 *
 * @module terminator
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects, TerminatorState } from './types';

const TERMINATOR_COLOR = 0xffaa44; // Orange/gold for sunset transition
const TERMINATOR_GLOW_COLOR = 0xff8822; // Deeper orange for glow line
const TERMINATOR_OPACITY = 0.7;
const TERMINATOR_GLOW_OPACITY = 0.25;
const TERMINATOR_SEGMENTS = 128;

/**
 * Generates points along the terminator great circle.
 * The terminator is the great circle perpendicular to the sun direction,
 * i.e. all points where `dot(surfaceNormal, sunDirection) = 0`.
 *
 * Given a sun direction vector S, constructs two orthonormal vectors
 * U and V in the plane perpendicular to S. The terminator circle is:
 *   `P(t) = R * (cos(t) * U + sin(t) * V)` for t in [0, 2π].
 *
 * @param sunX - X component of the sun direction vector
 * @param sunY - Y component of the sun direction vector
 * @param sunZ - Z component of the sun direction vector
 * @param radius - Radius at which to generate the terminator circle
 * @returns Array of 3D points along the terminator, or empty if sun direction is zero
 */
export function generateTerminatorPoints(
  sunX: number,
  sunY: number,
  sunZ: number,
  radius: number
): THREE.Vector3[] {
  // Normalize sun direction
  const len = Math.sqrt(sunX * sunX + sunY * sunY + sunZ * sunZ);
  if (len < 0.0001) {
    return [];
  }
  const sx = sunX / len;
  const sy = sunY / len;
  const sz = sunZ / len;

  // Find a vector not parallel to sun direction for cross product
  // Use (0,1,0) unless sun is nearly along Y axis
  let upX = 0;
  let upY = 1;
  let upZ = 0;
  if (Math.abs(sy) > 0.9) {
    upX = 1;
    upY = 0;
    upZ = 0;
  }

  // U = normalize(up cross S)
  let ux = upY * sz - upZ * sy;
  let uy = upZ * sx - upX * sz;
  let uz = upX * sy - upY * sx;
  const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
  ux /= uLen;
  uy /= uLen;
  uz /= uLen;

  // V = S cross U (already normalized since S and U are orthonormal)
  const vx = sy * uz - sz * uy;
  const vy = sz * ux - sx * uz;
  const vz = sx * uy - sy * ux;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= TERMINATOR_SEGMENTS; i++) {
    const t = (i / TERMINATOR_SEGMENTS) * Math.PI * 2;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const x = radius * (cosT * ux + sinT * vx);
    const y = radius * (cosT * uy + sinT * vy);
    const z = radius * (cosT * uz + sinT * vz);
    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
}

/**
 * Initializes the terminator line visualization with main and glow lines.
 * Hidden by default; toggle via UI checkbox.
 *
 * @param sceneObjects - Core scene objects to add the terminator to
 * @returns Terminator state with lines, group, and visibility flag
 */
export function initTerminator(
  sceneObjects: SceneObjects
): TerminatorState {
  const { scene } = sceneObjects;
  const radius = CONFIG.EARTH_RADIUS + 0.03; // Slightly above Earth surface

  // Create the main terminator line
  const initialPoints = generateTerminatorPoints(1, 0, 0, radius);
  const geometry = new THREE.BufferGeometry().setFromPoints(initialPoints);
  const material = new THREE.LineBasicMaterial({
    color: TERMINATOR_COLOR,
    transparent: true,
    opacity: TERMINATOR_OPACITY,
  });
  const line = new THREE.Line(geometry, material);

  // Create a wider glow line behind the main line
  const glowGeometry = new THREE.BufferGeometry().setFromPoints(initialPoints);
  const glowMaterial = new THREE.LineBasicMaterial({
    color: TERMINATOR_GLOW_COLOR,
    transparent: true,
    opacity: TERMINATOR_GLOW_OPACITY,
    linewidth: 2, // Note: linewidth > 1 only works on some platforms
  });
  const glowLine = new THREE.Line(glowGeometry, glowMaterial);

  // Group both lines together
  const group = new THREE.Group();
  group.add(glowLine);
  group.add(line);

  // Apply Earth's axial tilt to match Earth's coordinate space
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  group.rotation.z = tiltRadians;

  // Start hidden by default
  group.visible = false;

  scene.add(group);

  return {
    group,
    line,
    glowLine,
    visible: false,
    radius,
  };
}

/**
 * Updates the terminator line geometry based on current sun direction.
 * No-op when the terminator is hidden. Should be called when sun position changes.
 *
 * @param state - Terminator state with line geometries to update
 * @param sunX - X component of the sun direction vector
 * @param sunY - Y component of the sun direction vector
 * @param sunZ - Z component of the sun direction vector
 */
export function updateTerminatorPosition(
  state: TerminatorState,
  sunX: number,
  sunY: number,
  sunZ: number
): void {
  if (!state.visible) return;

  const points = generateTerminatorPoints(sunX, sunY, sunZ, state.radius);
  if (points.length === 0) return;

  // Update main line geometry
  const lineGeo = state.line.geometry as THREE.BufferGeometry;
  lineGeo.setFromPoints(points);
  lineGeo.attributes.position.needsUpdate = true;

  // Update glow line geometry
  const glowGeo = state.glowLine.geometry as THREE.BufferGeometry;
  glowGeo.setFromPoints(points);
  glowGeo.attributes.position.needsUpdate = true;
}

/**
 * Sets visibility of the terminator line.
 *
 * @param state - Terminator state to update
 * @param visible - Whether the terminator should be visible
 */
export function setTerminatorVisible(
  state: TerminatorState,
  visible: boolean
): void {
  state.group.visible = visible;
  state.visible = visible;
}
