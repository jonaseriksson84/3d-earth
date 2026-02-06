/**
 * Sunrise and sunset calculation using NOAA solar algorithms.
 *
 * Computes sunrise/sunset times for any location and date,
 * handles polar day/night conditions, and provides UI display helpers.
 *
 * @module sunrise
 */

import { getDayOfYear } from './astronomy';
import type { CityData } from './types';

/**
 * Sunrise and sunset times for a location, with polar condition flags.
 */
export interface SunTimes {
  /** Sunrise time in "HH:MM" format, or null for polar conditions */
  sunrise: string | null;
  /** Sunset time in "HH:MM" format, or null for polar conditions */
  sunset: string | null;
  /** True when the sun never sets (midnight sun) */
  polarDay: boolean;
  /** True when the sun never rises (polar night) */
  polarNight: boolean;
}

/**
 * Calculate sunrise and sunset times for a given location and date.
 * Uses the NOAA solar calculations algorithm.
 *
 * @param lat - Latitude in degrees (-90 to 90)
 * @param lon - Longitude in degrees (-180 to 180)
 * @param date - The date to calculate for
 * @param timezoneOffset - Hours offset from UTC (e.g., -5 for EST, 5.5 for IST)
 * @returns Sunrise/sunset times in local time, or null for polar conditions
 */
export function calculateSunriseSunset(
  lat: number,
  lon: number,
  date: Date,
  timezoneOffset: number,
): SunTimes {
  const doy = getDayOfYear(date);
  const gamma = ((2 * Math.PI) / 365) * (doy - 1);

  // NOAA equation of time (minutes)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = (lat * Math.PI) / 180;

  // Solar hour angle at sunrise/sunset (cos of hour angle)
  // When the sun center is at -0.8333 degrees (accounting for refraction and solar disk radius)
  const zenith = (90.8333 * Math.PI) / 180;
  const cosHourAngle =
    (Math.cos(zenith) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl));

  // Check for polar day/night
  if (cosHourAngle > 1) {
    return { sunrise: null, sunset: null, polarDay: false, polarNight: true };
  }
  if (cosHourAngle < -1) {
    return { sunrise: null, sunset: null, polarDay: true, polarNight: false };
  }

  const hourAngle = Math.acos(cosHourAngle) * (180 / Math.PI); // degrees

  // Sunrise and sunset in UTC minutes from midnight
  const solarNoonUTC = 720 - 4 * lon - eqTime; // minutes
  const sunriseUTC = solarNoonUTC - hourAngle * 4; // 4 minutes per degree
  const sunsetUTC = solarNoonUTC + hourAngle * 4;

  // Convert to local time
  const offsetMinutes = timezoneOffset * 60;
  const sunriseLocal = sunriseUTC + offsetMinutes;
  const sunsetLocal = sunsetUTC + offsetMinutes;

  return {
    sunrise: formatMinutesToTime(sunriseLocal),
    sunset: formatMinutesToTime(sunsetLocal),
    polarDay: false,
    polarNight: false,
  };
}

/**
 * Format minutes since midnight to HH:MM string.
 * Handles wrapping past midnight.
 */
function formatMinutesToTime(minutes: number): string {
  let normalized = minutes % 1440;
  if (normalized < 0) normalized += 1440;
  const hours = Math.floor(normalized / 60);
  const mins = Math.round(normalized % 60);
  // Handle edge case where rounding gives 60 minutes
  if (mins === 60) {
    return `${String((hours + 1) % 24).padStart(2, '0')}:00`;
  }
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Formats sun times for compact display in a marker tooltip.
 * Returns "↑HH:MM ↓HH:MM" for normal days, or polar condition text.
 *
 * @param sunTimes - Calculated sunrise/sunset data
 * @returns Formatted string for tooltip display
 */
export function formatSunTimesForTooltip(sunTimes: SunTimes): string {
  if (sunTimes.polarDay) return 'Polar day (no sunset)';
  if (sunTimes.polarNight) return 'Polar night (no sunrise)';
  return `↑${sunTimes.sunrise} ↓${sunTimes.sunset}`;
}

/**
 * Updates the sunrise/sunset info panel in the UI.
 * Shows sun times for the user's location and optionally a selected city.
 *
 * @param userLat - User's latitude in degrees
 * @param userLon - User's longitude in degrees
 * @param date - Date to calculate sun times for
 * @param userTimezone - User's UTC timezone offset in hours
 * @param selectedCity - Optional city to show additional sun times for
 */
export function updateSunTimesDisplay(
  userLat: number,
  userLon: number,
  date: Date,
  userTimezone: number,
  selectedCity?: CityData,
): void {
  const display = document.getElementById('sunTimesDisplay');
  if (!display) return;

  display.innerHTML = '';

  // User location sun times
  const userTimes = calculateSunriseSunset(userLat, userLon, date, userTimezone);
  const userSection = document.createElement('div');
  userSection.innerHTML = buildSunTimesHTML('Your location', userTimes);
  display.appendChild(userSection);

  // Selected city sun times (if different from user)
  if (selectedCity) {
    const cityTimes = calculateSunriseSunset(
      selectedCity.lat,
      selectedCity.lon,
      date,
      selectedCity.timezone,
    );
    const citySection = document.createElement('div');
    citySection.style.marginTop = '6px';
    citySection.style.paddingTop = '6px';
    citySection.style.borderTop = '1px solid rgba(255,255,255,0.1)';
    citySection.innerHTML = buildSunTimesHTML(selectedCity.name, cityTimes);
    display.appendChild(citySection);
  }
}

function buildSunTimesHTML(locationName: string, times: SunTimes): string {
  if (times.polarDay) {
    return `<div class="sun-times-location">${locationName}</div>
      <div class="sun-polar">Polar day — no sunset</div>`;
  }
  if (times.polarNight) {
    return `<div class="sun-times-location">${locationName}</div>
      <div class="sun-polar">Polar night — no sunrise</div>`;
  }
  return `<div class="sun-times-location">${locationName}</div>
    <div class="sun-times-row">
      <span class="sun-rise">Sunrise: ${times.sunrise}</span>
      <span class="sun-set">Sunset: ${times.sunset}</span>
    </div>`;
}
