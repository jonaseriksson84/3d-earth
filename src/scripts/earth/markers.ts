import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects, LocationState, CityData, MarkerState } from './types';

// Major world cities with coordinates and timezone offsets
export const CITIES: CityData[] = [
  { name: 'London', lat: 51.5074, lon: -0.1278, timezone: 0 },
  { name: 'New York', lat: 40.7128, lon: -74.006, timezone: -5 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, timezone: 9 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, timezone: 11 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708, timezone: 4 },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, timezone: -3 },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, timezone: 5.5 },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074, timezone: 8 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, timezone: 1 },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, timezone: -8 },
  { name: 'Moscow', lat: 55.7558, lon: 37.6173, timezone: 3 },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357, timezone: 2 },
];

/**
 * Convert latitude/longitude to 3D position on sphere
 */
export function latLonToPosition(
  lat: number,
  lon: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Create a circular marker texture using canvas
 */
function createMarkerTexture(
  color: string,
  isUserLocation: boolean = false
): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 4;

  if (isUserLocation) {
    // User location: pulsing ring effect (outer glow)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner filled circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    // City marker: simple filled circle with border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Create a sprite marker for a city
 */
function createMarkerSprite(
  color: string,
  isUserLocation: boolean = false
): THREE.Sprite {
  const texture = createMarkerTexture(color, isUserLocation);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  const scale = isUserLocation ? 0.35 : 0.25;
  sprite.scale.set(scale, scale, 1);

  return sprite;
}

/**
 * Create the tooltip HTML element
 */
function createTooltip(): HTMLDivElement {
  const tooltip = document.createElement('div');
  tooltip.className = 'marker-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: Arial, sans-serif;
    font-size: 13px;
    pointer-events: none;
    display: none;
    z-index: 1000;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  `;
  document.body.appendChild(tooltip);
  return tooltip;
}

/**
 * Calculate local time for a city based on slider position
 */
export function calculateLocalTime(
  sliderMinutes: number,
  timezoneOffset: number
): string {
  // sliderMinutes is local time in the user's timezone
  // We need to convert to UTC first, then to target timezone
  const now = new Date();
  const localOffset = now.getTimezoneOffset(); // in minutes, positive for west of UTC

  // Convert slider time to UTC minutes
  const utcMinutes = sliderMinutes + localOffset;

  // Convert to target timezone
  const targetMinutes = utcMinutes + timezoneOffset * 60;

  // Normalize to 0-1439 range
  let normalizedMinutes = targetMinutes % 1440;
  if (normalizedMinutes < 0) normalizedMinutes += 1440;

  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = Math.floor(normalizedMinutes % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Initialize the marker system
 */
export function initMarkers(sceneObjects: SceneObjects): MarkerState {
  const markersGroup = new THREE.Group();
  markersGroup.name = 'cityMarkers';
  sceneObjects.scene.add(markersGroup);

  const cityMarkers = new Map<string, THREE.Sprite>();
  const markerRadius = CONFIG.EARTH_RADIUS + 0.05;

  // Create city markers
  for (const city of CITIES) {
    const position = latLonToPosition(city.lat, city.lon, markerRadius);
    const marker = createMarkerSprite('#ffcc00');
    marker.position.copy(position);
    marker.userData = { city };
    markersGroup.add(marker);
    cityMarkers.set(city.name, marker);
  }

  const tooltip = createTooltip();

  return {
    markersGroup,
    cityMarkers,
    userMarker: null,
    tooltip,
    visible: true,
  };
}

/**
 * Add or update the user's location marker
 */
export function updateUserMarker(
  markerState: MarkerState,
  locationState: LocationState
): void {
  const markerRadius = CONFIG.EARTH_RADIUS + 0.05;
  const position = latLonToPosition(
    locationState.userLatitude,
    locationState.userLongitude,
    markerRadius
  );

  if (markerState.userMarker) {
    markerState.userMarker.position.copy(position);
  } else {
    const userMarker = createMarkerSprite('#00ff88', true);
    userMarker.position.copy(position);
    userMarker.userData = {
      city: {
        name: 'Your Location',
        lat: locationState.userLatitude,
        lon: locationState.userLongitude,
        timezone: -new Date().getTimezoneOffset() / 60,
      },
    };
    markerState.markersGroup.add(userMarker);
    markerState.userMarker = userMarker;
  }
}

/**
 * Toggle markers visibility
 */
export function setMarkersVisible(
  markerState: MarkerState,
  visible: boolean
): void {
  markerState.visible = visible;
  markerState.markersGroup.visible = visible;
  if (!visible && markerState.tooltip) {
    markerState.tooltip.style.display = 'none';
  }
}

/**
 * Handle mouse move for tooltip display
 */
export function handleMarkerHover(
  event: MouseEvent,
  sceneObjects: SceneObjects,
  markerState: MarkerState,
  sliderMinutes: number
): void {
  if (!markerState.visible || !markerState.tooltip) return;

  const { camera } = sceneObjects;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Get all sprites in the markers group
  const sprites: THREE.Sprite[] = [];
  markerState.markersGroup.traverse((object) => {
    if (object instanceof THREE.Sprite) {
      sprites.push(object);
    }
  });

  const intersects = raycaster.intersectObjects(sprites, false);

  if (intersects.length > 0) {
    const marker = intersects[0].object as THREE.Sprite;
    const cityData = marker.userData.city as CityData;

    if (cityData) {
      const localTime = calculateLocalTime(sliderMinutes, cityData.timezone);
      const isUserLocation = cityData.name === 'Your Location';

      markerState.tooltip.innerHTML = `
        <strong>${cityData.name}</strong>${isUserLocation ? ' 📍' : ''}<br>
        <span style="color: #aaa;">Local time:</span> ${localTime}
      `;
      markerState.tooltip.style.display = 'block';
      markerState.tooltip.style.left = `${event.clientX + 15}px`;
      markerState.tooltip.style.top = `${event.clientY + 15}px`;
    }
  } else {
    markerState.tooltip.style.display = 'none';
  }
}

/**
 * Update markers to rotate with the Earth
 */
export function updateMarkersRotation(
  markerState: MarkerState,
  earthRotationY: number
): void {
  markerState.markersGroup.rotation.y = earthRotationY;
}
