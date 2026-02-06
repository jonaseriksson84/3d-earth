/**
 * Custom marker system allowing users to place, edit, and delete
 * their own markers on the globe. Markers persist in localStorage.
 *
 * @module customMarkers
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import { latLonToPosition } from './markers';
import type { CustomMarkerData, CustomMarkerState, MarkerState, SceneObjects } from './types';

/** localStorage key for custom markers */
const STORAGE_KEY = 'earth-custom-markers';

/** Maximum number of custom markers allowed */
const MAX_CUSTOM_MARKERS = 20;

/**
 * Generates a unique ID for a custom marker.
 *
 * @returns A unique string ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Estimates a UTC timezone offset from a longitude value.
 * Uses the simple approximation of 1 hour per 15 degrees.
 *
 * @param lon - Longitude in degrees (-180 to 180)
 * @returns Estimated UTC offset in hours
 */
export function estimateTimezone(lon: number): number {
  return Math.round(lon / 15) || 0;
}

/**
 * Loads custom markers from localStorage.
 *
 * @returns Array of saved custom marker data, or empty array if none
 */
export function loadCustomMarkers(): CustomMarkerData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Validate each marker has required fields
    return parsed.filter(
      (m: unknown): m is CustomMarkerData =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as CustomMarkerData).id === 'string' &&
        typeof (m as CustomMarkerData).label === 'string' &&
        typeof (m as CustomMarkerData).lat === 'number' &&
        typeof (m as CustomMarkerData).lon === 'number' &&
        typeof (m as CustomMarkerData).timezone === 'number',
    );
  } catch {
    return [];
  }
}

/**
 * Saves custom markers to localStorage.
 *
 * @param markers - Array of custom marker data to persist
 */
export function saveCustomMarkers(markers: CustomMarkerData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
  } catch {
    // localStorage may be full or unavailable
    console.warn('Failed to save custom markers to localStorage');
  }
}

/**
 * Creates a custom marker sprite with a distinct visual style (magenta diamond shape).
 *
 * @returns A THREE.Sprite with the custom marker texture
 */
function createCustomMarkerSprite(): THREE.Sprite {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;

  // Diamond shape for custom markers
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.7, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.7, cy);
  ctx.closePath();
  ctx.fillStyle = '#ff66cc';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.3, 0.3, 1);
  return sprite;
}

/**
 * Initializes the custom marker state by loading saved markers from localStorage
 * and creating sprites for each.
 *
 * @param markerState - The main marker state (custom marker sprites are added to its group)
 * @returns Initialized custom marker state
 */
export function initCustomMarkers(markerState: MarkerState): CustomMarkerState {
  const saved = loadCustomMarkers();
  const sprites = new Map<string, THREE.Sprite>();
  const markerRadius = CONFIG.EARTH_RADIUS + 0.05;

  for (const data of saved) {
    const sprite = createCustomMarkerSprite();
    const position = latLonToPosition(data.lat, data.lon, markerRadius);
    sprite.position.copy(position);
    sprite.userData = {
      city: {
        name: data.label,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
      },
      isCustomMarker: true,
      customMarkerId: data.id,
    };
    markerState.markersGroup.add(sprite);
    sprites.set(data.id, sprite);
  }

  return {
    markers: saved,
    sprites,
    placingMode: false,
    maxMarkers: MAX_CUSTOM_MARKERS,
  };
}

/**
 * Toggles the placing mode on or off.
 *
 * @param state - Custom marker state
 * @param active - Whether placing mode should be active
 */
export function setPlacingMode(state: CustomMarkerState, active: boolean): void {
  state.placingMode = active;
  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.classList.toggle('placing-marker', active);
  }
}

/**
 * Converts a screen click position to lat/lon by raycasting onto the Earth sphere.
 *
 * @param clientX - Screen X coordinate
 * @param clientY - Screen Y coordinate
 * @param sceneObjects - Scene objects for raycasting
 * @returns Lat/lon object or null if the click didn't hit the Earth
 */
export function screenToLatLon(
  clientX: number,
  clientY: number,
  sceneObjects: SceneObjects,
): { lat: number; lon: number } | null {
  const { camera, scene } = sceneObjects;
  const raycaster = new THREE.Raycaster();
  const coords = new THREE.Vector2();

  coords.x = (clientX / window.innerWidth) * 2 - 1;
  coords.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(coords, camera);

  // Create a temporary sphere for intersection testing
  const earthSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), CONFIG.EARTH_RADIUS);
  const intersection = new THREE.Vector3();

  const ray = raycaster.ray;
  if (!ray.intersectSphere(earthSphere, intersection)) {
    return null;
  }

  // We need to account for the Earth's rotation. Find the Earth LOD in the scene.
  // The markers group has the same rotation, so we need to undo that rotation
  // to get the lat/lon in geographic coordinates.
  // Since the Earth mesh has rotation.y and rotation.z (tilt), we need to
  // transform the intersection point into the Earth's local frame.

  // Find any object with Earth's rotation info - use inverse of marker group transform
  let earthRotY = 0;
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;

  scene.traverse((obj) => {
    if (obj.name === 'cityMarkers') {
      earthRotY = obj.rotation.y;
    }
  });

  // Undo the Earth's rotation to get geographic coordinates
  // First undo Y rotation, then undo Z tilt
  const invRotation = new THREE.Euler(-0, -earthRotY, -tiltRadians, 'ZYX');
  const localPoint = intersection.clone().applyEuler(invRotation);

  // Convert 3D position back to lat/lon
  const r = localPoint.length();
  const lat = 90 - (Math.acos(localPoint.y / r) * 180) / Math.PI;
  const lon = (Math.atan2(localPoint.z, -localPoint.x) * 180) / Math.PI - 180;

  // Normalize longitude to -180..180
  let normalizedLon = lon;
  if (normalizedLon < -180) normalizedLon += 360;
  if (normalizedLon > 180) normalizedLon -= 360;

  return { lat: Math.round(lat * 100) / 100, lon: Math.round(normalizedLon * 100) / 100 };
}

