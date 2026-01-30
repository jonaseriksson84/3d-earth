/**
 * Satellite orbit visualization with ISS, GPS, and Geostationary tracking.
 *
 * Renders orbital track lines and animated satellite position markers
 * using simplified circular orbit models with inclination and RAAN precession.
 *
 * @module satellites
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects, SatelliteState, SatelliteData } from './types';

// Satellite orbital data
// ISS: ~408km altitude, 51.6° inclination, ~92.68 min period
// GPS: ~20,200km altitude, 55° inclination, ~11h58m period
// Geostationary: 35,786km altitude, 0° inclination, 24h period

const KM_PER_EARTH_UNIT = 6371 / CONFIG.EARTH_RADIUS; // Earth radius in km / radius in scene units

function altitudeToSceneRadius(altitudeKm: number): number {
  return (6371 + altitudeKm) / KM_PER_EARTH_UNIT;
}

/**
 * Predefined satellite orbital data for ISS, GPS, and Geostationary orbits.
 */
export const SATELLITES: SatelliteData[] = [
  {
    name: 'ISS',
    altitudeKm: 408,
    inclination: 51.6,
    periodMinutes: 92.68,
    color: 0xff4444,
    description: 'International Space Station (~408 km)',
  },
  {
    name: 'GPS Orbit',
    altitudeKm: 20200,
    inclination: 55,
    periodMinutes: 718,
    color: 0x44ff44,
    description: 'GPS Satellite Orbit (~20,200 km)',
  },
  {
    name: 'Geostationary',
    altitudeKm: 35786,
    inclination: 0,
    periodMinutes: 1436,
    color: 0x4488ff,
    description: 'Geostationary Orbit (~35,786 km)',
  },
];

/**
 * Calculates a satellite's 3D position along its circular orbit.
 * Applies orbital inclination and RAAN (Right Ascension of Ascending Node) precession.
 *
 * @param satellite - Satellite orbital parameters
 * @param timeMinutes - Current time of day in minutes (0–1439)
 * @param dayOfYear - Day of year (1–366) for RAAN calculation
 * @returns Satellite position in scene coordinates
 */
export function calculateSatellitePosition(
  satellite: SatelliteData,
  timeMinutes: number,
  dayOfYear: number
): { x: number; y: number; z: number } {
  const radius = altitudeToSceneRadius(satellite.altitudeKm);
  const inclinationRad = satellite.inclination * (Math.PI / 180);

  // Total elapsed minutes since start of year for orbital position
  const totalMinutes = dayOfYear * 1440 + timeMinutes;

  // Orbital angle based on period
  const orbitalAngle = ((totalMinutes % satellite.periodMinutes) / satellite.periodMinutes) * 2 * Math.PI;

  // Right ascension of ascending node (RAAN) - rotates slowly over time
  // Use a simplified precession based on day of year
  const raanAngle = (dayOfYear / 365.25) * 2 * Math.PI;

  // Position in equatorial plane (XZ plane, Y is up)
  const xOrbit = radius * Math.cos(orbitalAngle);
  const zOrbit = radius * Math.sin(orbitalAngle);

  // Apply inclination (rotate around X axis, tilts orbit out of equatorial plane)
  const xInclined = xOrbit;
  const yInclined = zOrbit * Math.sin(inclinationRad);
  const zInclined = zOrbit * Math.cos(inclinationRad);

  // Apply RAAN (rotate around Y axis)
  const x = xInclined * Math.cos(raanAngle) + zInclined * Math.sin(raanAngle);
  const y = yInclined;
  const z = -xInclined * Math.sin(raanAngle) + zInclined * Math.cos(raanAngle);

  return { x, y, z };
}

/**
 * Generates 3D points forming a complete orbital track line.
 *
 * @param satellite - Satellite orbital parameters (altitude and inclination)
 * @param segments - Number of line segments (default: 128)
 * @returns Array of 3D points forming a closed orbit loop
 */
export function generateOrbitPoints(
  satellite: SatelliteData,
  segments: number = 128
): THREE.Vector3[] {
  const radius = altitudeToSceneRadius(satellite.altitudeKm);
  const inclinationRad = satellite.inclination * (Math.PI / 180);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;

    // Position in equatorial plane (XZ plane, Y is up)
    const xOrbit = radius * Math.cos(angle);
    const zOrbit = radius * Math.sin(angle);

    // Apply inclination (rotate around X axis, tilts orbit out of equatorial plane)
    const x = xOrbit;
    const y = zOrbit * Math.sin(inclinationRad);
    const z = zOrbit * Math.cos(inclinationRad);

    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
}

