import type { EarthConfig } from './types';

export const CONFIG: EarthConfig = {
  // Earth physical properties
  EARTH_RADIUS: 5,
  CLOUD_RADIUS: 5.05,

  // Time constants
  UTC_NOON_MINUTES: 720, // 12:00 UTC in minutes
  MINUTES_PER_DAY: 1440, // 24 hours * 60 minutes
  DEGREES_PER_MINUTE: 0.25, // Earth rotation: 360deg / 1440 minutes
  SLIDER_STEP: 15, // 15-minute increments

  // Geometry quality
  GEOMETRY_HIGH: 64,
  GEOMETRY_MEDIUM: 48,
  GEOMETRY_LOW: 32,

  // Camera settings
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
  INITIAL_CAMERA_DISTANCE: 15,
  MIN_ZOOM_DISTANCE: 7,
  MAX_ZOOM_DISTANCE: 50,

  // Lighting
  AMBIENT_LIGHT_INTENSITY: 0.25,
  DIRECTIONAL_LIGHT_INTENSITY: 1.5,
  SUN_DISTANCE: 10,

  // Visual effects
  CLOUD_OPACITY: 0.3,
  DAY_NIGHT_TRANSITION: { min: -0.1, max: 0.1 }, // smoothstep range

  // Default location (Stockholm)
  DEFAULT_LONGITUDE: 18,
  DEFAULT_LATITUDE: 59,

  // Controls
  DAMPING_FACTOR: 0.05,
};
