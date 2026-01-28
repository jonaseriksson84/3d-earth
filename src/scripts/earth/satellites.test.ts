import { describe, it, expect } from 'vitest';
import { SATELLITES, calculateSatellitePosition, generateOrbitPoints } from './satellites';

describe('SATELLITES constant', () => {
  it('should contain ISS, GPS, and Geostationary satellites', () => {
    expect(SATELLITES.length).toBe(3);
    const names = SATELLITES.map((s) => s.name);
    expect(names).toContain('ISS');
    expect(names).toContain('GPS Orbit');
    expect(names).toContain('Geostationary');
  });

  it('should have valid ISS orbital parameters', () => {
    const iss = SATELLITES.find((s) => s.name === 'ISS');
    expect(iss).toBeDefined();
    expect(iss!.altitudeKm).toBe(408);
    expect(iss!.inclination).toBeCloseTo(51.6, 1);
    expect(iss!.periodMinutes).toBeCloseTo(92.68, 1);
  });

  it('should have valid GPS orbital parameters', () => {
    const gps = SATELLITES.find((s) => s.name === 'GPS Orbit');
    expect(gps).toBeDefined();
    expect(gps!.altitudeKm).toBe(20200);
    expect(gps!.inclination).toBe(55);
  });

  it('should have zero inclination for geostationary orbit', () => {
    const geo = SATELLITES.find((s) => s.name === 'Geostationary');
    expect(geo).toBeDefined();
    expect(geo!.inclination).toBe(0);
    expect(geo!.altitudeKm).toBe(35786);
  });

  it('should have distinct colors for each satellite', () => {
    const colors = SATELLITES.map((s) => s.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(SATELLITES.length);
  });

  it('should have descriptions for all satellites', () => {
    for (const sat of SATELLITES) {
      expect(sat.description).toBeTruthy();
      expect(sat.description.length).toBeGreaterThan(5);
    }
  });
});

describe('calculateSatellitePosition', () => {
  const iss = SATELLITES[0]; // ISS

  it('should return a 3D position', () => {
    const pos = calculateSatellitePosition(iss, 720, 180);
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
    expect(typeof pos.z).toBe('number');
  });

  it('should place satellite at correct orbital radius', () => {
    const pos = calculateSatellitePosition(iss, 0, 0);
    const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    // ISS at 408km: (6371 + 408) / (6371/5) = 6779 / 1274.2 ≈ 5.32
    const expectedRadius = (6371 + 408) / (6371 / 5);
    expect(distance).toBeCloseTo(expectedRadius, 1);
  });

  it('should return different positions for different times', () => {
    const pos1 = calculateSatellitePosition(iss, 0, 100);
    const pos2 = calculateSatellitePosition(iss, 30, 100);
    const same = pos1.x === pos2.x && pos1.y === pos2.y && pos1.z === pos2.z;
    expect(same).toBe(false);
  });

  it('should produce periodic orbits (same position after one period)', () => {
    const pos1 = calculateSatellitePosition(iss, 0, 100);
    // After one period, should return to same position
    const pos2 = calculateSatellitePosition(iss, iss.periodMinutes, 100);
    expect(pos2.x).toBeCloseTo(pos1.x, 3);
    expect(pos2.y).toBeCloseTo(pos1.y, 3);
    expect(pos2.z).toBeCloseTo(pos1.z, 3);
  });

  it('should place geostationary satellite in equatorial plane', () => {
    const geo = SATELLITES[2]; // Geostationary
    const pos = calculateSatellitePosition(geo, 720, 0);
    // With 0 inclination and RAAN=0 (day 0), y should be 0
    // (the orbit is in the XZ plane after RAAN rotation)
    expect(pos.y).toBeCloseTo(0, 5);
  });

  it('should vary position for different day of year (RAAN precession)', () => {
    const pos1 = calculateSatellitePosition(iss, 0, 0);
    const pos2 = calculateSatellitePosition(iss, 0, 182);
    const same = pos1.x === pos2.x && pos1.y === pos2.y && pos1.z === pos2.z;
    expect(same).toBe(false);
  });
});

describe('generateOrbitPoints', () => {
  it('should generate correct number of points', () => {
    const points = generateOrbitPoints(SATELLITES[0], 64);
    expect(points.length).toBe(65); // 64 segments + 1 closing point
  });

  it('should generate a closed loop (first and last point match)', () => {
    const points = generateOrbitPoints(SATELLITES[0], 128);
    const first = points[0];
    const last = points[points.length - 1];
    expect(last.x).toBeCloseTo(first.x, 5);
    expect(last.y).toBeCloseTo(first.y, 5);
    expect(last.z).toBeCloseTo(first.z, 5);
  });

  it('should generate points at correct orbital radius', () => {
    const iss = SATELLITES[0];
    const points = generateOrbitPoints(iss, 64);
    const expectedRadius = (6371 + iss.altitudeKm) / (6371 / 5);
    for (const point of points) {
      const distance = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
      expect(distance).toBeCloseTo(expectedRadius, 2);
    }
  });

  it('should produce equatorial orbit for zero inclination', () => {
    const geo = SATELLITES[2]; // Geostationary, inclination=0
    const points = generateOrbitPoints(geo, 64);
    for (const point of points) {
      // Y component should be 0 for equatorial orbit
      expect(point.y).toBeCloseTo(0, 5);
    }
  });

  it('should produce inclined orbit for ISS', () => {
    const iss = SATELLITES[0];
    const points = generateOrbitPoints(iss, 64);
    // At least some points should have non-zero Y
    const hasNonZeroY = points.some((p) => Math.abs(p.y) > 0.1);
    expect(hasNonZeroY).toBe(true);
  });

  it('should use default 128 segments when not specified', () => {
    const points = generateOrbitPoints(SATELLITES[0]);
    expect(points.length).toBe(129); // 128 + 1
  });
});
