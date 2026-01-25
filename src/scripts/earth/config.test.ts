import { describe, it, expect } from 'vitest';
import { CONFIG } from './config';

describe('CONFIG', () => {
  describe('Earth physical properties', () => {
    it('has positive EARTH_RADIUS', () => {
      expect(CONFIG.EARTH_RADIUS).toBeGreaterThan(0);
    });

    it('CLOUD_RADIUS is greater than EARTH_RADIUS', () => {
      expect(CONFIG.CLOUD_RADIUS).toBeGreaterThan(CONFIG.EARTH_RADIUS);
    });

    it('AXIAL_TILT is approximately 23.4 degrees', () => {
      expect(CONFIG.AXIAL_TILT).toBeCloseTo(23.4, 1);
    });
  });

  describe('Time constants', () => {
    it('UTC_NOON_MINUTES is 720 (12 hours)', () => {
      expect(CONFIG.UTC_NOON_MINUTES).toBe(720);
    });

    it('MINUTES_PER_DAY is 1440 (24 * 60)', () => {
      expect(CONFIG.MINUTES_PER_DAY).toBe(1440);
    });

    it('DEGREES_PER_MINUTE is correct (360 / 1440)', () => {
      expect(CONFIG.DEGREES_PER_MINUTE).toBeCloseTo(360 / 1440, 5);
    });

    it('SLIDER_STEP is positive', () => {
      expect(CONFIG.SLIDER_STEP).toBeGreaterThan(0);
    });

    it('SLIDER_STEP divides evenly into MINUTES_PER_DAY', () => {
      expect(CONFIG.MINUTES_PER_DAY % CONFIG.SLIDER_STEP).toBe(0);
    });
  });

  describe('Camera settings', () => {
    it('CAMERA_FOV is reasonable (30-120)', () => {
      expect(CONFIG.CAMERA_FOV).toBeGreaterThanOrEqual(30);
      expect(CONFIG.CAMERA_FOV).toBeLessThanOrEqual(120);
    });

    it('CAMERA_NEAR is less than CAMERA_FAR', () => {
      expect(CONFIG.CAMERA_NEAR).toBeLessThan(CONFIG.CAMERA_FAR);
    });

    it('INITIAL_CAMERA_DISTANCE is within zoom limits', () => {
      expect(CONFIG.INITIAL_CAMERA_DISTANCE).toBeGreaterThanOrEqual(CONFIG.MIN_ZOOM_DISTANCE);
      expect(CONFIG.INITIAL_CAMERA_DISTANCE).toBeLessThanOrEqual(CONFIG.MAX_ZOOM_DISTANCE);
    });

    it('MIN_ZOOM_DISTANCE is greater than EARTH_RADIUS', () => {
      expect(CONFIG.MIN_ZOOM_DISTANCE).toBeGreaterThan(CONFIG.EARTH_RADIUS);
    });
  });

  describe('Lighting', () => {
    it('AMBIENT_LIGHT_INTENSITY is positive', () => {
      expect(CONFIG.AMBIENT_LIGHT_INTENSITY).toBeGreaterThan(0);
    });

    it('DIRECTIONAL_LIGHT_INTENSITY is positive', () => {
      expect(CONFIG.DIRECTIONAL_LIGHT_INTENSITY).toBeGreaterThan(0);
    });

    it('SUN_DISTANCE is positive', () => {
      expect(CONFIG.SUN_DISTANCE).toBeGreaterThan(0);
    });
  });

  describe('Visual effects', () => {
    it('CLOUD_OPACITY is between 0 and 1', () => {
      expect(CONFIG.CLOUD_OPACITY).toBeGreaterThan(0);
      expect(CONFIG.CLOUD_OPACITY).toBeLessThanOrEqual(1);
    });

    it('DAY_NIGHT_TRANSITION has valid range', () => {
      expect(CONFIG.DAY_NIGHT_TRANSITION.min).toBeLessThan(CONFIG.DAY_NIGHT_TRANSITION.max);
    });
  });

  describe('Atmosphere glow effect', () => {
    it('ATMOSPHERE_RADIUS is greater than CLOUD_RADIUS', () => {
      expect(CONFIG.ATMOSPHERE_RADIUS).toBeGreaterThan(CONFIG.CLOUD_RADIUS);
    });

    it('ATMOSPHERE_COLOR is a valid hex color', () => {
      expect(CONFIG.ATMOSPHERE_COLOR).toBeGreaterThanOrEqual(0);
      expect(CONFIG.ATMOSPHERE_COLOR).toBeLessThanOrEqual(0xffffff);
    });

    it('ATMOSPHERE_GLOW_INTENSITY is positive and reasonable', () => {
      expect(CONFIG.ATMOSPHERE_GLOW_INTENSITY).toBeGreaterThan(0);
      expect(CONFIG.ATMOSPHERE_GLOW_INTENSITY).toBeLessThanOrEqual(2);
    });

    it('ATMOSPHERE_FRESNEL_POWER is positive and reasonable', () => {
      expect(CONFIG.ATMOSPHERE_FRESNEL_POWER).toBeGreaterThan(0);
      expect(CONFIG.ATMOSPHERE_FRESNEL_POWER).toBeLessThanOrEqual(10);
    });
  });

  describe('Default location', () => {
    it('DEFAULT_LONGITUDE is valid (-180 to 180)', () => {
      expect(CONFIG.DEFAULT_LONGITUDE).toBeGreaterThanOrEqual(-180);
      expect(CONFIG.DEFAULT_LONGITUDE).toBeLessThanOrEqual(180);
    });

    it('DEFAULT_LATITUDE is valid (-90 to 90)', () => {
      expect(CONFIG.DEFAULT_LATITUDE).toBeGreaterThanOrEqual(-90);
      expect(CONFIG.DEFAULT_LATITUDE).toBeLessThanOrEqual(90);
    });
  });

  describe('Controls', () => {
    it('DAMPING_FACTOR is between 0 and 1', () => {
      expect(CONFIG.DAMPING_FACTOR).toBeGreaterThan(0);
      expect(CONFIG.DAMPING_FACTOR).toBeLessThanOrEqual(1);
    });
  });
});
