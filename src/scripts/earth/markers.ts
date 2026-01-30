/**
 * City marker system for displaying interactive location markers on Earth.
 *
 * Manages 55+ city markers with tooltips, local time calculation,
 * city search with autocomplete, and user location markers.
 *
 * @module markers
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects, LocationState, CityData, MarkerState, CitySearchState } from './types';
import { calculateSunriseSunset, formatSunTimesForTooltip } from './sunrise';

/**
 * Array of 55+ major world cities with geographic coordinates and UTC timezone offsets.
 * Spans all continents: Europe, North/South America, Asia, Africa, and Oceania.
 */
export const CITIES: CityData[] = [
  // Europe
  { name: 'London', lat: 51.5074, lon: -0.1278, timezone: 0 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, timezone: 1 },
  { name: 'Berlin', lat: 52.52, lon: 13.405, timezone: 1 },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, timezone: 1 },
  { name: 'Rome', lat: 41.9028, lon: 12.4964, timezone: 1 },
  { name: 'Amsterdam', lat: 52.3676, lon: 4.9041, timezone: 1 },
  { name: 'Stockholm', lat: 59.3293, lon: 18.0686, timezone: 1 },
  { name: 'Athens', lat: 37.9838, lon: 23.7275, timezone: 2 },
  { name: 'Istanbul', lat: 41.0082, lon: 28.9784, timezone: 3 },
  { name: 'Moscow', lat: 55.7558, lon: 37.6173, timezone: 3 },
  { name: 'Warsaw', lat: 52.2297, lon: 21.0122, timezone: 1 },
  { name: 'Lisbon', lat: 38.7223, lon: -9.1393, timezone: 0 },
  { name: 'Dublin', lat: 53.3498, lon: -6.2603, timezone: 0 },
  { name: 'Helsinki', lat: 60.1699, lon: 24.9384, timezone: 2 },
  // North America
  { name: 'New York', lat: 40.7128, lon: -74.006, timezone: -5 },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, timezone: -8 },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298, timezone: -6 },
  { name: 'Toronto', lat: 43.6532, lon: -79.3832, timezone: -5 },
  { name: 'Mexico City', lat: 19.4326, lon: -99.1332, timezone: -6 },
  { name: 'Vancouver', lat: 49.2827, lon: -123.1207, timezone: -8 },
  { name: 'Miami', lat: 25.7617, lon: -80.1918, timezone: -5 },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194, timezone: -8 },
  { name: 'Houston', lat: 29.7604, lon: -95.3698, timezone: -6 },
  // South America
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, timezone: -3 },
  { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816, timezone: -3 },
  { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, timezone: -3 },
  { name: 'Lima', lat: -12.0464, lon: -77.0428, timezone: -5 },
  { name: 'Bogotá', lat: 4.711, lon: -74.0721, timezone: -5 },
  { name: 'Santiago', lat: -33.4489, lon: -70.6693, timezone: -4 },
  // Asia
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, timezone: 9 },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074, timezone: 8 },
  { name: 'Shanghai', lat: 31.2304, lon: 121.4737, timezone: 8 },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, timezone: 5.5 },
  { name: 'Delhi', lat: 28.7041, lon: 77.1025, timezone: 5.5 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708, timezone: 4 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198, timezone: 8 },
  { name: 'Hong Kong', lat: 22.3193, lon: 114.1694, timezone: 8 },
  { name: 'Seoul', lat: 37.5665, lon: 126.978, timezone: 9 },
  { name: 'Bangkok', lat: 13.7563, lon: 100.5018, timezone: 7 },
  { name: 'Jakarta', lat: -6.2088, lon: 106.8456, timezone: 7 },
  { name: 'Taipei', lat: 25.033, lon: 121.5654, timezone: 8 },
  { name: 'Riyadh', lat: 24.7136, lon: 46.6753, timezone: 3 },
  { name: 'Tehran', lat: 35.6892, lon: 51.389, timezone: 3.5 },
  { name: 'Karachi', lat: 24.8607, lon: 67.0011, timezone: 5 },
  // Africa
  { name: 'Cairo', lat: 30.0444, lon: 31.2357, timezone: 2 },
  { name: 'Lagos', lat: 6.5244, lon: 3.3792, timezone: 1 },
  { name: 'Nairobi', lat: -1.2921, lon: 36.8219, timezone: 3 },
  { name: 'Johannesburg', lat: -26.2041, lon: 28.0473, timezone: 2 },
  { name: 'Casablanca', lat: 33.5731, lon: -7.5898, timezone: 1 },
  { name: 'Cape Town', lat: -33.9249, lon: 18.4241, timezone: 2 },
  { name: 'Addis Ababa', lat: 9.0054, lon: 38.7636, timezone: 3 },
  // Oceania
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, timezone: 11 },
  { name: 'Melbourne', lat: -37.8136, lon: 144.9631, timezone: 11 },
  { name: 'Auckland', lat: -36.8485, lon: 174.7633, timezone: 13 },
  { name: 'Perth', lat: -31.9505, lon: 115.8605, timezone: 8 },
];