/**
 * Adds a custom marker at the given lat/lon with a user-provided label.
 *
 * @param state - Custom marker state
 * @param markerState - Main marker state (group for adding sprites)
 * @param lat - Latitude in degrees
 * @param lon - Longitude in degrees
 * @param label - User-defined label for the marker
 * @returns The created marker data, or null if max markers reached
 */
export function addCustomMarker(
  state: CustomMarkerState,
  markerState: MarkerState,
  lat: number,
  lon: number,
  label: string,
): CustomMarkerData | null {
  if (state.markers.length >= state.maxMarkers) {
    return null;
  }

  const id = generateId();
  const timezone = estimateTimezone(lon);
  const data: CustomMarkerData = { id, label, lat, lon, timezone };

  const markerRadius = CONFIG.EARTH_RADIUS + 0.05;
  const sprite = createCustomMarkerSprite();
  const position = latLonToPosition(lat, lon, markerRadius);
  sprite.position.copy(position);
  sprite.userData = {
    city: {
      name: label,
      lat,
      lon,
      timezone,
    },
    isCustomMarker: true,
    customMarkerId: id,
  };
  markerState.markersGroup.add(sprite);

  state.markers.push(data);
  state.sprites.set(id, sprite);
  saveCustomMarkers(state.markers);

  return data;
}

/**
 * Removes a custom marker by ID.
 *
 * @param state - Custom marker state
 * @param markerState - Main marker state (group for removing sprites)
 * @param markerId - The ID of the marker to remove
 * @returns True if the marker was found and removed, false otherwise
 */
export function removeCustomMarker(
  state: CustomMarkerState,
  markerState: MarkerState,
  markerId: string,
): boolean {
  const sprite = state.sprites.get(markerId);
  if (!sprite) return false;

  markerState.markersGroup.remove(sprite);
  sprite.material.dispose();
  if (sprite.material.map) {
    sprite.material.map.dispose();
  }

  state.sprites.delete(markerId);
  state.markers = state.markers.filter((m) => m.id !== markerId);
  saveCustomMarkers(state.markers);

  return true;
}

/**
 * Edits a custom marker's label.
 *
 * @param state - Custom marker state
 * @param markerId - The ID of the marker to edit
 * @param newLabel - The new label to assign
 * @returns True if the marker was found and updated, false otherwise
 */
export function editCustomMarkerLabel(
  state: CustomMarkerState,
  markerId: string,
  newLabel: string,
): boolean {
  const marker = state.markers.find((m) => m.id === markerId);
  const sprite = state.sprites.get(markerId);
  if (!marker || !sprite) return false;

  marker.label = newLabel;
  sprite.userData.city.name = newLabel;
  saveCustomMarkers(state.markers);

  return true;
}

/**
 * Gets the custom marker ID from a sprite's userData, if it is a custom marker.
 *
 * @param sprite - A THREE.Sprite that may be a custom marker
 * @returns The custom marker ID, or null if not a custom marker
 */
export function getCustomMarkerId(sprite: THREE.Object3D): string | null {
  if (sprite.userData?.isCustomMarker) {
    return sprite.userData.customMarkerId as string;
  }
  return null;
}

/**
 * Updates the custom markers list in the UI panel.
 *
 * @param state - Custom marker state
 * @param listElement - DOM element to populate with marker list items
 * @param onDelete - Callback when delete button is clicked
 * @param onEdit - Callback when edit button is clicked
 * @param onFlyTo - Callback when a marker name is clicked
 */
export function updateCustomMarkersList(
  state: CustomMarkerState,
  listElement: HTMLElement,
  onDelete: (id: string) => void,
  onEdit: (id: string) => void,
  onFlyTo: (marker: CustomMarkerData) => void,
): void {
  listElement.innerHTML = '';

  if (state.markers.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'custom-markers-empty';
    emptyMsg.textContent = 'No custom markers yet';
    listElement.appendChild(emptyMsg);
    return;
  }

  for (const marker of state.markers) {
    const item = document.createElement('div');
    item.className = 'custom-marker-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'custom-marker-name';
    nameSpan.textContent = marker.label;
    nameSpan.title = `${marker.lat.toFixed(2)}, ${marker.lon.toFixed(2)} - Click to fly to`;
    nameSpan.addEventListener('click', () => onFlyTo(marker));

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'custom-marker-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'custom-marker-btn custom-marker-edit';
    editBtn.textContent = 'Edit';
    editBtn.title = 'Edit marker label';
    editBtn.setAttribute('aria-label', `Edit marker ${marker.label}`);
    editBtn.addEventListener('click', () => onEdit(marker.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'custom-marker-btn custom-marker-delete';
    deleteBtn.textContent = 'Del';
    deleteBtn.title = 'Delete marker';
    deleteBtn.setAttribute('aria-label', `Delete marker ${marker.label}`);
    deleteBtn.addEventListener('click', () => onDelete(marker.id));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    item.appendChild(nameSpan);
    item.appendChild(actionsDiv);
    listElement.appendChild(item);
  }
}
