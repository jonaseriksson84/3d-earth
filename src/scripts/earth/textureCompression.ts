/**
 * KTX2/Basis Universal texture compression support with JPEG fallback.
 *
 * Detects GPU compressed texture format support, loads KTX2 textures
 * when available, and falls back to JPEG for unsupported browsers.
 *
 * @module textureCompression
 */

import * as THREE from 'three';
// @ts-ignore - Three.js 0.128 examples don't have type declarations
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import type { AppRenderer } from './webgpu';

/** Path to the Basis Universal transcoder WASM/JS files */
const TRANSCODER_PATH = '/basis/';

/** Texture paths for KTX2 compressed versions */
export const KTX2_TEXTURES = {
  day: '/textures/earth_day.ktx2',
  night: '/textures/earth_night.ktx2',
  clouds: '/textures/earth_clouds.ktx2',
} as const;

/** Texture paths for original JPEG fallback versions */
export const JPEG_TEXTURES = {
  day: '/textures/earth_day.jpg',
  night: '/textures/earth_night.jpg',
  clouds: '/textures/earth_clouds.jpg',
} as const;

/**
 * Whether the browser supports any GPU compressed texture format
 * that Basis Universal can transcode to.
 *
 * @param renderer - AppRenderer (uses the native WebGL renderer for extension checks)
 * @returns true if at least one compressed texture format is supported
 */
export function supportsCompressedTextures(renderer: AppRenderer): boolean {
  const ext = renderer.nativeRenderer.extensions;
  return (
    ext.has('WEBGL_compressed_texture_s3tc') ||
    ext.has('WEBGL_compressed_texture_etc1') ||
    ext.has('WEBGL_compressed_texture_etc') ||
    ext.has('WEBGL_compressed_texture_astc') ||
    ext.has('EXT_texture_compression_bptc') ||
    ext.has('WEBGL_compressed_texture_pvrtc') ||
    ext.has('WEBKIT_WEBGL_compressed_texture_pvrtc')
  );
}

/**
 * Creates a configured KTX2Loader with Basis transcoder path and GPU format detection.
 *
 * @param renderer - AppRenderer for GPU format detection (uses native WebGL renderer)
 * @param manager - Loading manager for progress tracking
 * @returns Configured KTX2Loader ready to load .ktx2 files
 */
export function createKTX2Loader(
  renderer: AppRenderer,
  manager: THREE.LoadingManager
): InstanceType<typeof KTX2Loader> {
  const loader = new KTX2Loader(manager);
  loader.setTranscoderPath(TRANSCODER_PATH);
  loader.detectSupport(renderer.nativeRenderer);
  return loader;
}

/** Result of loading all Earth textures */
export interface TextureLoadResult {
  dayTexture: THREE.Texture;
  nightTexture: THREE.Texture;
  cloudTexture: THREE.Texture;
  compressed: boolean;
}

/**
 * Loads Earth textures using KTX2 compressed format with automatic JPEG fallback.
 *
 * Attempts to load KTX2 textures first. If the browser doesn't support GPU
 * compressed textures or KTX2 loading fails, falls back to JPEG textures.
 *
 * @param renderer - AppRenderer for format detection
 * @param manager - Loading manager for progress tracking
 * @returns Object containing loaded textures and whether compression was used
 */
export function loadTexturesWithCompression(
  renderer: AppRenderer,
  manager: THREE.LoadingManager
): TextureLoadResult {
  const hasCompression = supportsCompressedTextures(renderer);

  if (hasCompression) {
    try {
      const ktx2Loader = createKTX2Loader(renderer, manager);

      console.log('Loading KTX2 compressed textures (Basis Universal)');

      const dayTexture = ktx2Loader.load(
        KTX2_TEXTURES.day,
        () => {},
        undefined,
        () => console.warn('KTX2 day texture failed, will use JPEG fallback')
      );
      const nightTexture = ktx2Loader.load(
        KTX2_TEXTURES.night,
        () => {},
        undefined,
        () => console.warn('KTX2 night texture failed, will use JPEG fallback')
      );
      const cloudTexture = ktx2Loader.load(
        KTX2_TEXTURES.clouds,
        () => {},
        undefined,
        () => console.warn('KTX2 cloud texture failed, will use JPEG fallback')
      );

      return { dayTexture, nightTexture, cloudTexture, compressed: true };
    } catch (error) {
      console.warn('KTX2 loader initialization failed, falling back to JPEG:', error);
    }
  } else {
    console.log('No GPU compressed texture support detected, using JPEG textures');
  }

  // Fallback to JPEG textures
  return loadJPEGTextures(manager);
}

/**
 * Loads Earth textures as standard JPEG files.
 *
 * @param manager - Loading manager for progress tracking
 * @returns Object containing loaded JPEG textures
 */
export function loadJPEGTextures(manager: THREE.LoadingManager): TextureLoadResult {
  const textureLoader = new THREE.TextureLoader(manager);

  console.log('Loading JPEG textures');

  const dayTexture = textureLoader.load(
    JPEG_TEXTURES.day,
    undefined,
    undefined,
    () => console.warn('Day texture failed')
  );
  const nightTexture = textureLoader.load(
    JPEG_TEXTURES.night,
    undefined,
    undefined,
    () => console.warn('Night lights texture failed')
  );
  const cloudTexture = textureLoader.load(
    JPEG_TEXTURES.clouds,
    undefined,
    undefined,
    () => console.warn('Cloud texture failed')
  );

  return { dayTexture, nightTexture, cloudTexture, compressed: false };
}
