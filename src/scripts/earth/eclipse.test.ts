import { describe, expect, it } from 'vitest';
import { ECLIPSES, findEclipseForDate, getNextEclipse } from './eclipse';

describe('ECLIPSES database', () => {
  it('should contain at least 5 future eclipses from 2024', () => {
    expect(ECLIPSES.length).toBeGreaterThanOrEqual(5);
  });

  it('should have all required fields for each eclipse', () => {
    for (const eclipse of ECLIPSES) {
      expect(eclipse.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['total', 'annular', 'partial']).toContain(eclipse.type);
      expect(eclipse.description).toBeTruthy();
      expect(eclipse.maxLat).toBeGreaterThanOrEqual(-90);
      expect(eclipse.maxLat).toBeLessThanOrEqual(90);
      expect(eclipse.maxLon).toBeGreaterThanOrEqual(-180);
      expect(eclipse.maxLon).toBeLessThanOrEqual(180);
    }
  });

  it('should be sorted by date', () => {
    for (let i = 1; i < ECLIPSES.length; i++) {
      expect(ECLIPSES[i].date >= ECLIPSES[i - 1].date).toBe(true);
    }
  });

  it('should include eclipses from 2024 to 2030', () => {
    const years = ECLIPSES.map((e) => parseInt(e.date.split('-')[0], 10));
    expect(Math.min(...years)).toBe(2024);
    expect(Math.max(...years)).toBe(2030);
  });

  it('should include all three eclipse types', () => {
    const types = new Set(ECLIPSES.map((e) => e.type));
    expect(types.has('total')).toBe(true);
    expect(types.has('annular')).toBe(true);
    expect(types.has('partial')).toBe(true);
  });
});

describe('findEclipseForDate', () => {
  it('should find a known eclipse date', () => {
    const result = findEclipseForDate('2024-04-08');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('total');
  });

  it('should return null for a non-eclipse date', () => {
    expect(findEclipseForDate('2024-06-15')).toBeNull();
  });

  it('should return null for an empty string', () => {
    expect(findEclipseForDate('')).toBeNull();
  });

  it('should find the 2026-08-12 total eclipse', () => {
    const result = findEclipseForDate('2026-08-12');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('total');
    expect(result!.description).toContain('Spain');
  });

  it('should find the 2026-02-17 annular eclipse', () => {
    const result = findEclipseForDate('2026-02-17');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('annular');
  });
});

describe('getNextEclipse', () => {
  it('should return the next eclipse after a given date', () => {
    const date = new Date(2026, 0, 1); // Jan 1, 2026
    const result = getNextEclipse(date);
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2026-02-17');
  });

  it('should return the eclipse on the same date', () => {
    const date = new Date(2026, 1, 17); // Feb 17, 2026
    const result = getNextEclipse(date);
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2026-02-17');
  });

  it('should return null when past all eclipses in database', () => {
    const date = new Date(2031, 0, 1);
    const result = getNextEclipse(date);
    expect(result).toBeNull();
  });

  it('should return first eclipse when date is before all', () => {
    const date = new Date(2023, 0, 1);
    const result = getNextEclipse(date);
    expect(result).not.toBeNull();
    expect(result!.date).toBe('2024-04-08');
  });
});
