import { describe, it, expect } from 'vitest';
import { KTX2_TEXTURES, JPEG_TEXTURES } from './textureCompression';

describe('textureCompression', () => {
  describe('KTX2_TEXTURES', () => {
    it('should have paths for day, night, and clouds textures', () => {
      expect(KTX2_TEXTURES.day).toBeDefined();
      expect(KTX2_TEXTURES.night).toBeDefined();
      expect(KTX2_TEXTURES.clouds).toBeDefined();
    });

    it('should use .ktx2 file extension', () => {
      expect(KTX2_TEXTURES.day).toMatch(/\.ktx2$/);
      expect(KTX2_TEXTURES.night).toMatch(/\.ktx2$/);
      expect(KTX2_TEXTURES.clouds).toMatch(/\.ktx2$/);
    });

    it('should reference files in /textures/ directory', () => {
      expect(KTX2_TEXTURES.day).toMatch(/^\/textures\//);
      expect(KTX2_TEXTURES.night).toMatch(/^\/textures\//);
      expect(KTX2_TEXTURES.clouds).toMatch(/^\/textures\//);
    });
  });

  describe('JPEG_TEXTURES', () => {
    it('should have paths for day, night, and clouds textures', () => {
      expect(JPEG_TEXTURES.day).toBeDefined();
      expect(JPEG_TEXTURES.night).toBeDefined();
      expect(JPEG_TEXTURES.clouds).toBeDefined();
    });

    it('should use .jpg file extension', () => {
      expect(JPEG_TEXTURES.day).toMatch(/\.jpg$/);
      expect(JPEG_TEXTURES.night).toMatch(/\.jpg$/);
      expect(JPEG_TEXTURES.clouds).toMatch(/\.jpg$/);
    });

    it('should reference files in /textures/ directory', () => {
      expect(JPEG_TEXTURES.day).toMatch(/^\/textures\//);
      expect(JPEG_TEXTURES.night).toMatch(/^\/textures\//);
      expect(JPEG_TEXTURES.clouds).toMatch(/^\/textures\//);
    });
  });

  describe('texture path consistency', () => {
    it('should have matching texture names between KTX2 and JPEG', () => {
      // Verify both have the same keys
      const ktx2Keys = Object.keys(KTX2_TEXTURES).sort();
      const jpegKeys = Object.keys(JPEG_TEXTURES).sort();
      expect(ktx2Keys).toEqual(jpegKeys);
    });

    it('KTX2 and JPEG should reference same base filenames', () => {
      expect(KTX2_TEXTURES.day.replace('.ktx2', '')).toEqual(
        JPEG_TEXTURES.day.replace('.jpg', '')
      );
      expect(KTX2_TEXTURES.night.replace('.ktx2', '')).toEqual(
        JPEG_TEXTURES.night.replace('.jpg', '')
      );
      expect(KTX2_TEXTURES.clouds.replace('.ktx2', '')).toEqual(
        JPEG_TEXTURES.clouds.replace('.jpg', '')
      );
    });
  });
});
