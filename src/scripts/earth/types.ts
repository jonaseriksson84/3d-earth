/**
 * Type definitions for the 3D Earth visualization application.
 *
 * This module contains all TypeScript interfaces used across the application,
 * including configuration, scene objects, UI state, and feature-specific types.
 *
 * @module types
 */

import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Application configuration constants for Earth rendering, camera, lighting, and visual effects.
 */
export interface EarthConfig {
  /** Radius of the Earth sphere in scene units */
  EARTH_RADIUS: number;
  /** Radius of the cloud layer sphere, slightly larger than Earth */
  CLOUD_RADIUS: number;
  /** Radius of the atmosphere glow sphere, slightly larger than clouds */
  ATMOSPHERE_RADIUS: number;
  /** Earth's axial tilt in degrees (23.4°) */
  AXIAL_TILT: number;
  /** Number of minutes representing UTC noon (720 = 12:00) */
  UTC_NOON_MINUTES: number;
  /** Total minutes in a day (1440) */
  MINUTES_PER_DAY: number;
  /** Earth rotation rate: degrees per minute (0.25) */
  DEGREES_PER_MINUTE: number;
  /** Time slider increment in minutes */
  SLIDER_STEP: number;
  /** High-quality geometry segment count */
  GEOMETRY_HIGH: number;
  /** Medium-quality geometry segment count */
  GEOMETRY_MEDIUM: number;
  /** Low-quality geometry segment count */
  GEOMETRY_LOW: number;
  /** Segment count for the highest LOD level */
  LOD_HIGH_SEGMENTS: number;
  /** Camera distance threshold for high LOD (0 = closest) */
  LOD_HIGH_DISTANCE: number;
  /** Camera distance threshold for medium LOD */
  LOD_MEDIUM_DISTANCE: number;
  /** Camera distance threshold for low LOD */
  LOD_LOW_DISTANCE: number;
  /** Camera field of view in degrees */
  CAMERA_FOV: number;
  /** Camera near clipping plane distance */
  CAMERA_NEAR: number;
  /** Camera far clipping plane distance */
  CAMERA_FAR: number;
  /** Initial camera distance from Earth center in scene units */
  INITIAL_CAMERA_DISTANCE: number;
  /** Minimum zoom distance (closest the camera can get) */
  MIN_ZOOM_DISTANCE: number;
  /** Maximum zoom distance (farthest the camera can get) */
  MAX_ZOOM_DISTANCE: number;
  /** Ambient light intensity (subtle fill light) */
  AMBIENT_LIGHT_INTENSITY: number;
  /** Directional light (sun) intensity */
  DIRECTIONAL_LIGHT_INTENSITY: number;
  /** Distance of the sun light source from origin */
  SUN_DISTANCE: number;
  /** Cloud layer transparency (0 = invisible, 1 = opaque) */
  CLOUD_OPACITY: number;
  /** Smoothstep range for the day/night shader transition */
  DAY_NIGHT_TRANSITION: {
    /** Lower bound of the smoothstep transition */
    min: number;
    /** Upper bound of the smoothstep transition */
    max: number;
  };
  /** Atmosphere glow color as hex (sky blue) */
  ATMOSPHERE_COLOR: number;
  /** Atmosphere Fresnel glow intensity (0–1) */
  ATMOSPHERE_GLOW_INTENSITY: number;
  /** Fresnel power exponent controlling edge glow sharpness */
  ATMOSPHERE_FRESNEL_POWER: number;
  /** Default longitude in degrees when geolocation is unavailable */
  DEFAULT_LONGITUDE: number;
  /** Default latitude in degrees when geolocation is unavailable */
  DEFAULT_LATITUDE: number;
  /** OrbitControls damping factor for smooth deceleration */
  DAMPING_FACTOR: number;
}

/**
 * Core Three.js scene objects: the scene graph, camera, and WebGL renderer.
 */
export interface SceneObjects {
  /** The Three.js scene graph */
  scene: THREE.Scene;
  /** Perspective camera for viewing the Earth */
  camera: THREE.PerspectiveCamera;
  /** WebGL renderer attached to the DOM */
  renderer: THREE.WebGLRenderer;
}