function createSatelliteMarkerTexture(color: number): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.Texture();
  }

  const hexColor = '#' + color.toString(16).padStart(6, '0');

  // Outer glow
  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, Math.PI * 2);
  ctx.fillStyle = hexColor;
  ctx.globalAlpha = 0.3;
  ctx.fill();

  // Inner dot
  ctx.beginPath();
  ctx.arc(16, 16, 5, 0, Math.PI * 2);
  ctx.fillStyle = hexColor;
  ctx.globalAlpha = 1.0;
  ctx.fill();

  // White center
  ctx.beginPath();
  ctx.arc(16, 16, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Initializes satellite orbit lines and position markers for all satellites.
 * Hidden by default; toggle via UI checkbox.
 *
 * @param sceneObjects - Core scene objects to add the satellite group to
 * @returns Satellite state with orbit lines, markers, and visibility flag
 */
export function initSatellites(sceneObjects: SceneObjects): SatelliteState {
  const { scene } = sceneObjects;
  const group = new THREE.Group();
  const orbitLines: THREE.Line[] = [];
  const markers: THREE.Sprite[] = [];

  for (const satellite of SATELLITES) {
    // Create orbit track line
    const orbitPoints = generateOrbitPoints(satellite);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: satellite.color,
      transparent: true,
      opacity: 0.35,
    });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    orbitLines.push(orbitLine);
    group.add(orbitLine);

    // Create satellite marker sprite
    const texture = createSatelliteMarkerTexture(satellite.color);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Scale marker based on altitude (closer = smaller, farther = bigger for visibility)
    const scale = Math.max(0.3, Math.min(1.5, satellite.altitudeKm / 20000));
    sprite.scale.set(scale, scale, 1);
    sprite.userData = { satelliteName: satellite.name, satelliteData: satellite };

    markers.push(sprite);
    group.add(sprite);
  }

  // Apply Earth's axial tilt
  const tiltRad = CONFIG.AXIAL_TILT * (Math.PI / 180);
  group.rotation.z = tiltRad;

  group.visible = false; // Hidden by default
  scene.add(group);

  return {
    group,
    orbitLines,
    markers,
    visible: false,
    tooltip: null,
  };
}

/**
 * Updates all satellite marker positions along their orbits and rotates orbit lines.
 *
 * @param state - Satellite state with markers and orbit lines
 * @param timeMinutes - Current time of day in minutes
 * @param dayOfYear - Day of year for RAAN calculation
 */
export function updateSatellitePositions(
  state: SatelliteState,
  timeMinutes: number,
  dayOfYear: number
): void {
  for (let i = 0; i < SATELLITES.length; i++) {
    const satellite = SATELLITES[i];
    const marker = state.markers[i];
    const pos = calculateSatellitePosition(satellite, timeMinutes, dayOfYear);
    marker.position.set(pos.x, pos.y, pos.z);

    // Rotate orbit lines based on RAAN
    const raanAngle = (dayOfYear / 365.25) * 2 * Math.PI;
    state.orbitLines[i].rotation.y = raanAngle;
  }
}

/**
 * Syncs the satellite group rotation with Earth's Y-axis rotation.
 *
 * @param state - Satellite state with group to rotate
 * @param earthRotationY - Current Earth Y rotation in radians
 */
export function updateSatellitesRotation(state: SatelliteState, earthRotationY: number): void {
  state.group.rotation.y = earthRotationY;
}

/**
 * Sets visibility of all satellite orbit lines and markers.
 *
 * @param state - Satellite state to update
 * @param visible - Whether satellites should be visible
 */
export function setSatellitesVisible(state: SatelliteState, visible: boolean): void {
  state.visible = visible;
  state.group.visible = visible;
}

/**
 * Handles mouse hover over satellite markers using raycasting.
 *
 * @param event - Mouse move event with screen coordinates
 * @param sceneObjects - Scene objects for raycasting
 * @param state - Satellite state with markers to test
 * @returns Satellite description text if hovering a marker, or null
 */
export function handleSatelliteHover(
  event: MouseEvent,
  sceneObjects: SceneObjects,
  state: SatelliteState
): string | null {
  if (!state.visible) return null;

  const { camera } = sceneObjects;
  const rect = sceneObjects.renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Check intersections with satellite markers
  const intersects = raycaster.intersectObjects(state.markers);
  if (intersects.length > 0) {
    const hitSprite = intersects[0].object;
    const data = hitSprite.userData.satelliteData as SatelliteData;
    return data.description;
  }

  return null;
}
