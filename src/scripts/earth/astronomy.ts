import { CONFIG } from './config';
import type { EarthObjects, LightingObjects } from './types';

export function getDayOfYear(date: Date): number {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date provided to getDayOfYear, using current date');
      date = new Date();
    }

    const startUTC = Date.UTC(date.getUTCFullYear(), 0, 1);
    const nowUTC = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor((nowUTC - startUTC) / oneDay) + 1;

    // Validate result (should be 1-366)
    return dayOfYear >= 1 && dayOfYear <= 366 ? dayOfYear : 1;
  } catch (error) {
    console.error('Error calculating day of year:', error);
    return 1; // Fallback to January 1st
  }
}

export interface SunPosition {
  x: number;
  y: number;
  z: number;
}

export function calculateSunPosition(
  sliderMinutes: number,
  selectedDate?: Date
): { position: SunPosition; date: Date } {
  const baseDate = selectedDate ?? new Date();
  const now = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    Math.floor(sliderMinutes / 60),
    sliderMinutes % 60,
    0
  );

  // Minutes since UTC midnight
  const utcMinutes =
    now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;

  // Day of year and fractional year (gamma)
  const doy = getDayOfYear(now);
  const gamma = ((2 * Math.PI) / 365) * (doy - 1 + utcMinutes / 1440);

  // NOAA equation of time (minutes) and solar declination (radians)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Calculate subsolar longitude (sun moves west as time progresses)
  const sunLon =
    -(utcMinutes - CONFIG.UTC_NOON_MINUTES + eqTime) * CONFIG.DEGREES_PER_MINUTE;

  // Convert to 3D coordinates
  const lat = decl; // radians
  const lon = (sunLon * Math.PI) / 180;
  const x = Math.cos(lat) * Math.cos(lon);
  const y = Math.sin(lat);
  const z = -Math.cos(lat) * Math.sin(lon);

  return { position: { x, y, z }, date: now };
}

export function updateSunPosition(
  sliderMinutes: number,
  earthObjects: EarthObjects,
  lightingObjects: LightingObjects,
  selectedDate?: Date
): Date {
  const { position, date } = calculateSunPosition(sliderMinutes, selectedDate);
  const { earthMaterial } = earthObjects;
  const { directionalLight, ambientLight } = lightingObjects;

  // Update lighting
  directionalLight.position.set(
    position.x * CONFIG.SUN_DISTANCE,
    position.y * CONFIG.SUN_DISTANCE,
    position.z * CONFIG.SUN_DISTANCE
  );
  directionalLight.intensity = CONFIG.DIRECTIONAL_LIGHT_INTENSITY;
  ambientLight.intensity = CONFIG.AMBIENT_LIGHT_INTENSITY;

  // Update shader
  earthMaterial.uniforms.sunDirection.value.set(
    position.x,
    position.y,
    position.z
  );

  return date;
}
