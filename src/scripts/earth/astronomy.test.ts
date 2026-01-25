import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDayOfYear, calculateSunPosition } from './astronomy';

describe('getDayOfYear', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 1 for January 1st', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(getDayOfYear(date)).toBe(1);
  });

  it('returns 365 for December 31st (non-leap year)', () => {
    const date = new Date(Date.UTC(2026, 11, 31, 0, 0, 0));
    expect(getDayOfYear(date)).toBe(365);
  });

  it('returns 366 for December 31st (leap year)', () => {
    const date = new Date(Date.UTC(2024, 11, 31, 0, 0, 0));
    expect(getDayOfYear(date)).toBe(366);
  });

  it('returns 60 for March 1st (non-leap year)', () => {
    const date = new Date(Date.UTC(2026, 2, 1, 0, 0, 0));
    expect(getDayOfYear(date)).toBe(60);
  });

  it('returns 61 for March 1st (leap year)', () => {
    const date = new Date(Date.UTC(2024, 2, 1, 0, 0, 0));
    expect(getDayOfYear(date)).toBe(61);
  });

  it('returns 172 for June 21st (summer solstice approx)', () => {
    const date = new Date(Date.UTC(2026, 5, 21, 0, 0, 0));
    expect(getDayOfYear(date)).toBe(172);
  });

  it('returns 355 for December 21st (winter solstice approx)', () => {
    const date = new Date(Date.UTC(2026, 11, 21, 0, 0, 0));
    expect(getDayOfYear(date)).toBe(355);
  });

  it('handles invalid date input gracefully', () => {
    const result = getDayOfYear(null as unknown as Date);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(366);
    expect(console.warn).toHaveBeenCalled();
  });

  it('handles NaN date gracefully', () => {
    const invalidDate = new Date('invalid');
    const result = getDayOfYear(invalidDate);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(366);
  });
});

describe('calculateSunPosition', () => {
  it('returns valid position object', () => {
    const result = calculateSunPosition(720); // noon
    expect(result).toHaveProperty('position');
    expect(result).toHaveProperty('date');
    expect(result.position).toHaveProperty('x');
    expect(result.position).toHaveProperty('y');
    expect(result.position).toHaveProperty('z');
  });

  it('returns position as unit vector (approximately)', () => {
    const result = calculateSunPosition(720);
    const { x, y, z } = result.position;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('sun is in different positions at different times', () => {
    const noon = calculateSunPosition(720);
    const midnight = calculateSunPosition(0);

    // The x,z positions should differ significantly
    expect(noon.position.x).not.toBeCloseTo(midnight.position.x, 1);
  });

  it('sun declination changes with date (summer vs winter)', () => {
    const summerSolstice = new Date(2026, 5, 21); // June 21
    const winterSolstice = new Date(2026, 11, 21); // December 21

    const summer = calculateSunPosition(720, summerSolstice);
    const winter = calculateSunPosition(720, winterSolstice);

    // In summer, sun is higher (positive y), in winter lower (negative y)
    expect(summer.position.y).toBeGreaterThan(0);
    expect(winter.position.y).toBeLessThan(0);
  });

  it('sun declination near zero at equinox', () => {
    const springEquinox = new Date(2026, 2, 20); // March 20
    const result = calculateSunPosition(720, springEquinox);

    // Y position should be close to zero at equinox
    expect(Math.abs(result.position.y)).toBeLessThan(0.1);
  });

  it('returns a valid Date object', () => {
    const result = calculateSunPosition(720);
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.getHours()).toBe(12);
    expect(result.date.getMinutes()).toBe(0);
  });

  it('uses provided selectedDate', () => {
    const specificDate = new Date(2025, 6, 15); // July 15, 2025
    const result = calculateSunPosition(360, specificDate); // 6:00 AM

    expect(result.date.getFullYear()).toBe(2025);
    expect(result.date.getMonth()).toBe(6);
    expect(result.date.getDate()).toBe(15);
    expect(result.date.getHours()).toBe(6);
  });

  it('handles slider minutes at boundaries', () => {
    const start = calculateSunPosition(0);
    const end = calculateSunPosition(1439);

    expect(start.date.getHours()).toBe(0);
    expect(start.date.getMinutes()).toBe(0);
    expect(end.date.getHours()).toBe(23);
    expect(end.date.getMinutes()).toBe(59);
  });
});