/**
 * Earth mesh objects including the planet, clouds, and shader material.
 */
export interface EarthObjects {
  /** Earth LOD object containing multiple detail levels */
  earth: THREE.LOD;
  /** Cloud layer LOD object with matching detail levels */
  clouds: THREE.LOD;
  /** Custom shader material for day/night rendering */
  earthMaterial: THREE.ShaderMaterial;
}

/**
 * Scene lighting objects representing ambient fill and directional sunlight.
 */
export interface LightingObjects {
  /** Low-intensity ambient light for shadow fill */
  ambientLight: THREE.AmbientLight;
  /** Directional light simulating the Sun */
  directionalLight: THREE.DirectionalLight;
}

/**
 * Shader uniform values for the Earth day/night material.
 */
export interface EarthUniforms {
  /** Daytime Earth surface texture */
  dayTexture: { value: THREE.Texture };
  /** Nighttime city lights texture */
  nightTexture: { value: THREE.Texture };
  /** Normalized sun direction vector in Earth's local space */
  sunDirection: { value: THREE.Vector3 };
}

/**
 * State for the time slider, date picker, and playback controls.
 */
export interface TimeState {
  /** Time-of-day range slider element */
  timeSlider: HTMLInputElement;
  /** Date picker input element */
  datePicker: HTMLInputElement;
  /** Previous slider value for change detection */
  lastSliderValue: string;
  /** Previous date value for change detection */
  lastDateValue: string;
  /** Flag indicating the sun position needs recalculation */
  needsSunUpdate: boolean;
  /** Cached reference to the time display DOM element */
  timeDisplayElement: HTMLElement | null;
  /** Currently selected date for sun calculations */
  selectedDate: Date;
  /** Whether time playback animation is active */
  isPlaying: boolean;
  /** Playback speed multiplier (1, 10, 60, or 360) */
  playbackSpeed: number;
  /** Timestamp of last playback frame for delta calculation */
  lastPlaybackTime: number;
  /** Precise current time in minutes, used as source of truth during playback */
  currentTime: number;
}

/**
 * User geolocation state containing detected or default coordinates.
 */
export interface LocationState {
  /** User's longitude in degrees (-180 to 180) */
  userLongitude: number;
  /** User's latitude in degrees (-90 to 90) */
  userLatitude: number;
}

/**
 * Data for a city marker including geographic coordinates and timezone.
 */
export interface CityData {
  /** Display name of the city */
  name: string;
  /** Latitude in degrees (-90 to 90) */
  lat: number;
  /** Longitude in degrees (-180 to 180) */
  lon: number;
  /** UTC timezone offset in hours (e.g., -5 for EST, 5.5 for IST) */
  timezone: number;
}

/**
 * State for the city marker system including sprites, tooltip, and visibility.
 */
export interface MarkerState {
  /** Group containing all city marker sprites, rotated with Earth */
  markersGroup: THREE.Group;
  /** Map of city name to its sprite for quick lookup */
  cityMarkers: Map<string, THREE.Sprite>;
  /** Special marker for the user's detected location */
  userMarker: THREE.Sprite | null;
  /** Tooltip DOM element for displaying city info on hover */
  tooltip: HTMLDivElement | null;
  /** Whether markers are currently visible */
  visible: boolean;
}

/**
 * State for Earth reference lines (axis, equator, Arctic/Antarctic circles).
 */
export interface ReferenceLinesState {
  /** Group containing all reference line objects */
  group: THREE.Group;
  /** Whether reference lines are currently visible */
  visible: boolean;
}

/**
 * State for the atmospheric Fresnel glow effect around Earth's limb.
 */
export interface AtmosphereState {
  /** Atmosphere glow mesh (slightly larger than Earth) */
  mesh: THREE.Mesh;
  /** Fresnel shader material controlling the glow */
  material: THREE.ShaderMaterial;
  /** Whether the atmosphere effect is currently visible */
  visible: boolean;
}

/**
 * State for the day/night terminator line visualization.
 */
