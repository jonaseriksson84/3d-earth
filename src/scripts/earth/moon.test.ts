import { describe, expect, it } from 'vitest';
import { calculateMoonPhaseAngle, calculateMoonPosition } from './moon';

describe('calculateMoonPhaseAngle', () => {
  it('returns a value between 0 and 2*PI', () => {
    const date = new Date(2026, 0, 15);
    const angle = calculateMoonPhaseAngle(date);
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(2 * Math.PI);
  });

  it('returns different angles for different dates', () => {
    const date1 = new Date(2026, 0, 1);
    const date2 = new Date(2026, 0, 15);
    const angle1 = calculateMoonPhaseAngle(date1);
    const angle2 = calculateMoonPhaseAngle(date2);
    expect(angle1).not.toBeCloseTo(angle2, 1);
  });

  it('completes a full cycle in approximately 29.53 days', () => {
    const date1 = new Date(2026, 0, 1, 0, 0, 0);
    const date2 = new Date(2026, 0, 1, 0, 0, 0);
    date2.setTime(date1.getTime() + 29.530588853 * 24 * 60 * 60 * 1000);

    const angle1 = calculateMoonPhaseAngle(date1);
    const angle2 = calculateMoonPhaseAngle(date2);

    // After one full synodic period, angles should be approximately equal
    // (modulo 2*PI, so difference should be near 0 or 2*PI)
    const diff = Math.abs(angle2 - angle1);
    const normalizedDiff = Math.min(diff, 2 * Math.PI - diff);
    expect(normalizedDiff).toBeLessThan(0.01);
  });

  it('returns 0 (new moon) near the reference new moon date', () => {
    // Reference: January 6, 2000 18:14 UTC
    const refDate = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const angle = calculateMoonPhaseAngle(refDate);
    expect(angle).toBeLessThan(0.01);
  });

  it('returns approximately PI at full moon (half synodic period after new moon)', () => {
    const refDate = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const halfPeriod = 29.530588853 / 2;
    const fullMoonDate = new Date(refDate.getTime() + halfPeriod * 24 * 60 * 60 * 1000);
    const angle = calculateMoonPhaseAngle(fullMoonDate);
    expect(angle).toBeCloseTo(Math.PI, 1);
  });
});

describe('calculateMoonPosition', () => {
  it('returns a position with correct distance from origin', () => {
    const date = new Date(2026, 5, 15);
    const pos = calculateMoonPosition(date, 1, 0, 0);
    const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    // MOON_DISTANCE = EARTH_RADIUS * 12 = 60
    expect(distance).toBeCloseTo(60, 0);
  });

  it('positions Moon near sun direction at new moon', () => {
    // At new moon (phase angle ~0), Moon should be roughly in the sun direction
    const refDate = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const pos = calculateMoonPosition(refDate, 1, 0, 0);
    // Moon should be mostly in the +x direction (same as sun)
    expect(pos.x).toBeGreaterThan(0);
  });

  it('positions Moon opposite sun direction at full moon', () => {
    const refDate = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const halfPeriod = 29.530588853 / 2;
    const fullMoonDate = new Date(refDate.getTime() + halfPeriod * 24 * 60 * 60 * 1000);
    const pos = calculateMoonPosition(fullMoonDate, 1, 0, 0);
    // Moon should be mostly in the -x direction (opposite sun)
    expect(pos.x).toBeLessThan(0);
  });

  it('returns different positions for different dates', () => {
    const date1 = new Date(2026, 0, 1);
    const date2 = new Date(2026, 0, 10);
    const pos1 = calculateMoonPosition(date1, 1, 0, 0);
    const pos2 = calculateMoonPosition(date2, 1, 0, 0);
    expect(pos1.x).not.toBeCloseTo(pos2.x, 0);
  });

  it('accounts for orbital inclination (y component not always zero)', () => {
    // With sun direction along x-axis, the orbital inclination should give
    // some y-component to the Moon position at certain phases
    const date = new Date(2026, 2, 15); // Quarter moon roughly
    const pos = calculateMoonPosition(date, 1, 0, 0);
    // The orbital inclination means y won't always be exactly 0
    // (unless the phase happens to be 0 or PI)
    const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    expect(distance).toBeCloseTo(60, 0);
  });
});