/**
 * Converts latitude/longitude coordinates to a 3D position on a sphere.
 *
 * @param lat - Latitude in degrees (-90 to 90)
 * @param lon - Longitude in degrees (-180 to 180)
 * @param radius - Sphere radius in scene units
 * @returns 3D position vector on the sphere surface
 *
 * @example
 * ```ts
 * const pos = latLonToPosition(51.5, -0.12, 5); // London on radius-5 sphere
 * ```
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
 * Calculates local time for a city based on the time slider position.
 * Converts from the user's local timezone through UTC to the target timezone.
 *
 * @param sliderMinutes - Time slider value in minutes from local midnight (0–1439)
 * @param timezoneOffset - Target city's UTC offset in hours (e.g., -5 for EST)
 * @returns Formatted time string in "HH:MM" format
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
 * Initializes the city marker system with sprites for all cities.
 * Creates a group with Earth's axial tilt and populates it with marker sprites.
 *
 * @param sceneObjects - Core scene objects to add the marker group to
 * @returns Initialized marker state with all city sprites and tooltip element
 */
export function initMarkers(sceneObjects: SceneObjects): MarkerState {
  const markersGroup = new THREE.Group();
  markersGroup.name = 'cityMarkers';

  // Apply Earth's axial tilt to markers group to match Earth rotation
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  markersGroup.rotation.z = tiltRadians;

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
 * Adds or updates the user's location marker on the globe.
 * The user marker is visually distinct (green with ring design).
 *
 * @param markerState - Marker state containing the markers group
 * @param locationState - User's current geolocation coordinates
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
 * Toggles visibility of all city and user markers.
 * Hides the tooltip when markers are hidden.
 *
 * @param markerState - Marker state to update
 * @param visible - Whether markers should be visible
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
 * Handles mouse movement for marker tooltip display and cursor styling.
 * Shows tooltip with city info when hovering over a marker, hides on empty space.
 *
 * @param event - Mouse move event with screen coordinates
 * @param sceneObjects - Scene objects for raycasting
 * @param markerState - Marker state with sprites and tooltip element
 * @param sliderMinutes - Current time slider value for local time calculation
 * @param selectedDate - Currently selected date for sunrise/sunset calculation
 */
export function handleMarkerHover(
  event: MouseEvent,
  sceneObjects: SceneObjects,
  markerState: MarkerState,
  sliderMinutes: number,
  selectedDate?: Date
): void {
  if (!markerState.visible || !markerState.tooltip) return;

  const cityData = detectMarkerAtPosition(event.clientX, event.clientY, sceneObjects, markerState);

  // Get canvas element for cursor styling
  const canvas = document.querySelector('canvas');

  if (cityData) {
    showMarkerTooltip(cityData, event.clientX, event.clientY, markerState, sliderMinutes, selectedDate);

    // Set pointer cursor
    if (canvas) {
      canvas.classList.add('clickable-marker');
    }
  } else {
    hideMarkerTooltip(markerState);

    // Reset cursor
    if (canvas) {
      canvas.classList.remove('clickable-marker');
    }
  }
}

/**
 * Syncs the markers group rotation with the Earth's Y-axis rotation.
 * Should be called each frame to keep markers at correct geographic positions.
 *
 * @param markerState - Marker state with the markers group
 * @param earthRotationY - Current Earth Y rotation in radians
 */
export function updateMarkersRotation(
  markerState: MarkerState,
  earthRotationY: number
): void {
  markerState.markersGroup.rotation.y = earthRotationY;
}

/**
 * Handles click events on city markers using raycasting.
 *
 * @param event - Mouse click event with screen coordinates
 * @param sceneObjects - Scene objects for raycasting
 * @param markerState - Marker state with sprites to test
 * @returns The clicked city's data, or null if no marker was hit
 */
export function handleMarkerClick(
  event: MouseEvent,
  sceneObjects: SceneObjects,
  markerState: MarkerState
): CityData | null {
  if (!markerState.visible) return null;

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
    return cityData || null;
  }

  return null;
}