export interface TerminatorState {
  /** Group containing both the main and glow terminator lines */
  group: THREE.Group;
  /** Primary terminator line (orange/gold) */
  line: THREE.Line;
  /** Background glow line behind the main terminator */
  glowLine: THREE.Line;
  /** Whether the terminator is currently visible */
  visible: boolean;
  /** Radius at which the terminator is rendered (slightly above Earth) */
  radius: number;
}

/**
 * State for the Moon visualization with phase-accurate lighting.
 */
export interface MoonState {
  /** Moon sphere mesh with Lambertian shader */
  mesh: THREE.Mesh;
  /** Shader material with sun direction uniform for phase illumination */
  material: THREE.ShaderMaterial;
  /** Whether the Moon is currently visible */
  visible: boolean;
}

/**
 * Orbital parameters for a satellite used in orbit visualization.
 */
export interface SatelliteData {
  /** Display name of the satellite or orbit type */
  name: string;
  /** Orbital altitude above Earth's surface in kilometers */
  altitudeKm: number;
  /** Orbital inclination in degrees relative to the equator */
  inclination: number;
  /** Orbital period in minutes for one complete orbit */
  periodMinutes: number;
  /** Display color for the orbit line and marker (hex) */
  color: number;
  /** Human-readable description shown in tooltips */
  description: string;
}

/**
 * State for satellite orbit visualization including orbit lines and markers.
 */
export interface SatelliteState {
  /** Group containing all orbit lines and satellite markers */
  group: THREE.Group;
  /** Array of orbit track line objects */
  orbitLines: THREE.Line[];
  /** Array of satellite position marker sprites */
  markers: THREE.Sprite[];
  /** Whether satellite orbits are currently visible */
  visible: boolean;
  /** Tooltip element for satellite info on hover */
  tooltip: HTMLDivElement | null;
}

/**
 * State for the fly-to camera animation when navigating to a city.
 */
export interface FlyToState {
  /** Whether a fly-to animation is currently in progress */
  isAnimating: boolean;
  /** Camera position at the start of the animation */
  startPosition: THREE.Vector3;
  /** Target camera position at the end of the animation */
  endPosition: THREE.Vector3;
  /** Timestamp when the animation started (from performance.now()) */
  startTime: number;
  /** Total animation duration in milliseconds */
  duration: number;
  /** City being flown to, or null when not animating */
  targetCity: CityData | null;
}

/**
 * State for the texture loading overlay with progress tracking and error recovery.
 */
export interface LoadingState {
  /** Loading overlay container element */
  overlay: HTMLElement | null;
  /** Progress bar element showing load percentage */
  progressBar: HTMLElement | null;
  /** Status text element showing percentage */
  statusText: HTMLElement | null;
  /** Loading message text element */
  loadingText: HTMLElement | null;
  /** Error overlay container element */
  errorOverlay: HTMLElement | null;
  /** Error message text element */
  errorMessage: HTMLElement | null;
  /** Retry button element for error recovery */
  retryButton: HTMLElement | null;
  /** Total number of assets being loaded */
  totalItems: number;
  /** Number of assets loaded so far */
  loadedItems: number;
  /** Whether a loading error has occurred */
  hasError: boolean;
}

/**
 * State for the city search autocomplete UI.
 */
export interface CitySearchState {
  /** Search text input element */
  input: HTMLInputElement;
  /** Dropdown results container element */
  results: HTMLDivElement;
  /** Clear/reset button element */
  clearButton: HTMLButtonElement;
  /** Debounce timer for search input (null when idle) */
  debounceTimer: ReturnType<typeof setTimeout> | null;
  /** Index of the currently highlighted result (-1 = no selection) */
  activeIndex: number;
}

/**
 * Top-level application state aggregating all subsystem states.
 */
export interface AppState {
  /** Core scene objects (scene, camera, renderer) */
  scene: SceneObjects | null;
  /** Earth and cloud mesh objects */
  earth: EarthObjects | null;
  /** Scene lighting objects */
  lighting: LightingObjects | null;
  /** OrbitControls for camera interaction */
  controls: OrbitControls | null;
  /** Time slider and playback state */
  time: TimeState;
  /** User geolocation state */
  location: LocationState;
  /** City marker system state */
  markers: MarkerState | null;
}
