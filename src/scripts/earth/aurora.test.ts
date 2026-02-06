import { describe, expect, it } from 'vitest';
import { createAuroraBandGeometry } from './aurora';
import { CONFIG } from './config';

describe('Aurora config', () => {
  it('AURORA_LATITUDE is in geomagnetic range (60-75 degrees)', () => {
    expect(CONFIG.AURORA_LATITUDE).toBeGreaterThanOrEqual(60);
    expect(CONFIG.AURORA_LATITUDE).toBeLessThanOrEqual(75);
  });

  it('AURORA_BAND_WIDTH is positive and reasonable', () => {
    expect(CONFIG.AURORA_BAND_WIDTH).toBeGreaterThan(0);
    expect(CONFIG.AURORA_BAND_WIDTH).toBeLessThan(30);
  });

  it('AURORA_OPACITY is in valid range (0-1)', () => {
    expect(CONFIG.AURORA_OPACITY).toBeGreaterThan(0);
    expect(CONFIG.AURORA_OPACITY).toBeLessThanOrEqual(1);
  });

  it('AURORA_ANIMATION_SPEED is positive', () => {
    expect(CONFIG.AURORA_ANIMATION_SPEED).toBeGreaterThan(0);
  });
});

describe('createAuroraBandGeometry', () => {
  it('creates geometry with correct attribute count', () => {
    const geometry = createAuroraBandGeometry(5, 67, 8, 16, 4);
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const uvs = geometry.getAttribute('uv');

    // (segments + 1) * (rings + 1) = 17 * 5 = 85 vertices
    expect(positions.count).toBe(85);
    expect(normals.count).toBe(85);
    expect(uvs.count).toBe(85);
  });

  it('creates geometry with valid index buffer', () => {
    const geometry = createAuroraBandGeometry(5, 67, 8, 16, 4);
    const index = geometry.getIndex();
    expect(index).not.toBeNull();
    // segments * rings * 2 triangles * 3 indices = 16 * 4 * 6 = 384
    expect(index!.count).toBe(384);
  });

  it('positions vertices at correct radius', () => {
    const radius = 5.08;
    const geometry = createAuroraBandGeometry(radius, 67, 8, 8, 2);
    const positions = geometry.getAttribute('position');

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const dist = Math.sqrt(x * x + y * y + z * z);
      expect(dist).toBeCloseTo(radius, 1);
    }
  });

  it('places vertices at correct latitude band for northern aurora', () => {
    const geometry = createAuroraBandGeometry(5, 67, 8, 8, 2);
    const positions = geometry.getAttribute('position');

    // All Y values should be positive (northern hemisphere)
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      expect(y).toBeGreaterThan(0);
    }
  });

  it('places vertices at correct latitude band for southern aurora', () => {
    const geometry = createAuroraBandGeometry(5, -67, 8, 8, 2);
    const positions = geometry.getAttribute('position');

    // All Y values should be negative (southern hemisphere)
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      expect(y).toBeLessThan(0);
    }
  });

  it('UV coordinates are in [0,1] range', () => {
    const geometry = createAuroraBandGeometry(5, 67, 8, 16, 4);
    const uvs = geometry.getAttribute('uv');

    for (let i = 0; i < uvs.count; i++) {
      expect(uvs.getX(i)).toBeGreaterThanOrEqual(0);
      expect(uvs.getX(i)).toBeLessThanOrEqual(1);
      expect(uvs.getY(i)).toBeGreaterThanOrEqual(0);
      expect(uvs.getY(i)).toBeLessThanOrEqual(1);
    }
  });

  it('normals are approximately unit length', () => {
    const geometry = createAuroraBandGeometry(5, 67, 8, 8, 2);
    const normals = geometry.getAttribute('normal');

    for (let i = 0; i < normals.count; i++) {
      const nx = normals.getX(i);
      const ny = normals.getY(i);
      const nz = normals.getZ(i);
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      expect(len).toBeCloseTo(1, 2);
    }
  });
});
