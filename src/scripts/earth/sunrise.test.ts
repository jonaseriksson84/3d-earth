import { describe, it, expect } from 'vitest';
import { calculateSunriseSunset, formatSunTimesForTooltip } from './sunrise';
import type { SunTimes } from './sunrise';

describe('calculateSunriseSunset', () => {
  it('returns sunrise and sunset for a typical mid-latitude location', () => {
    // London on March 20 (equinox) - roughly equal day/night
    const result = calculateSunriseSunset(51.5, -0.13, new Date(2026, 2, 20), 0);
    expect(result.polarDay).toBe(false);
    expect(result.polarNight).toBe(false);
    expect(result.sunrise).not.toBeNull();
    expect(result.sunset).not.toBeNull();
  });

  it('calculates sunrise before sunset for any normal day', () => {
    // New York in June
    const result = calculateSunriseSunset(40.71, -74.01, new Date(2026, 5, 21), -5);
    expect(result.sunrise).not.toBeNull();
    expect(result.sunset).not.toBeNull();
    // Convert to minutes for comparison
    const sunriseMins = timeToMinutes(result.sunrise!);
    const sunsetMins = timeToMinutes(result.sunset!);
    expect(sunsetMins).toBeGreaterThan(sunriseMins);
  });

  it('returns polar day for Arctic in summer', () => {
    // Tromsø (69.6°N) on June 21 - midnight sun
    const result = calculateSunriseSunset(69.6, 19.0, new Date(2026, 5, 21), 1);
    expect(result.polarDay).toBe(true);
    expect(result.polarNight).toBe(false);
    expect(result.sunrise).toBeNull();
    expect(result.sunset).toBeNull();
  });

  it('returns polar night for Arctic in winter', () => {
    // Tromsø (69.6°N) on December 21 - polar night
    const result = calculateSunriseSunset(69.6, 19.0, new Date(2026, 11, 21), 1);
    expect(result.polarNight).toBe(true);
    expect(result.polarDay).toBe(false);
    expect(result.sunrise).toBeNull();
    expect(result.sunset).toBeNull();
  });

  it('returns polar day for Antarctic in southern summer', () => {
    // Antarctic location on December 21
    const result = calculateSunriseSunset(-69.6, 0, new Date(2026, 11, 21), 0);
    expect(result.polarDay).toBe(true);
  });

  it('returns polar night for Antarctic in southern winter', () => {
    // Antarctic location on June 21
    const result = calculateSunriseSunset(-69.6, 0, new Date(2026, 5, 21), 0);
    expect(result.polarNight).toBe(true);
  });

  it('produces reasonable sunrise time for equator on equinox', () => {
    // Equator on equinox: sunrise ~6:00, sunset ~18:00
    const result = calculateSunriseSunset(0, 0, new Date(2026, 2, 20), 0);
    expect(result.sunrise).not.toBeNull();
    expect(result.sunset).not.toBeNull();
    const sunriseMins = timeToMinutes(result.sunrise!);
    const sunsetMins = timeToMinutes(result.sunset!);
    // Sunrise should be around 6:00 UTC (360 mins), within 30 min
    expect(sunriseMins).toBeGreaterThan(330);
    expect(sunriseMins).toBeLessThan(390);
    // Sunset should be around 18:00 UTC (1080 mins), within 30 min
    expect(sunsetMins).toBeGreaterThan(1050);
    expect(sunsetMins).toBeLessThan(1110);
  });

  it('accounts for timezone offset correctly', () => {
    // Tokyo (timezone +9) should have sunrise/sunset in local time
    const result = calculateSunriseSunset(35.68, 139.65, new Date(2026, 2, 20), 9);
    expect(result.sunrise).not.toBeNull();
    const sunriseMins = timeToMinutes(result.sunrise!);
    // Sunrise in Tokyo should be around 5:45 local time (345 mins)
    expect(sunriseMins).toBeGreaterThan(300);
    expect(sunriseMins).toBeLessThan(420);
  });

  it('handles fractional timezone offsets (India UTC+5:30)', () => {
    const result = calculateSunriseSunset(19.08, 72.88, new Date(2026, 2, 20), 5.5);
    expect(result.sunrise).not.toBeNull();
    expect(result.sunset).not.toBeNull();
    expect(result.polarDay).toBe(false);
    expect(result.polarNight).toBe(false);
  });

  it('produces longer days in summer for northern latitudes', () => {
    const summerResult = calculateSunriseSunset(51.5, -0.13, new Date(2026, 5, 21), 0);
    const winterResult = calculateSunriseSunset(51.5, -0.13, new Date(2026, 11, 21), 0);

    const summerDayLength =
      timeToMinutes(summerResult.sunset!) - timeToMinutes(summerResult.sunrise!);
    const winterDayLength =
      timeToMinutes(winterResult.sunset!) - timeToMinutes(winterResult.sunrise!);

    expect(summerDayLength).toBeGreaterThan(winterDayLength);
    // Summer in London: ~16h+, winter: ~8h
    expect(summerDayLength).toBeGreaterThan(900); // > 15h
    expect(winterDayLength).toBeLessThan(540); // < 9h
  });

  it('returns valid HH:MM format for sunrise and sunset', () => {
    const result = calculateSunriseSunset(40.71, -74.01, new Date(2026, 0, 15), -5);
    expect(result.sunrise).toMatch(/^\d{2}:\d{2}$/);
    expect(result.sunset).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('formatSunTimesForTooltip', () => {
  it('formats normal sunrise/sunset times', () => {
    const times: SunTimes = { sunrise: '06:30', sunset: '18:45', polarDay: false, polarNight: false };
    expect(formatSunTimesForTooltip(times)).toBe('↑06:30 ↓18:45');
  });

  it('formats polar day', () => {
    const times: SunTimes = { sunrise: null, sunset: null, polarDay: true, polarNight: false };
    expect(formatSunTimesForTooltip(times)).toBe('Polar day (no sunset)');
  });

  it('formats polar night', () => {
    const times: SunTimes = { sunrise: null, sunset: null, polarDay: false, polarNight: true };
    expect(formatSunTimesForTooltip(times)).toBe('Polar night (no sunrise)');
  });
});

// Helper to convert HH:MM to total minutes
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