/**
 * Detects a marker at the given screen coordinates using raycasting.
 * Used by both mouse hover and touch tap handlers.
 *
 * @param clientX - Screen X coordinate in pixels
 * @param clientY - Screen Y coordinate in pixels
 * @param sceneObjects - Scene objects for raycasting
 * @param markerState - Marker state with sprites to test
 * @returns The city data if a marker was found, or null
 */
export function detectMarkerAtPosition(
  clientX: number,
  clientY: number,
  sceneObjects: SceneObjects,
  markerState: MarkerState
): CityData | null {
  if (!markerState.visible) return null;

  const { camera } = sceneObjects;
  const raycaster = new THREE.Raycaster();
  const coords = new THREE.Vector2();

  coords.x = (clientX / window.innerWidth) * 2 - 1;
  coords.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(coords, camera);

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
    return cityData || null;
  }

  return null;
}

/**
 * Shows the marker tooltip at a given screen position with city info.
 * Displays city name, local time, sunrise/sunset times, and a fly-to hint.
 *
 * @param cityData - City data to display in the tooltip
 * @param clientX - Screen X coordinate for tooltip positioning
 * @param clientY - Screen Y coordinate for tooltip positioning
 * @param markerState - Marker state containing the tooltip element
 * @param sliderMinutes - Current time slider value for local time calculation
 * @param selectedDate - Currently selected date for sunrise/sunset calculation
 */
export function showMarkerTooltip(
  cityData: CityData,
  clientX: number,
  clientY: number,
  markerState: MarkerState,
  sliderMinutes: number,
  selectedDate?: Date
): void {
  if (!markerState.tooltip) return;

  const localTime = calculateLocalTime(sliderMinutes, cityData.timezone);
  const isUserLocation = cityData.name === 'Your Location';
  const date = selectedDate ?? new Date();
  const sunTimes = calculateSunriseSunset(cityData.lat, cityData.lon, date, cityData.timezone);
  const sunTimesText = formatSunTimesForTooltip(sunTimes);

  markerState.tooltip.innerHTML = `
    <strong>${cityData.name}</strong>${isUserLocation ? ' 📍' : ''}<br>
    <span style="color: #aaa;">Local time:</span> ${localTime}<br>
    <span style="color: #aaa;">Sun:</span> ${sunTimesText}<br>
    <span style="color: #888; font-size: 11px;">Click to fly to</span>
  `;
  markerState.tooltip.style.display = 'block';
  markerState.tooltip.style.left = `${clientX + 15}px`;
  markerState.tooltip.style.top = `${clientY + 15}px`;
}

/**
 * Hides the marker tooltip.
 *
 * @param markerState - Marker state containing the tooltip element
 */
export function hideMarkerTooltip(markerState: MarkerState): void {
  if (markerState.tooltip) {
    markerState.tooltip.style.display = 'none';
  }
}

