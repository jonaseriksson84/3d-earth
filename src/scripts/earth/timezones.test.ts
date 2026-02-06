import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { getTimezoneInfos } from './timezones';

describe('Timezone boundaries', () => {
  describe('CONFIG timezone constants', () => {
    it('has valid TIMEZONE_LINE_COLOR', () => {
      expect(CONFIG.TIMEZONE_LINE_COLOR).toBeGreaterThan(0);
    });

    it('has TIMEZONE_LINE_OPACITY in valid range', () => {
      expect(CONFIG.TIMEZONE_LINE_OPACITY).toBeGreaterThan(0);
      expect(CONFIG.TIMEZONE_LINE_OPACITY).toBeLessThanOrEqual(1);
    });

    it('has valid TIMEZONE_UTC_COLOR', () => {
      expect(CONFIG.TIMEZONE_UTC_COLOR).toBeGreaterThan(0);
    });

    it('has TIMEZONE_SEGMENTS greater than 0', () => {
      expect(CONFIG.TIMEZONE_SEGMENTS).toBeGreaterThan(0);
    });

    it('UTC color differs from regular line color', () => {
      expect(CONFIG.TIMEZONE_UTC_COLOR).not.toBe(CONFIG.TIMEZONE_LINE_COLOR);
    });
  });

  describe('getTimezoneInfos', () => {
    const infos = getTimezoneInfos();

    it('returns 25 timezone entries (-12 to +12)', () => {
      expect(infos).toHaveLength(25);
    });

    it('first entry is UTC-12 at longitude -180', () => {
      expect(infos[0].offset).toBe(-12);
      expect(infos[0].longitude).toBe(-180);
      expect(infos[0].label).toBe('UTC-12');
    });

    it('middle entry is UTC at longitude 0', () => {
      const utc = infos.find((i) => i.offset === 0);
      expect(utc).toBeDefined();
      expect(utc!.longitude).toBe(0);
      expect(utc!.label).toBe('UTC');
    });

    it('last entry is UTC+12 at longitude 180', () => {
      const last = infos[infos.length - 1];
      expect(last.offset).toBe(12);
      expect(last.longitude).toBe(180);
      expect(last.label).toBe('UTC+12');
    });

    it('all longitudes are multiples of 15', () => {
      for (const info of infos) {
        expect(Math.abs(info.longitude % 15)).toBe(0);
      }
    });

    it('positive offsets have + prefix in label', () => {
      const positive = infos.filter((i) => i.offset > 0);
      for (const info of positive) {
        expect(info.label).toMatch(/^UTC\+\d+$/);
      }
    });

    it('negative offsets have - prefix in label', () => {
      const negative = infos.filter((i) => i.offset < 0);
      for (const info of negative) {
        expect(info.label).toMatch(/^UTC-\d+$/);
      }
    });

    it('offsets are sequential from -12 to +12', () => {
      for (let i = 0; i < infos.length; i++) {
        expect(infos[i].offset).toBe(i - 12);
      }
    });
  });
});
