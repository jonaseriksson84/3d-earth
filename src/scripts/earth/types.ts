import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface EarthConfig {
  EARTH_RADIUS: number;
  CLOUD_RADIUS: number;
  ATMOSPHERE_RADIUS: number;
  AXIAL_TILT: number;
  UTC_NOON_MINUTES: number;
  MINUTES_PER_DAY: number;
  DEGREES_PER_MINUTE: number;
  SLIDER_STEP: number;
  GEOMETRY_HIGH: number;
  GEOMETRY_MEDIUM: number;
  GEOMETRY_LOW: number;
  LOD_HIGH_SEGMENTS: number;
  LOD_HIGH_DISTANCE: number;
  LOD_MEDIUM_DISTANCE: number;
  LOD_LOW_DISTANCE: number;
  CAMERA_FOV: number;
  CAMERA_NEAR: number;
  CAMERA_FAR: number;
  INITIAL_CAMERA_DISTANCE: number;
  MIN_ZOOM_DISTANCE: number;
  MAX_ZOOM_DISTANCE: number;
  AMBIENT_LIGHT_INTENSITY: number;
  DIRECTIONAL_LIGHT_INTENSITY: number;
  SUN_DISTANCE: number;
  CLOUD_OPACITY: number;
  DAY_NIGHT_TRANSITION: {
    min: number;
    max: number;
  };
  ATMOSPHERE_COLOR: number;
  ATMOSPHERE_GLOW_INTENSITY: number;
  ATMOSPHERE_FRESNEL_POWER: number;
  DEFAULT_LONGITUDE: number;
  DEFAULT_LATITUDE: number;
  DAMPING_FACTOR: number;
}

export interface SceneObjects {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export interface EarthObjects {
  earth: THREE.LOD;
  clouds: THREE.LOD;
  earthMaterial: THREE.ShaderMaterial;
}

export interface LightingObjects {
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
}

export interface EarthUniforms {
  dayTexture: { value: THREE.Texture };
  nightTexture: { value: THREE.Texture };
  sunDirection: { value: THREE.Vector3 };
}

export interface TimeState {
  timeSlider: HTMLInputElement;
  datePicker: HTMLInputElement;
  lastSliderValue: string;
  lastDateValue: string;
  needsSunUpdate: boolean;
  timeDisplayElement: HTMLElement | null;
  selectedDate: Date;
  // Playback state
  isPlaying: boolean;
  playbackSpeed: number; // 1, 10, 60, 360 (multiplier)
  lastPlaybackTime: number; // Timestamp for calculating elapsed time
  currentTime: number; // Precise current time in minutes (source of truth during playback)
}

export interface LocationState {
  userLongitude: number;
  userLatitude: number;
}

export interface CityData {
  name: string;
  lat: number;
  lon: number;
  timezone: number;
}

export interface MarkerState {
  markersGroup: THREE.Group;
  cityMarkers: Map<string, THREE.Sprite>;
  userMarker: THREE.Sprite | null;
  tooltip: HTMLDivElement | null;
  visible: boolean;
}

export interface ReferenceLinesState {
  group: THREE.Group;
  visible: boolean;
}

export interface AtmosphereState {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  visible: boolean;
}

export interface TerminatorState {
  group: THREE.Group;
  line: THREE.Line;
  glowLine: THREE.Line;
  visible: boolean;
  radius: number;
}

export interface MoonState {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  visible: boolean;
}

export interface SatelliteData {
  name: string;
  altitudeKm: number;
  inclination: number;
  periodMinutes: number;
  color: number;
  description: string;
}

export interface SatelliteState {
  group: THREE.Group;
  orbitLines: THREE.Line[];
  markers: THREE.Sprite[];
  visible: boolean;
  tooltip: HTMLDivElement | null;
}

export interface FlyToState {
  isAnimating: boolean;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTime: number;
  duration: number; // in milliseconds
  targetCity: CityData | null;
}

export interface LoadingState {
  overlay: HTMLElement | null;
  progressBar: HTMLElement | null;
  statusText: HTMLElement | null;
  loadingText: HTMLElement | null;
  errorOverlay: HTMLElement | null;
  errorMessage: HTMLElement | null;
  retryButton: HTMLElement | null;
  totalItems: number;
  loadedItems: number;
  hasError: boolean;
}

export interface CitySearchState {
  input: HTMLInputElement;
  results: HTMLDivElement;
  clearButton: HTMLButtonElement;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  activeIndex: number; // -1 means no selection
}

export interface AppState {
  scene: SceneObjects | null;
  earth: EarthObjects | null;
  lighting: LightingObjects | null;
  controls: OrbitControls | null;
  time: TimeState;
  location: LocationState;
  markers: MarkerState | null;
}
