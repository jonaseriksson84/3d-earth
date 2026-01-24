import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface EarthConfig {
  EARTH_RADIUS: number;
  CLOUD_RADIUS: number;
  UTC_NOON_MINUTES: number;
  MINUTES_PER_DAY: number;
  DEGREES_PER_MINUTE: number;
  SLIDER_STEP: number;
  GEOMETRY_HIGH: number;
  GEOMETRY_MEDIUM: number;
  GEOMETRY_LOW: number;
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
  earth: THREE.Mesh;
  clouds: THREE.Mesh;
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
  lastSliderValue: string;
  needsSunUpdate: boolean;
  timeDisplayElement: HTMLElement | null;
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

export interface AppState {
  scene: SceneObjects | null;
  earth: EarthObjects | null;
  lighting: LightingObjects | null;
  controls: OrbitControls | null;
  time: TimeState;
  location: LocationState;
  markers: MarkerState | null;
}
