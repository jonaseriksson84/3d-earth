import type { EarthConfig } from './types';

export const CONFIG: EarthConfig = {
  // Earth physical properties
  EARTH_RADIUS: 5,
  CLOUD_RADIUS: 5.05,
  ATMOSPHERE_RADIUS: 5.15, // Slightly larger than clouds for glow effect
  AXIAL_TILT: 23.4, // Earth's axial tilt in degrees

  // Time constants
  UTC_NOON_MINUTES: 720, // 12:00 UTC in minutes
  MINUTES_PER_DAY: 1440, // 24 hours * 60 minutes
  DEGREES_PER_MINUTE: 0.25, // Earth rotation: 360deg / 1440 minutes
  SLIDER_STEP: 15, // 15-minute increments

  // Geometry quality (LOD levels)
  GEOMETRY_HIGH: 64,
  GEOMETRY_MEDIUM: 48,
  GEOMETRY_LOW: 32,

  // LOD distances (camera distance thresholds for geometry switching)
  LOD_HIGH_SEGMENTS: 128,
  LOD_HIGH_DISTANCE: 0,
  LOD_MEDIUM_DISTANCE: 15,
  LOD_LOW_DISTANCE: 30,

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

  // Atmosphere glow effect
  ATMOSPHERE_COLOR: 0x88ccff, // Sky blue for realistic atmosphere
  ATMOSPHERE_GLOW_INTENSITY: 0.6, // Subtle glow
  ATMOSPHERE_FRESNEL_POWER: 3.0, // Controls edge sharpness (2-5 range)

  // Default location (Stockholm)
  DEFAULT_LONGITUDE: 18,
  DEFAULT_LATITUDE: 59,

  // Controls
  DAMPING_FACTOR: 0.05,
};