/**
 * Searches cities by name with case-insensitive partial matching.
 *
 * @param query - Search query string
 * @returns Array of matching cities (empty for blank queries)
 */
export function searchCities(query: string): CityData[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return CITIES.filter((city) => city.name.toLowerCase().includes(lowerQuery));
}

/**
 * Initializes the city search UI by finding required DOM elements.
 *
 * @returns Search state with DOM references, or null if elements are missing
 */
export function initCitySearch(): CitySearchState | null {
  const input = document.getElementById('citySearch') as HTMLInputElement | null;
  const results = document.getElementById('citySearchResults') as HTMLDivElement | null;
  const clearButton = document.getElementById('citySearchClear') as HTMLButtonElement | null;

  if (!input || !results || !clearButton) return null;

  return {
    input,
    results,
    clearButton,
    debounceTimer: null,
    activeIndex: -1,
  };
}

/**
 * Updates the search results dropdown with matching cities.
 * Shows up to 8 results. Hides dropdown for empty queries.
 *
 * @param searchState - Search UI state with DOM elements
 * @param query - Current search input value
 * @param onSelect - Callback invoked when a result is clicked
 */
export function updateSearchResults(
  searchState: CitySearchState,
  query: string,
  onSelect: (city: CityData) => void
): void {
  const { results, clearButton } = searchState;

  if (!query.trim()) {
    results.style.display = 'none';
    clearButton.style.display = 'none';
    return;
  }

  clearButton.style.display = 'block';
  searchState.activeIndex = -1;
  const matches = searchCities(query);

  if (matches.length === 0) {
    results.innerHTML = '';
    const noResult = document.createElement('div');
    noResult.className = 'city-search-item no-results';
    noResult.textContent = 'No cities found';
    results.appendChild(noResult);
    results.style.display = 'block';
    return;
  }

  results.innerHTML = '';
  for (const city of matches.slice(0, 8)) {
    const item = document.createElement('div');
    item.className = 'city-search-item';
    item.setAttribute('role', 'option');
    item.textContent = city.name;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onSelect(city);
      searchState.input.value = city.name;
      results.style.display = 'none';
    });
    results.appendChild(item);
  }
  results.style.display = 'block';
}

/**
 * Update the active/highlighted item in the search results dropdown
 */
function updateActiveHighlight(searchState: CitySearchState): void {
  const items = searchState.results.querySelectorAll('.city-search-item:not(.no-results)');
  items.forEach((item, i) => {
    const isActive = i === searchState.activeIndex;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-selected', String(isActive));
  });
}

/**
 * Handles keyboard navigation (ArrowUp/Down/Enter) in the city search dropdown.
 *
 * @param key - The pressed key name
 * @param searchState - Search UI state for updating active index
 * @param matches - Currently displayed search results
 * @param onSelect - Callback invoked when Enter selects a city
 * @returns The selected city on Enter, or null for arrow key navigation
 */
export function handleSearchKeydown(
  key: string,
  searchState: CitySearchState,
  matches: CityData[],
  onSelect: (city: CityData) => void
): CityData | null {
  if (key === 'ArrowDown') {
    searchState.activeIndex = Math.min(searchState.activeIndex + 1, matches.length - 1);
    updateActiveHighlight(searchState);
    return null;
  }

  if (key === 'ArrowUp') {
    searchState.activeIndex = Math.max(searchState.activeIndex - 1, 0);
    updateActiveHighlight(searchState);
    return null;
  }

  if (key === 'Enter') {
    if (searchState.activeIndex >= 0 && searchState.activeIndex < matches.length) {
      const city = matches[searchState.activeIndex];
      onSelect(city);
      searchState.input.value = city.name;
      searchState.results.style.display = 'none';
      return city;
    }
    return null;
  }

  return null;
}

/**
 * Clears the search input text, hides results dropdown, and hides clear button.
 *
 * @param searchState - Search UI state to reset
 */
export function clearCitySearch(searchState: CitySearchState): void {
  searchState.input.value = '';
  searchState.results.style.display = 'none';
  searchState.clearButton.style.display = 'none';
}
