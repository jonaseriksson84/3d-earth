import { describe, expect, it } from 'vitest';
import { STARS_CONFIG } from './stars';

describe('STARS_CONFIG', () => {
  it('has positive star count', () => {
    expect(STARS_CONFIG.count).toBeGreaterThan(0);
  });

  it('has at least 5000 stars for dense field', () => {
    expect(STARS_CONFIG.count).toBeGreaterThanOrEqual(5000);
  });

  it('has positive radius', () => {
    expect(STARS_CONFIG.radius).toBeGreaterThan(0);
  });

  it('radius is large enough to surround Earth scene', () => {
    expect(STARS_CONFIG.radius).toBeGreaterThanOrEqual(100);
  });

  it('has positive base size', () => {
    expect(STARS_CONFIG.size).toBeGreaterThan(0);
  });

  it('has valid size multiplier range', () => {
    expect(STARS_CONFIG.minSizeMultiplier).toBeGreaterThan(0);
    expect(STARS_CONFIG.maxSizeMultiplier).toBeGreaterThan(STARS_CONFIG.minSizeMultiplier);
  });

  it('minSizeMultiplier produces visible stars', () => {
    const minSize = STARS_CONFIG.size * STARS_CONFIG.minSizeMultiplier;
    expect(minSize).toBeGreaterThan(0);
  });

  it('maxSizeMultiplier does not produce excessively large stars', () => {
    const maxSize = STARS_CONFIG.size * STARS_CONFIG.maxSizeMultiplier;
    expect(maxSize).toBeLessThan(10);
  });

  it('has sizeAttenuation enabled for depth perception', () => {
    expect(STARS_CONFIG.sizeAttenuation).toBe(true);
  });
});
