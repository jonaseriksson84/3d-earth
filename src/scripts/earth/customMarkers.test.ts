import { beforeEach, describe, expect, it } from 'vitest';
import { estimateTimezone, loadCustomMarkers, saveCustomMarkers } from './customMarkers';

// Mock localStorage for Node.js test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('estimateTimezone', () => {
  it('returns 0 for longitude 0 (Greenwich)', () => {
    expect(estimateTimezone(0)).toBe(0);
  });

  it('returns positive offset for east longitudes', () => {
    expect(estimateTimezone(30)).toBe(2);
    expect(estimateTimezone(90)).toBe(6);
    expect(estimateTimezone(120)).toBe(8);
  });

  it('returns negative offset for west longitudes', () => {
    expect(estimateTimezone(-75)).toBe(-5);
    expect(estimateTimezone(-120)).toBe(-8);
  });

  it('rounds to nearest hour', () => {
    expect(estimateTimezone(7)).toBe(0); // 7/15 = 0.47, rounds to 0
    expect(estimateTimezone(8)).toBe(1); // 8/15 = 0.53, rounds to 1
    expect(estimateTimezone(-7)).toBe(0);
    expect(estimateTimezone(-8)).toBe(-1);
  });

  it('handles extreme longitudes', () => {
    expect(estimateTimezone(180)).toBe(12);
    expect(estimateTimezone(-180)).toBe(-12);
  });
});

describe('loadCustomMarkers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no data stored', () => {
    expect(loadCustomMarkers()).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    localStorage.setItem('earth-custom-markers', 'not-json');
    expect(loadCustomMarkers()).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    localStorage.setItem('earth-custom-markers', '{"foo":"bar"}');
    expect(loadCustomMarkers()).toEqual([]);
  });

  it('filters out invalid marker objects', () => {
    const data = [
      { id: 'a', label: 'Test', lat: 10, lon: 20, timezone: 1 },
      { id: 'b', label: 'Missing timezone' }, // invalid
      'not-an-object', // invalid
      null, // invalid
    ];
    localStorage.setItem('earth-custom-markers', JSON.stringify(data));
    const result = loadCustomMarkers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('loads valid markers correctly', () => {
    const markers = [
      { id: 'x1', label: 'Home', lat: 59.33, lon: 18.07, timezone: 1 },
      { id: 'x2', label: 'Office', lat: 40.71, lon: -74.01, timezone: -5 },
    ];
    localStorage.setItem('earth-custom-markers', JSON.stringify(markers));
    const result = loadCustomMarkers();
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('Home');
    expect(result[1].lat).toBe(40.71);
  });
});

describe('saveCustomMarkers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves markers to localStorage', () => {
    const markers = [{ id: 'a1', label: 'Test Place', lat: 10, lon: 20, timezone: 1 }];
    saveCustomMarkers(markers);
    const stored = localStorage.getItem('earth-custom-markers');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].label).toBe('Test Place');
  });

  it('overwrites previous data', () => {
    saveCustomMarkers([{ id: 'a', label: 'First', lat: 0, lon: 0, timezone: 0 }]);
    saveCustomMarkers([{ id: 'b', label: 'Second', lat: 1, lon: 1, timezone: 0 }]);
    const stored = JSON.parse(localStorage.getItem('earth-custom-markers')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].label).toBe('Second');
  });

  it('saves empty array', () => {
    saveCustomMarkers([]);
    const stored = JSON.parse(localStorage.getItem('earth-custom-markers')!);
    expect(stored).toEqual([]);
  });
});
