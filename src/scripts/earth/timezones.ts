/**
 * Timezone boundary visualization on the globe.
 *
 * Renders semi-transparent meridian lines at 15-degree intervals representing
 * standard timezone boundaries. The UTC/prime meridian is highlighted in red.
 * Hovering over a region shows the timezone name and UTC offset.
 *
 * @module timezones
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects, TimezoneState } from './types';

/**
 * Standard timezone data for labeling and color coding.
 * Each entry maps a UTC offset to a display name.
 */
interface TimezoneInfo {
  /** UTC offset in hours (-12 to +12) */
  offset: number;
  /** Longitude of the timezone meridian in degrees */
  longitude: number;
  /** Display label (e.g., "UTC+5") */
  label: string;
}

/**
 * Generates timezone info for all 25 standard meridians (-12 to +12).
 *
 * @returns Array of timezone info objects
 */
export function getTimezoneInfos(): TimezoneInfo[] {
  const infos: TimezoneInfo[] = [];
  for (let offset = -12; offset <= 12; offset++) {
    const longitude = offset * 15;
    const label = offset === 0 ? 'UTC' : `UTC${offset > 0 ? '+' : ''}${offset}`;
    infos.push({ offset, longitude, label });
  }
  return infos;
}

/**
 * Creates a meridian line at a given longitude, running from pole to pole.
 *
 * @param longitude - Longitude in degrees (-180 to 180)
 * @param color - Line color as hex number
 * @param opacity - Line opacity (0-1)
 * @param radius - Sphere radius for the line
 * @param segments - Number of latitude segments
 * @returns A THREE.Line representing the meridian
 */
function createMeridianLine(
  longitude: number,
  color: number,
  opacity: number,
  radius: number,
  segments: number
): THREE.Line {
  const lonRad = (longitude * Math.PI) / 180;
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    // Latitude from -90 to +90
    const lat = -90 + (180 * i) / segments;
    const latRad = (lat * Math.PI) / 180;

    const x = radius * Math.cos(latRad) * Math.sin(lonRad);
    const y = radius * Math.sin(latRad);
    const z = radius * Math.cos(latRad) * Math.cos(lonRad);
    points.push(new THREE.Vector3(x, y, z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });

  const line = new THREE.Line(geometry, material);
  // Store timezone offset in userData for hover detection
  const offset = Math.round(longitude / 15);
  line.userData = { timezoneOffset: offset, longitude };
  return line;
}

/**
 * Initializes timezone boundary lines on the globe.
 * Creates 25 meridian lines at 15-degree intervals (-180 to +180).
 * The UTC/prime meridian (0 degrees) is highlighted in red.
 * Lines are hidden by default and share Earth's axial tilt.
 *
 * @param sceneObjects - Core scene objects to add timezone lines to
 * @returns Timezone state with group, lines, and visibility flag
 */
export function initTimezones(sceneObjects: SceneObjects): TimezoneState {
  const { scene } = sceneObjects;
  // Radius above cloud layer (5.05) so timezone lines render on top of clouds
  const radius = CONFIG.EARTH_RADIUS + 0.06;
  const group = new THREE.Group();
  const lines: THREE.Line[] = [];

  const infos = getTimezoneInfos();

  for (const info of infos) {
    const isUTC = info.offset === 0;
    const color = isUTC ? CONFIG.TIMEZONE_UTC_COLOR : CONFIG.TIMEZONE_LINE_COLOR;
    const opacity = isUTC
      ? CONFIG.TIMEZONE_LINE_OPACITY + 0.2
      : CONFIG.TIMEZONE_LINE_OPACITY;

    const line = createMeridianLine(
      info.longitude,
      color,
      opacity,
      radius,
      CONFIG.TIMEZONE_SEGMENTS
    );
    line.userData.label = info.label;
    group.add(line);
    lines.push(line);
  }

  // Apply Earth's axial tilt
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  group.rotation.z = tiltRadians;

  // Hidden by default
  group.visible = false;

  scene.add(group);

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'timezone-tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  return {
    group,
    lines,
    visible: false,
    tooltip,
  };
}

/**
 * Syncs timezone boundaries rotation with Earth's Y-axis rotation.
 *
 * @param state - Timezone state to update
 * @param earthRotationY - Current Earth Y rotation in radians
 */
export function updateTimezonesRotation(
  state: TimezoneState,
  earthRotationY: number
): void {
  state.group.rotation.y = earthRotationY;
}

/**
 * Sets visibility of all timezone boundary lines.
 *
 * @param state - Timezone state to update
 * @param visible - Whether timezone boundaries should be visible
 */
export function setTimezonesVisible(
  state: TimezoneState,
  visible: boolean
): void {
  state.group.visible = visible;
  state.visible = visible;
  if (!visible && state.tooltip) {
    state.tooltip.style.display = 'none';
  }
}

/**
 * Handles mouse hover over the globe to display timezone info in tooltip.
 * Uses raycasting to determine which timezone region the cursor is over.
 *
 * @param event - Mouse event with screen coordinates
 * @param sceneObjects - Scene objects for raycasting
 * @param state - Timezone state with lines and tooltip
 * @param sliderMinutes - Current time slider value in minutes
 */
export function handleTimezoneHover(
  event: MouseEvent,
  sceneObjects: SceneObjects,
  state: TimezoneState,
  sliderMinutes: number
): void {
  if (!state.visible || !state.tooltip) return;

  const { camera, renderer } = sceneObjects;
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Raycast against a sphere to find the point on the globe
  const sphereGeom = new THREE.SphereGeometry(CONFIG.EARTH_RADIUS, 32, 32);
  const sphereMesh = new THREE.Mesh(sphereGeom, new THREE.MeshBasicMaterial());
  sphereMesh.rotation.z = state.group.rotation.z;
  sphereMesh.rotation.y = state.group.rotation.y;

  const intersects = raycaster.intersectObject(sphereMesh);
  sphereGeom.dispose();

  if (intersects.length === 0) {
    state.tooltip.style.display = 'none';
    return;
  }

  // Get the intersection point in world space, then convert to local coordinates
  const worldPoint = intersects[0].point;

  // Reverse the group rotation to get the geographic position
  const inverseMatrix = new THREE.Matrix4();
  inverseMatrix.copy(state.group.matrixWorld).invert();
  const localPoint = worldPoint.clone().applyMatrix4(inverseMatrix);

  // Convert to lat/lon
  const r = localPoint.length();
  const lat = Math.asin(localPoint.y / r) * (180 / Math.PI);
  const lon = Math.atan2(localPoint.x, localPoint.z) * (180 / Math.PI);

  // Determine timezone offset from longitude
  const tzOffset = Math.round(lon / 15);
  const clampedOffset = Math.max(-12, Math.min(12, tzOffset));
  const label = clampedOffset === 0 ? 'UTC' : `UTC${clampedOffset > 0 ? '+' : ''}${clampedOffset}`;

  // Calculate local time in this timezone
  const utcMinutes = sliderMinutes;
  const localMinutes = ((utcMinutes + clampedOffset * 60) % 1440 + 1440) % 1440;
  const hours = Math.floor(localMinutes / 60);
  const mins = localMinutes % 60;
  const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

  state.tooltip.textContent = `${label} · ${timeStr} · ${lat.toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
  state.tooltip.style.display = 'block';
  state.tooltip.style.left = `${event.clientX + 12}px`;
  state.tooltip.style.top = `${event.clientY - 28}px`;
}
