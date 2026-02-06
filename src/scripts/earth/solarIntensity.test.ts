/**
 * Unit tests for the solarIntensity module.
 *
 * Tests configuration validation and ground ring geometry generation.
 */

import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { generateGroundRingPoints } from './solarIntensity';

describe('solarIntensity config', () => {
  it('should have SOLAR_INTENSITY_SPIKE_HEIGHT defined and positive', () => {
    expect(CONFIG.SOLAR_INTENSITY_SPIKE_HEIGHT).toBeDefined();
    expect(typeof CONFIG.SOLAR_INTENSITY_SPIKE_HEIGHT).toBe('number');
    expect(CONFIG.SOLAR_INTENSITY_SPIKE_HEIGHT).toBeGreaterThan(0);
  });

  it('should have SOLAR_INTENSITY_SPIKE_COLOR defined as hex number', () => {
    expect(CONFIG.SOLAR_INTENSITY_SPIKE_COLOR).toBeDefined();
    expect(typeof CONFIG.SOLAR_INTENSITY_SPIKE_COLOR).toBe('number');
    // Should be yellow (0xffff00)
    expect(CONFIG.SOLAR_INTENSITY_SPIKE_COLOR).toBe(0xffff00);
  });

  it('should have SOLAR_INTENSITY_RING_RADIUS defined and positive', () => {
    expect(CONFIG.SOLAR_INTENSITY_RING_RADIUS).toBeDefined();
    expect(typeof CONFIG.SOLAR_INTENSITY_RING_RADIUS).toBe('number');
    expect(CONFIG.SOLAR_INTENSITY_RING_RADIUS).toBeGreaterThan(0);
    // Should be less than PI/2 (90 degrees)
    expect(CONFIG.SOLAR_INTENSITY_RING_RADIUS).toBeLessThan(Math.PI / 2);
  });

  it('should have SOLAR_INTENSITY_GRADIENT_OPACITY in valid range', () => {
    expect(CONFIG.SOLAR_INTENSITY_GRADIENT_OPACITY).toBeDefined();
    expect(typeof CONFIG.SOLAR_INTENSITY_GRADIENT_OPACITY).toBe('number');
    expect(CONFIG.SOLAR_INTENSITY_GRADIENT_OPACITY).toBeGreaterThan(0);
    expect(CONFIG.SOLAR_INTENSITY_GRADIENT_OPACITY).toBeLessThanOrEqual(1);
  });
});

describe('generateGroundRingPoints', () => {
  it('should generate correct number of points', () => {
    const segments = 32;
    const points = generateGroundRingPoints(1, 0, 0, 5, 0.1, segments);
    // segments + 1 points for closed loop
    expect(points.length).toBe(segments + 1);
  });

  it('should generate points at correct radius', () => {
    const radius = 5.0;
    const points = generateGroundRingPoints(1, 0, 0, radius, 0.1, 16);

    for (const point of points) {
      const pointRadius = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
      expect(pointRadius).toBeCloseTo(radius, 4);
    }
  });

  it('should generate closed loop (first and last points match)', () => {
    const points = generateGroundRingPoints(1, 0, 0, 5, 0.1, 32);
    const first = points[0];
    const last = points[points.length - 1];

    expect(first.x).toBeCloseTo(last.x, 4);
    expect(first.y).toBeCloseTo(last.y, 4);
    expect(first.z).toBeCloseTo(last.z, 4);
  });

  it('should generate ring centered around subsolar point', () => {
    const sunX = 1,
      sunY = 0,
      sunZ = 0;
    const radius = 5.0;
    const ringRadius = 0.1; // radians
    const points = generateGroundRingPoints(sunX, sunY, sunZ, radius, ringRadius, 32);

    // Subsolar point normalized
    const subNormX = sunX / Math.sqrt(sunX ** 2 + sunY ** 2 + sunZ ** 2);
    const subNormY = sunY / Math.sqrt(sunX ** 2 + sunY ** 2 + sunZ ** 2);
    const subNormZ = sunZ / Math.sqrt(sunX ** 2 + sunY ** 2 + sunZ ** 2);

    // All points should be approximately the same angular distance from subsolar point
    for (const point of points) {
      const pointNormX = point.x / radius;
      const pointNormY = point.y / radius;
      const pointNormZ = point.z / radius;

      const dotProduct = pointNormX * subNormX + pointNormY * subNormY + pointNormZ * subNormZ;
      // dot product = cos(angle), so angle = acos(dotProduct)
      const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
      expect(angle).toBeCloseTo(ringRadius, 3);
    }
  });

  it('should handle sun at north pole', () => {
    const points = generateGroundRingPoints(0, 1, 0, 5, 0.1, 16);
    expect(points.length).toBe(17);
    // All points should be at correct radius
    for (const point of points) {
      const pointRadius = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
      expect(pointRadius).toBeCloseTo(5.0, 4);
    }
  });

  it('should handle sun at arbitrary position', () => {
    // Sun at 45 degrees latitude, 45 degrees longitude
    const lat = Math.PI / 4;
    const lon = Math.PI / 4;
    const sunX = Math.cos(lat) * Math.cos(lon);
    const sunY = Math.sin(lat);
    const sunZ = -Math.cos(lat) * Math.sin(lon);

    const points = generateGroundRingPoints(sunX, sunY, sunZ, 5, 0.15, 32);
    expect(points.length).toBe(33);

    // All points should be at correct radius
    for (const point of points) {
      const pointRadius = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
      expect(pointRadius).toBeCloseTo(5.0, 4);
    }
  });

  it('should respect different ring radii', () => {
    const smallRing = generateGroundRingPoints(1, 0, 0, 5, 0.05, 16);
    const largeRing = generateGroundRingPoints(1, 0, 0, 5, 0.2, 16);

    // Calculate average angular distance from subsolar point
    const calcAvgAngle = (pts: { x: number; y: number; z: number }[]): number => {
      let sum = 0;
      for (const p of pts) {
        const norm = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2);
        const dot = p.x / norm; // dot with (1,0,0)
        sum += Math.acos(Math.max(-1, Math.min(1, dot)));
      }
      return sum / pts.length;
    };

    const smallAvgAngle = calcAvgAngle(smallRing);
    const largeAvgAngle = calcAvgAngle(largeRing);

    expect(smallAvgAngle).toBeCloseTo(0.05, 2);
    expect(largeAvgAngle).toBeCloseTo(0.2, 2);
    expect(largeAvgAngle).toBeGreaterThan(smallAvgAngle);
  });
});
