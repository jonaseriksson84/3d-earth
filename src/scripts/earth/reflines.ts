/**
 * Reference line visualization for Earth's axis and latitude circles.
 *
 * Renders semi-transparent lines for the rotational axis, equator,
 * Arctic Circle, and Antarctic Circle.
 *
 * @module reflines
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects, ReferenceLinesState } from './types';

const AXIS_COLOR = 0x00aaff; // Blue for axis
const EQUATOR_COLOR = 0xffaa00; // Orange for equator
const ARCTIC_COLOR = 0x88ff88; // Green for arctic/antarctic circles
const LINE_OPACITY = 0.4;
const AXIS_LENGTH_MULTIPLIER = 1.8; // Extend axis beyond Earth surface

// Arctic/Antarctic circles at 66.5 degrees latitude
const ARCTIC_LATITUDE = 66.5;

/**
 * Creates a circle geometry for latitude lines
 */
function createLatitudeCircle(
  latitude: number,
  color: number,
  radius: number
): THREE.Line {
  const latRad = (latitude * Math.PI) / 180;
  const circleRadius = radius * Math.cos(latRad);
  const circleY = radius * Math.sin(latRad);

  const points: THREE.Vector3[] = [];
  const segments = 64;

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = circleRadius * Math.cos(theta);
    const z = circleRadius * Math.sin(theta);
    points.push(new THREE.Vector3(x, circleY, z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: LINE_OPACITY,
  });

  return new THREE.Line(geometry, material);
}

/**
 * Creates the axis line through the poles
 */
function createAxisLine(radius: number): THREE.Line {
  const axisLength = radius * AXIS_LENGTH_MULTIPLIER;
  const points = [
    new THREE.Vector3(0, -axisLength, 0),
    new THREE.Vector3(0, axisLength, 0),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: AXIS_COLOR,
    transparent: true,
    opacity: LINE_OPACITY + 0.1, // Slightly more visible
  });

  return new THREE.Line(geometry, material);
}

/**
 * Initializes reference lines including the rotational axis, equator,
 * Arctic Circle (66.5°N), and Antarctic Circle (66.5°S).
 * Lines are hidden by default and share Earth's axial tilt.
 *
 * @param sceneObjects - Core scene objects to add reference lines to
 * @returns Reference lines state with group and visibility flag
 */
export function initReferenceLines(
  sceneObjects: SceneObjects
): ReferenceLinesState {
  const { scene } = sceneObjects;
  // Radius above cloud layer (5.05) so reference lines render on top of clouds
  const radius = CONFIG.EARTH_RADIUS + 0.06;

  // Create a group to hold all reference lines
  const group = new THREE.Group();

  // Create axis line
  const axisLine = createAxisLine(CONFIG.EARTH_RADIUS);
  group.add(axisLine);

  // Create equator (0 degrees latitude)
  const equator = createLatitudeCircle(0, EQUATOR_COLOR, radius);
  group.add(equator);

  // Create Arctic Circle (66.5 degrees N)
  const arcticCircle = createLatitudeCircle(ARCTIC_LATITUDE, ARCTIC_COLOR, radius);
  group.add(arcticCircle);

  // Create Antarctic Circle (66.5 degrees S)
  const antarcticCircle = createLatitudeCircle(-ARCTIC_LATITUDE, ARCTIC_COLOR, radius);
  group.add(antarcticCircle);

  // Apply Earth's axial tilt to the reference lines group
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  group.rotation.z = tiltRadians;

  // Start hidden by default
  group.visible = false;

  scene.add(group);

  return {
    group,
    visible: false,
  };
}

/**
 * Syncs reference lines rotation with Earth's Y-axis rotation.
 *
 * @param state - Reference lines state to update
 * @param earthRotationY - Current Earth Y rotation in radians
 */
export function updateReferenceLinesRotation(
  state: ReferenceLinesState,
  earthRotationY: number
): void {
  state.group.rotation.y = earthRotationY;
}

/**
 * Sets visibility of all reference lines.
 *
 * @param state - Reference lines state to update
 * @param visible - Whether reference lines should be visible
 */
export function setReferenceLinesVisible(
  state: ReferenceLinesState,
  visible: boolean
): void {
  state.group.visible = visible;
  state.visible = visible;
}
