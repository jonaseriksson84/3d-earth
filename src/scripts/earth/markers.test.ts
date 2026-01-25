import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { latLonToPosition, calculateLocalTime, CITIES } from './markers';

// Mock THREE.Vector3 for testing without full Three.js
vi.mock('three', () => ({
  Vector3: class MockVector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  },
  Group: class MockGroup {},
  Sprite: class MockSprite {},
  SpriteMaterial: class MockSpriteMaterial {},
  CanvasTexture: class MockCanvasTexture {},
  Raycaster: class MockRaycaster {},
  Vector2: class MockVector2 {},
}));

describe('latLonToPosition', () => {
  const EARTH_RADIUS = 5;

  it('returns correct position for North Pole (90, 0)', () => {
    const pos = latLonToPosition(90, 0, EARTH_RADIUS);

    // North pole should be at y = radius, x and z near 0
    expect(pos.y).toBeCloseTo(EARTH_RADIUS, 5);
    expect(pos.x).toBeCloseTo(0, 5);
    expect(pos.z).toBeCloseTo(0, 5);
  });

  it('returns correct position for South Pole (-90, 0)', () => {
    const pos = latLonToPosition(-90, 0, EARTH_RADIUS);

    // South pole should be at y = -radius, x and z near 0
    expect(pos.y).toBeCloseTo(-EARTH_RADIUS, 5);
    expect(pos.x).toBeCloseTo(0, 5);
    expect(pos.z).toBeCloseTo(0, 5);
  });

  it('returns correct position for equator at prime meridian (0, 0)', () => {
    const pos = latLonToPosition(0, 0, EARTH_RADIUS);

    // At equator, y = 0
    expect(pos.y).toBeCloseTo(0, 5);
    // Position magnitude at equator should equal radius
    const magnitude = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    expect(magnitude).toBeCloseTo(EARTH_RADIUS, 5);
  });

  it('returns position with correct magnitude', () => {
    const pos = latLonToPosition(45, 90, EARTH_RADIUS);
    const magnitude = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

    expect(magnitude).toBeCloseTo(EARTH_RADIUS, 5);
  });

  it('handles negative longitude (western hemisphere)', () => {
    const posWest = latLonToPosition(0, -90, EARTH_RADIUS);
    const posEast = latLonToPosition(0, 90, EARTH_RADIUS);

    // Opposite longitudes should have opposite z values (at equator)
    expect(posWest.z).toBeCloseTo(-posEast.z, 5);
  });

  it('returns consistent results for cities', () => {
    // Test with known city (Tokyo)
    const tokyo = CITIES.find(c => c.name === 'Tokyo');
    if (!tokyo) throw new Error('Tokyo not found in CITIES');

    const pos = latLonToPosition(tokyo.lat, tokyo.lon, EARTH_RADIUS);
    const magnitude = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

    expect(magnitude).toBeCloseTo(EARTH_RADIUS, 5);
    // Tokyo is in northern hemisphere, so y should be positive
    expect(pos.y).toBeGreaterThan(0);
  });

  it('handles different radii correctly', () => {
    const pos1 = latLonToPosition(45, 45, 5);
    const pos2 = latLonToPosition(45, 45, 10);

    // Position vectors should be parallel (same direction, different magnitude)
    const ratio = pos2.x / pos1.x;
    expect(ratio).toBeCloseTo(2, 5);
    expect(pos2.y / pos1.y).toBeCloseTo(2, 5);
    expect(pos2.z / pos1.z).toBeCloseTo(2, 5);
  });
});

describe('calculateLocalTime', () => {
  let originalTimezoneOffset: () => number;

  beforeEach(() => {
    // Save original and mock timezone offset
    originalTimezoneOffset = Date.prototype.getTimezoneOffset;
    // Mock to UTC (offset = 0)
    Date.prototype.getTimezoneOffset = vi.fn(() => 0);
  });

  afterEach(() => {
    Date.prototype.getTimezoneOffset = originalTimezoneOffset;
  });

  it('returns correctly formatted time string', () => {
    const result = calculateLocalTime(720, 0); // Noon UTC
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns 12:00 for noon UTC with UTC timezone', () => {
    const result = calculateLocalTime(720, 0);
    expect(result).toBe('12:00');
  });

  it('returns 17:00 for noon UTC with UTC+5 timezone', () => {
    const result = calculateLocalTime(720, 5);
    expect(result).toBe('17:00');
  });

  it('returns 07:00 for noon UTC with UTC-5 timezone', () => {
    const result = calculateLocalTime(720, -5);
    expect(result).toBe('07:00');
  });

  it('handles midnight correctly', () => {
    const result = calculateLocalTime(0, 0);
    expect(result).toBe('00:00');
  });

  it('handles end of day correctly', () => {
    const result = calculateLocalTime(1439, 0); // 23:59
    expect(result).toBe('23:59');
  });

  it('handles day rollover (time crosses midnight forward)', () => {
    // 23:00 UTC + 5 hours = 04:00 next day
    const result = calculateLocalTime(1380, 5); // 23:00 UTC
    expect(result).toBe('04:00');
  });

  it('handles day rollover (time crosses midnight backward)', () => {
    // 01:00 UTC - 5 hours = 20:00 previous day
    const result = calculateLocalTime(60, -5); // 01:00 UTC
    expect(result).toBe('20:00');
  });

  it('handles fractional timezone offsets (India UTC+5:30)', () => {
    const result = calculateLocalTime(720, 5.5); // Noon UTC to Mumbai
    expect(result).toBe('17:30');
  });

  it('handles negative fractional timezone', () => {
    // Newfoundland is UTC-3:30
    const result = calculateLocalTime(720, -3.5);
    expect(result).toBe('08:30');
  });
});

describe('CITIES constant', () => {
  it('contains at least 10 cities', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(10);
  });

  it('all cities have required properties', () => {
    for (const city of CITIES) {
      expect(city).toHaveProperty('name');
      expect(city).toHaveProperty('lat');
      expect(city).toHaveProperty('lon');
      expect(city).toHaveProperty('timezone');
      expect(typeof city.name).toBe('string');
      expect(typeof city.lat).toBe('number');
      expect(typeof city.lon).toBe('number');
      expect(typeof city.timezone).toBe('number');
    }
  });

  it('all cities have valid latitude (-90 to 90)', () => {
    for (const city of CITIES) {
      expect(city.lat).toBeGreaterThanOrEqual(-90);
      expect(city.lat).toBeLessThanOrEqual(90);
    }
  });

  it('all cities have valid longitude (-180 to 180)', () => {
    for (const city of CITIES) {
      expect(city.lon).toBeGreaterThanOrEqual(-180);
      expect(city.lon).toBeLessThanOrEqual(180);
    }
  });

  it('all cities have reasonable timezone offsets (-12 to 14)', () => {
    for (const city of CITIES) {
      expect(city.timezone).toBeGreaterThanOrEqual(-12);
      expect(city.timezone).toBeLessThanOrEqual(14);
    }
  });

  it('includes major world cities', () => {
    const cityNames = CITIES.map(c => c.name);
    expect(cityNames).toContain('London');
    expect(cityNames).toContain('New York');
    expect(cityNames).toContain('Tokyo');
    expect(cityNames).toContain('Sydney');
  });
});
