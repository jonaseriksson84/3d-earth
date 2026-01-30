/**
 * Browser geolocation handling for detecting the user's position.
 *
 * Falls back to default coordinates (Stockholm) when geolocation is
 * unavailable or denied.
 *
 * @module geolocation
 */

import { CONFIG } from './config';
import type { LocationState, EarthObjects } from './types';
import { updateEarthRotation } from './earth';

/**
 * Creates the initial location state with default coordinates.
 *
 * @returns Location state initialized to default longitude/latitude from CONFIG
 */
export function createLocationState(): LocationState {
  return {
    userLongitude: CONFIG.DEFAULT_LONGITUDE,
    userLatitude: CONFIG.DEFAULT_LATITUDE,
  };
}

/**
 * Requests the user's geolocation and updates Earth rotation to center their position.
 * Falls back to default coordinates on failure or if geolocation is unsupported.
 *
 * @param locationState - Mutable state to update with detected coordinates
 * @param earthObjects - Earth objects to rotate based on user longitude
 */
export function getLocation(
  locationState: LocationState,
  earthObjects: EarthObjects
): void {
  if (!navigator.geolocation) {
    console.log('Geolocation not supported, using default location');
    updateEarthRotation(earthObjects, locationState.userLongitude);
    return;
  }

  const options: PositionOptions = {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 300000,
  };

  navigator.geolocation.getCurrentPosition(
    (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        locationState.userLongitude = lon;
        locationState.userLatitude = lat;
        console.log(
          `Geolocation success: ${lat.toFixed(2)}N, ${lon.toFixed(2)}E`
        );
        updateEarthRotation(earthObjects, locationState.userLongitude);
      } else {
        console.warn('Invalid coordinates received, using default location');
        updateEarthRotation(earthObjects, locationState.userLongitude);
      }
    },
    (error: GeolocationPositionError) => {
      let errorMsg = 'Geolocation failed: ';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg += 'Permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg += 'Position unavailable';
          break;
        case error.TIMEOUT:
          errorMsg += 'Request timed out';
          break;
        default:
          errorMsg += 'Unknown error';
      }
      console.log(errorMsg + ', using default location');
      updateEarthRotation(earthObjects, locationState.userLongitude);
    },
    options
  );
}
